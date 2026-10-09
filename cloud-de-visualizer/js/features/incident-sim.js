/* ============================================================
   Cloud DE Visualizer — Incident Simulator UI (Phase 2 / O2.3)

   Drives an incident through: brief → investigate (reveal evidence) →
   diagnose (root cause) → remediate (fix) → scored result with the
   decisive evidence, validation, prevention, interview follow-ups and
   an official reference. Built on TV.QuestionEngine (modal shell +
   focus mgmt) and scored by TV.IncidentEngine. Records a troubleshooting
   signal into TV.Progress when available.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;
  const QE = TV.QuestionEngine, IE = TV.IncidentEngine;
  const esc = QE.esc;

  function injectStyles() {
    if (document.getElementById('is-styles')) return;
    const s = document.createElement('style'); s.id = 'is-styles';
    s.textContent = `
.is-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.62); backdrop-filter:blur(4px); z-index:9000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .2s; }
.is-backdrop.visible { opacity:1; pointer-events:all; }
.is-box { background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:var(--radius-lg,16px); width:720px; max-width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--shadow-xl,0 16px 48px rgba(0,0,0,.7)); }
.is-head { padding:14px 20px; border-bottom:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
.is-head h2 { font-size:15px; font-weight:800; margin:0; color:var(--text-primary,#e6edf7); }
.is-head .is-sub { font-size:12px; color:var(--text-muted,#7e8da8); margin-top:2px; }
.is-steps { display:flex; gap:6px; margin-top:6px; }
.is-step { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:2px 8px; border-radius:20px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); }
.is-step.on { background:color-mix(in srgb,var(--brand,#58a6ff) 20%,transparent); color:var(--brand,#58a6ff); }
.is-step.done { color:var(--green,#3fb950); }
.is-close { background:none; border:none; color:var(--text-muted,#7e8da8); cursor:pointer; font-size:20px; padding:4px 8px; border-radius:6px; }
.is-close:hover { background:var(--bg-3,#1a2334); color:var(--text-primary,#e6edf7); }
.is-body { padding:18px 20px; overflow-y:auto; }
.is-sec-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted,#7e8da8); margin:14px 0 6px; }
.is-sec-h:first-child { margin-top:0; }
.is-p { font-size:14px; color:var(--text-secondary,#b3c0d6); line-height:1.6; margin:0 0 6px; }
.is-list { margin:4px 0 6px; padding-left:18px; }
.is-list li { font-size:13px; color:var(--text-secondary,#b3c0d6); line-height:1.6; margin-bottom:3px; }
.is-q { font-size:15px; font-weight:700; color:var(--text-primary,#e6edf7); line-height:1.5; margin:4px 0 12px; }
.is-invs { display:grid; gap:8px; }
.is-inv { text-align:left; padding:11px 13px; background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-radius:9px; cursor:pointer; font:inherit; color:var(--text-secondary,#b3c0d6); font-size:13px; width:100%; display:flex; align-items:center; gap:9px; }
.is-inv:hover { border-color:var(--brand,#58a6ff); }
.is-inv.done { border-color:var(--border-muted,#33455f); color:var(--text-muted,#7e8da8); }
.is-inv .is-inv-ic { width:18px; flex-shrink:0; }
.is-evidence { margin-top:8px; display:grid; gap:8px; }
.is-ev { background:var(--bg-1,#0e1420); border-left:3px solid var(--brand,#58a6ff); border-radius:8px; padding:10px 12px; font-size:13px; color:var(--text-secondary,#b3c0d6); line-height:1.6; font-family:var(--font-mono,monospace); }
.is-ev b { color:var(--text-primary,#e6edf7); font-family:inherit; }
.is-opts { display:grid; gap:9px; }
.is-opt { display:flex; align-items:flex-start; gap:11px; text-align:left; padding:12px 14px; background:var(--bg-1,#0e1420); border:1px solid var(--border-default,#223047); border-radius:10px; cursor:pointer; font:inherit; color:var(--text-secondary,#b3c0d6); font-size:14px; line-height:1.5; width:100%; }
.is-opt:hover { border-color:var(--brand,#58a6ff); }
.is-opt.picked { border-color:var(--brand,#58a6ff); background:color-mix(in srgb,var(--brand,#58a6ff) 14%,transparent); color:var(--text-primary,#e6edf7); }
.is-opt.correct { border-color:var(--green,#3fb950); background:var(--green-subtle,rgba(63,185,80,.12)); color:var(--text-primary,#e6edf7); }
.is-opt.wrong { border-color:var(--red,#f85149); background:var(--red-subtle,rgba(248,81,73,.1)); color:var(--text-primary,#e6edf7); }
.is-foot { padding:12px 20px; border-top:1px solid var(--border-default,#223047); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-shrink:0; }
.is-note { font-size:12px; color:var(--text-muted,#7e8da8); }
.is-btn { background:var(--brand-gradient,var(--brand,#58a6ff)); color:#fff; border:none; border-radius:9px; padding:9px 18px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.is-btn:disabled { opacity:.4; cursor:default; }
.is-btn--ghost { background:none; border:1px solid var(--border-default,#223047); color:var(--text-secondary,#b3c0d6); }
.is-result-score { font-size:42px; font-weight:800; color:var(--brand,#58a6ff); line-height:1; }
.is-scoreline { display:flex; gap:16px; flex-wrap:wrap; margin:10px 0; font-size:13px; color:var(--text-secondary,#b3c0d6); }
.is-scoreline b { color:var(--text-primary,#e6edf7); }
.is-ref a { color:var(--brand,#58a6ff); text-decoration:none; font-size:13px; }
.is-tag { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; padding:2px 8px; border-radius:20px; background:var(--bg-4,#223047); color:var(--text-muted,#7e8da8); }
`;
    document.head.appendChild(s);
  }

  const STEPS = [['brief', 'Brief'], ['investigate', 'Investigate'], ['diagnose', 'Diagnose'], ['remediate', 'Remediate'], ['result', 'Result']];
  let root, session, phase;
  const modal = QE.createModal({ className: 'is-backdrop', ariaLabel: 'Production incident simulator', focusSelectors: ['.is-btn', '.is-inv', '.is-close'] });

  function available(cloud) { return TV.Incidents && TV.Incidents.byCloud(cloud).length > 0; }

  function open(incidentId) {
    const inc = TV.Incidents && TV.Incidents.byId(incidentId);
    if (!inc) { if (TV.Toast && TV.Toast.show) TV.Toast.show('Incident not found.'); return; }
    injectStyles();
    root = modal.root();
    session = IE.newSession(inc);
    phase = 'brief';
    modal.open(renderPhase);
  }
  function close() { modal.close(); }

  function stepBar() {
    const idx = STEPS.findIndex(s => s[0] === phase);
    return `<div class="is-steps">${STEPS.map((s, i) => `<span class="is-step ${i === idx ? 'on' : i < idx ? 'done' : ''}">${esc(s[1])}</span>`).join('')}</div>`;
  }
  function shell(bodyHTML, footHTML) {
    const inc = session.incident;
    root.innerHTML = `
      <div class="is-box">
        <div class="is-head">
          <div><h2>${esc(inc.title)}</h2><div class="is-sub"><span class="is-tag">${esc(inc.cloud)}</span> incident simulator</div>${stepBar()}</div>
          <button class="is-close" aria-label="Close simulator">✕</button>
        </div>
        <div class="is-body">${bodyHTML}</div>
        <div class="is-foot">${footHTML}</div>
      </div>`;
    root.querySelector('.is-close').addEventListener('click', close);
  }

  function renderPhase() {
    if (phase === 'brief') return renderBrief();
    if (phase === 'investigate') return renderInvestigate();
    if (phase === 'diagnose') return renderDiagnose();
    if (phase === 'remediate') return renderRemediate();
    if (phase === 'result') return renderResult();
  }

  function renderBrief() {
    const inc = session.incident;
    shell(
      `<div class="is-sec-h">Business context</div><p class="is-p">${esc(inc.context)}</p>
       <div class="is-sec-h">Architecture</div><p class="is-p">${esc(inc.architecture || '—')}</p>
       <div class="is-sec-h">Expected behavior</div><p class="is-p">${esc(inc.expected)}</p>
       <div class="is-sec-h">Observed symptoms</div><ul class="is-list">${inc.symptoms.map(s => '<li>' + esc(s) + '</li>').join('')}</ul>`,
      `<span class="is-note">Investigate before you diagnose.</span><button class="is-btn is-begin">Begin investigation →</button>`
    );
    root.querySelector('.is-begin').addEventListener('click', () => { phase = 'investigate'; renderPhase(); });
  }

  function renderInvestigate() {
    const inc = session.incident;
    const invs = inc.investigations.map(iv => {
      const done = session.inspected.indexOf(iv.id) !== -1;
      return `<button class="is-inv ${done ? 'done' : ''}" data-inv="${esc(iv.id)}"><span class="is-inv-ic">${done ? '✓' : '🔍'}</span><span>${esc(iv.label)}</span></button>`;
    }).join('');
    const evidence = session.inspected.map(id => {
      const iv = inc.investigations.find(x => x.id === id);
      return `<div class="is-ev"><b>${esc(iv ? iv.label : id)}:</b> ${esc(inc.evidence[id] || '')}</div>`;
    }).join('');
    shell(
      `<div class="is-sec-h">Choose what to inspect</div>
       <div class="is-invs">${invs}</div>
       ${session.inspected.length ? '<div class="is-sec-h">Evidence gathered</div><div class="is-evidence">' + evidence + '</div>' : ''}`,
      `<span class="is-note">${session.inspected.length} inspected</span><button class="is-btn is-diagnose" ${session.inspected.length ? '' : 'disabled'}>Ready to diagnose →</button>`
    );
    root.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => { IE.inspect(session, b.getAttribute('data-inv')); renderPhase(); }));
    const d = root.querySelector('.is-diagnose'); if (d) d.addEventListener('click', () => { phase = 'diagnose'; renderPhase(); });
  }

  function renderDiagnose() {
    const inc = session.incident;
    const opts = inc.rootCauses.map((o, k) => `<button class="is-opt ${session.rootPick === k ? 'picked' : ''}" data-root="${k}">${esc(o.text)}</button>`).join('');
    shell(
      `<div class="is-q">What is the root cause?</div><div class="is-opts">${opts}</div>`,
      `<button class="is-btn is-btn--ghost is-back">← Investigate more</button><button class="is-btn is-next" ${session.rootPick != null ? '' : 'disabled'}>Choose remediation →</button>`
    );
    root.querySelectorAll('[data-root]').forEach(b => b.addEventListener('click', () => { session.rootPick = parseInt(b.dataset.root, 10); renderPhase(); }));
    root.querySelector('.is-back').addEventListener('click', () => { phase = 'investigate'; renderPhase(); });
    const n = root.querySelector('.is-next'); if (n) n.addEventListener('click', () => { phase = 'remediate'; renderPhase(); });
  }

  function renderRemediate() {
    const inc = session.incident;
    const opts = inc.remediations.map((o, k) => `<button class="is-opt ${session.remedPick === k ? 'picked' : ''}" data-remed="${k}">${esc(o.text)}</button>`).join('');
    shell(
      `<div class="is-q">What is the best remediation?</div><div class="is-opts">${opts}</div>`,
      `<button class="is-btn is-btn--ghost is-back">← Back</button><button class="is-btn is-submit" ${session.remedPick != null ? '' : 'disabled'}>Submit diagnosis</button>`
    );
    root.querySelectorAll('[data-remed]').forEach(b => b.addEventListener('click', () => { session.remedPick = parseInt(b.dataset.remed, 10); renderPhase(); }));
    root.querySelector('.is-back').addEventListener('click', () => { phase = 'diagnose'; renderPhase(); });
    const sub = root.querySelector('.is-submit'); if (sub) sub.addEventListener('click', submit);
  }

  function submit() {
    session.submitted = true;
    phase = 'result';
    const inc = session.incident, r = IE.score(session);
    if (TV.Progress && TV.Progress.recordIncident) { try { TV.Progress.recordIncident(inc.cloud, inc.service, r.overall >= 60); } catch (e) {} }
    renderResult(r);
  }

  function renderResult(r) {
    const inc = session.incident;
    r = r || IE.score(session);
    const rootOpts = inc.rootCauses.map((o, k) => {
      const cls = o.correct ? 'correct' : (k === session.rootPick ? 'wrong' : '');
      return `<button class="is-opt ${cls}" disabled>${esc(o.text)}</button>`;
    }).join('');
    const remedOpts = inc.remediations.map((o, k) => {
      const cls = o.correct ? 'correct' : (k === session.remedPick ? 'wrong' : '');
      return `<button class="is-opt ${cls}" disabled>${esc(o.text)}</button>`;
    }).join('');
    const missed = r.missedKey.length ? `<p class="is-note">You committed without inspecting ${r.missedKey.length} decisive clue(s). Evidence-led diagnosis inspects the signal first.</p>` : '';
    const list = (arr) => (arr && arr.length) ? '<ul class="is-list">' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="is-p">—</p>';
    const ref = inc.officialRef ? `<div class="is-sec-h">Reference</div><div class="is-ref"><a href="${esc(inc.officialRef.url)}" target="_blank" rel="noopener">📖 ${esc(inc.officialRef.label)} ↗</a></div>` : '';
    shell(
      `<div style="text-align:center"><div class="is-result-score">${r.overall}%</div><div class="is-note">${esc(r.grade)}</div></div>
       <div class="is-scoreline">
         <span>Key evidence: <b>${r.keyFound}/${r.keyTotal}</b></span>
         <span>Root cause: <b>${r.rootCorrect ? '✓' : '✗'}</b></span>
         <span>Remediation: <b>${r.remedCorrect ? '✓' : '✗'}</b></span>
       </div>
       ${missed}
       <div class="is-sec-h">Root cause</div><div class="is-opts">${rootOpts}</div>
       <div class="is-sec-h">Remediation</div><div class="is-opts">${remedOpts}</div>
       <div class="is-sec-h">How to validate the fix</div>${list(inc.validation)}
       <div class="is-sec-h">Prevention</div>${list(inc.prevention)}
       <div class="is-sec-h">Interview follow-ups</div>${list(inc.followUps)}
       ${ref}`,
      `<button class="is-btn is-btn--ghost is-close2">Close</button><button class="is-btn is-retry">Try another approach</button>`
    );
    root.querySelector('.is-close2').addEventListener('click', close);
    const rt = root.querySelector('.is-retry');
    rt.addEventListener('click', () => open(inc.id));
    rt.focus();
  }

  TV.IncidentSim = { open, close, available };
})();
