// Production Incident Simulator (EXTRAS · Production & Debugging).
// A multi-step on-call engine over the 20 named incidents in data/incidents.js.
// You work each incident the way you would a real page: read the briefing, walk
// the evidence down the lineage, commit to a hypothesis, choose a recovery, apply
// the (illustrative) fix, validate, and read the postmortem. Hypothesis and
// recovery choices are scored so you get honest feedback on your triage.
//
// Honesty: no code here is executed against a warehouse. The fix snippet is
// labelled "Illustrative fix — not executed". This is a decision/diagnosis
// simulator, not a runtime.
import { createModuleShell } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { INCIDENTS } from '../data/incidents.js';
import { getNavItem } from '../components/nav.js';

const SEV = {
  Critical: { c: 'var(--error)', k: 'crit' },
  High:     { c: '#F59E0B',      k: 'high' },
  Medium:   { c: '#EAB308',      k: 'med'  },
  Low:      { c: 'var(--success)', k: 'low' },
};
const sevMeta = s => SEV[s] || SEV.Medium;

const STEPS = [
  { key: 'brief',    label: 'Briefing' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'hypo',     label: 'Hypothesis' },
  { key: 'root',     label: 'Root cause' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'fix',      label: 'Fix' },
  { key: 'validate', label: 'Validate' },
  { key: 'report',   label: 'Postmortem' },
];

const SOLVED_KEY = 'dbt-incidents-solved';
function loadSolved() { try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]')); } catch { return new Set(); } }
function saveSolved(set) { try { localStorage.setItem(SOLVED_KEY, JSON.stringify([...set])); } catch {} }

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Production',
    title: 'Production Incident Simulator',
    subtitle: `${INCIDENTS.length} real dbt incidents, each worked on-call: briefing → evidence → hypothesis → root cause → recovery → fix → validate → postmortem. Your hypothesis and recovery calls are scored.`,
    tabs: [
      { id: 'sim', label: '🚨 Incident room' },
      { id: 'play', label: '📋 On-call playbook' },
    ],
  });

  if (!INCIDENTS.length) {
    container.querySelector('#tab-sim').innerHTML =
      `<div class="ref-empty">No incidents loaded yet.</div>`;
    buildPlaybook(container.querySelector('#tab-play'));
    return;
  }

  buildSim(container.querySelector('#tab-sim'));
  buildPlaybook(container.querySelector('#tab-play'));
}

