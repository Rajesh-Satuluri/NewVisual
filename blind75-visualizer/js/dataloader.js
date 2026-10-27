/*
 * dataloader.js — on-demand ("lazy by stack") loader for the heavy per-stack
 * data files.
 *
 * WHY: every data/*.js file self-registers its problems/topics at parse time
 * (window.SQLLAB.register(...), etc.). The page used to list ~150 <script> tags
 * totalling ~7.5 MB, all parsed synchronously before the UI became interactive —
 * long enough on slower devices to trip the browser's "Page Unresponsive"
 * watchdog.
 *
 * WHAT: the DSA (Blind 75) practice data stays eager, because app.js builds its
 * search index / byId map from it at parse time. Everything else (SQL, PySpark,
 * NumPy, Pandas, each stack's Learn curriculum, and per-stack extras) is grouped
 * here and injected ONLY when a stack is first opened (on demand). The
 * cross-stack dashboard pulls whatever is still missing when it is opened
 * (ensureAll). This keeps both first-paint cost AND peak memory low: a device
 * never has to download or hold every stack at once, which was tripping both
 * "Page Unresponsive" (CPU) and "Out of Memory" on constrained devices.
 *
 * (A background-hydrate helper is kept below but intentionally NOT auto-run, so
 * unopened stacks are never resident in memory.)
 *
 * The registry cores (core/pycore/spcore/sqlcore/numcore/pdcore/learncore) load
 * in index.html BEFORE this file, so register() always exists when an injected
 * data file runs.
 */
