/* ============================================================
   modules/rate-limiting.js — Rate Limiting
   Simulate fixed-window, sliding-window, token-bucket and
   leaky-bucket over the SAME deterministic request timeline so the
   behavioral differences are visible. Shows 429 + Retry-After.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var WINDOW = 60000; // 60s

  // Deterministic request arrival times (ms): a burst, then a steady trickle.
  function buildRequests() {
    var t = [], i;
    for (i = 0; i < 14; i++) t.push(200 * i);        // burst: 14 in first ~3s
    for (i = 0; i < 12; i++) t.push(6000 + 6000 * i); // trickle across the next ~72s
    return t.sort(function (a, b) { return a - b; });
  }

  var module = {
    id: "rate-limiting",
    title: "Rate Limiting",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");
      var algos = AV.data.security.rateAlgos;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Security</div>' +
          '<h1 class="module-title">Protect the API from bursts, abuse, and cost blow-ups</h1>' +
          '<p class="module-subtitle">All four algorithms enforce "N requests per minute" — but they treat a burst very differently. Run the same request timeline through each and watch which requests get a <span class="status-pill st-4xx">429</span>.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Configure</div>' +
            '<div class="field"><label>Algorithm</label><select class="select" id="rl-algo">' + algos.map(function (a, i) { return '<option value="' + i + '">' + a.k + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label>Limit: <b id="rl-lim-l">10</b> requests / minute</label><input type="range" min="4" max="20" value="10" id="rl-lim" class="anim-scrub" style="width:100%"/></div>' +
            '<div id="rl-algo-note"></div>' +
            '<button class="btn btn-primary" id="rl-run" style="margin-top:var(--space-3)">▶ Replay the timeline</button>' +
          "</div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Result</div><div class="stat-row" id="rl-stats"></div>' +
            '<div class="panel-title" style="margin-top:var(--space-4)">Timeline (burst → trickle)</div><div class="rl-timeline" id="rl-timeline"></div>' +
            '<div class="pill-legend" style="margin-top:var(--space-2)"><span><span class="spark" style="background:var(--green)"></span> allowed</span><span><span class="spark" style="background:var(--red)"></span> 429</span></div></div>' +
            '<div class="panel"><div class="panel-title">A 429 response</div><div class="http-msg"><div class="http-msg-head"><span>Too Many Requests</span><span class="status-pill st-4xx">429</span></div>' +
            '<div class="http-msg-body"><span class="http-hdr-key">Retry-After</span>: <span class="http-hdr-val">30</span>\n<span class="http-hdr-key">X-RateLimit-Limit</span>: <span class="http-hdr-val">10</span>\n<span class="http-hdr-key">X-RateLimit-Remaining</span>: <span class="http-hdr-val">0</span>\n\n' + AV.fmtJSON({ title: "Rate limit exceeded", status: 429, code: "RATE_LIMITED" }) + "</div></div>" +
            '<p class="text-muted text-sm" style="margin-top:var(--space-2)">Clients should honor <code>Retry-After</code> and back off rather than hammering.</p></div></aside>' +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">The four algorithms</h2><div class="note-grid">' +
          algos.map(function (a) { return '<div class="panel"><div class="panel-title">' + a.k + '</div><p>' + a.how + "</p><dl class=\"kv\"><dt>Pro</dt><dd>" + a.pro + "</dd><dt>Con</dt><dd>" + a.con + "</dd></dl></div>"; }).join("") +
          "</div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🌐</span><div class="callout-body"><b>Distributed rate limiting:</b> with many API servers, a per-instance counter lets a client get N× the limit. Use a shared store (e.g. Redis) for the counter. And <b>IP-based limits are weak</b> — many users share an IP (NAT/corporate), and attackers rotate IPs; prefer per-API-key / per-user limits.</div></div>' +
        "</section>";

      var limEl = container.querySelector("#rl-lim");
      var limL = container.querySelector("#rl-lim-l");
      var algoSel = container.querySelector("#rl-algo");
      var noteEl = container.querySelector("#rl-algo-note");
      limEl.addEventListener("input", function () { limL.textContent = limEl.value; });
      algoSel.addEventListener("change", showNote);
      function showNote() { var a = algos[parseInt(algoSel.value, 10)]; noteEl.innerHTML = '<div class="callout tip"><span class="callout-icon">ℹ️</span><div class="callout-body">' + a.how + "</div></div>"; }
      showNote();

      function simulate(algoIdx, limit) {
        var reqs = buildRequests();
        var decisions = [];
        if (algoIdx === 0) { // fixed window
          var counts = {};
          reqs.forEach(function (t) { var w = Math.floor(t / WINDOW); counts[w] = (counts[w] || 0) + 1; decisions.push(counts[w] <= limit); });
        } else if (algoIdx === 1) { // sliding window (log of allowed)
          var allowed = [];
          reqs.forEach(function (t) { while (allowed.length && allowed[0] <= t - WINDOW) allowed.shift(); if (allowed.length < limit) { allowed.push(t); decisions.push(true); } else decisions.push(false); });
        } else if (algoIdx === 2) { // token bucket
          var tokens = limit, last = reqs[0], rate = limit / WINDOW; // refill limit tokens per window
          reqs.forEach(function (t) { tokens = Math.min(limit, tokens + (t - last) * rate); last = t; if (tokens >= 1) { tokens -= 1; decisions.push(true); } else decisions.push(false); });
        } else { // leaky bucket
          var level = 0, last2 = reqs[0], leak = limit / WINDOW;
          reqs.forEach(function (t) { level = Math.max(0, level - (t - last2) * leak); last2 = t; if (level < limit) { level += 1; decisions.push(true); } else decisions.push(false); });
        }
        return { reqs: reqs, decisions: decisions };
      }

      function run() {
        var algoIdx = parseInt(algoSel.value, 10);
        var limit = parseInt(limEl.value, 10);
        var r = simulate(algoIdx, limit);
        var allowed = r.decisions.filter(Boolean).length;
        var denied = r.decisions.length - allowed;
        container.querySelector("#rl-stats").innerHTML =
          stat(r.decisions.length, "requests") + stat(allowed, "allowed", "good") + stat(denied, "429s", denied ? "bad" : "good");
        var span = r.reqs[r.reqs.length - 1] || 1;
        container.querySelector("#rl-timeline").innerHTML = r.reqs.map(function (t, i) {
          var left = (t / span) * 100;
          return '<span class="rl-dot" title="' + (t / 1000).toFixed(1) + 's" style="left:' + left + '%;background:' + (r.decisions[i] ? "var(--green)" : "var(--red)") + '"></span>';
        }).join("");
      }
      container.querySelector("#rl-run").addEventListener("click", run);
      run();
    },
    destroy: function () {}
  };

  function stat(n, l, kind) { var c = kind === "good" ? "var(--green)" : kind === "bad" ? "var(--red)" : "var(--airflow-bright)"; return '<div class="stat"><div class="stat-num" style="color:' + c + '">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }

  AV.registerModule(module);
})();
