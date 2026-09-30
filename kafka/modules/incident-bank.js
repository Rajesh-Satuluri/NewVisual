// Incident Bank — the same production-incident library as the Troubleshooting
// Lab, laid out as a full playbook for fast revision: symptom → what to check,
// in order → root cause → resolution → prevention → spoken interview answer.
// Where the Lab makes you choose, the Bank shows the whole path. One shared
// data source (incidents.js), no duplication.
import { INCIDENTS } from '../data/incidents.js';

export function mount(container) {
  const state = { openId: INCIDENTS[0] ? INCIDENTS[0].id : null };

  const checklist = s => s.steps.map((st, i) => {
    const right = st.checks.find(c => c.correct);
    return `
      <li class="ib-step">
        <span class="ib-step-n">${i + 1}</span>
        <div class="ib-step-body">
          <div class="ib-step-q">${st.prompt}</div>
          <div class="ib-step-do"><b>Check:</b> ${right.label}</div>
          <div class="ib-step-ev">${right.evidence}</div>
        </div>
      </li>`;
  }).join('');

  function render() {
    container.innerHTML = `
      <div class="module-page">
        <div class="module-hero">
          <div class="module-tag">★ · Review · Amazon Edition</div>
          <h1 class="module-title">Incident Bank</h1>
          <p class="module-subtitle">A revision-ready playbook for the same incidents you drill in the Troubleshooting Lab — symptom, the checks to run in order, root cause, fix, prevention, and a 60–90s interview answer for each. Read top to bottom before an interview.</p>
        </div>
        <div class="ib-list">
          ${INCIDENTS.map(s => `
            <div class="ca-card ib-card" data-id="${s.id}">
              <button class="ca-card-head" aria-expanded="${s.id === state.openId}">
                <span class="ca-card-icon">${s.icon}</span>
                <span class="ca-card-title">${s.title}</span>
                <span class="diff-badge diff-${s.difficulty}">${s.difficulty}</span>
                <span class="q-chevron">▼</span>
              </button>
              <div class="ca-card-body" ${s.id === state.openId ? '' : 'hidden'}>
                <div class="inv-symptom"><div class="inv-symptom-head">🚨 Symptom</div><div class="inv-symptom-body">${s.symptom}</div></div>
                <div class="ib-section-label">Investigation — in order</div>
                <ol class="ib-steps">${checklist(s)}</ol>
                <div class="inv-block inv-root"><div class="inv-block-head">🎯 Root cause</div><div class="inv-block-body">${s.rootCause}</div></div>
                <div class="inv-block inv-res"><div class="inv-block-head">🔧 Resolution</div><div class="inv-block-body">${s.resolution}</div></div>
                <div class="inv-block inv-prev"><div class="inv-block-head">🛡️ Prevention</div><div class="inv-block-body">${s.prevention}</div></div>
                <div class="inv-block inv-say"><div class="inv-block-head">🎙️ Say it in an interview</div><div class="inv-block-body">${s.interviewAnswer}</div></div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;

    container.querySelectorAll('.ib-card .ca-card-head').forEach(head => {
      head.addEventListener('click', () => {
        const id = head.closest('.ib-card').dataset.id;
        state.openId = state.openId === id ? null : id;
        render();
      });
    });
  }

  render();
}
