import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is "excess" in SCS Excess Clean-Up, and which three strategies does the solver support to resolve it?',
    a: 'Excess Clean-Up is a dedicated planning step in SCS that resolves <strong>supply held above what the node actually needs</strong> — the Ending-On-Hand (EOH) that sits <em>above the Safety-Stock target</em>. (The <code>Excess Clean Up</code> parameter defaults to <strong>SS</strong>, i.e. clean-up is measured against the Safety-Stock level, and the clean-up workflow resolves <strong>EOH (Ending On Hand) violations</strong>.) The <code>Excess Clean Up Strategy</code> measure supports <strong>three options: RELEASE, MOVE_OUT and None</strong> (default <strong>RELEASE</strong>). <strong>RELEASE</strong> undoes the producing flow plan that created the excess (the <code>RELEASE_PRODUCE</code> family "releases the flow plan (producer) completely"). <strong>MOVE_OUT</strong> instead pushes the excess <em>downstream</em> — <code>Enable Move Out Across Activities</code> (default TRUE) governs "Excess Clean Up By Move_Out Across Activities". <strong>None</strong> performs no clean-up, so the excess simply remains on the node.',
    tip: 'Say it in one breath: "excess = EOH above Safety Stock; three strategies — RELEASE (cancel the producer), MOVE_OUT (push it downstream), None (leave it)." Default is RELEASE.' },
  { q: 'Contrast RELEASE and MOVE_OUT. When would MOVE_OUT make more sense, and what flag enables trying both?',
    a: '<strong>RELEASE</strong> works by <em>reducing supply at the source</em>: the solver releases/undoes the production (or input) flow plan that generated the surplus, so the EOH drops back to the Safety-Stock target. The wiki\'s <code>Reallocate Classes During Excess Cleanup</code> flag describes the mechanism — "the solver reallocates the class-based consumption to an earlier production so that the later production flow plan can be <strong>released</strong>." <strong>MOVE_OUT</strong> keeps the supply but <em>relocates</em> it: the excess is pushed to a downstream consuming node along a consumption edge (<code>Enable Move Out Across Activities</code> → "Excess Clean Up By Move_Out Across Activities"). MOVE_OUT fits when the material is still useful further down the chain (e.g. a semi-finished good that should be converted and stored as finished goods, or a no-carry node that must not hold inventory). The <code>Use Excess CleanUp Strategy Release After MoveOut</code> flag (default True) lets the solver <strong>try MOVE_OUT first and then RELEASE</strong> whatever excess remains.',
    tip: 'RELEASE shrinks supply at the source; MOVE_OUT relocates it downstream. "Release After MoveOut" = do both, move-out first.' },
  { q: 'How does Push Excess work at no-carry nodes, and how can a planner control it locally?',
    a: 'A <strong>no-carry (no inventory hold)</strong> node must not retain inventory, so any excess EOH remaining at end-of-horizon (typically from <strong>lot-sized productions or input supplies</strong>) is <em>pushed downstream</em>. This is governed by the global <code>Push No Carry Excess</code> flag: set to <strong>PUSHINVENTORY</strong>, the solver <strong>traverses the network upstream-to-downstream</strong> and pushes any excess at a no-carry node to the <em>immediate downstream material node</em>; if that node is also no-carry, it is pushed another level down. With multiple consumption routes, the excess is split <strong>in the ratio of the actual consumptions</strong> along those routes (the surplus-over-demand pushed this way is logged as <strong>EOHAE</strong>). Controls: <code>Allow Push No Carry Excess At Material Node</code> (a material-node measure, TRUE/FALSE) toggles push per node; <code>Disable Consumption Edge Push Excess Inventory</code> (an edge-level measure) blocks push along specific edges; and push at <strong>BOM component</strong> no-carry nodes is enabled by default (disable via <code>Disable Push Plan For BOM</code>). <code>Minimize No Carry Violations</code> is the move-in-consumer workflow that pulls consuming flow plans earlier in time to absorb the excess.',
    tip: 'PUSHINVENTORY = traverse upstream→downstream, push excess to the next node, split proportional to consumption. Local overrides: per-node (Allow Push...) and per-edge (Disable Consumption Edge...).' },
];

// ── excess model ─────────────────────────────────────────────────────────────
const N = 8;                                   // W1..W8
const SS = 40;                                 // safety-stock target line
// Ending-On-Hand per bucket: a lot-sized supply lands in W3 and sits above SS
const EOH = [25, 35, 110, 95, 85, 80, 80, 80];
const excessAt = (i) => Math.max(0, EOH[i] - SS);
const TOTAL_EXCESS = EOH.reduce((s, v) => s + Math.max(0, v - SS), 0);
const PERSIST_EXCESS = excessAt(N - 1);        // excess still sitting at end of horizon

