// Mock Interview — a timed exam simulator that draws from the whole tool's
// content: multiple-choice questions (the quiz bank) and open interview
// questions (every module's IQ, via the aggregator). Auto-grades MCQs, lets you
// self-grade open answers, then scores you with a per-topic breakdown. Missed
// MCQs can be pushed straight into the Review Center's spaced repetition — fail
// it here, see it again in your flashcards. Selection/scoring is the pure,
// tested engine in data/mock-exam.js.
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { MODULES } from '../components/nav.js';
import { loadAllIQ } from '../data/iq-aggregate.js';
import { buildExam, scoreExam, verdict } from '../data/mock-exam.js';
import { record, get as getProgress } from '../data/progress-store.js';
import { schedule } from '../data/review.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GROUP_OF = Object.fromEntries(MODULES.map(m => [m.id, m.group]));
const GROUPS = [...new Set(MODULES.map(m => m.group))];

// Build the MCQ pool from the quiz bank, tagging each with its module's group.
function mcqPool() {
  const out = [];
  for (const [mid, qs] of Object.entries(QUIZ_BANK)) {
    const group = GROUP_OF[mid];
    if (!group) continue;
    qs.forEach((q, idx) => out.push({
      moduleId: mid, group, idx,
      q: q.q, options: q.options, answer: q.answer, explanation: q.explanation,
    }));
  }
  return out;
}

