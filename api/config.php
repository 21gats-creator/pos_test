<?php
// ╔══════════════════════════════════════════════════════════════╗
// ║          api/config.php — Backend Configuration              ║
// ║  เก็บ Secret Key ฝั่ง server เท่านั้น — ห้ามใส่ใน frontend  ║
// ║  ดู KEY ได้ที่: https://dashboard.omise.co → API Keys        ║
// ╚══════════════════════════════════════════════════════════════╝

// ── Omise Keys (ห้ามใส่ใน env.js หรือ frontend ใดๆ) ─────────
// TEST:  skey_test_...   LIVE: skey_live_...
define('OMISE_SECRET_KEY', getenv('OMISE_SECRET_KEY') ?: 'skey_test_xxxxxxxxxxxxxxxxxxxxxxxx');
define('OMISE_PUBLIC_KEY', getenv('OMISE_PUBLIC_KEY') ?: 'pkey_test_xxxxxxxxxxxxxxxxxxxxxxxx');

define('OMISE_CONFIGURED', strpos(OMISE_SECRET_KEY, 'xxxxxxxx') === false
                        && strpos(OMISE_SECRET_KEY, 'skey_') === 0);
