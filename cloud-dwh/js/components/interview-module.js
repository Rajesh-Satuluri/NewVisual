/* ============================================================
   Interview Module — a shared renderer for the comprehensive,
   interview-focused Snowflake masterclass modules (Observability,
   Project Stories, Streams·Tasks·Dynamic Tables).

   It renders the same tabbed shape the Loading Deep Dive pioneered
   and reuses its CSS (ldd-* classes), the shared CodeViewer and the
   editable/filterable QAAccordion — so every masterclass module
   looks and behaves identically.

     build(getData) -> { render(canvas) }

   getData() returns a content model:
     {
       hero: { eyebrow, title, subtitle },
       tabs: [
         { label, kind:'blocks'|'qa', blocks:[...], groups:[...] }
       ]
     }

   A 'blocks' tab is an ordered list of blocks; each block is one of:
     { t:'callout',  tag, html }
     { t:'section',  text }
     { t:'table',    title?, head:[a,b,c], rows:[[...]], note? }
     { t:'chain',    nodes:[{ role, icon, name, one, what }] }
     { t:'card',     icon, title, tag?, when?, body:[..], points:[..],
                     gotchas:[..], code:{text,lang,label}, interview? }
     { t:'story',    title, oneLiner, resumeBullet, stack,
                     situation, task, actions:[..], results:[..],
                     numbers:[[k,v]..], thirty, two, senior,
                     landmines:[..], code?:{text,lang,label} }

   A 'qa' tab: { groups:[{ group, items:[{q,a,difficulty}] }], editKey }

   Pure content renderer. No live execution.
   ============================================================ */
