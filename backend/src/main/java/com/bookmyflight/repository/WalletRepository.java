package com.bookmyflight.repository;

import com.bookmyflight.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * WalletRepository - persistence for wallet balances.
 */
@Repository
public interface WalletRepository extends JpaRepository<Wallet, String> {
}
