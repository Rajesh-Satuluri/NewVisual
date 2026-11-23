// cheatsheet.js — a dense, print-friendly quick reference. Grounded in the
// glossary TERMS and the mechanics taught across the curriculum. No new facts
// are invented here; definitions are pulled from TERMS where one exists.
import { TERMS } from './glossary.js';

// Look up a glossary definition by (partial) term name, for grounding.
const term = name => (TERMS.find(t => t.t.toLowerCase().includes(name.toLowerCase()))?.d) || '';

// Each section: a title, a short lead, and either rows (2-col table) or cards.
function sections() {
  return [
    {
      id: 'pipeline',
      title: 'The core loop',
      lead: 'What the solver does with every demand, in order.',
      cards: [
        ['1 · Sort', 'All demands are sorted once; the solver then plans them <strong>one at a time</strong> in that order (Order-by-Order). Earlier demands consume scarce supply first.'],
        ['2 · Net', 'For the demand, compute the <strong>net requirement</strong> it must still create or source.'],
        ['3 · Time', 'Try to deliver <strong>JIT</strong>; if infeasible, <strong>build ahead</strong> (within limit), else <strong>build late</strong> (within limit).'],
        ['4 · Source & peg', 'Pick sources, offset by lead time downstream→upstream, and <strong>peg</strong> supply to the demand. Then move to the next demand.'],
      ],
    },
    {
      id: 'sort',
      title: 'Demand sort order',
      lead: 'The keys, in precedence. Lower value = planned earlier.',
      rows: [
        ['1. Fulfillment Priority', 'Primary key. ' + term('Fulfillment Priority')],
        ['2. Fair-Share Priority', 'Spreads scarce supply across peers at the same tier before fully filling one.'],
        ['3. Due Date', 'Earlier due dates first.'],
        ['4. Quantity', 'Tie-break by quantity.'],
        ['5. Key', 'Final deterministic tie-break on the demand key.'],
      ],
    },
    {
      id: 'timing',
      title: 'Timing phases',
      lead: 'Tried in this order for every demand.',
      rows: [
        ['JIT (Just-In-Time)', term('JIT') || 'Supply arrives exactly when the demand is due — the preferred phase.'],
        ['Build-Ahead (within BAL)', term('Build-Ahead Limit') || 'Build early and carry, up to the Build-Ahead Limit.'],
        ['Build-Late (within BLL)', term('Build-Late Limit') || 'Arrive late, up to the Build-Late Limit; minimise lateness. Beyond it → short.'],
      ],
    },
    {
      id: 'formulas',
      title: 'Key formulas',
      lead: 'The arithmetic the solver runs per demand.',
      cards: [
        ['Net requirement', '<code>max(0, Demand − On-Hand + Safety Stock)</code><div class="cs-note">' + (term('Net Requirement') || 'The quantity still to create or source.') + '</div>'],
        ['Lead-time offset', '<div class="cs-note">' + (term('Lead-Time Offset') || 'Step backward over working days from the due date by the lead time to find the start/order date.') + '</div>'],
        ['Lot sizing', 'Raise to <strong>Min</strong> → round up to <strong>Multiple</strong> → cap at <strong>Max</strong>.<div class="cs-note">' + (term('Lot Size') || '') + '</div>'],
        ['Excess clean-up', 'Release or move out supply above <code>Ending-On-Hand − Safety Stock</code>.'],
      ],
    },
    {
      id: 'sourcing',
      title: 'Sourcing & pegging',
      lead: 'Choosing producers and tracing the result.',
      rows: [
        ['Sourcing split', term('Sourcing Split') || 'Proportional allocation across alternate sources by split %, priority and effectivity.'],
        ['Alternate choice', 'Among alternates: priority, proportion, key, end-date.'],
        ['Pegging', term('Pegging') || 'Traceable demand→supply link, in a from→to grain.'],
        ['Peg kinds', 'FIFO order / material / capacity / lot pegging.'],
        ['BOH / EOH', term('BOH') || 'Beginning / Ending On-Hand across inventory buckets, period over period.'],
      ],
    },
    {
      id: 'rca',
      title: 'Root-cause problem types',
      lead: 'Why a demand is short or late. Each comes with a suggested available date.',
      rows: [
        ['MaterialShort', 'A required component / material was unavailable in time.'],
        ['CapacityShort', 'A resource had insufficient capacity in the needed bucket.'],
        ['LeadTimePlanBeforeCurrent', 'The required start date falls before the plan-current date — not enough runway.'],
        ['StorageConstraint', 'A storage / max-stock limit blocked the supply.'],
      ],
    },
    {
      id: 'invocation',
      title: 'Invocation & plan types',
      lead: 'How a run is launched.',
      rows: [
        ['Invocation', 'Run via the <code>exec plugin</code> entry point.'],
        ['FULL', 'Plan the whole network from scratch.'],
        ['INCREMENTAL', 'Re-plan only what changed.'],
        ['IDENTIFY_SEGMENTS', 'Find the independent sub-networks (for parallel/segmented solving).'],
        ['EXPORT_ONLY', 'Emit outputs without re-solving.'],
      ],
    },
    {
      id: 'debug',
      title: 'Plan sanity checks',
      lead: 'A valid plan satisfies all three.',
      cards: [
        ['Σ pegging = plan', 'Every planned unit is pegged; pegs sum back to the plan.'],
        ['No negative on-hand', 'On-hand never goes below zero in any bucket.'],
        ['No capacity overload', 'No resource is loaded beyond its capacity band.'],
      ],
    },
  ];
}

