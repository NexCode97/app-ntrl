-- Columnas faltantes en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar   VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);

-- Tabla suppliers (proveedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  phone        VARCHAR(30),
  email        VARCHAR(150),
  address      TEXT,
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Tabla supply_requests (solicitudes de insumos)
CREATE TABLE IF NOT EXISTS supply_requests (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID         NOT NULL REFERENCES users(id),
  order_id    UUID         REFERENCES orders(id),
  item_name   VARCHAR(200) NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit        VARCHAR(50),
  notes       TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'purchased')),
  reviewed_by UUID         REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supply_requests_worker_id ON supply_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_supply_requests_status    ON supply_requests(status);

-- Tabla messages (chat interno)
CREATE TABLE IF NOT EXISTS messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID        NOT NULL REFERENCES users(id),
  to_user_id   UUID        NOT NULL REFERENCES users(id),
  content      TEXT,
  file_url     VARCHAR(500),
  file_name    VARCHAR(200),
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user   ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
