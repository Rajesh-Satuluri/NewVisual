/* ============================================================
   Delta Lake — Architecture (animated)
   Layered model: query engine → catalog → _delta_log (JSON
   commits + checkpoint) → immutable Parquet files. Built on
   DeltaKit so it inherits the standard page + controls wiring.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;

  const W = 760, H = 470;

  function commitTiles() {
    let out = '';
    const xs = 196, y = 214, w = 34, h = 40, gap = 8;
    for (let i = 0; i < 8; i++) {
      const x = xs + i * (w + gap);
      const isC = i === 7;
      out += `
        <g id="arc-commit-${i}">
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${isC ? '#241a08' : '#1a1030'}" stroke="${isC ? '#ffb020' : '#a371f7'}" stroke-width="1.3"/>
          <text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="${isC ? '#ffb020' : '#c9b6f7'}">${isC ? 'ckpt' : String(i).padStart(2, '0')}</text>
          <text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" font-family="ui-monospace" font-size="6.5" fill="rgba(139,148,158,.6)">${isC ? '.parquet' : '.json'}</text>
        </g>`;
    }
    return out;
  }
  function dataTiles() {
    let out = '';
    const xs = 250, y = 388, w = 40, h = 34, gap = 10;
    for (let i = 0; i < 6; i++) {
      const x = xs + i * (w + gap);
      out += `<g id="arc-file-${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#0a1f10" stroke="#56d364" stroke-width="1.2"/>
        <text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="13">🗄</text></g>`;
    }
    return out;
  }

  function buildSVG() {
    return K.svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta Lake — table architecture</text>

<!-- Engine -->
<g id="arc-engine">
  <rect x="270" y="30" width="220" height="52" rx="9" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="380" y="52" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#e6edf3">⚡ Query Engine</text>
  <text x="380" y="68" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,.7)">Spark · Trino · Flink · DuckDB · delta-rs</text>
</g>
<rect id="arc-hl-engine" x="268" y="28" width="224" height="56" rx="10" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>
<line x1="380" y1="82" x2="380" y2="104" stroke="#484f58" stroke-width="1.5" marker-end="url(#arc-arr)"/>

<!-- Catalog -->
<g id="arc-catalog">
  <rect x="270" y="106" width="220" height="46" rx="8" fill="#161b22" stroke="#8b949e" stroke-width="1.3"/>
  <text x="380" y="126" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#e6edf3">📖 Catalog / path</text>
  <text x="380" y="141" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,.6)">Unity Catalog → s3://shopkart/orders</text>
</g>
<rect id="arc-hl-catalog" x="268" y="104" width="224" height="50" rx="9" fill="none" stroke="#e3b341" stroke-width="2.5" opacity="0"/>
<line x1="380" y1="152" x2="380" y2="174" stroke="#484f58" stroke-width="1.5" marker-end="url(#arc-arr)"/>

<!-- _delta_log -->
<g id="arc-log">
  <rect x="176" y="182" width="408" height="86" rx="9" fill="#12101f" stroke="#a371f7" stroke-width="1.5"/>
  <text x="190" y="200" font-family="ui-monospace" font-size="10" font-weight="700" fill="#c9b6f7">_delta_log/</text>
  <text x="470" y="200" text-anchor="end" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.55)">ordered commits · source of truth</text>
  ${commitTiles()}
</g>
<rect id="arc-hl-log" x="174" y="180" width="412" height="90" rx="10" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>
<rect id="arc-hl-ckpt" x="440" y="212" width="38" height="44" rx="5" fill="none" stroke="#ffb020" stroke-width="2.5" opacity="0"/>

<!-- Commit-contents popover -->
<g id="arc-actions" opacity="0">
  <rect x="596" y="176" width="150" height="150" rx="8" fill="#0d1117" stroke="#a371f7" stroke-width="1.3"/>
  <text x="608" y="194" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#c9b6f7">0004.json</text>
  <text x="608" y="212" font-family="ui-monospace" font-size="8" fill="#8b949e">{ protocol }</text>
  <text x="608" y="228" font-family="ui-monospace" font-size="8" fill="#8b949e">{ metaData }</text>
  <text x="608" y="244" font-family="ui-monospace" font-size="8" fill="#56d364">{ add: file-9 }</text>
  <text x="608" y="260" font-family="ui-monospace" font-size="8" fill="#56d364">{ add: file-10 }</text>
  <text x="608" y="276" font-family="ui-monospace" font-size="8" fill="#f85149">{ remove: file-2 }</text>
  <text x="608" y="292" font-family="ui-monospace" font-size="8" fill="#8b949e">{ commitInfo }</text>
  <text x="608" y="313" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,.5)">one atomic version</text>
</g>
<line x1="176" y1="225" x2="120" y2="225" stroke="#484f58" stroke-width="0" opacity="0"/>

<line x1="380" y1="268" x2="380" y2="360" stroke="#484f58" stroke-width="1.5" marker-end="url(#arc-arr)"/>
<text x="388" y="316" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.5)">add/remove reference files</text>

<!-- Data files -->
<g id="arc-files">
  <rect x="196" y="366" width="368" height="72" rx="9" fill="#0a1f10" stroke="#56d364" stroke-width="1.4" opacity=".55"/>
  <text x="210" y="382" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">Immutable Parquet data files</text>
  ${dataTiles()}
</g>
<rect id="arc-hl-files" x="194" y="364" width="372" height="76" rx="10" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- Skip note -->
<g id="arc-skip" opacity="0">
  <rect x="24" y="366" width="150" height="72" rx="8" fill="rgba(86,211,100,.06)" stroke="#56d364" stroke-width="1.2"/>
  <text x="34" y="386" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">Data skipping</text>
  <text x="34" y="402" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.8)">per-file min/max stats</text>
  <text x="34" y="415" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.8)">live in the log →</text>
  <text x="34" y="428" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.8)">skip files before read</text>
</g>

<defs>
  <marker id="arc-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#484f58"/></marker>
</defs>`);
  }

  const stepData = [
    { label: 'Four layers', desc: 'Delta is a table format: an engine reads/writes immutable Parquet files, and a transaction log (the _delta_log) records what those files mean at every version. The catalog just points to the table location.' },
    { label: 'Query engine', desc: 'Spark, Trino, Flink, DuckDB or delta-rs all speak the Delta protocol. The engine is pluggable — the table format is the same underneath.' },
    { label: 'Catalog resolves the table', desc: 'Unity Catalog (or a plain path) resolves orders → s3://shopkart/orders. The catalog holds no file lists; it only locates the table root and its _delta_log.' },
    { label: 'The _delta_log is truth', desc: 'Inside _delta_log are ordered JSON commit files — 0000.json, 0001.json, … — one per version. Applying them in order reconstructs the exact set of files and the schema.' },
    { label: 'A commit is a set of actions', desc: 'Each commit contains actions: protocol, metaData, add (a data file + its stats), remove (a tombstone), and commitInfo. One version = one atomic set of actions.' },
    { label: 'Checkpoints bound replay', desc: 'Every 10 commits Delta writes a Parquet checkpoint of cumulative state. Readers start from the latest checkpoint and replay only the commits after it — history never slows reads down.' },
    { label: 'Immutable data files', desc: 'The actual rows live in immutable Parquet files. Writers never edit a file in place; they add new files and remove (tombstone) old ones via the log.' },
    { label: 'Reads skip most files', desc: 'To read, the engine replays the log to the current file set, then uses each add’s min/max stats to skip files that cannot match — often 90%+ of them — before touching any data.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    return [
      AE.fnStep('Four layers', '', () => {
        fx.glow('arc-engine', 'blue'); fx.glow('arc-catalog', 'amber'); fx.glow('arc-log', 'purple'); fx.glow('arc-files', 'green');
      }, () => { ['arc-engine','arc-catalog','arc-log','arc-files'].forEach(id => fx.unglow(id)); }, 2600),
      AE.fnStep('Engine', '', () => fx.show('arc-hl-engine', 'blue'), () => fx.hide('arc-hl-engine'), 2200),
      AE.fnStep('Catalog', '', () => { fx.unglow('arc-hl-engine'); fx.show('arc-hl-catalog', 'amber'); }, () => fx.hide('arc-hl-catalog'), 2400),
      AE.fnStep('Log', '', () => { fx.show('arc-hl-log', 'purple'); }, () => fx.hide('arc-hl-log'), 2600),
      AE.fnStep('Actions', '', () => { fx.show('arc-hl-log'); fx.show('arc-actions', 'purple'); }, () => { fx.hide('arc-actions'); fx.hide('arc-hl-log'); }, 3000),
      AE.fnStep('Checkpoint', '', () => { fx.show('arc-hl-ckpt', 'amber'); }, () => fx.hide('arc-hl-ckpt'), 2600),
      AE.fnStep('Files', '', () => { fx.unglow('arc-hl-ckpt'); fx.attr('arc-files', 'opacity', '1'); fx.show('arc-hl-files', 'green'); }, () => fx.hide('arc-hl-files'), 2600),
      AE.fnStep('Skip', '', () => { fx.show('arc-hl-files'); fx.show('arc-skip', 'green'); }, () => { fx.hide('arc-skip'); fx.hide('arc-hl-files'); }, 3200),
    ];
  }

  K.animatedModule({
    id: 'architecture', title: 'Architecture', group: 'start',
    intro: 'How Delta Lake layers an engine, a catalog, the _delta_log, and immutable Parquet files into one ACID table. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">The stack</div>
      <div class="dk-sql"><span class="dk-com"># engine → catalog → _delta_log → parquet</span>
Query Engine   <span class="dk-com">(Spark/Trino/…)</span>
  → Catalog    <span class="dk-com">(Unity / path)</span>
  → _delta_log <span class="dk-com">(json commits + checkpoints)</span>
  → Parquet    <span class="dk-com">(immutable data files)</span></div>
      <div class="dk-micro">Key idea</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Source of truth</div><div class="dk-stat-v purple">_delta_log</div><div class="dk-stat-s">ordered commits</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Checkpoint</div><div class="dk-stat-v orange">every 10</div><div class="dk-stat-s">bounds replay</div></div>
      </div>`,
  });
})();