(function () {
  'use strict';

  const CV = () => window.CDWH.CodeViewer;
  const QA = () => window.CDWH.QAAccordion;

  function build(getData) {
    return {
      render(canvas) {
        canvas.innerHTML = '';
        const d = (typeof getData === 'function') ? getData() : getData;
        const page = _el('div', 'mod-page');

        if (!d) {
          page.innerHTML = '<div class="placeholder-msg"><p>Module content not loaded.</p></div>';
          canvas.appendChild(page);
          return {};
        }

        const h = d.hero || {};
        const head = _el('div', 'mod-header');
        head.innerHTML =
          `${h.eyebrow ? `<div class="mod-eyebrow">${_esc(h.eyebrow)}</div>` : ''}
           <h1 class="mod-title">${_esc(h.title || '')}</h1>
           ${h.subtitle ? `<p class="mod-subtitle">${_esc(h.subtitle)}</p>` : ''}`;
        page.appendChild(head);
        canvas.appendChild(page);

        const bar = _el('div', 'wk-tabs');
        const body = _el('div', 'wk-body');
        const tabs = d.tabs || [];

        tabs.forEach((tab, i) => {
          const b = _el('button', 'wk-tab' + (i === 0 ? ' active' : ''));
          b.type = 'button';
          b.textContent = tab.label;
          b.addEventListener('click', () => {
            bar.querySelectorAll('.wk-tab').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            paint(tab);
          });
          bar.appendChild(b);
        });
        page.append(bar, body);

        function paint(tab) {
          body.innerHTML = '';
          if (tab.kind === 'qa') renderQA(tab);
          else (tab.blocks || []).forEach(bl => body.appendChild(renderBlock(bl)));
          decorate();
        }

        function renderQA(tab) {
          const total = (tab.groups || []).reduce((n, g) => n + g.items.length, 0);
          body.appendChild(_callout('💬 Rehearse out loud', `${total} questions, grouped by theme and tagged by difficulty. Open each one, answer it in your own words first, then check. You can edit any answer in place — your wording is saved on this device and synced.`));
          if (!QA()) { const e = _el('div', 'in-empty'); e.textContent = 'Q&A component not loaded.'; body.appendChild(e); return; }
          (tab.groups || []).forEach(group => {
            const g = _el('div', 'prep-group');
            const gh = _el('div', 'prep-group-head ldd-qa-head');
            gh.innerHTML = `<span>${_esc(group.group)}</span><span class="prep-group-count">${group.items.length}</span>`;
            g.appendChild(gh);
            g.appendChild(QA().create(group.items, { editPrefix: (tab.editKey || 'sf-im') + '-' + _slug(group.group) }));
            body.appendChild(g);
          });
        }

        function decorate() {
          if (window.CDWH.LoadingGlossary) { try { window.CDWH.LoadingGlossary.decorate(page); } catch (_) {} }
        }

        if (tabs.length) paint(tabs[0]);
        return {};
      },
    };
  }

  /* ---------- block renderers ---------- */
  function renderBlock(bl) {
    switch (bl.t) {
      case 'callout': return _callout(bl.tag, bl.html);
      case 'section': return _section(bl.text);
      case 'table':   return _table(bl);
      case 'chain':   return _chain(bl.nodes || []);
      case 'card':    return _card(bl);
      case 'story':   return _story(bl);
      default:        return _el('div');
    }
  }

  function _section(text) {
    const e = _el('div', 'mod-section-title');
    e.style.marginTop = '1.3rem';
    e.textContent = text;
    return e;
  }

  function _table(bl) {
    const wrap = _el('div');
    if (bl.title) wrap.appendChild(_section(bl.title));
    const scroll = _el('div', 'lcs-table-scroll'); scroll.setAttribute('data-noswipe', '');
    const tbl = _el('table', 'lcs-cmp ldd-objtable');
    const head = bl.head || [];
    const thead = '<thead><tr>' + head.map((c, i) =>
      i === 0 ? `<th class="lcs-cmp-rowhead">${_esc(c)}</th>` : `<th>${_esc(c)}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + (bl.rows || []).map(r =>
      '<tr>' + r.map((cell, i) =>
        i === 0 ? `<th scope="row" class="lcs-cmp-rowhead">${_esc(cell)}</th>` : `<td>${_md(cell)}</td>`
      ).join('') + '</tr>').join('') + '</tbody>';
    tbl.innerHTML = thead + tbody;
    scroll.appendChild(tbl);
    wrap.appendChild(scroll);
    if (bl.note) { const n = _el('div', 'dl2-note'); n.innerHTML = _md(bl.note); wrap.appendChild(n); }
    return wrap;
  }

  function _chain(nodes) {
    const chain = _el('div', 'ldd-chain');
    nodes.forEach((s, i) => {
      const node = _el('div', 'ldd-chain-node');
      node.innerHTML =
        `<div class="ldd-chain-role">${_esc(s.role)}</div>
         <div class="ldd-chain-icon">${s.icon || ''}</div>
         <div class="ldd-chain-name">${_esc(s.name)}</div>
         <div class="ldd-chain-one">${_esc(s.one)}</div>
         <div class="ldd-chain-what">${_esc(s.what)}</div>`;
      chain.appendChild(node);
      if (i < nodes.length - 1) {
        const arr = _el('div', 'ldd-chain-arrow'); arr.setAttribute('aria-hidden', 'true'); arr.textContent = '→';
        chain.appendChild(arr);
      }
    });
    return chain;
  }

  function _card(c) {
    const card = _el('div', 'ldd-card');
    let html =
      `<div class="ldd-card-head">
         <span class="ldd-card-icon">${c.icon || '•'}</span>
         <span class="ldd-card-title">${_esc(c.title)}</span>
         ${c.tag ? `<span class="ldd-card-tag">${_esc(c.tag)}</span>` : ''}
       </div>`;
    if (c.when) html += `<div class="ldd-when"><span class="ldd-when-lbl">Use when</span> ${_esc(c.when)}</div>`;
    (c.body || []).forEach(p => { html += `<p class="ldd-p">${_md(p)}</p>`; });
    card.innerHTML = html;
    if (c.points && c.points.length)   card.appendChild(_bullets('ldd-points', '🔑 Key points', c.points));
    if (c.gotchas && c.gotchas.length) card.appendChild(_bullets('ldd-gotchas', '⚠️ Watch out', c.gotchas));
    if (c.code && CV()) { const slot = _el('div', 'ldd-code'); slot.appendChild(CV().create(c.code.text, c.code.lang, c.code.label)); card.appendChild(slot); }
    if (c.interview) { const iv = _el('div', 'ldd-interview'); iv.innerHTML = `<div class="ldd-interview-tag">🎤 Interview angle</div><p>${_md(c.interview)}</p>`; card.appendChild(iv); }
    return card;
  }

  function _story(s) {
    const card = _el('div', 'ldd-card ldd-story');
    let html =
      `<div class="ldd-card-head">
         <span class="ldd-card-icon">📦</span>
         <span class="ldd-card-title">${_esc(s.title)}</span>
         ${s.stack ? `<span class="ldd-card-tag">${_esc(s.stack)}</span>` : ''}
       </div>`;
    if (s.oneLiner) html += `<p class="ldd-p"><em>${_esc(s.oneLiner)}</em></p>`;
    if (s.resumeBullet) html += `<div class="ldd-when"><span class="ldd-when-lbl">Résumé bullet</span> ${_md(s.resumeBullet)}</div>`;
    if (s.situation) html += `<p class="ldd-p"><strong>Situation.</strong> ${_md(s.situation)}</p>`;
    if (s.task)      html += `<p class="ldd-p"><strong>Task.</strong> ${_md(s.task)}</p>`;
    card.innerHTML = html;

    if (s.actions && s.actions.length) card.appendChild(_bullets('ldd-points', '🔧 Action — what I did', s.actions));
    if (s.results && s.results.length) card.appendChild(_bullets('ldd-points ldd-results', '📈 Result', s.results));

    if (s.numbers && s.numbers.length) {
      const t = _table({ title: '', head: ['Metric', 'Value'], rows: s.numbers });
      t.classList.add('ldd-story-nums');
      card.appendChild(t);
    }
    if (s.code && CV()) { const slot = _el('div', 'ldd-code'); slot.appendChild(CV().create(s.code.text, s.code.lang, s.code.label)); card.appendChild(slot); }

    if (s.thirty) { const b = _el('div', 'ldd-interview'); b.innerHTML = `<div class="ldd-interview-tag">⏱️ 30-second version</div><p>${_md(s.thirty)}</p>`; card.appendChild(b); }
    if (s.two)    { const b = _el('div', 'ldd-interview'); b.innerHTML = `<div class="ldd-interview-tag">🎤 2-minute version</div><p>${_md(s.two)}</p>`; card.appendChild(b); }
    if (s.senior) { const b = _el('div', 'ldd-interview'); b.innerHTML = `<div class="ldd-interview-tag">🧠 Senior deep-dive (if they probe)</div><p>${_md(s.senior)}</p>`; card.appendChild(b); }
    if (s.landmines && s.landmines.length) card.appendChild(_bullets('ldd-gotchas', '🧨 Follow-up landmines', s.landmines));
    return card;
  }

  /* ---------- helpers ---------- */
  function _bullets(cls, tag, items) {
    const d = _el('div', 'ldd-block ' + cls);
    d.innerHTML = `<div class="ldd-block-tag">${tag}</div><ul class="ldd-ul">${items.map(x => `<li>${_md(x)}</li>`).join('')}</ul>`;
    return d;
  }
  function _callout(tag, html) {
    const d = _el('div', 'wk-callout');
    d.innerHTML = `<div class="wk-callout-tag">${_esc(tag)}</div><p>${_md(html)}</p>`;
    return d;
  }
  // Minimal, safe inline markdown: escape first, then re-enable **bold**,
  // *italic* and `code`. Inputs are authored in this repo, never user text.
  function _md(s) {
    let t = _esc(s == null ? '' : s);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return t;
  }
  function _slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.InterviewModule = { build: build };
})();
