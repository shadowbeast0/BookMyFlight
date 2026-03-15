package com.bookmyflight.strategy;

import com.bookmyflight.entity.FlightDeal;

/**
 * Strategy Pattern - Discount Strategy Interface.
 *
 * The Strategy Pattern is used here to encapsulate different discount
 * pricing algorithms. The marketing department can change deal pricing
 * strategies dynamically during the day without modifying the core
 * booking logic. Each strategy implements a different pricing algorithm
 * (percentage-based, fixed-amount, time-based urgency, etc.).
 *
 * WHY: The pricing logic varies by promotion type and can change frequently.
 * Using the Strategy Pattern, we can swap algorithms at runtime without
 * changing the FlightDealService or any consuming code.
 *
 * WHERE: Applied in FlightDealService when computing the final deal cost
 * before presenting it to the customer.
 */
public interface DiscountStrategy {

    /**
     * Calculate the discounted price for a flight deal.
     *
     * @param deal the flight deal to price
     * @return the final price after discount
     */
    double calculatePrice(FlightDeal deal);

    /**
     * Get the name/type of this discount strategy.
     */
    String getStrategyName();
}
