/* ============================================================
   Delta Lake — Interview Mode
   Senior-level Delta Lake interview questions with reveal-on-click
   answers, difficulty filter, and ShopKart production context.
   Registers into the delta bucket and exposes TV.DeltaInterview so
   the Study Deck can aggregate the same Q&A.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('dint-styles')) return;
    const s = document.createElement('style');
    s.id = 'dint-styles';
    s.textContent = `
.dint-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.dint-header {
  padding:16px 24px; border-bottom:1px solid var(--border-default);
  background:var(--bg-2); flex-shrink:0;
  display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
}
.dint-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.dint-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.dint-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.dint-progress-text { font-size:12px; color:var(--text-muted); }
.dint-btn {
  padding:6px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default);
  background:var(--bg-3); color:var(--text-secondary); font-size:12px;
  cursor:pointer; transition:background .12s, color .12s;
}
.dint-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.dint-btn.active { background:var(--brand-glow); border-color:var(--brand); color:var(--brand); }
.dint-body { flex:1; overflow-y:auto; padding:20px 24px; }
.dint-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.dint-card {
  border:1px solid var(--border-default); border-radius:var(--radius);
  background:var(--bg-2); overflow:hidden; transition:border-color .15s;
}
.dint-card:hover { border-color:var(--brand); }
.dint-q-row { display:flex; align-items:flex-start; gap:12px; padding:14px 18px; cursor:pointer; user-select:none; }
.dint-q-num {
  width:26px; height:26px; border-radius:50%; background:var(--bg-3);
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:var(--text-muted); flex-shrink:0; margin-top:1px;
}
.dint-card.revealed .dint-q-num { background:var(--green-subtle); border-color:var(--green); color:var(--green); }
.dint-q-main { flex:1; }
.dint-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.dint-tags { display:flex; gap:6px; flex-wrap:wrap; }
.dint-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.dint-tag.basic        { background:var(--green-subtle);  color:var(--green); }
.dint-tag.intermediate { background:var(--yellow-subtle); color:var(--yellow); }
.dint-tag.advanced     { background:var(--red-subtle);    color:var(--red); }
.dint-tag.senior       { background:var(--purple-subtle); color:var(--purple); }
.dint-q-chevron { color:var(--text-muted); flex-shrink:0; transition:transform .2s; display:flex; align-items:center; padding-top:2px; }
.dint-card.revealed .dint-q-chevron { transform:rotate(180deg); }
.dint-answer { display:none; border-top:1px solid var(--border-subtle); padding:16px 18px; background:var(--bg-1); }
.dint-card.revealed .dint-answer { display:block; }
.dint-answer-text { font-size:13px; color:var(--text-secondary); line-height:1.65; margin-bottom:12px; white-space:pre-line; }
.dint-answer-code {
  font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary);
  background:var(--code-bg); border:1px solid var(--border-subtle);
  border-radius:var(--radius-sm); padding:12px 14px; line-height:1.7;
  white-space:pre; overflow-x:auto; margin-bottom:10px;
}
.dint-answer-code .k { color:var(--brand); font-weight:600; } .dint-answer-code .s { color:var(--orange); } .dint-answer-code .c { color:var(--text-muted); font-style:italic; }
.dint-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; }
.dint-note strong { color:var(--brand); }
.dint-empty { text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px; }
`;
    document.head.appendChild(s);
  }

  const QA = [
    {
      level: 'basic',
      q: 'What is Delta Lake, and what does it add over a plain directory of Parquet files?',
      a: `Delta Lake is an open table format that layers a transaction log over Parquet data files. A bare Parquet directory gives you columnar storage and predicate pushdown, but no consistency across a set of files.

Delta adds, via the _delta_log:
• ACID transactions — a set of file changes commits atomically
• Snapshot isolation — readers see a consistent version, never a half-written table
• Time travel — query any past version by number or timestamp
• Schema enforcement & evolution — the log holds the authoritative schema
• Data skipping — per-file min/max stats prune files before reads`,
      note: '<strong>ShopKart:</strong> the orders table (38.4 TB, ~24K files) moved from raw Parquet to Delta so Spark ingest and Trino/Databricks reads share one consistent, versioned table.',
    },
    {
      level: 'basic',
      q: 'Describe the physical layout of a Delta table on storage.',
      a: `Two parts under the table root:

1. Immutable Parquet data files (often in partition subdirectories).
2. A _delta_log/ directory containing:
   • NNN...NNN.json — one ordered JSON commit per version
   • NNN...NNN.checkpoint.parquet — a cumulative snapshot every N commits (default 10)
   • _last_checkpoint — a small pointer to the most recent checkpoint

The log, not the file listing, defines which files belong to the table at each version.`,
      code: `<span class="c">orders/</span>
  part-0000-....snappy.parquet
  country=BR/part-....parquet
  <span class="k">_delta_log/</span>
    00000000000000000000.json   <span class="c">-- v0 CREATE</span>
    00000000000000000001.json   <span class="c">-- v1 INSERT</span>
    ...
    00000000000000000010.checkpoint.parquet
    _last_checkpoint`,
    },
    {
      level: 'intermediate',
      q: 'What action types appear inside a Delta commit, and what does each do?',
      a: `Each JSON commit is a list of actions:

• protocol — minimum reader/writer versions and required table features
• metaData — schema, partition columns, table properties
• add (AddFile) — a data file joining the table, with size, partitionValues, and per-column stats
• remove (RemoveFile) — tombstones a file (logical delete)
• commitInfo — audit record: operation, parameters, metrics, user, timestamp
• cdc — change-data rows when Change Data Feed is enabled

Reconstructing table state = replaying add/remove across commits (from the last checkpoint).`,
      note: '<strong>ShopKart:</strong> an OPTIMIZE commit is a wall of remove (small files) + add (compacted files), all atomic, with a commitInfo recording the numFilesRemoved/Added metrics.',
    },
    {
      level: 'intermediate',
      q: 'How does Delta achieve ACID commits on object storage that lacks multi-file transactions?',
      a: `Delta reduces a commit to a single atomic action: creating the next numbered log file.

1. The writer reads the current version N and stages new data files.
2. It attempts an atomic put-if-absent of (N+1).json.
3. If it succeeds, that instant is the commit — all its add/remove actions become visible together.
4. If (N+1).json already exists, another writer won the race; this writer re-reads and retries.

So even on S3, the "transaction" is one atomic object creation, which storage can guarantee (directly, or via a commit-coordination service / catalog like Unity or DynamoDB for S3 multi-writer).`,
      note: '<strong>ShopKart:</strong> Unity Catalog coordinates commits, so dozens of concurrent Spark writers to orders never clobber a version.',
    },
    {
      level: 'intermediate',
      q: 'Walk through the Delta read path for a large table.',
      a: `1. Read _last_checkpoint to find the newest checkpoint.
2. Load that checkpoint Parquet — cumulative add set as of that version (bounded work).
3. Replay only the JSON commits after the checkpoint, applying add/remove.
4. Apply partition pruning, then data skipping using per-file min/max stats.
5. Read only the surviving data files.

The checkpoint is what keeps step 3 small: without it a reader would replay every commit from version 0.`,
      code: `<span class="c">-- effect of a checkpoint every 10 commits at v1,050</span>
without checkpoint: replay 1,050 JSON commits
with    checkpoint: load 1 parquet + replay ~0-9 commits`,
    },
    {
      level: 'intermediate',
      q: 'Compare copy-on-write and merge-on-read (deletion vectors) for DELETE/UPDATE.',
      a: `Copy-on-write (CoW): a matched file is rewritten without the affected rows — remove old, add new — in one commit. Writes are expensive (full-file rewrite); reads are clean (no merge).

Merge-on-read (MoR) via deletion vectors: instead of rewriting, Delta records a bitmap of deleted row positions for the file. Writes are cheap; reads skip flagged rows (a small merge). OPTIMIZE later materializes the deletes by rewriting.

Choose CoW for read-heavy, low-churn tables; deletion vectors for frequent point deletes/updates, then compact.`,
      note: '<strong>ShopKart:</strong> GDPR erasure by customer_id uses deletion vectors for fast commits; a nightly OPTIMIZE rewrites the affected files to reclaim the space.',
    },
    {
      level: 'intermediate',
      q: 'How does time travel work, and what limits how far back you can go?',
      a: `Every commit is an immutable version. VERSION AS OF n or TIMESTAMP AS OF t makes Delta replay the log to that version and resolve the file set current then — the historical Parquet files still exist because remove is only a tombstone.

The limit is VACUUM retention: once VACUUM physically deletes tombstoned files older than the retention window (default 7 days), any version that referenced them can no longer be read. Time travel depth = retention window.`,
      code: `<span class="k">SELECT</span> * <span class="k">FROM</span> orders <span class="k">VERSION AS OF</span> <span class="s">842</span>;
<span class="k">SELECT</span> * <span class="k">FROM</span> orders <span class="k">TIMESTAMP AS OF</span> <span class="s">'2026-08-01 00:00:00'</span>;
<span class="k">RESTORE TABLE</span> orders <span class="k">TO VERSION AS OF</span> <span class="s">842</span>;  <span class="c">-- roll back</span>`,
    },
    {
      level: 'advanced',
      q: 'Explain Delta’s optimistic concurrency control and how conflicts are resolved.',
      a: `Writers don’t lock. Each reads a base version, does its work, and attempts to commit the next version number.

• If the next number is free, the commit wins.
• If another writer already took it, this writer re-reads the newly committed actions and runs conflict detection: did the other commit touch files or rows this write depends on?
   – Disjoint changes (e.g. two blind appends): re-commit at the next version.
   – Genuine conflict (both modified the same files, or a concurrent delete removed files this write updated): throw a concurrency exception.

Isolation levels (WriteSerializable default, Serializable stricter) govern which concurrent combinations are allowed.`,
      note: '<strong>ShopKart:</strong> streaming appends and the hourly MERGE run together; appends retry silently, while a MERGE conflicting with a concurrent OPTIMIZE surfaces a retriable exception in the job.',
    },
    {
      level: 'advanced',
      q: 'What are deletion vectors, and why did they change Delta’s delete/update performance?',
      a: `A deletion vector is a compact bitmap (roaring bitmap) stored beside a data file marking which row positions are deleted. Reads apply it to skip those rows; the file itself is not rewritten.

Before deletion vectors, a single-row DELETE could force rewriting a multi-hundred-MB file (copy-on-write). With deletion vectors the delete is a tiny write, so point deletes and MERGE updates become cheap. The deferred cost is a read-time merge, which OPTIMIZE later removes by physically rewriting the flagged files.

Deletion vectors are a protocol table feature — engines must support the reader feature to read such a table.`,
    },
    {
      level: 'advanced',
      q: 'How do checkpoints work, and why are they essential at scale?',
      a: `A checkpoint is a Parquet file summarizing the cumulative set of actions (mostly the live add set plus protocol/metaData) up to a version. By default one is written every 10 commits; _last_checkpoint points at the newest.

Essential because read cost is proportional to how many commits must be replayed. On a table with thousands of versions, replaying from version 0 every query would be O(n) and slow. A checkpoint bounds replay to the handful of commits since it — effectively O(1). It is the single biggest reason Delta reads stay fast as history grows.`,
      code: `<span class="c">_delta_log/</span>
  ...0838.json
  ...0839.json
  ...0840.checkpoint.parquet   <span class="c">← reader starts here</span>
  ...0841.json ...0842.json    <span class="c">← replays only these</span>`,
    },
    {
      level: 'advanced',
      q: 'When would you choose liquid clustering over partitioning, and what does it fix?',
      a: `Fixed (Hive-style) partitioning creates one directory per partition value. High-cardinality or skewed keys produce many tiny files and uneven partitions, and you cannot change the partition columns without rewriting the table.

Liquid clustering instead clusters data by chosen keys and re-clusters incrementally as data lands (and during OPTIMIZE). Benefits:
• No small-file/skew explosion from bad partition choices
• Clustering keys can evolve without a full rewrite
• Good data skipping across the clustering columns

Use it for tables where you’d otherwise agonize over partition columns, or where access patterns change over time.`,
      note: '<strong>ShopKart:</strong> orders is clustered by (customer_id, order_date) instead of partitioned by date — even file sizes and strong skipping on both dimensions.',
    },
    {
      level: 'advanced',
      q: 'How does MERGE INTO execute, and how do you keep it performant for CDC?',
      a: `MERGE runs in two passes:
1. Inner-join the source to the target on the match condition to find which target files contain matching rows.
2. Rewrite just those files, applying WHEN MATCHED (update/delete) and WHEN NOT MATCHED (insert), and commit atomically.

Performance levers:
• Make the ON condition selective and, ideally, partition/cluster-aligned so pass 1 touches few files.
• Enable deletion vectors so matched files aren’t fully rewritten.
• Pre-filter the source and prune target partitions in the condition.
• Compact regularly so pass 1 doesn’t scan thousands of small files.`,
      code: `<span class="k">MERGE INTO</span> orders t <span class="k">USING</span> cdc s
  <span class="k">ON</span> t.order_id = s.order_id <span class="k">AND</span> t.order_date = s.order_date
<span class="k">WHEN MATCHED AND</span> s.op=<span class="s">'D'</span> <span class="k">THEN DELETE</span>
<span class="k">WHEN MATCHED</span> <span class="k">THEN UPDATE SET</span> *
<span class="k">WHEN NOT MATCHED</span> <span class="k">THEN INSERT</span> *;`,
    },
    {
      level: 'senior',
      q: 'A Delta read plan has slowed from seconds to minutes. Diagnose and fix.',
      a: `Almost always small-file / commit explosion from frequent streaming micro-batches:

Diagnose:
• DESCRIBE HISTORY — how often are commits happening?
• Check file counts/sizes (many KB-sized files = trouble) and whether checkpoints are being written.
• Look for missing/rare checkpoints forcing long log replay.

Fix:
• OPTIMIZE (bin-pack, optionally ZORDER) to compact small files.
• Increase the streaming trigger interval so each commit adds fewer, larger files.
• Ensure checkpointing cadence is healthy; VACUUM to clear tombstone buildup.
• Consider liquid clustering for ongoing layout maintenance.`,
      note: '<strong>ShopKart:</strong> a 10-second micro-batch created millions of tiny files; raising the trigger to 2 minutes plus nightly OPTIMIZE cut planning from minutes back to seconds.',
    },
    {
      level: 'senior',
      q: 'What is the protocol action, and how do table features affect engine compatibility?',
      a: `The protocol action declares the minimum reader and writer versions — and, in the newer model, the explicit set of table features a table uses (e.g. deletionVectors, columnMapping, changeDataFeed, timestampNtz).

An engine may read a table only if it supports every required reader feature, and write only if it supports every required writer feature. This is how Delta evolves safely: enabling deletion vectors bumps the protocol so an engine that can’t interpret them won’t silently return wrong results — it refuses to read.

Practical takeaway: before pointing a new engine (Trino, DuckDB, delta-rs) at a table, check its protocol/features against what that engine supports.`,
    },
    {
      level: 'senior',
      q: 'Compare Delta Lake, Apache Iceberg, and Apache Hudi at a high level.',
      a: `All three are open table formats adding ACID + time travel over columnar files; they differ in metadata design and heritage.

• Delta Lake — a transaction log (_delta_log) of JSON actions replayed from Parquet checkpoints. Deep Spark/Databricks integration; broadening to many engines via the open protocol, delta-kernel, delta-rs, and UniForm.
• Iceberg — an immutable snapshot tree with a manifest-list → manifest → data-file hierarchy. Strongly engine-neutral, powerful hidden partitioning and partition/schema evolution, REST catalog spec.
• Hudi — record-key centric with primary keys and first-class upserts/indexing; strong for streaming record-level upserts, with CoW and MoR table types.

Rule of thumb: Delta for Databricks-centric lakehouses, Iceberg for multi-engine neutrality at huge scale, Hudi for heavy streaming upserts.`,
      note: '<strong>ShopKart:</strong> chose Delta because the platform is Databricks + Unity Catalog centric, while still being readable from Trino and delta-rs jobs via the open protocol.',
    },
  ];

  TV.DeltaInterview = QA;

  function levelLabel(l) { return l === 'basic' ? 'beginner' : l; }

  function render(container) {
    injectStyles();
    let activeFilter = 'all';

    function buildList() {
      const filtered = QA.filter(x => activeFilter === 'all' || x.level === activeFilter);
      if (!filtered.length) return '<div class="dint-empty">No questions match this filter.</div>';
      return `<div class="dint-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="dint-card" data-idx="${gi}">
          <div class="dint-q-row">
            <div class="dint-q-num">${i + 1}</div>
            <div class="dint-q-main">
              <div class="dint-q-text">${qa.q}</div>
              <div class="dint-tags"><span class="dint-tag ${qa.level}">${levelLabel(qa.level)}</span></div>
            </div>
            <div class="dint-q-chevron">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M2 4l4 4 4-4"/></svg>
            </div>
          </div>
          <div class="dint-answer">
            <div class="dint-answer-text">${qa.a}</div>
            ${qa.code ? `<div class="dint-answer-code">${qa.code}</div>` : ''}
            ${qa.note ? `<div class="dint-note">${qa.note}</div>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    container.className = '';
    container.innerHTML = `
<div class="dint-page page-enter">
  <div class="dint-header">
    <div class="dint-header-left">
      <h1>Interview Mode</h1>
      <p>Delta Lake — ${QA.length} interview questions across all levels. Click any question to reveal the answer.</p>
    </div>
    <div class="dint-header-right">
      <div class="dint-filter-row" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Filter:</span>
        <button class="dint-btn active" data-filter="all">All</button>
        <button class="dint-btn" data-filter="basic">Beginner</button>
        <button class="dint-btn" data-filter="intermediate">Intermediate</button>
        <button class="dint-btn" data-filter="advanced">Advanced</button>
        <button class="dint-btn" data-filter="senior">Senior</button>
      </div>
      <span class="dint-progress-text" id="dint-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="dint-body" id="dint-body">${buildList()}</div>
</div>`;

    function updateProgress() {
      const revealed = container.querySelectorAll('.dint-card.revealed').length;
      const prog = container.querySelector('#dint-progress');
      if (prog) prog.textContent = `${revealed} / ${QA.length} revealed`;
    }
    function wireBody() {
      container.querySelector('#dint-body').addEventListener('click', (e) => {
        const card = e.target.closest('.dint-card');
        if (!card) return;
        card.classList.toggle('revealed');
        updateProgress();
      });
    }
    wireBody();
    container.querySelectorAll('.dint-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.dint-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        container.querySelector('#dint-body').innerHTML = buildList();
        updateProgress();
        wireBody();
      });
    });
  }

  TV.registerModule('delta', {
    id: 'interview', title: 'Interview Mode', group: 'learn', format: 'delta',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
