# DB Lab — Database Engineering Academy build notes

Status and honest limitations for the academy rebuild (phases P1–P9). Written
to be accurate, not aspirational: nothing here is claimed complete that isn't.

## What shipped

**Testability & honesty foundation (P1)**
- Pure simulation-kernel contract (`sims/kernels/CONTRACT.md`, `kernel-contract.mjs`):
  deterministic, DOM-free state machines with `dispatch / reset / invariants /
  metrics / snapshot / trace`.
- Dual-environment test harness (`tests/`): the same `*.test.mjs` run in Node
  (`node tests/run.mjs`) and in the browser (`tests/index.html`). **75 tests.**
- Verification ledger (`js/data/sources.js`): one record per technical claim →
  primary source, engine/version, generic-vs-specific scope, review date.
  Surfaced to learners in Revision → *Sources & verification*.
- Honest two-tier sim labelling (`js/data/sim-tiers.js`): ⚡ interactive lab vs
  🎬 guided walkthrough. Evidence-based concept status (`Progress.conceptStatus`).

**Flagship interactive labs (P2–P5)** — kernel + tests + renderer, each rendering
the kernel's *real* state (no scripting):
| Lab | Concept | Kernel models |
|---|---|---|
| WAL + Crash Recovery | `wal` (m47) | steal+no-force, 2PL, fuzzy checkpoint, ARIES redo/undo |
| Buffer Pool | `buffer-pool` (m30) | LRU / FIFO / CLOCK, dirty write-backs |
| B+Tree | `b-plus-tree` (m36) | insert/split, delete/borrow/merge, search, range |
| MVCC | `mvcc` (m48) | xmin/xmax versions, snapshots, first-updater-wins |
| Cost-Based Optimizer | `cost-based-optimization` (m17) | access-path + join cost crossovers |
| LSM-Tree | `lsm-tree` (m41) | MemTable→SSTable→compaction, Bloom, amplification |
| Raft Consensus | `raft-consensus` (m63) | election restriction, quorum commit, failover |

**Production Incident Engine (P6)** — `#failure-lab`: evidence-driven ShopKart
scenarios (missing index, deadlock storm, checkpoint stall, replica lag).
Investigate → diagnose → remediate → scored.

**Mastery & Revision (P8)** — `#revision`: evidence-based mastery bars,
prerequisite-aware review queue, assessment history, the sources ledger.

**Navigator hubs (P10)** — the three former "coming soon" routes now ship as
real, data-backed pages: `#engineering-lab` (a focused hub for the 7
kernel-backed ⚡ labs with what-you-drive blurbs), `#real-world` (the ShopKart
stack service-by-service, each mapped to the concepts it exercises and its
incident), and `#interview` (every concept's authored interview Q&A — 113
questions across 90 concepts — grouped by domain with click-to-reveal answers).

**QA & accessibility (P9)** — 14-route headless smoke test clean; global
reduced-motion guard; visible keyboard focus on all lab controls.

## Known limitations (honest)

- **Teaching models, not engines.** Every kernel is a faithful *model* with
  disclosed simplifications (see each kernel's header and the in-lab
  "what's simplified" panels). The optimizer's costs are abstract page-I/O
  units, not any engine's real numbers; Bloom filters in the LSM lab are exact;
  Raft replication copies the log wholesale rather than reconciling
  incrementally.
- **Two sim tiers.** 7 concepts are ⚡ interactive labs; the remaining ~126 are
  🎬 guided walkthroughs (scripted canvas step-throughs). The UI says which is
  which — walkthroughs are not represented as interactive.
- **Content depth (P7 done for all real lessons).** 34 concepts have
  gold-standard interactive deep dives; the **other 77 genuine concept
  lessons** now carry authored content (why / intuition / internals /
  engineering / failure-modes + interview Q&A), merged via
  `js/data/concept-content.js`. The remaining 22 entries (m112–m125
  lab-launchers, m126–m133 navigation/meta pages such as glossary,
  concept-map, interview-center) are intentionally not written as lessons —
  they point at the ⚡ flagship labs and tools. So every concept that *is* a
  lesson has real content; nothing over-claims.
- **Incident scenarios are hypothetical/composite**, labelled as such — realistic
  mechanics, not transcripts of specific real outages.
- **Progress is per-browser** (localStorage); it doesn't sync across devices.

## Running the tests

```
node tests/run.mjs          # Node, exits non-zero on failure
open tests/index.html       # same suite, in the browser
```
