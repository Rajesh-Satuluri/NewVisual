/* ============================================================
   Loading Deep Dive (interview masterclass) — renders the
   content model in loading/data/loading-deepdive.js as a tabbed
   reference:

     1 · Pipeline Map       — the continuous-data-pipeline model
     2 · Loading Methods    — every ingestion method, in depth
     3 · Transform & Automate — Streams / Tasks / Dynamic Tables / MERGE
     4 · Monitor & Operate  — observability, errors, schema, cost
     5 · Interview Q&A      — grouped, difficulty-filterable (QAAccordion)

   Pure content module. Code renders through the shared CodeViewer;
   Q&A through the shared QAAccordion (editable + filterable). Opts
   into the loading glossary auto-decorator. No live execution.
   ============================================================ */
(function () {
  'use strict';

  const CV   = () => window.CDWH.CodeViewer;
  const QA   = () => window.CDWH.QAAccordion;
  const DATA = () => window.CDWH.P.snowflake.loadingDeepDive;

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const d = DATA();
      const page = _el('div', 'mod-page');
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Query &amp; Data · Interview Masterclass</div>
          <h1 class="mod-title">Data Loading — Deep Dive</h1>
          <p class="mod-subtitle">The full breadth of Snowflake ingestion, built for interviews: one mental model for every pipeline, each loading method in depth (including external, directory and Iceberg tables, transforms-in-COPY and unloading), the automation objects that move data downstream, how you monitor it — and a grouped question bank to rehearse with.</p>
        </div>`;
      canvas.appendChild(page);

      if (!d) {
        page.appendChild(_el('div', 'placeholder-msg')).innerHTML = '<p>Deep-dive content not loaded.</p>';
        return {};
      }

      const tabs = [
        ['🗺️ Pipeline Map', renderPipeline],
        ['📥 Loading Methods', () => renderConcepts(d.methods, 'The ways data gets into (or is read by) Snowflake. Every file-based method is COPY underneath — learn the options once and they all follow.')],
        ['⚙️ Transform & Automate', () => renderConcepts(d.automate, 'Once rows land, these objects move them downstream: Streams capture the delta, Tasks and Dynamic Tables automate the transform, MERGE applies it correctly.')],
        ['📊 Monitor & Operate', () => renderConcepts(d.ops, 'Running a pipeline in production: the right diagnostic for each mechanism, layered error handling, schema drift, and the cost intuition no loading answer is complete without.')],
        ['💬 Interview Q&A', renderQA],
      ];

      const bar = _el('div', 'wk-tabs');
      const body = _el('div', 'wk-body');
      tabs.forEach(([label, fn], i) => {
        const b = _el('button', 'wk-tab' + (i === 0 ? ' active' : ''));
        b.type = 'button'; b.textContent = label;
        b.addEventListener('click', () => {
          bar.querySelectorAll('.wk-tab').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          body.innerHTML = ''; fn();
          decorate();
        });
        bar.appendChild(b);
      });
      page.append(bar, body);

      /* ---------- Tab 1: pipeline map ---------- */
      function renderPipeline() {
        const p = d.pipeline;
        body.appendChild(_callout('🧭 One model for every pipeline', p.intro));

        const chain = _el('div', 'ldd-chain');
        p.chain.forEach((s, i) => {
          const node = _el('div', 'ldd-chain-node');
          node.innerHTML =
            `<div class="ldd-chain-role">${_esc(s.role)}</div>
             <div class="ldd-chain-icon">${s.icon}</div>
             <div class="ldd-chain-name">${_esc(s.name)}</div>
             <div class="ldd-chain-one">${_esc(s.one)}</div>
             <div class="ldd-chain-what">${_esc(s.what)}</div>`;
          chain.appendChild(node);
          if (i < p.chain.length - 1) {
            const arr = _el('div', 'ldd-chain-arrow'); arr.setAttribute('aria-hidden', 'true'); arr.textContent = '→';
            chain.appendChild(arr);
          }
        });
        body.appendChild(chain);
        body.appendChild(_callout('🔀 The variations', p.note));

        const secTitle = _el('div', 'mod-section-title'); secTitle.textContent = 'Object cheat-sheet — what each one IS vs DOES';
        secTitle.style.marginTop = '1.3rem';
        body.appendChild(secTitle);

        const scroll = _el('div', 'lcs-table-scroll'); scroll.setAttribute('data-noswipe', '');
        const tbl = _el('table', 'lcs-cmp ldd-objtable');
        tbl.innerHTML =
          '<thead><tr><th class="lcs-cmp-rowhead">Object</th><th>What it is</th><th>What it does</th></tr></thead><tbody>' +
          p.objects.map(r =>
            `<tr><th scope="row" class="lcs-cmp-rowhead">${_esc(r[0])}</th><td>${_esc(r[1])}</td><td>${_esc(r[2])}</td></tr>`).join('') +
          '</tbody>';
        scroll.appendChild(tbl);
        body.appendChild(scroll);
      }

      /* ---------- Tabs 2–4: concept cards ---------- */
      function renderConcepts(list, introText) {
        if (introText) body.appendChild(_callout('📘 In this section', introText));
        list.forEach(c => body.appendChild(conceptCard(c)));
      }

      function conceptCard(c) {
        const card = _el('div', 'ldd-card');
        let html =
          `<div class="ldd-card-head">
             <span class="ldd-card-icon">${c.icon || '•'}</span>
             <span class="ldd-card-title">${_esc(c.title)}</span>
             ${c.tag ? `<span class="ldd-card-tag">${_esc(c.tag)}</span>` : ''}
           </div>`;
        if (c.when) html += `<div class="ldd-when"><span class="ldd-when-lbl">Use when</span> ${_esc(c.when)}</div>`;
        (c.body || []).forEach(para => { html += `<p class="ldd-p">${_esc(para)}</p>`; });
        card.innerHTML = html;

        if (c.points && c.points.length) card.appendChild(_bullets('ldd-points', '🔑 Key points', c.points));
        if (c.gotchas && c.gotchas.length) card.appendChild(_bullets('ldd-gotchas', '⚠️ Watch out', c.gotchas));

        if (c.code && CV()) {
          const slot = _el('div', 'ldd-code');
          slot.appendChild(CV().create(c.code.text, c.code.lang, c.code.label));
          card.appendChild(slot);
        }
        if (c.interview) {
          const iv = _el('div', 'ldd-interview');
          iv.innerHTML = `<div class="ldd-interview-tag">🎤 Interview angle</div><p>${_esc(c.interview)}</p>`;
          card.appendChild(iv);
        }
        return card;
      }

      /* ---------- Tab 5: grouped Q&A ---------- */
      function renderQA() {
        const total = d.qa.reduce((n, g) => n + g.items.length, 0);
        body.appendChild(_callout('💬 Rehearse out loud', `${total} data-loading interview questions, grouped by theme and tagged by difficulty. Flip each one open, answer it in your own words first, then check. You can edit any answer in place — your wording is saved on this device and synced.`));

        if (!QA()) { body.appendChild(_el('div', 'in-empty')).textContent = 'Q&A component not loaded.'; return; }

        d.qa.forEach(group => {
          const g = _el('div', 'prep-group');
          const h = _el('div', 'prep-group-head ldd-qa-head');
          h.innerHTML = `<span>${_esc(group.group)}</span><span class="prep-group-count">${group.items.length}</span>`;
          g.appendChild(h);
          g.appendChild(QA().create(group.items, { editPrefix: 'sf-ldd-' + _slug(group.group) }));
          body.appendChild(g);
        });
      }

      function decorate() {
        if (window.CDWH.LoadingGlossary) { try { window.CDWH.LoadingGlossary.decorate(page); } catch (_) {} }
      }

      // Initial tab.
      renderPipeline();
      decorate();
      return {};
    },
  };

  /* ---------- helpers ---------- */
  function _bullets(cls, tag, items) {
    const d = _el('div', 'ldd-block ' + cls);
    d.innerHTML = `<div class="ldd-block-tag">${tag}</div><ul class="ldd-ul">${items.map(x => `<li>${_esc(x)}</li>`).join('')}</ul>`;
    return d;
  }
  function _callout(tag, html) {
    const d = _el('div', 'wk-callout');
    d.innerHTML = `<div class="wk-callout-tag">${tag}</div><p>${html}</p>`;
    return d;
  }
  function _slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.P.snowflake.Modules = window.CDWH.P.snowflake.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingDeepdive = Module;
})();
