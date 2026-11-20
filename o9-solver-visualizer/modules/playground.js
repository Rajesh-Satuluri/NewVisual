// playground.js — "Solver Playground" auxiliary page.
//
// An interactive one-demand planning sandbox. Every number shown is produced by
// the REAL, unit-tested engine helpers in sim/scs-engine.js — never invented and
// never from the stubbed ScsSolver.solve(). Change an input and watch the three
// core decisions recompute live: net requirement → lot rounding → start day.
import { netRequirement, roundToLot, offsetByLeadTime, sortDemands } from '../sim/scs-engine.js';

// ── Working calendar ─────────────────────────────────────────────────────────
// A 28-day horizon, day 0 = Monday. Working days are Mon–Fri; weekends (indices
// where day % 7 is 5 or 6) are dropped, exactly the ascending working-day array
// offsetByLeadTime() expects.
const HORIZON = 28;
const isWeekend = d => (d % 7) === 5 || (d % 7) === 6;
const CALENDAR = Array.from({ length: HORIZON }, (_, d) => d).filter(d => !isWeekend(d));

const DEFAULTS = { demand: 80, boh: 20, ss: 10, min: 20, mult: 25, max: 300, leadTime: 4, dueDay: 18 };

// The four seed demands for the sorter panel (editable live).
const SEED_DEMANDS = [
  { priority: 2, dueDate: 18, qty: 40, key: 'SO-A' },
  { priority: 1, dueDate: 20, qty: 60, key: 'SO-B' },
  { priority: 2, dueDate: 18, qty: 25, key: 'SO-C' },
  { priority: 3, dueDate: 12, qty: 90, key: 'SO-D' },
];

