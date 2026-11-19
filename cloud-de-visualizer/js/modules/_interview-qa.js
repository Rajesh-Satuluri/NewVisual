/* ============================================================
   Cloud DE Visualizer — Interview Questions renderer.
   Drives the topic-wise interview-question drill pages for any
   format. A format supplies a list of topics; each topic renders
   as one screen of collapsible Q -> reveal A accordions.

   The question / answer / edit rendering mirrors the Kafka Study
   Hub exactly (same .iq-item / .iq-question / .q-num / .diff-badge
   / .q-chevron card, the grid-animated .iq-answer-wrap/.iq-answer,
   the same rich answer typography and the same .iqe-editor with a
   Markdown toggle), mapped to this tool's theme tokens.

   Per-question edits are stored via CDEVIZ.store and travel across
   devices through the shared cloud-sync bundle.

   Public API:
     TV.InterviewQA.register(format, topics)
     TV.InterviewQA.navGroup(format, topics)
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  /* ── per-question edits (synced across devices via CDEVIZ.store) ──────────
     An override is { q?: plainText, a?: html } keyed by (format, topicId, qi). */
  const C = () => window.CDEVIZ;
  function ovOf(fmt, tid, qi) {
    const s = C() && C().store;
    return (s && s.getIqEdit) ? s.getIqEdit(fmt, tid, qi) : null;
  }
  function isEdited(fmt, tid, qi) { return !!ovOf(fmt, tid, qi); }
  function viewQ(x, fmt, tid, qi) { const o = ovOf(fmt, tid, qi); return (o && typeof o.q === 'string') ? o.q : x.q; }
  // Base (unedited) answer, as the HTML the editor/display start from: original
  // plain-text answers are wrapped in a <p> so they get the same paragraph
  // rhythm as Kafka's markdown-rendered answers.
  function baseAnswerHTML(x) { return '<p>' + esc(x.a) + '</p>'; }
  function answerHTML(x, fmt, tid, qi) {
    const o = ovOf(fmt, tid, qi);
    return (o && typeof o.a === 'string') ? o.a : baseAnswerHTML(x);
  }
  function openSyncDialog() { const c = C(); if (c && c.openSyncDialog) c.openSyncDialog(); }
  function syncHintHtml() {
    const cl = C() && C().cloud;
    if (cl && cl.enabled && cl.enabled()) return 'Saved on this device and synced to your other devices (cloud sync is on).';
    return 'Saved on this device. <a href="#" class="iqe-synccta">Turn on cloud sync</a> to carry your edits across devices.';
  }

  /* ── compact Markdown → HTML (mirrors Kafka's md.js feature set) ──────────
     Headings, fenced + inline code, bold/italic/strike, links, blockquotes,
     hr, ordered/unordered lists and pipe tables. Block-level HTML is escaped
     first, so pasted Markdown renders as formatted text (never raw tags). */
  function renderMarkdown(src) {
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    const codeStore = [];
    // pull fenced code first so its content isn't touched by inline rules
    src = src.replace(/```([^\n]*)\n([\s\S]*?)```/g, (m, lang, body) => {
      const i = codeStore.length;
      codeStore.push('<pre><code>' + esc(body.replace(/\n$/, '')) + '</code></pre>');
      return '\u0000CODE' + i + '\u0000';
    });
    const inline = t => esc(t)
      .replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const lines = src.split('\n');
    let html = '', i = 0;
    const flushPara = buf => { if (buf.length) html += '<p>' + inline(buf.join(' ')) + '</p>'; buf.length = 0; };
    let para = [];
    while (i < lines.length) {
      let ln = lines[i];
      const code = ln.match(/^\u0000CODE(\d+)\u0000$/);
      if (code) { flushPara(para); html += codeStore[+code[1]]; i++; continue; }
      if (/^\s*$/.test(ln)) { flushPara(para); i++; continue; }
      let h = ln.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(para); html += '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'; i++; continue; }
      if (/^\s*([-*_])\1\1+\s*$/.test(ln)) { flushPara(para); html += '<hr>'; i++; continue; }
      if (/^\s*>\s?/.test(ln)) {
        flushPara(para); const q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        html += '<blockquote>' + inline(q.join(' ')) + '</blockquote>'; continue;
      }
      // table: header row + |---| separator
      if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        flushPara(para);
        const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
        const head = cells(ln); i += 2;
        let t = '<table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>';
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          t += '<tr>' + cells(lines[i]).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>'; i++;
        }
        html += t + '</tbody></table>'; continue;
      }
      const ul = /^\s*[-*+]\s+/.test(ln), ol = /^\s*\d+\.\s+/.test(ln);
      if (ul || ol) {
        flushPara(para); const tag = ul ? 'ul' : 'ol'; let list = '<' + tag + '>';
        const re = ul ? /^\s*[-*+]\s+/ : /^\s*\d+\.\s+/;
        while (i < lines.length && re.test(lines[i])) { list += '<li>' + inline(lines[i].replace(re, '')) + '</li>'; i++; }
        html += list + '</' + tag + '>'; continue;
      }
      para.push(ln); i++;
    }
    flushPara(para);
    return html;
  }

  // Track the currently mounted drill so a cloud refresh can re-render it.
  let _current = null;
  let _refreshHooked = false;

  /* ── answer sub-parts (rendered inside Kafka's .iq-answer) ─────────────── */
  function tipHTML(x) { return x.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${esc(x.tip)}</div>` : ''; }
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
  function tagsHTML(x) {
    const extra = (x.tags || []).filter(Boolean);
    if (!extra.length) return '';
    return `<div class="iq-ans-tags">${extra.map(t => '<span class="iq-ans-tag">' + esc(t) + '</span>').join('')}</div>`;
  }
  // The read-only inner contents of an open answer: the rich answer HTML (Kafka
  // typography applies directly on .iq-answer children) + tip + extras.
  function answerInnerHTML(x, fmt, tid, qi, i) {
    return answerHTML(x, fmt, tid, qi) + tipHTML(x) + rubricHTML(x) + followHTML(x) + rateHTML(x, i) + tagsHTML(x);
  }

  // The level/difficulty pill shown on the question row (Kafka's .diff-badge).
  function diffBadge(x) {
    const d = String(x.difficulty || '').toLowerCase();
    if (d === 'easy' || d === 'medium' || d === 'hard') return `<span class="diff-badge diff-${d}">${esc(x.difficulty)}</span>`;
    if (x.level) return `<span class="diff-badge diff-lvl">${esc(x.level)}</span>`;
    return '';
  }

  function wireRate(scope, format, topicId) {
    const rateKey = (qi) => 'cde-iq-rate-' + format + '-' + topicId + '-' + qi;
    scope.querySelectorAll('.iq-rate').forEach(row => {
      const qi = row.getAttribute('data-qi');
      let saved = null;
      try { saved = TV.ls && TV.ls.get ? TV.ls.get(rateKey(qi)) : localStorage.getItem(rateKey(qi)); } catch (e) {}
      if (saved) { const b = row.querySelector('[data-rate="' + saved + '"]'); if (b) b.classList.add('sel'); }
      row.querySelectorAll('.iq-rate-btn').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
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

  // Rebuild one item's read-only answer after Save/Reset, and refresh the
  // question text, "edited" badge and class — without a full list re-render.
  function rebuildAnswer(item, x, fmt, tid, qi, i) {
    item.classList.remove('iqe-editing');
    const ae = item.querySelector('.iq-answer');
    if (ae) { ae.innerHTML = answerInnerHTML(x, fmt, tid, qi, i); wireRate(ae, fmt, tid); }
    const qt = item.querySelector('.iq-question .q-text');
    if (qt) qt.innerHTML = esc(viewQ(x, fmt, tid, qi));
    const badge = item.querySelector('.iqe-badge');
    if (badge) badge.hidden = !isEdited(fmt, tid, qi);
    item.classList.toggle('iqe-edited', isEdited(fmt, tid, qi));
  }

  // In-place editor mirroring Kafka's: question (plain) + answer (rich HTML),
  // a Markdown toggle, Save / Cancel / Reset, and a sync hint.
  function enterEdit(item, x, fmt, tid, qi, i) {
    const ae = item.querySelector('.iq-answer');
    if (!ae) return;
    item.classList.add('open', 'iqe-editing');
    const ov = ovOf(fmt, tid, qi);
    const curQ = (ov && typeof ov.q === 'string') ? ov.q : x.q;
    const baseA = baseAnswerHTML(x);
    const curA = (ov && typeof ov.a === 'string') ? ov.a : baseA;
    ae.innerHTML = `
      <div class="iqe-editor">
        <label class="iqe-label">Question</label>
        <div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question"></div>
        <label class="iqe-label">
          Answer
          <span class="iqe-md-toggle" title="Tick if you pasted Markdown (**bold**, lists, tables, \`code\`)">
            <input type="checkbox" class="iqe-md"> Markdown
          </span>
        </label>
        <div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">${curA}</div>
        <div class="iqe-md-note" hidden>Editing as Markdown — <code>**bold**</code>, <code>- lists</code>, <code>| tables |</code>, <code>\`code\`</code>. It renders on Save.</div>
        <div class="iqe-actions">
          <button type="button" class="iqe-btn iqe-save">Save</button>
          <button type="button" class="iqe-btn iqe-cancel">Cancel</button>
          <button type="button" class="iqe-btn iqe-reset"${ov ? '' : ' hidden'}>Reset to original</button>
        </div>
        <div class="iqe-hint">${syncHintHtml()}</div>
      </div>`;
    const qField = ae.querySelector('.iqe-q');
    const aField = ae.querySelector('.iqe-a');
    const mdToggle = ae.querySelector('.iqe-md');
    const mdNote = ae.querySelector('.iqe-md-note');
    qField.textContent = curQ; // plain text (question renders escaped)
    const cta = ae.querySelector('.iqe-synccta');
    if (cta) cta.addEventListener('click', e => { e.preventDefault(); openSyncDialog(); });
    ae.querySelector('.iqe-editor').addEventListener('click', e => e.stopPropagation());
    setTimeout(() => { try { qField.focus(); } catch (e) {} }, 0);

    mdToggle.addEventListener('change', () => {
      if (mdToggle.checked) { aField.textContent = aField.innerText; aField.classList.add('iqe-a-md'); }
      else { aField.classList.remove('iqe-a-md'); }
      if (mdNote) mdNote.hidden = !mdToggle.checked;
    });

    const store = () => C() && C().store;
    const done = () => rebuildAnswer(item, x, fmt, tid, qi, i);

    ae.querySelector('.iqe-save').addEventListener('click', () => {
      const nq = (qField.textContent || '').trim();
      const na = (mdToggle.checked ? renderMarkdown(aField.innerText || '') : (aField.innerHTML || '')).trim();
      const next = {};
      if (nq && nq !== (x.q || '').trim()) next.q = nq;
      if (na && na !== baseA.trim()) next.a = na;
      const s = store();
      if (s && s.setIqEdit) s.setIqEdit(fmt, tid, qi, (next.q == null && next.a == null) ? null : next);
      done();
    });
    ae.querySelector('.iqe-cancel').addEventListener('click', done);
    ae.querySelector('.iqe-reset').addEventListener('click', () => {
      const s = store();
      if (s && s.clearIqEdit) s.clearIqEdit(fmt, tid, qi);
      done();
    });
    ae.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ae.querySelector('.iqe-save').click(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    });
  }

  function liveTopics(topics) {
    return (topics || []).filter(t => t && t.questions && t.questions.length);
  }

  /* CSS mirrors the Kafka Study Hub (styles.css + enhancements.css), mapped to
     this tool's tokens:  --bg→--bg-0, --bg2→--bg-1, --bg3→--bg-2,
     --border→--border-default, --text→--text-primary, --text2→--text-secondary,
     --text3→--text-muted, --accent→--brand, --accent2→--brand-strong,
     --accent-lo→--brand-glow. */
  function styleTag() {
    return `
.iq { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.iq-wrap { max-width:920px; margin:0 auto; }
.iq-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.iq-h1 { font-size:28px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 6px; line-height:1.2; }
.iq-sub { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 18px; max-width:760px; }
.iq-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 16px; flex-wrap:wrap; }
.iq-count { font-size:12px; font-weight:700; color:var(--text-muted); }
.iq-count b { color:var(--brand); }
.iq-toggle { background:none; border:1px solid var(--border-default); color:var(--text-secondary); border-radius:8px;
  padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; transition:border-color .12s, color .12s; }
.iq-toggle:hover { border-color:var(--brand); color:var(--brand); }

/* ── IQ cards (Kafka Study Hub) ─────────────────────────────── */
.iq-list { display:flex; flex-direction:column; gap:10px; }
.iq-item { background:var(--bg-1); border:1px solid var(--border-default); border-radius:10px; overflow:hidden; }
.iqe-edited .iq-question { border-left:2px solid var(--brand); }
.iq-question { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; cursor:pointer; transition:background .15s; user-select:none; }
.iq-question:hover { background:var(--bg-2); }
.q-num { font-size:10px; font-weight:800; color:var(--brand); background:var(--brand-glow); border-radius:4px; padding:2px 6px; flex-shrink:0; margin-top:1px; font-family:monospace; }
.q-text { flex:1; font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.5; }
.diff-badge { flex-shrink:0; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:999px; align-self:center; }
.diff-easy   { color:var(--green);  background:rgba(16,185,129,.15); }
.diff-medium { color:var(--yellow); background:rgba(245,158,11,.15); }
.diff-hard   { color:var(--red);    background:rgba(239,68,68,.15); }
.diff-lvl    { color:var(--brand);  background:var(--brand-glow); }
.iqe-tools { display:inline-flex; align-items:center; gap:6px; flex-shrink:0; }
.iqe-badge { font-size:10px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--brand);
  background:var(--brand-glow); border:1px solid var(--border-default); padding:2px 7px; border-radius:999px; }
.iqe-edit { cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-secondary);
  border-radius:7px; width:26px; height:26px; line-height:1; font-size:13px; display:inline-flex; align-items:center;
  justify-content:center; transition:border-color .12s, color .12s, background .12s; flex-shrink:0; }
.iqe-edit:hover { border-color:var(--brand); color:var(--brand); }
.q-chevron { font-size:11px; color:var(--text-muted); margin-left:4px; flex-shrink:0; align-self:center;
  transition:transform .34s cubic-bezier(.33,1,.68,1); }
.iq-item.open .q-chevron { transform:rotate(180deg); }

/* Smooth grid expand/collapse (0fr → 1fr) */
.iq-answer-wrap { display:grid; grid-template-rows:0fr; transition:grid-template-rows .36s cubic-bezier(.33,1,.68,1); }
.iq-item.open .iq-answer-wrap { grid-template-rows:1fr; }
.iq-answer { min-height:0; overflow:hidden; padding:0 16px; font-size:13px; color:var(--text-secondary); line-height:1.7;
  border-top:1px solid transparent; opacity:0;
  transition:opacity .22s ease, padding .36s cubic-bezier(.33,1,.68,1), border-color .3s ease; }
.iq-item.open .iq-answer { padding:12px 16px 14px; border-top-color:var(--border-default); opacity:1;
  transition:opacity .3s ease .08s, padding .36s cubic-bezier(.33,1,.68,1), border-color .3s ease; }
@media (prefers-reduced-motion: reduce) { .iq-answer-wrap, .iq-answer, .q-chevron { transition:none; } }

/* ── Answer rich typography (Kafka specs) ───────────────────── */
.iq-answer > *:first-child { margin-top:0; }
.iq-answer > *:last-child { margin-bottom:0; }
.iq-answer p { margin:0 0 10px; }
.iq-answer strong, .iq-answer b { color:var(--text-primary); font-weight:600; }
.iq-answer em { font-style:italic; }
.iq-answer del { opacity:.6; }
.iq-answer a { color:var(--brand); text-decoration:none; border-bottom:1px solid transparent; }
.iq-answer a:hover { border-bottom-color:currentColor; }
.iq-answer code { font-family:'SF Mono',ui-monospace,monospace; font-size:12px; background:var(--bg-2); color:var(--brand);
  padding:1px 5px; border-radius:4px; word-break:break-word; }
.iq-answer pre { background:var(--bg-0); border:1px solid var(--border-default); border-radius:8px; padding:12px 14px;
  margin:0 0 12px; overflow-x:auto; line-height:1.55; }
.iq-answer pre code { background:none; color:var(--text-primary); padding:0; font-size:12px; display:block; white-space:pre; }
.iq-answer h1, .iq-answer h2, .iq-answer h3, .iq-answer h4 { color:var(--text-primary); font-weight:700; line-height:1.3; margin:16px 0 8px; }
.iq-answer h1, .iq-answer h2 { font-size:15px; }
.iq-answer h3 { font-size:14px; }
.iq-answer h4 { font-size:13px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.03em; }
.iq-answer ul, .iq-answer ol { margin:0 0 12px; padding-left:22px; }
.iq-answer ul { list-style:disc outside; }
.iq-answer ol { list-style:decimal outside; }
.iq-answer li { margin:4px 0; }
.iq-answer li > ul, .iq-answer li > ol { margin:4px 0; }
.iq-answer blockquote { margin:0 0 12px; padding:8px 14px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; color:var(--text-secondary); }
.iq-answer hr { border:none; border-top:1px solid var(--border-default); margin:14px 0; }
.iq-answer table { width:100%; border-collapse:collapse; margin:0 0 12px; font-size:12px; }
.iq-answer th, .iq-answer td { border:1px solid var(--border-default); padding:7px 10px; text-align:left; vertical-align:top; }
.iq-answer th { background:var(--bg-2); color:var(--text-primary); font-weight:600; }
.iq-answer tbody tr:nth-child(even) td { background:rgba(148,163,184,.06); }
.iq-answer kbd { font-family:'SF Mono',ui-monospace,monospace; font-size:11px; background:var(--bg-2); border:1px solid var(--border-default);
  border-bottom-width:2px; border-radius:4px; padding:1px 5px; color:var(--text-primary); }

/* ── Answer extras (tip / rubric / follow-ups / self-rate / tags) ── */
.iq-answer .tip { margin:10px 0 0; padding:10px 13px; background:var(--brand-glow); border:1px solid var(--border-default);
  border-left:3px solid var(--brand); border-radius:0 8px 8px 0; color:var(--text-secondary); font-size:12.5px; }
.iq-answer .tip strong { color:var(--text-primary); }
.iq-extra-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); margin:0 0 6px; }
.iq-rubric, .iq-follow { margin:12px 0 0; background:var(--bg-2); border:1px solid var(--border-default); border-radius:9px; padding:11px 13px; }
.iq-follow { border-left:3px solid var(--brand); }
.iq-rubric ul, .iq-follow ul { margin:0; padding-left:18px; }
.iq-rubric li, .iq-follow li { font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin-bottom:3px; }
.iq-rate { display:flex; align-items:center; gap:8px; margin:12px 0 0; flex-wrap:wrap; }
.iq-rate-lbl { font-size:12px; font-weight:700; color:var(--text-muted); }
.iq-rate-btn { font:inherit; font-size:12px; font-weight:700; border:1px solid var(--border-default); background:none; color:var(--text-secondary); border-radius:999px; padding:4px 12px; cursor:pointer; }
.iq-rate-btn:hover { border-color:var(--brand); color:var(--brand); }
.iq-rate-btn.sel[data-rate="strong"] { background:var(--green); border-color:var(--green); color:#fff; }
.iq-rate-btn.sel[data-rate="partial"] { background:var(--yellow); border-color:var(--yellow); color:#201600; }
.iq-rate-btn.sel[data-rate="review"] { background:var(--red); border-color:var(--red); color:#fff; }
.iq-ans-tags { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 0; }
.iq-ans-tag { font-size:11px; font-weight:700; letter-spacing:.02em; color:var(--text-muted); background:var(--bg-2);
  border:1px solid var(--border-default); border-radius:5px; padding:2px 8px; }

/* ── In-place editor (Kafka .iqe-editor) ────────────────────── */
.iqe-editor { display:flex; flex-direction:column; gap:6px; }
.iqe-label { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; display:flex; align-items:center; gap:8px; }
.iqe-md-toggle { margin-left:auto; display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:600; color:var(--text-secondary); text-transform:none; letter-spacing:0; cursor:pointer; user-select:none; }
.iqe-md-toggle input { accent-color:var(--brand); cursor:pointer; margin:0; }
.iqe-md-note { font-size:11px; color:var(--text-muted); margin:-2px 0 2px; }
.iqe-md-note code { background:var(--bg-2); color:var(--brand); padding:0 4px; border-radius:3px; font-size:10.5px; }
.iqe-field { border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-primary); border-radius:9px;
  padding:10px 12px; line-height:1.55; font:inherit; min-height:2.2em; outline:none; }
.iqe-field:focus { border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-glow); }
.iqe-field.iqe-a { min-height:4em; }
.iqe-field.iqe-a-md { font-family:'SF Mono', ui-monospace, monospace; font-size:12.5px; white-space:pre-wrap; word-break:break-word; }
.iqe-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.iqe-btn { cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-primary); border-radius:8px; padding:7px 13px; font:600 12.5px/1 inherit; transition:border-color .12s, background .12s; }
.iqe-btn:hover { border-color:var(--brand); }
.iqe-save { background:var(--brand); color:#fff; border-color:var(--brand); }
.iqe-save:hover { filter:brightness(1.07); }
.iqe-reset { color:var(--red); }
.iqe-reset:hover { border-color:var(--red); background:rgba(239,68,68,.1); }
.iqe-hint { font-size:11px; color:var(--text-muted); margin-top:2px; }
.iqe-synccta { background:none; border:none; padding:0; font:inherit; cursor:pointer; color:var(--brand); font-weight:600; text-decoration:underline; }
.iqe-synccta:hover { opacity:.8; }

/* ── Intuition callout ──────────────────────────────────────── */
.iq-intu { background:linear-gradient(135deg, var(--brand-glow), transparent 70%); border:1px solid var(--border-default); border-left:3px solid var(--brand); border-radius:12px; padding:15px 17px; margin:0 0 18px; }
.iq-intu-head { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--brand); margin-bottom:10px; display:flex; align-items:center; gap:7px; }
.iq-intu-row { display:grid; grid-template-columns:96px 1fr; gap:12px; padding:5px 0; }
.iq-intu-row + .iq-intu-row { border-top:1px solid var(--border-default); }
.iq-intu-lbl { font-size:12px; font-weight:800; color:var(--text-muted); padding-top:2px; }
.iq-intu-val { font-size:14px; color:var(--text-secondary); line-height:1.65; }
@media (max-width:620px){ .iq-intu-row { grid-template-columns:1fr; gap:2px; } }
`;
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
    // Inject the stylesheet into <head> ONCE — never inside the container, so a
    // re-render (e.g. a cloud-sync refresh overwriting innerHTML) never strips it.
    if (!document.getElementById('iq-styles')) {
      const st = document.createElement('style');
      st.id = 'iq-styles';
      st.textContent = styleTag();
      (document.head || document.documentElement).appendChild(st);
    }
    const qs = topic.questions || [];
    const tid = topic.id;
    const items = qs.map((x, i) => {
      const edited = isEdited(format, tid, i);
      return `
      <div class="iq-item${edited ? ' iqe-edited' : ''}" data-i="${i}">
        <div class="iq-question">
          <span class="q-num">${pad2(i + 1)}</span>
          <span class="q-text">${esc(viewQ(x, format, tid, i))}</span>
          ${diffBadge(x)}
          <span class="iqe-tools">
            <span class="iqe-badge"${edited ? '' : ' hidden'} title="You have edited this question">edited</span>
            <button type="button" class="iqe-edit" aria-label="Edit this question">✎</button>
          </span>
          <span class="q-chevron">▼</span>
        </div>
        <div class="iq-answer-wrap"><div class="iq-answer">${answerInnerHTML(x, format, tid, i, i)}</div></div>
      </div>`;
    }).join('');
    container.innerHTML = `<div class="iq page-enter">
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
      const qEl = item.querySelector('.iq-question');
      qEl.addEventListener('click', ev => {
        if (ev.target.closest('.iqe-tools') || ev.target.closest('a')) return;
        if (item.classList.contains('iqe-editing')) return;
        item.classList.toggle('open');
      });
      const editBtn = item.querySelector('.iqe-edit');
      if (editBtn) editBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        item.classList.add('open');
        enterEdit(item, x, format, tid, i, i);
      });
    });

    wireRate(container, format, tid);

    if (!_refreshHooked) {
      _refreshHooked = true;
      window.addEventListener('cde:cloud-refresh', () => {
        if (_current && _current.container && document.body.contains(_current.container) &&
            !_current.container.querySelector('.iqe-editing')) {
          render(_current.container, _current.format, _current.topic);
        }
      });
    }

    const toggle = container.querySelector('.iq-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const rows = container.querySelectorAll('.iq-item');
        const anyClosed = Array.prototype.some.call(rows, r => !r.classList.contains('open'));
        rows.forEach(r => r.classList.toggle('open', anyClosed));
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
