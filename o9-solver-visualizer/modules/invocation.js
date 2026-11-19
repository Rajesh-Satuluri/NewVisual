import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow, GlowNode, PulseRing, easeInOut } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'In how many ways can the Supply Chain Solver be invoked, and what does each component of the command-line <code>exec plugin</code> signature mean?',
    a: 'The wiki states the solver can be invoked in <strong>two ways</strong>: via the <strong>Command Line</strong> and via a configured <strong>Action Button</strong> in a Workspace (plus <em>NamedSets</em> as a helper for the command signature). The command-line form is: <pre><code>exec plugin instance SupplyChainSolver for Measures {[Demand Quantity]} using scope (...) arguments {([Material Constrained], "true"), ([Capacity Constrained], "true"), ([Plan Type], "Delete_Plan")}</code></pre> <strong><code>instance SupplyChainSolver</code></strong> is the user-given alias of the plugin instance (defined in the plugin tab of SCS Config; <em>no hyphens</em> allowed in the name — <code>Test_SCS</code> is fine, <code>Test-SCS</code> errors). <strong><code>for Measures {[Demand Quantity]}</code></strong> names the demand measure the solver is primarily solving. <strong><code>using scope (...)</code></strong> sets the demand scope — a set of Orders, Items, Locations or combinations. <strong><code>arguments { ... }</code></strong> are runtime overrides of the config-file settings, comma-separated as <code>([Parameter Name], "Value")</code> — and <em>parameter names are case-sensitive</em>. For the Action Button: <em>Workspace → Designer → Edit Reports → Action Button → Add New Action Button</em>, configure and Save; later click it in a Workspace, Submit, then confirm success via the <strong>bell icon</strong> on the top-right.',
    tip: 'Say "two ways — command line and action button" first, then rattle off instance / for Measures / using scope / arguments, and flag that argument names are case-sensitive.' },
  { q: 'Explain the <code>[Material Constrained]</code> / <code>[Capacity Constrained]</code> flag matrix — what is an Unconstrained vs Constrained vs fully-constrained plan?',
    a: 'Two boolean arguments drive the planning mode. <strong>Unconstrained (False / False):</strong> SCS assumes enough material/lot is available on the <em>most upstream material node</em> and <em>no dearth of capacity</em>, so the demand is satisfied on its specified date — Lead Time, effectivity and holidays are still honoured. Used for MRP-style visibility of total supply at each level. <strong>Material Constrained (True / False):</strong> the solver solves demands <em>adhering to available Material</em>. <strong>Capacity Constrained (False / True):</strong> the solver solves demands <em>adhering to available capacity</em>. <strong>Fully constrained (True / True):</strong> a "<em>fully constrained plan (material and capacity constrained)</em>" — the solver adheres to both. A Constrained plan shows <em>how much demand will be satisfied using existing supply and capacity</em>. (The wiki also documents a third "Constrained Unconstrained" parameter for a constrained-then-unconstrained run, but notes it is <strong>not recommended and will be deprecated soon</strong>.)',
    tip: 'Memorise the four-corner matrix: False/False = unconstrained, True/False = material, False/True = capacity, True/True = fully constrained. Constrained = "fit to what exists", unconstrained = "assume infinite".' },
  { q: 'What is an <strong>Incremental Plan</strong> (<code>INCREMENTAL_PLAN</code>), and how does it differ from a full plan run?',
    a: 'The <code>[Plan Type]</code> argument set to <strong><code>INCREMENTAL_PLAN</code></strong> runs <strong>net-change planning</strong>. The basic rule is to <strong>handle exceptions while minimizing the impact on existing commitments</strong>: instead of re-planning the whole network, SCS keeps the <em>previous (full) plan under consideration</em> and only unplans/replans the <strong>orders and supplies that are marked</strong> for incremental planning (via measures like <code>Incremental_allowed</code> on demand and <code>Supply Changed</code> / <code>Capacity Changed</code> on supply). Planners use it to respond to a <em>rush order arriving at the last moment</em>, a forecast change, or supply/capacity changes — frequently to <em>expedite supply to meet demands that are short or late</em>. The supply/capacity measures must be included in the plugin command alongside the demand measure, e.g. <code>for Measures {[Demand Quantity], [Expected Receipts], [BOH], [Capacity Availability]}</code> with <code>([Plan Type], "INCREMENTAL_PLAN")</code>. Note the wiki warns that <code>[Delete SCS Plan Data For Version]</code> has <strong>no impact</strong> during an incremental run. It also supports Flow-Plan Override (WIP/flow-plan delta tables), Persistent SCS (warm-start the in-memory state) and Class-Based incremental planning.',
    tip: 'Lead with "net change — minimise impact on existing commitments". Only marked orders/supplies move; everything else is preserved. Contrast with a full plan that re-sorts and re-plans everything.' },
];

