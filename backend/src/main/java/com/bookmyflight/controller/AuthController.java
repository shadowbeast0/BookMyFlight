package com.bookmyflight.controller;

import com.bookmyflight.dto.AuthTokenResponse;
import com.bookmyflight.dto.OtpSendRequest;
import com.bookmyflight.dto.OtpVerifyRequest;
import com.bookmyflight.security.CurrentUser;
import com.bookmyflight.service.BookingFacadeService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final BookingFacadeService facadeService;

    @Autowired
    public AuthController(BookingFacadeService facadeService) {
        this.facadeService = facadeService;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody OtpSendRequest request) {
        String code = facadeService.sendOtp(request.getPhoneNumber());
        Map<String, String> body = new HashMap<>();
        body.put("message", "Code sent to " + request.getPhoneNumber());
        if (facadeService.isOtpDemoMode()) {
            body.put("demoOtp", code);
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthTokenResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return ResponseEntity.ok(facadeService.verifyOtpAndIssueToken(request.getPhoneNumber(), request.getOtp()));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        return ResponseEntity.ok(Map.of("phoneNumber", CurrentUser.phone(), "admin", CurrentUser.isAdmin()));
    }
}
