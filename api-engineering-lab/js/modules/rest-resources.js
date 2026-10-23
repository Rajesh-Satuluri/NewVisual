/* ============================================================
   modules/rest-resources.js — Resources & CRUD
   Tabs: Resource model · Good vs bad naming (interactive) ·
   CRUD ↔ HTTP mapping with a live resource state machine.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "rest-resources",
    title: "Resources & CRUD",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var d = AV.data.rest;

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">REST Design Studio</div>' +
          '<h1 class="module-title">Model resources, let methods be the verbs</h1>' +
          '<p class="module-subtitle">REST is resource-oriented: URLs identify <i>things</i> (nouns), and HTTP methods say what to <i>do</i> to them. Get this right and a partner can integrate from the docs alone.</p></div>' +

        '<div class="tabstrip">' + T("model", "Resource model", true) + T("naming", "Good vs bad") + T("crud", "CRUD ↔ HTTP") + "</div>" +

        P("model", true,
          '<p class="panel-sub">ShopSphere models its domain as a small set of consistent, pluralized resources. Sub-resources express ownership.</p>' +
          '<div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Collection</th><th>Describes</th><th>Item / sub-resource</th></tr></thead><tbody>' +
          d.resources.map(function (r) { return '<tr><td class="mono">' + r.path + "</td><td>" + r.d + '</td><td class="mono text-muted">' + r.sub + "</td></tr>"; }).join("") +
          "</tbody></table></div>" +
          '<div class="callout tip" style="margin-top:var(--space-4)"><span class="callout-icon">🧭</span><div class="callout-body"><b>Rules of thumb:</b> plural collections (<code>/orders</code>), identify items by id (<code>/orders/123</code>), nest one level to show ownership (<code>/customers/5/orders</code>), and keep verbs out of the path — the method is the verb. These are <i>conventions</i>, not HTTP requirements, but consistency is what makes an API learnable.</div></div>'
        ) +

        P("naming", false,
          '<p class="panel-sub">Each row rewrites a verb-heavy or inconsistent endpoint into a resource-oriented one. Click to reveal why.</p>' +
          '<div id="gb-list">' + d.goodBad.map(function (g, i) {
            return '<div class="gb-row" data-i="' + i + '">' +
              '<div class="gb-pair"><code class="gb-bad">✘ ' + g.bad + "</code><span class=\"gb-arrow\">→</span><code class=\"gb-good\">✔ " + g.good + "</code></div>" +
              '<div class="gb-why" hidden>' + g.why + "</div></div>";
          }).join("") + "</div>"
        ) +

        P("crud", false,
          '<p class="panel-sub">The four CRUD operations map onto HTTP methods. Run each against a live order resource and watch it move through its existence states.</p>' +
          '<div class="lab-2col">' +
            '<div><div class="panel" style="overflow-x:auto"><table class="dtable"><thead><tr><th>Operation</th><th>Method</th><th>URL</th><th>Success</th><th>Idempotent</th></tr></thead><tbody>' +
              d.crud.map(function (c) { return "<tr><td>" + c.op + '</td><td><span class="method-pill m-' + c.method.toLowerCase() + '">' + c.method + "</span></td><td class=\"mono\">" + c.url + "</td><td class=\"mono\">" + c.success + "</td><td>" + c.idem + "</td></tr>"; }).join("") +
              "</tbody></table></div>" +
              '<div class="chiprow" id="crud-ops" style="margin-top:var(--space-3)">' +
                ["POST", "GET", "PUT", "PATCH", "DELETE"].map(function (m) { return '<button class="chip" data-m="' + m + '">' + m + "</button>"; }).join("") +
              "</div><div id=\"crud-out\" style=\"margin-top:var(--space-3)\"></div></div>" +
            '<aside class="arch-canvas" id="crud-sm"></aside>' +
          "</div>"
        );

      AV.ui.wireTabs(container);

      // good/bad reveal
      container.querySelector("#gb-list").addEventListener("click", function (e) {
        var row = e.target.closest(".gb-row"); if (!row) return;
        var why = row.querySelector(".gb-why"); why.hidden = !why.hidden;
      });

      // CRUD state machine
      var sm = AV.StateMachine.create({
        viewBox: "0 0 360 300",
        states: [
          { id: "none", label: "Nonexistent", x: 110, y: 20, kind: "none" },
          { id: "exists", label: "Exists", x: 110, y: 120, kind: "running" },
          { id: "gone", label: "Deleted", x: 110, y: 220, kind: "skipped" }
        ],
        transitions: [
          { from: "none", to: "exists", label: "POST" },
          { from: "exists", to: "exists", label: "GET/PUT/PATCH" },
          { from: "exists", to: "gone", label: "DELETE" }
        ]
      });
      container.querySelector("#crud-sm").appendChild(sm.el);
      sm.setActive("none");

      var out = container.querySelector("#crud-out");
      var exists = false;
      container.querySelector("#crud-ops").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        container.querySelectorAll("#crud-ops .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        var m = b.getAttribute("data-m");
        var msg, status, state;
        if (m === "POST") { exists = true; status = "201 Created"; state = "exists"; msg = "Created a new order resource at /v1/orders/ORD-X."; sm.flow("none", "exists"); }
        else if (!exists && m !== "POST") { status = "404 Not Found"; state = "none"; msg = "Can't " + m + " — the resource doesn't exist yet. Create it first with POST."; }
        else if (m === "GET") { status = "200 OK"; state = "exists"; msg = "Read the order. Safe and idempotent — repeat freely."; sm.flow("exists", "exists"); }
        else if (m === "PUT") { status = "200 OK"; state = "exists"; msg = "Replaced the whole order. Idempotent — repeating lands the same state. (Omitted fields would be cleared!)"; sm.flow("exists", "exists"); }
        else if (m === "PATCH") { status = "200 OK"; state = "exists"; msg = "Updated named fields only."; sm.flow("exists", "exists"); }
        else if (m === "DELETE") { exists = false; status = "204 No Content"; state = "gone"; msg = "Cancelled/removed the order. A second DELETE would return 404 — but the state effect is idempotent."; sm.flow("exists", "gone"); }
        sm.setActive(state);
        var cls = "st-" + status[0] + "xx";
        out.innerHTML = '<div class="callout ' + (status[0] === "2" ? "tip" : "warn") + '"><span class="status-pill ' + cls + '">' + status.split(" ")[0] + "</span><div class=\"callout-body\">" + msg + "</div></div>";
      });
    },
    destroy: function () {}
  };

  function T(id, label, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + label + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }

  AV.registerModule(module);
})();
