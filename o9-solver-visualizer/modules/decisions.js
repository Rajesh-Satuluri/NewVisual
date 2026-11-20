// decisions.js — "Decision Drills" practice page.
// Multiple-choice scenario cards covering the core solver mechanics taught in
// the curriculum (sorting, timing phases, net requirement, lot sizing,
// sourcing split, pegging, excess cleanup). Each attempt is persisted to the
// shared progress store so the Dashboard / Readiness views can aggregate it.
import { record, counts, reset } from '../data/progress-store.js';

// Each drill: { id, topic, q, options:[...], answer:index, why }.
const DRILLS = [
  {
    id: 'jit-fallback',
    topic: 'Timing phases',
    q: 'A demand cannot be met Just-In-Time because supply cannot arrive exactly on the due date. Within its limits, what does the solver try next?',
    options: [
      'Immediately declares the demand short and moves on',
      'Builds ahead of the due date (up to the Build-Ahead Limit), and only then builds late (within the Build-Late Limit)',
      'Ignores capacity and forces the supply into the JIT bucket',
      'Re-sorts the whole demand list and starts over',
    ],
    answer: 1,
    why: 'The three timing phases run in order: <strong>JIT</strong> → <strong>Build-Ahead</strong> (carry stock earlier, bounded by the Build-Ahead Limit) → <strong>Build-Late</strong> (arrive after the due date, bounded by the Build-Late Limit). Only when all three fail is the demand declared short.',
  },
  {
    id: 'scarce-first',
    topic: 'Demand sorting',
    q: 'Two demands compete for the last scarce unit of supply. Which one does the solver plan first?',
    options: [
      'The one with the larger quantity',
      'Whichever appears first in the input file',
      'The one with the earlier (lower) Demand Fulfillment Priority',
      'They split the supply 50/50',
    ],
    answer: 2,
    why: 'The solver plans <strong>one demand at a time in sorted order</strong>. The primary key is <strong>Demand Fulfillment Priority</strong> (lower = earlier), then Fair-Share Priority, then Due Date, then Quantity, then key. The earlier-sorted demand consumes the scarce supply first.',
  },
  {
    id: 'lot-multiple',
    topic: 'Lot sizing',
    q: 'Net requirement is 45. The item has lot Min 20 and Multiple 25 (no Max). How many units are ordered?',
    options: ['45', '40', '50', '25'],
    answer: 2,
    why: 'Lot sizing raises to the <strong>Minimum</strong> (45 ≥ 20, unchanged) then <strong>rounds up to the Multiple</strong> of 25 → the next multiple above 45 is <strong>50</strong>. That creates 5 units of planned excess above the net requirement.',
  },
  {
    id: 'net-req',
    topic: 'Net requirement',
    q: 'Demand is 40, on-hand is 30, and safety stock is 20. What is the net requirement the solver must create or source?',
    options: ['10', '30', '40', '0'],
    answer: 1,
    why: 'Net requirement = <strong>max(0, demand − on-hand + safety stock)</strong> = max(0, 40 − 30 + 20) = <strong>30</strong>. Safety stock is additive to demand because it must be preserved, not consumed.',
  },
  {
    id: 'lot-max',
    topic: 'Lot sizing',
    q: 'Net requirement is 500 but the item has a Maximum Lot of 300. What does the solver do?',
    options: [
      'Orders a single lot of 500, ignoring the Max',
      'Caps the lot at 300; the remaining 200 needs a further lot/order',
      'Drops the demand because 500 exceeds the Max',
      'Rounds the whole thing down to 300 and declares the rest met',
    ],
    answer: 1,
    why: 'The <strong>Maximum Lot</strong> caps a single order at 300. The solver cannot satisfy 500 in one lot, so the remainder (200) must be covered by an additional lot/order — and if timing/capacity cannot fit it, that remainder is what shows up short.',
  },
  {
    id: 'sourcing-split',
    topic: 'Sourcing',
    q: 'An item is sourced from two suppliers with a 70/30 split. A net requirement of 100 arrives. How does the solver allocate it (both sources effective and available)?',
    options: [
      'All 100 to the higher-priority source',
      '70 to the first source and 30 to the second, by the split percentages',
      '50/50 regardless of the split',
      'It picks one source at random',
    ],
    answer: 1,
    why: 'A <strong>Sourcing Split</strong> allocates proportionally by split percentage (subject to priority and effectivity). A 70/30 split on 100 units sends <strong>70</strong> to the first source and <strong>30</strong> to the second. If one source cannot deliver, the solver reallocates within the sourcing rule.',
  },
  {
    id: 'excess-cleanup',
    topic: 'Excess cleanup',
    q: 'After planning, a node holds supply that no demand pegs to (e.g. left over from lot rounding). What does the solver do with it?',
    options: [
      'Leaves it as unpegged excess and may clean it up rather than carry phantom supply',
      'Automatically creates a new demand to consume it',
      'Deletes the demand that caused it',
      'Treats it as safety stock permanently',
    ],
    answer: 0,
    why: 'Supply that no demand pegs to is <strong>excess</strong>. Lot rounding and minimums routinely create it. The solver identifies unpegged supply during <strong>excess cleanup</strong> so the plan does not carry phantom supply that overstates availability.',
  },
  {
    id: 'pegging-grain',
    topic: 'Pegging',
    q: 'What does a pegging record actually link?',
    options: [
      'Two unrelated demands in the same bucket',
      'A demand to the specific supply that fills it, in a from→to grain',
      'A resource to its calendar',
      'A forecast to its actuals',
    ],
    answer: 1,
    why: '<strong>Pegging</strong> is the traceable link from a <strong>demand back to the specific supply</strong> that fills it, recorded at a from→to grain. It is what makes a plan explainable — you can follow any demand down to the exact supply (and genealogy) that satisfies it.',
  },
  {
    id: 'obo-order',
    topic: 'OBO heuristic',
    q: 'Why does planning one demand to completion before the next (order-by-order) matter for a scarce resource?',
    options: [
      'It makes the solver run slower but more accurate',
      'Earlier-sorted demands consume scarce supply first, so priority order decides who is satisfied',
      'It guarantees every demand is met in full',
      'It removes the need for a demand sort',
    ],
    answer: 1,
    why: 'Because the solver is a <strong>sequential, order-by-order heuristic</strong>, the first demand planned takes the scarce supply it needs before the next is even considered. The <strong>sort order therefore IS the rationing rule</strong> — there is no global optimisation that could hand the supply to a later demand.',
  },
  {
    id: 'build-late-short',
    topic: 'Timing phases',
    q: 'Supply for a demand can only arrive 3 buckets after the due date, but the Build-Late Limit is 2 buckets. What happens?',
    options: [
      'The supply is accepted anyway at +3',
      'The part that cannot arrive within +2 is declared short/late beyond the limit',
      'The Build-Late Limit is automatically extended',
      'The demand is re-prioritised to the top',
    ],
    answer: 1,
    why: 'The <strong>Build-Late Limit</strong> bounds how late supply may arrive. If the earliest feasible arrival (+3) exceeds the limit (+2), that supply is outside the allowed window, so the demand is declared <strong>short</strong> (nothing valid can satisfy it within the limit).',
  },
];

