# o9 Supply Chain Solver — Master Learning Tool: Revamp Blueprint

A single reference for turning the current **o9 Solver Visualizer** (a focused
DRP/distribution explainer) into the **o9 SCS Mastery Platform** — the best
end-to-end study tool for a beginner in supply chain, grounded in the full o9
Platform Wiki "Supply Chain Solver (SCS)" category and modelled on the depth of
the repo's Kafka and Iceberg tools.

- **Current tool:** `o9-solver-visualizer/` — vanilla JS, no build step, GitHub Pages.
- **Source of truth:** 44 SCS wiki pages (extracted from `SQLFIles/*.7z`).
- **Inspiration:** `kafka/` (32 modules + sim engine + mastery layer), `iceberg/` (35 modules + feature bus).
- **Status:** Blueprint / proposal. Nothing built yet. Iterations gated by explicit "go."

---

## 1. The gap we are closing

| | Current tool | The wiki (reality) | Kafka/Iceberg bar |
|---|---|---|---|
| **Scope** | DRP / distribution slice, 1 example (CAT parts) | Full SCS: manufacturing + distribution + procurement, 44 pages | Whole domain, 32–35 modules |
| **Interactivity** | Scripted playback (pre-baked steps) | A real heuristic engine | **Deterministic, unit-tested sim engines** |
| **Practice** | 1 quiz, interview text | — | Per-screen auto-quiz, interview bank, drills, **spaced repetition** |
| **Progress** | none | — | Progress + mastery dashboard, resume, command palette |
| **Depth** | concept pages | measure-level config (the "API") | Config reference + honesty ledger |

The current tool already shares the exact architecture of Kafka/Iceberg
(self-registering modules, hash router, theme, animation engine). So the revamp
is **expand the content to the whole SCS, and level up the platform to
mastery-tool standard** — not a rewrite.

### The core insight about SCS (drives the whole design)

SCS is **not** a cost-minimising LP/MIP. It is a **priority-ranked, order-by-order
(OBO) heuristic** that plans one demand at a time, **backward from customer to
supplier**, in three phases — **JIT → Build-Ahead → Build-Late** — honouring hard
constraints (material, capacity, storage, lead time, lot size, no-carry) and
relaxing soft ones in the order given by the **Objective Rank List**. *The
Objective Rank List is the objective.* This is simple enough to **actually
implement in JavaScript** — which is the signature move of this revamp.

---

## 2. The signature move: a real SCS Mini-Engine

Following Kafka's "never fake anything" rule (real murmur2, unit-tested), we build
**`sim/scs-engine.js`** — a pure-JS, DOM-free, deterministic implementation of the
documented SCS heuristic on a small configurable network. Importable in the
browser *and* in Node for `node --test`.

**What it computes (honestly, per the wiki):**
1. **Demand sort** — Priority → Fair-Share Priority → Due Date → Quantity → key attributes.
2. **Per demand, backward traversal** — consume BOH (plan-current only) + ER, then WIP-sweep existing upstream inventory, then fresh production upstream.
3. **3-phase timing** — JIT; Build-Ahead up to **BAL**; Build-Late up to **BLL** (minimise lateness, else short).
4. **Alternates** — choose by activity priority / proportion / key / end-date; support split ratios + time-varying priority.
5. **Constraints** — lead-time offset, **lot size** (min/mult/max), **yield** (0/NULL→1), per-bucket **capacity** (+ overtime bands), **storage** cap, **no-carry** push.
6. **Safety Stock pass** — Target / WOS, HSS vs SSS, move-in.
7. **Excess cleanup** — `EOHAE − SS`, move-out / release.
8. **FIFO pegging** — order ↔ material ↔ capacity ↔ lot.
9. **Outputs** — Flow Plans, Inventory Plan (BOH→EOH), Delivery Plan (met-on-time / short / late / weighted-late), Pegging, **RCA** (MaterialShort, CapacityShort, LeadTimePlanBeforeCurrent, StorageConstraint, …).

**Determinism:** same network + same config ⇒ byte-identical plan (seeded, replayable) — exactly Kafka's approach, verified by snapshot tests.

**Honesty ledger (label everything):**

| Capability | This build | Note |
|---|---|---|
| OBO heuristic, JIT/BA/BL, lot-size, yield, FIFO pegging, basic RCA | **Real (documented algorithm)** | Our JS implements the wiki's described logic |
| Capacity bands, SS move-in, excess cleanup, no-carry push | **Real (simplified)** | Core behaviour, not every edge flag |
| Multipass phase reordering, telescopic buckets, memoization | **Simulated / illustrative** | Shown as concepts, not run |
| o9's actual solver binary, GraphCube, real tenant data | **Out of scope** | We teach the model, not the product instance |

