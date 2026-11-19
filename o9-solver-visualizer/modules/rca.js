import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'A constrained run leaves a demand short. What exactly does RCA give the planner, and what does a single RCA record contain?',
    a: 'When a demand is <strong>not met or is delayed</strong>, SCS performs <strong>Root Cause Analysis</strong> — it "provides visibility on the root causes as to why the demands are not planned on the preferred path." The point is actionability: <em>"If materials are short, they can negotiate better with their suppliers. If capacity is short, then they can see if some processes need to be outsourced."</em> Each RCA record names the binding constraint and its size. The material example writes these columns: <strong>Constraint Item, Constraint Loc, Activity, Problem Type, Constraint bucket, DemandID, Demand Due, Demand Item, Demand Loc, RCA Qty</strong> (for a capacity record the first two columns become a single <strong>Constraint Resource</strong>). The <strong>Problem Type</strong> is the root cause (e.g. <code>MaterialShort</code>, <code>CapacityShort</code>), the <strong>RCA Qty</strong> is how much was short/late, and the <strong>Constraint bucket</strong> is where the constraint actually bit. Shortness and lateness themselves are written to the Delivery Plan measures — <strong>Total Short Quantity</strong>, <strong>Total Late Quantity</strong>, <strong>Weighted Late Quantity</strong> (Σ late qty × buckets-from-current) — and the committed/available bucket to the <strong>Commit Date</strong> measure.',
    tip: 'Lead with "RCA = WHICH constraint bound this demand, and by how much." Then name the record columns: Problem Type + Constraint bucket + RCA Qty, pegged to the DemandID.' },
  { q: 'What is the difference between a Material Short and a Capacity Short problem type, and how does the reported quantity differ for CapacityShort vs RegularCapacityShort?',
    a: 'RCA groups problem types into three broad constraints: <strong>Material</strong>, <strong>Capacity</strong> and <strong>Storage</strong>. A <strong>Material Constraint</strong> ("problems caused due to Material") covers <code>MaterialShort</code>, <code>LeadTimePlanBeforeCurrent</code>, <code>FrozenPeriod</code>, <code>Effectiveness</code>, <code>NoBuild</code>, <code>Holiday</code> and others — <em>"the actual material shortages at most upstream nodes are reported as MaterialShort."</em> A <strong>Capacity Constraint</strong> ("problems caused due to Capacity or Resource") takes <code>CapacityShort</code>, <code>RegularCapacityShort</code> or <code>ARCConstraint</code>. The reported quantity differs: for <strong>CapacityShort</strong> "only the regular capacity band is defined as available capacity"; for <strong>RegularCapacityShort</strong> the demand is short "<em>after utilizing regular and overtime capacity bands</em>", and the constraint "is reported in terms of the units of Regular Capacity at JIT time bucket required to build the order on time." <code>ARCConstraint</code> is reported "just for visibility" when Alternate Resource Consolidation forces a delay — adding capacity would not help.',
    tip: 'Material = short at the upstream material node (can be carried over); Capacity = the resource is full (expires per bucket). RegularCapacityShort means even overtime bands were exhausted, and the qty is expressed as Regular capacity needed at JIT.' },
  { q: 'Walk through the RCA "flavors" (Pegging, Additive, OBO, Cascading, WIP, SS) and where RCA sits in the solver execution order. Why does OBO/Additive RCA exist at all when there is already Pegging RCA?',
    a: 'SCS supports several RCA variants: <strong>Pegging-Based Constraint Report</strong>, <strong>Additive RCA</strong>, <strong>OBO RCA</strong>, <strong>Cascading RCA</strong>, <strong>WIP RCA</strong> and <strong>SS RCA</strong>. They differ in how they release supply and report: <strong>Additive</strong> "unplans demands / releases all supplies at once" and gives <em>aggregate</em> constraints for a <em>set</em> of short/late demands (avoiding double-counting), whereas <strong>OBO</strong> ("one-by-one") "unplans demands / releases supplies one by one." <strong>Cascading</strong> extends OBO to report not just at the JIT bucket but at JIT+1, JIT+2 … up to a limit. Pegging RCA has a real limitation — <em>"if it finds a suitable pegging, it doesn\'t report RCA"</em> — so a short/late demand can end up with <em>no</em> RCA; "this is one of the reasons why OBO RCA originated," and OBO "theoretically supersedes the traditional pegging based OBO RCA." In the solver order (per Debug), RCA runs late: <strong>WIP planning &amp; WIP RCA</strong> (step 4) → Demand Planning → SS Planning → <strong>OBO RCA</strong> (step 14) → Peggings → <strong>Additive Demand RCA</strong> (17) → <strong>SS RCA</strong> (18) → RCA Peggings → <strong>Zero-qty Additive RCA</strong> (20). All RCAs honour the Objective Rank List — <em>"If ORL is {Late, Band} then RCA will also report accordingly, opening up bands prior to lateness."</em>',
    tip: 'Key insight: Pegging RCA can miss a root cause when it finds any valid pegging — OBO/Additive re-plan unconstrained to always surface a cause. Additive = aggregate/additive for a set; OBO = one-by-one; Cascading = OBO across JIT+n buckets.' },
];

