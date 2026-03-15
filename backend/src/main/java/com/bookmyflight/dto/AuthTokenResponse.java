package com.bookmyflight.dto;

/**
 * Response DTO for JWT authentication token.
 */
public class AuthTokenResponse {
    private String token;
    private String expiresAt;

    public AuthTokenResponse() {
    }

    public AuthTokenResponse(String token, String expiresAt) {
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
}
