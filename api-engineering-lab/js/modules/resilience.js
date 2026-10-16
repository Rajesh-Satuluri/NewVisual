/* ============================================================
   modules/resilience.js — Failure Injection & Resilience
   Simulate a flaky/slow payment provider under load and see how
   naive retries cause a storm, and how timeout budgets, bounded
   retries with backoff + jitter, and a circuit breaker tame it.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var CLIENTS = 12; // concurrent client requests in the batch

  var module = {
    id: "resilience",
    title: "Failure Injection & Resilience",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Architecture</div>' +
          '<h1 class="module-title">One slow dependency must not take down checkout</h1>' +
          '<p class="module-subtitle">When the external payment provider degrades, naive retries pile on and turn a blip into an outage. Inject a failure and tune the resilience controls — watch the load you put on the struggling provider.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Inject &amp; tune</div>' +
            '<div class="field"><label>Payment provider state</label><div class="segmented" id="rs-state"><button data-s="healthy">Healthy</button><button class="active" data-s="failing">Failing</button><button data-s="slow">Slow</button></div></div>' +
            '<div class="field"><label>Timeout budget: <b id="rs-to-l">800</b> ms</label><input type="range" min="200" max="2000" step="100" value="800" id="rs-to" class="anim-scrub" style="width:100%"/></div>' +
            '<div class="field"><label>Max retries per request: <b id="rs-rt-l">3</b></label><input type="range" min="0" max="5" value="3" id="rs-rt" class="anim-scrub" style="width:100%"/></div>' +
            '<div class="field"><label>Backoff</label><div class="segmented" id="rs-backoff"><button data-b="none" class="active">None</button><button data-b="fixed">Fixed</button><button data-b="expo">Exponential</button></div></div>' +
            '<div class="field"><label><input type="checkbox" id="rs-jitter"/> Add jitter</label></div>' +
            '<div class="field"><label><input type="checkbox" id="rs-breaker"/> Circuit breaker (opens after 5 failures)</label></div>' +
            '<button class="btn btn-primary" id="rs-run">▶ Send ' + CLIENTS + " checkout requests</button>" +
          "</div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Load on the provider</div><div class="stat-row" id="rs-stats"></div><div id="rs-verdict" style="margin-top:var(--space-3)"></div></div>' +
            '<div class="panel"><div class="panel-title">Upstream call timeline</div><div id="rs-timeline" class="rs-timeline"></div><div class="pill-legend" style="margin-top:var(--space-3)"><span><span class="spark" style="background:var(--green)"></span> success</span><span><span class="spark" style="background:var(--red)"></span> fail/timeout</span><span><span class="spark" style="background:var(--text-disabled)"></span> fast-fail (breaker)</span></div></div></aside>' +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)"><h2 class="section-title">The resilience toolkit</h2><div class="note-grid">' +
          pat("Timeout budget", "Cap how long you wait. Without it, a slow dependency ties up your threads/connections until you fall over too.") +
          pat("Bounded retries", "Retry a <i>small, fixed</i> number of times — never unbounded. Each retry is more load on an already-struggling system.") +
          pat("Backoff + jitter", "Wait longer between retries (exponential), and randomize (jitter) so all clients don't retry in lockstep and create a thundering herd.") +
          pat("Circuit breaker", "After N failures, stop calling the dependency and fail fast for a cooldown — give it room to recover instead of hammering it.") +
          pat("Bulkhead", "Isolate resources per dependency so one slow dependency can't exhaust the pool the others need.") +
          pat("Load shedding / degrade", "Under overload, reject or degrade low-priority work early so the critical path stays up.") +
        "</div>" +
          '<div class="callout danger" style="margin-top:var(--space-4)"><span class="callout-icon">🌩️</span><div class="callout-body"><b>Retries can make an outage worse.</b> A failing dependency + aggressive retries = a <b>retry storm</b> that keeps it down. And retrying a <i>non-idempotent</i> call (like a charge) can double-execute — only retry what is safe to retry, or use an idempotency key.</div></div>' +
        "</section>";

      var state = "failing", backoff = "none";
      container.querySelector("#rs-state").addEventListener("click", seg("#rs-state", function (v) { state = v; }));
      container.querySelector("#rs-backoff").addEventListener("click", seg("#rs-backoff", function (v) { backoff = v; }, "data-b"));
      bind("#rs-to", "#rs-to-l"); bind("#rs-rt", "#rs-rt-l");

      function seg(sel, set, attr) {
        attr = attr || "data-s";
        return function (e) { var b = e.target.closest("button"); if (!b) return; container.querySelectorAll(sel + " button").forEach(function (x) { x.classList.toggle("active", x === b); }); set(b.getAttribute(attr)); };
      }
      function bind(range, label) { var r = container.querySelector(range), l = container.querySelector(label); r.addEventListener("input", function () { l.textContent = r.value; }); }

      function run() {
        var timeout = parseInt(container.querySelector("#rs-to").value, 10);
        var maxRetries = parseInt(container.querySelector("#rs-rt").value, 10);
        var jitter = container.querySelector("#rs-jitter").checked;
        var breaker = container.querySelector("#rs-breaker").checked;

        // provider behavior
        var providerLatency = state === "slow" ? 1500 : 40;
        function callSucceeds() { return state === "healthy" || (state === "slow" && providerLatency <= timeout); }

        var timeline = []; // {outcome}
        var upstreamCalls = 0, successes = 0, failures = 0, fastFailed = 0;
        var consecFail = 0, breakerOpen = false;

        for (var c = 0; c < CLIENTS; c++) {
          var attempts = 0, done = false;
          while (!done) {
            if (breaker && breakerOpen) { timeline.push("fast"); fastFailed++; done = true; break; }
            upstreamCalls++; attempts++;
            var ok = callSucceeds();
            if (ok) { timeline.push("ok"); successes++; consecFail = 0; done = true; }
            else {
              timeline.push("fail"); failures++; consecFail++;
              if (breaker && consecFail >= 5) breakerOpen = true;
              if (attempts > maxRetries) { done = true; }
            }
          }
        }

        var baseline = CLIENTS * (1 + maxRetries); // worst case naive
        container.querySelector("#rs-stats").innerHTML =
          stat(upstreamCalls, "upstream calls", upstreamCalls > CLIENTS * 1.5 ? "bad" : "good") +
          stat(successes, "succeeded", successes === CLIENTS ? "good" : "") +
          stat(fastFailed, "fast-failed", fastFailed > 0 ? "good" : "");

        container.querySelector("#rs-timeline").innerHTML = timeline.map(function (o) {
          var col = o === "ok" ? "var(--green)" : o === "fail" ? "var(--red)" : "var(--text-disabled)";
          return '<span class="rs-dot" style="background:' + col + '"></span>';
        }).join("");

        var v;
        if (state === "healthy") v = ["tip", "✅", "Provider healthy — every request succeeds on the first try. " + upstreamCalls + " calls for " + CLIENTS + " requests."];
        else if (breaker && breakerOpen) v = ["tip", "🛡️", "The circuit breaker opened after 5 failures and <b>fast-failed</b> the rest — only " + upstreamCalls + " calls hit the struggling provider instead of up to " + baseline + ". That's how you give it room to recover."];
        else if (maxRetries > 0) v = ["danger", "🌩️", "<b>Retry storm:</b> " + CLIENTS + " requests × up to " + (1 + maxRetries) + " attempts = " + upstreamCalls + " calls slammed into a failing provider. " + (backoff === "none" ? "With no backoff they all hit at once." : "Backoff" + (jitter ? " + jitter" : "") + " spreads them out, but a breaker would cap the volume.") + " Turn on the circuit breaker."];
        else v = ["warn", "⚠️", "No retries, so only " + upstreamCalls + " calls — but every failing request surfaces an error to the customer. Pair a <i>small</i> retry budget with a breaker."];
        container.querySelector("#rs-verdict").innerHTML = '<div class="callout ' + v[0] + '"><span class="callout-icon">' + v[1] + '</span><div class="callout-body">' + v[2] + "</div></div>";
      }
      container.querySelector("#rs-run").addEventListener("click", run);
      run();
    },
    destroy: function () {}
  };

  function stat(n, l, kind) { var c = kind === "good" ? "var(--green)" : kind === "bad" ? "var(--red)" : "var(--airflow-bright)"; return '<div class="stat"><div class="stat-num" style="color:' + c + '">' + n + '</div><div class="stat-label">' + l + "</div></div>"; }
  function pat(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }

  AV.registerModule(module);
})();
