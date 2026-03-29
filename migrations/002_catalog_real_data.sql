-- ============================================================
-- APP NTRL — Catálogo real de productos 2026
-- Fuente: Catalogo de productos 2026.xlsx
-- ============================================================

-- Limpiar catálogo anterior (CASCADE elimina order_items y orders)
TRUNCATE sports CASCADE;

-- ============================================================
-- DEPORTES
-- ============================================================

INSERT INTO sports (id, name, slug, display_order) VALUES
  ('11111111-0001-0000-0000-000000000001', 'Ciclismo',   'ciclismo',   1),
  ('11111111-0002-0000-0000-000000000002', 'Patinaje',   'patinaje',   2),
  ('11111111-0003-0000-0000-000000000003', 'BMX',        'bmx',        3),
  ('11111111-0004-0000-0000-000000000004', 'Accesorios', 'accesorios', 4),
  ('11111111-0005-0000-0000-000000000005', 'Fútbol',     'futbol',     5),
  ('11111111-0006-0000-0000-000000000006', 'Lifestyle',  'lifestyle',  6),
  ('11111111-0007-0000-0000-000000000007', 'Atletismo',  'atletismo',  7);

-- ============================================================
-- LÍNEAS
-- ============================================================

-- Ciclismo
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220001-0001-0000-0000-000000000001', '11111111-0001-0000-0000-000000000001', 'Endurance',   'endurance',   1),
  ('22220001-0002-0000-0000-000000000002', '11111111-0001-0000-0000-000000000001', 'Tempo',       'tempo',       2),
  ('22220001-0003-0000-0000-000000000003', '11111111-0001-0000-0000-000000000001', 'Performance', 'performance', 3),
  ('22220001-0004-0000-0000-000000000004', '11111111-0001-0000-0000-000000000001', 'Elite',       'elite',       4);

-- Patinaje
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220002-0001-0000-0000-000000000001', '11111111-0002-0000-0000-000000000002', 'Race',  'race',  1),
  ('22220002-0002-0000-0000-000000000002', '11111111-0002-0000-0000-000000000002', 'Speed', 'speed', 2);

-- BMX
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220003-0001-0000-0000-000000000001', '11111111-0003-0000-0000-000000000003', 'MiniRiders', 'miniriders', 1);

-- Accesorios
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220004-0001-0000-0000-000000000001', '11111111-0004-0000-0000-000000000004', 'Sport', 'sport', 1);

-- Fútbol
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220005-0001-0000-0000-000000000001', '11111111-0005-0000-0000-000000000005', 'Madeira', 'madeira', 1),
  ('22220005-0002-0000-0000-000000000002', '11111111-0005-0000-0000-000000000005', 'Munich',  'munich',  2);

-- Lifestyle
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220006-0001-0000-0000-000000000001', '11111111-0006-0000-0000-000000000006', 'Novu', 'novu', 1);

-- Atletismo
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220007-0001-0000-0000-000000000001', '11111111-0007-0000-0000-000000000007', 'Run', 'run', 1);

-- ============================================================
-- PRODUCTOS
-- ============================================================

-- Ciclismo > Endurance
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0001-0000-0000-000000000001', 'Jersey Endurance Infantil MC', 'jersey-endurance-infantil-mc', 1),
  ('22220001-0001-0000-0000-000000000001', 'Jersey Endurance Infantil ML', 'jersey-endurance-infantil-ml', 2),
  ('22220001-0001-0000-0000-000000000001', 'Pantaloneta Endurance Infantil','pantaloneta-endurance-infantil',3),
  ('22220001-0001-0000-0000-000000000001', 'Jersey Endurance MC',          'jersey-endurance-mc',           4),
  ('22220001-0001-0000-0000-000000000001', 'Jersey Endurance ML',          'jersey-endurance-ml',           5);

-- Ciclismo > Tempo
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0002-0000-0000-000000000002', 'Jersey Tempo MC',    'jersey-tempo-mc',    1),
  ('22220001-0002-0000-0000-000000000002', 'Jersey Tempo ML',    'jersey-tempo-ml',    2),
  ('22220001-0002-0000-0000-000000000002', 'Pantaloneta Tempo',  'pantaloneta-tempo',  3);

