<?php
/**
 * calendar/api/queue.php
 *
 * Shared-secret authenticated R/W endpoint for the Phase 2 queue files.
 * The scheduled cloud agent uses this to read + write queue state — it
 * can't touch Dreamhost files directly, so everything goes through HTTPS.
 *
 * USAGE:
 *   GET  /calendar/api/queue.php?secret=XXX&file=seen
 *   POST /calendar/api/queue.php?secret=XXX&file=seen    (body = JSON)
 *
 * Whitelisted filenames (no extension in param — always .json appended):
 *   seen | rejected | approved-queue | digest-latest
 *
 * NOT exposed via this endpoint: config.json, agent-prompt.txt
 * (config is read-only + local; agent-prompt is read via its own URL).
 */
declare(strict_types=1);

// ── Secret — loaded from an untracked file outside version control ───
// config.local.php is listed in .gitignore; it must exist on the
// production server (deploy it out-of-band). If missing, every request
// is rejected — better to be 503 than to accept a placeholder.
$CONFIG_PATH = __DIR__ . '/config.local.php';
if (!file_exists($CONFIG_PATH)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'queue api is not configured on this server']);
    exit;
}
$API_SECRET = require $CONFIG_PATH;
if (!is_string($API_SECRET) || strlen($API_SECRET) < 32) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'queue api secret is malformed']);
    exit;
}

const QUEUE_DIR = __DIR__ . '/../queue';
const ALLOWED   = ['seen', 'rejected', 'approved-queue', 'digest-latest'];

header('Content-Type: application/json');

// ── Auth ──────────────────────────────────────────────────────────────
$provided = $_GET['secret'] ?? '';
if (!hash_equals($API_SECRET, (string)$provided)) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    exit;
}

// ── Filename validation ───────────────────────────────────────────────
$name = $_GET['file'] ?? '';
if (!in_array($name, ALLOWED, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid file', 'allowed' => ALLOWED]);
    exit;
}
$path = QUEUE_DIR . '/' . $name . '.json';

// ── GET: return the file ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => 'not found']);
        exit;
    }
    readfile($path);
    exit;
}

// ── POST: overwrite the file with body (must be valid JSON) ───────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Cap body size defensively (PHP's post_max_size is the hard limit,
    // but we enforce our own ceiling to avoid storing absurd state).
    $raw = file_get_contents('php://input', false, null, 0, 2_000_000);
    if ($raw === false || strlen($raw) > 2_000_000) {
        http_response_code(413);
        echo json_encode(['error' => 'body too large']);
        exit;
    }
    $decoded = json_decode($raw, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'body must be valid JSON', 'detail' => json_last_error_msg()]);
        exit;
    }
    // Body must be a JSON object (not scalar, not bare array) — this is
    // cheap defense-in-depth against malformed writes corrupting the
    // shape the agent later reads back.
    if (!is_array($decoded) || array_is_list($decoded)) {
        http_response_code(400);
        echo json_encode(['error' => 'body must be a JSON object at the top level']);
        exit;
    }
    // Per-file required top-level keys. If a key is missing, reject —
    // prevents accidental/malicious clobbering with an empty {} that
    // would later confuse the agent.
    $requiredKeys = [
        'seen'            => 'events',
        'rejected'        => 'events',
        'approved-queue'  => 'events',
        'digest-latest'   => 'proposals',
    ];
    $req = $requiredKeys[$name];
    if (!array_key_exists($req, $decoded)) {
        http_response_code(400);
        echo json_encode(['error' => "body missing required top-level key \"$req\" for $name.json"]);
        exit;
    }
    // Atomic-ish write via temp + rename
    $tmp = $path . '.tmp-' . bin2hex(random_bytes(4));
    $bytes = file_put_contents($tmp, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    if ($bytes === false) {
        http_response_code(500);
        @unlink($tmp);
        echo json_encode(['error' => 'write failed']);
        exit;
    }
    rename($tmp, $path);
    echo json_encode(['ok' => true, 'bytes' => $bytes, 'path' => $name . '.json']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'method not allowed']);
