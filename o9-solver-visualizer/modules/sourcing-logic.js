import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow, PulseRing } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'When several alternate producers (production edges / activities) can make the same material at a node, how does the SCS solver decide which one to use?',
    a: 'The alternate production edges at a node are <strong>sorted by comparing a fixed sequence of attributes, in order</strong>, and <em>the solver only looks at the next attribute when the earlier ones tie</em>. The sequence is: <strong>1) Activity Priority</strong> — <em>lower number = higher priority</em>; <strong>2) Proportion enabled</strong> — an edge with <code>proportion</code> turned on is given higher priority; <strong>3) Activity key</strong> — attribute members with the <em>lower key value</em> win (matched in the order the Activity node components are configured in the SCS Config UI); <strong>4) Activity node end date</strong> — the activity with the <em>later end date</em> wins. So priority is the first filter; proportion, then key, then end date are successive tie-breakers.',
    tip: 'Say it as an ordered cascade: Priority → Proportion → Activity key → End date, and stress "next key only on a tie". Priority is lower-is-better; end date is later-is-better.' },
  { q: 'Activity Priority is "considered in 3 ways" — what are they, and what exactly does the proportion-enabled tie-break do?',
    a: 'For the first sort key, the edge\'s priority can come from three sources: <strong>(a) the static priority</strong> of the production edge, <strong>(b) the time-varying priority</strong> of the production edge, and <strong>(c) the DemandAttributeAssociationProperties priority</strong>. In all three, a <em>lower number is higher priority</em>. If two edges still tie on priority, the solver applies key 2: <strong>an edge with proportion enabled is given higher priority</strong> than one without — this is how proportional (split) sourcing lanes are favoured before the solver falls back to the Activity-key and end-date tie-breaks. Only if proportion also ties does it compare the <strong>Activity key</strong> (lower member key first), and finally the <strong>end date</strong> (later wins).',
    tip: 'Three priority sources: static, time-varying, DemandAttributeAssociationProperties. Proportion-enabled is tie-break #2, right after priority.' },
  { q: 'With time-varying alternate priority, which bucket\'s priority is used to pick the alternate, and which planning behaviours does a priority change NOT affect?',
    a: 'The solver supports both static and <strong>time-varying</strong> alternate production-activity priority, and the time-varying value <em>takes precedence over the static priority</em> (if a bucket has no time-varying value, the solver falls back to the static priority for that bucket). Crucially, at a material node the <strong>alternate priority in the <em>produced</em> bucket</strong> — the bucket where the material is required — is the one used to select the alternate. The documented interaction table says a time-varying priority change has <strong>no impact</strong> on several phases: <strong>Demand Build Ahead</strong> (in the default "Prefer Build Ahead Over Alternates" mode), <strong>No Carry</strong>, <strong>Safety-Stock MOVE_IN</strong>, <strong>Excess Cleanup MOVE_OUT</strong>, and <strong>BCP (Batch Consolidation Period)</strong>. It <em>is</em> followed for <strong>Demand Build Late</strong> (the priority in the attempted bucket) and under "Minimize Inventory Build Ahead" the build-ahead off-load to alternates uses the existing logic.',
    tip: 'Produced-bucket priority selects the alternate; time-varying beats static. "No impact" list: build-ahead (default), no-carry, SS move-in, excess-cleanup move-out, BCP.' },
];

// ── alternate-sort model ─────────────────────────────────────────────────────
// Each alternate: { id, name, priority, prop, key, end, staticP? }
// Sort keys, in the exact wiki order:
//   1 Activity Priority (lower wins) · 2 Proportion enabled (wins) ·
//   3 Activity key (lower wins)      · 4 End date (later wins)
const PHASES = [
  null,
  { field: 'priority', label: 'Activity Priority — lower wins', color: '#6366F1', cell: 'prio' },
  { field: 'prop',     label: 'Proportion enabled — wins',      color: '#38BDF8', cell: 'prop' },
  { field: 'key',      label: 'Activity key — lower wins',      color: '#A78BFA', cell: 'key'  },
  { field: 'end',      label: 'End date — later wins',          color: '#F59E0B', cell: 'end'  },
];

