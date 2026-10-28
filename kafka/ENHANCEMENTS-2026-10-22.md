# Kafka Platform — Enhancement Log (2026-10-22)

Reference for what was built today, transforming the Kafka visualizer from a
module walkthrough into a full **Engineering & Interview Mastery Platform**.
Work came out of a third-party audit of the existing app and shipped as six
tracks (A–F), each verified headless in dark + light themes before deploy.

**Live:** https://rajesh-satuluri.github.io/NewVisual/kafka/
**Stack:** vanilla-JS ES-module SPA, no build step, GitHub Pages, hash routing.

---

## Summary table

| Track | Theme | Headline outcome |
|---|---|---|
| A | Content completeness + honest progress | Quizzes/self-explain on all 22 modules; "complete" now means quiz passed |
| B | Missing theory | Config Reference, Capacity & Sizing Lab, Advanced Topics |
| C | Global search | One box across every content type |
| D | Dashboard + spaced repetition | Mastery analytics + SM-2 Review Center |
| E | Accessibility & polish | ARIA/keyboard nav, canvas alt text, badges, print CSS |
| F | More interactive labs | Consumer Group Lab + Replication & Failure Lab |

**Verification:** final regression = 40 routes × 2 themes = 80 clean loads, 0 console errors. Engine unit tests 17/17 passing.

**Deploys (all green on `main`):** `fbc7dbb` (A) · `31e778b` (B+E) · `ae4ae93` (C+D) · `3fe9d59` (F).

---

## Track A — Content completeness + honest progress

The audit's #1 credibility gap: practice content and progress tracking were
incomplete and dishonest.

**Content expansion (per-module banks now cover all 22 modules):**

| Bank | Before | After | File |
|---|---|---|---|
| Quizzes | 4 modules | **22 modules** (+54 questions) | `data/quiz-bank.js` |
| Self-explain prompts | 5 modules | **22 modules** | `data/self-explain.js` |
| Tiered Weak/Good/Senior answers | 5 | **12** | `data/tiered.js` |
| Decision drills | 6 | **13** | `data/decisions.js` |
| Incident scenarios | 4 | **9** | `data/incidents.js` |

**Honest progress (the key behavior change):**
- Previously a module was marked "complete" the moment its page *loaded*.
- Now a module is marked **mastered only when its quiz is passed (≥ 2/3)**.
- Quiz grading dispatches a `kafka:quiz-graded` event; a global listener records
  the score to the progress store and marks mastery on pass.
- Page opens are tracked separately as "visited" (not completion).
- **Backward-safe:** modules a prior visitor had auto-completed stay marked; only
  *new* completions require passing the quiz.

New data categories in `progress-store.js`: `quiz`, `visited`, `srs`.

---

## Track B — Missing theory (3 new surfaces)

Senior-level theory the audit flagged as absent or thin.

- **Config Reference** — route `#config-reference`, data `data/configs.js`
  (~35 settings). Each entry: default / typical production value / *what breaks
  when it's wrong* / linked module. Live filter across all fields.
- **Capacity & Sizing Lab** — route `#sizing`. Deterministic partition / consumer
  / storage math (partitions = ceil(throughput ÷ per-partition throughput) ×
  headroom; consumer cap = partition count; storage = throughput × retention ×
  replication). Labelled planning estimates, reproducible on a whiteboard.
- **Advanced Topics** — route `#advanced`, data `data/advanced-topics.js`
  (6 deep dives): tiered storage, static membership, quotas, high-water mark &
  leader epoch, record-batch format, rack awareness. Each has an interview angle.

---

## Track C — Global search

- Route `#search`, index builder `data/search-index.js`.
- Indexes **everything**: 22 modules, glossary terms, config settings, advanced
  topics, decision drills, incidents, tiered answers, and all interview Q&A.
- Static index builds synchronously for instant first paint; the interview-Q&A
  slice loads lazily and appends.
- Type-filter chips; ranked matching (`rankMatches`).
- Integrated into the command palette (Cmd/Ctrl-K → "Search all content for …")
  and a standalone nav link. Reads `?q=` from the hash for deep links.

---

## Track D — Dashboard + spaced repetition

- **Dashboard** — route `#dashboard`. Honest mastery ring (SVG), per-group
  progress bars, activity stats pulled from the progress store (quiz, decisions,
  troubleshoot, tiered, srs) + self-explain count, weak-spot detection, and a
  recommended-next-module. Live-refreshes on the `kafka:progress` event.
- **Review Center** — route `#review`, logic `data/review.js`. A spaced-repetition
  system:
  - Deck of **114 cards** auto-built from quiz questions + glossary terms.
  - **SM-2 scheduling variant** (Again → 60s requeue; Hard; Good → 1d/3d/
    interval×ease; Easy). Session caps: 15 new, 40 max.
  - Graded sessions with keyboard support (space to flip, 1–4 to grade).
  - Schedule persisted to progress-store category `srs`.
  - Filter chips (all / quiz / glossary); due / new / learning stats.

---

## Track E — Accessibility & polish

- **ARIA + keyboard** on tab strips (role=tablist/tab/tabpanel, roving tabindex,
  Arrow/Home/End nav, hidden inactive panels) and interview-question accordions
  (role=button, aria-expanded/controls, Enter/Space).
- **Canvas text alternatives** — aria-labels on simulation canvases.
- **Difficulty + time badges** on curriculum cards (Beginner/Intermediate/
  Advanced + est. minutes).
