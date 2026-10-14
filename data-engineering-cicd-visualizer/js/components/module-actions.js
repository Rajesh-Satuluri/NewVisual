/* ============================================================
   module-actions.js — DECICDViz.ModuleActions
   A small action bar for a learning module: bookmark, mark
   complete, and add-to-revision. All state is persisted via
   DECICDViz.Progress (browser-local). Safe no-op if Progress
   is unavailable.

   Usage: DECICDViz.ModuleActions.mount(container, { id, title });
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function mount(container, cfg) {
    if (!container || !cfg || !cfg.id) return;
    var P = NS.Progress;
    if (!P) return;
    var id = cfg.id, title = cfg.title || id, route = cfg.route || id;

    var bar = document.createElement("div");
    bar.className = "mod-actions";

    function paint() {
      var bm = P.isBookmarked(id), done = P.isComplete(id), rev = P.inRevision(id);
      bar.innerHTML =
        '<button type="button" class="mod-action mod-bookmark' + (bm ? " on" : "") + '" ' +
          'aria-pressed="' + bm + '" title="Bookmark this topic">' +
          '<span aria-hidden="true">' + (bm ? "★" : "☆") + '</span> ' + (bm ? "Bookmarked" : "Bookmark") + '</button>' +
        '<button type="button" class="mod-action mod-revise' + (rev ? " on" : "") + '" ' +
          'aria-pressed="' + rev + '" title="Add to your revision queue">' +
          '<span aria-hidden="true">🔁</span> ' + (rev ? "In revision" : "Revise later") + '</button>' +
        '<button type="button" class="mod-action mod-complete' + (done ? " on" : "") + '" ' +
          'aria-pressed="' + done + '" title="Mark this topic complete">' +
          '<span aria-hidden="true">' + (done ? "✓" : "○") + '</span> ' + (done ? "Completed" : "Mark complete") + '</button>';
    }

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".mod-action");
      if (!btn) return;
      if (btn.classList.contains("mod-bookmark")) P.toggleBookmark(id, title, route);
      else if (btn.classList.contains("mod-complete")) P.toggleComplete(id);
      else if (btn.classList.contains("mod-revise")) {
        if (P.inRevision(id)) P.removeRevision(id);
        else P.addRevision(id, title, route);
      }
      paint();
    });

    paint();
    container.appendChild(bar);
  }

  NS.ModuleActions = { mount: mount };
})();
