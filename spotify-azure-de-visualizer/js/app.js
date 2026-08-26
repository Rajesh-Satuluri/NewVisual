/* ============================================================
   App controller (Iteration 0/1)
   Wires the diagram, side panel, mode rail, walkthrough,
   WHY/WHAT-IF, and search. Later iterations plug into the
   same mode rail and panel.
   ============================================================ */

/* Modes: only Mode 1 (Complete Architecture) is live in Iter 1.
   The rest are declared and gated so the roadmap is visible. */
const MODES = [
  { id: "complete",   n: 1,  label: "Complete Architecture", live: true },
  { id: "batch",      n: 2,  label: "Batch / Incremental",   live: true },
  { id: "streaming",  n: 3,  label: "Streaming / Micro-Batch", live: true },
  { id: "lineage",    n: 4,  label: "Data Lineage",          live: false },
  { id: "trace",      n: 5,  label: "Trace a Record",        live: false },
  { id: "failure",    n: 6,  label: "Failure / Debugging",   live: false },
  { id: "decisions",  n: 7,  label: "Architecture Decisions", live: false },
  { id: "interview",  n: 8,  label: "Interview Mode",        live: false },
  { id: "whiteboard", n: 9,  label: "Whiteboard Design",     live: false },
  { id: "quiz",       n: 10, label: "Quiz Mode",             live: false }
];

let currentMode = "complete";

