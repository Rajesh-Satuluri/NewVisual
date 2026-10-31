/*
 * iq-edits.js — make each module's Interview Questions editable in place, and
 * keep the edits synced across devices.
 *
 * Every module renders its Q&A with createIQSection(IQ) into #tab-iq. This
 * enhancer runs right after initIQ() and, per question, adds an ✎ Edit control.
 * Editing happens inside the expanded answer (not in the toggle header, so it
 * never fights the open/close behaviour): the question and the answer become
 * editable, with Save / Cancel / Reset. An "edited" badge marks changed items.
 *
 * STORAGE — one key per question so concurrent edits on different questions
 * never collide under sync:
 *   kafka_iqedit_<moduleId>_<index>  ->  { "q": "...", "a": "<html>" }
 * The kafka_ prefix means cloudsync.js carries these automatically (3-way
 * last-write-wins per question). Reset removes the key.
 *
 * Overrides are re-applied on mount and on the kafka:cloud-refresh event, so an
 * edit made on another device shows up live.
 */
import { cloud } from './cloudsync.js';

const PREFIX = 'kafka_iqedit_';
const keyFor = (mid, i) => `${PREFIX}${mid}_${i}`;

function loadOverride(mid, i) {
  try {
    const raw = localStorage.getItem(keyFor(mid, i));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}
function saveOverride(mid, i, obj) {
  try {
    if (obj && (typeof obj.q === 'string' || typeof obj.a === 'string')) {
      localStorage.setItem(keyFor(mid, i), JSON.stringify(obj));
    } else {
      localStorage.removeItem(keyFor(mid, i));
    }
  } catch (e) {}
}

function qSpan(item) {
  // The question text span: the flex child that isn't the number or the chevron.
  const spans = item.querySelectorAll('.iq-question > span');
  for (const s of spans) {
    if (!s.classList.contains('q-num') && !s.classList.contains('q-chevron')) return s;
  }
  return null;
}
function aEl(item) { return item.querySelector('.iq-answer'); }

// Show the current (override-or-original) values in display mode + badge.
function applyDisplay(item, orig, mid, i) {
  const ov = loadOverride(mid, i);
  const qs = qSpan(item), ae = aEl(item);
  if (qs) qs.innerHTML = (ov && typeof ov.q === 'string') ? ov.q : orig.q;
  if (ae && !item.classList.contains('iqe-editing')) {
    ae.innerHTML = (ov && typeof ov.a === 'string') ? ov.a : orig.a;
  }
  const badge = item.querySelector('.iqe-badge');
  if (badge) badge.hidden = !ov;
  item.classList.toggle('iqe-edited', !!ov);
}

function enterEdit(item, orig, mid, i) {
  const ae = aEl(item);
  if (!ae) return;
  item.classList.add('open', 'iqe-editing');
  item.querySelector('.iq-question')?.setAttribute('aria-expanded', 'true');
  const ov = loadOverride(mid, i);
  const curQ = (ov && typeof ov.q === 'string') ? ov.q : orig.q;
  const curA = (ov && typeof ov.a === 'string') ? ov.a : orig.a;
  ae.innerHTML = `
    <div class="iqe-editor">
      <label class="iqe-label">Question</label>
      <div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question">${curQ}</div>
      <label class="iqe-label">Answer</label>
      <div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">${curA}</div>
      <div class="iqe-actions">
        <button type="button" class="iqe-btn iqe-save">Save</button>
        <button type="button" class="iqe-btn iqe-cancel">Cancel</button>
        <button type="button" class="iqe-btn iqe-reset"${ov ? '' : ' hidden'}>Reset to original</button>
      </div>
      <div class="iqe-hint">Your edits are private to you and sync across your devices when cloud sync is on.</div>
    </div>`;
  const qField = ae.querySelector('.iqe-q');
  const aField = ae.querySelector('.iqe-a');
  qField?.focus();

  const finish = () => { item.classList.remove('iqe-editing'); applyDisplay(item, orig, mid, i); };

  ae.querySelector('.iqe-save').addEventListener('click', () => {
    const q = (qField.innerHTML || '').trim();
    const a = (aField.innerHTML || '').trim();
    const next = {};
    if (q && q !== orig.q.trim()) next.q = q;
    if (a && a !== orig.a.trim()) next.a = a;
    saveOverride(mid, i, next);
    try { cloud.onLocalChange(); } catch (e) {}
    finish();
  });
  ae.querySelector('.iqe-cancel').addEventListener('click', finish);
  ae.querySelector('.iqe-reset').addEventListener('click', () => {
    saveOverride(mid, i, null);
    try { cloud.onLocalChange(); } catch (e) {}
    finish();
  });
  // Ctrl/Cmd+Enter saves, Esc cancels.
  ae.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ae.querySelector('.iqe-save').click(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
  });
}

let activeRefresh = null;

export function initIQEdits(container, moduleId) {
  if (!container || !moduleId) return;
  const items = [...container.querySelectorAll('#tab-iq .iq-item')];
  if (!items.length) return;

  // Capture originals from the freshly-rendered (raw) DOM, before applying any
  // override. createIQSection re-renders raw content on every mount, so this is
  // always the true original.
  const originals = items.map(item => {
    const qs = qSpan(item), ae = aEl(item);
    return { q: qs ? qs.innerHTML : '', a: ae ? ae.innerHTML : '' };
  });

  items.forEach((item, i) => {
    const orig = originals[i];
    const qRow = item.querySelector('.iq-question');
    if (qRow && !qRow.querySelector('.iqe-tools')) {
      const tools = document.createElement('span');
      tools.className = 'iqe-tools';
      tools.innerHTML =
        `<span class="iqe-badge" hidden title="You have edited this question">edited</span>` +
        `<button type="button" class="iqe-edit" aria-label="Edit this question">✎</button>`;
      // Insert before the chevron so it reads Q · [edited] [✎] · ▼.
      const chev = qRow.querySelector('.q-chevron');
      if (chev) qRow.insertBefore(tools, chev); else qRow.appendChild(tools);
      tools.querySelector('.iqe-edit').addEventListener('click', e => {
        e.stopPropagation();           // don't trigger the open/close toggle
        enterEdit(item, orig, moduleId, i);
      });
    }
    applyDisplay(item, orig, moduleId, i);
  });

  // Live re-apply when another device's edit (or a pull) lands. Keep a single
  // active listener so navigating between modules never leaks handlers.
  if (activeRefresh) window.removeEventListener('kafka:cloud-refresh', activeRefresh);
  activeRefresh = () => {
    items.forEach((item, i) => {
      if (!item.classList.contains('iqe-editing')) applyDisplay(item, originals[i], moduleId, i);
    });
  };
  window.addEventListener('kafka:cloud-refresh', activeRefresh);
}
