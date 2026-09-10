/*
 * data/python/ds_heap_graph.js — Data Structures (DSA) topics:
 * Heap / Priority Queue, Graph Representations, and Graph Traversal (BFS & DFS).
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures (DSA)", [
  {
    id: "heap-priority-queue",
    title: "Heap / Priority Queue",
    difficulty: "Intermediate \u2192 Advanced",
    estMinutes: 14,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Always pull the smallest (or largest) next \u2014 heapq gives you O(log n) push/pop and cracks a whole family of top-K and streaming problems.",

    whatIsIt: [
      "A <b>heap</b> is a binary tree kept in an array where every parent is smaller than its children (a <i>min-heap</i>). That single invariant means the minimum is always at the root \u2014 index <code>0</code> \u2014 so you can peek it in O(1) and pop it in O(log n).",
      "Python's <code>heapq</code> is a <b>min-heap built on an ordinary list</b>. There is no heap object: you call module functions on a plain list \u2014 <code>heapq.heappush(h, x)</code>, <code>heapq.heappop(h)</code>, and <code>h[0]</code> to peek. The list stays a valid heap as long as you only touch it through <code>heapq</code>.",
      "It is a <b>priority queue</b>: not FIFO like a normal queue, but \u201csmallest priority out first.\u201d To rank by a custom key, push <b>tuples</b> <code>(priority, item)</code> \u2014 tuples compare left-to-right, so the first field decides the order.",
      "<code>heapq</code> is <b>min-only</b>. For a max-heap you <b>negate</b> the keys (push <code>-x</code>, pop and negate back). The two workhorse patterns are a <b>size-K heap</b> for top-K queries and <b>two heaps</b> (a max-heap and a min-heap) for a running median."
    ],

    showMe: {
      code:
        "import heapq\n" +
        "\n" +
        "# A heap is just a list you only touch through heapq functions.\n" +
        "h = []\n" +
        "for x in [5, 1, 8, 3, 2]:\n" +
        "    heapq.heappush(h, x)     # each push is O(log n)\n" +
        "print(h[0])                  # peek the min in O(1) -> 1\n" +
        "print(heapq.heappop(h))      # pop the min          -> 1\n" +
        "print(heapq.heappop(h))      #                      -> 2\n" +
        "\n" +
        "# heapify turns an existing list into a heap in O(n), in place.\n" +
        "nums = [5, 1, 8, 3, 2]\n" +
        "heapq.heapify(nums)\n" +
        "print(nums[0])               # min -> 1\n" +
        "\n" +
        "# MAX-HEAP trick: negate on the way in, negate back on the way out.\n" +
        "maxh = []\n" +
        "for x in [5, 1, 8, 3, 2]:\n" +
        "    heapq.heappush(maxh, -x)\n" +
        "print(-heapq.heappop(maxh))  # largest -> 8\n" +
        "\n" +
        "# TUPLES rank by a custom priority: (priority, item), first field wins.\n" +
        "tasks = []\n" +
        "heapq.heappush(tasks, (2, 'email'))\n" +
        "heapq.heappush(tasks, (1, 'deploy'))\n" +
        "print(heapq.heappop(tasks))  # lowest priority first -> (1, 'deploy')\n" +
        "\n" +
        "# nlargest / nsmallest are the top-K shortcuts.\n" +
        "print(heapq.nlargest(2, [5, 1, 8, 3, 2]))   # [8, 5]",
      caption: "heapq is a min-heap on a list: push/pop O(log n), peek h[0] O(1), heapify O(n). Negate for a max-heap, push (priority, item) tuples to rank."
    },

    whyDsa:
      "<p>The heap earns its keep on <b>top-K</b> questions. \u201cKth largest\u201d doesn't need a full sort \u2014 keep a <b>min-heap of size K</b>. The smallest of your K best sits at the root, so the moment the heap exceeds K you pop it. What survives are the K largest, and <code>h[0]</code> is the Kth largest itself.</p>" +
      "<pre class=\"why-pre\">h = []\nfor n in nums:\n    heapq.heappush(h, n)\n    if len(h) &gt; k:\n        heapq.heappop(h)   \u2192 drop the smallest, keep K best\n# h[0] is the Kth largest, in O(n log k)</pre>" +
      "<p><b>Merge K sorted lists</b> is the same idea: seed the heap with the head of each list, pop the global minimum, then push that node's successor. The heap only ever holds K items, so each of the N total elements costs one O(log k) push/pop.</p>" +
      "<pre class=\"why-pre\">heap = [(lst[0], i, 0) for i, lst in enumerate(lists)]\nheapq.heapify(heap)\nval, li, ei = heapq.heappop(heap)   \u2192 smallest across all K lists</pre>" +
      "<p>The <b>two-heap</b> trick answers a <b>streaming median</b>: a max-heap for the smaller half, a min-heap for the larger half. Keep their sizes within one, and the median is a root (or the average of the two roots) \u2014 O(log n) per insert instead of re-sorting.</p>" +
      "<pre class=\"why-pre\">small (max-heap) | large (min-heap)\n    [.. 3]       |    [4 ..]\nmedian = top of the bigger half, O(1) to read</pre>",

    recognize: [
      { q: "\u201cKth largest / Kth smallest element (or in a stream)\u201d", think: "size-K heap: min-heap for Kth largest, pop when len > k, answer is h[0]" },
      { q: "\u201cTop K / K closest / K most frequent\u201d", think: "keep a heap of size K (or heapq.nlargest / nsmallest)" },
      { q: "\u201cMerge K sorted lists / arrays\u201d", think: "heap of one head per list; pop min, push its successor \u2014 O(N log k)" },
      { q: "\u201cRunning / streaming median\u201d", think: "two heaps (max-heap low half, min-heap high half), balance sizes" },
      { q: "\u201cAlways process the smallest/largest available next\u201d", think: "priority queue \u2192 heapq; push (priority, item) tuples to rank" }
    ],

    matchTags: ["heap", "priority queue", "heapq", "min-heap", "max-heap", "top k", "kth largest", "median", "merge k"],
    relatedProblems: ["kth-largest-element-in-a-stream", "k-closest-points-to-origin", "find-median-from-data-stream", "merge-k-sorted-lists", "task-scheduler"],

    traps: [
      {
        bad: "heapq.heappush(h, x)\n# ... expecting the LARGEST out first",
        good: "heapq.heappush(h, -x)   # negate\nlargest = -heapq.heappop(h)",
        why: "heapq is min-heap ONLY \u2014 there is no max-heap flag. To pop the largest, negate keys on push and negate back on pop. For tuples, negate just the priority field: push (-priority, item)."
      },
      {
        bad: "heapq.heappush(h, (dist, node))   # node objects aren't comparable",
        good: "heapq.heappush(h, (dist, next(counter), node))   # counter breaks ties",
        why: "Tuples compare field by field. When two priorities tie, Python compares the NEXT field \u2014 and if that's a non-comparable object (a custom class, a dict, a ListNode) it raises TypeError mid-run. Insert a monotonically increasing counter (itertools.count) as a tie-breaker before the payload, or make the payload comparable."
      },
      {
        bad: "h.append(x)          # or h.sort() / h[i] = y\nheapq.heappop(h)     # heap invariant now broken",
        good: "heapq.heappush(h, x)   # only ever mutate through heapq",
        why: "A heap is a plain list, so nothing stops you appending, sorting, or assigning into it \u2014 but any of those breaks the parent<child invariant and heappop then returns the wrong element with no error. Only mutate a heap through heapq.heappush / heappop / heapreplace."
      }
    ],

    cpython:
      "<p><code>heapq</code> implements a <b>binary min-heap in a flat Python list</b>: the children of index <code>i</code> live at <code>2i+1</code> and <code>2i+2</code>, so no tree nodes or pointers are stored \u2014 just the array. <code>heappush</code> appends then <b>sifts up</b>, <code>heappop</code> swaps the root with the last element, pops it, then <b>sifts down</b> \u2014 each O(log n). <code>heapify</code> sifts down from the last internal node upward, which is O(n), not O(n log n). The hot sift routines have a C implementation (<code>_heapq</code>) that CPython uses when available, falling back to the pure-Python version otherwise.</p>",

    complexity: [
      { op: "peek min (h[0])", big_o: "O(1)", note: "The minimum of a min-heap is always the root at index 0 \u2014 just an indexing operation, no work." },
      { op: "heappush / heappop", big_o: "O(log n)", note: "Each bubbles one element up or down the tree, whose height is log n \u2014 the core reason heaps beat re-sorting on every insert." },
      { op: "heapify(list)", big_o: "O(n)", note: "Bottom-up sift-down over the whole array is linear, not O(n log n) \u2014 cheaper than pushing n items one at a time." },
      { op: "nlargest(k, it) / nsmallest(k, it)", big_o: "O(n log k)", note: "Keeps a size-K heap while scanning n items \u2014 far cheaper than a full sort when k is small." },
      { op: "top-K via size-K heap", big_o: "O(n log k) time, O(k) space", note: "One O(log k) push/pop per element, and the heap never holds more than k \u2014 the standard 'Kth largest' cost." },
      { op: "two-heap running median (per insert)", big_o: "O(log n)", note: "Each new value is a push plus at most one rebalancing pop; reading the median is O(1)." }
    ],

    challenge: {
      prompt: "Return the Kth largest element in nums using a min-heap of size K (not a full sort). Try nums = [3, 2, 1, 5, 6, 4], k = 2 \u2014 the answer is 5.",
      starter: "import heapq\nnums = [3, 2, 1, 5, 6, 4]\nk = 2\n# keep a heap of the k largest seen so far\n",
      solution:
        "import heapq\nnums = [3, 2, 1, 5, 6, 4]\nk = 2\nh = []\nfor n in nums:\n    heapq.heappush(h, n)\n    if len(h) > k:\n        heapq.heappop(h)   # drop the smallest, keep k best\nprint(h[0])   # 5"
    }
  },

  {
    id: "graph-representations",
    title: "Graph Representations",
    difficulty: "Intermediate",
    estMinutes: 12,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Turn a pile of edges into something you can traverse \u2014 the adjacency list is the setup step nearly every graph problem starts with.",

    whatIsIt: [
      "A <b>graph</b> is a set of <b>nodes</b> (vertices) joined by <b>edges</b>. Before you can BFS or DFS anything, you have to store it in one of three shapes: an <b>adjacency list</b>, an <b>adjacency matrix</b>, or a raw <b>edge list</b>.",
      "The <b>adjacency list</b> is the default: a dict mapping each node to a list of its neighbors. <code>defaultdict(list)</code> makes building it painless \u2014 <code>graph[u].append(v)</code> creates the entry on first touch. It costs O(V + E) space and lets you scan a node's neighbors directly.",
      "An <b>adjacency matrix</b> is a V\u00d7V grid where <code>M[u][v]</code> is 1 (or the edge weight) if <code>u\u2192v</code> exists. Edge lookup is O(1), but it always costs <b>O(V\u00b2) space</b> even when the graph is sparse \u2014 use it only for dense graphs or fixed small grids. An <b>edge list</b> is just the list of <code>(u, v)</code> pairs \u2014 compact, but you must scan it to find a node's neighbors.",
      "Two flags change how you build it. <b>Directed vs undirected</b>: an undirected edge <code>(u, v)</code> means you append <i>both</i> <code>u\u2192v</code> and <code>v\u2192u</code>. <b>Weighted</b>: store <code>(neighbor, weight)</code> pairs instead of bare neighbors."
    ],

    showMe: {
      code:
        "from collections import defaultdict\n" +
        "\n" +
        "edges = [(0, 1), (0, 2), (1, 2), (2, 3)]\n" +
        "\n" +
        "# ADJACENCY LIST (undirected): append BOTH directions.\n" +
        "graph = defaultdict(list)\n" +
        "for u, v in edges:\n" +
        "    graph[u].append(v)\n" +
        "    graph[v].append(u)          # drop this line for a DIRECTED graph\n" +
        "print(graph[2])                 # neighbors of 2 -> [0, 1, 3]\n" +
        "\n" +
        "# ADJACENCY MATRIX: V x V grid, M[u][v] = 1 if edge u-v exists.\n" +
        "n = 4\n" +
        "M = [[0] * n for _ in range(n)]\n" +
        "for u, v in edges:\n" +
        "    M[u][v] = 1\n" +
        "    M[v][u] = 1\n" +
        "print(M[2])                     # row for node 2 -> [1, 1, 0, 1]\n" +
        "print(M[0][1], M[0][3])         # O(1) edge test -> 1 0\n" +
        "\n" +
        "# WEIGHTED adjacency list: store (neighbor, weight) pairs.\n" +
        "wedges = [(0, 1, 4), (0, 2, 1), (2, 3, 7)]\n" +
        "wgraph = defaultdict(list)\n" +
        "for u, v, w in wedges:\n" +
        "    wgraph[u].append((v, w))\n" +
        "    wgraph[v].append((u, w))\n" +
        "print(wgraph[0])                # [(1, 4), (2, 1)]",
      caption: "Same edges, three shapes: adjacency list (dict of neighbor lists), adjacency matrix (V x V grid, O(1) lookup, O(V^2) space), and a weighted list of (neighbor, weight) pairs."
    },

    whyDsa:
      "<p>Almost every graph problem hands you <b>edges</b> and expects you to build the adjacency list yourself before you can traverse. That build loop is boilerplate you should be able to write from memory \u2014 the whole problem often hinges on getting it right.</p>" +
      "<pre class=\"why-pre\">graph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)   \u2192 BOTH ways for undirected</pre>" +
      "<p>The <b>directed/undirected</b> choice is one line, and getting it wrong silently breaks traversal. A directed edge appends one way; forget the reverse edge on an undirected graph and half your neighbors vanish.</p>" +
      "<pre class=\"why-pre\">directed:    graph[u].append(v)\nundirected:  graph[u].append(v)\n             graph[v].append(u)   \u2190 don't forget this one</pre>" +
      "<p>Pick the representation from <b>density</b>. Real interview graphs are usually <b>sparse</b> (E is far below V\u00b2), so the adjacency list at O(V + E) wins on both space and neighbor iteration. Reach for the matrix only when the graph is dense or is already a fixed grid where O(1) <code>M[u][v]</code> lookups pay off.</p>" +
      "<pre class=\"why-pre\">adjacency list:   O(V + E) space, iterate neighbors fast\nadjacency matrix: O(V\u00b2) space, O(1) edge lookup</pre>",

    recognize: [
      { q: "\u201cYou're given a list of edges / connections / prerequisites\u201d", think: "build an adjacency list: defaultdict(list), append per edge" },
      { q: "\u201cUndirected graph (friends, roads, mutual links)\u201d", think: "append BOTH u->v and v->u when building" },
      { q: "\u201cDirected (course prereqs, one-way, dependencies)\u201d", think: "append only u->v; direction matters for cycles / topo sort" },
      { q: "\u201cWeighted edges (distances, costs, times)\u201d", think: "store (neighbor, weight) tuples; feed into Dijkstra / a heap" },
      { q: "\u201cDense graph or fixed small grid, many edge lookups\u201d", think: "adjacency matrix M[u][v] \u2014 O(1) lookup but O(V^2) space" }
    ],

    matchTags: ["graph", "adjacency", "adjacency list", "adjacency matrix", "edge list", "directed", "undirected", "weighted", "defaultdict"],
    relatedProblems: ["clone-graph", "course-schedule", "number-of-islands", "pacific-atlantic-water-flow", "graph-valid-tree"],

    traps: [
      {
        bad: "graph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)   # only ONE direction",
        good: "for u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)   # undirected needs BOTH",
        why: "For an UNDIRECTED graph every edge is bidirectional, so you must append both ways. Appending only u->v turns it into a directed graph, and traversals then miss half the reachable nodes with no error message. Conversely, adding the reverse edge on a truly directed problem invents connections that aren't there."
      },
      {
        bad: "M = [[0] * n] * n     # n references to the SAME inner list\nM[0][1] = 1           # also mutates M[1], M[2], ...",
        good: "M = [[0] * n for _ in range(n)]   # n distinct rows",
        why: "[[0]*n]*n makes the outer list hold n copies of ONE inner list, so writing M[0][1] changes every row at once. Build each row separately with a comprehension so the rows are independent objects."
      },
      {
        bad: "graph = {}\nfor u, v in edges:\n    graph[u].append(v)   # KeyError: u not in graph yet",
        good: "from collections import defaultdict\ngraph = defaultdict(list)   # missing keys auto-create []",
        why: "A plain dict raises KeyError the first time you touch a node, forcing setdefault or an 'if u not in graph' guard on every line. defaultdict(list) creates an empty list on first access, so the build loop stays two clean lines. Note: a stray read of a missing key still INSERTS an empty entry, which can surprise len(graph)."
      }
    ],

    cpython:
      "<p>The adjacency list is a <b>dict backing lists</b>: the dict is a hash table giving O(1)-average lookup of a node's neighbor list, and each list is a contiguous array you iterate in O(deg(node)). <code>collections.defaultdict</code> is a C subclass of <code>dict</code> that, on a missing key, calls the factory you gave it (<code>list</code>) via its <code>__missing__</code> hook and inserts the result \u2014 which is why <code>graph[u].append(v)</code> just works. A matrix is a Python <code>list</code> of row lists, so a row is one contiguous block but the V rows are separate heap objects, and it always occupies O(V\u00b2) slots regardless of how few edges exist.</p>",

    complexity: [
      { op: "build adjacency list from E edges", big_o: "O(V + E)", note: "One append per edge (two for undirected); the space to hold every node and every edge, and the standard setup cost of a graph problem." },
      { op: "adjacency list \u2014 space", big_o: "O(V + E)", note: "Stores only edges that exist, so it stays small on sparse graphs \u2014 the reason it's the default representation." },
      { op: "adjacency list \u2014 iterate a node's neighbors", big_o: "O(deg(v))", note: "Walks just that node's list; summed over a traversal this is O(V + E) total." },
      { op: "adjacency matrix \u2014 space", big_o: "O(V\u00b2)", note: "A full V\u00d7V grid whether the graph is dense or nearly empty \u2014 wasteful on sparse graphs, fine on dense ones or small fixed grids." },
      { op: "adjacency matrix \u2014 edge lookup M[u][v]", big_o: "O(1)", note: "Two array indexes \u2014 the matrix's one real advantage over the list, worth it only when you test specific edges constantly." },
      { op: "edge list \u2014 find a node's neighbors", big_o: "O(E)", note: "No index by node, so you scan every edge \u2014 compact to store but slow to traverse, which is why you usually convert it to an adjacency list first." }
    ],

    challenge: {
      prompt: "Build an undirected adjacency list from edges = [(0, 1), (0, 2), (1, 2), (2, 3)] and print the sorted neighbors of node 2. Expected: [0, 1, 3].",
      starter: "from collections import defaultdict\nedges = [(0, 1), (0, 2), (1, 2), (2, 3)]\ngraph = defaultdict(list)\n# append both directions for each edge\n",
      solution:
        "from collections import defaultdict\nedges = [(0, 1), (0, 2), (1, 2), (2, 3)]\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)\nprint(sorted(graph[2]))   # [0, 1, 3]"
    }
  },

  {
    id: "graph-traversal-bfs-dfs",
    title: "Graph Traversal (BFS & DFS)",
    difficulty: "Intermediate \u2192 Advanced",
    estMinutes: 15,
    dsaRelevance: 3,
    prerequisites: ["graph-representations", "queue-deque"],
    tagline: "Visit every node exactly once \u2014 BFS for shortest paths in unweighted graphs, DFS for reachability, and a visited set so you never loop forever.",

    whatIsIt: [
      "<b>Traversal</b> means visiting every reachable node exactly once. Two orders cover nearly everything: <b>BFS</b> (breadth-first) fans out level by level, and <b>DFS</b> (depth-first) plunges down one path before backtracking.",
      "<b>BFS</b> uses a FIFO <b>queue</b> \u2014 <code>collections.deque</code>, popping from the left. Because it reaches every node in increasing distance order, in an <b>unweighted graph BFS finds the shortest path</b> (fewest edges), and processing one whole <i>level</i> at a time lets you count distance.",
      "<b>DFS</b> uses a stack \u2014 usually the call stack via recursion, or an explicit <code>list</code> stack to iterate. It's the natural fit for reachability, connected components, cycle detection, and anything that explores a full branch before moving on.",
      "The one thing both must have is a <b>visited set</b>. Graphs have cycles, so without marking nodes seen you revisit them forever \u2014 an infinite loop. Mark a node visited the moment you enqueue/push it (BFS) or enter it (DFS)."
    ],

    showMe: {
      code:
        "from collections import deque\n" +
        "\n" +
        "graph = {0: [1, 2], 1: [0, 3], 2: [0, 3], 3: [1, 2]}\n" +
        "\n" +
        "# BFS with a deque -- visits level by level (shortest path in edges).\n" +
        "def bfs(start):\n" +
        "    visited = {start}            # mark on ENQUEUE, not on pop\n" +
        "    q = deque([start])\n" +
        "    order = []\n" +
        "    while q:\n" +
        "        node = q.popleft()       # FIFO -> breadth-first\n" +
        "        order.append(node)\n" +
        "        for nb in graph[node]:\n" +
        "            if nb not in visited:\n" +
        "                visited.add(nb)\n" +
        "                q.append(nb)\n" +
        "    return order\n" +
        "\n" +
        "# DFS, recursive -- the call stack IS the stack.\n" +
        "def dfs(node, visited, order):\n" +
        "    visited.add(node)\n" +
        "    order.append(node)\n" +
        "    for nb in graph[node]:\n" +
        "        if nb not in visited:\n" +
        "            dfs(nb, visited, order)\n" +
        "    return order\n" +
        "\n" +
        "# DFS, iterative -- explicit list stack, no recursion limit.\n" +
        "def dfs_iter(start):\n" +
        "    visited, stack, order = set(), [start], []\n" +
        "    while stack:\n" +
        "        node = stack.pop()       # LIFO -> depth-first\n" +
        "        if node in visited:\n" +
        "            continue\n" +
        "        visited.add(node)\n" +
        "        order.append(node)\n" +
        "        stack.extend(graph[node])\n" +
        "    return order\n" +
        "\n" +
        "print(bfs(0))                    # [0, 1, 2, 3]\n" +
        "print(dfs(0, set(), []))         # [0, 1, 3, 2]\n" +
        "print(dfs_iter(0))               # [0, 2, 3, 1]",
      caption: "BFS with a deque (level by level, shortest path), DFS recursively (call stack) and iteratively (explicit stack). Every version guards with a visited set."
    },

    whyDsa:
      "<p><b>BFS gives you shortest path for free in an unweighted graph</b>: it reaches nodes in order of distance, so the first time you touch the target, you're there by the fewest edges. Process a full level per outer iteration and the loop count is the distance.</p>" +
      "<pre class=\"why-pre\">while q:\n    for _ in range(len(q)):   \u2192 one whole level\n        node = q.popleft()\n    dist += 1                 \u2192 distance = number of levels</pre>" +
      "<p><b>Connected components</b> fall out of either traversal: loop over all nodes, and each time you hit an unvisited one, launch a fresh traversal \u2014 that's one new component. This is exactly how grid problems like <i>number of islands</i> count blobs.</p>" +
      "<pre class=\"why-pre\">count = 0\nfor node in nodes:\n    if node not in visited:\n        traverse(node)   \u2192 flood one component\n        count += 1</pre>" +
      "<p>A <b>grid is just a graph</b>: each cell is a node, its up/down/left/right neighbors are its edges. The same BFS/DFS runs, with bounds-checking standing in for the adjacency list.</p>" +
      "<pre class=\"why-pre\">for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n    nr, nc = r + dr, c + dc\n    if 0 &lt;= nr &lt; rows and 0 &lt;= nc &lt; cols:   \u2192 the neighbors</pre>" +
      "<p>These two are the base for the next tier: <b>topological sort</b> (Kahn's BFS on in-degrees, or DFS post-order) orders a directed acyclic graph, and <b>Dijkstra</b> is BFS with a <b>heap</b> instead of a queue for weighted shortest paths.</p>",

    recognize: [
      { q: "\u201cShortest path / fewest steps in an UNWEIGHTED graph or grid\u201d", think: "BFS with a deque, count levels \u2014 first arrival is shortest" },
      { q: "\u201cCount islands / regions / connected components\u201d", think: "loop all cells; each unvisited start launches one flood-fill (BFS or DFS)" },
      { q: "\u201cCan I reach X from Y / is the graph connected\u201d", think: "DFS or BFS from the source, check membership in visited" },
      { q: "\u201cCourse schedule / build order / dependencies\u201d", think: "directed graph \u2192 topological sort (Kahn's BFS on in-degree, or DFS)" },
      { q: "\u201cShortest path with edge WEIGHTS / costs\u201d", think: "Dijkstra \u2014 BFS but a heap (priority queue) replaces the plain queue" }
    ],

    matchTags: ["graph", "bfs", "dfs", "traversal", "visited", "shortest path", "connected components", "queue", "deque", "topological", "flood fill"],
    relatedProblems: ["number-of-islands", "clone-graph", "course-schedule", "rotting-oranges", "pacific-atlantic-water-flow"],

    traps: [
      {
        bad: "q = deque([start])\nwhile q:\n    node = q.popleft()\n    for nb in graph[node]:\n        q.append(nb)   # NO visited set",
        good: "visited = {start}\n...\n    for nb in graph[node]:\n        if nb not in visited:\n            visited.add(nb)\n            q.append(nb)",
        why: "Graphs have cycles, so without a visited set you re-enqueue nodes you've already seen and the loop never terminates (or explodes in memory). A visited set is the #1 non-negotiable of graph traversal \u2014 add it before anything else."
      },
      {
        bad: "def bfs(start):\n    q = deque([start])\n    while q:\n        node = q.popleft()\n        visited.add(node)   # mark on POP, not enqueue",
        good: "visited = {start}\nq = deque([start])\n# ... add nb to visited AT THE MOMENT you append it",
        why: "In BFS, mark a node visited when you ENQUEUE it, not when you dequeue it. If you wait until pop, the same node can be enqueued many times through different neighbors before it's ever popped \u2014 duplicates in the queue, and the shortest-path level counting breaks."
      },
      {
        bad: "for node in graph:\n    if node not in visited:\n        graph[node].append(x)   # mutating while iterating",
        good: "snapshot = list(graph.items())   # or collect changes, apply after\nfor node, nbrs in snapshot:\n    ...",
        why: "Adding or removing nodes/edges while you're traversing invalidates the iteration \u2014 Python raises 'dict changed size during iteration', or you visit phantom nodes. If a problem needs you to modify the graph (e.g. cloning), traverse a snapshot or build the new structure separately rather than editing the one you're walking."
      }
    ],

    cpython:
      "<p>BFS needs a real FIFO queue and <code>collections.deque</code> is it: a C-implemented doubly linked list of fixed-size blocks, so <code>popleft()</code> and <code>append()</code> are both O(1) \u2014 whereas a plain list's <code>pop(0)</code> is O(n) because it shifts every remaining element. DFS recursion rides CPython's <b>call stack</b>, which is capped near 1000 frames (<code>sys.getrecursionlimit()</code>); a deep or adversarial graph overflows it with <code>RecursionError</code>, which is exactly why the explicit-stack iterative DFS exists. The <b>visited set</b> is a hash set giving O(1)-average membership tests, so the <code>if nb not in visited</code> guard on every edge stays cheap and the whole traversal holds at O(V + E).</p>",

    complexity: [
      { op: "BFS (adjacency list)", big_o: "O(V + E)", note: "Every node is enqueued once and every edge is examined once \u2014 the baseline cost of a full traversal." },
      { op: "DFS (adjacency list, recursive or iterative)", big_o: "O(V + E)", note: "Same accounting as BFS: one visit per node, one look per edge \u2014 they differ in order, not in asymptotic cost." },
      { op: "traversal on an adjacency matrix", big_o: "O(V\u00b2)", note: "Finding a node's neighbors means scanning its whole length-V row, so the matrix forces V\u00b2 work regardless of edge count." },
      { op: "BFS / DFS \u2014 space", big_o: "O(V)", note: "The visited set holds up to V nodes, and the queue (or recursion/explicit stack) can too in the worst case." },
      { op: "grid BFS/DFS (R rows, C cols)", big_o: "O(R\u00b7C)", note: "Each cell is a node with up to 4 neighbors, so V = R\u00b7C and E is O(R\u00b7C) \u2014 the whole grid is visited once." },
      { op: "connected components (full scan)", big_o: "O(V + E)", note: "The outer loop touches each node once and the inner traversals together cover every node and edge exactly once." }
    ],

    challenge: {
      prompt: "Count the connected components of an undirected graph with edges = [(0, 1), (1, 2), (3, 4)] over nodes 0..4. Use DFS and a visited set. Expected: 2 (the group {0,1,2} and the group {3,4}).",
      starter: "from collections import defaultdict\nn = 5\nedges = [(0, 1), (1, 2), (3, 4)]\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)\nvisited = set()\n# launch a DFS from each unvisited node; count the launches\n",
      solution:
        "from collections import defaultdict\nn = 5\nedges = [(0, 1), (1, 2), (3, 4)]\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)\n\nvisited = set()\n\ndef dfs(node):\n    visited.add(node)\n    for nb in graph[node]:\n        if nb not in visited:\n            dfs(nb)\n\ncount = 0\nfor node in range(n):\n    if node not in visited:\n        dfs(node)      # flood one whole component\n        count += 1\nprint(count)   # 2"
    }
  }
]);
