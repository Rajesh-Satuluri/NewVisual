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
