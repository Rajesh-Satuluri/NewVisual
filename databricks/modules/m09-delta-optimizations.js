import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M09 · Governance',
    title: 'Delta Optimizations',
    subtitle: 'OPTIMIZE, ZORDER, liquid clustering, vacuum, auto-compaction',
    tabs: [
      { id: 'compaction', label: '🗜️ OPTIMIZE & Files' },
      { id: 'clustering', label: '🧭 ZORDER & Liquid' },
      { id: 'vacuum',     label: '🧹 VACUUM & Auto' },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-compaction').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The Small-File Problem & OPTIMIZE</div>
        <div class="section-desc">Why thousands of tiny Parquet files cripple query performance — and how bin-packing fixes it</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">~1 GB</div><div class="stat-label">OPTIMIZE target file size</div></div>
        <div class="stat-box"><div class="stat-val">128 MB</div><div class="stat-label">Default maxFileSize (auto)</div></div>
        <div class="stat-box"><div class="stat-val">O(n)</div><div class="stat-label">S3 GETs scale with file count</div></div>
        <div class="stat-box"><div class="stat-val">~10 ms</div><div class="stat-label">Latency per S3 request</div></div>
      </div>

      <div class="prose" style="margin-top:22px">
        <h3>How small files accumulate</h3>
        <p>Streaming micro-batches, frequent <code>INSERT</code>s, and MERGE operations each write new Parquet files on every commit — a Structured Streaming job with a 10-second trigger writes ~8,640 files/day even at trivial volumes. Each file also carries footer metadata and a separate <code>add</code> entry in the transaction log, so the log itself bloats too.</p>
        <p>Reads pay for this directly: the engine must issue an S3 <code>LIST</code> plus a <code>GET</code> per file, each with ~10 ms of round-trip latency. Scanning <strong>10,000 files × 10 ms = ~100 seconds</strong> of pure I/O overhead before a single byte of data is processed. Row groups smaller than the Parquet page size also defeat vectorized reads and compression.</p>
      </div>

      <div class="info-grid" style="margin-top:8px">
        <div class="info-card">
          <div class="info-card-icon">📦</div>
          <div class="info-card-title">Bin-Packing</div>
          <div class="info-card-body">OPTIMIZE reads many small files and rewrites their rows into a smaller number of ~1 GB Parquet files. It's idempotent — files already at target size are skipped. Old files are marked <code>remove</code> in a single atomic commit; new files as <code>add</code>.</div>
          <div class="info-card-tag">bin-packing</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🎯</div>
          <div class="info-card-title">Target File Size</div>
          <div class="info-card-body">Default target is ~1 GB for OPTIMIZE, tunable via <code>delta.targetFileSize</code>. Auto-tuning (<code>delta.tuneFileSizesForRewrites</code>) shrinks targets for MERGE-heavy tables so rewrites touch fewer rows. Photon/Databricks may auto-select based on table size.</div>
          <div class="info-card-tag">delta.targetFileSize</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔒</div>
          <div class="info-card-title">Concurrency-Safe</div>
          <div class="info-card-body">OPTIMIZE only rewrites files — it never changes logical data, so it commits without conflicting with concurrent appends. It does conflict with concurrent DELETE/UPDATE on the same files, which then retry. Runs show up in <code>DESCRIBE HISTORY</code> as an <code>OPTIMIZE</code> operation.</div>
          <div class="info-card-tag">no data change</div>
        </div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Compacting a table (optionally scoped by predicate)</div>
        <div class="code-block"><span class="cmt">-- Compact the whole table into ~1GB files</span>
<span class="kw">OPTIMIZE</span> orders_silver;

<span class="cmt">-- Scope to a partition to avoid rewriting cold data</span>
<span class="kw">OPTIMIZE</span> orders_silver <span class="kw">WHERE</span> order_date >= <span class="str">'2024-01-01'</span>;

<span class="cmt">-- Tune the target file size (bytes) for a MERGE-heavy table</span>
<span class="kw">ALTER TABLE</span> orders_silver
  <span class="kw">SET TBLPROPERTIES</span> (<span class="str">'delta.targetFileSize'</span> = <span class="str">'134217728'</span>);  <span class="cmt">-- 128 MB</span></div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">A <code>WHERE</code> predicate on OPTIMIZE must reference partition columns only — it selects which files to bin-pack, not which rows.</div>
      </div>

      <div class="tip" style="max-width:760px">
        <strong>Rule of thumb:</strong> run OPTIMIZE on a schedule (nightly/weekly) for batch tables, and rely on auto-compaction for streaming tables (see the VACUUM &amp; Auto tab). Compaction reclaims performance; it does <em>not</em> reclaim storage — that's VACUUM's job.
      </div>
    </div>`;

  container.querySelector('#tab-clustering').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Data Skipping: ZORDER vs Liquid Clustering</div>
        <div class="section-desc">Co-locating related values so min/max stats let the engine skip entire files</div>
      </div>

      <div class="prose">
        <h3>Why clustering matters</h3>
        <p>Every Parquet file's <code>add</code> entry stores per-column <strong>min/max statistics</strong>. On a selective filter, the engine skips any file whose range can't contain matching rows — this is <em>data skipping</em>. But it only works if related values are physically <em>co-located</em> in the same files. If <code>user_id = 42</code>'s rows are smeared across every file, every file's min/max spans the whole range and nothing gets skipped.</p>
      </div>

      <div class="info-grid" style="margin-top:8px">
        <div class="info-card">
          <div class="info-card-icon">🧭</div>
          <div class="info-card-title">ZORDER BY</div>
          <div class="info-card-body">A multi-dimensional clustering technique run as part of OPTIMIZE. It orders rows along a space-filling (Z-order) curve so that values close in multiple dimensions land in the same files — tightening min/max ranges and boosting skipping on all ZORDER'd columns simultaneously.</div>
          <div class="info-card-tag">min/max skipping</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔢</div>
          <div class="info-card-title">Which columns?</div>
          <div class="info-card-body">Pick high-cardinality columns you filter or join on frequently (<code>user_id</code>, <code>product_id</code>). Effectiveness drops sharply past ~3–4 columns — the curve can't co-locate along many dimensions at once. Never ZORDER a partition column: pruning already isolates it.</div>
          <div class="info-card-tag">≤ 3–4 columns</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚖️</div>
          <div class="info-card-title">The tradeoff</div>
          <div class="info-card-body">ZORDER is a full rewrite of the targeted data every run — expensive and not incremental. Adding new data degrades the clustering until you re-run it. Choosing the wrong keys wastes the rewrite entirely. It's applied on top of, not instead of, partitioning.</div>
          <div class="info-card-tag">full rewrite</div>
        </div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">ZORDER — run as part of OPTIMIZE</div>
        <div class="code-block"><span class="cmt">-- Cluster files by the columns you filter/join on</span>
<span class="kw">OPTIMIZE</span> events
  <span class="kw">WHERE</span> event_date >= <span class="str">'2024-01-01'</span>
  <span class="kw">ZORDER BY</span> (user_id, product_id);</div>
      </div>

      <div class="prose" style="margin-top:24px">
        <h3>Liquid Clustering — the modern replacement</h3>
        <p>Liquid Clustering (<code>CLUSTER BY</code>, GA in DBR 15.2+) replaces <strong>both</strong> hive-style partitioning <strong>and</strong> ZORDER. You declare clustering keys once; Databricks clusters data <em>incrementally</em> — only newly written or touched data is organized, so there's no full-table rewrite. It avoids the classic over-partitioning trap (millions of tiny partition directories on high-cardinality keys) and lets you change keys without rewriting existing data.</p>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-icon">➕</div>
          <div class="info-card-title">Incremental</div>
          <div class="info-card-body">New data is clustered as it lands (or via <code>OPTIMIZE</code> / predictive auto-clustering) without rewriting the whole table — the opposite of ZORDER's all-or-nothing rebuild.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔄</div>
          <div class="info-card-title">Evolvable keys</div>
          <div class="info-card-body"><code>ALTER TABLE … CLUSTER BY</code> changes the keys anytime; only data written afterward uses the new layout, so there's no costly migration. Use <code>CLUSTER BY AUTO</code> to let Databricks choose keys from query patterns.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🚫</div>
          <div class="info-card-title">No over-partitioning</div>
          <div class="info-card-body">Because it isn't directory-based, high-cardinality keys don't explode into millions of tiny partitions — the small-file problem partitioning normally causes simply doesn't arise.</div>
        </div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Liquid Clustering with CLUSTER BY</div>
        <div class="code-block"><span class="cmt">-- Declare clustering keys at create time (no PARTITIONED BY)</span>
<span class="kw">CREATE TABLE</span> events (
  event_id <span class="kw">BIGINT</span>, user_id <span class="kw">BIGINT</span>, event_time <span class="kw">TIMESTAMP</span>
) <span class="kw">CLUSTER BY</span> (user_id, event_time);

<span class="cmt">-- Change keys later — only affects data written after</span>
<span class="kw">ALTER TABLE</span> events <span class="kw">CLUSTER BY</span> (user_id, product_id);

<span class="cmt">-- Let Databricks pick keys from query history</span>
<span class="kw">ALTER TABLE</span> events <span class="kw">CLUSTER BY</span> <span class="kw">AUTO</span>;

<span class="cmt">-- Trigger clustering of newly written data</span>
<span class="kw">OPTIMIZE</span> events;</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">You cannot combine <code>CLUSTER BY</code> with <code>PARTITIONED BY</code> or ZORDER — liquid clustering subsumes both.</div>
      </div>

      <div class="compare-table-wrap" style="padding-left:0;padding-right:0">
        <table class="compare-table">
          <thead>
            <tr>
              <th>Aspect</th>
              <th>OPTIMIZE</th>
              <th>ZORDER BY</th>
              <th>Liquid Clustering</th>
              <th>VACUUM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Purpose</strong></td>
              <td>Compact small files</td>
              <td>Co-locate values for skipping</td>
              <td>Co-locate values for skipping</td>
              <td>Delete unreferenced files</td>
            </tr>
            <tr>
              <td><strong>Improves reads?</strong></td>
              <td class="tag-good">Yes (fewer files)</td>
              <td class="tag-good">Yes (skipping)</td>
              <td class="tag-good">Yes (skipping)</td>
              <td class="tag-warn">No (reclaims storage)</td>
            </tr>
            <tr>
              <td><strong>Incremental?</strong></td>
              <td class="tag-warn">No (bin-packs each run)</td>
              <td class="tag-bad">No (full rewrite)</td>
              <td class="tag-good">Yes</td>
              <td class="tag-good">Yes</td>
            </tr>
            <tr>
              <td><strong>Change keys later</strong></td>
              <td>n/a</td>
              <td class="tag-bad">Rewrite required</td>
              <td class="tag-good">No rewrite</td>
              <td>n/a</td>
            </tr>
            <tr>
              <td><strong>Replaces</strong></td>
              <td>—</td>
              <td>—</td>
              <td class="tag-good">ZORDER + partitioning</td>
              <td>—</td>
            </tr>
            <tr>
              <td><strong>Touches data files</strong></td>
              <td class="tag-warn">Rewrites</td>
              <td class="tag-warn">Rewrites</td>
              <td class="tag-warn">Rewrites (incremental)</td>
              <td class="tag-bad">Physically deletes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-vacuum').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">VACUUM & Automatic Maintenance</div>
        <div class="section-desc">Reclaiming storage safely, and keeping streaming tables tidy without manual jobs</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">7 days</div><div class="stat-label">Default VACUUM retention</div></div>
        <div class="stat-box"><div class="stat-val">168 h</div><div class="stat-label">Retention safety threshold</div></div>
        <div class="stat-box"><div class="stat-val">DRY RUN</div><div class="stat-label">Preview before deleting</div></div>
        <div class="stat-box"><div class="stat-val">128 MB</div><div class="stat-label">autoCompact rollup target</div></div>
      </div>

      <div class="prose" style="margin-top:22px">
        <h3>What VACUUM actually deletes</h3>
        <p>OPTIMIZE, MERGE, DELETE and UPDATE mark old Parquet files as <code>remove</code> in the log, but the physical files stay on storage — that's what makes time travel possible. <strong>VACUUM physically deletes</strong> data files that are no longer referenced by the current table version <em>and</em> are older than the retention window (default <strong>7 days / 168 hours</strong>). It also removes files left behind by failed or uncommitted writes.</p>
        <p><strong>Interaction with time travel:</strong> once VACUUM removes a file, any table version that depended on it can no longer be read — <code>VERSION AS OF</code> / <code>TIMESTAMP AS OF</code> to before the retention window fails with <code>FileNotFoundException</code>. Retention is therefore the real bound on how far back you can time-travel <em>data</em> (log retention, <code>delta.logRetentionDuration</code>, defaults to 30 days and bounds metadata separately).</p>
      </div>

      <div style="margin-top:8px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">VACUUM — preview then reclaim</div>
        <div class="code-block"><span class="cmt">-- See which files WOULD be deleted, without deleting</span>
<span class="kw">VACUUM</span> orders_silver <span class="kw">DRY RUN</span>;

<span class="cmt">-- Delete unreferenced files older than the default 7 days</span>
<span class="kw">VACUUM</span> orders_silver;

<span class="cmt">-- Custom retention (hours). Below 168h Databricks BLOCKS you</span>
<span class="cmt">-- unless the safety check is disabled — risks corrupting</span>
<span class="cmt">-- readers/time-travel that still reference those files.</span>
<span class="kw">VACUUM</span> orders_silver <span class="kw">RETAIN</span> <span class="num">720</span> <span class="kw">HOURS</span>;  <span class="cmt">-- 30 days</span>

<span class="cmt">-- Extend how far back time travel can reach</span>
<span class="kw">ALTER TABLE</span> orders_silver <span class="kw">SET TBLPROPERTIES</span> (
  <span class="str">'delta.deletedFileRetentionDuration'</span> = <span class="str">'interval 30 days'</span>
);</div>
      </div>

      <div class="tip" style="max-width:760px">
        <strong>Never</strong> lower <code>RETAIN</code> below the duration of your longest-running concurrent reader/streaming query. VACUUM does not honor snapshot isolation for in-flight readers that reference already-removed files, so an aggressive retention can delete files a running query still needs.
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">Optimized Writes & Auto-Compaction</div>
        <div class="section-desc">Hands-off maintenance for streaming and incremental tables</div>
      </div>

      <div class="config-grid" style="margin-top:8px">
        <div class="config-card">
          <div class="config-name">delta.autoOptimize.optimizeWrite</div>
          <div class="config-val">= true</div>
          <div class="config-desc">Optimized Writes: shuffles data <em>before</em> writing so each partition emits fewer, larger files — fixing small files at write time instead of after. Adds a shuffle, so a small write cost for a big read win.</div>
          <div class="config-impact impact-high">High impact</div>
        </div>
        <div class="config-card">
          <div class="config-name">delta.autoOptimize.autoCompact</div>
          <div class="config-val">= true</div>
          <div class="config-desc">Auto-Compaction: after a write commits, if a partition has many small files, Delta synchronously runs a mini-OPTIMIZE rolling them up toward ~128 MB. No separate scheduled job needed for streaming tables.</div>
          <div class="config-impact impact-high">High impact</div>
        </div>
        <div class="config-card">
          <div class="config-name">spark.databricks.delta.autoCompact.enabled</div>
          <div class="config-val">= true (session/cluster)</div>
          <div class="config-desc">Session-level switch to enable auto-compaction across writes without setting the table property. Table-level TBLPROPERTIES take precedence and are the durable, per-table choice.</div>
          <div class="config-impact impact-medium">Medium impact</div>
        </div>
        <div class="config-card">
          <div class="config-name">delta.tuneFileSizesForRewrites</div>
          <div class="config-val">= true</div>
          <div class="config-desc">Shrinks target file sizes on MERGE/UPDATE-heavy tables so each rewrite touches fewer rows — trading some read-side file count for cheaper writes.</div>
          <div class="config-impact impact-low">Low impact</div>
        </div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Enable auto-maintenance on a streaming table</div>
        <div class="code-block"><span class="kw">ALTER TABLE</span> events_stream <span class="kw">SET TBLPROPERTIES</span> (
  <span class="str">'delta.autoOptimize.optimizeWrite'</span> = <span class="str">'true'</span>,
  <span class="str">'delta.autoOptimize.autoCompact'</span>   = <span class="str">'true'</span>
);</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Auto-compaction targets ~128 MB files (smaller than OPTIMIZE's 1 GB) to keep post-write latency low. For the largest read gains, still schedule a periodic <code>OPTIMIZE</code> (with ZORDER, or rely on liquid clustering).</div>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the small-file problem in Delta Lake and how does OPTIMIZE fix it?',
      a: 'Streaming ingestion and frequent small batch writes create thousands of tiny Parquet files (sometimes a few KB each). Reading a query requires opening each file — O(n) S3 LIST + GET requests, each with ~10ms latency. 10,000 files × 10ms = 100 seconds of overhead before reading a single byte. OPTIMIZE compacts small files into target-size Parquet files (~1GB), dramatically reducing the file count. After OPTIMIZE, a query that scanned 10,000 files might scan 5 — 2000× fewer S3 requests. Run OPTIMIZE on a schedule (nightly or weekly) or use auto-compaction (spark.databricks.delta.autoCompact.enabled=true) for streaming tables.'
    },
    {
      q: 'What is ZORDER and when should you use it instead of partition pruning?',
      a: 'ZORDER BY (col1, col2) reorders rows within Parquet files so related values are co-located, improving data skipping (Delta\'s min/max statistics per file). Use ZORDER when: (1) your query filter columns have high cardinality (user_id, product_id) — traditional partitioning would create millions of tiny partitions; (2) you filter on 2+ correlated columns (date + category). ZORDER is limited to ~4 columns — each additional column gives diminishing returns. Don\'t ZORDER on partition columns — pruning already handles them. Liquid clustering (GA in DBR 13.3+) replaces ZORDER for new tables — it\'s incremental (no full rewrite) and automatically adjusts clustering keys via statistics.'
    },
    {
      q: 'How does liquid clustering differ from ZORDER + partitioning, and why is it preferred for new tables?',
      a: 'ZORDER is a full rewrite of the targeted data on every OPTIMIZE run: it re-sorts rows along a space-filling curve, so newly appended data degrades the clustering until you re-run it, and changing the clustering columns means rewriting the whole table. Hive-style partitioning, meanwhile, over-partitions on high-cardinality keys — millions of tiny directories, each with tiny files. Liquid clustering (CLUSTER BY) replaces both. It clusters incrementally — only new or touched data is organized, no full-table rewrite — and it isn\'t directory-based, so high-cardinality keys don\'t explode into tiny partitions. Clustering keys are evolvable: ALTER TABLE … CLUSTER BY changes them with no rewrite of existing data, applying only to data written afterward, and CLUSTER BY AUTO lets Databricks pick keys from query patterns. You cannot combine CLUSTER BY with PARTITIONED BY or ZORDER. The tradeoff: it needs a recent DBR and you still schedule periodic OPTIMIZE to cluster newly landed data.'
    },
    {
      q: 'Explain VACUUM, its default retention, and how it interacts with time travel.',
      a: 'OPTIMIZE/MERGE/DELETE/UPDATE mark superseded Parquet files as "remove" in the transaction log but leave the physical files on storage — that\'s what enables time travel. VACUUM physically deletes data files that are no longer referenced by the current version AND are older than the retention window (default 7 days / 168 hours); it also cleans up files from failed writes. The consequence: after VACUUM, any historical version depending on a deleted file can no longer be read — VERSION AS OF / TIMESTAMP AS OF to before the retention window fails with FileNotFoundException. So deletedFileRetentionDuration effectively bounds how far back you can time-travel the data (log retention, default 30 days, bounds metadata separately). Databricks blocks RETAIN below 168 hours unless you disable the safety check, because VACUUM does not honor snapshot isolation for in-flight readers — an aggressive retention can delete files a long-running query or streaming reader still needs. Always DRY RUN first.'
    },
  ]);
}
