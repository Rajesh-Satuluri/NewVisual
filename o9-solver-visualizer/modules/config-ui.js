import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What actually defines a "solver instance" in the SCS — isn\'t there just one solver?',
    a: 'There is one <strong>engine</strong>, but many <strong>solver instances</strong>. An instance is a <strong>named configuration</strong> that binds three things together: the <strong>Inputs</strong> it reads (which Demand, On-Hand, Capacity and BOM/Routing tables feed it), the <strong>Parameters</strong> that control how it runs (horizon, number of passes, the Objective / Rank List, lot-sizing behaviour, and model flags), and the <strong>Outputs</strong> it writes (Supply Plan, Pegging, Exceptions, RCA). Two instances can run the <em>same</em> engine over the <em>same</em> network and produce completely different plans purely because their configuration differs — one short-horizon daily replenishment run, one long-horizon strategic run. Configuring a solver is choosing that wiring, not changing the algorithm.',
    tip: 'One line: "one engine, many instances — an instance = a named binding of inputs + parameters + outputs."' },
  { q: 'How can flipping a single parameter or flag change a whole run?',
    a: 'Because flags <strong>re-route the data flow</strong>, they do not just tweak a number. Turning on a model flag like <strong>shelf-life</strong> or <strong>lot-based</strong> pulls an extra input (expiry / lot attributes) into the solve and changes how pegging is computed; turning on the <strong>RCA output</strong> flag makes the engine emit an entire additional output table that is otherwise never produced. Parameters like <strong>horizon</strong> and <strong>passes</strong> change the size and the number of optimisation sweeps, which changes both runtime and the final plan. So the mental model is a wiring panel: a flag lights up (or dims) a wire and sometimes a whole box, rather than nudging a dial inside a fixed pipeline.',
    tip: 'Flags re-wire the flow — they can add an input, add an output table, or add a whole pass.' },
  { q: 'If you were handed a solver config you\'d never seen, how would you read it?',
    a: 'Read it in three columns. First the <strong>Inputs</strong>: which demand, on-hand, capacity and BOM/routing tables are bound — that tells you <em>what reality</em> the run sees. Then the <strong>Parameters</strong>: horizon (how far it plans), passes (how hard it optimises), the Objective / Rank List (what it prioritises when supply is scarce), lot-sizing behaviour, and which model flags are on (shelf-life, no-carry, lot-based). Finally the <strong>Outputs</strong>: which tables it writes — at minimum Supply Plan and Pegging, optionally Exceptions and RCA. Inputs tell you what it knows, parameters tell you how it decides, outputs tell you what you can inspect afterwards. Misreads almost always come from an unexpected flag silently adding an input or an output.',
    tip: 'Three columns: inputs = what it sees, parameters = how it decides, outputs = what you get back.' },
];

