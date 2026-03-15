package com.bookmyflight.repository;

import com.bookmyflight.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * OtpTokenRepository - Repository Pattern.
 * Abstracts database operations for OTP tokens.
 */
@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, String> {

    /** Find the latest valid (not expired, not verified) OTP for a phone number */
    Optional<OtpToken> findFirstByPhoneNumberAndVerifiedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String phoneNumber, LocalDateTime now);

    /** Delete expired OTP tokens (cleanup) */
    void deleteByExpiresAtBefore(LocalDateTime now);
}