// Snap a due day to the nearest working day <= it, and report its calendar index
// (mirrors offsetByLeadTime's own snapping so the UI can explain the walk).
function calIndex(dueDay) {
  let idx = CALENDAR.indexOf(dueDay);
  if (idx === -1) {
    for (let i = CALENDAR.length - 1; i >= 0; i--) { if (CALENDAR[i] <= dueDay) { idx = i; break; } }
    if (idx === -1) idx = 0;
  }
  return idx;
}

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Playground</div>
        <h1 class="module-title">Solver Playground</h1>
        <p class="module-subtitle">Drive one demand through the solver's core math. Every figure here is computed by the same tested engine functions the solver uses — net requirement, lot rounding and the backward lead-time walk — so the sandbox never lies.</p>
      </div>
      <div class="scroll-content">

        <div class="section-header"><div class="section-title">One-demand planning</div><div class="section-desc">Set the inputs; the three decision cards recompute live.</div></div>

        <div class="info-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          ${ctrl('pg-demand', 'Demand', DEFAULTS.demand, 0, 500)}
          ${ctrl('pg-boh', 'On-Hand (BOH)', DEFAULTS.boh, 0, 500)}
          ${ctrl('pg-ss', 'Safety Stock', DEFAULTS.ss, 0, 200)}
          ${ctrl('pg-min', 'Lot Min', DEFAULTS.min, 0, 500)}
          ${ctrl('pg-mult', 'Lot Multiple', DEFAULTS.mult, 1, 200)}
          ${ctrl('pg-max', 'Lot Max', DEFAULTS.max, 0, 1000)}
          ${ctrl('pg-lt', 'Lead Time (working days)', DEFAULTS.leadTime, 0, 15)}
          ${ctrl('pg-due', 'Due Day (0–27)', DEFAULTS.dueDay, 0, HORIZON - 1)}
        </div>

        <div style="margin:8px 0 18px"><button class="ctrl-btn" id="pg-reset">↺ Reset to defaults</button></div>

        <div class="info-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
          <div class="info-card" style="border-left:3px solid #38BDF8">
            <div class="info-card-title">① Net Requirement</div>
            <div style="font:700 34px system-ui;color:#38BDF8;margin:6px 0" id="pg-net">0</div>
            <div class="info-card-body" id="pg-net-why"></div>
          </div>
          <div class="info-card" style="border-left:3px solid #A78BFA">
            <div class="info-card-title">② Lot-Rounded Quantity</div>
            <div style="font:700 34px system-ui;color:#A78BFA;margin:6px 0" id="pg-lot">0</div>
            <div class="info-card-body" id="pg-lot-why"></div>
          </div>
          <div class="info-card" style="border-left:3px solid #10B981">
            <div class="info-card-title">③ Start Day</div>
            <div style="font:700 34px system-ui;color:#10B981;margin:6px 0" id="pg-start">—</div>
            <div class="info-card-body" id="pg-start-why"></div>
          </div>
        </div>

        <div class="canvas-wrap" style="margin-top:16px">
          <div class="canvas-caption">The planning horizon. <b style="color:#10B981">Start</b> is stepped back from <b style="color:#F59E0B">Due</b> by the lead time over <b>working days only</b> — weekends (greyed) are skipped.</div>
          <canvas id="pg-canvas" width="820" height="150" style="width:100%;max-width:820px"></canvas>
        </div>

        <div class="canvas-explainer">
          <h3>What you're watching</h3>
          <p><strong>Net requirement</strong> is <code>max(0, demand − on-hand + safety stock)</code> — the quantity the solver must still create. <strong>Lot rounding</strong> raises it to the minimum, ceils to the order multiple, then caps at the max; any gap above net requirement is <em>excess</em> that will later need cleanup. The <strong>start day</strong> is the due day walked backward by the lead time across the working calendar; if the walk runs off the front of the horizon, the solver reports a <em>plan-before-current</em> condition and starts at day one.</p>
        </div>

        <div class="section-header" style="margin-top:26px"><div class="section-title">Demand priority sorter</div><div class="section-desc">The solver plans one demand at a time in sorted order: Priority → Fair-Share → Due Date → <b>lower Quantity first</b> → key. Edit the rows and watch the real sort reorder them.</div></div>
        <div class="table-scroll">
          <table class="compare-table" id="pg-dtable">
            <thead><tr><th>Key</th><th>Priority</th><th>Due Day</th><th>Qty</th></tr></thead>
            <tbody id="pg-dbody"></tbody>
          </table>
        </div>
        <div class="canvas-explainer" style="margin-top:12px">
          <h3>Planning order (sorted)</h3>
          <div id="pg-order" style="font:600 14px system-ui;color:var(--text2);line-height:1.9"></div>
        </div>

      </div>
    </div>`;

  // ── Single-demand pipeline ────────────────────────────────────────────────
  const ids = ['demand', 'boh', 'ss', 'min', 'mult', 'max', 'lt', 'due'];
  const el = {};
  ids.forEach(k => { el[k] = container.querySelector('#pg-' + k); });
  const netEl = container.querySelector('#pg-net'), netWhy = container.querySelector('#pg-net-why');
  const lotEl = container.querySelector('#pg-lot'), lotWhy = container.querySelector('#pg-lot-why');
  const startEl = container.querySelector('#pg-start'), startWhy = container.querySelector('#pg-start-why');
  const canvas = container.querySelector('#pg-canvas');
  const ctx = canvas.getContext('2d');

  const val = k => {
    const n = Number(el[k].value);
    return Number.isFinite(n) ? n : 0;
  };

  function derive() {
    const demand = val('demand'), boh = val('boh'), ss = val('ss');
    const min = val('min'), mult = Math.max(1, val('mult')), max = val('max');
    const leadTime = val('lt'), dueDay = Math.max(0, Math.min(HORIZON - 1, val('due')));
    const net = netRequirement(demand, boh, ss);
    const lot = roundToLot(net, { min, mult, max });
    const uncapped = roundToLot(net, { min, mult, max: Infinity });
    const capped = uncapped > lot;
    const excess = Math.max(0, lot - net);
    const idx = calIndex(dueDay);
    const start = offsetByLeadTime(dueDay, CALENDAR, leadTime);
    const offFront = (idx - leadTime) < 0;
    return { demand, boh, ss, min, mult, max, leadTime, dueDay, net, lot, uncapped, capped, excess, start, offFront };
  }

  // Eased display state for the three headline numbers.
  const disp = { net: 0, lot: 0 };
  let raf = null;

  function render() {
    const d = derive();

    // eased numbers
    disp.net += (d.net - disp.net) * 0.25;
    disp.lot += (d.lot - disp.lot) * 0.25;
    netEl.textContent = Math.round(disp.net);
    lotEl.textContent = Math.round(disp.lot);
    startEl.textContent = d.net <= 0 ? '—' : ('Day ' + d.start);

    netWhy.innerHTML = `max(0, ${d.demand} − ${d.boh} + ${d.ss}) = <strong>${d.net}</strong>` +
      (d.net === 0 ? ' · on-hand already covers it, no supply needed' : '');
    if (d.net <= 0) {
      lotWhy.innerHTML = 'No net requirement → no lot to build.';
      startWhy.innerHTML = 'Nothing to start.';
    } else {
      lotWhy.innerHTML = `raise to min ${d.min}, ceil to ×${d.mult}` + (d.max > 0 ? `, cap at ${d.max}` : '') +
        ` → <strong>${d.lot}</strong>` +
        (d.excess > 0 ? ` · <span style="color:#F59E0B">+${d.excess} excess</span>` : '') +
        (d.capped ? ` · <span style="color:#EF4444">capped (wanted ${d.uncapped})</span>` : '');
      startWhy.innerHTML = `Day ${d.dueDay} back ${d.leadTime} working day(s) → <strong>Day ${d.start}</strong>` +
        (d.offFront ? ` · <span style="color:#EF4444">plan-before-current — clamped to Day ${CALENDAR[0]}</span>` : '');
    }

    drawTimeline(d);
    raf = requestAnimationFrame(render);
  }

  function drawTimeline(d) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
    const padX = 20, cellW = (W - padX * 2) / HORIZON, top = 46, cellH = 40;

    for (let day = 0; day < HORIZON; day++) {
      const x = padX + day * cellW;
      const wknd = isWeekend(day);
      ctx.fillStyle = wknd ? '#0d1322' : '#131c30';
      ctx.fillRect(x + 1, top, cellW - 2, cellH);
      ctx.strokeStyle = '#1e2a3f'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, top, cellW - 2, cellH);
      ctx.fillStyle = wknd ? '#3a4a63' : '#64748B';
      ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(day, x + cellW / 2, top + cellH + 14);
    }

    const pin = (day, color, label) => {
      const x = padX + day * cellW + cellW / 2;
      ctx.fillStyle = color;
      ctx.fillRect(x - 1.5, top - 6, 3, cellH + 12);
      ctx.beginPath(); ctx.arc(x, top - 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, x, top - 18);
    };

    if (d.net > 0) {
      // span bracket between start and due
      const xs = padX + d.start * cellW + cellW / 2;
      const xd = padX + d.dueDay * cellW + cellW / 2;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xs, top + cellH + 24); ctx.lineTo(xd, top + cellH + 24); ctx.stroke();
      ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`${d.leadTime} working-day lead time`, (xs + xd) / 2, top + cellH + 38);
      pin(d.start, '#10B981', 'Start');
      pin(d.dueDay, '#F59E0B', 'Due');
    } else {
      pin(d.dueDay, '#F59E0B', 'Due');
      ctx.fillStyle = '#475569'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('No supply required', W / 2, top + cellH + 38);
    }
  }

  ids.forEach(k => el[k].addEventListener('input', () => {}));  // live via rAF; listener keeps focus behaviour crisp
  container.querySelector('#pg-reset').addEventListener('click', () => {
    el.demand.value = DEFAULTS.demand; el.boh.value = DEFAULTS.boh; el.ss.value = DEFAULTS.ss;
    el.min.value = DEFAULTS.min; el.mult.value = DEFAULTS.mult; el.max.value = DEFAULTS.max;
    el.lt.value = DEFAULTS.leadTime; el.due.value = DEFAULTS.dueDay;
    renderDemands(SEED_DEMANDS.map(x => ({ ...x })));
  });

  // ── Demand sorter ─────────────────────────────────────────────────────────
  const dbody = container.querySelector('#pg-dbody');
  const orderEl = container.querySelector('#pg-order');
  let demands = SEED_DEMANDS.map(x => ({ ...x }));

  function renderDemands(list) {
    if (list) demands = list;
    dbody.innerHTML = demands.map((d, i) => `
      <tr>
        <td style="font-weight:600;color:var(--text)">${d.key}</td>
        <td><input class="pg-d" data-i="${i}" data-f="priority" type="number" value="${d.priority}" style="width:64px"></td>
        <td><input class="pg-d" data-i="${i}" data-f="dueDate" type="number" value="${d.dueDate}" style="width:64px"></td>
        <td><input class="pg-d" data-i="${i}" data-f="qty" type="number" value="${d.qty}" style="width:72px"></td>
      </tr>`).join('');
    dbody.querySelectorAll('.pg-d').forEach(inp => inp.addEventListener('input', () => {
      const i = +inp.dataset.i, f = inp.dataset.f;
      demands[i][f] = Number(inp.value) || 0;
      renderOrder();
    }));
    renderOrder();
  }

  function renderOrder() {
    const sorted = sortDemands(demands);
    orderEl.innerHTML = sorted.map((d, i) =>
      `<span style="display:inline-block;margin-right:6px"><b style="color:var(--accent)">${i + 1}.</b> ${d.key} <span style="color:var(--text3);font-weight:400">(pri ${d.priority}, due ${d.dueDate}, qty ${d.qty})</span></span>`
    ).join(' <span style="color:var(--text3)">→</span> ');
  }

  renderDemands();
  render();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// Small labelled number-input control card.
function ctrl(id, label, value, min, max) {
  return `
    <div class="info-card" style="padding:12px 14px">
      <label for="${id}" class="info-card-title" style="display:block;margin-bottom:6px;font-size:12px">${label}</label>
      <input id="${id}" type="number" value="${value}" min="${min}" max="${max}"
             style="width:100%;background:#0d1322;border:1px solid #1e2a3f;border-radius:6px;color:var(--text);padding:7px 9px;font:600 15px system-ui">
    </div>`;
}
