/* modules/business-scenario.js — flagship: "A Code Change Travels to Production"
   One shared pipeline shown three ways (Business / Systems / Technical),
   with an idx-driven animation that paints each node's state. */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // One shared sequence of stages. Each stage carries a label per view.
  // state: the status the node reaches when the animation passes it.
  var STAGES = [
    { biz: "Developer changes revenue logic", sys: "GitHub", tech: "git push", state: "success" },
    { biz: "Change proposed for review",       sys: "Pull Request", tech: "PR event", state: "success" },
    { biz: "Automated validation starts",      sys: "CI", tech: "GitHub Actions runner", state: "running" },
    { biz: "Python logic checked",             sys: "CI · tests", tech: "pytest", state: "success" },
    { biz: "Data transforms checked",          sys: "CI · tests", tech: "dbt build + test", state: "success" },
    { biz: "App packaged identically",         sys: "Artifact", tech: "docker build → registry push", state: "success" },
    { biz: "Infrastructure reviewed",          sys: "Terraform", tech: "terraform plan → apply", state: "success" },
    { biz: "Databricks job promoted",          sys: "Databricks", tech: "bundle deploy --target prod", state: "deployed" },
    { biz: "Workflow orchestrated",            sys: "Airflow / dbt", tech: "Airflow DAG deploy", state: "deployed" },
    { biz: "7 AM dashboard is correct",        sys: "Warehouse / BI", tech: "production run + data quality", state: "success" }
  ];

  var VIEWS = [
    { key: "biz", label: "Business View", hint: "What the business experiences" },
    { key: "sys", label: "Systems View", hint: "Which system handles each step" },
    { key: "tech", label: "Technical View", hint: "The exact command / event" }
  ];

  var STATE_LABEL = {
    waiting: "waiting", running: "running", success: "success", deployed: "deployed",
    failed: "failed", blocked: "blocked"
  };

  var module = {
    id: "business-scenario",
    title: "A Code Change Travels to Production",
    _engine: null, _controls: null, _offs: [],

    render: function (container) {
      var self = this;
      var view = "biz";
      var reached = 0; // how many stages have been "passed" by the animation

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">🚀 Flagship Scenario · RetailFlow</div>' +
          '<h1 class="module-title gradient-text">A Code Change Travels to Production</h1>' +
          '<p class="module-subtitle">It\'s 6:55 AM. RetailFlow\'s COO will open the revenue dashboard in five minutes. ' +
          'Yesterday an engineer changed one line — <code>net_revenue = gross_revenue - refund_amount</code>. ' +
          "Watch that change travel safely from a laptop to the executive dashboard.</p>" +
        "</div>";

      // View switcher
      var views = document.createElement("div");
      views.className = "bs-views";
      views.innerHTML = VIEWS.map(function (v, i) {
        return '<button type="button" class="bs-view-btn' + (i === 0 ? " active" : "") +
          '" data-view="' + v.key + '">' + v.label + "</button>";
      }).join("");
      container.appendChild(views);
      var hint = document.createElement("div");
      hint.className = "bs-view-hint";
      hint.textContent = VIEWS[0].hint;
      container.appendChild(hint);

      // Pipeline stage
      var stage = document.createElement("div");
      stage.className = "bs-stage";
      container.appendChild(stage);

      function nodeState(i) {
        if (i < reached) return STAGES[i].state === "running" ? "success" : STAGES[i].state;
        if (i === reached) return STAGES[i].state; // the active one shows its live state
        return "waiting";
      }
      function paint() {
        stage.innerHTML = STAGES.map(function (s, i) {
          var st = nodeState(i);
          var arrow = i ? '<span class="bs-arrow ' + (i <= reached ? "on" : "") + '">↓</span>' : "";
          return arrow +
            '<div class="bs-node bs-state-' + st + (i === reached ? " bs-active" : "") + '">' +
              '<span class="bs-node-label">' + s[view] + "</span>" +
              '<span class="bs-node-state">' + (STATE_LABEL[st] || st) + "</span>" +
            "</div>";
        }).join("");
      }
      paint();

      views.addEventListener("click", function (e) {
        var b = e.target.closest(".bs-view-btn");
        if (!b) return;
        view = b.getAttribute("data-view");
        views.querySelectorAll(".bs-view-btn").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        hint.textContent = (VIEWS.filter(function (v) { return v.key === view; })[0] || {}).hint || "";
        paint();
      });

      // Animation (idx-driven): reached = idx+1
      if (NS.AnimationEngine && NS.AnimationControls) {
        var steps = STAGES.map(function (s) { return { label: s.biz, description: s.tech, duration: 1300 }; });
        var engine = new NS.AnimationEngine({ steps: steps, speed: 1 });
        var off = engine.on("stepchange", function (idx) { reached = idx + 1; paint(); });
        self._offs.push(off);
        var controls = NS.AnimationControls.create(engine, { label: true });
        var cw = document.createElement("div");
        cw.className = "section";
        cw.appendChild(controls.el);
        container.appendChild(cw);
        self._engine = engine; self._controls = controls;
      }

      // Two failure scenarios
      var fails = document.createElement("section");
      fails.className = "section";
      fails.innerHTML =
        '<h2 class="section-title">Two ways the pipeline protects the dashboard</h2>' +
        '<div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
          '<div class="card bs-fail"><div class="bs-fail-h">💥 A wrong formula</div>' +
            "<p>A developer writes <code>gross_revenue + refund_amount</code> by mistake. " +
            "<b>pytest</b> asserts <code>net_revenue(100,20)==80</code>, gets <code>120</code>, and fails. " +
            "The PR is <b>blocked</b> — the bad number never reaches production.</p></div>" +
          '<div class="card bs-fail"><div class="bs-fail-h">💥 Duplicated orders</div>' +
            "<p>A join accidentally duplicates orders. <b>dbt</b>'s <code>unique</code> test on <code>order_id</code> " +
            "fails during <code>dbt build</code>. Deployment is <b>blocked</b> before the warehouse is updated.</p></div>" +
          '<div class="card bs-fail"><div class="bs-fail-h">💥 Green deploy, bad data</div>' +
            "<p>Everything deploys successfully, but a <b>freshness</b> check finds yesterday's orders never landed. " +
            "CI/CD validated the <i>software</i>; <b>data quality</b> catches the <i>data</i> problem and raises an incident.</p></div>" +
        "</div>";
      container.appendChild(fails);

      // The change itself
      if (NS.CodeViewer) {
        var codeWrap = document.createElement("section");
        codeWrap.className = "section";
        codeWrap.innerHTML = '<h2 class="section-title">The one line that started it all</h2>';
        codeWrap.appendChild(NS.CodeViewer.create({
          title: "transforms/revenue.py", lang: "python",
          code: "df = df.withColumn(\n" +
                "    \"net_revenue\",\n" +
                "    F.col(\"gross_revenue\") - F.col(\"refund_amount\"),\n" +
                ")",
          highlights: [3]
        }));
        container.appendChild(codeWrap);
      }

      container.appendChild((function () {
        var a = document.createElement("div");
        a.className = "cm-anchor";
        a.innerHTML = '<span class="cm-anchor-badge">Remember this</span>' +
          '<p class="cm-anchor-text">CI/CD is the machinery that lets a one-line change reach production ' +
          "<i>safely and repeatably</i> — validated by tests, packaged once, reviewed for infra, and checked for data quality on the way.</p>";
        return a;
      })());
    },

    destroy: function () {
      this._offs.forEach(function (off) { try { off && off(); } catch (e) {} });
      this._offs = [];
      if (this._controls && this._controls.destroy) { try { this._controls.destroy(); } catch (e) {} }
      if (this._engine && this._engine.reset) { try { this._engine.reset(); } catch (e) {} }
      this._engine = null; this._controls = null;
    }
  };

  NS.registerModule(module);
})();
