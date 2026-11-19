// ─────────────────────────────────────────────────────────────────────────
// Editable interview Q&A (Spec 3, Flink-adapted).
//
// Each Study-Hub Q&A card's question and answer become editable in place
// (WYSIWYG contentEditable, not a raw textarea). Overrides are stored under the
// single synced key `flink:iedit` as { "<moduleId>#<idx>": { q?, aHtml? } }.
// The `flink:` prefix means cloud sync carries edits across devices; a
// `flink:cloud-refresh` re-applies incoming edits live.
//
// Additive: if this module is absent, study.js renders exactly as before.
// ─────────────────────────────────────────────────────────────────────────

const STORE_KEY = 'flink:iedit';
const origMap = new Map(); // iqkey -> { q, aHtml }  (captured from freshly-rendered originals)

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) {}
  try { window.Flink && window.Flink.cloud && window.Flink.cloud.onLocalChange(); } catch (_) {}
}

function parts(item) {
  return {
    qText: item.querySelector('.q-text'),
    body: item.querySelector('.iq-answer-body'),
    qRow: item.querySelector('.iq-question'),
  };
}

// Apply overrides + inject Edit buttons. Call after each render of the list.
export function enhanceInterviewEdits(container) {
  const store = loadStore();
  container.querySelectorAll('.iq-item[data-iqkey]').forEach((item) => {
    const key = item.dataset.iqkey;
    const { qText, body, qRow } = parts(item);
    if (!qText || !body || !qRow) return;

    // Capture the freshly-rendered originals (study.js always renders from the
    // bank, so the DOM holds pristine content at this point).
    origMap.set(key, { q: qText.textContent, aHtml: body.innerHTML });

    // Apply any stored override on top.
    const ov = store[key];
    if (ov) {
      if (ov.q != null) qText.textContent = ov.q;
      if (ov.aHtml != null) body.innerHTML = ov.aHtml;
      item.classList.add('iq-edited');
    } else {
      item.classList.remove('iq-edited');
    }

    // Inject the Edit button once (in the question row, before the badge).
    if (!qRow.querySelector('.iq-edit-btn')) {
      const btn = document.createElement('button');
      btn.className = 'iq-edit-btn';
      btn.type = 'button';
      btn.title = 'Edit this question & answer';
      btn.textContent = '✎';
      btn.addEventListener('click', (e) => { e.stopPropagation(); enterEdit(item); });
      const badge = qRow.querySelector('.diff-badge');
      qRow.insertBefore(btn, badge || qRow.querySelector('.q-chevron'));
    }
    refreshBadge(item);
  });
}

function refreshBadge(item) {
  const key = item.dataset.iqkey;
  const edited = !!loadStore()[key];
  item.classList.toggle('iq-edited', edited);
  const qRow = item.querySelector('.iq-question');
  let badge = qRow.querySelector('.iq-badge');
  if (edited && !badge) {
    badge = document.createElement('span');
    badge.className = 'iq-badge';
    badge.textContent = 'edited';
    qRow.insertBefore(badge, qRow.querySelector('.q-chevron'));
  } else if (!edited && badge) {
    badge.remove();
  }
}

function enterEdit(item) {
  if (item.querySelector('.iq-edit-toolbar')) return; // already editing
  item.classList.add('open');
  const { qText, body, qRow } = parts(item);
  qRow.setAttribute('aria-expanded', 'true');

  qText.setAttribute('contenteditable', 'true');
  body.setAttribute('contenteditable', 'true');
  qText.classList.add('iq-editing');
  body.classList.add('iq-editing');

  const bar = document.createElement('div');
  bar.className = 'iq-edit-toolbar';
  bar.innerHTML = `
    <button type="button" class="iq-save btn btn-primary">Save</button>
    <button type="button" class="iq-cancel btn">Cancel</button>
    <button type="button" class="iq-reset btn">Reset</button>
    <span class="iq-edit-hint">Ctrl/⌘+Enter save · Esc cancel · Ctrl/⌘+B bold</span>`;
  body.after(bar);
  qText.focus();

  const key = item.dataset.iqkey;
  const orig = origMap.get(key) || { q: qText.textContent, aHtml: body.innerHTML };

  const finish = () => {
    qText.removeAttribute('contenteditable');
    body.removeAttribute('contenteditable');
    qText.classList.remove('iq-editing');
    body.classList.remove('iq-editing');
    bar.remove();
  };

  bar.querySelector('.iq-save').addEventListener('click', () => {
    const store = loadStore();
    const next = {};
    const q = qText.textContent.trim();
    const aHtml = body.innerHTML.trim();
    if (q !== orig.q) next.q = q;
    if (aHtml !== orig.aHtml) next.aHtml = aHtml;
    if (Object.keys(next).length) store[key] = next; else delete store[key];
    saveStore(store);
    finish();
    refreshBadge(item);
  });
  bar.querySelector('.iq-cancel').addEventListener('click', () => {
    qText.textContent = (loadStore()[key]?.q) ?? orig.q;
    body.innerHTML = (loadStore()[key]?.aHtml) ?? orig.aHtml;
    finish();
  });
  bar.querySelector('.iq-reset').addEventListener('click', () => {
    const store = loadStore();
    delete store[key];
    saveStore(store);
    qText.textContent = orig.q;
    body.innerHTML = orig.aHtml;
    finish();
    refreshBadge(item);
  });

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); bar.querySelector('.iq-cancel').click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); bar.querySelector('.iq-save').click(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); document.execCommand('bold'); }
  };
  qText.addEventListener('keydown', onKey);
  body.addEventListener('keydown', onKey);
}
