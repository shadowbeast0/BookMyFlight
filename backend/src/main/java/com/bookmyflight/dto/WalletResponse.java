package com.bookmyflight.dto;

/**
 * Wallet response returned to frontend.
 */
public class WalletResponse {
    private String phoneNumber;
    private Double balance;

    public WalletResponse() {
    }

    public WalletResponse(String phoneNumber, Double balance) {
        this.phoneNumber = phoneNumber;
        this.balance = balance;
    }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }
}
