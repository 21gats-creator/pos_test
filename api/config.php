<?php
// ╔══════════════════════════════════════════════════════════════╗
// ║          api/config.php — Backend Configuration              ║
// ║                                                              ║
// ║  สำหรับ Secret Key ของ Omise เท่านั้น                       ║
// ║  ดูคู่กับ env.js สำหรับ config ฝั่ง frontend                 ║
// ║                                                              ║
// ║  ดู KEY ได้ที่: https://dashboard.omise.co → API Keys        ║
// ║  TEST:  skey_test_...   LIVE: skey_live_...                  ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Omise Secret Key (ห้ามใส่ใน env.js หรือ frontend ใดๆ) ───
define('OMISE_SECRET_KEY', getenv('OMISE_SECRET_KEY') ?: 'skey_test_67oozc6tp14390get0c');
define('OMISE_PUBLIC_KEY', getenv('OMISE_PUBLIC_KEY') ?: 'pkey_test_67oozc6blsaeyfct9ut');

// ตรวจสอบว่า key ถูกตั้งค่าแล้วหรือยัง (รองรับ PHP 7.x ด้วย strpos)
define('OMISE_CONFIGURED', strpos(OMISE_SECRET_KEY, 'ใส่ key') === false
                        && strpos(OMISE_SECRET_KEY, 'skey_') === 0);
