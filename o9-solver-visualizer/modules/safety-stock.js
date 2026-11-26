import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Contrast the two Inventory Plan Policy values — TARGET_LEVEL and MIN_MAX — and when each triggers replenishment.',
    a: 'Both bring the ending on-hand of a material node back toward the <strong>safety stock target</strong>, but on different rules. <strong>TARGET_LEVEL</strong> is an order-up-to policy: after demand planning, in every bucket the ending on-hand is brought <em>up to the target level specified</em>. <strong>MIN_MAX</strong> is a reorder-point policy with a separate <strong>Reorder Point (MIN / s)</strong> and <strong>Order-Up-To-Level (MAX / S)</strong>: it only replenishes a bucket when the EOH falls <em>below the reorder point</em>, ordering <code>{S − EOH}</code> to bring it back to S — producing the classic saw-tooth profile. Set via the <strong>Inventory Plan Policy</strong> parameter; MIN_MAX has an Old vs New Behavior switch (<strong>Inventory Plan Policy Min_Max Legacy</strong>), where New Behavior also tops up to target when there is production in a bucket and EOH is above the reorder point.',
    tip: 'Say it crisply: TARGET_LEVEL tops up every bucket to the target; MIN_MAX only fires when EOH drops below the reorder point s, then orders S − EOH.' },
  { q: 'When is safety stock planned relative to regular demand, and how can a planner change that order?',
    a: 'By default safety stock is a <strong>pass after demand</strong>: after demand JIT planning, SCS checks the EOH, the Reorder Point <em>s</em> and the order-up-to-level <em>S</em> in every bucket and triggers replenishment of <code>{S − EOH}</code> — so SS is effectively an extra "demand" met from whatever supply is left once forecasts/orders are covered. A planner can change this with <strong>SS Interleaves With Demand</strong> (Prioritize Safety Stock Over Demands): with it true, <strong>SS Demand Priority</strong> and demand priority are treated as one <em>homogeneous</em> priority, so a high-priority SS at a node can be planned <em>before</em> lower-priority demands. Separately, <strong>Hard Safety Stock (HSS)</strong> is respected during demand planning itself (not a separate pass) with the fulfilment order <strong>HSS → Demands → SSS</strong>.',
    tip: 'Lead with "SS is a pass after demand (after JIT)", then name the two levers that reorder it: SS Interleaves With Demand (homogeneous priority) and HSS (HSS > Demands > SSS).' },
  { q: 'Supply is short of the total SS requirement across several equal-priority nodes. How does the solver share it, and what bounds how far it may build ahead?',
    a: 'Two mechanisms. <strong>SS Priority</strong> orders which nodes get served: lower number = higher priority, Null = least; with no priority set SCS picks nodes <em>downstream to upstream</em>, and ties break on the item/material-node key. <strong>Safety Stock Bands (Fair Share)</strong> — the <strong>Inventory Plan Bands</strong> parameter — splits each standalone SS requirement into that many sub-parts so equal-priority nodes are served round-robin in proportion to their requirements rather than one node fully and the next shorting. <strong>Safety Stock Bands with SS Priority</strong> chooses the interaction: <code>ACROSS_SS_PRIORITY</code> (default) allocates each band across all priorities; <code>WITHIN_SS_PRIORITY</code> solves all bands for one priority level before moving on. How far SS may pre-build is bounded by the <strong>SS Build Ahead Limit</strong> (NULL = back to start of horizon, 0 = none, n = n buckets), which can also be set per material node.',
    tip: 'Three names win this: SS Priority (ordering), Inventory Plan Bands / Safety Stock Bands (fair-share split), SS Build Ahead Limit (how far earlier SS can produce).' },
];

