# Kafka Platform — Complete Build Document

A single reference for everything built so far, how it works, how it's verified,
and what comes next. Living document — updated each iteration.

- **Live app:** https://rajesh-satuluri.github.io/NewVisual/kafka/
- **Stack:** Vanilla JS, ES modules, **no build step**, deploys to GitHub Pages
- **Dev branch:** `claude/dreamy-gates-y8a3jv`
- **Last shipped:** Iteration 1 — commit `5662c71`, deploy *completed / success* ✅

---

## 1. What this project is

The repo started as a Kafka learning/visualizer SPA (22 interactive modules,
quizzes, an interview-question bank, incident drills, a glossary, etc.). The goal
is to grow it into a **Kafka Engineering & Interview Mastery Platform** — deeper
learning content plus hands-on, *deterministic* simulators — without breaking any
of the existing surface.

### Guiding principles

1. **Preserve everything.** Nothing existing is removed without a documented
   reason. Iterations extend; they don't replace. (See `sim/PRESERVATION.md`.)
2. **Stay static.** Keep the vanilla-JS, no-bundler, ES-module architecture. It
   deploys to GitHub Pages reliably and has zero toolchain risk.
3. **Never fake anything.** A static site cannot run real code, talk to a real
   Kafka cluster, or host accounts. So those are **Track 2 (needs a backend) —
   out of scope**. What we *can* do, we do honestly: deterministic *simulations*,
   clearly labelled as simulations, with a real-vs-simulated ledger.
4. **Test the logic for real.** Simulation logic lives in pure JS modules with
   real Node unit tests (`node --test`), so the engine is provably correct.

---

## 2. Architecture

### Routing & module system (`script.js`)

- **Hash routing:** `#home`, `#m01`…`#m22`, `#playground`, `#glossary`, etc.
- Each screen is an ES module exporting `mount(container)` that renders into the
  container and optionally returns a **cleanup function** (e.g. to cancel an
  animation frame). Modules are **lazy-loaded** via dynamic `import()` from the
  `LOADERS` map.
- **Two kinds of route:**
  | Kind | Tracked in progress? | Gets `initTabs`/`initIQ`/`enhanceModule`? |
  |---|---|---|
  | **MODULE** (`m01`…`m22`) | Yes | **Yes**, automatically from `script.js` |
  | **PAGE** (`playground`, `glossary`, …) | No | **No** — must self-wire |
  > ⚠️ **Gotcha (and a real bug we hit):** because pages don't get `initTabs`
  > from the router, a page with tabs must call `initTabs(container)` itself
  > inside `mount()`. The Playground tabs were dead until we did this.

### Theming

- Design tokens in `styles.css`; theme-aware colors via
  `color-mix(in srgb, …)` (Chromium 111+).
- Theme is toggled by `data-theme="dark|light"` on `<html>`, persisted in
  `localStorage` (`kafka-theme`).
- **Canvas rule:** canvas backgrounds are always hardcoded `#0A0E1A` and text
  contrast is theme-independent, so charts stay legible in both themes.

### Persistence

- Progress and preferences use `localStorage` (`kafka-done`, `kafka-theme`,
  `kafka_nav_collapsed`, `kafka_tour_done`, …). Local-first; no server.

---

## 3. The simulation engine (Iteration 1 keystone)

**File:** `kafka/sim/engine.js` — pure JS, no DOM. Importable in the browser (the
Playground UI) *and* in Node (unit tests). The foundation every current and
future simulator reuses.

### Determinism

- Seeded PRNG **mulberry32**: construct `KafkaSim` with the same seed + issue the
  same operations ⇒ **byte-identical** results. `reset()` rebuilds the RNG so
  replays are exact. Verified by a snapshot `deepEqual` test.

### The real partitioner (the honest selling point)

Key→partition routing is **Kafka's actual algorithm**, not an approximation:

```
partition = toPositive(murmur2(utf8Bytes(key))) % numPartitions
```

- `murmur2` is a faithful JS port of
  `org.apache.kafka.common.utils.Utils.murmur2` (seed `0x9747b28c`, `m =
  0x5bd1e995`, `r = 24`), using `Math.imul` for 32-bit multiply and `>>>` for
  unsigned shifts.
- Verified against **Apache Kafka's own published test vectors**
  (`'21'`, `'foobar'`, `'a-little-bit-long-string'`).
- **Null keys** use the **sticky partitioner**: one partition per batch, then
  rotate — exactly how Kafka fills a batch before moving on.

So a key routes to the *same* partition it would on a real broker.

### `class KafkaSim` — API surface

| Method | What it does |
|---|---|
| `new KafkaSim({ seed, brokers })` | Create cluster; seed drives determinism |
| `reset()` | Full deterministic reset (RNG, brokers, topics) |
| `createTopic(name, { partitions, replicationFactor })` | Validates RF ≤ live brokers & ≥1 partition; round-robin replica placement, leader = first replica, ISR = copy |
| `produce(topic, { key, value })` | Keyed → murmur2 routing; null key → sticky partition; returns `{topic, partition, offset, key}` |
| `produceBatch(topic, records)` | Produces all, then rotates the sticky partition |
| `partitionStats(topic)` | Per-partition `{partition, leader, replicas, isr, count, pct}` |
| `hotPartition(topic, mult=2)` | Most-loaded partition + `isHot` flag (≥ 2× even share) |
| `totalRecords(topic)` / `snapshot()` | Totals / serializable state |

### Tests — `kafka/sim/engine.test.mjs` (12/12 passing)

Run: `node --test kafka/sim/engine.test.mjs`

