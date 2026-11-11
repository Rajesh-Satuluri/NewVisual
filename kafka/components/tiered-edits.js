/*
 * tiered-edits.js — make each "Level Up Your Answer" card editable in place,
 * and keep the edits synced across devices.
 *
 * The Answers page renders each tiered item (question + Weak/Good/Senior tier
 * bodies + "why the senior answer wins") with createTieredAnswer(). This module
 * lets the user edit all of that content inline, inside the expanded card.
 *
 * STORAGE — one key per card so concurrent edits on different cards never
 * collide under sync:
 *   kafka_taedit_<id>  ->  { question?, topic?, tiers?: [b0,b1,b2], whySenior? }
 * Only changed fields are stored; tier bodies keep their index alignment. The
 * kafka_ prefix means cloudsync.js carries these automatically (3-way
 * last-write-wins per card). Reset removes the key.
 *
 * Overrides are applied at render time (so the collapsed card head shows the
 * edited question/topic too) via mergeOverride(), and re-applied on the
 * kafka:cloud-refresh event so an edit from another device shows up live.
 */
import { cloud } from './cloudsync.js';

const PREFIX = 'kafka_taedit_';
const keyFor = id => `${PREFIX}${id}`;

export function loadOverride(id) {
  try {
    const raw = localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}

function saveOverride(id, obj) {
  try {
    const has = obj && (typeof obj.question === 'string' || typeof obj.topic === 'string' ||
      typeof obj.whySenior === 'string' || Array.isArray(obj.tiers));
    if (has) localStorage.setItem(keyFor(id), JSON.stringify(obj));
    else localStorage.removeItem(keyFor(id));
  } catch (e) {}
}

export function hasOverride(id) { return !!loadOverride(id); }

// Returns a copy of `item` with any stored override applied. Tier bodies are
// merged by index; the tier labels are fixed and never overridden.
export function mergeOverride(item) {
  const ov = loadOverride(item.id);
  if (!ov) return item;
  const merged = { ...item };
  if (typeof ov.question === 'string') merged.question = ov.question;
  if (typeof ov.topic === 'string') merged.topic = ov.topic;
  if (typeof ov.whySenior === 'string') merged.whySenior = ov.whySenior;
  if (Array.isArray(ov.tiers)) {
    merged.tiers = item.tiers.map((t, i) =>
      typeof ov.tiers[i] === 'string' ? { ...t, body: ov.tiers[i] } : t);
  }
  return merged;
}

// Wire the ✎ Edit control into a rendered tiered-answer body. `orig` is the
// pristine item (no override); `onSaved` is called after save/reset so the
// caller can re-render the card (updating the collapsed head too).
export function initTieredEdits(body, orig, onSaved) {
  const card = body.querySelector('.ta[data-ta]');
  if (!card || card.querySelector('.tae-tools')) return;

  const tools = document.createElement('div');
  tools.className = 'tae-tools';
  tools.innerHTML =
    `<span class="iqe-badge tae-badge"${hasOverride(orig.id) ? '' : ' hidden'} title="You have edited this card">edited</span>` +
    `<button type="button" class="iqe-edit tae-edit" aria-label="Edit this answer">✎ Edit</button>`;
  card.insertBefore(tools, card.firstChild);

  tools.querySelector('.tae-edit').addEventListener('click', () => enterEdit(body, card, orig, onSaved));
}

function enterEdit(body, card, orig, onSaved) {
  if (card.classList.contains('tae-editing')) return;
  card.classList.add('tae-editing');
  const cur = mergeOverride(orig);
  const labels = orig.tiers.map(t => t.label);

  card.innerHTML = `
    <div class="iqe-editor tae-editor">
      <label class="iqe-label">Question</label>
      <div class="iqe-field tae-q" contenteditable="true" role="textbox" aria-label="Edit question">${cur.question}</div>
      <label class="iqe-label">Topic</label>
      <div class="iqe-field tae-topic" contenteditable="true" role="textbox" aria-label="Edit topic">${cur.topic}</div>
      ${cur.tiers.map((t, i) => `
        <label class="iqe-label">${labels[i]} answer</label>
        <div class="iqe-field tae-tier" data-i="${i}" contenteditable="true" role="textbox" aria-label="Edit ${labels[i]} answer">${t.body}</div>`).join('')}
      <label class="iqe-label">Why the Senior answer wins</label>
      <div class="iqe-field tae-why" contenteditable="true" role="textbox" aria-label="Edit why the senior answer wins">${cur.whySenior}</div>
      <div class="iqe-actions">
        <button type="button" class="iqe-btn iqe-save tae-save">Save</button>
        <button type="button" class="iqe-btn iqe-cancel tae-cancel">Cancel</button>
        <button type="button" class="iqe-btn iqe-reset tae-reset"${hasOverride(orig.id) ? '' : ' hidden'}>Reset to original</button>
      </div>
      <div class="iqe-hint">Your edits are private to you and sync across your devices when cloud sync is on.</div>
    </div>`;

  card.querySelector('.tae-q')?.focus();

  const save = () => {
    const q = (card.querySelector('.tae-q').innerHTML || '').trim();
    const topic = (card.querySelector('.tae-topic').innerHTML || '').trim();
    const why = (card.querySelector('.tae-why').innerHTML || '').trim();
    const tierEls = [...card.querySelectorAll('.tae-tier')];
    const next = {};
    if (q && q !== orig.question.trim()) next.question = q;
    if (topic && topic !== orig.topic.trim()) next.topic = topic;
    if (why && why !== orig.whySenior.trim()) next.whySenior = why;
    const tiers = [];
    let tierChanged = false;
    tierEls.forEach(el => {
      const i = +el.dataset.i;
      const b = (el.innerHTML || '').trim();
      tiers[i] = b;
      if (b !== (orig.tiers[i]?.body || '').trim()) tierChanged = true;
    });
    if (tierChanged) next.tiers = tiers;
    saveOverride(orig.id, next);
    try { cloud.onLocalChange(); } catch (e) {}
    finish();
  };
  const finish = () => { card.classList.remove('tae-editing'); if (onSaved) onSaved(); };

  card.querySelector('.tae-save').addEventListener('click', save);
  card.querySelector('.tae-cancel').addEventListener('click', finish);
  card.querySelector('.tae-reset').addEventListener('click', () => {
    saveOverride(orig.id, null);
    try { cloud.onLocalChange(); } catch (e) {}
    finish();
  });
  card.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
  });
}
