/* modules/master-map.js — the culmination. Two parts:
   1) "Tell the Story" — a progressive Q→A walk from laptop to prod.
   2) A static visual map grouping every tool by its role. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  var STORY = [
    { q: "RetailFlow needs yesterday's revenue on the dashboard at 7 AM. How does the code get created?", a: "Git", id: "git", note: "Version history + a safe branch for the change." },
    { q: "How does the team collaborate on that change?", a: "GitHub", id: "github", note: "A pull request, reviewed before it hits main." },
    { q: "How is it automatically validated?", a: "GitHub Actions + tests", id: "github-actions", note: "Lint, pytest, dbt tests on every push." },
    { q: "How is infrastructure managed?", a: "Terraform", id: "terraform", note: "Cloud + Databricks as reviewed code." },
    { q: "How is the software packaged?", a: "Docker", id: "docker", note: "One immutable image, promoted by digest." },
    { q: "How does the Databricks code get promoted?", a: "Databricks Asset Bundles", id: "databricks-bundles", note: "dev → test → prod targets." },
    { q: "How are SQL transformations tested?", a: "dbt", id: "dbt-cicd", note: "Models + unique/not-null/relationship tests." },
    { q: "How are workflows orchestrated?", a: "Airflow", id: "airflow-cicd", note: "The nightly production run, in order." },
    { q: "How are containers managed at scale?", a: "Kubernetes", id: "kubernetes", note: "Runs the containerized workloads." },
    { q: "How are those Kubernetes apps packaged?", a: "Helm", id: "helm", note: "Templated, per-environment deployments." },
    { q: "How is desired production state kept in sync?", a: "GitOps / Argo CD", id: "argo-cd", note: "Git is the source of truth; drift is reconciled." },
    { q: "How do we know the resulting DATA is correct?", a: "Data Quality", id: "data-quality", note: "Freshness, uniqueness, completeness after deploy." },
    { q: "How do we know production stays healthy?", a: "Observability", id: "observability", note: "Logs, metrics, SLAs, alerts." }
  ];

  var MAP = [
    { group: "Source", items: ["Git", "GitHub"] },
    { group: "CI / Validation", items: ["GitHub Actions", "pytest", "dbt", "SQL tests", "SonarQube"] },
    { group: "Quality Gate", items: ["Required checks", "Review", "Scans"] },
    { group: "Build / Package", items: ["Docker", "Container Registry", "Artifacts"] },
    { group: "Infrastructure", items: ["Terraform", "Secrets / OIDC"] },
    { group: "Deploy Targets", items: ["Databricks Bundles", "Airflow", "Kubernetes + Helm", "Argo CD"] },
    { group: "Production", items: ["Warehouse / Lakehouse", "Data Quality", "Observability"] }
  ];

  var module = {
    id: "master-map",
    title: "Master Map",
    render: function (container) {
      var step = 0; // how many story beats revealed

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🧠 Learning · The Whole Picture</div>' +
          '<h1 class="module-title gradient-text">Master Map</h1>' +
          '<p class="module-subtitle">Everything, connected. First tell the story from a laptop to production, ' +
          "then see how every tool fits its role in one map.</p>" +
        "</div>";

      // ── Tell the Story ─────────────────────────────────
      var storyWrap = document.createElement("section");
      storyWrap.className = "section mm-story-wrap";
      storyWrap.innerHTML =
        '<h2 class="section-title">Tell the Story</h2>' +
        '<p class="section-lead">“RetailFlow needs yesterday\'s revenue dashboard tomorrow at 7 AM.” Reveal each step.</p>';
      var beats = document.createElement("div");
      beats.className = "mm-beats";
      var controls = document.createElement("div");
      controls.className = "mm-story-controls";
      controls.innerHTML =
        '<button type="button" class="btn btn-primary mm-next">Reveal next step →</button>' +
        '<button type="button" class="btn btn-secondary mm-reset">Restart</button>' +
        '<span class="mm-progress"></span>';
      storyWrap.appendChild(beats);
      storyWrap.appendChild(controls);
      container.appendChild(storyWrap);

      var done = document.createElement("div");
      done.className = "mm-story-done";
      done.hidden = true;
      done.innerHTML = "🎉 <b>You just traced a Data Engineering change from a developer's laptop to production.</b>";
      storyWrap.appendChild(done);

      function paintStory() {
        beats.innerHTML = STORY.slice(0, step).map(function (b, i) {
          return '<div class="mm-beat"><div class="mm-beat-q">' + (i + 1) + ". " + b.q + "</div>" +
            '<a class="mm-beat-a" href="#' + b.id + '">↳ ' + b.a + "</a>" +
            '<div class="mm-beat-note">' + b.note + "</div></div>";
        }).join("");
        controls.querySelector(".mm-progress").textContent = step + " / " + STORY.length;
        var atEnd = step >= STORY.length;
        controls.querySelector(".mm-next").disabled = atEnd;
        done.hidden = !atEnd;
      }
      controls.querySelector(".mm-next").addEventListener("click", function () {
        if (step < STORY.length) { step++; paintStory(); }
      });
      controls.querySelector(".mm-reset").addEventListener("click", function () { step = 0; paintStory(); });
      paintStory();

      // ── Visual map ─────────────────────────────────────
      var mapWrap = document.createElement("section");
      mapWrap.className = "section";
      mapWrap.innerHTML =
        '<h2 class="section-title">The map</h2>' +
        '<div class="mm-map">' + MAP.map(function (g, i) {
          return (i ? '<div class="mm-map-arrow">↓</div>' : "") +
            '<div class="mm-map-group"><div class="mm-map-group-title">' + g.group + "</div>" +
            '<div class="mm-map-items">' + g.items.map(function (it) {
              return '<span class="mm-map-item">' + it + "</span>";
            }).join("") + "</div></div>";
        }).join("") + "</div>";
      container.appendChild(mapWrap);

      container.appendChild((function () {
        var a = document.createElement("div");
        a.className = "cm-anchor";
        a.innerHTML = '<span class="cm-anchor-badge">The whole idea</span>' +
          '<p class="cm-anchor-text">CI answers “is this change safe to integrate?”; CD answers “how do we safely deliver it?” — ' +
          "and data quality answers “is the resulting data actually correct?” Together they carry PySpark, SQL, dbt, and Airflow code from a laptop to production, safely and repeatably.</p>";
        return a;
      })());
    },
    destroy: function () {}
  };

  NS.registerModule(module);
})();
