import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is a co-product in the SCS, and how does one activity run behave differently from an ordinary one?',
    a: 'An ordinary production <strong>activity</strong> has one output material — run it once, get one thing. A <strong>co-product</strong> activity produces <strong>several output materials at once, in fixed proportions</strong>: one run yields all its outputs together, and you <em>cannot make one without making the others</em>. Each output carries a <strong>ratio (output/co-product yield)</strong>, so good output of each material = <code>run quantity × that output\'s ratio</code>. Think crude refining (one run → gasoline + diesel + naphtha) or a chemical reaction (main product + by-products). The solver therefore cannot plan each material in isolation — the shared activity ties their supply together.',
    tip: 'One line: "co-products = one activity, many simultaneous outputs in fixed ratios — you can\'t make one without the rest."' },
  { q: 'Distinguish primary product, co-product and by-product.',
    a: 'All three come out of the same joint activity; they differ in <em>intent and value</em>. The <strong>primary (main) product</strong> is the output the activity is normally planned <em>for</em> — the demand that drives how many runs you make. A <strong>co-product</strong> is a genuinely <strong>demanded</strong> joint output of real value that comes along with the primary. A <strong>by-product</strong> is a <strong>low-value</strong> co-output — sometimes with no demand at all, sometimes carrying a negative value or disposal cost (you have to pay to get rid of it). The modelling difference is mostly in valuation and whether the output has its own demand to satisfy, not in the mechanics: all are produced in fixed ratio to the run.',
    tip: 'Primary = what you run for; co-product = valued tag-along with demand; by-product = low/negative-value tag-along, maybe disposal.' },
  { q: 'Why is joint production hard to plan, and what happens when two co-outputs have mismatched demand? Work an example.',
    a: 'Because the outputs are <strong>tied by fixed ratio</strong>, planning to satisfy demand on <em>one</em> output forces production — and therefore inventory — of the <em>others</em>, whether or not they have matching demand. Take ratios <strong>60 A + 30 B + 10 C per run</strong> with demands A=120, B=30, C=10. <strong>Run to satisfy A</strong>: you need 2 runs → A 120 ✓, but B = 60 (30 <strong>excess</strong>) and C = 20 (10 excess). <strong>Run to satisfy B</strong>: 1 run → B 30 ✓, but A = 60 (<strong>short 60</strong>). There is <em>no</em> integer run count that satisfies all three exactly. The solver must balance across all co-outputs of the shared activity, deciding whose demand drives the run count and absorbing the resulting excess (hold / push / scrap) or shortage elsewhere.',
    tip: 'The trap: demand on co-outputs rarely matches the ratio, so you always over- or under-serve someone. State which demand drives the run count.' },
];

// ── Grounded teaching model: one activity, three co-outputs ───────────────────
const RATIOS = { A: 60, B: 30, C: 10 };     // output per single activity run
const DEMAND = { A: 120, B: 30, C: 10 };    // demand on each co-output
const OUTPUTS = ['A', 'B', 'C'];
const COLORS = { A: '#6366F1', B: '#38BDF8', C: '#A78BFA' };

