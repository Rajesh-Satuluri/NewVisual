/* ============================================================
   modules/error-design.js — Error Response Design
   RFC 9457 Problem Details: a consistent, actionable error shape.
   Pick a scenario → see the Problem Details body. Compare a bad
   (leaky, inconsistent) error with a good one.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "error-design",
    title: "Error Response Design",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var cat = AV.data.rest.errorCatalog;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">Errors a client can act on, logs an engineer can trust</h1>' +
          '<p class="module-subtitle">A good error does two jobs: it tells the client exactly what went wrong (so the app shows the right message) and carries a <code>requestId</code> so on-call can find the failing request — without ever leaking internals to the customer. ShopSphere uses <b>RFC 9457 Problem Details</b>.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Pick an error scenario</div>' +
            '<div class="chiprow" id="err-chips">' + cat.map(function (e, i) { return '<button class="chip' + (i === 0 ? " active" : "") + '" data-code="' + e.code + '">' + e.code + "</button>"; }).join("") + "</div>" +
            '<div id="err-body" style="margin-top:var(--space-4)"></div>' +
          "</div>" +
          '<aside class="sticky-side panel"><div class="panel-title">The Problem Details fields</div>' +
            '<dl class="kv">' +
              "<dt>type</dt><dd>A URI identifying the problem kind (often a docs link).</dd>" +
              "<dt>title</dt><dd>Short, human, stable summary.</dd>" +
              "<dt>status</dt><dd>The HTTP status, repeated in the body.</dd>" +
              "<dt>detail</dt><dd>Human explanation specific to <i>this</i> occurrence.</dd>" +
              "<dt>instance</dt><dd>URI of the specific request/resource.</dd>" +
              "<dt>code</dt><dd>App-specific stable code clients can branch on.</dd>" +
              "<dt>requestId</dt><dd>Correlates to your logs/traces.</dd>" +
            "</dl>" +
            '<div class="callout info" style="margin-top:var(--space-3)"><span class="callout-icon">📄</span><div class="callout-body">The media type is <code>application/problem+json</code>. <b>type/title/status/detail/instance</b> are standard; <b>code/requestId</b> are your extensions — both are fine.</div></div>' +
          "</aside>" +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">Bad error vs good error</h2>' +
          '<div class="lab-2col">' +
            '<div class="http-msg"><div class="http-msg-head"><span>🚫 Bad — leaks internals, inconsistent</span><span class="status-pill st-5xx">500</span></div><div class="http-msg-body">' +
              esc('{\n  "error": "Exception",\n  "message": "ERROR: duplicate key value violates unique\\n constraint \\"orders_pkey\\" at OrderRepo.save\\n (/app/src/repo/order.js:87)",\n  "sql": "INSERT INTO orders ..."\n}') +
            "</div></div>" +
            '<div class="http-msg"><div class="http-msg-head"><span>✅ Good — safe, actionable</span><span class="status-pill st-4xx">409</span></div><div class="http-msg-body">' +
              AV.fmtJSON({ type: "https://api.shopsphere.example/problems/duplicate-order", title: "Duplicate order", status: 409, detail: "An order with this idempotency key already exists.", instance: "/v1/orders", code: "DUPLICATE_ORDER", requestId: "req-7f3a21" }) +
            "</div></div>" +
          "</div>" +
          '<div class="callout danger" style="margin-top:var(--space-4)"><span class="callout-icon">🔒</span><div class="callout-body"><b>Never expose</b> stack traces, SQL, file paths, internal hostnames, or credentials in a public error. Log those server-side, keyed by <code>requestId</code>; return only what the client needs. The bad example above hands an attacker your schema and a 500 for a client mistake (should be 409).</div></div>' +
        "</section>" +

        '<section class="section"><h2 class="section-title">Full catalog</h2>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Status</th><th>Title</th><th>code</th><th>detail</th></tr></thead><tbody>' +
          cat.map(function (e) { return "<tr><td><span class=\"status-pill st-" + Math.floor(e.code / 100) + "xx\">" + e.code + "</span></td><td>" + e.title + "</td><td class=\"mono\">" + e.code2 + "</td><td>" + e.detail + "</td></tr>"; }).join("") +
          "</tbody></table></div></section>";

      var bodyEl = container.querySelector("#err-body");
      function show(code) {
        var e = null; for (var i = 0; i < cat.length; i++) if (cat[i].code === code) e = cat[i];
        if (!e) return;
        var problem = {
          type: "https://api.shopsphere.example/problems/" + e.code2.toLowerCase().replace(/_/g, "-"),
          title: e.title, status: e.code, detail: e.detail, instance: "/v1/orders", code: e.code2, requestId: "req-7f3a21"
        };
        bodyEl.innerHTML = '<div class="http-msg"><div class="http-msg-head"><span>Response · application/problem+json</span><span class="status-pill st-' + Math.floor(e.code / 100) + 'xx">' + e.code + "</span></div><div class=\"http-msg-body\">" + AV.fmtJSON(problem) + "</div></div>";
      }
      container.querySelector("#err-chips").addEventListener("click", function (ev) {
        var b = ev.target.closest(".chip"); if (!b) return;
        container.querySelectorAll("#err-chips .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        show(parseInt(b.getAttribute("data-code"), 10));
      });
      show(cat[0].code);
    },
    destroy: function () {}
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
