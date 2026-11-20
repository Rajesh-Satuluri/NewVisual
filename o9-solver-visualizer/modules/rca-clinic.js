// rca-clinic.js — "RCA Clinic" diagnostic practice page.
// Each case presents a symptom (a demand short or late, with context) and asks
// the learner to name the Root-Cause / Problem Type. The problem-type set is
// taken verbatim from modules/rca.js (the course's RCA module) — no invented
// names. Attempts persist to the shared progress store.
import { record, counts, reset } from '../data/progress-store.js';

// Problem types exactly as used in modules/rca.js, plus "met on time / no RCA".
const TYPES = [
  { id: 'MaterialShort',             label: 'MaterialShort',            group: 'Material' },
  { id: 'LeadTimePlanBeforeCurrent', label: 'LeadTimePlanBeforeCurrent', group: 'Material' },
  { id: 'CapacityShort',             label: 'CapacityShort',            group: 'Capacity' },
  { id: 'RegularCapacityShort',      label: 'RegularCapacityShort',     group: 'Capacity' },
  { id: 'ARCConstraint',             label: 'ARCConstraint',            group: 'Capacity' },
  { id: 'StorageConstraint',         label: 'StorageConstraint',        group: 'Storage' },
  { id: 'NoRCA',                     label: 'Met on time · no RCA',     group: 'None' },
];

// Each case: symptom + context, the correct Problem Type, and the fix/explanation.
const CASES = [
  {
    id: 'rc-material',
    symptom: 'Current bucket W1. The most upstream raw-material node has OnHand 70, but demand D1 (90 units, FG @ DC, due W5) can only be partially satisfied — 70 met, 20 short. Every resource on the path had spare capacity.',
    answer: 'MaterialShort',
    fix: 'The binding constraint is the <strong>upstream material node</strong>, which ran out — a material shortage is reported "at the most upstream node" as <code>MaterialShort</code>. RCA Qty = 20. Because a material node carries stock over between buckets, the fix is to <strong>get more material</strong> (negotiate with the supplier / add a receipt).',
  },
  {
    id: 'rc-capacity',
    symptom: 'Demand D1 (100 units, due W20), BAL=1, BLL=1. The manufacturing resource runs at 25/week. It builds 25 on the JIT bucket (W19) and 25 one bucket ahead (W18) = 50; 25 arrive late at W20; 25 cannot be built at all because the resource is full in every usable bucket. Material was plentiful.',
    answer: 'CapacityShort',
    fix: 'The binding constraint is a <strong>resource that is full</strong>, not a material node — so it is a <code>CapacityShort</code>. "Only the regular capacity band is defined as available capacity." A resource expires each bucket, so the fix is to <strong>add capacity or outsource the process</strong>.',
  },
  {
    id: 'rc-regcap',
    symptom: 'A demand is still short after the solver has opened BOTH the regular and the overtime capacity bands on the binding resource. The remaining shortfall is expressed as the units of Regular Capacity needed at the JIT bucket to build the order on time.',
    answer: 'RegularCapacityShort',
    fix: 'When the demand is short "after utilizing regular and overtime capacity bands," the problem type is <code>RegularCapacityShort</code> — distinct from plain <code>CapacityShort</code> (which treats only the regular band as available). The quantity is reported in units of Regular Capacity at the JIT bucket.',
  },
  {
    id: 'rc-leadtime',
    symptom: 'Current bucket is W1. A demand is due W2, but the item\'s total lead time is 4 working days. Stepping backward from the due date puts the required order-start date before the current bucket. Material and capacity are both available — the problem is purely timing.',
    answer: 'LeadTimePlanBeforeCurrent',
    fix: 'The plan start date lands <strong>before the current bucket</strong>: there is not enough lead time left to make the due date. This is a Material-group problem type, <code>LeadTimePlanBeforeCurrent</code> — the fix is earlier ordering, a shorter lead time, or accepting lateness.',
  },
  {
    id: 'rc-storage',
    symptom: 'A lot-sized plan wants to build ahead and carry inventory into earlier buckets, but the storage/inventory capacity at the node is capped and already full. The build-ahead supply has nowhere to be held, so part of the demand cannot be positioned in time.',
    answer: 'StorageConstraint',
    fix: 'The binding constraint is <strong>storage</strong> (the third broad constraint group, alongside Material and Capacity), reported as <code>StorageConstraint</code>. It appears in the lotsized/inventory-constrained case where there is no room to carry build-ahead stock.',
  },
  {
    id: 'rc-arc',
    symptom: 'A demand is delayed specifically because Alternate Resource Consolidation forced work onto a consolidated resource, pushing it past JIT. Analysis shows that adding more capacity would NOT help — the delay is a consequence of the consolidation decision itself.',
    answer: 'ARCConstraint',
    fix: 'This is <code>ARCConstraint</code>, reported "just for visibility" when Alternate Resource Consolidation forces a delay. Unlike a true CapacityShort, adding capacity would not resolve it — so it is flagged to explain the lateness rather than to prompt a capacity fix.',
  },
  {
    id: 'rc-ontime',
    symptom: 'Current bucket W1. OnHand of the upstream material covers the whole demand (90 units, due W5). It is built Just-In-Time and delivered in full — nothing short, nothing late.',
    answer: 'NoRCA',
    fix: 'The demand is satisfied in the JIT bucket in full. <strong>RCA only writes a record for demands that are short or late</strong> — a fully-met-on-time demand produces <strong>no RCA record</strong> at all.',
  },
  {
    id: 'rc-late',
    symptom: 'A binding resource cannot fit the whole demand in the JIT bucket, so part is built within the Build-Late Limit and arrives one bucket after the due date. Nothing is permanently short; the Delivery Plan records a Total Late Quantity and a Commit Date for the late part.',
    answer: 'CapacityShort',
    fix: 'The late part is still caused by the <strong>full resource</strong>, so the Problem Type is <code>CapacityShort</code> — but the outcome is lateness, not a permanent short. The <strong>Commit Date</strong> measure reports the last late bucket as the suggested available date, and Weighted Late Quantity = Σ(late qty × buckets-from-current).',
  },
];

