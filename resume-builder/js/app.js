/* ============================================================
   Resume Builder — NewVisual
   Master content Library + multiple role-tailored Resumes.
   One template, live preview, one-page PDF. localStorage only.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "newvisual.resumedata.v2";
  var OLD_KEY = "newvisual.resume.v1";

  /* Section definitions. Order here is the default section order. */
  var SECTION_DEFS = [
    { key: "summary",     title: "Professional Summary",   kind: "summary" },
    { key: "skills",      title: "Technical Skills",        kind: "labeled" },
    { key: "experiences", title: "Professional Experience", kind: "entries" },
    { key: "projects",    title: "Projects",                kind: "entries" },
    { key: "education",   title: "Education",               kind: "entries" },
    { key: "awards",      title: "Awards / Achievements",   kind: "labeled" }
  ];
  function defFor(key) { for (var i = 0; i < SECTION_DEFS.length; i++) if (SECTION_DEFS[i].key === key) return SECTION_DEFS[i]; return null; }
  var MULTI_KEYS = ["skills", "experiences", "projects", "education", "awards"]; // picks arrays
  var ENTRY_KEYS = ["experiences", "projects", "education"];

  /* ---------- utils ---------- */
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function elText(tag, cls, txt) { var n = el(tag, cls); n.textContent = txt; return n; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight, 32) + "px"; }
  function growAll(root) { var t = (root || document).querySelectorAll("textarea.inp"); for (var i = 0; i < t.length; i++) autoGrow(t[i]); }

  /* ============================================================
     SAMPLE / DEFAULT DATA
     ============================================================ */
  function sampleStore() {
    var summaryId = uid();
    var sk = [
      { id: uid(), label: "Programming & Data Processing", value: "Python, PySpark, Apache Spark, Spark SQL." },
      { id: uid(), label: "o9 Solutions Platform", value: "o9 Digital Brain, IBPL, o9 DB Designer, Enterprise Knowledge Graph, Graph Cube." },
      { id: uid(), label: "Data Integration & ETL", value: "SQL, T-SQL, SSIS, Apache NiFi, ETL, Data Integration, Batch Integration, REST APIs, SFTP." },
      { id: uid(), label: "Orchestration", value: "Apache Airflow." },
      { id: uid(), label: "Cloud & Big Data", value: "Azure: ADLS, ADF, Databricks, Synapse, Unity Catalog." },
      { id: uid(), label: "Databases", value: "SQL Server, MySQL, PostgreSQL, Snowflake." }
    ];
    var exp = [{
      id: uid(), heading: "o9 Solutions", role: "Senior Data Engineer", date: "Jul 2022 – Present",
      meta: "Supply chain data integration · o9 Digital Brain platform · Apache NiFi · SQL",
      bullets: [
        "Built end-to-end data integration pipelines for Supply Planning, Demand Planning, Order Handling, Kitting, and Costing workflows on the o9 Digital Brain platform.",
        "Developed ingestion, validation, transformation, deduplication, and aggregation logic across SFTP/API → SQL staging → o9 data flows; created source-to-target mappings and business transformation rules for high-volume supply-chain datasets.",
        "Delivered near-real-time integration using Apache NiFi, APIs, and SQL with watermark-based incremental processing to prevent duplicate records and reliably propagate transactional data.",
        "Developed integrations using IBPL, o9 DB Designer, Enterprise Knowledge Graph, and Graph Cube across Supply Planning, Demand Planning, Order Handling, Kitting, and Costing modules.",
        "Delivered multiple integration enhancements and major production go-lives while maintaining reliable data delivery across upstream, transformation, and o9 layers."
      ]
    }];
    var proj = [
      { id: uid(), heading: "Real-Time Data Pipeline", role: "", date: "",
        meta: "Kafka · Apache Flink · Apache Iceberg · Databricks · Snowflake",
        bullets: [
          "Designed a production-scale real-time pipeline using Kafka for event ingestion, Flink for stateful stream processing, Apache Iceberg for Lakehouse storage, and Snowflake for analytical serving.",
          "Implemented event-time processing, windowing, watermarking, state management, schema evolution, and fault-tolerant handling for out-of-order and late-arriving events."
        ] },
      { id: uid(), heading: "E-Commerce Batch Data Engineering Project", role: "", date: "",
        meta: "ADLS Gen2 · Databricks · PySpark · Apache Airflow · dbt · Delta Lake · Unity Catalog",
        bullets: [
          "Engineered an end-to-end batch data pipeline using ADLS Gen2, Databricks, PySpark, Delta Lake, and Apache Airflow, implementing a Medallion Architecture for analytics-ready e-commerce data.",
          "Implemented incremental ETL/ELT and CDC ingestion with Databricks Auto Loader and developed metadata-driven dbt/Jinja transformations, supporting schema evolution and scalable Silver-to-Gold processing.",
          "Designed SCD Type 2 dimensional models using dbt Snapshots and orchestrated workflows with Apache Airflow, incorporating data-quality checks, retries, task dependencies, Unity Catalog governance, and GitHub CI/CD."
        ] }
    ];
    var edu = [{ id: uid(), heading: "NIT Tiruchirappalli — Bachelor of Technology, Production Engineering", role: "", date: "Jul 2018 – Aug 2022", meta: "", bullets: [] }];
    var awd = [{ id: uid(), label: "Spot Award (×2) – o9 Solutions", value: "Recognized twice for exceptional contribution and on-time delivery of high-impact supply chain data integration projects." }];

    var library = {
      profile: {
        name: "RAJESH SATULURI", title: "Senior Data Engineer",
        contacts: [
          { icon: "✉", value: "rajesh.satuluri79@gmail.com" },
          { icon: "☎", value: "+91 8106783397" },
          { icon: "⚲", value: "Hyderabad, Telangana" }
        ]
      },
      summaries: [{ id: summaryId, label: "Default", text: "Senior Technical Consultant with 4+ years of experience delivering **o9 Solutions, supply chain planning, data integration, and enterprise ETL solutions** for global manufacturing clients. Experienced in **o9 platform integration, SQL, T-SQL, SSIS, Apache NiFi, REST APIs, ETL, batch processing, and real-time data pipelines** across Demand Planning, Supply Planning, Kit Planning, Order Handling, and Global Costing. Proven experience in **technical solution design, requirements analysis, integration development, troubleshooting, data quality, testing, and go-live support** with functional, product, and client teams." }],
      skills: sk, experiences: exp, projects: proj, education: edu, awards: awd
    };

    var resume = {
      id: uid(), name: "My Resume", targetRole: "",
      summaryId: summaryId,
      picks: {
        skills: sk.map(function (x) { return x.id; }),
        experiences: exp.map(function (x) { return x.id; }),
        projects: proj.map(function (x) { return x.id; }),
        education: edu.map(function (x) { return x.id; }),
        awards: awd.map(function (x) { return x.id; })
      },
      sectionOrder: SECTION_DEFS.map(function (d) { return d.key; })
    };

    return { library: library, resumes: [resume], activeResumeId: resume.id };
  }

  /* ---------- migration from the old flat single-resume format ---------- */
  function migrateOld(old) {
    var store = sampleStore();
    var lib = { profile: { name: old.name || "", title: old.title || "", contacts: (old.contacts || []).slice() },
      summaries: [], skills: [], experiences: [], projects: [], education: [], awards: [] };

    function classify(sec) {
      var t = (sec.title || "").toLowerCase();
      if (sec.type === "text") return "summary";
      if (sec.type === "labeled") {
        if (/award|achiev/.test(t)) return "awards";
        return "skills";
      }
      // entries
      if (/experience|employ|work/.test(t)) return "experiences";
      if (/project/.test(t)) return "projects";
      if (/educ|academ/.test(t)) return "education";
      return "experiences";
    }

    (old.sections || []).forEach(function (sec) {
      var cat = classify(sec);
      if (cat === "summary") {
        lib.summaries.push({ id: uid(), label: sec.title || "Summary", text: sec.text || "" });
      } else if (cat === "skills" || cat === "awards") {
        (sec.items || []).forEach(function (it) {
          lib[cat].push({ id: uid(), label: it.label || "", value: it.value || "" });
        });
      } else {
        (sec.items || []).forEach(function (it) {
          lib[cat].push({ id: uid(), heading: it.heading || "", role: it.role || "", date: it.date || "", meta: it.meta || "", bullets: (it.bullets || []).slice() });
        });
      }
    });

    if (!lib.summaries.length) lib.summaries.push({ id: uid(), label: "Default", text: "" });

    var resume = {
      id: uid(), name: "My Resume", targetRole: "",
      summaryId: lib.summaries[0].id,
      picks: {
        skills: lib.skills.map(function (x) { return x.id; }),
        experiences: lib.experiences.map(function (x) { return x.id; }),
        projects: lib.projects.map(function (x) { return x.id; }),
        education: lib.education.map(function (x) { return x.id; }),
        awards: lib.awards.map(function (x) { return x.id; })
      },
      sectionOrder: SECTION_DEFS.map(function (d) { return d.key; })
    };
    return { library: lib, resumes: [resume], activeResumeId: resume.id };
  }

  /* ============================================================
     STATE
     ============================================================ */
  var store;
  var activeTab = "resumes";
  var collapsed = {};
  var saveTimer = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    try {
      var oldRaw = localStorage.getItem(OLD_KEY);
      if (oldRaw) {
        var migrated = migrateOld(JSON.parse(oldRaw));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (e2) {}
        return migrated;
      }
    } catch (e3) {}
    return sampleStore();
  }
  /* guard against partial objects */
  function normalize(s) {
    if (!s || !s.library || !Array.isArray(s.resumes)) return sampleStore();
    var lib = s.library;
    lib.profile = lib.profile || { name: "", title: "", contacts: [] };
    lib.profile.contacts = lib.profile.contacts || [];
    ["summaries", "skills", "experiences", "projects", "education", "awards"].forEach(function (k) { lib[k] = lib[k] || []; });
    if (!s.resumes.length) return sampleStore();
    s.resumes.forEach(function (r) {
      r.picks = r.picks || {};
      MULTI_KEYS.forEach(function (k) { r.picks[k] = r.picks[k] || []; });
      r.sectionOrder = r.sectionOrder && r.sectionOrder.length ? r.sectionOrder : SECTION_DEFS.map(function (d) { return d.key; });
      if (!r.summaryId && lib.summaries[0]) r.summaryId = lib.summaries[0].id;
    });
    if (!s.activeResumeId || !byId(s.resumes, s.activeResumeId)) s.activeResumeId = s.resumes[0].id;
    return s;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) {}
    setSaveState("Saved");
  }
  function setSaveState(txt, dirty) {
    var s = document.getElementById("saveState");
    if (!s) return;
    s.textContent = txt; s.classList.toggle("dirty", !!dirty);
  }
  function touch() {
    setSaveState("Saving…", true);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
    renderPreview();
  }
  function activeResume() { return byId(store.resumes, store.activeResumeId) || store.resumes[0]; }

  /* ============================================================
     SHARED UI BUILDERS
     ============================================================ */
  function fieldInput(label, val, onInput, ph) {
    var f = el("div", "field");
    if (label) f.appendChild(elText("label", null, label));
    var i = el("input", "inp"); i.value = val || ""; if (ph) i.placeholder = ph;
    i.addEventListener("input", function () { onInput(i.value); });
    f.appendChild(i); return f;
  }
  function fieldTextarea(label, val, onInput) {
    var f = el("div", "field");
    if (label) f.appendChild(elText("label", null, label));
    var t = el("textarea", "inp"); t.value = val || "";
    t.addEventListener("input", function () { onInput(t.value); autoGrow(t); });
    f.appendChild(t); return f;
  }
  function miniBtn(txt, onClick, extra) {
    var b = el("button", "btn btn-mini" + (extra ? " " + extra : ""));
    b.type = "button"; b.textContent = txt;
    b.addEventListener("click", onClick);
    return b;
  }
  function blockEl(titleText, collapseKey, buildBody, headRight) {
    var b = el("div", "block");
    if (collapsed[collapseKey]) b.classList.add("collapsed");
    var head = el("div", "block-head"); head.title = "Click to collapse / expand";
    head.appendChild(elText("span", "caret", "▼"));
    head.appendChild(elText("span", "sec-title", titleText));
    if (headRight) head.appendChild(headRight);
    head.addEventListener("click", function (e) {
      if (e.target.closest("input, button, .move, select")) return;
      collapsed[collapseKey] = !collapsed[collapseKey];
      b.classList.toggle("collapsed", collapsed[collapseKey]);
      if (!collapsed[collapseKey]) growAll(b);
    });
    b.appendChild(head);
    var wrap = el("div", "block-body-wrap"); var body = el("div", "block-body");
    buildBody(body); wrap.appendChild(body); b.appendChild(wrap);
    return b;
  }
  function moveIn(arr, idx, dir) { var j = idx + dir; if (j < 0 || j >= arr.length) return false; var t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; return true; }
  function itemName(catKey, it) {
    if (catKey === "skills" || catKey === "awards") return it.label || "(untitled)";
    if (catKey === "summaries") return it.label || "(untitled summary)";
    return (it.heading || "(untitled)") + (it.role ? " — " + it.role : "");
  }

  /* ============================================================
     RENDER: tabs + panel + preview
     ============================================================ */
  function renderApp() {
    var tabs = document.querySelectorAll("#tabs .tab");
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", tabs[i].getAttribute("data-tab") === activeTab);
    var panel = document.getElementById("tabPanel");
    panel.innerHTML = "";
    if (activeTab === "library") renderLibrary(panel);
    else renderResumes(panel);
    growAll(panel);
    renderPreview();
  }

  /* ============================================================
     LIBRARY TAB — manage all master content
     ============================================================ */
  function renderLibrary(panel) {
    var lib = store.library;
    panel.appendChild(elText("p", "panel-hint", "Your master content. Everything here can be included in any resume. Edit once — every resume that uses it updates."));

    /* Identity */
    panel.appendChild(blockEl("Identity", "lib.identity", function (body) {
      body.appendChild(fieldInput("Full name", lib.profile.name, function (v) { lib.profile.name = v; touch(); }));
      body.appendChild(fieldInput("Role / title", lib.profile.title, function (v) { lib.profile.title = v; touch(); }));
      var bar = el("div", "item-bar");
      bar.appendChild(elText("span", "lbl", "Contact details"));
      bar.appendChild(miniBtn("＋ Add contact", function () { lib.profile.contacts.push({ icon: "•", value: "" }); renderApp(); touch(); }));
      body.appendChild(bar);
      lib.profile.contacts.forEach(function (c, i) {
        var row = el("div", "bullet-row");
        var icon = el("input", "inp"); icon.value = c.icon; icon.style.maxWidth = "52px"; icon.title = "Icon (✉ ☎ ⚲ 🔗 …)";
        icon.addEventListener("input", function () { c.icon = icon.value; touch(); });
        var val = el("input", "inp"); val.value = c.value; val.placeholder = "email / phone / location / link";
        val.addEventListener("input", function () { c.value = val.value; touch(); });
        row.appendChild(icon); row.appendChild(val);
        row.appendChild(miniBtn("✕", function () { lib.profile.contacts.splice(i, 1); renderApp(); touch(); }, "btn-danger"));
        body.appendChild(row);
      });
    }));

    /* Summaries */
    panel.appendChild(libListBlock("Professional Summaries", "lib.summaries", "summaries", "＋ Add summary",
      function () { lib.summaries.push({ id: uid(), label: "New summary", text: "" }); },
      function (body, it, i) {
        body.appendChild(fieldInput("Label (your reference, not shown on resume)", it.label, function (v) { it.label = v; touch(); }));
        body.appendChild(fieldTextarea("Summary text (use **bold**)", it.text, function (v) { it.text = v; touch(); }));
      }));

    /* Skills */
    panel.appendChild(libListBlock("Technical Skills", "lib.skills", "skills", "＋ Add skill row",
      function () { lib.skills.push({ id: uid(), label: "", value: "" }); },
      function (body, it, i) {
        body.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
        body.appendChild(fieldTextarea("Skills / text", it.value, function (v) { it.value = v; touch(); }));
      }));

    /* Entry categories */
    panel.appendChild(libListBlock("Work Experience", "lib.experiences", "experiences", "＋ Add experience",
      function () { store.library.experiences.push(newEntry()); }, entryBody));
    panel.appendChild(libListBlock("Projects", "lib.projects", "projects", "＋ Add project",
      function () { store.library.projects.push(newEntry()); }, entryBody));
    panel.appendChild(libListBlock("Education", "lib.education", "education", "＋ Add education",
      function () { store.library.education.push(newEntry()); }, entryBody));

    /* Awards */
    panel.appendChild(libListBlock("Awards / Achievements", "lib.awards", "awards", "＋ Add award",
      function () { store.library.awards.push({ id: uid(), label: "", value: "" }); },
      function (body, it, i) {
        body.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
        body.appendChild(fieldTextarea("Description", it.value, function (v) { it.value = v; touch(); }));
      }));
  }

  function newEntry() { return { id: uid(), heading: "", role: "", date: "", meta: "", bullets: [] }; }

  function entryBody(body, it) {
    body.appendChild(fieldInput("Company / project / school", it.heading, function (v) { it.heading = v; touch(); }));
    var r2 = el("div", "row-2");
    r2.appendChild(fieldInput("Role / title (optional)", it.role, function (v) { it.role = v; touch(); }));
    r2.appendChild(fieldInput("Date range", it.date, function (v) { it.date = v; touch(); }));
    body.appendChild(r2);
    body.appendChild(fieldInput("Meta / tech line", it.meta, function (v) { it.meta = v; touch(); }));
    var bbar = el("div", "item-bar");
    bbar.appendChild(elText("span", "lbl", "Bullet points"));
    bbar.appendChild(miniBtn("＋ Add bullet", function () { it.bullets.push(""); renderApp(); touch(); }));
    body.appendChild(bbar);
    var bl = el("div", "bullets");
    it.bullets.forEach(function (bt, bi) {
      var row = el("div", "bullet-row");
      var ta = el("textarea", "inp"); ta.value = bt;
      ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
      row.appendChild(ta);
      row.appendChild(miniBtn("✕", function () { it.bullets.splice(bi, 1); renderApp(); touch(); }, "btn-danger"));
      bl.appendChild(row);
    });
    body.appendChild(bl);
  }

  /* a collapsible block listing library items of one category */
  function libListBlock(title, ckey, catKey, addLabel, addFn, itemBody) {
    var arr = store.library[catKey];
    var add = miniBtn(addLabel, function () { addFn(); renderApp(); touch(); }, "js-add");
    return blockEl(title + " (" + arr.length + ")", ckey, function (body) {
      if (!arr.length) body.appendChild(elText("p", "hint", "No items yet. Use “" + addLabel + "”."));
      arr.forEach(function (it, i) {
        var wrap = el("div", "item");
        var top = el("div", "item-bar");
        top.appendChild(elText("span", "lbl", itemName(catKey === "skills" || catKey === "awards" || catKey === "summaries" ? catKey : catKey, it) || (title + " " + (i + 1))));
        var tools = el("div", "item-tools");
        tools.appendChild(miniBtn("▲", function () { if (moveIn(arr, i, -1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("▼", function () { if (moveIn(arr, i, 1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("✕", function () { removeLibraryItem(catKey, it.id); renderApp(); touch(); }, "btn-danger"));
        top.appendChild(tools);
        wrap.appendChild(top);
        itemBody(wrap, it, i);
        body.appendChild(wrap);
      });
    }, add);
  }

  /* remove an item from the library and from every resume that references it */
  function removeLibraryItem(catKey, id) {
    var arr = store.library[catKey];
    var idx = -1; for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    if (!confirm("Delete this " + catKey.replace(/s$/, "") + " from your library? It will be removed from all resumes.")) return;
    arr.splice(idx, 1);
    store.resumes.forEach(function (r) {
      if (catKey === "summaries") { if (r.summaryId === id) r.summaryId = store.library.summaries[0] ? store.library.summaries[0].id : null; }
      else if (r.picks[catKey]) { var p = r.picks[catKey].indexOf(id); if (p >= 0) r.picks[catKey].splice(p, 1); }
    });
  }

  /* ============================================================
     RESUMES TAB — pick a resume + compose it
     ============================================================ */
  function renderResumes(panel) {
    var lib = store.library;

    /* resume switcher */
    var switcher = el("div", "resume-switcher");
    store.resumes.forEach(function (r) {
      var chip = el("button", "resume-chip" + (r.id === store.activeResumeId ? " active" : ""));
      chip.type = "button";
      chip.appendChild(elText("span", "rc-name", r.name || "Untitled"));
      if (r.targetRole) chip.appendChild(elText("span", "rc-role", r.targetRole));
      chip.addEventListener("click", function () { store.activeResumeId = r.id; renderApp(); });
      switcher.appendChild(chip);
    });
    panel.appendChild(switcher);

    var actions = el("div", "resume-actions");
    actions.appendChild(miniBtn("＋ New resume", function () { newResume(); }));
    actions.appendChild(miniBtn("⧉ Duplicate", function () { duplicateResume(); }));
    panel.appendChild(actions);

    var r = activeResume();
    if (!r) return;

    /* overflow banner (hard cap for this resume) */
    var banner = el("div", "over-banner"); banner.id = "overBanner"; banner.hidden = true;
    banner.innerHTML = "⚠ This resume exceeds one page. Remove items or shorten content — you can’t add more until it fits.";
    panel.appendChild(banner);

    /* resume settings */
    panel.appendChild(blockEl("Resume settings", "res.settings", function (body) {
      body.appendChild(fieldInput("Resume name", r.name, function (v) { r.name = v; touch(); renderChipName(r); }));
      body.appendChild(fieldInput("Target role / company (your reference)", r.targetRole, function (v) { r.targetRole = v; touch(); }));
      var del = miniBtn("Delete this resume", function () { deleteResume(r); }, "btn-danger");
      del.classList.remove("btn-mini");
      var wrap = el("div"); wrap.style.marginTop = "4px"; wrap.appendChild(del);
      body.appendChild(wrap);
    }));

    /* summary chooser */
    panel.appendChild(blockEl("Professional Summary", "res.summary", function (body) {
      if (!lib.summaries.length) { body.appendChild(emptyLibNote("summaries")); return; }
      lib.summaries.forEach(function (s) {
        var row = el("label", "pick-row");
        var radio = el("input", null, { type: "radio", name: "summaryPick" });
        radio.checked = r.summaryId === s.id;
        radio.addEventListener("change", function () { if (radio.checked) { r.summaryId = s.id; touch(); } });
        row.appendChild(radio);
        var meta = el("div", "pick-meta");
        meta.appendChild(elText("div", "pick-name", s.label || "(untitled)"));
        meta.appendChild(elText("div", "pick-sub", (s.text || "").slice(0, 90) + ((s.text || "").length > 90 ? "…" : "")));
        row.appendChild(meta);
        body.appendChild(row);
      });
    }));

    /* include-pickers for each multi category */
    var catTitles = { skills: "Technical Skills", experiences: "Work Experience", projects: "Projects", education: "Education", awards: "Awards / Achievements" };
    MULTI_KEYS.forEach(function (catKey) {
      var included = r.picks[catKey].length;
      var total = lib[catKey].length;
      panel.appendChild(blockEl(catTitles[catKey] + "  ·  " + included + "/" + total + " included", "res." + catKey, function (body) {
        buildIncludePicker(body, r, catKey);
      }));
    });

    /* section order */
    panel.appendChild(blockEl("Section order", "res.order", function (body) {
      body.appendChild(elText("p", "hint", "Reorder the sections as they appear on the resume."));
      r.sectionOrder.forEach(function (key, i) {
        var d = defFor(key); if (!d) return;
        var row = el("div", "order-row");
        row.appendChild(elText("span", "order-name", d.title));
        var tools = el("div", "item-tools");
        tools.appendChild(miniBtn("▲", function () { if (moveIn(r.sectionOrder, i, -1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("▼", function () { if (moveIn(r.sectionOrder, i, 1)) { renderApp(); touch(); } }));
        row.appendChild(tools);
        body.appendChild(row);
      });
    }));
  }

  function emptyLibNote(catKey) {
    var p = el("p", "hint");
    p.innerHTML = "Nothing in your library yet. Add " + catKey + " in the <strong>Library</strong> tab.";
    return p;
  }

  function buildIncludePicker(body, r, catKey) {
    var lib = store.library;
    var arr = lib[catKey];
    if (!arr.length) { body.appendChild(emptyLibNote(catKey)); return; }
    var picks = r.picks[catKey];
    var over = document.body.classList.contains("is-over");

    /* included (ordered, with up/down) */
    if (picks.length) {
      var incWrap = el("div", "pick-group");
      incWrap.appendChild(elText("div", "pick-group-label", "Included"));
      picks.forEach(function (id, idx) {
        var it = byId(arr, id); if (!it) return;
        var row = el("div", "pick-row");
        var cb = el("input", "include-cb", { type: "checkbox" }); cb.checked = true;
        cb.addEventListener("change", function () { var p = picks.indexOf(id); if (p >= 0) picks.splice(p, 1); renderApp(); touch(); });
        row.appendChild(cb);
        row.appendChild(elText("div", "pick-name", itemName(catKey, it)));
        var tools = el("div", "item-tools");
        tools.appendChild(miniBtn("▲", function () { if (moveIn(picks, idx, -1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("▼", function () { if (moveIn(picks, idx, 1)) { renderApp(); touch(); } }));
        row.appendChild(tools);
        incWrap.appendChild(row);
      });
      body.appendChild(incWrap);
    }

    /* available (not included) */
    var avail = arr.filter(function (x) { return picks.indexOf(x.id) < 0; });
    if (avail.length) {
      var avWrap = el("div", "pick-group");
      avWrap.appendChild(elText("div", "pick-group-label", "Available"));
      avail.forEach(function (it) {
        var row = el("div", "pick-row muted");
        var cb = el("input", "include-cb", { type: "checkbox" }); cb.checked = false;
        cb.disabled = over; // hard cap: can't add more while overflowing
        cb.addEventListener("change", function () { picks.push(it.id); renderApp(); touch(); });
        row.appendChild(cb);
        row.appendChild(elText("div", "pick-name", itemName(catKey, it)));
        avWrap.appendChild(row);
      });
      body.appendChild(avWrap);
    }
  }

  function renderChipName(r) {
    // lightweight: re-render the switcher chips only would be ideal; full render is fine
  }

  /* ---------- resume CRUD ---------- */
  function newResume() {
    var r = {
      id: uid(), name: "New Resume", targetRole: "",
      summaryId: store.library.summaries[0] ? store.library.summaries[0].id : null,
      picks: { skills: [], experiences: [], projects: [], education: [], awards: [] },
      sectionOrder: SECTION_DEFS.map(function (d) { return d.key; })
    };
    store.resumes.push(r); store.activeResumeId = r.id; renderApp(); touch();
  }
  function duplicateResume() {
    var src = activeResume(); if (!src) return;
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = uid(); copy.name = (src.name || "Resume") + " (copy)";
    store.resumes.push(copy); store.activeResumeId = copy.id; renderApp(); touch();
  }
  function deleteResume(r) {
    if (store.resumes.length <= 1) { alert("You need at least one resume. Create another before deleting this one."); return; }
    if (!confirm("Delete resume \"" + (r.name || "Untitled") + "\"? (Your library content is not affected.)")) return;
    var idx = store.resumes.indexOf(r);
    store.resumes.splice(idx, 1);
    store.activeResumeId = store.resumes[Math.max(0, idx - 1)].id;
    renderApp(); touch();
  }

  /* ============================================================
     PREVIEW (active resume, from library)
     ============================================================ */
  function renderPreview() {
    var page = document.getElementById("page");
    var r = activeResume();
    var lib = store.library;
    var label = document.getElementById("previewLabel");
    if (label) label.textContent = "Preview · A4 · " + (r ? (r.name || "Untitled") : "");
    if (!r) { page.innerHTML = ""; return; }

    var h = "";
    h += '<div class="r-name">' + esc(lib.profile.name || "Your Name") + "</div>";
    if (lib.profile.title) h += '<div class="r-title">' + esc(lib.profile.title) + "</div>";
    var contacts = (lib.profile.contacts || []).filter(function (c) { return c.value; });
    if (contacts.length) {
      h += '<div class="r-contacts">' + contacts.map(function (c) {
        return '<span class="ico">' + esc(c.icon) + "</span>" + esc(c.value);
      }).join('<span class="sep">|</span>') + "</div>";
    }

    r.sectionOrder.forEach(function (key) {
      var d = defFor(key); if (!d) return;
      if (key === "summary") {
        var s = byId(lib.summaries, r.summaryId);
        if (!s || !s.text) return;
        h += sectionOpen(d.title) + '<div class="r-text">' + rich(s.text) + "</div></div>";
      } else if (d.kind === "labeled") {
        var items = r.picks[key].map(function (id) { return byId(lib[key], id); }).filter(Boolean);
        if (!items.length) return;
        h += sectionOpen(d.title);
        items.forEach(function (it) {
          h += '<div class="r-labeled-row"><span class="lab">' + esc(it.label) + (it.label ? ": " : "") + "</span>" + rich(it.value) + "</div>";
        });
        h += "</div>";
      } else { // entries
        var es = r.picks[key].map(function (id) { return byId(lib[key], id); }).filter(Boolean);
        if (!es.length) return;
        h += sectionOpen(d.title);
        es.forEach(function (it) {
          h += '<div class="r-entry"><div class="r-entry-head"><span class="r-entry-title">' + esc(it.heading) + "</span>";
          if (it.date) h += '<span class="r-entry-date">' + esc(it.date) + "</span>";
          h += "</div>";
          if (it.role) h += '<div class="r-entry-role">' + esc(it.role) + "</div>";
          if (it.meta) h += '<div class="r-entry-meta">' + esc(it.meta) + "</div>";
          if (it.bullets && it.bullets.length) {
            h += '<ul class="r-bullets">';
            it.bullets.forEach(function (bt) { if (bt) h += "<li>" + rich(bt) + "</li>"; });
            h += "</ul>";
          }
          h += "</div>";
        });
        h += "</div>";
      }
    });

    page.innerHTML = h;
    fitPreview();
    checkOnePage();
  }
  function sectionOpen(title) { return '<div class="r-section"><div class="r-sec-title">' + esc(title) + "</div>"; }

  function fitPreview() {
    var wrap = document.querySelector(".preview-wrap");
    var holder = document.getElementById("pageHolder");
    var scaler = document.getElementById("pageScaler");
    if (!wrap || !holder || !scaler) return;
    var avail = wrap.clientWidth - 4;
    var scale = Math.min(avail / 794, 1);
    if (!isFinite(scale) || scale <= 0) scale = 0.45;
    scaler.style.transform = "scale(" + scale + ")";
    holder.style.width = (794 * scale) + "px";
    holder.style.height = (1123 * scale) + "px";
  }
  function checkOnePage() {
    var page = document.getElementById("page");
    var badge = document.getElementById("pageBadge");
    if (!page || !badge) return;
    var over = page.scrollHeight > page.clientHeight + 1;
    page.classList.toggle("over", over);
    badge.textContent = over ? "⚠ Over 1 page" : "1 page";
    badge.className = "page-badge " + (over ? "over" : "ok");

    document.body.classList.toggle("is-over", over);
    var banner = document.getElementById("overBanner");
    if (banner) banner.hidden = !over;
    // hard cap only applies on the Resumes tab (adding includes)
    var cbs = document.querySelectorAll(".pick-row.muted .include-cb");
    for (var i = 0; i < cbs.length; i++) cbs[i].disabled = over;
  }

  /* ============================================================
     TOOLBAR
     ============================================================ */
  function exportJson() {
    var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a"); a.href = url;
    a.download = (store.library.profile.name || "resume").replace(/\s+/g, "_").toLowerCase() + "_resume_data.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (parsed && parsed.sections && !parsed.library) parsed = migrateOld(parsed); // allow old exports
        store = normalize(parsed);
        renderApp(); save();
      } catch (e) { alert("Could not read that file: " + e.message); }
    };
    reader.readAsText(file);
  }
  function resetAll() {
    if (!confirm("Reset everything (library and all resumes) back to the sample? Your current data will be lost.")) return;
    store = sampleStore(); renderApp(); save();
  }

  /* ---------- init ---------- */
  function init() {
    store = load();
    renderApp();

    var tabs = document.querySelectorAll("#tabs .tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () { activeTab = this.getAttribute("data-tab"); renderApp(); });
    }
    document.getElementById("btnPdf").addEventListener("click", function () { window.print(); });
    document.getElementById("btnExport").addEventListener("click", exportJson);
    document.getElementById("btnReset").addEventListener("click", resetAll);
    var fileInput = document.getElementById("fileImport");
    document.getElementById("btnImport").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () { if (fileInput.files && fileInput.files[0]) importJson(fileInput.files[0]); fileInput.value = ""; });

    window.addEventListener("resize", fitPreview);
    setSaveState("Saved");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
