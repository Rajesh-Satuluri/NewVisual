/* ============================================================
   state-machine.js — SVG state diagram with highlightable states
   SolverViz.StateMachine.create({ states, transitions, viewBox, onSelect })
   state:      { id, label, x, y, w?, h?, kind }  (kind → --state-<kind>)
   transition: { from, to, label }
   Returns { el, setActive(id), flow(from,to), clear(), destroy() }.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.SolverViz = window.SolverViz || {});
  var SVGNS = "http://www.w3.org/2000/svg";

  function mk(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function tokenFor(kind) {
    // state ids use underscores; CSS tokens use hyphens
    return "var(--state-" + String(kind || "none").replace(/_/g, "-") + ")";
  }
  function key(a, b) { return a + "→" + b; }

  function create(opts) {
    opts = opts || {};
    var states = opts.states || [];
    var transitions = opts.transitions || [];
    var onSelect = opts.onSelect || function () {};
    var byId = {};
    states.forEach(function (s) { byId[s.id] = s; });

    var svg = mk("svg", {
      viewBox: opts.viewBox || "0 0 960 470",
      class: "sm-diagram",
      role: "img",
      "aria-label": "Task instance state machine"
    });

    var defs = mk("defs");
    var marker = mk("marker", {
      id: "sm-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse"
    });
    marker.appendChild(mk("path", { d: "M0,0 L10,5 L0,10 z", class: "sm-arrowhead" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    function center(s) { return { x: s.x + (s.w || 130) / 2, y: s.y + (s.h || 48) / 2 }; }

    // Edges
    var edgeEls = {};
    var edgeLayer = mk("g", { class: "sm-edges" });
    transitions.forEach(function (t) {
      var a = byId[t.from], b = byId[t.to];
      if (!a || !b) return;
      var ca = center(a), cb = center(b);
      var line = mk("line", {
        x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y,
        class: "sm-edge", "marker-end": "url(#sm-arrow)", "data-edge": key(t.from, t.to)
      });
      edgeLayer.appendChild(line);
      edgeEls[key(t.from, t.to)] = line;

      if (t.label) {
        // Offset the label along the line so bidirectional pairs don't collide.
        var f = a.x <= b.x ? 0.42 : 0.58;
        var lx = ca.x + (cb.x - ca.x) * f;
        var ly = ca.y + (cb.y - ca.y) * f - 4;
        var lbl = mk("text", { x: lx, y: ly, "text-anchor": "middle", class: "sm-edge-label" });
        lbl.textContent = t.label;
        edgeLayer.appendChild(lbl);
      }
    });
    svg.appendChild(edgeLayer);

    // States
    var stateEls = {};
    var stateLayer = mk("g", { class: "sm-states" });
    states.forEach(function (s) {
      var w = s.w || 130, h = s.h || 48;
      var g = mk("g", {
        class: "sm-state", "data-id": s.id, tabindex: "0", role: "button",
        "aria-label": s.label || s.id, style: "--sm:" + tokenFor(s.kind || s.id)
      });
      g.appendChild(mk("rect", { x: s.x, y: s.y, width: w, height: h, rx: 9, class: "sm-body" }));
      g.appendChild(mk("rect", { x: s.x, y: s.y, width: w, height: 4, rx: 2, class: "sm-strip" }));
      var label = mk("text", {
        x: s.x + w / 2, y: s.y + h / 2 + 4, "text-anchor": "middle", class: "sm-label"
      });
      label.textContent = s.label || s.id;
      g.appendChild(label);

      function pick() { api.select(s.id); onSelect(s.id, s); }
      g.addEventListener("click", pick);
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
      stateEls[s.id] = g;
      stateLayer.appendChild(g);
    });
    svg.appendChild(stateLayer);

    var api = {
      el: svg,
      setActive: function (id) {
        Object.keys(stateEls).forEach(function (k) { stateEls[k].classList.remove("active"); });
        if (stateEls[id]) stateEls[id].classList.add("active");
      },
      flow: function (from, to) {
        Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove("active", "flow-line"); });
        var line = edgeEls[key(from, to)];
        if (line) line.classList.add("active", "flow-line");
      },
      select: function (id) {
        Object.keys(stateEls).forEach(function (k) { stateEls[k].classList.remove("selected"); });
        if (stateEls[id]) stateEls[id].classList.add("selected");
      },
      clear: function () {
        Object.keys(stateEls).forEach(function (k) { stateEls[k].classList.remove("active"); });
        Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove("active", "flow-line"); });
      },
      destroy: function () { if (svg.parentNode) svg.parentNode.removeChild(svg); }
    };
    return api;
  }

  AV.StateMachine = { create: create };
})();
