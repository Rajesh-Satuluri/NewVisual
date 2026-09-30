/* Apache Hudi — Study Deck (aggregates question bank + interview). Hudi bucket. */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('hstudy-styles')) return;
    const s = document.createElement('style');
    s.id = 'hstudy-styles';
    s.textContent = `
.hstudy-page { padding:24px; height:100%; overflow-y:auto; }
.hstudy-filters { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:16px 0 8px; position:sticky; top:-24px; z-index:2; background:var(--bg-1); padding:12px 0; }
.hstudy-search { flex:1; min-width:200px; display:flex; align-items:center; gap:8px; background:var(--bg-3); border:1px solid var(--border-default); border-radius:var(--radius-sm); padding:8px 12px; }
.hstudy-search input { flex:1; background:none; border:none; outline:none; color:var(--text-primary); font-size:var(--text-sm); }
.hstudy-select { background:var(--bg-3); border:1px solid var(--border-default); color:var(--text-primary); border-radius:var(--radius-sm); padding:8px 10px; font-size:var(--text-sm); }
.hstudy-count { font-size:var(--text-xs); color:var(--text-muted); margin:4px 0 16px; }
.hstudy-group { margin-bottom:26px; }
.hstudy-group__title { font-size:var(--text-xs); font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid var(--border-subtle); }
.hstudy-card { border:1px solid var(--border-default); border-radius:var(--radius); background:var(--bg-2); margin-bottom:10px; overflow:hidden; }
.hstudy-card__q { width:100%; text-align:left; background:none; border:none; cursor:pointer; display:flex; gap:10px; align-items:flex-start; padding:14px 16px; color:var(--text-primary); font-size:var(--text-sm); font-weight:500; line-height:1.5; }
.hstudy-card__q:hover { background:var(--bg-3); }
.hstudy-card__a { padding:0 16px 14px 44px; color:var(--text-secondary); font-size:var(--text-sm); line-height:1.6; border-top:1px solid var(--border-subtle); padding-top:12px; }
.hstudy-chip { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; padding:2px 7px; border-radius:999px; flex-shrink:0; }
.hstudy-chip--basic { background:var(--green-subtle); color:var(--green); }
.hstudy-chip--intermediate { background:var(--yellow-subtle); color:var(--yellow); }
.hstudy-chip--advanced { background:var(--red-subtle); color:var(--red); }
.hstudy-chip--senior { background:var(--purple-subtle); color:var(--purple); }
.hstudy-chip--quiz { background:var(--brand-glow); color:var(--brand); }
.hstudy-chip--interview { background:var(--purple-subtle); color:var(--purple); }
.hstudy-empty { padding:40px; text-align:center; color:var(--text-muted); }
.hstudy-head h1 { font-size:22px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; }
.hstudy-head p { font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0; max-width:720px; }
`;
    document.head.appendChild(s);
  }

  function labelFor(id) { const s = (TV.getScreens ? TV.getScreens() : []).find(x => x.id === id); return s ? s.label : id; }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ''); }

  function collect() {
    const items = [];
    const qb = (TV.QuestionBank && TV.QuestionBank.hudi) || {};
    Object.keys(qb).forEach(screen => {
      if (!Array.isArray(qb[screen])) return;
      qb[screen].forEach(q => items.push({ type: 'quiz', difficulty: q.difficulty || 'basic', group: labelFor(screen), q: q.q, a: q.explanation }));
    });
    (TV.HudiInterview || []).forEach(x => items.push({ type: 'interview', difficulty: x.level || 'intermediate', group: 'Interview Questions', q: x.q, a: stripTags(x.a) }));
    return items;
  }

  function render(container) {
    injectStyles();
    const all = collect();
    container.className = '';
    const page = document.createElement('div');
    page.className = 'hstudy-page page-enter';
    page.innerHTML = `
      <div class="hstudy-head"><h1>Study Deck</h1><p>Every quiz question and interview prompt for Apache Hudi in one place. Filter by difficulty or source, search, and tap a card to reveal the answer.</p></div>
      <div class="hstudy-filters">
        <div class="hstudy-search"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg><input id="hstudy-q" type="text" placeholder="Search questions…" aria-label="Search questions" autocomplete="off" /></div>
        <select id="hstudy-diff" class="hstudy-select" aria-label="Filter by difficulty"><option value="">All levels</option><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="senior">Senior</option></select>
        <select id="hstudy-type" class="hstudy-select" aria-label="Filter by source"><option value="">All sources</option><option value="quiz">Quiz</option><option value="interview">Interview</option></select>
      </div>
      <div class="hstudy-count" id="hstudy-count"></div>
      <div id="hstudy-results"></div>`;
    container.appendChild(page);
    const qEl = page.querySelector('#hstudy-q'), dEl = page.querySelector('#hstudy-diff'), tEl = page.querySelector('#hstudy-type');
    const out = page.querySelector('#hstudy-results'), countEl = page.querySelector('#hstudy-count');
    function apply() {
      const q = qEl.value.trim().toLowerCase(), d = dEl.value, t = tEl.value;
      const filtered = all.filter(it => (!d || it.difficulty === d) && (!t || it.type === t) && (!q || (it.q + ' ' + it.a).toLowerCase().includes(q)));
      countEl.textContent = `${filtered.length} of ${all.length} questions`;
      if (!filtered.length) { out.innerHTML = `<div class="hstudy-empty">No questions match your filters.</div>`; return; }
      const groups = {};
      filtered.forEach(it => { (groups[it.group] = groups[it.group] || []).push(it); });
      out.innerHTML = Object.keys(groups).sort().map(g => `
        <div class="hstudy-group"><div class="hstudy-group__title">${esc(g)}</div>
          ${groups[g].map(it => `<div class="hstudy-card"><button class="hstudy-card__q" aria-expanded="false"><span class="hstudy-chip hstudy-chip--${it.difficulty}">${it.difficulty}</span><span class="hstudy-chip hstudy-chip--${it.type}">${it.type}</span><span style="flex:1">${esc(it.q)}</span></button><div class="hstudy-card__a" hidden>${esc(it.a)}</div></div>`).join('')}
        </div>`).join('');
      out.querySelectorAll('.hstudy-card__q').forEach(btn => btn.addEventListener('click', () => { const a = btn.nextElementSibling; const open = !a.hidden; a.hidden = open; btn.setAttribute('aria-expanded', String(!open)); }));
    }
    qEl.addEventListener('input', apply); dEl.addEventListener('change', apply); tEl.addEventListener('change', apply); apply();
  }

  TV.registerModule('hudi', {
    id: 'study', title: 'Study Deck', group: 'learn', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
