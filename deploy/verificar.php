<?php
/**
 * PontoFace - Verificador de Instalação
 * 
 * Coloque este arquivo na pasta public_html junto com os arquivos do build.
 * Acesse: https://seudominio.com/verificar.php
 * 
 * IMPORTANTE: Remova este arquivo após verificar a instalação!
 */

header('Content-Type: text/html; charset=utf-8');

$checks = [];
$allOk = true;

// 1. Verificar index.html
$indexExists = file_exists(__DIR__ . '/index.html');
$indexSize = $indexExists ? filesize(__DIR__ . '/index.html') : 0;
$checks[] = [
    'name' => 'index.html',
    'desc' => 'Arquivo principal da aplicação',
    'ok' => $indexExists && $indexSize > 500,
    'detail' => $indexExists 
        ? ($indexSize > 500 
            ? "OK - " . round($indexSize/1024, 1) . " KB (build de produção)" 
            : "ATENÇÃO - Apenas " . round($indexSize/1024, 1) . " KB. Pode ser o arquivo fonte, não o compilado. Execute 'npm run build' e envie os arquivos da pasta dist/")
        : "NÃO ENCONTRADO"
];
if (!$indexExists || $indexSize < 500) $allOk = false;

// 2. Verificar se é build de produção (contém referências a assets compilados)
$isBuild = false;
if ($indexExists) {
    $content = file_get_contents(__DIR__ . '/index.html');
    $isBuild = strpos($content, '/assets/') !== false || strpos($content, 'assets/') !== false;
}
$checks[] = [
    'name' => 'Build de Produção',
    'desc' => 'index.html referencia arquivos compilados em assets/',
    'ok' => $isBuild,
    'detail' => $isBuild 
        ? "OK - Referências a assets compilados encontradas" 
        : "ERRO - O index.html não referencia assets compilados. Você enviou o arquivo fonte em vez do build. Execute 'npm run build' e envie o conteúdo da pasta dist/"
];
if (!$isBuild) $allOk = false;

// 3. Verificar pasta assets
$assetsDir = __DIR__ . '/assets';
$assetsExist = is_dir($assetsDir);
$jsFiles = $assetsExist ? glob($assetsDir . '/*.js') : [];
$cssFiles = $assetsExist ? glob($assetsDir . '/*.css') : [];
$checks[] = [
    'name' => 'Pasta assets/',
    'desc' => 'Contém JavaScript e CSS compilados',
    'ok' => $assetsExist && count($jsFiles) > 0,
    'detail' => $assetsExist 
        ? count($jsFiles) . " arquivo(s) JS, " . count($cssFiles) . " arquivo(s) CSS" 
        : "NÃO ENCONTRADA - Envie a pasta assets/ que está dentro de dist/"
];
if (!$assetsExist || count($jsFiles) === 0) $allOk = false;

// 4. Verificar .htaccess
$htaccessExists = file_exists(__DIR__ . '/.htaccess');
$htaccessContent = $htaccessExists ? file_get_contents(__DIR__ . '/.htaccess') : '';
$htaccessHasRewrite = strpos($htaccessContent, 'RewriteEngine') !== false;
$checks[] = [
    'name' => '.htaccess',
    'desc' => 'Roteamento SPA (todas as rotas apontam para index.html)',
    'ok' => $htaccessExists && $htaccessHasRewrite,
    'detail' => $htaccessExists 
        ? ($htaccessHasRewrite ? "OK - Regras de rewrite ativas" : "ATENÇÃO - Não contém regras RewriteEngine")
        : "NÃO ENCONTRADO - O roteamento /login, /quiosque, etc. não funcionará. Copie o .htaccess da pasta dist/"
];
if (!$htaccessExists || !$htaccessHasRewrite) $allOk = false;

