<?php
// PerfReal Upload Admin — chriso.org/uploads/admin.php?key=YOUR_ADMIN_KEY
// BOOKMARK THIS URL. Don't share it.
session_start();

define('ADMIN_KEY',   '142c92cc32b9aefb42bbbf4a8065d3b1d087f5d8');
define('STATE_FILE',  __DIR__ . '/.upload_state.json');
define('UPLOAD_BASE', __DIR__ . '/participantFiles/');
define('SESSION_HOURS', 6);

$key = $_GET['key'] ?? $_POST['key'] ?? '';
if ($key !== ADMIN_KEY) { http_response_code(403); die('Not found.'); }

function loadState(): array {
    if (!file_exists(STATE_FILE)) return ['enabled'=>false,'enabled_at'=>null,'expires_at'=>null];
    $d = json_decode(file_get_contents(STATE_FILE), true);
    return is_array($d) ? $d : ['enabled'=>false,'enabled_at'=>null,'expires_at'=>null];
}
function saveState(array $s): void { file_put_contents(STATE_FILE, json_encode($s, JSON_PRETTY_PRINT)); }
function isCurrentlyEnabled(): bool {
    $s = loadState();
    if (!$s['enabled']) return false;
    if (time() >= ($s['expires_at'] ?? 0)) { saveState(['enabled'=>false,'enabled_at'=>null,'expires_at'=>null]); return false; }
    return true;
}
function countFiles(): array {
    $c = ['photos'=>0,'videos'=>0,'text'=>0,'total_mb'=>0];
    foreach(['photos','videos','text'] as $sub) {
        $dir = UPLOAD_BASE . $sub . '/';
        if (!is_dir($dir)) continue;
        $files = glob($dir . '*');
        $c[$sub] = count($files);
        foreach ($files as $f) $c['total_mb'] += filesize($f);
    }
    $c['total_mb'] = round($c['total_mb'] / (1024*1024), 2);
    return $c;
}

$action_msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'enable') {
        $hours = max(1, min(24, (int)($_POST['hours'] ?? SESSION_HOURS)));
        saveState(['enabled'=>true,'enabled_at'=>time(),'expires_at'=>time()+($hours*3600)]);
        $action_msg = "Uploads enabled for {$hours} hour(s).";
    }
    if ($action === 'extend') {
        $s = loadState(); $addH = max(1, min(12, (int)($_POST['hours'] ?? 2)));
        if ($s['enabled']) { $s['expires_at'] += $addH*3600; saveState($s); $action_msg = "Extended by {$addH}h."; }
        else $action_msg = "Nothing to extend — uploads are off.";
    }
    if ($action === 'disable') { saveState(['enabled'=>false,'enabled_at'=>null,'expires_at'=>null]); $action_msg = "Uploads disabled."; }
    if ($action === 'clear_files') {
        foreach(['photos','videos','text'] as $sub) {
            $dir = UPLOAD_BASE . $sub . '/';
            if (!is_dir($dir)) continue;
            foreach (glob($dir . '*') as $f) if (is_file($f)) unlink($f);
        }
        $action_msg = "All participant files cleared.";
    }
}

