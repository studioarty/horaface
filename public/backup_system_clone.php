<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Backup-Key");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Security check (same as restore_backup.php)
$backupDir = dirname(__DIR__) . '/backups';
$keyFile = $backupDir . '/.key';

if (!file_exists($keyFile)) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["success" => false, "message" => "Chave de seguranca nao configurada no servidor."]);
    exit;
}

$providedKey = $_GET['key'] ?? '';
$savedKey = trim(file_get_contents($keyFile));

if (empty($savedKey) || $providedKey !== $savedKey) {
    http_response_code(401);
    header("Content-Type: application/json");
    echo json_encode(["success" => false, "message" => "Chave de seguranca invalida ou ausente."]);
    exit;
}

// 2. Setup ZIP generation
$zipFilename = 'pontoface_clone_' . date('Y-m-d_H-i-s') . '.zip';
$tempZipPath = sys_get_temp_dir() . '/' . $zipFilename;

$zip = new ZipArchive();
if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["success" => false, "message" => "Nao foi possivel criar o arquivo ZIP no servidor."]);
    exit;
}

// Get the public directory (where this script resides)
$sourceDir = __DIR__;

// Iterate and add all files recursively
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($sourceDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $name => $file) {
    if (!$file->isDir()) {
        $filePath = $file->getRealPath();
        
        // Calculate relative path inside the zip file
        $relativePath = substr($filePath, strlen($sourceDir) + 1);
        
        // Exclude the script itself from backup if desired, or keep it. Let's keep it so they have backup functionality!
        // But exclude any temporary zip files in the same directory just in case
        if (pathinfo($filePath, PATHINFO_EXTENSION) === 'zip') {
            continue;
        }
        
        $zip->addFile($filePath, $relativePath);
    }
}

$zip->close();

// 3. Output ZIP file to browser
if (file_exists($tempZipPath)) {
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
    header('Content-Length: ' . filesize($tempZipPath));
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Clean output buffer to prevent corrupted zip file
    ob_clean();
    flush();
    
    readfile($tempZipPath);
    
    // Delete temp file after streaming
    unlink($tempZipPath);
    exit;
} else {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["success" => false, "message" => "Erro ao gerar arquivo ZIP."]);
    exit;
}
