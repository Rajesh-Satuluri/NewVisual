/* ============================================================
   Mode views — Iterations 4–6 (Modes 4–10).
   Reuses subTabs(), openPanel(), the content spine.
   ============================================================ */

/* ============================================================
   MODE 4 — DATA LINEAGE
   ============================================================ */
function buildMode4() {
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 4 · Data Lineage</div>
      <h2 class="mv-title">Trace any Gold asset back to its source</h2>
    </div><span class="tag-pill tag-handbook">Handbook · Modules 1–8</span></div>
    <p class="mv-lead">Pick a Gold table to see its full upstream lineage. Click any node for its 9-layer breakdown.</p>
    <div class="toggle-row" id="lnPick"></div>
    <div id="lnChain"></div>`;
  const pick = view.querySelector("#lnPick");
  pick.innerHTML = window.LINEAGE.map((l, i) =>
    `<button class="tog ${i === 0 ? "active" : ""}" data-ln="${i}">${l.target}</button>`).join("");
  const draw = (idx) => {
    const l = window.LINEAGE[idx];
    document.getElementById("lnChain").innerHTML = `
      <div class="lineage">${l.chain.map((id, i) => {
        const r = window.CONTENT[id];
        return `<div class="lnode" data-open="${id}"><span class="lnicon">${r.icon}</span><span>${r.title}</span></div>${i < l.chain.length - 1 ? '<div class="lnarrow">→</div>' : ""}`;
      }).join("")}</div>
      <div class="mv-note">Lineage answers "where did this number come from?" — essential for debugging and impact analysis. Unity Catalog captures it automatically across the medallion layers.</div>`;
    document.querySelectorAll("#lnChain [data-open]").forEach(n => n.addEventListener("click", () => openPanel(n.dataset.open)));
  };
  draw(0);
  pick.querySelectorAll("[data-ln]").forEach(b => b.addEventListener("click", () => {
    pick.querySelectorAll(".tog").forEach(x => x.classList.remove("active")); b.classList.add("active"); draw(+b.dataset.ln);
  }));
}

/* ============================================================
   MODE 5 — TRACE A RECORD
   ============================================================ */
const TRACE_STAGES = [
  { node: "azuresql", label: "Azure SQL", what: "The play event is INSERTed into the stream_events table with updated_at = now.", form: "row: {user_id:U42, song_id:S003, ts:2026-08-26T08:40, device:mobile, duration:212}" },
  { node: "adf", label: "ADF Copy", what: "Next incremental run: updated_at > watermark selects this row; it's copied to Bronze.", form: "→ bronze/stream_events/dt=2026-08-26/part.parquet" },
  { node: "bronze", label: "ADLS Bronze", what: "Stored raw+immutable as Parquet, partitioned by ingestion date.", form: "Parquet row, unchanged from source" },
  { node: "databricks", label: "Auto Loader", what: "New file detected, recorded in checkpoint, loaded once into a Spark micro-batch.", form: "DataFrame row (exactly-once)" },
  { node: "silver", label: "Silver", what: "Typed, validated, deduplicated; metadata columns added.", form: "clean typed row: duration:int, ts:timestamp, _load_ts" },
  { node: "dlt", label: "DLT / Lakeflow", what: "Data-quality expectations checked; fact built, dims resolved via Auto CDC.", form: "joined to dim_users (SCD2 version valid at ts), dim_songs" },
  { node: "gold", label: "Gold fct_streams", what: "Lands as a fact row at grain = one play event, keyed to dimensions.", form: "fact: {user_key, song_key, play_ts, duration} " },
  { node: "consumers", label: "BI / Consumer", what: "Aggregated into 'streams per song per day' on a governed dashboard.", form: "S003 daily stream count += 1" }
];
function buildMode5() {
  const view = document.getElementById("modeView");
  let i = 0;
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 5 · Trace a Record</div>
      <h2 class="mv-title">Follow one Spotify stream event end-to-end</h2>
    </div><span class="tag-pill tag-handbook">Handbook · Modules 1–8</span></div>
    <p class="mv-lead">A single play event's journey through the whole platform. Advance to watch it transform at each stage.</p>
    <div class="trace-rec">🎧 <b>Sample event</b> — user U42 played song S003 (Levitating) on mobile for 212s at 08:40.</div>
    <div class="stepper-ctl"><button class="tbtn primary" id="trNext">Advance →</button><button class="tbtn" id="trReset">Reset</button></div>
    <div class="trace-flow" id="trFlow"></div>`;
  const render = () => {
    document.getElementById("trFlow").innerHTML = TRACE_STAGES.slice(0, i).map((s, k) => {
      const r = window.CONTENT[s.node];
      return `${k > 0 ? '<div class="lnarrow down">↓</div>' : ""}<div class="tstage ${k === i - 1 ? "active" : ""}" data-open="${s.node}">
        <div class="tsh"><span>${r.icon}</span> <b>${s.label}</b> <span class="tsopen">open →</span></div>
        <div class="tsw">${s.what}</div>
        <div class="tsf mono">${s.form}</div></div>`;
    }).join("");
    document.querySelectorAll("#trFlow [data-open]").forEach(n => n.addEventListener("click", () => openPanel(n.dataset.open)));
    document.getElementById("trNext").textContent = i >= TRACE_STAGES.length ? "Restart" : "Advance →";
  };
  document.getElementById("trNext").onclick = () => { i = i >= TRACE_STAGES.length ? 0 : i + 1; render(); };
  document.getElementById("trReset").onclick = () => { i = 0; render(); };
  i = 1; render();
}