// 5. Verificar HTTPS
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
           (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
           (!empty($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
$checks[] = [
    'name' => 'HTTPS (SSL)',
    'desc' => 'Obrigatório para acesso à webcam nos quiosques',
    'ok' => $isHttps,
    'detail' => $isHttps 
        ? "OK - Conexão segura ativa" 
        : "ATENÇÃO - HTTPS não detectado. Ative o SSL gratuito no painel da Hostinger (Segurança → SSL). Sem HTTPS, a câmera do quiosque NÃO funcionará."
];
// HTTPS is warning, not blocking

// 6. Verificar mod_rewrite
$modRewrite = in_array('mod_rewrite', apache_get_modules() ?: []);
if (function_exists('apache_get_modules')) {
    $checks[] = [
        'name' => 'mod_rewrite (Apache)',
        'desc' => 'Módulo necessário para roteamento SPA',
        'ok' => $modRewrite,
        'detail' => $modRewrite ? "OK - Módulo ativo" : "ATENÇÃO - Módulo não detectado. Pode estar desabilitado."
    ];
} else {
    $checks[] = [
        'name' => 'mod_rewrite (Apache)',
        'desc' => 'Módulo necessário para roteamento SPA',
        'ok' => true,
        'detail' => "Não foi possível verificar (não é Apache ou função desabilitada). Se as rotas /login e /quiosque derem erro 404, o módulo pode estar desabilitado."
    ];
}

// 7. Verificar PHP version (informativo)
$checks[] = [
    'name' => 'PHP',
    'desc' => 'Versão do PHP no servidor',
    'ok' => true,
    'detail' => "PHP " . phpversion() . " (informativo - o PontoFace não requer PHP para funcionar)"
];

// 8. Verificar conectividade com backend
$backendUrl = null;
if ($indexExists && $isBuild) {
    foreach ($jsFiles as $jsFile) {
        $jsContent = file_get_contents($jsFile);
        if (preg_match('/https:\/\/[a-z0-9]+\.backend\.onspace\.ai/', $jsContent, $matches)) {
            $backendUrl = $matches[0];
            break;
        }
    }
}
if ($backendUrl) {
    $ch = curl_init($backendUrl . '/rest/v1/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $backendOk = $httpCode > 0 && $httpCode < 500;
    $checks[] = [
        'name' => 'Backend (OnSpace Cloud)',
        'desc' => 'Conexão com o banco de dados na nuvem',
        'ok' => $backendOk,
        'detail' => $backendOk 
            ? "OK - Backend acessível (HTTP $httpCode)" 
            : "ERRO - Não foi possível conectar ao backend. HTTP $httpCode. Verifique se a hospedagem permite conexões externas."
    ];
} else {
    $checks[] = [
        'name' => 'Backend (OnSpace Cloud)',
        'desc' => 'Conexão com o banco de dados na nuvem',
        'ok' => true,
        'detail' => "Não foi possível detectar a URL do backend nos arquivos."
    ];
}

$domain = $_SERVER['HTTP_HOST'] ?? 'seudominio.com';
$protocol = $isHttps ? 'https' : 'http';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PontoFace - Verificação de Instalação</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #030712;
            color: #e2e8f0;
            min-height: 100vh;
            padding: 2rem;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            border-radius: 16px;
            border: 1px solid #1e293b;
        }
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #22d3ee;
            margin-bottom: 0.5rem;
        }
        .header p { color: #94a3b8; font-size: 0.875rem; }
        .status-banner {
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            font-weight: 600;
            text-align: center;
            font-size: 1rem;
        }
        .status-ok {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #10b981;
        }
        .status-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
        }
        .check {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem 1.25rem;
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 12px;
            margin-bottom: 0.75rem;
        }
        .check-icon {
            flex-shrink: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            margin-top: 2px;
        }
        .check-ok .check-icon { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .check-fail .check-icon { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .check-info { flex: 1; }
        .check-name { font-weight: 600; font-size: 0.9375rem; color: #f1f5f9; }
        .check-desc { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
        .check-detail {
            font-size: 0.8125rem;
            margin-top: 6px;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
        }
        .check-ok .check-detail { background: rgba(16, 185, 129, 0.08); color: #34d399; }
        .check-fail .check-detail { background: rgba(239, 68, 68, 0.08); color: #fca5a5; }
        .links {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 12px;
        }
        .links h3 { color: #22d3ee; margin-bottom: 1rem; font-size: 1rem; }
        .link-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 0;
            border-bottom: 1px solid #1e293b;
        }
        .link-item:last-child { border-bottom: none; }
        .link-item a {
            color: #22d3ee;
            text-decoration: none;
            font-family: monospace;
            font-size: 0.875rem;
        }
        .link-item a:hover { text-decoration: underline; }
        .link-label { color: #94a3b8; font-size: 0.75rem; min-width: 140px; }
        .warning {
            margin-top: 1.5rem;
            padding: 1rem;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 8px;
            color: #f59e0b;
            font-size: 0.8125rem;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 2rem;
            color: #475569;
            font-size: 0.75rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ PontoFace</h1>
            <p>Verificação de Instalação — <?= date('d/m/Y H:i:s') ?></p>
        </div>

        <div class="status-banner <?= $allOk ? 'status-ok' : 'status-error' ?>">
            <?= $allOk 
                ? '✅ Instalação OK — Todos os requisitos essenciais foram atendidos!' 
                : '❌ Problemas encontrados — Corrija os itens abaixo' ?>
        </div>

        <?php foreach ($checks as $check): ?>
        <div class="check <?= $check['ok'] ? 'check-ok' : 'check-fail' ?>">
            <div class="check-icon"><?= $check['ok'] ? '✓' : '✗' ?></div>
            <div class="check-info">
                <div class="check-name"><?= htmlspecialchars($check['name']) ?></div>
                <div class="check-desc"><?= htmlspecialchars($check['desc']) ?></div>
                <div class="check-detail"><?= htmlspecialchars($check['detail']) ?></div>
            </div>
        </div>
        <?php endforeach; ?>

        <?php if ($allOk): ?>
        <div class="links">
            <h3>🔗 Links de Acesso</h3>
            <div class="link-item">
                <span class="link-label">Painel Admin:</span>
                <a href="<?= $protocol ?>://<?= $domain ?>/" target="_blank"><?= $protocol ?>://<?= $domain ?>/</a>
            </div>
            <div class="link-item">
                <span class="link-label">Login:</span>
                <a href="<?= $protocol ?>://<?= $domain ?>/login" target="_blank"><?= $protocol ?>://<?= $domain ?>/login</a>
            </div>
            <div class="link-item">
                <span class="link-label">Quiosque (padrão):</span>
                <a href="<?= $protocol ?>://<?= $domain ?>/quiosque" target="_blank"><?= $protocol ?>://<?= $domain ?>/quiosque</a>
            </div>
            <div class="link-item">
                <span class="link-label">Quiosque (com ID):</span>
                <a href="<?= $protocol ?>://<?= $domain ?>/quiosque?id=entrada-1&name=Entrada Principal&location=Térreo" target="_blank">
                    <?= $protocol ?>://<?= $domain ?>/quiosque?id=entrada-1&...
                </a>
            </div>
            <div class="link-item">
                <span class="link-label">Documentação:</span>
                <a href="<?= $protocol ?>://<?= $domain ?>/docs" target="_blank"><?= $protocol ?>://<?= $domain ?>/docs</a>
            </div>
        </div>
        <?php endif; ?>

        <div class="warning">
            ⚠️ <strong>SEGURANÇA:</strong> Remova este arquivo (verificar.php) após confirmar que a instalação está correta!
        </div>

        <div class="footer">
            PontoFace — Sistema de Controle de Ponto com Reconhecimento Facial
        </div>
    </div>
</body>
</html>
