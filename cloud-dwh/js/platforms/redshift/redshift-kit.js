/* ============================================================
   RedshiftKit — data-driven animated module factory.
   A module is authored as a declarative spec; the kit renders a
   layered "stage" diagram + a stepped info panel wired to the
   shared AnimationEngine, plus optional code + takeaways.
   Styling uses var(--blue) so it adapts to the active platform.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = {};

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* Build the layered stage from spec.stage.groups */
  function buildStage(stage) {
    const d = el('div', 'rk-stage');
    if (stage.caption) d.appendChild(el('div', 'rk-stage-caption', stage.caption));
    (stage.groups || []).forEach(g => {
      const band = el('div', 'rk-group');
      band.id = 'rk-' + g.id;
      let head = '';
      if (g.label) head = `<div class="rk-group-head"><span class="rk-group-label">${g.label}</span>${g.sub ? `<span class="rk-group-sub">${g.sub}</span>` : ''}</div>`;
      const nodes = (g.nodes || []).map(n =>
        `<div class="rk-node" id="rk-${n.id}">
           <div class="rk-node-label">${n.label}</div>
           ${n.sub ? `<div class="rk-node-sub">${n.sub}</div>` : ''}
         </div>`).join('');
      band.innerHTML = head + `<div class="rk-node-row">${nodes}</div>`;
      d.appendChild(band);
      if (g.connectorAfter) {
        const c = el('div', 'rk-conn');
        c.id = 'rk-conn-' + g.id;
        c.innerHTML = `<span class="rk-conn-pill">${g.connectorAfter}</span>`;
        d.appendChild(c);
      }
    });
    return d;
  }

  function buildPanel(spec) {
    const p = el('div', 'anim-panel');
    p.id = 'rk-panel';
    p.innerHTML =
      `<div class="anim-panel-step-num" id="rk-step">Overview</div>
       <div class="anim-panel-title" id="rk-ptitle">${spec.title}</div>
       <div class="anim-panel-body" id="rk-pbody">${spec.subtitle || 'Press Play for a guided, step-by-step walkthrough.'}</div>
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

  /* Public: build a module object from a spec */
  Kit.makeModule = function (spec) {
    return {
      render(canvas) {
        canvas.innerHTML = '';
        const page = el('div', 'mod-page rk-page');
        page.appendChild(el('div', 'mod-header',
          `<div class="mod-eyebrow">${spec.eyebrow || ''}</div>
           <h1 class="mod-title">${spec.title}</h1>
           <p class="mod-subtitle">${spec.subtitle || ''}</p>`));

        const layout = el('div', 'rk-layout');
        const stage = buildStage(spec.stage || { groups: [] });
        const panel = buildPanel(spec);
        layout.appendChild(stage);
        layout.appendChild(panel);
        page.appendChild(layout);

        /* optional code block */
        if (spec.code && viz.CodeViewer) {
          const cv = viz.CodeViewer.create(spec.code.src, spec.code.lang || 'sql', spec.code.title || 'Example');
          const wrap = el('div', 'rk-code'); wrap.appendChild(cv); page.appendChild(wrap);
        }
        /* optional takeaways */
        if (spec.takeaways && spec.takeaways.length) {
          const t = el('div', 'rk-takeaways',
            `<div class="rk-takeaways-title">Key takeaways</div>
             <ul>${spec.takeaways.map(x => `<li>${x}</li>`).join('')}</ul>`);
          page.appendChild(t);
        }
        /* optional docs link */
        if (spec.doc) {
          page.appendChild(el('div', 'rk-doc',
            `<a href="${spec.doc}" target="_blank" rel="noopener">📄 Official AWS documentation ↗</a>`));
        }
        canvas.appendChild(page);

        const ctx = { stage, panel };
        const AE = viz.AnimationEngine;
        if (AE && spec.steps && spec.steps.length) {
          const total = spec.steps.length;
          const steps = spec.steps.map((s, i) => AE.fnStep(
            s.label, s.title,
            (c) => { resetStage(c); applyOn(c, s.on); setPanel(c, `Step ${i + 1} of ${total}`, s); },
            (c) => { resetStage(c); },
            s.duration || 3500
          ));
          const engine = new AE({ steps, speed: 1 });
          engine.setContext(ctx);
          viz.AnimationControls && viz.AnimationControls.register(engine);
          return { destroy: () => engine.destroy() };
        }
        return { destroy() {} };
      },
    };
  };

  /* Register a whole group of specs into the redshift bucket */
  Kit.registerAll = function (platform, specs) {
    viz.P = viz.P || {}; viz.P[platform] = viz.P[platform] || {};
    const B = (viz.P[platform].Modules = viz.P[platform].Modules || {});
    Object.entries(specs).forEach(([key, spec]) => { B[key] = Kit.makeModule(spec); });
  };

  viz.RedshiftKit = Kit;
})();
