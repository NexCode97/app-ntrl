-- Migration 013: Add price tiers to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_unit        INTEGER DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_group       INTEGER DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_distributor INTEGER DEFAULT NULL;
