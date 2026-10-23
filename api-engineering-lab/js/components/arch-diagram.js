/* ============================================================
   arch-diagram.js — clickable SVG architecture diagram
   AirflowViz.ArchDiagram.create({ nodes, edges, viewBox, onSelect })

   Edges convey DATA-FLOW DIRECTION:
   - trimmed to node borders so the arrowhead is visible (not hidden
     under the target box), pointing into the target;
   - optional double-heads for bidirectional (read/write) links;
   - optional per-edge label and gentle curve;
   - a subtle animated flow layer runs source → target.

   Edge forms accepted:
     ["a","b"]
     ["a","b","both"]                       // shorthand: bidirectional
     ["a","b",{ dir:"both", label:"read/write", curve: 40 }]

   Returns { el, setActive(nodeIds, edgePairs), clear(),
             selectNode(id), clearSelection(), destroy() }.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var SVGNS = "http://www.w3.org/2000/svg";
  var GAP = 3; // px gap between a box border and the line end

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function center(node) { return { x: node.x + node.w / 2, y: node.y + node.h / 2 }; }
  function edgeKey(a, b) { return a + "→" + b; }

  // Point on node's border along the ray from its center toward (tx,ty),
  // pushed outward by `gap` so the line/arrow doesn't touch the box.
  function boxBorder(n, tx, ty, gap) {
    var cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    var dx = tx - cx, dy = ty - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    var sx = dx !== 0 ? (n.w / 2) / Math.abs(dx) : Infinity;
    var sy = dy !== 0 ? (n.h / 2) / Math.abs(dy) : Infinity;
    var s = Math.min(sx, sy);
    var bx = cx + dx * s, by = cy + dy * s;
    if (gap) { var L = Math.sqrt(dx * dx + dy * dy) || 1; bx += dx / L * gap; by += dy / L * gap; }
    return { x: bx, y: by };
  }

  // Normalize a raw edge entry into { from, to, dir, label, curve }.
  function normEdge(e) {
    var meta = e[2];
    if (typeof meta === "string") meta = { dir: meta };
    meta = meta || {};
    return {
      from: e[0], to: e[1],
      both: meta.dir === "both",
      label: meta.label || null,
      curve: typeof meta.curve === "number" ? meta.curve : 0,
      labelT: typeof meta.labelT === "number" ? meta.labelT : 0.5
    };
  }

  function create(opts) {
    opts = opts || {};
    var nodes = opts.nodes || [];
    var rawEdges = opts.edges || [];
    var onSelect = opts.onSelect || function () {};
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; });

    var svg = el("svg", {
      viewBox: opts.viewBox || "0 0 960 500",
      class: "arch-diagram", role: "img",
      "aria-label": "Architecture diagram showing data flow between components"
    });

    // Arrowhead marker (userSpaceOnUse → constant size; auto-start-reverse
    // lets the same marker serve marker-start reversed for both-way edges).
    var defs = el("defs");
    var marker = el("marker", {
      id: "arch-arrowhead", viewBox: "0 0 10 10", refX: "8.5", refY: "5",
      markerWidth: "11", markerHeight: "11", markerUnits: "userSpaceOnUse",
      orient: "auto-start-reverse"
    });
    marker.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", class: "arch-arrow" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Layers: edges (bottom) → nodes → edge labels (top, always legible).
    var edgeLayer = el("g", { class: "arch-edges" });
    var nodeLayer = el("g", { class: "arch-nodes" });
    var labelLayer = el("g", { class: "arch-edge-labels" });

    // ── Edges ─────────────────────────────────────────────
    var edgeEls = {};
    rawEdges.forEach(function (raw) {
      var e = normEdge(raw);
      var a = byId[e.from], b = byId[e.to];
      if (!a || !b) return;
      var ca = center(a), cb = center(b);
      var start = boxBorder(a, cb.x, cb.y, GAP);
      var end = boxBorder(b, ca.x, ca.y, GAP);

      // Path (straight, or quadratic bow when curve != 0). Positive curve
      // bows to the right of the travel direction. The label anchors at the
      // parametric point labelT along the path (0=source … 1=target), so two
      // opposite lanes between the same nodes don't stack their labels.
      var d, mid, tt = e.labelT, mt = 1 - tt;
      if (e.curve) {
        var ex = end.x - start.x, ey = end.y - start.y;
        var L = Math.sqrt(ex * ex + ey * ey) || 1;
        var px = ey / L, py = -ex / L; // right-hand perpendicular
        var mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2;
        var cxp = mx + px * e.curve, cyp = my + py * e.curve;
        d = "M" + start.x + " " + start.y + " Q" + cxp + " " + cyp + " " + end.x + " " + end.y;
        mid = { x: mt * mt * start.x + 2 * mt * tt * cxp + tt * tt * end.x,
                y: mt * mt * start.y + 2 * mt * tt * cyp + tt * tt * end.y };
      } else {
        d = "M" + start.x + " " + start.y + " L" + end.x + " " + end.y;
        mid = { x: start.x + (end.x - start.x) * tt, y: start.y + (end.y - start.y) * tt };
      }

      var g = el("g", { class: "arch-edge-group", "data-edge": edgeKey(e.from, e.to) });
      var markerAttrs = { d: d, class: "arch-edge", fill: "none", "marker-end": "url(#arch-arrowhead)" };
      if (e.both) markerAttrs["marker-start"] = "url(#arch-arrowhead)";
      var base = el("path", markerAttrs);
      var flow = el("path", { d: d, class: "arch-edge-flow" });
      g.appendChild(base);
      g.appendChild(flow);
      edgeLayer.appendChild(g);
      edgeEls[edgeKey(e.from, e.to)] = g;

      if (e.label) {
        var t = el("text", { x: mid.x, y: mid.y, "text-anchor": "middle", "dominant-baseline": "middle", class: "arch-edge-label" });
        t.textContent = e.label;
        labelLayer.appendChild(t);
      }
    });
    svg.appendChild(edgeLayer);

    // ── Nodes ─────────────────────────────────────────────
    var nodeEls = {};
    nodes.forEach(function (n) {
      var g = el("g", { class: "arch-node", "data-id": n.id, tabindex: "0", role: "button", "aria-label": n.label });
      var rect = el("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 10, class: "node-body" });
      var strip = el("rect", { x: n.x, y: n.y, width: n.w, height: 4, rx: 2, style: "fill:var(--" + (n.color || "airflow") + ")" });
      var label = el("text", { x: n.x + n.w / 2, y: n.y + n.h / 2 - 4, "text-anchor": "middle", class: "node-label" });
      label.textContent = n.label;
      var sub = el("text", { x: n.x + n.w / 2, y: n.y + n.h / 2 + 14, "text-anchor": "middle", class: "node-sub" });
      sub.textContent = n.sub || "";
      g.appendChild(rect); g.appendChild(strip); g.appendChild(label); g.appendChild(sub);

      function pick() { api.selectNode(n.id); onSelect(n.id, n); }
      g.addEventListener("click", pick);
      g.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); }
      });
      nodeEls[n.id] = g;
      nodeLayer.appendChild(g);
    });
    svg.appendChild(nodeLayer);
    svg.appendChild(labelLayer);

    var api = {
      el: svg,
      setActive: function (nodeIds, edgePairs) {
        this.clear();
        (nodeIds || []).forEach(function (id) { if (nodeEls[id]) nodeEls[id].classList.add("active"); });
        (edgePairs || []).forEach(function (p) {
          var g = edgeEls[edgeKey(p[0], p[1])];
          if (g) g.classList.add("active", "flow-line");
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
      destroy: function () { if (svg.parentNode) svg.parentNode.removeChild(svg); }
    };
    return api;
  }

  AV.ArchDiagram = { create: create };
})();
