/* ============================================================
   deepdives/slotted-pages.js — "Slotted Pages" deep dive.
   Registers DBLab.deepDives['slotted-pages'] (concept m29).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: one 8 KB heap page storing variable-length ShopKart rows.
  // Slot directory (grows down) + tuples (grow up from the end) + free
  // space in the middle. Slot numbers = stable row ids (ctids).
  function S(id, ref, dead) { return { id: id, ref: ref, dead: !!dead }; }
  function T(name, size, mark) { return { name: name, size: size, mark: mark || null }; }

  var STEPS = [
    {
      label: "1 · Anatomy of a page",
      what: "A table is stored as fixed-size <b>pages</b> (typically 8 KB). Inside each: a small <b>header</b>, a <b>slot directory</b> that grows down from the top, the <b>tuples</b> (rows) that grow up from the bottom, and <b>free space</b> in the middle.",
      why: "Rows are variable-length (a product name can be 5 or 50 chars), and they come and go. The slotted layout lets a page pack variable-size rows, reclaim deleted space, and — crucially — reorganize itself without invalidating pointers from outside.",
      how: "The header tracks free-space bounds. The slot directory and the tuple area grow toward each other; the page is full when they meet. Each <b>slot</b> will hold a <code>(offset, length)</code> pointer to one tuple.",
      when: "This is the on-disk shape of every heap page in Postgres, and closely mirrors most row-store engines.",
      mistake: "Imagining rows stored back-to-back with no directory. Without slots you couldn't have stable row ids or compact free space.",
      interview: "“How is a row physically located on disk?” It lives in a page, addressed by a slot in that page's directory that points to the tuple's byte offset.",
      example: "ShopKart's <code>products</code> table is a heap of 8 KB pages; SKU rows live inside them via the slot directory.",
      viz: { slots: [], tuples: [], free: 8168, note: "Empty page: header + an empty slot directory + all free space. Slots grow down, tuples grow up." }
    },
    {
      label: "2 · Insert a row → slot + tuple",
      what: "Insert product row <b>A</b> (120 bytes). The tuple is written at the bottom of the free area, and <b>slot 0</b> is added pointing to it. The row's identity is now <code>(page, slot 0)</code>.",
      why: "The slot is the level of indirection that makes everything else work: external references point at the <i>slot number</i>, not the byte offset — so the bytes can move later without breaking anyone.",
      how: "The tuple is placed at the current end-of-free-space; a 4-byte slot entry <code>(offset, length)</code> is appended to the directory. Free space shrinks from both ends by tuple + slot size.",
      when: "Every <code>INSERT</code> adds one tuple and one slot to some page with room.",
      mistake: "Thinking the row id is a byte offset. It's the slot index — stable across page reorganizations, which is the whole point.",
      interview: "“What exactly is a ctid / rid?” A physical row address: the page number plus the slot number within that page's directory.",
      example: "Inserting SKU #42's row places its tuple in a page and assigns it ctid (page, 0).",
      viz: { slots: [S(0, "A")], tuples: [T("A", 120, "hot")], free: 8044, note: "Tuple A stored; slot 0 → A. Row id = (page, slot 0), independent of the byte offset." }
    },
    {
      label: "3 · More rows fill in",
      what: "Insert <b>B</b> (200 B) and <b>C</b> (100 B). Slots 1 and 2 are appended; the tuples stack up from the bottom. Three rows, three slots, free space shrinking in the middle.",
      why: "The directory keeps rows individually addressable regardless of physical order. Slot 1 always means row B, even though B's bytes sit between A's and C's.",
      how: "Each insert appends a slot and writes its tuple into free space. The slot directory (top) and tuple area (bottom) converge.",
      when: "Continuously as rows are added to a page until it fills.",
      mistake: "Assuming slot order matches physical byte order. They're decoupled — slot i points wherever tuple i happens to live.",
      interview: "“Do slot numbers reflect physical storage order?” No — slots are logical addresses; the tuple bytes can be in any order and can move.",
      example: "Three ShopKart products now share one page: SKUs at slots 0, 1, 2.",
      viz: { slots: [S(0, "A"), S(1, "B"), S(2, "C")], tuples: [T("A", 120), T("B", 200), T("C", 100, "hot")], free: 7740,
        note: "Slots 0,1,2 → A,B,C. Slot number is the stable identity; byte position is an implementation detail." }
    },
    {
      label: "4 · Variable-length records",
      what: "Notice <b>B</b> is 200 bytes while A and C are smaller. The slotted layout handles this natively because each slot stores a <code>(offset, <b>length</b>)</code> pair — rows don't need to be uniform size.",
      why: "Real rows vary: a long product title, a NULL column, a TOAST-able blob. Fixed-size slots pointing to variable-size tuples give you both compact packing and O(1) slot lookup.",
      how: "To read row B, the engine reads slot 1, gets its offset and length, and reads exactly those bytes. No scanning, no delimiters — the length is right there in the slot.",
      when: "Any table with variable-width columns (<code>varchar</code>, <code>text</code>, nullable fields) — i.e. almost all of them.",
      mistake: "Confusing the fixed-size <i>slot</i> with a fixed-size <i>row</i>. Slots are uniform (4 bytes); the tuples they point to are any size.",
      interview: "“How does a page store variable-length rows efficiently?” Uniform fixed-size slots hold (offset, length) pointers into a variable-length tuple area — O(1) lookup, compact storage.",
      example: "SKU #77 has a long marketing title (200 B) while #42 is short (120 B); both live cleanly in the same page via their slots.",
      viz: { slots: [S(0, "A"), S(1, "B"), S(2, "C")], tuples: [T("A", 120), T("B", 200, "hot"), T("C", 100)], free: 7740,
        note: "Each slot = (offset, length). B's 200 B and C's 100 B coexist — the directory makes variable sizes trivial." }
    },
    {
      label: "5 · Delete → tombstone + a hole",
      what: "Delete row <b>B</b>. Its slot is marked <b>dead</b> (a tombstone) and B's 200 bytes become a <b>hole</b> — free, but stranded in the middle of the tuple area. A and C keep their slot numbers unchanged.",
      why: "The engine can't instantly shuffle bytes on every delete (too expensive, and other transactions may still need the slot under MVCC). So it just flags the slot dead; the space is <b>fragmented</b> until reclaimed.",
      how: "The slot entry is set to a dead/redirect marker. The tuple bytes remain until cleanup. Free space is technically larger but not <i>contiguous</i>, so a big new row might not fit despite 'enough' free bytes.",
      when: "Every <code>DELETE</code> (and the old version of every <code>UPDATE</code> under MVCC) leaves a dead slot + hole for later cleanup.",
      mistake: "Expecting deleted space to be immediately usable. It's fragmented; only compaction (or VACUUM) makes it contiguous again.",
      interview: "“What happens to a row's space when you delete it?” The slot is tombstoned and the bytes become a hole; the space is reclaimed later by compaction/VACUUM, not instantly.",
      example: "A discontinued ShopKart product is deleted; its slot goes dead and leaves a 200 B gap between the surviving rows.",
      viz: { slots: [S(0, "A"), S(1, "", true), S(2, "C")], tuples: [T("A", 120), T("", 200, "hole"), T("C", 100)], free: 7740,
        note: "Slot 1 tombstoned; B's bytes are a hole (fragmentation). A and C keep slots 0 and 2." }
    },
    {
      label: "6 · Compaction — bytes move, slots don't",
      what: "The page is compacted (by VACUUM, or on demand). Live tuples are slid together to close the hole, free space coalesces — and the magic: <b>slot numbers stay the same</b>. C is still slot 2, even though its bytes moved.",
      why: "This is why slotted pages exist. The page can reorganize freely to reclaim space, and every external pointer — every index entry, every ctid — keeps working, because it references the <i>slot</i>, not the moved bytes.",
      how: "Compaction rewrites the tuple area with only live rows, updates each live slot's <code>offset</code> to the new location, and merges the freed bytes into one contiguous region. Slot indices are untouched.",
      when: "During VACUUM, HOT-chain pruning, or page-level compaction when a write needs contiguous space.",
      mistake: "Believing indexes must be rewritten when a page compacts. They don't — the slot indirection absorbs the byte movement entirely.",
      interview: "“Why can a page reclaim space without touching indexes?” Because indexes point at (page, slot); compaction moves bytes and updates slot offsets, but the slot numbers indexes rely on never change.",
      example: "ShopKart's autovacuum compacts the page: the hole vanishes, contiguous free space returns, and every index still finds C at slot 2.",
      viz: { slots: [S(0, "A"), S(1, "", true), S(2, "C")], tuples: [T("A", 120), T("C", 100, "hot")], free: 7940,
        note: "Hole reclaimed → free space contiguous. C's bytes moved, but it's STILL slot 2 — index pointers stay valid." }
    },
    {
      label: "7 · Reuse & why it all matters",
      what: "A new row <b>D</b> can reuse the dead <b>slot 1</b> and the now-contiguous free space. The directory tracks which slots are free; a table-level <b>free space map</b> tracks which pages have room.",
      why: "The slotted page is the quiet foundation under indexes and MVCC: stable <code>(page, slot)</code> addresses let indexes point at rows, let ctids identify versions, and let the storage engine compact and reuse space without a cascade of pointer rewrites.",
      how: "An insert consults the free space map to find a page with room, reuses a dead slot if available (or appends a new one), and writes the tuple into contiguous free space. The FSM keeps inserts O(1)-ish instead of scanning pages.",
      when: "Every insert; the free space map is what makes 'find a page with room' fast across a large table.",
      mistake: "Ignoring bloat: if compaction/VACUUM falls behind, pages fill with dead slots and holes, and the table grows even though live rows didn't.",
      interview: "“Tie slotted pages to indexes and MVCC.” Indexes and MVCC both rely on stable ctids; the slot directory provides them while still allowing free space to be reclaimed and reused.",
      example: "A newly listed ShopKart product slots into the reclaimed space (slot 1), and the free space map routes future inserts to pages that still have room.",
      viz: { slots: [S(0, "A"), S(1, "D"), S(2, "C")], tuples: [T("A", 120), T("C", 100), T("D", 90, "hot")], free: 7850,
        note: "Row D reuses slot 1 + contiguous free space. Stable slots are the foundation indexes and MVCC build on." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function slotChip(s) {
      var cls = "dd-slot" + (s.dead ? " dead" : "");
      return '<div class="' + cls + '">slot ' + s.id + " → " + (s.dead ? "✗ dead" : s.ref) + "</div>";
    }
    function tupleCard(t) {
      if (t.mark === "hole") return '<div class="dd-tuple hole">hole · ' + t.size + " B</div>";
      var cls = "dd-tuple" + (t.mark === "hot" ? " hot" : "");
      return '<div class="' + cls + '"><b>' + t.name + "</b> <small>" + t.size + " B</small></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to build up one heap page — insert variable-length rows, ' +
          "delete one, compact the hole — and see why slot numbers stay stable so indexes never break.</div>";
        return;
      }
      var slotsHtml = s.slots.length ? '<div class="dd-slotdir">' + s.slots.map(slotChip).join("") + "</div>"
        : '<div class="dd-note">Slot directory is empty.</div>';
      var tuplesHtml = s.tuples.length ? '<div class="dd-tuples">' + s.tuples.map(tupleCard).join("") +
          '<div class="dd-freespace">free space · ' + s.free + " B</div></div>"
        : '<div class="dd-tuples"><div class="dd-freespace">free space · ' + s.free + " B (whole page)</div></div>";
      var html = '<div class="dd-page">' +
        '<div class="dd-page-hd"><span>Heap page · products</span><span>8 KB</span></div>' +
        '<div class="dd-page-body">' +
          '<div><div class="dd-sub-label">Slot directory (grows down)</div>' + slotsHtml + "</div>" +
          '<div><div class="dd-sub-label">Tuples (grow up from page end)</div>' + tuplesHtml + "</div>" +
        "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["slotted-pages"] = {
    slug: "slotted-pages",
    overview: {
      what: "A <b>slotted page</b> is the standard layout for storing variable-length rows in a fixed-size page: a <b>slot directory</b> of <code>(offset, length)</code> pointers grows down from the top, while the <b>tuples</b> grow up from the bottom, with free space in between.",
      why: "Rows vary in size and are constantly inserted, updated, and deleted. The slot directory gives every row a stable <code>(page, slot)</code> address that survives page reorganization — which is exactly what lets indexes point at rows and lets the engine reclaim deleted space without rewriting anything external.",
      how: "Inserts append a slot and write the tuple into free space. Deletes tombstone a slot, leaving a hole. Compaction slides live tuples together and updates slot offsets — but never changes slot numbers, so external pointers stay valid."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "A slotted page's structure (conceptual)",
      lang: "sql",
      code:
        "PAGE (8 KB):\n" +
        "  [ header | free_start, free_end ]\n" +
        "  [ slot 0: (offset=8044, len=120) ]   -> row A     directory grows DOWN\n" +
        "  [ slot 1: DEAD (tombstone)       ]   -> (deleted)\n" +
        "  [ slot 2: (offset=7940, len=100) ]   -> row C\n" +
        "         ... free space ...                          the two ends grow\n" +
        "  [ ................ row C bytes ...................] toward each other\n" +
        "  [ ................ row A bytes ...................] tuples grow UP\n" +
        "\n" +
        "-- Row identity = ctid (page, slot).  Compaction moves BYTES and rewrites\n" +
        "-- each live slot's offset, but slot NUMBERS never change -> indexes stay valid.",
      highlights: [3, 4, 11]
    },
    reference: [
      ["page", "Fixed-size storage/IO unit (commonly 8 KB) holding many rows"],
      ["slot directory", "Array of (offset, length) pointers, one per row, growing down"],
      ["slot", "One directory entry; its index is the row's stable address"],
      ["tuple", "The stored bytes of one row version, in the tuple area"],
      ["ctid / rid", "Physical row address: (page number, slot number)"],
      ["tombstone", "A dead slot marking a deleted/moved row"],
      ["fragmentation", "Free bytes stranded as holes between live tuples"],
      ["compaction", "Sliding live tuples together to coalesce free space"],
      ["free space map", "Per-table index of which pages have room for inserts"]
    ],
    internals:
      "<p>A slotted page decouples a row's <b>logical address</b> (its slot number) from its <b>physical location</b> (its byte offset). The header records where free space starts and ends; the slot directory grows down from just after the header while tuples are written up from the page's tail. The page is full when the directory meets the tuple area.</p>" +
      "<p>This indirection is the linchpin. To find a row you read its slot to get <code>(offset, length)</code> and then the bytes — O(1). To <b>delete</b>, you tombstone the slot and leave the bytes as a hole. To <b>compact</b> (VACUUM, HOT pruning), you rewrite the tuple area with only live rows and update each surviving slot's offset — but slot indices are preserved, so every index entry and every <code>ctid</code> that references <code>(page, slot)</code> still resolves correctly.</p>" +
      "<p>Under MVCC this is why an <code>UPDATE</code> can write a new tuple and keep the old one in the same or another page: each version is just another slot/tuple, and the old slot is reclaimed once no snapshot needs it. The per-table <b>free space map</b> makes finding a page with room fast, keeping inserts cheap.</p>",
    engineering:
      "<p>The slotted page shapes real behavior you tune around. Because deletes and updates leave dead slots and holes, tables accumulate <b>bloat</b> until compaction/VACUUM reclaims it — so autovacuum health directly controls table size and scan cost. Because a row's ctid can change when it moves pages, index entries may need updating (mitigated by Postgres <b>HOT</b> updates, which keep an updated row on the same page and avoid touching indexes).</p>" +
      "<p>Design implications: keep rows well under a page so they don't need out-of-line (TOAST) storage or cause poor packing; be aware that very wide rows waste space and reduce rows-per-page (hurting scan efficiency); and remember the <b>fill factor</b> knob leaves free space on each page so in-page (HOT) updates and compaction have room to work.</p>",
    gotchas: [
      { kind: "tip", html: "<b>The slot number is the stable row id, not the byte offset.</b> Compaction and updates move bytes freely; because indexes and ctids reference <code>(page, slot)</code>, they keep working without a rewrite." },
      { kind: "warn", html: "<b>Deleted space isn't instantly reusable.</b> A delete tombstones the slot and leaves a hole — the free bytes are fragmented until compaction/VACUUM coalesces them. 'Enough free bytes' doesn't mean 'contiguous room for a big row'." },
      { kind: "info", html: "<b>Fill factor buys room for HOT updates and compaction.</b> Leaving free space on each page lets an updated row stay on the same page (avoiding index churn) and gives compaction slack — useful for update-heavy tables." }
    ],
    failureModes:
      "<p><b>Table bloat:</b> heavy deletes/updates leave dead slots and holes faster than VACUUM reclaims them; the table grows and scans slow even though live rows didn't increase. <i>Fix:</i> tune autovacuum; occasionally rewrite (VACUUM FULL / pg_repack) in a window.</p>" +
      "<p><b>Poor page packing from wide rows:</b> rows near or over the page size store few per page (or spill to TOAST), inflating I/O per row. <i>Fix:</i> normalize or narrow wide columns; move large blobs out.</p>" +
      "<p><b>Index churn on updates:</b> an update that moves a row to another page must update index entries. <i>Fix:</i> enable conditions for HOT updates (don't update indexed columns; leave fill-factor headroom).</p>" +
      "<p><b>Fragmentation stalling inserts:</b> a page with plenty of non-contiguous free space can't fit a large new row. <i>Fix:</i> compaction; appropriate fill factor.</p>",
    quickCheck: [
      {
        q: "A page is compacted to reclaim a deleted row's space, and the surviving rows' bytes move to new offsets. What happens to the index entries pointing at those rows?",
        options: [
          "They must all be rewritten with the new offsets",
          "They keep working unchanged — they reference (page, slot), and slot numbers don't change",
          "They become invalid until the next VACUUM",
          "They point to the tombstone"
        ],
        answer: 1,
        why: "Indexes reference (page, slot). Compaction moves bytes and updates each live slot's offset, but the slot numbers stay the same, so every index entry and ctid still resolves. That stability is the reason slotted pages exist.",
        diff: "medium"
      },
      {
        q: "You delete a large row, then try to insert an even larger one into the same page and it doesn't fit — despite the page reporting enough total free bytes. Why?",
        options: [
          "The free bytes are fragmented into holes, not contiguous",
          "Deleted rows can never be replaced",
          "The slot directory is full",
          "The page is pinned"
        ],
        answer: 0,
        why: "A delete tombstones the slot and leaves the bytes as a hole. The free space exists but isn't contiguous, so a row larger than the biggest gap won't fit until compaction coalesces the free space.",
        diff: "medium"
      },
      {
        q: "Why does the slot directory store a length alongside the offset for each row?",
        options: [
          "To sort rows by size",
          "So variable-length rows can be read exactly, with O(1) lookup and no delimiters",
          "To enforce a fixed row size",
          "To speed up eviction"
        ],
        answer: 1,
        why: "Storing (offset, length) lets the engine read exactly a row's bytes regardless of size, giving O(1) access to variable-length rows without scanning for delimiters — uniform fixed-size slots pointing into a variable-length tuple area.",
        diff: "easy"
      }
    ],
    interviewQs: [
      {
        q: "Describe the slotted page layout and why databases use it.",
        a: "A page (usually 8 KB) has a header, a slot directory that grows down from the top, and a tuple area that grows up from the bottom, with free space between. Each slot is a fixed-size (offset, length) pointer to one variable-length tuple, and a row's identity is (page, slot). This layout does three things at once: it packs variable-length rows efficiently with O(1) lookup; it gives every row a stable address that survives the bytes moving; and it lets the page reclaim deleted space by compacting — sliding live tuples together and updating slot offsets — without changing slot numbers, so indexes and ctids never need rewriting. That stable indirection is what indexes and MVCC are built on.",
        tip: "The payoff sentence to land: 'compaction moves bytes but not slot numbers, so external pointers stay valid.'"
      },
      {
        q: "What happens to a page's space over a delete and a later update, and how is it reclaimed?",
        a: "A delete tombstones the row's slot and leaves its bytes as a hole — fragmented free space that isn't immediately reusable for a large row. Under MVCC an update is similar: it writes a new tuple (a new slot) and the old version becomes dead once no snapshot needs it. That dead space accumulates as bloat until compaction reclaims it — VACUUM (and HOT pruning) rewrites the tuple area with only live rows, coalescing free space and updating live slots' offsets while preserving slot numbers. If VACUUM falls behind, the table bloats and scans slow even though the live row count is flat.",
        tip: "Connect it to VACUUM/bloat — it shows you understand slotted pages operationally, not just structurally."
      },
      {
        q: "What's a HOT update and how does the page layout enable it?",
        a: "A Heap-Only Tuple update keeps an updated row's new version on the same page as the old one and chains them, so the update doesn't have to insert new entries into every index — as long as no indexed column changed and the page has room. The slotted layout enables it: the new tuple gets a slot on the same page, the old slot redirects to it, and because indexes reference the original ctid which still resolves through the chain, they don't need updating. This is why leaving fill-factor headroom on update-heavy tables improves performance — it gives HOT updates space to stay in-page.",
        tip: "Mentioning fill factor as the lever that makes HOT updates possible signals hands-on tuning experience."
      }
    ],
    businessLens: {
      task: "ShopKart's products heap storing variable-length rows",
      meaning: "Listings of any size are stored, edited, and deleted all day without breaking indexes or wasting space.",
      system: "OLTP heap storage (Postgres pages)",
      point: "ShopKart product rows vary wildly — a terse SKU vs a long marketing title — and they're edited and delisted constantly. The slotted page absorbs all of that: variable sizes pack cleanly, deletes leave reclaimable holes, and compaction tidies pages without ever invalidating the index entries that point at products by ctid. The operational catch is bloat: if autovacuum falls behind on a churny catalog, pages fill with dead slots and the table swells, slowing every scan. So the same layout that makes flexible storage possible is also why VACUUM health is a real ShopKart performance concern."
    }
  };
})();
