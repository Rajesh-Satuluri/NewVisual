/* ============================================================
   Cloud DE Visualizer — Cross-Cloud Design Challenges view (X3.10).

   Registers a "Design Challenges" list plus one page per
   challenge into the Cross-Cloud format. A challenge page shows
   the scenario + requirements, a radio group per decision, and a
   Submit that grades via TV.DesignChallengeEngine and reveals
   per-decision rationale, trade-offs and a reference architecture.

   Prefix: dc-. Reuses the mc-* theme tokens where possible.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV.DesignChallenges) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  const CLOUD_LABEL = { aws: 'AWS', azure: 'Azure / Fabric', databricks: 'Databricks' };

  function styleTag() {
    if (document.getElementById('dc-styles')) return '';
    return `
<style id="dc-styles">
.dc { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.dc-wrap { max-width:900px; margin:0 auto; }
.dc-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.dc-h1 { font-size:27px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.dc-intro { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:800px; }
.dc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
.dc-card { display:block; text-decoration:none; background:var(--bg-2); border:1px solid var(--border-default); border-radius:14px; padding:16px 18px; transition:border-color .12s, transform .12s, box-shadow .12s; }
.dc-card:hover { border-color:var(--brand); transform:translateY(-2px); box-shadow:var(--lift); text-decoration:none; }
.dc-card-top { display:flex; align-items:center; gap:8px; margin-bottom:9px; flex-wrap:wrap; }
.dc-diff { font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; border-radius:999px; background:var(--brand-glow); color:var(--brand); }
.dc-clouds { display:flex; gap:5px; flex-wrap:wrap; }
.dc-cloud-tag { font-size:10px; font-weight:700; color:var(--text-muted); background:var(--bg-4); padding:2px 7px; border-radius:999px; }
.dc-card-name { font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:6px; }
.dc-card-sc { font-size:13px; color:var(--text-secondary); line-height:1.55; }
.dc-card-meta { margin-top:10px; font-size:12px; color:var(--brand); font-weight:700; }
.dc-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--brand); text-decoration:none; margin-bottom:16px; }
.dc-back:hover { text-decoration:underline; }
.dc-scn { border:1px solid var(--border-default); border-left:3px solid var(--brand); border-radius:12px; padding:16px 18px; background:var(--brand-glow); margin:0 0 16px; }
.dc-scn p { font-size:14px; color:var(--text-primary); line-height:1.7; margin:0; }
.dc-req { background:var(--bg-2); border:1px solid var(--border-default); border-radius:12px; padding:14px 18px; margin-bottom:22px; }
.dc-req-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:9px; }
.dc-req ul { margin:0; padding-left:18px; }
.dc-req li { font-size:13px; color:var(--text-secondary); line-height:1.7; }
.dc-dec { border:1px solid var(--border-default); border-radius:14px; padding:16px 18px; margin-bottom:16px; background:var(--bg-2); }
.dc-dec-q { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 12px; display:flex; gap:9px; }
.dc-dec-n { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--brand); color:#07171a; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
.dc-opts { display:grid; gap:8px; }
.dc-opt { display:flex; gap:10px; align-items:flex-start; padding:11px 13px; border:1px solid var(--border-subtle); border-radius:10px; background:var(--bg-1); cursor:pointer; transition:border-color .12s, background .12s; }
.dc-opt:hover { border-color:var(--brand); }
.dc-opt input { margin-top:3px; flex-shrink:0; accent-color:var(--brand); }
.dc-opt-label { font-size:13px; color:var(--text-primary); line-height:1.55; }
.dc-opt.sel { border-color:var(--brand); background:var(--brand-glow); }
.dc-opt.correct { border-color:var(--green); background:var(--green-subtle); }
.dc-opt.wrong { border-color:#ef4444; background:color-mix(in srgb,#ef4444 12%,transparent); }
.dc-opt-rat { font-size:12px; line-height:1.6; margin-top:6px; color:var(--text-secondary); }
.dc-opt-rat.good { color:var(--green); }
.dc-opt-mark { font-size:11px; font-weight:800; margin-left:6px; }
.dc-submit { margin:8px 0 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.dc-btn { cursor:pointer; border:0; border-radius:10px; padding:11px 20px; font:inherit; font-size:14px; font-weight:800; color:#07171a; background:var(--brand); }
.dc-btn:hover { filter:brightness(1.07); }
.dc-btn[disabled] { opacity:.5; cursor:not-allowed; }
.dc-btn--ghost { background:var(--bg-2); color:var(--text-primary); border:1px solid var(--border-default); }
.dc-hint { font-size:12px; color:var(--text-muted); }
.dc-score { border:1px solid var(--border-default); border-radius:14px; padding:18px 20px; margin:0 0 20px; background:var(--bg-2); display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.dc-score-pct { font-size:34px; font-weight:800; }
.dc-score-pct.good { color:var(--green); } .dc-score-pct.mid { color:var(--yellow); } .dc-score-pct.low { color:#ef4444; }
.dc-score-txt { font-size:14px; color:var(--text-secondary); line-height:1.6; }
.dc-panel { border:1px solid var(--border-default); border-radius:14px; padding:16px 18px; margin-bottom:16px; background:var(--bg-2); }
.dc-panel-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:11px; }
.dc-panel--trade { border-left:3px solid var(--yellow); }
.dc-panel--ref { border-left:3px solid var(--green); }
.dc-panel ul { margin:0; padding-left:18px; }
.dc-panel li { font-size:13px; color:var(--text-secondary); line-height:1.7; }
.dc-arch { display:grid; gap:8px; }
.dc-arch-step { display:flex; gap:10px; align-items:flex-start; font-size:13px; color:var(--text-secondary); line-height:1.6; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; padding:9px 12px; }
.dc-arch-n { flex-shrink:0; width:18px; height:18px; border-radius:5px; background:var(--green); color:#07171a; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.dc-refs { display:flex; flex-wrap:wrap; gap:9px; }
.dc-ref { font-size:12px; color:var(--brand); text-decoration:none; border:1px solid var(--border-default); border-radius:8px; padding:6px 11px; }
.dc-ref:hover { border-color:var(--brand); text-decoration:none; }
</style>`;
  }

  /* ── List page ───────────────────────────────────────────── */
  function renderList(container) {
    container.className = '';
    const styles = styleTag();
    const cards = TV.DesignChallenges.all().map(c => `
      <a class="dc-card" href="#multi-cloud/dc-${esc(c.id)}">
        <div class="dc-card-top">
          <span class="dc-diff">${esc(c.difficulty)}</span>
          <span class="dc-clouds">${(c.clouds || []).map(cl => `<span class="dc-cloud-tag">${esc(CLOUD_LABEL[cl] || cl)}</span>`).join('')}</span>
        </div>
        <div class="dc-card-name">${esc(c.title)}</div>
        <div class="dc-card-sc">${esc(c.scenario)}</div>
        <div class="dc-card-meta">${(c.decisions || []).length} decision points →</div>
      </a>`).join('');
    container.innerHTML = `${styles}
<div class="dc page-enter">
  <div class="dc-wrap">
    <div class="dc-eyebrow">Cross-cloud system design</div>
    <h1 class="dc-h1">Design Challenges</h1>
    <p class="dc-intro">The open-ended "design a data platform for X" round, made concrete. Each challenge gives a scenario and hard requirements, then asks you to choose the right service at each decision point — and grades your picks with the reasoning behind every option, the trade-offs, and a reference architecture.</p>
    <div class="dc-grid">${cards}</div>
  </div>
</div>`;
  }

  /* ── Challenge page ──────────────────────────────────────── */
  function renderChallenge(container, c) {
    container.className = '';
    const styles = styleTag();
    const reqs = (c.requirements || []).map(r => `<li>${esc(r)}</li>`).join('');
    const decs = (c.decisions || []).map((d, i) => {
      const opts = d.options.map(o => `
        <label class="dc-opt" data-decision="${esc(d.id)}" data-opt="${esc(o.id)}">
          <input type="radio" name="dc-${esc(d.id)}" value="${esc(o.id)}" />
          <span class="dc-opt-wrap"><span class="dc-opt-label">${esc(o.label)}</span></span>
        </label>`).join('');
      return `
      <div class="dc-dec" data-decision="${esc(d.id)}">
        <p class="dc-dec-q"><span class="dc-dec-n">${i + 1}</span><span>${esc(d.question)}</span></p>
        <div class="dc-opts">${opts}</div>
      </div>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="dc page-enter">
  <div class="dc-wrap">
    <a class="dc-back" href="#multi-cloud/design-challenges">← All design challenges</a>
    <div class="dc-eyebrow">${esc(c.difficulty)} · ${(c.clouds || []).map(cl => esc(CLOUD_LABEL[cl] || cl)).join(' · ')}</div>
    <h1 class="dc-h1">${esc(c.title)}</h1>
    <div class="dc-scn"><p>${esc(c.scenario)}</p></div>
    <div class="dc-req"><div class="dc-req-h">Requirements</div><ul>${reqs}</ul></div>
    <div class="dc-result" id="dc-result"></div>
    <form id="dc-form">${decs}
      <div class="dc-submit">
        <button type="submit" class="dc-btn" id="dc-grade">Grade my design</button>
        <span class="dc-hint" id="dc-hint">Pick one option per decision.</span>
      </div>
    </form>
  </div>
</div>`;

    const form = container.querySelector('#dc-form');
    const hint = container.querySelector('#dc-hint');
    const resultEl = container.querySelector('#dc-result');
    let graded = false;

    // visual selection state
    form.addEventListener('change', (e) => {
      if (graded) return;
      const lbl = e.target.closest('.dc-opt');
      if (!lbl) return;
      form.querySelectorAll(`.dc-opt[data-decision="${lbl.dataset.decision}"]`).forEach(x => x.classList.remove('sel'));
      lbl.classList.add('sel');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (graded) return;
      const answers = {};
      (c.decisions || []).forEach(d => {
        const sel = form.querySelector(`input[name="dc-${d.id}"]:checked`);
        if (sel) answers[d.id] = sel.value;
      });
      if (Object.keys(answers).length < (c.decisions || []).length) {
        hint.textContent = 'Answer every decision before grading.';
        hint.style.color = 'var(--yellow)';
        return;
      }
      graded = true;
      const res = TV.DesignChallengeEngine.score(c, answers);
      reveal(container, c, res, answers);
      if (TV.Progress && TV.Progress.recordDesignChallenge) {
        try { TV.Progress.recordDesignChallenge(c.id, res.pct); } catch (_) {}
      }
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function reveal(container, c, res, answers) {
    // annotate each option
    (c.decisions || []).forEach(d => {
      const chosen = answers[d.id];
      d.options.forEach(o => {
        const lbl = container.querySelector(`.dc-opt[data-decision="${d.id}"][data-opt="${o.id}"]`);
        if (!lbl) return;
        lbl.querySelectorAll('input').forEach(inp => { inp.disabled = true; });
        lbl.classList.remove('sel');
        const picked = chosen === o.id;
        if (o.correct) lbl.classList.add('correct');
        else if (picked) lbl.classList.add('wrong');
        const mark = o.correct ? '<span class="dc-opt-mark" style="color:var(--green)">✓ best choice</span>'
                     : (picked ? '<span class="dc-opt-mark" style="color:#ef4444">your pick</span>' : '');
        const wrap = lbl.querySelector('.dc-opt-wrap');
        wrap.insertAdjacentHTML('beforeend', `${mark}<div class="dc-opt-rat${o.correct ? ' good' : ''}">${esc(o.rationale)}</div>`);
      });
    });
    // score + panels
    const cls = res.pct >= 80 ? 'good' : (res.pct >= 50 ? 'mid' : 'low');
    const trade = (c.tradeoffs || []).map(t => `<li>${esc(t)}</li>`).join('');
    const arch = (c.reference || []).map((s, i) => `<div class="dc-arch-step"><span class="dc-arch-n">${i + 1}</span><span>${esc(s)}</span></div>`).join('');
    const refs = (c.refs || []).map(r => `<a class="dc-ref" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)} ↗</a>`).join('');
    const resultEl = container.querySelector('#dc-result');
    resultEl.innerHTML = `
      <div class="dc-score">
        <div class="dc-score-pct ${cls}">${res.pct}%</div>
        <div class="dc-score-txt"><b>${res.correct} of ${res.total}</b> decisions matched the recommended design. Review the reasoning on each option below, then the trade-offs and reference architecture.</div>
      </div>
      <div class="dc-panel dc-panel--trade"><div class="dc-panel-h">Trade-offs & senior nuance</div><ul>${trade}</ul></div>
      <div class="dc-panel dc-panel--ref"><div class="dc-panel-h">Reference architecture</div><div class="dc-arch">${arch}</div></div>
      ${refs ? `<div class="dc-panel"><div class="dc-panel-h">Official references</div><div class="dc-refs">${refs}</div></div>` : ''}`;
  }

  /* ── Registration ────────────────────────────────────────── */
  function register() {
    TV.registerModule('multi-cloud', {
      id: 'design-challenges', title: 'Design Challenges', group: 'drills', format: 'multi-cloud',
      render(container) { renderList(container); },
      destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
    });
    TV.DesignChallenges.all().forEach(c => {
      TV.registerModule('multi-cloud', {
        id: 'dc-' + c.id, title: c.title, group: 'design', format: 'multi-cloud',
        render(container) { renderChallenge(container, c); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
    });
    // Inject a "Design Challenges" item into the Cross-Cloud nav (Interview Drills group).
    const desc = TV.formats && TV.formats['multi-cloud'];
    if (desc && Array.isArray(desc.navGroups)) {
      const item = { id: 'design-challenges', label: 'Design Challenges', icon: 'layout', available: true };
      const drills = desc.navGroups.find(g => g.id === 'drills');
      if (drills) { if (!drills.items.some(it => it.id === 'design-challenges')) drills.items.unshift(item); }
      else desc.navGroups.push({ id: 'drills', label: 'Interview Drills', items: [item] });
    }
  }

  TV.DesignChallengesView = { register };
  register();
})();
