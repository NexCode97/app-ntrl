-- Migration 028: Avance por producto+talla+area dentro de cada pedido
-- Permite a los trabajadores marcar qué productos ya hicieron en su área.

CREATE TABLE IF NOT EXISTS production_item_progress (
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  area          VARCHAR(50) NOT NULL
                CHECK (area IN ('corte','diseno_disenar','impresion','sublimacion','ensamble','terminados')),
  size          VARCHAR(20) NOT NULL,
  is_done       BOOLEAN     NOT NULL DEFAULT false,
  updated_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_item_id, area, size)
);

CREATE INDEX IF NOT EXISTS idx_progress_area ON production_item_progress(area, is_done);