**This one engine powers**: the Solver Playground, the Scenario Lab, every
Worked Example, the RCA Clinic, and auto-graded quiz answers. Build it once in
Iteration 1; everything else consumes it.

---

## 3. Information architecture (the full map)

Organised as a **beginner → advanced study spine** (11 tracks, ~60 modules). Each
module = the existing `{ id, title, group, render(container), destroy() }` pattern.
Legend: **KEEP** (exists, light refresh) · **UPGRADE** (exists, make engine-driven / expand) · **NEW**.

### Track 0 — Supply Chain Foundations *(for the true beginner)* — all NEW
- `sc-basics` — what a supply chain is (Source → Make → Deliver / SCOR); upstream vs downstream.
- `demand-supply-match` — the matching problem SCS exists to solve; push vs pull.
- `planning-landscape` — MRP vs DRP vs MPS vs S&OP; where SCS sits.
- `key-vocab` — 25 must-know terms before the solver (lead time, BOM, safety stock, MOQ, on-hand…).

### Track 1 — Meet the Solver *(Foundations)*
- `what-is-solver` **UPGRADE** — plugin in GraphCube; heuristic, **not** LP.
- `why-solver` **KEEP** · `solver-components` **KEEP** · `planning-engine-stack` **KEEP**.
- `obo-heuristic` **NEW** — order-by-order backward propagation (the mental model, animated).
- `demand-sorting` **NEW** — Priority → Fair-Share → Due Date → Qty → key (interactive sorter).
- `three-phases` **NEW** — JIT → Build-Ahead → Build-Late (engine-driven).
- `solve-pipeline` **NEW** — the 23-step execution order (WIP → Demand → SS → Excess → Replan → Pegging → RCA → Export).

