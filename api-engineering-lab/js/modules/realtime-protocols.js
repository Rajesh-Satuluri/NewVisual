/* ============================================================
   modules/realtime-protocols.js — WebSockets · Webhooks · Queues
   Async + realtime integration. Centerpiece: an interactive
   webhook delivery simulator (signature, duplicate, out-of-order,
   retry, dead-letter) showing why consumers must be idempotent.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var REALTIME = [
    { k: "Polling", how: "Client asks 'any updates?' on a timer.", pro: "Dead simple, works everywhere.", con: "Wasteful + laggy: mostly empty responses, updates delayed by the interval." },
    { k: "Long polling", how: "Request held open until there's data (or timeout).", pro: "Near-realtime over plain HTTP.", con: "Ties up connections; reconnect churn." },
    { k: "Server-Sent Events", how: "Server streams events over one long-lived HTTP response.", pro: "Simple one-way realtime; auto-reconnect built in.", con: "Server→client only; limited binary." },
    { k: "WebSockets", how: "Full-duplex persistent connection.", pro: "True bidirectional realtime (live order tracking, chat).", con: "Stateful connections to scale; auth, reconnect, heartbeat, backpressure to manage." }
  ];

  var module = {
    id: "realtime-protocols",
    title: "WebSockets · Webhooks · Queues",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Architecture · Protocols</div>' +
          '<h1 class="module-title">Async &amp; realtime: events that arrive late, twice, or out of order</h1>' +
          '<p class="module-subtitle">Payment confirmation, live tracking, and warehouse hand-off don\'t fit request-response. They\'re pushed as events — which means your consumers must cope with duplicates and reordering.</p></div>' +

        '<div class="tabstrip">' + T("webhooks", "Webhooks (simulator)", true) + T("realtime", "Polling · SSE · WebSockets") + T("queues", "Message queues") + "</div>" +

        P("webhooks", true,
          '<p class="panel-sub">The payment provider calls ShopSphere\'s webhook when a charge settles: <code>POST /webhooks/payments</code> with a <code>payment.succeeded</code> event. Deliveries are <b>at-least-once</b> — expect duplicates and reordering. Configure the chaos and process the stream.</p>' +
          '<div class="lab-2col wide-right">' +
            '<div class="panel"><div class="panel-title">Delivery conditions</div>' +
              '<div class="field"><label><input type="checkbox" id="wh-sig" checked/> Verify signature (reject forged/unsigned)</label></div>' +
              '<div class="field"><label><input type="checkbox" id="wh-idem" checked/> Consumer is idempotent (dedupe by event id)</label></div>' +
              '<div class="field"><label><input type="checkbox" id="wh-dup" checked/> Provider delivers a duplicate</label></div>' +
              '<div class="field"><label><input type="checkbox" id="wh-ooo"/> An event arrives out of order</label></div>' +
              '<div class="field"><label><input type="checkbox" id="wh-forge"/> A forged (bad-signature) event is injected</label></div>' +
              '<div class="field"><label><input type="checkbox" id="wh-fail"/> One delivery fails 3× then dead-letters</label></div>' +
              '<button class="btn btn-primary" id="wh-run">▶ Process webhook stream</button>' +
            "</div>" +
            '<aside class="sticky-side panel"><div class="panel-title">Delivery log</div><div id="wh-log"></div><div id="wh-outcome" style="margin-top:var(--space-3)"></div></aside>' +
          "</div>" +
          '<div class="callout warn" style="margin-top:var(--space-4)"><span class="callout-icon">🔁</span><div class="callout-body"><b>Webhook consumers must be idempotent.</b> Verify the signature + timestamp, dedupe by event id, tolerate out-of-order with a state machine (ignore a transition that\'s already past), ACK fast, and dead-letter what you can\'t process so one poison event doesn\'t block the rest.</div></div>'
        ) +

        P("realtime", false,
          '<p class="panel-sub">Pushing order-status updates to the app: four options, increasing in power and cost.</p>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Approach</th><th>How</th><th>Pro</th><th>Con</th></tr></thead><tbody>' +
          REALTIME.map(function (r) { return "<tr><td><b>" + r.k + "</b></td><td>" + r.how + "</td><td>" + r.pro + "</td><td>" + r.con + "</td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="callout info" style="margin-top:var(--space-4)"><span class="callout-icon">🔌</span><div class="callout-body"><b>WebSocket lifecycle:</b> connect → authenticate (the upgrade carries no cookies cross-origin, so pass a token) → heartbeat/ping to detect dead links → reconnect with backoff → handle backpressure (drop/aggregate if the client can\'t keep up). Scaling them means sticky sessions or a shared pub/sub layer, because the connection is stateful.</div></div>'
        ) +

        P("queues", false,
          '<p class="panel-sub">Between services, a broker (queue) decouples producers from consumers so a slow or down consumer never blocks the producer.</p>' +
          '<div class="note-grid">' +
            mini("Producer / consumer", "The order service publishes <code>order.created</code>; fulfillment and notification consume it independently.") +
            mini("Acknowledgement", "A consumer ACKs only after success. No ACK → the broker redelivers (at-least-once) → consumers must be idempotent.") +
            mini("Competing consumers", "Many workers read one queue to scale throughput; each message goes to exactly one worker.") +
            mini("Dead-letter queue", "Messages that keep failing move to a DLQ for inspection instead of blocking the queue forever.") +
          "</div>" +
          '<div class="panel" style="margin-top:var(--space-4)"><div class="panel-title">Synchronous API vs asynchronous messaging</div>' +
            '<div class="lab-2col">' +
              box("Synchronous (request-response)", ["Caller waits for the result", "Simple to reason about + trace", "Tight coupling: callee down = caller fails", "Latency = sum of the chain"]) +
              box("Asynchronous (messaging)", ["Fire-and-forget; result comes later", "Loose coupling + resilient to outages", "Eventual consistency; harder to trace", "Great for fan-out + slow/external work"]) +
            "</div></div>"
        );

      AV.ui.wireTabs(container);

      var logEl = container.querySelector("#wh-log");
      var outEl = container.querySelector("#wh-outcome");

      function run() {
        var verify = container.querySelector("#wh-sig").checked;
        var idem = container.querySelector("#wh-idem").checked;
        var dup = container.querySelector("#wh-dup").checked;
        var ooo = container.querySelector("#wh-ooo").checked;
        var forge = container.querySelector("#wh-forge").checked;
        var fail = container.querySelector("#wh-fail").checked;

        // Build the delivery stream
        var stream = [];
        if (forge) stream.push({ id: "evt_f", type: "payment.succeeded", sig: "bad" });
        if (ooo) stream.push({ id: "evt_2", type: "order.shipped", sig: "ok", seq: 2 }); // arrives before payment
        stream.push({ id: "evt_1", type: "payment.succeeded", sig: "ok", seq: 1, fail: fail });
        if (dup) stream.push({ id: "evt_1", type: "payment.succeeded", sig: "ok", seq: 1 });

        var seen = {}, applied = [], log = [], charges = 0, orderState = "PENDING";
        stream.forEach(function (e) {
          if (verify && e.sig === "bad") { log.push(["reject", "Rejected <code>" + e.id + "</code> — <b>bad signature</b>. Forged events never reach your logic."]); return; }
          if (!verify && e.sig === "bad") { log.push(["danger", "Accepted <code>" + e.id + "</code> with a <b>bad signature</b> — signature verification is OFF, so a forgery just mutated your order!"]); }
          if (idem && seen[e.id]) { log.push(["dedupe", "Duplicate <code>" + e.id + "</code> → <b>deduped</b>. Already processed; no double effect."]); return; }
          // out-of-order guard
          if (e.type === "order.shipped" && orderState === "PENDING") {
            log.push(["ooo", "<code>" + e.id + "</code> (order.shipped) arrived <b>before</b> payment. State machine ignores/parks it — can't ship an unpaid order."]);
            seen[e.id] = true; return;
          }
          var attempts = 1;
          if (e.fail) {
            for (var a = 1; a <= 3; a++) log.push(["retry", "Delivery of <code>" + e.id + "</code> failed (attempt " + a + "/3) → provider retries with backoff."]);
            log.push(["dlq", "<code>" + e.id + "</code> exhausted retries → moved to the <b>dead-letter queue</b> for inspection. Order NOT updated."]);
            seen[e.id] = true; return;
          }
          // apply
          seen[e.id] = true; applied.push(e.id);
          if (e.type === "payment.succeeded") { charges++; orderState = "PAID"; }
          if (e.type === "order.shipped") orderState = "SHIPPED";
          log.push(["ok", "Processed <code>" + e.id + "</code> (" + e.type + ") → order is now <b>" + orderState + "</b>. ACK sent."]);
        });

        logEl.innerHTML = log.map(function (l) {
          var map = { ok: ["tip", "✅"], dedupe: ["info", "♻️"], reject: ["tip", "🛡️"], retry: ["warn", "🔁"], dlq: ["warn", "📥"], ooo: ["info", "🔀"], danger: ["danger", "🧨"] };
          var m = map[l[0]] || ["info", "•"];
          return '<div class="callout ' + m[0] + '" style="margin-bottom:var(--space-2)"><span class="callout-icon">' + m[1] + '</span><div class="callout-body">' + l[1] + "</div></div>";
        }).join("");

        var good = charges <= 1 && !(container.querySelector("#wh-forge").checked && !verify);
        outEl.innerHTML = '<div class="callout ' + (good ? "tip" : "danger") + '"><span class="callout-icon">' + (good ? "🎯" : "🧨") + '</span><div class="callout-body"><b>Payment applied ' + charges + " time(s); final order state: " + orderState + ".</b> " +
          (good ? "Despite duplicates/reordering, the effect happened at most once — correct webhook handling." : "Something went wrong — a forgery slipped through or the payment applied more than once. Turn on signature verification and idempotent dedupe.") + "</div></div>";
      }
      container.querySelector("#wh-run").addEventListener("click", run);
      run();
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function mini(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }
  function box(t, items) { return '<div class="panel"><div class="panel-title">' + t + '</div><ul class="tick-list">' + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul></div>"; }

  AV.registerModule(module);
})();
