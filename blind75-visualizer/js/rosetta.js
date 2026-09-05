/*
 * rosetta.js — the cross-stack "Rosetta Stone" panel + per-stack quick-reference
 * (M5.3). One dataset (data/rosetta.js), two ways to read it:
 *   • "All"       → each task shown in SQL / Pandas / PySpark / Python side by side
 *                   (the cross-stack comparison).
 *   • one stack   → every task's snippet for that stack, top to bottom
 *                   (a quick-reference cheat-sheet).
 *
 * Self-contained modal (built in JS); opens from #rosettaBtn or window.ROSETTA_UI.open().
 * Load AFTER data/rosetta.js and the Prism vendor scripts.
 */
(function () {
  var DATA = window.ROSETTA || { groups: [], tasks: [] };
  var STACKS = [
    { key: "sql", label: "SQL", lang: "sql", color: "#0ca678" },
    { key: "pandas", label: "Pandas", lang: "python", color: "#845ef7" },
    { key: "spark", label: "PySpark", lang: "python", color: "#f76707" },
    { key: "python", label: "Python", lang: "python", color: "#4c8dff" }
  ];
  var byKey = {}; STACKS.forEach(function (s) { byKey[s.key] = s; });

  var overlay = null, bodyEl = null, active = "all";

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
    var cols = active === "all" ? ["sql", "pandas", "spark", "python"] : [active];
    DATA.groups.forEach(function (group) {
      var tasks = DATA.tasks.filter(function (t) {
        if (t.group !== group) return false;
        // in single-stack mode, only tasks that have that stack
        return active === "all" ? true : !!(t.code && t.code[active]);
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
        grid.className = "ros-cols" + (active === "all" ? " ros-cols-multi" : " ros-cols-one");
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
      '    <div class="ros-title">🔀 Cross-stack reference <span class="ros-sub">— the same task in every dialect</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="ros-filter"><button class="ros-chip ros-chip-all" data-stack="all">Compare all</button>' + chips + '</div>' +
      '  <div class="ros-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    overlay.querySelectorAll(".ros-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.getAttribute("data-stack");
        overlay.querySelectorAll(".ros-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        render();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  function setActiveChip() {
    overlay.querySelectorAll(".ros-chip").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-stack") === active);
    });
  }

  function open(stack) {
    if (!overlay) build();
    active = stack && byKey[stack] ? stack : "all";
    setActiveChip();
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
