import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow } from '../components/canvas-primitives.js';
import { gloss } from '../components/glossary-tooltip.js';

export const IQ = [
  { q: 'In plain terms, why can’t a supply chain just produce each order the instant it arrives — why is a plan needed at all?',
    a: 'Because two hard facts of the physical world make "make it now" impossible. First, <strong>lead time</strong>: making, moving, or buying anything takes time, so supply has to be <em>started before</em> the due date — nothing is instant. Second, <strong>finite capacity</strong>: a factory or resource can only do so much in a given period (a <em>bucket</em>), and in the solver that capacity even <em>expires</em> at the end of its bucket. Put together, when demand in a period exceeds what can be made in that period, the work has to be shifted earlier (<strong>build-ahead</strong>) or later (<strong>build-late</strong>) — and deciding how to do that across thousands of items and periods is exactly the job a planning solver exists to automate.',
    tip: 'Two words carry the whole answer: lead time (nothing is instant) and capacity (you can’t do it all at once). The plan is the shifting-in-time those two forces require.' },
  { q: 'When two orders need the same scarce supply, how is the conflict resolved — and why does that make the planning result order-dependent?',
    a: 'By <strong>priority</strong>. The solver plans demands <strong>one at a time, in priority order</strong> (order-by-order); the higher-priority demand is planned <em>first</em> and consumes the scarce, Just-In-Time supply, so whatever is left for the lower-priority demand may force it to build ahead, build late, or go short. This is why the outcome is order-dependent: a demand’s fate often has nothing to do with the demand itself — it depends on what the earlier, higher-priority demands already took. (A secondary <strong>fair-share</strong> rule splits supply proportionally among equal-priority demands.)',
    tip: 'Scarcity + sequence = priority decides who waits. The loser isn’t "worse" — it just arrived later in the priority order after the stock was gone.' },
  { q: 'What is the difference between an "unconstrained" plan and a "constrained" plan, and why is the unconstrained one a useful fiction?',
    a: 'An <strong>unconstrained</strong> plan pretends a resource is <em>infinite</em>: every demand is simply built Just-In-Time on its own due date, limited only by lead time. A <strong>constrained</strong> plan must <em>fit</em> each demand into the real, finite capacity available each bucket — so it opens overtime, shifts work to build-ahead and build-late buckets, and, when the window is exhausted, declares a <strong>shortage</strong> with a root-cause reason. The unconstrained run is a useful fiction because it shows the <em>demand signal in its purest form</em> (what you’d need if nothing got in the way), which is the baseline the constrained run is measured against.',
    tip: 'Unconstrained = fantasy, everything JIT, shows pure demand. Constrained = reality, must fit capacity → build-ahead / late / short. You run both to see the gap.' },
];

