-- Chay file nay neu ban dang dung database cu va muon nang cap de tranh loi 500
USE Do_An;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_distance_km DOUBLE NULL DEFAULT 0 AFTER discount_amount,
  ADD COLUMN IF NOT EXISTS shipping_fee BIGINT NULL DEFAULT 0 AFTER shipping_distance_km;

UPDATE orders
SET shipping_distance_km = 0
WHERE shipping_distance_km IS NULL;

UPDATE orders
SET shipping_fee = 0
WHERE shipping_fee IS NULL;
