package com.bookmyflight.strategy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Strategy Pattern Context - Manages and provides discount strategies.
 * Allows runtime selection of different pricing algorithms.
 * New strategies can be added by simply creating a new @Component implementing DiscountStrategy.
 */
@Component
public class DiscountStrategyContext {

    private final Map<String, DiscountStrategy> strategies;
    private final DiscountStrategy defaultStrategy;

    @Autowired
    public DiscountStrategyContext(List<DiscountStrategy> strategyList,
                                   PercentageDiscountStrategy defaultStrategy) {
        this.strategies = new HashMap<>();
        for (DiscountStrategy strategy : strategyList) {
            this.strategies.put(strategy.getStrategyName(), strategy);
        }
        this.defaultStrategy = defaultStrategy;
    }

    public DiscountStrategy getStrategy(String name) {
        return strategies.getOrDefault(name, defaultStrategy);
    }

    public DiscountStrategy getDefaultStrategy() {
        return defaultStrategy;
    }
}
