import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What exactly is a "demand" in SCS, and what is the demand node composed of?',
    a: 'A demand is a <strong>demand signal incident on a material node</strong> — supply planning triggers <em>only</em> on receipt of demand. The demand node is a composite grain: <code>Order.[Order Name]</code> × <code>Time.[Fiscal Week]</code> × <code>Customer.[Customer Name]</code> (optional) × the <strong>material node</strong> (<code>Item.[Item]</code> × <code>Location.[Location]</code>) × <code>Version.[Version Name]</code>. Every demand attribute is a <strong>measure</strong> configured in the <strong>Demand tab of the SCS UI Config</strong> — e.g. quantity via <code>Demand Qty Measure Name</code>, priority via <code>Demand Layer Measure</code>, fair-share via <code>Demand Priority Measure</code>.',
    tip: 'Say "a demand is incident on a material node, and the demand node is Order × Time × Customer × (Item × Location) × Version" — that composite grain is the Demand Node Components.' },
  { q: 'Walk through the attributes the solver reads off a single demand, and the role each one plays.',
    a: 'Two distinct roles. <strong>Sequencing (the OBO queue):</strong> the solver is order-by-order, so it sorts every demand by <strong>Demand Priority</strong> (<code>Demand Layer Measure</code>, lower = higher) → <strong>Fair-Share Priority</strong> (<code>Demand Priority Measure</code>) → <strong>Due Date</strong> (ascending) → <strong>Quantity</strong> (<strong>ascending</strong> — smaller first) → <strong>Key</strong> on the remaining Demand Node Components. <strong>Pegging / sourcing:</strong> <code>RevisedPriority</code> (the <em>Demand Activity Priority</em> measure) overrides the static lane/activity priority <em>for that one order</em>. So the first group decides <em>who is planned first</em>; the revised-priority attribute decides <em>which path that order takes</em>.',
    tip: 'The trap: <code>Demand Priority Measure</code> configures the FAIR-SHARE key, not the primary priority (that is <code>Demand Layer Measure</code>). And Quantity is ascending.' },
  { q: 'What are attribute-based demands (Demand Based Network Selection), and how do they change pegging?',
    a: '<code>RevisedPriority</code> lets a demand <strong>override the static Material Production Graph priority at the demand level</strong> — "all requests source from China, but this order must source from Europe". Values: <strong>n &lt; 0</strong> = that activity is <em>blocked</em> for the order; <strong>NULL</strong> = fall back to the static graph priority; <strong>n ≥ 0</strong> = replace the priority for this order (0 = highest). It is a <em>class-based</em> feature, so it requires <code>Pegging Id Based Pegging = TRUE</code>, <code>Hard Pegging Algorithm = CLASS_BASED</code>, and <code>Class Based MoveIn = TRUE</code>. <strong>Pegging changes:</strong> when a demand carries a revised priority, the solver <strong>plans and pegs that demand before moving to the next</strong>; when revised priority is empty, all demands are planned first and pegging runs afterward.',
    tip: 'The three RevisedPriority values — negative = blocked, NULL = static, ≥0 = override (0 highest) — plus "revised priority makes pegging happen per-demand instead of after the whole plan".' },
];

