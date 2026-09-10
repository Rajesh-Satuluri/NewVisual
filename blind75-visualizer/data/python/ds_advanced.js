/*
 * data/python/ds_advanced.js — extra "Data Structures (DSA)" topics:
 * Union-Find (Disjoint Set), Matrix / Grid, and Intervals.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures (DSA)", [
  {
    id: "union-find",
    title: "Union-Find (Disjoint Set)",
    difficulty: "Advanced",
    estMinutes: 15,
    dsaRelevance: 3,
    prerequisites: ["graph-representations"],
    tagline: "Track \u201cwhich things are connected\u201d with two near-instant operations \u2014 the go-to for connectivity, provinces, and cycle detection.",

    whatIsIt: [
      "<b>Union-Find</b> (a.k.a. <b>Disjoint Set Union</b>, DSU) maintains a collection of disjoint sets and answers one question fast: <i>are these two elements in the same group?</i> It exposes two operations \u2014 <code>find(x)</code> (which set is x in?) and <code>union(a, b)</code> (merge two sets).",
      "The whole structure is a single <b>parent array</b>: <code>parent[x]</code> points to another element in the same set, and following the pointers upward lands you at the set's <b>root</b> (the representative). Two elements are connected exactly when they share a root.",
      "Two optimizations make it fly. <b>Path compression</b> \u2014 during <code>find</code>, re-point every node you pass straight at the root, flattening the tree. <b>Union by rank/size</b> \u2014 always hang the smaller tree under the larger root, keeping trees shallow.",
      "With both, each operation is <b>O(&alpha;(n))</b> amortized, where &alpha; is the inverse Ackermann function \u2014 less than 5 for any n you will ever see, so effectively <b>O(1)</b>."
    ],

    showMe: {
      code:
        "class DSU:\n" +
        "    def __init__(self, n):\n" +
        "        self.parent = list(range(n))   # each node is its own root\n" +
        "        self.rank = [0] * n            # tree height upper bound\n" +
        "        self.count = n                 # number of disjoint sets\n" +
        "\n" +
        "    def find(self, x):\n" +
        "        # PATH COMPRESSION: point x straight at the root\n" +
        "        while self.parent[x] != x:\n" +
        "            self.parent[x] = self.parent[self.parent[x]]  # halve the path\n" +
        "            x = self.parent[x]\n" +
        "        return x\n" +
        "\n" +
        "    def union(self, a, b):\n" +
        "        ra, rb = self.find(a), self.find(b)\n" +
        "        if ra == rb:\n" +
        "            return False               # already connected -> a cycle\n" +
        "        # UNION BY RANK: smaller tree hangs under larger\n" +
        "        if self.rank[ra] < self.rank[rb]:\n" +
        "            ra, rb = rb, ra\n" +
        "        self.parent[rb] = ra\n" +
        "        if self.rank[ra] == self.rank[rb]:\n" +
        "            self.rank[ra] += 1\n" +
        "        self.count -= 1                # two sets became one\n" +
        "        return True\n" +
        "\n" +
        "dsu = DSU(5)                           # nodes 0..4, 5 sets\n" +
        "dsu.union(0, 1)\n" +
        "dsu.union(1, 2)\n" +
        "dsu.union(3, 4)\n" +
        "print(dsu.find(0) == dsu.find(2))      # True  (0-1-2 linked)\n" +
        "print(dsu.find(0) == dsu.find(4))      # False (different set)\n" +
        "print(dsu.count)                       # 2     connected components\n" +
        "print(dsu.union(0, 2))                 # False (0 and 2 already joined)",
      caption: "A full DSU: parent array + path compression in find, union by rank in union. union returns False when the two are already connected \u2014 that False is your cycle detector."
    },

    whyDsa:
      "<p>DSU shines whenever the question is <b>connectivity</b> and edges only ever get added. \u201cNumber of provinces\u201d is the canonical case: union every pair that\u2019s directly connected, then the answer is the number of distinct roots \u2014 which you can read straight off <code>count</code>.</p>" +
      "<pre class=\"why-pre\">for each edge (a, b):\n    union(a, b)\nanswer = number of distinct roots   \u2192 connected components</pre>" +
      "<p><b>Cycle detection in an undirected graph</b> falls out for free: process edges one at a time and if <code>union(a, b)</code> finds a and b <i>already</i> share a root, this edge closes a loop \u2014 that\u2019s exactly \u201credundant connection\u201d and the \u201cgraph valid tree\u201d test.</p>" +
      "<pre class=\"why-pre\">for (a, b) in edges:\n    if not union(a, b):   \u2192 a and b already connected\n        return \"cycle here\"</pre>" +
      "<p>And DSU is the engine inside <b>Kruskal\u2019s MST</b>: sort edges by weight, then add each edge only if its endpoints are in different sets \u2014 <code>union</code> returning True means \u201csafe, no cycle,\u201d so you greedily build the minimum spanning tree.</p>",

    recognize: [
      { q: "\u201cHow many connected components / provinces / groups?\u201d", think: "union every edge, then count distinct roots (self.count)" },
      { q: "\u201cAre nodes a and b connected?\u201d", think: "find(a) == find(b) \u2014 O(1) amortized" },
      { q: "\u201cDoes adding this edge create a cycle? / redundant connection\u201d", think: "union(a, b) returns False \u2192 already same set \u2192 cycle" },
      { q: "\u201cIs this graph a valid tree?\u201d", think: "n-1 edges AND every union succeeds (no cycle) \u2192 one component" },
      { q: "\u201cMinimum spanning tree / connect everything cheapest\u201d", think: "Kruskal: sort edges, union those in different sets (DSU inside)" }
    ],

    matchTags: ["union find", "disjoint set", "dsu", "connected components", "cycle detection", "kruskal", "graph"],
    relatedProblems: ["number-of-provinces", "redundant-connection", "number-of-connected-components-in-an-undirected-graph", "graph-valid-tree"],

    traps: [
      {
        bad: "def find(self, x):\n    while self.parent[x] != x:\n        x = self.parent[x]   # NO compression\n    return x",
        good: "def find(self, x):\n    while self.parent[x] != x:\n        self.parent[x] = self.parent[self.parent[x]]  # compress\n        x = self.parent[x]\n    return x",
        why: "Without path compression the tree can degrade into a long chain, so find walks O(n) links and the whole structure slows to O(n) per query. One extra line \u2014 re-point each node toward the root \u2014 keeps it near O(1)."
      },
      {
        bad: "if self.parent[a] == self.parent[b]:   # WRONG: compares parents",
        good: "if self.find(a) == self.find(b):        # compare ROOTS",
        why: "Two nodes in the same set can have different immediate parents \u2014 what they share is the root. Always compare find(a) to find(b), never the raw parent[] entries, or you\u2019ll miss connections."
      },
      {
        bad: "def union(self, a, b):\n    self.parent[a] = b     # link the NODES directly",
        good: "def union(self, a, b):\n    self.parent[self.find(a)] = self.find(b)  # link the ROOTS",
        why: "Union must merge whole sets, so it has to attach one root under the other, not the argument nodes. Linking parent[a]=b instead of parent[find(a)]=find(b) silently splits sets and corrupts every later query."
      }
    ],

    cpython:
      "<p>A DSU is just a flat Python <code>list</code> of ints \u2014 <code>parent[x]</code> is an O(1) index into a contiguous array of pointers, so <code>find</code> and <code>union</code> pay only for the tree walk, not for any hashing. Because ints are immutable, path compression is a plain <code>parent[x] = root</code> reassignment. For sparse or string-labelled nodes you swap the list for a <code>dict</code> (<code>parent = {}</code>) with the same logic \u2014 slightly slower per access but no need to pre-size or map labels to indices.</p>",

    complexity: [
      { op: "find(x) with path compression + union by rank", big_o: "O(\u03b1(n))", note: "Amortized inverse-Ackermann \u2014 below 5 for every realistic n, so treat it as effectively O(1)." },
      { op: "union(a, b)", big_o: "O(\u03b1(n))", note: "Two finds plus a constant re-link; same near-constant amortized cost as find." },
      { op: "find without path compression", big_o: "O(n) worst", note: "A degenerate chain forces find to walk every link \u2014 the reason path compression is not optional." },
      { op: "count connected components", big_o: "O(1)", note: "Kept as a running counter decremented on each successful union \u2014 no scan needed to read it." },
      { op: "process m edges (build the whole structure)", big_o: "O(m\u00b7\u03b1(n))", note: "One near-constant union per edge \u2014 essentially linear in the number of edges." },
      { op: "space", big_o: "O(n)", note: "Two length-n arrays (parent and rank) \u2014 flat and cache-friendly." }
    ],

    challenge: {
      prompt: "Count connected components: n = 5 nodes and edges = [[0,1],[1,2],[3,4]]. Union each edge and print how many disjoint groups remain (should be 2).",
      starter: "n = 5\nedges = [[0, 1], [1, 2], [3, 4]]\nparent = list(range(n))\n# write find (with compression) and union, then count roots\n",
      solution:
        "n = 5\nedges = [[0, 1], [1, 2], [3, 4]]\nparent = list(range(n))\n\ndef find(x):\n    while parent[x] != x:\n        parent[x] = parent[parent[x]]\n        x = parent[x]\n    return x\n\ncount = n\nfor a, b in edges:\n    ra, rb = find(a), find(b)\n    if ra != rb:\n        parent[ra] = rb\n        count -= 1\n\nprint(count)   # 2"
    }
  },

  {
    id: "matrix-grid",
    title: "Matrix / Grid",
    difficulty: "Beginner\u2192Intermediate",
    estMinutes: 13,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "The 2D grid: how to build one without the aliasing trap, walk its four neighbours, and treat it as a graph for BFS/DFS.",

    whatIsIt: [
      "A <b>matrix</b> in Python is a <b>list of lists</b> \u2014 <code>grid[r][c]</code> is the cell at row <code>r</code>, column <code>c</code>. The outer list holds rows; each inner list is one row. Get the dimensions with <code>m = len(grid)</code> (rows) and <code>n = len(grid[0])</code> (columns).",
      "There is one correct way to build a fresh m\u00d7n grid and one that looks identical but is broken: <code>[[0]*n for _ in range(m)]</code> makes <b>m independent rows</b>; <code>[[0]*n]*m</code> makes <b>one row repeated m times</b> \u2014 every \u201crow\u201d is the <i>same</i> list, so writing one writes all.",
      "The universal traversal idiom is the <b>four directions</b> \u2014 up, down, left, right \u2014 as a list of <code>(dr, dc)</code> deltas, plus an <b>in-bounds check</b> before you ever index. Diagonal problems just add four more deltas.",
      "Once you can visit neighbours, a grid <i>is</i> a graph: cells are nodes, adjacent cells are edges. That single idea powers <b>flood fill</b>, <b>number of islands</b>, shortest-path-in-a-maze (BFS), and every grid DFS."
    ],

    showMe: {
      code:
        "# THE aliasing trap: build a 3x3 grid two ways and set grid[0][0] = 9\n" +
        "good = [[0] * 3 for _ in range(3)]   # 3 INDEPENDENT rows\n" +
        "bad  = [[0] * 3] * 3                  # 1 row aliased 3 times\n" +
        "\n" +
        "good[0][0] = 9\n" +
        "bad[0][0] = 9\n" +
        "print(good)   # [[9, 0, 0], [0, 0, 0], [0, 0, 0]]  <- only row 0\n" +
        "print(bad)    # [[9, 0, 0], [9, 0, 0], [9, 0, 0]]  <- ALL rows!\n" +
        "\n" +
        "grid = [[1, 2, 3],\n" +
        "        [4, 5, 6],\n" +
        "        [7, 8, 9]]\n" +
        "m, n = len(grid), len(grid[0])         # 3 rows, 3 cols\n" +
        "\n" +
        "# the 4-directions idiom + in-bounds check\n" +
        "DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]   # up, down, left, right\n" +
        "r, c = 1, 1                            # center cell (value 5)\n" +
        "for dr, dc in DIRS:\n" +
        "    nr, nc = r + dr, c + dc\n" +
        "    if 0 <= nr < m and 0 <= nc < n:    # stay inside the grid\n" +
        "        print(grid[nr][nc], end=' ')   # 2 8 4 6\n" +
        "print()\n" +
        "\n" +
        "# row iteration, column sum, and transpose\n" +
        "print([sum(row) for row in grid])              # [6, 15, 24]\n" +
        "print([grid[r][0] for r in range(m)])          # first column -> [1, 4, 7]\n" +
        "print([list(col) for col in zip(*grid)])       # transpose",
      caption: "First the aliasing trap made visible (bad writes to all rows), then dims, the 4-direction neighbour walk with bounds check, and row/column/transpose idioms."
    },

    whyDsa:
      "<p>Almost every grid problem is the same three moves: know your dimensions, generate the four neighbours, and reject the out-of-bounds ones <i>before</i> indexing. Bundling the deltas into <code>DIRS</code> turns a wall of if-statements into one clean loop.</p>" +
      "<pre class=\"why-pre\">DIRS = [(-1,0), (1,0), (0,-1), (0,1)]\nfor dr, dc in DIRS:\n    nr, nc = r+dr, c+dc\n    if 0 &lt;= nr &lt; m and 0 &lt;= nc &lt; n:   \u2192 in bounds, safe to visit</pre>" +
      "<p>Treat the grid as a graph and <b>flood fill</b> / <b>number of islands</b> is just DFS or BFS from each unvisited cell, marking as you go so you never revisit. The neighbour loop above <i>is</i> the edge list.</p>" +
      "<pre class=\"why-pre\">def dfs(r, c):\n    if out of bounds or grid[r][c] != target: return\n    grid[r][c] = visited\n    for dr, dc in DIRS: dfs(r+dr, c+dc)   \u2192 one island flooded</pre>" +
      "<p>The other family is <b>in-place transforms</b> \u2014 rotate-image, set-matrix-zeroes, spiral-order. These lean on layout tricks (<code>zip(*grid)</code> to transpose, then reverse each row = 90\u00b0 rotation) and on being careful not to clobber cells you still need to read.</p>",

    recognize: [
      { q: "\u201cCount islands / regions / flood a connected blob\u201d", think: "grid = graph \u2192 DFS/BFS from each unvisited cell, mark visited" },
      { q: "\u201cShortest path / fewest steps through a maze\u201d", think: "BFS from the start over 4-direction neighbours (layer = distance)" },
      { q: "\u201cRotate the image 90\u00b0 in place\u201d", think: "transpose (zip(*grid)) then reverse each row" },
      { q: "\u201cSet entire row & column to zero where a 0 appears\u201d", think: "first pass mark rows/cols, second pass zero them (watch aliasing)" },
      { q: "\u201cNeed a fresh m\u00d7n table (DP, visited)\u201d", think: "[[0]*n for _ in range(m)] \u2014 NEVER [[0]*n]*m" }
    ],

    matchTags: ["matrix", "grid", "2d", "flood fill", "bfs", "dfs", "island", "rotate", "transpose"],
    relatedProblems: ["set-matrix-zeroes", "rotate-image", "spiral-matrix", "number-of-islands"],

    traps: [
      {
        bad: "grid = [[0] * n] * m     # all m rows are the SAME list\ngrid[0][0] = 9           # every row now starts with 9",
        good: "grid = [[0] * n for _ in range(m)]   # m independent rows",
        why: "[[0]*n]*m copies the reference to one inner list m times, so the rows are aliases of each other \u2014 writing grid[0][0] mutates every row. The list comprehension builds a brand-new inner list on each iteration, which is what you actually want."
      },
      {
        bad: "if grid[nr][nc] == 1 and 0 <= nr < m:   # indexes BEFORE checking",
        good: "if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:",
        why: "You must bounds-check before you index, and short-circuit AND lets you: put the 0 <= nr < m and 0 <= nc < n tests first so the grid access only runs when the cell exists. Reversing the order raises IndexError (or silently wraps with negative indices) at the edges."
      },
      {
        bad: "n = len(grid[0])\n# ... but grid might be []  -> IndexError",
        good: "if not grid or not grid[0]:\n    return ...        # guard empty grid first",
        why: "len(grid[0]) blows up when the grid has zero rows, and an empty first row breaks column logic. Guard for the empty grid (and empty rows) up front before reading dimensions."
      }
    ],

    cpython:
      "<p>A list of lists is <b>not</b> a contiguous 2D block \u2014 it is a flat array of <i>pointers</i>, each pointing to a separate row list somewhere else in memory. That indirection is exactly why <code>[[0]*n]*m</code> aliases: <code>*m</code> copies the one pointer m times, so all rows reference the same underlying list. The comprehension form re-evaluates <code>[0]*n</code> each iteration, allocating a distinct row object per row. (For heavy numeric work NumPy stores a true contiguous buffer instead, but for interviews the list-of-lists model \u2014 and its aliasing trap \u2014 is what you must keep straight.)</p>",

    complexity: [
      { op: "grid[r][c] access / assignment", big_o: "O(1)", note: "Two index operations into flat lists \u2014 constant time, same as any list indexing." },
      { op: "build [[0]*n for _ in range(m)]", big_o: "O(m\u00b7n)", note: "Allocates and zero-fills every one of the m\u00d7n cells once." },
      { op: "full DFS / BFS flood fill", big_o: "O(m\u00b7n)", note: "Each cell is visited and marked at most once, so traversal is linear in the number of cells." },
      { op: "transpose zip(*grid) / rotate in place", big_o: "O(m\u00b7n)", note: "Touches every cell a constant number of times to move it to its new position." },
      { op: "BFS visited-set / queue space", big_o: "O(m\u00b7n)", note: "In the worst case the frontier or the visited marks span the whole grid." }
    ],

    challenge: {
      prompt: "Count islands: given a grid of 1s (land) and 0s (water), return how many connected groups of 1s there are (4-directional). Try the grid below \u2014 answer is 3.",
      starter: "grid = [\n    [1, 1, 0, 0],\n    [1, 0, 0, 1],\n    [0, 0, 1, 0],\n]\n# DFS from each unvisited land cell, sinking the island as you go\n",
      solution:
        "grid = [\n    [1, 1, 0, 0],\n    [1, 0, 0, 1],\n    [0, 0, 1, 0],\n]\nm, n = len(grid), len(grid[0])\nDIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]\n\ndef sink(r, c):\n    if not (0 <= r < m and 0 <= c < n) or grid[r][c] != 1:\n        return\n    grid[r][c] = 0                 # mark visited\n    for dr, dc in DIRS:\n        sink(r + dr, c + dc)\n\nislands = 0\nfor r in range(m):\n    for c in range(n):\n        if grid[r][c] == 1:\n            islands += 1\n            sink(r, c)\n\nprint(islands)   # 3"
    }
  },

  {
    id: "intervals",
    title: "Intervals",
    difficulty: "Intermediate",
    estMinutes: 14,
    dsaRelevance: 3,
    prerequisites: ["custom-sorting"],
    tagline: "Ranges as [start, end]: sort by start, then merge, insert, or count overlaps \u2014 one opening move unlocks the whole family.",

    whatIsIt: [
      "An <b>interval</b> is a range on a line, written <code>[start, end]</code> \u2014 a meeting from 9 to 11, a segment from 1 to 5. A list of intervals is just a list of these pairs, and the problems ask you to combine, count, or fit them together.",
      "The single most important move: <b>sort by start</b>. Almost every interval problem opens with <code>intervals.sort(key=lambda x: x[0])</code>, because once ranges are in start order you only ever compare each interval to the one you just kept.",
      "The <b>overlap test</b> for two intervals a and b is <code>a[0] &lt;= b[1] and b[0] &lt;= a[1]</code> \u2014 they touch unless one ends entirely before the other begins. After sorting by start, this simplifies to \u201cdoes the next start fall at or before the current end?\u201d",
      "From there the family is small and mechanical: <b>merge</b> overlapping intervals, <b>insert</b> a new interval into a sorted list, count how many to remove to make them <b>non-overlapping</b>, and the <b>meeting rooms</b> questions (can one person attend all? how many rooms are needed?) solved with a sweep line or a min-heap of end times."
    ],

    showMe: {
      code:
        "import heapq\n" +
        "\n" +
        "# MERGE overlapping intervals -- the archetype\n" +
        "intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]\n" +
        "intervals.sort(key=lambda x: x[0])     # OPENING MOVE: sort by start\n" +
        "merged = [intervals[0]]\n" +
        "for start, end in intervals[1:]:\n" +
        "    if start <= merged[-1][1]:         # overlaps the last kept one\n" +
        "        merged[-1][1] = max(merged[-1][1], end)   # extend it\n" +
        "    else:\n" +
        "        merged.append([start, end])   # gap -> start a new interval\n" +
        "print(merged)                          # [[1, 6], [8, 10], [15, 18]]\n" +
        "\n" +
        "# the general OVERLAP TEST (works unsorted, any two intervals)\n" +
        "def overlap(a, b):\n" +
        "    return a[0] <= b[1] and b[0] <= a[1]\n" +
        "print(overlap([1, 5], [4, 8]))         # True  (share 4..5)\n" +
        "print(overlap([1, 5], [6, 9]))         # False (a ends before b starts)\n" +
        "\n" +
        "# MEETING ROOMS II: fewest rooms = max simultaneous meetings\n" +
        "# min-heap holds the end times of ongoing meetings\n" +
        "meetings = [[0, 30], [5, 10], [15, 20]]\n" +
        "meetings.sort(key=lambda x: x[0])\n" +
        "heap = []                              # end times of live meetings\n" +
        "for start, end in meetings:\n" +
        "    if heap and heap[0] <= start:      # earliest room is now free\n" +
        "        heapq.heappop(heap)            # reuse it\n" +
        "    heapq.heappush(heap, end)\n" +
        "print(len(heap))                       # 2  rooms needed",
      caption: "Sort by start, then: merge (extend or append), the symmetric overlap test, and meeting-rooms-II counting peak concurrency with a min-heap of end times."
    },

    whyDsa:
      "<p>The reason \u201csort by start\u201d is the reflex is that it collapses a 2D comparison into a 1D scan: after sorting, the only interval that can overlap the current one is the one you kept most recently. Merge is then a single pass.</p>" +
      "<pre class=\"why-pre\">sort by start\nfor each interval:\n    if start &lt;= last_kept.end:  extend last_kept.end\n    else:                        append as new   \u2192 O(n log n)</pre>" +
      "<p><b>Insert interval</b> is the same skeleton with three phases: emit everything ending before the newcomer, absorb everything that overlaps it (widening as you go), then emit the rest \u2014 no full re-sort needed because the list is already sorted.</p>" +
      "<pre class=\"why-pre\">while iv ends before new.start:   keep iv\nwhile iv overlaps new:            new = merge(new, iv)\nappend new, then keep the rest</pre>" +
      "<p>The <b>meeting rooms</b> pair is about concurrency, not merging. \u201cCan one person attend all?\u201d is just: after sorting, does any meeting start before the previous ends? \u201cHow many rooms?\u201d is the peak number of overlapping meetings \u2014 a <b>min-heap of end times</b> (or a sweep line of +1/-1 events) gives you that maximum.</p>",

    recognize: [
      { q: "\u201cMerge all overlapping intervals\u201d", think: "sort by start, then extend-or-append against the last kept interval" },
      { q: "\u201cInsert a new interval, keep the list merged\u201d", think: "three phases: before, overlapping (absorb), after \u2014 no re-sort" },
      { q: "\u201cCan a person attend all meetings? / any conflict?\u201d", think: "sort by start; conflict if any start < previous end" },
      { q: "\u201cMinimum meeting rooms / max concurrent events\u201d", think: "min-heap of end times, or sweep line of +1/-1 \u2192 track the peak" },
      { q: "\u201cFewest intervals to remove so none overlap\u201d", think: "greedy: sort by END, keep earliest-ending, drop the overlappers" }
    ],

    matchTags: ["intervals", "interval", "merge", "overlap", "sweep line", "meeting rooms", "sort by start"],
    relatedProblems: ["merge-intervals", "insert-interval", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii"],

    traps: [
      {
        bad: "merged = [intervals[0]]\nfor s, e in intervals[1:]:   # WITHOUT sorting first\n    ...",
        good: "intervals.sort(key=lambda x: x[0])   # sort by start FIRST\nmerged = [intervals[0]]",
        why: "The extend-or-append merge only works because each interval need only be compared to the last kept one \u2014 which is only true when they arrive in start order. Skip the sort and non-adjacent overlaps (e.g. [1,10] then [2,3] then [11,12]) are handled wrong. Sorting is the whole trick."
      },
      {
        bad: "def overlap(a, b):\n    return a[0] < b[1] and b[0] < a[1]   # strict < drops touching",
        good: "def overlap(a, b):\n    return a[0] <= b[1] and b[0] <= a[1]  # <= if touching counts",
        why: "Whether [1,5] and [5,8] \u201coverlap\u201d depends on the problem: strict < treats touching endpoints as disjoint, <= treats them as overlapping. Meeting rooms usually lets a meeting end exactly when the next starts (use <, no conflict), while merge usually joins touching ranges (use <=). Pick the boundary deliberately \u2014 this off-by-one is the classic interval bug."
      },
      {
        bad: "intervals.sort()          # sorts by start THEN end -- usually fine,\n# but for 'non-overlapping removal' you must sort by END",
        good: "intervals.sort(key=lambda x: x[1])   # sort by end for the greedy",
        why: "The default sort orders by start, which is right for merge/insert. But the greedy \u2018remove fewest to make non-overlapping\u2019 needs intervals ordered by END time so you always keep the one that frees up soonest. Using the wrong sort key gives a suboptimal (wrong) count."
      }
    ],

    cpython:
      "<p>An interval is just a 2-element Python <code>list</code> (or <code>tuple</code>) <code>[start, end]</code>; a set of intervals is a list of those. <code>list.sort()</code> is Timsort \u2014 O(n log n), stable, and adaptive to already-ordered runs \u2014 and <code>key=lambda x: x[0]</code> sorts by start without moving the pairs apart. The meeting-rooms min-heap is <code>heapq</code>, which treats an ordinary list as a binary heap so <code>heap[0]</code> is the smallest end time in O(1) and push/pop are O(log n). Using a mutable <code>list</code> for each interval also lets merge widen an interval in place with <code>merged[-1][1] = max(...)</code>; if you store tuples instead you must replace the whole pair.</p>",

    complexity: [
      { op: "sort by start (the opening move)", big_o: "O(n log n)", note: "Timsort on the interval list \u2014 this dominates and is why nearly all interval solutions are O(n log n)." },
      { op: "merge intervals (the scan after sorting)", big_o: "O(n)", note: "One linear pass extending or appending \u2014 the sort, not the scan, is the bottleneck." },
      { op: "insert interval into a sorted list", big_o: "O(n)", note: "Already sorted, so a single three-phase pass \u2014 no re-sort needed." },
      { op: "overlap test on two intervals", big_o: "O(1)", note: "Two comparisons \u2014 a[0] <= b[1] and b[0] <= a[1]." },
      { op: "meeting rooms II (min-heap of end times)", big_o: "O(n log n)", note: "Sort by start, then each meeting does one O(log n) push and at most one pop." },
      { op: "space (merged output / heap)", big_o: "O(n)", note: "The result list, or a heap that can hold every meeting when all overlap." }
    ],

    challenge: {
      prompt: "Merge overlapping intervals. Given intervals = [[1,4],[4,5],[2,3],[7,9]], sort by start and merge touching/overlapping ranges. Expected [[1, 5], [7, 9]].",
      starter: "intervals = [[1, 4], [4, 5], [2, 3], [7, 9]]\n# sort by start, then extend-or-append\n",
      solution:
        "intervals = [[1, 4], [4, 5], [2, 3], [7, 9]]\nintervals.sort(key=lambda x: x[0])\nmerged = [intervals[0]]\nfor start, end in intervals[1:]:\n    if start <= merged[-1][1]:            # touching counts (<=)\n        merged[-1][1] = max(merged[-1][1], end)\n    else:\n        merged.append([start, end])\nprint(merged)   # [[1, 5], [7, 9]]"
    }
  }
]);
