/* ============================================================
   modules/openapi-studio.js — OpenAPI & Documentation Studio
   Edit the ShopSphere OpenAPI spec with REAL validation (YAML
   parse + structural OpenAPI 3.x checks via AV.OpenAPI), docs
   rendered live from YOUR spec, spec-fixing exercises, and the
   contract-evolution explorer.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var DRIVES = [
    ["📖 Interactive docs", "Render try-it-out docs (Swagger UI / Redoc) straight from the spec — always in sync with the contract."],
    ["📦 Client SDKs", "Generate typed clients in many languages (openapi-generator) so consumers don't hand-write HTTP."],
    ["🧱 Server stubs", "Scaffold server interfaces/routes so implementation matches the contract."],
    ["✅ Contract tests", "Assert the running API still matches the spec — catch breaking changes in CI."],
    ["🚪 Gateway config", "Some gateways import the spec to configure routing, validation, and rate limits."],
    ["🤝 Partner onboarding", "A single authoritative document partners read — fewer kickoff calls, fewer tickets."]
  ];

  var FIXED_KEY = "apilab-oa-fixed";
  function fixedMap() { try { return JSON.parse(localStorage.getItem(FIXED_KEY) || "{}"); } catch (e) { return {}; } }
  function markFixed(id) { try { var m = fixedMap(); m[id] = true; localStorage.setItem(FIXED_KEY, JSON.stringify(m)); } catch (e) {} }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderIssues(v) {
    var html = "";
    if (v.errors.length === 0) {
      html += '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body"><b>Valid.</b> YAML parses and every structural check passes.</div></div>';
    } else {
      html += '<div class="callout danger"><span class="callout-icon">⛔</span><div class="callout-body"><b>' + v.errors.length + " error" + (v.errors.length > 1 ? "s" : "") + ".</b> Generators and gateways would refuse this spec.</div></div>";
      html += '<ul class="tick-list" style="margin-top:var(--space-2)">' + v.errors.map(function (e) {
        return "<li>✘ " + esc(e.msg) + (e.where ? ' <span class="text-muted text-sm mono">· ' + esc(e.where) + "</span>" : "") + "</li>";
      }).join("") + "</ul>";
    }
    if (v.warnings.length) {
      html += '<details style="margin-top:var(--space-2)"><summary class="text-muted">' + v.warnings.length + " warning" + (v.warnings.length > 1 ? "s" : "") + " (won't block, worth fixing)</summary><ul class=\"tick-list\" style=\"margin-top:var(--space-2)\">" +
        v.warnings.map(function (w) { return "<li>⚠ " + esc(w.msg) + (w.where ? ' <span class="text-muted text-sm mono">· ' + esc(w.where) + "</span>" : "") + "</li>"; }).join("") + "</ul></details>";
    }
    return html;
  }

  function renderDocs(spec) {
    var ops = AV.OpenAPI.docModel(spec);
    if (!ops.length) return '<p class="text-muted">No operations found — add something under <code>paths</code>.</p>';
    var head = spec.info ? '<div class="panel"><div class="panel-title">' + esc(spec.info.title || "Untitled API") + ' <span class="text-muted">v' + esc(spec.info.version || "?") + "</span></div>" +
      (spec.info.description ? "<p>" + esc(spec.info.description) + "</p>" : "") +
      (spec.servers && spec.servers[0] ? '<p class="mono text-sm text-muted">' + esc(spec.servers[0].url) + "</p>" : "") + "</div>" : "";
    return head + ops.map(function (d) {
      return '<div class="panel"><div class="oa-doc-head"><span class="method-pill m-' + d.method.toLowerCase() + '">' + d.method + '</span><span class="mono">' + esc(d.path) + "</span>" +
        (d.auth ? '<span class="status-pill st-4xx" title="requires auth">🔒 auth</span>' : "") +
        (d.deprecated ? '<span class="status-pill st-5xx">deprecated</span>' : "") + "</div>" +
        (d.summary ? '<p style="margin-top:var(--space-2)">' + esc(d.summary) + "</p>" : "") +
        '<dl class="kv"><dt>Parameters</dt><dd>' + (d.params.length ? d.params.map(esc).join("<br>") : "—") + "</dd>" +
        '<dt>Request body</dt><dd class="mono">' + (d.body ? esc(d.body) : "—") + "</dd>" +
        "<dt>Responses</dt><dd>" + (d.responses.length ? d.responses.map(function (r) {
          var cls = /^\d/.test(r.code) ? "st-" + r.code[0] + "xx" : "st-2xx";
          return '<span class="status-pill ' + cls + '" style="margin-right:4px" title="' + esc(r.desc) + '">' + esc(r.code) + (r.schema ? " " + esc(r.schema) : "") + "</span>";
        }).join("") : "—") + "</dd></dl></div>";
    }).join("");
  }

  var module = {
    id: "openapi-studio",
    title: "OpenAPI & Docs Studio",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("intermediate");
      var yamlSrc = AV.data.impl.openapiYaml;
      var exercises = AV.data.openapiExercises || [];

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Implementation &amp; Testing</div>' +
          '<h1 class="module-title">One spec drives docs, SDKs, and tests</h1>' +
          '<p class="module-subtitle">OpenAPI describes your contract once, in a machine-readable file. Edit the ShopSphere spec — a <b>real YAML parser and structural validator</b> check it as you type, and the docs tab renders from <i>your</i> edits. Then fix five broken specs.</p></div>' +

        '<div class="tabstrip">' + T("spec", "Spec (editable)", true) + T("docs", "Rendered docs") + T("fix", "Fix the spec (" + exercises.length + ")") + T("drives", "What it drives") + T("evolve", "Contract evolution") + "</div>" +

        P("spec", true,
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">openapi.yaml</div><textarea class="textarea mono" id="oa-src" rows="24" spellcheck="false">' + esc(yamlSrc) + "</textarea>" +
              '<div class="chiprow" style="margin-top:var(--space-2)"><button class="btn btn-primary btn-sm" id="oa-validate">✓ Validate</button>' +
              '<button class="btn btn-ghost btn-sm" id="oa-reset">↺ Restore original</button></div></div>' +
            '<aside class="sticky-side panel"><div class="panel-title">Validation</div><div id="oa-struct"></div>' +
              '<p class="text-muted text-sm" style="margin-top:var(--space-3)">Real YAML parse (js-yaml) + structural OpenAPI 3.x checks: paths, operations, responses, path parameters, $refs, operationIds, security schemes, schema sanity. Production adds full JSON-Schema + style rules (Spectral).</p></aside>' +
          "</div>"
        ) +

        P("docs", false,
          '<p class="panel-sub">Rendered from the spec in the editor tab — <b>your edits show up here</b>. In production this is Swagger UI / Redoc served from the file.</p>' +
          '<div id="oa-docs"></div>'
        ) +

        P("fix", false,
          '<p class="panel-sub">Each exercise is a ShopSphere spec with seeded contract bugs. Fix the YAML until the validator reports <b>zero errors</b>. Hints reveal one bug at a time.</p>' +
          '<div class="chiprow" id="oa-ex-tabs" style="margin-bottom:var(--space-3)"></div>' +
          '<div id="oa-ex-body"></div>'
        ) +

        P("drives", false,
          '<p class="panel-sub">Because the spec is machine-readable, one file powers a whole toolchain. (Exact capabilities depend on the tools you adopt.)</p>' +
          '<div class="note-grid">' + DRIVES.map(function (d) { return '<div class="panel"><div class="panel-title">' + d[0] + "</div><p>" + d[1] + "</p></div>"; }).join("") + "</div>"
        ) +

        P("evolve", false,
          '<p class="panel-sub">Pick a change to the <code>Order</code> schema and see who it affects.</p>' +
          '<div class="chiprow" id="oa-evo" style="margin-bottom:var(--space-3)">' +
            '<button class="chip active" data-k="optional">Add optional field</button>' +
            '<button class="chip" data-k="required">Make a field required</button>' +
            '<button class="chip" data-k="remove">Remove a field</button>' +
          "</div><div id=\"oa-evo-out\"></div>"
        );

      AV.ui.wireTabs(container);

      // ── editable spec + live docs ──
      var srcEl = container.querySelector("#oa-src");
      var structEl = container.querySelector("#oa-struct");
      var docsEl = container.querySelector("#oa-docs");
      var debounce = null;

      function validateMain() {
        var v = AV.OpenAPI.validate(srcEl.value);
        structEl.innerHTML = renderIssues(v);
        docsEl.innerHTML = v.spec ? renderDocs(v.spec) :
          '<div class="callout warn"><span class="callout-icon">⚠️</span><div class="callout-body">Can\'t render docs — the YAML doesn\'t parse. Fix it in the Spec tab.</div></div>';
      }
      srcEl.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(validateMain, 400);
      });
      container.querySelector("#oa-validate").addEventListener("click", validateMain);
      container.querySelector("#oa-reset").addEventListener("click", function () { srcEl.value = yamlSrc; validateMain(); });
      validateMain();

      // ── spec-fixing exercises ──
      var exTabs = container.querySelector("#oa-ex-tabs");
      var exBody = container.querySelector("#oa-ex-body");
      var exDrafts = {}, exHints = {};
      var exIdx = 0;

      function renderExTabs() {
        var fixed = fixedMap();
        exTabs.innerHTML = exercises.map(function (ex, idx) {
          return '<button class="chip' + (idx === exIdx ? " active" : "") + '" data-ex="' + idx + '">' + (fixed[ex.id] ? "✅ " : "") + (idx + 1) + ". " + esc(ex.title) + "</button>";
        }).join("");
      }

      function renderExercise() {
        var ex = exercises[exIdx];
        if (!ex) { exBody.innerHTML = ""; return; }
        var fixed = fixedMap();
        var code = exDrafts[ex.id] != null ? exDrafts[ex.id] : ex.yaml;
        exBody.innerHTML =
          '<div class="callout info"><span class="callout-icon">🔧</span><div class="callout-body"><b>' + esc(ex.title) + " — " + ex.bugs + " bug" + (ex.bugs > 1 ? "s" : "") + ".</b> " + ex.brief + "</div></div>" +
          '<div class="lab-2col">' +
            '<div class="panel"><div class="panel-title">broken-spec.yaml</div><textarea class="textarea mono" id="oa-ex-src" rows="20" spellcheck="false">' + esc(code) + "</textarea>" +
              '<div class="chiprow" style="margin-top:var(--space-2)">' +
                '<button class="btn btn-primary btn-sm" id="oa-ex-check">✓ Check my fix</button>' +
                '<button class="btn btn-ghost btn-sm" id="oa-ex-hint">💡 Hint</button>' +
                '<button class="btn btn-ghost btn-sm" id="oa-ex-reset">↺ Reset</button>' +
              "</div><div id=\"oa-ex-hints\" style=\"margin-top:var(--space-2)\"></div></div>" +
            '<aside class="panel"><div class="panel-title">Validator says</div><div id="oa-ex-out">' +
              (fixed[ex.id] ? '<div class="callout tip"><span class="callout-icon">✅</span><div class="callout-body">Already fixed. Break it again if you like — the validator doesn\'t mind.</div></div>' : '<p class="text-muted text-sm">Check your fix to run the validator.</p>') +
            "</div></aside>" +
          "</div>";

        var exSrc = exBody.querySelector("#oa-ex-src");
        exSrc.addEventListener("input", function () { exDrafts[ex.id] = exSrc.value; });

        exBody.querySelector("#oa-ex-check").addEventListener("click", function () {
          var v = AV.OpenAPI.validate(exSrc.value);
          var out = exBody.querySelector("#oa-ex-out");
          if (v.errors.length === 0) {
            markFixed(ex.id);
            renderExTabs();
            var allDone = exercises.every(function (e2) { return fixedMap()[e2.id]; });
            out.innerHTML = '<div class="callout tip"><span class="callout-icon">🎉</span><div class="callout-body"><b>Fixed — zero errors.</b> ' +
              (allDone ? "All " + exercises.length + " specs repaired. You can debug contracts now." : "On to the next one.") + "</div></div>" + renderIssues(v);
          } else {
            out.innerHTML = renderIssues(v);
          }
        });

        exBody.querySelector("#oa-ex-hint").addEventListener("click", function () {
          var n = exHints[ex.id] || 0;
          exHints[ex.id] = Math.min(n + 1, ex.hints.length);
          exBody.querySelector("#oa-ex-hints").innerHTML = ex.hints.slice(0, exHints[ex.id]).map(function (h, idx) {
            return '<div class="callout info" style="margin-top:var(--space-1)"><span class="callout-icon">💡</span><div class="callout-body"><b>Hint ' + (idx + 1) + ":</b> " + h + "</div></div>";
          }).join("");
        });

        exBody.querySelector("#oa-ex-reset").addEventListener("click", function () {
          exDrafts[ex.id] = ex.yaml;
          exSrc.value = ex.yaml;
        });
      }

      exTabs.addEventListener("click", function (e) {
        var b = e.target.closest("[data-ex]"); if (!b) return;
        exIdx = parseInt(b.getAttribute("data-ex"), 10);
        renderExTabs();
        renderExercise();
      });
      renderExTabs();
      renderExercise();

      // ── contract evolution (unchanged) ──
      var evoOut = container.querySelector("#oa-evo-out");
      function evo(k) {
        var data;
        if (k === "optional") data = ["tip", "✅ Backward compatible", "Adding an optional field (e.g. <code>estimatedDelivery</code>) doesn't break existing clients — they ignore unknown fields. Contract tests still pass. Ship it in the current version."];
        else if (k === "required") data = ["warn", "⚠️ Breaking for request bodies", "Making a previously-optional <i>request</i> field required rejects older clients that omit it (422). For a <i>response</i> field it's safer, but strict clients may still assume it's always present. Treat as breaking → new version or a transition period."];
        else data = ["danger", "🧨 Breaking", "Removing a field breaks every client that reads it and fails contract tests immediately. Deprecate first (mark it, keep returning it), announce a Sunset date, then remove in the next major version."];
        evoOut.innerHTML = '<div class="callout ' + data[0] + '"><span class="callout-icon">' + data[1].slice(0, 2) + '</span><div class="callout-body"><b>' + data[1].slice(2) + ".</b> " + data[2] + "</div></div>" +
          '<div class="callout info" style="margin-top:var(--space-2)"><span class="callout-icon">🧪</span><div class="callout-body"><b>Contract tests</b> are what catch this in CI: they replay the spec against the running API, so a breaking change fails the build instead of a customer\'s app.</div></div>';
      }
      container.querySelector("#oa-evo").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        container.querySelectorAll("#oa-evo .chip").forEach(function (x) { x.classList.toggle("active", x === b); });
        evo(b.getAttribute("data-k"));
      });
      evo("optional");
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }

  AV.registerModule(module);
})();
