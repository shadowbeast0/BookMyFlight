package com.bookmyflight.controller;

import com.bookmyflight.dto.DealRequest;
import com.bookmyflight.dto.DealResponse;
import com.bookmyflight.service.FlightDealService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Deal Controller - REST API for flight deal operations.
 * Public endpoints for browsing deals; admin endpoints for CRUD management.
 */
@RestController
@RequestMapping("/api/deals")
public class DealController {

    private final FlightDealService dealService;

    @Autowired
    public DealController(FlightDealService dealService) {
        this.dealService = dealService;
    }

    /**
     * GET /api/deals - List all active, non-expired deals (public).
     * These are the special deals shown on the home page.
     */
    @GetMapping
    public ResponseEntity<List<DealResponse>> getDeals(
            @RequestParam(value = "all", required = false) Boolean all) {
        if (Boolean.TRUE.equals(all)) {
            return ResponseEntity.ok(dealService.getAllDeals());
        }
        return ResponseEntity.ok(dealService.getActiveDeals());
    }

    /**
     * GET /api/deals/{id} - Get a specific deal by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DealResponse> getDealById(@PathVariable String id) {
        return ResponseEntity.ok(dealService.getDealById(id));
    }

    /**
     * POST /api/deals - Create a new special deal (admin).
     */
    @PostMapping
    public ResponseEntity<DealResponse> createDeal(@Valid @RequestBody DealRequest request) {
        DealResponse deal = dealService.createDeal(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(deal);
    }

    /**
     * PUT /api/deals/{id} - Update an existing deal (admin).
     */
    @PutMapping("/{id}")
    public ResponseEntity<DealResponse> updateDeal(
            @PathVariable String id,
            @Valid @RequestBody DealRequest request) {
        return ResponseEntity.ok(dealService.updateDeal(id, request));
    }

    /**
     * DELETE /api/deals/{id} - Delete a deal (admin).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeal(@PathVariable String id) {
        dealService.deleteDeal(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/deals/search?from=X&to=Y - Search deals by route.
     */
    @GetMapping("/search")
    public ResponseEntity<List<DealResponse>> searchDeals(
            @RequestParam("from") String from,
            @RequestParam("to") String to) {
        return ResponseEntity.ok(dealService.searchDeals(from, to));
    }

    /**
     * GET /api/deals/connecting?from=X&to=Y - Find connecting flights.
     */
    @GetMapping("/connecting")
    public ResponseEntity<List<List<DealResponse>>> getConnectingFlights(
            @RequestParam("from") String from,
            @RequestParam("to") String to) {
        return ResponseEntity.ok(dealService.findConnectingFlights(from, to));
    }

    /**
     * GET /api/deals/cities - Get all unique city names.
     */
    @GetMapping("/cities")
    public ResponseEntity<List<String>> getCities() {
        return ResponseEntity.ok(dealService.getAllCities());
    }
}