/* ============================================================
   MODE 6 — FAILURE / DEBUGGING (+ incident simulator)
   ============================================================ */
const FAILURES = [
  { id: "sqldown", name: "Azure SQL unavailable", symptom: "ADF Copy fails with a connection/timeout error.",
    cause: "Source DB down, throttled, or network/firewall issue.", invest: "Check ADF Monitor error on CPY_SQL_TO_BRONZE; verify SQL availability/DTU; check firewall & Managed Identity.",
    recover: "Transient → retries/next scheduled run resumes from the unchanged watermark. Extended → fix SQL, then run.",
    impact: "None — watermark didn't advance, so no data lost or skipped.", prevent: "Retries with backoff, alerting, and monitoring source health.",
    interview: "What happens to the watermark when the source is down for 2 hours? (It doesn't move; the next run backfills the gap.)" },
  { id: "wmfail", name: "Watermark update fails after copy", symptom: "Copy succeeds; SCR_UPDATE_WATERMARK errors.",
    cause: "Transient SQL failure on the update step; the copy already committed.", invest: "Compare Bronze row counts vs source; check watermark_table value vs run timestamp.",
    recover: "Downstream MERGE/dedup absorbs the re-read window; or manually advance the watermark.",
    impact: "Duplicate rows in Bronze until dedup — no data loss.", prevent: "Idempotent writes keyed by business id; alert on the failure.",
    interview: "Why can duplicates occur even though the pipeline is 'idempotent'? (Idempotency is at the sink via MERGE, not the source.)" },
  { id: "schemadrift", name: "Schema drift / new column", symptom: "New column appears in source files.",
    cause: "Source schema evolved.", invest: "Auto Loader schema logs; check rescued-data column for unexpected fields.",
    recover: "Auto Loader evolves the schema (adds the column), possibly restarting the stream.", impact: "No loss; new data captured, rescued fields preserved.",
    prevent: "Schema evolution mode + contracts with source teams for breaking changes.",
    interview: "What happens when a new column appears mid-stream? (Schema evolves; stream may restart.)" },
  { id: "ckcorrupt", name: "Checkpoint corruption/loss", symptom: "Sudden reprocessing spike; duplicates downstream.",
    cause: "Checkpoint deleted or corrupted.", invest: "Check checkpoint path; compare processed volume to expected.",
    recover: "Idempotent MERGE converges reprocessing; worst case rebuild target from Bronze.", impact: "Duplicate risk absorbed by MERGE; possible reprocessing cost.",
    prevent: "Protect checkpoint storage; idempotent sink writes.",
    interview: "What if the checkpoint is deleted? (Reprocessing risk; MERGE is the safety net.)" },
  { id: "dqfail", name: "Data quality breach", symptom: "DLT expectation fails / drops rows.",
    cause: "NULL PK, duplicate, invalid type/value, or drift in incoming data.", invest: "DLT event log — which expectation fired, counts, and where.",
    recover: "warn logs, drop quarantines, fail halts — depends on the rule's mode.", impact: "Depends on mode; fail protects Gold at the cost of freshness.",
    prevent: "Right expectation mode per rule; upstream validation.",
    interview: "expect_or_drop vs expect_or_fail — when each? (Quarantine vs protect-at-all-costs.)" },
  { id: "ucperm", name: "Unity Catalog permission failure", symptom: "Job/user gets an authorization error.",
    cause: "Missing grant on a securable (catalog/schema/table).", invest: "Check Unity Catalog grants + audit log for the principal.",
    recover: "Grant least-privilege access to the specific object.", impact: "No data impact — access blocked, not corrupted.",
    prevent: "Least-privilege role design; review grants on onboarding.",
    interview: "How do you fix an access error safely? (Grant the specific needed privilege, never broaden blindly.)" }
];
function buildMode6() {
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 6 · Failure / Debugging</div>
      <h2 class="mv-title">Break the pipeline — then debug it</h2>
    </div><span class="tag-pill tag-handbook">Handbook · Modules 4, 9, 15</span></div>
    ${subTabs([{ id: "break", label: "🔧 Break Pipeline" }, { id: "incident", label: "🚨 Incident Simulator" }], mode6sub)}
    <div class="mv-body" id="mv6body"></div>`;
  view.querySelectorAll("[data-sub]").forEach(b => b.addEventListener("click", () => { mode6sub = b.dataset.sub; buildMode6(); }));
  (mode6sub === "break" ? m6Break : m6Incident)();
}
let mode6sub = "break";
function m6Break() {
  const body = document.getElementById("mv6body");
  body.innerHTML = `
    <p class="mv-lead">Pick a failure to run the debugging playbook: Symptom → Root Cause → Investigation → Recovery → Data Impact → Prevention → Interview.</p>
    <div class="fail-grid">${FAILURES.map(f => `<button class="failbtn" data-f="${f.id}">💥 ${f.name}</button>`).join("")}</div>
    <div id="failOut"></div>`;
  body.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => {
    body.querySelectorAll(".failbtn").forEach(x => x.classList.remove("active")); b.classList.add("active");
    const f = FAILURES.find(x => x.id === b.dataset.f);
    document.getElementById("failOut").innerHTML = `
      <div class="playbook">
        ${[["SYMPTOM", f.symptom, "warn"], ["ROOT CAUSE", f.cause, "bad"], ["INVESTIGATION", f.invest, ""], ["RECOVERY", f.recover, "ok"], ["DATA IMPACT", f.impact, ""], ["PREVENTION", f.prevent, "ok"]]
          .map(([h, d, c]) => `<div class="pbrow ${c}"><div class="pbh">${h}</div><div class="pbd">${d}</div></div>`).join("")}
        <div class="pbrow"><div class="pbh">INTERVIEW</div><div class="pbd">💬 ${f.interview}</div></div>
      </div>`;
  }));
}
function m6Incident() {
  const body = document.getElementById("mv6body");
  let revealed = false;
  body.innerHTML = `
    <p class="mv-lead">A production incident. Read the signals, form a hypothesis, then reveal the analysis.</p>
    <div class="incident">
      <b>Incident:</b> "ADF pipeline completed <span style="color:#5be48a">successfully</span> but copied <b>0 records</b>."
      <ul class="inc-signals">
        <li>Pipeline status: <b>Succeeded</b></li>
        <li>Watermark: 2026-08-26 07:00 · newest source updated_at: 2026-08-26 06:58</li>
        <li>Source: reachable · Run ID: 4f2a-...-91</li>
      </ul>
    </div>
    <div class="inc-q">What's the likely root cause?</div>
    <button class="tbtn primary" id="incReveal">Reveal analysis</button>
    <div id="incOut"></div>`;
  document.getElementById("incReveal").onclick = () => {
    if (revealed) return; revealed = true;
    document.getElementById("incOut").innerHTML = `
      <div class="playbook">
        <div class="pbrow ok"><div class="pbh">SIMPLE</div><div class="pbd">Nothing is broken — there simply were no new rows since the last run.</div></div>
        <div class="pbrow"><div class="pbh">ROOT CAUSE</div><div class="pbd">The watermark (07:00) is already at/ahead of the newest source updated_at (06:58), so the incremental predicate matched 0 rows.</div></div>
        <div class="pbrow"><div class="pbh">INVESTIGATION</div><div class="pbd">Compare watermark vs MAX(updated_at) in source; confirm source truly has no newer rows (not an updated_at bug).</div></div>
        <div class="pbrow ok"><div class="pbh">RESOLUTION</div><div class="pbd">No action if genuinely no new data. If source rows exist but updated_at wasn't bumped, that's a source-side CDC bug to fix.</div></div>
        <div class="pbrow"><div class="pbh">PREVENTION</div><div class="pbd">Alert on '0 rows for N consecutive runs' to catch a stuck source; guarantee updated_at is always bumped on write.</div></div>
        <div class="pbrow"><div class="pbh">INTERVIEW FOLLOW-UP</div><div class="pbd">💬 How would you tell "no new data" apart from "source updated_at broken"? (Compare row counts/timestamps directly in source.)</div></div>
      </div>`;
  };
}

/* ============================================================
   MODE 7 — ARCHITECTURE DECISION ENGINE
   ============================================================ */
function buildMode7() {
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 7 · Architecture Decisions</div>
      <h2 class="mv-title">Why this? Why not the alternatives?</h2>
    </div><span class="tag-pill tag-handbook">Handbook · Module 11 (ADRs)</span></div>
    <p class="mv-lead">Every major technology choice with its options, reasoning, trade-offs, and when the alternative wins.</p>
    <div class="decisions">${window.DECISIONS.map(d => `
      <details class="decision">
        <summary><span class="chev">▶</span> <b>${d.title}</b> → <span class="dchosen">${d.chosen}</span></summary>
        <div class="dbody">
          <div class="doptions">${d.options.map(o => `<span class="dopt ${o === d.chosen ? "win" : ""}">${o}</span>`).join("")}</div>
          <p><b>Problem:</b> ${d.problem}</p>
          <p><b>Technical reason:</b> ${d.techReason}</p>
          <p><b>Business reason:</b> ${d.bizReason}</p>
          <p><b>Trade-offs:</b> ${d.tradeoffs}</p>
          <p class="dwhen"><b>When the alternative wins:</b> ${d.whenAlt}</p>
        </div>
      </details>`).join("")}</div>`;
}