function buildSim(tab) {
  const solved = loadSolved();
  renderPicker();

  function renderPicker() {
    tab.innerHTML = `
      <p class="lab-intro">Pick an incident and work it like a page at 2am. Each step asks you to
      <strong>commit to a call</strong> before revealing the answer — hypothesis and recovery choices are
      scored so you can see where your triage is sharp and where it is shaky.
      <span class="inc-sim-note">Nothing is executed against a warehouse; the fix snippet is an illustrative reference.</span></p>
      <div class="inc-grid" id="inc-grid">
        ${INCIDENTS.map((inc, i) => {
          const sm = sevMeta(inc.severity);
          const done = solved.has(inc.id);
          return `
            <button class="inc-card ${done ? 'inc-done' : ''}" data-i="${i}">
              <span class="inc-card-sev" style="background:${sm.c}">${inc.severity}</span>
              <span class="inc-card-icon">${inc.icon || '🚨'}</span>
              <span class="inc-card-title">${escapeHtml(inc.title)}</span>
              <span class="inc-card-paged">${escapeHtml(inc.paged || '')}</span>
              ${done ? '<span class="inc-card-check">✓ worked</span>' : ''}
            </button>`;
        }).join('')}
      </div>`;
    tab.querySelector('#inc-grid').addEventListener('click', e => {
      const card = e.target.closest('.inc-card');
      if (!card) return;
      runIncident(Number(card.dataset.i));
    });
  }

  function runIncident(i) {
    const inc = INCIDENTS[i];
    const sm = sevMeta(inc.severity);
    let step = 0;
    const score = { hypo: null, recovery: null }; // null | true | false

    tab.innerHTML = `
      <div class="inc-run" style="--sevC:${sm.c}">
        <div class="inc-run-head">
          <button class="btn btn-secondary inc-back" id="inc-exit">← All incidents</button>
          <span class="inc-run-sev" style="background:${sm.c}">${inc.severity}</span>
          <span class="inc-run-title">${inc.icon || '🚨'} ${escapeHtml(inc.title)}</span>
        </div>
        <div class="inc-steps" id="inc-steps"></div>
        <div class="stage-panel inc-panel" id="inc-panel" style="--panelColor:${sm.c}"></div>
        <div class="stage-nav" id="inc-nav"></div>
      </div>`;

    const stepsEl = tab.querySelector('#inc-steps');
    const panelEl = tab.querySelector('#inc-panel');
    const navEl = tab.querySelector('#inc-nav');
    tab.querySelector('#inc-exit').addEventListener('click', renderPicker);

    function renderSteps() {
      stepsEl.innerHTML = STEPS.map((s, idx) =>
        `<span class="inc-step ${idx === step ? 'current' : (idx < step ? 'done' : '')}">${idx + 1}. ${s.label}</span>`
      ).join('<span class="inc-step-sep">→</span>');
    }

    function setNav(buttons) {
      navEl.innerHTML = buttons;
    }

    function panel(head, bodyHtml) {
      panelEl.innerHTML = `
        <div class="stage-panel-head">
          <span class="stage-panel-k" style="color:${sm.c}">${head}</span>
        </div>
        <div class="stage-panel-body">${bodyHtml}</div>`;
      injectCodeEnhancements(panelEl);
    }

    function render() {
      renderSteps();
      const key = STEPS[step].key;
      if (key === 'brief') renderBrief();
      else if (key === 'evidence') renderEvidence();
      else if (key === 'hypo') renderHypo();
      else if (key === 'root') renderRoot();
      else if (key === 'recovery') renderRecovery();
      else if (key === 'fix') renderFix();
      else if (key === 'validate') renderValidate();
      else if (key === 'report') renderReport();
    }
    const go = n => { step = n; render(); };

    function renderBrief() {
      panel('📟 You are paged', `
        <p class="inc-paged-line">${escapeHtml(inc.paged || 'On-call paged')}</p>
        <p class="inc-symptom">${inc.symptom}</p>
        <p class="inc-prompt">Walk the evidence before you theorise — resist the urge to guess from the symptom alone.</p>`);
      setNav(`<button class="btn btn-primary" id="inc-next">Start investigating →</button>`);
      navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
    }

    function renderEvidence() {
      let shown = 1;
      const total = inc.trace.length;
      function paintEvidence() {
        panel('🔎 Evidence — walk down the lineage', `
          <ol class="inc-trace">
            ${inc.trace.slice(0, shown).map(t =>
              `<li class="inc-trace-row"><span class="inc-trace-node">${escapeHtml(t.node)}</span><span class="inc-trace-check">${t.check}</span></li>`
            ).join('')}
          </ol>
          <p class="inc-trace-progress">${shown} / ${total} clues examined</p>`);
        if (shown < total) {
          setNav(`<button class="btn btn-secondary" id="inc-more">Examine next clue ↓</button>
                  <button class="btn btn-primary" id="inc-next">I have a hypothesis →</button>`);
          navEl.querySelector('#inc-more').addEventListener('click', () => { shown++; paintEvidence(); });
        } else {
          setNav(`<button class="btn btn-primary" id="inc-next">I have a hypothesis →</button>`);
        }
        navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
      }
      paintEvidence();
    }

    function renderHypo() {
      panel('🧠 Commit to a hypothesis', `
        <p class="inc-prompt">Based on the evidence, what is actually going on?</p>
        <div class="inc-choices" id="inc-hypo">
          ${inc.hypotheses.map(h => `<button class="inc-choice" data-id="${h.id}">${escapeHtml(h.label)}</button>`).join('')}
        </div>
        <div class="inc-feedback" id="inc-hypo-fb" hidden></div>`);
      setNav('');
      const wrap = panelEl.querySelector('#inc-hypo');
      const fb = panelEl.querySelector('#inc-hypo-fb');
      wrap.addEventListener('click', e => {
        const btn = e.target.closest('.inc-choice');
        if (!btn || wrap.classList.contains('locked')) return;
        wrap.classList.add('locked');
        const picked = inc.hypotheses.find(h => h.id === btn.dataset.id);
        score.hypo = !!picked.correct;
        inc.hypotheses.forEach(h => {
          const el = wrap.querySelector(`[data-id="${h.id}"]`);
          if (h.correct) el.classList.add('correct');
          else if (h.id === picked.id) el.classList.add('wrong');
          el.disabled = true;
        });
        fb.hidden = false;
        fb.className = `inc-feedback ${picked.correct ? 'ok' : 'no'}`;
        fb.innerHTML = `
          <strong>${picked.correct ? '✓ Correct read.' : '✗ Not quite.'}</strong> ${picked.why}
          ${!picked.correct ? `<div class="inc-fb-correct"><strong>The correct read:</strong> ${inc.hypotheses.find(h => h.correct).why}</div>` : ''}`;
        setNav(`<button class="btn btn-primary" id="inc-next">See root cause →</button>`);
        navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
      });
    }

    function renderRoot() {
      panel('🎯 Root cause', `<p class="inc-root">${inc.root}</p>`);
      setNav(`<button class="btn btn-primary" id="inc-next">Plan recovery →</button>`);
      navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
    }

    function renderRecovery() {
      const rec = inc.recovery;
      panel('🛠️ Choose your recovery', `
        <p class="inc-prompt">${escapeHtml(rec.prompt)}</p>
        <div class="inc-choices" id="inc-rec">
          ${rec.options.map(o => `<button class="inc-choice" data-id="${o.id}">${escapeHtml(o.label)}</button>`).join('')}
        </div>
        <div class="inc-feedback" id="inc-rec-fb" hidden></div>`);
      setNav('');
      const wrap = panelEl.querySelector('#inc-rec');
      const fb = panelEl.querySelector('#inc-rec-fb');
      wrap.addEventListener('click', e => {
        const btn = e.target.closest('.inc-choice');
        if (!btn || wrap.classList.contains('locked')) return;
        wrap.classList.add('locked');
        const picked = rec.options.find(o => o.id === btn.dataset.id);
        score.recovery = !!picked.correct;
        rec.options.forEach(o => {
          const el = wrap.querySelector(`[data-id="${o.id}"]`);
          if (o.correct) el.classList.add('correct');
          else if (o.id === picked.id) el.classList.add('wrong');
          el.disabled = true;
        });
        fb.hidden = false;
        fb.className = `inc-feedback ${picked.correct ? 'ok' : 'no'}`;
        fb.innerHTML = `
          <strong>${picked.correct ? '✓ Safe call.' : '✗ Consequence:'}</strong> ${picked.outcome}
          ${!picked.correct ? `<div class="inc-fb-correct"><strong>Better first move:</strong> ${rec.options.find(o => o.correct).outcome}</div>` : ''}`;
        setNav(`<button class="btn btn-primary" id="inc-next">Apply the fix →</button>`);
        navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
      });
    }

    function renderFix() {
      panel('🧩 The fix', `
        ${inc.fixCode ? `<div class="inc-fix-label">Illustrative fix — not executed</div>
          <div class="code-block" data-lang="sql">${escapeHtml(inc.fixCode)}</div>` : '<p>Resolution is procedural — see the postmortem.</p>'}`);
      setNav(`<button class="btn btn-primary" id="inc-next">Validate the fix →</button>`);
      navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
    }

    function renderValidate() {
      panel('✅ Validate', `
        <p class="inc-prompt">Before you close the incident, confirm the fix actually worked:</p>
        <p class="inc-validate">${inc.validate}</p>`);
      setNav(`<button class="btn btn-primary" id="inc-next">Write the postmortem →</button>`);
      navEl.querySelector('#inc-next').addEventListener('click', () => go(step + 1));
    }

    function renderReport() {
      solved.add(inc.id); saveSolved(solved);
      const w = inc.writeup;
      const s1 = score.hypo === true ? 1 : 0;
      const s2 = score.recovery === true ? 1 : 0;
      const total = s1 + s2;
      const scoreC = total === 2 ? 'var(--success)' : total === 1 ? '#F59E0B' : 'var(--error)';
      const nav = inc.deeper && getNavItem(inc.deeper.id);
      panel('📝 Postmortem', `
        <div class="inc-score" style="--scoreC:${scoreC}">
          <span class="inc-score-big">${total}/2</span>
          <span class="inc-score-lbl">triage calls correct
            <span class="inc-score-sub">${score.hypo === true ? '✓' : '✗'} hypothesis · ${score.recovery === true ? '✓' : '✗'} recovery</span>
          </span>
        </div>
        <div class="inc-report">
          <div class="inc-report-row"><span class="inc-rk">Cause</span><div>${w.cause}</div></div>
          <div class="inc-report-row"><span class="inc-rk">Impact</span><div>${w.impact}</div></div>
          <div class="inc-report-row"><span class="inc-rk">Detection</span><div>${w.detection}</div></div>
          <div class="inc-report-row"><span class="inc-rk">Resolution</span><div>${w.resolution}</div></div>
          <div class="inc-report-row inc-rk-prevent"><span class="inc-rk">Prevention</span><div>${w.prevention}</div></div>
        </div>
        ${nav ? `<a class="inc-deeper" href="#${inc.deeper.id}">Go deeper: ${escapeHtml(inc.deeper.label)}</a>` : ''}`);
      setNav(`
        <button class="btn btn-secondary" id="inc-exit2">← All incidents</button>
        <button class="btn btn-primary" id="inc-retry">↺ Work it again</button>`);
      navEl.querySelector('#inc-exit2').addEventListener('click', renderPicker);
      navEl.querySelector('#inc-retry').addEventListener('click', () => { score.hypo = null; score.recovery = null; go(0); });
    }

    render();
  }
}

