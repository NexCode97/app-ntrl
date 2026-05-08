-- Migración 032: Reintentar agregar columna "name" a orders
-- La migración 031 se registró como aplicada pero la columna no se creó en Neon
-- debido a un conflicto de deploys simultáneos. Esta migración es idempotente.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'name'
  ) THEN
    ALTER TABLE orders ADD COLUMN name VARCHAR(255);
  END IF;
END $$;
