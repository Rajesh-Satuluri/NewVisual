import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is a multi-step routing, and how does the solver time-phase it against a due date?',
    a: 'A <strong>routing</strong> is the ordered sequence of <strong>operations</strong> needed to make an item — e.g. <code>Op10 Cut → Op20 Weld → Op30 Paint → Op40 Assemble</code>. Each operation uses a <strong>resource</strong> (its own capacity), takes a <strong>lead time</strong>, and produces an intermediate that feeds the next step. The solver plans the chain <strong>backward from the due date</strong>: the last operation must <em>finish</em> by the due date, so it starts its lead time earlier; the operation before it must finish before that start; and so on, walking left to the required raw-material start bucket. The <strong>total manufacturing lead time is the SUM of the operations’ lead times</strong> — with lead times <code>1, 2, 1, 1</code> and a due of W10, the chain reaches back 5 buckets to a raw start in W5. It is the multi-operation generalisation of the single lead-time offset.',
    tip: 'One line: "offset each op backward in turn; total MLT = sum of the op lead times."' },
  { q: 'Why model per-operation capacity, lot size and yield instead of lumping the routing into one step?',
    a: 'Because the constraints live <strong>at the operations, not at the finished item</strong>. Each op can have its <strong>own resource/capacity</strong>, so a single slow step is a <strong>bottleneck</strong> that caps the whole routing’s throughput regardless of how much capacity the other ops have. Each op can have its <strong>own lot size</strong> (you may weld in batches of 20 but paint in batches of 50) and its <strong>own yield</strong> (scrap at Weld means you must start more units upstream than you finish downstream). Lumping the routing into one step hides the bottleneck and gets the start quantities and timing wrong. Modelling per-op lets the solver find <em>which</em> step is short and gross up / build-ahead at exactly the right place — typically the operation just before the bottleneck.',
    tip: 'Bottleneck = the tightest-capacity op; it, not the average, sets the routing’s rate. Yield grosses up starts step by step.' },
  { q: 'What does "WIP support" add to a routing, and how does it change what the solver plans?',
    a: '<strong>WIP (Work-In-Process)</strong> is material already part-way through the routing — past some operations but not finished — modelled as supply sitting <strong>at the operation it has reached</strong>. With WIP support the solver can <strong>peg a demand to existing WIP and plan only the remaining downstream operations</strong>, instead of starting fresh material at Op10. WIP enters at its current step and flows forward: 40 units of WIP waiting at Op30 need only <code>Op30 → Op40</code> planned (a shorter path that can start later), while fresh units still traverse the full <code>Op10→Op40</code> chain. This ties back to the phased solve — <strong>WIP is planned and consumed before fresh starts</strong>, so the cheapest, closest-to-done supply is used first.',
    tip: '"Peg to WIP, plan only the remaining ops." WIP shortens the path and is consumed ahead of new starts.' },
];

// ── Grounded teaching routing: four operations, lead times sum to the MLT ──────
const OPS = [
  { id: 'Op10', name: 'Cut',      res: 'SAW_1',   lt: 1, cap: 80, yield: 1.00 },
  { id: 'Op20', name: 'Weld',     res: 'WELD_2',  lt: 2, cap: 45, yield: 0.90 },
  { id: 'Op30', name: 'Paint',    res: 'PAINT_1', lt: 1, cap: 70, yield: 1.00 },
  { id: 'Op40', name: 'Assemble', res: 'ASM_3',   lt: 1, cap: 75, yield: 1.00 },
];
const DUE = 10;                                  // W10
const MLT = OPS.reduce((s, o) => s + o.lt, 0);   // 5
const WIP_OP = 2;                                // WIP waiting at Op30 (index 2)
const WIP_QTY = 40;

