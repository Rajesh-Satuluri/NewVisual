# dbt Visualizer — Third-Party Product Audit & Interview-Readiness Build Plan

**Audited:** https://rajesh-satuluri.github.io/NewVisual/dbt/ (commit `a15b479`)
**Lens:** EdTech product review — "would this tool, used alone, get a candidate through a product-company dbt / analytics-engineering interview loop?"
**Date:** 2026-11-13

---

## 1. Executive Summary

This is an unusually complete self-built learning product: **56 routes** (38 numbered modules + ~18 tool/reference pages), a **real in-browser SQL engine** (DuckDB-WASM), a working **Project Builder IDE** with compile/build/test, a derived-from-source **manifest explorer**, a **command simulator**, an **incident simulator**, a **tiered interview bank** (44+ full-schema questions), **73 quiz questions**, spaced review, readiness tracking, and goal-based learning modes. Most commercial dbt courses do not have half of this interactivity.

**Verdict: ~80–85% interview-ready as a knowledge tool; ~60% ready as an interview-performance tool.**
The gap is not content coverage — it is *output practice*. Interviews are won by producing: speaking answers aloud under time pressure, writing SQL/dbt code from a blank editor against a spec, whiteboarding a pipeline design, and defending trade-offs under follow-up pressure. The tool currently optimizes recognition (read, click, quiz) far more than production (write, design, explain). The build plan below closes exactly that gap.

### Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Conceptual coverage (dbt Core 1.9) | 9/10 | Models→mesh, internals, state, strategies — near-complete |
| Hands-on execution realism | 8/10 | Real DuckDB, real compile; CDN-dependence is the weak edge |
| Interview Q&A content | 7/10 | Strong schema per question; volume & company-style variety thin |
| **Active production practice** | **4/10** | Few blank-editor, timed, spec-driven tasks |
| **System/pipeline design practice** | **3/10** | Case studies are read-only; no design-your-own exercises |
| SQL depth (the co-skill every dbt round tests) | 5/10 | Studio exists; window functions/grading drills are light |
| Assessment & feedback loop | 6/10 | Quizzes + readiness exist; no mock-interview scoring, no weak-area drill generator |
| Retention mechanics | 7/10 | Spaced review exists; not wired to failure data everywhere |
| UX / information architecture | 8/10 | Modes solve the 56-route sprawl; onboarding to "interview track" could be sharper |
| Trust & accuracy | 9/10 | Simulated vs real clearly labeled; manifest derived, not hand-faked |

---

## 2. What Is Genuinely Strong (keep, don't touch)

1. **Real execution over mock execution.** The Studio and Project IDE run actual SQL via DuckDB-WASM, and the IDE compiles real `ref()`/`source()`/config and generates real test SQL. This is the single biggest differentiator vs. video courses — interviewers detect "read about it" vs "did it" instantly.
2. **One derived source of truth.** m19 manifest, m32 terminal output, and the IDE all derive from the same project parser (`manifest-gen.js` / `ide-engine.js`). Lineage, compiled SQL, and command output never contradict each other — a correctness property most edtech content lacks.
3. **Full-schema interview bank.** Each question carries short answer → detailed → example → common mistake → follow-up → *senior-level answer*. The "senior answer" field is exactly how L5+ loops differentiate; very few resources model it.
4. **Failure-first pedagogy.** Incident simulator, failure simulator, debugging tree, when-NOT-to-use-dbt. Product companies probe failure modes ("your incremental model double-counted — walk me through it") more than happy paths.
5. **Honest labeling.** Simulated vs real is marked; the engine degrades gracefully offline. Trust is a pedagogy feature.
6. **Modes as progressive disclosure.** 56 routes would be paralyzing; 7 goal paths fix it.

---

## 3. Gap Analysis — against a real product-company dbt loop

A typical analytics-engineering/data-engineering loop at a product company:

