/*
 * filters.js — a shared, chip-based filter model for the sidebar, used by BOTH
 * the DSA app (app.js) and the generic Practice renderer (problemlab.js).
 *
 * Two selection modes:
 *   • "single" — picking a chip in a facet replaces that facet's selection
 *     (click the active chip again to clear it) — the classic one-at-a-time feel.
 *   • "multi"  — chips toggle independently; a facet with several chips lit
 *     matches ANY of them (OR within a facet, AND across facets).
 *
 * An empty facet means "all". The mode is persisted; selections reset per load
 * (matching the app's previous behavior). The whole thing renders into the shell
 * #filterPanel; the consumer supplies value-getters so the same model can filter
 * problems whose status lives under different id schemes.
 *
 * Exposes window.LABFILTERS. Loaded BEFORE app.js and problemlab.js.
 */
(function () {
  var store = window.BLIND75 && window.BLIND75.store;

  // Facet definitions: value + chip label (+ optional tooltip/class).
  var FACETS = {
    difficulty: {
      label: "Difficulty",
      chips: [
        { v: "Easy", t: "Easy", cls: "d-easy" },
        { v: "Medium", t: "Medium", cls: "d-medium" },
        { v: "Hard", t: "Hard", cls: "d-hard" }
      ]
    },
    status: {
      label: "Status",
      chips: [
        { v: "not-started", t: "New" },
        { v: "learning", t: "Learning" },
        { v: "solved", t: "Solved" },
        { v: "review", t: "★ Review" },
        { v: "due", t: "🔁 Due" }
      ]
    },
    importance: {
      label: "Importance",
      chips: [
        { v: "essential", t: "★★★", title: "Essential" },
        { v: "common", t: "★★", title: "Common" },
        { v: "occasional", t: "★", title: "Occasional" }
      ]
    }
  };
  var FACET_ORDER = ["difficulty", "status", "importance"];

  var model = {
    mode: (store && store.getPref && store.getPref("labFilterMode")) || "single",
    difficulty: {}, status: {}, importance: {}
  };

  var visibleFacets = FACET_ORDER.slice();  // context can hide some (e.g. Learn)
  var counts = null;                        // optional {facet:{value:n}}
  var onChangeCb = null;
  var panelEl = null;

  function anyActive() {
    return FACET_ORDER.some(function (f) { return Object.keys(model[f]).length > 0; });
  }
  function facetSelected(facet) { return Object.keys(model[facet]); }

  // Does a row pass the current selection? getters = { difficulty, status,
  // importance, isReview, isDue } (each takes the row, returns its value/bool).
  function passes(row, getters) {
    for (var i = 0; i < visibleFacets.length; i++) {
      var f = visibleFacets[i];
      var sel = model[f];
      var keys = Object.keys(sel);
      if (!keys.length) continue;              // empty facet = all
      if (f === "status") {
        var ok = keys.some(function (k) {
          if (k === "review") return getters.isReview && getters.isReview(row);
          if (k === "due") return getters.isDue && getters.isDue(row);
          return getters.status && getters.status(row) === k;
        });
        if (!ok) return false;
      } else {
        // difficulty / importance: case-insensitive OR match against the getter
        var val = getters[f] ? getters[f](row) : null;
        if (!matchesCI(keys, val)) return false;
      }
    }
    return true;
  }
  function matchesCI(keys, val) {
    if (val == null) return false;
    var lv = String(val).toLowerCase();
    return keys.some(function (k) { return String(k).toLowerCase() === lv; });
  }

  function toggle(facet, value) {
    var sel = model[facet];
    if (model.mode === "single") {
      var was = !!sel[value];
      model[facet] = {};
      if (!was) model[facet][value] = true;    // click-again clears
    } else {
      if (sel[value]) delete sel[value]; else sel[value] = true;
    }
    render();
    fire();
  }
  function setMode(m) {
    if (m === model.mode) return;
    model.mode = m;
    if (store && store.setPref) store.setPref("labFilterMode", m);
    // Leaving multi with several lit chips: keep them (they still OR); switching
    // is non-destructive, which feels less surprising than silently dropping.
    render();
    fire();
  }
  function clearAll() {
    FACET_ORDER.forEach(function (f) { model[f] = {}; });
    render();
    fire();
  }
  function fire() { if (onChangeCb) onChangeCb(); }

  // ---- rendering ----
  function render() {
    if (!panelEl) return;
    panelEl.innerHTML = "";

    var modeRow = document.createElement("div");
    modeRow.className = "flt-mode";
    modeRow.innerHTML =
      '<span class="flt-mode-lbl">Match</span>' +
      '<div class="flt-mode-seg" role="group" aria-label="Filter selection mode">' +
        '<button class="flt-mode-btn' + (model.mode === "single" ? " active" : "") + '" data-mode="single" title="Pick one per group">Single</button>' +
        '<button class="flt-mode-btn' + (model.mode === "multi" ? " active" : "") + '" data-mode="multi" title="Combine several">Multiple</button>' +
      '</div>' +
      '<button class="flt-clear" title="Clear all filters" aria-label="Clear all filters">Clear</button>';
    panelEl.appendChild(modeRow);
    modeRow.querySelectorAll(".flt-mode-btn").forEach(function (b) {
      b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
    });
    modeRow.querySelector(".flt-clear").addEventListener("click", clearAll);

    visibleFacets.forEach(function (f) {
      var def = FACETS[f];
      var grp = document.createElement("div");
      grp.className = "flt-group";
      grp.appendChild(mk("div", "flt-group-lbl", def.label));
      var chips = document.createElement("div");
      chips.className = "flt-chips";
      def.chips.forEach(function (c) {
        var on = !!model[f][c.v];
        var n = counts && counts[f] && counts[f][c.v];
        var b = document.createElement("button");
        b.className = "flt-chip" + (on ? " on" : "") + (c.cls ? " " + c.cls : "");
        b.setAttribute("aria-pressed", on ? "true" : "false");
        if (c.title) b.title = c.title;
        b.innerHTML = '<span class="flt-chip-t">' + c.t + "</span>" +
          (n != null ? '<span class="flt-chip-n">' + n + "</span>" : "");
        b.addEventListener("click", function () { toggle(f, c.v); });
        chips.appendChild(b);
      });
      grp.appendChild(chips);
      panelEl.appendChild(grp);
    });
  }
  function mk(tag, cls, txt) { var e = document.createElement(tag); e.className = cls; if (txt != null) e.textContent = txt; return e; }

  window.LABFILTERS = {
    init: function (panel, onChange) { panelEl = panel; onChangeCb = onChange; render(); },
    passes: passes,
    anyActive: anyActive,
    facetSelected: facetSelected,
    mode: function () { return model.mode; },
    // Limit which facets show (e.g. Learn hides importance). Pass array of names.
    setContext: function (facets) {
      visibleFacets = (facets || FACET_ORDER).filter(function (f) { return FACET_ORDER.indexOf(f) !== -1; });
      render();
    },
    // Optional per-chip counts: { difficulty:{Easy:n,…}, status:{…}, importance:{…} }
    setCounts: function (c) { counts = c; render(); },
    clear: clearAll,
    reRender: render
  };
})();
