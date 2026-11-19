# cloud-dwh tests

Pure-logic tests for the Snowflake data-loading simulator core
(`js/platforms/snowflake/loading/sim-core.js`). No dependencies — they
use Node's built-in test runner and load the module via its
browser-safe `module.exports` shim.

```bash
cd cloud-dwh
node --test tests/*.test.mjs
```

Covers: `deriveMetrics` (P0-A pipeline metrics), `copySim` (P0-B
ON_ERROR / file-format outcomes), `applyBatch` / `seedTarget` /
`watermarkPick` (P0-C incremental, MERGE, CDC delete handling,
idempotency matrix, watermark selection).

The interactive UI is additionally validated headless with the
pre-installed Chromium + Playwright during development.
