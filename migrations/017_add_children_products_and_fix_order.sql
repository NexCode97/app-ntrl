-- Migration 017: Add children product variants for Patinaje and Lifestyle, fix sport display order

-- Fix sport display order
UPDATE sports SET display_order = 1 WHERE slug = 'ciclismo';
UPDATE sports SET display_order = 2 WHERE slug = 'patinaje';
UPDATE sports SET display_order = 3 WHERE slug = 'bmx';
UPDATE sports SET display_order = 4 WHERE slug = 'accesorios';
UPDATE sports SET display_order = 5 WHERE slug = 'futbol';
UPDATE sports SET display_order = 6 WHERE slug = 'lifestyle';
UPDATE sports SET display_order = 7 WHERE slug = 'atletismo';

-- Patinaje > Race: children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Licra Race MC Niños', 'licra-race-mc-ninos', 10, 105000, 89250, 78750
FROM lines l WHERE l.slug = 'race'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'licra-race-mc-ninos');

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Licra Race ML Niños', 'licra-race-ml-ninos', 11, 115000, 97750, 86250
FROM lines l WHERE l.slug = 'race'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'licra-race-ml-ninos');

-- Patinaje > Speed: children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Licra Speed MC Niños', 'licra-speed-mc-ninos', 10, 115000, 97750, 86250
FROM lines l WHERE l.slug = 'speed'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'licra-speed-mc-ninos');

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Licra Speed ML Niños', 'licra-speed-ml-ninos', 11, 125000, 106250, 93750
FROM lines l WHERE l.slug = 'speed'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'licra-speed-ml-ninos');

-- Lifestyle > Novu: children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Camiseta Polo Niños', 'camiseta-polo-ninos', 10, 55000, 46750, 41250
FROM lines l WHERE l.slug = 'novu'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'camiseta-polo-ninos');

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Camiseta Cuello Redondo Niños', 'camiseta-cuello-redondo-ninos', 11, 50000, 42500, 37500
FROM lines l WHERE l.slug = 'novu'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'camiseta-cuello-redondo-ninos');

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT l.id, 'Pantaloneta Lifestyle Niños', 'pantaloneta-lifestyle-ninos', 12, 55000, 46750, 41250
FROM lines l WHERE l.slug = 'novu'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.line_id = l.id AND p.slug = 'pantaloneta-lifestyle-ninos');