// ── palette ──────────────────────────────────────────────────────────────────
const C = { indigo:'#6366F1', violet:'#A78BFA', blue:'#38BDF8', green:'#10B981', amber:'#F59E0B', red:'#EF4444', slate:'#64748B', bg:'#0A0E1A' };

// Plan Types grounded in THIS wiki page only.
const SCEN = {
  full:        { planType: 'FULL_PLAN',        color: C.indigo, label: 'Full plan — plan the whole network from scratch' },
  incremental: { planType: 'INCREMENTAL_PLAN', color: C.violet, label: 'Incremental — net-change on top of the existing plan' },
  delete:      { planType: 'Delete_Plan',      color: C.red,    label: 'Delete plan — the [Plan Type] value from the wiki example' },
};

const ORDERS = ['Order_1', 'Order_2', 'Order_3', 'Order_4', 'Order_5'];
const EXISTING = [1, 1, 1, 0.7, 0];   // existing plan state before the run; Order_5 is the new / rush order

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Invocation',
    title: 'Invocation & Plan Types',
    subtitle: 'How the Supply Chain Solver is invoked — command line or action button — and what the Plan Type it runs actually does. Watch an exec-plugin command stream its arguments into the solver, the solver run, and the plan outputs get written, with the preserved-vs-replanned distinction visible for an incremental run.',
    tabs: [
      { id: 'exec',  label: '⚙️ exec plugin' },
      { id: 'how',   label: '📟 Invoking the solver', content: howTab() },
      { id: 'types', label: '🗂️ Plan types & constrained', content: typesTab() },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildExec(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the exec → solver → outputs lifecycle animation ───────────────────
function buildExec(container) {
  const tab = container.querySelector('#tab-exec');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">An <b style="color:${C.indigo}">exec plugin</b> command streams its three arguments — <b>[Material Constrained]</b>, <b>[Capacity Constrained]</b>, <b>[Plan Type]</b> — into the <b style="color:${C.violet}">SupplyChainSolver</b>, which runs and writes the <b>plan outputs</b> on the right. Pick a <b>Plan Type</b> and toggle the constraint flags, then <b>Run</b> (or <b>Step</b> a phase at a time).</div>
      <canvas id="invk-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="invk-run">▶ Run (exec plugin)</button>
        <button class="ctrl-btn" id="invk-step">⏭ Step phase</button>
        <button class="ctrl-btn" id="invk-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Plan Type:</span>
        <button class="ctrl-btn" data-scen="full">FULL_PLAN</button>
        <button class="ctrl-btn" data-scen="incremental">INCREMENTAL_PLAN</button>
        <button class="ctrl-btn" data-scen="delete">Delete_Plan</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Arguments:</span>
        <button class="ctrl-btn" data-mode="material">[Material Constrained]: True</button>
        <button class="ctrl-btn" data-mode="capacity">[Capacity Constrained]: True</button>
      </div>
      <div id="invk-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The command on the left is the wiki's command-line signature: <code>exec plugin instance SupplyChainSolver for Measures {[Demand Quantity]} using scope (...) arguments {...}</code>. On <b>Run</b> the three arguments are consumed in turn, the solver pulses while it plans, then packets flow out and write the plan.</p>
      <p><strong>FULL_PLAN</strong> re-plans the whole network: every order is cleared and rebuilt. <strong>INCREMENTAL_PLAN</strong> is net-change — the existing plan is <em>preserved</em> (shown in slate) and only the marked / rush order (Order_5) is replanned on top, "<em>handling exceptions while minimizing the impact on existing commitments</em>". <strong>Delete_Plan</strong> is the <code>[Plan Type]</code> value shown in the wiki's example command; its behaviour is not described on this page, so the clear-out shown here is illustrative (the documented way to wipe a version's plan is the separate <code>[Delete SCS Plan Data For Version]</code> = True flag).</p>
      <p>The constraint flags change the <em>outcome</em>: an <strong>Unconstrained</strong> run (both False) assumes infinite material &amp; capacity so every demand is met on its date, while a <strong>Constrained</strong> run has to fit demand into what exists, so lower-priority demand can end short.</p>
    </div>`;

  const canvas = tab.querySelector('#invk-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const TX = 24, TY = 58, TW = 236, TH = 160;         // command terminal card
  const SX = 392, SY = 150, SR = 30;                  // solver node
  const LBLX = 480;                                   // order label x
  const TRX = 528, TRW = 246;                         // order track x / width
  const OY = 70, RH = 30;                             // order rows
  const rowY = (i) => OY + i * RH;

  let scen = 'full';
  let matCon = true, capCon = true;
  let t = 0, playing = false, stepTo = null, finished = false, wasPlaying = false;
  let pulseTimer = 0;
  const rings = [];
  const BOUNDS = [0.25, 0.45, 1.0];
  const SPEED = 0.0065;

  // ── model ──────────────────────────────────────────────────────────────────
  const lerp = (a, b, f) => a + (b - a) * f;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const unconstrained = () => !matCon && !capCon;

  function finals() {
    if (scen === 'delete') return [0, 0, 0, 0, 0];
    if (scen === 'full')   return unconstrained() ? [1, 1, 1, 1, 1] : [1, 1, 1, 0.7, 0.45];
    // incremental: preserve 1..4, replan the rush order (5)
    return [EXISTING[0], EXISTING[1], EXISTING[2], EXISTING[3], unconstrained() ? 1 : 0.6];
  }
  function isChanged(i) {
    if (scen === 'delete') return true;
    if (scen === 'full')   return true;
    return i === 4;                      // incremental touches only the rush order
  }
  function tagOf(i) {
    if (scen === 'delete') return 'cleared';
    if (scen === 'incremental' && i < 4) return 'preserved';
    return 'replanned';
  }
  function colorOf(i, target) {
    if (scen === 'delete') return C.red;
    if (scen === 'incremental' && i < 4) return C.slate;    // preserved
    if (target >= 0.99) return C.green;
    if (target > 0)     return C.amber;
    return C.red;
  }
  function orderFill(i) {
    const fin = finals();
    const wp = easeInOut(clamp01((t - 0.45) / 0.55));
    if (scen === 'delete') return lerp(EXISTING[i], 0, wp);
    if (scen === 'incremental') return i < 4 ? EXISTING[i] : lerp(0, fin[i], wp);
    // full: clear (first half) then rebuild (second half)
    if (wp < 0.5) return lerp(EXISTING[i], 0, wp / 0.5);
    return lerp(0, fin[i], (wp - 0.5) / 0.5);
  }
  function modeLabel() {
    if (unconstrained()) return 'Unconstrained (infinite material &amp; capacity)';
    if (matCon && capCon) return 'Material &amp; Capacity Constrained (fully constrained)';
    return matCon ? 'Material Constrained' : 'Capacity Constrained';
  }
  const planDesc = {
    full: 'A full plan sorts demands by priority and plans them against available supply/capacity. In the wiki, <code>FULL_PLAN</code> is the baseline run (and the Persistent-SCS "As-is" plan type); every order is (re)planned.',
    incremental: 'Net-change planning: SCS keeps the previous plan under consideration and only unplans/replans the <em>marked</em> orders &amp; supplies — "<em>handle exceptions while minimizing the impact on existing commitments</em>". Used for rush / short / late orders.',
    delete: 'Shown only as the <code>[Plan Type]</code> value in the wiki\'s command-line example. This page does <em>not</em> describe <code>Delete_Plan</code>\'s behaviour; the documented way to wipe a version\'s plan outputs is the separate <code>[Delete SCS Plan Data For Version]</code> = "True" flag.',
  };
  const modeDesc = () => {
    if (unconstrained()) return 'SCS assumes enough material on the most upstream node and no dearth of capacity, so demand is satisfied on its specified date (Lead Time, effectivity &amp; holidays still honoured).';
    if (matCon && capCon) return 'The solver solves demands adhering to <strong>both</strong> available material and capacity — a fully constrained plan.';
    return matCon
      ? 'The solver solves demands adhering to available <strong>Material</strong>.'
      : 'The solver solves demands adhering to available <strong>capacity</strong>.';
  };

  // ── ledger ─────────────────────────────────────────────────────────────────
  function setLedger(cards) {
    tab.querySelector('#invk-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }
  function updateLedger() {
    const s = SCEN[scen];
    const phase = t <= 0 ? 'Ready' : t < 0.25 ? 'Reading arguments' : t < 0.45 ? 'Solver running' : t < 1 ? 'Writing plan outputs' : 'Done';
    const cards = [
      { color: C.slate, title: `${phase} · ${s.planType}`, body: `<code>arguments { ([Material Constrained], "${matCon ? 'True' : 'False'}"), ([Capacity Constrained], "${capCon ? 'True' : 'False'}"), ([Plan Type], "${s.planType}") }</code><br>Mode: <b>${modeLabel()}</b>.` },
      { color: s.color, title: `Plan Type = ${s.planType}`, body: planDesc[scen] },
      { color: unconstrained() ? C.green : C.blue, title: unconstrained() ? 'Unconstrained run' : 'Constrained run', body: modeDesc() },
    ];
    if (finished) {
      const fin = finals();
      if (scen === 'delete') {
        cards.push({ color: C.red, title: '✗ Plan outputs cleared', body: 'All plan outputs for the scope are emptied in this illustration. (Behaviour not documented on this wiki page — see the explainer.)' });
      } else if (scen === 'incremental') {
        const rush = fin[4] >= 0.99 ? 'fully met' : fin[4] > 0 ? 'partially met' : 'short';
        cards.push({ color: C.violet, title: '✓ Net change applied', body: `<b>Order_1–4</b> preserved untouched; only the marked rush <b>Order_5</b> was unplanned &amp; replanned → <b>${rush}</b>. The existing commitments are protected.` });
      } else {
        const met = fin.filter(v => v >= 0.99).length;
        const short = fin.filter(v => v < 0.99).length;
        cards.push({ color: met === 5 ? C.green : C.amber, title: '✓ Full plan rebuilt', body: `Whole network re-planned from scratch: <b>${met}</b> order(s) met on time${short ? `, <b>${short}</b> short/partial because demand had to be fit into available ${matCon && capCon ? 'material &amp; capacity' : matCon ? 'material' : 'capacity'}` : ''}.` });
      }
    }
    setLedger(cards);
  }

  // ── controls ───────────────────────────────────────────────────────────────
  function restartIfDone() { if (t >= 1) { t = 0; finished = false; rings.length = 0; } }
  function run()  { restartIfDone(); playing = true; stepTo = null; }
  function step() { restartIfDone(); stepTo = BOUNDS.find(b => b > t + 1e-4) ?? 1; playing = true; }
  function reset() { playing = false; stepTo = null; t = 0; finished = false; rings.length = 0; updateLedger(); }

  // ── drawing helpers ────────────────────────────────────────────────────────
  function glowDot(x, y, color) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 10);
    g.addColorStop(0, color + 'ee'); g.addColorStop(1, color + '00');
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }

  const solver = new GlowNode({ x: SX, y: SY, r: SR, color: C.violet, label: 'SCS', active: false });

  function argOn(i) { return t >= 0.25 || t >= (0.05 + i * 0.07); }
  function argColor(i) {
    if (!argOn(i)) return '#334155';
    if (i === 2) return SCEN[scen].color;
    return (i === 0 ? matCon : capCon) ? C.blue : C.slate;
  }

  // ── main loop ──────────────────────────────────────────────────────────────
  let raf = null;
  function draw() {
    if (playing) {
      t += SPEED;
      if (stepTo != null && t >= stepTo) { t = stepTo; playing = false; stepTo = null; }
      if (t >= 1) { t = 1; playing = false; if (!finished) { finished = true; } }
    }
    if (wasPlaying && !playing) updateLedger();   // just paused / finished
    wasPlaying = playing;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = C.indigo; ctx.fillText('■ exec command', TX, 24);
    ctx.fillStyle = C.violet; ctx.fillText('■ solver', TX + 110, 24);
    ctx.fillStyle = C.green;  ctx.fillText('■ met', TX + 180, 24);
    ctx.fillStyle = C.amber;  ctx.fillText('■ short', TX + 230, 24);
    ctx.fillStyle = C.slate;  ctx.fillText('■ preserved', TX + 290, 24);
    ctx.fillStyle = C.red;    ctx.fillText('■ cleared', TX + 390, 24);

    // static pipeline arrows
    drawArrow(ctx, TX + TW + 2, SY, SX - SR - 6, SY, '#334155', 1.5);
    drawArrow(ctx, SX + SR + 6, SY, LBLX - 4, SY - 10, '#334155', 1.5);

    // ── command terminal card ──
    drawRoundRect(ctx, TX, TY, TW, TH, 8, '#0d1424', '#1E293B');
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    const lx = TX + 12;
    ctx.fillStyle = C.indigo; ctx.fillText('exec plugin instance', lx, TY + 22);
    ctx.fillStyle = C.violet; ctx.fillText('  SupplyChainSolver', lx, TY + 36);
    ctx.fillStyle = C.slate;  ctx.fillText('for {[Demand Quantity]}', lx, TY + 52);
    ctx.fillStyle = C.slate;  ctx.fillText('using scope (CWV*Time*Order)', lx, TY + 66);
    ctx.fillStyle = '#CBD5E1'; ctx.fillText('arguments {', lx, TY + 84);
    const args = [
      `([Material Constrained],"${matCon ? 'True' : 'False'}")`,
      `([Capacity Constrained],"${capCon ? 'True' : 'False'}")`,
      `([Plan Type],"${SCEN[scen].planType}")`,
    ];
    args.forEach((a, i) => {
      ctx.fillStyle = argColor(i);
      ctx.font = (argOn(i) ? 'bold ' : '') + '9px monospace';
      ctx.fillText('  ' + a, lx, TY + 100 + i * 14);
    });
    ctx.font = '10px monospace'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('}', lx, TY + 100 + 3 * 14 + 2);

    // ── phase 1: argument packet travels command → solver ──
    if (t > 0 && t < 0.26) {
      const f = clamp01(t / 0.25);
      glowDot(lerp(TX + TW + 4, SX - SR - 6, f), lerp(TY + TH / 2, SY, f), C.indigo);
    }

    // ── phase 2: solver pulses while running ──
    if (playing && t >= 0.25 && t < 0.45) {
      pulseTimer++;
      if (pulseTimer % 10 === 0) rings.push(new PulseRing({ x: SX, y: SY, color: C.violet, maxR: 48, duration: 0.9 }));
    }
    for (let k = rings.length - 1; k >= 0; k--) { rings[k].update(1 / 60); if (rings[k].done) rings.splice(k, 1); }
    rings.forEach(r => r.draw(ctx));

    solver.active = t > 0.001 && t < 0.999;
    solver.update(1 / 60);
    solver.draw(ctx);
    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('SupplyChainSolver', SX, SY + SR + 16);

    // ── phase 3: output packets solver → changed orders ──
    if (t >= 0.45) {
      const f = easeInOut(clamp01((t - 0.45) / 0.55));
      for (let i = 0; i < 5; i++) {
        if (!isChanged(i)) continue;
        const col = scen === 'delete' ? C.red : SCEN[scen].color;
        glowDot(lerp(SX + SR + 6, TRX - 4, f), lerp(SY, rowY(i) + 15, f), col);
      }
    }

    // ── plan outputs (order rows) ──
    ctx.textAlign = 'left'; ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Plan outputs', LBLX, OY - 10);
    const fin = finals();
    for (let i = 0; i < 5; i++) {
      const y = rowY(i), fill = orderFill(i), target = fin[i];
      const col = colorOf(i, target), tag = tagOf(i), changed = isChanged(i);
      // label
      ctx.font = '10px system-ui'; ctx.textAlign = 'left';
      ctx.fillStyle = changed && scen !== 'incremental' ? '#E2E8F0' : (scen === 'incremental' && i === 4 ? C.violet : '#94a3b8');
      ctx.fillText(ORDERS[i], LBLX, y + 20);
      if (scen === 'incremental' && i === 4) { ctx.font = '8px system-ui'; ctx.fillStyle = C.violet; ctx.fillText('rush · marked', LBLX, y + 29); }
      // track
      drawRoundRect(ctx, TRX, y + 8, TRW, 14, 3, '#0d1424', '#1E293B');
      const w = Math.max(0, TRW * fill);
      if (w > 0.5) drawRoundRect(ctx, TRX, y + 8, w, 14, 3, col + 'cc', col);
      // tag
      ctx.font = '8px system-ui'; ctx.textAlign = 'right';
      ctx.fillStyle = tag === 'preserved' ? C.slate : tag === 'cleared' ? C.red : col;
      ctx.fillText(tag, TRX + TRW, y + 6);
    }

    // phase strip readout
    ctx.textAlign = 'left'; ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
    const phase = t <= 0 ? 'ready' : t < 0.25 ? '1 · reading arguments' : t < 0.45 ? '2 · solver running' : t < 1 ? '3 · writing plan' : 'done';
    ctx.fillText('phase: ' + phase, TX, 290);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // ── wiring ─────────────────────────────────────────────────────────────────
  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scen = b.dataset.scen; reset(); }));
  tab.querySelector('#invk-run').addEventListener('click', run);
  tab.querySelector('#invk-step').addEventListener('click', step);
  tab.querySelector('#invk-reset').addEventListener('click', reset);
  const matBtn = tab.querySelector('[data-mode="material"]');
  const capBtn = tab.querySelector('[data-mode="capacity"]');
  matBtn.addEventListener('click', () => { matCon = !matCon; matBtn.textContent = `[Material Constrained]: ${matCon ? 'True' : 'False'}`; reset(); });
  capBtn.addEventListener('click', () => { capCon = !capCon; capBtn.textContent = `[Capacity Constrained]: ${capCon ? 'True' : 'False'}`; reset(); });
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: Invoking the solver (command line vs action button) ───────────────
function howTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Two ways to invoke the solver</div><div class="section-desc">The wiki states the Supply Chain Solver can be invoked via the Command Line or via a configured Action Button (with NamedSets as a helper for the command signature).</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>Command Line</th><th>Action Button</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Where</td><td>An <code>exec plugin</code> statement (e.g. in a rule / query).</td><td>A button configured in a Workspace report.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Set up</td><td>Write the signature below; names are case-sensitive; no hyphen in the instance name.</td><td>Workspace → Designer → Edit Reports → Action Button → Add New Action Button → configure → Save.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Run it</td><td>Execute the statement.</td><td>Go to any Workspace, click the action button (top-right), click Submit.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Confirm</td><td>Statement result.</td><td>Click the <strong>bell icon</strong> on the top-right of the Workspace to confirm the solver ran successfully.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">The command-line signature</div><div class="section-desc">The exact example from the wiki, annotated.</div></div>
      <pre style="background:#0d1424;border:1px solid #1E293B;border-radius:8px;padding:14px;overflow:auto;color:#CBD5E1;font-size:12px;line-height:1.6"><code>exec plugin instance <span style="color:#A78BFA">SupplyChainSolver</span>
  for Measures {[Demand Quantity]}
  using scope ([Version].[Version Name].[CurrentWorkingView]
               * Time.[Fiscal Week] * Order.[Order Name])
  arguments {([Material Constrained], "true"),
             ([Capacity Constrained], "true"),
             ([Plan Type], "Delete_Plan")}</code></pre>
      <div class="info-grid" style="margin-top:14px">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title"><code>instance SupplyChainSolver</code></div><div class="info-card-body">The user-given alias of the plugin instance (defined in the plugin tab of SCS Config). <strong>No hyphen</strong> in the name — <code>Test_SCS</code> works, <code>Test-SCS</code> errors.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title"><code>for Measures {[Demand Quantity]}</code></div><div class="info-card-body">The demand measure the solver is primarily solving. You can run for different demands (orders / forecasts). Incremental runs also add <code>[Expected Receipts]</code>, <code>[BOH]</code>, <code>[Capacity Availability]</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title"><code>using scope (...)</code></div><div class="info-card-body">Sets the demand scope: a set of Orders, Items, Locations, or combinations (via <code>.filter(#.Name in {...})</code>).</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title"><code>arguments { ([Name],"Value") }</code></div><div class="info-card-body">Runtime overrides of the config-file settings, comma-separated. <strong>Parameter names are case-sensitive.</strong></div></div>
      </div>

      <div class="canvas-explainer"><h3>NamedSets</h3>
        <p>Planners can add <strong>NamedSets</strong> to the command signature (Designer → Edit Model → Rule → Named Sets). A NamedSet like <code>&amp;CWV</code> or <code>&amp;PlanningHorizon</code> can then be reused in the scope and arguments, e.g. <code>using scope (&amp;CWV * &amp;PlanningHorizon * Order.[Order Name])</code> with arguments such as <code>([Current Time Bucket Name], &amp;CurrentWeek.element(0).Name)</code>.</p>
      </div>
    </div>`;
}

// ── Tab 3: Plan types & constrained vs unconstrained ─────────────────────────
function typesTab() {
  const rows = [
    ['<code>FULL_PLAN</code>', 'Full / baseline plan — demands are sorted by priority and planned against available supply &amp; capacity. The Persistent-SCS "As-is" normal run.', 'Lines 633, 866, 875'],
    ['<code>INCREMENTAL_PLAN</code>', 'Net-change plan — keeps the previous plan and only unplans/replans the <em>marked</em> orders &amp; supplies, "handling exceptions while minimizing the impact on existing commitments". For rush / short / late orders.', 'Lines 262, 418'],
    ['<code>Delete_Plan</code>', 'Appears only as the <code>[Plan Type]</code> value in the wiki\'s command-line example; behaviour not described on this page.', 'Line 30'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Plan Types grounded in this page</div><div class="section-desc">The <code>[Plan Type]</code> argument values that literally appear on this wiki page. FULL / INCREMENTAL / Delete only — see the note below.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>[Plan Type]</th><th>What it does</th><th>Grounded at</th></tr></thead>
          <tbody>${rows.map(([p, d, g]) => `<tr><td style="font-weight:600;color:var(--text)">${p}</td><td style="color:var(--text2)">${d}</td><td style="color:var(--text2)">${g}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-card" style="border-left:3px solid #F59E0B;margin-top:12px"><div class="info-card-title">⚠ Not documented on this page</div><div class="info-card-body"><code>EXPORT_ONLY</code> and <code>IDENTIFY_SEGMENTS</code> do <strong>not</strong> appear anywhere on this wiki page (they are referenced in the site navigation elsewhere). They are therefore <strong>omitted</strong> here rather than invented. <code>FULL_PLAN</code> is grounded (it appears as <code>FULL_PLAN</code> / "FULL PLAN"). <code>Delete_Plan</code> is grounded only as an example value — this page does not describe what it does; the documented data-wipe is the separate <code>[Delete SCS Plan Data For Version]</code> = "True" flag, which also has <em>no effect</em> during an incremental run.</div></div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Constrained vs Unconstrained — the flag matrix</div><div class="section-desc">Two boolean arguments decide whether the solver respects material and capacity, or assumes them infinite.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>[Material Constrained]</th><th>[Capacity Constrained]</th><th>Mode</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>False</td><td>False</td><td style="font-weight:600;color:var(--text)">Unconstrained</td><td>Enough material on the most upstream node &amp; no dearth of capacity; demand satisfied on its specified date (Lead Time, effectivity, holidays still honoured). Used for MRP-style visibility.</td></tr>
            <tr><td>True</td><td>False</td><td style="font-weight:600;color:var(--text)">Material Constrained</td><td>Solver solves demands adhering to available <strong>Material</strong>.</td></tr>
            <tr><td>False</td><td>True</td><td style="font-weight:600;color:var(--text)">Capacity Constrained</td><td>Solver solves demands adhering to available <strong>capacity</strong>.</td></tr>
            <tr><td>True</td><td>True</td><td style="font-weight:600;color:var(--text)">Fully constrained</td><td>Solver adheres to <strong>both</strong> material and capacity — a "fully constrained plan (material and capacity constrained)".</td></tr>
          </tbody>
        </table>
      </div>
      <div class="prose"><p>A <strong>Constrained Plan</strong> shows how much demand will be satisfied using existing supply and capacity; an <strong>Unconstrained Plan</strong> gives visibility of total supply at each level assuming no restriction. The wiki also documents a "Constrained-Unconstrained" parameter (a constrained run followed by an unconstrained run for only the short orders) but notes it is <strong>not recommended and will be deprecated soon</strong>.</p></div>
    </div>`;
}
