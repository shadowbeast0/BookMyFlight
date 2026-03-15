-- ============================================
-- V4: Add wallet support for bookings and refunds
-- ============================================

CREATE TABLE wallets (
    phone_number VARCHAR(20) NOT NULL PRIMARY KEY,
    balance      DOUBLE      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
