import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'Walk through the three timing phases the solver tries for a single demand.',
    a: '<strong>JIT → Build-Ahead → Build-Late.</strong> For each demand, during its backward traversal, the solver first tries to arrive <em>exactly on the due date</em> (JIT). If capacity/material make that infeasible, it looks <strong>earlier</strong>, one bucket at a time, carrying the stock — up to the <strong>Build-Ahead Limit (BAL)</strong>. If still unmet, it does a second pass looking <strong>later</strong>, one bucket at a time, minimising lateness — up to the <strong>Build-Late Limit (BLL)</strong>. Anything still unmet past the BLL is <strong>short</strong>, with an RCA reason.',
    tip: 'Stress that JIT and build-ahead happen in one pass, and build-late is a separate second pass for the leftover quantity.' },
  { q: 'What do BAL and BLL let a planner trade off, without touching solver logic?',
    a: 'They bound how far the solver may bend time. A larger <strong>BAL</strong> permits more pre-building → higher on-time service but more carried inventory. A larger <strong>BLL</strong> permits more lateness → fewer hard shortages but later deliveries. Tightening them does the reverse. So BAL/BLL are the dials for trading <strong>service level ⇄ inventory ⇄ shortage</strong> — pure configuration, the heuristic is unchanged.',
    tip: 'Frame BAL/BLL as the service-vs-inventory-vs-shortage control surface.' },
  { q: 'If build-ahead could also satisfy the demand, why would the solver ever choose to go late?',
    a: 'It wouldn’t, for the same quantity — build-ahead is tried first and is preferred over lateness. Build-late only fires for the portion of the demand that <em>no</em> JIT or in-limit build-ahead bucket could cover (e.g. every earlier bucket up to the BAL is capacity-full, or the lead time runs before plan start). Among the late options it then picks the <strong>least-late</strong> feasible bucket.',
    tip: 'Key nuance: it’s per-quantity — part of a demand can be JIT while the remainder is built late.' },
];

