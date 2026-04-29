<?php
/**
 * calendar/sync.php
 *
 * Pulls the "Public Events" Google Calendar (ICS feed) and writes
 * calendar/live.json in the same schema used by events.json, so the
 * static /calendar/ page can display it. Merge is done client-side
 * (index.html loads events.json + live.json, de-dupes by id).
 *
 * USAGE:
 *   1. Ensure the Public Events calendar is published (GCal → Settings
 *      → Settings for my calendars → Public Events → "Make available
 *      to public"). Without this, the ICS URL below will 404.
 *   2. Hit /calendar/sync.php?refresh=1 once to prime live.json.
 *   3. (Optional) Set a Dreamhost cron to GET this URL hourly.
 *
 * OPTIONAL HASHTAG TAGGING in the event description (see the README
 * in the response — lightweight convention, not required):
 *   #jazz #experimental #rock #heavy #rnb #funk #spoken-word
 *   #hip-hop #world #dance #theater-experimental #all-ages #festival
 *   #field-trip        → sets field_trip = true
 *   #under18free       → sets free_under_18 = true
 *   #featured          → pins to the top
 *   #performing        → marks Christopher as performing
 *   #price:free | #price:25 | #price:20-45
 *   #age:all | #age:12+ | #age:5+
 *   #zone:vashon|tacoma|seattle|driving
 *
 * Untagged events still display with basic fields — tagging is pure
 * enrichment, never required.
 */

declare(strict_types=1);

const CALENDAR_ID    = 'avevo01daqtr562e54q1c8uu7c@group.calendar.google.com';
const ICS_URL        = 'https://calendar.google.com/calendar/ical/avevo01daqtr562e54q1c8uu7c%40group.calendar.google.com/public/basic.ics';
const CACHE_SECONDS  = 600;            // 10 minutes (normal)
const CACHE_FLOOR    = 60;             // 1 minute — minimum between fetches, even with ?refresh=1
const OUT_PATH       = __DIR__ . '/live.json';
const DEFAULT_TZ     = 'America/Los_Angeles';

header('Content-Type: application/json');

// Serve from cache if fresh. `?refresh=1` shortens the cache to CACHE_FLOOR
// but can't bypass it entirely — prevents an attacker from spamming this
// endpoint to hammer Google's ICS feed on our behalf.
$age = file_exists(OUT_PATH) ? (time() - filemtime(OUT_PATH)) : PHP_INT_MAX;
$force = isset($_GET['refresh']);
$effectiveCache = $force ? CACHE_FLOOR : CACHE_SECONDS;
if ($age < $effectiveCache) {
    readfile(OUT_PATH);
    exit;
}

// Advisory lock over the fetch + write so concurrent hits (multiple
// page loads, or a spammer hitting ?refresh=1) don't all race to
// Google at once. First caller fetches; the rest block briefly and
// then serve from the freshly-cached file.
$lockFp = fopen(OUT_PATH . '.lock', 'c');
if ($lockFp) { flock($lockFp, LOCK_EX); }

// Re-check cache now that we hold the lock — if a concurrent caller
// already refreshed while we were waiting, serve their result.
$age = file_exists(OUT_PATH) ? (time() - filemtime(OUT_PATH)) : PHP_INT_MAX;
if ($age < CACHE_FLOOR) {
    if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
    readfile(OUT_PATH);
    exit;
}

// Fetch with explicit timeout + 5 MB ceiling.
$ctx = stream_context_create([
    'http' => [
        'timeout' => 15,
        'ignore_errors' => true,
        'user_agent' => 'chriso-org-calendar-sync/1',
    ],
]);
$ics = @file_get_contents(ICS_URL, false, $ctx, 0, 5_000_000);
if ($ics === false || strpos($ics, 'BEGIN:VCALENDAR') === false) {
    if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
    http_response_code(502);
    echo json_encode([
        'error' => 'Could not fetch ICS. Is the Public Events calendar published in GCal settings?',
        'ics_url' => ICS_URL,
    ], JSON_PRETTY_PRINT);
    exit;
}

