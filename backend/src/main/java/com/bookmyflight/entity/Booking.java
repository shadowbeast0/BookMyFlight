package com.bookmyflight.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Booking Entity - Represents a flight booking made by a customer.
 * Uses the Builder Pattern for clean object construction.
 */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "deal_id", nullable = false, length = 36)
    private String dealId;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "passenger_name", length = 100)
    private String passengerName;

    @Column(name = "selected_departure_time")
    private LocalDateTime selectedDepartureTime;

    @Column(name = "selected_seats", length = 255)
    private String selectedSeats;

    @Column(name = "paid_amount")
    private Double paidAmount;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deal_id", insertable = false, updatable = false)
    private FlightDeal deal;

    public Booking() {
    }

    private Booking(Builder builder) {
        this.id = builder.id;
        this.dealId = builder.dealId;
        this.phoneNumber = builder.phoneNumber;
        this.passengerName = builder.passengerName;
        this.selectedDepartureTime = builder.selectedDepartureTime;
        this.selectedSeats = builder.selectedSeats;
        this.paidAmount = builder.paidAmount;
        this.status = builder.status;
        this.createdAt = builder.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "confirmed";
        }
    }

    // ====== Builder Pattern ======

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String dealId;
        private String phoneNumber;
        private String passengerName;
        private LocalDateTime selectedDepartureTime;
        private String selectedSeats;
        private Double paidAmount;
        private String status = "confirmed";
        private LocalDateTime createdAt;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder dealId(String dealId) {
            this.dealId = dealId;
            return this;
        }

        public Builder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        public Builder passengerName(String passengerName) {
            this.passengerName = passengerName;
            return this;
        }

        public Builder selectedDepartureTime(LocalDateTime selectedDepartureTime) {
            this.selectedDepartureTime = selectedDepartureTime;
            return this;
        }

        public Builder selectedSeats(String selectedSeats) {
            this.selectedSeats = selectedSeats;
            return this;
        }

        public Builder paidAmount(Double paidAmount) {
            this.paidAmount = paidAmount;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Booking build() {
            return new Booking(this);
        }
    }

    // ====== Getters and Setters ======

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDealId() { return dealId; }
    public void setDealId(String dealId) { this.dealId = dealId; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public LocalDateTime getSelectedDepartureTime() { return selectedDepartureTime; }
    public void setSelectedDepartureTime(LocalDateTime selectedDepartureTime) { this.selectedDepartureTime = selectedDepartureTime; }

    public String getSelectedSeats() { return selectedSeats; }
    public void setSelectedSeats(String selectedSeats) { this.selectedSeats = selectedSeats; }

    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public FlightDeal getDeal() { return deal; }
    public void setDeal(FlightDeal deal) { this.deal = deal; }
}
