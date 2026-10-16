/* ============================================================
   modules/versioning.js — API Versioning
   Compare URI / header / media-type versioning, then an
   interactive breaking-change simulator: pick a change + a client
   version and see whether the client breaks, and why.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var CHANGES = {
    addField: { label: "Add a new optional field (estimatedDelivery)", breaking: false, why: "Additive change. Old clients ignore unknown fields, so nothing breaks — this is the safest way to evolve an API." },
    addEnum: { label: "Add a new status value (RETURNED)", breaking: "maybe", why: "Usually safe, but a client with a strict enum/switch that doesn't handle the new value can misbehave. Document it and default gracefully." },
    renameField: { label: "Rename total → amountDue", breaking: true, why: "Old clients read total, which is now gone → they see undefined. This is breaking and needs a new version (or keep both fields during a transition)." },
    removeField: { label: "Remove currency", breaking: true, why: "Any client relying on currency breaks. Removing a field is always breaking — deprecate first, remove in the next major version." },
    restructure: { label: "Move total/currency into pricing{}", breaking: true, why: "Changing the shape breaks every client parsing the old structure. This is a classic v1→v2 change." }
  };

  var module = {
    id: "versioning",
    title: "API Versioning",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var V = AV.data.rest.versioning;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">Evolve the API without breaking last year\'s app</h1>' +
          '<p class="module-subtitle">ShopSphere can\'t force every phone to update at once. Versioning plus additive changes let the new app move to <code>/v2</code> while old clients keep calling <code>/v1</code>. Compare the strategies, then test which changes actually break a client.</p></div>' +

        '<div class="tabstrip">' + T("strategies", "Strategies", true) + T("breaking", "Breaking-change simulator") + T("lifecycle", "Deprecation & sunset") + "</div>" +

        P("strategies", true,
          '<div class="note-grid">' + V.map(function (v) {
            return '<div class="panel"><div class="panel-title">' + v.k + ' versioning</div>' +
              '<div class="http-msg"><div class="http-msg-body mono">' + v.ex + "</div></div>" +
              '<dl class="kv" style="margin-top:var(--space-3)"><dt>Pros</dt><dd>' + v.pros + "</dd><dt>Cons</dt><dd>" + v.cons + "</dd><dt>Common</dt><dd>" + v.common + "</dd></dl>" +
              "</div>";
          }).join("") + "</div>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🧭</span><div class="callout-body">Most teams pick <b>URI versioning</b> for public APIs (obvious, cacheable, testable in a browser) and reserve new versions for <b>breaking</b> changes only — additive changes ship within the current version.</div></div>'
        ) +

        P("breaking", false,
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Make a change</div>' +
              '<div class="field"><label>Change to /v1 order schema</label><select class="select" id="ver-change">' + Object.keys(CHANGES).map(function (k) { return '<option value="' + k + '">' + CHANGES[k].label + "</option>"; }).join("") + "</select></div>" +
              '<div class="field"><label>Deploy it as…</label><div class="segmented" id="ver-mode"><button class="active" data-m="inplace">In place (same /v1)</button><button data-m="v2">A new /v2</button></div></div>' +
              '<button class="btn btn-primary" id="ver-run">▶ Release &amp; test old client</button>' +
            "</div>" +
            '<aside class="sticky-side panel"><div class="panel-title">What happens to the old mobile app</div><div id="ver-out"></div></aside>' +
          "</div>"
        ) +

        P("lifecycle", false,
          '<p class="panel-sub">A version isn\'t retired overnight. A healthy lifecycle gives clients time and signals to migrate.</p>' +
          '<ol class="journey-list" style="grid-template-columns:1fr">' +
            step("1 · Announce", "Publish the new version + a migration guide and changelog. Keep the old one fully working.") +
            step("2 · Deprecate", "Mark the old version deprecated; return a <code>Deprecation</code> and <code>Sunset</code> header so clients see it in responses.") +
            step("3 · Monitor", "Track per-version traffic. Reach out to the last few high-volume clients still on the old version.") +
            step("4 · Sunset", "After the published date, retire the old version. Contract tests + version metrics tell you it's safe.") +
          "</ol>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">🧮</span><div class="callout-body"><b>Version proliferation is a real cost.</b> Every live version is code to maintain and test. Prefer additive changes, and retire old versions on a schedule rather than letting them pile up.</div></div>'
        );

      AV.ui.wireTabs(container);

      var out = container.querySelector("#ver-out");
      var mode = "inplace";
      container.querySelector("#ver-mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; container.querySelectorAll("#ver-mode button").forEach(function (x) { x.classList.toggle("active", x === b); }); mode = b.getAttribute("data-m"); });

      container.querySelector("#ver-run").addEventListener("click", function () {
        var ch = CHANGES[container.querySelector("#ver-change").value];
        var breaks;
        var explain;
        if (mode === "v2") {
          breaks = false;
          explain = "You shipped the change as <b>/v2</b>. The old app still calls <b>/v1</b>, which is unchanged — so it keeps working. New clients opt into /v2 when they're ready. " + (ch.breaking === true ? "This is exactly how a breaking change should be shipped." : "(For a non-breaking change you may not even need a new version.)");
        } else {
          breaks = ch.breaking === true;
          explain = ch.why;
        }
        var cls = breaks ? "danger" : ch.breaking === "maybe" && mode === "inplace" ? "warn" : "tip";
        var icon = breaks ? "🧨" : ch.breaking === "maybe" && mode === "inplace" ? "⚠️" : "✅";
        var headline = breaks ? "Old app BREAKS" : ch.breaking === "maybe" && mode === "inplace" ? "Old app MIGHT break" : "Old app keeps working";
        out.innerHTML =
          '<div class="callout ' + cls + '"><span class="callout-icon">' + icon + '</span><div class="callout-body"><b>' + headline + ".</b> " + explain + "</div></div>" +
          '<div class="lab-2col" style="margin-top:var(--space-3)">' +
            '<div class="http-msg"><div class="http-msg-head"><span>/v1 response (old client expects)</span></div><div class="http-msg-body">' + AV.fmtJSON({ orderId: "ORD-10025", total: 29980, currency: "INR", status: "PAID" }) + "</div></div>" +
            '<div class="http-msg"><div class="http-msg-head"><span>' + (mode === "v2" ? "/v2 response (new shape)" : "new /v1 response") + "</span></div><div class=\"http-msg-body\">" + AV.fmtJSON(applyChange(container.querySelector("#ver-change").value)) + "</div></div>" +
          "</div>";
      });
      // trigger once
      container.querySelector("#ver-run").click();

      function applyChange(k) {
        var o = { orderId: "ORD-10025", total: 29980, currency: "INR", status: "PAID" };
        if (k === "addField") o.estimatedDelivery = "2024-05-04";
        else if (k === "addEnum") o.status = "RETURNED";
        else if (k === "renameField") { o.amountDue = o.total; delete o.total; }
        else if (k === "removeField") { delete o.currency; }
        else if (k === "restructure") { o = { orderId: "ORD-10025", pricing: { total: 29980, currency: "INR" }, status: "PAID" }; }
        return o;
      }
    },
    destroy: function () {}
  };

  function T(id, label, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + label + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function step(t, d) { return '<li style="list-style:none"><div style="padding:var(--space-3);background:var(--bg-2);border:1px solid var(--border-default);border-radius:var(--radius-md)"><b>' + t + '</b><div class="text-muted text-sm" style="margin-top:4px">' + d + "</div></div></li>"; }

  AV.registerModule(module);
})();