// ── timeline model ────────────────────────────────────────────────────────────
const DAYS = 18, CURRENT = 3, DUE = 11, BAL = 4, BLL = 5;
const EARLIEST = DUE - BAL;  // 7
const LATEST = DUE + BLL;    // 16
// scenario → set of free (available-capacity) days
const SCEN = {
  jit:   { name: 'Capacity free on the due date', free: (d) => true, result: 'JIT' },
  ahead: { name: 'Due date blocked → build ahead', free: (d) => d !== DUE, result: 'AHEAD' },
  late:  { name: 'JIT + all build-ahead blocked → build late', free: (d) => d > DUE && d !== DUE + 1, result: 'LATE' },
  short: { name: 'Everything in-window blocked → short', free: (d) => d < EARLIEST || d > LATEST, result: 'SHORT' },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations',
    title: 'JIT · Build-Ahead · Build-Late',
    subtitle: 'For every demand the solver tries three timing phases in a fixed order — on-time, then early (within the Build-Ahead Limit), then late (within the Build-Late Limit) — before it ever reports a shortage. Watch it search the timeline.',
    tabs: [
      { id: 'timeline', label: '⏱️ Timeline Search' },
      { id: 'example',  label: '🧮 Worked Example', content: exampleTab() },
      { id: 'limits',   label: '🎚️ BAL & BLL', content: limitsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildTimeline(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the timeline search animation ──────────────────────────────────────
function buildTimeline(container) {
  const tab = container.querySelector('#tab-timeline');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A demand is due on <b>day ${DUE}</b>. The solver may build as early as <b>day ${EARLIEST}</b> (Build-Ahead Limit = ${BAL}) and as late as <b>day ${LATEST}</b> (Build-Late Limit = ${BLL}). Green cells have free capacity, red are full. Pick a scenario and press <b>Search</b> to watch the phase order.</div>
      <canvas id="tp-canvas" width="800" height="280" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="tp-search">▶ Search</button>
        <button class="ctrl-btn" id="tp-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Scenario:</span>
        <button class="ctrl-btn" data-scen="jit">JIT</button>
        <button class="ctrl-btn" data-scen="ahead">Build-Ahead</button>
        <button class="ctrl-btn" data-scen="late">Build-Late</button>
        <button class="ctrl-btn" data-scen="short">Short</button>
      </div>
      <div id="tp-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The search always starts on the <strong>due date</strong>. If that bucket has capacity it's a clean <strong>JIT</strong> fill — the preferred outcome, no early carry and no lateness. If not, the solver walks <strong>left</strong> one bucket at a time looking for an earlier free bucket to <strong>build ahead</strong> into, but it will not cross the <strong>Build-Ahead Limit</strong>. Only when no in-limit earlier bucket works does it make a second pass <strong>right</strong>, taking the <strong>least-late</strong> free bucket within the <strong>Build-Late Limit</strong>. Past that limit the quantity is <strong>short</strong> and gets an RCA reason.</p>
      <p><strong>Interview angle:</strong> the order is fixed and preference-ordered — on-time beats early, early beats late, late beats short. BAL and BLL are just the walls on how far left and right it may look.</p>
    </div>`;

  const canvas = tab.querySelector('#tp-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const gx = 40, gw = 720, cellW = gw / DAYS, gy = 120, cellH = 46;
  let scen = 'ahead';
  let scan = null;      // {day, phase} current scan marker
  let chosen = null;    // {day, phase}
  let anim = null;

  function free(d) { return SCEN[scen].free(d) && d >= CURRENT; }
  function dayX(d) { return gx + (d - 1) * cellW; }

  function setLedger(items) {
    tab.querySelector('#tp-ledger').innerHTML = items.map(r => `
      <div class="info-card" style="border-left:3px solid ${r.color}"><div class="info-card-title">${r.title}</div><div class="info-card-body">${r.body}</div></div>`).join('');
  }

  function reset() {
    if (anim) { clearTimeout(anim); anim = null; }
    scan = null; chosen = null;
    setLedger([{ color: '#64748B', title: SCEN[scen].name, body: 'Press <b>Search</b> to run the phase order on this capacity pattern.' }]);
  }

  function search() {
    if (anim) { clearTimeout(anim); anim = null; }
    chosen = null;
    const steps = [];
    // JIT
    steps.push({ day: DUE, phase: 'JIT' });
    // build-ahead: DUE-1 down to EARLIEST
    for (let d = DUE - 1; d >= EARLIEST; d--) steps.push({ day: d, phase: 'AHEAD' });
    // build-late: DUE+1 up to LATEST
    for (let d = DUE + 1; d <= LATEST; d++) steps.push({ day: d, phase: 'LATE' });

    let i = 0;
    const tick = () => {
      if (i >= steps.length) { // short
        chosen = { day: null, phase: 'SHORT' };
        finish();
        return;
      }
      scan = steps[i];
      if (free(scan.day)) { chosen = { ...scan }; finish(); return; }
      i++;
      anim = setTimeout(tick, 420);
    };
    tick();
  }

  function finish() {
    scan = null;
    const phaseInfo = {
      JIT:   { color: '#10B981', title: '✓ JIT — on time', body: `Capacity free on due day ${DUE}. Supply arrives exactly on time — no early carry, no lateness.` },
      AHEAD: { color: '#38BDF8', title: `✓ Build-Ahead — day ${chosen.day}`, body: `Due day was blocked; earliest free bucket within the Build-Ahead Limit is day ${chosen.day}. Build there and carry ${DUE - chosen.day} day(s) of stock.` },
      LATE:  { color: '#F59E0B', title: `✓ Build-Late — day ${chosen.day}`, body: `No JIT or in-limit earlier bucket worked. Least-late free bucket within the Build-Late Limit is day ${chosen.day} → ${chosen.day - DUE} day(s) late.` },
      SHORT: { color: '#EF4444', title: '✗ Short', body: `Every bucket from day ${EARLIEST} to day ${LATEST} is full. Past the Build-Late Limit → the quantity is short and gets an RCA reason.` },
    };
    setLedger([{ color: '#64748B', title: SCEN[scen].name, body: `Due day ${DUE} · Build-Ahead Limit ${BAL} (earliest day ${EARLIEST}) · Build-Late Limit ${BLL} (latest day ${LATEST}).` }, phaseInfo[chosen.phase]]);
  }

  let raf = null;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // window bands: build-ahead (blue) / due (green) / build-late (amber)
    ctx.fillStyle = '#38BDF810'; ctx.fillRect(dayX(EARLIEST), gy - 26, cellW * BAL, cellH + 26);
    ctx.fillStyle = '#F59E0B10'; ctx.fillRect(dayX(DUE + 1), gy - 26, cellW * BLL, cellH + 26);

    // capacity cells
    for (let d = 1; d <= DAYS; d++) {
      const x = dayX(d);
      const before = d < CURRENT;
      const ok = free(d);
      let fill = '#0d1424', stroke = '#1E293B';
      if (!before) { fill = ok ? '#10381f' : '#3a1414'; stroke = ok ? '#10B98166' : '#EF444466'; }
      drawRoundRect(ctx, x + 2, gy, cellW - 4, cellH, 5, fill, stroke);
      // day number
      ctx.textAlign = 'center'; ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText(String(d), x + cellW / 2, gy + cellH + 14);
      if (before) { ctx.fillStyle = '#334155'; ctx.font = '8px system-ui'; ctx.fillText('·', x + cellW / 2, gy + cellH / 2 + 3); }
    }

    // markers: current, due, limits
    const vline = (d, color, label, dash) => {
      const x = dayX(d) + cellW / 2;
      ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, gy - 28); ctx.lineTo(x, gy + cellH + 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, x, gy - 34);
    };
    vline(CURRENT, '#64748B', 'current', [3, 3]);
    vline(EARLIEST, '#38BDF8', '◀ BAL', [4, 3]);
    vline(DUE, '#10B981', 'DUE', []);
    vline(LATEST, '#F59E0B', 'BLL ▶', [4, 3]);

    // scan marker
    if (scan) {
      const x = dayX(scan.day) + cellW / 2;
      ctx.beginPath(); ctx.arc(x, gy - 6, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#C7D2FE'; ctx.fill();
      ctx.font = '9px system-ui'; ctx.fillStyle = '#C7D2FE'; ctx.textAlign = 'center';
      ctx.fillText('scanning…', x, gy + cellH + 28);
    }
    // chosen marker
    if (chosen && chosen.day) {
      const x = dayX(chosen.day) + cellW / 2;
      const col = chosen.phase === 'JIT' ? '#10B981' : chosen.phase === 'AHEAD' ? '#38BDF8' : '#F59E0B';
      ctx.beginPath(); ctx.arc(x, gy + cellH / 2, 9, 0, Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.font = 'bold 10px system-ui'; ctx.fillStyle = col; ctx.textAlign = 'center';
      ctx.fillText(chosen.phase, x, gy + cellH + 28);
    }
    if (chosen && chosen.phase === 'SHORT') {
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#EF4444'; ctx.textAlign = 'center';
      ctx.fillText('SHORT — no feasible bucket in window', gx + gw / 2, gy + cellH + 30);
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#10B981'; ctx.fillText('■ free capacity', gx, 36);
    ctx.fillStyle = '#EF4444'; ctx.fillText('■ full', gx + 120, 36);
    ctx.fillStyle = '#38BDF8'; ctx.fillText('build-ahead window', gx + 190, 36);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('build-late window', gx + 340, 36);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scen = b.dataset.scen; reset(); }));
  tab.querySelector('#tp-search').addEventListener('click', search);
  tab.querySelector('#tp-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); if (anim) clearTimeout(anim); };
}

function exampleTab() {
  const rows = [
    ['Due Day 10, lead time 4, capacity free', 'JIT', 'Start Day 6, arrive Day 10 — on time ✓'],
    ['Due Day 10, but Day 6–10 capacity full', 'Build-Ahead', 'Start earlier (Day 3), arrive Day 8, carry 2 days'],
    ['Due Day 10, lead time 9, current Day 4', 'Build-Late', 'Earliest arrival Day 13 → 3 days late (within BLL)'],
    ['Due Day 10, lead time 20', 'Shortage', 'Beyond Build-Late Limit → short; RCA = LeadTimePlanBeforeCurrent'],
  ];
  return `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Which phase fires, and why</div></div>
      <table class="compare-table">
        <thead><tr><th>Situation</th><th>Phase</th><th>Outcome</th></tr></thead>
        <tbody>${rows.map(([s, p, o]) => `<tr><td>${s}</td><td style="font-weight:600;color:var(--text)">${p}</td><td style="color:var(--text2)">${o}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose"><p>The phases are tried <strong>per demand</strong>, in order, during that demand’s backward traversal — not globally. A high-priority demand may get JIT while a lower one on the same item is pushed to Build-Late because the earlier demand already consumed the capacity. The build-ahead note from the docs: by default it builds ahead on the primary path bucket-by-bucket until the limit, <em>then</em> goes to alternate activities — a flag can instead minimise earliness by checking all activities in a bucket before stepping earlier.</p></div></div>`;
}

function limitsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Build-Ahead Limit & Build-Late Limit</div><div class="section-desc">Two configured windows that bound how far the solver may bend time. Both are Basic parameters in the SCS config.</div></div>
      <div class="info-grid">
        <div class="info-card"><div class="info-card-title">Build-Ahead Limit (BAL)</div><div class="info-card-body">The maximum number of periods the solver may build <strong>before</strong> a demand’s due date. Larger BAL = more pre-building and carried inventory; smaller BAL = more lateness/shortage. Related to the Current Time Bucket.</div></div>
        <div class="info-card"><div class="info-card-title">Build-Late Limit (BLL)</div><div class="info-card-body">The maximum number of periods a demand may be met <strong>after</strong> its due date before it is declared short. Larger BLL = fewer shortages but more lateness. Bounded by the End Time Bucket.</div></div>
      </div>
      <div class="prose"><p>Tuning BAL/BLL is how planners trade <strong>on-time service</strong> against <strong>inventory</strong> and <strong>shortages</strong> — without touching the solver’s logic, only its limits. (The <em>Late Plan Strategy</em> parameter — e.g. LINEAR — further shapes how lateness is distributed across the build-late window.)</p></div>
    </div>`;
}
