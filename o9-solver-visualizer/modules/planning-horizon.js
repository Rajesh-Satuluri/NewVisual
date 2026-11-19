import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What are Plan Start, Plan Current and Plan End, and what does each bound?',
    a: 'They define the <strong>planning horizon</strong> — the total duration the plan covers. <strong>Plan Start</strong> is the first bucket; <strong>Plan Current</strong> is "now" (defaults to the LiveServer current bucket, else the GraphCube current, and can be overridden at invocation); <strong>Plan End</strong> is the last bucket (NULL = run to the last bucket in the model). They’re set via <code>Start/Current/End Time Bucket Name</code>, all in sync with the <code>Time Attribute Name</code> (Fiscal Week / Month / Year).',
    tip: 'Start = horizon left edge, Current = now, End = horizon right edge. Current defaults to the server’s current bucket.' },
  { q: 'What happens to a demand whose due date is (a) outside the horizon, and (b) before Plan Current?',
    a: '(a) A demand <strong>outside</strong> the horizon (before Start or after End) is <strong>strictly ignored</strong> by SCS. (b) A demand <strong>between Start and Current</strong> is <strong>shifted to the Current bucket</strong> and planned on or after it — <em>regardless</em> of the Build-Late Limit. If there is supply at Current it’s met there; if not and BLL &gt; 0 it looks at later buckets up to the BLL; if BLL = 0 it is shorted. Either way the RCA reason is <strong>lead time plan before current</strong>.',
    tip: 'Key nuance: the shift to Current happens whether or not a BLL is set — BLL only governs going later than Current.' },
  { q: 'How does the horizon affect supply — specifically Beginning-On-Hand defined before Plan Current?',
    a: '<strong>BOH defined earlier than the current bucket is ignored</strong> — on-hand is only applicable <em>at</em> the current time bucket. Expected Receipts are assumed to arrive on their date, and for planning the cumulative supplies are treated as available at Plan Current. So inventory sitting in a pre-current bucket does not help the plan; only on-hand at Current (plus receipts) counts.',
    tip: 'Say "BOH only counts at Plan Current; anything on-hand before current is ignored" — a classic source of phantom shortages.' },
];

// buckets W08..W22
const B0 = 8, BN = 22;
const START = 10, CURRENT = 15, END = 20;
const BUCKETS = []; for (let w = B0; w <= BN; w++) BUCKETS.push(w);

