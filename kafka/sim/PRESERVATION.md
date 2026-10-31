# Kafka Platform — Preservation Inventory & Build Log

Living record of what exists, where it maps in the enhanced platform, and what
each build iteration adds. Nothing listed here is removed without a documented
reason; iterations extend.

## Existing surface (baseline, preserved)

| Area | File(s) | Status |
|---|---|---|
| 22 learning modules | `modules/m01`–`m22` | Preserved; enriched (Passes 1–5) |
| Interview Q&A per module | module `IQ` arrays + `components/module-shell.js` | Preserved |
| Interview question bank | `data/iq-bank.js`, `data/tiered.js` | Preserved (to deepen, Iteration 5) |
| Quizzes | `data/quiz-bank.js`, `components/quiz.js` | Preserved |
| Self-explain | `data/self-explain.js`, `components/self-explain.js` | Preserved |
| Incident bank + investigation | `data/incidents.js`, `modules/incident-bank.js`, `components/investigation-flow.js` | Preserved (branching + scoring, Iteration 8) |
| Decision drills | `data/decisions.js`, `modules/decisions.js`, `components/choose-approach.js` | Preserved |
| Troubleshooting lab | `modules/troubleshoot.js` | Preserved |
| Glossary / cheatsheet / master-map | `modules/glossary.js`, `cheatsheet.js`, `master-map.js` | Preserved |
| Study hub | `modules/study.js` | Preserved |
| Progress persistence | `data/progress-store.js` (localStorage) | Preserved (hardened, Iteration 4) |
| Command palette / keyboard / tour / toast | `components/*` | Preserved |
| Canvas primitives | `components/canvas-primitives.js` | Preserved; reused |
| Nav / routing / theme | `components/nav.js`, `script.js`, `styles.css` | Preserved; extended |

## Architecture decision

Stay with the vanilla-JS, no-build, ES-module static app (deploys reliably to
GitHub Pages). Add a **content-data layer** and a **pure-JS deterministic
simulation engine** with real Node unit tests — no bundler. Accounts, real code
execution, real Kafka clusters and server-side AI are **Track 2 (needs a
backend)** and are explicitly out of scope for the static build; anything
simulated is labelled "simulation", never presented as live.

## Build iterations

- **Iteration 1 — Simulation engine + Partition Simulator** ✅
  - `sim/engine.js` — deterministic `KafkaSim`; state models (cluster, broker,
    topic, partition, replica, record); seeded PRNG; **Kafka's real murmur2
    partitioner** (verified against Apache Kafka published test vectors) + sticky
    partitioner for null keys.
  - `sim/engine.test.mjs` — `node --test`, 12 tests (murmur2 vectors, keyed
    routing, per-partition offsets, determinism/reset, hot-partition detection,
    even spread, config validation, replica placement, PRNG).
  - `modules/playground.js` — `#playground` route, Partition Simulator surface
    (key presets, partition-count slider that re-hashes, publish 1/100, reset,
    live hot-partition flag) + "How it works" tab. Labelled deterministic sim.
  - Wiring: `script.js` (PAGES + LOADERS), `nav.js` (Playground section),
    `enhancements.css` (`.sim-*`).
  - Verified: Playground both themes 0 console errors; full 22-module smoke
    test clean.

### Post-audit build (third-party audit → Tracks A–F, all shipped)

- **Track A — content completeness + honest progress** ✅
  - Quizzes for all 22 modules (was 4); self-explain for all 22 (was 5);
    tiered Weak/Good/Senior answers 5→12; decision drills 6→13; incidents 4→9.
  - "Complete" now means the module's quiz is passed (≥2/3), not opened;
    quiz grading records to the progress store and marks mastery.
- **Track B — missing theory** ✅
  - Config Reference (`#config-reference`, `data/configs.js`): ~35 settings
    with default / production value / what-breaks.
  - Capacity & Sizing Lab (`#sizing`): deterministic partition/consumer/storage
    math, labelled planning estimates.
  - Advanced Topics (`#advanced`, `data/advanced-topics.js`): tiered storage,
    static membership, quotas, high-water mark & leader epoch, record batch
    format, rack awareness.
- **Track C — global search** ✅ (`#search`, `data/search-index.js`): one box
  across modules, glossary, configs, advanced, decisions, incidents, and all
  interview Q&A; command palette route + standalone nav link.
