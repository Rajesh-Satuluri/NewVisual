/* ============================================================
   deepdives/buffer-pool.js — "Buffer Pool" deep dive.
   Registers DBLab.deepDives['buffer-pool'] (concept m30).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: a 4-frame buffer pool caching pages from an 8-page disk.
  // Watch hits vs misses, eviction when full, and dirty write-back.
  var DISK = ["P1", "P2", "P3", "P5", "P6", "P7", "P8", "P9"];
  function F(page, dirty, pinned, mark) { return { page: page || null, dirty: !!dirty, pinned: !!pinned, mark: mark || null }; }

  var STEPS = [
    {
      label: "1 · Why the pool exists",
      what: "Every read and write goes through the <b>buffer pool</b> — a fixed set of in-memory <b>frames</b> that cache disk pages. Here we have 4 frames, all empty, over an 8-page table on disk.",
      why: "Disk is roughly <b>10,000× slower</b> than RAM. If most requests are served from cached pages, the database almost never waits on disk — making the buffer pool the single biggest lever on performance.",
      how: "A hash table maps <code>page-id → frame</code>. A request checks it: a <b>hit</b> is served from memory; a <b>miss</b> reads the page from disk into a free frame first.",
      when: "On every page access — index descents, heap fetches, writes. Nothing reads the data files directly.",
      mistake: "Thinking queries read straight from disk. They read from the buffer pool; disk I/O only happens on a miss (or a flush).",
      interview: "“What is the buffer pool?” An in-memory cache of disk pages in fixed-size frames, sitting between the executor and storage, that turns most reads into memory accesses.",
      example: "ShopKart's hot product pages live in the buffer pool, so a bestseller's row is served from RAM thousands of times without a single disk read.",
      viz: { frames: [F(), F(), F(), F()], hits: 0, misses: 0, req: "reads go through the pool →", note: "A hit is served from memory; a miss must fetch the page from disk (~10,000× slower)." }
    },
    {
      label: "2 · Miss → load from disk",
      what: "A query needs page <b>P3</b>. It's not cached — a <b>miss</b>. The pool reads P3 from disk into a free frame. The next reader of P3 will be served from memory.",
      why: "The first touch of any page always pays a disk read. The buffer pool's value is that every <i>subsequent</i> touch is free, so a cold miss amortizes over many warm hits.",
      how: "The frame is filled from disk, the page-table maps <code>P3 → frame 0</code>, and the frame's reference bit is set to mark it recently used.",
      when: "Any access to a page not currently resident — cold cache, or a page evicted earlier.",
      mistake: "Optimizing away the cold miss. You can't avoid the first read; you optimize the <i>hit ratio</i> on everything after it.",
      interview: "“What happens on a buffer miss?” The page is read from disk into a free (or newly evicted) frame, the page table is updated, and the request proceeds from memory.",
      example: "The first shopper to open a rarely-viewed SKU triggers a disk read; everyone after them hits the cached page.",
      viz: { frames: [F("P3", 0, 0, "hot"), F(), F(), F()], hits: 0, misses: 1, req: "GET P3 → MISS (loaded from disk)", note: "Cold miss: P3 read from disk into frame 0. Now resident." }
    },
    {
      label: "3 · Hit → served from memory",
      what: "The same query — or another — asks for <b>P3</b> again. This time it's resident: a <b>hit</b>. No disk I/O; the page is returned straight from the frame.",
      why: "This is the whole point. A hit is orders of magnitude faster than a miss. A database's read performance is essentially its <b>hit ratio</b> × the cost difference between RAM and disk.",
      how: "The page table finds <code>P3 → frame 0</code> immediately; the reference bit is refreshed so the page stays 'recently used' and resists eviction.",
      when: "Every access to an already-resident page — the common case in a well-sized pool.",
      mistake: "Ignoring hit ratio in monitoring. A dropping hit ratio is the earliest signal that working set has outgrown memory.",
      interview: "“What determines read latency in a warm database?” The buffer-pool hit ratio: hits are memory-speed, misses are disk-speed, so a high hit ratio is what keeps p99 low.",
      example: "ShopKart's homepage bestsellers are hit millions of times a day entirely from RAM — the pages never leave the pool.",
      viz: { frames: [F("P3", 0, 0, "hot"), F(), F(), F()], hits: 1, misses: 1, req: "GET P3 → HIT (from memory)", note: "Resident hit: zero disk I/O. Read latency ≈ memory latency." }
    },
    {
      label: "4 · The pool fills up",
      what: "More queries touch <b>P5, P1, P7</b> — each a miss, each loaded into a free frame. Now all 4 frames are occupied. The pool is <b>full</b>.",
      why: "A finite pool can't hold everything. Once full, admitting a new page requires evicting an existing one — which is where the replacement policy earns its keep.",
      how: "Each miss fills the next free frame and sets its reference bit. With no free frames left, the next miss must choose a victim to evict.",
      when: "Quickly, under any real workload — the working set almost always exceeds the pool, so it runs full.",
      mistake: "Sizing the pool for the average and forgetting the working set. If hot data doesn't fit, you'll evict-and-reload constantly.",
      interview: "“What happens when the buffer pool is full and a miss occurs?” The replacement policy selects a victim frame to evict, then loads the new page into it.",
      example: "During a flash sale, ShopKart touches far more pages than fit in memory, so the pool runs full and eviction decisions start to matter.",
      viz: { frames: [F("P3"), F("P5"), F("P1"), F("P7", 0, 0, "hot")], hits: 1, misses: 4, req: "GET P5, P1, P7 → all MISS", note: "All 4 frames occupied. The next miss must evict something." }
    },
    {
      label: "5 · Eviction: LRU picks a victim",
      what: "A query needs <b>P2</b> (miss), but the pool is full. The replacement policy evicts the <b>least-recently-used</b> page — here <b>P3</b>, untouched since step 3 — and loads P2 into that frame.",
      why: "You want to evict the page least likely to be needed soon. LRU (approximated by a clock/second-chance scan of reference bits) is a cheap, effective proxy: recently used ≈ soon used again.",
      how: "The clock hand sweeps frames, clearing reference bits; the first frame with a clear bit and no pin is evicted. P3's bit had gone cold, so P3 is the victim; P2 takes its frame.",
      when: "On every miss while the pool is full.",
      mistake: "Assuming exact LRU. Real pools use clock/second-chance approximations — maintaining true LRU order on every access is too expensive at scale.",
      interview: "“How does eviction actually work?” Usually a clock (second-chance) approximation of LRU: sweep frames, give recently-used pages a second chance by clearing their bit, evict the first unreferenced, unpinned frame.",
      example: "As the flash sale shifts to new products, ShopKart evicts the pages of items that stopped selling to make room for the ones now trending.",
      viz: { frames: [F("P3", 0, 0, "victim"), F("P5"), F("P1"), F("P7")], hits: 1, misses: 5, req: "GET P2 → MISS · evict LRU (P3)", note: "Pool full → clock/LRU evicts P3 (coldest) → P2 loads into its frame." }
    },
    {
      label: "6 · Dirty pages & write-back",
      what: "An <code>UPDATE</code> modifies <b>P5</b> in memory — a <b>hit</b>, but now the frame is <b>dirty</b> (differs from disk). It is <b>not</b> written to disk immediately; the write is deferred (write-back).",
      why: "Write-back batches many logical writes into far fewer physical writes, and lets the WAL provide durability. Write-through — a disk write per modification — would destroy throughput.",
      how: "The frame is flagged dirty. It's flushed later (at a checkpoint, or when evicted). The <b>WAL rule</b> governs order: the log record for the change must be durable <i>before</i> the dirty page is written to disk.",
      when: "Whenever a page is modified; the flush happens asynchronously afterward.",
      mistake: "Forgetting a dirty page must be flushed <i>before</i> it can be evicted — and only after its WAL record is durable. Evicting a dirty page is a write, not a free.",
      interview: "“Why write-back instead of write-through, and how does it stay safe?” Write-back amortizes writes for throughput; safety comes from the WAL — log first, then the dirty page can be flushed or evicted.",
      example: "A ShopKart sale decrements stock on a cached page; the page goes dirty and is flushed in the background, while the WAL already made the change durable at commit.",
      viz: { frames: [F("P2"), F("P5", 1, 0, "hot"), F("P1"), F("P7")], hits: 2, misses: 5, req: "UPDATE on P5 → HIT, page now DIRTY", note: "Dirty = differs from disk. Flushed lazily; WAL record must be durable before the page is written." }
    },
    {
      label: "7 · Pinning & the hit-ratio game",
      what: "A page in active use is <b>pinned</b> — it can't be evicted until released (here <b>P7</b>). Everything else is a game of maximizing <b>hit ratio</b>: fit the working set, and don't let one query wreck the cache for others.",
      why: "Pinning guarantees correctness (you can't evict a page mid-read). Hit ratio is the performance headline: too small a pool causes <b>thrashing</b> (constant evict/reload), and a big sequential scan can flush the whole cache out from under everyone.",
      how: "Pinned frames are skipped by the clock hand. Large scans are protected against with a <b>ring buffer</b> (they reuse a few frames instead of evicting the hot set), and checkpoints spread dirty-page flushes to avoid I/O storms.",
      when: "Pins are held for the duration of a page access; ring-buffer strategies kick in for bulk scans; sizing is a capacity-planning decision.",
      mistake: "Letting a nightly full-table scan evict the entire hot working set, tanking the hit ratio for live traffic. Use ring-buffer / scan-resistant strategies.",
      interview: "“What can silently destroy your buffer-pool hit ratio?” A large sequential scan flushing the hot set, or a pool smaller than the working set causing thrashing — both fixable with sizing and scan-resistant eviction.",
      example: "ShopKart pins pages during active writes, and runs analytics scans with a ring buffer so the morning report doesn't evict the storefront's hot pages.",
      viz: { frames: [F("P2"), F("P5", 1, 0, null), F("P1"), F("P7", 0, 1, "hot")], hits: 3, misses: 5, req: "P7 PINNED (in use) · optimize hit ratio", note: "Pinned pages can't be evicted. The goal: keep the working set resident, protect it from scans." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function frameCard(f, i) {
      if (!f.page) {
        return '<div class="dd-card dd-card--ghost"><div class="dd-card-top"><span class="dd-card-name">frame ' + i + "</span>" +
          '<span class="dd-card-state">empty</span></div><div class="dd-card-val">—</div></div>';
      }
      var cls = "dd-card dd-frame" + (f.dirty ? " dd-card--pending" : "") +
        (f.mark === "victim" ? " dd-card--bad" : "") + (f.mark === "hot" ? " hot" : "") + (f.pinned ? " pinned" : "");
      var state = f.mark === "victim" ? "evicting" : (f.dirty ? "dirty" : "clean");
      var badges = "";
      if (f.pinned) badges += '<span class="dd-chip dd-chip--info">📌 pinned</span>';
      if (f.dirty) badges += '<span class="dd-chip dd-chip--warn">write-back</span>';
      if (f.mark === "hot" && !f.pinned && !f.dirty) badges += '<span class="dd-chip dd-chip--accent">accessed</span>';
      return '<div class="' + cls + '"><div class="dd-card-top"><span class="dd-card-name">' + f.page + "</span>" +
        '<span class="dd-card-state">' + state + "</span></div>" +
        '<div class="dd-card-val">frame ' + i + "</div>" +
        (badges ? '<div class="dd-frame-badges">' + badges + "</div>" : "") + "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch a 4-frame buffer pool serve reads from memory, ' +
          "evict a page when full, and defer a dirty write — the mechanics behind cache hit ratio.</div>";
        return;
      }
      var cached = {}; s.frames.forEach(function (f) { if (f.page) cached[f.page] = 1; });
      var total = s.hits + s.misses;
      var ratio = total ? Math.round((s.hits / total) * 100) : 0;
      var html = '<div class="dd-section"><div class="dd-bp-stats">' +
        '<span class="dd-bp-req">' + s.req + "</span>" +
        '<span class="dd-chip dd-chip--ok">hits ' + s.hits + "</span>" +
        '<span class="dd-chip dd-chip--bad">misses ' + s.misses + "</span>" +
        '<span class="dd-chip">hit ratio ' + ratio + "%</span></div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Buffer pool · 4 frames (memory)</div>' +
        '<div class="dd-row">' + s.frames.map(frameCard).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Data file · 8 pages (disk)</div>' +
        '<div class="dd-disk-strip">' + DISK.map(function (p) {
          return '<span class="dd-disk-page' + (cached[p] ? " cached" : "") + '">' + p + "</span>";
        }).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["buffer-pool"] = {
    slug: "buffer-pool",
    overview: {
      what: "The <b>buffer pool</b> is the database's in-memory cache of disk pages, held in a fixed set of <b>frames</b>. Every read and write goes through it, so most accesses hit memory instead of disk.",
      why: "Disk is ~10,000× slower than RAM. The buffer pool is the difference between a database that serves reads at memory speed and one that waits on disk for everything — it's the single biggest performance lever in the storage engine.",
      how: "A page table maps page-ids to frames. Hits are served from memory; misses read from disk into a free frame, evicting a victim (clock/LRU) when the pool is full. Modified pages are marked dirty and written back lazily, coordinated with the WAL for durability."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The buffer-pool access path (conceptual)",
      lang: "sql",
      code:
        "get_page(page_id):\n" +
        "    frame = page_table.lookup(page_id)\n" +
        "    if frame is not None:          # HIT — memory speed\n" +
        "        frame.ref_bit = 1\n" +
        "        return frame\n" +
        "    # MISS — need to bring it in\n" +
        "    if no free frame:\n" +
        "        victim = clock_sweep()     # LRU approximation, skips pinned frames\n" +
        "        if victim.dirty:\n" +
        "            flush_wal_up_to(victim.page_lsn)   # WAL rule: log first\n" +
        "            write_to_disk(victim)              # then the dirty page\n" +
        "        page_table.remove(victim.page_id)\n" +
        "    frame = read_from_disk(page_id)            # the expensive part\n" +
        "    page_table.insert(page_id, frame)\n" +
        "    return frame",
      highlights: [3, 9, 11]
    },
    reference: [
      ["buffer pool", "In-memory cache of disk pages, in fixed-size frames"],
      ["frame", "One slot in the pool holding a single page"],
      ["hit / miss", "Requested page is resident / must be read from disk"],
      ["hit ratio", "Fraction of accesses served from memory — the key perf metric"],
      ["page table", "Hash map from page-id to the frame holding it"],
      ["dirty page", "A frame modified in memory, not yet written to disk"],
      ["write-back", "Deferring dirty-page writes and batching them (vs write-through)"],
      ["eviction", "Removing a page to free a frame (clock/LRU policy)"],
      ["pin", "Mark a frame in-use so it can't be evicted"],
      ["thrashing", "Constant evict/reload when the working set exceeds the pool"]
    ],
    internals:
      "<p>The buffer pool is a fixed array of frames plus a hash table mapping <code>page-id → frame</code>. On a hit, the page is returned from memory and its reference bit is set. On a miss, a victim is chosen (if the pool is full), the new page is read in, and the map is updated.</p>" +
      "<p>Eviction is almost never exact LRU — maintaining a strict recency order on every access is too costly. Instead engines use the <b>clock (second-chance)</b> algorithm: a hand sweeps the frames, clearing reference bits; the first frame it finds already clear (and unpinned) is evicted. Recently-touched pages get a second chance, approximating LRU cheaply. Variants like LRU-K and ARC add scan resistance.</p>" +
      "<p>Writes use <b>write-back</b>: modified frames are flagged dirty and flushed later, in batches, at checkpoints or on eviction. Correctness is preserved by the <b>WAL rule</b> — a page's log records must be durable before the dirty page is written — and by <b>pinning</b>, which prevents a page from being evicted while it's actively being read or written.</p>",
    engineering:
      "<p>Sizing is the first decision: the pool should comfortably hold the <b>working set</b> (the pages actually touched under load), not the whole database. Watch the <b>hit ratio</b> and the dirty-page flush rate; a falling hit ratio is the earliest sign the working set has outgrown memory and you're heading into thrashing.</p>" +
      "<p>Guard the cache against <b>scans</b>: a single large sequential scan can evict the entire hot set, so engines route big scans through a small <b>ring buffer</b> instead. Coordinate checkpoints to spread dirty-page flushes and avoid I/O storms that spike latency. And remember the buffer pool interacts with the OS page cache — double-caching wastes memory, which is why some engines use direct I/O.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Read performance ≈ hit ratio.</b> A hit is memory-speed, a miss is disk-speed, so keeping the working set resident is the highest-leverage tuning you can do. Monitor hit ratio like an SLO." },
      { kind: "warn", html: "<b>A big sequential scan can flush your hot cache.</b> Left unchecked, one analytics query evicts the pages live traffic depends on, tanking the hit ratio. Use scan-resistant eviction / ring buffers for bulk reads." },
      { kind: "info", html: "<b>Evicting a dirty page is a write, not a free.</b> The page must be flushed to disk first — and only after its WAL record is durable (write-ahead rule). Dirty-heavy workloads make eviction expensive." }
    ],
    failureModes:
      "<p><b>Thrashing:</b> the pool is smaller than the working set, so pages are evicted and immediately reloaded, and the hit ratio collapses. <i>Fix:</i> size the pool to the working set; reduce per-query page footprint; add memory.</p>" +
      "<p><b>Cache pollution by scans:</b> a large sequential scan evicts the hot set, degrading everyone's latency. <i>Fix:</i> ring-buffer / scan-resistant strategies for bulk reads.</p>" +
      "<p><b>Checkpoint flush storms:</b> flushing many dirty pages at once saturates disk and spikes latency. <i>Fix:</i> spread checkpoints (completion target), tune dirty-page thresholds.</p>" +
      "<p><b>Double caching:</b> the buffer pool and the OS page cache both hold the same pages, halving effective memory. <i>Fix:</i> direct I/O or size the two caches deliberately.</p>",
    quickCheck: [
      {
        q: "A warm database's read latency suddenly climbs even though query plans are unchanged. What's the most likely buffer-pool cause?",
        options: [
          "The page table hash collided",
          "The hit ratio dropped — the working set no longer fits, so more reads go to disk",
          "Pages are being pinned too long",
          "Write-back was disabled"
        ],
        answer: 1,
        why: "Higher latency with stable plans usually means more misses: the working set outgrew the pool (or a scan flushed it), so reads that used to hit memory now wait on disk. Hit ratio is the metric to check first.",
        diff: "medium"
      },
      {
        q: "The pool is full and a miss occurs on a frame holding a dirty page selected as victim. What must happen before that frame can be reused?",
        options: [
          "Nothing — dirty pages are dropped",
          "The page's WAL records must be durable, then the dirty page is written to disk",
          "The whole pool is flushed",
          "The page is pinned"
        ],
        answer: 1,
        why: "Evicting a dirty page is a write. The WAL rule requires the page's log records to be durable first; then the page is flushed to disk, and only then can the frame hold a new page.",
        diff: "medium"
      },
      {
        q: "Why do buffer pools use a clock (second-chance) algorithm instead of exact LRU?",
        options: [
          "Clock evicts more pages",
          "Exact LRU can't handle dirty pages",
          "Maintaining true LRU order on every access is too expensive; clock approximates it cheaply",
          "Clock guarantees a 100% hit ratio"
        ],
        answer: 2,
        why: "Strict LRU requires reordering a structure on every single page access, which is too costly at scale. The clock algorithm approximates LRU using per-frame reference bits swept by a hand — nearly as effective, far cheaper.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Walk me through what happens on a buffer-pool hit versus a miss.",
        a: "On a hit, the page table finds the requested page-id already mapped to a frame; the page is returned from memory and its reference bit is set to mark it recently used — no disk I/O. On a miss, the page isn't resident: if there's a free frame it's used, otherwise the replacement policy (a clock/LRU approximation, skipping pinned frames) selects a victim. If the victim is dirty, its WAL records are flushed and the page is written to disk before the frame is reused. The requested page is then read from disk into the frame, the page table is updated, and the request proceeds. The cost gap between the two paths — memory vs disk — is why hit ratio dominates read performance.",
        tip: "Explicitly mention the dirty-victim + WAL-rule branch; it's the detail that shows you understand write-back, not just caching."
      },
      {
        q: "Why write-back instead of write-through, and how does the database stay durable?",
        a: "Write-through — writing every modification straight to disk — turns each logical write into a random disk write and destroys throughput. Write-back instead marks pages dirty and flushes them later in batches (at checkpoints or on eviction), so many changes to a page cost one physical write. Durability doesn't depend on flushing the data page, though: it comes from the write-ahead log. The WAL rule guarantees a change's log record is durable before its dirty page is written, so even if a dirty page is still in memory at a crash, recovery can redo it from the log. Write-back gives throughput; the WAL gives durability.",
        tip: "The crisp framing: 'write-back for throughput, WAL for durability' — then state the ordering rule between them."
      },
      {
        q: "How would you diagnose and fix a database that's suddenly disk-bound?",
        a: "Start with the buffer-pool hit ratio and disk read rate. A dropped hit ratio points to the working set exceeding the pool — either organic growth (size up the pool / add memory / reduce per-query page footprint) or a specific culprit like a large sequential scan flushing the hot set (route bulk scans through a ring buffer or scan-resistant eviction). Check the dirty-page flush rate and checkpoint behavior for I/O storms (spread checkpoints). Also verify you're not double-caching with the OS page cache. In short: measure hit ratio and flush behavior, identify whether it's sizing, a scan, or checkpointing, and fix that specific cause.",
        tip: "Lead with 'check the hit ratio' — it signals you debug storage performance from the cache metric outward, not by guessing."
      }
    ],
    businessLens: {
      task: "ShopKart's hot product & session pages served from the buffer pool",
      meaning: "Bestsellers and active carts respond at memory speed; disk only handles the long tail.",
      system: "OLTP storage engine (Postgres shared_buffers)",
      point: "ShopKart's traffic is highly skewed — a small set of trending products and active sessions accounts for most requests. Sized right, the buffer pool keeps those hot pages resident so the storefront answers from RAM, and disk only serves the rare long-tail item. The risks are equally concrete: the nightly analytics scan can flush the hot set (so it runs scan-resistant), and a flash sale can push the working set past memory into thrashing (so hit ratio is watched like an SLO). The buffer pool is where 'the site feels instant' is actually won or lost."
    }
  };
})();
