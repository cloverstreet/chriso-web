<?php
// Returns a JSON array of subdirectory names in the sibling /tests/ folder
// glitchpage/ and tests/ sit at the same level under chriso.org root
// Automatically picks up new folders — no manual updates needed
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$testsDir = __DIR__ . '/../tests';

$dirs = [];
if (is_dir($testsDir)) {
    foreach (glob($testsDir . '/*/') as $dir) {
        $name = basename($dir);
        // Skip hidden directories
        if ($name[0] !== '.') {
            $dirs[] = $name;
        }
    }
}
sort($dirs);
echo json_encode($dirs);
