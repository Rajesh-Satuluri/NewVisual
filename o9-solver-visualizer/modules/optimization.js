import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is an "optimization pass" in the SCS, and what does the Objective / Rank List (ORL) have to do with it?',
    a: 'The solver does <strong>not</strong> build a plan in one shot. It runs a sequence of <strong>ordered passes</strong>, each improving the plan a little further. The first and most important input to that sequence is the <strong>Objective / Rank List (ORL)</strong> — the ranked priority order of demands. Pass one walks the ORL <strong>top-down</strong> and pegs the scarcest supply to the <strong>highest-priority demand first</strong>, so when supply is short the low-priority demand is the one left unfilled. Later passes (WIP sweep, material reallocation, multipass) refine that plan, but they are <strong>constrained by the ORL</strong>: no later pass is allowed to break a peg it already gave to a higher-priority demand. So the ORL is both the ordering of pass one and the guard-rail on every pass after it.',
    tip: 'One line: "ORL ranks the demands; pass 1 pegs top-down; later passes may only improve, never break a higher-priority peg."' },
  { q: 'What does the "WIP sweep" pass do, and why does the solver sweep before it builds new supply?',
    a: 'After the greedy ORL peg, some demand may still be short. Before the solver creates <strong>new</strong> supply to cover the shortfall, the <strong>WIP sweep</strong> pass looks for supply that <strong>already exists</strong> — work-in-process, on-hand that pass one did not consume, in-transit — and sweeps it into the remaining open demand. It builds new supply only for what is <em>still</em> short after that sweep. The reason is both cost and realism: existing WIP is already paid for and already in the pipeline, so consuming it is cheaper and faster than starting a fresh production or purchase order. Building new supply while usable WIP sits idle would inflate inventory and the objective cost for no benefit.',
    tip: 'Consume what already exists (WIP / on-hand) before creating anything new — it is cheaper and already in the pipeline.' },
  { q: 'Once every demand is filled, what is left for the "material reallocation" and "multipass" passes to do?',
    a: 'Full fill is not the same as the <strong>cheapest</strong> full fill. <strong>Material reallocation</strong> looks for pegs that can be <strong>swapped among equal-fill alternatives</strong> to lower the objective — e.g. a demand pegged to a far or expensive source during the greedy pass is re-pegged to a cheaper, nearer source that was skipped earlier. Fill rate is unchanged; only the <strong>cost of the plan</strong> drops. <strong>Multipass</strong> then repeats the passes until no improving move remains — a <strong>fixed point / convergence</strong>. Each iteration is constrained not to break a higher-priority peg, so the objective is monotonically non-worsening and the loop terminates. Convergence is what lets the solver stop: when a full sweep finds nothing left to improve, the plan is final.',
    tip: 'Reallocation = same fill, lower cost. Multipass = iterate to a fixed point where no pass improves anything.' },
];

// ── Grounded teaching scenario ────────────────────────────────────────────────
// Supply pool = 100 units; three demands by ORL priority; 20 units of idle WIP.
const DEMANDS = [
  { id: 'D1', pri: 1, need: 50 },
  { id: 'D2', pri: 2, need: 40 },
  { id: 'D3', pri: 3, need: 30 },
];
const POOL = 100;
const WIP = 20;

// Plan state after each pass index (0 = nothing done).
// Returns { fill:{D1,D2,D3}, score, note, realloc }
function planAfter(pass) {
  // Pass 1 — greedy ORL peg of the 100-unit pool, top-down.
  let pool = POOL;
  const fill = {};
  for (const d of DEMANDS) { const take = Math.min(d.need, pool); fill[d.id] = take; pool -= take; }
  // fill = D1 50, D2 40, D3 10  (D3 short 20)
  let score = 100;                 // objective: lower is better (illustrative)
  let realloc = false;
  if (pass >= 2) { fill.D3 = Math.min(30, fill.D3 + WIP); score = 72; }  // WIP sweep: +20 → D3 30
  if (pass >= 3) { score = 54; realloc = true; }                        // reallocation: same fill, cheaper source
  if (pass >= 4) { score = 48; realloc = true; }                        // multipass converged
  return { fill, score, realloc };
}

