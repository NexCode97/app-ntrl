-- Migration 017: Add children product variants for Patinaje and Lifestyle, fix sport display order

-- Fix sport display order: Ciclismo=1, Patinaje=2, BMX=3, Accesorios=4, Futbol=5, Lifestyle=6, Atletismo=7
UPDATE sports SET display_order = 1 WHERE slug = 'ciclismo';
UPDATE sports SET display_order = 2 WHERE slug = 'patinaje';
UPDATE sports SET display_order = 3 WHERE slug = 'bmx';
UPDATE sports SET display_order = 4 WHERE slug = 'accesorios';
UPDATE sports SET display_order = 5 WHERE slug = 'futbol';
UPDATE sports SET display_order = 6 WHERE slug = 'lifestyle';
UPDATE sports SET display_order = 7 WHERE slug = 'atletismo';

-- Patinaje > Race: add children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Licra Race MC Niños',  'licra-race-mc-ninos',  10, 105000, 89250, 78750 FROM lines WHERE slug = 'race'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Licra Race ML Niños',  'licra-race-ml-ninos',  11, 115000, 97750, 86250 FROM lines WHERE slug = 'race'
ON CONFLICT (slug) DO NOTHING;

-- Patinaje > Speed: add children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Licra Speed MC Niños', 'licra-speed-mc-ninos', 10, 115000, 97750, 86250 FROM lines WHERE slug = 'speed'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Licra Speed ML Niños', 'licra-speed-ml-ninos', 11, 125000, 106250, 93750 FROM lines WHERE slug = 'speed'
ON CONFLICT (slug) DO NOTHING;

-- Lifestyle > Novu: add children variants
INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Camiseta Polo Niños',          'camiseta-polo-ninos',          10, 55000, 46750, 41250 FROM lines WHERE slug = 'novu'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Camiseta Cuello Redondo Niños','camiseta-cuello-redondo-ninos', 11, 50000, 42500, 37500 FROM lines WHERE slug = 'novu'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (line_id, name, slug, display_order, price_unit, price_group, price_distributor)
SELECT id, 'Pantaloneta Lifestyle Niños',  'pantaloneta-lifestyle-ninos',   12, 55000, 46750, 41250 FROM lines WHERE slug = 'novu'
ON CONFLICT (slug) DO NOTHING;
