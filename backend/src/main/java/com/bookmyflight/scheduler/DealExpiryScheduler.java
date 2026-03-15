package com.bookmyflight.scheduler;

import com.bookmyflight.service.FlightDealService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Deal Expiry Scheduler.
 * Automatically deactivates expired deals using Spring @Scheduled.
 * Since special deals are only good for a limited amount of time,
 * this scheduler runs periodically to flag expired deals as inactive.
 */
@Component
public class DealExpiryScheduler {

    private static final Logger logger = LoggerFactory.getLogger(DealExpiryScheduler.class);

    private final FlightDealService dealService;

    @Autowired
    public DealExpiryScheduler(FlightDealService dealService) {
        this.dealService = dealService;
    }

    /**
     * Run every 5 minutes to deactivate expired deals.
     */
    @Scheduled(cron = "${app.scheduler.deal-expiry-cron:0 */5 * * * *}")
    public void expireDeals() {
        int count = dealService.deactivateExpiredDeals();
        if (count > 0) {
            logger.info("Deactivated {} expired deals", count);
        }
    }
}
