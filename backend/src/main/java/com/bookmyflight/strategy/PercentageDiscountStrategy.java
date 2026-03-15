package com.bookmyflight.strategy;

import com.bookmyflight.entity.FlightDeal;
import org.springframework.stereotype.Component;

/**
 * Strategy Pattern - Percentage Discount.
 * Applies a simple percentage-based discount to the deal cost.
 * E.g., a deal with cost=$200 and discount=20% yields $160.
 */
@Component
public class PercentageDiscountStrategy implements DiscountStrategy {

    @Override
    public double calculatePrice(FlightDeal deal) {
        if (deal.getDiscount() == null || deal.getDiscount() <= 0) {
            return deal.getCost();
        }
        double discountFraction = deal.getDiscount() / 100.0;
        return Math.round(deal.getCost() * (1 - discountFraction) * 100.0) / 100.0;
    }

    @Override
    public String getStrategyName() {
        return "PERCENTAGE";
    }
}
