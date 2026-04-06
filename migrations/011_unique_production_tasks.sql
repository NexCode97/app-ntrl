-- UNIQUE(order_id, area) ya existe desde el esquema inicial (001_initial_schema.sql).
-- ADD CONSTRAINT IF NOT EXISTS no es válido en PostgreSQL para constraints de tabla.
-- Esta migración es un no-op para mantener el historial de _migrations consistente.
DO $$ BEGIN END $$;
