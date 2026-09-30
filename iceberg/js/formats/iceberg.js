/* ============================================================
   Format descriptor — Apache Iceberg
   Registered into TV.formats.iceberg. app.js reads navGroups,
   label, docsUrl, and logoSvg from here; brand colors are driven
   by [data-format="iceberg"] in CSS (see main.css).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const NAV_GROUPS = [
    {
      id: 'start', label: 'Get Started',
      items: [
        { id: 'home',              label: 'Home',               icon: 'home',     available: true },
        { id: 'why-iceberg',       label: 'Why Iceberg?',       icon: 'shield',   available: true },
        { id: 'architecture',      label: 'Architecture',       icon: 'layers',   available: true },
        { id: 'metadata-explorer', label: 'Metadata Explorer',  icon: 'folder',   available: true },
      ],
    },
    {
      id: 'write-ops', label: 'Write Operations',
      items: [
        { id: 'create-table',  label: 'CREATE TABLE',    icon: 'table-plus',  available: true },
        { id: 'insert',        label: 'INSERT',           icon: 'arrow-down',  available: true },
        { id: 'update',        label: 'UPDATE',           icon: 'pencil',      available: true },
        { id: 'delete',        label: 'DELETE',           icon: 'trash',       available: true },
        { id: 'merge',         label: 'MERGE INTO',       icon: 'merge',       available: true },
        { id: 'overwrite',     label: 'INSERT OVERWRITE', icon: 'refresh',     available: true },
        { id: 'append',        label: 'APPEND',           icon: 'plus',        available: true },
      ],
    },
    {
      id: 'read-ops', label: 'Read & Query',
      items: [
        { id: 'read-path',         label: 'Read Path',            icon: 'search',   available: true },
        { id: 'write-path',        label: 'Write Path',           icon: 'edit',     available: true },
        { id: 'query-planner',     label: 'Query Planner',        icon: 'cpu',      available: true },
        { id: 'incremental-reads', label: 'Incremental & CDC Reads', icon: 'activity', available: true },
        { id: 'time-travel',       label: 'Time Travel',          icon: 'clock',    available: true },
      ],
    },
    {
      id: 'metadata', label: 'Metadata & Schema',
      items: [
        { id: 'snapshot-explorer',   label: 'Snapshot Explorer',   icon: 'camera',     available: true },
        { id: 'manifest-explorer',   label: 'Manifest Explorer',   icon: 'list',       available: true },
        { id: 'schema-evolution',    label: 'Schema Evolution',    icon: 'columns',    available: true },
        { id: 'hidden-partitioning', label: 'Hidden Partitioning', icon: 'filter',     available: true },
        { id: 'partition-evolution', label: 'Partition Evolution', icon: 'git-branch', available: true },
        { id: 'catalog-explorer',    label: 'Catalog Explorer',    icon: 'book',       available: true },
      ],
    },
    {
      id: 'advanced', label: 'Advanced Topics',
      items: [
        { id: 'concurrency',         label: 'Concurrency',          icon: 'users',    available: true },
        { id: 'migrate-to-iceberg',  label: 'Migrate to Iceberg',   icon: 'upload',   available: true },
        { id: 'maintenance',         label: 'Maintenance Ops',      icon: 'tool',     available: true },
        { id: 'performance',         label: 'Performance Sim',      icon: 'zap',      available: true },
        { id: 'write-tuning',        label: 'Write Tuning & Metrics', icon: 'sliders', available: true },
        { id: 'engine-integrations', label: 'Engine Integrations',  icon: 'link',     available: true },
        { id: 'format-v3',           label: 'Spec v3 & Deletion Vectors', icon: 'sparkles', available: true },
      ],
    },
    {
      id: 'learn', label: 'Learn & Practice',
      items: [
        { id: 'interview',  label: 'Interview Mode', icon: 'message-square', available: true },
        { id: 'quiz',       label: 'Quiz Mode',      icon: 'check-square',   available: true },
        { id: 'study',      label: 'Study Deck',     icon: 'book',           available: true },
        { id: 'cheatsheet', label: 'Cheat Sheets',   icon: 'file-text',      available: true },
      ],
    },
  ];

  // Iceberg brand mark (blue→purple triangle) — matches original shell.
  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-iceberg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#4aaeff"/>
          <stop offset="100%" stop-color="#a371f7"/>
        </linearGradient>
      </defs>
      <polygon points="16,2 28,12 4,12" fill="url(#brand-grad-iceberg)" opacity=".9"/>
      <polygon points="13,14 19,14 22,26 10,26" fill="url(#brand-grad-iceberg)" opacity=".35"/>
      <line x1="4" y1="12" x2="28" y2="12" stroke="url(#brand-grad-iceberg)" stroke-width="1.5" opacity=".5"/>
    </svg>`;

  TV.registerFormat({
    id: 'iceberg',
    label: 'Apache Iceberg',
    short: 'Iceberg',
    tagline: 'ShopKart Handbook',
    docsUrl: 'https://iceberg.apache.org/docs/latest/',
    docsLabel: 'Apache Iceberg Docs',
    visible: true,
    comparable: true,
    home: 'home',
    logoSvg: LOGO,
    navGroups: NAV_GROUPS,
  });
})();
