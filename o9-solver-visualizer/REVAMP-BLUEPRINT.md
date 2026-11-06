# o9 Supply Chain Solver — Mastery Platform: Build Blueprint (v2)

The single build-ready reference for turning the **o9 Solver Visualizer** (a focused
DRP/distribution explainer) into the **o9 SCS Mastery Platform** — the best
beginner → mastery study tool for the o9 Supply Chain Solver, built to the depth
of the repo's **Kafka** tool and grounded end-to-end in a **real o9 tenant
(CATMPN)**.

- **Current tool:** `o9-solver-visualizer/` — vanilla JS, ES-module, no build step, GitHub Pages.
- **Architecture model:** `kafka/` — the most elaborative sibling (53 module files, 3 unit-tested sim engines, 15 data banks, 20 components, spaced repetition, cloud sync, PWA). We mirror its conventions exactly (see §4).
- **Business-case spine:** the **CATMPN** tenant export — `GSP_SSIS_Config_Schema_SampleData.zip` (392-package SSIS integration project, 3,810-table DB schema, a 43 MB live o9 config backup, and 17 real inbound solver-feed tables with sample data). See §2.
- **Status:** Iteration 0 shipped (mastery shell — nav, progress, palette, PWA, CI gate). This v2 blueprint supersedes v1; content/engine iterations are gated by explicit "go." See §10 log.

> **Two mandates drive v2.** (1) **Be elaborative like Kafka** — a tested engine, per-screen quiz banks, a mock interview, incident/decision/RCA drills, spaced repetition, a review center, a config reference, a dashboard, optional cloud sync. (2) **Ground everything in the real CATMPN tenant** — real tables, columns, dimensions, measures and the real end-to-end data flow, so the learner studies the actual thing, not a toy.

---

## 1. The gap we are closing

| | Current tool | Kafka bar (to match) | v2 target |
|---|---|---|---|
| **Scope** | DRP/distribution slice | whole domain, 31 curriculum modules + pages | full SCS **+ the real integration layer** |
| **Engine** | scripted playback | deterministic, **`node --test`** sim (real murmur2) | **real OBO heuristic**, `node --test`, output schema == real `Out_Fact_*` |
| **Practice** | 1 quiz + interview text | per-module quiz bank, mock interview, decision + incident drills, spaced repetition | same, **+ RCA Clinic on real Problem Types** |
| **Progress** | visited meter | visit **vs** mastery (quiz ≥⅔), dashboard, review center, cloud sync | same |
| **Grounding** | synthetic "Widget-A" | real Apache Kafka vectors | **real CATMPN tables/columns/measures/dims** |
| **Reference** | glossary | config reference, cheat sheet, capability matrix | same, grounded in real measure names |

The current tool already shares Kafka's static, module-per-screen, hash-routed,
token-themed architecture. So v2 is **expand content + add the engine and practice
layers + swap synthetic data for the real tenant** — not a rewrite. Nothing is removed.

### The core insight about SCS (drives the engine and the whole spine)

SCS is **not** a cost-minimising LP/MIP. It is a **priority-ranked, order-by-order
(OBO) heuristic** that plans one demand at a time, **backward from customer to
supplier**, in three phases — **JIT → Build-Ahead → Build-Late** — honouring hard
constraints (material, capacity, storage, lead time, lot size, no-carry) and
relaxing soft ones in the order given by the **Objective Rank List**. *The
Objective Rank List is the objective.* It is simple enough to **actually implement
in JavaScript and unit-test** — the signature move (§3), exactly as Kafka
implements and tests the real murmur2 partitioner.

---

## 2. The business-case spine — the real CATMPN tenant

Every number, table, column, dimension and measure in the tool comes from one real
o9 Supply Chain Solver deployment, so the learner studies reality. (Source files
digested to `scratchpad/CATMPN-factsheet.md`; the tool ships a distilled dataset,
not the raw tenant export.)

**Who CATMPN is.** A global spare-parts / distribution supply chain. o9 Plans:
**CAT Demand Plan**, **CAT Inventory Plan**, **CAT Supply Plan** (the solver's
plan), plus *TenantStats* and *Algorithm Parameters*. Logistics Centers (LC) = DCs;
Items = parts; plus Suppliers, Customers, Stock Transfers (STO) between LCs, and
Purchases (PO) from suppliers. Platform instance nicknamed **mPower**. Multi-region
solve (US_MW92 / US_SE92 / US_SW92 / CHINA / INDIA / UK).

**The real o9 model (from the config backup).**
- **61 dimensions**, the SCS-critical ones being: **Activity, BODLane, Item/GLBItem,
  Location, LogisticsCenter, Supplier, Customer, LOTID, Resource, Order, CPO/SPO/STO
  (+ line numbers), PlanningCalendar, Version, FlowPath, Step, TransMode, NamedNode,
  Algorithm, LPObjective, RootCause, Segment, Part Type, Value Stream, Container,
  DropZone, MinimumQuantity, Offset, DeskCode**.
