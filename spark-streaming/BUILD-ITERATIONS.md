# Spark Structured Streaming — Atomic Build Iterations

The execution checklist. Where `CONTENT-PLAN.md` says *what* to build and to what
depth, this file breaks it into **atomic iterations**: each one is a single,
self-contained unit that is built, verified, committed, and deployed on its own,
leaves the site green, and delivers one visible thing. No iteration depends on a
later one. Order is the critical path; parallel branches are marked.

- **Companion docs:** `BUILD.md` (architecture/deploy), `CONTENT-PLAN.md` (content spec)
- **Dev branch:** `claude/brave-planck-jryjqf`
- **Each atom = one deploy.** Nothing is batched "to deploy later."

---

## The per-atom ship loop (run this for EVERY iteration below)

1. **Build** the files listed in the atom.
2. **Unit test** (engine atoms): `node --test spark-streaming/sim/<engine>.test.mjs` → green.
3. **Smoke test** (any UI atom): headless Playwright, dark **and** light, on the
   route(s) touched — 0 console/page errors, tabs + controls exercised, tour
   disabled via `localStorage spark_tour_done=1`.
4. **Wire** the route in `script.js` `LOADERS` (point the id at its real module,
   off the shared placeholder) and bump `BUILD` tag.
5. **Commit** on the dev branch with a scoped message.
6. **Deploy:** fast-forward `main`, confirm the Actions run concludes *success*
   (the deploy now trims splash + waits for the artifact — already fixed).
7. **Update** `sim/PRESERVATION.md` honesty ledger + check the atom off here.

**Definition of done for an atom:** its route/engine works live, tests green,
site still deploys, placeholder no longer shown for that id.

---

## Track E — Keystone engines (pure JS + Node tests, no UI)

These are the honest core; everything interactive depends on them. Build before
the modules/labs that use them.

- **E1 · `sim/microbatch-engine.js` + `.test.mjs`** — trigger planning, monotonic
  watermark = max(eventTime)−delay, late-drop at boundary, window assignment
  (tumbling/sliding/session), state + eviction, exact append/update/complete
  emission. ≥15 tests incl. determinism. *Depends on:* nothing. **Critical path #1.**
- **E2 · `sim/checkpoint-engine.js` + `.test.mjs`** — offset log (pre-batch) +
  commit log (post-batch), crash-replay, exactly-once vs at-least-once,
  idempotent-sink dedup. ≥8 tests. *Depends on:* nothing (independent of E1).
- **E3 · `sim/stream-join-engine.js` + `.test.mjs`** — stream–stream inner/outer
  join, dual-side state buffer, join watermark, eviction, outer-null timing.
  ≥8 tests. *Depends on:* E1 (reuses watermark helpers).

> E-atoms ship with no visible UI change (they still deploy clean). Their payoff
> lands in the first lab/module that imports them (L1, M05…).

---

## Track L — Interactive labs (the depth proof)

- **L1 · Output-Mode Lab** (`modules/output-mode-lab.js`) — one input stream →
  append/update/complete result tables side by side, batch-stepped, "why these
  rows?" explainer. *Depends on:* E1. **Critical path #2 — this is the flagship
  that proves the depth bar; build it right after E1.**
- **L2 · Micro-Batch Lab** (`modules/microbatch-lab.js`) — author a stream, set
  trigger/watermark/window/mode, step/play batches; canvas = input timeline +
  watermark line + state + emitted rows + batch-trace table. *Depends on:* E1.
- **L3 · Watermark Lab** (`modules/watermark-lab.js`) — slide the delay, scatter
  late events, watch drops + the completeness/latency/state-size readout.
  *Depends on:* E1.

---

## Track M — Teaching modules (one atom each, curriculum order)

Each atom = one full module per the `CONTENT-PLAN.md §1` contract (definition
card, concept tab, ≥1 interactive tab, ShopStream tab, PySpark+Scala code tab,
10–15 interview Qs). File `modules/mNN-<slug>.js`; wire its id in `script.js`.