| Round | What's tested | Tool today | Gap |
|---|---|---|---|
| 1. SQL screen (45m) | Window functions, dedup, joins, aggregation under time | Studio (free-form) + sql-exercises | **No timed mode, thin window-function drill set, no auto-grading rubric per pattern** |
| 2. dbt deep-dive | Incrementals, tests, snapshots, macros, state, internals | Excellent (m10–m21, m32) | Minor: needs "explain aloud" prompts |
| 3. Pipeline/system design | "Design the dbt project for X product" on a whiteboard | m31 case studies (read-only) | **No active design exercise with evaluation** |
| 4. Debugging/live task | Fix a broken project live | Incident sim (multiple-choice-ish) | **No open-ended broken-project-in-the-IDE repair tasks** |
| 5. Behavioral + project walkthrough | Narrate YOUR project, trade-offs, metrics | — | **Nothing teaches candidate to narrate a portfolio project** |

The tool nails round 2, partially covers 1 and 4, and barely touches 3 and 5. Rounds 3 and 5 are where senior offers are decided.

### Content gaps (smaller, checklist-style)
- **SQL co-skill:** window functions (`row_number/lag/lead/sum over`), gaps-and-islands, dedup patterns, SCD queries, date spines — the actual screen questions. Studio can run them; there's no curated, graded drill ladder.
- **Data modeling theory:** Kimball dimensional modeling (facts/dims, grain, SCD types 1/2/3), One Big Table vs star, normalization — interviewers ask "what's the grain of fct_orders?" constantly. Snapshots (m12) touch SCD2 but grain/dimensional vocabulary isn't drilled.
- **Semantic/metrics nuance:** m34 exists; metric fan-out / "same metric, two numbers" scenarios could go deeper (it's a favorite probe).
- **Orchestration realism:** m30 covers Airflow conceptually; "retry a failed subset with `--state` in production" as a *task*, not a read.
- **dbt 1.9-era specifics worth a card each:** microbatch incremental strategy, unit tests (`unit_tests:` YAML), model versions/contracts enforcement details, saved queries/exports. (Contracts/versions appear in mesh; unit tests & microbatch deserve first-class drills — they're current-gen interview differentiators.)
- **Behavioral ammo:** a "story bank" scaffold (STAR) for "tell me about a pipeline you broke."

### Product/UX gaps
- No **"Interview in N days" planner**: given a date, emit a daily plan across existing content (the single highest-leverage edtech feature here).
- Readiness tracks *completion*, not *performance* (quiz failure rates, drill times, weak tags).
- No **export/print**: cheat sheet & bank as PDF for last-hour review.
- Mobile: content pages adapt, but drill/IDE experiences assume desktop (acceptable; say so explicitly).
- DuckDB CDN single point of failure: no retry/fallback message depth, no "self-host wasm" option documented.

---

## 4. Build Plan — "Interview-100%" roadmap

Ordered by interview ROI per build-hour. Each wave is independently shippable (matches the existing one-by-one deploy discipline). All additive: no renumbering, localStorage keys stable.

### Wave A — Mock Interview Engine (highest ROI)
**New route `interview-mock`.** Simulates a 30–45 min round end-to-end:
1. Picks 6–10 items across tiers + 1–2 SQL tasks (Studio-embedded) + 1 debugging scenario.
2. **Timer per question**; candidate types (or dictates) their answer *before* reveal.
3. Self-scoring rubric per question (hits the 3 key points? mentioned trade-off? gave example?) → 0/1/2 each; produces a round score + per-topic breakdown.
4. Writes weak tags to localStorage (`dbt-weak-tags`) that spaced-review and the drill generator consume.
- Data: reuse `interview-bank.js` + add `keyPoints: []` (3 bullets) per question — the rubric source.
- Build: ~1 new module + bank field backfill. **This converts the whole tool from "study" to "rehearse."**

### Wave B — SQL Screen Gym
**New route `sql-gym`** (Studio engine reuse):
1. ~30 graded drills in 5 ladders: dedup & `row_number`, window aggregates & running totals, `lag/lead` + sessionization/gaps-and-islands, joins & fan-out traps, date spines & cohort math.
2. Each drill: spec + expected output (checked via existing `resultsEqual()`), a timer, model-solution + "how to narrate it" note.
3. Timed mode: "SQL screen — 4 questions, 40 minutes."
- Data file `sql-gym-drills.js`; seeds already exist in `studio-seed.js` (extend with an `events` table for sessionization).

### Wave C — Design Dojo (system design rounds)
**New route `design-dojo`.** 6 active scenarios ("Design dbt for a food-delivery app: 3 sources, 2 refresh SLAs, finance + growth consumers"):
1. Candidate assembles the answer: pick sources → staging → marts, choose materializations per node, choose tests, choose job schedule — via the existing stage-panel/dag UI primitives.
2. Engine checks structural rules (no mart reading raw, incremental where volume demands, tests on PKs, exposure at the end) and shows a model answer with trade-off narration.
3. Includes the two classic probes as scripted follow-ups: "backfill 2 years" and "metric disagrees between teams."
- This is the round the tool currently can't rehearse at all; even a rules-based checker beats reading m31.

### Wave D — Broken Project Repairs (live-debug round)
Extend **Project IDE** with `repairs` mode: 8 pre-broken variants of the starter project (circular ref, missing source quoting, dedup grain bug causing fan-out, incremental missing `unique_key`, failing `not_null` from a seeded NULL, schema.yml typo, macro arg bug, wrong materialization for volume). Candidate must get **Build+Test green**; engine verifies with the real DuckDB run. Add a repair timer + hint ladder (3 hints, score decreases).

### Wave E — Modeling Theory + 1.9 specifics (content wave)
- **m39 Dimensional Modeling:** grain, facts vs dims, SCD 1/2/3 (link to m12), star vs OBT, with an interactive "pick the grain" drill.
- **m40 Unit Tests & Microbatch:** dbt 1.9 `unit_tests:` YAML (mock inputs → expected rows — runnable against the teaching engine) and the microbatch incremental strategy vs classic strategies (extend m21's comparison).
- Interview bank +30 questions: 10 SQL-adjacent, 10 design/architecture, 10 modeling theory; backfill `keyPoints` everywhere. Target: 75+ questions, each tagged by round type.

### Wave F — Performance-aware coaching layer
1. **Interview Planner** (`planner` route): pick a date + weak areas → daily schedule over existing routes; checkboxes feed readiness.
2. Readiness v2: blend completion × quiz accuracy × mock scores × drill times; show a "predicted round risk" per round type (SQL / dbt / design / debug).
3. Spaced review pulls from `dbt-weak-tags` first.
4. **Story Bank** page: STAR scaffold with 5 prompts ("a pipeline you broke", "a modeling decision you reversed"…), stored locally — turns this project itself into the portfolio story ("I built a dbt learning IDE" is a *great* interview artifact; coach the user to tell it).

### Wave G — Hardening & polish (last)
- DuckDB loader: retry w/ backoff + clear offline banner + document self-hosting the wasm bundle in-repo to remove the CDN dependency entirely.
- Print/PDF stylesheet for cheatsheet, glossary, interview bank.
- "Explain aloud" micro-feature: every module's IQ section gets a 🎤 "answer out loud for 60s, then reveal" toggle (cheap, huge habit value).
- A11y pass: keyboard nav through drill UIs, focus traps in IDE panes.

### Sequencing & effort (rough)
| Wave | Effort | Interview ROI |
|---|---|---|
| A Mock engine | M | ★★★★★ |
| B SQL gym | M | ★★★★★ |
| C Design dojo | L | ★★★★★ (senior offers) |
| D IDE repairs | M | ★★★★ |
| E Content (m39/m40 + bank) | M | ★★★★ |
| F Coaching layer | M | ★★★ |
| G Hardening | S | ★★ |

After A–E, the honest claim becomes: *every round type in a product-company dbt loop is rehearsable inside this tool, with scoring.* That is the 100% bar.

---

## 5. Closing note (edtech lens)

The hard part — real engines, derived artifacts, honest simulation, breadth — is already built; most companies in this space never get there. What remains is the pedagogy inversion every successful interview-prep product makes: **shift the learner from consuming explanations to producing answers under constraints, and measure the production.** Waves A–D are that inversion; E fills the last content seams; F makes the tool adaptive. Built in that order, each deploy independently increases pass probability.
