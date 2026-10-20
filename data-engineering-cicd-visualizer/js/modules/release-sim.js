/* modules/release-sim.js — Release & Rollback Simulator (Iteration 8)
   An interactive visualizer: the learner picks a release scenario,
   watches the pipeline state change stage by stage, then chooses a
   recovery strategy and sees its consequence and trade-offs. Ties the
   business / system / engineering views together. Nothing executes —
   states are scripted and labelled. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Pipeline stages every scenario paints.
  var STAGES = ["Build", "Deploy", "Verify", "Data quality", "Serve 7 AM"];

  // state per stage: success | running | failed | blocked | warn
  var SCENARIOS = [
    { id: "healthy", name: "Healthy deployment", icon: "✅",
      states: ["success", "success", "success", "success", "success"],
      business: "The corrected revenue number reaches the dashboard on time and is correct.",
      system: "Build → deploy the one artifact → smoke test → data-quality gate → serve.",
      engineering: "Every gate is green; the same artifact that was tested is what runs.",
      decision: null },
    { id: "failed-deploy", name: "Failed deployment", icon: "💥",
      states: ["success", "failed", "blocked", "blocked", "blocked"],
      business: "The deploy itself fails; the dashboard keeps showing yesterday's (known-good) number.",
      system: "Deploy errors out before verify; promotion halts.",
      engineering: "The deploy step returns non-zero; nothing is promoted. The old version still serves.",
      decision: {
        q: "The deploy failed outright. What's the right recovery?",
        options: [
          { label: "Roll back to the last-good artifact and investigate", ok: true, consequence: "Correct: the previous version is still valid and serving; re-point/confirm it, then fix forward. Fast and low-risk." },
          { label: "Force the broken artifact into prod anyway", ok: false, consequence: "Wrong: shipping a known-broken deploy risks an outage or wrong data. Never force past a failed deploy." },
          { label: "Backfill historical data", ok: false, consequence: "Wrong target: no bad data was written yet — this is a deploy failure, not a data-corruption incident." }
        ] } },
    { id: "infra-ok-data-bad", name: "Infra green, data corrupted", icon: "🩸",
      states: ["success", "success", "success", "failed", "blocked"],
      business: "Everything 'deployed fine', but the published number would be wrong — caught by the data-quality gate.",
      system: "Smoke tests pass (the app is healthy); the data-quality gate fails on a reconciliation mismatch.",
      engineering: "Software correctness ≠ data correctness. The gate blocks publish before 7 AM.",
      decision: {
        q: "Infra is healthy but the data-quality gate failed. Best recovery?",
        options: [
          { label: "Fix the data: reprocess/backfill, then reconcile before publishing", ok: true, consequence: "Correct: the code may be fine — the data is wrong. Repair the data and verify reconciliation; don't just redeploy code." },
          { label: "Roll back the code and declare victory", ok: false, consequence: "Incomplete: code rollback alone doesn't repair data already computed; the number stays wrong until you recover the data." },
          { label: "Disable the data-quality gate to unblock", ok: false, consequence: "Dangerous: muting the gate ships a known-wrong number to executives. Never disable the gate to go green." }
        ] } },
    { id: "schema-break", name: "Schema change breaks consumers", icon: "🧩",
      states: ["success", "success", "warn", "warn", "failed"],
      business: "The pipeline ran, but downstream dashboards and models that read the old columns break.",
      system: "A migration changed the schema; consumers expecting the old shape fail.",
      engineering: "You often can't simply roll back a migration — the data already changed shape.",
      decision: {
        q: "A schema migration broke downstream consumers. Rollback or forward fix?",
        options: [
          { label: "Forward fix — ship a corrected version compatible with consumers", ok: true, consequence: "Correct: once a migration has altered the schema, rolling the code back can break worse. Add a compatibility shim / fix forward." },
          { label: "Roll the code back to before the migration", ok: false, consequence: "Risky: the schema already changed; the old code may be incompatible with the new shape, compounding the break." },
          { label: "Ignore it — consumers will adapt", ok: false, consequence: "Wrong: broken downstreams mean wrong or missing dashboards now; this needs a deliberate fix." }
        ] } },
    { id: "rollback-code-not-data", name: "Rollback restores code, not data", icon: "↩️",
      states: ["success", "success", "success", "warn", "warn"],
      business: "You rolled back the bad release, yet the dashboard is still wrong — because the bad rows are already written.",
      system: "Code is back to the last-good version, but the warehouse still holds the corrupted partitions.",
      engineering: "Code/config rollback ≠ data recovery. The written data needs its own repair.",
      decision: {
        q: "You rolled back the code but the number is still wrong. Now what?",
        options: [
          { label: "Backfill/restore the affected partitions, then reconcile", ok: true, consequence: "Correct: the data the bad version wrote must be repaired separately; backfill and verify before trusting the number." },
          { label: "Roll back the code again", ok: false, consequence: "No effect: the code is already correct; repeating the rollback doesn't touch the bad data." },
          { label: "Wait for tomorrow's run to overwrite it", ok: false, consequence: "Unreliable: incremental tables may not overwrite history, and executives read the wrong number today." }
        ] } },
    { id: "forward-fix-backfill", name: "Forward fix + controlled backfill", icon: "🛠️",
      states: ["success", "success", "success", "success", "success"],
      business: "The corrected logic ships and history is recomputed, so every number — past and present — is right.",
      system: "Deploy the fix, then run a controlled backfill over affected dates, gated by reconciliation.",
      engineering: "The model recovery: fix forward for code, backfill for data, verify with reconciliation.",
      decision: {
        q: "You're combining a forward fix with a backfill. What makes it safe?",
        options: [
          { label: "Reconcile against an independent source before republishing", ok: true, consequence: "Correct: verification (reconciliation to the ledger) is what proves the recovery worked before anyone trusts it." },
          { label: "Backfill everything with no verification", ok: false, consequence: "Risky: an unverified backfill can replace one wrong number with another; always verify." },
          { label: "Only fix today, ignore history", ok: false, consequence: "Incomplete: historical reports stay wrong; backfill the affected range." }
        ] } }
  ];

  var STATE_LABEL = { success: "ok", running: "running", failed: "failed", blocked: "blocked", warn: "degraded" };

  NS.registerModule({
    id: "release-sim",
    title: "Release & Rollback Simulator",
    render: function (container) {
      var current = SCENARIOS[0];

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🧪 Interactive Visualizer</div>' +
          '<h1 class="module-title gradient-text">Release &amp; Rollback Simulator</h1>' +
          '<p class="module-subtitle">Pick a release scenario, watch the pipeline state change, then choose a recovery and see the consequences. ' +
            "Everything here is <b>scripted simulation</b> — nothing is executed — so you can safely explore how deploys fail and how to recover.</p>" +
        "</div>" +
        '<div class="rs-pick"></div>' +
        '<section class="section"><div class="rs-stage"></div></section>' +
        '<section class="section rs-views"></section>' +
        '<section class="section rs-decision"></section>';

      var pick = container.querySelector(".rs-pick");
      var stage = container.querySelector(".rs-stage");
      var views = container.querySelector(".rs-views");
      var decision = container.querySelector(".rs-decision");

      pick.innerHTML = SCENARIOS.map(function (s, i) {
        return '<button type="button" class="rs-pick-btn' + (i === 0 ? " active" : "") + '" data-id="' + s.id + '">' +
          '<span class="rs-pick-icon">' + s.icon + "</span>" + esc(s.name) + "</button>";
      }).join("");

      function paint() {
        stage.innerHTML = STAGES.map(function (label, i) {
          var st = current.states[i];
          var arrow = i ? '<span class="rs-arrow">→</span>' : "";
          return arrow + '<div class="rs-node rs-' + st + '">' +
            '<span class="rs-node-label">' + esc(label) + "</span>" +
            '<span class="rs-node-state">' + (STATE_LABEL[st] || st) + "</span></div>";
        }).join("");

        views.innerHTML =
          '<h2 class="section-title">What just happened</h2>' +
          '<div class="rs-views-grid">' +
            '<div class="rs-view"><div class="rs-view-h">💼 Business</div><p>' + esc(current.business) + "</p></div>" +
            '<div class="rs-view"><div class="rs-view-h">🧩 System</div><p>' + esc(current.system) + "</p></div>" +
            '<div class="rs-view"><div class="rs-view-h">⚙️ Engineering</div><p>' + esc(current.engineering) + "</p></div>" +
          "</div>";

        if (!current.decision) {
          decision.innerHTML = '<div class="callout tip"><span class="callout-icon">🎉</span><div class="callout-body">' +
            "<b>No recovery needed.</b> This is the happy path — every gate is green and the same tested artifact serves the dashboard.</div></div>";
          return;
        }
        var d = current.decision;
        decision.innerHTML = '<h2 class="section-title">Choose your recovery</h2>' +
          '<div class="rs-q">' + esc(d.q) + "</div>" +
          '<div class="rs-opts">' + d.options.map(function (o, oi) {
            return '<button type="button" class="rs-opt" data-o="' + oi + '">' + esc(o.label) + "</button>";
          }).join("") + '</div><div class="rs-consequence" hidden></div>';
        var optsWrap = decision.querySelector(".rs-opts");
        optsWrap.addEventListener("click", function (e) {
          var b = e.target.closest(".rs-opt"); if (!b) return;
          var o = d.options[+b.getAttribute("data-o")];
          optsWrap.querySelectorAll(".rs-opt").forEach(function (x) { x.classList.remove("ok", "no", "sel"); });
          b.classList.add(o.ok ? "ok" : "no", "sel");
          var c = decision.querySelector(".rs-consequence");
          c.hidden = false; c.className = "rs-consequence " + (o.ok ? "good" : "bad");
          c.innerHTML = (o.ok ? "✅ " : "❌ ") + esc(o.consequence);
        });
      }

      pick.addEventListener("click", function (e) {
        var b = e.target.closest(".rs-pick-btn"); if (!b) return;
        current = SCENARIOS.filter(function (s) { return s.id === b.getAttribute("data-id"); })[0] || SCENARIOS[0];
        pick.querySelectorAll(".rs-pick-btn").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        paint();
      });

      paint();
      if (NS.Evidence && NS.Evidence.ready && NS.Evidence.ready()) {
        var pn = document.createElement("div");
        pn.innerHTML = '<div class="callout tip"><span class="callout-icon">↪</span><div class="callout-body">' +
          'Deepen this in <a href="#rollback">Rollback</a>, <a href="#deployment-strategies">Deployment Strategies</a>, and the ' +
          '<a href="#failure-simulator">Failure Simulator</a>.</div></div>';
        container.appendChild(pn);
      }
    },
    destroy: function () {}
  });
})();
