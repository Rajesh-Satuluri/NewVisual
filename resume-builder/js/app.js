/* ============================================================
   Resume Builder — NewVisual
   Multiple self-contained Resumes (edit all wording per resume) +
   a Library that stores your material for reference and reuse.
   One template, live preview, one-page PDF. localStorage only.
   ============================================================ */
(function () {
  "use strict";

  var KEY3 = "newvisual.resumedata.v3";
  var KEY2 = "newvisual.resumedata.v2";
  var KEY1 = "newvisual.resume.v1";

  /* library category -> default resume section title + type */
  var LIB_MAP = {
    summaries:   { title: "Professional Summary",   type: "text" },
    skills:      { title: "Technical Skills",         type: "labeled" },
    experiences: { title: "Professional Experience",  type: "entries" },
    projects:    { title: "Projects",                 type: "entries" },
    education:   { title: "Education",                type: "entries" },
    awards:      { title: "Awards / Achievements",    type: "labeled" }
  };
  var LIB_KEYS = ["summaries", "skills", "experiences", "projects", "education", "awards"];

  /* ---------- utils ---------- */
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function el(tag, cls, attrs) { var n = document.createElement(tag); if (cls) n.className = cls; if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
  function elText(tag, cls, txt) { var n = el(tag, cls); n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function moveIn(arr, idx, dir) { var j = idx + dir; if (j < 0 || j >= arr.length) return false; var t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; return true; }
  function autoGrow(ta) { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight, 32) + "px"; }
  function growAll(root) { var t = (root || document).querySelectorAll("textarea.inp"); for (var i = 0; i < t.length; i++) autoGrow(t[i]); }
  function classifyLib(section) {
    var t = (section.title || "").toLowerCase();
    if (section.type === "text") return "summaries";
    if (section.type === "labeled") return /award|achiev/.test(t) ? "awards" : "skills";
    if (/project/.test(t)) return "projects";
    if (/educ|academ/.test(t)) return "education";
    return "experiences";
  }

  /* ============================================================
     DATA FACTORIES
     ============================================================ */
  function sampleContent() {
    return {
      profile: {
        name: "RAJESH SATULURI", title: "Senior Data Engineer",
        contacts: [
          { icon: "✉", value: "rajesh.satuluri79@gmail.com" },
          { icon: "☎", value: "+91 8106783397" },
          { icon: "⚲", value: "Hyderabad, Telangana" }
        ]
      },
      sections: [
        { id: uid(), title: "Professional Summary", type: "text",
          text: "Senior Technical Consultant with 4+ years of experience delivering **o9 Solutions, supply chain planning, data integration, and enterprise ETL solutions** for global manufacturing clients. Experienced in **o9 platform integration, SQL, T-SQL, SSIS, Apache NiFi, REST APIs, ETL, batch processing, and real-time data pipelines** across Demand Planning, Supply Planning, Kit Planning, Order Handling, and Global Costing. Proven experience in **technical solution design, requirements analysis, integration development, troubleshooting, data quality, testing, and go-live support** with functional, product, and client teams." },
        { id: uid(), title: "Technical Skills", type: "labeled", items: [
          { id: uid(), label: "Programming & Data Processing", value: "Python, PySpark, Apache Spark, Spark SQL." },
          { id: uid(), label: "o9 Solutions Platform", value: "o9 Digital Brain, IBPL, o9 DB Designer, Enterprise Knowledge Graph, Graph Cube." },
          { id: uid(), label: "Data Integration & ETL", value: "SQL, T-SQL, SSIS, Apache NiFi, ETL, Data Integration, Batch Integration, REST APIs, SFTP." },
          { id: uid(), label: "Orchestration", value: "Apache Airflow." },
          { id: uid(), label: "Cloud & Big Data", value: "Azure: ADLS, ADF, Databricks, Synapse, Unity Catalog." },
          { id: uid(), label: "Databases", value: "SQL Server, MySQL, PostgreSQL, Snowflake." }
        ] },
        { id: uid(), title: "Professional Experience", type: "entries", items: [
          { id: uid(), heading: "o9 Solutions", role: "Senior Data Engineer", date: "Jul 2022 – Present",
            meta: "Supply chain data integration · o9 Digital Brain platform · Apache NiFi · SQL",
            bullets: [
              "Built end-to-end data integration pipelines for Supply Planning, Demand Planning, Order Handling, Kitting, and Costing workflows on the o9 Digital Brain platform.",
              "Developed ingestion, validation, transformation, deduplication, and aggregation logic across SFTP/API → SQL staging → o9 data flows; created source-to-target mappings and business transformation rules for high-volume supply-chain datasets.",
              "Delivered near-real-time integration using Apache NiFi, APIs, and SQL with watermark-based incremental processing to prevent duplicate records and reliably propagate transactional data.",
              "Developed integrations using IBPL, o9 DB Designer, Enterprise Knowledge Graph, and Graph Cube across Supply Planning, Demand Planning, Order Handling, Kitting, and Costing modules.",
              "Delivered multiple integration enhancements and major production go-lives while maintaining reliable data delivery across upstream, transformation, and o9 layers."
            ] }
        ] },
        { id: uid(), title: "Projects", type: "entries", items: [
          { id: uid(), heading: "Real-Time Data Pipeline", role: "", date: "", meta: "Kafka · Apache Flink · Apache Iceberg · Databricks · Snowflake",
            bullets: [
              "Designed a production-scale real-time pipeline using Kafka for event ingestion, Flink for stateful stream processing, Apache Iceberg for Lakehouse storage, and Snowflake for analytical serving.",
              "Implemented event-time processing, windowing, watermarking, state management, schema evolution, and fault-tolerant handling for out-of-order and late-arriving events."
            ] },
          { id: uid(), heading: "E-Commerce Batch Data Engineering Project", role: "", date: "", meta: "ADLS Gen2 · Databricks · PySpark · Apache Airflow · dbt · Delta Lake · Unity Catalog",
            bullets: [
              "Engineered an end-to-end batch data pipeline using ADLS Gen2, Databricks, PySpark, Delta Lake, and Apache Airflow, implementing a Medallion Architecture for analytics-ready e-commerce data.",
              "Implemented incremental ETL/ELT and CDC ingestion with Databricks Auto Loader and developed metadata-driven dbt/Jinja transformations, supporting schema evolution and scalable Silver-to-Gold processing.",
              "Designed SCD Type 2 dimensional models using dbt Snapshots and orchestrated workflows with Apache Airflow, incorporating data-quality checks, retries, task dependencies, Unity Catalog governance, and GitHub CI/CD."
            ] }
        ] },
        { id: uid(), title: "Education", type: "entries", items: [
          { id: uid(), heading: "NIT Tiruchirappalli — Bachelor of Technology, Production Engineering", role: "", date: "Jul 2018 – Aug 2022", meta: "", bullets: [] }
        ] },
        { id: uid(), title: "Awards / Achievements", type: "labeled", items: [
          { id: uid(), label: "Spot Award (×2) – o9 Solutions", value: "Recognized twice for exceptional contribution and on-time delivery of high-impact supply chain data integration projects." }
        ] }
      ]
    };
  }

  function emptyLibrary() { return { summaries: [], skills: [], experiences: [], projects: [], education: [], awards: [] }; }

  /* build the library reference pool from a set of sections (deep copies) */
  function libraryFromSections(sections) {
    var lib = emptyLibrary();
    (sections || []).forEach(function (sec) {
      var cat = classifyLib(sec);
      if (cat === "summaries") {
        lib.summaries.push({ id: uid(), label: sec.title || "Summary", text: sec.text || "" });
      } else if (cat === "skills" || cat === "awards") {
        (sec.items || []).forEach(function (it) { lib[cat].push({ id: uid(), label: it.label || "", value: it.value || "" }); });
      } else {
        (sec.items || []).forEach(function (it) { lib[cat].push({ id: uid(), heading: it.heading || "", role: it.role || "", date: it.date || "", meta: it.meta || "", bullets: (it.bullets || []).slice() }); });
      }
    });
    return lib;
  }

  function sampleStore() {
    var c = sampleContent();
    var resume = { id: uid(), name: "My Resume", targetRole: "", profile: c.profile, sections: c.sections };
    return { library: libraryFromSections(c.sections), resumes: [resume], activeResumeId: resume.id };
  }

  /* ---------- migrations ---------- */
  function migrateV1(old) {
    var resume = {
      id: uid(), name: "My Resume", targetRole: "",
      profile: { name: old.name || "", title: old.title || "", contacts: (old.contacts || []).slice() },
      sections: (old.sections || []).map(function (s) { var c = clone(s); c.id = c.id || uid(); return c; })
    };
    return { library: libraryFromSections(resume.sections), resumes: [resume], activeResumeId: resume.id };
  }
  function sectionsFromV2Resume(r2, lib2) {
    var out = [];
    (r2.sectionOrder || []).forEach(function (key) {
      var map = LIB_MAP[key]; if (!map) return;
      if (key === "summaries" || key === "summary") { /* handled below */ }
      if (key === "summary") { key = "summaries"; }
      if (key === "summaries") {
        var s = byId(lib2.summaries || [], r2.summaryId);
        if (s && s.text) out.push({ id: uid(), title: LIB_MAP.summaries.title, type: "text", text: s.text });
        return;
      }
      var ids = (r2.picks && r2.picks[key]) || [];
      var items = ids.map(function (id) { return byId(lib2[key] || [], id); }).filter(Boolean).map(function (it) { var c = clone(it); c.id = uid(); return c; });
      if (items.length) out.push({ id: uid(), title: map.title, type: map.type, items: items });
    });
    return out;
  }
  function migrateV2(v2) {
    var lib2 = v2.library || {};
    var resumes = (v2.resumes || []).map(function (r2) {
      return { id: uid(), name: r2.name || "Resume", targetRole: r2.targetRole || "",
        profile: clone(lib2.profile || { name: "", title: "", contacts: [] }),
        sections: sectionsFromV2Resume(r2, lib2) };
    });
    if (!resumes.length) return sampleStore();
    var library = emptyLibrary();
    LIB_KEYS.forEach(function (k) { library[k] = (lib2[k] || []).map(function (x) { return clone(x); }); });
    return { library: library, resumes: resumes, activeResumeId: resumes[0].id };
  }

  /* ============================================================
     STATE
     ============================================================ */
  var store, activeTab = "resumes", collapsed = {}, saveTimer = null;

  function load() {
    try { var r3 = localStorage.getItem(KEY3); if (r3) return normalize(JSON.parse(r3)); } catch (e) {}
    try { var r2 = localStorage.getItem(KEY2); if (r2) { var m = migrateV2(JSON.parse(r2)); persist(m); return m; } } catch (e) {}
    try { var r1 = localStorage.getItem(KEY1); if (r1) { var m1 = migrateV1(JSON.parse(r1)); persist(m1); return m1; } } catch (e) {}
    return sampleStore();
  }
  function normalize(s) {
    if (!s || !Array.isArray(s.resumes) || !s.resumes.length) return sampleStore();
    s.library = s.library || emptyLibrary();
    LIB_KEYS.forEach(function (k) { s.library[k] = s.library[k] || []; });
    s.resumes.forEach(function (r) {
      r.profile = r.profile || { name: "", title: "", contacts: [] };
      r.profile.contacts = r.profile.contacts || [];
      r.sections = r.sections || [];
    });
    if (!s.activeResumeId || !byId(s.resumes, s.activeResumeId)) s.activeResumeId = s.resumes[0].id;
    return s;
  }
  function persist(s) { try { localStorage.setItem(KEY3, JSON.stringify(s)); } catch (e) {} }
  function save() { persist(store); setSaveState("Saved"); }
  function setSaveState(txt, dirty) { var s = document.getElementById("saveState"); if (!s) return; s.textContent = txt; s.classList.toggle("dirty", !!dirty); }
  function touch() { setSaveState("Saving…", true); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); renderPreview(); }
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
  function miniBtn(txt, onClick, extra) { var b = el("button", "btn btn-mini" + (extra ? " " + extra : "")); b.type = "button"; b.textContent = txt; b.addEventListener("click", onClick); return b; }
  function blockEl(titleText, collapseKey, buildBody, headRight, headInput) {
    var b = el("div", "block");
    if (collapsed[collapseKey]) b.classList.add("collapsed");
    var head = el("div", "block-head"); head.title = "Click to collapse / expand";
    head.appendChild(elText("span", "caret", "▼"));
    if (headInput) head.appendChild(headInput); else head.appendChild(elText("span", "sec-title", titleText));
    if (headRight) { for (var i = 0; i < headRight.length; i++) head.appendChild(headRight[i]); }
    head.addEventListener("click", function (e) {
      if (e.target.closest("input, button, .move, select")) return;
      collapsed[collapseKey] = !collapsed[collapseKey];
      b.classList.toggle("collapsed", collapsed[collapseKey]);
      if (!collapsed[collapseKey]) growAll(b);
    });
    b.appendChild(head);
    var wrap = el("div", "block-body-wrap"), body = el("div", "block-body");
    buildBody(body); wrap.appendChild(body); b.appendChild(wrap);
    return b;
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
     RESUMES TAB — pick a resume and edit ALL its content
     ============================================================ */
  function renderResumes(panel) {
    /* switcher */
    var switcher = el("div", "resume-switcher");
    store.resumes.forEach(function (r) {
      var chip = el("button", "resume-chip" + (r.id === store.activeResumeId ? " active" : "")); chip.type = "button";
      chip.appendChild(elText("span", "rc-name", r.name || "Untitled"));
      if (r.targetRole) chip.appendChild(elText("span", "rc-role", r.targetRole));
      chip.addEventListener("click", function () { store.activeResumeId = r.id; renderApp(); });
      switcher.appendChild(chip);
    });
    panel.appendChild(switcher);
    var r = activeResume();
    var actions = el("div", "resume-actions");
    actions.appendChild(miniBtn("＋ New resume", newResume));
    actions.appendChild(miniBtn("⧉ Duplicate", duplicateResume));
    actions.appendChild(miniBtn("🗑 Delete", function () { deleteResume(activeResume()); }, "btn-danger"));
    panel.appendChild(actions);
    var banner = el("div", "over-banner"); banner.id = "overBanner"; banner.hidden = true;
    banner.innerHTML = "⚠ This resume exceeds one page. Trim or shorten content — <strong>Add</strong> buttons are disabled until it fits.";
    panel.appendChild(banner);

    /* resume meta */
    panel.appendChild(blockEl("Resume settings", "r.settings", function (body) {
      body.appendChild(fieldInput("Resume name", r.name, function (v) { r.name = v; touch(); }));
      body.appendChild(fieldInput("Target role / company (your reference)", r.targetRole, function (v) { r.targetRole = v; touch(); }));
      var del = miniBtn("Delete this resume", function () { deleteResume(r); }, "btn-danger"); del.classList.remove("btn-mini");
      var w = el("div"); w.style.marginTop = "4px"; w.appendChild(del); body.appendChild(w);
    }));

    /* header (identity) */
    panel.appendChild(headerBlock(r));

    /* sections */
    r.sections.forEach(function (sec, idx) { panel.appendChild(sectionBlock(r, sec, idx)); });

    /* add section + add from library */
    var foot = el("div", "foot-actions");
    foot.appendChild(miniBtn("＋ Add custom section", function () {
      r.sections.push({ id: uid(), title: "New Section", type: "entries", items: [] }); renderApp(); touch();
      var ed = document.getElementById("editor"); ed.scrollTop = ed.scrollHeight;
    }, "js-add"));
    foot.appendChild(miniBtn("📚 Add from Library…", function () { openLibraryInsert(r); }, "js-add"));
    panel.appendChild(foot);
  }

  function headerBlock(r) {
    return blockEl("Header", "r.header", function (body) {
      body.appendChild(fieldInput("Full name", r.profile.name, function (v) { r.profile.name = v; touch(); }));
      body.appendChild(fieldInput("Role / title", r.profile.title, function (v) { r.profile.title = v; touch(); }));
      var bar = el("div", "item-bar");
      bar.appendChild(elText("span", "lbl", "Contact details"));
      bar.appendChild(miniBtn("＋ Add contact", function () { r.profile.contacts.push({ icon: "•", value: "" }); renderApp(); touch(); }, "js-add"));
      body.appendChild(bar);
      r.profile.contacts.forEach(function (c, i) {
        var row = el("div", "bullet-row");
        var icon = el("input", "inp"); icon.value = c.icon; icon.style.maxWidth = "52px"; icon.title = "Icon";
        icon.addEventListener("input", function () { c.icon = icon.value; touch(); });
        var val = el("input", "inp"); val.value = c.value; val.placeholder = "email / phone / location / link";
        val.addEventListener("input", function () { c.value = val.value; touch(); });
        row.appendChild(icon); row.appendChild(val);
        row.appendChild(miniBtn("✕", function () { r.profile.contacts.splice(i, 1); renderApp(); touch(); }, "btn-danger"));
        body.appendChild(row);
      });
    });
  }

  function sectionBlock(r, sec, idx) {
    var titleInput = el("input", "sec-title"); titleInput.value = sec.title; titleInput.title = "Edit section heading";
    titleInput.addEventListener("input", function () { sec.title = titleInput.value; touch(); });

    var up = el("span", "move"); up.textContent = "▲"; up.title = "Move section up";
    up.addEventListener("click", function () { if (moveIn(r.sections, idx, -1)) { renderApp(); touch(); } });
    var down = el("span", "move"); down.textContent = "▼"; down.title = "Move section down";
    down.addEventListener("click", function () { if (moveIn(r.sections, idx, 1)) { renderApp(); touch(); } });
    var star = miniBtn("★ Save to Library", function () { saveSectionToLibrary(sec); }, "js-add");
    var del = miniBtn("Delete", function () { if (confirm("Delete section \"" + sec.title + "\"?")) { r.sections.splice(idx, 1); renderApp(); touch(); } }, "btn-danger");

    return blockEl(sec.title, "r.sec." + sec.id, function (body) {
      if (sec.type === "text") {
        body.appendChild(fieldTextarea("Paragraph (use **bold**)", sec.text, function (v) { sec.text = v; touch(); }));
      } else if (sec.type === "labeled") {
        renderLabeledEditor(body, sec, true);
      } else {
        renderEntriesEditor(body, sec, true);
      }
      body.appendChild(typeSwitcher(sec));
    }, [up, down, star, del], titleInput);
  }

  function renderLabeledEditor(body, sec, allowSave) {
    sec.items = sec.items || [];
    var bar = el("div", "item-bar");
    bar.appendChild(elText("span", "lbl", "Rows (side-heading : text)"));
    bar.appendChild(miniBtn("＋ Add row", function () { sec.items.push({ id: uid(), label: "", value: "" }); renderApp(); touch(); }, "js-add"));
    body.appendChild(bar);
    sec.items.forEach(function (it, i) {
      var wrap = el("div", "item");
      var top = el("div", "item-bar");
      top.appendChild(elText("span", "lbl", it.label || ("Row " + (i + 1))));
      var tools = el("div", "item-tools");
      tools.appendChild(miniBtn("▲", function () { if (moveIn(sec.items, i, -1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("▼", function () { if (moveIn(sec.items, i, 1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("✕", function () { sec.items.splice(i, 1); renderApp(); touch(); }, "btn-danger"));
      top.appendChild(tools); wrap.appendChild(top);
      wrap.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
      wrap.appendChild(fieldTextarea("Skills / text", it.value, function (v) { it.value = v; touch(); }));
      body.appendChild(wrap);
    });
  }

  function renderEntriesEditor(body, sec, allowSave) {
    sec.items = sec.items || [];
    var bar = el("div", "item-bar");
    bar.appendChild(elText("span", "lbl", "Entries"));
    bar.appendChild(miniBtn("＋ Add entry", function () { sec.items.push({ id: uid(), heading: "", role: "", date: "", meta: "", bullets: [] }); renderApp(); touch(); }, "js-add"));
    body.appendChild(bar);
    sec.items.forEach(function (it, i) {
      var wrap = el("div", "item");
      var top = el("div", "item-bar");
      top.appendChild(elText("span", "lbl", it.heading || ("Entry " + (i + 1))));
      var tools = el("div", "item-tools");
      tools.appendChild(miniBtn("▲", function () { if (moveIn(sec.items, i, -1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("▼", function () { if (moveIn(sec.items, i, 1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("✕", function () { sec.items.splice(i, 1); renderApp(); touch(); }, "btn-danger"));
      top.appendChild(tools); wrap.appendChild(top);
      wrap.appendChild(fieldInput("Company / project / school", it.heading, function (v) { it.heading = v; touch(); }));
      var r2 = el("div", "row-2");
      r2.appendChild(fieldInput("Role / title (optional)", it.role, function (v) { it.role = v; touch(); }));
      r2.appendChild(fieldInput("Date range", it.date, function (v) { it.date = v; touch(); }));
      wrap.appendChild(r2);
      wrap.appendChild(fieldInput("Meta / tech line", it.meta, function (v) { it.meta = v; touch(); }));
      var bbar = el("div", "item-bar");
      bbar.appendChild(elText("span", "lbl", "Bullet points"));
      bbar.appendChild(miniBtn("＋ Add bullet", function () { it.bullets.push(""); renderApp(); touch(); }, "js-add"));
      wrap.appendChild(bbar);
      var bl = el("div", "bullets");
      (it.bullets || []).forEach(function (bt, bi) {
        var row = el("div", "bullet-row");
        var ta = el("textarea", "inp"); ta.value = bt;
        ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
        row.appendChild(ta);
        row.appendChild(miniBtn("✕", function () { it.bullets.splice(bi, 1); renderApp(); touch(); }, "btn-danger"));
        bl.appendChild(row);
      });
      wrap.appendChild(bl);
      body.appendChild(wrap);
    });
  }

  function typeSwitcher(sec) {
    var holder = el("div");
    var lw = el("div", "field layout-wrap");
    var toggle = miniBtn("⚙ Layout", function () { lw.classList.toggle("open"); }); toggle.classList.add("layout-toggle");
    lw.appendChild(elText("label", null, "Section layout"));
    var sel = el("select", "inp");
    [["text", "Paragraph"], ["labeled", "Labeled rows (heading : text)"], ["entries", "Entries (title, date, bullets)"]].forEach(function (o) {
      var opt = el("option"); opt.value = o[0]; opt.textContent = o[1]; if (sec.type === o[0]) opt.selected = true; sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      if (sel.value === sec.type) return;
      sec.type = sel.value;
      if (sec.type === "text" && typeof sec.text !== "string") sec.text = "";
      if ((sec.type === "labeled" || sec.type === "entries") && !Array.isArray(sec.items)) sec.items = [];
      renderApp(); touch();
    });
    lw.appendChild(sel);
    holder.appendChild(toggle); holder.appendChild(lw);
    return holder;
  }

  /* ---------- resume CRUD ---------- */
  function newResume() {
    // start from the full standard template (all sections present) so a new
    // resume has everything ready to tailor, not a blank document
    var c = sampleContent();
    var r = { id: uid(), name: "New Resume", targetRole: "",
      profile: { name: c.profile.name, title: c.profile.title, contacts: clone(c.profile.contacts) },
      sections: clone(c.sections) };
    r.sections.forEach(function (s) { s.id = uid(); (s.items || []).forEach(function (it) { it.id = uid(); }); });
    store.resumes.push(r); store.activeResumeId = r.id; renderApp(); touch();
  }
  function duplicateResume() {
    var src = activeResume(); var copy = clone(src); copy.id = uid(); copy.name = (src.name || "Resume") + " (copy)";
    copy.sections.forEach(function (s) { s.id = uid(); (s.items || []).forEach(function (it) { it.id = uid(); }); });
    store.resumes.push(copy); store.activeResumeId = copy.id; renderApp(); touch();
  }
  function deleteResume(r) {
    if (store.resumes.length <= 1) { alert("You need at least one resume. Create another before deleting this one."); return; }
    if (!confirm("Delete resume \"" + (r.name || "Untitled") + "\"?")) return;
    var idx = store.resumes.indexOf(r); store.resumes.splice(idx, 1);
    store.activeResumeId = store.resumes[Math.max(0, idx - 1)].id; renderApp(); touch();
  }

  /* ============================================================
     LIBRARY  <->  RESUME transfer
     ============================================================ */
  function saveSectionToLibrary(sec) {
    var cat = classifyLib(sec);
    if (cat === "summaries") store.library.summaries.push({ id: uid(), label: sec.title || "Summary", text: sec.text || "" });
    else if (cat === "skills" || cat === "awards") (sec.items || []).forEach(function (it) { store.library[cat].push({ id: uid(), label: it.label || "", value: it.value || "" }); });
    else (sec.items || []).forEach(function (it) { store.library[cat].push({ id: uid(), heading: it.heading || "", role: it.role || "", date: it.date || "", meta: it.meta || "", bullets: (it.bullets || []).slice() }); });
    save();
    flash("Saved “" + (sec.title || "section") + "” to your Library.");
  }

  function copyLibraryItemToResume(r, catKey, item) {
    var map = LIB_MAP[catKey];
    if (catKey === "summaries") {
      // set/replace the resume's summary text section
      var s = findSection(r, map.title, "text");
      if (!s) { s = { id: uid(), title: map.title, type: "text", text: "" }; r.sections.unshift(s); }
      s.text = item.text || "";
    } else if (catKey === "skills" || catKey === "awards") {
      var sec = findSection(r, map.title, "labeled");
      if (!sec) { sec = { id: uid(), title: map.title, type: "labeled", items: [] }; r.sections.push(sec); }
      sec.items.push({ id: uid(), label: item.label || "", value: item.value || "" });
    } else {
      var e = findSection(r, map.title, "entries");
      if (!e) { e = { id: uid(), title: map.title, type: "entries", items: [] }; r.sections.push(e); }
      e.items.push({ id: uid(), heading: item.heading || "", role: item.role || "", date: item.date || "", meta: item.meta || "", bullets: (item.bullets || []).slice() });
    }
    renderApp(); touch();
  }
  function findSection(r, title, type) {
    var t = title.toLowerCase();
    for (var i = 0; i < r.sections.length; i++) { var s = r.sections[i]; if (s.type === type && (s.title || "").toLowerCase() === t) return s; }
    return null;
  }

  function libItemName(catKey, it) {
    if (catKey === "skills" || catKey === "awards") return it.label || "(untitled)";
    if (catKey === "summaries") return it.label || "(untitled summary)";
    return (it.heading || "(untitled)") + (it.role ? " — " + it.role : "");
  }

  /* modal to insert library items into the active resume */
  function openLibraryInsert(r) {
    var overlay = el("div", "modal-overlay");
    var modal = el("div", "modal");
    modal.appendChild(elText("h3", "modal-title", "Add from Library → " + (r.name || "resume")));
    var anyContent = false;
    LIB_KEYS.forEach(function (catKey) {
      var arr = store.library[catKey]; if (!arr.length) return;
      anyContent = true;
      modal.appendChild(elText("div", "modal-cat", LIB_MAP[catKey].title));
      arr.forEach(function (it) {
        var row = el("div", "modal-row");
        row.appendChild(elText("span", "modal-name", libItemName(catKey, it)));
        row.appendChild(miniBtn("Add", function () { copyLibraryItemToResume(r, catKey, it); flash("Added to " + (r.name || "resume") + "."); }));
        modal.appendChild(row);
      });
    });
    if (!anyContent) modal.appendChild(elText("p", "hint", "Your Library is empty. Save sections to it with “★ Save to Library”, or add items in the Library tab."));
    var close = miniBtn("Done", function () { document.body.removeChild(overlay); }); close.classList.add("modal-close");
    modal.appendChild(close);
    overlay.appendChild(modal);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  function flash(msg) {
    var f = el("div", "toast"); f.textContent = msg; document.body.appendChild(f);
    setTimeout(function () { f.classList.add("show"); }, 10);
    setTimeout(function () { f.classList.remove("show"); setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 300); }, 1800);
  }

  /* ============================================================
     LIBRARY TAB — your document store (edit reference material)
     ============================================================ */
  function renderLibrary(panel) {
    panel.appendChild(elText("p", "panel-hint", "Your personal document store — keep all your material here for reference and reuse. Use “Add from Library” inside a resume to pull items in. Editing here does not change any resume."));
    libBlock(panel, "Professional Summaries", "summaries", function () { store.library.summaries.push({ id: uid(), label: "New summary", text: "" }); }, function (body, it) {
      body.appendChild(fieldInput("Label (your reference)", it.label, function (v) { it.label = v; touch(); }));
      body.appendChild(fieldTextarea("Summary text (use **bold**)", it.text, function (v) { it.text = v; touch(); }));
    });
    libBlock(panel, "Technical Skills", "skills", function () { store.library.skills.push({ id: uid(), label: "", value: "" }); }, function (body, it) {
      body.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
      body.appendChild(fieldTextarea("Skills / text", it.value, function (v) { it.value = v; touch(); }));
    });
    ["experiences", "projects", "education"].forEach(function (cat) {
      var titleMap = { experiences: "Work Experience", projects: "Projects", education: "Education" };
      libBlock(panel, titleMap[cat], cat, function () { store.library[cat].push({ id: uid(), heading: "", role: "", date: "", meta: "", bullets: [] }); }, function (body, it) {
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
        (it.bullets || []).forEach(function (bt, bi) {
          var row = el("div", "bullet-row");
          var ta = el("textarea", "inp"); ta.value = bt;
          ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
          row.appendChild(ta);
          row.appendChild(miniBtn("✕", function () { it.bullets.splice(bi, 1); renderApp(); touch(); }, "btn-danger"));
          bl.appendChild(row);
        });
        body.appendChild(bl);
      });
    });
    libBlock(panel, "Awards / Achievements", "awards", function () { store.library.awards.push({ id: uid(), label: "", value: "" }); }, function (body, it) {
      body.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
      body.appendChild(fieldTextarea("Description", it.value, function (v) { it.value = v; touch(); }));
    });
  }

  function libBlock(panel, title, catKey, addFn, itemBody) {
    var arr = store.library[catKey];
    var add = miniBtn("＋ Add", function () { addFn(); renderApp(); touch(); });
    panel.appendChild(blockEl(title + " (" + arr.length + ")", "lib." + catKey, function (body) {
      if (!arr.length) body.appendChild(elText("p", "hint", "No items yet."));
      arr.forEach(function (it, i) {
        var wrap = el("div", "item");
        var top = el("div", "item-bar");
        top.appendChild(elText("span", "lbl", libItemName(catKey, it) || (title + " " + (i + 1))));
        var tools = el("div", "item-tools");
        tools.appendChild(miniBtn("＋ To resume", function () { copyLibraryItemToResume(activeResume(), catKey, it); flash("Added to " + (activeResume().name || "resume") + "."); }, "js-add"));
        tools.appendChild(miniBtn("▲", function () { if (moveIn(arr, i, -1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("▼", function () { if (moveIn(arr, i, 1)) { renderApp(); touch(); } }));
        tools.appendChild(miniBtn("✕", function () { if (confirm("Delete this library item?")) { arr.splice(i, 1); renderApp(); touch(); } }, "btn-danger"));
        top.appendChild(tools); wrap.appendChild(top);
        itemBody(wrap, it);
        body.appendChild(wrap);
      });
    }, [add]));
  }

  /* ============================================================
     PREVIEW (active resume)
     ============================================================ */
  function renderPreview() {
    var page = document.getElementById("page");
    var r = activeResume();
    var label = document.getElementById("previewLabel");
    if (label) label.textContent = "Preview · A4 · " + (r ? (r.name || "Untitled") : "");
    if (!r) { page.innerHTML = ""; return; }
    var p = r.profile;
    var h = '<div class="r-name">' + esc(p.name || "Your Name") + "</div>";
    if (p.title) h += '<div class="r-title">' + esc(p.title) + "</div>";
    var contacts = (p.contacts || []).filter(function (c) { return c.value; });
    if (contacts.length) h += '<div class="r-contacts">' + contacts.map(function (c) { return '<span class="ico">' + esc(c.icon) + "</span>" + esc(c.value); }).join('<span class="sep">|</span>') + "</div>";

    r.sections.forEach(function (sec) {
      h += '<div class="r-section"><div class="r-sec-title">' + esc(sec.title || "Section") + "</div>";
      if (sec.type === "text") {
        h += '<div class="r-text">' + (sec.text ? rich(sec.text) : '<span class="r-empty">—</span>') + "</div>";
      } else if (sec.type === "labeled") {
        (sec.items || []).forEach(function (it) { h += '<div class="r-labeled-row"><span class="lab">' + esc(it.label) + (it.label ? ": " : "") + "</span>" + rich(it.value) + "</div>"; });
      } else {
        (sec.items || []).forEach(function (it) {
          h += '<div class="r-entry"><div class="r-entry-head"><span class="r-entry-title">' + esc(it.heading) + "</span>";
          if (it.date) h += '<span class="r-entry-date">' + esc(it.date) + "</span>";
          h += "</div>";
          if (it.role) h += '<div class="r-entry-role">' + esc(it.role) + "</div>";
          if (it.meta) h += '<div class="r-entry-meta">' + esc(it.meta) + "</div>";
          if (it.bullets && it.bullets.length) { h += '<ul class="r-bullets">'; it.bullets.forEach(function (bt) { if (bt) h += "<li>" + rich(bt) + "</li>"; }); h += "</ul>"; }
          h += "</div>";
        });
      }
      h += "</div>";
    });
    page.innerHTML = h;
    fitPreview(); checkOnePage();
  }

  function fitPreview() {
    var wrap = document.querySelector(".preview-wrap"), holder = document.getElementById("pageHolder"), scaler = document.getElementById("pageScaler");
    if (!wrap || !holder || !scaler) return;
    var avail = wrap.clientWidth - 4, scale = Math.min(avail / 794, 1);
    if (!isFinite(scale) || scale <= 0) scale = 0.45;
    scaler.style.transform = "scale(" + scale + ")";
    holder.style.width = (794 * scale) + "px"; holder.style.height = (1123 * scale) + "px";
  }
  function checkOnePage() {
    var page = document.getElementById("page"), badge = document.getElementById("pageBadge");
    if (!page || !badge) return;
    var over = page.scrollHeight > page.clientHeight + 1;
    page.classList.toggle("over", over);
    badge.textContent = over ? "⚠ Over 1 page" : "1 page";
    badge.className = "page-badge " + (over ? "over" : "ok");
    document.body.classList.toggle("is-over", over);
    var banner = document.getElementById("overBanner"); if (banner) banner.hidden = !over;
    var adders = document.querySelectorAll("#tabPanel .btn.js-add");
    for (var i = 0; i < adders.length; i++) adders[i].disabled = over;
  }

  /* ============================================================
     TOOLBAR
     ============================================================ */
  function exportJson() {
    var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = el("a"); a.href = url;
    a.download = (activeResume().profile.name || "resume").replace(/\s+/g, "_").toLowerCase() + "_resume_data.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (parsed && parsed.sections && !parsed.resumes) parsed = migrateV1(parsed);
        else if (parsed && parsed.resumes && parsed.resumes[0] && parsed.resumes[0].picks) parsed = migrateV2(parsed);
        store = normalize(parsed); renderApp(); save();
      } catch (e) { alert("Could not read that file: " + e.message); }
    };
    reader.readAsText(file);
  }
  function resetAll() { if (!confirm("Reset everything (all resumes and library) back to the sample? Your current data will be lost.")) return; store = sampleStore(); renderApp(); save(); }

  function init() {
    store = load(); renderApp();
    var tabs = document.querySelectorAll("#tabs .tab");
    for (var i = 0; i < tabs.length; i++) tabs[i].addEventListener("click", function () { activeTab = this.getAttribute("data-tab"); renderApp(); });
    document.getElementById("btnPdf").addEventListener("click", function () { window.print(); });
    document.getElementById("btnExport").addEventListener("click", exportJson);
    document.getElementById("btnReset").addEventListener("click", resetAll);
    var fileInput = document.getElementById("fileImport");
    document.getElementById("btnImport").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () { if (fileInput.files && fileInput.files[0]) importJson(fileInput.files[0]); fileInput.value = ""; });
    window.addEventListener("resize", fitPreview);
    setSaveState("Saved");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
