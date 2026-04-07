-- Migration 015: Seed prices for Patinaje, BMX, Accesorios, Futbol, Lifestyle, Atletismo

-- PATINAJE (precios adultos)
UPDATE products SET price_unit = 110000, price_group = 93500,  price_distributor = 82500  WHERE name ILIKE '%Licra%Race MC%';
UPDATE products SET price_unit = 120000, price_group = 102000, price_distributor = 90000  WHERE name ILIKE '%Licra%Race ML%';
UPDATE products SET price_unit = 120000, price_group = 102000, price_distributor = 90000  WHERE name ILIKE '%Licra%Speed MC%';
UPDATE products SET price_unit = 130000, price_group = 110500, price_distributor = 97500  WHERE name ILIKE '%Licra%Speed ML%';

-- BMX / MINIRIDERS
UPDATE products SET price_unit = 80000, price_group = 68000, price_distributor = 60000 WHERE name ILIKE '%Buso MiniRiders%';
UPDATE products SET price_unit = 80000, price_group = 68000, price_distributor = 60000 WHERE name ILIKE '%Pantalon%MiniRiders%';

-- ACCESORIOS
UPDATE products SET price_unit = 35000, price_group = 29750, price_distributor = 26250 WHERE name ILIKE '%Guantes%';
UPDATE products SET price_unit = 25000, price_group = 21250, price_distributor = 18750 WHERE name ILIKE '%Medias%';
UPDATE products SET price_unit = 75000, price_group = 63750, price_distributor = 56250 WHERE name ILIKE '%Chaqueta%impermeable%';
UPDATE products SET price_unit = 60000, price_group = 51000, price_distributor = 45000 WHERE name ILIKE '%Chaleco%';
UPDATE products SET price_unit = 20000, price_group = 17000, price_distributor = 15000 WHERE name ILIKE '%Buff%';
UPDATE products SET price_unit = 43000, price_group = 36550, price_distributor = 32250 WHERE name ILIKE '%Camisilla deportiva%';
UPDATE products SET price_unit = 40000, price_group = 34000, price_distributor = 30000 WHERE name ILIKE '%Top deportivo%';
UPDATE products SET price_unit = 30000, price_group = 25500, price_distributor = 22500 WHERE name ILIKE '%Gorra%ciclismo%';
UPDATE products SET price_unit = 10000, price_group = 8500,  price_distributor = 7500  WHERE name ILIKE '%Pañoleta%';

-- FUTBOL
UPDATE products SET price_unit = 35000, price_group = 29750, price_distributor = 26250 WHERE name ILIKE '%Camiseta%Madeira%';
UPDATE products SET price_unit = 47000, price_group = 39950, price_distributor = 35250 WHERE name ILIKE '%Pantaloneta%Madeira%';
UPDATE products SET price_unit = 40000, price_group = 34000, price_distributor = 30000 WHERE name ILIKE '%Camiseta%Munich%';
UPDATE products SET price_unit = 40000, price_group = 34000, price_distributor = 30000 WHERE name ILIKE '%Pantaloneta%Munich%';

-- LIFESTYLE (precios adultos)
UPDATE products SET price_unit = 65000, price_group = 55250, price_distributor = 48750 WHERE name ILIKE '%Camiseta Polo%';
UPDATE products SET price_unit = 55000, price_group = 46750, price_distributor = 41250 WHERE name ILIKE '%Camiseta Cuello Redondo%';
UPDATE products SET price_unit = 55000, price_group = 46750, price_distributor = 41250 WHERE name ILIKE '%Camiseta Cuello en V%';
UPDATE products SET price_unit = 60000, price_group = 51000, price_distributor = 45000 WHERE name ILIKE '%Pantaloneta Lifestyle%';
UPDATE products SET price_unit = 60000, price_group = 51000, price_distributor = 45000 WHERE name ILIKE '%Buso en Algod%';
UPDATE products SET price_unit = 60000, price_group = 51000, price_distributor = 45000 WHERE name ILIKE '%Sudadera Novarepel%';
UPDATE products SET price_unit = 80000, price_group = 68000, price_distributor = 60000 WHERE name ILIKE '%Sudadera Universal%';

-- ATLETISMO
UPDATE products SET price_unit = 50000, price_group = 42500, price_distributor = 37500 WHERE name ILIKE '%Camiseta de atletismo%';
UPDATE products SET price_unit = 50000, price_group = 42500, price_distributor = 37500 WHERE name ILIKE '%Pantaloneta de atletismo%';
