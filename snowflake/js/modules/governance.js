/* ============================================================
   Governance Module — object tagging, data classification,
   access history / lineage, and object dependencies.
   (Complements the Security & RBAC modules.)
   ============================================================ */

(function () {
  'use strict';

  const PILLARS = [
    { n: 'Object Tagging', d: 'Attach key–value tags (e.g. PII=\'high\', COST_CENTER=\'ml\') to warehouses, databases, tables, and columns. Tags propagate and drive policies + cost attribution.' },
    { n: 'Data Classification', d: 'Snowflake auto-detects semantic categories (EMAIL, PHONE, NAME) and privacy categories (identifier, quasi-identifier), then can auto-apply tags.' },
    { n: 'Tag-based Masking', d: 'Bind a masking policy to a tag once; every column carrying that tag is protected automatically — no per-column wiring.' },
    { n: 'Access History', d: 'ACCOUNT_USAGE.ACCESS_HISTORY records who read/wrote which columns — the audit backbone for compliance.' },
    { n: 'Object Dependencies', d: 'OBJECT_DEPENDENCIES exposes the lineage graph (which views/tables depend on what) for impact analysis before changes.' },
    { n: 'Row Access & Aggregation Policies', d: 'Restrict which rows a role sees, or force min-group-size aggregation for privacy-preserving analytics.' },
  ];

  const TAG_SQL = `-- Tag once, mask everywhere: governance that scales
CREATE TAG pii;

-- Classify + tag a sensitive column
ALTER TABLE subscribers MODIFY COLUMN email SET TAG pii = 'high';

-- Bind a masking policy to the tag (applies to ALL pii-tagged columns)
CREATE MASKING POLICY mask_pii AS (val STRING) RETURNS STRING ->
  CASE WHEN CURRENT_ROLE() IN ('SECURITYADMIN') THEN val
       ELSE '***MASKED***' END;

ALTER TAG pii SET MASKING POLICY mask_pii;

-- Audit: who queried email in the last day?
SELECT user_name, query_id, query_start_time
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE ARRAY_CONTAINS('SUBSCRIBERS.EMAIL'::VARIANT, base_objects_accessed)
  AND query_start_time > DATEADD(day, -1, CURRENT_TIMESTAMP);`;

  const GovModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Platform',
        'Data Governance',
        'RBAC controls who can connect; governance controls what they can see and proves it after the fact. Netflix must satisfy GDPR/CCPA across 190 countries — tags, classification, lineage, and access history make that auditable.'
      ));

      const pSec = _section('The Governance Pillars');
      const grid = _el('div', 'ss-grid');
      PILLARS.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      pSec.appendChild(grid);
      page.appendChild(pSec);

      const tSec = _section('Tag → Classify → Mask → Audit');
      const info = _el('div', 'info-box');
      info.innerHTML = `The governance superpower is <strong>tag-based policy</strong>: classify sensitive columns, tag them, then attach a masking policy to the <em>tag</em>. New columns that get the tag are protected automatically — governance that scales with your data, not your headcount.`;
      tSec.appendChild(info);
      if (cv) tSec.appendChild(cv.create(TAG_SQL, 'sql', 'Tag-based governance'));
      page.appendChild(tSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(title) {
    const s = _el('div', 'mod-section');
    const t = _el('div', 'mod-section-title'); t.textContent = title; s.appendChild(t);
    return s;
  }
  function _header(eyebrow, title, subtitle) {
    const h = _el('div', 'mod-header');
    h.innerHTML = `<div class="mod-eyebrow">${eyebrow}</div><h1 class="mod-title">${title}</h1><p class="mod-subtitle">${subtitle}</p>`;
    return h;
  }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.governance = GovModule;
})();
