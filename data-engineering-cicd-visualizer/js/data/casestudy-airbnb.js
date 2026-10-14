/* ============================================================
   casestudy-airbnb.js — the evidence spine for the real-world
   case study (prompt §3–§5). Single source of truth for:
     • the company and why it was chosen,
     • a registry of research sources (primary + secondary),
     • claims, each tagged as one of four evidence tiers and
       linked to the source(s) that support it.

   INTEGRITY CONTRACT (prompt §3.3, §10):
     Every statement the UI renders from this file is tagged with
     exactly one tier:
       fact           — documented in a credible source (cite it)
       interpretation — a reasonable conclusion from the facts
       reference      — a proposed reference implementation; NOT a
                        claim about Airbnb's undisclosed internals
       pseudocode     — illustrative only, not executable

     Scale figures that appear ONLY in secondary coverage are
     flagged (source.verified=false) and must be rendered as
     "reported by" rather than stated as Airbnb's own figure.

   RESEARCH LIMITATION (recorded honestly):
     Full primary-post text could not be fetched from this
     environment (the outbound proxy blocks medium.com). Claims
     below were extracted from search over the primary Airbnb
     Engineering posts (URLs verified to exist) plus the Apache
     Airflow project history. Where only secondary coverage
     carried a detail, it is tagged secondary and labelled in the
     UI. No source URL here is fabricated.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // Evidence tiers — the four labels every rendered claim must carry.
  var TIERS = {
    fact:           { key: "fact",           label: "Documented fact",          cls: "ev-fact",    icon: "📄", blurb: "Stated in a credible source (cited)." },
    interpretation: { key: "interpretation", label: "Engineering interpretation", cls: "ev-interp",  icon: "🧠", blurb: "A reasonable conclusion drawn from the documented facts." },
    reference:      { key: "reference",      label: "Reference implementation", cls: "ev-ref",     icon: "🧩", blurb: "A proposed example of how the concepts could be applied — not a claim about Airbnb's internal implementation." },
    pseudocode:     { key: "pseudocode",     label: "Pseudocode",               cls: "ev-pseudo",  icon: "✎", blurb: "Illustrative only — not executable code." }
  };

  // ── Source registry ──────────────────────────────────────
  // verified:true  → a primary source (company blog / project docs)
  // verified:false → secondary coverage; figures from these are
  //                  rendered as "reported by", never as fact.
  var SOURCES = [
    {
      id: "airflow-blog",
      kind: "primary",
      type: "Company engineering blog",
      title: "Airflow: a workflow management platform",
      author: "Maxime Beauchemin",
      publisher: "Airbnb Engineering (Medium)",
      date: "2015-06-02",
      url: "https://medium.com/airbnb-engineering/airflow-a-workflow-management-platform-46318b977fd8",
      verified: true
    },
    {
      id: "airflow-apache",
      kind: "primary",
      type: "Open-source project documentation",
      title: "Apache Airflow — Project history",
      author: "Apache Airflow project",
      publisher: "The Apache Software Foundation",
      date: "2019",
      url: "https://airflow.apache.org/docs/apache-airflow/1.10.2/project.html",
      verified: true
    },
    {
      id: "minerva-1",
      kind: "primary",
      type: "Company engineering blog",
      title: "How Airbnb Achieved Metric Consistency at Scale (Minerva, Part 1)",
      author: "Airbnb Engineering",
      publisher: "Airbnb Engineering (Medium)",
      date: "2021",
      url: "https://medium.com/airbnb-engineering/how-airbnb-achieved-metric-consistency-at-scale-f23cc53dea70",
      verified: true
    },
    {
      id: "minerva-2",
      kind: "primary",
      type: "Company engineering blog",
      title: "How Airbnb Standardized Metric Computation at Scale (Minerva, Part 2)",
      author: "Airbnb Engineering",
      publisher: "Airbnb Engineering (Medium)",
      date: "2021",
      url: "https://medium.com/airbnb-engineering/airbnb-metric-computation-with-minerva-part-2-9afe6695b486",
      verified: true
    },
    {
      id: "minerva-api",
      kind: "primary",
      type: "Company engineering blog",
      title: "How Airbnb Enables Consistent Data Consumption at Scale (Minerva serving layer)",
      author: "Airbnb Engineering",
      publisher: "Airbnb Engineering (Medium)",
      date: "2021",
      url: "https://medium.com/airbnb-engineering/how-airbnb-enables-consistent-data-consumption-at-scale-1c0b6a8b9206",
      verified: true
    },
    {
      id: "dq-1",
      kind: "primary",
      type: "Company engineering blog",
      title: "Data Quality at Airbnb — Part 1: Rebuilding at Scale",
      author: "Jonathan Parks, Vaughn Quoss, et al.",
      publisher: "Airbnb Engineering (Medium)",
      date: "2020",
      url: "https://medium.com/airbnb-engineering/data-quality-at-airbnb-e582465f3ef7",
      verified: true
    },
    {
      id: "dq-2",
      kind: "primary",
      type: "Company engineering blog",
      title: "Data Quality at Airbnb — Part 2: A New Gold Standard (Midas)",
      author: "Jonathan Parks, Vaughn Quoss, et al.",
      publisher: "Airbnb Engineering (Medium)",
      date: "2020",
      url: "https://medium.com/airbnb-engineering/data-quality-at-airbnb-870d03080469",
      verified: true
    },
    {
      id: "dq-score",
      kind: "primary",
      type: "Company engineering blog",
      title: "Data Quality Score: The Next Chapter of Data Quality at Airbnb",
      author: "Airbnb Engineering",
      publisher: "Airbnb Engineering (Medium)",
      date: "2023",
      url: "https://medium.com/airbnb-engineering/data-quality-score-the-next-chapter-of-data-quality-at-airbnb-851dccda19c3",
      verified: true
    },
    {
      id: "dbt-roundup",
      kind: "secondary",
      type: "Secondary coverage (podcast/newsletter)",
      title: "Robert Chang on Scaling Metrics @ Airbnb",
      author: "The Analytics Engineering Roundup",
      publisher: "dbt Labs",
      date: "2021",
      url: "https://roundup.getdbt.com/p/ep-1-robert-chang-on-scaling-metrics",
      verified: false,
      note: "Scale figures for Minerva (metric/dimension/producer counts) appear in this secondary coverage; rendered as 'reported by', not as a verified Airbnb figure."
    }
  ];

  var SOURCE_BY_ID = {};
  SOURCES.forEach(function (s) { SOURCE_BY_ID[s.id] = s; });

  // ── Why this company was chosen (prompt §12 final report #2) ──
  var COMPANY = {
    name: "Airbnb",
    domain: "Global two-sided travel marketplace (hosts list stays/experiences; guests book them).",
    whyChosen: [
      "Airbnb is where <b>Apache Airflow was created</b> — one of the core tools this learning platform already teaches — so the case study ties directly back into the curriculum.",
      "Airbnb has published an unusually detailed, multi-part public record of the <b>business problem this platform is about</b>: making data <i>trustworthy</i> at scale (the Data Quality initiative + Midas) and <b>computing metrics consistently</b> (the Minerva metrics platform).",
      "The stakes are concrete and documented: inconsistent metrics meant different teams answered the same business question differently — a data-<i>correctness</i> problem, not just a pipeline-uptime problem, which is exactly the distinction the four scenario sections exist to teach."
    ]
  };

  // ── Claims, grouped by the section that will use them ────────
  // Each claim: { tier, text, sources?:[ids], note? }. Sections B–E
  // render these through DECICDViz.Evidence so every statement
  // carries its tier badge and (for facts) its citation.
  var CLAIMS = {
    // Section 1 — Business problem, context, impact
    business: [
      { tier: "fact", text: "Airbnb ran a company-wide <b>Data Quality initiative</b> that rebuilt its data warehouse from the ground up with new processes and technology, and revived a dedicated Data Engineering function.", sources: ["dq-1"] },
      { tier: "fact", text: "The initiative launched <b>Midas</b>, a certification program defining a shared “gold standard” for data quality across dimensions including <b>accuracy, consistency, timeliness, cost efficiency, usability, and availability</b>.", sources: ["dq-1", "dq-2"] },
      { tier: "fact", text: "Midas certification involved staged <b>reviews</b> — a spec review, a data review, a code review, and a Minerva metric review — before data could be certified.", sources: ["dq-2"] },
      { tier: "fact", text: "Airbnb built <b>Minerva</b>, a centralized metrics platform, because years of growth had produced <b>metric inconsistencies within and across teams</b> — the same business question could get different answers from different tables and metric logic.", sources: ["minerva-1", "minerva-2"] },
      { tier: "fact", text: "Airbnb later moved <b>beyond strict certification</b> toward incentives, introducing a <b>Data Quality Score</b> that rates datasets on a multi-level scale.", sources: ["dq-score"] },
      { tier: "interpretation", text: "The business impact of wrong or inconsistent data at a marketplace of this scale is not an abstract “bug”: metrics drive pricing, search ranking, host payouts, and executive decisions — so a silently-wrong number is a business-correctness incident, which is why Airbnb invested in a dedicated platform rather than ad-hoc fixes." },
      { tier: "reference", text: "The reference “daily metrics pipeline” we walk through in later sections (a revenue/bookings aggregation feeding an executive dashboard on a morning SLA) is a <b>proposed reference implementation</b> in the spirit of Airbnb's documented systems — it is not Airbnb's undisclosed internal pipeline." }
    ],

    // Section 2 — Architecture & technical design
    architecture: [
      { tier: "fact", text: "<b>Airflow</b> — created at Airbnb — is a platform to programmatically author, schedule, and monitor workflows; its architecture includes a <b>scheduler</b>, a <b>metadata database</b>, <b>worker</b> processes, a <b>Flask-based web UI</b>, and a <b>CLI</b>.", sources: ["airflow-blog"] },
      { tier: "fact", text: "Airflow shipped with multiple <b>executors</b> — a <code>SequentialExecutor</code> (for testing), a threaded <code>LocalExecutor</code>, and a <code>CeleryExecutor</code> for distributed execution.", sources: ["airflow-blog"] },
      { tier: "fact", text: "Airflow was started in <b>October 2014</b> by Maxime Beauchemin at Airbnb, open-sourced from early on, joined the Apache Incubator in <b>March 2016</b>, and became an Apache <b>Top-Level Project in January 2019</b>.", sources: ["airflow-apache", "airflow-blog"] },
      { tier: "fact", text: "In Minerva, metric and dimension definitions live in a <b>centralized GitHub repository</b>; the model centers on <b>event sources</b> and <b>dimension sources</b> (fact and dimension tables in a star-schema design), and a <b>dimension set</b> joins metrics and dimensions into an analysis-friendly dataset.", sources: ["minerva-1", "minerva-2"] },
      { tier: "fact", text: "Minerva exposes a <b>serving/API layer</b> so downstream applications consume metrics consistently without needing to know where data is stored or how each metric is computed.", sources: ["minerva-api"] },
      { tier: "interpretation", text: "Defining metrics once in version control and serving them through a single layer is the architectural answer to the inconsistency problem: it moves the metric definition <i>upstream</i> of every dashboard, so consumers can't drift apart by rewriting the same logic differently." },
      { tier: "reference", text: "The end-to-end medallion flow (sources → ingestion → bronze/silver/gold → BI) used in the architecture explorer is a <b>reference design</b> mapping the documented pieces (Airflow orchestration, a metrics layer, data-quality gates) onto the tools this platform teaches." }
    ],

    // Section 3 — Code change to production (workflow)
    workflow: [
      { tier: "fact", text: "Changes to Minerva metric definitions go through <b>code review, static validation, and test runs</b> before the metric is finalized — treating metric logic as version-controlled code, not dashboard configuration.", sources: ["minerva-1", "dbt-roundup"] },
      { tier: "fact", text: "When a metric's business logic changes, Minerva handles <b>backfilling</b> so historical values are recomputed consistently rather than left on the old definition.", sources: ["minerva-1"] },
      { tier: "interpretation", text: "Because a metric change recomputes history, the workflow must treat “deploy the new definition” and “backfill the data it produces” as two distinct, separately-verified steps — exactly the deploy-code-vs-run-pipeline distinction the curriculum stresses." },
      { tier: "reference", text: "The concrete 10-step walkthrough (branch → PR → CI: lint/pytest/dbt/DAG-import → build/pin artifact → Terraform plan/apply → promote dev→staging→prod with an approval gate → scheduled run → data-quality verification → traceability) is a <b>reference implementation</b> consistent with Airbnb's documented practices, not a copy of an internal pipeline." },
      { tier: "pseudocode", text: "Any CI YAML, Dockerfile, Terraform, dbt, or Airflow snippets shown are <b>simplified educational examples / pseudocode</b> designed to be internally consistent across the walkthrough; they are not Airbnb's production configuration." }
    ],

    // Section 4 — Failure, incident response, recovery
    incident: [
      { tier: "fact", text: "Airbnb's own account frames the <b>problem</b> as data people could not trust: before the Data Quality initiative, inconsistent and unreliable data undermined decisions, which is what the rebuild and Midas set out to fix.", sources: ["dq-1"] },
      { tier: "interpretation", text: "A realistic incident for this architecture is therefore a <b>correctness</b> incident (a metric silently diverges or a late feed makes a dashboard stale), not only a crash — and the recovery must restore <i>data</i> correctness, not merely get a job back to green.", },
      { tier: "reference", text: "The staged incident walkthrough (symptom → detection → investigation → root cause → mitigation → recovery → verification → prevention → post-incident review) is a <b>labelled example incident</b> built on this reference architecture. It is explicitly NOT a historical Airbnb outage attributed to the company.", },
      { tier: "fact", text: "Airbnb's shift from mandatory certification to a <b>Data Quality Score</b> is itself a documented “prevention/improvement” step — scaling quality through incentives and measurement after certification proved heavy to sustain centrally.", sources: ["dq-score"] }
    ]
  };

  // The four scenario sections, as one connected case study (prompt §5).
  // route = existing module id; used for the shared chapter navigator.
  var CHAPTERS = [
    { n: 1, route: "business-scenario",      title: "Business Problem & Impact" },
    { n: 2, route: "end-to-end-pipeline",    title: "Architecture & Design" },
    { n: 3, route: "environment-promotion",  title: "Code Change → Production" },
    { n: 4, route: "failure-simulator",      title: "Incident & Recovery" }
  ];

  // ── Public API ───────────────────────────────────────────
  NS.CaseStudy = {
    tiers: TIERS,
    sources: SOURCES,
    sourceById: function (id) { return SOURCE_BY_ID[id] || null; },
    company: COMPANY,
    chapters: CHAPTERS,
    claims: CLAIMS,
    // Research provenance, surfaced in the References panel (honest
    // disclosure per prompt §3.2 / §12).
    provenance: {
      gathered: "2026-10",
      method: "Extracted from search over the primary Airbnb Engineering posts and the Apache Airflow project history. Full-text primary fetch was unavailable in this environment (outbound proxy blocks medium.com).",
      note: "Primary-source URLs are verified to exist and are linked for the reader to confirm. Figures carried only by secondary coverage are tagged and rendered as “reported by”, never as verified Airbnb figures. No URL here is fabricated."
    }
  };
})();
