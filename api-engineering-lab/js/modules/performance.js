/* ============================================================
   modules/performance.js — API Performance Lab
   Latency decomposition (tune each component, see the total + the
   biggest contributor) and API/DB efficiency (N+1, unbounded sets,
   repeated downstream calls) before vs after.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "performance",
    title: "Performance Lab",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var comps = AV.data.perf.latencyComponents;
      var vals = comps.map(function (c) { return c.base; });

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Performance</div>' +
          '<h1 class="module-title">Find where the time actually goes</h1>' +
          '<p class="module-subtitle">You can\'t optimize what you don\'t measure. Decompose a request\'s latency, tune each component, and see the total and the biggest contributor. All values are <b>simulated</b>.</p></div>' +

        '<div class="tabstrip">' + T("latency", "Latency decomposition", true) + T("efficiency", "N+1 & efficiency") + "</div>" +

        P("latency", true,
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Tune each component (ms)</div><div id="perf-sliders"></div></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">Breakdown</div><div class="stat-row" id="perf-total"></div>' +
              '<div id="perf-bars" style="margin-top:var(--space-4)"></div></aside>' +
          "</div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🔎</span><div class="callout-body">Optimize the <b>biggest</b> contributor first. Often it\'s the database or an external dependency — shaving 2 ms off serialization while a 300 ms DB query dominates is wasted effort.</div></div>'
        ) +

        P("efficiency", false,
          '<p class="panel-sub">The most common API performance bugs aren\'t slow code — they\'re <i>too many</i> or <i>too large</i> calls.</p>' +
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">🐢 Before (N+1)</div>' +
              '<p>List 20 orders, then fetch each order\'s customer one at a time.</p>' +
              '<div class="code-block"><div class="code-block-body"><code>' +
              '<span class="code-line">SELECT * FROM orders LIMIT 20;        -- 1 query</span>' +
              '<span class="code-line">-- then, per order:</span>' +
              '<span class="code-line">SELECT * FROM customers WHERE id = ?; -- ×20 queries</span></code></div></div>' +
              '<dl class="kv" style="margin-top:var(--space-3)"><dt>Queries</dt><dd class="mono" style="color:var(--red)">21</dd><dt>Sim. latency</dt><dd class="mono">~230 ms</dd></dl></div>' +
            '<div class="panel"><div class="panel-title">⚡ After (batched)</div>' +
              '<p>One query for the orders, one batched query for all their customers (or a join).</p>' +
              '<div class="code-block"><div class="code-block-body"><code>' +
              '<span class="code-line">SELECT * FROM orders LIMIT 20;                 -- 1 query</span>' +
              '<span class="code-line">SELECT * FROM customers WHERE id IN (...);     -- 1 query</span></code></div></div>' +
              '<dl class="kv" style="margin-top:var(--space-3)"><dt>Queries</dt><dd class="mono" style="color:var(--green)">2</dd><dt>Sim. latency</dt><dd class="mono">~45 ms</dd></dl></div>' +
          "</div>" +
          '<div class="note-grid" style="margin-top:var(--space-4)">' +
            mini("Missing indexes", "A filter/sort without an index forces a full scan — add an index on the column (and the cursor sort key).") +
            mini("Unbounded result sets", "Returning everything melts the DB + the client. Always paginate.") +
            mini("Large payloads", "Don't ship fields nobody reads; support field selection / projection.") +
            mini("Repeated downstream calls", "Cache or batch calls to the same dependency instead of calling it in a loop.") +
            mini("Connection pool exhaustion", "Too many concurrent DB calls (often from N+1) exhaust the pool → timeouts cascade.") +
          "</div>"
        );

      AV.ui.wireTabs(container);

      var slidersEl = container.querySelector("#perf-sliders");
      slidersEl.innerHTML = comps.map(function (c, i) {
        return '<div class="field"><label>' + c.label + ': <b class="perf-v" data-i="' + i + '">' + c.base + '</b> ms</label>' +
          '<input type="range" min="' + c.min + '" max="' + c.max + '" value="' + c.base + '" data-i="' + i + '" class="anim-scrub perf-slider" style="width:100%"/></div>';
      }).join("");
      var totalEl = container.querySelector("#perf-total");
      var barsEl = container.querySelector("#perf-bars");

      function render() {
        var total = vals.reduce(function (a, b) { return a + b; }, 0);
        var maxIdx = vals.indexOf(Math.max.apply(null, vals));
        totalEl.innerHTML = '<div class="stat"><div class="stat-num">' + total + '</div><div class="stat-label">ms total (simulated)</div></div>' +
          '<div class="stat"><div class="stat-num" style="color:var(--orange)">' + comps[maxIdx].label.split(" ")[0] + '</div><div class="stat-label">biggest contributor</div></div>';
        barsEl.innerHTML = comps.map(function (c, i) {
          var pct = total ? Math.round(vals[i] / total * 100) : 0;
          return '<div class="pipe-row done" style="opacity:1;grid-template-columns:140px 1fr 60px"><span class="pipe-label">' + c.label + '</span>' +
            '<span class="pipe-bar"><span style="width:' + pct + '%;background:' + (i === maxIdx ? "var(--orange)" : "var(--airflow)") + '"></span></span>' +
            '<span class="pipe-ms">' + vals[i] + "ms</span></div>";
        }).join("");
      }
      slidersEl.addEventListener("input", function (e) {
        var s = e.target.closest(".perf-slider"); if (!s) return;
        var i = parseInt(s.getAttribute("data-i"), 10); vals[i] = parseInt(s.value, 10);
        slidersEl.querySelector('.perf-v[data-i="' + i + '"]').textContent = vals[i];
        render();
      });
      render();
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function mini(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }

  AV.registerModule(module);
})();
