# API Engineering Lab — Gap Analysis & Build Plan

**Goal:** a complete beginner opens this tool, works through it, and comes out able to *design, build, secure, test, operate, and defend* production APIs at a senior level.
**Date:** 2026-11-13 · **Current state:** 34 modules, 7 sections, 93 quiz questions, fully simulated, live on GitHub Pages.

---

## Part 1 — Honest assessment of where the tool stands

### What already works well (keep, don't rebuild)

| Strength | Evidence |
|---|---|
| **Narrative spine** | One fictional business (ShopSphere) threads through HTTP, REST, architecture, security, incidents. This is rare and valuable — most courses teach topics in isolation. |
| **Simulation-first fundamentals** | http-lab, http-methods, pagination, idempotency, rate-limiting, resilience, caching, webhooks are genuinely interactive simulations, not slides. |
| **Failure-centric teaching** | Debug mode, 10 incidents, 7 testing challenges, failure injection. Learning from breakage is how seniors actually think. |
| **Senior judgment content** | 11 trade-off decisions with "when the answer flips", protocol decision matrix, incident simulator. |
| **Learning UX scaffolding** | Modes (learn/explore/build/debug/interview), per-module quizzes, progress tracking, command palette, deep links. |

### The 6 structural gaps that keep it from "100%"

**GAP 1 — Nothing is ever really built.** The tool's biggest promise ("by the end he can *build* APIs") is its biggest miss. Express Workshop is *read-only* code walkthrough; OpenAPI Studio's "Validate" is 7 regex checks and its rendered docs ignore your edits. A learner finishes without ever having typed a route handler, fixed a failing assertion, or made a spec validate. **Reading code ≠ writing code.** This is the gap between "can explain APIs" and "can build APIs."

**GAP 2 — No guided path with gates.** The sidebar, the home-page journey (10 steps), and the ROUTES groups all disagree; ShopSphere is "step 2" in one and "step 10" in the other. Nothing is gated or sequenced — a beginner can (and will) wander into senior-decisions on day one, bounce off, and leave. There's no "you are here / do this next / you've mastered X" loop. Visited ≠ learned: progress tracks page views and quiz best-scores, nothing else.

**GAP 3 — Assessment is too thin to certify mastery.** 3 MCQs per module (93 total) and 8 interview questions cannot cover 34 modules of material, and nothing makes you *produce* — no "design this endpoint and get it reviewed", no "write the error body", no spaced review of weak areas. Several built interactive components (predict-output, choose-approach, investigation-flow, follow-up-chain, tiered-answer, design-flow, timeline) are loaded but **never used** — the assessment machinery half-exists already.

