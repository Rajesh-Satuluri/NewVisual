/* ============================================================
   Format descriptor — Multi-Cloud / Cross-Cloud (Block D, built).
   The Azure ↔ Databricks equivalence matrix + deep-dive concept
   pages. Registers modules via TV.MultiCloud and derives nav.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  TV.MultiCloud.register();

  const LOGO = `
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad-mc" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2f9bff"/><stop offset="100%" stop-color="#ff5f46"/>
        </linearGradient>
      </defs>
      <circle cx="11" cy="16" r="7" fill="url(#brand-grad-mc)" opacity=".55"/>
      <circle cx="21" cy="16" r="7" fill="url(#brand-grad-mc)" opacity=".55"/>
    </svg>`;

  TV.registerFormat({
    id: 'multi-cloud',
    label: 'Cross-Cloud',
    short: 'Cross-Cloud',
    tagline: 'Cloud DE Handbook',
    docsUrl: 'https://learn.microsoft.com/azure/architecture/',
    docsLabel: 'Architecture Docs',
    visible: true,
    comparable: false,
    home: 'home',
    logoSvg: LOGO,
    navGroups: TV.MultiCloud.navGroups(),
  });
})();
