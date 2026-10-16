/* ============================================================
   modules/openapi-studio.js — OpenAPI & Documentation Studio
   Edit the ShopSphere OpenAPI spec (simplified validation), see it
   rendered as docs, understand what one spec drives, and explore
   how a contract change ripples to clients + tests.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DOCS = [
    { m: "POST", p: "/v1/orders", summary: "Create an order", auth: true, params: ["Idempotency-Key (header, optional)"], body: "NewOrder (customerId, items[])", responses: ["201 Order", "401", "403", "422"] },
    { m: "GET", p: "/v1/orders/{orderId}", summary: "Get an order", auth: true, params: ["orderId (path, required)"], body: "—", responses: ["200 Order", "404"] }
  ];

  var DRIVES = [
    ["📖 Interactive docs", "Render try-it-out docs (Swagger UI / Redoc) straight from the spec — always in sync with the contract."],
    ["📦 Client SDKs", "Generate typed clients in many languages (openapi-generator) so consumers don't hand-write HTTP."],
    ["🧱 Server stubs", "Scaffold server interfaces/routes so implementation matches the contract."],
    ["✅ Contract tests", "Assert the running API still matches the spec — catch breaking changes in CI."],
    ["🚪 Gateway config", "Some gateways import the spec to configure routing, validation, and rate limits."],
    ["🤝 Partner onboarding", "A single authoritative document partners read — fewer kickoff calls, fewer tickets."]
  ];

  var module = {
    id: "openapi-studio",
    title: "OpenAPI & Docs Studio",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var yaml = AV.data.impl.openapiYaml;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation</div>' +
          '<h1 class="module-title">One spec drives docs, SDKs, and tests</h1>' +
          '<p class="module-subtitle">OpenAPI describes your contract once, in a machine-readable file. Edit the ShopSphere spec, see it rendered as docs, and watch how a change ripples to every consumer.</p></div>' +

        '<div class="tabstrip">' + T("spec", "Spec (editable)", true) + T("docs", "Rendered docs") + T("drives", "What it drives") + T("evolve", "Contract evolution") + "</div>" +

        P("spec", true,
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">openapi.yaml</div><textarea class="textarea mono" id="oa-src" rows="22" spellcheck="false">' + esc(yaml) + "</textarea>" +
              '<button class="btn btn-primary btn-sm" id="oa-validate" style="margin-top:var(--space-2)">Validate</button></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">Structure</div><div id="oa-struct"></div>' +
              '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Validation here is <b>simplified</b> (structural checks). Production uses a real validator (Spectral, openapi-validator) that checks the full OpenAPI 3.1 schema.</p></aside>' +
          "</div>"
        ) +

        P("docs", false,
          '<p class="panel-sub">The same spec, rendered the way a consumer reads it. In production this is served live from the file (Swagger UI / Redoc).</p>' +
          DOCS.map(function (d) {
            return '<div class="panel"><div class="oa-doc-head"><span class="method-pill m-' + d.m.toLowerCase() + '">' + d.m + '</span><span class="mono">' + d.p + '</span>' + (d.auth ? '<span class="status-pill st-4xx" title="requires auth">🔒 auth</span>' : "") + "</div>" +
              '<p style="margin-top:var(--space-2)">' + d.summary + "</p>" +
              '<dl class="kv"><dt>Parameters</dt><dd>' + d.params.join("<br>") + "</dd><dt>Request body</dt><dd class=\"mono\">" + d.body + "</dd><dt>Responses</dt><dd>" + d.responses.map(function (r) { return '<span class="status-pill st-' + r[0] + 'xx" style="margin-right:4px">' + r + "</span>"; }).join("") + "</dd></dl></div>";
          }).join("")
        ) +

        P("drives", false,
          '<p class="panel-sub">Because the spec is machine-readable, one file powers a whole toolchain. (Exact capabilities depend on the tools you adopt.)</p>' +
          '<div class="note-grid">' + DRIVES.map(function (d) { return '<div class="panel"><div class="panel-title">' + d[0] + "</div><p>" + d[1] + "</p></div>"; }).join("") + "</div>"
        ) +

        P("evolve", false,
          '<p class="panel-sub">Pick a change to the <code>Order</code> schema and see who it affects.</p>' +
          '<div class="chiprow" id="oa-evo" style="margin-bottom:var(--space-3)">' +
            '<button class="chip active" data-k="optional">Add optional field</button>' +
            '<button class="chip" data-k="required">Make a field required</button>' +
            '<button class="chip" data-k="remove">Remove a field</button>' +
          "</div><div id=\"oa-evo-out\"></div>"
        );

      AV.ui.wireTabs(container);

      // simplified structural validation
      function validate() {
        var src = container.querySelector("#oa-src").value;
        var checks = [
          ["openapi:", /openapi:\s*3\./.test(src)],
          ["info.title", /title:/.test(src)],
          ["info.version", /version:/.test(src)],
          ["paths", /paths:/.test(src)],
          ["at least one operation", /(get|post|put|patch|delete):/.test(src)],
          ["responses defined", /responses:/.test(src)],
          ["security scheme", /securitySchemes:/.test(src)]
        ];
        var ok = checks.every(function (c) { return c[1]; });
        container.querySelector("#oa-struct").innerHTML =
          (ok ? '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body">Passes the simplified structural checks.</div></div>' : '<div class="callout warn"><span class="callout-icon">⚠️</span><div class="callout-body">Missing required sections — see below.</div></div>') +
          '<ul class="tick-list" style="margin-top:var(--space-3)">' + checks.map(function (c) { return "<li>" + (c[1] ? "✔" : "✘") + " " + c[0] + "</li>"; }).join("") + "</ul>";
      }
      container.querySelector("#oa-validate").addEventListener("click", validate);
      validate();

      var evoOut = container.querySelector("#oa-evo-out");
      function evo(k) {
        var data;
        if (k === "optional") data = ["tip", "✅ Backward compatible", "Adding an optional field (e.g. <code>estimatedDelivery</code>) doesn't break existing clients — they ignore unknown fields. Contract tests still pass. Ship it in the current version."];
        else if (k === "required") data = ["warn", "⚠️ Breaking for request bodies", "Making a previously-optional <i>request</i> field required rejects older clients that omit it (422). For a <i>response</i> field it's safer, but strict clients may still assume it's always present. Treat as breaking → new version or a transition period."];
        else data = ["danger", "🧨 Breaking", "Removing a field breaks every client that reads it and fails contract tests immediately. Deprecate first (mark it, keep returning it), announce a Sunset date, then remove in the next major version."];
        evoOut.innerHTML = '<div class="callout ' + data[0] + '"><span class="callout-icon">' + data[1].slice(0, 2) + '</span><div class="callout-body"><b>' + data[1].slice(2) + ".</b> " + data[2] + "</div></div>" +
          '<div class="callout info" style="margin-top:var(--space-2)"><span class="callout-icon">🧪</span><div class="callout-body"><b>Contract tests</b> are what catch this in CI: they replay the spec against the running API, so a breaking change fails the build instead of a customer\'s app.</div></div>';
      }
      container.querySelector("#oa-evo").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        container.querySelectorAll("#oa-evo .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        evo(b.getAttribute("data-k"));
      });
      evo("optional");
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
