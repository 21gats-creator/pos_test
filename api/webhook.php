<?php
// ════════════════════════════════════════════════════════
// Omise Webhook Handler
// URL: https://your-domain.com/pos_Gemini/api/webhook.php
//
// ตั้งใน Omise Dashboard → Settings → Webhooks
// สำหรับ localhost testing ใช้ ngrok:
//   ngrok http 80
//   แล้วเอา URL ไปตั้งใน Omise Dashboard
// ════════════════════════════════════════════════════════

ob_start();

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/webhook_events.log');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

ob_clean();

$rawBody = file_get_contents('php://input');
$event   = json_decode($rawBody, true);

if (!$event || !isset($event['key'])) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_payload']);
    exit;
}

// Log event for debugging
error_log('[Webhook] Event: ' . ($event['key'] ?? 'unknown') . ' — ' . date('Y-m-d H:i:s'));

// ── ตรวจสอบ Event ──────────────────────────────────────
$key    = $event['key']  ?? '';
$data   = $event['data'] ?? [];

switch ($key) {
    case 'charge.complete':
        handleChargeComplete($data);
        break;

    default:
        // Event อื่นๆ ไม่ต้อง handle แค่ respond 200
        break;
}

echo json_encode(['received' => true]);
exit;

// ════════════════════════════════════════════════════════
// เมื่อ charge สำเร็จ → log และสามารถ update DB ได้
// ════════════════════════════════════════════════════════
function handleChargeComplete(array $charge): void
{
    $chargeId = $charge['id']     ?? '';
    $status   = $charge['status'] ?? '';
    $amount   = ($charge['amount'] ?? 0) / 100; // satang → baht

    error_log("[Webhook] charge.complete: {$chargeId} status={$status} amount={$amount} THB");

    if ($status !== 'successful') {
        error_log("[Webhook] Charge not successful: {$status}");
        return;
    }

    // ถ้าต้องการ update Supabase จาก backend:
    // ใช้ Supabase REST API + Service Role Key (ไม่ใช่ anon key)
    // $supabaseUrl = 'https://xxx.supabase.co';
    // $serviceKey  = 'eyJ...';
    // updateOrderByChargeId($chargeId, $supabaseUrl, $serviceKey);
}
