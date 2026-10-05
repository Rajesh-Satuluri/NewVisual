/*
 * ds_groups.js — TWO extra lenses over the Python (DSA) practice problems.
 *
 * The default sidebar groups problems by PATTERN (the 18 chapters: Arrays &
 * Hashing, Two Pointers, …) — HOW you solve them. This file adds two more ways
 * to re-bucket the exact same problems, flipped via the "Group by" toggle:
 *
 *   • Data Structure — WHAT structure the solution is built on (Array & String,
 *     Hash Map & Set, Stack & Queue, Heap, Graph, Trees, …). This cuts ACROSS
 *     patterns: a heap used inside a Greedy or Graph problem lands under Heap.
 *   • Difficulty — Easy / Medium / Hard.
 *
 * Both lenses are 100%-covering and derived (no per-problem id list to drift):
 * the Data Structure bucket is classified from each record's meta.dataStructure
 * string, with the curated category as a fallback, so new problems are placed
 * automatically. Attaches onto window.BLIND75 so app.js can offer the toggle.
 */
(function () {
  var B = window.BLIND75;
  if (!B) return;

  // ---- Data Structure lens ---------------------------------------------------
  var DS_ORDER = [
    "Array & String",
    "Hash Map & Set",
    "Stack & Queue",
    "Linked List",
    "Matrix / 2-D Grid",
    "Trees",
    "Trie",
    "Heap / Priority Queue",
    "Graph & Grid",
    "Union-Find (DSU)",
    "DP Table",
    "Bits & Math"
  ];
  var DS_ICON = {
    "Array & String": "▦",
    "Hash Map & Set": "#",
    "Stack & Queue": "≡",
    "Linked List": "→",
    "Matrix / 2-D Grid": "▚",
    "Trees": "ᴿ",
    "Trie": "⌥",
    "Heap / Priority Queue": "▲",
    "Graph & Grid": "◎",
    "Union-Find (DSU)": "⊍",
    "DP Table": "⊞",
    "Bits & Math": "⊕"
  };

  // Category fallback when the dataStructure string is empty or unrecognised.
  var CAT_DS = {
    "Arrays & Hashing": "Array & String",
    "Two Pointers": "Array & String",
    "Sliding Window": "Array & String",
    "Stack": "Stack & Queue",
    "Binary Search": "Array & String",
    "Linked List": "Linked List",
    "Trees": "Trees",
    "Tries": "Trie",
    "Heap / Priority Queue": "Heap / Priority Queue",
    "Backtracking": "Array & String",
    "Graphs": "Graph & Grid",
    "Advanced Graphs": "Graph & Grid",
    "1-D Dynamic Programming": "DP Table",
    "2-D Dynamic Programming": "DP Table",
    "Greedy": "Array & String",
    "Intervals": "Array & String",
    "Math & Geometry": "Bits & Math",
    "Bit Manipulation": "Bits & Math"
  };

  // Classify a single problem into one canonical data-structure bucket. Keyword
  // tests run most-specific first so the structure that DEFINES the solution wins
  // (e.g. a heap inside a graph problem is classified as Heap, not Graph).
  function dsBucketOf(p) {
    var s = String((p && p.meta && p.meta.dataStructure) || "").toLowerCase();
    var cat = (p && p.category) || "";
    function has() { for (var i = 0; i < arguments.length; i++) if (s.indexOf(arguments[i]) !== -1) return true; return false; }

    if (s) {
      // generate-parentheses / string-building recursion reads as "...stack..."
      // but is really an Array & String problem — rescue it before the stack test.
      if (has("builder") || (has("recursion") && has("string"))) return "Array & String";
      // two-pointer / two-variable scalars (not a hash) despite words like "counter"
      if (/\btwo (pointer|variable|counter|running|extreme)/.test(s)) return "Array & String";
      if (has("trie")) return "Trie";
      if (has("disjoint set", "union-find", "union find")) return "Union-Find (DSU)";
      if (has("heap", "priority")) return "Heap / Priority Queue";
      if (has("tree", "bst")) return "Trees";
      if (has("linked list", "dll", "doubly")) return "Linked List";
      if (has("adjacency", "graph")) return "Graph & Grid";
      if (has("dp", "memo", "rolling state", "dynamic")) return "DP Table";
      if (has("matrix", "2-d array", "2d array", "2-d grid", "2d grid", "grid", "board")) return "Matrix / 2-D Grid";
      if (has("stack", "queue", "deque", "monotonic")) return "Stack & Queue";
      if (has("hash", "set", "frequency", "freq", "counter", "map", "dict")) return "Hash Map & Set";
      if (has("bit", "integer")) return "Bits & Math";
      if (has("array", "string", "sorted", "running", "sliding")) return "Array & String";
    }
    return CAT_DS[cat] || "Array & String";
  }

  // Build [{category, problems}] in DS_ORDER (empty buckets dropped). Any problem
  // that somehow misses every bucket lands in a trailing "Other" safety net.
  function byDataStructure() {
    var buckets = {}; DS_ORDER.forEach(function (d) { buckets[d] = []; });
    var extra = [];
    B.all().forEach(function (p) {
      var k = dsBucketOf(p);
      if (buckets[k]) buckets[k].push(p); else extra.push(p);
    });
    var out = [];
    DS_ORDER.forEach(function (d) { if (buckets[d].length) out.push({ category: d, problems: buckets[d] }); });
    if (extra.length) out.push({ category: "Other", problems: extra });
    return out;
  }

  // ---- Difficulty lens -------------------------------------------------------
  var DIFF_ORDER = ["Easy", "Medium", "Hard"];
  var DIFF_ICON = { "Easy": "🟢", "Medium": "🟡", "Hard": "🔴" };
  function diffBucketOf(p) {
    var d = String((p && p.difficulty) || "").toLowerCase();
    if (d.indexOf("easy") !== -1) return "Easy";
    if (d.indexOf("hard") !== -1) return "Hard";
    return "Medium";
  }
  function byDifficulty() {
    var buckets = { "Easy": [], "Medium": [], "Hard": [] };
    B.all().forEach(function (p) { buckets[diffBucketOf(p)].push(p); });
    var out = [];
    DIFF_ORDER.forEach(function (d) { if (buckets[d].length) out.push({ category: d, problems: buckets[d] }); });
    return out;
  }

  B.DS_ORDER = DS_ORDER;
  B.DS_ICON = DS_ICON;
  B.dsBucketOf = dsBucketOf;
  B.byDataStructure = byDataStructure;
  B.DIFF_ORDER = DIFF_ORDER;
  B.DIFF_ICON = DIFF_ICON;
  B.byDifficulty = byDifficulty;
})();
