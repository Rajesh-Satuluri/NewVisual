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

  /* ── per-question edits (synced across devices via CDEVIZ.store) ──────────
     An override is { q?: plainText, a?: html } keyed by (format, topicId, qi).
     The same cloud sync that carries progress carries these, so an edit made
     on one device shows up on every device with the same sync code. */
  const C = () => window.CDEVIZ;
  function ovOf(fmt, tid, qi) {
    const s = C() && C().store;
    return (s && s.getIqEdit) ? s.getIqEdit(fmt, tid, qi) : null;
  }
  function isEdited(fmt, tid, qi) { return !!ovOf(fmt, tid, qi); }
  // Question text to show (plain): the user's edit if present, else original.
  function viewQ(x, fmt, tid, qi) { const o = ovOf(fmt, tid, qi); return (o && typeof o.q === 'string') ? o.q : x.q; }
  // Answer HTML to show: edited answers are rich HTML (raw); originals are
  // plain text (escaped).
  function answerHTML(x, fmt, tid, qi) {
    const o = ovOf(fmt, tid, qi);
    return (o && typeof o.a === 'string') ? o.a : esc(x.a);
  }
  function openSyncDialog() { const c = C(); if (c && c.openSyncDialog) c.openSyncDialog(); }
  function syncHintHtml() {
    const cl = C() && C().cloud;
    if (cl && cl.enabled && cl.enabled()) return 'Saved on this device and synced to your other devices (cloud sync is on).';
    return 'Saved on this device. <a href="#" class="iq-sync-cta">Turn on cloud sync</a> to carry your edits across devices.';
  }

  // Track the currently mounted drill so a cloud refresh (an edit arriving from
  // another device) can re-render it in place. Set in render().
  let _current = null;      // { container, format, topic }
  let _refreshHooked = false;

  /* ── answer-body sub-parts (shared by render + rebuild) ──────────────── */
  function rubricHTML(x) {
    return (x.rubric && x.rubric.length)
      ? `<div class="iq-rubric"><div class="iq-extra-h">A strong answer covers</div><ul>${x.rubric.map(r => '<li>' + esc(r) + '</li>').join('')}</ul></div>`
      : '';
  }
  function followHTML(x) {
    return (x.followUps && x.followUps.length)
      ? `<div class="iq-follow"><div class="iq-extra-h">Interviewer follow-ups</div><ul>${x.followUps.map(f => '<li>' + esc(f) + '</li>').join('')}</ul></div>`
      : '';
  }
  function rateHTML(x, i) {
    return (x.rubric && x.rubric.length)
      ? `<div class="iq-rate" data-qi="${i}"><span class="iq-rate-lbl">Rate yourself:</span>
          <button class="iq-rate-btn" data-rate="strong">Nailed it</button>
          <button class="iq-rate-btn" data-rate="partial">Partly</button>
          <button class="iq-rate-btn" data-rate="review">Need review</button></div>`
      : '';
  }
  // The read-only inner contents of an open answer (answer body + rubric +
  // follow-ups + self-rating).
  function answerInnerHTML(x, fmt, tid, qi, i) {
    return `<div class="iq-ans-body"><span class="iq-ans-mark">A</span><span class="iq-ans-html">${answerHTML(x, fmt, tid, qi)}</span></div>` +
      rubricHTML(x) + followHTML(x) + rateHTML(x, i);
  }

  // Self-rating: persist per topic+question, restore, feed the signal. Wired
  // for a scope (the whole list on render, or one item after an edit rebuild).
  function wireRate(scope, format, topicId) {
    const rateKey = (qi) => 'cde-iq-rate-' + format + '-' + topicId + '-' + qi;
    scope.querySelectorAll('.iq-rate').forEach(row => {
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
            try { TV.Progress.recordInterviewSelfRate(format, topicId, qi, val); } catch (e) {}
          }
        });
      });
    });
  }

  // Rebuild one item's read-only answer after an edit/reset, and refresh the
  // question text + "edited" badge, without re-rendering the whole list.
  function rebuildAnswer(item, x, fmt, tid, qi, i) {
    item.classList.remove('iq-editing');
    const wrap = item.querySelector('.iq-a > div');
    if (wrap) { wrap.innerHTML = answerInnerHTML(x, fmt, tid, qi, i); wireRate(wrap, fmt, tid); }
    const qt = item.querySelector('.iq-qtext');
    if (qt) qt.innerHTML = esc(viewQ(x, fmt, tid, qi)) + (qt.querySelector('.iq-tags') ? qt.querySelector('.iq-tags').outerHTML : '');
    const badge = item.querySelector('.iq-edited-badge');
    if (badge) badge.hidden = !isEdited(fmt, tid, qi);
  }

  // Swap an open answer for the in-place editor (question plain text + answer
  // rich HTML). Saving writes an override into the synced store.
  function enterEdit(item, x, fmt, tid, qi, i) {
    const wrap = item.querySelector('.iq-a > div');
    if (!wrap) return;
    item.classList.add('open', 'iq-editing');
    const btn = item.querySelector('.iq-q');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const ov = ovOf(fmt, tid, qi);
    const curQ = (ov && typeof ov.q === 'string') ? ov.q : x.q;
    const curA = (ov && typeof ov.a === 'string') ? ov.a : esc(x.a);
    wrap.innerHTML =
      `<div class="iq-editor">
        <label class="iqe-label">Question</label>
        <div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question"></div>
        <label class="iqe-label">Answer</label>
        <div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">${curA}</div>
        <div class="iqe-actions">
          <button type="button" class="iqe-btn iqe-save">Save</button>
          <button type="button" class="iqe-btn iqe-cancel">Cancel</button>
          <button type="button" class="iqe-btn iqe-reset"${ov ? '' : ' hidden'}>Reset to original</button>
        </div>
        <div class="iqe-hint">${syncHintHtml()}</div>
      </div>`;
    const qField = wrap.querySelector('.iqe-q');
    const aField = wrap.querySelector('.iqe-a');
    qField.textContent = curQ; // plain text (question renders escaped)
    const cta = wrap.querySelector('.iq-sync-cta');
    if (cta) cta.addEventListener('click', e => { e.preventDefault(); openSyncDialog(); });
    // Clicks inside the editor must not bubble to the .iq-q flip handler.
    wrap.querySelector('.iq-editor').addEventListener('click', e => e.stopPropagation());
    setTimeout(() => { try { qField.focus(); } catch (e) {} }, 0);

    const store = () => C() && C().store;
    const done = () => rebuildAnswer(item, x, fmt, tid, qi, i);

    wrap.querySelector('.iqe-save').addEventListener('click', () => {
      const nq = (qField.textContent || '').trim();
      const na = (aField.innerHTML || '').trim();
      const next = {};
      if (nq && nq !== (x.q || '').trim()) next.q = nq;
      if (na && na !== esc(x.a || '').trim()) next.a = na;
      const s = store();
      if (s && s.setIqEdit) s.setIqEdit(fmt, tid, qi, (next.q == null && next.a == null) ? null : next);
      done();
    });
    wrap.querySelector('.iqe-cancel').addEventListener('click', done);
    wrap.querySelector('.iqe-reset').addEventListener('click', () => {
      const s = store();
      if (s && s.clearIqEdit) s.clearIqEdit(fmt, tid, qi);
      done();
    });
    wrap.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); wrap.querySelector('.iqe-save').click(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    });
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