### Track 2 — The Network & Data Model — mostly NEW
- `nodes` **NEW** — Material, Activity, Demand, Capacity, Storage, Group (mandatory vs optional).
- `network-types` **NEW** — **Manufacturing** (BOM+Routing), **Distribution** (BOD+Mode), **Procurement** (Supplier+Mode).
- `dimensions` **NEW** — Item, Location, Time, Resource, Activity, Customer, Order, Lot, Storage, RootCause, Group.
- `graphs` **NEW** — consumption / production / capacity / storage graphs; association-graph duality.
- `planning-horizon` **NEW** — Start / Current / End buckets; how it shifts demand & reads supply.
- `network-topology` **UPGRADE** — interactive network explorer (reuse `ArchDiagram`, make it the engine's canvas).
- `multi-echelon` **KEEP/UPGRADE** — time-phased DRP waterfall across tiers.

### Track 3 — Solver Inputs
- `inventory-inputs` **UPGRADE** — BOH (plan-current only!) vs ER (all buckets).
- `demand-inputs` **UPGRADE** — priority, **BAL**, **BLL**, plan-date offset, fulfilment policy (MULTIPLE/SINGLE/INFULL), proportional sourcing.
- `capacity-inputs` **UPGRADE** — availability, overtime **bands**, categories (I/O/R), MRU, simultaneous.
- `storage-inputs` **NEW** — shared per-location cap; storage fence.
- `safety-stock` **NEW** — Target / WOS / Min-Max; **HSS vs SSS**; priority; bands; strategy (MOVE_IN).
- `wip-inputs` **NEW** — planned vs locked; infeasibility **OVERRIDE vs SHORT**; expedite.
- `activity-params` **NEW** — lead time, effectivity, **MPBO**, holidays, time-varying LT.
- `max-stock` **NEW** — per-node ceiling; Storage wins when both set.
- `bom-effectivity` **NEW** — component start/end; zero-consumption-qty-per (preferred).
- `other-inputs` **NEW** — Infinite Inventory, **Objective Rank List**, deletion of prior plans.

### Track 4 — Constraints & Timing
- `hard-vs-soft` **NEW** — material/capacity/storage = hard; proportional/MRU = soft.
- `freeze-windows` **KEEP** · `calendar-constraints` **UPGRADE** (edge holiday ≠ activity holiday; LT stretch).
- `quantity-constraints` **UPGRADE** — lot size min / mult / **max** / soft / fence; EOQ.
- `capacity-constraints` **KEEP** · `network-validity` **KEEP**.
- `priority-orl` **UPGRADE** (from `priority-constraints`) — demand priority + **Objective Rank List** (Band/Lot/ActivityMarker/Late, relaxed right→left).

### Track 5 — Solver Decisions *(how it plans — engine-driven)*
- `net-requirements` **UPGRADE** · `timing-logic` **UPGRADE** · `sourcing-logic` **UPGRADE** (alternates, split, time-varying priority).
- `wip-sweep` **NEW** — iterative-deepening inventory sweep.
- `material-reallocation` **NEW** — steal + compensate later (the class-based hinge).
- `shortage-handling` **KEEP/UPGRADE** · `allocation` **KEEP/UPGRADE** (fair share).
- `safety-stock-pass` **NEW** — SS move-in / make-new.
- `excess-cleanup` **NEW** — `EOHAE − SS`; move-out vs release.
- `pegging` **UPGRADE** — FIFO post-process; order/material/capacity/lot; preferential (Pegging ID).

### Track 6 — Invocation & Planning Types — all NEW
- `invocation` — command-line `exec plugin`, action button, NamedSets.
- `constrained-unconstrained` — Material / Capacity constrained flags (the 3-flag matrix).
- `plan-types` — FULL / INCREMENTAL / IDENTIFY_SEGMENTS / EXPORT_ONLY.
- `incremental-order-promise` — incremental plan, Persistent SCS, Order Promise / ATP.

### Track 7 — Outputs & Reports
- `solver-outputs` **UPGRADE** — overview of the output stack (aggregate → order-level).
- `flow-plans` **NEW** — the 4 flow tables; inventory-balance reconciliation.
- `inventory-plan` **NEW** — BOH→EOH; surplus / deficit analytics.
- `delivery-plan` **NEW** — met-on-time / short / late; **weighted-late**; commit date.
- `distribution-load-plan` **NEW** — same-item/different-location; resource→produced material.
- `where-used` **NEW** — cumulative LT (sum), yield (product), level (count).
- `rca` **NEW** — the diagnostic layer: Additive / OBO / Cascading / WIP / SS; **constraint problem-type** vocabulary.

### Track 8 — Supported Models *(advanced capabilities)* — all NEW
Taught in **dependency order**, not alphabetically (two axes: *what you match on* → lot → supply code → expiry; *how inventory may move* → hard-peg → class reallocation → no-carry push):
- `lot-based` (+ lot size) → `supply-code` → `mix-match` → `shelf-life` → `class-based-shelf-life`.
- `class-based-planning` — the hard-pegging → class-based hinge that unlocks the three above.
- `no-carry` · `co-products` · `yield-time-varying` · `campaign-batch` · `alt-resource-consolidation`.
- `multi-step-routing` (+ WIP) · `psp` (single-path) · `soft-quarantine` · `shipping-holidays` · `transition-substitution`.

### Track 9 — Optimization, Performance & Ops — all NEW
- `optimization` — ORL, excess cleanup, WIP sweep, material reallocation, re-entrant, **multipass** phase reordering, Optimize Demand Supportability.
- `performance` — telescopic buckets, segmentation / parallel run, memoization / caches (with the real before/after numbers: 430→71 min, 9 hr→1 hr).
- `debug` — the solve pipeline as a debugger; traces; sanity checks (Σ Pegging = Plan; no NOH; no capacity overload).
- `config-ui` — tabs (Demand/Inventory/Activity/Manufacturing/Parameters); flag vs dynamic-arg.
- `ml-flow` — run benchmarking / comparison.
- `deployment` — Remote SCS (K8s offload) vs Retail SCS (Hive-streamed, BOM-less).

### Track 10 — Learning & Mastery *(platform layer)*
- `playground` **NEW** — the **Solver Playground**: edit a network + config, run the engine, watch JIT/BA/BL, see Flow/Inventory/Delivery plans + Pegging + RCA recompute live.
- `scenario-lab` **UPGRADE** (from `sim-lab`) — disruptions now *drive* the engine (holiday length, spike %, capacity cap → real recomputed KPIs).
- `capability-matrix` **NEW** — the ~208-feature × 4-model (Lot / Supply-Code / Shelf-Life / combined) filterable grid from the Minimum Features Checklist.
- `rca-clinic` **NEW** — "demand is short — why?" diagnose with computed RCA; the killer interview-prep surface.
- `worked-example` **KEEP/UPGRADE** — CAT parts, now one of several engine-run walkthroughs.
- `business-scenario` **KEEP**.
- `interview` **UPGRADE** · `scenario-interview` **UPGRADE** · `mock-interview` **NEW**.
- `quiz` **UPGRADE** → per-module **Test Yourself** + aggregate **Study Deck**.
- `decision-drills` **NEW** — "which flag / which model?" rapid drills.
- `glossary` **KEEP/UPGRADE** · `cheatsheet` **NEW** (printable) · `master-map` **KEEP/UPGRADE**.
- `dashboard` **NEW** — progress + mastery analytics + spaced-repetition review queue.

---

## 4. Platform features to adopt from Kafka / Iceberg

- **Feature bus** (Iceberg pattern): features under `js/features/` listen for an
  `app:navigate` event and use nav accessors — add a feature by adding a listener,
  not by editing the router.
- **Per-screen QuestionBank** → auto "Test Yourself" + Study Deck with best-score
  (`SolverViz.QuestionBank[id] = [{q, options, correct, explanation, difficulty}]`).
- **Progress & mastery** — `localStorage` (`o9scs-done`, visited checkmarks, quiz
  scores), resume last screen, completion meter per track.
- **Command palette** (⌘/Ctrl-K), keyboard shortcuts (have already), first-run tour, toast.
- **Printable cheat sheet** (`print.css`) + **config reference** (the measure/flag "API").
- **PWA** — manifest, icons, offline (the `backup-button.js` + `.zip` convention already exists).
- **Spaced-repetition review** — resurface weak concepts (Kafka `review.js`).
- **Optional cloud sync** — out of scope (Track 2 / backend); local-first + export/import, like both tools.

---

## 5. Technical architecture

**Keep (reuse as-is):** `core/router.js`, `app.js` registry, theme, keyboard,
tooltip; components `AnimationEngine`, `AnimationControls`, `ArchDiagram`,
`StateMachine`, `Timeline`, `ConceptFactory`, `BusinessLens`, `CodeViewer`; the
CSS token system; the `.nojekyll` + whole-repo Pages deploy.

**Add:**
- `sim/scs-engine.js` (+ `sim/scs-engine.test.mjs`, `sim/PRESERVATION.md` honesty ledger).
- `sim/networks.js` — a few canonical networks (CAT distribution; a 2-level BOM manufacturing; a procurement/alt-source case) the engine runs on.
- `js/features/` — progress, command-palette, test-yourself, tour, gestures, backup (port Iceberg's).
- `js/data/` — `question-bank.js`, `capability-matrix.js` (the 208×4 grid), `config-reference.js`, expanded `solver-concepts.js` / `interview-bank.js`.
- `scripts/check-syntax.mjs` + `scripts/verify.mjs` (headless Chromium sweep, all screens × 2 themes × 3 widths) — gate in CI before Pages deploy.

**Conventions kept:** global `window.SolverViz` (alias `AV`); modules self-register;
nav registry in `app.js`; design tokens in CSS custom properties; additive CSS
files loaded last; **no build step**.

---

## 6. Staged roadmap (each iteration starts only on an explicit "go")

| Iter | Theme | Ships |
|---|---|---|
| **0** | **Shell & scaffolding** | Full-IA nav (collapsible tracks), progress persistence, command palette, design refresh, `verify.mjs` + CI gate, PWA. All existing modules keep working. |
| **1** | **The SCS Mini-Engine** ⭐ | `scs-engine.js` + Node tests + **Solver Playground**. The keystone every later screen reuses. |
| **2** | **Network & Data Model** | Track 0 + Track 2 (nodes, 3 network types, dimensions, graphs, horizon, topology explorer). |
| **3** | **Inputs** | Track 3 — all 10 inputs, each an engine-driven widget. |
| **4** | **Constraints & Decisions** | Tracks 4 + 5 (timing, sourcing, WIP sweep, reallocation, excess, pegging) on the engine. |
| **5** | **Outputs & RCA Clinic** | Track 7 + the RCA Clinic (computed diagnoses). |
| **6** | **Supported Models** | Track 8 (17 models, dependency order) + **Capability Matrix** grid. |
| **7** | **Optimization / Perf / Ops** | Track 9 + Config-UI simulator + Invocation lab (Track 6). |
| **8** | **Mastery layer** | Per-module quizzes, interview + scenario + mock interview, decision drills, spaced repetition, **dashboard**. |
| **9** | **QA & polish** | a11y, both-theme audit, cheat sheet, master map, content pass, honesty-ledger finalise. |

Scope control: **preserve everything** (nothing removed without a logged reason),
**stay static**, **never fake** (label all simulation), **test the engine for real**.

---

## 7. Why this is the best beginner study tool

1. **One coherent spine** — Foundations → Network → Inputs → Constraints → Decisions → Invocation → Outputs → Models → Ops → Mastery. A newcomer is never dropped mid-depth.
2. **It computes, so it convinces** — the same real engine behind every page means a learner changes a number and *watches the solver think*, instead of reading a fixed story.
3. **Measure-level fidelity** — the wiki's power is in named measures/flags; the tool treats them as the API (config reference + capability matrix), which is exactly what interviews and real config demand.
4. **Practice to mastery** — quizzes, RCA clinic, decision drills, interview banks and spaced repetition turn passive reading into recall.
5. **Honest** — a labelled real/simulated ledger builds trust and teaches the real boundaries of the heuristic.

---

*Living document — update each iteration (Kafka `BUILD.md` convention). Source
digests for all 44 wiki pages are summarised in the session that produced this
plan.*
