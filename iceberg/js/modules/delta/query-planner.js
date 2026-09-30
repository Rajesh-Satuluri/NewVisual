/* Delta Lake — Query Planner (predicate pushdown + file stat pruning), animated */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;
  const W = 760, H = 460;

  // 12 files with (country, date range, max amount) → drives which survive.
  const FILES = [
    { c: 'BR', d: '2024-03', mx: 900, keepAt: 4 }, { c: 'US', d: '2024-02', mx: 700, dropAt: 1 },
    { c: 'BR', d: '2023-11', mx: 800, dropAt: 2 }, { c: 'IN', d: '2024-05', mx: 650, dropAt: 1 },
    { c: 'BR', d: '2024-07', mx: 1200, keepAt: 4 }, { c: 'US', d: '2024-09', mx: 400, dropAt: 1 },
    { c: 'BR', d: '2024-01', mx: 300, dropAt: 3 }, { c: 'DE', d: '2024-06', mx: 950, dropAt: 1 },
    { c: 'BR', d: '2024-11', mx: 1500, keepAt: 4 }, { c: 'BR', d: '2022-08', mx: 600, dropAt: 2 },
    { c: 'US', d: '2024-04', mx: 880, dropAt: 1 }, { c: 'BR', d: '2024-09', mx: 720, keepAt: 4 },
  ];

  function buildSVG() {
    let tiles = '';
    FILES.forEach((f, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 24 + col * 132, y = 96 + row * 76;
      tiles += `
        <g id="qp-f-${i}"><rect x="${x}" y="${y}" width="118" height="62" rx="6" fill="#0a1f10" stroke="#56d364" stroke-width="1.2"/>
          <text x="${x + 10}" y="${y + 18}" font-family="ui-monospace" font-size="9" font-weight="700" fill="#e6edf3">file-${i}</text>
          <text x="${x + 10}" y="${y + 33}" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,.8)">country=${f.c}</text>
          <text x="${x + 10}" y="${y + 45}" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.65)">date~${f.d}</text>
          <text x="${x + 10}" y="${y + 56}" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.65)">max amt ${f.mx}</text></g>
        <g id="qp-x-${i}" opacity="0"><rect x="${x}" y="${y}" width="118" height="62" rx="6" fill="rgba(120,130,150,.55)" stroke="#48505f" stroke-width="1"/>
          <line x1="${x + 6}" y1="${y + 6}" x2="${x + 112}" y2="${y + 56}" stroke="#8b949e" stroke-width="1.2"/></g>`;
    });
    return K.svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta query planner — file pruning from log stats</text>
<g id="qp-pred"><rect x="24" y="34" width="712" height="44" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.3"/>
  <text x="40" y="54" font-family="ui-monospace" font-size="10" fill="#58a6ff">WHERE country='BR' AND order_date &gt;= '2024-01-01' AND total_amount &gt; 500</text>
  <text x="40" y="69" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,.6)">predicates pushed to the Delta scan — evaluated against each file's stats before any read</text></g>
${tiles}
<g id="qp-summary" opacity="0"><rect x="470" y="392" width="266" height="52" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="486" y="414" font-family="system-ui" font-size="11" font-weight="700" fill="#56d364">4 of 12 files survive</text>
  <text x="486" y="431" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,.8)">8 skipped by partition + min/max stats</text></g>
`);
  }

  const stepData = [
    { label: 'Push down predicates', desc: 'The planner extracts three predicates from the WHERE clause. Each will be tested against the min/max and partition stats every add action recorded in the log — no data is opened yet.' },
    { label: 'Partition pruning (country)', desc: 'country is a partition column, so files for US, IN and DE are eliminated outright — 5 files gone by directory/partition value alone.' },
    { label: 'Min/max on order_date', desc: 'Two remaining BR files have a max order_date before 2024 (a 2023 and a 2022 file). Their stats can’t overlap the range, so they’re skipped.' },
    { label: 'Min/max on total_amount', desc: 'One more BR file has a max total_amount of 300 — below the > 500 predicate — so no row in it can match. Skipped.' },
    { label: '4 files survive', desc: 'Only 4 of 12 files can possibly contain matching rows; the planner reads just those. This file-level skipping from log statistics is where Delta’s query speed comes from.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    const dropAtStep = (n) => FILES.map((f, i) => ({ f, i })).filter(x => x.f.dropAt === n).map(x => x.i);
    const step = (label, dropped) => AE.fnStep(label, '', () => dropped.forEach(i => fx.show('qp-x-' + i)),
      () => dropped.forEach(i => fx.hide('qp-x-' + i)), 2800);
    return [
      AE.fnStep('', '', () => fx.glow('qp-pred', 'blue'), () => fx.unglow('qp-pred'), 2400),
      step('', dropAtStep(1)),
      step('', dropAtStep(2)),
      step('', dropAtStep(3)),
      AE.fnStep('', '', () => fx.show('qp-summary', 'green'), () => fx.hide('qp-summary'), 3000),
    ];
  }

  K.animatedModule({
    id: 'query-planner', title: 'Query Planner', group: 'read-ops',
    intro: 'Watch the planner eliminate files using partition values and per-file min/max statistics — before reading a single byte. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">Why it works</div>
      <div class="dk-sql"><span class="dk-com"># every add action carries:</span>
{ path, partitionValues,
  stats: { minValues, maxValues,
           nullCount, numRecords } }</div>
      <div class="dk-micro">Pruning result</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files kept</div><div class="dk-stat-v green">4</div><div class="dk-stat-s">of 12</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Pruned by</div><div class="dk-stat-v blue">stats</div><div class="dk-stat-s">no data read</div></div>
      </div>`,
  });
})();
