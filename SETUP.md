# คู่มือติดตั้งและตั้งค่า ระบบ POS

## ไฟล์ที่ต้องแก้เมื่อย้ายเครื่องหรือเปลี่ยน Key

| ไฟล์ | สิ่งที่ต้องแก้ |
|------|--------------|
| `env.js` | ชื่อร้าน, Supabase URL+Key, Omise Public Key, PIN, ค่าต่างๆ |
| `api/config.php` | Omise **Secret** Key + Gemini API Key (ห้ามใส่ใน frontend) |

> **สรุป: แก้ 2 ไฟล์ก็พอ**

---

## ขั้นตอนที่ 1 — ติดตั้ง Software

### สิ่งที่ต้องมี

| Software | ดาวน์โหลด | หมายเหตุ |
|----------|-----------|---------|
| XAMPP | https://www.apachefriends.org | เลือก PHP 8.x |
| Browser | Chrome / Edge | ใช้ทดสอบ |

### วิธีติดตั้ง XAMPP

1. ดาวน์โหลดและติดตั้ง XAMPP
2. เปิด **XAMPP Control Panel**
3. กด **Start** ที่แถว **Apache**
4. สถานะต้องเป็น **Running** (สีเขียว)

---

## ขั้นตอนที่ 2 — วางไฟล์โปรเจกต์

```
C:\xampp\htdocs\pos_Gemini\     ← วางโฟลเดอร์ทั้งหมดที่นี่
├── env.js                       ← แก้ที่นี่ (frontend config)
├── api\
│   └── config.php               ← แก้ที่นี่ (backend config / Omise secret)
├── index.html                   ← หน้าร้าน (POS)
├── dashboard.html               ← หลังร้าน
├── add.html                     ← รับเข้าสินค้า
└── ...
```

---

## ขั้นตอนที่ 3 — ตั้งค่า Supabase

### สร้าง Supabase Project (ครั้งแรก)

1. ไปที่ https://supabase.com → **Sign In** → **New Project**
2. ตั้งชื่อ Project → เลือก Region **Southeast Asia (Singapore)**
3. รอ Project สร้าง (~2 นาที)

### รัน SQL Migration

1. ใน Supabase Dashboard → เลือก **SQL Editor** (ไอคอน `</>`)
2. เปิดไฟล์ `scheme.sql` ในโปรเจกต์
3. Copy ทั้งหมด → Paste ใน SQL Editor → **Run**

### ดึง API Keys

1. Supabase Dashboard → **Settings** (ไอคอนเฟือง) → **API**
2. Copy ค่าต่อไปนี้:
   - **Project URL** → ใส่ใน `env.js` ช่อง `SUPABASE_URL`
   - **anon public** → ใส่ใน `env.js` ช่อง `SUPABASE_ANON_KEY`

---

## ขั้นตอนที่ 4 — ตั้งค่า Omise (PromptPay QR)

### สมัคร Omise

1. ไปที่ https://www.omise.co/th → **เริ่มต้นใช้งาน**
2. กรอกข้อมูลร้าน → ยืนยันอีเมล

### ดึง API Keys

1. Omise Dashboard → **Settings** → **API Keys**
2. Copy ค่าต่อไปนี้:

| Key | ไปใส่ที่ |
|-----|---------|
| **Public Key** (`pkey_test_...`) | `env.js` → `OMISE_PUBLIC_KEY` |
| **Secret Key** (`skey_test_...`) | `api/config.php` → บรรทัด `OMISE_SECRET_KEY` |

> ⚠️ Secret Key ห้ามใส่ใน `env.js` หรือ code ฝั่ง frontend เด็ดขาด

---

## ขั้นตอนที่ 5 — แก้ไขไฟล์ Config

### `env.js` — แก้ทุกอย่างในไฟล์นี้

```javascript
window.ENV = {
    // ชื่อร้าน (แสดงบนใบเสร็จ)
    SHOP_NAME: 'ร้านของฉัน',

    // Supabase (จาก Supabase Dashboard → Settings → API)
    SUPABASE_URL:      'https://XXXXX.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGci...',

    // Omise Public Key เท่านั้น
    OMISE_PUBLIC_KEY: 'pkey_test_XXXXX',

    // PIN ยกเลิก Order
    VOID_PIN: '1234',
};
```

### `api/config.php` — แก้เฉพาะ Secret Key

```php
define('OMISE_SECRET_KEY', 'skey_test_XXXXX');   // ← แก้ตรงนี้
define('OMISE_PUBLIC_KEY', 'pkey_test_XXXXX');   // ← แก้ตรงนี้
```

---

