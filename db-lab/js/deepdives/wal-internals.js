/* ============================================================
   deepdives/wal-internals.js — "WAL Internals" deep dive.
   Registers DBLab.deepDives['wal-internals'] (concept m67).
   Authored against the contract documented in deepdives/mvcc.js.

   Goes below the WAL concept (deepdives/wal.js): the byte-level
   anatomy — LSNs, record layout, WAL buffers, write vs fsync,
   full-page writes, page LSN, and segment files.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: one stock change to SKU #42 becomes a WAL record. We zoom into the
  // bytes: the LSN that addresses it, the record's header + payload, the WAL
  // buffers it lands in, and the write/fsync boundary that makes COMMIT durable.
  function seg(name, state, lsn) { return { name: name, state: state, lsn: lsn }; }

  var STEPS = [
    {
      label: "1 · An LSN is a byte address",
      what: "The WAL behaves like one enormous, ever-growing file. An <b>LSN</b> (Log Sequence Number) such as <code>1/3A2F08</code> is simply a <b>byte offset</b> into that stream — monotonic and never reused.",
      why: "Every durability decision is phrased in LSNs: 'the log is durable up to X', 'this page was last changed at Y'. Because an LSN is a position, comparing two of them answers 'did this happen before that?' instantly.",
      how: "Physically the stream is chopped into fixed-size <b>segment files</b> (16&nbsp;MB by default). The high half of an LSN identifies the segment; the low half is the offset within it. New records are appended at the current insert position.",
      when: "Every WAL record, page, and commit is tagged with an LSN — it's the universal clock of the storage engine.",
      mistake: "Thinking of the WAL as many independent files. Logically it's one address space; segment files are just how that stream is stored and recycled.",
      interview: "“What is an LSN?” A monotonically increasing byte offset into the logical WAL stream — it both identifies a record and orders all changes.",
      example: "SKU&nbsp;#42's next stock change will be written at insert position <code>1/3A2F08</code> — the current end of ShopKart's WAL stream.",
      viz: {
        stream: [seg("…seg 39", "recycled"), seg("…seg 3A", "active", "1/3A2F08 ← insert"), seg("…seg 3B", "future")],
        markers: [{ label: "insertLSN", val: "1/3A2F08" }],
        note: "One logical stream, stored as 16 MB segments. The LSN is the byte offset where the next record lands."
      }
    },
    {
      label: "2 · Anatomy of a WAL record",
      what: "The stock change becomes one <b>WAL record</b>: a fixed <b>header</b> plus a payload. The header carries its total length, the transaction id, a link to the previous record, a resource-manager/type tag, and a <b>CRC</b>; the payload says which page changed and how.",
      why: "This layout is what makes recovery possible and self-checking: the type tag routes the record to the right redo handler, the CRC detects a torn or corrupt tail, and the back-link chains a transaction's records for undo.",
      how: "Header fields (Postgres <code>XLogRecord</code>): <code>xl_tot_len</code>, <code>xl_xid</code>, <code>xl_prev</code>, <code>xl_info</code>/rmgr, <code>xl_crc</code>. The payload references a page (relfile + block) and holds the change data (a delta, or a full page — step 5).",
      when: "Constructed for every logged modification before it can be flushed or applied.",
      mistake: "Assuming a WAL record is just 'the new value'. It's a typed, checksummed, chained structure — the metadata is what makes replay correct and restartable.",
      interview: "“What's in a WAL record?” A header (length, xid, prev-LSN, type/rmgr, CRC) and a payload identifying the page and the change — delta or full-page image.",
      example: "Order&nbsp;#9001's decrement becomes a Heap-type record for page <code>products/0</code>, tagged xid&nbsp;7, CRC-protected, ~64 bytes.",
      viz: {
        record: {
          kind: "update",
          fields: [["LSN", "1/3A2F08"], ["xl_prev", "1/3A2EC0"], ["xl_xid", "7"], ["rmgr", "Heap"], ["xl_tot_len", "64 B"], ["xl_crc", "0x9F3C…"]],
          payload: "page products/0, offset 42 · stock 100 → 99 (delta)"
        },
        markers: [{ label: "record size", val: "64 B", tone: "good" }],
        note: "Header (length · xid · prev-LSN · type · CRC) + payload (which page, what change). The CRC guards against a torn tail."
      }
    },
    {
      label: "3 · Records land in WAL buffers first",
      what: "A new record isn't written straight to disk. It's copied into shared <b>WAL buffers</b> in memory (<code>wal_buffers</code>). The in-memory <b>insert position</b> runs ahead of what has actually reached the disk.",
      why: "Buffering lets many backends append concurrently and lets the engine batch writes — turning a storm of tiny appends into efficient larger I/Os, and enabling group commit.",
      how: "Backends reserve space in the WAL buffers under a lightweight lock and copy their record in. A separate step later writes those buffers out to the segment file; <b>insertLSN</b> (in memory) ≥ <b>writtenLSN</b> (in the OS) ≥ <b>flushedLSN</b> (on stable storage).",
      when: "Every append; the WAL writer process and commits drain the buffers to disk.",
      mistake: "Believing a record is safe the instant it's created. It's only in volatile memory until it's written and — critically — fsynced.",
      interview: "“Where does a WAL record go first?” Into in-memory WAL buffers; it becomes durable only once it's written to the OS and fsynced to stable storage.",
      example: "At peak, dozens of ShopKart backends append commit records into the WAL buffers at once; the insert position races ahead of the flushed position.",
      viz: {
        stream: [seg("…seg 3A", "active", "insert 1/3A2F48")],
        markers: [{ label: "insertLSN", val: "1/3A2F48" }, { label: "writtenLSN", val: "1/3A2E80", tone: "" }, { label: "flushedLSN", val: "1/3A2E00", tone: "bad" }],
        note: "In memory (insert) ≥ written to OS ≥ flushed to disk. Records exist before they're durable — mind the gap."
      }
    },
    {
      label: "4 · write() is not fsync() — COMMIT waits for flush",
      what: "Getting bytes to the OS (<code>write()</code>) is <b>not</b> durability — the OS may hold them in its page cache. Only <code>fsync()</code> forces them onto stable storage. <b>COMMIT blocks until <code>flushedLSN</code> ≥ its commit record's LSN.</b>",
      why: "This boundary is the entire durability guarantee. If COMMIT returned after <code>write()</code> but before <code>fsync()</code>, a power loss would lose 'committed' data. It's also why commit latency equals WAL <i>flush</i> latency.",
      how: "The WAL writer and committing backends advance <code>writtenLSN</code>, then <code>fsync</code> to advance <code>flushedLSN</code>. <b>Group commit</b> lets one fsync satisfy many waiting commits. <code>synchronous_commit=off</code> lets COMMIT return at <i>write</i>, trading a small loss window for latency.",
      when: "Every durable commit; the fsync cadence sets your commit throughput ceiling.",
      mistake: "Trusting storage that acknowledges fsync without truly persisting ('fsync lies') — or disabling fsync — which silently breaks durability.",
      interview: "“What exactly does COMMIT wait for?” For the WAL to be <i>flushed</i> (fsynced) up to its commit record — not merely written to the OS cache, and not the data pages.",
      example: "ShopKart's 'Order placed' fires only once the commit record is fsynced (flushedLSN passes it); one fsync may confirm a whole batch of simultaneous checkouts.",
      viz: {
        record: {
          kind: "commit",
          fields: [["LSN", "1/3A2F80"], ["xl_xid", "7"], ["rmgr", "Transaction"], ["type", "COMMIT"]],
          payload: "xid 7 COMMIT — backend blocks until flushedLSN ≥ 1/3A2F80"
        },
        markers: [{ label: "writtenLSN", val: "1/3A2F80" }, { label: "flushedLSN", val: "1/3A2F80", tone: "good" }, { label: "commit", val: "durable ✓", tone: "good" }],
        note: "fsync advanced flushedLSN past the commit LSN → COMMIT returns. write() alone would not have been safe."
      }
    },
    {
      label: "5 · Full-page writes defeat torn pages",
      what: "The <b>first</b> change to a data page after a checkpoint logs the <b>entire 8&nbsp;KB page image</b>, not just the delta. This is a <b>full-page write</b> — a big record that makes the WAL self-sufficient for that page.",
      why: "A crash can tear an 8&nbsp;KB page mid-write (the OS/disk persists 4&nbsp;KB, not all of it). A delta can't fix a half-written page — but a full-page image can simply overwrite it, guaranteeing a clean base for later deltas.",
      how: "After each checkpoint, a per-page flag resets; the next modification includes the whole page (often compressed). Subsequent changes to that page log only deltas — until the next checkpoint resets the flag again.",
      when: "First touch of each page after every checkpoint — which is why frequent checkpoints inflate WAL volume.",
      mistake: "Cranking checkpoints very frequent to speed recovery without realizing it multiplies full-page writes — more WAL and I/O, not less.",
      interview: "“What's a full-page write and why does it exist?” Logging a whole page on its first post-checkpoint change to survive torn pages; deltas alone can't repair a partially written page.",
      example: "The first stock change to SKU&nbsp;#42's page after a checkpoint logs the full 8&nbsp;KB page; the next few changes log tiny deltas until the following checkpoint.",
      viz: {
        record: {
          kind: "fpw",
          fields: [["LSN", "1/3A3000"], ["xl_xid", "8"], ["rmgr", "Heap"], ["xl_tot_len", "8.2 KB"], ["FPW", "yes"]],
          payload: "page products/0 — FULL PAGE IMAGE (8 KB) · first change since checkpoint"
        },
        markers: [{ label: "record size", val: "8.2 KB", tone: "bad" }, { label: "vs delta", val: "~130×", tone: "bad" }],
        note: "First post-checkpoint change carries the whole page (torn-page safety). This is why very frequent checkpoints bloat WAL."
      }
    },
    {
      label: "6 · page LSN makes redo idempotent",
      what: "Every data page stores, in its header, the <b>LSN of the last WAL record applied to it</b> — its <b>page LSN</b>. Redo compares each record's LSN to the target page's LSN and <b>skips</b> anything the page already reflects.",
      why: "This is what lets recovery replay safely and restart after re-crashing: applying a record twice is harmless because the page LSN tells redo it's already there. It also enforces the WAL invariant.",
      how: "The <b>WAL invariant</b>: a dirty page may not be written to disk until the WAL is flushed up to that page's LSN. So on recovery, if a page is on disk, the WAL that explains it is guaranteed durable — redo can trust the page LSN comparison.",
      when: "On every redo during recovery, and as an ordering rule every time a dirty page is evicted or checkpointed.",
      mistake: "Overlooking why the invariant exists: without 'flush WAL before the page', a page could reach disk describing a change whose log record was lost — unrecoverable.",
      interview: "“How is redo idempotent?” Each page records the LSN of its last applied change; redo skips records with LSN ≤ the page LSN, so replaying twice changes nothing.",
      example: "On restart, ShopKart's redo sees products/0 already at page LSN 1/3A3000 and skips the full-page-write record — then applies only the newer deltas.",
      viz: {
        page: { id: "products/0", pageLsn: "1/3A3000", flag: "on disk" },
        record: {
          kind: "update",
          fields: [["record LSN", "1/3A2F08"], ["page LSN", "1/3A3000"], ["compare", "record ≤ page"]],
          payload: "record LSN ≤ page LSN → already applied → redo SKIPS it (idempotent)"
        },
        markers: [{ label: "page LSN", val: "1/3A3000" }, { label: "redo", val: "skip ✓", tone: "good" }],
        note: "WAL invariant: flush WAL up to a page's LSN before flushing the page. So on disk, the page LSN can always be trusted."
      }
    },
    {
      label: "7 · Segments, recycling & the stream as an asset",
      what: "The WAL stream is stored as numbered <b>16&nbsp;MB segment files</b>. After a checkpoint, segments before the redo point are <b>recycled</b> (renamed for reuse) or <b>archived</b> — and the very same stream feeds replication, PITR, and logical decoding.",
      why: "Because the WAL is a complete, ordered history of every change, it's not just a recovery log — it's the source of truth that powers <b>streaming replication</b>, <b>point-in-time recovery</b>, and <b>logical (CDC) decoding</b>.",
      how: "Recycling renames old segments ahead instead of deleting them (cheap reuse). A segment is retained if archiving hasn't copied it or a <b>replication slot</b> hasn't consumed it — which is how the WAL disk can fill despite healthy checkpoints.",
      when: "Continuously as checkpoints advance the redo point and consumers acknowledge segments.",
      mistake: "Forgetting that consumers pin WAL: an abandoned replication slot or failed archive command retains segments until the disk fills and writes stop.",
      interview: "“What else uses the WAL besides recovery?” Streaming replication (ship & replay), PITR (base backup + archived WAL), and logical decoding (CDC) — all read the same stream.",
      example: "ShopKart streams its WAL to a standby and archives it for PITR; one abandoned logical-replication slot once pinned segments until the WAL disk nearly filled.",
      viz: {
        stream: [seg("seg 38", "archived"), seg("seg 39", "recycled"), seg("seg 3A", "active", "redo point → here"), seg("seg 3B", "future")],
        markers: [{ label: "segment", val: "16 MB" }, { label: "consumers", val: "replica · archive · CDC" }],
        note: "Same stream, many readers: replication, PITR, logical decoding. A lagging slot or stalled archive pins segments and can fill the disk."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function segBlock(sg) {
      var lsn = sg.lsn ? '<div class="dd-wseg-lsn">' + sg.lsn + "</div>" : "";
      return '<div class="dd-wseg ' + sg.state + '"><div class="dd-wseg-name">' + sg.name + "</div>" +
        '<div class="dd-wseg-state">' + sg.state + "</div>" + lsn + "</div>";
    }
    function kvItem(kv) { return '<span class="dd-kv-item"><i>' + kv[0] + "</i> " + kv[1] + "</span>"; }
    function metricChip(m) {
      var cls = "dd-metric" + (m.tone ? " " + m.tone : "");
      return '<div class="' + cls + '"><span class="dd-metric-val">' + m.val + "</span><span class=\"dd-metric-lbl\">" + m.label + "</span></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to zoom into the bytes of the WAL — the LSN that addresses a change, ' +
          "a record’s header and payload, the write/fsync boundary that makes COMMIT durable, and full-page writes.</div>";
        return;
      }
      var html = "";
      if (s.record) {
        var r = s.record;
        html += '<div class="dd-section"><div class="dd-section-label">WAL record</div>' +
          '<div class="dd-wrec is-' + r.kind + '"><div class="dd-kv-list">' + r.fields.map(kvItem).join("") + "</div>" +
          '<div class="dd-wrec-payload">' + r.payload + "</div></div></div>";
      }
      if (s.stream) {
        html += '<div class="dd-section"><div class="dd-section-label">WAL stream (16 MB segments)</div>' +
          '<div class="dd-wstream">' + s.stream.map(segBlock).join("") + "</div></div>";
      }
      if (s.page) {
        html += '<div class="dd-section"><div class="dd-section-label">Data page</div><div class="dd-storage">' +
          '<div class="dd-store"><div class="dd-store-label">' + s.page.id + '</div>' +
          '<div class="dd-store-val">pageLSN <small>' + s.page.pageLsn + "</small></div>" +
          '<div class="dd-store-flag"><span class="dd-chip">' + s.page.flag + "</span></div></div></div></div>";
      }
      if (s.markers) {
        html += '<div class="dd-section"><div class="dd-section-label">Durability position</div>' +
          '<div class="dd-metrics">' + s.markers.map(metricChip).join("") + "</div></div>";
      }
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["wal-internals"] = {
    slug: "wal-internals",
    overview: {
      what: "<b>WAL internals</b> are the byte-level mechanics beneath write-ahead logging: what an <b>LSN</b> really is, how a WAL <b>record</b> is laid out, the <b>WAL buffers</b> records pass through, the <b>write vs fsync</b> boundary that defines durability, <b>full-page writes</b>, the <b>page LSN</b> that makes redo idempotent, and the <b>segment files</b> the stream lives in.",
      why: "Knowing WAL exists gets you the concept; knowing its internals is what lets you reason about commit latency, torn-page safety, why frequent checkpoints inflate WAL, and why a lagging replica can fill the WAL disk. These are the details that turn 'WAL is durable' into an operational mental model.",
      how: "The WAL is one logical byte stream addressed by monotonic LSNs, stored as 16&nbsp;MB segments. Records (header + payload, CRC-protected) are inserted into in-memory buffers, then written and fsynced — COMMIT waits for the flush to pass its commit LSN. Full-page writes protect against torn pages; each page's stored LSN keeps redo idempotent under the WAL invariant."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Inspecting LSNs, records, and segments",
      lang: "sql",
      code:
        "-- Where is the WAL now, and which segment file is that?\n" +
        "SELECT pg_current_wal_lsn(),\n" +
        "       pg_walfile_name(pg_current_wal_lsn());   -- e.g. 00000001000000010000003A\n" +
        "\n" +
        "-- The write vs flush boundary (durability position)\n" +
        "SELECT pg_current_wal_insert_lsn() AS insert,   -- in memory\n" +
        "       pg_current_wal_lsn()        AS written,  -- to the OS\n" +
        "       pg_current_wal_flush_lsn()  AS flushed;  -- fsync'd (COMMIT waits for this)\n" +
        "\n" +
        "-- Distance between two LSNs = bytes of WAL between them\n" +
        "SELECT pg_size_pretty(pg_wal_lsn_diff('1/3A2F80','1/3A2E00'));\n" +
        "\n" +
        "-- Decode the actual records (their rmgr, length, and whether FPW fired)\n" +
        "--   $ pg_waldump -p $PGDATA/pg_wal 00000001000000010000003A | head\n" +
        "\n" +
        "-- Durability & torn-page knobs\n" +
        "SHOW wal_buffers; SHOW synchronous_commit; SHOW full_page_writes;",
      highlights: [2, 6, 7, 8]
    },
    reference: [
      ["LSN", "Monotonic byte offset into the logical WAL stream; identifies & orders every change"],
      ["WAL segment", "A fixed-size (default 16 MB) file the stream is stored in and recycled as"],
      ["WAL record", "Header (len, xid, prev-LSN, rmgr/type, CRC) + payload (page ref + change)"],
      ["wal_buffers", "Shared in-memory buffers new records are inserted into before being written"],
      ["writtenLSN", "How far WAL has been written to the OS (not yet necessarily durable)"],
      ["flushedLSN", "How far WAL has been fsynced to stable storage; COMMIT waits for this"],
      ["full-page write", "Logging a whole page on its first change after a checkpoint (torn-page safety)"],
      ["page LSN", "LSN of the last change applied to a page; makes redo idempotent"],
      ["WAL invariant", "Flush WAL up to a page's LSN before writing that page to disk"],
      ["replication slot", "A consumer marker that pins WAL until the consumer has received it"]
    ],
    internals:
      "<p>An LSN is a position, not a counter you can reset — that single fact makes the WAL a clock. Records are appended into <b>shared WAL buffers</b> under a light lock (backends reserve space, then copy in), which is what allows highly concurrent commit throughput. Three positions trail each other: <b>insert</b> (memory) ≥ <b>written</b> (OS) ≥ <b>flushed</b> (stable storage). Durability is defined precisely at the flushed boundary — <code>write()</code> hands bytes to the OS cache; only <code>fsync()</code> (advancing flushedLSN) makes them survive power loss, and COMMIT blocks until flushedLSN passes its commit record.</p>" +
      "<p><b>Full-page writes</b> and the <b>page LSN</b> together deliver crash-safe, idempotent redo. Because an 8&nbsp;KB page write isn't atomic, the first change to a page after a checkpoint logs the whole page, giving redo a clean base image; later changes log deltas. Each page header stores the LSN of its last applied change, so redo skips records at or below it — replaying twice is a no-op. The <b>WAL invariant</b> (flush the log up to a page's LSN before the page itself reaches disk) is what guarantees that any page found on disk during recovery has its explaining WAL already durable.</p>" +
      "<p>The stream is stored as numbered 16&nbsp;MB <b>segments</b>, recycled by renaming rather than deleting once they precede the redo point and no consumer needs them. That last clause matters operationally: archiving and <b>replication slots</b> pin segments until they're consumed, so the same durable stream that powers recovery, streaming replication, PITR, and logical/CDC decoding can also fill the WAL disk when a consumer stalls.</p>",
    engineering:
      "<p>Commit latency is WAL <b>flush</b> latency, so put WAL on fast, low-latency storage and let <b>group commit</b> amortize fsyncs under concurrency (a small <code>commit_delay</code> can help at very high commit rates). Choose your durability boundary deliberately: <code>synchronous_commit=off</code> returns COMMIT at write and risks losing the last few milliseconds on a crash; <code>full_page_writes=off</code> or storage that lies about fsync risks outright corruption — neither should be touched without knowing exactly what's traded.</p>" +
      "<p>Reason about WAL <b>volume</b>, not just latency: frequent checkpoints multiply full-page writes and inflate the stream; larger <code>wal_buffers</code> smooths bursty append load. Monitor the write/flush positions, WAL generation rate, archiver health, and replication-slot lag together — a stalled archive or an abandoned slot pins segments and fills the disk, halting all writes. <code>pg_waldump</code> is the tool for actually seeing what's being written when volume is unexpectedly high.</p>",
    gotchas: [
      { kind: "warn", html: "<b><code>write()</code> is not durability.</b> Bytes in the OS page cache vanish on power loss. Only <code>fsync</code> (advancing flushedLSN) is durable, and COMMIT waits for it — which is why 'fsync lies' or <code>fsync=off</code> silently break the D in ACID." },
      { kind: "info", html: "<b>Full-page writes are why frequent checkpoints inflate WAL.</b> The first change to each page after a checkpoint logs the whole 8 KB page. More checkpoints → more first-touches → more full-page images → more WAL and I/O." },
      { kind: "tip", html: "<b>Consumers pin WAL segments.</b> A checkpoint makes old segments recyclable, but a lagging replication slot or a stalled archive_command retains them until the disk fills. Monitor slot lag and archiver status, not just checkpoints." }
    ],
    failureModes:
      "<p><b>Silent durability loss:</b> storage that acknowledges fsync without persisting, or <code>fsync</code>/<code>full_page_writes</code> disabled, so a crash loses 'committed' data or leaves torn pages. <i>Fix:</i> honest, battery-backed storage; never disable these in production.</p>" +
      "<p><b>Commit latency spikes:</b> slow or contended WAL storage, or fsyncs not being amortized, make every commit slow. <i>Fix:</i> fast dedicated WAL disk; verify group commit under load; consider a small <code>commit_delay</code>.</p>" +
      "<p><b>WAL volume explosion:</b> over-frequent checkpoints (full-page-write storm) or a bulk-load pattern inflate the stream and its I/O. <i>Fix:</i> size checkpoints sanely; use <code>pg_waldump</code> to find the source; batch appropriately.</p>" +
      "<p><b>WAL disk fills, writes stop:</b> a stalled <code>archive_command</code> or an abandoned replication slot pins segments past the redo point. <i>Fix:</i> monitor archiver and slot lag; drop dead slots; alert on WAL disk usage.</p>",
    quickCheck: [
      {
        q: "COMMIT has returned success. What is guaranteed about the WAL at that instant?",
        options: [
          "The commit record was written to the OS (write())",
          "The WAL is fsync'd (flushedLSN ≥ the commit record's LSN)",
          "The data pages were flushed to disk",
          "The next checkpoint has run"
        ],
        answer: 1,
        why: "COMMIT blocks until the WAL is flushed (fsynced) up to its commit record's LSN — not merely written to the OS cache, and not the data pages. That flushed boundary is the durability guarantee.",
        diff: "medium"
      },
      {
        q: "Why does the first change to a page after a checkpoint log the entire 8 KB page instead of a small delta?",
        options: [
          "To save space",
          "Torn-page protection: a crash can persist a page partially, and only a full image can rebuild a clean base",
          "Because deltas aren't supported after a checkpoint",
          "To reset the page LSN"
        ],
        answer: 1,
        why: "An 8 KB page write isn't atomic; a crash can leave it half-written. A delta can't repair a torn page, but a full-page image overwrites it with a known-good base — after which later changes can be deltas until the next checkpoint.",
        diff: "medium"
      },
      {
        q: "During recovery, redo reaches a record whose LSN is ≤ the target page's stored page LSN. What does it do?",
        options: [
          "Applies it again to be safe",
          "Skips it — the page already reflects that change, so redo is idempotent",
          "Aborts recovery",
          "Rewrites the page LSN backward"
        ],
        answer: 1,
        why: "The page LSN records the last change already applied to that page. Redo skips any record at or below it, so replaying the log twice is harmless — this idempotency is what lets recovery restart safely after a re-crash.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "What is an LSN, and how do insertLSN, writtenLSN, and flushedLSN relate?",
        a: "An LSN (Log Sequence Number) is a monotonically increasing byte offset into the logical WAL stream — it both uniquely identifies a record and orders every change, and because it's a position, comparing two LSNs tells you which happened first. As records flow to disk, three positions trail one another: insertLSN is how far records have been placed into the in-memory WAL buffers; writtenLSN is how far they've been handed to the OS via write(); flushedLSN is how far they've been fsynced to stable storage. insert ≥ written ≥ flushed. Durability is defined at flushedLSN: COMMIT blocks until flushedLSN passes its commit record, because bytes merely written to the OS cache don't survive power loss.",
        tip: "Draw the three-position ladder — insert ≥ written ≥ flushed — and put durability at the flushed line."
      },
      {
        q: "Explain full-page writes and the page LSN, and how they make recovery correct.",
        a: "Two mechanisms cooperate. Full-page writes handle the fact that an 8 KB page write isn't atomic — a crash can tear it. So the first modification of a page after each checkpoint logs the whole page image, giving redo a guaranteed-clean base; subsequent changes log only deltas until the next checkpoint resets the flag. The page LSN is stored in each page header and records the LSN of the last change applied to that page. During redo, recovery compares each record's LSN to the page LSN and skips anything already reflected, making redo idempotent and restartable. Underpinning both is the WAL invariant: the log must be flushed up to a page's LSN before that page is written to disk, which guarantees any page found on disk during recovery has its explaining WAL already durable.",
        tip: "The link to hammer: full-page write gives a clean base, page LSN makes replay idempotent, WAL invariant makes the on-disk page trustworthy."
      },
      {
        q: "The WAL disk is filling even though checkpoints run on schedule. How do you reason about it?",
        a: "Checkpoints make segments before the redo point recyclable, but recyclability isn't the same as freedom to reuse. A segment is retained while any consumer still needs it: a pending archive_command that hasn't succeeded, or a replication slot (physical or logical) whose consumer is lagging or abandoned. Either pins WAL past the redo point, so the stream grows until the disk fills and all writes stop. I'd check replication slot lag (pg_replication_slots), archiver status (pg_stat_archiver failures), and the WAL generation rate; the fix is to repair or drop the stalled consumer and alert on WAL disk usage and slot lag going forward. It's also worth confirming full-page-write volume from over-frequent checkpoints isn't accelerating growth.",
        tip: "Separate 'recyclable' from 'reusable' — the gap between them is always a pinned consumer (slot or archive)."
      }
    ],
    businessLens: {
      task: "Make every ShopKart commit fast, durable, and crash-safe at the byte level",
      meaning: "'Order placed' must survive power loss and torn pages, without slowing checkout.",
      system: "OLTP write path internals (Postgres WAL)",
      point: "The internals decide ShopKart's real behavior: checkout latency is the WAL fsync time (group commit lets one flush confirm many simultaneous orders), torn-page safety costs the occasional full-page write, and the same durable stream that recovers a crashed node also feeds the read replicas and the analytics CDC pipeline. Understanding writtenLSN vs flushedLSN, full-page writes, and slot-pinned segments is what lets an engineer tune commit latency, keep the WAL disk from filling, and explain exactly why a 'committed' order is safe."
    }
  };
})();
