/*
 * iq-overrides.js — the single source of truth for user edits to interview Q&A.
 *
 * Every interview question lives once, in its module's exported `IQ` array
 * (modules/mXX-*.js), and is surfaced in two places: the module's own
 * "Interview Q&A" tab and the Study Hub. A user edit is stored as an override
 * keyed by (moduleId, index) so BOTH surfaces read the same record — edit a
 * question in the Study Hub and the module's own tab shows the edit too.
 *
 *   dbt-iqedit-<moduleId>-<index>  ->  { "q": "...", "a": "<html>" }
 *
 * One key per question so edits never collide. A null/empty override removes the
 * key (reset to original). localStorage-only — no account, no network; edits
 * stay on this device, which is stated in the editor hint.
 */
export const PREFIX = 'dbt-iqedit-';
export const keyFor = (mid, i) => `${PREFIX}${mid}-${i}`;

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
