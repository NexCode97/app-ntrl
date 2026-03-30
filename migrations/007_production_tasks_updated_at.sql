-- Agregar columna updated_at a production_tasks
ALTER TABLE production_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
