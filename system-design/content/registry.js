// ── Active-track registry (shared singleton) ─────────────────────────────────
// `reg` is a single mutable object that always holds the *currently active*
// track's concept + question registry. Components import { reg } and read
// reg.CONCEPTS / reg.QUESTIONS / … at render time, so switching tracks is just
// loadTrack(id) + a re-render — no page reload, no stale imports. Because the
// object identity never changes (only its fields are reassigned), every
// importer stays pointed at live data.

import { TRACKS } from './tracks.js';

export const reg = {
  trackId: 'swe',
  track: TRACKS.swe,
  // concepts
  CONCEPTS: [],
  CONCEPT_LOADERS: {},
  CONCEPT_GROUPS: [],
  CONCEPT_PREFIX: 'c:',
  conceptMeta: () => null,
  builtConceptCount: () => 0,
  // questions
  QUESTIONS: [],
  LOADERS: {},
  CATEGORY_ORDER: [],
  CATEGORY_LABEL: {},
  DIFFICULTY_ORDER: ['Fundamental', 'Intermediate', 'Advanced'],
  allTags: () => [],
};

// Load a track's modules into `reg`. Returns reg once populated.
export async function loadTrack(id) {
  const track = TRACKS[id] || TRACKS.swe;
  const [c, q] = await Promise.all([track.concepts(), track.questions()]);
  Object.assign(reg, {
    trackId: track.id,
    track,
    CONCEPTS: c.CONCEPTS,
    CONCEPT_LOADERS: c.CONCEPT_LOADERS,
    CONCEPT_GROUPS: c.CONCEPT_GROUPS,
    CONCEPT_PREFIX: c.CONCEPT_PREFIX || 'c:',
    conceptMeta: c.conceptMeta,
    builtConceptCount: c.builtConceptCount,
    QUESTIONS: q.QUESTIONS || [],
    LOADERS: q.LOADERS || {},
    CATEGORY_ORDER: q.CATEGORY_ORDER || [],
    CATEGORY_LABEL: q.CATEGORY_LABEL || {},
    DIFFICULTY_ORDER: q.DIFFICULTY_ORDER || ['Fundamental', 'Intermediate', 'Advanced'],
    allTags: q.allTags || (() => []),
  });
  return reg;
}
