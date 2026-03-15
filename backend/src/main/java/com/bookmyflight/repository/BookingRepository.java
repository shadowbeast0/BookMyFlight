package com.bookmyflight.repository;

import com.bookmyflight.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * BookingRepository - Repository Pattern.
 * Abstracts database operations for Booking entities.
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    /** Find all bookings for a specific phone number */
    List<Booking> findByPhoneNumber(String phoneNumber);

    /** Find bookings by deal ID */
    List<Booking> findByDealId(String dealId);

    /** Find bookings by deal ID and status */
    List<Booking> findByDealIdAndStatus(String dealId, String status);
}
