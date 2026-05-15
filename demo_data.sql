-- ================================================================
-- DEMO DATA — ล้างข้อมูลเก่าและใส่ข้อมูลทดสอบ
-- รันใน: Supabase Dashboard → SQL Editor
--
-- ⚠️  คำเตือน: ลบข้อมูลทั้งหมดก่อนใส่ใหม่!
-- ================================================================

-- ── ล้างข้อมูลทั้งหมด (เรียงตาม FK) ──────────────────────────
TRUNCATE TABLE order_items, stock_history, orders, products RESTART IDENTITY CASCADE;


-- ================================================================
-- หมวด: Cafe - วัตถุดิบ (product_type = 'material')
-- ================================================================
INSERT INTO products (name, category, selling_price, cost_price, stock, product_type) VALUES
  ('ไข่มุก',         'Cafe - วัตถุดิบ', 0, 0, 5,  'material'),
  ('ผงบุก',          'Cafe - วัตถุดิบ', 0, 0, 3,  'material'),
  ('ครีมซีส',        'Cafe - วัตถุดิบ', 0, 0, 4,  'material'),
  ('ผงชาไทย',        'Cafe - วัตถุดิบ', 0, 0, 2,  'material'),
  ('ผงชาเขียว',      'Cafe - วัตถุดิบ', 0, 0, 2,  'material'),
  ('ผงมัทฉะ',        'Cafe - วัตถุดิบ', 0, 0, 1,  'material'),
  ('กาแฟ (เมล็ด)',   'Cafe - วัตถุดิบ', 0, 0, 3,  'material'),
  ('น้ำตาล',         'Cafe - วัตถุดิบ', 0, 0, 5,  'material'),
  ('นมสด',           'Cafe - วัตถุดิบ', 0, 0, 10, 'material');


-- ================================================================
-- หมวด: Cafe (เครื่องดื่ม พร้อม modifiers)
-- ================================================================
INSERT INTO products (name, category, selling_price, cost_price, stock, product_type, modifiers) VALUES

