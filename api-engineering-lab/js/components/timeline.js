/* ============================================================
   timeline.js — horizontal time axis with interval blocks + markers
   AirflowViz.Timeline.create({ items, markers, ticks, span, viewBox })
   item:   { id, label, sub, t0, t1, state }
   marker: { id, t, label }
   tick:   { t, label }
   Returns { el, setActive(itemId), setMarker(markerId), clear(), destroy() }.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var SVGNS = "http://www.w3.org/2000/svg";

  function mk(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function tokenFor(state) {
    return state ? "var(--state-" + String(state).replace(/_/g, "-") + ")" : "var(--airflow)";
  }

  function create(opts) {
    opts = opts || {};
    var items = opts.items || [];
    var markers = opts.markers || [];
    var ticks = opts.ticks || [];
    var span = opts.span || [0, 1];
    var min = span[0], max = span[1];
    var W = 960, H = 220, padL = 50, padR = 50, baseY = 150, innerW = W - padL - padR;

    function x(t) { return padL + ((t - min) / (max - min)) * innerW; }

    var svg = mk("svg", { viewBox: opts.viewBox || "0 0 " + W + " " + H, class: "tl-diagram", role: "img", "aria-label": "Timeline" });

    // Axis baseline
    var axis = mk("g", { class: "tl-axis" });
    axis.appendChild(mk("line", { x1: padL, y1: baseY, x2: W - padR, y2: baseY, class: "tl-axis-line" }));
    ticks.forEach(function (tk) {
      var tx = x(tk.t);
      axis.appendChild(mk("line", { x1: tx, y1: baseY - 5, x2: tx, y2: baseY + 5, class: "tl-tick" }));
      var lbl = mk("text", { x: tx, y: baseY + 20, "text-anchor": "middle", class: "tl-tick-label" });
      lbl.textContent = tk.label;
      axis.appendChild(lbl);
    });
    svg.appendChild(axis);

    // Interval blocks
    var itemEls = {};
    var itemLayer = mk("g", { class: "tl-items" });
    items.forEach(function (it) {
      var x0 = x(it.t0), x1 = x(it.t1);
      var g = mk("g", { class: "tl-item", "data-id": it.id, style: "--tl:" + tokenFor(it.state) });
      g.appendChild(mk("rect", { x: x0 + 3, y: 66, width: Math.max(0, x1 - x0 - 6), height: 48, rx: 7, class: "tl-block" }));
      g.appendChild(mk("rect", { x: x0 + 3, y: 66, width: Math.max(0, x1 - x0 - 6), height: 4, rx: 2, class: "tl-block-strip" }));
      var mid = (x0 + x1) / 2;
      var lbl = mk("text", { x: mid, y: 88, "text-anchor": "middle", class: "tl-block-label" });
      lbl.textContent = it.label;
      g.appendChild(lbl);
      if (it.sub) {
        var sub = mk("text", { x: mid, y: 104, "text-anchor": "middle", class: "tl-block-sub" });
        sub.textContent = it.sub;
        g.appendChild(sub);
      }
      itemEls[it.id] = g;
      itemLayer.appendChild(g);
    });
    svg.appendChild(itemLayer);

    // Markers (run-fire points)
    var markerEls = {};
    var markerLayer = mk("g", { class: "tl-markers" });
    markers.forEach(function (m) {
      var mx = x(m.t);
      var g = mk("g", { class: "tl-marker", "data-id": m.id });
      g.appendChild(mk("line", { x1: mx, y1: baseY, x2: mx, y2: 40, class: "tl-marker-line" }));
      g.appendChild(mk("circle", { cx: mx, cy: baseY, r: 4, class: "tl-marker-dot" }));
      var lbl = mk("text", { x: mx, y: 32, "text-anchor": "middle", class: "tl-marker-label" });
      lbl.textContent = m.label;
      g.appendChild(lbl);
      markerEls[m.id] = g;
      markerLayer.appendChild(g);
    });
    svg.appendChild(markerLayer);

    var api = {
      el: svg,
      setActive: function (id) {
        Object.keys(itemEls).forEach(function (k) { itemEls[k].classList.remove("active"); });
        if (itemEls[id]) itemEls[id].classList.add("active");
      },
      setMarker: function (id) {
        Object.keys(markerEls).forEach(function (k) { markerEls[k].classList.remove("active"); });
        if (markerEls[id]) markerEls[id].classList.add("active");
      },
      setItemState: function (id, state) {
        var g = itemEls[id];
        if (!g) return;
        g.setAttribute("style", "--tl:" + tokenFor(state));
        g.classList.toggle("filled", state && state !== "none");
      },
      clear: function () {
        Object.keys(itemEls).forEach(function (k) { itemEls[k].classList.remove("active"); });
        Object.keys(markerEls).forEach(function (k) { markerEls[k].classList.remove("active"); });
      },
      destroy: function () { if (svg.parentNode) svg.parentNode.removeChild(svg); }
    };
    return api;
  }

  AV.Timeline = { create: create };
})();
