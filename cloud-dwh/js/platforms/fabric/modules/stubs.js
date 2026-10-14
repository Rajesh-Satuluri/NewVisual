/* fabric platform — Phase-A module stubs (bucketed under CDWH.P.fabric). */
(function(){
  'use strict';
  const viz=(window.CDWH=window.CDWH||{}); viz.P=viz.P||{};
  viz.P.fabric=viz.P.fabric||{}; const B=(viz.P.fabric.Modules=viz.P.fabric.Modules||{});
  function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function makeStub(meta){ return { render(canvas){
    const bullets = meta.bullets.map(b=>`<li>${esc(b)}</li>`).join('');
    canvas.innerHTML = `<div class="mod-page stub-page"><div class="stub-head"><div class="stub-icon">${meta.icon}</div><div><h1 class="stub-title">${esc(meta.label)}</h1><p class="stub-purpose">${esc(meta.purpose)}</p></div><span class="stub-badge">Phase ${esc(meta.phase)}</span></div><div class="stub-section"><div class="stub-section-title">Planned content</div><ul class="stub-list">${bullets}</ul></div><p class="stub-foot">Skeleton module — interactive content lands in a later iteration.</p></div>`;
    return { destroy(){} }; }}; }

  const STUBS={
    "intro": {"label": "Introduction", "icon": "🎬", "purpose": "Why Microsoft Fabric? Unified SaaS analytics.", "bullets": ["Fabric vs classic stacks", "Illustrative Netflix workload"], "phase": "B9"},
    "onelake": {"label": "OneLake", "icon": "🌊", "purpose": "The single, logical, tenant-wide data lake.", "bullets": ["One copy of data", "OneLake structure"], "phase": "B9"},
    "warehouseVsLakehouse": {"label": "Warehouse vs Lakehouse", "icon": "🏢", "purpose": "When to use the Warehouse vs the Lakehouse.", "bullets": ["Engine differences", "T-SQL vs Spark"], "phase": "B9"},
    "polarisEngine": {"label": "Polaris Engine", "icon": "⚙️", "purpose": "The distributed T-SQL query engine behind the Warehouse.", "bullets": ["Cell-based architecture", "Separation of compute/state"], "phase": "B9"},
    "deltaStorage": {"label": "Delta-Native Storage", "icon": "🔺", "purpose": "Delta Lake (Parquet) as Fabric's native table format.", "bullets": ["Delta tables everywhere", "Interop across engines"], "phase": "B9"},
    "sqlEndpoint": {"label": "SQL Analytics Endpoint", "icon": "🔌", "purpose": "Auto-generated read T-SQL endpoint over a Lakehouse.", "bullets": ["Endpoint vs Warehouse", "Read-only semantics"], "phase": "B9"},
    "directlake": {"label": "DirectLake Mode", "icon": "⚡", "purpose": "Power BI reads Delta directly — no import, no DirectQuery.", "bullets": ["DirectLake vs Import/DirectQuery", "Fallback behavior"], "phase": "B10"},
    "capacities": {"label": "Capacities & F-SKUs", "icon": "🧮", "purpose": "Capacity Units, F-SKUs, and workload smoothing.", "bullets": ["CU model", "F-SKU sizing"], "phase": "B10"},
    "shortcuts": {"label": "Shortcuts", "icon": "🔗", "purpose": "Virtualize external data (ADLS/S3/GCS) into OneLake.", "bullets": ["Shortcut types", "No-copy access"], "phase": "B10"},
    "mirroring": {"label": "Mirroring", "icon": "🪞", "purpose": "Near-real-time replicas of Snowflake/Cosmos/SQL into OneLake.", "bullets": ["Supported sources", "CDC-based sync"], "phase": "B10"},
    "crossDbQueries": {"label": "Cross-Database Queries", "icon": "🔀", "purpose": "Query across warehouses & lakehouses in a workspace.", "bullets": ["Three-part names", "Cross-item joins"], "phase": "B10"},
    "semanticModels": {"label": "Semantic Models", "icon": "📐", "purpose": "The BI semantic layer over Fabric data.", "bullets": ["Model + measures", "DirectLake binding"], "phase": "B10"},
    "workspacesDomains": {"label": "Workspaces & Domains", "icon": "🗂️", "purpose": "Organizing items with workspaces and domains.", "bullets": ["Workspace roles", "Domains & governance"], "phase": "B11"},
    "dataFactory": {"label": "Data Factory Pipelines", "icon": "🏭", "purpose": "Orchestration pipelines for ingestion & activities.", "bullets": ["Pipeline activities", "Scheduling"], "phase": "B11"},
    "dataflowsGen2": {"label": "Dataflows Gen2", "icon": "🔄", "purpose": "Power Query–based transformations at scale.", "bullets": ["Gen2 vs pipelines", "Staging & destinations"], "phase": "B11"},
    "gitDeployment": {"label": "Git & Deployment Pipelines", "icon": "🚀", "purpose": "Source control and dev→test→prod promotion.", "bullets": ["Git integration", "Deployment pipelines"], "phase": "B11"},
    "copilot": {"label": "Copilot in Fabric", "icon": "🤖", "purpose": "AI assistance for SQL, dataflows, and reports.", "bullets": ["Copilot surfaces", "Prompt patterns"], "phase": "B11"},
    "rlsClsMasking": {"label": "RLS / CLS / Masking", "icon": "🔒", "purpose": "Row-level, column-level security, and dynamic data masking.", "bullets": ["RLS & CLS", "Dynamic data masking"], "phase": "B11"},
    "purview": {"label": "Microsoft Purview", "icon": "🏷️", "purpose": "Cataloging, lineage, and sensitivity labels.", "bullets": ["Catalog & lineage", "Sensitivity labels"], "phase": "B11"},
    "medallion": {"label": "Medallion Architecture", "icon": "🥇", "purpose": "Bronze/Silver/Gold layering in OneLake.", "bullets": ["Layer responsibilities", "Netflix-style flow"], "phase": "B11"},
    "labTroubleshooting": {"label": "Troubleshooting Lab", "icon": "🔥", "purpose": "Diagnose capacity throttling, refresh, and endpoint sync issues.", "bullets": ["Interactive scenarios", "Guided root-cause"], "phase": "B12"},
    "labFailure": {"label": "Architecture Failure", "icon": "💥", "purpose": "Walk through capacity/refresh failure modes.", "bullets": ["Failure injection", "Recovery paths"], "phase": "B12"},
    "labDe": {"label": "Fabric + Data Eng", "icon": "🔗", "purpose": "Fabric inside end-to-end pipelines.", "bullets": ["ELT patterns", "Orchestration"], "phase": "B12"},
    "labPerfOpt": {"label": "Performance Optimization", "icon": "🔎", "purpose": "Tune DirectLake, V-Order, and capacity use.", "bullets": ["V-Order & partitioning", "Capacity tuning"], "phase": "B12"},
    "labCost": {"label": "Cost Decision Lab", "icon": "💸", "purpose": "Capacity/CU trade-offs and SKU sizing.", "bullets": ["CU budgeting", "SKU decisions"], "phase": "B12"},
    "labDecisions": {"label": "Feature Decisions", "icon": "⚖️", "purpose": "Warehouse vs Lakehouse vs KQL — when to use which.", "bullets": ["Decision prompts", "Rationale reveal"], "phase": "B12"},
    "labSql": {"label": "SQL Scenarios", "icon": "🧮", "purpose": "Fabric T-SQL challenges & limitations.", "bullets": ["Scenario SQL", "Model answers"], "phase": "B12"},
    "labTraps": {"label": "Interview Traps", "icon": "⚠️", "purpose": "Common Fabric misconceptions & gotchas.", "bullets": ["Trap questions", "Why it's wrong"], "phase": "B12"},
    "labCertInterview": {"label": "Cert → Interview", "icon": "🎓", "purpose": "Bridge DP-600/700 topics to interviews.", "bullets": ["Mapped topics", "Follow-ups"], "phase": "B12"},
    "interviewPrep": {"label": "Interview Prep", "icon": "💬", "purpose": "Curated Fabric interview Q&A bank.", "bullets": ["Q&A by topic", "Difficulty tiers"], "phase": "B12"},
    "labDesign": {"label": "System Design", "icon": "🏗️", "purpose": "Design a Fabric analytics platform.", "bullets": ["Requirements → design", "Trade-offs"], "phase": "B13"},
    "labSecurity": {"label": "Security Design Lab", "icon": "🔐", "purpose": "Model RLS/CLS, workspace roles, and labels.", "bullets": ["Access model", "Least privilege"], "phase": "B13"},
    "labLoading": {"label": "Data Loading Lab", "icon": "📥", "purpose": "Design ingestion (pipelines/dataflows/shortcuts/mirroring).", "bullets": ["Load patterns", "Throughput"], "phase": "B13"},
    "labChains": {"label": "Follow-Up Chains", "icon": "🎤", "purpose": "Deepening interview follow-up chains.", "bullets": ["Chained questioning", "Senior depth"], "phase": "B13"},
    "labAnswers": {"label": "Bad → Good → Senior", "icon": "🌟", "purpose": "Answer calibration across levels.", "bullets": ["Graded answers", "Raising the bar"], "phase": "B13"},
    "labCase": {"label": "E2E Case Study", "icon": "🎬", "purpose": "A full analytics case on Fabric.", "bullets": ["Case narrative", "Design & defend"], "phase": "B13"},
    "labMock": {"label": "Mock Interview", "icon": "🎙️", "purpose": "Timed mock interview flow.", "bullets": ["Simulated interview", "Scoring"], "phase": "B13"},
    "labDashboard": {"label": "Readiness Dashboard", "icon": "📈", "purpose": "Track coverage, quizzes, and readiness.", "bullets": ["Progress metrics", "Weak-spot surfacing"], "phase": "B13"},
    "reference": {"label": "Glossary & Cheat Sheet", "icon": "📚", "purpose": "Quick reference for Fabric terms.", "bullets": ["Glossary", "Cheat sheet"], "phase": "B13"},
    "comparison": {"label": "Fabric vs Field", "icon": "🔬", "purpose": "Fabric vs Snowflake / Redshift / BigQuery.", "bullets": ["Side-by-side matrix", "When to pick what"], "phase": "B13"},
    "certification": {"label": "Fabric Cert Map", "icon": "🎓", "purpose": "Map to DP-600 / DP-700.", "bullets": ["Topic→cert mapping", "Study path"], "phase": "B13"},
    "e2eFlow": {"label": "E2E Capstone Flow", "icon": "🎯", "purpose": "End-to-end capstone tying modules together.", "bullets": ["Full pipeline", "Capstone checklist"], "phase": "B13"},
  };
  Object.entries(STUBS).forEach(([k,m])=>{ B[k]=makeStub(m); });
  B.home={ render(canvas){ canvas.innerHTML=`<div class="mod-page stub-page"><div class="home-hero"><div class="home-hero-badge">Microsoft Fabric · Skeleton (Phase A)</div><h1 class="home-hero-title">Microsoft Fabric Data Warehouse</h1><p class="home-hero-sub">Interactive Microsoft Fabric Data Warehouse guide.</p><div class=\"stub-note\">Illustrative: the Netflix workload is a teaching scenario; Netflix is not a Microsoft Fabric customer.</div><p class="stub-foot">Use the sidebar to explore every planned module.</p></div></div>`; return { destroy(){} }; }};
})();