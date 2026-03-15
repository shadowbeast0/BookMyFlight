package com.bookmyflight.service;

import com.bookmyflight.dto.WalletResponse;
import com.bookmyflight.entity.Wallet;
import com.bookmyflight.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * WalletService - handles wallet balance operations.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepository;

    @Autowired
    public WalletService(WalletRepository walletRepository) {
        this.walletRepository = walletRepository;
    }

    @Transactional
    public WalletResponse getWallet(String phoneNumber) {
        Wallet wallet = getOrCreateWalletEntity(phoneNumber);
        return toResponse(wallet);
    }

    @Transactional
    public WalletResponse topUp(String phoneNumber, Double amount) {
        Wallet wallet = getOrCreateWalletEntity(phoneNumber);
        wallet.setBalance(wallet.getBalance() + amount);
        wallet = walletRepository.save(wallet);
        return toResponse(wallet);
    }

    @Transactional
    public Wallet debit(String phoneNumber, Double amount) {
        Wallet wallet = getOrCreateWalletEntity(phoneNumber);
        if (wallet.getBalance() < amount) {
            throw new RuntimeException(
                    String.format("Insufficient wallet balance. Current: Rs %.2f, Required: Rs %.2f", wallet.getBalance(), amount)
            );
        }
        wallet.setBalance(wallet.getBalance() - amount);
        return walletRepository.save(wallet);
    }

    @Transactional
    public Wallet credit(String phoneNumber, Double amount) {
        Wallet wallet = getOrCreateWalletEntity(phoneNumber);
        wallet.setBalance(wallet.getBalance() + amount);
        return walletRepository.save(wallet);
    }

    @Transactional
    public Wallet getOrCreateWalletEntity(String phoneNumber) {
        return walletRepository.findById(phoneNumber)
                .orElseGet(() -> walletRepository.save(new Wallet(phoneNumber, 0.0)));
    }

    private WalletResponse toResponse(Wallet wallet) {
        return new WalletResponse(wallet.getPhoneNumber(), wallet.getBalance());
    }
}
