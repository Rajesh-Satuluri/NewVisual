# Third-Party Audit — Data Engineering CI/CD Academy

**Auditor stance:** independent product auditor, senior software/data engineer, learning-experience designer.
**Subject:** https://rajesh-satuluri.github.io/NewVisual/data-engineering-cicd-visualizer/ (commit `a81cc9d`, main).
**Method:** read the full source (≈16.8k lines across 60 files), ran the live site in headless Chromium at desktop (1366px) and phone (375px) widths, measured network/page metrics, scripted interactions (knowledge checks, labs, quiz, interview), computed WCAG contrast from the design tokens, and had three independent reviewers read the content, practice and UX layers in parallel. Every claim below carries a `file:line` or a measured number. **No project file was modified.**
**Date:** 2026-11-12.

---

## 0. Executive summary (read this if nothing else)

**Verdict: a well-engineered, honest, narrow CI/CD-for-data-engineers tutorial. It is not yet a study platform, and it is nowhere near a product-company Data Engineering interview-prep platform.**

What is genuinely good:
- Clean, dependency-free architecture (hash router, lazy modules, teaching factory) that is easy to extend.
- Honest labelling: nothing pretends to execute code; sources are real official docs; the Airbnb case study is cited.
- The thirteen "deep" lessons (CI vs CD, Git, GitHub, Branching, GitHub Actions, CLI/YAML/Deps, Testing Pyramid, pytest, SQL testing, Data Quality, Artifact Lifecycle, Deployment Strategies, Rollback) have real explanatory depth, and the code-vs-data rollback distinction is a strong interview message.
- Responsive enough on desktop/tablet, zero console errors, accessible colour for primary/secondary text.

What blocks the stated goal ("absolute beginner → cracking DE interviews at top product companies"):

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **Scope mismatch.** The curriculum is CI/CD only. There is no SQL, Python, PySpark/Spark, data modelling, warehousing, streaming, distributed systems or system-design teaching. The home page promises "PySpark, SQL, dbt, Airflow and Databricks code" but teaches none of the first three. | `js/data/curriculum.js` lessons list; `js/modules/home.js` hero copy | Critical |
| 2 | **Assessment is structurally broken.** All 47 knowledge checks have the correct answer in **position A**; 43 of 47 quiz questions have the correct answer in **position B**. Distractors are often absurd ("Skip the dbt test", "Delete the warehouse"). A learner can pass everything by pattern, which also makes every mastery stage and spaced-review signal meaningless. | measured over `js/modules/*.js` `ok:true` positions; `js/modules/quiz.js` `answer:` values | Critical |
| 3 | **Nothing is actually practised.** No lab accepts SQL, Python or Spark. Labs are YAML/config edits in a plain textarea graded by regex/keyword. The mastery challenge is a prompt with no answer key or input. The capstone is 14 self-marked checkboxes. | `js/data/labs.js`, `js/components/concept-module.js:606-615`, `js/modules/capstone.js` | Critical |
| 4 | **Interview prep covers a sliver of a real loop.** 81 Q&A cards + 47 MCQs, all CI/CD. No SQL rounds, no coding, no data-modelling, no pipeline/system-design, no behavioural, no mock mode, no self-rating, no timer. | `js/modules/interview.js` | Critical |
| 5 | **Visible rendering bug in the flagship lesson.** Knowledge-check options and feedback show literal `<code>` tags because labels are HTML-escaped twice. | screenshot; `js/components/concept-module.js` knowledge-check renderer; `github-actions.js:334-336` | High |
| 6 | **Phones cannot navigate.** Under 768px the sidebar is translated off-screen and no code ever adds the `open` class; under 1024px the top nav pills are hidden too. A phone user has search and in-content links only. | `css/layout.css:173-190`; only `classList.remove("open")` exists at `js/app.js:158` | High |
| 7 | **Two conflicting taxonomies.** The page header says "Tier 2 · Core CI/CD Concepts" while the lesson panel below it says "Level 0"; the sidebar is grouped by Tier, the Academy by Level 0–10. | screenshots of `#ci-vs-cd`, `#github-actions` | High |
| 8 | **Deep lessons are unreadable walls.** GitHub Actions is ~15,300px tall on desktop (30 `h2` sections) and ~23,800px on a phone, with no table of contents, no section jump links, no progress-in-lesson, and no "next lesson" link at the bottom. | measured; `main h2` count = 30 | High |
| 9 | **17 of 30 lessons are shallow** (one deep field or none): Airflow, dbt, Terraform, Docker, Databricks Bundles, Kubernetes, Helm, Argo CD, Secrets, Security, Observability, SonarQube, Azure DevOps, Jenkins, Container Registry. Several contain code that will not run as shown (details §3). | field count per module | High |
| 10 | **Nothing is retrieval-based.** "Retention check" is a reveal button; spaced review links back to the page rather than re-asking; knowledge checks reveal all answers on click. | `concept-module.js:487-495, 581-600` | High |
| 11 | **Muted text fails WCAG AA.** `--text-muted` `#5a6e8c` on the dark backgrounds is 3.4–3.8:1 (needs 4.5:1); it is used in 126 rules. | computed from `css/main.css` tokens | Medium |
| 12 | **Half a megabyte before the first lesson.** 467 KB over 32 requests on `#home`; 148 KB of CSS, and the 40 KB lab data + 22 KB lab engine load on every page although only `#labs` needs them. | measured; `index.html` script order | Medium |
| 13 | **No focus management on route change** (focus stays on `body`), no skip link, no `role=navigation`, no live region for lab/quiz feedback. | measured; `index.html` | Medium |
| 14 | **QA harness is not wired into CI.** `tools/qa-check.js` is never run by `.github/workflows/deploy.yml`; a broken route can deploy. | workflow has no `node tools/qa-check.js` step | Medium |

The remainder of this report expands each area, then gives a prioritised roadmap (§9) and a step-by-step implementation plan (§10).

---

## 1. Who this is for, and the honest gap

A beginner arriving with the goal in the brief needs, roughly in order:

1. **Foundations** — Linux/shell, Python (functions, data structures, files, testing), SQL (joins, grouping, window functions, CTEs, query plans).
2. **Data engineering core** — data modelling (3NF, star/snowflake, SCD types), batch vs streaming, ETL vs ELT, file formats (Parquet/Avro/ORC), partitioning, idempotency, backfills, data quality.
3. **Distributed processing** — Spark/PySpark (DataFrame API, lazy evaluation, shuffles, joins, skew, partitioning, caching, UDF cost), basics of Hadoop/MapReduce lineage.
4. **Orchestration & warehouses** — Airflow (DAGs, operators, sensors, idempotent tasks, backfill, XCom), dbt, a warehouse (BigQuery/Snowflake/Redshift/Databricks SQL) with cost/perf concepts.
5. **Streaming** — Kafka fundamentals, exactly-once, watermarks, late data.
6. **Cloud & platform** — one cloud's storage/compute/IAM, IaC, containers, CI/CD, observability.
7. **System design** — designing a pipeline end-to-end, trade-offs, scale numbers, failure handling.
8. **Interview craft** — SQL live-coding, Python/DSA-lite, data-modelling whiteboard, system design, behavioural (STAR), and mock practice under time.

