# Professional Audit — System Design Interview Prep Tool

**Tool:** https://rajesh-satuluri.github.io/NewVisual/system-design/
**Scope of audit:** this tool only (the system-design app, SWE + DE tracks)
**Stated aim:** prepare candidates for SWE and DE system-design interviews at product-based companies
**Audit date:** 2026-11-13

---

## 1. Executive summary

The tool is an unusually polished, zero-dependency, browser-based learning lab with two parallel tracks — Software Engineering (SWE) and Data Engineering (DE) — behind a single engine. Its differentiators are real: animated canvas simulations for core concepts, a content-as-data architecture that makes new material cheap to add, and practice surfaces (decision drills, tiered Weak→Good→Senior answers, flashcards, glossary, cheat sheet) that most free prep resources lack.

However, measured against the bar of *cracking product-company interviews* (Google, Meta, Amazon, Uber, Stripe, Netflix-tier, and strong Indian product companies like Flipkart, Swiggy, Razorpay), the tool today is **strong on concept acquisition and weak on interview execution**. Three structural gaps dominate:

1. **Depth deficit in the question banks.** 93 SWE questions exist but only 2 have fully built answers; 90 DE questions exist but only 4 are fully built. The rest are one-paragraph TL;DRs. Interviews are won in the depth — the follow-ups, the numbers, the failure modes — and that layer is mostly missing.
2. **No interview-execution training.** There is no timed mock mode, no requirements-clarification practice, no capacity-estimation drills with checking, no self-grading rubric, no "interviewer follow-up" simulation. The tool teaches *what to know*, not *how to perform for 45 minutes under pressure*.
3. **Topic gaps vs. the current product-company syllabus.** Missing or thin: consensus & coordination, multi-region/active-active design, collaborative editing/CRDTs, ride-hailing/geo-matching, ML & LLM-serving infrastructure, vector search/RAG (now a common 2025–26 question), and on the DE side: data contracts, feature stores, real-time OLAP engines, backfill strategy, and a DE-specific interview framework.

The remainder of this document inventories what exists, itemizes the gaps precisely, and lays out a phased enhancement plan (Waves H–N) with concrete deliverables that fit the existing architecture.

---

## 2. Current-state inventory

### 2.1 Architecture (an asset, not a liability)

- Vanilla JS, ES modules, no build step, deployed on GitHub Pages.
- Content-as-data: every concept/question/drill is a plain data module rendered by generic components; adding content never requires touching the engine.
- Track system: a mutable registry singleton (`content/registry.js`) + lazy-loaded track bundles (`content/tracks.js`); the SWE/DE toggle swaps all surfaces live with per-track progress.
- Interactive canvas simulations registered per concept/question; dark/light themes; hash routing preserves deep links; command palette; flashcards; dashboard.

**Audit verdict:** the architecture can absorb every enhancement recommended below without redesign. That is the tool's single biggest strategic advantage — content velocity is high.

### 2.2 Content inventory

| Surface | SWE track | DE track |
|---|---|---|
| Animated concepts | 28 (classic canon: scaling, rate limiter, KV store, URL shortener, crawler, notifications, news feed, chat, autocomplete, YouTube, Drive, proximity, maps, queue, metrics, ad-click agg, hotel, email, S3, leaderboard, payments, wallet, stock exchange, + framework/estimation) | 33 (lake, medallion, warehouse, OLTP/OLAP, batch vs streaming, formats, partitioning, table formats, small files, ETL/ELT, incremental loads, CDC, Airflow, idempotency, Kafka, event-driven, windowing, watermarks, delivery guarantees, Spark shuffle, joins, warehouse tuning, quality, reconciliation, monitoring, governance, security, cost, + 5 end-to-end platform designs) |
| Question bank | 93 across 10 categories — **only 2 fully built** | 90 across 10 categories — **only 4 fully built** |
| Glossary | 59 terms | 72 terms |
| Cheat sheet | ✅ (latency numbers, capacity math, nines, etc.) | ✅ (10 sections) |
| Decision drills | ✅ 8 | ✅ 6 |
| Tiered answers | ✅ 6 | ✅ 5 |
| Flashcards / dashboard / palette | ✅ | ✅ |

