<?php
session_start();
define('UPLOAD_PASSWORD', 'PerfReal1235');
define('STATE_FILE',      __DIR__ . '/.upload_state.json');
define('UPLOAD_BASE',     __DIR__ . '/participantFiles/');
define('SESSION_HOURS',   6);
define('MAX_MB',          200);

$TYPE_MAP = [
    'image/jpeg'=>'photos','image/png'=>'photos','image/gif'=>'photos',
    'image/webp'=>'photos','image/heic'=>'photos','image/heif'=>'photos','image/tiff'=>'photos',
    'video/mp4'=>'videos','video/quicktime'=>'videos','video/avi'=>'videos',
    'video/x-msvideo'=>'videos','video/mpeg'=>'videos','video/webm'=>'videos','video/x-matroska'=>'videos',
    'text/plain'=>'text','application/pdf'=>'text','application/msword'=>'text',
    'application/rtf'=>'text','text/rtf'=>'text',
];

function loadState(): array {
    if (!file_exists(STATE_FILE)) return ['enabled'=>false,'enabled_at'=>null,'expires_at'=>null];
    $d = json_decode(file_get_contents(STATE_FILE), true);
    return is_array($d) ? $d : ['enabled'=>false,'enabled_at'=>null,'expires_at'=>null];
}
function saveState(array $s): void { file_put_contents(STATE_FILE, json_encode($s, JSON_PRETTY_PRINT)); }
function checkEnabled(): bool {
    $s = loadState();
    if (!$s['enabled']) return false;
    if (time() >= $s['expires_at']) { saveState(['enabled'=>false,'enabled_at'=>null,'expires_at'=>null]); return false; }
    return true;
}

$msg = ''; $msg_type = 'info';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['pw_submit'])) {
        if (!checkEnabled()) { $msg = 'Uploads are currently disabled.'; $msg_type = 'error'; }
        elseif ($_POST['password'] === UPLOAD_PASSWORD) {
            $_SESSION['perfreal_authed'] = true;
            header('Location: ' . strtok($_SERVER['REQUEST_URI'],'?')); exit;
        } else { $msg = 'Incorrect password.'; $msg_type = 'error'; }
    }
    if (isset($_POST['file_submit']) && !empty($_FILES['upload_file']['name'])) {
        if (!checkEnabled()) { $msg = 'Session expired.'; $msg_type = 'error'; unset($_SESSION['perfreal_authed']); }
        elseif (empty($_SESSION['perfreal_authed'])) { $msg = 'Not authenticated.'; $msg_type = 'error'; }
        else {
            $file = $_FILES['upload_file']; $maxB = MAX_MB*1024*1024;
            $errCodes = [UPLOAD_ERR_INI_SIZE=>'Exceeds server limit.',UPLOAD_ERR_FORM_SIZE=>'Exceeds form limit.',
                UPLOAD_ERR_PARTIAL=>'Partial upload.',UPLOAD_ERR_NO_FILE=>'No file sent.',
                UPLOAD_ERR_NO_TMP_DIR=>'No temp folder.',UPLOAD_ERR_CANT_WRITE=>'Write failed.'];
            if ($file['error'] !== UPLOAD_ERR_OK) { $msg = $errCodes[$file['error']] ?? 'Error #'.$file['error']; $msg_type='error'; }
            elseif ($file['size'] > $maxB) { $msg = 'Too large. Max '.MAX_MB.'MB.'; $msg_type='error'; }
            else {
                $mime = mime_content_type($file['tmp_name']);
                $subdir = $GLOBALS['TYPE_MAP'][$mime] ?? null;
                if (!$subdir) { $msg = 'Type not allowed: '.htmlspecialchars($mime); $msg_type='error'; }
                else {
                    $targetDir = UPLOAD_BASE.$subdir.'/';
                    if (!is_dir($targetDir)) mkdir($targetDir,0755,true);
                    $ext = strtolower(pathinfo($file['name'],PATHINFO_EXTENSION));
                    $safe = preg_replace('/[^a-zA-Z0-9_-]/','_',pathinfo($file['name'],PATHINFO_FILENAME));
                    $fname = date('Ymd_His').'_'.$safe.'.'.$ext;
                    if (move_uploaded_file($file['tmp_name'],$targetDir.$fname)) { $msg='✓ Uploaded to '.$subdir.': '.$fname; $msg_type='success'; }
                    else { $msg='Write failed. Check permissions.'; $msg_type='error'; }
                }
            }
        }
    }
}
$enabled = checkEnabled(); $state = loadState();
$authed = !empty($_SESSION['perfreal_authed']);
if (!$enabled) { unset($_SESSION['perfreal_authed']); $authed = false; }
$timeLeft = $enabled ? max(0,$state['expires_at']-time()) : 0;
$hLeft=floor($timeLeft/3600); $mLeft=floor(($timeLeft%3600)/60); $sLeft=$timeLeft%60;

