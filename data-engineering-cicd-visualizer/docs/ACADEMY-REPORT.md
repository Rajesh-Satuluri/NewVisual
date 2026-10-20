# Data Engineering CI/CD Academy — Build Report

This report documents the transformation of the existing Data Engineering CI/CD Visualizer into a
competency-based **Academy**, delivered as ten atomic, individually-deployed iterations. It follows the
final-deliverables checklist from the master prompt.

_Last reviewed: 2026-10-20._

---

## 1. Existing architecture preserved

The app's foundation was kept intact — no framework migration, no rewrite:

- **Pure HTML + CSS + vanilla JS**, no bundler/CDN/backend, under the `DECICDViz` namespace.
- **Hash router** with lazy per-route `<script>` loading and `AV.routeParam` (`js/core/router.js`).
- **Self-registering IIFE modules** via `DECICDViz.registerModule({id,title,render,destroy})`.
- **Declarative teaching factory** `DECICDViz.Concept.build(cfg)` (`js/components/concept-module.js`).
- **Local progress** in `localStorage` (`js/core/progress.js`), with export/reset.
- The **RetailFlow** story and the **Airbnb evidence-based case study** (four chapters + evidence tiers).
- All ~28 original concept modules, the interview bank, quiz, glossary, master map, and the 8 original labs.

Everything added is **additive**: existing modules that don't set new fields render exactly as before.

## 2. Main improvements implemented

| Iteration | Delivered |
|---|---|
| 1 | Lesson metadata schema (`curriculum.js`), prerequisite map, lesson-info panel, pure-Node QA harness |
| 2 | Two learning modes (Guided Academy / Reference Lab), prerequisite-aware path, next-action, capstone card |
| 3 | Deep-theory toolkit added to `Concept.build`; **GitHub Actions** brought to the golden-template depth |
| 4 | Deepened Level 0–2 foundations (ci-vs-cd, git, github, branching) + new **CLI/YAML/Dependencies** lesson |
| 5 | Deep theory for CI/testing/CD (testing-pyramid, pytest, sql-testing, data-quality, artifact-lifecycle, deployment-strategies, rollback) |
| 6 | Lab engine v2 — four lab modes + reusable validators + richer feedback + 3 new labs |
| 7 | RetailFlow **Capstone** — 14 milestones wired to lessons/labs with acceptance criteria |
| 8 | Interactive visualizers — Release & Rollback Simulator, CI-run widget, Git commit-graph |
| 9 | Competency progress — mastery stages + evidence capture + spaced review (schema v1→v2 migration) |
| 10 | QA sweep (40 routes), accessibility/mobile pass, README + this report, extended QA harness |

## 3. Curriculum structure

`js/data/curriculum.js` is the single source of truth for both modes: an **11-level** spine (L0 Software &
Deployment Fundamentals → L10 Advanced Platform Engineering), a **source registry** of real official-doc
references (git-scm, GitHub Actions, pytest, dbt, Airflow, Terraform, Docker, Kubernetes, Helm, Argo CD,
Databricks, Azure DevOps, Jenkins, Great Expectations, Fowler/continuousdelivery/SRE, Python venv/pip, YAML,
12-factor), and per-lesson metadata (level, prerequisites, objectives, sources, estimated minutes) for
**~30 lessons**. The prerequisite graph is validated acyclic by the QA harness.

## 4. Modules with significantly expanded theory

Brought to the mandatory-theory depth (problem → intuition → definition → mechanics → interactive
architecture / trace / annotated code / I-O → comparisons → documented-vs-illustrative real world →
trade-offs → structured failures → six-level knowledge checks → mastery challenge → further reading):

- **GitHub Actions** (golden template, full set).
- **Foundations:** ci-vs-cd, git, github, branching, and the new **CLI/YAML/Dependencies** lesson.
- **Testing:** testing-pyramid, pytest, sql-testing, data-quality.
- **CD core:** artifact-lifecycle, deployment-strategies, rollback.

The remaining concept modules keep their original (already solid) structure and can be deepened with the
same factory fields in future passes — see §12.

## 5. Lab engine capabilities & validation

`js/components/lab.js` supports four modes on one schema: **repair**, **guided** (per-step checkpoints),
**incident** (progressive evidence → root-cause MCQ → keyword-graded recovery), and **challenge**
(acceptance criteria, stronger solution gate). `DECICDViz.LabValidators` provides reusable static checks
(YAML indentation lint, key presence, regex, keyword hits). Validation is deterministic static analysis or
scripted simulated runs — **no learner code is ever executed** (no `eval`/`Function`; all output escaped),
and each lab's kind and mode are shown honestly. 11 labs total (8 original repair + guided/incident/challenge).

