package com.bookmyflight.dto;

import java.util.List;

/**
 * Response DTO for booking details.
 */
public class BookingResponse {
    private String id;
    private String dealId;
    private String phoneNumber;
    private String passengerName;
    private String createdAt;
    private String status;
    private String departureCity;
    private String arrivalCity;
    private Double cost;
    private String departureDate;
    private String selectedDepartureTime;
    private Integer durationMinutes;
    private List<String> selectedSeats;
    private Double refundAmount;
    private Double walletBalance;

    public BookingResponse() {
    }

    public BookingResponse(String id, String dealId, String phoneNumber, String createdAt, String status) {
        this.id = id;
        this.dealId = dealId;
        this.phoneNumber = phoneNumber;
        this.createdAt = createdAt;
        this.status = status;
    }

    public BookingResponse(String id, String dealId, String phoneNumber, String passengerName,
                           String createdAt, String status,
                           String departureCity, String arrivalCity, Double cost,
                           String departureDate, String selectedDepartureTime, Integer durationMinutes) {
        this(id, dealId, phoneNumber, createdAt, status);
        this.passengerName = passengerName;
        this.departureCity = departureCity;
        this.arrivalCity = arrivalCity;
        this.cost = cost;
        this.departureDate = departureDate;
        this.selectedDepartureTime = selectedDepartureTime;
        this.durationMinutes = durationMinutes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDealId() { return dealId; }
    public void setDealId(String dealId) { this.dealId = dealId; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDepartureCity() { return departureCity; }
    public void setDepartureCity(String departureCity) { this.departureCity = departureCity; }

    public String getArrivalCity() { return arrivalCity; }
    public void setArrivalCity(String arrivalCity) { this.arrivalCity = arrivalCity; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }

    public String getDepartureDate() { return departureDate; }
    public void setDepartureDate(String departureDate) { this.departureDate = departureDate; }

    public String getSelectedDepartureTime() { return selectedDepartureTime; }
    public void setSelectedDepartureTime(String selectedDepartureTime) { this.selectedDepartureTime = selectedDepartureTime; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public List<String> getSelectedSeats() { return selectedSeats; }
    public void setSelectedSeats(List<String> selectedSeats) { this.selectedSeats = selectedSeats; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public Double getWalletBalance() { return walletBalance; }
    public void setWalletBalance(Double walletBalance) { this.walletBalance = walletBalance; }
}
