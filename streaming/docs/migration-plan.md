# Migration Plan — porting Kafka & Flink into `streaming/`

> **Purpose (I05).** Define exactly how the two source apps become sections of the
> new lab with **100% content preservation** and **zero changes to the originals**.

## 1. Guiding rules (non-negotiable)

1. **Originals are frozen.** `kafka/` and `flink/` (and the other 5 tools) are never
   edited, moved, or deleted. Both stay live at `/NewVisual/kafka/` and
   `/NewVisual/flink/`.
2. **Port = copy + re-shell, not rewrite.** Educational content (lesson prose, tabs,
   simulators, quizzes, IQ banks, code) is reproduced byte-equivalent into
   `streaming/`, re-pointed at the shared component layer.
3. **Nothing shortened; no simulator downgraded to a static diagram.** Enforced by
   the preservation manifest (I03) + regression suite (I27).
4. **Label over filename.** Flink's on-disk filename drift (see module-inventory §7)
   is resolved on the way in: content is carried by its nav label; new files get
   correct, drift-free names.

## 2. Integration approach (decided: Option B — port + adapt)

Rejected alternatives: (A) iframe-embed the old apps — breaks unified nav, search,
scenarios, theming; (C) full rewrite — risks content loss, huge effort. **Chosen:
port each module into the new shell, adapt it to the shared components and scenario
system, verify against the manifest.**

## 3. Port sequence & mapping

### 3.1 Kafka (I15–I20)
- `sim/engine.js` + tests ported first (I15) — the real murmur2 engine underpins the
  Partition Simulator and must stay test-green.
- Modules ported in three batches (m01–m08, m09–m15, m16–m22 + playground), each
  batch gated by its slice of the preservation suite.
- Aux banks (incidents, iq-bank, quiz, glossary, cheatsheet, master-map) ported
  (I19), then **Scenario B (e-commerce)** examples made switchable (I20).

### 3.2 Flink (I21–I26)
- `ride-story.js` + `story-ui.js` + PyFlink snippets ported first (I21).
- Modules ported in three batches (m01–m07, m08–m13b, m14–m19), de-drifting filenames
  on the way in (drift map in module-inventory §7).
- Aux (comparison, learning-path, glossary, cheatsheet, study, iq/quiz) ported (I25),
  then **Scenario B** added alongside the native Uber **Scenario A** (I26).

### 3.3 Filename de-drift map (applied during Flink port)
| New file (correct) | Carries content from |
|--------------------|----------------------|
| `operators.js` | `m06-data-flow.js` |
| `sources-sinks.js` | `m07-operators.js` |
| `fault-tolerance.js` | `m13-savepoints.js` |
| `backpressure.js` | `m14-fault-tolerance.js` |
| `flink-sql-table.js` | `m15-backpressure.js` |
| (all others) | matching stem |

## 4. Scenario adaptation

- Kafka's "📦 Amazon …" tabs → generalized as **Scenario B (E-commerce, order O9001)**.
- Flink's ride **R-4471** narrative → **Scenario A (Uber mobility)**.
- A global switcher (I12) swaps the *active* scenario's data in every lesson that is
  scenario-aware; non-scenario content is shared. The switch changes **real example
  data**, not just a label.

## 5. Verification gates

- **Per batch:** the batch's preservation test (content hash / structural equivalence
  + interaction smoke) must pass before the next batch.
- **Gate 3 exit:** full `scripts/verify-preservation.mjs` green — every manifest entry
  present, content intact, every interactive surface functional; Kafka engine 12/12;
  manifest reconciled (any ADAPTED/EXPANDED entry has a logged reason).

## 6. Rollback

Because originals are untouched and the new lab is a separate directory, rollback is
trivial: revert the `streaming/` commits. No existing tool can be affected.
