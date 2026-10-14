/*
 * search-enhance.js — professional search layer for the DSA practice sidebar.
 *
 * Self-contained, ES5-safe (no build step). Exposes window.SEARCH with:
 *   parse(raw)            -> { raw, text, terms[], facets{}, lc }
 *   passFacets(getters,f) -> bool helper for facet tokens
 *   highlight(title,terms)-> escaped HTML with <mark> around matches
 *   recent() / addRecent(q) / clearRecent()  -> per-browser recent searches
 *   suggestCategory(q, cats) -> closest category name for "did you mean"
 *   ALIASES               -> the synonym table (also used for suggestions)
 *
 * app.js consumes this; if the file is missing the app still works (callers
 * guard on window.SEARCH), so this is a non-invasive enhancement.
 */
(function () {
  // ---- synonym / acronym expansion ------------------------------------------
  // Typed term (lowercased) -> canonical words fed to the fuzzy index. Keeps the
  // search forgiving the way LeetCode / Educative / AlgoMonster search boxes are.
  var ALIASES = {
    "bfs": "breadth first search",
    "dfs": "depth first search",
    "dp": "dynamic programming",
    "ll": "linked list",
    "bst": "binary search tree",
    "pq": "priority queue heap",
    "heap": "heap priority queue",
    "ds": "data structure",
    "2pointer": "two pointers",
    "2pointers": "two pointers",
    "twopointer": "two pointers",
    "sliding": "sliding window",
    "window": "sliding window",
    "backtrack": "backtracking",
    "topo": "topological sort",
    "memo": "memoization",
    "tabulation": "tabulation dynamic programming",
    "knapsack": "knapsack dynamic programming",
    "lis": "longest increasing subsequence",
    "lcs": "longest common subsequence",
    "bit": "bit manipulation",
    "bits": "bit manipulation",
    "xor": "bit manipulation xor",
    "union": "union find disjoint set",
    "unionfind": "union find disjoint set",
    "dsu": "union find disjoint set",
    "mst": "minimum spanning tree",
    "dijkstra": "dijkstra shortest path",
    "trie": "trie prefix tree",
    "mono": "monotonic stack",
    "monotonic": "monotonic stack",
    "prefix": "prefix sum",
    "fastslow": "fast slow pointer",
    "recursion": "recursive",
    "graph": "graphs",
    "tree": "trees",
    "interval": "intervals"
  };

  // Facet token keys the user can type inline, e.g. "diff:hard pattern:sliding".
  // Value -> which problem attribute it filters.
  var FACET_KEYS = {
    "diff": "difficulty",
    "difficulty": "difficulty",
    "status": "status",
    "set": "set",
    "pattern": "pattern",
    "pat": "pattern",
    "ds": "dataStructure",
    "cat": "category",
    "category": "category"
  };

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Break a raw query into facet tokens + free words; expand synonyms; detect a
  // bare LeetCode number.
  function parse(raw) {
    raw = (raw == null ? "" : String(raw)).trim();
    var facets = {}, words = [], lc = null;
    if (!raw) return { raw: "", text: "", terms: [], facets: facets, lc: null };

    var toks = raw.split(/\s+/);
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      var ci = t.indexOf(":");
      if (ci > 0 && ci < t.length - 1) {
        var key = t.slice(0, ci).toLowerCase();
        var val = t.slice(ci + 1).toLowerCase();
        if (FACET_KEYS[key]) { facets[FACET_KEYS[key]] = val; continue; }
      }
      words.push(t);
    }

    var joined = words.join(" ").trim();
    if (/^\d{1,4}$/.test(joined)) lc = parseInt(joined, 10);

    // Expanded text for the fuzzy index + the set of terms we highlight (raw
    // words AND their expansions, so "dp" still bolds "dynamic" in a category).
    var expandedWords = [];
    var termSet = {};
    for (var w = 0; w < words.length; w++) {
      var lw = words[w].toLowerCase();
      var norm = lw.replace(/[^a-z0-9]/g, "");
      var exp = ALIASES[lw] || ALIASES[norm];
      if (exp) {
        expandedWords.push(exp);
        var ep = exp.split(/\s+/);
        for (var e = 0; e < ep.length; e++) if (ep[e].length >= 2) termSet[ep[e]] = true;
      } else {
        expandedWords.push(words[w]);
      }
      if (lw.length >= 2) termSet[lw] = true;
    }
    var terms = [];
    for (var k in termSet) terms.push(k);

    return {
      raw: raw,
      text: expandedWords.join(" ").trim(),
      terms: terms,
      facets: facets,
      lc: lc
    };
  }

  // getters: { difficulty, status, set(bool blind75), pattern, dataStructure,
  // category } — plain strings (status already resolved by caller).
  function passFacets(g, f) {
    if (!f) return true;
    if (f.difficulty && String(g.difficulty || "").toLowerCase().indexOf(f.difficulty) !== 0) return false;
    if (f.status) {
      var s = String(g.status || "");
      if (f.status === "unsolved" || f.status === "unsolve") { if (s === "solved") return false; }
      else if (f.status === "todo") { if (s !== "unsolved" && s !== "") return false; }
      else if (s.indexOf(f.status) !== 0) return false;
    }
    if (f.set) {
      var wantBlind = f.set.indexOf("blind") === 0 || f.set === "75";
      if (wantBlind && !g.blind75) return false;
    }
    if (f.pattern && String(g.pattern || "").toLowerCase().indexOf(f.pattern) === -1) return false;
    if (f.dataStructure && String(g.dataStructure || "").toLowerCase().indexOf(f.dataStructure) === -1) return false;
    if (f.category && String(g.category || "").toLowerCase().indexOf(f.category) === -1) return false;
    return true;
  }

  // Escape `title`, wrapping every matched term in <mark>. Longest terms first so
  // overlapping matches prefer the longer span.
  function highlight(title, terms) {
    if (!title) return "";
    if (!terms || !terms.length) return escHtml(title);
    var parts = [];
    for (var i = 0; i < terms.length; i++) if (terms[i] && terms[i].length >= 2) parts.push(terms[i]);
    if (!parts.length) return escHtml(title);
    parts.sort(function (a, b) { return b.length - a.length; });
    for (var p = 0; p < parts.length; p++) parts[p] = escRe(parts[p]);
    var re;
    try { re = new RegExp("(" + parts.join("|") + ")", "ig"); }
    catch (err) { return escHtml(title); }
    var out = "", last = 0, m;
    while ((m = re.exec(title)) !== null) {
      out += escHtml(title.slice(last, m.index)) + '<mark class="sx-hit">' + escHtml(m[0]) + "</mark>";
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
    }
    out += escHtml(title.slice(last));
    return out;
  }

  // ---- recent searches (per browser, best-effort) ---------------------------
  var RKEY = "blind75:recentSearch:v1";
  var RMAX = 6;
  function recent() {
    try {
      var raw = window.localStorage.getItem(RKEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return (arr && arr.length) ? arr.slice(0, RMAX) : [];
    } catch (e) { return []; }
  }
  function addRecent(q) {
    q = (q == null ? "" : String(q)).trim();
    if (q.length < 2) return;
    try {
      var arr = recent();
      var out = [q];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].toLowerCase() !== q.toLowerCase() && out.length < RMAX) out.push(arr[i]);
      }
      window.localStorage.setItem(RKEY, JSON.stringify(out));
    } catch (e) { /* private mode / blocked storage — ignore */ }
  }
  function clearRecent() {
    try { window.localStorage.removeItem(RKEY); } catch (e) {}
  }

  // "Did you mean <category>" — cheapest useful suggestion: best substring/alias
  // overlap against the known category names.
  function suggestCategory(q, cats) {
    q = (q == null ? "" : String(q)).trim().toLowerCase();
    if (!q || !cats || !cats.length) return null;
    var norm = q.replace(/[^a-z0-9]/g, "");
    var aliasExp = ALIASES[q] || ALIASES[norm] || "";
    var probe = (aliasExp || q).toLowerCase();
    var best = null, bestScore = 0;
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i], cl = c.toLowerCase();
      var score = 0;
      var pw = probe.split(/\s+/);
      for (var w = 0; w < pw.length; w++) {
        if (pw[w].length >= 2 && cl.indexOf(pw[w]) !== -1) score += pw[w].length;
      }
      if (cl.indexOf(q) !== -1) score += q.length + 1;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore >= 3 ? best : null;
  }

  window.SEARCH = {
    ALIASES: ALIASES,
    parse: parse,
    passFacets: passFacets,
    highlight: highlight,
    recent: recent,
    addRecent: addRecent,
    clearRecent: clearRecent,
    suggestCategory: suggestCategory
  };
})();
