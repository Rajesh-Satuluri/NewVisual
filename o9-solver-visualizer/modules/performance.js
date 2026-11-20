import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What are telescopic (time-varying) buckets, and why does the SCS bucket the near term finely and the far term coarsely?',
    a: 'A <strong>telescopic bucket profile</strong> varies the <em>width</em> of planning buckets across the horizon: the <strong>near term</strong> is bucketed in <strong>days</strong>, the <strong>mid term</strong> in <strong>weeks</strong>, and the <strong>far term</strong> in <strong>months</strong>. The reasoning is that compute scales with the <strong>number of buckets</strong>, and precision is only worth paying for where decisions are actually committed. Near-term buckets drive imminent releases, shipments and sequencing, so they need day-level resolution; far-term buckets only shape rough-cut capacity and long-lead procurement, where a monthly total is enough and daily detail is noise against forecast error. Collapsing the far horizon into wide buckets cuts the model size dramatically — a 90-day horizon that is <strong>90 daily buckets</strong> when flat becomes roughly <strong>27 buckets</strong> (14 daily + 10 weekly + 3 monthly) when telescopic, about <strong>3.3× fewer</strong>, with the near-term precision untouched.',
    tip: 'One line: "fine near, coarse far — compute ∝ bucket count, and only the near term needs daily precision."' },
  { q: 'How does segmentation give the solver parallelism, and what forces work back into a single serial lane?',
    a: 'The solver looks for parts of the network that share <strong>no supply and no capacity</strong> — those are <strong>independent subproblems</strong>. Independent segments can be solved <strong>in parallel</strong> on separate lanes because nothing one does changes the feasibility of another, so wall-clock time drops toward the slowest segment rather than the sum. What <strong>breaks</strong> that independence is a <strong>shared resource</strong>: a common component, a shared machine or capacity pool, or a pegging link that crosses the boundary. Any demand that competes for the same constrained supply must be solved in a consistent <strong>priority order</strong>, so those pieces are pulled back into a <strong>serial</strong> pass. The more a model decomposes into truly independent islands, the more parallel speedup is available; a densely shared network serializes.',
    tip: 'Parallel when segments share nothing; shared supply/capacity (or a crossing peg) forces a serial, priority-ordered pass.' },
  { q: 'What does memoization buy the solver, and what is the tradeoff?',
    a: '<strong>Memoization</strong> (caching) stores the result of a subproblem the <strong>first</strong> time it is computed so that later <strong>identical</strong> requests return the cached answer instead of recomputing. In planning this hits repeated work like the same <strong>BOM explosion</strong>, the same <strong>lead-time offset</strong>, or the same <strong>peg computation</strong> that recurs across demands or passes. The win is eliminating redundant recomputation; the <strong>tradeoff is memory</strong> — the cache must hold those results, and it only pays off when subproblems genuinely repeat and their inputs are stable. If almost every subproblem is unique, the cache is overhead; where structure repeats (common sub-assemblies, shared routings), it is a large saving.',
    tip: 'Compute once, reuse on identical inputs — trades memory for recomputation; only pays when subproblems actually repeat.' },
];

// ── Telescopic bucket profile (EXACT teaching numbers) ────────────────────────
// Flat: 90 daily buckets. Telescopic: 14 daily + 10 weekly + 3 monthly = 27.
const HORIZON_DAYS = 90;
const FLAT_BUCKETS = 90;
const TELE = { daily: 14, weekly: 10, monthly: 3 };
const TELE_BUCKETS = TELE.daily + TELE.weekly + TELE.monthly; // 27

