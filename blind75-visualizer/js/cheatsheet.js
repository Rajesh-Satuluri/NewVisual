/*
 * cheatsheet.js — the PySpark function cheatsheet panel. A self-contained modal
 * (built in JS) that reads window.PYSPARK_CHEAT and shows, for every function:
 * its signature, a one-line summary, a parameter table (name · type · what it
 * controls), the return type, and a runnable-style example. Group filter chips
 * across the top + a live search box.
 *
 * Opens from #cheatBtn or window.CHEATSHEET.open(). Load AFTER data/spark/cheatsheet.js
 * and the Prism vendor scripts. Reuses the .ros-* modal shell styles + .cht-* extras.
 */
(function () {
  var DATA = window.PYSPARK_CHEAT || { groups: [], fns: [] };
  var overlay = null, bodyEl = null, searchEl = null, active = "all", query = "";

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function codeBlock(src) {
    var pre = document.createElement("pre");
    pre.className = "code-pre ros-pre cht-example";
    var code = document.createElement("code");
    code.className = "language-python";
    code.textContent = src;
    pre.appendChild(code);
    if (window.Prism) { try { window.Prism.highlightElement(code); } catch (e) {} }
    return pre;
  }

  function matchesQuery(fn) {
    if (!query) return true;
    var hay = (fn.name + " " + (fn.signature || "") + " " + (fn.summary || "") + " " +
      (fn.group || "") + " " + (fn.params || []).map(function (p) { return p.name; }).join(" ")).toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function card(fn) {
    var c = document.createElement("div");
    c.className = "cht-card";
    var head = document.createElement("div");
    head.className = "cht-head";
    head.innerHTML =
      '<code class="cht-sig">' + esc(fn.signature || fn.name) + "</code>" +
      (fn.returns ? '<span class="cht-ret">→ ' + esc(fn.returns) + "</span>" : "");
    c.appendChild(head);
    if (fn.summary) { var s = document.createElement("div"); s.className = "cht-sum"; s.innerHTML = fn.summary; c.appendChild(s); }

    if (fn.params && fn.params.length) {
      var tbl = document.createElement("table");
      tbl.className = "cht-params";
      var rows = '<thead><tr><th>Parameter</th><th>Type</th><th>What it controls</th></tr></thead><tbody>';
      fn.params.forEach(function (p) {
        rows += '<tr><td class="cht-p-name">' + esc(p.name) + "</td>" +
          '<td class="cht-p-type">' + esc(p.type || "") + "</td>" +
          '<td class="cht-p-desc">' + (p.desc || "") + "</td></tr>";
      });
      tbl.innerHTML = rows + "</tbody>";
      var scr = document.createElement("div"); scr.className = "cht-params-scroll"; scr.appendChild(tbl);
      c.appendChild(scr);
    }
    if (fn.example) {
      var exWrap = document.createElement("div"); exWrap.className = "cht-ex-wrap";
      exWrap.appendChild(codeBlock(fn.example));
      if (fn.output) { var o = document.createElement("div"); o.className = "cht-out"; o.textContent = "→ " + fn.output; exWrap.appendChild(o); }
      c.appendChild(exWrap);
    }
    if (fn.notes) { var n = document.createElement("div"); n.className = "cht-notes"; n.innerHTML = fn.notes; c.appendChild(n); }
    return c;
  }

  function render() {
    bodyEl.innerHTML = "";
    var any = false;
    DATA.groups.forEach(function (group) {
      if (active !== "all" && active !== group) return;
      var fns = DATA.fns.filter(function (f) { return f.group === group && matchesQuery(f); });
      if (!fns.length) return;
      any = true;
      var gh = document.createElement("div");
      gh.className = "ros-group"; gh.textContent = group;
      bodyEl.appendChild(gh);
      fns.forEach(function (f) { bodyEl.appendChild(card(f)); });
    });
    if (!any) { var e = document.createElement("div"); e.className = "cmdk-none"; e.textContent = "No functions match “" + query + "”."; bodyEl.appendChild(e); }
    bodyEl.scrollTop = 0;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.id = "cheatsheet";
    overlay.className = "ros hidden";
    var chips = '<button class="ros-chip ros-chip-all active" data-g="all">All</button>' +
      DATA.groups.map(function (g) { return '<button class="ros-chip" data-g="' + esc(g) + '">' + esc(g) + "</button>"; }).join("");
    overlay.innerHTML =
      '<div class="ros-box" role="dialog" aria-label="PySpark function cheatsheet">' +
      '  <div class="ros-head">' +
      '    <div class="ros-title">⚡ PySpark cheatsheet <span class="ros-sub">— every function, its parameters, and what they do</span></div>' +
      '    <button class="ros-close" aria-label="Close">✕</button>' +
      '  </div>' +
      '  <div class="cht-search-row"><input class="cht-search" type="text" placeholder="Search functions… (select, join, window, groupBy, when…)" aria-label="Search PySpark functions" /></div>' +
      '  <div class="ros-filter">' + chips + '</div>' +
      '  <div class="ros-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    bodyEl = overlay.querySelector(".ros-body");
    searchEl = overlay.querySelector(".cht-search");
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".ros-close").addEventListener("click", close);
    overlay.querySelectorAll(".ros-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.getAttribute("data-g");
        overlay.querySelectorAll(".ros-chip").forEach(function (c) { c.classList.toggle("active", c === b); });
        render();
      });
    });
    searchEl.addEventListener("input", function () { query = searchEl.value.trim().toLowerCase(); render(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });
  }

  function open() {
    if (!overlay) build();
    render();
    overlay.classList.remove("hidden");
    requestAnimationFrame(function () { overlay.classList.add("open"); if (searchEl) searchEl.focus(); });
    document.body.classList.add("cmdk-lock");
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("cmdk-lock");
    setTimeout(function () { overlay.classList.add("hidden"); }, 160);
  }

  function init() {
    var btn = document.getElementById("cheatBtn");
    if (btn) btn.addEventListener("click", open);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CHEATSHEET = { open: open, close: close };
})();
