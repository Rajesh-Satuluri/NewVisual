/* ============================================================
   master-map.js — interactive concept graph. Route: #master-map
   Concepts clustered by domain; prerequisite/related edges drawn
   between them. Hover highlights neighbours; click opens the
   Concept Workspace. Functions as a primary navigation layer.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  var Module = {
    id: "master-map", title: "Master Map", fullWidth: true,

    render: function (container) {
      var concepts = DL.concepts || [];
      var domains = DL.domains || [];

      // ── layout: domain bands, nodes wrapped in a grid per band ──
      var W = 1200, padX = 24, bandPad = 20, labelH = 34;
      var nodeR = 7, colGap = 150, rowGap = 34, perRow = Math.floor((W - padX * 2) / colGap);
      var pos = {}; // id -> {x,y}
      var y = 20, bands = [];
      domains.forEach(function (d) {
        var list = DL.conceptsByDomain(d);
        var rows = Math.ceil(list.length / perRow);
        var bandH = labelH + rows * rowGap + bandPad;
        list.forEach(function (c, i) {
          var r = Math.floor(i / perRow), col = i % perRow;
          pos[c.id] = { x: padX + col * colGap + 20, y: y + labelH + r * rowGap };
        });
        bands.push({ domain: d, y: y, h: bandH, count: list.length });
        y += bandH;
      });
      var H = y + 20;

      // ── edges from authored prereq/related ──
      var edges = [];
      concepts.forEach(function (c) {
        (c.related || []).forEach(function (rid) {
          if (pos[c.id] && pos[rid]) edges.push({ a: c.id, b: rid, kind: "related" });
        });
        (c.prerequisites || []).forEach(function (pid) {
          if (pos[c.id] && pos[pid]) edges.push({ a: pid, b: c.id, kind: "prereq" });
        });
      });

      var svg = '<svg class="mm-svg" viewBox="0 0 ' + W + " " + H + '" width="100%" preserveAspectRatio="xMidYMin meet">';

      // band backgrounds + labels
      bands.forEach(function (b) {
        svg += '<rect class="mm-band" x="0" y="' + b.y + '" width="' + W + '" height="' + (b.h - bandPad) + '" rx="10"/>';
        svg += '<text class="mm-band-label" x="' + padX + '" y="' + (b.y + 22) + '">' + esc(b.domain) +
          ' <tspan class="mm-band-count">· ' + b.count + '</tspan></text>';
      });

      // edges
      edges.forEach(function (e) {
        var a = pos[e.a], b = pos[e.b];
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 18;
        svg += '<path class="mm-edge mm-edge-' + e.kind + '" data-a="' + e.a + '" data-b="' + e.b +
          '" d="M' + a.x + " " + a.y + " Q" + mx + " " + my + " " + b.x + " " + b.y + '"/>';
      });

      // nodes
      concepts.forEach(function (c) {
        var p = pos[c.id]; if (!p) return;
        svg += '<g class="mm-node' + (c.authored ? " authored" : "") + '" data-id="' + c.id + '" data-slug="' + c.slug + '" tabindex="0" role="link" aria-label="' + esc(c.title) + '">';
        svg += '<circle class="mm-dot" cx="' + p.x + '" cy="' + p.y + '" r="' + nodeR + '"/>';
        svg += '<text class="mm-label" x="' + (p.x + 12) + '" y="' + (p.y + 4) + '">' + esc(trunc(c.title, 16)) + "</text>";
        svg += "</g>";
      });

      svg += "</svg>";

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
        '<div class="module-eyebrow">Master Map</div>' +
        '<h1 class="module-title gradient-text">Database Knowledge Map</h1>' +
        '<p class="module-subtitle">Every concept, clustered by domain. Hover to trace prerequisites &amp; related concepts; click any node to open its workspace. Larger glowing nodes have full deep-dives.</p>' +
        "</div>" +
        '<div class="mm-legend"><span class="mm-key mm-key-prereq">prerequisite →</span>' +
        '<span class="mm-key mm-key-related">related</span>' +
        '<span class="mm-key mm-key-authored">● deep-dive</span></div>' +
        '<div class="mm-wrap">' + svg + "</div>";

      // ── interactivity ──
      var svgEl = container.querySelector(".mm-svg");
      var nodes = svgEl.querySelectorAll(".mm-node");
      var edgeEls = svgEl.querySelectorAll(".mm-edge");

      function highlight(id) {
        var neighbours = {};
        edgeEls.forEach(function (ed) {
          var on = ed.dataset.a === id || ed.dataset.b === id;
          ed.classList.toggle("hot", on);
          if (on) { neighbours[ed.dataset.a] = 1; neighbours[ed.dataset.b] = 1; }
        });
        nodes.forEach(function (nd) {
          nd.classList.toggle("dim", id && !neighbours[nd.dataset.id] && nd.dataset.id !== id);
          nd.classList.toggle("hot", nd.dataset.id === id);
        });
      }
      function clear() { edgeEls.forEach(function (e) { e.classList.remove("hot"); }); nodes.forEach(function (n) { n.classList.remove("dim", "hot"); }); }

      nodes.forEach(function (nd) {
        nd.addEventListener("mouseenter", function () { highlight(nd.dataset.id); });
        nd.addEventListener("mouseleave", clear);
        nd.addEventListener("click", function () { location.hash = "#concept/" + nd.dataset.slug; });
        nd.addEventListener("keydown", function (e) { if (e.key === "Enter") location.hash = "#concept/" + nd.dataset.slug; });
      });
    },
  };

  function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  DL.registerModule(Module);
})();
