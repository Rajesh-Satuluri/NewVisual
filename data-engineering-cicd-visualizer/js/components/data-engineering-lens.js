/* ============================================================
   data-engineering-lens.js — the recurring RetailFlow example
   Appended below every concept module by the router, so the same
   RetailFlow "Daily Revenue Pipeline" illustrates each CI/CD
   concept in one continuous business story (prompt §27).
   DECICDViz.BusinessLens.append(container, moduleId)

   NOTE: keys are seeded for the modules built so far; entries for
   the remaining modules are added as those modules land in later
   build iterations. Unknown ids append nothing (safe no-op).
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // Each entry ties one CI/CD concept to a concrete step in getting
  // RetailFlow's revenue change safely from a laptop to production.
  // Keys are module route ids.
  var DATA = {
    git: {
      artifact: "feature/fix-net-revenue", system: "Local + GitHub repo",
      meaning: "Isolate a risky change from production code.",
      point: "RetailFlow's nightly revenue pipeline already runs every night. To change the net-revenue formula, an engineer cuts a <code>feature/fix-net-revenue</code> branch instead of editing production directly — a safe parallel workspace where the change can be tested before it ever reaches <code>main</code>."
    },
    github: {
      artifact: "Pull Request #482", system: "GitHub",
      meaning: "Let a second engineer review before merge.",
      point: "The revenue fix opens as a Pull Request so a teammate reviews the diff, required CI checks run, and branch protection blocks a merge until both pass — no single person can push a revenue change straight into RetailFlow production."
    },
    "github-actions": {
      artifact: ".github/workflows/ci.yml", system: "GitHub Actions runner",
      meaning: "Validate the change automatically on every push.",
      point: "The moment the branch is pushed, RetailFlow's CI workflow runs lint → pytest → dbt tests → docker build on a fresh runner. The revenue change is proven safe by machines on every commit, not by someone remembering to test locally."
    },
    terraform: {
      artifact: "azurerm_databricks_workspace", system: "Azure / Databricks",
      meaning: "Change infrastructure through reviewed code.",
      point: "When the fix needs a bigger Databricks cluster, RetailFlow doesn't click in the portal — a Terraform change runs <code>plan</code> in the PR so engineers see exactly which resources change and approve before <code>apply</code> touches production infrastructure."
    },
    docker: {
      artifact: "retailflow/processor:sha-9f2c", system: "Container Registry",
      meaning: "Package the code so it runs identically everywhere.",
      point: "RetailFlow packages its PySpark processing job into an immutable image tagged by commit SHA. The exact image that passed CI is the one promoted to production — 'works on my laptop' can't happen because every environment runs the same packaged software."
    }
  };

  function row(k, v, mono) {
    return '<div class="lens-row"><span class="lens-k">' + k + "</span>" +
      (mono ? '<code class="lens-v-mono">' + v + "</code>" : '<span class="lens-v">' + v + "</span>") +
      "</div>";
  }

  function create(id) {
    var d = DATA[id];
    if (!d) return null;
    var sec = document.createElement("section");
    sec.className = "section lens-section animate-fade-in";
    sec.innerHTML =
      '<div class="lens-card">' +
        '<div class="lens-head">' +
          '<span class="lens-badge">🏬 How this appears at RetailFlow</span>' +
          '<span class="lens-head-title">One change to the revenue pipeline, seen through this concept</span>' +
        "</div>" +
        '<div class="lens-grid">' +
          '<div class="lens-meta">' +
            row("Artifact", d.artifact, true) +
            row("Business meaning", d.meaning, false) +
            row("System", d.system, false) +
          "</div>" +
          '<div class="lens-point">' +
            "<p>" + d.point + "</p>" +
            '<a class="lens-link" href="#business-scenario">See the full laptop → 7 AM dashboard journey →</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    return sec;
  }

  function append(container, id) {
    if (!container) return;
    var el = create(id);
    if (el) container.appendChild(el);
  }

  var api = { create: create, append: append, has: function (id) { return !!DATA[id]; } };
  // Router calls NS.BusinessLens.append(...); keep that hook name, and
  // expose a semantic alias too.
  NS.BusinessLens = api;
  NS.DataEngLens = api;
})();
