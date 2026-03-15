package com.bookmyflight.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for Flight Deals - sent to the frontend.
 */
public class DealResponse {
    private String id;
    private String departureCity;
    private String arrivalCity;
    private Double cost;
    private Double discount;
    private Integer durationMinutes;
    private String departureDate;
    private String expiresAt;
    private Boolean isActive;

    public DealResponse() {
    }

    public DealResponse(String id, String departureCity, String arrivalCity,
                        Double cost, Double discount, Integer durationMinutes,
                        LocalDateTime departureDate, LocalDateTime expiresAt, Boolean isActive) {
        this.id = id;
        this.departureCity = departureCity;
        this.arrivalCity = arrivalCity;
        this.cost = cost;
        this.discount = discount;
        this.durationMinutes = durationMinutes;
        this.departureDate = departureDate != null ? departureDate.toString() : null;
        this.expiresAt = expiresAt != null ? expiresAt.toString() : null;
        this.isActive = isActive;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDepartureCity() { return departureCity; }
    public void setDepartureCity(String departureCity) { this.departureCity = departureCity; }

    public String getArrivalCity() { return arrivalCity; }
    public void setArrivalCity(String arrivalCity) { this.arrivalCity = arrivalCity; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }

    public Double getDiscount() { return discount; }
    public void setDiscount(Double discount) { this.discount = discount; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getDepartureDate() { return departureDate; }
    public void setDepartureDate(String departureDate) { this.departureDate = departureDate; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
