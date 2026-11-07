import { createModuleShell } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Meet the Solver',
    title: 'JIT · Build-Ahead · Build-Late',
    subtitle: 'For every demand, the solver tries three timing phases in a fixed order — preferring on-time supply, then early, then late — before it ever reports a shortage.',
    tabs: [
      { id: 'phases', label: '⏱️ The Three Phases', content: phasesTab() },
      { id: 'example', label: '🧮 Worked Example', content: exampleTab() },
      { id: 'limits', label: '🎚️ The Limits', content: limitsTab() },
    ],
  });
  return null;
}

function phasesTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Tried in order, per demand</div><div class="section-desc">The solver only moves to the next phase when the current one cannot meet the demand.</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid var(--green)"><div class="info-card-title">1 · JIT (Just-In-Time)</div><div class="info-card-body">Plan supply to arrive <strong>exactly on the due date</strong>. No early carrying cost, no lateness. Always preferred.</div></div>
        <div class="info-card" style="border-left:3px solid var(--blue)"><div class="info-card-title">2 · Build-Ahead</div><div class="info-card-body">When JIT is infeasible (capacity, lot size, lead time), build <strong>earlier than due</strong> and hold the stock — but only within the <strong>Build-Ahead Limit</strong>.</div></div>
        <div class="info-card" style="border-left:3px solid var(--accent)"><div class="info-card-title">3 · Build-Late</div><div class="info-card-body">When even early build can’t cover it, allow <strong>late</strong> supply within the <strong>Build-Late Limit</strong>, minimising lateness. Past the limit → <strong>shortage</strong> + RCA.</div></div>
      </div>
    </div>`;
}

function exampleTab() {
  const rows = [
    ['Due Day 10, lead time 4, capacity free', 'JIT', 'Start Day 6, arrive Day 10 — on time ✓'],
    ['Due Day 10, but Day 6–10 capacity full', 'Build-Ahead', 'Start earlier (Day 3), arrive Day 8, carry 2 days'],
    ['Due Day 10, lead time 9, current Day 4', 'Build-Late', 'Earliest arrival Day 13 → 3 days late (within BLL)'],
    ['Due Day 10, lead time 20', 'Shortage', 'Beyond Build-Late Limit → short; RCA = LeadTimePlanBeforeCurrent'],
  ];
  return `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Which phase fires, and why</div></div>
      <table class="compare-table">
        <thead><tr><th>Situation</th><th>Phase</th><th>Outcome</th></tr></thead>
        <tbody>${rows.map(([s, p, o]) => `<tr><td>${s}</td><td style="font-weight:600;color:var(--text)">${p}</td><td style="color:var(--text2)">${o}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose"><p>The phases are tried <strong>per demand</strong>, in order, during that demand’s backward traversal — not globally. A high-priority demand may get JIT while a lower one on the same item is pushed to Build-Late because the earlier demand already consumed the capacity.</p></div></div>`;
}

function limitsTab() {
  return `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Build-Ahead Limit & Build-Late Limit</div><div class="section-desc">Two configured windows that bound how far the solver may bend time.</div></div>
      <div class="info-grid">
        <div class="info-card"><div class="info-card-title">Build-Ahead Limit (BAL)</div><div class="info-card-body">The maximum number of periods the solver may build <strong>before</strong> a demand’s due date. Larger BAL = more pre-building and carried inventory; smaller BAL = more lateness/shortage.</div></div>
        <div class="info-card"><div class="info-card-title">Build-Late Limit (BLL)</div><div class="info-card-body">The maximum number of periods a demand may be met <strong>after</strong> its due date before it is declared short. Larger BLL = fewer shortages but more lateness.</div></div>
      </div>
      <div class="prose"><p>Tuning BAL/BLL is how planners trade <strong>on-time service</strong> against <strong>inventory</strong> and <strong>shortages</strong> — without touching the solver’s logic, only its limits.</p></div>
    </div>`;
}
