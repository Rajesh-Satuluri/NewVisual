/* ============================================================
   modules/dag-parsing.js — how a .py file becomes a runnable DAG
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "file",       label: "DAG .py file",     sub: "in dags/ folder",     x: 20,  y: 78, w: 165, h: 66, color: "airflow" },
    { id: "processor",  label: "DagFileProcessor", sub: "imports the module",  x: 225, y: 78, w: 175, h: 66, color: "cyan" },
    { id: "dagbag",     label: "DagBag",           sub: "DAG objects in memory",x: 440, y: 78, w: 155, h: 66, color: "green" },
    { id: "serialized", label: "SerializedDAG",    sub: "JSON blob",           x: 635, y: 78, w: 150, h: 66, color: "yellow" },
    { id: "db",         label: "Metadata DB",      sub: "serialized_dag",      x: 815, y: 78, w: 125, h: 66, color: "purple" }
  ];
  var EDGES = [["file", "processor"], ["processor", "dagbag"], ["dagbag", "serialized"], ["serialized", "db"]];

  var STEPS = [
    { label: "1 · Discover files", nodes: ["file"], edges: [],
      desc: "The processor walks the <code>dags/</code> folder every <b>dag_dir_list_interval</b> (default 5&nbsp;min) to find <code>.py</code> files to parse." },
    { label: "2 · Import the module", nodes: ["processor"], edges: [["file", "processor"]],
      desc: "Each file is <b>imported as a Python module</b> — every line of <b>top-level code runs on every parse</b>. This is where slow imports or API calls silently wreck scheduler performance.", code: true },
    { label: "3 · Build the DagBag", nodes: ["dagbag"], edges: [["processor", "dagbag"]],
      desc: "DAG objects found at import time are collected into a <b>DagBag</b>. Import errors are captured per-file and surfaced in the UI without killing other DAGs." },
    { label: "4 · Serialize to JSON", nodes: ["serialized"], edges: [["dagbag", "serialized"]],
      desc: "Each DAG is <b>serialized to JSON</b> (its structure, not your Python). This is what decouples the scheduler and UI from your DAG code." },
    { label: "5 · Store in the DB", nodes: ["db"], edges: [["serialized", "db"]],
      desc: "The JSON lands in the <code>serialized_dag</code> table. <b>The scheduler and API server read this — never your file.</b> That's why a parse error can leave a stale DAG running." },
    { label: "6 · Re-parse on a loop", nodes: ["processor", "db"], edges: [],
      desc: "Files are re-parsed every <b>min_file_process_interval</b> (default 30&nbsp;s) so edits show up. Parsing runs in a separate process pool sized by <b>parsing_processes</b>." }
  ];

  var BAD_CODE =
    "# ❌ Runs on EVERY parse (every ~30s), for every file\n" +
    "import requests\n" +
    "config = requests.get(\"https://api/config\").json()\n" +
    "\n" +
    "@dag(schedule=\"@daily\")\n" +
    "def etl():\n" +
    "    ...";
  var GOOD_CODE =
    "# ✅ Deferred to task runtime — parse stays cheap\n" +
    "@dag(schedule=\"@daily\")\n" +
    "def etl():\n" +
    "    @task\n" +
    "    def load_config():\n" +
    "        import requests\n" +
    "        return requests.get(\"https://api/config\").json()";

  var KNOBS = [
    { k: "dag_dir_list_interval", v: "5 min", d: "How often the folder is re-scanned for new/removed files." },
    { k: "min_file_process_interval", v: "30 s", d: "Minimum gap between re-parsing the same file." },
    { k: "parsing_processes", v: "2", d: "Parallel processes the DAG processor uses." },
    { k: "dagbag_import_timeout", v: "30 s", d: "Kill a file's import if it takes longer than this." }
  ];

  var module = {
    id: "dag-parsing",
    title: "DAG Parsing",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Internals</div>' +
          '<h1 class="module-title">From <code>.py</code> file to serialized DAG</h1>' +
          '<p class="module-subtitle">Your DAG file is never run by the scheduler. It is parsed, serialized to JSON, ' +
          "and stored — and that indirection explains a surprising amount of Airflow's behavior.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="dp-canvas"></div>' +
          '<aside class="arch-detail" id="dp-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="dp-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">Why top-level code matters</h2>' +
          '<p style="margin-bottom:var(--space-4)">Top-level code runs on <b>every parse</b>. The classic interview trap:</p>' +
          '<div class="two-col" id="dp-code"></div>' +
        "</section>" +
        '<section class="section">' +
          '<h2 class="section-title">Parsing knobs</h2>' +
          '<div class="card-grid" id="dp-knobs"></div>' +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 960 220",
        onSelect: function (id) { showNode(id); }
      });
      container.querySelector("#dp-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#dp-detail");

      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">The parse loop</div>' +
          "<p>Press play to follow a file from disk to the <code>serialized_dag</code> table. " +
          "Each stage below maps to a box in the pipeline.</p>" +
          '<div class="callout warn" style="margin-top:var(--space-4)">' +
            '<span class="callout-icon">⚠️</span>' +
            '<div class="callout-body">Because the scheduler reads the <b>serialized</b> DAG, a file with an ' +
            "import error keeps its last good version — changes silently stop applying.</div>" +
          "</div>";
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
        if (s.code) {
          var cv = AV.CodeViewer.create({ title: "top-level code runs now", lang: "python", code: BAD_CODE, highlights: [2, 3] });
          cv.style.marginTop = "var(--space-4)";
          detail.appendChild(cv);
        }
      }
      function showNode(id) {
        var map = {
          file: "A plain Python file in the dags folder. Its top-level code defines the DAG.",
          processor: "The DagFileProcessor imports files and serializes DAGs. In Airflow 3.x it runs as a fully standalone process.",
          dagbag: "An in-memory collection of parsed DAGs, with per-file import errors captured for the UI.",
          serialized: "The JSON representation of a DAG — structure, schedule, task metadata — but not your Python logic.",
          db: "The serialized_dag table. The scheduler and API server read DAGs from here, never from your file."
        };
        if (map[id]) detail.innerHTML = '<div class="arch-detail-title">' + id + "</div><p>" + map[id] + "</p>";
      }

      // Code comparison
      var codeWrap = container.querySelector("#dp-code");
      var bad = AV.CodeViewer.create({ title: "❌ anti-pattern", lang: "python", code: BAD_CODE });
      var good = AV.CodeViewer.create({ title: "✅ better", lang: "python", code: GOOD_CODE });
      codeWrap.appendChild(bad);
      codeWrap.appendChild(good);

      // Knobs
      container.querySelector("#dp-knobs").innerHTML = KNOBS.map(function (n) {
        return '<div class="card"><div class="card-title"><code>' + n.k + "</code></div>" +
          '<div class="knob-default">default <b>' + n.v + "</b></div><p>" + n.d + "</p></div>";
      }).join("");

      // Engine + controls
      var engine = new AV.AnimationEngine({ steps: STEPS.map(function (s) { return { label: s.label, duration: 2600 }; }), speed: 1 });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        var s = STEPS[idx];
        diagram.setActive(s.nodes, s.edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#dp-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
