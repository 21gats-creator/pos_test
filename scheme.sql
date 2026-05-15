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
-- MIGRATION: เพิ่ม modifier + product_type columns
-- รันนี้ถ้า products/order_items table มีอยู่แล้ว
-- ================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'product';
  -- 'product'  = สินค้าที่ขาย (แสดงในหน้าร้าน)
  -- 'material' = วัตถุดิบ (รับเข้าสต็อก ไม่แสดงในหน้าร้าน)

ALTER TABLE products ADD COLUMN IF NOT EXISTS modifiers jsonb DEFAULT '[]'::jsonb;
  -- JSON array ของกลุ่มตัวเลือก เช่น:
  -- [{ "id":"sugar", "name":"ระดับความหวาน", "required":true, "type":"single",
  --    "options":[{"id":"s1","name":"หวานน้อย","price_add":0,"default":true}] }]

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modifiers_snapshot jsonb DEFAULT '[]'::jsonb;
  -- snapshot ตัวเลือกที่ลูกค้าเลือก เช่น:
  -- [{"group_name":"ระดับความหวาน","option_name":"หวานน้อย","price_add":0}]

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modifier_price_add numeric(10,2) DEFAULT 0;
  -- ราคาเพิ่มจาก modifiers (เช่น +10 บาทสำหรับ topping)

-- ================================================================
-- MIGRATION: เพิ่ม payment columns ใน orders table ที่มีอยู่แล้ว
-- ================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method  text DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_amount numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount   numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS omise_charge_id text;

-- ================================================================
-- MIGRATION: material_stock — สินค้าที่แบ่งไว้เป็นวัตถุดิบ
-- stock = ทั้งหมด (ไม่เปลี่ยน)
-- material_stock = จำนวนที่โอนให้ครัว/บาร์
-- วางขาย = stock - material_stock
-- ================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_stock integer DEFAULT 0;

-- ================================================================
-- MIGRATION: โปรโมชั่น
-- promo_price = ราคาโปรโมชั่น (null = ไม่มีโปร)
-- promo_end   = วันสิ้นสุดโปรโมชั่น (null = ไม่มีโปร)
-- ================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_end   date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_type  text DEFAULT 'single';
  -- 'single' = ลดราคาต่อชิ้น (เช่น จาก 30 เหลือ 25)
  -- 'qty'    = ซื้อ N ชิ้นราคา Y (เช่น 2 ชิ้น 55 บาท)
  -- 'pair'   = ซื้อคู่กับสินค้าอื่น ราคาพิเศษ (เช่น โค้ก+น้ำแข็ง 35 บาท)
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_min_qty        integer DEFAULT 1;
  -- สำหรับ type='qty': ต้องซื้อกี่ชิ้นถึงได้ราคา promo_price
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_pair_product_id uuid;
  -- สำหรับ type='pair': UUID ของสินค้าคู่ที่ต้องซื้อร่วมกัน
