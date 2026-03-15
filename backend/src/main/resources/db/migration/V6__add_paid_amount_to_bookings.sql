-- ============================================
-- V6: Persist paid amount per booking for exact refunds
-- ============================================

ALTER TABLE bookings ADD COLUMN paid_amount DOUBLE;
