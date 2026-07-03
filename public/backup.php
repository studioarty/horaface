<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data) {
        $backupDir = dirname(__DIR__) . '/backups';
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        $backupFile = $backupDir . '/time_records_backup.json';
        
        // Caso de gravação da Chave de Segurança
        if (isset($data['type']) && $data['type'] === 'save_key' && isset($data['key'])) {
            $keyFile = $backupDir . '/.key';
            file_put_contents($keyFile, trim($data['key']));
            echo json_encode(["success" => true, "message" => "Chave de seguranca salva com sucesso."]);
            exit;
        }
        
        $existing = [];
        if (file_exists($backupFile)) {
            $existingJson = file_get_contents($backupFile);
            $existing = json_decode($existingJson, true) ?: [];
        }
        
        // Lote de registros (Sincronização em lote)
        if (isset($data['records']) && is_array($data['records'])) {
            foreach ($data['records'] as $record) {
                $recordId = $record['id'] ?? null;
                if ($recordId) {
                    $existing[$recordId] = $record;
                }
            }
            file_put_contents($backupFile, json_encode($existing, JSON_PRETTY_PRINT));
            echo json_encode(["success" => true, "message" => "Lote de backups salvo com sucesso."]);
            exit;
        }
        
        // Único registro (Check-in / Check-out)
        $recordId = $data['id'] ?? null;
        if ($recordId) {
            $existing[$recordId] = $data;
            file_put_contents($backupFile, json_encode($existing, JSON_PRETTY_PRINT));
            echo json_encode(["success" => true, "message" => "Backup salvo com sucesso."]);
            exit;
        }
    }
}
echo json_encode(["success" => false, "message" => "Request inválido."]);
