package com.bookmyflight.controller;

import com.bookmyflight.dto.AuthTokenResponse;
import com.bookmyflight.dto.OtpSendRequest;
import com.bookmyflight.dto.OtpVerifyRequest;
import com.bookmyflight.service.BookingFacadeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Auth Controller - Phone-based OTP authentication endpoints.
 * No username/password required. Customers use their phone number + OTP.
 * Uses the Facade Pattern (BookingFacadeService) for coordinating OTP + JWT.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final BookingFacadeService facadeService;

    @Autowired
    public AuthController(BookingFacadeService facadeService) {
        this.facadeService = facadeService;
    }

    /**
     * POST /api/auth/send-otp - Send an OTP to the customer's phone.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody OtpSendRequest request) {
        facadeService.sendOtp(request.getPhoneNumber());
        return ResponseEntity.ok(Map.of(
                "message", "OTP sent successfully to " + request.getPhoneNumber()
        ));
    }

    /**
     * POST /api/auth/verify-otp - Verify OTP and receive a JWT token.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthTokenResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        AuthTokenResponse token = facadeService.verifyOtpAndIssueToken(
                request.getPhoneNumber(), request.getOtp());
        return ResponseEntity.ok(token);
    }
}
