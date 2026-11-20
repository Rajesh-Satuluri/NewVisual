// sim-lab.js — "Scenario Lab" auxiliary page.
//
// A gallery of fixed teaching scenarios, each RUN THROUGH THE REAL, unit-tested
// engine helpers in sim/scs-engine.js (netRequirement, roundToLot,
// offsetByLeadTime, sortDemands). Nothing here is mocked: every number in the
// result panel is whatever the actual function returns for the shown inputs.
// (ScsSolver.solve() is a documented stub and is deliberately NOT used.)
import {
  netRequirement,
  roundToLot,
  offsetByLeadTime,
  sortDemands,
} from '../sim/scs-engine.js';

// A two-week Mon–Fri working calendar. Day numbers 1..12 with the weekend days
// (6,7 and 13,14) absent — exactly the "ascending array of working-day indices"
// offsetByLeadTime expects.
const WORK_CAL = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12];
const DAY_LABEL = {
  1: 'Mon W1', 2: 'Tue W1', 3: 'Wed W1', 4: 'Thu W1', 5: 'Fri W1',
  8: 'Mon W2', 9: 'Tue W2', 10: 'Wed W2', 11: 'Thu W2', 12: 'Fri W2',
};
const dl = d => DAY_LABEL[d] || `Day ${d}`;

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Walk the calendar backward for display (mirrors offsetByLeadTime's stepping).
function backwardWalk(dueDay, calendar, leadTime) {
  const dueIdx = calendar.indexOf(dueDay);
  const steps = [];
  for (let s = 0; s <= leadTime; s++) {
    const idx = dueIdx - s;
    steps.push(idx < 0 ? null : calendar[idx]);
  }
  return steps; // [due, 1-back, 2-back, ...]
}

// ── Scenarios: each computes its result live from the engine helpers ──────────
const SCENARIOS = [
  {
    id: 'enough-on-hand',
    name: 'Enough on hand',
    icon: '✅',
    blurb: 'Demand is already covered by stock — the solver creates nothing.',
    inputs: [
      ['Demand', '50 ea'],
      ['Beginning On-Hand (BOH)', '60 ea'],
      ['Safety Stock (SS)', '0 ea'],
    ],
    compute() {
      const net = netRequirement(50, 60, 0);
      return {
        rows: [
          ['netRequirement(50, 60, 0)', `max(0, 50 − 60 + 0)`, `<b>${net}</b> ea`],
        ],
        verdict: net === 0 ? 'No supply needed' : `${net} ea to create`,
        verdictOk: net === 0,
        takeaway: 'When on-hand already meets the demand, the net requirement floors at zero and no order is raised.',
      };
    },
  },
  {
    id: 'lot-multiple',
    name: 'Lot-multiple rounding',
    icon: '📦',
    blurb: 'A clean net quantity is rounded UP to the order multiple, creating excess.',
    inputs: [
      ['Demand', '45 ea'],
      ['BOH / SS', '0 / 0'],
      ['Minimum Order Qty', '20 ea'],
      ['Order Multiple', '25 ea'],
    ],
    compute() {
      const net = netRequirement(45, 0, 0);
      const lot = roundToLot(net, { min: 20, mult: 25 });
      return {
        rows: [
          ['netRequirement(45, 0, 0)', 'max(0, 45 − 0 + 0)', `<b>${net}</b> ea`],
          ['roundToLot(45, {min:20, mult:25})', 'raise to 20 → ceil to ×25', `<b>${lot}</b> ea`],
          ['Excess carried', `${lot} − ${net}`, `<b>${lot - net}</b> ea`],
        ],
        verdict: `Order ${lot} ea (${lot - net} excess)`,
        verdictOk: false,
        takeaway: '45 clears the minimum but is not a multiple of 25, so it rounds up to 50 — the extra 5 becomes planned excess.',
      };
    },
  },
  {
    id: 'lead-time-weekend',
    name: 'Lead time crosses a weekend',
    icon: '📅',
    blurb: 'Backward lead-time offset steps over non-working days.',
    inputs: [
      ['Due day', 'Mon W2 (day 8)'],
      ['Lead time', '2 working days'],
      ['Calendar', 'Mon–Fri working'],
    ],
    compute() {
      const due = 8, lead = 2;
      const start = offsetByLeadTime(due, WORK_CAL, lead);
      const walk = backwardWalk(due, WORK_CAL, lead);
      const walkStr = walk.map((d, i) =>
        `${i === 0 ? 'due ' : `−${i} `}${d == null ? 'off front' : dl(d)}`
      ).join('  →  ');
      return {
        rows: [
          ['Working calendar', 'weekend days 6 & 7 absent', WORK_CAL.join(', ')],
          ['Backward walk', 'step back over working days', esc(walkStr)],
          ['offsetByLeadTime(8, cal, 2)', 'start = 2 working days before due', `<b>${dl(start)}</b>`],
        ],
        verdict: `Start on ${dl(start)}`,
        verdictOk: true,
        takeaway: 'Mon W2 minus two working days lands on Thu W1 — the solver steps past Sat & Sun rather than counting them.',
      };
    },
  },
  {
    id: 'max-lot-cap',
    name: 'Max lot cap',
    icon: '⛔',
    blurb: 'A large requirement is capped at the maximum lot — the remainder needs another order.',
    inputs: [
      ['Demand', '500 ea'],
      ['BOH / SS', '0 / 0'],
      ['Maximum Order Qty', '300 ea'],
    ],
    compute() {
      const net = netRequirement(500, 0, 0);
      const lot = roundToLot(net, { max: 300 });
      return {
        rows: [
          ['netRequirement(500, 0, 0)', 'max(0, 500 − 0 + 0)', `<b>${net}</b> ea`],
          ['roundToLot(500, {max:300})', 'cap at the maximum lot', `<b>${lot}</b> ea`],
          ['Remainder still open', `${net} − ${lot}`, `<b>${net - lot}</b> ea`],
        ],
        verdict: `One lot capped at ${lot} ea; ${net - lot} ea remains`,
        verdictOk: false,
        takeaway: 'The maximum lot size bounds a single order at 300, so 200 is left for a further lot — large demands fan out into multiple supplies.',
      };
    },
  },
  {
    id: 'priority-scarce',
    name: 'Priority decides scarce supply',
    icon: '🥇',
    blurb: 'The demand sort fixes who is planned first — and so who gets limited stock.',
    inputs: [
      ['D-A', 'priority 2, qty 30'],
      ['D-B', 'priority 1, qty 50'],
      ['D-C', 'priority 1, qty 20'],
    ],
    compute() {
      const demands = [
        { key: 'D-A', priority: 2, qty: 30 },
        { key: 'D-B', priority: 1, qty: 50 },
        { key: 'D-C', priority: 1, qty: 20 },
      ];
      const order = sortDemands(demands);
      const orderStr = order.map((d, i) => `${i + 1}. ${d.key}`).join('   ');
      return {
        rows: [
          ['sortDemands([D-A, D-B, D-C])', 'priority → fair-share → due → qty → key', esc(orderStr)],
          ['D-B vs D-C', 'same priority 1 → lower qty first', '<b>D-C</b> before D-B'],
        ],
        verdict: `Planned order: ${order.map(d => d.key).join(' → ')}`,
        verdictOk: true,
        takeaway: 'Lower priority number is planned first; ties break on lower quantity — so D-C (pri 1, 20) leads, then D-B, then D-A last.',
      };
    },
  },
  {
    id: 'safety-stock',
    name: 'Safety stock raises the net',
    icon: '🛡️',
    blurb: 'Safety stock is added on top of demand before netting against on-hand.',
    inputs: [
      ['Demand', '40 ea'],
      ['BOH', '30 ea'],
      ['Safety Stock', '20 ea'],
    ],
    compute() {
      const net = netRequirement(40, 30, 20);
      return {
        rows: [
          ['netRequirement(40, 30, 20)', 'max(0, 40 − 30 + 20)', `<b>${net}</b> ea`],
        ],
        verdict: `${net} ea to create`,
        verdictOk: false,
        takeaway: 'Even with 30 on hand against 40 demand, the 20-unit safety-stock top-up pushes the net requirement to 30 — stock is rebuilt to the buffer.',
      };
    },
  },
];

function detailHTML(sc) {
  const r = sc.compute();
  return `
    <div class="section-header">
      <div class="section-title">${sc.icon} ${sc.name}</div>
      <div class="section-desc">${sc.blurb}</div>
    </div>

    <div class="info-grid" style="margin-bottom:6px">
      <div class="info-card" style="border-left:3px solid #6366F1">
        <div class="info-card-title">Inputs</div>
        <div class="info-card-body">
          <table class="compare-table" style="margin-top:4px">
            <tbody>
              ${sc.inputs.map(([k, v]) => `<tr><td style="font-weight:600;color:var(--text)">${k}</td><td>${v}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section-header" style="margin-top:14px"><div class="section-title">Run through the engine</div>
      <div class="section-desc">Each row is the real <code>sim/scs-engine.js</code> helper evaluated on the inputs above.</div></div>
    <div class="table-scroll">
      <table class="compare-table">
        <thead><tr><th>Function call</th><th>How it resolves</th><th>Result</th></tr></thead>
        <tbody>
          ${r.rows.map(([call, how, res]) => `<tr><td style="font-family:ui-monospace,monospace;font-size:12px;color:var(--text)">${call}</td><td>${how}</td><td style="white-space:nowrap">${res}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="canvas-explainer" style="margin-top:16px;border-left:3px solid ${r.verdictOk ? '#10B981' : '#F59E0B'}">
      <h3 style="color:${r.verdictOk ? '#10B981' : '#F59E0B'}">${r.verdict}</h3>
      <p>${r.takeaway}</p>
    </div>`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Playground</div>
        <h1 class="module-title">Scenario Lab</h1>
        <p class="module-subtitle">Fixed teaching situations, each run live through the real, unit-tested solver helpers. Pick a scenario and read the inputs, the actual function calls, and the outcome.</p>
      </div>
      <div class="scroll-content">
        <div class="info-grid" style="grid-template-columns:minmax(220px,300px) 1fr;align-items:start;gap:18px">
          <div id="sl-list" style="display:flex;flex-direction:column;gap:8px">
            ${SCENARIOS.map((s, i) => `
              <button class="ctrl-btn sl-pick" data-idx="${i}" style="justify-content:flex-start;text-align:left;width:100%${i === 0 ? ';outline:2px solid var(--accent)' : ''}">
                <span style="margin-right:8px">${s.icon}</span><span>${s.name}</span>
              </button>`).join('')}
          </div>
          <div id="sl-detail">${detailHTML(SCENARIOS[0])}</div>
        </div>
      </div>
    </div>`;

  const detail = container.querySelector('#sl-detail');
  const buttons = [...container.querySelectorAll('.sl-pick')];
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      detail.innerHTML = detailHTML(SCENARIOS[idx]);
      buttons.forEach(b => (b.style.outline = b === btn ? '2px solid var(--accent)' : 'none'));
      detail.scrollIntoView({ block: 'nearest' });
    });
  });
  return null;
}
