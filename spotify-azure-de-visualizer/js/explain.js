/* ============================================================
   ExplanationBlock — the reusable 9-layer contract renderer
   (Iteration 0). Every panel in the app renders through this,
   so technical depth is structural, not optional.
   ============================================================ */

const LAYER_DEFS = [
  { key: "simple",         name: "Simple Explanation",  hint: "What is it?" },
  { key: "technical",      name: "Technical",           hint: "How it actually works" },
  { key: "internals",      name: "Internals",           hint: "Inside the technology" },
  { key: "implementation", name: "Project Implementation", hint: "How Spotify does it" },
  { key: "why",            name: "Why / Design",        hint: "Why chosen" },
  { key: "tradeoffs",      name: "Trade-offs",          hint: "Gained vs sacrificed" },
  { key: "failure",        name: "Failure / Recovery",  hint: "When it breaks" }
];

const TAG_META = {
  handbook: { cls: "tag-handbook", label: "Handbook-sourced" },
  general:  { cls: "tag-general",  label: "General DE Context" },
  hypo:     { cls: "tag-hypo",     label: "Architecture Evolution / Hypothetical" },
  unspec:   { cls: "tag-unspec",   label: "Not specified in the project handbook" }
};

function tagPill(tag) {
  const m = TAG_META[tag] || TAG_META.unspec;
  return `<span class="tag-pill ${m.cls}">${m.label}</span>`;
}

function sourceBadge(src) {
  if (!src) return "";
  return `<div class="src-badge">📘 Source: ${HB_SHORT}
            <span class="mod">· ${escapeHtml(src.module)}</span>
            ${src.section ? `· ${escapeHtml(src.section)}` : ""}
          </div>`;
}
const HB_SHORT = "Spotify Azure DE Handbook";

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* Render the interview layer (Q/A pairs) */
function renderInterview(rec) {
  const iv = rec.layers.interview || [];
  const fu = rec.layers.followup || [];
  let html = "";
  iv.forEach(p => {
    html += `<div class="qa"><div class="q">Q: ${p.q}</div><div>${p.a}</div></div>`;
  });
  if (fu.length) {
    html += `<div class="callout"><strong>Interviewer follow-ups →</strong><ul>` +
      fu.map(f => `<li>${f}</li>`).join("") + `</ul></div>`;
  }
  return html || "<p>No interview material yet.</p>";
}

/* Build one <details> layer */
function layerEl(num, name, hint, bodyHtml) {
  if (!bodyHtml) return "";
  const open = num <= 2 ? "open" : "";
  return `<details class="xlayer" ${open}>
    <summary>
      <span class="chev">▶</span>
      <span class="xnum">${num}</span>
      <span class="xname">${name}</span>
      <span class="xhint">${hint}</span>
    </summary>
    <div class="xbody">${bodyHtml}</div>
  </details>`;
}

/* Main entry: render a full record into the side panel */
function renderExplanation(recId, opts = {}) {
  const rec = window.CONTENT[recId];
  if (!rec) {
    return `<div class="xbody"><p>${tagPill("unspec")}</p><p>No content record found for “${escapeHtml(recId)}”.</p></div>`;
  }

  let html = "";

  // tags + source
  html += `<div>${tagPill(rec.tag)}</div>`;
  html += sourceBadge(rec.source);

  // quick action buttons (WHY / WHAT IF)
  html += `<div class="qbtns">
    <div class="qbtn why" data-jump="why">🔵 WHY this?</div>
    <div class="qbtn whatif" data-whatif="${rec.id}">🟠 WHAT IF…?</div>
  </div>`;

  html += `<span class="expand-all" data-expand="all">Expand all layers ▾</span>`;

  // the 7 descriptive layers
  LAYER_DEFS.forEach((def, i) => {
    html += layerEl(i + 1, def.name, def.hint, rec.layers[def.key]);
  });

  // layer 8+9: interview + follow-up
  html += layerEl(8, "Interview", "Questions + follow-ups", renderInterview(rec));

  // related cross-links (Iteration 7 makes these global; wired here already)
  if (rec.related && rec.related.length) {
    html += `<div class="related"><h4>Related concepts</h4>` +
      rec.related.map(r => {
        const t = window.CONTENT[r];
        return t ? `<span class="chip" data-goto="${r}">${t.icon} ${t.title}</span>` : "";
      }).join("") + `</div>`;
  }

  return html;
}

/* WHAT-IF modal content builder */
function renderWhatIf(recId) {
  const rec = window.CONTENT[recId];
  if (!rec || !rec.whatif || !rec.whatif.length)
    return "<p>No What-If scenarios recorded for this component yet.</p>";
  return rec.whatif.map(w =>
    `<div class="qa"><div class="q">${w.q}</div><div>${w.a}</div></div>`
  ).join("");
}
