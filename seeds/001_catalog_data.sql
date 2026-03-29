-- ============================================================
-- APP NTRL — Datos iniciales del catálogo
-- Natural Ropa Deportiva
-- ============================================================

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
-- LÍNEAS por deporte
-- ============================================================

-- Ciclismo
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220001-0001-0000-0000-000000000001', '11111111-0001-0000-0000-000000000001', 'Ruta',     'ruta',     1),
  ('22220001-0002-0000-0000-000000000002', '11111111-0001-0000-0000-000000000001', 'MTB',      'mtb',      2),
  ('22220001-0003-0000-0000-000000000003', '11111111-0001-0000-0000-000000000001', 'Downhill', 'downhill', 3),
  ('22220001-0004-0000-0000-000000000004', '11111111-0001-0000-0000-000000000001', 'Urbano',   'urbano',   4);

-- Patinaje
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220002-0001-0000-0000-000000000001', '11111111-0002-0000-0000-000000000002', 'Velocidad',   'velocidad',   1),
  ('22220002-0002-0000-0000-000000000002', '11111111-0002-0000-0000-000000000002', 'Artístico',   'artistico',   2),
  ('22220002-0003-0000-0000-000000000003', '11111111-0002-0000-0000-000000000002', 'Hockey',      'hockey',      3);

-- BMX
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220003-0001-0000-0000-000000000001', '11111111-0003-0000-0000-000000000003', 'Race',       'race',       1),
  ('22220003-0002-0000-0000-000000000002', '11111111-0003-0000-0000-000000000003', 'Freestyle',  'freestyle',  2);

-- Accesorios
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220004-0001-0000-0000-000000000001', '11111111-0004-0000-0000-000000000004', 'Protección',  'proteccion',  1),
  ('22220004-0002-0000-0000-000000000002', '11111111-0004-0000-0000-000000000004', 'Bolsos',      'bolsos',      2),
  ('22220004-0003-0000-0000-000000000003', '11111111-0004-0000-0000-000000000004', 'Gorras',      'gorras',      3);

-- Fútbol
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220005-0001-0000-0000-000000000001', '11111111-0005-0000-0000-000000000005', 'Uniformes',  'uniformes',  1),
  ('22220005-0002-0000-0000-000000000002', '11111111-0005-0000-0000-000000000005', 'Portero',    'portero',    2),
  ('22220005-0003-0000-0000-000000000003', '11111111-0005-0000-0000-000000000005', 'Entrenamiento', 'entrenamiento', 3);

-- Lifestyle
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220006-0001-0000-0000-000000000001', '11111111-0006-0000-0000-000000000006', 'Casual',    'casual',    1),
  ('22220006-0002-0000-0000-000000000002', '11111111-0006-0000-0000-000000000006', 'Street',    'street',    2);

-- Atletismo
INSERT INTO lines (id, sport_id, name, slug, display_order) VALUES
  ('22220007-0001-0000-0000-000000000001', '11111111-0007-0000-0000-000000000007', 'Pista',     'pista',     1),
  ('22220007-0002-0000-0000-000000000002', '11111111-0007-0000-0000-000000000007', 'Trail',     'trail',     2),
  ('22220007-0003-0000-0000-000000000003', '11111111-0007-0000-0000-000000000007', 'Maratón',   'maraton',   3);

-- ============================================================
-- PRODUCTOS por línea
-- ============================================================

-- Ciclismo > Ruta
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0001-0000-0000-000000000001', 'Licra Bib Corta',    'licra-bib-corta',    1),
  ('22220001-0001-0000-0000-000000000001', 'Licra Bib Larga',    'licra-bib-larga',    2),
  ('22220001-0001-0000-0000-000000000001', 'Jersey Manga Corta', 'jersey-manga-corta', 3),
  ('22220001-0001-0000-0000-000000000001', 'Jersey Manga Larga', 'jersey-manga-larga', 4),
  ('22220001-0001-0000-0000-000000000001', 'Kit Completo',       'kit-completo',       5);

-- Ciclismo > MTB
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0002-0000-0000-000000000002', 'Camiseta MTB',       'camiseta-mtb',       1),
  ('22220001-0002-0000-0000-000000000002', 'Short MTB',          'short-mtb',          2),
  ('22220001-0002-0000-0000-000000000002', 'Licra MTB',          'licra-mtb',          3),
  ('22220001-0002-0000-0000-000000000002', 'Kit MTB',            'kit-mtb',            4);

-- Ciclismo > Downhill
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0003-0000-0000-000000000003', 'Jersey DH',          'jersey-dh',          1),
  ('22220001-0003-0000-0000-000000000003', 'Pantalón DH',        'pantalon-dh',        2);

-- Ciclismo > Urbano
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220001-0004-0000-0000-000000000004', 'Camiseta Urbana',    'camiseta-urbana',    1),
  ('22220001-0004-0000-0000-000000000004', 'Short Urbano',       'short-urbano',       2);

