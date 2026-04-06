-- Prevenir tareas duplicadas por pedido y área
ALTER TABLE production_tasks
  ADD CONSTRAINT IF NOT EXISTS uq_production_tasks_order_area UNIQUE (order_id, area);
