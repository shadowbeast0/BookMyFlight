package com.bookmyflight.service;

import com.bookmyflight.dto.DealRequest;
import com.bookmyflight.dto.DealResponse;
import com.bookmyflight.entity.FlightDeal;
import com.bookmyflight.repository.FlightDealRepository;
import com.bookmyflight.strategy.DiscountStrategy;
import com.bookmyflight.strategy.DiscountStrategyContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FlightDealService - Business logic for flight deals.
 * Uses the Repository Pattern (via FlightDealRepository) and
 * Strategy Pattern (via DiscountStrategyContext) for dynamic pricing.
 */
@Service
public class FlightDealService {

    private final FlightDealRepository dealRepository;
    private final DiscountStrategyContext strategyContext;

    @Autowired
    public FlightDealService(FlightDealRepository dealRepository,
                              DiscountStrategyContext strategyContext) {
        this.dealRepository = dealRepository;
        this.strategyContext = strategyContext;
    }

    /**
     * Get all active, non-expired deals for the home page.
     * Strategy Pattern is applied here to calculate final pricing.
     */
    public List<DealResponse> getActiveDeals() {
        List<FlightDeal> deals = dealRepository.findByIsActiveTrueAndExpiresAtAfter(LocalDateTime.now());
        DiscountStrategy strategy = strategyContext.getDefaultStrategy();

        return deals.stream()
                .map(deal -> toResponse(deal, strategy))
                .collect(Collectors.toList());
    }

    /** Get all deals (including inactive/expired) for admin view. */
    public List<DealResponse> getAllDeals() {
        return dealRepository.findAll().stream()
                .map(deal -> toResponse(deal, null))
                .collect(Collectors.toList());
    }

    /** Get a single deal by ID. */
    public DealResponse getDealById(String id) {
        FlightDeal deal = dealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deal not found: " + id));
        DiscountStrategy strategy = strategyContext.getDefaultStrategy();
        return toResponse(deal, strategy);
    }

    @Autowired
    private com.bookmyflight.repository.BookingRepository bookingRepository;

    /** Create a new deal - Builder Pattern used here. */
    private void validate(DealRequest request) {
        if (request.getDepartureCity() != null && request.getDepartureCity().trim().equalsIgnoreCase(request.getArrivalCity() == null ? "" : request.getArrivalCity().trim())) {
            throw new RuntimeException("Departure and arrival must be different cities");
        }
        double discount = request.getDiscount() != null ? request.getDiscount() : 0.0;
        if (discount < 0 || discount > 90) {
            throw new RuntimeException("Discount must be between 0 and 90%");
        }
        if (request.getDurationMinutes() != null && (request.getDurationMinutes() < 20 || request.getDurationMinutes() > 1200)) {
            throw new RuntimeException("Flight time must be between 20 minutes and 20 hours");
        }
        if (request.getDepartureDate() != null && request.getExpiresAt() != null && request.getExpiresAt().isBefore(request.getDepartureDate())) {
            throw new RuntimeException("Sale end must be on or after the first departure");
        }
    }

    @Transactional
    public DealResponse createDeal(DealRequest request) {
        validate(request);
        FlightDeal deal = FlightDeal.builder()
                .departureCity(request.getDepartureCity())
                .arrivalCity(request.getArrivalCity())
                .cost(request.getCost())
                .discount(request.getDiscount() != null ? request.getDiscount() : 0.0)
                .durationMinutes(request.getDurationMinutes())
                .departureDate(request.getDepartureDate())
                .expiresAt(request.getExpiresAt())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        deal = dealRepository.save(deal);
        return toResponse(deal, null);
    }

    /** Update an existing deal. */
    @Transactional
    public DealResponse updateDeal(String id, DealRequest request) {
        validate(request);
        FlightDeal deal = dealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deal not found: " + id));

        deal.setDepartureCity(request.getDepartureCity());
        deal.setArrivalCity(request.getArrivalCity());
        deal.setCost(request.getCost());
        deal.setDiscount(request.getDiscount() != null ? request.getDiscount() : 0.0);
        deal.setDurationMinutes(request.getDurationMinutes());
        deal.setDepartureDate(request.getDepartureDate());
        deal.setExpiresAt(request.getExpiresAt());
        deal.setIsActive(request.getIsActive() != null ? request.getIsActive() : deal.getIsActive());

        deal = dealRepository.save(deal);
        return toResponse(deal, null);
    }

    /** Delete a deal. */
    @Transactional
    public void deleteDeal(String id) {
        if (!dealRepository.existsById(id)) {
            throw new RuntimeException("Deal not found: " + id);
        }
        long live = bookingRepository.findByDealIdAndStatus(id, "confirmed").size();
        if (live > 0) {
            throw new RuntimeException("This flight has " + live + " active booking" + (live > 1 ? "s" : "") + ". Turn it off instead of deleting it.");
        }
        dealRepository.deleteById(id);
    }

