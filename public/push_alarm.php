<?php
/**
 * HoraFace Push Alarm — Cron Job Script
 *
 * Can be triggered via:
 *   1. CLI:  php push_alarm.php
 *   2. URL:  https://compositor.sbs/push_alarm.php?token=SECRET
 *
 * Self-contained: NO external dependencies (no composer).
 * Requires: PHP 7.3+ with openssl and curl extensions.
 */

// Security: require token for web access
$SECRET_TOKEN = 'hf_push_2026_x9k4m';
if (php_sapi_name() !== 'cli') {
    if (($_GET['token'] ?? '') !== $SECRET_TOKEN) {
        http_response_code(403);
        die('Forbidden');
    }
    // Prevent timeout for long-running script (2 runs × 30s)
    set_time_limit(90);
}

error_reporting(E_ALL);
ini_set('display_errors', '1');
date_default_timezone_set('America/Sao_Paulo');

// ── Configuration ─────────────────────────────────────────────────────────

define('SUPABASE_URL', 'https://ycdzokzdbbxkpvovbrwl.supabase.co');
define('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHpva3pkYmJ4a3B2b3ZicndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDM1NDIsImV4cCI6MjA4ODU3OTU0Mn0.tCxOGxWoowH3NBX-mS5L2CY0Kn7BnjTV6Lk8jq_kpCM');
define('VAPID_SUBJECT',     'mailto:admin@compositor.sbs');
define('VAPID_PUBLIC_KEY',  'BMaxuTgj0DINa2QS51FBtZpFYOlQuNe6AAgyqgL0sK2ZDsep7K8O_lPDMZBfa-GPWU6Nb0EXyxS1HoebxmO8L4U');
define('VAPID_PRIVATE_KEY', 'M6Sf8nfVH0g8Pn4JBqSQwEj42eei_JezQ95iRb0LHt0');
define('LOCK_FILE',  __DIR__ . '/.push_alarm.lock');
define('SENT_FILE',  __DIR__ . '/.push_alarm_sent.json');
define('LOG_FILE',   __DIR__ . '/push_alarm.log');
define('SPAM_INTERVAL_SEC', 25); // min seconds between pushes per provider

// ── Base64url helpers ─────────────────────────────────────────────────────

function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

// ── Logging ───────────────────────────────────────────────────────────────

function logMsg(string $msg): void {
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg;
    echo $line . "\n";
    @file_put_contents(LOG_FILE, $line . "\n", FILE_APPEND | LOCK_EX);
}

// ── Anti-spam tracker ─────────────────────────────────────────────────────

function loadSentTracker(): array {
    if (!file_exists(SENT_FILE)) return [];
    $data = json_decode((string)file_get_contents(SENT_FILE), true);
    $now  = time();
    // Purge entries older than 5 minutes
    return array_filter($data ?: [], fn($ts) => ($now - $ts) < 300);
}

function wasSentRecently(string $providerId): bool {
    $tracker = loadSentTracker();
    return isset($tracker[$providerId]) && (time() - $tracker[$providerId]) < SPAM_INTERVAL_SEC;
}

function markSent(string $providerId): void {
    $tracker = loadSentTracker();
    $tracker[$providerId] = time();
    file_put_contents(SENT_FILE, json_encode($tracker), LOCK_EX);
}

// ── Supabase REST helper ──────────────────────────────────────────────────

function supabaseGet(string $path): array {
    $ch = curl_init(SUPABASE_URL . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'apikey: '        . SUPABASE_KEY,
            'Authorization: Bearer ' . SUPABASE_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $body     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 400) {
        logMsg("Supabase GET $path → HTTP $httpCode");
        return [];
    }
    return json_decode((string)$body, true) ?: [];
}

// ═══════════════════════════════════════════════════════════════════════════
// VAPID JWT  (ES256 / P-256)
// ═══════════════════════════════════════════════════════════════════════════

