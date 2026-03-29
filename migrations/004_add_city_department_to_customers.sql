-- Agregar columnas city y department a la tabla customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city       VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