## 6. Capstone structure & supported paths

`#capstone` presents the **RetailFlow** reference project as **14 milestones** (fix → branch/PR → CI → tests
→ data quality → DAG validation → artifact → promote dev/staging → prod approval → OIDC secrets → incident →
data recovery → infra governance → independent release). Each milestone lists what you build, the lessons and
labs behind it, objective acceptance criteria, and an **illustrative reference snippet**. Milestone completion
is tracked locally and feeds the "Integrate" mastery stage. The repo structure and snippets are reference
material — nothing is generated on disk or executed in the browser (stated in-app).

## 7. Visualizers added / improved

- **Release & Rollback Simulator** (`#release-sim`) — 6 scenarios; the pipeline repaints per scenario and the
  learner chooses a recovery and sees its consequences and trade-offs (business/system/engineering views).
- **CI-run visualizer** (in GitHub Actions) — toggles (test passes / `needs:` gate / cache) change which jobs
  pass, fail, skip, or ship-broken, and whether the merge is allowed.
- **Git commit-graph** (in Git) — simulated commit / branch / merge / HEAD-switch grow a live history graph + log.
- Factory gained an additive `interactive` field so any lesson can host a stateful widget.

## 8. Progress & assessment changes

Progress became **competency-based** (schema v2, migrates v1 saves in place): knowledge-check evidence and a
spaced-review schedule were added. **Mastery stages** (Understand → Implement → Apply → Diagnose → Integrate)
are derived from knowledge-checks, labs, and completed capstone milestones — never from time on a page. Wrong
knowledge-check answers schedule a **spaced review** (1→2→4→8-day intervals, promoted on success). The home
dashboard shows a skill-mastery bar and a spaced-review card. Progress remains exportable as JSON.

## 9. Automated checks executed — actual outcomes

- `node --check` on every touched JS file — **all parse clean** across all iterations.
- `node tools/qa-check.js` — **392 checks pass, 0 fail** (routes resolve; prerequisite graph acyclic;
  objectives + sources present; case-study facts cited; no broken literal internal links; every ready route
  has a module file; every lesson is placed in a curriculum level).
- **Playwright** (headless pre-installed Chromium) each iteration, plus a final full-journey sweep:
  **40 routes** each render with a heading, none empty / not-found; **no mobile (375px) horizontal overflow**
  on home/github-actions/release-sim/capstone/labs/git; `prefers-reduced-motion` handling present; and
  **zero console errors** (the only 404 is the pre-existing monorepo-only `shared/backup-button.js`, not a regression).

## 10. Simulated vs. executed

- **Simulated / static:** all labs, all visualizers, the release simulator, every code/config snippet, and
  all pipeline/run state. Nothing executes Python/SQL/Terraform/Docker/Actions/Airflow/Databricks.
- **Locally executed:** none in-browser by design (static site, no backend).
- **Cloud executed:** none. No credentials are collected; all secrets in examples are clearly-marked placeholders.
- Every exercise's mode ("Static validation" / "Simulated execution") and the illustrative nature of snippets
  are labelled in the UI.

## 11. Known limitations & remaining work

- Progress is **browser-local only** (no backend, no cross-device sync).
- Real execution and cloud-connected labs are **out of scope** for this static deployment; they would require a
  separate, sandboxed backend service (documented but not built).
- Deep-theory depth has been applied to the foundations and the CI/testing/CD core; the remaining concept
  modules (Airflow, dbt, Databricks, Terraform, Docker, Kubernetes, Helm, Argo CD, secrets, security,
  observability, SonarQube, Azure DevOps, Jenkins) retain their original structure and are the main backlog.
- Mastery-stage derivation is a transparent heuristic over available interaction signals, not a formal assessment.

## 12. Recommended next iteration (by impact)

1. **Deepen the remaining Level 6–10 modules** (Airflow, dbt, Databricks, Terraform, Docker, security,
   observability) with the same factory fields — highest learning-value backlog.
2. **Add knowledge checks + a lab to every lesson** so mastery stages are reachable curriculum-wide.
3. **Per-module interactive visualizers** (IaC plan/apply, container layers, security trust-boundary) using the
   `interactive` factory hook already in place.
4. **Optional sandboxed execution backend** (documented API, resource limits, synthetic data) to turn selected
   labs from static validation into real runs — the one genuinely new capability a static site can't provide.
