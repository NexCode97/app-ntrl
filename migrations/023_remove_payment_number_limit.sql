-- Remove hardcoded limit of 3 payments per order
ALTER TABLE order_payments DROP CONSTRAINT IF EXISTS order_payments_payment_number_check;
