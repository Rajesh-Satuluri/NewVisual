/* modules/failure-simulator.js — pick a realistic failure and walk it
   through Initial → Event → Detection → Failure → Logs → Diagnosis →
   Fix → Redeploy → Verification. Every stage is clickable. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var STAGE_NAMES = ["Initial state", "Event", "Detection", "Failure", "Logs",
    "Diagnosis", "Fix", "Redeploy", "Verification"];

  // Each scenario supplies the 9 stage texts (RetailFlow-specific).
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

  var module = {
    id: "failure-simulator",
    title: "Failure Simulator",
    render: function (container) {
      var current = SCENARIOS[0];
      var active = 0;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🧯 Real-World Scenario · RetailFlow</div>' +
          '<h1 class="module-title gradient-text">Failure Simulator</h1>' +
          '<p class="module-subtitle">Pick a realistic failure and walk it end to end — how it is detected, ' +
          "what the logs say, how an engineer diagnoses it, the fix, and how the pipeline verifies recovery.</p>" +
        "</div>";

      var picker = document.createElement("div");
      picker.className = "fs-picker";
      picker.innerHTML = SCENARIOS.map(function (sc, i) {
        return '<button type="button" class="fs-pick' + (i === 0 ? " active" : "") +
          '" data-i="' + i + '"><span>' + sc.icon + "</span>" + sc.title + "</button>";
      }).join("");
      container.appendChild(picker);

      var stageRow = document.createElement("div");
      stageRow.className = "fs-stages";
      var detail = document.createElement("div");
      detail.className = "fs-detail";
      container.appendChild(stageRow);
      container.appendChild(detail);

      function paint() {
        stageRow.innerHTML = STAGE_NAMES.map(function (name, i) {
          var cls = "fs-stage" + (i === active ? " active" : "") + (i < active ? " done" : "");
          return '<button type="button" class="' + cls + '" data-s="' + i + '">' +
            '<span class="fs-stage-n">' + (i + 1) + "</span>" +
            '<span class="fs-stage-name">' + name + "</span></button>";
        }).join("");
        var isFix = active >= 6;
        detail.className = "fs-detail" + (active === 3 || active === 4 ? " fs-bad" : (isFix ? " fs-good" : ""));
        detail.innerHTML =
          '<div class="fs-detail-head">' + current.icon + " <b>" + current.title +
            '</b> <span class="fs-detail-tool">' + current.tool + "</span></div>" +
          '<div class="fs-detail-stage">' + (active + 1) + ". " + STAGE_NAMES[active] + "</div>" +
          '<div class="fs-detail-text">' + current.s[active] + "</div>";
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
    },
    destroy: function () {}
  };

  NS.registerModule(module);
})();
