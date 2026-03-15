package com.bookmyflight.strategy;

import com.bookmyflight.entity.FlightDeal;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Strategy Pattern - Time-Based Urgency Discount.
 * Increases the discount as the deal approaches expiration.
 * Deals expiring within 1 hour get an extra 10% off;
 * deals within 3 hours get an extra 5% off.
 * This creates urgency for customers to book quickly.
 */
@Component
public class TimeBasedDiscountStrategy implements DiscountStrategy {

    @Override
    public double calculatePrice(FlightDeal deal) {
        double baseDiscount = (deal.getDiscount() != null) ? deal.getDiscount() : 0;

        // Calculate time remaining until expiration
        long minutesLeft = ChronoUnit.MINUTES.between(LocalDateTime.now(), deal.getExpiresAt());

        double urgencyBonus = 0;
        if (minutesLeft <= 60) {
            urgencyBonus = 10; // Extra 10% off for last hour
        } else if (minutesLeft <= 180) {
            urgencyBonus = 5;  // Extra 5% off for last 3 hours
        }

        double totalDiscount = Math.min(baseDiscount + urgencyBonus, 50); // Cap at 50%
        double discountFraction = totalDiscount / 100.0;
        return Math.round(deal.getCost() * (1 - discountFraction) * 100.0) / 100.0;
    }

    @Override
    public String getStrategyName() {
        return "TIME_BASED";
    }
}
