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
    SHOP_ADDRESS:  '',
    SHOP_PHONE:    '',
    SHOP_FOOTER:   'ขอบคุณที่ใช้บริการ',

    // ══════════════════════════════════════════════
    // 🗄️  Supabase (ฐานข้อมูล)
    // ดูได้ที่: https://supabase.com → Project → Settings → API
    // ══════════════════════════════════════════════
    SUPABASE_URL:      'https://opdclzrurmkfzezanmgj.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZGNsenJ1cm1rZnplemFubWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjU2NDcsImV4cCI6MjA5NDM0MTY0N30.VRnEOQGb4jjOkJLyFeGc1Hpch0MQAekjjxmSl9X1gnE',

    // ══════════════════════════════════════════════
    // 💳 Omise / Opn Payments (ระบบชำระเงิน PromptPay)
    // ดูได้ที่: https://dashboard.omise.co → Settings → API Keys
    // PUBLIC KEY เท่านั้น — SECRET KEY ต้องอยู่ใน api/config.php
    // ══════════════════════════════════════════════
    OMISE_PUBLIC_KEY: 'pkey_test_67oozc6blsaeyfct9ut',

    // ══════════════════════════════════════════════
    // 🔐 ความปลอดภัย
    // ══════════════════════════════════════════════
    VOID_PIN: '1234',

    // ══════════════════════════════════════════════
    // 🌐 PromptPay API Base URL
    // ══════════════════════════════════════════════
    // รันบน XAMPP (http://localhost/pos_Gemini/) → ปล่อยว่างไว้
    // รันบน GitHub Pages → ใส่ URL ของ backend
    PROMPTPAY_API_BASE: '',

    // ══════════════════════════════════════════════
    // ⚙️  ตั้งค่าระบบ
    // ══════════════════════════════════════════════
    LOW_STOCK_LIMIT:  5,
    EXPIRY_WARN_DAYS: 7,
};
