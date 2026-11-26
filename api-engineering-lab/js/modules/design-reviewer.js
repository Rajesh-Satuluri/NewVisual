/* ============================================================
   modules/design-reviewer.js — Design Reviewer (build capstone)
   The learner designs ShopSphere's returns & refunds API —
   endpoints, an error body, pagination/auth/idempotency/versioning
   choices — and a rule-based senior reviewer grades it like a PR
   review: blockers, suggestions, and praise, with a verdict.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DONE_KEY = "apilab-design-review";

  var STARTER_ENDPOINTS =
    "# One endpoint per line: METHOD /path\n" +
    "# Design the returns & refunds API. You'll want (at least):\n" +
    "#  - create a return request for an order\n" +
    "#  - list a customer's return requests\n" +
    "#  - fetch one return request\n" +
    "#  - approve or reject it (state change)\n" +
    "#  - create the refund once approved\n" +
    "POST /v1/orders/{orderId}/returns\n";

  var STARTER_ERROR =
    '{\n  "title": "",\n  "status": 0,\n  "code": "",\n  "requestId": ""\n}';

  var METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  var VERB_WORDS = ["get", "create", "update", "delete", "fetch", "make", "do", "process", "handle", "add", "remove", "set", "list"];

  function parseEndpoints(text) {
    var out = [], bad = [];
    text.split("\n").forEach(function (line) {
      var t = line.trim();
      if (!t || t.charAt(0) === "#") return;
      var m = t.match(/^([A-Za-z]+)\s+(\/\S*)$/);
      if (!m) { bad.push(t); return; }
      out.push({ method: m[1].toUpperCase(), path: m[2], raw: t });
    });
    return { eps: out, bad: bad };
  }

  function segs(path) { return path.split("?")[0].split("/").filter(Boolean); }
  function isParam(s) { return /^\{[^}]+\}$/.test(s) || s.charAt(0) === ":"; }

  // ── The review rules ─────────────────────────────────────
  // Each: { id, level: 'blocker'|'warn'|'praise-when-pass', check(ctx) → null (pass) | message }
  // ctx: { eps, bad, errBody(parsed|null), errRaw, choices }
  var RULES = [
    { id: "parseable", level: "blocker", pts: 2, name: "Endpoints are well-formed",
      check: function (c) { return c.bad.length ? "Unparseable lines (use `METHOD /path`): " + c.bad.slice(0, 3).join(" · ") : null; } },
    { id: "has-create", level: "blocker", pts: 2, name: "A return can be created",
      check: function (c) { return c.eps.some(function (e) { return e.method === "POST" && /return/i.test(e.path); }) ? null : "No `POST …returns` endpoint — customers can't open a return at all."; } },
    { id: "has-get-one", level: "blocker", pts: 2, name: "A single return can be fetched",
      check: function (c) { return c.eps.some(function (e) { return e.method === "GET" && /return/i.test(e.path) && segs(e.path).some(isParam); }) ? null : "No `GET` of a single return by id — support can't look one up."; } },
    { id: "has-list", level: "warn", pts: 1, name: "Returns can be listed",
      check: function (c) { return c.eps.some(function (e) { return e.method === "GET" && /return/i.test(e.path) && !isParam(segs(e.path)[segs(e.path).length - 1]); }) ? null : "No collection `GET` for returns — the app's 'My returns' screen has nothing to call."; } },
    { id: "has-refund", level: "blocker", pts: 2, name: "A refund can be created",
      check: function (c) { return c.eps.some(function (e) { return e.method === "POST" && /refund/i.test(e.path); }) ? null : "No `POST …refunds` endpoint — the money never goes back."; } },
    { id: "no-verbs", level: "blocker", pts: 2, name: "Paths name resources, not actions",
      check: function (c) {
        var hits = [];
        c.eps.forEach(function (e) { segs(e.path).forEach(function (s) {
          if (isParam(s)) return;
          var w = s.toLowerCase().replace(/[-_].*$/, "");
          if (VERB_WORDS.indexOf(w) !== -1 && w !== "list") hits.push(e.method + " " + e.path);
          if (/^(createreturn|getreturn|processrefund|approvereturn)/i.test(s)) hits.push(e.method + " " + e.path);
        }); });
        return hits.length ? "Verbs in paths (the method IS the verb): " + hits.slice(0, 3).join(" · ") : null;
      } },
    { id: "plural", level: "warn", pts: 1, name: "Collection names are plural",
      check: function (c) {
        var hits = [];
        c.eps.forEach(function (e) {
          var ss = segs(e.path);
          ss.forEach(function (s, i2) {
            if (isParam(s) || /^v\d+$/.test(s)) return;
            var next = ss[i2 + 1];
            if (next && isParam(next) && !/s$/i.test(s)) hits.push(s + "/" + next + " in " + e.path);
          });
        });
        return hits.length ? "Singular collection before an id: " + hits.slice(0, 3).join(" · ") + " — use plural (`returns/{id}`)." : null;
      } },
    { id: "get-safe", level: "blocker", pts: 2, name: "GET never mutates",
      check: function (c) {
        var hits = c.eps.filter(function (e) { return e.method === "GET" && /(approve|reject|cancel|refund$|submit)/i.test(segs(e.path).join(" ")); })
          .map(function (e) { return e.method + " " + e.path; });
        return hits.length ? "GET used for a state change: " + hits.join(" · ") + " — crawlers and prefetchers will fire it." : null;
      } },
    { id: "state-change", level: "warn", pts: 1, name: "Approval/rejection is modeled",
      check: function (c) {
        var ok = c.eps.some(function (e) {
          return (e.method === "POST" && /(approve|reject|approval|rejection|decision)s?$/i.test(segs(e.path).pop() || "")) ||
                 (e.method === "PATCH" && /return/i.test(e.path));
        });
        return ok ? null : "No way to approve/reject a return. Either `PATCH` the return's status or `POST …/approval` as a sub-resource.";
      } },
    { id: "nesting", level: "warn", pts: 1, name: "Nesting stays shallow",
      check: function (c) {
        var hits = c.eps.filter(function (e) { return segs(e.path).filter(function (s) { return !isParam(s) && !/^v\d+$/.test(s); }).length > 3; })
          .map(function (e) { return e.path; });
        return hits.length ? "Deep nesting: " + hits[0] + " — more than ~2 resource levels gets painful; flatten with a filter or top-level resource." : null;
      } },
    { id: "trailing", level: "warn", pts: 1, name: "No trailing slashes / uppercase paths",
      check: function (c) {
        var hits = c.eps.filter(function (e) { return /\/$/.test(e.path) || /[A-Z]/.test(e.path.replace(/\{[^}]*\}/g, "")); }).map(function (e) { return e.path; });
        return hits.length ? "Style: " + hits.slice(0, 3).join(" · ") + " — lowercase, no trailing slash." : null;
      } },
    { id: "delete-return", level: "warn", pts: 1, name: "Cancellation is a state, not a DELETE",
      check: function (c) {
        var hits = c.eps.filter(function (e) { return e.method === "DELETE" && /return|refund/i.test(e.path); }).map(function (e) { return e.method + " " + e.path; });
        return hits.length ? hits[0] + " — returns/refunds are financial records; model cancellation as a status change, don't erase history." : null;
      } },

    // error body
    { id: "err-json", level: "blocker", pts: 2, name: "Error body is valid JSON",
      check: function (c) { return c.errBody ? null : "The error body doesn't parse as JSON."; } },
    { id: "err-title", level: "blocker", pts: 1, name: "Error has a human-readable title",
      check: function (c) { return c.errBody && typeof c.errBody.title === "string" && c.errBody.title.length > 2 ? null : "No meaningful `title` — the on-call engineer reads this at 3am."; } },
    { id: "err-code", level: "blocker", pts: 2, name: "Error has a machine-readable code",
      check: function (c) { return c.errBody && typeof c.errBody.code === "string" && /^[A-Z0-9_]{3,}$/.test(c.errBody.code) ? null : "No machine-readable `code` (SCREAMING_SNAKE) — clients end up string-matching the title, which breaks on copy edits."; } },
    { id: "err-status", level: "warn", pts: 1, name: "Error echoes the HTTP status",
      check: function (c) { return c.errBody && typeof c.errBody.status === "number" && c.errBody.status >= 400 && c.errBody.status <= 599 ? null : "Include the numeric `status` (4xx/5xx) in the body — logs and queues strip the envelope."; } },
    { id: "err-reqid", level: "warn", pts: 1, name: "Error carries a request id",
      check: function (c) { return c.errBody && typeof c.errBody.requestId === "string" && c.errBody.requestId.length > 3 ? null : "No `requestId` — support can't correlate a customer complaint to your logs."; } },
    { id: "err-noleak", level: "blocker", pts: 2, name: "Error leaks no internals",
      check: function (c) {
        if (!c.errBody) return null;
        var s = JSON.stringify(c.errBody).toLowerCase();
        return /(stack|\.js:|exception|sql|select |trace)/.test(s) ? "The body contains what looks like a stack trace / SQL / internal detail — that's reconnaissance material for an attacker." : null;
      } },

    // choices
    { id: "ch-pagination", level: "warn", pts: 1, name: "List endpoints paginate",
      check: function (c) { return c.choices.pagination === "none" ? "No pagination on the returns list — a big retailer's support view will pull every return ever made." : null; } },
    { id: "ch-cursor", level: "praise", pts: 1, name: "Cursor pagination for a growing dataset",
      check: function (c) { return c.choices.pagination === "cursor" ? null : (c.choices.pagination === "offset" ? "Offset pagination works, but returns arrive constantly — rows shift under the reader. Cursor-based is steadier here." : "—"); } },
    { id: "ch-auth", level: "blocker", pts: 2, name: "Caller identity + permissions",
      check: function (c) { return c.choices.auth === "none" ? "No authentication on a money-moving API. This is the finding that stops the release." : null; } },
    { id: "ch-scopes", level: "warn", pts: 1, name: "Fine-grained authorization",
      check: function (c) { return c.choices.auth === "oauth" ? null : (c.choices.auth === "apikey" ? "An API key says WHO is calling but not WHAT they may do — approving refunds needs scopes/roles (e.g. `refunds:write` for support staff only)." : "—"); } },
    { id: "ch-idem", level: "blocker", pts: 2, name: "Refund creation is idempotent",
      check: function (c) { return c.choices.idem === "key" ? null : "Refund POSTs with no Idempotency-Key: a mobile retry on a dropped response refunds the customer twice. Real money, twice."; } },
    { id: "ch-version", level: "warn", pts: 1, name: "The contract is versioned",
      check: function (c) {
        if (c.choices.version !== "none") return null;
        var hasV = c.eps.some(function (e) { return /^v\d+$/.test(segs(e.path)[0] || ""); });
        return hasV ? null : "No versioning strategy — the first breaking change will strand the mobile app's old versions.";
      } },
    { id: "ownership", level: "warn", pts: 1, name: "Ownership is scoped in the design",
      check: function (c) {
        var scoped = c.eps.some(function (e) { return /\{(customerId|orderId)\}/i.test(e.path) || /^\/v\d+\/(me|customers)\//i.test(e.path); });
        return scoped ? null : "Nothing ties returns to their owner. Scope by order/customer (`/orders/{orderId}/returns`) or filter by the authenticated user — otherwise anyone can read anyone's returns (BOLA, OWASP API #1).";
      } }
  ];

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var module = {
    id: "design-reviewer",
    title: "Design Reviewer (Capstone)",
    fullWidth: true,
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation &amp; Testing</div>' +
          '<h1 class="module-title">Capstone: design the returns &amp; refunds API</h1>' +
          '<p class="module-subtitle">ShopSphere is adding product returns. Customers open a return for an order, support approves or rejects it, and an approved return triggers a refund. <b>You design the API</b> — endpoints, the error body, and four platform choices — then a rule-based senior reviewer grades it like a pull-request review (' + RULES.length + ' review rules).</p></div>' +

        '<div class="lab-2col wide-right">' +
          '<div>' +
            '<div class="panel"><div class="panel-title">1 · Endpoints</div>' +
              '<p class="panel-sub">One per line: <code>METHOD /path</code>. <code>{curly}</code> for path params. Lines starting with <code>#</code> are ignored.</p>' +
              '<textarea class="textarea mono" id="dr-eps" rows="12" spellcheck="false">' + esc(STARTER_ENDPOINTS) + "</textarea></div>" +
            '<div class="panel"><div class="panel-title">2 · Your error response body</div>' +
              '<p class="panel-sub">The JSON a client sees when a return is rejected by validation. Design it so a client, a support agent, and your logs can all use it.</p>' +
              '<textarea class="textarea mono" id="dr-err" rows="7" spellcheck="false">' + esc(STARTER_ERROR) + "</textarea></div>" +
            '<div class="panel"><div class="panel-title">3 · Platform choices</div><div class="dr-choices">' +
              choice("pagination", "Pagination for list endpoints", [["none", "None — return everything"], ["offset", "Offset + limit"], ["cursor", "Cursor-based"]]) +
              choice("auth", "Authentication & authorization", [["none", "None (internal, trusted)"], ["apikey", "API key per client"], ["oauth", "OAuth2 / JWT with scopes"]]) +
              choice("idem", "Refund creation retries", [["none", "Clients shouldn't retry"], ["key", "Idempotency-Key header, key→result stored"]]) +
              choice("version", "Versioning", [["none", "None yet"], ["uri", "URI: /v1/…"], ["header", "Header/media-type"]]) +
            "</div></div>" +
            '<button class="btn btn-primary" id="dr-review" style="margin-top:var(--space-2)">📝 Request review</button>' +
          "</div>" +
          '<aside class="sticky-side"><div class="panel"><div class="panel-title">Review</div><div id="dr-out"><p class="text-muted text-sm">Submit your design to get a senior review: blockers, suggestions, and a verdict. ≥80% with no blockers = approved.</p></div></div></aside>' +
        "</div>";

      function choice(name, label, opts) {
        return '<div style="margin-bottom:var(--space-3)"><div class="panel-title" style="font-size:0.9em">' + label + "</div>" +
          opts.map(function (o, idx) {
            return '<label style="display:block;margin-top:4px;cursor:pointer"><input type="radio" name="dr-' + name + '" value="' + o[0] + '"' + (idx === 0 ? " checked" : "") + "> " + o[1] + "</label>";
          }).join("") + "</div>";
      }

      container.querySelector("#dr-review").addEventListener("click", function () {
        var parsed = parseEndpoints(container.querySelector("#dr-eps").value);
        var errRaw = container.querySelector("#dr-err").value;
        var errBody = null;
        try { errBody = JSON.parse(errRaw); } catch (e) {}
        function picked(n) { var el = container.querySelector('input[name="dr-' + n + '"]:checked'); return el ? el.value : "none"; }
        var ctx = { eps: parsed.eps, bad: parsed.bad, errBody: errBody, errRaw: errRaw,
          choices: { pagination: picked("pagination"), auth: picked("auth"), idem: picked("idem"), version: picked("version") } };

        if (ctx.eps.length === 0) {
          container.querySelector("#dr-out").innerHTML = '<div class="callout warn"><span class="callout-icon">✏️</span><div class="callout-body">No endpoints yet — write at least the create/list/get trio before requesting review.</div></div>';
          return;
        }

        var blockers = [], warns = [], praise = [];
        var earned = 0, totalPts = 0;
        RULES.forEach(function (r) {
          totalPts += r.pts;
          var msg = r.check(ctx);
          if (msg === null) { earned += r.pts; praise.push(r.name); }
          else if (msg === "—") { /* praise rule not applicable: half credit */ earned += r.pts * 0.5; }
          else if (r.level === "blocker") blockers.push({ r: r, msg: msg });
          else warns.push({ r: r, msg: msg });
        });
        var pct = Math.round(earned / totalPts * 100);
        var approved = blockers.length === 0 && pct >= 80;
        if (approved) { try { localStorage.setItem(DONE_KEY, String(pct)); } catch (e) {} }

        function section(title, icon, list) {
          if (!list.length) return "";
          return '<div style="margin-top:var(--space-3)"><div class="panel-title" style="font-size:0.9em">' + icon + " " + title + " (" + list.length + ')</div><ul class="tick-list">' +
            list.map(function (x) { return "<li><b>" + esc(x.r.name) + ":</b> " + esc(x.msg) + "</li>"; }).join("") + "</ul></div>";
        }

        container.querySelector("#dr-out").innerHTML =
          (approved
            ? '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body"><b>Approved — ' + pct + "%.</b> This would ship. " + (warns.length ? "The suggestions below are follow-up material, not blockers." : "A clean review, which is rare — well designed.") + "</div></div>"
            : '<div class="callout ' + (blockers.length ? "danger" : "warn") + '"><span class="callout-icon">' + (blockers.length ? "🛑" : "🔁") + '</span><div class="callout-body"><b>' + (blockers.length ? "Request changes — " : "Almost — ") + pct + "%.</b> " + (blockers.length ? "Blockers must be fixed before this merges." : "No blockers, but under the 80% bar — work through the suggestions.") + "</div></div>") +
          '<div class="stat-row" style="margin:var(--space-3) 0"><div class="stat"><div class="stat-num">' + pct + '%</div><div class="stat-label">review score</div></div>' +
            '<div class="stat"><div class="stat-num">' + blockers.length + '</div><div class="stat-label">blockers</div></div>' +
            '<div class="stat"><div class="stat-num">' + warns.length + '</div><div class="stat-label">suggestions</div></div></div>' +
          section("Blockers", "🛑", blockers) +
          section("Suggestions", "💡", warns) +
          (praise.length ? '<details style="margin-top:var(--space-3)"><summary class="text-muted">✅ ' + praise.length + " rules passed</summary><ul class=\"tick-list\" style=\"margin-top:var(--space-2)\">" + praise.map(function (p2) { return "<li>✔ " + esc(p2) + "</li>"; }).join("") + "</ul></details>" : "");
      });
    },
    destroy: function () {}
  };

  AV.registerModule(module);
})();
