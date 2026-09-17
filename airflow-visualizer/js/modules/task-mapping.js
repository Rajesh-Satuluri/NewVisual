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
      what: "At parse time Airflow sees a <b>single mapped task</b>. The DAG structure can't yet know how many instances it will become — that depends on data that doesn't exist until the run.",
      why: "DAGs are parsed long before they run, but the number of files/rows/partitions to process is often only known at runtime. Mapping defers the count to execution.",
      how: "You declare <code>process.expand(key=get_files())</code>. At parse time this is one node; the expansion happens later, once the upstream produces its list.",
      when: "Whenever the fan-out width depends on runtime data — N files in a bucket, N rows in a query.",
      mistake: "Trying to build the fan-out with a parse-time Python <code>for</code> loop over data you don't have yet — you'd need the count at import, which you don't.",
      interview: "“Why can't a normal for-loop create these tasks?” The count isn't known at parse time. Dynamic mapping (<code>.expand</code>) resolves N at runtime instead.",
      example: "ShopKart doesn't know how many daily export files S3 holds until the run, so the processing task is mapped, not hard-coded." },
    { source: "success", n: null, mapped: "none", reduce: "idle", label: "2 · Upstream returns a list",
      what: "<code>get_files()</code> runs and returns 4 keys. Only <b>now</b>, at runtime, is the fan-out count known — the mapped task will become one instance per element.",
      why: "The upstream's output <i>is</i> the mapping input. Runtime resolution is the whole point: the graph adapts to today's data, not to a compile-time guess.",
      how: "The mapped task's <code>expand()</code> argument is the upstream's XCom (a list). Airflow reads that list once the upstream succeeds and sizes the expansion from its length.",
      when: "The instant the task feeding <code>.expand()</code> completes.",
      mistake: "Returning something non-iterable (a scalar, or a huge object) from the upstream — <code>expand()</code> needs a list-like, and big lists still flow through XCom.",
      interview: "“Where does the number of mapped instances come from?” The length of the upstream list passed to <code>.expand()</code> — resolved at runtime, capped by <code>max_map_length</code>.",
      example: "ShopKart's <code>get_files()</code> returns four S3 keys today; tomorrow it might return forty, and the DAG sizes itself to match." },
    { source: "success", n: 4, mapped: "queued", reduce: "idle", label: "3 · Expand into N instances",
      what: "Airflow creates <b>4 mapped task instances</b>, each with its own <code>map_index</code> (0–3) and its own log, retry count, and state.",
      why: "Each element is a <i>full</i> task instance, not a loop iteration — so one bad file can fail and retry on its own without touching the other three.",
      how: "The scheduler materializes N task instances from the single mapped definition, indexing them 0..N-1. The UI shows them grouped under the mapped task.",
      when: "Right after the count is known, before the instances start running.",
      mistake: "Expecting one combined log for all elements. Each <code>map_index</code> logs separately — you debug element 2 by opening map_index 2, not one shared log.",
      interview: "“How do you inspect a single failed element of a mapped task?” Open its <code>map_index</code> — each instance has its own log, state, and retries.",
      example: "ShopKart's four file-processing instances run independently; if key 2 is corrupt, only <code>map_index=2</code> fails and retries." },
    { source: "success", n: 4, mapped: "running", reduce: "idle", label: "4 · Run in parallel",
      what: "Each instance processes one key independently — <b>in parallel</b>, subject to pool and concurrency limits, exactly like any other task.",
      why: "Independent instances mean the fan-out actually parallelizes work, and the same pools/priority/concurrency controls apply, so it can't overrun shared resources.",
      how: "The scheduler schedules the mapped instances like normal tasks; <code>max_active_tis_per_dag</code>, pools, and <code>max_active_tasks</code> bound how many run at once.",
      when: "During the mapped task's execution phase.",
      mistake: "Assuming a 1000-wide expansion runs all at once. Concurrency knobs and pools still throttle it — and <code>max_map_length</code> (default 1024) caps the width.",
      interview: "“Do 500 mapped instances all run simultaneously?” No — pools and concurrency limits still apply; they run in waves up to those caps.",
      example: "ShopKart maps over 200 files but its <code>db_pool</code> keeps only a handful hitting the warehouse at a time." },
    { source: "success", n: 4, mapped: "success", reduce: "running", label: "5 · Reduce",
      what: "The downstream task receives the <b>list of every mapped result</b> and combines them. Fan-out, then fan-in — a map followed by a reduce.",
      why: "Most fan-outs need a join at the end: totals, a manifest, a single merged file. The reduce step is where the parallel results become one answer.",
      how: "A normal (non-mapped) task takes the mapped task's output as a list argument; Airflow collects all instances' return values and passes them together.",
      when: "After all mapped instances finish — it waits on the whole group.",
      mistake: "Expecting the reduce to start before every element is done. It depends on the <i>entire</i> mapped group, so one slow instance holds up the join.",
      interview: "“How do you aggregate the results of a mapped task?” A downstream task that takes the mapped output as a list — it runs once, after all instances complete.",
      example: "ShopKart's <code>summarize</code> waits for all four file-processors, then sums their row counts into one daily total." },
    { source: "success", n: 4, mapped: "success", reduce: "success", label: "6 · A runtime map/reduce",
      what: "The graph's <i>shape</i> adapted to the data — a runtime map/reduce, something a parse-time <code>for</code> loop simply can't express.",
      why: "This is the capability dynamic mapping adds: pipelines whose structure is data-driven, sized fresh each run, without regenerating or redeploying the DAG.",
      how: "Combine <code>.expand()</code> with <code>.partial()</code> to fix non-mapped args, or <code>expand_kwargs()</code> to map over full kwarg dicts, for richer runtime fan-outs.",
      when: "Any pipeline where the unit of work is discovered at runtime.",
      mistake: "Regenerating DAG files or using long parse-time loops to fake dynamism — mapping does it natively and keeps parse time flat.",
      interview: "“What problem does dynamic task mapping solve?” Runtime-sized fan-out/fan-in — a data-driven graph shape, with per-element isolation, that static DAG code can't produce.",
      example: "ShopKart's one DAG handles 4 files or 400 with no code change — the map/reduce sizes itself to each day's data." }
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
        detail.innerHTML = AV.Explain.render(STEPS[idx]);
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