## ขั้นตอนที่ 6 — เปิดระบบ

1. เปิด XAMPP → Start **Apache**
2. เปิด Browser → ไปที่:

```
http://localhost/pos_Gemini/
```

> ❌ ห้ามเปิดผ่าน `file:///C:/xampp/...` — ระบบ PHP จะไม่ทำงาน

---

## ขั้นตอนที่ 7 — ทดสอบระบบ

### ทดสอบ PHP และ Omise

เปิด Browser → ไปที่:
```
http://localhost/pos_Gemini/api/test.php
```

ต้องได้ผลลัพธ์แบบนี้:
```json
{
  "status": "ok",
  "curl_enabled": true,
  "curl_omise_reach": true,
  "omise_configured": true
}
```

ถ้า `curl_enabled: false` → เปิด XAMPP PHP Manager → เปิด `php_curl`

### ทดสอบ PromptPay QR

1. เปิดหน้าร้าน → เพิ่มสินค้าลงตะกร้า → **รับเงิน**
2. เลือก **PromptPay QR**
3. QR Code ต้องปรากฏขึ้นมา

---

## การย้ายไปเครื่องใหม่ — Checklist

```
[ ] ติดตั้ง XAMPP บนเครื่องใหม่
[ ] Copy โฟลเดอร์ pos_Gemini → C:\xampp\htdocs\
[ ] เปิด XAMPP → Start Apache
[ ] เปิด http://localhost/pos_Gemini/api/test.php ตรวจสอบ
[ ] ถ้า Supabase project เดิม → ไม่ต้องแก้ env.js
[ ] ถ้า Supabase project ใหม่ → แก้ env.js (URL + Key)
[ ] ถ้าเปลี่ยน Omise key → แก้ env.js + api/config.php
```

---

## การเปลี่ยนจาก TEST → LIVE Mode

### Omise

1. Omise Dashboard → เปลี่ยน toggle **Test/Live**
2. Copy **Live Public Key** (`pkey_live_...`) → ใส่ใน `env.js`
3. Copy **Live Secret Key** (`skey_live_...`) → ใส่ใน `api/config.php`

### Supabase

ไม่มีโหมด test/live — ใช้ Project เดียวได้เลย

---

## ฟีเจอร์ใหม่ — AI วิเคราะห์ยอดขาย (Gemini AI)

### วิธีใช้
1. เปิด `dashboard.html` → ดูแถบสีม่วง **"🤖 วิเคราะห์ยอดขายด้วย AI"**
2. กด **"✨ วิเคราะห์ตอนนี้"**
3. รอประมาณ 5-10 วินาที — AI จะวิเคราะห์และตอบเป็นภาษาไทย

### AI วิเคราะห์อะไรบ้าง
- 🏆 สินค้าขายดี 3-5 รายการแรก
- 🐌 สินค้าขายช้า (แนะนำวิธีจัดการ)
- 📦 สต็อกที่ควรเติม (เร่งด่วน)
- ⏰ ช่วงเวลาที่ขายดีที่สุด
- 📈 แนวโน้มรายได้ (7 วันล่าสุด)
- ⚠️ สินค้าที่อาจขาดทุน (ราคาขาย ≤ ราคาทุน)
- 💡 คำแนะนำพิเศษ 2-3 ข้อ

### ตั้งค่า Gemini API Key
1. ไปที่ https://aistudio.google.com/app/apikey → สร้าง API Key ฟรี
2. เปิด `api/config.php` → แก้บรรทัด:
```php
define('GEMINI_API_KEY', 'AIzaSy...your_key_here...');
```
> ⚠️ **ห้ามใส่ Gemini API Key ใน `env.js` หรือ code ฝั่ง frontend เด็ดขาด**

### ข้อจำกัด
- ต้องเปิดจาก `http://localhost/` (ต้องการ PHP/XAMPP เหมือน PromptPay)
- ถ้าใช้บน GitHub Pages ต้องตั้ง `PROMPTPAY_API_BASE` ใน `env.js` ให้ชี้ไปที่ XAMPP

---

## ฟีเจอร์ใหม่ — รีเซ็ตข้อมูล (สำหรับส่งมอบระบบ)

### วิธีใช้
1. เปิด `dashboard.html` → แท็บ **📦 สินค้า**
2. กดปุ่ม **"🗑️ รีเซ็ตข้อมูล"** (ปุ่มสีแดงอ่อน)
3. กรอก PIN (ค่าเริ่มต้น: `1234` หรือตามที่ตั้งใน `env.js`)
4. ยืนยันอีกครั้ง → ข้อมูลทั้งหมดจะถูกลบ