// Runs needed so a chosen driver's demand is met (ceil), then resulting outputs.
function planFor(driver) {
  const runs = Math.ceil(DEMAND[driver] / RATIOS[driver]);
  const out = {};
  OUTPUTS.forEach(k => {
    const made = runs * RATIOS[k];
    const matched = Math.min(made, DEMAND[k]);
    const excess = Math.max(0, made - DEMAND[k]);
    const short = Math.max(0, DEMAND[k] - made);
    out[k] = { made, matched, excess, short };
  });
  return { runs, out };
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Co-Products',
    subtitle: 'One activity, many outputs at once. When a single run produces several materials in fixed proportions, you can never make one without the rest — so satisfying one demand forces excess or shortage on the others. Pick which demand drives the run count and watch the joint-production trade-off.',
    tabs: [
      { id: 'joint',    label: '⚗️ Joint Output' },
      { id: 'ratios',   label: '📖 Ratios & Types', content: ratiosTab() },
      { id: 'concepts', label: '🧩 Why It\'s Hard', content: conceptsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live joint-output canvas ───────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-joint');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One activity produces <b style="color:#6366F1">A</b>, <b style="color:#38BDF8">B</b> and <b style="color:#A78BFA">C</b> together, <b>${RATIOS.A} : ${RATIOS.B} : ${RATIOS.C}</b> per run. Demands are A ${DEMAND.A}, B ${DEMAND.B}, C ${DEMAND.C}. Choose which demand <b>drives the run count</b> and watch the others go <b style="color:#F59E0B">excess</b> or <b style="color:#EF4444">short</b>. No run count satisfies all three.</div>
      <canvas id="cop-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cop-a">▶ Run to satisfy A</button>
        <button class="ctrl-btn" id="cop-b">▶ Run to satisfy B</button>
        <button class="ctrl-btn" id="cop-c">▶ Run to satisfy C</button>
        <button class="ctrl-btn" id="cop-reset">↺ Reset</button>
        <span class="ctrl-label" id="cop-status">Pick which demand should drive the run count.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The activity can only be run a <strong>whole number of times</strong>, and every run makes <code>${RATIOS.A} A + ${RATIOS.B} B + ${RATIOS.C} C</code> — the ratio is fixed. <strong>Run to satisfy A</strong> needs <code>ceil(120 / 60) = 2</code> runs → A = 120 ✓, but B = 60 (<strong style="color:#F59E0B">30 excess</strong>) and C = 20 (<strong style="color:#F59E0B">10 excess</strong>). <strong>Run to satisfy B</strong> needs just <code>1</code> run → B = 30 ✓, but A = 60 (<strong style="color:#EF4444">short 60</strong>) and C = 10 ✓.</p>
      <p>That is the whole difficulty of joint production: because the outputs are <strong>tied by ratio</strong>, hitting one demand exactly throws the others off. The solver has to choose whose demand sets the run count and then absorb the fallout — <strong>hold, push downstream, or scrap</strong> the excess co-outputs, or leave a lower-priority co-output <strong>short</strong>. The green portion of each bar is matched to demand, amber is overproduction, red is unmet demand.</p>
    </div>`;

  const canvas = tab.querySelector('#cop-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#cop-status');

  let driver = null;
  let plan = null;
  let anim = 0;        // 0..1 fill progress

  function run(d) {
    driver = d; plan = planFor(d); anim = 0;
    const parts = OUTPUTS.map(k => {
      const o = plan.out[k];
      if (o.short) return `${k} short ${o.short}`;
      if (o.excess) return `${k} +${o.excess} excess`;
      return `${k} met`;
    });
    statusEl.textContent = `Drive by ${d}: ${plan.runs} run(s) → ${parts.join(' · ')}.`;
  }
  function reset() { driver = null; plan = null; anim = 0; statusEl.textContent = 'Pick which demand should drive the run count.'; }

  const actX = 70, actY = 150, actW = 150, actH = 80;
  const outX = 430, outW = 360, rowH = 86, outY0 = 44;

  let raf = null;
  function draw() {
    if (plan && anim < 1) anim = Math.min(1, anim + 0.04);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // activity node
    drawRoundRect(ctx, actX, actY, actW, actH, 12, '#111827', driver ? '#10B981' : '#334155');
    ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText('ACTIVITY', actX + actW / 2, actY + 26);
    ctx.font = '11px system-ui'; ctx.fillStyle = '#94A3B8';
    ctx.fillText(driver ? `${plan.runs} run${plan.runs > 1 ? 's' : ''}` : 'idle', actX + actW / 2, actY + 46);
    ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(`${RATIOS.A}:${RATIOS.B}:${RATIOS.C} per run`, actX + actW / 2, actY + 64);

    // header
    ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Co-outputs (made this plan vs demand)', outX, 28);

    // the three output bars
    OUTPUTS.forEach((k, i) => {
      const y = outY0 + i * rowH + 6;
      const o = plan ? plan.out[k] : { made: 0, matched: 0, excess: 0, short: 0 };
      const col = COLORS[k];
      const barX = outX, barY = y + 26, barH = 34;
      const scale = outW / 140;   // px per unit (140 units ≈ full width)
      const demW = DEMAND[k] * scale;

      // arrow from activity
      if (driver) drawArrow(ctx, actX + actW, actY + actH / 2, outX - 6, barY + barH / 2, col + '99', 1.6);

      // label
      ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = col;
      ctx.fillText(`Output ${k}`, barX, y + 18);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText(`ratio ${RATIOS[k]}/run · demand ${DEMAND[k]}`, barX + 70, y + 18);

      // demand outline
      drawRoundRect(ctx, barX, barY, demW, barH, 6, '#0d1322', '#1e2a3f');

      const a = anim;
      const matchedW = o.matched * scale * a;
      const excessW = o.excess * scale * a;
      const shortW = o.short * scale * a;

      // matched (green) up to demand
      if (matchedW > 0) drawRoundRect(ctx, barX, barY, matchedW, barH, 6, '#10B98155', '#10B981');
      // short (red) remainder of the demand outline
      if (shortW > 0) {
        const sx = barX + matchedW;
        drawRoundRect(ctx, sx, barY, shortW, barH, 6, '#EF444433', '#EF4444');
      }
      // excess (amber) beyond the demand outline
      if (excessW > 0) {
        const ex = barX + demW;
        drawRoundRect(ctx, ex, barY, excessW, barH, 6, '#F59E0B44', '#F59E0B');
      }

      // readout
      ctx.textAlign = 'right'; ctx.font = 'bold 11px system-ui';
      let tag = '', tc = '#94A3B8';
      if (plan) {
        if (o.short) { tag = `made ${o.made} · short ${o.short}`; tc = '#EF4444'; }
        else if (o.excess) { tag = `made ${o.made} · +${o.excess} excess`; tc = '#F59E0B'; }
        else { tag = `made ${o.made} · met`; tc = '#10B981'; }
      }
      ctx.fillStyle = tc;
      ctx.fillText(tag, outX + outW + 60, y + 18);
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#cop-a').addEventListener('click', () => run('A'));
  tab.querySelector('#cop-b').addEventListener('click', () => run('B'));
  tab.querySelector('#cop-c').addEventListener('click', () => run('C'));
  tab.querySelector('#cop-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: ratios & types (static, grounded) ──────────────────────────────────
function ratiosTab() {
  const rows = [
    ['1', '60', '30', '10'],
    ['2', '120', '60', '20'],
    ['3', '180', '90', '30'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Fixed ratios — the run multiplies every output together</div><div class="section-desc">Each co-output has its own ratio per activity run. Good output of a material = <code>run quantity × that output\'s ratio</code>. The ratios never move relative to each other.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Runs</th><th>Output A (×${RATIOS.A})</th><th>Output B (×${RATIOS.B})</th><th>Output C (×${RATIOS.C})</th></tr></thead>
          <tbody>${rows.map(([r, a, b, c]) => `<tr><td style="font-weight:700;color:var(--accent)">${r}</td><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Primary, co-product, by-product</div><div class="section-desc">All three leave the same joint activity in fixed ratio. They differ in intent and value, not mechanics.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Primary (main) product</div><div class="info-card-body">The output the activity is normally planned <strong>for</strong> — its demand usually drives how many runs the solver makes. In the demo, A plays this role.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Co-product</div><div class="info-card-body">A genuinely <strong>demanded</strong> joint output of real value that comes along with the primary. It has its own demand to satisfy and its own inventory to manage.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">By-product</div><div class="info-card-body">A <strong>low-value</strong> co-output — sometimes with no demand at all, sometimes a <strong>negative value / disposal cost</strong>. You may have to pay to remove it, so overproducing it is doubly bad.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Real-world joint production</h3>
        <p>Co-products appear wherever one physical process yields several things at once: crude refining (one run → gasoline + diesel + naphtha), meat processing (one carcass → many cuts), chemical reactions (main product + by-products), and semiconductor fab (one wafer lot → several speed/quality bins). In every case the planner cannot order "just the diesel" — the run that makes diesel also makes everything else in the barrel, in the ratio the process dictates.</p>
      </div>
    </div>`;
}

// ── Tab 3: why it's hard (static, grounded) ───────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Why joint production is hard to plan</div><div class="section-desc">Tying outputs together removes the solver\'s freedom to plan each material on its own. One decision — how many runs — sets the supply of <em>all</em> co-outputs at once.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">One lever, many outputs</div><div class="info-card-body">The only real decision is the <strong>run count</strong>. Pick it to satisfy one demand and the ratio decides every other output's quantity for you — there is no independent dial per material.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Forced overproduction</div><div class="info-card-body">Running enough for a high-demand co-output <strong>overproduces</strong> the low-demand ones. In the demo, satisfying A (2 runs) forces <strong>30 excess B</strong> and <strong>10 excess C</strong> that must be held, pushed, or scrapped.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Forced shortage</div><div class="info-card-body">Run instead to a low-demand co-output and the high-demand one goes <strong>short</strong>. Satisfying B (1 run) leaves A <strong>short 60</strong>. Someone always loses when demands don't match the ratio.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What the solver does with the fallout</div><div class="section-desc">After the run count is set, the excess and shortages flow into the rest of the plan.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Outcome</th><th>Handled by</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Excess co-output</td><td>Held as inventory (if the node can carry), <strong>pushed</strong> downstream, or cleaned up / scrapped by <strong>excess cleanup</strong> — especially for by-products with no demand.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Short co-output</td><td>Left unmet (demand short) or covered by an <strong>alternate activity</strong> that makes that material without the joint tie, if one exists.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Balancing</td><td>The solver weighs whose demand drives the run count using <strong>priority</strong> and the objective — the primary / highest-priority co-output usually wins.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Where it connects</h3>
        <p>Co-products lean on two mechanics you have already seen. <strong>Excess cleanup</strong> decides what happens to overproduced co-outputs and valueless by-products. <strong>Yield</strong> stacks on top: each output's ratio is effectively its yield from the run, and a co-output can carry its own yield loss as well. The planning skill is accepting that <em>perfect</em> matching is usually impossible, and choosing which co-output to serve exactly and which to let drift into excess or shortage.</p>
      </div>
    </div>`;
}
