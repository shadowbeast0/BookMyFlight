package com.bookmyflight.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for booking creation request.
 */
public class BookingRequest {

    @NotBlank(message = "Deal ID is required")
    private String dealId;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    private String passengerName;

    private LocalDateTime selectedDepartureTime;

    private List<String> selectedSeats;

    @Positive(message = "Passenger count must be at least 1")
    private Integer passengerCount;

    public String getDealId() { return dealId; }
    public void setDealId(String dealId) { this.dealId = dealId; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public LocalDateTime getSelectedDepartureTime() { return selectedDepartureTime; }
    public void setSelectedDepartureTime(LocalDateTime selectedDepartureTime) { this.selectedDepartureTime = selectedDepartureTime; }

    public List<String> getSelectedSeats() { return selectedSeats; }
    public void setSelectedSeats(List<String> selectedSeats) { this.selectedSeats = selectedSeats; }

    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }
}
