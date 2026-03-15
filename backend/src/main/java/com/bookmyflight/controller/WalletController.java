package com.bookmyflight.controller;

import com.bookmyflight.dto.WalletResponse;
import com.bookmyflight.dto.WalletTopUpRequest;
import com.bookmyflight.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Wallet Controller - get wallet and add balance from bank.
 */
@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    @Autowired
    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public ResponseEntity<WalletResponse> getWallet(@RequestParam("phone") String phoneNumber) {
        return ResponseEntity.ok(walletService.getWallet(phoneNumber));
    }

    @PostMapping("/top-up")
    public ResponseEntity<WalletResponse> topUp(@Valid @RequestBody WalletTopUpRequest request) {
        return ResponseEntity.ok(walletService.topUp(request.getPhoneNumber(), request.getAmount()));
    }
}
