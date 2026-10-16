/* ============================================================
   modules/http-lab.js — HTTP Request–Response Lab (flagship)
   Drives AV.HttpSim through the AnimationEngine: each lifecycle
   stage lights up in turn with its narration, simulated latency,
   and logs; the final response is shown. Debug mode exposes
   failure injection so learners can watch errors propagate.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var SCENARIOS = {
    happy: { label: "Create an order (happy path)", req: { method: "POST", path: "/v1/orders", headers: { "Authorization": "Bearer …", "Content-Type": "application/json", "Idempotency-Key": "9f1c-42" }, body: { customerId: "C1024", items: [{ productId: "P501", quantity: 2 }] } }, opts: {} },
    reuse: { label: "Same client, reused connection", req: { method: "GET", path: "/v1/orders/ORD-10025", headers: { "Authorization": "Bearer …" } }, opts: { reuseConn: true } },
    ratelimited: { label: "Over rate limit → 429", req: { method: "GET", path: "/v1/products", headers: {} }, opts: { inject: { gatewayRateLimited: true } }, debug: true },
    unauth: { label: "Missing token → 401", req: { method: "POST", path: "/v1/orders", headers: {} }, opts: { inject: { authMissing: true } }, debug: true },
    forbidden: { label: "Wrong scope → 403", req: { method: "GET", path: "/v1/orders/ORD-9", headers: { "Authorization": "Bearer …" } }, opts: { inject: { authForbidden: true } }, debug: true },
    invalid: { label: "Bad body → 422", req: { method: "POST", path: "/v1/orders", headers: { "Authorization": "Bearer …" }, body: { items: [{ productId: "P501", quantity: 0 }] } }, opts: { inject: { validationFail: true } }, debug: true },
    dbtimeout: { label: "DB timeout → 503", req: { method: "GET", path: "/v1/orders", headers: { "Authorization": "Bearer …" } }, opts: { inject: { dbTimeout: true } }, debug: true },
    upstream: { label: "Payment provider timeout → 504", req: { method: "POST", path: "/v1/payments", headers: { "Authorization": "Bearer …" } }, opts: { inject: { downstreamTimeout: true } }, debug: true },
    dnsfail: { label: "DNS failure (network error)", req: { method: "GET", path: "/v1/products", headers: {} }, opts: { inject: { dnsFail: true } }, debug: true }
  };

  var module = {
    id: "http-lab",
    title: "HTTP Request–Response Lab",
    fullWidth: true,
    _engine: null, _controls: null, _offStep: null,

    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("beginner");
      var self = this;
      var life = AV.data.http.lifecycle;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Fundamentals</div>' +
          '<h1 class="module-title">Follow a request through its whole lifecycle</h1>' +
          '<p class="module-subtitle">Pick a scenario and press play. Each stage lights up with what it does, its <i>simulated</i> latency, and its logs — then the response comes back. Switch to <b>Debug</b> mode to inject failures and watch them propagate.</p></div>' +

        '<div class="panel"><div class="panel-title">Scenario</div>' +
          '<select class="select" id="hl-scenario">' + Object.keys(SCENARIOS).map(function (k) {
            var sc = SCENARIOS[k];
            return '<option value="' + k + '"' + (sc.debug ? ' data-debug="1"' : "") + ">" + sc.label + "</option>";
          }).join("") + "</select>" +
          '<div id="hl-req" class="http-msg" style="margin-top:var(--space-3)"></div>' +
        "</div>" +

        '<div class="lab-2col wide-right" style="margin-top:var(--space-4)">' +
          '<div class="panel"><div class="panel-title">Request lifecycle</div><div id="hl-pipe" class="pipe"></div>' +
            '<div class="pipe-total" id="hl-total"></div></div>' +
          '<aside class="panel sticky-side" id="hl-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="hl-controls" style="margin-top:var(--space-4)"></div>';

      var scenarioSel = container.querySelector("#hl-scenario");
      var reqEl = container.querySelector("#hl-req");
      var pipe = container.querySelector("#hl-pipe");
      var totalEl = container.querySelector("#hl-total");
      var detail = container.querySelector("#hl-detail");
      var controlsMount = container.querySelector("#hl-controls");

      var result = null;

      function buildRequestView(sc) {
        var r = sc.req;
        var hdrs = Object.keys(r.headers || {}).map(function (k) {
          return '<span class="http-hdr-key">' + k + '</span>: <span class="http-hdr-val">' + r.headers[k] + "</span>";
        }).join("\n");
        var body = r.body ? "\n\n" + AV.fmtJSON(r.body) : "";
        reqEl.innerHTML = '<div class="http-msg-head"><span>Request</span><span class="method-pill m-' + r.method.toLowerCase() + '">' + r.method + "</span></div>" +
          '<div class="http-msg-body"><span class="http-reqline">' + r.method + " " + r.path + ' HTTP/2</span>\n' + hdrs + body + "</div>";
      }

      function buildPipe() {
        pipe.innerHTML = result.stages.map(function (s, i) {
          return '<div class="pipe-row" data-i="' + i + '">' +
            '<span class="pipe-dot"></span>' +
            '<span class="pipe-label">' + s.label + "</span>" +
            '<span class="pipe-bar"><span style="width:' + Math.min(100, s.ms * 1.4) + '%"></span></span>' +
            '<span class="pipe-ms">' + (s.state === "skip" ? "—" : s.ms + "ms") + "</span></div>";
        }).join("");
      }

      function stageState(idx) {
        var rows = pipe.querySelectorAll(".pipe-row");
        rows.forEach(function (row, i) {
          row.classList.remove("active", "done", "fail", "skip");
          var st = result.stages[i].state;
          if (i < idx) row.classList.add(st === "fail" ? "fail" : st === "skip" ? "skip" : "done");
          else if (i === idx) row.classList.add(st === "fail" ? "fail" : st === "skip" ? "skip" : "active");
        });
      }

      function showDetail(idx) {
        if (idx < 0) { detail.innerHTML = '<div class="panel-title">Ready</div><p>Press <kbd>Space</kbd> to play, or <kbd>→</kbd> to step through each stage.</p>'; return; }
        var s = result.stages[idx];
        var narr = life[s.id] || {};
        var badge = s.state === "fail" ? '<span class="status-pill st-5xx">fails</span>' : s.state === "skip" ? '<span class="status-pill st-1xx">skipped</span>' : '<span class="status-pill st-2xx">ok</span>';
        detail.innerHTML =
          '<div class="panel-title" style="display:flex;justify-content:space-between;align-items:center">' + s.label + badge + "</div>" +
          (narr.what ? "<p><b>" + narr.what + "</b></p>" : "") +
          (narr.why ? "<p>" + narr.why + "</p>" : "") +
          (narr.detail ? '<p class="text-muted text-sm">' + narr.detail + "</p>" : "") +
          '<dl class="kv" style="margin-top:var(--space-3)"><dt>Latency</dt><dd>' + (s.state === "skip" ? "— (skipped)" : s.ms + " ms <span class=\"text-muted\">(simulated)</span>") + "</dd>" +
          "<dt>What happens</dt><dd>" + s.note + "</dd></dl>" +
          (s.logs && s.logs.length ? '<div class="code-block" style="margin-top:var(--space-3)"><div class="code-block-header"><span>log</span><span>runtime</span></div><div class="code-block-body"><code>' + s.logs.map(function (l) { return '<span class="code-line">' + esc(l) + "</span>"; }).join("") + "</code></div></div>" : "");
      }

      function showResponse() {
        var r = result.response;
        if (!r) return;
        if (r.networkError) {
          detail.innerHTML = '<div class="panel-title">Result</div><div class="callout danger"><span class="callout-icon">🔌</span><div class="callout-body"><b>Network error — no response.</b> ' + r.networkError + ". The client never received a status code, so it can't tell whether anything happened server-side.</div></div>";
          return;
        }
        var cls = "st-" + Math.floor(r.status / 100) + "xx";
        detail.innerHTML =
          '<div class="panel-title">Response</div>' +
          '<div class="http-msg"><div class="http-msg-head"><span>' + r.status + " " + r.statusText + '</span><span class="status-pill ' + cls + '">' + r.status + "</span></div>" +
          '<div class="http-msg-body">' + Object.keys(r.headers).map(function (k) { return '<span class="http-hdr-key">' + k + '</span>: <span class="http-hdr-val">' + esc(String(r.headers[k])) + "</span>"; }).join("\n") +
          (r.body !== null && r.body !== undefined ? "\n\n" + AV.fmtJSON(r.body) : "") + "</div></div>" +
          '<div class="pill-legend" style="margin-top:var(--space-3)"><span>Total simulated time: <b>' + result.totalMs + " ms</b></span></div>";
      }

      function load(key) {
        var sc = SCENARIOS[key];
        buildRequestView(sc);
        result = AV.HttpSim.run(sc.req, sc.opts);
        buildPipe();
        totalEl.textContent = "";
        // rebuild engine
        if (self._offStep) self._offStep();
        if (self._controls) self._controls.destroy();
        if (self._engine) self._engine.destroy();
        var steps = result.stages.filter(function (s) { return s.state !== "skip"; }).map(function (s) { return { label: s.label, duration: Math.max(700, s.ms * 18) }; });
        // Map engine step index → stage index (skip skipped stages)
        var mapIdx = [];
        result.stages.forEach(function (s, i) { if (s.state !== "skip") mapIdx.push(i); });
        var engine = new AV.AnimationEngine({ steps: steps, speed: 1 });
        self._engine = engine;
        self._offStep = engine.on("stepchange", function (si) {
          if (si < 0) { stageState(-1); showDetail(-1); totalEl.textContent = ""; return; }
          var stageIdx = mapIdx[si];
          stageState(stageIdx);
          showDetail(stageIdx);
          var sofar = 0; for (var i = 0; i <= stageIdx; i++) sofar += result.stages[i].ms;
          totalEl.innerHTML = "Elapsed (simulated): <b>" + sofar + " ms</b>";
          if (si === steps.length - 1) setTimeout(function () { if (engine.currentStep === steps.length - 1) { stageState(result.stages.length); showResponse(); } }, Math.max(400, (result.stages[stageIdx].ms * 18)));
        });
        var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
        controlsMount.appendChild(controls.el);
        self._controls = controls;
        showDetail(-1);
      }

      scenarioSel.addEventListener("change", function () { load(scenarioSel.value); });
      // In non-debug modes, hide the failure scenarios to reduce noise.
      function syncScenarioOptions() {
        var debug = (AV.ui.getMode && AV.ui.getMode()) === "debug";
        Array.prototype.forEach.call(scenarioSel.options, function (o) { if (o.getAttribute("data-debug")) o.hidden = !debug; });
        if (scenarioSel.selectedOptions[0] && scenarioSel.selectedOptions[0].hidden) { scenarioSel.value = "happy"; load("happy"); }
      }
      this._onMode = function () { syncScenarioOptions(); };
      window.addEventListener("apilab:mode", this._onMode);

      load("happy");
      syncScenarioOptions();
    },

    destroy: function () {
      if (this._onMode) window.removeEventListener("apilab:mode", this._onMode);
      if (this._offStep) this._offStep();
      if (this._controls) this._controls.destroy();
      if (this._engine) this._engine.destroy();
      this._engine = this._controls = this._offStep = null;
    }
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  AV.registerModule(module);
})();
