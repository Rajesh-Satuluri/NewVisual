import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'After a solver run, what are the three core correctness checks you use to quickly validate that the plan is sane, and what does each one mean?',
    a: 'The quick validity gate is three things that must <strong>not</strong> be present. The wiki\'s sanity-check script reports six items — <em>Demand Supportability, Detailed Statistics of Demand, Negative on Hand, Capacity Overload, Sigma Pegging = Plan across all, BOH and ER stats</em> — but when you <em>interpret the output</em> only three are hard correctness checks: <strong>1) Negative On Hand</strong> — no material node may show a projected on-hand below zero (you cannot consume stock you do not have); <strong>2) Capacity Overload</strong> — no resource bucket may be loaded beyond its available capacity; <strong>3) Σ Pegging = Plan</strong> — the sum of the peggings must reconcile to the plan quantity across <em>all</em>, with no mismatch. The wiki is explicit: <em>"There should not be Negative on Hand, or Capacity Overload, or Sigma Pegging = Plan mismatch"</em>. Supportability and the demand statistics are project-specific, and <em>"No problem on BOH and ER as well"</em> — those are context, not pass/fail gates.',
    tip: 'Name the three in one breath — Negative On Hand, Capacity Overload, Σ Pegging = Plan — and quote the line: "there should not be ... mismatch". Flag that supportability + stats are project-specific, not correctness gates.' },
  { q: 'Walk through the order in which the SCS solver executes internally when you invoke it.',
    a: 'The wiki lists the plugin\'s internal order as roughly 23 steps. <strong>Setup:</strong> (1) start of plugin execution &amp; parameter/config validation, (2) delete/truncate of output tables, (3) data loading from LS into SCS memory (demand &amp; network data). <strong>Planning:</strong> (4) WIP planning &amp; WIP RCA (WIP RCA is flag-based), (6) Demand Planning / OBO plan, (8) Safety Stock Planning, (10) RePlanning of late &amp; short demands (flag-based), (12) Push Planning for no-carry resolution (flag-based), (13) Min Res utilization. Notice <strong>Excess cleanup (flag-based)</strong> is interleaved at steps <strong>5, 7, 9, 11</strong> — it "can occur at different stages", which is why it is not a single line. <strong>RCA &amp; output:</strong> (14) OBO RCA and Replan In OBO RCA, (15) Peggings, (16) Exports (write output from SCS back to LS), (17) Additive Demand RCA &amp; exports, (18) SS RCA &amp; exports, (19) RCA Peggings &amp; exports (flag-based), (20) Zero-qty additive RCA &amp; exports. <strong>Finish:</strong> (21) finished solver run with a summary of records written and time per main stage, (22) active rule execution starts (LS incremental plan), (23) plugin execution finished — the <em>"Total Solver run time"</em> is the actual plugin time, and the gap to overall time is the post-solver LS incremental / active-rule work.',
    tip: 'Group it: setup → plan (WIP, Demand/OBO, SS, Replan, Push, MinRes) → RCA/Peggings/Exports → finish. Call out that Excess cleanup is flag-based and recurs between the planning phases (5/7/9/11), and that Peggings (15) come before Exports (16).' },
  { q: 'A run looks finished but you need to read what the solver actually did and where the time went. What outputs and debug handles does SCS give you?',
    a: 'Two families. <strong>Runtime metrics</strong> are printed in the log after a run: <em>Total Plan Time</em> is from WIP planning to the end of OBO RCA; <em>Total WIP Plan Time</em>, <em>Total Demand Plan Time</em> (start to finish of plan generation), <em>Total Demand RePlan Time</em>, <em>Total Inventory Plan Time</em> (safety-stock planning), <em>Total Write Time</em> (export plan through end of demand peggings), <em>Total Additive RCA Time</em>, <em>Total ZeroQty RCA Time</em>, and <em>Total Solver Run Time</em> (the whole run). Reading these tells you which stage dominates — e.g. if Demand Planning is slow, the log even prints "Planned N out of M demands", and you can cap it with <code>No Of Demands To Plan</code>. <strong>Debug handles (traces)</strong> let you follow a specific object: <em>Demand Trace</em> (set &gt; 0 on an order to log its full supply-chain traversal for material &amp; capacity), <em>Material Node Trace</em>, <em>Capacity Trace</em>, <em>Safety Stock Trace</em>, and <em>WIP Trace</em> (Production / Consumption / Capacity) — plus Excess Clean-up, Min Utilization and Push Planning traces for those specific workflows. The wiki warns traces are <em>performance intensive and should never be used in production</em>.',
    tip: 'Separate the two: runtime metrics (Total Plan / Write / Solver Run Time) tell you WHERE time goes; traces (Demand Trace, Capacity Trace, WIP Trace, …) tell you WHY a specific demand went the way it did. End with the "never in production" caveat for traces.' },
];

