# PerfReal // Participant Upload System
## Setup & Operations Guide

---

### WHAT THIS IS

A time-bounded participant media upload portal for live performance.
Participants visit `chriso.org/uploads/`, enter the session password,
and upload photos, video, or text. Files auto-sort into subfolders.
You flip it on. It dies in 6 hours. You sync the files to MadMapper.

---

### YOUR KEYS

```
Upload password:   PerfReal1235
Admin URL:         https://chriso.org/uploads/admin.php?key=142c92cc32b9aefb42bbbf4a8065d3b1d087f5d8
```

**BOOKMARK THE ADMIN URL.** Don't share it. It's your only key.
If you want to change it, edit `ADMIN_KEY` in `admin.php`.

---

### SERVER SETUP (one time)

1. **Upload these files to `chriso.org/uploads/`** via Dreamhost
   file manager or SFTP (Cyberduck, Transmit, etc.):
   ```
   index.php
   admin.php
   setup.php
   .htaccess        ← Dreamhost file manager may hide dotfiles; use SFTP
   ```

2. **Run the setup script once:**
   Visit `https://chriso.org/uploads/setup.php` in your browser.
   It creates:
   ```
   uploads/participantFiles/
   uploads/participantFiles/photos/
   uploads/participantFiles/videos/
   uploads/participantFiles/text/
   uploads/.upload_state.json
   ```
   Check all lines say ✓.

3. **DELETE setup.php immediately** via Dreamhost file manager.

4. **Verify `.htaccess` is uploaded.** Dreamhost file manager often
   hides dotfiles. Use SFTP and enable "show hidden files."

5. **Test:** visit `https://chriso.org/uploads/` — you should see
   the "uploads offline" screen.

---

### USING IT (per performance)

**To enable uploads:**
1. Open your bookmarked admin URL
2. Set hours (default 6), click **Enable**
3. Share the upload page URL with participants:
   `https://chriso.org/uploads/`
4. Password: `PerfReal1235`

**During the performance:**
- On your performance machine, run the watch script (see below)
- MadMapper sees new files appear in the folder automatically

**To disable early:**
- Hit **Disable Immediately** on the admin page

**After the performance:**
- Hit **Delete All Uploads** on admin page after you've downloaded
  everything (or keep them — Dreamhost has plenty of space)

---

### LOCAL SETUP (performance machine)

1. **Copy both shell scripts somewhere permanent:**
   ```
   ~/bin/perfreal_sync_once.sh
   ~/bin/perfreal_sync_watch.sh
   ```

2. **Make them executable:**
   ```bash
   chmod +x ~/bin/perfreal_sync_once.sh
   chmod +x ~/bin/perfreal_sync_watch.sh
   ```

3. **Edit the config block at the top of each script:**
   ```bash
   DREAMHOST_USER="chriso"       # Your actual SSH username
   DREAMHOST_HOST="chriso.org"   # Or your Dreamhost SSH hostname
   ```
   
   To find your SSH hostname: Dreamhost Panel →
   Manage Users → click your user → SSH Access hostname.
   (Often: `yourserver.dreamhost.com`)

4. **Set up SSH key auth (strongly recommended for live use):**
   ```bash
   ssh-keygen -t ed25519 -C "perfreal-sync"
   ssh-copy-id DREAMHOST_USER@DREAMHOST_HOST
   ```
   This lets rsync run without prompting for a password —
   essential during a performance.

5. **Test the one-shot sync:**
   ```bash
   ~/bin/perfreal_sync_once.sh
   ```

---

### MADMAPPER SETUP

1. In MadMapper, open the **Media Browser** (Cmd+2 or Window menu)
2. Click **+** to add a folder
3. Navigate to:
   ```
   ~/PerfRealMedia/participants/photos/
   ~/PerfRealMedia/participants/videos/
   ```
   Add both folders.

4. MadMapper auto-refreshes when new files appear in watched folders.
   (If not: right-click the folder in Media Browser → Refresh)

---

### RUNNING THE LIVE SYNC

**During a performance, in a Terminal window:**
```bash
~/bin/perfreal_sync_watch.sh        # syncs every 30 seconds (default)
~/bin/perfreal_sync_watch.sh 15     # syncs every 15 seconds
~/bin/perfreal_sync_watch.sh 60     # syncs every 60 seconds
```

You'll see a live readout:
```
[22:14:30] · no new files (12 total)
[22:15:00] ✓ +3 new file(s) — total: 15 files (3 this session)
             → 20241215_221459_sunset.jpg
             → 20241215_221459_clip.mp4
```

---

### FOLDER STRUCTURE

```
Server (Dreamhost):
uploads/
├── index.php                 — participant upload page
├── admin.php                 — your admin panel
├── .htaccess                 — security rules
├── .upload_state.json        — enable/disable state (hidden)
└── participantFiles/
    ├── photos/               → jpg, png, gif, webp, heic, tiff
    ├── videos/               → mp4, mov, avi, mkv, webm
    └── text/                 → txt, pdf, rtf, doc

Local (your Mac):
~/PerfRealMedia/participants/
├── photos/     ← MadMapper watches this
├── videos/     ← MadMapper watches this
└── text/
```

---

### SECURITY NOTES

- The auto-disable is the primary safety: uploads simply stop working
  when the timer expires, with no action needed from you
- The `.htaccess` blocks PHP execution inside `participantFiles/`,
  preventing anyone from uploading a malicious script
- The `.upload_state.json` file is blocked from direct web access
- MIME type checking (not just extension) prevents basic spoofing
- If you want to change the upload password between shows,
  edit `UPLOAD_PASSWORD` in `index.php`
- If you want to change the admin key, edit `ADMIN_KEY` in `admin.php`

---

### DREAMHOST SPACE

To check your disk usage:
Dreamhost Panel → Manage Users → Disk Usage
Or via SSH: `du -sh ~/chriso.org/uploads/participantFiles/`

---

### EXPANDING LATER

- **OSC trigger to MadMapper** — could fire an OSC message on each
  new file to trigger a MadMapper cue automatically
- **Multiple password tiers** — different passwords for different
  participant groups (e.g., performers vs. audience)
- **Auto-download at session end** — cron job that rsync's at the
  6-hour mark before files are cleared
- **Thumbnail gallery** — admin panel could show a live grid of
  uploaded images
