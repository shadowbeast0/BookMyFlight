package com.bookmyflight.service;

import com.bookmyflight.dto.*;
import com.bookmyflight.entity.Booking;
import com.bookmyflight.entity.FlightDeal;
import com.bookmyflight.entity.Wallet;
import com.bookmyflight.repository.BookingRepository;
import com.bookmyflight.repository.FlightDealRepository;
import com.bookmyflight.strategy.DiscountStrategy;
import com.bookmyflight.strategy.DiscountStrategyContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * BookingFacadeService - Facade Pattern.
 *
 * The Facade Pattern provides a unified, simplified interface to a complex
 * subsystem. This service coordinates multiple underlying services
 * (deal validation, OTP generation/verification, JWT issuance, booking creation)
 * without exposing the internal complexity to the controllers.
 *
 * WHY: The booking process involves multiple steps: checking deal availability,
 * authenticating the user via OTP, generating JWT tokens, and creating the booking.
 * Without a Facade, the controller would need to orchestrate all these services
 * directly, leading to tight coupling and complex controller logic.
 *
 * WHERE: Used by AuthController and BookingController to simplify multi-step
 * operations into single method calls.
 */
@Service
public class BookingFacadeService {

    private final FlightDealRepository dealRepository;
    private final BookingRepository bookingRepository;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final WalletService walletService;
    private final DiscountStrategyContext discountStrategyContext;