### จะลบอะไรบ้าง
- ✅ สินค้าทั้งหมด (products)
- ✅ ใบเสร็จ/บิลทั้งหมด (orders + order_items)
- ✅ ประวัติสต็อกทั้งหมด (stock_history)
- ❌ **ไม่ลบ**: ตั้งค่า env.js, Supabase schema, API Keys

### ขั้นตอนส่งมอบระบบให้ร้านใหม่
```
[ ] กด รีเซ็ตข้อมูล → ใส่ PIN → ยืนยัน
[ ] แก้ env.js: ชื่อร้าน, VOID_PIN (เปลี่ยน PIN เป็น PIN ของร้านใหม่)
[ ] แก้ api/config.php: เปลี่ยน Omise Key (ถ้าใช้บัญชีต่างกัน)
[ ] ให้ลูกค้าเพิ่มสินค้าของตัวเองผ่าน add.html / cafe.html
[ ] ทดสอบ: เพิ่มสินค้า → ขาย → ดูบิล
```

---

## โครงสร้างไฟล์ทั้งหมด

```
pos_Gemini/
├── env.js              ← ⭐ ตั้งค่า frontend ทั้งหมด (แก้ที่นี่)
├── api/
│   ├── config.php      ← ⭐ Secret Keys ทั้งหมด (Omise + Gemini)
│   ├── gemini.php      ← 🤖 AI วิเคราะห์ยอดขาย proxy
│   ├── omise_payment.php   ← สร้าง PromptPay charge / ตรวจสถานะ
│   ├── webhook.php     ← รับ webhook จาก Omise (ต้องมี public URL)
│   └── test.php        ← ทดสอบระบบ PHP + Omise
├── index.html          ← หน้าร้าน (POS หลัก)
├── app.js              ← Logic ฝั่งหน้าร้าน
├── dashboard.html      ← หลังร้าน (ดูยอด / จัดการสต็อก / AI)
├── cafe.html           ← จัดการเมนู Cafe + วัตถุดิบ
├── add.html            ← รับเข้าสินค้าทั่วไป
├── style.css           ← CSS ทั้งหมด
├── scheme.sql          ← Database schema (รันใน Supabase SQL Editor)
├── demo_data.sql       ← ข้อมูลตัวอย่าง 35 รายการ (รันเพื่อทดสอบ)
└── sample_cafe.sql     ← ตัวอย่างสินค้า Cafe พร้อม modifiers
```

---

## PromptPay บน GitHub Pages

PromptPay ต้องการ PHP (XAMPP) — **ไม่สามารถใช้บน GitHub Pages** ได้โดยตรง

| สถานการณ์ | วิธีแก้ |
|-----------|---------|
| เปิดจาก `http://localhost/pos_Gemini/` | ใช้งานได้ปกติ ไม่ต้องแก้ |
| เปิดจาก GitHub Pages (github.io) | ตั้งค่า `PROMPTPAY_API_BASE` ใน `env.js` ให้ชี้ไปที่เครื่อง XAMPP |
| XAMPP บน LAN เดียวกัน | `PROMPTPAY_API_BASE: 'http://192.168.1.x/pos_Gemini'` |
| XAMPP ไม่อยู่บน LAN เดียวกัน | ใช้ ngrok / cloudflare tunnel เพื่อ expose XAMPP |

---

## ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | แก้ไข |
|-------|--------|-------|
| หน้าเว็บไม่โหลด | Apache ไม่รัน | เปิด XAMPP → Start Apache |
| PromptPay: "failed to fetch" | เปิดผ่าน file:// | เปิดผ่าน http://localhost/ |
| QR ไม่แสดง | cURL SSL error | เปิด `CURLOPT_SSL_VERIFYPEER => false` ใน omise_payment.php |
| Supabase error | Key ผิด | ตรวจสอบ env.js SUPABASE_URL และ ANON_KEY |
| PIN ยกเลิก Order ไม่ถูก | ใช้ PIN เก่า | แก้ VOID_PIN ใน env.js |
| สินค้าไม่โหลด | Supabase ไม่ได้รัน Migration | รัน scheme.sql ใน Supabase SQL Editor |
| AI วิเคราะห์ไม่ได้ | เปิดผ่าน file:// หรือ GitHub Pages | ต้องเปิดจาก http://localhost/ (ต้องการ PHP) |
| AI error: "API key not configured" | ยังไม่ได้ใส่ Gemini Key | แก้ `api/config.php` → ใส่ GEMINI_API_KEY |
| รีเซ็ตข้อมูลไม่สำเร็จ | Supabase RLS บล็อก | ตรวจสอบ Supabase → Table Editor → Policies |
