/* ============================================================
   Cloud DE Visualizer — content-meta registry  (Phase 0 / F0.2)

   A single, versionable source of truth for the provenance of every
   content bank: which schema version it follows, when its facts were
   last reviewed against the authoritative source, and what that source
   is. The "verified ·date· source" chip (F0.3) reads this, the content
   validator (F0.1) asserts every bank has an entry, and the freshness
   dashboard (Phase 5) flags banks whose lastReviewed has gone stale.

   Why a central registry instead of a field on all ~600 records:
     • Clean, diff-friendly data files — no date stamped on every item.
     • One place to re-date a whole bank after a review pass.
     • Still supports PER-RECORD freshness: any individual record may
       carry its own `lastReviewed` (YYYY-MM-DD), which overrides the
       bank default for that item. Use it only when one record is
       reviewed off-cycle from its bank.

   Resolution:  TV.ContentMeta.resolve(bankId, record?) →
                { schemaVersion, lastReviewed, source, sourceUrl?, stale }

   SCHEMA_VERSION bumps when a bank's object SHAPE changes (new required
   field, renamed key) — not when its content is edited.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  const SCHEMA_VERSION = 1;
  const STALE_AFTER_DAYS = 180; // ~2 exam-update cycles; tune in Phase 5

  /* Per-bank provenance. `lastReviewed` is the date the bank's facts
     were last checked against `source`. Keep dates ISO (YYYY-MM-DD). */
  const BANKS = {
    'certifications':   { lastReviewed: '2026-10-06', source: 'Official vendor exam guides (AWS / Microsoft Learn / Databricks)' },
    'cert-questions':   { lastReviewed: '2026-10-06', source: 'Authored against official exam guides; distractors original' },
    'cert-labs':        { lastReviewed: '2026-10-06', source: 'Authored playbooks citing official service docs' },
    'cert-traps':       { lastReviewed: '2026-10-06', source: 'Authored from official exam guides + service docs' },
    'cert-compare':     { lastReviewed: '2026-10-06', source: 'Authored from official service docs' },
    'quiz-bank':        { lastReviewed: '2026-10-06', source: 'Authored from official service docs' },
    'learning-paths':   { lastReviewed: '2026-10-06', source: 'Curated topic sequences' },
    'taxonomy':         { lastReviewed: '2026-10-06', source: 'Internal skill taxonomy' },
    'intuition':        { lastReviewed: '2026-10-06', source: 'Authored first-principles explanations' },
    'equivalences':     { lastReviewed: '2026-10-06', source: 'Authored cross-cloud comparisons from official docs' },
    'aws-services':     { lastReviewed: '2026-10-06', source: 'AWS official documentation (docs.aws.amazon.com)' },
    'azure-services':   { lastReviewed: '2026-10-06', source: 'Microsoft Learn (learn.microsoft.com)' },
    'databricks-services': { lastReviewed: '2026-10-06', source: 'Databricks documentation (docs.databricks.com)' },
    'fabric-services':  { lastReviewed: '2026-10-06', source: 'Microsoft Learn — Fabric (learn.microsoft.com/fabric)' },
    'aws-interview-qa': { lastReviewed: '2026-10-06', source: 'Authored from AWS official docs + engineering practice' },
    'azure-interview-qa': { lastReviewed: '2026-10-06', source: 'Authored from Microsoft Learn + engineering practice' },
    'databricks-interview-qa': { lastReviewed: '2026-10-06', source: 'Authored from Databricks docs + engineering practice' },
  };

  function daysSince(iso) {
    const then = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(then)) return Infinity;
    return Math.floor((Date.now() - then) / 86400000);
  }

  TV.ContentMeta = {
    SCHEMA_VERSION,
    STALE_AFTER_DAYS,
    banks: BANKS,
    bankIds() { return Object.keys(BANKS); },
    /* Effective meta for a bank, optionally overridden by a record's
       own lastReviewed. Returns a stable shape + a computed `stale`. */
    resolve(bankId, record) {
      const bank = BANKS[bankId] || null;
      const reviewed = (record && record.lastReviewed) || (bank && bank.lastReviewed) || null;
      const age = reviewed ? daysSince(reviewed) : Infinity;
      return {
        schemaVersion: (record && record.schemaVersion) || SCHEMA_VERSION,
        lastReviewed: reviewed,
        source: (bank && bank.source) || null,
        ageDays: age === Infinity ? null : age,
        stale: age > STALE_AFTER_DAYS,
        known: !!bank,
      };
    },
    has(bankId) { return !!BANKS[bankId]; },
  };
})();