The current product covers item 6 well and touches items 2 and 4 only through the CI/CD lens. On a generous reading it covers **15–20% of what a product-company DE loop tests**. This is the single most important fact in the audit: no amount of UI polish changes it.

---

## 2. First-run beginner walkthrough (what actually happens)

Observed on the live site, desktop then phone.

1. **Landing (`#home`).** Big hero, "Start learning" button, a ten-chip path (Git → GitHub → CI → Tests → Docker → Terraform → Databricks → Airflow/dbt → Production), then a two-button mode picker (Guided Academy / Reference Lab) with no explanation of what changes, then "Your learning dashboard" at 0%.
   - Confusion 1: the hero path chips (10 steps) do not match the Academy's 11 levels or the sidebar's Tier groups. Three mental models on one screen.
   - Confusion 2: the sidebar lists 46 links grouped by *Tier*; the Academy below groups by *Level*. The lesson "CI vs CD" is "Tier 2" in the sidebar and header, "Level 0" in the Academy.
   - Confusion 3: the two mode buttons are the primary UX decision and have one line of description each. A beginner does not know what "Reference Lab" is.
   - Missing: no "what should I already know?" screen, no placement check, no estimated total time, no explanation of how progress/mastery is earned.
2. **Click "Start learning" → `#ci-vs-cd`.** Good: objectives, prerequisites ("None"), sources. Then a 2,500-word page with ~12 sections. There is no table of contents, no reading-progress indicator, and the "Mark complete" button is at the *top* only. At the bottom there is a "Related" list but no "Next: Git →".
3. **Try a knowledge check.** Options show raw `<code>` tags. Clicking any option reveals feedback; clicking another option reveals that one too. The correct answer is always the first option.
4. **Finish lesson, go back to Home.** The Academy view shows the next lesson. This part works. But "Recommended next" in the dashboard (`Progress.recommended`, from the old RetailFlow path) and the Academy's `nextAction` (from the curriculum) are two different algorithms and can disagree.
5. **Open a lab.** A plain `<textarea>` with no line numbers, no syntax highlighting, no tab-key support. Feedback is text. On a phone the editor is usable but narrow.
6. **Open Interview.** A list of accordion cards: question → click → answer. No way to hide answers for self-testing, rate yourself, shuffle, or time yourself.
7. **Open Quiz.** 47 questions, fixed order, no topic selection, no review of only-wrong answers. The answer is B 91% of the time.
8. **On a phone.** The sidebar and top nav are both gone; only the search icon remains. A beginner cannot find the lesson list.

**Where a beginner struggles most:** jargon with no on-ramp (DAG, artifact, OIDC, digest, idempotent, grain, partition, Delta time-travel all appear before they are taught), no primers on Python/SQL/shell that later lessons assume, and lessons too long to know where you are.

---
## 3. Teaching content

### 3.1 Coverage: what exists vs what the goal needs

| Domain a product-company DE loop tests | Lessons today | Labs today | Interview Qs today | Gap |
|---|---|---|---|---|
| Linux/shell, environments, packaging | 1 (CLI/YAML/Deps) | 0 | 0 | Partial |
| Python for data (functions, collections, files, testing) | pytest only (assumes Python) | 0 | 0 | **Missing** |
| SQL (joins, grouping, window functions, CTEs, dedup, gaps/islands, performance) | SQL *testing* only | 1 regex-graded freshness snippet | 0 | **Missing** |
| Data modelling (3NF, star/snowflake, SCD types, grain, partitioning) | 0 | 0 | 0 | **Missing** |
| Pipeline fundamentals (ETL/ELT, idempotency, backfill, CDC, late data, file formats) | Touched inside rollback/data-quality | 0 | ~12 | Partial |
| Spark/PySpark and distributed processing (shuffle, skew, joins, memory, formats) | 0 (named in hero, Docker subtitle) | 0 | ~2 | **Missing** |
| Orchestration (Airflow DAG design, sensors, XCom, backfill semantics) | Airflow *CI/CD* only (shallow) | 1 (move a call out of module scope) | few | Weak |
| Warehouses (BigQuery/Snowflake/Databricks SQL: cost, clustering, caching) | Databricks Bundles (shallow) | 0 | 0 | **Missing** |
| Streaming (Kafka, exactly-once, watermarks) | 0 | 0 | 0 | **Missing** |
| Cloud + IaC + containers + CI/CD + observability | 20+ lessons | 10 | ~60 | **Strong** |
| System design for data pipelines | 0 dedicated | 0 | ~5 | Weak |
| Behavioural / incident storytelling | 0 | 0 | 0 | **Missing** |

The site's own hero copy ("take PySpark, SQL, dbt, Airflow and Databricks code safely to production") sets an expectation the content does not meet. A beginner reads that as "this teaches PySpark and SQL".

### 3.2 Depth is uneven: 13 deep, 17 shallow

Only thirteen modules use the deep-theory fields (knowledge checks, mastery, trace, annotated code, failures). The other seventeen (Airflow, dbt, Terraform, Docker, Databricks Bundles, Kubernetes, Helm, Argo CD, Secrets, Security, Observability, SonarQube, Azure DevOps, Jenkins, Container Registry, plus the two case-study tools) are ~130 lines each: Why/What/How cards, three depth tabs, a chip list, one failure story, one or two un-annotated code blocks, a reveal-button "retention check", four myths, a troubleshooting table and four interview Q&As. **No exercise a beginner can do; the only interaction is clicking tabs and "Reveal answer".**

Sampled correctness issues in the shallow set (verified against current tool docs):

