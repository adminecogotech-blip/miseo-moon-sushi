-- MISEO connections registry. Stores configuration metadata only; never store provider secrets here.
CREATE TABLE IF NOT EXISTS integration_connections (
  id BIGSERIAL PRIMARY KEY,
  provider_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('delivery','payments','messaging')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_connections_category_idx ON integration_connections(category);
