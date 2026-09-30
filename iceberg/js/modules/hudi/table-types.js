/* ============================================================
   Apache Hudi — Copy-on-Write vs Merge-on-Read (animated).
   One AnimationEngine drives BOTH panes in lockstep: left = CoW
   (rewrite base file), right = MoR (append log file, compact later).
   Uses HudiKit.animatedModule (single engine → controls bar).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.HudiKit;
  const W = 880, H = 470;

  function rows(x, y) {
    const data = ['ord_5521 · v2', 'ord_4410 · v1', 'ord_3277 · v1', 'ord_9910 · v1'];
    return data.map((d, i) => {
      const ry = y + 8 + i * 20, upd = i === 1;
      return `<g>
        <rect x="${x + 8}" y="${ry}" width="150" height="16" rx="3" fill="${upd ? 'rgba(20,184,166,.12)' : 'rgba(255,255,255,.02)'}" stroke="${upd ? 'rgba(20,184,166,.6)' : 'rgba(139,148,158,.25)'}" stroke-width="1"/>
        <text x="${x + 15}" y="${ry + 11.5}" font-family="ui-monospace" font-size="8.5" fill="${upd ? '#7ff0df' : '#a9b2bd'}">${d}${upd ? '  ← upsert' : ''}</text>
      </g>`;
    }).join('');
  }

  function buildSVG() {
    return K.svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#08110f"/>
<text x="16" y="20" font-family="system-ui" font-size="10" fill="rgba(139,148,158,.45)" font-weight="600" letter-spacing="1">ShopKart — UPSERT order ord_4410 (amount changed) into file group fg-0001</text>
<line x1="440" y1="40" x2="440" y2="452" stroke="#16332d" stroke-width="1.5" stroke-dasharray="4 4"/>

<!-- LEFT: Copy-on-Write -->
<text x="30" y="52" font-family="system-ui" font-size="13" font-weight="800" fill="#34d399">Copy-on-Write (CoW)</text>
<text x="30" y="68" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.55)">rewrite the base file; reads stay clean</text>
<g id="cow-base">
  <rect x="30" y="82" width="180" height="104" rx="8" fill="#0c1614" stroke="#34d399" stroke-width="1.3"/>
  <text x="40" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9df5dc">fg-0001 base .parquet</text>
  ${rows(30, 100)}
</g>
<g id="cow-remove" opacity="0">
  <rect x="30" y="82" width="180" height="104" rx="8" fill="rgba(248,81,73,.14)" stroke="#f85149" stroke-width="1.4"/>
  <line x1="36" y1="88" x2="204" y2="180" stroke="#f85149" stroke-width="1.5"/>
  <text x="200" y="98" text-anchor="end" font-family="system-ui" font-size="8" font-weight="700" fill="#f85149">old slice</text>
</g>
<g id="cow-new" opacity="0">
  <rect x="234" y="82" width="180" height="104" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="244" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#7ee787">fg-0001 base .parquet (new)</text>
  <text x="244" y="112" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">full slice, upsert applied</text>
  <text x="244" y="130" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_5521 · v2</text>
  <text x="244" y="144" font-family="ui-monospace" font-size="8.5" fill="#7ff0df">ord_4410 · v2 ✓</text>
  <text x="244" y="158" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_3277 · v1</text>
  <text x="244" y="172" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_9910 · v1</text>
</g>
<g id="cow-arrow" opacity="0"><path d="M214 134 h16" stroke="#56d364" stroke-width="1.6" marker-end="url(#hk-ah)"/></g>
<g id="cow-commit" opacity="0">
  <rect x="30" y="202" width="384" height="48" rx="8" fill="#0d1117" stroke="#34d399" stroke-width="1.2"/>
  <text x="42" y="221" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9df5dc">timeline: t3.commit  (completed)</text>
  <text x="42" y="238" font-family="ui-monospace" font-size="8" fill="#8b949e">write cost: rewrite base file · read cost: none</text>
</g>
<g id="cow-read" opacity="0">
  <rect x="30" y="264" width="384" height="38" rx="8" fill="rgba(52,211,153,.07)" stroke="#34d399" stroke-width="1"/>
  <text x="42" y="282" font-family="system-ui" font-size="9.5" font-weight="700" fill="#34d399">Reader: opens the new base file — no merge.</text>
  <text x="42" y="296" font-family="ui-monospace" font-size="8" fill="#8b949e">clean columnar scan</text>
</g>

<!-- RIGHT: Merge-on-Read -->
<text x="466" y="52" font-family="system-ui" font-size="13" font-weight="800" fill="#2dd4bf">Merge-on-Read (MoR)</text>
<text x="466" y="68" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.55)">append a log file; compact later</text>
<g id="mor-base">
  <rect x="466" y="82" width="180" height="104" rx="8" fill="#0c1614" stroke="#2dd4bf" stroke-width="1.3"/>
  <text x="476" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9df5dc">fg-0001 base .parquet</text>
  ${rows(466, 100)}
</g>
<g id="mor-log" opacity="0">
  <rect x="662" y="118" width="150" height="52" rx="7" fill="#08201d" stroke="#2dd4bf" stroke-width="1.3"/>
  <text x="672" y="134" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#7ff0df">.log.1 (avro)</text>
  <text x="672" y="148" font-family="ui-monospace" font-size="7.5" fill="rgba(127,240,223,.75)">ord_4410 · v2 (delta)</text>
  <text x="672" y="161" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">base untouched</text>
</g>
<g id="mor-arrow" opacity="0"><path d="M648 144 h12" stroke="#2dd4bf" stroke-width="1.6" marker-end="url(#hk-ah2)"/></g>
<g id="mor-commit" opacity="0">
  <rect x="466" y="202" width="346" height="48" rx="8" fill="#0d1117" stroke="#2dd4bf" stroke-width="1.2"/>
  <text x="478" y="221" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9df5dc">timeline: t3.deltacommit  (completed)</text>
  <text x="478" y="238" font-family="ui-monospace" font-size="8" fill="#8b949e">write cost: tiny · read cost: merge log</text>
</g>
<g id="mor-read" opacity="0">
  <rect x="466" y="264" width="346" height="38" rx="8" fill="rgba(45,212,191,.07)" stroke="#2dd4bf" stroke-width="1"/>
  <text x="478" y="282" font-family="system-ui" font-size="9.5" font-weight="700" fill="#2dd4bf">Reader: base ⊕ log merged on the fly.</text>
  <text x="478" y="296" font-family="ui-monospace" font-size="8" fill="#8b949e">merge step until compaction</text>
</g>
<g id="mor-compact" opacity="0">
  <rect x="466" y="316" width="346" height="40" rx="8" fill="rgba(86,211,100,.07)" stroke="#56d364" stroke-width="1"/>
  <text x="478" y="334" font-family="system-ui" font-size="9.5" font-weight="700" fill="#7ee787">compaction: merges log → new base slice.</text>
  <text x="478" y="348" font-family="ui-monospace" font-size="8" fill="#8b949e">t4.compaction · now equivalent to CoW</text>
</g>

<g id="conv" opacity="0">
  <rect x="30" y="376" width="820" height="72" rx="10" fill="#0c1614" stroke="#8b94a3" stroke-width="1.2"/>
  <text x="46" y="398" font-family="system-ui" font-size="11" font-weight="800" fill="#c9d3e0">Same outcome, opposite cost profile</text>
  <text x="46" y="416" font-family="system-ui" font-size="9.5" fill="#a9b2bd">CoW pays at WRITE time (rewrite the base file) so reads are clean columnar scans.</text>
  <text x="46" y="432" font-family="system-ui" font-size="9.5" fill="#a9b2bd">MoR pays a little at READ time (merge log files) until compaction — ideal for frequent, low-latency upserts.</text>
</g>

<defs>
  <marker id="hk-ah" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#56d364"/></marker>
  <marker id="hk-ah2" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#2dd4bf"/></marker>
</defs>
`);
  }

  const STEP_DATA = [
    { label: 'The same upsert, both table types', desc: 'ShopKart upserts one order into file group fg-0001. Both a CoW and a MoR table start from the identical base file; row 2 (ord_4410) is the update target.' },
    { label: 'CoW rewrites · MoR appends a log', desc: 'CoW writes a NEW base file with the update applied. MoR leaves the base file alone and appends a small Avro log file carrying just the delta.' },
    { label: 'Both record an instant', desc: 'CoW commits t3.commit; MoR commits t3.deltacommit. CoW paid a full base-file rewrite; MoR paid almost nothing.' },
    { label: 'Read time diverges', desc: 'CoW reads the new base file directly — no merge. MoR scans the base file and merges the log on the fly — a small read-time cost until compaction.' },
    { label: 'Compaction converges them', desc: 'MoR compaction (t4) merges the log into a fresh base slice — now identical to CoW’s result. Same outcome, opposite cost profile: write-time vs read-time.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    const defs = [
      { enter() {}, exit() {} },
      { enter() { fx.show('cow-arrow', 'green'); fx.show('cow-new', 'green'); fx.show('cow-remove', 'red'); fx.show('mor-arrow', 'teal'); fx.show('mor-log', 'teal'); },
        exit() { fx.hide('cow-arrow'); fx.hide('cow-new'); fx.hide('cow-remove'); fx.hide('mor-arrow'); fx.hide('mor-log'); } },
      { enter() { fx.show('cow-commit', 'emerald'); fx.show('mor-commit', 'teal'); },
        exit() { fx.hide('cow-commit'); fx.hide('mor-commit'); } },
      { enter() { fx.show('cow-read', 'emerald'); fx.show('mor-read', 'teal'); },
        exit() { fx.hide('cow-read'); fx.hide('mor-read'); } },
      { enter() { fx.show('mor-compact', 'green'); fx.show('conv'); },
        exit() { fx.hide('mor-compact'); fx.hide('conv'); } },
    ];
    return defs.map((d, i) => AE.fnStep(STEP_DATA[i].label, STEP_DATA[i].desc, d.enter, d.exit, 2600));
  }

  K.animatedModule({
    id: 'table-types', title: 'CoW vs MoR', group: 'start',
    intro: 'One engine drives both panes. Watch how Copy-on-Write and Merge-on-Read handle the very same upsert.',
    buildSVG, buildSteps, stepData: STEP_DATA,
    panelHTML: `
      <div class="hk-micro">Choose per table</div>
      <div class="hk-sql"><span class="hk-kw">hoodie.datasource.write.table.type</span>
  = <span class="hk-str">COPY_ON_WRITE</span> | <span class="hk-str">MERGE_ON_READ</span></div>
      <div class="hk-stats">
        <div class="hk-stat"><div class="hk-stat-l">CoW</div><div class="hk-stat-v emerald">reads</div><div class="hk-stat-s">fast · heavy writes</div></div>
        <div class="hk-stat"><div class="hk-stat-l">MoR</div><div class="hk-stat-v teal">writes</div><div class="hk-stat-s">fast · merge on read</div></div>
      </div>`,
  });
})();
