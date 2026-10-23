/* ============================================================
   modules/endpoint-designer.js — Endpoint Designer + path vs query
   Configure an endpoint; get a generated spec + contextual lint
   (verb-in-path, pluralization, unbounded collections, unsafe
   retries, missing auth, status mismatch). Second tab compares
   path vs query parameters.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "endpoint-designer",
    title: "Endpoint Designer",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">Design an endpoint — and get design feedback</h1>' +
          '<p class="module-subtitle">Configure an endpoint below. The designer generates a readable spec and runs the same checks a senior reviewer would: verb-free paths, consistent plurals, bounded collections, safe retries, auth on writes, and sensible status codes.</p></div>' +

        '<div class="tabstrip">' + T("design", "Designer", true) + T("pathquery", "Path vs query params") + "</div>" +

        P("design", true,
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Configure</div>' +
              '<div class="field"><label>Method</label><select class="select" id="ed-method">' + ["GET", "POST", "PUT", "PATCH", "DELETE"].map(function (m) { return "<option>" + m + "</option>"; }).join("") + "</select></div>" +
              '<div class="field"><label>Path</label><input class="input mono" id="ed-path" value="/v1/orders" /></div>' +
              '<div class="field"><label>Success status</label><select class="select" id="ed-status"><option>200</option><option>201</option><option>202</option><option>204</option></select></div>' +
              '<div class="field"><label><input type="checkbox" id="ed-auth" checked /> Requires authentication</label></div>' +
              '<div class="field"><label><input type="checkbox" id="ed-page" /> Paginated (collections)</label></div>' +
              '<div class="field"><label><input type="checkbox" id="ed-idem" /> Idempotency key accepted</label></div>' +
              '<div class="field"><label><input type="checkbox" id="ed-body" /> Has request body</label></div>' +
              '<div class="chiprow" style="margin-top:var(--space-2)"><button class="chip" data-preset="bad">Load a bad example</button><button class="chip" data-preset="good">Load a good example</button></div>' +
            "</div>" +
            '<aside class="sticky-side"><div class="panel"><div class="panel-title">Generated spec</div><div id="ed-spec"></div></div>' +
              '<div class="panel"><div class="panel-title">Design review</div><div id="ed-lint"></div></div></aside>' +
          "</div>"
        ) +

        P("pathquery", false,
          '<p class="panel-sub">Both go in the URL, but they mean different things. Path params <b>identify</b> a resource; query params <b>filter, sort, paginate, or shape</b> a representation.</p>' +
          '<div class="note-grid">' +
            pqCard("Path parameter", "/v1/orders/<b>ORD-10025</b>", ["Identifies one specific resource or hierarchy", "Part of the resource's identity", "Usually required", "Changes which resource you address"]) +
            pqCard("Query parameter", "/v1/orders?<b>status=PAID&limit=20</b>", ["Filters, sorts, paginates, or alters the representation", "Optional and composable", "Operates on a collection", "Same resource, different view"]) +
          "</div>" +
          '<div class="panel" style="margin-top:var(--space-4)"><div class="panel-title">Nested resource vs query — the trade-off</div>' +
            '<dl class="kv"><dt class="mono">/v1/customers/5/orders</dt><dd>Nested: reads naturally, encodes ownership, easy to secure (scope to customer 5).</dd>' +
            '<dt class="mono">/v1/orders?customerId=5</dt><dd>Query: flatter, flexible to combine filters, but ownership/auth-scoping is implicit — enforce it server-side.</dd></dl>' +
            '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">🔒</span><div class="callout-body">Whichever you choose: <b>validate both</b>, and never put secrets or tokens in the URL — they land in logs, history, and referrer headers.</div></div>' +
          "</div>"
        );

      AV.ui.wireTabs(container);

      var els = {
        method: container.querySelector("#ed-method"), path: container.querySelector("#ed-path"),
        status: container.querySelector("#ed-status"), auth: container.querySelector("#ed-auth"),
        page: container.querySelector("#ed-page"), idem: container.querySelector("#ed-idem"), body: container.querySelector("#ed-body")
      };
      var specEl = container.querySelector("#ed-spec");
      var lintEl = container.querySelector("#ed-lint");

      function isCollection(path) { return !/\/\{?[A-Za-z0-9_]+\}?$/.test(path) || /s$/.test(path.split("/").pop()); }
      function lastSeg(path) { return path.replace(/\?.*/, "").split("/").filter(Boolean).pop() || ""; }

      function lint() {
        var m = els.method.value, path = els.path.value.trim(), status = els.status.value;
        var issues = [];
        var verbs = ["get", "create", "delete", "update", "fetch", "list", "add", "remove", "make", "do"];
        var segs = path.split("/").filter(Boolean);
        segs.forEach(function (s) { if (verbs.indexOf(s.toLowerCase().replace(/[^a-z]/g, "")) !== -1) issues.push(["bad", "Verb in path", "Segment <code>" + s + "</code> is a verb. The HTTP method is the verb — use a noun resource instead."]); });
        // pluralization: collection-looking last segment should be plural
        var last = lastSeg(path);
        if (last && !/[{}]/.test(last) && !/s$/.test(last) && !/^v\d+$/.test(last)) issues.push(["warn", "Pluralization", "Collection segment <code>" + last + "</code> looks singular — prefer plural (e.g. <code>" + last + "s</code>) and stay consistent."]);
        // unsafe retries
        if (m === "POST" && !els.idem.checked) issues.push(["warn", "Unsafe retries", "POST is not idempotent. Without an Idempotency-Key, a client retry can create duplicates."]);
        // GET body
        if (m === "GET" && els.body.checked) issues.push(["warn", "GET with body", "GET should not rely on a request body — many intermediaries ignore it. Use query params."]);
        // unbounded collection
        if (m === "GET" && isCollection(path) && !els.page.checked) issues.push(["warn", "Unbounded collection", "A collection GET without pagination can return unbounded data. Add limit + cursor/offset."]);
        // auth on writes
        if (["POST", "PUT", "PATCH", "DELETE"].indexOf(m) !== -1 && !els.auth.checked) issues.push(["bad", "Missing auth on write", "A state-changing endpoint without authentication is dangerous — require it."]);
        // status mismatch
        if (m === "POST" && status !== "201" && status !== "202") issues.push(["warn", "Status mismatch", "Creation typically returns 201 (or 202 if async), not " + status + "."]);
        if (m === "DELETE" && status === "200") issues.push(["info", "DELETE status", "204 No Content is common for DELETE; 200 is fine if you return a body."]);
        if (!issues.length) issues.push(["ok", "Looks good", "No design smells detected against the built-in checks."]);
        return issues;
      }

      function render() {
        var m = els.method.value, path = els.path.value.trim(), status = els.status.value;
        var errorCodes = ["400 Bad Request"];
        if (els.auth.checked) errorCodes.push("401 Unauthorized", "403 Forbidden");
        if (/\{|\}/.test(path) || !isCollection(path)) errorCodes.push("404 Not Found");
        if (els.idem.checked) errorCodes.push("409 Conflict");
        if (els.body.checked) errorCodes.push("422 Unprocessable Content");
        errorCodes.push("429 Too Many Requests", "500 Internal Server Error");
        specEl.innerHTML =
          '<div class="http-msg"><div class="http-msg-body">' +
            '<span class="method-pill m-' + m.toLowerCase() + '">' + m + '</span> <span class="mono">' + esc(path) + "</span>\n\n" +
            "<b>Auth:</b> " + (els.auth.checked ? "required (Bearer)" : "none") + "\n" +
            "<b>Request body:</b> " + (els.body.checked ? "application/json" : "none") + "\n" +
            (els.page.checked ? "<b>Pagination:</b> ?limit= &cursor=\n" : "") +
            (els.idem.checked ? "<b>Idempotency:</b> Idempotency-Key header\n" : "") +
            "<b>Success:</b> " + status + " " + AV.HttpSim.statusText(parseInt(status, 10)) + "\n" +
            "<b>Errors:</b> " + errorCodes.join(", ") +
          "</div></div>";
        var issues = lint();
        lintEl.innerHTML = issues.map(function (i) {
          var cls = i[0] === "bad" ? "danger" : i[0] === "warn" ? "warn" : i[0] === "ok" ? "tip" : "info";
          var icon = i[0] === "bad" ? "🚫" : i[0] === "warn" ? "⚠️" : i[0] === "ok" ? "✅" : "ℹ️";
          return '<div class="callout ' + cls + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + icon + '</span><div class="callout-body"><b>' + i[1] + ".</b> " + i[2] + "</div></div>";
        }).join("");
      }

      Object.keys(els).forEach(function (k) { els[k].addEventListener("change", render); els[k].addEventListener("input", render); });
      container.querySelector('[data-preset="bad"]').addEventListener("click", function () {
        els.method.value = "POST"; els.path.value = "/v1/createOrder"; els.status.value = "200"; els.auth.checked = false; els.page.checked = false; els.idem.checked = false; els.body.checked = true; render();
      });
      container.querySelector('[data-preset="good"]').addEventListener("click", function () {
        els.method.value = "POST"; els.path.value = "/v1/orders"; els.status.value = "201"; els.auth.checked = true; els.page.checked = false; els.idem.checked = true; els.body.checked = true; render();
      });
      render();
    },
    destroy: function () {}
  };

  function T(id, label, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + label + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function pqCard(title, ex, pts) { return '<div class="panel"><div class="panel-title">' + title + '</div><div class="http-msg"><div class="http-msg-body mono">' + ex + "</div></div><ul class=\"tick-list\" style=\"margin-top:var(--space-3)\">" + pts.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div>"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
