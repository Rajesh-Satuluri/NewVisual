/* ============================================================
   concept-factory.js — builds a standard "deep concept" module:
     - animated CAT network diagram; each step highlights the
       node(s) a term applies to and explains it in the aside
     - a full measure/term reference table below (thorough theory)
     - measure pills + a worked-example callout
   SolverViz.ConceptFactory.build(cfg) -> module object
   cfg: { id, title, eyebrow, intro, measures:[[name,desc,value,[nodeIds]]],
          tableTitle, pills:[...], worked:{title,html}, callout:{kind,html} }
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});

  var GEO = [
    { id: "supplier", label: "Supplier X", sub: "Source", x: 40, y: 95, w: 150, h: 54, color: "supplier" },
    { id: "dc-nat", label: "DC-National", sub: "Central", x: 230, y: 95, w: 150, h: 54, color: "dc" },
    { id: "dc-north", label: "DC-North", sub: "Regional", x: 420, y: 95, w: 150, h: 54, color: "dc" },
    { id: "lc-store", label: "LC-Store-A", sub: "Customer LC", x: 610, y: 95, w: 150, h: 54, color: "lc" },
    { id: "customer", label: "Customer", sub: "Demand", x: 610, y: 15, w: 150, h: 54, color: "demand" }
  ];
  var EDGES = [["supplier", "dc-nat"], ["dc-nat", "dc-north"], ["dc-north", "lc-store"], ["customer", "lc-store"]];

  function table(cfg) {
    var rows = cfg.measures.map(function (m) {
      return '<tr><td><code>' + m[0] + '</code></td><td>' + m[1] + '</td><td class="mono-cell">' + (m[2] || "") + '</td></tr>';
    }).join("");
    return '<div style="overflow-x:auto"><table class="ref-table"><thead><tr>' +
      '<th>o9 measure / term</th><th>What it means</th><th>Widget-A</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function build(cfg) {
    var measures = cfg.measures || [];
    return {
      id: cfg.id, title: cfg.title, fullWidth: true,
      _engine: null, _controls: null, _diagram: null, _off: null,
      render: function (container) {
        var pills = (cfg.pills || []).map(function (p) { return '<span class="measure-pill">' + p + '</span>'; }).join("");
        container.innerHTML =
          '<div class="module-header animate-fade-in-up">' +
            '<div class="module-eyebrow">' + (cfg.eyebrow || "") + '</div>' +
            '<h1 class="module-title gradient-text">' + cfg.title + '</h1>' +
            '<p class="module-subtitle">' + (cfg.intro || "") + '</p>' +
          "</div>" +
          '<div class="arch-layout"><div class="arch-canvas" id="canvas-host"></div>' +
            '<aside class="arch-detail" id="detail"><h3>Ready — press play</h3><p>Step through each term to see where in the CAT network it applies.</p></aside></div>' +
          '<div class="arch-controls" id="controls"></div>' +
          '<section class="section"><h2 class="section-title">' + (cfg.tableTitle || "Terms explained") + '</h2>' + table(cfg) + '</section>' +
          (cfg.worked ? '<section class="section"><h2 class="section-title">' + cfg.worked.title + '</h2>' + cfg.worked.html + '</section>' : "") +
          (pills ? '<section class="section"><div>' + pills + '</div></section>' : "") +
          (cfg.callout ? '<div class="callout ' + cfg.callout.kind + '"><span class="callout-icon">💡</span><div class="callout-body">' + cfg.callout.html + '</div></div>' : "");

        var diagram = AV.ArchDiagram.create({ nodes: GEO, edges: EDGES, viewBox: "0 0 780 165", onSelect: function () {} });
        container.querySelector("#canvas-host").appendChild(diagram.el);
        this._diagram = diagram;
        var detail = container.querySelector("#detail");

        function show(idx) {
          GEO.forEach(function (g) {
            var n = diagram.el.querySelector('[data-id="' + g.id + '"]');
            if (n) n.classList.remove("is-running");
          });
          if (idx < 0) { diagram.clear(); detail.innerHTML = "<h3>Ready — press play</h3><p>Step through each term to see where in the CAT network it applies.</p>"; return; }
          var m = measures[idx];
          var nodes = m[3] || [];
          diagram.setActive(nodes, []);
          nodes.forEach(function (nid) {
            var n = diagram.el.querySelector('[data-id="' + nid + '"]');
            if (n) n.classList.add("is-running");
          });
          detail.innerHTML = "<h3>" + m[0] + "</h3><p>" + m[1] + "</p>" +
            (m[2] ? '<p style="margin-top:8px"><b>Widget-A:</b> <code>' + m[2] + '</code></p>' : "");
        }

        var engine = new AV.AnimationEngine({ steps: measures.map(function (m) { return { label: m[0], duration: 2400 }; }), speed: 1 });
        this._engine = engine;
        this._off = engine.on("stepchange", function (idx) { show(idx); });
        var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
        container.querySelector("#controls").appendChild(controls.el);
        this._controls = controls; show(-1);
      },
      destroy: function () {
        if (this._off) { this._off(); this._off = null; }
        if (this._controls) { this._controls.destroy(); this._controls = null; }
        if (this._engine) { this._engine.destroy(); this._engine = null; }
        if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
      }
    };
  }

  AV.ConceptFactory = { build: build };
})();