// ── Tab 1 model: TARGET_LEVEL top-up across 8 buckets ───────────────────────
const BUCKETS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08'];
const TARGET = 100;                                        // constant SS target level
const ONHAND = [80, 60, 100, 40, 110, 70, 30, 90];        // projected EOH after regular demand
const SS_SUPPLY = [50, 50, 50, 30, 50, 50, 40, 50];       // supply left for SS top-up per bucket
// Per bucket: gap to target, how much can actually be replenished, and any shortfall.
const PLAN = ONHAND.map((oh, i) => {
  const gap = Math.max(0, TARGET - oh);
  const replen = Math.min(gap, SS_SUPPLY[i]);
  const shortfall = gap - replen;
  return { oh, gap, replen, shortfall, final: oh + replen, above: oh >= TARGET };
});

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Safety Stock Planning',
    subtitle: 'Safety stock is the extra material held to absorb demand and supply uncertainty. The solver plans it as a pass after regular demand — reading each bucket’s ending on-hand and replenishing it toward the safety stock target set by the Inventory Plan Type and Inventory Plan Policy.',
    tabs: [
      { id: 'target', label: '🎯 Target vs On-Hand' },
      { id: 'policy', label: '⚙️ Plan Type & Policy', content: policyTab() },
      { id: 'bands',  label: '⚖️ Bands · Priority · BAL', content: bandsTab() },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: interactive TARGET_LEVEL top-up animation ────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-target');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A material node has a constant safety stock <b>TARGET_LEVEL</b> of <b>${TARGET}</b> units (dashed indigo line). The bars are the <b>projected on-hand after regular demand is met</b>. Press <b>Run safety stock pass</b> — under the <b>TARGET_LEVEL</b> policy the solver tops each bucket up to the target; where leftover supply runs out it falls <b>short</b>.</div>
      <canvas id="ss-canvas" width="820" height="330" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="ss-run">▶ Run safety stock pass</button>
        <button class="ctrl-btn" id="ss-reset">↺ Reset</button>
        <button class="ctrl-btn" id="ss-order">#️⃣ Show "demand after demand" order</button>
      </div>
      <div class="canvas-controls" style="margin-top:6px">
        <span class="ctrl-label" id="ss-status">Press Run to plan safety stock on top of the demand plan.</span>
      </div>
      <div id="ss-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Safety stock planning runs <strong>after demand</strong>. After demand JIT planning, SCS checks each bucket’s <strong>ending on-hand (EOH)</strong> against the safety stock target. Under the <strong>TARGET_LEVEL</strong> policy (Inventory Plan Policy = order-up-to), every bucket is brought <em>up to</em> the target; the top-up is effectively an <strong>extra "demand"</strong> drawn from whatever supply is left once forecasts and orders are covered. A bucket already <strong>at or above target</strong> needs no replenishment (green); a bucket <strong>below target</strong> is replenished (amber fill) toward the line; when the leftover supply for that bucket is exhausted the remainder is a <strong>shortfall</strong> (red).</p>
      <p><strong>Interview angle:</strong> this is TARGET_LEVEL, not MIN_MAX — TARGET_LEVEL tops up every bucket, while MIN_MAX only replenishes when EOH drops below the Reorder Point (MIN) and then orders up to the Order-Up-To-Level (MAX). Toggle the order view to see that SS is planned as a demand <em>after</em> regular demand, in SS-priority order.</p>
    </div>`;

  const canvas = tab.querySelector('#ss-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const gx = 56, gw = 720, n = BUCKETS.length, slot = gw / n, barW = slot * 0.56;
  const baseY = 270, topY = 50, plotH = baseY - topY;
  const maxVal = 140;                       // y-scale ceiling
  const yOf = (v) => baseY - (v / maxVal) * plotH;

  let running = false, startT = 0, done = false, showOrder = false;
  const stepDur = 460;                       // ms per bucket
  const PALETTE = { indigo: '#6366F1', blue: '#38BDF8', green: '#10B981', amber: '#F59E0B', red: '#EF4444', slate: '#64748B' };

  function setStatus(txt) { const s = tab.querySelector('#ss-status'); if (s) s.textContent = txt; }

  function setLedger() {
    const met = PLAN.filter(p => p.final >= TARGET).length;
    const short = PLAN.filter(p => p.shortfall > 0).length;
    const replenished = PLAN.reduce((a, p) => a + (done ? p.replen : 0), 0);
    const shortQty = PLAN.reduce((a, p) => a + (done ? p.shortfall : 0), 0);
    const items = [
      { color: PALETTE.indigo, title: 'TARGET_LEVEL', body: `Order-up-to policy. Target = <b>${TARGET}</b> units, constant across all ${n} buckets.` },
      { color: PALETTE.green, title: done ? 'At / above target' : 'Awaiting run', body: done ? `<b>${met}</b> of ${n} buckets reach the safety stock target after the pass.` : 'Projected on-hand shown as bars; press Run to top up to target.' },
      { color: PALETTE.amber, title: 'Replenished to target', body: done ? `<b>${replenished}</b> units added as safety-stock "demand" after regular demand.` : 'Top-up amount is the gap (Target − EOH) per bucket.' },
      { color: PALETTE.red, title: 'Shortfall', body: done ? (short ? `<b>${short}</b> bucket(s) short <b>${shortQty}</b> units — leftover supply ran out before the target.` : 'None — every target met.') : 'Where leftover supply can’t reach the target.' },
    ];
    tab.querySelector('#ss-ledger').innerHTML = items.map(r => `
      <div class="info-card" style="border-left:3px solid ${r.color}"><div class="info-card-title">${r.title}</div><div class="info-card-body">${r.body}</div></div>`).join('');
  }

  function run() {
    running = true; done = false; startT = performance.now();
    setStatus('Planning safety stock bucket by bucket — topping each up to the TARGET_LEVEL…');
  }
  function reset() {
    running = false; done = false; startT = 0;
    setStatus('Press Run to plan safety stock on top of the demand plan.');
    setLedger();
  }

  // progress 0..1 for a bucket's replenishment animation
  function progOf(i, now) {
    if (!running) return 0;
    const t = (now - startT - i * stepDur * 0.7);
    return Math.max(0, Math.min(1, t / stepDur));
  }

  let raf = null;
  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // y gridlines
    ctx.textAlign = 'right'; ctx.font = '9px system-ui';
    for (let v = 0; v <= maxVal; v += 40) {
      const y = yOf(v);
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      ctx.fillStyle = PALETTE.slate; ctx.fillText(String(v), gx - 8, y + 3);
    }

    // check how far the animation has progressed (for status / completion)
    let allDone = running;

    // bars
    for (let i = 0; i < n; i++) {
      const p = PLAN[i];
      const cx = gx + i * slot + slot / 2;
      const x = cx - barW / 2;
      const prog = progOf(i, now);
      if (prog < 1) allDone = false;

      // projected on-hand (base bar)
      const ohColor = p.above ? PALETTE.green : PALETTE.slate;
      drawRoundRect(ctx, x, yOf(p.oh), barW, baseY - yOf(p.oh), 4, ohColor + '33', ohColor + '99');

      // animated replenishment stacked on top (amber), toward the target
      if (p.replen > 0) {
        const grown = p.replen * prog;
        const yTop = yOf(p.oh + grown);
        drawRoundRect(ctx, x, yTop, barW, yOf(p.oh) - yTop, 4, PALETTE.amber + '66', PALETTE.amber);
      }

      // shortfall marker (hatched red gap) once this bucket finished animating
      if (p.shortfall > 0 && prog >= 1) {
        const yGapTop = yOf(TARGET), yGapBot = yOf(p.final);
        ctx.save();
        ctx.strokeStyle = PALETTE.red; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.strokeRect(x, yGapTop, barW, yGapBot - yGapTop);
        ctx.setLineDash([]);
        ctx.restore();
        ctx.fillStyle = PALETTE.red; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('−' + p.shortfall, cx, (yGapTop + yGapBot) / 2 + 3);
      }

      // final-value chip
      const finalColor = p.shortfall > 0 ? PALETTE.red : (p.above ? PALETTE.green : PALETTE.amber);
      const shownVal = Math.round(p.oh + p.replen * prog);
      ctx.fillStyle = finalColor; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(String(shownVal), cx, yOf(Math.max(p.final, p.oh, TARGET)) - 8);

      // bucket label
      ctx.fillStyle = PALETTE.slate; ctx.font = '10px system-ui';
      ctx.fillText(BUCKETS[i], cx, baseY + 16);

      // order badge (SS planned as demand after demand, in sequence)
      if (showOrder) {
        ctx.beginPath(); ctx.arc(cx, baseY + 32, 8, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.indigo; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui';
        ctx.fillText(String(i + 1), cx, baseY + 35);
      }
    }

    // TARGET_LEVEL line (dashed indigo) on top
    const ty = yOf(TARGET);
    ctx.setLineDash([6, 4]); ctx.strokeStyle = PALETTE.indigo; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx, ty); ctx.lineTo(gx + gw, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.indigo; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`TARGET_LEVEL = ${TARGET}`, gx + gw - 128, ty - 6);

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = PALETTE.slate; ctx.fillText('■ on-hand after demand', gx, 28);
    ctx.fillStyle = PALETTE.amber; ctx.fillText('■ SS replenishment', gx + 160, 28);
    ctx.fillStyle = PALETTE.green; ctx.fillText('■ at/above target', gx + 300, 28);
    ctx.fillStyle = PALETTE.red;   ctx.fillText('■ shortfall', gx + 430, 28);
    if (showOrder) { ctx.fillStyle = PALETTE.indigo; ctx.fillText('① SS planned after regular demand, left→right (SS priority)', gx, baseY + 54); }

    // completion transition
    if (running && allDone && !done) {
      done = true; running = false;
      const met = PLAN.filter(p => p.final >= TARGET).length;
      const short = PLAN.filter(p => p.shortfall > 0).length;
      setStatus(short ? `Pass complete — ${met}/${n} buckets at target, ${short} short where leftover supply ran out.` : `Pass complete — all ${n} buckets topped up to the TARGET_LEVEL.`);
      setLedger();
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#ss-run').addEventListener('click', run);
  tab.querySelector('#ss-reset').addEventListener('click', reset);
  tab.querySelector('#ss-order').addEventListener('click', (e) => {
    showOrder = !showOrder;
    e.currentTarget.classList.toggle('active', showOrder);
  });
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: Inventory Plan Type / Policy & SS-as-demand ordering ──────────────
function policyTab() {
  return `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Inventory Plan Type — what safety stock is measured in</div>
        <div class="section-desc">The <code>Inventory Plan Type</code> parameter (Parameter tab of the SCS UI Config) both enables safety stock planning and chooses whether it is quantity- or time-based.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Value</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">NONE</td><td style="color:var(--text2)">Default. No inventory planning is done at material-node level (no safety stock, including higher-priority SS).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">QUANTITY</td><td style="color:var(--text2)">Quantity-based SS — number of units desired at the material node (<em>Target Inventory</em> in SCS).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">WOS</td><td style="color:var(--text2)">Weeks-of-Supply — buckets’ worth of supply desired at the node (time-based).</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">QUANTITY_WOS</td><td style="color:var(--text2)">Supports both; when both are defined on a node the solver plans for the <strong>maximum</strong> of the two.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">CHRONOLOGICAL</td><td style="color:var(--text2)">Specific use, not to be used otherwise.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Target measures</div><div class="info-card-body"><strong>Constant Target Inventory</strong> / <strong>IL Target Inventory</strong> (time-varying) carry the QUANTITY target; <strong>Constant WOS Target</strong> / <strong>IL WOS Target</strong> carry the WOS target. SS can be constant or time-varying across the horizon.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">WOS → quantity</div><div class="info-card-body">For WOS, the target is converted to units from the demands in the WOS buckets; SCS can export <strong>WOS For Total Demand</strong> and <strong>WOS For Independent Demand</strong>.</div></div>
      </div>

      <div class="section-header">
        <div class="section-title">Inventory Plan Policy — how on-hand is driven to target</div>
        <div class="section-desc">The <code>Inventory Plan Policy</code> parameter chooses the replenishment rule that brings the ending on-hand back up to the safety stock target.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Policy</th><th>Rule</th><th>Profile</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">TARGET_LEVEL</td><td style="color:var(--text2)">Order-up-to level. The ending on-hand in a bucket is brought <strong>up to the target level</strong> specified.</td><td style="color:var(--text2)">On-hand tracks the target line.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">MIN_MAX (Old)</td><td style="color:var(--text2)">Reorder point. On-hand is topped up to MAX (S) <strong>only if</strong> it falls below the Reorder Point MIN (s); order qty = <code>{S − EOH}</code>.</td><td style="color:var(--text2)">Saw-tooth.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">MIN_MAX (New)</td><td style="color:var(--text2)">As above, but also tops up with gap <code>{Target − EOH}</code> when there is production in a bucket and EOH is above the Reorder Point (legacy wouldn’t plan). Set <code>Inventory Plan Policy Min_Max Legacy = False</code>.</td><td style="color:var(--text2)">Cleaner saw-tooth hitting MAX.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header">
        <div class="section-title">Safety stock as a "demand after demand"</div>
        <div class="section-desc">The ordering the solver uses between regular demand and safety stock.</div>
      </div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">After JIT, check EOH vs s and S</div><div class="info-card-body">After demand JIT planning, SCS checks the EOH, the Reorder Point <em>s</em> and the order-up-to-level <em>S</em> in <strong>every time bucket</strong>; if EOH &lt; s it triggers replenishment of <code>{S − EOH}</code>. Safety stock is thus met from the supply left after demand.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">SS Interleaves With Demand</div><div class="info-card-body">Set true to <em>Prioritize Safety Stock Over Demands</em>: <strong>SS Demand Priority</strong> and demand priority become one <strong>homogeneous</strong> priority, so a high-priority SS at a node can be planned before lower-priority demands. Buckets with no SS Demand Priority fall back to Regular SS Planning post-demand.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Hard vs Soft SS</div><div class="info-card-body"><strong>HSS</strong> is respected during demand planning itself (not a separate pass); the fulfilment order is <strong>Priority 1: HSS → Priority 2: Demands → Priority 3: SSS</strong>. WOS-based SS is soft by default — demands take precedence over the WOS target.</div></div>
      </div>
      <div class="prose"><p>Because safety stock is planned <em>after</em> (or interleaved with) demand, the leftover supply drives the result: when supply is tight some SS targets short even though every forecast was met. That is the scenario animated on the first tab under the TARGET_LEVEL policy.</p></div>
    </div>`;
}

// ── Tab 3: SS Bands (fair share), SS Priority, SS Build Ahead Limit ─────────
function bandsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">SS Priority at material nodes</div>
        <div class="section-desc">When supply is insufficient, which nodes get their safety stock first.</div>
      </div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Default (no priority)</div><div class="info-card-body">SCS picks material nodes <strong>downstream to upstream</strong>; at the same level, nodes are chosen by the item dimension keys. Set via the <strong>SS Priority</strong> measure (Inventory tab).</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">With priority set</div><div class="info-card-body"><strong>Lower number = higher priority</strong>; <strong>Null = least priority</strong>. SCS fully allocates the highest-priority node, then moves to the next, so scarce inventory lands where uncertainty/participation is highest.</div></div>
      </div>

      <div class="section-header">
        <div class="section-title">Safety Stock Bands (Fair Share)</div>
        <div class="section-desc">Splitting each SS requirement so equal-priority nodes share scarce supply, via the <code>Inventory Plan Bands</code> parameter.</div>
      </div>
      <div class="prose"><p><strong>Inventory Plan Bands</strong> takes a positive integer; the default <strong>NULL</strong> means the SS requirement is treated as a single target (no fair share). The number is how many sub-parts each standalone SS requirement is divided into, applied globally across all SS material nodes. With a band &gt; 1 the solver serves equal-priority nodes <strong>round-robin</strong>, in proportion to their requirements, instead of fully serving one node while the next shorts.</p></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Example (SS Band = 2)</th><th>Requirement</th><th>Split</th><th>Order SCS plans</th></tr></thead>
          <tbody>
            <tr><td style="color:var(--text2)">Node M2</td><td style="color:var(--text2)">100</td><td style="color:var(--text2)">50 + 50</td><td style="color:var(--text2)">1st, then 4th</td></tr>
            <tr><td style="color:var(--text2)">Node M3</td><td style="color:var(--text2)">50</td><td style="color:var(--text2)">25 + 25</td><td style="color:var(--text2)">2nd, then 5th (partial)</td></tr>
            <tr><td style="color:var(--text2)">Node M4</td><td style="color:var(--text2)">20</td><td style="color:var(--text2)">10 + 10</td><td style="color:var(--text2)">3rd, then 6th (shorted)</td></tr>
          </tbody>
        </table>
      </div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Safety Stock Bands with SS Priority</div><div class="info-card-body"><code>ACROSS_SS_PRIORITY</code> (default) — each band is allocated across all priorities. <code>WITHIN_SS_PRIORITY</code> — all bands are considered for a given priority before moving to the next priority level, so equal-priority nodes fair-share fully first.</div></div>
      </div>

      <div class="section-header">
        <div class="section-title">SS Build Ahead Limit</div>
        <div class="section-desc">How many buckets earlier safety stock may be built when a bucket can’t make target due to capacity.</div>
      </div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>SS Build Ahead Limit</th><th>Behavior</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">NULL (default)</td><td style="color:var(--text2)">Build ahead stretches all the way to the start of the time horizon.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">0</td><td style="color:var(--text2)">No build ahead during safety stock planning.</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">n</td><td style="color:var(--text2)">Build ahead by n buckets (any positive integer).</td></tr>
          </tbody>
        </table>
      </div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Per-node override</div><div class="info-card-body"><strong>SS Build Ahead Limit</strong> can be set at material-node grain; if both a global parameter and a node-specific SS BAL exist, the <strong>node-specific</strong> value takes precedence.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">SS BAL under MIN_MAX</div><div class="info-card-body">With new MIN_MAX (<code>Min_Max Legacy = False</code>) and SS BAL defined, the solver may produce extra material in earlier buckets to meet the target — relaxing the min–max band so EOH can rise <strong>above</strong> the MAX value in a build-ahead bucket.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Inventory Plan Strategy</div><div class="info-card-body"><strong>MOVE_IN</strong> (default) moves later supplies into earlier buckets, resolving any upstream negative-on-hand; <strong>RELEASE_PRODUCE</strong> releases and re-produces (not recommended, being deprecated).</div></div>
      </div>
    </div>`;
}
