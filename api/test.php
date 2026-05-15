<?php
// ────────────────────────────────────────────────────────
// Health-check endpoint — เปิดผ่าน browser เพื่อ debug
// http://localhost/pos_Gemini/api/test.php
// ────────────────────────────────────────────────────────
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

ob_clean();

require_once __DIR__ . '/config.php';

// ทดสอบ curl ว่า connect Omise ได้ไหม (GET simple)
$curlOmise = false;
$curlError = '';
if (function_exists('curl_init')) {
    $ch = curl_init('https://api.omise.co');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_NOBODY         => true,
    ]);
    curl_exec($ch);
    $curlOmise = curl_getinfo($ch, CURLINFO_HTTP_CODE) > 0;
    $curlError = curl_error($ch);
    curl_close($ch);
}

echo json_encode([
    'status'            => 'ok',
    'php_version'       => phpversion(),
    'curl_enabled'      => function_exists('curl_init'),
    'curl_omise_reach'  => $curlOmise,
    'curl_error'        => $curlError ?: null,
    'omise_configured'  => OMISE_CONFIGURED,
    'secret_key_prefix' => substr(OMISE_SECRET_KEY, 0, 14) . '...',
    'timestamp'         => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