const PASS_NOTE = {
  0: 'Press ▶ Next Pass to run the solver one pass at a time.',
  1: 'Pass 1 · ORL greedy peg: scarce 100 units go top-down — D1 50, D2 40, D3 10. D3 short 20.',
  2: 'Pass 2 · WIP sweep: 20 idle WIP units swept into D3 → 30/30. All demand filled.',
  3: 'Pass 3 · Material reallocation: D2 re-pegged to a cheaper source. Same fill, objective 72 → 54.',
  4: 'Pass 4 · Multipass: iterated to convergence — no improving move left. Objective 54 → 48. Final.',
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Optimization & Ops',
    title: 'Optimization Passes',
    subtitle: 'The solver does not build a plan in one shot — it runs ordered passes, each improving the last. Step through the ORL greedy peg, a WIP sweep, a material reallocation, and multipass convergence, and watch the fill rate and the objective score move.',
    tabs: [
      { id: 'passes',  label: '🚀 Pass-by-Pass' },
      { id: 'anatomy', label: '🧩 The Four Passes', content: anatomyTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live pass-by-pass canvas ───────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-passes');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One scarce supply pool of <b>100</b> against three demands — <b style="color:#F87171">D1</b> (pri 1, 50), <b style="color:#FBBF24">D2</b> (pri 2, 40), <b style="color:#38BDF8">D3</b> (pri 3, 30). Total demand is 120, so pass 1 cannot fill everyone. Step the passes and watch the plan improve: WIP sweep closes the short, reallocation lowers cost, multipass converges.</div>
      <canvas id="opt-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="opt-next">▶ Next Pass</button>
        <button class="ctrl-btn" id="opt-all">⏭ Run All</button>
        <button class="ctrl-btn" id="opt-reset">↺ Reset</button>
        <span class="ctrl-label" id="opt-status">Press ▶ Next Pass to run the solver one pass at a time.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each bar is one demand: the dim track is what it <strong>needs</strong>, the filled part is what the plan <strong>pegs</strong> to it. The <strong>objective score</strong> (lower is better) is the cost the solver is trying to drive down.</p>
      <p><strong>Pass 1</strong> walks the ORL top-down and hands the scarce 100 units to the highest priorities first — D1 and D2 fill, D3 is left short 20. <strong>Pass 2</strong> sweeps in 20 units of idle WIP before building anything new, closing D3 to 30/30. <strong>Pass 3</strong> re-pegs D2 from an expensive source to a cheaper one — the fill does not change but the score drops. <strong>Pass 4</strong> repeats until no move improves the plan: convergence, and the plan is final. No later pass is ever allowed to break a peg it already gave to a higher-priority demand.</p>
    </div>`;

  const canvas = tab.querySelector('#opt-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#opt-status');

  let pass = 0;          // 0..4
  let pop = 0;           // animation pulse after a pass
  let shownScore = 100;  // eased score readout

  function setPass(p) {
    pass = Math.max(0, Math.min(4, p));
    pop = 16;
    statusEl.textContent = PASS_NOTE[pass];
  }
  function next() { if (pass < 4) setPass(pass + 1); }
  function runAll() { setPass(4); }
  function reset() { pass = 0; pop = 10; shownScore = 100; statusEl.textContent = PASS_NOTE[0]; }

  const barX = 180, barW = 480, barH = 46, barGap = 30, topY = 70;

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const state = planAfter(pass);
    const colors = { D1: '#F87171', D2: '#FBBF24', D3: '#38BDF8' };

    // header
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Demand fill — pegged vs needed', barX, 44);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(pass === 0 ? 'no passes run yet' : `after pass ${pass} of 4`, barX, 58);

    // pass pips
    for (let i = 1; i <= 4; i++) {
      const px = barX + barW - 18 - (4 - i) * 26;
      ctx.beginPath(); ctx.arc(px, 50, 7, 0, Math.PI * 2);
      ctx.fillStyle = i <= pass ? '#A78BFA' : '#1e2a3f'; ctx.fill();
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = i <= pass ? '#0A0E1A' : '#475569';
      ctx.textAlign = 'center'; ctx.fillText(String(i), px, 53);
    }

    DEMANDS.forEach((d, i) => {
      const y = topY + i * (barH + barGap);
      const filled = state.fill[d.id];
      const frac = filled / d.need;
      const c = colors[d.id];
      const isD3grow = d.id === 'D3' && pass >= 2;
      const isD2realloc = d.id === 'D2' && state.realloc;

      // label
      ctx.textAlign = 'left'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(d.id, 40, y + 22);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText(`priority ${d.pri}`, 40, y + 38);
      ctx.fillText(`need ${d.need}`, 110, y + 22);

      // track
      drawRoundRect(ctx, barX, y, barW, barH, 8, '#0d1322', '#1e2a3f');
      // fill
      const grow = (isD3grow && pop > 0) ? (pop / 16) * 6 : 0;
      const fw = Math.max(0, barW * frac);
      if (fw > 0) {
        drawRoundRect(ctx, barX, y - grow / 2, fw, barH + grow, 8, c + '44', c);
      }

      // short marker
      if (filled < d.need) {
        const sx = barX + fw;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#EF4444AA'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(sx, y - 4); ctx.lineTo(sx, y + barH + 4); ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#F87171';
        ctx.fillText(`short ${d.need - filled}`, barX + barW + 12, y + 28);
      } else {
        ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#34D399';
        ctx.fillText('filled ✓', barX + barW + 12, y + 28);
      }

      // in-bar qty
      ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#0A0E1A';
      if (fw > 44) ctx.fillText(`${filled} / ${d.need}`, barX + fw / 2, y + 29);

      // reallocation arrow on D2 (pass 3+)
      if (isD2realloc) {
        const ay = y + barH / 2;
        drawArrow(ctx, barX + barW + 70, ay - 18, barX + barW + 70, ay + 14, '#34D399CC', 1.8);
        ctx.textAlign = 'left'; ctx.font = '9px system-ui'; ctx.fillStyle = '#34D399';
        ctx.fillText('re-pegged', barX + barW + 84, ay - 4);
        ctx.fillText('→ cheaper src', barX + barW + 84, ay + 8);
      }
      // WIP sweep tag on D3
      if (isD3grow) {
        ctx.textAlign = 'left'; ctx.font = '9px system-ui'; ctx.fillStyle = '#38BDF8';
        ctx.fillText('+20 WIP swept in', barX + 6, y + barH + 14);
      }
    });

    // objective score panel
    const sx = 40, sy = topY + 3 * (barH + barGap) + 2, sw = barW + 120, sh = 54;
    drawRoundRect(ctx, sx, sy, sw, sh, 10, '#111827', '#6366F1');
    shownScore += (state.score - shownScore) * 0.18;
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#A5B4FC';
    ctx.fillText('Objective score  (lower = cheaper plan)', sx + 18, sy + 22);
    ctx.font = 'bold 28px system-ui';
    ctx.fillStyle = state.score <= 48 ? '#34D399' : '#E2E8F0';
    ctx.fillText(shownScore.toFixed(0), sx + 18, sy + 46);
    // mini bar for score (100 → 48)
    const gx = sx + 120, gw = sw - 150, gy = sy + 34;
    drawRoundRect(ctx, gx, gy, gw, 12, 6, '#0d1322', '#1e2a3f');
    const sfrac = Math.max(0, Math.min(1, (shownScore - 40) / (100 - 40)));
    drawRoundRect(ctx, gx, gy, gw * sfrac, 12, 6, '#6366F155', '#6366F1');
    ctx.textAlign = 'right'; ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(pass >= 4 ? 'converged' : 'improving…', sx + sw - 16, sy + 20);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#opt-next').addEventListener('click', next);
  tab.querySelector('#opt-all').addEventListener('click', runAll);
  tab.querySelector('#opt-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the four passes (static) ───────────────────────────────────────────
function anatomyTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The four passes, in order</div><div class="section-desc">The solver refines one plan through a fixed sequence of passes. Each pass has a single job, and each later pass is constrained not to undo the priorities an earlier pass established.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Pass</th><th>What it does</th><th>Principle</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">1 · ORL greedy peg</td><td>Walk the Objective / Rank List top-down; peg the scarce supply to the highest-priority demands first. Here: D1 50, D2 40, D3 10 (short 20).</td><td>Priority wins scarcity — the low-priority demand is the one left short.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">2 · WIP sweep</td><td>Find supply that already exists (WIP, on-hand, in-transit) and sweep it into open demand before building anything new. Here: 20 WIP → D3, now 30/30.</td><td>Consume what exists before creating new supply — it is cheaper and already in the pipeline.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">3 · Material reallocation</td><td>Swap pegs among equal-fill alternatives to cut cost — re-peg D2 from an expensive source to a cheaper one. Fill unchanged; objective drops.</td><td>Full fill ≠ cheapest fill; move pegs to improve the objective without disturbing higher-priority pegs.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">4 · Multipass</td><td>Repeat the passes until no improving move remains — a fixed point. Objective settles; the plan is final.</td><td>Iterate to convergence; each pass is monotonically non-worsening, so the loop terminates.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #F87171"><div class="info-card-title">Priority is a guard-rail, not just an order</div><div class="info-card-body">The ORL decides pass 1's order <em>and</em> forbids every later pass from breaking a peg already given to a higher-priority demand. That is what keeps reallocation from "robbing" D1 to make D3 cheaper.</div></div>
        <div class="info-card" style="border-left:3px solid #FBBF24"><div class="info-card-title">Sweep before build</div><div class="info-card-body">New supply is the last resort. WIP, on-hand and in-transit are swept first, so the plan only creates fresh orders for what is genuinely still short.</div></div>
        <div class="info-card" style="border-left:3px solid #34D399"><div class="info-card-title">Cost after coverage</div><div class="info-card-body">Reallocation runs once coverage is settled. It never lowers fill — it only finds a cheaper way to deliver the same fill, dropping the objective score.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static) ──────────────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Why passes, and why ordered?</div><div class="section-desc">A single-shot optimum over a large supply network is intractable and brittle. Ordered passes make the plan both explainable and stable.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Decompose the problem</div><div class="info-card-body">Coverage (who gets the scarce supply) and cost (which source delivers it) are separated into different passes. Each pass is a smaller, well-defined problem the solver can reason about and a planner can audit.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Monotone improvement</div><div class="info-card-body">Every pass is constrained to leave the plan no worse than it found it — fill never drops, higher-priority pegs never break, and the objective never rises. That guarantee is what makes the multipass loop safe to run to convergence.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Convergence = a stopping rule</div><div class="info-card-body">The solver keeps sweeping passes until a full sweep finds <strong>nothing</strong> left to improve — a fixed point. That is the signal the plan is final; without it the solver would never know when to stop.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Why a later pass may never break a higher-priority peg</h3>
        <p>If material reallocation were allowed to un-peg D1 to make D3's plan cheaper, the objective might fall but the <strong>business intent</strong> encoded in the ORL would be violated — a lower-priority order would displace a higher one. So every improving move is checked against the priority order first: it may shuffle pegs <em>within</em> what the ORL permits, but it can never move scarce supply from a higher-priority demand to a lower one. This is the difference between a planning solver and a pure cost minimiser — the ORL is a hard constraint on optimisation, not merely a tie-breaker.</p>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Reading the objective score</div><div class="section-desc">In this module the score is illustrative (100 → 48), but the shape is real: coverage closes first, then cost falls, then it flattens at convergence.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Pass 1 → 2: coverage</div><div class="info-card-body">The biggest early gain is closing the short with existing WIP — fill goes from 100/120 to 120/120.</div></div>
        <div class="info-card" style="border-left:3px solid #FBBF24"><div class="info-card-title">Pass 3: cost</div><div class="info-card-body">With everyone filled, reallocation trims the expensive sourcing decisions that the greedy pass made under pressure.</div></div>
        <div class="info-card" style="border-left:3px solid #34D399"><div class="info-card-title">Pass 4: flatten</div><div class="info-card-body">The last pass finds only small gains, then none — the curve flattens and the solver stops.</div></div>
      </div>
    </div>`;
}
