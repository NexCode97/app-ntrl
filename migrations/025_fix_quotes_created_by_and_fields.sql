-- Cambiar created_by a UUID para que coincida con users.id
ALTER TABLE quotes ALTER COLUMN created_by TYPE UUID USING NULL;

-- Agregar campos de documento y dirección
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_document VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_address  VARCHAR(300);
