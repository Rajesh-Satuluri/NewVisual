# Spark Structured Streaming — Build Document

A living record of the Spark Structured Streaming learning SPA ("ShopStream
Edition"), built to the same depth as the Kafka and Flink tools in this repo.

- **Live path (on deploy):** https://rajesh-satuluri.github.io/NewVisual/spark-streaming/
- **Stack:** Vanilla JS, ES modules, **no build step**, deploys to GitHub Pages
- **Dev branch:** `claude/brave-planck-jryjqf`
- **Status:** **Iteration 0 — scaffold shipped** (shell wired, content pending)

---

## 1. What this is

An interactive learning + interview platform for **Apache Spark Structured
Streaming**, told through one running example: **ShopStream**, a high-traffic
e-commerce store whose **orders + clickstream** arrive out of order and late,
and are turned into real-time revenue, sessionized browsing, fraud flags and an
exactly-once Delta Lakehouse.

It mirrors the architecture of the Kafka and Flink tools: same shell, same
honesty principles ("never fake anything"), a real deterministic simulation
engine as the keystone, and a full module + lab + interview surface.

### Guiding principles (inherited)

1. **Preserve everything** — iterations extend, never silently replace.
2. **Stay static** — vanilla JS, no bundler, deploys to GitHub Pages.
3. **Never fake anything** — deterministic *simulations*, clearly labelled, with
   a real-vs-simulated ledger. No fake clusters, no fake code execution.
4. **Test the logic for real** — simulation engines are pure JS with Node unit
   tests (`node --test`).

---

## 2. Architecture

- **Hash routing** (`#home`, `#m01`…`#m22`, labs, reference) with modules
  **lazy-loaded** via a `LOADERS` map in `script.js` and a cache-busting
  `?v=BUILD` query.
- Each screen is an ES module exporting `mount(container)` returning an optional
  cleanup fn.
- **Shared shell components** (reused, generic — copied from the Flink tool):
  `module-shell.js` (`createModuleShell`, `initTabs`, `createIQSection`,
  `initIQ`), `nav.js`, `pager.js`, `command-palette.js`, `toast.js`, `tour.js`,
  `highlight.js`, `code-edit.js`, `interview-edits.js`, `cloudsync*.js`.
- **Theming** via `styles.css` tokens + `data-theme`, persisted in
  `localStorage`. Canvas backgrounds hardcoded dark so charts stay legible.
- **Storage namespace:** all keys use the **`spark_`** / **`spark:`** prefix
  (e.g. `spark_done`, `spark_theme`, `spark_nav_collapsed`, `spark_tour_done`)
  so this tool never collides with Kafka/Flink on the shared GitHub Pages origin.
- **Cloud sync:** present but **inert** — `supabase-config.js` is blank. Enable
  later with its own Supabase project (own rows/schema), never the Flink backend.

---

## 3. Scaffold (Iteration 0) — what shipped

| File | State |
|---|---|
| `index.html` | Re-branded shell (Spark SS · ShopStream Edition, `#E25A1C`), PWA + splash |
| `manifest.json` | PWA manifest (Spark SS) |
| `script.js` | Lean router; `home` → real page, every other route → shared placeholder |
| `components/nav.js` | **22-module curriculum** + labs/reference, grouped (see §5) |
| `modules/home.js` | Themed landing: hero, stat strip, ShopStream story, curriculum grid |
| `modules/placeholder.js` | Shared "planned" page per route (reads its id from the hash) |
| `components/*` | Generic shell components, namespaced `spark_`/`spark:` |
| `styles/responsive/enhancements.css`, icons, `splash/` | Reused assets |

**Verified:** headless Playwright, dark + light — home + module + lab + reference
routes render, tabs work, **0 console/page errors**. 35 nav entries, 12 groups.

**Known scaffold placeholders (regenerate before a real launch):** icons,
`favicon.svg`, `og.png`, `splash/*` are still the Flink-branded assets reused as
stand-ins. `highlight.js`'s lang heuristic still detects `flink run` (harmless).

---

## 4. The keystone engine (Iteration 1 — next)

The honest, provably-correct simulator = the **micro-batch incremental execution
model**. Given input records `(eventTime, key, value)`, a trigger, a watermark
delay, a window spec and an output mode, compute **exactly**:

- which records land in which micro-batch (trigger planning),
- the watermark after each batch — `max(eventTime seen) − delay`, **monotonic**,
  applied at the **start** of the next batch,
- which late records (`eventTime < watermark`) are **dropped**,
- the windowed aggregation state and its **eviction** when the watermark passes
  window end,
- the **exact rows emitted** per batch under **append / update / complete**:
  - *append* — a window is emitted once, only after the watermark passes its end,
  - *update* — rows whose value changed this batch,
  - *complete* — the entire result table every batch.

These are Spark's documented semantics, so the engine is unit-testable against
hand-computed vectors — the `murmur2`-equivalent honest keystone.

A second engine covers the **offset/commit WAL + checkpoint recovery** (replay,
exactly-once vs at-least-once).

---

## 5. Curriculum (information architecture — live in nav now)

**Foundation:** m01 Why Structured Streaming · m02 The Unbounded Table
**Architecture:** m03 Architecture & Components · m04 Sources & Schema ·
m05 Micro-Batch & Triggers · m06 Continuous Processing
**Time & Windows:** m07 Event vs Processing Time · m08 Watermarks · m09 Windows
**State & Output:** m10 Stateful Aggregations · m11 Arbitrary State ·
m12 Output Modes · m13 Deduplication
**Sinks & Reliability:** m14 Sinks & foreachBatch · m15 Checkpoint & Offset Log ·
m16 Fault Tolerance & EOS
**Joins:** m17 Stream–Static · m18 Stream–Stream
**Lakehouse & Ops:** m19 Delta Sink & MERGE · m20 Performance & Tuning ·
m21 Monitoring & Listeners
**End-to-End:** m22 ShopStream Capstone

**Labs:** Micro-Batch Lab · Watermark Lab · Output-Mode Lab
**Reference:** Master Map · Engine Comparison · Glossary · Cheat Sheet · Config
Reference **Review:** Dashboard · Learning Path · Search · Review Center · Study Hub

---

## 6. Roadmap (gated by explicit "go", like Kafka/Flink)

- **Iteration 0 — scaffold** ✅ *this build*
- Iteration 1 — keystone micro-batch engine + Node tests + one flagship lab
  (Output-Mode / Watermark)
- Iteration 2 — Foundation + Time & Windows modules (m01–m09) on the ShopStream
  story with verified PySpark/Scala snippets
- Iteration 3 — State & Output + Sinks & Reliability (m10–m16) + checkpoint engine
- Iteration 4 — Joins + Lakehouse & Ops + Capstone (m17–m22)
- Iteration 5 — reference pages (Master Map, Comparison, Glossary, Cheat Sheet,
  Config Reference)
- Iteration 6 — interview surface: quizzes, per-module Q&A, self-explain,
  decision drills, incident labs
- Iteration 7 — dashboard, learning path, search, review center, study hub
- Iteration 8 — real icons/splash/OG, cloud sync setup, a11y + QA pass

---

## 7. Real vs simulated (honesty ledger)

| Capability | Plan | Notes |
|---|---|---|
| Micro-batch / watermark / output-mode semantics | **Real algorithm** (Iter 1) | Matches documented Spark semantics; unit-tested |
| Checkpoint / offset-log recovery | Simulated (deterministic) | No real driver/executors |
| Code execution | Not planned | Snippets are static + labelled |
| Real Spark cluster | Out of scope | Needs a backend |
| Accounts / cloud sync | Optional, inert | Local-first; own Supabase later |
