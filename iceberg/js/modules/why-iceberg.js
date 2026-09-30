/* ============================================================
   Why Iceberg Module
   Animated: 5 production problems + 3 innovations + comparison
   ============================================================ */

(function () {
  'use strict';

  const D = () => window.IcebergViz.Data;
  const C = () => window.IcebergViz.Concepts;

  const mod = {
    id: 'why-iceberg',
    title: 'Why Iceberg',
    group: 'foundations',
    _cleanups: [],

    render(container) {
      container.innerHTML = '';
      const page = document.createElement('div');
      page.className = 'why-page page-enter';
      page.innerHTML = _buildHTML();
      container.appendChild(page);
      _wireInteractions(page, this._cleanups);
      window.IcebergViz.AnimationControls.hide();
    },

    destroy() {
      this._cleanups.forEach(fn => fn && fn());
      this._cleanups = [];
    },
  };

  /* ── HTML ──────────────────────────────────────────────── */
  function _buildHTML() {
    return `
<style>
.why-page {
  overflow-y: auto;
  height: 100%;
}

.why-section {
  padding: var(--space-10) var(--space-8);
  max-width: 1100px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: var(--space-8);
}

.section-eyebrow {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--orange);
  margin-bottom: var(--space-2);
}

.section-h2 {
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  letter-spacing: -0.02em;
}

.section-lead {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  max-width: 640px;
}

/* Problem Cards */
.problems-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.problem-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--ease-base), box-shadow var(--ease-base);
}

.problem-card:hover { border-color: var(--red); }

.problem-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--red-subtle);
  border-bottom: 1px solid var(--border-default);
}

.problem-number {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--red-dim);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.problem-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.problem-badge {
  font-size: var(--text-xs);
  background: var(--bg-4);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.problem-body {
  padding: var(--space-4) var(--space-5);
}

.problem-incident-id {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--red);
  margin-bottom: var(--space-2);
}

.problem-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-3);
}

.problem-resolution {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--green);
  line-height: var(--leading-relaxed);
}

/* Innovations */
.innovations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.innovation-card {
  background: var(--bg-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  transition: border-color var(--ease-base), box-shadow var(--ease-base);
  position: relative;
  overflow: hidden;
}

.innovation-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: var(--radius-full) var(--radius-full) 0 0;
}

.innovation-card.card-blue::before { background: var(--blue); }
.innovation-card.card-purple::before { background: var(--purple); }
.innovation-card.card-orange::before { background: var(--orange); }

.innovation-card:hover { box-shadow: var(--shadow-md); }

.innovation-number {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.innovation-icon {
  font-size: 36px;
  margin-bottom: var(--space-3);
}

.innovation-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.innovation-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-4);
}

.innovation-impact {
  font-size: var(--text-sm);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  line-height: var(--leading-relaxed);
}

.card-blue .innovation-impact { background: var(--blue-subtle); color: var(--blue); }
.card-purple .innovation-impact { background: var(--purple-subtle); color: var(--purple); }
.card-orange .innovation-impact { background: var(--orange-subtle); color: var(--orange); }

/* Comparison Table */
.compare-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
}

table.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  min-width: 600px;
}

.compare-table th {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-2);
  text-align: left;
  font-weight: 600;
  font-size: var(--text-xs);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-default);
  white-space: nowrap;
}

.compare-table th.iceberg-col {
  color: var(--blue);
  background: rgba(74,174,255,0.05);
}

.compare-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.compare-table tr:last-child td { border-bottom: none; }
.compare-table tr:hover td { background: var(--bg-3); }

.compare-table td.feature-col {
  font-weight: 500;
  color: var(--text-primary);
}

.compare-table td.iceberg-col {
  background: rgba(74,174,255,0.04);
}

.check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  font-size: 13px;
}

.check.yes { background: var(--green-subtle); color: var(--green); }
.check.no  { background: var(--red-subtle);   color: var(--red); }
.check.partial { background: var(--yellow-subtle); color: var(--yellow); }

/* Origin Timeline */
.origin-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: var(--space-8);
}

.origin-timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--blue), var(--purple));
  border-radius: 2px;
}

.origin-event {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding-bottom: var(--space-6);
  position: relative;
}

.origin-event:last-child { padding-bottom: 0; }

.origin-dot {
  position: absolute;
  left: -27px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-1);
}

.origin-year {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  padding-top: 2px;
  min-width: 40px;
}

.origin-content-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.origin-content-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.why-divider {
  height: 1px;
  background: var(--border-default);
  margin: 0;
}
</style>

<!-- Hero -->
<div style="background:var(--bg-0);padding:56px var(--space-8) 48px;border-bottom:1px solid var(--border-default);">
<div style="max-width:700px">
  <div class="section-eyebrow">The Engineering Case</div>
  <h1 style="font-size:clamp(28px,4vw,48px);font-weight:800;letter-spacing:-0.03em;color:var(--text-primary);margin-bottom:var(--space-4)">
    Why Did Netflix Invent<br><span class="gradient-text">Apache Iceberg?</span>
  </h1>
  <p style="font-size:var(--text-md);color:var(--text-secondary);line-height:var(--leading-relaxed);max-width:580px">
    It's your first week as Principal Data Engineer at ShopKart. The CEO asks a simple question:
    how many orders were placed in Brazil last Black Friday? Your existing Hive platform
    cannot answer it. Here's exactly why — and how Iceberg solves every problem.
  </p>
</div>
</div>

<!-- The 5 Problems -->
<div class="why-section">
  <div class="section-header">
    <div class="section-eyebrow">The Root Cause</div>
    <h2 class="section-h2">Five Fatal Limitations of Hive + Parquet</h2>
    <p class="section-lead">
      These are not theoretical limitations. These are ShopKart production incidents
      with real incident IDs, real timelines, and real business impact.
    </p>
  </div>
  <div class="problems-grid">
    ${_problemCards()}
  </div>
</div>

<div class="why-divider"></div>

<!-- The 3 Innovations -->
<div class="why-section">
  <div class="section-header">
    <div class="section-eyebrow">The Solution</div>
    <h2 class="section-h2">Three Core Innovations</h2>
    <p class="section-lead">
      Iceberg solved the data lake problem with three architectural innovations
      that no previous format had combined.
    </p>
  </div>
  <div class="innovations-grid">
    ${_innovationCards()}
  </div>
</div>

<div class="why-divider"></div>

<!-- Comparison Table -->
<div class="why-section">
  <div class="section-header">
    <div class="section-eyebrow">Feature Comparison</div>
    <h2 class="section-h2">Iceberg vs. Delta Lake vs. Hudi vs. Hive</h2>
    <p class="section-lead">
      How Iceberg compares to alternative table formats on the features that matter
      most at production scale.
    </p>
  </div>
  <div class="compare-table-wrap">
    ${_comparisonTable()}
  </div>
</div>

<div class="why-divider"></div>

<!-- Origin Story -->
<div class="why-section">
  <div class="section-header">
    <div class="section-eyebrow">History</div>
    <h2 class="section-h2">The Iceberg Origin Story</h2>
    <p class="section-lead">
      Netflix created Iceberg in 2017 to solve problems at 10x the scale ShopKart faces.
    </p>
  </div>
  <div class="origin-timeline">
    ${_originTimeline()}
  </div>
</div>
`;
  }

  /* ── Problem Cards ─────────────────────────────────────── */
  function _problemCards() {
    const incidents = D().shopkart.incidents;
    const colors = ['#e53e3e','#dd6b20','#d69e2e','#2f855a','#2b6cb0'];
    return incidents.map((inc, i) => `
      <div class="problem-card">
        <div class="problem-card-header">
          <div class="problem-number" style="background:${colors[i]}">${i+1}</div>
          <div class="problem-title">${inc.problem}</div>
          <div class="problem-badge">${inc.date}</div>
        </div>
        <div class="problem-body">
          <div class="problem-incident-id">${inc.id}</div>
          <div class="problem-desc">${inc.description}</div>
          <div class="problem-resolution">
            <span style="flex-shrink:0">✓</span>
            <span>${inc.resolution}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ── Innovation Cards ──────────────────────────────────── */
  function _innovationCards() {
    const colors = ['card-blue', 'card-purple', 'card-orange'];
    return C().innovations.map((inn, i) => `
      <div class="innovation-card ${colors[i]}">
        <div class="innovation-number">Innovation ${inn.number} of 3</div>
        <div class="innovation-icon">${inn.icon}</div>
        <div class="innovation-title">${inn.title}</div>
        <div class="innovation-desc">${inn.description}</div>
        <div class="innovation-impact">💡 ${inn.impact}</div>
      </div>
    `).join('');
  }

  /* ── Comparison Table ──────────────────────────────────── */
  function _comparisonTable() {
    const data = D().formatComparison;

    function cell(val) {
      if (val === true)           return `<span class="check yes">✓</span>`;
      if (val === false)          return `<span class="check no">✗</span>`;
      if (val === 'limited' || val === 'partial') return `<span class="check partial">~</span>`;
      if (val === 'poor')         return `<span style="color:var(--red);font-size:var(--text-xs)">Poor</span>`;
      if (val === 'good')         return `<span style="color:var(--yellow);font-size:var(--text-xs)">Good</span>`;
      if (val === 'excellent')    return `<span style="color:var(--green);font-size:var(--text-xs)">Excellent</span>`;
      return `<span style="font-size:var(--text-xs);color:var(--text-secondary)">${val}</span>`;
    }

    const rows = data.map(r => `
      <tr>
        <td class="feature-col">${r.feature}</td>
        <td style="text-align:center">${cell(r.hive)}</td>
        <td style="text-align:center">${cell(r.deltaLake)}</td>
        <td style="text-align:center">${cell(r.hudi)}</td>
        <td class="iceberg-col" style="text-align:center">${cell(r.iceberg)}</td>
        <td style="font-size:var(--text-xs);color:var(--text-muted)">${r.notes}</td>
      </tr>
    `).join('');

    return `
      <table class="compare-table">
        <thead>
          <tr>
            <th style="min-width:180px">Feature</th>
            <th style="text-align:center">Hive</th>
            <th style="text-align:center">Delta Lake</th>
            <th style="text-align:center">Hudi</th>
            <th class="iceberg-col" style="text-align:center">Apache Iceberg</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /* ── Origin Timeline ───────────────────────────────────── */
  function _originTimeline() {
    const events = [
      { year: '2017', color: 'var(--blue)',   title: 'Netflix Creates Iceberg', desc: 'Ryan Blue and Daniel Weeks at Netflix create Iceberg to solve 20-40 minute partition discovery times, multi-day schema change rewrites, and silent data corruption from concurrent writers.' },
      { year: '2018', color: 'var(--purple)', title: 'Donated to Apache', desc: 'Netflix donates Iceberg to the Apache Software Foundation. The first open-source release makes the table format available to the entire industry.' },
      { year: '2019', color: 'var(--blue)',   title: 'Iceberg v1 Spec', desc: 'Version 1 of the Iceberg Table Spec introduces the core snapshot model, manifest hierarchy, hidden partitioning, and schema evolution.' },
      { year: '2020', color: 'var(--green)',  title: 'Apache Top-Level Project', desc: 'Iceberg graduates to an Apache top-level project. Adoption accelerates at Apple, LinkedIn, Stripe, Zalando, and Adobe.' },
      { year: '2021', color: 'var(--orange)', title: 'Iceberg v2 — Row-Level Deletes', desc: 'Version 2 adds position delete files, equality delete files, and sequence numbers — enabling efficient UPDATE and DELETE without full file rewrites.' },
      { year: '2024', color: 'var(--purple)', title: 'Dominant Format', desc: 'Iceberg becomes the dominant open table format in the industry, supported natively by Spark, Trino, Flink, Snowflake, Athena, Dremio, and hundreds of others.' },
      { year: '2025+', color: 'var(--teal)', title: 'Iceberg v3 in Development', desc: 'Version 3 introduces nanosecond timestamps, variant type, geometry support, and multi-level partitioning improvements.' },
    ];
    return events.map(ev => `
      <div class="origin-event">
        <div class="origin-dot" style="background:${ev.color}"></div>
        <div class="origin-year">${ev.year}</div>
        <div>
          <div class="origin-content-title">${ev.title}</div>
          <div class="origin-content-desc">${ev.desc}</div>
        </div>
      </div>
    `).join('');
  }

  /* ── Wire Interactions ─────────────────────────────────── */
  function _wireInteractions(page, cleanups) {
    const handler = (e) => {
      const el = e.target.closest('[data-nav]');
      if (el) window.IcebergViz.navigate(el.dataset.nav);
    };
    page.addEventListener('click', handler);
    cleanups.push(() => page.removeEventListener('click', handler));
  }

  /* ── Register ──────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['why-iceberg'] = mod;
})();
