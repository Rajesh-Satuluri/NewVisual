# SCS Mini-Engine — Honesty Ledger (PRESERVATION.md)

Kafka-convention preservation doc. The engine is a **teaching simulation of the
documented o9 Supply Chain Solver model** — not o9's actual solver binary. This
ledger states exactly what is real, simplified, illustrative, or out of scope, so
the tool never fakes depth. It is updated every iteration (never trimmed).

## Real-vs-simulated ledger

| Capability | This build | Note |
|---|---|---|
| OBO heuristic, JIT / Build-Ahead / Build-Late, lot-size, yield, FIFO pegging, basic RCA | **Real (documented algorithm)** | JS implements the wiki's described logic; verified with `node --test` against hand-worked expected plans. |
| Capacity bands, safety-stock move-in, excess cleanup, no-carry push | **Real (simplified)** | Core behaviour modelled, not every edge flag. |
| Multipass phase reordering, telescopic buckets, memoization | **Simulated / illustrative** | Shown as concepts, not executed. |
| o9's actual solver binary, GraphCube server, raw tenant data | **Out of scope** | We teach the model with real-*shaped* data (CATMPN), not the live product instance. |

## Determinism contract

Same `network` + `config` + `seed` ⇒ **byte-identical** `snapshot()`
(`assert.deepEqual(build(), build())`). The RNG is seeded `mulberry32`; `reset()`
rebuilds it so replays reproduce exactly.

## Output grain = real CATMPN `Out_Fact_*`

- **Pegging** — `from{BODLane, TransMode, LC, Day, GLBItem, LOTID}` →
  `to{Order, CustomerType, Customer, LC, Day, GLBItem}` + Pegged Qty.
- **Inventory** — the 10 real buckets (Available-for-Sale, Allocated, Bin-to-Bin,
  Quality-Inspection, Receiving, Reserved, Quality-Quarantine, Quality-Rejected,
  Scrap-Hold, Missing), BOH → EOH.
- **RCA** — `RootCause.[Problem Type]` (MaterialShort, CapacityShort,
  LeadTimePlanBeforeCurrent, StorageConstraint, …) + Suggested Available Date.

## Build status

- **Scaffold (this commit):** pure helpers (`netRequirement`, `roundToLot`,
  `sortDemands`, `offsetByLeadTime`, `mulberry32`) implemented + tested; the
  `ScsSolver` class, `solve()` pipeline, and canonical networks are documented
  stubs returning valid empty shapes.
- **Iteration 1 (on "go"):** implement `solve()` (the 9-step pipeline), populate
  the three canonical networks from `data/catmpn-dataset.js`, and add
  pipeline-behaviour tests.
