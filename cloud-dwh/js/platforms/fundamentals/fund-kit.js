/* ============================================================
   FundKit — the Fundamentals module factory.
   Each concept module is authored as a declarative spec and rendered
   as a consistent, thorough layout:
     1. header (eyebrow · title · lead)
     2. prose explainer sections (the vendor-neutral "skeleton")
     3. an animated concept diagram (shared AnimationEngine)
     4. a colour-coded 3-way mapping (Snowflake / Redshift / Fabric)
     5. a "Bottom line" takeaway
     6. a "go deeper → Compare" cross-link + official doc links
   Reuses the rk-* (stage/panel) and cmp-* (3-column) styles so it
   matches the rest of the tool; accent adapts via var(--blue).
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = {};
  const NAMES = { sf: 'Snowflake', rs: 'Amazon Redshift', fb: 'Microsoft Fabric' };

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ── Animated stage (replicated from the shared kit, rk-* styles) ── */
  function buildStage(stage) {
    const d = el('div', 'rk-stage');
    if (stage.caption) d.appendChild(el('div', 'rk-stage-caption', stage.caption));
    (stage.groups || []).forEach(g => {
      const band = el('div', 'rk-group'); band.id = 'rk-' + g.id;
      let head = '';
      if (g.label) head = `<div class="rk-group-head"><span class="rk-group-label">${g.label}</span>${g.sub ? `<span class="rk-group-sub">${g.sub}</span>` : ''}</div>`;
      const nodes = (g.nodes || []).map(n =>
        `<div class="rk-node" id="rk-${n.id}"><div class="rk-node-label">${n.label}</div>${n.sub ? `<div class="rk-node-sub">${n.sub}</div>` : ''}</div>`).join('');
      band.innerHTML = head + `<div class="rk-node-row">${nodes}</div>`;
      d.appendChild(band);
      if (g.connectorAfter) {
        const c = el('div', 'rk-conn'); c.id = 'rk-conn-' + g.id;
        c.innerHTML = `<span class="rk-conn-pill">${g.connectorAfter}</span>`;
        d.appendChild(c);
      }
    });
    return d;
  }
  function buildPanel(spec) {
    const p = el('div', 'anim-panel'); p.id = 'rk-panel';
    p.innerHTML =
      `<div class="anim-panel-step-num" id="rk-step">Overview</div>
       <div class="anim-panel-title" id="rk-ptitle">${spec.title}</div>
       <div class="anim-panel-body" id="rk-pbody">Press Play for a guided, step-by-step walkthrough.</div>
       <div class="anim-panel-facts" id="rk-pfacts"></div>`;
    return p;
  }
  function resetStage(ctx) {
    const c = ctx.stage; if (!c) return;
    c.querySelectorAll('.rk-node, .rk-group').forEach(n => n.classList.remove('spot', 'dim', 'flow'));
    c.querySelectorAll('.rk-conn-pill').forEach(n => n.classList.remove('active'));
  }
  function applyOn(ctx, on) {
    if (!on) return;
    const pick = id => ctx.stage.querySelector('#rk-' + id);
    (on.dimAll ? [...ctx.stage.querySelectorAll('.rk-node')] : []).forEach(n => n.classList.add('dim'));
    (on.spot || []).forEach(id => { const e = pick(id); if (e) { e.classList.add('spot'); e.classList.remove('dim'); } });
    (on.dim || []).forEach(id => { const e = pick(id); if (e) e.classList.add('dim'); });
    (on.flow || []).forEach(id => { const e = pick(id); if (e) e.classList.add('flow'); });
    (on.group || []).forEach(id => { const e = pick(id); if (e) e.classList.add('spot'); });
    (on.conn || []).forEach(id => { const e = ctx.stage.querySelector('#rk-conn-' + id + ' .rk-conn-pill'); if (e) e.classList.add('active'); });
  }
  function setPanel(ctx, step, s) {
    const p = ctx.panel; if (!p) return;
    p.querySelector('#rk-step').textContent = step;
    p.querySelector('#rk-ptitle').textContent = s.title;
    p.querySelector('#rk-pbody').innerHTML = s.body || '';
    p.querySelector('#rk-pfacts').innerHTML = (s.facts || []).map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  /* ── 3-way mapping card ─────────────────────────────────── */
  function side(kind, data) {
    if (!data) return '';
    return '<div class="cmp-col cmp-col--' + kind + '">' +
      '<div class="cmp-col__head"><span class="cmp-col__dot"></span><span class="cmp-col__title">' + NAMES[kind] + '</span></div>' +
      '<div class="cmp-col__body">' +
      (data.term ? '<div class="fund-term">' + data.term + '</div>' : '') +
      '<ul class="cmp-points">' + (data.points || []).map(p => '<li>' + p + '</li>').join('') + '</ul>' +
      (data.code ? '<div class="cmp-code">' + data.code.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])) + '</div>' : '') +
      '</div></div>';
  }

  /* ── Public factory ─────────────────────────────────────── */
  Kit.makeModule = function (spec) {
    return {
      render(canvas) {
        canvas.innerHTML = '';
        const page = el('div', 'mod-page fund-page');

        page.appendChild(el('div', 'mod-header',
          `<div class="mod-eyebrow">${spec.eyebrow || 'Fundamentals'}</div>
           <h1 class="mod-title">${spec.title}</h1>
           <p class="mod-subtitle fund-lead">${spec.lead || ''}</p>`));

        /* 1 — prose explainer */
        if (spec.sections && spec.sections.length) {
          const prose = el('div', 'fund-prose');
          spec.sections.forEach(s => {
            prose.appendChild(el('section', 'fund-section',
              `<h3>${s.h}</h3><div class="fund-section-body">${s.p}</div>`));
          });
          page.appendChild(prose);
        }

        /* 2 — animated concept diagram */
        let engine = null;
        if (spec.stage && spec.steps && spec.steps.length && viz.AnimationEngine) {
          const block = el('div', 'fund-block');
          block.appendChild(el('div', 'fund-block-title', spec.diagramTitle || '🎬 See it step by step'));
          const layout = el('div', 'rk-layout');
          const stage = buildStage(spec.stage);
          const panel = buildPanel(spec);
          layout.appendChild(stage); layout.appendChild(panel);
          block.appendChild(layout);
          page.appendChild(block);

          const ctx = { stage, panel };
          const AE = viz.AnimationEngine;
          const total = spec.steps.length;
          const steps = spec.steps.map((s, i) => AE.fnStep(
            s.label, s.title,
            (c) => { resetStage(c); applyOn(c, s.on); setPanel(c, `Step ${i + 1} of ${total}`, s); },
            (c) => { resetStage(c); },
            s.duration || 4200
          ));
          engine = new AE({ steps, speed: 1 });
          engine.setContext(ctx);
          viz.AnimationControls && viz.AnimationControls.register(engine);
        }

        /* 3 — 3-way mapping */
        if (spec.map) {
          const block = el('div', 'fund-block');
          block.appendChild(el('div', 'fund-block-title', 'How the three clouds handle it'));
          if (spec.map.intro) block.appendChild(el('p', 'fund-map-intro', spec.map.intro));
          block.appendChild(el('div', 'cmp-cols',
            side('sf', spec.map.sf) + side('rs', spec.map.rs) + side('fb', spec.map.fb)));
          page.appendChild(block);
        }

        /* 4 — bottom line */
        if (spec.takeaway) {
          page.appendChild(el('div', 'cmp-takeaway',
            '<span class="cmp-takeaway__icon">💡</span><span class="cmp-takeaway__txt"><b>Bottom line —</b> ' + spec.takeaway + '</span>'));
        }

        /* 5 — cross-link + docs */
        const foot = el('div', 'fund-foot');
        if (spec.compare) {
          const btn = el('button', 'fund-xlink', `Go deeper → Compare: ${spec.compareLabel || 'side by side'} ↗`);
          btn.addEventListener('click', () => viz.setPlatform && viz.setPlatform('compare', { target: spec.compare }));
          foot.appendChild(btn);
        } else { foot.appendChild(el('span')); }
        if (spec.docs && spec.docs.length) {
          foot.appendChild(el('div', 'fund-docs',
            spec.docs.map(d => `<a href="${d.url}" target="_blank" rel="noopener">📄 ${d.label} ↗</a>`).join('')));
        }
        page.appendChild(foot);

        canvas.appendChild(page);
        return { destroy: () => { if (engine) engine.destroy(); } };
      },
    };
  };

  /* Register a group of specs into the fundamentals bucket.
     Keys are the kebab module id → camelCase (fund-ingest-batch → fundIngestBatch). */
  Kit.registerAll = function (specs) {
    viz.P = viz.P || {}; viz.P.fundamentals = viz.P.fundamentals || {};
    const B = (viz.P.fundamentals.Modules = viz.P.fundamentals.Modules || {});
    Object.entries(specs).forEach(([id, spec]) => {
      const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      B[key] = Kit.makeModule(spec);
    });
  };

  viz.FundKit = Kit;
})();
