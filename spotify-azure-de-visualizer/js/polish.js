/* ============================================================
   Iteration 7 — polish layer
   Global search, progress tracking, learning path, code explorer.
   Reuses openPanel() and the content spine.
   ============================================================ */

/* ---------------- Progress tracking (localStorage) ---------------- */
const PROG_KEY = "spotifyde:progress:v1";
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY)) || { records: [], modes: [], quizBest: 0 }; }
  catch { return { records: [], modes: [], quizBest: 0 }; }
}
function saveProgress(p) { try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch {} }
function trackRecord(id) { const p = loadProgress(); if (id && !p.records.includes(id)) { p.records.push(id); saveProgress(p); } }
function trackMode(id) { const p = loadProgress(); if (id && !p.modes.includes(id)) { p.modes.push(id); saveProgress(p); } }
function setQuizBest(n) { const p = loadProgress(); if (n > (p.quizBest || 0)) { p.quizBest = n; saveProgress(p); } }

function computeProgress() {
  const p = loadProgress();
  const rec = new Set(p.records), mode = new Set(p.modes);
  const recs = Object.values(window.CONTENT);
  const arch = ["azuresql", "adf", "bronze", "databricks", "silver", "dlt", "gold", "unity", "consumers"];
  const pct = (n, d) => Math.min(100, Math.round((n / d) * 100));
  const withLayer = (k) => recs.filter(r => r.layers && r.layers[k]);
  const visitedWith = (k) => withLayer(k).filter(r => rec.has(r.id)).length;
  const quizTotal = (window.QUIZ || []).length || 1;
  return [
    { name: "Architecture", val: pct(arch.filter(id => rec.has(id)).length, arch.length) },
    { name: "Implementation", val: pct(visitedWith("implementation"), withLayer("implementation").length || 1) },
    { name: "Internals", val: pct(visitedWith("internals"), withLayer("internals").length || 1) },
    { name: "Production", val: pct((mode.has("failure") ? 1 : 0) + (rec.has("monitoring") ? 1 : 0) + (rec.has("security") ? 1 : 0), 3) },
    { name: "Design", val: pct((mode.has("decisions") ? 1 : 0) + (mode.has("whiteboard") ? 1 : 0) + (mode.has("complete") ? 1 : 0), 3) },
    { name: "Interview", val: pct((mode.has("interview") ? 1 : 0) * quizTotal + (p.quizBest || 0), quizTotal * 2) }
  ];
}

/* ---------------- Generic modal ---------------- */
function openModal(title, kicker, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalKicker").textContent = kicker;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").classList.add("show");
  // wire any record links inside
  document.querySelectorAll("#modalBody [data-open]").forEach(el =>
    el.addEventListener("click", () => { closeModal(); openPanel(el.dataset.open); }));
  document.querySelectorAll("#modalBody [data-gomode]").forEach(el =>
    el.addEventListener("click", () => { closeModal(); const m = MODES.find(x => x.id === el.dataset.gomode); if (m) setMode(m); }));
}
function closeModal() { document.getElementById("modal").classList.remove("show"); }

/* ---------------- Progress view ---------------- */
function openProgress() {
  const dims = computeProgress();
  const weak = dims.filter(d => d.val < 50).map(d => d.name);
  const html = `
    <p class="mv-lead">Your knowledge across the six dimensions, based on what you've explored. Stored in your browser only.</p>
    <div class="prog-grid">${dims.map(d => `
      <div class="prog-row">
        <div class="prog-label">${d.name}</div>
        <div class="prog-bar"><div class="prog-fill" style="width:${d.val}%"></div></div>
        <div class="prog-val">${d.val}%</div>
      </div>`).join("")}</div>
    <div class="mv-note">${weak.length
      ? `<b>Focus next:</b> ${weak.join(", ")} — explore those components and modes to strengthen them.`
      : "Strong across the board — you're interview-ready. 🎧"}</div>
    <button class="tbtn" id="progReset" style="margin-top:12px">Reset progress</button>`;
  openModal("Progress", "Knowledge tracker", html);
  document.getElementById("progReset").onclick = () => { saveProgress({ records: [], modes: [], quizBest: 0 }); openProgress(); };
}