**Foundation**
- **M01 · Why Structured Streaming** — batch-vs-stream latency timeline. *Dep:* none.
- **M02 · The Unbounded Table** — growing append-only table → result view. *Dep:* none.

**Architecture**
- **M03 · Architecture & Components** — driver/executor + plan animation. *Dep:* none.
- **M04 · Sources & Schema** — source picker + schema/backpressure. *Dep:* none.
- **M05 · Micro-Batch & Triggers** — trigger planner canvas. *Dep:* **E1.**
- **M06 · Continuous Processing** — micro-batch vs continuous latency. *Dep:* none.

**Time & Windows**
- **M07 · Event vs Processing Time** — two-clock skew canvas. *Dep:* none.
- **M08 · Watermarks** — advancing monotonic watermark line + late-drop. *Dep:* **E1.**
- **M09 · Windows** — tumbling/sliding/session builder. *Dep:* **E1.**

**State & Output**
- **M10 · Stateful Aggregations** — state map grow/evict + size meter. *Dep:* **E1.**
- **M11 · Arbitrary State** — cart→checkout→paid state machine + timeouts. *Dep:* E1 (light).
- **M12 · Output Modes** — three result tables (reuses L1's view). *Dep:* **E1.**
- **M13 · Deduplication** — dropDuplicates ± watermark, state growth. *Dep:* **E1.**

**Sinks & Reliability**
- **M14 · Sinks & foreachBatch** — sink picker + idempotent upsert. *Dep:* none.
- **M15 · Checkpoint & Offset Log** — WAL stepper. *Dep:* **E2.**
- **M16 · Fault Tolerance & EOS** — inject crash, replay, compare. *Dep:* **E2.**

**Joins**
- **M17 · Stream–Static Joins** — stream ⋈ static dimension, per-batch re-read. *Dep:* none.
- **M18 · Stream–Stream Joins** — dual-side buffer + eviction, inner/outer. *Dep:* **E3.**

**Lakehouse & Ops**
- **M19 · Delta Sink & MERGE** — streaming upsert insert/update/delete. *Dep:* none.
- **M20 · Performance & Tuning** — knobs → throughput/latency/state readouts. *Dep:* E1 (light).
- **M21 · Monitoring & Listeners** — live QueryProgress dashboard. *Dep:* **E1** (batch trace).

**End-to-End**
- **M22 · ShopStream Capstone** — full pipeline, steppable end to end. *Dep:* **E1, E2, E3.** **Build last.**

> Modules with *Dep: none* can be built any time and in parallel — good filler
> between engine atoms. Modules with an engine dep must wait for that engine's atom.

---

## Track R — Reference pages (one atom each)

- **R1 · Master Map** (`modules/master-map.js`) — 22-node dependency graph +
  ShopStream overlay. *Dep:* module set largely present.
- **R2 · Engine Comparison** (`modules/comparison.js`) — SS vs Flink vs KStreams
  vs DStreams. *Dep:* none.
- **R3 · Glossary** (`modules/glossary.js`) — ≥100 terms, formal+plain, module links. *Dep:* none.
- **R4 · Cheat Sheet** (`modules/cheatsheet.js`) — APIs + decision rules. *Dep:* none.
- **R5 · Config Reference** (`modules/config-reference.js`) — knobs, defaults, effects. *Dep:* none.

---

## Track B — Interview data banks (one atom each, in `data/`)

Each atom = the data file + its viewer page wired. Parity targets from
`CONTENT-PLAN.md §6`.

- **B1 · Quiz bank** (`data/quiz-bank.js` + quiz flow) — ≥100 Qs, module-tagged. *Dep:* none.
- **B2 · Coding problems** (`data/coding-bank.js` + `modules/coding.js`) — ≥30
  PySpark/Scala problems w/ worked solutions. *Dep:* none.
- **B3 · Decision drills** (`data/decisions.js` + `modules/decisions.js`) — ≥15. *Dep:* none.
- **B4 · Incident labs** (`data/incidents.js` + `modules/incident-bank.js`) — ≥12. *Dep:* none.
- **B5 · Tiered answers** (`data/tiered.js`) — ≥15 junior/mid/senior. *Dep:* none.
- **B6 · Self-explain** (`data/self-explain.js`) — 1 prompt/module. *Dep:* module set.
- **B7 · Mock interview** (`data/mock-exam.js` + `modules/mock-interview.js`) — 45-min set. *Dep:* B1–B5.
- **B8 · Search index** (`data/search-index.js`) — modules + glossary terms. *Dep:* R3 + modules.

> Per-module interview Q&A (10–15 each) is built **inside each M-atom**, not here;
> these banks are the cross-cutting surfaces.

---

## Track V — Review & analytics surfaces (one atom each)

- **V1 · Dashboard** (`modules/dashboard.js`) — progress + mastery. *Dep:* progress store.
- **V2 · Learning Path** (`modules/learning-path.js`) — ordered route. *Dep:* module set.
- **V3 · Search** (`modules/search.js`) — global, over B8 index. *Dep:* **B8.**
- **V4 · Review Center** (`modules/review.js`) — spaced repetition over misses. *Dep:* B1–B5.
- **V5 · Study Hub** (`modules/study.js`) — all IQ aggregated. *Dep:* module set + banks.

---

## Track P — Polish (one atom each, last)

- **P1 · Real assets** — Spark-branded `favicon.svg`, `icon-192/512.png`,
  `apple-touch-icon.png`, `og.png`, `splash/*` (replace Flink stand-ins). *Dep:* none.
- **P2 · Cloud sync (optional)** — own Supabase project, fill `supabase-config.js`,
  flip `window.Spark` sync on. *Dep:* none; explicitly gated.
- **P3 · a11y + QA pass** — keyboard, contrast, captions, final full-route
  Playwright + `node --test` sweep; update honesty ledger. *Dep:* everything.

---

## Recommended linear order (critical path)

The dependency-correct sequence. Engine-free modules (M01–M04, M06, M07, M14,
M17, M19) and all of Track R/B are "filler" you can slot in parallel or whenever.

```
E1 → L1 → L2 → L3 → M05 → M08 → M09 → M12 → M10 → M13      (micro-batch spine)
E2 → M15 → M16                                             (recovery spine)
E3 → M18                                                   (join spine)
M01 M02 M03 M04 M06 M07 M11 M14 M17 M19 M20 M21            (fill anytime)
M22                                                        (capstone, needs E1+E2+E3)
R1 R2 R3 R4 R5                                             (reference)
B1 B2 B3 B4 B5 → B7 ;  R3+modules → B8 → V3               (banks + search)
V1 V2 V4 V5                                                (analytics)
P1 P2 P3                                                   (polish)
```

**Total: ~49 atomic iterations** (3 engines + 3 labs + 22 modules + 5 reference +
8 banks + 5 review + 3 polish). Each is one build-verify-deploy cycle.

### Progress checklist

- [ ] E1  [ ] E2  [ ] E3
- [ ] L1  [ ] L2  [ ] L3
- [ ] M01 [ ] M02 [ ] M03 [ ] M04 [ ] M05 [ ] M06 [ ] M07 [ ] M08 [ ] M09 [ ] M10 [ ] M11
- [ ] M12 [ ] M13 [ ] M14 [ ] M15 [ ] M16 [ ] M17 [ ] M18 [ ] M19 [ ] M20 [ ] M21 [ ] M22
- [ ] R1  [ ] R2  [ ] R3  [ ] R4  [ ] R5
- [ ] B1  [ ] B2  [ ] B3  [ ] B4  [ ] B5  [ ] B6  [ ] B7  [ ] B8
- [ ] V1  [ ] V2  [ ] V3  [ ] V4  [ ] V5
- [ ] P1  [ ] P2  [ ] P3

**Start here:** E1 (the micro-batch keystone engine + tests) — then L1 proves the
depth bar on the live site.
