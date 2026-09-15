/*
 * rosetta.js — the cross-stack "Rosetta Stone" panel + per-stack quick-reference
 * (M5.3). One dataset (data/rosetta.js), read as a multi-select comparison:
 *   • "Compare all" → every task shown in SQL / Spark SQL / PySpark / Pandas
 *                     side by side (the full cross-stack comparison).
 *   • pick 2–3       → the same task in just the dialects you chose, side by
 *                     side (e.g. SQL vs PySpark, or SQL + Spark SQL + PySpark).
 *   • pick 1         → every task's snippet for that one stack, top to bottom
 *                     (a single-dialect cheat-sheet).
 * Chips are toggles: click to add or remove a dialect from the comparison;
 * at least one stays selected. "Compare all" is a shortcut that selects them all.
 *
 * Self-contained modal (built in JS); opens from #rosettaBtn or window.ROSETTA_UI.open().
 * Load AFTER data/rosetta.js and the Prism vendor scripts.
 */
(function () {
  var DATA = window.ROSETTA || { groups: [], tasks: [] };
  var STACKS = [
    { key: "sql", label: "SQL", lang: "sql", color: "#0ca678" },
    { key: "sparksql", label: "Spark SQL", lang: "sql", color: "#e8590c" },
    { key: "spark", label: "PySpark", lang: "python", color: "#f76707" },
    { key: "pandas", label: "Pandas", lang: "python", color: "#845ef7" }
  ];
  // Column order in a comparison — SQL dialects together, then the DataFrame APIs.
  // These are table operations, so the four table/SQL dialects are what matters;
  // raw-Python is intentionally excluded (kept in the data but not rendered).
  var ALL_COLS = ["sql", "sparksql", "spark", "pandas"];
  var byKey = {}; STACKS.forEach(function (s) { byKey[s.key] = s; });

  var overlay = null, bodyEl = null;
  // selected: which dialects are currently in the comparison, as a set of keys.
  // Kept in ALL_COLS order at render time. Defaults to all (full comparison).
  var selected = ALL_COLS.slice();
  // sortMode: "used" = one flat list, most-used first (last-minute skim);
  //           "cat"  = grouped by category, most-used first within each group.
  var sortMode = "used";

  // Usage rank (lower = more used) — drives both the flat sort and the
  // within-category order. Ids missing from rankOrder fall to the end.
  var RANK = {}; (DATA.rankOrder || []).forEach(function (id, i) { RANK[id] = i; });
  function rankOf(t) { var r = RANK[t.id]; return r == null ? 9999 : r; }
  function byRank(a, b) { var d = rankOf(a) - rankOf(b); return d !== 0 ? d : (a.task || "").localeCompare(b.task || ""); }
  // Top tier gets a ★ so the eye lands on the must-know tasks first.
  var ESSENTIAL = DATA.essentialCount || 0;
  function isEssential(t) { return rankOf(t) < ESSENTIAL; }

  var SORT_KEY = "blind75_ros_sort";
  function saveSort() { try { localStorage.setItem(SORT_KEY, sortMode); } catch (e) {} }
  function restoreSort() { try { var s = localStorage.getItem(SORT_KEY); if (s === "used" || s === "cat") sortMode = s; } catch (e) {} }
  function syncSortButtons() {
    if (!overlay) return;
    overlay.querySelectorAll(".cht-sort-btn").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-sort") === sortMode); });
  }

  // Copy an arbitrary string, with a clipboard→textarea fallback.
  function copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb && cb(); }, function () { textareaCopy(text); cb && cb(); });
    } else { textareaCopy(text); cb && cb(); }
  }
  function textareaCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }

  function isAll() { return selected.length === ALL_COLS.length; }
  function selectedInOrder() {
    return ALL_COLS.filter(function (k) { return selected.indexOf(k) !== -1; });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function codeBlock(src, lang, label, color) {
    var wrap = document.createElement("div");
    wrap.className = "ros-col";
    var head = document.createElement("div");
    head.className = "ros-col-h";
    head.innerHTML = '<span class="ros-col-name" style="--c:' + color + '">' + esc(label) + "</span>";
    var pre = document.createElement("pre");
    pre.className = "code-pre ros-pre";
    var code = document.createElement("code");
    code.className = "language-" + lang;
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    wrap.appendChild(head); wrap.appendChild(pre);
    return wrap;
  }

  // Does a task have a snippet for at least one of the selected dialects?
  function hasSnippet(t, cols) {
    return cols.some(function (k) { return t.code && t.code[k]; });
  }

  function groupHeader(text) {
    var gh = document.createElement("div");
    gh.className = "ros-group";
    gh.textContent = text;
    return gh;
  }

  function taskCard(t, cols, single) {
    var card = document.createElement("div");
    card.className = "ros-card" + (isEssential(t) ? " ros-essential" : "");
    var h = document.createElement("div");
    h.className = "ros-card-h";
    var star = isEssential(t) ? '<span class="ros-star" title="Essential — one of the most-used; learn these first">★</span> ' : "";
    var titleWrap = document.createElement("div");
    titleWrap.className = "ros-card-title";
    titleWrap.innerHTML = '<span class="ros-task">' + star + esc(t.task) + "</span>" +
      (t.note ? '<span class="ros-note">' + esc(t.note) + "</span>" : "");
    h.appendChild(titleWrap);
    // "Copy all N" — grab every selected-dialect snippet for this task at once.
    var avail = cols.filter(function (k) { return t.code && t.code[k]; });
    if (avail.length > 1) {
      var cbtn = document.createElement("button");
      cbtn.type = "button";
      cbtn.className = "ros-copyall";
      cbtn.textContent = "Copy all " + avail.length;
      cbtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var text = avail.map(function (k) { return "# " + byKey[k].label + "\n" + t.code[k]; }).join("\n\n");
        copyToClipboard(text, function () {
          cbtn.textContent = "Copied!"; cbtn.classList.add("ok");
          setTimeout(function () { cbtn.textContent = "Copy all " + avail.length; cbtn.classList.remove("ok"); }, 1300);
        });
      });
      h.appendChild(cbtn);
    }
    card.appendChild(h);
    var grid = document.createElement("div");
    grid.className = "ros-cols" + (single ? " ros-cols-one" : " ros-cols-multi");
    var shown = 0;
    cols.forEach(function (k) {
      if (!t.code || !t.code[k]) return;
      var s = byKey[k];
      grid.appendChild(codeBlock(t.code[k], s.lang, s.label, s.color));
      shown++;
    });
    if (!shown) return null;
    card.appendChild(grid);
    return card;
  }

  function render() {
    bodyEl.innerHTML = "";
    var cols = selectedInOrder();
    var single = cols.length === 1;

    if (sortMode === "used") {
      // One flat, rank-ordered list — most-used tasks first, regardless of group.
      var tasks = DATA.tasks
        .filter(function (t) { return hasSnippet(t, cols); })
        .slice().sort(byRank);
      bodyEl.appendChild(groupHeader("Most used first · " + tasks.length + " tasks"));
      tasks.forEach(function (t) {
        var card = taskCard(t, cols, single);
        if (card) bodyEl.appendChild(card);
      });
    } else {
      // Grouped by category, most-used first within each group, with a live count.
      DATA.groups.forEach(function (group) {
        var tasks = DATA.tasks
          .filter(function (t) { return t.group === group && hasSnippet(t, cols); })
          .slice().sort(byRank);
        if (!tasks.length) return;
        bodyEl.appendChild(groupHeader(group + " · " + tasks.length));
        tasks.forEach(function (t) {
          var card = taskCard(t, cols, single);
          if (card) bodyEl.appendChild(card);
        });
      });
    }
    bodyEl.scrollTop = 0;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "rosetta";
    overlay.className = "ros hidden";
    var chips = STACKS.map(function (s) {
      return '<button class="ros-chip" data-stack="' + s.key + '" style="--c:' + s.color + '">' + esc(s.label) + "</button>";
    }).join("");
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="Cross-stack reference">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">🔀 Cross-stack reference <span class="ros-sub">— compare any dialects side by side</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="cht-search-row">' +
      '    <div class="cht-sort" role="group" aria-label="Sort order">' +
      '      <button class="cht-sort-btn active" data-sort="used" title="Show every task ordered by how often it is used">⭐ Most used</button>' +
      '      <button class="cht-sort-btn" data-sort="cat" title="Group by category (most used first within each), with a count per category">🗂 By category</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="ros-filter"><button class="ros-chip ros-chip-all" data-stack="all">Compare all</button>' + chips +
      '    <span class="ros-hint">tip: tap dialects to add or remove them from the comparison</span>' +
      '  </div>' +
      '  <div class="ros-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    overlay.querySelectorAll(".ros-chip").forEach(function (b) {
      b.addEventListener("click", function () { onChip(b.getAttribute("data-stack")); });
    });
    overlay.querySelectorAll(".cht-sort-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        sortMode = b.getAttribute("data-sort");
        overlay.querySelectorAll(".cht-sort-btn").forEach(function (c) { c.classList.toggle("active", c === b); });
        saveSort();
        render();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  // Chip click: "all" selects every dialect; a single dialect toggles into/out of
  // the comparison. Clicking a dialect while in "Compare all" starts a fresh subset
  // with just that one (matches the old single-select feel). Never empties the set.
  function onChip(k) {
    if (k === "all") {
      selected = ALL_COLS.slice();
    } else if (isAll()) {
      selected = [k];
    } else {
      var i = selected.indexOf(k);
      if (i === -1) selected.push(k);
      else if (selected.length > 1) selected.splice(i, 1); // keep at least one
    }
    updateChips();
    render();
  }

  function updateChips() {
    var all = isAll();
    overlay.querySelectorAll(".ros-chip").forEach(function (c) {
      var k = c.getAttribute("data-stack");
      if (k === "all") c.classList.toggle("active", all);
      else c.classList.toggle("active", !all && selected.indexOf(k) !== -1);
    });
  }

  function open(stack) {
    if (!overlay) build();
    restoreSort();
    syncSortButtons();
    selected = (stack && byKey[stack]) ? [stack] : ALL_COLS.slice();
    updateChips();
    render();
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    document.body.classList.add("cmdk-lock");
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  function init() {
    var btn = document.getElementById("rosettaBtn");
    if (btn) btn.addEventListener("click", function () { open("all"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.ROSETTA_UI = { open: open, close: close };
})();
