/* ============================================================
   modules/fundamentals.js — "What is an API?"
   Tabs: Overview (direct-vs-API toggle) · Types · The Contract ·
   Request/Response anatomy. Reading-rich but interactive.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var S = function () { return AV.data.shopsphere; };

  var TYPES = [
    { t: "Public API", who: "Any developer, often with a key", access: "API key / OAuth, rate-limited, versioned", use: "Stripe payments, Google Maps", risk: "Abuse, scraping, cost blow-ups — needs quotas + auth." },
    { t: "Private / internal API", who: "Other teams inside the company", access: "Service identity / mTLS, network-restricted", use: "ShopSphere order→inventory calls", risk: "Still needs authz — 'internal' is not 'trusted'." },
    { t: "Partner API", who: "Named business partners", access: "Contracts + scoped credentials + quotas", use: "A shipping partner reading orders", risk: "A partner retrying aggressively can overwhelm you." },
    { t: "Local / library API", who: "Code in the same process", access: "Language imports, no network", use: "Array.map(), a date library", risk: "Breaking changes ripple at compile/build time." },
    { t: "Remote / web API", who: "Clients over the network", access: "HTTP(S) over the internet/intranet", use: "Everything in this lab", risk: "Network failures, latency, partial outages." }
  ];

  var module = {
    id: "fundamentals",
    title: "What is an API?",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("beginner");
      var s = S();
      container.innerHTML =
        header("Fundamentals", "What is an API?",
          "An API is a <b>controlled interface</b> through which software talks to software. It hides the messy internals behind a stable promise: send this, get that. Learn the contract first — everything else builds on it.") +
        '<div class="tabstrip" role="tablist">' +
          tab("overview", "Overview", true) + tab("types", "Types of APIs") +
          tab("contract", "The Contract") + tab("anatomy", "Request & Response") +
        "</div>" +

        // ── Overview ──
        panelWrap("overview", true,
          sec("A", "Learning objective", "<p>By the end you can explain what an API is, why businesses build them, and read a request/response contract.</p>") +
          sec("B", "The business problem", "<p>When a shopper taps <b>Place Order</b>, should the app write directly to the orders database table? What validates the price, checks stock, enforces who's allowed, and records the sale consistently across five teams and three external partners?</p>") +
          sec("C", "Core idea", "<p>The app sends a request to the <b>order API</b>. The API is an <b>abstraction boundary</b>: it validates the operation, applies business rules, coordinates other systems, and returns a stable response — without exposing the database.</p>") +
          '<div class="panel"><div class="panel-title">Interactive · direct DB access vs API-mediated</div>' +
            '<div class="segmented" id="fund-seg"><button class="active" data-k="api">Via the Order API</button><button data-k="direct">Direct DB access</button></div>' +
            '<div id="fund-compare" style="margin-top:var(--space-4)"></div>' +
          "</div>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚠️</span><div class="callout-body">An API <i>enables</i> validation, access control and a stable contract — it does not <i>guarantee</i> security by itself. Those checks only exist if the server actually implements them.</div></div>'
        ) +

        // ── Types ──
        panelWrap("types", false,
          '<p class="panel-sub">APIs come in several flavors that differ by who calls them and how access is controlled.</p>' +
          '<div class="note-grid">' + TYPES.map(function (x) {
            return '<div class="panel"><div class="panel-title">' + x.t + "</div>" +
              '<dl class="kv"><dt>Consumers</dt><dd>' + x.who + "</dd>" +
              "<dt>Access</dt><dd>" + x.access + "</dd>" +
              "<dt>Example</dt><dd>" + x.use + "</dd>" +
              "<dt>Risk</dt><dd>" + x.risk + "</dd></dl></div>";
          }).join("") + "</div>"
        ) +

        // ── Contract ──
        panelWrap("contract", false,
          '<p class="panel-sub">The contract is: <code>method + path + params + headers + body</code> → <code>status + headers + body</code>. Here is ShopSphere\'s create-order contract, annotated.</p>' +
          '<div class="lab-2col">' +
            '<div><div class="http-msg"><div class="http-msg-head"><span>Request</span><span class="method-pill m-post">POST</span></div>' +
              '<div class="http-msg-body">' + reqBlock() + "</div></div>" +
              '<div class="http-msg" style="margin-top:var(--space-3)"><div class="http-msg-head"><span>Response</span><span class="status-pill st-2xx">201</span></div>' +
              '<div class="http-msg-body">' + respBlock() + "</div></div></div>" +
            '<aside class="panel sticky-side"><div class="panel-title">Who owns each field?</div>' +
              '<dl class="kv">' +
                "<dt>customerId</dt><dd>Client input — but the server re-checks it against the token.</dd>" +
                "<dt>items</dt><dd>Client input — validated for existence & quantity.</dd>" +
                "<dt>total</dt><dd><b>Server-generated.</b> Never trust a client-sent price.</dd>" +
                "<dt>orderId</dt><dd>Server-generated identity.</dd>" +
                "<dt>status</dt><dd>Server-owned business state.</dd>" +
              "</dl>" +
              '<div class="callout info" style="margin-top:var(--space-3)"><span class="callout-icon">🛒</span><div class="callout-body">This sample is illustrative. A real create-order also validates customer identity, product availability, price, currency and permissions server-side.</div></div>' +
            "</aside>" +
          "</div>"
        ) +

        // ── Anatomy ──
        panelWrap("anatomy", false,
          '<p class="panel-sub">Every HTTP message has three parts. Hover the terms; open the deep dive for gotchas.</p>' +
          '<div class="lab-2col">' +
            anatomyCard("Request", [
              ["Request line", "<code>POST /v1/orders HTTP/1.1</code> — method + path + version."],
              ["Headers", "Key/value metadata: <code>Authorization</code>, <code>Content-Type</code>, <code>Idempotency-Key</code>."],
              ["Body", "The payload (JSON here). GET usually has none."],
              ["Path vs query params", "<code>/orders/<b>{id}</b></code> identifies a resource; <code>?status=PAID</code> filters."]
            ]) +
            anatomyCard("Response", [
              ["Status line", "<code>HTTP/1.1 201 Created</code> — the machine-readable outcome."],
              ["Headers", "<code>Content-Type</code>, <code>ETag</code>, <code>Location</code>, rate-limit info."],
              ["Body", "The result or an error document."],
              ["HTTP/1.1 vs HTTP/2", "HTTP/2 is binary & multiplexed — there's no textual request-line on the wire like in 1.1, though the semantics are the same."]
            ]) +
          "</div>"
        );

      AV.ui.wireTabs(container);

      // direct-vs-API comparison
      var compare = container.querySelector("#fund-compare");
      var seg = container.querySelector("#fund-seg");
      function renderCompare(k) {
        if (k === "direct") {
          compare.innerHTML = list("danger", "What direct DB access means", [
            "Every client needs DB credentials and the schema — a huge attack surface.",
            "No shared validation: each client can write an invalid or underpriced order.",
            "No business rules, no audit trail, no rate limiting.",
            "A schema change breaks every client at once — tight coupling.",
            "No stable contract — the database <i>is</i> the contract."
          ]);
        } else {
          compare.innerHTML = list("ok", "What the Order API gives you", [
            "One place to validate input and re-check price & stock.",
            "Authentication + authorization enforced centrally.",
            "Business rules + a durable, auditable order record.",
            "Monitoring, rate limiting, and versioning.",
            "A stable contract clients code against — internals can change freely."
          ]);
        }
      }
      seg.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        seg.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderCompare(b.getAttribute("data-k"));
      });
      renderCompare("api");

      function reqBlock() {
        return '<span class="http-reqline">POST /v1/orders HTTP/1.1</span>\n' +
          '<span class="http-hdr-key">Host</span>: <span class="http-hdr-val">api.shopsphere.example</span>\n' +
          '<span class="http-hdr-key">Authorization</span>: <span class="http-hdr-val">Bearer eyJhbGci…</span>\n' +
          '<span class="http-hdr-key">Content-Type</span>: <span class="http-hdr-val">application/json</span>\n' +
          '<span class="http-hdr-key">Idempotency-Key</span>: <span class="http-hdr-val">9f1c-checkout-42</span>\n\n' +
          json(s.sampleOrderRequest);
      }
      function respBlock() {
        return '<span class="http-reqline">HTTP/1.1 201 Created</span>\n' +
          '<span class="http-hdr-key">Content-Type</span>: <span class="http-hdr-val">application/json</span>\n' +
          '<span class="http-hdr-key">Location</span>: <span class="http-hdr-val">/v1/orders/ORD-10025</span>\n\n' +
          json(s.sampleOrderResponse);
      }
    },
    destroy: function () {}
  };

  // ── small render helpers (shared look with other modules) ──
  function header(eyebrow, title, sub) {
    return '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">' + eyebrow + '</div>' +
      '<h1 class="module-title">' + title + '</h1><p class="module-subtitle">' + sub + "</p></div>";
  }
  function tab(id, label, active) { return '<button class="tab' + (active ? " active" : "") + '" data-tab="' + id + '">' + label + "</button>"; }
  function panelWrap(id, active, inner) { return '<div class="tab-panel' + (active ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function sec(letter, title, body) { return '<div class="lesson-sec"><div class="lesson-sec-h"><span class="lesson-sec-badge">' + letter + "</span>" + title + "</div>" + body + "</div>"; }
  function anatomyCard(title, rows) {
    return '<div class="panel"><div class="panel-title">' + title + "</div><dl class=\"kv\">" +
      rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></div>";
  }
  function list(kind, title, items) {
    var cls = kind === "danger" ? "callout danger" : "callout tip";
    var icon = kind === "danger" ? "🚫" : "✅";
    return '<div class="' + cls + '"><span class="callout-icon">' + icon + '</span><div class="callout-body"><b>' + title + "</b><ul class=\"tick-list\">" +
      items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div></div>";
  }
  function json(obj) {
    var s = JSON.stringify(obj, null, 2);
    return s.replace(/("(\\.|[^"])*")(\s*:)?|\b(true|false|null)\b|(-?\d+\.?\d*)/g, function (m, str, _c, colon, bool, num) {
      if (str) return colon ? '<span class="http-json-key">' + str + "</span>" + colon : '<span class="http-json-str">' + str + "</span>";
      if (bool) return '<span class="http-json-bool">' + bool + "</span>";
      if (num) return '<span class="http-json-num">' + num + "</span>";
      return m;
    });
  }
  AV.fmtJSON = json; // reused by other modules

  AV.registerModule(module);
})();
