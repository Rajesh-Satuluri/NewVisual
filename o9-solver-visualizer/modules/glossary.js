// glossary.js — the term bank (exported as TERMS for the Review Center) plus a
// searchable glossary page. TERMS shape: { t:term, c:category, m:moduleId, d:definition }.
export const TERMS = [
  { t:'Supply Chain Solver (SCS)', c:'Core', m:'what-is-solver', d:'o9’s heuristic planning engine (a GraphCube server plugin) that turns demand into time-phased supply decisions by planning one demand at a time in priority order.' },
  { t:'Order-by-Order (OBO)', c:'Core', m:'obo-heuristic', d:'The solver plans each demand to completion, in sorted priority order, before moving to the next — so earlier demands consume scarce supply first.' },
  { t:'Objective Rank List (ORL)', c:'Core', m:'objectives', d:'The ordered list of soft constraints the solver relaxes last-to-first. Because planning is sequential, the ORL effectively IS the objective.' },
  { t:'Demand Fulfillment Priority', c:'Inputs', m:'demand-sorting', d:'The primary demand sort key; lower value = planned earlier. Followed by Fair-Share Priority, Due Date, Quantity, then key.' },
  { t:'JIT (Just-In-Time)', c:'Timing', m:'three-phases', d:'The preferred timing phase: plan supply to arrive exactly when the demand is due.' },
  { t:'Build-Ahead Limit (BAL)', c:'Timing', m:'three-phases', d:'How far ahead of the due date the solver may build and carry supply when JIT is infeasible.' },
  { t:'Build-Late Limit (BLL)', c:'Timing', m:'three-phases', d:'How late supply may arrive before the demand is declared short; the solver minimises lateness within this window.' },
  { t:'Net Requirement', c:'Decisions', m:'net-requirements', d:'max(0, demand − on-hand + safety stock): the quantity the solver must still create or source.' },
  { t:'Lead-Time Offset', c:'Decisions', m:'timing-logic', d:'Stepping backward over working days from the due date by the (multi-part) lead time to find the start/order date.' },
  { t:'Sourcing Split', c:'Decisions', m:'sourcing-logic', d:'Proportional allocation across alternate sources by split percentage, priority and effectivity.' },
  { t:'Pegging', c:'Outputs', m:'pegging', d:'The traceable link from a demand back to the specific supply that fills it, in a from→to grain.' },
  { t:'BOH / EOH', c:'Outputs', m:'inventory-plan', d:'Beginning / Ending On-Hand across the inventory buckets, period over period.' },
  { t:'Root Cause (Problem Type)', c:'Outputs', m:'rca', d:'The reason a demand is short or late — e.g. MaterialShort, CapacityShort, LeadTimePlanBeforeCurrent, StorageConstraint — plus a suggested available date.' },
  { t:'Lot Size (Min / Mult / Max)', c:'Constraints', m:'quantity-constraints', d:'Order quantity rules: raise to minimum, round up to the order multiple, cap at the maximum.' },
];

const CATS = ['Core', 'Inputs', 'Timing', 'Decisions', 'Constraints', 'Outputs'];

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Reference</div>
        <h1 class="module-title">Glossary</h1>
        <p class="module-subtitle">The vocabulary of the Supply Chain Solver. Filter, then use the Review Center to drill the terms as flashcards.</p>
      </div>
      <div class="scroll-content">
        <input class="nav-filter" id="gl-filter" type="text" placeholder="Filter terms…" aria-label="Filter terms" style="max-width:420px;margin-bottom:16px" />
        <div id="gl-list">
          ${CATS.map(cat => {
            const items = TERMS.filter(t => t.c === cat);
            if (!items.length) return '';
            return `
              <div class="section-header"><div class="section-title">${cat}</div></div>
              <div class="info-grid gl-group">
                ${items.map(t => `
                  <div class="info-card gl-item" data-term="${t.t.toLowerCase()}">
                    <div class="info-card-title">${t.t}</div>
                    <div class="info-card-body">${t.d}</div>
                  </div>`).join('')}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  const filter = container.querySelector('#gl-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    container.querySelectorAll('.gl-group').forEach(group => {
      let any = false;
      group.querySelectorAll('.gl-item').forEach(item => {
        const match = !q || item.dataset.term.includes(q) || item.textContent.toLowerCase().includes(q);
        item.hidden = !match;
        if (match) any = true;
      });
      const header = group.previousElementSibling;
      if (header && header.classList.contains('section-header')) header.hidden = !any;
    });
  });
  return null;
}
