-- ============================================================
-- Row Level Security (RLS) — APP NTRL
-- ============================================================
-- Ejecutar como superusuario o el dueño de las tablas.
-- El usuario del pool de la app debe tener BYPASSRLS para que
-- las políticas de la aplicación (middleware) sigan funcionando
-- sin interferencia. RLS protege accesos directos a la DB
-- (psql, pgAdmin, conexiones externas) que no pasen por la API.
--
-- USO:
--   psql $DATABASE_URL -f scripts/rls-setup.sql
--
-- Para obtener el usuario actual del pool:
--   SELECT current_user;
-- ============================================================

-- 1. Reemplaza 'app_user' con el usuario real de tu DATABASE_URL
--    Puedes verlo con: SELECT current_user; en psql
DO $$
DECLARE
  app_role TEXT := current_user; -- Ajustar si el pool usa un rol diferente
BEGIN
  RAISE NOTICE 'Configurando RLS para el rol: %', app_role;

  -- Dar BYPASSRLS al usuario del pool para que la app funcione normalmente
  EXECUTE format('ALTER ROLE %I BYPASSRLS', app_role);
END $$;


-- ============================================================
-- 2. Habilitar RLS en tablas sensibles
-- ============================================================

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. Políticas DENY ALL por defecto para roles no privilegiados
--    (protege accesos directos a la DB que no sean el pool)
-- ============================================================

-- users
DROP POLICY IF EXISTS deny_direct_access ON users;
CREATE POLICY deny_direct_access ON users
  AS RESTRICTIVE
  USING (false);

-- orders
DROP POLICY IF EXISTS deny_direct_access ON orders;
CREATE POLICY deny_direct_access ON orders
  AS RESTRICTIVE
  USING (false);

-- messages
DROP POLICY IF EXISTS deny_direct_access ON messages;
CREATE POLICY deny_direct_access ON messages
  AS RESTRICTIVE
  USING (false);

-- notifications
DROP POLICY IF EXISTS deny_direct_access ON notifications;
CREATE POLICY deny_direct_access ON notifications
  AS RESTRICTIVE
  USING (false);

-- production_tasks
DROP POLICY IF EXISTS deny_direct_access ON production_tasks;
CREATE POLICY deny_direct_access ON production_tasks
  AS RESTRICTIVE
  USING (false);


-- ============================================================
-- 4. Verificación
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  forcerowsecurity AS rls_forced
FROM pg_tables
WHERE tablename IN (
  'users', 'orders', 'messages',
  'notifications', 'production_tasks'
)
ORDER BY tablename;

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN (
  'users', 'orders', 'messages',
  'notifications', 'production_tasks'
)
ORDER BY tablename, policyname;
