import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is "Remote SCS", and why would you run the solver as a remote engine instead of in-process?',
    a: 'The SCS is the same solver engine wherever it runs, but in a <strong>Remote SCS</strong> deployment the engine is <strong>decoupled</strong> from the planning platform and invoked across a call boundary — the platform sends the model and parameters out to a dedicated solver service and gets the <strong>plan and pegs</strong> back. You do this to <strong>scale heavy solves onto dedicated compute</strong>, to <strong>isolate</strong> a long optimisation run from the interactive platform, and to run many solves in parallel without starving the UI. The engine, inputs and outputs are identical to an in-process solve; only the <em>where it executes</em> changes.',
    tip: 'One line: "same engine, run over a call boundary on dedicated compute — decouple + scale + isolate."' },
  { q: 'How is "Retail SCS" different from a manufacturing SCS deployment?',
    a: 'Retail networks are <strong>wide and shallow</strong>, not deep: enormous <strong>item × store</strong> cardinality, very shallow bills of material, and the core decision is <strong>replenishment and assortment</strong> on a cadence rather than deep multi-level production. So <strong>Retail SCS</strong> tunes the same engine for <strong>breadth</strong> — one plan fans out to thousands of store/SKU combinations — and leans on segmentation and coarse-far bucketing to keep that breadth tractable. A manufacturing deployment instead goes <em>deep</em>: multi-level BOMs, routings, capacity and yield across few-but-complex items.',
    tip: 'Retail = wide/shallow, fan-out to many store·SKUs, replenishment-centric. Mfg = deep BOM/routing.' },
  { q: 'Describe the ML flow around the solver — what feeds in and what comes back?',
    a: 'ML and the solver form a <strong>closed loop</strong>. ML feeds the solver on the way <em>in</em> — most commonly an <strong>ML-generated demand forecast</strong>, and increasingly <strong>ML-tuned parameters</strong> such as lead times or yields learned from history. The solver turns those inputs into a <strong>plan</strong>. Then <strong>actuals</strong> from execution (what actually shipped, the real lead time, the real yield) flow <em>back</em> and <strong>retrain</strong> the ML models, so the next forecast and the next parameter estimates are better. The solver stays deterministic and auditable; ML improves the <em>inputs</em> it is given, and the feedback of actuals is what makes the loop learn.',
    tip: 'ML forecasts/tunes → solver plans → actuals feed back and retrain ML. The loop closes on actuals.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Optimization & Ops',
    title: 'Remote · Retail · ML',
    subtitle: 'One solver engine, three deployment shapes. Switch between a decoupled Remote engine, a wide fan-out Retail topology, and the closed ML↔solver learning loop — and watch how the work flows in each.',
    tabs: [
      { id: 'topology', label: '🌐 Topologies' },
      { id: 'flavors',  label: '📊 The Three Flavors', content: flavorsTab() },
      { id: 'concepts', label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live topology canvas (Remote / Retail / ML) ────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-topology');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The <b>same solver engine</b>, deployed three ways. <b style="color:#38BDF8">Remote</b> calls a decoupled engine across a network boundary; <b style="color:#A78BFA">Retail</b> fans one plan out to thousands of store·SKUs; <b style="color:#F59E0B">ML</b> wraps the solver in a learning loop fed by actuals. Pick a topology and watch the flow.</div>
      <canvas id="dep-canvas" width="860" height="360" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dep-remote">🌐 Remote</button>
        <button class="ctrl-btn" id="dep-retail">🏬 Retail</button>
        <button class="ctrl-btn" id="dep-ml">🤖 ML</button>
        <button class="ctrl-btn" id="dep-reset">↺ Reset</button>
        <span class="ctrl-label" id="dep-status">Pick a topology.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p><strong>Remote SCS</strong> — the Platform hands the model across a dashed <em>network boundary</em> to a dedicated Solver engine and gets the plan back. The engine, inputs and outputs are identical to an in-process solve; only <em>where it runs</em> changes, so a heavy optimisation can scale on its own compute without blocking the platform.</p>
      <p><strong>Retail SCS</strong> — one solve fans <em>out</em> to a large row of store·SKU nodes. Retail networks are wide and shallow (millions of item×store, tiny BOMs), so the shape that matters is breadth and replenishment cadence, not deep production.</p>
      <p><strong>ML flow</strong> — the solver sits inside a cycle: ML forecasts demand and tunes parameters → the Solver plans → <em>actuals</em> return from execution and retrain the ML. The packets never stop circulating because the loop keeps learning from what really happened.</p>
    </div>`;

  const canvas = tab.querySelector('#dep-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#dep-status');

  const DESC = {
    remote: 'Remote · engine runs across a network boundary on dedicated compute.',
    retail: 'Retail · one plan fans out to thousands of wide, shallow store·SKUs.',
    ml:     'ML · forecast & tuned params in, plan out, actuals feed back to retrain.',
  };

  let mode = 'remote';
  let t = 0;                 // animation clock (frames)
  function setMode(m) { mode = m; statusEl.textContent = DESC[m]; }
  function reset() { t = 0; setMode('remote'); }

  // small moving dot helper: position along a straight segment by phase p∈[0,1]
  function dot(x1, y1, x2, y2, p, color, r = 4) {
    const x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fill(); ctx.shadowBlur = 0;
  }
  const frac = (period, offset = 0) => ((t + offset) % period) / period;

  function dashedBoundary(x) {
    ctx.save();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 320); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#475569'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('network boundary', x, 334);
  }

  function box(x, y, w, h, title, sub, color) {
    drawRoundRect(ctx, x, y, w, h, 12, '#111827', color);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#E2E8F0';
    ctx.fillText(title, x + w / 2, y + h / 2 - (sub ? 6 : -5));
    if (sub) { ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B'; ctx.fillText(sub, x + w / 2, y + h / 2 + 12); }
  }

  function drawRemote() {
    const C = '#38BDF8';
    const pX = 70, pY = 150, pW = 180, pH = 90;
    const sX = 610, sY = 150, sW = 190, sH = 90;
    dashedBoundary(430);
    box(pX, pY, pW, pH, 'Platform', 'UI · data · invoke', '#6366F1');
    box(sX, sY, sW, sH, 'Remote Solver', 'dedicated compute', C);
    // call out (top), plan back (bottom)
    drawArrow(ctx, pX + pW, pY + 28, sX - 4, sY + 28, C + '88', 1.8);
    drawArrow(ctx, sX - 4, sY + sH - 28, pX + pW, pY + pH - 28, '#10B981AA', 1.8);
    ctx.fillStyle = C; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('model + params →', (pX + pW + sX) / 2, pY + 18);
    ctx.fillStyle = '#10B981'; ctx.fillText('← plan + pegs', (pX + pW + sX) / 2, pY + pH - 12);
    for (let i = 0; i < 3; i++) {
      dot(pX + pW, pY + 28, sX - 4, sY + 28, frac(80, i * 26), C);
      dot(sX - 4, sY + sH - 28, pX + pW, pY + pH - 28, frac(80, i * 26 + 13), '#10B981');
    }
  }

  function drawRetail() {
    const C = '#A78BFA';
    const sX = 70, sY = 150, sW = 170, sH = 90;
    box(sX, sY, sW, sH, 'Retail Solver', 'one replenishment plan', C);
    const cols = 6, rows = 3, nx0 = 470, ny0 = 70, nw = 56, nh = 46, gx = 62, gy = 58;
    let idx = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = nx0 + c * gx, y = ny0 + r * gy;
      drawRoundRect(ctx, x, y, nw, nh, 7, '#0d1322', C + '66');
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('store', x + nw / 2, y + nh / 2 - 2);
      ctx.fillStyle = '#475569'; ctx.fillText('SKU', x + nw / 2, y + nh / 2 + 10);
      // streaming dot toward this node
      const sxp = sX + sW, syp = sY + sH / 2, dxp = x, dyp = y + nh / 2;
      dot(sxp, syp, dxp, dyp, frac(70, idx * 7), C, 3);
      idx++;
    }
    ctx.strokeStyle = C + '33'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sX + sW, sY + sH / 2); ctx.lineTo(nx0 - 8, ny0 + (rows * gy) / 2 - 10); ctx.stroke();
    ctx.fillStyle = C; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('fan-out · thousands of store·SKUs (wide, shallow)', 560, 300);
  }

  function drawML() {
    // three nodes in a triangle cycle: ML (left) → Solver (top-right) → Actuals (bottom-right) → ML
    const mlX = 80,  mlY = 150, w = 160, h = 86;
    const soX = 560, soY = 70;
    const acX = 560, acY = 220;
    const cML = '#F59E0B', cSO = '#38BDF8', cAC = '#10B981';
    // arrows (draw under boxes)
    drawArrow(ctx, mlX + w, mlY + 20, soX, soY + h / 2, cML + 'AA', 1.8);          // ML → Solver
    drawArrow(ctx, soX + w / 2, soY + h, acX + w / 2, acY, cSO + 'AA', 1.8);        // Solver → Actuals
    drawArrow(ctx, acX, acY + h / 2, mlX + w, mlY + h - 20, cAC + 'AA', 1.8);       // Actuals → ML
    box(mlX, mlY, w, h, 'ML Models', 'forecast · tune params', cML);
    box(soX, soY, w, h, 'Solver', 'plan', cSO);
    box(acX, acY, w, h, 'Actuals', 'execution feedback', cAC);
    // labels
    ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = cML; ctx.fillText('forecast + params →', (mlX + w + soX) / 2 + 10, mlY - 2);
    ctx.fillStyle = cSO; ctx.fillText('plan ↓', soX + w / 2 + 44, (soY + h + acY) / 2);
    ctx.fillStyle = cAC; ctx.fillText('← actuals retrain', (acX + mlX + w) / 2, acY + h + 16);
    // circulating packets
    for (let i = 0; i < 2; i++) {
      dot(mlX + w, mlY + 20, soX, soY + h / 2, frac(90, i * 45), cML);
      dot(soX + w / 2, soY + h, acX + w / 2, acY, frac(90, i * 45 + 30), cSO);
      dot(acX, acY + h / 2, mlX + w, mlY + h - 20, frac(90, i * 45 + 60), cAC);
    }
    ctx.fillStyle = '#64748B'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('closed loop — the plan improves because actuals keep teaching the ML', 430, 330);
  }

  let raf = null;
  function draw() {
    t++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#CBD5E1';
    const titles = { remote: 'Remote SCS', retail: 'Retail SCS', ml: 'ML Flow' };
    ctx.fillText(titles[mode], 24, 30);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('same engine · different deployment', 24, 46);

    if (mode === 'remote') drawRemote();
    else if (mode === 'retail') drawRetail();
    else drawML();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#dep-remote').addEventListener('click', () => setMode('remote'));
  tab.querySelector('#dep-retail').addEventListener('click', () => setMode('retail'));
  tab.querySelector('#dep-ml').addEventListener('click', () => setMode('ml'));
  tab.querySelector('#dep-reset').addEventListener('click', reset);
  setMode('remote');

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the three flavors (static, grounded) ───────────────────────────────
function flavorsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">One engine, three deployment shapes</div><div class="section-desc">Remote, Retail and ML are not three different solvers — they are the same SCS engine deployed in different topologies, tuned for different scale and wired to different neighbours.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Flavor</th><th>Topology</th><th>Best for</th><th>Key trait</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:#38BDF8">Remote SCS</td><td>Platform ⇄ decoupled remote engine across a network boundary.</td><td>Heavy solves that must scale on dedicated compute without blocking the platform.</td><td>Same inputs/outputs, executed elsewhere.</td></tr>
            <tr><td style="font-weight:700;color:#A78BFA">Retail SCS</td><td>One plan fans out to thousands of store·SKU nodes.</td><td>Wide, shallow retail networks — assortment & replenishment at huge cardinality.</td><td>Breadth over depth; coarse-far bucketing + segmentation.</td></tr>
            <tr><td style="font-weight:700;color:#F59E0B">ML Flow</td><td>ML → Solver → Actuals → back to ML (closed loop).</td><td>Forecast-driven planning that must learn from what actually happened.</td><td>ML improves the inputs; actuals close the loop.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:14px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Remote — why decouple</div><div class="info-card-body">A long optimisation run on its own compute keeps the interactive platform responsive, lets many solves run in parallel, and scales the engine independently. The call boundary is the only new thing; the plan that comes back is identical to an in-process solve.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Retail — wide &amp; shallow</div><div class="info-card-body">Millions of item×store combinations with tiny BOMs. The decision is "how much to replenish where, how often" rather than deep multi-level production, so the engine leans on segmentation and telescopic buckets to stay tractable at that width.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">ML — the learning loop</div><div class="info-card-body">ML forecasts demand and tunes parameters (lead times, yields) going in; the solver plans; actuals from execution flow back and retrain the models. The solver stays deterministic and auditable — ML makes its inputs better, actuals make the loop learn.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: how it works (static, grounded) ────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The engine stays the same</div><div class="section-desc">Deployment changes where the solver runs and what it is wired to — not how it solves. The ORL, pegging, lot sizing and passes you have already seen are identical across all three.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">In-process vs remote</div><div class="info-card-body">In-process, the solver runs inside the planning platform. Remote, it runs as a separate service invoked across a call boundary. The model, parameters and outputs are the same object graph either way; only the execution location moves.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Why retail is shaped differently</div><div class="info-card-body">Manufacturing goes <em>deep</em> — multi-level BOMs, routings, capacity, yield. Retail goes <em>wide</em> — few BOM levels but enormous store×SKU breadth. Same engine, but the far horizon is coarsened and independent segments are parallelised to absorb the cardinality.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Why actuals matter</div><div class="info-card-body">An ML forecast is only as good as its last correction. Feeding <strong>actuals</strong> — real shipments, real lead times, real yields — back into the models is what lets the next plan improve. Without the return leg it is open-loop ML, not a learning system.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>How they combine</h3>
        <p>These flavors are not mutually exclusive. A real deployment is often a <strong>Retail SCS running as a Remote engine inside an ML loop</strong>: ML forecasts store-level demand, the remote engine fans one replenishment plan across millions of store·SKUs on dedicated compute, and actuals from the stores flow back to retrain the forecast. The three ideas answer three different questions — <em>where does it run</em> (remote), <em>how wide is it</em> (retail), and <em>how does it learn</em> (ML) — and stack cleanly on the same solver.</p>
      </div>
    </div>`;
}
