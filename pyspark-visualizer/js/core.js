/*
 * core.js — global registry + canonical category order.
 * Loaded BEFORE any data/*.js file so register() exists when they run.
 */
(function () {
  var CATEGORY_ORDER = [
    "DataFrame Basics",
    "Aggregations & GroupBy",
    "Joins",
    "Window Functions",
    "Ranking & Dedup",
    "Date & Time",
    "Arrays, JSON & Nested",
    "Cohort & Time-Series",
    "Performance & Optimization",
    "End-to-End Challenges"
  ];

  // Short icon per category (used in the sidebar).
  var CATEGORY_ICON = {
    "DataFrame Basics": "▦",
    "Aggregations & GroupBy": "Σ",
    "Joins": "⋈",
    "Window Functions": "⊞",
    "Ranking & Dedup": "#",
    "Date & Time": "◷",
    "Arrays, JSON & Nested": "[ ]",
    "Cohort & Time-Series": "↗",
    "Performance & Optimization": "⚡",
    "End-to-End Challenges": "★"
  };

  var registry = {}; // category -> [problems]

  window.PYSPARK = {
    CATEGORY_ORDER: CATEGORY_ORDER,
    CATEGORY_ICON: CATEGORY_ICON,
    _registry: registry,

    // The set filter for this tool scopes by difficulty (All | Easy | Medium | Hard).
    inSet: function (p, setValue) {
      if (!setValue || setValue === "all") return true;
      return !!(p && p.difficulty === setValue);
    },

    register: function (category, problems) {
      if (!registry[category]) registry[category] = [];
      for (var i = 0; i < problems.length; i++) {
        registry[category].push(problems[i]);
      }
    },

    // Return problems flattened in canonical category order.
    all: function () {
      var out = [];
      for (var c = 0; c < CATEGORY_ORDER.length; c++) {
        var cat = CATEGORY_ORDER[c];
        var list = registry[cat] || [];
        for (var i = 0; i < list.length; i++) out.push(list[i]);
      }
      // Include any category that wasn't in the canonical order (safety net).
      for (var key in registry) {
        if (CATEGORY_ORDER.indexOf(key) === -1) {
          out = out.concat(registry[key]);
        }
      }
      return out;
    },

    byCategory: function () {
      var groups = [];
      var seen = {};
      for (var c = 0; c < CATEGORY_ORDER.length; c++) {
        var cat = CATEGORY_ORDER[c];
        if (registry[cat] && registry[cat].length) {
          groups.push({ category: cat, problems: registry[cat] });
          seen[cat] = true;
        }
      }
      for (var key in registry) {
        if (!seen[key]) groups.push({ category: key, problems: registry[key] });
      }
      return groups;
    }
  };
})();
