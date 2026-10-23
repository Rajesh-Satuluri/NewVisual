/* ============================================================
   modules/testing-workbench.js — API Testing Workbench
   A Postman-style request builder over the simulated ShopSphere
   API: method/URL/headers/body, environments with {{variables}},
   request collections, chained ids, response + timing, history,
   and the equivalent cURL command. No real network, no secrets.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var ENVS = {
    Local: { baseUrl: "http://localhost:3000", accessToken: "local-dev-token" },
    Dev: { baseUrl: "https://dev.api.shopsphere.example", accessToken: "dev-token-xyz" },
    Staging: { baseUrl: "https://staging.api.shopsphere.example", accessToken: "stg-token-xyz" },
    Production: { baseUrl: "https://api.shopsphere.example", accessToken: "prod-token-REDACTED" }
  };

  var module = {
    id: "testing-workbench",
    title: "API Testing Workbench",
    fullWidth: true,
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      AV.data.store.reset();
      var collections = AV.data.impl.collections;
      var env = "Local";
      var vars = { orderId: "ORD-10025" };
      var history = [];

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation</div>' +
          '<h1 class="module-title">Exercise the API like a real client</h1>' +
          '<p class="module-subtitle">Build and send requests against the simulated ShopSphere API. Use <code>{{variables}}</code> per environment, chain a created <code>{{orderId}}</code> into later calls, and copy the equivalent cURL. Everything is simulated — no real network, no real secrets.</p></div>' +

        '<div class="lab-2col">' +
          '<aside><div class="panel"><div class="panel-title">Environment</div>' +
            '<select class="select" id="tw-env">' + Object.keys(ENVS).map(function (e) { return "<option" + (e === env ? " selected" : "") + ">" + e + "</option>"; }).join("") + "</select>" +
            '<dl class="kv" id="tw-vars" style="margin-top:var(--space-3)"></dl></div>' +
            '<div class="panel"><div class="panel-title">Collections</div><div id="tw-coll"></div></div>' +
          "</aside>" +
          '<div>' +
            '<div class="panel"><div class="tw-bar">' +
              '<select class="select" id="tw-method" style="max-width:110px">' + ["GET", "POST", "PUT", "PATCH", "DELETE"].map(function (m) { return "<option>" + m + "</option>"; }).join("") + "</select>" +
              '<input class="input mono" id="tw-url" value="{{baseUrl}}/v1/orders/{{orderId}}" />' +
              '<button class="btn btn-primary" id="tw-send">Send</button></div>' +
              '<div class="tabstrip" style="margin-top:var(--space-3)">' + tb("headers", "Headers", true) + tb("body", "Body") + tb("curl", "cURL") + "</div>" +
              '<div class="tab-panel active" data-tab="headers"><textarea class="textarea mono" id="tw-headers" rows="4">Authorization: Bearer {{accessToken}}\nContent-Type: application/json</textarea></div>' +
              '<div class="tab-panel" data-tab="body"><textarea class="textarea mono" id="tw-body" rows="7">{\n  "customerId": "C1024",\n  "items": [{ "productId": "P501", "quantity": 2 }]\n}</textarea></div>' +
              '<div class="tab-panel" data-tab="curl"><div id="tw-curl"></div></div>' +
            "</div>" +
            '<div class="panel"><div class="panel-title">Response</div><div id="tw-resp"><p class="text-muted">Send a request to see the response.</p></div></div>' +
            '<div class="panel"><div class="panel-title">History</div><div id="tw-hist"><p class="text-muted">No requests yet.</p></div></div>' +
          "</div>" +
        "</div>";

      AV.ui.wireTabs(container);

      var els = {
        method: container.querySelector("#tw-method"), url: container.querySelector("#tw-url"),
        headers: container.querySelector("#tw-headers"), body: container.querySelector("#tw-body")
      };
      var varsEl = container.querySelector("#tw-vars");
      var respEl = container.querySelector("#tw-resp");
      var histEl = container.querySelector("#tw-hist");
      var collEl = container.querySelector("#tw-coll");
      var curlEl = container.querySelector("#tw-curl");

      function allVars() { return Object.assign({ baseUrl: ENVS[env].baseUrl, accessToken: ENVS[env].accessToken }, vars); }
      function resolve(s) { var v = allVars(); return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
      function renderVars() {
        var v = allVars();
        varsEl.innerHTML = Object.keys(v).map(function (k) { return "<dt>{{" + k + "}}</dt><dd class=\"mono\">" + (k === "accessToken" ? "••••" + String(v[k]).slice(-4) : esc(String(v[k]))) + "</dd>"; }).join("");
      }
      function renderCollections() {
        collEl.innerHTML = collections.map(function (c) {
          return '<div class="tw-coll-group"><div class="tw-coll-name">' + c.name + "</div>" +
            c.reqs.map(function (r, i) { return '<button class="tw-req" data-coll="' + c.name + '" data-i="' + i + '"><span class="method-pill m-' + r.m.toLowerCase() + '">' + r.m + "</span><span>" + r.desc + "</span></button>"; }).join("") + "</div>";
        }).join("");
      }
      function parseHeaders() {
        var h = {}; els.headers.value.split("\n").forEach(function (line) { var idx = line.indexOf(":"); if (idx > 0) h[line.slice(0, idx).trim()] = resolve(line.slice(idx + 1).trim()); }); return h;
      }
      function pathOf(url) { var u = resolve(url); return u.replace(/^https?:\/\/[^/]+/, "").replace(ENVS[env].baseUrl, ""); }
      function buildCurl() {
        var m = els.method.value, url = resolve(els.url.value), h = els.headers.value.split("\n").filter(Boolean);
        var parts = ["curl -X " + m + " '" + url + "'"];
        h.forEach(function (line) { if (line.indexOf(":") > 0) parts.push("  -H '" + resolve(line) + "'"); });
        if (m !== "GET" && m !== "DELETE" && els.body.value.trim()) parts.push("  -d '" + resolve(els.body.value).replace(/\n\s*/g, "") + "'");
        curlEl.innerHTML = '<div class="http-msg"><div class="http-msg-head"><span>equivalent cURL</span></div><div class="http-msg-body">' + esc(parts.join(" \\\n")) + "</div></div>" +
          '<p class="text-muted text-sm" style="margin-top:var(--space-2)">Same request in Postman: set the method + URL, add the headers under the Headers tab, and paste the JSON under Body → raw → JSON.</p>';
      }

      function send() {
        var m = els.method.value;
        var path = pathOf(els.url.value);
        var headers = parseHeaders();
        var bodyText = els.body.value.trim();
        var body = null, badJson = false;
        if (m !== "GET" && m !== "DELETE" && bodyText) { try { body = JSON.parse(resolve(bodyText)); } catch (e) { badJson = true; } }
        var res;
        if (badJson) res = { response: { status: 400, statusText: "Bad Request", headers: { "Content-Type": "application/problem+json" }, body: { title: "Malformed JSON body", status: 400, code: "MALFORMED_JSON" } }, totalMs: 3 };
        else res = AV.HttpSim.run({ method: m, path: path, headers: headers, body: body }, { reuseConn: true, handler: function (r) { return AV.data.store.handle(r); } });
        var r = res.response;
        // chain: capture a created order id
        if (r && r.body && r.body.orderId) vars.orderId = r.body.orderId;
        renderVars();
        var cls = "st-" + Math.floor((r.status || 0) / 100) + "xx";
        respEl.innerHTML = '<div class="http-msg"><div class="http-msg-head"><span>' + r.status + " " + (r.statusText || "") + '</span><span class="status-pill ' + cls + '">' + r.status + '</span></div>' +
          '<div class="http-msg-body">' + Object.keys(r.headers || {}).map(function (k) { return '<span class="http-hdr-key">' + k + '</span>: <span class="http-hdr-val">' + esc(String(r.headers[k])) + "</span>"; }).join("\n") + (r.body != null ? "\n\n" + AV.fmtJSON(r.body) : "") + "</div></div>" +
          '<div class="pill-legend" style="margin-top:var(--space-2)"><span>Simulated time: <b>' + (res.totalMs || 0) + " ms</b></span>" + (vars.orderId ? '<span>captured <code>{{orderId}}</code> = ' + vars.orderId + "</span>" : "") + "</div>";
        history.unshift({ m: m, path: path, status: r.status });
        histEl.innerHTML = history.slice(0, 10).map(function (h) { return '<div class="tw-hist-row"><span class="method-pill m-' + h.m.toLowerCase() + '">' + h.m + "</span><span class=\"mono\">" + esc(h.path) + '</span><span class="status-pill st-' + Math.floor(h.status / 100) + 'xx">' + h.status + "</span></div>"; }).join("");
      }

      container.querySelector("#tw-env").addEventListener("change", function (e) { env = e.target.value; renderVars(); buildCurl(); });
      container.querySelector("#tw-send").addEventListener("click", send);
      [els.method, els.url, els.headers, els.body].forEach(function (el) { el.addEventListener("input", buildCurl); el.addEventListener("change", buildCurl); });
      collEl.addEventListener("click", function (e) {
        var b = e.target.closest(".tw-req"); if (!b) return;
        var c = collections.filter(function (x) { return x.name === b.getAttribute("data-coll"); })[0];
        var r = c.reqs[parseInt(b.getAttribute("data-i"), 10)];
        els.method.value = r.m;
        els.url.value = "{{baseUrl}}" + r.p;
        var hdr = ["Authorization: Bearer {{accessToken}}"]; if (r.headers) Object.keys(r.headers).forEach(function (k) { hdr.push(k + ": " + r.headers[k]); });
        if (r.m !== "GET" && r.m !== "DELETE") hdr.push("Content-Type: application/json");
        els.headers.value = hdr.join("\n");
        els.body.value = r.body ? JSON.stringify(r.body, null, 2) : "";
        buildCurl();
      });

      renderVars(); renderCollections(); buildCurl();
    },
    destroy: function () { AV.data.store.reset(); }
  };

  function tb(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
