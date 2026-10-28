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

  /* ---------- templates & theming (ATS-safe, single-column) ---------- */
  var THEME_TEMPLATES = {
    classic:  { label: "Classic",  desc: "Centered name, underlined headings" },
    modern:   { label: "Modern",   desc: "Left-aligned, accent name, bold rules" },
    compact:  { label: "Compact",  desc: "Tighter spacing, fits more content" }
  };
  /* ATS-safe font stacks. The `docx` name is what Word embeds. */
  var THEME_FONTS = {
    calibri:  { label: "Calibri",  css: '"Calibri","Segoe UI",Candara,Arial,sans-serif', docx: "Calibri" },
    arial:    { label: "Arial",    css: 'Arial,"Helvetica Neue",Helvetica,sans-serif',   docx: "Arial" },
    georgia:  { label: "Georgia",  css: 'Georgia,"Times New Roman",serif',                docx: "Georgia" },
    garamond: { label: "Garamond", css: '"EB Garamond",Garamond,"Times New Roman",serif', docx: "Garamond" },
    times:    { label: "Times",    css: '"Times New Roman",Times,serif',                  docx: "Times New Roman" }
  };
  var THEME_ACCENTS = [
    { id: "navy",     label: "Navy",     hex: "#1f3b66" },
    { id: "teal",     label: "Teal",     hex: "#1f7d92" },
    { id: "blue",     label: "Blue",     hex: "#2456b3" },
    { id: "green",    label: "Green",    hex: "#206a4e" },
    { id: "burgundy", label: "Burgundy", hex: "#7a2234" },
    { id: "slate",    label: "Slate",    hex: "#3a4452" },
    { id: "black",    label: "Black",    hex: "#1a1a1a" }
  ];
  var THEME_DENSITIES = { compact: 0.92, normal: 1, relaxed: 1.08 };
  function accentHex(id) { for (var i = 0; i < THEME_ACCENTS.length; i++) if (THEME_ACCENTS[i].id === id) return THEME_ACCENTS[i].hex; return THEME_ACCENTS[1].hex; }
  function normalizeTheme(t) {
    t = t && typeof t === "object" ? t : {};
    return {
      template: THEME_TEMPLATES[t.template] ? t.template : "classic",
      font:     THEME_FONTS[t.font] ? t.font : "calibri",
      accent:   /^#[0-9a-fA-F]{6}$/.test(t.accent) ? t.accent : (t.accent && accentHex(t.accent)) || "#1f7d92",
      density:  THEME_DENSITIES[t.density] ? t.density : "normal"
    };
  }
  function activeTheme() { var r = activeResume(); return (r && r.theme) || normalizeTheme(null); }

  /* ---------- utils ---------- */
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function el(tag, cls, attrs) { var n = document.createElement(tag); if (cls) n.className = cls; if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); return n; }
  function elText(tag, cls, txt) { var n = el(tag, cls); n.textContent = txt; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function moveIn(arr, idx, dir) { var j = idx + dir; if (j < 0 || j >= arr.length) return false; var t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; return true; }

  /* ---------- drag-and-drop list reordering ----------
     Reorders an array by dragging a handle. `group` scopes drops so items only
     drop within their own list (sections to sections, a job's bullets to that
     same job). The ▲▼ buttons remain as a keyboard/click fallback. */
  var dragState = null;
  function clearDragMarks() { var ns = document.querySelectorAll(".drag-over"); for (var i = 0; i < ns.length; i++) ns[i].classList.remove("drag-over"); }
  function makeDragItem(node, handle, arr, idx, group, after) {
    handle.setAttribute("draggable", "true");
    handle.classList.add("drag-handle");
    handle.setAttribute("aria-label", "Drag to reorder");
    handle.title = "Drag to reorder";
    handle.addEventListener("dragstart", function (e) {
      dragState = { arr: arr, from: idx, group: group };
      node.classList.add("dragging");
      try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); } catch (_) {}
    });
    handle.addEventListener("dragend", function () { node.classList.remove("dragging"); clearDragMarks(); dragState = null; });
    node.addEventListener("dragover", function (e) {
      if (!dragState || dragState.group !== group || dragState.arr !== arr) return;
      e.preventDefault(); try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
      if (dragState.from !== idx) node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", function () { node.classList.remove("drag-over"); });
    node.addEventListener("drop", function (e) {
      if (!dragState || dragState.group !== group || dragState.arr !== arr) return;
      e.preventDefault(); e.stopPropagation();
      var from = dragState.from, to = idx;
      node.classList.remove("drag-over"); dragState = null;
      if (from === to || from < 0 || from >= arr.length) return;
      var item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      renderApp(); touch();
      if (after) after();
    });
  }
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

  /* A blank resume scaffold for brand-new users — the structure is there to
     fill in, but NOTHING is pre-written, so demo text can never be mistaken for
     the user's own data. */
  function emptyContent() {
    return {
      profile: { name: "", title: "", contacts: [
        { icon: "✉", value: "" }, { icon: "☎", value: "" }, { icon: "⚲", value: "" }
      ] },
      sections: [
        { id: uid(), title: "Professional Summary", type: "text", text: "" },
        { id: uid(), title: "Technical Skills", type: "labeled", items: [ { id: uid(), label: "", value: "" } ] },
        { id: uid(), title: "Professional Experience", type: "entries", items: [ { id: uid(), heading: "", role: "", date: "", meta: "", bullets: [""] } ] },
        { id: uid(), title: "Education", type: "entries", items: [ { id: uid(), heading: "", role: "", date: "", meta: "", bullets: [] } ] }
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
  /* What a first-time visitor gets: a blank resume and an onboarding prompt —
     not a stranger's pre-filled data. */
  function firstRunStore() {
    var c = emptyContent();
    var resume = { id: uid(), name: "My Resume", targetRole: "", profile: c.profile, sections: c.sections };
    return { library: emptyLibrary(), resumes: [resume], activeResumeId: resume.id, aiAssist: { fields: {}, jd: "" }, onboarded: false };
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
    return firstRunStore();
  }
  function normalize(s) {
    if (!s || !Array.isArray(s.resumes) || !s.resumes.length) return sampleStore();
    s.library = s.library || emptyLibrary();
    LIB_KEYS.forEach(function (k) { s.library[k] = s.library[k] || []; });
    s.resumes.forEach(function (r) {
      r.profile = r.profile || { name: "", title: "", contacts: [] };
      r.profile.contacts = r.profile.contacts || [];
      r.sections = r.sections || [];
      r.theme = normalizeTheme(r.theme);
      r.pages = (r.pages === 2) ? 2 : 1;
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
    if (s.onboarded === undefined) s.onboarded = true;   /* existing data = already past onboarding */
    if (!Array.isArray(s.snippets)) s.snippets = [];
    if (!Array.isArray(s.applications)) s.applications = [];
    if (!s.coverLetter || typeof s.coverLetter !== "object") s.coverLetter = { company: "", manager: "", role: "", body: "" };
    return s;
  }
  function persist(s) { try { localStorage.setItem(KEY3, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function save() {
    var ok = persist(store);
    if (!ok) {
      /* storage full / blocked (private mode, quota). Tell the truth — don't
         pretend it saved. The in-memory data is still intact for this session. */
      setSaveState("⚠ Save failed", true);
      if (!save._warned) { save._warned = true; flash("Couldn't save to this browser — storage may be full or blocked. Export your data to keep it."); }
      return;
    }
    save._warned = false;
    /* record an undo snapshot at each save boundary (coarse-grained, ~400ms
       after a burst of edits — the right granularity for a document editor). */
    var cur = snapshotStr();
    if (lastSnapshot !== null && cur !== lastSnapshot) {
      undoStack.push(lastSnapshot);
      if (undoStack.length > UNDO_CAP) undoStack.shift();
      redoStack = [];
    }
    lastSnapshot = cur;
    setSaveState("Saved");
    updateUndoButtons();
  }
  function setSaveState(txt, dirty) { var s = document.getElementById("saveState"); if (!s) return; s.textContent = txt; s.classList.toggle("dirty", !!dirty); }
  function touch() { setSaveState("Saving…", true); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); renderPreview(); }
  function scheduleSave() { setSaveState("Saving…", true); if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

  /* ---------- undo / redo (snapshot stacks, state at save boundaries) ---------- */
  var undoStack = [], redoStack = [], lastSnapshot = null, UNDO_CAP = 60;
  function snapshotStr() { try { return JSON.stringify(store); } catch (e) { return ""; } }
  function updateUndoButtons() {
    var u = document.getElementById("btnUndo"), r = document.getElementById("btnRedo");
    if (u) { u.disabled = !undoStack.length; u.title = undoStack.length ? "Undo (Ctrl+Z) — " + undoStack.length + " step" + (undoStack.length > 1 ? "s" : "") : "Nothing to undo"; }
    if (r) { r.disabled = !redoStack.length; }
  }
  function applySnapshot(str) {
    try { store = normalize(JSON.parse(str)); } catch (e) { return false; }
    lastSnapshot = snapshotStr();
    persist(store);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    renderApp(); setSaveState("Saved"); updateUndoButtons();
    return true;
  }
  function doUndo() {
    if (!undoStack.length) { flash("Nothing to undo."); return; }
    /* flush any pending debounced edit into the current snapshot first */
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; persist(store); lastSnapshot = snapshotStr(); }
    var cur = snapshotStr(), prev = undoStack.pop();
    if (applySnapshot(prev)) { redoStack.push(cur); updateUndoButtons(); flash("Undo"); }
  }
  function doRedo() {
    if (!redoStack.length) { flash("Nothing to redo."); return; }
    var cur = snapshotStr(), next = redoStack.pop();
    if (applySnapshot(next)) { undoStack.push(cur); updateUndoButtons(); flash("Redo"); }
  }
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
  function dateField(label, val, dueTxt, onInput) {
    var f = el("div", "field");
    var lab = el("label");
    lab.appendChild(document.createTextNode(label));
    if (dueTxt) { var d = daysUntil(val); lab.appendChild(elText("span", "due-pill" + (d !== null && d < 0 ? " overdue" : (d !== null && d <= 2 ? " soon" : "")), dueTxt)); }
    f.appendChild(lab);
    var i = el("input", "inp"); i.type = "date"; i.value = val || "";
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
    /* keyboard-operable disclosure: focusable, Enter/Space toggles, state announced */
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    head.setAttribute("aria-expanded", collapsed[collapseKey] ? "false" : "true");
    head.setAttribute("aria-label", (titleText || (headInput && headInput.value) || "Section") + " — toggle");
    head.appendChild(elText("span", "caret", "▼"));
    head.appendChild(elText("span", "sec-icon", iconFor(titleText || (headInput && headInput.value))));
    if (headInput) head.appendChild(headInput); else head.appendChild(elText("span", "sec-title", titleText));
    if (headRight) { for (var i = 0; i < headRight.length; i++) head.appendChild(headRight[i]); }
    function toggle() {
      collapsed[collapseKey] = !collapsed[collapseKey];
      b.classList.toggle("collapsed", collapsed[collapseKey]);
      head.setAttribute("aria-expanded", collapsed[collapseKey] ? "false" : "true");
      if (!collapsed[collapseKey]) growAll(b);
    }
    head.addEventListener("click", function (e) {
      if (e.target.closest("input, button, .move, .grip, select, a")) return;
      toggle();
    });
    head.addEventListener("keydown", function (e) {
      if (e.target !== head) return;   /* don't hijack keys inside the title input */
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
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
    else if (activeTab === "tracker") renderTracker(panel);
    else if (activeTab === "cover") renderCover(panel);
    else renderResumes(panel);
    growAll(panel);
    applyA11yLabels(panel);
    var curTab = document.querySelector('#tabs .tab[data-tab="' + activeTab + '"]');
    for (var t = 0; t < tabs.length; t++) tabs[t].setAttribute("aria-selected", tabs[t] === curTab ? "true" : "false");

    /* right panel: resume preview normally, big field editor on AI tab */
    document.body.classList.toggle("ai-active", activeTab === "ai");
    if (activeTab === "ai") renderAiPane();
    else renderPreview();
  }

  /* Give icon-only controls an accessible name so screen readers announce the
     action rather than the glyph. Runs after each render. */
  var GLYPH_LABELS = { "▲": "Move up", "▼": "Move down", "✕": "Remove", "☆": "Save to bullet bank", "＋": "Add", "⠿": "Drag to reorder", "↶": "Undo", "↷": "Redo", "↩": "Restore", "🗑": "Delete", "⧉": "Copy", "⬆": "Upload", "⬇": "Download" };
  function applyA11yLabels(root) {
    var nodes = (root || document).querySelectorAll("button, .move, .grip, .rc-archive");
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      if (b.getAttribute("aria-label")) continue;
      var t = (b.textContent || "").trim();
      if (GLYPH_LABELS[t]) { b.setAttribute("aria-label", GLYPH_LABELS[t]); continue; }
      var first = t.charAt(0);
      if (GLYPH_LABELS[first] && t.length <= 2) { b.setAttribute("aria-label", GLYPH_LABELS[first]); continue; }
      /* a glyph-led label like "＋ Add bullet" is already readable; only bare glyphs need help */
      if (b.title && /^[^0-9A-Za-z]{1,2}$/.test(t)) b.setAttribute("aria-label", b.title);
    }
  }

  /* ============================================================
     RESUMES TAB — pick a resume and edit ALL its content
     ============================================================ */
  function renderResumes(panel) {
    /* first-run onboarding — only for brand-new visitors (no stored data) */
    if (store.onboarded === false) panel.appendChild(onboardingCard());

    /* sample-content banner — demo data is always clearly marked so it's never
       mistaken for the user's own */
    var act = activeResume();
    if (act && act.isSample) {
      var sb = el("div", "sample-banner");
      sb.appendChild(elText("span", "sb-icon", "🧪"));
      var sbt = el("div", "sb-text");
      sbt.appendChild(elText("strong", null, "This is sample content."));
      sbt.appendChild(elText("span", null, " It's here to show the structure — edit it into your own, or delete it. Nothing here is your real data."));
      sb.appendChild(sbt);
      sb.appendChild(miniBtn("✓ Make it mine", function () { act.isSample = false; renderApp(); touch(); flash("Marked as your own resume."); }));
      panel.appendChild(sb);
    }

    /* switcher */
    panel.appendChild(elText("div", "group-label", "Your resumes — click to edit"));
    var switcher = el("div", "resume-switcher");
    store.resumes.filter(function (r) { return !r.archived; }).forEach(function (r) {
      var isActive = r.id === store.activeResumeId;
      var chip = el("button", "resume-chip" + (isActive ? " active" : "")); chip.type = "button";
      if (isActive) chip.appendChild(elText("span", "rc-check", "✓ Editing"));
      if (r.isSample) chip.appendChild(elText("span", "rc-sample", "SAMPLE"));
      chip.appendChild(elText("span", "rc-name", r.name || "Untitled"));
      if (r.targetRole) chip.appendChild(elText("span", "rc-role", r.targetRole));
      var arch = el("span", "rc-archive"); arch.textContent = "Archive"; arch.title = "Move to archive";
      arch.addEventListener("click", function (e) { e.stopPropagation(); archiveResume(r); });
      chip.appendChild(arch);
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

    /* readiness dashboard — a one-glance summary of this resume's state */
    panel.appendChild(readinessBlock(r));

    /* archived resumes — tucked away, restorable */
    var archivedList = store.resumes.filter(function (r) { return r.archived; });
    if (archivedList.length) {
      if (collapsed["r.archived"] === undefined) collapsed["r.archived"] = true;
      panel.appendChild(blockEl("Archived (" + archivedList.length + ")", "r.archived", function (body) {
        body.appendChild(elText("p", "hint", "Resumes you've set aside. Restore one to bring it back to the list above."));
        var wrap = el("div", "archive-list");
        archivedList.forEach(function (r) {
          var row = el("div", "archive-row");
          var meta = el("div", "archive-meta");
          meta.appendChild(elText("span", "ar-name", r.name || "Untitled"));
          if (r.targetRole) meta.appendChild(elText("span", "ar-role", r.targetRole));
          row.appendChild(meta);
          var btns = el("div", "archive-btns");
          btns.appendChild(miniBtn("↩ Restore", function () { unarchiveResume(r); }));
          btns.appendChild(miniBtn("🗑 Delete", function () { deleteResume(r); }, "btn-danger"));
          row.appendChild(btns);
          wrap.appendChild(row);
        });
        body.appendChild(wrap);
      }));
    }

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

    /* design & template */
    panel.appendChild(designBlock(r));

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
    foot.appendChild(miniBtn("📜 Add Certifications", function () {
      if (findSection(r, "Certifications", "entries")) { flash("You already have a Certifications section."); return; }
      r.sections.push({ id: uid(), title: "Certifications", type: "entries", items: [ { id: uid(), heading: "", role: "", date: "", meta: "", bullets: [] } ] });
      renderApp(); touch();
      var ed = document.getElementById("editor"); ed.scrollTop = ed.scrollHeight;
    }, "js-add"));
    foot.appendChild(miniBtn("📚 Add from Library…", function () { openLibraryInsert(r); }, "js-add"));
    panel.appendChild(foot);
  }

  function designBlock(r) {
    r.theme = normalizeTheme(r.theme);
    if (collapsed["r.design"] === undefined) collapsed["r.design"] = true;
    return blockEl("Design & template", "r.design", function (body) {
      body.appendChild(elText("p", "hint", "Every template is single-column and ATS-safe. Changes apply to this resume's preview, PDF, and Word export."));
      /* template */
      body.appendChild(elText("div", "design-label", "Template"));
      var tg = el("div", "tmpl-grid");
      Object.keys(THEME_TEMPLATES).forEach(function (key) {
        var t = THEME_TEMPLATES[key];
        var b = el("button", "tmpl-opt" + (r.theme.template === key ? " sel" : "")); b.type = "button";
        b.appendChild(elText("span", "tmpl-name", t.label));
        b.appendChild(elText("span", "tmpl-desc", t.desc));
        b.addEventListener("click", function () { r.theme.template = key; renderApp(); touch(); });
        tg.appendChild(b);
      });
      body.appendChild(tg);
      /* font + density side by side */
      var row = el("div", "row-2");
      var fontField = el("div", "field");
      fontField.appendChild(elText("label", null, "Font (ATS-safe)"));
      var fsel = el("select", "inp");
      Object.keys(THEME_FONTS).forEach(function (key) { var o = el("option"); o.value = key; o.textContent = THEME_FONTS[key].label; if (r.theme.font === key) o.selected = true; fsel.appendChild(o); });
      fsel.addEventListener("change", function () { r.theme.font = fsel.value; renderApp(); touch(); });
      fontField.appendChild(fsel); row.appendChild(fontField);
      var dField = el("div", "field");
      dField.appendChild(elText("label", null, "Density"));
      var dsel = el("select", "inp");
      [["compact", "Compact"], ["normal", "Normal"], ["relaxed", "Relaxed"]].forEach(function (o) { var op = el("option"); op.value = o[0]; op.textContent = o[1]; if (r.theme.density === o[0]) op.selected = true; dsel.appendChild(op); });
      dsel.addEventListener("change", function () { r.theme.density = dsel.value; renderApp(); touch(); });
      dField.appendChild(dsel); row.appendChild(dField);
      body.appendChild(row);
      /* page length */
      body.appendChild(elText("div", "design-label", "Length"));
      var pg = el("div", "seg-toggle");
      [[1, "1 page", "Best for < ~10 yrs experience"], [2, "2 pages", "For senior / extensive history"]].forEach(function (o) {
        var b = el("button", "seg-opt" + (r.pages === o[0] ? " sel" : "")); b.type = "button";
        b.appendChild(elText("span", "seg-name", o[1]));
        b.appendChild(elText("span", "seg-desc", o[2]));
        b.addEventListener("click", function () { r.pages = o[0]; renderApp(); touch(); });
        pg.appendChild(b);
      });
      body.appendChild(pg);
      /* accent */
      body.appendChild(elText("div", "design-label", "Accent color"));
      var sw = el("div", "accent-row");
      THEME_ACCENTS.forEach(function (a) {
        var b = el("button", "accent-dot" + (r.theme.accent === a.hex ? " sel" : "")); b.type = "button";
        b.style.background = a.hex; b.title = a.label; b.setAttribute("aria-label", "Accent " + a.label);
        b.addEventListener("click", function () { r.theme.accent = a.hex; renderApp(); touch(); });
        sw.appendChild(b);
      });
      body.appendChild(sw);
    });
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

    var grip = el("span", "move grip"); grip.textContent = "⠿"; grip.title = "Drag to reorder section";
    var up = el("span", "move"); up.textContent = "▲"; up.title = "Move section up";
    up.addEventListener("click", function () { if (moveIn(r.sections, idx, -1)) { renderApp(); touch(); } });
    var down = el("span", "move"); down.textContent = "▼"; down.title = "Move section down";
    down.addEventListener("click", function () { if (moveIn(r.sections, idx, 1)) { renderApp(); touch(); } });
    var star = miniBtn("★ Save to Library", function () { saveSectionToLibrary(sec); }, "js-add");
    var del = miniBtn("Delete", function () { if (confirm("Delete section \"" + sec.title + "\"?")) { r.sections.splice(idx, 1); renderApp(); touch(); } }, "btn-danger");

    var block = blockEl(sec.title, "r.sec." + sec.id, function (body) {
      if (sec.type === "text") {
        body.appendChild(fieldTextarea("Paragraph (use **bold**)", sec.text, function (v) { sec.text = v; touch(); }));
      } else if (sec.type === "labeled") {
        renderLabeledEditor(body, sec, true);
      } else {
        renderEntriesEditor(body, sec, true);
      }
      body.appendChild(typeSwitcher(sec));
    }, [grip, up, down, star, del], titleInput);
    makeDragItem(block, grip, r.sections, idx, "sections");
    return block;
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

  /* ---------- structured date-range picker ----------
     Writes a consistent "MMM YYYY – Present" string into it.date (still the
     single source of truth for preview/export), so dates stay uniform without
     changing the data model. The free-text field remains for odd cases. */
  var MONTHS_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parseDatePart(s) {
    s = (s || "").trim();
    if (/present|current|now|ongoing/i.test(s) && !/\d/.test(s)) return { present: true, mon: "", year: "" };
    var ym = s.match(/(19|20)\d{2}/), year = ym ? ym[0] : "";
    var mm = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/i), mon = "";
    if (mm) { var k = mm[1].slice(0, 3).toLowerCase(); for (var i = 0; i < MONTHS_ABBR.length; i++) if (MONTHS_ABBR[i].toLowerCase() === k) mon = MONTHS_ABBR[i]; }
    return { present: false, mon: mon, year: year };
  }
  function splitRange(s) { var parts = (s || "").split(/\s*(?:–|—|-|\bto\b)\s*/i); return { start: parts[0] || "", end: parts.length > 1 ? parts[parts.length - 1] : "" }; }
  function dateRangeControl(it) {
    var f = el("div", "field date-field");
    f.appendChild(elText("label", null, "Date range"));
    var inp = el("input", "inp"); inp.value = it.date || ""; inp.placeholder = "e.g. Jul 2022 – Present";
    inp.addEventListener("input", function () { it.date = inp.value; touch(); });
    f.appendChild(inp);
    var toggle = el("button", "btn btn-mini date-pick-toggle"); toggle.type = "button"; toggle.textContent = "📅 Pick dates";
    var pick = el("div", "date-pick");
    var rng = splitRange(it.date), sp = parseDatePart(rng.start), ep = parseDatePart(rng.end);
    function monthSel(val) { var s = el("select", "inp"); var o0 = el("option"); o0.value = ""; o0.textContent = "Month"; s.appendChild(o0); MONTHS_ABBR.forEach(function (m) { var o = el("option"); o.value = m; o.textContent = m; if (m === val) o.selected = true; s.appendChild(o); }); return s; }
    function yearSel(val) { var s = el("select", "inp"); var o0 = el("option"); o0.value = ""; o0.textContent = "Year"; s.appendChild(o0); var now = new Date().getFullYear(); for (var y = now + 1; y >= now - 45; y--) { var o = el("option"); o.value = String(y); o.textContent = String(y); if (String(y) === val) o.selected = true; s.appendChild(o); } return s; }
    var sMon = monthSel(sp.mon), sYear = yearSel(sp.year), eMon = monthSel(ep.mon), eYear = yearSel(ep.year);
    var present = el("input"); present.type = "checkbox"; present.checked = ep.present;
    function compose() {
      var start = (sMon.value || "") + (sMon.value && sYear.value ? " " : "") + (sYear.value || "");
      var end = present.checked ? "Present" : ((eMon.value || "") + (eMon.value && eYear.value ? " " : "") + (eYear.value || ""));
      it.date = (start + (start && end ? " – " : "") + end).trim(); inp.value = it.date;
      eMon.disabled = present.checked; eYear.disabled = present.checked; touch();
    }
    [sMon, sYear, eMon, eYear].forEach(function (s) { s.addEventListener("change", compose); });
    present.addEventListener("change", compose);
    eMon.disabled = present.checked; eYear.disabled = present.checked;
    var startRow = el("div", "date-pick-row"); startRow.appendChild(elText("span", "dp-lbl", "Start")); startRow.appendChild(sMon); startRow.appendChild(sYear);
    var endRow = el("div", "date-pick-row"); endRow.appendChild(elText("span", "dp-lbl", "End")); endRow.appendChild(eMon); endRow.appendChild(eYear);
    var presentRow = el("label", "dp-present"); presentRow.appendChild(present); presentRow.appendChild(document.createTextNode(" Present (current role)"));
    pick.appendChild(startRow); pick.appendChild(endRow); pick.appendChild(presentRow);
    toggle.addEventListener("click", function () { pick.classList.toggle("open"); });
    f.appendChild(toggle); f.appendChild(pick);
    return f;
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
      var egrip = el("span", "move grip item-grip"); egrip.textContent = "⠿";
      top.appendChild(egrip);
      top.appendChild(elText("span", "lbl", it.heading || ("Entry " + (i + 1))));
      var tools = el("div", "item-tools");
      tools.appendChild(miniBtn("▲", function () { if (moveIn(sec.items, i, -1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("▼", function () { if (moveIn(sec.items, i, 1)) { renderApp(); touch(); } }));
      tools.appendChild(miniBtn("✕", function () { sec.items.splice(i, 1); renderApp(); touch(); }, "btn-danger"));
      top.appendChild(tools); wrap.appendChild(top);
      makeDragItem(wrap, egrip, sec.items, i, "items:" + sec.id);
      wrap.appendChild(fieldInput("Company / project / school", it.heading, function (v) { it.heading = v; touch(); }));
      var r2 = el("div", "row-2");
      r2.appendChild(fieldInput("Role / title (optional)", it.role, function (v) { it.role = v; touch(); }));
      r2.appendChild(dateRangeControl(it));
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
        var grip = el("span", "move grip bullet-grip"); grip.textContent = "⠿";
        row.appendChild(grip);
        var ta = el("textarea", "inp"); ta.value = bt; ta.setAttribute("data-b", it.id + "_" + bi);
        ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
        /* Enter adds the next bullet and focuses it (Shift+Enter = newline within) */
        ta.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            it.bullets.splice(bi + 1, 0, "");
            touch(); renderApp();
            var nn = document.querySelector('[data-b="' + it.id + "_" + (bi + 1) + '"]');
            if (nn) { nn.focus(); }
          }
        });
        row.appendChild(ta);
        row.appendChild(miniBtn("☆", function () {
          if (saveSnippet(it.bullets[bi])) { flash("Saved to bullet bank."); touch(); renderApp(); }
          else flash((it.bullets[bi] || "").trim() ? "Already in your bank." : "Write the bullet first.");
        }, "js-star"));
        row.appendChild(miniBtn("✕", function () { it.bullets.splice(bi, 1); renderApp(); touch(); }, "btn-danger"));
        makeDragItem(row, grip, it.bullets, bi, "bullets:" + it.id);
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
  // Build the download/file base name for a resume: the resume name, plus the
  // target company (from targetRole) appended with an underscore, e.g.
  // "Satuluri_Rajesh_Resume_FISGlobal". Falls back to a sensible default.
  function resumeFileBase(r) {
    r = r || activeResume();
    var base = ((r && r.name) || "Satuluri_Rajesh_Resume").trim().replace(/\s+/g, "_");
    if (!base) base = "Satuluri_Rajesh_Resume";
    var company = ((r && r.targetRole) || "").trim().replace(/[^A-Za-z0-9]+/g, "");
    return company ? base + "_" + company : base;
  }
  /* ---------- readiness dashboard ---------- */
  function completenessChecks(r) {
    var p = r.profile || {};
    return [
      { ok: !!(p.name && p.name.trim()), label: "Your name" },
      { ok: !!(p.title && p.title.trim()), label: "Professional title" },
      { ok: (p.contacts || []).some(function (c) { return /@/.test(c.value || ""); }), label: "Email" },
      { ok: (p.contacts || []).some(function (c) { return c.value && c.value.trim() && !/@/.test(c.value); }), label: "Phone / location" },
      { ok: !!(findSummary(r) || "").trim(), label: "Summary" },
      { ok: (r.sections || []).some(function (s) { return s.type === "entries" && (s.items || []).some(function (it) { return (it.bullets || []).some(function (b) { return b && b.trim(); }); }); }), label: "Experience bullets" },
      { ok: (r.sections || []).some(function (s) { return s.type === "labeled" && /skill/i.test(s.title || "") && (s.items || []).some(function (it) { return (it.value || "").trim(); }); }), label: "Skills" },
      { ok: (r.sections || []).some(function (s) { return /educ/i.test(s.title || "") && (s.items || []).some(function (it) { return (it.heading || "").trim(); }); }), label: "Education" }
    ];
  }
  function scoreBand(n) { return n >= 85 ? "high" : (n >= 60 ? "mid" : "low"); }
  function statTile(label, val, bandCls, onClick) {
    var t = el(onClick ? "button" : "div", "stat-tile " + (bandCls || "")); if (onClick) { t.type = "button"; t.addEventListener("click", onClick); t.title = "Open " + label; }
    t.appendChild(elText("span", "stat-val", String(val)));
    t.appendChild(elText("span", "stat-lbl", label));
    return t;
  }
  function readinessBlock(r) {
    var checks = completenessChecks(r), done = checks.filter(function (c) { return c.ok; }).length;
    var pct = Math.round(done / checks.length * 100);
    var health = analyzeHealth(r);
    var fitOver = document.body.classList.contains("is-over");
    var jd = jdAnalysis ? jdAnalysis.score : null;
    var block = el("div", "readiness");
    block.appendChild(elText("div", "readiness-title", "Resume readiness"));
    var grid = el("div", "readiness-grid");
    grid.appendChild(statTile("Complete", pct + "%", scoreBand(pct)));
    grid.appendChild(statTile("Health", health.score, scoreBand(health.score), function () { activeTab = "health"; renderApp(); }));
    grid.appendChild(statTile("Page fit", fitOver ? "Review" : (r.pages === 2 ? "2 pg" : "1 pg"), fitOver ? "low" : "high"));
    grid.appendChild(statTile("JD match", jd != null ? jd + "%" : "—", jd != null ? scoreBand(jd) : "none", function () { activeTab = "jd"; renderApp(); }));
    block.appendChild(grid);
    var missing = checks.filter(function (c) { return !c.ok; });
    if (missing.length) block.appendChild(elText("p", "readiness-missing", "To finish: " + missing.map(function (m) { return m.label; }).join(" · ")));
    else block.appendChild(elText("p", "readiness-done", "✓ All the essentials are filled in — polish it in Health and tailor it in JD Match."));
    return block;
  }

  /* ---------- onboarding (first run) ---------- */
  function onboardingCard() {
    var card = el("div", "onboard-card");
    card.appendChild(elText("div", "onboard-title", "👋 Welcome to Resume Builder"));
    card.appendChild(elText("p", "onboard-lead", "Free, private, and 100% in your browser — nothing is uploaded. Build a clean, ATS-friendly resume, tailor it to any job, and export to PDF or Word."));
    card.appendChild(elText("p", "onboard-lead", "Start from a blank resume, or load a clearly-marked sample to see how everything fits together."));
    var row = el("div", "onboard-actions");
    row.appendChild(miniBtn("✍ Start blank", function () { store.onboarded = true; renderApp(); touch(); flash("Blank resume ready — fill in your details."); }, "btn-primary"));
    row.appendChild(miniBtn("🧪 Load a sample", function () { loadSample(); }));
    card.appendChild(row);
    return card;
  }
  /* Replace the active (empty) resume with marked sample content. */
  function loadSample() {
    var c = sampleContent(), r = activeResume();
    r.profile = { name: c.profile.name, title: c.profile.title, contacts: clone(c.profile.contacts) };
    r.sections = clone(c.sections);
    r.sections.forEach(function (s) { s.id = uid(); (s.items || []).forEach(function (it) { it.id = uid(); }); });
    r.isSample = true;
    if (!store.library || !LIB_KEYS.some(function (k) { return (store.library[k] || []).length; })) store.library = libraryFromSections(c.sections);
    store.onboarded = true;
    renderApp(); touch(); flash("Sample loaded — it's marked so you don't mistake it for your own.");
  }
  function newResume() {
    // start from the full standard template (all sections present) so a new
    // resume has everything ready to tailor, not a blank document
    var c = sampleContent();
    var r = { id: uid(), name: "Satuluri_Rajesh_Resume", targetRole: "",
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
  function archiveResume(r) {
    var activeCount = store.resumes.filter(function (x) { return !x.archived; }).length;
    if (activeCount <= 1) { alert("Keep at least one resume active. Restore or create another before archiving this one."); return; }
    r.archived = true;
    if (store.activeResumeId === r.id) {
      var firstActive = store.resumes.filter(function (x) { return !x.archived; })[0];
      if (firstActive) store.activeResumeId = firstActive.id;
    }
    renderApp(); touch(); flash("Moved “" + (r.name || "Untitled") + "” to archive");
  }
  function unarchiveResume(r) {
    r.archived = false; store.activeResumeId = r.id; renderApp(); touch();
    flash("Restored “" + (r.name || "Untitled") + "”");
  }
  function deleteResume(r) {
    if (store.resumes.length <= 1) { alert("You need at least one resume. Create another before deleting this one."); return; }
    if (!confirm("Delete resume \"" + (r.name || "Untitled") + "\"?")) return;
    var wasActive = store.activeResumeId === r.id;
    var idx = store.resumes.indexOf(r); store.resumes.splice(idx, 1);
    if (wasActive) {
      var firstActive = store.resumes.filter(function (x) { return !x.archived; })[0] || store.resumes[0];
      store.activeResumeId = firstActive.id;
    }
    renderApp(); touch();
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
  var librarySearch = "";
  function libHaystack(it) {
    var parts = [it.label, it.value, it.text, it.heading, it.role, it.meta, it.tags];
    if (it.bullets) parts = parts.concat(it.bullets);
    return parts.filter(Boolean).join("  ").toLowerCase();
  }
  function filterLibrary(q) {
    q = (q || "").trim().toLowerCase();
    var items = document.querySelectorAll("#tabPanel .item[data-search]");
    for (var i = 0; i < items.length; i++) {
      var hit = !q || items[i].getAttribute("data-search").indexOf(q) >= 0;
      items[i].style.display = hit ? "" : "none";
    }
    /* hide category blocks with no visible items while searching; expand matches */
    var blocks = document.querySelectorAll("#tabPanel .block");
    for (var b = 0; b < blocks.length; b++) {
      var its = blocks[b].querySelectorAll(".item[data-search]");
      if (!its.length) continue;   /* not a library category block */
      var visible = false;
      for (var k = 0; k < its.length; k++) if (its[k].style.display !== "none") { visible = true; break; }
      blocks[b].style.display = (visible || !q) ? "" : "none";
      if (q && visible) blocks[b].classList.remove("collapsed");
    }
    var note = document.getElementById("libSearchNote");
    if (note) {
      var total = items.length, shown = 0;
      for (var m = 0; m < items.length; m++) if (items[m].style.display !== "none") shown++;
      note.textContent = q ? (shown + " of " + total + " item" + (total !== 1 ? "s" : "") + " match") : "";
    }
  }
  function libTagsField(it) {
    var f = el("div", "field lib-tags");
    f.appendChild(elText("label", null, "Tags (comma-separated — used by search)"));
    var i = el("input", "inp"); i.value = it.tags || ""; i.placeholder = "e.g. cloud, leadership, python";
    i.addEventListener("input", function () { it.tags = i.value; touch(); var w = i.closest(".item"); if (w) w.setAttribute("data-search", libHaystack(it)); });
    f.appendChild(i); return f;
  }
  function renderLibrary(panel) {
    panel.appendChild(elText("p", "panel-hint", "Your personal document store — keep all your material here for reference and reuse. Use “Add from Library” inside a resume to pull items in. Editing here does not change any resume."));
    /* search box */
    var sw = el("div", "lib-search");
    var si = el("input", "inp"); si.id = "libSearch"; si.type = "search"; si.value = librarySearch;
    si.placeholder = "🔍  Search your library — text or tags…"; si.setAttribute("aria-label", "Search library");
    si.addEventListener("input", function () { librarySearch = si.value; filterLibrary(si.value); });
    sw.appendChild(si);
    sw.appendChild(elText("span", "lib-search-note", "")).id = "libSearchNote";
    panel.appendChild(sw);
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
    if (librarySearch) filterLibrary(librarySearch);
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
        wrap.appendChild(libTagsField(it));
        wrap.setAttribute("data-search", libHaystack(it));
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
    { title: "What actually happens (recruiter field data)", key: "ats.reality", tips: [
      "You're more likely INVISIBLE than rejected. In a survey of 630 recruiters, ~92% said their ATS does NOT auto-reject on content — recruiters search the ATS like a database (keywords, job titles, experience ranges). If you don't match what they type, you simply never surface. The fix is matching, not luck.",
      "The “75% get auto-rejected” stat is misleading — the real problem is quieter: your resume is there but never shown. That's why applicants hear silence, not “no”.",
      "Biggest single lever: put the EXACT job title from the posting in your header/summary. Resumes matching the exact title saw ~10.6× the callback rate of those that didn't.",
      "Use the literal title, not a synonym or a fancier version. If the posting says “Senior Product Manager”, write “Senior Product Manager” — not “Product Lead” or “Head of Product Strategy”. Keyword filters are largely literal.",
      "This is free and takes ~30 seconds per application — set the resume's title line to the role you're applying for. Almost nobody does it, which is the opportunity.",
      "The “pretty resume” tax is real: heavily designed, multi-column, graphic-heavy resumes (common for designers/creatives) parse worst — not because the person is less qualified, but because the machine can't read them. Clean, single-column text wins. This app already outputs machine-readable text."
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
      "Add the target job title under your name, copied EXACTLY from the posting (e.g. “Senior Data Engineer”, not a synonym) — matching the literal title is the single highest-impact change (recruiter data: ~10.6× callbacks).",
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
    "Languages": ["python","java","scala","sql","pl/sql","t-sql","javascript","typescript","c++","c#",".net","golang","go","ruby","php","swift","kotlin","bash","shell scripting","powershell","vba","matlab","sas","r","perl","objective-c","rust"],
    "Cloud": ["aws","amazon web services","azure","gcp","google cloud","s3","ec2","lambda","redshift","glue","athena","emr","kinesis","adls","adf","azure data factory","synapse","databricks","snowflake","bigquery","dataproc","cloud functions","data lake","delta lake","lakehouse","unity catalog","sagemaker","vertex ai","cloudformation","step functions","azure devops","azure synapse"],
    "Data & ETL": ["etl","elt","spark","pyspark","spark sql","apache spark","hadoop","hive","hbase","kafka","airflow","dbt","apache nifi","nifi","informatica","talend","ssis","fivetran","matillion","prefect","dagster","great expectations","data pipeline","data pipelines","data warehouse","data warehousing","data modeling","data modelling","dimensional modeling","star schema","data vault","data governance","data quality","data integration","data mesh","streaming","real-time","batch processing","cdc","change data capture","orchestration","data engineering","etl pipeline"],
    "Databases": ["mysql","postgresql","postgres","sql server","oracle","mongodb","cassandra","dynamodb","redis","teradata","neo4j","nosql","rdbms","graph database","db2","sap hana","snowflake sql"],
    "BI & Analytics": ["power bi","tableau","looker","qlik","qlikview","microstrategy","cognos","alteryx","excel","pandas","numpy","data visualization","data visualisation","reporting","dashboards","dashboard","kpi","a/b testing","statistics","data analysis","data analytics","business intelligence","business analysis","requirements gathering","exploratory data analysis"],
    "ML & AI": ["machine learning","deep learning","tensorflow","pytorch","keras","scikit-learn","nlp","mlops","feature engineering","model deployment","llm","generative ai","genai","forecasting","predictive modeling","predictive modelling","computer vision","time series","recommendation systems","model training"],
    "DevOps & Tools": ["docker","kubernetes","terraform","jenkins","ci/cd","git","github","gitlab","bitbucket","ansible","puppet","chef","linux","unix","rest api","restful api","soap","graphql","microservices","api integration","grafana","prometheus","splunk","datadog","automation"],
    "Ways of working": ["agile","scrum","kanban","waterfall","jira","confluence","sdlc","tdd","bdd","code review","unit testing","integration testing","version control","process improvement","continuous integration","continuous delivery"],
    "Domain": ["supply chain","demand planning","supply planning","o9","sap","erp","salesforce","servicenow","workday","finance","healthcare","retail","e-commerce","manufacturing","logistics","inventory","banking","insurance","telecom","pharma","fintech","supply chain planning"],
    "Certifications": ["aws certified","azure certified","gcp certified","pmp","cfa","cpa","cissp","scrum master","csm","itil","six sigma","databricks certified","snowflake certified","togaf"],
    "Soft skills": ["communication","leadership","stakeholder management","problem solving","collaboration","mentoring","cross-functional","analytical","attention to detail","time management","presentation","critical thinking","decision making","adaptability","negotiation","interpersonal","teamwork","written communication","verbal communication","organizational skills"]
  };
  /* categories whose terms are "soft" — real but weighted below hard skills, like Jobscan */
  var JD_SOFT_CATS = { "Soft skills": 1 };
  var JD_STOP = (function () {
    var w = "a an the and or but of to in on for with at by from as is are was were be been being this that these those you your we our they their it its will shall should would can could may might must have has had do does did not no nor so than then once here there all any both each few more most other some such only own same too very s t just also into over under about above below up down out off again further who whom which what when where why how able across within without including include ability role work working experience years year team teams strong excellent good required require requirements responsibilities responsible preferred plus etc using use used help ensure support provide build develop drive deliver manage lead create design implement new across using per via amp".split(" ");
    var m = {}; w.forEach(function (x) { m[x] = 1; }); return m;
  })();
  /* Generic business / HR / filler terms that must NEVER surface as a keyword,
     even when frequent or capitalized. Professional scanners (Jobscan, Teal,
     Resume Worded) rank hard skills, tools, titles and real methodologies — not
     words like "Responsibilities", "Candidate", "Purpose" or "Tasks". This is
     the noun/proper-noun POS filter approximated with a curated blocklist. */
  var JD_GENERIC = (function () {
    var w = ("purpose business businesses job jobs candidate candidates suitable applicant applicants "
      + "application applications apply company companies organization organisation organizational organisational "
      + "department departments position positions opportunity opportunities career careers employee employees "
      + "employer employers staff personnel people person individual individuals member members colleague colleagues "
      + "environment culture benefit benefits salary compensation payroll hour hours week weekly month monthly day "
      + "daily shift location locations remote hybrid onsite office offices world worldwide industry industries "
      + "market markets product products service services solution solutions task tasks duty duties responsibility "
      + "responsibilities function functions functional activity activities process processes procedure procedures "
      + "operation operations requirement requirements qualification qualifications skill skills skillset abilities "
      + "knowledge understanding expertise proficiency proficient competency competencies background backgrounds "
      + "education degree bachelor bachelors master masters phd doctorate diploma graduate undergraduate postgraduate "
      + "certification certifications experience experiences level levels entry junior senior mid principal "
      + "group groups client clients customer customers user users vendor vendors partner partners stakeholder stakeholders "
      + "goal goals objective objectives result results outcome outcomes success successful issue issues problem problems "
      + "fix fixes resolve resolution maintain maintaining handle handling perform execute conduct coordinate assist "
      + "identify review monitor track update prepare follow meet achieve improve increase reduce optimize enhance utilize "
      + "leverage apply participate contribute define establish oversee supervise train guide detail details information "
      + "various multiple several relevant related appropriate effective efficient efficiency proven demonstrated "
      + "key core critical essential important basic complex simple ongoing current existing additional general specific "
      + "overall best better high higher large small willing ideal preferred desirable nice summary overview about "
      + "engineer engineers developer developers analyst analysts architect architects scientist scientists administrator "
      + "administrators consultant consultants specialist specialists designer designers programmer programmers manager "
      + "managers director directors officer officers coordinator coordinators associate associates intern interns "
      + "candidate's applicant's description posting join looking seeking hire hiring recruit recruiting onboarding "
      + "computer science field fields area areas discipline disciplines subject subjects topic topics matter "
      + "plus strongly highly etc eg ie technology technologies technical stack deliverable deliverables exposure "
      + "btech mtech bca mca mba bsc msc bba bcom mcom be me bs ms ba ma educational").split(/\s+/);
    var m = {}; w.forEach(function (x) { if (x) m[x] = 1; }); return m;
  })();
  function jdGeneric(t) { t = (t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); return !t || JD_STOP[t] === 1 || JD_GENERIC[t] === 1; }
  function jdNorm(t) { return (" " + (t || "").toLowerCase().replace(/[‘’]/g, "'") + " "); }
  /* word boundaries that still treat "node.js" / "ci/cd" / "c#" as single tokens,
     but DO allow a trailing sentence period or slash (so "Tableau." at a line end
     still matches). Leading: not preceded by an alnum/+/#//.  Trailing lookahead:
     not followed by alnum/+/#, and not by ".x" or "/x" (which would be a longer token). */
  var LEAD_B = "(^|[^a-z0-9+#/.])";
  var TRAIL_B = "(?![a-z0-9+#])(?!\\.[a-z0-9])(?!/[a-z0-9])";
  function reBound(phrase) {
    var e = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\s|\s+/g, "\\s+");
    return new RegExp(LEAD_B + e + TRAIL_B, "i");
  }
  function countPhrase(norm, phrase) {
    var re = new RegExp(LEAD_B + phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+") + TRAIL_B, "ig");
    var n = 0; while (re.exec(norm) !== null) { n++; if (n > 50) break; } return n;
  }
  function hasPhrase(norm, phrase) { return reBound(phrase).test(norm); }

  /* Proper-noun / tech-term mining on the ORIGINAL (cased) job description.
     Surfaces real keywords the dictionary might miss — capitalized terms used
     mid-sentence (genuine proper nouns, NOT sentence-starters like "Resolve"),
     ALL-CAPS acronyms (ETL, AWS), and tech tokens (C#, CI/CD, Node.js) — while
     dropping generic filler. This is the noun-phrase mining + NER-style
     noise-removal that tools like Jobscan/Teal rely on, done in-browser.
     Returns an array of { term, display, freq, tech }. */
  var CAP_WORD = /^[A-Z][A-Za-z0-9]*(?:[&/.+#-][A-Za-z0-9]+)*$/;  // Title / Capitalized
  var ACRONYM  = /^[A-Z][A-Z0-9]{1,6}$/;                           // AWS, SQL, ETL, KPI
  var TECH_TOK = /[+#]|\.[a-z]{2,4}$|^[A-Za-z]+\/[A-Za-z]/;        // C++, C#, Node.js, CI/CD
  function termTechy(w) { return ACRONYM.test(w) || TECH_TOK.test(w); }
  /* keep real slash-acronyms (CI/CD, A/B, PL/SQL, TCP/IP, I/O) but reject prose
     compounds the JD jams together (Data Lake/Lakehouse, analysts/engineers,
     experience/exposure): a valid slash term has an uppercase letter and only
     short segments. */
  function slashOk(w) { return w.indexOf("/") === -1 || (/[A-Z]/.test(w) && w.split("/").every(function (s) { return s.length <= 4; })); }
  function properTerms(jd) {
    var out = {}, text = (jd || "").replace(/\r/g, "\n");
    /* break into sentence-ish segments so we can tell a sentence-start word apart */
    /* sentence-ish boundaries only (NOT commas — lists of tools must keep their
       items mid-sentence so they aren't mistaken for sentence-starters) */
    var segs = text.split(/(?:[.!?;:]+\s+|\n+|[•‣◦⁃∙·]+|\s[-–—]\s|\t+)/);
    segs.forEach(function (seg) {
      var words = seg.trim().split(/\s+/), run = [];
      function flush() {
        if (run.length) {
          var slice = run.slice(0, 3);
          /* trim generic words off both ends of the phrase */
          while (slice.length && jdGeneric(slice[0].w.toLowerCase())) slice.shift();
          while (slice.length && jdGeneric(slice[slice.length - 1].w.toLowerCase())) slice.pop();
          if (slice.length) {
            var loneStart = slice.length === 1 && slice[0].start && !termTechy(slice[0].w);
            var tooShort = slice.length === 1 && slice[0].w.replace(/[^A-Za-z0-9]/g, "").length < 3 && !termTechy(slice[0].w);
            if (!loneStart && !tooShort) {
              var disp = slice.map(function (x) { return x.w; }).join(" ");
              var key = disp.toLowerCase();
              var e = out[key] || (out[key] = { term: key, display: disp, freq: 0, tech: slice.every(function (x) { return termTechy(x.w); }) });
              e.freq++;
            }
          }
        }
        run = [];
      }
      words.forEach(function (raw, idx) {
        var listBreak = /[,;]$/.test(raw);   // comma/semicolon ends one list item, breaks the phrase
        var w = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#./&-]+$/g, "");
        if (w && slashOk(w) && (CAP_WORD.test(w) || ACRONYM.test(w) || TECH_TOK.test(w))) { run.push({ w: w, start: idx === 0 }); if (listBreak) flush(); }
        else flush();
      });
      flush();
    });
    return Object.keys(out).map(function (k) { return out[k]; });
  }

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

  /* Break the resume into labelled chunks so a matched keyword can be traced to
     the exact place it appears. `kind` drives the demonstrated-vs-listed call:
     a keyword proven inside an experience/project bullet or the summary is
     "evidence-backed"; one that only appears in the skills list or header/title
     is "listed" (present, but not shown in action). This is the coverage-vs-
     competency distinction professional scanners draw. */
  function resumeChunks(r) {
    var out = [];
    if (!r) return out;
    var p = r.profile || {};
    if (p.title) out.push({ where: "Header / title", kind: "header", text: p.title });
    (r.sections || []).forEach(function (sec) {
      var st = sec.title || "Section";
      if (sec.type === "text") { if (sec.text) out.push({ where: st, kind: "summary", text: sec.text }); }
      else if (sec.type === "labeled") {
        (sec.items || []).forEach(function (it) { out.push({ where: st + (it.label ? " · " + it.label : ""), kind: "skills", text: (it.label || "") + " " + (it.value || "") }); });
      } else {
        (sec.items || []).forEach(function (it) {
          var head = [it.heading, it.role, it.meta].filter(Boolean).join(" ");
          if (head) out.push({ where: it.heading || st, kind: "entry", text: head });
          (it.bullets || []).forEach(function (b) { if (b) out.push({ where: it.heading || st, kind: "bullet", text: b }); });
        });
      }
    });
    return out;
  }
  function findEvidence(chunks, phrase) {
    /* prefer evidence from a bullet/summary (demonstrated) over skills/header */
    var rank = { bullet: 0, summary: 1, entry: 2, skills: 3, header: 4 }, best = null;
    for (var i = 0; i < chunks.length; i++) {
      if (hasPhrase(jdNorm(chunks[i].text), phrase)) {
        if (best === null || rank[chunks[i].kind] < rank[best.kind]) best = chunks[i];
        if (best && rank[best.kind] === 0) break;
      }
    }
    return best;
  }
  function evidenceSnippet(text, max) {
    var t = (text || "").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
    max = max || 120;
    return t.length > max ? t.slice(0, max - 1) + "…" : t;
  }

  function analyzeJd(jd, r) {
    var JN = jdNorm(jd), RN = jdNorm(resumePlainText(r));
    var chunks = resumeChunks(r);
    var keys = [], seen = {};
    /* helper: is `term` already represented by a captured phrase (either direction)? */
    function overlaps(term) {
      for (var k = 0; k < keys.length; k++) {
        var t = keys[k].term;
        if (t === term) return true;
        if ((" " + t + " ").indexOf(" " + term + " ") !== -1 || (" " + term + " ").indexOf(" " + t + " ") !== -1) return true;
      }
      return false;
    }
    /* 1) authoritative skill taxonomy — the backbone, like a professional scanner.
          Classify hard vs soft so scoring can weight them differently. */
    Object.keys(JD_SKILL_DB).forEach(function (cat) {
      JD_SKILL_DB[cat].forEach(function (ph) {
        if (hasPhrase(JN, ph) && !seen[ph]) {
          seen[ph] = 1;
          keys.push({ term: ph, cat: cat, skill: true, soft: !!JD_SOFT_CATS[cat], freq: countPhrase(JN, ph), inResume: hasPhrase(RN, ph) });
        }
      });
    });
    /* 2) discovery: proper nouns / tools / acronyms the taxonomy doesn't list.
          Only real-looking terms survive (capitalized mid-sentence, acronyms, tech
          tokens, or multi-word proper phrases) — generic filler is dropped. */
    var found = properTerms(jd).sort(function (x, y) {
      return (y.tech - x.tech) || (y.freq - x.freq) || (y.display.length - x.display.length);
    });
    var EXTRA_CAP = 16, added = 0;   // keep discovery focused, not a word cloud
    found.forEach(function (f) {
      if (added >= EXTRA_CAP) return;
      if (seen[f.term] || overlaps(f.term)) return;
      /* properTerms already dropped sentence-starters, too-short tokens and
         generic filler, so every survivor is a real proper noun / tool / phrase
         — admit it (tech tokens and recurring terms sort to the top). */
      seen[f.term] = 1; added++;
      keys.push({ term: f.term, display: f.display, cat: f.tech ? "Tool / tech" : "Keyword",
        skill: f.tech, soft: false, freq: f.freq, inResume: hasPhrase(RN, f.term) });
    });

    /* 3) score — Jobscan-style weighting: hard skills >> tools > soft skills > keywords */
    var covered = 0, total = 0, matched = [], missing = [];
    keys.forEach(function (k) {
      var base = k.soft ? 1.5 : (k.skill ? 3 : 1);   // hard skills/tools >> soft skills > keywords
      var w = base * (1 + Math.min(k.freq - 1, 3) * 0.35);
      k.weight = w; total += w;
      if (k.inResume) {
        covered += w;
        var ev = findEvidence(chunks, k.term);
        k.evidence = ev;
        /* demonstrated = proven in a bullet/summary/entry; listed = only in the
           skills list or header. */
        k.demonstrated = !!ev && (ev.kind === "bullet" || ev.kind === "summary" || ev.kind === "entry");
        matched.push(k);
      } else missing.push(k);
    });
    missing.sort(function (a, b) { return b.weight - a.weight; });
    matched.sort(function (a, b) { return b.weight - a.weight; });
    var score = total > 0 ? Math.round((covered / total) * 100) : 0;

    return { score: score, matched: matched, missing: missing, keys: keys, recs: buildJdRecs(jd, r, missing, matched, score) };
  }

  function titleCase(s) { return s.replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }); }
  /* canonical display casing for common acronyms / branded tools, so chips read
     "AWS", "CI/CD", "Power BI", "PySpark" instead of a naive title-case. */
  var KW_DISPLAY = (function () {
    var pairs = {
      "aws":"AWS","gcp":"GCP","s3":"S3","ec2":"EC2","emr":"EMR","adls":"ADLS","adf":"ADF","iam":"IAM",
      "sql":"SQL","pl/sql":"PL/SQL","t-sql":"T-SQL","nosql":"NoSQL","mysql":"MySQL","postgresql":"PostgreSQL",
      "sql server":"SQL Server","mongodb":"MongoDB","dynamodb":"DynamoDB","db2":"Db2","sap hana":"SAP HANA",
      "etl":"ETL","elt":"ELT","cdc":"CDC","ssis":"SSIS","dbt":"dbt","hdfs":"HDFS","hbase":"HBase","bigquery":"BigQuery",
      "ci/cd":"CI/CD","rest api":"REST API","restful api":"RESTful API","graphql":"GraphQL","api integration":"API integration",
      "kpi":"KPI","nlp":"NLP","mlops":"MLOps","llm":"LLM","genai":"GenAI","generative ai":"Generative AI",
      "power bi":"Power BI","qlik":"Qlik","qlikview":"QlikView","a/b testing":"A/B Testing","seo":"SEO","sas":"SAS","vba":"VBA",
      "pyspark":"PySpark","spark sql":"Spark SQL","javascript":"JavaScript","typescript":"TypeScript","php":"PHP",
      "c#":"C#","c++":"C++",".net":".NET","sdlc":"SDLC","tdd":"TDD","bdd":"BDD","sap":"SAP","erp":"ERP","o9":"o9",
      "github":"GitHub","gitlab":"GitLab","bitbucket":"Bitbucket","servicenow":"ServiceNow","pmp":"PMP","cfa":"CFA",
      "cpa":"CPA","cissp":"CISSP","itil":"ITIL","csm":"CSM","togaf":"TOGAF","gcp certified":"GCP certified",
      "aws certified":"AWS certified","azure certified":"Azure certified"
    };
    return pairs;
  })();
  /* display label for a keyword chip — canonical casing first, then the JD's own
     casing for discovered proper nouns (HubSpot, Workday), else title-case. */
  function kwLabel(m) {
    var term = (m && m.term) || (typeof m === "string" ? m : "");
    return KW_DISPLAY[term] || (m && m.display) || titleCase(term);
  }
  function buildJdRecs(jd, r, missing, matched, score) {
    var recs = [], RN = jdNorm(resumePlainText(r));
    /* a) missing skills grouped by category -> concrete "add to X" actions */
    var byCat = {};
    missing.filter(function (m) { return m.skill; }).forEach(function (m) { (byCat[m.cat] = byCat[m.cat] || []).push(kwLabel(m)); });
    var sectionFor = { "Languages": "Technical Skills", "Cloud": "Technical Skills", "Data & ETL": "Technical Skills", "Databases": "Technical Skills", "BI & Analytics": "Technical Skills", "ML & AI": "Technical Skills", "DevOps & Tools": "Technical Skills", "Ways of working": "Experience bullets", "Domain": "Summary & Experience", "Soft skills": "Summary & Experience" };
    Object.keys(byCat).forEach(function (cat) {
      var list = byCat[cat].slice(0, 8).join(", ");
      recs.push({ icon: "➕", title: "Add to " + (sectionFor[cat] || "your resume") + " — " + cat, body: "The JD calls for <b>" + list + "</b>, which isn't on your resume. Add any you genuinely have (and back the important ones with a bullet)." });
    });
    /* b) high-emphasis missing keywords */
    missing.filter(function (m) { return !m.skill && m.freq >= 3; }).slice(0, 4).forEach(function (m) {
      recs.push({ icon: "🎯", title: "Emphasize “" + kwLabel(m) + "”", body: "This appears <b>" + m.freq + "×</b> in the job description but is missing from your resume — add a bullet or phrase that shows it in action." });
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
      var topMiss = missing.slice(0, 3).map(function (m) { return kwLabel(m); });
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
    var miss = a.missing.map(function (m) { return kwLabel(m); });
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

  /* Lazy-load pdf.js only when a PDF is actually chosen (keeps the page
     offline until then). Parsing runs entirely in the browser. */
  var _pdfjsPromise = null;
  var PDFJS_VER = "3.11.174";
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (_pdfjsPromise) return _pdfjsPromise;
    _pdfjsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VER + "/pdf.min.js";
      s.onload = function () {
        try {
          if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions)
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VER + "/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } catch (e) { reject(e); }
      };
      s.onerror = function () { _pdfjsPromise = null; reject(new Error("pdfjs load failed")); };
      document.head.appendChild(s);
    });
    return _pdfjsPromise;
  }
  function extractPdfText(file) {
    return loadPdfJs().then(function (pdfjs) {
      return file.arrayBuffer().then(function (buf) {
        return pdfjs.getDocument({ data: buf }).promise.then(function (pdf) {
          var chain = Promise.resolve("");
          for (var i = 1; i <= pdf.numPages; i++) {
            (function (n) {
              chain = chain.then(function (txt) {
                return pdf.getPage(n).then(function (page) {
                  return page.getTextContent().then(function (tc) {
                    return txt + tc.items.map(function (it) { return it.str; }).join(" ") + "\n";
                  });
                });
              });
            })(i);
          }
          return chain;
        });
      });
    });
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
      fileWrap.textContent = "⬆ Upload .txt / .pdf";
      var file = el("input"); file.type = "file"; file.accept = ".txt,text/plain,.pdf,application/pdf"; file.style.display = "none";
      function applyJdText(text) {
        store.aiAssist.jd = String(text || "");
        jdAnalysis = analyzeJd(store.aiAssist.jd, activeResume());
        jdAnalysis._jd = store.aiAssist.jd;
        touch(); renderApp();
      }
      file.addEventListener("change", function () {
        var f = file.files && file.files[0]; file.value = ""; if (!f) return;
        var isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
        if (isPdf) {
          flash("Reading PDF…");
          extractPdfText(f).then(function (text) {
            if (text && text.trim()) applyJdText(text);
            else flash("Couldn't read text from that PDF — it may be scanned. Paste the text instead.");
          }).catch(function () {
            flash("PDF reader unavailable offline — paste the job description instead.");
          });
        } else {
          var fr = new FileReader();
          fr.onload = function () { applyJdText(fr.result); };
          fr.readAsText(f);
        }
      });
      fileWrap.appendChild(file);
      row.appendChild(fileWrap);

      if (store.aiAssist.jd) row.appendChild(miniBtn("Clear", function () { store.aiAssist.jd = ""; jdAnalysis = null; touch(); renderApp(); }));
      body.appendChild(row);
      body.appendChild(elText("p", "hint", "Paste the text, upload a .txt, or upload a .pdf (read in your browser — nothing is uploaded). Scanned/image PDFs can't be read; paste those."));
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

    /* Methodology + honest disclaimer (Phase 3): transparent about what the
       number is and — importantly — what it is NOT. */
    if (collapsed["jd.method"] === undefined) collapsed["jd.method"] = true;
    panel.appendChild(blockEl("How this score works (and what it isn't)", "jd.method", function (body) {
      var ul = el("ul", "ats-list");
      [ "It's a keyword-coverage estimate computed entirely in your browser — it weights hard skills & tools (×3) above soft skills (×1.5) above plain keywords (×1), and gives a little more weight to terms the JD repeats, the way scanners like Jobscan rank them.",
        "“✓ You cover” means the term appears somewhere on this resume; “●” means it's backed by a bullet or your summary (stronger), “○” means it's only listed in Skills (weaker).",
        "This is NOT your real employer ATS score and does not predict whether you'll be shortlisted. Every company's ATS and recruiter search is different and private.",
        "Use it to spot genuine gaps and mirror the posting's wording — only ever add skills you truly have." ].forEach(function (t) { ul.appendChild(elText("li", null, t)); });
      body.appendChild(ul);
    }));

    /* Two-column keyword match: covered (left) vs missing (right) */
    panel.appendChild(blockEl("Keyword match — covered vs missing", "jd.match", function (body) {
      body.appendChild(elText("p", "hint", "Left: keywords your resume already covers. Right: keywords in the job description you're missing — hard skills & tools (with ＋ to add) rank above softer keywords, the way real ATS scanners weight them. Generic filler is filtered out. Click any term to copy it; add only what's truthful."));
      var cols = el("div", "jd-cols");

      /* LEFT — covered */
      var left = el("div", "jd-col have-col");
      var demoN = a.matched.filter(function (m) { return m.demonstrated; }).length;
      left.appendChild(elText("div", "jd-col-head have", "✓ You cover (" + a.matched.length + ")"));
      if (!a.matched.length) left.appendChild(elText("p", "hint", "No overlap yet — add the skills on the right that you genuinely have."));
      else {
        left.appendChild(elText("p", "jd-legend", "● " + demoN + " shown in a bullet/summary  ·  ○ " + (a.matched.length - demoN) + " listed only. Hover a chip to see where it appears."));
        var lw = el("div", "chip-wrap");
        a.matched.forEach(function (m) {
          var cls = "kw-chip have" + (m.skill ? " skill" : "") + (m.demonstrated ? " demonstrated" : " listed-only");
          var c = el("button", cls); c.type = "button";
          c.appendChild(document.createTextNode((m.demonstrated ? "● " : "○ ") + kwLabel(m)));
          if (m.evidence) c.title = (m.demonstrated ? "Demonstrated in " : "Listed in ") + m.evidence.where + ": “" + evidenceSnippet(m.evidence.text) + "”  (click to copy keyword)";
          else c.title = (m.skill ? "Skill/tool" : "Keyword") + " — covered. Click to copy.";
          c.addEventListener("click", function () { copyText(m.display || m.term, "“" + kwLabel(m) + "” copied."); });
          lw.appendChild(c);
        });
        left.appendChild(lw);
        if (demoN < a.matched.length) left.appendChild(elText("p", "hint", "Tip: keywords only listed in your Skills (○) are weaker evidence. Where it's true, add a bullet that shows the ○ ones in action."));
      }
      cols.appendChild(left);

      /* RIGHT — missing */
      var right = el("div", "jd-col miss-col");
      right.appendChild(elText("div", "jd-col-head miss", "＋ Missing (" + a.missing.length + ")"));
      if (!a.missing.length) right.appendChild(elText("p", "hint", "Nothing important is missing — great alignment!"));
      else {
        var rw = el("div", "chip-wrap");
        a.missing.forEach(function (m) {
          var group = el("span", "kw-group");
          var c = el("button", "kw-chip miss" + (m.freq >= 3 ? " hot" : "") + (m.skill ? " skill" : "")); c.type = "button";
          c.textContent = kwLabel(m) + (m.freq >= 3 ? " ·" + m.freq : "");
          c.title = (m.skill ? "Skill/tool — " : "Keyword — ") + "appears " + m.freq + "× in the JD. Click to copy.";
          c.addEventListener("click", function () { copyText(m.display || m.term, "“" + kwLabel(m) + "” copied."); });
          group.appendChild(c);
          if (m.skill) {
            var add = el("button", "kw-add"); add.type = "button"; add.textContent = "＋";
            add.title = "Add “" + kwLabel(m) + "” to your Technical Skills";
            add.addEventListener("click", function () {
              if (addSkillToResume(activeResume(), kwLabel(m))) { flash("Added “" + kwLabel(m) + "” to Technical Skills."); reanalyzeAfterEdit(); }
              else flash("“" + kwLabel(m) + "” is already in your skills.");
            });
            group.appendChild(add);
          }
          rw.appendChild(group);
        });
        right.appendChild(rw);
        var w = el("div", "prompt-actions");
        var addableMissing = a.missing.filter(function (m) { return m.skill; });
        if (addableMissing.length) {
          w.appendChild(miniBtn("＋ Add all " + addableMissing.length + " missing skills", function () {
            var n = 0; addableMissing.forEach(function (m) { if (addSkillToResume(activeResume(), kwLabel(m))) n++; });
            if (n) { flash("Added " + n + " skill" + (n > 1 ? "s" : "") + " to Technical Skills."); reanalyzeAfterEdit(); }
            else flash("Those skills are already in your resume.");
          }, "btn-primary"));
        }
        w.appendChild(miniBtn("⧉ Copy all missing", function () { copyText(a.missing.map(function (m) { return kwLabel(m); }).join(", "), "Missing keywords copied."); }));
        right.appendChild(w);
      }
      cols.appendChild(right);
      body.appendChild(cols);
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
  /* validation helpers — used by Health to FLAG (never auto-correct) format issues */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var URL_RE = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i;
  var MONTHS_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\b/i;
  /* classify a date string's style so we can spot inconsistency. */
  function dateStyle(d) {
    d = (d || "").trim();
    if (!d) return "other";
    if (/present|current|now|ongoing/i.test(d) && !/\d/.test(d)) return "present";
    var hasMonthName = MONTHS_RE.test(d);
    var hasYear = /\b(19|20)\d{2}\b/.test(d);
    if (hasMonthName && hasYear) return "monthname";          /* Jul 2022 – Present */
    if (/\b\d{1,2}[\/.\-]\d{4}\b/.test(d)) return "numeric";   /* 07/2022 */
    if (hasYear && !hasMonthName) return "yearonly";          /* 2022 – 2024 */
    return "other";
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

    /* 8. Contact essentials + format validation (non-destructive: we flag, never rewrite) */
    var contactVals = ((r.profile || {}).contacts || []).map(function (c) { return (c.value || "").trim(); }).filter(Boolean);
    var joined = contactVals.join(" ");
    var emailVals = contactVals.filter(function (v) { return /@/.test(v); });
    var badEmails = emailVals.filter(function (v) { return !EMAIL_RE.test(v); });
    if (!emailVals.length) { score -= 6; checks.push({ level: "bad", label: "Contact details", detail: "No email detected in your header. Add a professional email.", items: [] }); }
    else if (badEmails.length) { score -= 4; checks.push({ level: "warn", label: "Contact details", detail: "An email in your header doesn't look valid — check for typos (missing @ or domain).", items: badEmails, itemsLabel: "Check:" }); }
    else checks.push({ level: "good", label: "Contact details", detail: "Email present and well-formed.", items: [] });

    /* 9. Link validity — profile/portfolio URLs that look malformed */
    var linkVals = contactVals.filter(function (v) { return !/@/.test(v) && (/\./.test(v) && /[a-z]/i.test(v) && !/\s/.test(v)) && (/https?:|www\.|\.(com|io|dev|net|org|co|ai|me|in|app)\b/i.test(v) || /linkedin|github|gitlab|behance|portfolio/i.test(v)); });
    var badLinks = linkVals.filter(function (v) { return !URL_RE.test(v); });
    if (linkVals.length) {
      if (badLinks.length) { score -= 3; checks.push({ level: "warn", label: "Profile links", detail: "A link looks incomplete (e.g. “linkedin” with no full URL). Use the full address so it's clickable and parseable.", items: badLinks, itemsLabel: "Fix:" }); }
      else checks.push({ level: "good", label: "Profile links", detail: linkVals.length + " profile link(s) look well-formed.", items: [] });
    }

    /* 10. Date-format consistency across entries (an ATS computes tenure from these) */
    var dateVals = [];
    (r.sections || []).forEach(function (sec) { if (sec.type === "entries") (sec.items || []).forEach(function (it) { if (it.date && it.date.trim()) dateVals.push(it.date.trim()); }); });
    if (dateVals.length >= 2) {
      var styles = {}, unrecognized = [];
      dateVals.forEach(function (d) { var s = dateStyle(d); if (s === "other") unrecognized.push(d); else styles[s] = 1; });
      var styleCount = Object.keys(styles).length;
      if (unrecognized.length) { score -= 4; checks.push({ level: "warn", label: "Date formats", detail: "Some dates don't follow a clear “MMM YYYY – MMM YYYY” pattern. Consistent, recognizable dates help an ATS read your timeline.", items: unrecognized.slice(0, 5), itemsLabel: "Clarify:" }); }
      else if (styleCount > 1) { score -= 3; checks.push({ level: "warn", label: "Date formats", detail: "Your entries mix date styles (e.g. “Jul 2022” vs “07/2022”). Pick one format and use it everywhere.", items: dateVals.slice(0, 6), itemsLabel: "Dates found:" }); }
      else checks.push({ level: "good", label: "Date formats", detail: "Dates are consistent and recognizable.", items: [] });
    }

    /* 11. One-page integrity — read the live preview's page-fit state */
    var over = document.body.classList.contains("is-over");
    if (over) { score -= 6; checks.push({ level: "warn", label: "Fits one page", detail: "The preview currently overflows one page. Trim older/less-relevant content, or the PDF/DOCX auto-fit will shrink the type.", items: [] }); }
    else checks.push({ level: "good", label: "Fits one page", detail: "Content fits on a single page.", items: [] });

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
    hint.innerHTML = "An instant quality read on <strong>" + esc(r ? (r.name || "this resume") : "your resume") + "</strong> — quantified impact, strong verbs, clichés, passive voice, length, contact &amp; date validity, one-page fit. All in your browser. <strong>Fix the flags, not fake keywords.</strong> These are heuristic writing checks, not a guarantee — use your judgement.";
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

  /* ============================================================
     JOB TRACKER — application pipeline (localStorage, exports with data)
     ============================================================ */
  var APP_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"];
  var APP_STATUS_CLASS = { Saved: "st-saved", Applied: "st-applied", Interview: "st-interview", Offer: "st-offer", Rejected: "st-rejected" };
  var trackerFilter = "All";                 /* which status the tracker is filtered to */
  var APP_CLOSED = { Offer: 1, Rejected: 1 };  /* follow-up reminders don't apply once closed */
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  /* days from today to an ISO date (negative = overdue). null if unparseable. */
  function daysUntil(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    var t = new Date(iso + "T00:00:00"), now = new Date(todayISO() + "T00:00:00");
    if (isNaN(t.getTime())) return null;
    return Math.round((t - now) / 86400000);
  }
  function dueLabel(iso) {
    var d = daysUntil(iso); if (d === null) return "";
    if (d < 0) return "overdue by " + (-d) + "d";
    if (d === 0) return "due today";
    if (d === 1) return "due tomorrow";
    return "in " + d + "d";
  }

  function newApplication(prefill) {
    store.applications = store.applications || [];
    var a = {
      id: uid(), company: "", role: "", link: "", status: "Saved", notes: "",
      jd: "", resumeId: "", resumeName: "", score: null,
      followUp: "", deadline: "",
      createdAt: Date.now(), updatedAt: Date.now()
    };
    if (prefill) for (var k in prefill) a[k] = prefill[k];
    store.applications.unshift(a);
    return a;
  }

  function renderTracker(panel) {
    store.applications = store.applications || [];
    var apps = store.applications;

    var hint = el("p", "panel-hint");
    hint.innerHTML = "Track every role in one place — the job description, the resume you tailored, its match score, and where you are in the pipeline. <strong>All in your browser; exports with your data.</strong>";
    panel.appendChild(hint);

    /* summary counts — clickable to filter the list */
    var counts = {}; APP_STATUSES.forEach(function (s) { counts[s] = 0; });
    apps.forEach(function (a) { counts[a.status] = (counts[a.status] || 0) + 1; });
    if (trackerFilter !== "All" && APP_STATUSES.indexOf(trackerFilter) === -1) trackerFilter = "All";
    var sum = el("div", "track-summary");
    var allChip = el("button", "track-count track-all" + (trackerFilter === "All" ? " sel" : "")); allChip.type = "button";
    allChip.appendChild(elText("span", "tc-num", String(apps.length)));
    allChip.appendChild(elText("span", "tc-lbl", "All"));
    allChip.addEventListener("click", function () { trackerFilter = "All"; renderApp(); });
    sum.appendChild(allChip);
    APP_STATUSES.forEach(function (s) {
      var chip = el("button", "track-count " + APP_STATUS_CLASS[s] + (trackerFilter === s ? " sel" : "")); chip.type = "button";
      chip.appendChild(elText("span", "tc-num", String(counts[s] || 0)));
      chip.appendChild(elText("span", "tc-lbl", s));
      chip.title = "Show only " + s;
      chip.addEventListener("click", function () { trackerFilter = (trackerFilter === s ? "All" : s); renderApp(); });
      sum.appendChild(chip);
    });
    panel.appendChild(sum);

    /* follow-ups due / overdue banner (open applications only) */
    var dueSoon = apps.filter(function (a) { if (APP_CLOSED[a.status]) return false; var d = daysUntil(a.followUp); return d !== null && d <= 2; });
    if (dueSoon.length) {
      var od = dueSoon.filter(function (a) { return daysUntil(a.followUp) < 0; }).length;
      var fb = el("div", "track-due-banner" + (od ? " overdue" : ""));
      fb.textContent = (od ? "⏰ " + od + " follow-up" + (od > 1 ? "s" : "") + " overdue" + (dueSoon.length - od ? ", " : "") : "🔔 ") +
        (dueSoon.length - od ? (dueSoon.length - od) + " due in the next 2 days" : (od ? "" : dueSoon.length + " follow-up due soon"));
      panel.appendChild(fb);
    }

    /* add actions */
    var addRow = el("div", "prompt-actions");
    addRow.appendChild(miniBtn("＋ Add application", function () { newApplication(); touch(); renderApp(); }, "btn-primary"));
    if ((store.aiAssist && store.aiAssist.jd || "").trim()) {
      var r = activeResume();
      var lbl = "＋ From JD Match" + (jdAnalysis ? " (" + jdAnalysis.score + "%)" : "");
      addRow.appendChild(miniBtn(lbl, function () {
        newApplication({
          jd: store.aiAssist.jd, resumeId: r ? r.id : "", resumeName: r ? (r.name || "Resume") : "",
          score: jdAnalysis ? jdAnalysis.score : null,
          snapshot: r ? clone(r) : null, snapshotAt: Date.now(),
          company: guessCompanyFromJd(store.aiAssist.jd), role: guessJdTitle ? (guessJdTitle(store.aiAssist.jd) || "") : ""
        });
        touch(); renderApp();
      }));
    }
    panel.appendChild(addRow);

    if (!apps.length) {
      var empty = el("div", "jd-empty");
      empty.innerHTML = "🗂<br>No applications yet. Click <b>Add application</b>, or paste a JD in <b>JD Match</b> and use <b>＋ From JD Match</b> to start a tracked, tailored application.";
      panel.appendChild(empty);
      return;
    }

    var visible = trackerFilter === "All" ? apps : apps.filter(function (a) { return a.status === trackerFilter; });
    if (!visible.length) {
      var none = el("div", "jd-empty");
      none.innerHTML = "No applications with status <b>" + esc(trackerFilter) + "</b>. <br>Click <b>All</b> above to see everything.";
      panel.appendChild(none);
      return;
    }

    /* one block per application */
    visible.forEach(function (a) {
      var title = (a.company || "Untitled") + (a.role ? " — " + a.role : "");
      panel.appendChild(blockEl(title, "track." + a.id, function (body) {
        var r2 = el("div", "row-2");
        r2.appendChild(fieldInput("Company", a.company, function (v) { a.company = v; a.updatedAt = Date.now(); touch(); }));
        r2.appendChild(fieldInput("Role / title", a.role, function (v) { a.role = v; a.updatedAt = Date.now(); touch(); }));
        body.appendChild(r2);
        body.appendChild(fieldInput("Job posting link (optional)", a.link, function (v) { a.link = v; a.updatedAt = Date.now(); touch(); }));

        /* status selector */
        var sf = el("div", "field");
        sf.appendChild(elText("label", null, "Status"));
        var sel = el("select", "inp");
        APP_STATUSES.forEach(function (s) { var o = el("option"); o.value = s; o.textContent = s; if (a.status === s) o.selected = true; sel.appendChild(o); });
        sel.addEventListener("change", function () { a.status = sel.value; a.updatedAt = Date.now(); touch(); renderApp(); });
        sf.appendChild(sel); body.appendChild(sf);

        /* follow-up + deadline dates */
        var dr = el("div", "row-2");
        dr.appendChild(dateField("Follow-up reminder", a.followUp, APP_CLOSED[a.status] ? "" : dueLabel(a.followUp), function (v) { a.followUp = v; a.updatedAt = Date.now(); touch(); renderApp(); }));
        dr.appendChild(dateField("Application deadline", a.deadline, APP_CLOSED[a.status] ? "" : dueLabel(a.deadline), function (v) { a.deadline = v; a.updatedAt = Date.now(); touch(); renderApp(); }));
        body.appendChild(dr);

        /* linked resume + score */
        var meta = el("div", "track-meta");
        if (a.resumeName) {
          meta.appendChild(elText("span", "track-tag", "📄 " + a.resumeName));
          if (a.score != null) meta.appendChild(elText("span", "track-tag track-score", a.score + "% match"));
        } else {
          meta.appendChild(elText("span", "hint", "No resume linked. "));
        }
        var active = activeResume();
        if (a.snapshot) meta.appendChild(elText("span", "track-tag track-snap", "📎 version saved " + relTime(a.snapshotAt)));
        meta.appendChild(miniBtn(a.snapshot ? "📸 Update sent version" : "📎 Link & snapshot active resume", function () {
          a.resumeId = active ? active.id : ""; a.resumeName = active ? (active.name || "Resume") : "";
          a.snapshot = active ? clone(active) : null; a.snapshotAt = Date.now();
          a.updatedAt = Date.now(); touch(); renderApp();
          flash("Saved the exact resume you sent to this role.");
        }));
        if (a.snapshot) meta.appendChild(miniBtn("⟲ Restore as new resume", function () {
          var copy = clone(a.snapshot); copy.id = uid();
          copy.name = (a.company ? a.company : (copy.name || "Resume")) + " — sent " + new Date(a.snapshotAt || Date.now()).toLocaleDateString();
          store.resumes.push(copy); store.activeResumeId = copy.id;
          a.updatedAt = Date.now(); touch(); activeTab = "resumes"; renderApp();
          flash("Restored as a new resume — your current one is untouched.");
        }));
        if (a.jd) meta.appendChild(miniBtn("Load JD into JD Match", function () {
          store.aiAssist.jd = a.jd; jdAnalysis = analyzeJd(a.jd, activeResume()); jdAnalysis._jd = a.jd;
          a.score = jdAnalysis.score; a.updatedAt = Date.now(); touch();
          activeTab = "jd"; renderApp();
        }));
        body.appendChild(meta);

        body.appendChild(fieldTextarea("Notes (recruiter, referral, follow-ups…)", a.notes, function (v) { a.notes = v; a.updatedAt = Date.now(); touch(); }));

        var footer = el("div", "track-footer");
        footer.appendChild(elText("span", "hint", "Updated " + relTime(a.updatedAt)));
        footer.appendChild(miniBtn("🗑 Delete", function () {
          store.applications = store.applications.filter(function (x) { return x.id !== a.id; });
          touch(); renderApp();
        }, "btn-danger"));
        body.appendChild(footer);
      }, trackerHeadPills(a)));
    });
  }
  function trackerHeadPills(a) {
    var pills = [];
    if (!APP_CLOSED[a.status]) {
      var d = daysUntil(a.followUp);
      if (d !== null && d <= 2) pills.push(elText("span", "hl-pill " + (d < 0 ? "due-overdue" : "due-soon"), d < 0 ? "⏰ overdue" : "🔔 due"));
    }
    pills.push(elText("span", "hl-pill " + APP_STATUS_CLASS[a.status], a.status));
    return pills;
  }

  function guessCompanyFromJd(jd) {
    var m = (jd || "").match(/\b(?:at|join|with)\s+([A-Z][A-Za-z0-9&.\- ]{2,30})/);
    return m ? m[1].trim().replace(/\s+(is|are|we|to|and|the)$/i, "") : "";
  }
  function relTime(ts) {
    if (!ts) return "just now";
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  /* ============================================================
     COVER LETTER — composed from resume + (optional) JD, offline
     ============================================================ */
  function coverSkills(r) {
    if (jdAnalysis && jdAnalysis.matched && jdAnalysis.matched.length)
      return jdAnalysis.matched.slice(0, 6).map(function (m) { return titleCase(m.term); });
    var out = [];
    (r.sections || []).forEach(function (sec) {
      if (sec.type === "labeled") (sec.items || []).forEach(function (it) {
        (it.value || "").split(/[,;]/).forEach(function (t) { t = t.trim().replace(/\.$/, ""); if (t && out.length < 6 && out.indexOf(t) < 0) out.push(t); });
      });
    });
    return out;
  }
  function topHighlightBullet(r) {
    var best = "";
    (r.sections || []).forEach(function (sec) {
      if (sec.type === "entries") (sec.items || []).forEach(function (it) {
        (it.bullets || []).forEach(function (b) { if (!best && b && /\d/.test(b)) best = stripMd(b).trim(); });
      });
    });
    if (!best) { var bs = collectBullets(r); if (bs.length) best = stripMd(bs[0].text); }
    return best;
  }
  function buildCoverLetter(r, opts) {
    var name = (r.profile && r.profile.name) || "";
    var title = (r.profile && r.profile.title) || "";
    var role = (opts.role || title || "the role").trim();
    var company = (opts.company || "").trim();
    var companyRef = company || "your organization";
    var greeting = opts.manager && opts.manager.trim() ? "Dear " + opts.manager.trim() + "," : "Dear Hiring Manager,";
    var skills = coverSkills(r);
    var skillLine = skills.length
      ? "My core strengths span " + (skills.slice(0, -1).join(", ") + (skills.length > 1 ? ", and " : "") + skills[skills.length - 1]) + "."
      : "";
    var highlight = topHighlightBullet(r);
    var sumFirst = (stripMd(findSummary(r)).split(/(?<=[.!?])\s+/)[0] || "").trim();

    var p1 = "I'm excited to apply for the " + role + " position" + (company ? " at " + company : "") + ". "
      + (sumFirst ? sumFirst + (/[.!?]$/.test(sumFirst) ? "" : ".") : (title ? "As a " + title + ", I bring directly relevant experience." : ""));
    var p2 = (skillLine ? skillLine + " " : "")
      + (highlight ? "For example, I " + lowerFirst(highlight) + (/[.!?]$/.test(highlight) ? "" : ".") : "")
      + " I'm confident this background maps closely to what " + companyRef + " needs for this role.";
    var p3 = "I'd welcome the chance to discuss how I can contribute to " + companyRef + ". Thank you for your time and consideration.";

    return greeting + "\n\n" + p1 + "\n\n" + p2.trim() + "\n\n" + p3 + "\n\nSincerely,\n" + (name || "");
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function downloadText(filename, text) {
    try {
      var blob = new Blob([text], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 100);
    } catch (e) { copyText(text, "Copied — paste into a document to save."); }
  }

  function renderCover(panel) {
    store.coverLetter = store.coverLetter || { company: "", manager: "", role: "", body: "" };
    var cl = store.coverLetter;
    var r = activeResume();

    var hint = el("p", "panel-hint");
    hint.innerHTML = "Generate a cover-letter draft from <strong>" + esc(r ? (r.name || "this resume") : "your resume") + "</strong>" + (jdAnalysis ? " and your analyzed JD" : "") + " — then edit freely. <strong>Offline; nothing uploaded.</strong>";
    panel.appendChild(hint);
    if (!r) { panel.appendChild(elText("div", "jd-empty", "Create a resume first.")); return; }

    panel.appendChild(blockEl("Target role", "cover.meta", function (body) {
      var r2 = el("div", "row-2");
      r2.appendChild(fieldInput("Company", cl.company, function (v) { cl.company = v; scheduleSave(); }));
      r2.appendChild(fieldInput("Role / title", cl.role, function (v) { cl.role = v; scheduleSave(); }));
      body.appendChild(r2);
      body.appendChild(fieldInput("Hiring manager (optional)", cl.manager, function (v) { cl.manager = v; scheduleSave(); }));
      if (jdAnalysis && (store.aiAssist.jd || "").trim()) {
        body.appendChild(elText("p", "hint", "Using " + jdAnalysis.matched.length + " matched keywords from your analyzed JD to pick strengths."));
      }
      var row = el("div", "prompt-actions");
      var gen = miniBtn("⚡ Generate draft", function () {
        cl.body = buildCoverLetter(activeResume(), cl); touch(); renderApp();
      });
      gen.classList.remove("btn-mini"); gen.classList.add("btn-primary");
      row.appendChild(gen);
      body.appendChild(row);
    }));

    panel.appendChild(blockEl("Cover letter", "cover.body", function (body) {
      var ta = el("textarea", "inp cover-body");
      ta.placeholder = "Your cover letter will appear here — or write your own. Click “Generate draft” above to start.";
      ta.value = cl.body || "";
      ta.addEventListener("input", function () { cl.body = ta.value; scheduleSave(); });
      body.appendChild(ta);
      var row = el("div", "prompt-actions");
      row.appendChild(miniBtn("⧉ Copy", function () { if ((cl.body || "").trim()) copyText(cl.body, "Cover letter copied."); else flash("Generate or write the letter first."); }));
      row.appendChild(miniBtn("⬇ Download .txt", function () {
        if (!(cl.body || "").trim()) { flash("Generate or write the letter first."); return; }
        downloadText("cover-letter" + (cl.company ? "-" + cl.company.replace(/\s+/g, "-").toLowerCase() : "") + ".txt", cl.body);
      }));
      row.appendChild(miniBtn("⧉ Copy AI polish prompt", function () {
        var p = "Polish this cover letter: keep it truthful and specific, 3 short paragraphs, confident but not arrogant, no clichés. Tailor it to the role" + (cl.company ? " at " + cl.company : "") + ".\n\n--- DRAFT ---\n" + (cl.body || buildCoverLetter(activeResume(), cl));
        copyText(p, "AI polish prompt copied — paste into any free AI chat.");
      }, "btn-primary"));
      body.appendChild(row);
      body.appendChild(elText("p", "hint", "The draft is a starting point — always add a specific, genuine reason you want this company."));
    }));
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
  function applyThemeToPage(page, t) {
    t = normalizeTheme(t);
    page.setAttribute("data-template", t.template);
    page.setAttribute("data-density", t.density);
    page.style.setProperty("--r-accent", t.accent);
    page.style.setProperty("--r-font", THEME_FONTS[t.font].css);
  }
  var PAGE_PX = 1123;   /* A4 height @96dpi, mirrors the .page CSS height */
  function renderPreview() {
    var page = document.getElementById("page");
    var r = activeResume();
    var label = document.getElementById("previewLabel");
    if (label) label.textContent = "Preview · A4 · " + (r ? (r.name || "Untitled") : "");
    if (!r) { page.innerHTML = ""; return; }
    applyThemeToPage(page, r.theme);
    page.setAttribute("data-pages", r.pages === 2 ? "2" : "1");
    var p = r.profile;
    var h = '<div class="r-name">' + esc(p.name || "Your Name") + "</div>";
    if (p.title) h += '<div class="r-title">' + esc(p.title) + "</div>";
    var contacts = (p.contacts || []).filter(function (c) { return c.value; });
    if (contacts.length) h += '<div class="r-contacts">' + contacts.map(function (c) {
      var t = contactTarget(c.value);
      var val = t ? '<a href="' + esc(t) + '" target="_blank" rel="noopener noreferrer">' + esc(c.value) + "</a>" : esc(c.value);
      return '<span class="ico">' + esc(c.icon) + "</span>" + val;
    }).join('<span class="sep">|</span>') + "</div>";

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
    /* two-page resumes flow naturally — no bottom-gap fill */
    if (page.getAttribute("data-pages") === "2") return;
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
    var page = document.getElementById("page");
    var maxPages = (page && page.getAttribute("data-pages") === "2") ? 2 : 1;
    var avail = wrap.clientWidth - 4, scale = Math.min(avail / 794, 1);
    if (!isFinite(scale) || scale <= 0) scale = 0.45;
    scaler.style.transform = "scale(" + scale + ")";
    /* measure the real rendered height (two-page pages grow); holder reserves
       the scaled space so the preview scrolls correctly. */
    var ph = page ? Math.max(PAGE_PX * maxPages, page.offsetHeight) : PAGE_PX;
    holder.style.width = (794 * scale) + "px"; holder.style.height = (ph * scale) + "px";
  }
  function checkOnePage() {
    var page = document.getElementById("page"), badge = document.getElementById("pageBadge");
    if (!page || !badge) return;
    var r = activeResume();
    var maxPages = (r && r.pages === 2) ? 2 : 1;
    if (maxPages === 2) {
      /* two-page: measure content vs the two-page budget */
      var contentH = page.scrollHeight;
      var usedPages = contentH > PAGE_PX + 2 ? 2 : 1;
      var over2 = contentH > PAGE_PX * 2 + 2;
      page.classList.toggle("over", over2);
      badge.textContent = over2 ? "⚠ Over 2 pages" : (usedPages === 2 ? "2 pages" : "1 of 2 pages");
      badge.className = "page-badge " + (over2 ? "over" : "ok");
      document.body.classList.toggle("is-over", over2);
      var banner2 = document.getElementById("overBanner");
      if (banner2) { banner2.hidden = !over2; banner2.innerHTML = "⚠ This resume exceeds two pages. Trim or shorten content, or the export will scale it down to fit."; }
    } else {
      var over = page.scrollHeight > page.clientHeight + 1;
      page.classList.toggle("over", over);
      badge.textContent = over ? "⚠ Over 1 page" : "1 page";
      badge.className = "page-badge " + (over ? "over" : "ok");
      document.body.classList.toggle("is-over", over);
      var banner = document.getElementById("overBanner");
      if (banner) { banner.hidden = !over; banner.innerHTML = "⚠ This resume runs past one page. Trim content, switch to a 2-page layout in Design, or the export will scale it down to fit."; }
    }
    /* warn, don't block: Add buttons stay enabled even when over (a brief
       overflow mid-edit shouldn't disable editing). */
    var adders = document.querySelectorAll("#tabPanel .btn.js-add");
    for (var i = 0; i < adders.length; i++) adders[i].disabled = false;
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
    if (opt.under) rpr += '<w:u w:val="single"/>';
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

  /* Turn a contact value into a hyperlink target, or null for phone/location/
     plain text. Shared by the preview and the DOCX export so they agree. */
  function contactTarget(value) {
    var v = (value || "").trim();
    if (!v) return null;
    if (EMAIL_RE.test(v)) return "mailto:" + v;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^www\./i.test(v)) return "https://" + v;
    if (!/\s/.test(v) && !/@/.test(v) && /^[a-z0-9.\-\/]+\.(com|io|dev|net|org|co|ai|me|in|app|xyz|us|uk|tech)\b/i.test(v)) return "https://" + v;
    return null;   /* phone, location, plain text */
  }
  function contactLinks(contacts) {
    var out = [];
    (contacts || []).forEach(function (c, i) { var t = contactTarget(c.value); if (t) out.push({ idx: i, rid: "rId" + (100 + i), target: t }); });
    return out;
  }
  function contactsRunXml(contacts, size, accent) {
    var links = contactLinks(contacts), byIdx = {};
    links.forEach(function (l) { byIdx[l.idx] = l; });
    var parts = [];
    contacts.forEach(function (c, i) {
      if (i) parts.push(runXml({ t: "   |   " }, { size: size, color: "999999" }));
      var l = byIdx[i];
      if (l) parts.push('<w:hyperlink r:id="' + l.rid + '">' + runXml({ t: c.value }, { size: size, color: accent, under: true }) + '</w:hyperlink>');
      else parts.push(runXml({ t: c.value }, { size: size, color: "555555" }));
    });
    return parts.join("");
  }

  /* Build the <w:body> paragraphs at a given typographic scale, and return
     both the XML and an estimated total content height (points). */
  function buildBody(r, scale, fillTwips) {
    var p = r.profile || {}, body = [], hPt = 0;
    fillTwips = fillTwips || 0;                                                    /* extra space spread before each section to fill the page */
    /* theme → OOXML: accent color on title & headings (and the name in Modern),
       header alignment, matching the on-screen preview exactly. */
    var theme = normalizeTheme(r.theme);
    var accent = theme.accent.replace("#", "").toUpperCase();
    var nameAlign = theme.template === "modern" ? "left" : "center";
    var nameColor = theme.template === "modern" ? accent : "111111";
    var ruleColor = theme.template === "modern" ? accent : "999999";
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
    add(para(runXml({ t: p.name || "Your Name", b: true }, { size: nSize, bold: true, color: nameColor }),
      pPr('<w:jc w:val="' + nameAlign + '"/>' + spacing(0, sp(40)))), nSize, p.name || "Your Name", USABLE_W, 0, sp(40));
    /* title */
    if (p.title) { var tSize = sz(24);
      add(para(runXml({ t: p.title }, { size: tSize, color: accent }),
        pPr('<w:jc w:val="' + nameAlign + '"/>' + spacing(0, sp(30)))), tSize, p.title, USABLE_W, 0, sp(30)); }
    /* contacts (hyperlinked where the value is an email or URL) */
    var contacts = (p.contacts || []).filter(function (c) { return c.value; });
    if (contacts.length) {
      var cSize = sz(19);
      var cInner = contactsRunXml(contacts, cSize, accent);
      var joined = contacts.map(function (c) { return c.value; }).join("   |   ");
      add(para(cInner, pPr('<w:jc w:val="' + nameAlign + '"/>' + spacing(0, sp(110)))), cSize, joined, USABLE_W, 0, sp(110));
    }

    /* sections */
    (r.sections || []).forEach(function (sec) {
      var hdBdr = '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="' + ruleColor + '"/></w:pBdr>';
      var hSize = sz(19);
      var hBefore = sp(110) + fillTwips;
      add(para(runXml({ t: sec.title || "Section" }, { bold: true, size: hSize, caps: true, color: accent }),
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
    var maxPages = (r.pages === 2) ? 2 : 1;
    var over = USABLE_H_PT * 0.96 * maxPages;        /* shrink target (safety headroom), across the allowed pages */
    var fillTarget = USABLE_H_PT * 0.96;             /* only fill the FIRST page when a 1-page resume underflows */
    var FLOOR = 0.55;
    var base = THEME_DENSITIES[normalizeTheme(r.theme).density] || 1;   /* density sets the baseline scale */
    var scale = base, built = buildBody(r, scale, 0);
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
      built = buildBody(r, base, fillTwips);
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
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
    var links = contactLinks(((r.profile || {}).contacts || []).filter(function (c) { return c.value; }));
    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      links.map(function (l) { return '<Relationship Id="' + l.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + xmlEsc(l.target) + '" TargetMode="External"/>'; }).join("") +
      '</Relationships>';
    var docxFont = (THEME_FONTS[normalizeTheme(r.theme).font] || THEME_FONTS.calibri).docx;
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="' + xmlEsc(docxFont) + '" w:hAnsi="' + xmlEsc(docxFont) + '" w:cs="' + xmlEsc(docxFont) + '"/><w:sz w:val="20"/><w:szCs w:val="20"/>' +
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
    a.download = resumeFileBase(activeResume()) + ".docx";
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
  var IMPORT_MAX_BYTES = 12 * 1024 * 1024;   /* resume JSON is normally < 1 MB; cap guards against junk/huge files */
  var BACKUP_KEY = "newvisual.resumedata.backup";
  function backupCurrent(str) {
    try { localStorage.setItem(BACKUP_KEY, str); localStorage.setItem(BACKUP_KEY + ".at", String(Date.now())); } catch (e) {}
  }
  /* Import that validates the file, never silently overwrites, backs up the
     current data first, and is undoable (Ctrl+Z). */
  function importJson(file) {
    if (file && typeof file.size === "number" && file.size > IMPORT_MAX_BYTES) {
      alert("That file is " + (file.size / 1048576).toFixed(1) + " MB — too large for resume data (normally under 1 MB). Import cancelled; nothing was changed.");
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { alert("Could not read that file. Nothing was changed."); };
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { alert("That file isn't valid JSON, so it can't be imported. Nothing was changed."); return; }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        alert("That file doesn't contain resume data. Nothing was changed."); return;
      }
      var looksLikeResume = Array.isArray(parsed.resumes) || Array.isArray(parsed.sections) || (parsed.library && typeof parsed.library === "object");
      if (!looksLikeResume) {
        alert("That file doesn't look like a Resume Builder export (no resumes, sections, or library found). Nothing was changed."); return;
      }
      var curCount = (store.resumes || []).length;
      if (!confirm("Import will REPLACE your current data (" + curCount + " resume" + (curCount !== 1 ? "s" : "") + ") with this file's contents.\n\nYour current data is backed up first — press Undo (Ctrl+Z) or Reset if you change your mind.\n\nContinue?")) return;
      var before = snapshotStr();
      try {
        if (parsed.sections && !parsed.resumes) parsed = migrateV1(parsed);
        else if (parsed.resumes && parsed.resumes[0] && parsed.resumes[0].picks) parsed = migrateV2(parsed);
        var next = normalize(parsed);
      } catch (e) { alert("Could not import that file: " + e.message + "\nNothing was changed."); return; }
      backupCurrent(before);
      store = next;
      /* make the import a single undoable step */
      if (before) { undoStack.push(before); if (undoStack.length > UNDO_CAP) undoStack.shift(); redoStack = []; }
      lastSnapshot = snapshotStr(); persist(store);
      renderApp(); setSaveState("Saved"); updateUndoButtons();
      var n = store.resumes.length;
      flash("Imported — " + n + " resume" + (n !== 1 ? "s" : "") + " loaded. Press Ctrl+Z to undo.");
    };
    reader.readAsText(file);
  }
  function resetAll() { if (!confirm("Reset everything (all resumes and library) back to the sample? Your current data will be lost.")) return; store = sampleStore(); renderApp(); save(); }

  function init() {
    store = load(); lastSnapshot = snapshotStr(); renderApp();
    var tabs = document.querySelectorAll("#tabs .tab");
    for (var i = 0; i < tabs.length; i++) tabs[i].addEventListener("click", function () { activeTab = this.getAttribute("data-tab"); renderApp(); });
    document.getElementById("btnPdf").addEventListener("click", function () {
      /* the browser's "Save as PDF" uses document.title as the filename —
         swap it to the desired resume name, print, then restore it. */
      var prev = document.title;
      document.title = resumeFileBase(activeResume());
      var restore = function () { document.title = prev; window.removeEventListener("afterprint", restore); };
      window.addEventListener("afterprint", restore);
      window.print();
      /* fallback restore in case afterprint doesn't fire */
      setTimeout(restore, 1000);
    });
    document.getElementById("btnDocx").addEventListener("click", exportDocx);
    document.getElementById("btnExport").addEventListener("click", exportJson);
    document.getElementById("btnReset").addEventListener("click", resetAll);
    var btnUndo = document.getElementById("btnUndo"), btnRedo = document.getElementById("btnRedo");
    if (btnUndo) btnUndo.addEventListener("click", doUndo);
    if (btnRedo) btnRedo.addEventListener("click", doRedo);
    updateUndoButtons();
    /* keyboard undo/redo — only when focus is NOT in a text field, so native
       text-editing undo inside inputs/textareas keeps working as expected. */
    document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (e.target && e.target.isContentEditable)) return;
      var k = (e.key || "").toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); doRedo(); }
    });
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
