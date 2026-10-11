# Product Audit — Cloud Data Engineering Visualizer

_Phase 0 of the premium-platform redesign. Inspection only — no behavior changed in this document._

## 1. Architecture summary

| Aspect | Finding |
|---|---|
| Framework | **Vanilla JS**, no build step. Modules self-register on `window.TableViz` (`TV`). |
| Entry | `index.html` loads CSS + ordered `<script>` tags; `js/app.js` boots the router/shell after formats + modules register. |
| Routing | Hash router `#<format>/<screen>/<step>` in `app.js`, with back-compat for bare `#<screen>`. Browser back/forward supported. |
| State / persistence | `TV.Progress` (`js/core/progress.js`) — one JSON key `cde-progress` (viewed/quiz/ratings/certExam/labs/activities/role/goal/targetCert). Global prefs (`cde-theme`, `cde-format`, nav-collapsed) separate. All via try/catch-safe `TV.ls`. |
| Theming | Dark-first + light, resolved before first paint in `index.html`; **147 CSS custom properties** already defined across `css/*.css`. |
| CSS architecture | 9 stylesheets (main/layout/components/responsive/animations/enhancements/multiformat/print/fonts). Token-based, but **~566 inline hex colors remain in JS** (mostly SVG brand logos + per-block accents). |
| Responsive | `css/responsive.css` + per-component rules; sidebar collapses; mobile drawer exists. |
| Fonts | Inter + JetBrains Mono, self-hosted woff2 in `assets/fonts`. |
| Formats | 5 registered (`azure`, `databricks`, `aws`, `fabric`, `multi-cloud`/compare). Sidebar nav groups **derived from the service catalogue** so nav and content never drift. |

## 2. Feature inventory

| Feature | Source | Works? | Needs UI redesign | Needs functional work | Backend dep |
|---|---|---|---|---|---|
| Service documentation (57 services, full A–I depth) | `js/data/*-services.js`, `js/modules/_service-detail.js` | ✅ | **Yes** — section tabs, progressive disclosure, copy-code | No | None |
| Interview Q&A banks | `js/data/*-interview-qa.js`, `js/modules/_interview-qa.js` | ✅ | Minor | Rubric practice UI (Phase 8) | None |
| Certifications + objective coverage | `js/data/certifications.js`, `cert-questions.js`, `js/features/cert-*.js` | ✅ | Exam-center polish (Phase 8) | No | None |
| Exam simulator (timer/navigator/review) | `js/features/exam-sim.js`, `cert-exam.js` | ✅ | Minor | No | None |
| Incident simulator (39 scenarios) | `js/data/incidents*.js`, `js/features/incident-*.js` | ✅ | **Yes** — investigation workspace (Phase 7) | No | None |
| Architecture / design challenges (4) | `js/data/design-challenges.js`, `js/features/design-challenge-engine.js` | ✅ | **Yes** — canvas studio (Phase 6, additive) | Canvas is net-new | None |
| Project tracks (5) | `js/data/project-tracks.js`, `js/modules/projects-view.js` | ✅ | Minor | No | None |
| Hands-on labs (20) | `js/data/cert-labs.js` | ✅ | Minor | No | None |
| Learning paths (4) | `js/data/learning-paths.js`, `js/modules/learning-paths-view.js` | ✅ | Minor | No | None |
| Recommendations dashboard | `js/modules/recommendations.js`, `js/features/recommend-engine.js` | ✅ | **Yes** — premium command center (Phase 3) | No | None |
| Mastery / skill tracking | `js/modules/mastery-view.js`, `progress.js` | ✅ | **Yes** — skill grid (Phase 9) | No | None |
| 5-mode launcher (Learn/Design/Operate/Interview/Certify) | `js/modules/*` | ✅ | Folds into new shell (Phase 2) | No | None |
| Cross-cloud comparison | `js/modules/multi-cloud.js`, `equivalences.js` | ✅ | Minor | No | None |
| Quiz / Test Yourself | `js/features/quiz.js`, `quiz-bank.js` | ✅ | Minor | No | None |
| Global search / Cmd-K | — | ❌ | **Net-new (Phase 2)** | Net-new | None (local) |
| Interactive visualizers (Spark/Delta/pipeline) | `animation-engine.js` + vision exhibits | Partial | **Net-new steppable sims (Phase 5)** | Net-new | None |

**No feature depends on an unavailable backend.** Everything is client-side over static data banks — the redesign stays backend-free.

## 3. Design problems identified

- **Provider-first navigation** — the app is organized by cloud, not by capability; a learner studying "streaming" must know which cloud to click first.
- **No global search** — no way to jump to a service/question/incident by name.
- **Long service pages** — 16 sections render stacked with no in-page section nav or progressive disclosure; hard to scan.
- **Inline color drift** — ~566 hex literals in JS risk theme inconsistency and don't all respond to the token system.
- **Dashboard is a catalogue, not a command center** — recommendations exist but aren't framed as "continue / next action / skill state".
- **Icon consistency** — a shared inline-SVG set exists in `app.js`, but some data/content uses ad-hoc glyphs.
- **Visualizers** — animation engine present but few true steppable, resettable concept simulators.

## 4. Baseline established

- Content-preservation snapshot: **362 content IDs across 15 groups** (`tools/content-baseline.json`), enforced by `tools/content-baseline.js`.
- Deep-dive coverage: **57/57 services (100%)** (`DEEP_DIVE_COVERAGE.md`).
- Tests/validators green (see `TEST_RESULTS.md`).

## 5. Phase 0 acceptance

- [x] Architecture understood and documented.
- [x] Working features inventoried (none backend-blocked).
- [x] Baseline of content + tests recorded before any redesign change.
- [x] Prioritized implementation plan exists (`IMPLEMENTATION_PLAN.md`).
- [x] No working functionality removed.
