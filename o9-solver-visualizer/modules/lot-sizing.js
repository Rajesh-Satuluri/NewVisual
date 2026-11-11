import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';
import { roundToLot } from '../sim/scs-engine.js';

export const IQ = [
  { q: 'The solver shapes an order quantity with three lot-size measures. Name them, say what each does, and give the two gotchas.',
    a: 'Three measures on the production edge (or activity): <strong>1) Min Lot Size</strong> — the minimum quantity the activity must produce into a material node in each bucket, <em>irrespective of the requested quantity</em>. <strong>2) Order Multiple</strong> — the activity always produces in multiples of that number. <strong>3) Max Lot Size</strong> — a <em>batch-size</em> cap: the maximum quantity in a single production batch. It does <strong>not</strong> limit total production in a bucket; the solver can emit one consolidated flow that respects max/min/multiple. The two gotchas: (a) if both Min and Multiple are set, the flow quantity is <strong>always a multiple of the multiple AND greater than or equal to the min</strong>; (b) <strong>when Min &lt; Multiple the solver ignores the Min</strong> and produces the Multiple.',
    tip: 'The trap is "Min < Multiple ⇒ Min ignored". Also: Lot size takes precedence over yield — the solver lot-sizes first, then grosses up for yield upstream.' },
  { q: 'What does the "Min Over Mult" parameter change, and work the canonical example (Min 50, Multiple 12, demand 100)?',
    a: 'It changes how the planned quantity is built. Default is <strong>False</strong> (multiplicative): planned = n × Multiple, where n is the smallest integer making the result ≥ both the Min and the demand → <code>9 × 12 = 108</code>. Set <strong>True</strong> (additive, Min as a base): if demand ≤ Min the planned qty is the Min; if demand &gt; Min it is <strong>Min + (n × Multiple)</strong>, n smallest so the total ≥ demand → <code>50 + (5 × 12) = 110</code>. So the same inputs give <strong>108</strong> (False) vs <strong>110</strong> (True).',
    tip: 'Say "False = pure multiples of the multiple; True = the min becomes an additive base and multiples stack on top." Default is False.' },
  { q: 'Max Stock and Storage both cap held inventory. How do they differ, and which one wins when both are on the same node?',
    a: '<strong>Max Stock</strong> is the maximum inventory (EOH) allowed at a <em>single material node</em>, specified by Qty or WOS (if both, the <strong>greater</strong> is used), and can be time-varying. It is an upper bound EOH should not exceed — the <strong>solver does not build up to Max Stock</strong>, and by default Max Stock <em>violations can remain</em> unless <code>Resolve Max Stock Violations</code> = True. It is initialized after a chosen phase (Read / WIP / JIT / SS, default JIT), and violations from before initialization cannot be undone. <strong>Storage</strong> is a <em>physical hard constraint</em> on total stock at a location and can be <strong>shared across multiple material nodes</strong> (their quantities sum against it). When both sit on the same node, the solver will not create any flow plan that violates the <strong>storage</strong> value — so with Storage 40 and Max Stock 50, EOH is capped at 40. Storage (the lower, hard limit) wins.',
    tip: 'Max Stock = per-material-node, soft-by-default, not built toward. Storage = shared, physical, hard. Also: Max Stock ≥ Safety Stock when SS is defined.' },
];

// ── Grounded demo parameters (teaching values, same shape as the wiki tables) ──
const LOT = { min: 10, mult: 20, max: 100 };  // Min Lot, Order Multiple, Max Lot
const MAX_STOCK = 90;                          // Max Stock Qty at the material node
const STORAGE = 70;                            // Storage availability (lower ⇒ wins)
const PRESETS = [7, 23, 140];

// The six pipeline stages. Values are produced by the REAL roundToLot() for the
// three lot transforms, then Math.min ceilings for the two held-inventory caps.
const STAGES = [
  { label: 'Net Req',     sub: 'raw requirement',  color: '#64748B' },
  { label: '≥ MIN',       sub: `raise to min ${LOT.min}`, color: '#6366F1' },
  { label: '× MULT',      sub: `ceil to mult ${LOT.mult}`, color: '#A78BFA' },
  { label: '≤ MAX LOT',   sub: `cap batch ${LOT.max}`, color: '#38BDF8' },
  { label: '≤ MAX STOCK', sub: `node EOH ${MAX_STOCK}`, color: '#F59E0B' },
  { label: '≤ STORAGE',   sub: `hard cap ${STORAGE}`, color: '#10B981' },
];