- **The solver is the `o9.GraphCube.Plugins` plugin** (C#, host `LiveServer`) — this
  is the literal confirmation that SCS = a heuristic plugin inside the GraphCube
  server. (All other config plugins are PowerShell/JS infra, not the solver.)
- **865 RuleGroups**, 4,818 rule-group measure usages, 2,318 plugin measure usages,
  404 users, 821 roles, 20 workbooks, 25 alerts — the measure/rule layer the config
  reference teaches.

**The real end-to-end data flow (the learner's capstone trace).**

```
ERP / mPower  ──SFTP──▶  SSIS staging (392 .dtsx; 3,810 tables)
                         In_Fact_*  →  Stg_*  →  Ref_*  →  Out_Fact_*     + CFU_* critical-file gates
                               │
                               ▼  17 real inbound solver-feed tables
   Demand:   In_Fact_DemandForecastInitial / …Detail / …Header, DemandHistoryLC / …Customer,
             In_Fact_OutboundOpenRequirement (open demand orders, Ship_By_Date + DemandFullfillmentPriority)
   Supply:   In_Fact_LCItem_GSC (on-hand buckets), In_Fact_SupplierLCItem_P2 (split %, MOQ, multiple,
             7-part lead-time build-up), In_Fact_PurchaseAgreementLine / …Schedule_Extd / …RequisitionS,
             In_Fact_StockTransferAgreement / …Schedule, In_Fact_InboundAsn, In_Fact_(In/Out)boundFilledRequirement
                               │
                               ▼  SolverInput  →  SolverProc_Daily/Weekly/Monthly  →  SolverProc_Daily_Post
                         (orchestrated by SolverFile_Flag_Lock / _Polling / _JobStatus(+EmailAlert);
                          Downloadmpower_Solver(_Pegged); ConsFirm_Fence_Date_Solver)
                               │
                               ▼  Solver (GraphCube plugin) runs on CAT Supply Plan
                               │
                               ▼  real Out_Fact_* outputs
   Pegging:  Out_Fact_ProdPeggedQTYAssocn_Solver / ConsPeggedQTYAssocn_Solver / Demand_pegging / InvPeggedQty
             grain: from{BODLane,TransMode,LC,Day,GLBItem,LOTID} → to{Order,CustomerType,Customer,LC,Day,GLBItem} + Pegged Qty
   Plans:    Out_Fact_LCItemInventoryBuckets (10 inventory buckets), DistProd/DistCons Quantity_Solver,
             DistProductionWIP / DistConsumptionWIP_Solver, BOMLT_Solver / BODLaneLTSLC_Solver
   RCA:      Out_Fact_SolverRCAReport (RootCause.[Problem Type] + Suggested Available Date), MaterialRootCause_Solver
                               │
                               ▼  downstream: Purchase/StockTransfer Collaboration, mPower upload,
                                  supplier collaboration emails, Surplus Exception Workbench, IPS reports
```

**The 17 real inbound tables** (used verbatim as the schema-explorer content and the
engine's input shapes). Representative real columns:

| # | Table | Teaches | Key real columns |
|---|---|---|---|
| 6 | `In_Fact_DemandForecastInitial` | independent demand (LC→LC net flow) | From_LC, To_LC, Item, Forecast_Date, Forecast_Quantity |
| 14 | `In_Fact_OutboundOpenRequirement` | the OBO demand order | Document#/Line, Item, Requirement_Quantity, Expected_Fill_Date, Allocation_Quantity, **Ship_By_Date**, To_Party_* |
| 9 | `In_Fact_DemandForecastHeader` | demand priority | Logistics_Center_Priority, Customer_Type, **DemandFullfillmentPriority** |
| 8 | `In_Fact_LCItem_GSC` | on-hand (BOH) + cost | Box_Quantity, Standard_Cost, Carrying_Cost, **10 buckets**: Available_for_Sale/Allocated/Bin_to_Bin/Quality_Inspection/Receiving/Reserved/Quality_Quarantine/Quality_Rejected/Scrap_Hold/Missing |
| 11 | `In_Fact_SupplierLCItem_P2` | sourcing + lead time | Supplier_Split_Percentage, Minimum_Order_Quantity, Order_Quantity_Multiple, **Order_Issue + Material_In_Process + Material_Acquisition + Planned_Delivery + Goods_Receiving = Full_Supplier_Lead_Time** |
| 5 | `In_Fact_PurchaseSchedule_Extd` | scheduled receipts (supply) | PA#/Line, PurchaseSchedule_ID, Expected_Ship/Delivery/Available_Date, Schedule_Quantity, Promise_Ship_Date |
| 4 | `In_Fact_StockTransferSchedule` | inter-DC in-transit | STA#/Line, STS_ID, Expected_Ship/Delivery/Available_Date, Schedule_Quantity, Actual_Receipt_Quantity |
| 12 | `In_Fact_InboundAsn` | firm in-transit | ASN_Reference_Number, Expected/Actual_Ship_Date, Ship_Quantity, From_Party_* |
| 16 | `In_Fact_PurchaseScheduleCollaboration` | supplier round-trip | Schedule_collaboration_Action, Collaboration_Status, *_Collaboration date/qty |

*(Full 17-table / column list in `scratchpad/CATMPN-factsheet.md`; the rest — DemandForecastDetail, DemandHistoryLC/Customer, StockTransferAgreement, PurchaseAgreementLine, PurchaseRequisitionSchedules, (In/Out)boundFilledRequirement — ship in `data/catmpn-dataset.js`.)*

**Why this is the perfect teaching spine.** A learner traces **one real `Item × LC`**
from forecast-in to collaboration-out, and every abstract SCS concept has a real
anchor: demand sorting ← `DemandFullfillmentPriority` + `Logistics_Center_Priority`;
lead-time offset ← the 7-part supplier lead-time build-up; sourcing split ←
`Supplier_Split_Percentage`; lot size ← `Minimum_Order_Quantity`/`Order_Quantity_Multiple`;
scheduled receipts ← PO/STO schedules + ASNs; pegging ← the real `from→to` grain;
RCA ← the real `RootCause.[Problem Type]`. The **engine's output schema is literally
the real `Out_Fact_*` schema** — the strongest possible "this is real" signal.

---

## 3. The signature move — the SCS Mini-Engine (`sim/scs-engine.js`)

Mirrors Kafka's `sim/engine.js` **exactly**: a dependency-free ES module of pure
exported functions **plus a class**, deterministic (seeded, replayable), importable
in the browser *and* in Node, unit-tested with `node --test`, and honest about its
boundaries. Kafka tests the real murmur2 against Apache's published vectors; we test
the documented SCS heuristic against hand-worked expected plans.

**Module shape** (pure fns + class, kafka-identical pattern):

```js
// sim/scs-engine.js
export function netRequirement(demand, boh, ss) { return Math.max(0, demand - boh + ss); }
export function roundToLot(qty, { min = 0, mult = 1, max = Infinity }) { /* min → ceil-to-mult → cap */ }
export function sortDemands(demands) { /* Priority → Fair-Share → Due Date → Qty → key — stable */ }
export function offsetByLeadTime(dueDay, calendar, leadTime) { /* backward over working days */ }

export class ScsSolver {
  constructor({ network, config, seed = 1 }) { this.seed = seed >>> 0; this.reset(); }
  reset() { /* rebuild RNG + planning buckets so replays are byte-identical */ }
  solve() { /* the pipeline below; returns a Plan */ }
  snapshot() { /* stable, serialisable plan for determinism tests */ }
}
export default ScsSolver;
```

**What `solve()` computes** (the documented pipeline, honestly):
1. **Demand sort** — Priority → Fair-Share Priority → Due Date → Quantity → key (`sortDemands`).
2. **Per demand, backward traversal** — consume **BOH (plan-current bucket only)** + ER; **WIP-sweep** existing upstream inventory (iterative deepening); then fresh upstream production.
3. **3-phase timing** — **JIT**; **Build-Ahead** up to **BAL**; **Build-Late** up to **BLL** (minimise lateness, else short).
4. **Alternates / sourcing** — choose by activity priority / proportion (`Supplier_Split_Percentage`) / key / end-date; split ratios + time-varying priority.
5. **Constraints** — lead-time offset (the 7-part build-up), **lot size** (min/mult/max), **yield** (0/NULL→1), per-bucket **capacity** (+ overtime bands), **storage** cap, **no-carry** push.
6. **Safety-stock pass** — Target / WOS, HSS vs SSS, move-in.
7. **Excess cleanup** — `EOHAE − SS`, move-out / release.
8. **FIFO pegging** — order ↔ material ↔ capacity ↔ lot, emitted in the **real `from→to` grain**.
9. **Outputs** (schemas == real `Out_Fact_*`): **Flow Plans**, **Inventory Plan** (the 10 buckets / BOH→EOH), **Delivery Plan** (met-on-time / short / late / weighted-late), **Pegging**, **RCA** (real `Problem Type`s: MaterialShort, CapacityShort, LeadTimePlanBeforeCurrent, StorageConstraint, …).

**Determinism:** same network + config ⇒ byte-identical `snapshot()` — verified by
`assert.deepEqual(build(), build())`, exactly Kafka's determinism test.

**Canonical networks** (`sim/networks.js`) the engine runs on — distilled from real
CATMPN rows: (a) a **CAT distribution** lane Supplier→DC-National→DC-Regional→Store-LC
for one real `Item × LC`; (b) a 2-level BOM **manufacturing** case; (c) a
**procurement / alternate-source** case (two suppliers, split %, different lead
times + MOQ). These double as the Playground presets and every Worked Example.

**Honesty ledger** (ships as `sim/PRESERVATION.md`, Kafka convention):

| Capability | This build | Note |
|---|---|---|
| OBO heuristic, JIT/BA/BL, lot-size, yield, FIFO pegging, basic RCA | **Real (documented algorithm)** | JS implements the wiki's described logic; `node --test` |
| Capacity bands, SS move-in, excess cleanup, no-carry push | **Real (simplified)** | core behaviour, not every edge flag |
| Multipass phase reordering, telescopic buckets, memoization | **Simulated / illustrative** | shown as concepts, not run |
| o9's actual solver binary, GraphCube, raw tenant data | **Out of scope** | we teach the model with real-shaped data, not the product instance |

**This one engine powers**: the Solver Playground, Scenario Lab, every Worked
Example, the RCA Clinic, and auto-graded "compute-this" quiz answers. Build it once
in Iteration 1; everything else consumes it.

---

## 4. Architecture to mirror from Kafka (exact conventions)

Kafka is static, ES-module, no-build, `node --test`. The o9 tool already matches
that skeleton. The table maps **each Kafka convention → the o9 target**, so the
builder knows precisely what is **KEEP** (already equivalent), **ADD**, or **RENAME**.

| Kafka convention | o9 current reality | v2 action |
|---|---|---|
| **Registries** `MODULES` (nav.js) + `LOADERS` (script.js) + `PAGES` | `TRACKS` array in `app.js` (single source of truth; routes + sidebar derived) + self-registering modules + lazy `js/modules/<id>.js` loader in `core/router.js` | **KEEP** — functionally equivalent and already built. Do **not** port Kafka's registry mechanics; keep `TRACKS`. |
| **Module contract** `export function mount(container)` → optional cleanup | `AV.registerModule({ id, title, render(container), destroy() })` | **KEEP** o9's; `render`==`mount`, `destroy`==cleanup. |
| **`createModuleShell({tag,title,subtitle,tabs})` + `initTabs`** | ad-hoc per-module headers | **ADD** `components/module-shell.js` (+ `initTabs`) and adopt for new modules. |
| **Auto-append** quiz / self-explain / pager via `enhanceModule(id)` | router already auto-appends `BusinessLens` after `render` | **ADD** the same hook: after `render`, append `QUIZ_BANK[id]` quiz, `SELF_EXPLAIN[id]`, prev/next pager. |
| **Sim engine** `sim/engine.js` pure fns + class + seeded determinism | none | **ADD** `sim/scs-engine.js` (§3). |
| **Tests** co-located `*.test.mjs`, `node --test`, zero deps | `scripts/check-syntax.mjs` + `scripts/verify.mjs` | **ADD** `sim/*.test.mjs`, `data/*.test.mjs`; wire `node --test` into `scripts/` + CI. |
| **Content banks** `data/*.js`, one UPPER_SNAKE export, two shapes (keyed-by-id / flat-with-moduleId) | `data/{catmpn-data,interview-bank,solver-concepts}.js` | **ADD** the full bank set (§6); keep existing, extend. |
| **Progress store** single versioned key `{category:{id:{…,ts}}}`, `record/get/all/counts/reset` + event bus | `features/progress.js` (visited set, `o9scs-progress`) | **UPGRADE** to `data/progress-store.js` kafka-shape; keep `features/progress.js` as the sidebar view. |
| **Visit vs mastery** — visit on open, mastery when quiz best ≥ ⅔; `*:quiz-graded` event | visited only | **ADD** mastery via quiz event + ratio. |
| **Spaced repetition** `data/review.js` (SM-2: `buildDeck/schedule/partitionDeck/buildSession`) | none | **ADD** `data/review.js` + Review Center page. |
| **Components** `createX()`→HTML string, `initX(container)`→wire | `core/*`, `components/*` mixed | **ADD** `quiz.js`, `command-palette.js` (exists as feature — keep), `module-shell.js`, `toast.js`, `tour.js`, `pager.js`, `self-explain.js` following the `create/init` split. |
| **Cloud sync** `components/cloudsync.js` — Supabase, inert until configured, per-key type-aware merge, hashed sync code | none | **ADD** (optional, off by default; `supabase-config.js` blank == local-only). Mirror merge rules + `cloudsync.test.mjs`. |
| **PWA** manifest + icons + theme color | **already shipped** (Iter 0) | **KEEP**. |
| **Design intent doc** `BUILD.md` + `ENHANCEMENTS-*.md` | this blueprint + iteration log | **KEEP** (this file is the `BUILD.md`). |

**Persistence keys** (o9 prefix, Kafka's scheme): `o9scs-theme`, `o9scs-done`
(mastery set), `o9scs-progress-v1` (unified store), `o9scs_quiz_<id>`,
`o9scs_selfx_<id>`, `o9scs_nav_collapsed`, `o9scs_tour_done`, `o9scs:synccode`
(deliberately **not** synced). All reads/writes try/catch-guarded; every write fires
a `window` event so open views live-refresh.

**Guardrails (from Kafka's BUILD.md, adopted verbatim):** preserve everything
(additive iterations, nothing removed without a logged reason); stay static (no
bundler); **never fake** — label every simulation with the real-vs-simulated ledger;
**test logic for real** with `node --test`.

---

## 5. Information architecture (full module map, grounded in CATMPN)

Beginner → mastery spine. 12 tracks. Each module = the existing
`{ id, title, render(container), destroy() }` pattern, registered in `TRACKS`
(`app.js`). Legend: **KEEP** (exists, light refresh) · **UPGRADE** (exists → make
engine-driven / real-data) · **NEW**. Current built = 37 modules; `ready:false`
entries render the Roadmap screen until built, so nav never breaks.

> **Grounding rule:** every Input/Decision/Output module shows the **real CATMPN
> table + columns + measure name** it corresponds to, and (where applicable) runs the
> engine on a real-derived network.

### Start Here
`home` **KEEP** · `dashboard` **NEW** (progress + mastery + review queue) ·
`business-scenario` **KEEP/UPGRADE** (→ real CATMPN network) ·
`worked-example` **UPGRADE** (engine-run trace of one real `Item × LC`).

### Track 0 — Supply Chain Foundations *(true beginner)* — all NEW
`sc-basics` · `demand-supply-match` · `planning-landscape` (MRP/DRP/MPS/S&OP) · `key-vocab` (25 terms).

### Track 1 — Meet the Solver
`what-is-solver` **UPGRADE** (plugin in GraphCube — cite `o9.GraphCube.Plugins`) ·
`why-solver` **KEEP** · `solver-components` **KEEP** · `planning-engine-stack` **KEEP** · `objectives` **KEEP** ·
`obo-heuristic` **NEW** (animated) · `demand-sorting` **NEW** (real `DemandFullfillmentPriority`) ·
`three-phases` **NEW** (engine) · `solve-pipeline` **NEW** (the 23-step order).

### Track 2 — Network & Data Model
`nodes` **NEW** (Material/Activity/Demand/Capacity/Storage/Group) ·
`network-types` **NEW** (Mfg=BOM+Routing · Distribution=BOD+Mode · Procurement=Supplier+Mode) ·
`dimensions` **NEW** (real 61-dim list; the SCS-critical subset) ·
`graphs` **NEW** (consumption/production/capacity/storage; BODLane) ·
`planning-horizon` **NEW** (Start/Current/End) · `network-topology` **UPGRADE** (engine canvas) ·
`multi-echelon` **KEEP/UPGRADE** · `drp-overview` **KEEP**.

### Track 3 — Solver Inputs *(each: real table + columns + engine widget)*
`inventory-inputs` **UPGRADE** (`In_Fact_LCItem_GSC`, 10 buckets; BOH plan-current vs ER) ·
`demand-inputs` **UPGRADE** (`OutboundOpenRequirement` + `DemandForecastHeader`; BAL/BLL/priority/policy/proportional) ·
`capacity-inputs` **UPGRADE** (bands/MRU/categories) · `storage-inputs` **NEW** ·
`safety-stock` **NEW** (Target/WOS/MinMax; HSS vs SSS) · `wip-inputs` **NEW** (OVERRIDE vs SHORT) ·
`activity-params` **NEW** (the 7-part lead-time build-up from `SupplierLCItem_P2`; effectivity; MPBO; holidays) ·
`max-stock` **NEW** · `bom-effectivity` **NEW** ·
`supply-order-inputs` **UPGRADE** (`PurchaseSchedule_Extd` / `StockTransferSchedule` / `InboundAsn` as scheduled receipts) ·
`constraint-params` **KEEP** · `other-inputs` **NEW** (Infinite Inv · Objective Rank List).

### Track 4 — Constraints & Timing
`hard-vs-soft` **NEW** · `freeze-windows` **KEEP** · `calendar-constraints` **UPGRADE** ·
`quantity-constraints` **UPGRADE** (real `Minimum_Order_Quantity`/`Order_Quantity_Multiple`) ·
`capacity-constraints` **KEEP** · `network-validity` **KEEP** · `priority-constraints` **UPGRADE** (→ Objective Rank List).

### Track 5 — Solver Decisions *(engine-driven)*
`net-requirements` **UPGRADE** · `timing-logic` **UPGRADE** · `sourcing-logic` **UPGRADE** (real split %) ·
`wip-sweep` **NEW** · `material-reallocation` **NEW** (class-based hinge) ·
`shortage-handling` **KEEP/UPGRADE** · `allocation` **KEEP/UPGRADE** (fair share) ·
`safety-stock-pass` **NEW** · `excess-cleanup` **NEW** · `pegging` **UPGRADE** (real `from→to` grain).

### Track 6 — Invocation & Planning Types — all NEW
`invocation` (`exec plugin`, action button, NamedSets) · `constrained-unconstrained` (3-flag matrix) ·
`plan-types` (FULL/INCREMENTAL/IDENTIFY_SEGMENTS/EXPORT_ONLY) · `incremental-order-promise` · `batch-sequence` **KEEP**.

### Track 7 — Outputs & Reports *(schemas == real `Out_Fact_*`)*
`solver-outputs` **UPGRADE** · `flow-plans` **NEW** · `inventory-plan` **NEW** (10 buckets, `LCItemInventoryBuckets`) ·
`delivery-plan` **NEW** (met-on-time/short/late/weighted-late) · `distribution-load-plan` **NEW** ·
`where-used` **NEW** · `rca` **NEW** (real `RootCause.[Problem Type]`).

### Track 8 — Supported Models *(dependency order)* — all NEW
`lot-based` → `supply-code` → `mix-match` → `shelf-life` → `class-based-shelf-life`;
`class-based-planning` (the hard-peg → class hinge); `no-carry` · `co-products` ·
`yield-time-varying` · `campaign-batch` · `alt-resource-consolidation` ·
`multi-step-routing` · `psp` · `soft-quarantine` · `shipping-holidays` · `transition-substitution`.

### Track 9 — Optimization · Performance · Ops — all NEW
`optimization` (ORL, WIP sweep, reallocation, multipass) · `performance` (telescopic buckets,
segmentation/parallel, memoization — real before/after: 430→71 min, 9 hr→1 hr) ·
`debug` (pipeline-as-debugger; Σ Pegging = Plan; no NOH; no capacity overload) ·
`config-ui` (Demand/Inventory/Activity/Mfg/Parameters tabs) · `ml-flow` · `deployment` (Remote vs Retail SCS).

### Track 10 — Learning & Mastery *(platform layer)*
`playground` **NEW** (edit network+config, run engine, watch JIT/BA/BL, live Flow/Inventory/Delivery + Pegging + RCA) ·
`sim-lab` **KEEP/UPGRADE** (disruptions drive the engine) · `capability-matrix` **NEW** (feature × model grid) ·
`rca-clinic` **NEW** ("demand short — why?" on computed RCA) ·
`interview` **KEEP/UPGRADE** · `scenario-interview` **KEEP/UPGRADE** · `mock-interview` **NEW** ·
`quiz` **KEEP** → per-module **Test Yourself** + aggregate **Study Deck** · `decision-drills` **NEW** ·
`review-center` **NEW** (spaced repetition) · `glossary` **KEEP/UPGRADE** · `cheatsheet` **NEW** (printable) · `master-map` **KEEP**.

### Track 11 — Data, Integration & the Real Tenant *(the CATMPN business case)* — all NEW
The differentiator — how data actually gets into and out of the solver.
- `tenant-model` — the real CATMPN config: 5 plans, 61 dims, the GraphCube solver plugin, rule groups.
- `inbound-tables` — interactive schema explorer over the **17 real `In_Fact_*` feed tables** (real columns, sample rows).
- `staging-pipeline` — the SSIS layering `In_→Stg_→Ref_→Out_`; dimension vs fact loads; **CFU critical-file gating**; daily/weekly/monthly cadence.
- `solver-run-ops` — real invocation: `SolverInput` → `SolverProc_*` → `_Post`; `Flag_Lock`/`Polling`/`JobStatus` orchestration; `Downloadmpower_Solver(_Pegged)`.
- `outbound-pegging` — the real `Out_Fact_*` outputs: pegging `from→to`, inventory buckets, RCA report, WIP, collaboration outbound + Surplus Exception Workbench.
- `measure-grain` — o9 measure naming & grain (`Version × BODLane × TransMode × LC × Day × GLBItem × LOTID`; suffixes `(D)`/`(SCPU)`/`- IL`/`- BILT`).
- `end-to-end-trace` — **the capstone**: follow one real `Item × LC` through the whole diagram above, each hop linking to its concept module.

---

## 6. Content banks & data model (file manifest + schemas)

All in `js/data/`, Kafka convention: one UPPER_SNAKE export per file, header comment
documenting the shape, no DOM. Two container shapes: **keyed-by-module-id object**
(auto-consumed by `enhanceModule`) and **flat array with `moduleId` back-ref**.

| File | Export | Shape | Feeds |
|---|---|---|---|
| `catmpn-dataset.js` | `CATMPN` | the real tenant distilled: `{ network, dims, plans, inboundTables:[{name,grain,columns,sample}], outboundTables:[…], measures:[…] }` | every grounded module, the engine's networks, schema explorer |
| `quiz-bank.js` | `QUIZ_BANK` | `{ <moduleId>: [ {q, options:[…], answer:<idx>, explanation} ] }` | per-module Test Yourself, Study Deck, mock interview MCQ pool, review deck |
| `decisions.js` | `DECISIONS` | flat `[{ id, title, difficulty, topic, moduleId, requirement, options:[{label, verdict:'best'\|'viable'\|'wrong', why}], whatIfChanged, interviewNote }]` | Decision Drills ("which flag / which model?") |
| `incidents.js` | `INCIDENTS` | flat `[{ id, difficulty, icon, title, symptom, steps:[{prompt, checks:[{label, correct, evidence\|why, reasoning}]}], rootCause, resolution, prevention, interviewAnswer }]` | RCA Clinic + Incident Bank (real Problem Types) |
| `rca-cases.js` | `RCA_CASES` | `[{ id, demand, network, config, expected:{problemType, suggestedDate} }]` — each **solvable by the engine** | RCA Clinic (computed diagnosis) |
| `interview-bank.js` | `INTERVIEW` | **exists** — extend: `[{ id, moduleId, q, a, tip, difficulty }]` | Interview Q&A, mock interview |
| `solver-concepts.js` | `CONCEPTS` | **exists** — the glossary/term source | Glossary, review deck (`g:<term>`) |
| `self-explain.js` | `SELF_EXPLAIN` | `{ <moduleId>: {prompt, rubric:[…]} }` | auto-appended self-explain block |
| `config-reference.js` | `CONFIG_REF` | `[{ measure, grain, table, tab, type:'flag'\|'dynamic-arg', values, meaning }]` grounded in **real measure names** | Config Reference page, cheat sheet |
| `capability-matrix.js` | `CAPABILITY_MATRIX` | `{ features:[…], models:[Lot/SupplyCode/ShelfLife/…], grid:[[bool]] }` | Capability Matrix page |
| `progress-store.js` | `record/get/all/counts/reset` | key `o9scs-progress-v1`, `{category:{id:{…,ts}}}` | all tracking, dashboard, cloud sync |
| `review.js` | `buildDeck/schedule/partitionDeck/buildSession/nextDueLabel` | SM-2 variant; cards `q:<mid>:<i>`, `g:<term>` | Review Center |
| `mock-exam.js` | `MOCK_EXAM` | timed set drawn from `QUIZ_BANK` + `INTERVIEW` | Mock Interview |

Each bank with testable logic (`review.js`, `mock-exam.js`, `capability-matrix.js`,
and `catmpn-dataset.js` integrity) ships a co-located `*.test.mjs`.

---

## 7. The mastery layer (what makes it a platform, not a doc)

- **Dashboard** (`dashboard`) — reads `progress-store`: per-track visit **and** mastery meters, "continue where you left off," weak-area list, review-due count, overall %.
- **Visit vs mastery** — opening a screen = *visited*; quiz best ≥ ⅔ = *mastered* (stored in `o9scs-done`), surfaced everywhere. Honest progress, Kafka's rule.
- **Per-module Test Yourself** — `QUIZ_BANK[id]` auto-appended by `enhanceModule`; `components/quiz.js` grades, stores best (`o9scs_quiz_<id>`), fires `o9scs:quiz-graded`.
- **Review Center** (`review-center`) — spaced repetition over quiz + glossary cards; due/fresh/later/learned; grade again/hard/good/easy.
- **Mock Interview** (`mock-interview`) — timed mixed set (MCQ + open) from `MOCK_EXAM`; scored, with model answers.
- **Decision Drills** (`decision-drills`) — rapid "which flag / which model / which input?" from `DECISIONS`, each with best/viable/wrong verdicts + "what if changed."
- **RCA Clinic** (`rca-clinic`) — the killer surface: pick a shorted demand, the **engine computes** the real `Problem Type` + suggested date; learner diagnoses, gets graded. Fed by `RCA_CASES` + `incidents.js`.
- **Config Reference + Cheat Sheet** — the measure/flag "API" (`CONFIG_REF`, real measure names) and a printable one-pager (`print.css`).
- **Command palette** (⌘/Ctrl-K) + keyboard shortcuts + first-run tour + toasts — **palette already shipped**; add tour/toast.
- **Optional cloud sync** — Supabase, inert until `supabase-config.js` is filled; per-key type-aware merge; hashed sync code. Local-first always works.

---

## 8. Target file manifest (build-ready tree)

```
o9-solver-visualizer/
  index.html                     KEEP (Iter 0) — add tour/toast/cloudsync <script>s as built
  manifest.json favicon.svg icon-192.png icon-512.png   KEEP (Iter 0, PWA)
  REVAMP-BLUEPRINT.md            this file (the BUILD.md)
  css/
    main.css layout.css components.css   KEEP (tokens, theme)
    platform.css                 KEEP (Iter 0: nav/progress/palette)
    print.css                    NEW (cheat sheet)
  js/
    app.js                       KEEP — TRACKS registry (extend with Track 11 + new ids)
    core/router.js               UPGRADE — add enhanceModule() auto-append hook
    core/keyboard.js             KEEP
    components/
      module-shell.js            NEW (createModuleShell + initTabs + createIQSection)
      quiz.js                    NEW (createQuiz + initQuiz)
      pager.js self-explain.js toast.js tour.js   NEW
      cloudsync.js cloudsync-ui.js   NEW (optional)
      (existing: AnimationEngine, ArchDiagram, StateMachine, Timeline, BusinessLens, CodeViewer …)  KEEP
    features/
      progress.js command-palette.js   KEEP (Iter 0) — progress.js reads progress-store
    data/
      catmpn-dataset.js          NEW (real tenant) — supersedes catmpn-data.js (keep hero Widget-A)
      quiz-bank.js decisions.js incidents.js rca-cases.js   NEW
      self-explain.js config-reference.js capability-matrix.js mock-exam.js   NEW
      progress-store.js review.js   NEW
      interview-bank.js solver-concepts.js   KEEP (extend)
    modules/                     37 existing KEEP/UPGRADE + ~55 NEW (see §5)
  sim/
    scs-engine.js                NEW (§3)
    networks.js                  NEW (canonical CATMPN-derived networks)
    scs-engine.test.mjs networks.test.mjs   NEW (node --test)
    PRESERVATION.md              NEW (honesty ledger)
  supabase-config.js             NEW (blank == sync off) ; supabase/schema.sql
  scripts/
    check-syntax.mjs verify.mjs  KEEP (Iter 0)
    test.mjs                     NEW (runs `node --test` over sim/ + data/)
  .github/workflows/o9-check.yml KEEP (Iter 0) — add the node --test step
```

---

## 9. Staged roadmap (each iteration starts only on an explicit "go")

Every iteration ends green on three gates: **`node scripts/check-syntax.mjs`** (hard),
**`node --test`** (engine/data logic), **`node scripts/verify.mjs`** (headless sweep:
every screen × dark/light, 0 console errors). Nothing is removed.

| Iter | Theme | Ships | Acceptance |
|---|---|---|---|
| **0** ✅ | **Shell & scaffolding** | full-IA nav (collapsible tracks), progress persistence, command palette, PWA, `verify.mjs` + CI. All existing modules work. | shipped — 53/53 syntax, 202/202 sweep |
| **1** ⭐ | **The SCS Mini-Engine + real dataset** | `sim/scs-engine.js` + `networks.js` + `*.test.mjs` + `PRESERVATION.md`; `data/catmpn-dataset.js` (real tenant); **Solver Playground**. | `node --test` green; Playground runs a real-derived network; determinism test passes |
| **2** | **Business case + Data/Integration track** | Track 11 (tenant-model, inbound-tables explorer, staging-pipeline, solver-run-ops, outbound-pegging, measure-grain, **end-to-end-trace**); `business-scenario`/`worked-example` → real CATMPN. | schema explorer shows real 17 tables; capstone trace links every hop |
| **3** | **Foundations + Network model** | Track 0 + Track 2 (nodes, 3 network types, dims, graphs, horizon, topology-on-engine). | beginner path complete end-to-end |
| **4** | **Inputs** | Track 3 — all inputs as engine-driven widgets, each tied to its real table/columns. | each input module cites real columns + recomputes a plan |
| **5** | **Constraints & Decisions** | Tracks 4 + 5 on the engine (timing, sourcing, WIP sweep, reallocation, excess, pegging). | pegging panel matches real `from→to` grain |
| **6** | **Outputs & RCA Clinic** | Track 7 + RCA Clinic (computed `Problem Type`). | RCA Clinic diagnoses engine-shorted demands |
| **7** | **Supported Models + Capability Matrix** | Track 8 (16 models, dependency order) + the matrix grid. | matrix filterable; each model has a worked case |
| **8** | **Invocation / Optimization / Perf / Ops** | Tracks 6 + 9 + Config-UI simulator. | — |
| **9** | **Mastery layer** | quiz banks across modules, mock interview, decision drills, review center (spaced rep), dashboard, self-explain, tour/toast. | visit-vs-mastery live; review scheduler `node --test` green |
| **10** | **Cloud sync + QA & polish** | optional cloudsync (+test), cheat sheet (print.css), a11y + both-theme audit, content pass, honesty-ledger finalise. | sync merge tests green; print layout clean; a11y pass |

---

## 10. Iteration log

### Iteration 0 — Mastery shell ✅
*Scaffolding for the full platform; all 37 existing modules preserved and working.*
- **TRACKS registry** (`app.js`) — single source of truth for the full IA (~90 screens); routes + sidebar derived; unbuilt topics are `ready:false` roadmap placeholders so nav never breaks.
- **Dynamic collapsible sidebar** (collapse persisted; auto-expands active track; per-track counts).
- **Event bus** — `app:navigate` + `AV.getScreens()/getTracks()/currentScreenId()`; features subscribe, router untouched.
- **Progress feature** (`features/progress.js`), **Command palette** (`features/command-palette.js`, ⌘K/Ctrl-K/`/`).
- **PWA** — manifest, icons, theme-color metas, no-flash theme. Rebrand **o9 SCS Mastery**.
- **Verification** — `scripts/check-syntax.mjs` + `scripts/verify.mjs`; CI `.github/workflows/o9-check.yml` (path-scoped; never touches shared Pages deploy).
- **Verified:** 53/53 syntax; **202/202** headless checks (both themes).

### Blueprint v2 — business-case + Kafka-grade rebuild 📝 *(this document)*
- **Mandate 1 — elaborative like Kafka:** adopted Kafka's exact conventions (tested sim engine, `data/*.js` banks, `progress-store` + spaced-repetition `review.js`, `create/init` components, `module-shell` tabs, visit-vs-mastery, mock interview, decision/incident/RCA drills, optional Supabase cloud sync). §4 maps each Kafka convention to a KEEP/ADD/RENAME action on the current tool.
- **Mandate 2 — real CATMPN grounding:** digested the uploaded tenant export (392 SSIS packages, 3,810-table schema, 43 MB config backup, 17 real inbound tables). Added **Track 11 (Data, Integration & the Real Tenant)**, a real `catmpn-dataset.js`, and the rule that every I/O module cites its real table/columns/measure. The engine's output schema is set to the real `Out_Fact_*` `from→to` pegging + RCA `Problem Type` grain.
- **Build-ready outputs:** §3 engine API, §6 data-bank schemas, §8 full file manifest, §9 roadmap with per-iteration `node --test` + `verify.mjs` gates.
- **Next (Iter 1, on "go"):** the SCS Mini-Engine + real dataset + Solver Playground.

---

*Living document — update each iteration (Kafka `BUILD.md` convention). Raw tenant
digest: `scratchpad/CATMPN-factsheet.md`. Source wiki digests summarised in the
session that produced this plan.*
