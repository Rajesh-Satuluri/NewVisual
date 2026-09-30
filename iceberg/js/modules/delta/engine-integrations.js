/* Delta Lake — Engine Integrations (reading/static) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const ENGINES = [
    { n: 'Apache Spark', r: '✓', w: '✓', m: '✓', s: '✓', d: '✓', note: 'Reference engine; full DML, streaming, OPTIMIZE, DV.' },
    { n: 'Databricks', r: '✓', w: '✓', m: '✓', s: '✓', d: '✓', note: 'Delta’s home; liquid clustering, predictive OPTIMIZE, UniForm.' },
    { n: 'Trino / Presto', r: '✓', w: '✓', m: '✓', s: '–', d: '✓', note: 'Interactive SQL; reads DVs, supports MERGE/UPDATE/DELETE.' },
    { n: 'Apache Flink', r: '✓', w: '✓', m: '~', s: '✓', d: '✓', note: 'Streaming sink/source via the Delta connector.' },
    { n: 'DuckDB', r: '✓', w: '~', m: '–', s: '–', d: '✓', note: 'Fast local reads via the delta extension (delta-kernel).' },
    { n: 'Polars', r: '✓', w: '✓', m: '–', s: '–', d: '✓', note: 'Python dataframes over delta-rs.' },
    { n: 'delta-rs (Rust/Python)', r: '✓', w: '✓', m: '✓', s: '–', d: '✓', note: 'Engine-free library; powers Polars, pandas, and custom tools.' },
  ];
  function cell(v) {
    const map = { '✓': 'ok', '~': 'partial', '–': 'no' };
    return `<td class="c ${map[v]}">${v}</td>`;
  }
  function html() {
    const rows = ENGINES.map(e =>
      `<tr><td class="n">${e.n}</td>${cell(e.r)}${cell(e.w)}${cell(e.m)}${cell(e.s)}${cell(e.d)}<td class="note">${e.note}</td></tr>`).join('');
    return `
<style>
.dei { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.dei-wrap { max-width:940px; margin:0 auto; }
.dei-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin-bottom:8px; }
.dei-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:20px; }
.dei-tablewrap { overflow-x:auto; }
.dei-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:680px; }
.dei-table th, .dei-table td { padding:10px 12px; border-bottom:1px solid var(--border-default); text-align:center; }
.dei-table th { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); font-weight:800; }
.dei-table td.n { text-align:left; font-weight:700; color:var(--text-primary); white-space:nowrap; }
.dei-table td.note { text-align:left; color:var(--text-secondary); font-size:11.5px; }
.dei-table td.c { font-weight:800; }
.dei-table td.c.ok { color:var(--green); } .dei-table td.c.partial { color:var(--yellow); } .dei-table td.c.no { color:var(--text-disabled); }
.dei-legend { margin-top:14px; font-size:11.5px; color:var(--text-muted); }
.dei-note2 { margin-top:16px; padding:12px 14px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:8px; font-size:12.5px; color:var(--text-secondary); line-height:1.6; }
.dei-note2 b { color:var(--text-primary); }
</style>
<div class="dei page-enter">
  <div class="dei-wrap">
    <h1 class="dei-h1">Engine Integrations</h1>
    <p class="dei-lead">Delta Lake is an open protocol, not a single engine. The transaction log is a documented spec, so many
      engines read and write the same tables. The <strong>delta-kernel</strong> and <strong>delta-rs</strong> libraries let new
      tools support Delta without reimplementing the protocol.</p>
    <div class="dei-tablewrap">
      <table class="dei-table">
        <thead><tr><th class="n" style="text-align:left">Engine</th><th>Read</th><th>Write</th><th>MERGE/DML</th><th>Streaming</th><th>Deletion Vectors</th><th style="text-align:left">Notes</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="dei-legend">✓ full · ~ partial / evolving · – not yet</div>
    <div class="dei-note2"><b>Table features gate compatibility.</b> The <code>protocol</code> action lists the reader/writer
      features a table uses (e.g. deletionVectors, columnMapping). An engine reads a table only if it supports every required
      reader feature — which is why checking the protocol version matters before pointing a new engine at a table.</div>
  </div>
</div>`;
  }
  TV.registerModule('delta', {
    id: 'engine-integrations', title: 'Engine Integrations', group: 'advanced', format: 'delta',
    render(container) { container.className = ''; container.innerHTML = html(); },
    destroy() { TV.AnimationControls.hide(); },
  });
})();
