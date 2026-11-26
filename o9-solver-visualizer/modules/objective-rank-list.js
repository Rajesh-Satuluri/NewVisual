import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is the Objective Rank List, and what are its four levels?',
    a: 'It is the solver\'s objective: a <strong>four-level nested list of soft constraints</strong> the heuristic honours while planning demand — <strong>Band</strong> (capacity band or storage band, or both), <strong>Lot</strong>, <strong>Activity Marker</strong>, and <strong>Late</strong>. When a demand can\'t be met fully, SCS <em>relaxes</em> these constraints to try to satisfy it. The default value is <code>Band, Lot, ActivityMarker, Late</code>.',
    tip: 'Say "the Objective Rank List IS the objective" — there is no separate cost model; re-ordering this list re-decides what the solver sacrifices first.' },
  { q: 'In which direction are the constraints relaxed, and what does that mean for the default list?',
    a: 'The solver relaxes <strong>from right to left</strong>. So the <em>rightmost</em> entry is sacrificed first and the <em>leftmost</em> is protected longest. For the default <code>Band, Lot, ActivityMarker, Late</code>, the relaxation order is <strong>Late → ActivityMarker → Lot → Band</strong> — i.e. the solver would rather be late than break a lot size, and would rather break a lot size than violate a capacity/storage band.',
    tip: 'Rightmost = relaxed first = least protected. Put the thing you care about least on the right.' },
  { q: 'A user sets the Objective Rank List to just "Late, ActivityMarker". What does the solver actually use?',
    a: 'SCS <strong>fills in the missing entries on the right, in the default order</strong>. So <code>Late, ActivityMarker</code> becomes <code>Late, ActivityMarker, Band, Lot</code>. There are <strong>24</strong> possible full orderings (4!), but you only ever specify as many as you want to reorder — the rest default in. (Relaxation is still right-to-left on the completed list.)',
    tip: 'Mention the auto-fill-on-the-right rule and the 24 combinations — it shows you know the parameter\'s real behaviour.' },
];

