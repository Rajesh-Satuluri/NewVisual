/* ============================================================
   modules/oauth.js — OAuth 2.0 & JWT
   OAuth roles + Authorization Code flow with PKCE (step-through),
   OAuth-vs-OIDC, and a JWT inspector that clearly separates DECODING
   from cryptographic VERIFICATION. Fictional tokens only.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var ROLES = [
    ["Resource owner", "The user who owns the data (the shopper)."],
    ["Client", "The app requesting access (ShopSphere mobile app)."],
    ["Authorization server", "Authenticates the user + issues tokens (the IdP)."],
    ["Resource server", "The API that holds the data and accepts access tokens."]
  ];

  var FLOW = [
    "Client generates a random <code>code_verifier</code> and its SHA-256 hash <code>code_challenge</code> (PKCE).",
    "Client redirects the user to the authorization server with the <code>code_challenge</code>.",
    "User authenticates and consents to the requested <b>scopes</b>.",
    "Auth server redirects back to the client with a short-lived <b>authorization code</b>.",
    "Client exchanges the code <b>+ the original code_verifier</b> for tokens (back-channel).",
    "Auth server verifies the verifier hashes to the earlier challenge, then returns an <b>access token</b> (+ refresh token, and an ID token for OIDC).",
    "Client calls the resource server with <code>Authorization: Bearer &lt;access token&gt;</code>.",
    "Resource server validates the token (signature, expiry, <b>audience</b>, scopes) and serves the data."
  ];

  // Fictional JWT (HS256). Signature is illustrative — never a real secret.
  var SAMPLE_JWT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    btoa(JSON.stringify({ sub: "C1024", name: "Fictional User", scope: "orders:read orders:write", iss: "https://idp.shopsphere.example", aud: "shopsphere-api", iat: 1714550400, exp: 1714554000 })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") +
    ".s1gn4tur3-illustrative-not-real";

  var module = {
    id: "oauth",
    title: "OAuth 2.0 & JWT",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Security</div>' +
          '<h1 class="module-title">Delegated access with OAuth 2.0, identity with OIDC</h1>' +
          '<p class="module-subtitle">OAuth 2.0 lets a user grant an app scoped access to their data <i>without sharing their password</i>. OpenID Connect adds identity on top. Then inspect a JWT — and see why decoding is not verifying.</p></div>' +

        '<div class="tabstrip">' + T("flow", "Auth Code + PKCE", true) + T("oidc", "OAuth vs OIDC") + T("jwt", "JWT inspector") + "</div>" +

        P("flow", true,
          '<div class="note-grid" style="margin-bottom:var(--space-4)">' + ROLES.map(function (r) { return card(r[0], r[1]); }).join("") + "</div>" +
          '<div class="panel"><div class="panel-title">Authorization Code flow with PKCE — step through it</div>' +
            '<div class="oauth-flow" id="oauth-steps"></div>' +
            '<div class="oauth-nav"><button class="btn btn-ghost btn-sm" id="oa-prev">← Prev</button><span id="oa-pos" class="mono"></span><button class="btn btn-primary btn-sm" id="oa-next">Next →</button></div>' +
          "</div>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🔐</span><div class="callout-body"><b>Why PKCE?</b> It binds the token exchange to the client that started the flow, so an intercepted authorization code is useless without the original <code>code_verifier</code>. It\'s now recommended for <i>all</i> clients, not just mobile. (RFC 7636 / OAuth 2.1.)</div></div>'
        ) +

        P("oidc", false,
          '<div class="lab-2col">' +
            card2("OAuth 2.0 — authorization", ["Answers: <i>what may this app do?</i>", "Issues an <b>access token</b> for scoped API access", "Says nothing (officially) about <i>who</i> the user is", "Scopes: orders:read, orders:write, …"]) +
            card2("OpenID Connect — authentication", ["A thin identity layer ON TOP of OAuth 2.0", "Adds an <b>ID token</b> (a JWT about the user)", "Answers: <i>who is this user?</i>", "Standard claims: sub, name, email, …"]) +
          "</div>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">⚠️</span><div class="callout-body">Common confusion: using an <b>access token</b> as proof of identity. The access token is for the <i>resource server</i>; use the <b>ID token</b> (OIDC) for who-the-user-is. Also validate <b>audience</b> — a token minted for another service must not be accepted by yours.</div></div>' +
          '<div class="callout info" style="margin-top:var(--space-3)"><span class="callout-icon">🔁</span><div class="callout-body"><b>Tokens &amp; lifetimes:</b> access tokens are short-lived; a <b>refresh token</b> gets new ones without re-prompting. Support <b>revocation</b> and <b>rotation</b>, and validate <b>expiry</b> + <b>issuer</b> + <b>audience</b> on every call.</div></div>'
        ) +

        P("jwt", false,
          '<p class="panel-sub">A JWT has three dot-separated parts: <code>header.payload.signature</code>. The first two are just base64url-encoded JSON — anyone can read them.</p>' +
          '<div class="field"><label>JWT (fictional)</label><textarea class="textarea mono" id="jwt-in" rows="4">' + SAMPLE_JWT + "</textarea></div>" +
          '<div id="jwt-out"></div>' +
          '<div class="callout danger" style="margin-top:var(--space-4)"><span class="callout-icon">🧨</span><div class="callout-body"><b>Decoding ≠ verifying.</b> Reading the payload proves nothing — anyone can craft a JWT with <code>"scope":"admin"</code>. Only verifying the <b>signature</b> (with the issuer\'s secret/public key) proves it\'s authentic and untampered. Also: a JWT is <b>signed, not encrypted</b> — never put secrets in the payload. Always check <b>exp</b>, <b>iss</b>, and <b>aud</b>.</div></div>'
        );

      AV.ui.wireTabs(container);

      // flow stepper
      var stepsEl = container.querySelector("#oauth-steps");
      var posEl = container.querySelector("#oa-pos");
      var step = 0;
      function renderFlow() {
        stepsEl.innerHTML = FLOW.map(function (s, i) {
          var state = i < step ? "done" : i === step ? "active" : "";
          return '<div class="oauth-step ' + state + '"><span class="oauth-step-n">' + (i + 1) + "</span><div>" + s + "</div></div>";
        }).join("");
        posEl.textContent = "step " + (step + 1) + " / " + FLOW.length;
        container.querySelector("#oa-prev").disabled = step === 0;
        container.querySelector("#oa-next").disabled = step === FLOW.length - 1;
      }
      container.querySelector("#oa-prev").addEventListener("click", function () { if (step > 0) { step--; renderFlow(); } });
      container.querySelector("#oa-next").addEventListener("click", function () { if (step < FLOW.length - 1) { step++; renderFlow(); } });
      renderFlow();

      // JWT inspector
      var jwtIn = container.querySelector("#jwt-in");
      var jwtOut = container.querySelector("#jwt-out");
      function b64urlDecode(s) { try { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } }
      function inspect() {
        var parts = jwtIn.value.trim().split(".");
        if (parts.length !== 3) { jwtOut.innerHTML = '<div class="callout danger"><span class="callout-icon">🚫</span><div class="callout-body">Not a JWT — expected three dot-separated parts.</div></div>'; return; }
        var h = b64urlDecode(parts[0]), p = b64urlDecode(parts[1]);
        var hObj, pObj;
        try { hObj = JSON.parse(h); pObj = JSON.parse(p); } catch (e) { jwtOut.innerHTML = '<div class="callout danger"><span class="callout-icon">🚫</span><div class="callout-body">Header/payload are not valid base64url JSON.</div></div>'; return; }
        var now = 1714552000; // fixed "now" for the fictional token
        var expired = pObj.exp && pObj.exp < now;
        jwtOut.innerHTML =
          '<div class="lab-2col">' +
            '<div class="http-msg"><div class="http-msg-head"><span>Header (decoded)</span></div><div class="http-msg-body">' + AV.fmtJSON(hObj) + "</div></div>" +
            '<div class="http-msg"><div class="http-msg-head"><span>Payload / claims (decoded)</span></div><div class="http-msg-body">' + AV.fmtJSON(pObj) + "</div></div>" +
          "</div>" +
          '<dl class="kv" style="margin-top:var(--space-3)">' +
            "<dt>Subject (sub)</dt><dd class=\"mono\">" + (pObj.sub || "—") + "</dd>" +
            "<dt>Issuer (iss)</dt><dd class=\"mono\">" + (pObj.iss || "—") + "</dd>" +
            "<dt>Audience (aud)</dt><dd class=\"mono\">" + (pObj.aud || "—") + "</dd>" +
            "<dt>Scopes</dt><dd class=\"mono\">" + (pObj.scope || "—") + "</dd>" +
            "<dt>Expiry (exp)</dt><dd>" + (pObj.exp ? (expired ? '<span style="color:var(--red)">expired</span>' : '<span style="color:var(--green)">valid</span>') + ' <span class="text-muted">(' + pObj.exp + ")</span>" : "—") + "</dd>" +
            "<dt>Signature</dt><dd><span style=\"color:var(--orange)\">present but NOT verified here</span></dd>" +
          "</dl>";
      }
      jwtIn.addEventListener("input", inspect);
      inspect();
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function card(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }
  function card2(t, items) { return '<div class="panel"><div class="panel-title">' + t + '</div><ul class="tick-list">' + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div>"; }

  AV.registerModule(module);
})();
