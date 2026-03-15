-- ============================================
-- V1: Initial Schema - Flight Deals & Bookings
-- ============================================

CREATE TABLE flight_deals (
    id          VARCHAR(36)  NOT NULL PRIMARY KEY,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city   VARCHAR(100) NOT NULL,
    cost           DOUBLE       NOT NULL,
    discount       DOUBLE       DEFAULT 0,
    departure_date TIMESTAMP    NOT NULL,
    expires_at     TIMESTAMP    NOT NULL,
    is_active      BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    deal_id      VARCHAR(36)  NOT NULL,
    phone_number VARCHAR(20)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_deal FOREIGN KEY (deal_id) REFERENCES flight_deals(id)
);

CREATE TABLE otp_tokens (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    phone_number VARCHAR(20)  NOT NULL,
    otp_code     VARCHAR(10)  NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    verified     BOOLEAN      DEFAULT FALSE,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
