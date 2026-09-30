/* ============================================================
   deepdives/b-plus-tree.js — "B+ Tree" deep dive.
   Registers DBLab.deepDives['b-plus-tree'] (concept m36).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Helpers to build tree levels. A node = { keys:[...], cls? }.
  // A key is a number, or { v, hl } where hl = "hit" | "scan".
  function N(keys, cls) { return { keys: keys, cls: cls || "" }; }

  var STEPS = [
    {
      label: "1 · The shape: keys up top, values in leaves",
      what: "A <b>B+ Tree</b> keeps keys <b>sorted</b> and the tree <b>balanced</b>. Internal nodes hold only <b>separator keys</b> that route you downward; all actual rows live in the <b>leaf</b> level, which is chained left→right into a linked list.",
      why: "This shape makes lookups, inserts, and range scans all <code>O(log n)</code> with tiny constants — which is why the B+ Tree is the default index in virtually every relational engine.",
      how: "The root's separators (<code>30, 60</code>) split the key space into three ranges, each pointing to a leaf. Values sit only in leaves; internal nodes are pure signposts.",
      when: "Every primary key and most secondary indexes in Postgres, MySQL/InnoDB, Oracle, SQL Server are B+ Trees.",
      mistake: "Thinking values live throughout the tree. In a B+ Tree (unlike a plain B-Tree) values are only in leaves — internal nodes are keys + child pointers.",
      interview: "“Where does the data live in a B+ Tree?” Only in the leaf nodes, which are linked; internal nodes hold separator keys and child pointers.",
      example: "ShopKart's index on <code>products(sku)</code>: internal nodes route by SKU range; leaves hold the pointers to the actual product rows.",
      viz: { levels: [[N([30, 60])], [N([10, 20]), N([30, 40, 50]), N([60, 70, 80])]], linkLeaves: true,
        note: "Root routes by range; values live only in the linked leaves. Sorted + balanced." }
    },
    {
      label: "2 · Fan-out keeps it short",
      what: "Each node is sized to fill one <b>page</b> (~8 KB), so it holds not 2 but <b>hundreds</b> of keys. That high <b>fan-out</b> makes the tree extremely shallow — typically just 3–4 levels for <i>billions</i> of rows.",
      why: "In a database the bottleneck is <b>disk reads</b>, not comparisons. Each level is one page read, so minimizing height minimizes I/O. Fan-out of ~100–500 means <code>log₁₀₀(10⁹) ≈ 4.5</code> — a handful of reads to find any row.",
      how: "Height <code>h</code> satisfies <code>fanout^h ≥ N</code>. With fanout 100–500 (page size ÷ key size), even a trillion-row table is only 4–5 levels deep.",
      when: "Always — fan-out is what separates a B+ Tree from a binary tree and makes it disk-friendly.",
      mistake: "Comparing B+ Trees to binary search trees on comparison count. A BST is <code>log₂(n)</code> <i>disk reads</i>; a B+ Tree is <code>log₁₀₀(n)</code> — a ~7× shorter, disk-optimal tree.",
      interview: "“Why not a balanced binary tree for a database index?” Fan-out. A BST is one key per node = one disk read per level (~30 for a billion rows); a B+ Tree packs hundreds per page = 3–4 reads.",
      example: "ShopKart's billion-row order index is only ~4 levels deep, so any order lookup is ~4 page reads — most served from the buffer pool.",
      viz: { levels: [[N([30, 60])], [N([10, 20]), N([30, 40, 50]), N([60, 70, 80])]], linkLeaves: true,
        note: "Real nodes hold ~100–500 keys (one page). Height 3–4 indexes billions of rows — the whole point." }
    },
    {
      label: "3 · Point lookup: descend by range",
      what: "Find <b>sku = 70</b>. Start at the root: <code>70 ≥ 60</code>, so follow the right pointer to the leaf <code>[60, 70, 80]</code>, and there's 70. Two hops (root → leaf) in this toy tree; 3–4 in a real one.",
      why: "The search is a guided descent: at each node a couple of comparisons pick exactly one child. No backtracking, no scanning — you touch one node per level.",
      how: "At each internal node, binary-search the separators to choose a child, read that page, repeat. At the leaf, binary-search for the key and follow its pointer to the row.",
      when: "Every equality lookup and every index-driven join probe.",
      mistake: "Picturing a linear scan of the index. It's a logarithmic descent — one node per level, chosen by separator comparison.",
      interview: "“Trace a point lookup.” Descend from the root, at each level pick the child whose range contains the key, until you reach the leaf holding it — O(log_fanout n) page reads.",
      example: "Looking up SKU #70's product: root routes right, the leaf yields the row pointer — a couple of reads, mostly cached.",
      viz: { levels: [[N([{ v: 30 }, { v: 60, hl: "hit" }], "on-path")], [N([10, 20]), N([30, 40, 50]), N([60, { v: 70, hl: "hit" }, 80], "on-path")]], linkLeaves: true,
        note: "70 ≥ 60 → go right → found in the leaf. One node read per level." }
    },
    {
      label: "4 · Range scan: locate, then walk the leaves",
      what: "Find <b>sku BETWEEN 30 AND 70</b>. Descend once to the first matching leaf <code>[30,40,50]</code>, then simply <b>walk the leaf linked list</b> rightward into <code>[60,70,…]</code> — no re-descent per row.",
      why: "The chained leaves turn a range query into a sequential walk instead of repeated root-to-leaf searches. This is why B+ Trees are excellent for ranges, ORDER BY, and pagination — the exact thing hash indexes can't do.",
      how: "One descent finds the start leaf; then follow leaf→leaf sibling pointers, emitting keys in order until you pass the range's end (70).",
      when: "Range predicates (<code>BETWEEN</code>, <code>&gt;</code>, <code>&lt;</code>), <code>ORDER BY</code> on the indexed column, and keyset pagination.",
      mistake: "Assuming each row in a range costs a full tree search. After the first descent, additional rows are a cheap linked-list walk.",
      interview: "“Why are B+ Trees good at range scans but hash indexes aren't?” Sorted, linked leaves let you locate the start and walk in order; a hash index scatters keys with no order to follow.",
      example: "A ShopKart 'price 30–70' filter finds the first leaf and streams matching SKUs along the leaf chain — no repeated descents.",
      viz: { levels: [[N([{ v: 30, hl: "scan" }, 60], "on-path")], [N([10, 20]), N([{ v: 30, hl: "scan" }, { v: 40, hl: "scan" }, { v: 50, hl: "scan" }], "on-path"), N([{ v: 60, hl: "scan" }, { v: 70, hl: "scan" }, 80], "on-path")]], linkLeaves: true, leafLink: "scan",
        note: "Descend once to the start leaf, then walk leaf→leaf in sorted order. Ranges are a walk, not repeated searches." }
    },
    {
      label: "5 · Insert & the leaf split",
      what: "Insert <b>45</b>. It belongs in the leaf <code>[30,40,50]</code>, but that leaf is full. It <b>splits</b> into <code>[30,40]</code> and <code>[45,50]</code>, and the separator <b>45</b> is pushed up into the parent.",
      why: "Splitting is how a B+ Tree stays balanced under inserts without ever leaving a leaf overfull. The tree grows sideways (more leaves) and only rarely upward.",
      how: "The full leaf is divided in two; the middle key is copied up as a new separator; the leaf sibling pointers are re-linked so the linked list stays intact. All leaves remain at the same depth.",
      when: "Whenever an insert lands in a full node.",
      mistake: "Thinking a split rewrites the whole tree. It touches one leaf, its parent, and two sibling links — local and cheap.",
      interview: "“What happens on insert into a full leaf?” It splits; the median key is promoted to the parent; sibling links are fixed. The tree stays balanced.",
      example: "Adding SKU #45 into a full leaf splits it and adds separator 45 to the parent — the index absorbs the new product with a local reorganization.",
      viz: { levels: [[N([30, { v: 45, hl: "hit" }, 60], "is-new")], [N([10, 20]), N([30, 40], "split"), N([45, 50], "is-new"), N([60, 70, 80])]], linkLeaves: true,
        note: "Full leaf [30,40,50] + 45 → split into [30,40] | [45,50]; separator 45 promoted to the parent." }
    },
    {
      label: "6 · Root split — the only way height grows",
      what: "Enough splits eventually fill the <b>root</b>. When the root splits, a <b>new root</b> is created above it and the tree's <b>height grows by one</b>. This is the <i>only</i> event that increases height — and it keeps every leaf at the same depth.",
      why: "Because height only ever grows at the root, and always for the whole tree at once, a B+ Tree is <b>perfectly balanced by construction</b> — no rebalancing rotations, no degenerate skew, ever.",
      how: "The overfull root splits into two internal nodes; a new root holding their single separator is created on top. Height increases by exactly one, uniformly.",
      when: "Rarely — only when the root itself overflows, which for a real tree happens a handful of times over its whole life.",
      mistake: "Expecting frequent height changes. Height grows only on root splits, so a B+ Tree spends almost its whole life at a fixed, small height.",
      interview: "“How does a B+ Tree stay balanced?” Splits propagate upward; only a root split adds height, and it adds it to all paths at once — so all leaves are always at equal depth.",
      example: "After ShopKart's catalog grows enough, the order index's root splits once, taking it from 3 to 4 levels — invisible to queries, still balanced.",
      viz: { levels: [[N([45], "is-new")], [N([30]), N([60])], [N([10, 20]), N([30, 40]), N([45, 50]), N([60, 70, 80])]], linkLeaves: true,
        note: "Root split creates a new root → height 2→3. The only way height grows; every leaf stays at equal depth." }
    },
    {
      label: "7 · Key choice makes or breaks it",
      what: "The tree's write behavior depends heavily on your <b>key</b>. <b>Sequential</b> keys (auto-increment, time) append to the right-most leaf — compact, few splits. <b>Random</b> keys (UUIDv4) cause splits <i>all over</i> the tree — fragmentation and write amplification. Wide keys shrink fan-out and grow height.",
      why: "This is the single most impactful index design decision. A poor key choice turns an efficient structure into a source of bloat, cache misses, and slow writes — without changing a line of query code.",
      how: "Sequential inserts touch one hot leaf repeatedly (great locality, some contention). Random inserts dirty pages scattered across the tree, hurting the buffer-pool hit ratio and causing frequent, spread-out splits.",
      when: "At schema-design time — choosing primary keys and index columns.",
      mistake: "Defaulting to random UUIDv4 primary keys on a huge write-heavy table. Prefer sequential or time-ordered keys (UUIDv7/ULID) to keep inserts local.",
      interview: "“Why can UUID primary keys hurt a B+ Tree?” Random keys spread inserts and splits across the whole tree, fragmenting pages and amplifying writes; sequential keys keep inserts to the right-most leaf.",
      example: "ShopKart switches order ids from random UUIDs to time-ordered ULIDs; inserts now append to the right-most leaf, cutting page splits and write amplification.",
      viz: { levels: [[N([45])], [N([30]), N([60])], [N([10, 20]), N([30, 40]), N([45, 50]), N([60, 70, { v: 80, hl: "hit" }], "on-path")]], linkLeaves: true,
        note: "Sequential keys append to the right-most leaf (compact); random UUIDs split leaves everywhere (fragmentation)." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function keyHtml(k) {
      var v = (k && typeof k === "object") ? k.v : k;
      var hl = (k && typeof k === "object") ? k.hl : null;
      return '<span class="dd-node-key' + (hl ? " " + hl : "") + '">' + v + "</span>";
    }
    function nodeHtml(n) {
      return '<div class="dd-node' + (n.cls ? " " + n.cls : "") + '">' + n.keys.map(keyHtml).join("") + "</div>";
    }
    function levelHtml(nodes, isLeaf, leafLink) {
      if (isLeaf) {
        var link = '<span class="dd-leaflink' + (leafLink ? " " + leafLink : "") + '">→</span>';
        return '<div class="dd-tree-level">' + nodes.map(nodeHtml).join(link) + "</div>";
      }
      return '<div class="dd-tree-level">' + nodes.map(nodeHtml).join("") + "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to walk a B+ Tree — a point lookup, a range scan along the linked leaves, ' +
          "and a leaf split that keeps the tree balanced.</div>";
        return;
      }
      var last = s.levels.length - 1;
      var tree = s.levels.map(function (lvl, i) {
        return levelHtml(lvl, s.linkLeaves && i === last, s.leafLink);
      }).join("");
      var html = '<div class="dd-section"><div class="dd-section-label">B+ Tree index on products(sku)</div>' +
        '<div class="dd-tree">' + tree + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["b-plus-tree"] = {
    slug: "b-plus-tree",
    overview: {
      what: "A <b>B+ Tree</b> is a balanced, sorted, high-fan-out tree that is the default index structure in almost every relational database. Internal nodes hold only separator keys; all values live in the leaf level, which is linked into a sorted list.",
      why: "It answers the core storage question — 'find one row among billions in a few disk reads' — while also supporting range scans and ordered iteration. Point lookups, ranges, and inserts are all O(log n) with a tiny base, because each node fills a page and holds hundreds of keys.",
      how: "You descend from the root, at each level choosing the child whose key range contains your search key, until you reach a leaf. Ranges locate a start leaf then walk the linked leaves in order. Inserts split full nodes and propagate splits upward; only a root split increases height, so the tree stays perfectly balanced."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "A B+ Tree index in practice",
      lang: "sql",
      code:
        "CREATE INDEX idx_sku ON products (sku);   -- a B+ Tree by default\n" +
        "\n" +
        "-- Point lookup: descend root -> internal -> leaf (~3-4 page reads for billions)\n" +
        "SELECT * FROM products WHERE sku = 70;\n" +
        "\n" +
        "-- Range scan: locate the start leaf, then WALK the linked leaves in order\n" +
        "SELECT * FROM products WHERE sku BETWEEN 30 AND 70 ORDER BY sku;\n" +
        "\n" +
        "-- Height h satisfies:  fanout^h >= N     (fanout = page_size / key_size, ~100-500)\n" +
        "--   log_100(1e9) ~= 4.5  ->  ~4 levels indexes a billion rows.\n" +
        "-- Tip: sequential/time-ordered keys (ULID) keep inserts on the right-most leaf.",
      highlights: [4, 7]
    },
    reference: [
      ["B+ Tree", "Balanced, sorted, high-fan-out index; values only in linked leaves"],
      ["fan-out", "Children per node (~100–500), set by page size ÷ key size"],
      ["internal node", "Holds separator keys + child pointers; no values"],
      ["leaf node", "Holds keys + row pointers (values); chained left→right"],
      ["separator key", "A routing key in an internal node, not a stored value"],
      ["leaf linked list", "Sibling pointers enabling ordered range scans"],
      ["split", "Dividing a full node in two, promoting the median key"],
      ["height", "Number of levels; grows only on a root split (stays balanced)"],
      ["clustered index", "Index whose leaves hold the actual rows (vs pointers)"]
    ],
    internals:
      "<p>A B+ Tree stores <b>separator keys</b> in internal nodes and <b>all values</b> (or row pointers) in the leaves, which are chained into a doubly-linked list. Keeping internal nodes value-free maximizes <b>fan-out</b> — more separators per page means a shorter tree — and chaining the leaves makes range scans a sequential walk.</p>" +
      "<p>Every node is sized to a page (~8 KB), so fan-out is typically 100–500 and height is 3–4 even for billions of rows. A <b>point lookup</b> is a binary search within each node along a single root-to-leaf path (one page read per level). A <b>range scan</b> descends once to the start leaf then follows sibling pointers. An <b>insert</b> into a full node <b>splits</b> it, copying the median up as a new separator; splits cascade upward only as needed, and a <b>root split</b> — the sole source of height growth — lifts the whole tree by one level, keeping all leaves at equal depth.</p>" +
      "<p>Whether leaves hold the rows themselves (a <b>clustered</b> index, like InnoDB's primary key) or pointers to a heap (a <b>secondary</b> index, like Postgres) changes the cost of secondary lookups and the impact of key choice, but the tree structure is the same.</p>",
    engineering:
      "<p>The B+ Tree rewards thinking about <b>key order</b>. Sequential or time-ordered keys (auto-increment, ULID, UUIDv7) append to the right-most leaf: compact pages, few splits, good cache locality (with some tail contention). Random keys (UUIDv4) scatter inserts across the tree, causing splits everywhere, page fragmentation, write amplification, and a worse buffer-pool hit ratio. On a large write-heavy table this single choice can dominate performance.</p>" +
      "<p>Also weigh <b>key width</b> (wide keys shrink fan-out and grow height), <b>index count</b> (each index is another B+ Tree to maintain on every write), and <b>covering indexes</b> (include extra columns so a query is answered from the index alone, skipping the heap). And remember an index only helps if the query is <b>sargable</b> — wrapping the indexed column in a function (<code>WHERE lower(sku) = …</code>) defeats the descent unless you index the expression.</p>",
    gotchas: [
      { kind: "tip", html: "<b>B+ Trees shine at ranges and ordering, not just equality.</b> Sorted, linked leaves make <code>BETWEEN</code>, <code>ORDER BY</code>, and keyset pagination cheap — a locate-then-walk, where a hash index would be useless." },
      { kind: "warn", html: "<b>Random UUIDv4 keys punish write-heavy tables.</b> They spread inserts and splits across the whole tree — fragmentation, write amplification, cache misses. Prefer sequential or time-ordered keys (UUIDv7/ULID) for large tables." },
      { kind: "info", html: "<b>An index only helps a sargable predicate.</b> <code>WHERE lower(email) = ?</code> or <code>WHERE created_at::date = ?</code> can't use a plain column index — index the expression, or rewrite the query to compare the raw column." }
    ],
    failureModes:
      "<p><b>Write amplification from random keys:</b> UUIDv4 primary keys cause leaf splits and dirty pages scattered across the tree, inflating writes and bloating the index. <i>Fix:</i> sequential/time-ordered keys.</p>" +
      "<p><b>Too many indexes:</b> every index is maintained on every insert/update/delete; over-indexing turns cheap writes expensive. <i>Fix:</i> keep only indexes that earn their keep; drop unused ones.</p>" +
      "<p><b>Low fan-out from wide keys:</b> very wide index keys reduce keys-per-page, growing height and read cost. <i>Fix:</i> narrower keys, prefix/hash where appropriate.</p>" +
      "<p><b>Non-sargable queries:</b> functions on the indexed column prevent the descent, forcing a full scan. <i>Fix:</i> expression indexes, or rewrite to compare the raw column.</p>",
    quickCheck: [
      {
        q: "Why does a database use a B+ Tree with fan-out ~100–500 instead of a balanced binary search tree for an index?",
        options: [
          "Binary trees can't store duplicate keys",
          "The bottleneck is disk reads; high fan-out makes the tree 3–4 levels deep, so ~3–4 reads instead of ~30",
          "Binary trees aren't sorted",
          "B+ Trees use less total memory"
        ],
        answer: 1,
        why: "Each level costs one page read. A BST is one key per node (~log₂n ≈ 30 reads for a billion rows); a B+ Tree packs hundreds of keys per page (~log₁₀₀n ≈ 4). Minimizing disk reads, not comparisons, is the goal.",
        diff: "medium"
      },
      {
        q: "A query does WHERE created_at BETWEEN x AND y ORDER BY created_at. How does a B+ Tree serve it efficiently?",
        options: [
          "It hashes each timestamp in the range",
          "It descends once to the first matching leaf, then walks the linked leaves in sorted order",
          "It re-descends from the root for every row",
          "It scans the whole heap and sorts"
        ],
        answer: 1,
        why: "The leaves are sorted and linked, so a range/ordered query locates the start leaf with one descent and then follows sibling pointers, emitting rows already in order — no per-row search and no separate sort.",
        diff: "easy"
      },
      {
        q: "On a large, write-heavy table, why can random UUIDv4 primary keys hurt performance compared to sequential keys?",
        options: [
          "UUIDs are too long to index",
          "Random keys scatter inserts and leaf splits across the whole tree, causing fragmentation, write amplification, and cache misses",
          "Random keys make lookups O(n)",
          "Sequential keys can't be indexed"
        ],
        answer: 1,
        why: "Sequential keys append to the right-most leaf (compact, local). Random keys land anywhere, so inserts split leaves all over the tree and dirty scattered pages — fragmenting the index, amplifying writes, and lowering the buffer-pool hit ratio.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Explain the structure of a B+ Tree and why it's ideal for a disk-based index.",
        a: "A B+ Tree is a balanced tree where internal nodes hold only separator keys and child pointers, and all values (or row pointers) live in the leaves, which are chained into a sorted linked list. Each node is sized to a page, giving a fan-out of hundreds, so the tree is only 3–4 levels deep even for billions of rows. That's what makes it disk-ideal: the bottleneck is page reads, and a lookup touches one node per level — a handful of reads, most cached. Point lookups are a guided descent; range and ordered queries descend once and walk the linked leaves; inserts split full nodes and only a root split adds height, so it's always perfectly balanced.",
        tip: "Contrast with a BST early ('one key per node = one read per level') — it frames why fan-out matters."
      },
      {
        q: "What happens on insert, and how does the tree stay balanced?",
        a: "The insert descends to the correct leaf. If the leaf has room, the key goes in and we're done. If it's full, the leaf splits into two, its median key is copied up into the parent as a new separator, and the leaf sibling pointers are re-linked. If that promotion overflows the parent, the parent splits too, and so on up the tree. The only time height increases is when the root itself splits — and that lifts every path by one level simultaneously. Because splits always keep leaves at equal depth and height only ever grows at the root, the tree is balanced by construction, with no rotations like an AVL/red-black tree.",
        tip: "The key insight: 'height only grows at the root, for the whole tree at once' — that's why it needs no rebalancing rotations."
      },
      {
        q: "How does primary-key choice affect a B+ Tree, and what would you recommend for a high-write table?",
        a: "Key order determines where inserts land. Sequential or time-ordered keys (auto-increment, UUIDv7, ULID) append to the right-most leaf: pages fill compactly, splits are rare and local, and cache locality is good — the tradeoff is some contention on that hot leaf. Random keys (UUIDv4) scatter inserts across the whole tree, causing frequent splits everywhere, page fragmentation, write amplification, and a lower buffer-pool hit ratio because you're dirtying scattered pages. For a high-write table I'd use a time-ordered key (ULID/UUIDv7) to keep inserts local, or an auto-increment surrogate, and reserve random UUIDs for cases where their distribution or unguessability is genuinely required.",
        tip: "Naming UUIDv7/ULID as the fix (not just 'avoid UUIDs') shows current, practical knowledge."
      }
    ],
    businessLens: {
      task: "ShopKart's indexes on products(sku) and orders(created_at)",
      meaning: "Instant product lookups and fast 'orders in this date range' — the backbone of the whole app.",
      system: "OLTP indexes (Postgres B-tree)",
      point: "Almost every ShopKart query rides a B+ Tree: SKU lookups descend a few levels to a leaf, and 'orders between two dates' locates a leaf then streams along the leaf chain in order — no sort needed. The design lever that bites is key choice: ShopKart's original random-UUID order ids scattered inserts across the index, fragmenting pages and amplifying writes at peak; moving to time-ordered ULIDs made inserts append to the right-most leaf and cut the write cost. The B+ Tree is invisible when it's right and the reason the site is slow when the keys are wrong."
    }
  };
})();
