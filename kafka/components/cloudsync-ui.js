/*
 * cloudsync-ui.js — the header control + dialog for cross-device cloud sync.
 *
 * Adds a ☁ button to the top-bar header actions (next to the theme toggle) that
 * opens a small dialog: set / generate a shared sync code, link the device, sync
 * on demand, disconnect, or export / import a local JSON backup. All the actual
 * syncing lives in cloudsync.js; this file is purely the UI.
 *
 * Styled entirely with the app's own CSS tokens (--bg2, --border, --text,
 * --accent, …) so it is correct in both themes, which the app switches via the
 * data-theme attribute (not prefers-color-scheme).
 */
import { cloud } from './cloudsync.js';

const CSS = `
.cs-overlay{position:fixed;inset:0;z-index:4000;display:flex;align-items:center;
  justify-content:center;padding:16px;background:rgba(5,8,16,.62);
  -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);}
.cs-overlay[hidden]{display:none;}
.cs-card{width:100%;max-width:460px;box-sizing:border-box;background:var(--bg2);
  color:var(--text);border:1px solid var(--border);border-radius:14px;
  box-shadow:0 24px 70px rgba(0,0,0,.45);padding:22px 22px 18px;
  font:14px/1.55 inherit;}
.cs-card h2{margin:0 0 4px;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--text);}
.cs-sub{margin:0 0 14px;color:var(--text3);font-size:12.5px;}
.cs-row{display:flex;gap:8px;margin:10px 0;}
.cs-row input{flex:1;min-width:0;padding:10px 12px;border-radius:9px;
  border:1px solid var(--border);background:var(--bg3);color:var(--text);
  font:600 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.5px;}
.cs-row input:focus{outline:none;border-color:var(--accent);
  box-shadow:0 0 0 3px var(--accent-lo);}
.cs-btn{cursor:pointer;border-radius:9px;border:1px solid var(--border);
  padding:9px 13px;font:600 13px/1 inherit;white-space:nowrap;background:var(--bg3);
  color:var(--text);transition:background .12s,border-color .12s;}
.cs-btn:hover{border-color:var(--accent);}
.cs-btn-primary{background:var(--accent);color:#1a1200;border-color:var(--accent);}
.cs-btn-primary:hover{filter:brightness(1.07);}
.cs-btn-danger{color:var(--red);}
.cs-btn-danger:hover{border-color:var(--red);background:rgba(239,68,68,.1);}
.cs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center;}
.cs-actions .cs-spacer{flex:1;}
.cs-status{margin-top:12px;font-size:12.5px;min-height:1.2em;color:var(--text2);
  font-variant-numeric:tabular-nums;}
.cs-divider{height:1px;background:var(--border);margin:16px 0 12px;}
.cs-backup{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.cs-backup .cs-backup-label{font-size:12px;color:var(--text3);flex:1;min-width:120px;}
.cs-note{margin-top:14px;font-size:11.5px;color:var(--text3);line-height:1.5;}
.cs-warn{margin:10px 0;padding:10px 12px;border-radius:9px;font-size:12px;color:var(--text2);
  background:var(--accent-lo);border:1px solid var(--border);}
.cs-warn code{font-family:ui-monospace,Menlo,monospace;color:var(--accent);}
`;

let overlay = null, codeInput = null, statusEl = null, fileInput = null;

function injectStyleOnce() {
  if (document.getElementById('cs-style')) return;
  const st = document.createElement('style');
  st.id = 'cs-style';
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
}

function setStatus(txt) { if (statusEl) statusEl.textContent = txt || ''; }

function download(name, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  } catch (e) { setStatus('Export failed: ' + e.message); }
}

function exportBackup() {
  const d = new Date();
  const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  download('kafka-progress-backup-' + stamp + '.json',
    JSON.stringify(cloud.exportState(), null, 2));
  setStatus('Backup downloaded ✓');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let obj;
    try { obj = JSON.parse(reader.result); }
    catch (e) { setStatus('Import failed: not valid JSON'); return; }
    const changed = cloud.importState(obj);
    setStatus(changed ? 'Backup imported & merged ✓' : 'Nothing new to import');
  };
  reader.onerror = () => setStatus('Import failed: could not read file');
  reader.readAsText(file);
}

