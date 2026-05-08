-- Migración 031: Agregar columna "name" a la tabla orders
-- El nombre del pedido es un campo libre opcional para identificar rápidamente el pedido.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'name'
  ) THEN
    ALTER TABLE orders ADD COLUMN name VARCHAR(255);
  END IF;
END $$;