**GAP 4 — Missing senior-level topics.** A senior API engineer interview/job touches things the lab never does:
- **CORS & browser realities** (preflight, credentials, SameSite) — only an OWASP aside today
- **Concurrency & data integrity**: optimistic locking / ETag + If-Match for writes, transactions vs sagas as a *lab* (exists only as a reveal-card)
- **HTTP/2 & HTTP/3, compression, content negotiation, keep-alive economics**
- **Service-to-service auth** (mTLS, workload identity, token exchange) and secrets handling
- **GraphQL/gRPC beyond a side-by-side snippet**: schema design, N+1 resolvers, streaming
- **Contract testing** (consumer-driven, Pact-style) and **API gateway configuration** hands-on
- **Load testing & capacity planning** (p99 vs mean, Little's Law, headroom)
- **AsyncAPI / event contract design**, event versioning, outbox pattern
- **API as product**: developer experience, SDK design, changelogs, deprecation comms, monetization basics
- **Full OWASP API Top-10** (8 of 10 covered) + injection/SSRF demos

**GAP 5 — The business lens stops halfway.** ShopSphere context exists for 20/34 modules and is absent from exactly the modules where business framing matters *most* (security breach cost, perf → conversion, incidents → revenue). Senior engineers are distinguished by connecting tech to business — the tool models this for juniors and drops it for seniors.

**GAP 6 — Trust-level polish.** Home page says "21 interactive modules" (there are 34). Stale stubs (`protocols-data.js`, `request-builder.js`, `core/progress.js`) and Airflow-era comments linger. Small, but a learning tool teaching rigor should exhibit it.

### Verdict

Today the tool is a **very good "understand APIs" tool (~70%)** and a **weak "build APIs" tool (~30%)**. The fix is not "more modules" — 34 is already a lot — it's (a) a real build/practice loop, (b) a coherent gated path, (c) deeper assessment, plus a targeted set of new senior modules.

---

## Part 2 — Build plan

Ordered by impact per effort. Each phase ships independently; nothing breaks the other tools on the Pages site (all new localStorage keys stay `apilab-*`, all code stays inside `api-engineering-lab/`).

### Phase 0 — Coherence & trust fixes (small, do first)

1. **One canonical learning path.** Make sidebar order = ROUTES order = home journey. Move Business Scenario to a short "meet ShopSphere" intro early + a capstone revisit at the end. Unify group names across sidebar / ROUTES / progress page.
2. **Fix stale claims & stubs.** Home stats computed from ROUTES (34, quiz count, etc.); delete or implement `protocols-data.js`, `request-builder.js`, `core/progress.js`; strip leftover Airflow comments from components.
3. **"Next up" engine.** Progress page and home both surface *the next recommended module* based on visited + quiz scores, with a one-click resume. Pager already exists; this is mostly data + copy.

### Phase 1 — Make "Build" real (the headline investment)

> Principle: no backend, no WASM Node needed. A **JS-based grader + sandboxed evaluation in the browser** gets 90% of the pedagogical value.

4. **Express Workshop → Code Katas.** Convert each of the 16 stages from "read the diff" to **fill-in-the-blank code challenges**: the learner edits a route handler in a code editor; a deterministic in-browser harness (the existing `AV.HttpSim` + a tiny sandboxed `new Function` runner over a mocked `req/res/next` API) fires 3–6 test requests at their handler and shows pass/fail per assertion (status, body shape, headers, idempotency, auth checks). Hints → solution reveal, scored. *This single change converts the tool from "about building" to "building."*
5. **OpenAPI Studio → real validation + live docs.** Replace regex checks with a proper in-browser YAML parse (vendor `js-yaml`, ~40KB) and a structural OpenAPI 3.x validator (paths/operations/responses/schemas/refs); render docs *from the learner's actual spec* so edits visibly change the docs. Add 5 spec-fixing exercises ("this spec has 4 contract bugs — find and fix them", validated).
6. **Design Reviewer capstone (new module).** "Design ShopSphere's returns/refunds API": learner writes endpoints in the Endpoint Designer format + error bodies + a pagination choice + an auth model; a rule-based reviewer (extending the existing lint engine) grades against ~25 senior review rules and produces a written "PR review." This is the build-side graduation exercise.

### Phase 2 — Mastery loop (assessment that certifies)

7. **Quiz depth: 3 → 8–10 questions/module,** mixing MCQ with the **already-built unused components**: predict-output (what status/body comes back?), choose-approach, investigation-flow (incident triage), follow-up-chain (interviewer pressure-testing), tiered-answer (junior/mid/senior versions of one answer). Wire them into test-yourself.js.
8. **Interview Prep: 8 → 40+ questions,** organized by the question types real loops ask (design, debugging, trade-off, estimation, behavioral-technical), each using follow-up-chain + tiered-answer so learners practice *depth*, not recall. Add a timed **mock-interview mode** (5 random questions, self-graded rubric).
9. **Spaced review.** A lightweight "Review" page: wrong/weak quiz items resurface on a 1/3/7-day schedule (localStorage timestamps, `apilab-review`). Cheap to build, huge retention payoff.
10. **Mastery gates & certificate.** Each section gets a mastery bar (quizzes ≥80% + its build exercise passed). Completing all gates unlocks a final **90-minute capstone**: one incident to debug + one API to design + one spec to fix + 20 mixed questions → printable "completion report" summarizing demonstrated skills.

### Phase 3 — New senior modules (fill GAP 4)

Priority order; each is a simulation in the house style, with quiz + business lens:

11. **CORS & the Browser Lab** (beginner/intermediate — this one is missing for *beginners* too): simulate a browser making cross-origin calls; toggle origins, methods, headers, credentials; watch preflights succeed/fail; fix the server config.
12. **Concurrency & Data Integrity Lab**: two simulated clients racing on the same order; lost-update demo; fix with ETag/If-Match (412), optimistic version columns, then transactions vs saga with compensation on the ShopSphere checkout.
13. **Contract Testing Lab**: consumer tests vs provider spec; break the provider and watch which consumers fail; drives home why "my API, my rules" dies at scale.
14. **Gateway Configuration Lab**: a YAML-ish gateway config (routes, auth, rate limits, timeouts, retries) the learner edits; simulated traffic shows the effect; misconfig exercises (retry storm via gateway retries + client retries, timeout inversion).
15. **Load & Capacity Lab**: traffic generator against the simulated service; p50/p95/p99 vs mean, saturation knee, Little's Law calculator, "size this service for Black Friday" exercise.
16. **Event Contracts & Async APIs**: AsyncAPI-style contract for ShopSphere order events; outbox pattern simulation; event versioning + consumer compatibility.
17. **GraphQL & gRPC Deep Dive**: schema/resolver sandbox showing the N+1 trap and dataloader fix; gRPC streaming visualized; when-to-choose integrated with protocol-matrix.
18. **Service-to-Service Security**: mTLS handshake visual, workload identity, token exchange, secrets rotation; extends OWASP coverage to all 10 + SSRF/injection demos.
19. **HTTP Internals**: HTTP/1.1 vs 2 vs 3 multiplexing visual, head-of-line blocking, compression & content negotiation, connection reuse economics (extends the existing "reuse" scenario).
20. **API as a Product**: developer-experience review exercise (rate a bad API's DX), SDK design principles, changelog/deprecation communication, basic monetization/quotas — the "staff engineer" finishing school.

### Phase 4 — Business lens completion & polish

21. **Business lens for the missing 14 modules** (all Security/Performance/Practice): breach cost, latency→conversion, incident→revenue/trust framing. Content-only, uses existing component.
22. **Glossary + "explain like I'm new" toggles** for beginner safety in senior modules (hover definitions; the data file largely exists in narration text).
23. **Mobile pass** on the new code-editor modules (editors are the hardest surface on phones; fall back to tap-to-choose snippets below 700px).

### Sequencing & effort (rough)

| Phase | Ships | Effort | Impact |
|---|---|---|---|
| 0 Coherence | one canonical path, honest stats | ~1 session | High for beginners |
| 1 Real building | Express katas, real OpenAPI, Design Reviewer | ~3–4 sessions | **Highest — unlocks the core promise** |
| 2 Mastery loop | deep quizzes, interview bank, spaced review, gates+capstone | ~2–3 sessions | High — turns usage into certified skill |
| 3 Senior modules | 10 new labs (11→20), prioritized order | ~1 session each | Medium-high each; CORS & Concurrency first |
| 4 Lens & polish | business lens ×14, glossary, mobile | ~1–2 sessions | Medium |

**Definition of "100%":** a beginner can follow one path end-to-end; every section ends in something they *built* that was *graded*; the senior topic list above is covered; the capstone certifies design + build + debug + trade-off skills; and every module ties back to business impact.

---

## Part 3 — Recommended immediate next step

Start with **Phase 0 + item 4 (Express katas)** in one pass: Phase 0 is quick and makes the tool honest; the katas are the single change that moves it from "learn about APIs" to "learn to build APIs." Everything else layers on top.