- **Track D — dashboard + spaced repetition** ✅
  - Dashboard (`#dashboard`): mastery ring, per-group bars, activity stats,
    weak spots, recommended next; live-refreshes on progress.
  - Review Center (`#review`, `data/review.js`): SM-2 spaced-repetition
    flashcards (114) from quizzes + glossary; schedule persisted.
- **Track E — accessibility & polish** ✅: ARIA + keyboard on tabs and
  interview accordions; canvas text alternatives; difficulty/time badges;
  focus rings; print stylesheet.
- **Track F — more Playground surfaces** ✅: engine extended with
  `assignPartitions` + broker-failure/leader-election (17 unit tests);
  Consumer Group Lab (`#consumer-lab`) and Replication & Failure Lab
  (`#replication-lab`).

## Real vs simulated (honesty ledger)

| Capability | This build | Notes |
|---|---|---|
| Key → partition routing | **Real algorithm** | murmur2 + toPositive % n, matches Kafka |
| Cluster / produce / offsets | Simulated (deterministic) | No network, no real broker |
| Code execution | Not yet | Iteration 7: static validation, labelled |
| Real Kafka cluster | Out of scope | Track 2 (needs backend) |
| Accounts | Out of scope | No login; identity is a shared "sync code" |
| Cross-device cloud sync | **Real (opt-in)** | Supabase-backed; inert until `schema.sql` is run + a code is linked — see the Cross-device sync track below |

## CDC / Debezium / Lakehouse track (new groups, m23+)

A layered journey on top of the Kafka curriculum: Postgres → WAL/logical
decoding → Debezium → Kafka → microservice/outbox events → lakehouse
Bronze/Silver/Gold. Nine first-class modules (m23–m31) in two new nav groups,
plus a separate runnable Docker lab. Built and deployed per batch.

### Honesty ledger additions

| Capability | This build | Notes |
|---|---|---|
| CDC / WAL / slot / decoding dynamics | **Deterministic simulation** | `sim/cdc-engine.js`; labelled, Node-tested |
| Source LSN vs Kafka offset vs sink version | **Modelled as 3 distinct markers** | engine never conflates them |
| Real Postgres→Debezium→Kafka→lakehouse | Out of scope for the SPA | **the Docker lab** (Track 2 / needs backend) |

### Batch 1 — CDC engine + fundamentals + WAL ✅

- `sim/cdc-engine.js` — deterministic `CDCSim`, **composes `KafkaSim`** (reuses
  the real murmur2 partitioner + real offsets). Models: source tables, txn
  commit/rollback, WAL + monotonic LSN, logical decoding → Debezium-shaped change
  events (op c/u/d/r, before/after honouring REPLICA IDENTITY), replication slot
  + confirmed-flush + retained-WAL backlog, heartbeat, snapshot (r events),
  Bronze append-log, Silver materialization (upsert/delete by key), reconcile.
- `sim/cdc-engine.test.mjs` — `node --test`, **14 tests** (commit/rollback
  visibility, LSN monotonicity, multi-statement txn, slot backlog grow/drain,
  heartbeat advance, Silver↔source reconcile, poll-vs-log history, idempotent
  materialization, snapshot reads, LSN≠offset, determinism).
- `modules/m23-cdc-fundamentals.js` — `#m23`. Why CDC, the four capture methods,
  the state-vs-stream idea, + a live **poll-vs-log demo** on the engine.
- `modules/m24-postgres-wal.js` — `#m24`. WAL / physical-vs-logical / LSN / slot
  / publication / REPLICA IDENTITY, + an interactive **WAL & slot simulator**
  (drive writes, poll, pause to grow a backlog, heartbeat, reconcile Silver).
- Wiring (additive): `script.js` (LOADERS m23/m24; dynamic mastery toast),
  `components/nav.js` (new group "Change Data Capture" + GROUP_ORDER),
  `data/quiz-bank.js` (m23/m24, 3 each), `data/self-explain.js` (m23/m24),
  `modules/home.js` (GROUP_ORDER + dynamic count), `modules/dashboard.js`
  (GROUP_ORDER). Search auto-includes modules (no edit needed).
- `enhancements.css` — `.cdc-*` / `.prose-block` / `.callout` blocks, theme-aware.
- Verified: engine 31/31 (17 Kafka + 14 CDC); Playwright both themes 0 console
  errors (m23 demo, m24 simulator, nav group, home count=24, dashboard group,
  search). Baseline 22 modules untouched.

### Batch 2 — the Debezium pillar ✅

