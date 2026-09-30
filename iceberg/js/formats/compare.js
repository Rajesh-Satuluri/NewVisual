/* ============================================================
   Format descriptor — Compare (Iceberg vs Delta Lake).
   Registered as a first-class format so the switcher renders a
   third "⇄ Compare" segment automatically (see app._buildFormatSwitcher).
   Uses neutral/dual brand tokens (css/multiformat.css [data-format="compare"]).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  const NAV_GROUPS = [
    {
      id: 'overview', label: 'Overview',
      items: [
        { id: 'overview', label: 'At a Glance', icon: 'layers', available: true },
      ],
    },
    {
      id: 'deep', label: 'Side by Side',
      items: [
        { id: 'metadata-model', label: 'Metadata Model',    icon: 'folder',  available: true },
        { id: 'writes-deletes', label: 'Writes & Deletes',  icon: 'pencil',  available: true },
        { id: 'time-travel',    label: 'Time Travel',        icon: 'clock',   available: true },
        { id: 'concurrency',    label: 'Concurrency',        icon: 'users',   available: true },
        { id: 'layout',         label: 'Partitioning',       icon: 'filter',  available: true },
        { id: 'ecosystem',      label: 'Ecosystem',          icon: 'link',    available: true },
      ],
    },
    {
      id: 'animated', label: 'Watch It Run',
      items: [
        { id: 'delete-compare', label: 'Delete: CoW vs MoR', icon: 'trash', available: true },
      ],
    },
  ];

  // Dual mark — an Iceberg-blue and a Delta-amber triangle meeting.
  const LOGO = `
    <svg viewBox="0 0 34 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-cmp-a" x1="0" y1="0" x2="20" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#4aaeff"/><stop offset="100%" stop-color="#a371f7"/>
        </linearGradient>
        <linearGradient id="brand-grad-cmp-b" x1="14" y1="0" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ff5a3c"/><stop offset="100%" stop-color="#ffb020"/>
        </linearGradient>
      </defs>
      <polygon points="11,4 20,26 2,26" fill="url(#brand-grad-cmp-a)" opacity=".9"/>
      <polygon points="23,4 32,26 14,26" fill="url(#brand-grad-cmp-b)" opacity=".82"/>
    </svg>`;

  TV.registerFormat({
    id: 'compare',
    label: 'Compare',
    short: 'Compare',
    tagline: 'Iceberg · Delta · Hudi',
    docsUrl: 'https://tabular.io/apache-iceberg-cookbook/',
    docsLabel: 'Table Format Guides',
    visible: true,
    comparable: false,
    home: 'overview',
    logoSvg: LOGO,
    navGroups: NAV_GROUPS,
  });
})();
