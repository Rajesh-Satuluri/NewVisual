/* ============================================================
   Platform descriptor: compare — a first-class section with its
   own sub-nav (Overview → side-by-side deep-dives → Watch It Run),
   mirroring the Iceberg tool's Compare experience.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {}); viz.P = viz.P || {};
  const P = (viz.P.compare = viz.P.compare || {});
  P.Modules = P.Modules || {}; P.data = P.data || {}; P.concepts = P.concepts || {};
  P.quizBank = P.quizBank || {}; P.interviewBank = P.interviewBank || {};

  P.navGroups = [
    { label: '📊 Overview', items: [
      { id: 'overview', label: 'At a Glance', icon: '📊' },
    ] },
    { label: '🔬 Side by Side', items: [
      { id: 'cmp-architecture', label: 'Architecture',          icon: '🏛️' },
      { id: 'cmp-storage',      label: 'Storage & Skipping',    icon: '🗄️' },
      { id: 'cmp-scaling',      label: 'Scaling & Concurrency', icon: '⚡' },
      { id: 'cmp-query-lake',   label: 'Query the Lake',        icon: '🪣' },
      { id: 'cmp-governance',   label: 'Governance & Security', icon: '🔐' },
      { id: 'cmp-ecosystem',    label: 'Ecosystem & Cost',      icon: '🔌' },
    ] },
    { label: '🎬 Watch It Run', items: [
      { id: 'cmp-watch', label: 'Same Query, 3 Engines', icon: '🎬' },
    ] },
  ];

  P.meta = {
    id: 'compare', label: 'Compare', short: 'Compare',
    tagline: 'Snowflake · Redshift · Fabric',
    accent: '#8b7ff0',
    docsUrl: 'https://learn.microsoft.com/en-us/fabric/fundamentals/decision-guide-lakehouse-warehouse',
    home: 'overview',
    logoSvg: '',
  };
})();
