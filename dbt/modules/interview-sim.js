// Interview Simulator (EXTRAS).
// An interviewer-mode session: questions escalate in difficulty, you think, then
// reveal the model answer and self-assess. Honest limitation — free-text answers
// can't be auto-graded, so scoring is self-reported. Drives from the Master Bank.
import { createModuleShell } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { BANK, TIERS } from '../data/interview-bank.js';

const ORDER = ['beginner', 'intermediate', 'fouryear', 'senior'];
const FOCI = [
  { id: 'progression', label: '📈 Difficulty ramp', desc: 'Beginner → Senior, the classic escalating screen.', pick: () => rampSet() },
  { id: 'scenario',    label: '🧩 Scenario & design', desc: 'System-design and "walk me through" prompts.', pick: () => byTier(['scenario', 'architecture']) },
  { id: 'debugging',   label: '🐛 Debugging drill',   desc: 'On-call triage and root-cause questions.', pick: () => byTier(['debugging']) },
  { id: 'senior',      label: '🎯 Senior deep-dive',  desc: '4-year + senior internals, cost, governance.', pick: () => byTier(['fouryear', 'senior']) },
];

function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function byTier(tiers) { return shuffle(BANK.filter(b => tiers.includes(b.tier))).slice(0, 8); }
function rampSet() {
  const out = [];
  for (const t of ORDER) { const pool = shuffle(BANK.filter(b => b.tier === t)); out.push(...pool.slice(0, 2)); }
  return out;
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Interview',
    title: 'Interview Simulator',
    subtitle: 'Interviewer mode: questions escalate, you answer out loud, then reveal the model answer and self-assess.',
    tabs: [{ id: 'sim', label: '🎤 Simulator' }],
  });
  const tab = container.querySelector('#tab-sim');
  renderStart(tab);
}

function renderStart(tab) {
  tab.innerHTML = `
    <p class="lab-intro">Pick a track. You'll get a sequence of questions that escalate in difficulty — answer each out
    loud (as in a real interview), then reveal the model answer and rate yourself. Scoring is
    <strong>self-assessed</strong> (free-text answers can't be auto-graded).</p>
    <div class="home-cards" id="sim-foci">
      ${FOCI.map(f => `
        <button class="home-mod-card" data-focus="${f.id}">
          <span class="home-mod-body">
            <div class="home-mod-title">${f.label}</div>
            <div class="home-mod-desc">${f.desc}</div>
          </span>
        </button>`).join('')}
    </div>
  `;
  tab.querySelector('#sim-foci').addEventListener('click', e => {
    const b = e.target.closest('[data-focus]');
    if (!b) return;
    const focus = FOCI.find(f => f.id === b.dataset.focus);
    runSession(tab, focus.pick(), focus.label);
  });
}

function runSession(tab, questions, label) {
  if (!questions.length) { renderStart(tab); return; }
  let idx = 0;
  const ratings = []; // {tier, rating}

  const tierMeta = id => TIERS.find(t => t.id === id) || { label: id, color: 'var(--accent)' };

  function renderQ() {
    const b = questions[idx];
    const tm = tierMeta(b.tier);
    tab.innerHTML = `
      <div class="sim-head">
        <div class="sim-progress">Question ${idx + 1} / ${questions.length} · ${label}</div>
        <div class="sim-bar"><div class="sim-bar-fill" style="width:${(idx / questions.length) * 100}%"></div></div>
      </div>
      <div class="stage-panel" style="--panelColor:${tm.color}">
        <div class="stage-panel-head">
          <span class="stage-panel-k" style="color:${tm.color}">interviewer · ${tm.label}</span>
        </div>
        <div class="stage-panel-body">
          <div class="sim-q">${b.q}</div>
          <div class="sim-hint" id="sim-hint">Answer out loud, then reveal the model answer.</div>
          <div id="sim-reveal" hidden>
            <div class="ib-row"><span class="ib-k">Strong answer</span><div>${b.short}</div></div>
            <div class="ib-row"><span class="ib-k">Detailed</span><div>${b.detailed}</div></div>
            ${b.example ? `<div class="ib-row"><span class="ib-k">Example</span><div class="code-block" data-lang="sql">${escapeHtml(b.example)}</div></div>` : ''}
            <div class="ib-row"><span class="ib-k ib-k-senior">Senior answer</span><div>${b.senior}</div></div>
            <div class="ex-interview" style="margin-top:10px"><span class="ex-iq-badge">They’d ask next</span> ${b.followup}</div>
          </div>
        </div>
      </div>
      <div class="stage-nav" id="sim-nav">
        <button class="btn btn-primary" id="sim-show">Reveal model answer</button>
      </div>
    `;
    const reveal = tab.querySelector('#sim-reveal');
    const nav = tab.querySelector('#sim-nav');
    tab.querySelector('#sim-show').addEventListener('click', () => {
      reveal.hidden = false;
      tab.querySelector('#sim-hint').textContent = 'How did your answer compare? Rate yourself honestly:';
      injectCodeEnhancements(reveal);
      nav.innerHTML = `
        <button class="btn sim-rate" data-r="strong" style="border-color:var(--success);color:var(--success)">✓ Strong</button>
        <button class="btn sim-rate" data-r="partial" style="border-color:var(--warn);color:var(--warn)">~ Partial</button>
        <button class="btn sim-rate" data-r="shaky" style="border-color:var(--error);color:var(--error)">✗ Shaky</button>`;
      nav.addEventListener('click', ev => {
        const r = ev.target.closest('.sim-rate');
        if (!r) return;
        ratings.push({ tier: b.tier, rating: r.dataset.r });
        idx++;
        idx < questions.length ? renderQ() : renderSummary();
      });
    });
  }

  function renderSummary() {
    const tally = { strong: 0, partial: 0, shaky: 0 };
    ratings.forEach(r => tally[r.rating]++);
    const weakTiers = {};
    ratings.forEach(r => { if (r.rating !== 'strong') weakTiers[r.tier] = (weakTiers[r.tier] || 0) + 1; });
    const weak = Object.entries(weakTiers).sort((a, b) => b[1] - a[1]).map(([t]) => tierMeta(t).label);
    const score = Math.round(((tally.strong + tally.partial * 0.5) / ratings.length) * 100);
    tab.innerHTML = `
      <div class="sim-summary">
        <div class="sim-score-ring" style="--pct:${score}">
          <div class="sim-score-val">${score}%</div>
          <div class="sim-score-lbl">self-assessed</div>
        </div>
        <div class="sim-summary-body">
          <h3>Session complete — ${label}</h3>
          <div class="sim-tally">
            <span class="sim-chip" style="color:var(--success)">✓ ${tally.strong} strong</span>
            <span class="sim-chip" style="color:var(--warn)">~ ${tally.partial} partial</span>
            <span class="sim-chip" style="color:var(--error)">✗ ${tally.shaky} shaky</span>
          </div>
          <p>${weak.length ? `Focus your revision on: <strong>${weak.join(', ')}</strong>. Re-read those tiers in the Interview Master Bank, then run this track again.` : 'Strong across the board — try a harder track or the Senior deep-dive.'}</p>
          <p style="font-size:12px;color:var(--text-3)">Self-assessed scores track your confidence, not a graded result.</p>
        </div>
      </div>
      <div class="stage-nav">
        <button class="btn btn-primary" id="sim-again">↺ New session</button>
        <button class="btn btn-secondary" id="sim-bank" onclick="location.hash='interview-bank'">Open Master Bank</button>
      </div>
    `;
    tab.querySelector('#sim-again').addEventListener('click', () => renderStart(tab));
  }

  renderQ();
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
