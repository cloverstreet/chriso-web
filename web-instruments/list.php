<?php
// Returns JSON array of {name, href, label} for everything in web-instruments/
// Picks up sub-folders with an index file, and standalone .html files
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dir = __DIR__;
$items = [];

// Folders with an index
foreach (glob($dir . '/*/') as $d) {
    $name = basename($d);
    if ($name[0] === '.') continue;
    if (file_exists($d . 'index.html') || file_exists($d . 'index.php')) {
        $label = str_replace(['-','_'], ' ', $name);
        $items[] = ['name' => $name, 'label' => $label, 'href' => "/web-instruments/{$name}/"];
    }
}

// Standalone .html files (not index.html)
foreach (glob($dir . '/*.html') as $f) {
    $name = pathinfo($f, PATHINFO_FILENAME);
    if ($name === 'index') continue;
    $label = str_replace(['-','_'], ' ', $name);
    $items[] = ['name' => $name, 'label' => $label, 'href' => "/web-instruments/{$name}.html"];
}

usort($items, fn($a,$b) => strcmp($a['name'], $b['name']));
echo json_encode(array_values($items));
