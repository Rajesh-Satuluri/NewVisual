/*
 * pdcore.js — global registry + canonical category order for the Pandas
 * "Practice" (coding problems) workspace. Mirrors numcore.js / spcore.js so the
 * generic ProblemLab renderer (problemlab.js) can drive it unchanged.
 *
 * A problem data file self-registers on load:
 *     window.PANDAS.register("Selection & Filtering", [ ...problems ]);
 *
 * Loaded BEFORE any data/pandas/problems_*.js file so register() exists.
 */
(function () {
  var CATEGORY_ORDER = [
    "Selection & Filtering",
    "GroupBy & Aggregation",
    "Merge & Join",
    "Reshape & Pivot",
    "Missing Data & Cleaning",
    "Dates & Time Series",
    "Transform & Apply",
    "Real-World Analytics"
  ];

  var CATEGORY_ICON = {
    "Selection & Filtering": "⌕",
    "GroupBy & Aggregation": "Σ",
    "Merge & Join": "⋈",
    "Reshape & Pivot": "⤢",
    "Missing Data & Cleaning": "∅",
    "Dates & Time Series": "◷",
    "Transform & Apply": "⚙",
    "Real-World Analytics": "★"
  };

  var registry = {}; // category -> [problems]

  window.PANDAS = {
    CATEGORY_ORDER: CATEGORY_ORDER,
    CATEGORY_ICON: CATEGORY_ICON,
    _registry: registry,

    inSet: function (p, setValue) {
      if (!setValue || setValue === "all") return true;
      return !!(p && p.difficulty === setValue);
    },

    register: function (category, problems) {
      if (!registry[category]) registry[category] = [];
      for (var i = 0; i < problems.length; i++) registry[category].push(problems[i]);
    },

    all: function () {
      var out = [];
      for (var c = 0; c < CATEGORY_ORDER.length; c++) {
        var list = registry[CATEGORY_ORDER[c]] || [];
        for (var i = 0; i < list.length; i++) out.push(list[i]);
      }
      for (var key in registry) {
        if (CATEGORY_ORDER.indexOf(key) === -1) out = out.concat(registry[key]);
      }
      return out;
    },

    byCategory: function () {
      var groups = [], seen = {};
      for (var c = 0; c < CATEGORY_ORDER.length; c++) {
        var cat = CATEGORY_ORDER[c];
        if (registry[cat] && registry[cat].length) { groups.push({ category: cat, problems: registry[cat] }); seen[cat] = true; }
      }
      for (var key in registry) { if (!seen[key]) groups.push({ category: key, problems: registry[key] }); }
      return groups;
    }
  };
})();