    @Autowired
    public BookingFacadeService(FlightDealRepository dealRepository,
                                 BookingRepository bookingRepository,
                                 OtpService otpService,
                                 JwtService jwtService,
                                 WalletService walletService,
                                 DiscountStrategyContext discountStrategyContext) {
        this.dealRepository = dealRepository;
        this.bookingRepository = bookingRepository;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.walletService = walletService;
        this.discountStrategyContext = discountStrategyContext;
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.bookmyflight.config.AdminProperties adminProperties;

    @org.springframework.beans.factory.annotation.Autowired
    private SeatHoldService seatHoldService;

    public boolean isOtpDemoMode() {
        return otpService.isDemoMode();
    }

    // ====== Authentication Facade ======

    /**
     * Send OTP to the given phone number.
     * Coordinates OTP generation (in production, would also trigger SMS).
     */
    public String sendOtp(String phoneNumber) {
        return otpService.generateOtp(phoneNumber);
    }

    /**
     * Verify OTP and issue JWT token.
     * Coordinates OTP verification + JWT issuance in a single call.
     */
    public AuthTokenResponse verifyOtpAndIssueToken(String phoneNumber, String otp) {
        boolean verified = otpService.verifyOtp(phoneNumber, otp);
        if (!verified) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        String token = jwtService.generateToken(phoneNumber, adminProperties.isAdmin(phoneNumber));
        LocalDateTime expiry = jwtService.getTokenExpiration();

        return new AuthTokenResponse(token, expiry.toString());
    }

    // ====== Booking Facade ======

    /**
     * Create a booking - coordinates deal availability check + booking persistence.
     * Uses Builder Pattern for constructing the Booking entity.
     */
    @Transactional
    public BookingResponse createBooking(String dealId, String phoneNumber, String passengerName, java.time.LocalDateTime selectedDepartureTime, List<String> selectedSeats, Integer requestedPassengerCount) {
        // 1. Lock and validate deal to avoid seat booking race conditions.
        FlightDeal deal = dealRepository.findByIdForUpdate(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found: " + dealId));

        if (!deal.getIsActive()) {
            throw new RuntimeException("This deal is no longer active");
        }

        if (deal.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("This deal has expired");
        }

        if (selectedDepartureTime != null && !FlightSchedule.isScheduledSlot(deal, selectedDepartureTime, LocalDateTime.now())) {
            throw new RuntimeException(deal.getDepartureCity() + " to " + deal.getArrivalCity() + " does not fly at that time. Pick one of the scheduled dates.");
        }

        // 2. Validate and lock seats for this deal/departure slot.
        List<String> normalizedSeats = normalizeSeats(selectedSeats);
        if (!normalizedSeats.isEmpty()) {
            LocalDateTime departureSlot = selectedDepartureTime != null ? selectedDepartureTime : deal.getDepartureDate();
            Set<String> alreadyBookedSeats = new java.util.HashSet<>(getBookedSeatsForSlot(dealId, departureSlot, deal.getDepartureDate()));
            alreadyBookedSeats.addAll(seatHoldService.heldByOthers(dealId, departureSlot, phoneNumber));

            List<String> conflicts = normalizedSeats.stream()
                    .filter(alreadyBookedSeats::contains)
                    .collect(Collectors.toList());

            if (!conflicts.isEmpty()) {
                throw new RuntimeException("Selected seat(s) already booked: " + String.join(", ", conflicts));
            }
        }

        int passengerCount = resolvePassengerCount(requestedPassengerCount, passengerName, normalizedSeats);
        long exitSeats = normalizedSeats.stream().filter(CabinLayout::isExitRow).count();
        if (exitSeats > adultsIn(passengerName, passengerCount)) {
            throw new RuntimeException("Exit-row seats can only go to adults");
        }
        double unitCost = calculateCurrentUnitCost(deal);
        double totalCost;
        try {
            totalCost = normalizedSeats.isEmpty()
                    ? roundCurrency(unitCost * passengerCount)
                    : roundCurrency(normalizedSeats.stream().mapToDouble(seat -> CabinLayout.priceFor(unitCost, seat)).sum());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException(e.getMessage());
        }

        // 3. Debit wallet before finalizing booking.
        Wallet wallet = walletService.debit(phoneNumber, totalCost);

        // 4. Create booking using Builder Pattern
        Booking booking = Booking.builder()
                .dealId(dealId)
                .phoneNumber(phoneNumber)
                .passengerName(passengerName)
                .selectedDepartureTime(selectedDepartureTime)
                .selectedSeats(normalizedSeats.isEmpty() ? null : String.join(",", normalizedSeats))
            .paidAmount(totalCost)
                .status("confirmed")
                .build();

        booking = bookingRepository.save(booking);
        seatHoldService.release(dealId, selectedDepartureTime != null ? selectedDepartureTime : deal.getDepartureDate(), phoneNumber);
        BookingResponse response = toBookingResponse(booking);
        response.setWalletBalance(wallet.getBalance());
        return response;
    }

    @Transactional
    public List<BookingResponse> createItinerary(com.bookmyflight.dto.ItineraryRequest request, String phoneNumber) {
        List<com.bookmyflight.dto.ItineraryRequest.Leg> legs = request.getLegs();
        if (legs.size() == 2) {
            FlightDeal first = dealRepository.findById(legs.get(0).getDealId())
                    .orElseThrow(() -> new RuntimeException("Deal not found: " + legs.get(0).getDealId()));
            FlightDeal second = dealRepository.findById(legs.get(1).getDealId())
                    .orElseThrow(() -> new RuntimeException("Deal not found: " + legs.get(1).getDealId()));
            LocalDateTime dep1 = legs.get(0).getSelectedDepartureTime();
            LocalDateTime dep2 = legs.get(1).getSelectedDepartureTime();
            if (dep1 == null || dep2 == null || first.getDurationMinutes() == null
                    || !first.getArrivalCity().equalsIgnoreCase(second.getDepartureCity())
                    || ChronoUnit.MINUTES.between(dep1.plusMinutes(first.getDurationMinutes()), dep2) < FlightSchedule.MIN_CONNECTION_MINUTES) {
                throw new RuntimeException("These two flights do not connect");
            }
        }
        List<BookingResponse> out = new ArrayList<>();
        for (com.bookmyflight.dto.ItineraryRequest.Leg leg : legs) {
            if (leg.getSelectedDepartureTime() == null) {
                throw new RuntimeException("Choose a travel date");
            }
            out.add(createBooking(leg.getDealId(), phoneNumber, request.getPassengerName(), leg.getSelectedDepartureTime(), leg.getSelectedSeats(), request.getPassengerCount()));
        }
        return out;
    }

    public java.util.Map<String, Object> seatMap(String dealId, LocalDateTime slot, String owner) {
        FlightDeal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found: " + dealId));
        LocalDateTime target = slot != null ? slot : deal.getDepartureDate();
        SeatHoldService.Snapshot snap = seatHoldService.snapshot(dealId, target, owner);
        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("booked", getBookedSeatsForSlot(dealId, target, deal.getDepartureDate()).stream().sorted().collect(Collectors.toList()));
        out.put("held", snap.held());
        out.put("mine", snap.mine());
        out.put("holdExpiresAt", snap.expiresAt() != null ? snap.expiresAt().toString() : null);
        return out;
    }

    public java.util.Map<String, Object> holdSeats(String dealId, LocalDateTime slot, String owner, List<String> seats) {
        FlightDeal deal = dealRepository.findById(dealId)
                .orElseThrow(() -> new RuntimeException("Deal not found: " + dealId));
        List<String> normalized = normalizeSeats(seats);
        if (!normalized.isEmpty()) {
            if (slot == null || !FlightSchedule.isScheduledSlot(deal, slot, LocalDateTime.now())) {
                throw new RuntimeException("Choose one of the scheduled dates for this flight");
            }
            for (String seat : normalized) {
                try {
                    CabinLayout.priceFor(1, seat);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException(e.getMessage());
                }
            }
        }
        LocalDateTime target = slot != null ? slot : deal.getDepartureDate();
        seatHoldService.replace(dealId, target, owner, normalized, getBookedSeatsForSlot(dealId, target, deal.getDepartureDate()));
        return seatMap(dealId, target, owner);
    }

    public java.util.Map<String, java.util.Map<String, Object>> summary() {
        java.util.Map<String, java.util.Map<String, Object>> out = new java.util.LinkedHashMap<>();
        for (Booking b : bookingRepository.findAll()) {
            java.util.Map<String, Object> row = out.computeIfAbsent(b.getDealId(), k -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("bookings", 0);
                m.put("seatsSold", 0);
                m.put("revenue", 0.0);
                m.put("cancelled", 0);
                return m;
            });
            if ("cancelled".equals(b.getStatus())) {
                row.put("cancelled", (Integer) row.get("cancelled") + 1);
            } else {
                row.put("bookings", (Integer) row.get("bookings") + 1);
                row.put("seatsSold", (Integer) row.get("seatsSold") + parseSeats(b.getSelectedSeats(), b.getPassengerName()).size());
                row.put("revenue", roundCurrency((Double) row.get("revenue") + (b.getPaidAmount() != null ? b.getPaidAmount() : 0.0)));
            }
        }
        return out;
    }

    private long adultsIn(String passengerName, int passengerCount) {
        if (passengerName != null) {
            Matcher m = Pattern.compile("A(\\d+)-C(\\d+)", Pattern.CASE_INSENSITIVE).matcher(passengerName);
            if (m.find()) {
                return Long.parseLong(m.group(1));
            }
        }
        return passengerCount;
    }

    /** Get a booking by ID. */
    public BookingResponse getBookingById(String id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + id));
        return toBookingResponse(booking);
    }

    /** Get all bookings for a phone number. */
    public List<BookingResponse> getBookingsByPhone(String phoneNumber) {
        return bookingRepository.findByPhoneNumber(phoneNumber).stream()
                .map(this::toBookingResponse)
                .collect(Collectors.toList());
    }

        /**
         * Get occupied seats for a deal and departure slot.
         */
        public List<String> getOccupiedSeats(String dealId, LocalDateTime selectedDepartureTime) {
        FlightDeal deal = dealRepository.findById(dealId)
            .orElseThrow(() -> new RuntimeException("Deal not found: " + dealId));

        LocalDateTime slot = selectedDepartureTime != null ? selectedDepartureTime : deal.getDepartureDate();
        return getBookedSeatsForSlot(dealId, slot, deal.getDepartureDate())
            .stream()
            .sorted()
            .collect(Collectors.toList());
        }

    /**
     * Cancel a booking with refund logic.
     * >10 days before departure: 100% refund
     * ≤10 days before departure: 50% refund
     */
    @Transactional
    public BookingResponse cancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        if ("cancelled".equals(booking.getStatus())) {
            throw new RuntimeException("Booking is already cancelled");
        }

        FlightDeal deal = dealRepository.findById(booking.getDealId())
                .orElseThrow(() -> new RuntimeException("Associated deal not found"));

        LocalDateTime flies = booking.getSelectedDepartureTime() != null ? booking.getSelectedDepartureTime() : deal.getDepartureDate();
        if (flies.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("This flight has already left");
        }
        long daysUntilDeparture = ChronoUnit.DAYS.between(LocalDateTime.now(), flies);
        double bookingTotalCost = getStoredOrComputedBookingTotal(deal, booking);
        double refundAmount;
        if (daysUntilDeparture > 10) {
            refundAmount = bookingTotalCost; // Full refund
        } else {
            refundAmount = roundCurrency(bookingTotalCost * 0.5); // 50% refund
        }

        booking.setStatus("cancelled");
        bookingRepository.save(booking);

        Wallet wallet = walletService.credit(booking.getPhoneNumber(), refundAmount);

        BookingResponse response = toBookingResponse(booking);
        response.setRefundAmount(refundAmount);
        response.setWalletBalance(wallet.getBalance());
        return response;
    }

    private BookingResponse toBookingResponse(Booking booking) {
        Optional<FlightDeal> dealOpt = dealRepository.findById(booking.getDealId());

        if (dealOpt.isPresent()) {
            FlightDeal deal = dealOpt.get();
            BookingResponse response = new BookingResponse(
                    booking.getId(),
                    booking.getDealId(),
                    booking.getPhoneNumber(),
                    booking.getPassengerName(),
                    booking.getCreatedAt() != null ? booking.getCreatedAt().toString() : null,
                    booking.getStatus(),
                    deal.getDepartureCity(),
                    deal.getArrivalCity(),
                    getStoredOrComputedBookingTotal(deal, booking),
                    deal.getDepartureDate() != null ? deal.getDepartureDate().toString() : null,
                    booking.getSelectedDepartureTime() != null ? booking.getSelectedDepartureTime().toString() : null,
                    deal.getDurationMinutes()
            );
                    response.setSelectedSeats(parseSeats(booking.getSelectedSeats(), booking.getPassengerName()));
            response.setWalletBalance(walletService.getOrCreateWalletEntity(booking.getPhoneNumber()).getBalance());
            return response;
        }

        BookingResponse response = new BookingResponse(
                booking.getId(),
                booking.getDealId(),
                booking.getPhoneNumber(),
                booking.getCreatedAt() != null ? booking.getCreatedAt().toString() : null,
                booking.getStatus()
        );
        response.setSelectedSeats(parseSeats(booking.getSelectedSeats(), booking.getPassengerName()));
        response.setWalletBalance(walletService.getOrCreateWalletEntity(booking.getPhoneNumber()).getBalance());
        return response;
    }

    private List<String> normalizeSeats(List<String> seats) {
        if (seats == null || seats.isEmpty()) {
            return Collections.emptyList();
        }

        LinkedHashSet<String> uniqueSeats = seats.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return new ArrayList<>(uniqueSeats);
    }

    private Set<String> getBookedSeatsForSlot(String dealId, LocalDateTime targetSlot, LocalDateTime fallbackDealDeparture) {
        if (targetSlot == null) {
            return Collections.emptySet();
        }

        return bookingRepository.findByDealIdAndStatus(dealId, "confirmed")
                .stream()
                .filter(booking -> {
                    LocalDateTime slot = booking.getSelectedDepartureTime() != null
                            ? booking.getSelectedDepartureTime()
                            : fallbackDealDeparture;
                    return slot != null && slot.truncatedTo(ChronoUnit.MINUTES)
                            .equals(targetSlot.truncatedTo(ChronoUnit.MINUTES));
                })
                .flatMap(booking -> parseSeats(booking.getSelectedSeats(), booking.getPassengerName()).stream())
                .map(String::toUpperCase)
                .collect(Collectors.toSet());
    }

    private List<String> parseSeats(String selectedSeats, String passengerName) {
        if (selectedSeats != null && !selectedSeats.isBlank()) {
            return List.of(selectedSeats.split(","))
                    .stream()
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .collect(Collectors.toList());
        }

        if (passengerName == null || passengerName.isBlank()) {
            return Collections.emptyList();
        }

        Pattern pattern = Pattern.compile("\\[([^\\]]+)]");
        Matcher matcher = pattern.matcher(passengerName);
        if (!matcher.find()) {
            return Collections.emptyList();
        }

        return List.of(matcher.group(1).split(","))
                .stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toList());
    }

    private int inferPassengerCount(String passengerName, List<String> normalizedSeats) {
        if (normalizedSeats != null && !normalizedSeats.isEmpty()) {
            return normalizedSeats.size();
        }

        if (passengerName != null && !passengerName.isBlank()) {
            Pattern countPattern = Pattern.compile("A(\\d+)-C(\\d+)", Pattern.CASE_INSENSITIVE);
            Matcher countMatcher = countPattern.matcher(passengerName);
            if (countMatcher.find()) {
                int adults = Integer.parseInt(countMatcher.group(1));
                int children = Integer.parseInt(countMatcher.group(2));
                int total = adults + children;
                if (total > 0) {
                    return total;
                }
            }
        }

        return 1;
    }

    private int resolvePassengerCount(Integer requestedPassengerCount, String passengerName, List<String> normalizedSeats) {
        if (requestedPassengerCount != null && requestedPassengerCount > 0) {
            if (normalizedSeats != null && !normalizedSeats.isEmpty() && normalizedSeats.size() != requestedPassengerCount) {
                throw new RuntimeException("Selected seats must match passenger count");
            }
            return requestedPassengerCount;
        }

        return inferPassengerCount(passengerName, normalizedSeats);
    }

    private double calculateCurrentUnitCost(FlightDeal deal) {
        DiscountStrategy strategy = discountStrategyContext.getDefaultStrategy();
        return roundCurrency(strategy.calculatePrice(deal));
    }

    private double calculateBookingTotal(FlightDeal deal, Booking booking) {
        List<String> seats = parseSeats(booking.getSelectedSeats(), booking.getPassengerName());
        int passengers = inferPassengerCount(booking.getPassengerName(), seats);
        return roundCurrency(calculateCurrentUnitCost(deal) * passengers);
    }

    private double getStoredOrComputedBookingTotal(FlightDeal deal, Booking booking) {
        if (booking.getPaidAmount() != null && booking.getPaidAmount() > 0) {
            return roundCurrency(booking.getPaidAmount());
        }
        return calculateBookingTotal(deal, booking);
    }

    private double roundCurrency(double amount) {
        return Math.round(amount * 100.0) / 100.0;
    }
}