### 2.3 What the tool does well (keep and protect)

- **Visual-first concept teaching.** The animated simulations are genuinely differentiating; nothing in the free-tier competitive set (blog posts, GitHub primers, YouTube) offers interactive, theme-aware, zero-install sims.
- **The "reason out loud" practice surfaces.** Decision drills with best/defensible/weak verdicts, and tiered Weak→Good→Senior answers, directly train the trade-off articulation interviewers grade on. These are the right *formats* — they are just under-populated.
- **Two-track parity.** The DE track being a first-class peer of SWE is rare; most prep material treats DE system design as an afterthought.
- **Engine-neutral DE content** (concepts over vendors, with light cloud framing) matches how senior DE interviews are actually asked.

---

## 3. Gap analysis — what is missing to crack product-company interviews

### 3.1 Gap class A: question-bank depth (highest impact)

Product-company interviews are decided by depth-on-demand: the candidate proposes a design, and the interviewer drills — "what breaks at 10×?", "what if that node dies mid-write?", "walk me through the exact read path." The tool's 171 draft questions each carry a solid TL;DR but no steps, no diagrams, no numbers, no failure analysis, no follow-up chains. A candidate who studies only the TL;DRs will sound rehearsed at minute 5 and shallow by minute 20.

**Missing per question (for a built answer):** clarifying questions to ask, back-of-envelope estimate with actual numbers, high-level design with data flow, 2–3 deep-dive areas, failure modes & mitigations, and — critically — a **"likely follow-ups" section with model responses**, which no current question has even among the built ones.

### 3.2 Gap class B: SWE topic coverage vs. the 2025–26 product-company syllabus

The 28 SWE concepts track the classic canon (essentially Alex Xu vols. 1–2) closely. The following are asked at product companies today and are absent or only glancingly covered:

| Missing topic | Why it matters | Asked as |
|---|---|---|
| **Consensus & coordination** (Raft/Paxos intuition, leader election, fencing tokens, ZooKeeper/etcd) | Senior loops probe "how does the system agree?" behind every HA design | Follow-up in almost any L5+ design |
| **Multi-region & active-active** (geo-replication, conflict resolution, region failover, data residency) | Standard L5/L6 escalation: "now make it multi-region" | Follow-up; sometimes the whole question (Netflix, Stripe) |
| **Distributed transactions in practice** (sagas, outbox, 2PC limits, idempotency keys end-to-end) | Core of payment/order questions at Stripe, Razorpay, Amazon | "Design checkout", "design order management" |
| **Collaborative editing** (OT vs CRDT, presence, cursors) | A Google/Figma/Notion staple | "Design Google Docs / Figma multiplayer" |
| **Ride-hailing / geo-matching** (driver location ingest, H3/geohash matching, surge, ETA) | Uber/Lyft/Ola/Swiggy/DoorDash signature question; current proximity concept covers only a slice | "Design Uber", "design food delivery dispatch" |
| **Ticketing / flash-sale inventory** (seat holds, contention, queues, fairness) | BookMyShow/Ticketmaster/Flipkart sale — extremely common in India product loops | "Design BookMyShow", "design flash sale" |
| **Feature flags & experimentation** (flag eval at scale, A/B assignment, metrics pipelines) | Meta/product-eng loops love it; bridges SWE and product sense | "Design an experimentation platform" |
| **ML & LLM serving infrastructure** (model serving, GPU batching, token streaming, KV-cache, semantic cache, rate limiting LLM APIs) | The fastest-growing 2025–26 question family | "Design ChatGPT backend", "design an LLM gateway" |
| **Vector search / RAG at scale** (embeddings pipeline, ANN indexes, freshness, hybrid search) | Now asked alongside classic search questions | "Design semantic search over all our docs" |
| **Observability deep design** (distributed tracing design, log pipeline at scale) | Metrics concept exists; tracing/logging design does not | "Design Datadog-lite" |
| **API design as a dedicated discipline** (REST vs gRPC vs GraphQL trade-offs, versioning, pagination, idempotency contracts, webhooks) | Stripe/Twilio run a dedicated API-design round | "Design the API for X" |

