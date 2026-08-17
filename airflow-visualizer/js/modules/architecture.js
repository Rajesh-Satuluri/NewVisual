/* ============================================================
   modules/architecture.js — flagship animated overview
   Two-column layout: interactive SVG diagram + detail panel,
   driven by the AnimationEngine walking the end-to-end flow.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "architecture",
    title: "Architecture Overview",
    fullWidth: true,
    _engine: null,
    _controls: null,
    _diagram: null,
    _offStep: null,

    render: function (container) {
      var data = AV.data.architecture;
      var self = this;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Big Picture</div>' +
          '<h1 class="module-title">How a task flows through Airflow</h1>' +
          '<p class="module-subtitle">Press play to follow a ShopKart task from a DAG file all the way ' +
          "to a running worker and back to the UI. Click any component to inspect it.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="arch-canvas"></div>' +
          '<aside class="arch-detail" id="arch-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="arch-controls"></div>';

      var canvas = container.querySelector("#arch-canvas");
      var detail = container.querySelector("#arch-detail");
      var controlsMount = container.querySelector("#arch-controls");

      // ── Diagram ─────────────────────────────────────────
      var diagram = AV.ArchDiagram.create({
        nodes: data.nodes,
        edges: data.edges,
        viewBox: data.viewBox,
        onSelect: function (id) { showNodeDetail(id); }
      });
      canvas.appendChild(diagram.el);
      this._diagram = diagram;

      // ── Detail panel renderers ──────────────────────────
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">The 30-second tour</div>' +
          "<p>Airflow separates <b>describing</b> work (the DAG file) from <b>scheduling</b> it " +
          "(scheduler + metadata DB) from <b>running</b> it (executor + workers).</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)">' +
            '<span class="callout-icon">💡</span>' +
            '<div class="callout-body"><b>2.x vs 3.x:</b> In 2.x, workers connect straight to the ' +
            "metadata DB. In 3.x, task code talks to the <b>API server</b> via the Task Execution API — " +
            "the database is no longer exposed to your tasks.</div>" +
          "</div>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-4)">Press ' +
          "<kbd>Space</kbd> to play · <kbd>→</kbd>/<kbd>←</kbd> to step · click a box to inspect it.</p>";
      }

      function showStepDetail(idx) {
        diagram.clearSelection();
        if (idx < 0) { defaultDetail(); return; }
        var step = data.steps[idx];
        if (!step) { defaultDetail(); return; }
        detail.innerHTML =
          '<div class="arch-detail-title">' + step.label + "</div>" +
          "<p>" + step.desc + "</p>";
        if (step.code) {
          var cv = AV.CodeViewer.create({
            title: "daily_sales_etl.py",
            lang: "python",
            code: AV.data.shopkart.dagCode
          });
          cv.style.marginTop = "var(--space-4)";
          detail.appendChild(cv);
        }
      }

      function showNodeDetail(id) {
        var d = data.detail[id];
        if (!d) return;
        var noteHtml = "";
        if (d.note) {
          noteHtml =
            '<div class="callout info" style="margin-top:var(--space-4)">' +
              '<span class="badge badge-v' + (d.note.v === "3.x" ? "3" : "2") + '">' + d.note.v + "</span>" +
              '<div class="callout-body">' + d.note.text + "</div>" +
            "</div>";
        }
        detail.innerHTML =
          '<div class="arch-detail-title">' + d.title + "</div>" +
          "<p>" + d.body + "</p>" + noteHtml;
      }

      // ── Engine + steps ──────────────────────────────────
      var steps = data.steps.map(function (s) {
        return { label: s.label, description: s.desc, duration: 2600 };
      });
      var engine = new AV.AnimationEngine({ steps: steps, speed: 1 });
      this._engine = engine;

      // Drive visuals from stepchange so play/next/prev/goto/reset all stay correct.
      this._offStep = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStepDetail(-1); return; }
        var s = data.steps[idx];
        diagram.setActive(s.nodes, s.edges);
        showStepDetail(idx);
      });

      // ── Controls ────────────────────────────────────────
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      controlsMount.appendChild(controls.el);
      this._controls = controls;

      defaultDetail();
    },

    destroy: function () {
      if (this._offStep) { this._offStep(); this._offStep = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
