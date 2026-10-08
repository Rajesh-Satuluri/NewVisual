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
  function growAll(root) { var t = (root || document).querySelectorAll("textarea.inp:not(.ai-textarea)"); for (var i = 0; i < t.length; i++) autoGrow(t[i]); }
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
    return { library: libraryFromSections(c.sections), resumes: [resume], activeResumeId: resume.id, aiAssist: { fields: {}, jd: "" } };
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
      /* one-time repair: ensure a Professional Summary section exists
         (older migrations could drop it). Guarded so an intentional delete
         is not undone on the next load. */
      if (!r.ensuredSummary) {
        var hasText = r.sections.some(function (sec) { return sec.type === "text"; });
        if (!hasText) r.sections.unshift({ id: uid(), title: "Professional Summary", type: "text", text: "" });
        r.ensuredSummary = true;
      }
    });
    if (!s.activeResumeId || !byId(s.resumes, s.activeResumeId)) s.activeResumeId = s.resumes[0].id;
    s.aiAssist = s.aiAssist || {};
    if (typeof s.aiAssist.jd !== "string") s.aiAssist.jd = "";
    s.aiAssist.fields = s.aiAssist.fields || {};
    /* migrate the old single vault textarea into the new per-section fields */
    if (typeof s.aiAssist.vault === "string" && s.aiAssist.vault.trim()) {
      s.aiAssist.fields.other = (s.aiAssist.fields.other ? s.aiAssist.fields.other + "\n\n" : "") + s.aiAssist.vault;
    }
    delete s.aiAssist.vault;
    if (!Array.isArray(s.snippets)) s.snippets = [];
    return s;
  }
  function persist(s) { try { localStorage.setItem(KEY3, JSON.stringify(s)); } catch (e) {} }
  function save() { persist(store); setSaveState("Saved"); }
  function setSaveState(txt, dirty) { var s = document.getElementById("saveState"); if (!s) return; s.textContent = txt; s.classList.toggle("dirty", !!dirty); }
  function touch() { setSaveState("Saving…", true); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); renderPreview(); }
  function scheduleSave() { setSaveState("Saving…", true); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
  function copyText(str, okMsg) {
    function done() { flash(okMsg || "Copied to clipboard."); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(done, function () { fallbackCopy(str); done(); });
    } else { fallbackCopy(str); done(); }
  }
  function fallbackCopy(str) {
    var ta = document.createElement("textarea"); ta.value = str;
    ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta);
    ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
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
  function miniBtn(txt, onClick, extra) { var b = el("button", "btn btn-mini" + (extra ? " " + extra : "")); b.type = "button"; b.textContent = txt; b.addEventListener("click", onClick); return b; }
  /* pick a glyph for a section so the stack of blocks is scannable, not uniform */
  function iconFor(title) {
    var t = (title || "").toLowerCase();
    if (/setting|config/.test(t)) return "⚙️";
    if (/header|identity|personal|detail/.test(t)) return "👤";
    if (/summary|profile|objective|about|overview/.test(t)) return "📝";
    if (/experience|employ|work history|career/.test(t)) return "💼";
    if (/project/.test(t)) return "🚀";
    if (/skill|competenc|technolog|tool|tech stack/.test(t)) return "🛠️";
    if (/education|academ|degree|school|college/.test(t)) return "🎓";
    if (/certif|licen|course|training/.test(t)) return "📜";
    if (/achiev|award|honor|accomplish/.test(t)) return "🏆";
    if (/contact|reach/.test(t)) return "✉️";
    if (/language/.test(t)) return "🌐";
    if (/publication|research|paper/.test(t)) return "📚";
    if (/volunteer|interest|hobb|activit/.test(t)) return "🌟";
    return "📄";
  }
  function blockEl(titleText, collapseKey, buildBody, headRight, headInput) {
    var b = el("div", "block");
    if (collapsed[collapseKey]) b.classList.add("collapsed");
    var head = el("div", "block-head"); head.title = "Click to collapse / expand";
    head.appendChild(elText("span", "caret", "▼"));
    head.appendChild(elText("span", "sec-icon", iconFor(titleText || (headInput && headInput.value))));
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
    else if (activeTab === "ats") renderAts(panel);
    else if (activeTab === "ai") renderAi(panel);
    else if (activeTab === "jd") renderJdMatch(panel);
    else if (activeTab === "health") renderHealth(panel);
    else renderResumes(panel);
    growAll(panel);

    /* right panel: resume preview normally, big field editor on AI tab */
    document.body.classList.toggle("ai-active", activeTab === "ai");
    if (activeTab === "ai") renderAiPane();
    else renderPreview();
  }

  /* ============================================================
     RESUMES TAB — pick a resume and edit ALL its content
     ============================================================ */
  function renderResumes(panel) {
    /* switcher */
    panel.appendChild(elText("div", "group-label", "Your resumes — click to edit"));
    var switcher = el("div", "resume-switcher");
    store.resumes.forEach(function (r) {
      var isActive = r.id === store.activeResumeId;
      var chip = el("button", "resume-chip" + (isActive ? " active" : "")); chip.type = "button";
      if (isActive) chip.appendChild(elText("span", "rc-check", "✓ Editing"));
      chip.appendChild(elText("span", "rc-name", r.name || "Untitled"));
      if (r.targetRole) chip.appendChild(elText("span", "rc-role", r.targetRole));
      chip.addEventListener("click", function () { store.activeResumeId = r.id; renderApp(); });
      switcher.appendChild(chip);
    });
    panel.appendChild(switcher);
    var r = activeResume();
    var actions = el("div", "resume-actions");
    actions.appendChild(miniBtn("＋ New resume", newResume, "btn-primary"));
    actions.appendChild(miniBtn("⧉ Duplicate", duplicateResume));
    actions.appendChild(miniBtn("🗑 Delete", function () { deleteResume(activeResume()); }, "btn-danger"));
    var spacer = el("span"); spacer.style.flex = "1"; actions.appendChild(spacer);
    actions.appendChild(miniBtn("⊕ Expand all", function () { setAllCollapsed(false); }));
    actions.appendChild(miniBtn("⊖ Collapse all", function () { setAllCollapsed(true); }));
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

  /* ---------- Snippet / bullet bank ----------
     A reusable library of your best bullet phrasings, stored with your data
     (so it exports/imports and syncs through the same JSON). Save any bullet,
     then drop it into any entry when tailoring a resume to a new role. */
  function saveSnippet(text) {
    text = (text || "").trim();
    if (!text) return false;
    store.snippets = store.snippets || [];
    if (store.snippets.some(function (s) { return s.text.trim() === text; })) return false;
    store.snippets.unshift({ id: uid(), text: text });
    return true;
  }
  function removeSnippet(id) {
    store.snippets = (store.snippets || []).filter(function (s) { return s.id !== id; });
  }
  /* Inline, toggleable picker that inserts a saved bullet into `it`. */
  function bankPicker(it) {
    var pop = el("div", "bank-pop");
    function build() {
      pop.innerHTML = "";
      var snips = store.snippets || [];
      if (!snips.length) { pop.appendChild(elText("p", "bank-empty", "No saved bullets yet. Use ☆ on any bullet to save it here.")); return; }
      pop.appendChild(elText("p", "bank-head", "Click to insert into this entry:"));
      snips.forEach(function (s) {
        var row = el("div", "bank-item");
        var pick = el("button", "bank-pick"); pick.type = "button"; pick.textContent = s.text;
        pick.title = "Insert this bullet";
        pick.addEventListener("click", function () { it.bullets.push(s.text); renderApp(); touch(); });
        row.appendChild(pick);
        var del = el("button", "bank-del"); del.type = "button"; del.textContent = "✕"; del.title = "Remove from bank";
        del.addEventListener("click", function () { removeSnippet(s.id); build(); touch(); });
        row.appendChild(del);
        pop.appendChild(row);
      });
    }
    build();
    return pop;
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
      var bbtns = el("div", "item-tools");
      bbtns.appendChild(miniBtn("＋ Add bullet", function () { it.bullets.push(""); renderApp(); touch(); }, "js-add"));
      var pop = bankPicker(it);
      var bankCount = (store.snippets || []).length;
      bbtns.appendChild(miniBtn("⇭ From bank" + (bankCount ? " (" + bankCount + ")" : ""), function () { pop.classList.toggle("open"); }, "js-bank"));
      bbar.appendChild(bbtns);
      wrap.appendChild(bbar);
      wrap.appendChild(pop);
      var bl = el("div", "bullets");
      (it.bullets || []).forEach(function (bt, bi) {
        var row = el("div", "bullet-row");
        var ta = el("textarea", "inp"); ta.value = bt;
        ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
        row.appendChild(ta);
        row.appendChild(miniBtn("☆", function () {
          if (saveSnippet(it.bullets[bi])) { flash("Saved to bullet bank."); touch(); renderApp(); }
          else flash((it.bullets[bi] || "").trim() ? "Already in your bank." : "Write the bullet first.");
        }, "js-star"));
        row.appendChild(miniBtn("✕", function () { it.bullets.splice(bi, 1); renderApp(); touch(); }, "btn-danger"));
        bl.appendChild(row);
        if (bt && bt.trim() && !/\d/.test(bt)) bl.appendChild(elText("div", "quant-nudge", "＋ add a metric (%, $, #, time) to strengthen this"));
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

  /* expand / collapse every block of the active resume */
  function setAllCollapsed(val) {
    var r = activeResume();
    collapsed["r.settings"] = val;
    collapsed["r.header"] = val;
    r.sections.forEach(function (s) { collapsed["r.sec." + s.id] = val; });
    renderApp();
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
     AI ASSIST TAB — vault + JD -> one paste-ready prompt
     ============================================================ */
  var AI_PROMPT = [
    "You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.",
    "",
    "I will give you (1) MY BACKGROUND — my real skills, projects, and experience — and (2) a TARGET JOB DESCRIPTION. Using ONLY the facts in my background (never invent employers, job titles, dates, metrics, or experience I don't have), rewrite my content to score as highly as possible against the job description in an ATS.",
    "",
    "Do the following:",
    "1. Extract the most important hard skills, tools, and keywords from the job description (keep their exact spelling).",
    "2. Produce these sections, ready to paste into a one-page resume:",
    "   - PROFESSIONAL SUMMARY: 3–4 lines, no first-person pronouns, leading with my title + years of experience, packed with the job's top keywords that I genuinely match.",
    "   - TECHNICAL SKILLS: grouped into clear categories (e.g. Languages, Cloud, Data/ETL, Databases). Each line as \"Category: comma, separated, list\", prioritizing the required skills from the JD that I actually have.",
    "   - PROFESSIONAL EXPERIENCE: for each role keep my real company, title, and dates; rewrite 3–6 bullets that begin with strong past-tense action verbs, are quantified wherever my background supports it, and naturally weave in the JD's keywords in context.",
    "   - PROJECTS: same bullet style, with a tech-stack line; include only projects relevant to this JD.",
    "3. Keep everything truthful, concise, and short enough to fit one page. Prefer the JD's exact wording wherever it honestly matches my experience.",
    "4. After the resume sections, add a short list titled \"KEYWORDS I'M STILL MISSING\" — important JD keywords not supported by my background — so I know the gaps. Do NOT put these in the resume itself.",
    "",
    "Format the output as plain text using the section headings above, so I can paste it straight into my resume builder."
  ].join("\n");

  /* the per-section data fields the user fills in */
  var AI_FIELDS = [
    { key: "header",     label: "Contact / Header", ph: "Name, target job title, email, phone, city + state, LinkedIn / GitHub / portfolio links." },
    { key: "summary",    label: "Professional Summary", ph: "Rough notes or your current summary — who you are, years of experience, focus areas." },
    { key: "skills",     label: "Technical Skills", ph: "Every tool, language, framework, cloud, and platform you know. Group them if you like." },
    { key: "experience", label: "Work Experience", ph: "Each job: company, title, dates, and what you did — responsibilities, achievements, numbers/impact." },
    { key: "projects",   label: "Projects", ph: "Each project: name, tech stack, what you built, and the outcome/result." },
    { key: "education",  label: "Education", ph: "Degree, major, institution, dates. Add certifications here too if you like." },
    { key: "awards",     label: "Awards / Achievements / Certifications", ph: "Awards, recognitions, certifications — with dates and context." },
    { key: "other",      label: "Anything else", ph: "Extra notes, keywords, publications, languages — anything that could help." }
  ];

  function buildBackground() {
    var f = store.aiAssist.fields || {};
    var parts = [];
    AI_FIELDS.forEach(function (fld) {
      var v = (f[fld.key] || "").trim();
      if (v) parts.push("## " + fld.label.toUpperCase() + "\n" + v);
    });
    return parts.join("\n\n");
  }

  function buildFullPrompt() {
    var a = store.aiAssist;
    var bg = buildBackground();
    return AI_PROMPT +
      "\n\n=== MY BACKGROUND ===\n" + (bg || "(fill in your resume data in the AI Assist tab)") +
      "\n\n=== TARGET JOB DESCRIPTION ===\n" + (a.jd.trim() || "(paste the job description in the AI Assist tab)");
  }

  var AI_STEPS = [
    "Fill in your resume data below, section by section (Header, Summary, Skills, Experience, Projects, Education, Awards) — with everything about you, including numbers/impact. The more raw material, the better the result.",
    "Paste the job description you're applying to into the Job Description box.",
    "Click “Copy full prompt” — it bundles the instructions + your vault + the JD into one block.",
    "Open any AI chat (ChatGPT, Claude, or Gemini) and paste it in one message.",
    "Review the output carefully for accuracy — make sure nothing was invented or overstated.",
    "Come to the Resumes tab, create or duplicate a resume, and paste the Summary / Skills / Experience / Projects into the matching sections.",
    "Check the “1 page” badge, trim if needed, then Download PDF."
  ];

  /* which AI field is open in the big right-hand editor */
  var editingAiKey = "header";
  /* the editable items = the section fields plus the job description */
  function aiItems() {
    var items = AI_FIELDS.map(function (f) { return { key: f.key, label: f.label, ph: f.ph, jd: false }; });
    items.push({ key: "__jd", label: "Job Description", ph: "Paste the full job description you're applying to…", jd: true });
    return items;
  }
  function aiGet(item) { return item.jd ? (store.aiAssist.jd || "") : (store.aiAssist.fields[item.key] || ""); }
  function aiSet(item, v) { if (item.jd) store.aiAssist.jd = v; else store.aiAssist.fields[item.key] = v; }
  function snippet(s) { s = (s || "").replace(/\s+/g, " ").trim(); return s ? (s.length > 70 ? s.slice(0, 70) + "…" : s) : ""; }

  function renderAi(panel) {
    var a = store.aiAssist;
    a.fields = a.fields || {};
    var items = aiItems();
    if (!items.some(function (i) { return i.key === editingAiKey; })) editingAiKey = items[0].key;

    var hint = el("p", "panel-hint");
    hint.innerHTML = "Fill your data section by section (click a section to edit it in the big panel on the right), paste the job description, then copy one prompt into any AI chat. Everything stays in your browser. <strong>Always review the AI's output for accuracy.</strong>";
    panel.appendChild(hint);

    /* Steps */
    panel.appendChild(blockEl("How to use — steps", "ai.steps", function (body) {
      var ol = el("ol", "ai-steps");
      AI_STEPS.forEach(function (s) { ol.appendChild(elText("li", null, s)); });
      body.appendChild(ol);
    }));

    /* Selectable section list */
    var copyAll = miniBtn("⧉ Copy all my data", function () { copyText(buildBackground(), "Your data copied."); });
    panel.appendChild(blockEl("Your resume data — click a section to edit", "ai.vault", function (body) {
      items.forEach(function (item) {
        var row = el("div", "ai-row" + (item.key === editingAiKey ? " active" : "") + (item.jd ? " ai-row-jd" : ""));
        row.appendChild(elText("span", "ai-row-label", item.label));
        var snip = elText("span", "ai-row-snip", snippet(aiGet(item)) || "empty");
        if (!aiGet(item)) snip.classList.add("empty");
        row.appendChild(snip);
        row.addEventListener("click", function () { editingAiKey = item.key; renderApp(); });
        body.appendChild(row);
      });
    }, [copyAll]));

    /* Prompt */
    var copyFull = miniBtn("⧉ Copy full prompt", function () { copyText(buildFullPrompt(), "Full prompt copied — paste it into your AI chat."); });
    copyFull.classList.remove("btn-mini"); copyFull.classList.add("btn-primary");
    var copyInstr = miniBtn("Copy instructions only", function () { copyText(AI_PROMPT, "Instructions copied."); });
    panel.appendChild(blockEl("The AI prompt", "ai.prompt", function (body) {
      body.appendChild(elText("p", "hint", "“Copy full prompt” bundles these instructions with all your data and the job description. Paste the whole thing into one AI chat message."));
      var pre = el("div", "prompt-box"); pre.textContent = AI_PROMPT;
      body.appendChild(pre);
      var row = el("div", "prompt-actions");
      row.appendChild(copyFull); row.appendChild(copyInstr);
      body.appendChild(row);
    }));
  }

  /* the big editor on the right (replaces the resume preview on the AI tab) */
  function renderAiPane() {
    var pane = document.getElementById("aiPane");
    pane.innerHTML = "";
    var items = aiItems();
    var item = null;
    for (var i = 0; i < items.length; i++) if (items[i].key === editingAiKey) item = items[i];
    if (!item) item = items[0];

    var head = el("div", "ai-pane-head");
    head.appendChild(elText("span", "ai-pane-title", item.label));
    head.appendChild(miniBtn("⧉ Copy", function () { copyText(aiGet(item), item.label + " copied."); }));
    pane.appendChild(head);

    var ta = el("textarea", "ai-pane-ta"); ta.value = aiGet(item); ta.placeholder = item.ph;
    ta.addEventListener("input", function () {
      aiSet(item, ta.value); scheduleSave();
      var snip = document.querySelector(".ai-row.active .ai-row-snip");
      if (snip) { snip.textContent = snippet(ta.value) || "empty"; snip.classList.toggle("empty", !ta.value.trim()); }
    });
    pane.appendChild(ta);
    ta.focus();
  }

  /* ============================================================
     ATS GUIDE TAB — what to consider per section for a good score
     ============================================================ */
  var ATS_GUIDE = [
    { title: "How ATS scoring works (read first)", key: "ats.how", tips: [
      "An ATS (Applicant Tracking System) parses your resume into plain text, then matches it against the job description's keywords and required skills.",
      "Score ≈ keyword & skill match + parseable structure + relevant titles/dates. It cannot 'see' design — only extractable text.",
      "Tailor every resume to ONE job: mirror the exact words from that job posting (skills, tools, titles). This app lets you keep a separate resume per role for exactly this.",
      "Use the job's own phrasing: if it says “ETL pipelines”, write “ETL pipelines”, not “data flows”.",
      "Don't keyword-stuff or hide white text — modern ATS and recruiters penalize it."
    ] },
    { title: "Formatting & file (whole resume)", key: "ats.format", tips: [
      "Single column, top-to-bottom — this app already does this. Avoid tables, text boxes, columns, headers/footers, images, icons-as-text, and graphics.",
      "Use real, selectable text (this app's PDF is text-based, not an image) so the ATS can read every word.",
      "Standard section headings: “Professional Summary”, “Technical Skills”, “Professional Experience”, “Education”. Avoid creative names like “Where I've Made Impact”.",
      "Keep it to 1 page (enforced here) for < ~10 yrs experience; 2 pages only if senior.",
      "Save/submit as PDF unless the posting explicitly asks for .docx. Name the file Firstname_Lastname_Resume.pdf.",
      "Standard fonts (Calibri, Arial, Garamond). No special Unicode symbols that can garble parsing."
    ] },
    { title: "Header / contact", key: "ats.header", tips: [
      "Put your name, phone, email, city+state, and LinkedIn/GitHub as plain text — not inside a header/footer region (some ATS skip those).",
      "Use a professional email. Spell out the value next to any icon; if unsure, drop the icon and keep the text (e.g. “Email: …”).",
      "Add the target job title under your name (e.g. “Senior Data Engineer”) — it's a strong keyword match.",
      "One phone, one email. Avoid photos, date of birth, and personal details (they can break parsing and aren't needed)."
    ] },
    { title: "Professional Summary", key: "ats.summary", tips: [
      "3–4 lines. Lead with your title + years of experience, then your top skills and domains — using the job's keywords.",
      "Front-load the most important keywords; ATS and recruiters weight the top of the resume.",
      "Mirror the role: for a “Data Engineer” posting, name the exact stack (e.g. Spark, Airflow, Azure) they list.",
      "Quantify where possible (“4+ years”, “pipelines processing 10M+ records/day”).",
      "Avoid first-person pronouns (“I”, “my”) and vague fluff (“hard-working team player”)."
    ] },
    { title: "Technical Skills", key: "ats.skills", tips: [
      "This is the highest-value keyword section. List the exact tools/technologies named in the job description, spelled the same way.",
      "Include both the acronym and full form once somewhere (e.g. “ETL (Extract, Transform, Load)”, “AWS (Amazon Web Services)”) — ATS may search either.",
      "Group into clear categories (Languages, Cloud, ETL, Databases…) as plain “Label: comma, separated, list.”",
      "Only list skills you can defend in an interview; don't pad.",
      "No skill bars/ratings/graphics — ATS can't read them and they waste space."
    ] },
    { title: "Professional Experience", key: "ats.exp", tips: [
      "Format each entry as: Company — plain text; Job Title on its own line (ATS scores titles); Location; and dates as “MMM YYYY – MMM YYYY” (or “Present”).",
      "Keep date format consistent across all entries so the ATS computes tenure correctly.",
      "Start every bullet with a strong past-tense action verb (Built, Led, Designed, Reduced, Automated).",
      "Quantify impact: numbers, %, scale, time saved, revenue (“cut runtime 40%”, “processed 5TB/day”).",
      "Weave in the job's keywords/tools naturally within bullets, not just in the skills list — ATS values context.",
      "Match the job title language where honest (if they say “Data Engineer” and your title was equivalent, mirror it).",
      "3–6 bullets per recent role; fewer for older roles. Avoid paragraphs."
    ] },
    { title: "Projects", key: "ats.projects", tips: [
      "Great for showing keyword-rich, hands-on skills when your job titles don't cover them.",
      "Name the tech stack explicitly on its own line — pure keyword value.",
      "Use the same action-verb + quantified-outcome bullet style as experience.",
      "Prefer projects relevant to the target role; drop unrelated ones per application."
    ] },
    { title: "Education", key: "ats.edu", tips: [
      "Plain text: Degree, Major, Institution, and graduation date/range.",
      "Spell out the degree (“Bachelor of Technology”), and include the field of study — postings often filter on it.",
      "List relevant certifications (AWS, Azure, Databricks, etc.) — they're strong keyword matches; add a Certifications section if you have several.",
      "Drop high-school details once you have a degree."
    ] },
    { title: "Awards / Achievements", key: "ats.awards", tips: [
      "Optional and low ATS weight — keep only if it strengthens the story and space allows.",
      "Quantify and keep to one line each; tie to skills relevant to the role where possible.",
      "Don't let this crowd out Experience/Skills, which carry far more ATS weight."
    ] },
    { title: "Before you submit — checklist", key: "ats.checklist", tips: [
      "Re-read the job posting; ensure its top ~10 keywords/skills appear somewhere truthful on your resume.",
      "Copy your PDF's text (Ctrl+A, Ctrl+C) into a plain text editor — if it pastes cleanly and in order, the ATS can read it.",
      "Consistent dates, consistent tense, no typos (spelling errors can drop keyword matches).",
      "One page, standard headings, no tables/images — verified by this app's preview and one-page badge.",
      "Duplicate this resume per application and tailor the summary + skills each time."
    ] }
  ];

  /* ============================================================
     JD MATCH — analyze a job description against the active resume,
     entirely in the browser (free, no API, nothing leaves the page).
     ============================================================ */
  /* curated skill / keyword dictionary, grouped so recommendations can say
     WHERE to put each missing term. Lowercase; phrases matched whole-word. */
  var JD_SKILL_DB = {
    "Languages": ["python","java","scala","sql","pl/sql","t-sql","javascript","typescript","c++","c#",".net","golang","ruby","php","swift","kotlin","bash","shell scripting","powershell","vba","matlab","sas"],
    "Cloud": ["aws","amazon web services","azure","gcp","google cloud","s3","ec2","lambda","redshift","glue","athena","emr","kinesis","adls","adf","azure data factory","synapse","databricks","snowflake","bigquery","dataproc","cloud functions","data lake","delta lake","lakehouse"],
    "Data & ETL": ["etl","elt","spark","pyspark","apache spark","hadoop","hive","kafka","airflow","dbt","apache nifi","nifi","informatica","talend","ssis","data pipeline","data pipelines","data warehouse","data warehousing","data modeling","dimensional modeling","star schema","data governance","data quality","data integration","streaming","real-time","batch processing","cdc","orchestration"],
    "Databases": ["mysql","postgresql","postgres","sql server","oracle","mongodb","cassandra","dynamodb","redis","teradata","nosql","rdbms","graph database"],
    "BI & Analytics": ["power bi","tableau","looker","qlik","excel","pandas","numpy","data visualization","reporting","dashboards","kpi","a/b testing","statistics"],
    "ML & AI": ["machine learning","deep learning","tensorflow","pytorch","scikit-learn","nlp","mlops","feature engineering","model deployment","llm","generative ai","genai","forecasting","predictive modeling"],
    "DevOps & Tools": ["docker","kubernetes","terraform","jenkins","ci/cd","git","github","gitlab","bitbucket","ansible","linux","unix","rest api","graphql","microservices","api integration"],
    "Ways of working": ["agile","scrum","kanban","waterfall","jira","confluence","sdlc","tdd","code review","unit testing"],
    "Domain": ["supply chain","demand planning","supply planning","o9","sap","erp","salesforce","finance","healthcare","retail","e-commerce","manufacturing","logistics","inventory"],
    "Soft skills": ["communication","leadership","stakeholder management","problem solving","collaboration","mentoring","cross-functional","analytical","attention to detail","time management","presentation"]
  };
  var JD_STOP = (function () {
    var w = "a an the and or but of to in on for with at by from as is are was were be been being this that these those you your we our they their it its will shall should would can could may might must have has had do does did not no nor so than then once here there all any both each few more most other some such only own same too very s t just also into over under about above below up down out off again further who whom which what when where why how able across within without including include ability role work working experience years year team teams strong excellent good required require requirements responsibilities responsible preferred plus etc using use used help ensure support provide build develop drive deliver manage lead create design implement new across using per via amp".split(" ");
    var m = {}; w.forEach(function (x) { m[x] = 1; }); return m;
  })();
  function jdNorm(t) { return (" " + (t || "").toLowerCase().replace(/[‘’]/g, "'") + " "); }
  function reBound(phrase) {
    var e = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\s|\s+/g, "\\s+");
    return new RegExp("(^|[^a-z0-9+#/.])" + e + "([^a-z0-9+#/.]|$)", "i");
  }
  function countPhrase(norm, phrase) {
    var re = new RegExp("(^|[^a-z0-9+#/.])" + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+") + "([^a-z0-9+#/.]|$)", "ig");
    var n = 0; while (re.exec(norm) !== null) { n++; if (n > 50) break; } return n;
  }
  function hasPhrase(norm, phrase) { return reBound(phrase).test(norm); }

  /* flatten the whole active resume into one searchable string */
  function resumePlainText(r) {
    if (!r) return "";
    var parts = [];
    var p = r.profile || {};
    if (p.title) parts.push(p.title);
    (p.contacts || []).forEach(function (c) { if (c.value) parts.push(c.value); });
    (r.sections || []).forEach(function (sec) {
      if (sec.title) parts.push(sec.title);
      if (sec.type === "text") { if (sec.text) parts.push(sec.text); }
      else if (sec.type === "labeled") { (sec.items || []).forEach(function (it) { parts.push((it.label || "") + " " + (it.value || "")); }); }
      else { (sec.items || []).forEach(function (it) { parts.push([it.heading, it.role, it.meta].filter(Boolean).join(" ")); (it.bullets || []).forEach(function (b) { if (b) parts.push(b); }); }); }
    });
    return parts.join("  ").replace(/[*_`]/g, "");
  }

  function analyzeJd(jd, r) {
    var JN = jdNorm(jd), RN = jdNorm(resumePlainText(r));
    var keys = [], seen = {};
    /* 1) dictionary skills that appear in the JD */
    Object.keys(JD_SKILL_DB).forEach(function (cat) {
      JD_SKILL_DB[cat].forEach(function (ph) {
        if (hasPhrase(JN, ph) && !seen[ph]) {
          seen[ph] = 1;
          keys.push({ term: ph, cat: cat, skill: true, freq: countPhrase(JN, ph), inResume: hasPhrase(RN, ph) });
        }
      });
    });
    /* 2) other frequent meaningful terms (so non-tech roles get value too) */
    var toks = JN.replace(/[^a-z0-9+#./ -]/g, " ").split(/\s+/)
      .map(function (t) { return t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""); }).filter(Boolean);
    var uni = {}, bi = {};
    for (var i = 0; i < toks.length; i++) {
      var a = toks[i];
      if (a.length >= 4 && !JD_STOP[a] && !/^\d+$/.test(a)) uni[a] = (uni[a] || 0) + 1;
      if (i + 1 < toks.length) {
        var b = toks[i + 1];
        if (a.length >= 3 && b.length >= 3 && !JD_STOP[a] && !JD_STOP[b]) { var bg = a + " " + b; bi[bg] = (bi[bg] || 0) + 1; }
      }
    }
    function pushExtra(obj, min, cap) {
      Object.keys(obj).sort(function (x, y) { return obj[y] - obj[x]; }).forEach(function (term) {
        if (keys.length >= cap || obj[term] < min) return;
        if (seen[term]) return;
        /* skip terms already contained in a matched skill phrase */
        for (var k = 0; k < keys.length; k++) { if (keys[k].term.indexOf(term) !== -1 || term.indexOf(keys[k].term) !== -1) return; }
        seen[term] = 1;
        keys.push({ term: term, cat: "Keyword", skill: false, freq: obj[term], inResume: hasPhrase(RN, term) });
      });
    }
    pushExtra(bi, 2, 999);           // meaningful 2-word phrases first
    pushExtra(uni, 2, keys.length + 14);

    /* 3) score (weighted keyword coverage) */
    var covered = 0, total = 0, matched = [], missing = [];
    keys.forEach(function (k) {
      var w = (k.skill ? 2 : 1) * (1 + Math.min(k.freq - 1, 3) * 0.4);
      k.weight = w; total += w; if (k.inResume) { covered += w; matched.push(k); } else missing.push(k);
    });
    missing.sort(function (a, b) { return b.weight - a.weight; });
    matched.sort(function (a, b) { return b.weight - a.weight; });
    var score = total > 0 ? Math.round((covered / total) * 100) : 0;

    return { score: score, matched: matched, missing: missing, keys: keys, recs: buildJdRecs(jd, r, missing, matched, score) };
  }

  function titleCase(s) { return s.replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }); }
  function buildJdRecs(jd, r, missing, matched, score) {
    var recs = [], RN = jdNorm(resumePlainText(r));
    /* a) missing skills grouped by category -> concrete "add to X" actions */
    var byCat = {};
    missing.filter(function (m) { return m.skill; }).forEach(function (m) { (byCat[m.cat] = byCat[m.cat] || []).push(m.term); });
    var sectionFor = { "Languages": "Technical Skills", "Cloud": "Technical Skills", "Data & ETL": "Technical Skills", "Databases": "Technical Skills", "BI & Analytics": "Technical Skills", "ML & AI": "Technical Skills", "DevOps & Tools": "Technical Skills", "Ways of working": "Experience bullets", "Domain": "Summary & Experience", "Soft skills": "Summary & Experience" };
    Object.keys(byCat).forEach(function (cat) {
      var list = byCat[cat].slice(0, 8).map(titleCase).join(", ");
      recs.push({ icon: "➕", title: "Add to " + (sectionFor[cat] || "your resume") + " — " + cat, body: "The JD calls for <b>" + list + "</b>, which isn't on your resume. Add any you genuinely have (and back the important ones with a bullet)." });
    });
    /* b) high-emphasis missing keywords */
    missing.filter(function (m) { return !m.skill && m.freq >= 3; }).slice(0, 4).forEach(function (m) {
      recs.push({ icon: "🎯", title: "Emphasize “" + titleCase(m.term) + "”", body: "This appears <b>" + m.freq + "×</b> in the job description but is missing from your resume — add a bullet or phrase that shows it in action." });
    });
    /* c) headline / title alignment */
    var jdTitle = guessJdTitle(jd);
    if (jdTitle && r && r.profile) {
      var cur = (r.profile.title || "").toLowerCase();
      if (cur && jdTitle.toLowerCase() !== cur && !hasPhrase(jdNorm(cur), jdTitle.toLowerCase().split(" ")[0])) {
        recs.push({ icon: "🏷️", title: "Match your headline to the role", body: "The posting is for <b>" + esc(jdTitle) + "</b>. Consider aligning your title/headline so an ATS and recruiter see an instant match." });
      }
    }
    /* d) summary coverage of top terms */
    var summ = findSummaryText(r);
    if (summ !== null) {
      var topMiss = missing.slice(0, 3).map(function (m) { return titleCase(m.term); });
      if (topMiss.length) recs.push({ icon: "📝", title: "Tune your Professional Summary", body: "Work your strongest JD-relevant themes into the summary (e.g. " + esc(topMiss.join(", ")) + ") so the top of page 1 mirrors the role." });
    }
    /* e) verdict-based closing note */
    if (score >= 85) recs.unshift({ icon: "✅", title: "Strong alignment (" + score + "%)", body: "You already cover most of the role's keywords. Fold in the few below and you're essentially tailored." });
    else if (score >= 60) recs.unshift({ icon: "⚡", title: "Good base, needs tailoring (" + score + "%)", body: "Solid overlap. Addressing the missing keywords below will push this toward a top match." });
    else recs.unshift({ icon: "🛠️", title: "Needs tailoring (" + score + "%)", body: "There's a real gap between this resume and the role. Work through the recommendations below, adding only what's truthful." });
    return recs;
  }
  function guessJdTitle(jd) {
    var lines = (jd || "").split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^(?:job\s*title|position|role)\s*[:\-]\s*(.+)$/i);
      if (m) return m[1].trim().slice(0, 60);
    }
    if (lines.length && lines[0].length <= 60 && /[a-z]/i.test(lines[0]) && lines[0].split(" ").length <= 8) return lines[0];
    return "";
  }
  function findSummaryText(r) {
    if (!r) return null;
    var s = (r.sections || []).filter(function (sec) { return /summary|profile|objective|about/i.test(sec.title || ""); })[0];
    if (!s) return null; return (s.text || "");
  }

  function buildTailorPrompt(r, a) {
    var miss = a.missing.map(function (m) { return titleCase(m.term); });
    return [
      "You are an expert resume writer and ATS optimization specialist.",
      "Rewrite and tailor my resume below so it aligns as closely as possible with the target job description, WITHOUT inventing experience I don't have.",
      "",
      "Priorities:",
      "1. Naturally incorporate these missing-but-relevant keywords wherever they are truthful: " + (miss.slice(0, 25).join(", ") || "(none — already well aligned)") + ".",
      "2. Rewrite Summary, Skills, and Experience bullets to mirror the JD's language; start bullets with strong action verbs and quantify where my background supports it.",
      "3. Keep it truthful and concise enough for one page.",
      "4. End with a short list 'STILL MISSING' of any important JD keywords my background genuinely can't support.",
      "",
      "=== MY CURRENT RESUME ===",
      resumePlainText(r) || "(empty)",
      "",
      "=== TARGET JOB DESCRIPTION ===",
      (a._jd || store.aiAssist.jd || "").trim() || "(paste the JD)"
    ].join("\n");
  }

  var jdAnalysis = null;   // last computed analysis (module-scoped)
  /* Add a missing skill into the active resume's skills section (truthful-by-choice). */
  function addSkillToResume(r, term) {
    term = (term || "").trim();
    if (!r || !term) return false;
    var sec = null;
    (r.sections || []).forEach(function (s) { if (!sec && s.type === "labeled" && /skill/i.test(s.title || "")) sec = s; });
    if (!sec) (r.sections || []).forEach(function (s) { if (!sec && s.type === "labeled") sec = s; });
    if (!sec) { sec = { id: uid(), title: "Technical Skills", type: "labeled", items: [] }; r.sections.push(sec); }
    sec.items = sec.items || [];
    /* already present anywhere in the section? skip */
    var bound = new RegExp("(^|[^a-z0-9+#/.])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9+#/.]|$)", "i");
    var dup = false;
    sec.items.forEach(function (it) { if (bound.test(it.value || "")) dup = true; });
    if (dup) return false;
    var bucket = null;
    sec.items.forEach(function (it) { if (!bucket && /^(additional|other|core)\s+skills?$/i.test((it.label || "").trim())) bucket = it; });
    if (!bucket) { bucket = { id: uid(), label: "Additional Skills", value: "" }; sec.items.push(bucket); }
    var base = (bucket.value || "").replace(/\s*\.\s*$/, "");
    bucket.value = (base ? base + ", " : "") + titleCase(term) + ".";
    return true;
  }

  /* Re-run the analysis after an edit, remembering the previous score for a +/- delta. */
  function reanalyzeAfterEdit() {
    var prev = jdAnalysis ? jdAnalysis.score : null;
    jdAnalysis = analyzeJd(store.aiAssist.jd, activeResume());
    jdAnalysis._jd = store.aiAssist.jd;
    if (prev != null) jdAnalysis._prevScore = prev;
    touch();
    renderApp();
  }

  function renderJdMatch(panel) {
    store.aiAssist = store.aiAssist || { fields: {}, jd: "" };
    var r = activeResume();

    var hint = el("p", "panel-hint");
    hint.innerHTML = "Paste a job description and get an instant alignment score for <strong>" + esc(r ? (r.name || "this resume") : "your resume") + "</strong>, the exact keywords you're missing, and what to change — all in your browser, nothing uploaded. <strong>100% free, no sign-in.</strong>";
    panel.appendChild(hint);

    /* JD input */
    panel.appendChild(blockEl("Job description", "jd.input", function (body) {
      var ta = el("textarea", "inp jd-input");
      ta.placeholder = "Paste the full job description here…";
      ta.value = store.aiAssist.jd || "";
      ta.addEventListener("input", function () { store.aiAssist.jd = ta.value; scheduleSave(); });
      body.appendChild(ta);

      var row = el("div", "prompt-actions");
      var analyze = miniBtn("⚡ Analyze match", function () {
        if (!(store.aiAssist.jd || "").trim()) { flash("Paste a job description first."); return; }
        jdAnalysis = analyzeJd(store.aiAssist.jd, activeResume());
        jdAnalysis._jd = store.aiAssist.jd;
        renderApp();
      });
      analyze.classList.remove("btn-mini"); analyze.classList.add("btn-primary");
      row.appendChild(analyze);

      var fileWrap = el("label", "btn btn-mini jd-file");
      fileWrap.textContent = "⬆ Upload .txt";
      var file = el("input"); file.type = "file"; file.accept = ".txt,text/plain"; file.style.display = "none";
      file.addEventListener("change", function () {
        var f = file.files && file.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { store.aiAssist.jd = String(fr.result || ""); jdAnalysis = analyzeJd(store.aiAssist.jd, activeResume()); jdAnalysis._jd = store.aiAssist.jd; touch(); renderApp(); };
        fr.readAsText(f); file.value = "";
      });
      fileWrap.appendChild(file);
      row.appendChild(fileWrap);

      if (store.aiAssist.jd) row.appendChild(miniBtn("Clear", function () { store.aiAssist.jd = ""; jdAnalysis = null; touch(); renderApp(); }));
      body.appendChild(row);
      body.appendChild(elText("p", "hint", "Tip: for a PDF/Word JD, open it, select all (Ctrl+A), copy, and paste here."));
    }));

    if (!jdAnalysis) {
      var empty = el("div", "jd-empty");
      empty.innerHTML = "⚡<br>Paste a job description above and hit <b>Analyze match</b> to see your alignment score and a tailoring checklist.";
      panel.appendChild(empty);
      return;
    }

    var a = jdAnalysis;
    /* Score card */
    panel.appendChild(scoreCard(a));

    /* Missing keywords */
    panel.appendChild(blockEl("Add these — missing from your resume (" + a.missing.length + ")", "jd.missing", function (body) {
      if (!a.missing.length) { body.appendChild(elText("p", "hint", "Nothing important is missing — great alignment!")); return; }
      body.appendChild(elText("p", "hint", "Found in the job description, not in your resume. Click a keyword to copy it; use ＋ to add a skill straight into your resume. Add only what's truthful."));
      var wrap = el("div", "chip-wrap");
      a.missing.forEach(function (m) {
        var group = el("span", "kw-group");
        var c = el("button", "kw-chip miss" + (m.freq >= 3 ? " hot" : "")); c.type = "button";
        c.textContent = titleCase(m.term) + (m.freq >= 3 ? " ·" + m.freq : "");
        c.title = "Appears " + m.freq + "× in the JD — click to copy";
        c.addEventListener("click", function () { copyText(m.term, "“" + titleCase(m.term) + "” copied."); });
        group.appendChild(c);
        if (m.skill) {
          var add = el("button", "kw-add"); add.type = "button"; add.textContent = "＋";
          add.title = "Add “" + titleCase(m.term) + "” to your Technical Skills";
          add.addEventListener("click", function () {
            if (addSkillToResume(activeResume(), m.term)) { flash("Added “" + titleCase(m.term) + "” to Technical Skills."); reanalyzeAfterEdit(); }
            else flash("“" + titleCase(m.term) + "” is already in your skills.");
          });
          group.appendChild(add);
        }
        wrap.appendChild(group);
      });
      body.appendChild(wrap);
      var w = el("div", "prompt-actions");
      var addableMissing = a.missing.filter(function (m) { return m.skill; });
      if (addableMissing.length) {
        w.appendChild(miniBtn("＋ Add all " + addableMissing.length + " missing skills", function () {
          var n = 0; addableMissing.forEach(function (m) { if (addSkillToResume(activeResume(), m.term)) n++; });
          if (n) { flash("Added " + n + " skill" + (n > 1 ? "s" : "") + " to Technical Skills."); reanalyzeAfterEdit(); }
          else flash("Those skills are already in your resume.");
        }, "btn-primary"));
      }
      w.appendChild(miniBtn("⧉ Copy all missing keywords", function () { copyText(a.missing.map(function (m) { return titleCase(m.term); }).join(", "), "Missing keywords copied."); }));
      body.appendChild(w);
    }));

    /* Recommendations */
    panel.appendChild(blockEl("What to change — recommendations", "jd.recs", function (body) {
      a.recs.forEach(function (rec) {
        var card = el("div", "rec-card");
        card.appendChild(elText("span", "rec-ico", rec.icon));
        var tx = el("div", "rec-tx");
        tx.appendChild(elText("div", "rec-title", rec.title));
        var p = el("div", "rec-body"); p.innerHTML = rec.body; tx.appendChild(p);
        card.appendChild(tx); body.appendChild(card);
      });
      var tailor = miniBtn("⧉ Copy tailoring prompt for AI", function () { copyText(buildTailorPrompt(activeResume(), a), "Tailoring prompt copied — paste into ChatGPT, Claude or Gemini (free)."); });
      tailor.classList.remove("btn-mini"); tailor.classList.add("btn-primary");
      var w = el("div", "prompt-actions"); w.appendChild(tailor); body.appendChild(w);
      body.appendChild(elText("p", "hint", "Want the AI to do the rewriting for you? Copy this prompt into any free AI chat — it already includes your resume, the JD, and the exact gaps."));
    }));

    /* Already covered */
    panel.appendChild(blockEl("You already cover (" + a.matched.length + ")", "jd.matched", function (body) {
      if (!a.matched.length) { body.appendChild(elText("p", "hint", "No overlap yet — start with the recommendations above.")); return; }
      var wrap = el("div", "chip-wrap");
      a.matched.forEach(function (m) { wrap.appendChild(elText("span", "kw-chip have", titleCase(m.term))); });
      body.appendChild(wrap);
    }));
  }

  function scoreCard(a) {
    var band = a.score >= 85 ? "high" : (a.score >= 60 ? "mid" : "low");
    var card = el("div", "score-card " + band);
    var C = 2 * Math.PI * 52, off = C * (1 - a.score / 100);
    var ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.setAttribute("class", "score-ring"); ring.setAttribute("viewBox", "0 0 120 120");
    ring.innerHTML =
      '<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="58" text-anchor="middle" class="score-num">' + a.score + '%</text>' +
      '<text x="60" y="78" text-anchor="middle" class="score-sub">match</text>';
    card.appendChild(ring);
    var side = el("div", "score-side");
    var label = a.score >= 85 ? "Strong match" : (a.score >= 60 ? "Good — tailor it" : "Needs tailoring");
    var labelRow = el("div", "score-label-row");
    labelRow.appendChild(elText("span", "score-label", label));
    if (a._prevScore != null && a.score !== a._prevScore) {
      var diff = a.score - a._prevScore;
      labelRow.appendChild(elText("span", "score-delta " + (diff > 0 ? "up" : "down"), (diff > 0 ? "▲ +" : "▼ ") + diff + " pts"));
    }
    side.appendChild(labelRow);
    side.appendChild(elText("div", "score-meta", a.matched.length + " keywords covered · " + a.missing.length + " to add"));
    var bar = el("div", "score-track"); var fill = el("div", "score-fill"); fill.style.width = a.score + "%"; bar.appendChild(fill); side.appendChild(bar);
    card.appendChild(side);
    return card;
  }

  /* ============================================================
     RESUME HEALTH — offline content quality analysis
     ============================================================ */
  var HEALTH_BUZZWORDS = ["team player", "hard worker", "hardworking", "detail-oriented", "detail oriented",
    "results-driven", "results driven", "self-starter", "self starter", "go-getter", "go getter",
    "think outside the box", "synergy", "proactive", "dynamic", "go-to person", "proven track record",
    "best of breed", "value add", "value-add", "fast-paced", "fast paced", "wear many hats", "ninja", "rockstar", "guru"];
  var HEALTH_WEAK_STARTS = ["responsible for", "worked on", "helped", "assisted", "involved in", "participated in",
    "tasked with", "duties included", "in charge of", "handled", "contributed to", "supported"];
  var STRONG_VERBS_HINT = "Led, Built, Designed, Delivered, Shipped, Drove, Reduced, Increased, Automated, Launched, Owned, Scaled, Migrated, Optimized";

  function collectBullets(r) {
    var out = [];
    (r.sections || []).forEach(function (sec) {
      if (sec.type === "entries") (sec.items || []).forEach(function (it) {
        (it.bullets || []).forEach(function (b) { if (b && b.trim()) out.push({ text: b.trim(), where: it.heading || sec.title }); });
      });
    });
    return out;
  }
  function wordCount(s) { return (s || "").trim() ? s.trim().split(/\s+/).length : 0; }
  function findSummary(r) {
    var s = (r.sections || []).filter(function (x) { return x.type === "text"; })[0];
    return s ? (s.text || "") : "";
  }
  function stripMd(s) { return (s || "").replace(/[*_`]/g, ""); }

  function analyzeHealth(r) {
    var checks = [], score = 100;
    var bullets = collectBullets(r);
    var totalB = bullets.length;

    /* 1. Quantified bullets */
    var noNum = bullets.filter(function (b) { return !/\d/.test(b.text); });
    if (totalB) {
      var quantRatio = (totalB - noNum.length) / totalB;
      score -= Math.round((1 - quantRatio) * 25);
      checks.push({ level: quantRatio >= 0.6 ? "good" : (quantRatio >= 0.35 ? "warn" : "bad"),
        label: "Quantified impact", detail: Math.round(quantRatio * 100) + "% of bullets include a number. Metrics (%, $, time, scale) make impact concrete.",
        items: noNum.slice(0, 6).map(function (b) { return b.text; }), itemsLabel: "Add a number to:" });
    }

    /* 2. Strong opening verbs */
    var weak = bullets.filter(function (b) { return HEALTH_WEAK_STARTS.some(function (w) { return new RegExp("^" + w + "\\b", "i").test(stripMd(b.text)); }); });
    score -= Math.min(weak.length * 4, 16);
    checks.push({ level: weak.length === 0 ? "good" : (weak.length <= 2 ? "warn" : "bad"),
      label: "Strong action verbs", detail: weak.length ? weak.length + " bullet(s) start with a weak phrase. Open with a strong verb (" + STRONG_VERBS_HINT + ")." : "Bullets open with strong verbs.",
      items: weak.slice(0, 6).map(function (b) { return b.text; }), itemsLabel: "Rewrite the opening of:" });

    /* 3. Buzzwords / clichés (across whole resume) */
    var full = stripMd(resumePlainText(r)).toLowerCase();
    var hits = HEALTH_BUZZWORDS.filter(function (w) { return new RegExp("(^|[^a-z])" + w.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&") + "([^a-z]|$)").test(full); });
    score -= Math.min(hits.length * 5, 15);
    checks.push({ level: hits.length === 0 ? "good" : (hits.length <= 2 ? "warn" : "bad"),
      label: "No empty buzzwords", detail: hits.length ? "Found cliché(s): " + hits.map(titleCase).join(", ") + ". Replace with specific, provable achievements." : "No tired clichés — good.",
      items: [] });

    /* 4. Passive voice (rough heuristic) */
    var passive = bullets.filter(function (b) { return /\b(was|were|been|being|is|are)\s+\w+ed\b/i.test(stripMd(b.text)); });
    score -= Math.min(passive.length * 2, 10);
    checks.push({ level: passive.length === 0 ? "good" : (passive.length <= 2 ? "warn" : "bad"),
      label: "Active voice", detail: passive.length ? passive.length + " bullet(s) look passive. Prefer \"Built X\" over \"X was built\"." : "Reads as active voice.",
      items: passive.slice(0, 5).map(function (b) { return b.text; }), itemsLabel: "Make active:" });

    /* 5. Bullet length */
    var longB = bullets.filter(function (b) { return wordCount(b.text) > 42; });
    score -= Math.min(longB.length * 3, 9);
    checks.push({ level: longB.length === 0 ? "good" : (longB.length <= 2 ? "warn" : "bad"),
      label: "Concise bullets", detail: longB.length ? longB.length + " bullet(s) run long (>42 words). Tighten to one idea each." : "Bullets are a readable length.",
      items: longB.slice(0, 4).map(function (b) { return b.text; }), itemsLabel: "Shorten:" });

    /* 6. Summary */
    var sumW = wordCount(stripMd(findSummary(r)));
    if (sumW === 0) { score -= 8; checks.push({ level: "bad", label: "Professional summary", detail: "No summary found. A 2–3 line summary up top frames your fit fast.", items: [] }); }
    else if (sumW < 25) { score -= 5; checks.push({ level: "warn", label: "Professional summary", detail: "Summary is very short (" + sumW + " words). Aim for ~30–60 words.", items: [] }); }
    else if (sumW > 90) { score -= 3; checks.push({ level: "warn", label: "Professional summary", detail: "Summary is long (" + sumW + " words). Trim to ~30–60 words.", items: [] }); }
    else checks.push({ level: "good", label: "Professional summary", detail: "Summary length is on target (" + sumW + " words).", items: [] });

    /* 7. Overall length */
    var totalW = wordCount(full);
    if (totalW > 900) { score -= 8; checks.push({ level: "warn", label: "Overall length", detail: "~" + totalW + " words — likely over one page. Trim older/less-relevant detail.", items: [] }); }
    else if (totalW < 220) { score -= 6; checks.push({ level: "warn", label: "Overall length", detail: "~" + totalW + " words — looks thin. Add impact and detail to recent roles.", items: [] }); }
    else checks.push({ level: "good", label: "Overall length", detail: "~" + totalW + " words — good one-page density.", items: [] });

    /* 8. Contact essentials */
    var contacts = ((r.profile || {}).contacts || []).map(function (c) { return c.value || ""; }).join(" ");
    var hasEmail = /@/.test(contacts);
    if (!hasEmail) { score -= 6; checks.push({ level: "bad", label: "Contact details", detail: "No email detected in your header. Add a professional email.", items: [] }); }
    else checks.push({ level: "good", label: "Contact details", detail: "Email present in header.", items: [] });

    score = Math.max(0, Math.min(100, score));
    /* order: problems first */
    var rank = { bad: 0, warn: 1, good: 2 };
    checks.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    return { score: score, checks: checks, totalBullets: totalB };
  }

  function healthCard(h) {
    var band = h.score >= 85 ? "high" : (h.score >= 60 ? "mid" : "low");
    var card = el("div", "score-card " + band);
    var C = 2 * Math.PI * 52, off = C * (1 - h.score / 100);
    var ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.setAttribute("class", "score-ring"); ring.setAttribute("viewBox", "0 0 120 120");
    ring.innerHTML =
      '<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="58" text-anchor="middle" class="score-num">' + h.score + '</text>' +
      '<text x="60" y="78" text-anchor="middle" class="score-sub">/ 100</text>';
    card.appendChild(ring);
    var side = el("div", "score-side");
    var label = h.score >= 85 ? "Strong resume" : (h.score >= 60 ? "Good — a few fixes" : "Needs work");
    side.appendChild(elText("div", "score-label", label));
    var good = h.checks.filter(function (c) { return c.level === "good"; }).length;
    side.appendChild(elText("div", "score-meta", good + " of " + h.checks.length + " checks passing"));
    var bar = el("div", "score-track"); var fill = el("div", "score-fill"); fill.style.width = h.score + "%"; bar.appendChild(fill); side.appendChild(bar);
    card.appendChild(side);
    return card;
  }

  function renderHealth(panel) {
    var r = activeResume();
    var hint = el("p", "panel-hint");
    hint.innerHTML = "An instant quality read on <strong>" + esc(r ? (r.name || "this resume") : "your resume") + "</strong> — quantified impact, strong verbs, clichés, passive voice, length. All in your browser. <strong>Fix the flags, not fake keywords.</strong>";
    panel.appendChild(hint);
    if (!r) { panel.appendChild(elText("div", "jd-empty", "Create a resume first.")); return; }

    var h = analyzeHealth(r);
    panel.appendChild(healthCard(h));

    h.checks.forEach(function (c) {
      panel.appendChild(blockEl((c.level === "good" ? "✓ " : (c.level === "warn" ? "▲ " : "✕ ")) + c.label, "health." + c.label, function (body) {
        var p = el("div", "rec-body"); p.innerHTML = esc(c.detail); body.appendChild(p);
        if (c.items && c.items.length) {
          body.appendChild(elText("p", "hint hl-items-label", c.itemsLabel || "Examples:"));
          var ul = el("ul", "hl-items");
          c.items.forEach(function (t) { ul.appendChild(elText("li", null, t.length > 160 ? t.slice(0, 157) + "…" : t)); });
          body.appendChild(ul);
        }
      }, [elText("span", "hl-pill hl-" + c.level, c.level === "good" ? "Pass" : (c.level === "warn" ? "Review" : "Fix"))]));
    });

    panel.appendChild(elText("p", "hint", "Tip: the score rewards specific, truthful, active writing — not keyword stuffing. Pair it with JD Match to tailor to a role."));
  }

  function renderAts(panel) {
    var hint = el("p", "panel-hint");
    hint.innerHTML = "Guidance for maximizing your ATS (Applicant Tracking System) score, section by section. Tailor each resume to one job posting — keep a separate resume per role on the <strong>Resumes</strong> tab.";
    panel.appendChild(hint);
    ATS_GUIDE.forEach(function (g) {
      panel.appendChild(blockEl(g.title, g.key, function (body) {
        var ul = el("ul", "ats-list");
        g.tips.forEach(function (t) { ul.appendChild(elText("li", null, t)); });
        body.appendChild(ul);
      }));
    });
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
    distributeFill(); fitPreview(); checkOnePage();
  }

  /* Fill the page: when the resume is shorter than one A4 page, spread the
     leftover vertical space evenly between sections so there is no blank band
     at the bottom. The same #page is what the PDF prints, so preview and PDF
     stay identical. Does nothing when content already fills/overflows a page. */
  function distributeFill() {
    var page = document.getElementById("page");
    if (!page) return;
    page.style.setProperty("--r-fill", "0px");
    var secs = page.querySelectorAll(".r-section").length;
    if (!secs || !page.children.length) return;
    var cs = getComputedStyle(page);
    var padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
    var usable = page.clientHeight - padT - padB;   /* inner content height of one page */
    /* NOTE: scrollHeight is clamped to the fixed page height, so measure the
       true content height from the last child's offset box instead (unaffected
       by the preview's CSS zoom transform). Iterate because adding the fill
       gaps shifts the offsets. */
    var FILL_CAP = 32;                              /* max extra gap per section, so sparse resumes don't get cavernous gaps */
    var fill = 0;
    for (var pass = 0; pass < 4; pass++) {
      var last = page.children[page.children.length - 1];
      var contentH = (last.offsetTop + last.offsetHeight) - padT;
      var slack = usable - contentH;
      if (slack <= 2) break;                        /* already fills / overflows */
      fill = Math.min(FILL_CAP, fill + slack / secs);
      page.style.setProperty("--r-fill", fill + "px");
      if (fill >= FILL_CAP) break;
    }
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
     DOCX EXPORT  (pure JS — builds a valid OOXML .docx with no deps)
     ============================================================ */
  /* --- minimal ZIP writer (stored / no compression) --- */
  var CRC_TABLE = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function strBytes(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    var u = unescape(encodeURIComponent(s)), a = new Uint8Array(u.length);
    for (var i = 0; i < u.length; i++) a[i] = u.charCodeAt(i) & 0xFF;
    return a;
  }
  function u16(n) { return [n & 0xFF, (n >>> 8) & 0xFF]; }
  function u32(n) { return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; }
  function zipStore(files) {
    // files: [{ name, bytes }] -> Uint8Array of a .zip with all entries STORED
    var local = [], central = [], offset = 0, chunks = [];
    files.forEach(function (f) {
      var nameB = strBytes(f.name), crc = crc32(f.bytes), sz = f.bytes.length;
      var lh = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(sz), u32(sz), u16(nameB.length), u16(0));
      chunks.push(new Uint8Array(lh), nameB, f.bytes);
      central.push({ nameB: nameB, crc: crc, sz: sz, offset: offset });
      offset += lh.length + nameB.length + sz;
    });
    var cstart = offset, cbytes = [];
    central.forEach(function (c) {
      var ch = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(c.crc), u32(c.sz), u32(c.sz), u16(c.nameB.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(c.offset));
      cbytes.push(new Uint8Array(ch), c.nameB); offset += ch.length + c.nameB.length;
    });
    var csize = offset - cstart;
    var end = [].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(csize), u32(cstart), u16(0));
    var all = chunks.concat(cbytes).concat([new Uint8Array(end)]);
    var total = 0; all.forEach(function (a) { total += a.length; });
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (a) { out.set(a, pos); pos += a.length; });
    return out;
  }

  /* --- OOXML builders --- */
  function xmlEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function runs(text) {
    // split on **bold** -> [{t, b}]
    var out = [], re = /\*\*(.+?)\*\*/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), b: false });
      out.push({ t: m[1], b: true }); last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: text.slice(last), b: false });
    if (!out.length) out.push({ t: text || "", b: false });
    return out;
  }
  function runXml(r, opt) {
    opt = opt || {};
    var rpr = "";
    if (r.b || opt.bold) rpr += "<w:b/>";
    if (opt.italic) rpr += "<w:i/>";
    if (opt.size) rpr += '<w:sz w:val="' + opt.size + '"/>';
    if (opt.color) rpr += '<w:color w:val="' + opt.color + '"/>';
    if (opt.caps) rpr += "<w:caps/>";
    return "<w:r>" + (rpr ? "<w:rPr>" + rpr + "</w:rPr>" : "") +
      '<w:t xml:space="preserve">' + xmlEsc(r.t) + "</w:t></w:r>";
  }
  function para(inner, ppr) { return "<w:p>" + (ppr || "") + inner + "</w:p>"; }
  function pPr(parts) { return parts ? "<w:pPr>" + parts + "</w:pPr>" : ""; }
  function spacing(before, after) { return '<w:spacing w:before="' + (before || 0) + '" w:after="' + (after || 0) + '"/>'; }

  /* A4 page geometry (twips). 1 inch = 1440 twips; 1 pt = 20 twips. */
  var PAGE_W = 11906, PAGE_H = 16838;
  var MARGIN_TB = 680, MARGIN_LR = 737;              /* ~12mm / ~13mm, matching the print PDF */
  var USABLE_W = PAGE_W - MARGIN_LR * 2;             /* content width in twips */
  var USABLE_H_PT = (PAGE_H - MARGIN_TB * 2) / 20;   /* content height in points */

  /* --- height estimation so we can shrink to fit one page ---
     Deliberately CONSERVATIVE: every constant over-estimates real Word
     layout, so the auto-fit never thinks content fits when it doesn't. */
  function charsPerLine(sizeHalfPt, widthTwips) {
    var avgCharPt = 0.48 * (sizeHalfPt / 2);         /* Calibri avg glyph advance ≈ 0.48·fontPt (calibrated to real layout) */
    var widthPt = widthTwips / 20;
    return Math.max(1, Math.floor(widthPt / avgCharPt));
  }
  function lineHeightPt(sizeHalfPt) { return (sizeHalfPt / 2) * 1.20; }   /* single-spaced Calibri line height */
  function estLines(text, sizeHalfPt, widthTwips) {
    var len = (text || "").length;
    if (!len) return 1;
    return Math.max(1, Math.ceil(len / charsPerLine(sizeHalfPt, widthTwips)));
  }
  var PARA_OVERHEAD_PT = 0.4;    /* small flat per-paragraph cushion for layout rounding */

  /* Build the <w:body> paragraphs at a given typographic scale, and return
     both the XML and an estimated total content height (points). */
  function buildBody(r, scale, fillTwips) {
    var p = r.profile || {}, body = [], hPt = 0;
    fillTwips = fillTwips || 0;                                                    /* extra space spread before each section to fill the page */
    function sz(base) { return Math.max(15, Math.round(base * scale)); }           /* half-points, floor 7.5pt */
    function sp(base) { return Math.max(0, Math.round(base * scale)); }            /* twips */
    function add(xml, sizeHalfPt, text, widthTwips, before, after, extraPt) {
      body.push(xml);
      hPt += estLines(text, sizeHalfPt, widthTwips) * lineHeightPt(sizeHalfPt) +
        (before + after) / 20 + (extraPt || 0) + PARA_OVERHEAD_PT;
    }

    /* Base sizes (half-points) mirror the on-screen preview exactly: px * 1.5
       (96dpi -> pt -> half-pt). Name 24px->18pt, title 16px->12pt, body ~12.8px
       ->9.5pt, etc., so the .docx matches what the preview and PDF show. */
    /* name */
    var nSize = sz(36);
    add(para(runXml({ t: p.name || "Your Name", b: true }, { size: nSize, bold: true }),
      pPr('<w:jc w:val="center"/>' + spacing(0, sp(40)))), nSize, p.name || "Your Name", USABLE_W, 0, sp(40));
    /* title */
    if (p.title) { var tSize = sz(24);
      add(para(runXml({ t: p.title }, { size: tSize, color: "444444" }),
        pPr('<w:jc w:val="center"/>' + spacing(0, sp(30)))), tSize, p.title, USABLE_W, 0, sp(30)); }
    /* contacts */
    var contacts = (p.contacts || []).filter(function (c) { return c.value; });
    if (contacts.length) {
      var joined = contacts.map(function (c) { return c.value; }).join("   |   "), cSize = sz(19);
      add(para(runXml({ t: joined }, { size: cSize, color: "555555" }),
        pPr('<w:jc w:val="center"/>' + spacing(0, sp(110)))), cSize, joined, USABLE_W, 0, sp(110));
    }

    /* sections */
    (r.sections || []).forEach(function (sec) {
      var hdBdr = '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="999999"/></w:pBdr>';
      var hSize = sz(19);
      var hBefore = sp(110) + fillTwips;
      add(para(runXml({ t: sec.title || "Section" }, { bold: true, size: hSize, caps: true, color: "222222" }),
        pPr(hdBdr + spacing(hBefore, sp(44)))), hSize, sec.title || "Section", USABLE_W, hBefore, sp(44), 2.5);

      if (sec.type === "text") {
        var bSize = sz(19);
        var inner = runs(sec.text || "").map(function (x) { return runXml(x, { size: bSize }); }).join("");
        add(para(inner, pPr('<w:jc w:val="both"/>' + spacing(0, sp(70)))), bSize, sec.text || "", USABLE_W, 0, sp(70));
      } else if (sec.type === "labeled") {
        (sec.items || []).forEach(function (it) {
          var lSize = sz(19);
          var lab = it.label ? runXml({ t: it.label + ": ", b: true }, { bold: true, size: lSize }) : "";
          var val = runs(it.value || "").map(function (x) { return runXml(x, { size: lSize }); }).join("");
          add(para(lab + val, pPr(spacing(0, sp(40)))), lSize,
            (it.label ? it.label + ": " : "") + (it.value || ""), USABLE_W, 0, sp(40));
        });
      } else {
        (sec.items || []).forEach(function (it) {
          var tabPos = USABLE_W; /* right tab at content edge */
          var tabs = '<w:tabs><w:tab w:val="right" w:pos="' + tabPos + '"/></w:tabs>';
          var ehSize = sz(20);
          var headInner = runXml({ t: it.heading || "", b: true }, { bold: true, size: ehSize });
          if (it.date) headInner += '<w:r><w:tab/></w:r>' + runXml({ t: it.date }, { size: sz(17), color: "555555" });
          add(para(headInner, pPr(tabs + spacing(sp(44), sp(10)))), ehSize, it.heading || "", USABLE_W, sp(44), sp(10));
          if (it.role) { var roSize = sz(19);
            add(para(runXml({ t: it.role }, { italic: true, size: roSize, color: "333333" }),
              pPr(spacing(0, sp(10)))), roSize, it.role, USABLE_W, 0, sp(10)); }
          if (it.meta) { var mSize = sz(18);
            add(para(runXml({ t: it.meta }, { italic: true, size: mSize, color: "666666" }),
              pPr(spacing(0, sp(20)))), mSize, it.meta, USABLE_W, 0, sp(20)); }
          (it.bullets || []).forEach(function (bt) {
            if (!bt) return;
            var buSize = sz(19), indent = 260;
            var bInner = runXml({ t: "•  " }, { size: buSize }) + runs(bt).map(function (x) { return runXml(x, { size: buSize }); }).join("");
            add(para(bInner, pPr('<w:ind w:left="' + indent + '" w:hanging="' + indent + '"/>' + spacing(0, sp(22)))),
              buSize, "•  " + bt, USABLE_W - indent, 0, sp(22));
          });
        });
      }
    });

    var sectPr = '<w:sectPr><w:pgSz w:w="' + PAGE_W + '" w:h="' + PAGE_H + '" w:orient="portrait" w:code="9"/>' +
      '<w:pgMar w:top="' + MARGIN_TB + '" w:right="' + MARGIN_LR + '" w:bottom="' + MARGIN_TB +
      '" w:left="' + MARGIN_LR + '" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';

    return { xml: body.join("") + sectPr, hPt: hPt };
  }

  function buildDocumentXml(r) {
    /* Auto-fit to exactly one page, matching the preview:
       - if the resume OVERFLOWS, shrink typography until it clears the page
         (font sizes floor at 7.5pt inside sz(), so it stays readable);
       - if it UNDERFLOWS, spread the leftover height evenly before each section
         so the content fills the page with no blank band at the bottom — the
         same thing the preview/PDF do. */
    var over = USABLE_H_PT * 0.96;                   /* shrink target (safety headroom) */
    var fillTarget = USABLE_H_PT * 0.96;             /* fill most of the page; small cushion keeps it safely on one page */
    var FLOOR = 0.55;
    var scale = 1, built = buildBody(r, scale, 0);
    if (built.hPt > over) {
      /* overflow: step down gradually to the largest scale that still fits */
      for (var pass = 0; pass < 24 && built.hPt > over && scale > FLOOR; pass++) {
        scale = Math.max(FLOOR, scale * 0.97);
        built = buildBody(r, scale, 0);
      }
    } else {
      /* underflow: distribute the slack as extra space before each section */
      var secs = (r.sections || []).length || 1;
      var slackPt = fillTarget - built.hPt;
      var FILL_CAP_TWIPS = 480;                      /* ~24pt, mirrors the preview's per-section fill cap */
      var fillTwips = Math.min(FILL_CAP_TWIPS, Math.max(0, Math.round((slackPt / secs) * 20)));
      built = buildBody(r, 1, fillTwips);
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + built.xml + '</w:body></w:document>';
  }

  function exportDocx() {
    var r = activeResume();
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>';
    /* compact defaults: Calibri 10pt, single line spacing, no space-after —
       this (not Word's looser Normal style) is what keeps the resume to one page */
    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/>' +
      '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>' +
      '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>' +
      '</w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '</w:styles>';
    var files = [
      { name: "[Content_Types].xml", bytes: strBytes(contentTypes) },
      { name: "_rels/.rels", bytes: strBytes(rels) },
      { name: "word/document.xml", bytes: strBytes(buildDocumentXml(r)) },
      { name: "word/_rels/document.xml.rels", bytes: strBytes(docRels) },
      { name: "word/styles.xml", bytes: strBytes(styles) }
    ];
    var zipped = zipStore(files);
    var blob = new Blob([zipped], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    var url = URL.createObjectURL(blob), a = el("a"); a.href = url;
    a.download = "Satuluri_Rajesh_Resume.docx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    flash("Word .docx downloaded.");
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
    document.getElementById("btnPdf").addEventListener("click", function () {
      /* the browser's "Save as PDF" uses document.title as the filename —
         swap it to the desired resume name, print, then restore it. */
      var prev = document.title;
      document.title = "Satuluri_Rajesh_Resume";
      var restore = function () { document.title = prev; window.removeEventListener("afterprint", restore); };
      window.addEventListener("afterprint", restore);
      window.print();
      /* fallback restore in case afterprint doesn't fire */
      setTimeout(restore, 1000);
    });
    document.getElementById("btnDocx").addEventListener("click", exportDocx);
    document.getElementById("btnExport").addEventListener("click", exportJson);
    document.getElementById("btnReset").addEventListener("click", resetAll);
    var fileInput = document.getElementById("fileImport");
    document.getElementById("btnImport").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () { if (fileInput.files && fileInput.files[0]) importJson(fileInput.files[0]); fileInput.value = ""; });
    window.addEventListener("resize", fitPreview);
    setupResizer();
    setSaveState("Saved");
  }

  /* Draggable divider: lets the user resize the editor / preview split.
     Width is clamped so neither pane collapses, and remembered across visits. */
  var PREVIEW_W_KEY = "newvisual.resume.previewW";
  function clampPreviewW(w) {
    var vw = document.documentElement.clientWidth || window.innerWidth || 1200;
    var max = Math.max(400, vw - 420);   /* keep the editor usable */
    return Math.max(380, Math.min(w, max, 900));
  }
  function applyPreviewW(w) {
    document.querySelector(".layout").style.setProperty("--preview-w", clampPreviewW(w) + "px");
    fitPreview();
  }
  function setupResizer() {
    var rz = document.getElementById("resizer");
    if (!rz) return;
    var saved = parseFloat(localStorage.getItem(PREVIEW_W_KEY));
    if (isFinite(saved) && saved > 0) applyPreviewW(saved);
    var dragging = false;
    function onMove(e) {
      if (!dragging) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var vw = document.documentElement.clientWidth;
      applyPreviewW(vw - x);     /* preview sits on the right edge */
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      rz.classList.remove("dragging");
      document.body.classList.remove("resizing");
      var w = parseFloat(getComputedStyle(document.querySelector(".layout")).getPropertyValue("--preview-w"));
      if (isFinite(w)) { try { localStorage.setItem(PREVIEW_W_KEY, Math.round(w)); } catch (_) {} }
    }
    function onDown(e) {
      dragging = true;
      rz.classList.add("dragging");
      document.body.classList.add("resizing");
      if (e.cancelable) e.preventDefault();
    }
    rz.addEventListener("mousedown", onDown);
    rz.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    /* double-click resets to the default width */
    rz.addEventListener("dblclick", function () {
      document.querySelector(".layout").style.setProperty("--preview-w", "560px");
      fitPreview();
      try { localStorage.removeItem(PREVIEW_W_KEY); } catch (_) {}
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
