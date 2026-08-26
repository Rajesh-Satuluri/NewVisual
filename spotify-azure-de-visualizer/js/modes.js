/* ============================================================
   Mode views — Iteration 2 (Batch / Incremental) and
   Iteration 3 (Streaming / Micro-Batch & Internals).
   Each mode renders interactive widgets into #modeView.
   Concept deep-dives reuse openPanel() + the 9-layer contract.
   ============================================================ */

/* ---- sub-tab helper ---- */
function subTabs(tabs, activeId) {
  return `<div class="subtabs">` + tabs.map(t =>
    `<button class="subtab ${t.id === activeId ? "active" : ""}" data-sub="${t.id}">${t.label}</button>`
  ).join("") + `</div>`;
}

/* ============================================================
   MODE 2 — BATCH / INCREMENTAL
   ============================================================ */
const MODE2_SUBS = [
  { id: "pipeline", label: "① ADF Pipeline" },
  { id: "runs",     label: "② First vs Subsequent Run" },
  { id: "wm",       label: "③ Watermark Simulator" },
  { id: "wmfail",   label: "④ Watermark Failure" },
  { id: "backfill", label: "⑤ Backfill Simulator" }
];
let mode2sub = "pipeline";

function buildMode2() {
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head">
      <div>
        <div class="mv-kicker">Mode 2 · Batch / Incremental Flow</div>
        <h2 class="mv-title">Azure SQL → ADF → ADLS Bronze</h2>
      </div>
      <span class="tag-pill tag-handbook">Handbook · Module 3</span>
    </div>
    ${subTabs(MODE2_SUBS, mode2sub)}
    <div class="mv-body" id="mv2body"></div>`;
  view.querySelectorAll("[data-sub]").forEach(b =>
    b.addEventListener("click", () => { mode2sub = b.dataset.sub; buildMode2(); }));
  ({ pipeline: m2Pipeline, runs: m2Runs, wm: m2Watermark, wmfail: m2WmFail, backfill: m2Backfill }[mode2sub])();
}

function m2Pipeline() {
  const steps = [
    { id: "act_lookup",   n: "1", t: "Lookup",  s: "LKP_GET_TABLE_METADATA" },
    { id: "act_foreach",  n: "2", t: "ForEach", s: "FE_PROCESS_ALL_TABLES · batch 5" },
    { id: "act_scriptTs", n: "3", t: "Script",  s: "SCR_GET_CURRENT_TIMESTAMP" },
    { id: "act_copy",     n: "4", t: "Copy",    s: "CPY_SQL_TO_BRONZE" },
    { id: "act_scriptWm", n: "5", t: "Script",  s: "SCR_UPDATE_WATERMARK" }
  ];
  const body = document.getElementById("mv2body");
  body.innerHTML = `
    <p class="mv-lead">The one metadata-driven pipeline <b>PL_SPOTIFY_INCREMENTAL_LOAD</b>. Click any activity for its full 9-layer breakdown.</p>
    <div class="pipeline">
      ${steps.map((s, i) => `
        <div class="pstep" data-open="${s.id}">
          <div class="pnum">${s.n}</div>
          <div class="pmeta"><div class="pt">${s.t}</div><div class="ps">${s.s}</div></div>
        </div>
        ${i < steps.length - 1 ? `<div class="parrow">↓</div>` : ""}`).join("")}
      <div class="parrow branch">⇢ on failure</div>
      <div class="pstep fail" data-open="act_web">
        <div class="pnum">!</div>
        <div class="pmeta"><div class="pt">Web Activity</div><div class="ps">WEB_TRIGGER_LOGIC_APP → alert</div></div>
      </div>
    </div>
    <div class="mv-note">💡 Steps 3–5 run <b>inside</b> the ForEach, once per table. The timestamp (3) is captured <b>before</b> the copy (4); the watermark advances (5) only if the copy succeeds.</div>`;
  body.querySelectorAll("[data-open]").forEach(el =>
    el.addEventListener("click", () => openPanel(el.dataset.open)));
}

function m2Runs() {
  const body = document.getElementById("mv2body");
  body.innerHTML = `
    <p class="mv-lead">The same pipeline behaves differently on the very first load vs every run after. Toggle to compare.</p>
    <div class="toggle-row">
      <button class="tog active" data-run="first">First Run (initial load)</button>
      <button class="tog" data-run="sub">Subsequent Run (incremental)</button>
    </div>
    <div id="runflow"></div>`;
  const draw = (mode) => {
    const first = mode === "first";
    document.getElementById("runflow").innerHTML = `
      <div class="flowcol">
        ${(first
          ? ["Historical data in Azure SQL", "Initial watermark = very old date (e.g. 1900-01-01)", "Extraction reads ALL rows (updated_at > 1900-01-01)", "Full historical load → Bronze", "Watermark set to run timestamp"]
          : ["Read last successful watermark", "Query only rows where updated_at > last watermark", "Small delta of new/changed rows", "Append → Bronze", "Advance watermark to new run timestamp"]
        ).map((s, i, a) => `<div class="fbox ${i === a.length - 1 ? "ok" : ""}">${s}</div>${i < a.length - 1 ? '<div class="parrow">↓</div>' : ""}`).join("")}
      </div>
      <div class="mv-note">${first
        ? "<b>First run</b> seeds history: the watermark starts at a floor date so everything qualifies — this <i>is</i> the historical backfill."
        : "<b>Subsequent runs</b> are tiny and cheap: only the changed slice moves, thanks to the stored watermark."}</div>`;
  };
  draw("first");
  body.querySelectorAll("[data-run]").forEach(b => b.addEventListener("click", () => {
    body.querySelectorAll(".tog").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); draw(b.dataset.run);
  }));
  addConceptLink(body, "watermark");
}

/* ---- ③ Watermark Simulator (live compute) ---- */
const WM_RECORDS = [
  { id: "S001", name: "Blinding Lights", ts: "2026-08-20T09:15" },
  { id: "S002", name: "As It Was",       ts: "2026-08-24T14:02" },
  { id: "S003", name: "Levitating",      ts: "2026-08-25T23:40" },
  { id: "S004", name: "Anti-Hero",       ts: "2026-08-26T06:10" },
  { id: "S005", name: "Flowers",         ts: "2026-08-26T08:55" }
];
function m2Watermark() {
  const body = document.getElementById("mv2body");
  body.innerHTML = `
    <p class="mv-lead">Change the boundaries and the editable <code>updated_at</code> values — see exactly which rows the incremental query selects. Rule: <code>last_watermark &lt; updated_at ≤ current_ts</code>.</p>
    <div class="wm-controls">
      <label>Last watermark<input type="datetime-local" id="wmLast" value="2026-08-24T00:00"></label>
      <label>Current timestamp (upper bound)<input type="datetime-local" id="wmNow" value="2026-08-26T07:00"></label>
    </div>
    <table class="wm-table"><thead><tr><th>song_id</th><th>title</th><th>updated_at (editable)</th><th>selected?</th></tr></thead>
      <tbody id="wmRows"></tbody></table>
    <div class="wm-result" id="wmResult"></div>
    <div class="mv-note">Only selected rows are copied to Bronze. If ≥1 row is selected and the run succeeds, the new watermark becomes the <b>current timestamp</b> (upper bound) — never a row's own value, which is why an upper bound is needed.</div>`;
  const rows = document.getElementById("wmRows");
  rows.innerHTML = WM_RECORDS.map(r =>
    `<tr data-id="${r.id}"><td class="mono">${r.id}</td><td>${r.name}</td>
      <td><input type="datetime-local" class="wmTs" data-id="${r.id}" value="${r.ts}"></td>
      <td class="sel"></td></tr>`).join("");
  const recompute = () => {
    const last = new Date(document.getElementById("wmLast").value).getTime();
    const now = new Date(document.getElementById("wmNow").value).getTime();
    let n = 0;
    WM_RECORDS.forEach(r => {
      const t = new Date(document.querySelector(`.wmTs[data-id="${r.id}"]`).value).getTime();
      const sel = t > last && t <= now;
      if (sel) n++;
      const tr = rows.querySelector(`tr[data-id="${r.id}"]`);
      tr.classList.toggle("hot", sel);
      tr.querySelector(".sel").innerHTML = sel ? "✅ yes" : "—";
    });
    document.getElementById("wmResult").innerHTML =
      `<b>${n}</b> of ${WM_RECORDS.length} rows selected → copied to Bronze. ` +
      (n ? `On success, new watermark = <span class="k">${document.getElementById("wmNow").value.replace("T", " ")}</span>.` : `Nothing to load; watermark unchanged.`);
  };
  body.querySelectorAll("input").forEach(i => i.addEventListener("input", recompute));
  recompute();
  addConceptLink(body, "watermark");
}

