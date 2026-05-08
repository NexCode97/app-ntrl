-- Migración 034: Normalizar nombres de clientes existentes a Title Case
-- initcap() convierte "HOTMAN GUEVARA" → "Hotman Guevara"
UPDATE customers SET name = initcap(lower(name)) WHERE name IS NOT NULL;