/* ── Edit controls (per-question) ───────────────────────────── */
.iq-edited-badge { flex-shrink:0; align-self:flex-start; margin-top:1px; font-size:10px; font-weight:800; letter-spacing:.03em;
  text-transform:uppercase; color:var(--brand); background:var(--brand-glow,rgba(79,140,255,.14)); border:1px solid var(--border-default);
  border-radius:5px; padding:2px 6px; line-height:1.4; }
.iq-edit-btn { flex-shrink:0; align-self:flex-start; margin-top:-1px; width:24px; height:24px; display:inline-flex; align-items:center;
  justify-content:center; border-radius:6px; border:1px solid transparent; background:none; color:var(--text-muted); font-size:13px;
  cursor:pointer; transition:border-color .12s, color .12s, background .12s; }
.iq-edit-btn:hover { border-color:var(--brand); color:var(--brand); background:var(--brand-glow,rgba(79,140,255,.1)); }
.iq-item.iq-editing { border-color:var(--brand); }
.iq-editor { margin:0 15px 14px 48px; display:grid; gap:7px; }
.iq-editor .iqe-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); }
.iq-editor .iqe-field { border:1px solid var(--border-default); border-radius:9px; padding:9px 11px; background:var(--bg-2);
  color:var(--text-primary); font-size:14px; line-height:1.65; min-height:1.6em; outline:none; }
.iq-editor .iqe-field:focus { border-color:var(--brand); }
.iq-editor .iqe-a { min-height:4.5em; }
.iq-editor .iqe-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:3px; }
.iq-editor .iqe-btn { font:inherit; font-size:12px; font-weight:700; border-radius:8px; padding:6px 13px; cursor:pointer;
  border:1px solid var(--border-default); background:var(--bg-1); color:var(--text-secondary); }
