<?php
// PerfReal Upload — One-Time Setup Script
// Run once: https://chriso.org/uploads/setup.php
// DELETE IMMEDIATELY after running.

$dirs = [
    __DIR__ . '/participantFiles',
    __DIR__ . '/participantFiles/photos',
    __DIR__ . '/participantFiles/videos',
    __DIR__ . '/participantFiles/text',
];

$results = [];
foreach ($dirs as $d) {
    if (!is_dir($d)) {
        $results[] = mkdir($d, 0755, true) ? "✓ Created: $d" : "✗ FAILED: $d";
    } else {
        $results[] = "· Exists: $d";
    }
}

$stateFile = __DIR__ . '/.upload_state.json';
if (!file_exists($stateFile)) {
    $state = ['enabled'=>false,'enabled_at'=>null,'expires_at'=>null];
    $results[] = file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT))
        ? "✓ Created state file" : "✗ FAILED state file — check /uploads/ permissions";
} else {
    $results[] = "· State file exists.";
}

foreach ($dirs as $d) {
    if (is_dir($d)) $results[] = (is_writable($d) ? "✓ Writable: " : "✗ NOT writable: ") . $d;
}
?><!DOCTYPE html><html><head><meta charset="UTF-8"><title>PerfReal Setup</title>
<style>body{background:#0a0a0f;color:#ccc;font-family:monospace;padding:2rem}
h1{color:#7b5ea7;margin-bottom:1rem}.ok{color:#3ecf8e}.err{color:#e05c5c}
.warn{color:#e8a84a;font-weight:bold;margin-top:2rem}</style></head><body>
<h1>PerfReal — Setup</h1>
<?php foreach($results as $r): ?>
  <div class="<?= str_starts_with($r,'✗') ? 'err' : 'ok' ?>"><?= htmlspecialchars($r) ?></div>
<?php endforeach; ?>
<div class="warn">⚠ DELETE setup.php NOW via Dreamhost file manager or SSH.</div>
</body></html>