// RFC 5545 line unfolding: a line continuation starts with a space or tab.
$ics = preg_replace('/\r?\n[ \t]/', '', $ics);
$lines = preg_split('/\r?\n/', $ics);

$events = [];
$cur = null;
foreach ($lines as $line) {
    if ($line === 'BEGIN:VEVENT') { $cur = []; continue; }
    if ($line === 'END:VEVENT')   {
        if ($cur !== null) $events[] = icsEventToJson($cur);
        $cur = null; continue;
    }
    if ($cur === null) continue;

    $colon = strpos($line, ':');
    if ($colon === false) continue;
    $keyPart = substr($line, 0, $colon);
    $value   = substr($line, $colon + 1);
    $keyBits = explode(';', $keyPart);
    $name    = strtoupper($keyBits[0]);
    $params  = [];
    for ($i = 1; $i < count($keyBits); $i++) {
        $p = explode('=', $keyBits[$i], 2);
        if (count($p) === 2) $params[strtoupper($p[0])] = $p[1];
    }
    $cur[$name][] = ['value' => $value, 'params' => $params];
}

function icsUnescape(string $s): string {
    return str_replace(['\\n', '\\N', '\\,', '\\;', '\\\\'],
                       ["\n", "\n", ',', ';', '\\'], $s);
}

function icsToIso(?string $v, array $params): ?string {
    if ($v === null || $v === '') return null;
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $v, $m)) {
        return "{$m[1]}-{$m[2]}-{$m[3]}T00:00:00-08:00";
    }
    if (preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/', $v, $m)) {
        return "{$m[1]}-{$m[2]}-{$m[3]}T{$m[4]}:{$m[5]}:{$m[6]}Z";
    }
    if (preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/', $v, $m)) {
        $tz = $params['TZID'] ?? DEFAULT_TZ;
        try {
            $dt = new DateTimeImmutable(
                "{$m[1]}-{$m[2]}-{$m[3]}T{$m[4]}:{$m[5]}:{$m[6]}",
                new DateTimeZone($tz)
            );
            return $dt->format(DateTimeInterface::ATOM);
        } catch (Exception $e) { return null; }
    }
    return null;
}

function parseTags(string $desc): array {
    $genreVocab = ['jazz','experimental','rock','heavy','rnb','funk','spoken-word',
                   'hip-hop','world','dance','theater-experimental','all-ages','festival'];
    $flagMap = [
        'field-trip'          => 'field_trip',
        'fieldtrip'           => 'field_trip',
        'under18free'         => 'free_under_18',
        'under-18-free'       => 'free_under_18',
        'featured'            => 'featured',
        'performing'          => 'christopher_performing',
        'christopher-performing' => 'christopher_performing',
    ];

    $out = ['genres' => []];
    if (preg_match_all('/#([a-z0-9\-]+)(?::([\w.\-+]+))?/i', $desc, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            $t = strtolower($m[1]);
            $arg = $m[2] ?? null;
            if (in_array($t, $genreVocab, true)) { $out['genres'][] = $t; continue; }
            if (isset($flagMap[$t])) { $out[$flagMap[$t]] = true; continue; }
            if ($t === 'price' && $arg !== null) {
                $a = strtolower($arg);
                if ($a === 'free') { $out['price_min'] = 0; $out['price_max'] = 0; }
                elseif (strpos($a, '-') !== false) {
                    [$lo, $hi] = explode('-', $a, 2);
                    $out['price_min'] = (float)$lo;
                    $out['price_max'] = (float)$hi;
                } elseif (is_numeric($a)) {
                    $out['price_min'] = (float)$a;
                }
            }
            if ($t === 'age' && $arg !== null) {
                $a = strtolower($arg);
                if ($a === 'all' || $a === 'allages') $out['age_min'] = 0;
                elseif (preg_match('/^(\d+)\+?$/', $a, $mm2)) $out['age_min'] = (int)$mm2[1];
            }
            if ($t === 'zone' && $arg !== null) {
                $a = strtolower($arg);
                if (in_array($a, ['vashon','tacoma','seattle','driving'], true)) $out['zone'] = $a;
            }
        }
    }
    $out['genres'] = array_values(array_unique($out['genres']));
    return $out;
}