/* ---- ④ Watermark Failure Simulator ---- */
function m2WmFail() {
  const body = document.getElementById("mv2body");
  const steps = [
    { t: "Run 1 · Copy succeeds", d: "5 changed rows copied to Bronze ✅", cls: "ok" },
    { t: "Run 1 · Watermark UPDATE fails", d: "SCR_UPDATE_WATERMARK errors (transient SQL issue). Old watermark stays put.", cls: "bad" },
    { t: "On-Failure alert fires", d: "Web Activity → Logic App → engineer notified with Run ID.", cls: "warn" },
    { t: "Run 2 · reads OLD watermark", d: "Same window is queried again → the same 5 rows are re-extracted.", cls: "warn" },
    { t: "Duplicates land in Bronze", d: "Bronze now holds those 5 rows twice.", cls: "bad" },
    { t: "Recovery", d: "Downstream MERGE / dedup on business key absorbs the duplicates; or manually advance the watermark. Prevention: idempotent writes keyed by business id.", cls: "ok" }
  ];
  let shown = 0;
  body.innerHTML = `
    <p class="mv-lead">The classic correctness bug: the copy commits but the watermark update doesn't. Step through it.</p>
    <div class="stepper" id="wf"></div>
    <div class="stepper-ctl"><button class="tbtn primary" id="wfNext">Next step →</button><button class="tbtn" id="wfReset">Reset</button></div>`;
  const render = () => {
    document.getElementById("wf").innerHTML = steps.slice(0, shown).map((s, i) =>
      `<div class="sstep ${s.cls}"><div class="sn">${i + 1}</div><div><b>${s.t}</b><div class="sd">${s.d}</div></div></div>`).join("");
    document.getElementById("wfNext").textContent = shown >= steps.length ? "Done" : "Next step →";
  };
  document.getElementById("wfNext").onclick = () => { if (shown < steps.length) { shown++; render(); } };
  document.getElementById("wfReset").onclick = () => { shown = 0; render(); };
  shown = 1; render();
  addConceptLink(body, "watermark");
}

