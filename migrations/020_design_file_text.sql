-- Ampliar columna design_file de VARCHAR(500) a TEXT para soportar múltiples archivos de diseño
ALTER TABLE orders ALTER COLUMN design_file TYPE TEXT;
