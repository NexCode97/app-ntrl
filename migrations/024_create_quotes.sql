CREATE TABLE IF NOT EXISTS quotes (
  id            SERIAL PRIMARY KEY,
  quote_number  INTEGER NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(200),
  customer_phone VARCHAR(50),
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  items         JSONB NOT NULL DEFAULT '[]',
  notes         TEXT,
  valid_days    INTEGER NOT NULL DEFAULT 15,
  total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq START 1;

CREATE OR REPLACE FUNCTION quotes_set_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_number := nextval('quotes_quote_number_seq');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_before_insert ON quotes;
CREATE TRIGGER quotes_before_insert
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_set_number();
