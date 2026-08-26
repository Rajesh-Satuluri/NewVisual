/* ============================================================
   Interactive Architecture Diagram (Iteration 1)
   Complete Architecture mode (Mode 1). SVG-based:
   zoom, pan, clickable nodes, upstream/downstream highlight,
   animated data-flow, WHY?/WHAT IF?, Explain Architecture.
   ============================================================ */

const SVGNS = "http://www.w3.org/2000/svg";

/* --- Graph definition (mirrors the handbook end-to-end flow) --- */
const NODE_W = 268, NODE_H = 78, COL_X = 300, GAP = 112, TOP = 40;

const ARCH_NODES = [
  { id: "azuresql",   accent: "#38bdf8" },
  { id: "adf",        accent: "#a78bfa" },
  { id: "bronze",     accent: "#d97706" },
  { id: "databricks", accent: "#ef4444" },
  { id: "silver",     accent: "#94a3b8" },
  { id: "dlt",        accent: "#22d3ee" },
  { id: "gold",       accent: "#eab308" },
  { id: "unity",      accent: "#1DB954", side: true },
  { id: "consumers",  accent: "#60a5fa" }
].map((n, i) => ({ ...n, x: COL_X, y: TOP + i * GAP }));

// place Unity Catalog to the right as a governance node between gold & consumers row
(() => {
  const unity = ARCH_NODES.find(n => n.id === "unity");
  const gold = ARCH_NODES.find(n => n.id === "gold");
  unity.x = COL_X + 330;
  unity.y = gold.y + GAP / 2;
})();

const ARCH_EDGES = [
  { from: "azuresql",   to: "adf",        label: "Incremental CDC / timestamp" },
  { from: "adf",        to: "bronze",     label: "Metadata-driven · watermark · ForEach×5" },
  { from: "bronze",     to: "databricks", label: "Auto Loader · checkpoint · schema evo" },
  { from: "databricks", to: "silver",     label: "Structured Streaming · availableNow" },
  { from: "silver",     to: "dlt",        label: "declarative input" },
  { from: "dlt",        to: "gold",       label: "Data Quality · Auto CDC · SCD" },
  { from: "gold",       to: "unity",      label: "govern" },
  { from: "gold",       to: "consumers",  label: "analytics" },
  { from: "unity",      to: "consumers",  label: "RBAC · lineage" },
  { from: "databricks", to: "unity",      label: "governed", soft: true }
];

const nodeById = id => ARCH_NODES.find(n => n.id === id);

/* --- View state --- */
let view = { scale: 0.9, tx: 60, ty: 70 };
let selected = null;
let flowOn = true;

