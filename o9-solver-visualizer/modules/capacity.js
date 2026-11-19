import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is the fundamental difference between a capacity (resource) constraint and a material constraint, and what changes when a run is Unconstrained?',
    a: 'A <strong>resource / capacity</strong> is a basic building block of the network that <em>restricts the throughput</em> of the system. The key difference from material: <strong>material can be carried over</strong> from one planning bucket to the next, but <strong>capacity expires at the end of its bucket</strong> — unused capacity in W05 cannot help a demand in W06. In a <strong>Constrained</strong> run the solver must fit consumption inside the available Base + Overtime bands per bucket (bending time via build-ahead / build-late when a bucket is full). In an <strong>Unconstrained</strong> run the resource is effectively <strong>infinite</strong> — the wiki models this with the <em>Infinite Resource</em> / Capacity Fence (fence = 0 ⇒ unconstrained on current and future buckets) — so every demand is built <strong>Just-In-Time</strong> on its primary path, and <em>infinite capacity is pegged to Regular capacity</em>.',
    tip: 'Lead with "capacity expires at bucket end, material carries over" — then: unconstrained = infinite resource = everything JIT, pegged to regular.' },
  { q: 'Walk through the order in which the solver opens capacity bands (REGULAR → BAND1 → BAND2), and what the "Use Bands To Minimize Lateness" flag controls.',
    a: 'Every model can carry three types of capacity: <strong>Regular Capacity</strong>, the <strong>1st Overtime Band</strong> and the <strong>2nd Overtime Band</strong> (modelled as <code>Capacity Availability</code>, <code>OverTime_1</code>, <code>OverTime_2</code> …). With <strong>Use Bands To Minimize Lateness = FALSE / NULL (default)</strong> the demand-planning run consumes in this order: <strong>1.</strong> Regular capacity in <em>all</em> buckets (JIT and Late planning), <strong>2.</strong> 1st Overtime Band in all buckets, <strong>3.</strong> 2nd Overtime Band in all buckets. The docs warn: <em>do not set this flag to True</em>; if you want to avoid delaying a demand, instead use an Objective Rank List with <strong>Late ahead of Band</strong>. Capacity is <strong>released in reverse order</strong> (2nd band → 1st band → Regular). If a demand is built JIT using overtime, no constraint report is raised; if it is still short after all overtime, a <strong>Capacity Short</strong> RCA is reported.',
    tip: 'The ordering is Regular-everywhere, then Band1-everywhere, then Band2-everywhere — not all three on one bucket. Release is the exact reverse.' },
  { q: 'What does the "Varying Capacity Buckets" parameter do, True vs False?',
    a: 'It controls how a resource\'s <code>Capacity Availability</code> is interpreted across time, letting capacity sit in <strong>coarser buckets</strong> (an integral multiple of the planning buckets — e.g. weekly plan, monthly capacity). <strong>FALSE (default):</strong> a specified value applies <em>only to that one bucket</em>; buckets left null are read as <strong>zero capacity</strong>, so planners must populate every bucket they want usable. <strong>TRUE:</strong> a value specified in a bucket is <strong>valid until the next specified bucket</strong> (or to the end of the horizon if none follows). Example: R_1 = 30 at W01, 40 at W05, 10 at W09 ⇒ with TRUE, 30 units are usable across W01–W04, 40 across W05–W08, etc.; with FALSE the resource is only available on the exact specified buckets and 0 everywhere else. A resource-node measure (<em>Varying Capacity At Node</em>) can override the global flag per resource.',
    tip: 'False = "only this bucket, null means zero". True = "valid till the next specified bucket" (coarse/telescopic capacity).' },
];

// ── capacity model ──────────────────────────────────────────────────────────
const N = 8;                 // W1..W8
const JIT = 4;               // index → W5 is the due / JIT bucket
const BAL = 2, BLL = 2;      // build-ahead / build-late limits (buckets)
const EARLIEST = JIT - BAL;  // 2 (W3)  earliest usable bucket
const LATEST = JIT + BLL;    // 6 (W7)  latest usable bucket
const BASE = 60, BAND1 = 30, BAND2 = 30;           // per-bucket capacity
const PERBUCKET = BASE + BAND1 + BAND2;            // 120
const WINDOW_CAP = (LATEST - EARLIEST + 1) * PERBUCKET; // 600
// consumption order: JIT first, then build-ahead (nearest first), then build-late
const FILL = [JIT, JIT - 1, JIT - 2, JIT + 1, JIT + 2]; // [4,3,2,5,6]