(function () {
  // Ordered file list per group. Paths are relative to index.html (same as the
  // original <script src> values), query strings preserved for cache-busting.
  var MANIFEST = {
    pylearn: [
      "data/python/foundations.js",
      "data/python/lists.js",
      "data/python/sequences.js",
      "data/python/dictionaries.js",
      "data/python/core_python.js",
      "data/python/core_dp_bits.js",
      "data/python/oop_basics.js",
      "data/python/oop_advanced.js",
      "data/python/complexity.js",
      "data/python/toolkit.js",
      "data/python/toolkit2.js",
      "data/python/ds_linear.js",
      "data/python/ds_trees.js",
      "data/python/ds_heap_graph.js",
      "data/python/ds_advanced.js",
      "data/python/cheatsheet.js"
    ],
    spark: [
      "data/pyspark/importance.js?v=20261021pyspark",
      "data/pyspark/domains.js?v=20261021pyspark",
      "data/pyspark/dataframe_basics.js",
      "data/pyspark/aggregations_groupby.js",
      "data/pyspark/joins.js",
      "data/pyspark/window_functions.js",
      "data/pyspark/ranking_dedup.js",
      "data/pyspark/date_time.js",
      "data/pyspark/arrays_json_nested.js",
      "data/pyspark/cohort_time_series.js",
      "data/pyspark/performance_optimization.js",
      "data/pyspark/end_to_end_challenges.js",
      "data/pyspark/advanced_patterns.js",
      "data/pyspark/modern_lakehouse.js",
      "data/pyspark/strings_regex.js",
      "data/pyspark/udfs_functions.js",
      "data/pyspark/nulls_data_quality.js",
      "data/pyspark/percentiles_stats.js",
      "data/pyspark/self_joins_hierarchies.js",
      "data/pyspark/sessionization.js",
      "data/pyspark/debug_predict.js",
      "data/pyspark/bad_data_ingest.js",
      "data/pyspark/rdd_lowlevel.js",
      "data/pyspark/polish_sessionization.js",
      "data/pyspark/polish_percentiles.js",
      "data/pyspark/polish_selfjoins.js",
      "data/pyspark/cdc_versioning_recovery.js",
      "data/pyspark/schema_drift_dq.js",
      "data/pyspark/perf_oom_diagnosis.js",
      "data/pyspark/interview_qa.js",
      "data/spark/cheatsheet.js?v=20261027use"
    ],
    sparklearn: [
      "data/pyspark/concepts_foundations.js",
      "data/pyspark/concepts_shuffle.js",
      "data/pyspark/concepts_transformations.js",
      "data/pyspark/concepts_performance.js",
      "data/pyspark/concepts_advanced.js",
      "data/pyspark/concepts_modern.js",
      "data/pyspark/concepts_infra.js",
      "data/pyspark/concepts_execution.js",
      "data/pyspark/exec_guide.js"
    ],
    sql: [
      "data/sql/importance.js",
      "data/sql/aggregation.js",
      "data/sql/aggregation2.js",
      "data/sql/aggregation3.js",
      "data/sql/joins.js",
      "data/sql/joins2.js",
      "data/sql/cte_joins.js",
      "data/sql/cte2.js",
      "data/sql/window_functions.js",
      "data/sql/window2.js",
      "data/sql/ranking.js",
      "data/sql/ranking2.js",
      "data/sql/filtering_subqueries.js",
      "data/sql/filtering2.js",
      "data/sql/filtering3.js",
      "data/sql/string_date.js",
      "data/sql/string_date2.js",
      "data/sql/set_ops.js",
      "data/sql/pivot.js",
      "data/sql/recursive.js",
      "data/sql/gaps_islands.js",
      "data/sql/dml_ddl.js",
      "data/sql/misc2.js",
      "data/sql/nulls_dq.js",
      "data/sql/window_extra.js",
      "data/sql/gaps_islands2.js",
      "data/sql/pivot2.js",
      "data/sql/timeseries_cohort.js",
      "data/sql/domains.js",
      "data/sql/practice_extra.js",
      "data/sql/interview_qa.js",
      "data/sql/cheatsheet.js"
    ],
    sqllearn: [
      "data/sql/concepts_foundations.js",
      "data/sql/concepts_aggregation.js",
      "data/sql/concepts_joins.js",
      "data/sql/concepts_window.js",
      "data/sql/concepts_window2.js",
      "data/sql/concepts_ctes.js",
      "data/sql/concepts_dates_text.js",
      "data/sql/concepts_advanced.js",
      "data/sql/concepts_design.js"
    ],
    numpy: [
      "data/numpy/problems_arrays_creation.js",
      "data/numpy/problems_indexing_slicing.js",
      "data/numpy/problems_broadcasting.js",
      "data/numpy/problems_aggregation_axis.js",
      "data/numpy/problems_reshaping.js",
      "data/numpy/problems_boolean_fancy.js",
      "data/numpy/problems_linalg.js",
      "data/numpy/problems_real_world.js"
    ],
    numpylearn: [
      "data/numpy/concepts_foundations.js",
      "data/numpy/concepts_broadcasting.js",
      "data/numpy/concepts_operations.js",
      "data/numpy/concepts_indexing.js",
      "data/numpy/concepts_advanced.js"
    ],
    pandas: [
      "data/pandas/problems_selection.js",
      "data/pandas/problems_groupby.js",
      "data/pandas/problems_merge.js",
      "data/pandas/problems_reshape.js",
      "data/pandas/problems_missing.js",
      "data/pandas/problems_dates.js",
      "data/pandas/problems_transform.js",
      "data/pandas/problems_analytics.js"
    ],
    pandaslearn: [
      "data/pandas/concepts_foundations.js",
      "data/pandas/concepts_groupby.js",
      "data/pandas/concepts_transform.js",
      "data/pandas/concepts_combine.js",
      "data/pandas/concepts_advanced.js"
    ]
  };

  // Background-hydration priority: the heaviest practice stacks first (so the
  // cross-stack dashboard fills quickly), then the Learn curricula.
  var HYDRATE_ORDER = [
    "sql", "spark", "numpy", "pandas",
    "pylearn", "sqllearn", "sparklearn", "numpylearn", "pandaslearn"
  ];

  var groupState = {}; // name -> { status: "idle"|"loading"|"loaded", cbs: [] }
  var hydrated = false;
  var hydratedCbs = [];

  function stateOf(name) {
    if (!groupState[name]) groupState[name] = { status: "idle", cbs: [] };
    return groupState[name];
  }

  function flush(st) {
    var cbs = st.cbs;
    st.cbs = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](); } catch (e) { /* a callback throwing must not stall the rest */ }
    }
  }

  // Load one group (idempotent, de-duped). cb fires once that group is ready.
  function loadGroup(name, cb) {
    if (!MANIFEST[name]) { if (cb) cb(); return; } // unknown/eager group -> no-op
    var st = stateOf(name);
    if (st.status === "loaded") { if (cb) cb(); return; }
    if (cb) st.cbs.push(cb);
    if (st.status === "loading") return;
    st.status = "loading";

    var files = MANIFEST[name];
    var pending = files.length;
    if (pending === 0) { st.status = "loaded"; flush(st); return; }

    for (var i = 0; i < files.length; i++) {
      (function (src) {
        var s = document.createElement("script");
        s.src = src;
        s.async = false; // preserve in-group order; registration is independent anyway
        s.onload = s.onerror = function () {
          s.onload = s.onerror = null;
          pending--;
          if (pending === 0) {
            st.status = "loaded";
            try {
              document.dispatchEvent(makeEvent("blind75:data-group", { group: name }));
            } catch (e) {}
            flush(st);
          }
        };
        document.head.appendChild(s);
      })(files[i]);
    }
  }

  function makeEvent(type, detail) {
    var ev;
    try {
      ev = new CustomEvent(type, { detail: detail });
    } catch (e) {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent(type, false, false, detail);
    }
    return ev;
  }

  function toList(groups) {
    if (!groups) return [];
    return typeof groups === "string" ? [groups] : groups;
  }

  function schedule(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 1200 });
    else setTimeout(fn, 60);
  }

  window.DATALOADER = {
    // Is this a known lazy group? (eager data isn't in the manifest.)
    has: function (name) { return !!MANIFEST[name]; },

    // Already fully loaded?
    loaded: function (name) {
      return !MANIFEST[name] || stateOf(name).status === "loaded";
    },

    // Are ALL of these groups loaded?
    loadedAll: function (groups) {
      var list = toList(groups);
      for (var i = 0; i < list.length; i++) {
        if (!this.loaded(list[i])) return false;
      }
      return true;
    },

    // Is every known group loaded? (used to decide if the dashboard can render
    // immediately or must first pull the remaining stacks).
    allLoaded: function () {
      for (var k in MANIFEST) {
        if (MANIFEST.hasOwnProperty(k) && stateOf(k).status !== "loaded") return false;
      }
      return true;
    },

    // Ensure one or more groups are present, then call cb once.
    ensure: function (groups, cb) {
      var list = toList(groups);
      var remaining = list.length;
      var done = false;
      if (remaining === 0) { if (cb) cb(); return; }
      function one() {
        remaining--;
        if (remaining === 0 && !done) { done = true; if (cb) cb(); }
      }
      for (var i = 0; i < list.length; i++) loadGroup(list[i], one);
    },

    // Ensure every known group (used by the cross-stack dashboard).
    ensureAll: function (cb) {
      var names = [];
      for (var k in MANIFEST) if (MANIFEST.hasOwnProperty(k)) names.push(k);
      this.ensure(names, cb);
    },

    hydrated: function () { return hydrated; },

    // Register a callback for when background hydration completes (fires
    // immediately if already hydrated).
    onHydrated: function (cb) {
      if (hydrated) { cb(); return; }
      hydratedCbs.push(cb);
    },

    // Kick off gentle, yielded background loading of all remaining groups.
    hydrate: function () {
      var idx = 0;
      function next() {
        if (idx >= HYDRATE_ORDER.length) {
          hydrated = true;
          var cbs = hydratedCbs;
          hydratedCbs = [];
          for (var i = 0; i < cbs.length; i++) { try { cbs[i](); } catch (e) {} }
          try { document.dispatchEvent(makeEvent("blind75:data-hydrated", {})); } catch (e) {}
          return;
        }
        loadGroup(HYDRATE_ORDER[idx++], function () { schedule(next); });
      }
      schedule(next);
    }
  };
})();
