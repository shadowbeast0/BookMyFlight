package com.bookmyflight.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    public record TokenClaims(String phoneNumber, boolean admin) {}

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret:}") String secret,
            @Value("${app.jwt.expiration-ms:3600000}") long expirationMs) {
        String effective = secret == null || secret.length() < 32 ? randomSecret() : secret;
        this.signingKey = Keys.hmacShaKeyFor(effective.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    private static String randomSecret() {
        byte[] bytes = new byte[48];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    public String generateToken(String phoneNumber, boolean admin) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(phoneNumber)
                .claim("role", admin ? "ADMIN" : "USER")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)))
                .signWith(signingKey)
                .compact();
    }

    public LocalDateTime getTokenExpiration() {
        return LocalDateTime.ofInstant(Instant.now().plusMillis(expirationMs), ZoneId.systemDefault());
    }

    public TokenClaims parse(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
        return new TokenClaims(claims.getSubject(), "ADMIN".equals(claims.get("role", String.class)));
    }

    public boolean isTokenValid(String token) {
        try {
            parse(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
