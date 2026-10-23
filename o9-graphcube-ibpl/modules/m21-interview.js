import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { BANK, TOPICS } from '../lib/interview-bank.js';
import { record, exerciseState, renderCompetencyPanel } from '../components/competency.js';
import { REGISTRY } from '../lib/exercise-registry.js';

const FUNCTIONAL = [
  { q: 'Walk me through how demand planning works end-to-end in this tenant.',
    a: 'Three grains, coarse to fine. Customer-LC-Month holds aggregate signals (exceptions, CoC deltas) for CS analysts. Customer-Item-LC-Month (459 measures) holds the bulk forecast with Forecast Quantity Weekly Lag 0–52. Customer-Item-LC-FiscalWeek (300 measures) holds the operational weekly forecast. Cycle: statistical baseline → BAF adjustment → exception review → Commit-or-Cancel via Forecast Acceptance Status → accepted Final Forecast rolls into supply.',
    tip: 'Name the three grains and the five cycle beats. Real measure names signal hands-on experience.' },
  { q: 'A plant reports stockouts though the system shows sufficient inventory. How do you investigate?',
    a: 'Structured debug, three layers. Data: is on-hand real and at the right grain? Is in-transit being netted? Is the inventory measure the Available-for-Planning one or a gross figure? Business logic: is safety stock double-counted, or a priority-part allocation starving this item? Is the demand signal at the right customer-item-LC? Process: timing — did the plan run before or after the latest receipt/consumption? Work data → logic → process, not guesses.',
    tip: 'Always answer debug questions as a layered method (data → logic → process), not a single guess.' },
  { q: 'How would you set safety stock for a critical part with variable demand and long, variable lead time?',
    a: 'Both variabilities inflate the buffer. Use a service-level-driven safety stock that accounts for demand standard deviation AND lead-time standard deviation (not just average demand × lead time). For a critical/priority part, target a high service level and review it frequently. Store it as Safety Stock Final (Volume) - Item LC and let supply plan to cover it. Flag it as a Priority Part so it wins allocation under shortage.',
    tip: 'Emphasize lead-time variability, not just demand variability — that\'s what separates a senior answer.' },
];
const PLATFORM = [
  { q: 'What is a Commit-or-Cancel (CoC) exception and how would you configure the thresholds?',
    a: 'CoC is the governance gate between a proposed forecast change and the accepted plan. An exception is raised when a cell\'s change breaches a threshold — configured via Monthly CoC Delta Upper/Lower Threshold (and firm-zone rules for near-term weeks). Breaching cells surface as Weekly CoC Firm Zone / 10-Day exceptions; the planner commits or cancels via Forecast Acceptance Status. Set thresholds tight enough to catch real moves, loose enough that the queue stays workable.',
    tip: 'Define CoC as the gate, name the threshold measures, and mention tuning the queue size.' },
  { q: 'How would you model a new LC-to-LC replenishment lane?',
    a: 'A lane is a sourcing relationship on the Location/LogisticsCenter graph: a From-LC supplying a To-LC, with properties (lead time, cost, validity dates, min/max). Create the sourcing/transport edge (RelationshipType), set its lead time and valid date range, and add any capacity. Then the DRP solver can net demand at the To-LC back to the From-LC along that lane. Validate it doesn\'t create an unintended cycle unless cycles are valid for transport.',
    tip: 'Frame a lane as a typed edge with lead-time/validity properties — ties back to the graph model.' },
];
const TECHNICAL = [
  { q: 'Write an IBPL query to find the top 10 parts at highest stockout risk in the next 4 fiscal weeks.',
    a: '"At risk" = days-of-supply < total lead time (can\'t replenish in time). Compute days-of-supply = Available-for-Planning ÷ (avg weekly demand ÷ 7) with safedivide, as a transient column, post-filter below lead time, orderby asc, limit 10. See module 19 → Worked IBPL for the full query. Key moves: safedivide (not /), coalesce/isnull for null-safety, Version mandatory, post-filter on the transient.',
    tip: 'Say the definition first (days-of-supply < lead time), then the IBPL constructs. Mention safedivide and the Version filter.' },
  { q: 'A batch job set Safety Stock to null for 500 items. How do you recover?',
    a: 'Don\'t panic-edit the CWV. If a snapshot exists from before the run, copy Safety Stock back from that version (cross-version scope / copymeasure) for the affected items. If not, re-derive it from inputs (demand/lead-time variability) with the correct scope, or re-load the fact file. Then add the safeguard the incident exposed: run destructive scopes against a scenario version first, and validate counts before promoting. The version isolation is what makes point-in-time recovery possible.',
    tip: 'Recovery via snapshot/version copy, then the preventive lesson: test scopes in a scenario, validate before promote.' },
  { q: 'What scope type computes a rolling 4-week demand average, and write it?',
    a: 'A regular scope with @ + LeadOffset to reach the prior weeks: Measure.[Demand4wkAvg] = (Measure.[Demand] + Measure.[Demand]@(Time.#.LeadOffset(-1)) + Measure.[Demand]@(Time.#.LeadOffset(-2)) + Measure.[Demand]@(Time.#.LeadOffset(-3))) / 4; wrapped in scope: (Version * Item * LC * Week) … end scope;. Coalesce each term so an early-period null doesn\'t void the average. It\'s regular (not recurrence) because each week reads fixed offsets, not the previous computed result.',
    tip: 'Rolling average = regular scope + @LeadOffset, not recurrence. Coalesce the terms.' },
];
const DELIVERY = [
  { q: 'A planner made UI changes that "haven\'t saved." What do you check?',
    a: 'Use FILTER_BY_UPDATES to see rows changed-but-not-saved — confirm the edits are pending, not lost. Then: is the measure editable (not calculative)? Does the planner have write access (data role + grant write, and was resetaccesscontrol run)? Is the cell at an aggregate level without a spreading rule (blocks the edit)? Is the version the CWV or a read-only snapshot? Walk permissions → editability → spreading → version.',
    tip: 'FILTER_BY_UPDATES first, then the four blockers: editable, write access, spreading rule, version.' },
  { q: 'How do you ensure ERP-fed data is correct before it affects the live plan?',
    a: 'Stage-validate-promote. Load to a staging/scenario version, run validation IBPL (row counts vs source, null checks, every fact key resolves to a real member — no orphans, range/outlier checks, compare vs prior load), and only then copy into CWV. Guard against grain mismatch and orphan members. Version isolation means a bad load never touches the live plan.',
    tip: 'Never load straight to CWV. Stage → validate (counts/nulls/orphans/ranges) → promote.' },
];
const DISRUPTION = [
  { q: 'Your biggest supplier announces administration; you have 3 weeks of stock. What do you do in o9?',
    a: 'Model it, don\'t firefight blind. Build a what-if scenario (negative-key version): zero/curtail that supplier\'s capacity and extend lead times for its parts. Re-solve supply to expose the shortages and which demands/priority parts are hit. Then evaluate levers in the scenario — alternate suppliers/lanes, expedite, reallocate to priority parts, pull safety stock — compare service impact, and only merge the chosen response into CWV. The isolation lets you test drastic moves safely.',
    tip: 'Scenario → curtail supplier → re-solve → compare levers → merge. Shows you use versions for risk, not spreadsheets.' },
  { q: 'Inventory turns dropped at one LC across all items. Where do you look?',
    a: 'Across-all-items at one LC points to something LC-wide, not item-specific. Check: a demand signal drop at that LC (forecast fell but supply kept coming), a safety-stock parameter change inflating targets, a receipt/goods-in posting issue overstating on-hand, or a sourcing change routing excess stock there. Compare the LC against peers and against last period; it\'s usually a single LC-level driver, not many coincidences.',
    tip: '"All items, one LC" = look for an LC-level cause (demand, safety-stock param, receipts, sourcing) — not per-item.' },
];
const ROUNDS = [
  ['round1','① Functional', FUNCTIONAL],
  ['round2','② Platform', PLATFORM],
  ['round3','③ IBPL', TECHNICAL],
  ['round4','④ Delivery', DELIVERY],
  ['round5','⑤ Disruption', DISRUPTION],
];

