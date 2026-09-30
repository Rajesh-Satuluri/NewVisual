/* ============================================================
   Delta Lake — Quiz Mode
   Multiple-choice quiz across Delta fundamentals → advanced.
   Tracks score, shows explanations, and a final graded summary.
   ShopKart context throughout. Registered in the delta bucket.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('dquiz-styles')) return;
    const s = document.createElement('style');
    s.id = 'dquiz-styles';
    s.textContent = `
.dqz-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.dqz-header {
  padding:14px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
}
.dqz-header-title { font-size:16px; font-weight:700; color:var(--text-primary); }
.dqz-header-meta { font-size:12px; color:var(--text-muted); }
.dqz-progress-bar { height:4px; background:var(--bg-3); position:relative; flex-shrink:0; }
.dqz-progress-fill { height:100%; background:var(--brand); transition:width .3s ease; border-radius:0 2px 2px 0; }
.dqz-body { flex:1; overflow-y:auto; padding:24px; display:flex; justify-content:center; }
.dqz-card { width:100%; max-width:720px; }
.dqz-q-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.dqz-q-num { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; }
.dqz-q-score-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:4px; }
.dqz-q-score-badge.correct { background:var(--green-subtle); color:var(--green); }
.dqz-q-score-badge.incorrect { background:var(--red-subtle); color:var(--red); }
.dqz-q-text { font-size:16px; font-weight:600; color:var(--text-primary); line-height:1.45; margin-bottom:20px; }
.dqz-options { display:flex; flex-direction:column; gap:10px; }
.dqz-option {
  display:flex; align-items:flex-start; gap:12px; padding:13px 16px; border-radius:var(--radius);
  border:1.5px solid var(--border-default); background:var(--bg-2); cursor:pointer;
  transition:border-color .12s, background .12s; user-select:none;
}
.dqz-option:hover:not(.answered) { border-color:var(--brand); background:var(--brand-glow); }
.dqz-option.selected { border-color:var(--brand); background:var(--brand-glow); }
.dqz-option.correct-ans { border-color:var(--green); background:var(--green-subtle); }
.dqz-option.wrong-ans { border-color:var(--red); background:var(--red-subtle); }
.dqz-option.answered { cursor:default; }
.dqz-opt-letter {
  width:26px; height:26px; border-radius:50%; border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;
  color:var(--text-muted); flex-shrink:0;
}
.dqz-option.selected    .dqz-opt-letter { border-color:var(--brand); color:var(--brand); }
.dqz-option.correct-ans .dqz-opt-letter { border-color:var(--green); color:var(--green); background:var(--green-subtle); }
.dqz-option.wrong-ans   .dqz-opt-letter { border-color:var(--red);   color:var(--red); }
.dqz-opt-text { font-size:13.5px; color:var(--text-secondary); line-height:1.4; padding-top:3px; }
.dqz-option.correct-ans .dqz-opt-text, .dqz-option.selected .dqz-opt-text { color:var(--text-primary); }
.dqz-explanation {
  margin-top:16px; padding:14px 16px; border-radius:var(--radius); background:var(--bg-3);
  border:1px solid var(--border-subtle); font-size:13px; color:var(--text-secondary); line-height:1.6; display:none;
}
.dqz-explanation.visible { display:block; }
.dqz-explanation .exp-correct { color:var(--green); font-weight:700; }
.dqz-explanation .exp-wrong { color:var(--red); font-weight:700; }
.dqz-nav-row { display:flex; justify-content:space-between; align-items:center; margin-top:24px; }
.dqz-btn {
  padding:9px 20px; border-radius:var(--radius); border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:13px; cursor:pointer; font-weight:600; transition:all .12s;
}
.dqz-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.dqz-btn.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
.dqz-btn.primary:hover { opacity:.9; }
.dqz-btn:disabled { opacity:.35; cursor:not-allowed; }
.dqz-dot-row { display:flex; gap:6px; flex-wrap:wrap; }
.dqz-dot { width:10px; height:10px; border-radius:50%; background:var(--bg-4); border:1.5px solid var(--border-default); transition:background .2s; }
.dqz-dot.current { border-color:var(--brand); background:var(--brand); }
.dqz-dot.correct { background:var(--green); border-color:var(--green); }
.dqz-dot.incorrect { background:var(--red); border-color:var(--red); }
.dqz-results { text-align:center; padding:40px 24px; max-width:600px; margin:0 auto; }
.dqz-results-score { font-size:72px; font-weight:800; line-height:1; margin-bottom:4px; }
.dqz-results-label { font-size:14px; color:var(--text-muted); margin-bottom:32px; }
.dqz-results-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; }
.dqz-results-cell { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px; text-align:center; }
.dqz-results-cell-val { font-size:28px; font-weight:700; margin-bottom:4px; }
.dqz-results-cell-label { font-size:11px; color:var(--text-muted); }
.dqz-results-grade { font-size:18px; font-weight:700; margin-bottom:8px; color:var(--text-primary); }
.dqz-results-desc { font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:28px; }
`;
    document.head.appendChild(s);
  }

  const QUESTIONS = [
    {
      q: 'What is the single source of truth for which files and schema make up a Delta table?',
      options: ['The Hive metastore', 'The _delta_log transaction log', 'The newest Parquet file footer', 'A manifest list file'],
      correct: 1,
      explanation: 'The _delta_log — ordered JSON commits plus periodic Parquet checkpoints — defines the exact file set and schema at every version.',
    },
    {
      q: 'Immediately after CREATE TABLE with no data, what does version 0 contain?',
      options: ['add actions for empty files', 'protocol + metaData actions', 'A checkpoint', 'Nothing'],
      correct: 1,
      explanation: 'CREATE writes 00…0.json with a protocol action (reader/writer versions & features) and a metaData action (schema, partition columns, properties). No data files yet.',
    },
    {
      q: 'ShopKart appends a Kafka micro-batch to orders. What log actions does the commit contain?',
      options: ['remove actions', 'add actions for the new data files', 'metaData', 'protocol upgrade'],
      correct: 1,
      explanation: 'An append only adds immutable Parquet files, so the commit is a set of add actions. Existing files are never modified.',
    },
    {
      q: 'In copy-on-write mode, a DELETE that removes some rows from a file will…',
      options: ['Edit the file in place', 'Rewrite the file without those rows: remove old + add new', 'Only write commitInfo', 'Drop the partition directory'],
      correct: 1,
      explanation: 'Copy-on-write rewrites surviving rows into a new file and tombstones the original with a remove action — atomically in one commit.',
    },
    {
      q: 'After a copy-on-write DELETE, when is the old file physically deleted from storage?',
      options: ['Immediately', 'When VACUUM runs after the retention window', 'On the next checkpoint', 'Never'],
      correct: 1,
      explanation: 'remove is a tombstone. The file stays on disk (enabling time travel) until VACUUM deletes files past the retention period (default 7 days).',
    },
    {
      q: 'What does replaceWhere allow you to do?',
      options: ['Overwrite the whole table', 'Atomically replace only the data matching a predicate', 'Rename a column', 'Truncate the log'],
      correct: 1,
      explanation: 'replaceWhere is a selective overwrite: files matching the predicate are removed and replacement rows are added in one commit; other partitions are untouched.',
    },
    {
      q: 'A Delta reader with thousands of commits stays fast primarily because of…',
      options: ['Bloom filters', 'Checkpoints that bound log replay', 'Larger Parquet files', 'A faster catalog'],
      correct: 1,
      explanation: 'A checkpoint (default every 10 commits) is a cumulative snapshot, so a reader replays only the commits since it instead of all of history — O(n) becomes ~O(1).',
    },
    {
      q: 'Delta’s data skipping is powered by…',
      options: ['A separate stats service', 'Per-file min/max/nullCount stats stored in add actions', 'Full-text indexes', 'The partition names only'],
      correct: 1,
      explanation: 'Each add action stores per-column stats. The planner drops files whose ranges cannot match the predicate before reading any data.',
    },
    {
      q: 'How does a Delta writer commit a new version safely under concurrency?',
      options: ['It overwrites the latest JSON', 'It atomically creates the next numbered commit file; if it exists, it conflicts and retries', 'It locks the whole bucket', 'It edits the checkpoint'],
      correct: 1,
      explanation: 'The commit is an atomic put-if-absent of version N. If another writer already created N, this one re-reads and retries — optimistic concurrency control.',
    },
    {
      q: 'Two writers both read version 12 and try to write version 13 (both blind appends). What happens?',
      options: ['The table corrupts', 'One wins v13; the other retries and commits v14', 'Both fail', 'They merge into one file'],
      correct: 1,
      explanation: 'Appends touch disjoint files, so they don’t truly conflict. The loser of the version race re-reads and re-commits as version 14.',
    },
    {
      q: 'Which command shows a Delta table’s version history with operations and metrics?',
      options: ['SHOW SNAPSHOTS', 'DESCRIBE HISTORY', 'LIST VERSIONS', 'SELECT * FROM _delta_log'],
      correct: 1,
      explanation: 'DESCRIBE HISTORY returns one row per version with operation, parameters, user, timestamp, and operationMetrics — sourced from each commit’s commitInfo action.',
    },
    {
      q: 'Which syntax reads a Delta table as of a past state?',
      options: ['AS OF SNAPSHOT n', 'VERSION AS OF n or TIMESTAMP AS OF t', 'ROLLBACK n', 'FROM HISTORY t'],
      correct: 1,
      explanation: 'Time travel uses VERSION AS OF <n> or TIMESTAMP AS OF <t>; Delta replays the log to that version and resolves the file set that was current then.',
    },
    {
      q: 'What ultimately limits how far back you can time travel?',
      options: ['The checkpoint interval', 'VACUUM retention — files it deletes can’t be read', 'Column count', 'The catalog vendor'],
      correct: 1,
      explanation: 'Time travel needs the historical data files. Once VACUUM removes tombstoned files past the retention window, versions referencing them are no longer queryable.',
    },
    {
      q: 'Adding a nullable column to a large Delta table requires…',
      options: ['Rewriting all data files', 'A metadata-only commit (a new metaData action)', 'A full VACUUM', 'Recreating the table'],
      correct: 1,
      explanation: 'ADD COLUMN just commits an updated schema in a metaData action. Old files are untouched and read the new column as null.',
    },
    {
      q: 'A deletion vector stores…',
      options: ['The columns to drop', 'A bitmap of deleted row positions within a file (merge-on-read)', 'The delete SQL text', 'The retention window'],
      correct: 1,
      explanation: 'A deletion vector marks deleted rows inside an existing file without rewriting it. Reads skip flagged rows; OPTIMIZE later materializes the deletes.',
    },
    {
      q: 'What is the main benefit of deletion vectors over copy-on-write deletes?',
      options: ['Smaller schema', 'Fast deletes/updates that avoid full-file rewrites', 'They remove the log', 'They speed up VACUUM'],
      correct: 1,
      explanation: 'Deletion vectors turn a delete/update into a tiny write instead of a whole-file rewrite; the deferred read-time merge is cleaned up by OPTIMIZE.',
    },
    {
      q: 'ShopKart’s orders table has millions of tiny files after streaming. Which operation fixes read performance?',
      options: ['VACUUM', 'OPTIMIZE (bin-pack, optionally ZORDER)', 'DESCRIBE HISTORY', 'RESTORE'],
      correct: 1,
      explanation: 'OPTIMIZE bin-packs small files into fewer right-sized files; ZORDER additionally co-locates values of chosen columns for stronger multi-column skipping.',
    },
    {
      q: 'ZORDER BY improves queries by…',
      options: ['Encrypting columns', 'Interleaving values so several filter columns skip well together', 'Adding partitions automatically', 'Deleting old versions'],
      correct: 1,
      explanation: 'ZORDER clusters data multi-dimensionally so co-filtered queries hit tighter per-file min/max ranges, improving data skipping across those columns.',
    },
    {
      q: 'Why can Trino, DuckDB, Flink and delta-rs all read the same Delta table?',
      options: ['They share one driver', 'The transaction-log format is an open, documented protocol', 'They all run inside Spark', 'The catalog converts data per engine'],
      correct: 1,
      explanation: 'Delta is an open protocol. Many engines implement the log spec (often via delta-kernel/delta-rs) and operate on the same tables.',
    },
    {
      q: 'Which action decides whether a given engine is allowed to read a table?',
      options: ['metaData', 'protocol (required reader features)', 'commitInfo', 'add'],
      correct: 1,
      explanation: 'The protocol action lists required reader/writer features (e.g. deletionVectors, columnMapping). An engine may read the table only if it supports every required reader feature.',
    },
    {
      q: 'Change Data Feed lets a downstream job read…',
      options: ['The full table each run', 'Row-level inserts, deletes, and update pre/post images between versions', 'Only the schema', 'The checkpoint file'],
      correct: 1,
      explanation: 'CDF emits row-level changes (insert, delete, update_preimage/postimage) between versions, so consumers process only what changed — incremental ETL, MVs, replication.',
    },
    {
      q: 'Liquid clustering is preferable to fixed partitioning when…',
      options: ['The table is tiny', 'Partition choice is hard or access patterns change; you want to avoid small-file/skew problems', 'You never query the table', 'You need encryption'],
      correct: 1,
      explanation: 'Liquid clustering clusters by chosen keys and re-clusters incrementally, avoiding the small-file/skew issues of rigid partition columns — and the keys can evolve without a full rewrite.',
    },
    {
      q: 'MERGE INTO for a CDC upsert combines which operations atomically?',
      options: ['Only insert and update', 'insert, update, and delete driven by match conditions', 'Only compaction', 'Only schema changes'],
      correct: 1,
      explanation: 'MERGE joins source to target and applies WHEN MATCHED (update/delete) and WHEN NOT MATCHED (insert) in a single atomic commit — the backbone of CDC upserts.',
    },
  ];

  function render(container) {
    injectStyles();
    let current = 0;
    let answered = new Array(QUESTIONS.length).fill(null);
    let score = 0;

    function grade(s, total) {
      const pct = s / total;
      if (pct >= 0.9) return { grade: 'Delta Expert', color: 'var(--green)', desc: 'Outstanding — deep command of the transaction log, concurrency, deletion vectors, and operational tuning. Ready for senior lakehouse interviews.' };
      if (pct >= 0.7) return { grade: 'Proficient', color: 'var(--brand)', desc: 'Strong grasp of Delta’s core model and most advanced topics. Review what you missed and you’ll be fully prepared.' };
      if (pct >= 0.5) return { grade: 'Developing', color: 'var(--orange)', desc: 'Good base with gaps in advanced areas (OCC, deletion vectors, clustering). Work through Read/Query and Advanced Topics to strengthen them.' };
      return { grade: 'Beginner', color: 'var(--red)', desc: 'Start with Why Delta Lake?, Architecture, and the Transaction Log, then return. The _delta_log is the key concept to anchor everything else.' };
    }

    function dots() {
      return QUESTIONS.map((_, i) => {
        let cls = 'dqz-dot';
        if (i === current) cls += ' current';
        else if (answered[i] !== null) cls += answered[i] ? ' correct' : ' incorrect';
        return `<div class="${cls}"></div>`;
      }).join('');
    }

    function renderQuestion() {
      const q = QUESTIONS[current];
      const isAnswered = answered[current] !== null;
      const chosen = isAnswered ? answered[current] : null;
      container.querySelector('#dqz-body').innerHTML = `
<div class="dqz-card">
  <div class="dqz-q-header">
    <div class="dqz-q-num">Question ${current + 1} of ${QUESTIONS.length}</div>
    ${isAnswered ? `<div class="dqz-q-score-badge ${answered[current] ? 'correct' : 'incorrect'}">${answered[current] ? '✓ Correct' : '✗ Incorrect'}</div>` : ''}
  </div>
  <div class="dqz-q-text">${q.q}</div>
  <div class="dqz-options">
    ${q.options.map((opt, oi) => {
      let cls = 'dqz-option';
      if (isAnswered) {
        cls += ' answered';
        if (oi === q.correct) cls += ' correct-ans';
        else if (oi === chosen && oi !== q.correct) cls += ' wrong-ans';
        else if (oi === chosen) cls += ' selected';
      }
      return `<div class="${cls}" data-opt="${oi}">
        <div class="dqz-opt-letter">${String.fromCharCode(65 + oi)}</div>
        <div class="dqz-opt-text">${opt}</div>
      </div>`;
    }).join('')}
  </div>
  <div class="dqz-explanation${isAnswered ? ' visible' : ''}">
    ${isAnswered ? `<span class="${answered[current] ? 'exp-correct' : 'exp-wrong'}">${answered[current] ? '✓ Correct!' : '✗ Incorrect.'}</span> ${q.explanation}` : ''}
  </div>
  <div class="dqz-nav-row">
    <div class="dqz-dot-row">${dots()}</div>
    <div style="display:flex;gap:10px">
      <button class="dqz-btn" id="dqz-prev" ${current === 0 ? 'disabled' : ''}>← Prev</button>
      ${current < QUESTIONS.length - 1
        ? `<button class="dqz-btn primary" id="dqz-next" ${!isAnswered ? 'disabled' : ''}>Next →</button>`
        : `<button class="dqz-btn primary" id="dqz-finish" ${!isAnswered ? 'disabled' : ''}>See Results</button>`}
    </div>
  </div>
</div>`;

      container.querySelectorAll('.dqz-option:not(.answered)').forEach(el => {
        el.addEventListener('click', () => {
          const oi = parseInt(el.dataset.opt, 10);
          if (answered[current] !== null) return;
          const isCorrect = oi === QUESTIONS[current].correct;
          answered[current] = isCorrect;
          if (isCorrect) score++;
          const sc = container.querySelector('#dqz-score');
          if (sc) sc.textContent = `${score}/${QUESTIONS.length}`;
          updateFill();
          renderQuestion();
        });
      });
      const prev = container.querySelector('#dqz-prev');
      if (prev) prev.addEventListener('click', () => { current--; renderQuestion(); });
      const next = container.querySelector('#dqz-next');
      if (next) next.addEventListener('click', () => { current++; renderQuestion(); });
      const fin = container.querySelector('#dqz-finish');
      if (fin) fin.addEventListener('click', renderResults);
    }

    function updateFill() {
      const done = answered.filter(a => a !== null).length;
      const fill = container.querySelector('#dqz-pfill');
      if (fill) fill.style.width = `${(done / QUESTIONS.length) * 100}%`;
    }

    function renderResults() {
      const { grade: g, color, desc } = grade(score, QUESTIONS.length);
      const pct = Math.round((score / QUESTIONS.length) * 100);
      container.querySelector('#dqz-body').innerHTML = `
<div class="dqz-results">
  <div class="dqz-results-score" style="color:${color}">${pct}%</div>
  <div class="dqz-results-label">Quiz Complete</div>
  <div class="dqz-results-grid">
    <div class="dqz-results-cell"><div class="dqz-results-cell-val" style="color:var(--green)">${score}</div><div class="dqz-results-cell-label">Correct</div></div>
    <div class="dqz-results-cell"><div class="dqz-results-cell-val" style="color:var(--red)">${QUESTIONS.length - score}</div><div class="dqz-results-cell-label">Incorrect</div></div>
  </div>
  <div class="dqz-results-grade" style="color:${color}">${g}</div>
  <div class="dqz-results-desc">${desc}</div>
  <button class="dqz-btn primary" id="dqz-retry" style="padding:10px 32px;font-size:14px">Retry Quiz</button>
</div>`;
      container.querySelector('#dqz-retry').addEventListener('click', () => {
        current = 0; answered = new Array(QUESTIONS.length).fill(null); score = 0;
        const sc = container.querySelector('#dqz-score');
        if (sc) sc.textContent = `0/${QUESTIONS.length}`;
        updateFill(); renderQuestion();
      });
    }

    container.className = '';
    container.innerHTML = `
<div class="dqz-page page-enter">
  <div class="dqz-header">
    <div>
      <div class="dqz-header-title">Quiz Mode</div>
      <div class="dqz-header-meta">Delta Lake · ${QUESTIONS.length} questions · Multiple choice</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="font-size:12px;color:var(--text-muted)">Score:</span>
      <span id="dqz-score" style="font-size:16px;font-weight:700;color:var(--text-primary)">0/${QUESTIONS.length}</span>
    </div>
  </div>
  <div class="dqz-progress-bar"><div class="dqz-progress-fill" id="dqz-pfill" style="width:0%"></div></div>
  <div class="dqz-body" id="dqz-body"></div>
</div>`;
    renderQuestion();
  }

  TV.registerModule('delta', {
    id: 'quiz', title: 'Quiz Mode', group: 'learn', format: 'delta',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
