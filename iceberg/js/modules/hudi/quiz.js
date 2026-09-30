/* Apache Hudi — Quiz Mode (multiple choice, graded). Hudi bucket. */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('hqz-styles')) return;
    const s = document.createElement('style');
    s.id = 'hqz-styles';
    s.textContent = `
.hqz-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.hqz-header { padding:14px 24px; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.hqz-header-title { font-size:16px; font-weight:700; color:var(--text-primary); }
.hqz-header-meta { font-size:12px; color:var(--text-muted); }
.hqz-progress-bar { height:4px; background:var(--bg-3); flex-shrink:0; }
.hqz-progress-fill { height:100%; background:var(--brand); transition:width .3s ease; border-radius:0 2px 2px 0; }
.hqz-body { flex:1; overflow-y:auto; padding:24px; display:flex; justify-content:center; }
.hqz-card { width:100%; max-width:720px; }
.hqz-q-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.hqz-q-num { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; }
.hqz-q-score-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:4px; }
.hqz-q-score-badge.correct { background:var(--green-subtle); color:var(--green); }
.hqz-q-score-badge.incorrect { background:var(--red-subtle); color:var(--red); }
.hqz-q-text { font-size:16px; font-weight:600; color:var(--text-primary); line-height:1.45; margin-bottom:20px; }
.hqz-options { display:flex; flex-direction:column; gap:10px; }
.hqz-option { display:flex; align-items:flex-start; gap:12px; padding:13px 16px; border-radius:var(--radius); border:1.5px solid var(--border-default); background:var(--bg-2); cursor:pointer; transition:border-color .12s, background .12s; user-select:none; }
.hqz-option:hover:not(.answered) { border-color:var(--brand); background:var(--brand-glow); }
.hqz-option.selected { border-color:var(--brand); background:var(--brand-glow); }
.hqz-option.correct-ans { border-color:var(--green); background:var(--green-subtle); }
.hqz-option.wrong-ans { border-color:var(--red); background:var(--red-subtle); }
.hqz-option.answered { cursor:default; }
.hqz-opt-letter { width:26px; height:26px; border-radius:50%; border:1.5px solid var(--border-default); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--text-muted); flex-shrink:0; }
.hqz-option.selected .hqz-opt-letter { border-color:var(--brand); color:var(--brand); }
.hqz-option.correct-ans .hqz-opt-letter { border-color:var(--green); color:var(--green); background:var(--green-subtle); }
.hqz-option.wrong-ans .hqz-opt-letter { border-color:var(--red); color:var(--red); }
.hqz-opt-text { font-size:13.5px; color:var(--text-secondary); line-height:1.4; padding-top:3px; }
.hqz-option.correct-ans .hqz-opt-text, .hqz-option.selected .hqz-opt-text { color:var(--text-primary); }
.hqz-explanation { margin-top:16px; padding:14px 16px; border-radius:var(--radius); background:var(--bg-3); border:1px solid var(--border-subtle); font-size:13px; color:var(--text-secondary); line-height:1.6; display:none; }
.hqz-explanation.visible { display:block; }
.hqz-explanation .exp-correct { color:var(--green); font-weight:700; }
.hqz-explanation .exp-wrong { color:var(--red); font-weight:700; }
.hqz-nav-row { display:flex; justify-content:space-between; align-items:center; margin-top:24px; }
.hqz-btn { padding:9px 20px; border-radius:var(--radius); border:1px solid var(--border-default); background:var(--bg-3); color:var(--text-secondary); font-size:13px; cursor:pointer; font-weight:600; }
.hqz-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.hqz-btn.primary { background:var(--brand); border-color:var(--brand); color:#04211d; }
.hqz-btn.primary:hover { opacity:.9; }
.hqz-btn:disabled { opacity:.35; cursor:not-allowed; }
.hqz-dot-row { display:flex; gap:6px; flex-wrap:wrap; }
.hqz-dot { width:10px; height:10px; border-radius:50%; background:var(--bg-4); border:1.5px solid var(--border-default); }
.hqz-dot.current { border-color:var(--brand); background:var(--brand); }
.hqz-dot.correct { background:var(--green); border-color:var(--green); }
.hqz-dot.incorrect { background:var(--red); border-color:var(--red); }
.hqz-results { text-align:center; padding:40px 24px; max-width:600px; margin:0 auto; }
.hqz-results-score { font-size:72px; font-weight:800; line-height:1; margin-bottom:4px; }
.hqz-results-label { font-size:14px; color:var(--text-muted); margin-bottom:32px; }
.hqz-results-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; }
.hqz-results-cell { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px; text-align:center; }
.hqz-results-cell-val { font-size:28px; font-weight:700; margin-bottom:4px; }
.hqz-results-cell-label { font-size:11px; color:var(--text-muted); }
.hqz-results-grade { font-size:18px; font-weight:700; margin-bottom:8px; color:var(--text-primary); }
.hqz-results-desc { font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:28px; }
`;
    document.head.appendChild(s);
  }

  const Q = [
    { q: 'What is the source of truth for a Hudi table?', options: ['A Hive table', 'The timeline in .hoodie/', 'Each Parquet footer', 'A manifest list'], correct: 1, explanation: 'The .hoodie timeline is an ordered log of instants (action + state + time) — it defines the table’s history and current state.' },
    { q: 'A Hudi file slice consists of…', options: ['Two Parquet files', 'A base Parquet file plus any Avro log files since last compaction', 'Only log files', 'A JSON commit'], correct: 1, explanation: 'A file slice is one version of a file group: the base file plus the log files written against it (MoR).' },
    { q: 'How does a Merge-on-Read table apply an update?', options: ['Rewrites the base file immediately', 'Appends the change to an Avro log file, merged on read', 'Deletes the partition', 'Creates a new table'], correct: 1, explanation: 'MoR appends updates to log files (cheap writes) and merges them with the base at read time until compaction.' },
    { q: 'Copy-on-Write trades which way?', options: ['Cheap writes, costly reads', 'Costly writes (rewrite base), fast clean reads', 'No time travel', 'No indexing'], correct: 1, explanation: 'CoW rewrites affected base files on write, so reads are clean columnar scans — at the cost of heavier writes.' },
    { q: 'During an upsert, what finds the file group for a key?', options: ['A full scan', 'The index', 'The Parquet footer', 'The catalog'], correct: 1, explanation: 'The index maps record key → file group, so upserts/deletes target the right files instead of scanning the table.' },
    { q: 'Which index hashes keys into a fixed number of file groups for O(1) routing?', options: ['Bloom', 'Bucket', 'Simple', 'None'], correct: 1, explanation: 'The bucket index hashes keys into a fixed number of buckets, so routing needs no probe — ideal for steady streaming.' },
    { q: 'The precombine field is used to…', options: ['Partition data', 'Pick the winning record when two updates share a key', 'Encrypt records', 'Name files'], correct: 1, explanation: 'When two records in a batch share a key, the one with the greater precombine value wins (last-writer-wins).' },
    { q: 'An incremental query returns…', options: ['The whole table', 'Only records changed between two instants', 'Only the schema', 'Only deletes'], correct: 1, explanation: 'Incremental queries read just the change set between a begin and end instant — Hudi’s signature for efficient pipelines.' },
    { q: 'On a MoR table, which query type reads base files only (fastest, may lag)?', options: ['Snapshot', 'Read-optimized', 'Incremental', 'Time-travel'], correct: 1, explanation: 'The read-optimized view reads only compacted base files — fastest, but may miss un-compacted updates until compaction.' },
    { q: 'Compaction does what?', options: ['Deletes commits', 'Merges log files into a new base file', 'Changes the schema', 'Locks the table'], correct: 1, explanation: 'Compaction merges a file group’s log files into a fresh base file (new slice), so reads stop paying a merge cost.' },
    { q: 'Clustering primarily…', options: ['Merges logs into base', 'Rewrites data into new file groups sorted/sized for better skipping', 'Deletes old slices', 'Adds columns'], correct: 1, explanation: 'Clustering re-lays-out data (sort + right-size) into new file groups to improve skipping — without changing record values.' },
    { q: 'Cleaning removes…', options: ['All data', 'File slices beyond the retention policy', 'The timeline', 'The newest slice'], correct: 1, explanation: 'Cleaning deletes old file slices past retention to reclaim storage, keeping enough history for time travel and readers.' },
    { q: 'The metadata table stores all EXCEPT…', options: ['File list', 'Column stats', 'Bloom filters / record index', 'The raw order rows'], correct: 3, explanation: 'The internal MoR metadata table holds the file list, column stats, bloom filters, and record index — not the table’s actual data rows.' },
    { q: 'Hudi multi-writer concurrency uses…', options: ['Table locks for the whole write', 'Optimistic concurrency control with a lock provider at commit', 'No coordination', 'Two-phase commit'], correct: 1, explanation: 'Writers proceed optimistically and take a brief lock (Zookeeper/HMS/DynamoDB/filesystem) at commit; overlapping file groups make the later writer retry.' },
    { q: 'Restore differs from a time-travel query because it…', options: ['Only reads the past', 'Resets the table to a past instant', 'Deletes the timeline', 'Adds a savepoint'], correct: 1, explanation: 'Time travel reads an old instant without moving the head; restore actually rolls the table back to that instant.' },
    { q: 'Insert overwrite is recorded as which instant action?', options: ['deltacommit', 'replacecommit', 'clean', 'rollback'], correct: 1, explanation: 'Insert overwrite replaces the targeted partitions’ file groups and is recorded as a replacecommit.' },
    { q: 'Bulk insert is preferred over upsert/insert for…', options: ['Small streaming batches', 'Large initial loads / backfills (no index tagging)', 'Deletes', 'Schema changes'], correct: 1, explanation: 'Bulk insert skips per-record index bookkeeping and writes right-sized files — the fastest path to seed a table.' },
    { q: 'Why does Hudi shine for CDC/streaming ingestion?', options: ['It is append-only', 'Record-level upserts + incremental queries are first-class', 'It has no metadata', 'It disallows deletes'], correct: 1, explanation: 'Keyed upserts/deletes and incremental pulls are built in, so streaming ingest and efficient downstream processing are native.' },
  ];

  function render(container) {
    injectStyles();
    let cur = 0, ans = new Array(Q.length).fill(null), score = 0;
    function grade(s, t) {
      const p = s / t;
      if (p >= 0.9) return { g: 'Hudi Expert', c: 'var(--green)', d: 'Outstanding — deep command of the timeline, table types, indexing, and table services. Ready for senior lakehouse interviews.' };
      if (p >= 0.7) return { g: 'Proficient', c: 'var(--brand)', d: 'Strong grasp of Hudi’s core model and most advanced topics. Review what you missed and you’ll be fully prepared.' };
      if (p >= 0.5) return { g: 'Developing', c: 'var(--orange)', d: 'Good base with gaps in advanced areas (indexing, compaction, OCC). Work through Read & Query and Table Services.' };
      return { g: 'Beginner', c: 'var(--red)', d: 'Start with Why Hudi?, Architecture, and CoW vs MoR, then return. The timeline + file groups anchor everything else.' };
    }
    function dots() { return Q.map((_, i) => { let c = 'hqz-dot'; if (i === cur) c += ' current'; else if (ans[i] !== null) c += ans[i] ? ' correct' : ' incorrect'; return `<div class="${c}"></div>`; }).join(''); }
    function fill() { const done = ans.filter(a => a !== null).length; const f = container.querySelector('#hqz-pfill'); if (f) f.style.width = `${(done / Q.length) * 100}%`; }
    function renderQ() {
      const q = Q[cur], isA = ans[cur] !== null, chosen = isA ? ans[cur] : null;
      container.querySelector('#hqz-body').innerHTML = `
<div class="hqz-card">
  <div class="hqz-q-header"><div class="hqz-q-num">Question ${cur + 1} of ${Q.length}</div>${isA ? `<div class="hqz-q-score-badge ${ans[cur] ? 'correct' : 'incorrect'}">${ans[cur] ? '✓ Correct' : '✗ Incorrect'}</div>` : ''}</div>
  <div class="hqz-q-text">${q.q}</div>
  <div class="hqz-options">
    ${q.options.map((opt, oi) => { let c = 'hqz-option'; if (isA) { c += ' answered'; if (oi === q.correct) c += ' correct-ans'; else if (oi === chosen && oi !== q.correct) c += ' wrong-ans'; else if (oi === chosen) c += ' selected'; } return `<div class="${c}" data-opt="${oi}"><div class="hqz-opt-letter">${String.fromCharCode(65 + oi)}</div><div class="hqz-opt-text">${opt}</div></div>`; }).join('')}
  </div>
  <div class="hqz-explanation${isA ? ' visible' : ''}">${isA ? `<span class="${ans[cur] ? 'exp-correct' : 'exp-wrong'}">${ans[cur] ? '✓ Correct!' : '✗ Incorrect.'}</span> ${q.explanation}` : ''}</div>
  <div class="hqz-nav-row"><div class="hqz-dot-row">${dots()}</div><div style="display:flex;gap:10px">
    <button class="hqz-btn" id="hqz-prev" ${cur === 0 ? 'disabled' : ''}>← Prev</button>
    ${cur < Q.length - 1 ? `<button class="hqz-btn primary" id="hqz-next" ${!isA ? 'disabled' : ''}>Next →</button>` : `<button class="hqz-btn primary" id="hqz-finish" ${!isA ? 'disabled' : ''}>See Results</button>`}
  </div></div>
</div>`;
      container.querySelectorAll('.hqz-option:not(.answered)').forEach(el => el.addEventListener('click', () => {
        const oi = parseInt(el.dataset.opt, 10); if (ans[cur] !== null) return;
        const ok = oi === Q[cur].correct; ans[cur] = ok; if (ok) score++;
        const sc = container.querySelector('#hqz-score'); if (sc) sc.textContent = `${score}/${Q.length}`;
        fill(); renderQ();
      }));
      const pv = container.querySelector('#hqz-prev'); if (pv) pv.addEventListener('click', () => { cur--; renderQ(); });
      const nx = container.querySelector('#hqz-next'); if (nx) nx.addEventListener('click', () => { cur++; renderQ(); });
      const fn = container.querySelector('#hqz-finish'); if (fn) fn.addEventListener('click', results);
    }
    function results() {
      const { g, c, d } = grade(score, Q.length), pct = Math.round((score / Q.length) * 100);
      container.querySelector('#hqz-body').innerHTML = `
<div class="hqz-results">
  <div class="hqz-results-score" style="color:${c}">${pct}%</div>
  <div class="hqz-results-label">Quiz Complete</div>
  <div class="hqz-results-grid">
    <div class="hqz-results-cell"><div class="hqz-results-cell-val" style="color:var(--green)">${score}</div><div class="hqz-results-cell-label">Correct</div></div>
    <div class="hqz-results-cell"><div class="hqz-results-cell-val" style="color:var(--red)">${Q.length - score}</div><div class="hqz-results-cell-label">Incorrect</div></div>
  </div>
  <div class="hqz-results-grade" style="color:${c}">${g}</div>
  <div class="hqz-results-desc">${d}</div>
  <button class="hqz-btn primary" id="hqz-retry" style="padding:10px 32px;font-size:14px">Retry Quiz</button>
</div>`;
      container.querySelector('#hqz-retry').addEventListener('click', () => { cur = 0; ans = new Array(Q.length).fill(null); score = 0; const sc = container.querySelector('#hqz-score'); if (sc) sc.textContent = `0/${Q.length}`; fill(); renderQ(); });
    }
    container.className = '';
    container.innerHTML = `
<div class="hqz-page page-enter">
  <div class="hqz-header"><div><div class="hqz-header-title">Quiz Mode</div><div class="hqz-header-meta">Apache Hudi · ${Q.length} questions · Multiple choice</div></div>
    <div style="display:flex;align-items:center;gap:16px"><span style="font-size:12px;color:var(--text-muted)">Score:</span><span id="hqz-score" style="font-size:16px;font-weight:700;color:var(--text-primary)">0/${Q.length}</span></div></div>
  <div class="hqz-progress-bar"><div class="hqz-progress-fill" id="hqz-pfill" style="width:0%"></div></div>
  <div class="hqz-body" id="hqz-body"></div>
</div>`;
    renderQ();
  }

  TV.registerModule('hudi', {
    id: 'quiz', title: 'Quiz Mode', group: 'learn', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
