<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Backup-Key");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$backupDir = dirname(__DIR__) . '/backups';
$keyFile = $backupDir . '/.key';
$backupFile = $backupDir . '/time_records_backup.json';

// Get key from headers
$headers = getallheaders();
$providedKey = $headers['X-Backup-Key'] ?? $headers['x-backup-key'] ?? '';

if (empty($providedKey)) {
    // Check if it's passed in query string as fallback (for direct browser downloads)
    $providedKey = $_GET['key'] ?? '';
}

if (!file_exists($keyFile)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Chave de seguranca nao configurada no servidor."]);
    exit;
}

$savedKey = trim(file_get_contents($keyFile));

if (empty($savedKey) || $providedKey !== $savedKey) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Chave de seguranca invalida."]);
    exit;
}

if (!file_exists($backupFile)) {
    echo json_encode(["success" => true, "records" => []]);
    exit;
}

$backupData = file_get_contents($backupFile);
$records = json_decode($backupData, true) ?: [];

// If user wants to download the file directly, we can check for download parameter
if (isset($_GET['download']) && $_GET['download'] === 'true') {
    header('Content-Disposition: attachment; filename="time_records_backup_' . date('Y-m-d_H-i-s') . '.json"');
    header('Content-Type: application/json');
    echo $backupData;
    exit;
}

echo json_encode(["success" => true, "records" => array_values($records)]);