const SCEN = {
  'priorities-differ': {
    name: 'Priorities differ → Activity Priority (key 1) decides',
    require: 'W3',
    alts: [
      { id: 'A1', name: 'Make @ Plant_1', priority: 1, prop: false, key: 10, end: 'W52' },
      { id: 'A2', name: 'Make @ Plant_2', priority: 2, prop: false, key: 20, end: 'W52' },
      { id: 'A3', name: 'Buy @ Supplier', priority: 3, prop: false, key: 30, end: 'W40' },
    ],
  },
  'priority-tie-proportion': {
    name: 'Priority ties → Proportion enabled (key 2) decides',
    require: 'W3',
    alts: [
      { id: 'A1', name: 'Make @ Plant_1', priority: 1, prop: false, key: 10, end: 'W52' },
      { id: 'A2', name: 'Make @ Plant_2', priority: 1, prop: true,  key: 20, end: 'W52' },
      { id: 'A3', name: 'Buy @ Supplier', priority: 2, prop: false, key: 30, end: 'W52' },
    ],
  },
  'proportion-tie-enddate': {
    name: 'Priority, proportion & key tie → End date (key 4) decides',
    require: 'W3',
    alts: [
      { id: 'A1', name: 'Make @ Line_A', priority: 1, prop: true, key: 10, end: 'W40' },
      { id: 'A2', name: 'Make @ Line_B', priority: 1, prop: true, key: 10, end: 'W52' },
    ],
  },
  'time-varying': {
    name: 'Time-varying priority → produced-bucket priority (key 1) decides',
    require: 'W3',
    timeVarying: true,
    alts: [
      { id: 'A1', name: 'Vessel lane', priority: 2, prop: false, key: 10, end: 'W52', staticP: 1 },
      { id: 'A2', name: 'Air lane',    priority: 1, prop: false, key: 20, end: 'W52', staticP: 2 },
    ],
  },
};