/* ---------------- Learning path (17 modules) ---------------- */
const LEARN_MODULES = [
  { n: 1, t: "Business Understanding & Architecture", rec: "azuresql", mode: "complete" },
  { n: 2, t: "Azure Infrastructure Setup", rec: "security", mode: "complete" },
  { n: 3, t: "Bronze — ADF Incremental Ingestion", rec: "adf", mode: "batch" },
  { n: 4, t: "Monitoring — Logic Apps & Alerting", rec: "monitoring", mode: "failure" },
  { n: 5, t: "Silver — Unity Catalog, Auto Loader & Streaming", rec: "autoloader", mode: "streaming" },
  { n: 6, t: "Python Utility Framework", rec: "silver", mode: "streaming" },
  { n: 7, t: "Metadata-Driven Processing & Jinja2", rec: "adf", mode: "batch" },
  { n: 8, t: "Gold — DLT / Lakeflow & SCD", rec: "dlt", mode: "complete" },
  { n: 9, t: "Data Quality — DLT Expectations", rec: "dataquality", mode: "failure" },
  { n: 10, t: "Deployment — Asset Bundles & CI/CD", rec: "unity", mode: "decisions" },
  { n: 11, t: "Architecture Decision Records", rec: "delta", mode: "decisions" },
  { n: 12, t: "Production Engineering Standards", rec: "security", mode: "failure" },
  { n: 13, t: "End-to-End Project Walkthrough", rec: "consumers", mode: "trace" },
  { n: 14, t: "Comprehensive Interview Question Bank", rec: "watermark", mode: "interview" },
  { n: 15, t: "Production Incident Scenarios", rec: "checkpoint", mode: "failure" },
  { n: 16, t: "Resume-Based Interview Questions", rec: "gold", mode: "interview" },
  { n: 17, t: "Quick Revision Notes", rec: "scd", mode: "quiz" }
];
function openLearn() {
  const steps = "Learn → Visualize → Implement → Internals → Debug → Design → Interview → Quiz";
  const html = `
    <p class="mv-lead">The 17 handbook modules. Each: <span class="mono" style="font-size:11px">${steps}</span>. Jump into the relevant component or mode.</p>
    <div class="learn-list">${LEARN_MODULES.map(m => {
      const r = window.CONTENT[m.rec];
      return `<div class="learn-row">
        <div class="learn-n">${m.n}</div>
        <div class="learn-t">${m.t}</div>
        <div class="learn-go">
          <span class="chip" data-open="${m.rec}">${r ? r.icon : "📄"} concept</span>
          <span class="chip" data-gomode="${m.mode}">▶ mode</span>
        </div>
      </div>`;
    }).join("")}</div>`;
  openModal("Learning Path", "17 handbook modules", html);
}

/* ---------------- Code Explorer ---------------- */
function openCode() {
  const html = `
    <p class="mv-lead">Representative code from the project, each with the full treatment. <span class="tag-pill tag-general" style="margin-left:6px">Illustrative — shows the handbook's shape, not verbatim source</span></p>
    <div class="code-list">${window.CODE_SAMPLES.map((c, i) => `
      <details class="codeblk" ${i === 0 ? "open" : ""}>
        <summary><span class="chev">▶</span> <b>${c.title}</b> <span class="csrc">${c.source}</span></summary>
        <div class="codebody">
          <pre class="code">${escapeHtml(c.code)}</pre>
          <p><b>1 · What it does:</b> ${c.does}</p>
          <p><b>2 · Easy:</b> ${c.easy}</p>
          <p><b>3 · Technical:</b> ${c.tech}</p>
          <p><b>4 · Key lines:</b></p><ul>${c.lines.map(l => `<li>${l}</li>`).join("")}</ul>
          <p><b>5 · Internally:</b> ${c.internal}</p>
          <p><b>6 · Why this way:</b> ${c.why}</p>
          <p class="cwrong"><b>7 · What could go wrong:</b> ${c.wrong}</p>
          <p><b>8 · Interviewer asks:</b> 💬 ${c.interview}</p>
        </div>
      </details>`).join("")}</div>`;
  openModal("Code Explorer", "Representative implementation", html);
}

/* ---------------- Global search ---------------- */
function searchAll(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits = [];
  Object.values(window.CONTENT).forEach(r => {
    let score = 0;
    if (r.title.toLowerCase().includes(q)) score += 5;
    if (r.id.includes(q)) score += 4;
    if ((r.tech || "").toLowerCase().includes(q)) score += 2;
    const blob = Object.values(r.layers || {}).map(v => typeof v === "string" ? v : "").join(" ").toLowerCase();
    if (blob.includes(q)) score += 1;
    if (score) hits.push({ r, score });
  });
  return hits.sort((a, b) => b.score - a.score).slice(0, 8).map(h => h.r);
}
function renderSearchDropdown(q) {
  const dd = document.getElementById("searchDrop");
  const results = searchAll(q);
  if (!results.length) { dd.classList.remove("show"); dd.innerHTML = ""; return; }
  dd.innerHTML = results.map(r =>
    `<div class="sd-item" data-open="${r.id}">
      <span class="sd-icon">${r.icon}</span>
      <span class="sd-title">${r.title}</span>
      <span class="tag-pill ${{ handbook: "tag-handbook", general: "tag-general", hypo: "tag-hypo", unspec: "tag-unspec" }[r.tag] || "tag-unspec"}" style="margin-left:auto;font-size:9px">${r.tag}</span>
    </div>`).join("");
  dd.classList.add("show");
  dd.querySelectorAll("[data-open]").forEach(el => el.addEventListener("click", () => {
    dd.classList.remove("show"); document.getElementById("search").value = "";
    openPanel(el.dataset.open);
  }));
}

/* ---------------- boot hooks (called from app.js boot) ---------------- */
function initPolish() {
  const search = document.getElementById("search");
  search.addEventListener("input", () => renderSearchDropdown(search.value));
  search.addEventListener("blur", () => setTimeout(() => document.getElementById("searchDrop").classList.remove("show"), 180));
  document.getElementById("btnLearn").onclick = openLearn;
  document.getElementById("btnProgress").onclick = openProgress;
  document.getElementById("btnCode").onclick = openCode;
  document.getElementById("modalClose").onclick = closeModal;
  document.getElementById("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
}
