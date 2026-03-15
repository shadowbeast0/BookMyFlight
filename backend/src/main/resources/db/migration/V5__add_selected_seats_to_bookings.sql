-- ============================================
-- V5: Persist selected seats for seat locking
-- ============================================

ALTER TABLE bookings ADD COLUMN selected_seats VARCHAR(255);
