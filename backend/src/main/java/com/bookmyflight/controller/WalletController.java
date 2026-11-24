package com.bookmyflight.controller;

import com.bookmyflight.dto.WalletResponse;
import com.bookmyflight.dto.WalletTopUpRequest;
import com.bookmyflight.security.CurrentUser;
import com.bookmyflight.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private static final double MAX_TOP_UP = 200_000;

    private final WalletService walletService;

    @Autowired
    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public ResponseEntity<WalletResponse> getWallet(@RequestParam(value = "phone", required = false) String phoneNumber) {
        String phone = phoneNumber == null || phoneNumber.isBlank() ? CurrentUser.phone() : phoneNumber;
        CurrentUser.requireSelfOrAdmin(phone);
        return ResponseEntity.ok(walletService.getWallet(phone));
    }

    @PostMapping("/top-up")
    public ResponseEntity<WalletResponse> topUp(@Valid @RequestBody WalletTopUpRequest request) {
        if (request.getAmount() > MAX_TOP_UP) {
            throw new RuntimeException("You can add at most Rs 2,00,000 at a time");
        }
        return ResponseEntity.ok(walletService.topUp(CurrentUser.phone(), request.getAmount()));
    }
}