('ชาไทย', 'Cafe', 35, 12, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s25","name":"25%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s75","name":"75%","price_add":0,"default":false},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb),

('กาแฟเย็น', 'Cafe', 40, 15, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s25","name":"25%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s75","name":"75%","price_add":0,"default":false},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb),

('ชาเขียวนมสด', 'Cafe', 40, 14, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s25","name":"25%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s75","name":"75%","price_add":0,"default":false},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb),

('มัทฉะลาเต้', 'Cafe', 55, 20, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s25","name":"25%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s75","name":"75%","price_add":0,"default":false},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb),

('โอเลี้ยง', 'Cafe', 30, 10, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s25","name":"25%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s75","name":"75%","price_add":0,"default":false},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb),

('นมสดปั่น', 'Cafe', 45, 18, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single","options":[
    {"id":"s0","name":"0%","price_add":0,"default":false},
    {"id":"s50","name":"50%","price_add":0,"default":true},
    {"id":"s100","name":"100%","price_add":0,"default":false}]},
  {"id":"size","name":"ขนาด","required":true,"type":"single","options":[
    {"id":"m","name":"กลาง","price_add":0,"default":true},
    {"id":"l","name":"ใหญ่","price_add":10,"default":false}]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi","options":[
    {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
    {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
    {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}]}
]'::jsonb);


-- ================================================================
-- หมวด: เบเกอรี่
-- ================================================================
INSERT INTO products (name, category, selling_price, cost_price, stock, expiry_date) VALUES
  ('ครัวซองต์',        'เบเกอรี่', 35, 15, 12, CURRENT_DATE + INTERVAL '3 days'),
  ('ขนมปังกุนเชียง',  'เบเกอรี่', 25, 10, 18, CURRENT_DATE + INTERVAL '5 days'),
  ('เค้กช็อกโกแลต',   'เบเกอรี่', 55, 25,  3, CURRENT_DATE + INTERVAL '2 days'),  -- ใกล้หมด + ใกล้หมดอายุ
  ('มาการอง',          'เบเกอรี่', 25, 10, 24, CURRENT_DATE + INTERVAL '7 days'),
  ('คุกกี้ (แพ็ค)',    'เบเกอรี่', 60, 28, 15, CURRENT_DATE + INTERVAL '30 days'),
  ('บราวนี่',          'เบเกอรี่', 40, 18,  4, CURRENT_DATE + INTERVAL '4 days');


-- ================================================================
-- หมวด: เครื่องดื่ม (พร้อมดื่ม)
-- ================================================================
INSERT INTO products (name, sku, category, selling_price, cost_price, stock) VALUES
  ('น้ำเปล่า 600ml',   '8850329126398', 'เครื่องดื่ม', 10,  6, 48),
  ('โค้ก 325ml',       '5000112601809', 'เครื่องดื่ม', 20, 12, 24),
  ('สไปรท์ 325ml',     '5000112625997', 'เครื่องดื่ม', 20, 12, 18),
  ('เป๊ปซี่ 325ml',    '5000112630687', 'เครื่องดื่ม', 20, 12, 20),
  ('น้ำส้ม 100% 200ml','8850428005001', 'เครื่องดื่ม', 30, 18, 12),
  ('เยียร์กิ้น 325ml', '8851128009073', 'เครื่องดื่ม', 25, 14, 15);


-- ================================================================
-- หมวด: นม / ของสด
-- (นมข้นหวานเป็น "สินค้า" แต่ใช้เป็นวัตถุดิบได้ด้วย)
-- ================================================================
INSERT INTO products (name, sku, category, selling_price, cost_price, stock, expiry_date) VALUES
  ('นมข้นหวาน (กระป๋อง)', '8850999012345', 'นม / ของสด', 28, 18, 24, CURRENT_DATE + INTERVAL '180 days'),
  ('โอเล่ UHT 200ml',     '8851010003213', 'นม / ของสด', 18, 10, 36, CURRENT_DATE + INTERVAL '60 days'),
  ('โยเกิร์ต สตรอว์เบอรี','8850123456789', 'นม / ของสด', 35, 20,  2, CURRENT_DATE + INTERVAL '6 days');  -- ใกล้หมด + ใกล้หมดอายุ


-- ================================================================
-- หมวด: ขนมขบเคี้ยว
-- ================================================================
INSERT INTO products (name, sku, category, selling_price, cost_price, stock) VALUES
  ('เลย์ ออริจินัล',    '8850225002148', 'ขนมขบเคี้ยว', 30, 20, 20),
  ('โอเรโอ (แพ็ค)',     '7622201174767', 'ขนมขบเคี้ยว', 45, 30, 12),
  ('ลูกอมฮอล์ล',        '8888993012345', 'ขนมขบเคี้ยว',  5,  2, 60),
  ('บิสกิต ไส้ครีม',    '8851234567890', 'ขนมขบเคี้ยว', 20, 13, 18),
  ('ป็อปคอร์น (ถุง)',    '8850000012345', 'ขนมขบเคี้ยว', 35, 22,  8);


-- ================================================================
-- ตั้ง material_stock ตัวอย่าง: นมข้นหวาน — มี 24 อัน ใช้เป็น
-- วัตถุดิบ Cafe ไปแล้ว 2 อัน เหลือขาย 22 อัน
-- ================================================================
UPDATE products
SET material_stock = 2
WHERE name = 'นมข้นหวาน (กระป๋อง)' AND category = 'นม / ของสด';

-- บันทึก stock_history สำหรับ material transfer ด้านบน
INSERT INTO stock_history (product_id, amount, note, expiry_date)
SELECT id, -2, 'โอนเป็นวัตถุดิบ Cafe — เปิดขวดแล้ว', CURRENT_DATE + INTERVAL '14 days'
FROM products WHERE name = 'นมข้นหวาน (กระป๋อง)' AND category = 'นม / ของสด';

-- ================================================================
-- สรุปสินค้าที่จะได้หลัง import:
--   Cafe (เครื่องดื่ม)    6 รายการ  → มี modifier ระดับหวาน + ท็อปปิ้ง
--   Cafe - วัตถุดิบ       9 รายการ  → วัตถุดิบที่ใช้ในบาร์
--   เบเกอรี่              6 รายการ  → มีวันหมดอายุ (บางอันใกล้หมด!)
--   เครื่องดื่ม            6 รายการ  → มีบาร์โค้ด SKU
--   นม / ของสด            3 รายการ  → นมข้นหวานใช้ได้ทั้งขายและวัตถุดิบ
--   ขนมขบเคี้ยว           5 รายการ
--   รวม: 35 รายการ
-- ================================================================
