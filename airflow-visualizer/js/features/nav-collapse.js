/* ============================================================
   nav-collapse.js — collapsible sidebar sections + filter
   Each section header becomes a button (aria-expanded); the list
   animates via the grid-template-rows 1fr↔0fr trick. Collapsed
   state persists per section; a filter auto-expands while typing.
   ============================================================ */
(function () {
  "use strict";
  var KEY = "afviz-nav-collapsed";
  var sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }

  var collapsed = read();
  var sections = Array.prototype.slice.call(sidebar.querySelectorAll(".sidebar-section"));

  sections.forEach(function (sec) {
    var label = sec.querySelector(".sidebar-label");
    var list = sec.querySelector(".sidebar-list");
    if (!label || !list) return;
    var name = label.textContent.trim();
    sec.setAttribute("data-section", name);

    // Header div → button with a chevron.
    var btn = document.createElement("button");
    btn.className = "sidebar-label sidebar-toggle-btn";
    btn.type = "button";
    btn.setAttribute("aria-expanded", "true");
    btn.innerHTML = '<span class="sidebar-chevron" aria-hidden="true">▸</span><span>' + name + "</span>";
    label.parentNode.replaceChild(btn, label);

    // Wrap the list for the height animation.
    var wrap = document.createElement("div");
    wrap.className = "nav-collapse";
    var inner = document.createElement("div");
    inner.className = "nav-collapse-inner";
    list.parentNode.insertBefore(wrap, list);
    inner.appendChild(list);
    wrap.appendChild(inner);

    if (collapsed.indexOf(name) !== -1) { sec.classList.add("collapsed"); btn.setAttribute("aria-expanded", "false"); }

    btn.addEventListener("click", function () {
      var isC = sec.classList.toggle("collapsed");
      btn.setAttribute("aria-expanded", String(!isC));
      var cur = read(), idx = cur.indexOf(name);
      if (isC && idx === -1) cur.push(name);
      if (!isC && idx !== -1) cur.splice(idx, 1);
      write(cur);
    });
  });

  function setCollapsed(sec, isC) {
    sec.classList.toggle("collapsed", isC);
    var b = sec.querySelector(".sidebar-toggle-btn");
    if (b) b.setAttribute("aria-expanded", String(!isC));
  }
  function applyPersisted() { var c = read(); sections.forEach(function (s) { setCollapsed(s, c.indexOf(s.getAttribute("data-section")) !== -1); }); }
  function expandAll(persist) { sections.forEach(function (s) { setCollapsed(s, false); }); if (persist) write([]); }
  function collapseAll() { var n = []; sections.forEach(function (s) { setCollapsed(s, true); n.push(s.getAttribute("data-section")); }); write(n); }

  // Toolbar: filter + collapse/expand-all.
  var toolbar = document.createElement("div");
  toolbar.className = "nav-toolbar";
  toolbar.innerHTML =
    '<input class="nav-search" type="text" placeholder="Filter modules…" aria-label="Filter modules" autocomplete="off" />' +
    '<button class="nav-allbtn icon-btn" type="button" aria-label="Collapse or expand all sections" title="Collapse / expand all">⇅</button>';
  var meter = sidebar.querySelector(".nav-progress");
  if (meter && meter.nextSibling) sidebar.insertBefore(toolbar, meter.nextSibling);
  else sidebar.insertBefore(toolbar, sidebar.firstChild);

  var search = toolbar.querySelector(".nav-search");
  toolbar.querySelector(".nav-allbtn").addEventListener("click", function () {
    var anyOpen = sections.some(function (s) { return !s.classList.contains("collapsed"); });
    if (anyOpen) collapseAll(); else expandAll(true);
  });

  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    if (q) {
      sections.forEach(function (s) {
        setCollapsed(s, false); // temp expand so matches are visible
        var any = false;
        s.querySelectorAll(".sidebar-link").forEach(function (a) {
          var m = a.textContent.toLowerCase().indexOf(q) !== -1;
          if (a.parentNode) a.parentNode.hidden = !m;
          if (m) any = true;
        });
        s.hidden = !any;
      });
    } else {
      sections.forEach(function (s) {
        s.hidden = false;
        s.querySelectorAll(".sidebar-link").forEach(function (a) { if (a.parentNode) a.parentNode.hidden = false; });
      });
      applyPersisted();
    }
  });
})();
