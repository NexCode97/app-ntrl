-- Historial mensual del dashboard
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id              SERIAL PRIMARY KEY,
  month           CHAR(7)        NOT NULL UNIQUE, -- 'YYYY-MM'
  total_revenue   NUMERIC(14,2)  NOT NULL DEFAULT 0,
  collected       NUMERIC(14,2)  NOT NULL DEFAULT 0,
  pending         NUMERIC(14,2)  NOT NULL DEFAULT 0,
  orders_count    INTEGER        NOT NULL DEFAULT 0,
  status_counts   JSONB          NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