function createVapidJwt(string $audience): ?string {
    // Header + claims
    $header = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $claims = b64url_encode(json_encode([
        'aud' => $audience,
        'exp' => time() + 43200,  // 12 hours
        'sub' => VAPID_SUBJECT,
    ]));
    $unsigned = "$header.$claims";

    // Build EC private key PEM from raw VAPID keys
    $rawPrivate = b64url_decode(VAPID_PRIVATE_KEY);  // 32 bytes
    $rawPublic  = b64url_decode(VAPID_PUBLIC_KEY);   // 65 bytes (04 + x + y)

    // ASN.1 DER: ECPrivateKey with P-256 OID and public key
    $der = "\x30\x77"                                              // SEQUENCE (119 bytes)
         . "\x02\x01\x01"                                          // INTEGER version = 1
         . "\x04\x20" . $rawPrivate                                // OCTET STRING (32 bytes)
         . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"    // [0] OID prime256v1
         . "\xa1\x44\x03\x42\x00" . $rawPublic;                   // [1] BIT STRING (65 bytes)

    $pem = "-----BEGIN EC PRIVATE KEY-----\n"
         . chunk_split(base64_encode($der), 64, "\n")
         . "-----END EC PRIVATE KEY-----";

    $key = openssl_pkey_get_private($pem);
    if (!$key) {
        logMsg('VAPID: openssl_pkey_get_private failed — ' . openssl_error_string());
        return null;
    }

    if (!openssl_sign($unsigned, $derSig, $key, OPENSSL_ALGO_SHA256)) {
        logMsg('VAPID: openssl_sign failed — ' . openssl_error_string());
        return null;
    }

    $rawSig = derSignatureToRaw($derSig);
    return "$unsigned." . b64url_encode($rawSig);
}

/**
 * Convert ASN.1 DER ECDSA signature to raw R||S (64 bytes).
 */
function derSignatureToRaw(string $der): string {
    // DER structure: 30 <len> 02 <rLen> <R> 02 <sLen> <S>
    $offset = 2;

    // R
    $rLen = ord($der[$offset + 1]);
    $r    = substr($der, $offset + 2, $rLen);
    $offset += 2 + $rLen;

    // S
    $sLen = ord($der[$offset + 1]);
    $s    = substr($der, $offset + 2, $sLen);

    // Pad / trim to exactly 32 bytes each
    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

    return $r . $s;
}

// ═══════════════════════════════════════════════════════════════════════════
// WebPush payload encryption  (RFC 8291 + RFC 8188, aes128gcm)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a SubjectPublicKeyInfo PEM from a 65-byte uncompressed EC point.
 */
function ecPublicKeyToPem(string $rawPublicKey): string {
    $der = "\x30\x59"                                           // SEQUENCE (89 bytes)
         . "\x30\x13"                                           // SEQUENCE (19 bytes)
         . "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"             // OID ecPublicKey
         . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"         // OID prime256v1
         . "\x03\x42\x00" . $rawPublicKey;                     // BIT STRING

    return "-----BEGIN PUBLIC KEY-----\n"
         . chunk_split(base64_encode($der), 64, "\n")
         . "-----END PUBLIC KEY-----";
}

/**
 * Encrypt a push payload using RFC 8291 (WebPush) + RFC 8188 (aes128gcm).
 *
 * @param  string      $payload         JSON string to encrypt
 * @param  string      $userPublicKeyB64 Subscriber p256dh (base64url, 65 bytes decoded)
 * @param  string      $userAuthB64      Subscriber auth   (base64url, 16 bytes decoded)
 * @return string|null Encrypted body ready for POST, or null on failure
 */
