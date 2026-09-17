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
      what: "The DAG processor scans the <code>dags/</code> folder on a timer, building the list of <code>.py</code> files it needs to parse. Think of it as a librarian re-checking the shelf for new or removed books.",
      why: "Airflow has to notice new pipelines and deletions <b>without a restart</b>. A periodic directory scan is the cheap, reliable way to keep the catalog of files fresh while everything else keeps running.",
      how: "Every <code>dag_dir_list_interval</code> (default <b>5&nbsp;min</b>) it re-lists the folder recursively, honoring <code>.airflowignore</code> to skip paths. Finding a file here does <i>not</i> parse it — it only schedules it for parsing.",
      when: "Continuously in the background, on the list interval — independent of how often each file is actually parsed.",
      mistake: "Expecting a brand-new DAG file to appear in the UI instantly. It only shows after the next folder scan <i>and</i> the next parse — up to a few minutes on defaults.",
      interview: "A common probe: “you dropped a new DAG file in — why isn't it showing?” Strong answers separate <i>discovery</i> (the list interval) from <i>parsing</i> (the process interval).",
      example: "ShopKart's deploy job rsyncs a new <code>refunds_etl.py</code> into <code>dags/</code>; the processor lists it within 5&nbsp;minutes and queues it for parsing — no scheduler restart." },

    { label: "2 · Import the module", nodes: ["processor"], edges: [["file", "processor"]], code: true,
      what: "Each discovered file is <b>imported as a Python module</b>, exactly like <code>import your_dag</code>. Every line at the top level — imports, loops, function calls — actually executes.",
      why: "Importing is the only way to <i>discover</i> the DAG objects your file builds. Airflow cannot know your tasks without running the Python that defines them.",
      how: "The processor executes the module in a worker process with a timeout (<code>dagbag_import_timeout</code>). Any <code>DAG</code> object it finds in the module's global scope is collected; anything slow at the top level slows <i>every</i> parse.",
      when: "On every parse of the file — as often as <code>min_file_process_interval</code> (default 30&nbsp;s), for the life of the deployment.",
      mistake: "Putting real work at the top level — a DB query, an API call, <code>Variable.get()</code> — so it re-runs every ~30&nbsp;s per file and drags the whole parsing loop down.",
      interview: "The single most common Airflow performance question. Name the fix: keep top-level code trivial and push I/O into tasks that run at <b>execution</b> time, not <b>parse</b> time.",
      example: "ShopKart once put a <code>requests.get()</code> config fetch at file top level; parsing stalled for every DAG. Moving it into a <code>@task</code> cut parse time back to milliseconds." },

    { label: "3 · Build the DagBag", nodes: ["dagbag"], edges: [["processor", "dagbag"]],
      what: "The DAG objects discovered during import are gathered into a <b>DagBag</b> — an in-memory bag of everything parsed from that file.",
      why: "Airflow needs a structured collection it can validate and serialize, and it needs one bad file <i>not</i> to sink the rest. The DagBag isolates failures per file.",
      how: "As the module imports, Airflow finds every <code>DAG</code> instance in scope and adds it to the bag. If the import <b>raises</b>, the error is caught and recorded against that file as an <code>import_error</code> — other files still parse normally.",
      when: "Once per parse of each file, right after a successful (or failed) import.",
      mistake: "Assuming a syntax error in one DAG breaks the whole deployment. It doesn't — but the broken file keeps its <i>last good</i> serialized version, so edits silently stop applying.",
      interview: "Good follow-up material: “what happens if a DAG file has an error?” Explain that import errors are per-file, shown as UI banners, and leave a stale DAG running.",
      example: "A typo in ShopKart's <code>marketing_etl.py</code> shows a red import-error banner in the UI, while the other 40 DAGs parse and run untouched." },

    { label: "4 · Serialize to JSON", nodes: ["serialized"], edges: [["dagbag", "serialized"]],
      what: "Each DAG in the bag is <b>serialized to JSON</b> — a compact description of its <i>structure</i> (tasks, dependencies, schedule, params), not your Python logic.",
      why: "This JSON is what decouples the rest of Airflow from your code. The scheduler and UI work from a portable snapshot instead of importing risky, slow user modules.",
      how: "Airflow walks the DAG object and emits a JSON blob capturing operator types, task IDs, edges, and arguments. Anything not JSON-serializable (a live connection, a lambda in <code>default_args</code>) fails <i>here</i>, at serialize time.",
      when: "On every parse where the DAG changed, before the result is written to the DB.",
      mistake: "Expecting arbitrary Python objects to survive into the scheduler. Only the serialized <i>structure</i> crosses the boundary — your function bodies run later, on the worker.",
      interview: "Interviewers use this to test the parse-vs-execute split. A senior answer notes that serialization is why the scheduler stays fast and why some objects must be JSON-safe.",
      example: "ShopKart's DAG serializes to ~8&nbsp;KB of JSON describing 13 tasks and their edges — that snapshot, not the <code>.py</code>, is what the scheduler reads all night." },

    { label: "5 · Store in the DB", nodes: ["db"], edges: [["serialized", "db"]],
      what: "The serialized JSON is written to the <code>serialized_dag</code> table in the metadata DB — the canonical copy every other component reads.",
      why: "A single shared table means the scheduler, API server, and UI all agree on <b>one version</b> of the DAG without touching the filesystem or importing anything.",
      how: "The processor upserts the row keyed by <code>dag_id</code>, rewriting it only when the file's hash changes. The scheduler polls this table each loop; workers import the real file only to run a task.",
      when: "After each successful serialize, whenever the DAG's content actually changed.",
      mistake: "Believing an edit applies the instant you save the file. Until the processor re-parses and rewrites this row, the scheduler keeps running the <b>previous</b> serialized version.",
      interview: "This underpins the classic “why won't my change apply?” question. Point to the serialized row and the parse lag as the mechanism, not caching magic.",
      example: "ShopKart pushes a fix at 09:00; the <code>serialized_dag</code> row updates one parse-interval later, and only then does the scheduler build runs from the new structure." },

    { label: "6 · Re-parse on a loop", nodes: ["processor", "db"], edges: [],
      what: "Parsing never stops — each file is re-parsed on a loop so edits, new tasks, and deletions continuously flow into the serialized table.",
      why: "Pipelines change constantly; a steady re-parse keeps the database's view of your DAGs honest without anyone restarting Airflow.",
      how: "A pool of <code>parsing_processes</code> (default 2) parses files in parallel, each file no more often than <code>min_file_process_interval</code> (default <b>30&nbsp;s</b>). In Airflow 3.x this runs as a standalone <code>dag-processor</code>, fully isolated from the scheduler.",
      when: "Forever, in the background, bounded by the process interval and the size of the parsing pool.",
      mistake: "Cranking the interval way down to “see changes faster,” which floods the CPU with constant re-imports and starves the scheduler.",
      interview: "Expect scaling questions: with thousands of DAGs, how do you keep parsing healthy? Mention more <code>parsing_processes</code>, cheap top-level code, and isolating the processor.",
      example: "ShopKart runs 400 DAGs across 4 parsing processes; tuning the interval and keeping imports lean holds total parse time inside the scheduler's comfort zone." }
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
        detail.innerHTML = AV.Explain.render(s);
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