/* ---- ⑤ Backfill Simulator ---- */
function m2Backfill() {
  const body = document.getElementById("mv2body");
  body.innerHTML = `
    <p class="mv-lead">Backfill re-loads a historical window on demand — for a new table, a fix, or recovering lost Bronze data.</p>
    <div class="wm-controls">
      <label>Table<select id="bfTable"><option>Songs</option><option>Users</option><option>Stream Events</option></select></label>
      <label>Start date<input type="date" id="bfStart" value="2026-01-01"></label>
      <label>End date<input type="date" id="bfEnd" value="2026-03-31"></label>
      <label>Mode<select id="bfMode"><option>Full load</option><option>Incremental (bounded)</option></select></label>
    </div>
    <button class="tbtn primary" id="bfRun">Run backfill →</button>
    <div id="bfOut"></div>`;
  document.getElementById("bfRun").onclick = () => {
    const t = document.getElementById("bfTable").value, s = document.getElementById("bfStart").value,
      e = document.getElementById("bfEnd").value, m = document.getElementById("bfMode").value;
    const full = m.startsWith("Full");
    document.getElementById("bfOut").innerHTML = `
      <div class="flowcol">
        <div class="fbox">Source: ${t} WHERE updated_at BETWEEN ${s} AND ${e}</div><div class="parrow">↓</div>
        <div class="fbox">ADF Copy (parameterized ${full ? "full-window" : "incremental"} run)</div><div class="parrow">↓</div>
        <div class="fbox">Bronze: dt-partitioned Parquet for the window</div><div class="parrow">↓</div>
        <div class="fbox ok">Downstream Auto Loader picks up new files</div>
      </div>
      <div class="mv-note">
        <b>Watermark impact:</b> ${full
          ? "a full backfill typically runs on a separate/parameterized path and does <b>not</b> move the live watermark, so normal incremental runs continue uninterrupted."
          : "a bounded incremental backfill may temporarily rewind the watermark to the start date; restore it afterward."}<br>
        <b>Duplicate risk:</b> re-loading a window that Bronze already has creates duplicate rows → rely on downstream MERGE/dedup by business key.<br>
        <b>Recovery use:</b> this is how you rebuild Bronze if raw files are lost (as long as the source still retains the data).
      </div>`;
  };
  addConceptLink(body, "adf");
}

