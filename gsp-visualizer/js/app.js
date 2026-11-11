/* ============================================================
   GSP Visualizer — app shell, router, and all module renderers.
   Depends on js/data/model.js (window.GSP.*).
   Vanilla JS, no build step — runs from GitHub Pages.
   ============================================================ */
(function () {
  "use strict";
  var GSP = (window.GSP = window.GSP || {});

  /* ── state ──────────────────────────────────────────────────── */
  var state = {
    cloud: localStorage.getItem("gsp-cloud") || "azure",
    theme: localStorage.getItem("gsp-theme") || "dark"
  };

  /* ── helpers ────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // resolve a {shared|azure|aws} field to the active cloud
  function pick(obj) {
    if (obj == null) return null;
    if (obj.shared != null) return obj.shared;
    return obj[state.cloud];
  }
  function compName(c) { return pick(c.name); }
  function compFeatures(c) { return pick(c.features) || []; }
  function byId(id) { for (var i = 0; i < GSP.components.length; i++) if (GSP.components[i].id === id) return GSP.components[i]; return null; }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  /* ── navigation structure (drives sidebar + router) ─────────── */
  var NAV = [
    { label: "Start here", items: [
      ["home", "🏠", "Overview"],
      ["architecture", "🗺️", "Architecture"],
      ["pipeline", "🔄", "End-to-end flow"]
    ]},
    { label: "Deep dives", items: [
      ["components", "🧩", "Components"],
      ["interfaces", "📨", "Inbound interfaces"],
      ["layers", "🪙", "Medallion layers"],
      ["cloudmap", "⚖️", "As-built ⇄ cloud"]
    ]},
    { label: "The hard parts", items: [
      ["cases", "🧠", "Business cases"],
      ["recovery", "🛟", "Failure & recovery"]
    ]},
    { label: "Prep", items: [
      ["interview", "💬", "Interview Q&A"],
      ["quiz", "✅", "Quiz"],
      ["glossary", "📖", "Glossary"]
    ]}
  ];

  /* ============================================================
     MODULE: home
     ============================================================ */
  function mHome(root) {
    var cards = NAV.reduce(function (acc, g) { return acc.concat(g.items); }, [])
      .filter(function (it) { return it[0] !== "home"; });
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Interactive project walkthrough</div>' +
        '<h1 class="m-title">Global Supply Planning — <span class="grad">Data Platform</span></h1>' +
        '<p class="m-sub">An end-to-end supply-chain data integration & planning platform — <strong>delivered on SQL Server + SSIS</strong>, integrating with <strong>o9 Solutions</strong> over SFTP / mPower. It ingests demand, inventory, ASN, purchase & stock-transfer feeds, transforms them into planning-ready datasets, runs the Solver, and serves reporting. Every stage also shows its <strong>Azure</strong> and <strong>AWS</strong> re-platform equivalent — flip the cloud toggle.</p>' +
      '</div>' +
      '<div class="kpi-row">' +
        '<div class="kpi accent"><div class="num">9</div><div class="lbl">Core components</div></div>' +
        '<div class="kpi"><div class="num">17</div><div class="lbl">Inbound interfaces</div></div>' +
        '<div class="kpi good"><div class="num">~3,800</div><div class="lbl">SQL tables (In_/Stg_/Out_…)</div></div>' +
        '<div class="kpi warn"><div class="num">5</div><div class="lbl">Hard business cases</div></div>' +
      '</div>' +
      '<div class="section-title">Explore the lab</div>' +
      '<div class="hero-grid">' +
        cards.map(function (it) {
          return '<div class="card hero-card" data-go="' + it[0] + '">' +
            '<div class="hc-ico">' + it[1] + '</div>' +
            '<h3>' + esc(it[2]) + '</h3>' +
            '<p>' + esc(homeBlurb(it[0])) + '</p></div>';
        }).join("") +
      '</div>' +
      '<div class="callout info rise" style="margin-top:26px"><span class="ic">🎙️</span><div><strong>Interview positioning.</strong> The <em>As built</em> blocks are the delivered SQL Server + SSIS + o9 system; the Azure/AWS columns are a re-platforming map. Speak to the stack and responsibilities you personally owned, and present the cloud mapping as design, not as shipped.</div></div>' +
      '<p class="disclaimer">Grounded in the real GSP implementation (SSIS packages, SQL table layers, o9 configuration). Live credentials, internal hostnames and client identifiers are deliberately excluded. The Azure/AWS mappings are a target design, not the delivered environment.</p>';

    root.querySelectorAll("[data-go]").forEach(function (c) {
      c.addEventListener("click", function () { location.hash = c.getAttribute("data-go"); });
    });
  }
  function homeBlurb(id) {
    return {
      architecture: "Animated, clickable end-to-end diagram. Click any box to deep-dive.",
      pipeline: "The 9 steps a batch takes, from SFTP feeds to o9 + reporting.",
      components: "Each stage: the real SSIS/SQL artifacts + the Azure/AWS equivalent.",
      interfaces: "The 17 real In_Fact_* feeds and the as-built SQL + SSIS + o9 stack.",
      layers: "In_ → Stg_ → Out_ (Bronze → Silver → Gold), plus Q_ & Control_.",
      cloudmap: "As-built (SQL Server + SSIS + o9) mapped onto Azure and AWS.",
      cases: "PULL snapshot, the 85-min batch, replenishment handshake, critical files.",
      recovery: "Monitoring metrics, the retry/recovery flow, idempotency.",
      interview: "30 Q&As across the as-built stack, orchestration, o9, failure & cloud.",
      quiz: "10 quick checks on the traps interviewers probe.",
      glossary: "Every term — SSIS, mPower, CWV, CFU, Q_ tables, Delta, and more."
    }[id] || "";
  }

  /* ============================================================
     MODULE: architecture (animated SVG)
     ============================================================ */
  function mArch(root) {
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Logical architecture · ' + cloudLabel() + '</div>' +
        '<h1 class="m-title">The <span class="grad">end-to-end</span> architecture</h1>' +
        '<p class="m-sub">The logical topology — the same shape as built on SSIS + SQL Server. Orchestration drives each stage; source files land in the In_ (Bronze) layer, transforms curate them through Stg_ (Silver) to Out_ (Gold), then the Gold datasets fan out to the operational (o9) and analytical branches. Node labels show the ' + cloudLabel() + ' re-platform equivalent; open any node for its real <em>as-built</em> artifacts.</p>' +
      '</div>' +
      '<div class="arch-wrap">' + archSVG() + '</div>' +
      '<div class="arch-legend">' +
        '<span><i style="background:var(--c-orch)"></i> Orchestration</span>' +
        '<span><i style="background:var(--c-ingest)"></i> Ingest &amp; store</span>' +
        '<span><i style="background:var(--c-proc)"></i> Transform</span>' +
        '<span><i style="background:var(--c-o9)"></i> Operational → o9</span>' +
        '<span><i style="background:var(--c-snow)"></i> Analytical → Snowflake</span>' +
        '<span><svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" stroke="var(--brand)" stroke-width="2" class="arch-flow"/></svg> Data flow</span>' +
      '</div>' +
      '<div class="section-title">Cross-cutting</div>' +
      '<div class="card"><div class="chips">' +
        GSP.crosscutting[state.cloud].map(function (x) { return '<span class="chip on" title="' + esc(x[1]) + '">' + esc(x[0]) + '</span>'; }).join("") +
      '</div><p style="color:var(--muted);font-size:13px;margin-top:12px">' + esc(GSP.crosscutting.note) + '</p></div>';

    root.querySelectorAll(".arch-node").forEach(function (n) {
      n.addEventListener("click", function () { location.hash = "components/" + n.getAttribute("data-id"); });
    });
  }
  function cloudLabel() { return state.cloud === "azure" ? "Azure" : "AWS"; }

  function archSVG() {
    // grid layout: a top orchestration band, a main L→R spine, then a fan-out.
    var W = 1024, H = 440;
    function node(x, y, w, h, c, accentVar) {
      var nm = compName(c), sub = c.tagline;
      return '<g class="arch-node" data-id="' + c.id + '">' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" ' +
          'fill="var(--bg-2)" stroke="' + accentVar + '" stroke-width="1.6"/>' +
        '<rect x="' + x + '" y="' + y + '" width="4" height="' + h + '" rx="2" fill="' + accentVar + '"/>' +
        '<text class="n-ico" x="' + (x + 15) + '" y="' + (y + 26) + '">' + c.icon + '</text>' +
        '<text class="n-name" x="' + (x + 40) + '" y="' + (y + 22) + '">' + svgClip(nm, 20) + '</text>' +
        '<text class="n-sub" x="' + (x + 15) + '" y="' + (y + 44) + '">' + svgClip(sub, 34) + '</text>' +
      '</g>';
    }
    function arrow(x1, y1, x2, y2) {
      return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="var(--brand)" stroke-width="2" class="arch-flow" marker-end="url(#ah)"/>';
    }
    var c = {}; GSP.components.forEach(function (x) { c[x.id] = x; });

    // coordinates
    var spineY = 150, nw = 150, nh = 58, gap = 18;
    var xs = [20, 20 + (nw + gap), 20 + 2 * (nw + gap), 20 + 3 * (nw + gap)]; // source, ingest, store, proc

    var svg = '<svg class="arch-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="var(--brand)"/></marker></defs>';

    // orchestration band (top, spanning)
    svg += node(20, 30, 640, nh, c.orchestration, "var(--c-orch)");
    // dashed control lines down to each spine node
    [xs[0], xs[1], xs[2], xs[3]].forEach(function (x) {
      svg += '<line x1="' + (x + nw / 2) + '" y1="88" x2="' + (x + nw / 2) + '" y2="' + spineY + '" stroke="var(--c-orch)" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.6"/>';
    });

    // spine
    svg += node(xs[0], spineY, nw, nh, c.source, "var(--c-source)");
    svg += node(xs[1], spineY, nw, nh, c.ingestion, "var(--c-ingest)");
    svg += node(xs[2], spineY, nw, nh, c.storage, "var(--c-store)");
    svg += node(xs[3], spineY, nw, nh, c.processing, "var(--c-proc)");
    svg += arrow(xs[0] + nw, spineY + nh / 2, xs[1], spineY + nh / 2);
    svg += arrow(xs[1] + nw, spineY + nh / 2, xs[2], spineY + nh / 2);
    svg += arrow(xs[2] + nw, spineY + nh / 2, xs[3], spineY + nh / 2);

    // delta + governance under processing
    svg += node(xs[2], spineY + nh + 24, nw, nh, c.delta, "var(--c-delta)");
    svg += node(xs[3], spineY + nh + 24, nw, nh, c.governance, "var(--c-gov)");
    svg += '<line x1="' + (xs[3] + nw / 2) + '" y1="' + (spineY + nh) + '" x2="' + (xs[3] + nw / 2) + '" y2="' + (spineY + nh + 24) + '" stroke="var(--c-gov)" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.6"/>';
    svg += '<line x1="' + (xs[2] + nw / 2) + '" y1="' + (spineY + nh) + '" x2="' + (xs[2] + nw / 2) + '" y2="' + (spineY + nh + 24) + '" stroke="var(--c-delta)" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.6"/>';

    // fan-out: gold → o9 (up) and snowflake (down)
    var fx = xs[3] + nw + 34;
    var o9x = fx + 86, o9y = spineY - 54, snx = fx + 86, sny = spineY + 58;
    // "Gold / route" junction
    svg += '<circle cx="' + fx + '" cy="' + (spineY + nh / 2) + '" r="5" fill="var(--brand)"/>';
    svg += '<text x="' + (fx - 8) + '" y="' + (spineY + nh / 2 + 24) + '" class="n-sub" text-anchor="middle">Gold</text>';
    svg += arrow(xs[3] + nw, spineY + nh / 2, fx - 5, spineY + nh / 2);
    svg += node(o9x, o9y, nw, nh, c.o9, "var(--c-o9)");
    svg += node(snx, sny, nw, nh, c.snowflake, "var(--c-snow)");
    svg += '<path d="M' + fx + ' ' + (spineY + nh / 2) + ' C ' + (fx + 50) + ' ' + (spineY + nh / 2) + ', ' + (o9x - 40) + ' ' + (o9y + nh / 2) + ', ' + o9x + ' ' + (o9y + nh / 2) + '" fill="none" stroke="var(--c-o9)" stroke-width="2" class="arch-flow" marker-end="url(#ah)"/>';
    svg += '<path d="M' + fx + ' ' + (spineY + nh / 2) + ' C ' + (fx + 50) + ' ' + (spineY + nh / 2) + ', ' + (snx - 40) + ' ' + (sny + nh / 2) + ', ' + snx + ' ' + (sny + nh / 2) + '" fill="none" stroke="var(--c-snow)" stroke-width="2" class="arch-flow" marker-end="url(#ah)"/>';

    // branch labels
    svg += '<text x="' + (o9x + nw / 2) + '" y="' + (o9y - 8) + '" class="n-sub" text-anchor="middle" style="fill:var(--c-o9);font-weight:800">OPERATIONAL BRANCH</text>';
    svg += '<text x="' + (snx + nw / 2) + '" y="' + (sny + nh + 16) + '" class="n-sub" text-anchor="middle" style="fill:var(--c-snow);font-weight:800">ANALYTICAL BRANCH</text>';

    svg += '</svg>';
    return svg;
  }
  function svgClip(s, n) { s = String(s); return esc(s.length > n ? s.slice(0, n - 1) + "…" : s); }

  /* ============================================================
     MODULE: pipeline (8 steps)
     ============================================================ */
  function mPipeline(root) {
    var steps = [
      ["Source data arrives", "SFTP + o9 mPower", "Feeds deliver forecasts, demand history, purchase & stock-transfer schedules, ASN and requirements. The Control_SFTP_Files ledger + In_Control_BatchFile manifest check presence, naming, completion and size — a schedule firing is not proof a file arrived."],
      ["SQL Server Agent starts the batch", "SSIS master package", "Agent fires the right master package (Master_FrequentBatch / _Daily / _Weekly / _Monthly / _Weekend), confirms no prior run is active, captures the o9 plan version (GetVersionsBeforeBatch), and carries run context (business date, batch tier)."],
      ["Ingest into staging", "SSIS Data Flow", "Reliable movement of the flat files into In_Fact_* staging tables via SSIS data flows + file-system tasks. Goal here is movement, not supply-planning calculations."],
      ["Land the In_ (Bronze) layer", "SQL Server · In_*", "Inbound rows preserved with batch metadata: feed, filename, business date, batch tier, record counts. Enables traceability and controlled reprocessing without a resend."],
      ["Transform in T-SQL + SSIS", "Stored procs · Stg_*", "Validate schema & mandatory fields → quarantine bad rows → dedup on business keys → standardize → join feeds + apply the supply-planning rules → aggregate to grain. Set-based T-SQL, not PySpark."],
      ["Publish the Out_ (Gold) layer", "SQL Server · Out_*", "Consumer-ready outputs built in Stg_ and swapped into Out_*: o9 planning interfaces, the frequent refresh, reporting. Q_ snapshots freeze a consistent set; output contract, counts and keys are validated."],
      ["Run Solver & replenishment", "o9 Solver", "SolverInput is built and the Solver runs; completion is signalled via the SolverFile flag/polling handshake; replenishment files are processed and Frequent ↔ CWV is reconciled in order."],
      ["Upload to o9 & confirm", "o9 mPower", "Critical files (CFU_) are uploaded through mPower after the Solver (CriticalFileUpload_AfterSolver); delivery is confirmed (CriticalFilesBatchEndEmail). A transfer is not success — the Solver run and plan-version advance are."],
      ["Monitor & close the run", "Control_ tables + alerts", "Record package states, durations, counts, rejects, freshness and critical-file status in the Control_ / BatchStatistics tables. A run is complete only when its success conditions are met — operational and analytical can differ."]
    ];
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Daily execution · as built</div>' +
        '<h1 class="m-title">A batch, <span class="grad">step by step</span></h1>' +
        '<p class="m-sub">What actually happens from the moment source files land to the moment the run is declared complete — on the delivered SQL Server + SSIS + o9 stack. The Components view shows each step\'s Azure/AWS equivalent.</p>' +
      '</div>' +
      '<div class="card"><div class="flow">' +
        steps.map(function (s) {
          return '<div class="flow-step"><div class="where">' + esc(s[1]) + '</div><h4>' + esc(s[0]) + '</h4><p>' + esc(s[2]) + '</p></div>';
        }).join("") +
      '</div></div>' +
      '<div class="callout rule" style="margin-top:20px"><span class="ic">⛔</span><div>The core discipline across every step: <strong>a successful task is not a successfully completed business batch.</strong> File-in-Bronze, job-submitted, and file-transferred each prove only themselves — gate downstream on real outcomes.</div></div>';
  }

  /* ============================================================
     MODULE: components (list + ?id deep dive)
     ============================================================ */
  function mComponents(root, sub) {
    if (sub) { return compDetail(root, sub); }
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Deep dives · ' + cloudLabel() + '</div>' +
        '<h1 class="m-title">Every <span class="grad">component</span></h1>' +
        '<p class="m-sub">Nine stages, each with its responsibility, the services it uses, the gotchas interviewers probe, and example code. Click a card.</p>' +
      '</div>' +
      '<div class="grid grid-2">' +
        GSP.components.map(function (c) {
          return '<div class="card accent-l hero-card" style="--accent:' + c.accent + '" data-id="' + c.id + '">' +
            '<div style="display:flex;align-items:center;gap:11px">' +
              '<div class="hc-ico">' + c.icon + '</div>' +
              '<div><h3 style="margin:0">' + esc(compName(c)) + '</h3>' +
              '<div style="font-size:12px;color:' + c.accent + ';font-weight:700">' + esc(c.tagline) + '</div></div>' +
            '</div>' +
            '<p style="color:var(--muted);font-size:13px;margin-top:11px">' + esc(trunc(c.purpose, 130)) + '</p>' +
          '</div>';
        }).join("") +
      '</div>';
    root.querySelectorAll("[data-id]").forEach(function (c) {
      c.addEventListener("click", function () { location.hash = "components/" + c.getAttribute("data-id"); });
    });
  }
  function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  // "As built" (real SSIS / SQL Server / o9) card for a component
  function asBuiltCard(c) {
    var a = c.asBuilt;
    return '<div class="card accent-l asbuilt" style="--accent:var(--brand);margin-top:16px">' +
      '<div class="asbuilt-head"><span class="chip on">AS BUILT</span><span class="asbuilt-tech">' + esc(a.tech) + '</span></div>' +
      (a.artifacts ? '<div class="dl" style="margin-top:12px">' + a.artifacts.map(function (x) {
        return "<dt><code class=\"inline\">" + esc(x[0]) + "</code></dt><dd>" + esc(x[1]) + "</dd>";
      }).join("") + "</div>" : "") +
      (a.note ? '<p style="color:var(--muted);font-size:13px;margin-top:12px">' + esc(a.note) + "</p>" : "") +
    "</div>";
  }

  function compDetail(root, id) {
    var c = byId(id);
    if (!c) { location.hash = "components"; return; }
    var feats = compFeatures(c);
    var html =
      '<div class="m-head">' +
        '<a class="home-link" href="#components">← All components</a>' +
        '<h1 class="m-title" style="margin-top:12px">' + c.icon + ' ' + esc(compName(c)) + '</h1>' +
        '<p class="m-sub">' + esc(c.tagline) + ' · <span style="color:' + c.accent + ';font-weight:700">' + (c.name.shared ? "Same on Azure & AWS" : cloudLabel()) + '</span></p>' +
      '</div>' +
      '<div class="card accent-l" style="--accent:' + c.accent + '"><p style="font-size:14.5px">' + esc(c.purpose) + '</p></div>' +
      (c.asBuilt ? asBuiltCard(c) : "") +
      '<div class="grid grid-2" style="margin-top:16px">' +
        '<div class="card"><div style="font-weight:800;margin-bottom:12px">Responsibilities</div><ul class="ticks">' +
          c.responsibilities.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + '</ul></div>' +
        '<div class="card"><div style="font-weight:800;margin-bottom:12px">Cloud-target components · ' + cloudLabel() + '</div><div class="chips">' +
          feats.map(function (f) { return '<span class="chip on">' + esc(f) + "</span>"; }).join("") + '</div>' +
          (c.dags ? '<div style="font-weight:800;margin:16px 0 10px">Recommended DAGs</div><div class="dl">' + c.dags.map(function (d) { return "<dt><code class=\"inline\">" + esc(d[0]) + "</code></dt><dd>" + esc(d[1]) + "</dd>"; }).join("") + "</div>" : "") +
        '</div>' +
      '</div>';

    if (c.io) {
      html += '<div class="card" style="margin-top:16px"><div class="dl"><dt>Input</dt><dd>' + esc(c.io.in) + "</dd><dt>Output</dt><dd>" + esc(c.io.out) + "</dd></div></div>";
    }
    if (c.layout) {
      html += '<div class="section-title">Storage layout · ' + cloudLabel() + '</div><div class="card"><pre class="code">' + esc(pick(c.layout) || c.layout[state.cloud]) + "\n    " + c.layout.tree.join("\n    ") + "</pre></div>";
    }
    if (c.model) {
      html += '<div class="section-title">Example analytical model</div><div class="card"><div class="dl">' + c.model.map(function (m) { return "<dt><code class=\"inline\">" + esc(m[0]) + "</code></dt><dd>" + esc(m[1]) + "</dd>"; }).join("") + "</div></div>";
    }
    if (c.example) {
      html += '<div class="section-title">' + esc(c.example.title) + '</div><div class="card"><pre class="code">' + esc(c.example.code) + "</pre></div>";
    }
    html += '<div class="section-title">Gotchas &amp; boundaries</div><div class="card"><ul class="warns">' +
      c.gotchas.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul></div>";

    // prev/next
    var idx = GSP.components.indexOf(c);
    html += '<div style="display:flex;justify-content:space-between;margin-top:24px;gap:10px">';
    if (idx > 0) html += '<a class="btn" href="#components/' + GSP.components[idx - 1].id + '">← ' + esc(compName(GSP.components[idx - 1])) + "</a>"; else html += "<span></span>";
    if (idx < GSP.components.length - 1) html += '<a class="btn primary" href="#components/' + GSP.components[idx + 1].id + '">' + esc(compName(GSP.components[idx + 1])) + " →</a>";
    html += "</div>";

    root.innerHTML = html;
  }

  /* ============================================================
     MODULE: layers (medallion)
     ============================================================ */
  function mLayers(root) {
    var sto = byId("storage");
    var layers = [
      ["Bronze", "var(--c-ingest)", "Raw & immutable", "Preserve the ingested source + ingestion metadata (feed, filename, business date, timestamp, batch ID, count, checksum).", "Original purchase-schedule file, untouched."],
      ["Silver", "var(--c-store)", "Clean & conformed", "Validated, standardized, deduplicated data on agreed business keys.", "Clean purchase schedules with normalized dates."],
      ["Gold", "var(--c-delta)", "Consumer-ready", "Shaped per consumer — o9 planning, frequent refresh, Snowflake analytics — each with its own grain, cadence and rules.", "Planning interface output or an inventory analytics dataset."],
      ["Quarantine", "var(--c-proc)", "Rejected", "Isolate invalid records/files for investigation instead of dropping them silently.", "Records missing required business keys."],
      ["Control", "var(--c-gov)", "Metadata", "Manifests, reconciliation results, run metadata — the batch-status backbone.", "Source file count & processed batch ID."]
    ];
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Storage · ' + cloudLabel() + '</div>' +
        '<h1 class="m-title">The <span class="grad">medallion</span> layout</h1>' +
        '<p class="m-sub">Raw data is never thrown away; every transformation is a new, auditable layer. Quarantine catches the bad; Control records the truth about each batch.</p>' +
      '</div>' +
      '<div class="card"><pre class="code">' + esc(sto.layout[state.cloud]) + "\n    " + sto.layout.tree.join("\n    ") + "</pre></div>" +
      '<div class="section-title">What each layer owns</div>' +
      '<div class="grid grid-2">' +
        layers.map(function (l) {
          return '<div class="card accent-l" style="--accent:' + l[1] + '">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="font-weight:800;font-size:16px;color:' + l[1] + '">' + l[0] + '</span><span class="chip">' + l[2] + "</span></div>" +
            '<p style="font-size:13.5px">' + esc(l[3]) + "</p>" +
            '<p style="font-size:12.5px;color:var(--muted-2);margin-top:9px">e.g. ' + esc(l[4]) + "</p></div>";
        }).join("") +
      '</div>' +
      '<div class="callout warn" style="margin-top:20px"><span class="ic">⚠</span><div>A file in Bronze is not proof the business batch completed, and Gold is not automatically publishable. Both still get validated against the output contract, counts, keys and rules.</div></div>';
  }

  /* ============================================================
     MODULE: cloudmap
     ============================================================ */
  function mCloudMap(root) {
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">The port-it question</div>' +
        '<h1 class="m-title">As&nbsp;built <span class="grad">→</span> Azure &amp; AWS</h1>' +
        '<p class="m-sub">The as-built platform (SQL Server + SSIS + o9) and how each capability maps onto Azure and AWS. o9 is cloud-agnostic and stays put; rows where Azure and AWS coincide are tinted green.</p>' +
      '</div>' +
      '<div class="card" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Capability</th><th>As built</th><th>Azure</th><th>AWS</th></tr></thead><tbody>' +
        GSP.cloudMap.map(function (r) {
          var same = r[2] === r[3];
          return '<tr class="' + (same ? "same" : "") + '"><td style="font-weight:600">' + esc(r[0]) + '</td><td class="builtcol">' + esc(r[1]) + '</td><td class="azcol">' + esc(r[2]) + '</td><td class="awscol">' + esc(r[3]) + "</td></tr>";
        }).join("") +
      '</tbody></table></div>' +
      '<div class="callout info" style="margin-top:18px"><span class="ic">💡</span><div>' + esc(GSP.cloudMapNote) + "</div></div>" +
      '<div class="section-title">Security &amp; monitoring</div>' +
      '<div class="grid grid-2">' +
        '<div class="card accent-l" style="--accent:#0078d4"><div style="font-weight:800;color:#4ab3f4;margin-bottom:10px">Azure</div><div class="dl">' + GSP.crosscutting.azure.map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</div></div>" +
        '<div class="card accent-l" style="--accent:#ec7211"><div style="font-weight:800;color:#f5a623;margin-bottom:10px">AWS</div><div class="dl">' + GSP.crosscutting.aws.map(function (x) { return "<dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd>"; }).join("") + "</div></div>" +
      '</div>' +
      '<div class="callout warn" style="margin-top:18px"><span class="ic">⚠</span><div>' + esc(GSP.crosscutting.note) + "</div></div>";
  }

  /* ============================================================
     MODULE: business cases
     ============================================================ */
  function mCases(root) {
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Where the real difficulty lives</div>' +
        '<h1 class="m-title">The hard <span class="grad">business cases</span></h1>' +
        '<p class="m-sub">These are the details that separate "I ran a pipeline" from "I understood the planning process." Each is a likely interview follow-up.</p>' +
      '</div>' +
      '<div class="grid grid-2">' +
        GSP.businessCases.map(function (b) {
          return '<div class="card accent-l" style="--accent:var(--brand)">' +
            '<div style="display:flex;align-items:center;gap:11px;margin-bottom:6px"><span class="hc-ico">' + b.icon + '</span><h3 style="margin:0">' + esc(b.title) + '</h3></div>' +
            '<span class="chip on" style="margin-bottom:10px;display:inline-block">' + esc(b.tag) + "</span>" +
            '<p style="font-weight:700;font-size:14px;margin-bottom:8px">' + esc(b.hook) + "</p>" +
            b.body.map(function (p) { return '<p style="color:var(--muted);font-size:13.5px;margin-bottom:8px">' + esc(p) + "</p>"; }).join("") +
            '<div class="callout rule" style="margin-top:6px"><span class="ic">⛔</span><div>' + esc(b.rule) + "</div></div>" +
          "</div>";
        }).join("") +
      '</div>';
  }

  /* ============================================================
     MODULE: recovery
     ============================================================ */
  function mRecovery(root) {
    var r = GSP.recovery;
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Operability</div>' +
        '<h1 class="m-title">Failure handling &amp; <span class="grad">recovery</span></h1>' +
        '<p class="m-sub">When a task fails, the pipeline doesn\'t blindly retry or blindly reset. It classifies, recovers to a safe checkpoint, and keeps dependent outbound blocked until the batch truly succeeds.</p>' +
      '</div>' +
      '<div class="section-title">The recovery flow</div>' +
      '<div class="rec-flow">' +
        r.steps.map(function (s) { return '<div class="rec-step"><div class="rk">' + esc(s[0]) + '</div><div class="rv">' + esc(s[1]) + "</div></div>"; }).join("") +
      '</div>' +
      '<div class="section-title">What to monitor</div>' +
      '<div class="card"><ul class="ticks" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));display:grid">' +
        r.metrics.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="callout info" style="margin-top:18px"><span class="ic">♻️</span><div><strong>Idempotency.</strong> ' + esc(r.idempotency) + "</div></div>" +
      '<div class="callout rule" style="margin-top:12px"><span class="ic">🏷️</span><div><strong>The one decision to settle early.</strong> ' + esc(r.canonical) + "</div></div>";
  }

  /* ============================================================
     MODULE: interview
     ============================================================ */
  function mInterview(root) {
    var cats = ["All"].concat(GSP.interview.map(function (x) { return x.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var active = "All";
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Prep · ' + GSP.interview.length + ' questions</div>' +
        '<h1 class="m-title">Interview <span class="grad">Q&amp;A</span></h1>' +
        '<p class="m-sub">Click a question to reveal a crisp, spoken-style answer. Filter by topic to drill the area you\'re weakest on.</p>' +
      '</div>' +
      '<div class="filter-row" id="filters"></div><div id="qlist"></div>';
    var filters = root.querySelector("#filters"), list = root.querySelector("#qlist");
    function renderFilters() {
      filters.innerHTML = cats.map(function (ct) { return '<button class="chip' + (ct === active ? " on" : "") + '" data-cat="' + esc(ct) + '">' + esc(ct) + "</button>"; }).join("");
      filters.querySelectorAll("[data-cat]").forEach(function (b) { b.addEventListener("click", function () { active = b.getAttribute("data-cat"); renderFilters(); renderList(); }); });
    }
    function renderList() {
      var items = GSP.interview.filter(function (x) { return active === "All" || x.cat === active; });
      list.innerHTML = items.map(function (x) {
        return '<div class="qa"><div class="qa-q"><span class="cat">' + esc(x.cat) + '</span><span class="tw">' + esc(x.q) + '</span><span class="caret">▶</span></div>' +
          '<div class="qa-a"><div class="qa-a-inner">' + esc(x.a) + "</div></div></div>";
      }).join("");
      list.querySelectorAll(".qa").forEach(function (qa) { qa.querySelector(".qa-q").addEventListener("click", function () { qa.classList.toggle("open"); }); });
    }
    renderFilters(); renderList();
  }

  /* ============================================================
     MODULE: quiz
     ============================================================ */
  function mQuiz(root) {
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Prep · ' + GSP.quiz.length + ' questions</div>' +
        '<h1 class="m-title">Quick <span class="grad">quiz</span></h1>' +
        '<p class="m-sub">One tap per question. These target the exact traps interviewers use to tell depth from buzzwords.</p>' +
      '</div>' +
      '<div id="quizlist"></div>' +
      '<div class="card" style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:14px"><div class="quiz-score" id="score">Score: 0 / ' + GSP.quiz.length + '</div><button class="btn" id="reset">Reset</button></div>';
    var listEl = root.querySelector("#quizlist"), scoreEl = root.querySelector("#score");
    var answered = {}, score = 0;
    function render() {
      listEl.innerHTML = GSP.quiz.map(function (q, qi) {
        return '<div class="quiz-q"><h4>' + (qi + 1) + ". " + esc(q.q) + "</h4>" +
          q.opts.map(function (o, oi) {
            var cls = "quiz-opt", dis = "";
            if (answered[qi] != null) {
              dis = "disabled";
              if (oi === q.correct) cls += " correct";
              else if (oi === answered[qi]) cls += " wrong";
            }
            return '<button class="' + cls + '" ' + dis + ' data-q="' + qi + '" data-o="' + oi + '">' + esc(o) + "</button>";
          }).join("") + "</div>";
      }).join("");
      listEl.querySelectorAll("button[data-q]").forEach(function (b) {
        b.addEventListener("click", function () {
          var qi = +b.getAttribute("data-q"), oi = +b.getAttribute("data-o");
          if (answered[qi] != null) return;
          answered[qi] = oi;
          if (oi === GSP.quiz[qi].correct) score++;
          scoreEl.textContent = "Score: " + score + " / " + GSP.quiz.length;
          render();
        });
      });
    }
    root.querySelector("#reset").addEventListener("click", function () { answered = {}; score = 0; scoreEl.textContent = "Score: 0 / " + GSP.quiz.length; render(); });
    render();
  }

  /* ============================================================
     MODULE: glossary
     ============================================================ */
  function mGlossary(root) {
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">Reference</div>' +
        '<h1 class="m-title"><span class="grad">Glossary</span></h1>' +
        '<p class="m-sub">Every acronym and term in this project, in one place.</p>' +
      '</div>' +
      '<input id="gsearch" class="btn" style="width:100%;text-align:left;margin-bottom:16px;cursor:text" placeholder="Filter terms…" />' +
      '<div class="card"><div class="dl" id="glist"></div></div>';
    var listEl = root.querySelector("#glist"), search = root.querySelector("#gsearch");
    function render(f) {
      f = (f || "").toLowerCase();
      listEl.innerHTML = GSP.glossary.filter(function (g) { return !f || g[0].toLowerCase().indexOf(f) >= 0 || g[1].toLowerCase().indexOf(f) >= 0; })
        .map(function (g) { return "<dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd>"; }).join("") || '<dd style="color:var(--muted-2)">No matches.</dd>';
    }
    search.addEventListener("input", function () { render(search.value); });
    render("");
  }

  /* ============================================================
     MODULE: inbound interfaces (real feeds) + as-built stack
     ============================================================ */
  function mInterfaces(root) {
    var ab = GSP.asBuilt;
    root.innerHTML =
      '<div class="m-head">' +
        '<div class="eyebrow">As built · the real feeds</div>' +
        '<h1 class="m-title">Inbound <span class="grad">interfaces</span></h1>' +
        '<p class="m-sub">' + esc(ab.headline) + '. Every batch starts from these ' + GSP.inboundInterfaces.length + ' inbound feeds, each landing into an <code class="inline">In_Fact_*</code> staging table over SFTP / o9 mPower.</p>' +
      '</div>' +
      '<div class="section-title">The as-built stack</div>' +
      '<div class="card"><div class="dl">' +
        ab.stack.map(function (s) { return "<dt>" + esc(s[0]) + "</dt><dd>" + esc(s[1]) + "</dd>"; }).join("") +
      '</div></div>' +
      '<div class="section-title">Inbound feeds (' + GSP.inboundInterfaces.length + ')</div>' +
      '<div class="card"><div class="dl">' +
        GSP.inboundInterfaces.map(function (f) { return "<dt><code class=\"inline\">" + esc(f[0]) + "</code></dt><dd>" + esc(f[1]) + "</dd>"; }).join("") +
      '</div></div>' +
      '<div class="callout info" style="margin-top:18px"><span class="ic">🔐</span><div>' + esc(ab.note) + "</div></div>";
  }

  /* ── module registry ────────────────────────────────────────── */
  var MODULES = {
    home: { title: "Overview", render: mHome },
    architecture: { title: "Architecture", render: mArch },
    pipeline: { title: "End-to-end flow", render: mPipeline },
    components: { title: "Components", render: mComponents, sub: true },
    interfaces: { title: "Inbound interfaces", render: mInterfaces },
    layers: { title: "Medallion layers", render: mLayers },
    cloudmap: { title: "As-built ⇄ cloud", render: mCloudMap },
    cases: { title: "Business cases", render: mCases },
    recovery: { title: "Failure & recovery", render: mRecovery },
    interview: { title: "Interview Q&A", render: mInterview },
    quiz: { title: "Quiz", render: mQuiz },
    glossary: { title: "Glossary", render: mGlossary }
  };

  /* ── router ─────────────────────────────────────────────────── */
  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return { id: "home", sub: null };
    var parts = raw.split("/");
    return { id: parts[0], sub: parts[1] || null };
  }
  var mainEl;
  function route() {
    var h = parseHash();
    var mod = MODULES[h.id] || MODULES.home;
    mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
    try {
      mod.render(mainEl, h.sub);
    } catch (e) {
      mainEl.innerHTML = '<div class="card"><h3>Something went wrong rendering this view.</h3><pre class="code">' + esc(String(e && e.stack || e)) + "</pre></div>";
      console.error(e);
    }
    setActive(h.id);
    document.title = (mod.title ? mod.title + " · " : "") + "GSP Visualizer";
    closeSidebar();
  }
  function setActive(id) {
    document.querySelectorAll(".nav-link").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-route") === id); });
  }

  /* ── sidebar ────────────────────────────────────────────────── */
  function buildSidebar() {
    var sb = document.getElementById("sidebar");
    sb.innerHTML = NAV.map(function (g) {
      return '<div class="nav-group"><div class="nav-group-label">' + esc(g.label) + "</div>" +
        g.items.map(function (it) {
          return '<a class="nav-link" data-route="' + it[0] + '" href="#' + it[0] + '"><span class="nav-ico">' + it[1] + "</span>" + esc(it[2]) + "</a>";
        }).join("") + "</div>";
    }).join("");
  }
  function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("scrim").classList.remove("show"); }

  /* ── cloud toggle + theme ───────────────────────────────────── */
  function applyCloudBtns() {
    document.querySelectorAll(".cloud-toggle button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cloud") === state.cloud); });
  }
  function setCloud(c) {
    if (c === state.cloud) return;
    state.cloud = c; localStorage.setItem("gsp-cloud", c);
    applyCloudBtns(); route();
  }
  function applyTheme() { document.documentElement.setAttribute("data-theme", state.theme); }
  function toggleTheme() { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("gsp-theme", state.theme); applyTheme(); }

  /* ── boot ───────────────────────────────────────────────────── */
  function boot() {
    mainEl = document.getElementById("main");
    applyTheme();
    buildSidebar();
    applyCloudBtns();

    document.querySelectorAll(".cloud-toggle button").forEach(function (b) {
      b.addEventListener("click", function () { setCloud(b.getAttribute("data-cloud")); });
    });
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    var mb = document.getElementById("menu-btn");
    if (mb) mb.addEventListener("click", function () { var sb = document.getElementById("sidebar"); sb.classList.toggle("open"); document.getElementById("scrim").classList.toggle("show", sb.classList.contains("open")); });
    document.getElementById("scrim").addEventListener("click", closeSidebar);

    window.addEventListener("hashchange", route);
    route();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
