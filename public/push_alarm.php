<?php
/**
 * HoraFace Push Alarm - Cron Job Script
 * Run every minute via Hostinger cron: php /home/u123/domains/compositor.sbs/public_html/push_alarm.php
 * Checks for overdue shift records and sends push notifications
 */

error_reporting(E_ALL);
date_default_timezone_set('America/Sao_Paulo');

// ── Config ──────────────────────────────────────────────────────────────────
$SUPABASE_URL = 'https://ycdzokzdbbxkpvovbrwl.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHpva3pkYmJ4a3B2b3ZicndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDM1NDIsImV4cCI6MjA4ODU3OTU0Mn0.tCxOGxWoowH3NBX-mS5L2CY0Kn7BnjTV6Lk8jq_kpCM';
$VAPID_SUBJECT = 'mailto:admin@compositor.sbs';
$VAPID_PUBLIC_KEY = 'BMaxuTgj0DINa2QS51FBtZpFYOlQuNe6AAgyqgL0sK2ZDsep7K8O_lPDMZBfa-GPWU6Nb0EXyxS1HoebxmO8L4U';
$VAPID_PRIVATE_KEY = 'M6Sf8nfVH0g8Pn4JBqSQwEj42eei_JezQ95iRb0LHt0';

// Lock file to prevent overlapping runs
$lockFile = __DIR__ . '/.push_alarm.lock';
if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 50) {
    exit("Already running.\n");
}
file_put_contents($lockFile, time());
register_shutdown_function(function() use ($lockFile) { @unlink($lockFile); });

// ── Supabase REST helper ────────────────────────────────────────────────────
function supabaseGet($path) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $ch = curl_init($SUPABASE_URL . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: $SUPABASE_KEY",
            "Authorization: Bearer $SUPABASE_KEY",
            "Content-Type: application/json"
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    return $resp ? json_decode($resp, true) : [];
}

// ── Base64URL helpers ───────────────────────────────────────────────────────
function b64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

// ── VAPID JWT Creation ──────────────────────────────────────────────────────
function createVapidJwt($audience) {
    global $VAPID_SUBJECT, $VAPID_PRIVATE_KEY, $VAPID_PUBLIC_KEY;
    
    $header = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = b64url_encode(json_encode([
        'aud' => $audience,
        'exp' => time() + 43200,
        'sub' => $VAPID_SUBJECT,
    ]));
    $input = "$header.$payload";
    
    // Build EC private key PEM from raw bytes
    $privKeyRaw = b64url_decode($VAPID_PRIVATE_KEY);
    $pubKeyRaw = b64url_decode($VAPID_PUBLIC_KEY); // 65 bytes (uncompressed)
    
    // ASN.1 DER structure for EC private key with P-256 curve
    $der = "\x30\x77"                                    // SEQUENCE (119 bytes)
         . "\x02\x01\x01"                                // INTEGER version=1
         . "\x04\x20" . $privKeyRaw                      // OCTET STRING (32 bytes private key)
         . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"  // [0] OID prime256v1
         . "\xa1\x44\x03\x42\x00" . $pubKeyRaw;          // [1] BIT STRING (66 bytes: 1+65)
    
    $pem = "-----BEGIN EC PRIVATE KEY-----\n" 
         . chunk_split(base64_encode($der), 64, "\n") 
         . "-----END EC PRIVATE KEY-----";
    
    $key = openssl_pkey_get_private($pem);
    if (!$key) {
        echo "ERROR: Failed to parse VAPID private key\n";
        return null;
    }
    
    openssl_sign($input, $derSig, $key, OPENSSL_ALGO_SHA256);
    
    // Convert DER signature to raw R||S (64 bytes)
    $offset = 2;
    if (ord($derSig[1]) > 127) $offset = 3;
    $rLen = ord($derSig[$offset + 1]);
    $r = substr($derSig, $offset + 2, $rLen);
    $sOffset = $offset + 2 + $rLen;
    $sLen = ord($derSig[$sOffset + 1]);
    $s = substr($derSig, $sOffset + 2, $sLen);
    // Pad/trim to 32 bytes each
    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    
    return "$header.$payload." . b64url_encode($r . $s);
}

