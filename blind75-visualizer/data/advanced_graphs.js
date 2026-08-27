/*
 * NeetCode 150 — Advanced Graphs
 * =========================================================================
 * Registers this category's problems on the global registry. See
 * data/arrays_hashing.js for the full PROBLEM SCHEMA reference.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Advanced Graphs", [
    {
      id: "reconstruct-itinerary",
      lc: 332,
      title: "Reconstruct Itinerary",
      difficulty: "Hard",
      category: "Advanced Graphs",
      link: "https://leetcode.com/problems/reconstruct-itinerary/",
      meta: { pattern: "Eulerian Path", dataStructure: "Graph (adjacency list) + Stack", technique: "Hierholzer's algorithm" },
      description:
        "You are given a list of airline `tickets` where `tickets[i] = [from, to]` represents a one-way flight. Reconstruct the itinerary that uses **every ticket exactly once** and starts at `\"JFK\"`.\n\n" +
        "If several valid itineraries exist, return the one that is **lexicographically smallest** when read as a single list of airport codes. The input is guaranteed to allow at least one valid itinerary that consumes all tickets.",
      constraints: [
        "`1 <= tickets.length <= 300`",
        "`tickets[i].length == 2`, each airport code is 3 uppercase letters.",
        "All tickets form at least one valid itinerary starting from `\"JFK\"`.",
        "A ticket may be repeated (the same [from, to] can appear more than once)."
      ],
      notes: [
        "This is an **Eulerian path** problem: an itinerary using every edge exactly once.",
        "Lexicographic order is over the whole airport sequence, so always prefer the smallest available next airport.",
        "You must use ALL tickets — a shorter valid-looking path that leaves tickets unused is wrong."
      ],
      examples: [
        {
          input: 'tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]',
          output: '["JFK","MUC","LHR","SFO","SJC"]',
          reasoning: "There is a single chain that consumes all four tickets starting at JFK."
        },
        {
          input: 'tickets = [["JFK","SFO"],["JFK","ATL"],["SFO","ATL"],["ATL","JFK"],["ATL","SFO"]]',
          output: '["JFK","ATL","JFK","SFO","ATL","SFO"]',
          reasoning: 'From JFK the smaller choice is ATL. ["JFK","SFO","ATL","JFK","ATL","SFO"] is also valid but lexicographically larger.',
          visual:
            "```\nfrom JFK: [ATL, SFO]  -> pick ATL (smaller)\nfrom ATL: [JFK, SFO]  -> pick JFK\nfrom JFK: [SFO]       -> pick SFO\nfrom SFO: [ATL]       -> pick ATL\nfrom ATL: [SFO]       -> pick SFO\nroute: JFK ATL JFK SFO ATL SFO\n```"
        },
        {
          input: 'tickets = [["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]',
          output: '["JFK","NRT","JFK","KUL"]',
          reasoning: "Taking KUL first would strand the NRT/JFK tickets, so the greedy 'smallest' pick must yield to the requirement of using every ticket — Hierholzer handles this by backtracking the dead-end onto the route."
        }
      ],
      approaches: [
        {
          name: "Hierholzer's algorithm (post-order DFS)",
          time: "O(E log E)",
          space: "O(E)",
          whenToUse: "Any 'use every edge exactly once' / Eulerian-path task, especially with a lexicographic tie-break.",
          logic:
            "**What it asks.** Order the flights into one itinerary that starts at `\"JFK\"` and uses **every ticket exactly once**; among all such orderings, return the lexicographically smallest airport sequence.\n\n" +
            "**Why the naive idea fails.** Plain greedy — 'always fly to the smallest next airport' — can walk into a dead end that still has unused tickets elsewhere, producing an incomplete itinerary. Full backtracking that tries every branch is correct but exponential in the worst case. We need something that both respects lexicographic order and never gets permanently stuck.\n\n" +
            "**Key Idea.** Model airports as **nodes** and tickets as directed **edges**; an itinerary using all tickets is an **Eulerian path**. Hierholzer's algorithm builds it with a post-order DFS: keep each airport's destinations sorted, greedily consume the smallest edge, and when a node has no edges left (a dead end) **prepend it to the route**. Reversing the collected order yields a path that both is Eulerian and, thanks to the sorted lists, is lexicographically smallest.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build an adjacency list `graph[from] -> [to, ...]`, and sort so each destination list is in lexicographic order.\n" +
            "2. DFS from `\"JFK\"`. At each node, repeatedly pop the smallest remaining destination and recurse into it — this deletes (consumes) the edge.\n" +
            "3. When a node has no outgoing edges left, it is a dead end: append it to `route`.\n" +
            "4. After the DFS unwinds, `route` holds the itinerary in reverse; return `route[::-1]`.\n\n" +
            "**Why it works.** In an Eulerian path only the final airport can be a true dead end. A node that runs out of edges during the DFS is exactly where the path must terminate *from that point on*, so appending on the way back out and reversing splices every detour into its correct place. Consuming the smallest edge first makes the reversed sequence the lexicographically smallest valid itinerary. Because each edge is traversed exactly once, no ticket is skipped or reused.\n\n" +
            "**Common Gotchas.**\n" +
            "- Append the node to the route **after** its edges are exhausted (post-order), not when you first visit it.\n" +
            "- Remember to reverse the collected route at the end.\n" +
            "- 'Visited' here means edges consumed, **not** nodes — a node is revisited as many times as tickets pass through it.\n" +
            "- Sort destinations (or use a heap) so ties break to the smaller airport.\n\n" +
            "**Complexity.** Sorting the edges costs `O(E log E)`; the DFS consumes each of the `E` edges once. Space `O(E)` for the graph, route, and recursion. Using `pop(0)` on a Python list is `O(E)` per pop; a heap or reversed-list-with `pop()` makes each removal `O(log E)`/`O(1)`.\n\n" +
            "**Interview mindset.** 'Use every edge exactly once' is the Eulerian-path signal → Hierholzer. The post-order 'prepend on dead end, then reverse' trick is the part to remember; sorted adjacency handles the lexicographic requirement for free.",
          rcs:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def findItinerary(self, tickets: List[List[str]]) -> List[str]:\n" +
            "        graph = defaultdict(list)                 # departure -> list of arrivals\n" +
            "        for src, dst in sorted(tickets):          # sort so each list is lexicographic\n" +
            "            graph[src].append(dst)\n" +
            "        route = []                                # will hold the Eulerian path in reverse\n" +
            "        def dfs(node):\n" +
            "            while graph[node]:                    # consume edges until this node is stuck\n" +
            "                nxt = graph[node].pop(0)          # take the smallest available destination\n" +
            "                dfs(nxt)                          # walk it, deleting the edge\n" +
            "            route.append(node)                    # dead end: record node (prepend after reverse)\n" +
            "        dfs(\"JFK\")                                # every itinerary starts at JFK\n" +
            "        return route[::-1]                        # reverse to get forward order",
          plain:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def findItinerary(self, tickets: List[List[str]]) -> List[str]:\n" +
            "        graph = defaultdict(list)\n" +
            "        for src, dst in sorted(tickets):\n" +
            "            graph[src].append(dst)\n" +
            "        route = []\n" +
            "        def dfs(node):\n" +
            "            while graph[node]:\n" +
            "                nxt = graph[node].pop(0)\n" +
            "                dfs(nxt)\n" +
            "            route.append(node)\n" +
            "        dfs(\"JFK\")\n" +
            "        return route[::-1]"
        }
      ],
      patternRecognition: [
        "'Use every ticket / edge exactly once' → Eulerian path → Hierholzer's algorithm.",
        "A lexicographic tie-break is handled by sorting each adjacency list (or a min-heap).",
        "Post-order DFS that prepends dead-end nodes, then reverses, is the recognizable shape."
      ],
      interviewRecall: [
        "Sorted adjacency list + DFS that pops the smallest edge each step.",
        "Append a node to the route only when its edges are exhausted, then reverse the route.",
        "'Visited' tracks consumed edges, not nodes — nodes can repeat."
      ]
    },

    {
      id: "min-cost-to-connect-all-points",
      lc: 1584,
      title: "Min Cost to Connect All Points",
      difficulty: "Medium",
      category: "Advanced Graphs",
      link: "https://leetcode.com/problems/min-cost-to-connect-all-points/",
      meta: { pattern: "Minimum Spanning Tree", dataStructure: "Min-Heap / Union-Find", technique: "Prim's / Kruskal's" },
      description:
        "You are given `points` on a 2D plane, `points[i] = [xi, yi]`. The cost of connecting two points is their **Manhattan distance** `|xi - xj| + |yi - yj|`.\n\n" +
        "Return the **minimum total cost** to connect all points so that there is exactly one path between any two of them (i.e. connect them into a single tree).",
      constraints: [
        "`1 <= points.length <= 1000`",
        "`-10^6 <= xi, yi <= 10^6`",
        "All points are distinct."
      ],
      notes: [
        "The graph is implicitly **complete**: every pair of points is a candidate edge with weight = Manhattan distance.",
        "'Connect all points into one tree' with minimum total edge weight is exactly a **Minimum Spanning Tree** (MST).",
        "An MST on n nodes uses exactly n - 1 edges."
      ],
      examples: [
        {
          input: "points = [[0,0],[2,2],[3,10],[5,2],[7,0]]",
          output: "20",
          reasoning: "One optimal tree connects the points with edges summing to 20; any other spanning tree costs at least as much.",
          visual:
            "```\nnodes: the 5 points\nedges considered: all C(5,2)=10 Manhattan distances\nMST keeps the 4 cheapest edges that connect everything\ntotal weight = 20\n```"
        },
        {
          input: "points = [[3,12],[-2,5],[-4,1]]",
          output: "18",
          reasoning: "|3-(-2)|+|12-5| = 12 and |-2-(-4)|+|5-1| = 6, joining all three: 12 + 6 = 18."
        },
        {
          input: "points = [[0,0]]",
          output: "0",
          reasoning: "A single point needs no edges, so the cost is 0."
        }
      ],
      approaches: [
        {
          name: "Prim's algorithm with a min-heap",
          time: "O(n^2 log n)",
          space: "O(n^2)",
          whenToUse: "MST on a dense/complete graph where edges are computed on the fly from node data.",
          logic:
            "**What it asks.** Connect all points into one tree with the minimum possible sum of Manhattan-distance edge weights — a Minimum Spanning Tree.\n\n" +
            "**Why the naive idea fails.** Trying every possible tree is astronomically expensive. Even 'sort all edges' is fine (Kruskal), but here the graph is **complete**: `n` points give `~n^2/2` edges, so we want an approach that grows the tree without necessarily materializing and sorting all of them at once.\n\n" +
            "**Key Idea.** Prim's grows one connected tree outward. **Nodes** are the points; **edges** are the pairwise Manhattan distances; `visited` marks points already pulled into the tree. Repeatedly take the **cheapest edge that crosses from the tree to a point not yet in it**, using a min-heap to always surface that cheapest crossing edge. A min-heap fits because we only ever need the current minimum-weight frontier edge.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start the tree with point 0; push `(0, 0)` = (cost, index) onto the heap.\n" +
            "2. Pop the smallest `(cost, i)`. If `i` is already in `visited`, it's a stale entry — skip it.\n" +
            "3. Otherwise add `i` to the tree, add `cost` to the running total.\n" +
            "4. For every point `j` not yet in the tree, push `(manhattan(i, j), j)` — the new crossing edges now available from `i`.\n" +
            "5. Repeat until all `n` points are in the tree; return the total.\n\n" +
            "**Why it works.** The **cut property** of MSTs: for any split of nodes into 'in the tree' vs 'out', the minimum-weight edge crossing that cut is safe to add. Each iteration adds exactly that minimum crossing edge, so the final set of `n - 1` edges is a minimum spanning tree. Skipping stale heap entries (a point already visited) avoids adding cycles.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check `visited` **after** popping, since the heap can hold several outdated entries for the same node.\n" +
            "- Start the total at 0 and the first edge cost at 0 (connecting the seed node is free).\n" +
            "- 'Visited' is over **nodes**, not edges.\n\n" +
            "**Complexity.** Each of the `n` points, when added, pushes up to `n` edges, so the heap holds `O(n^2)` entries → time `O(n^2 log n)`, space `O(n^2)`. (A dense-array Prim without a heap is `O(n^2)`.)\n\n" +
            "**Interview mindset.** 'Connect everything at minimum total cost' = MST. On a complete geometric graph, Prim with a heap avoids building the full edge list up front.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minCostConnectPoints(self, points: List[List[int]]) -> int:\n" +
            "        n = len(points)\n" +
            "        visited = set()                           # points already pulled into the tree\n" +
            "        min_heap = [(0, 0)]                        # (edge cost, point index); start at point 0\n" +
            "        total = 0\n" +
            "        while len(visited) < n:                   # stop once every point is connected\n" +
            "            cost, i = heapq.heappop(min_heap)     # cheapest edge crossing out of the tree\n" +
            "            if i in visited:                      # stale entry: already in the tree\n" +
            "                continue\n" +
            "            visited.add(i)\n" +
            "            total += cost                         # commit this edge to the MST\n" +
            "            xi, yi = points[i]\n" +
            "            for j in range(n):                    # offer every not-yet-added point\n" +
            "                if j not in visited:\n" +
            "                    xj, yj = points[j]\n" +
            "                    dist = abs(xi - xj) + abs(yi - yj)   # Manhattan distance\n" +
            "                    heapq.heappush(min_heap, (dist, j))\n" +
            "        return total",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minCostConnectPoints(self, points: List[List[int]]) -> int:\n" +
            "        n = len(points)\n" +
            "        visited = set()\n" +
            "        min_heap = [(0, 0)]\n" +
            "        total = 0\n" +
            "        while len(visited) < n:\n" +
            "            cost, i = heapq.heappop(min_heap)\n" +
            "            if i in visited:\n" +
            "                continue\n" +
            "            visited.add(i)\n" +
            "            total += cost\n" +
            "            xi, yi = points[i]\n" +
            "            for j in range(n):\n" +
            "                if j not in visited:\n" +
            "                    xj, yj = points[j]\n" +
            "                    dist = abs(xi - xj) + abs(yi - yj)\n" +
            "                    heapq.heappush(min_heap, (dist, j))\n" +
            "        return total"
        },
        {
          name: "Kruskal's algorithm with Union-Find",
          time: "O(n^2 log n)",
          space: "O(n^2)",
          whenToUse: "MST when you'd rather sort all edges and merge components; natural when edges are given explicitly.",
          logic:
            "**What it asks.** Same MST goal: connect all points with minimum total Manhattan-distance cost.\n\n" +
            "**Why the naive idea fails.** As before, enumerating trees is intractable. Kruskal instead sorts edges globally and adds them cheapest-first, needing a fast way to know whether two points are already connected — that's what Union-Find provides.\n\n" +
            "**Key Idea.** Build **all** `C(n,2)` candidate **edges** (weight = Manhattan distance), sort them ascending, and add each edge only if its two endpoints are in **different components**. A Union-Find (disjoint-set) tracks components: `find` returns a point's root, `union` merges two components and reports whether they were previously separate. Adding an edge within one component would create a cycle, so we skip it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `parent[i] = i` so each point starts as its own component.\n" +
            "2. Generate every edge `(dist, i, j)` for `i < j` and sort by `dist`.\n" +
            "3. Walk edges cheapest-first. For `(dist, i, j)`, if `find(i) != find(j)`, `union` them, add `dist` to the total, and increment an edge counter.\n" +
            "4. Stop once `n - 1` edges have been added (the tree is complete); return the total.\n\n" +
            "**Why it works.** Kruskal is the greedy realization of the MST **cut/cycle properties**: taking the globally cheapest edge that doesn't form a cycle is always safe, and after `n - 1` such edges every point sits in one component — a minimum spanning tree. Union-Find with path compression makes the connectivity checks near-constant time.\n\n" +
            "**Common Gotchas.**\n" +
            "- Only add an edge when its endpoints have **different** roots, otherwise you create a cycle.\n" +
            "- Stop at `n - 1` edges — extra edges can't improve a tree.\n" +
            "- Sort is required; adding edges out of order breaks correctness.\n\n" +
            "**Complexity.** Building and sorting `O(n^2)` edges dominates: `O(n^2 log n)` time, `O(n^2)` space. Union-Find operations are effectively `O(α(n))` each.\n\n" +
            "**Interview mindset.** When edges are explicit (or worth materializing) and you want a clean 'sort + merge components' story, Kruskal + Union-Find is the alternative to Prim — same MST, different bookkeeping.",
          rcs:
            "class Solution:\n" +
            "    def minCostConnectPoints(self, points: List[List[int]]) -> int:\n" +
            "        n = len(points)\n" +
            "        parent = list(range(n))                   # union-find: each point its own root\n" +
            "        def find(x):\n" +
            "            while parent[x] != x:                 # climb to the root\n" +
            "                parent[x] = parent[parent[x]]     # path compression by halving\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "        def union(a, b):\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:                          # already connected -> would make a cycle\n" +
            "                return False\n" +
            "            parent[ra] = rb                       # merge the two trees\n" +
            "            return True\n" +
            "        edges = []\n" +
            "        for i in range(n):                        # build all candidate edges\n" +
            "            xi, yi = points[i]\n" +
            "            for j in range(i + 1, n):\n" +
            "                xj, yj = points[j]\n" +
            "                dist = abs(xi - xj) + abs(yi - yj)\n" +
            "                edges.append((dist, i, j))\n" +
            "        edges.sort()                              # cheapest edges first\n" +
            "        total = 0\n" +
            "        count = 0\n" +
            "        for dist, i, j in edges:\n" +
            "            if union(i, j):                       # add edge only if it links two components\n" +
            "                total += dist\n" +
            "                count += 1\n" +
            "                if count == n - 1:                # a tree on n nodes needs n-1 edges\n" +
            "                    break\n" +
            "        return total",
          plain:
            "class Solution:\n" +
            "    def minCostConnectPoints(self, points: List[List[int]]) -> int:\n" +
            "        n = len(points)\n" +
            "        parent = list(range(n))\n" +
            "        def find(x):\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "        def union(a, b):\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:\n" +
            "                return False\n" +
            "            parent[ra] = rb\n" +
            "            return True\n" +
            "        edges = []\n" +
            "        for i in range(n):\n" +
            "            xi, yi = points[i]\n" +
            "            for j in range(i + 1, n):\n" +
            "                xj, yj = points[j]\n" +
            "                dist = abs(xi - xj) + abs(yi - yj)\n" +
            "                edges.append((dist, i, j))\n" +
            "        edges.sort()\n" +
            "        total = 0\n" +
            "        count = 0\n" +
            "        for dist, i, j in edges:\n" +
            "            if union(i, j):\n" +
            "                total += dist\n" +
            "                count += 1\n" +
            "                if count == n - 1:\n" +
            "                    break\n" +
            "        return total"
        }
      ],
      patternRecognition: [
        "'Connect everything into one tree at minimum total cost' → Minimum Spanning Tree.",
        "Complete geometric graph (edges from point coordinates) → Prim with a heap avoids listing all edges up front.",
        "Explicit edge list you can sort → Kruskal + Union-Find."
      ],
      interviewRecall: [
        "Prim: min-heap of (cost, node), pop-skip-if-visited, push crossing edges; stop when all nodes in.",
        "Kruskal: sort all edges, add cheapest that joins two components (Union-Find), stop at n-1 edges.",
        "Both rely on the MST cut property; MST on n nodes has exactly n-1 edges."
      ]
    },

    {
      id: "network-delay-time",
      lc: 743,
      title: "Network Delay Time",
      difficulty: "Medium",
      category: "Advanced Graphs",
      link: "https://leetcode.com/problems/network-delay-time/",
      meta: { pattern: "Single-Source Shortest Path", dataStructure: "Min-Heap + Adjacency List", technique: "Dijkstra's algorithm" },
      description:
        "You are given a directed, weighted network of `n` nodes labeled `1..n`. Each `times[i] = [u, v, w]` means a signal from node `u` reaches node `v` after `w` time units.\n\n" +
        "A signal is sent from node `k`. Return the **minimum time** for the signal to reach **all** `n` nodes. If it is impossible to reach every node, return `-1`.",
      constraints: [
        "`1 <= k <= n <= 100`",
        "`1 <= times.length <= 6000`",
        "`times[i] = [u, v, w]` with `1 <= u, v <= n`, `u != v`, `0 <= w <= 100`.",
        "All `(u, v)` pairs are distinct (no duplicate directed edges)."
      ],
      notes: [
        "The answer is the **maximum** of the shortest-path distances from `k` to every node (the last node to hear the signal).",
        "Edge weights are non-negative, so Dijkstra applies.",
        "If any node is unreachable from `k`, return -1."
      ],
      examples: [
        {
          input: "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",
          output: "2",
          reasoning: "From 2: node 1 at t=1, node 3 at t=1, node 4 at t=2. The slowest arrival is 2.",
          visual:
            "```\n     (2)\n    /   \\\n  1(1)   3(1)\n            \\\n            4(2)\nshortest times from k=2: {2:0, 1:1, 3:1, 4:2}\nanswer = max = 2\n```"
        },
        {
          input: "times = [[1,2,1]], n = 2, k = 1",
          output: "1",
          reasoning: "Node 2 is reached at t=1; both nodes are covered."
        },
        {
          input: "times = [[1,2,1]], n = 2, k = 2",
          output: "-1",
          reasoning: "From node 2 there is no edge to node 1, so node 1 is never reached → -1."
        }
      ],
      approaches: [
        {
          name: "Dijkstra's algorithm with a min-heap",
          time: "O(E log V)",
          space: "O(V + E)",
          whenToUse: "Single-source shortest paths on a graph with non-negative edge weights.",
          logic:
            "**What it asks.** Send a signal from node `k` and find how long until the **last** node receives it, i.e. the maximum over all nodes of the shortest travel time from `k`; return `-1` if some node is unreachable.\n\n" +
            "**Why the naive idea fails.** A plain BFS counts hops, not weighted time, so it gives wrong answers when a longer-in-hops route is faster in time. Recomputing distances repeatedly (Bellman-Ford-style) works but is heavier than needed here because all weights are non-negative.\n\n" +
            "**Key Idea.** This is single-source shortest path. **Nodes** are network nodes, directed **edges** carry travel times, and Dijkstra finalizes nodes in increasing order of distance from `k`. A **min-heap** always surfaces the closest not-yet-finalized node; the first time a node is popped, its distance is final. 'Visited' here means 'distance settled'. A min-heap fits because non-negative weights guarantee a node's shortest distance is known the moment it's the cheapest thing in the frontier.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build an adjacency list `graph[u] -> [(v, w), ...]`.\n" +
            "2. Push `(0, k)` = (distance, node) and process the heap.\n" +
            "3. Pop the smallest `(d, node)`. If `node` is already settled, skip it (stale entry).\n" +
            "4. Otherwise record `dist[node] = d`, then relax each neighbor: push `(d + w, neighbor)` if that neighbor isn't settled yet.\n" +
            "5. When the heap empties, if all `n` nodes are settled return `max(dist.values())`, else return `-1`.\n\n" +
            "**Why it works.** With non-negative weights, when a node is first popped no cheaper route to it can remain (any alternative would have to pass through an already-larger frontier value). So the first pop gives the true shortest time. The overall time for the signal to reach everyone is the largest of those shortest times; a missing node means it was never reachable.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check 'already settled' **after** popping — the heap can contain multiple stale entries per node.\n" +
            "- The answer is the **max** of the shortest distances, not their sum.\n" +
            "- Return `-1` only when some node is unreachable (fewer than `n` settled).\n" +
            "- Nodes are 1-indexed.\n\n" +
            "**Complexity.** Each edge is relaxed once and pushes at most one heap entry: time `O(E log V)`, space `O(V + E)` for the graph, heap, and distance map.\n\n" +
            "**Interview mindset.** 'Shortest time / weighted shortest path from one source, non-negative weights' → Dijkstra with a min-heap. The 'reach ALL nodes' twist just means take the max of the distances.",
          rcs:
            "import heapq\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:\n" +
            "        graph = defaultdict(list)                 # u -> list of (v, weight)\n" +
            "        for u, v, w in times:\n" +
            "            graph[u].append((v, w))\n" +
            "        dist = {}                                 # node -> finalized shortest time\n" +
            "        min_heap = [(0, k)]                       # (time so far, node); start at source k\n" +
            "        while min_heap:\n" +
            "            d, node = heapq.heappop(min_heap)     # closest unfinalized node\n" +
            "            if node in dist:                      # already settled with a smaller time\n" +
            "                continue\n" +
            "            dist[node] = d                        # first pop = shortest distance\n" +
            "            for nei, w in graph[node]:            # relax outgoing edges\n" +
            "                if nei not in dist:\n" +
            "                    heapq.heappush(min_heap, (d + w, nei))\n" +
            "        return max(dist.values()) if len(dist) == n else -1   # slowest arrival, or -1",
          plain:
            "import heapq\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:\n" +
            "        graph = defaultdict(list)\n" +
            "        for u, v, w in times:\n" +
            "            graph[u].append((v, w))\n" +
            "        dist = {}\n" +
            "        min_heap = [(0, k)]\n" +
            "        while min_heap:\n" +
            "            d, node = heapq.heappop(min_heap)\n" +
            "            if node in dist:\n" +
            "                continue\n" +
            "            dist[node] = d\n" +
            "            for nei, w in graph[node]:\n" +
            "                if nei not in dist:\n" +
            "                    heapq.heappush(min_heap, (d + w, nei))\n" +
            "        return max(dist.values()) if len(dist) == n else -1"
        }
      ],
      patternRecognition: [
        "'Shortest / minimum time from a single source' with non-negative weights → Dijkstra + min-heap.",
        "'Reach ALL nodes' → answer is the max of the shortest-path distances.",
        "Unreachable node → return -1 (fewer than n settled)."
      ],
      interviewRecall: [
        "Min-heap of (dist, node); first pop of a node is its final distance.",
        "Skip stale entries (node already in dist) after popping.",
        "Answer = max(dist.values()) if all n reached, else -1."
      ]
    },

    {
      id: "swim-in-rising-water",
      lc: 778,
      title: "Swim in Rising Water",
      difficulty: "Hard",
      category: "Advanced Graphs",
      link: "https://leetcode.com/problems/swim-in-rising-water/",
      meta: { pattern: "Minimax Path / Shortest Path", dataStructure: "Min-Heap on a grid", technique: "Dijkstra (min of max) or Binary Search + DFS" },
      description:
        "You are given an `n x n` grid where `grid[r][c]` is the **elevation** of that cell. Rain raises the water level: at time `t` the water level is `t`, and you may move between two 4-directionally adjacent cells **only if both** have elevation at most `t`. You swim infinitely fast within reachable cells.\n\n" +
        "Starting at the top-left cell `(0,0)`, return the **least time `t`** at which you can reach the bottom-right cell `(n-1, n-1)`.",
      constraints: [
        "`n == grid.length == grid[i].length`",
        "`1 <= n <= 50`",
        "`0 <= grid[i][j] < n^2`",
        "Each value in `grid` is **unique** (a permutation of `0 .. n^2 - 1`)."
      ],
      notes: [
        "The time to traverse a path equals the **maximum elevation** along that path (you must wait until water covers the highest cell you cross).",
        "So the goal is the path from start to end whose maximum cell elevation is as small as possible — a **minimax path**.",
        "Movement is 4-directional; you can move freely once the water is high enough."
      ],
      examples: [
        {
          input: "grid = [[0,2],[1,3]]",
          output: "3",
          reasoning: "You start at 0. At t=3 the cell (1,1)=3 is submerged and reachable via (0,0)->(1,0)->(1,1); no earlier t connects start to end.",
          visual:
            "```\ngrid:      path 0 -> 1 -> 3\n 0  2      the max elevation on that path is 3\n 1  3      => earliest time you can arrive is t = 3\n```"
        },
        {
          input: "grid = [[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]",
          output: "16",
          reasoning: "The best route snakes so that its highest cell is 16; every route to the corner must cross a cell of elevation at least 16."
        },
        {
          input: "grid = [[0]]",
          output: "0",
          reasoning: "Already at the destination at time 0."
        }
      ],
      approaches: [
        {
          name: "Dijkstra / min-heap minimizing the path maximum",
          time: "O(n^2 log n)",
          space: "O(n^2)",
          whenToUse: "Minimax-path problems: minimize the largest weight along a route on a grid/graph.",
          logic:
            "**What it asks.** Find the least time `t` to travel from `(0,0)` to `(n-1,n-1)`, where a path becomes usable only once the water level `t` covers its highest cell. Equivalently: among all paths, minimize the **maximum elevation** on the path.\n\n" +
            "**Why the naive idea fails.** Ordinary shortest path sums edge weights, but here the cost of a path is the *max* cell on it, not the sum — so summing distances is meaningless. Simulating each time `t` from 0 upward and re-running a flood fill works but wastes effort re-scanning the grid for every candidate `t`.\n\n" +
            "**Key Idea.** Treat the grid as a graph: **nodes** are cells, **edges** connect 4-adjacent cells, and the 'cost' of standing on a cell is its elevation. Run a Dijkstra-style search where a path's cost is the **maximum elevation seen so far** rather than a sum. A **min-heap** keyed on that running max always expands the route with the smallest peak first; `visited` marks cells whose minimal-peak arrival time is finalized. A min-heap fits because elevations are non-negative and taking `max` is monotonic — the first time we pop the destination, its peak is minimal.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Push `(grid[0][0], 0, 0)` = (running max elevation, row, col) and start `visited` empty.\n" +
            "2. Pop the entry with the smallest running max. If the cell is already visited, skip it.\n" +
            "3. Mark it visited. If it is the bottom-right cell, return its running max — that's the answer.\n" +
            "4. For each of the 4 neighbors in bounds and unvisited, push `(max(t, grid[nr][nc]), nr, nc)`.\n" +
            "5. Continue until the destination is popped.\n\n" +
            "**Why it works.** Dijkstra's correctness carries over when the path cost is 'max of weights' instead of 'sum of weights', because both are monotonic (extending a path never lowers its max). So the first time the destination leaves the heap, no route with a smaller peak exists — that peak is exactly the earliest water level that connects start to end.\n\n" +
            "**Common Gotchas.**\n" +
            "- The neighbor's cost is `max(current_t, neighbor_elevation)`, not `current_t + elevation`.\n" +
            "- Seed the heap with the **start cell's own elevation** (you must wait for the start to be covered).\n" +
            "- Check `visited` after popping to ignore stale, larger-peak entries.\n\n" +
            "**Complexity.** Up to `O(n^2)` cells, each pushed a constant number of times: time `O(n^2 log n)`, space `O(n^2)`.\n\n" +
            "**Interview mindset.** 'Minimize the biggest obstacle along a path' (widest/minimax path) → Dijkstra where you carry `max` instead of `sum`. The heap key IS the answer you're minimizing.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def swimInWater(self, grid: List[List[int]]) -> int:\n" +
            "        n = len(grid)\n" +
            "        visited = set()                           # cells whose best time is finalized\n" +
            "        min_heap = [(grid[0][0], 0, 0)]           # (max elevation on path, row, col)\n" +
            "        while min_heap:\n" +
            "            t, r, c = heapq.heappop(min_heap)     # path with the smallest peak so far\n" +
            "            if (r, c) in visited:\n" +
            "                continue\n" +
            "            visited.add((r, c))\n" +
            "            if r == n - 1 and c == n - 1:         # reached bottom-right\n" +
            "                return t                          # t is the minimal required water level\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in visited:\n" +
            "                    heapq.heappush(min_heap, (max(t, grid[nr][nc]), nr, nc))  # cost = worst cell so far\n" +
            "        return -1",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def swimInWater(self, grid: List[List[int]]) -> int:\n" +
            "        n = len(grid)\n" +
            "        visited = set()\n" +
            "        min_heap = [(grid[0][0], 0, 0)]\n" +
            "        while min_heap:\n" +
            "            t, r, c = heapq.heappop(min_heap)\n" +
            "            if (r, c) in visited:\n" +
            "                continue\n" +
            "            visited.add((r, c))\n" +
            "            if r == n - 1 and c == n - 1:\n" +
            "                return t\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in visited:\n" +
            "                    heapq.heappush(min_heap, (max(t, grid[nr][nc]), nr, nc))\n" +
            "        return -1"
        },
        {
          name: "Binary search on time + DFS reachability",
          time: "O(n^2 log n)",
          space: "O(n^2)",
          whenToUse: "When the answer is monotonic in a threshold and a feasibility check is easy — 'smallest t that works'.",
          logic:
            "**What it asks.** Same goal: the least water level `t` at which `(0,0)` connects to `(n-1,n-1)`.\n\n" +
            "**Why the naive idea fails.** Checking every `t` from 0 to `n^2 - 1` with a fresh flood fill is correct but re-does the search `O(n^2)` times. We can cut the number of feasibility checks drastically.\n\n" +
            "**Key Idea.** Reachability is **monotonic in `t`**: if the corner is reachable at level `t`, it is reachable at any larger level (more cells open up, never fewer). That monotonic yes/no lets us **binary search** the smallest feasible `t`. The search space is the range of elevations `[grid[0][0], n^2 - 1]`; for a candidate `t` we run a plain DFS/BFS over cells with elevation `<= t` and ask whether the corner is reachable — eliminating half the range each step.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `canReach(t)`: DFS from `(0,0)` (only if `grid[0][0] <= t`) moving into 4-neighbors whose elevation is `<= t`; return whether `(n-1,n-1)` is reached.\n" +
            "2. Set `lo = grid[0][0]`, `hi = n*n - 1` (max possible elevation).\n" +
            "3. While `lo < hi`, take `mid`. If `canReach(mid)`, the answer is `<= mid`, so set `hi = mid`; otherwise set `lo = mid + 1`.\n" +
            "4. Return `lo` — the smallest level that connects start to end.\n\n" +
            "**Why it works.** Binary search is valid precisely because feasibility never flips from true back to false as `t` grows. Each `canReach` check is a linear-time graph traversal (**nodes** = cells, **edges** = adjacencies with both endpoints `<= t`), and 'visited' prevents revisiting cells within one check. Converging `lo`/`hi` pins the threshold where reachability first turns true.\n\n" +
            "**Common Gotchas.**\n" +
            "- The lower bound must be at least `grid[0][0]` (you can't start before the origin is covered).\n" +
            "- Use `hi = mid` (not `mid - 1`) when feasible, so you don't skip the true minimum.\n" +
            "- Reset `visited` for every `canReach` call.\n\n" +
            "**Complexity.** `O(log(n^2))` = `O(log n)` feasibility checks, each an `O(n^2)` traversal → `O(n^2 log n)` time, `O(n^2)` space — same asymptotics as the heap approach.\n\n" +
            "**Interview mindset.** 'Smallest threshold that makes something reachable/possible', with monotonic feasibility → binary search the answer + a simple reachability check. A clean alternative to phrase alongside the Dijkstra solution.",
          rcs:
            "class Solution:\n" +
            "    def swimInWater(self, grid: List[List[int]]) -> int:\n" +
            "        n = len(grid)\n" +
            "        def canReach(t):                          # can we reach the end if water level == t?\n" +
            "            if grid[0][0] > t:                    # can't even start\n" +
            "                return False\n" +
            "            visited = {(0, 0)}\n" +
            "            stack = [(0, 0)]\n" +
            "            while stack:                          # plain DFS over cells with elevation <= t\n" +
            "                r, c = stack.pop()\n" +
            "                if r == n - 1 and c == n - 1:\n" +
            "                    return True\n" +
            "                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in visited and grid[nr][nc] <= t:\n" +
            "                        visited.add((nr, nc))\n" +
            "                        stack.append((nr, nc))\n" +
            "            return False\n" +
            "        lo, hi = grid[0][0], n * n - 1            # answer lies in this elevation range\n" +
            "        while lo < hi:                            # find the smallest feasible t\n" +
            "            mid = (lo + hi) // 2\n" +
            "            if canReach(mid):\n" +
            "                hi = mid                          # feasible -> try smaller\n" +
            "            else:\n" +
            "                lo = mid + 1                      # infeasible -> need larger\n" +
            "        return lo",
          plain:
            "class Solution:\n" +
            "    def swimInWater(self, grid: List[List[int]]) -> int:\n" +
            "        n = len(grid)\n" +
            "        def canReach(t):\n" +
            "            if grid[0][0] > t:\n" +
            "                return False\n" +
            "            visited = {(0, 0)}\n" +
            "            stack = [(0, 0)]\n" +
            "            while stack:\n" +
            "                r, c = stack.pop()\n" +
            "                if r == n - 1 and c == n - 1:\n" +
            "                    return True\n" +
            "                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in visited and grid[nr][nc] <= t:\n" +
            "                        visited.add((nr, nc))\n" +
            "                        stack.append((nr, nc))\n" +
            "            return False\n" +
            "        lo, hi = grid[0][0], n * n - 1\n" +
            "        while lo < hi:\n" +
            "            mid = (lo + hi) // 2\n" +
            "            if canReach(mid):\n" +
            "                hi = mid\n" +
            "            else:\n" +
            "                lo = mid + 1\n" +
            "        return lo"
        }
      ],
      patternRecognition: [
        "Path cost is the MAX weight along the route, not the sum → minimax path → Dijkstra carrying max.",
        "'Smallest threshold t that makes the end reachable' with monotonic feasibility → binary search + DFS/BFS.",
        "Grid + '4-directional movement gated by a rising value' is the tell."
      ],
      interviewRecall: [
        "Heap key = running max elevation; neighbor cost = max(t, grid[nr][nc]); first pop of the corner is the answer.",
        "Binary search variant: canReach(t) via flood fill over cells <= t; use hi = mid on success.",
        "Seed with the start cell's own elevation; both approaches are O(n^2 log n)."
      ]
    },

    {
      id: "cheapest-flights-within-k-stops",
      lc: 787,
      title: "Cheapest Flights Within K Stops",
      difficulty: "Medium",
      category: "Advanced Graphs",
      link: "https://leetcode.com/problems/cheapest-flights-within-k-stops/",
      meta: { pattern: "Shortest Path with a Hop Limit", dataStructure: "Distance array / Queue", technique: "Bellman-Ford (or BFS by levels)" },
      description:
        "There are `n` cities connected by `flights`, where `flights[i] = [from, to, price]` is a directed flight. Given `src`, `dst`, and an integer `k`, return the **cheapest price** to fly from `src` to `dst` using **at most `k` stops** (so at most `k + 1` flights).\n\n" +
        "If there is no such route within the stop limit, return `-1`.",
      constraints: [
        "`1 <= n <= 100`",
        "`0 <= flights.length <= (n * (n - 1) / 2)`",
        "`flights[i] = [from, to, price]`, `0 <= from, to < n`, `from != to`, `1 <= price <= 10^4`",
        "No duplicate directed edges; `0 <= src, dst, k < n` and `src != dst`."
      ],
      notes: [
        "`k` stops means `k + 1` edges — a direct flight is 0 stops.",
        "The hop limit is what makes plain Dijkstra unsafe: the cheapest route overall may exceed the stop budget.",
        "Bellman-Ford relaxed exactly `k + 1` times naturally bounds the number of edges used."
      ],
      examples: [
        {
          input: "n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src = 0, dst = 3, k = 1",
          output: "700",
          reasoning: "0->1->3 costs 700 with 1 stop. The cheaper 0->1->2->3 = 400 uses 2 stops, exceeding k=1.",
          visual:
            "```\n0 --100--> 1 --600--> 3        (1 stop, cost 700)  <= allowed\n0 --100--> 1 --100--> 2 --200--> 3  (2 stops, 400)  X too many stops\nanswer = 700\n```"
        },
        {
          input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1",
          output: "200",
          reasoning: "0->1->2 = 200 uses 1 stop (allowed) and beats the direct 0->2 = 500."
        },
        {
          input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0",
          output: "500",
          reasoning: "With 0 stops only the direct flight 0->2 = 500 qualifies."
        }
      ],
      approaches: [
        {
          name: "Bellman-Ford relaxed k+1 times (snapshot per round)",
          time: "O(k * E)",
          space: "O(n)",
          whenToUse: "Shortest path with a hard limit on the number of edges/stops; also handles this cleanly even with cycles.",
          logic:
            "**What it asks.** Find the minimum total price from `src` to `dst` using **at most `k + 1` flights** (`k` stops); return `-1` if unreachable within that budget.\n\n" +
            "**Why the naive idea fails.** Plain Dijkstra minimizes cost ignoring hops, so it can lock in a cheap-but-too-many-stops route and miss a pricier one that respects the limit. Enumerating all bounded paths is exponential. We need an approach whose work is naturally parameterized by the number of edges.\n\n" +
            "**Key Idea.** Bellman-Ford relaxes **all edges** once per round; after `i` rounds, `prices[v]` is the cheapest cost to reach `v` using **at most `i` edges**. So running exactly `k + 1` rounds gives the cheapest cost within `k` stops. **Nodes** are cities; **edges** are flights; there is no 'visited' set — instead each round extends every shortest path by one more edge. The crucial detail: within a round we must read distances from a **snapshot** of the previous round.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `prices = [INF] * n`, `prices[src] = 0`.\n" +
            "2. Repeat `k + 1` times: copy `prices` into a fresh `temp`.\n" +
            "3. For every flight `(u, v, w)`, if `prices[u]` is finite and `prices[u] + w < temp[v]`, set `temp[v] = prices[u] + w`.\n" +
            "4. After processing all edges, set `prices = temp` (commit the round).\n" +
            "5. Return `prices[dst]` if finite, else `-1`.\n\n" +
            "**Why it works — the snapshot.** Reading from last round's `prices` but writing into `temp` guarantees that each round adds **at most one edge** to any path. If we relaxed in place on a single array, a value updated earlier in the same round could be used again later in that same round, chaining two (or more) edges in one pass and silently exceeding the stop budget. The temp array 'freezes' the previous round so no edge is used twice within one round — that's exactly what enforces the `k`-stop limit.\n\n" +
            "**Common Gotchas.**\n" +
            "- Run `k + 1` rounds (edges), not `k` — `k` stops allow `k + 1` flights.\n" +
            "- Relax from the **snapshot** (`prices[u]`) into the copy (`temp[v]`); relaxing in place breaks the hop count.\n" +
            "- Guard `prices[u] != INF` so you don't propagate from unreached cities.\n\n" +
            "**Complexity.** `k + 1` rounds over `E` edges: time `O(k * E)`; space `O(n)` for the two distance arrays.\n\n" +
            "**Interview mindset.** 'Shortest path but with a cap on edges/stops' is the classic Bellman-Ford cue. Say the words 'relax k+1 times' and 'use a temp copy so an edge isn't reused within a round' — that's the whole insight interviewers look for.",
          rcs:
            "class Solution:\n" +
            "    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:\n" +
            "        INF = float('inf')\n" +
            "        prices = [INF] * n                        # cheapest known cost to each city\n" +
            "        prices[src] = 0\n" +
            "        for _ in range(k + 1):                    # at most k stops == k+1 edges/rounds\n" +
            "            temp = prices[:]                       # snapshot: read from last round only\n" +
            "            for u, v, w in flights:               # relax every edge once this round\n" +
            "                if prices[u] != INF and prices[u] + w < temp[v]:\n" +
            "                    temp[v] = prices[u] + w        # write into the fresh copy, not prices\n" +
            "            prices = temp                          # commit this round's results\n" +
            "        return prices[dst] if prices[dst] != INF else -1",
          plain:
            "class Solution:\n" +
            "    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:\n" +
            "        INF = float('inf')\n" +
            "        prices = [INF] * n\n" +
            "        prices[src] = 0\n" +
            "        for _ in range(k + 1):\n" +
            "            temp = prices[:]\n" +
            "            for u, v, w in flights:\n" +
            "                if prices[u] != INF and prices[u] + w < temp[v]:\n" +
            "                    temp[v] = prices[u] + w\n" +
            "            prices = temp\n" +
            "        return prices[dst] if prices[dst] != INF else -1"
        },
        {
          name: "BFS level by level (bounded by stops)",
          time: "O(k * E)",
          space: "O(n + E)",
          whenToUse: "Same hop-limited shortest path, framed as expanding the frontier one stop at a time.",
          logic:
            "**What it asks.** Same problem: cheapest `src -> dst` within `k` stops.\n\n" +
            "**Why the naive idea fails.** As above, cost-only search ignores the hop cap. Framing the search by **levels** (one level = one more stop) makes the hop budget explicit and easy to enforce.\n\n" +
            "**Key Idea.** Do a BFS where each **level** corresponds to taking one more flight. **Nodes** are cities, **edges** are flights; a `best[]` array tracks the cheapest cost found so far to each city and prunes non-improving expansions. Process the queue in level batches; after `k + 1` levels we've allowed `k + 1` flights (`k` stops) and stop.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build adjacency `graph[u] -> [(v, w), ...]`; init `best = [INF]*n`, `best[src] = 0`.\n" +
            "2. Queue starts with `(src, 0)` = (city, cost so far); set `stops = 0`.\n" +
            "3. While the queue is non-empty and `stops <= k`, process exactly the current level's entries (snapshot `len(queue)`).\n" +
            "4. For each `(node, cost)`, relax neighbors: if `cost + w < best[nei]`, update `best[nei]` and enqueue `(nei, cost + w)`.\n" +
            "5. Increment `stops` after each level. Return `best[dst]` if finite, else `-1`.\n\n" +
            "**Why it works.** Bounding the loop to `k + 1` levels caps the number of edges any counted path uses, exactly like Bellman-Ford's rounds. Processing a fixed batch per level (`for _ in range(len(queue))`) keeps stops synchronized with levels, so no route beyond the budget is ever committed. The `best[]` pruning avoids re-expanding strictly worse partial paths.\n\n" +
            "**Common Gotchas.**\n" +
            "- Snapshot the level size (`len(queue)`) before the inner loop, or new enqueues bleed into the same level and miscount stops.\n" +
            "- Loop `k + 1` levels (`stops <= k`), matching `k` stops = `k + 1` flights.\n" +
            "- Keep expanding a node even after it has a value, since a longer-but-cheaper path may arrive at a later level.\n\n" +
            "**Complexity.** Each level scans at most every edge once across `k + 1` levels: time `O(k * E)`; space `O(n + E)` for the graph, queue, and `best` array.\n\n" +
            "**Interview mindset.** If Bellman-Ford's 'rounds' feel abstract, the level-BFS phrasing — 'one BFS level = one stop, stop after k+1 levels' — is the same bound made concrete.",
          rcs:
            "from collections import defaultdict, deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:\n" +
            "        graph = defaultdict(list)                 # u -> list of (v, price)\n" +
            "        for u, v, w in flights:\n" +
            "            graph[u].append((v, w))\n" +
            "        INF = float('inf')\n" +
            "        best = [INF] * n                          # cheapest cost reaching each city so far\n" +
            "        best[src] = 0\n" +
            "        queue = deque([(src, 0)])                 # (city, cost) frontier\n" +
            "        stops = 0\n" +
            "        while queue and stops <= k:               # expand one extra hop per level\n" +
            "            for _ in range(len(queue)):           # process exactly this level's nodes\n" +
            "                node, cost = queue.popleft()\n" +
            "                for nei, w in graph[node]:\n" +
            "                    if cost + w < best[nei]:       # only enqueue genuine improvements\n" +
            "                        best[nei] = cost + w\n" +
            "                        queue.append((nei, cost + w))\n" +
            "            stops += 1\n" +
            "        return best[dst] if best[dst] != INF else -1",
          plain:
            "from collections import defaultdict, deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:\n" +
            "        graph = defaultdict(list)\n" +
            "        for u, v, w in flights:\n" +
            "            graph[u].append((v, w))\n" +
            "        INF = float('inf')\n" +
            "        best = [INF] * n\n" +
            "        best[src] = 0\n" +
            "        queue = deque([(src, 0)])\n" +
            "        stops = 0\n" +
            "        while queue and stops <= k:\n" +
            "            for _ in range(len(queue)):\n" +
            "                node, cost = queue.popleft()\n" +
            "                for nei, w in graph[node]:\n" +
            "                    if cost + w < best[nei]:\n" +
            "                        best[nei] = cost + w\n" +
            "                        queue.append((nei, cost + w))\n" +
            "            stops += 1\n" +
            "        return best[dst] if best[dst] != INF else -1"
        }
      ],
      patternRecognition: [
        "'Shortest / cheapest path with at most K edges or stops' → Bellman-Ford relaxed k+1 times.",
        "The hop limit is why plain Dijkstra is unsafe here.",
        "Level-by-level BFS (one level = one stop) is the same bound expressed differently."
      ],
      interviewRecall: [
        "k stops = k+1 edges → run k+1 relaxation rounds.",
        "Use a temp/snapshot copy each round so an edge can't be reused within the same round (that's what enforces the stop limit).",
        "Return prices[dst] if finite else -1."
      ]
    }
  ]);
})();
