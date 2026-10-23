/* ============================================================
   lesson.js — DECICDViz.Lesson
   Render helpers that turn a lesson's metadata (from
   DECICDViz.Curriculum) into a compact, accessible "lesson info"
   panel: level badge, estimated time, learning objectives,
   prerequisites, and authoritative sources with a last-reviewed
   date.

   This component only READS Curriculum; it owns no content. It is
   additive — if a lesson has no metadata, ready() returns false and
   callers render nothing. Every dynamic value is HTML-escaped.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function C() { return NS.Curriculum; }

  function ready(id) {
    return !!(C() && id && C().has(id));
  }

  // Title for a prerequisite chip: prefer the route title, else the id.
  function routeTitle(id) {
    var r = (NS.routes || {})[id];
    return (r && r.title) || id.replace(/-/g, " ");
  }

  function objectivesHTML(id) {
    var objs = C().objectives(id);
    if (!objs.length) return "";
    return '<div class="lesson-block">' +
      '<div class="lesson-block-h">🎯 By the end you can</div>' +
      '<ul class="lesson-objectives">' +
      objs.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") +
      "</ul></div>";
  }

  function prereqHTML(id) {
    var pre = C().prereqs(id);
    if (!pre.length) return '<div class="lesson-block">' +
      '<div class="lesson-block-h">✅ Prerequisites</div>' +
      '<p class="lesson-none">None — a good place to start.</p></div>';
    return '<div class="lesson-block">' +
      '<div class="lesson-block-h">📎 Prerequisites</div>' +
      '<div class="lesson-prereqs">' +
      pre.map(function (pid) {
        return '<a class="lesson-prereq-chip" href="#' + esc(pid) + '">' + esc(routeTitle(pid)) + "</a>";
      }).join("") +
      "</div></div>";
  }

  function sourcesHTML(id) {
    var srcs = C().sourcesFor(id);
    if (!srcs.length) return "";
    var items = srcs.map(function (s) {
      return '<li class="lesson-src">' +
        '<a class="lesson-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(s.title) + "</a>" +
        '<span class="lesson-src-pub"> · ' + esc(s.publisher) + "</span>" +
        (s.section ? '<span class="lesson-src-sec">' + esc(s.section) + "</span>" : "") +
        '<span class="lesson-src-rev">Last reviewed ' + esc(s.reviewed) + "</span>" +
      "</li>";
    }).join("");
    return '<details class="lesson-block lesson-sources">' +
      '<summary class="lesson-block-h">📚 Authoritative sources</summary>' +
      '<ul class="lesson-src-list">' + items + "</ul>" +
      '<p class="lesson-src-note">Official documentation is version-sensitive; the section notes point to the ' +
        "current area to read. Dates mark when the reference was last checked.</p>" +
      "</details>";
  }

  // Build the full info panel as a DOM element (or null if no metadata).
  function infoPanel(id) {
    if (!ready(id)) return null;
    var m = C().meta(id);
    var lvl = C().levelInfo(m.level);
    var wrap = document.createElement("section");
    wrap.className = "section lesson-info";
    wrap.setAttribute("aria-label", "Lesson information");

    var badge =
      '<div class="lesson-meta">' +
        '<span class="lesson-badge" title="' + esc(lvl ? lvl.summary : "") + '">Level ' + esc(m.level) +
          (lvl ? " · " + esc(lvl.title) : "") + "</span>" +
        (m.estMinutes ? '<span class="lesson-est">⏱ ~' + esc(m.estMinutes) + " min</span>" : "") +
        '<a class="lesson-path-link" href="#home">View in learning path →</a>' +
      "</div>";

    wrap.innerHTML =
      badge +
      '<div class="lesson-info-grid">' +
        objectivesHTML(id) +
        prereqHTML(id) +
      "</div>" +
      sourcesHTML(id);
    return wrap;
  }

  NS.Lesson = {
    ready: ready,
    infoPanel: infoPanel,
    // expose granular builders in case a module wants to place them itself
    objectivesHTML: objectivesHTML,
    prereqHTML: prereqHTML,
    sourcesHTML: sourcesHTML
  };
})();
