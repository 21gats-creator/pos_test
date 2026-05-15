-- ================================================================
-- POS System - Supabase Schema
-- รันในหน้า SQL Editor ของ Supabase Dashboard
-- ================================================================

-- ตาราง products (สินค้า)
-- หมายเหตุ: sku ใช้เป็น barcode ด้วย
CREATE TABLE IF NOT EXISTS products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  sku           text UNIQUE,           -- รหัสบาร์โค้ด/SKU
  category      text,
  cost_price    numeric(10,2) DEFAULT 0,
  selling_price numeric(10,2) NOT NULL,
  stock         integer DEFAULT 0,
  expiry_date   date,
  image_url     text,
  created_at    timestamptz DEFAULT now()
);

-- ตาราง orders (คำสั่งซื้อ)
CREATE TABLE IF NOT EXISTS orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount    numeric(10,2) NOT NULL,
  total_profit    numeric(10,2) DEFAULT 0,
  payment_method  text DEFAULT 'cash',    -- 'cash' | 'promptpay'
  received_amount numeric(10,2),          -- เงินสด: รับมาเท่าไหร่
  change_amount   numeric(10,2),          -- เงินสด: ทอนเท่าไหร่
  omise_charge_id text,                   -- PromptPay: charge ID จาก Omise
  status          text DEFAULT 'completed', -- 'completed' | 'voided'
  created_at      timestamptz DEFAULT now()
);

-- ตาราง order_items (รายการสินค้าในบิล)
CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid REFERENCES orders(id),
  product_id    uuid REFERENCES products(id),
  quantity      integer NOT NULL,
  price_at_time numeric(10,2) NOT NULL,
  cost_at_time  numeric(10,2) DEFAULT 0
);

-- ตาราง stock_history (ประวัติรับสินค้าเข้าสต็อก)
CREATE TABLE IF NOT EXISTS stock_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id),
  amount      integer NOT NULL,  -- บวก = เพิ่ม, ลบ = ตัด
  note        text,
  expiry_date date,
  created_at  timestamptz DEFAULT now()
);

-- ================================================================
-- MIGRATION: เพิ่ม payment columns ใน orders table ที่มีอยู่แล้ว
-- รันนี้ถ้า orders table มีอยู่แล้วและต้องการเพิ่ม columns ใหม่
-- ================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method  text DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_amount numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount   numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS omise_charge_id text;