function buildModal() {
  if (overlay) return overlay;
  injectStyleOnce();

  overlay = document.createElement('div');
  overlay.className = 'cs-overlay';
  overlay.setAttribute('hidden', '');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Cloud sync settings');

  const card = document.createElement('div');
  card.className = 'cs-card';
  overlay.appendChild(card);

  card.innerHTML = `
    <h2>☁ Sync across devices</h2>
    <p class="cs-sub">Keep your progress, quiz scores, review schedule, notes and
      code pads in sync on every device. Type the same secret sync code on each
      one — no account, no email. It's optional and off until you link.</p>`;

  if (!cloud.configured()) {
    const warn = document.createElement('div');
    warn.className = 'cs-warn';
    warn.innerHTML = 'Backend not configured yet. Add your Supabase ' +
      '<code>url</code> and <code>anonKey</code> in <code>kafka/supabase-config.js</code> ' +
      'and run <code>supabase/schema.sql</code> once, then reload. ' +
      'Local backup (export / import below) works regardless.';
    card.appendChild(warn);
  }

  const row = document.createElement('div');
  row.className = 'cs-row';
  codeInput = document.createElement('input');
  codeInput.type = 'text';
  codeInput.placeholder = 'your-sync-code';
  codeInput.autocomplete = 'off';
  codeInput.spellcheck = false;
  codeInput.setAttribute('aria-label', 'Sync code');
  const genBtn = document.createElement('button');
  genBtn.className = 'cs-btn';
  genBtn.type = 'button';
  genBtn.textContent = 'Generate';
  genBtn.addEventListener('click', () => {
    codeInput.value = cloud.generateCode();
    codeInput.focus(); codeInput.select();
  });
  row.appendChild(codeInput);
  row.appendChild(genBtn);
  card.appendChild(row);

  statusEl = document.createElement('div');
  statusEl.className = 'cs-status';
  card.appendChild(statusEl);

  const actions = document.createElement('div');
  actions.className = 'cs-actions';

  const linkBtn = document.createElement('button');
  linkBtn.className = 'cs-btn cs-btn-primary';
  linkBtn.type = 'button';
  linkBtn.textContent = 'Link & sync';
  linkBtn.addEventListener('click', () => {
    const code = (codeInput.value || '').trim();
    if (code.replace(/-/g, '').length < 8) { setStatus('Code must be at least 8 characters.'); return; }
    cloud.link(code);
  });

  const syncBtn = document.createElement('button');
  syncBtn.className = 'cs-btn';
  syncBtn.type = 'button';
  syncBtn.textContent = 'Sync now';
  syncBtn.addEventListener('click', () => cloud.pull({ force: true }));

  const discBtn = document.createElement('button');
  discBtn.className = 'cs-btn cs-btn-danger';
  discBtn.type = 'button';
  discBtn.textContent = 'Disconnect';
  discBtn.addEventListener('click', () => { cloud.unlink(); codeInput.value = ''; });

  const spacer = document.createElement('div');
  spacer.className = 'cs-spacer';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cs-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', close);

  actions.append(linkBtn, syncBtn, discBtn, spacer, closeBtn);
  card.appendChild(actions);

  const divider = document.createElement('div');
  divider.className = 'cs-divider';
  card.appendChild(divider);

  const backup = document.createElement('div');
  backup.className = 'cs-backup';
  const bl = document.createElement('div');
  bl.className = 'cs-backup-label';
  bl.textContent = 'Local backup — a JSON file of everything on this device.';
  const expBtn = document.createElement('button');
  expBtn.className = 'cs-btn';
  expBtn.type = 'button';
  expBtn.textContent = 'Export';
  expBtn.addEventListener('click', exportBackup);
  const impBtn = document.createElement('button');
  impBtn.className = 'cs-btn';
  impBtn.type = 'button';
  impBtn.textContent = 'Import';
  impBtn.addEventListener('click', () => fileInput.click());
  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) importBackup(fileInput.files[0]);
    fileInput.value = '';
  });
  backup.append(bl, expBtn, impBtn, fileInput);
  card.appendChild(backup);

  const note = document.createElement('p');
  note.className = 'cs-note';
  note.textContent = 'Keep your sync code private — anyone who has it can read and change your synced data. Your progress always stays saved locally too.';
  card.appendChild(note);

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (!overlay.hasAttribute('hidden') && e.key === 'Escape') close();
  });
  cloud.onStatus(setStatus);

  (document.body || document.documentElement).appendChild(overlay);
  return overlay;
}

function open() {
  buildModal();
  codeInput.value = cloud.getCode() || '';
  setStatus(cloud.status());
  overlay.removeAttribute('hidden');
  codeInput.focus();
}
function close() { if (overlay) overlay.setAttribute('hidden', ''); }

export function initCloudSyncUI() {
  const actions = document.querySelector('#module-header .header-actions');
  if (!actions || document.getElementById('cloud-sync-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'cloud-sync-btn';
  btn.className = 'icon-btn';
  btn.type = 'button';
  btn.title = 'Sync across devices';
  btn.setAttribute('aria-label', 'Cloud sync across devices');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>`;
  btn.addEventListener('click', open);
  actions.insertBefore(btn, actions.firstChild);

  // Reflect linked state with a dot on the icon via a title update on sync.
  cloud.onSync(() => { btn.title = cloud.syncLabel(); });
  cloud.onStatus(() => { btn.title = cloud.enabled() ? cloud.syncLabel() : 'Sync across devices'; });
}