| File:line | Problem | Why it matters to a beginner | Fix |
|---|---|---|---|
| `airflow-cicd.js:66-76` | `DagBag(include_examples=False)` with no `dag_folder`, no `AIRFLOW_HOME`, no `airflow db migrate` in the CI YAML. In a bare runner this loads an empty `~/airflow/dags`, so `import_errors == {}` passes trivially and the gate the lesson is built on never tests the repo's DAGs. | They will copy it, see green, and believe their DAGs are validated. | `DagBag(dag_folder="dags/", include_examples=False)` plus the env set-up, with one sentence on why. |
| `airflow-cicd.js:89-91` | Deploy step is `./deploy.sh retailflow-airflow:${{ github.sha }}`, an undefined script; the image is built but never pushed, contradicting the registry lesson. | Beginners cannot tell invented from real commands. | Use real commands (`docker push`, or a labelled pseudo-command). |
| `airflow-cicd.js` | No mention of Airflow 3 (2025): `schedule` vs `schedule_interval`, Task SDK; `catchup` referenced without stating the default or what `start_date` means. | Current docs will not match the lesson. | Add a version note and the two terms. |
| `terraform.js:66-73` | The only code block has no `required_providers` version pin, while objective 3 in `curriculum.js:280` is "pin provider versions". `terraform init/validate/fmt` never appear. | The lesson's one example violates its own objective; nothing shown is runnable. | Add the pin block and the three commands. |
| `terraform.js:124` | Teaches `terraform force-unlock` as a first troubleshooting step. | Unsafe default for a novice; can corrupt state mid-apply. | Lead with "check for a running apply / wait", mark force-unlock last resort. |
| `docker.js:66-82, 101` | `FROM python:3.11-slim` (tag) while the production tip says pin by `@sha256` digest. Subtitle calls it a "PySpark revenue processor" but the image installs no Java or Spark. | Copying it yields `JAVA_HOME` errors; the example contradicts the advice. | Pin by digest; drop "PySpark" or add the runtime. |
| `dbt-cicd.js:67-79, 93-98, 114` | `unique_key` without `incremental_strategy`, then the production note says to add `merge` as if it were missing; `relationships` test references `dim_customers`, a model never shown; `dbt_utils.accepted_range` needs `packages.yml`, never mentioned; uses `tests:` where dbt ≥1.8 docs say `data_tests:`. | Three things a beginner will hit the first time they run it. | Make the example self-consistent and current. |
| `rollback.js:77-81` | `run_revenue_pipeline.py --full-refresh-partition` and `soda scan -d warehouse …` are invented CLIs presented as runnable. | Same invented-vs-real problem. | Label as pseudo or replace with real ones. |
| Module-file `prerequisites` arrays are dead (`concept-module.js:110` suppresses them when curriculum metadata exists) and contradict the curriculum (`docker.js:93-98` vs `curriculum.js:293`). | Two sources disagree; the shown one is the curriculum's. | Delete the dead arrays or merge them. |

### 3.3 The "deep" lessons: real depth, weak assessment

- GitHub Actions, Rollback, Git, Testing Pyramid and the Level 0–2 set have genuine explanatory depth: mechanics, interactive architecture, trace, annotated YAML, comparisons, structured failures. Correctness is good. Some padding: SHA-pinning, fork secrets and OIDC are restated three times in `production`, `misconceptions` and `interview` (`github-actions.js:388-408`).
- **Knowledge checks are relabelled MCQs, not six cognitive levels.** Every item is a 3-option MCQ, and the correct option is **always first** (47 of 47). Distractors are implausible ("Because YAML forbids it", "Neither — disable the check", "Do nothing"). Elimination alone scores ~100%.
- **Options stay clickable after answering** (`concept-module.js:581-600`); only the first click is recorded, but the learner sees every `why`.
- **"Retention check" is a reveal button** (`concept-module.js:487-495`) despite the comment saying "retrieval, not recognition".
- **The mastery challenge is a prompt** rendered as static HTML (`concept-module.js:606-615`): no input, no answer key, no grading, no progress record. Indistinguishable from the hint box.
- **"Revisit the relevant topic" links to the page you are on** (`github-actions.js:337,343,349`: `revisit: "github-actions"`).
- `micro` chips are bare words ("ENTRYPOINT", "exposure", "data source") with no definition although the factory supports `{name, tip}` (`concept-module.js:367-368`) and no lesson uses it.

### 3.4 Curriculum and prerequisites

- **Assumed but never taught:** Python syntax (pytest lesson assumes `def`/`assert`), SQL joins and grain (the dbt failure story hinges on one-to-many fan-out), `kubectl` (appears in Level 5 Rollback; Kubernetes is Level 7), Spark, Jinja, HCL, Azure concepts (resource group, service principal), "warehouse", "partition", "Bronze/Gold", "Delta time-travel", "schema migration", DORA metrics.
- **Estimates** (`estMinutes` 15–30) overstate reading time for shallow lessons and understate deep ones by ~2× if the mastery challenge is attempted. The path sums to roughly 12–13 hours; a true beginner with practice needs 30–40.
- **Ordering:** `cli-yaml-deps` is Level 2 with no prerequisites, yet Git (Level 1) already assumes a shell. Terraform and Docker (Level 7) list only `github-actions` as a prerequisite.
- **The data-engineering lens** appended to each lesson is specific, not generic (names real artefacts), which is good, but it sits below ~20 sections and sometimes repeats the lesson's own story (`airflow-cicd.js:54-61` vs `data-engineering-lens.js:100-104`); `lens.js:33` says CI runs a Docker build that `github-actions.js:64-92` does not contain.

---

## 4. Practice, assessment and interview preparation

**Bottom line: every "pass" signal in the system can be obtained without demonstrating the skill**, and nothing resembles the SQL, Python, modelling, Spark or design rounds of a real loop.

### 4.1 Labs (11, all regex-graded)

Systemic:
- **"Show solution" marks the lab solved.** `lab.js:265-270` fills the editor with the reference and calls `runChecks()`, whose result path records `solved: true` (`lab.js:131-136`). One confirm dialog solves any lab.
- **Grading is substring/regex over the whole text**; comments are not stripped, so `# needs: test` passes.
- **Starters already satisfy most checks**, so labs collapse to one inserted line (dbt: `is_incremental`, `unique_key`, `max(` all present in the starter; guided step 1 passes on the untouched starter, `labs.js:507` vs `:538-540`).
- **Feedback is generic**: `why`/`revisit`/`robust` are rendered (`lab.js:125-127`) but only one lab populates them (`labs.js:681-685`). No check cites a line number.
- **Editor is a bare textarea**: no line numbers, highlighting, or Tab handling.
- **Guided mode is not stepwise**: all steps render at once over one editor, step 2 is not gated on step 1, and the final run ignores steps (`lab.js:157-164, 244-256`).

Per-lab, a wrong solution that passes and a correct one that fails (all verified in `js/data/labs.js`):

| Lab | Wrong but passes | Correct but fails |
|---|---|---|
| gate-the-test (`:71-87`) | `needs: testing`; a comment `# needs: test` | Block-list form `needs:\n  - test`; 4-space indentation |
| secret-exposure (`:128-145`) | `env: {T: ${{ secrets.X }}}` + `run: echo $T` (still leaks); `run: env`, `printenv`, `set -x` | A step that uses the secret correctly without `echo` fails "injected via env/with" |
| dockerfile-fix (`:183-199`) | `FROM python:3` (unpinned); `USER 0` (root) passes the `(?!root)` check; `USER appuser` without `useradd` | — |
| terraform-guard (`:236-250`) | `prevent_destroy = true` inside a comment | — |
| dbt-incremental (`:289-305`) | SQL comment `-- interval '3 days'`; `- interval '0 days'` | BigQuery `timestamp_sub(..., interval 3 day)` |
| airflow-import (`:353-371`) | Indent the top-level call by one space; `boto3.client()` or `pd.read_sql()` at module scope undetected | — |
| k8s-oom (`:430-444`) | Rename `requests:` to `limits:`; `memory: "1Mi"` (makes OOM worse); `# readinessProbe:` comment. **Raising memory, the actual fix, is never checked.** | `memory:` more than 200 chars after `limits:` |
| freshness-check (`:477-490`) | `select 1 -- current_timestamp - interval` | `where order_date >= current_date - interval '1 day'` fails twice (`>=` contains `= current_date`; `day` ≠ `hour`) |
| cache-deps-guided (`:493-563`) | `cache: pip` under the checkout step or in a comment | — |
| stale-revenue-incident (`:566-603`) | Typing the four keywords "backfill reprocess reconcile ingest" (or their negations) resolves the incident | A precise recovery plan in other words scores 0 |
| secure-deploy-challenge (`:672-688`) | Rename `cloud-key:` to `api-key:`; pin only `checkout`; `permissions: write-all` + a comment `# contents: read`. No check for an OIDC step although the lab's own commonMistakes warns about it | `contents: 'read'` (quoted) |

