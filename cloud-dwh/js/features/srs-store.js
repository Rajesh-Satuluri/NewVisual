/* ============================================================
   SRS Store — a tiny Leitner-box spaced-repetition scheduler
   persisted in localStorage. Deck-agnostic and reusable.

   Per card we keep { box, due, reps, lapses, ts }:
     - box    1..5, higher = better known, longer interval
     - due    epoch ms the card next becomes reviewable
     - reps   total successful ("got") reviews
     - lapses times reset to box 1 after a miss

   Grades: 'missed' → box 1, 'almost' → same box, 'got' → box+1.
   A card with no record yet is "new" and always due.

   Data: cdwh-srs-<deck> = { cards: { <id>: {box,due,reps,lapses,ts} } }
   Graceful if localStorage is unavailable (in-memory fallback).
   ============================================================ */
(function () {
  'use strict';

  const PREFIX = 'cdwh-srs-';
  // Interval each BOX earns, in minutes. Box 1 recurs within the session.
  const INTERVALS_MIN = [1, 10, 1440, 4320, 10080]; // 1m, 10m, 1d, 3d, 7d
  const MAX_BOX = INTERVALS_MIN.length;             // 5
  const LEARNED_BOX = 3;                            // box>=3 counts as "learned"

  const _mem = {}; // fallback when localStorage throws

  function _read(deck) {
    try {
      const raw = localStorage.getItem(PREFIX + deck);
      return (raw && JSON.parse(raw)) || { cards: {} };
    } catch (_) {
      return _mem[deck] || (_mem[deck] = { cards: {} });
    }
  }
  function _write(deck, rec) {
    _mem[deck] = rec;
    try { localStorage.setItem(PREFIX + deck, JSON.stringify(rec)); } catch (_) {}
  }
  function _interval(box) { return INTERVALS_MIN[Math.max(1, Math.min(MAX_BOX, box)) - 1] * 60000; }

  const SRS = {
    MAX_BOX: MAX_BOX,

    /** Raw record for a card, or null if never reviewed. */
    card(deck, id) { return _read(deck).cards[id] || null; },

    /** Is this card reviewable now? New cards are always due. */
    isDue(deck, id, now) {
      const c = _read(deck).cards[id];
      if (!c) return true;
      return (now || Date.now()) >= c.due;
    },

    /** Apply a grade and reschedule. grade: 'missed' | 'almost' | 'got'. */
    rate(deck, id, grade) {
      const rec = _read(deck);
      const now = Date.now();
      const prev = rec.cards[id] || { box: 1, due: now, reps: 0, lapses: 0, ts: now };
      let box = prev.box, reps = prev.reps, lapses = prev.lapses;
      if (grade === 'got') { box = Math.min(MAX_BOX, box + 1); reps += 1; }
      else if (grade === 'missed') { box = 1; lapses += 1; }
      // 'almost' → keep the same box, just reschedule.
      rec.cards[id] = { box: box, due: now + _interval(box), reps: reps, lapses: lapses, ts: now };
      _write(deck, rec);
      try { document.dispatchEvent(new CustomEvent('cdwh:srs', { detail: { deck: deck, id: id, grade: grade } })); } catch (_) {}
      return rec.cards[id];
    },

    /** IDs (from allIds, order preserved) that are due now. */
    due(deck, allIds, now) {
      const t = now || Date.now();
      return (allIds || []).filter(id => SRS.isDue(deck, id, t));
    },

    /** Progress summary over a known id set. */
    stats(deck, allIds) {
      const cards = _read(deck).cards;
      const total = (allIds || []).length;
      let learned = 0, seen = 0, due = 0, nextDue = Infinity;
      const now = Date.now();
      (allIds || []).forEach(id => {
        const c = cards[id];
        if (!c) { due += 1; return; }
        seen += 1;
        if (c.box >= LEARNED_BOX) learned += 1;
        if (now >= c.due) due += 1; else if (c.due < nextDue) nextDue = c.due;
      });
      return { total: total, seen: seen, learned: learned, due: due,
               nextDue: nextDue === Infinity ? null : nextDue };
    },

    /** Forget everything for a deck. */
    reset(deck) { _write(deck, { cards: {} }); try { document.dispatchEvent(new CustomEvent('cdwh:srs', { detail: { deck: deck, reset: true } })); } catch (_) {} },
  };

  window.CDWH = window.CDWH || {};
  window.CDWH.SRS = SRS;
})();
