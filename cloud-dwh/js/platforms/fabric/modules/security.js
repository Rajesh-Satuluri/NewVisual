/* ============================================================
   Fabric — Security & Governance (authentic, Microsoft-Learn aligned)
   rls-cls-masking · purview · medallion
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    'rlsClsMasking': {
      eyebrow: 'Security', title: 'RLS, CLS & Dynamic Data Masking',
      subtitle: 'The Fabric Warehouse secures data three ways: row-level security, column-level security, and dynamic data masking — layered together. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/security',
      stage: { caption: 'Three layers of fine-grained protection',
        groups: [
          { id: 'rls', label: 'Row-Level Security', sub: 'which rows', nodes: [{ id: 'pred', label: 'Security predicate / policy' }] },
          { id: 'cls', label: 'Column-Level Security', sub: 'which columns', nodes: [{ id: 'grant', label: 'GRANT on columns' }] },
          { id: 'ddm', label: 'Dynamic Data Masking', sub: 'how values appear', nodes: [{ id: 'mask', label: 'Masked in results' }, { id: 'unmask', label: 'UNMASK permission' }] },
        ] },
      steps: [
        { label: 'RLS', title: 'Row-level security', on: { spot: ['rls'], flow: ['pred'] },
          body: '<strong>RLS</strong> restricts which <em>rows</em> a user sees based on their identity/role via a security policy — e.g. a region manager sees only their region.',
          facts: ['Filters rows by a security predicate', 'Based on user role/attributes', 'Enforced transparently on every query'] },
        { label: 'CLS', title: 'Column-level security', on: { spot: ['cls'], flow: ['grant'] },
          body: '<strong>CLS</strong> limits which <em>columns</em> a user can access — e.g. analysts can\'t select a salary or PII column.',
          facts: ['GRANT/DENY at the column level', 'Hide sensitive columns from roles', 'Complements RLS'] },
        { label: 'DDM', title: 'Dynamic data masking', on: { spot: ['ddm'], flow: ['mask', 'unmask'] },
          body: '<strong>Masking</strong> changes how values <em>appear</em> in results (e.g. <code>j***@…</code>) without changing stored data. Users with <strong>UNMASK</strong> see real values.',
          facts: ['Masks query results, not stored data', 'UNMASK permission reveals originals', 'Pair with CLS/RLS — masking alone is not full protection'] },
      ],
      takeaways: [
        'RLS = which rows, CLS = which columns, DDM = how values appear',
        'Masking changes results only (not storage); UNMASK sees originals',
        'Layer all three — masking alone is not a complete control',
      ],
    },

    purview: {
      eyebrow: 'Governance', title: 'Microsoft Purview',
      subtitle: 'Purview governs Fabric data tenant-wide — cataloging, lineage, sensitivity labels, and policies that travel with the data. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/purview/microsoft-fabric',
      stage: { caption: 'Govern, classify, and trace',
        groups: [
          { id: 'cat', label: 'Catalog & discovery', nodes: [{ id: 'scan', label: 'Catalog Fabric items' }, { id: 'search', label: 'Find & understand data' }], connectorAfter: 'classify + protect' },
          { id: 'protect', label: 'Classify & protect', nodes: [{ id: 'labels', label: 'Sensitivity labels' }, { id: 'class', label: 'Auto-classification' }], connectorAfter: 'trace' },
          { id: 'lineage', label: 'Lineage & audit', nodes: [{ id: 'flow', label: 'End-to-end lineage' }] },
        ] },
      steps: [
        { label: 'Catalog', title: 'Catalog & discover', on: { spot: ['cat'], flow: ['scan', 'search'] },
          body: 'Purview catalogs Fabric items so people can <strong>discover and understand</strong> data across the tenant.',
          facts: ['Tenant-wide data catalog', 'Search and understand assets', 'Spans Fabric and beyond'] },
        { label: 'Protect', title: 'Classify & label', on: { spot: ['protect'], conn: ['cat'], flow: ['labels', 'class'] },
          body: 'Apply <strong>sensitivity labels</strong> (e.g. Confidential) and auto-classification; labels persist with the data, even on export.',
          facts: ['Sensitivity labels travel with the data', 'Automatic classification of sensitive data', 'Integrates with Microsoft Information Protection'] },
        { label: 'Lineage', title: 'Lineage & audit', on: { spot: ['lineage'], conn: ['protect'], flow: ['flow'] },
          body: 'Trace <strong>end-to-end lineage</strong> — from source through pipelines/dataflows to reports — for impact analysis and compliance.',
          facts: ['Source → transform → report lineage', 'Impact analysis for changes', 'Supports audit and compliance'] },
      ],
      takeaways: [
        'Purview provides tenant-wide cataloging, classification, and lineage for Fabric',
        'Sensitivity labels persist with the data, even on export',
        'End-to-end lineage supports impact analysis, audit, and compliance',
      ],
    },

    medallion: {
      eyebrow: 'Governance', title: 'Medallion Architecture',
      subtitle: 'A proven way to organize a lakehouse: Bronze (raw) → Silver (cleaned/conformed) → Gold (business-ready), all as Delta in OneLake. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture',
      stage: { caption: 'Progressive refinement in OneLake',
        groups: [
          { id: 'bronze', label: '🥉 Bronze', sub: 'raw, as-ingested', nodes: [{ id: 'raw', label: 'Netflix events (raw)' }], connectorAfter: 'clean & conform' },
          { id: 'silver', label: '🥈 Silver', sub: 'cleaned, conformed', nodes: [{ id: 'clean', label: 'Validated, deduped, typed' }], connectorAfter: 'aggregate & model' },
          { id: 'gold', label: '🥇 Gold', sub: 'business-ready', nodes: [{ id: 'marts', label: 'Star-schema marts' }, { id: 'bi', label: 'Direct Lake BI' }] },
        ] },
      steps: [
        { label: 'Bronze', title: 'Bronze — raw landing', on: { spot: ['bronze'], flow: ['raw'] },
          body: '<strong>Bronze</strong> stores data exactly as ingested (append-only), preserving history and enabling reprocessing.',
          facts: ['Raw, as-ingested, append-only', 'Keeps full history for replay', 'Minimal transformation'] },
        { label: 'Silver', title: 'Silver — cleaned & conformed', on: { spot: ['silver'], conn: ['bronze'], flow: ['clean'] },
          body: '<strong>Silver</strong> validates, deduplicates, types, and conforms data into an integrated, queryable layer.',
          facts: ['Cleaned, deduped, standardized', 'Conformed/integrated entities', 'The reliable analytics base'] },
        { label: 'Gold', title: 'Gold — business-ready', on: { spot: ['gold'], conn: ['silver'], flow: ['marts', 'bi'] },
          body: '<strong>Gold</strong> holds curated, aggregated, business-ready marts (often star schemas) that Direct Lake semantic models and reports consume.',
          facts: ['Curated star-schema marts', 'Feeds Direct Lake semantic models', 'What business users actually query'] },
      ],
      takeaways: [
        'Medallion = Bronze (raw) → Silver (cleaned/conformed) → Gold (business-ready)',
        'All layers are Delta tables in OneLake; each adds quality and structure',
        'Gold marts feed Direct Lake semantic models and reports',
      ],
    },
  };

  Kit.registerAll('fabric', SPECS);
})();
