/* Delta Lake — Write Path (commit protocol + optimistic concurrency), animated */
(function () {
  'use strict';
  const TV = window.TableViz;
  const K = TV.DeltaKit;
  const W = 760, H = 460;

  function buildSVG() {
    return K.svgEl(W, H, `
<defs><marker id="dwp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#484f58"/></marker></defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="14" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">ShopKart Delta write path — optimistic concurrency</text>

<!-- Our writer -->
<g id="dwp-writer"><rect x="20" y="40" width="180" height="70" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="34" y="62" font-size="14">⚡</text><text x="56" y="61" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Writer A (our job)</text>
  <text x="34" y="82" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,.7)">MERGE nightly CDC</text>
  <text x="34" y="96" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">read snapshot @ v847</text></g>
<rect id="dwp-hl-writer" x="18" y="38" width="184" height="74" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- staged files -->
<g id="dwp-staged" opacity="0"><rect x="20" y="130" width="180" height="60" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.3"/>
  <text x="34" y="150" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">staged data files</text>
  <text x="34" y="166" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,.7)">part-A1, part-A2 (temp)</text>
  <text x="34" y="180" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">written, not yet committed</text></g>

<!-- Other writer -->
<g id="dwp-other" opacity="0"><rect x="20" y="300" width="180" height="64" rx="8" fill="#2a1020" stroke="#f778ba" stroke-width="1.4"/>
  <text x="34" y="322" font-size="13">⚡</text><text x="56" y="321" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Writer B (other job)</text>
  <text x="34" y="340" font-family="ui-monospace" font-size="8" fill="rgba(247,120,186,.8)">streaming append</text>
  <text x="34" y="354" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">also targeting v848</text></g>

<!-- Log column -->
<rect x="470" y="40" width="270" height="380" rx="10" fill="#12101f" stroke="#a371f7" stroke-width="1.3"/>
<text x="486" y="64" font-family="ui-monospace" font-size="10.5" font-weight="700" fill="#c9b6f7">_delta_log/  (head)</text>
<text x="486" y="90" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,.5)">…846.json  WRITE</text>
<text x="486" y="110" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,.7)">…847.json  MERGE   ← head</text>

<!-- v848 slot -->
<g id="dwp-v848"><rect x="486" y="130" width="238" height="40" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="496" y="155" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,.6)">…848.json  (contended)</text></g>
<g id="dwp-v848-b" opacity="0"><rect x="486" y="130" width="238" height="40" rx="6" fill="#2a1020" stroke="#f778ba" stroke-width="1.4"/>
  <text x="496" y="150" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f778ba">…848.json  Writer B wins</text>
  <text x="496" y="163" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">committed first</text></g>

<!-- conflict flash -->
<g id="dwp-conflict" opacity="0">
  <rect x="220" y="150" width="230" height="56" rx="8" fill="rgba(248,81,73,.12)" stroke="#f85149" stroke-width="1.4"/>
  <text x="335" y="172" text-anchor="middle" font-family="system-ui" font-size="10.5" font-weight="700" fill="#f85149">⚠ commit conflict</text>
  <text x="335" y="188" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,.8)">v848 already taken — retry</text>
  <text x="335" y="200" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,.7)">re-read, re-validate, re-target</text>
</g>

<!-- v849 success -->
<g id="dwp-v849" opacity="0"><rect x="486" y="180" width="238" height="44" rx="6" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="496" y="200" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">…849.json  Writer A ✓</text>
  <text x="496" y="214" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">add part-A1, part-A2 · atomic</text></g>

<!-- arrows -->
<line x1="200" y1="75" x2="230" y2="75" stroke="#484f58" stroke-width="0" opacity="0"/>
<line x1="110" y1="110" x2="110" y2="128" stroke="#484f58" stroke-width="1.5" marker-end="url(#dwp-arr)"/>
<line id="dwp-arrow-commit" x1="200" y1="150" x2="466" y2="150" stroke="#58a6ff" stroke-width="1.6" marker-end="url(#dwp-arr)" opacity="0"/>
<line id="dwp-arrow-retry" x1="200" y1="195" x2="466" y2="200" stroke="#56d364" stroke-width="1.6" marker-end="url(#dwp-arr)" opacity="0"/>

<!-- done -->
<g id="dwp-done" opacity="0">
  <rect x="220" y="240" width="230" height="70" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="335" y="264" text-anchor="middle" font-family="system-ui" font-size="10.5" font-weight="700" fill="#56d364">✓ committed at v849</text>
  <text x="335" y="282" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,.8)">both jobs’ data now present</text>
  <text x="335" y="297" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(86,211,100,.7)">no lost writes, no corruption</text>
</g>
`);
  }

  const stepData = [
    { label: 'Read a snapshot', desc: 'Writer A (a nightly MERGE) begins by reading a consistent snapshot of the table at version 847 — the current log head.' },
    { label: 'Stage data files', desc: 'A computes its result and writes new Parquet files to the table directory. These files exist on disk but are invisible: nothing in the log references them yet.' },
    { label: 'Attempt to commit v848', desc: 'To make its files visible, A must create the next commit file, 000…848.json — an atomic create-if-absent against the log.' },
    { label: 'A conflicting writer', desc: 'Meanwhile Writer B (a streaming append) targeted the same version and created 848.json first. Only one writer can win a given version number.' },
    { label: 'Conflict detected', desc: 'A’s create-if-absent for v848 fails — the file already exists. This is optimistic concurrency control: conflicts are caught at commit time, never by locking up front.' },
    { label: 'Resolve and retry', desc: 'A re-reads the table at v848, checks that B’s changes don’t conflict logically with its own (different files/rows), keeps its staged data, and re-targets version 849.' },
    { label: 'Atomic commit at v849', desc: 'A creates 000…849.json atomically with its add actions. Because it’s create-if-absent, the commit is all-or-nothing.' },
    { label: 'Both writes survive', desc: 'The table now holds both B’s (v848) and A’s (v849) changes. No writes were lost and no reader ever saw a partial state — ACID on object storage, no external lock.' },
  ];

  function buildSteps(svg, fx) {
    const AE = TV.AnimationEngine;
    return [
      AE.fnStep('', '', () => fx.show('dwp-hl-writer', 'blue'), () => fx.hide('dwp-hl-writer'), 2400),
      AE.fnStep('', '', () => { fx.unglow('dwp-hl-writer'); fx.show('dwp-staged', 'green'); }, () => fx.hide('dwp-staged'), 2600),
      AE.fnStep('', '', () => { fx.show('dwp-staged'); fx.show('dwp-arrow-commit', 'blue'); }, () => fx.hide('dwp-arrow-commit'), 2600),
      AE.fnStep('', '', () => { fx.show('dwp-other', 'purple'); fx.show('dwp-v848-b', 'purple'); }, () => { fx.hide('dwp-other'); fx.hide('dwp-v848-b'); }, 2800),
      AE.fnStep('', '', () => { fx.show('dwp-v848-b'); fx.show('dwp-conflict', 'red'); }, () => fx.hide('dwp-conflict'), 3000),
      AE.fnStep('', '', () => { fx.show('dwp-v848-b'); fx.show('dwp-arrow-retry', 'green'); }, () => fx.hide('dwp-arrow-retry'), 2800),
      AE.fnStep('', '', () => { fx.show('dwp-v848-b'); fx.show('dwp-v849', 'green'); }, () => fx.hide('dwp-v849'), 2800),
      AE.fnStep('', '', () => { fx.show('dwp-v848-b'); fx.show('dwp-v849'); fx.show('dwp-done', 'green'); }, () => fx.hide('dwp-done'), 3400),
    ];
  }

  K.animatedModule({
    id: 'write-path', title: 'Write Path (Commit)', group: 'read-ops',
    intro: 'How a Delta write becomes visible: stage files, then atomically create the next commit — with optimistic concurrency handling a racing writer. Press Play.',
    buildSVG, buildSteps, stepData,
    panelHTML: `
      <div class="dk-micro">The commit protocol</div>
      <div class="dk-sql"><span class="dk-com"># 1. read snapshot @ v847</span>
<span class="dk-com"># 2. write data files (staged)</span>
<span class="dk-com"># 3. create 000…N.json  (if-absent)</span>
<span class="dk-com"># 4. conflict? re-read, re-validate, retry</span></div>
      <div class="dk-micro">Isolation</div>
      <div class="dk-stats">
        <div class="dk-stat"><div class="dk-stat-l">Concurrency</div><div class="dk-stat-v purple">OCC</div><div class="dk-stat-s">no locks</div></div>
        <div class="dk-stat"><div class="dk-stat-l">Guarantee</div><div class="dk-stat-v green">atomic</div><div class="dk-stat-s">create-if-absent</div></div>
      </div>`,
  });
})();