const DEFAULT = [
  { key: 'Band', label: 'Band', desc: 'capacity / storage band', color: '#38BDF8' },
  { key: 'Lot', label: 'Lot', desc: 'lot-size adherence', color: '#A78BFA' },
  { key: 'ActivityMarker', label: 'Activity Marker', desc: 'e.g. "Fresh" exclusion', color: '#F59E0B' },
  { key: 'Late', label: 'Late', desc: 'on-time delivery', color: '#10B981' },
];
// For this demand, the blocking constraint is the Activity Marker ("Fresh"): the
// demand can only be met once Activity Marker is relaxed (the wiki Fresh/Lot case).
const BLOCKER = 'ActivityMarker';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Solver Inputs',
    title: 'The Objective Rank List',
    subtitle: 'The four soft constraints — Band, Lot, Activity Marker, Late — that the solver relaxes, right to left, when a demand can\'t be met. Re-order the list and watch it change which constraint gets sacrificed first.',
    tabs: [
      { id: 'relax', label: '🎚️ Relaxation Order' },
      { id: 'levels', label: '🪜 The Four Levels', content: levelsTab() },
      { id: 'rules', label: '📜 How Relaxation Works', content: rulesTab() },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  const cleanup = buildCanvas(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildCanvas(container) {
  const tab = container.querySelector('#tab-relax');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The rank list below is the solver's objective. A demand for <b>FG_1 @ VMI_1</b> is <b>short</b> — it can only be met by relaxing the <b>Activity Marker</b> ("Fresh") constraint. Press <b>Relax Next</b> to relax one constraint at a time (<b>right → left</b>). Select a box and use <b>◀ / ▶</b> to re-order — then watch how many constraints you have to sacrifice.</div>
      <canvas id="orl-canvas" width="820" height="250" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="orl-run">▶ Relax Next (right→left)</button>
        <button class="ctrl-btn" id="orl-left">◀ Move</button>
        <button class="ctrl-btn" id="orl-right">Move ▶</button>
        <button class="ctrl-btn" id="orl-reset">↺ Reset</button>
        <span class="ctrl-label" id="orl-status">Default order. Demand short — relax to satisfy.</span>
      </div>
      <div id="orl-ledger" class="info-grid" style="margin-top:14px"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each relaxation lets the solver break one more rule to try to fulfil the demand. Because it relaxes <strong>right to left</strong>, the entry you place on the <strong>right is given up first</strong>. With the default <code>Band, Lot, ActivityMarker, Late</code>, the solver relaxes <em>Late</em> first (pointlessly, here) and only reaches <em>ActivityMarker</em> on the second step — so the demand is met after <strong>two</strong> sacrifices. Move <strong>Activity Marker</strong> to the far right and it is relaxed first: the demand is met after <strong>one</strong>, protecting Lot and Band.</p>
      <p>This is the whole idea of the Objective Rank List: there is no hidden cost function. <strong>The order you choose decides what the solver is willing to break first</strong> — lateness, lot sizes, activity markers, or capacity/storage bands.</p>
    </div>`;

  const canvas = tab.querySelector('#orl-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let list, relaxedCount, met, sel;
  function reset() {
    list = DEFAULT.map(d => ({ ...d }));
    relaxedCount = 0; met = false; sel = -1;
    renderLedger();
    setStatus('Default order. Demand short — relax to satisfy.');
  }
  function setStatus(t) { const el = tab.querySelector('#orl-status'); if (el) el.textContent = t; }

  // relaxed set = the rightmost `relaxedCount` entries
  function isRelaxed(i) { return i >= list.length - relaxedCount; }

  function relaxNext() {
    if (met) return;
    if (relaxedCount >= list.length) { setStatus('All four constraints relaxed — demand still cannot be met from this network.'); return; }
    relaxedCount++;
    const justRelaxed = list[list.length - relaxedCount];
    // met once Activity Marker has been relaxed
    const relaxedKeys = list.slice(list.length - relaxedCount).map(x => x.key);
    met = relaxedKeys.includes(BLOCKER);
    renderLedger();
    if (met) setStatus(`Relaxed ${justRelaxed.label} → demand MET after ${relaxedCount} sacrifice${relaxedCount > 1 ? 's' : ''}.`);
    else setStatus(`Relaxed ${justRelaxed.label} → still short. Relax the next one.`);
  }

  function move(dir) {
    if (sel < 0 || relaxedCount > 0) return; // only reorder before relaxing
    const j = sel + dir;
    if (j < 0 || j >= list.length) return;
    [list[sel], list[j]] = [list[j], list[sel]];
    sel = j;
    renderLedger();
  }

  function renderLedger() {
    const order = list.map(x => x.label).join(' → ');
    const relaxOrder = [...list].reverse().map(x => x.label).join(' → ');
    const items = [
      `<div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Rank list (left = most protected)</div><div class="info-card-body"><code>${order}</code></div></div>`,
      `<div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Relaxation order (right → left)</div><div class="info-card-body"><code>${relaxOrder}</code></div></div>`,
    ];
    if (met) items.push(`<div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">✓ Demand met</div><div class="info-card-body">Activity Marker relaxed → the "Fresh" activity {Factory→WH_1} is allowed → Lot 1 pegged from Factory. Sacrifices made: <b>${relaxedCount}</b>.</div></div>`);
    tab.querySelector('#orl-ledger').innerHTML = items.join('');
  }

  const BX = 60, BW = 160, GAP = 24, BY = 96, BH = 70;
  function boxX(i) { return BX + i * (BW + GAP); }

  let raf = null;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // protect ◀ ... relax ▶ guide
    ctx.textAlign = 'left'; ctx.font = '10px system-ui';
    ctx.fillStyle = '#38BDF8'; ctx.fillText('◀ most protected (relaxed last)', BX, 56);
    ctx.textAlign = 'right'; ctx.fillStyle = '#F59E0B'; ctx.fillText('relaxed first ▶', boxX(list.length - 1) + BW, 56);

    list.forEach((item, i) => {
      const x = boxX(i), relaxed = isRelaxed(i), selted = sel === i;
      const col = relaxed ? '#475569' : item.color;
      drawRoundRect(ctx, x, BY, BW, BH, 10, relaxed ? '#15171c' : '#111827', selted ? '#fff' : col);
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px system-ui'; ctx.fillStyle = col;
      ctx.fillText(item.label, x + BW / 2, BY + 28);
      ctx.font = '10px system-ui'; ctx.fillStyle = relaxed ? '#5a6678' : '#8A98AE';
      ctx.fillText(item.desc, x + BW / 2, BY + 48);
      // rank index
      ctx.font = '9px system-ui'; ctx.fillStyle = '#475569';
      ctx.fillText('rank ' + (i + 1), x + BW / 2, BY + 63);
      if (relaxed) { ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#EF4444'; ctx.fillText('✗ relaxed', x + BW / 2, BY - 8); }
      // strike-through when relaxed
      if (relaxed) { ctx.strokeStyle = '#EF444488'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, BY + BH / 2); ctx.lineTo(x + BW - 14, BY + BH / 2); ctx.stroke(); }
    });

    // demand status banner
    ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
    ctx.fillStyle = met ? '#10B981' : '#F59E0B';
    ctx.fillText(met ? '● Demand MET' : '● Demand SHORT — relax to satisfy', 410, 210);

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  // clicking a box selects it (for reorder)
  canvas.addEventListener('click', e => {
    if (relaxedCount > 0) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    sel = -1;
    list.forEach((_, i) => { if (x >= boxX(i) && x <= boxX(i) + BW && y >= BY && y <= BY + BH) sel = i; });
  });

  tab.querySelector('#orl-run').addEventListener('click', relaxNext);
  tab.querySelector('#orl-left').addEventListener('click', () => move(-1));
  tab.querySelector('#orl-right').addEventListener('click', () => move(1));
  tab.querySelector('#orl-reset').addEventListener('click', reset);
  reset();

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function levelsTab() {
  const rows = [
    ['Band', 'Relax a capacity band or storage band (or both) — use flex capacity / extra storage beyond the base.', '#38BDF8'],
    ['Lot', 'Relax lot-size adherence — allow quantities that don\'t perfectly honour min / multiple.', '#A78BFA'],
    ['Activity Marker', 'Relax an activity marker exclusion — e.g. use an activity marked "Fresh" that was excluded in the first pass.', '#F59E0B'],
    ['Late', 'Relax on-time delivery — allow the demand to be met late (within the Build-Late Limit).', '#10B981'],
  ];
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">The four soft constraints</div><div class="section-desc">SCS can plan demand based on Bands, Lots and Activity Markers, and can plan Late. The Objective Rank List is a four-level nested list of exactly these.</div></div>
      <div class="info-grid">
        ${rows.map(([k, d, c]) => `<div class="info-card" style="border-left:3px solid ${c}"><div class="info-card-title">${k}</div><div class="info-card-body">${d}</div></div>`).join('')}
      </div>
      <div class="canvas-explainer"><h3>Why it's "the objective"</h3><p>These are the only knobs the heuristic bends to fulfil a demand. There is no separate cost function deciding trade-offs behind the scenes — the solver simply relaxes these four, in the order you rank them. That is why, in production, you tune the <em>plan</em> by re-ordering this list rather than by re-weighting a cost model.</p></div>
    </div>`;
}

function rulesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">How the list is applied</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Relax right → left</div><div class="info-card-body">If a demand isn't met fully, SCS relaxes constraints <strong>from the right entry to the left</strong>. The rightmost is sacrificed first; the leftmost is protected longest.</div></div>
        <div class="info-card" style="border-left:3px solid #6366F1"><div class="info-card-title">Default value</div><div class="info-card-body"><code>Band, Lot, ActivityMarker, Late</code> → relaxes <strong>Late → ActivityMarker → Lot → Band</strong>. A Basic parameter, set in the Parameter tab or passed dynamically.</div></div>
        <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">Auto-fill on the right</div><div class="info-card-body">Give fewer than four and the solver appends the missing ones on the right in default order: <code>Late, ActivityMarker</code> → <code>Late, ActivityMarker, Band, Lot</code>.</div></div>
        <div class="info-card" style="border-left:3px solid #A78BFA"><div class="info-card-title">24 orderings</div><div class="info-card-body">All 4! = <strong>24</strong> permutations are supported — pick the one that matches the business objective.</div></div>
      </div>
      <div class="section-header" style="margin-top:20px"><div class="section-title">Worked use case — Activity Marker &amp; Lot (Fresh exclusion)</div><div class="section-desc">No flex capacity and Build-Late Limit = 0, so Band and Late are irrelevant here — only Lot and Activity Marker matter.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">1st pass — marker respected</div><div class="info-card-body">Demand 100 of FG_1 at VMI_1. Lot 1 isn't at WH_1, so SCS goes upstream — but activity {Factory→WH_1} is marked <strong>"Fresh"</strong> and is <strong>excluded</strong> in the first pass. Demand still short.</div></div>
        <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">2nd pass — marker relaxed</div><div class="info-card-body">SCS <strong>relaxes the Activity Marker</strong>, uses the Fresh activity, reaches {FG_1, Factory} (infinite inventory, Lot 1), and <strong>pegs 100 units of Lot 1</strong> to the demand. The leftover 10 of Lot 2 at WH_1 is pegged to stock.</div></div>
      </div>
    </div>`;
}
