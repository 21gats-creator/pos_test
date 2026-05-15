-- ================================================================
-- Sample Cafe Products — หมวดหมู่ Cafe
-- รันใน Supabase Dashboard → SQL Editor
-- ================================================================

-- ── วัตถุดิบ Cafe (material) ─────────────────────────────────────
-- สต็อก = 1 หมายถึง "มี 1 ล็อต/ถุง/กล่อง" ให้พนักงานจัดการเองในหลังบ้าน

INSERT INTO products (name, category, selling_price, cost_price, stock, product_type)
VALUES
  ('ไข่มุก',        'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('ผงบุก',         'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('ครีมซีส',       'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('ผงชาไทย',       'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('ผงชาเขียว',     'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('ผงมัทฉะ',       'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('กาแฟ (เมล็ด)',  'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('น้ำตาล',        'Cafe - วัตถุดิบ', 0, 0, 1, 'material'),
  ('นมสด',          'Cafe - วัตถุดิบ', 0, 0, 1, 'material');


-- ── เครื่องดื่ม Cafe (product + modifiers) ──────────────────────
-- Modifiers ทุกตัวมี: ระดับความหวาน (required) + ท็อปปิ้ง (optional)

INSERT INTO products (name, category, selling_price, cost_price, stock, product_type, modifiers)
VALUES

('ชาไทย', 'Cafe', 35, 12, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single",
   "options":[
     {"id":"s0","name":"0%","price_add":0,"default":false},
     {"id":"s25","name":"25%","price_add":0,"default":false},
     {"id":"s50","name":"50%","price_add":0,"default":true},
     {"id":"s75","name":"75%","price_add":0,"default":false},
     {"id":"s100","name":"100%","price_add":0,"default":false}
   ]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi",
   "options":[
     {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
     {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
     {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}
   ]}
]'::jsonb),

('กาแฟเย็น', 'Cafe', 40, 15, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single",
   "options":[
     {"id":"s0","name":"0%","price_add":0,"default":false},
     {"id":"s25","name":"25%","price_add":0,"default":false},
     {"id":"s50","name":"50%","price_add":0,"default":true},
     {"id":"s75","name":"75%","price_add":0,"default":false},
     {"id":"s100","name":"100%","price_add":0,"default":false}
   ]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi",
   "options":[
     {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
     {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
     {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}
   ]}
]'::jsonb),

('ชาเขียวนมสด', 'Cafe', 40, 14, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single",
   "options":[
     {"id":"s0","name":"0%","price_add":0,"default":false},
     {"id":"s25","name":"25%","price_add":0,"default":false},
     {"id":"s50","name":"50%","price_add":0,"default":true},
     {"id":"s75","name":"75%","price_add":0,"default":false},
     {"id":"s100","name":"100%","price_add":0,"default":false}
   ]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi",
   "options":[
     {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
     {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
     {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}
   ]}
]'::jsonb),

('มัทฉะลาเต้', 'Cafe', 55, 20, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single",
   "options":[
     {"id":"s0","name":"0%","price_add":0,"default":false},
     {"id":"s25","name":"25%","price_add":0,"default":false},
     {"id":"s50","name":"50%","price_add":0,"default":true},
     {"id":"s75","name":"75%","price_add":0,"default":false},
     {"id":"s100","name":"100%","price_add":0,"default":false}
   ]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi",
   "options":[
     {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
     {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
     {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}
   ]}
]'::jsonb),

('โอเลี้ยง', 'Cafe', 30, 10, 99, 'product', '[
  {"id":"sugar","name":"ระดับความหวาน","required":true,"type":"single",
   "options":[
     {"id":"s0","name":"0%","price_add":0,"default":false},
     {"id":"s25","name":"25%","price_add":0,"default":false},
     {"id":"s50","name":"50%","price_add":0,"default":true},
     {"id":"s75","name":"75%","price_add":0,"default":false},
     {"id":"s100","name":"100%","price_add":0,"default":false}
   ]},
  {"id":"topping","name":"ท็อปปิ้ง","required":false,"type":"multi",
   "options":[
     {"id":"t1","name":"ไข่มุก","price_add":15,"default":false},
     {"id":"t2","name":"ผงบุก","price_add":15,"default":false},
     {"id":"t3","name":"ครีมซีส","price_add":20,"default":false}
   ]}
]'::jsonb);

-- ================================================================
-- วิธีใช้:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Copy ทั้งหมดด้านบน → Paste → Run
-- 3. กลับหน้าร้าน → กด F5 → สินค้า Cafe จะปรากฏ
--
-- หมายเหตุ: stock = 99 สำหรับเครื่องดื่ม หมายความว่า "ไม่จำกัด"
-- ถ้าต้องการสต็อกจริง ให้แก้ตัวเลขตามต้องการ
-- ================================================================
