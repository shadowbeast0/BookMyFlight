package com.bookmyflight.repository;

import com.bookmyflight.entity.FlightDeal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * FlightDealRepository - Repository Pattern.
 * Abstracts database operations for FlightDeal entities via Spring Data JPA.
 * The Repository Pattern decouples the data access logic from the business logic,
 * allowing the service layer to work with domain objects without knowing the
 * underlying persistence mechanism (H2, MySQL, etc.).
 */
@Repository
public interface FlightDealRepository extends JpaRepository<FlightDeal, String> {

        /** Lock a deal row to serialize seat checks + booking creation for same flight deal */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT d FROM FlightDeal d WHERE d.id = :id")
        Optional<FlightDeal> findByIdForUpdate(@Param("id") String id);

    /** Find all active deals */
    List<FlightDeal> findByIsActiveTrue();

    /** Find active deals that haven't expired yet */
    List<FlightDeal> findByIsActiveTrueAndExpiresAtAfter(LocalDateTime now);

    /** Search by departure and arrival city (active, non-expired) */
    List<FlightDeal> findByIsActiveTrueAndExpiresAtAfterAndDepartureCityIgnoreCaseAndArrivalCityIgnoreCase(
            LocalDateTime now, String departureCity, String arrivalCity);

    /** Find all active routes departing from a city */
    List<FlightDeal> findByIsActiveTrueAndExpiresAtAfterAndDepartureCityIgnoreCase(
            LocalDateTime now, String departureCity);

    /** Find expired deals that are still marked active (for scheduler) */
    List<FlightDeal> findByIsActiveTrueAndExpiresAtBefore(LocalDateTime now);

    /** Bulk deactivate expired deals */
    @Modifying
    @Query("UPDATE FlightDeal d SET d.isActive = false, d.updatedAt = CURRENT_TIMESTAMP WHERE d.isActive = true AND d.expiresAt < :now")
    int deactivateExpiredDeals(LocalDateTime now);
}