- **Focus-visible rings** throughout.
- **Print stylesheet** (`@media print`) so reference pages print cleanly.
- All styling uses theme tokens / `color-mix` so it's correct in both themes.

---

## Track F — More interactive labs

Engine extended (`sim/engine.js`) and two new lab surfaces, all built on Kafka's
real algorithms and labelled as deterministic simulations.

**Engine additions (unit tests grew 12 → 17, all passing):**
- `assignPartitions(numPartitions, numConsumers, strategy)` — range &
  round-robin consumer assignment; surplus consumers go idle.
- Broker-failure + leader election: `setBrokerAlive`, `killBroker`,
  `reviveBroker`, `_reelect()` (drops dead replicas from ISR, promotes first
  in-sync replica, leader=null if none left), `replicationView`,
  `replicationHealth`.

**New labs:**
- **Consumer Group Lab** — route `#consumer-lab`. Partition/consumer sliders +
  strategy select; shows partition→consumer assignment, idle consumers, and why
  parallelism is capped by partition count.
- **Replication & Failure Lab** — route `#replication-lab`. Broker/partition/RF
  sliders; kill & revive brokers; replication grid (Leader / Replica / in-sync /
  offline cells) with under-replicated vs offline distinction, health stats, and
  live leader re-election from the ISR.

---

## New routes added today

`#search` · `#consumer-lab` · `#replication-lab` · `#sizing` · `#advanced` ·
`#config-reference` · `#dashboard` · `#review`

(Plus the pre-existing `#playground` Partition Simulator remains.)

---

## Honesty ledger (what's real vs simulated)

| Capability | This build | Note |
|---|---|---|
| Key → partition routing | **Real algorithm** | murmur2 + toPositive % n, matches Apache Kafka |
| Consumer assignment, replication, leader election | **Real algorithms, simulated state** | Deterministic; no network/broker |
| Cluster / produce / offsets | Simulated (deterministic, seeded PRNG) | Labelled "simulation" |
| Sizing math | Real formulas | Labelled planning estimates |
| Real Kafka cluster, code execution, accounts/cloud sync | **Out of scope (Track 2)** | Needs a backend; local-first + export/import instead |

Nothing is presented as live that isn't. Every simulated surface is labelled.

---

## Files touched today (reference)

**New:** `data/configs.js`, `data/advanced-topics.js`, `data/search-index.js`,
`data/review.js`, `modules/config-reference.js`, `modules/sizing.js`,
`modules/advanced.js`, `modules/search.js`, `modules/dashboard.js`,
`modules/review.js`, `modules/consumer-lab.js`, `modules/replication-lab.js`.

**Edited:** `data/quiz-bank.js`, `data/self-explain.js`, `data/tiered.js`,
`data/decisions.js`, `data/incidents.js`, `components/quiz.js`,
`components/nav.js`, `components/module-shell.js`, `components/command-palette.js`,
`modules/home.js`, `modules/glossary.js`, `sim/engine.js`, `sim/engine.test.mjs`,
`script.js`, `enhancements.css` (~690 → ~1055 lines), `sim/PRESERVATION.md`.

---

## Addendum — Coding Dojo (2026-10-28)

A later enhancement adding the **coding** half of interview prep. Until now the
platform was conceptual (theory, decisions, incidents, interview Q&A); a real
data-engineering loop (e.g. PayPal) also tests **coding on streams of events**.

**New route `#coding`** (nav → Practice). A study-grade coding practice bank —
shipped live in **5 batches of 5** (24 problems total). Honest scope: this
platform has **no code runtime** (Track 2), so nothing is executed. Each problem
is: prompt → worked example → **scratchpad** (notes only, persisted, never run) →
**progressive hints** → **Python reference solution** + walkthrough + complexity
→ a **"make it a Kafka pipeline"** follow-up (partitioning, offsets, retries,
restart recovery — the part interviews actually probe). Self-rating
(Got it / Partial / Review) feeds `progress-store` category `coding` and the
Dashboard.

**Coverage (24 problems, 4 levels):**

| Level | Theme | Problems |
|---|---|---|
| L1 | Python + event processing | dedup by id, totals by merchant, latest-per-user, count by type, missing sequences |
| L2 | Producer / consumer coding | producer (keys+acks+callbacks), commit-after-success consumer, retry+DLQ, idempotent DB write, batch-then-commit |
| L3 | Streaming algorithms | rolling 5-min window, top-K merchants, out-of-order final state, per-key ordering, windowed dedup, tumbling-window emit-on-close |
| L4 | Production | DB→Kafka change publisher (watermark), source/target reconciliation, crash recovery, schema evolution, consumer-lag, exactly-once transactions, rebalance-safe commit-on-revoke |
| Capstone | Compose it all | mini replication worker (validate→dedup→retry→DLQ→commit→metrics) |

**New files:** `data/coding-bank.js`, `modules/coding.js`,
`components/coding-problem.js` (includes a dependency-free Python syntax
highlighter).
**Edited:** `script.js` (route), `components/nav.js` (Practice link),
`data/search-index.js` (search type `Coding`), `modules/search.js` (filter chip),
`modules/home.js` (card), `modules/dashboard.js` (coding stat),
`enhancements.css` (Coding Dojo styles + print rules).

**Verification:** each batch loaded headless in dark + light with the full
interaction exercised (filter → open → hints → reveal → self-rate → scratchpad
persistence → search → dashboard), 0 console errors. Deployed per batch to
`main` → GitHub Pages.