### 4.2 Quiz (47 MCQs)

- **43 of 47 correct answers are option B.** "Always press B" scores 91% and earns "Outstanding — deploy blindfolded" (`quiz.js:140`).
- About 40 of 47 are solvable by elimination without domain knowledge: distractors include "Delete the pipeline", "Skip the dbt test", "Email the CSV", "Random order", "You dislike automation".
- No shuffling of questions or options, no per-topic quiz, no retry-wrong-only, no per-question history (`Progress.recordQuiz` stores only best/attempts). The quiz feeds neither mastery nor spaced review and is excluded from the curriculum (`progress.js:77`).
- Explanations restate the correct option; they never say why the tempting wrong option is wrong.
- No answer is keyed incorrectly (all 47 checked).

### 4.3 Interview bank (81 questions)

- Beginner 21 / Intermediate 30 / Advanced 30; fields `a / why / mistake / retailflow / followup`.
- **Answer depth is one or two sentences** (median 153 characters). "Design a CI/CD strategy for 500 Airflow DAGs" gets the same treatment as "What is a commit?". No clarifying questions, no structure beats, no trade-off list, no numbers, no rubric of strong vs weak.
- Coverage of a real loop: SQL **0**, Python/coding **0**, data modelling **0**, Spark/distributed **~2**, pipeline/system design **~12**, behavioural **0**. The bank covers roughly **15–20%**, and that slice is normally one sub-topic of the system-design round.
- **No practice mode**: accordion reveal, search and level tabs only. No hide-answer self-test, self-rating, timer, shuffle, mock loop, or spaced repetition. The module makes **zero `Progress` calls**, so practising here leaves no trace.

### 4.4 Capstone (14 milestones)

- A self-marked checklist: "Mark milestone done" calls `Progress.toggleComplete("cap-N")` (`capstone.js:100-106`) with no check, no artefact, no ordering gate. All 14 can be ticked in 14 seconds.
- Because `masteryStage` treats a completed milestone as stage 5 "Integrate" for every lesson it lists (`progress.js:218-222`), those 14 clicks promote ~25 lessons to the top stage with no evidence.
- The setup block clones `github.com/retailflow/retailflow-data-platform` (`capstone.js:164`), which does not exist, so the "reproducible setup" cannot be reproduced.

### 4.5 Progress, mastery and spaced review

- Stage 2 "Implement" = one correct MCQ click; stage 3 "Apply" = the self-report "Mark complete" button; stage 4 "Diagnose" = two correct first-click MCQs (33% each by guessing, and the correct answer is always A); stage 5 = the capstone checkbox. **Labs, the only artefact-producing activity, are not read by `masteryStage` at all** (`progress.js:210-224`), although the home card says mastery is derived from labs (`home.js:201`).
- One miss locks a lesson out of stage 4 forever (`checksCorrect >= checksSeen` can never again be true), while reloading and re-answering the same question twice reaches stage 4 from one question.
- **Spaced review never resolves.** `scheduleReview(id, true)` has no callers; the only call is with `false` (`concept-module.js:597`). The home text "answering correctly pushes the next review further out" is false. The review card is a row of links back to the lesson; nothing re-asks. Items become due after one day and stay due forever.
- 17 lessons have no knowledge checks, so stages 2 and 4 are unreachable for them.

### 4.6 Simulators

- **Release & Rollback Simulator**: six scenarios with fixed `states[]` arrays; the decision is a 3-option MCQ whose only effect is button colour and consequence text (`release-sim.js:145-153`). Choices do not change the diagram, unlock anything, or persist. Linear reveal, not branching.
- **Failure Simulator**: ten 9-step string arrays with any stage clickable in any order; the featured incident's three decision points behave the same way. Mitigation/recovery/post-mortem are static lists filled on load.

---
## 5. Navigation and learning flow

| Gap | Why it matters | Fix | Ideal implementation |
|---|---|---|---|
| **No next/previous lesson on any concept page** (0 hits for a lesson-nav in `js/`); only the four case-study chapters have it (`js/components/evidence.js:127-141`). The "Related" chips at the bottom point to Level 3–5 topics from a Level 0 lesson. | A beginner who follows in-page links leaves the guided path after one lesson. The only route to lesson 2 is scroll-to-top → "View in learning path" → home → next card. | Render a footer nav on every `Concept.build` page. | Move `orderedLessons()` from `home.js` into `curriculum.js`; in `concept-module.js` after Related, render `<nav aria-label="Lesson navigation">` with "← Previous", "Lesson 4 of 32 · Level 1", and "Mark complete & continue →" which calls `Progress.setComplete(id,true)` then sets the hash. |
| **"Mark complete" only at the top of the page** (`js/components/module-actions.js:146-148`); passing knowledge checks does not complete a lesson. | Learners finish reading and see no way to finish the lesson; completion becomes a click-anywhere checkbox. | Add completion to the footer and derive "suggested complete" from checks passed. | Footer button; when all knowledge checks on the page are answered correctly on first try, auto-offer "Mark complete". |
| **Sidebar is static HTML grouped by ROI "Tier"** (`index.html:71-161`), with no status ticks, no locks, no current-level highlighting; the Academy and lesson-info use Level 0–10; the hero shows a 10-chip path. | Three competing mental models on the first screen. The learner cannot tell where they are. | One taxonomy, one generator. | Generate the sidebar from `Curriculum.levels + byLevel()` in `app.js`: `<details>` per level, only the current level open, ✓/◐/🔒 chips repainted via `Progress.on()`. Keep a small "Tools A–Z" group for reference mode. Delete `TIERS` in `home.js` and the Tier eyebrow strings in each module. |
| **No in-page table of contents, no section ids, no deep links** (`concept-module.js:53-62` creates sections without `id`). GitHub Actions page: 30 `h2`, ~15,300px tall. | Nobody can find "the failure modes section" again, share a link to it, or see how far through the lesson they are. | Section ids + sticky TOC + reading progress. | `s.id = cfg.id + '-' + slug(title)`; sticky `<nav class="cm-toc">` on ≥1100px, a `<details>` TOC at the top otherwise; router scrolls to `#route/section`. Thin reading-progress bar under the topbar. |
| **No onboarding or placement.** `dashboard()` renders unconditionally with three empty cards before the path (`home.js:364-370`). Modes are explained in one sub-label each (`home.js:111-112`). | First-run screen is empty-state noise plus an unexplained binary choice. Beginners who know Git cannot skip it. | Replace the first-run dashboard with a "Start here" card. | When `visited === 0`: one-sentence purpose, what Guided vs Reference means, a 5-question self-placement that marks known lessons complete so `nextAction()` skips them, and the estimated total hours. Hide mastery/review cards until they have data. |
| **Two "next" algorithms.** `Progress.recommended()` walks `RetailFlow.learningPath` (`progress.js:281-288`); `home.js nextAction()` walks the curriculum. `Progress.stats()` counts a different lesson list than `masterySummary()`. | "Recommended next" and the Academy's next step, or the % complete and the mastery bar, can disagree on the same screen. | Make `Curriculum` the only list. | Point `curriculum()` in `progress.js` at `Curriculum.lessonIds()`; delete `recommended()` or implement it as `nextAction()`. |
| **Depth tabs (Beginner/Intermediate/Proficient) swap topics, not depth** (e.g. `docker.js` tabs: lunchbox analogy / layers+tags / multi-stage+security). Interview-angle paragraphs are hidden under "Proficient". | A beginner who reads only their tab never sees the Dockerfile explained; the tab choice is not persisted or linked to the Academy level. | Make the tabs three passes over the same worked example. | Beginner: what each line does. Intermediate: why the order matters. Proficient: the hardened variant. Move "Interview angle" into the always-visible interview section. Persist the tab choice. |
| Keyboard shortcut `Space` is `preventDefault`-ed whenever an animation control bar exists (`js/core/keyboard.js`), and `t` toggles the theme globally. | Space-to-scroll breaks on every lesson with a flow animation; typing `t` into a focused `<summary>` flips the theme. | Scope shortcuts. | Only intercept Space when focus is inside the animation section; ignore single-letter shortcuts when the active element is not `body`. |

