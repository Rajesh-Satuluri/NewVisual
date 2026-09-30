/* ============================================================
   deepdives/lsm-tree.js — "LSM-Tree" deep dive.
   Registers DBLab.deepDives['lsm-tree'] (concept m41).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  function KV(k, v, tomb) { return { k: k, v: v, tomb: !!tomb }; }
  function SST(name, range, mark, bloom) { return { name: name, range: range, mark: mark || null, bloom: bloom || null }; }

  // Scene: ShopKart write-heavy event log ingested into an LSM store.
  var STEPS = [
    {
      label: "1 · Write path: WAL + MemTable",
      what: "A write (<code>PUT sku42 = 100</code>) does two cheap things: appends to a <b>WAL</b> for durability, and inserts into the <b>MemTable</b> — an in-memory sorted structure. That's it. No random disk I/O, no in-place update.",
      why: "This is what makes an LSM-Tree <b>write-optimized</b>: every write is a sequential log append plus a memory insert. Ingest throughput is enormous compared to updating a B+ Tree in place on disk.",
      how: "The WAL append makes the write durable immediately. The MemTable (often a skip list or balanced tree) keeps keys sorted in RAM so it can later be flushed as a sorted file.",
      when: "Every write in an LSM store — Cassandra, RocksDB, LevelDB, ScyllaDB, HBase.",
      mistake: "Thinking the write updates on-disk data. It doesn't touch the data files at all — it appends to the log and mutates memory.",
      interview: "“Why are LSM writes fast?” Each write is a sequential WAL append + an in-memory insert — no random disk writes, no read-modify-write of a page.",
      example: "ShopKart's clickstream events pour into the store: each is a WAL append + MemTable insert, sustaining a very high write rate.",
      viz: { wal: 1, memtable: [KV(42, 100)], levels: [{ name: "L0", ssts: [] }, { name: "L1", ssts: [] }],
        note: "Write = sequential WAL append + in-memory sorted insert. No random I/O → write-optimized." }
    },
    {
      label: "2 · Writes accumulate in memory",
      what: "More writes land: <code>PUT 77=50</code>, <code>PUT 99=200</code>. The MemTable holds them <b>sorted by key</b>, absorbing a burst of writes entirely in RAM (each also logged to the WAL).",
      why: "Batching writes in a sorted in-memory buffer means the eventual disk write can be one big <b>sequential</b> flush of already-sorted data — the opposite of scattering random page updates across a B+ Tree.",
      how: "Inserts keep the MemTable sorted; updates and deletes to the same key just add newer entries (last-writer-wins is resolved at read/compaction time).",
      when: "Continuously between flushes — the MemTable fills until it hits its size threshold.",
      mistake: "Worrying that unflushed writes aren't durable. They are — the WAL made each durable on write; the MemTable is just the not-yet-flushed sorted copy.",
      interview: "“If the MemTable is in RAM, how are recent writes durable?” The WAL. A crash replays the WAL to rebuild the MemTable; nothing committed is lost.",
      example: "Thousands of ShopKart events buffer in the MemTable, sorted and durable-via-WAL, waiting to be flushed together.",
      viz: { wal: 3, memtable: [KV(42, 100), KV(77, 50), KV(99, 200)], levels: [{ name: "L0", ssts: [] }, { name: "L1", ssts: [] }],
        note: "MemTable stays sorted; the WAL keeps everything durable until the next flush." }
    },
    {
      label: "3 · Flush → an immutable SSTable",
      what: "The MemTable fills, so it's <b>flushed</b> to disk as an <b>SSTable</b> (Sorted String Table) in level <b>L0</b> — a single immutable, sorted file. The MemTable resets and the corresponding WAL can be truncated.",
      why: "Because the MemTable was already sorted, the flush is one large <b>sequential write</b> — fast and disk-friendly. And because SSTables are <b>immutable</b>, they never need in-place modification, which simplifies concurrency and caching.",
      how: "The sorted MemTable contents are written out as an SSTable (data blocks + a sparse index + a bloom filter). A fresh MemTable takes over new writes; the old WAL segment is no longer needed.",
      when: "Whenever the MemTable reaches its size limit (or is flushed on demand).",
      mistake: "Expecting SSTables to be edited later. They're immutable — changes go to newer SSTables and are reconciled by compaction, never by rewriting a file in place.",
      interview: "“What is an SSTable?” An immutable, sorted-on-disk file of key→value entries with a sparse index and usually a bloom filter, produced by flushing a MemTable.",
      example: "ShopKart's buffered events are flushed as one sorted L0 SSTable; the MemTable empties to accept the next burst.",
      viz: { wal: 0, memtable: [], levels: [{ name: "L0", ssts: [SST("sst-a", "42–99", "is-new", null)] }, { name: "L1", ssts: [] }],
        note: "MemTable → one sequential write of a sorted, immutable SSTable in L0. MemTable resets; WAL truncated." }
    },
    {
      label: "4 · SSTables pile up in L0",
      what: "Writes keep coming, the MemTable flushes again, and <b>L0 accumulates several SSTables</b>. Because each is an independent flush, L0 files can <b>overlap</b> in key range (here <code>sst-a</code> 42–99 and <code>sst-b</code> 30–88).",
      why: "Fast writes have a cost: the same key can now live in multiple files with different versions. A read may have to consult several SSTables — this is <b>read amplification</b>, the price of write-optimization.",
      how: "Each flush drops a new SSTable into L0. Newer files shadow older ones for overlapping keys; the true value of a key is the newest one found.",
      when: "Under sustained writes, between compactions.",
      mistake: "Assuming a key lives in exactly one place. In an LSM store a key can appear in the MemTable and several SSTables; the newest wins.",
      interview: "“What is read amplification in an LSM-Tree?” A single read may need to check the MemTable plus multiple SSTables (newest→oldest) because a key can exist in several files.",
      example: "ShopKart's steady event stream leaves several overlapping L0 SSTables, so a lookup might have to probe more than one file.",
      viz: { wal: 1, memtable: [KV(55, 10)], levels: [{ name: "L0", ssts: [SST("sst-b", "30–88"), SST("sst-a", "42–99")] }, { name: "L1", ssts: [] }],
        note: "L0 SSTables can overlap in key range. A key may live in several files → read amplification." }
    },
    {
      label: "5 · Read: MemTable → SSTables, skip with Bloom",
      what: "Read <b>GET sku99</b>. Check the MemTable first (miss), then SSTables <b>newest→oldest</b>. Each SSTable has a <b>bloom filter</b>: <code>sst-b</code>'s says 'definitely not here' → <b>skip it</b>; <code>sst-a</code>'s says 'maybe' → check it → found <code>200</code>.",
      why: "Without bloom filters, every read would touch every SSTable — brutal read amplification. Bloom filters let a read skip the files that <i>can't</i> contain the key, usually reducing it to one real disk probe.",
      how: "The read merges views newest-first (so newer writes shadow older). For each SSTable, the bloom filter is checked in memory before any disk I/O; only 'maybe' files are actually read.",
      when: "Every read; bloom filters are the standard mitigation for LSM read amplification.",
      mistake: "Underestimating read cost without bloom filters. They're not optional at scale — they're what makes LSM reads acceptable.",
      interview: "“How does an LSM store keep reads fast despite many SSTables?” Per-SSTable bloom filters skip files that can't contain the key, plus a sparse index locates the block within a file — turning many potential probes into ~one.",
      example: "Looking up SKU #99's latest value skips the SSTable whose bloom rules it out and probes only the one that might hold it.",
      viz: { wal: 1, memtable: [KV(55, 10)], read: { key: 99, verdict: "found 200 in sst-a" },
        levels: [{ name: "L0", ssts: [SST("sst-b", "30–88", "skipped", "no"), SST("sst-a", "42–99", "hot", "maybe")] }, { name: "L1", ssts: [] }],
        note: "MemTable miss → check SSTables newest→oldest. Bloom skips sst-b ('no'); sst-a ('maybe') is read → 200." }
    },
    {
      label: "6 · Compaction merges & reclaims",
      what: "<b>Compaction</b> merges overlapping SSTables into a larger, sorted file in the next level <b>L1</b> — dropping overwritten values and dropping <b>tombstones</b> (deleted keys), reclaiming their space.",
      why: "Compaction is the counterweight to fast writes: it bounds read amplification (fewer files to check), reclaims space from dead versions, and keeps the store from degenerating into thousands of tiny overlapping files. Its cost is <b>write amplification</b> — data is rewritten as it moves down levels.",
      how: "A merge reads the input SSTables in sorted order, keeps only the newest value per key (and drops tombstoned keys once safe), and writes one consolidated SSTable to L1. The inputs are then deleted.",
      when: "Continuously in the background, triggered by level size/file-count thresholds (leveled or tiered strategies).",
      mistake: "Ignoring compaction's I/O. It's a real, ongoing background cost — under-provisioned compaction causes read amplification to spiral and write stalls.",
      interview: "“What does compaction do and what does it cost?” Merges SSTables to reduce read amplification and reclaim space (dropping old versions/tombstones); it costs write amplification and background I/O.",
      example: "ShopKart's overlapping L0 event files are compacted into one clean L1 SSTable, so future reads touch fewer files and deleted events' space is reclaimed.",
      viz: { wal: 1, memtable: [KV(55, 10)],
        levels: [{ name: "L0", ssts: [SST("sst-b", "30–88", "merging"), SST("sst-a", "42–99", "merging")] }, { name: "L1", ssts: [SST("sst-c", "30–99", "is-new")] }],
        note: "Merge overlapping SSTables → one sorted L1 file; drop old versions & tombstones. Read amp ↓, write amp ↑." }
    },
    {
      label: "7 · LSM vs B+ Tree — pick your amplification",
      what: "The LSM-Tree trades <b>read &amp; space amplification for write throughput</b>; a B+ Tree does the opposite — update-in-place, read-optimized, but slower on random writes. Neither is 'better'; they fit different workloads.",
      why: "Choosing the right structure is a real engineering decision. Write-heavy, append-mostly workloads (logs, metrics, event streams, time series) love LSM; read-heavy, update-in-place OLTP with lots of point reads and ranges often prefers a B+ Tree.",
      how: "LSM: sequential writes + compaction + bloom filters (RocksDB, Cassandra). B+ Tree: in-place updates, 3–4 level descents (Postgres, InnoDB). Some systems offer both engines so you match the structure to the table.",
      when: "At storage-engine / data-model selection time — and per-table where the engine allows it.",
      mistake: "Treating the choice as ideological. Match it to the workload's read/write ratio and access pattern, not to a favorite database.",
      interview: "“When would you choose an LSM-Tree over a B+ Tree?” Write-heavy, high-ingest, append-mostly workloads (logs, metrics, time series); prefer a B+ Tree for read-heavy, point/range-lookup OLTP with in-place updates.",
      example: "ShopKart stores its high-volume clickstream/event log in an LSM store (write-optimized) but keeps its transactional orders/products in Postgres B+ Trees (read-optimized).",
      viz: { wal: 0, memtable: [KV(55, 10)],
        levels: [{ name: "L0", ssts: [] }, { name: "L1", ssts: [SST("sst-c", "30–99")] }],
        note: "LSM: write-optimized (ingest, logs, time series). B+ Tree: read-optimized (OLTP point/range). Match to workload." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function kvHtml(kv) {
      var cls = "dd-kv-item" + (kv.tomb ? " tomb" : "");
      return '<span class="' + cls + '">' + kv.k + (kv.tomb ? " ⌀" : "=" + kv.v) + "</span>";
    }
    function sstHtml(s) {
      var cls = "dd-sst" + (s.mark ? " " + s.mark : "");
      var bloom = s.bloom ? '<div class="dd-sst-bloom"><span class="dd-chip ' +
        (s.bloom === "no" ? "dd-chip--bad\">bloom: no (skip)" : "dd-chip--warn\">bloom: maybe") + "</span></div>" : "";
      return '<div class="' + cls + '"><div class="dd-sst-name">' + s.name + "</div>" +
        '<div class="dd-sst-range">keys ' + s.range + "</div>" + bloom + "</div>";
    }
    function levelHtml(lvl) {
      var body = lvl.ssts.length ? lvl.ssts.map(sstHtml).join("") : '<span class="dd-note">— empty —</span>';
      return '<div class="dd-lsm-levelrow"><span class="dd-level-label">' + lvl.name + "</span>" + body + "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to follow writes into the MemTable, flush to immutable SSTables, ' +
          "read with a bloom-filter skip, and watch compaction merge the files.</div>";
        return;
      }
      var readChip = s.read ? '<span class="dd-chip dd-chip--info">GET sku' + s.read.key + " → " + s.read.verdict + "</span>" : "";
      var memBody = s.memtable.length ? '<div class="dd-kv-list">' + s.memtable.map(kvHtml).join("") + "</div>"
        : '<span class="dd-note">empty (just flushed)</span>';
      var html = '<div class="dd-section"><div class="dd-section-label">MemTable (memory) ' +
        '<span class="dd-chip dd-chip--accent">WAL: ' + s.wal + " rec</span> " + readChip + "</div>" + memBody + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">SSTables (disk, immutable, leveled)</div>' +
        s.levels.map(levelHtml).join("") + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["lsm-tree"] = {
    slug: "lsm-tree",
    overview: {
      what: "An <b>LSM-Tree</b> (Log-Structured Merge-Tree) is a write-optimized storage structure: writes go to an in-memory <b>MemTable</b> (plus a WAL), which is flushed to immutable sorted files (<b>SSTables</b>) on disk, and background <b>compaction</b> merges those files over time.",
      why: "It turns every write into a sequential operation — a log append and a memory insert — giving huge ingest throughput without the random-write cost of updating a B+ Tree in place. It's the engine behind RocksDB, Cassandra, LevelDB, and most write-heavy/time-series stores.",
      how: "Writes buffer in a sorted MemTable and are flushed as immutable SSTables. Reads check the MemTable then SSTables newest→oldest, using per-file bloom filters to skip files that can't hold the key. Compaction merges SSTables to bound read amplification and reclaim space — trading write amplification for it."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "LSM-Tree write, read, and compaction (conceptual)",
      lang: "sql",
      code:
        "put(key, value):\n" +
        "    wal.append(key, value)          # durable, sequential\n" +
        "    memtable.insert(key, value)     # in-memory, sorted\n" +
        "    if memtable.size > threshold:\n" +
        "        flush(memtable) -> new immutable SSTable in L0   # one sequential write\n" +
        "        memtable = new(); truncate(wal)\n" +
        "\n" +
        "get(key):\n" +
        "    if key in memtable: return memtable[key]\n" +
        "    for sstable in newest_to_oldest:\n" +
        "        if sstable.bloom.might_contain(key):   # skip files that can't hold it\n" +
        "            v = sstable.lookup(key)\n" +
        "            if v is not None: return v         # newest wins\n" +
        "\n" +
        "# background: compaction merges SSTables, drops old versions + tombstones",
      highlights: [2, 3, 11]
    },
    reference: [
      ["LSM-Tree", "Write-optimized store: MemTable + WAL + leveled SSTables + compaction"],
      ["MemTable", "In-memory sorted buffer for recent writes"],
      ["SSTable", "Immutable sorted file of key→value entries on disk"],
      ["flush", "Writing a full MemTable out as a new SSTable (sequential)"],
      ["compaction", "Merging SSTables to reduce read amp and reclaim space"],
      ["tombstone", "A marker recording a deletion until compaction drops it"],
      ["write amplification", "Data rewritten multiple times as it compacts down levels"],
      ["read amplification", "A read may check the MemTable + several SSTables"],
      ["space amplification", "Extra space from old versions not yet compacted"],
      ["bloom filter", "Per-SSTable probabilistic filter to skip non-matching files"]
    ],
    internals:
      "<p>An LSM-Tree separates the write path from the read path. <b>Writes</b> are appended to a WAL (durability) and inserted into a sorted in-memory <b>MemTable</b> — both cheap and sequential. When the MemTable fills, it's <b>flushed</b> as an immutable <b>SSTable</b>: a sorted file with data blocks, a sparse index, and a bloom filter. Immutability means files are never edited — new data goes to new files.</p>" +
      "<p><b>Reads</b> merge a newest-first view: the MemTable, then SSTables from newest to oldest, so a newer write shadows an older one. To avoid touching every file, each SSTable's <b>bloom filter</b> is checked in memory first, skipping files that provably don't contain the key; the sparse index then locates the block within a 'maybe' file. This is why bloom filters are essential — they collapse read amplification.</p>" +
      "<p><b>Compaction</b> is the background process that keeps the structure healthy: it merges SSTables (leveled or size-tiered), keeping only the newest value per key and dropping tombstones once safe, which reduces the number of files a read must consider and reclaims space. The tradeoff triangle — write, read, and space amplification — is tunable: leveled compaction favors read/space efficiency; tiered favors write throughput.</p>",
    engineering:
      "<p>Reach for an LSM-Tree when writes dominate and are append-mostly: logs, metrics, events, time series, high-ingest pipelines. Its sequential write path sustains throughput a B+ Tree can't match on random writes. But budget for <b>compaction</b>: it's continuous background I/O, and under-provisioning it lets read amplification climb and can trigger write stalls when L0 backs up.</p>" +
      "<p>Tune to the workload: choose leveled vs tiered compaction for your read/write/space balance; size MemTables and bloom filters (more bits/key → fewer false positives → fewer wasted probes); and watch for <b>tombstone</b> pitfalls — range scans over many deletes can be slow until tombstones compact away, and long-lived tombstones bloat space. For read-heavy OLTP with point and range lookups and in-place updates, a B+ Tree is usually the better fit; many teams run both, matching the engine to each table.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Bloom filters are what make LSM reads viable.</b> They let a read skip SSTables that can't contain the key, turning 'check every file' into roughly one real probe. Size them generously on read-sensitive data." },
      { kind: "warn", html: "<b>Compaction is a real, ongoing cost — not free cleanup.</b> It causes write amplification and steady background I/O; under-provisioned compaction lets read amplification spiral and can cause write stalls when L0 fills. Monitor it." },
      { kind: "info", html: "<b>Deletes are tombstones, not immediate removals.</b> A deleted key lingers as a tombstone until compaction drops it, so heavy-delete/range-scan workloads can be slow and space-hungry until compaction catches up." }
    ],
    failureModes:
      "<p><b>Compaction debt / write stalls:</b> writes outrun compaction, L0 fills with overlapping SSTables, read amplification climbs, and the store throttles writes to catch up. <i>Fix:</i> provision compaction I/O; tune strategy and thresholds.</p>" +
      "<p><b>Read amplification blow-up:</b> too many un-compacted or poorly-filtered SSTables make each read touch many files. <i>Fix:</i> bigger/better bloom filters; more aggressive compaction.</p>" +
      "<p><b>Tombstone buildup:</b> heavy deletes leave tombstones that slow range scans and inflate space until compacted. <i>Fix:</i> compaction tuning; avoid delete-heavy anti-patterns; TTL-aware compaction.</p>" +
      "<p><b>Space amplification:</b> old versions across levels consume extra space between compactions. <i>Fix:</i> leveled compaction; monitor space amp; schedule major compactions.</p>",
    quickCheck: [
      {
        q: "Why can an LSM-Tree sustain a much higher write rate than a B+ Tree on random-key inserts?",
        options: [
          "It skips durability",
          "Every write is a sequential WAL append + an in-memory sorted insert, deferring disk organization to background compaction",
          "It never writes to disk",
          "It uses smaller keys"
        ],
        answer: 1,
        why: "LSM writes avoid random in-place disk updates entirely: append to the WAL and insert into the in-memory MemTable, then flush sequentially. A B+ Tree must locate and update pages in place, which for random keys means scattered random writes and splits.",
        diff: "medium"
      },
      {
        q: "A read in an LSM store checks the MemTable and misses. How does it avoid probing every SSTable on disk?",
        options: [
          "It re-sorts all SSTables",
          "Each SSTable's bloom filter is checked in memory first, so files that definitely don't contain the key are skipped",
          "It only ever keeps one SSTable",
          "It reads them in parallel and picks the fastest"
        ],
        answer: 1,
        why: "Per-SSTable bloom filters answer 'definitely not present' vs 'maybe' in memory, so the read skips files that can't hold the key and only does disk I/O on 'maybe' files (newest first) — collapsing read amplification.",
        diff: "medium"
      },
      {
        q: "What does compaction trade away to reduce read amplification and reclaim space?",
        options: [
          "Durability",
          "Write amplification and background I/O — data is rewritten as it merges down levels",
          "Sorted order",
          "The WAL"
        ],
        answer: 1,
        why: "Compaction rewrites data when merging SSTables and moving them between levels, so it increases write amplification and consumes ongoing background I/O — the cost of keeping read amplification and space in check.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain how an LSM-Tree handles writes, reads, and cleanup.",
        a: "Writes append to a WAL for durability and insert into an in-memory sorted MemTable — both sequential, which is why ingest is fast. When the MemTable fills it's flushed as an immutable, sorted SSTable on disk. Reads merge a newest-first view: check the MemTable, then SSTables newest→oldest, using each SSTable's bloom filter to skip files that can't contain the key and a sparse index to find the block in 'maybe' files. Cleanup is compaction: a background process that merges SSTables, keeps the newest value per key, drops tombstoned deletes, reduces the number of files a read must check, and reclaims space. The design deliberately trades read and space amplification for write throughput, then claws read amplification back with bloom filters and compaction.",
        tip: "Name the three amplifications (write/read/space) and how each is managed — it's the vocabulary interviewers listen for."
      },
      {
        q: "When would you choose an LSM-Tree over a B+ Tree, and vice versa?",
        a: "Choose an LSM-Tree for write-heavy, high-ingest, append-mostly workloads — logs, metrics, events, time series, message queues, write-buffering. Its sequential write path and deferred organization sustain throughput a B+ Tree can't match on random writes, and compaction plus bloom filters keep reads acceptable. Choose a B+ Tree for read-heavy, update-in-place OLTP with lots of point lookups and range scans and moderate write rates — it gives predictable low-latency reads without compaction overhead. In practice many systems offer both (e.g. MySQL with InnoDB vs MyRocks) so you can match the engine per table to its read/write ratio and access pattern.",
        tip: "Frame it as a read/write-amplification tradeoff tied to the workload, not as one being universally better."
      },
      {
        q: "Why are deletes in an LSM-Tree handled with tombstones, and what problems can that cause?",
        a: "Because SSTables are immutable, you can't erase a key in place — a delete writes a tombstone, a marker that shadows any older value for that key on read. The tombstone (and the data it hides) is only physically removed later, during a compaction that's certain no older, un-compacted version remains. The problems: range scans over regions with many tombstones are slow because the reader must step over all of them; long-lived tombstones inflate space (space amplification); and delete-heavy workloads can pile up tombstones faster than compaction clears them. Mitigations include compaction tuning, TTL/gc-grace awareness, and avoiding delete-then-scan anti-patterns.",
        tip: "The 'immutable files → can't delete in place → tombstone' chain is the crux; then cite the range-scan-over-tombstones slowdown as the classic gotcha."
      }
    ],
    businessLens: {
      task: "ShopKart's clickstream/event log vs its transactional orders",
      meaning: "Ingest millions of events cheaply, while keeping order lookups fast and correct.",
      system: "LSM store (RocksDB/Cassandra) for events; Postgres B+ Trees for orders",
      point: "ShopKart's product-view and click events arrive in enormous volume and are almost never updated in place — a perfect fit for an LSM-Tree, whose sequential write path swallows the firehose while compaction and bloom filters keep analytics reads workable. Its orders and products, by contrast, are read-heavy with point and range lookups and live under transactions, so they stay in Postgres B+ Trees. The lesson the two halves teach together: storage-engine choice is a workload decision — write-optimized LSM for the event stream, read-optimized B+ Tree for the money."
    }
  };
})();