function buildPlaybook(tab) {
  if (!tab) return;
  tab.innerHTML = `
    <div class="detail-section">
      <h3>Classify first, then fix</h3>
      <p>The fastest on-call engineers bucket an incident before touching code. The bucket tells you <em>where</em> to look and <em>who</em> owns the fix.</p>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:var(--info)">
          <div class="info-card-title">Source failure</div>
          <div class="info-card-tag" style="color:var(--info);background:color-mix(in srgb, var(--info) 13%, transparent)">Upstream</div>
          <div class="info-card-body">Missing, stale, partial, or zero-row source. Surfaces at staging or via <code>dbt source freshness</code>. Owner: the loader / source team. Gate it before the build.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--success)">
          <div class="info-card-title">Data-quality failure</div>
          <div class="info-card-tag" style="color:var(--success);background:color-mix(in srgb, var(--success) 13%, transparent)">A test fails</div>
          <div class="info-card-body">Data built but is wrong — duplicate key, broken FK, bad enum. Caught by tests. Fix the data or the logic; never silence the test.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--purple)">
          <div class="info-card-title">Transformation failure</div>
          <div class="info-card-tag" style="color:var(--purple);background:color-mix(in srgb, var(--purple) 13%, transparent)">Your SQL</div>
          <div class="info-card-body">Logic/SQL error in your model — bad column, divide-by-zero, fan-out. Inspect the compiled SQL. Owner: you.</div>
        </div>
        <div class="info-card" style="border-left-color:var(--error)">
          <div class="info-card-title">Warehouse / config failure</div>
          <div class="info-card-tag" style="color:var(--error);background:color-mix(in srgb, var(--error) 13%, transparent)">Infra</div>
          <div class="info-card-body">Timeout, permission, wrong target/schema, cost blow-up. Usually a materialization, sizing, or environment problem. Fix architecture before upsizing compute.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The operating principle</h3>
      <p class="inc-principle">Fail fast, fail cheap, contain the blast radius.</p>
      <p>Freshness gates stop a run before it wastes compute on missing data. <code>dbt build</code> interleaves tests so a failure gates its downstream models. Contracts move schema breaks to compile-time. Skipping downstream nodes on an error is intentional containment, not an extra bug. Every prevention in these incidents is one of these ideas.</p>
    </div>
    <div class="detail-section">
      <h3>A repeatable on-call loop</h3>
      <ol class="inc-loop">
        <li><strong>Confirm it is real</strong> — rule out a BI cache or a stale refresh before you page anyone.</li>
        <li><strong>Walk the lineage</strong> — find the <em>first</em> node that is wrong; everything below it is a symptom.</li>
        <li><strong>Name the bucket</strong> — source, quality, transformation, or warehouse/config.</li>
        <li><strong>Recover safely</strong> — backfill and reprocess the affected subtree; prefer forward-fixes over destructive rebuilds.</li>
        <li><strong>Validate</strong> — reconcile counts or re-run the failing test/selector before closing.</li>
        <li><strong>Prevent</strong> — add the gate (freshness, test, contract, lookback) that would have caught it earlier.</li>
      </ol>
    </div>`;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
