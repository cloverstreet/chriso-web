<?php
/**
 * tellofone — invite request handler
 *
 * Receives a POST from index.html when someone clicks "Request an invite",
 * emails the request to cloverstreet@gmail.com, and returns JSON status.
 *
 * No auth, no DB. Honeypot field for trivial bot rejection. Rate-limited
 * by IP using a tiny on-disk counter to keep things sane without sessions.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Reject anything that isn't POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'POST required']);
  exit;
}

// Read JSON body if Content-Type is application/json, else fall back to form fields
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
$payload = [];
if (stripos($ct, 'application/json') !== false) {
  $raw = file_get_contents('php://input');
  $payload = json_decode($raw, true) ?: [];
} else {
  $payload = $_POST;
}

$name      = trim($payload['name']      ?? '');
$context   = trim($payload['context']   ?? '');
$requestId = trim($payload['requestId'] ?? '');
$honeypot  = trim($payload['website']   ?? '');  // hidden field; bots tend to fill it

// Honeypot — bot caught. Pretend success so the bot doesn't iterate.
if ($honeypot !== '') {
  echo json_encode(['ok' => true, 'requestId' => $requestId]);
  exit;
}

// Basic validation
if ($name === '' || mb_strlen($name) > 80) {
  echo json_encode(['ok' => false, 'error' => 'Name is required (max 80 chars)']);
  exit;
}
if (mb_strlen($context) > 1000) {
  echo json_encode(['ok' => false, 'error' => 'Context too long (max 1000 chars)']);
  exit;
}
if (!preg_match('/^[A-Z0-9]{4,16}$/', $requestId)) {
  // Generate one if the client didn't supply a sane one
  $requestId = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
}

// Tiny IP rate limit: max 5 requests per IP per hour. State on disk in a
// single JSON file, locked for atomic update. Not rocket science; enough
// to keep a hostile loop from spamming Christophero's inbox.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$stateFile = __DIR__ . '/.invite-rate.json';
$now = time();
$windowSec = 3600;
$maxPerWindow = 5;

$fh = @fopen($stateFile, 'c+');
if ($fh) {
  flock($fh, LOCK_EX);
  $contents = stream_get_contents($fh) ?: '{}';
  $state = json_decode($contents, true) ?: [];
  // Drop entries outside the window
  foreach ($state as $k => $entry) {
    $state[$k] = array_filter($entry, fn($t) => ($now - $t) < $windowSec);
    if (empty($state[$k])) unset($state[$k]);
  }
  $count = count($state[$ip] ?? []);
  if ($count >= $maxPerWindow) {
    flock($fh, LOCK_UN); fclose($fh);
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Too many requests. Try again later.']);
    exit;
  }
  $state[$ip] = $state[$ip] ?? [];
  $state[$ip][] = $now;
  ftruncate($fh, 0);
  rewind($fh);
  fwrite($fh, json_encode($state));
  fflush($fh);
  flock($fh, LOCK_UN);
  fclose($fh);
}

// Compose and send
$to      = 'cloverstreet@gmail.com';
$subject = 'Tellofone invite request — ' . $requestId;
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? '';
$ts      = date('c', $now);

$body = "Tellofone invite request\n";
$body .= "------------------------\n";
$body .= "Name:       " . $name . "\n";
$body .= "Request ID: " . $requestId . "\n";
$body .= "When:       " . $ts . "\n";
$body .= "IP:         " . $ip . "\n";
$body .= "User Agent: " . $ua . "\n";
$body .= "\n";
$body .= "Context:\n";
$body .= ($context !== '' ? $context : '(none provided)') . "\n";
$body .= "\n";
$body .= "Reply with a code from the HOST_CODES list in room.html, or add\n";
$body .= "a new entry there and redeploy.\n";

$headers = "From: tellofone@chriso.org\r\n"
         . "Reply-To: tellofone@chriso.org\r\n"
         . "X-Mailer: tellofone-request-invite/1.0\r\n";

$ok = @mail($to, $subject, $body, $headers);

if ($ok) {
  echo json_encode(['ok' => true, 'requestId' => $requestId]);
} else {
  // Mail failed but rate limit was already consumed — that's fine; failed
  // sends are still real attempts. Surface the error so the user knows.
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Mail send failed. Try again later.']);
}
