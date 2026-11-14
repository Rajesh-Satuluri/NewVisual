// ─────────────────────────────────────────────────────────────────────────
// Editable code blocks (Spec 4, Flink-adapted).
//
// Every `.code-block` becomes editable in place: an "Edit" button swaps the
// rendered <pre> for a monospace editor with Save / Cancel / Reset. Overrides
// are stored per-block (keyed by a hash of the ORIGINAL source so they stick
// across navigation and re-mounts) under the single synced key `flink:cvedit`.
// Because that key starts with `flink:`, cloud sync carries edits across
// devices automatically; a `flink:cloud-refresh` re-applies incoming edits live.
//
// Semantic blocks that ship pre-tokenised (the ride-event JSON payloads with
// .jk/.jv spans) are left alone — they're data, not editable source.
// ─────────────────────────────────────────────────────────────────────────
import { highlight, guessLang } from './highlight.js';

const STORE_KEY = 'flink:cvedit';
const origMap = new WeakMap(); // pre -> original source text

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) {}
  // setItem is wrapped by cloudsync; calling onLocalChange too is harmless/explicit.
  try { window.Flink && window.Flink.cloud && window.Flink.cloud.onLocalChange(); } catch (_) {}
}

// Stable, dependency-free 32-bit hash → base36.
function hashKey(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

function isSemantic(pre) {
  return !!pre.querySelector('.jk, .jv, .jc'); // pre-tokenised JSON payloads
}

function langFor(pre, src) {
  return pre.dataset.lang || guessLang(src);
}

// Apply stored overrides to any un-highlighted block. MUST run BEFORE
// highlightCodeBlocks so the override text gets tokenised.
export function applyCodeOverrides(root) {
  const store = loadStore();
  root.querySelectorAll('.code-block pre').forEach((pre) => {
    if (isSemantic(pre)) return;
    if (!origMap.has(pre)) origMap.set(pre, pre.textContent);
    const original = origMap.get(pre);
    const key = hashKey(original);
    const override = store[key];
    if (override != null && pre.dataset.cveApplied !== key) {
      pre.textContent = override;      // highlight pass will tokenise this
      pre.dataset.hl = '';             // force re-highlight
      pre.dataset.cveApplied = key;
      pre.closest('.code-block').classList.add('cv-edited');
    }
  });
}

// Add the Edit control + "edited" badge. Runs AFTER highlight + copy buttons.
export function injectEditButtons(root) {
  root.querySelectorAll('.code-block').forEach((block) => {
    const pre = block.querySelector('pre');
    if (!pre || isSemantic(pre)) return;
    if (block.dataset.cveEditable) { refreshBadge(block, pre); return; }
    block.dataset.cveEditable = '1';
    if (!origMap.has(pre)) origMap.set(pre, pre.textContent);

    const btn = document.createElement('button');
    btn.className = 'code-edit-btn';
    btn.type = 'button';
    btn.textContent = 'Edit';
    btn.addEventListener('click', () => enterEdit(block, pre));
    block.appendChild(btn);
    refreshBadge(block, pre);
  });
}

function refreshBadge(block, pre) {
  const original = origMap.get(pre) || pre.textContent;
  const store = loadStore();
  const edited = store[hashKey(original)] != null;
  block.classList.toggle('cv-edited', edited);
  let badge = block.querySelector('.cv-badge');
  if (edited && !badge) {
    badge = document.createElement('span');
    badge.className = 'cv-badge';
    badge.textContent = 'edited';
    block.appendChild(badge);
  } else if (!edited && badge) {
    badge.remove();
  }
}

function currentSource(pre) {
  const original = origMap.get(pre) || pre.textContent;
  const store = loadStore();
  return store[hashKey(original)] ?? original;
}

function enterEdit(block, pre) {
  if (block.querySelector('.cv-editor')) return; // already editing
  const original = origMap.get(pre) || pre.textContent;
  const lang = langFor(pre, original);
  const src = currentSource(pre);

  const wrap = document.createElement('div');
  wrap.className = 'cv-editor';
  const ta = document.createElement('textarea');
  ta.className = 'cv-textarea';
  ta.spellcheck = false;
  ta.value = src;
  ta.rows = Math.min(Math.max(src.split('\n').length + 1, 4), 40);

  const bar = document.createElement('div');
  bar.className = 'cv-toolbar';
  bar.innerHTML = `
    <button type="button" class="cv-save btn btn-primary">Save</button>
    <button type="button" class="cv-cancel btn">Cancel</button>
    <button type="button" class="cv-reset btn">Reset</button>`;

  wrap.appendChild(ta);
  wrap.appendChild(bar);
  pre.style.display = 'none';
  pre.after(wrap);
  // hide copy/edit buttons while editing
  block.querySelectorAll('.code-copy-btn, .code-edit-btn').forEach((b) => (b.style.display = 'none'));
  ta.focus();

  const finish = () => {
    wrap.remove();
    pre.style.display = '';
    block.querySelectorAll('.code-copy-btn, .code-edit-btn').forEach((b) => (b.style.display = ''));
  };
  const rerender = (text) => { pre.innerHTML = highlight(text, lang); pre.dataset.hl = lang; };

  bar.querySelector('.cv-save').addEventListener('click', () => {
    const val = ta.value;
    const store = loadStore();
    const key = hashKey(original);
    if (val === original) delete store[key]; else store[key] = val;
    saveStore(store);
    rerender(val);
    pre.dataset.cveApplied = key;
    finish();
    refreshBadge(block, pre);
  });
  bar.querySelector('.cv-cancel').addEventListener('click', finish);
  bar.querySelector('.cv-reset').addEventListener('click', () => {
    const store = loadStore();
    delete store[hashKey(original)];
    saveStore(store);
    rerender(original);
    delete pre.dataset.cveApplied;
    finish();
    refreshBadge(block, pre);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); bar.querySelector('.cv-save').click(); }
  });
}

// Live re-apply when a newer edit arrives from another device.
let bound = false;
export function bindCloudRefresh(getRoot) {
  if (bound) return;
  bound = true;
  window.addEventListener('flink:cloud-refresh', () => {
    const root = getRoot();
    if (!root) return;
    // forget applied flags so overrides re-apply against the incoming store
    root.querySelectorAll('.code-block pre').forEach((pre) => { delete pre.dataset.cveApplied; pre.dataset.hl = ''; });
    applyCodeOverrides(root);
    import('./highlight.js').then((m) => m.highlightCodeBlocks(root));
    root.querySelectorAll('.code-block').forEach((block) => {
      const pre = block.querySelector('pre'); if (pre) refreshBadge(block, pre);
    });
  });
}