// ── The attributes a single demand carries, and the role each feeds ──────────
// First five are the OBO sort keys (sequencing); the sixth is the
// pegging/sourcing attribute. Grounded in Demand_with_Attributes wiki.
const ATTRS = [
  { id: 'pri', name: 'Demand Priority',     val: '1',        color: '#6366F1', role: 'sort', seq: 1,
    config: 'Demand Layer Measure',            note: 'Primary sort key — lower number = higher priority. The order-by-order solver picks this demand first.' },
  { id: 'fs',  name: 'Fair-Share Priority', val: '20',       color: '#A78BFA', role: 'sort', seq: 2,
    config: 'Demand Priority Measure',         note: 'Tiebreaker used only when Demand Priority ties. Lower = higher. (Note: configured by "Demand Priority Measure".)' },
  { id: 'due', name: 'Due Date',            val: 'Feb 11',   color: '#38BDF8', role: 'sort', seq: 3,
    config: '(demand due bucket)',             note: 'Ascending — the earlier bucket is planned first, used when fair-share ties.' },
  { id: 'qty', name: 'Quantity',            val: '100',      color: '#10B981', role: 'sort', seq: 4,
    config: 'Demand Qty Measure Name',         note: 'Ascending — the smaller order is planned first, used when due dates tie.' },
  { id: 'key', name: 'Node Key',            val: 'FG·DC·O1', color: '#F59E0B', role: 'sort', seq: 5,
    config: 'Demand Node Components',          note: 'Final key sort over the remaining Demand Node Components, in configured order.' },
  { id: 'rev', name: 'Revised Priority',    val: 'n / −1',   color: '#64748B', role: 'peg',
    config: 'Demand Activity Priority',        note: 'Attribute-based demand: overrides the static lane priority for THIS order (n<0 blocks, 0 highest). Drives sourcing & pegs the demand order-by-order.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Demand with Attributes',
    subtitle: 'A demand is a signal incident on a material node — and the solver reads only on receipt of demand. Each demand carries attributes configured in the Demand tab: some sequence the order-by-order queue, one overrides sourcing per order. Run the reader and watch which attribute feeds which role.',
    tabs: [
      { id: 'anatomy',    label: '🧾 Demand Anatomy' },
      { id: 'attributes', label: '🏷️ Attributes & Roles', content: attributesTab() },
      { id: 'network',    label: '🧩 Node & Attribute Demands', content: networkTab() },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildAnatomy(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: interactive canvas — the demand and its attribute chips ───────────
function buildAnatomy(container) {
  const tab = container.querySelector('#tab-anatomy');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One demand — <b>Order_1</b>, incident on material node <b>FG_1 · DC_1</b> — carrying its attribute <b>chips</b>. Press <b>Run</b> and the solver reads each attribute one at a time, drawing it to the role it feeds: the five <b style="color:#818CF8">sort keys</b> that sequence the order-by-order queue, and the <b style="color:#F59E0B">pegging / sourcing</b> attribute that reroutes this one order.</div>
      <canvas id="dem-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dem-run">▶ Run — read the attributes</button>
        <button class="ctrl-btn" id="dem-step">▶ Read Next</button>
        <button class="ctrl-btn" id="dem-reset">↺ Reset</button>
        <span class="ctrl-label" id="dem-status">Press Run to read Order_1's attributes.</span>
      </div>
    </div>
    <div id="dem-ledger" class="info-grid" style="margin-top:16px"></div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The demand itself is just a signal on a material node; everything that steers it is an <strong>attribute measure</strong> set in the Demand tab. The first five attributes feed one job — <strong>sequencing</strong>. Because the solver is order-by-order, it sorts every demand by <code>Demand Priority</code> → <code>Fair-Share Priority</code> → <code>Due Date</code> → <code>Quantity</code> → <code>Node Key</code>, and that queue order decides who gets scarce supply first.</p>
      <p>The sixth attribute, <strong>Revised Priority</strong>, plays a different role: it is an <em>attribute-based demand</em> that overrides the static lane priority <strong>for this one order</strong> (negative blocks a path, 0 is highest) and drives sourcing and pegging. Same demand, two kinds of attribute: one orders the queue, one reroutes the order.</p>
    </div>`;

  const canvas = tab.querySelector('#dem-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // Geometry
  const order = { x: 26, y: 96, w: 206, h: 176, cx: 129 };
  const chipX = 288, chipW = 206, chipH = 40, chipGap = 8, chipTop = 40;
  const chipY = (i) => chipTop + i * (chipH + chipGap);
  const zoneSort = { x: 556, y: 40,  w: 238, h: 190 };
  const zonePeg  = { x: 556, y: 250, w: 238, h: 96 };

  let revealed = 0;      // number of attributes read
  let auto = false;      // auto-run in progress
  let timer = 0;         // frames since last reveal
  const pulse = new Map(ATTRS.map(a => [a.id, 0]));

  const ledger = tab.querySelector('#dem-ledger');
  const status = tab.querySelector('#dem-status');

  function revealNext() {
    if (revealed >= ATTRS.length) return;
    const a = ATTRS[revealed];
    revealed++;
    pulse.set(a.id, 48);
    // ledger card
    const card = document.createElement('div');
    card.className = 'info-card';
    card.style.borderLeft = `3px solid ${a.color}`;
    const roleLabel = a.role === 'sort'
      ? `Sort key #${a.seq} — sequences the OBO queue`
      : 'Pegging / sourcing — overrides lane priority per order';
    card.innerHTML = `<div class="info-card-title">${a.name} <span style="color:${a.color}">· ${a.val}</span></div>`
      + `<div class="info-card-body"><strong>${roleLabel}.</strong> ${a.note}<br><span style="color:var(--text3)">config:</span> <code>${a.config}</code></div>`;
    ledger.appendChild(card);
    if (revealed >= ATTRS.length) {
      auto = false;
      status.textContent = 'All six attributes read. Five keys sequence the queue; Revised Priority reroutes this order.';
    } else {
      status.textContent = `Read ${a.name} → ${a.role === 'sort' ? 'sort key #' + a.seq : 'pegging / sourcing'}.`;
    }
    tab.querySelector('#dem-step').disabled = revealed >= ATTRS.length;
  }

  function run() { if (revealed >= ATTRS.length) reset(); auto = true; timer = 0; }
  function reset() {
    revealed = 0; auto = false; timer = 0;
    ATTRS.forEach(a => pulse.set(a.id, 0));
    ledger.innerHTML = '';
    status.textContent = 'Press Run to read Order_1’s attributes.';
    tab.querySelector('#dem-step').disabled = false;
  }

  function label(text, x, y, color, font = '10px system-ui', align = 'left') {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
  }

  let raf = null;
  function draw() {
    if (auto) { timer++; if (timer >= 34) { timer = 0; revealNext(); } }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // role zones (drawn first, behind arrows)
    const sortLit = revealed > 0 && ATTRS.slice(0, Math.min(revealed, 5)).length > 0;
    const pegLit = revealed >= ATTRS.length;
    drawRoundRect(ctx, zoneSort.x, zoneSort.y, zoneSort.w, zoneSort.h, 10,
      sortLit ? '#6366F114' : '#0E1322', sortLit ? '#6366F188' : '#1E293B');
    label('SORT  /  SEQUENCING', zoneSort.x + 14, zoneSort.y + 22, '#818CF8', 'bold 11px system-ui');
    label('order-by-order queue position', zoneSort.x + 14, zoneSort.y + 38, '#64748B', '9px system-ui');
    label('Priority → Fair-Share →', zoneSort.x + 14, zoneSort.y + 74, '#8A98AE', '10px system-ui');
    label('Due Date → Qty → Key', zoneSort.x + 14, zoneSort.y + 90, '#8A98AE', '10px system-ui');
    label('(ascending)', zoneSort.x + 14, zoneSort.y + 110, '#475569', '9px system-ui');

    drawRoundRect(ctx, zonePeg.x, zonePeg.y, zonePeg.w, zonePeg.h, 10,
      pegLit ? '#F59E0B14' : '#0E1322', pegLit ? '#F59E0B88' : '#1E293B');
    label('PEGGING  /  SOURCING', zonePeg.x + 14, zonePeg.y + 22, '#F59E0B', 'bold 11px system-ui');
    label('overrides lane priority for', zonePeg.x + 14, zonePeg.y + 40, '#64748B', '9px system-ui');
    label('this one order (n<0 blocks)', zonePeg.x + 14, zonePeg.y + 54, '#64748B', '9px system-ui');

    // the order (demand) node
    drawRoundRect(ctx, order.x, order.y, order.w, order.h, 11, '#111827', '#6366F199');
    label('Order_1', order.cx, order.y + 26, '#E2E8F0', 'bold 15px system-ui', 'center');
    label('demand · incident on material node', order.cx, order.y + 44, '#64748B', '9px system-ui', 'center');
    const nodeLines = ['Order.[Order Name]', 'Time.[Fiscal Week]', 'Customer.[Cust_1]', 'Item.[FG_1] × Loc.[DC_1]', 'Version.[Working]'];
    nodeLines.forEach((t, i) => label(t, order.cx, order.y + 72 + i * 19, '#94A3B8', '10px system-ui', 'center'));
    label('Demand Node Components', order.cx, order.y + order.h - 10, '#475569', 'italic 9px system-ui', 'center');

    // chips + arrows
    ATTRS.forEach((a, i) => {
      const y = chipY(i), on = i < revealed;
      const p = pulse.get(a.id); if (p > 0) pulse.set(a.id, p - 1);
      const glow = p > 0;

      // connector: order node -> chip (static, lights when read)
      ctx.save();
      ctx.globalAlpha = on ? 0.5 : 0.14;
      drawArrow(ctx, order.x + order.w, order.y + order.h / 2, chipX - 4, y + chipH / 2, on ? a.color : '#334155', on ? 1.6 : 1);
      ctx.restore();

      // chip
      const bg = on ? (glow ? a.color + '2A' : '#141a2b') : '#0C1120';
      drawRoundRect(ctx, chipX, y, chipW, chipH, 9, bg, on ? a.color + 'cc' : '#243048');
      label(a.name, chipX + 12, y + 18, on ? '#E2E8F0' : '#475569', on ? 'bold 12px system-ui' : '12px system-ui');
      label(a.role === 'sort' ? `key #${a.seq}` : 'attribute', chipX + 12, y + 32, on ? a.color : '#334155', '9px system-ui');
      label(a.val, chipX + chipW - 12, y + 25, on ? a.color : '#334155', on ? 'bold 12px system-ui' : '11px system-ui', 'right');

      // chip -> role zone (only once read)
      if (on) {
        const target = a.role === 'sort' ? zoneSort : zonePeg;
        const ty = a.role === 'sort'
          ? zoneSort.y + 40 + (a.seq - 1) * 30
          : zonePeg.y + zonePeg.h / 2;
        ctx.save();
        ctx.globalAlpha = glow ? 1 : 0.5;
        drawArrow(ctx, chipX + chipW, y + chipH / 2, target.x - 3, ty, a.color, glow ? 2.6 : 1.4);
        ctx.restore();
      }
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#dem-run').addEventListener('click', run);
  tab.querySelector('#dem-step').addEventListener('click', () => { auto = false; revealNext(); });
  tab.querySelector('#dem-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the demand attributes & what each drives (wiki-grounded) ──────────
function attributesTab() {
  const rows = [
    ['Demand Quantity', 'The requested quantity of finished goods for the demand.', 'Quantity to plan; also the <strong>4th sort key</strong> (ascending).', '<code>Demand Qty Measure Name</code>'],
    ['Demand Priority', 'Planner-set priority of the demand/order. Lower = higher.', '<strong>Primary sort key</strong> — the OBO solver picks demands in this sequence.', '<code>Demand Layer Measure</code>'],
    ['Fair-Share Priority', 'An additional tiebreaker priority. Lower = higher.', '<strong>2nd sort key</strong> — used when Demand Priority ties, to fair-share equal-priority demands.', '<code>Demand Priority Measure</code>'],
    ['Due Date', 'The bucket the demand is due (Time.[Fiscal Week]).', '<strong>3rd sort key</strong> — ascending; earlier bucket planned first.', '— (demand due bucket)'],
    ['Build Ahead Limit', 'Max earlier buckets the order may search for supply before JIT.', 'Bounds how far ahead the solver may pre-build this order.', '<code>Demand Build Ahead Measure Name</code>'],
    ['Revised Priority', 'Per-order override of static lane/activity priority.', '<strong>Pegging / sourcing attribute</strong> — reroutes this order (n&lt;0 blocks, 0 highest).', '<code>Demand Activity Priority</code>'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Demand attributes & what each drives</div>
        <div class="section-desc">Every attribute is a measure configured in the <strong>Demand tab of the SCS UI Config</strong>. Two roles: most <em>sequence</em> the order-by-order queue; Revised Priority <em>reroutes</em> a single order.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Attribute</th><th>What it is</th><th>What it drives</th><th>SCS config property</th></tr></thead>
          <tbody>${rows.map(([a, w, d, c]) => `<tr><td style="font-weight:600;color:var(--text)">${a}</td><td>${w}</td><td style="color:var(--text2)">${d}</td><td>${c}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:24px">
        <div class="section-title">The sequencing order (OBO tiebreakers)</div>
        <div class="section-desc">When the solver sorts demands for planning, it consults each key only when every earlier key ties.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>#</th><th>Key</th><th>Rule</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">1</td><td style="font-weight:600;color:var(--text)">Demand Priority</td><td>Lower = higher. The primary key.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">2</td><td style="font-weight:600;color:var(--text)">Fair-Share Priority</td><td>Lower = higher. Used when Demand Priority ties.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">3</td><td style="font-weight:600;color:var(--text)">Due Date</td><td><strong>Ascending</strong> — earlier bucket first. Used when fair-share ties.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">4</td><td style="font-weight:600;color:var(--text)">Quantity</td><td><strong>Ascending</strong> — smaller order first. Used when due dates tie.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">5</td><td style="font-weight:600;color:var(--text)">Key (Demand Node Components)</td><td>Ascending key on the remaining components (the "Internal Key").</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">⚠️ Naming trap</div><div class="info-card-body"><code>Demand Priority Measure</code> configures the <strong>Fair-Share</strong> key — <em>not</em> the primary Demand Priority, which is <code>Demand Layer Measure</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">⚠️ Quantity is ascending</div><div class="info-card-body">On a tie the <strong>smaller</strong> order is planned first — not the largest.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">🧭 Order-by-order</div><div class="info-card-body">SCS picks up one demand at a time by priority, traverses the network by the rules, and consumes material & capacity along its path before the next demand — so the sort <em>is</em> the allocation.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: Demand Node Components & attribute-based demands (wiki-grounded) ──
function networkTab() {
  const comps = [
    ['Order.[Order Name]', 'Order', 'Mandatory'],
    ['Time.[Fiscal Week]', 'Time', 'Mandatory'],
    ['Customer.[Customer Name]', 'Customer', 'Optional'],
    ['Item.[Item]', 'Item (material node)', 'Mandatory'],
    ['Location.[Location]', 'Location (material node)', 'Mandatory'],
    ['Version.[Version Name]', 'Version', 'Mandatory'],
  ];
  const revised = [
    ['n &lt; 0 (negative)', 'The corresponding activity is <strong>blocked</strong> for this order — the solver will not use that path.'],
    ['NULL', 'Fall back to the <strong>static priority</strong> for the material-node × activity combination in the Material Production Graph.'],
    ['n ≥ 0', 'Replace the activity\'s priority with <code>n</code> for this specific order; <strong>0 is the highest</strong> priority.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">The Demand Node Components</div>
        <div class="section-desc">A demand is incident on a material node. The demand node is a composite grain — the "Demand Node Components" — and supply planning triggers only on receipt of demand.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Component</th><th>Dimension</th><th>Required?</th></tr></thead>
          <tbody>${comps.map(([c, d, r]) => `<tr><td style="color:var(--text)"><code>${c}</code></td><td>${d}</td><td style="color:${r === 'Optional' ? 'var(--text3)' : 'var(--text2)'};font-weight:${r === 'Optional' ? '400' : '600'}">${r}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:24px">
        <div class="section-title">Attribute-based demands — Demand Based Network Selection</div>
        <div class="section-desc">Some orders have a specific source. <code>RevisedPriority</code> (the <em>Demand Activity Priority</em> measure, Activity tab) overrides the static network priorities <strong>at the demand level</strong> — e.g. "most orders source from China, but this one must source from Europe".</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Revised Priority value</th><th>Meaning for this order</th></tr></thead>
          <tbody>${revised.map(([v, m]) => `<tr><td style="font-weight:700;color:var(--accent)"><code>${v}</code></td><td>${m}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Pegging changes per demand</div><div class="info-card-body">When a demand <strong>has</strong> a revised priority, the solver <strong>plans and pegs that demand before moving to the next</strong>. When revised priority is <strong>empty</strong>, all demands are planned first and pegging runs afterward.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Class-based prerequisites</div><div class="info-card-body">It is a class-based feature, so it needs <code>Pegging Id Based Pegging = TRUE</code>, <code>Hard Pegging Algorithm = CLASS_BASED</code>, and <code>Class Based MoveIn = TRUE</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Interacts with proportional sourcing</div><div class="info-card-body">Proportional sourcing now uses the <strong>revised</strong> priorities to compute the split along each activity — watch for demand-supportability changes when combining the two.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px">
        <h3>Demand Activity Label based planning</h3>
        <p>A related attribute pattern: activities are labelled (e.g. <em>Regular</em>, <em>Fast</em>, <em>Super Fast</em>) via a Group ID and a Label Association, and specific demands are mapped to those labels. Only the mapped demands may use the special (expedited) paths; unmapped demands keep the as-is solver behaviour. Un-labelled activities stay open to all demands. It is the same idea as Revised Priority — a <strong>demand attribute that reshapes which network paths an individual order may take</strong>.</p>
      </div>
    </div>`;
}
