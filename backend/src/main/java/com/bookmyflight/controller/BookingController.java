package com.bookmyflight.controller;

import com.bookmyflight.dto.BookingRequest;
import com.bookmyflight.dto.BookingResponse;
import com.bookmyflight.security.CurrentUser;
import com.bookmyflight.service.BookingFacadeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Booking Controller - REST API for flight bookings.
 * Uses the Facade Pattern (BookingFacadeService) for coordinating booking operations.
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingFacadeService facadeService;

    @Autowired
    public BookingController(BookingFacadeService facadeService) {
        this.facadeService = facadeService;
    }

    /**
     * POST /api/bookings - Create a new booking.
     */
    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(@Valid @RequestBody BookingRequest request) {
        BookingResponse booking = facadeService.createBooking(
                request.getDealId(), CurrentUser.phone(),
            request.getPassengerName(), request.getSelectedDepartureTime(), request.getSelectedSeats(), request.getPassengerCount());
        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    /**
     * GET /api/bookings/{id} - Get booking by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable String id) {
        BookingResponse booking = facadeService.getBookingById(id);
        CurrentUser.requireSelfOrAdmin(booking.getPhoneNumber());
        return ResponseEntity.ok(booking);
    }

    /**
     * GET /api/bookings?phone={phoneNumber} - Get bookings by phone number.
     */
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getUserBookings(
            @RequestParam(value = "phone", required = false) String phoneNumber) {
        String phone = phoneNumber == null || phoneNumber.isBlank() ? CurrentUser.phone() : phoneNumber;
        CurrentUser.requireSelfOrAdmin(phone);
        return ResponseEntity.ok(facadeService.getBookingsByPhone(phone));
    }

    /**
     * GET /api/bookings/occupied-seats?dealId={dealId}&departureTime={optionalIsoDateTime}
     */
    @GetMapping("/occupied-seats")
    public ResponseEntity<List<String>> getOccupiedSeats(
            @RequestParam("dealId") String dealId,
            @RequestParam(value = "departureTime", required = false) LocalDateTime departureTime) {
        return ResponseEntity.ok(facadeService.getOccupiedSeats(dealId, departureTime));
    }

    @GetMapping("/seat-map")
    public ResponseEntity<java.util.Map<String, Object>> getSeatMap(
            @RequestParam("dealId") String dealId,
            @RequestParam(value = "departureTime", required = false) LocalDateTime departureTime) {
        return ResponseEntity.ok(facadeService.seatMap(dealId, departureTime, CurrentUser.phoneOrNull()));
    }

    @PutMapping("/holds")
    public ResponseEntity<java.util.Map<String, Object>> holdSeats(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.ok(facadeService.holdSeats(request.getDealId(), request.getSelectedDepartureTime(), CurrentUser.phone(), request.getSelectedSeats()));
    }

    @DeleteMapping("/holds")
    public ResponseEntity<java.util.Map<String, Object>> releaseHolds(
            @RequestParam("dealId") String dealId,
            @RequestParam(value = "departureTime", required = false) LocalDateTime departureTime) {
        return ResponseEntity.ok(facadeService.holdSeats(dealId, departureTime, CurrentUser.phone(), List.of()));
    }

    @PostMapping("/itinerary")
    public ResponseEntity<List<BookingResponse>> createItinerary(@Valid @RequestBody com.bookmyflight.dto.ItineraryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facadeService.createItinerary(request, CurrentUser.phone()));
    }

    @GetMapping("/summary")
    public ResponseEntity<java.util.Map<String, java.util.Map<String, Object>>> getSummary() {
        if (!CurrentUser.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Admins only");
        }
        return ResponseEntity.ok(facadeService.summary());
    }

    /**
     * PUT /api/bookings/{id}/cancel - Cancel a booking with refund.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable String id) {
        CurrentUser.requireSelfOrAdmin(facadeService.getBookingById(id).getPhoneNumber());
        return ResponseEntity.ok(facadeService.cancelBooking(id));
    }
}
