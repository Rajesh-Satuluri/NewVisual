/* ============================================================
   Cloud DE Visualizer — Interview Questions renderer.
   Drives the topic-wise interview-question drill pages for any
   format. A format supplies a list of topics; each topic renders
   as one screen of collapsible Q -> reveal A accordions (the same
   .sd-iq visual language as the service pages, but self-contained
   so it never depends on the service renderer's styles being live).

   Data shape (per format):
     TV.<Fmt>InterviewQA = [
       { id, label, icon?, blurb?, questions:[ { q, a } ] }, ...
     ]

   Public API:
     TV.InterviewQA.register(format, topics)   // registers a module per topic
     TV.InterviewQA.navGroup(format, topics)   // -> one sidebar group (or null)
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  /* Only topics that actually carry questions are live. */
  function liveTopics(topics) {
    return (topics || []).filter(t => t && t.questions && t.questions.length);
  }

  function styleTag() {
    return `
<style id="iq-styles">
.iq { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.iq-wrap { max-width:920px; margin:0 auto; }
.iq-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.iq-h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; }
.iq-sub { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 18px; max-width:760px; }
.iq-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 16px; flex-wrap:wrap; }
.iq-count { font-size:12px; font-weight:700; color:var(--text-muted); }
.iq-count b { color:var(--brand); }
.iq-toggle { background:none; border:1px solid var(--border-default); color:var(--text-secondary); border-radius:8px;
  padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; transition:border-color .12s, color .12s; }
.iq-toggle:hover { border-color:var(--brand); color:var(--brand); }
.iq-list { display:grid; gap:8px; }
.iq-item { background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:10px; overflow:hidden; }
.iq-q { width:100%; display:flex; align-items:flex-start; gap:11px; padding:12px 15px; background:none; border:none; cursor:pointer; text-align:left; font:inherit; }
.iq-mark { flex-shrink:0; width:22px; height:22px; border-radius:6px; background:var(--brand); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
.iq-qtext { flex:1; font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.5; }
.iq-tags { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.iq-tag { font-size:11px; font-weight:700; letter-spacing:.02em; color:var(--text-muted);
  background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:5px; padding:2px 7px; line-height:1.5; }
.iq-chev { color:var(--text-muted); transition:transform .15s; flex-shrink:0; margin-top:2px; }
.iq-item.open .iq-chev { transform:rotate(180deg); }
.iq-a { display:grid; grid-template-rows:0fr; transition:grid-template-rows .2s var(--ease); }
.iq-item.open .iq-a { grid-template-rows:1fr; }
.iq-a > div { overflow:hidden; min-height:0; }
.iq-a p { margin:0; padding:0 15px 14px 48px; font-size:14px; color:var(--text-secondary); line-height:1.72; }
.iq-a .iq-ans-mark { display:inline-block; font-weight:800; color:var(--green); margin-right:6px; }
.iq-intu { background:linear-gradient(135deg, var(--brand-glow), transparent 70%); border:1px solid var(--border-default); border-left:3px solid var(--brand); border-radius:12px; padding:15px 17px; margin:0 0 18px; }
.iq-intu-head { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:10px; display:flex; align-items:center; gap:7px; }
.iq-intu-row { display:grid; grid-template-columns:96px 1fr; gap:12px; padding:5px 0; }
.iq-intu-row + .iq-intu-row { border-top:1px solid var(--border-subtle); }
.iq-intu-lbl { font-size:12px; font-weight:800; color:var(--text-muted); padding-top:2px; }
.iq-intu-val { font-size:14px; color:var(--text-secondary); line-height:1.65; }
@media (max-width:620px){ .iq-intu-row { grid-template-columns:1fr; gap:2px; } }
.iq-tag--senior, .iq-tag--architecture, .iq-tag--staff { color:var(--brand); border-color:var(--brand); }
.iq-tag--troubleshooting { color:var(--yellow,#d29922); border-color:var(--yellow,#d29922); }
.iq-extra-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); margin:0 0 6px; }
.iq-rubric, .iq-follow { margin:0 15px 12px 48px; background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:9px; padding:11px 13px; }
.iq-follow { border-left:3px solid var(--brand); }
.iq-rubric ul, .iq-follow ul { margin:0; padding-left:18px; }
.iq-rubric li, .iq-follow li { font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:3px; }
.iq-rate { display:flex; align-items:center; gap:8px; margin:0 15px 14px 48px; flex-wrap:wrap; }
.iq-rate-lbl { font-size:12px; font-weight:700; color:var(--text-muted); }
.iq-rate-btn { font:inherit; font-size:12px; font-weight:700; border:1px solid var(--border-default); background:none; color:var(--text-secondary); border-radius:20px; padding:4px 12px; cursor:pointer; }
.iq-rate-btn:hover { border-color:var(--brand); color:var(--brand); }
.iq-rate-btn.sel[data-rate="strong"] { background:var(--green,#3fb950); border-color:var(--green,#3fb950); color:#fff; }
.iq-rate-btn.sel[data-rate="partial"] { background:var(--yellow,#d29922); border-color:var(--yellow,#d29922); color:#fff; }
.iq-rate-btn.sel[data-rate="review"] { background:var(--red,#f85149); border-color:var(--red,#f85149); color:#fff; }
</style>`;
  }

  function intuitionHTML(topicId) {
    const intu = TV.Intuition && TV.Intuition['iq-' + topicId];
    if (!intu) return '';
    const row = (lbl, v) => v ? `<div class="iq-intu-row"><span class="iq-intu-lbl">${lbl}</span><span class="iq-intu-val">${esc(v)}</span></div>` : '';
    return `
      <section class="iq-intu" aria-label="Intuition">
        <div class="iq-intu-head"><span>💡</span>Intuition — why this matters</div>
        ${row('The pain', intu.pain)}${row('The “aha”', intu.aha)}${row('When it matters', intu.when)}
      </section>`;
  }

  function render(container, format, topic) {
    container.className = '';
    const styles = document.getElementById('iq-styles') ? '' : styleTag();
    const qs = topic.questions || [];
    const items = qs.map((x, i) => {
      const tagList = (x.tags || []).slice();
      if (x.level) tagList.unshift(x.level);
      const tags = tagList.length
        ? `<span class="iq-tags">${tagList.map(t => `<span class="iq-tag iq-tag--${esc(String(t).toLowerCase().replace(/[^a-z]/g, ''))}">${esc(t)}</span>`).join('')}</span>`
        : '';
      // Rubric: what a strong answer covers (self-assessment, not auto-graded)
      const rubric = (x.rubric && x.rubric.length)
        ? `<div class="iq-rubric"><div class="iq-extra-h">A strong answer covers</div><ul>${x.rubric.map(r => '<li>' + esc(r) + '</li>').join('')}</ul></div>`
        : '';
      // Adaptive follow-ups the interviewer will likely push on
      const follow = (x.followUps && x.followUps.length)
        ? `<div class="iq-follow"><div class="iq-extra-h">Interviewer follow-ups</div><ul>${x.followUps.map(f => '<li>' + esc(f) + '</li>').join('')}</ul></div>`
        : '';
      // Self-rating (persisted) — honest learner self-assessment, feeds the signal
      const rate = (x.rubric && x.rubric.length)
        ? `<div class="iq-rate" data-qi="${i}"><span class="iq-rate-lbl">Rate yourself:</span>
            <button class="iq-rate-btn" data-rate="strong">Nailed it</button>
            <button class="iq-rate-btn" data-rate="partial">Partly</button>
            <button class="iq-rate-btn" data-rate="review">Need review</button></div>`
        : '';
      return `
      <div class="iq-item" data-i="${i}">
        <button class="iq-q" type="button" aria-expanded="false">
          <span class="iq-mark">Q</span>
          <span class="iq-qtext">${esc(x.q)}${tags}</span>
          <span class="iq-chev">▾</span>
        </button>
        <div class="iq-a"><div><p><span class="iq-ans-mark">A</span>${esc(x.a)}</p>${rubric}${follow}${rate}</div></div>
      </div>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="iq page-enter">
  <div class="iq-wrap">
    <div class="iq-eyebrow">Interview Questions</div>
    <h1 class="iq-h1">${esc(topic.label)}</h1>
    ${topic.blurb ? `<p class="iq-sub">${esc(topic.blurb)}</p>` : ''}
    ${intuitionHTML(topic.id)}
    <div class="iq-bar">
      <div class="iq-count"><b>${qs.length}</b> question${qs.length === 1 ? '' : 's'} — tap to reveal a model answer</div>
      <button class="iq-toggle" type="button">Expand all</button>
    </div>
    <div class="iq-list">${items}</div>
  </div>
</div>`;

    container.querySelectorAll('.iq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.iq-item');
        const open = row.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    // Self-rating: persist per topic+question, restore on render, feed signal.
    const rateKey = (qi) => 'cde-iq-rate-' + format + '-' + topic.id + '-' + qi;
    container.querySelectorAll('.iq-rate').forEach(row => {
      const qi = row.getAttribute('data-qi');
      let saved = null;
      try { saved = TV.ls && TV.ls.get ? TV.ls.get(rateKey(qi)) : localStorage.getItem(rateKey(qi)); } catch (e) {}
      if (saved) { const b = row.querySelector('[data-rate="' + saved + '"]'); if (b) b.classList.add('sel'); }
      row.querySelectorAll('.iq-rate-btn').forEach(b => {
        b.addEventListener('click', () => {
          const val = b.getAttribute('data-rate');
          row.querySelectorAll('.iq-rate-btn').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
          try { if (TV.ls && TV.ls.set) TV.ls.set(rateKey(qi), val); else localStorage.setItem(rateKey(qi), val); } catch (e) {}
          if (TV.Progress && TV.Progress.recordInterviewSelfRate) {
            try { TV.Progress.recordInterviewSelfRate(format, topic.id, qi, val); } catch (e) {}
          }
        });
      });
    });
    const toggle = container.querySelector('.iq-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const rows = container.querySelectorAll('.iq-item');
        const anyClosed = Array.prototype.some.call(rows, r => !r.classList.contains('open'));
        rows.forEach(r => {
          r.classList.toggle('open', anyClosed);
          const b = r.querySelector('.iq-q');
          if (b) b.setAttribute('aria-expanded', String(anyClosed));
        });
        toggle.textContent = anyClosed ? 'Collapse all' : 'Expand all';
      });
    }
  }

  function screenId(topicId) { return 'iq-' + topicId; }

  function register(format, topics) {
    liveTopics(topics).forEach(topic => {
      TV.registerModule(format, {
        id: screenId(topic.id), title: topic.label, group: 'interview', format,
        render(container) { render(container, format, topic); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
    });
  }

  function navGroup(format, topics) {
    const live = liveTopics(topics);
    if (!live.length) return null;
    return {
      id: 'interview', label: 'Interview Questions',
      items: live.map(t => ({ id: screenId(t.id), label: t.label, icon: t.icon || 'help-circle', available: true })),
    };
  }

  TV.InterviewQA = { register, navGroup, screenId };
})();
