package com.bookmyflight.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * JWT Service - Handles token generation and validation.
 * Stateless authentication: no HTTP sessions required.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:3600000}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Generate a JWT token for the given phone number.
     */
    public String generateToken(String phoneNumber) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(phoneNumber)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Get the expiration date-time of a newly generated token.
     */
    public LocalDateTime getTokenExpiration() {
        return LocalDateTime.ofInstant(
                Instant.now().plusMillis(expirationMs),
                ZoneId.systemDefault());
    }

    /**
     * Validate and extract the phone number (subject) from a JWT token.
     */
    public String validateTokenAndGetPhone(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    /**
     * Check if a token is valid (not expired, properly signed).
     */
    public boolean isTokenValid(String token) {
        try {
            validateTokenAndGetPhone(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
