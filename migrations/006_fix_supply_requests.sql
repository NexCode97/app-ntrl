-- Agregar columna admin_notes a supply_requests
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Corregir el CHECK de status para que coincida con el código
ALTER TABLE supply_requests DROP CONSTRAINT IF EXISTS supply_requests_status_check;
ALTER TABLE supply_requests ADD CONSTRAINT supply_requests_status_check
  CHECK (status IN ('pending', 'in_progress', 'delivered', 'approved', 'rejected', 'purchased'));