function stripTagsFromDescription(string $desc): string {
    $clean = preg_replace('/#[a-z0-9\-]+(?::[\w.\-+]+)?/i', '', $desc);
    return trim(preg_replace('/[ \t]+\n/', "\n", $clean));
}

function splitVenueCity(string $loc): array {
    if ($loc === '') return ['', ''];
    $parts = array_map('trim', explode(',', $loc));
    if (count($parts) >= 3) return [$parts[0], $parts[1] . ', ' . end($parts)];
    if (count($parts) === 2) return [$parts[0], $parts[1]];
    return [$loc, ''];
}

function inferZone(string $loc, ?string $explicit): string {
    if ($explicit) return $explicit;
    $l = strtolower($loc);
    if ($l === '') return 'driving';
    if (strpos($l, 'vashon') !== false) return 'vashon';
    if (strpos($l, 'tacoma') !== false) return 'tacoma';
    if (strpos($l, 'seattle') !== false || strpos($l, 'wa') !== false) return 'seattle';
    return 'driving';
}

function icsEventToJson(array $props): array {
    $get       = fn($k) => isset($props[$k]) ? $props[$k][0]['value']  : null;
    $getParams = fn($k) => isset($props[$k]) ? $props[$k][0]['params'] : [];

    $uid     = $get('UID') ?: bin2hex(random_bytes(8));
    $summary = icsUnescape($get('SUMMARY') ?: '(untitled)');
    $desc    = icsUnescape($get('DESCRIPTION') ?: '');
    $loc     = icsUnescape($get('LOCATION') ?: '');

    $dtStart = icsToIso($get('DTSTART'), $getParams('DTSTART'));
    $dtEndRaw = $get('DTEND');
    $dtEnd   = $dtEndRaw ? icsToIso($dtEndRaw, $getParams('DTEND')) : null;

    $tags = parseTags($desc);
    $url  = $get('URL');
    if (!$url && preg_match('#https?://\S+#', $desc, $m)) $url = rtrim($m[0], '.,);');
    // Enforce http(s) scheme — ICS's URL: field is free-form and could
    // hold javascript:, data:, file: or other dangerous schemes that
    // would become active via an <a href> on the page.
    if ($url !== null && !preg_match('#^https?://#i', $url)) $url = null;

    [$venue, $city] = splitVenueCity($loc);
    $zone = inferZone($loc, $tags['zone'] ?? null);

    return [
        'id'            => 'gcal-' . substr(md5($uid), 0, 12),
        'title'         => $summary,
        'date_start'    => $dtStart,
        'date_end'      => $dtEnd,
        'venue'         => $venue,
        'city'          => $city,
        'distance_zone' => $zone,
        'price_min'     => $tags['price_min'] ?? null,
        'price_max'     => $tags['price_max'] ?? null,
        'free_under_18' => !empty($tags['free_under_18']),
        'age_min'       => $tags['age_min'] ?? null,
        'age_notes'     => null,
        'genres'        => $tags['genres'] ?? [],
        'field_trip'    => !empty($tags['field_trip']),
        'tickets_url'   => $url,
        'info_url'      => null,
        'notes'         => stripTagsFromDescription($desc),
        'featured'      => !empty($tags['featured']),
        'source'        => 'gcal',
        'christopher_performing' => !empty($tags['christopher_performing']),
        '_source'       => 'gcal',
        '_uid'          => $uid,
    ];
}

$out = [
    '_source'       => 'gcal',
    '_calendar_id'  => CALENDAR_ID,
    '_fetched_at'   => date(DateTimeInterface::ATOM),
    '_event_count'  => count($events),
    'events'        => $events,
];
$json = json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// Atomic write: temp + rename, so a partial write can never leave
// live.json in a corrupt state that clients would try to parse.
$tmp = OUT_PATH . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($tmp, $json) === false) {
    if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
    http_response_code(500);
    echo json_encode(['error' => 'could not write live.json']);
    exit;
}
rename($tmp, OUT_PATH);
if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
echo $json;
