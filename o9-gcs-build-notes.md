# o9 Graph Cube Server (GCS) — Build Notes

Documentation of the two single-file visual explainers built in this session, how they
work, and the decisions behind them.

- **Branch:** `claude/relaxed-hamilton-8gua2i`
- **Deliverables:** `o9-gcs.html`, `o9-gcs-storage.html` (repo root)
- **Stack:** plain HTML + inline SVG + [GSAP](https://gsap.com) (from CDN). No build system, no frameworks. Each file is fully self-contained.

---

## What was built

| File | Answers | Core idea |
|------|---------|-----------|
| `o9-gcs.html` | *How does the system work, end to end?* | The 4-layer architecture and the two master data flows. |
| `o9-gcs-storage.html` | *How is data inserted, stored, and retrieved?* | The write → store → read mechanism of the graph cube. |

Both are **conceptual** explainers. Proprietary internals are kept abstract ("in-memory
graph cube", "persistent store") and the storage file is explicitly labeled *"conceptual
model — not o9's proprietary internal storage format."*

---

## File 1 — `o9-gcs.html` (architecture & flow)

### The concept it conveys
The o9 Enterprise Knowledge Graph / graph cube is **not** a traditional OLAP cube.
Dimensions are **nodes** in a graph; measures live at the **intersections** of those
dimensions and **aggregate along the graph edges**.

### Layout (SVG viewBox 1200×800)
Four horizontal bands, bottom to top, each a faint lane with a left-edge label:

1. **Sources / Ingestion** (y≈700) — ERP, POS, external feeds → connectors → staging.
2. **Graph Model** (y≈500) — dimension nodes (Item, Location, Customer, Time, Product
   Family) joined by labeled relationship edges (`belongs-to`, `stored-at`, `ships-to`,
   `phased-over`, `sold-in`).
3. **Graph Cube + Engine** (y≈300) — an isometric cube with measure chips (Forecast,
   Inventory, Sales), a highlighted intersection cell with connectors down to the
   dimensions it is anchored to, plus **In-memory columnar (HOT)**, **Persistent store
   (COLD)**, and **Solver / planning math** boxes.
4. **Consumption** (y≈100) — planning workbench, IBP / what-if, dashboards, API.

Two side rails show the master flows: **DATA LOAD ▲** (bottom-up) and
**QUERY · PLAN · WRITE-BACK ▼** (top-down and back).

### Animation — one paused GSAP master timeline
Labeled segments, each ~2–4s, `power2.inOut` easing, grouped staggers ~0.1:

- **ingest** — sources fade in; packet circles travel up the load arrow into staging.
- **graph** — dimension nodes pop in, then edges stroke-draw (`strokeDashoffset`) so the
  graph visibly forms; edge labels fade in.
- **cube** — cube faces assemble, measure chips pop, the intersection cell lights up with
  its connectors down to the dimension nodes.
- **aggregate** (the key shot) — a value travels **along the edges** (MotionPathPlugin) to
  show roll-up, up into the cube, then allocation back down.
- **consume** — the result surfaces into the planning app; a what-if scenario branches.

---

## File 2 — `o9-gcs-storage.html` (insert · store · retrieve)

### The concept it conveys
The honest mental model of a graph cube's storage: a **sparse, columnar, key-addressed**
store, with a **graph on top** that drives aggregation. The scene reuses one cube as the
"address space" and walks three acts.

### Layout (SVG viewBox 1200×800)
- **1 · INSERT (write path)** — an incoming fact card + a dictionary-encoding panel.
- **ADDRESS SPACE** — an isometric cube whose readable front face is a 3×3 grid of cells
  (rows = Item, cols = Time; the front slice = Location DC-1). Top and right faces convey
  depth (the Location axis).
- **2 · STORE (at rest)** — an **In-memory columnar store · HOT** panel (`Sales[]`,
  `Forecast[]`, `Inventory[]` arrays) and a **Persistent store · COLD** panel with
  versioned snapshots; the graph is noted as stored alongside.
- **3 · RETRIEVE (read path)** — a query card, a graph-expansion callout, and a running
  Σ accumulator.

### The three operations
1. **Insert** — a fact `{Item, Location, Time} → Sales` has its members
   **dictionary-encoded** to compact ids (`SKU-100→i7`, `DC-1→l3`, `W32→t32`). The
   composite key `(i7,l3,t32)` **addresses exactly one cell**; the value lands there. Four
   records fill only 4 of 9 cells → demonstrates **sparsity**.
2. **Store** — populated cells become **columnar arrays, one per measure**, holding only
   the cells that exist. Kept **HOT** in memory, persisted **COLD** as versioned
   snapshots, with the graph (nodes + edges) alongside to drive roll-up.
3. **Retrieve** (the hero shot) — the query names a *level*, not raw cells. The **graph
   expands** it (`PF-A ⊃ its items`, `Aug ⊃ its weeks`); the engine **scans only
   `Sales[]`**, selects matching keys, and **sums along the edges**:
   `500 + 320 + 260 + 200 = 1,280`, surfacing back to the query card.

### Animation — one paused GSAP master timeline
Labeled segments `address → insert → store → retrieve → recap`: cube assembles; per-record
dictionary-encode + packet-drop into the addressed cell; cells stream into the columnar
arrays; a copy persists to the versioned COLD tier; the retrieve scan lights up matching
cells and rows while the Σ accumulator counts up to the result.

---

## Shared implementation details

- **Controls** — `Play` (`tl.play()`), `Step` (`tl.tweenTo` the next label via an ordered
  label index), `Reset` (`restart()/pause(0)` and reset mutable text). A progress bar
  tracks `tl.progress()`.
- **Captions** — a caption box updates per segment via `tl.call()` at each label.
- **Start state** — `gsap.set()` hides/dims all future elements; edges and guide paths use
  `strokeDasharray/strokeDashoffset` for draw-in.
- **Accessibility / robustness** — SVG font-size ≥ 13–15px; flows labeled with text (not
  color alone); high contrast; **light and dark** themes via
  `prefers-color-scheme`; works on a projector.
- **Offline fallback** — if the GSAP CDN fails to load, a fallback path reveals the full
  static diagram and disables the controls, so the file is still useful without a network.

---

## Verification

Both files were rendered in a real Chromium browser (Playwright) in **light and dark**
themes:

- No console or page errors.
- All timeline segments reached in order.
- Animation packets land in the correct cells; the retrieve roll-up resolves to `1,280`.
- Label-collision fixes applied to the storage file (removed redundant `insert` / `result`
  flow labels that overlapped the Location axis and the expansion panel).

---

## How to open

Download either `.html` file and double-click to open it in any modern browser. An internet
connection is needed to load GSAP from the CDN; without one, the page shows the full static
diagram.

---

## Possible next steps (not yet done)

- Move each visual into its own served folder (`o9-gcs/index.html`,
  `o9-gcs-storage/index.html`) to match the repo's per-visual layout, and wire them into
  the site index.
- Add a **Flow ⇄ Storage** toggle so both explainers live in one file, or a shared landing
  page linking the two.
