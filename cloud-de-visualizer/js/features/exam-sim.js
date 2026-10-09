/* ============================================================
   Cloud DE Visualizer — Exam Simulation mode (Phase 1 / C1.3–C1.5)

   A full, timed, exam-like simulation — distinct from the quick
   "learn" practice in cert-exam.js (which grades each answer inline and
   is left untouched). Here the experience mirrors the real exam:

     • Domain-weighted, randomized question selection using the OFFICIAL
       exam weightings (largest-remainder apportionment), capped by the
       bank that actually exists — never faked.
     • A countdown TIMER scaled from the cert's official duration;
       auto-submits at 0 (C1.3).
     • Free NAVIGATION — Prev/Next, a question navigator grid, and a
       per-question REVIEW FLAG; answers are changeable until submit,
       and all of it persists within the attempt (C1.4).
     • NO explanations until submit. On submit: overall %, a per-domain
       breakdown against official weights, weak-area remediation links,
       and a full review of every question with the key + explanation
       + official reference (C1.5).

   Built on TV.QuestionEngine (shared modal shell + focus mgmt) so the
   dialog plumbing is not re-implemented. Records each graded answer into
   TV.Progress.recordCertAnswer so cert readiness updates on submit.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;
  const QE = TV.QuestionEngine;
  const esc = QE.esc;

  function weightNum(w) { return TV.CertEngine ? TV.CertEngine.weightNum(w) : (parseInt(String(w).match(/\d+/) || [0], 10) || 0); }

  /* Largest-remainder apportionment of `total` questions across domains
     by official weight, then fill from each domain's available bank. */
  function selectQuestions(cert, bank, total) {
    const byDomain = {};
    bank.forEach(q => { (byDomain[q.domainId] = byDomain[q.domainId] || []).push(q); });
    const domains = (cert.domains || []).filter(d => (byDomain[d.id] || []).length);
    const wsum = domains.reduce((a, d) => a + weightNum(d.weight), 0) || 1;

    // ideal (fractional) share per domain, capped by availability
    const quota = domains.map(d => {
      const avail = byDomain[d.id].length;
      const ideal = total * weightNum(d.weight) / wsum;
      return { d, avail, ideal, base: Math.min(avail, Math.floor(ideal)), frac: ideal - Math.floor(ideal) };
    });
    let used = quota.reduce((a, q) => a + q.base, 0);
    // distribute remainder by largest fractional part, respecting availability
    quota.sort((a, b) => b.frac - a.frac);
    let gi = 0;
    while (used < total && quota.some(q => q.base < q.avail)) {
      const q = quota[gi % quota.length];
      if (q.base < q.avail) { q.base++; used++; }
      gi++;
      if (gi > total * 4) break; // safety
    }
    // gather, shuffle within domain, then shuffle the whole set
    let out = [];
    quota.forEach(q => { out = out.concat(QE.shuffle(byDomain[q.d.id]).slice(0, q.base)); });
    return QE.shuffle(out);
  }

  function fmtTime(ms) {
    if (ms < 0) ms = 0;
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }
  function domName(cert, id) { const d = (cert.domains || []).find(x => x.id === id); return d ? d.name : id; }
  function lvlClass(p) { return p < 45 ? 'xs-lo' : p < 70 ? 'xs-mid' : 'xs-hi'; }

  function injectStyles() {
    if (document.getElementById('xs-styles')) return;
    const s = document.createElement('style'); s.id = 'xs-styles';
    s.textContent = `
.xs-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.62); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .2s; }
.xs-backdrop.visible { opacity:1; pointer-events:all; }
.xs-box { background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:var(--radius-lg,16px); width:720px; max-width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow-xl,0 16px 48px rgba(0,0,0,.7)); }
.xs-head { padding:14px 20px; border-bottom:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
.xs-head h2 { font-size:15px; font-weight:800; margin:0; color:var(--text-primary,#e6edf7); }
.xs-head .xs-sub { font-size:12px; color:var(--text-muted,#7e8da8); margin-top:2px; }
.xs-timer { font-size:15px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text-primary,#e6edf7); background:var(--bg-4,#223047); padding:5px 12px; border-radius:8px; }
.xs-timer.warn { color:#fff; background:var(--red,#f85149); }
.xs-close { background:none; border:none; color:var(--text-muted,#7e8da8); cursor:pointer; font-size:20px; padding:4px 8px; border-radius:6px; }
.xs-close:hover { background:var(--bg-3,#1a2334); color:var(--text-primary,#e6edf7); }
.xs-body { padding:16px 20px; overflow-y:auto; }
.xs-prog { height:4px; background:var(--bg-4,#223047); border-radius:2px; overflow:hidden; margin-bottom:14px; }
.xs-prog-fill { height:100%; background:var(--brand,#58a6ff); transition:width .25s; }
.xs-meta { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
.xs-tags { display:flex; flex-wrap:wrap; gap:6px; }
.xs-tag { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:2px 8px; border-radius:20px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); }
.xs-flag { font-size:12px; font-weight:700; border:1px solid var(--border-default,#223047); background:none; color:var(--text-secondary,#b3c0d6); border-radius:7px; padding:4px 11px; cursor:pointer; }
.xs-flag.on { background:#9e7410; border-color:#9e7410; color:#fff; }
.xs-q { font-size:15px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.55; margin-bottom:14px; }
.xs-opts { display:grid; gap:9px; }
.xs-opt { display:flex; align-items:flex-start; gap:11px; text-align:left; padding:12px 14px; background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-radius:10px; cursor:pointer; font:inherit; color:var(--text-secondary,#b3c0d6); font-size:14px; line-height:1.5; width:100%; transition:border-color .12s, background .12s; }
.xs-opt:hover { border-color:var(--brand,#58a6ff); }
.xs-opt.picked { border-color:var(--brand,#58a6ff); background:color-mix(in srgb,var(--brand,#58a6ff) 14%,transparent); color:var(--text-primary,#e6edf7); }
.xs-opt .xs-letter { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.xs-opt.picked .xs-letter { background:var(--brand,#58a6ff); color:#fff; }
.xs-foot { padding:12px 20px; border-top:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-shrink:0; flex-wrap:wrap; }
.xs-navbtns { display:flex; gap:8px; }
.xs-btn { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:9px 16px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.xs-btn:disabled { opacity:.4; cursor:default; }
.xs-btn--ghost { background:none; border:1px solid var(--border-default,#223047); color:var(--text-secondary,#b3c0d6); }
.xs-btn--go { background:var(--green-dim,#238636); }
/* navigator */
.xs-nav { display:grid; grid-template-columns:repeat(auto-fill,minmax(34px,1fr)); gap:6px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-default,#223047); }
.xs-nav-cell { font-size:12px; font-weight:800; border:1px solid var(--border-default,#223047); background:var(--bg-1,#0e1420); color:var(--text-muted,#7e8da8); border-radius:6px; padding:6px 0; cursor:pointer; position:relative; }
.xs-nav-cell.answered { background:var(--bg-4,#223047); color:var(--text-primary,#e6edf7); }
.xs-nav-cell.current { border-color:var(--brand,#58a6ff); color:var(--brand,#58a6ff); }
.xs-nav-cell.flagged::after { content:'⚑'; position:absolute; top:-3px; right:1px; font-size:9px; color:#d29922; }
/* result */
.xs-result { text-align:center; padding:8px 0; }
.xs-result-score { font-size:46px; font-weight:800; color:var(--brand,#58a6ff); line-height:1; }
.xs-result-msg { font-size:14px; color:var(--text-secondary,#b3c0d6); margin-top:8px; }
.xs-reslabel { margin-top:18px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#7e8da8); margin-bottom:8px; }
.xs-dom { display:flex; align-items:center; gap:10px; margin:7px 0; }
.xs-dom-name { flex:1; font-size:13px; color:var(--text-secondary,#b3c0d6); text-align:left; }
.xs-dom-bar { width:120px; height:7px; background:var(--bg-4,#223047); border-radius:4px; overflow:hidden; }
.xs-dom-fill { height:100%; border-radius:4px; }
.xs-lo{background:var(--red,#f85149);} .xs-mid{background:#d29922;} .xs-hi{background:var(--green,#3fb950);}
.xs-dom-pct { font-size:12px; font-weight:700; color:var(--text-muted,#7e8da8); width:62px; text-align:right; }
.xs-remed { background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-left:3px solid #d29922; border-radius:8px; padding:11px 13px; margin-top:8px; font-size:13px; color:var(--text-secondary,#b3c0d6); line-height:1.7; }
.xs-remed a { color:var(--brand,#58a6ff); text-decoration:none; }
.xs-rev { border-left:3px solid var(--border-muted,#33455f); padding:8px 0 8px 12px; margin-top:10px; }
.xs-rev.ok { border-left-color:var(--green,#3fb950); } .xs-rev.no { border-left-color:var(--red,#f85149); }
.xs-rev-q { font-size:13px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.5; display:flex; gap:7px; align-items:baseline; }
.xs-rev-ic { flex-shrink:0; font-weight:800; } .xs-rev.ok .xs-rev-ic{color:var(--green,#3fb950);} .xs-rev.no .xs-rev-ic{color:var(--red,#f85149);}
.xs-rev-line { font-size:12px; color:var(--text-secondary,#b3c0d6); margin-top:4px; padding-left:19px; line-height:1.55; }
.xs-rev-line b { color:var(--text-muted,#7e8da8); }
.xs-rev-exp { font-size:12px; color:var(--text-muted,#7e8da8); margin-top:5px; padding-left:19px; line-height:1.6; }
.xs-rev-exp a { color:var(--brand,#58a6ff); text-decoration:none; }
.xs-revwrap { margin-top:14px; border-top:1px solid var(--border-default,#223047); padding-top:4px; }
.xs-revsum { cursor:pointer; list-style:none; margin-top:12px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#7e8da8); }
.xs-revsum::-webkit-details-marker{display:none;} .xs-revsum::before{content:'▸ ';} .xs-revwrap[open] .xs-revsum::before{content:'▾ ';}
`;
    document.head.appendChild(s);
  }

  let root, state, ticker = null;
  const modal = QE.createModal({
    className: 'xs-backdrop',
    ariaLabel: 'Certification exam simulation',
    focusSelectors: ['.xs-opt', '.xs-close'],
    onClose: stopTimer,
  });

  function stopTimer() { if (ticker) { clearInterval(ticker); ticker = null; } }

  function available(certId) {
    const bank = (TV.CertQuestions && TV.CertQuestions.byCert(certId)) || [];
    return bank.length >= 5; // need a minimally meaningful sim
  }

  function open(certId, opts) {
    opts = opts || {};
    const cert = TV.Certifications && TV.Certifications.byId(certId);
    const bank = (TV.CertQuestions && TV.CertQuestions.byCert(certId)) || [];
    if (!cert || bank.length < 5) {
      if (TV.Toast && TV.Toast.show) TV.Toast.show('Not enough questions for a timed simulation yet.');
      return;
    }
    injectStyles();
    root = modal.root();

    // full-length target = official count, capped by the real bank
    const officialN = cert.questionCount || 30;
    const n = Math.min(opts.count || officialN, bank.length);
    const qs = selectQuestions(cert, bank, n);
    // time scaled from official duration proportionally to question count
    const perQ = (cert.examDuration || 90) / officialN;
    const minutes = opts.minutes || Math.max(5, Math.round(perQ * qs.length));

    state = {
      cert, qs, i: 0,
      answers: {},            // index -> chosen option index
      flags: {},              // index -> true
      durationMs: minutes * 60000,
      startTs: Date.now(),
      submitted: false,
      navOpen: false,
    };
    modal.open(renderQ);
    startTimer();
  }

  function close() { stopTimer(); modal.close(); }

  function startTimer() {
    stopTimer();
    ticker = setInterval(() => {
      const left = state.durationMs - (Date.now() - state.startTs);
      const el = root.querySelector('.xs-timer');
      if (el) {
        el.textContent = fmtTime(left);
        el.classList.toggle('warn', left <= 60000);
      }
      if (left <= 0) { stopTimer(); submit(true); }
    }, 1000);
  }

  function renderQ() {
    const q = state.qs[state.i], cert = state.cert;
    const answeredCount = Object.keys(state.answers).length;
    const pct = Math.round((answeredCount / state.qs.length) * 100);
    const left = state.durationMs - (Date.now() - state.startTs);
    const picked = state.answers[state.i];
    const flagged = !!state.flags[state.i];
    const navCells = state.qs.map((_, k) =>
      `<button class="xs-nav-cell${state.answers[k] != null ? ' answered' : ''}${k === state.i ? ' current' : ''}${state.flags[k] ? ' flagged' : ''}" data-nav="${k}" aria-label="Go to question ${k + 1}${state.answers[k] != null ? ', answered' : ''}${state.flags[k] ? ', flagged' : ''}">${k + 1}</button>`
    ).join('');

    root.innerHTML = `
      <div class="xs-box">
        <div class="xs-head">
          <div><h2>${esc(cert.examCode || cert.name)} — Exam simulation</h2><div class="xs-sub">Question ${state.i + 1} of ${state.qs.length} · ${answeredCount} answered</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="xs-timer${left <= 60000 ? ' warn' : ''}" role="timer" aria-live="off">${fmtTime(left)}</span>
            <button class="xs-close" aria-label="Quit simulation">✕</button>
          </div>
        </div>
        <div class="xs-body">
          <div class="xs-prog" role="progressbar" aria-valuenow="${answeredCount}" aria-valuemin="0" aria-valuemax="${state.qs.length}" aria-label="Answered"><div class="xs-prog-fill" style="width:${pct}%"></div></div>
          <div class="xs-meta">
            <div class="xs-tags"><span class="xs-tag">${esc(domName(cert, q.domainId))}</span><span class="xs-tag">${esc(q.type || '')}</span></div>
            <button class="xs-flag${flagged ? ' on' : ''}" data-flag aria-pressed="${flagged}">⚑ ${flagged ? 'Flagged' : 'Flag for review'}</button>
          </div>
          <div class="xs-q" tabindex="-1">${esc(q.q)}</div>
          <div class="xs-opts" role="group" aria-label="Answer options">
            ${q.options.map((o, k) => `<button class="xs-opt${picked === k ? ' picked' : ''}" data-opt="${k}" aria-pressed="${picked === k}"><span class="xs-letter">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join('')}
          </div>
          <div class="xs-nav" role="group" aria-label="Question navigator" ${state.navOpen ? '' : 'hidden'}>${navCells}</div>
        </div>
        <div class="xs-foot">
          <div class="xs-navbtns">
            <button class="xs-btn xs-btn--ghost xs-prev" ${state.i === 0 ? 'disabled' : ''}>← Prev</button>
            <button class="xs-btn xs-btn--ghost xs-next" ${state.i === state.qs.length - 1 ? 'disabled' : ''}>Next →</button>
            <button class="xs-btn xs-btn--ghost xs-navtoggle" aria-expanded="${state.navOpen}">${state.navOpen ? 'Hide map' : 'Question map'}</button>
          </div>
          <button class="xs-btn xs-btn--go xs-submit">Submit exam</button>
        </div>
      </div>`;

    root.querySelector('.xs-close').addEventListener('click', close);
    root.querySelectorAll('.xs-opt').forEach(b => b.addEventListener('click', () => pick(parseInt(b.dataset.opt, 10))));
    root.querySelector('.xs-flag').addEventListener('click', toggleFlag);
    root.querySelector('.xs-prev').addEventListener('click', () => go(state.i - 1));
    root.querySelector('.xs-next').addEventListener('click', () => go(state.i + 1));
    root.querySelector('.xs-navtoggle').addEventListener('click', () => { state.navOpen = !state.navOpen; renderQ(); });
    root.querySelectorAll('.xs-nav-cell').forEach(b => b.addEventListener('click', () => go(parseInt(b.dataset.nav, 10))));
    root.querySelector('.xs-submit').addEventListener('click', () => submit(false));
  }

  function pick(k) { state.answers[state.i] = k; renderQ(); }
  function toggleFlag() { state.flags[state.i] = !state.flags[state.i]; renderQ(); }
  function go(idx) { if (idx < 0 || idx >= state.qs.length) return; state.i = idx; renderQ(); }

  function remediationFor(cert, weakDomainIds) {
    // map weak domains → their objectives' topics → study links
    const links = [];
    const seen = new Set();
    (cert.domains || []).filter(d => weakDomainIds.indexOf(d.id) !== -1).forEach(d => {
      (d.objectives || []).forEach(o => (o.topicIds || []).forEach(tid => {
        const t = TV.Taxonomy && TV.Taxonomy.byId(tid);
        if (t && t.route && !seen.has(t.id)) { seen.add(t.id); links.push({ label: t.label, route: t.route }); }
      }));
    });
    return links.slice(0, 8);
  }

  function submit(auto) {
    if (state.submitted) return;
    state.submitted = true;
    stopTimer();
    const cert = state.cert, total = state.qs.length;
    let correct = 0;
    const dom = {};
    const log = [];
    state.qs.forEach((q, idx) => {
      const chosen = state.answers[idx];
      const isC = chosen != null && chosen === q.answer;
      if (isC) correct++;
      const d = dom[q.domainId] || { c: 0, t: 0 }; d.t++; if (isC) d.c++; dom[q.domainId] = d;
      log.push({ q, chosen, correct: isC });
      if (TV.Progress && TV.Progress.recordCertAnswer) { try { TV.Progress.recordCertAnswer(cert.certificationId, q.domainId, isC); } catch (e) {} }
    });
    const pct = Math.round((correct / total) * 100);
    const unanswered = total - Object.keys(state.answers).length;

    const domRows = Object.keys(dom).map(id => {
      const d = dom[id], p = Math.round((d.c / d.t) * 100);
      return `<div class="xs-dom"><span class="xs-dom-name">${esc(domName(cert, id))}</span><div class="xs-dom-bar"><div class="xs-dom-fill ${lvlClass(p)}" style="width:${p}%"></div></div><span class="xs-dom-pct">${d.c}/${d.t} · ${p}%</span></div>`;
    }).join('');

    const weakDomIds = Object.keys(dom).filter(id => (dom[id].c / dom[id].t) < 0.7);
    const remed = remediationFor(cert, weakDomIds);
    const remedHTML = weakDomIds.length ? `
      <div class="xs-reslabel">Weak-area remediation</div>
      <div class="xs-remed">Focus these weak domains: <b>${esc(weakDomIds.map(id => domName(cert, id)).join(', '))}</b>.
      ${remed.length ? '<br>Study: ' + remed.map(r => `<a data-go="${esc(r.route)}">${esc(r.label)}</a>`).join(' · ') : ''}</div>` : '';

    const review = log.map((e, n) => {
      const picked = e.chosen != null ? e.q.options[e.chosen] : '(no answer)';
      const right = e.q.options[e.q.answer];
      const ref = e.q.officialRef ? ` <a href="${esc(e.q.officialRef.url)}" target="_blank" rel="noopener">📖 ${esc(e.q.officialRef.label)} ↗</a>` : '';
      return `<div class="xs-rev ${e.correct ? 'ok' : 'no'}">
        <div class="xs-rev-q"><span class="xs-rev-ic">${e.correct ? '✓' : '✗'}</span>${n + 1}. ${esc(e.q.q)}</div>
        ${e.correct ? '' : `<div class="xs-rev-line"><b>Your answer:</b> ${esc(picked)}</div>`}
        <div class="xs-rev-line"><b>Correct:</b> ${esc(right)}</div>
        <div class="xs-rev-exp">${esc(e.q.explanation || '')}${ref}</div>
      </div>`;
    }).join('');

    const rd = TV.CertEngine ? TV.CertEngine.certReadiness(cert) : null;
    const msg = pct >= 80 ? 'At or above the usual pass bar on this practice set. Shore up any red domain and book it.'
      : pct >= 60 ? 'Approaching the bar. Target the weak domains below, then resimulate.'
      : 'Below the usual bar — work the mapped content for the weak domains, then retry.';
    const estNote = `This is a practice estimate from ${total} sampled questions, not a scaled official score; it does not guarantee a pass.`;

    root.innerHTML = `
      <div class="xs-box">
        <div class="xs-head"><div><h2>${esc(cert.examCode || cert.name)} — Simulation result</h2><div class="xs-sub">${auto ? 'Time expired · auto-submitted' : 'Submitted'}${unanswered ? ' · ' + unanswered + ' unanswered' : ''}</div></div><button class="xs-close" aria-label="Close result">✕</button></div>
        <div class="xs-body">
          <div class="xs-result"><div class="xs-result-score">${pct}%</div><div class="xs-result-msg">${correct} / ${total} correct. ${msg}</div></div>
          <div class="xs-reslabel">By domain (official weightings)</div>
          ${domRows}
          ${remedHTML}
          ${rd ? `<div style="margin-top:14px;font-size:13px;color:var(--text-secondary,#b3c0d6)">Updated certification readiness: <b style="color:var(--text-primary,#e6edf7)">${rd.overall}%</b> · ${esc(rd.tier)}</div>` : ''}
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted,#7e8da8)">${estNote}</div>
          <details class="xs-revwrap"><summary class="xs-revsum">Review all answers (${correct}/${total})</summary>${review}</details>
        </div>
        <div class="xs-foot"><button class="xs-btn xs-btn--ghost xs-close2">Close</button><button class="xs-btn xs-retry">New simulation</button></div>
      </div>`;
    root.querySelector('.xs-close').addEventListener('click', close);
    root.querySelector('.xs-close2').addEventListener('click', close);
    root.querySelector('.xs-retry').addEventListener('click', () => open(cert.certificationId));
    root.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => {
      const route = a.getAttribute('data-go'); close();
      if (route && TV.navigate) TV.navigate(route); else if (route) location.hash = route;
    }));
    const rt = root.querySelector('.xs-retry'); if (rt) rt.focus();
  }

  TV.ExamSim = { open, close, available };
})();
