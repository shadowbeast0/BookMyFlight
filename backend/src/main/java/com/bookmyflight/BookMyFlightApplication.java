package com.bookmyflight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Book My Flight - Main Application Entry Point.
 * Enables scheduling for automatic deal expiration.
 */
@SpringBootApplication
@EnableScheduling
public class BookMyFlightApplication {

    public static void main(String[] args) {
        SpringApplication.run(BookMyFlightApplication.class, args);
    }
}
