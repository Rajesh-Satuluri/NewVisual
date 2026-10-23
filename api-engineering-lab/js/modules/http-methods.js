/* ============================================================
   modules/http-methods.js — HTTP Methods Lab
   Pick a method, see its semantics (safe / idempotent / body),
   then run it against a live simulated order resource and watch
   the resource state before/after + the response.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var TRY = {
    GET: { method: "GET", path: "/v1/orders/ORD-10025", headers: { Authorization: "Bearer …" } },
    POST: { method: "POST", path: "/v1/orders", headers: { Authorization: "Bearer …", "Content-Type": "application/json" }, body: { customerId: "C1024", items: [{ productId: "P501", quantity: 1 }] } },
    PUT: { method: "PUT", path: "/v1/orders/ORD-10025", headers: { Authorization: "Bearer …", "Content-Type": "application/json" }, body: { status: "PROCESSING" } },
    PATCH: { method: "PATCH", path: "/v1/orders/ORD-10025", headers: { Authorization: "Bearer …", "Content-Type": "application/json" }, body: { status: "SHIPPED" } },
    DELETE: { method: "DELETE", path: "/v1/orders/ORD-10025", headers: { Authorization: "Bearer …" } },
    HEAD: { method: "HEAD", path: "/v1/orders/ORD-10025", headers: { Authorization: "Bearer …" } },
    OPTIONS: { method: "OPTIONS", path: "/v1/orders", headers: {} }
  };

  var module = {
    id: "http-methods",
    title: "HTTP Methods Lab",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("beginner");
      AV.data.store.reset();
      var methods = AV.data.http.methods;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Fundamentals</div>' +
          '<h1 class="module-title">HTTP methods — the verb carries the intent</h1>' +
          '<p class="module-subtitle">The method tells the server (and every cache and proxy in between) what you intend and whether it is safe to repeat. Pick one, read its semantics, then run it against a live order resource.</p></div>' +

        '<div class="chiprow" id="hm-chips" style="margin-bottom:var(--space-4)">' +
          methods.map(function (m, i) { return '<button class="chip' + (i === 0 ? " active" : "") + '" data-m="' + m.m + '">' + m.m + "</button>"; }).join("") +
        "</div>" +

        '<div class="lab-2col wide-right">' +
          '<div id="hm-detail"></div>' +
          '<aside class="panel sticky-side"><div class="panel-title">Try it on a live resource</div>' +
            '<p class="panel-sub">Runs against simulated <code>ORD-10025</code>.</p>' +
            '<div id="hm-before"></div>' +
            '<button class="btn btn-primary" id="hm-run" style="margin:var(--space-3) 0">▶ Send request</button>' +
            '<div id="hm-after"></div>' +
          "</aside>" +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">All methods at a glance</h2>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Method</th><th>Safe</th><th>Idempotent</th><th>Body</th><th>Typical use</th></tr></thead><tbody>' +
          methods.map(function (m) {
            return "<tr><td><span class=\"method-pill m-" + m.m.toLowerCase() + "\">" + m.m + "</span></td>" +
              "<td>" + yn(m.safe) + "</td><td>" + idem(m.idem) + "</td><td>" + m.body + "</td><td>" + m.use + "</td></tr>";
          }).join("") + "</tbody></table></div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🧭</span><div class="callout-body"><b>Two myths, corrected.</b> <b>DELETE</b> is idempotent in its <i>resource-state effect</i> (the resource ends up gone) even though a repeat may return 404 instead of 204. <b>PATCH</b> is neither inherently idempotent nor not — <code>set status=PAID</code> is idempotent; <code>increment quantity by 1</code> is not.</div></div>' +
        "</section>";

      var chips = container.querySelector("#hm-chips");
      var detail = container.querySelector("#hm-detail");
      var before = container.querySelector("#hm-before");
      var after = container.querySelector("#hm-after");
      var runBtn = container.querySelector("#hm-run");
      var cur = "GET";

      function byM(m) { for (var i = 0; i < methods.length; i++) if (methods[i].m === m) return methods[i]; }
      function renderDetail(m) {
        var d = byM(m);
        detail.innerHTML =
          '<div class="panel"><div class="panel-title" style="display:flex;gap:var(--space-2);align-items:center"><span class="method-pill m-' + m.toLowerCase() + '">' + m + "</span> semantics</div>" +
          '<dl class="kv">' +
            "<dt>Safe?</dt><dd>" + yn(d.safe) + " — " + (d.safe ? "no server state change intended." : "intended to change state.") + "</dd>" +
            "<dt>Idempotent?</dt><dd>" + idem(d.idem) + " — repeating it " + (d.idem === true ? "lands the same final state." : d.idem === false ? "can cause additional effects (e.g. duplicates)." : "depends on the operation.") + "</dd>" +
            "<dt>Request body?</dt><dd>" + d.body + "</dd>" +
            "<dt>Typical status</dt><dd class=\"mono\">" + d.status + "</dd>" +
          "</dl>" +
          '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">⚠️</span><div class="callout-body"><b>Common mistake:</b> ' + d.mistake + "</div></div>" +
          '<div class="callout info" style="margin-top:var(--space-3)"><span class="callout-icon">🛒</span><div class="callout-body">' + d.biz + "</div></div>" +
          "</div>";
      }
      function resourceCard(label, kind) {
        var o = AV.data.store.getOrder("ORD-10025");
        var html = o ? '<dl class="kv"><dt>orderId</dt><dd class="mono">' + o.orderId + "</dd><dt>status</dt><dd><b>" + o.status + "</b></dd><dt>total</dt><dd class=\"mono\">" + o.total + " " + o.currency + "</dd></dl>" : '<p class="text-muted">Order not found (cancelled/deleted).</p>';
        return '<div class="panel ' + (kind || "") + '" style="padding:var(--space-3)"><div class="panel-title">' + label + "</div>" + html + "</div>";
      }
      function renderBefore() { before.innerHTML = resourceCard("Resource now"); }
      function run() {
        var reqSpec = TRY[cur];
        var snapshotBefore = resourceCard("Before");
        var res = AV.HttpSim.run(reqSpec, { reuseConn: true, handler: function (r) { return AV.data.store.handle(r); } });
        var r = res.response;
        var cls = "st-" + Math.floor(r.status / 100) + "xx";
        var bodyTxt = cur === "HEAD" ? "(HEAD — headers only, no body)" : (r.body !== null && r.body !== undefined ? AV.fmtJSON(r.body) : "(no body — 204)");
        after.innerHTML = snapshotBefore +
          '<div class="http-msg" style="margin-top:var(--space-3)"><div class="http-msg-head"><span>Response</span><span class="status-pill ' + cls + '">' + r.status + "</span></div>" +
          '<div class="http-msg-body">' + bodyTxt + "</div></div>" +
          resourceCard("After", "flash-ok");
      }

      chips.addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        chips.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        cur = b.getAttribute("data-m");
        renderDetail(cur); renderBefore(); after.innerHTML = "";
      });
      runBtn.addEventListener("click", run);

      renderDetail("GET"); renderBefore();
    },
    destroy: function () {}
  };

  function yn(b) { return b ? '<span style="color:var(--green)">✔ yes</span>' : '<span style="color:var(--orange)">✘ no</span>'; }
  function idem(v) { return v === true ? '<span style="color:var(--green)">✔ yes</span>' : v === false ? '<span style="color:var(--orange)">✘ no</span>' : '<span style="color:var(--purple)">◑ depends</span>'; }

  AV.registerModule(module);
})();