$enabled = isCurrentlyEnabled(); $state = loadState(); $counts = countFiles();
$timeLeft = $enabled ? max(0,$state['expires_at']-time()) : 0;
$hLeft = floor($timeLeft/3600); $mLeft = floor(($timeLeft%3600)/60); $sLeft = $timeLeft%60;
?><!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PerfReal // Admin</title><style>
:root{--bg:#0a0a0f;--panel:#111118;--border:#2a2a3a;--accent:#7b5ea7;
--green:#3ecf8e;--red:#e05c5c;--amber:#e8a84a;--text:#ccc8d8;--dim:#666;
--font:'Courier New',Courier,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--font);
min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:2rem 1rem}
h1{font-size:1rem;letter-spacing:.3em;color:var(--accent);text-transform:uppercase;margin-bottom:.3rem}
.sub{font-size:.7rem;color:var(--dim);letter-spacing:.15em;margin-bottom:2rem}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:4px;
padding:1.5rem;width:100%;max-width:520px;margin-bottom:1rem}
.panel h2{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);
margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
.status-row{display:flex;align-items:center;gap:.6rem;font-size:.85rem;margin-bottom:1rem}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.dot.on{background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s infinite}
.dot.off{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.countdown{font-size:2rem;color:var(--green);letter-spacing:.2em;text-align:center;margin:.5rem 0}
.expire-label{font-size:.65rem;color:var(--dim);text-align:center;letter-spacing:.1em;margin-bottom:1rem}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:1rem}
.stat{background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:.75rem;text-align:center}
.stat .num{font-size:1.4rem;color:var(--accent)}.stat .lbl{font-size:.65rem;color:var(--dim)}
.row{display:flex;gap:.5rem;margin-bottom:.5rem}
.hours-input{background:var(--bg);border:1px solid var(--border);border-radius:3px;
color:var(--text);font-family:var(--font);font-size:.85rem;padding:.5rem .7rem;width:70px}
button{background:var(--accent);color:#fff;border:none;border-radius:3px;font-family:var(--font);
font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;padding:.55rem 1rem;cursor:pointer;flex:1}
button.green{background:#1e6b4a}button.red{background:#6b1e1e}button.amber{background:#5a4010}
.msg{padding:.6rem 1rem;border-radius:3px;font-size:.8rem;margin-bottom:1rem;
border:1px solid var(--accent);background:#1a1a2e;color:var(--accent)}
.hint{font-size:.65rem;color:var(--dim);margin-top:.5rem}form{margin:0}
</style></head><body>
<h1>Performance Reality</h1><div class="sub">admin control panel</div>
<?php if($action_msg): ?><div class="panel"><div class="msg"><?=htmlspecialchars($action_msg)?></div></div><?php endif; ?>
<div class="panel"><h2>session status</h2>
<div class="status-row"><span class="dot <?=$enabled?'on':'off'?>"></span>
<span><?=$enabled?'uploads active':'uploads disabled'?></span></div>
<?php if($enabled): ?>
<div class="countdown" id="cd"><?=sprintf('%02d:%02d:%02d',$hLeft,$mLeft,$sLeft)?></div>
<div class="expire-label">expires at <?=date('g:i:s A',$state['expires_at'])?></div>
<?php endif; ?>
<div class="stats">
<div class="stat"><div class="num"><?=$counts['photos']?></div><div class="lbl">photos</div></div>
<div class="stat"><div class="num"><?=$counts['videos']?></div><div class="lbl">videos</div></div>
<div class="stat"><div class="num"><?=$counts['text']?></div><div class="lbl">text</div></div>
</div>
<div style="text-align:center;padding:.5rem;border:1px solid var(--border);border-radius:3px">
<span style="font-size:1rem;color:var(--amber)"><?=$counts['total_mb']?> MB</span> on disk</div></div>

<div class="panel"><h2>enable uploads</h2>
<form method="POST"><input type="hidden" name="key" value="<?=htmlspecialchars(ADMIN_KEY)?>">
<input type="hidden" name="action" value="enable">
<div class="row"><input class="hours-input" type="number" name="hours" value="<?=SESSION_HOURS?>" min="1" max="24">
<button class="green" type="submit">⏻ enable for N hours</button></div>
<p class="hint">Resets any existing session.</p></form></div>
<?php if($enabled): ?>
<div class="panel"><h2>extend current session</h2>
<form method="POST"><input type="hidden" name="key" value="<?=htmlspecialchars(ADMIN_KEY)?>">
<input type="hidden" name="action" value="extend">
<div class="row"><input class="hours-input" type="number" name="hours" value="2" min="1" max="12">
<button class="amber" type="submit">⊕ add N hours</button></div></form></div>
<?php endif; ?>
<div class="panel"><h2>disable uploads</h2>
<form method="POST"><input type="hidden" name="key" value="<?=htmlspecialchars(ADMIN_KEY)?>">
<input type="hidden" name="action" value="disable">
<button class="red" type="submit">⏹ disable immediately</button></form></div>
<div class="panel"><h2>⚠ clear all participant files</h2>
<form method="POST" onsubmit="return confirm('Delete ALL uploaded files?')">
<input type="hidden" name="key" value="<?=htmlspecialchars(ADMIN_KEY)?>">
<input type="hidden" name="action" value="clear_files">
<button class="red" type="submit">🗑 delete all uploads</button>
<p class="hint">Use after downloading everything to your performance machine.</p></form></div>
<div class="hint" style="margin-top:1rem">upload portal: <a href="index.php" style="color:var(--accent)" target="_blank">index.php</a></div>
<?php if($enabled): ?>
<script>(function(){var e=<?=$state['expires_at']?>;function t(){var l=Math.max(0,e-Math.floor(Date.now()/1000));
if(!l){location.reload();return;}var h=Math.floor(l/3600),m=Math.floor((l%3600)/60),s=l%60;
var el=document.getElementById('cd');if(el)el.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
t();setInterval(t,1000);})();</script><?php endif; ?>
</body></html>