// Build a list of telescopic cells as {days} spans that sum to 90 days.
function telescopicCells() {
  const cells = [];
  for (let i = 0; i < TELE.daily; i++) cells.push({ days: 1, band: 'day' });     // 14 days
  for (let i = 0; i < TELE.weekly; i++) cells.push({ days: 7, band: 'week' });    // 70 days → 84
  // remaining 6 days fold into the monthly band; 3 monthly cells cover ~6..end
  const covered = TELE.daily * 1 + TELE.weekly * 7;                               // 84
  const remain = HORIZON_DAYS - covered;                                          // 6
  const per = remain / TELE.monthly;                                             // 2 each (visual)
  for (let i = 0; i < TELE.monthly; i++) cells.push({ days: Math.max(per, 1), band: 'month' });
  return cells;
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Optimization & Ops',
    title: 'Performance & Scale',
    subtitle: 'A real supply network is enormous, yet the solve has to finish in a planning window. Three techniques keep it tractable: telescopic buckets shrink the horizon, segmentation parallelises independent pieces, and memoization stops the solver redoing identical work. Toggle the bucket profile and watch the model collapse.',
    tabs: [
      { id: 'buckets',    label: '🔭 Telescopic Buckets' },
      { id: 'techniques', label: '⚙️ Three Techniques', content: techniquesTab() },
      { id: 'concepts',   label: '📖 How It Works', content: conceptsTab() },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: live telescopic-bucket strip ───────────────────────────────────────
function buildCanvas(container) {
  const tab = container.querySelector('#tab-buckets');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The same <b>90-day horizon</b>, two ways to bucket it. <b style="color:#64748B">Flat daily</b> = <b>90</b> equal buckets. <b style="color:#38BDF8">Telescopic</b> = <b>14</b> daily + <b>10</b> weekly + <b>3</b> monthly = <b>27</b> buckets — fine near term, coarse far term. Compute scales with bucket count, so telescopic is ~<b>3.3×</b> less work with the near-term precision kept.</div>
      <canvas id="perf-canvas" width="860" height="340" style="width:100%;max-width:860px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="perf-flat">🔲 Flat daily</button>
        <button class="ctrl-btn" id="perf-tele">🔭 Telescopic</button>
        <button class="ctrl-btn" id="perf-reset">↺ Reset</button>
        <span class="ctrl-label" id="perf-status">Toggle the bucket profile.</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each cell is one <strong>planning bucket</strong> — the atomic time slot the solver reasons in. The <strong>flat</strong> profile gives every day its own bucket: maximum precision, maximum cost (<code>90 buckets</code>). The <strong>telescopic</strong> profile keeps day-level cells only where decisions are committed (the first <code>14</code> days), then widens to <strong>weekly</strong> and finally <strong>monthly</strong> cells further out, where a rough total is enough.</p>
      <p>Compute roughly tracks the <strong>number of buckets</strong>, so folding the far horizon from <code>76</code> daily cells into <code>13</code> wide ones drops the model from <code>90 → 27</code> buckets (~<strong>3.3×</strong>) <em>without</em> blurring anything in the near term. That is why the far right of the strip is a few fat cells, not a wall of thin ones.</p>
    </div>`;

  const canvas = tab.querySelector('#perf-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const statusEl = tab.querySelector('#perf-status');

  const teleCells = telescopicCells();
  let mode = 'flat';          // 'flat' | 'tele'
  let t = 1;                  // morph 0..1 (1 = settled)

  function setMode(m) {
    if (mode === m) return;
    mode = m; t = 0;
    const n = m === 'flat' ? FLAT_BUCKETS : TELE_BUCKETS;
    statusEl.textContent = m === 'flat'
      ? `Flat daily: ${FLAT_BUCKETS} buckets · relative compute ∝ ${FLAT_BUCKETS}.`
      : `Telescopic: ${TELE.daily} daily + ${TELE.weekly} weekly + ${TELE.monthly} monthly = ${TELE_BUCKETS} buckets · ∝ ${TELE_BUCKETS} (~3.3× less).`;
  }
  function reset() { setMode('flat'); t = 0; statusEl.textContent = `Flat daily: ${FLAT_BUCKETS} buckets · relative compute ∝ ${FLAT_BUCKETS}.`; }

  const stripX = 40, stripW = 780, stripY = 150, stripH = 84;
  const bandColor = { day: '#38BDF8', week: '#818CF8', month: '#C084FC' };

  // Precompute flat cell geometry (90 equal) and telescopic geometry (by days).
  const flatGeo = [];
  for (let i = 0; i < FLAT_BUCKETS; i++) {
    flatGeo.push({ x: stripX + (i * stripW) / FLAT_BUCKETS, w: stripW / FLAT_BUCKETS, band: 'day' });
  }
  const teleGeo = [];
  {
    const totalDays = teleCells.reduce((s, c) => s + c.days, 0);
    let acc = 0;
    for (const c of teleCells) {
      const x = stripX + (acc / totalDays) * stripW;
      const w = (c.days / totalDays) * stripW;
      teleGeo.push({ x, w, band: c.band });
      acc += c.days;
    }
  }

  let raf = null;
  function draw() {
    if (t < 1) t = Math.min(1, t + 0.04);
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // header
    ctx.textAlign = 'left'; ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#CBD5E1';
    ctx.fillText('90-day planning horizon', stripX, 48);
    ctx.font = '11px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText(mode === 'flat' ? 'profile: flat daily' : 'profile: telescopic (fine near · coarse far)', stripX, 66);

    // readouts
    const liveN = mode === 'flat' ? FLAT_BUCKETS : TELE_BUCKETS;
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#94A3B8';
    ctx.fillText('buckets', stripX + stripW, 48);
    ctx.font = 'bold 34px system-ui'; ctx.fillStyle = mode === 'flat' ? '#E2E8F0' : '#38BDF8';
    ctx.fillText(String(liveN), stripX + stripW, 92);
    ctx.font = '11px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('relative compute ∝ ' + liveN, stripX + stripW, 110);

    // compute bar comparing to flat baseline
    const barY = 124, barX = stripX, barW = stripW;
    ctx.textAlign = 'left';
    const frac = liveN / FLAT_BUCKETS;
    drawRoundRect(ctx, barX, barY, barW, 10, 5, '#0d1322', '#1e2a3f');
    const curFrac = mode === 'flat' ? 1 : (1 - (1 - frac) * ease);
    drawRoundRect(ctx, barX, barY, barW * curFrac, 10, 5,
      (mode === 'flat' ? '#475569' : '#38BDF8') + '66',
      mode === 'flat' ? '#64748B' : '#38BDF8');

    // the bucket strip — crossfade flat↔tele by alpha on each set
    const flatAlpha = mode === 'flat' ? ease : 1 - ease;
    const teleAlpha = mode === 'tele' ? ease : 1 - ease;

    // frame
    drawRoundRect(ctx, stripX - 4, stripY - 10, stripW + 8, stripH + 20, 10, '#0c1120', '#1e2a3f');

    if (flatAlpha > 0.02) {
      ctx.globalAlpha = flatAlpha;
      for (const g of flatGeo) {
        drawRoundRect(ctx, g.x + 0.6, stripY, Math.max(g.w - 1.2, 0.8), stripH, 1,
          '#1e293b', '#334155');
      }
      ctx.globalAlpha = 1;
    }
    if (teleAlpha > 0.02) {
      ctx.globalAlpha = teleAlpha;
      for (const g of teleGeo) {
        const col = bandColor[g.band];
        drawRoundRect(ctx, g.x + 1, stripY, Math.max(g.w - 2, 1.5), stripH, 3,
          col + '22', col);
      }
      ctx.globalAlpha = 1;
    }

    // band legend under strip (only meaningful for telescopic)
    ctx.textAlign = 'left'; ctx.font = '11px system-ui';
    const legY = stripY + stripH + 30;
    if (mode === 'tele' || teleAlpha > 0.5) {
      const items = [
        ['day', `${TELE.daily} daily`, '#38BDF8'],
        ['week', `${TELE.weekly} weekly`, '#818CF8'],
        ['month', `${TELE.monthly} monthly`, '#C084FC'],
      ];
      let lx = stripX;
      ctx.globalAlpha = teleAlpha;
      for (const [, lbl, col] of items) {
        drawRoundRect(ctx, lx, legY - 10, 12, 12, 3, col + '33', col);
        ctx.fillStyle = '#94A3B8'; ctx.fillText(lbl, lx + 18, legY);
        lx += ctx.measureText(lbl).width + 54;
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#64748B';
      ctx.fillText(`${FLAT_BUCKETS} equal daily buckets — every day its own slot`, stripX, legY);
    }

    // near/far hint arrows
    ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = '#475569';
    ctx.fillText('◀ near term (committed)', stripX, stripY - 16);
    ctx.textAlign = 'right';
    ctx.fillText('far term (rough-cut) ▶', stripX + stripW, stripY - 16);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  tab.querySelector('#perf-flat').addEventListener('click', () => setMode('flat'));
  tab.querySelector('#perf-tele').addEventListener('click', () => setMode('tele'));
  tab.querySelector('#perf-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: three techniques (static, grounded) ────────────────────────────────
function techniquesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Three ways the solver stays tractable</div><div class="section-desc">A planning run has a fixed window to finish in. These techniques attack model size, independence and redundancy — they are complementary, not alternatives.</div></div>
      <div class="table-scroll">
        <table class="compare-table">
          <thead><tr><th>Technique</th><th>How it saves work</th><th>Cost / tradeoff</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:var(--accent)">Telescopic buckets</td><td>Varies bucket width across the horizon — daily near term, weekly mid, monthly far. Compute scales with bucket count, so the far horizon collapses from many thin buckets into a few wide ones.</td><td>Far-term precision is coarser; a monthly bucket cannot express day-level timing. Acceptable because far-term plans are rough-cut anyway.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">Segmentation / parallelism</td><td>Independent sub-networks (no shared supply or capacity) are solved on separate lanes at the same time. Wall-clock trends toward the slowest segment, not the sum.</td><td>Only as much parallelism as the network has independence. Shared resources force a serial, priority-ordered pass.</td></tr>
            <tr><td style="font-weight:700;color:var(--accent)">Memoization / caching</td><td>Identical subproblems (BOM explosion, lead-time offset, peg) are computed once and reused on later identical inputs.</td><td>Uses memory to hold cached results; only pays off when subproblems genuinely repeat with stable inputs.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:18px">
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">90 → 27 buckets</div><div class="info-card-body">A 90-day horizon as flat daily is <code>90</code> buckets. Telescopic — <code>14</code> daily + <code>10</code> weekly + <code>3</code> monthly — is <code>27</code>, about <strong>3.3×</strong> fewer, with the near term untouched.</div></div>
        <div class="info-card" style="border-left:3px solid #818CF8"><div class="info-card-title">Independence = speedup</div><div class="info-card-body">Two product families that share no component and no machine are two problems, not one. They solve in parallel; a shared resource is what stitches them back together.</div></div>
        <div class="info-card" style="border-left:3px solid #C084FC"><div class="info-card-title">Repeat = reuse</div><div class="info-card-body">The same sub-assembly explodes the same way every time it appears. Compute it once, cache it, and every later occurrence is a lookup.</div></div>
      </div>
    </div>`;
}

// ── Tab 3: concepts (static, grounded) ────────────────────────────────────────
function conceptsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Why fine near, coarse far</div><div class="section-desc">Precision costs buckets, and buckets cost compute. Spend precision only where the plan is actually committed.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Near term is committed</div><div class="info-card-body">Imminent releases, shipments and sequencing act on day-level timing, so the first weeks need daily buckets. A one-day error here is a missed truck.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">Far term is rough-cut</div><div class="info-card-body">Months out, the plan shapes capacity and long-lead buys against a forecast that is itself fuzzy. A monthly total is enough; daily detail would be false precision.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Compute ∝ buckets</div><div class="info-card-body">Roughly, solve cost tracks bucket count. Halving buckets on the far horizon is nearly free precision-wise but a large compute win.</div></div>
      </div>

      <div class="section-header" style="margin-top:22px"><div class="section-title">When segments can run in parallel</div><div class="section-desc">Parallelism is a property of the network, not a flag you set.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Truly independent</div><div class="info-card-body">No shared component, no shared capacity, no peg crossing the boundary → the segments cannot affect each other and solve on separate lanes.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Shared resource</div><div class="info-card-body">A common part or machine means demands compete. They must be resolved in a consistent priority order, so that slice serialises.</div></div>
        <div class="info-card" style="border-left:3px solid #EF4444"><div class="info-card-title">Dense coupling</div><div class="info-card-body">A network where everything shares everything has little to parallelise — the win comes from decomposable, loosely-coupled structure.</div></div>
      </div>

      <div class="canvas-explainer" style="margin-top:18px"><h3>Memory vs recomputation</h3>
        <p>Memoization is the classic space-for-time trade. The solver keeps a cache of subproblem results — a BOM explosion, a lead-time offset, a peg — keyed by their inputs. When an identical request appears (and in a large BOM with shared sub-assemblies it appears constantly), the answer is a lookup instead of a fresh computation. The price is the memory the cache occupies, and the risk is that unique-every-time subproblems turn the cache into pure overhead. It is a win exactly where the model has <strong>repeated structure</strong>: common sub-assemblies, shared routings, reused offsets.</p>
      </div>
    </div>`;
}
