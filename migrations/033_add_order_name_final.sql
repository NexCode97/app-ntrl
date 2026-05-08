-- Migración 033: Agregar columna name a orders (sintaxis directa para Neon/PostgreSQL 15)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS name VARCHAR(255);
