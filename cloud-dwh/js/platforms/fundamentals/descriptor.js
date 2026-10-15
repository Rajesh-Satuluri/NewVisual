/* ============================================================
   Platform descriptor: fundamentals — a concept-first "on-ramp"
   section. Teaches the universal fundamentals of data warehousing
   (with a heavy focus on HOW DATA GETS IN), then maps each concept
   to how Snowflake / Redshift / Fabric realize it at a high level.
   Sits FIRST in the switcher. Amber accent.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {}); viz.P = viz.P || {};
  const P = (viz.P.fundamentals = viz.P.fundamentals || {});
  P.Modules = P.Modules || {}; P.data = P.data || {}; P.concepts = P.concepts || {};
  P.quizBank = P.quizBank || {}; P.interviewBank = P.interviewBank || {};

  P.navGroups = [
    { label: '🧭 Start Here', items: [
      { id: 'foundations-home', label: 'Why Fundamentals', icon: '🧭' },
    ] },
    { label: '🏛️ Foundations', items: [
      { id: 'fund-olap-oltp',    label: 'OLAP vs OLTP',            icon: '📊' },
      { id: 'fund-architecture', label: 'MPP & Decoupled Compute', icon: '🏛️' },
      { id: 'fund-columnar',     label: 'Columnar Storage',        icon: '🧱' },
    ] },
    { label: '🟡 How Data Gets In', items: [
      { id: 'fund-ingest-overview',  label: 'Ingestion Big Picture',  icon: '🔄' },
      { id: 'fund-ingest-batch',     label: 'Batch & Bulk Load',      icon: '📦' },
      { id: 'fund-ingest-streaming', label: 'Streaming / Real-Time',  icon: '🌊' },
      { id: 'fund-ingest-cdc',       label: 'CDC & Mirroring',        icon: '🔁' },
      { id: 'fund-elt',              label: 'ETL vs ELT',             icon: '⚙️' },
    ] },
    { label: '⚡ Performance Mechanics', items: [
      { id: 'fund-distribution', label: 'Distribution & Partitioning', icon: '🗂️' },
      { id: 'fund-pruning',      label: 'Data Skipping & Pruning',     icon: '🔍' },
      { id: 'fund-scaling',      label: 'Elastic Compute & Concurrency', icon: '⚡' },
      { id: 'fund-caching',      label: 'Caching & Result Reuse',      icon: '💾' },
    ] },
    { label: '📐 Data & Modeling', items: [
      { id: 'fund-modeling',  label: 'Dimensional Modeling',     icon: '⭐' },
      { id: 'fund-lakehouse', label: 'Open Formats & Lakehouse', icon: '🧊' },
    ] },
    { label: '🛡️ Operations', items: [
      { id: 'fund-governance', label: 'Governance & Security', icon: '🔐' },
      { id: 'fund-cost',       label: 'Cost Models & Tuning',  icon: '💰' },
    ] },
  ];

  P.meta = {
    id: 'fundamentals', label: 'Fundamentals', short: 'Foundations',
    tagline: 'Warehousing, concept by concept',
    accent: '#e0a540',
    docsUrl: 'https://learn.microsoft.com/en-us/fabric/fundamentals/decision-guide-lakehouse-warehouse',
    home: 'foundations-home',
    logoSvg: '',
  };
})();
