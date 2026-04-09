-- Migración 011: agregar departamento y ciudad a suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city       VARCHAR(100);
