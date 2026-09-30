import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M05 · Compute',
    title: 'Photon Engine',
    subtitle: 'Vectorized C++ engine — column batches, cache-friendly ops, vs JVM Spark',
    tabs: [
      { id: 'vectorized', label: '⚡ Vectorized Model' },
      { id: 'operators',  label: '🧩 Native Operators' },
      { id: 'plans',      label: '📈 Plans & Benchmarks' },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-vectorized').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Vectorized Execution Model</div>
        <div class="section-desc">Photon rewrites Spark's execution layer in C++, processing column batches instead of one row at a time</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">C++</div><div class="stat-label">Native engine (no JVM)</div></div>
        <div class="stat-box"><div class="stat-val">~1,024</div><div class="stat-label">Rows per column batch</div></div>
        <div class="stat-box"><div class="stat-val">AVX</div><div class="stat-label">SIMD instruction set</div></div>
        <div class="stat-box"><div class="stat-val">2–4×</div><div class="stat-label">Typical SQL speedup</div></div>
      </div>

      <div style="margin-top:24px;display:flex;flex-direction:column;gap:14px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:10px">Row-at-a-time (Volcano / vanilla JVM Spark)</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Each operator's <code>next()</code> returns one row. Every value flows through a chain of virtual function calls, one row at a time. Primitives get boxed into <code>Long</code>/<code>Integer</code> objects, the branch predictor stalls on per-row conditionals, and the CPU spends most cycles on dispatch overhead rather than actual arithmetic. Whole-stage codegen (Spark 2.x Tungsten) helped, but still runs on the JVM with GC pauses.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid var(--green)">
          <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:10px">Vectorized (Photon)</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Each operator processes a <strong style="color:var(--text)">batch</strong> — a chunk of ~1,024 values from a single column stored contiguously. A tight C++ loop applies one operation across the whole batch, so dispatch cost is amortized over 1,024 values instead of paid per row. Contiguous columnar layout keeps the CPU cache hot and lets SIMD registers load 8–16 values at once.</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title" style="font-size:15px">Four sources of speedup</div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-icon">🧮</div>
          <div class="info-card-title">SIMD (data parallelism)</div>
          <div class="info-card-body">One AVX-256/AVX-512 instruction applies the same op to 8–16 packed values simultaneously. A filter like <code>price > 100</code> compares a whole vector register in a single instruction instead of one comparison per row.</div>
          <span class="info-card-tag">AVX-512</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🗂️</div>
          <div class="info-card-title">Cache-friendly layout</div>
          <div class="info-card-body">A column of <code>int64</code> is one contiguous array — sequential memory access, no pointer chasing. The CPU prefetcher streams the next cache line while the current batch is processed, so L1/L2 stay warm.</div>
          <span class="info-card-tag">columnar</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🚫</div>
          <div class="info-card-title">No JVM overhead</div>
          <div class="info-card-body">Native C++ means no garbage collection pauses, no primitive boxing/unboxing, and no per-row virtual dispatch. Memory is managed off-heap by Photon itself, eliminating GC stalls on large shuffles and aggregations.</div>
          <span class="info-card-tag">off-heap</span>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📦</div>
          <div class="info-card-title">Batch amortization</div>
          <div class="info-card-body">Function-call and interpretation overhead is paid once per ~1,024-row batch rather than once per row. Tight loops the compiler can auto-vectorize and unroll replace millions of individual method invocations.</div>
          <span class="info-card-tag">~1,024 rows</span>
        </div>
      </div>

      <div class="tip" style="margin-top:20px;max-width:760px">Photon operates on Parquet/Delta data that is already columnar on disk. Because the storage format and the execution model are both column-oriented, Photon reads column batches straight into vectorized operators with no row-to-column transposition.</div>
    </div>`;

  container.querySelector('#tab-operators').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Which Operators Are Photon-Native</div>
        <div class="section-desc">Photon accelerates a query only for the operators it has re-implemented in C++ — the rest fall back to JVM Spark</div>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr><th>Operator / Workload</th><th>Photon support</th><th>Why</th></tr>
          </thead>
          <tbody>
            <tr><td>Scan (Parquet / Delta)</td><td class="tag-good">Native ✓</td><td>Columnar reader feeds batches directly into vectorized ops</td></tr>
            <tr><td>Filter / projection</td><td class="tag-good">Native ✓</td><td>SIMD predicate evaluation over column batches</td></tr>
            <tr><td>Hash join</td><td class="tag-good">Native ✓</td><td>Vectorized hash-table build &amp; probe</td></tr>
            <tr><td>Hash aggregate (GROUP BY)</td><td class="tag-good">Native ✓</td><td>Vectorized grouping and accumulation</td></tr>
            <tr><td>Sort</td><td class="tag-good">Native ✓</td><td>Cache-efficient native sort over batches</td></tr>
            <tr><td>Delta MERGE / OPTIMIZE / DELETE</td><td class="tag-good">Native ✓</td><td>Write path accelerated in DBR with Photon</td></tr>
            <tr><td>Window functions</td><td class="tag-warn">Partial</td><td>Common frames covered; unsupported shapes fall back</td></tr>
            <tr><td>Python / Pandas UDF</td><td class="tag-bad">Fallback ✗</td><td>Runs in a separate Python process; Arrow (de)serialization dominates</td></tr>
            <tr><td>Scala / custom RDD ops</td><td class="tag-bad">Fallback ✗</td><td>Arbitrary JVM closures Photon cannot introspect</td></tr>
            <tr><td>Spark ML pipelines</td><td class="tag-bad">Fallback ✗</td><td>Iterative JVM/MLlib algorithms, not vectorized SQL operators</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-header" style="margin-top:24px">
        <div class="section-title" style="font-size:15px">The fallback rule</div>
      </div>
      <div class="prose">
        <p>Photon works <strong>per operator within a stage</strong>, not per query. If a plan mixes native and unsupported operators, Photon runs the supported subtree and hands rows to JVM Spark at a <strong>transition boundary</strong>, where data is converted from Photon's columnar batches back into Spark's row format. These transitions cost CPU, so a single unsupported operator in a hot path can erase most of Photon's benefit.</p>
        <h3>Practical guidance</h3>
        <ul>
          <li>Replace Python UDFs with built-in SQL functions or <code>pandas_udf</code> only where unavoidable — every UDF forces a Photon→Spark→Python round trip.</li>
          <li>Prefer SQL / DataFrame expressions over <code>map</code>/<code>mapPartitions</code> on RDDs.</li>
          <li>Photon has no effect on the driver, on small metadata-only queries, or on jobs bottlenecked by shuffle network / object-store I/O rather than CPU.</li>
        </ul>
      </div>

      <div class="tip" style="max-width:760px">Enable Photon at the cluster level: it is on by default for SQL Warehouses and selectable via the "Use Photon Acceleration" checkbox on all-purpose and jobs clusters (Databricks Runtime "Photon" variants). Photon costs more DBUs per hour but usually lowers total job cost by finishing faster.</div>
    </div>`;

  container.querySelector('#tab-plans').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Reading the Plan &amp; Benchmark Reality</div>
        <div class="section-desc">How to confirm Photon actually ran, and how the numbers compare to vanilla JVM Spark</div>
      </div>

      <div class="section-header" style="margin-top:4px">
        <div class="section-title" style="font-size:15px">Spotting Photon nodes in the query plan</div>
      </div>
      <div style="max-width:760px;font-size:12px;color:var(--text2);line-height:1.7;margin-bottom:16px">
        In the Spark UI SQL tab or via <code>EXPLAIN FORMATTED</code>, Photon operators are prefixed with <strong style="color:var(--text)">Photon</strong> — e.g. <code>PhotonScan</code>, <code>PhotonFilter</code>, <code>PhotonHashAggregate</code>, <code>PhotonShuffleExchange</code>. A boundary back to JVM Spark shows up as a <code>PhotonResultStage</code> / row-to-columnar transition or a plain (non-Photon) node re-appearing mid-plan.
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">EXPLAIN — Photon vs fallback</div>
        <div class="code-block"><span class="cmt">-- Fully Photon-accelerated (good)</span>
== Physical Plan ==
<span class="kw">PhotonResultStage</span>
  +- <span class="kw">PhotonHashAggregate</span>(keys=[region], functions=[sum(amount)])
     +- <span class="kw">PhotonShuffleExchange</span> hashpartitioning(region, <span class="num">200</span>)
        +- <span class="kw">PhotonHashAggregate</span>(partial, keys=[region])
           +- <span class="kw">PhotonFilter</span> (amount > <span class="num">0</span>)
              +- <span class="kw">PhotonScan</span> parquet orders[region, amount]

<span class="cmt">-- Broken by a Python UDF (bad — note the transition)</span>
== Physical Plan ==
HashAggregate(keys=[region])
+- <span class="str">RowToColumnar</span>          <span class="cmt">← Photon boundary, extra CPU</span>
   +- BatchEvalPython [my_udf(amount)]   <span class="cmt">← JVM/Python, not Photon</span>
      +- <span class="str">ColumnarToRow</span>
         +- <span class="kw">PhotonScan</span> parquet orders</div>
        <div class="tip" style="margin-top:12px">If you see <code>ColumnarToRow</code> / <code>RowToColumnar</code> stacked around a node, that node fell out of Photon. Removing it (or replacing the UDF) usually restores full acceleration.</div>
      </div>

      <div class="section-header" style="margin-top:28px">
        <div class="section-title" style="font-size:15px">Benchmark comparison — Photon vs vanilla JVM Spark</div>
      </div>
      <div class="config-grid">
        <div class="config-card">
          <div class="config-name">Large scan + filter</div>
          <div class="config-val">TB-scale Parquet, selective predicate</div>
          <div class="config-desc">CPU-bound predicate evaluation is exactly Photon's sweet spot — SIMD filters plus data skipping.</div>
          <div class="config-impact impact-high">~3–4× faster</div>
        </div>
        <div class="config-card">
          <div class="config-name">GROUP BY aggregation</div>
          <div class="config-val">High-cardinality hash aggregate</div>
          <div class="config-desc">Vectorized hash table with no GC pressure; a classic 2–4× win over JVM whole-stage codegen.</div>
          <div class="config-impact impact-high">~2–4× faster</div>
        </div>
        <div class="config-card">
          <div class="config-name">Hash join</div>
          <div class="config-val">Fact × dimension, build + probe</div>
          <div class="config-desc">Native build/probe loops; gains largest when the build side fits in cache.</div>
          <div class="config-impact impact-medium">~2–3× faster</div>
        </div>
        <div class="config-card">
          <div class="config-name">Delta MERGE / OPTIMIZE</div>
          <div class="config-val">Write-heavy upserts &amp; compaction</div>
          <div class="config-desc">Accelerated write path; meaningful but smaller than pure read-scan gains.</div>
          <div class="config-impact impact-medium">~1.5–3× faster</div>
        </div>
        <div class="config-card">
          <div class="config-name">Python UDF query</div>
          <div class="config-val">Per-row Python transformation</div>
          <div class="config-desc">Serialization to the Python worker dominates; Photon can't touch the UDF itself.</div>
          <div class="config-impact impact-low">≈ no change</div>
        </div>
        <div class="config-card">
          <div class="config-name">Shuffle / network-bound job</div>
          <div class="config-val">Bottleneck is I/O, not CPU</div>
          <div class="config-desc">Photon speeds CPU work, so gains are muted when time is spent moving bytes over the network or to object storage.</div>
          <div class="config-impact impact-low">marginal</div>
        </div>
      </div>

      <div class="tip" style="margin-top:20px;max-width:760px">Vendor TPC-DS-style benchmarks often quote higher aggregate numbers, but the honest interview answer is "2–4× on SQL/BI-heavy workloads, near-zero on UDF- or I/O-bound jobs." Always frame speedup as workload-dependent.</div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is vectorized execution and why is it faster than row-at-a-time processing?',
      a: 'Vectorized execution processes data in column-oriented batches (e.g., 1,024 rows at once for a single column) rather than one complete row at a time. Benefits: (1) CPU SIMD instructions (AVX-512) apply one operation to 8–16 values simultaneously; (2) a column of integers is contiguous in memory — cache-friendly, no pointer chasing; (3) tight C++ loops with no JVM overhead (no GC pauses, no boxing of primitives). JVM Spark processes each row through a virtual function dispatch chain — slow for tight aggregation loops. Photon re-implements operators (scan, filter, hash join, aggregate) in native C++ with vectorized loops, yielding 2–4× speedups on SQL-heavy workloads.'
    },
    {
      q: 'Which workloads benefit most from Photon, and which do not?',
      a: 'Photon shines on SQL/BI workloads: large scans with filters, hash aggregations (GROUP BY), hash joins, and sort operations — all hot paths in Photon\'s vectorized operators. It also speeds up Delta MERGE and OPTIMIZE. Photon does NOT help with: (1) Python UDFs — Python code runs outside Photon, serialization is the bottleneck; (2) complex Spark ML pipelines (e.g., gradient boosting iterations); (3) custom RDD operations written in Scala. The rule of thumb: if the query plan shows mostly standard SQL operators (Scan, HashAggregate, SortMergeJoin), Photon will accelerate it. If the plan has PythonUDF or ArrowEvalPython nodes, Photon\'s impact is minimal.'
    },
    {
      q: 'A query is running on a Photon-enabled cluster but you see no speedup. How do you diagnose it?',
      a: 'First confirm Photon actually engaged: open the Spark UI SQL tab or run EXPLAIN FORMATTED and look for Photon-prefixed nodes (PhotonScan, PhotonFilter, PhotonHashAggregate). If you see ColumnarToRow / RowToColumnar transitions or plain non-Photon operators mid-plan, part of the query fell back to JVM Spark — the usual culprit is a Python UDF (BatchEvalPython/ArrowEvalPython node), a Scala closure, or an unsupported expression, and Photon runs everything up to that boundary but hands rows back to Spark there. If the plan IS fully Photon but there is still no gain, the job is probably not CPU-bound: it is dominated by shuffle/network, object-store I/O, small data, or driver-side work, none of which Photon accelerates. Fixes: replace UDFs with built-in SQL functions, remove the fallback operator, or accept that an I/O-bound job simply will not benefit from a faster CPU engine.'
    },
  ]);
}
