/*
 * learncore.js — multi-stack registry for the "Learn" (concepts) mode of every
 * data-stack (SQL, PySpark, NumPy, Pandas, …). It is the generalization of
 * pycore.js (which powers the Python "Learn" workspace): instead of one global
 * curriculum it keeps one curriculum PER STACK, so a single concept renderer
 * (conceptlab.js) can display any stack's topics.
 *
 * A concept data file self-registers exactly like the Python ones:
 *     window.LEARN.register("sql", "Window Functions", [ ...topics ]);
 *
 * Loaded BEFORE any data/<stack>/concepts*.js file so register() exists.
 */
(function () {
  // Per-stack display metadata + intended curriculum. A section/topic becomes
  // "live" the moment a data file registers a topic under it; everything else in
  // the OUTLINE shows as a "soon" placeholder so the full map is visible early.
  var STACKS = {
    sql: {
      label: "SQL",
      sectionIcon: {
        "Foundations": "◇", "Aggregation": "Σ", "Joins": "⋈",
        "Window Functions": "⊞", "CTEs & Subqueries": "❨❩", "Dates & Text": "◷",
        "Advanced": "✦"
      },
      outline: [
        { section: "Foundations",       topics: ["SELECT & Filtering", "Sorting & Limiting", "CASE & NULLs"] },
        { section: "Aggregation",       topics: ["GROUP BY & Aggregates", "HAVING", "GROUP BY Extensions"] },
        { section: "Joins",             topics: ["Join Types", "Self & Anti Joins"] },
        { section: "Window Functions",  topics: ["Window Functions", "Ranking", "Running Totals & Moving Averages"] },
        { section: "CTEs & Subqueries", topics: ["CTEs", "Recursive CTEs", "Subqueries"] },
        { section: "Dates & Text",      topics: ["Dates & Intervals", "String Functions"] },
        { section: "Advanced",          topics: ["Pivoting", "Set Operations", "Performance & Indexes"] }
      ]
    },
    spark: {
      label: "PySpark",
      sectionIcon: {
        "Foundations": "◇", "Transformations": "⚙", "Performance": "⚡", "Advanced": "✦"
      },
      outline: [
        { section: "Foundations",     topics: ["DataFrame Model & Lazy Eval", "Transformations vs Actions", "Schemas & Types"] },
        { section: "Transformations", topics: ["Narrow vs Wide (Shuffle)", "GroupBy & Aggregations", "Joins & Broadcast", "Window Functions"] },
        { section: "Performance",     topics: ["Partitioning & Skew", "Caching & Persistence", "AQE & Tuning"] },
        { section: "Advanced",        topics: ["Spark SQL", "UDFs vs Built-ins"] }
      ]
    },
    numpy: {
      label: "NumPy",
      sectionIcon: {
        "Foundations": "◇", "Operations": "⚙", "Indexing": "▦", "Advanced": "✦"
      },
      outline: [
        { section: "Foundations", topics: ["ndarray & dtype", "Creating Arrays", "Shape & Reshape"] },
        { section: "Operations",  topics: ["Broadcasting", "Vectorized Ops & ufuncs", "Aggregation & Axis"] },
        { section: "Indexing",    topics: ["Indexing, Slicing & Views", "Boolean & Fancy Indexing"] },
        { section: "Advanced",    topics: ["Linear Algebra", "Random", "Performance vs Lists"] }
      ]
    },
    pandas: {
      label: "Pandas",
      sectionIcon: {
        "Foundations": "◇", "Transform": "⚙", "Combine & Reshape": "▦", "Advanced": "✦"
      },
      outline: [
        { section: "Foundations",       topics: ["Series & DataFrame", "Indexing (loc/iloc)", "Filtering & Boolean"] },
        { section: "Transform",         topics: ["GroupBy & Aggregation", "Apply, Map & Vectorization", "Missing Data"] },
        { section: "Combine & Reshape", topics: ["Merge & Join", "Reshape (pivot/melt)", "Concatenation"] },
        { section: "Advanced",          topics: ["Dates & Resample", "Performance & dtypes"] }
      ]
    }
  };

  var registry = {};   // stack -> section -> [topic]
  var byId = {};       // stack -> (topic id -> topic)

  function ensure(stack) {
    if (!registry[stack]) registry[stack] = {};
    if (!byId[stack]) byId[stack] = {};
  }

  window.LEARN = {
    STACKS: STACKS,

    stackMeta: function (stack) { return STACKS[stack] || { label: stack, sectionIcon: {}, outline: [] }; },
    sectionOrder: function (stack) {
      return (this.stackMeta(stack).outline || []).map(function (o) { return o.section; });
    },
    sectionIcon: function (stack, section) {
      return (this.stackMeta(stack).sectionIcon || {})[section] || "•";
    },
    outline: function (stack) { return this.stackMeta(stack).outline || []; },

    register: function (stack, section, topics) {
      ensure(stack);
      if (!registry[stack][section]) registry[stack][section] = [];
      for (var i = 0; i < topics.length; i++) {
        var t = topics[i];
        t.stack = stack;
        t.section = section;
        registry[stack][section].push(t);
        byId[stack][t.id] = t;
      }
    },

    // Topics for one section, ordered to match the curriculum OUTLINE.
    sectionTopics: function (stack, section) {
      ensure(stack);
      var list = (registry[stack][section] || []).slice();
      var order = null, ol = this.outline(stack);
      for (var o = 0; o < ol.length; o++) if (ol[o].section === section) order = ol[o].topics;
      if (order) {
        list.sort(function (a, b) {
          var ia = order.indexOf(a.title), ib = order.indexOf(b.title);
          if (ia === -1) ia = 999; if (ib === -1) ib = 999;
          return ia - ib;
        });
      }
      return list;
    },

    // All authored topics for a stack, in curriculum order.
    all: function (stack) {
      ensure(stack);
      var out = [], order = this.sectionOrder(stack);
      for (var s = 0; s < order.length; s++) out = out.concat(this.sectionTopics(stack, order[s]));
      for (var key in registry[stack]) {
        if (order.indexOf(key) === -1) out = out.concat(registry[stack][key]);
      }
      return out;
    },

    byId: function (stack, id) { ensure(stack); return byId[stack][id] || null; },

    // Does a stack have any authored topics yet?
    hasContent: function (stack) { return this.all(stack).length > 0; }
  };
})();