    /** Scheduled task: deactivate all expired deals. */
    @Transactional
    public int deactivateExpiredDeals() {
        return dealRepository.deactivateExpiredDeals(LocalDateTime.now());
    }

    /** Map entity to response DTO, optionally applying a discount strategy. */
    private DealResponse toResponse(FlightDeal deal, DiscountStrategy strategy) {
        double finalCost = (strategy != null) ? strategy.calculatePrice(deal) : deal.getCost();

        return new DealResponse(
                deal.getId(),
                deal.getDepartureCity(),
                deal.getArrivalCity(),
                finalCost,
                deal.getDiscount(),
                deal.getDurationMinutes(),
                deal.getDepartureDate(),
                deal.getExpiresAt(),
                deal.getIsActive()
        );
    }

    /** Search deals by from/to cities. */
    public List<DealResponse> searchDeals(String from, String to, java.time.LocalDate date) {
        DiscountStrategy strategy = strategyContext.getDefaultStrategy();
        LocalDateTime now = LocalDateTime.now();
        List<FlightDeal> deals = dealRepository
                .findByIsActiveTrueAndExpiresAtAfterAndDepartureCityIgnoreCaseAndArrivalCityIgnoreCase(
                        now, from, to);
        return deals.stream()
                .filter(deal -> date == null || FlightSchedule.runsOn(deal, date, now))
                .map(deal -> {
                    DealResponse r = toResponse(deal, strategy);
                    if (date != null) {
                        r.setDepartureDate(FlightSchedule.departureOn(deal, date).toString());
                    }
                    return r;
                })
                .collect(Collectors.toList());
    }

    /**
     * Find connecting flights (1-stop) when no direct route exists.
     * Returns a list of pairs: each pair is [leg1, leg2].
     */
    public List<List<DealResponse>> findConnectingFlights(String from, String to, java.time.LocalDate date) {
        DiscountStrategy strategy = strategyContext.getDefaultStrategy();
        LocalDateTime now = LocalDateTime.now();

        // Get all routes departing from 'from'
        List<FlightDeal> fromRoutes = dealRepository
                .findByIsActiveTrueAndExpiresAtAfterAndDepartureCityIgnoreCase(now, from);

        List<List<DealResponse>> connections = new ArrayList<>();

        for (FlightDeal leg1 : fromRoutes) {
            String intermediate = leg1.getArrivalCity();
            if (intermediate.equalsIgnoreCase(to)) continue; // Skip direct routes

            // Find routes from intermediate to destination
            List<FlightDeal> leg2Routes = dealRepository
                    .findByIsActiveTrueAndExpiresAtAfterAndDepartureCityIgnoreCaseAndArrivalCityIgnoreCase(
                            now, intermediate, to);

            java.time.LocalDate leg1Date = date != null ? date : leg1.getDepartureDate().toLocalDate();
            if (!FlightSchedule.runsOn(leg1, leg1Date, now)) {
                continue;
            }
            for (FlightDeal leg2 : leg2Routes) {
                LocalDateTime dep2 = FlightSchedule.connectingDeparture(leg1, leg1Date, leg2, now);
                if (dep2 == null) {
                    continue;
                }
                DealResponse first = toResponse(leg1, strategy);
                first.setDepartureDate(FlightSchedule.departureOn(leg1, leg1Date).toString());
                DealResponse second = toResponse(leg2, strategy);
                second.setDepartureDate(dep2.toString());
                List<DealResponse> pair = new ArrayList<>();
                pair.add(first);
                pair.add(second);
                connections.add(pair);
            }
        }

        return connections;
    }

    /** Get all unique city names from active deals. */
    public List<String> getAllCities() {
        List<FlightDeal> deals = dealRepository.findByIsActiveTrueAndExpiresAtAfter(LocalDateTime.now());
        Map<String, Boolean> cities = new HashMap<>();
        for (FlightDeal deal : deals) {
            cities.put(deal.getDepartureCity(), true);
            cities.put(deal.getArrivalCity(), true);
        }
        return new ArrayList<>(cities.keySet());
    }

    /**
     * Connection is valid only when leg2 departs after leg1 arrives and layover is <= 6 hours.
     */
    private boolean isValidConnection(FlightDeal leg1, FlightDeal leg2) {
        if (leg1.getDepartureDate() == null || leg2.getDepartureDate() == null || leg1.getDurationMinutes() == null) {
            return false;
        }

        LocalDateTime leg1Arrival = leg1.getDepartureDate().plusMinutes(leg1.getDurationMinutes());
        if (leg2.getDepartureDate().isBefore(leg1Arrival)) {
            return false;
        }

        long layoverMinutes = ChronoUnit.MINUTES.between(leg1Arrival, leg2.getDepartureDate());
        return layoverMinutes <= 360;
    }
}