function stageValues(raw) {
  // Each lot transform is the real roundToLot — partial params isolate each step.
  const s1 = roundToLot(raw, { min: LOT.min, mult: 1, max: Infinity });        // ≥ min
  const s2 = roundToLot(raw, { min: LOT.min, mult: LOT.mult, max: Infinity }); // ceil to mult
  const s3 = roundToLot(raw, { min: LOT.min, mult: LOT.mult, max: LOT.max });  // cap at max lot
  const s4 = Math.min(s3, MAX_STOCK);                                          // max stock ceiling
  const s5 = Math.min(s4, STORAGE);                                            // storage ceiling
  return [raw, s1, s2, s3, s4, s5];
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'Lot Size · Max Stock · Storage',
    subtitle: 'Three constraints shape how much the solver orders and how much it may hold: lot sizing rounds the order (min → multiple → max batch), then Max Stock and Storage cap what can sit at the node. Push a raw net requirement through the pipeline and watch each ceiling bite.',
    tabs: [
      { id: 'lot',      label: '📦 Lot Rounding' },
      { id: 'sizing',   label: '🪚 Lot Sizing', content: sizingTab() },
      { id: 'maxstore', label: '🧱 Max Stock & Storage', content: maxStoreTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live rounding pipeline ─────────────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-lot');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Pick a raw net requirement, then <b>Step</b> through (or <b>Run</b>) the pipeline. The first three boxes call the real <code>roundToLot()</code> from <code>sim/scs-engine.js</code> — raise to <b style="color:#6366F1">MIN</b>, ceil to <b style="color:#A78BFA">MULTIPLE</b>, cap at <b style="color:#38BDF8">MAX LOT</b>. The last two are further ceilings on what can be <i>held</i>: <b style="color:#F59E0B">MAX STOCK</b> then <b style="color:#10B981">STORAGE</b>.</div>
      <canvas id="lot-canvas" width="860" height="330" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="lot-raw-0">Raw ${PRESETS[0]}</button>
        <button class="ctrl-btn" id="lot-raw-1">Raw ${PRESETS[1]}</button>
        <button class="ctrl-btn" id="lot-raw-2">Raw ${PRESETS[2]}</button>
        <button class="ctrl-btn" id="lot-step">▶ Step</button>
        <button class="ctrl-btn" id="lot-run">⚡ Run Pipeline</button>
        <button class="ctrl-btn" id="lot-reset">↺ Reset</button>
        <span class="ctrl-label" id="lot-status">Pick a raw quantity, then Step or Run.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The order quantity is <strong>shaped</strong> before it is ever released. <code>roundToLot()</code> first <strong>raises to the Min</strong> (an activity must produce at least its minimum per bucket, irrespective of the request), then <strong>ceils to the Order Multiple</strong> (production happens only in multiples), then caps at the <strong>Max Lot</strong> batch size. With <code>min ${LOT.min} · mult ${LOT.mult} · max ${LOT.max}</code>, raw <code>${PRESETS[0]}</code> → <code>${stageValues(PRESETS[0])[3]}</code>, raw <code>${PRESETS[1]}</code> → <code>${stageValues(PRESETS[1])[3]}</code>, raw <code>${PRESETS[2]}</code> → <code>${stageValues(PRESETS[2])[3]}</code>.</p>
      <p>Lot sizing can <em>overshoot</em> demand, so two more constraints cap what may sit at the node. <strong>Max Stock</strong> is the per-node EOH ceiling (${MAX_STOCK} here) — the solver never builds <em>toward</em> it, it only refuses to exceed it. <strong>Storage</strong> is the shared physical hard cap (${STORAGE} here). When both apply to one node the <strong>lower, hard Storage value wins</strong>, so a lot of ${stageValues(PRESETS[2])[3]} is held down to just ${stageValues(PRESETS[2])[5]}.</p>
    </div>`;

  const canvas = tab.querySelector('#lot-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#lot-status');

  const boxW = 118, boxH = 84, boxY = 150, x0 = 18, stride = 140;
  const boxX = (i) => x0 + i * stride;

  let raw = PRESETS[1];
  let vals = stageValues(raw);
  let shown = 1;          // number of stages revealed (1..6)
  let pop = 0;            // pop animation for the latest-revealed box
  let running = false;    // auto-advance
  let frame = 0;

  function describe(stage) {
    const prev = vals[stage - 1], cur = vals[stage];
    switch (stage) {
      case 1: return prev < cur ? `≥ MIN: raised ${prev} → ${cur} (min ${LOT.min}).`
                                : `≥ MIN: ${cur} already meets min ${LOT.min}.`;
      case 2: return prev < cur ? `× MULT: ceiled ${prev} → ${cur} (multiple of ${LOT.mult}).`
                                : `× MULT: ${cur} already a multiple of ${LOT.mult}.`;
      case 3: return prev > cur ? `≤ MAX LOT: batch cut ${prev} → ${cur} (max ${LOT.max}).`
                                : `≤ MAX LOT: ${cur} within max batch ${LOT.max}. Lot-sized order = ${cur}.`;
      case 4: return prev > cur ? `≤ MAX STOCK: EOH capped ${prev} → ${cur} (max stock ${MAX_STOCK}).`
                                : `≤ MAX STOCK: ${cur} under max stock ${MAX_STOCK}.`;
      case 5: return prev > cur ? `≤ STORAGE: hard cap ${prev} → ${cur}. Storage ${STORAGE} < max stock ${MAX_STOCK}, so storage wins. Held = ${cur}.`
                                : `≤ STORAGE: ${cur} fits storage ${STORAGE}. Held = ${cur}.`;
      default: return '';
    }
  }

  function setRaw(r) {
    raw = r; vals = stageValues(raw); shown = 1; pop = 14; running = false;
    statusEl.textContent = `Raw net requirement = ${raw}. Press Step or Run.`;
    syncButtons();
  }
  function step() {
    if (shown >= STAGES.length) return;
    shown++; pop = 14;
    statusEl.textContent = describe(shown - 1);
    syncButtons();
  }
  function run() { if (shown >= STAGES.length) setRaw(raw); running = true; frame = 0; syncButtons(); }
  function reset() { shown = 1; running = false; pop = 14; statusEl.textContent = `Raw net requirement = ${raw}. Press Step or Run.`; syncButtons(); }

  function syncButtons() {
    tab.querySelector('#lot-step').disabled = shown >= STAGES.length;
  }

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    if (running && shown < STAGES.length) {
      frame++;
      if (frame % 34 === 0) { shown++; pop = 14; statusEl.textContent = describe(shown - 1); if (shown >= STAGES.length) running = false; syncButtons(); }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // header params line
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Net requirement → lot-sized order → what can be held', x0, 34);
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#64748B'; ctx.fillText('LOT', x0, 58);
    ctx.fillStyle = '#A78BFA'; ctx.fillText(`min ${LOT.min} · mult ${LOT.mult} · max ${LOT.max}`, x0 + 26, 58);
    ctx.fillStyle = '#64748B'; ctx.fillText('MAX STOCK', x0 + 240, 58);
    ctx.fillStyle = '#F59E0B'; ctx.fillText(String(MAX_STOCK), x0 + 310, 58);
    ctx.fillStyle = '#64748B'; ctx.fillText('STORAGE', x0 + 360, 58);
    ctx.fillStyle = '#10B981'; ctx.fillText(String(STORAGE), x0 + 420, 58);

    // connecting arrows (only between revealed boxes)
    for (let i = 0; i < STAGES.length - 1; i++) {
      if (i + 1 < shown) {
        const on = true;
        drawArrow(ctx, boxX(i) + boxW, boxY + boxH / 2, boxX(i + 1) - 4, boxY + boxH / 2,
          on ? STAGES[i + 1].color + 'AA' : '#334155', 1.8);
      }
    }

    // boxes
    STAGES.forEach((st, i) => {
      const revealed = i < shown;
      const isLatest = i === shown - 1;
      const grow = isLatest ? (pop / 14) * 3 : 0;
      const x = boxX(i) - grow, y = boxY - grow, w = boxW + grow * 2, h = boxH + grow * 2;
      const prev = i > 0 ? vals[i - 1] : null;
      const cur = vals[i];
      const raised = i >= 1 && i <= 2 && prev != null && cur > prev;
      const cut = i >= 3 && prev != null && cur < prev;

      const bg = revealed ? '#111827' : '#0d1322';
      const border = revealed ? (cut ? '#EF4444' : st.color) : '#1e2a3f';
      drawRoundRect(ctx, x, y, w, h, 10, bg, (revealed ? '' : '') + border + (revealed ? '' : '55'));

      // label
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = revealed ? st.color : '#334155';
      ctx.fillText(st.label, x + w / 2, y + 20);

      // value
      ctx.font = 'bold 26px system-ui';
      if (!revealed) { ctx.fillStyle = '#1e2a3f'; ctx.fillText('·', x + w / 2, y + 52); }
      else {
        ctx.fillStyle = cut ? '#EF4444' : raised ? st.color : '#E2E8F0';
        ctx.fillText(String(cur), x + w / 2, y + 54);
      }

      // sublabel
      ctx.font = '9px system-ui';
      ctx.fillStyle = revealed ? '#64748B' : '#283347';
      ctx.fillText(st.sub, x + w / 2, y + h - 10);

      // delta badge when a constraint changed the number
      if (revealed && (raised || cut)) {
        ctx.font = 'bold 9px system-ui';
        ctx.fillStyle = cut ? '#EF4444' : st.color;
        const tag = cut ? `−${prev - cur}` : `+${cur - prev}`;
        ctx.fillText(tag, x + w / 2, y - 6);
      }
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#lot-raw-0').addEventListener('click', () => setRaw(PRESETS[0]));
  tab.querySelector('#lot-raw-1').addEventListener('click', () => setRaw(PRESETS[1]));
  tab.querySelector('#lot-raw-2').addEventListener('click', () => setRaw(PRESETS[2]));
  tab.querySelector('#lot-step').addEventListener('click', step);
  tab.querySelector('#lot-run').addEventListener('click', run);
  tab.querySelector('#lot-reset').addEventListener('click', reset);
  setRaw(raw);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: Lot sizing (wiki-grounded) ─────────────────────────────────────────
function sizingTab() {
  const measures = [
    ['Min Lot Size', 'The minimum quantity an activity must produce into a material node in each bucket — <strong>irrespective of the requested quantity</strong>.', 'Prod Graph Min Qty Measure Name'],
    ['Order Multiple', 'The activity always produces in <strong>multiples</strong> of this number, across each bucket, irrespective of the requested quantity.', 'Prod Graph Mul Qty Measure Name'],
    ['Max Lot Size', 'A <strong>batch-size</strong> cap — the max quantity in one production batch. It does <em>not</em> limit total production in a bucket; the solver can emit one consolidated flow respecting max/min/multiple.', 'Prod Graph Max Lot Qty Measure Name'],
  ];
  const behavior = [
    ['10, 0', '9', '10'],
    ['10, 0', '11', '11'],
    ['0, 10', '9', '10'],
    ['0, 10', '11', '20'],
    ['24, 7', '23', '28'],
    ['24, 7', '31', '35'],
    ['6, 20', '5', '20'],
    ['6, 20', '21', '40'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Lot sizing — min, multiple, max</div><div class="section-desc">Restrictions on the quantity to procure, produce or distribute (e.g. biscuits packed by the dozen). The solver shapes the order to honour these before releasing it.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Measure</th><th>What it means</th><th>SCS config property</th></tr></thead>
          <tbody>${measures.map(([m, d, c]) => `<tr><td style="font-weight:600;color:var(--text)">${m}</td><td>${d}</td><td style="color:var(--text2)"><code>${c}</code></td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Both set ⇒ multiple wins the shape</div><div class="info-card-body">If both Min and Multiple are specified, the flow quantity is <strong>always a multiple of the multiple AND ≥ the min</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">⚠️ Min &lt; Multiple</div><div class="info-card-body">When the Min is less than the Multiple, the solver <strong>ignores the Min</strong> and produces the Multiple.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Lot size before yield</div><div class="info-card-body">Lot size takes <strong>precedence over yield</strong>: the solver lot-sizes the production first, then grosses the quantity up for yield as it propagates upstream.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Solver behaviour — (Min, Multiple) vs demand</div><div class="section-desc">Straight from the wiki table. Exactly the output of <code>roundToLot()</code>: raise to min → ceil to multiple.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Min, Multiple</th><th>Demand</th><th>Output production / flow qty</th></tr></thead>
          <tbody>${behavior.map(([lm, d, o]) => `<tr><td><code>${lm}</code></td><td>${d}</td><td style="font-weight:700;color:var(--accent)">${o}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Min Over Mult (additive vs multiplicative)</h3>
        <p>A boolean parameter, default <strong>False</strong>. With <strong>False</strong> the planned quantity is <code>n × Multiple</code>, n the smallest integer making the result ≥ both Min and demand. With <strong>True</strong> the Min becomes an additive base: if demand ≤ Min the planned qty is the Min; if demand &gt; Min it is <strong>Min + (n × Multiple)</strong>. Worked example — Min 50, Multiple 12, demand 100: False → <strong>108</strong> (9 × 12); True → <strong>110</strong> (50 + 5 × 12).</p>
        <p>Related levers from the same page: <strong>Soft Lot Size</strong> (lot size relaxed until a consolidation phase, then enforced), <strong>Activity-based lot size</strong> (in activity units — takes precedence over an edge lot size), <strong>Lot Size over Buckets</strong> (spread one lot across buckets when capacity per bucket is too small), and the <strong>Lot Size Fence</strong> (respect lot size only within N near-term buckets).</p>
      </div>
    </div>`;
}

// ── Tab 3: Max Stock + Storage (wiki-grounded) ────────────────────────────────
function maxStoreTab() {
  const initRows = [
    ['Read', 'After data loading'],
    ['WIP', 'After WIP planning'],
    ['JIT', 'After demand planning (default)'],
    ['SS', 'After inventory (safety-stock) planning'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Max Stock — the per-node EOH ceiling</div><div class="section-desc">Lot sizing (and other effects) can plan more than demand. Max Stock lets planners cap the maximum inventory held at a single material node.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Qty or WOS</div><div class="info-card-body">Specified by quantity or weeks-of-supply (WOS), and can be time-varying. WOS is converted to qty using consumption <em>at the time of constraint initialization</em>. If both are given, the <strong>greater</strong> of the two is used.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Upper bound, not a target</div><div class="info-card-body">Max Stock is an upper bound EOH should not exceed — the solver <strong>does not build up to it</strong>. By default <strong>violations can remain</strong>; set <code>Resolve Max Stock Violations</code> = True to have the solver do EOH / EOHaE resolution.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Vs Safety Stock</div><div class="info-card-body">Max Stock is always <strong>≥ Safety Stock</strong> when SS is defined; built-up SS cannot be brought down, and any EOH resolution stays above the SS target.</div></div>
      </div>

      <div class="section-header" style="margin-top:20px"><div class="section-title">Max Stock Constraint Initialization</div><div class="section-desc">Controls after which phase the constraint turns on. Violations from <em>before</em> initialization cannot be undone later. Default: JIT.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Value</th><th>Constraint initialized…</th></tr></thead>
          <tbody>${initRows.map(([v, d]) => `<tr><td style="font-weight:700;color:var(--accent)"><code>${v}</code></td><td>${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Storage — the shared physical hard constraint</div><div class="section-desc">Physical storage dictating the maximum stock holdable at a location. A <strong>hard</strong> constraint: stock in any bucket must not exceed the specified value.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Shared across material nodes</div><div class="info-card-body">A storage node can be <strong>shared</strong> by several material nodes — their quantities <em>sum</em> against it. E.g. 50 of FG_9 + 10 of FG_10 at DC_1 consume 60 units of Storage_DC_1 (if not pushed downstream that bucket).</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Storage Fence</div><div class="info-card-body">Default NULL = hard for the whole horizon. Set to N buckets: storage is hard from the current bucket through the fence; <strong>beyond it, excess <em>lot-sized</em> production may violate storage</strong>. Capacity build-ahead stock never qualifies for the relaxation.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Both at the same node</div><div class="info-card-body">When Max Stock and Storage both apply to one node, the solver creates <strong>no flow plan that violates Storage</strong>. With Storage 40 and Max Stock 50, EOH is capped at <strong>40</strong> — the lower, hard Storage value wins.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>How they relate to lot sizing</h3>
        <p>Lot sizing can overshoot demand and leave excess at a node. <strong>Max Stock</strong> caps that excess per material node (and can push excess downstream when <code>Resolve Max Stock Violations</code> is on); <strong>Storage</strong> caps the total physical stock at the location and can force a demand <em>short</em> rather than hold an over-produced lot. Together they are the "what can be held" ceilings that sit downstream of the "how much to order" lot transforms.</p>
      </div>
    </div>`;
}