1. murmur2 matches Kafka published vectors
2. murmur2 stable for our routing inputs (regression guard)
3. `partitionForKey` stable and in range
4. same key always lands on same partition (ordering boundary)
5. offsets are per-partition and monotonic
6. reset + same ops ⇒ identical snapshot (determinism)
7. low-cardinality key creates a hot partition
8. high-cardinality key spreads evenly (within ~3% of even share)
9. replicationFactor cannot exceed live brokers (throws)
10. duplicate topic rejected (throws)
11. replicas spread across brokers, leader is first replica
12. mulberry32 is deterministic

---

## 4. The Partition Simulator (Iteration 1 UI)

**File:** `kafka/modules/playground.js` — route `#playground`.

- **Key strategy presets:** `order_id`, `customer_id`, `country` (weighted),
  `payment_type` (weighted), and `null`. Weighted presets use a deterministic
  RNG draw so runs replay identically.
- **Partition-count slider:** drag it and watch keys **re-hash** across the new
  partition count live.
- **Publish 1 / Publish 100 / Reset** controls.
- **Canvas bar chart:** per-partition counts, an **even-share dashed line**, a
  flash on the last-landed partition, and a **red hot-partition flag** when one
  partition dominates.
- **Stats panel** + a **"How it works"** tab explaining murmur2, the engine, and
  the honesty constraints.
- Self-wires its tabs via `initTabs(container)` (the PAGE gotcha above).
- Returns a cleanup fn that cancels the animation frame.

---

## 5. Files changed/added in Iteration 1

| File | Change |
|---|---|
| `kafka/sim/engine.js` | **NEW** — deterministic engine + real murmur2 |
| `kafka/sim/engine.test.mjs` | **NEW** — 12 Node unit tests |
| `kafka/modules/playground.js` | **NEW** — Partition Simulator (`#playground`) |
| `kafka/script.js` | registered `playground` in `PAGES` + `LOADERS` |
| `kafka/components/nav.js` | new **Playground** nav section |
| `kafka/enhancements.css` | `.sim-*` styles (theme tokens / `color-mix`) |
| `kafka/sim/PRESERVATION.md` | **NEW** — inventory + honesty ledger + build log |

---

## 6. Verification & deploy workflow

### Headless verification (Playwright)

- Playwright at `/opt/node22/lib/node_modules/playwright/index.js`; Chromium at
  `/opt/pw-browsers/...`.
- Serve the repo locally, set `data-theme` via
  `document.documentElement.setAttribute(...)`, filter transient console noise
  (`!/connect_rejected|ERR_|net::/`), and **disable the first-visit tour** before
  navigating (`localStorage.setItem('kafka_tour_done','1')`) — otherwise the tour
  overlay intercepts clicks.

**Iteration 1 results:** engine 12/12 green; Playground **0 console errors** in
both dark + light with interactions exercised (hot flag, balanced flag, slider
re-hash, tab switch); full **22-module smoke test clean** in both themes.

### Git / deploy

- Commit on `claude/dreamy-gates-y8a3jv`.
- `git fetch origin main && git rebase origin/main`.
- Fast-forward main, push `claude/dreamy-gates-y8a3jv:main` then the dev branch.
- Deploy via `.github/workflows/deploy.yml`; verify run status with
  `gh api 'repos/Rajesh-Satuluri/NewVisual/actions/runs?per_page=3'`.
- **Iteration 1:** committed → rebased → `5662c71` → deploy *completed success*.

---

## 7. Bugs found & fixed

| Bug | Root cause | Fix |
|---|---|---|
| Playground tabs dead | `script.js` only wires tabs for MODULES; Playground is a PAGE | Call `initTabs(container)` inside `playground.js` `mount()` |
| murmur2 test constants wrong | Two remembered constants for long strings were wrong (not the code — 3 published vectors matched) | Assert only the 3 verified published vectors + regression guard on actual computed values |
| Tour overlay blocked test clicks | First-visit tour intercepts pointer events | Set `kafka_tour_done` in localStorage before navigating (test-only) |
| Scratchpad import path error | Relative import from scratchpad dir | Use absolute path to `engine.js` |

---

## 8. Real vs simulated (honesty ledger)

| Capability | This build | Notes |
|---|---|---|
| Key → partition routing | **Real algorithm** | murmur2 + toPositive % n, matches Kafka |
| Cluster / produce / offsets | Simulated (deterministic) | No network, no real broker |
| Code execution | Not yet | Iteration 7: static validation, labelled |
| Real Kafka cluster | Out of scope | Track 2 (needs backend) |
| Accounts / cloud sync | Out of scope | Track 2; local-first + export/import instead |

---

## 9. Roadmap (iterations, gated by explicit approval)

- **Iteration 1 — Simulation engine + Partition Simulator** ✅ *shipped*
- Iteration 2 — more Playground surfaces (consumer group, offset timeline,
  replication/broker-failure, lag) reusing the engine
- Iteration 3 — app shell + global search
- Iteration 4 — learning dashboard + mastery analytics + persistence
- Iteration 5 — interview mastery deepening
- Iteration 6 — revision center (spaced repetition)
- Iteration 7 — coding labs + CLI simulator (labelled simulated execution)
- Iteration 8 — incident simulator + system-design lab
- Iteration 9 — QA, a11y, docs

Each iteration starts only on an explicit "go."

---

## 10. Preserved baseline (not built this cycle, kept intact)

22 learning modules, per-module interview Q&A, the interview question bank,
quizzes, self-explain, incident bank + investigation flow, decision drills,
troubleshooting lab, glossary / cheatsheet / master-map, study hub, progress
persistence, command palette / keyboard shortcuts / tour / toast, canvas
primitives, nav / routing / theme. Full table in `kafka/sim/PRESERVATION.md`.
