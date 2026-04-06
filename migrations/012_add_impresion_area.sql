-- Migration 012: Reemplazar diseno_imprimir por área independiente "impresion"

-- 1. Eliminar el check constraint viejo (permite cualquier valor temporalmente)
ALTER TABLE production_tasks DROP CONSTRAINT IF EXISTS production_tasks_area_check;

-- 2. Renombrar filas ANTES de agregar el nuevo constraint
UPDATE production_tasks SET area = 'impresion' WHERE area = 'diseno_imprimir';

-- 3. Agregar nuevo check constraint ya con los datos actualizados
ALTER TABLE production_tasks ADD CONSTRAINT production_tasks_area_check
  CHECK (area IN ('corte', 'diseno_disenar', 'impresion', 'sublimacion', 'ensamble', 'terminados'));

-- 4. Actualizar la función del trigger para nuevos pedidos
CREATE OR REPLACE FUNCTION fn_create_production_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO production_tasks (order_id, area) VALUES
    (NEW.id, 'corte'),
    (NEW.id, 'diseno_disenar'),
    (NEW.id, 'impresion'),
    (NEW.id, 'sublimacion'),
    (NEW.id, 'ensamble'),
    (NEW.id, 'terminados');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
