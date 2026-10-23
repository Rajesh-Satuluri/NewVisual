/* ============================================================
   modules/production-ops.js — Production Operations Lab
   How an API behaves after deployment: the delivery pipeline, API
   gateway responsibilities (vs the application), and SLO basics.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var PIPELINE = {
    viewBox: "0 0 980 140",
    nodes: [
      { id: "dev", label: "Developer", sub: "git push", x: 10, y: 45, w: 110, h: 50, color: "cyan" },
      { id: "git", label: "Git", sub: "PR + review", x: 140, y: 45, w: 100, h: 50, color: "airflow" },
      { id: "ci", label: "CI", sub: "build + test", x: 260, y: 45, w: 100, h: 50, color: "airflow" },
      { id: "img", label: "Image", sub: "container", x: 380, y: 45, w: 100, h: 50, color: "green" },
      { id: "deploy", label: "Deploy", sub: "platform", x: 500, y: 45, w: 100, h: 50, color: "orange" },
      { id: "gw", label: "Gateway", sub: "route + limit", x: 620, y: 45, w: 100, h: 50, color: "airflow" },
      { id: "app", label: "App", sub: "serving", x: 740, y: 45, w: 100, h: 50, color: "purple" },
      { id: "obs", label: "Observe", sub: "metrics+alerts", x: 860, y: 45, w: 110, h: 50, color: "cyan" }
    ],
    edges: [["dev", "git"], ["git", "ci"], ["ci", "img"], ["img", "deploy"], ["deploy", "gw"], ["gw", "app"], ["app", "obs"]]
  };

  var GATEWAY = [
    ["Routing + version routing", "gateway"], ["TLS termination", "gateway"], ["Authentication integration", "gateway"],
    ["Rate limiting / quotas", "gateway"], ["Request size limits", "gateway"], ["Header transforms", "gateway"],
    ["Observability (logs/metrics)", "gateway"],
    ["Business authorization (ownership)", "app"], ["Input validation + business rules", "app"],
    ["Pricing / domain logic", "app"], ["Transactions + persistence", "app"]
  ];

  var module = {
    id: "production-ops",
    title: "Production Operations Lab",
    fullWidth: true,
    _d: null,
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Production</div>' +
          '<h1 class="module-title">Operating the API after deploy</h1>' +
          '<p class="module-subtitle">Shipping is the start, not the finish. Here\'s the delivery pipeline, what the gateway owns vs the application, and the SLOs you run against.</p></div>' +

        '<section class="section"><h2 class="section-title">From commit to serving</h2>' +
          '<div class="arch-canvas" id="po-pipe"></div>' +
          '<div class="note-grid" style="margin-top:var(--space-4)">' +
            mini("Config + secrets", "Config via environment, secrets via a manager (never in the image or git). Same image promoted across environments.") +
            mini("Health checks", "Liveness + readiness endpoints let the platform route traffic only to healthy instances.") +
            mini("Rollback", "Keep the previous version one click away; roll back fast, diagnose after.") +
            mini("Canary / blue-green", "Release to a slice first; watch error rate + latency before full rollout.") +
          "</div></section>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Gateway vs application — who owns what</h2>' +
          '<p class="panel-sub">A gateway handles cross-cutting edge concerns. But <b>business authorization still lives in the application</b> — the gateway can\'t know if <i>this</i> user owns <i>that</i> order.</p>' +
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">🚪 API Gateway</div><ul class="tick-list">' + GATEWAY.filter(function (g) { return g[1] === "gateway"; }).map(function (g) { return "<li>" + g[0] + "</li>"; }).join("") + "</ul></div>" +
            '<div class="panel"><div class="panel-title">⚙️ Application</div><ul class="tick-list">' + GATEWAY.filter(function (g) { return g[1] === "app"; }).map(function (g) { return "<li>" + g[0] + "</li>"; }).join("") + "</ul></div>" +
          "</div>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">⚠️</span><div class="callout-body">Gateway products vary. Don\'t assume the gateway enforces your business rules — verify what it actually does, and keep domain authorization in the service.</div></div>' +
        "</section>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Run against SLOs</h2>' +
          '<div class="stat-row">' + stat("99.9%", "availability target") + stat("< 300ms", "p95 latency") + stat("< 0.1%", "5xx error rate") + stat("43 min", "monthly error budget") + "</div>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Illustrative targets. A real business sets these from user expectations + cost. See <a href="#observability">Observability</a> for the signals behind them.</p>' +
        "</section>";

      var d = AV.ArchDiagram.create({ nodes: PIPELINE.nodes, edges: PIPELINE.edges, viewBox: PIPELINE.viewBox, onSelect: function () {} });
      this._d = d;
      container.querySelector("#po-pipe").appendChild(d.el);
    },
    destroy: function () { if (this._d) { this._d.destroy(); this._d = null; } }
  };

  function mini(t, dd) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + dd + "</p></div>"; }
  function stat(n, l) { return '<div class="stat"><div class="stat-num">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  AV.registerModule(module);
})();