function renderSection(s) {
  const body = s.rows
    ? `<div class="table-scroll"><table class="compare-table"><tbody>
        ${s.rows.map(([k, v]) => `<tr><td class="cs-k">${k}</td><td>${v}</td></tr>`).join('')}
      </tbody></table></div>`
    : `<div class="info-grid">
        ${s.cards.map(([k, v]) => `<div class="info-card"><div class="info-card-title">${k}</div><div class="info-card-body">${v}</div></div>`).join('')}
      </div>`;
  return `
    <div class="cs-section" data-search="${(s.title + ' ' + (s.rows || s.cards).flat().join(' ')).toLowerCase()}">
      <div class="section-header"><div class="section-title">${s.title}</div><div class="section-desc">${s.lead}</div></div>
      ${body}
    </div>`;
}

export function mount(container) {
  const secs = sections();
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Reference</div>
        <h1 class="module-title">Cheat Sheet</h1>
        <p class="module-subtitle">Every load-bearing fact about the Supply Chain Solver on one page — sort order, timing phases, formulas, sourcing, root causes and plan types. Filter, or print it.</p>
      </div>
      <div class="scroll-content">
        <input class="nav-filter" id="cs-filter" type="text" placeholder="Filter the sheet…" aria-label="Filter the cheat sheet" style="max-width:420px;margin-bottom:16px" />
        <div id="cs-list" class="cs-grid">
          ${secs.map(renderSection).join('')}
        </div>
      </div>
    </div>

    <style>
      .cs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:18px 22px; align-items:start; }
      .cs-section { break-inside:avoid; }
      .cs-k { font-weight:650; color:var(--text,#E2E8F0); white-space:nowrap; }
      .cs-note { font-size:12px; color:var(--text2,#94A3B8); margin-top:5px; line-height:1.45; }
      .cs-section code { background:rgba(127,127,127,.14); padding:1px 6px; border-radius:5px; font-size:12.5px; }
      @media print { .nav-filter { display:none; } .cs-grid { grid-template-columns:1fr 1fr; } }
    </style>`;

  const filter = container.querySelector('#cs-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    container.querySelectorAll('.cs-section').forEach(sec => {
      sec.hidden = !!q && !(sec.dataset.search || '').includes(q);
    });
  });

  return null;
}
