import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Foundation',
    title: 'Delta Lake Internals',
    subtitle: 'Transaction log, ACID on object storage, time travel, schema enforcement',
    tabs: [
      { id: 'txlog',    label: '📋 Transaction Log' },
      { id: 'acid',     label: '🔒 ACID Operations' },
      { id: 'timetravel', label: '🕐 Time Travel' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-txlog').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The Delta Transaction Log (_delta_log)</div>
        <div class="section-desc">Every change to a Delta table is recorded as a JSON commit file — this log IS the table</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">JSON</div><div class="stat-label">Commit format</div></div>
        <div class="stat-box"><div class="stat-val">10</div><div class="stat-label">Commits → Parquet checkpoint</div></div>
        <div class="stat-box"><div class="stat-val">O(log n)</div><div class="stat-label">Log replay with checkpoints</div></div>
        <div class="stat-box"><div class="stat-val">7 days</div><div class="stat-label">Default retention (VACUUM)</div></div>
      </div>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:14px;max-width:720px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">File Layout on S3</div>
          <pre style="font-size:12px;color:var(--text2);line-height:1.8;margin:0">s3://bucket/my-table/
├── _delta_log/
│   ├── 00000000000000000000.json   ← CREATE TABLE commit
│   ├── 00000000000000000001.json   ← first INSERT
│   ├── 00000000000000000009.json   ← 9th commit
│   ├── 00000000000000000010.parquet ← checkpoint (log compaction)
│   ├── 00000000000000000011.json   ← next commit after checkpoint
│   └── _last_checkpoint             ← pointer to latest checkpoint
├── part-00000-abc123.snappy.parquet  ← data files (immutable)
├── part-00001-def456.snappy.parquet
└── part-00002-ghi789.snappy.parquet</pre>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">What a commit JSON contains</div>
          <pre style="font-size:12px;color:var(--text2);line-height:1.8;margin:0">{
  "add": {
    "path": "part-00000-abc123.snappy.parquet",
    "size": 1048576,
    "modificationTime": 1704067200000,
    "stats": "{\"numRecords\":50000,\"minValues\":{\"order_id\":1},
               \"maxValues\":{\"order_id\":50000}}"
  }
}
{
  "remove": {
    "path": "part-00001-old.snappy.parquet",
    "deletionTimestamp": 1704067200000   ← file still exists until VACUUM
  }
}</pre>
        </div>
      </div>
      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">📊</div>
          <div class="info-card-title">Min/Max Statistics</div>
          <div class="info-card-body">Every "add" action stores per-column min/max values. Readers skip files where the filter range falls outside these bounds — this is Delta's "data skipping" and can reduce I/O by 90%+ on selective queries.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🗜️</div>
          <div class="info-card-title">Checkpoint Files</div>
          <div class="info-card-body">Every 10 commits, Delta writes a Parquet checkpoint containing the full current table state. Reading log from scratch becomes O(1) — just read the latest checkpoint + commits after it, not the entire history.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔢</div>
          <div class="info-card-title">Commit Protocol</div>
          <div class="info-card-body">Writers attempt to atomically create the next JSON file (S3 put-if-absent). If another writer succeeds first, the losing writer retries by re-reading the log and resolving conflicts — this is Delta's optimistic concurrency control.</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-acid').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">ACID Guarantees on Object Storage</div>
        <div class="section-desc">How Delta achieves database-grade reliability on S3/ADLS/GCS</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:760px">
        ${[
          {letter:'A', word:'Atomicity', color:'#FF6900', body:'A write either fully succeeds or fully fails — no partial states. Implemented by writing all new Parquet files first, then atomically writing the commit JSON. If the commit file write fails, the new data files are orphaned but invisible to readers — they\'re cleaned up by VACUUM.'},
          {letter:'C', word:'Consistency', color:'#e05800', body:'Schema is enforced on every write. If you try to INSERT a string into an integer column, the write fails before the commit is written. Schema evolution (adding columns) requires an explicit ALTER TABLE or mergeSchema option — accidental schema changes are rejected.'},
          {letter:'I', word:'Isolation', color:'#c04800', body:'Snapshot isolation: every reader sees a consistent snapshot at the version when their query started. Concurrent writers use optimistic concurrency — last writer to commit on non-overlapping files both succeed; conflicting writes (same file ranges) cause a ConcurrentModificationException, and the transaction retries.'},
          {letter:'D', word:'Durability', color:'#9e3a00', body:'Once the commit JSON file is written to S3 (which has 99.999999999% durability), the transaction is permanent. S3 itself handles replication across availability zones. Delta never modifies or deletes committed data files — they\'re immutable; only the log records them as "removed."'},
        ].map(a => `
          <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid ${a.color};display:flex;gap:16px">
            <div style="font-size:28px;font-weight:900;color:${a.color};flex-shrink:0;width:28px">${a.letter}</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">${a.word}</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.7">${a.body}</div>
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:720px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">MERGE INTO — most complex ACID operation</div>
        <div class="code-block"><span class="kw">MERGE INTO</span> orders_silver <span class="kw">AS</span> target
<span class="kw">USING</span> orders_bronze <span class="kw">AS</span> source
<span class="kw">ON</span> target.order_id = source.order_id
<span class="kw">WHEN MATCHED AND</span> source.status != target.status <span class="kw">THEN</span>
  <span class="kw">UPDATE SET</span> target.status = source.status, target.updated_at = source.event_time
<span class="kw">WHEN NOT MATCHED THEN</span>
  <span class="kw">INSERT</span> (order_id, status, created_at) <span class="kw">VALUES</span> (source.order_id, source.status, source.event_time);</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Delta finds candidate files via statistics → reads only those files → writes new Parquet files for matched rows → writes single atomic commit marking old files as "remove" and new files as "add".</div>
      </div>
    </div>`;

  container.querySelector('#tab-timetravel').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Time Travel</div>
        <div class="section-desc">Query any historical version — no backup infrastructure required</div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-icon">🔢</div>
          <div class="info-card-title">By Version Number</div>
          <div class="info-card-body"><code>SELECT * FROM orders VERSION AS OF 42</code><br/>Each commit increments the version counter by 1. Version 0 = table creation.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📅</div>
          <div class="info-card-title">By Timestamp</div>
          <div class="info-card-body"><code>SELECT * FROM orders TIMESTAMP AS OF '2024-01-15 12:00:00'</code><br/>Delta finds the latest version committed before the given timestamp.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">↩️</div>
          <div class="info-card-title">RESTORE TABLE</div>
          <div class="info-card-body"><code>RESTORE TABLE orders TO VERSION AS OF 38</code><br/>Adds a new commit entry pointing to the old snapshot's files — the bad commits remain in the log for audit purposes.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📜</div>
          <div class="info-card-title">DESCRIBE HISTORY</div>
          <div class="info-card-body"><code>DESCRIBE HISTORY orders</code><br/>Shows all commits: version, timestamp, operation (WRITE, MERGE, DELETE, OPTIMIZE), userId, and affected rows.</div>
        </div>
      </div>
      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:720px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">How time travel works at the file level</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          <p>1. Delta replays the _delta_log up to the target version/timestamp.</p>
          <p>2. Builds a snapshot: only "add" entries NOT followed by a "remove" before the target time are included.</p>
          <p>3. The underlying Parquet files are still on disk — Delta never deletes them on write, only the log entry changes.</p>
          <p>4. <strong style="color:var(--text)">VACUUM</strong> physically deletes files whose deletionTimestamp is older than the retention window (default 7 days). After VACUUM, time travel to before that window fails with FileNotFoundException.</p>
          <p style="margin-bottom:0">To extend retention: <code style="background:var(--bg3);padding:1px 6px;border-radius:4px;font-size:11px">ALTER TABLE orders SET TBLPROPERTIES ('delta.logRetentionDuration' = 'interval 30 days')</code></p>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Walk me through what happens internally when you run MERGE INTO on a Delta table.',
      a: 'MERGE INTO target USING source ON condition WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT: (1) Spark reads the Delta log to determine the current snapshot — which Parquet files are active. (2) Source is computed (broadcast if small, otherwise hash-partitioned). (3) Delta finds candidate files by checking min/max statistics in the log — files whose ranges overlap the join condition. Only candidate files are read. (4) For each candidate file: rows matching the WHEN MATCHED condition are updated (written to a new Parquet file); rows not in source are passed through; new rows from source are appended. (5) Old candidate files are marked as "remove" in the new commit file; new files are marked "add". (6) Delta writes the commit atomically to _delta_log. If another writer commits concurrently on overlapping files, this MERGE gets a conflict exception and retries from step 1.'
    },
    {
      q: 'How does Delta Lake\'s time travel work at the file level?',
      a: 'Every Delta commit adds a JSON file to _delta_log/ listing "add" (new Parquet files) and "remove" (obsoleted Parquet files with deletionTimestamp). Time travel (VERSION AS OF 5 or TIMESTAMP AS OF \'2024-01-15\') reconstructs the snapshot at that point by replaying the log up to the target version/timestamp: only "add" entries that were not "removed" before the target time are included. The underlying Parquet files are never deleted — only the log entry changes. VACUUM removes Parquet files whose deletionTimestamp is older than the retention period (default 7 days). After VACUUM, time travel to before the vacuum period fails with FileNotFoundException. Key: the transaction log is the source of truth; Parquet files are immutable data that multiple snapshot versions can reference simultaneously.'
    },
    {
      q: 'What is optimistic concurrency control in Delta and when does it fail?',
      a: 'Delta uses optimistic concurrency: writers assume there\'s no conflict, write their data files, then attempt to atomically commit their JSON log file as the next version. If two writers try to commit version N simultaneously, S3\'s put-if-absent semantics ensure only one succeeds. The losing writer re-reads the log from the last version it saw, checks whether the winning commit overlaps with its own changes (same file ranges → conflict; different partitions → compatible), and either retries successfully or throws ConcurrentModificationException. Operations that always conflict: two concurrent DELETE/UPDATE on overlapping rows. Operations that are compatible: two INSERT-only writers appending to different partitions.'
    },
  ]);
}