// Finish/start bucket for each op, walking backward from the due date.
function schedule() {
  const rows = [];
  let finish = DUE;
  for (let i = OPS.length - 1; i >= 0; i--) {
    const start = finish - OPS[i].lt;
    rows[i] = { ...OPS[i], start, finish };
    finish = start;                              // prior op must finish when this starts
  }
  return rows;                                   // rows[0].start = required raw start
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Models Supported',
    title: 'Multi-Step Routing',
    subtitle: `An item is rarely one step. A routing is a chain of operations — each with its own resource, lead time, lot size and yield — and the solver offsets the whole chain backward from the due date. Watch the ${MLT}-bucket chain lay itself out, then inject WIP at ${OPS[WIP_OP].id} and see the solver plan only the steps that are left.`,
    tabs: [
      { id: 'routing',    label: '🪜 Routing' },
      { id: 'operations', label: '⚙️ Operations', content: operationsTab() },
      { id: 'wip',        label: '🔧 WIP Support', content: wipTab() },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live routing canvas (backward offset + WIP injection) ──────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-routing');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One order due <b>W${DUE}</b> travels a four-operation routing. <b>Step</b> to lay the chain out <b>backward</b> — each op must finish before the next can start — and watch the required <b style="color:#38BDF8">raw start</b> bucket emerge and the total lead time add up. Then toggle <b style="color:#F59E0B">WIP at ${OPS[WIP_OP].id}</b>: ${WIP_QTY} units already past ${OPS[WIP_OP - 1].id} skip straight to the remaining steps.</div>
      <canvas id="rout-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="rout-step">▶ Step (offset)</button>
        <button class="ctrl-btn" id="rout-run">⚡ Run</button>
        <button class="ctrl-btn" id="rout-wip">🔧 Toggle WIP at ${OPS[WIP_OP].id}</button>
        <button class="ctrl-btn" id="rout-reset">↺ Reset</button>
        <span class="ctrl-label" id="rout-status">Press Step to offset the last operation first.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The solver schedules <strong>backward from the due date</strong>. <code>${OPS[3].id} ${OPS[3].name}</code> must finish by <strong>W${DUE}</strong>, and with lead time ${OPS[3].lt} it starts W${DUE - OPS[3].lt}. <code>${OPS[2].id} ${OPS[2].name}</code> must finish when ${OPS[3].id} starts, so it starts W${DUE - OPS[3].lt - OPS[2].lt}. Walk that all the way left and the first operation, <code>${OPS[0].id} ${OPS[0].name}</code>, has to start in <strong>W${DUE - MLT}</strong>. The gap from raw start to due is the <strong>total manufacturing lead time = ${OPS.map(o => o.lt).join(' + ')} = ${MLT}</strong> buckets — the sum of the per-operation lead times.</p>
      <p>Each box shows its <strong>resource</strong> and <strong>lead time</strong>. The capacities differ, and <code>${OPS[1].id} ${OPS[1].name}</code> (cap ${OPS[1].cap}) is the <strong>bottleneck</strong> — the tightest step gates the whole routing no matter how much slack the others have. Toggle <strong>WIP</strong> and ${WIP_QTY} units sitting at <code>${OPS[WIP_OP].id}</code> are pegged directly: the solver plans only <code>${OPS[WIP_OP].id} → ${OPS[3].id}</code> for them (a start as late as W${DUE - OPS[3].lt - OPS[2].lt}), while any fresh units still run the full ${MLT}-bucket chain. WIP is the shorter, closer-to-done path, and it is consumed before fresh starts.</p>
    </div>`;

  const canvas = tab.querySelector('#rout-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#rout-status');

  const rows = schedule();
  let shown = 0;            // number of ops offset so far (revealed from the right)
  let pop = 0;
  let running = false;
  let frame = 0;
  let wip = false;

  // timeline geometry
  const N = DUE;            // W1..W10
  const tlX = 40, tlW = 780, tlY = 300;
  const colW = tlW / N;
  const bx = (bucket) => tlX + (bucket - 1) * colW;   // left edge of bucket's column

  // op boxes sit above the timeline, placed at their START bucket
  const opY = 120, opH = 70;

  function revealIdx() { return OPS.length - shown; }  // first revealed index from the left

  function step() {
    if (shown >= OPS.length) return;
    shown++; pop = 12;
    const i = OPS.length - shown;
    const r = rows[i];
    statusEl.textContent = `${r.id} ${r.name} on ${r.res}: start W${r.start} → finish W${r.finish} (lead ${r.lt}).` +
      (shown === OPS.length ? ` Raw must start W${rows[0].start}. Total MLT = ${MLT}.` : '');
  }
  function run() { if (shown >= OPS.length) shown = 0; running = true; frame = 0; }
  function reset() { shown = 0; running = false; pop = 12; statusEl.textContent = 'Press Step to offset the last operation first.'; }
  function toggleWip() {
    wip = !wip;
    statusEl.textContent = wip
      ? `WIP on: ${WIP_QTY} units wait at ${OPS[WIP_OP].id}; solver plans only ${OPS[WIP_OP].id}→${OPS[3].id}.`
      : 'WIP off: every unit runs the full routing.';
  }

  let raf = null;
  function draw() {
    if (pop > 0) pop--;
    if (running && shown < OPS.length) {
      frame++;
      if (frame % 32 === 0) { step(); if (shown >= OPS.length) running = false; }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // title
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Routing scheduled backward from the due date', tlX, 36);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(`total MLT = ${OPS.map(o => o.lt).join(' + ')} = ${MLT} buckets`, tlX, 52);

    // timeline buckets
    for (let b = 1; b <= N; b++) {
      const x = bx(b);
      const isDue = b === DUE;
      const isRaw = shown >= OPS.length && b === rows[0].start;
      ctx.fillStyle = isDue ? '#1e293b' : '#0d1322';
      drawRoundRect(ctx, x + 2, tlY, colW - 4, 28, 5, isDue ? '#162033' : '#0d1322', isDue ? '#6366F1' : '#1e2a3f');
      ctx.textAlign = 'center'; ctx.font = (isDue || isRaw) ? 'bold 11px system-ui' : '10px system-ui';
      ctx.fillStyle = isDue ? '#A5B4FC' : isRaw ? '#38BDF8' : '#64748B';
      ctx.fillText('W' + b, x + colW / 2, tlY + 19);
    }
    // due marker
    ctx.textAlign = 'center'; ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#A5B4FC';
    ctx.fillText('DUE', bx(DUE) + colW / 2, tlY + 44);
    if (shown >= OPS.length) { ctx.fillStyle = '#38BDF8'; ctx.fillText('raw start', bx(rows[0].start) + colW / 2, tlY + 44); }

    // op boxes (revealed from the right)
    rows.forEach((r, i) => {
      const revealed = i >= revealIdx();
      if (!revealed) return;
      const isLatest = i === revealIdx();
      const grow = isLatest ? (pop / 12) * 3 : 0;

      const xStart = bx(r.start), xFin = bx(r.finish);
      const w = Math.max(xFin - xStart, colW) + grow * 2;
      const x = xStart - grow, y = opY - grow, h = opH + grow * 2;

      const bottleneck = r.cap === Math.min(...OPS.map(o => o.cap));
      const border = bottleneck ? '#EF4444' : '#38BDF8';
      // WIP shortcut: dim the ops before the WIP op
      const skipped = wip && i < WIP_OP;
      const col = skipped ? '#334155' : border;

      drawRoundRect(ctx, x, y, w, h, 10, skipped ? '#0d1322' : '#111827', col + (skipped ? '55' : ''));
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = skipped ? '#475569' : '#E2E8F0';
      ctx.fillText(`${r.id} ${r.name}`, x + w / 2, y + 22);
      ctx.font = '10px system-ui'; ctx.fillStyle = skipped ? '#334155' : '#94A3B8';
      ctx.fillText(`${r.res} · lead ${r.lt}`, x + w / 2, y + 40);
      ctx.font = '9px system-ui'; ctx.fillStyle = skipped ? '#334155' : (bottleneck ? '#EF4444' : '#64748B');
      ctx.fillText(bottleneck ? `cap ${r.cap} · bottleneck` : `cap ${r.cap}`, x + w / 2, y + 56);

      // start→finish bracket down to timeline
      if (!skipped) {
        ctx.strokeStyle = col + '55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 6, y + h); ctx.lineTo(x + 6, tlY); ctx.stroke();
      }

      // arrow to next op
      if (i < OPS.length - 1 && i + 1 >= revealIdx()) {
        const nx = bx(rows[i + 1].start);
        drawArrow(ctx, x + w, y + h / 2, nx - 2, opY + opH / 2, (skipped ? '#334155' : border) + 'AA', 1.6);
      }
    });

    // WIP chip at the WIP op
    if (wip && OPS.length - shown <= WIP_OP) {
      const r = rows[WIP_OP];
      const x = bx(r.start);
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'center'; ctx.font = 'bold 10px system-ui';
      ctx.fillText(`◆ WIP ${WIP_QTY} here`, x + 30, opY - 14);
      drawArrow(ctx, x + 30, opY - 8, x + 30, opY - 2, '#F59E0B', 1.6);
    }

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#rout-step').addEventListener('click', step);
  tab.querySelector('#rout-run').addEventListener('click', run);
  tab.querySelector('#rout-wip').addEventListener('click', toggleWip);
  tab.querySelector('#rout-reset').addEventListener('click', reset);

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: operations (static, grounded) ─────────────────────────────────────
function operationsTab() {
  const rows = schedule();
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The routing, operation by operation</div><div class="section-desc">A routing is a chain of operations, each with its own resource, lead time, lot size and yield. The constraints live at the steps — so the solver reasons about every step, not the finished item as a lump.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Op</th><th>Resource</th><th>Lead time</th><th>Capacity / bkt</th><th>Yield</th><th>Start → Finish</th></tr></thead>
          <tbody>
            ${rows.map(r => {
              const bn = r.cap === Math.min(...OPS.map(o => o.cap));
              return `<tr>
                <td style="font-weight:700;color:var(--accent)">${r.id} ${r.name}</td>
                <td><code>${r.res}</code></td>
                <td>${r.lt} bkt</td>
                <td style="${bn ? 'color:#EF4444;font-weight:700' : ''}">${r.cap}${bn ? ' ⚠ bottleneck' : ''}</td>
                <td>${(r.yield * 100).toFixed(0)}%</td>
                <td>W${r.start} → W${r.finish}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Total MLT = sum of op lead times</div><div class="info-card-body">The chain is offset backward step by step. Here <code>${OPS.map(o => o.lt).join(' + ')} = ${MLT}</code> buckets, so an order due <strong>W${DUE}</strong> forces a raw start in <strong>W${DUE - MLT}</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">The bottleneck gates the rate</div><div class="info-card-body">The tightest-capacity operation (<code>${OPS[1].id} ${OPS[1].name}</code>, cap ${OPS[1].cap}) limits the whole routing. Adding capacity anywhere else does nothing until the bottleneck is relieved; demand above it spills to build-ahead or build-late.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Yield grosses up starts</div><div class="info-card-body">With yield &lt; 1 at a step (here ${OPS[1].name} at ${(OPS[1].yield * 100).toFixed(0)}%), the solver must <strong>start more upstream than it finishes downstream</strong> so the finished quantity still meets demand. Lot size is applied per op, then grossed up for yield.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Buffers between operations</h3>
        <p>Each operation produces an intermediate that feeds the next. A material node can sit <strong>between</strong> operations to hold that intermediate — so the solver can <strong>build-ahead at the step before the bottleneck</strong> and feed the slow operation steadily. If a between-op node is flagged <strong>no-carry</strong>, that buffer disappears and the two operations must be synchronised in the same bucket.</p>
      </div>
    </div>`;
}

// ── Tab 3: WIP support (static, grounded) ────────────────────────────────────
function wipTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">WIP support — material already in the routing</div><div class="section-desc">Work-In-Process is material part-way through the chain: past some operations, not yet finished. The solver models it as supply sitting at the operation it has reached, and plans only what is left.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Enters at its current step</div><div class="info-card-body">WIP waiting at <code>${OPS[WIP_OP].id} ${OPS[WIP_OP].name}</code> has already cleared <code>${OPS[0].id}</code>–<code>${OPS[WIP_OP - 1].id}</code>. It is available there as supply and flows <em>forward</em> only.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Plan only the remaining ops</div><div class="info-card-body">A demand pegged to that WIP needs just <code>${OPS[WIP_OP].id} → ${OPS[3].id}</code> planned — a shorter path that can start <strong>later</strong> and still hit the due date. The completed steps are not re-done.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Consumed before fresh starts</div><div class="info-card-body">Tying back to the phased solve, <strong>WIP is planned and consumed ahead of new material</strong>. The solver uses the supply closest to done first, and only starts fresh units at <code>${OPS[0].id}</code> for whatever WIP cannot cover.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">Full path vs WIP path</div><div class="section-desc">Same demand, two supply sources. WIP is the shorter route.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Source</th><th>Path planned</th><th>Ops remaining</th><th>Can start as late as</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:600;color:var(--text)">Fresh start</td><td><code>${OPS.map(o => o.id).join(' → ')}</code></td><td>${OPS.length}</td><td>W${DUE - MLT}</td></tr>
            <tr><td style="font-weight:600;color:var(--text)">WIP at ${OPS[WIP_OP].id}</td><td><code>${OPS.slice(WIP_OP).map(o => o.id).join(' → ')}</code></td><td>${OPS.length - WIP_OP}</td><td>W${DUE - OPS.slice(WIP_OP).reduce((s, o) => s + o.lt, 0)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Why it matters</h3>
        <p>Ignoring WIP would make the solver re-plan units that are already half-built, inflating lead time and double-counting work. WIP support lets the plan <strong>honour what is physically on the shop floor</strong>: ${WIP_QTY} units at <code>${OPS[WIP_OP].id}</code> become the first, cheapest supply the solver reaches for, and only the genuine shortfall triggers a full ${MLT}-bucket fresh start.</p>
      </div>
    </div>`;
}
