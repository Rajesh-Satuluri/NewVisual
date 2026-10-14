# Real-World Case Study — Final Implementation Report

This report documents the evidence-based case study added to the Data
Engineering CI/CD Visualizer's four "Real-World Scenario" sections. It
follows the acceptance structure requested in the enhancement prompt.

---

## 1. Selected company and business case

**Company:** Airbnb — a global two-sided travel marketplace (hosts list
stays/experiences; guests book them).

**Business case:** making data **trustworthy** and metrics **consistent**
at scale. Airbnb has publicly documented (a) a company-wide **Data
Quality initiative** that rebuilt its warehouse and launched the **Midas**
certification program, and (b) the **Minerva** metrics platform that
defines metrics once and serves them everywhere. The core stake is a
**data-correctness** problem: before these systems, the same business
question could get different answers from different teams.

## 2. Why it was selected

- **Curriculum fit:** Apache **Airflow was created at Airbnb** — a tool
  this platform already teaches — so the case study ties directly back
  into the existing modules.
- **Evidence quality:** Airbnb has an unusually detailed, multi-part
  public record (engineering blog posts) covering exactly the
  correctness/consistency problem the four sections exist to teach.
- **Right kind of problem:** the documented pain is *silently-wrong data*,
  not just pipeline downtime — which is the distinction (job-green ≠
  data-correct; deploy-code ≠ run-pipeline; code-rollback ≠ data-repair)
  the four chapters are built around.

## 3. Sources used

Primary-source URLs are verified to exist and are linked in-app (the
References panel on Chapter 1) and in `js/data/casestudy-airbnb.js`.

**Primary (company engineering blog / project docs):**
- Airflow: a workflow management platform — M. Beauchemin, Airbnb
  Engineering, 2015-06-02.
- Apache Airflow — Project history, The Apache Software Foundation.
- How Airbnb Achieved Metric Consistency at Scale (Minerva, Part 1) —
  Airbnb Engineering.
- How Airbnb Standardized Metric Computation at Scale (Minerva, Part 2) —
  Airbnb Engineering.
- How Airbnb Enables Consistent Data Consumption at Scale (Minerva
  serving layer) — Airbnb Engineering.
- Data Quality at Airbnb, Part 1 — Rebuilding at Scale — Airbnb
  Engineering.
- Data Quality at Airbnb, Part 2 — A New Gold Standard (Midas) — Airbnb
  Engineering.
- Data Quality Score: The Next Chapter of Data Quality at Airbnb — Airbnb
  Engineering.

**Secondary (flagged in-app; used only where noted, rendered as
"reported by"):**
- The Analytics Engineering Roundup — "Robert Chang on Scaling Metrics @
  Airbnb" (dbt Labs). Minerva scale figures appear only here.

**Research limitation (disclosed in-app):** full primary-post text could
not be fetched from the build environment (the outbound proxy blocks
`medium.com`). Claims were extracted from search over the primary posts
and the Apache Airflow project history. No source URL is fabricated;
secondary-only figures are tagged and shown as "reported by".

## 4. The four sections enhanced

| Chapter | Route | Title |
|---|---|---|
| 1 | `business-scenario` | Business Problem, Context & Impact |
| 2 | `end-to-end-pipeline` | Architecture & Technical Design |
| 3 | `environment-promotion` | A Code Change Travels to Production |
| 4 | `failure-simulator` | Incident Response, Recovery & Lessons |

All existing content in these modules was **preserved** (the RetailFlow
animation, the clickable node map, the full Environment-Promotion concept
lesson, and the 10-scenario failure library) and the case-study material
was layered on top, with the fictional RetailFlow clearly relabelled as a
practice sandbox.

## 5. New theoretical depth (summary)

- **Chapter 1:** the documented business problem (data trust, metric
  inconsistency), why a wrong number is a business-correctness incident,
  and why CI/CD (enforced correctness + post-run verification) matters.
- **Chapter 2:** data-flow vs. control-flow; deploy-code vs. run-pipeline;
  Airflow's architecture and Minerva's define-once/serve-everywhere model;
  a technology→module map distinguishing documented tools from reference
  choices.
- **Chapter 3:** a 10-step change walkthrough (identify → source control →
  automated validation → build/artifact → infra/config → promotion →
  prod deploy → runtime execution → production verification →
  traceability) with a code/config explorer.
- **Chapter 4:** staged incident investigation, decision points, immediate
  mitigation, separated **code recovery vs. data recovery**, verification,
  a prevention→"what it catches" grid, and a post-incident review.

## 6. Code and configuration examples added

A single consistent reference implementation threads through Chapter 3
(repo `retailflow-data-platform`, branch `feature/fix-net-revenue`, PR
#482, image `revenue-processor:sha-9f3c1`): a PySpark transform, a pytest
test, `ci.yml`, a pinned non-root `Dockerfile`, Terraform for the
warehouse, per-env config, an idempotent Airflow write, and
`verify_revenue.sql`. Chapter 4 adds an idempotent `overwrite …
replaceWhere` recovery pattern. Every example is labelled **Reference
implementation** or **Pseudocode** — none is presented as Airbnb's
internal configuration.

## 7. Existing modules connected to the case study

Via the Chapter-2 technology→module map and inline links: `airflow-cicd`,
`dbt-cicd`, `data-quality`, `github`, `github-actions`, `pytest`,
`sql-testing`, `docker`, `container-registry`, `terraform`,
`databricks-bundles`, `observability` — plus the preserved
Environment-Promotion lesson's own `related` links.

## 8. Documented facts vs. reference implementation

Enforced in code by the evidence layer (`js/components/evidence.js` +
`js/data/casestudy-airbnb.js`): every rendered claim carries one of four
tiers — **Documented fact** (cited), **Engineering interpretation**,
**Reference implementation**, or **Pseudocode**. A test asserts every
`fact` claim carries at least one source; secondary sources render as
"reported by". Airbnb's documented systems (Airflow, Minerva, Midas/Data
Quality) are stated as facts with citations; the end-to-end pipeline, the
10-step workflow, and the featured incident are labelled reference
implementations / example — explicitly **not** claims about Airbnb's
private internals or a historical Airbnb outage.

## 9. Tests actually executed

- `node --check` on every new/changed JS file (all pass).
- A stubbed-DOM logic harness on the evidence layer: 9 sources, 19+
  citations resolve, **every `fact` claim carries a source**, secondary
  sources render "reported by", no `eval`/`Function` present.
- Playwright (pre-installed Chromium) regression on all four sections:
  chapter-nav active state + progress markers, evidence claims render,
  Chapter-3 stepper switches and renders per-step code blocks, Chapter-4
  progressive clue reveal + root-cause gating + decision consequences,
  learning checks mark correct/incorrect, the preserved RetailFlow
  animation / node map / concept lesson / 10-scenario library all still
  work, and all chapter/tech-map links resolve to real routes.
- Console: no new errors. The only 404 is the pre-existing monorepo
  reference `../shared/backup-button.js`, which resolves only in the full
  monorepo and is not a regression.

## 10. Known limitations and remaining work

- Primary Medium posts could not be fetched as full text from the build
  environment (proxy-blocked); claims rest on search extraction over those
  verified-to-exist primary URLs plus Apache docs. A reader with network
  access can confirm each via the linked References panel.
- Minerva scale figures are secondary-sourced and intentionally shown as
  "reported by" rather than as verified Airbnb figures.
- The featured incident (Chapter 4) is a labelled, realistic *example* on
  the reference architecture — not a historical Airbnb incident.
- Dates for some Airbnb posts are approximate (year-level) where the exact
  publication date was not confirmed from a primary fetch.
