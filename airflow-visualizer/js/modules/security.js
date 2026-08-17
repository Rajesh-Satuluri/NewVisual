/* ============================================================
   modules/security.js — Security, auth, and RBAC
   Arch diagram: request → auth manager → backend → RBAC → resource.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var NODES = [
    { id: "user",    label: "User / Client",   sub: "browser · CLI · API token", x: 40,  y: 30,  w: 195, h: 60, color: "cyan"    },
    { id: "auth",    label: "Auth Manager",    sub: "API server front door",     x: 260, y: 30,  w: 195, h: 60, color: "airflow" },
    { id: "backend", label: "Auth Backend",    sub: "FAB · OAuth · Kerberos",   x: 480, y: 30,  w: 185, h: 60, color: "purple"  },
    { id: "rbac",    label: "RBAC Roles",      sub: "Admin · Op · User · Viewer", x: 260, y: 175, w: 195, h: 65, color: "green"   },
    { id: "perm",    label: "Resource Perms",  sub: "can_read / can_edit DAGs",  x: 260, y: 315, w: 195, h: 60, color: "yellow"  },
    { id: "fernet",  label: "Fernet Encryption", sub: "connections & variables", x: 480, y: 315, w: 185, h: 60, color: "red"     }
  ];

  var EDGES = [
    ["user", "auth"], ["auth", "backend"], ["auth", "rbac"], ["rbac", "perm"], ["perm", "fernet"]
  ];

  var STEPS = [
    {
      nodes: ["user"], edges: [],
      label: "1 · A request arrives",
      desc: "Every request — from the web UI, the CLI, or a REST API call — must be authenticated. A ShopKart analyst opening the DAGs page and a CI job triggering a run both hit the same front door."
    },
    {
      nodes: ["user", "auth"], edges: [["user", "auth"]],
      label: "2 · Auth Manager intercepts",
      desc: "Airflow 3 introduces the pluggable <b>Auth Manager</b> (replacing the 2.x FAB-only model). It owns both <i>authentication</i> (who are you?) and <i>authorization</i> (what may you do?). The default is <code>FabAuthManager</code>; enterprises can swap in an AWS/GCP identity manager."
    },
    {
      nodes: ["auth", "backend"], edges: [["auth", "backend"]],
      label: "3 · Auth backend verifies identity",
      desc: "The backend proves who you are. Options: database (username/password), <b>OAuth/OIDC</b> (Okta, Google, Azure AD), LDAP, or Kerberos. API clients use JWT tokens. Password auth alone is discouraged in production — federate to your IdP."
    },
    {
      nodes: ["auth", "rbac"], edges: [["auth", "rbac"]],
      label: "4 · RBAC role lookup",
      desc: "Once authenticated, the user's <b>roles</b> are resolved. Airflow ships five: <span class='state-chip success'>Admin</span> <span class='state-chip running'>Op</span> <span class='state-chip queued'>User</span> <span class='state-chip scheduled'>Viewer</span> <span class='state-chip skipped'>Public</span>. Roles are additive — a user gets the union of all their roles' permissions."
    },
    {
      nodes: ["rbac", "perm"], edges: [["rbac", "perm"]],
      label: "5 · Permission check on the resource",
      desc: "Each role maps to fine-grained permissions like <code>can_read</code> / <code>can_edit</code> on resources (<code>DAG:daily_sales_etl</code>, <code>Connections</code>, <code>Variables</code>). <b>DAG-level access control</b> lets you scope a role to only specific DAGs — the ShopKart finance team sees only finance DAGs."
    },
    {
      nodes: ["perm", "fernet"], edges: [["perm", "fernet"]],
      label: "6 · Secrets stay encrypted at rest",
      desc: "Connection passwords and Variables marked sensitive are encrypted in the metadata DB using a <b>Fernet key</b>. Rotate it with <code>airflow rotate-fernet-key</code>. Combined with a secrets backend (Vault, AWS SM), plaintext credentials never touch the database."
    }
  ];

  var CODE_RBAC =
    "# Create a scoped role limited to finance DAGs\n" +
    "airflow roles create FinanceTeam\n" +
    "\n" +
    "airflow roles add-perms FinanceTeam \\\n" +
    "  --resource 'DAG:finance_close_etl' --action can_read\n" +
    "airflow roles add-perms FinanceTeam \\\n" +
    "  --resource 'DAG:finance_close_etl' --action can_edit\n" +
    "\n" +
    "# Assign a user to the role\n" +
    "airflow users add-role -e ana@shopkart.io -r FinanceTeam";

  var CODE_CFG =
    "# airflow.cfg — production auth hardening\n" +
    "[api]\n" +
    "auth_manager = airflow.providers.fab.auth_manager.FabAuthManager\n" +
    "\n" +
    "[fab]\n" +
    "# OAuth via Okta (webserver_config.py holds the provider block)\n" +
    "auth_type = AUTH_OAUTH\n" +
    "\n" +
    "[core]\n" +
    "# 32-byte url-safe base64 key; store in a secret, not the file\n" +
    "fernet_key = ${AIRFLOW__CORE__FERNET_KEY}\n" +
    "\n" +
    "[secrets]\n" +
    "backend = airflow.providers.hashicorp.secrets.vault.VaultBackend";

  var ROLES = [
    ["Admin",  "Full access — manage users, roles, connections, pools, and all DAGs."],
    ["Op",     "Operate DAGs (trigger, clear, mark) + manage connections/variables/pools."],
    ["User",   "Trigger, clear, and read DAGs, but cannot manage cluster config."],
    ["Viewer", "Read-only: view DAGs, runs, logs. No trigger, no edit."],
    ["Public", "Unauthenticated. No access by default — the safe floor."]
  ];

  var module = {
    id: "security",
    title: "Security & RBAC",
    fullWidth: true,
    _engine: null, _controls: null, _diagram: null, _off: null,

    render: function (container) {
      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Security</div>' +
          '<h1 class="module-title">Security & RBAC: authentication, authorization, and secrets</h1>' +
          '<p class="module-subtitle">Every request passes through the Auth Manager, is authenticated by a pluggable backend, ' +
          "authorized against role-based permissions, and any secrets it touches stay encrypted at rest.</p>" +
        "</div>" +
        '<div class="arch-layout">' +
          '<div class="arch-canvas" id="se-canvas"></div>' +
          '<aside class="arch-detail" id="se-detail"></aside>' +
        "</div>" +
        '<div class="arch-controls" id="se-controls"></div>' +
        '<section class="section" style="margin-top:var(--space-10)">' +
          '<h2 class="section-title">The five built-in roles</h2>' +
          '<div class="table-wrap"><table class="cmp-table" id="se-table"></table></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="two-col-code" id="se-codes"></div>' +
        "</section>" +
        '<section class="section">' +
          '<div class="callout danger"><span class="callout-icon">🔐</span><div class="callout-body">' +
          "<b>Never commit a Fernet key or connection password.</b> Rotating a leaked Fernet key requires re-encrypting every stored connection — use <code>airflow rotate-fernet-key</code> with both old and new keys in <code>AIRFLOW__CORE__FERNET_KEY</code> during the transition.</div></div>" +
          '<div class="callout info"><span class="badge badge-v3">3.x</span><div class="callout-body">' +
          "<b>Pluggable Auth Manager:</b> Airflow 3 decouples auth from Flask AppBuilder. You can now write a custom auth manager (or use the AWS/GCP ones) to delegate authorization entirely to your cloud IAM.</div></div>" +
        "</section>";

      var diagram = AV.ArchDiagram.create({
        nodes: NODES, edges: EDGES, viewBox: "0 0 700 415", onSelect: function () {}
      });
      container.querySelector("#se-canvas").appendChild(diagram.el);
      this._diagram = diagram;

      var detail = container.querySelector("#se-detail");
      function defaultDetail() {
        detail.innerHTML =
          '<div class="arch-detail-title">Auth &amp; authz pipeline</div>' +
          "<p>Press play to follow a request from an unauthenticated client through identity verification, role resolution, and permission enforcement.</p>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🛡️</span>' +
          '<div class="callout-body">Principle of least privilege: give teams <code>Viewer</code> or a DAG-scoped role by default, and reserve <code>Admin</code> for platform operators only.</div></div>';
      }
      function showStep(idx) {
        if (idx < 0) { defaultDetail(); return; }
        var s = STEPS[idx];
        detail.innerHTML = '<div class="arch-detail-title">' + s.label + "</div><p>" + s.desc + "</p>";
      }

      var thead = "<thead><tr><th>Role</th><th>What it can do</th></tr></thead>";
      container.querySelector("#se-table").innerHTML = thead + "<tbody>" +
        ROLES.map(function (r) {
          return "<tr><td class='cmp-dim'><code>" + r[0] + "</code></td><td>" + r[1] + "</td></tr>";
        }).join("") + "</tbody>";

      var codes = container.querySelector("#se-codes");
      var a = document.createElement("div"); a.className = "two-col-code-item";
      a.appendChild(AV.CodeViewer.create({ title: "scoped RBAC via CLI", lang: "bash", code: CODE_RBAC }));
      var b = document.createElement("div"); b.className = "two-col-code-item";
      b.appendChild(AV.CodeViewer.create({ title: "airflow.cfg — auth hardening", lang: "bash", code: CODE_CFG }));
      codes.appendChild(a); codes.appendChild(b);

      var engine = new AV.AnimationEngine({
        steps: STEPS.map(function (s) { return { label: s.label, duration: 2700 }; }), speed: 1
      });
      this._engine = engine;
      this._off = engine.on("stepchange", function (idx) {
        if (idx < 0) { diagram.clear(); showStep(-1); return; }
        diagram.setActive(STEPS[idx].nodes, STEPS[idx].edges);
        showStep(idx);
      });
      var controls = AV.AnimationControls.create(engine, { title: "Ready — press play" });
      container.querySelector("#se-controls").appendChild(controls.el);
      this._controls = controls;
      defaultDetail();
    },

    destroy: function () {
      if (this._off) { this._off(); this._off = null; }
      if (this._controls) { this._controls.destroy(); this._controls = null; }
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      if (this._diagram) { this._diagram.destroy(); this._diagram = null; }
    }
  };

  AV.registerModule(module);
})();
