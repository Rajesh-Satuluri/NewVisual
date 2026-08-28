/* ============================================================
   Resume Builder — NewVisual
   Pure vanilla JS. Block-based editor + live preview + print PDF.
   All data persists in localStorage (browser only, no backend).
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "newvisual.resume.v1";

  /* ---------- utils ---------- */
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  // minimal escaping + **bold** support for preview text
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function rich(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /* ---------- default (sample) resume — from the template ---------- */
  function sample() {
    return {
      name: "RAJESH SATULURI",
      title: "Senior Data Engineer",
      contacts: [
        { icon: "✉", value: "rajesh.satuluri79@gmail.com" },
        { icon: "☎", value: "+91 8106783397" },
        { icon: "⚲", value: "Hyderabad, Telangana" }
      ],
      sections: [
        {
          id: uid(), title: "Professional Summary", type: "text",
          text: "Senior Technical Consultant with 4+ years of experience delivering **o9 Solutions, supply chain planning, data integration, and enterprise ETL solutions** for global manufacturing clients. Experienced in **o9 platform integration, SQL, T-SQL, SSIS, Apache NiFi, REST APIs, ETL, batch processing, and real-time data pipelines** across Demand Planning, Supply Planning, Kit Planning, Order Handling, and Global Costing. Proven experience in **technical solution design, requirements analysis, integration development, troubleshooting, data quality, testing, and go-live support** with functional, product, and client teams."
        },
        {
          id: uid(), title: "Technical Skills", type: "labeled",
          items: [
            { id: uid(), label: "Programming & Data Processing", value: "Python, PySpark, Apache Spark, Spark SQL." },
            { id: uid(), label: "o9 Solutions Platform", value: "o9 Digital Brain, IBPL, o9 DB Designer, Enterprise Knowledge Graph, Graph Cube." },
            { id: uid(), label: "Data Integration & ETL", value: "SQL, T-SQL, SSIS, Apache NiFi, ETL, Data Integration, Batch Integration, REST APIs, SFTP." },
            { id: uid(), label: "Orchestration", value: "Apache Airflow." },
            { id: uid(), label: "Cloud & Big Data", value: "Azure: ADLS, ADF, Databricks, Synapse, Unity Catalog." },
            { id: uid(), label: "Databases", value: "SQL Server, MySQL, PostgreSQL, Snowflake." }
          ]
        },
        {
          id: uid(), title: "Professional Experience", type: "entries",
          items: [
            {
              id: uid(), heading: "o9 Solutions — Senior Data Engineer", date: "Jul 2022 – Present",
              meta: "Supply chain data integration · o9 Digital Brain platform · Apache NiFi · SQL",
              bullets: [
                "Built end-to-end data integration pipelines for Supply Planning, Demand Planning, Order Handling, Kitting, and Costing workflows on the o9 Digital Brain platform.",
                "Developed ingestion, validation, transformation, deduplication, and aggregation logic across SFTP/API → SQL staging → o9 data flows; created source-to-target mappings and business transformation rules for high-volume supply-chain datasets.",
                "Delivered near-real-time integration using Apache NiFi, APIs, and SQL with watermark-based incremental processing to prevent duplicate records and reliably propagate transactional data.",
                "Developed integrations using IBPL, o9 DB Designer, Enterprise Knowledge Graph, and Graph Cube across Supply Planning, Demand Planning, Order Handling, Kitting, and Costing modules.",
                "Delivered multiple integration enhancements and major production go-lives while maintaining reliable data delivery across upstream, transformation, and o9 layers."
              ]
            }
          ]
        },
        {
          id: uid(), title: "Projects", type: "entries",
          items: [
            {
              id: uid(), heading: "Real-Time Data Pipeline", date: "",
              meta: "Kafka · Apache Flink · Apache Iceberg · Databricks · Snowflake",
              bullets: [
                "Designed a production-scale real-time pipeline using Kafka for event ingestion, Flink for stateful stream processing, Apache Iceberg for Lakehouse storage, and Snowflake for analytical serving.",
                "Implemented event-time processing, windowing, watermarking, state management, schema evolution, and fault-tolerant handling for out-of-order and late-arriving events."
              ]
            },
            {
              id: uid(), heading: "E-Commerce Batch Data Engineering Project", date: "",
              meta: "ADLS Gen2 · Databricks · PySpark · Apache Airflow · dbt · Delta Lake · Unity Catalog",
              bullets: [
                "Engineered an end-to-end batch data pipeline using ADLS Gen2, Databricks, PySpark, Delta Lake, and Apache Airflow, implementing a Medallion Architecture for analytics-ready e-commerce data.",
                "Implemented incremental ETL/ELT and CDC ingestion with Databricks Auto Loader and developed metadata-driven dbt/Jinja transformations, supporting schema evolution and scalable Silver-to-Gold processing.",
                "Designed SCD Type 2 dimensional models using dbt Snapshots and orchestrated workflows with Apache Airflow, incorporating data-quality checks, retries, task dependencies, Unity Catalog governance, and GitHub CI/CD."
              ]
            }
          ]
        },
        {
          id: uid(), title: "Education", type: "entries",
          items: [
            {
              id: uid(), heading: "NIT Tiruchirappalli — Bachelor of Technology, Production Engineering",
              date: "Jul 2018 – Aug 2022", meta: "", bullets: []
            }
          ]
        },
        {
          id: uid(), title: "Awards / Achievements", type: "labeled",
          items: [
            { id: uid(), label: "Spot Award (×2) – o9 Solutions", value: "Recognized twice for exceptional contribution and on-time delivery of high-impact supply chain data integration projects." }
          ]
        }
      ]
    };
  }

  /* ---------- state ---------- */
  var data;
  var saveTimer = null;
  var collapsed = {};   // section id -> collapsed?

  /* auto-grow a textarea to fit its content (one line minimum) */
  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight, 32) + "px";
  }
  function growAll(root) {
    var tas = (root || document).querySelectorAll("textarea.inp");
    for (var i = 0; i < tas.length; i++) autoGrow(tas[i]);
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return sample();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    setSaveState("Saved");
  }
  function setSaveState(txt, dirty) {
    var s = document.getElementById("saveState");
    if (!s) return;
    s.textContent = txt;
    s.classList.toggle("dirty", !!dirty);
  }
  function touch() {
    setSaveState("Saving…", true);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
    renderPreview();
  }

  /* ============================================================
     EDITOR
     ============================================================ */
  function renderEditor() {
    var host = document.getElementById("editorInner");
    host.innerHTML = "";

    /* Header block (name / title / contacts) */
    host.appendChild(headerBlock());

    /* Section blocks */
    data.sections.forEach(function (sec, idx) {
      host.appendChild(sectionBlock(sec, idx));
    });

    /* size all textareas to their content now they're attached */
    growAll(host);
  }

  function headerBlock() {
    var b = el("div", "block");
    var head = el("div", "block-head");
    var t = el("span", "sec-title"); t.textContent = "Header";
    head.appendChild(t);
    b.appendChild(head);

    var body = el("div", "block-body");

    body.appendChild(fieldInput("Full name", data.name, function (v) { data.name = v; touch(); }));
    body.appendChild(fieldInput("Role / title", data.title, function (v) { data.title = v; touch(); }));

    var lbl = el("div", "item-bar");
    var l = el("span", "lbl"); l.textContent = "Contact details";
    var add = miniBtn("＋ Add contact", function () {
      data.contacts.push({ icon: "•", value: "" });
      renderEditor(); touch();
    }, "js-add");
    lbl.appendChild(l); lbl.appendChild(add);
    body.appendChild(lbl);

    data.contacts.forEach(function (c, i) {
      var row = el("div", "bullet-row");
      var icon = el("input", "inp"); icon.value = c.icon; icon.style.maxWidth = "52px";
      icon.setAttribute("title", "Icon (✉ ☎ ⚲ 🔗 …)");
      icon.addEventListener("input", function () { c.icon = icon.value; touch(); });
      var val = el("input", "inp"); val.value = c.value;
      val.setAttribute("placeholder", "email / phone / location / link");
      val.addEventListener("input", function () { c.value = val.value; touch(); });
      var del = miniBtn("✕", function () { data.contacts.splice(i, 1); renderEditor(); touch(); }, "btn-danger");
      row.appendChild(icon); row.appendChild(val); row.appendChild(del);
      body.appendChild(row);
    });

    b.appendChild(body);
    return b;
  }

  function sectionBlock(sec, idx) {
    var b = el("div", "block");

    if (collapsed[sec.id]) b.classList.add("collapsed");

    /* head: caret + editable side-heading + move + delete (click to collapse) */
    var head = el("div", "block-head");
    head.title = "Click to collapse / expand";
    var caret = el("span", "caret"); caret.textContent = "▼";

    var title = el("input", "sec-title");
    title.value = sec.title;
    title.setAttribute("title", "Edit section heading");
    title.addEventListener("input", function () { sec.title = title.value; touch(); });

    var up = el("span", "move"); up.textContent = "▲"; up.title = "Move section up";
    up.addEventListener("click", function () { moveSection(idx, -1); });
    var down = el("span", "move"); down.textContent = "▼"; down.title = "Move section down";
    down.addEventListener("click", function () { moveSection(idx, 1); });
    var del = miniBtn("Delete", function () {
      if (confirm("Delete section \"" + sec.title + "\"?")) { data.sections.splice(idx, 1); renderEditor(); touch(); }
    }, "btn-danger");

    head.addEventListener("click", function (e) {
      if (e.target.closest("input, button, .move")) return;
      collapsed[sec.id] = !collapsed[sec.id];
      b.classList.toggle("collapsed", collapsed[sec.id]);
      if (!collapsed[sec.id]) growAll(b);
    });

    head.appendChild(caret); head.appendChild(title); head.appendChild(up); head.appendChild(down); head.appendChild(del);
    b.appendChild(head);

    var body = el("div", "block-body");

    if (sec.type === "text") {
      body.appendChild(fieldTextarea("Paragraph (use **bold** for emphasis)", sec.text, function (v) { sec.text = v; touch(); }));
    } else if (sec.type === "labeled") {
      renderLabeledEditor(body, sec);
    } else if (sec.type === "entries") {
      renderEntriesEditor(body, sec);
    }

    /* type switcher for custom sections */
    body.appendChild(typeSwitcher(sec));

    b.appendChild(body);
    return b;
  }

  function renderLabeledEditor(body, sec) {
    var bar = el("div", "item-bar");
    var l = el("span", "lbl"); l.textContent = "Rows (side-heading : text)";
    bar.appendChild(l);
    bar.appendChild(miniBtn("＋ Add row", function () {
      sec.items.push({ id: uid(), label: "", value: "" }); renderEditor(); touch();
    }, "js-add"));
    body.appendChild(bar);

    sec.items.forEach(function (it, i) {
      var wrap = el("div", "item");
      var top = el("div", "item-bar");
      top.appendChild(elText("span", "lbl", "Row " + (i + 1)));
      var tools = el("div", "item-tools");
      tools.appendChild(miniBtn("▲", function () { moveItem(sec, i, -1); }));
      tools.appendChild(miniBtn("▼", function () { moveItem(sec, i, 1); }));
      tools.appendChild(miniBtn("✕", function () { sec.items.splice(i, 1); renderEditor(); touch(); }, "btn-danger"));
      top.appendChild(tools);
      wrap.appendChild(top);
      wrap.appendChild(fieldInput("Side-heading", it.label, function (v) { it.label = v; touch(); }));
      wrap.appendChild(fieldTextarea("Skills / text", it.value, function (v) { it.value = v; touch(); }));
      body.appendChild(wrap);
    });
  }

  function renderEntriesEditor(body, sec) {
    var bar = el("div", "item-bar");
    var l = el("span", "lbl"); l.textContent = "Entries";
    bar.appendChild(l);
    bar.appendChild(miniBtn("＋ Add entry", function () {
      sec.items.push({ id: uid(), heading: "", date: "", meta: "", bullets: [] }); renderEditor(); touch();
    }, "js-add"));
    body.appendChild(bar);

    sec.items.forEach(function (it, i) {
      var wrap = el("div", "item");
      var top = el("div", "item-bar");
      top.appendChild(elText("span", "lbl", "Entry " + (i + 1)));
      var tools = el("div", "item-tools");
      tools.appendChild(miniBtn("▲", function () { moveItem(sec, i, -1); }));
      tools.appendChild(miniBtn("▼", function () { moveItem(sec, i, 1); }));
      tools.appendChild(miniBtn("✕", function () { sec.items.splice(i, 1); renderEditor(); touch(); }, "btn-danger"));
      top.appendChild(tools);
      wrap.appendChild(top);

      wrap.appendChild(fieldInput("Title (company / role / project / school)", it.heading, function (v) { it.heading = v; touch(); }));
      var r2 = el("div", "row-2");
      r2.appendChild(fieldInput("Date range", it.date, function (v) { it.date = v; touch(); }));
      r2.appendChild(fieldInput("Meta / tech line", it.meta, function (v) { it.meta = v; touch(); }));
      wrap.appendChild(r2);

      /* bullets */
      var bbar = el("div", "item-bar");
      bbar.appendChild(elText("span", "lbl", "Bullet points"));
      bbar.appendChild(miniBtn("＋ Add bullet", function () {
        it.bullets.push(""); renderEditor(); touch();
      }, "js-add"));
      wrap.appendChild(bbar);

      var bl = el("div", "bullets");
      it.bullets.forEach(function (bt, bi) {
        var row = el("div", "bullet-row");
        var ta = el("textarea", "inp"); ta.value = bt;
        ta.addEventListener("input", function () { it.bullets[bi] = ta.value; autoGrow(ta); touch(); });
        var d = miniBtn("✕", function () { it.bullets.splice(bi, 1); renderEditor(); touch(); }, "btn-danger");
        row.appendChild(ta); row.appendChild(d);
        bl.appendChild(row);
      });
      wrap.appendChild(bl);
      body.appendChild(wrap);
    });
  }

  function typeSwitcher(sec) {
    var holder = el("div");
    var lw = el("div", "field layout-wrap");
    var toggle = miniBtn("⚙ Layout", function () { lw.classList.toggle("open"); });
    toggle.classList.add("layout-toggle");
    var lab = el("label"); lab.textContent = "Section layout";
    var sel = el("select", "inp");
    [["text", "Paragraph"], ["labeled", "Labeled rows (heading : text)"], ["entries", "Entries (title, date, bullets)"]]
      .forEach(function (o) {
        var opt = el("option"); opt.value = o[0]; opt.textContent = o[1];
        if (sec.type === o[0]) opt.selected = true;
        sel.appendChild(opt);
      });
    sel.addEventListener("change", function () {
      var nt = sel.value;
      if (nt === sec.type) return;
      sec.type = nt;
      if (nt === "text" && typeof sec.text !== "string") sec.text = "";
      if (nt === "labeled" && !Array.isArray(sec.items)) sec.items = [];
      if (nt === "entries" && !Array.isArray(sec.items)) sec.items = [];
      if ((nt === "labeled" || nt === "entries") && !sec.items) sec.items = [];
      renderEditor(); touch();
    });
    lw.appendChild(lab); lw.appendChild(sel);
    holder.appendChild(toggle); holder.appendChild(lw);
    return holder;
  }

  /* ---------- small field builders ---------- */
  function fieldInput(label, val, onInput) {
    var f = el("div", "field");
    var l = el("label"); l.textContent = label;
    var i = el("input", "inp"); i.value = val || "";
    i.addEventListener("input", function () { onInput(i.value); });
    f.appendChild(l); f.appendChild(i);
    return f;
  }
  function fieldTextarea(label, val, onInput) {
    var f = el("div", "field");
    var l = el("label"); l.textContent = label;
    var t = el("textarea", "inp"); t.value = val || "";
    t.addEventListener("input", function () { onInput(t.value); autoGrow(t); });
    f.appendChild(l); f.appendChild(t);
    return f;
  }
  function miniBtn(txt, onClick, extra) {
    var b = el("button", "btn btn-mini" + (extra ? " " + extra : ""));
    b.type = "button"; b.textContent = txt;
    b.addEventListener("click", onClick);
    return b;
  }
  function elText(tag, cls, txt) { var n = el(tag, cls); n.textContent = txt; return n; }

  /* ---------- move helpers ---------- */
  function moveSection(idx, dir) {
    var j = idx + dir;
    if (j < 0 || j >= data.sections.length) return;
    var tmp = data.sections[idx]; data.sections[idx] = data.sections[j]; data.sections[j] = tmp;
    renderEditor(); touch();
  }
  function moveItem(sec, idx, dir) {
    var j = idx + dir;
    if (j < 0 || j >= sec.items.length) return;
    var tmp = sec.items[idx]; sec.items[idx] = sec.items[j]; sec.items[j] = tmp;
    renderEditor(); touch();
  }

  /* ============================================================
     PREVIEW
     ============================================================ */
  function renderPreview() {
    var page = document.getElementById("page");
    var h = "";

    h += '<div class="r-name">' + esc(data.name || "Your Name") + "</div>";
    if (data.title) h += '<div class="r-title">' + esc(data.title) + "</div>";

    if (data.contacts && data.contacts.length) {
      var parts = data.contacts.filter(function (c) { return c.value; }).map(function (c) {
        return '<span class="ico">' + esc(c.icon) + "</span>" + esc(c.value);
      });
      if (parts.length) h += '<div class="r-contacts">' + parts.join('<span class="sep">|</span>') + "</div>";
    }

    data.sections.forEach(function (sec) {
      h += '<div class="r-section">';
      h += '<div class="r-sec-title">' + esc(sec.title || "Section") + "</div>";
      if (sec.type === "text") {
        h += '<div class="r-text">' + (sec.text ? rich(sec.text) : '<span class="r-empty">—</span>') + "</div>";
      } else if (sec.type === "labeled") {
        (sec.items || []).forEach(function (it) {
          h += '<div class="r-labeled-row"><span class="lab">' + esc(it.label) +
            (it.label ? ": " : "") + "</span>" + rich(it.value) + "</div>";
        });
      } else if (sec.type === "entries") {
        (sec.items || []).forEach(function (it) {
          h += '<div class="r-entry">';
          h += '<div class="r-entry-head"><span class="r-entry-title">' + esc(it.heading) + "</span>";
          if (it.date) h += '<span class="r-entry-date">' + esc(it.date) + "</span>";
          h += "</div>";
          if (it.meta) h += '<div class="r-entry-meta">' + esc(it.meta) + "</div>";
          if (it.bullets && it.bullets.length) {
            h += '<ul class="r-bullets">';
            it.bullets.forEach(function (bt) { if (bt) h += "<li>" + rich(bt) + "</li>"; });
            h += "</ul>";
          }
          h += "</div>";
        });
      }
      h += "</div>";
    });

    page.innerHTML = h;
    fitPreview();
    checkOnePage();
  }

  /* Scale the A4 page down to fit the (small) preview column so the whole
     page is visible at once for verification. */
  function fitPreview() {
    var wrap = document.querySelector(".preview-wrap");
    var holder = document.getElementById("pageHolder");
    var scaler = document.getElementById("pageScaler");
    if (!wrap || !holder || !scaler) return;
    var avail = wrap.clientWidth - 4;              // available width in the column
    var scale = Math.min(avail / 794, 1);          // never upscale past 100%
    if (!isFinite(scale) || scale <= 0) scale = 0.45;
    scaler.style.transform = "scale(" + scale + ")";
    holder.style.width = (794 * scale) + "px";
    holder.style.height = (1123 * scale) + "px";
  }

  /* Strict one-page check: flag when content overflows the fixed A4 height. */
  function checkOnePage() {
    var page = document.getElementById("page");
    var badge = document.getElementById("pageBadge");
    if (!page || !badge) return;
    var over = page.scrollHeight > page.clientHeight + 1;
    page.classList.toggle("over", over);
    badge.textContent = over ? "⚠ Over 1 page" : "1 page";
    badge.className = "page-badge " + (over ? "over" : "ok");

    /* Hard cap: when over one page, block adding more content. */
    var banner = document.getElementById("overBanner");
    if (banner) banner.hidden = !over;
    var adders = document.querySelectorAll(".btn.js-add");
    for (var i = 0; i < adders.length; i++) adders[i].disabled = over;
  }

  /* ============================================================
     TOOLBAR ACTIONS
     ============================================================ */
  function addSection() {
    data.sections.push({ id: uid(), title: "New Section", type: "entries", items: [] });
    renderEditor(); touch();
    var ed = document.getElementById("editor");
    ed.scrollTop = ed.scrollHeight;
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a");
    a.href = url;
    a.download = (data.name || "resume").replace(/\s+/g, "_").toLowerCase() + "_resume.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.sections)) {
          alert("That doesn't look like a resume JSON file."); return;
        }
        data = parsed;
        renderAll(); save();
      } catch (e) { alert("Could not read that file: " + e.message); }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm("Reset everything back to the sample resume? Your current data will be lost.")) return;
    data = sample();
    renderAll(); save();
  }

  function renderAll() { renderEditor(); renderPreview(); }

  /* ---------- wire up ---------- */
  function init() {
    data = load();
    renderAll();

    document.getElementById("btnAddSection").addEventListener("click", addSection);
    document.getElementById("btnPdf").addEventListener("click", function () { window.print(); });
    document.getElementById("btnExport").addEventListener("click", exportJson);
    document.getElementById("btnReset").addEventListener("click", resetAll);
    var fileInput = document.getElementById("fileImport");
    document.getElementById("btnImport").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) importJson(fileInput.files[0]);
      fileInput.value = "";
    });

    setSaveState("Saved");

    window.addEventListener("resize", fitPreview);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
