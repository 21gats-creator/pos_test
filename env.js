// ╔══════════════════════════════════════════════════════════════╗
// ║              env.js — ไฟล์ตั้งค่าหลักของระบบ POS            ║
// ║                                                              ║
// ║  แก้ไขที่นี่ที่เดียว เมื่อ:                                  ║
// ║    • ย้ายไปเครื่องใหม่                                        ║
// ║    • เปลี่ยน Supabase project                                ║
// ║    • เปลี่ยนจาก TEST → LIVE                                  ║
// ║    • เปลี่ยนชื่อร้าน / ข้อมูลร้าน                            ║
// ║                                                              ║
// ║  ⚠️  SECRET KEY ของ Omise ต้องอยู่ใน api/config.php เท่านั้น ║
// ╚══════════════════════════════════════════════════════════════╝

window.ENV = {

    // ══════════════════════════════════════════════
    // 🏪 ข้อมูลร้าน (แสดงบนใบเสร็จ)
    // ══════════════════════════════════════════════
    SHOP_NAME:     'ร้านจิปาถะ & เบเกอรี่',
    SHOP_ADDRESS:  '',          // ที่อยู่ร้าน (ไม่บังคับ)
    SHOP_PHONE:    '',          // เบอร์โทรร้าน (ไม่บังคับ)
    SHOP_FOOTER:   'ขอบคุณที่ใช้บริการ',

    // ══════════════════════════════════════════════
    // 🗄️  Supabase (ฐานข้อมูล)
    // ดูได้ที่: https://supabase.com
    //   → เลือก Project → Settings → API
    // ══════════════════════════════════════════════
    SUPABASE_URL:      'https://opdclzrurmkfzezanmgj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZGNsenJ1cm1rZnplemFubWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjU2NDcsImV4cCI6MjA5NDM0MTY0N30.VRnEOQGb4jjOkJLyFeGc1Hpch0MQAekjjxmSl9X1gnE',

    // ══════════════════════════════════════════════
    // 💳 Omise / Opn Payments (ระบบชำระเงิน PromptPay)
    // ดูได้ที่: https://dashboard.omise.co → Settings → API Keys
    //
    // PUBLIC KEY  → ใส่ที่นี่ได้ (ใช้ฝั่ง frontend)
    // SECRET KEY  → ต้องอยู่ใน api/config.php เท่านั้น (ห้ามใส่ตรงนี้)
    //
    // TEST Mode:  ขึ้นต้นด้วย pkey_test_ / skey_test_
    // LIVE Mode:  ขึ้นต้นด้วย pkey_live_ / skey_live_
    // ══════════════════════════════════════════════
    OMISE_PUBLIC_KEY: 'pkey_test_67oozc6blsaeyfct9ut',

    // ══════════════════════════════════════════════
    // 🔐 ความปลอดภัย
    // ══════════════════════════════════════════════
    VOID_PIN: '1234',           // PIN สำหรับยกเลิก Order ในหลังร้าน

    // ══════════════════════════════════════════════
    // 🌐 PromptPay API Backend
    // ══════════════════════════════════════════════
    // GitHub Pages / cloud → ใช้ OMISE_API_ENDPOINT (Supabase Edge Function)
    // XAMPP local เท่านั้น → ปล่อย OMISE_API_ENDPOINT ว่าง แล้วใช้ PROMPTPAY_API_BASE แทน
    //
    // วิธี deploy Edge Function (ทำครั้งเดียว):
    //   npm install -g supabase
    //   supabase login
    //   supabase link --project-ref opdclzrurmkfzezanmgj
    //   supabase secrets set OMISE_SECRET_KEY=skey_test_67oozc6tp14390get0c
    //   supabase functions deploy omise-payment --no-verify-jwt
    OMISE_API_ENDPOINT: 'https://opdclzrurmkfzezanmgj.supabase.co/functions/v1/omise-payment',

    // XAMPP local (เปิดด้วย http://localhost/) → ปล่อยว่างไว้
    PROMPTPAY_API_BASE: '',

    // ══════════════════════════════════════════════
    // ⚙️  ตั้งค่าระบบ
    // ══════════════════════════════════════════════
    LOW_STOCK_LIMIT:  5,        // แจ้งเตือนสต็อกต่ำ เมื่อน้อยกว่าค่านี้
    EXPIRY_WARN_DAYS: 7,        // แจ้งเตือนสินค้าใกล้หมดอายุ (จำนวนวัน)
};
