# Test Results — Baseline (Phase 0)

_Recorded before any redesign change so later failures are never misattributed. Re-run these every iteration._

## Automated suites (Node)

| Command | Result |
|---|---|
| `node tools/test-service-detail.js` | **21 passed, 0 failed** |
| `node tools/test-coverage.js` | ✓ all assertions passed |
| `node tools/test-design-challenge.js` | **82 passed, 0 failed** |
| `node tools/test-incident.js` | ✓ all passed |
| `node tools/test-progress.js` | **17 passed, 0 failed** |
| `node tools/test-project-tracks.js` | **133 passed, 0 failed** |
| `node tools/validate-content.js` | ✓ valid — **0 errors**, 6 warnings |
| `node tools/coverage-ledger.js` | 57/57 services full (100%) |
| `node tools/content-baseline.js` | ✓ no content removed (362 IDs / 15 groups) |

**Total: 253 unit assertions passing + 0 content errors.**

## Known pre-existing warnings (not caused by the redesign)

The 6 validator warnings are all the same benign class — Databricks lab `domainId`s referencing the Associate domain scheme while tagged to the Professional cert:

```
[cert-labs.js] lab-db-delta:     domainId "s3" not in dbx-de-professional
[cert-labs.js] lab-db-autoloader:domainId "s2" not in dbx-de-professional
[cert-labs.js] lab-db-merge:     domainId "s3" not in dbx-de-professional
[cert-labs.js] lab-db-unity:     domainId "s5" not in dbx-de-professional
[cert-labs.js] lab-db-optimize:  domainId "s3" not in dbx-de-professional
[cert-labs.js] lab-db-jobs:      domainId "s4" not in dbx-de-professional
```

These are cosmetic cross-reference warnings, not errors; the pass bar is **0 errors**.

## Browser smoke (Playwright, Chromium)

Service-detail pages render with full section set and all enrichment blocks, no new console errors (one pre-existing 404 for an injected dev-harness script `/shared/backup-button.js`, unrelated to app code).

## How to run

```sh
cd cloud-de-visualizer
for t in tools/test-*.js; do node "$t"; done
node tools/validate-content.js
node tools/content-baseline.js
node tools/coverage-ledger.js
```