/* ---------- Panel ---------- */
function openPanel(recId) {
  const rec = window.CONTENT[recId];
  const panel = document.getElementById("panel");
  const body = document.getElementById("panelBody");
  const kicker = document.getElementById("panelKicker");
  const titleEl = document.getElementById("panelTitle");
  const techEl = document.getElementById("panelTech");

  kicker.textContent = rec ? "Architecture Component" : "Concept";
  titleEl.textContent = rec ? `${rec.icon} ${rec.title}` : recId;
  techEl.textContent = rec ? rec.tech : "";
  body.innerHTML = renderExplanation(recId);
  panel.classList.add("open");

  // wire in-panel actions
  body.querySelectorAll("[data-goto]").forEach(c =>
    c.addEventListener("click", () => selectNode(c.dataset.goto)));
  body.querySelectorAll("[data-whatif]").forEach(b =>
    b.addEventListener("click", () => openWhatIf(b.dataset.whatif)));
  body.querySelector('[data-expand="all"]')?.addEventListener("click", (e) => {
    const opening = e.target.textContent.includes("Expand");
    body.querySelectorAll("details.xlayer").forEach(d => d.open = opening);
    e.target.textContent = opening ? "Collapse all layers ▴" : "Expand all layers ▾";
  });
  body.querySelector('[data-jump="why"]')?.addEventListener("click", () => {
    const layers = body.querySelectorAll("details.xlayer");
    const whyLayer = layers[4]; // Why / Design
    if (whyLayer) { whyLayer.open = true; whyLayer.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
}
function closePanel() {
  document.getElementById("panel").classList.remove("open");
  clearHighlight();
}

function selectNode(id) {
  selected = id;
  highlightSelection();
  openPanel(id);
}

/* ---------- What-If modal ---------- */
function openWhatIf(recId) {
  const rec = window.CONTENT[recId];
  const scrim = document.getElementById("overlay");
  document.getElementById("walkTitle").textContent = `What If… — ${rec ? rec.title : recId}`;
  document.getElementById("walkKicker").textContent = "Scenario exploration";
  document.getElementById("walkBody").innerHTML = renderWhatIf(recId);
  document.getElementById("walkDots").innerHTML = "";
  document.getElementById("walkPrev").style.visibility = "hidden";
  document.getElementById("walkNext").textContent = "Close";
  document.getElementById("walkNext").onclick = closeOverlay;
  scrim.classList.add("show");
}

/* ---------- Explain Architecture walkthrough ---------- */
const WALK_STEPS = [
  { t: "Business Problem", h: "azuresql",
    body: "Spotify's operational data (songs, users, stream events, subscriptions) lives in <b>Azure SQL</b>, an OLTP store. Business teams can't run analytics there without hurting production, there's no history tracking, and quality issues propagate. <i>The whole platform exists to fix this.</i>" },
  { t: "Requirements → Ingestion", h: "adf",
    body: "We need <b>incremental</b> ingestion (only changed rows), <b>backfill</b> for history, and low-touch onboarding of new tables. Answer: one <b>metadata-driven ADF pipeline</b> (<code>PL_SPOTIFY_INCREMENTAL_LOAD</code>) using a watermark and a parallel ForEach." },
  { t: "Raw Landing", h: "bronze",
    body: "Extracted rows land immutably in <b>ADLS Gen2 Bronze</b> as partitioned Parquet — a replayable raw copy so downstream logic can be re-run without re-hitting the source." },
  { t: "Incremental Processing", h: "databricks",
    body: "<b>Databricks Auto Loader</b> picks up only new Bronze files, tracked by a <b>checkpoint</b> for exactly-once handling, running with <code>availableNow=True</code> — incremental batch, not always-on streaming." },
  { t: "Clean Foundation", h: "silver",
    body: "<b>Silver Delta tables</b> hold typed, cleaned, deduplicated, validated data — the trustworthy base for analytics, with Delta's ACID guarantees." },
  { t: "Modelled Gold", h: "dlt",
    body: "<b>DLT / Lakeflow</b> builds Gold declaratively: dependency resolution, data-quality expectations, and <b>Auto CDC</b> applying <b>SCD Type 1 &amp; 2</b> (Users/Artists keep history)." },
  { t: "Business Layer", h: "gold",
    body: "<b>Gold</b> fact &amp; dimension tables expose consistent, query-ready business metrics at a defined grain." },
  { t: "Governance", h: "unity",
    body: "<b>Unity Catalog</b> governs everything: RBAC, lineage, audit, discovery across the <code>catalog.schema.table</code> namespace." },
  { t: "Consumption", h: "consumers",
    body: "<b>BI &amp; analysts</b> read governed Gold — solving the original problem: safe, historical, cross-functional analytics decoupled from production OLTP." }
];
let walkIdx = 0;
function openWalkthrough() {
  walkIdx = 0;
  renderWalkStep();
  document.getElementById("overlay").classList.add("show");
}
function renderWalkStep() {
  const s = WALK_STEPS[walkIdx];
  document.getElementById("walkKicker").textContent = `Explain Architecture · ${walkIdx + 1}/${WALK_STEPS.length}`;
  document.getElementById("walkTitle").textContent = s.t;
  document.getElementById("walkBody").innerHTML =
    `<p>${s.body}</p><p style="margin-top:12px"><span class="expand-all" id="walkOpen">Open full 9-layer breakdown for ${window.CONTENT[s.h].title} →</span></p>`;
  document.getElementById("walkDots").innerHTML =
    WALK_STEPS.map((_, i) => `<i class="${i === walkIdx ? "on" : ""}"></i>`).join("");
  const prev = document.getElementById("walkPrev"), next = document.getElementById("walkNext");
  prev.style.visibility = walkIdx === 0 ? "hidden" : "visible";
  next.textContent = walkIdx === WALK_STEPS.length - 1 ? "Finish" : "Next →";
  next.onclick = () => { walkIdx < WALK_STEPS.length - 1 ? (walkIdx++, renderWalkStep()) : closeOverlay(); };
  prev.onclick = () => { if (walkIdx > 0) { walkIdx--; renderWalkStep(); } };
  // highlight the current node on the diagram behind the scrim
  selected = s.h; highlightSelection();
  document.getElementById("walkOpen").onclick = () => { closeOverlay(); selectNode(s.h); };
}
function closeOverlay() { document.getElementById("overlay").classList.remove("show"); }

/* ---------- Mode rail ---------- */
function buildModeRail() {
  const rail = document.getElementById("modeRail");
  rail.innerHTML = "";
  MODES.forEach(m => {
    const chip = document.createElement("div");
    chip.className = "mode-chip" + (m.live ? "" : " locked") + (m.id === currentMode ? " active" : "");
    chip.innerHTML = `<span class="num">${m.n}</span>${m.label}`;
    chip.onclick = () => setMode(m);
    rail.appendChild(chip);
  });
}
function setMode(m) {
  if (!m.live) {
    showLocked(m);
    return;
  }
  currentMode = m.id;
  document.getElementById("lockedView").classList.remove("show");
  document.querySelectorAll(".mode-chip").forEach((c, i) => c.classList.toggle("active", MODES[i].id === currentMode));

  const diagram = document.getElementById("diagram");
  const toolbar = document.querySelector(".canvas-toolbar");
  const hint = document.getElementById("diagramHint");
  const modeView = document.getElementById("modeView");

  if (m.id === "complete") {
    // architecture diagram
    diagram.style.display = "block";
    toolbar.style.display = "flex";
    hint.style.display = "";
    modeView.classList.remove("show");
  } else {
    // an interactive mode view
    diagram.style.display = "none";
    toolbar.style.display = "none";
    hint.style.display = "none";
    closePanel();
    modeView.classList.add("show");
    if (m.id === "batch") buildMode2();
    else if (m.id === "streaming") buildMode3();
  }
}
function showLocked(m) {
  const lv = document.getElementById("lockedView");
  const done = ["complete"];
  lv.querySelector(".big").textContent = "🚧";
  lv.querySelector("h3").textContent = `Mode ${m.n} — ${m.label}`;
  lv.querySelector("p").innerHTML = `This mode arrives in a later build iteration. <b>Iteration 1</b> ships the Complete Architecture mode; the roadmap below shows what's next.`;
  lv.querySelector(".rmap").innerHTML = MODES.map(x =>
    `<span class="${x.live ? "done" : ""}">${x.live ? "✓" : "○"} ${x.n}. ${x.label}</span>`).join("");
  lv.classList.add("show");
  // keep active chip visually on the locked one briefly
  document.querySelectorAll(".mode-chip").forEach((c, i) => c.classList.toggle("active", MODES[i].id === m.id));
}

/* ---------- Search (lightweight; full global search is Iteration 7) ---------- */
function doSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) return;
  const hit = Object.values(window.CONTENT).find(r =>
    r.title.toLowerCase().includes(q) || r.id.includes(q));
  if (hit) selectNode(hit.id);
}

/* ---------- Diagram interaction: pan / zoom / click ---------- */
function wireDiagram() {
  const svg = document.getElementById("diagram");

  // click nodes (delegated)
  svg.addEventListener("click", (e) => {
    const g = e.target.closest("[data-node]");
    if (g) { selectNode(g.dataset.node); }
  });

  // wheel zoom
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const pt = svgPoint(svg, e.clientX, e.clientY);
    zoom(e.deltaY < 0 ? 1.12 : 0.89, pt.x, pt.y);
  }, { passive: false });

  // drag pan
  let dragging = false, last = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-node]")) return;
    dragging = true; last = { x: e.clientX, y: e.clientY };
    svg.classList.add("panning"); svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    view.tx += e.clientX - last.x; view.ty += e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY }; applyTransform();
  });
  svg.addEventListener("pointerup", (e) => { dragging = false; svg.classList.remove("panning"); });
  svg.addEventListener("pointerleave", () => { dragging = false; svg.classList.remove("panning"); });

  // click empty space clears
  svg.addEventListener("dblclick", (e) => { if (!e.target.closest("[data-node]")) clearHighlight(); });
}
function svgPoint(svg, cx, cy) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const x = (cx - rect.left) / rect.width * vb.width;
  const y = (cy - rect.top) / rect.height * vb.height;
  return { x, y };
}

/* ---------- Boot ---------- */
function boot() {
  buildModeRail();
  buildDiagram();
  wireDiagram();

  document.getElementById("zoomIn").onclick = () => zoom(1.15);
  document.getElementById("zoomOut").onclick = () => zoom(0.87);
  document.getElementById("zoomReset").onclick = resetView;
  document.getElementById("fitBtn").onclick = fitView;
  document.getElementById("flowBtn").onclick = toggleFlow;
  document.getElementById("explainBtn").onclick = openWalkthrough;
  document.getElementById("panelClose").onclick = closePanel;
  document.getElementById("overlay").addEventListener("click", (e) => {
    if (e.target.id === "overlay") closeOverlay();
  });

  const search = document.getElementById("search");
  search.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(search.value); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeOverlay(); closePanel(); }
  });
}
document.addEventListener("DOMContentLoaded", boot);
