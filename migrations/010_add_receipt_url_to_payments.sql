-- Migración 010: agregar comprobante de pago a order_payments
ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);