const STRAT = {
  release: { label: 'RELEASE',  color: '#A78BFA', name: 'RELEASE — cancel the producing flow plan' },
  moveout: { label: 'MOVE_OUT', color: '#38BDF8', name: 'MOVE_OUT — push the excess downstream' },
  none:    { label: 'None',     color: '#EF4444', name: 'None — no clean-up; excess remains' },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'How It Solves',
    title: 'Excess Clean-Up',
    subtitle: 'After planning, a node can be left holding supply above what it needs — Ending-On-Hand (EOH) sitting above the Safety-Stock target. The Excess Clean-Up step resolves it. Watch the three strategies the solver supports — RELEASE, MOVE_OUT and None — act on the same excess, and see how no-carry nodes push the excess downstream.',
    tabs: [
      { id: 'clean', label: '🧹 Clean-Up' },
      { id: 'what',  label: '📋 Excess & the 3 strategies', content: whatTab() },
      { id: 'push',  label: '⤵️ Push Excess (no-carry)', content: pushTab() },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildClean(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the clean-up animation ────────────────────────────────────────────
function buildClean(container) {
  const tab = container.querySelector('#tab-clean');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One material node across <b>8 weekly buckets</b>. Each bar is the <b style="color:#64748B">Ending-On-Hand</b>; the dashed line is the <b style="color:#A78BFA">Safety-Stock target (SS=${SS})</b>. The portion <b>above SS</b> is <b style="color:#F59E0B">EXCESS</b> — a lot-sized supply landed in <b>W3</b> and ${PERSIST_EXCESS} units sit above target through the end of the horizon. Pick a <b>strategy</b> and press <b>Run</b>.</div>
      <canvas id="exc-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="exc-run">▶ Run Clean-Up</button>
        <button class="ctrl-btn" id="exc-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Strategy:</span>
        <button class="ctrl-btn" data-strategy="release">RELEASE</button>
        <button class="ctrl-btn" data-strategy="moveout">MOVE_OUT</button>
        <button class="ctrl-btn" data-strategy="none">None</button>
      </div>
      <div id="exc-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Excess Clean-Up resolves supply held <strong>above the Safety-Stock target</strong> — the amber band above the dashed SS line. The <code>Excess Clean Up Strategy</code> measure supports <strong>three options: RELEASE, MOVE_OUT and None</strong> (default RELEASE).</p>
      <p><strong>RELEASE</strong> undoes the <em>producing flow plan</em> that created the surplus, so the on-hand falls back to the SS target — supply is reduced at the source. <strong>MOVE_OUT</strong> keeps the material but <em>relocates it downstream</em> along a consumption edge to a consuming node (<code>Enable Move Out Across Activities</code>). <strong>None</strong> does nothing — the excess simply stays on the node (highlighted red), which at a no-carry node is a <em>no-carry violation</em>. The <code>Use Excess CleanUp Strategy Release After MoveOut</code> flag can combine them: try MOVE_OUT first, then RELEASE the remainder.</p>
    </div>`;

  const canvas = tab.querySelector('#exc-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const PAD_L = 50, PAD_R = 130, BASELINE = 236, SCALE = 1.4;
  const plotW = canvas.width - PAD_L - PAD_R;
  const slotW = plotW / N;
  const barW = Math.min(46, slotW * 0.6);
  const bucketX = (i) => PAD_L + i * slotW + (slotW - barW) / 2;
  const ssY = BASELINE - SS * SCALE;
  // downstream node (used by MOVE_OUT)
  const DOWN = { x: canvas.width - 62, y: 150, r: 26 };

  let strategy = 'release';
  let running = false;
  let prog = 0;            // 0 → 1 animation progress
  let phase = 0;           // phase ticker for pulsing
  const STEP = 0.012;      // progress per frame

  function setLedger(cards) {
    tab.querySelector('#exc-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function reset() {
    running = false; prog = 0;
    setLedger([{ color: '#64748B', title: STRAT[strategy].name,
      body: `Excess = EOH above SS: <b>${TOTAL_EXCESS}</b> units total across the horizon, <b>${PERSIST_EXCESS}</b> units persisting to the end. Press <b>Run</b> to apply the strategy.` }]);
    syncStratButtons();
  }

  function syncStratButtons() {
    tab.querySelectorAll('[data-strategy]').forEach(b => {
      b.classList.toggle('active', b.dataset.strategy === strategy);
    });
  }

  function run() { running = true; prog = 0; }

  function finish() {
    running = false;
    const cards = [{ color: '#64748B', title: STRAT[strategy].name,
      body: `Starting excess (EOH above SS=${SS}): <b>${TOTAL_EXCESS}</b> units; <b>${PERSIST_EXCESS}</b> persisted to end of horizon.` }];
    if (strategy === 'release') {
      cards.push({ color: '#A78BFA', title: '✓ RELEASE — producer cancelled', body: `The solver <b>released the producing flow plan</b> that created the surplus. On-hand falls back to the Safety-Stock target and the excess is gone at the source. (Mechanism: reallocate class-based consumption to an earlier production so the later production flow plan can be released.)` });
    } else if (strategy === 'moveout') {
      cards.push({ color: '#38BDF8', title: '✓ MOVE_OUT — pushed downstream', body: `The <b>${TOTAL_EXCESS}</b> units of excess were <b>moved out to the downstream consuming node</b> along a consumption edge (<code>Enable Move Out Across Activities</code>). This node returns to the SS target; the material is kept, just relocated.` });
      cards.push({ color: '#10B981', title: 'Where it helps', body: `Useful when the material is still needed downstream — e.g. a no-carry semi-finished good that should be converted to finished goods, rather than cancelled.` });
    } else {
      cards.push({ color: '#EF4444', title: '✗ None — excess remains', body: `No clean-up is performed. <b>${PERSIST_EXCESS}</b> units stay above the SS target through the end of the horizon. At a <b>no-carry node</b> this is a <b>no-carry violation</b> that persists unresolved.` });
    }
    setLedger(cards);
  }

  // excess shown per bucket, scaled by clean-up progress for release/moveout
  function shownExcess(i) {
    const base = excessAt(i);
    if (!running && prog === 0) return base;
    if (strategy === 'none') return base;          // never removed
    return base * (1 - prog);                       // shrinks as clean-up proceeds
  }

  let raf = null;
  function draw() {
    phase += 0.05;
    if (running) {
      prog += STEP;
      if (prog >= 1) { prog = 1; finish(); }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // excess band shading (above SS, within plot)
    const bandTop = BASELINE - 120 * SCALE;
    ctx.fillStyle = '#F59E0B0d';
    ctx.fillRect(PAD_L - 6, bandTop, plotW + 12, ssY - bandTop);

    // bars
    for (let i = 0; i < N; i++) {
      const x = bucketX(i);
      const eoh = EOH[i];
      const exc = shownExcess(i);
      const kept = Math.min(eoh, SS);
      // on-hand up to SS (slate/blue) — the healthy inventory
      drawRoundRect(ctx, x, BASELINE - kept * SCALE, barW, kept * SCALE, 3, '#1f2937', '#334155');
      drawRoundRect(ctx, x, BASELINE - kept * SCALE, barW, kept * SCALE, 3, '#38BDF822', '#38BDF866');
      // excess above SS
      if (exc > 0.4) {
        let fill = '#F59E0B', stroke = '#F59E0Baa';
        if (strategy === 'none' && (running || prog > 0)) {
          const a = 0.5 + 0.5 * Math.sin(phase);          // pulsing red
          fill = '#EF4444'; stroke = `rgba(239,68,68,${0.5 + 0.5 * a})`;
        }
        drawRoundRect(ctx, x, ssY - exc * SCALE, barW, exc * SCALE, 3, fill, stroke);
      }
      // bucket label
      ctx.textAlign = 'center'; ctx.font = '10px system-ui';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('W' + (i + 1), x + barW / 2, BASELINE + 16);
    }

    // Safety-Stock target line (dashed)
    ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(PAD_L - 6, ssY); ctx.lineTo(PAD_L + plotW + 6, ssY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#A78BFA'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`SS target ${SS}`, PAD_L - 6, ssY - 6);

    // strategy-specific overlays
    if (strategy === 'release' && (running || prog > 0)) {
      // fading "producer" chip above W3 with strike-through
      const x = bucketX(2) + barW / 2;
      ctx.globalAlpha = 1 - prog;
      ctx.fillStyle = '#A78BFA'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⊘ RELEASE producer', x, 42);
      ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 58, 38); ctx.lineTo(x + 58, 38); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (strategy === 'moveout') {
      // downstream consuming node
      const active = running || prog > 0;
      const grad = ctx.createRadialGradient(DOWN.x, DOWN.y, DOWN.r * 0.4, DOWN.x, DOWN.y, DOWN.r * 2);
      grad.addColorStop(0, '#10B98144'); grad.addColorStop(1, '#10B98100');
      ctx.beginPath(); ctx.arc(DOWN.x, DOWN.y, DOWN.r * 2, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.arc(DOWN.x, DOWN.y, DOWN.r, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981'; ctx.fill();
      ctx.strokeStyle = '#fff3'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('down-', DOWN.x, DOWN.y - 2); ctx.fillText('stream', DOWN.x, DOWN.y + 9);
      // received amount
      const recv = Math.round(TOTAL_EXCESS * prog);
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 10px system-ui';
      ctx.fillText(`+${recv}`, DOWN.x, DOWN.y + DOWN.r + 14);

      if (active && prog < 1) {
        // arrow from excess region to downstream node
        const srcX = bucketX(5) + barW, srcY = ssY - 20;
        drawArrow(ctx, srcX, srcY, DOWN.x - DOWN.r - 6, DOWN.y, '#38BDF8', 1.5);
        // travelling packet
        const t = (prog * 2) % 1;
        const px = srcX + (DOWN.x - DOWN.r - 6 - srcX) * t;
        const py = srcY + (DOWN.y - srcY) * t;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B'; ctx.fill();
        ctx.strokeStyle = '#fff6'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#38BDF8'; ctx.font = '9px system-ui';
      if (active) ctx.fillText('push along consumption edge →', (bucketX(5) + DOWN.x) / 2 - 10, ssY - 30);
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#38BDF8'; ctx.fillText('■ On-hand (≤ SS)', PAD_L, 22);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('■ Excess (above SS)', PAD_L + 140, 22);
    ctx.fillStyle = '#A78BFA'; ctx.fillText('— — SS target', PAD_L + 290, 22);

    // progress readout
    ctx.fillStyle = '#CBD5E1'; ctx.font = '10px system-ui';
    const resolved = strategy === 'none' ? 0 : Math.round(TOTAL_EXCESS * prog);
    ctx.fillText(`strategy ${STRAT[strategy].label}  ·  excess ${TOTAL_EXCESS}  ·  resolved ${resolved}`, PAD_L, BASELINE + 44);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-strategy]').forEach(b => b.addEventListener('click', () => { strategy = b.dataset.strategy; reset(); }));
  tab.querySelector('#exc-run').addEventListener('click', run);
  tab.querySelector('#exc-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: what counts as excess & the three strategies ──────────────────────
function whatTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">What counts as "excess"</div><div class="section-desc">Excess Clean-Up is a distinct planning step in SCS. It resolves supply a node is left holding above what it needs.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Excess = EOH above Safety Stock</div><div class="info-card-body">Excess is the <strong>Ending-On-Hand (EOH)</strong> that remains <strong>above the Safety-Stock target</strong>. The <code>Excess Clean Up</code> parameter defaults to <strong>SS</strong> — clean-up is measured against the safety-stock level — and the workflow resolves <strong>EOH (Ending On Hand) violations</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Where excess comes from</div><div class="info-card-body">Typically <strong>lot-sized productions</strong> or <strong>input supplies</strong> that overshoot demand, leaving surplus on-hand that persists to the end of the horizon.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">The strategy measure</div><div class="info-card-body">The <code>Excess Clean Up Strategy</code> measure (default <strong>RELEASE</strong>) controls how the surplus is resolved. "Three options supported: <strong>RELEASE, MOVE_OUT and None</strong>."</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">RELEASE vs MOVE_OUT vs None</div><div class="section-desc">The same excess, three different resolutions.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>RELEASE (default)</th><th>MOVE_OUT</th><th>None</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">What it does</td><td>Releases / undoes the <strong>producing flow plan</strong> that created the surplus.</td><td>Pushes the excess <strong>downstream</strong> to a consuming node along a consumption edge.</td><td>No clean-up — the excess <strong>remains</strong> on the node.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Effect on supply</td><td>Supply is <strong>reduced at the source</strong>; EOH falls to the SS target.</td><td>Supply is <strong>kept but relocated</strong> further down the chain.</td><td>Supply unchanged; stays above target.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Governing flag</td><td>Strategy = RELEASE. <code>Reallocate Classes During Excess Cleanup</code> reallocates consumption to an earlier production so the later flow plan can be released.</td><td>Strategy = MOVE_OUT. <code>Enable Move Out Across Activities</code> (default TRUE) → "Excess Clean Up By Move_Out Across Activities".</td><td>Strategy = None.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">When to use</td><td>When the surplus is genuinely unneeded and the production can be cancelled.</td><td>When the material is still useful downstream (e.g. a no-carry SFG to convert to finished goods).</td><td>When clean-up is deliberately turned off.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="prose">
        <p>The two active strategies can be <strong>combined</strong>: <code>Use Excess CleanUp Strategy Release After MoveOut</code> (default True) tells the solver to <strong>try MOVE_OUT first and then RELEASE</strong> whatever excess remains. Related flags include <code>Enable Capacity Bands for Excess Cleanup</code> (default False) and <code>Excess CleanUp By Lot Consolidation</code> (resolves excess created by minimum-lot sizing by consolidating flows).</p>
        <p class="tip">⚠️ Grounding note: these wiki pages name the three strategies and describe the mechanisms above, but do not state a single verbatim formula "Excess = EOH − SS". The definition here is grounded in the <code>Excess Clean Up</code> parameter defaulting to <strong>SS</strong> and the workflow resolving <strong>EOH violations</strong> measured against the safety-stock target.</p>
      </div>
    </div>`;
}

// ── Tab 3: Push Excess at no-carry nodes ─────────────────────────────────────
function pushTab() {
  const rows = [
    ['<code>Push No Carry Excess</code>', 'Global flag', 'Set to <strong>PUSHINVENTORY</strong>: the solver traverses the network <strong>upstream → downstream</strong> and pushes any excess at a no-carry node to the <strong>immediate downstream material node</strong>. If that node is also no-carry, the excess is pushed another level down.'],
    ['<code>Allow Push No Carry Excess At Material Node</code>', 'Material-node measure', 'Local control. <strong>TRUE</strong>: push allowed at this no-carry node. <strong>FALSE</strong>: excess is held at the node (even if that causes a no-carry violation). Lets a planner override the global flag per node.'],
    ['<code>Disable Consumption Edge Push Excess Inventory</code>', 'Consumption-edge measure', 'Finer control per edge. <strong>TRUE</strong>: block push along this consumption edge; the solver pushes only along the other edges. If all edges are blocked, the excess is held (no-carry violation).'],
    ['<code>Disable Push Plan For BOM</code>', 'Parameter', 'Push at <strong>BOM component</strong> no-carry nodes is <strong>enabled by default</strong>. Set TRUE to disable it and retain the old behaviour (excess remains on the no-carry BOM component).'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Push Excess at no-carry (no inventory hold) nodes</div><div class="section-desc">A no-carry node must not retain inventory, so excess remaining at end-of-horizon — usually from lot-sized productions or input supplies — is pushed downstream. This is MOVE_OUT applied to the no-carry case.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Upstream → downstream traversal</div><div class="info-card-body">With <code>Push No Carry Excess = PUSHINVENTORY</code>, the solver walks the network from upstream to downstream and pushes excess to the <strong>immediate downstream material node</strong>, cascading further down through chained no-carry nodes.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Proportional split</div><div class="info-card-body">When a no-carry node has <strong>multiple consumption routes</strong>, the excess is pushed <strong>in the ratio of the actual consumptions</strong> along those routes. The surplus-over-demand pushed this way is logged as <strong>EOHAE</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Minimize No Carry Violations</div><div class="info-card-body">A move-in-consumer workflow: the solver <strong>pulls consuming flow plans earlier in time</strong> (from the bucket toward plan-end) to absorb the excess at the no-carry node — minimizing violations "to the extent possible".</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Controls over Push Excess</div><div class="section-desc">Global, per-node and per-edge levers.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Control</th><th>Scope</th><th>What it does</th></tr></thead>
          <tbody>${rows.map(([c, s, d]) => `<tr><td style="font-weight:600;color:var(--text)">${c}</td><td>${s}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="canvas-explainer"><h3>Why push instead of release at a no-carry node</h3>
        <p>Certain businesses have semi-finished goods (SFGs) — the wiki's examples are "milk or a mother liquid" — that they do not want to hold in excess owing to perishability. They prefer any excess to be <strong>converted to the finished product and then stored</strong>. The SFG material nodes are marked <strong>no-carry</strong> so that during push planning any excess is pushed downstream and converted to finished-goods inventory. This is why <strong>push at BOM components</strong> exists and is enabled by default (prerequisite: the other BOM components are infinite material nodes, so there is always enough to pull the excess through).</p>
        <p>One caveat from the wiki: on a no-carry push, the solver <strong>will not create new upstream production</strong> to fully push excess caused by a downstream lot size. Example: 550 units of excess at a no-carry node, downstream lot size 100, demand 350 → the solver consumes 400 (leaving 150 excess) and does not manufacture an extra 50 upstream to push 200 completely.</p>
      </div>
    </div>`;
}