- Engine additions (backward-compatible): `simulateWalLoss()` + `needsSnapshot`/
  `slot.invalid` (streaming stalls until a fresh snapshot recovers), and
  `incrementalSnapshot()` (READ events without rewinding the stream). 2 new tests
  → **16 CDC tests, 33 total** green.
- `modules/m25-debezium-architecture.js` — `#m25`. Debezium as a Kafka Connect
  source connector (worker/task/offset model, single-task capture) + an
  interactive **connector-lifecycle machine** (create→snapshot→streaming→pause→
  restart→WAL-loss→recover).
- `modules/m26-snapshots-streaming.js` — `#m26`. Initial snapshot + the LSN
  watermark handoff, snapshot modes, incremental snapshots, + a **snapshot-vs-
  streaming lab** (pick a mode, see which backfill pre-existing rows).
- `modules/m27-change-events.js` — `#m27`. The event envelope (op/before/after/
  source), deletes+tombstones, serialization/SMTs, + a live **event-envelope
  inspector** (REPLICA IDENTITY + tombstone toggles) and a **schema-evolution
  drill** (backward/forward/FULL verdicts).
- `modules/m28-debezium-ops.js` — `#m28`. Annotated connector config + an
  interactive **ops console** that injects failures (outage, slot WAL growth,
  WAL loss) and diagnoses them live, plus a monitor/alert reference.
- Wiring (additive): LOADERS m25–m28; nav group now 6 modules; quizzes +
  self-explain for m25–m28. Home/dashboard/search auto-scale (count now 28).
- Verified: engine 33/33; Playwright both themes 0 console errors across all four
  modules' interactives; nav CDC group = 6; home count = 28. Baseline untouched.

### Batch 3 — Kafka integrations ✅ (new group "CDC Integrations & Lakehouse")

- `modules/m29-outbox-pattern.js` — `#m29`. Services as producers, the dual-write
  trap (lost event / phantom event), the transactional outbox + Debezium Outbox
  Event Router, and a **failure playground**: dual-write with an injected crash
  (shows inconsistency) vs outbox on the CDC engine (one txn → always consistent).
- `modules/m30-lakehouse.js` — `#m30`. Two sink paths (Iceberg Kafka Connect
  coordinator/control-topic commits vs Spark Structured Streaming → Delta
  checkpoint + foreachBatch/MERGE), the four distinct progress markers, small-
  files/compaction + schema defaults, and a **Bronze/Silver/Gold explorer**
  (append-only Bronze vs latest-by-LSN Silver vs Gold aggregate; duplicate =
  idempotent, stale/out-of-order = ignored by LSN ordering).
- Wiring (additive): LOADERS m29/m30; second nav group added to nav + home +
  dashboard GROUP_ORDER; quizzes + self-explain for m29/m30. Count now 30.
- Verified: engine 33/33; Playwright both themes 0 console errors; nav groups
  6 + 2; home count = 30; dashboard shows both CDC groups. Baseline untouched.

## Cross-device sync track (ported from the sibling tools — new groups, Batch S1+)

Optional, opt-in cross-device sync of everything this tool stores, plus a local
JSON backup. Ported from the blind75 / table-formats implementations and adapted
to Kafka's storage model. Fully additive: no existing module was changed except
two `init` calls added to `script.js`, and the app is byte-for-byte unchanged in
behaviour until the backend is configured AND a sync code is linked.

### Honesty ledger additions

| Capability | This build | Notes |
|---|---|---|
| Cross-device sync | **Real**, opt-in | Supabase RPC (`kafka_get`/`kafka_put`); no login — a shared "sync code", stored only as its SHA-256 hash |
| Until `schema.sql` is run + a code linked | **Inert** | No network call; everything stays local, per device (verified) |
| Merge (who-wins-per-key) | **Deterministic, Node-tested** | `components/cloudsync.js`; 14 unit tests |
| Local backup (export / import JSON) | **Real** | Works even with no backend configured |

### Batch S1 — cloud sync engine + UI ✅

- `supabase/schema.sql` — **the user runs this once** in the Supabase SQL Editor.
  Own isolated `kafka_state` table + `kafka_get`/`kafka_put` SECURITY DEFINER
  functions (≥8-char code guard); RLS on with no policies so the publishable key
  has zero direct table access. Shares the project with the sibling tools without
  colliding.
- `supabase-config.js` — ESM `export const SUPABASE` (reuses the monorepo's
  existing publishable key; safe to ship). Blank url/key ⇒ sync stays off.