const KEY = 'rca-clinic';

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Practice</div>
        <h1 class="module-title">RCA Clinic</h1>
        <p class="module-subtitle">Eight short/late demands, each with its own story. Read the symptom, name the binding constraint — the Problem Type SCS would write — and check your diagnosis. All problem types are the real ones from the RCA module.</p>
      </div>
      <div class="scroll-content">
        <div class="info-grid" style="grid-template-columns:1fr;margin-bottom:6px">
          <div class="info-card" style="border-left:3px solid #EF4444;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div class="info-card-body" id="rc-score" style="margin:0;font-size:15px">Loading score…</div>
            <button class="ctrl-btn" id="rc-reset">↺ Reset progress</button>
          </div>
        </div>
        <div class="canvas-explainer" style="margin-bottom:14px"><h3 style="margin-top:0">The Problem Type palette</h3><p>Every case is one of these — the same set the solver writes. <strong>Material</strong> constraints carry over between buckets; <strong>Capacity</strong> constraints expire each bucket; <strong>Storage</strong> is the lotsized case; and a fully-met-on-time demand gets <em>no</em> record.</p>
          <div class="table-scroll"><table class="compare-table"><thead><tr><th>Problem Type</th><th>Group</th></tr></thead><tbody>
            ${TYPES.map((t) => `<tr><td style="font-weight:600;color:var(--text)"><code>${t.label}</code></td><td style="color:var(--text2)">${t.group}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div id="rc-list"></div>
      </div>
    </div>`;

  const listEl = container.querySelector('#rc-list');
  listEl.innerHTML = CASES.map((c, i) => caseHTML(c, i)).join('');

  // Restore prior answers.
  CASES.forEach((c) => {
    const prior = (function () { try { return JSON.parse(localStorage.getItem('o9scs-progress-v1') || '{}')[KEY]?.[c.id] || null; } catch { return null; } })();
    if (prior && typeof prior.picked === 'string') revealCase(container, c, prior.picked);
  });

  listEl.addEventListener('click', (e) => {
    const opt = e.target.closest('.rc-opt');
    if (!opt) return;
    const card = opt.closest('.rc-case');
    if (card.classList.contains('answered')) return;
    const id = card.dataset.id;
    const picked = opt.dataset.type;
    const kase = CASES.find((c) => c.id === id);
    const correct = picked === kase.answer;
    try { record(KEY, id, { picked, correct }); } catch (err) {}
    revealCase(container, kase, picked);
  });

  container.querySelector('#rc-reset')?.addEventListener('click', () => {
    try { reset(KEY); } catch (err) {}
    container.querySelectorAll('.rc-case').forEach((c) => {
      c.classList.remove('answered');
      c.querySelectorAll('.rc-opt').forEach((o) => o.classList.remove('correct', 'wrong', 'picked'));
      const ex = c.querySelector('.rc-explain'); if (ex) ex.hidden = true;
    });
    renderScore(container);
  });

  const refresh = () => renderScore(container);
  window.addEventListener('o9scs:progress', refresh);
  renderScore(container);

  return () => { window.removeEventListener('o9scs:progress', refresh); };
}

function caseHTML(c, i) {
  return `
    <div class="rc-case info-card" data-id="${c.id}" style="border-left:3px solid #38BDF8;margin-bottom:14px">
      <div class="info-card-title">Case ${i + 1} — what is the Problem Type?</div>
      <div class="info-card-body" style="margin-bottom:10px">${c.symptom}</div>
      <div class="rc-opts" style="display:flex;flex-wrap:wrap;gap:7px">
        ${TYPES.map((t) => `<button class="rc-opt ctrl-btn" data-type="${t.id}" style="white-space:normal"><code>${t.label}</code></button>`).join('')}
      </div>
      <div class="rc-explain canvas-explainer" hidden style="margin-top:12px"><h3 style="margin-top:0">Diagnosis</h3><p>${c.fix}</p></div>
    </div>`;
}

function revealCase(container, kase, picked) {
  const card = container.querySelector(`.rc-case[data-id="${kase.id}"]`);
  if (!card) return;
  card.classList.add('answered');
  card.querySelectorAll('.rc-opt').forEach((o) => {
    const t = o.dataset.type;
    if (t === kase.answer) o.classList.add('correct');
    if (t === picked && picked !== kase.answer) o.classList.add('wrong');
    if (t === picked) o.classList.add('picked');
  });
  const ex = card.querySelector('.rc-explain');
  if (ex) ex.hidden = false;
}

function renderScore(container) {
  const el = container.querySelector('#rc-score');
  if (!el) return;
  let c = { attempted: 0, correct: 0 };
  try { c = counts(KEY); } catch (err) {}
  const pct = c.attempted ? Math.round((c.correct / c.attempted) * 100) : 0;
  el.innerHTML = `<strong>Diagnoses:</strong> ${c.correct} / ${c.attempted} correct` +
    (c.attempted ? ` · <strong>${pct}%</strong>` : '') +
    ` &nbsp;·&nbsp; <span style="color:var(--text2)">${CASES.length} cases total</span>`;
}
