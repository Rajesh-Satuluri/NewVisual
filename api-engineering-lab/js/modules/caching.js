/* ============================================================
   modules/caching.js — Caching
   Cache layers, a cold-vs-warm cache run, a conditional-request
   (ETag / If-None-Match → 304) simulator, invalidation, and when
   caching is unsafe. Simulated timings.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "caching",
    title: "Caching",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var layers = AV.data.perf.cacheLayers;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Performance</div>' +
          '<h1 class="module-title">Serve it once, reuse it many times</h1>' +
          '<p class="module-subtitle">Caching is the highest-leverage API optimization for read-heavy data — and the easiest to get dangerously wrong. Run a catalog request cold then warm, and see conditional requests save bandwidth.</p></div>' +

        '<div class="tabstrip">' + T("warm", "Cold vs warm", true) + T("etag", "ETag / 304") + T("layers", "Cache layers") + "</div>" +

        P("warm", true,
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">GET /v1/products (repeat it)</div>' +
              '<button class="btn btn-primary" id="ca-req">▶ Send request</button> ' +
              '<button class="btn btn-ghost btn-sm" id="ca-reset">Clear cache</button>' +
              '<div id="ca-log" style="margin-top:var(--space-3)"></div></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">Cache</div><div id="ca-state"></div></aside>' +
          "</div>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">⚡</span><div class="callout-body">The first request is a <b>cache miss</b> (slow — hits the DB). Subsequent requests within the TTL are <b>hits</b> (fast — served from cache). <code>Cache-Control: max-age=60</code> tells caches how long the response stays fresh.</div></div>'
        ) +

        P("etag", false,
          '<p class="panel-sub">Conditional requests save <b>bandwidth</b> even when the cache has expired: the client asks "has it changed since this version?" and the server answers 304 if not.</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Conditional GET</div>' +
              '<button class="btn btn-primary" id="et-req">▶ Send conditional GET</button> ' +
              '<button class="btn btn-ghost btn-sm" id="et-change">Change the resource</button>' +
              '<div id="et-log" style="margin-top:var(--space-3)"></div></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">How it works</div>' +
              '<ol class="tick-list"><li>Server returns <code>ETag: "v1"</code> with the body.</li><li>Client re-requests with <code>If-None-Match: "v1"</code>.</li><li>Unchanged → <span class="status-pill st-3xx">304</span> with no body (tiny).</li><li>Changed → <span class="status-pill st-2xx">200</span> with a new ETag + body.</li></ol></aside>' +
          "</div>"
        ) +

        P("layers", false,
          '<p class="panel-sub">Caching happens at many layers; each trades freshness for speed.</p>' +
          '<div class="note-grid">' + layers.map(function (l) { return '<div class="panel"><div class="panel-title">' + l.k + '</div><dl class="kv"><dt>Where</dt><dd>' + l.where + "</dd><dt>Good for</dt><dd>" + l.good + "</dd><dt>Watch out</dt><dd>" + l.watch + "</dd></dl></div>"; }).join("") + "</div>" +
          '<div class="callout danger" style="margin-top:var(--space-4)"><span class="callout-icon">🔒</span><div class="callout-body"><b>Never cache personalized or sensitive responses</b> in a shared cache (CDN/proxy) — one user could be served another\'s data. Mark them <code>Cache-Control: private, no-store</code>, and <code>Vary</code> on Authorization. <b>Cache invalidation</b> is the hard part: prefer short TTLs or event-based invalidation over long TTLs you can\'t clear.</div></div>'
        );

      AV.ui.wireTabs(container);

      // cold vs warm
      var cache = null; // {body, at}
      function renderCacheState() {
        container.querySelector("#ca-state").innerHTML = cache
          ? '<div class="callout tip"><span class="callout-icon">🟢</span><div class="callout-body">Warm — product catalog cached (max-age 60s).</div></div>'
          : '<div class="callout warn"><span class="callout-icon">⚪</span><div class="callout-body">Cold — nothing cached yet.</div></div>';
      }
      var caLog = [];
      container.querySelector("#ca-req").addEventListener("click", function () {
        var hit = !!cache;
        if (!cache) cache = { at: Date.now() };
        caLog.unshift(hit
          ? ["tip", "Cache HIT → served from cache in <b>~2 ms</b> (no DB)."]
          : ["warn", "Cache MISS → queried DB, served in <b>~48 ms</b>, then cached."]);
        container.querySelector("#ca-log").innerHTML = caLog.slice(0, 6).map(function (l) { return '<div class="callout ' + l[0] + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + (l[0] === "tip" ? "⚡" : "🐢") + '</span><div class="callout-body">' + l[1] + "</div></div>"; }).join("");
        renderCacheState();
      });
      container.querySelector("#ca-reset").addEventListener("click", function () { cache = null; caLog.unshift(["warn", "Cache cleared — next request is a miss again."]); container.querySelector("#ca-log").innerHTML = caLog.slice(0, 6).map(function (l) { return '<div class="callout ' + l[0] + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">🧹</span><div class="callout-body">' + l[1] + "</div></div>"; }).join(""); renderCacheState(); });
      renderCacheState();

      // ETag
      var version = 1, clientEtag = null, etLog = [];
      function etRender() {
        container.querySelector("#et-log").innerHTML = etLog.slice(0, 6).map(function (l) { return '<div class="callout ' + l[0] + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + l[1] + '</span><div class="callout-body">' + l[2] + "</div></div>"; }).join("");
      }
      container.querySelector("#et-req").addEventListener("click", function () {
        var server = '"v' + version + '"';
        if (clientEtag === server) etLog.unshift(["info", "📭", "Sent <code>If-None-Match: " + server + "</code> → <span class='status-pill st-3xx'>304</span> Not Modified. No body sent — tiny response, client reuses its copy."]);
        else { etLog.unshift(["tip", "📦", "Sent " + (clientEtag ? "<code>If-None-Match: " + clientEtag + "</code>" : "(no ETag)") + " → <span class='status-pill st-2xx'>200</span> with new <code>ETag: " + server + "</code> + full body."]); clientEtag = server; }
        etRender();
      });
      container.querySelector("#et-change").addEventListener("click", function () { version++; etLog.unshift(["warn", "✏️", "Resource changed server-side → new ETag will be <code>\"v" + version + "\"</code>. Next conditional GET returns 200."]); etRender(); });
      etRender();
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }

  AV.registerModule(module);
})();