/* ============================================================
   MODE 8 — INTERVIEW MODE
   ============================================================ */
let mode8level = 0; // 0 = all
function buildMode8() {
  const view = document.getElementById("modeView");
  const levels = [0, 1, 2, 3, 4, 5, 6];
  const names = { 0: "All", 1: "L1 Definition", 2: "L2 Implementation", 3: "L3 Internals", 4: "L4 Architecture", 5: "L5 Production", 6: "L6 System Design" };
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 8 · Interview Mode</div>
      <h2 class="mv-title">Progressive questions — definition → system design</h2>
    </div><span class="tag-pill tag-handbook">Handbook · Modules 14, 16</span></div>
    <p class="mv-lead">Each question has a strong answer, a senior-level answer, common mistakes, and the interviewer's follow-ups.</p>
    <div class="toggle-row">${levels.map(l => `<button class="tog ${l === mode8level ? "active" : ""}" data-lvl="${l}">${names[l]}</button>`).join("")}</div>
    <div id="ivList"></div>`;
  const draw = () => {
    const items = window.INTERVIEW_BANK.filter(q => mode8level === 0 || q.level === mode8level);
    document.getElementById("ivList").innerHTML = items.map((q, i) => `
      <details class="iv">
        <summary><span class="chev">▶</span> <span class="ivlvl">L${q.level}</span> <span class="ivcomp">${q.comp}</span> ${q.q}</summary>
        <div class="ivbody">
          <p><b>Strong answer:</b> ${q.strong}</p>
          <p><b>Senior-level:</b> ${q.senior}</p>
          <p class="ivmiss"><b>Common mistakes:</b> ${q.mistakes}</p>
          <div class="ivfu"><b>Interviewer follow-ups →</b><ul>${q.followups.map(f => `<li>${f}</li>`).join("")}</ul></div>
        </div>
      </details>`).join("") || "<p class='mv-lead'>No questions at this level yet.</p>";
  };
  draw();
  view.querySelectorAll("[data-lvl]").forEach(b => b.addEventListener("click", () => {
    mode8level = +b.dataset.lvl; view.querySelectorAll(".tog").forEach(x => x.classList.remove("active")); b.classList.add("active"); draw();
  }));
}

/* ============================================================
   MODE 9 — WHITEBOARD DESIGN
   ============================================================ */
const WB_REFERENCE = ["azuresql", "adf", "bronze", "databricks", "silver", "dlt", "gold", "unity", "consumers"];
let wbPlaced = [];
function buildMode9() {
  wbPlaced = [];
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 9 · Whiteboard Design</div>
      <h2 class="mv-title">Design the Spotify DE platform, then compare</h2>
    </div><span class="tag-pill tag-general">General DE Context</span></div>
    <p class="mv-lead">Click components to place them on your board in the order you'd design them. Then compare to the reference architecture.</p>
    <div class="wb-palette">${WB_REFERENCE.map(id => `<button class="wbchip" data-wb="${id}">${window.CONTENT[id].icon} ${window.CONTENT[id].title}</button>`).join("")}</div>
    <div class="wb-board" id="wbBoard"><span class="wb-empty">Your board is empty — start placing components…</span></div>
    <div class="stepper-ctl"><button class="tbtn primary" id="wbCompare">Compare to reference →</button><button class="tbtn" id="wbClear">Clear</button></div>
    <div id="wbOut"></div>`;
  const renderBoard = () => {
    const b = document.getElementById("wbBoard");
    b.innerHTML = wbPlaced.length ? wbPlaced.map((id, i) =>
      `${i > 0 ? '<span class="wbarrow">→</span>' : ""}<span class="wbnode">${window.CONTENT[id].icon} ${window.CONTENT[id].title}</span>`).join("") : `<span class="wb-empty">Your board is empty…</span>`;
  };
  view.querySelectorAll("[data-wb]").forEach(c => c.addEventListener("click", () => {
    if (!wbPlaced.includes(c.dataset.wb)) { wbPlaced.push(c.dataset.wb); renderBoard(); }
  }));
  document.getElementById("wbClear").onclick = () => { wbPlaced = []; renderBoard(); document.getElementById("wbOut").innerHTML = ""; };
  document.getElementById("wbCompare").onclick = () => {
    const missing = WB_REFERENCE.filter(id => !wbPlaced.includes(id));
    const extra = wbPlaced.filter(id => !WB_REFERENCE.includes(id));
    const orderOk = wbPlaced.filter(id => WB_REFERENCE.includes(id)).join(",") ===
      WB_REFERENCE.filter(id => wbPlaced.includes(id)).join(",");
    document.getElementById("wbOut").innerHTML = `
      <div class="playbook">
        <div class="pbrow ok"><div class="pbh">CORRECT</div><div class="pbd">${wbPlaced.filter(id => WB_REFERENCE.includes(id)).map(id => window.CONTENT[id].title).join(", ") || "—"}</div></div>
        <div class="pbrow ${missing.length ? "bad" : "ok"}"><div class="pbh">MISSING</div><div class="pbd">${missing.map(id => window.CONTENT[id].title).join(", ") || "Nothing — full coverage! ✅"}</div></div>
        <div class="pbrow ${orderOk ? "ok" : "warn"}"><div class="pbh">ORDER</div><div class="pbd">${orderOk ? "Data-flow order matches the reference. ✅" : "Order differs from Bronze→Silver→Gold flow — review sequencing."}</div></div>
        <div class="pbrow"><div class="pbh">REFERENCE</div><div class="pbd mono">${WB_REFERENCE.map(id => window.CONTENT[id].title).join(" → ")}</div></div>
        <div class="pbrow"><div class="pbh">TECHNICALLY POSSIBLE vs CHOSEN</div><div class="pbd">Many designs work; this one was <b>chosen</b> for cost-efficient incremental batch + governance. Alternatives (continuous streaming, Synapse) are valid but different trade-offs.</div></div>
      </div>`;
  };
}

