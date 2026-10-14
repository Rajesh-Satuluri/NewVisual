/* modules/failure-simulator.js — Case Study · Chapter 4
   Incident Response, Recovery & Lessons Learned.

   Top: one featured, LABELLED example incident with staged
   investigation mode (reveal clues one at a time; root cause only on
   request), decision points, code-vs-data recovery, verification,
   prevention, and a post-incident review.
   Below (preserved): the original 10-scenario practice library —
   pick a failure and step through its 9 stages. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Featured incident (labelled EXAMPLE on the reference pipeline) ──
  var INCIDENT = {
    title: "The 7 AM revenue dashboard is wrong — a day after a green deploy",
    symptom: "Finance reports that yesterday's net revenue on the exec dashboard looks ~12% high for one region. " +
      "The deploy was green. The pipeline job succeeded. Monitoring is all green. And yet the number is wrong.",
    // Progressive clues — revealed one at a time during investigation.
    clues: [
      { icon: "🔔", kind: "metric", title: "Detection — reconciliation drift",
        body: "A daily reconciliation compares gold.fct_revenue totals to finance.source_totals. For region EU it is off by +11.8% (tolerance is 1%). Freshness and row-count checks were green, so no page fired — only the weekly reconciliation caught it." },
      { icon: "📜", kind: "log", title: "Pipeline run — succeeded",
        body: "Airflow run for 2026-10-13 shows all tasks success, duration normal. There is no error in the logs. The job did exactly what the code told it to." },
      { icon: "🚀", kind: "deploy", title: "Recent deployment — v43 two days ago",
        body: "revenue-processor:sha-7c2d9 (v43) was promoted to prod two days ago. The change added multi-currency support for EU refunds." },
      { icon: "✅", kind: "dq", title: "Data quality — invariant check was too weak",
        body: "The net_revenue invariant test checks net = gross - refund, but refund_amount itself is now double-counted for EU (converted twice). gross - refund still equals net, so the invariant PASSES on wrong inputs." }
    ],
    rootCause: "v43's currency conversion runs twice on EU refunds (once in ingestion, once in the transform), so refund_amount is inflated, which deflates… no — it inflates the subtraction incorrectly only where refunds exist, netting to an over-stated revenue for EU. The unit test and the invariant both passed because they never compared refund_amount against the source refund total. <b>A green deploy proved the code shipped; it never proved the numbers were right.</b>",
    decisions: [
      { q: "First move: the number is wrong and executives read it at 7 AM. What do you do first?",
        options: [
          { label: "Roll back v43 and move on", ok: false, why: "Rollback stops NEW bad rows, but the rows already written for the last two days stay wrong. Code rollback ≠ data repair." },
          { label: "Flag the dashboard as under investigation + stop further runs, then fix", ok: true, why: "Correct: limit business impact first (mark the number untrusted, pause the schedule so you don't write more bad partitions), preserving evidence — then fix root cause and repair data." },
          { label: "Edit the Gold table by hand to correct EU", ok: false, why: "Manual edits are unauditable and easy to get wrong; they also don't stop the bug recurring on the next run. Fix the code, then reprocess." }
        ] },
      { q: "Is this a code-rollback problem or a data-repair problem?",
        options: [
          { label: "Code rollback only", ok: false, why: "Rolling back fixes future runs but leaves two days of inflated EU revenue in Gold." },
          { label: "Both — and they are separate steps", ok: true, why: "Correct: revert/fix the transform (code), THEN backfill/reprocess the affected EU partitions (data). Already-written rows do not fix themselves when you deploy good code." },
          { label: "Data repair only", ok: false, why: "If you repair data without fixing the code, the next scheduled run re-introduces the bug." }
        ] },
      { q: "You will reprocess the affected partitions. What makes that safe to run?",
        options: [
          { label: "Append the corrected rows", ok: false, why: "Appending double-counts — you'd now have both the wrong and right rows. Appends are not idempotent." },
          { label: "Overwrite each affected partition (replaceWhere)", ok: true, why: "Correct: an idempotent partition overwrite replaces exactly the bad days, so a rerun is safe and totals land right once." },
          { label: "Truncate the whole table and rebuild from scratch", ok: false, why: "Overkill and risky — you'd reprocess years of correct data and widen the blast radius. Repair only the affected partitions." }
        ] }
    ],
    mitigation: [
      "Mark the EU revenue number on the dashboard as <b>under investigation</b> (consumers stop trusting it).",
      "Pause the daily schedule so no further bad partitions are written.",
      "Preserve logs, the run id, and the v43 artifact digest as evidence."
    ],
    recoveryCode: [
      "Fix the double conversion (or roll prod back to v42 <code>sha-9f3c1</code> by digest) — stops NEW bad rows.",
      "Add a test that compares refund_amount to the source refund total, so the bug can't pass CI again."
    ],
    recoveryData: [
      "Reprocess the affected EU partitions with an idempotent <code>overwrite … replaceWhere</code> — repairs the rows already written.",
      "Re-run reconciliation on the repaired partitions before un-pausing the schedule."
    ],
    verification: [
      "Reconciliation for EU is back within 1% tolerance.",
      "net_revenue invariant passes AND the new refund-vs-source test passes.",
      "Row counts unchanged (overwrite replaced, did not duplicate).",
      "Dashboard un-flagged only after all of the above are green."
    ],
    prevention: [
      { change: "Reconciliation against source as a <b>blocking</b> post-run gate (not weekly).", prevents: "The 1-day detection gap that let wrong numbers reach executives." },
      { change: "A test comparing refund_amount to the source refund total.", prevents: "The exact class of bug (an invariant that passes on already-wrong inputs)." },
      { change: "Idempotent partitioned writes everywhere.", prevents: "Unsafe reprocessing/backfills during recovery." },
      { change: "Alert on reconciliation drift, not just freshness/row-count.", prevents: "Green monitoring hiding a correctness failure." }
    ],
    review: {
      impact: "EU net revenue overstated ~11.8% on the exec dashboard for 2 days.",
      timeline: [
        "Day 0 — v43 (multi-currency EU refunds) promoted to prod, all checks green.",
        "Day 0–1 — two daily runs write inflated EU revenue; freshness/row-count green, no alert.",
        "Day 2 — weekly reconciliation flags EU drift > tolerance.",
        "Day 2 — dashboard flagged, schedule paused, root cause found (double conversion).",
        "Day 2 — code fixed + test added; EU partitions reprocessed; reconciliation green; dashboard restored."
      ],
      detectionGap: "Correctness was only checked weekly; freshness/row-count checks are blind to a wrong-but-present number.",
      rootCause: "Currency conversion applied twice to EU refunds; existing tests never compared against the source refund total.",
      contributing: "Invariant test tautologically passed; reconciliation was not a blocking gate; alerts watched liveness, not correctness.",
      resolution: "Fix + regression test; idempotent reprocessing of affected partitions; reconciliation promoted to a blocking gate.",
      actions: [
        { action: "Make source reconciliation a blocking post-run gate", owner: "Revenue Data team" },
        { action: "Add refund-vs-source regression test", owner: "Change author" },
        { action: "Add correctness-drift alerting", owner: "DataOps / on-call" }
      ]
    }
  };

  // ── Preserved practice library (original 10 scenarios) ──────
  var STAGE_NAMES = ["Initial state", "Event", "Detection", "Failure", "Logs",
    "Diagnosis", "Fix", "Redeploy", "Verification"];
  var SCENARIOS = [
    { id: "test", icon: "🧪", title: "Test Failure", tool: "pytest",
      s: ["Revenue pipeline green in main.", "Dev writes gross+refund instead of gross-refund.",
        "CI runs pytest on the PR.", "assert net_revenue(100,20)==80 gets 120 → FAIL.",
        "pytest: AssertionError: assert 120 == 80.", "Sign flipped in the formula.",
        "Change + back to - and commit.", "CI re-runs on the new commit.", "pytest passes → PR unblocked."] },
    { id: "docker", icon: "🐳", title: "Docker Build Failure", tool: "Docker",
      s: ["Works on the developer laptop.", "Push triggers docker build in CI.",
        "CI build step exits non-zero.", "pip install fails: pandas 2.1 vs pinned 1.5.",
        "ERROR: ResolutionImpossible in build log.", "Laptop had a stale cached wheel; CI is clean.",
        "Pin exact versions in requirements.txt.", "docker build re-runs in CI.", "Image builds; digest recorded."] },
    { id: "terraform", icon: "🏗️", title: "Terraform Drift", tool: "Terraform",
      s: ["State says cluster = 4 workers.", "Someone resized it to 8 in the portal.",
        "terraform plan runs in CI.", "Plan shows 1 to change (drift).", "~ node_count: 8 -> 4 in plan output.",
        "Manual portal change diverged from code.", "Update HCL to the intended size + review.",
        "terraform apply after approval.", "plan is clean; no drift."] },
    { id: "secret", icon: "🔐", title: "Secret Leak", tool: "Secrets",
      s: ["Payments key lives in Key Vault.", "Dev pastes the key into a committed .env.",
        "Secret scanning flags the push.", "Push blocked / alert raised.", "Scanner: high-entropy string in .env:3.",
        "Real credential exposed in history.", "Rotate the key; remove file; add to .gitignore.",
        "Re-push clean; use OIDC injection.", "Scan clean; key rotated + short-lived."] },
    { id: "dbt", icon: "🔶", title: "dbt Test Failure", tool: "dbt",
      s: ["fct_orders unique on order_id.", "A join fans out and duplicates orders.",
        "dbt build runs in CI.", "unique test on order_id FAILS.", "dbt: Got 1,204 duplicate order_id.",
        "Join missing a grain key.", "Add the missing key to the join.", "dbt build re-runs.",
        "unique test passes; models built."] },
    { id: "databricks", icon: "🧱", title: "Databricks Deploy Failure", tool: "Databricks",
      s: ["Bundle works in target dev.", "bundle deploy --target prod runs.",
        "Deploy step errors.", "Missing prod cluster policy / permission.", "Error: cluster policy not found in prod.",
        "Prod target var not set in databricks.yml.", "Add prod target vars + permissions.",
        "Re-run bundle deploy --target prod.", "Job deployed; runs successfully."] },
    { id: "airflow", icon: "🌀", title: "Airflow DAG Failure", tool: "Airflow",
      s: ["Revenue DAG parses cleanly.", "Refactor adds a top-level API call.",
        "DAG import test runs in CI.", "Import test times out / errors.", "DagBag import error: connection at parse time.",
        "Live call in DAG top level.", "Move the call into a task.", "Re-run import test + deploy.",
        "DAG imports fast; scheduler healthy."] },
    { id: "k8s", icon: "☸️", title: "Kubernetes CrashLoop", tool: "Kubernetes",
      s: ["Processor Deployment, 2 replicas.", "New image raises memory use.",
        "Readiness probe never passes.", "Pod state CrashLoopBackOff.", "OOMKilled in kubectl describe pod.",
        "Memory limit too low for the join.", "Raise resources.limits.memory.", "kubectl rollout restart.",
        "Pods Ready; rollout complete."] },
    { id: "dq", icon: "✅", title: "Data Quality Failure", tool: "Data Quality",
      s: ["Deploy succeeds; pipeline runs.", "Upstream orders feed lands late.",
        "Post-run freshness check runs.", "Freshness check FAILS.", "DQ: max(order_ts) is 26h old.",
        "Source SLA missed upstream.", "Gate dashboard; alert + rerun after feed.", "Backfill the late partition.",
        "Freshness passes; dashboard released."] },
    { id: "rollback", icon: "⏪", title: "Production Rollback", tool: "Rollback",
      s: ["v42 revenue image in prod.", "v43 ships a bad transform.",
        "Monitoring flags a revenue drop.", "Bad rows written to Gold.", "Alert: revenue -38% vs 7-day avg.",
        "v43 logic error confirmed.", "Redeploy v42 by digest.", "Backfill/repair the corrupted partition.",
        "Numbers correct; data repaired."] }
  ];

  function renderFeaturedIncident(container) {
    var E = NS.Evidence;
    var sec = document.createElement("section");
    sec.className = "section inc";
    var revealed = 1;      // clues shown so far
    var rootShown = false;

    sec.innerHTML =
      '<h2 class="section-title">Featured incident — investigate it yourself</h2>' +
      (E && E.ready() ? E.badge("reference") +
        ' <span class="inc-label">A labelled example incident on the reference pipeline — not a historical Airbnb outage.</span>' : "") +
      '<div class="inc-symptom"><div class="inc-symptom-h">🚨 ' + esc(INCIDENT.title) + "</div>" +
        "<p>" + esc(INCIDENT.symptom) + "</p></div>" +
      '<div class="inc-invest"><div class="inc-invest-head"><h3>Investigation</h3>' +
        '<span class="inc-invest-sub">Reveal evidence one step at a time. The root cause stays hidden until you ask for it.</span></div>' +
        '<div class="inc-clues"></div>' +
        '<div class="inc-controls">' +
          '<button type="button" class="btn btn-secondary btn-sm" id="inc-next">Reveal next clue</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="inc-root" disabled>Reveal root cause</button>' +
        "</div>" +
        '<div class="inc-rootcause" hidden></div>' +
      "</div>" +
      '<div class="inc-decisions"><h3>Decision points</h3></div>' +
      '<div class="inc-recovery"><h3>Mitigation &amp; recovery</h3>' +
        '<div class="inc-mit"></div>' +
        '<div class="inc-rec-cols">' +
          '<div class="inc-rec-col"><div class="inc-rec-h code">⏪ Code recovery</div><ul id="inc-rec-code"></ul></div>' +
          '<div class="inc-rec-col"><div class="inc-rec-h data">🗄️ Data recovery</div><ul id="inc-rec-data"></ul></div>' +
        "</div>" +
        '<div class="inc-note">Reverting code stops new bad rows; it does <b>not</b> repair rows already written. Those are two separate jobs.</div>' +
      "</div>" +
      '<div class="inc-verify"><h3>Verification — prove recovery worked</h3><ul id="inc-verify-list"></ul></div>' +
      '<div class="inc-prevent"><h3>Prevention — and what each change catches</h3><div class="inc-prevent-grid"></div></div>' +
      '<div class="inc-review"><h3>Post-incident review <span class="inc-review-tag">example</span></h3><div class="inc-review-body"></div></div>';
    container.appendChild(sec);

    var cluesEl = sec.querySelector(".inc-clues");
    var nextBtn = sec.querySelector("#inc-next");
    var rootBtn = sec.querySelector("#inc-root");
    var rootEl = sec.querySelector(".inc-rootcause");

    function paintClues() {
      cluesEl.innerHTML = INCIDENT.clues.slice(0, revealed).map(function (c) {
        return '<div class="inc-clue inc-clue-' + c.kind + '"><span class="inc-clue-ic">' + c.icon + "</span>" +
          '<div><div class="inc-clue-t">' + esc(c.title) + "</div><p>" + esc(c.body) + "</p></div></div>";
      }).join("");
      if (revealed >= INCIDENT.clues.length) {
        nextBtn.disabled = true; nextBtn.textContent = "All clues revealed";
        rootBtn.disabled = false;
      }
    }
    nextBtn.addEventListener("click", function () {
      if (revealed < INCIDENT.clues.length) { revealed++; paintClues(); }
    });
    rootBtn.addEventListener("click", function () {
      if (rootShown) return;
      rootShown = true; rootEl.hidden = false;
      rootEl.innerHTML = '<div class="inc-root-h">🧩 Root cause</div><p>' + INCIDENT.rootCause + "</p>";
      rootBtn.disabled = true;
    });
    paintClues();

    // Decision points — each option reveals its consequence.
    var dec = sec.querySelector(".inc-decisions");
    INCIDENT.decisions.forEach(function (d, di) {
      var box = document.createElement("div");
      box.className = "inc-decision";
      box.innerHTML = '<div class="inc-q">' + esc(d.q) + "</div>" +
        '<div class="inc-opts">' + d.options.map(function (o, oi) {
          return '<button type="button" class="inc-opt" data-d="' + di + '" data-o="' + oi + '">' + esc(o.label) + "</button>";
        }).join("") + "</div>" +
        '<div class="inc-consequence" hidden></div>';
      dec.appendChild(box);
      box.addEventListener("click", function (e) {
        var b = e.target.closest(".inc-opt");
        if (!b) return;
        var o = d.options[+b.getAttribute("data-o")];
        box.querySelectorAll(".inc-opt").forEach(function (x) { x.classList.remove("ok", "no", "sel"); });
        b.classList.add(o.ok ? "ok" : "no", "sel");
        var cons = box.querySelector(".inc-consequence");
        cons.hidden = false;
        cons.className = "inc-consequence " + (o.ok ? "good" : "bad");
        cons.innerHTML = (o.ok ? "✅ " : "⚠️ ") + esc(o.why);
      });
    });

    function fillList(sel, arr) {
      var ul = sec.querySelector(sel);
      ul.innerHTML = arr.map(function (x) { return "<li>" + x + "</li>"; }).join("");
    }
    sec.querySelector(".inc-mit").innerHTML = "<div class=\"inc-sub\">Immediate mitigation</div><ul>" +
      INCIDENT.mitigation.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    fillList("#inc-rec-code", INCIDENT.recoveryCode);
    fillList("#inc-rec-data", INCIDENT.recoveryData);
    fillList("#inc-verify-list", INCIDENT.verification);

    sec.querySelector(".inc-prevent-grid").innerHTML = INCIDENT.prevention.map(function (p) {
      return '<div class="inc-prevent-item"><div class="inc-prevent-change">' + p.change + "</div>" +
        '<div class="inc-prevent-prevents"><span>catches</span> ' + esc(p.prevents) + "</div></div>";
    }).join("");

    var r = INCIDENT.review;
    sec.querySelector(".inc-review-body").innerHTML =
      '<div class="inc-rev-row"><span>Impact</span><div>' + esc(r.impact) + "</div></div>" +
      '<div class="inc-rev-row"><span>Timeline</span><div><ol class="inc-timeline">' +
        r.timeline.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div></div>" +
      '<div class="inc-rev-row"><span>Detection gap</span><div>' + esc(r.detectionGap) + "</div></div>" +
      '<div class="inc-rev-row"><span>Root cause</span><div>' + esc(r.rootCause) + "</div></div>" +
      '<div class="inc-rev-row"><span>Contributing</span><div>' + esc(r.contributing) + "</div></div>" +
      '<div class="inc-rev-row"><span>Resolution</span><div>' + esc(r.resolution) + "</div></div>" +
      '<div class="inc-rev-row"><span>Corrective actions</span><div><ul class="inc-actions">' +
        r.actions.map(function (a) { return "<li><b>" + esc(a.action) + "</b> — " + esc(a.owner) + "</li>"; }).join("") +
      "</ul></div></div>";
  }

  function renderPracticeLibrary(container) {
    var current = SCENARIOS[0];
    var active = 0;

    var wrap = document.createElement("section");
    wrap.className = "section";
    wrap.innerHTML = '<h2 class="section-title">Practice library — 10 failures, 9 stages each</h2>' +
      '<p class="cs-lead">Pick a realistic failure and step through it: how it is detected, what the logs say, ' +
      "how an engineer diagnoses it, the fix, and how the pipeline verifies recovery.</p>";
    container.appendChild(wrap);

    var picker = document.createElement("div");
    picker.className = "fs-picker";
    picker.innerHTML = SCENARIOS.map(function (sc, i) {
      return '<button type="button" class="fs-pick' + (i === 0 ? " active" : "") +
        '" data-i="' + i + '"><span>' + sc.icon + "</span>" + esc(sc.title) + "</button>";
    }).join("");
    wrap.appendChild(picker);

    var stageRow = document.createElement("div");
    stageRow.className = "fs-stages";
    var detail = document.createElement("div");
    detail.className = "fs-detail";
    wrap.appendChild(stageRow);
    wrap.appendChild(detail);

    function paint() {
      stageRow.innerHTML = STAGE_NAMES.map(function (name, i) {
        var cls = "fs-stage" + (i === active ? " active" : "") + (i < active ? " done" : "");
        return '<button type="button" class="' + cls + '" data-s="' + i + '">' +
          '<span class="fs-stage-n">' + (i + 1) + "</span>" +
          '<span class="fs-stage-name">' + esc(name) + "</span></button>";
      }).join("");
      var isFix = active >= 6;
      detail.className = "fs-detail" + (active === 3 || active === 4 ? " fs-bad" : (isFix ? " fs-good" : ""));
      detail.innerHTML =
        '<div class="fs-detail-head">' + current.icon + " <b>" + esc(current.title) +
          '</b> <span class="fs-detail-tool">' + esc(current.tool) + "</span></div>" +
        '<div class="fs-detail-stage">' + (active + 1) + ". " + esc(STAGE_NAMES[active]) + "</div>" +
        '<div class="fs-detail-text">' + esc(current.s[active]) + "</div>";
    }
    picker.addEventListener("click", function (e) {
      var b = e.target.closest(".fs-pick");
      if (!b) return;
      picker.querySelectorAll(".fs-pick").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      current = SCENARIOS[+b.getAttribute("data-i")];
      active = 0; paint();
    });
    stageRow.addEventListener("click", function (e) {
      var b = e.target.closest(".fs-stage");
      if (b) { active = +b.getAttribute("data-s"); paint(); }
    });
    paint();
  }

  NS.registerModule({
    id: "failure-simulator",
    title: "Failure Simulator",
    render: function (container) {
      var E = NS.Evidence;
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">📘 Case Study · Chapter 4 of 4</div>' +
          '<h1 class="module-title gradient-text">Incident Response, Recovery &amp; Lessons</h1>' +
          '<p class="module-subtitle">What happens when something goes wrong — and how engineers restore both the ' +
          "system and the <b>data</b>. Investigate a failure, make the calls, then see how recovery is proven and prevented.</p>" +
        "</div>";
      if (E && E.ready()) {
        var cn = document.createElement("div");
        cn.innerHTML = E.chapterNav("failure-simulator") +
          '<section class="section">' + E.claimGroup("incident") +
          '<p class="cs-ref-link">Full sources are listed in <a href="#business-scenario">Chapter 1 · References</a>.</p></section>';
        container.appendChild(cn);
      }
      renderFeaturedIncident(container);

      var div = document.createElement("div");
      div.className = "cs-sandbox-note";
      div.innerHTML = "🧪 <div><b>Practice library below.</b> Ten shorter failure walkthroughs to rehearse detection → " +
        "diagnosis → fix → verification across the whole stack.</div>";
      container.appendChild(div);
      renderPracticeLibrary(container);
    },
    destroy: function () {}
  });
})();