// ── Config model (grounded teaching data) ─────────────────────────────────────
const INPUTS = [
  { id: 'demand',   label: 'Demand',        core: true },
  { id: 'onhand',   label: 'On-Hand',       core: true },
  { id: 'capacity', label: 'Capacity',      core: true },
  { id: 'bom',      label: 'BOM / Routing', core: true },
  { id: 'shelf',    label: 'Expiry / Lots', core: false, flag: 'shelf' }, // only when shelf-life flag on
];
const OUTPUTS = [
  { id: 'plan',    label: 'Supply Plan', core: true },
  { id: 'peg',     label: 'Pegging',     core: true },
  { id: 'exc',     label: 'Exceptions',  core: true },
  { id: 'rca',     label: 'RCA',         core: false, flag: 'rca' },       // only when RCA flag on
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Optimization & Ops',
    title: 'Solver Config UI',
    subtitle: 'One engine, many solver instances. A solver instance is a named configuration that wires chosen Inputs into the engine, sets the Parameters and flags that control the run, and emits chosen Outputs. Flip a flag and watch the data flow re-route.',
    tabs: [
      { id: 'wiring',   label: '🛠️ Config Wiring' },
      { id: 'anatomy',  label: '🧩 Config Anatomy', content: anatomyTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live wiring panel (inputs → solver → outputs) ──────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-wiring');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The <b>same engine</b> sits in the middle. The <b style="color:#38BDF8">Inputs</b> on the left feed it, the <b style="color:#A78BFA">Parameters</b> inside it control the run, and the <b style="color:#10B981">Outputs</b> on the right are what it writes. Toggle a <b>flag</b> and watch a wire — and sometimes a whole box — light up or go dark. Packets only flow on live wires.</div>
      <canvas id="cfg-canvas" width="860" height="380" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cfg-rca">🔀 RCA output: OFF</button>
        <button class="ctrl-btn" id="cfg-shelf">🎚 Shelf-life flag: OFF</button>
        <button class="ctrl-btn" id="cfg-horizon">⏱ Horizon: short</button>
        <button class="ctrl-btn" id="cfg-reset">↺ Reset</button>
        <span class="ctrl-label" id="cfg-status">RCA OFF · shelf-life OFF · horizon short</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Configuring a solver is not editing the algorithm — it is <strong>wiring</strong>. The engine is fixed; what changes per instance is which <strong>inputs</strong> are bound, which <strong>parameters and flags</strong> are set, and which <strong>outputs</strong> are emitted. That is why two instances over the identical network can produce very different plans.</p>
      <p>Flip <strong>RCA output</strong> on and an entire extra output table — and its wire and packet stream — appears; the engine now does the root-cause bookkeeping it otherwise skips. Flip the <strong>shelf-life flag</strong> on and a new <em>input</em> (expiry / lot attributes) is pulled into the solve, lighting an extra input wire. The <strong>horizon</strong> toggle changes how far ahead it plans — a longer horizon thickens the flow to signal more buckets and more work. Flags <strong>re-route the flow</strong>; they do not just nudge a dial.</p>
    </div>`;

  const canvas = tab.querySelector('#cfg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#cfg-status');

  const cfg = { rca: false, shelf: false, horizon: 'short' };

  const rcaBtn = tab.querySelector('#cfg-rca');
  const shelfBtn = tab.querySelector('#cfg-shelf');
  const horizonBtn = tab.querySelector('#cfg-horizon');

  function syncUI() {
    rcaBtn.textContent = `🔀 RCA output: ${cfg.rca ? 'ON' : 'OFF'}`;
    shelfBtn.textContent = `🎚 Shelf-life flag: ${cfg.shelf ? 'ON' : 'OFF'}`;
    horizonBtn.textContent = `⏱ Horizon: ${cfg.horizon}`;
    statusEl.textContent = `RCA ${cfg.rca ? 'ON' : 'OFF'} · shelf-life ${cfg.shelf ? 'ON' : 'OFF'} · horizon ${cfg.horizon}`;
  }
  syncUI();

  // layout
  const inX = 46, inW = 150, inH = 44, inGap = 18, inTop = 60;
  const solX = 330, solW = 200, solY = 96, solH = 200;
  const outX = 664, outW = 150, outH = 44, outGap = 18, outTop = 72;

  function inputLive(inp) { return inp.core || (inp.flag === 'shelf' && cfg.shelf); }
  function outputLive(o) { return o.core || (o.flag === 'rca' && cfg.rca); }

  // packets travel 0→1 along a wire
  const packets = [];
  let tick = 0;
  const C_IN = '#38BDF8', C_OUT = '#10B981', C_SOL = '#A78BFA', C_DIM = '#1e2a3f';

  function inputCenter(i) {
    const n = INPUTS.length;
    const totalH = n * inH + (n - 1) * inGap;
    const top = (canvas.height - totalH) / 2;
    const y = top + i * (inH + inGap) + inH / 2;
    return { x: inX + inW, y };
  }
  function outputCenter(i) {
    const n = OUTPUTS.length;
    const totalH = n * outH + (n - 1) * outGap;
    const top = (canvas.height - totalH) / 2;
    const y = top + i * (outH + outGap) + outH / 2;
    return { x: outX, y, xr: outX + outW };
  }
  const solLeft = { x: solX, y: solY + solH / 2 };
  const solRight = { x: solX + solW, y: solY + solH / 2 };

  function spawn() {
    // inputs → solver
    INPUTS.forEach((inp, i) => {
      if (!inputLive(inp)) return;
      const a = inputCenter(i);
      packets.push({ x0: a.x, y0: a.y, x1: solLeft.x, y1: solLeft.y, t: 0, c: C_IN, sp: 0.014 });
    });
    // solver → outputs
    OUTPUTS.forEach((o, i) => {
      if (!outputLive(o)) return;
      const b = outputCenter(i);
      packets.push({ x0: solRight.x, y0: solRight.y, x1: b.x, y1: b.y, t: 0, c: C_OUT, sp: 0.014 });
    });
  }

  let raf = null;
  function draw() {
    tick++;
    const flowRate = cfg.horizon === 'long' ? 14 : 26; // long horizon = denser flow
    if (tick % flowRate === 0) spawn();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // column labels
    ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = C_IN; ctx.fillText('INPUTS', inX + inW / 2, 30);
    ctx.fillStyle = C_SOL; ctx.fillText('SOLVER INSTANCE', solX + solW / 2, 30);
    ctx.fillStyle = C_OUT; ctx.fillText('OUTPUTS', outX + outW / 2, 30);

    // wires first (under boxes)
    INPUTS.forEach((inp, i) => {
      const a = inputCenter(i); const live = inputLive(inp);
      drawArrow(ctx, a.x, a.y, solLeft.x, solLeft.y, live ? C_IN + 'AA' : C_DIM, live ? 1.6 : 1);
    });
    OUTPUTS.forEach((o, i) => {
      const b = outputCenter(i); const live = outputLive(o);
      drawArrow(ctx, solRight.x, solRight.y, b.x, b.y, live ? C_OUT + 'AA' : C_DIM, live ? 1.6 : 1);
    });

    // input boxes
    INPUTS.forEach((inp, i) => {
      const a = inputCenter(i); const live = inputLive(inp);
      const y = a.y - inH / 2;
      drawRoundRect(ctx, inX, y, inW, inH, 9, '#111827', live ? C_IN : C_DIM + '88');
      ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = live ? '#E2E8F0' : '#475569';
      ctx.fillText(inp.label, inX + inW / 2, a.y - 1);
      ctx.font = '9px system-ui'; ctx.fillStyle = live ? '#64748B' : '#334155';
      ctx.fillText(inp.core ? 'always bound' : (live ? 'bound by flag' : 'flag off'), inX + inW / 2, a.y + 13);
    });

    // solver box
    drawRoundRect(ctx, solX, solY, solW, solH, 14, '#15192e', C_SOL);
    ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#C4B5FD';
    ctx.fillText('⚙ ENGINE', solX + solW / 2, solY + 26);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#94A3B8';
    const params = [
      `Horizon: ${cfg.horizon === 'long' ? 'long (more buckets)' : 'short'}`,
      `Passes: ${cfg.horizon === 'long' ? 4 : 2}`,
      'Objective / Rank List',
      'Lot-sizing: Min·Mult·Max',
      `Flag · shelf-life: ${cfg.shelf ? 'ON' : 'off'}`,
      `Flag · RCA output: ${cfg.rca ? 'ON' : 'off'}`,
    ];
    params.forEach((p, i) => {
      const on = (p.includes('shelf-life') && cfg.shelf) || (p.includes('RCA') && cfg.rca);
      ctx.fillStyle = on ? '#C4B5FD' : '#94A3B8';
      ctx.font = on ? 'bold 10px system-ui' : '10px system-ui';
      ctx.fillText(p, solX + solW / 2, solY + 52 + i * 22);
    });

    // output boxes
    OUTPUTS.forEach((o, i) => {
      const b = outputCenter(i); const live = outputLive(o);
      const y = b.y - outH / 2;
      drawRoundRect(ctx, outX, y, outW, outH, 9, '#111827', live ? C_OUT : C_DIM + '88');
      ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = live ? '#E2E8F0' : '#475569';
      ctx.fillText(o.label, outX + outW / 2, b.y - 1);
      ctx.font = '9px system-ui'; ctx.fillStyle = live ? '#64748B' : '#334155';
      ctx.fillText(o.core ? 'always written' : (live ? 'written by flag' : 'flag off'), outX + outW / 2, b.y + 13);
    });

    // packets
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.t += p.sp;
      if (p.t >= 1) { packets.splice(i, 1); continue; }
      const x = p.x0 + (p.x1 - p.x0) * p.t;
      const y = p.y0 + (p.y1 - p.y0) * p.t;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.c + '33'; ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  rcaBtn.addEventListener('click', () => { cfg.rca = !cfg.rca; syncUI(); });
  shelfBtn.addEventListener('click', () => { cfg.shelf = !cfg.shelf; syncUI(); });
  horizonBtn.addEventListener('click', () => { cfg.horizon = cfg.horizon === 'short' ? 'long' : 'short'; syncUI(); });
  tab.querySelector('#cfg-reset').addEventListener('click', () => { cfg.rca = false; cfg.shelf = false; cfg.horizon = 'short'; packets.length = 0; syncUI(); });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: config anatomy ─────────────────────────────────────────────────────
function anatomyTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three parts of a solver instance</div><div class="section-desc">A solver instance is a named configuration. It binds <em>inputs</em>, sets <em>parameters</em>, and emits <em>outputs</em>. The engine never changes — the wiring does.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Inputs — what it sees</div><div class="info-card-body">The data tables bound to the run: <strong>Demand</strong>, <strong>On-Hand</strong>, <strong>Capacity</strong>, <strong>BOM / Routing</strong>, and a parameters/rules table. A model flag can pull in extra inputs (e.g. expiry &amp; lot attributes when shelf-life is on).</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Parameters — how it decides</div><div class="info-card-body"><strong>Horizon</strong>, number of <strong>passes</strong>, the <strong>Objective / Rank List</strong>, <strong>lot-sizing</strong> behaviour, and model <strong>flags</strong> (shelf-life, no-carry, lot-based, RCA). These control size, priority and which behaviours switch on.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Outputs — what you get back</div><div class="info-card-body">The tables it writes: <strong>Supply Plan</strong>, <strong>Pegging</strong>, <strong>Exceptions / Alerts</strong>, and optionally <strong>RCA</strong>. A flag can add a whole output table that is otherwise never produced.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Every element of a config</div><div class="section-desc">Read a solver config as three columns: inputs, parameters, outputs.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Config element</th><th>Category</th><th>What it controls</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Demand</td><td style="color:#38BDF8">Input</td><td>The orders / forecast the run must satisfy.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">On-Hand</td><td style="color:#38BDF8">Input</td><td>Starting inventory the solver may consume.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Capacity</td><td style="color:#38BDF8">Input</td><td>Resource limits that gate how much can be built.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">BOM / Routing</td><td style="color:#38BDF8">Input</td><td>How items are made — components and operations.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Expiry / Lots</td><td style="color:#38BDF8">Input (by flag)</td><td>Pulled in only when the shelf-life / lot-based flag is set.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Horizon</td><td style="color:#A78BFA">Parameter</td><td>How far ahead it plans — more buckets, more work.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Passes</td><td style="color:#A78BFA">Parameter</td><td>How many optimisation sweeps the engine runs.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Objective / Rank List</td><td style="color:#A78BFA">Parameter</td><td>What it prioritises when supply is scarce.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Lot-sizing</td><td style="color:#A78BFA">Parameter</td><td>Min / Multiple / Max rules on produced quantities.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Model flags</td><td style="color:#A78BFA">Parameter</td><td>shelf-life, no-carry, lot-based, RCA — each re-routes flow.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Supply Plan</td><td style="color:#10B981">Output</td><td>The planned supplies / orders the run produces.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Pegging</td><td style="color:#10B981">Output</td><td>The demand-to-supply links the plan created.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Exceptions</td><td style="color:#10B981">Output</td><td>Shorts, lateness and violations worth a planner's eye.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">RCA</td><td style="color:#10B981">Output (by flag)</td><td>Root-cause records, emitted only when the RCA flag is on.</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── Tab 3: concepts ───────────────────────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">One engine, many configurations</div><div class="section-desc">The algorithm is shared infrastructure. What a planner actually tunes is the configuration around it.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Instances, not forks</div><div class="info-card-body">You do not fork the solver to get different behaviour — you create another <strong>instance</strong> with different wiring. A nightly short-horizon replenishment run and a weekly long-horizon strategic run can be the <em>same</em> engine, differently configured.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Flags re-route flow</div><div class="info-card-body">A flag is not a cosmetic switch. It can pull a <strong>new input</strong> into the solve (shelf-life → expiry data) or emit a <strong>new output</strong> (RCA → root-cause table), changing both what the engine reads and what it writes.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Read it in three columns</div><div class="info-card-body">Inputs = what the run sees, parameters = how it decides, outputs = what you can inspect. Most "why did it do that?" surprises trace to an unexpected flag silently adding an input or an output.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Why the UI matters</h3>
        <p>The config UI is where a plan is really shaped. The same network and the same demand can yield a feasible-but-expensive plan or a lean one depending on horizon, passes and objective; it can be traceable or opaque depending on whether pegging and RCA outputs are on; it can respect shelf life or ignore it depending on a single flag. Because the engine is fixed, <strong>reading and setting the configuration correctly is the planner's real lever</strong> — the visual here is a reminder that every toggle is a wire, and a wire changes the plan.</p>
      </div>
    </div>`;
}