// ── RCA model (grounded in the SCS_Output wiki worked examples) ──────────────
// A demand is traced up its supply path to find the BINDING constraint.
// Nodes upstream→downstream: RM (material) → Mfg+Resource (activity) → FG (material) → Demand.
const NODES = [
  { id: 'rm',  kind: 'material', title: 'RM @ Plant',  sub: 'upstream material node' },
  { id: 'mfg', kind: 'activity', title: 'Mfg',          sub: 'activity + Resource' },
  { id: 'fg',  kind: 'material', title: 'FG @ Plant',  sub: 'material node' },
  { id: 'dem', kind: 'demand',   title: 'D1 · FG @ DC', sub: 'demand node' },
];
// Trace order: start at the demand, walk upstream.
const PATH = [3, 2, 1, 0];

// Each scenario is a wiki worked example. `bind` = node index that is the root cause (null = none).
const SCEN = {
  'on-time': {
    name: 'On time · fully met JIT',
    bind: null,
    demandDue: 'W5', jit: 'W5',
    story: 'OnHand of RM covers the whole demand, so it is built Just-In-Time and delivered in full. No shortage, no lateness — so SCS writes no RCA record.',
    met: 90, short: 0, late: 0, qty: 90,
    problemType: '—', constraintBucket: '—', available: 'W5 (JIT) · full',
    verdict: { color: '#10B981', title: '✓ Met On Time · no RCA', body: 'The demand is satisfied in the JIT bucket in full. Nothing is short or late, so there is nothing for RCA to report.' },
  },
  'material-short': {
    name: 'Material Short · upstream RM out',
    bind: 0,
    demandDue: 'W5', jit: 'W5',
    story: 'Current bucket W1, OnHand for RM @ Plant = 70, demand D1 for FG @ DC = 90 on W5. Partial satisfaction of 70 units; short by 20. The actual material shortage is reported at the most upstream node.',
    met: 70, short: 20, late: 0, qty: 20,
    problemType: 'MaterialShort', constraintBucket: 'W3', available: '70 @ W5 · 20 short (no date)',
    verdict: { color: '#EF4444', title: '✗ MaterialShort @ RM / Plant', body: 'RCA record: Constraint Item <b>RM</b>, Loc <b>Plant</b>, Activity <b>ER Activity</b>, Problem Type <b>MaterialShort</b>, Constraint bucket <b>W3</b>, DemandID <b>D1</b> (due W5), <b>RCA Qty 20</b>. Fix: negotiate more RM with the supplier.' },
  },
  'capacity-short': {
    name: 'Capacity Short · resource full',
    bind: 1,
    demandDue: 'W20', jit: 'W19',
    story: 'Demand D1 for FG @ DC = 100 on W20, BAL=1, BLL=1, Res = 25/week. Mfg builds 25 each on JIT (W19) and JIT-1 (W18) = 50 JIT; 25 late on W20; 25 short because the resource runs out. Only the Regular capacity band is treated as available.',
    met: 50, short: 25, late: 25, qty: 50,
    problemType: 'CapacityShort', constraintBucket: 'W18', available: '50 @ W19 · 25 late @ W20 · 25 short',
    verdict: { color: '#EF4444', title: '✗ CapacityShort @ Resource', body: 'RCA record: Constraint Resource <b>Res</b>, Activity <b>Mfg</b>, Problem Type <b>CapacityShort</b>, Constraint bucket <b>W18</b>, DemandID <b>D1</b> (due W20), <b>RCA Qty 50</b>. Fix: add capacity or outsource the process.' },
  },
  'late': {
    name: 'Late · built past JIT',
    bind: 1,
    demandDue: 'W20', jit: 'W19',
    story: 'The resource cannot fit the whole demand on the JIT bucket, so part is built late (within the build-late limit). The Delivery Plan records a Total Late Quantity and a Commit Date — the committed/available bucket is the last late bucket.',
    met: 50, short: 0, late: 50, qty: 50,
    problemType: 'CapacityShort', constraintBucket: 'W18', available: '50 @ W19 (JIT) · 50 late @ W20',
    verdict: { color: '#F59E0B', title: '▶ Built late · Commit date = W20', body: 'The binding resource forces part of D1 past JIT. Total Late Quantity = 50; Weighted Late = Σ(late qty × buckets-from-current); the Commit Date measure reports the committed bucket (<b>W20</b>) as the suggested available date for the late part.' },
  },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Outputs & Diagnostics',
    title: 'Root Cause Analysis',
    subtitle: 'When a constrained plan leaves a demand short or late, SCS traces the demand up its supply path to find the binding constraint and writes an RCA record: a Problem Type (the root cause — material short vs capacity short), the constraint bucket, the short/late quantity, and the committed/available date. Pick a case, press Run, and watch the trace light up the root cause.',
    tabs: [
      { id: 'trace',  label: '🔎 Trace the Root Cause' },
      { id: 'record', label: '🗂️ What an RCA record contains', content: recordTab() },
      { id: 'kinds',  label: '🧩 RCA kinds', content: kindsTab() },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildTrace(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the root-cause trace animation ────────────────────────────────────
function buildTrace(container) {
  const tab = container.querySelector('#tab-trace');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One demand (<b style="color:#A78BFA">D1 · FG @ DC</b>) and its supply path. On <b>Run</b> the solver walks <b>upstream</b> from the demand, node by node, until it hits the <b>binding constraint</b> — a <b style="color:#38BDF8">material node</b> that cannot supply (<b style="color:#EF4444">MaterialShort</b>) or a <b style="color:#F59E0B">resource</b> that is full (<b style="color:#EF4444">CapacityShort</b>). That node lights red and SCS emits an RCA record. Pick a case, then <b>Run</b> or <b>Step</b>.</div>
      <canvas id="rca-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="rca-run">▶ Run (trace)</button>
        <button class="ctrl-btn" id="rca-step">⏭ Step</button>
        <button class="ctrl-btn" id="rca-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Case:</span>
        <button class="ctrl-btn" data-scen="on-time">On time</button>
        <button class="ctrl-btn" data-scen="material-short">Material Short</button>
        <button class="ctrl-btn" data-scen="capacity-short">Capacity Short</button>
        <button class="ctrl-btn" data-scen="late">Late</button>
      </div>
      <div id="rca-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>RCA answers one question for every short or late demand: <strong>which constraint bound it?</strong> The solver traces the demand up its primary supply path. A <strong>material node</strong> can carry stock over between buckets, so if it is empty the shortage is a <strong>MaterialShort</strong> (reported "at the most upstream node"). A <strong>resource</strong> expires at the end of its bucket, so if it is full the shortage is a <strong>CapacityShort</strong> — and when "only the regular capacity band is defined as available capacity" the RCA quantity is the Regular capacity needed at the JIT bucket. The node where the trace stops is the <strong>root cause</strong>; everything downstream of it merely passed the shortage along.</p>
      <p>Each case here is a worked example from the wiki. The ledger shows the resulting RCA record — <strong>Problem Type</strong>, <strong>short / late quantity</strong> and the <strong>suggested available (Commit) date</strong> — plus what the planner can do about it. An <strong>On time</strong> demand produces <em>no</em> record: RCA only writes for demands that are short or late.</p>
    </div>`;

  const canvas = tab.querySelector('#rca-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const W = canvas.width, H = canvas.height;
  const ROW_Y = 150;
  const BOX_W = 128, BOX_H = 60;
  const xs = [108, 318, 528, 700];   // centers for rm, mfg, fg, dem
  const cx = (i) => xs[i];
  const boxL = (i) => cx(i) - BOX_W / 2;
  const boxT = ROW_Y - BOX_H / 2;

  let scen = 'material-short';
  let running = false;
  let cursor = 0;          // how many PATH nodes examined (0 = none yet)
  let probe = 0;           // animated float position along PATH (0..PATH.length-1)
  let finished = false;

  function S() { return SCEN[scen]; }
  function bindPos() {
    const b = S().bind;
    return b === null ? PATH.length - 1 : PATH.indexOf(b);
  }

  function setLedger(cards) {
    tab.querySelector('#rca-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function baseCard() {
    const s = S();
    return { color: '#64748B', title: s.name, body: `${s.story} <br><b>Demand due</b> ${s.demandDue} · <b>JIT bucket</b> ${s.jit}. Press <b>Run</b> or <b>Step</b> to trace.` };
  }

  function reset() {
    running = false; finished = false; cursor = 0; probe = 0;
    setLedger([baseCard()]);
  }

  function run() { if (finished) reset(); running = true; }

  function step() {
    if (finished) return;
    running = false;
    if (cursor < bindPos()) { cursor++; probe = cursor; }
    if (cursor >= bindPos()) finish();
    else setLedger([baseCard(), traceCard()]);
  }

  function traceCard() {
    const reached = PATH[cursor];
    const n = NODES[reached];
    return { color: '#38BDF8', title: `Tracing upstream… at ${n.title}`, body: `Supply is not available here for the full demand — the shortage is passed further upstream. Checked ${cursor} of ${bindPos()} hops.` };
  }

  function finish() {
    finished = true; running = false; cursor = bindPos(); probe = bindPos();
    const s = S();
    const cards = [baseCard()];
    const qtyBits = [];
    if (s.met) qtyBits.push(`<b style="color:#10B981">met ${s.met}</b>`);
    if (s.late) qtyBits.push(`<b style="color:#F59E0B">late ${s.late}</b>`);
    if (s.short) qtyBits.push(`<b style="color:#EF4444">short ${s.short}</b>`);
    cards.push(s.verdict);
    cards.push({ color: '#A78BFA', title: 'RCA record', body:
      `<b>Problem Type:</b> ${s.problemType} · <b>Constraint bucket:</b> ${s.constraintBucket} · <b>RCA Qty:</b> ${s.qty}<br>` +
      `<b>Delivery:</b> ${qtyBits.join(' · ') || '—'}<br>` +
      `<b>Suggested available (Commit) date:</b> ${s.available}` });
    setLedger(cards);
  }

  // node drawing ──────────────────────────────────────────────────────────────
  function nodeState(i) {
    // returns 'idle' | 'checking' | 'traced' | 'cause' | 'ok' | 'demand'
    if (i === 3) return 'demand';
    const posInPath = PATH.indexOf(i);
    const bp = bindPos();
    const isBind = S().bind === i;
    if (!finished) {
      if (posInPath < cursor) return 'traced';
      if (posInPath === cursor && cursor > 0) return 'checking';
      return 'idle';
    }
    // finished
    if (isBind) return 'cause';
    if (posInPath < bp) return 'traced';
    if (S().bind === null && i === 0) return 'ok'; // on-time: upstream supply ok
    return 'idle';
  }

  function stateStyle(st) {
    switch (st) {
      case 'demand':   return { fill: '#1b1740', stroke: '#A78BFA', text: '#C4B5FD' };
      case 'checking': return { fill: '#0c2033', stroke: '#38BDF8', text: '#7DD3FC' };
      case 'traced':   return { fill: '#111a2e', stroke: '#334155', text: '#94a3b8' };
      case 'cause':    return { fill: '#2a0f16', stroke: '#EF4444', text: '#FCA5A5' };
      case 'ok':       return { fill: '#0e241c', stroke: '#10B981', text: '#6EE7B7' };
      default:         return { fill: '#0d1424', stroke: '#1E293B', text: '#64748B' };
    }
  }

  function drawNode(i, t) {
    const st = nodeState(i);
    const sty = stateStyle(st);
    const x = boxL(i), y = boxT;
    const pulse = (st === 'checking') ? 1 + 0.03 * Math.sin(t * 6) : 1;
    const pw = BOX_W * pulse, ph = BOX_H * pulse;
    const px = cx(i) - pw / 2, py = ROW_Y - ph / 2;

    // glow for active / cause
    if (st === 'checking' || st === 'cause' || st === 'ok') {
      const g = ctx.createRadialGradient(cx(i), ROW_Y, 8, cx(i), ROW_Y, 80);
      g.addColorStop(0, sty.stroke + '44');
      g.addColorStop(1, sty.stroke + '00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx(i), ROW_Y, 80, 0, Math.PI * 2); ctx.fill();
    }

    drawRoundRect(ctx, px, py, pw, ph, 8, sty.fill, sty.stroke);

    // title + sub
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = sty.text;
    ctx.fillText(NODES[i].title, cx(i), ROW_Y - 4);
    ctx.font = '9px system-ui';
    ctx.fillStyle = st === 'idle' ? '#475569' : '#8aa0b8';
    ctx.fillText(NODES[i].sub, cx(i), ROW_Y + 10);

    // resource sub-chip under Mfg
    if (i === 1) {
      const rW = 86, rH = 20, rx = cx(i) - rW / 2, ry = ROW_Y + BOX_H / 2 + 10;
      const resBind = (S().bind === 1);
      const resCol = finished && resBind ? '#EF4444' : (st === 'checking' ? '#F59E0B' : '#64748B');
      drawRoundRect(ctx, rx, ry, rW, rH, 5, '#140f05', resCol);
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = resCol;
      ctx.fillText('Res · 25/wk', cx(i), ry + 13);
      drawArrow(ctx, cx(i), ry, cx(i), ROW_Y + BOX_H / 2 + 2, resCol, 1.2);
    }

    // onhand chip under RM
    if (i === 0) {
      ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B'; ctx.textAlign = 'center';
      ctx.fillText('OnHand 70', cx(i), ROW_Y + BOX_H / 2 + 20);
    }

    // problem-type badge on the cause node
    if (st === 'cause') {
      const label = S().problemType;
      ctx.font = 'bold 10px system-ui';
      const tw = ctx.measureText(label).width;
      const bw = tw + 16, bx = cx(i) - bw / 2, by = py - 26;
      drawRoundRect(ctx, bx, by, bw, 18, 9, '#EF4444', '#EF4444');
      ctx.fillStyle = '#fff'; ctx.fillText(label, cx(i), by + 13);
    }
    if (st === 'ok') {
      ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#10B981';
      ctx.fillText('✓ supply available', cx(i), py - 12);
    }
  }

  let raf = null, t0 = performance.now();
  function draw(now) {
    const t = (now - t0) / 1000;
    // advance probe toward cursor target while running
    if (running && !finished) {
      const target = bindPos();
      probe += 0.045;
      const reached = Math.floor(probe + 0.0001);
      if (reached > cursor) { cursor = Math.min(reached, target); }
      if (probe >= target) { probe = target; finish(); }
      else setLedger([baseCard(), traceCard()]);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // title row
    ctx.textAlign = 'left'; ctx.font = '11px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('upstream', 24, 40);
    ctx.textAlign = 'right'; ctx.fillText('downstream', W - 24, 40);
    ctx.textAlign = 'center'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#94a3b8';
    ctx.fillText('RCA traces the demand UP its supply path to the binding constraint', W / 2, 40);

    // path edges (material flows downstream: left → right)
    for (let k = 0; k < NODES.length - 1; k++) {
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx(k) + BOX_W / 2, ROW_Y); ctx.lineTo(cx(k + 1) - BOX_W / 2, ROW_Y); ctx.stroke();
      // small supply-direction arrowhead
      drawArrow(ctx, cx(k + 1) - BOX_W / 2 - 14, ROW_Y, cx(k + 1) - BOX_W / 2 - 2, ROW_Y, '#334155', 1.2);
    }

    // nodes
    for (let i = 0; i < NODES.length; i++) drawNode(i, t);

    // the trace probe (travels right→left, demand→upstream)
    if ((running || finished || cursor > 0) && !(finished && S().bind === null)) {
      const seg = Math.min(probe, bindPos());
      const a = PATH[Math.floor(seg)];
      const bIdx = Math.min(Math.floor(seg) + 1, PATH[PATH.length - 1] !== undefined ? PATH.length - 1 : 0);
      const frac = seg - Math.floor(seg);
      const xA = cx(PATH[Math.floor(seg)]);
      const xB = cx(PATH[Math.min(Math.floor(seg) + 1, PATH.length - 1)]);
      const px = xA + (xB - xA) * frac;
      const col = finished ? (S().bind === null ? '#10B981' : '#EF4444') : '#38BDF8';
      ctx.beginPath(); ctx.arc(px, ROW_Y, 6 + 2 * Math.sin(t * 8), 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = '#fff6'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = col; ctx.textAlign = 'center';
      ctx.fillText('trace', px, ROW_Y - 18);
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#38BDF8'; ctx.fillText('● tracing', 24, H - 18);
    ctx.fillStyle = '#EF4444'; ctx.fillText('■ root cause', 100, H - 18);
    ctx.fillStyle = '#10B981'; ctx.fillText('■ supply ok', 196, H - 18);
    ctx.fillStyle = '#334155'; ctx.fillText('■ shortage passes through', 290, H - 18);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scen = b.dataset.scen; reset(); }));
  tab.querySelector('#rca-run').addEventListener('click', run);
  tab.querySelector('#rca-step').addEventListener('click', step);
  tab.querySelector('#rca-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: what an RCA record contains ───────────────────────────────────────
function recordTab() {
  const cols = [
    ['Constraint Item / Loc', 'The upstream <strong>material node</strong> (item + location) where the shortage is. For a capacity record this single column becomes <strong>Constraint Resource</strong> instead.'],
    ['Activity', 'The activity at the constraint (e.g. <code>Mfg</code>, <code>ER Activity</code>).'],
    ['Problem Type', 'The <strong>root cause</strong> — the heart of the record. <code>MaterialShort</code>, <code>CapacityShort</code>, <code>RegularCapacityShort</code>, <code>LeadTimePlanBeforeCurrent</code>, <code>Effectiveness</code>, <code>NoBuild</code>, <code>StorageConstraint</code>, <code>CycleInSupplyChain</code> …'],
    ['Constraint bucket', 'The bucket where the constraint actually bit (e.g. a build-ahead bucket), which can differ from the JIT bucket.'],
    ['DemandID · Demand Due', 'The demand the record is pegged to, and its requested (due) bucket.'],
    ['Demand Item / Loc', 'The downstream item + location of the demand (e.g. FG @ DC).'],
    ['RCA Qty', 'How much of the demand this constraint is responsible for (short or late units).'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">An RCA record, column by column</div><div class="section-desc">For every short or late demand, SCS writes a row naming the binding constraint. These are the columns from the wiki's Material and Capacity worked examples.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Column</th><th>What it holds</th></tr></thead>
          <tbody>${cols.map(([c, d]) => `<tr><td style="font-weight:600;color:var(--text)">${c}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">The three outputs the planner reads</div><div class="section-desc">Problem Type, short/late quantity and the committed (available) date together tell the planner what is wrong, by how much, and when the demand can be met.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Problem Type (root cause)</div><div class="info-card-body">Which constraint bound the demand. <strong>Material</strong> constraints (shortage carries over between buckets) vs <strong>Capacity</strong> constraints (a resource that expires each bucket) vs <strong>Storage</strong> (only in the lotsized case). This is what the planner acts on: short material → negotiate with the supplier; short capacity → outsource the process.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Short / late quantity</div><div class="info-card-body">Written to the Delivery Plan measures: <strong>Total Short Quantity</strong> (units not satisfied), <strong>Total Late Quantity</strong> (units built late, if not met in JIT), and <strong>Weighted Late Quantity</strong> = Σ(late qty × buckets-from-current). Example: 10 units late by 1 bucket + 1 unit late by 2 = 10·1 + 1·2 = 12.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Suggested available (Commit) date</div><div class="info-card-body">The <strong>Commit Date</strong> measure — "the bucket on which the demand is committed." Its value is the <strong>last late bucket</strong>, the <strong>Target bucket</strong>, or the max of the two (if a target is defined). <strong>Total MetOnTime Quantity</strong> is what is "satisfied in the JIT Bucket." A fully-short part has no available date.</div></div>
      </div>

      <div class="canvas-explainer"><h3>Material vs Capacity — why they differ</h3>
        <p>A <strong>material node</strong> can carry stock from one bucket to the next, so a shortage is reported "<em>at the most upstream node</em>" as <code>MaterialShort</code> — add material there and the demand plans. A <strong>resource</strong> expires at the end of its bucket. For <code>CapacityShort</code>, "<em>only the regular capacity band is defined as available capacity</em>"; for <code>RegularCapacityShort</code> the demand is still short "<em>after utilizing regular and overtime capacity bands</em>," and the quantity "<em>is reported in terms of the units of Regular Capacity at JIT time bucket required to build the order on time</em>." <code>ARCConstraint</code> is reported "<em>just for visibility</em>" — adding capacity would not help, because Alternate Resource Consolidation is what forced the delay.</p>
      </div>
    </div>`;
}

// ── Tab 3: RCA kinds + JIT Constraint Bucket ─────────────────────────────────
function kindsTab() {
  const kinds = [
    ['Stand-Alone RCA', '#38BDF8', 'An <strong>independent RCA pass with no actual planning</strong>. It "assumes the flow plan data in the model," identifies the short/late demands and runs only the RCA pass to export constraints. Needed when the plan came from the <strong>LPS</strong> solver, or to generate RCA after an <strong>incremental plan</strong> without re-running the batch. Triggered by setting <strong>Plan Type = EXPORT_ONLY</strong>; by default it considers all short/late demands, or a chosen subset via <em>Plan For Export RCA</em>.'],
    ['Combined Material &amp; Capacity RCA', '#A78BFA', 'Planners "<em>like to look at RCAs in a single report rather than two different grids</em>." This exports both Material and Capacity RCA in <strong>one graph</strong> (a union of their From/To nodes), avoiding a separate post-solver merge. Because a resource cannot appear in the material graph, a user-defined reserved member (e.g. "Not Applicable") fills the null node. Supported for OBO, Additive, Cascade, SS and WIP RCA.'],
    ['Actionable RCA', '#F59E0B', 'Makes RCA more actionable than "JIT bucket, primary path only." Three features: <strong>Exclude Demands from RCA</strong> (<em>Disable RCA Demand</em> flag — keep a known-late demand out of the pass so its supply is not reallocated); <strong>RCA for part of a demand late by x buckets</strong> (<em>RCA Fence</em> — deliveries within JIT+fence count as on time); and <strong>RCA Ask by Date</strong> (<em>RCA Due Date Offset</em> — shift the due date to get past Lead-Time constraints and see the real material/capacity need).'],
    ['Enhanced RCA', '#10B981', 'Lifts RCA off the JIT-bucket-and-primary-path restriction. A <strong>pre-process</strong> to the Additive RCA pass in two parts: <strong>Part A — WIP Sweep</strong> pulls leftover material down from upstream along <em>any</em> alternate (within a WIP Sweep depth), exploring build-ahead capacity; <strong>Part B — Cost Analysis</strong> traverses upstream at JIT and picks the minimum-cost alternate to add capacity/material (default cost 1/unit). It also works with soft constraints.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The kinds of RCA</div><div class="section-desc">Beyond the flavors (Pegging, Additive, OBO, Cascading, WIP, SS), the wiki documents four capabilities that shape how and when RCA is produced.</div></div>
      <div class="info-grid">
        ${kinds.map(([t, c, d]) => `<div class="info-card" style="border-left:3px solid ${c}"><div class="info-card-title">${t}</div><div class="info-card-body">${d}</div></div>`).join('')}
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">JIT Constraint Bucket (for all RCA)</div><div class="section-desc">Which bucket the constraint is reported against.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Why it exists</div><div class="info-card-body">RCA is reported "<strong>in the JIT bucket along the primary path</strong>." But <strong>profile-based</strong> reporting means a constraint is logged "<em>as late as possible in the plan horizon where the material is really not available</em>," so the RCA bucket can land <em>after</em> the JIT bucket — "this creates confusion while analyzing the RCA output."</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">The enhancement</div><div class="info-card-body">The solver was enhanced to also report the <strong>JIT constraint bucket</strong> in the RCA output, to "help in RCA plan explanation." It is enabled for <strong>all RCA types — Additive, OBO, Cascade, WIP and SS</strong> — via dedicated JIT Constraint Time Bucket edge properties on each RCA graph.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">RCA flavors at a glance</div><div class="section-desc">How the variants release supply and report.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Flavor</th><th>How it releases supply / reports</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Pegging-Based</td><td style="color:var(--text2)">Reports from the pegging. Limitation: "if it finds a suitable pegging, it doesn't report RCA" — so a short/late demand can end up with no cause. This is why OBO RCA originated.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Additive RCA</td><td style="color:var(--text2)">Aggregate constraints for a <strong>set</strong> of short/late demands. Unplans demands / releases <strong>all supplies at once</strong>; allocates leftover to shorted demands in priority order to preserve additivity (avoid double counting).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">OBO RCA</td><td style="color:var(--text2)">Releases supplies <strong>one by one</strong>. Does an unconstrained RCA pass for short + late, exports and clears memory; "theoretically supersedes the traditional pegging based OBO RCA."</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Cascading RCA</td><td style="color:var(--text2)">Extends OBO: reports not only at JIT but at <strong>JIT+1, JIT+2 … up to a limit</strong>. For a 100-unit demand with BLL=5: if short, results at JIT…JIT+5. Profile-based.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">WIP RCA / SS RCA</td><td style="color:var(--text2)">RCA for WIP planning (short/delayed/artificial WIP supplies) and for Safety Stock not met in certain buckets. Both run in the solver's RCA phases.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="prose"><p>In the solver's execution order (per Debug), RCA runs late: <strong>WIP planning &amp; WIP RCA</strong> (step 4) → Demand Planning → Safety Stock Planning → <strong>OBO RCA &amp; Replan</strong> (step 14) → Peggings → <strong>Additive Demand RCA &amp; exports</strong> (17) → <strong>SS RCA &amp; exports</strong> (18) → RCA Peggings → <strong>Zero-qty Additive RCA</strong> (20). All RCAs honour the <strong>Objective Rank List</strong>: "If ORL is {Late, Band} then RCA will also report accordingly, opening up bands prior to lateness."</p></div>
    </div>`;
}
