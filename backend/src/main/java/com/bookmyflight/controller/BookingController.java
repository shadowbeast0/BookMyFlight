package com.bookmyflight.controller;

import com.bookmyflight.dto.BookingRequest;
import com.bookmyflight.dto.BookingResponse;
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
                request.getDealId(), request.getPhoneNumber(),
            request.getPassengerName(), request.getSelectedDepartureTime(), request.getSelectedSeats(), request.getPassengerCount());
        return ResponseEntity.status(HttpStatus.CREATED).body(booking);
    }

    /**
     * GET /api/bookings/{id} - Get booking by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable String id) {
        return ResponseEntity.ok(facadeService.getBookingById(id));
    }

    /**
     * GET /api/bookings?phone={phoneNumber} - Get bookings by phone number.
     */
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getUserBookings(
            @RequestParam("phone") String phoneNumber) {
        return ResponseEntity.ok(facadeService.getBookingsByPhone(phoneNumber));
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

    /**
     * PUT /api/bookings/{id}/cancel - Cancel a booking with refund.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(@PathVariable String id) {
        return ResponseEntity.ok(facadeService.cancelBooking(id));
    }
}
