<?php
// ════════════════════════════════════════════════════════
// Omise Payment API Handler
// Endpoints:
//   POST /api/omise_payment.php?action=create   → สร้าง PromptPay charge
//   GET  /api/omise_payment.php?action=status&charge_id=xxx → check status
// ════════════════════════════════════════════════════════

ob_start(); // กัน PHP warning/notice หลุดออกมาก่อน header

// ── CORS & Content-Type ────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

// ── Suppress display errors; log to file ──────────────
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/omise_errors.log');

ob_clean(); // ล้าง output ที่ config.php อาจปล่อยออกมา

require_once __DIR__ . '/config.php';

// ── Routing ───────────────────────────────────────────
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create': createCharge();   break;
        case 'status': checkStatus();    break;
        case 'expire': expireCharge();   break;
        default:       sendJson(['error' => 'invalid_action: ' . $action], 400);
    }
} catch (Throwable $e) {
    error_log('[Omise] Uncaught: ' . $e->getMessage());
    sendJson(['error' => 'server_error: ' . $e->getMessage()], 500);
}

// ════════════════════════════════════════════════════════
// ACTION: สร้าง PromptPay Charge
// ════════════════════════════════════════════════════════
function createCharge(): void
{
    if (!OMISE_CONFIGURED) {
        sendJson(['error' => 'Omise keys not set — edit api/config.php'], 503);
    }

    // อ่าน JSON body
    $raw   = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if ($input === null) {
        sendJson(['error' => 'invalid_json_body: ' . json_last_error_msg()], 400);
    }

    $amountBaht   = (float)($input['amount'] ?? 0);
    $amountSatang = (int)round($amountBaht * 100);

    if ($amountSatang < 100) {
        sendJson(['error' => "ยอดเงินต้องไม่น้อยกว่า 1 บาท (ได้รับ: {$amountBaht})"], 400);
    }

    // ── เรียก Omise API: สร้าง PromptPay charge ───────
    [$body, $code] = omiseCurl('POST', 'https://api.omise.co/charges', [
        'amount'       => $amountSatang,
        'currency'     => 'thb',
        'source[type]' => 'promptpay',
    ]);

    $data = json_decode($body, true);

    if ($code !== 200 || empty($data['id'])) {
        $msg = $data['message'] ?? $data['code'] ?? 'omise_api_error';
        error_log("[Omise] Charge failed [{$code}]: {$body}");
        sendJson(['error' => "Omise: {$msg}", 'http_code' => $code], 502);
    }

    // ── Download QR image → base64 data URI ──────────
    $qrUri    = $data['source']['scannable_code']['image']['download_uri'] ?? null;
    $qrBase64 = $qrUri ? downloadQrAsBase64($qrUri) : null;

    sendJson([
        'success'   => true,
        'charge_id' => $data['id'],
        'status'    => $data['status'] ?? 'pending',
        'amount'    => $amountBaht,
        'qr_image'  => $qrBase64,  // data:image/png;base64,...  ← ส่งตรงให้ <img src>
    ]);
}

// ════════════════════════════════════════════════════════
// ACTION: ตรวจสอบสถานะ Payment
// ════════════════════════════════════════════════════════
function checkStatus(): void
{
    if (!OMISE_CONFIGURED) {
        sendJson(['paid' => false, 'status' => 'not_configured']);
    }

    $chargeId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['charge_id'] ?? '');
    if (!$chargeId) {
        sendJson(['error' => 'missing charge_id'], 400);
    }

    [$body, $code] = omiseCurl('GET', "https://api.omise.co/charges/{$chargeId}");
    $data   = json_decode($body, true);
    $status = $data['status'] ?? 'unknown';

    sendJson([
        'paid'      => $status === 'successful',
        'status'    => $status,
        'charge_id' => $chargeId,
    ]);
}

// ════════════════════════════════════════════════════════
// ACTION: ยกเลิก (expire) Charge ทันที
// ════════════════════════════════════════════════════════
function expireCharge(): void
{
    if (!OMISE_CONFIGURED) {
        sendJson(['error' => 'not_configured'], 503);
    }

    $raw      = file_get_contents('php://input');
    $input    = json_decode($raw, true);
    $chargeId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['charge_id'] ?? '');

    if (!$chargeId) {
        sendJson(['error' => 'missing charge_id'], 400);
    }

    [$body, $code] = omiseCurl('POST', "https://api.omise.co/charges/{$chargeId}/expire");
    $data = json_decode($body, true);

    if ($code !== 200) {
        $msg = $data['message'] ?? $data['code'] ?? 'expire_failed';
        error_log("[Omise] Expire failed [{$code}]: {$body}");
        sendJson(['error' => "Omise: {$msg}", 'http_code' => $code], 502);
    }

    sendJson(['success' => true, 'status' => $data['status'] ?? 'expired']);
}

// ════════════════════════════════════════════════════════
// HELPER: cURL wrapper สำหรับ Omise API
// ════════════════════════════════════════════════════════
function omiseCurl(string $method, string $url, array $fields = []): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('cURL not enabled — enable extension=curl in php.ini');
    }

    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        // SSL: เปิด verify ในระบบ production จริง
        // ถ้า XAMPP ใหม่ certificate ปกติ ไม่ต้องปิด
        // CURLOPT_SSL_VERIFYPEER => false,
    ];

    if ($method === 'POST') {
        $opts[CURLOPT_POST]       = true;
        $opts[CURLOPT_POSTFIELDS] = http_build_query($fields);
    }

    curl_setopt_array($ch, $opts);

    $body    = curl_exec($ch);
    $code    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errNo   = curl_errno($ch);
    $errMsg  = curl_error($ch);
    curl_close($ch);

    if ($errNo !== 0) {
        throw new RuntimeException("cURL error #{$errNo}: {$errMsg}");
    }

    return [$body, $code];
}

// ════════════════════════════════════════════════════════
// HELPER: Download QR image จาก Omise → base64 data URI
// (Omise download_uri ต้องการ Basic Auth ดังนั้นต้อง proxy ผ่าน PHP)
// ════════════════════════════════════════════════════════
function downloadQrAsBase64(string $uri): ?string
{
    if (!function_exists('curl_init')) return null;

    $ch = curl_init($uri);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => OMISE_SECRET_KEY . ':',
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 15,
        // CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $imgData     = curl_exec($ch);
    $code        = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/png';
    curl_close($ch);

    if ($code !== 200 || !$imgData) {
        error_log("[Omise] QR download failed [{$code}]: {$uri}");
        return null;
    }

    // ตัด charset ออกจาก Content-Type เช่น "image/png; charset=utf-8"
    $mime = trim(explode(';', $contentType)[0]) ?: 'image/png';

    return "data:{$mime};base64," . base64_encode($imgData);
}

// ════════════════════════════════════════════════════════
// HELPER: Send JSON response
// ════════════════════════════════════════════════════════
function sendJson(array $data, int $code = 200): void
{
    ob_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
