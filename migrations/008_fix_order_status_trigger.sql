-- Corregir ambigüedad de columna "status" en el trigger fn_update_order_status
CREATE OR REPLACE FUNCTION fn_update_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total     INTEGER;
  v_done      INTEGER;
  v_started   INTEGER;
  v_cur_status VARCHAR;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE pt.status = 'done'),
    COUNT(*) FILTER (WHERE pt.status IN ('in_progress', 'done')),
    o.status
  INTO v_total, v_done, v_started, v_cur_status
  FROM production_tasks pt
  JOIN orders o ON o.id = pt.order_id
  WHERE pt.order_id = NEW.order_id
  GROUP BY o.status;

  -- No modificar pedidos ya entregados
  IF v_cur_status = 'delivered' THEN
    RETURN NEW;
  END IF;

  IF v_done = v_total THEN
    UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = NEW.order_id;
  ELSIF v_started > 0 THEN
    UPDATE orders SET status = 'in_progress', updated_at = NOW() WHERE id = NEW.order_id;
  ELSE
    UPDATE orders SET status = 'pending', updated_at = NOW() WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