const SCEN = {
  jit:   { demand: 60,  name: 'Small demand → fits Base on the JIT bucket' },
  bands: { demand: 120, name: 'Demand > Base → open Overtime bands on JIT' },
  ahead: { demand: 300, name: 'JIT full → build ahead into earlier buckets' },
  late:  { demand: 480, name: 'Build-ahead exhausted → build late' },
  short: { demand: 700, name: 'Window capacity exhausted → Capacity Short' },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Capacity',
    subtitle: 'A resource restricts the throughput of the network, and unlike material it expires at the end of its bucket. Watch a demand consume a resource — Base capacity first, then the Overtime bands, then spilling into build-ahead and build-late buckets — and flip between a Constrained and an Unconstrained run.',
    tabs: [
      { id: 'load',  label: '📊 Capacity Load' },
      { id: 'graph', label: '📈 Consumption Graph', content: graphTab() },
      { id: 'bands', label: '🎚️ Capacity Bands', content: bandsTab() },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildLoad(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the capacity-load animation ──────────────────────────────────────
function buildLoad(container) {
  const tab = container.querySelector('#tab-load');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One resource across <b>8 weekly buckets</b>. Each bar is stacked capacity: <b style="color:#38BDF8">Base (Regular)</b>, then <b style="color:#A78BFA">Band1</b> and <b style="color:#F59E0B">Band2</b> flex on top. The demand is due on <b>W5 (JIT)</b>; it may build as early as <b>W3</b> (BAL ${BAL}) and as late as <b>W7</b> (BLL ${BLL}). Pick a scenario, choose <b>Constrained</b> or <b>Unconstrained</b>, and press <b>Run</b>.</div>
      <canvas id="cap-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cap-run">▶ Run (load demand)</button>
        <button class="ctrl-btn" id="cap-mode">🔒 Constrained</button>
        <button class="ctrl-btn" id="cap-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Scenario:</span>
        <button class="ctrl-btn" data-scen="jit">JIT · Base only</button>
        <button class="ctrl-btn" data-scen="bands">Open bands</button>
        <button class="ctrl-btn" data-scen="ahead">Build-ahead</button>
        <button class="ctrl-btn" data-scen="late">Build-late</button>
        <button class="ctrl-btn" data-scen="short">Short</button>
      </div>
      <div id="cap-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>In a <strong>Constrained</strong> run the solver loads the demand onto the resource one unit at a time. On a bucket it fills <strong>Base (Regular) capacity</strong> first, then opens <strong>Band1</strong> and <strong>Band2</strong> overtime. When a bucket is full it moves to the next bucket in the window — earlier buckets (<strong>build-ahead</strong>, carried as inventory) before later ones (<strong>build-late</strong>). Capacity that is never consumed is simply lost, because <strong>capacity expires at the end of its bucket</strong> — it cannot be carried like material. If the whole BAL–BLL window is exhausted, the remainder is <strong>Capacity Short</strong> with an RCA reason.</p>
      <p>Flip to <strong>Unconstrained</strong> and the resource is treated as <strong>infinite</strong>: the entire demand is built <strong>Just-In-Time</strong> on the JIT bucket, and (per the Infinite Resource model) that consumption is pegged to <strong>Regular</strong> capacity. No bands, no build-ahead, no shortage.</p>
    </div>`;

  const canvas = tab.querySelector('#cap-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const PAD_L = 55, PAD_R = 25, BASELINE = 242, SCALE = 1.25;
  const slotW = (canvas.width - PAD_L - PAD_R) / N;
  const barW = Math.min(54, slotW * 0.62);
  const bucketX = (i) => PAD_L + i * slotW + (slotW - barW) / 2;
  const usable = (i) => i >= EARLIEST && i <= LATEST;

  let scen = 'ahead';
  let unconstrained = false;
  let loading = false;
  let loaded = 0;     // units processed so far
  const RATE = 6;     // units per frame

  function demand() { return SCEN[scen].demand; }

  // allocate `units` across the window, Base→Band1→Band2 per bucket, in FILL order
  function plan(units) {
    const cons = {};
    for (let i = 0; i < N; i++) cons[i] = { base: 0, band1: 0, band2: 0 };
    if (unconstrained) { cons[JIT].base = units; cons[JIT].inf = true; return { cons, short: 0 }; }
    let rem = units;
    for (const b of FILL) {
      if (rem <= 0) break;
      const t0 = Math.min(rem, BASE); cons[b].base = t0; rem -= t0;
      const t1 = Math.min(rem, BAND1); cons[b].band1 = t1; rem -= t1;
      const t2 = Math.min(rem, BAND2); cons[b].band2 = t2; rem -= t2;
    }
    return { cons, short: Math.max(0, rem) };
  }

  function setLedger(cards) {
    tab.querySelector('#cap-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function reset() {
    loading = false; loaded = 0;
    setLedger([{ color: '#64748B', title: SCEN[scen].name, body: `Demand = <b>${demand()}</b> units due on W5. Mode: <b>${unconstrained ? 'Unconstrained (infinite)' : 'Constrained'}</b>. Press <b>Run</b>.` }]);
  }

  function run() { loading = true; loaded = 0; }

  function finish() {
    loading = false;
    const { cons, short } = plan(demand());
    let usedBand = false, builtAhead = false, builtLate = false, usedBase = false;
    for (let i = 0; i < N; i++) {
      const c = cons[i];
      if (c.base || c.band1 || c.band2) { usedBase = usedBase || c.base > 0; if (i < JIT) builtAhead = true; if (i > JIT) builtLate = true; }
      if (c.band1 || c.band2) usedBand = true;
    }
    const cards = [{ color: '#64748B', title: SCEN[scen].name, body: `Demand <b>${demand()}</b> · window W3–W7 holds <b>${WINDOW_CAP}</b> units of capacity (${PERBUCKET}/bucket).` }];
    if (unconstrained) {
      cards.push({ color: '#10B981', title: '✓ Unconstrained → all JIT', body: `Resource is infinite, so all <b>${demand()}</b> units are built Just-In-Time on W5 and pegged to <b>Regular</b> capacity. No bands, no build-ahead, no shortage.` });
    } else {
      if (!usedBand && !builtAhead && !builtLate) cards.push({ color: '#38BDF8', title: '✓ On time · Base only', body: 'Demand fits inside Regular (Base) capacity on the JIT bucket — no overtime, no time-shifting.' });
      else if (usedBand && !builtAhead && !builtLate) cards.push({ color: '#A78BFA', title: '✓ On time · Overtime bands opened', body: 'Base was not enough, so the solver opened Band1 then Band2 flex capacity on the JIT bucket. Still delivered on time.' });
      if (builtAhead) cards.push({ color: '#38BDF8', title: '◀ Build-ahead used', body: 'The JIT bucket filled up, so the solver consumed capacity in earlier buckets (within BAL) and carries the output as inventory.' });
      if (builtLate) cards.push({ color: '#F59E0B', title: '▶ Build-late used', body: 'Build-ahead capacity was exhausted too, so part of the demand is built in later buckets (within BLL) → delivered late.' });
      if (short > 0) cards.push({ color: '#EF4444', title: '✗ Capacity Short', body: `Base + all Overtime bands across the whole W3–W7 window are consumed; <b>${short}</b> units cannot be built → a <b>Capacity Short</b> RCA is reported.` });
    }
    setLedger(cards);
  }

  function seg(x, yTop, h, fill, stroke) { if (h > 0.5) drawRoundRect(ctx, x, yTop - h, barW, h, 3, fill, stroke); }

  let raf = null;
  function draw() {
    if (loading) {
      loaded += RATE;
      if (loaded >= demand()) { loaded = demand(); finish(); }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // window shading: build-ahead (blue) / JIT (green) / build-late (amber)
    ctx.fillStyle = '#38BDF810'; ctx.fillRect(bucketX(EARLIEST) - 8, 62, slotW * BAL, BASELINE - 62);
    ctx.fillStyle = '#F59E0B10'; ctx.fillRect(bucketX(JIT + 1) - 8, 62, slotW * BLL, BASELINE - 62);
    ctx.fillStyle = '#10B98112'; ctx.fillRect(bucketX(JIT) - 8, 62, slotW, BASELINE - 62);

    const { cons } = plan(Math.min(loaded, demand()));

    for (let i = 0; i < N; i++) {
      const x = bucketX(i);
      const inWin = usable(i);
      const c = cons[i];

      if (unconstrained && i === JIT) {
        // infinite JIT bar, capped height, pegged to regular (green)
        const h = Math.min(c.base * SCALE, BASELINE - 72);
        seg(x, BASELINE, h, '#10B981', '#10B98199');
        ctx.fillStyle = '#10B981'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('∞', x + barW / 2, BASELINE - h - 8);
      } else {
        // available-capacity outlines (dim; dimmer still outside window)
        const aFill = inWin ? '#0d1424' : '#0b0f1a';
        const aStroke = inWin ? '#1E293B' : '#141b2b';
        seg(x, BASELINE, BASE * SCALE, aFill, aStroke);
        seg(x, BASELINE - BASE * SCALE, BAND1 * SCALE, aFill, aStroke);
        seg(x, BASELINE - (BASE + BAND1) * SCALE, BAND2 * SCALE, aFill, aStroke);
        // consumed segments
        const dim = inWin ? '' : '55';
        seg(x, BASELINE, c.base * SCALE, '#38BDF8' + dim, '#38BDF8aa');
        seg(x, BASELINE - BASE * SCALE, c.band1 * SCALE, '#A78BFA' + dim, '#A78BFAaa');
        seg(x, BASELINE - (BASE + BAND1) * SCALE, c.band2 * SCALE, '#F59E0B' + dim, '#F59E0Baa');
      }

      // bucket label
      ctx.textAlign = 'center'; ctx.font = '10px system-ui';
      ctx.fillStyle = i === JIT ? '#10B981' : (inWin ? '#94a3b8' : '#475569');
      ctx.fillText('W' + (i + 1), x + barW / 2, BASELINE + 16);
      if (!inWin) { ctx.fillStyle = '#475569'; ctx.font = '8px system-ui'; ctx.fillText('out of window', x + barW / 2, BASELINE + 28); }
    }

    // markers above the bars
    const markX = (i) => bucketX(i) + barW / 2;
    const mark = (i, color, label) => {
      ctx.fillStyle = color; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, markX(i), 54);
    };
    mark(EARLIEST, '#38BDF8', '◀ BAL (W3)');
    mark(JIT, '#10B981', 'DUE · JIT');
    mark(LATEST, '#F59E0B', 'BLL (W7) ▶');

    // remaining / loaded readout
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    const rem = Math.max(0, demand() - Math.round(loaded));
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`demand ${demand()}  ·  loaded ${Math.round(loaded)}  ·  remaining ${rem}`, PAD_L, BASELINE + 44);

    // legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#38BDF8'; ctx.fillText('■ Base (Regular)', PAD_L, 24);
    ctx.fillStyle = '#A78BFA'; ctx.fillText('■ Band1 (flex)', PAD_L + 130, 24);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('■ Band2 (flex)', PAD_L + 250, 24);
    ctx.fillStyle = '#10B981'; ctx.fillText('■ infinite / JIT', PAD_L + 370, 24);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scen = b.dataset.scen; reset(); }));
  tab.querySelector('#cap-run').addEventListener('click', run);
  tab.querySelector('#cap-reset').addEventListener('click', reset);
  tab.querySelector('#cap-mode').addEventListener('click', () => {
    unconstrained = !unconstrained;
    tab.querySelector('#cap-mode').textContent = unconstrained ? '♾️ Unconstrained' : '🔒 Constrained';
    reset();
  });
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: Capacity Consumption Graph + qty-per + constrained/unconstrained ──
function graphTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The Capacity Consumption Graph</div><div class="section-desc">The input graph that attaches a resource's constraint to an activity. Its output is written to the Pegging and Additive RCA tables (Manufacturing tab of the SCS Config UI).</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">What the edge asserts</div><div class="info-card-body">Whether an <strong>activity node</strong> is <em>constrained by capacity</em> from the <strong>resource</strong> it is attached to. A Boolean <strong>Association</strong> (1 = edge active, 0 = inactive) switches the constraint on or off.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Capacity (Consumption) Qty Per</div><div class="info-card-body">How many units of the resource's capacity are consumed <strong>per unit produced</strong>. The relationship the solver nets against is:<br><code>Capacity Consumption = (Production Qty × Capacity Qty Per) + Fixed Setup Loss</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Capacity expires per bucket</div><div class="info-card-body">The core property of a resource: material can be carried over between buckets, but <strong>capacity expires at the end of its bucket</strong>. This is why the solver must build ahead or late rather than "save" idle capacity.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Constrained vs Unconstrained planning</div><div class="section-desc">Whether the solver must respect the resource's available capacity, or treats it as infinite.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>Constrained (Capacity Constraint run)</th><th>Unconstrained (infinite resource)</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Available capacity</td><td>Limited — Base + Overtime bands per bucket.</td><td>Infinite (modelled via the Infinite Resource / Capacity Fence; fence = 0 ⇒ unconstrained now & future).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Timing</td><td>JIT where it fits; else build-ahead, then build-late, then short.</td><td>Everything Just-In-Time on the primary path (only lead time applies).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Bands</td><td>Opens Band1, Band2 … when Base is exhausted.</td><td>Not needed — infinite capacity is <strong>pegged to Regular</strong>.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Shortage</td><td>Possible → <strong>Capacity Short</strong> RCA.</td><td>None from capacity.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="prose"><p>In the wiki's worked examples, "<em>Material and Capacity Unconstrained</em>" runs place the full demand on its JIT bucket (e.g. a W10 demand consumed on W06 by lead time alone). A Constrained run instead has to <em>fit</em> the demand into the available capacity each bucket — the behaviour animated on the <strong>Capacity Load</strong> tab.</p></div>
    </div>`;
}

// ── Tab 3: Capacity Bands (REGULAR / BAND1 / BAND2, base + flex) ─────────────
function bandsTab() {
  const rows = [
    ['Regular (Base)', '<code>Capacity Availability</code>', 'The everyday Base capacity. Consumed first, in every bucket.'],
    ['1st Overtime Band', '<code>OverTime_1</code>', 'First flex band. Opened after Regular is exhausted across the buckets.'],
    ['2nd Overtime Band', '<code>OverTime_2</code>', 'Second flex band. Opened after the 1st band.'],
    ['Bands 3–5', '<code>OverTime_3 … OverTime_5</code>', 'Further flex bands for models that need more overtime steps.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Regular capacity &amp; Flex (Overtime) bands</div><div class="section-desc">SCS lets planners model both Regular Capacity and Flex Capacity, so a resource can be overloaded in a controlled, stepwise way. "Every model can have three types of capacity: Regular, 1st Overtime Band, 2nd Overtime Band."</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Band</th><th>Input measure</th><th>What it is</th></tr></thead>
          <tbody>${rows.map(([b, m, d]) => `<tr><td style="font-weight:600;color:var(--text)">${b}</td><td>${m}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Opening order</div><div class="info-card-body">With <strong>Use Bands To Minimize Lateness = FALSE (default)</strong>: <strong>1)</strong> Regular in all buckets (JIT &amp; late), <strong>2)</strong> 1st Overtime Band in all buckets, <strong>3)</strong> 2nd Overtime Band in all buckets.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Release order (reverse)</div><div class="info-card-body">If capacity is re-allocated it is released in reverse: <strong>2nd band → 1st band → Regular</strong>. Target utilization &amp; min-utilization are measured on <strong>Base</strong> capacity, not the overtime bands.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Reporting</div><div class="info-card-body">If a demand is built JIT using overtime, <strong>no constraint report</strong> is raised. If it is still short after <em>all</em> overtime is used, a <strong>Capacity Short</strong> RCA is reported. The constraint quantity shown is the Regular capacity needed at the JIT bucket.</div></div>
      </div>

      <div class="canvas-explainer"><h3>Bands for lateness vs build-ahead</h3>
        <p><strong>Use Bands To Minimize Lateness</strong> — the docs advise <em>not</em> to set it True; to avoid delaying a demand, put <strong>Late ahead of Band</strong> in the Objective Rank List (e.g. <code>[Late, Band, …]</code>) instead. <strong>Use Bands To Minimize Build Ahead</strong> — <em>False (default):</em> the solver takes Regular capacity from JIT, JIT-1, JIT-2 … up to the build-ahead limit, then opens Band1 across those buckets, then Band2, building the demand much earlier. <em>True:</em> it takes <strong>all</strong> capacities (Regular + Overtime) from JIT, then JIT-1, and so on — which reduces earliness. When this flag is enabled you must also enable <strong>Minimize Inventory Build Ahead</strong>.</p>
        <p>A worked example: Final Assembly at W02 has Base 100, Band1 20, Band2 20, Band3 20 (plus higher bands). With ORL = [Band, Late] the solver first consumes 100 Base on the JIT bucket, delays and consumes 50 Base on a later bucket, then opens the bands one by one — 20 Band1, 20 Band2, 10 Band3.</p>
      </div>
    </div>`;
}