/* ============================================================
   MODE 10 — QUIZ
   ============================================================ */
let quizIdx = 0, quizScore = 0, quizAnswered = false;
function buildMode10() {
  quizIdx = 0; quizScore = 0; quizAnswered = false;
  const view = document.getElementById("modeView");
  view.innerHTML = `
    <div class="mv-head"><div>
      <div class="mv-kicker">Mode 10 · Quiz Mode</div>
      <h2 class="mv-title">Test yourself</h2>
    </div><span class="tag-pill tag-handbook">Handbook-grounded</span></div>
    <div id="quizCard"></div>`;
  renderQuiz();
}
function renderQuiz() {
  const card = document.getElementById("quizCard");
  if (quizIdx >= window.QUIZ.length) {
    if (typeof setQuizBest === "function") setQuizBest(quizScore);
    card.innerHTML = `<div class="quiz-done"><h3>Score: ${quizScore} / ${window.QUIZ.length}</h3>
      <p class="mv-lead">${quizScore === window.QUIZ.length ? "Perfect — interview-ready on these." : "Review the explanations for anything you missed."}</p>
      <button class="tbtn primary" id="qRestart">Restart quiz</button></div>`;
    document.getElementById("qRestart").onclick = buildMode10; return;
  }
  const q = window.QUIZ[quizIdx];
  quizAnswered = false;
  card.innerHTML = `
    <div class="quiz-progress">Question ${quizIdx + 1} / ${window.QUIZ.length} · <span class="qtype">${q.type}</span></div>
    <div class="quiz-q">${q.q}</div>
    <div class="quiz-opts">${q.options.map((o, i) => `<button class="qopt" data-i="${i}">${o}</button>`).join("")}</div>
    <div id="quizFb"></div>`;
  card.querySelectorAll(".qopt").forEach(b => b.addEventListener("click", () => {
    if (quizAnswered) return; quizAnswered = true;
    const chosen = +b.dataset.i, correct = q.answer;
    card.querySelectorAll(".qopt").forEach((x, i) => {
      x.classList.add(i === correct ? "right" : (i === chosen ? "wrong" : "muted"));
    });
    if (chosen === correct) quizScore++;
    document.getElementById("quizFb").innerHTML = `
      <div class="quiz-fb ${chosen === correct ? "ok" : "bad"}">
        <b>${chosen === correct ? "✅ Correct" : "❌ Not quite"}</b>
        <p>${q.explain}</p>
        <p class="qwrong"><b>Why the others are wrong:</b> ${q.wrong}</p>
        <button class="tbtn primary" id="qNext">${quizIdx === window.QUIZ.length - 1 ? "See score →" : "Next question →"}</button>
      </div>`;
    document.getElementById("qNext").onclick = () => { quizIdx++; renderQuiz(); };
  }));
}