function encryptPayload(string $payload, string $userPublicKeyB64, string $userAuthB64): ?string {
    $userPublicKey = b64url_decode($userPublicKeyB64);  // 65 bytes
    $userAuth      = b64url_decode($userAuthB64);       // 16 bytes

    // 1. Generate ephemeral ECDH key pair on P-256
    $localKey = openssl_pkey_new([
        'curve_name'       => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    if (!$localKey) {
        logMsg('Encrypt: openssl_pkey_new failed — ' . openssl_error_string());
        return null;
    }

    $det   = openssl_pkey_get_details($localKey);
    $localX = str_pad($det['ec']['x'], 32, "\x00", STR_PAD_LEFT);
    $localY = str_pad($det['ec']['y'], 32, "\x00", STR_PAD_LEFT);
    $localPublicKey = "\x04" . $localX . $localY;  // 65 bytes uncompressed

    // 2. Import subscriber public key as OpenSSL resource
    $peerPem = ecPublicKeyToPem($userPublicKey);
    $peerKey = openssl_pkey_get_public($peerPem);
    if (!$peerKey) {
        logMsg('Encrypt: openssl_pkey_get_public failed — ' . openssl_error_string());
        return null;
    }

    // 3. ECDH shared secret (32 bytes)
    $sharedSecret = openssl_pkey_derive($peerKey, $localKey);
    if ($sharedSecret === false) {
        logMsg('Encrypt: openssl_pkey_derive (ECDH) failed — ' . openssl_error_string());
        return null;
    }

    // 4. Key derivation — RFC 8291 §3.4
    //    IKM = HKDF(salt=auth_secret, ikm=ecdh_secret, info="WebPush: info\0" || ua_pub || as_pub, len=32)
    $keyInfo = "WebPush: info\x00" . $userPublicKey . $localPublicKey;
    $ikm     = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $userAuth);

    // 5. Content-encryption keys — RFC 8188
    $salt  = random_bytes(16);
    $cek   = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00",     $salt);

    // 6. Pad plaintext (single-record: data || 0x02 delimiter)
    $padded = $payload . "\x02";

    // 7. AES-128-GCM encrypt
    $tag        = '';
    $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($ciphertext === false) {
        logMsg('Encrypt: openssl_encrypt (AES-GCM) failed — ' . openssl_error_string());
        return null;
    }

    // 8. Build body — RFC 8188 aes128gcm content coding
    //    salt(16) || rs(uint32 BE = 4096) || idlen(1 = 65) || keyid(65 = as_public) || record
    $rs    = pack('N', 4096);
    $idLen = chr(65);
    return $salt . $rs . $idLen . $localPublicKey . $ciphertext . $tag;
}

// ═══════════════════════════════════════════════════════════════════════════
// Send push notification
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @return true|int  true on success, HTTP status code on failure
 */
function sendPush(string $endpoint, string $p256dh, string $auth, string $payload) {
    // Audience = origin of push service endpoint
    $parsed   = parse_url($endpoint);
    $audience = $parsed['scheme'] . '://' . $parsed['host'];

    // VAPID JWT
    $jwt = createVapidJwt($audience);
    if (!$jwt) return 0;

    // Encrypt payload (RFC 8291 + RFC 8188)
    $body = encryptPayload($payload, $p256dh, $auth);
    if (!$body) return 0;

    // POST to push endpoint
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: vapid t=' . $jwt . ', k=' . VAPID_PUBLIC_KEY,
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Content-Length: ' . strlen($body),
            'TTL: 60',
            'Urgency: high',
            'Topic: horaface-alarm',
        ],
        CURLOPT_TIMEOUT => 30,
    ]);

    curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        logMsg("cURL error → $curlErr");
        return 0;
    }

    return ($httpCode >= 200 && $httpCode < 300) ? true : $httpCode;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main logic
// ═══════════════════════════════════════════════════════════════════════════

