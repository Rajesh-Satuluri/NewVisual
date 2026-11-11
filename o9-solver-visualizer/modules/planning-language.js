import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';
import { gloss } from '../components/glossary-tooltip.js';

export const IQ = [
  { q: 'What is a "net requirement", and how is it computed from demand and inventory?',
    a: 'The <strong>net requirement</strong> is the quantity the solver must actually <em>create or source</em> after using what it already has. The formula is <code>net requirement = max(0, demand − on-hand + safety stock)</code>. If a demand of 100 meets 30 units of <strong>on-hand</strong> stock and no safety stock, the net requirement is 70 — only that 70 triggers new supply. The <code>max(0, …)</code> matters: if on-hand already covers the demand, the net requirement is zero and the solver creates nothing.',
    tip: 'Say the formula verbatim — max(0, demand − on-hand + safety stock) — then give the 100/30 → 70 example. The max(0,…) is the detail interviewers listen for.' },
  { q: 'What does "lead-time offset" mean, and why does the solver plan <em>backward</em> from the due date?',
    a: 'The <strong>lead-time offset</strong> is the act of stepping <em>backward</em> over working days from the demand’s due date by the total lead time, to find the date production or an order must <strong>start</strong>. The solver plans backward — customer → distribution → plant → supplier — precisely so that the supply <em>arrives</em> Just-In-Time on the due date: you work out when it’s needed, then subtract the time it takes, repeatedly up the chain. Planning forward from today couldn’t guarantee the arrival date; planning backward from the due date, with lead-time offsets at each hop, does.',
    tip: 'Backward pass = start from the due date and subtract lead time at each hop up the chain, so arrival is JIT. "Offset" = stepping back over working days.' },
  { q: 'In one line each: what are a BOM, a routing, and pegging?',
    a: 'A <strong>BOM (Bill of Materials)</strong> is the <em>recipe</em> — which components, and how many, go into one unit of a parent item. A <strong>routing</strong> is the <em>process</em> — the ordered operations, and the resources they use, needed to build the item. <strong>Pegging</strong> is the <em>audit trail</em> — the traceable link from a demand back to the exact supply (and the material and capacity) that was used to fill it. BOM = what it’s made of; routing = how it’s made; pegging = proof of which supply met which demand.',
    tip: 'Three nouns, three roles: BOM = recipe (what), routing = process (how), pegging = trace (which supply → which demand).' },
];

// ── the vocabulary tour ──────────────────────────────────────────────────────
const NODES = [
  { id: 'cust',  x: 36,  label: 'Customer',  sub: 'the demand',    color: '#A78BFA' },
  { id: 'dc',    x: 232, label: 'DC',        sub: 'on-hand stock', color: '#38BDF8' },
  { id: 'plant', x: 448, label: 'Plant',     sub: 'BOM · routing', color: '#6366F1' },
  { id: 'sup',   x: 648, label: 'Supplier',  sub: 'components',    color: '#F59E0B' },
];
const NW = 118, NH = 56, NY = 118;
const cx = (n) => n.x + NW / 2, cyMid = NY + NH / 2;