export function mount(container) {
  let timerId = null;
  const clearTimer = () => { if (timerId) { clearInterval(timerId); timerId = null; } };

  // Session state
  const S = {
    screen: 'setup',
    cfg: { groups: null, length: 10, perQ: 90 },
    items: [], responses: [], index: 0, revealed: false,
    seed: 1, started: 0, elapsed: 0, timeLeft: 0, seenMissSrs: false,
  };

  container.innerHTML = `<div class="module-page mi-root"></div>`;
  const root = container.querySelector('.mi-root');

  // ── SETUP ──────────────────────────────────────────────────────────────────
  function renderSetup() {
    clearTimer();
    root.innerHTML = `
      <div class="module-hero">
        <div class="module-tag">🎤 · Practice · Mock Interview</div>
        <h1 class="module-title">Mock Interview Simulator</h1>
        <p class="module-subtitle">A timed, interview-style exam built from every quiz and interview question in the tool. Multiple-choice is graded for you; open questions you answer out loud, then grade yourself against the model answer. You get a score, a per-topic breakdown, and the option to send everything you missed to spaced repetition.</p>
      </div>
      <div class="mi-setup">
        <div class="mi-field">
          <label class="mi-label" for="mi-focus">Focus</label>
          <select class="study-select" id="mi-focus">
            <option value="">All topics</option>
            ${GROUPS.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
          </select>
        </div>
        <div class="mi-field">
          <span class="mi-label">Length</span>
          <div class="mi-seg" id="mi-length">
            ${[5, 10, 20].map(n => `<button class="mi-seg-btn ${n === 10 ? 'active' : ''}" data-len="${n}">${n} Q</button>`).join('')}
          </div>
        </div>
        <div class="mi-field">
          <span class="mi-label">Timer per question</span>
          <div class="mi-seg" id="mi-timer">
            ${[['0', 'Off'], ['60', '60s'], ['90', '90s'], ['120', '120s']].map(([v, l]) => `<button class="mi-seg-btn ${v === '90' ? 'active' : ''}" data-sec="${v}">${l}</button>`).join('')}
          </div>
        </div>
        <button class="ctrl-btn mi-start" id="mi-start">▶ Start interview</button>
        <div class="mi-setup-note" id="mi-note"></div>
      </div>`;

    root.querySelector('#mi-focus').addEventListener('change', e => {
      S.cfg.groups = e.target.value ? [e.target.value] : null;
    });
    root.querySelector('#mi-length').addEventListener('click', e => {
      const b = e.target.closest('[data-len]'); if (!b) return;
      S.cfg.length = +b.dataset.len; segSelect(root.querySelector('#mi-length'), b);
    });
    root.querySelector('#mi-timer').addEventListener('click', e => {
      const b = e.target.closest('[data-sec]'); if (!b) return;
      S.cfg.perQ = +b.dataset.sec; segSelect(root.querySelector('#mi-timer'), b);
    });
    root.querySelector('#mi-start').addEventListener('click', start);
  }

  function segSelect(group, btn) {
    group.querySelectorAll('.mi-seg-btn').forEach(b => b.classList.toggle('active', b === btn));
  }

  // ── START: assemble pools, build the paper ─────────────────────────────────
  async function start() {
    S.seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    root.querySelector('#mi-note').innerHTML = '<span class="mi-loading">Preparing your questions…</span>';
    let openPool = [];
    try { openPool = await loadAllIQ(); } catch (e) { openPool = []; }
    buildPaper(openPool);
  }

  function buildPaper(openPool) {
    S.items = buildExam({
      mcqPool: mcqPool(), openPool,
      groups: S.cfg.groups, length: S.cfg.length, openRatio: 0.5, seed: S.seed,
    });
    if (!S.items.length) {
      root.querySelector('#mi-note').innerHTML = '<span class="mi-warn">No questions found for that focus. Try “All topics.”</span>';
      return;
    }
    S.responses = S.items.map(() => ({}));
    S.index = 0; S.revealed = false; S.started = Date.now(); S.seenMissSrs = false;
    renderQuestion();
  }

  // ── SESSION ────────────────────────────────────────────────────────────────
  function renderQuestion() {
    clearTimer();
    const it = S.items[S.index];
    const n = S.items.length;
    const pct = Math.round((S.index / n) * 100);
    root.innerHTML = `
      <div class="mi-session">
        <div class="mi-bar-row">
          <div class="mi-progress"><div class="mi-progress-fill" style="width:${pct}%"></div></div>
          <button class="mi-quit" id="mi-quit" title="End and score now">End</button>
        </div>
        <div class="mi-meta">
          <span>Question <strong>${S.index + 1}</strong> / ${n}</span>
          <span class="mi-chip mi-chip-${it.type}">${it.type === 'mcq' ? 'Multiple choice' : 'Open — answer aloud'}</span>
          <span class="mi-chip mi-chip-group">${esc(it.group || '')}</span>
          ${S.cfg.perQ ? `<span class="mi-timer" id="mi-timeleft"></span>` : ''}
        </div>
        ${S.cfg.perQ ? `<div class="mi-time-bar"><div class="mi-time-fill" id="mi-timefill"></div></div>` : ''}
        <div class="mi-q" id="mi-q"></div>
        <div class="mi-a" id="mi-a"></div>
        <div class="mi-actions" id="mi-actions"></div>
      </div>`;

    root.querySelector('#mi-quit').addEventListener('click', finish);
    if (it.type === 'mcq') renderMcq(it); else renderOpen(it);
    if (S.cfg.perQ) startTimer(it);
  }

  function startTimer(it) {
    S.timeLeft = S.cfg.perQ;
    const tl = root.querySelector('#mi-timeleft');
    const tf = root.querySelector('#mi-timefill');
    const paint = () => {
      if (tl) tl.textContent = `${S.timeLeft}s`;
      if (tf) {
        const p = Math.max(0, (S.timeLeft / S.cfg.perQ) * 100);
        tf.style.width = `${p}%`;
        tf.classList.toggle('mi-time-low', S.timeLeft <= Math.ceil(S.cfg.perQ * 0.25));
      }
      if (tl) tl.classList.toggle('mi-timer-low', S.timeLeft <= Math.ceil(S.cfg.perQ * 0.25));
    };
    paint();
    timerId = setInterval(() => {
      S.timeLeft -= 1;
      paint();
      if (S.timeLeft <= 0) { clearTimer(); onTimeout(it); }
    }, 1000);
  }

  function onTimeout(it) {
    if (it.type === 'mcq') { if (!S.revealed) revealMcq(it, null); }
    else { if (!S.revealed) revealOpen(it); }
  }

  // MCQ
  function renderMcq(it) {
    root.querySelector('#mi-q').innerHTML = esc(it.q);
    root.querySelector('#mi-actions').innerHTML = `
      <div class="mi-opts">${it.options.map((o, i) =>
        `<button class="mi-opt" data-i="${i}"><span class="mi-opt-k">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    root.querySelector('#mi-actions').addEventListener('click', e => {
      const b = e.target.closest('.mi-opt'); if (!b || S.revealed) return;
      revealMcq(it, +b.dataset.i);
    });
  }

  function revealMcq(it, selected) {
    S.revealed = true;
    S.responses[S.index] = { selected };
    const opts = root.querySelectorAll('.mi-opt');
    opts.forEach((b, i) => {
      b.classList.add('locked');
      if (i === it.answer) b.classList.add('correct');
      if (i === selected && selected !== it.answer) b.classList.add('wrong');
    });
    const right = selected === it.answer;
    root.querySelector('#mi-a').innerHTML = `
      <div class="mi-verdict ${right ? 'mi-right' : 'mi-wrong'}">${right ? '✓ Correct' : (selected == null ? '⏱ Time — no answer' : '✗ Not quite')}</div>
      <div class="mi-expl">${esc(it.explanation)}</div>`;
    nextButton();
  }

  // Open interview question
  function renderOpen(it) {
    root.querySelector('#mi-q').innerHTML = esc(it.q);
    root.querySelector('#mi-actions').innerHTML = `<button class="ctrl-btn" id="mi-reveal">Reveal model answer</button>`;
    root.querySelector('#mi-reveal').addEventListener('click', () => revealOpen(it));
  }

  function revealOpen(it) {
    S.revealed = true;
    // Model answer and tip are trusted HTML authored in the module IQ banks.
    root.querySelector('#mi-a').innerHTML = `
      <div class="mi-model">${it.a || ''}${it.tip ? `<div class="mi-tip">💡 <strong>Interview tip:</strong> ${it.tip}</div>` : ''}</div>
      <div class="mi-rate-label">How did your spoken answer compare?</div>`;
    root.querySelector('#mi-actions').innerHTML = `
      <div class="mi-rate">
        <button class="mi-rate-btn mi-rate-got" data-r="got">✓ Got it</button>
        <button class="mi-rate-btn mi-rate-partial" data-r="partial">◑ Partial</button>
        <button class="mi-rate-btn mi-rate-missed" data-r="missed">✗ Missed</button>
      </div>`;
    root.querySelector('#mi-actions').addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      S.responses[S.index] = { rating: b.dataset.r };
      root.querySelectorAll('.mi-rate-btn').forEach(x => x.classList.toggle('active', x === b));
      nextButton();
    });
  }

  function nextButton() {
    const last = S.index === S.items.length - 1;
    const bar = root.querySelector('#mi-actions');
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn mi-next';
    btn.textContent = last ? 'Finish & score →' : 'Next question →';
    btn.addEventListener('click', () => { last ? finish() : advance(); });
    bar.appendChild(btn);
  }

  function advance() { clearTimer(); S.index += 1; S.revealed = false; renderQuestion(); }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  function finish() {
    clearTimer();
    S.elapsed = Math.round((Date.now() - S.started) / 1000);
    const sc = scoreExam(S.items, S.responses);
    const v = verdict(sc.scorePct);
    const examId = `exam-${S.started}`;
    try {
      record('exam', examId, {
        scorePct: sc.scorePct, mcqCorrect: sc.mcqCorrect, mcqTotal: sc.mcqTotal,
        openByRating: sc.openByRating, total: sc.total, elapsed: S.elapsed,
        groups: S.cfg.groups || 'all',
      });
    } catch (e) {}

    const mm = String(Math.floor(S.elapsed / 60)).padStart(2, '0');
    const ss = String(S.elapsed % 60).padStart(2, '0');
    const groupRows = Object.entries(sc.byGroup)
      .sort((a, b) => (b[1].total) - (a[1].total))
      .map(([g, r]) => {
        const p = r.total ? Math.round((r.correct / r.total) * 100) : 0;
        const mid = (MODULES.find(m => m.group === g) || {}).id;
        const tone = p >= 80 ? 'great' : p >= 50 ? 'ok' : 'low';
        return `<a class="mi-grp" href="${mid ? `#${mid}` : '#home'}">
          <span class="mi-grp-name">${esc(g)}</span>
          <span class="mi-grp-bar"><span class="mi-grp-fill mi-tone-${tone}" style="width:${p}%"></span></span>
          <span class="mi-grp-num">${Math.round(r.correct * 10) / 10}/${r.total}</span>
        </a>`;
      }).join('');

    const missN = sc.missedSrsIds.length;
    root.innerHTML = `
      <div class="module-hero">
        <div class="module-tag">🎤 · Mock Interview · Result</div>
        <h1 class="module-title">Your interview score</h1>
      </div>
      <div class="mi-summary">
        <div class="mi-score mi-tone-${v.tone}">
          <div class="mi-score-pct">${sc.scorePct}<span>%</span></div>
          <div class="mi-score-verdict">${esc(v.label)}</div>
          <div class="mi-score-sub">${S.items.length} questions · ⏱ ${mm}:${ss}</div>
        </div>
        <div class="mi-stat-row">
          <div class="cdc-metric"><span>Multiple choice</span><strong>${sc.mcqCorrect}/${sc.mcqTotal}</strong></div>
          <div class="cdc-metric"><span>Open · got</span><strong>${sc.openByRating.got || 0}</strong></div>
          <div class="cdc-metric"><span>Open · partial</span><strong>${sc.openByRating.partial || 0}</strong></div>
          <div class="cdc-metric"><span>Open · missed</span><strong>${sc.openByRating.missed || 0}</strong></div>
        </div>
        <div class="mi-breakdown">
          <div class="mi-breakdown-head">By topic — tap to revisit</div>
          ${groupRows || '<div class="cdc-empty">No topic data.</div>'}
        </div>
        <div class="mi-finish-actions">
          ${missN ? `<button class="ctrl-btn mi-srs" id="mi-srs">↻ Send ${missN} missed MCQ${missN > 1 ? 's' : ''} to Review</button>` : ''}
          <button class="ctrl-btn" id="mi-retry-same">↺ Retry same paper</button>
          <button class="ctrl-btn" id="mi-retry-new">🎲 New paper</button>
          <button class="ctrl-btn mi-reset" id="mi-again">⚙ Change setup</button>
        </div>
        <div class="mi-srs-note" id="mi-srs-note"></div>
      </div>`;

    if (missN) {
      root.querySelector('#mi-srs').addEventListener('click', () => {
        let added = 0;
        sc.missedSrsIds.forEach(id => {
          try { record('srs', id, schedule(getProgress('srs', id), 'again')); added += 1; } catch (e) {}
        });
        root.querySelector('#mi-srs-note').innerHTML = `<span class="mi-ok">✓ Added ${added} card${added > 1 ? 's' : ''} to the Review Center — due now in spaced repetition.</span>`;
        root.querySelector('#mi-srs').disabled = true;
      });
    }
    root.querySelector('#mi-retry-same').addEventListener('click', () => {
      S.responses = S.items.map(() => ({})); S.index = 0; S.revealed = false; S.started = Date.now(); renderQuestion();
    });
    root.querySelector('#mi-retry-new').addEventListener('click', () => { start(); });
    root.querySelector('#mi-again').addEventListener('click', renderSetup);
  }

  renderSetup();
  return clearTimer; // router calls this on navigation away — no leaked interval
}