-- Ciclismo > Performance
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0003-0000-0000-000000000003', 'Jersey Performance MC',      'jersey-performance-mc',      1),
  ('22220001-0003-0000-0000-000000000003', 'Jersey Performance ML',      'jersey-performance-ml',      2),
  ('22220001-0003-0000-0000-000000000003', 'Pantaloneta sin costuras',   'pantaloneta-sin-costuras',   3);

-- Ciclismo > Elite
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0004-0000-0000-000000000004', 'Jersey Elite MC',    'jersey-elite-mc',    1),
  ('22220001-0004-0000-0000-000000000004', 'Enterizo AeroRace',  'enterizo-aerorace',  2);

-- Patinaje > Race
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220002-0001-0000-0000-000000000001', 'Licra Race MC', 'licra-race-mc', 1),
  ('22220002-0001-0000-0000-000000000001', 'Licra Race ML', 'licra-race-ml', 2);

-- Patinaje > Speed
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220002-0002-0000-0000-000000000002', 'Licra Speed MC', 'licra-speed-mc', 1),
  ('22220002-0002-0000-0000-000000000002', 'Licra Speed ML', 'licra-speed-ml', 2);

-- BMX > MiniRiders
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220003-0001-0000-0000-000000000001', 'Buso MiniRiders',      'buso-miniriders',      1),
  ('22220003-0001-0000-0000-000000000001', 'Pantalon MiniRiders',  'pantalon-miniriders',  2);

-- Accesorios > Sport
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220004-0001-0000-0000-000000000001', 'Guantes',              'guantes',              1),
  ('22220004-0001-0000-0000-000000000001', 'Medias',               'medias',               2),
  ('22220004-0001-0000-0000-000000000001', 'Chaqueta impermeable', 'chaqueta-impermeable', 3),
  ('22220004-0001-0000-0000-000000000001', 'Chaleco',              'chaleco',              4),
  ('22220004-0001-0000-0000-000000000001', 'Buff',                 'buff',                 5),
  ('22220004-0001-0000-0000-000000000001', 'Camisilla deportiva',  'camisilla-deportiva',  6),
  ('22220004-0001-0000-0000-000000000001', 'Top deportivo',        'top-deportivo',        7),
  ('22220004-0001-0000-0000-000000000001', 'Gorra de ciclismo',    'gorra-de-ciclismo',    8),
  ('22220004-0001-0000-0000-000000000001', 'Pañoleta',             'panoleta',             9);

-- Fútbol > Madeira
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220005-0001-0000-0000-000000000001', 'Camiseta Fútbol Madeira',    'camiseta-futbol-madeira',    1),
  ('22220005-0001-0000-0000-000000000001', 'Pantaloneta Fútbol Madeira', 'pantaloneta-futbol-madeira', 2);

-- Fútbol > Munich
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220005-0002-0000-0000-000000000002', 'Camiseta Fútbol Munich',    'camiseta-futbol-munich',    1),
  ('22220005-0002-0000-0000-000000000002', 'Pantaloneta Fútbol Munich', 'pantaloneta-futbol-munich', 2);

-- Lifestyle > Novu
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220006-0001-0000-0000-000000000001', 'Camiseta Polo',         'camiseta-polo',         1),
  ('22220006-0001-0000-0000-000000000001', 'Camiseta Cuello Redondo','camiseta-cuello-redondo',2),
  ('22220006-0001-0000-0000-000000000001', 'Pantaloneta Lifestyle', 'pantaloneta-lifestyle', 3),
  ('22220006-0001-0000-0000-000000000001', 'Camiseta Cuello en V',  'camiseta-cuello-en-v',  4),
  ('22220006-0001-0000-0000-000000000001', 'Buso en Algodón',       'buso-en-algodon',       5),
  ('22220006-0001-0000-0000-000000000001', 'Sudadera Novarepel',    'sudadera-novarepel',    6),
  ('22220006-0001-0000-0000-000000000001', 'Sudadera Universal',    'sudadera-universal',    7);

-- Atletismo > Run
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220007-0001-0000-0000-000000000001', 'Camiseta de atletismo',    'camiseta-de-atletismo',    1),
  ('22220007-0001-0000-0000-000000000001', 'Pantaloneta de atletismo', 'pantaloneta-de-atletismo', 2);
