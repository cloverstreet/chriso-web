<?php
// Returns JSON array of {name, href, label} for browseable items in /TestCases/.
// Mirrors the pattern in /web-instruments/list.php and /Sandbox/list.php.
// Picks up every visible sub-folder (whether or not it has an index file —
// TestCases dirs are commonly browsed via mod_autoindex) and any top-level
// .html files.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dir   = __DIR__;
$items = [];

foreach (glob($dir . '/*/') as $d) {
    $name = basename($d);
    if ($name[0] === '.' || $name[0] === '_') continue;
    $label = str_replace(['-','_'], ' ', $name);
    $items[] = ['name' => $name, 'label' => $label, 'href' => "/TestCases/{$name}/"];
}

foreach (glob($dir . '/*.html') as $f) {
    $name = pathinfo($f, PATHINFO_FILENAME);
    if ($name === 'index') continue;
    if ($name[0] === '.' || $name[0] === '_') continue;
    $label = str_replace(['-','_'], ' ', $name);
    $items[] = ['name' => $name, 'label' => $label, 'href' => "/TestCases/{$name}.html"];
}

usort($items, fn($a,$b) => strcmp(strtolower($a['name']), strtolower($b['name'])));
echo json_encode(array_values($items));
