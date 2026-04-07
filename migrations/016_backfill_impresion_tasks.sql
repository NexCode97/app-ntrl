-- Migration 016: Backfill impresion tasks for orders created before migration 012
INSERT INTO production_tasks (order_id, area)
SELECT o.id, 'impresion'
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM production_tasks pt
  WHERE pt.order_id = o.id AND pt.area = 'impresion'
);