### 3.3 Gap class C: DE topic coverage

The 33 DE concepts cover the platform canon well. Gaps against current senior-DE loops:

| Missing topic | Asked as |
|---|---|
| **A DE interview framework** (the DE analogue of the SWE "framework" concept: requirements → source analysis → ingestion → storage/model → processing → serving → quality/ops → cost) | The scaffold for *every* DE design answer; SWE has one, DE does not |
| **Data contracts & schema registry governance** (producer/consumer contracts, enforcement, evolution policy) | "How do you stop upstream teams breaking your pipelines?" — near-universal senior question |
| **dbt-style transformation layer / semantic layer** (model DAGs, tests-as-code, metrics layer) | "How do you organize 500 SQL models?" |
| **Feature stores & ML data pipelines** (offline/online skew, point-in-time correctness, training-set generation) | DE-for-ML loops at every AI-forward product company |
| **Real-time OLAP serving** (Druid/Pinot/ClickHouse class: why warehouses can't serve <1s dashboards, pre-aggregation, star-tree) | "Serve user-facing analytics at 100 ms" — Uber/LinkedIn-style |
| **Backfills & reprocessing at scale** (versioned outputs, parallel backfill, backfill vs restatement, cost control) | "Your logic was wrong for 6 months — fix history" — a signature senior question |
| **Streaming state & streaming joins** (state stores, changelog topics, stream-stream vs stream-table joins, state TTL) | Depth follow-up on any streaming design |
| **Reverse ETL / activation** (warehouse → SaaS sync, idempotent upserts to rate-limited APIs) | Increasingly common at product companies with growth teams |
| **Privacy engineering for data** (GDPR deletes in a lake, right-to-be-forgotten vs immutable files, tokenization) | Governance concept touches it; dedicated treatment is expected at senior level |
| **Lakehouse table maintenance at depth** (compaction scheduling, Z-ordering/clustering, vacuum/retention, concurrent writers) | Follow-up on any Delta/Iceberg answer |

### 3.4 Gap class D: interview-execution training (the biggest product gap)

Knowing the material and performing in the room are different skills. Nothing in the tool currently trains:

1. **Requirements clarification.** No surface practices the first 5 minutes — turning a vague prompt into functional/non-functional requirements and explicit scope cuts. This is the most heavily weighted phase at Meta and Amazon.
2. **Capacity estimation under pressure.** The cheat sheet lists numbers, but there is no *drill*: given a prompt, estimate QPS/storage/bandwidth, then check against a worked solution. Estimation fluency is a pass/fail signal at Google.
3. **Timed mock mode.** No 35–45 minute guided simulation: prompt → clarify → estimate → high-level → deep dive → wrap-up, with phase timers.
4. **Follow-up chains.** Real interviews are adversarial dialogues. No surface simulates "OK, now the cache is down", "now make writes 100×", "why not Cassandra here?"
5. **Self-grading rubric.** No way for a candidate to score an attempt against the dimensions companies actually use (problem exploration, solution design, technical depth, communication, trade-off quality) and level expectations (L4 vs L5 vs L6 signals).
6. **Spaced repetition.** Flashcards exist but have no scheduling; progress is binary done/not-done. No "weak areas resurface" loop.
7. **Diagramming practice.** Candidates draw in interviews; the tool is read-only. Even a lightweight canvas with draggable standard components (LB, cache, DB, queue) would train the physical skill.

### 3.5 Gap class E: company-calibration

Product companies differ systematically: Meta weights product thinking and requirements; Google weights estimation and algorithmic depth; Amazon weights operational excellence and LP-flavored trade-offs; Stripe weights API contracts and correctness; Indian product companies weight pragmatic scale + cost. The tool presents one undifferentiated voice. A thin "company lens" layer (per-question callouts: *"At Meta, expect the follow-up to go toward…"*) would meaningfully sharpen preparation without new infrastructure.

---

## 4. Enhancement plan

The plan is ordered by interview impact per unit of effort, is fully compatible with the existing content-as-data architecture, and follows the established wave workflow (build → both-theme Playwright validation → PR → squash-merge).

### Wave H — Question-bank depth, tranche 1 *(highest ROI)*

**Goal:** fully build the 30 highest-frequency questions (18 SWE + 12 DE), chosen by interview frequency.

- Extend the question schema with two new sections the renderer already almost supports: `followUps: [{q, answer}]` (rendered as an expandable "Interviewer will ask…" block) and `estimate: {assumptions, math, result}`.
- SWE tranche: idempotent payment/checkout, news-feed fan-out, chat delivery, rate limiter variants, URL shortener follow-ups, notification dedupe, top-K/leaderboard, distributed lock, cache stampede, hot partition, outbox pattern, saga vs 2PC, read-your-writes, multi-region failover, webhook delivery, search indexing path, file upload at scale, schema migration at scale.
- DE tranche: backfill 6 months of bad data, dedupe at ingest, SCD2 at scale, late-arriving data end-to-end, exactly-once sink, small-file remediation, warehouse cost cut 50%, streaming sessionization, data-contract rollout, CDC schema evolution, quality-gate design, multi-tenant isolation.
- Acceptance: every built question has intro, estimate, 4–6 steps, failure modes, checklist, ≥4 follow-ups; smoke test asserts the new sections render in both tracks/themes.

### Wave I — Interview-execution surfaces, part 1: Estimation drills + Clarify drills

**Goal:** two new practice pages per track, using the decision-drill interaction pattern (already proven).

- **`#p:estimate` — "Do the math"**: 10 drills/track. Prompt → user mentally estimates → reveal worked math (assumption table → calculation chain → sanity check). Data module `content/<track>/estimates.js`; new component `components/estimates.js` (reg-driven, ~150 lines, same shape as decisions.js).
- **`#p:clarify` — "First five minutes"**: 8 drills/track. A deliberately vague prompt; user picks which 4 of 8 candidate clarifying questions matter most; reveal grades each (critical / useful / waste-of-time) and shows the scope cut a strong candidate makes.
- Both are pure content-as-data; nav lights up via `practicePages`.

### Wave J — Mock-interview mode *(flagship feature)*

**Goal:** a timed, phase-guided 45-minute simulation — the feature that converts the tool from "study aid" to "interview trainer."

- New page `#p:mock`: pick a question (any built question) → guided phases with timers (Clarify 5 min → Estimate 5 min → High-level 10 min → Deep dive 15 min → Wrap 5 min). Each phase shows *only* a phase prompt + a free-text notes box (persisted to localStorage); the model answer stays hidden until the end.
- End screen: side-by-side self-review — your notes per phase vs. the built answer's corresponding section — plus a **self-grading rubric** (5 dimensions × 4 levels, with concrete behavioral anchors per level) and a saved attempt history on the dashboard.
- No backend needed; everything is localStorage. Component ~400 lines; rubric is a shared data module `content/rubric.js`.

### Wave K — SWE syllabus expansion (new concepts)

**Goal:** close the Gap-class-B topic holes with 8 new animated concepts + their question-bank entries.

1. Consensus & coordination (leader election sim)
2. Multi-region & active-active (replication/conflict sim)
3. Sagas & distributed transactions (order-flow sim with failure injection)
4. Collaborative editing: OT vs CRDT (two-cursor merge sim)
5. Ride-hailing dispatch & geo-matching (map-cell matching sim)
6. Flash-sale / ticketing inventory (contention sim)
7. LLM serving & AI gateway (token-streaming/batching sim)
8. Vector search & RAG (embedding-space ANN sim)

Plus 2 non-animated additions: an API-design concept and a tracing/logging design concept. Add ~15 matching questions to the SWE catalog (ride-hailing, ticketing, LLM gateway, vector search, experimentation platform, webhook platform, etc.).

### Wave L — DE syllabus expansion

**Goal:** close Gap-class-C with 7 new DE concepts + catalog entries.

1. **The DE interview framework** (the single most important addition — the DE analogue of the SWE framework concept, with its own flow diagram and start-path placement)
2. Data contracts & schema governance
3. Transformation/semantic layer at scale (dbt-class)
4. Feature stores & ML data pipelines
5. Real-time OLAP serving (sub-second analytics)
6. Backfills & reprocessing at scale
7. Streaming state & joins

Plus ~12 new catalog questions (reverse ETL, GDPR deletes in a lake, feature-store skew, Pinot-class serving design, backfill economics, streaming join depth).

### Wave M — Question-bank depth, tranche 2 + spaced repetition

- Build the next 40 questions to full depth (prioritized by the dashboard's own usage data if the user wants — otherwise by frequency list).
- Upgrade flashcards to a Leitner-box scheduler (3 boxes, localStorage; "due today" count on the dashboard; wrong answers resurface sooner). Small change: flashcards.js already tracks per-card state shape.
- Dashboard gains a **readiness meter** per category (built-questions studied × drills passed × cards retired).

### Wave N — Company lenses + diagram practice *(polish tier)*

- **Company lens data**: optional `lenses: {meta?, google?, amazon?, stripe?}` field on built questions; renderer shows toggleable callout chips ("At Amazon, steer this toward operational readiness…"). Pure data addition.
- **Diagram sandbox** `#p:draw`: a lightweight canvas page with draggable standard components (client, LB, service, cache, DB, queue, CDN) and connectors, savable to localStorage per question. Deliberately simple — it trains the habit of drawing while talking, not diagram tooling.
- Follow-up chain drills: extend decision drills with multi-step "the interviewer pushes back" sequences (3 linked decisions per scenario).

### Sequencing & effort summary

| Wave | Deliverable | Interview impact | Relative effort |
|---|---|---|---|
| H | 30 deep-built questions + follow-ups/estimates schema | ★★★★★ | Medium-high (content-heavy) |
| I | Estimation + clarification drill pages | ★★★★★ | Medium |
| J | Timed mock mode + self-grading rubric | ★★★★★ | Medium-high (one new component) |
| K | 8–10 new SWE concepts (consensus, multi-region, LLM infra, …) | ★★★★ | High (sims are the cost) |
| L | 7 new DE concepts incl. DE interview framework | ★★★★ | High |
| M | 40 more deep questions + spaced repetition + readiness meter | ★★★★ | Medium-high |
| N | Company lenses + diagram sandbox + follow-up chains | ★★★ | Medium |

**Recommended order: H → I → J → L(framework concept first) → K → M → N.** Waves H–J alone would move the tool from "learn the material" to "pass the interview" and are where the next unit of effort should go.

---

## 5. Risks & quality guardrails

- **Content accuracy is the product.** Every built answer and follow-up should be reviewed against primary sources (engineering blogs, the canonical texts) — a confident wrong number in a cheat sheet is worse than no number.
- **Protect the no-build-step simplicity.** Every proposed feature above is implementable as data modules + one vanilla component; resist any enhancement that would introduce a bundler or backend.
- **Keep the two tracks in lockstep.** Every new surface should ship track-aware from day one (the registry pattern makes this nearly free); asymmetry between tracks is the main regression risk.
- **Validation discipline.** Continue the established both-theme Playwright smoke test with zero-console-error gating per wave.

---

## 6. Bottom line

The platform is architecturally excellent and visually best-in-class for free prep tools; its weakness is not the engine but the **depth and the performance layer**. 165 of 183 questions are still outlines, and nothing yet trains the timed, adversarial, estimate-on-the-spot skills product companies actually grade. Execute Waves H–J and the tool becomes a genuine interview trainer rather than a reference; add Waves K–L and its syllabus matches the 2025–26 product-company question set, including the fast-growing LLM-infrastructure and data-contract question families.
