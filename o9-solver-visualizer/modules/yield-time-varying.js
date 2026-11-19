import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Define yield in the SCS and give the gross-up formula with a worked number.',
    a: '<strong>Yield</strong> is the fraction of what an activity <em>starts</em> that becomes <strong>good output</strong>. When yield &lt; 1 there are process losses, so to deliver a required good quantity the activity must start <em>more</em> than that. The <strong>gross-up rule</strong> is <code>started input = required good ÷ yield</code> (then rounded up / lot-sized). Worked: to get <strong>100</strong> good units at <strong>80%</strong> yield, the solver must start <code>100 ÷ 0.8 = 125</code>; the <strong>25</strong> unit difference is scrap that is lost. The gross-up <em>propagates</em>: the 125 started becomes the requirement passed to the components, which may themselves have yields.',
    tip: 'One line: "started = good ÷ yield, rounded up." The scrap is good − started... no — started − good. Say the loss out loud.' },
  { q: 'A planner leaves a yield blank (NULL) expecting zero output. What actually happens, and how does yield interact with lot sizing?',
    a: 'A yield of <strong>0 or NULL is treated as 1</strong> (100%, no loss) by the solver — <em>not</em> as zero output. A blank yield therefore means "no gross-up," which is a classic configuration gotcha: the planner sees no scrap and assumes the yield applied, when in fact it was ignored. On ordering: <strong>lot size takes precedence over yield</strong>. The solver <em>lot-sizes the production first</em> (min / multiple / max-lot shape the quantity), and <em>then</em> grosses up for yield as the requirement propagates upstream to components. So you lot-size the clean number, then multiply out the component pulls by yield — not the other way around.',
    tip: 'Two traps in one: 0/NULL yield ⇒ 1, and lot-size-before-yield. Both are common interview catches.' },
  { q: 'What does time-varying yield add, and how can it change <em>when</em> the solver chooses to produce?',
    a: 'Yield need not be a single constant — it can vary <strong>by bucket</strong>: a ramp-up line might yield 70% in week 1, 85% in week 2, 95% thereafter (or temperature/season effects). The solver uses the yield <strong>effective in the bucket where production occurs</strong>. Because a low-yield bucket needs more input for the same good output, producing early on a ramping line costs more material — e.g. 100 good units costs <code>143</code> started at 70% but only <code>106</code> at 95%. That gives the solver a reason to <strong>shift production to a higher-yield bucket</strong> (a form of build-ahead) when capacity and shelf life allow. The input-side analogue is a <strong>time-varying consumption factor</strong>: the component quantity consumed per parent unit can also change by bucket.',
    tip: 'Time-varying yield makes timing a cost lever: same good qty, different input depending on the bucket you build in.' },
];

