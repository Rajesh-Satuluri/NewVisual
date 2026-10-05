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
.iq-sub { font-size:14.5px; color:var(--text-secondary); line-height:1.7; margin:0 0 18px; max-width:760px; }
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
.iq-tag { font-size:10.5px; font-weight:700; letter-spacing:.02em; color:var(--text-muted);
  background:var(--bg-2); border:1px solid var(--border-subtle); border-radius:5px; padding:2px 7px; line-height:1.5; }
.iq-chev { color:var(--text-muted); transition:transform .15s; flex-shrink:0; margin-top:2px; }
.iq-item.open .iq-chev { transform:rotate(180deg); }
.iq-a { display:grid; grid-template-rows:0fr; transition:grid-template-rows .2s var(--ease); }
.iq-item.open .iq-a { grid-template-rows:1fr; }
.iq-a > div { overflow:hidden; min-height:0; }
.iq-a p { margin:0; padding:0 15px 14px 48px; font-size:13.5px; color:var(--text-secondary); line-height:1.72; }
.iq-a .iq-ans-mark { display:inline-block; font-weight:800; color:var(--green); margin-right:6px; }
</style>`;
  }

  function render(container, format, topic) {
    container.className = '';
    const styles = document.getElementById('iq-styles') ? '' : styleTag();
    const qs = topic.questions || [];
    const items = qs.map((x, i) => {
      const tags = (x.tags && x.tags.length)
        ? `<span class="iq-tags">${x.tags.map(t => `<span class="iq-tag">${esc(t)}</span>`).join('')}</span>`
        : '';
      return `
      <div class="iq-item" data-i="${i}">
        <button class="iq-q" type="button" aria-expanded="false">
          <span class="iq-mark">Q</span>
          <span class="iq-qtext">${esc(x.q)}${tags}</span>
          <span class="iq-chev">▾</span>
        </button>
        <div class="iq-a"><div><p><span class="iq-ans-mark">A</span>${esc(x.a)}</p></div></div>
      </div>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="iq page-enter">
  <div class="iq-wrap">
    <div class="iq-eyebrow">Interview Questions</div>
    <h1 class="iq-h1">${esc(topic.label)}</h1>
    ${topic.blurb ? `<p class="iq-sub">${esc(topic.blurb)}</p>` : ''}
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
