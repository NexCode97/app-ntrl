-- Corregir la restricción de clave foránea en supply_requests para que
-- al eliminar un pedido, los suministros asociados también se eliminen (o se desvinculen).
-- La estrategia es SET NULL: el suministro queda huérfano pero no bloquea el borrado del pedido.

ALTER TABLE supply_requests
  DROP CONSTRAINT IF EXISTS supply_requests_order_id_fkey;

ALTER TABLE supply_requests
  ADD CONSTRAINT supply_requests_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