/* --- Build SVG --- */
function buildDiagram() {
  const svg = document.getElementById("diagram");
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 900 1120");

  const defs = el("defs");
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#27384f"></path>
    </marker>
    <marker id="arrowHot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#1DB954"></path>
    </marker>`;
  svg.appendChild(defs);

  const vp = el("g", { id: "viewport" });
  svg.appendChild(vp);

  // Medallion band behind bronze/silver/gold
  const bronze = nodeById("bronze"), gold = nodeById("gold");
  const band = el("rect", {
    class: "layer-band", rx: 16,
    x: COL_X - 26, y: bronze.y - 16,
    width: NODE_W + 52, height: (gold.y + NODE_H) - (bronze.y) + 32
  });
  vp.appendChild(band);
  vp.appendChild(text(COL_X - 18, bronze.y - 24, "Medallion · Bronze → Silver → Gold", "layer-band-text"));

  // edges
  const edgeLayer = el("g", { id: "edges" });
  vp.appendChild(edgeLayer);
  ARCH_EDGES.forEach((e, i) => {
    const a = nodeById(e.from), b = nodeById(e.to);
    const path = edgePath(a, b);
    const p = el("path", { class: "edge" + (e.soft ? " dim" : ""), d: path, "marker-end": "url(#arrow)", "data-edge": i });
    p.dataset.from = e.from; p.dataset.to = e.to;
    edgeLayer.appendChild(p);
    if (e.label) {
      const mid = midpoint(a, b);
      edgeLayer.appendChild(text(mid.x, mid.y - 4, e.label, "edge-label", "middle"));
    }
  });

  // nodes
  const nodeLayer = el("g", { id: "nodes" });
  vp.appendChild(nodeLayer);
  ARCH_NODES.forEach(n => nodeLayer.appendChild(buildNode(n)));

  applyTransform();
  startFlow();
}

function buildNode(n) {
  const rec = window.CONTENT[n.id] || {};
  const g = el("g", { class: "node-box", transform: `translate(${n.x},${n.y})`, "data-node": n.id });
  g.appendChild(el("rect", { class: "nb-bg", rx: 14, width: NODE_W, height: NODE_H }));
  g.appendChild(el("rect", { class: "nb-accent", x: 0, y: 0, width: 5, height: NODE_H, rx: 3, fill: n.accent }));
  // icon
  const ic = text(20, NODE_H / 2 + 8, rec.icon || "▪", "nb-icon");
  g.appendChild(ic);
  // title + tech
  g.appendChild(text(52, 30, rec.title || n.id, "nb-title"));
  g.appendChild(text(52, 50, clip(rec.tech || "", 40), "nb-tech"));
  // tag dot
  const tagColor = { handbook: "#1DB954", general: "#3B82F6", hypo: "#F59E0B", unspec: "#64748b" }[rec.tag] || "#64748b";
  g.appendChild(el("circle", { cx: NODE_W - 16, cy: 16, r: 5, fill: tagColor }));
  return g;
}

/* --- geometry helpers --- */
function anchor(n, side) {
  // returns bottom-center / top-center / left / right
  if (side === "bottom") return { x: n.x + NODE_W / 2, y: n.y + NODE_H };
  if (side === "top")    return { x: n.x + NODE_W / 2, y: n.y };
  if (side === "left")   return { x: n.x, y: n.y + NODE_H / 2 };
  if (side === "right")  return { x: n.x + NODE_W, y: n.y + NODE_H / 2 };
}
function edgePath(a, b) {
  // side node (unity) connects horizontally; vertical chain otherwise
  if (b.side || a.side) {
    const s = a.side ? anchor(a, "left") : anchor(a, "right");
    const t = a.side ? anchor(b, "right") : anchor(b, "left");
    const mx = (s.x + t.x) / 2;
    return `M${s.x},${s.y} C${mx},${s.y} ${mx},${t.y} ${t.x},${t.y}`;
  }
  const s = anchor(a, "bottom"), t = anchor(b, "top");
  const my = (s.y + t.y) / 2;
  return `M${s.x},${s.y} C${s.x},${my} ${t.x},${my} ${t.x},${t.y}`;
}
function midpoint(a, b) {
  if (b.side || a.side) {
    const s = a.side ? anchor(a, "left") : anchor(a, "right");
    const t = a.side ? anchor(b, "right") : anchor(b, "left");
    return { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
  }
  const s = anchor(a, "bottom"), t = anchor(b, "top");
  return { x: (s.x + t.x) / 2 + 6, y: (s.y + t.y) / 2 };
}

/* --- SVG element factory --- */
function el(tag, attrs = {}) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function text(x, y, str, cls, anchorPos) {
  const t = el("text", { x, y, class: cls });
  if (anchorPos) t.setAttribute("text-anchor", anchorPos);
  t.textContent = str;
  return t;
}
function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/* --- transform / zoom / pan --- */
function applyTransform() {
  const vp = document.getElementById("viewport");
  if (vp) vp.setAttribute("transform", `translate(${view.tx},${view.ty}) scale(${view.scale})`);
}
function zoom(factor, cx = 450, cy = 400) {
  const ns = Math.min(2.4, Math.max(0.4, view.scale * factor));
  // zoom around point
  view.tx = cx - (cx - view.tx) * (ns / view.scale);
  view.ty = cy - (cy - view.ty) * (ns / view.scale);
  view.scale = ns;
  applyTransform();
}
function resetView() { view = { scale: 0.9, tx: 60, ty: 70 }; applyTransform(); }
function fitView() { view = { scale: 0.86, tx: 40, ty: 10 }; applyTransform(); }

/* --- flow animation (moving dots along edges) --- */
let flowTimer = null;
function startFlow() {
  stopFlow();
  if (!flowOn) return;
  const edgeLayer = document.getElementById("edges");
  ARCH_EDGES.forEach((e, i) => {
    if (e.soft) return;
    const a = nodeById(e.from), b = nodeById(e.to);
    const dot = el("circle", { r: 3.5, class: "flow-dot", "data-flow": i });
    const anim = el("animateMotion", { dur: "2.4s", repeatCount: "indefinite", path: edgePath(a, b), begin: `${(i % 3) * 0.5}s` });
    dot.appendChild(anim);
    edgeLayer.appendChild(dot);
  });
}
function stopFlow() {
  document.querySelectorAll("[data-flow]").forEach(d => d.remove());
}
function toggleFlow() {
  flowOn = !flowOn;
  flowOn ? startFlow() : stopFlow();
  const b = document.getElementById("flowBtn");
  if (b) b.innerHTML = flowOn ? "⏸ Pause flow" : "▶ Play flow";
}

/* --- highlight upstream / downstream --- */
function neighbours(dir) {
  // returns set of node ids reachable from selected in given direction
  const set = new Set();
  const walk = (id) => {
    ARCH_EDGES.forEach(e => {
      if (dir === "down" && e.from === id && !set.has(e.to)) { set.add(e.to); walk(e.to); }
      if (dir === "up" && e.to === id && !set.has(e.from)) { set.add(e.from); walk(e.from); }
    });
  };
  walk(selected);
  return set;
}
function highlightSelection() {
  const up = neighbours("up"), down = neighbours("down");
  const keep = new Set([selected, ...up, ...down]);
  document.querySelectorAll("[data-node]").forEach(g => {
    const id = g.dataset.node;
    g.classList.toggle("selected", id === selected);
    g.classList.toggle("dim", selected && !keep.has(id));
  });
  document.querySelectorAll(".edge").forEach(p => {
    const on = selected && keep.has(p.dataset.from) && keep.has(p.dataset.to);
    p.classList.toggle("hot", !!on);
    p.setAttribute("marker-end", on ? "url(#arrowHot)" : "url(#arrow)");
    p.classList.toggle("dim", selected && !on);
  });
}
function clearHighlight() {
  selected = null;
  document.querySelectorAll("[data-node]").forEach(g => g.classList.remove("selected", "dim"));
  document.querySelectorAll(".edge").forEach(p => { p.classList.remove("hot"); p.classList.toggle("dim", false); p.setAttribute("marker-end", "url(#arrow)"); });
  // restore soft edge dim
  ARCH_EDGES.forEach((e, i) => { if (e.soft) document.querySelector(`[data-edge="${i}"]`)?.classList.add("dim"); });
}