-- Patinaje > Velocidad
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220002-0001-0000-0000-000000000001', 'Body Velocidad',     'body-velocidad',     1),
  ('22220002-0001-0000-0000-000000000001', 'Bermuda Velocidad',  'bermuda-velocidad',  2);

-- Patinaje > Artístico
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220002-0002-0000-0000-000000000002', 'Body Artístico',     'body-artistico',     1),
  ('22220002-0002-0000-0000-000000000002', 'Falda Artística',    'falda-artistica',    2);

-- Patinaje > Hockey
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220002-0003-0000-0000-000000000003', 'Camiseta Hockey',    'camiseta-hockey',    1),
  ('22220002-0003-0000-0000-000000000003', 'Pantalón Hockey',    'pantalon-hockey',    2);

-- BMX > Race
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220003-0001-0000-0000-000000000001', 'Jersey Race',        'jersey-race',        1),
  ('22220003-0001-0000-0000-000000000001', 'Pantalón Race',      'pantalon-race',      2),
  ('22220003-0001-0000-0000-000000000001', 'Kit Race',           'kit-race',           3);

-- BMX > Freestyle
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220003-0002-0000-0000-000000000002', 'Camiseta Freestyle', 'camiseta-freestyle', 1),
  ('22220003-0002-0000-0000-000000000002', 'Short Freestyle',    'short-freestyle',    2);

-- Accesorios > Protección
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220004-0001-0000-0000-000000000001', 'Rodillera',          'rodillera',          1),
  ('22220004-0001-0000-0000-000000000001', 'Codillera',          'codillera',          2),
  ('22220004-0001-0000-0000-000000000001', 'Guantes',            'guantes',            3);

-- Accesorios > Bolsos
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220004-0002-0000-0000-000000000002', 'Morral',             'morral',             1),
  ('22220004-0002-0000-0000-000000000002', 'Riñonera',           'rinionera',          2);

-- Accesorios > Gorras
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220004-0003-0000-0000-000000000003', 'Gorra Clásica',      'gorra-clasica',      1),
  ('22220004-0003-0000-0000-000000000003', 'Gorra Trucker',      'gorra-trucker',      2);

-- Fútbol > Uniformes
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220005-0001-0000-0000-000000000001', 'Camiseta Fútbol',    'camiseta-futbol',    1),
  ('22220005-0001-0000-0000-000000000001', 'Short Fútbol',       'short-futbol',       2),
  ('22220005-0001-0000-0000-000000000001', 'Kit Fútbol',         'kit-futbol',         3),
  ('22220005-0001-0000-0000-000000000001', 'Maletín',            'maletin',            4);

-- Fútbol > Portero
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220005-0002-0000-0000-000000000002', 'Camiseta Portero',   'camiseta-portero',   1),
  ('22220005-0002-0000-0000-000000000002', 'Pantalón Portero',   'pantalon-portero',   2);

-- Fútbol > Entrenamiento
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220005-0003-0000-0000-000000000003', 'Camiseta Training',  'camiseta-training',  1),
  ('22220005-0003-0000-0000-000000000003', 'Buzo',               'buzo',               2),
  ('22220005-0003-0000-0000-000000000003', 'Sudadera',           'sudadera',           3);

-- Lifestyle > Casual
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220006-0001-0000-0000-000000000001', 'Camiseta Casual',    'camiseta-casual',    1),
  ('22220006-0001-0000-0000-000000000001', 'Jogger',             'jogger',             2),
  ('22220006-0001-0000-0000-000000000001', 'Hoodie',             'hoodie',             3);

-- Lifestyle > Street
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220006-0002-0000-0000-000000000002', 'Camiseta Oversize',  'camiseta-oversize',  1),
  ('22220006-0002-0000-0000-000000000002', 'Short Street',       'short-street',       2);

-- Atletismo > Pista
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220007-0001-0000-0000-000000000001', 'Camiseta Pista',     'camiseta-pista',     1),
  ('22220007-0001-0000-0000-000000000001', 'Short Pista',        'short-pista',        2),
  ('22220007-0001-0000-0000-000000000001', 'Licra Pista',        'licra-pista',        3);

-- Atletismo > Trail
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220007-0002-0000-0000-000000000002', 'Camiseta Trail',     'camiseta-trail',     1),
  ('22220007-0002-0000-0000-000000000002', 'Short Trail',        'short-trail',        2);

-- Atletismo > Maratón
INSERT INTO products (line_id, name, slug, display_order) VALUES
  ('22220007-0003-0000-0000-000000000003', 'Camiseta Maratón',   'camiseta-maraton',   1),
  ('22220007-0003-0000-0000-000000000003', 'Short Maratón',      'short-maraton',      2),
  ('22220007-0003-0000-0000-000000000003', 'Kit Maratón',        'kit-maraton',        3);
