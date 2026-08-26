/*
 * core.js — global registry + canonical category order.
 * Loaded BEFORE any data/*.js file so register() exists when they run.
 */
(function () {
  var CATEGORY_ORDER = [
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stack",
    "Binary Search",
    "Linked List",
    "Trees",
    "Tries",
    "Heap / Priority Queue",
    "Backtracking",
    "Graphs",
    "Advanced Graphs",
    "1-D Dynamic Programming",
    "2-D Dynamic Programming",
    "Greedy",
    "Intervals",
    "Math & Geometry",
    "Bit Manipulation"
  ];

  // Short icon per category (used in the sidebar).
  var CATEGORY_ICON = {
    "Arrays & Hashing": "▦",
    "Two Pointers": "⇄",
    "Sliding Window": "▭",
    "Stack": "≡",
    "Binary Search": "✂",
    "Linked List": "→",
    "Trees": "ᴿ",
    "Tries": "⌥",
    "Heap / Priority Queue": "▲",
    "Backtracking": "↺",
    "Graphs": "◎",
    "Advanced Graphs": "◈",
    "1-D Dynamic Programming": "①",
    "2-D Dynamic Programming": "②",
    "Greedy": "⚑",
    "Intervals": "↔",
    "Math & Geometry": "⊕",
    "Bit Manipulation": "⚙"
  };

  // LeetCode numbers of the classic Blind 75 (the original set this tool shipped
  // with). Every problem whose lc is in this set is part of Blind 75; everything
  // else is a NeetCode-150 addition. Used by the [All 150 | Blind 75] filter.
  var BLIND75_LC = [
    1, 3, 5, 10, 11, 15, 19, 20, 21, 23, 33, 39, 45, 48, 51, 53, 54, 55, 56, 57,
    62, 70, 73, 76, 91, 98, 100, 102, 104, 105, 121, 124, 128, 133, 139, 141, 143,
    152, 153, 155, 190, 191, 198, 200, 207, 208, 211, 212, 213, 215, 217, 226, 230,
    235, 238, 252, 253, 261, 268, 269, 271, 295, 300, 322, 323, 338, 347, 371, 417,
    424, 435, 572, 647, 1143, 1235
  ];
  var BLIND75_SET = {};
  for (var _b = 0; _b < BLIND75_LC.length; _b++) BLIND75_SET[BLIND75_LC[_b]] = true;

  var registry = {}; // category -> [problems]

  window.BLIND75 = {
    CATEGORY_ORDER: CATEGORY_ORDER,
    CATEGORY_ICON: CATEGORY_ICON,
    BLIND75_SET: BLIND75_SET,
    _registry: registry,

    // A problem is Blind 75 if flagged explicitly, else by its LeetCode number.
    isBlind75: function (p) {
      if (p && p.blind75 === true) return true;
      if (p && p.blind75 === false) return false;
      return !!(p && BLIND75_SET[p.lc]);
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