- `components/cloudsync.js` — ESM. **Pure, exported merge core** (`mergeAll`,
  `mergeProgress`, `unionArrays`, `isSyncedKey`) + `initCloudSync()` and the
  `cloud` singleton. Syncs every `kafka-*` / `kafka_*` key (the code itself lives
  under `kafka:synccode`, outside the synced prefixes). Merge is per-key and
  type-aware: `kafka-done` unions, `kafka-progress-v1` deep-merges by record `ts`
  and never regresses a pass/correct, `kafka_quiz_*` takes the max, everything
  else is a 3-way LWW against a common ancestor (honours deletions). A
  transparent `localStorage` write observer (with an `applying` guard) means no
  existing module had to call us; pulls on boot/focus/visibility/`storage`/15s/
  reconnect; fires `kafka:cloud-refresh` + `kafka:progress` so open views repaint.
- `components/cloudsync-ui.js` — ESM. A ☁ button in the header actions opens a
  modal (generate/enter code, Link & sync, Sync now, Disconnect, live status) +
  local Export/Import JSON. Styled entirely with the app's CSS tokens, correct in
  both themes (data-theme, not prefers-color-scheme).
- `index.html` — added `topbar-right` to `.header-actions` so the shared backup
  button slots **inline** instead of as a floating pill. Bonus: this fixed a
  pre-existing overlap where the floating pill sat on top of the theme toggle;
  both it and the new sync button are now cleanly clickable.
- `script.js` — two imports + `initCloudSyncUI()` / `initCloudSync()` at boot.
- `components/cloudsync.test.mjs` — `node --test`, **14 tests** for the merge
  rules (union, pass-never-lost, best=max, ts-wins, deletions, idempotence).
- Verified: 14/14 merge tests; engine suite still 33/33; Playwright both themes
  0 console errors, sync button present & clickable, modal opens/closes, export
  present, and **no Supabase call while unlinked** (inert). Live DB round-trip is
  NOT yet verifiable here — it needs `schema.sql` applied; until then sync is
  correctly inert and never claims to be live.

### Batch S2 — editable interview Q&A (synced) ✅

- `components/iq-edits.js` — enhances each module's Interview Questions tab. Per
  question it adds an ✎ Edit control; editing happens inside the expanded answer
  (never fighting the open/close toggle), with Save / Cancel / Reset and an
  "edited" badge. Both the question and the answer are editable in place.
  Overrides are stored one key per question — `kafka_iqedit_<moduleId>_<index>`
  → `{q?, a?}` — so cloudsync.js carries them automatically and concurrent edits
  to different questions never collide. Originals are captured from the freshly
  rendered (raw) DOM each mount, so Reset is always exact. Re-applies on mount and
  on `kafka:cloud-refresh` (a single, leak-free listener), so an edit from another
  device shows up live.
- `script.js` — one import + `initIQEdits(canvas, id)` right after `initIQ`.
- `enhancements.css` — `.iqe-*` block (edit button, badge, editor fields,
  actions), theme-token based.
- `data/iq-aggregate.js` — **fixed a pre-existing gap**: the Study-Hub aggregator
  listed only m01–m22, so the CDC modules' interview questions never appeared in
  the Study Hub. Added m23–m30 loaders; they now show up (aggregator already
  defaults difficulty and preserves per-module index).
- Scope note: editing is on the module IQ tabs (the canonical, index-stable
  surface). The Study Hub stays a read-only aggregate pulled straight from the
  modules; reflecting per-user edits there is a possible later nicety.
- Verified: merge + engine suites still 47/47; Playwright both themes 0 console
  errors — 3 edit controls on m23, editor opens, Save stores the override, badge
  shows, the edit persists across a full page reload, Reset removes the key, and
  the Study Hub now lists CDC (m23–m30) questions.

### Batch S3 — audit + cleanups ✅

- **SPEC 5 (filter stacked-listener bug): audited, not present.** The sibling
  tool's bug was re-attaching a *delegated* listener to a persistent container on
  every filtered re-render. The Kafka tool never does this:
  - Study Hub (`modules/study.js`) — `apply()` sets `#study-results` innerHTML
    then binds a click handler to each **freshly recreated** `.iq-question`; the
    search/chip/select listeners are bound once to persistent controls.
  - Search (`modules/search.js`) — results are `<a>` links; the input/chip
    listeners are bound once.
  - Nav filter (`components/nav.js`) — hides items; `renderNav` replaces the nav
    wholesale and binds fresh listeners once.
  Nothing to fix.
