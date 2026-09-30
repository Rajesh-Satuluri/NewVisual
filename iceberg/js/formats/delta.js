/* ============================================================
   Format descriptor — Delta Lake
   Registered hidden (visible:false) while the format is being
   built out partition-by-partition, so the shipped switcher never
   shows a partial Delta. navGroups list ONLY built screens; they
   grow each partition. Flipped visible:true in Phase B6.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  // Built so far: Get Started (B1) + Write Operations (B2).
  const NAV_GROUPS = [
    {
      id: 'start', label: 'Get Started',
      items: [
        { id: 'home',         label: 'Home',            icon: 'home',   available: true },
        { id: 'why-delta',    label: 'Why Delta Lake?', icon: 'shield', available: true },
        { id: 'architecture', label: 'Architecture',    icon: 'layers', available: true },
        { id: 'log-explorer', label: 'Transaction Log', icon: 'folder', available: true },
      ],
    },
    {
      id: 'write-ops', label: 'Write Operations',
      items: [
        { id: 'create-table', label: 'CREATE TABLE',    icon: 'table-plus', available: true },
        { id: 'insert',       label: 'INSERT / APPEND', icon: 'arrow-down', available: true },
        { id: 'update',       label: 'UPDATE',          icon: 'pencil',     available: true },
        { id: 'delete',       label: 'DELETE',          icon: 'trash',      available: true },
        { id: 'merge',        label: 'MERGE INTO',      icon: 'merge',      available: true },
        { id: 'overwrite',    label: 'replaceWhere',    icon: 'refresh',    available: true },
      ],
    },
    {
      id: 'read-ops', label: 'Read & Query',
      items: [
        { id: 'read-path',     label: 'Read Path (Log Replay)', icon: 'search', available: true },
        { id: 'write-path',    label: 'Write Path (Commit)',    icon: 'edit',   available: true },
        { id: 'query-planner', label: 'Query Planner',          icon: 'cpu',    available: true },
        { id: 'time-travel',   label: 'Time Travel',            icon: 'clock',  available: true },
      ],
    },
    {
      id: 'log', label: 'Log & Schema',
      items: [
        { id: 'version-explorer',  label: 'Version History',   icon: 'camera',     available: true },
        { id: 'commit-explorer',   label: 'Commit Explorer',   icon: 'list',       available: true },
        { id: 'checkpoint',        label: 'Checkpoints',       icon: 'book',       available: true },
        { id: 'schema-evolution',  label: 'Schema Evolution',  icon: 'columns',    available: true },
        { id: 'partitioning',      label: 'Partitioning',      icon: 'filter',     available: true },
        { id: 'liquid-clustering', label: 'Liquid Clustering', icon: 'git-branch', available: true },
      ],
    },
    {
      id: 'advanced', label: 'Advanced Topics',
      items: [
        { id: 'concurrency',         label: 'Concurrency (OCC)',   icon: 'users',   available: true },
        { id: 'deletion-vectors',    label: 'Deletion Vectors',    icon: 'trash',   available: true },
        { id: 'optimize',            label: 'OPTIMIZE & Z-Order',  icon: 'zap',     available: true },
        { id: 'vacuum',              label: 'VACUUM',              icon: 'tool',    available: true },
        { id: 'change-data-feed',    label: 'Change Data Feed',    icon: 'refresh', available: true },
        { id: 'engine-integrations', label: 'Engine Integrations', icon: 'link',    available: true },
      ],
    },
    {
      id: 'learn', label: 'Learn & Practice',
      items: [
        { id: 'interview',  label: 'Interview Mode', icon: 'message', available: true },
        { id: 'quiz',       label: 'Quiz Mode',      icon: 'help',    available: true },
        { id: 'study',      label: 'Study Deck',     icon: 'book',    available: true },
        { id: 'cheatsheet', label: 'Cheat Sheets',   icon: 'file',    available: true },
      ],
    },
  ];

  // Delta Δ mark — red→amber gradient (distinct from Iceberg blue→purple).
  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-delta" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff5a3c"/>
          <stop offset="100%" stop-color="#ffb020"/>
        </linearGradient>
      </defs>
      <polygon points="16,3 29,27 3,27" fill="url(#brand-grad-delta)" opacity=".9"/>
      <polygon points="16,11 22.5,24 9.5,24" fill="#0e1420" opacity=".55"/>
      <line x1="3" y1="27" x2="29" y2="27" stroke="url(#brand-grad-delta)" stroke-width="1.5" opacity=".6"/>
    </svg>`;

  // Shared ShopKart numbers used across Delta modules (consistent with Iceberg).
  TV.DeltaData = {
    table: 'orders',
    totalFiles: 24000, totalSize: '38.4 TB',
    checkpointEvery: 10,
    scenario: 'ShopKart Global E-Commerce — Delta Lake on S3, Spark + Unity Catalog',
  };

  TV.registerFormat({
    id: 'delta',
    label: 'Delta Lake',
    short: 'Delta',
    tagline: 'ShopKart Handbook',
    docsUrl: 'https://docs.delta.io/latest/index.html',
    docsLabel: 'Delta Lake Docs',
    visible: true,       // revealed in Phase B6 — switcher is now Iceberg ⇄ Delta
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: NAV_GROUPS,
  });
})();