.iq-editor .iqe-save { background:var(--brand); border-color:var(--brand); color:#fff; }
.iq-editor .iqe-reset { color:#ff8a8a; border-color:rgba(255,138,138,.4); }
.iq-editor .iqe-hint { font-size:11.5px; color:var(--text-muted); line-height:1.5; }
.iq-editor .iqe-hint a { color:var(--brand); }

/* ── Rich answer typography (matches Kafka Study Hub answer specs) ──
   Original answers are plain text; EDITED answers are rich HTML and
   render with full typography below. Scoped to .iq-ans-html so the
   rest of the drill page is untouched. */
.iq-ans-html { display:inline; }
.iq-ans-html p { margin:0 0 10px; }
.iq-ans-html p:last-child { margin-bottom:0; }
.iq-ans-html code { font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace; font-size:12px; background:var(--bg-2);
  color:var(--brand); padding:1px 5px; border-radius:4px; word-break:break-word; }
.iq-ans-html pre { background:var(--bg-2); border:1px solid var(--border-default); border-radius:8px; padding:12px 14px;
  margin:10px 0; overflow-x:auto; line-height:1.55; }
.iq-ans-html pre code { background:none; color:var(--text-primary); padding:0; font-size:12.5px; }
.iq-ans-html h1,.iq-ans-html h2,.iq-ans-html h3,.iq-ans-html h4 { color:var(--text-primary); font-weight:700; line-height:1.3; margin:14px 0 7px; }
.iq-ans-html h1 { font-size:17px; } .iq-ans-html h2 { font-size:15.5px; } .iq-ans-html h3 { font-size:14px; }
.iq-ans-html h4 { font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); }
.iq-ans-html ul,.iq-ans-html ol { margin:8px 0; padding-left:22px; }
.iq-ans-html li { margin:4px 0; }
.iq-ans-html table { width:100%; border-collapse:collapse; margin:10px 0; font-size:12.5px; }
.iq-ans-html th,.iq-ans-html td { border:1px solid var(--border-default); padding:6px 9px; text-align:left; vertical-align:top; }
.iq-ans-html th { background:var(--bg-2); font-weight:700; color:var(--text-primary); }
.iq-ans-html tbody tr:nth-child(even) { background:var(--bg-2); }
.iq-ans-html blockquote { margin:10px 0; padding:4px 13px; border-left:3px solid var(--brand); color:var(--text-secondary); }
.iq-ans-html a { color:var(--brand); }
.iq-ans-html strong,.iq-ans-html b { font-weight:600; color:var(--text-primary); }
.iq-ans-html hr { border:none; border-top:1px solid var(--border-default); margin:12px 0; }
.iq-ans-html kbd { font-family:ui-monospace,Menlo,monospace; font-size:11px; background:var(--bg-2); border:1px solid var(--border-default);
  border-bottom-width:2px; border-radius:5px; padding:1px 6px; }
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
    const tid = topic.id;
    const items = qs.map((x, i) => {
      const tagList = (x.tags || []).slice();
      if (x.level) tagList.unshift(x.level);
      const tags = tagList.length
        ? `<span class="iq-tags">${tagList.map(t => `<span class="iq-tag iq-tag--${esc(String(t).toLowerCase().replace(/[^a-z]/g, ''))}">${esc(t)}</span>`).join('')}</span>`
        : '';
      const edited = isEdited(format, tid, i);
      return `
      <div class="iq-item" data-i="${i}">
        <button class="iq-q" type="button" aria-expanded="false">
          <span class="iq-mark">Q</span>
          <span class="iq-qtext">${esc(viewQ(x, format, tid, i))}${tags}</span>
          <span class="iq-edited-badge"${edited ? '' : ' hidden'} title="You edited this question">edited</span>
          <span class="iq-edit-btn" role="button" tabindex="0" aria-label="Edit this question" title="Edit this question">✎</span>
          <span class="iq-chev">▾</span>
        </button>
        <div class="iq-a"><div>${answerInnerHTML(x, format, tid, i, i)}</div></div>
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
      <div class="iq-count"><b>${qs.length}</b> question${qs.length === 1 ? '' : 's'} — tap to reveal a model answer · ✎ to edit</div>
      <button class="iq-toggle" type="button">Expand all</button>
    </div>
    <div class="iq-list">${items}</div>
  </div>
</div>`;

    _current = { container: container, format: format, topic: topic };

    container.querySelectorAll('.iq-item').forEach(item => {
      const i = +item.getAttribute('data-i');
      const x = qs[i];
      const btn = item.querySelector('.iq-q');
      btn.addEventListener('click', ev => {
        if (ev.target.closest('.iq-edit-btn')) return;       // edit handled below
        if (item.classList.contains('iq-editing')) return;   // don't collapse mid-edit
        const open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
      });
      const editBtn = item.querySelector('.iq-edit-btn');
      if (editBtn) {
        const startEdit = ev => {
          ev.stopPropagation();
          ev.preventDefault();
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          enterEdit(item, x, format, tid, i, i);
        };
        editBtn.addEventListener('click', startEdit);
        editBtn.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') startEdit(ev); });
      }
    });

    // Self-rating: persist per topic+question, restore on render, feed signal.
    wireRate(container, format, tid);

    // Re-render in place when an edit arrives from another device (or the cloud
    // pull adopts one). Registered once; no-ops unless this drill is mounted and
    // nobody is mid-edit here.
    if (!_refreshHooked) {
      _refreshHooked = true;
      window.addEventListener('cde:cloud-refresh', () => {
        if (_current && _current.container && document.body.contains(_current.container) &&
            !_current.container.querySelector('.iq-editing')) {
          render(_current.container, _current.format, _current.topic);
        }
      });
    }

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