## 6. Accessibility

Measured against WCAG 2.2 AA.

| Issue | Evidence | Impact | Fix |
|---|---|---|---|
| **`aria-live="polite"` on the entire `<main>`** | `index.html:164` | Every route change, tab switch, knowledge-check click and lab run is read out in full by screen readers. The single worst defect. | Remove it. Add a visually-hidden `<div role="status">` that announces the page title after mount, and `role="status"` on small feedback nodes (`.cm-kc-fb`, `.lab-output`, `.inc-fb`, `.cm-arch-detail`). |
| **No focus management on route change**; focus stays on the sidebar link or `body` (measured). No skip link (0 hits). | `router.js:531-547`, `index.html` | Keyboard users tab through 6 pills + 3 buttons + 46 sidebar links before content, on every page. | `canvas.setAttribute('tabindex','-1'); canvas.focus({preventScroll:true})` after render; a skip link as the first child of `body`. |
| **Half-implemented tabs**: `role=tablist/tab` on depth tabs and the mode toggle but no `aria-selected`, `aria-controls`, `role=tabpanel`, no arrow keys. | `concept-module.js:331,348`; `home.js:106,110` | Screen readers announce a tab widget that does not behave like one. | A 30-line `NS.tabs(tablist, panels)` helper with roving tabindex and ArrowLeft/Right/Home/End, used by both. |
| **Knowledge-check options stay enabled after answering, no `aria-pressed`**; correctness is colour + emoji. | `concept-module.js:573-600` | Non-visual users get no state; sighted users can click all three. | Disable options after the first answer, set `aria-pressed` on the chosen one, keep the text ✅/❌ labels. |
| **Lab editor focus ring is invisible** (`outline:none`, 15%-alpha inset shadow). Textarea label is the generic "Editable code". "Reset" wipes work with no confirm. | `css/components.css:1706`, `lab.js:195` | Keyboard users cannot see where focus is; one mis-tap loses work. | `:focus-visible { outline: 2px solid var(--brand); outline-offset:-2px }`; label with the file name; confirm before reset. |
| **Contrast**: `--text-muted #5a6e8c` = 3.68:1 on `--bg-1`, 3.42:1 on `--bg-2` (needs 4.5:1), used in 126 rules at 11–13px. White on `--brand #3B82F6` (primary button, active tab) = 3.68:1. `--text-disabled` = 2.26:1. | `css/main.css` tokens, computed | Hints, estimates, sidebar labels and lab logs are hard to read for low-vision users and on cheap screens. | Dark `--text-muted` → `#7d8fae` (≈5.1:1). Primary button background → `#2563eb` (white = 5.2:1). Use `--text-disabled` only on disabled controls. |
| Modal dialogs (`#kbd-modal`, search) have no focus trap or focus restore; search listbox lacks `aria-activedescendant`. | `index.html:179`, `js/core/search.js` | Arrow-key highlighting is invisible to assistive tech. | Standard dialog pattern: focus first control on open, trap Tab, restore on close; set `aria-activedescendant` on the input. |
| `arch-diagram.js:274` hard-codes `aria-label="Airflow architecture diagram"` for every module's diagram. | | Mislabelled diagrams on 20+ pages. | Pass `opts.label`. |
| Meaning conveyed by `title` only (status chips, lock hints, micro chips). | `home.js:125,133`; `concept-module.js:369` | Unavailable on touch, inconsistently read by AT. | Visible text or `aria-label` + a tooltip component. |
| Touch targets: sidebar links ~32px, `.btn-sm` 4px vertical padding, level tabs 7px. | `layout.css`, `components.css` | Below the 44px guidance. | Raise padding; use a min-height on interactive rows. |
| Reduced-motion block declared twice with different values (`animations.css:781-791`, `components.css:2025-2027`). | | Harmless today, a maintenance trap. | Keep one. |

## 7. Performance and responsiveness

Measured on `#home`, cold load, local server:

| Metric | Value |
|---|---|
| Transfer before first lesson | 467 KB / 32 requests |
| `css/components.css` | 148 KB (2,526 lines, unminified) |
| Eager scripts | 20 `<script>` tags, ~262 KB, no `defer`, no minification |
| Eager-loaded but route-specific | `js/data/labs.js` 40 KB, `js/components/lab.js` 22 KB, `js/data/casestudy-airbnb.js` 17 KB |
| Route change to a deep lesson | ~420 ms (local; fine) |
| Console errors | 0 (one benign 404 for a monorepo-only `shared/backup-button.js`) |

Findings:
- **Load hygiene, not speed, is the problem.** Nothing is slow on broadband, but a phone on 3G waits for half a megabyte of mostly-unused CSS and lab data before seeing the home page. Add `defer` to all scripts, lazy-load `labs.js`/`lab.js`/`casestudy-airbnb.js` via the existing `loadScript` when their routes mount, and minify/concatenate CSS with a ten-line Node script that the deploy workflow runs.
- **Re-render strategy** is string concat + `innerHTML` for whole pages (`home.js:376,399`); acceptable at this size. `Concept.build` tracks and unsubscribes listeners correctly. No timer leaks found. `Progress.save()` serialises the whole state on every visit and every answer; small today, but debounce it.
- **Responsive:** eleven different breakpoints (1040, 1024, 960, 900, 860, 820, 768, 760, 720, 640, 560) with no tokens. **Phones have no navigation** (§5). Comparison tables (`.cm-cmp-table`) and the three-column troubleshooting grid (`.cm-trouble-row`) have no horizontal-scroll wrapper and squash at 360px. The lab editor's `white-space: pre` with no `overflow-x` lets long lines widen the layout. Lab page order on phones is hints → editor → results, so the learner scrolls past hints to type and past the editor to read results.
- **No offline support, no service worker.** For a static learning site this is cheap and valuable (commute study).

