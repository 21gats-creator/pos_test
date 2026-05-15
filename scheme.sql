-- ================================================================
-- POS System — Supabase Schema (Fresh Install)
-- Supabase Dashboard → SQL Editor → วาง → Run
-- ================================================================

CREATE TABLE IF NOT EXISTS products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  sku                   text UNIQUE,
  category              text,
  cost_price            numeric(10,2) DEFAULT 0,
  selling_price         numeric(10,2) NOT NULL,
  stock                 integer DEFAULT 0,
  material_stock        integer DEFAULT 0,
  expiry_date           date,
  image_url             text,
  product_type          text DEFAULT 'product',
  modifiers             jsonb DEFAULT '[]'::jsonb,
  promo_price           numeric(10,2),
  promo_end             date,
  promo_type            text DEFAULT 'single',
  promo_min_qty         integer DEFAULT 1,
  promo_pair_product_id uuid,
  created_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount    numeric(10,2) NOT NULL,
  total_profit    numeric(10,2) DEFAULT 0,
  payment_method  text DEFAULT 'cash',
  received_amount numeric(10,2),
  change_amount   numeric(10,2),
  omise_charge_id text,
  status          text DEFAULT 'completed',
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           uuid REFERENCES orders(id),
  product_id         uuid REFERENCES products(id),
  quantity           integer NOT NULL,
  price_at_time      numeric(10,2) NOT NULL,
  cost_at_time       numeric(10,2) DEFAULT 0,
  modifiers_snapshot jsonb DEFAULT '[]'::jsonb,
  modifier_price_add numeric(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id),
  amount      integer NOT NULL,
  note        text,
  expiry_date date,
  created_at  timestamptz DEFAULT now()
);

-- ================================================================
-- RLS — อนุญาตให้ anon key อ่าน/เขียนได้ (จำเป็นสำหรับ GitHub Pages)
-- ================================================================
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON products;
DROP POLICY IF EXISTS "anon_all" ON orders;
DROP POLICY IF EXISTS "anon_all" ON order_items;
DROP POLICY IF EXISTS "anon_all" ON stock_history;

CREATE POLICY "anon_all" ON products      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON orders        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON order_items   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON stock_history FOR ALL TO anon USING (true) WITH CHECK (true);
