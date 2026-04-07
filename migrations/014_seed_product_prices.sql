-- Migration 014: Seed product prices from price list 2026
-- Prices in COP. Group discount 15% (>6 units), Distributor discount 25% (>15 units)

UPDATE products SET price_unit = 95000,  price_group = 80750,  price_distributor = 71250  WHERE name ILIKE '%Jersey Endurance Infantil MC%';
UPDATE products SET price_unit = 105000, price_group = 89250,  price_distributor = 78750  WHERE name ILIKE '%Jersey Endurance Infantil ML%';
UPDATE products SET price_unit = 120000, price_group = 102000, price_distributor = 90000  WHERE name ILIKE '%Pantaloneta Endurance Infantil%';
UPDATE products SET price_unit = 110000, price_group = 93500,  price_distributor = 82500  WHERE name ILIKE '%Jersey Endurance MC%' AND name NOT ILIKE '%Infantil%';
UPDATE products SET price_unit = 120000, price_group = 102000, price_distributor = 90000  WHERE name ILIKE '%Jersey Endurance ML%' AND name NOT ILIKE '%Infantil%';
UPDATE products SET price_unit = 130000, price_group = 110500, price_distributor = 97500  WHERE name ILIKE '%Jersey Tempo MC%';
UPDATE products SET price_unit = 140000, price_group = 119000, price_distributor = 105000 WHERE name ILIKE '%Jersey Tempo ML%';
UPDATE products SET price_unit = 150000, price_group = 127500, price_distributor = 112500 WHERE name ILIKE '%Pantaloneta%Tempo%' OR name ILIKE '%Pantaloneta TEMPO%';
UPDATE products SET price_unit = 130000, price_group = 110500, price_distributor = 97500  WHERE name ILIKE '%Jersey Performance MC%';
UPDATE products SET price_unit = 140000, price_group = 119000, price_distributor = 105000 WHERE name ILIKE '%Jersey Performance ML%';
UPDATE products SET price_unit = 170000, price_group = 144500, price_distributor = 127500 WHERE name ILIKE '%Pantaloneta sin costuras%';
UPDATE products SET price_unit = 140000, price_group = 119000, price_distributor = 105000 WHERE name ILIKE '%Jersey Elite MC%' OR name ILIKE '%Jersey ELITE MC%';
UPDATE products SET price_unit = 280000, price_group = 238000, price_distributor = 210000 WHERE name ILIKE '%Enterizo AeroRace%';
