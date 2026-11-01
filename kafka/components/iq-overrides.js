/*
 * iq-overrides.js — the single source of truth for user edits to interview Q&A.
 *
 * Every interview question lives once, in its module's exported `IQ` array
 * (modules/mXX-*.js), and is surfaced in two places: the module's own
 * "Interview Q&A" tab and the Study Hub. A user edit is stored as an override
 * keyed by (moduleId, index) so BOTH surfaces read and write the same record —
 * edit a question anywhere and it updates everywhere.
 *
 *   kafka_iqedit_<moduleId>_<index>  ->  { "q": "...", "a": "<html>" }
 *
 * One key per question so concurrent edits never collide under cloud sync, and
 * the kafka_ prefix means cloudsync.js carries them automatically (3-way
 * last-write-wins per question). A null/empty override removes the key (reset).
 */
import { cloud } from './cloudsync.js';

export const PREFIX = 'kafka_iqedit_';
export const keyFor = (mid, i) => `${PREFIX}${mid}_${i}`;

export function loadOverride(mid, i) {
  try {
    const raw = localStorage.getItem(keyFor(mid, i));
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}

export function saveOverride(mid, i, obj) {
  try {
    if (obj && (typeof obj.q === 'string' || typeof obj.a === 'string')) {
      localStorage.setItem(keyFor(mid, i), JSON.stringify(obj));
    } else {
      localStorage.removeItem(keyFor(mid, i));
    }
  } catch (e) {}
}

// Merge an override onto an original {q, a, ...} record, returning a new object
// with the user's edited text applied (or the original when there's no edit).
export function applyOverrideTo(orig, mid, i) {
  const ov = loadOverride(mid, i);
  if (!ov) return orig;
  return {
    ...orig,
    q: (typeof ov.q === 'string') ? ov.q : orig.q,
    a: (typeof ov.a === 'string') ? ov.a : orig.a,
    edited: true,
  };
}

// The hint shown under an open editor. When cross-device cloud sync is already
// linked, edits follow the user everywhere automatically. When it is NOT linked,
// the edit only lives on this device — so we surface an actionable call to set it
// up (the #cloud-sync-btn in the header opens the sync dialog). This is the step
// people miss: there is no login, so a device only receives another device's
// edits once both share a sync code.
export function syncHint() {
  let on = false;
  try { on = !!(cloud && cloud.enabled && cloud.enabled()); } catch (e) {}
  if (on) {
    return 'Saved to this question everywhere — the Study Hub, the module’s own Q&amp;A tab, and all your devices (cross-device sync is on).';
  }
  return 'Saved on this device, and it already shows in both the Study Hub and the module’s Q&amp;A tab. ' +
    'To see your edits on your phone and other devices too, ' +
    '<button type="button" class="iqe-synccta">turn on cross-device sync</button>.';
}

// Wire the "turn on cross-device sync" button (if present) to open the header's
// cloud-sync dialog. Safe to call even when the button isn't rendered.
export function wireSyncCta(root) {
  try {
    const cta = root && root.querySelector && root.querySelector('.iqe-synccta');
    if (!cta) return;
    cta.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const btn = document.getElementById('cloud-sync-btn');
      if (btn) btn.click();
    });
  } catch (e) {}
}
