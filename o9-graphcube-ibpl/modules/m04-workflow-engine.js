import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'Walk me through the demand-planning cycle end-to-end in the CAT tenant.',
    a: 'A statistical baseline arrives from the algorithm engine as FiscalWeek Forecast Quantity at Item-LC-FiscalWeek. BAF (Business Adjustment Factor) — controlled by USE_BAF and BAF Exclusion Flag — decides whether a customer-driven adjustment overrides the system forecast. Planners review exceptions (Weekly CoC Firm Zone Exception, 10-Day CoC Exception, Weekly Indicator flags) that surface Customer-Item-LC-Week combinations that changed beyond threshold. They then make a Commit-or-Cancel (CoC) decision via the Forecast Acceptance Status measure. The accepted Final Forecast Quantity rolls forward as the demand signal into the supply plan.',
    tip: 'Hit the five beats: baseline → BAF → exceptions → CoC decision → roll forward. Name real measures.' },
  { q: 'What is an exception queue and why is it central to planning by exception?',
    a: 'Planners can\'t review every Customer-Item-LC-Week cell. Exception measures flag only the cells that changed beyond a threshold (e.g. Monthly CoC Delta Upper/Lower Threshold breached, firm-zone change). The workflow engine surfaces those as a queue the planner works down — so attention goes only where the plan actually moved. This is "planning by exception": the system does the watching, the human does the deciding.',
    tip: 'Contrast it with reviewing everything: exceptions turn an impossible review into a short, prioritized list.' },
  { q: 'What is Commit-or-Cancel (CoC) and where does it live?',
    a: 'CoC is the formal accept/reject decision a planner makes on a proposed forecast change. It is captured in a status measure (e.g. Forecast Acceptance Status (CIL)) and gated by firm-zone rules — inside the firm zone, changes need explicit commitment. Committing writes the change into the accepted plan and lets it roll into supply; cancelling reverts to the prior value. The thresholds (Monthly CoC Delta Upper/Lower) decide what even reaches the queue.',
    tip: 'Say "CoC is the governance gate between a proposed change and the accepted plan."' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M04 · Platform',
    title: 'Workflow Engine',
    subtitle: 'Planning cycles, exception queues, and the Commit-or-Cancel gate — how humans and the engine share the plan.',
    tabs: [
      { id: 'cycle',     label: '🔁 Planning Cycle' },
      { id: 'exceptions', label: '🚦 Exceptions & CoC' },
      { id: 'iq',        label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  const CYCLE = [
    ['1','Statistical baseline','Algorithm engine writes FiscalWeek Forecast Quantity (Item-LC-FiscalWeek).','#F59E0B'],
    ['2','BAF adjustment','USE_BAF / BAF Exclusion Flag decide if a customer-driven adjustment overrides the baseline.','#A78BFA'],
    ['3','Exception review','CoC Firm Zone / 10-Day / Weekly Indicator flags surface cells that moved beyond threshold.','#22D3EE'],
    ['4','Commit-or-Cancel','Planner accepts/rejects via Forecast Acceptance Status (CIL).','#34D399'],
    ['5','Roll forward','Accepted Final Forecast Quantity becomes the demand signal into supply planning.','#F472B6'],
  ];
  container.querySelector('#tab-cycle').innerHTML = `
    <div class="section-pad">
      <p class="lead">The CAT demand cycle, step by step — each step reads and writes real tenant measures.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${CYCLE.map(([n,t,d,c])=>`
          <div class="card" style="border-left:4px solid ${c};display:flex;gap:14px;align-items:flex-start">
            <div style="font-size:20px;font-weight:800;color:${c};min-width:26px">${n}</div>
            <div><h4 style="color:${c}">${t}</h4><p>${d}</p></div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-exceptions').innerHTML = `
    <div class="section-pad">
      <p class="lead">Planning by exception: the engine watches every cell, the planner only touches the ones that moved.</p>
      <div class="card-grid">
        <div class="card"><h4>🚦 Threshold</h4><p><code>Monthly CoC Delta Upper/Lower Threshold</code> defines how big a change must be before it becomes an exception.</p></div>
        <div class="card"><h4>📋 Queue</h4><p>Breaching cells surface as flags — <code>Weekly CoC Firm Zone Exception</code>, <code>10-Day CoC Exception</code> — forming the planner's worklist.</p></div>
        <div class="card"><h4>✅ Gate</h4><p><code>Forecast Acceptance Status (CIL)</code> records the Commit-or-Cancel decision; firm-zone changes require explicit commit.</p></div>
        <div class="card"><h4>➡️ Roll</h4><p>Committed <code>Final Forecast Quantity Weekly Lag</code> flows to supply as demand; cancelled reverts to prior value.</p></div>
      </div>
      <div class="callout"><b>Firm zone:</b> the near-term window where changes are governed — you can't silently move a committed near-term number; CoC forces an explicit decision.</div>
    </div>`;

  return null;
}
