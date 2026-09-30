/* ============================================================
   Apache Hudi — Interview Mode
   Senior-level Hudi interview questions, reveal-on-click, level
   filter, ShopKart context. Registers in the hudi bucket and
   exposes TV.HudiInterview for the Study Deck. Uses brand tokens
   (teal→emerald) via var(--brand).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;

  function injectStyles() {
    if (document.getElementById('hint-styles')) return;
    const s = document.createElement('style');
    s.id = 'hint-styles';
    s.textContent = `
.hint-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.hint-header { padding:16px 24px; border-bottom:1px solid var(--border-default); background:var(--bg-2); flex-shrink:0; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.hint-header-left h1 { font-size:18px; font-weight:700; color:var(--text-primary); margin:0 0 4px; }
.hint-header-left p { font-size:12px; color:var(--text-muted); margin:0; }
.hint-header-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.hint-btn { padding:6px 14px; border-radius:var(--radius-sm); border:1px solid var(--border-default); background:var(--bg-3); color:var(--text-secondary); font-size:12px; cursor:pointer; }
.hint-btn:hover { background:var(--bg-4); color:var(--text-primary); }
.hint-btn.active { background:var(--brand-glow); border-color:var(--brand); color:var(--brand); }
.hint-progress-text { font-size:12px; color:var(--text-muted); }
.hint-body { flex:1; overflow-y:auto; padding:20px 24px; }
.hint-list { display:flex; flex-direction:column; gap:14px; max-width:880px; }
.hint-card { border:1px solid var(--border-default); border-radius:var(--radius); background:var(--bg-2); overflow:hidden; transition:border-color .15s; }
.hint-card:hover { border-color:var(--brand); }
.hint-q-row { display:flex; align-items:flex-start; gap:12px; padding:14px 18px; cursor:pointer; user-select:none; }
.hint-q-num { width:26px; height:26px; border-radius:50%; background:var(--bg-3); border:1.5px solid var(--border-default); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--text-muted); flex-shrink:0; margin-top:1px; }
.hint-card.revealed .hint-q-num { background:var(--green-subtle); border-color:var(--green); color:var(--green); }
.hint-q-main { flex:1; }
.hint-q-text { font-size:14px; font-weight:600; color:var(--text-primary); line-height:1.4; margin-bottom:4px; }
.hint-tags { display:flex; gap:6px; flex-wrap:wrap; }
.hint-tag { font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.hint-tag.basic { background:var(--green-subtle); color:var(--green); }
.hint-tag.intermediate { background:var(--yellow-subtle); color:var(--yellow); }
.hint-tag.advanced { background:var(--red-subtle); color:var(--red); }
.hint-tag.senior { background:var(--purple-subtle); color:var(--purple); }
.hint-q-chevron { color:var(--text-muted); flex-shrink:0; transition:transform .2s; display:flex; align-items:center; padding-top:2px; }
.hint-card.revealed .hint-q-chevron { transform:rotate(180deg); }
.hint-answer { display:none; border-top:1px solid var(--border-subtle); padding:16px 18px; background:var(--bg-1); }
.hint-card.revealed .hint-answer { display:block; }
.hint-answer-text { font-size:13px; color:var(--text-secondary); line-height:1.65; margin-bottom:12px; white-space:pre-line; }
.hint-answer-code { font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:12px 14px; line-height:1.7; white-space:pre; overflow-x:auto; margin-bottom:10px; }
.hint-answer-code .k { color:var(--brand); font-weight:600; } .hint-answer-code .s { color:var(--orange); } .hint-answer-code .c { color:var(--text-muted); font-style:italic; }
.hint-note { font-size:11.5px; color:var(--text-secondary); background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 6px 6px 0; padding:8px 12px; line-height:1.55; }
.hint-note b { color:var(--brand); }
.hint-empty { text-align:center; padding:60px 20px; color:var(--text-muted); font-size:14px; }
`;
    document.head.appendChild(s);
  }

  const QA = [
    { level: 'basic', q: 'What is Apache Hudi, and what is it optimized for?',
      a: `Hudi (Hadoop Upserts, Deletes and Incrementals) is an open table format built around record-level writes. It layers a timeline and file-group structure over columnar files to provide:
• first-class upserts and deletes keyed by a record key
• incremental queries (read only what changed)
• two table types (Copy-on-Write, Merge-on-Read) as an explicit choice
• built-in table services (compaction, clustering, cleaning)

Its center of gravity is streaming / CDC ingestion where fast, correct upserts and low-latency freshness matter most.`,
      note: '<strong>ShopKart:</strong> the orders table takes ~5M CDC events every few minutes as a MoR Hudi table — cheap log appends now, async compaction to keep reads fast.' },
    { level: 'basic', q: 'What is the Hudi timeline?',
      a: `The timeline is the ordered log of every action on the table, stored in .hoodie/. Each entry is an instant:
• action — commit, deltacommit, compaction, clean, rollback, replacecommit, savepoint
• state — requested → inflight → completed
• time — a monotonically increasing instant time

It is the source of truth: readers use the latest completed instants to resolve the current file slices; writers add an instant only after data is safely written.` },
    { level: 'intermediate', q: 'Explain file groups and file slices.',
      a: `A file group is all versions of a set of records within a partition, identified by a stable FileID. A file slice is one version of that group: a base Parquet file plus any Avro log files written against it since the last compaction.

Because a record key maps to exactly one file group (via the index), a write touches a bounded set of files — never the whole table. Compaction turns a base+logs slice into a fresh base slice.`,
      code: `<span class="c">file group a8f (country=BR)</span>
slice t1: base_t1.parquet
slice t2: base_t1.parquet + .log.1   <span class="c"># MoR append</span>
slice t4: base_t4.parquet             <span class="c"># after compaction</span>` },
    { level: 'intermediate', q: 'Copy-on-Write vs Merge-on-Read — how do they differ and when do you choose each?',
      a: `CoW rewrites the affected base files on every write, so reads are clean columnar scans (no merge) — heavier writes, fast reads. Best for read-heavy, lower-churn tables.

MoR appends updates/deletes to Avro log files and merges them with the base on read — cheap, low-latency writes; reads pay a merge until compaction. Best for high-frequency streaming upserts.

It's a per-table choice via hoodie.datasource.write.table.type; MoR then relies on compaction to keep reads fast.` },
    { level: 'intermediate', q: 'How does an upsert work end to end?',
      a: `1. Incoming records are de-duplicated within the batch using the precombine field (highest wins).
2. The index maps each record key to its file group (or tags it new).
3. Records are routed to their file groups.
4. CoW rewrites those base files; MoR appends a log file.
5. A new instant (commit for CoW, deltacommit for MoR) is written and transitioned to completed atomically.` },
    { level: 'intermediate', q: 'What are record key, partition path, and precombine field?',
      a: `• recordkey.field — the primary key uniquely identifying a record; drives index lookups and upsert/delete targeting.
• partitionpath.field — determines the storage partition; a key is unique within its partition (non-global index).
• precombine.field — the tie-breaker when two records share a key in one batch; the larger value wins (last-writer-wins).

Together they give clean, order-independent de-duplication on ingest.` },
    { level: 'advanced', q: 'Explain Hudi indexing and the main index types.',
      a: `The index maps a record key to the file group holding it, so upserts/deletes find the right files without scanning the table.
• Bloom — bloom filters in base-file footers; probe candidates then confirm. Good general default.
• Simple — join incoming keys against stored keys; no filter upkeep.
• Bucket — hash keys into a fixed number of buckets (file groups); O(1) routing, ideal for steady streaming.
• Record-level (RLI) — a metadata-table partition mapping every key → location; fast and global.
• HBase — external store for a global key→location map.

Non-global indexes enforce uniqueness within a partition; global (RLI/HBase) across the whole table.` },
    { level: 'advanced', q: 'What is an incremental query and why is it powerful?',
      a: `An incremental query reads only the records that changed between two instants (begin/end), instead of scanning the whole table. Downstream pipelines — marts, materialized views, replication, fraud scoring — process just the delta each run and record the last instant consumed, so the next run resumes exactly where it left off. This is Hudi's signature capability for efficient, near-real-time chaining.`,
      code: `.<span class="k">option</span>(<span class="s">"hoodie.datasource.query.type"</span>, <span class="s">"incremental"</span>)
.<span class="k">option</span>(<span class="s">"...read.begin.instanttime"</span>, <span class="s">"t2"</span>)` },
    { level: 'advanced', q: 'What do compaction, clustering, and cleaning each do?',
      a: `• Compaction (MoR) merges a file group's log files into a new base file — a fresh slice so reads stop paying a merge.
• Clustering rewrites data into new file groups sorted/sized for better skipping — without changing record values.
• Cleaning removes old file slices beyond the retention policy to reclaim storage while preserving enough history for time travel and in-flight readers.

All can run inline or async so ingestion latency isn't affected.`,
      note: '<strong>ShopKart:</strong> async compaction every few commits, nightly clustering on (country, order_date), cleaning retains the last 10 commits.' },
    { level: 'advanced', q: 'What is the metadata table and why does it matter at scale?',
      a: `An internal Merge-on-Read Hudi table under .hoodie/metadata that stores the file list, per-file column stats, bloom filters, and a record-level index. On object storage, listing millions of files is often the slowest part of planning — the metadata table turns that into a fast lookup and drives data skipping without opening files. Being MoR itself, its own updates are cheap log appends compacted over time.` },
    { level: 'advanced', q: 'How does Hudi handle concurrent writers?',
      a: `A single writer needs no external locking — Hudi serializes its own actions on the timeline, and table services can run async. For multiple independent writers, Hudi uses optimistic concurrency control: each writes optimistically, then takes a brief lock (via a lock provider — Zookeeper, Hive Metastore, DynamoDB, or filesystem) at commit and checks for overlapping file groups. Non-overlapping writes both commit; overlapping ones abort the later writer, which retries.` },
    { level: 'senior', q: 'Compare Hudi, Iceberg, and Delta Lake.',
      a: `All three add ACID, time travel, and schema evolution over columnar files; they differ in metadata design and heritage.
• Hudi — record-key centric with primary keys, pluggable indexes, first-class upserts and incremental queries, CoW/MoR table types. Best for streaming record-level ingestion.
• Iceberg — immutable snapshot tree with a manifest hierarchy; strongly engine-neutral, powerful hidden partitioning + partition evolution.
• Delta — a transaction log of JSON actions replayed from checkpoints; deepest Spark/Databricks integration.

Rule of thumb: Hudi for heavy streaming upserts, Iceberg for multi-engine neutrality at scale, Delta for Databricks-centric platforms.`,
      note: '<strong>ShopKart:</strong> chose Hudi for the orders pipeline because sub-minute CDC upserts and incremental downstream pulls are the dominant access pattern.' },
    { level: 'senior', q: 'Snapshot reads on a MoR table have gotten slow. Diagnose and fix.',
      a: `Slow snapshot reads on MoR almost always mean log files have piled up faster than compaction merges them, so every read merges many logs.

Diagnose: check the number/size of log files per file group and how often compaction actually runs (delta commits since last compaction).

Fix: run/tune compaction (e.g. hoodie.compact.inline.max.delta.commits lower, or a dedicated async compaction job); for read-heavy analytics use the read-optimized view; consider clustering to right-size files. If writes are bursty, raise the trigger interval so each deltacommit adds fewer, larger logs.` },
    { level: 'senior', q: 'How does Hudi recover from a bad batch, and how is that different from time travel?',
      a: `Recovery uses savepoints, restore, and markers. A savepoint pins an instant so cleaning won't remove its files — a guaranteed recovery point. Restore rolls the whole table back to a chosen instant by undoing later commits. Markers track the files a write is creating so a failed write's partial files can be deleted on rollback.

Time travel only reads a past instant (the head doesn't move); restore actually resets the table to that instant. Savepoints ensure the target instant survives cleaning so a restore stays possible within the recovery window.` },
  ];

  TV.HudiInterview = QA;
  function levelLabel(l) { return l === 'basic' ? 'beginner' : l; }

  function render(container) {
    injectStyles();
    let activeFilter = 'all';
    function buildList() {
      const filtered = QA.filter(x => activeFilter === 'all' || x.level === activeFilter);
      if (!filtered.length) return '<div class="hint-empty">No questions match this filter.</div>';
      return `<div class="hint-list">${filtered.map((qa, i) => {
        const gi = QA.indexOf(qa);
        return `<div class="hint-card" data-idx="${gi}">
          <div class="hint-q-row">
            <div class="hint-q-num">${i + 1}</div>
            <div class="hint-q-main">
              <div class="hint-q-text">${qa.q}</div>
              <div class="hint-tags"><span class="hint-tag ${qa.level}">${levelLabel(qa.level)}</span></div>
            </div>
            <div class="hint-q-chevron"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M2 4l4 4 4-4"/></svg></div>
          </div>
          <div class="hint-answer">
            <div class="hint-answer-text">${qa.a}</div>
            ${qa.code ? `<div class="hint-answer-code">${qa.code}</div>` : ''}
            ${qa.note ? `<div class="hint-note">${qa.note}</div>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    }
    container.className = '';
    container.innerHTML = `
<div class="hint-page page-enter">
  <div class="hint-header">
    <div class="hint-header-left"><h1>Interview Mode</h1><p>Apache Hudi — ${QA.length} interview questions across all levels. Click any question to reveal the answer.</p></div>
    <div class="hint-header-right">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Filter:</span>
        <button class="hint-btn active" data-filter="all">All</button>
        <button class="hint-btn" data-filter="basic">Beginner</button>
        <button class="hint-btn" data-filter="intermediate">Intermediate</button>
        <button class="hint-btn" data-filter="advanced">Advanced</button>
        <button class="hint-btn" data-filter="senior">Senior</button>
      </div>
      <span class="hint-progress-text" id="hint-progress">0 / ${QA.length} revealed</span>
    </div>
  </div>
  <div class="hint-body" id="hint-body">${buildList()}</div>
</div>`;
    function updateProgress() {
      const r = container.querySelectorAll('.hint-card.revealed').length;
      const p = container.querySelector('#hint-progress');
      if (p) p.textContent = `${r} / ${QA.length} revealed`;
    }
    function wire() {
      container.querySelector('#hint-body').addEventListener('click', (e) => {
        const card = e.target.closest('.hint-card');
        if (!card) return;
        card.classList.toggle('revealed'); updateProgress();
      });
    }
    wire();
    container.querySelectorAll('.hint-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.hint-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); activeFilter = btn.dataset.filter;
        container.querySelector('#hint-body').innerHTML = buildList(); updateProgress(); wire();
      });
    });
  }

  TV.registerModule('hudi', {
    id: 'interview', title: 'Interview Mode', group: 'learn', format: 'hudi',
    render, destroy() { TV.AnimationControls.hide(); },
  });
})();