## 8. Technical quality and risk

- **Design is "content is trusted HTML".** Dozens of `innerHTML` sites interpolate authored data unescaped (`concept-module.js:84,122,136,219-221`, `glossary.js:81-83`, `master-map.js:206-208`, `lab.js:91,141,160,223`). Safe while all content is authored in-repo; becomes a vulnerability the day user- or URL-derived text reaches any of them. The not-found page (`router.js:135-137`) interpolates the hash id unescaped; **not exploitable as tested** (the browser keeps the hash percent-encoded and the router never decodes it) but should be escaped on principle.
- **13 copies of `esc()`** across `js/` with two behaviours (`lesson.js` escapes `"`, most do not), and some are used inside `title="…"` attributes (`concept-module.js:369`). One `NS.util.esc` that escapes `& < > " '`.
- **Double escaping bug**: knowledge-check option labels and `why` text are authored as HTML (`github-actions.js:334-336`) but rendered through `esc()`, so the page shows literal `<code>` tags. Either author plain text or render raw; pick one and lint it.
- **Five sources of lesson truth**: `ROUTES` (`app.js`), `TIERS` (`home.js`), `Curriculum` (`curriculum.js`), hand-written sidebar (`index.html`), `Concepts.tools` (`cicd-concepts.js`), plus `RetailFlow.learningPath` for stats. Module-file `prerequisites` arrays are dead (suppressed at `concept-module.js:110` when curriculum metadata exists) yet still maintained and now contradict the curriculum (`docker.js:93-98` lists `container-registry` as a prerequisite of Docker; `curriculum.js:293` makes Docker a prerequisite of Container Registry).
- **Content has no version.** `Progress` has a schema version but bookmarks/completions key on route ids (`progress.js:133`); renaming a route silently orphans progress. Add a `contentVersion` and a rename map.
- **QA harness not in CI.** `.github/workflows/deploy.yml` never runs `node tools/qa-check.js`; a dangling prerequisite or missing module file deploys. There is no lint, no unit test for `LabValidators`, `lineDiff`, `AnimationEngine`, or `Progress.migrate`, no CSP, no `window.onerror` fallback (a throwing `render()` leaves a half-built page with only a console message, `router.js:538`).
- **CSS**: `.gloss-item`, `.topic-card`, `.inc-opt`, `.cm-trouble-head`, `.cm-mis-myth` each defined twice (later block overrides earlier); light-theme tokens duplicated verbatim (`main.css:188-215` vs `217-242`); legacy `--airflow*` token names admitted in a comment. Split `components.css` by feature and concatenate at build.
- Global shortcuts bound at document level (`app.js`, `keyboard.js`) without checking the active element.
## 9. Prioritised enhancement roadmap

Guiding principle: **fix credibility first, then make practice real, then widen the curriculum.** Adding content on top of a broken assessment layer multiplies the problem. Everything below stays within static HTML/CSS/vanilla JS hosted on GitHub Pages; the only new dependencies proposed are three well-known browser libraries, each loaded lazily on the route that needs it.

### Technology additions (only where they buy a lot)

| Library | Size | Why it is worth it | Where it loads |
|---|---|---|---|
| **sql.js** (SQLite compiled to WebAssembly) | ~1.2 MB, lazy | Real SQL execution in the browser against seeded RetailFlow tables; graded by comparing result sets. Turns SQL from 0% to real practice with no backend. | `#sql-lab/*`, `#interview` SQL round |
| **js-yaml** | ~40 KB | Parse YAML labs structurally instead of regex, so `jobs.deploy.needs` is checked as data. Kills most of the gaming table in §4.1. | `#labs/*` |
| **CodeMirror 6** (core + yaml/sql/python/dockerfile modes) | ~300 KB, lazy | Line numbers, highlighting, Tab handling, line-anchored error markers. | `#labs/*`, `#sql-lab/*` |
| Pyodide (Python in WebAssembly) | 10–20 MB first load | Optional, phase 4 only. Enables real pytest-style Python/pandas grading. Spark itself cannot run in a browser; frame as "pandas stand-in for the DataFrame logic". | `#py-lab/*` only, behind a "Download Python runtime (one-time)" button and a service-worker cache |
| Service worker | 0 | Offline study, caches the above. | global |

Nothing else: no framework, no backend, no database, no accounts.

### Phase 0 — Immediate fixes (credibility and blockers; ~1 week)

| # | Fix | Files | Effort |
|---|---|---|---|
| 0.1 | Shuffle knowledge-check and quiz option order at render time; shuffle quiz question order. Removes the A/B answer-position bias with zero content edits. | `concept-module.js`, `quiz.js` | 2 h |
| 0.2 | Fix the double-escaped `<code>` in knowledge-check options/feedback (render labels as authored HTML, or author plain text and lint it). | `concept-module.js`, 13 modules | 2 h |
| 0.3 | Mobile navigation: add a hamburger button with `aria-controls/aria-expanded`, toggle `.open`, backdrop, close on Escape and route change. | `index.html`, `app.js`, `layout.css` | 3 h |
| 0.4 | Lock options after the first answer, set `aria-pressed`; fix `revisit` targets so they never point at the current page. | `concept-module.js`, modules | 2 h |
| 0.5 | "Show solution" and "Compare with reference" must not record a solve (`_revealed` flag; skip `recordLabEvidence`). | `lab.js` | 1 h |
| 0.6 | Call `scheduleReview(id, true)` on a correct answer; make competency track latest-per-question, not cumulative first clicks. | `concept-module.js`, `progress.js` | 3 h |
| 0.7 | Include lab solves in `masteryStage`; require a solved lab for stage 3; stop capstone checkboxes granting stage 5 without evidence (see 2.6). | `progress.js` | 2 h |
| 0.8 | One taxonomy: remove "Tier" eyebrows and `TIERS`; generate the sidebar from the curriculum with status chips; retire the hero's 10-chip path or derive it from Level names. | `home.js`, `app.js`, `index.html`, every module eyebrow | 1 day |
| 0.9 | Prev/next lesson footer with "Mark complete & continue" and "Lesson N of M · Level L". | `concept-module.js`, `curriculum.js` | 3 h |
| 0.10 | Remove `aria-live` from `<main>`; focus the canvas after route change; add a skip link; `role="status"` on feedback nodes. | `index.html`, `router.js`, components | 3 h |
| 0.11 | Contrast tokens (`--text-muted`, primary button bg); visible focus ring on the lab editor; confirm before lab Reset. | `main.css`, `components.css`, `lab.js` | 1 h |
| 0.12 | Run `node tools/qa-check.js` in `deploy.yml` before upload; add a check that every knowledge check has ≥2 plausible distractors (length heuristic) and correct-position entropy. | `.github/workflows/deploy.yml`, `tools/qa-check.js` | 2 h |
| 0.13 | Correct the known-wrong examples: Airflow `DagBag(dag_folder=…)` + env set-up, Terraform provider pin + `force-unlock` demotion, Docker digest pin + remove "PySpark" claim, dbt example consistency, replace invented CLIs with real or labelled pseudo-commands, fix the fictitious capstone repo. | 5 modules, `capstone.js` | 1 day |
| 0.14 | Fix the hero copy to say what the site actually teaches until §Phase 3 lands. | `home.js` | 10 min |