- **SPEC 4 (editable code blocks): confirmed covered by sync.** The Coding Dojo
  scratchpads already persist to `kafka_cd_pad_<id>` (`components/coding-problem.js`
  reads on load, debounced `setItem` on input), so the transparent write observer
  picks them up and they sync across devices — no invasive CodeViewer retrofit.
- `components/cloudsync.test.mjs` — +2 tests (cd-pad as a generic synced key;
  per-question iqedit keys never cross-collide). **16 merge tests total.**
- Verified: merge suite 16/16 (engine still 33/33 → 49 total).

### Cross-device sync track — summary of what shipped (S1–S3)

| Spec (from the sibling tools) | Status in Kafka |
|---|---|
| 1 — Cross-device cloud sync engine | ✅ Supabase-backed, opt-in, Node-tested merge |
| 2 — Sync UI (+ local JSON backup) | ✅ header ☁ button + modal; export/import |
| 3 — Editable interview Q&A (synced) | ✅ per-question edit on every module tab + every "Level Up Your Answer" card |
| 4 — Editable code blocks | ✅ as the valuable slice — Coding-Dojo pads sync; no CodeViewer retrofit |
| 5 — Interview filter bug fix | ✅ audited — the bug does not exist in this tool |

**Follow-up (editable "Level Up Your Answer"):** `components/tiered-edits.js` makes
each tiered answer card editable in place (question, topic, all three tier bodies,
and the "why the senior wins" note), with an "edited" badge, Save/Cancel/Reset, and
Ctrl/Cmd+Enter / Esc. Overrides are one key per card — `kafka_taedit_<id>` — so the
generic 3-way LWW merge carries them across devices; `answers.js` applies overrides
at render and re-renders on `kafka:cloud-refresh`. Verified both themes, 0 console
errors: edit → persists across reload → head badge + title update → reset clears.

**User action still required for live sync:** run `supabase/schema.sql` once and
link a sync code. Until then sync is inert and never claims to be live; the local
export/import backup works regardless.

### Batch 4 — End-to-End Capstone (m31) + CDC Incident Lab ✅

- `modules/m31-cdc-capstone.js` — `#m31`, in the "CDC Integrations & Lakehouse"
  group. Ties m23–m30 together on a single `CDCSim`. Three tabs: the whole
  pipeline (theory + the four-markers recap), the **End-to-End Capstone**
  interactive, and Interview Q&A (4). The capstone drives one order through
  Postgres → WAL/slot → Debezium → Kafka → Silver → Gold with a live stage rail
  and panels (source table, slot/WAL backlog, Bronze, Silver, Gold, and a
  **reconciliation badge** comparing Silver to the source). Scenario buttons:
  insert / advance / cancel, duplicate, out-of-order (stale), outage, restart,
  WAL loss, snapshot & recover, additive schema evolution, reset. Reconciliation
  turns amber on drift (e.g. source moves during an outage while Silver stalls)
  and green again once the pipeline catches up (restart drains; snapshot rebuilds
  after WAL loss).
- `data/cdc-incidents.js` — 4 CDC production incidents (slot WAL growth; stuck
  after a long outage / invalidated slot; missing deletes / ghost rows; duplicate
  & out-of-order double-counting), same shape as `data/incidents.js`.
- `modules/cdc-incidents.js` — `#cdc-incidents` PAGE in the Practice section;
  reuses the shared `investigation-flow` component (records under the existing
  `troubleshoot` progress category; the Troubleshooting Lab still counts only its
  own ids, so no cross-inflation).
- Wiring (additive): `nav.js` (m31 in the CDC group; `cdc-incidents` in Practice),
  `script.js` (PAGES + LOADERS for both; m31 LOADER), `data/quiz-bank.js` (m31, 3
  Q), `data/self-explain.js` (m31), `data/iq-aggregate.js` (m31). Home / dashboard
  GROUP_ORDER + LEVEL/MINS already covered the group; search, review (SRS from
  QUIZ_BANK), and the Study Hub auto-include m31. Count now 31.
- `enhancements.css` — `.cap-*` block (pipeline chain, live rail + status dots,
  grid, slot backlog bar, reconciliation badge), theme-token based.
- Verified: merge + engine suites still 49/49; Playwright both themes 0 console
  errors — capstone reconciliation transitions correctly (stream = reconciled,
  outage+change = drift, restart = reconciled, WAL-loss→snapshot = reconciled),
  IQ edit controls present on m31, all 4 incident scenarios solvable to outcome,
  nav shows m31 + CDC Incident Lab, sidebar count = 31. Baseline untouched.
