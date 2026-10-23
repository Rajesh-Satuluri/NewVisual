/* redshift platform — Phase-A module stubs (bucketed under CDWH.P.redshift). */
(function(){
  'use strict';
  const viz=(window.CDWH=window.CDWH||{}); viz.P=viz.P||{};
  viz.P.redshift=viz.P.redshift||{}; const B=(viz.P.redshift.Modules=viz.P.redshift.Modules||{});
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function makeStub(meta){ return { render(canvas){
    const bullets = meta.bullets.map(b=>`<li>${esc(b)}</li>`).join('');
    canvas.innerHTML = `<div class="mod-page stub-page"><div class="stub-head"><div class="stub-icon">${meta.icon}</div><div><h1 class="stub-title">${esc(meta.label)}</h1><p class="stub-purpose">${esc(meta.purpose)}</p></div><span class="stub-badge">Phase ${esc(meta.phase)}</span></div><div class="stub-section"><div class="stub-section-title">Planned content</div><ul class="stub-list">${bullets}</ul></div><p class="stub-foot">Skeleton module — interactive content lands in a later iteration.</p></div>`;
    return { destroy(){} }; }}; }

  const STUBS={
    "intro": {"label": "Introduction", "icon": "🎬", "purpose": "Why Redshift? MPP data warehousing on AWS.", "bullets": ["Problem Redshift solves vs traditional DW", "Netflix analytics context"], "phase": "B3"},
    "architecture": {"label": "Architecture", "icon": "🏛️", "purpose": "Leader node, compute nodes, node slices — the MPP engine.", "bullets": ["Leader vs compute node roles", "Slices & parallel query execution"], "phase": "B3"},
    "ra3ManagedStorage": {"label": "RA3 & Managed Storage", "icon": "🗄️", "purpose": "RA3 nodes + Redshift Managed Storage (RMS) decoupling compute/storage.", "bullets": ["RA3 vs DC2/DS2", "RMS: S3-backed managed storage & caching"], "phase": "B3"},
    "serverless": {"label": "Redshift Serverless", "icon": "⚡", "purpose": "On-demand capacity with RPUs — no clusters to manage.", "bullets": ["RPUs & base capacity", "Auto-scaling & cost model"], "phase": "B3"},
    "columnarStorage": {"label": "Columnar Storage & Zone Maps", "icon": "📊", "purpose": "Column-oriented blocks, zone maps, and block-level pruning.", "bullets": ["Columnar vs row storage", "Zone maps / min-max pruning"], "phase": "B3"},
    "distributionStyles": {"label": "Distribution Styles", "icon": "🔀", "purpose": "KEY / EVEN / ALL / AUTO data distribution across slices.", "bullets": ["How each style places data", "Choosing a distribution key"], "phase": "B4"},
    "sortKeys": {"label": "Sort Keys", "icon": "↕️", "purpose": "Compound vs interleaved sort keys and their effect on scans.", "bullets": ["Compound vs interleaved", "Impact on zone-map pruning"], "phase": "B4"},
    "compression": {"label": "Compression & Encoding", "icon": "🗜️", "purpose": "Column encodings (AZ64, ZSTD…) and automatic compression.", "bullets": ["Encoding types", "COPY auto-compression"], "phase": "B4"},
    "vacuumAnalyze": {"label": "VACUUM & ANALYZE", "icon": "🧹", "purpose": "Reclaiming space, re-sorting, and refreshing statistics.", "bullets": ["VACUUM modes", "ANALYZE & stats freshness"], "phase": "B4"},
    "queryExecution": {"label": "Query Execution", "icon": "🔍", "purpose": "Plan → segments → steps across slices; the query lifecycle.", "bullets": ["Query plan & segments", "Compilation cache"], "phase": "B4"},
    "resultCaching": {"label": "Result Caching", "icon": "💾", "purpose": "Leader-node result cache and when it is reused.", "bullets": ["Cache hit conditions", "Invalidation rules"], "phase": "B4"},
    "materializedViews": {"label": "Materialized Views", "icon": "🧱", "purpose": "Precomputed results with automatic & incremental refresh.", "bullets": ["MV refresh modes", "Automatic query rewrite"], "phase": "B4"},
    "wlm": {"label": "Workload Management (WLM)", "icon": "🚦", "purpose": "Manual & Auto WLM, queues, priorities, and query monitoring rules.", "bullets": ["Queues & slots", "Auto WLM & QMR"], "phase": "B5"},
    "concurrencyScaling": {"label": "Concurrency Scaling", "icon": "➕", "purpose": "Transient clusters that absorb bursty concurrent read load.", "bullets": ["How bursts are offloaded", "Credits & limits"], "phase": "B5"},
    "resize": {"label": "Elastic vs Classic Resize", "icon": "📏", "purpose": "Changing cluster size and node type online.", "bullets": ["Elastic vs classic", "Impact on availability"], "phase": "B5"},
    "shortQueryAccel": {"label": "Short Query Acceleration", "icon": "🏃", "purpose": "SQA routing of short queries to a dedicated lane.", "bullets": ["How SQA classifies queries", "Benefits & tuning"], "phase": "B5"},
    "costPerformance": {"label": "Cost & Performance", "icon": "💰", "purpose": "RA3/serverless pricing levers and price-performance tuning.", "bullets": ["Cost drivers", "Price-performance tactics"], "phase": "B5"},
    "spectrum": {"label": "Redshift Spectrum", "icon": "🪣", "purpose": "Query data directly in S3 without loading it.", "bullets": ["External schemas & tables", "Spectrum vs COPY"], "phase": "B5"},
    "federatedQuery": {"label": "Federated Query", "icon": "🌉", "purpose": "Query live data in RDS/Aurora PostgreSQL & MySQL.", "bullets": ["Federated query setup", "Pushdown behavior"], "phase": "B5"},
    "datashares": {"label": "Data Sharing (Datashares)", "icon": "🤝", "purpose": "Live cross-cluster/cross-account data sharing.", "bullets": ["Producer vs consumer", "Cross-account & Lake Formation"], "phase": "B5"},
    "redshiftMl": {"label": "Redshift ML", "icon": "🤖", "purpose": "In-database ML with SQL via SageMaker integration.", "bullets": ["CREATE MODEL flow", "Inference in SQL"], "phase": "B5"},
    "superPartiql": {"label": "SUPER & PartiQL", "icon": "🧩", "purpose": "Semi-structured data with the SUPER type and PartiQL.", "bullets": ["SUPER type", "Querying JSON with PartiQL"], "phase": "B5"},
    "copyUnload": {"label": "COPY & UNLOAD", "icon": "🔁", "purpose": "High-throughput load from S3 and export back to S3.", "bullets": ["COPY best practices", "UNLOAD formats"], "phase": "B5"},
    "iamRbac": {"label": "IAM & RBAC", "icon": "🔑", "purpose": "IAM roles, database roles, users, groups, and privileges.", "bullets": ["IAM vs DB roles", "Role-based access control"], "phase": "B6"},
    "kmsEncryption": {"label": "Encryption & KMS", "icon": "🔒", "purpose": "Encryption at rest/in transit with KMS and HSM.", "bullets": ["At-rest & in-transit", "KMS key management"], "phase": "B6"},
    "lakeFormation": {"label": "Lake Formation Integration", "icon": "🏞️", "purpose": "Centralized, fine-grained lake permissions via Spectrum.", "bullets": ["LF-managed permissions", "Column/row-level security"], "phase": "B6"},
    "labTroubleshooting": {"label": "Troubleshooting Lab", "icon": "🔥", "purpose": "Diagnose disk-full, skew, queue waits, and spills.", "bullets": ["Interactive failure scenarios", "Guided root-cause"], "phase": "B7"},
    "labFailure": {"label": "Architecture Failure", "icon": "💥", "purpose": "Walk through cluster/queue failure modes.", "bullets": ["Failure injection", "Recovery paths"], "phase": "B7"},
    "labDe": {"label": "Redshift + Data Eng", "icon": "🔗", "purpose": "Redshift inside end-to-end data pipelines.", "bullets": ["ELT patterns", "Orchestration touchpoints"], "phase": "B7"},
    "labQueryOpt": {"label": "Query Optimization Lab", "icon": "🔎", "purpose": "Rewrite & tune slow queries step by step.", "bullets": ["EXPLAIN walkthroughs", "Dist/sort fixes"], "phase": "B7"},
    "labCost": {"label": "Cost Decision Lab", "icon": "💸", "purpose": "Trade-offs across RA3 vs serverless vs concurrency scaling.", "bullets": ["Cost scenarios", "Decision framework"], "phase": "B7"},
    "labDecisions": {"label": "Feature Decisions", "icon": "⚖️", "purpose": "When to use which Redshift feature.", "bullets": ["Decision prompts", "Rationale reveal"], "phase": "B7"},
    "labSql": {"label": "SQL Scenarios", "icon": "🧮", "purpose": "Redshift-flavored SQL challenges.", "bullets": ["Scenario SQL", "Model answers"], "phase": "B7"},
    "labTraps": {"label": "Interview Traps", "icon": "⚠️", "purpose": "Common Redshift misconceptions & gotchas.", "bullets": ["Trap questions", "Why it's wrong"], "phase": "B7"},
    "labCertInterview": {"label": "Cert → Interview", "icon": "🎓", "purpose": "Bridge cert topics to interview questions.", "bullets": ["Mapped topics", "Follow-ups"], "phase": "B7"},
    "interviewPrep": {"label": "Interview Prep", "icon": "💬", "purpose": "Curated Redshift interview Q&A bank.", "bullets": ["Q&A by topic", "Difficulty tiers"], "phase": "B7"},
    "labDesign": {"label": "System Design", "icon": "🏗️", "purpose": "Design a Redshift-based analytics platform.", "bullets": ["Requirements → design", "Trade-off analysis"], "phase": "B8"},
    "labRbac": {"label": "RBAC Design Lab", "icon": "🔐", "purpose": "Model roles & grants for an org.", "bullets": ["Role hierarchy", "Least privilege"], "phase": "B8"},
    "labLoading": {"label": "Data Loading Lab", "icon": "📥", "purpose": "Design an ingestion strategy (COPY/Spectrum/streaming).", "bullets": ["Load patterns", "Throughput tuning"], "phase": "B8"},
    "labChains": {"label": "Follow-Up Chains", "icon": "🎤", "purpose": "Deepening interview follow-up chains.", "bullets": ["Chained questioning", "Senior-level depth"], "phase": "B8"},
    "labAnswers": {"label": "Bad → Good → Senior", "icon": "🌟", "purpose": "Answer calibration across levels.", "bullets": ["Graded answers", "What raises the bar"], "phase": "B8"},
    "labCase": {"label": "E2E Case Study", "icon": "🎬", "purpose": "A full Netflix analytics case on Redshift.", "bullets": ["Case narrative", "Design & defend"], "phase": "B8"},
    "labMock": {"label": "Mock Interview", "icon": "🎙️", "purpose": "Timed mock interview flow.", "bullets": ["Simulated interview", "Scoring"], "phase": "B8"},
    "labDashboard": {"label": "Readiness Dashboard", "icon": "📈", "purpose": "Track coverage, quizzes, and interview readiness.", "bullets": ["Progress metrics", "Weak-spot surfacing"], "phase": "B8"},
    "reference": {"label": "Glossary & Cheat Sheet", "icon": "📚", "purpose": "Quick reference for Redshift terms & commands.", "bullets": ["Glossary", "Cheat sheet"], "phase": "B8"},
    "comparison": {"label": "Redshift vs Field", "icon": "🔬", "purpose": "Redshift vs Snowflake / BigQuery / Fabric.", "bullets": ["Side-by-side matrix", "When to pick what"], "phase": "B8"},
    "certification": {"label": "AWS Cert Map", "icon": "🎓", "purpose": "Map to AWS Analytics/Data certifications.", "bullets": ["Topic→cert mapping", "Study path"], "phase": "B8"},
    "e2eFlow": {"label": "E2E Capstone Flow", "icon": "🎯", "purpose": "End-to-end capstone tying modules together.", "bullets": ["Full pipeline", "Capstone checklist"], "phase": "B8"},
  };
  Object.entries(STUBS).forEach(([k,m])=>{ B[k]=makeStub(m); });
  B.home={ render(canvas){ canvas.innerHTML=`<div class="mod-page stub-page"><div class="home-hero"><div class="home-hero-badge">Amazon Redshift · Skeleton (Phase A)</div><h1 class="home-hero-title">Amazon Redshift — Netflix Analytics on AWS</h1><p class="home-hero-sub">Interactive Amazon Redshift architecture guide told through Netflix's AWS analytics platform.</p><p class="stub-foot">Use the sidebar to explore every planned module.</p></div></div>`; return { destroy(){} }; }};
})();