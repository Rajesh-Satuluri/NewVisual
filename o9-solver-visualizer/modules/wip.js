import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow, EventPacket } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Where does WIP sit in the solver’s planning order by default, and what flips it?',
    a: 'By default <strong>WIP is planned before demand</strong>. In the WIP algorithm the whole network is loaded, then <em>all WIP data (from all three measures) is planned by consuming material from upstream</em>, and only then are <em>demands loaded and planned taking the planned WIP into account</em>. Planned WIP is respected with the <strong>highest priority, before the solver solves for demand or safety stock</strong>. The flip is the parameter <strong>WIP Interleaves With Demand</strong> (Boolean, default <strong>False</strong>): set it True and WIP and demand interleave via a <em>homogeneous priority</em> (the demand priority measure and the WIP priority measure together), so <strong>demand can be planned ahead of WIP</strong>. Ties: same priority → earlier due bucket first; same priority <em>and</em> bucket → WIP first.',
    tip: 'Say it in order: load network → plan WIP from upstream → plan demand around the WIP. "WIP Interleaves With Demand = True" is the one switch that lets demand jump ahead.' },
  { q: 'What does “Respect Freeze Window For WIPs” do?',
    a: 'Planners freeze certain plans in a bucket so that <strong>no additional plans are created in that time bucket</strong>. When <strong>Respect Freeze Window For WIPs</strong> is set to true in the config, the solver honours it: it <strong>will not produce any flows in the frozen time periods</strong> to satisfy the specified WIP. The flag therefore affects the <strong>upstream planning for the WIP (at the WIP consuming node)</strong> — the WIP itself is still honoured, but the solver cannot lay down new production flows inside the frozen buckets to supply it.',
    tip: 'Key nuance: it constrains the WIP’s upstream flows, not the WIP demand itself — nothing new is produced inside the frozen periods.' },
  { q: 'Upstream is short for a WIP — what are the WIP Infeasibility Resolution types, and how do WIP BAL / WIP BLL help first?',
    a: 'WIP is a hard constraint. In the <strong>Constrained WIP Plan Phase</strong> the solver first tries to plan the WIP on JIT; if <strong>WIP BAL</strong> is defined (default <strong>0</strong>) it can <em>pre-build</em> earlier, and if <strong>WIP BLL</strong> is defined (default <strong>0</strong>) it can <em>delay/split</em> the WIP into later buckets. If it still cannot source enough, the <strong>Override WIP Plan Phase</strong> applies the WIP Infeasibility Resolution type: <strong>OVERRIDE</strong> (default) creates artificial / “magical” supply (an ER stamped with a solver lotid, e.g. SCSo9LOT) at the WIP activity’s immediate consuming material node and may <strong>overload capacity</strong> so the WIP is fully planned; <strong>SHORT</strong> creates no artificial supply, so the WIP (or part of it) is shorted.',
    tip: 'Default is OVERRIDE = WIP always fully planned (magical supply + capacity overload). SHORT = honest shortage, no magic. BAL/BLL are tried before either.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'WIP — Work In Progress',
    subtitle: 'WIP is plans that are already released, committed or firmed and must be honoured — in-transit POs, distribution orders, and production orders on the shop floor. By default the solver plans WIP first, from upstream, and then plans demand around it. Watch the planning order, and flip the interleave switch to let demand jump ahead.',
    tabs: [
      { id: 'flow', label: '🏭 WIP on the Line' },
      { id: 'what', label: '📋 What WIP Is', content: whatTab() },
      { id: 'more', label: '🔀 Interleave, Bands & Holidays', content: moreTab() },
      { id: 'iq',   label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── timeline / item model ─────────────────────────────────────────────────────
const DAYS = 12, CURRENT = 1;
const FREEZE_FROM = 1, FREEZE_TO = 2;   // frozen buckets near current

// WIP (indigo) is Planned WIP; demands (blue) have their own priority.
function baseItems() {
  return [
    { id: 'wip1',  type: 'wip',    label: 'WIP_1',   due: 5, prio: 2, qty: 100, color: '#6366F1' },
    { id: 'ord2',  type: 'demand', label: 'Order_2', due: 3, prio: 1, qty: 100, color: '#38BDF8' },
    { id: 'ord1',  type: 'demand', label: 'Order_1', due: 8, prio: 3, qty: 100, color: '#38BDF8' },
  ];
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A <b style="color:#6366F1">Planned WIP</b> (committed production already on the line) is due in <b>W5</b>; two customer <b style="color:#38BDF8">demands</b> sit around it. An <b style="color:#F59E0B">amber freeze window</b> covers W${FREEZE_FROM}–W${FREEZE_TO} near the current bucket. The small badge on each chip is its <b>planning order</b>. Press <b>Run Solver</b> to plan them one at a time — then toggle <b>WIP Interleaves With Demand</b> and watch the order change.</div>
      <canvas id="wip-canvas" width="820" height="300" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="wip-run">▶ Run Solver</button>
        <button class="ctrl-btn" id="wip-interleave">🔀 WIP Interleaves With Demand: OFF</button>
        <button class="ctrl-btn" id="wip-reset">↺ Reset</button>
        <span class="ctrl-label" id="wip-status">Default: WIP is planned first, then demand.</span>
      </div>
      <div id="wip-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The WIP algorithm loads the whole network, then <strong>plans all WIP first by consuming material from upstream</strong>, and only then <strong>loads and plans the demands, taking the planned WIP into account</strong>. So in the default run the order is <strong>WIP → demands</strong> (demands ordered among themselves by priority). That is why a WIP can eat the upstream supply a firm order was counting on.</p>
      <p>Flip <strong>WIP Interleaves With Demand</strong> to True and the solver treats WIP priority and demand priority as one <strong>homogeneous</strong> sort, so <strong>demand can be planned ahead of WIP</strong>. Here <em>Order_2 (priority 1) → WIP_1 (priority 2) → Order_1 (priority 3)</em> — Order_2 now grabs raw material before the WIP does. The <strong>amber freeze window</strong> is where <em>Respect Freeze Window For WIPs</em> forbids new production flows: the solver honours the WIP but will not lay down supply flows inside those frozen buckets.</p>
    </div>`;

  const canvas = tab.querySelector('#wip-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const gx = 70, gw = 690, cellW = gw / DAYS, gy = 190, cellH = 40;
  const UP = { x: 16, y: 150, w: 92, h: 48 };          // upstream material/capacity box
  const CHIP_Y = 86, CHIP_H = 46, CHIP_W = 118;

  let items = baseItems();
  let interleave = false;
  let queue = [];            // ordered ids
  let planned = new Set();
  let active = null;         // id currently planning
  let packet = null;         // EventPacket in flight
  let running = false;
  let stepTimer = null;

  function bucketX(d) { return gx + (d - 1) * cellW; }
  function bucketCX(d) { return bucketX(d) + cellW / 2; }

  function byOrder(a, b) {
    if (!interleave) {
      // WIP block first, then demands; each block by priority then earlier due
      const rank = (it) => (it.type === 'wip' ? 0 : 1);
      return rank(a) - rank(b) || a.prio - b.prio || a.due - b.due;
    }
    // homogeneous: priority, then earlier due, then WIP-before-demand
    return a.prio - b.prio || a.due - b.due || (a.type === 'wip' ? -1 : 1);
  }
  function computeQueue() { queue = [...items].sort(byOrder).map(i => i.id); }
  function orderOf(id) { return queue.indexOf(id) + 1; }

  function setLedger(cards) {
    tab.querySelector('#wip-ledger').innerHTML = cards.map(c =>
      `<div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`
    ).join('');
  }
  function modeCard() {
    return interleave
      ? { color: '#38BDF8', title: 'WIP Interleaves With Demand = True', body: 'Homogeneous priority sort across WIP and demand. Planning order: <b>' + queue.map(id => items.find(i => i.id === id).label).join(' → ') + '</b>. Demand can be planned ahead of WIP.' }
      : { color: '#6366F1', title: 'Default — WIP first', body: 'WIP is planned before demand. Planning order: <b>' + queue.map(id => items.find(i => i.id === id).label).join(' → ') + '</b>. Demands then plan around the committed WIP.' };
  }

  function reset() {
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    running = false; active = null; packet = null; planned = new Set();
    computeQueue();
    setLedger([modeCard()]);
    tab.querySelector('#wip-status').textContent = interleave
      ? 'Interleave ON: demand can be planned ahead of WIP.'
      : 'Default: WIP is planned first, then demand.';
  }

  function run() {
    if (running) return;
    computeQueue();
    planned = new Set(); active = null; packet = null; running = true;
    let i = 0;
    const cards = [modeCard()];
    const planNext = () => {
      if (i >= queue.length) {
        running = false; active = null; packet = null;
        tab.querySelector('#wip-status').textContent = 'Done — all WIP and demand planned in order.';
        return;
      }
      const it = items.find(x => x.id === queue[i]);
      active = it.id;
      tab.querySelector('#wip-status').textContent = `Planning ${it.label} (${it.type === 'wip' ? 'WIP' : 'demand'}, priority ${it.prio}, due W${it.due})…`;
      // a flow pill travels from upstream material/capacity into the item's due bucket
      packet = new EventPacket({
        label: it.type === 'wip' ? 'WIP flow' : 'supply',
        color: it.color,
        path: [{ x: UP.x + UP.w, y: UP.y + UP.h / 2 }, { x: bucketCX(it.due), y: UP.y + UP.h / 2 }, { x: bucketCX(it.due), y: gy + cellH / 2 }],
        speed: 2.4,
        onArrive: () => {
          planned.add(it.id);
          packet = null;
          const frozen = it.type === 'wip' && it.due <= FREEZE_TO;
          cards.push(it.type === 'wip'
            ? { color: it.color, title: `✓ ${it.label} planned (WIP)`, body: `Consumed material from upstream into its due bucket W${it.due}. If upstream is short, OVERRIDE would add magical supply / overload capacity; SHORT would short it.${frozen ? ' Freeze window: no new flows allowed inside W' + FREEZE_FROM + '–W' + FREEZE_TO + '.' : ''}` }
            : { color: it.color, title: `✓ ${it.label} planned (demand)`, body: interleave ? `Planned in homogeneous priority order — took upstream supply ${orderOf('wip1') > orderOf(it.id) ? 'ahead of' : 'after'} the WIP.` : `Planned around the already-committed WIP.` });
          setLedger(cards);
          i++;
          stepTimer = setTimeout(planNext, 420);
        },
      });
    };
    setLedger(cards);
    planNext();
  }

  function toggleInterleave() {
    interleave = !interleave;
    tab.querySelector('#wip-interleave').textContent = '🔀 WIP Interleaves With Demand: ' + (interleave ? 'ON' : 'OFF');
    reset();
  }

  // ── draw loop ──
  let raf = null, last = 0;
  function draw(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // freeze window band
    ctx.fillStyle = '#F59E0B14';
    ctx.fillRect(bucketX(FREEZE_FROM), CHIP_Y - 10, cellW * (FREEZE_TO - FREEZE_FROM + 1), gy + cellH - (CHIP_Y - 10) + 4);
    ctx.strokeStyle = '#F59E0B55'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.strokeRect(bucketX(FREEZE_FROM) + 0.5, CHIP_Y - 10, cellW * (FREEZE_TO - FREEZE_FROM + 1), gy + cellH - (CHIP_Y - 10) + 4);
    ctx.setLineDash([]);
    ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('FREEZE WINDOW', bucketX(FREEZE_FROM) + cellW * (FREEZE_TO - FREEZE_FROM + 1) / 2, CHIP_Y - 16);
    ctx.font = '8px system-ui'; ctx.fillStyle = '#92712b';
    ctx.fillText('Respect Freeze Window For WIPs', bucketX(FREEZE_FROM) + cellW * (FREEZE_TO - FREEZE_FROM + 1) / 2, gy + cellH + 30);

    // upstream box
    drawRoundRect(ctx, UP.x, UP.y, UP.w, UP.h, 8, '#111827', '#64748B99');
    ctx.fillStyle = '#CBD5E1'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Upstream', UP.x + UP.w / 2, UP.y + 20);
    ctx.font = '8px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('material / capacity', UP.x + UP.w / 2, UP.y + 34);

    // timeline buckets
    for (let d = 1; d <= DAYS; d++) {
      const x = bucketX(d);
      const filledBy = [...planned].map(id => items.find(i => i.id === id)).find(i => i.due === d);
      let fill = '#0d1424', stroke = '#1E293B';
      if (filledBy) { fill = '#10381f'; stroke = '#10B98188'; }
      else if (d < CURRENT) { fill = '#0b0f1c'; stroke = '#15202e'; }
      drawRoundRect(ctx, x + 2, gy, cellW - 4, cellH, 5, fill, stroke);
      ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('W' + d, x + cellW / 2, gy + cellH + 14);
      if (filledBy) {
        ctx.fillStyle = '#10B981'; ctx.font = 'bold 9px system-ui';
        ctx.fillText(filledBy.label, x + cellW / 2, gy + cellH / 2 + 3);
      }
    }

    // current marker
    const cxl = bucketX(CURRENT) + cellW / 2;
    ctx.strokeStyle = '#64748B'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cxl, gy - 6); ctx.lineTo(cxl, gy + cellH + 2); ctx.stroke(); ctx.setLineDash([]);

    // item chips above timeline, numbered by planning order
    items.forEach(it => {
      const bx = bucketCX(it.due), cx = Math.min(Math.max(bx, gx + CHIP_W / 2), gx + gw - CHIP_W / 2);
      const x = cx - CHIP_W / 2, isActive = active === it.id, isDone = planned.has(it.id);
      const border = isDone ? '#10B981' : it.color;
      const bg = isActive ? it.color + '22' : (isDone ? '#10381f' : '#140f24');
      drawRoundRect(ctx, x, CHIP_Y, CHIP_W, CHIP_H, 8, bg, border);
      ctx.textAlign = 'left';
      ctx.fillStyle = border; ctx.font = 'bold 11px system-ui';
      ctx.fillText(it.label, x + 30, CHIP_Y + 18);
      ctx.fillStyle = '#8A98AE'; ctx.font = '8px system-ui';
      ctx.fillText((it.type === 'wip' ? 'Planned WIP' : 'Demand'), x + 30, CHIP_Y + 30);
      ctx.fillText('prio ' + it.prio + ' · W' + it.due + ' · qty ' + it.qty, x + 30, CHIP_Y + 40);
      // order badge
      ctx.beginPath(); ctx.arc(x + 15, CHIP_Y + CHIP_H / 2, 11, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? '#10B981' : border; ctx.fill();
      ctx.fillStyle = '#0A0E1A'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(String(orderOf(it.id)), x + 15, CHIP_Y + CHIP_H / 2 + 4);
      // connector down to its bucket
      ctx.strokeStyle = border + (isActive || isDone ? 'cc' : '55'); ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx, CHIP_Y + CHIP_H); ctx.lineTo(bx, gy); ctx.stroke(); ctx.setLineDash([]);
    });

    // active supply arrow + packet
    if (active) {
      const it = items.find(i => i.id === active);
      drawArrow(ctx, UP.x + UP.w, UP.y + UP.h / 2, bucketCX(it.due) - 4, UP.y + UP.h / 2, it.color + '88', 1.5);
    }
    if (packet) { packet.update(dt); packet.draw(ctx); }

    // legend
    ctx.textAlign = 'left'; ctx.font = '9px system-ui';
    ctx.fillStyle = '#6366F1'; ctx.fillText('■ Planned WIP', gx, 34);
    ctx.fillStyle = '#38BDF8'; ctx.fillText('■ Demand', gx + 100, 34);
    ctx.fillStyle = '#10B981'; ctx.fillText('■ planned', gx + 185, 34);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('■ freeze window', gx + 265, 34);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText('badge = planning order', gx + 380, 34);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#wip-run').addEventListener('click', run);
  tab.querySelector('#wip-interleave').addEventListener('click', toggleInterleave);
  tab.querySelector('#wip-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); if (stepTimer) clearTimeout(stepTimer); };
}

// ── Tab 2: What WIP is + planned-before-demand + freeze window ─────────────────
function whatTab() {
  const stages = [
    ['Network load', 'The whole supply-chain network is loaded to the solver.', '#64748B'],
    ['Plan WIP from upstream', 'All WIP data (from all three measures) is planned by consuming material from upstream. If it can’t get material upstream, it is allocated to planner override producing into that buffer.', '#6366F1'],
    ['Plan demand', 'All demands are loaded and planned taking the planned WIP into account.', '#38BDF8'],
    ['Respect Freeze Window', 'If “Respect Freeze Window For WIPs” is true, the solver will not produce any flows in the frozen time periods to satisfy the WIP — it affects the upstream planning for the WIP at the WIP consuming node.', '#F59E0B'],
  ];
  const phases = [
    ['Capacity Reservation Phase', 'Optional — turned on by <code>[Preallocate Capacity For WIP]</code>. Go by priority and reserve capacity at the immediate level for all WIPs (JIT buckets only for movable WIPs); do not overload capacities here.'],
    ['Constrained WIP Plan Phase', 'WIP is planned on JIT. <strong>WIP BAL</strong> (default <strong>0</strong>) lets it pre-build earlier; <strong>WIP BLL</strong> (default <strong>0</strong>) lets it delay / split into future buckets.'],
    ['Override WIP Plan Phase', 'WIP Infeasibility Resolution. <strong>OVERRIDE</strong> (default): create artificial / magical supply (ER stamped with a solver lotid, e.g. SCSo9LOT) at the immediate consuming node and overload capacity if constrained — WIP fully planned. <strong>SHORT</strong>: no artificial supply, WIP shorted.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">What WIP is</div><div class="section-desc">Work In Progress denotes plans that are already released / committed / firmed and should be honoured — usually near term, where the plan must support execution realities: in-transit purchase orders, distribution orders, and production orders on the shop floor.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">A planner override, honoured first</div><div class="info-card-body">Planned WIP is passed as a measure to any of the graphs and the solver respects it with the <strong>highest priority, before it solves for demand or safety stock</strong>. Its flows appear in the solver output.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Two types of WIP</div><div class="info-card-body"><strong>Planned WIP</strong> — solved as part of the infeasibilities run, producing flows along the chain. <strong>Locked WIP</strong> — locks production in that bucket and allows no further production there, consuming material and capacity from upstream.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Three WIP measures</div><div class="info-card-body">Material <strong>Production</strong> Planned WIP, Material <strong>Consumption</strong> Planned WIP, and <strong>Capacity Consumption</strong> Planned WIP (each with a Locked variant). The material quantity is pre-yield — the solver applies yield on the specified qty.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Created even if not effective</div><div class="info-card-body">The WIP gets created even if the concerned activity is not effective. So if you see a flow plan where the activity is not effective, check whether it is a WIP.</div></div>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">WIP is planned before demand</div><div class="section-desc">The solver algorithm in the presence of Planned WIP, in order.</div></div>
      <div class="info-grid">
        ${stages.map(([t, b, c], i) => `<div class="info-card" style="border-left:3px solid ${c}"><div class="info-card-title">${i + 1}. ${t}</div><div class="info-card-body">${b}</div></div>`).join('')}
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">The WIP planning stages</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Stage</th><th>What happens</th></tr></thead>
          <tbody>${phases.map(([p, d]) => `<tr><td style="font-weight:600;color:var(--text);white-space:nowrap">${p}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><h3>The freeze window, precisely</h3>
        <p>Planners freeze certain plans in a bucket so that <strong>no additional plans are created in that time bucket</strong> — e.g. after reviewing the plan they allocate supply from a DC to a store and lock it so the next solver run adheres to the input. When <strong>Respect Freeze Window For WIPs</strong> is true, the solver will not produce any flows in the frozen periods to satisfy the WIP; the flag affects the <strong>upstream planning for the WIP at the WIP consuming node</strong>.</p>
      </div>
    </div>`;
}

// ── Tab 3: interleave with demand / capacity bands / holiday / lotsize ─────────
function moreTab() {
  const bands = [
    ['REGULAR', 'Only Base capacity is used during the constrained phase of WIP planning. <em>Default.</em>'],
    ['REGULAR, BAND1', 'Base and Band1 capacities are used during the constrained phase of WIP planning.'],
    ['REGULAR, BAND1, BAND2', 'Base, Band1 and Band2 capacities are used.'],
    ['REGULAR, BAND1, BAND2, HIGHER_BANDS', 'Base, Band1, Band2 and the overtime bands Band3–Band5 are used.'],
  ];
  const holiday = [
    ['True', 'Does not matter', 'WIPs are <strong>not</strong> created in an activity holiday bucket.'],
    ['False', 'True', 'WIP <strong>is</strong> created on the activity holiday bucket.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">WIP Interleaves With Demand</div><div class="section-desc">By default WIPs are processed first, which in a constrained scenario lets them consume upstream supplies that firm customer orders needed. This parameter lets demand plan ahead of WIP.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Parameter</th><th>Values</th><th>Where</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">WIP Interleaves With Demand</td><td><code>Boolean</code> — <strong>False</strong> (default); <strong>True</strong> = WIP and demand can interleave, so demand can be planned ahead of WIP.</td><td>Parameters tab of SCS Config UI · dynamic: <code>([WIP Interleaves With Demand], "True")</code></td></tr>
          </tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:14px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Homogeneous priority</div><div class="info-card-body">When ON, the <strong>WIP priority</strong> and <strong>demand priority</strong> measures are treated as one sort. The implementer must populate homogeneous priorities across WIPs and demands.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Tie-breaking</div><div class="info-card-body">Same priority → the earlier <strong>due bucket</strong> is planned first. Same priority <em>and</em> due bucket between a WIP and a demand → the <strong>WIP</strong> is planned first.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">WIP rules still apply</div><div class="info-card-body">WIP BAL/BLL and the infeasibility resolution type (OVERRIDE/SHORT) work as-is — only the <strong>order</strong> of planning changes. The capacity reservation phase is turned off for WIPs planned interleaving with demand. Not supported for Concurrent Planning.</div></div>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">WIP Planning Using Flex Capacity — WIP Capacity Bands</div><div class="section-desc">Lets the constrained phase of WIP planning open up overtime bands, the same way demand planning does. Precedence between bands and lateness is governed by the Objective Rank List (e.g. [Late, Band] vs [Band, Late]).</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>WIP Capacity Bands</th><th>Meaning</th></tr></thead>
          <tbody>${bands.map(([v, m]) => `<tr><td style="font-weight:700;color:var(--accent)"><code>${v}</code></td><td>${m}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">Allow WIP with Activity Holiday Bucket</div><div class="section-desc">Firmed orders written back from legacy systems may land on a holiday the legacy system did not know about. Controlled by <code>Respect Activity Holiday For WIPs</code> (passed dynamically).</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Respect Activity Holiday For WIPs</th><th>Expedite WIP</th><th>Output</th></tr></thead>
          <tbody>${holiday.map(([a, e, o]) => `<tr><td style="font-weight:600;color:var(--text)">${a}</td><td>${e}</td><td style="color:var(--text2)">${o}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="canvas-explainer"><h3>WIP ignores lotsize — unless you tell it not to</h3>
        <p>WIP acts as a planner override and <strong>does not honour planning constructs like lot-size by default</strong>. The parameter <strong>Respect lot size in WIP</strong> (Boolean, Activity Node grain) instructs the solver to round the WIP plan up to the activity’s lotsize min / multiple — e.g. WIP = 75 with lotsize min 50 and multiple 10 is planned as <strong>80</strong>. Under SHORT infeasibility resolution, respecting lotsize can also short the WIP.</p>
      </div>
    </div>`;
}