// ── the dilemma model ────────────────────────────────────────────────────────
const N = 8;              // W1..W8
const DUE = 5;           // index → W6 is the due bucket
const QTY = 180;         // demand quantity
const CAP = 60;          // capacity per bucket (when the capacity wall is up)
const LEAD = 1;          // lead-time offset in buckets
const ORDER = [5, 4, 3, 2, 6, 7]; // fill order: JIT, then nearest build-ahead, then build-late

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · Start Here',
    title: 'Why Planning Is Hard',
    subtitle: 'Before any solver: why can’t we just make every order the moment it’s placed? Switch on the three walls of the real world — lead time, finite capacity, and competing priorities — one at a time, and watch a simple order get harder and harder to fill. These three forces are the entire reason a planning solver exists.',
    tabs: [
      { id: 'dilemma',    label: '🧱 The Dilemma' },
      { id: 'walls',      label: '🚧 Three Walls', content: wallsTab() },
      { id: 'whysolver',  label: '🧠 Why a Solver', content: whySolverTab() },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ],
  });

  const cleanup = buildDilemma(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Tab 1: the escalating-walls animation ────────────────────────────────────
function buildDilemma(container) {
  const tab = container.querySelector('#tab-dilemma');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One order: <b>${QTY} units</b> due in <b style="color:#10B981">W6</b>. Flip each wall on and press <b>Run</b> to load the order. With every wall down it’s trivial; each wall you raise forces the work to move in time — or to lose to a higher-priority order.</div>
      <canvas id="whyp-canvas" width="800" height="300" style="width:100%;max-width:800px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="whyp-run">▶ Run (load the order)</button>
        <button class="ctrl-btn" id="whyp-reset">↺ Reset</button>
      </div>
      <div class="canvas-controls" style="margin-top:8px">
        <span class="ctrl-label">Walls:</span>
        <button class="ctrl-btn" id="whyp-lead" data-wall="lead">⏱️ Lead Time: off</button>
        <button class="ctrl-btn" id="whyp-cap"  data-wall="cap">🏭 Finite Capacity: off</button>
        <button class="ctrl-btn" id="whyp-comp" data-wall="comp">🥇 Competing Order: off</button>
      </div>
      <div id="whyp-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>First, the words on this page</h3>
      <p>Before the walls make sense, four plain-English terms. Each one is something you can point at in the picture above.</p>
      <div class="info-grid" style="margin-top:4px">
        <div class="info-card" style="border-left:3px solid #94a3b8"><div class="info-card-title">A ${gloss('bucket', 'bucket')} = one column</div><div class="info-card-body">The timeline is cut into equal slots of time — here, weeks. <b>W1, W2, W3 …</b> are the buckets. "The order is due in W6" just means it is needed in that one time-slot. Every unit of supply has to live in <em>some</em> bucket. Think of them as the week-columns on a calendar.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">${gloss('jit', 'Just-In-Time (JIT)')} = the right column</div><div class="info-card-body">Supply made <b>in the same bucket</b> it is due — the green bar landing on W6. This is the ideal: not early, not late, exactly on time.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">${gloss('build-ahead', 'Build-ahead')} = an earlier column</div><div class="info-card-body">When the due bucket is full, some supply is made in an <b>earlier</b> bucket (W5, W4…) and held as inventory until W6. The blue bars sitting to the <em>left</em> of the due week.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">${gloss('build-late', 'Build-late')} = a later column</div><div class="info-card-body">When even the earlier buckets are taken, supply spills into a bucket <b>after</b> the due date (W7…) and the order is late. The amber bars sitting to the <em>right</em> of the due week.</div></div>
      </div>
      <p style="margin-top:12px">The faint outline on each column is that bucket's <strong>${gloss('capacity', 'capacity')}</strong> — the most that bucket can hold (here ${CAP} units). Unlike inventory, capacity <em>cannot be saved</em>: whatever a bucket doesn't use is gone when that week ends. That is exactly why work has to spread sideways into other buckets.</p>
      <h3 style="margin-top:16px">Now, what you’re watching</h3>
      <p>With <strong>all walls down</strong>, the order is a fantasy: the whole ${QTY} units simply appear on the due bucket, Just-In-Time. That’s an <strong>unconstrained</strong> plan.</p>
      <p>Raise <strong>Lead Time</strong> and nothing is instant any more — the supply has to be <em>started</em> buckets before it can arrive. Raise <strong>Finite Capacity</strong> and the due bucket can only hold ${CAP}; the rest must be made earlier and carried as inventory (<strong>build-ahead</strong>). Raise the <strong>Competing Order</strong> — a higher-priority demand that is planned first — and it takes the nearest capacity, shoving our order into build-ahead and even <strong>build-late</strong>. The order never changed; its fate did. That shifting-in-time, repeated across thousands of items, <em>is</em> planning.</p>
    </div>`;

  const canvas = tab.querySelector('#whyp-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const PAD_L = 55, PAD_R = 25, BASELINE = 236, SCALE = 0.86;
  const slotW = (canvas.width - PAD_L - PAD_R) / N;
  const barW = Math.min(50, slotW * 0.6);
  const bucketX = (i) => PAD_L + i * slotW + (slotW - barW) / 2;

  const state = { lead: false, cap: false, comp: false };
  let loading = false, loaded = 0;
  const RATE = 5;

  function competitor() {
    const c = {};
    if (state.comp) { c[5] = CAP; c[4] = CAP; } // 120 units: JIT bucket, then nearest
    return c;
  }

  function plan(units) {
    const cons = {}; for (let i = 0; i < N; i++) cons[i] = { q: 0, kind: null };
    const comp = competitor();
    if (!state.cap) { cons[DUE] = { q: units, kind: 'jit' }; return { cons, comp, short: 0 }; }
    let rem = units;
    for (const b of ORDER) {
      if (rem <= 0) break;
      if (comp[b]) continue;
      const t = Math.min(rem, CAP);
      cons[b] = { q: t, kind: b === DUE ? 'jit' : (b < DUE ? 'ahead' : 'late') };
      rem -= t;
    }
    return { cons, comp, short: Math.max(0, rem) };
  }

  const KIND_COLOR = { jit: '#10B981', ahead: '#38BDF8', late: '#F59E0B' };

  function setLedger(cards) {
    tab.querySelector('#whyp-ledger').innerHTML = cards.map(c => `
      <div class="info-card" style="border-left:3px solid ${c.color}"><div class="info-card-title">${c.title}</div><div class="info-card-body">${c.body}</div></div>`).join('');
  }

  function wallsLine() {
    const on = [];
    if (state.lead) on.push('Lead Time'); if (state.cap) on.push('Finite Capacity'); if (state.comp) on.push('Competing Order');
    return on.length ? on.join(' + ') : 'none (fantasy world)';
  }

  function reset() {
    loading = false; loaded = 0;
    setLedger([{ color: '#64748B', title: `Walls up: ${wallsLine()}`, body: `A single order for <b>${QTY}</b> units due on <b>W6</b>. Press <b>Run</b> to load it onto the timeline.` }]);
  }
  function run() { loading = true; loaded = 0; }

  function finish() {
    loading = false;
    const { cons, short } = plan(QTY);
    let jit = 0, ahead = 0, late = 0;
    for (let i = 0; i < N; i++) { const c = cons[i]; if (c.kind === 'jit') jit += c.q; if (c.kind === 'ahead') ahead += c.q; if (c.kind === 'late') late += c.q; }
    const cards = [{ color: '#64748B', title: `Walls up: ${wallsLine()}`, body: `Order <b>${QTY}</b> · due W6. ${state.cap ? `Each bucket holds only <b>${CAP}</b>.` : 'Capacity treated as infinite.'}` }];
    if (!state.cap) {
      cards.push({ color: '#10B981', title: '✓ Unconstrained → all Just-In-Time', body: `All <b>${QTY}</b> units land on the due bucket. ${state.lead ? 'Lead time only means production must <b>start earlier</b> — arrival is still JIT.' : 'Nothing gets in the way.'} This is the pure demand signal.` });
    } else {
      if (jit) cards.push({ color: '#10B981', title: `✓ ${jit} built Just-In-Time`, body: 'Made in the due bucket itself — arrives exactly on time.' });
      if (ahead) cards.push({ color: '#38BDF8', title: `◀ ${ahead} built ahead`, body: 'The due bucket was full, so this is made in <b>earlier</b> buckets and carried as inventory until the due date.' });
      if (late) cards.push({ color: '#F59E0B', title: `▶ ${late} built late`, body: state.comp ? 'The higher-priority order took the nearest capacity, so this part can only be made <b>after</b> the due date → the order is late.' : 'Build-ahead capacity was exhausted, so this part is made <b>after</b> the due date → late.' });
      if (short > 0) cards.push({ color: '#EF4444', title: `✗ ${short} short`, body: 'No capacity left anywhere in the window → this part cannot be made at all.' });
      if (state.comp) cards.push({ color: '#A78BFA', title: 'Priority decided this', body: 'Our order didn’t change — a <b>higher-priority</b> order was simply planned first and consumed the Just-In-Time capacity.' });
    }
    setLedger(cards);
  }

  function bar(x, q, color, stroke) { const h = q * SCALE; if (h > 0.5) drawRoundRect(ctx, x, BASELINE - h, barW, h, 3, color, stroke); }

  let raf = null;
  function draw() {
    if (loading) { loaded += RATE * (state.cap ? 1 : 2.4); if (loaded >= QTY) { loaded = QTY; finish(); } }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // due-bucket highlight
    ctx.fillStyle = '#10B98112'; ctx.fillRect(bucketX(DUE) - 8, 60, slotW, BASELINE - 60);

    const { cons, comp } = plan(Math.min(loaded, QTY));

    for (let i = 0; i < N; i++) {
      const x = bucketX(i);
      // capacity outline when the wall is up
      if (state.cap) { drawRoundRect(ctx, x, BASELINE - CAP * SCALE, barW, CAP * SCALE, 3, '#0d1424', '#1E293B'); }
      // competitor (grey) sits at the base, our supply stacks on top
      let base = 0;
      if (comp[i]) { bar(x, comp[i], '#475569', '#64748Baa'); base = comp[i]; }
      const c = cons[i];
      if (c.q > 0) {
        const h = c.q * SCALE, y = BASELINE - base * SCALE - h;
        drawRoundRect(ctx, x, y, barW, h, 3, KIND_COLOR[c.kind], KIND_COLOR[c.kind] + 'aa');
      }
      ctx.textAlign = 'center'; ctx.font = '10px system-ui';
      ctx.fillStyle = i === DUE ? '#10B981' : '#94a3b8';
      ctx.fillText('W' + (i + 1), x + barW / 2, BASELINE + 16);
    }

    // due marker
    ctx.fillStyle = '#10B981'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('DUE · W6', bucketX(DUE) + barW / 2, 52);

    // lead-time annotation
    if (state.lead) {
      const y = BASELINE + 34;
      const xDue = bucketX(DUE) + barW / 2, xStart = bucketX(DUE - LEAD) + barW / 2;
      drawArrow(ctx, xDue, y, xStart, y, '#A78BFA', 1.5);
      ctx.fillStyle = '#A78BFA'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('lead time: start here', (xDue + xStart) / 2, y + 12);
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#10B981'; ctx.fillText('■ JIT', PAD_L, 24);
    ctx.fillStyle = '#38BDF8'; ctx.fillText('■ build-ahead', PAD_L + 55, 24);
    ctx.fillStyle = '#F59E0B'; ctx.fillText('■ build-late', PAD_L + 165, 24);
    ctx.fillStyle = '#475569'; ctx.fillText('■ competing order', PAD_L + 270, 24);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(`order ${QTY}  ·  loaded ${Math.round(Math.min(loaded, QTY))}`, PAD_L + 420, 24);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  function syncWallBtn(wall) {
    const labels = { lead: '⏱️ Lead Time', cap: '🏭 Finite Capacity', comp: '🥇 Competing Order' };
    const btn = tab.querySelector(`[data-wall="${wall}"]`);
    btn.textContent = `${labels[wall]}: ${state[wall] ? 'ON' : 'off'}`;
    btn.classList.toggle('active', state[wall]);
  }
  tab.querySelectorAll('[data-wall]').forEach(b => b.addEventListener('click', () => {
    const w = b.dataset.wall; state[w] = !state[w]; syncWallBtn(w); reset();
  }));
  tab.querySelector('#whyp-run').addEventListener('click', run);
  tab.querySelector('#whyp-reset').addEventListener('click', reset);
  ['lead', 'cap', 'comp'].forEach(syncWallBtn);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ── Tab 2: the three walls ───────────────────────────────────────────────────
function wallsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The three walls every plan hits</div><div class="section-desc">Each wall is a fact of the physical world the solver cannot wish away — only plan around. Each one is the subject of a later module.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">1 · Nothing is instant (${gloss('lead-time', 'lead time')})</div><div class="info-card-body">Making, moving, or buying anything takes time. So supply must be <strong>started before</strong> the due date — the solver steps backward over working days to find the start date (the <strong>${gloss('lead-offset', 'lead-time offset')}</strong>). → <em>Activity &amp; Parameters</em>.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">2 · You can’t do it all at once (${gloss('capacity', 'finite capacity')})</div><div class="info-card-body">A resource can only produce so much per <strong>${gloss('bucket', 'bucket')}</strong>, and that capacity <strong>expires</strong> at the bucket’s end — it can’t be saved. When demand exceeds a bucket, work shifts to <strong>${gloss('build-ahead', 'build-ahead')}</strong> or <strong>${gloss('build-late', 'build-late')}</strong>. → <em>Capacity</em>.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">3 · Supply is scarce (${gloss('priority', 'priority')})</div><div class="info-card-body">When several demands want the same limited supply, someone must go first. The solver plans in <strong>priority order</strong>; the earlier demand consumes the scarce JIT supply, so a later one may be forced to wait. → <em>Demand Sorting</em>.</div></div>
      </div>
      <div class="canvas-explainer"><h3>Put together</h3>
        <p>Lead time says <em>when</em> you must start. Capacity says <em>how much</em> you can make in each period. Priority says <em>who</em> gets the scarce supply first. A plan is simply the set of start-dates and quantities that respects all three at once — for every order, part and period in the network. Doing that by hand is impossible at scale, which is the whole point of the next module.</p>
      </div>
    </div>`;
}

// ── Tab 3: why a solver (not a spreadsheet) ──────────────────────────────────
function whySolverTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Why a solver, not a spreadsheet</div><div class="section-desc">The three walls interact. Solving one order changes what’s left for the next — so the problem explodes combinatorially.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">The combination explodes</div><div class="info-card-body">Thousands of items × many locations × hundreds of time buckets × alternate ${gloss('sourcing', 'sources')} and ${gloss('routing', 'routings')}. Every choice for one order changes the capacity and material left for every other order. No spreadsheet can re-balance that consistently.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">It must be repeatable &amp; explainable</div><div class="info-card-body">Planners re-run the plan constantly as demand and supply change. The result has to be the same given the same inputs, and every short or late order has to come with a <strong>reason</strong> (${gloss('rca', 'RCA')}). A rule-based engine gives both.</div></div>
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">It must be fast</div><div class="info-card-body">Plans run over huge networks on a schedule. Searching for the mathematically perfect answer (${gloss('lp-mip', 'LP / MIP')}) is too slow and too opaque at this scale, so the SCS uses a <strong>${gloss('heuristic', 'heuristic')}</strong> — a smart, fast, good-enough rule set.</div></div>
      </div>
      <div class="canvas-explainer"><h3>So what is the solver?</h3>
        <p>The <strong>${gloss('scs', 'Supply Chain Solver')}</strong> is a ${gloss('heuristic', 'heuristic')} engine that walks through demands one at a time, in priority order, and for each one finds feasible supply that respects lead time and capacity — building ahead or late when it must, and reporting a root cause when it can’t. The next module, <em>What is the Solver</em>, opens that engine up. Everything after that is just the detail of <em>how</em> it makes this match reliably and at scale.</p>
      </div>
    </div>`;
}
