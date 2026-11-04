CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON sale_items(product_id);
