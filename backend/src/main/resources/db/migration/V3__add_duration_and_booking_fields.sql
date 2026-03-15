-- ============================================
-- V3: Add duration_minutes to flights, passenger fields to bookings,
--     and extend deal expiry to 30+ days
-- ============================================

-- Add duration_minutes to flight_deals
ALTER TABLE flight_deals ADD COLUMN duration_minutes INT DEFAULT 120;

-- Add passenger_name and selected_departure_time to bookings
ALTER TABLE bookings ADD COLUMN passenger_name VARCHAR(100);
ALTER TABLE bookings ADD COLUMN selected_departure_time TIMESTAMP;

-- Update seed data with realistic durations (in minutes) and extend expiry
UPDATE flight_deals SET duration_minutes = 130 WHERE id = 'd1a1b2c3-0001-4000-8000-000000000001'; -- Mumbai→Delhi
UPDATE flight_deals SET duration_minutes = 75  WHERE id = 'd1a1b2c3-0002-4000-8000-000000000002'; -- Bangalore→Goa
UPDATE flight_deals SET duration_minutes = 165 WHERE id = 'd1a1b2c3-0003-4000-8000-000000000003'; -- Chennai→Kolkata
UPDATE flight_deals SET duration_minutes = 140 WHERE id = 'd1a1b2c3-0004-4000-8000-000000000004'; -- Hyderabad→Jaipur
UPDATE flight_deals SET duration_minutes = 120 WHERE id = 'd1a1b2c3-0005-4000-8000-000000000005'; -- Pune→Kochi
UPDATE flight_deals SET duration_minutes = 195 WHERE id = 'd1a1b2c3-0006-4000-8000-000000000006'; -- Delhi→Thiruvananthapuram
UPDATE flight_deals SET duration_minutes = 95  WHERE id = 'd1a1b2c3-0007-4000-8000-000000000007'; -- Mumbai→Bangalore
UPDATE flight_deals SET duration_minutes = 170 WHERE id = 'd1a1b2c3-0008-4000-8000-000000000008'; -- Delhi→Chennai
UPDATE flight_deals SET duration_minutes = 80  WHERE id = 'd1a1b2c3-0009-4000-8000-000000000009'; -- Bangalore→Hyderabad
UPDATE flight_deals SET duration_minutes = 145 WHERE id = 'd1a1b2c3-0010-4000-8000-000000000010'; -- Delhi→Kolkata
UPDATE flight_deals SET duration_minutes = 50  WHERE id = 'd1a1b2c3-0011-4000-8000-000000000011'; -- Mumbai→Pune
UPDATE flight_deals SET duration_minutes = 55  WHERE id = 'd1a1b2c3-0012-4000-8000-000000000012'; -- Kochi→Thiruvananthapuram
UPDATE flight_deals SET duration_minutes = 75  WHERE id = 'd1a1b2c3-0013-4000-8000-000000000013'; -- Goa→Mumbai
UPDATE flight_deals SET duration_minutes = 160 WHERE id = 'd1a1b2c3-0014-4000-8000-000000000014'; -- Kolkata→Jaipur
UPDATE flight_deals SET duration_minutes = 85  WHERE id = 'd1a1b2c3-0015-4000-8000-000000000015'; -- Hyderabad→Chennai
UPDATE flight_deals SET duration_minutes = 65  WHERE id = 'd1a1b2c3-0016-4000-8000-000000000016'; -- Jaipur→Delhi

-- Extend expiry to 30 days from now so deals don't expire immediately
UPDATE flight_deals SET expires_at = DATEADD('DAY', 30, CURRENT_TIMESTAMP);