const STEPS = [
  { key: 'demand',  node: 'cust',  color: '#A78BFA', title: 'Demand',
    body: `A <b>demand</b> is the order the plan must satisfy — here <b>100 units</b> due in <b>W6</b>. Everything downstream exists only to meet it.` },
  { key: 'net',     node: 'dc',    color: '#38BDF8', title: 'On-hand → Net requirement',
    body: `The DC already holds <b>30</b> units of <b>on-hand</b> stock. So the <b>net requirement</b> — what must still be created — is <code>max(0, 100 − 30) = 70</code>. Only that 70 triggers new supply.` },
  { key: 'lead',    edge: ['dc', 'plant'], color: '#A78BFA', title: 'Lead-time offset',
    body: `Nothing is instant. The <b>lead-time offset</b> steps <b>backward</b> over working days from the due date to the <b>start date</b>. This is why the solver plans backward up the chain — so supply <em>arrives</em> Just-In-Time.` },
  { key: 'bom',     node: 'plant', color: '#6366F1', title: 'BOM & Routing',
    body: `At the plant, the <b>BOM</b> (bill of materials) is the <em>recipe</em> — which components go into the item — and the <b>routing</b> is the <em>process</em> — the operations and resources to build it.` },
  { key: 'pegging', edge: ['sup', 'cust'], color: '#10B981', title: 'Supply & Pegging',
    body: `The supplier provides components; the plant builds; the DC ships. The new <b>supply</b> flows down to the customer — and <b>pegging</b> records the traceable link from that supply back to the demand it filled.` },
  { key: 'bucket',  underlay: true, color: '#F59E0B', title: 'Time-phased buckets',
    body: `All of it lives on a bucketed calendar. A <b>bucket</b> is one planning period (day / week / month); placing demand and supply into buckets is what "<b>time-phased</b>" means.` },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · Start Here',
    title: 'The Language of Planning',
    subtitle: 'Every later module uses the same handful of words — demand, on-hand, net requirement, lead time, BOM, routing, pegging, buckets. Here they are all taught once, in order, on a single order pulled from customer to supplier. Step through the tour; then hover any dotted term anywhere in the tool to recall its meaning.',
    tabs: [
      { id: 'anatomy', label: '🫀 Anatomy of a Plan' },
      { id: 'vocab',   label: '📖 Core Vocabulary', content: vocabTab() },
      { id: 'heur',    label: '⚖️ Heuristic vs Optimizer', content: heurTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildAnatomy(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the stepped vocabulary tour ───────────────────────────────────────
function buildAnatomy(container) {
  const tab = container.querySelector('#tab-anatomy');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One order, four stops: <b style="color:#A78BFA">Customer</b> → <b style="color:#38BDF8">DC</b> → <b style="color:#6366F1">Plant</b> → <b style="color:#F59E0B">Supplier</b>. Step through the terms — each lights up where it lives in the plan.</div>
      <canvas id="lang-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="lang-prev">◀ Prev term</button>
        <button class="ctrl-btn" id="lang-next">Next term ▶</button>
        <button class="ctrl-btn" id="lang-reset">↺ Restart</button>
        <span class="ctrl-label" id="lang-count"></span>
      </div>
      <div id="lang-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you’re learning</h3>
      <p>This is the whole shape of a plan in miniature. A <strong>demand</strong> is netted against <strong>on-hand</strong> stock to get a <strong>net requirement</strong>; the <strong>lead-time offset</strong> turns a due date into a start date; the <strong>BOM</strong> and <strong>routing</strong> say what to make and how; the resulting <strong>supply</strong> is <strong>pegged</strong> back to the demand — all laid out on time-phased <strong>buckets</strong>. Learn these eight words and every later module reads like plain English.</p>
    </div>`;

  const canvas = tab.querySelector('#lang-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));
  let step = 0, t = 0;

  function render() {
    const s = STEPS[step];
    tab.querySelector('#lang-count').textContent = `Term ${step + 1} / ${STEPS.length}`;
    tab.querySelector('#lang-ledger').innerHTML = `
      <div class="info-card" style="border-left:3px solid ${s.color}">
        <div class="info-card-title">${step + 1}. ${s.title}</div>
        <div class="info-card-body">${s.body}</div>
      </div>
      <div class="info-card" style="border-left:3px solid #64748B">
        <div class="info-card-title">Progress</div>
        <div class="info-card-body">${STEPS.map((x, i) => `<span style="color:${i <= step ? x.color : '#334155'};font-size:16px">●</span>`).join(' ')}<br><span style="color:#94a3b8">Use <b>Next term ▶</b> to walk the full vocabulary.</span></div>
      </div>`;
  }

  let raf = null;
  function draw() {
    t += 0.05;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const s = STEPS[step];

    // time-phased bucket underlay (emphasised on the buckets step)
    const bucketOn = !!s.underlay;
    const bands = 8, bw = (canvas.width - 70) / bands;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = bucketOn ? (i % 2 ? '#F59E0B14' : '#F59E0B0a') : '#0d1424';
      ctx.fillRect(35 + i * bw, 210, bw - 3, 56);
      ctx.fillStyle = bucketOn ? '#F59E0B' : '#334155'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('W' + (i + 1), 35 + i * bw + bw / 2, 283);
    }
    if (bucketOn) { ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('time-phased buckets →', 35, 202); }

    // edges
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i], b = NODES[i + 1];
      const active = s.edge && ((s.edge[0] === a.id && s.edge[1] === b.id) || (s.edge[0] === b.id && s.edge[1] === a.id));
      drawArrow(ctx, b.x, cyMid, a.x + NW, cyMid, active ? s.color : '#334155', active ? 2.4 : 1.3);
    }
    // a backward-spanning arc for the pegging step (supplier → customer)
    if (s.edge && ((s.edge[0] === 'sup' && s.edge[1] === 'cust'))) {
      ctx.strokeStyle = s.color + 'cc'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(cx(nodeById.sup), NY - 10);
      ctx.bezierCurveTo(cx(nodeById.sup), 40, cx(nodeById.cust), 40, cx(nodeById.cust), NY - 10);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = s.color; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('pegging: supply ↔ demand', (cx(nodeById.sup) + cx(nodeById.cust)) / 2, 36);
      // moving packet along the chain
      const prog = (Math.sin(t) + 1) / 2;
      const px = cx(nodeById.sup) + (cx(nodeById.cust) - cx(nodeById.sup)) * prog;
      ctx.beginPath(); ctx.arc(px, cyMid, 5, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill();
    }

    // nodes
    for (const n of NODES) {
      const active = s.node === n.id;
      if (active) {
        const r = 6 + Math.sin(t * 2) * 3;
        drawRoundRect(ctx, n.x - r, NY - r, NW + 2 * r, NH + 2 * r, 12, n.color + '22', n.color + '66');
      }
      drawRoundRect(ctx, n.x, NY, NW, NH, 9, active ? n.color + '2a' : '#111827', active ? n.color : '#334155');
      ctx.fillStyle = active ? '#fff' : '#CBD5E1'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(n.label, cx(n), NY + 24);
      ctx.fillStyle = active ? n.color : '#64748B'; ctx.font = '10px system-ui';
      ctx.fillText(n.sub, cx(n), NY + 42);
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  const go = (d) => { step = (step + d + STEPS.length) % STEPS.length; render(); };
  tab.querySelector('#lang-next').addEventListener('click', () => go(1));
  tab.querySelector('#lang-prev').addEventListener('click', () => go(-1));
  tab.querySelector('#lang-reset').addEventListener('click', () => { step = 0; render(); });
  render();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the core vocabulary table ─────────────────────────────────────────
function vocabTab() {
  const rows = [
    ['Demand',          'A customer order or forecast the plan must satisfy — a quantity by a due date.'],
    ['Supply',          'Anything that meets demand: on-hand stock, in-transit / WIP, or new production / purchases.'],
    ['On-hand (BOH/EOH)', 'Inventory already at a location — beginning-on-hand and ending-on-hand, bucket by bucket.'],
    ['Net requirement', '<code>max(0, demand − on-hand + safety stock)</code> — what must still be created.'],
    ['Lead time',       'The time to make, move, or buy — so supply must start before the due date.'],
    ['Lead-time offset', 'Stepping backward over working days from the due date to find the start date.'],
    ['BOM',             'Bill of Materials — the recipe: which components (and how many) make one parent unit.'],
    ['Routing',         'The ordered operations (and resources) required to build an item.'],
    ['Pegging',         'The traceable link from a demand back to the exact supply that filled it.'],
    ['Bucket',          'One time period (day / week / month) that demand and supply are placed into.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The core vocabulary</div><div class="section-desc">Ten words that the rest of the tool is built from. The same definitions appear as hover tooltips on dotted terms throughout the modules.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Term</th><th>What it means</th></tr></thead>
          <tbody>${rows.map(([t, d]) => `<tr><td style="font-weight:600;color:var(--text);white-space:nowrap">${t}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><h3>The one formula to memorize</h3>
        <p><code>net requirement = max(0, demand − on-hand + safety stock)</code>. This single line is where a plan starts: it decides whether a demand needs <em>any</em> new supply at all, and if so, how much. Everything else — lead-time offset, BOM explosion, pegging — is about <em>how</em> to create that net requirement.</p>
      </div>
    </div>`;
}

// ── Tab 3: heuristic vs optimizer ────────────────────────────────────────────
function heurTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Heuristic vs Optimizer — in plain language</div><div class="section-desc">The next module calls the solver "a heuristic, not an LP/MIP optimizer." Here is what that sentence actually means, with no jargon assumed.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th></th><th>${gloss('heuristic', 'Heuristic')} (what the SCS is)</th><th>${gloss('lp-mip', 'Optimizer (LP / MIP)')}</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">How it decides</td><td>Follows smart rules, one demand at a time, in priority order.</td><td>Searches mathematically for the single best answer across all choices at once.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Answer it gives</td><td>A <strong>good, feasible</strong> plan — fast.</td><td>A <strong>provably optimal</strong> plan — often slowly.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">Explainability</td><td>Every decision traces to a rule and a priority → easy to explain.</td><td>The optimum can be hard to explain in business terms.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">At supply-chain scale</td><td>Handles huge networks on a schedule, repeatably.</td><td>Can become intractable as the problem grows.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Why heuristic wins here</div><div class="info-card-body">Planners re-run plans constantly and must <em>trust and explain</em> the result. A fast, rule-based, repeatable engine that pegs and root-causes every decision beats a slower black-box optimum.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">The key consequence</div><div class="info-card-body">Because the SCS plans <strong>sequentially</strong> (order-by-order), the <strong>order</strong> in which demands are planned effectively <em>is</em> the objective. That is why demand sorting and the ${gloss('orl', 'Objective Rank List')} matter so much later.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Where it runs</div><div class="info-card-body">Inside the ${gloss('graphcube', 'GraphCube')} server as a plugin — reading demand, inventory, the network and constraints directly, and writing back a time-phased supply plan.</div></div>
      </div>
      <div class="canvas-explainer"><h3>You’re ready for the solver now</h3>
        <p>You know <em>why</em> planning is hard (lead time, capacity, priority) and you speak the <em>language</em> (demand, net requirement, BOM, routing, pegging, buckets, heuristic). The next module, <strong>What is the Solver</strong>, puts them together and shows the engine running end to end.</p>
      </div>
    </div>`;
}
