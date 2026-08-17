/* ============================================================
   modules/task-mapping.js — dynamic task mapping (.expand)
   Inline fan-out/reduce visual animated by the engine.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  // idx-driven snapshots so prev/goto/reset stay correct.
  var STEPS = [
    { source: "idle", n: null, mapped: "none", reduce: "idle", label: "1 · One task at parse time",
      desc: "At parse time Airflow sees a <b>single mapped task</b> — the DAG structure can't yet know how many instances it will become." },
    { source: "success", n: null, mapped: "none", reduce: "idle", label: "2 · Upstream returns a list",
      desc: "<code>get_files()</code> runs and returns 4 keys. Only <b>now</b>, at runtime, is the count known." },
    { source: "success", n: 4, mapped: "queued", reduce: "idle", label: "3 · Expand into N instances",
      desc: "Airflow creates <b>4 mapped task instances</b>, each with its own <code>map_index</code> (0–3) and its own log." },
    { source: "success", n: 4, mapped: "running", reduce: "idle", label: "4 · Run in parallel",
      desc: "Each instance processes one key independently — subject to pool and concurrency limits, just like any other task." },
    { source: "success", n: 4, mapped: "success", reduce: "running", label: "5 · Reduce",
      desc: "The downstream task receives the <b>list of every mapped result</b> and combines them. Fan-out then fan-in." },
    { source: "success", n: 4, mapped: "success", reduce: "success", label: "6 · A runtime map/reduce",
      desc: "The graph's <i>shape</i> adapted to the data — something a parse-time <code>for</code> loop can't do." }
  ];

  var CODE =
    "@task\n" +
    "def get_files() -> list[str]:\n" +
    "    return list_keys(...)        # N unknown until runtime\n" +
    "\n" +
    "@task\n" +
    "def process(key: str):\n" +
    "    return transform(key)\n" +
    "\n" +
    "@task\n" +
    "def summarize(results: list):\n" +
    "    return combine(results)\n" +
    "\n" +
    "summarize(process.expand(key=get_files()))";

  function chip(label, state) {
    return '<div class="map-item s-' + state + '">' + label + "</div>";
  }

  var module = {
    id: "task-mapping",
    title: "Dynamic Tasks",
    fullWidth: true,
    _engine: null, _controls: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Execution</div>' +
          '<h1 class="module-title">Dynamic task mapping</h1>' +
          '<p class="module-subtitle">Sometimes you don\'t know how many tasks you need until runtime. ' +
          "<code>.expand()</code> turns one task definition into N parallel instances based on an upstream's output — a map/reduce inside your DAG.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="tm-canvas"><div class="map-flow" id="tm-viz"></div></div>' +
          '<aside class="arch-detail" id="tm-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="tm-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">The code</h2>' +
          '<div id="tm-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout tip"><span class="callout-icon">🧩</span><div class="callout-body">' +
          "<b>partial() + expand():</b> use <code>process.partial(retries=2).expand(key=...)</code> to fix the non-mapped " +
          "arguments while mapping over one of them. <code>expand_kwargs()</code> maps over a list of full kwarg dicts.</div></div>" +
          '<div class="callout info"><span class="badge badge-v2">2.3+</span><div class="callout-body">' +
          "Dynamic Task Mapping arrived in Airflow 2.3. A safety cap, <code>max_map_length</code> (default 1024), bounds how " +
          "many instances a single expand can create.</div></div>" +
        "</section>";

      var viz = container.querySelector("#tm-viz");
      var detail = container.querySelector("#tm-detail");

      function box(label, sub, state) {
        return '<div class="map-box s-' + state + '"><div class="map-box-title">' + label + "</div>" +
          '<div class="map-box-sub">' + sub + "</div></div>";
      }
      function renderViz(step) {
        var s = step || { source: "idle", n: null, mapped: "none", reduce: "idle" };
        var fan;
        if (s.n == null) {
          fan = '<div class="map-item placeholder s-' + (s.mapped || "none") + '">process<span class="mi-x">×?</span></div>';
        } else {
          var chips = [];
          for (var i = 0; i < s.n; i++) chips.push(chip("process<span class='mi-x'>[" + i + "]</span>", s.mapped));
          fan = chips.join("");
        }
        var listSub = s.source === "success" ? "→ [k0, k1, k2, k3]" : "list[str]";
        var reduceSub = s.reduce === "idle" ? "waits for all" : (s.reduce === "running" ? "[r0…r3]" : "combined ✔");
        viz.innerHTML =
          '<div class="map-stage"><div class="map-stage-label">get_files</div>' + box("get_files", listSub, s.source) + "</div>" +
          '<div class="map-arrow">→</div>' +
          '<div class="map-stage"><div class="map-stage-label">process · mapped</div><div class="map-fan">' + fan + "</div></div>" +
          '<div class="map-arrow">→</div>' +
          '<div class="map-stage"><div class="map-stage-label">summarize</div>' + box("summarize", reduceSub, s.reduce) + "</div>";
      }
      function showStep(idx) {
        if (idx < 0) {
          renderViz(null);
          detail.innerHTML = '<div class="arch-detail-title">One definition → N instances</div>' +
            "<p>Press play to watch a single mapped task fan out over a runtime-computed list, then fan back in.</p>" +
            '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🗺️</span>' +
            '<div class="callout-body">Think <code>map()</code> then <code>reduce()</code> — but each element is a full task instance with its own retries and logs.</div></div>';
          return;
        }
        renderViz(STEPS[idx]);
        detail.innerHTML = '<div class="arch-detail-title">' + STEPS[idx].label + "</div><p>" + STEPS[idx].desc + "</p>";
      }

      container.querySelector("#tm-code").appendChild(AV.CodeViewer.create({ title: "map / reduce with .expand()", lang: "python", code: CODE, highlights: [13] }));

      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) { showStep(idx); });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#tm-controls").appendChild(controls.el);
      this._controls = controls;
      showStep(-1);
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
    }
  };

  AV.registerModule(module);
})();