function main(): void {
    // ── Prevent concurrent runs ───────────────────────────────────────────
    $lock = fopen(LOCK_FILE, 'w');
    if (!flock($lock, LOCK_EX | LOCK_NB)) {
        logMsg('Another instance running. Exiting.');
        return;
    }

    logMsg('── Push alarm check started ──');

    // ── 1. Load kiosk settings ────────────────────────────────────────────
    $warningMin   = 25;
    $toleranceMin = 30;

    $settings = supabaseGet('/rest/v1/kiosk_settings?id=eq.default&select=library');
    if (!empty($settings[0]['library'])) {
        $lib = $settings[0]['library'];
        if (is_string($lib)) $lib = json_decode($lib, true);
        if (is_array($lib)) {
            foreach ($lib as $item) {
                if (($item['id'] ?? '') === 'system_config' && isset($item['options'])) {
                    $warningMin   = $item['options']['autoCheckoutWarningMinutes']   ?? $warningMin;
                    $toleranceMin = $item['options']['autoCheckoutToleranceMinutes'] ?? $toleranceMin;
                    break;
                }
            }
        }
    }
    logMsg("Config: warning={$warningMin}min  tolerance={$toleranceMin}min");

    // ── 2. Active time records (no checkout) ──────────────────────────────
    $records = supabaseGet('/rest/v1/time_records?check_out=is.null&select=id,provider_id,check_in');
    if (empty($records)) {
        logMsg('No active records. Done.');
        flock($lock, LOCK_UN); fclose($lock);
        return;
    }
    logMsg(count($records) . ' active record(s).');

    // ── 3. Providers, shifts, subscriptions ───────────────────────────────
    $providerIds = array_values(array_unique(array_column($records, 'provider_id')));
    $quotedIds = array_map(fn($id) => '"' . $id . '"', $providerIds);
    $idList    = implode(',', $quotedIds);

    $providers = supabaseGet("/rest/v1/providers?id=in.({$idList})&select=id,name,shift_id,shift_ids");
    $shifts    = supabaseGet('/rest/v1/shifts?select=id,start_time,end_time,name');
    $subs      = supabaseGet("/rest/v1/push_subscriptions?provider_id=in.({$idList})&select=*");

    if (empty($subs)) {
        logMsg('No push subscriptions found. Done.');
        flock($lock, LOCK_UN); fclose($lock);
        return;
    }

    // ── 4. Check each record ──────────────────────────────────────────────
    $now        = new DateTime('now');
    $nowMinutes = (int)$now->format('G') * 60 + (int)$now->format('i');
    $pushed     = 0;

    foreach ($records as $record) {
        $providerId = $record['provider_id'];

        // Anti-spam
        if (wasSentRecently($providerId)) continue;

        // Find provider
        $provider = null;
        foreach ($providers as $p) {
            if ($p['id'] === $providerId) { $provider = $p; break; }
        }
        if (!$provider) continue;

        // Resolve shift IDs
        $shiftIds = [];
        if (!empty($provider['shift_ids']) && is_array($provider['shift_ids'])) {
            $shiftIds = $provider['shift_ids'];
        } elseif (!empty($provider['shift_id'])) {
            $shiftIds = [$provider['shift_id']];
        }

        // Map to shift objects
        $provShifts = [];
        foreach ($shiftIds as $sid) {
            foreach ($shifts as $s) {
                if ($s['id'] === $sid) { $provShifts[] = $s; break; }
            }
        }

        // Match shift active at check-in time
        $checkIn    = new DateTime($record['check_in']);
        $checkInMin = (int)$checkIn->format('G') * 60 + (int)$checkIn->format('i');

        $matchedShift = null;
        foreach ($provShifts as $s) {
            if (empty($s['start_time']) || empty($s['end_time'])) continue;
            [$sh, $sm] = array_map('intval', explode(':', $s['start_time']));
            [$eh, $em] = array_map('intval', explode(':', $s['end_time']));
            $sMin = $sh * 60 + $sm - 60;  // 1 hr before start
            $eMin = $eh * 60 + $em;

            if ($sMin <= $eMin) {
                if ($checkInMin >= $sMin && $checkInMin <= $eMin) { $matchedShift = $s; break; }
            } else {
                // Overnight shift
                if ($checkInMin >= $sMin || $checkInMin <= $eMin) { $matchedShift = $s; break; }
            }
        }
        if (!$matchedShift && !empty($provShifts)) $matchedShift = $provShifts[0];
        if (!$matchedShift) continue;

        // Calculate alarm window
        [$eH, $eM]     = array_map('intval', explode(':', $matchedShift['end_time']));
        $shiftEndMin    = $eH * 60 + $eM;
        $alarmStartMin  = $shiftEndMin + $warningMin;
        $autoCloseMin   = $shiftEndMin + $toleranceMin;

        // Skip if clearly not in alarm window (e.g. overnight shift edge-case)
        if ($shiftEndMin < 360 && $nowMinutes > 720) continue;

        if ($nowMinutes < $alarmStartMin || $nowMinutes > $autoCloseMin) continue;

        // ── In alarm window → send push ───────────────────────────────────
        $minutesLeft = max(0, $autoCloseMin - $nowMinutes);
        $payload     = json_encode([
            'title'      => "⚠️ {$provider['name']}, marque sua saída!",
            'body'       => "Seu turno terminou. Fechamento automático em {$minutesLeft} min.",
            'providerId' => $providerId,
        ], JSON_UNESCAPED_UNICODE);

        $providerSubs = array_filter($subs, fn($s) => $s['provider_id'] === $providerId);

        foreach ($providerSubs as $sub) {
            $result = sendPush($sub['endpoint'], $sub['p256dh'], $sub['auth'], $payload);

            if ($result === true) {
                logMsg("✅ Push sent → {$provider['name']}  ({$minutesLeft} min left)");
                markSent($providerId);
                $pushed++;
            } elseif ($result === 410 || $result === 404) {
                logMsg("⚠️  Subscription expired → {$provider['name']} (HTTP $result)");
                // TODO: DELETE expired subscription from push_subscriptions table
            } else {
                logMsg("❌ Push failed → {$provider['name']} (HTTP $result)");
            }
        }
    }

    logMsg("── Done. {$pushed} push(es) sent. ──");
    flock($lock, LOCK_UN);
    fclose($lock);
}

// ── Run ───────────────────────────────────────────────────────────────────
main();