const KEY = 'decisions';

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Practice</div>
        <h1 class="module-title">Decision Drills</h1>
        <p class="module-subtitle">Ten scenario questions on how the solver actually decides — sorting, timing phases, net requirement, lot sizing, sourcing, pegging and cleanup. Pick an answer, check it, and watch your score build.</p>
      </div>
      <div class="scroll-content">
        <div class="info-grid" style="grid-template-columns:1fr;margin-bottom:6px">
          <div class="info-card" style="border-left:3px solid #38BDF8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div class="info-card-body" id="dd-score" style="margin:0;font-size:15px">Loading score…</div>
            <div style="display:flex;gap:8px">
              <input class="nav-filter" id="dd-filter" type="text" placeholder="Filter by topic…" aria-label="Filter drills" style="max-width:220px;margin:0" />
              <button class="ctrl-btn" id="dd-reset">↺ Reset progress</button>
            </div>
          </div>
        </div>
        <div id="dd-list"></div>
      </div>
    </div>`;

  const listEl = container.querySelector('#dd-list');
  listEl.innerHTML = DRILLS.map((d, i) => cardHTML(d, i)).join('');

  // Restore any prior answers.
  DRILLS.forEach((d) => {
    const prior = (function () { try { return JSON.parse(localStorage.getItem('o9scs-progress-v1') || '{}')[KEY]?.[d.id] || null; } catch { return null; } })();
    if (prior && typeof prior.picked === 'number') revealCard(container, d, prior.picked);
  });

  listEl.addEventListener('click', (e) => {
    const opt = e.target.closest('.dd-opt');
    if (!opt) return;
    const card = opt.closest('.dd-card');
    if (card.classList.contains('answered')) return;
    const id = card.dataset.id;
    const picked = Number(opt.dataset.i);
    const drill = DRILLS.find((d) => d.id === id);
    const correct = picked === drill.answer;
    try { record(KEY, id, { picked, correct }); } catch (err) {}
    revealCard(container, drill, picked);
  });

  const filter = container.querySelector('#dd-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    container.querySelectorAll('.dd-card').forEach((c) => {
      const hay = (c.dataset.topic + ' ' + c.textContent).toLowerCase();
      c.hidden = q && !hay.includes(q);
    });
  });

  container.querySelector('#dd-reset')?.addEventListener('click', () => {
    try { reset(KEY); } catch (err) {}
    container.querySelectorAll('.dd-card').forEach((c) => {
      c.classList.remove('answered');
      c.querySelectorAll('.dd-opt').forEach((o) => { o.classList.remove('correct', 'wrong', 'picked'); });
      const ex = c.querySelector('.dd-explain'); if (ex) ex.hidden = true;
    });
    renderScore(container);
  });

  const refresh = () => renderScore(container);
  window.addEventListener('o9scs:progress', refresh);
  renderScore(container);

  return () => { window.removeEventListener('o9scs:progress', refresh); };
}

function cardHTML(d, i) {
  return `
    <div class="dd-card info-card" data-id="${d.id}" data-topic="${d.topic}" style="border-left:3px solid #6366F1;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline">
        <div class="info-card-title">${i + 1}. ${d.q}</div>
        <span style="font-size:11px;color:var(--text2);white-space:nowrap">${d.topic}</span>
      </div>
      <div class="dd-opts" style="margin-top:10px;display:flex;flex-direction:column;gap:7px">
        ${d.options.map((o, oi) => `
          <button class="dd-opt ctrl-btn" data-i="${oi}" style="text-align:left;justify-content:flex-start;white-space:normal;line-height:1.4">${o}</button>`).join('')}
      </div>
      <div class="dd-explain canvas-explainer" hidden style="margin-top:12px"><h3 style="margin-top:0">Why</h3><p>${d.why}</p></div>
    </div>`;
}

function revealCard(container, drill, picked) {
  const card = container.querySelector(`.dd-card[data-id="${drill.id}"]`);
  if (!card) return;
  card.classList.add('answered');
  card.querySelectorAll('.dd-opt').forEach((o) => {
    const oi = Number(o.dataset.i);
    if (oi === drill.answer) o.classList.add('correct');
    if (oi === picked && picked !== drill.answer) o.classList.add('wrong');
    if (oi === picked) o.classList.add('picked');
  });
  const ex = card.querySelector('.dd-explain');
  if (ex) ex.hidden = false;
}

function renderScore(container) {
  const el = container.querySelector('#dd-score');
  if (!el) return;
  let c = { attempted: 0, correct: 0 };
  try { c = counts(KEY); } catch (err) {}
  const pct = c.attempted ? Math.round((c.correct / c.attempted) * 100) : 0;
  el.innerHTML = `<strong>Score:</strong> ${c.correct} / ${c.attempted} correct` +
    (c.attempted ? ` · <strong>${pct}%</strong>` : '') +
    ` &nbsp;·&nbsp; <span style="color:var(--text2)">${DRILLS.length} drills total</span>`;
}
