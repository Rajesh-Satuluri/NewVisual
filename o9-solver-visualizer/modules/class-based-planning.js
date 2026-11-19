import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Define hard pegging vs class-based planning in the SCS, and state the one difference that matters most.',
    a: 'A <strong>hard peg</strong> is a rigid, committed link from a specific supply to a specific demand — a lot, WIP run or allocation <em>reserved for one order</em>. Once hard-pegged, that supply is <strong>unavailable to any other demand</strong>, even a higher-priority one that goes short. <strong>Class-based planning</strong> instead pools supply by a <strong>class</strong> — a group of mutually substitutable demands/materials — so any demand in the class can consume any supply in the class. The supply is <strong>fungible within the class</strong>. The one difference that matters: hard pegs <em>freeze</em> supply to an order; class-based keeps it <strong>reallocatable</strong>, so the solver can move material to whoever needs it most.',
    tip: 'One line: "hard peg = frozen to one order; class = fungible pool the solver can reallocate."' },
  { q: 'What is "material reallocation", and walk a priority example that shows what it changes.',
    a: '<strong>Material reallocation</strong> is the hinge behaviour: relaxing a hard-pegged commitment into a class pool so the solver can re-assign that material to the <strong>highest-priority demand</strong> in the class. Worked example — demands <code>D1 (priority 1, 60)</code> and <code>D2 (priority 2, 60)</code>, supplies <code>S_a (50)</code> and <code>S_b (50)</code>. <strong>Hard-peg</strong>: an old commitment locks <code>S_a→D2</code> and <code>S_b→D1</code>, so D1 gets only 50 (<strong>short 10</strong>) while D2 is fully covered — priority-1 is starved though 100 units exist. <strong>Class-based</strong>: both supplies pool; the solver serves <code>D1</code> fully (60) first, then <code>D2</code> with the remaining 40 (<strong>short 20</strong>). Same 100 units — reallocation <strong>moves the shortage onto the lower-priority demand</strong>.',
    tip: 'The point isn\'t "fewer shorts" — totals are fixed. It\'s "the short lands on the right (lower-priority) demand."' },
  { q: 'What is the trade-off between hard pegs and class-based planning, and when would you deliberately keep a hard peg?',
    a: 'Hard pegs buy <strong>certainty and traceability</strong> for a specific order — the supply is guaranteed to that demand and the link is auditable — at the cost of <strong>flexibility</strong>. Class-based buys <strong>flexibility and better priority service</strong> across the pool, at the cost of giving up the firm commitment. You keep a hard peg when the commitment itself is the point: <strong>make-to-order</strong> production dedicated to one customer, a firm allocation you have promised, customer-dedicated WIP, or regulated material that must stay traceable to one order. You go class-based for <strong>fungible make-to-stock</strong> where any unit will do and priority service matters more than which exact unit fills which order.',
    tip: 'Hard peg = commitment/traceability; class = fungible flexibility. Keep the peg when the promise is the deliverable.' },
];

// ── Grounded teaching scenario: 2 demands, 2 supplies, one class ──────────────
const D1 = { id: 'D1', pri: 1, qty: 60 };
const D2 = { id: 'D2', pri: 2, qty: 60 };
const SA = { id: 'S_a', qty: 50 };
const SB = { id: 'S_b', qty: 50 };

