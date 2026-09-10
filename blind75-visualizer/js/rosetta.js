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

  function render() {
    bodyEl.innerHTML = "";
    var cols = selectedInOrder();
    var single = cols.length === 1;
    DATA.groups.forEach(function (group) {
      var tasks = DATA.tasks.filter(function (t) {
        if (t.group !== group) return false;
        // keep tasks that have a snippet for at least one selected dialect
        return cols.some(function (k) { return t.code && t.code[k]; });
      });
      if (!tasks.length) return;
      var gh = document.createElement("div");
      gh.className = "ros-group";
      gh.textContent = group;
      bodyEl.appendChild(gh);
      tasks.forEach(function (t) {
        var card = document.createElement("div");
        card.className = "ros-card";
        var h = document.createElement("div");
        h.className = "ros-card-h";
        h.innerHTML = '<span class="ros-task">' + esc(t.task) + "</span>" +
          (t.note ? '<span class="ros-note">' + esc(t.note) + "</span>" : "");
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
        if (shown) { card.appendChild(grid); bodyEl.appendChild(card); }
      });
    });
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
