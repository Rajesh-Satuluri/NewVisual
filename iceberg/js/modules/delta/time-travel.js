/* Delta Lake — Time Travel (VERSION / TIMESTAMP AS OF), animated */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;
  const W = 760, H = 440;

  const VERS = [
    { v: 843, op: 'WRITE', ts: '2024-01-18', files: '23,110' },
    { v: 844, op: 'MERGE', ts: '2024-01-19', files: '23,540' },
    { v: 845, op: 'DELETE', ts: '2024-01-20', files: '23,540' },
    { v: 846, op: 'OVERWRITE ⚠', ts: '2024-01-21', files: '19,880' },
    { v: 847, op: 'MERGE', ts: '2024-01-22', files: '24,000' },
    { v: 848, op: 'WRITE', ts: '2024-01-23', files: '24,210' },
    { v: 849, op: 'OPTIMIZE', ts: '2024-01-24', files: '9,640' },
  ];

  function buildSVG() {
    const y = 120, x0 = 60, dx = 100;
    let dots = '', rail = `<line x1="${x0}" y1="${y}" x2="${x0 + dx * 6}" y2="${y}" stroke="#30363d" stroke-width="2"/>`;
    VERS.forEach((V, i) => {
      const x = x0 + i * dx;
      const bad = V.op.indexOf('⚠') >= 0;
      dots += `
        <g id="tt-dot-${i}">
          <circle cx="${x}" cy="${y}" r="9" fill="${bad ? '#2a1010' : '#12101f'}" stroke="${bad ? '#f85149' : '#a371f7'}" stroke-width="1.6"/>
          <text x="${x}" y="${y - 18}" text-anchor="middle" font-family="ui-monospace" font-size="9" font-weight="700" fill="#c9b6f7">v${V.v}</text>
          <text x="${x}" y="${y + 26}" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,.7)">${V.op}</text>
          <text x="${x}" y="${y + 37}" text-anchor="middle" font-family="ui-monospace" font-size="7" fill="rgba(139,148,158,.5)">${V.ts}</text>
        </g>
        <circle id="tt-hl-${i}" cx="${x}" cy="${y}" r="14" fill="none" stroke="#ff5a3c" stroke-width="2.5" opacity="0"/>`;
    });
    return K.svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta time travel — orders table history</text>
${rail}${dots}
<!-- state panel -->
<g id="tt-state" opacity="0">
  <rect x="150" y="210" width="460" height="120" rx="9" fill="#0c141f" stroke="#223047" stroke-width="1.3"/>
  <text x="170" y="236" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3" id="tt-state-title">Table @ version</text>
  <text x="170" y="260" font-family="ui-monospace" font-size="9.5" fill="rgba(139,148,158,.85)" id="tt-state-l1">files: —</text>
  <text x="170" y="280" font-family="ui-monospace" font-size="9.5" fill="rgba(139,148,158,.85)" id="tt-state-l2">operation: —</text>
  <text x="170" y="300" font-family="ui-monospace" font-size="9.5" fill="rgba(139,148,158,.85)" id="tt-state-l3">as of: —</text>
  <text x="170" y="320" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,.8)" id="tt-state-l4"></text>
</g>
`);
  }

  const stepData = [
    { label: 'The table now', desc: 'The orders table is at version 849 (an OPTIMIZE that compacted to 9,640 files). Every past version is still fully queryable — Delta keeps the history in the log.' },
    { label: 'DESCRIBE HISTORY', desc: 'DESCRIBE HISTORY orders lists every version with its operation, timestamp, and metrics. Version 846 was an accidental OVERWRITE that dropped the table to 19,880 files.' },
    { label: 'VERSION AS OF 845', desc: 'To recover the pre-incident state, query VERSION AS OF 845. Delta replays the log up to commit 845 and serves exactly the file set that was live then — 23,540 files.' },
    { label: 'TIMESTAMP AS OF', desc: 'You can also travel by wall-clock time: TIMESTAMP AS OF \'2024-01-20\' resolves to the version that was current at that instant (v845 here). Great for “what did the dashboard show last Monday?”.' },
    { label: 'Restore or audit', desc: 'RESTORE TABLE orders TO VERSION AS OF 845 makes that old state the new head as a fresh commit — a one-line rollback of the bad overwrite. History is never rewritten, only appended.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    function setState(i, note) {
      const V = VERS[i];
      fx.text('tt-state-title', 'Table @ version ' + V.v);
      fx.text('tt-state-l1', 'files: ' + V.files);
      fx.text('tt-state-l2', 'operation: ' + V.op.replace(' ⚠', ''));
      fx.text('tt-state-l3', 'as of: ' + V.ts);
      fx.text('tt-state-l4', note || '');
    }
    return [
      AE.fnStep('', '', () => { fx.show('tt-hl-6', 'brand'); }, () => fx.hide('tt-hl-6'), 2400),
      AE.fnStep('', '', () => { fx.show('tt-hl-3', 'red'); }, () => fx.hide('tt-hl-3'), 2800),
      AE.fnStep('', '', () => { fx.show('tt-hl-2', 'brand'); fx.show('tt-state'); setState(2, 'pre-incident snapshot recovered by replay'); },
        () => { fx.hide('tt-hl-2'); fx.hide('tt-state'); }, 3200),
      AE.fnStep('', '', () => { fx.show('tt-hl-2', 'brand'); fx.show('tt-state'); setState(2, "TIMESTAMP AS OF '2024-01-20' → resolves to v845"); },
        () => { fx.hide('tt-hl-2'); fx.hide('tt-state'); }, 3200),
      AE.fnStep('', '', () => { fx.show('tt-hl-2', 'green'); fx.show('tt-hl-6', 'green'); fx.show('tt-state'); setState(2, 'RESTORE → new commit v850 re-pointing to this state'); },
        () => { fx.hide('tt-hl-2'); fx.hide('tt-hl-6'); fx.hide('tt-state'); }, 3400),
    ];
  }

  K.animatedModule({
    id: 'time-travel', title: 'Time Travel', group: 'read-ops',
    intro: 'Every commit is a queryable point in time. Travel by VERSION or TIMESTAMP AS OF, and roll back a bad write with RESTORE. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">SQL</div>
      <div class="dk-sql"><span class="dk-kw">SELECT</span> * <span class="dk-kw">FROM</span> orders <span class="dk-kw">VERSION AS OF</span> 845;
<span class="dk-kw">SELECT</span> * <span class="dk-kw">FROM</span> orders
  <span class="dk-kw">TIMESTAMP AS OF</span> <span class="dk-str">'2024-01-20'</span>;
<span class="dk-kw">RESTORE TABLE</span> orders <span class="dk-kw">TO VERSION AS OF</span> 845;</div>
      <div class="dk-micro">Retention note</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Travel by</div><div class="dk-stat-v purple">v / ts</div><div class="dk-stat-s">log replay</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Limited by</div><div class="dk-stat-v orange">VACUUM</div><div class="dk-stat-s">retention window</div></div>
      </div>`,
  });
})();
