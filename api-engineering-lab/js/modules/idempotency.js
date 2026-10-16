/* ============================================================
   modules/idempotency.js — Idempotency & Retries
   Simulates duplicate order/payment creation under retries, with
   and without an idempotency key: response loss, key reuse, same
   key + different payload, and record expiry. Shows requests
   received vs operations executed vs orders created + the record.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "idempotency",
    title: "Idempotency & Retries",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">A double-tap must not create two orders</h1>' +
          '<p class="module-subtitle">On a flaky connection the app retries checkout. Without protection, every retry is a new order — and a new charge. Configure a scenario and run it: compare orders <i>created</i> against requests <i>received</i>.</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div class="panel"><div class="panel-title">Scenario</div>' +
            '<div class="field"><label><input type="checkbox" id="id-key" checked /> Send an Idempotency-Key</label></div>' +
            '<div class="field"><label>Total attempts (1 original + retries): <b id="id-n-label">3</b></label>' +
              '<input type="range" min="1" max="6" value="3" id="id-n" class="anim-scrub" style="width:100%" /></div>' +
            '<div class="field"><label><input type="checkbox" id="id-loss" checked /> First response is lost (client never sees it, so it retries)</label></div>' +
            '<div class="field"><label>Retry payload</label><select class="select" id="id-payload"><option value="same">Same key, same body (normal retry)</option><option value="diff">Same key, different body (bug / reused key)</option></select></div>' +
            '<div class="field"><label><input type="checkbox" id="id-expire" /> Idempotency record expired before the retry</label></div>' +
            '<button class="btn btn-primary" id="id-run" style="margin-top:var(--space-2)">▶ Run checkout</button>' +
            '<div class="stat-row" id="id-stats" style="margin-top:var(--space-4)"></div>' +
          "</div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Attempt log</div><div id="id-log"></div></div>' +
            '<div class="panel"><div class="panel-title">Idempotency records (server-side)</div><div id="id-records"></div></div></aside>' +
        "</div>" +

        '<section class="section" style="margin-top:var(--space-6)">' +
          '<div class="callout warn"><span class="callout-icon">⚠️</span><div class="callout-body"><b>A header alone does nothing.</b> Idempotency works only when the server <b>persists</b> the key → response, matches the request body to the stored key, handles concurrent retries (a unique constraint or lock), and sets a sensible retention window. The key is a promise the server has to keep.</div></div>' +
          '<div class="note-grid" style="margin-top:var(--space-4)">' +
            mini("Without a key", "Each retry is a fresh POST → a new order + a new charge. Classic double-order bug.") +
            mini("With a key", "The first request does the work and stores the result; retries return the <i>same</i> stored response — one order, no matter how many retries.") +
            mini("Same key, different body", "The server detects the mismatch and refuses with 409/422 — it won't silently apply a different operation under a used key.") +
          "</div>" +
        "</section>";

      var els = {
        key: container.querySelector("#id-key"), n: container.querySelector("#id-n"), loss: container.querySelector("#id-loss"),
        payload: container.querySelector("#id-payload"), expire: container.querySelector("#id-expire")
      };
      var nLabel = container.querySelector("#id-n-label");
      var statsEl = container.querySelector("#id-stats");
      var logEl = container.querySelector("#id-log");
      var recEl = container.querySelector("#id-records");

      els.n.addEventListener("input", function () { nLabel.textContent = els.n.value; });

      function run() {
        var attempts = parseInt(els.n.value, 10);
        var useKey = els.key.checked;
        var diffBody = els.payload.value === "diff";
        var expire = els.expire.checked;
        var key = useKey ? "chk-9f1c-42" : null;

        var records = {}; // key -> {bodyHash, response, createdAtAttempt}
        var seq = 10025;
        var ordersCreated = 0, opsExecuted = 0;
        var log = [];

        for (var i = 1; i <= attempts; i++) {
          var bodyHash = diffBody && i > 1 ? "bodyB" : "bodyA";
          var received = "received";
          var line;
          if (useKey && records[key]) {
            var rec = records[key];
            var expiredNow = expire && i === attempts; // last retry after expiry
            if (expiredNow) {
              // record gone → treated as new → duplicate
              seq++; ordersCreated++; opsExecuted++;
              records[key] = { bodyHash: bodyHash, response: "ORD-" + seq, at: i };
              line = ["dup", "Attempt " + i + ": key found but <b>record expired</b> → treated as new → <b>created ORD-" + seq + "</b> (a duplicate!)"];
            } else if (rec.bodyHash !== bodyHash) {
              line = ["err", "Attempt " + i + ": same key, <b>different body</b> → <span class='status-pill st-4xx'>409</span> Conflict. Server refuses to reuse the key for a different operation."];
            } else {
              line = ["replay", "Attempt " + i + ": key matches → <b>replayed stored response</b> (" + rec.response + "). No new order, no new charge."];
            }
          } else {
            // first time this key is seen (or no key at all) → do the work
            seq++; ordersCreated++; opsExecuted++;
            if (useKey) records[key] = { bodyHash: bodyHash, response: "ORD-" + seq, at: i };
            var lost = els.loss.checked && i === 1;
            line = [useKey ? "ok" : "dup", "Attempt " + i + ": " + (useKey ? "no record yet → " : "no key → ") + "<b>created ORD-" + seq + "</b>" + (lost ? " — but the response was <b>lost</b>, so the client retries." : ".")];
          }
          log.push(line);
        }

        statsEl.innerHTML =
          stat(attempts, "requests received") +
          stat(opsExecuted, "operations executed") +
          stat(ordersCreated, "orders created", ordersCreated === 1 ? "good" : "bad");
        logEl.innerHTML = log.map(function (l) {
          var cls = l[0] === "ok" ? "tip" : l[0] === "replay" ? "info" : l[0] === "err" ? "warn" : "danger";
          var icon = l[0] === "ok" ? "✅" : l[0] === "replay" ? "♻️" : l[0] === "err" ? "⚠️" : "🧨";
          return '<div class="callout ' + cls + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + icon + '</span><div class="callout-body">' + l[1] + "</div></div>";
        }).join("");
        recEl.innerHTML = Object.keys(records).length
          ? '<table class="dtable"><thead><tr><th>key</th><th>body</th><th>stored response</th></tr></thead><tbody>' +
            Object.keys(records).map(function (k) { return '<tr><td class="mono">' + k + "</td><td class=\"mono\">" + records[k].bodyHash + "</td><td class=\"mono\">" + records[k].response + "</td></tr>"; }).join("") + "</tbody></table>"
          : '<p class="text-muted">No key sent → the server stores nothing, so it can\'t recognize a retry.</p>';

        var verdict = ordersCreated === 1
          ? '<div class="callout tip" style="margin-top:var(--space-3)"><span class="callout-icon">🎉</span><div class="callout-body"><b>Exactly one order.</b> ' + attempts + " requests, 1 business effect — the retries were safe.</div></div>"
          : '<div class="callout danger" style="margin-top:var(--space-3)"><span class="callout-icon">🧨</span><div class="callout-body"><b>' + ordersCreated + " orders created from " + attempts + " requests.</b> The customer may be charged " + ordersCreated + " times. This is the bug idempotency keys prevent.</div></div>";
        logEl.insertAdjacentHTML("beforeend", verdict);
      }

      container.querySelector("#id-run").addEventListener("click", run);
      run();
    },
    destroy: function () {}
  };

  function stat(num, label, kind) {
    var color = kind === "good" ? "var(--green)" : kind === "bad" ? "var(--red)" : "var(--airflow-bright)";
    return '<div class="stat"><div class="stat-num" style="color:' + color + '">' + num + '</div><div class="stat-label">' + label + "</div></div>";
  }
  function mini(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }

  AV.registerModule(module);
})();