// HARD-PEG: frozen commitments S_a→D2, S_b→D1
function hardPegPlan() {
  return {
    links: [
      { from: 'S_b', to: 'D1', qty: 50 },
      { from: 'S_a', to: 'D2', qty: 50 },
    ],
    fill: { D1: 50, D2: 50 },
    short: { D1: 10, D2: 10 },
  };
}
// CLASS-BASED: pool both supplies, serve by priority (D1 first)
function classPlan() {
  const pool = SA.qty + SB.qty;           // 100
  const d1fill = Math.min(D1.qty, pool);  // 60
  const d2fill = Math.min(D2.qty, pool - d1fill); // 40
  return {
    links: [
      // D1 drawn fully: 50 from S_b + 10 from S_a
      { from: 'S_b', to: 'D1', qty: 50 },
      { from: 'S_a', to: 'D1', qty: 10 },
      // D2 gets the remaining 40 from S_a
      { from: 'S_a', to: 'D2', qty: 40 },
    ],
    fill: { D1: d1fill, D2: d2fill },
    short: { D1: D1.qty - d1fill, D2: D2.qty - d2fill },
  };
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Class-Based Planning',
    subtitle: 'The hinge between a hard peg — supply frozen to one order — and a class pool the solver can reallocate. Toggle the two modes on the same 100 units and watch the shortage move from the priority-1 demand onto the lower-priority one.',
    tabs: [
      { id: 'hinge',        label: '🧬 The Hinge' },
      { id: 'reallocation', label: '🔀 Reallocation', content: reallocationTab() },
      { id: 'concepts',     label: '📖 Concepts', content: conceptsTab() },
      { id: 'iq',           label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live hard-peg ↔ class reallocation toggle ──────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-hinge');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Two demands — <b style="color:#F87171">D1 (priority 1, 60)</b> and <b style="color:#FBBF24">D2 (priority 2, 60)</b> — and two supplies <b style="color:#38BDF8">S_a (50)</b>, <b style="color:#38BDF8">S_b (50)</b>: 100 units in all. Toggle the mode and watch the pegs rewire. <b>Hard-peg</b> freezes old commitments; <b>class-based</b> pools the supply and reallocates to priority.</div>
      <canvas id="cbp-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cbp-hard">🔒 Hard-Peg</button>
        <button class="ctrl-btn" id="cbp-class">🧬 Class-Based</button>
        <span class="ctrl-label" id="cbp-status">Hard-peg: S_a locked to D2, S_b locked to D1.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>In <strong>hard-peg</strong> mode an old commitment locks <code>S_a → D2</code> and <code>S_b → D1</code>. So <strong>D1 (priority 1) gets only 50 and is short 10</strong>, while <strong>D2 (priority 2) sits fully covered at 50</strong>. There are 100 units on hand and the <em>most important</em> demand is the one starved — because its supply was frozen to someone else.</p>
      <p>Switch to <strong>class-based</strong> and both supplies drop into one <strong>class pool</strong>. The solver now serves by priority: <strong>D1 is filled fully to 60</strong> (50 from S_b + 10 from S_a), then <strong>D2 takes the remaining 40 and is short 20</strong>. The totals never changed — 100 units, 20 short either way — but <strong>reallocation moved the shortage off the priority-1 demand and onto the priority-2 demand</strong>. That is the entire value of the hinge: not fewer shorts, but the short landing where it should.</p>
    </div>`;

  const canvas = tab.querySelector('#cbp-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#cbp-status');

  let mode = 'hard';
  let plan = hardPegPlan();
  let t = 0;            // transition progress 0..1
  let animating = false;

  function setMode(m) {
    if (mode === m) return;
    mode = m;
    plan = m === 'hard' ? hardPegPlan() : classPlan();
    t = 0; animating = true;
    statusEl.textContent = m === 'hard'
      ? 'Hard-peg: S_a locked to D2, S_b locked to D1. D1 (priority 1) short 10.'
      : 'Class-based: supply pooled, reallocated to priority. D1 filled 60, D2 short 20.';
  }

  // node geometry
  const supX = 70, supW = 150, supH = 70;
  const SAy = 70, SBy = 180;
  const demX = 630, demW = 160, demH = 90;
  const D1y = 60, D2y = 200;

  function supplyBox(id) { return id === 'S_a' ? { x: supX, y: SAy, w: supW, h: supH } : { x: supX, y: SBy, w: supW, h: supH }; }
  function demandBox(id) { return id === 'D1' ? { x: demX, y: D1y, w: demW, h: demH } : { x: demX, y: D2y, w: demW, h: demH }; }

  let raf = null;
  function draw() {
    if (animating) { t += 0.04; if (t >= 1) { t = 1; animating = false; } }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // headers
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Supply', supX, 44);
    ctx.textAlign = 'right';
    ctx.fillText('Demand (by priority)', demX + demW, 44);
    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = mode === 'class' ? '#34D399' : '#64748B';
    ctx.fillText(mode === 'class' ? 'ONE CLASS POOL — fungible' : 'HARD PEGS — frozen 1:1', canvas.width / 2, 28);

    // class pool halo in class mode
    if (mode === 'class') {
      ctx.save();
      ctx.globalAlpha = 0.10 + 0.04 * Math.sin(Date.now() / 400);
      drawRoundRect(ctx, supX - 14, SAy - 14, supW + 28, (SBy + supH) - SAy + 28, 16, '#10B981', '');
      ctx.restore();
      ctx.strokeStyle = '#10B98166'; ctx.setLineDash([5, 4]);
      ctx.strokeRect(supX - 14, SAy - 14, supW + 28, (SBy + supH) - SAy + 28);
      ctx.setLineDash([]);
    }

    // pegs (behind boxes)
    plan.links.forEach(l => {
      const s = supplyBox(l.from), d = demandBox(l.to);
      const col = l.to === 'D1' ? '#F87171' : '#FBBF24';
      ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * t;
      drawArrow(ctx, s.x + s.w, s.y + s.h / 2, d.x - 4, d.y + d.h / 2, col + 'CC', 1.4 + (l.qty / 50) * 1.6);
      ctx.restore();
      // qty label at midpoint
      const mx = (s.x + s.w + d.x) / 2, my = (s.y + s.h / 2 + d.y + d.h / 2) / 2;
      ctx.save(); ctx.globalAlpha = t;
      ctx.font = 'bold 10px system-ui'; ctx.fillStyle = col; ctx.textAlign = 'center';
      ctx.fillText(`${l.qty}`, mx, my - 4);
      ctx.restore();
    });

    // supply boxes
    [['S_a', SA], ['S_b', SB]].forEach(([id, s]) => {
      const b = supplyBox(id);
      drawRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#111827', mode === 'class' ? '#10B981' : '#38BDF8');
      ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(id, b.x + b.w / 2, b.y + 26);
      ctx.font = '12px system-ui'; ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${s.qty} units`, b.x + b.w / 2, b.y + 48);
    });

    // demand boxes with fill + short badge
    [D1, D2].forEach(d => {
      const b = demandBox(d.id);
      const col = d.id === 'D1' ? '#F87171' : '#FBBF24';
      drawRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#111827', col);
      ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`${d.id} · priority ${d.pri}`, b.x + b.w / 2, b.y + 24);
      // fill bar
      const barX = b.x + 16, barY = b.y + 36, barW = b.w - 32, barH = 18;
      drawRoundRect(ctx, barX, barY, barW, barH, 5, '#0d1322', '#1e2a3f');
      const fill = plan.fill[d.id] / d.qty;
      drawRoundRect(ctx, barX, barY, barW * fill, barH, 5, col + '66', col);
      ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`${plan.fill[d.id]} / ${d.qty}`, b.x + b.w / 2, barY + 14);
      // short badge
      const sh = plan.short[d.id];
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = sh > 0 ? '#EF4444' : '#10B981';
      ctx.fillText(sh > 0 ? `SHORT ${sh}` : 'FILLED', b.x + b.w / 2, b.y + b.h - 8);
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#cbp-hard').addEventListener('click', () => setMode('hard'));
  tab.querySelector('#cbp-class').addEventListener('click', () => setMode('class'));

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: reallocation (static, grounded) ────────────────────────────────────
function reallocationTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Material reallocation — un-freezing the pool</div><div class="section-desc">The hinge behaviour: relax a hard-pegged commitment into a class pool so the solver can re-assign material to the highest-priority demand in the class.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">The problem hard pegs create</div><div class="info-card-body">A hard peg freezes supply to one demand. When a <strong>higher-priority</strong> demand later goes short, the frozen supply <em>cannot</em> move to it — priority service is lost even though material exists elsewhere in the model.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">What reallocation does</div><div class="info-card-body">Relaxing the peg to a <strong>class</strong> makes the supply fungible within that class. The solver re-runs the allocation by priority, so previously-locked units flow to the most urgent demand first.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">What it costs</div><div class="info-card-body">The firm commitment is gone — you can no longer promise "<em>this</em> supply for <em>that</em> order." Totals don't improve; the shortage simply <strong>moves onto the lower-priority demand</strong> where it belongs.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Before / after — same 100 units</div><div class="section-desc">Demands D1 (priority 1, 60) and D2 (priority 2, 60); supplies S_a (50) and S_b (50).</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Mode</th><th>D1 (priority 1)</th><th>D2 (priority 2)</th><th>Where the short lands</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">Hard-peg</td><td>50 / 60 &nbsp;<span style="color:#EF4444">short 10</span></td><td>50 / 60 &nbsp;<span style="color:#EF4444">short 10</span></td><td style="color:#EF4444">On the priority-1 demand — wrong</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">Class-based</td><td style="color:#10B981">60 / 60 &nbsp;filled</td><td>40 / 60 &nbsp;<span style="color:#EF4444">short 20</span></td><td style="color:#10B981">On the priority-2 demand — right</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Read the totals carefully</h3>
        <p>Both plans leave <strong>20 units short in total</strong> — reallocation does <em>not</em> create supply. What changes is <strong>who</strong> absorbs the shortage. Hard-peg spreads it 10/10 and happens to starve the priority-1 demand; class-based concentrates all 20 on the priority-2 demand and fully protects priority-1. In a priority-driven plan that is a strictly better answer, which is why class-based planning exists.</p>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static, grounded) ────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Hard peg vs class pool</div><div class="section-desc">Two ways to connect supply to demand. The hinge is choosing where a given material sits between them.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>Hard peg</th><th>Class-based</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Link</td><td>Rigid 1:1, supply → one demand</td><td>Fungible, any supply → any demand in class</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Reallocatable?</td><td>No — frozen</td><td>Yes — re-assigned by priority</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Comes from</td><td>Firm allocation, make-to-order lot, dedicated WIP</td><td>Fungible make-to-stock, substitutable pool</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Strength</td><td>Certainty, traceability to one order</td><td>Flexibility, better priority service</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Weakness</td><td>Starves priority when demand shifts</td><td>Gives up the firm commitment</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What a "class" means</div><div class="section-desc">A class is a group of demands and/or supplies that are mutually substitutable — the membership defines the pool the solver may reallocate within.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Membership = substitutability</div><div class="info-card-body">Supplies in a class are treated as interchangeable for the demands in that class. A demand can only draw from supply inside its own class — the class boundary is the limit of fungibility.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Priority within the class</div><div class="info-card-body">Inside the pool the ordinary priority rules apply: higher-priority demands are planned first and consume the shared supply before lower-priority ones.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">The hinge is per-material</div><div class="info-card-body">Some materials stay hard-pegged (the commitment <em>is</em> the deliverable); others are class-based (any unit will do). Modelling is deciding, material by material, which side of the hinge it sits on.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>When to keep the hard peg</h3>
        <p>Reallocation is not always right. Keep a hard peg when the commitment itself is what you are delivering: <strong>make-to-order</strong> production built for one customer, a <strong>firm allocation</strong> you have already promised, <strong>customer-dedicated WIP</strong>, or regulated material that must stay auditable to a single order. Go class-based for <strong>fungible make-to-stock</strong>, where protecting priority service matters more than which exact unit fills which order.</p>
      </div>
    </div>`;
}
