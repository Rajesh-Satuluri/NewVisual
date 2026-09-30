/* Delta Lake — Checkpoints (animated) */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;
  const W = 760, H = 450;

  function commits() {
    let out = '';
    for (let i = 0; i <= 10; i++) {
      const x = 60 + i * 60, y = 70;
      const isC = i === 10;
      out += `<g id="cx-c-${i}"><rect x="${x}" y="${y}" width="46" height="52" rx="5" fill="${isC ? '#241a08' : '#12101f'}" stroke="${isC ? '#ffb020' : '#a371f7'}" stroke-width="1.3"/>
        <text x="${x + 23}" y="${y + 22}" text-anchor="middle" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="${isC ? '#ffb020' : '#c9b6f7'}">${isC ? 'ckpt' : String(i).padStart(2, '0')}</text>
        <text x="${x + 23}" y="${y + 38}" text-anchor="middle" font-family="ui-monospace" font-size="6.5" fill="rgba(139,148,158,.55)">${isC ? '.parq' : '.json'}</text></g>`;
    }
    return out;
  }

  function buildSVG() {
    return K.svgEl(W, H, `
<defs><marker id="cx-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#484f58"/></marker></defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta — why checkpoints exist</text>
<text x="60" y="52" font-family="ui-monospace" font-size="9" fill="rgba(163,113,247,.75)">_delta_log/  (a checkpoint every 10 commits)</text>
${commits()}
<rect id="cx-hl-all" x="54" y="64" width="552" height="64" rx="8" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>
<rect id="cx-hl-ckpt" x="654" y="64" width="52" height="64" rx="8" fill="none" stroke="#ffb020" stroke-width="2.5" opacity="0"/>

<!-- Reader A: naive -->
<g id="cx-readerA" opacity="0">
  <rect x="60" y="170" width="300" height="96" rx="9" fill="#0c141f" stroke="#f85149" stroke-width="1.4"/>
  <text x="76" y="194" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Reader without checkpoints</text>
  <text x="76" y="214" font-family="ui-monospace" font-size="8.5" fill="rgba(248,81,73,.85)">replays ALL commits from v0</text>
  <text x="76" y="230" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.75)">10 JSON reads → grows forever</text>
  <text x="76" y="250" font-family="system-ui" font-size="9" font-weight="700" fill="#f85149">O(history) — latency creeps up</text>
</g>

<!-- Reader B: checkpoint -->
<g id="cx-readerB" opacity="0">
  <rect x="400" y="170" width="306" height="96" rx="9" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="416" y="194" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Reader with checkpoints</text>
  <text x="416" y="214" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,.85)">load checkpoint.parquet (@v10)</text>
  <text x="416" y="230" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.75)">+ replay only commits 11+</text>
  <text x="416" y="250" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">O(1) startup — flat latency</text>
</g>

<!-- last_checkpoint -->
<g id="cx-last" opacity="0">
  <rect x="200" y="300" width="360" height="96" rx="9" fill="#241a08" stroke="#ffb020" stroke-width="1.4"/>
  <text x="380" y="324" text-anchor="middle" font-family="ui-monospace" font-size="10" font-weight="700" fill="#ffb020">_last_checkpoint</text>
  <text x="380" y="344" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,.85)">a tiny pointer file naming the newest checkpoint</text>
  <text x="380" y="362" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,.85)">so a reader finds v10 instantly, then reads the tail</text>
  <text x="380" y="382" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">checkpoints keep reads fast no matter how long history grows</text>
</g>
`);
  }

  const stepData = [
    { label: 'History grows', desc: 'Every write appends a JSON commit to _delta_log. After a busy day the orders table has thousands of commits — the log only ever grows.' },
    { label: 'The naive reader', desc: 'To learn the current file set, a reader must apply add/remove actions from every commit starting at version 0. That’s O(history) — read latency creeps up as the table ages.' },
    { label: 'Write a checkpoint', desc: 'Every 10 commits (by default) Delta writes a checkpoint: a single Parquet file snapshotting the cumulative live state — all surviving add actions plus protocol and metaData at that version.' },
    { label: 'The smart reader', desc: 'A reader now loads the latest checkpoint and replays only the handful of commits after it. Startup is O(1) in history size — latency stays flat forever.' },
    { label: '_last_checkpoint', desc: 'A tiny _last_checkpoint pointer names the newest checkpoint so readers find it without listing. This is the mechanism that let ShopKart’s dashboards stop slowing down as history piled up.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    return [
      AE.fnStep('', '', () => fx.show('cx-hl-all', 'purple'), () => fx.hide('cx-hl-all'), 2600),
      AE.fnStep('', '', () => { fx.show('cx-hl-all'); fx.show('cx-readerA', 'red'); }, () => { fx.hide('cx-readerA'); fx.hide('cx-hl-all'); }, 3000),
      AE.fnStep('', '', () => fx.show('cx-hl-ckpt', 'amber'), () => fx.hide('cx-hl-ckpt'), 2600),
      AE.fnStep('', '', () => { fx.show('cx-hl-ckpt'); fx.show('cx-readerB', 'green'); }, () => { fx.hide('cx-readerB'); fx.hide('cx-hl-ckpt'); }, 3000),
      AE.fnStep('', '', () => { fx.show('cx-hl-ckpt'); fx.show('cx-last', 'amber'); }, () => { fx.hide('cx-last'); fx.hide('cx-hl-ckpt'); }, 3400),
    ];
  }

  K.animatedModule({
    id: 'checkpoint', title: 'Checkpoints', group: 'log',
    intro: 'Checkpoints bound how much log a reader must replay, keeping read latency flat as history grows. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">Mechanism</div>
      <div class="dk-sql"><span class="dk-com"># default: checkpoint every 10 commits</span>
_delta_log/000…10.checkpoint.parquet
_delta_log/_last_checkpoint  <span class="dk-com"># pointer</span>

read = checkpoint + tail commits</div>
      <div class="dk-micro">Effect</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Without</div><div class="dk-stat-v red">O(n)</div><div class="dk-stat-s">replay all</div></div>
        <div class="dk-stat"><div class="dk-stat-l">With</div><div class="dk-stat-v green">O(1)</div><div class="dk-stat-s">flat latency</div></div>
      </div>`,
  });
})();
