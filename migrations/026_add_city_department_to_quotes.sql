-- Migración 026: agregar ciudad y departamento a quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_city       VARCHAR(100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_department VARCHAR(100);