// ── WebPush Encryption (aes128gcm) ──────────────────────────────────────────
function encryptPayload($payload, $userPublicKey, $userAuth) {
    $userPub = b64url_decode($userPublicKey);   // 65 bytes
    $authSecret = b64url_decode($userAuth);     // 16 bytes
    
    // Generate local ECDH key pair
    $localKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    $localDetails = openssl_pkey_get_details($localKey);
    // Uncompressed public key: 0x04 + x (32) + y (32) = 65 bytes
    $localPubRaw = "\x04" . str_pad($localDetails['ec']['x'], 32, "\x00", STR_PAD_LEFT) 
                          . str_pad($localDetails['ec']['y'], 32, "\x00", STR_PAD_LEFT);
    
    // Compute ECDH shared secret
    // PHP 7.3+ openssl can derive shared secret via low-level EC operations
    // We use openssl_pkey_derive if available (PHP 7.3+)
    // Build a temporary PEM for the user's public key
    $userPubDer = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"
               . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"
               . "\x03\x42\x00" . $userPub;
    $userPubPem = "-----BEGIN PUBLIC KEY-----\n" 
                . chunk_split(base64_encode($userPubDer), 64, "\n") 
                . "-----END PUBLIC KEY-----";
    $userPubKey = openssl_pkey_get_public($userPubPem);
    if (!$userPubKey) return null;
    
    $sharedSecret = openssl_pkey_derive($localKey, $userPubKey, 32);
    if (!$sharedSecret) return null;
    
    // HKDF for auth_info
    $authInfo = "WebPush: info\x00" . $userPub . $localPubRaw;
    $ikm = hkdf($authSecret, $sharedSecret, $authInfo, 32);
    
    // Generate salt (16 bytes)
    $salt = random_bytes(16);
    
    // PRK for content encryption
    $prk = hash_hmac('sha256', $ikm, $salt, true);
    
    // Derive CEK and nonce
    $cekInfo = "Content-Encoding: aes128gcm\x00";
    $nonceInfo = "Content-Encoding: nonce\x00";
    $cek = hkdf($salt, $ikm, $cekInfo, 16);
    $nonce = hkdf($salt, $ikm, $nonceInfo, 12);
    
    // Pad payload with 0x02 delimiter
    $paddedPayload = $payload . "\x02";
    
    // Encrypt with AES-128-GCM
    $tag = '';
    $encrypted = openssl_encrypt($paddedPayload, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($encrypted === false) return null;
    
    // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted+tag
    $rs = pack('N', 4096);
    $idLen = chr(65);
    $body = $salt . $rs . $idLen . $localPubRaw . $encrypted . $tag;
    
    return ['body' => $body, 'localPub' => $localPubRaw];
}

function hkdf($salt, $ikm, $info, $length) {
    $prk = hash_hmac('sha256', $ikm, $salt, true);
    $t = '';
    $output = '';
    $counter = 1;
    while (strlen($output) < $length) {
        $t = hash_hmac('sha256', $t . $info . chr($counter), $prk, true);
        $output .= $t;
        $counter++;
    }
    return substr($output, 0, $length);
}

// ── Send Push Notification ──────────────────────────────────────────────────
function sendPush($endpoint, $p256dh, $auth, $payloadJson) {
    global $VAPID_PUBLIC_KEY;
    
    // Parse audience from endpoint
    $parsed = parse_url($endpoint);
    $audience = $parsed['scheme'] . '://' . $parsed['host'];
    
    // Create VAPID JWT
    $jwt = createVapidJwt($audience);
    if (!$jwt) return false;
    
    // Encrypt payload
    $encrypted = encryptPayload($payloadJson, $p256dh, $auth);
    if (!$encrypted) {
        // Fallback: send without payload
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: vapid t=$jwt, k=$VAPID_PUBLIC_KEY",
                "TTL: 60",
                "Content-Length: 0",
            ],
            CURLOPT_TIMEOUT => 10,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code >= 200 && $code < 300;
    }
    
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $encrypted['body'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: vapid t=$jwt, k=$VAPID_PUBLIC_KEY",
            "Content-Type: application/octet-stream",
            "Content-Encoding: aes128gcm",
            "TTL: 60",
            "Content-Length: " . strlen($encrypted['body']),
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $code >= 200 && $code < 300;
}

// ── Main Logic ──────────────────────────────────────────────────────────────
function main() {
    // 1. Get settings
    $settings = supabaseGet('/rest/v1/kiosk_settings?id=eq.default&select=library');
    $warningMin = 25;
    $toleranceMin = 30;
    
    if (!empty($settings[0]['library'])) {
        $lib = is_string($settings[0]['library']) ? json_decode($settings[0]['library'], true) : $settings[0]['library'];
        if (is_array($lib)) {
            foreach ($lib as $item) {
                if (isset($item['id']) && $item['id'] === 'system_config' && isset($item['options'])) {
                    $warningMin = $item['options']['autoCheckoutWarningMinutes'] ?? 25;
                    $toleranceMin = $item['options']['autoCheckoutToleranceMinutes'] ?? 30;
                    break;
                }
            }
        }
    }
    echo "Settings: warning={$warningMin}min, tolerance={$toleranceMin}min\n";
    
    // 2. Get active records (no checkout)
    $records = supabaseGet('/rest/v1/time_records?check_out=is.null&select=id,provider_id,check_in');
    if (empty($records)) { echo "No active records.\n"; return; }
    echo "Active records: " . count($records) . "\n";
    
    // 3. Get providers and shifts
    $providerIds = array_unique(array_column($records, 'provider_id'));
    $idList = implode(',', $providerIds);
    $providers = supabaseGet("/rest/v1/providers?id=in.({$idList})&select=id,name,shift_id,shift_ids");
    $shifts = supabaseGet('/rest/v1/shifts?select=id,start_time,end_time,name');
    
    // 4. Get push subscriptions
    $subs = supabaseGet("/rest/v1/push_subscriptions?provider_id=in.({$idList})&select=*");
    if (empty($subs)) { echo "No push subscriptions.\n"; return; }
    
    // Track notifications sent this run
    $sentFile = __DIR__ . '/.push_sent.json';
    $sentData = file_exists($sentFile) ? json_decode(file_get_contents($sentFile), true) : [];
    if (!is_array($sentData)) $sentData = [];
    // Clean old entries (> 10 min ago)
    $sentData = array_filter($sentData, function($ts) { return $ts > time() - 600; });
    
    $now = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
    $nowMin = (int)$now->format('G') * 60 + (int)$now->format('i');
    
    foreach ($records as $record) {
        $provider = null;
        foreach ($providers as $p) {
            if ($p['id'] === $record['provider_id']) { $provider = $p; break; }
        }
        if (!$provider) continue;
        
        // Find provider's shifts
        $shiftIds = [];
        if (!empty($provider['shift_ids'])) {
            $shiftIds = $provider['shift_ids'];
        } elseif (!empty($provider['shift_id'])) {
            $shiftIds = [$provider['shift_id']];
        }
        
        $matchedShift = null;
        $checkInDate = new DateTime($record['check_in'], new DateTimeZone('America/Sao_Paulo'));
        $checkInMin = (int)$checkInDate->format('G') * 60 + (int)$checkInDate->format('i');
        
        foreach ($shiftIds as $sid) {
            foreach ($shifts as $sh) {
                if ($sh['id'] !== $sid) continue;
                if (empty($sh['start_time']) || empty($sh['end_time'])) continue;
                $parts = explode(':', $sh['end_time']);
                $matchedShift = $sh;
                break 2;
            }
        }
        
        if (!$matchedShift) continue;
        
        $endParts = explode(':', $matchedShift['end_time']);
        $shiftEndMin = (int)$endParts[0] * 60 + (int)$endParts[1];
        $alarmStartMin = $shiftEndMin + $warningMin;
        $autoCloseMin = $shiftEndMin + $toleranceMin;
        
        // Check if we're in the alarm window
        if ($nowMin >= $alarmStartMin && $nowMin <= $autoCloseMin) {
            // Throttle: max one push per 30 seconds per provider
            $key = $provider['id'] . '_push';
            if (isset($sentData[$key]) && $sentData[$key] > time() - 30) {
                echo "Throttled: {$provider['name']}\n";
                continue;
            }
            
            $minutesLeft = $autoCloseMin - $nowMin;
            $payload = json_encode([
                'title' => "⚠️ {$provider['name']}, marque sua saída!",
                'body' => "Seu turno terminou. Fechamento automático em {$minutesLeft} min.",
                'providerId' => $provider['id'],
            ]);
            
            // Send to all subscriptions for this provider
            foreach ($subs as $sub) {
                if ($sub['provider_id'] !== $provider['id']) continue;
                $ok = sendPush($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payload);
                echo ($ok ? "✅" : "❌") . " Push to {$provider['name']}\n";
            }
            
            $sentData[$key] = time();
        }
    }
    
    // Save sent data
    file_put_contents($sentFile, json_encode($sentData));
    echo "Done.\n";
}

main();
