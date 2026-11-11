-- MISEO: persistência de receitas e fichas técnicas
-- Aplicar somente em desenvolvimento/homologação após backup.
CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  yield_quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (yield_quantity > 0),
  yield_unit TEXT NOT NULL DEFAULT 'porção',
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_active_name ON recipes (is_active, name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product ON recipe_ingredients (product_id);