const SCEN = {
  outside: {
    label: 'Demands outside the horizon are ignored',
    demands: [
      { id: 'D1', due: 8,  qty: 50,  fate: 'ignored', reason: 'Due W08 is before Plan Start (W10) → strictly ignored.' },
      { id: 'D3', due: 17, qty: 80,  fate: 'met', planAt: 17, reason: 'Due W17 is inside the horizon and at/after Current → planned JIT at W17.' },
      { id: 'D2', due: 22, qty: 60,  fate: 'ignored', reason: 'Due W22 is after Plan End (W20) → strictly ignored.' },
    ],
    supplies: [{ type: 'BOH', bucket: 15, qty: 200 }],
  },
  shift: {
    label: 'Before Current → shifted to Current, then met (wiki case 1)',
    demands: [{ id: 'D1', due: 11, qty: 100, bll: 0, fate: 'met', planAt: 15, shift: true, reason: 'Due W11 is between Start and Current → shifted to W15. BOH 100 at W15 → met in full at Current.' }],
    supplies: [{ type: 'BOH', bucket: 15, qty: 100 }],
  },
  short: {
    label: 'Shifted to Current, BLL=0, supply only later → short (wiki case 2)',
    demands: [{ id: 'D1', due: 11, qty: 100, bll: 0, fate: 'short', planAt: 15, shift: true, reason: 'Shifted to W15. No supply at W15; ER is at W16 but BLL=0 → cannot late past Current → SHORT. RCA: lead time plan before current.' }],
    supplies: [{ type: 'ER', bucket: 16, qty: 100 }],
  },
  boh: {
    label: 'BOH before Current is ignored',
    demands: [{ id: 'D1', due: 16, qty: 200, fate: 'partial', planAt: 16, reason: 'BOH 100 at W12 is BEFORE Current → ignored. Only BOH 100 at W15 counts → 100 met, 100 short.' }],
    supplies: [{ type: 'BOH', bucket: 12, qty: 100, ignored: true }, { type: 'BOH', bucket: 15, qty: 100 }],
  },
};

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Network & Data Model',
    title: 'Planning Horizon — Start · Current · End',
    subtitle: 'The horizon is the window the plan lives in. Demands outside it vanish, demands before "now" snap to Current, and on-hand before Current is ignored. Run the scenarios and watch the rules bite.',
    tabs: [
      { id: 'horizon', label: '📅 Horizon Timeline' },
      { id: 'params',  label: '🎛️ The 4 Parameters', content: paramsTab() },
      { id: 'rules',   label: '⚖️ Demand & Supply Rules', content: rulesTab() },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-horizon');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Horizon: <b>Plan.Start = W10</b>, <b>Plan.Current = W15</b>, <b>Plan.End = W20</b>. Demands sit above the timeline, supplies (BOH / ER) below. Pick a scenario and press <b>Run</b> — ignored items fade, pre-Current demands slide to W15.</div>
      <canvas id="ph-canvas" width="820" height="280" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" data-scen="outside">Outside horizon</button>
        <button class="ctrl-btn" data-scen="shift">Shift to current</button>
        <button class="ctrl-btn" data-scen="short">Short (BLL=0)</button>
        <button class="ctrl-btn" data-scen="boh">BOH before current</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <button class="ctrl-btn" id="ph-run">▶ Run</button>
        <button class="ctrl-btn" id="ph-reset">↺ Reset</button>
      </div>
      <div id="ph-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Three rules do all the work. <strong>Outside the horizon → ignored:</strong> a due date before Start or after End is dropped entirely. <strong>Before Current → shifted:</strong> a demand between Start and Current snaps to the Current bucket and is planned there or later — this happens whether or not a Build-Late Limit is set. <strong>On-hand before Current → ignored:</strong> BOH only counts at the Current bucket, so inventory parked in an earlier bucket can’t cover anything (a classic source of "phantom" shortages).</p>
      <p><strong>Interview angle:</strong> if a planner asks "why is this demand short when I have stock?", check the horizon first — the stock may be in a pre-current bucket, or the demand may have been shifted to Current where that stock isn’t.</p>
    </div>`;

  const canvas = tab.querySelector('#ph-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const gx = 30, gw = 760, tY = 135, tH = 30;
  const cellW = gw / BUCKETS.length;
  const bx = (w) => gx + (w - B0) * cellW;         // left x of bucket w
  const bcx = (w) => bx(w) + cellW / 2;            // center x

  let scen = 'shift';
  let running = false;
  // animated demand positions keyed by id: {curW (float), targetW, fate, shown}
  let anim = {};

  function setup() {
    anim = {};
    SCEN[scen].demands.forEach(d => { anim[d.id] = { curW: d.due, targetW: d.due, revealed: false }; });
    tab.querySelector('#ph-ledger').innerHTML = `<div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">${SCEN[scen].label}</div><div class="info-card-body">Press <b>Run</b> to apply the horizon rules.</div></div>`;
  }

  function run() {
    if (running) return;
    running = true;
    const ds = SCEN[scen].demands;
    // set targets (shift) and reveal fate progressively
    ds.forEach((d, i) => {
      setTimeout(() => {
        if (d.shift && d.planAt) anim[d.id].targetW = d.planAt;
        anim[d.id].revealed = true;
        renderLedger(i + 1);
      }, 500 + i * 700);
    });
    setTimeout(() => { running = false; }, 500 + ds.length * 700 + 200);
  }

  function renderLedger(upto) {
    const ds = SCEN[scen].demands;
    const items = [`<div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">${SCEN[scen].label}</div><div class="info-card-body">Plan.Start W10 · Plan.Current W15 · Plan.End W20.</div></div>`];
    ds.slice(0, upto).forEach(d => {
      const col = d.fate === 'met' ? '#10B981' : d.fate === 'short' ? '#EF4444' : d.fate === 'partial' ? '#F59E0B' : '#64748B';
      const tag = d.fate === 'met' ? '✓ met' : d.fate === 'short' ? '✗ short' : d.fate === 'partial' ? '◑ partial' : '∅ ignored';
      items.push(`<div class="info-card" style="border-left:3px solid ${col}"><div class="info-card-title">${d.id} · ${d.qty} units · due W${d.due} <span class="pill" style="background:${col}22;color:${col}">${tag}</span></div><div class="info-card-body">${d.reason}</div></div>`);
    });
    tab.querySelector('#ph-ledger').innerHTML = items.join('');
  }

  function reset() { running = false; setup(); }

  let raf = null;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // out-of-horizon shading (before Start, after End)
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(bx(B0), tY - 2, bx(START) - bx(B0), tH + 4);
    ctx.fillRect(bx(END + 1), tY - 2, bx(BN + 1) - bx(END + 1), tH + 4);
    // in-horizon band
    ctx.fillStyle = '#10203a';
    ctx.fillRect(bx(START), tY, bx(END + 1) - bx(START), tH);

    // bucket cells + labels
    BUCKETS.forEach(w => {
      const inH = w >= START && w <= END;
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
      ctx.strokeRect(bx(w), tY, cellW, tH);
      ctx.textAlign = 'center'; ctx.font = '8px system-ui';
      ctx.fillStyle = inH ? '#94A3B8' : '#3a4452';
      ctx.fillText('W' + w, bcx(w), tY + tH + 12);
    });

    // markers
    const vmark = (w, color, label) => {
      const x = bx(w);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, tY - 20); ctx.lineTo(x, tY + tH + 16); ctx.stroke();
      ctx.fillStyle = color; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(label, x + 3, tY - 22);
    };
    vmark(START, '#38BDF8', 'Start W10');
    vmark(CURRENT, '#10B981', 'Current W15');
    vmark(END + 1, '#F59E0B', 'End W20');

    // supplies (below)
    (SCEN[scen].supplies || []).forEach(s => {
      const x = bx(s.bucket) + 4, y = tY + tH + 20, w = cellW - 8, h = 22;
      const ign = s.ignored || s.bucket < CURRENT && s.type === 'BOH';
      const col = ign ? '#475569' : (s.type === 'BOH' ? '#38BDF8' : '#2DD4BF');
      drawRoundRect(ctx, x, y, w, h, 5, ign ? '#15171c' : '#0d1424', col);
      ctx.textAlign = 'center'; ctx.font = 'bold 8px system-ui'; ctx.fillStyle = col;
      ctx.fillText(`${s.type} ${s.qty}`, x + w / 2, y + 10);
      if (ign) { ctx.font = '7px system-ui'; ctx.fillStyle = '#EF4444'; ctx.fillText('ignored', x + w / 2, y + 19); }
    });

    // demands (above) — animate toward targetW
    SCEN[scen].demands.forEach(d => {
      const a = anim[d.id];
      a.curW += (a.targetW - a.curW) * 0.14;
      const cx = bcx(a.curW), y = tY - 58;
      const ignored = a.revealed && d.fate === 'ignored';
      let col = '#A78BFA';
      if (a.revealed) col = d.fate === 'met' ? '#10B981' : d.fate === 'short' ? '#EF4444' : d.fate === 'partial' ? '#F59E0B' : '#475569';
      ctx.save(); ctx.globalAlpha = ignored ? 0.35 : 1;
      drawRoundRect(ctx, cx - 30, y, 60, 26, 7, ignored ? '#15171c' : '#140f24', col);
      ctx.textAlign = 'center'; ctx.font = 'bold 10px system-ui'; ctx.fillStyle = col;
      ctx.fillText(d.id, cx, y + 11); ctx.font = '8px system-ui'; ctx.fillStyle = '#8A98AE';
      ctx.fillText(d.qty + 'u', cx, y + 21);
      ctx.restore();
      // drop line to timeline
      ctx.strokeStyle = col + '66'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(cx, y + 26); ctx.lineTo(cx, tY); ctx.stroke(); ctx.setLineDash([]);
      // shift arrow hint
      if (d.shift && a.revealed && Math.abs(a.curW - d.due) > 0.3) {
        ctx.fillStyle = '#10B981'; ctx.font = '8px system-ui'; ctx.fillText('→ shifted to Current', cx, y - 4);
      }
    });

    // legend
    ctx.textAlign = 'left'; ctx.font = '9px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('demands ▲ above · supplies ▼ below · shaded = outside horizon', gx, 24);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelectorAll('[data-scen]').forEach(b => b.addEventListener('click', () => { scen = b.dataset.scen; reset(); }));
  tab.querySelector('#ph-run').addEventListener('click', run);
  tab.querySelector('#ph-reset').addEventListener('click', reset);
  setup();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function paramsTab() {
  const rows = [
    ['Time Attribute Name', 'The bucket unit the solver plans in: <code>[time].[Fiscal Week]</code>, <code>[Fiscal Month]</code> or <code>[Fiscal Year]</code>. Everything else must be in sync with this.'],
    ['Start Time Bucket Name', 'The first bucket of the horizon — any value of the chosen time unit (e.g. a Week if the attribute is Fiscal Week).'],
    ['Current Time Bucket Name', 'The "now" bucket. Defaults to the LiveServer current time (else the GraphCube current). Can be overridden at invocation.'],
    ['End Time Bucket Name', 'The last bucket. If NULL, the solver runs to the last bucket that exists in the model.'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The four horizon parameters</div><div class="section-desc">Set in the Parameter tab of the SCS config UI. Start/Current/End must all match the Time Attribute Name’s unit.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Parameter</th><th>What it sets</th></tr></thead>
          <tbody>${rows.map(([p, d]) => `<tr><td style="font-weight:600;color:var(--text)">${p}</td><td>${d}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">⚠️ Keep units in sync</div><div class="info-card-body">It’s a mistake to set Start = <code>W01-2015</code> and End = <code>M01-2015</code> if the Time Attribute is <code>[Fiscal Month]</code> — both must be month values.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Horizon length varies</div><div class="info-card-body">Electronics might plan a <strong>1-year</strong> horizon; a distribution deployment plan might be as short as <strong>2 weeks</strong>. The horizon is a business choice, not a fixed setting.</div></div>
      </div>
    </div>`;
}

function rulesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">How the horizon impacts demand</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">Outside horizon → ignored</div><div class="info-card-body">Demands with a due date <strong>before Start or after End are strictly ignored</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Before Current → shifted</div><div class="info-card-body">Demands between Start and Current are <strong>shifted to the Current bucket</strong> and planned on/after it — <em>irrespective of the Build-Late Limit</em>. Supply at Current → met there; else, with BLL&gt;0, look later up to the BLL; with BLL=0 → short.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">RCA reason</div><div class="info-card-body">For these shifted demands (met at Current/later or not), the solver reports RCA <strong>“lead time plan before current”</strong>.</div></div>
      </div>
      <div class="section-header" style="margin-top:20px"><div class="section-title">How the horizon impacts supply</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #64748B"><div class="info-card-title">BOH before Current → ignored</div><div class="info-card-body">Beginning-On-Hand defined earlier than the current bucket is ignored. <strong>BOH is only applicable at the Current bucket.</strong></div></div>
        <div class="info-card" style="border-left:3px solid #2DD4BF"><div class="info-card-title">Expected Receipts</div><div class="info-card-body">Supply is assumed to arrive on its date; for planning, cumulative supplies are treated as available at Plan Current.</div></div>
      </div>
      <div class="section-header" style="margin-top:20px"><div class="section-title">Worked use case (Plan.Start W10 · Current W15 · End W52)</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Input</th><th>SCS output</th></tr></thead>
          <tbody>
            <tr><td>D1 = 100 in W11, BLL=0; BOH=100 on W15</td><td style="color:var(--green)">Met in full on W15 (shifted to Current)</td></tr>
            <tr><td>D1 = 100 in W11, BLL=0; BOH=0, ER=100 in W16</td><td style="color:#EF4444">Short — cannot late past Plan.Current with BLL=0</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}