?><!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PerfReal // Participant Upload</title><style>
:root{--bg:#0a0a0f;--panel:#111118;--border:#2a2a3a;--accent:#7b5ea7;
--green:#3ecf8e;--red:#e05c5c;--text:#ccc8d8;--dim:#666;--font:'Courier New',Courier,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;
display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem}
header{text-align:center;margin-bottom:2.5rem}
header h1{font-size:1.2rem;letter-spacing:.3em;color:var(--accent);text-transform:uppercase}
header p{font-size:.75rem;color:var(--dim);margin-top:.4rem;letter-spacing:.15em}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:4px;padding:2rem;width:100%;max-width:500px}
.status{display:flex;align-items:center;gap:.6rem;font-size:.8rem;letter-spacing:.1em;margin-bottom:1.5rem}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot.on{background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s infinite}
.dot.off{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.countdown{font-size:1.4rem;color:var(--green);letter-spacing:.2em;text-align:center;margin-bottom:1.5rem}
.countdown small{display:block;font-size:.65rem;color:var(--dim);margin-top:.25rem;letter-spacing:.1em}
label{display:block;font-size:.7rem;letter-spacing:.15em;color:var(--dim);margin-bottom:.4rem;text-transform:uppercase}
input[type=password],input[type=file]{width:100%;background:var(--bg);border:1px solid var(--border);
border-radius:3px;color:var(--text);font-family:var(--font);font-size:.9rem;padding:.6rem .8rem;
margin-bottom:1rem;outline:none;transition:border-color .2s}
input[type=password]:focus,input[type=file]:focus{border-color:var(--accent)}
button[type=submit]{width:100%;background:var(--accent);color:#fff;border:none;border-radius:3px;
font-family:var(--font);font-size:.85rem;letter-spacing:.15em;text-transform:uppercase;padding:.75rem;cursor:pointer}
.msg{padding:.7rem 1rem;border-radius:3px;font-size:.8rem;margin-bottom:1rem}
.msg.success{background:#0e2a1f;border:1px solid var(--green);color:var(--green)}
.msg.error{background:#2a0e0e;border:1px solid var(--red);color:var(--red)}
.accepted{font-size:.7rem;color:var(--dim);margin-bottom:1rem;line-height:1.6}
.disabled-msg{text-align:center;padding:2rem 0}
.disabled-msg .big{font-size:1.5rem;color:var(--dim);margin-bottom:1rem}
.disabled-msg p{font-size:.8rem;color:var(--dim);letter-spacing:.1em}
.hint{font-size:.7rem;color:var(--dim);margin-top:1rem;text-align:center}
</style></head><body>
<header><h1>Performance Reality</h1><p>participant media upload</p></header>
<div class="panel">
<?php if($msg): ?><div class="msg <?=$msg_type?>"><?=htmlspecialchars($msg)?></div><?php endif; ?>
<?php if(!$enabled): ?>
<div class="disabled-msg"><div class="big">◉</div>
<div class="status" style="justify-content:center"><span class="dot off"></span><span>uploads offline</span></div>
<p>This portal is not currently active.<br>Check with the organiser.</p></div>
<?php elseif(!$authed): ?>
<div class="status"><span class="dot on"></span><span>uploads active</span></div>
<div class="countdown" id="countdown"><?=sprintf('%02d:%02d:%02d',$hLeft,$mLeft,$sLeft)?>
<small>remaining in this session</small></div>
<form method="POST"><label for="pw">session password</label>
<input type="password" id="pw" name="password" autocomplete="off" autofocus placeholder="••••••••••••">
<button type="submit" name="pw_submit" value="1">enter</button></form>
<?php else: ?>
<div class="status"><span class="dot on"></span><span>uploads active — <?=sprintf('%02d:%02d',$hLeft,$mLeft)?> remaining</span></div>
<p class="accepted">jpg · png · gif · webp · heic · tiff<br>mp4 · mov · avi · mkv · webm<br>txt · pdf · rtf · doc<br>Max: <?=MAX_MB?> MB</p>
<form method="POST" enctype="multipart/form-data">
<input type="hidden" name="MAX_FILE_SIZE" value="<?=MAX_MB*1024*1024?>">
<label for="upload_file">choose file</label>
<input type="file" id="upload_file" name="upload_file" accept="image/*,video/*,text/plain,application/pdf">
<button type="submit" name="file_submit" value="1">upload</button></form>
<p class="hint">Files sort automatically into photos / videos / text</p>
<?php endif; ?></div>
<?php if($enabled): ?><script>(function(){var e=<?=$state['expires_at']?>;
function t(){var l=Math.max(0,e-Math.floor(Date.now()/1000));if(!l){location.reload();return;}
var h=Math.floor(l/3600),m=Math.floor((l%3600)/60),s=l%60;
var el=document.querySelector('.countdown');
if(el)el.childNodes[0].textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
t();setInterval(t,1000);})();</script><?php endif; ?>
</body></html>
