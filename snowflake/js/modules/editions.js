/* ============================================================
   Editions & Connectivity Module — Snowflake editions,
   regions/clouds, and how you connect to Snowflake.
   ============================================================ */

(function () {
  'use strict';

  const EDITIONS = [
    { n: 'Standard', d: 'Core data warehouse: separation of storage/compute, 1-day Time Travel, secure sharing, RBAC.' },
    { n: 'Enterprise', d: 'Adds up to 90-day Time Travel, multi-cluster warehouses, materialized views, search optimization, column-level security.' },
    { n: 'Business Critical', d: 'Adds HIPAA/PCI, Tri-Secret Secure (customer-managed keys), PrivateLink, failover for business continuity.' },
    { n: 'Virtual Private (VPS)', d: 'A dedicated, isolated Snowflake environment for the strictest security/regulatory needs.' },
  ];

  const CONNECT = [
    { n: 'Snowsight', d: 'The web UI: worksheets, dashboards, monitoring, admin.' },
    { n: 'SnowSQL', d: 'The command-line client for scripting and automation.' },
    { n: 'Drivers', d: 'JDBC, ODBC, and native connectors for Python, Node.js, Go, .NET, Spark, Kafka.' },
    { n: 'REST / SQL API', d: 'Submit SQL over HTTPS for app integrations and serverless functions.' },
    { n: 'PrivateLink', d: 'Private network connectivity (AWS/Azure/GCP) so traffic never traverses the public internet.' },
    { n: 'Network Policies', d: 'Allow/deny lists of IP ranges that can reach the account or a user.' },
  ];

  const NET_SQL = `-- Restrict access to corporate IP ranges
CREATE NETWORK POLICY corp_only
  ALLOWED_IP_LIST = ('203.0.113.0/24', '198.51.100.10');
ALTER ACCOUNT SET NETWORK_POLICY = corp_only;

-- Multi-region/cloud: each account lives in one region, e.g.
--   AWS us-east-1, Azure westeurope, GCP us-central1
-- Cross-region data sharing/replication bridges them.`;

  const EdModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Operations',
        'Editions & Connectivity',
        'Which Snowflake edition you buy determines the features you get; where it runs (cloud + region) affects latency, residency, and cost; and how you connect ranges from the web UI to PrivateLink. Netflix runs Business Critical for compliance.'
      ));

      const eSec = _section('Editions — features scale with tier');
      const eg = _el('div', 'ss-grid');
      EDITIONS.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        eg.appendChild(c);
      });
      eSec.appendChild(eg);
      const info = _el('div', 'info-box');
      info.innerHTML = `Editions are <strong>cumulative</strong>: each tier includes everything below it. Pick the lowest tier that meets your security and feature needs — e.g. 90-day Time Travel and multi-cluster require <strong>Enterprise</strong>; PrivateLink and customer-managed keys require <strong>Business Critical</strong>.`;
      eSec.appendChild(info);
      page.appendChild(eSec);

      const cSec = _section('Ways to Connect');
      const cg = _el('div', 'ss-grid');
      CONNECT.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        cg.appendChild(c);
      });
      cSec.appendChild(cg);
      page.appendChild(cSec);

      const nSec = _section('Regions & Network Security');
      if (cv) nSec.appendChild(cv.create(NET_SQL, 'sql', 'Network policy'));
      page.appendChild(nSec);

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
  window.SnowflakeViz.Modules.editions = EdModule;
})();