### Phase 1 — Make assessment honest and practice real (~2–3 weeks)

| # | Improvement | What ideal looks like |
|---|---|---|
| 1.1 | **Rewrite distractors** across the 47 knowledge checks and 47 quiz items into plausible misconceptions, each with its own `why`. Replace Apply/Troubleshoot/Decide items with "predict the output", "order these steps", "pick the fix and justify" formats, or drop the six-level labels. | A learner who does not know the content scores ~33%, not ~100%. |
| 1.2 | **Quiz engine v2**: per-topic quizzes generated from lesson knowledge checks + the bank, retry-wrong-only, per-question history in `Progress`, quiz results feed mastery and spaced review. | "Quiz me on Level 3" and "retry my 6 misses" buttons on the dashboard. |
| 1.3 | **Structural lab validators**: parse YAML with js-yaml and check data (`jobs.deploy.needs ∈ [test]`, `permissions` object, every `uses:` pinned to a 40-hex SHA, an OIDC login step with no `secrets.*`); strip comments before any regex; for k8s-oom assert memory was raised and limits ≥ requests; for freshness accept any dialect-correct relative predicate. Every check gets `why`, `robust`, `revisit` and a line number. | The gaming table in §4.1 becomes empty. |
| 1.4 | **Real guided mode**: one step visible at a time, step N+1 unlocks on N, final run is the sum of steps. | A beginner is walked, not dropped into a full file. |
| 1.5 | **CodeMirror editor** with line numbers, highlighting, Tab→2 spaces, and error gutter markers from 1.3. | The editing experience stops being a textarea. |
| 1.6 | **Retrieval, not recognition**: replace the "Reveal answer" retention check with a typed free-recall prompt graded by a small rubric (keyword groups with synonyms) and a self-grade step; make the mastery challenge accept an answer (text or YAML), show a model answer after submission, and record a self-scored rubric to `Progress`. | Mastery stages mean something. |
| 1.7 | **Spaced review that re-asks**: a "Review due" screen that re-presents the missed knowledge check or quiz item (SM-2: ease 2.5, intervals 1/6/×ease), promotes on success, and includes glossary terms as flashcards. | The review card stops being a list of links. |
| 1.8 | **Capstone gating**: milestone N+1 locked until N; each milestone needs a passing in-browser check (paste your workflow YAML into the milestone-4 validator; paste a PR URL matching `^https://github.com/.+/pull/\d+$`; SQL assertion via sql.js) before "Mark done". Replace the fictitious repo with a real public template. | 14 clicks no longer equal "Integrate". |
| 1.9 | **Branching simulators**: a wrong recovery choice changes the stage diagram (e.g. "disable the DQ gate" turns Serve red) and is recorded; the failure simulator enforces stage order and scores the decision points. | Choices matter. |
| 1.10 | **Onboarding and placement**: first-run "Start here" card, mode explanation, 5-question self-placement that marks known lessons complete, total-hours estimate; hide empty dashboard cards. | A beginner knows where they are in under a minute. |
| 1.11 | **Long-lesson ergonomics**: section ids, sticky TOC, reading-progress bar, deep links, "Mark complete" in the footer, lesson numbering. | A 15,000-pixel lesson becomes navigable. |
| 1.12 | **Depth tabs as three passes over one example**; move "Interview angle" out of the Proficient tab; tooltips on every `micro` chip. | Beginners see the whole worked example. |

### Phase 2 — Interview preparation that matches a real loop (~3–4 weeks)

| # | Improvement | What ideal looks like |
|---|---|---|
| 2.1 | **Interview bank v2 schema**: every question gets `round` (sql / coding / modelling / spark / design / behavioural / cicd), `clarify[]` (questions to ask first), `structure[]` (the 3–5 beats a strong answer hits), `tradeoffs[]`, `numbers` (e.g. "lookback = p99 late-arrival ≈ 3 days"), `redFlags[]`, `followups[]`, and a worked model answer of 150–300 words for design questions. | Answers become rubrics, not one-liners. |
| 2.2 | **Add ~90 questions** across the missing rounds: SQL 20, Python/coding 15, data modelling 15, Spark/distributed 15, pipeline/system design 15, behavioural/incident 10. Keep CI/CD at ~40. | Coverage rises from ~15% to ~65–70% of a loop. |
| 2.3 | **Mock-interview mode**: choose rounds and level → N random questions, countdown per question (2–4 min), answer hidden, learner types bullet notes, then reveals the rubric and self-scores each structure beat 0/1/2. Results persist and the dashboard shows weak rounds. | A 45-minute mock loop, offline, with a score history. |
| 2.4 | **SQL practice lab** on sql.js: seeded `orders`, `refunds`, `payments`, `customers` from `retailflow-data.js`; 20–25 graded problems (dedup with `row_number`, SCD2 current row, gaps and islands, running totals, reconciliation, late-arriving data, top-N per group) with result-set comparison, hints, and an explain-plan discussion. | Real SQL execution and grading in the browser. |
| 2.5 | **System-design lesson + whiteboard templates**: a canonical pipeline-design framework (requirements → volume/latency numbers → ingestion → storage/format/partitioning → processing → serving → quality → ops), three worked designs (daily revenue batch, CDC to warehouse, click-stream near-real-time), and a scored design-answer checklist. | The round product companies weight most heavily gets a method. |
| 2.6 | **Flashcard deck** (glossary + bank + knowledge checks) with SM-2, due-count on the dashboard. | Five-minute daily revision. |

### Phase 3 — Curriculum breadth for the stated goal (~6–10 weeks of content work)

New levels or tracks, each at the existing golden-template depth with knowledge checks, a lab and interview questions:

1. **Python for Data** (functions, collections, comprehensions, files/CSV/JSON, exceptions, virtualenv, pytest basics, pandas essentials).
2. **SQL from zero to windows** (select/filter/group → joins and fan-out → CTEs → window functions → dedup/SCD/gaps → query plans and indexes/partitions).
3. **Data modelling** (3NF, star/snowflake, grain, SCD 0–6, surrogate keys, partition and clustering strategy, data vault overview).
4. **Pipeline fundamentals** (ETL vs ELT, idempotency, backfill and reprocessing, CDC, late data and watermarks, Parquet/Avro/ORC, compression, small-files problem).
5. **Spark/PySpark** (driver/executor, lazy evaluation, DataFrame API, shuffles, joins incl. broadcast, skew and salting, partitioning and caching, UDF cost, file layout; conceptual labs with "predict the plan" exercises; optional Pyodide/pandas stand-in).
6. **Airflow as orchestration** (DAG design, operators/sensors/hooks, idempotent tasks, scheduling semantics, backfill, XCom limits, SLAs; Airflow 3 notes).
7. **Warehouses and lakehouse** (BigQuery/Snowflake/Databricks SQL cost and performance model, clustering, caching, Delta/Iceberg table formats, time travel).
8. **Streaming** (Kafka topics/partitions/consumer groups, delivery semantics, exactly-once, stream-table duality, windowing).
9. **Observability and SLAs for data** (freshness/volume/schema/distribution monitors, lineage, incident playbooks) deepened from the existing shallow lesson.
10. **Behavioural and ownership** (STAR stories for incidents, disagreements, trade-offs; a story bank template).

Plus: deepen the 17 shallow CI/CD lessons with the existing factory fields (highest-value backlog already identified by the project's own report).

### Phase 4 — Advanced (optional)

- Pyodide-backed Python labs with pytest-style grading, lazily loaded and service-worker cached.
- Export/import of progress as a file and an optional "study plan" generator (hours/week → dated schedule).
- Offline support via service worker; `defer`/minify/split CSS build step run by the deploy workflow.
- Content versioning (`contentVersion` + route rename map) so saved progress survives renames.

---

## 10. Step-by-step implementation plan

Each step is one deployable iteration, additive, verified by `node tools/qa-check.js` plus a Playwright smoke run before merge. Order is by dependency and impact.

| Step | Scope | Done when |
|---|---|---|
| 1 | Phase 0 items 0.1, 0.2, 0.4, 0.5, 0.6, 0.7 (assessment honesty) | Correct-answer position is uniformly distributed at render; literal `<code>` gone; a revealed solution does not record a solve; `scheduleReview(…, true)` has a caller; labs count toward mastery. |
| 2 | Phase 0 items 0.3, 0.10, 0.11 (mobile nav, focus, contrast) | Playwright at 375px can open the sidebar and reach every lesson; axe-style checks show no `aria-live` on main; muted text ≥4.5:1. |
| 3 | Phase 0 items 0.8, 0.9, 0.14 + Phase 1 item 1.11 (one taxonomy, lesson nav, TOC) | Sidebar generated from the curriculum; every lesson has prev/next and a TOC; no "Tier" string remains in modules. |
| 4 | Phase 0 items 0.12, 0.13 (CI gate, content corrections) | `deploy.yml` fails on QA failure; the nine listed code corrections merged with sources noted. |
| 5 | Phase 1 items 1.1, 1.2 (distractor rewrite, quiz v2) | Every MCQ has three plausible options with per-option `why`; per-topic and retry-wrong quizzes exist; quiz results feed mastery. |
| 6 | Phase 1 items 1.3, 1.4, 1.5 (structural validators, real guided mode, CodeMirror) | The §4.1 gaming table has no passing wrong answers; guided labs gate steps; editor has line numbers and gutter errors. |
| 7 | Phase 1 items 1.6, 1.7 (retrieval checks, SM-2 review) | Retention and mastery accept typed answers; a review screen re-asks and promotes; due items resolve. |
| 8 | Phase 1 items 1.8, 1.9, 1.10 (capstone gating, branching sims, onboarding) | Milestones require a check; sims change state on choice; first-run shows Start-here and placement. |
| 9 | Phase 2 items 2.1, 2.2 (bank v2 schema + 90 new questions) | Every question carries a rubric; round counts match §9 targets; QA checks the schema. |
| 10 | Phase 2 item 2.3 (mock-interview mode) | A timed mock loop persists scores and the dashboard shows weak rounds. |
| 11 | Phase 2 item 2.4 (sql.js SQL lab) | 20+ graded SQL problems run in-browser; results compared order-insensitively; sql.js loads only on that route. |
| 12 | Phase 2 items 2.5, 2.6 (system-design method, flashcards) | Three worked designs with a scored checklist; flashcard deck with daily due count. |
| 13–20 | Phase 3 tracks, one per iteration, each at golden depth with a lab and interview questions | Each track has ≥6 lessons, ≥1 graded lab, ≥10 rubric questions; prerequisites wired; QA green. |
| 21+ | Phase 4 | As needed. |

### What to measure after each step

- **Guessability**: average score of a "no-knowledge" bot (always first option / always B / random) on checks and quizzes should be ≈ chance.
- **Lab gaming**: the §4.1 wrong-answer list run as a test fixture must fail.
- **Beginner path integrity**: Playwright script that starts at `#home`, follows only in-page "Next" links, and reaches the last Level 2 lesson without visiting `#home` again.
- **Mobile reachability**: every route reachable at 375px via UI, not URL.
- **Accessibility**: no `aria-live` on `main`, focus lands in content after navigation, all text ≥4.5:1, every tab widget keyboard-operable.
- **Payload**: `#home` under 250 KB; lab/SQL libraries absent from the home waterfall.
- **Interview coverage**: questions per round against the §9 targets, tracked by `qa-check.js`.

---

## Appendix A — Measurements

| Item | Value |
|---|---|
| Source size | ~16,800 lines across 60 files; `css/components.css` 2,526 lines |
| Routes | 41 ready; 40 render with a heading, 0 empty |
| Lessons in curriculum | ~30 across 11 levels; 13 with deep fields, 17 shallow |
| Knowledge checks | 47, correct option in position A: 47/47 |
| Quiz | 47 MCQs, correct option B: 43/47; no shuffling |
| Interview bank | 81 (21/30/30); median answer 153 chars; 0 SQL/Python/modelling/behavioural |
| Labs | 11, all regex/keyword graded; 0 SQL-logic, Python-logic or Spark labs |
| Capstone | 14 self-marked milestones; clones a non-existent repo |
| `#home` payload | 467 KB, 32 requests; CSS 172 KB |
| Deep lesson height | GitHub Actions: 15,291 px desktop, 23,810 px phone, 30 `h2`, no TOC |
| Contrast | `--text-muted` 3.42–3.83:1 (fail); `--text-secondary` 6.3–7.0:1 (pass); white on `--brand` 3.68:1 (fail) |
| Console errors | 0 (one benign external 404) |
| QA harness in CI | No |

## Appendix B — What is good and should be kept

- The teaching factory and lazy router: adding a lesson is a data file.
- Honest execution labelling and real, dated official-doc sources.
- The Airbnb evidence-tiered case study and the code-vs-data rollback framing.
- The 13 deep lessons' explanatory quality (problem-first, intuition with "where the analogy breaks", trace, failure modes).
- Zero runtime errors, clean parse, acyclic prerequisite graph, and a QA harness that just needs wiring into CI.

*End of audit.*
