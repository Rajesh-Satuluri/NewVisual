# Data Engineering CI/CD — Interactive Visualizer

An interactive learning lab that teaches **CI/CD for Data Engineers** — beginner → intermediate → proficient — through one continuous business story: **RetailFlow's Daily Revenue Pipeline**, following a single code change from a developer's laptop to the 7 AM executive dashboard.

**Topic:** Data Engineering CI/CD & DevOps · **Namespace:** `DECICDViz` · **Recurring org:** RetailFlow

## What this is

A production-oriented learning platform covering the full CI/CD surface a modern data engineer is expected to know: Git/GitHub, GitHub Actions, Terraform, Docker, Databricks Asset Bundles, dbt, pytest, SQL testing, Airflow, Kubernetes, Helm, Argo CD, Azure DevOps, Jenkins, secrets, data quality, SonarQube, plus cross-cutting engineering concepts (CI vs CD, artifacts, branching, the testing pyramid, deployment strategies, rollback, security, observability).

Each concept follows the same learning spine:
**theory → architecture → real code/config → trade-offs → production concerns → common misconceptions → troubleshooting → interview readiness.**

## Real-world case study: Airbnb (evidence-based)

The four "Real-World Scenario" sections form **one connected, evidence-based case study** anchored on a real company — **Airbnb** — chosen because Apache Airflow was created there (a tool this platform teaches) and because Airbnb has published a detailed public record of the exact problem these sections teach: making data *trustworthy* and metrics *consistent* at scale (the Data Quality initiative + Midas, and the Minerva metrics platform).

Four chapters, cross-linked by a shared chapter navigator:

1. **Business Problem & Impact** (`#business-scenario`) — the documented business problem and why a wrong number is a business-correctness incident.
2. **Architecture & Technical Design** (`#end-to-end-pipeline`) — data-flow vs. control-flow, a clickable component map, and a technology→module map.
3. **Code Change → Production** (`#environment-promotion`) — a 10-step implementation walkthrough of one representative change with a consistent reference-file set and a code/config explorer.
4. **Incident Response & Recovery** (`#failure-simulator`) — a staged investigation, decision points, code-vs-data recovery, and a post-incident review.

**Integrity (honest labelling).** Every statement is tagged **Documented fact** (with a clickable source), **Engineering interpretation**, **Reference implementation**, or **Pseudocode**. Facts link to primary Airbnb Engineering / Apache sources; figures that appear only in secondary coverage are flagged and shown as "reported by". The fictional **RetailFlow** narrative is preserved as a clearly-labelled practice sandbox, never presented as a real company. See `docs/AIRBNB-CASE-STUDY-REPORT.md` for the full source list and requirement→file mapping.

## Feature inventory

- **~28 concept modules** built on a shared teaching factory with Beginner / Intermediate / Proficient depth tabs, an animated flow, Why→What→How, before/after, a failure scenario, "when NOT to use," a RetailFlow mini-story, real code/config examples, prerequisites, misconceptions, troubleshooting, and per-topic interview questions.
- **End-to-End Pipeline** (case-study Chapter 2) — a clickable map of the whole lifecycle, each node showing purpose, input, output, tool, example command, and failure mode, plus a data-flow/control-flow explainer and a technology→module map.
- **Failure Simulator** (case-study Chapter 4) — a staged incident investigation (reveal evidence progressively; root cause on request), decision points, code-vs-data recovery, and a post-incident review, plus a preserved 10-scenario practice library walked stage by stage.
- **Interview bank** — searchable, level-tabbed questions with answer, why-it-matters, common mistake, RetailFlow scenario, and a harder follow-up.
- **Quiz** — multiple-choice checks with explanations.
- **Hands-on Labs** — fix a real broken config (GitHub Actions gating, a leaked secret, an insecure Dockerfile, a Terraform destroy guard, a late-arriving dbt incremental, a DAG import error, a Kubernetes OOM, a flaky freshness check), run deterministic checks, reveal progressive hints, and diff against a reference solution. Code is never executed — labs use static validation and scripted simulated runs, labelled on each lab.
- **Learning Dashboard** — overall and per-tier progress, continue-learning, bookmarks, and a revision queue, derived from real interactions and saved locally.
- **Global search** across topics, glossary terms, tools, and common errors.
- **Glossary** and a **Master Map** of the whole stack.

## Stack

Pure **HTML + CSS + vanilla JS** — no bundler, no framework, no CDN, no backend. Self-registering IIFE modules, a hash router with lazy per-route module loading, shared components, and design tokens, all under the `DECICDViz` namespace. Progress, bookmarks, and preferences are stored in the browser via `localStorage` (local to one browser; not synced across devices).

## Local development

```bash
cd data-engineering-cicd-visualizer
python3 -m http.server 8080
# open http://localhost:8080
```

No install step. Any static file server works; the app is also served via GitHub Pages.

## Architecture

- `js/core/*` — `router` (hash routing + lazy module loading + lifecycle), `animation-engine`, `keyboard`, `tooltip`, `progress` (local persistence), `search` (global search overlay).
- `js/components/*` — `concept-module` (the teaching factory), `arch-diagram`, `animation-controls`, `code-viewer`, `state-machine`, `timeline`, `data-engineering-lens` (the recurring RetailFlow example appended below concept modules).
- `js/data/*` — `retailflow-data.js` (the recurring business story + example repo structure), `cicd-concepts.js` (tool registry, ROI ordering, learning path), `search-index.js` (global search entries).
- `js/modules/*` — one self-registering module per route, lazy-loaded on navigation.
- `css/*` — design tokens + layout + components + animations (dark default, light theme supported).

## Execution model — read this

This is a **learning visualizer, not a runtime**. Interactive exercises use:

- **Conceptual visualization** — animated diagrams and flows.
- **Static validation** — structural/lint-style checks of config shown in the UI.
- **Simulated execution** — deterministic, scripted runs that illustrate what a real tool would report.

Nothing here actually executes Python, SQL, Terraform, Docker, GitHub Actions, Airflow, or Databricks. Where a real tool would run, the UI says so and the example includes the command you would run locally. Secrets in examples are clearly-marked placeholders.

## Accessibility & browsers

Keyboard shortcuts (`?` for help), theme toggle, semantic structure, and responsive layout. Targets current Chrome, Edge, Firefox, and Safari.

## Status & roadmap

Core platform, all concept modules, end-to-end map, failure simulator, interview/quiz, dashboard, global search, and hands-on labs are live. Planned next: an expanded failure catalogue and interview bank, a content/route test harness, and broader UX/a11y polish.

## Known limitations

- Progress is browser-local only (no backend, no cross-device sync).
- Code execution is simulated/static, never real (see Execution model) — labs validate your edits with structural/regex checks and scripted simulated runs, not a real runtime.
