import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  {
    q: 'What is the o9 Supply Chain Solver, architecturally?',
    a: 'It is a heuristic planning engine packaged as a <strong>global plugin inside the o9 GraphCube server</strong> (<code>o9.GraphCube.Plugins.SupplyChainSolver</code>). A global plugin is server-side code that does specialised computation that is hard or impossible in the rules framework. It reads the planning model (demand, supply, network, constraints) from the GraphCube, computes a time-phased plan, and writes the results back as measures. It is not a separate product or an external optimiser — it runs in-process against the in-memory cube.',
    tip: 'Say "it’s a GraphCube server plugin, not an LP solver" — it signals you know where it runs and what it is.'
  },
  {
    q: 'What are the two ways the solver can be invoked, and which is typical?',
    a: 'A plugin can run <strong>(1) as part of active rules</strong> via the <code>declare plugin</code> command, or <strong>(2) as a standalone execution</strong> via the <code>exec the plugin</code> command. SCS is <em>most often run standalone</em>: in that mode it reads its inputs from the GraphCube, does the computation, and writes the output back — and exactly which measures it reads and where it writes are defined by the <strong>SCS configuration</strong> (so different instances can have different I/O).',
    tip: 'Mention that the config — not hard-coded wiring — defines the solver’s input/output measures; that’s why one tenant can run many SCS instances.'
  },
  {
    q: 'Why is SCS a heuristic rather than a cost-minimising optimiser?',
    a: 'Because it plans order-by-order against a ranked list of objectives (the Objective Rank List) instead of solving one global cost function. This is fast and predictable at the scale of a real network (millions of order/lane/day combinations), and it is explainable: every decision traces to a priority and a constraint. The trade-off is that it finds a good, rule-consistent plan — not a provably optimal one.',
    tip: 'Mention explainability and scale as the reasons a heuristic is chosen over an LP/MIP in practice.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations',
    title: 'What is the o9 Solver?',
    subtitle: 'A heuristic planning engine that lives inside the GraphCube server as a plugin — it reads demand, inventory, the network and constraints, and writes back a time-phased, constraint-aware supply plan.',
    tabs: [
      { id: 'run',      label: '⚙️ How It Runs' },
      { id: 'overview', label: '🧠 Overview', content: overviewTab() },
      { id: 'stack',    label: '🧱 Planning Stack', content: stackTab() },
      { id: 'notlp',    label: '⚖️ Not an LP', content: notlpTab() },
      { id: 'iq',       label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  const cleanup = buildRun(container);
  return cleanup;
}

// ── Tab 1: the plugin data-flow animation ─────────────────────────────────────
const INPUTS = [
  { label: 'Demand',    color: '#10B981', y: 70  },
  { label: 'Inventory', color: '#38BDF8', y: 110 },
  { label: 'Network',   color: '#A78BFA', y: 150 },
  { label: 'Config',    color: '#64748B', y: 190 },
];
const OUTPUTS = [
  { label: 'Flow Plan', color: '#10B981', y: 90  },
  { label: 'Pegging',   color: '#38BDF8', y: 140 },
  { label: 'RCA',       color: '#F59E0B', y: 190 },
];

function buildRun(container) {
  const tab = container.querySelector('#tab-run');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The solver is a <b>plugin inside the GraphCube server</b>. On a standalone <code>exec the plugin</code> run it <b>reads</b> its inputs from the cube (which measures, set by the SCS config), <b>computes</b> the plan in-process, and <b>writes</b> the outputs back as measures. Press <b>Run the Solver</b>.</div>
      <canvas id="wis-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="wis-run">▶ Run the Solver</button>
        <button class="ctrl-btn" id="wis-reset">↺ Reset</button>
        <span class="ctrl-label" id="wis-status">Idle — press Run the Solver.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The SCS is a <strong>global plugin</strong> — server-side code in the GraphCube that performs specialised computation the rules framework can't do efficiently. It does not own a database or run in the browser; it operates on the <strong>in-memory cube</strong>. Inputs flow in (demand, on-hand & receipts, the network graph, and the configuration that names every read/write measure); the heuristic runs; and the plan flows back out as measures — the <strong>flow/inventory plan</strong>, the <strong>pegging</strong> trace, and the <strong>RCA</strong> for anything short or late.</p>
      <p>Because the config defines the I/O, a single tenant can run <strong>many SCS instances</strong> with different inputs and outputs — one for a weekly constrained plan, another for a what-if, and so on.</p>
      <p><strong>Interview angle:</strong> "where does the solver run?" → <em>in-process in the GraphCube server, on the in-memory cube, usually launched standalone with</em> <code>exec the plugin</code>.</p>
    </div>`;

  const canvas = tab.querySelector('#wis-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // solver box geometry
  const box = { x: 320, y: 95, w: 160, h: 110, cx: 400, cy: 150 };
  let state = fresh();
  function fresh() { return { packets: [], phase: 'idle', pulse: 0, outFired: false }; }
  function setStatus(t) { const el = tab.querySelector('#wis-status'); if (el) el.textContent = t; }

  function run() {
    if (state.phase !== 'idle') return;
    state = fresh(); state.phase = 'reading';
    setStatus('Reading inputs from the GraphCube…');
    INPUTS.forEach((inp, i) => {
      setTimeout(() => {
        state.packets.push(new EventPacket({
          label: inp.label, color: inp.color, speed: 2.1,
          path: [{ x: 40, y: inp.y + 6 }, { x: box.x, y: box.cy }],
          onArrive: () => { state.pulse = 30; },
        }));
      }, i * 230);
    });
    setTimeout(() => { state.phase = 'solving'; setStatus('Solving — order-by-order heuristic over the cube…'); }, INPUTS.length * 230 + 400);
    setTimeout(() => emit(), INPUTS.length * 230 + 1200);
  }

  function emit() {
    state.phase = 'writing'; state.outFired = true;
    setStatus('Writing the plan back to the cube as measures…');
    OUTPUTS.forEach((o, i) => {
      setTimeout(() => {
        state.packets.push(new EventPacket({
          label: o.label, color: o.color, speed: 2.1,
          path: [{ x: box.x + box.w, y: box.cy }, { x: 760, y: o.y + 6 }],
        }));
      }, i * 240);
    });
    setTimeout(() => { state.phase = 'done'; setStatus('Done — plan, pegging and RCA written back as measures.'); }, OUTPUTS.length * 240 + 600);
  }

  function reset() { state = fresh(); setStatus('Idle — press Run the Solver.'); }

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    if (state.pulse > 0) state.pulse--;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // GraphCube server frame
    drawRoundRect(ctx, 290, 60, 220, 190, 12, '#0d1424', '#1E293B');
    ctx.font = '10px system-ui'; ctx.fillStyle = '#475569'; ctx.textAlign = 'center';
    ctx.fillText('GraphCube server (in-memory cube)', 400, 78);

    // input labels
    ctx.textAlign = 'left';
    INPUTS.forEach(inp => {
      drawRoundRect(ctx, 20, inp.y - 8, 90, 26, 7, '#111827', inp.color + '99');
      ctx.font = 'bold 11px system-ui'; ctx.fillStyle = inp.color; ctx.fillText(inp.label, 30, inp.y + 9);
    });
    // output labels
    OUTPUTS.forEach(o => {
      drawRoundRect(ctx, 690, o.y - 8, 90, 26, 7, '#111827', o.color + '99');
      ctx.font = 'bold 11px system-ui'; ctx.fillStyle = o.color; ctx.fillText(o.label, 700, o.y + 9);
    });

    // solver plugin box
    const active = state.phase === 'solving' || state.pulse > 0;
    const glow = active ? '#6366F1' : '#6366F1aa';
    drawRoundRect(ctx, box.x, box.y, box.w, box.h, 12, active ? '#6366F122' : '#111827', glow);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#818CF8'; ctx.fillText('SCS plugin', box.cx, box.cy - 6);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#8A98AE'; ctx.fillText('heuristic engine', box.cx, box.cy + 12);
    ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText('exec the plugin', box.cx, box.cy + 30);
    if (state.phase === 'solving') {
      ctx.font = '9px system-ui'; ctx.fillStyle = '#818CF8';
      ctx.fillText('● solving' + '.'.repeat(1 + (Math.floor(ts / 300) % 3)), box.cx, box.y + 16);
    }

    state.packets.forEach(p => p.update(dt));
    state.packets.forEach(p => p.draw(ctx));
    state.packets = state.packets.filter(p => !p.done);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#wis-run').addEventListener('click', run);
  tab.querySelector('#wis-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function overviewTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The one-paragraph version</div></div>
      <div class="prose">
        <p>The <strong>o9 Supply Chain Solver (SCS)</strong> is a <strong>heuristic</strong> engine, packaged as a global plugin inside the o9 <strong>GraphCube</strong> server. Given demand, on-hand inventory, in-flight supply, the network, and constraints, it produces a <strong>time-phased supply plan</strong>: what to make, move, or buy, where, and when — plus a full <strong>pegging</strong> trace and a <strong>root cause</strong> for anything it can’t fulfil.</p>
        <p>It does this by planning <strong>one demand at a time</strong>, in priority order, working <em>backward</em> from the customer toward the supplier — the order-by-order heuristic.</p>
      </div>
      <div class="info-grid">
        <div class="info-card"><div class="info-card-title">⚙️ What it is</div><div class="info-card-body">A GraphCube server plugin (<code>o9.GraphCube.Plugins.SupplyChainSolver</code>) running in-process on the planning cube.</div></div>
        <div class="info-card"><div class="info-card-title">📥 What it reads</div><div class="info-card-body">Demand with priority, on-hand buckets, POs/STOs/ASNs, network lanes, lead times, lot sizes, capacity, calendars.</div></div>
        <div class="info-card"><div class="info-card-title">📤 What it writes</div><div class="info-card-body">Flow / inventory / delivery plans, pegging (from→to), and RCA with suggested available dates.</div></div>
      </div>
    </div>`;
}

function stackTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Rule Engine → Solver → Rule Engine</div><div class="section-desc">The solver never works alone — rules prepare its inputs and process its outputs.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid var(--blue)"><div class="info-card-title">1 · Rule Engine (before)</div><div class="info-card-body">Stages inputs: split forecast into demand buckets, compute safety stock, resolve lead times, prepare network validity.</div></div>
        <div class="info-card" style="border-left:3px solid var(--accent)"><div class="info-card-title">2 · Solver</div><div class="info-card-body">Plans supply order-by-order on the <strong>Supply Plan</strong>, honouring hard constraints and the Objective Rank List.</div></div>
        <div class="info-card" style="border-left:3px solid var(--green)"><div class="info-card-title">3 · Rule Engine (after)</div><div class="info-card-body">Post-processes: pegging rollups, exception/alert flags, collaboration and reporting measures.</div></div>
      </div>
      <div class="prose"><p>This is why “the solver did X” is usually really “the staged inputs told the solver to do X.” Debugging a plan almost always starts one layer up, in the inputs the rule engine prepared.</p></div>
    </div>`;
}

function notlpTab() {
  const rows = [
    ['Decision model', 'One global objective, solved simultaneously', 'Many ordered decisions, one demand at a time'],
    ['Objective', 'A single cost/profit function', 'The Objective Rank List (ordered soft constraints)'],
    ['Optimality', 'Provably optimal (within the model)', 'Good, rule-consistent — not provably optimal'],
    ['Explainability', 'Hard (shadow prices)', 'Easy — every decision traces to priority + constraint'],
    ['Scale behaviour', 'Can blow up combinatorially', 'Near-linear in demands × lanes × days'],
    ['When it changes', 'Re-tune the cost function', 'Re-order the rank list / change priorities'],
  ];
  return `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">SCS heuristic vs an LP / MIP optimiser</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>LP / MIP optimiser</th><th>o9 SCS (heuristic)</th></tr></thead>
        <tbody>
          ${rows.map(([d, l, s]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${l}</td><td style="color:var(--green)">${s}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose">
      <p>The practical punchline: <strong>the Objective Rank List is the objective.</strong> There is no separate cost model quietly overruling the priorities — change the ranking and you change the plan. That is what makes the solver predictable and auditable in production.</p>
    </div></div>`;
}
