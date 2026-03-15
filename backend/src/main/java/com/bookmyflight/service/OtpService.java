package com.bookmyflight.service;

import com.bookmyflight.entity.OtpToken;
import com.bookmyflight.repository.OtpTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * OTP Service - Handles OTP generation and verification.
 * In production, integration with Twilio or another SMS provider would send the OTP.
 * For this demo, OTP is generated and stored; the value is logged to console.
 */
@Service
public class OtpService {

    private final OtpTokenRepository otpRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.otp.expiration-seconds:300}")
    private int otpExpirationSeconds;

    @Value("${app.otp.length:6}")
    private int otpLength;

    @Autowired
    public OtpService(OtpTokenRepository otpRepository) {
        this.otpRepository = otpRepository;
    }

    /**
     * Generate and store an OTP for the given phone number.
     * In production, this would send the OTP via SMS (Twilio, etc.).
     */
    @Transactional
    public String generateOtp(String phoneNumber) {
        // Generate a secure random OTP
        int max = (int) Math.pow(10, otpLength);
        int min = (int) Math.pow(10, otpLength - 1);
        String otp = String.valueOf(min + secureRandom.nextInt(max - min));

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(otpExpirationSeconds);

        OtpToken otpToken = new OtpToken(phoneNumber, otp, expiresAt);
        otpRepository.save(otpToken);

        // In production, send SMS here. For demo, log the OTP.
        System.out.println("========================================");
        System.out.println("  OTP for " + phoneNumber + ": " + otp);
        System.out.println("  (Expires in " + otpExpirationSeconds + " seconds)");
        System.out.println("========================================");

        return otp;
    }

    /**
     * Verify an OTP for the given phone number.
     */
    @Transactional
    public boolean verifyOtp(String phoneNumber, String otp) {
        return otpRepository
                .findFirstByPhoneNumberAndVerifiedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                        phoneNumber, LocalDateTime.now())
                .filter(token -> token.getOtpCode().equals(otp))
                .map(token -> {
                    token.setVerified(true);
                    otpRepository.save(token);
                    return true;
                })
                .orElse(false);
    }
}
