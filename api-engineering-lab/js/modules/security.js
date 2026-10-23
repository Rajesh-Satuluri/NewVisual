/* ============================================================
   modules/security.js — API Security Lab
   Authn vs authz (interactive), API keys, authorization models, a
   SAFE broken-object-level-authorization (BOLA) demo + fix, and the
   OWASP API Top-10 threat lab. Fictional data; no real attacks.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "security",
    title: "Security Lab",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var S = AV.data.security;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Security</div>' +
          '<h1 class="module-title">Who are you, and what may you do?</h1>' +
          '<p class="module-subtitle">Authentication and authorization are different checks — conflating them causes real breaches. Work through identities, authorization models, a safe IDOR/BOLA demo, and the OWASP API Top-10.</p></div>' +

        '<div class="tabstrip">' + T("authz", "Authn vs Authz", true) + T("keys", "API keys") + T("models", "Authz models") + T("bola", "BOLA demo") + T("threats", "OWASP Top-10") + "</div>" +

        P("authz", true,
          '<div class="callout info"><span class="callout-icon">🔑</span><div class="callout-body"><b>Authentication</b> = <i>who are you?</i> (identity). <b>Authorization</b> = <i>what may you do?</i> (permission). 401 is an <b>authentication</b> failure; 403 is an <b>authorization</b> failure.</div></div>' +
          '<div class="lab-2col wide-right" style="margin-top:var(--space-4)">' +
            '<div class="panel"><div class="panel-title">Pick who is calling GET /v1/orders/ORD-10025</div><div class="chiprow" id="sec-ids">' +
              S.identities.map(function (x, i) { return '<button class="chip' + (i === 0 ? " active" : "") + '" data-i="' + i + '">' + x.who + "</button>"; }).join("") + "</div></div>" +
            '<aside class="sticky-side panel" id="sec-id-out"></aside>' +
          "</div>"
        ) +

        P("keys", false,
          '<div class="note-grid">' +
            card("What an API key is", "A simple shared secret that <b>identifies a calling application</b> (not usually an end user). Sent via a header like <code>X-API-Key</code> or Authorization.") +
            card("Keep keys out of the browser", "A key embedded in frontend JS is public to anyone who views source. Keys belong on a server; browsers use user auth (OAuth) instead.") +
            card("Rotate &amp; scope", "Issue scoped keys (least privilege), rotate on a schedule, and support instant revocation when one leaks.") +
            card("Monitor usage", "Track per-key volume + errors; anomalies reveal a leaked or abused key early.") +
            card("Keys ≠ user auth", "A key says <i>which app</i>, not <i>which user</i>. For user-specific permissions you still need user authentication + authorization.") +
            card("Store securely", "Hash/encrypt at rest, never log them in plaintext, never commit them to git.") +
          "</div>"
        ) +

        P("models", false,
          '<p class="panel-sub">Four ways to decide what a caller may do. Most real systems combine RBAC for coarse roles with ownership checks for per-object access.</p>' +
          '<div class="note-grid">' + S.authzModels.map(function (m) {
            return '<div class="panel"><div class="panel-title">' + m.k + ' · ' + m.full + "</div>" +
              '<dl class="kv"><dt>How</dt><dd>' + m.how + "</dd><dt>Example</dt><dd>" + m.ex + "</dd><dt>Pro</dt><dd>" + m.pro + "</dd><dt>Con</dt><dd>" + m.con + "</dd></dl></div>";
          }).join("") + "</div>"
        ) +

        P("bola", false,
          '<p class="panel-sub">Broken Object-Level Authorization (a.k.a. IDOR) is the #1 API risk: the server trusts an id from the URL without checking ownership. Safe local demo below.</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">You are customer C1024 (you own ORD-10025)</div>' +
              '<div class="field"><label>Request</label><div class="chiprow" id="bola-req"><button class="chip active" data-id="ORD-10025">GET /v1/orders/ORD-10025 (yours)</button><button class="chip" data-id="ORD-20099">GET /v1/orders/ORD-20099 (someone else\'s)</button></div></div>' +
              '<div class="field"><label>Server enforcement</label><div class="segmented" id="bola-fix"><button class="active" data-f="broken">Broken (trusts the id)</button><button data-f="fixed">Fixed (ownership check)</button></div></div>' +
              '<button class="btn btn-primary" id="bola-run">▶ Send request</button>' +
            "</div>" +
            '<aside class="sticky-side panel" id="bola-out"></aside>' +
          "</div>" +
          '<div class="callout danger" style="margin-top:var(--space-4)"><span class="callout-icon">🔒</span><div class="callout-body"><b>The fix is server-side, always.</b> On every object access, check that the authenticated caller owns (or is permitted) the resource — <code>if (order.customerId !== token.customerId) return 404</code>. Returning 404 (not 403) avoids confirming the resource exists.</div></div>'
        ) +

        P("threats", false,
          '<p class="panel-sub">The OWASP API Security Top-10 (abbreviated). Each is a class of real bugs with a concrete mitigation.</p>' +
          '<div id="owasp-list">' + S.owasp.map(function (o, i) {
            return '<div class="gb-row" data-i="' + i + '"><div class="gb-pair"><span class="status-pill st-5xx">' + o.id + '</span><b>' + o.title + "</b></div><div class=\"gb-why\" hidden><b>Risk:</b> " + o.risk + "<br><b>Fix:</b> " + o.fix + "</div></div>";
          }).join("") + "</div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🌐</span><div class="callout-body"><b>CORS is not authorization.</b> CORS is a <i>browser</i>-enforced cross-origin policy — it stops a web page on another origin from reading your response. It does nothing against a server-to-server call or curl. Always enforce authorization on the server regardless of CORS. Likewise, defend cookie-based flows against <b>CSRF</b> (SameSite cookies / CSRF tokens).</div></div>' +
          '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">🛡️</span><div class="callout-body"><b>Baseline defenses:</b> input validation, parameterized queries, schema validation, rate limiting, request-size limits, secure error handling (no stack traces), secret management, TLS everywhere, and audit logging.</div></div>'
        );

      AV.ui.wireTabs(container);

      // authn/authz identity picker
      var idOut = container.querySelector("#sec-id-out");
      function showId(i) {
        var x = S.identities[i];
        var cls = "st-" + Math.floor(x.code / 100) + "xx";
        idOut.innerHTML = '<div class="panel-title" style="display:flex;justify-content:space-between;align-items:center">' + x.who + '<span class="status-pill ' + cls + '">' + x.code + "</span></div>" +
          '<dl class="kv"><dt>Authenticated?</dt><dd>' + yn(x.authn) + "</dd><dt>Authorized?</dt><dd>" + yn(x.authz) + "</dd></dl>" +
          "<p style=\"margin-top:var(--space-3)\">" + x.msg + "</p>" +
          '<div class="callout ' + (x.code < 300 ? "tip" : x.code === 401 ? "warn" : "danger") + '" style="margin-top:var(--space-3)"><span class="callout-icon">' + (x.code < 300 ? "✅" : "⛔") + '</span><div class="callout-body">' + x.note + "</div></div>";
      }
      container.querySelector("#sec-ids").addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; container.querySelectorAll("#sec-ids .chip").forEach(function (x) { x.classList.toggle("active", x === b); }); showId(parseInt(b.getAttribute("data-i"), 10)); });
      showId(0);

      // threats reveal
      container.querySelector("#owasp-list").addEventListener("click", function (e) { var r = e.target.closest(".gb-row"); if (!r) return; var w = r.querySelector(".gb-why"); w.hidden = !w.hidden; });

      // BOLA demo
      var reqId = "ORD-10025", fix = "broken";
      container.querySelector("#bola-req").addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; container.querySelectorAll("#bola-req .chip").forEach(function (x) { x.classList.toggle("active", x === b); }); reqId = b.getAttribute("data-id"); });
      container.querySelector("#bola-fix").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; container.querySelectorAll("#bola-fix button").forEach(function (x) { x.classList.toggle("active", x === b); }); fix = b.getAttribute("data-f"); });
      container.querySelector("#bola-run").addEventListener("click", function () {
        var out = container.querySelector("#bola-out");
        var order = AV.data.security.bolaOrders[reqId];
        var mine = order.customerId === "C1024";
        if (fix === "fixed" && !mine) {
          out.innerHTML = '<div class="panel-title">Response <span class="status-pill st-4xx">404</span></div>' +
            '<div class="http-msg"><div class="http-msg-body">' + AV.fmtJSON({ title: "Not Found", status: 404, code: "NOT_FOUND", requestId: "req-7f3a21" }) + "</div></div>" +
            '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">✅</span><div class="callout-body">Ownership check blocked it. You don\'t own ORD-20099, so the server won\'t return it (or even confirm it exists).</div></div>';
        } else {
          var leaked = !mine;
          out.innerHTML = '<div class="panel-title">Response <span class="status-pill st-2xx">200</span></div>' +
            '<div class="http-msg"><div class="http-msg-body">' + AV.fmtJSON({ orderId: reqId, customerId: order.customerId, total: order.total, items: order.items }) + "</div></div>" +
            (leaked ? '<div class="callout danger" style="margin-top:var(--space-3)"><span class="callout-icon">🧨</span><div class="callout-body"><b>Data leak!</b> You just read customer ' + order.customerId + "'s order by changing the id. The broken server trusted the id without an ownership check. Switch to <b>Fixed</b>.</div></div>"
              : '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">✅</span><div class="callout-body">This is your own order, so returning it is correct.</div></div>');
        }
      });
      container.querySelector("#bola-run").click();
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function card(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }
  function yn(b) { return b ? '<span style="color:var(--green)">✔ yes</span>' : '<span style="color:var(--red)">✘ no</span>'; }

  AV.registerModule(module);
})();
