/* ============================================================
   concept-module.js — the reusable teaching factory (Iteration 4)
   Turns a declarative config into a full, consistent concept page:
   header · mental image · idx-driven animated flow · Beginner/
   Intermediate/Proficient level tabs · Why→What→How · micro-concepts
   · Before/After · failure scenario · When NOT to use · RetailFlow
   mini-story · code examples · memory anchor · retention check.

   Usage:
     DECICDViz.registerModule(DECICDViz.Concept.build({ ...config }));

   Every field is optional; a section renders only when its field is
   present, so small concepts stay lean and big ones stay complete.
   The router appends the RetailFlow lens below automatically.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d.firstElementChild;
  }

  // ── Flow diagram (a horizontal/wrapping chain of labelled nodes) ──
  // Rendered idx-driven: given active count n, nodes[0..n-1] are "on".
  function flowHTML(nodes, activeCount) {
    return nodes.map(function (label, i) {
      var on = i < activeCount;
      var arrow = i > 0 ? '<span class="cm-flow-arrow' + (on ? " on" : "") + '">→</span>' : "";
      return arrow + '<span class="cm-flow-node' + (on ? " on" : "") + '">' + esc(label) + "</span>";
    }).join("");
  }

  function section(title, lead, bodyEl) {
    var s = document.createElement("section");
    s.className = "section cm-section";
    var h = "";
    if (title) h += '<h2 class="section-title">' + esc(title) + "</h2>";
    if (lead) h += '<p class="section-lead">' + lead + "</p>";
    s.innerHTML = h;
    if (bodyEl) s.appendChild(bodyEl);
    return s;
  }

  function build(cfg) {
    var mod = {
      id: cfg.id,
      title: cfg.title,
      _engine: null,
      _controls: null,
      _offs: [],

      render: function (container) {
        var self = this;
        var accent = cfg.tool ? "var(" + cfg.tool + ")" : "var(--brand)";

        // ── Header ──────────────────────────────────────────
        var header = document.createElement("div");
        header.className = "module-header animate-fade-in-up";
        header.style.setProperty("--accent", accent);
        header.innerHTML =
          '<div class="module-eyebrow" style="color:' + accent + '">' +
            (cfg.icon ? esc(cfg.icon) + " " : "") + esc(cfg.eyebrow || cfg.title) + "</div>" +
          '<h1 class="module-title gradient-text">' + esc(cfg.title) + "</h1>" +
          (cfg.subtitle ? '<p class="module-subtitle">' + cfg.subtitle + "</p>" : "");
        if (cfg.mentalImage) {
          header.innerHTML +=
            '<div class="cm-mental"><span class="cm-mental-label">One mental image</span>' +
            '<span class="cm-mental-box" style="border-color:' + accent + ';color:' + accent + '">' +
            esc(cfg.mentalImage) + "</span></div>";
        }
        container.appendChild(header);

        // ── Animated flow (idx-driven) ─────────────────────
        if (cfg.flow && cfg.flow.length) {
          var flowWrap = document.createElement("section");
          flowWrap.className = "section cm-flow-section";
          flowWrap.innerHTML =
            '<h2 class="section-title">' + esc(cfg.flowTitle || "Watch it happen") + "</h2>";
          var stage = document.createElement("div");
          stage.className = "cm-flow-stage";
          flowWrap.appendChild(stage);
          container.appendChild(flowWrap);

          var nodes = cfg.flow;
          function paint(n) { stage.innerHTML = flowHTML(nodes, n); }
          paint(0);

          if (NS.AnimationEngine && NS.AnimationControls) {
            var steps = nodes.map(function (label) {
              return { label: label, description: label, duration: 1100 };
            });
            var engine = new NS.AnimationEngine({ steps: steps, speed: 1 });
            // idx-driven: derive whole visual from currentStep every frame.
            var off = engine.on("stepchange", function (idx) { paint(idx + 1); });
            self._offs.push(off);
            var controls = NS.AnimationControls.create(engine, { label: true });
            flowWrap.appendChild(controls.el);
            self._engine = engine;
            self._controls = controls;
          } else {
            paint(nodes.length); // no engine → show fully lit
          }
        }

        // ── Why → What → How ───────────────────────────────
        if (cfg.why || cfg.what || cfg.how) {
          var grid = document.createElement("div");
          grid.className = "card-grid cm-wwh";
          [["Why?", cfg.why, "🎯"], ["What?", cfg.what, "🧩"], ["How?", cfg.how, "⚙️"]]
            .forEach(function (t) {
              if (!t[1]) return;
              grid.appendChild(el(
                '<div class="card cm-wwh-card"><div class="cm-wwh-h">' + t[2] + " " +
                t[0] + '</div><p>' + t[1] + "</p></div>"));
            });
          container.appendChild(section("Why it exists", null, grid));
        }

        // ── Level tabs (Beginner / Intermediate / Proficient) ─
        if (cfg.levels) {
          var order = ["beginner", "intermediate", "proficient"];
          var labels = { beginner: "Beginner", intermediate: "Intermediate", proficient: "Proficient" };
          var present = order.filter(function (k) { return cfg.levels[k]; });
          var tabsWrap = document.createElement("section");
          tabsWrap.className = "section cm-levels";
          tabsWrap.innerHTML = '<h2 class="section-title">Learn it at your level</h2>';
          var tabbar = document.createElement("div");
          tabbar.className = "cm-level-tabs";
          tabbar.setAttribute("role", "tablist");
          var panel = document.createElement("div");
          panel.className = "cm-level-panel";

          function renderLevel(key) {
            var blocks = cfg.levels[key] || [];
            panel.innerHTML = blocks.map(function (b) {
              if (typeof b === "string") return "<p>" + b + "</p>";
              return (b.h ? '<h3 class="cm-level-h">' + esc(b.h) + "</h3>" : "") +
                (b.body ? '<div class="cm-level-body">' + b.body + "</div>" : "");
            }).join("");
          }
          present.forEach(function (key, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "cm-level-tab" + (i === 0 ? " active" : "");
            b.textContent = labels[key];
            b.setAttribute("role", "tab");
            b.addEventListener("click", function () {
              tabbar.querySelectorAll(".cm-level-tab").forEach(function (x) { x.classList.remove("active"); });
              b.classList.add("active");
              renderLevel(key);
            });
            tabbar.appendChild(b);
          });
          renderLevel(present[0]);
          tabsWrap.appendChild(tabbar);
          tabsWrap.appendChild(panel);
          container.appendChild(tabsWrap);
        }

        // ── Micro-concepts ─────────────────────────────────
        if (cfg.micro && cfg.micro.length) {
          var chips = document.createElement("div");
          chips.className = "cm-chips";
          chips.innerHTML = cfg.micro.map(function (m) {
            var name = typeof m === "string" ? m : m.name;
            var tip = typeof m === "string" ? "" : (m.tip || "");
            return '<span class="cm-chip"' + (tip ? ' title="' + esc(tip) + '"' : "") +
              ">" + esc(name) + "</span>";
          }).join("");
          container.appendChild(section("The pieces inside", cfg.microLead ||
            "Every one of these is worth being able to name and explain.", chips));
        }

        // ── Before / After ─────────────────────────────────
        if (cfg.before || cfg.after) {
          var ba = document.createElement("div");
          ba.className = "cm-ba";
          function col(kind, title, items) {
            return '<div class="cm-ba-col cm-ba-' + kind + '"><div class="cm-ba-title">' +
              title + "</div>" + (items || []).map(function (x, i) {
                return '<div class="cm-ba-step">' + (i ? '<span class="cm-ba-down">↓</span>' : "") +
                  "<span>" + esc(x) + "</span></div>";
              }).join("") + "</div>";
          }
          ba.innerHTML = col("before", "❌ Before", cfg.before) + col("after", "✅ After", cfg.after);
          container.appendChild(section("Before vs After", null, ba));
        }

        // ── Failure scenario ───────────────────────────────
        if (cfg.failure) {
          var f = cfg.failure;
          var fs = document.createElement("div");
          fs.className = "cm-failure";
          fs.innerHTML =
            (f.title ? '<div class="cm-failure-title">💥 ' + esc(f.title) + "</div>" : "") +
            '<div class="cm-flow-stage cm-failure-flow">' + flowHTML(f.steps || [], (f.steps || []).length) + "</div>" +
            (f.explain ? '<div class="callout tip"><span class="callout-icon">🛡️</span><div class="callout-body">' +
              f.explain + "</div></div>" : "");
          container.appendChild(section("What breaks — and why the pipeline catches it", null, fs));
        }

        // ── When NOT to use ────────────────────────────────
        if (cfg.whenNot) {
          var wn = el('<div class="callout warn cm-whennot"><span class="callout-icon">🚫</span>' +
            '<div class="callout-body">' + cfg.whenNot + "</div></div>");
          container.appendChild(section("When NOT to use it", null, wn));
        }

        // ── RetailFlow mini-story ──────────────────────────
        if (cfg.story) {
          var st = cfg.story;
          var rows = [
            ["Situation", st.situation], ["Problem", st.problem], ["Decision", st.decision],
            ["Tool", st.tool], ["Result", st.result]
          ].filter(function (r) { return r[1]; }).map(function (r) {
            return '<div class="cm-story-row"><span class="cm-story-k">' + r[0] +
              '</span><span class="cm-story-v">' + r[1] + "</span></div>";
          }).join("");
          var story = el('<div class="cm-story">' + rows +
            (st.remember ? '<div class="cm-story-remember">🧠 <b>Remember:</b> ' + st.remember + "</div>" : "") +
            "</div>");
          container.appendChild(section("RetailFlow mini-story", null, story));
        }

        // ── Code / configuration examples ──────────────────
        if (cfg.code && cfg.code.length && NS.CodeViewer) {
          var codeWrap = document.createElement("div");
          codeWrap.className = "cm-code-list";
          cfg.code.forEach(function (c) { codeWrap.appendChild(NS.CodeViewer.create(c)); });
          container.appendChild(section("What it looks like in the repo", null, codeWrap));
        }

        // ── Memory anchor ──────────────────────────────────
        if (cfg.remember) {
          container.appendChild(el(
            '<div class="cm-anchor"><span class="cm-anchor-badge">Remember this</span>' +
            '<p class="cm-anchor-text">' + cfg.remember + "</p></div>"));
        }

        // ── Retention check (retrieval, not recognition) ───
        if (cfg.retention) {
          var r = cfg.retention;
          var wrap = el('<div class="cm-retention"><div class="cm-retention-q">🧪 ' +
            esc(r.question) + '</div><button type="button" class="btn btn-secondary cm-retention-btn">Reveal answer</button>' +
            '<div class="cm-retention-a" hidden>' + r.answer + "</div></div>");
          var btn = wrap.querySelector(".cm-retention-btn");
          var ans = wrap.querySelector(".cm-retention-a");
          btn.addEventListener("click", function () {
            ans.hidden = !ans.hidden;
            btn.textContent = ans.hidden ? "Reveal answer" : "Hide answer";
          });
          container.appendChild(section("Can you explain it?", null, wrap));
        }
      },

      destroy: function () {
        this._offs.forEach(function (off) { try { off && off(); } catch (e) {} });
        this._offs = [];
        if (this._controls && this._controls.destroy) { try { this._controls.destroy(); } catch (e) {} }
        if (this._engine && this._engine.reset) { try { this._engine.reset(); } catch (e) {} }
        this._engine = null; this._controls = null;
      }
    };
    return mod;
  }

  NS.Concept = { build: build };
})();