// ── Grounded teaching values ──────────────────────────────────────────────────
const GOOD = 100;                       // required good units for the order
const YIELDS = [0.70, 0.80, 0.85, 0.90, 0.95, 0.95]; // yield by bucket W1..W6
function startedFor(y) { return y <= 0 ? GOOD : Math.ceil(GOOD / y); } // 0/NULL → treat as 1

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Time-Varying Yield',
    subtitle: 'Yield is the fraction of what you start that comes out good — so to get the quantity you need, the solver starts more and scraps the rest. Make the yield change bucket-by-bucket and watch the same order cost different amounts of input depending on when it is built.',
    tabs: [
      { id: 'yield',       label: '📉 Yield by Bucket' },
      { id: 'grossup',     label: '🧮 Gross-Up Rule', content: grossUpTab() },
      { id: 'consumption', label: '🔁 Consumption Factor', content: consumptionTab() },
      { id: 'iq',          label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live started-vs-good across time-varying yield buckets ─────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-yield');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The order needs <b>${GOOD}</b> good units. Each bucket has its own <b style="color:#38BDF8">yield</b> (a ramp-up line). Pick the bucket you build in and watch the <b style="color:#F59E0B">started input</b> = ceil(${GOOD} ÷ yield) — the <b style="color:#10B981">good</b> part is delivered, the <b style="color:#EF4444">scrap</b> part is lost. Same order, different cost of material depending on <i>when</i>.</div>
      <canvas id="yld-canvas" width="860" height="340" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="yld-prev">◀ Earlier bucket</button>
        <button class="ctrl-btn" id="yld-next">Later bucket ▶</button>
        <button class="ctrl-btn" id="yld-null">∅ NULL-yield bucket</button>
        <button class="ctrl-btn" id="yld-reset">↺ Reset</button>
        <span class="ctrl-label" id="yld-status">Pick the production bucket.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Every bucket draws two stacked bars: the full <strong>started input</strong> and, inside it, the <strong>good</strong> portion that survives. The gap is <strong>scrap</strong>. With the yield ramp <code>70 · 80 · 85 · 90 · 95 · 95 %</code>, building ${GOOD} good units costs <code>${startedFor(YIELDS[0])}</code> started in <strong>W1</strong> (70% yield → ${startedFor(YIELDS[0]) - GOOD} scrapped) but only <code>${startedFor(YIELDS[4])}</code> in <strong>W5</strong> (95% yield → ${startedFor(YIELDS[4]) - GOOD} scrapped). The good output is identical; the <em>material burned</em> is not.</p>
      <p>That is why time-varying yield is a <strong>timing lever</strong>: if W1 capacity is tight or the line is still ramping, the solver has a material reason to shift the build to a higher-yield bucket when shelf life and capacity allow. The <strong>NULL-yield</strong> button shows the gotcha — a blank or 0 yield is treated as <strong>100%</strong>, so started = good = ${GOOD} with <em>zero</em> scrap. A planner who meant "this step wastes everything" instead gets no gross-up at all.</p>
    </div>`;

  const canvas = tab.querySelector('#yld-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#yld-status');

  let sel = 0;              // selected bucket index
  let nullMode = false;     // show the selected bucket as NULL/0 yield
  let pop = 0;

  const n = YIELDS.length;
  const plotX = 60, plotW = 740, baseY = 280, topY = 70;
  const slotW = plotW / n;
  const maxStarted = Math.max(...YIELDS.map(startedFor)); // for scaling (~143)
  const scaleH = baseY - topY;

  function setSel(i) { sel = Math.max(0, Math.min(n - 1, i)); nullMode = false; pop = 12; updateStatus(); }
  function updateStatus() {
    const y = nullMode ? 0 : YIELDS[sel];
    const started = nullMode ? GOOD : startedFor(YIELDS[sel]);
    const scrap = started - GOOD;
    statusEl.textContent = nullMode
      ? `W${sel + 1} with NULL/0 yield → treated as 100%. Started = good = ${GOOD}, scrap 0.`
      : `W${sel + 1}: yield ${Math.round(y * 100)}% → start ${started} to get ${GOOD} good (scrap ${scrap}).`;
  }

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`Started input vs good output — order needs ${GOOD} good`, plotX, 40);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('started = ceil(good ÷ yield); gap = scrap', plotX, 56);

    // target good line
    const goodY = baseY - (GOOD / maxStarted) * scaleH;
    ctx.strokeStyle = '#10B98166'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(plotX, goodY); ctx.lineTo(plotX + plotW, goodY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#10B981'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`good = ${GOOD}`, plotX + plotW + 2, goodY + 3);

    for (let i = 0; i < n; i++) {
      const isSel = i === sel;
      const yv = (isSel && nullMode) ? 0 : YIELDS[i];
      const started = (isSel && nullMode) ? GOOD : startedFor(YIELDS[i]);
      const good = GOOD;
      const scrap = started - good;
      const grow = isSel ? (pop / 12) * 2 : 0;

      const bw = slotW * 0.5 + grow * 2;
      const cx = plotX + i * slotW + slotW / 2;
      const bx = cx - bw / 2;

      const startedH = (started / maxStarted) * scaleH;
      const goodH = (good / maxStarted) * scaleH;

      // scrap portion (top) — drawn as full started bar in red, then good overlaid green
      drawRoundRect(ctx, bx, baseY - startedH, bw, startedH, 6, isSel ? '#3b1518' : '#2a1416', isSel ? '#EF4444' : '#7f1d1d');
      // good portion (bottom)
      drawRoundRect(ctx, bx, baseY - goodH, bw, goodH, 6, isSel ? '#10381f' : '#0d2a18', isSel ? '#10B981' : '#14532d');

      // yield label
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = isSel ? '#38BDF8' : '#475569';
      ctx.fillText((isSel && nullMode) ? 'NULL' : `${Math.round(YIELDS[i] * 100)}%`, cx, baseY - startedH - 20);

      // started value
      ctx.font = 'bold 13px system-ui';
      ctx.fillStyle = isSel ? '#F59E0B' : '#64748B';
      ctx.fillText(String(started), cx, baseY - startedH - 6);

      // scrap badge
      if (scrap > 0 && isSel) {
        ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#EF4444';
        ctx.fillText(`scrap ${scrap}`, cx, baseY - startedH + (startedH - goodH) / 2 + 4);
      }

      // bucket label
      ctx.font = isSel ? 'bold 11px system-ui' : '10px system-ui';
      ctx.fillStyle = isSel ? '#E2E8F0' : '#64748B';
      ctx.fillText(`W${i + 1}`, cx, baseY + 18);
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#yld-prev').addEventListener('click', () => setSel(sel - 1));
  tab.querySelector('#yld-next').addEventListener('click', () => setSel(sel + 1));
  tab.querySelector('#yld-null').addEventListener('click', () => { nullMode = !nullMode; pop = 12; updateStatus(); });
  tab.querySelector('#yld-reset').addEventListener('click', () => setSel(0));
  setSel(0);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: gross-up rule (static, grounded) ──────────────────────────────────
function grossUpTab() {
  const rows = [
    ['100', '100% (or 0 / NULL)', '100', '0'],
    ['100', '95%', '106', '6'],
    ['100', '90%', '112', '12'],
    ['100', '80%', '125', '25'],
    ['100', '70%', '143', '43'],
    ['100', '50%', '200', '100'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The gross-up rule</div><div class="section-desc">To deliver a required good quantity through a lossy step, the solver starts more than it needs. The surplus is scrapped.</div></div>

      <div class="canvas-explainer">
        <h3>started input = required good ÷ yield</h3>
        <p>Then the result is rounded up (and lot-sized). The gross-up <strong>propagates upstream</strong>: the started quantity becomes the requirement handed to the components, each of which applies its own yield. Across a multi-level BOM the losses compound.</p>
      </div>

      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Required good</th><th>Yield</th><th>Started = ceil(good ÷ yield)</th><th>Scrap</th></tr></thead>
          <tbody>${rows.map(([g, y, s, sc]) => `<tr><td>${g}</td><td>${y}</td><td style="font-weight:700;color:var(--accent)">${s}</td><td style="color:#EF4444">${sc}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">⚠️ 0 / NULL yield ⇒ 1</div><div class="info-card-body">A yield of <strong>0 or blank is treated as 100%</strong>, not as zero output. A planner who leaves it empty expecting total loss instead gets <em>no gross-up at all</em>. Always set the yield explicitly.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Lot size before yield</div><div class="info-card-body">The solver <strong>lot-sizes the production first</strong> (min / multiple / max-lot), <em>then</em> grosses the quantity up for yield as the requirement propagates to components — not the reverse.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Losses compound upstream</div><div class="info-card-body">Each BOM level applies its own yield. A 90% step feeding an 80% step needs <code>good ÷ 0.8 ÷ 0.9</code> of the raw material — the gross-ups multiply as you walk up the chain.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: consumption factor (static, grounded) ─────────────────────────────
function consumptionTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Consumption factor — the input-side twin of yield</div><div class="section-desc">Yield adjusts the <em>output</em> of an activity; the consumption factor adjusts how much of an <em>input</em> each parent unit consumes. Both can be time-varying.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Gross component requirement</div><div class="info-card-body"><code>component needed = parent qty × consumption-factor(bucket)</code>. If a process consumes 1.1 units of a component per parent unit while ramping and 1.0 once stable, the earlier buckets pull more material for the same output.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Two sides, one idea</div><div class="info-card-body">Yield (loss on what comes <em>out</em>) and consumption factor (extra on what goes <em>in</em>) are both ways to model <strong>time-phased process efficiency</strong>. The solver reads the value <em>effective in the production bucket</em>.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Timing becomes a cost</div><div class="info-card-body">Because a low-yield / high-consumption bucket burns more material for the same good output, efficiency that improves over time gives the solver a reason to <strong>shift production to a better bucket</strong> — a build-ahead driven by material cost rather than capacity.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px">
        <h3>Why this matters to the plan</h3>
        <p>A constant yield just inflates every order by a fixed factor. A <strong>time-varying</strong> yield or consumption factor makes the <em>when</em> matter: the same 100 good units can cost 143 started on a week-1 ramp (70%) or 106 once the line matures (95%). The solver weighs that extra material against capacity, shelf life and build-ahead limits — so modelling a realistic ramp curve changes not just quantities but the <strong>timing</strong> of the plan.</p>
      </div>
    </div>`;
}