// ── validation model ─────────────────────────────────────────────────────────
const N = 6; // W1..W6 buckets

const CHECKS = {
  negonhand: {
    key: 'negonhand', label: 'Negative On-Hand', color: '#38BDF8', kind: 'onhand',
    pass: [40, 28, 16, 30, 20, 12],
    fail: [40, 28, -14, 18, 10, 5],
    meaning: 'Projected on-hand inventory per bucket must never drop below zero.',
    legend: '■ On-hand (≥0 ok · <0 violation)',
  },
  capoverload: {
    key: 'capoverload', label: 'Capacity Overload', color: '#F59E0B', kind: 'capacity', limit: 100,
    pass: [60, 82, 95, 70, 88, 55],
    fail: [60, 82, 128, 70, 112, 55],
    meaning: 'Loaded capacity per bucket must stay at or below the available limit.',
    legend: '■ Load  ─ Capacity limit (over = violation)',
  },
  sigmapeg: {
    key: 'sigmapeg', label: 'Σ Pegging = Plan', color: '#A78BFA', kind: 'pegging',
    plan:    [50, 60, 40, 55, 45, 30],
    pegPass: [50, 60, 40, 55, 45, 30],
    pegFail: [50, 60, 26, 55, 45, 30],
    meaning: 'The sum of peggings must reconcile to the plan quantity — no mismatch, across all.',
    legend: '■ Plan   ■ Σ Pegging (mismatch = violation)',
  },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Outputs & Diagnostics',
    title: 'Debug a Plan',
    subtitle: 'Before you trust a solver run, three things must not exist: a Negative On-Hand, a Capacity Overload, or a Σ Pegging = Plan mismatch. Pick a check, flip it between a clean plan and a broken one, and watch the validator sweep the buckets and flag the violation — then see the full internal order the solver executes.',
    tabs: [
      { id: 'validate', label: '🩺 Validate the Plan' },
      { id: 'checks',   label: '✅ The Three Checks', content: checksTab() },
      { id: 'order',    label: '🧭 Solver Execution Order', content: orderTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildValidator(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the validator sweep animation ─────────────────────────────────────
function buildValidator(container) {
  const tab = container.querySelector('#tab-validate');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A tiny plan across <b>6 buckets (W1–W6)</b>. Choose one of the three correctness checks, then press <b>Run</b> to sweep the validator across the buckets — or <b>Step</b> one bucket at a time. A bucket that passes turns <b style="color:#10B981">green ✓</b>; a violation turns <b style="color:#EF4444">red ✗</b>. Click the <b>same check again</b> to flip it between a clean plan (<b>PASS</b>) and a broken one (<b>FAIL</b>).</div>
      <canvas id="dbg-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dbg-run">▶ Run (sweep)</button>
        <button class="ctrl-btn" id="dbg-step">⏭ Step</button>
        <button class="ctrl-btn" id="dbg-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Check:</span>
        <button class="ctrl-btn" data-check="negonhand">Negative On-Hand</button>
        <button class="ctrl-btn" data-check="capoverload">Capacity Overload</button>
        <button class="ctrl-btn" data-check="sigmapeg">Σ Pegging = Plan</button>
      </div>
      <div id="dbg-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>This is the quick <strong>plan-quality gate</strong> the wiki describes. After a run, three things must be checked across the whole plan, and none of them may be present: a <strong>Negative On-Hand</strong> (a material node consuming stock it does not have), a <strong>Capacity Overload</strong> (a resource bucket loaded beyond its available capacity), or a <strong>Σ Pegging = Plan</strong> mismatch (the peggings not reconciling to the plan quantity). In the wiki's own words: <em>"There should not be Negative on Hand, or Capacity Overload, or Sigma Pegging = Plan mismatch."</em></p>
      <p>The sanity-check script also reports <strong>Demand Supportability</strong>, <strong>detailed demand statistics</strong>, and <strong>BOH / ER stats</strong> — but those are project-specific context, not hard pass/fail gates. If any of the three checks above fails, the plan is not trustworthy and you go back to the inputs (supply/BOH/ER → WIP → demand → safety stock) and the solver stages.</p>
    </div>`;

  const canvas = tab.querySelector('#dbg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const PAD_L = 55, PAD_R = 25, TOP = 72, BOT = 242;
  const slotW = (canvas.width - PAD_L - PAD_R) / N;
  const barW = Math.min(46, slotW * 0.52);
  const cx = (i) => PAD_L + i * slotW + slotW / 2;

  let active = 'negonhand';
  let fail = true;           // start on the instructive (broken) plan
  let target = 0;            // buckets to reveal (0..N)
  let scanPos = 0;           // eased position (0..N)

  const chk = () => CHECKS[active];
  const checkedCount = () => Math.min(N, Math.max(0, Math.floor(scanPos + 0.0001)));
  const isChecked = (i) => scanPos >= i + 0.92;

  // the per-bucket values currently in play
  function values() {
    const c = chk();
    if (c.kind === 'onhand') return (fail ? c.fail : c.pass);
    if (c.kind === 'capacity') return (fail ? c.fail : c.pass);
    if (c.kind === 'pegging') return (fail ? c.pegFail : c.pegPass);
    return [];
  }
  function violated(i) {
    const c = chk();
    const v = values();
    if (c.kind === 'onhand') return v[i] < 0;
    if (c.kind === 'capacity') return v[i] > c.limit;
    if (c.kind === 'pegging') return v[i] !== c.plan[i];
    return false;
  }
  function violationCount() {
    let n = 0; for (let i = 0; i < N; i++) if (violated(i)) n++; return n;
  }

  function setLedger(cards) {
    tab.querySelector('#dbg-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function idleLedger() {
    const c = chk();
    setLedger([{ color: c.color, title: `${c.label} · showing ${fail ? 'FAIL' : 'PASS'}`,
      body: `${c.meaning} Press <b>Run</b> to sweep all 6 buckets, or <b>Step</b> one at a time. (Click <b>${c.label}</b> again to flip to the ${fail ? 'clean PASS' : 'broken FAIL'} plan.)` }]);
  }

  function verdictLedger() {
    const c = chk();
    const v = violationCount();
    const cards = [{ color: c.color, title: `${c.label} · ${fail ? 'FAIL plan' : 'PASS plan'}`, body: c.meaning }];
    if (v === 0) {
      cards.push({ color: '#10B981', title: '✓ PASS — check clean', body: `All 6 buckets validated with no violation. This is one of the three gates the wiki requires: <em>there should not be ${c.label.toLowerCase()}</em>.` });
    } else {
      cards.push({ color: '#EF4444', title: `✗ FAIL — ${v} bucket${v > 1 ? 's' : ''} flagged`, body: `The validator found <b>${v}</b> violation${v > 1 ? 's' : ''}. Per the wiki, <em>"There should not be Negative on Hand, or Capacity Overload, or Sigma Pegging = Plan mismatch"</em> — so this plan does not pass and needs investigation back through the inputs and solver stages.` });
    }
    setLedger(cards);
  }

  function reset() { target = 0; scanPos = 0; idleLedger(); }
  function run() { target = N; }
  function step() { if (target < N) target += 1; }

  function selectCheck(k) {
    if (k === active) { fail = !fail; }   // re-click flips PASS/FAIL
    else { active = k; fail = true; }
    tab.querySelectorAll('[data-check]').forEach(b =>
      b.classList.toggle('active', b.dataset.check === active));
    reset();
  }

  // ── drawing helpers per check kind ─────────────────────────────────────────
  function drawOnHand() {
    const v = values();
    const zeroY = 176, ppu = 1.55;
    // zero baseline
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD_L - 6, zeroY); ctx.lineTo(canvas.width - PAD_R + 6, zeroY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('0', PAD_L - 10, zeroY + 3);
    // connecting profile line (revealed up to scan)
    ctx.strokeStyle = '#38BDF855'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < N; i++) { const y = zeroY - v[i] * ppu; if (i === 0) ctx.moveTo(cx(i), y); else ctx.lineTo(cx(i), y); }
    ctx.stroke();
    for (let i = 0; i < N; i++) {
      const x = cx(i) - barW / 2, h = Math.abs(v[i]) * ppu;
      const yTop = v[i] >= 0 ? zeroY - h : zeroY;
      const done = isChecked(i), bad = violated(i);
      const fillCol = !done ? '#1b2436' : (bad ? '#EF4444' : '#10B981');
      const strokeCol = !done ? '#2b3650' : (bad ? '#EF4444cc' : '#10B981cc');
      drawRoundRect(ctx, x, yTop, barW, Math.max(2, h), 3, fillCol, strokeCol);
      ctx.fillStyle = done ? (bad ? '#fecaca' : '#bbf7d0') : '#94a3b8';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(String(v[i]), cx(i), v[i] >= 0 ? yTop - 4 : zeroY + h + 11);
    }
  }

  function drawCapacity() {
    const c = chk(), v = values(), ppu = (BOT - TOP) / 150;
    const limY = BOT - c.limit * ppu;
    for (let i = 0; i < N; i++) {
      const x = cx(i) - barW / 2;
      const done = isChecked(i), bad = violated(i);
      const total = v[i] * ppu;
      const underH = Math.min(v[i], c.limit) * ppu;
      const overH = Math.max(0, v[i] - c.limit) * ppu;
      // under-limit segment
      const uFill = !done ? '#1b2436' : '#38BDF8';
      drawRoundRect(ctx, x, BOT - underH, barW, underH, 3, uFill, !done ? '#2b3650' : '#38BDF8aa');
      // over-limit segment (red)
      if (overH > 0.5) {
        const oFill = !done ? '#2a2030' : '#EF4444';
        drawRoundRect(ctx, x, BOT - underH - overH, barW, overH, 3, oFill, !done ? '#3a2b3a' : '#EF4444cc');
      }
      ctx.fillStyle = done ? (bad ? '#fecaca' : '#bae6fd') : '#94a3b8';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(String(v[i]), cx(i), BOT - total - 5);
    }
    // limit line on top
    ctx.setLineDash([6, 4]); ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD_L - 6, limY); ctx.lineTo(canvas.width - PAD_R + 6, limY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#F59E0B'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Capacity limit ' + c.limit, canvas.width - PAD_R - 108, limY - 5);
  }

  function drawPegging() {
    const c = chk(), peg = values(), ppu = (BOT - TOP) / 72;
    const sub = barW * 0.44, gap = barW * 0.1;
    for (let i = 0; i < N; i++) {
      const done = isChecked(i), bad = violated(i);
      const xPlan = cx(i) - sub - gap / 2, xPeg = cx(i) + gap / 2;
      const hPlan = c.plan[i] * ppu, hPeg = peg[i] * ppu;
      drawRoundRect(ctx, xPlan, BOT - hPlan, sub, hPlan, 3, '#64748B', '#94a3b8aa');
      const pegFill = !done ? '#241f33' : (bad ? '#EF4444' : '#A78BFA');
      drawRoundRect(ctx, xPeg, BOT - hPeg, sub, hPeg, 3, pegFill, !done ? '#332a4a' : (bad ? '#EF4444cc' : '#A78BFAaa'));
      // values
      ctx.font = '8px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8'; ctx.fillText(String(c.plan[i]), xPlan + sub / 2, BOT - hPlan - 4);
      ctx.fillStyle = done ? (bad ? '#fecaca' : '#ddd6fe') : '#94a3b8';
      ctx.fillText(String(peg[i]), xPeg + sub / 2, BOT - hPeg - 4);
      if (done && bad) {
        ctx.fillStyle = '#EF4444'; ctx.font = 'bold 9px system-ui';
        ctx.fillText('Δ ' + (peg[i] - c.plan[i]), cx(i), TOP - 6);
      }
    }
  }

  function drawMarkers() {
    for (let i = 0; i < N; i++) {
      // bucket label
      ctx.textAlign = 'center'; ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
      ctx.fillText('W' + (i + 1), cx(i), BOT + 16);
      // verdict glyph once checked
      if (isChecked(i)) {
        const bad = violated(i);
        ctx.fillStyle = bad ? '#EF4444' : '#10B981';
        ctx.font = 'bold 13px system-ui';
        ctx.fillText(bad ? '✗' : '✓', cx(i), BOT + 30);
      }
    }
  }

  function drawScanLine() {
    if (scanPos <= 0.01 || scanPos >= N - 0.01) return;
    const x = PAD_L + scanPos * slotW;
    const grad = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
    grad.addColorStop(0, '#6366F100'); grad.addColorStop(0.5, '#6366F140'); grad.addColorStop(1, '#6366F100');
    ctx.fillStyle = grad; ctx.fillRect(x - 14, TOP - 6, 28, BOT - TOP + 6);
    ctx.strokeStyle = '#6366F1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, TOP - 6); ctx.lineTo(x, BOT); ctx.stroke();
    ctx.fillStyle = '#6366F1'; ctx.beginPath();
    ctx.moveTo(x - 5, TOP - 10); ctx.lineTo(x + 5, TOP - 10); ctx.lineTo(x, TOP - 2); ctx.closePath(); ctx.fill();
  }

  let wasComplete = false;
  let raf = null;
  function draw() {
    // ease scan toward target
    scanPos += (target - scanPos) * 0.14;
    if (Math.abs(target - scanPos) < 0.01) scanPos = target;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const c = chk();
    // title + legend
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = c.color;
    ctx.fillText('Check: ' + c.label, PAD_L, 26);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#94a3b8';
    ctx.fillText(c.legend, PAD_L, 44);
    ctx.textAlign = 'right'; ctx.fillStyle = fail ? '#EF4444' : '#10B981';
    ctx.font = 'bold 10px system-ui';
    ctx.fillText('plan: ' + (fail ? 'FAIL' : 'PASS'), canvas.width - PAD_R, 26);

    if (c.kind === 'onhand') drawOnHand();
    else if (c.kind === 'capacity') drawCapacity();
    else if (c.kind === 'pegging') drawPegging();
    drawMarkers();
    drawScanLine();

    // progress readout
    ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = '#CBD5E1';
    const cc = checkedCount();
    ctx.fillText(`buckets checked ${Math.min(cc, N)} / ${N}`, PAD_L, BOT + 44);

    const complete = (target >= N && scanPos >= N - 0.02);
    if (complete && !wasComplete) verdictLedger();
    wasComplete = complete;

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-check]').forEach(b => b.addEventListener('click', () => selectCheck(b.dataset.check)));
  tab.querySelector('#dbg-run').addEventListener('click', run);
  tab.querySelector('#dbg-step').addEventListener('click', step);
  tab.querySelector('#dbg-reset').addEventListener('click', reset);
  // initial selected state
  tab.querySelectorAll('[data-check]').forEach(b => b.classList.toggle('active', b.dataset.check === active));
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the three validity checks ─────────────────────────────────────────
function checksTab() {
  const rows = [
    ['Negative On Hand', '#38BDF8', 'No material node may show a projected on-hand (BOH + receipts − consumption) below zero in any bucket.', 'Something is consuming stock that does not exist — a pegging, carry, or balance error. The plan is physically impossible.'],
    ['Capacity Overload', '#F59E0B', 'No resource may be loaded beyond its available capacity (Base + any opened overtime bands) in any bucket.', 'The plan assumes more throughput than the resource can deliver — a constrained run should never produce this; it signals the constraint was not respected.'],
    ['Σ Pegging = Plan', '#A78BFA', 'The sum of the peggings must reconcile to the plan quantity — matching across all, with no mismatch.', 'The demand-to-supply links (peggings) do not add up to what was planned, so the plan and its explanation disagree — RCA and peggings cannot be trusted.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The quick plan-quality gate</div><div class="section-desc">The wiki's sanity-check script reports six things, but only three are hard correctness checks. The rule: <em>"There should not be Negative on Hand, or Capacity Overload, or Sigma Pegging = Plan mismatch."</em></div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Check (must NOT exist)</th><th>What it means</th><th>Why a failure matters</th></tr></thead>
          <tbody>
            ${rows.map(([name, col, mean, why]) => `<tr><td style="font-weight:600;color:${col}">${name}</td><td style="color:var(--text2)">${mean}</td><td style="color:var(--text2)">${why}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What the sanity-check script actually reports</div><div class="section-desc">There is a downloadable sanity-check script that generates a DDL + IBPL file; after running it you interpret six outputs.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">The three hard gates</div><div class="info-card-body"><strong>Negative on Hand</strong>, <strong>Capacity Overload</strong>, and <strong>Sigma Pegging = Plan across all</strong> — none may be present. These are the pass/fail correctness checks.</div></div>
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Project-specific context</div><div class="info-card-body"><strong>Demand Supportability</strong> and the <strong>detailed statistics of demand</strong> are, per the wiki, "project specific" — judged against the project's expectations, not a universal threshold.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Supply context</div><div class="info-card-body"><strong>BOH and ER stats</strong> are reported too; the wiki notes there should be "No problem on BOH and ER as well" — they frame the result rather than gate it.</div></div>
      </div>

      <div class="canvas-explainer"><h3>If a check fails, where do you look?</h3>
        <p>The wiki gives a verification order for the solver output: <strong>1)</strong> verify supply (BOH, ER), <strong>2)</strong> WIP, <strong>3)</strong> demand, <strong>4)</strong> safety-stock input, <strong>5)</strong> all input conditions, <strong>6)</strong> the solver, <strong>7)</strong> the Demand Fulfilment Report &amp; Delivery Plan, <strong>8)</strong> Flow Plans, <strong>9)</strong> Peggings, <strong>10)</strong> Inventory Profile, <strong>11)</strong> RCA. A failed gate tells you which branch to walk: a <strong>Negative On-Hand</strong> or <strong>Σ Pegging</strong> mismatch points at supply/WIP/peggings; a <strong>Capacity Overload</strong> points at the constraint inputs and the solver run.</p>
      </div>
    </div>`;
}

// ── Tab 3: the internal solver execution order ───────────────────────────────
function orderTab() {
  // Grounded 23-step internal order. cat: setup | plan | excess | rca | export | finish
  const steps = [
    [1,  'setup',  'Start of solver plugin execution &amp; parameter validation (internally, config validation).'],
    [2,  'setup',  'Delete / truncate of output tables.'],
    [3,  'setup',  'Data loading from LS into SCS memory (demand &amp; network data).'],
    [4,  'plan',   'WIP planning &amp; WIP RCA (WIP RCA is flag-based).'],
    [5,  'excess', 'Excess cleanup — flag-based (can occur at different stages).'],
    [6,  'plan',   'Demand Planning (OBO plan).'],
    [7,  'excess', 'Excess cleanup — flag-based (can occur at different stages).'],
    [8,  'plan',   'Safety Stock Planning.'],
    [9,  'excess', 'Excess cleanup — flag-based (can occur at different stages).'],
    [10, 'plan',   'RePlanning of late &amp; short demands — flag-based.'],
    [11, 'excess', 'Excess cleanup — flag-based (can occur at different stages).'],
    [12, 'plan',   'Push Planning for no-carry resolution — flag-based (can occur at different stages).'],
    [13, 'plan',   'Min Res utilization.'],
    [14, 'rca',    'OBO RCA and Replan In OBO RCA.'],
    [15, 'rca',    'Peggings.'],
    [16, 'export', 'Exports — write output back to LS from SCS.'],
    [17, 'rca',    'Additive Demand RCA &amp; exports.'],
    [18, 'rca',    'SS RCA &amp; exports.'],
    [19, 'rca',    'RCA Peggings &amp; exports — flag-based.'],
    [20, 'rca',    'Zero-qty additive RCA &amp; exports.'],
    [21, 'finish', 'Finished solver run — a summary of records written and overall time per main stage (load, plan, write, etc.).'],
    [22, 'finish', 'Active rule execution starts (LS incremental plan).'],
    [23, 'finish', '"Total Solver run time" is the actual SCS plugin time; the difference to overall time is the LS incremental / post-solver active-rule execution.'],
  ];
  const catColor = { setup: '#64748B', plan: '#6366F1', excess: '#F59E0B', rca: '#A78BFA', export: '#38BDF8', finish: '#10B981' };
  const catName  = { setup: 'Setup', plan: 'Plan', excess: 'Excess cleanup', rca: 'RCA / Peggings', export: 'Export', finish: 'Finish' };

  const legend = Object.keys(catName).map(k =>
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:12px;color:var(--text2)"><span style="width:10px;height:10px;border-radius:2px;background:${catColor[k]};display:inline-block"></span>${catName[k]}</span>`).join('');

  const items = steps.map(([n, cat, text]) => `
    <div class="info-card" style="border-left:3px solid ${catColor[cat]};display:flex;gap:12px;align-items:flex-start;margin:0">
      <div style="font-weight:700;color:${catColor[cat]};min-width:26px;font-variant-numeric:tabular-nums">${String(n).padStart(2, '0')}</div>
      <div class="info-card-body" style="flex:1">${text}</div>
    </div>`).join('');

  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">What happens internally when you invoke the solver</div><div class="section-desc">The solver plans in this order (per the wiki). Note that <strong>Excess cleanup is flag-based and interleaved</strong> between the planning phases — it "can occur at different stages", which is why it appears at steps 5, 7, 9 and 11.</div></div>
      <div style="margin:4px 0 14px">${legend}</div>
      <div class="info-grid" style="grid-template-columns:1fr;gap:8px">${items}</div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Reading the runtimes afterward</div><div class="section-desc">After a run the log prints these metrics — use them to find which stage dominates.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Metric</th><th>Definition</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Total Plan Time</td><td style="color:var(--text2)">WIP planning through the end of OBO RCA.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total WIP Plan Time</td><td style="color:var(--text2)">Started to finished WIP plan.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total Demand Plan Time</td><td style="color:var(--text2)">Started to finished plan generation.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total Inventory Plan Time</td><td style="color:var(--text2)">Started to finished safety-stock (inventory) planning.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total Write Time</td><td style="color:var(--text2)">Start of export plan to end of demand peggings (Pegging + Intermediate + BUP Pegging).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total Additive RCA Time</td><td style="color:var(--text2)">Start of additive RCA to end of RCA peggings.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Total Solver Run Time</td><td style="color:var(--text2)">Total time taken for the whole solver run.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="prose"><p>If one stage dominates — say Demand Planning — the log even reports progress like "Planned 10000 demands out of 13999", and you can cap the work with the <code>No Of Demands To Plan</code> parameter while debugging. To follow a single object's behaviour, the solver exposes <strong>trace debug handles</strong> (Demand Trace, Material Node Trace, Capacity Trace, Safety Stock Trace, WIP Trace, plus Excess Clean-up / Min Utilization / Push Planning traces) — but these are performance-intensive and should never be used in production.</p></div>
    </div>`;
}
