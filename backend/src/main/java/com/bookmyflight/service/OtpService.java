package com.bookmyflight.service;

import com.bookmyflight.entity.OtpToken;
import com.bookmyflight.repository.OtpTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    @Value("${app.otp.demo-mode:true}")
    private boolean demoMode;

    private static final int MAX_CODES_PER_WINDOW = 5;
    private static final long WINDOW_SECONDS = 600;
    private final Map<String, Deque<Instant>> recentRequests = new ConcurrentHashMap<>();

    public boolean isDemoMode() {
        return demoMode;
    }

    private void checkRateLimit(String phoneNumber) {
        Deque<Instant> times = recentRequests.computeIfAbsent(phoneNumber, key -> new ArrayDeque<>());
        synchronized (times) {
            Instant cutoff = Instant.now().minusSeconds(WINDOW_SECONDS);
            while (!times.isEmpty() && times.peekFirst().isBefore(cutoff)) times.pollFirst();
            if (times.size() >= MAX_CODES_PER_WINDOW) {
                throw new RuntimeException("Too many codes requested for this number. Try again in a few minutes.");
            }
            times.addLast(Instant.now());
        }
    }

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
        checkRateLimit(phoneNumber);
        // Generate a secure random OTP
        int max = (int) Math.pow(10, otpLength);
        int min = (int) Math.pow(10, otpLength - 1);
        String otp = String.valueOf(min + secureRandom.nextInt(max - min));

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(otpExpirationSeconds);

        OtpToken otpToken = new OtpToken(phoneNumber, otp, expiresAt);
        otpRepository.save(otpToken);

        if (!demoMode) {
            System.out.println("OTP issued for " + phoneNumber.replaceAll(".(?=.{4})", "*"));
        }

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
