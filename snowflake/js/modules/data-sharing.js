/* ============================================================
   Data Sharing Ecosystem Module — Secure Data Sharing,
   Marketplace, Listings, Reader Accounts, Clean Rooms.
   ============================================================ */

(function () {
  'use strict';

  const MODES = [
    { n: 'Secure Direct Share', d: 'Share live objects with specific Snowflake accounts. Zero copy — consumers query your data with their own compute. Changes are instant.' },
    { n: 'Marketplace & Listings', d: 'Publish a listing (free, paid, or personalized) to discover-and-get data from thousands of providers, or monetize your own.' },
    { n: 'Reader Accounts', d: 'Share with consumers who are NOT on Snowflake — the provider creates and pays for a managed reader account.' },
    { n: 'Data Clean Rooms', d: 'Two parties join sensitive data under agreed rules without either exposing row-level data — e.g. Netflix + an advertiser measuring overlap.' },
  ];

  const SHARE_SQL = `-- Provider: share a live view with zero data movement
CREATE SHARE netflix_ad_share;
GRANT USAGE  ON DATABASE analytics_db              TO SHARE netflix_ad_share;
GRANT USAGE  ON SCHEMA analytics_db.public         TO SHARE netflix_ad_share;
GRANT SELECT ON VIEW analytics_db.public.engagement_summary
                                                   TO SHARE netflix_ad_share;
ALTER SHARE netflix_ad_share ADD ACCOUNTS = partner_acct;

-- Consumer: mount the share as a database and query it live
CREATE DATABASE shared_engagement FROM SHARE netflix_provider.netflix_ad_share;
SELECT * FROM shared_engagement.public.engagement_summary;`;

  const DSModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Platform',
        'Data Sharing Ecosystem',
        'Snowflake\'s killer feature: share live data across accounts, clouds, and regions with no copying, no ETL, no API. The consumer queries your data in place with their own compute — you both see the same bytes.'
      ));

      const mSec = _section('Ways to Share');
      const grid = _el('div', 'ss-grid');
      MODES.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      mSec.appendChild(grid);
      page.appendChild(mSec);

      const hSec = _section('How Zero-Copy Sharing Works');
      const info = _el('div', 'info-box');
      info.innerHTML = `A <strong>Share</strong> is a named grant object: the provider grants SELECT on views/tables to the share and adds consumer accounts. The consumer mounts it as a read-only database. No data leaves the provider\'s storage — the consumer\'s warehouse reads the provider\'s micro-partitions directly. Cross-region/cross-cloud sharing adds automatic replication under the hood.`;
      hSec.appendChild(info);
      if (cv) hSec.appendChild(cv.create(SHARE_SQL, 'sql', 'Provider → Consumer'));
      page.appendChild(hSec);

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
  window.SnowflakeViz.Modules.dataSharing = DSModule;
})();
