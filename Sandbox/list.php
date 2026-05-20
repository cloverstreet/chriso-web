<?php
// Returns JSON array of {name, href, label} for browseable items in /Sandbox/.
// Mirrors the pattern in /web-instruments/list.php.
// Picks up every sub-folder (with or without an index file — Sandbox dirs are
// often browsable via Apache's mod_autoindex) and any top-level .html files.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dir   = __DIR__;
$items = [];

// Folders — include all visible subdirs
foreach (glob($dir . '/*/') as $d) {
    $name = basename($d);
    if ($name[0] === '.' || $name[0] === '_') continue;
    $label = str_replace(['-','_'], ' ', $name);
    $items[] = ['name' => $name, 'label' => $label, 'href' => "/Sandbox/{$name}/"];
}

// Standalone .html files (not index.html)
foreach (glob($dir . '/*.html') as $f) {
    $name = pathinfo($f, PATHINFO_FILENAME);
    if ($name === 'index') continue;
    if ($name[0] === '.' || $name[0] === '_') continue;
    $label = str_replace(['-','_'], ' ', $name);
    $items[] = ['name' => $name, 'label' => $label, 'href' => "/Sandbox/{$name}.html"];
}

usort($items, fn($a,$b) => strcmp(strtolower($a['name']), strtolower($b['name'])));
echo json_encode(array_values($items));
