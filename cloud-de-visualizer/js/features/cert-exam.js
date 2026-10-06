/* ============================================================
   Cloud DE Visualizer — Certification practice-exam modal (C5).

   Launches a scored, scenario-based practice exam for a certification
   from TV.CertQuestions. Each answered question is recorded into the
   signal store (TV.Progress.recordCertAnswer) per official domain, so
   cert readiness updates. On finish it shows a per-domain breakdown and
   the updated readiness tier. Reveals an explanation, why the other
   options are wrong, the domain/objective it tests and an official-doc
   reference — never "this exact question will appear".
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  let root, state, _lastFocus = null;

  // Keep keyboard focus inside the dialog while it is open.
  function trapFocus(e) {
    if (e.key !== 'Tab' || !root || !root.classList.contains('visible')) return;
    const f = root.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function injectStyles() {
    if (document.getElementById('cx-styles')) return;
    const s = document.createElement('style');
    s.id = 'cx-styles';
    s.textContent = `
.cx-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .2s; }
.cx-backdrop.visible { opacity:1; pointer-events:all; }
.cx-box { background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:var(--radius-lg,16px); width:680px; max-width:100%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow-xl,0 16px 48px rgba(0,0,0,.7)); }
.cx-head { padding:16px 22px; border-bottom:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cx-head h2 { font-size:15px; font-weight:800; margin:0; color:var(--text-primary,#e6edf7); }
.cx-head .cx-sub { font-size:12px; color:var(--text-muted,#7e8da8); margin-top:2px; }
.cx-close { background:none; border:none; color:var(--text-muted,#7e8da8); cursor:pointer; font-size:20px; padding:4px 8px; border-radius:6px; }
.cx-close:hover { background:var(--bg-3,#1a2334); color:var(--text-primary,#e6edf7); }
.cx-body { padding:18px 22px; overflow-y:auto; }
.cx-prog { height:4px; background:var(--bg-4,#223047); border-radius:2px; overflow:hidden; margin-bottom:16px; }
.cx-prog-fill { height:100%; background:var(--brand,#58a6ff); transition:width .25s; }
.cx-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
.cx-tag { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:2px 8px; border-radius:20px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); }
.cx-tag.lvl { background:color-mix(in srgb,var(--brand,#58a6ff) 18%,transparent); color:var(--brand,#58a6ff); }
.cx-q { font-size:15px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.55; margin-bottom:14px; }
.cx-opts { display:grid; gap:9px; }
.cx-opt { display:flex; align-items:flex-start; gap:11px; text-align:left; padding:12px 14px; background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-radius:10px; cursor:pointer; font:inherit; color:var(--text-secondary,#b3c0d6); font-size:14px; line-height:1.5; width:100%; transition:border-color .14s ease, background .14s ease, transform .14s ease; }
.cx-opt:hover:not(:disabled) { border-color:var(--brand,#58a6ff); background:var(--bg-2,#131b2b); }
.cx-opt:disabled { cursor:default; }
.cx-opt .cx-letter { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.cx-opt.correct { border-color:var(--green,#3fb950); background:var(--green-subtle,rgba(63,185,80,.12)); color:var(--text-primary,#e6edf7); }
.cx-opt.correct .cx-letter { background:var(--green,#3fb950); color:#fff; }
.cx-opt.wrong { border-color:var(--red,#f85149); background:var(--red-subtle,rgba(248,81,73,.1)); color:var(--text-primary,#e6edf7); }
.cx-opt.wrong .cx-letter { background:var(--red,#f85149); color:#fff; }
.cx-exp { margin-top:14px; background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-left:3px solid var(--brand,#58a6ff); border-radius:8px; padding:12px 14px; font-size:13px; color:var(--text-secondary,#b3c0d6); line-height:1.6; display:none; }
.cx-exp.show { display:block; }
.cx-exp b { color:var(--text-primary,#e6edf7); }
.cx-exp .cx-why { margin-top:7px; color:var(--text-muted,#7e8da8); }
.cx-exp .cx-ref { margin-top:8px; }
.cx-exp .cx-ref a { color:var(--brand,#58a6ff); text-decoration:none; font-size:12px; }
.cx-foot { padding:14px 22px; border-top:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:12px; }
.cx-score { font-size:13px; color:var(--text-muted,#7e8da8); }
.cx-btn { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:9px 18px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.cx-btn:disabled { opacity:.4; cursor:default; }
.cx-btn--ghost { background:none; border:1px solid var(--border-default,#223047); color:var(--text-secondary,#b3c0d6); }
.cx-result { text-align:center; padding:10px 0; }
.cx-result-score { font-size:42px; font-weight:800; color:var(--brand,#58a6ff); line-height:1; }
.cx-result-msg { font-size:14px; color:var(--text-secondary,#b3c0d6); margin-top:10px; }
.cx-dom { display:flex; align-items:center; gap:10px; margin:8px 0; }
.cx-dom-name { flex:1; font-size:13px; color:var(--text-secondary,#b3c0d6); text-align:left; }
.cx-dom-bar { width:120px; height:7px; background:var(--bg-4,#223047); border-radius:4px; overflow:hidden; }
.cx-dom-fill { height:100%; border-radius:4px; }
.cx-lo{background:var(--red,#f85149);} .cx-mid{background:#d29922;} .cx-hi{background:var(--green,#3fb950);}
.cx-dom-pct { font-size:12px; font-weight:700; color:var(--text-muted,#7e8da8); width:38px; text-align:right; }
.cx-reslabel { margin-top:16px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#7e8da8); }
.cx-reviewwrap { margin-top:16px; border-top:1px solid var(--border-default,#223047); padding-top:4px; }
.cx-revsum { cursor:pointer; list-style:none; margin-top:12px; }
.cx-revsum::-webkit-details-marker { display:none; }
.cx-revsum::before { content:'▸ '; color:var(--text-muted,#7e8da8); }
.cx-reviewwrap[open] .cx-revsum::before { content:'▾ '; }
.cx-rev { border-left:3px solid var(--border-muted,#33455f); padding:8px 0 8px 12px; margin-top:10px; }
.cx-rev.ok { border-left-color:var(--green,#3fb950); }
.cx-rev.no { border-left-color:var(--red,#f85149); }
.cx-rev-q { font-size:13px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.5; display:flex; gap:7px; align-items:baseline; }
.cx-rev-ic { flex-shrink:0; font-weight:800; }
.cx-rev.ok .cx-rev-ic { color:var(--green,#3fb950); } .cx-rev.no .cx-rev-ic { color:var(--red,#f85149); }
.cx-rev-line { font-size:12px; color:var(--text-secondary,#b3c0d6); margin-top:4px; padding-left:19px; line-height:1.5; }
.cx-rev-line b { color:var(--text-muted,#7e8da8); font-weight:700; }
`;
    document.head.appendChild(s);
  }

  function ensureRoot() {
    if (root) return root;
    injectStyles();
    root = document.createElement('div');
    root.className = 'cx-backdrop';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Certification practice exam');
    document.body.appendChild(root);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('visible')) close(); });
    document.addEventListener('keydown', trapFocus);
    return root;
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function domName(cert, id) { const d = (cert.domains || []).find(x => x.id === id); return d ? d.name : id; }
  function lvlClass(p) { return p < 45 ? 'cx-lo' : p < 70 ? 'cx-mid' : 'cx-hi'; }

  function open(certId, opts) {
    opts = opts || {};
    const cert = TV.Certifications && TV.Certifications.byId(certId);
    const all = (TV.CertQuestions && TV.CertQuestions.byCert(certId)) || [];
    if (!cert || !all.length) {
      if (TV.Toast && TV.Toast.show) TV.Toast.show('Practice exam for this track is coming soon.');
      else alert('Practice exam for this track is coming soon.');
      return;
    }
    _lastFocus = document.activeElement;
    ensureRoot();
    const n = Math.min(opts.count || 10, all.length);
    state = { cert: cert, qs: shuffle(all).slice(0, n), i: 0, correct: 0, answered: false, dom: {} };
    renderQ();
    root.classList.add('visible');
    document.body.classList.add('modal-open');
    // move focus into the dialog (first answer option)
    const first = root.querySelector('.cx-opt') || root.querySelector('.cx-close');
    if (first) first.focus();
  }
  function close() {
    if (root) root.classList.remove('visible');
    document.body.classList.remove('modal-open');
    // restore focus to whatever opened the exam
    if (_lastFocus && typeof _lastFocus.focus === 'function') { try { _lastFocus.focus(); } catch (e) {} }
    _lastFocus = null;
  }

  function renderQ() {
    const q = state.qs[state.i], cert = state.cert;
    // position-based: Q1 of 10 reads 10%, last question reads 100%
    const pct = Math.round(((state.i + 1) / state.qs.length) * 100);
    const LL = (TV.CertQuestions.LEVEL_LABEL || {})[q.level] || ('L' + q.level);
    const scoreLine = state.i === 0 ? 'Not answered yet' : `${state.correct} / ${state.i} correct so far`;
    root.innerHTML = `
      <div class="cx-box">
        <div class="cx-head">
          <div><h2>${esc(cert.examCode || cert.name)} — Practice exam</h2><div class="cx-sub">Question ${state.i + 1} of ${state.qs.length}</div></div>
          <button class="cx-close" aria-label="Close exam">✕</button>
        </div>
        <div class="cx-body">
          <div class="cx-prog" role="progressbar" aria-valuenow="${state.i + 1}" aria-valuemin="1" aria-valuemax="${state.qs.length}" aria-label="Exam progress"><div class="cx-prog-fill" style="width:${pct}%"></div></div>
          <div class="cx-tags">
            <span class="cx-tag">${esc(domName(cert, q.domainId))}</span>
            <span class="cx-tag">${esc(q.type)}</span>
            <span class="cx-tag lvl">${esc(LL)}</span>
          </div>
          <div class="cx-q" tabindex="-1">${esc(q.q)}</div>
          <div class="cx-opts" role="group" aria-label="Answer options">
            ${q.options.map((o, k) => `<button class="cx-opt" data-opt="${k}"><span class="cx-letter">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join('')}
          </div>
          <div class="cx-exp" role="status" aria-live="polite"></div>
        </div>
        <div class="cx-foot">
          <span class="cx-score">${scoreLine}</span>
          <button class="cx-btn cx-next" disabled>${state.i === state.qs.length - 1 ? 'See result' : 'Next →'}</button>
        </div>
      </div>`;
    root.querySelector('.cx-close').addEventListener('click', close);
    root.querySelectorAll('.cx-opt').forEach(btn => btn.addEventListener('click', () => choose(parseInt(btn.dataset.opt, 10))));
    root.querySelector('.cx-next').addEventListener('click', next);
  }

  function choose(k) {
    if (state.answered) return;
    state.answered = true;
    const q = state.qs[state.i];
    const correct = k === q.answer;
    root.querySelectorAll('.cx-opt').forEach((b, idx) => {
      b.disabled = true;
      const letter = b.querySelector('.cx-letter');
      if (idx === q.answer) { b.classList.add('correct'); if (letter) letter.textContent = '✓'; }
      if (idx === k && !correct) { b.classList.add('wrong'); if (letter) letter.textContent = '✗'; }
    });
    if (correct) state.correct++;
    (state.log = state.log || []).push({ q: q, chosen: k, correct: correct });
    // per-domain tally + persist signal
    const d = state.dom[q.domainId] || { c: 0, t: 0 }; d.t++; if (correct) d.c++; state.dom[q.domainId] = d;
    if (TV.Progress && TV.Progress.recordCertAnswer) { try { TV.Progress.recordCertAnswer(state.cert.certificationId, q.domainId, correct); } catch (e) {} }
    const exp = root.querySelector('.cx-exp');
    const ref = q.officialRef ? `<div class="cx-ref"><a href="${esc(q.officialRef.url)}" target="_blank" rel="noopener">📖 ${esc(q.officialRef.label)} ↗</a></div>` : '';
    exp.innerHTML = `<b>${correct ? '✓ Correct.' : '✗ Not quite.'}</b> ${esc(q.explanation)}${q.whyWrong ? '<div class="cx-why"><b>Why not the others:</b> ' + esc(q.whyWrong) + '</div>' : ''}${ref}`;
    exp.classList.add('show');
    root.querySelector('.cx-score').textContent = `${state.correct} / ${state.i + 1} correct`;
    const nextBtn = root.querySelector('.cx-next');
    nextBtn.disabled = false;
    nextBtn.focus();
  }

  function next() { if (state.i === state.qs.length - 1) return finish(); state.i++; state.answered = false; renderQ(); }

  function finish() {
    const cert = state.cert, total = state.qs.length, pct = Math.round((state.correct / total) * 100);
    const rd = TV.CertEngine ? TV.CertEngine.certReadiness(cert) : null;
    const msg = pct >= 80 ? 'Strong — at/above the usual pass bar. Shore up any red domains and book it.' :
                pct >= 60 ? 'Getting there. Focus the weak domains below, then retake.' :
                'Keep studying the mapped content, then retry — this is how readiness climbs.';
    const doms = Object.keys(state.dom).map(id => {
      const d = state.dom[id], p = Math.round((d.c / d.t) * 100);
      return `<div class="cx-dom"><span class="cx-dom-name">${esc(domName(cert, id))}</span><div class="cx-dom-bar"><div class="cx-dom-fill ${lvlClass(p)}" style="width:${p}%"></div></div><span class="cx-dom-pct">${p}%</span></div>`;
    }).join('');
    // Review-your-answers: every question with the user's pick vs. the key
    const review = (state.log || []).map((e, n) => {
      const picked = e.q.options[e.chosen], right = e.q.options[e.q.answer];
      return `<div class="cx-rev ${e.correct ? 'ok' : 'no'}">
        <div class="cx-rev-q"><span class="cx-rev-ic">${e.correct ? '✓' : '✗'}</span>${n + 1}. ${esc(e.q.q)}</div>
        ${e.correct ? '' : `<div class="cx-rev-line"><b>Your answer:</b> ${esc(picked)}</div>`}
        <div class="cx-rev-line"><b>Correct:</b> ${esc(right)}</div>
      </div>`;
    }).join('');
    root.innerHTML = `
      <div class="cx-box">
        <div class="cx-head"><div><h2>${esc(cert.examCode || cert.name)} — Result</h2><div class="cx-sub">Practice exam complete</div></div><button class="cx-close" aria-label="Close result">✕</button></div>
        <div class="cx-body">
          <div class="cx-result"><div><span class="cx-result-score">${pct}%</span></div><div class="cx-result-msg">${state.correct} / ${total} correct. ${msg}</div></div>
          <div class="cx-reslabel">This exam — by domain</div>
          ${doms}
          ${rd ? `<div style="margin-top:14px;font-size:13px;color:var(--text-secondary,#b3c0d6)">Updated certification readiness: <b style="color:var(--text-primary,#e6edf7)">${rd.overall}%</b> · ${esc(rd.tier)}</div>` : ''}
          <details class="cx-reviewwrap"><summary class="cx-reslabel cx-revsum">Review your answers (${state.correct}/${total})</summary>${review}</details>
        </div>
        <div class="cx-foot"><button class="cx-btn cx-btn--ghost cx-close2">Close</button><button class="cx-btn cx-retry">Retake</button></div>
      </div>`;
    root.querySelector('.cx-close').addEventListener('click', close);
    root.querySelector('.cx-close2').addEventListener('click', close);
    root.querySelector('.cx-retry').addEventListener('click', () => open(cert.certificationId));
    const rt = root.querySelector('.cx-retry'); if (rt) rt.focus();
  }

  TV.CertExam = { open: open, close: close, available: (certId) => TV.CertQuestions && TV.CertQuestions.has(certId) };
})();
