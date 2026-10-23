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

  // Resolve a module id to its route title (for prerequisite/related links).
  function routeTitle(id) {
    var r = (NS.routes || {})[id];
    return (r && r.title) || id.replace(/-/g, " ");
  }
  function linkChips(items, cls) {
    return '<div class="cm-links ' + (cls || "") + '">' + items.map(function (it) {
      var id = typeof it === "string" ? it : it.id;
      var label = (typeof it === "string" ? null : it.label) || routeTitle(id);
      return '<a class="cm-link-chip" href="#' + esc(id) + '">' + esc(label) + "</a>";
    }).join("") + "</div>";
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

        // ── Learning actions (bookmark / revise / complete) ─
        if (NS.ModuleActions) {
          NS.ModuleActions.mount(container, { id: cfg.id, title: cfg.title, route: cfg.id });
        }

        // ── Lesson info panel (objectives · prereqs · sources) ─
        // Additive: renders only when curriculum metadata exists for
        // this lesson. Single source of truth = DECICDViz.Curriculum.
        var hasLessonInfo = false;
        if (NS.Lesson && NS.Lesson.ready(cfg.id)) {
          var info = NS.Lesson.infoPanel(cfg.id);
          if (info) { container.appendChild(info); hasLessonInfo = true; }
        }

        // ── Prerequisites (learn these first) ──────────────
        // Skip when the lesson info panel already lists prerequisites,
        // so they are never shown twice.
        if (!hasLessonInfo && cfg.prerequisites && cfg.prerequisites.length) {
          var pre = document.createElement("div");
          pre.innerHTML =
            '<p class="section-lead">Comfortable with these first makes this topic click faster.</p>' +
            linkChips(cfg.prerequisites, "cm-prereqs");
          container.appendChild(section("Before this, know", null, pre));
        }

        // ── (1) The problem before the technology existed ──
        if (cfg.problem) {
          var p = cfg.problem;
          var ph = '<div class="cm-problem">';
          if (p.before) ph += '<div class="cm-problem-block"><h3 class="cm-sub-h">How teams did it before</h3><p>' + p.before + "</p></div>";
          if (p.insufficient) ph += '<div class="cm-problem-block"><h3 class="cm-sub-h">Why that stopped being enough</h3><p>' + p.insufficient + "</p></div>";
          if (p.failureModes && p.failureModes.length)
            ph += '<div class="cm-problem-block"><h3 class="cm-sub-h">The failure modes that forced a change</h3><ul class="cm-ul">' +
              p.failureModes.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
          ph += "</div>";
          container.appendChild(section("The problem this solves", cfg.problemLead || null, el(ph)));
        }

        // ── (2) Intuitive explanation (+ honest analogy) ───
        if (cfg.intuition) {
          var iu = cfg.intuition;
          var ih = '<div class="cm-intuition">' + (iu.plain ? "<p>" + iu.plain + "</p>" : "");
          if (iu.analogy) {
            ih += '<div class="cm-analogy"><div class="cm-analogy-h">🔍 An analogy</div><p>' + iu.analogy + "</p>" +
              (iu.breaks ? '<p class="cm-analogy-breaks"><b>Where the analogy breaks:</b> ' + iu.breaks + "</p>" : "") + "</div>";
          }
          ih += "</div>";
          container.appendChild(section("The idea in plain English", null, el(ih)));
        }

        // ── (3) Formal definition + distinctions ───────────
        if (cfg.definition) {
          var df = cfg.definition;
          var dh = '<div class="cm-def">' + (df.formal ? '<p class="cm-def-formal">' + df.formal + "</p>" : "");
          if (df.distinguish && df.distinguish.length) {
            dh += '<div class="cm-def-dist"><div class="cm-sub-h">Don’t confuse it with</div>' +
              df.distinguish.map(function (d) {
                return '<div class="cm-def-dist-row"><b>' + esc(d.from) + "</b> — " + d.note + "</div>";
              }).join("") + "</div>";
          }
          dh += "</div>";
          container.appendChild(section("A precise definition", null, el(dh)));
        }

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

        // ── (4) Internal mechanics ─────────────────────────
        if (cfg.mechanics && cfg.mechanics.length) {
          var mh = '<div class="cm-mech">' + cfg.mechanics.map(function (m) {
            return '<div class="cm-mech-block"><h3 class="cm-sub-h">' + esc(m.h) + "</h3><div class=\"cm-mech-body\">" + m.body + "</div></div>";
          }).join("") + "</div>";
          container.appendChild(section("How it actually works", cfg.mechanicsLead || null, el(mh)));
        }

        // ── (5) Interactive architecture (click a component) ─
        if (cfg.architecture && cfg.architecture.components && cfg.architecture.components.length) {
          var arch = cfg.architecture;
          var archWrap = document.createElement("section");
          archWrap.className = "section cm-arch-section";
          archWrap.innerHTML = '<h2 class="section-title">' + esc(arch.title || "Architecture") + "</h2>" +
            (arch.lead ? '<p class="section-lead">' + arch.lead + "</p>" : "");
          var map = document.createElement("div");
          map.className = "cm-arch-map";
          map.innerHTML = arch.components.map(function (c, i) {
            return '<button type="button" class="cm-arch-node" data-i="' + i + '"' + (i === 0 ? ' aria-pressed="true"' : "") + ">" +
              '<span class="cm-arch-node-name">' + esc(c.name) + "</span>" +
              (c.kind ? '<span class="cm-arch-node-kind">' + esc(c.kind) + "</span>" : "") + "</button>" +
              (i < arch.components.length - 1 ? '<span class="cm-arch-join" aria-hidden="true">→</span>' : "");
          }).join("");
          var detail = document.createElement("div");
          detail.className = "cm-arch-detail";
          function paintArch(i) {
            var c = arch.components[i];
            if (!c) return;
            detail.innerHTML =
              '<div class="cm-arch-detail-name">' + esc(c.name) + "</div>" +
              (c.role ? '<p class="cm-arch-detail-role">' + c.role + "</p>" : "") +
              (c.config ? '<div class="cm-arch-kv"><span class="cm-arch-k">Config</span><span>' + c.config + "</span></div>" : "") +
              (c.failures ? '<div class="cm-arch-kv cm-arch-fail"><span class="cm-arch-k">Common failures</span><span>' + c.failures + "</span></div>" : "") +
              (c.connects ? '<div class="cm-arch-kv"><span class="cm-arch-k">Connects to</span><span>' + esc(c.connects) + "</span></div>" : "");
            map.querySelectorAll(".cm-arch-node").forEach(function (b) {
              b.setAttribute("aria-pressed", b.getAttribute("data-i") === String(i) ? "true" : "false");
            });
          }
          map.addEventListener("click", function (e) {
            var b = e.target.closest(".cm-arch-node");
            if (b) paintArch(+b.getAttribute("data-i"));
          });
          archWrap.appendChild(map);
          archWrap.appendChild(detail);
          container.appendChild(archWrap);
          paintArch(0);
        }

        // ── (6) Step-by-step execution trace ───────────────
        if (cfg.trace && cfg.trace.length) {
          var th = '<ol class="cm-trace">' + cfg.trace.map(function (t) {
            return '<li class="cm-trace-step">' +
              (t.state ? '<span class="cm-trace-state cm-ts-' + esc(t.state) + '">' + esc(t.state) + "</span>" : "") +
              '<div class="cm-trace-body"><div class="cm-trace-t">' + esc(t.t) + "</div>" +
              (t.detail ? '<div class="cm-trace-d">' + t.detail + "</div>" : "") + "</div></li>";
          }).join("") + "</ol>";
          container.appendChild(section("Execution trace: start to finish", cfg.traceLead ||
            "Follow one real run through the system, state by state.", el(th)));
        }

        // ── (7) Annotated code / configuration ─────────────
        if (cfg.annotated && cfg.annotated.length && NS.CodeViewer) {
          var annWrap = document.createElement("div");
          annWrap.className = "cm-ann-list";
          cfg.annotated.forEach(function (a) {
            var block = document.createElement("div");
            block.className = "cm-ann";
            block.appendChild(NS.CodeViewer.create({ title: a.title, lang: a.lang, code: a.code, highlights: a.highlights }));
            if (a.notes && a.notes.length) {
              var notes = document.createElement("div");
              notes.className = "cm-ann-notes";
              notes.innerHTML = a.notes.map(function (n) {
                return '<div class="cm-ann-note">' +
                  (n.on ? '<code class="cm-ann-on">' + esc(n.on) + "</code>" : "") +
                  '<div class="cm-ann-note-body">' +
                    (n.what ? '<div class="cm-ann-what">' + n.what + "</div>" : "") +
                    (n.why ? '<div class="cm-ann-why"><b>Why:</b> ' + n.why + "</div>" : "") +
                    (n.ifRemoved ? '<div class="cm-ann-rm"><b>If removed:</b> ' + n.ifRemoved + "</div>" : "") +
                  "</div></div>";
              }).join("");
              block.appendChild(notes);
            }
            annWrap.appendChild(block);
          });
          container.appendChild(section("Annotated, line by line", cfg.annotatedLead ||
            "A complete, consistent example — each important line explained.", annWrap));
        }

        // ── (8) Input → output walkthrough ─────────────────
        if (cfg.io && cfg.io.length) {
          var ioh = '<div class="cm-io">' + cfg.io.map(function (x) {
            return '<div class="cm-io-row">' +
              '<div class="cm-io-given"><span class="cm-io-label">Given</span>' + x.given + "</div>" +
              '<span class="cm-io-arrow" aria-hidden="true">→</span>' +
              '<div class="cm-io-prod"><span class="cm-io-label">Produces</span>' + x.produces + "</div>" +
              (x.note ? '<div class="cm-io-note">' + x.note + "</div>" : "") +
            "</div>";
          }).join("") + "</div>";
          var ioSec = section("Concrete inputs and outputs", cfg.ioLead || null, el(ioh));
          if (cfg.ioIllustrative !== false)
            ioSec.appendChild(el('<p class="cm-illustrative">These are illustrative examples, not the output of a live run.</p>'));
          container.appendChild(ioSec);
        }

        // ── Interactive widgets (learner-controlled state) ──
        if (cfg.interactive && cfg.interactive.length) {
          cfg.interactive.forEach(function (w) {
            var sec = document.createElement("section");
            sec.className = "section cm-interactive";
            sec.innerHTML = '<h2 class="section-title">' + esc(w.title || "Try it") + "</h2>" +
              (w.lead ? '<p class="section-lead">' + w.lead + "</p>" : "");
            var mount = document.createElement("div");
            sec.appendChild(mount);
            container.appendChild(sec);
            try { if (typeof w.mount === "function") w.mount(mount); } catch (e) { /* widget error must not break the page */ }
          });
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

        // ── (9) Comparison tables ──────────────────────────
        if (cfg.comparisons && cfg.comparisons.length) {
          var cmpWrap = document.createElement("div");
          cmpWrap.className = "cm-cmp-list";
          cmpWrap.innerHTML = cfg.comparisons.map(function (cmp) {
            return '<div class="cm-cmp">' +
              (cmp.title ? '<div class="cm-cmp-title">' + esc(cmp.title) + "</div>" : "") +
              '<table class="cm-cmp-table"><thead><tr><th></th><th>' + esc(cmp.aLabel || "A") +
                "</th><th>" + esc(cmp.bLabel || "B") + "</th></tr></thead><tbody>" +
              (cmp.rows || []).map(function (r) {
                return "<tr><th>" + esc(r.dim) + "</th><td>" + r.a + "</td><td>" + r.b + "</td></tr>";
              }).join("") + "</tbody></table>" +
              (cmp.verdict ? '<div class="cm-cmp-verdict">' + cmp.verdict + "</div>" : "") +
            "</div>";
          }).join("");
          container.appendChild(section("Compare the alternatives", cfg.comparisonsLead ||
            "Choosing the wrong one has real consequences — here is how they differ.", cmpWrap));
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

        // ── (12) Trade-offs & limitations ──────────────────
        if (cfg.tradeoffs && cfg.tradeoffs.length) {
          var toh = '<div class="cm-tradeoffs">' + cfg.tradeoffs.map(function (t) {
            return '<div class="cm-tradeoff cm-tradeoff-' + esc(t.kind || "note") + '">' +
              '<div class="cm-tradeoff-h">' + esc(t.h) + "</div><div>" + t.body + "</div></div>";
          }).join("") + "</div>";
          container.appendChild(section("Trade-offs, cost, and when it is overkill", cfg.tradeoffsLead || null, el(toh)));
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

        // ── (10) Real production example (documented vs illustrative) ─
        if (cfg.realWorld && cfg.realWorld.length) {
          var E2 = NS.Evidence;
          var rwh = '<div class="cm-rw">' + cfg.realWorld.map(function (r) {
            var badge = (E2 && E2.ready && E2.ready() && r.tier) ? E2.badge(r.tier) : "";
            var cite = (E2 && E2.ready && E2.ready() && r.sources) ? E2.cite(r.sources) : "";
            return '<div class="cm-rw-item">' + (badge ? '<div class="cm-rw-badge">' + badge + "</div>" : "") +
              '<div class="cm-rw-text">' + r.text + (cite ? " " + cite : "") + "</div></div>";
          }).join("") + "</div>";
          var rwSec = section("How it looks in a real company", cfg.realWorldLead ||
            "Documented company practice is labelled and cited; anything illustrative is marked as such.", el(rwh));
          container.appendChild(rwSec);
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

        // ── Production considerations ──────────────────────
        if (cfg.production && cfg.production.length) {
          var prod = document.createElement("div");
          prod.className = "cm-prod";
          prod.innerHTML = cfg.production.map(function (p) {
            var head = typeof p === "string" ? "" : p.h;
            var body = typeof p === "string" ? p : p.body;
            return '<div class="cm-prod-item">' +
              (head ? '<span class="cm-prod-h">' + esc(head) + "</span>" : "") +
              '<span class="cm-prod-b">' + body + "</span></div>";
          }).join("");
          container.appendChild(section("In production, watch", null, prod));
        }

        // ── Common misconceptions ──────────────────────────
        if (cfg.misconceptions && cfg.misconceptions.length) {
          var mis = document.createElement("div");
          mis.className = "cm-mis";
          mis.innerHTML = cfg.misconceptions.map(function (m) {
            return '<div class="cm-mis-item">' +
              '<div class="cm-mis-myth"><span class="cm-mis-tag myth">Myth</span>' + m.myth + "</div>" +
              '<div class="cm-mis-truth"><span class="cm-mis-tag truth">Reality</span>' + m.truth + "</div>" +
            "</div>";
          }).join("");
          container.appendChild(section("Common misconceptions", null, mis));
        }

        // ── Troubleshooting ────────────────────────────────
        if (cfg.troubleshooting && cfg.troubleshooting.length) {
          var tr = document.createElement("div");
          tr.className = "cm-trouble";
          tr.innerHTML =
            '<div class="cm-trouble-head"><span>Symptom</span><span>Likely cause</span><span>Fix</span></div>' +
            cfg.troubleshooting.map(function (t) {
              return '<div class="cm-trouble-row">' +
                '<span class="cm-trouble-sym">' + t.symptom + "</span>" +
                '<span>' + t.cause + "</span>" +
                '<span>' + t.fix + "</span></div>";
            }).join("");
          container.appendChild(section("Troubleshooting", "Symptom → likely cause → how to fix and verify.", tr));
        }

        // ── (11) Failure modes & troubleshooting (structured) ─
        if (cfg.failures && cfg.failures.length) {
          var fl = document.createElement("div");
          fl.className = "cm-failures";
          fl.innerHTML = cfg.failures.map(function (f, i) {
            return '<div class="cm-fm">' +
              '<div class="cm-fm-sym"><span class="cm-fm-n">#' + (i + 1) + "</span>" +
                '<span class="cm-fm-sym-t">' + f.symptom + "</span></div>" +
              (f.evidence ? '<div class="cm-fm-row"><span class="cm-fm-k">Evidence</span><span>' + f.evidence + "</span></div>" : "") +
              '<details class="cm-fm-reveal"><summary>Reveal root cause, fix &amp; prevention</summary>' +
                (f.rootCause ? '<div class="cm-fm-row"><span class="cm-fm-k">Root cause</span><span>' + f.rootCause + "</span></div>" : "") +
                (f.investigation && f.investigation.length ? '<div class="cm-fm-row"><span class="cm-fm-k">Investigate</span><ol class="cm-fm-inv">' +
                  f.investigation.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol></div>" : "") +
                (f.correction ? '<div class="cm-fm-row"><span class="cm-fm-k">Correction</span><span>' + f.correction + "</span></div>" : "") +
                (f.verification ? '<div class="cm-fm-row"><span class="cm-fm-k">Verify</span><span>' + f.verification + "</span></div>" : "") +
                (f.prevention ? '<div class="cm-fm-row"><span class="cm-fm-k">Prevent</span><span>' + f.prevention + "</span></div>" : "") +
              "</details>" +
            "</div>";
          }).join("");
          container.appendChild(section("Failure modes & troubleshooting", cfg.failuresLead ||
            "Think it through before you reveal the cause.", fl));
        }

        // ── (14) Knowledge checks (multiple cognitive levels) ─
        if (cfg.knowledgeChecks && cfg.knowledgeChecks.length) {
          var kcWrap = document.createElement("section");
          kcWrap.className = "section cm-kc";
          kcWrap.innerHTML = '<h2 class="section-title">Knowledge checks</h2>' +
            '<p class="section-lead">Recall, explain, predict, apply, troubleshoot, decide — answer, then read the feedback.</p>';
          cfg.knowledgeChecks.forEach(function (q) {
            var box = document.createElement("div");
            box.className = "cm-kc-q";
            box.innerHTML =
              (q.level ? '<span class="cm-kc-level">' + esc(q.level) + "</span>" : "") +
              '<div class="cm-kc-text">' + esc(q.q) + "</div>" +
              '<div class="cm-kc-opts">' + q.options.map(function (o, oi) {
                return '<button type="button" class="cm-kc-opt" data-o="' + oi + '">' + esc(o.label) + "</button>";
              }).join("") + "</div>" +
              '<div class="cm-kc-fb" hidden></div>';
            kcWrap.appendChild(box);
            box.addEventListener("click", function (e) {
              var b = e.target.closest(".cm-kc-opt");
              if (!b) return;
              var o = q.options[+b.getAttribute("data-o")];
              box.querySelectorAll(".cm-kc-opt").forEach(function (x) { x.classList.remove("ok", "no", "sel"); });
              b.classList.add(o.ok ? "ok" : "no", "sel");
              var fb = box.querySelector(".cm-kc-fb");
              fb.hidden = false;
              fb.className = "cm-kc-fb " + (o.ok ? "good" : "bad");
              fb.innerHTML = (o.ok ? "✅ Correct. " : "❌ Not quite. ") + esc(o.why || "") +
                (!o.ok && q.revisit ? ' <a class="cm-kc-revisit" href="#' + esc(q.revisit) + '">Revisit the relevant topic →</a>' : "");
              // Competency evidence + spaced review (first answer per question only).
              if (!box._answered && NS.Progress) {
                box._answered = true;
                try {
                  NS.Progress.recordKnowledgeCheck(cfg.id, o.ok);
                  if (!o.ok) NS.Progress.scheduleReview(q.revisit || cfg.id, false);
                } catch (e2) {}
              }
            });
          });
          container.appendChild(kcWrap);
        }

        // ── (15) Independent mastery challenge ─────────────
        if (cfg.mastery) {
          var ms = cfg.mastery;
          var msh = '<div class="cm-mastery"><div class="cm-mastery-badge">🎓 Mastery challenge</div>' +
            '<div class="cm-mastery-task">' + ms.task + "</div>" +
            (ms.acceptance && ms.acceptance.length ? '<div class="cm-mastery-acc-h">Acceptance criteria</div>' +
              '<ul class="cm-mastery-acc">' + ms.acceptance.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>" : "") +
            (ms.hint ? '<details class="cm-mastery-hint"><summary>Need a nudge?</summary><div>' + ms.hint + "</div></details>" : "") +
          "</div>";
          container.appendChild(section("Prove you can apply it", null, el(msh)));
        }

        // ── Topic interview questions ──────────────────────
        if (cfg.interview && cfg.interview.length) {
          var iv = document.createElement("div");
          iv.className = "cm-iv";
          iv.innerHTML = cfg.interview.map(function (q) {
            return '<details class="cm-iv-item"><summary class="cm-iv-q">' + esc(q.q) + "</summary>" +
              '<div class="cm-iv-a">' + q.a + "</div></details>";
          }).join("");
          var ivWrap = section("Interview check", "Can you answer these out loud? Reveal to compare.", iv);
          var full = el('<p class="cm-iv-more">More across the stack in the ' +
            '<a href="#interview">Interview bank</a> and <a href="#quiz">Quiz</a>.</p>');
          ivWrap.appendChild(full);
          container.appendChild(ivWrap);
        }

        // ── (17) Further reading (integrated, with why) ────
        if (cfg.furtherReading && cfg.furtherReading.length) {
          var frh = '<ul class="cm-fr-list">' + cfg.furtherReading.map(function (r) {
            return '<li class="cm-fr">' +
              '<a class="cm-fr-link" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + "</a>" +
              (r.publisher ? '<span class="cm-fr-pub"> · ' + esc(r.publisher) + "</span>" : "") +
              (r.why ? '<div class="cm-fr-why">' + r.why + "</div>" : "") +
              (r.read ? '<div class="cm-fr-read"><b>Read:</b> ' + esc(r.read) + "</div>" : "") +
              (r.reviewed ? '<div class="cm-fr-rev">Last reviewed ' + esc(r.reviewed) + "</div>" : "") +
            "</li>";
          }).join("") + "</ul>";
          container.appendChild(section("Further reading", cfg.furtherReadingLead ||
            "Authoritative sources, with why each is worth your time.", el(frh)));
        }

        // ── Related topics ─────────────────────────────────
        if (cfg.related && cfg.related.length) {
          container.appendChild(section("Related topics", null, el(linkChips(cfg.related, "cm-related"))));
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
