# Test Coverage Report

> Phase 0 baseline. Records tests that actually run and their real results.
> Regenerated as phases land. Nothing here is claimed as passing unless executed.

## Executed today

| Suite | Command | Result (2026-10-11) |
|---|---|---|
| Preservation | `node scripts/verify-preservation.mjs` | **93/93 byte-identical ✅** |
| Foundations engine | `node sim/stream-engine.test.mjs` | 11/11 (per roadmap) |
| Section load sweep | Playwright `verify-all-sections.cjs` | `allSectionsOk: true`, 0 real 404s |
| Full route × theme | Playwright `verify-g8.cjs` | 32 routes × 2 themes render |
| Backup button | Playwright `verify-backup.cjs` | pill in header, 0 errors ✅ |

## Planned per phase

- **Phase 1:** search-coverage assertion (every course contributes an indexed item;
  representative queries open correct destinations).
- **Phase 2:** progress-aggregation test (ported `kafka-*`/`flink-*` keys surface in
  dashboard; export/import round-trip).
- **Phase 3:** each system-design brief renders, scores, shows reference solution.
- **Phase 4 — DONE:** 145 distinct questions across 8 banks (0 duplicate texts,
  verified). Current/target per bank: fund 22/50, kafka 21/50, flink 20/50,
  aws 16/40, azure 16/40, databricks 16/40, design 16/30, trouble 18/30. The
  in-app coverage panel shows these honestly; banks keep growing. Module modes
  verified in-browser: track filter, Rapid-fire, Timed round (live timer),
  self-assessment → Review-missed, Mark-for-revision (persisted sml-revise),
  0 errors.
- **Phase 5:** incident diagnostic-action flow (evidence changes before reveal).
- **Phase 7:** scenario A↔B switch assertions (see scenario-integration-plan).
- **Phase 8:** routing (deep links, refresh, back/forward, invalid), a11y
  (keyboard, focus, contrast, reduced-motion), responsive (desktop/tablet/mobile).

## Limitation

The live `github.io` origin is unreachable from the build container (proxy 403).
Verification runs against the exact committed bytes over a local static server;
because GitHub Pages serves files as-authored with no build step, verified
bytes == deployed bytes (confirmed by commit-SHA equality each deploy).