const endNum = (s) => parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'How It Solves',
    title: 'Sourcing & Alternates',
    subtitle: 'When a material node can be produced by several alternate production edges or activities, the solver sorts them with a fixed cascade of comparison keys — Activity Priority, then proportion-enabled, then Activity key, then end date — and uses the next key only when the earlier ones tie. Watch the solver walk the keys, highlight the one that breaks the tie, and light up the winning edge.',
    tabs: [
      { id: 'sort',  label: '🧭 Sort & Select' },
      { id: 'keys',  label: '🗝️ Sort Keys (in order)', content: keysTab() },
      { id: 'tv',    label: '⏱️ Time-varying Priority', content: tvTab() },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the alternate-sort / selection animation ──────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-sort');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One <b>material node</b> at the bottom, fed by <b>alternate production edges</b>. Each edge carries its four comparison attributes: <b style="color:#6366F1">Prio</b> (Activity Priority), <b style="color:#38BDF8">Prop</b> (proportion enabled), <b style="color:#A78BFA">Key</b> (Activity key) and <b style="color:#F59E0B">End</b> (end date). Press <b>Run</b> to walk the keys in order, or <b>Step</b> one key at a time — eliminated edges dim, the deciding key lights up, and the winner feeds the node.</div>
      <canvas id="src-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="src-run">▶ Run (sort &amp; select)</button>
        <button class="ctrl-btn" id="src-step">⏭ Step key</button>
        <button class="ctrl-btn" id="src-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Scenario:</span>
        <button class="ctrl-btn" data-scen="priorities-differ">Priorities differ</button>
        <button class="ctrl-btn" data-scen="priority-tie-proportion">Priority tie → proportion</button>
        <button class="ctrl-btn" data-scen="proportion-tie-enddate">All tie → end date</button>
        <button class="ctrl-btn" data-scen="time-varying">Time-varying</button>
      </div>
      <div id="src-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>At a material node, the solver may have several <strong>alternate production edges / activities</strong> that can make the required material. Before it builds, it <strong>sorts</strong> them by comparing a fixed sequence of attributes, and <em>uses the next attribute only when the comparison of the earlier ones is equal</em>: <strong>1) Activity Priority</strong> (lower number = higher priority), <strong>2) Proportion enabled</strong> (an edge with proportion on is preferred), <strong>3) Activity key</strong> (the lower member key wins, matched in the configured Activity-node-component order), then <strong>4) Activity node end date</strong> (the later end date wins).</p>
      <p>Each <strong>Step</strong> applies one key: edges that lose that comparison dim out; edges that tie stay in and move on to the next key. The first key that leaves a single survivor is the key that <strong>decided</strong> the source — it lights up, and a flow runs down the winning edge into the material node. For the <strong>time-varying</strong> scenario, the priority used is the one <em>in the produced bucket</em> (where the material is required), which can differ from the static priority and takes precedence over it.</p>
    </div>`;

  const canvas = tab.querySelector('#src-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // geometry
  const M = 34;
  const BW = 168, BH = 86, BOX_Y = 42;
  const MAT_Y = 250, MAT_W = 250, MAT_H = 34, MAT_X = canvas.width / 2;

  let scen = 'priorities-differ';
  let alts = [];
  let cx = [];                    // box center x per alternate
  let phase = 0;                  // 0 = not started; 1..4 = key applied
  let survivors = [];
  let decidedPhase = 0;
  let winner = -1;
  let done = false;
  let running = false;
  let flow = 0;                   // 0→1 flow down the winning edge
  let frame = 0;
  const STEP_FRAMES = 52;
  let pulse = null;

  function layout() {
    alts = SCEN[scen].alts;
    const n = alts.length;
    const slot = (canvas.width - 2 * M) / n;
    cx = alts.map((_, i) => M + slot * i + slot / 2);
  }

  function resetState() {
    phase = 0; survivors = alts.map((_, i) => i);
    decidedPhase = 0; winner = -1; done = false; running = false; flow = 0; frame = 0; pulse = null;
  }

  function filterPhase(p, surv) {
    if (p === 1) { const m = Math.min(...surv.map(i => alts[i].priority)); return surv.filter(i => alts[i].priority === m); }
    if (p === 2) { const any = surv.some(i => alts[i].prop); return any ? surv.filter(i => alts[i].prop) : surv; }
    if (p === 3) { const m = Math.min(...surv.map(i => alts[i].key)); return surv.filter(i => alts[i].key === m); }
    if (p === 4) { const m = Math.max(...surv.map(i => endNum(alts[i].end))); const f = surv.filter(i => endNum(alts[i].end) === m); return f.length ? [f[0]] : [surv[0]]; }
    return surv;
  }

  function advance() {
    if (done) return;
    if (survivors.length <= 1 || phase >= 4) { finalize(); return; }
    phase++;
    survivors = filterPhase(phase, survivors);
    if (survivors.length <= 1 && !decidedPhase) decidedPhase = phase;
    if (survivors.length <= 1 || phase >= 4) finalize();
  }

  function finalize() {
    if (!decidedPhase) decidedPhase = Math.max(phase, 1);
    done = true; running = false;
    winner = survivors[0];
    pulse = new PulseRing({ x: cx[winner], y: BOX_Y + BH / 2, color: '#10B981', maxR: 70, duration: 1.1 });
    setFinalLedger();
  }

  function card(color, title, body) {
    return `<div class="info-card" style="border-left:3px solid ${color}"><div class="info-card-title">${title}</div><div class="info-card-body">${body}</div></div>`;
  }

  function setResetLedger() {
    const s = SCEN[scen];
    const tv = s.timeVarying ? ' The priorities shown are the <b>produced-bucket (W3)</b> values; statically the primary would differ.' : '';
    tab.querySelector('#src-ledger').innerHTML =
      card('#64748B', s.name, `${alts.length} alternate edges feed the node (required on <b>${s.require}</b>).${tv} Press <b>Run</b>, or <b>Step</b> one key at a time.`);
  }

  function setFinalLedger() {
    const s = SCEN[scen];
    const w = alts[winner];
    const ph = PHASES[decidedPhase];
    const cards = [card('#64748B', s.name, `Compared top-down; the first key to leave one survivor decided the source.`)];
    const why = {
      1: `<b>Activity Priority</b> is the first key — lower number = higher priority. <b>${w.name}</b> has priority <code>${w.priority}</code>, the lowest, so it wins before any later key is even examined.`,
      2: `Priorities tied, so key 2 applies: <b>an edge with proportion enabled is given higher priority</b>. <b>${w.name}</b> has <code>proportion = enabled</code>.`,
      3: `Priority and proportion tied, so key 3 breaks it: <b>the Activity key with the lower member value wins</b> (matched in the configured Activity-node-component order). <b>${w.name}</b> has key <code>${w.key}</code>.`,
      4: `Priority, proportion and Activity key all tied, so the final key decides: <b>the activity with the later end date wins</b>. <b>${w.name}</b> ends <code>${w.end}</code>.`,
    }[decidedPhase];
    cards.push(card(ph.color, `Decided by key ${decidedPhase}: ${ph.label}`, why));
    cards.push(card('#10B981', `✓ Selected: ${w.name}`, `Prio <code>${w.priority}</code> · prop <code>${w.prop ? 'enabled' : 'off'}</code> · key <code>${w.key}</code> · end <code>${w.end}</code>. The winning edge now produces the material at the node.`));
    if (s.timeVarying) {
      cards.push(card('#F59E0B', 'Time-varying note',
        `The priority used is the one <b>in the produced bucket (W3)</b> — <b>${w.name}</b> is primary there even though it is the static alternate. A time-varying priority change has <b>no impact</b> on Build-Ahead (default mode), No-Carry, SS&nbsp;MOVE_IN, Excess-Cleanup&nbsp;MOVE_OUT or BCP.`));
    }
    tab.querySelector('#src-ledger').innerHTML = cards.join('');
  }

  // ── drawing ────────────────────────────────────────────────────────────────
  function drawCell(x, y, w, h, label, value, active, decided) {
    if (active) drawRoundRect(ctx, x, y, w, h, 4, PHASES[phase] ? PHASES[phase].color + '33' : '#ffffff00', PHASES[phase] ? PHASES[phase].color : '#334155');
    else if (decided) drawRoundRect(ctx, x, y, w, h, 4, '#10B98126', '#10B98199');
    ctx.textAlign = 'left';
    ctx.font = '8px system-ui';
    ctx.fillStyle = active ? (PHASES[phase] ? PHASES[phase].color : '#94a3b8') : (decided ? '#10B981' : '#64748B');
    ctx.fillText(label, x + 6, y + 9);
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = active ? '#E2E8F0' : (decided ? '#A7F3D0' : '#CBD5E1');
    ctx.fillText(value, x + 6, y + 20);
  }

  function drawBox(i) {
    const a = alts[i];
    const x = cx[i] - BW / 2;
    const alive = survivors.includes(i);
    const isWin = done && i === winner;
    const dim = !alive && (phase >= 1 || done);

    ctx.globalAlpha = dim ? 0.3 : 1;

    const border = isWin ? '#10B981' : (alive && phase >= 1 && !done ? '#475569' : '#334155');
    const bg = isWin ? '#0e2a1f' : '#0d1424';
    if (isWin) {
      const g = ctx.createRadialGradient(cx[i], BOX_Y + BH / 2, 10, cx[i], BOX_Y + BH / 2, 90);
      g.addColorStop(0, '#10B98133'); g.addColorStop(1, '#10B98100');
      ctx.fillStyle = g; ctx.fillRect(cx[i] - 95, BOX_Y - 35, 190, BH + 70);
    }
    drawRoundRect(ctx, x, BOX_Y, BW, BH, 7, bg, border);

    // name
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = isWin ? '#6EE7B7' : '#E2E8F0';
    ctx.fillText(`${a.id} · ${a.name}`, x + 10, BOX_Y + 18);

    // 2x2 attribute grid
    const gx = x + 8, cw = (BW - 20) / 2, ch = 24;
    const gy1 = BOX_Y + 26, gy2 = gy1 + ch + 4;
    const act = (c) => !done && phase >= 1 && PHASES[phase].cell === c && alive;
    const dec = (c) => done && isWin && PHASES[decidedPhase].cell === c;
    drawCell(gx,          gy1, cw, ch, 'PRIO (lower wins)', String(a.priority),        act('prio'), dec('prio'));
    drawCell(gx + cw + 4, gy1, cw, ch, 'PROP',              a.prop ? '✓ on' : '✗ off', act('prop'), dec('prop'));
    drawCell(gx,          gy2, cw, ch, 'KEY (lower wins)',  String(a.key),             act('key'),  dec('key'));
    drawCell(gx + cw + 4, gy2, cw, ch, 'END (later wins)',  a.end,                     act('end'),  dec('end'));

    // static-priority annotation for time-varying
    if (a.staticP != null) {
      ctx.textAlign = 'center'; ctx.font = '9px system-ui';
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`static P:${a.staticP}  →  W3 P:${a.priority}`, cx[i], BOX_Y + BH + 14);
    }
    ctx.globalAlpha = 1;
  }

  let raf = null;
  function draw() {
    frame++;
    if (running && !done && frame % STEP_FRAMES === 0) advance();
    if (done && flow < 1) flow = Math.min(1, flow + 0.022);
    if (pulse) { pulse.update(1 / 60); if (pulse.done) pulse = null; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // status banner
    ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui';
    if (done) { ctx.fillStyle = '#10B981'; ctx.fillText(`✓ Selected by key ${decidedPhase}: ${PHASES[decidedPhase].label}`, canvas.width / 2, 22); }
    else if (phase >= 1) { ctx.fillStyle = PHASES[phase].color; ctx.fillText(`Comparing key ${phase} of 4 — ${PHASES[phase].label}`, canvas.width / 2, 22); }
    else { ctx.fillStyle = '#64748B'; ctx.fillText('Alternate production edges at the material node — press Run to sort', canvas.width / 2, 22); }

    // edges (behind boxes)
    for (let i = 0; i < alts.length; i++) {
      const alive = survivors.includes(i);
      const isWin = done && i === winner;
      const col = isWin ? '#10B981' : (alive ? '#64748B' : '#1E293B');
      ctx.globalAlpha = (!alive && (phase >= 1 || done)) ? 0.3 : 1;
      drawArrow(ctx, cx[i], BOX_Y + BH, MAT_X, MAT_Y, col, isWin ? 3 : 1.5);
      ctx.globalAlpha = 1;
    }

    // flow packet down the winning edge
    if (done && winner >= 0 && flow > 0) {
      const sx = cx[winner], sy = BOX_Y + BH;
      const px = sx + (MAT_X - sx) * flow, py = sy + (MAT_Y - sy) * flow;
      const g = ctx.createRadialGradient(px, py, 0, px, py, 10);
      g.addColorStop(0, '#6EE7B7'); g.addColorStop(1, '#10B98100');
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fillStyle = '#10B981'; ctx.fill();
    }

    // boxes
    for (let i = 0; i < alts.length; i++) drawBox(i);
    if (pulse) pulse.draw(ctx);

    // material node
    const produced = done && flow >= 1;
    const mx = MAT_X - MAT_W / 2;
    drawRoundRect(ctx, mx, MAT_Y, MAT_W, MAT_H, 8, produced ? '#0e2a1f' : '#111a2e', produced ? '#10B981' : '#6366F1');
    ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = produced ? '#6EE7B7' : '#A5B4FC';
    ctx.fillText(produced ? `● Material produced on ${SCEN[scen].require}` : `◻ Material node — required on ${SCEN[scen].require}`, MAT_X, MAT_Y + 22);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // ── controls ─────────────────────────────────────────────────────────────
  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => {
    scen = b.dataset.scen; layout(); resetState(); setResetLedger();
  }));
  tab.querySelector('#src-run').addEventListener('click', () => { resetState(); running = true; setResetLedger(); });
  tab.querySelector('#src-step').addEventListener('click', () => { running = false; advance(); });
  tab.querySelector('#src-reset').addEventListener('click', () => { resetState(); setResetLedger(); });

  layout(); resetState(); setResetLedger();
  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the alternate-sort keys, in order ─────────────────────────────────
function keysTab() {
  const rows = [
    ['1', 'Activity Priority', 'Lower number = higher priority.', 'Considered in 3 ways: static edge priority, time-varying edge priority, and DemandAttributeAssociationProperties priority.'],
    ['2', 'Proportion enabled', 'An edge with proportion enabled gets higher priority.', 'How proportional / split-sourcing lanes are favoured once priority ties.'],
    ['3', 'Activity key', 'Attribute members with the lower key value win.', 'Matching happens for members in the order the Activity node is configured in the SCS Config UI (Activity Node Components).'],
    ['4', 'Activity node end date', 'The activity with the later end date wins.', 'Final tie-break when priority, proportion and key are all equal.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Sorting between multiple producers at a material node</div><div class="section-desc">"The multiple production edges or alternate activities at a node are sorted using the comparison of the following attributes in the mentioned order. The solver uses the next attribute only when the comparison of earlier attributes results in equal priority."</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>#</th><th>Attribute</th><th>Rule</th><th>Notes</th></tr></thead>
          <tbody>
            ${rows.map(([n, a, r, d]) => `<tr><td style="font-weight:700;color:var(--text)">${n}</td><td style="font-weight:600;color:var(--text)">${a}</td><td>${r}</td><td style="color:var(--text2)">${d}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">It is a cascade, not a score</div><div class="info-card-body">Each key is a <strong>tie-breaker for the one above it</strong>. The solver only looks at key 2 when key 1 ties, key 3 when 1 and 2 tie, and key 4 only when 1, 2 and 3 all tie. The <em>first</em> key that leaves a single edge decides the source.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Three sources of priority</div><div class="info-card-body">For key 1, an edge's priority can come from its <strong>static</strong> priority, its <strong>time-varying</strong> priority, or the <strong>DemandAttributeAssociationProperties</strong> priority — all read as "lower number = higher priority".</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Key matched in config order</div><div class="info-card-body">For key 3, member keys are compared <strong>in the order the Activity node's components are configured</strong> in the SCS Config UI, and the member with the smaller key value is preferred.</div></div>
      </div>

      <div class="canvas-explainer">
        <h3>Related: alternate resource consolidation</h3>
        <p>Separately from edge selection, SCS can <strong>consolidate production of a product family onto one of a group of alternate resources per bucket</strong> (Alternate Resource Consolidation). This is a <em>hard constraint</em> implemented by resource blocking — for a product family, only one resource of the group may be consumed in a given bucket, and the others are blocked for that family in that bucket. Demands that cannot fit may be shorted or planned late rather than split across resources, and such cases raise an <code>ARCConstraint</code> RCA in the Capacity RCA output. This is a different mechanism from the per-edge alternate sort above.</p>
      </div>
    </div>`;
}

// ── Tab 3: time-varying alternate priority ───────────────────────────────────
function tvTab() {
  const rows = [
    ['Demand Build Ahead', 'Alternate priority change has no impact', 'Existing logic (off-load to alternate)'],
    ['Demand Build Late', 'Follow the priority in the attempted bucket', 'Follow the priority in the attempted bucket'],
    ['No Carry', 'Alternate priority change has no impact', 'Alternate priority change has no impact'],
    ['SS MOVE_IN', 'Alternate priority change has no impact', 'Alternate priority change has no impact'],
    ['Excess Cleanup MOVE_OUT', 'Alternate priority change has no impact', 'Alternate priority change has no impact'],
    ['BCP (Batch Consolidation Period)', 'Alternate priority change has no impact', 'Alternate priority change has no impact'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Time-varying alternate production activity priority</div><div class="section-desc">The solver supports both static and time-varying alternate-activity priority, letting the preferred alternate change by bucket (e.g. Vessel is primary normally, but Air is preferred during peak). At a material node, the alternate priority <strong>in the produced bucket</strong> — the bucket where the material is required — is the one used to select the alternate.</div></div>

      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Produced-bucket priority selects</div><div class="info-card-body">Selection uses the alternate priority <strong>in the produced time bucket</strong>. In the wiki's A1/A2 example, a demand due in bucket 3 is planned on A1 (primary in bucket 3), while a demand that must build ahead keeps the alternate that was primary in its JIT bucket.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Time-varying beats static</div><div class="info-card-body">The <strong>time-varying priority takes precedence over the static activity priority</strong>. If a bucket has no time-varying value, the solver falls back to the <strong>static</strong> priority for that bucket.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">The measure</div><div class="info-card-body"><em>Time Varying Prod Graph Priority</em> (granularity Activity Node × Material Node × Time × Version), set in the Manufacturing tab of the Config UI. The number is the alternate activity priority for that bucket — lower = higher priority.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">What a priority change does — and does NOT — affect</div><div class="section-desc">The documented interaction of the solver with time-varying activity priority, by planning phase.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Phase</th><th>Prefer Build Ahead Over Alternates (Default)</th><th>Minimize Inventory Build Ahead (off-load to alternate)</th></tr></thead>
          <tbody>
            ${rows.map(([p, a, b]) => `<tr><td style="font-weight:600;color:var(--text)">${p}</td><td>${a}</td><td>${b}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="prose">
        <p>So a time-varying alternate-priority change only steers the <strong>JIT selection</strong> (produced-bucket priority) and <strong>Build-Late</strong> (priority in the attempted bucket). It has <strong>no impact</strong> on Build-Ahead in the default "Prefer Build Ahead Over Alternates" mode, nor on <strong>No Carry</strong>, <strong>Safety-Stock MOVE_IN</strong>, <strong>Excess Cleanup MOVE_OUT</strong>, or <strong>BCP</strong>. For SS planning with <code>MOVE_IN</code>, the Move-In phase uses the activity priority of the "from" bucket and the Make-New phase uses the priority of the SS target (JIT) bucket.</p>
        <p>Time-varying activity priority also composes with <strong>proportional sourcing</strong>: proportions can be defined across primary/alternate paths while the priority varies by bucket, and no new configuration is required beyond the existing time-varying-priority and proportional-sourcing setup.</p>
      </div>
    </div>`;
}