const DIFF = { 1:'🟢 Foundational', 2:'🟡 Intermediate', 3:'🔴 Advanced' };

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M21 · Practice',
    title: 'Interview Master',
    subtitle: `A reviewed bank of ${BANK.length} scenario questions with model answers, common mistakes, follow-ups and rubrics — plus five mock rounds and weak-area detection.`,
    tabs: [
      { id: 'bank',  label: `📚 Question Bank (${BANK.length})` },
      { id: 'weak',  label: '📊 My Weak Areas' },
      ...ROUNDS.map(([id,label,qs]) => ({ id, label, content: createIQSection(qs) })),
    ],
  });

  const weakEl = container.querySelector('#tab-weak');
  const cleanupBank = renderBank(container.querySelector('#tab-bank'));
  renderWeak(weakEl);
  // Re-render the weak panel whenever its tab is opened so self-grades show live.
  const weakBtn = container.querySelector('.tab-btn[data-tab="weak"]');
  const onWeak = () => renderWeak(weakEl);
  weakBtn?.addEventListener('click', onWeak);
  return () => { cleanupBank && cleanupBank(); weakBtn?.removeEventListener('click', onWeak); };
}

function esc(s) { return String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }

function renderBank(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Filter by topic or difficulty, or search. Open a question, think, then reveal the model answer and self-grade — your honest grade feeds the Interview bar and weak-area detection.</p>
      <div class="qb-controls">
        <input id="qb-search" class="nav-filter" style="flex:1;min-width:160px" type="text" placeholder="Search questions…" aria-label="Search questions">
        <select id="qb-topic" class="qb-select"><option value="">All topics</option>${TOPICS.map(t=>`<option>${t}</option>`).join('')}</select>
        <select id="qb-diff" class="qb-select"><option value="">All levels</option><option value="1">🟢 Foundational</option><option value="2">🟡 Intermediate</option><option value="3">🔴 Advanced</option></select>
      </div>
      <div id="qb-count" class="qb-count"></div>
      <div id="qb-list" class="qb-list">
        ${BANK.map(renderCard).join('')}
      </div>
      <div id="qb-empty" class="sim-empty" hidden>No questions match the filters.</div>
    </div>`;

  const list = el.querySelector('#qb-list');
  const search = el.querySelector('#qb-search');
  const topic = el.querySelector('#qb-topic');
  const diff = el.querySelector('#qb-diff');
  const count = el.querySelector('#qb-count');
  const empty = el.querySelector('#qb-empty');

  const refreshChecks = () => BANK.forEach(q => {
    const st = exerciseState(q.id);
    const c = list.querySelector(`.qb-card[data-id="${q.id}"] .qb-check`);
    if (c) c.textContent = st ? (st.best ? '✓' : '•') : '';
  });

  const applyFilters = () => {
    const s = search.value.trim().toLowerCase();
    const t = topic.value, d = diff.value;
    let n = 0;
    list.querySelectorAll('.qb-card').forEach(card => {
      const matchT = !t || card.dataset.topic === t;
      const matchD = !d || card.dataset.d === d;
      const matchS = !s || card.dataset.text.includes(s);
      const show = matchT && matchD && matchS;
      card.hidden = !show; if (show) n++;
    });
    count.textContent = `${n} of ${BANK.length} question${n===1?'':'s'}`;
    empty.hidden = n > 0;
  };

  const onClick = (e) => {
    const grade = e.target.closest('.qb-grade');
    if (grade) {
      const card = grade.closest('.qb-card'); const id = card.dataset.id; const ok = grade.dataset.ok === '1';
      record(id, 'interview', ok);
      card.querySelector('.qb-check').textContent = ok ? '✓' : '•';
      card.querySelector('.qb-gradeline').innerHTML = ok ? '✅ Marked as known.' : '📌 Flagged for review — revisit the linked topic.';
      return;
    }
    const q = e.target.closest('.qb-q');
    if (q) { const a = q.nextElementSibling; a.hidden = !a.hidden; q.classList.toggle('open', !a.hidden); }
  };

  list.addEventListener('click', onClick);
  const onFilter = () => applyFilters();
  search.addEventListener('input', onFilter); topic.addEventListener('change', onFilter); diff.addEventListener('change', onFilter);
  applyFilters(); refreshChecks();

  return () => { list.removeEventListener('click', onClick); search.removeEventListener('input', onFilter); topic.removeEventListener('change', onFilter); diff.removeEventListener('change', onFilter); };
}

function renderCard(q) {
  const text = `${q.q} ${q.a} ${q.topic}`.toLowerCase();
  return `
    <div class="qb-card" data-id="${q.id}" data-topic="${esc(q.topic)}" data-d="${q.d}" data-text="${esc(text).replace(/"/g,'&quot;')}">
      <button class="qb-q">
        <span class="qb-meta"><span class="qb-topic">${esc(q.topic)}</span><span class="qb-diff d${q.d}">${DIFF[q.d]}</span></span>
        <span class="qb-text">${esc(q.q)}</span>
        <span class="qb-check"></span><span class="qb-chevron">▾</span>
      </button>
      <div class="qb-a" hidden>
        <div class="qb-answer"><b>Model answer.</b> ${esc(q.a)}</div>
        ${q.m ? `<div class="qb-mistake"><b>⚠ Common mistake:</b> ${esc(q.m)}</div>` : ''}
        ${q.f ? `<div class="qb-follow"><b>↪ Follow-up:</b> ${esc(q.f)}</div>` : ''}
        ${q.r ? `<div class="qb-rubric"><b>✓ Rubric:</b> ${esc(q.r)}</div>` : ''}
        <div class="qb-gradebar">Self-grade: <button class="qb-grade btn-mini" data-ok="1">I had it</button> <button class="qb-grade btn-mini ghost" data-ok="0">Need review</button> <span class="qb-gradeline"></span></div>
      </div>
    </div>`;
}

function renderWeak(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Your demonstrated competency across the six areas — driven by solved exercises and self-graded interview questions, not pages opened. The lowest bars are where to revise next.</p>
      ${renderCompetencyPanel(REGISTRY)}
      <div class="callout" style="margin-top:14px"><b>How to use this:</b> grade yourself honestly in the Question Bank and solve the module exercises. The <b>Interview</b> bar reflects this bank (${BANK.length} questions); the other bars reflect the module labs and exercises. Weakest two areas are highlighted as "Focus next" on the Home page too.</div>
    </div>`;
  return null;
}