/* ============================================================
   MODE 3 — STREAMING / MICRO-BATCH & INTERNALS
   ============================================================ */
const MODE3_SUBS = [
  { id: "autoloader", label: "① Auto Loader" },
  { id: "checkpoint", label: "② Checkpoint Internals" },
  { id: "microbatch", label: "③ Micro-Batch Timeline" },
  { id: "delta",      label: "④ Delta Internals" },
  { id: "vs",         label: "⑤ Batch vs Real-Time" }
];
let mode3sub = "autoloader";

function buildMode3() {
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head">
      <div>
        <div class="mv-kicker">Mode 3 · Streaming / Micro-Batch Flow</div>
        <h2 class="mv-title">Bronze → Auto Loader → Structured Streaming → Delta</h2>
      </div>
      <span class="tag-pill tag-handbook">Handbook · Module 5</span>
    </div>
    ${subTabs(MODE3_SUBS, mode3sub)}
    <div class="mv-body" id="mv3body"></div>`;
  view.querySelectorAll("[data-sub]").forEach(b =>
    b.addEventListener("click", () => { mode3sub = b.dataset.sub; buildMode3(); }));
  ({ autoloader: m3AutoLoader, checkpoint: m3Checkpoint, microbatch: m3Micro, delta: m3Delta, vs: m3Vs }[mode3sub])();
}

function m3AutoLoader() {
  const body = document.getElementById("mv3body");
  const stages = [
    ["📄 New file lands in Bronze", "A new dated Parquet file appears in the Bronze container."],
    ["👁 File detection", "cloudFiles lists the directory (or gets a file-notification) and finds files not seen before."],
    ["📍 Checkpoint records it", "The processed-file id is written to the checkpoint sources/ state — it won't be read again."],
    ["🧬 Schema inference / evolution", "Columns inferred; new columns evolve the tracked schema instead of failing."],
    ["🔥 Spark DataFrame", "Rows become a micro-batch DataFrame for transformation."],
    ["🔺 Write to Delta (Silver)", "Committed to a Delta table; offsets/commits recorded — exactly-once."]
  ];
  let i = 0;
  body.innerHTML = `
    <p class="mv-lead">How <b>only new files</b> flow through Auto Loader (<code>cloudFiles</code>), never re-reading old ones.</p>
    <div class="al-flow" id="alFlow"></div>
    <div class="stepper-ctl"><button class="tbtn primary" id="alNext">Advance →</button><button class="tbtn" id="alReset">Reset</button>
      <button class="tbtn" data-open="autoloader">Open full breakdown</button></div>`;
  const render = () => {
    document.getElementById("alFlow").innerHTML = stages.map((s, k) =>
      `<div class="alnode ${k < i ? "done" : ""} ${k === i - 1 ? "active" : ""}">
        <div class="alt">${s[0]}</div><div class="ald">${s[1]}</div></div>
      ${k < stages.length - 1 ? '<div class="parrow">↓</div>' : ""}`).join("");
    document.getElementById("alNext").textContent = i >= stages.length ? "Restart" : "Advance →";
  };
  document.getElementById("alNext").onclick = () => { i = i >= stages.length ? 0 : i + 1; render(); };
  document.getElementById("alReset").onclick = () => { i = 0; render(); };
  body.querySelector("[data-open]").onclick = () => openPanel("autoloader");
  i = 1; render();
}

function m3Checkpoint() {
  const body = document.getElementById("mv3body");
  const parts = {
    "offsets/": "Structured Streaming's <b>planned progress</b> per micro-batch — the offset range it intends to process.",
    "commits/": "Which micro-batches <b>actually finished</b>. On restart, the last commit is the resume point.",
    "sources/": "Auto Loader's <b>processed-file state</b> — the memory of which files are already ingested.",
    "schema/":  "The <b>tracked/evolved schema</b> so new columns are handled consistently across restarts."
  };
  body.innerHTML = `
    <p class="mv-lead">The checkpoint is the streaming job's memory. Click a folder to see what it stores.</p>
    <div class="ck-wrap">
      <div class="ck-tree">
        <div class="ckroot">checkpoint/</div>
        ${Object.keys(parts).map(k => `<div class="cknode" data-ck="${k}">${k}</div>`).join("")}
      </div>
      <div class="ck-detail" id="ckDetail">Select a folder…</div>
    </div>
    <div class="mv-note"><b>Lose the checkpoint →</b> the job forgets what it processed and may reprocess everything (duplicates). Idempotent Delta MERGE writes are the safety net. <span class="chip" data-open="checkpoint" style="cursor:pointer">Open full 9-layer breakdown →</span></div>`;
  body.querySelectorAll("[data-ck]").forEach(n => n.addEventListener("click", () => {
    body.querySelectorAll(".cknode").forEach(x => x.classList.remove("active"));
    n.classList.add("active");
    document.getElementById("ckDetail").innerHTML = `<b>${n.dataset.ck}</b><p>${parts[n.dataset.ck]}</p>`;
  }));
  body.querySelector("[data-open]").addEventListener("click", () => openPanel("checkpoint"));
}

function m3Micro() {
  const body = document.getElementById("mv3body");
  body.innerHTML = `
    <p class="mv-lead">Pick a trigger and see the execution profile. The project uses <b>availableNow=True</b>.</p>
    <div class="toggle-row">
      <button class="tog active" data-trig="an">availableNow=True</button>
      <button class="tog" data-trig="pt">processingTime="1 minute"</button>
      <button class="tog" data-trig="cont">Continuous</button>
    </div>
    <div id="trigOut"></div>`;
  const data = {
    an: { badge: "tag-handbook", tag: "Project choice", timeline: 3, ongoing: false,
      lines: ["Spins up compute", "Processes ALL currently available files as micro-batches", "Commits + checkpoints", "Cluster can terminate ✅"],
      note: "<b>Incremental batch</b>, not real-time. Lowest cost; freshness bounded by the job schedule. This is what the Spotify project runs." },
    pt: { badge: "tag-general", tag: "General DE", timeline: 6, ongoing: true,
      lines: ["Long-running cluster", "A micro-batch every 1 minute, continuously", "Each commits + checkpoints", "Never terminates on its own"],
      note: "Continuous micro-batches → ~1-minute latency, but you pay for an always-on cluster." },
    cont: { badge: "tag-hypo", tag: "Architecture Evolution / Hypothetical", timeline: 9, ongoing: true,
      lines: ["Long-running cluster", "Record-at-a-time continuous processing", "Sub-second latency", "Highest operational complexity"],
      note: "A <b>different architecture</b> — not what this project uses. Label it Architecture Evolution / Hypothetical." }
  };
  const draw = (k) => {
    const d = data[k];
    document.getElementById("trigOut").innerHTML = `
      <div><span class="tag-pill ${d.badge}">${d.tag}</span></div>
      <div class="mb-timeline">${Array.from({ length: d.timeline }, (_, i) =>
        `<div class="mb-batch" style="animation-delay:${i * 0.12}s">B${i + 1}</div>`).join("")}${d.ongoing ? '<div class="mb-cont">→ …</div>' : '<div class="mb-stop">⏹ stop</div>'}</div>
      <ul class="mb-lines">${d.lines.map(l => `<li>${l}</li>`).join("")}</ul>
      <div class="mv-note">${d.note} <span class="chip" data-open="streaming" style="cursor:pointer">Open full breakdown →</span></div>`;
    document.querySelector("[data-open]").onclick = () => openPanel("streaming");
  };
  draw("an");
  body.querySelectorAll("[data-trig]").forEach(b => b.addEventListener("click", () => {
    body.querySelectorAll(".tog").forEach(x => x.classList.remove("active")); b.classList.add("active"); draw(b.dataset.trig);
  }));
}

function m3Delta() {
  const body = document.getElementById("mv3body");
  let version = 0, files = ["part-0001.parquet"], log = [{ v: 0, action: "add part-0001.parquet", op: "initial" }];
  body.innerHTML = `
    <p class="mv-lead">A Delta table = Parquet files + a <code>_delta_log</code>. Run operations and watch add/remove file actions accumulate.</p>
    <div class="toggle-row">
      <button class="tog" data-op="INSERT">INSERT</button>
      <button class="tog" data-op="UPDATE">UPDATE</button>
      <button class="tog" data-op="DELETE">DELETE</button>
      <button class="tog" data-op="MERGE">MERGE (upsert)</button>
      <button class="tbtn" id="dtReset">Reset</button>
    </div>
    <div class="delta-wrap">
      <div class="delta-col"><h4>Data files</h4><div id="dtFiles"></div></div>
      <div class="delta-col"><h4>_delta_log (commits)</h4><div id="dtLog"></div></div>
    </div>
    <div class="mv-note">Each operation is an <b>atomic commit</b> adding new files and removing superseded ones — readers replay the log to get the current snapshot, and any version is <b>time-travelable</b>. <span class="chip" data-open="delta" style="cursor:pointer">Open full breakdown →</span></div>`;
  let counter = 1;
  const render = () => {
    document.getElementById("dtFiles").innerHTML = files.map(f => `<div class="dfile">📄 ${f}</div>`).join("") || "<i>(no files)</i>";
    document.getElementById("dtLog").innerHTML = log.map(l =>
      `<div class="dcommit"><span class="dv">v${l.v}</span> <span class="dop">${l.op}</span><div class="dact">${l.action}</div></div>`).join("");
  };
  const apply = (op) => {
    version++;
    if (op === "INSERT") { const f = `part-000${++counter}.parquet`; files.push(f); log.push({ v: version, op, action: `add ${f}` }); }
    else if (op === "UPDATE") { const old = files[0]; const f = `part-000${++counter}.parquet`; files = files.filter(x => x !== old).concat(f); log.push({ v: version, op, action: `remove ${old}; add ${f} (rewritten rows)` }); }
    else if (op === "DELETE") { const old = files[files.length - 1]; if (files.length) { files = files.slice(0, -1); const f = `part-000${++counter}.parquet`; files.push(f); log.push({ v: version, op, action: `remove ${old}; add ${f} (surviving rows)` }); } }
    else if (op === "MERGE") { const f = `part-000${++counter}.parquet`; files.push(f); log.push({ v: version, op, action: `add ${f} (matched→update, unmatched→insert)` }); }
    render();
  };
  body.querySelectorAll("[data-op]").forEach(b => b.addEventListener("click", () => apply(b.dataset.op)));
  document.getElementById("dtReset").onclick = () => { version = 0; counter = 1; files = ["part-0001.parquet"]; log = [{ v: 0, op: "initial", action: "add part-0001.parquet" }]; render(); };
  body.querySelector("[data-open]").onclick = () => openPanel("delta");
  render();
}

function m3Vs() {
  const body = document.getElementById("mv3body");
  const spectrum = [
    ["Batch", "Whole dataset periodically", "hours+"],
    ["Incremental Batch", "Only changed data, scheduled — <b>this project's ADF load</b>", "schedule"],
    ["Micro-Batch (availableNow)", "Drain available files then stop — <b>this project's Auto Loader</b>", "schedule"],
    ["Near-Real-Time (processingTime)", "Continuous small batches", "~1 min"],
    ["Continuous Streaming", "Record-at-a-time", "sub-second"]
  ];
  body.innerHTML = `
    <p class="mv-lead">“Structured Streaming” does <b>not</b> automatically mean real-time. Here's the actual spectrum and where this project sits.</p>
    <div class="spectrum">${spectrum.map((s, i) =>
      `<div class="spx ${i === 1 || i === 2 ? "here" : ""}"><div class="spxt">${s[0]}</div><div class="spxd">${s[1]}</div><div class="spxl">latency: ${s[2]}</div>${i === 1 || i === 2 ? '<div class="spxbadge">← current project</div>' : ''}</div>`).join("")}</div>
    <div class="vs-two">
      <div class="vs-card"><div class="tag-pill tag-handbook">Current project</div>
        <div class="vs-flow">ADF → ADLS → Auto Loader → <b>availableNow</b> → Delta</div>
        <p>Incremental batch. Compute terminates. Cost-efficient; freshness bounded by schedule.</p></div>
      <div class="vs-card"><div class="tag-pill tag-hypo">Architecture Evolution / Hypothetical</div>
        <div class="vs-flow">Event-driven detection → Auto Loader → <b>processingTime</b> → long-running cluster → Delta</div>
        <p>Near-real-time. Continuous compute cost. Not what this project uses — a deliberate future option.</p></div>
    </div>`;
}

/* ---- shared helper: a "dig deeper" concept chip ---- */
function addConceptLink(container, recId) {
  const rec = window.CONTENT[recId];
  if (!rec) return;
  const div = document.createElement("div");
  div.className = "concept-link";
  div.innerHTML = `<span class="chip" data-open="${recId}">${rec.icon} Full 9-layer breakdown: ${rec.title} →</span>`;
  div.querySelector(".chip").addEventListener("click", () => openPanel(recId));
  container.appendChild(div);
}
