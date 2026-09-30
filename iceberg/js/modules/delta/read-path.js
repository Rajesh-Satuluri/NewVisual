/* Delta Lake — Read Path (log replay + data skipping), animated */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;
  const W = 760, H = 470;

  function buildSVG() {
    return K.svgEl(W, H, `
<defs><marker id="drp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#484f58"/></marker></defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta read path — Brazil 2024 query</text>

<!-- Spark -->
<g id="drp-spark"><rect x="14" y="34" width="150" height="92" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="28" y="56" font-size="15">⚡</text><text x="50" y="55" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Spark query</text>
  <text x="28" y="76" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,.7)">WHERE country='BR'</text>
  <text x="28" y="88" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,.7)">AND order_date IN 2024</text>
  <text x="28" y="106" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">predicate pushdown</text></g>
<rect id="drp-hl-spark" x="12" y="32" width="154" height="96" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>
<line x1="164" y1="80" x2="206" y2="80" stroke="#484f58" stroke-width="1.5" marker-end="url(#drp-arr)"/>

<!-- last_checkpoint + checkpoint -->
<g id="drp-ckpt"><rect x="208" y="40" width="200" height="60" rx="7" fill="#241a08" stroke="#ffb020" stroke-width="1.5"/>
  <text x="222" y="60" font-size="12">📦</text><text x="242" y="58" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">checkpoint.parquet</text>
  <text x="242" y="72" font-family="ui-monospace" font-size="8" fill="rgba(255,176,32,.75)">_last_checkpoint → v840</text>
  <text x="242" y="86" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">cumulative state @ v840</text></g>
<rect id="drp-hl-ckpt" x="206" y="38" width="204" height="64" rx="8" fill="none" stroke="#ffb020" stroke-width="2.5" opacity="0"/>
<line x1="308" y1="100" x2="308" y2="122" stroke="#484f58" stroke-width="1.5" marker-end="url(#drp-arr)"/>

<!-- tail commits -->
<g id="drp-tail"><rect x="208" y="124" width="200" height="54" rx="7" fill="#12101f" stroke="#a371f7" stroke-width="1.5"/>
  <text x="222" y="144" font-size="12">📄</text><text x="242" y="142" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">replay commits 841–847</text>
  <text x="242" y="156" font-family="ui-monospace" font-size="8" fill="rgba(163,113,247,.75)">7 JSON commits after ckpt</text>
  <text x="242" y="169" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">apply add/remove actions</text></g>
<rect id="drp-hl-tail" x="206" y="122" width="204" height="58" rx="8" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>
<line x1="308" y1="178" x2="308" y2="200" stroke="#484f58" stroke-width="1.5" marker-end="url(#drp-arr)"/>

<!-- live file set -->
<g id="drp-fileset"><rect x="208" y="202" width="200" height="52" rx="7" fill="#0c141f" stroke="#8b949e" stroke-width="1.3"/>
  <text x="242" y="222" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">live file set</text>
  <text x="242" y="236" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,.7)">24,000 files · 38.4 TB</text>
  <text x="222" y="222" font-size="12">🗂</text></g>
<rect id="drp-hl-fileset" x="206" y="200" width="204" height="56" rx="8" fill="none" stroke="#8b949e" stroke-width="2.5" opacity="0"/>

<!-- data skipping -->
<g id="drp-skip" opacity="0">
  <rect x="430" y="196" width="170" height="70" rx="7" fill="rgba(248,81,73,.1)" stroke="#f85149" stroke-width="1.3"/>
  <text x="515" y="216" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#f85149">data skipping</text>
  <text x="515" y="232" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,.8)">min/max stats in log</text>
  <text x="515" y="248" text-anchor="middle" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">23,690 skipped</text>
  <text x="515" y="260" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.7)">98.7% of files</text>
  <line x1="428" y1="228" x2="412" y2="228" stroke="#f85149" stroke-width="1.2"/>
</g>
<line x1="308" y1="254" x2="308" y2="300" stroke="#484f58" stroke-width="1.5" marker-end="url(#drp-arr)"/>

<!-- parquet read -->
<g id="drp-read"><rect x="208" y="302" width="200" height="54" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="222" y="322" font-size="12">🗄</text><text x="242" y="320" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">read 310 Parquet files</text>
  <text x="242" y="334" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,.75)">10.2 GB · 62 executors</text>
  <text x="242" y="347" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">+ apply deletion vectors</text></g>
<rect id="drp-hl-read" x="206" y="300" width="204" height="58" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- results -->
<g id="drp-results" opacity="0">
  <rect x="470" y="300" width="270" height="120" rx="9" fill="#0a1f10" stroke="#56d364" stroke-width="1.6"/>
  <text x="488" y="326" font-size="15">✅</text><text x="512" y="325" font-family="system-ui" font-size="12" font-weight="700" fill="#e6edf3">Results</text>
  <text x="488" y="350" font-family="ui-monospace" font-size="11" fill="#56d364">847,293 rows</text>
  <text x="488" y="368" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,.7)">country=BR · order_date 2024</text>
  <text x="488" y="390" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">4.2 seconds ⚡</text>
  <text x="488" y="408" font-family="system-ui" font-size="9" fill="rgba(86,211,100,.7)">vs ~180 min full scan → 2,571×</text>
</g>
<line x1="408" y1="330" x2="466" y2="360" stroke="#56d364" stroke-width="0" opacity="0"/>
`);
  }

  const stepData = [
    { label: 'Query submitted', desc: 'Spark parses WHERE country=\'BR\' AND order_date in 2024 and pushes the predicates down to the Delta scan. No data read yet.' },
    { label: 'Resolve latest version', desc: 'The catalog resolves the table; Delta reads _last_checkpoint to find the newest checkpoint (v840) and the current version (v847).' },
    { label: 'Load the checkpoint', desc: 'Instead of replaying 847 JSON commits from version 0, Delta loads checkpoint.parquet — a cumulative snapshot of all live add actions and the schema at v840.' },
    { label: 'Replay the tail', desc: 'Only the 7 commits after the checkpoint (841–847) are replayed, applying their add/remove actions. Read latency stays flat no matter how long the history grows.' },
    { label: 'Build the live file set', desc: 'Replay yields the exact live set: 24,000 Parquet files (38.4 TB). Each file’s add action carries its partition values and min/max column stats.' },
    { label: 'Data skipping', desc: 'Partition values prune non-BR files; min/max order_date stats eliminate the rest that can’t overlap 2024. 23,690 of 24,000 files are skipped — 98.7% — before any data is read.' },
    { label: 'Read the survivors', desc: 'Only 310 files (10.2 GB) are read across 62 executors, with column projection (3 of 47 columns) and any deletion vectors applied on the fly.' },
    { label: 'Results returned', desc: '847,293 matching orders in 4.2 seconds — versus ~180 minutes for a naive full scan. A 2,571× speedup, driven entirely by the log’s statistics.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    const S = (id, g) => AE.fnStep('', '', () => fx.show(id, g), () => fx.hide(id), 2600);
    return [
      AE.fnStep('', '', () => fx.show('drp-hl-spark', 'blue'), () => fx.hide('drp-hl-spark'), 2400),
      AE.fnStep('', '', () => { fx.unglow('drp-hl-spark'); fx.show('drp-hl-ckpt', 'amber'); }, () => fx.hide('drp-hl-ckpt'), 2600),
      AE.fnStep('', '', () => { fx.show('drp-hl-ckpt', 'amber'); }, () => fx.hide('drp-hl-ckpt'), 2600),
      AE.fnStep('', '', () => { fx.unglow('drp-hl-ckpt'); fx.show('drp-hl-tail', 'purple'); }, () => fx.hide('drp-hl-tail'), 2800),
      AE.fnStep('', '', () => { fx.unglow('drp-hl-tail'); fx.show('drp-hl-fileset'); }, () => fx.hide('drp-hl-fileset'), 2600),
      AE.fnStep('', '', () => { fx.show('drp-hl-fileset'); fx.show('drp-skip', 'red'); }, () => { fx.hide('drp-skip'); fx.hide('drp-hl-fileset'); }, 3200),
      AE.fnStep('', '', () => { fx.show('drp-hl-read', 'green'); }, () => fx.hide('drp-hl-read'), 2800),
      AE.fnStep('', '', () => { fx.show('drp-hl-read'); fx.show('drp-results', 'green'); }, () => { fx.hide('drp-results'); fx.hide('drp-hl-read'); }, 3600),
    ];
  }

  K.animatedModule({
    id: 'read-path', title: 'Read Path (Log Replay)', group: 'read-ops',
    intro: 'How a Delta query reaches only the data it needs: load a checkpoint, replay the tail, then skip 98.7% of files using log statistics. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">Query</div>
      <div class="dk-sql"><span class="dk-kw">SELECT</span> order_id, total_amount
<span class="dk-kw">FROM</span> orders
<span class="dk-kw">WHERE</span> country = <span class="dk-str">'BR'</span>
  <span class="dk-kw">AND</span> order_date <span class="dk-kw">BETWEEN</span> <span class="dk-str">'2024-01-01'</span> <span class="dk-kw">AND</span> <span class="dk-str">'2024-12-31'</span>;</div>
      <div class="dk-micro">Scan statistics</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Files read</div><div class="dk-stat-v green">310</div><div class="dk-stat-s">of 24,000</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Skip rate</div><div class="dk-stat-v green">98.7%</div><div class="dk-stat-s">via log stats</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Data read</div><div class="dk-stat-v blue">10.2 GB</div><div class="dk-stat-s">of 38.4 TB</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Speedup</div><div class="dk-stat-v orange">2,571×</div><div class="dk-stat-s">4.2s vs 180m</div></div>
      </div>`,
  });
})();
