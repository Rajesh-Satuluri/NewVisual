/* ============================================================
   arch-diagram.js — clickable SVG architecture diagram
   DECICDViz.ArchDiagram.create({ nodes, edges, viewBox, onSelect })
   Returns { el, setActive(nodeIds, edgePairs), clear(),
             selectNode(id), destroy() }.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.DECICDViz = window.DECICDViz || {});
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function center(node) {
    return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  }
  function edgeKey(a, b) { return a + "→" + b; }

  function create(opts) {
    opts = opts || {};
    var nodes = opts.nodes || [];
    var edges = opts.edges || [];
    var onSelect = opts.onSelect || function () {};
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    var svg = el("svg", {
      viewBox: opts.viewBox || "0 0 960 500",
      class: "arch-diagram",
      role: "img",
      "aria-label": "Airflow architecture diagram"
    });

    // Arrowhead marker
    var defs = el("defs");
    var marker = el("marker", {
      id: "arrowhead", viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse"
    });
    marker.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", class: "arch-arrow" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Edges layer (under nodes)
    var edgeEls = {};
    var edgeLayer = el("g", { class: "arch-edges" });
    edges.forEach(function (e) {
      var a = byId[e[0]], b = byId[e[1]];
      if (!a || !b) return;
      var ca = center(a), cb = center(b);
      var line = el("line", {
        x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y,
        class: "arch-edge", "marker-end": "url(#arrowhead)",
        "data-edge": edgeKey(e[0], e[1])
      });
      edgeEls[edgeKey(e[0], e[1])] = line;
      edgeLayer.appendChild(line);
    });
    svg.appendChild(edgeLayer);

    // Nodes layer
    var nodeEls = {};
    var nodeLayer = el("g", { class: "arch-nodes" });
    nodes.forEach(function (n) {
      var g = el("g", { class: "arch-node", "data-id": n.id, tabindex: "0",
        role: "button", "aria-label": n.label });
      var rect = el("rect", {
        x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, class: "node-body"
      });
      // Accent strip along the top edge, colored per node.
      var strip = el("rect", {
        x: n.x, y: n.y, width: n.w, height: 4, rx: 2,
        style: "fill:var(--" + (n.color || "airflow") + ")"
      });
      var label = el("text", {
        x: n.x + n.w / 2, y: n.y + n.h / 2 - 4,
        "text-anchor": "middle", class: "node-label"
      });
      label.textContent = n.label;
      var sub = el("text", {
        x: n.x + n.w / 2, y: n.y + n.h / 2 + 14,
        "text-anchor": "middle", class: "node-sub"
      });
      sub.textContent = n.sub || "";
      g.appendChild(rect);
      g.appendChild(strip);
      g.appendChild(label);
      g.appendChild(sub);

      function pick() { api.selectNode(n.id); onSelect(n.id, n); }
      g.addEventListener("click", pick);
      g.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
      });
      nodeEls[n.id] = g;
      nodeLayer.appendChild(g);
    });
    svg.appendChild(nodeLayer);

    var api = {
      el: svg,

      setActive: function (nodeIds, edgePairs) {
        this.clear();
        (nodeIds || []).forEach(function (id) {
          if (nodeEls[id]) nodeEls[id].classList.add("active");
        });
        (edgePairs || []).forEach(function (p) {
          var line = edgeEls[edgeKey(p[0], p[1])];
          if (line) line.classList.add("active", "flow-line");
        });
      },

      clear: function () {
        Object.keys(nodeEls).forEach(function (id) { nodeEls[id].classList.remove("active"); });
        Object.keys(edgeEls).forEach(function (k) { edgeEls[k].classList.remove("active", "flow-line"); });
      },

      selectNode: function (id) {
        Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("selected"); });
        if (nodeEls[id]) nodeEls[id].classList.add("selected");
      },

      clearSelection: function () {
        Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("selected"); });
      },

      destroy: function () {
        // Listeners live on elements inside svg; dropping the node lets GC reclaim them.
        if (svg.parentNode) svg.parentNode.removeChild(svg);
      }
    };

    return api;
  }

  AV.ArchDiagram = { create: create };
})();
