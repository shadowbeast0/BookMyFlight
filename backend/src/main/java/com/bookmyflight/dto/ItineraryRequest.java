package com.bookmyflight.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public class ItineraryRequest {

    @NotEmpty(message = "Add at least one flight")
    @Size(max = 2, message = "An itinerary has one or two flights")
    @Valid
    private List<Leg> legs;

    private String passengerName;

    @Positive(message = "Passenger count must be at least 1")
    private Integer passengerCount;

    public List<Leg> getLegs() { return legs; }
    public void setLegs(List<Leg> legs) { this.legs = legs; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }

    public static class Leg {

        @NotBlank(message = "Deal ID is required")
        private String dealId;

        private LocalDateTime selectedDepartureTime;

        private List<String> selectedSeats;

        public String getDealId() { return dealId; }
        public void setDealId(String dealId) { this.dealId = dealId; }

        public LocalDateTime getSelectedDepartureTime() { return selectedDepartureTime; }
        public void setSelectedDepartureTime(LocalDateTime selectedDepartureTime) { this.selectedDepartureTime = selectedDepartureTime; }

        public List<String> getSelectedSeats() { return selectedSeats; }
        public void setSelectedSeats(List<String> selectedSeats) { this.selectedSeats = selectedSeats; }
    }
}
