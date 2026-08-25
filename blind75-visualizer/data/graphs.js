/*
 * Blind 75 — Graphs
 * =========================================================================
 * Registers the Graphs category on the global registry. Format mirrors the
 * gold-standard exemplar in arrays_hashing.js (see that file for the full
 * problem schema documentation).
 *
 * Focus of this file: MODELING. For every problem the logic states what the
 * NODES are, what the EDGES are, what we are visiting/finding, WHY a given
 * traversal (BFS / DFS / topological sort / Union-Find) fits, and what the
 * `visited` structure represents.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Graphs", [
    {
      id: "clone-graph",
      lc: 133,
      title: "Clone Graph",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/clone-graph/",
      meta: { pattern: "Graph Traversal + Hash Map", dataStructure: "Adjacency (Node.neighbors)", technique: "DFS/BFS with clone map" },
      description:
        "You are given a reference to a node in a **connected, undirected** graph. Return a **deep copy** (clone) of the entire graph.\n\n" +
        "Each node is an object of class `Node` with an integer `val` and a list `neighbors` of adjacent `Node`s. Assume `Node` is defined as `val` plus `neighbors` (a `List[Node]`).\n\n" +
        "The clone must be a brand-new set of nodes: every node and every edge duplicated, with **no** references shared with the original graph. If the input is `null`, return `null`.",
      constraints: [
        "The number of nodes is in the range `[0, 100]`.",
        "`1 <= Node.val <= 100` and `Node.val` is **unique** for each node.",
        "The graph is connected and undirected; there are no repeated edges and no self-loops.",
        "You are given the reference to the first node (or `null` for an empty graph)."
      ],
      notes: [
        "Because `val` is unique you may key your clone map by `val`, but keying by the node object itself is cleaner and always safe.",
        "Undirected means every edge appears in both endpoints' neighbor lists — the clone must preserve that symmetry.",
        "The graph can contain cycles, so you MUST remember which nodes are already cloned or you will loop forever."
      ],
      examples: [
        {
          input: "adjList = [[2,4],[1,3],[2,4],[1,3]]",
          output: "[[2,4],[1,3],[2,4],[1,3]]",
          reasoning: "A 4-node square: 1-2-3-4-1. The clone has the same shape with all-new node objects.",
          visual:
            "```\n   1 --- 2\n   |     |\n   4 --- 3\n\nnode 1.neighbors = [2, 4]\nnode 2.neighbors = [1, 3]\nnode 3.neighbors = [2, 4]\nnode 4.neighbors = [1, 3]\n```"
        },
        {
          input: "adjList = [[]]",
          output: "[[]]",
          reasoning: "A single node with no neighbors. Clone is one new node with an empty neighbor list."
        },
        {
          input: "adjList = []",
          output: "[]",
          reasoning: "Empty graph — the input node is null, so return null."
        },
        {
          input: "adjList = [[2],[1]]",
          output: "[[2],[1]]",
          reasoning: "Two nodes joined by one undirected edge; edge appears in both neighbor lists."
        }
      ],
      approaches: [
        {
          name: "DFS + clone map",
          time: "O(V + E)",
          space: "O(V)",
          whenToUse: "Cleanest recursive solution; the default answer when copying a graph with possible cycles.",
          logic:
            "**A. Asked.** Produce an independent deep copy of an undirected graph: new nodes, new edges, nothing shared with the original.\n\n" +
            "**Modeling.** The **nodes** are the `Node` objects; the **edges** are the entries in each node's `neighbors` list (each undirected edge is stored on both endpoints). We are *visiting every node once* and, as we go, rebuilding each node and re-wiring its neighbor list to point at the clones.\n\n" +
            "**B. The trap.** The graph can contain cycles (node 1 points to 2, node 2 points back to 1). If you naively recurse into neighbors you will bounce 1\u21922\u21921\u21922\u2026 forever. You also must not create two different copies of the same original node.\n\n" +
            "**D. Key observation.** Both problems are solved by one memo: a hash map `old -> new` that records, for each original node, its unique clone. Before recursing into a node, check the map. If the clone exists, return it (this both prevents infinite loops AND guarantees a single copy per node).\n\n" +
            "**E. Why DFS fits.** Cloning a node requires cloning all of its neighbors, which is naturally recursive: clone me, then for each neighbor clone it (or fetch its existing clone) and attach. The `visited` structure here IS the clone map \u2014 a node counts as visited the moment its clone is placed in the map.\n\n" +
            "**G/H. What the map holds.** `clones[original_node] = cloned_node`. Presence in the map means 'already cloned', so it doubles as the visited set.\n\n" +
            "**I. Step by step.** For the current node: if it is in `clones`, return `clones[node]`. Otherwise create its clone (copy `val`), register it in `clones` *before* recursing (so cycles resolve), then for each neighbor append `dfs(neighbor)` to the clone's neighbor list. Return the clone.\n\n" +
            "**J. Why correct.** Registering the clone before descending means any cycle that leads back to this node finds the finished (or in-progress) clone in the map instead of recreating it, so edges are wired exactly once in each direction.\n\n" +
            "**K/L. Complexity.** Every node and every edge is processed a constant number of times \u2192 time `O(V + E)`; the recursion stack and the map are `O(V)`.",
          rcs:
            "class Solution:\n" +
            "    def cloneGraph(self, node: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        clones = {}                          # Maps original node -> its clone (also the visited set).\n" +
            "\n" +
            "        def dfs(cur):\n" +
            "            if cur in clones:                # Already cloned -> return existing copy (handles cycles).\n" +
            "                return clones[cur]\n" +
            "            copy = Node(cur.val)             # Make the new node with the same value.\n" +
            "            clones[cur] = copy               # Register BEFORE recursing so cycles resolve.\n" +
            "            for nei in cur.neighbors:        # Rebuild edges to point at clones.\n" +
            "                copy.neighbors.append(dfs(nei))\n" +
            "            return copy\n" +
            "\n" +
            "        return dfs(node) if node else None   # Empty graph -> None.",
          plain:
            "class Solution:\n" +
            "    def cloneGraph(self, node: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        clones = {}\n" +
            "\n" +
            "        def dfs(cur):\n" +
            "            if cur in clones:\n" +
            "                return clones[cur]\n" +
            "            copy = Node(cur.val)\n" +
            "            clones[cur] = copy\n" +
            "            for nei in cur.neighbors:\n" +
            "                copy.neighbors.append(dfs(nei))\n" +
            "            return copy\n" +
            "\n" +
            "        return dfs(node) if node else None"
        },
        {
          name: "BFS + clone map (queue)",
          time: "O(V + E)",
          space: "O(V)",
          whenToUse: "When you want to avoid deep recursion (large graphs / recursion-limit worries) or simply prefer an iterative traversal.",
          logic:
            "**Same modeling, iterative traversal.** Nodes are `Node` objects, edges are neighbor-list entries. We still keep the `old -> new` clone map that doubles as the visited set, but we expand the graph level by level with a queue instead of the call stack.\n\n" +
            "**D. Key idea.** Create the clone of the start node first and seed both the map and the queue with it. Then repeatedly pop an original node, and for each of its neighbors: if the neighbor has no clone yet, create one and enqueue it; either way, append the neighbor's clone to the current node's clone neighbor list.\n\n" +
            "**F. Why the queue never double-visits.** A node is enqueued only at the moment its clone is first created and inserted into the map. The `if neighbor not in clones` guard is exactly the visited check, so each node is enqueued once and each edge is wired once per direction.\n\n" +
            "**I. Step by step.** Seed `clones[node] = Node(node.val)` and `queue = [node]`. While the queue is non-empty, pop `cur`; for each `nei` in `cur.neighbors`, clone it if unseen (and enqueue), then link `clones[cur].neighbors.append(clones[nei])`.\n\n" +
            "**K/L. Complexity.** `O(V + E)` time, `O(V)` for the map and queue \u2014 identical asymptotics to DFS, just no recursion depth.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def cloneGraph(self, node: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not node:\n" +
            "            return None\n" +
            "        clones = {node: Node(node.val)}      # Clone the start node up front; map = visited set.\n" +
            "        queue = deque([node])                # BFS frontier of ORIGINAL nodes to expand.\n" +
            "        while queue:\n" +
            "            cur = queue.popleft()\n" +
            "            for nei in cur.neighbors:        # Look at every neighbor of the current node.\n" +
            "                if nei not in clones:        # First time seeing this neighbor?\n" +
            "                    clones[nei] = Node(nei.val)  # Clone it and...\n" +
            "                    queue.append(nei)        # ...schedule it for expansion.\n" +
            "                clones[cur].neighbors.append(clones[nei])  # Wire the cloned edge.\n" +
            "        return clones[node]                  # Return the clone of the entry node.",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def cloneGraph(self, node: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not node:\n" +
            "            return None\n" +
            "        clones = {node: Node(node.val)}\n" +
            "        queue = deque([node])\n" +
            "        while queue:\n" +
            "            cur = queue.popleft()\n" +
            "            for nei in cur.neighbors:\n" +
            "                if nei not in clones:\n" +
            "                    clones[nei] = Node(nei.val)\n" +
            "                    queue.append(nei)\n" +
            "                clones[cur].neighbors.append(clones[nei])\n" +
            "        return clones[node]"
        }
      ],
      patternRecognition: [
        "'Deep copy / clone a graph' — the signal is a hash map from original node to clone.",
        "Any graph traversal where cycles are possible needs a visited/memo structure to terminate.",
        "The clone map serves double duty: it prevents infinite loops AND guarantees one copy per node."
      ],
      interviewRecall: [
        "Register the clone in the map BEFORE recursing into neighbors — that is what breaks cycles.",
        "Undirected edges are stored on both endpoints; wiring each neighbor once per direction reproduces them.",
        "DFS uses the call stack, BFS uses a queue — both keep the same old->new map. Handle the null input first."
      ]
    },

    {
      id: "course-schedule",
      lc: 207,
      title: "Course Schedule",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/course-schedule/",
      meta: { pattern: "Cycle Detection / Topological Sort", dataStructure: "Directed adjacency list", technique: "Kahn BFS or DFS coloring" },
      description:
        "There are `numCourses` courses labeled `0` to `numCourses - 1`. You are given `prerequisites`, where `prerequisites[i] = [a, b]` means you **must take course `b` before course `a`**.\n\n" +
        "Return `true` if it is possible to finish **all** courses, and `false` otherwise.",
      constraints: [
        "`1 <= numCourses <= 2000`",
        "`0 <= prerequisites.length <= 5000`",
        "`prerequisites[i].length == 2`",
        "`0 <= a, b < numCourses`",
        "All prerequisite pairs `[a, b]` are distinct."
      ],
      notes: [
        "You can finish all courses **iff** the prerequisite graph has **no cycle** (a cycle means a course transitively requires itself).",
        "The graph may be disconnected and may contain nodes with no edges at all.",
        "`[a, b]` is a directed edge b -> a (take b, which unlocks a)."
      ],
      examples: [
        {
          input: "numCourses = 2, prerequisites = [[1,0]]",
          output: "true",
          reasoning: "Take course 0, then course 1. No cycle.",
          visual: "```\n0 --> 1     (take 0 before 1)\nno cycle => finishable\n```"
        },
        {
          input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
          output: "false",
          reasoning: "0 requires 1 and 1 requires 0 — a 2-cycle, so neither can ever start.",
          visual: "```\n0 --> 1\n^     |\n|_____|\ncycle 0->1->0 => impossible\n```"
        },
        {
          input: "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
          output: "true",
          reasoning: "A valid order is 0, 1, 2, 3 (a diamond, acyclic)."
        },
        {
          input: "numCourses = 3, prerequisites = [[0,1],[1,2],[2,0]]",
          output: "false",
          reasoning: "0->? ... the three edges form a cycle 0->1->2->0 (reading edges as b->a), so it is unfinishable."
        }
      ],
      approaches: [
        {
          name: "Kahn's Algorithm (BFS topological sort by indegree)",
          time: "O(V + E)",
          space: "O(V + E)",
          whenToUse: "The clean, iterative way to detect a cycle and (bonus) produce a valid ordering; no recursion depth risk.",
          logic:
            "**Modeling.** **Nodes** are courses `0..numCourses-1`. Each pair `[a, b]` is a directed **edge `b -> a`** ('b unlocks a'). Finishing all courses is possible exactly when this directed graph is a **DAG** (no cycle). We are *finding whether every node can be removed in dependency order*.\n\n" +
            "**D. Key idea (indegree).** A course can be taken once all its prerequisites are done. In graph terms, a node is ready when its **indegree** (number of incoming edges = unmet prerequisites) drops to 0. Kahn's algorithm repeatedly takes ready nodes and removes their outgoing edges, which may free up more nodes.\n\n" +
            "**E. Why it detects cycles.** If we can process all `numCourses` nodes this way, the graph is acyclic and everything is finishable. If we get stuck with nodes still unprocessed (all remaining have indegree \u2265 1), those nodes sit in a cycle where each waits on another \u2014 return `false`.\n\n" +
            "**G/H. What we track.** `indegree[c]` = count of unmet prerequisites for course `c`; the **queue** holds courses currently ready (indegree 0). A `processed` counter is our 'visited' measure \u2014 how many courses we managed to schedule.\n\n" +
            "**I. Step by step.** Build the adjacency list `graph[b].append(a)` and the indegree array. Enqueue every course with indegree 0. Pop a course, increment `processed`, and for each course it unlocks decrement that course's indegree; if it hits 0, enqueue it. At the end return `processed == numCourses`.\n\n" +
            "**J. Why correct.** Each edge is relaxed exactly once (when its source is processed). A node reaches indegree 0 iff all its prerequisites were scheduled before it, so any node never reaching 0 is trapped in a cycle.\n\n" +
            "**K/L. Complexity.** Build + traversal touch every node and edge once \u2192 `O(V + E)` time and space.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n" +
            "        graph = [[] for _ in range(numCourses)]   # graph[b] = courses that b unlocks.\n" +
            "        indegree = [0] * numCourses               # indegree[c] = unmet prerequisites of c.\n" +
            "        for a, b in prerequisites:                # 'b before a' => directed edge b -> a.\n" +
            "            graph[b].append(a)\n" +
            "            indegree[a] += 1\n" +
            "        queue = deque(c for c in range(numCourses) if indegree[c] == 0)  # Ready with no prereqs.\n" +
            "        processed = 0                             # How many courses we've scheduled.\n" +
            "        while queue:\n" +
            "            course = queue.popleft()\n" +
            "            processed += 1                        # This course is now 'taken'.\n" +
            "            for nxt in graph[course]:             # Every course this one unlocks...\n" +
            "                indegree[nxt] -= 1                # ...loses one unmet prerequisite.\n" +
            "                if indegree[nxt] == 0:            # All prereqs met -> it is ready.\n" +
            "                    queue.append(nxt)\n" +
            "        return processed == numCourses            # All scheduled => acyclic => finishable.",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n" +
            "        graph = [[] for _ in range(numCourses)]\n" +
            "        indegree = [0] * numCourses\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "            indegree[a] += 1\n" +
            "        queue = deque(c for c in range(numCourses) if indegree[c] == 0)\n" +
            "        processed = 0\n" +
            "        while queue:\n" +
            "            course = queue.popleft()\n" +
            "            processed += 1\n" +
            "            for nxt in graph[course]:\n" +
            "                indegree[nxt] -= 1\n" +
            "                if indegree[nxt] == 0:\n" +
            "                    queue.append(nxt)\n" +
            "        return processed == numCourses"
        },
        {
          name: "DFS three-color cycle detection",
          time: "O(V + E)",
          space: "O(V + E)",
          whenToUse: "When you think in DFS or need to reuse the recursion to also emit an order; classic 'detect a cycle in a directed graph'.",
          logic:
            "**Modeling.** Same directed graph (nodes = courses, edge `b -> a` per `[a, b]`). Here 'finishable' = 'no back edge exists in a DFS'. We *find a cycle by coloring nodes during a depth-first walk*.\n\n" +
            "**D. The three states.** Each node is colored: **0 = unvisited**, **1 = in the current DFS path (visiting)**, **2 = fully done (safe)**. The `visited`/color array IS the memory of the traversal. A cycle exists precisely when DFS reaches a node currently colored 1 \u2014 that is a *back edge* pointing to an ancestor on the active path.\n\n" +
            "**F. Why the two 'visited' meanings differ.** Color 1 means 'on the stack right now' (finding it again = cycle). Color 2 means 'explored and proven acyclic below' \u2014 revisiting it is fine and we can short-circuit, which is what keeps the algorithm `O(V + E)` instead of exponential.\n\n" +
            "**I. Step by step.** For each course not yet done, run `dfs`. In `dfs(c)`: if `color[c] == 1` return `False` (cycle); if `color[c] == 2` return `True` (already cleared). Mark `color[c] = 1`, recurse into all neighbors (any `False` propagates up), then mark `color[c] = 2` and return `True`.\n\n" +
            "**J. Why correct.** A directed graph has a cycle iff a DFS finds a back edge to a gray (color-1) ancestor. Marking nodes black (color 2) after exploring guarantees each node/edge is examined once.\n\n" +
            "**K/L. Complexity.** Each node colored a constant number of times, each edge followed once \u2192 `O(V + E)` time; recursion + arrays `O(V + E)`.",
          rcs:
            "class Solution:\n" +
            "    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n" +
            "        graph = [[] for _ in range(numCourses)]   # graph[b] = courses b unlocks.\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "        color = [0] * numCourses                  # 0=unvisited, 1=on current path, 2=done.\n" +
            "\n" +
            "        def dfs(c):\n" +
            "            if color[c] == 1:                     # Back edge to a node on the active path => cycle.\n" +
            "                return False\n" +
            "            if color[c] == 2:                     # Already fully explored and safe.\n" +
            "                return True\n" +
            "            color[c] = 1                          # Mark as 'currently visiting'.\n" +
            "            for nxt in graph[c]:\n" +
            "                if not dfs(nxt):                  # A cycle found deeper propagates up.\n" +
            "                    return False\n" +
            "            color[c] = 2                          # Done: this node leads to no cycle.\n" +
            "            return True\n" +
            "\n" +
            "        for c in range(numCourses):               # Graph may be disconnected: start everywhere.\n" +
            "            if not dfs(c):\n" +
            "                return False\n" +
            "        return True",
          plain:
            "class Solution:\n" +
            "    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n" +
            "        graph = [[] for _ in range(numCourses)]\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "        color = [0] * numCourses\n" +
            "\n" +
            "        def dfs(c):\n" +
            "            if color[c] == 1:\n" +
            "                return False\n" +
            "            if color[c] == 2:\n" +
            "                return True\n" +
            "            color[c] = 1\n" +
            "            for nxt in graph[c]:\n" +
            "                if not dfs(nxt):\n" +
            "                    return False\n" +
            "            color[c] = 2\n" +
            "            return True\n" +
            "\n" +
            "        for c in range(numCourses):\n" +
            "            if not dfs(c):\n" +
            "                return False\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'Is there a valid order given dependencies?' or 'can all tasks finish?' => cycle detection on a directed graph.",
        "Prerequisites / build order / task scheduling => topological sort (Kahn's indegree BFS or DFS coloring).",
        "Direction matters: '[a,b] = b before a' is the edge b -> a. Draw it before coding."
      ],
      interviewRecall: [
        "Finishable == acyclic. Kahn: process indegree-0 nodes; if you can't process all, there's a cycle.",
        "DFS coloring: gray (on path) revisited => cycle; black (done) => safe to skip.",
        "Build the adjacency list carefully — flipping the edge direction is the #1 bug here."
      ]
    },

    {
      id: "pacific-atlantic-water-flow",
      lc: 417,
      title: "Pacific Atlantic Water Flow",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/pacific-atlantic-water-flow/",
      meta: { pattern: "Multi-source DFS/BFS from borders", dataStructure: "Grid as implicit graph", technique: "Reverse flow + set intersection" },
      description:
        "You are given an `m x n` integer matrix `heights` representing the height of each cell on an island. The **Pacific Ocean** touches the island's **top and left** edges; the **Atlantic Ocean** touches the **bottom and right** edges.\n\n" +
        "Water flows from a cell to a neighboring cell (up/down/left/right) only if the neighbor's height is **less than or equal to** the current cell's height. Water can flow from any border cell into its adjacent ocean.\n\n" +
        "Return a list of coordinates `[r, c]` for every cell from which water can reach **both** the Pacific and the Atlantic oceans.",
      constraints: [
        "`m == heights.length`, `n == heights[0].length`",
        "`1 <= m, n <= 200`",
        "`0 <= heights[r][c] <= 10^5`"
      ],
      notes: [
        "A cell can always 'reach' an ocean it is on the border of.",
        "Flow is by `<=`, so equal-height neighbors pass water in both directions.",
        "The answer can be returned in any order."
      ],
      examples: [
        {
          input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
          output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
          reasoning: "These cells can drain to both oceans. Corners [0,4] (touches top=Pacific and right=Atlantic) and [4,0] (touches bottom=Atlantic and left=Pacific) always qualify.",
          visual:
            "```\n Pacific ~ ~ ~ ~ ~\n~  1  2  2  3  5\n~  3  2  3  4  4\n~  2  4  5  3  1\n~  6  7  1  4  5\n~  5  1  1  2  4  Atlantic\n     ~ ~ ~ ~ ~\ntop+left = Pacific, bottom+right = Atlantic\n```"
        },
        {
          input: "heights = [[1]]",
          output: "[[0]]",
          reasoning: "A single cell borders all four edges, so it touches both oceans."
        },
        {
          input: "heights = [[2,1],[1,2]]",
          output: "[[0,0],[0,1],[1,0],[1,1]]",
          reasoning: "Every cell is on a border touching both oceans in this tiny grid."
        }
      ],
      approaches: [
        {
          name: "Brute Force — search from every cell",
          time: "O((m*n)^2)",
          space: "O(m*n)",
          whenToUse: "Only to state the naive idea; too slow for a 200x200 grid but clarifies what 'reachable' means.",
          logic:
            "**Modeling.** The grid is an implicit graph: **nodes** are cells `(r, c)`; a directed **edge** goes from cell X to neighbor Y when `heights[Y] <= heights[X]` (water can move X -> Y). We want cells that can reach *both* ocean border sets.\n\n" +
            "**B. Naive idea.** For every cell, run a DFS/BFS following the downhill (\u2264) edges and see whether it touches a top/left border (Pacific) and separately a bottom/right border (Atlantic). Collect cells that reach both.\n\n" +
            "**C. Why it is slow.** Each of the `m*n` cells launches its own traversal that can visit up to `m*n` cells \u2192 `O((m*n)^2)`. For 200x200 = 40,000 cells this is 1.6 billion steps \u2014 too slow.",
          rcs:
            "class Solution:\n" +
            "    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n" +
            "        m, n = len(heights), len(heights[0])\n" +
            "\n" +
            "        def can_reach(sr, sc):               # From (sr,sc), which oceans are reachable downhill?\n" +
            "            seen = set()\n" +
            "            stack = [(sr, sc)]\n" +
            "            pacific = atlantic = False\n" +
            "            while stack:\n" +
            "                r, c = stack.pop()\n" +
            "                if (r, c) in seen:\n" +
            "                    continue\n" +
            "                seen.add((r, c))\n" +
            "                if r == 0 or c == 0:         # Top or left edge => Pacific.\n" +
            "                    pacific = True\n" +
            "                if r == m - 1 or c == n - 1: # Bottom or right edge => Atlantic.\n" +
            "                    atlantic = True\n" +
            "                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < m and 0 <= nc < n and heights[nr][nc] <= heights[r][c]:\n" +
            "                        stack.append((nr, nc))  # Water flows to lower-or-equal neighbor.\n" +
            "            return pacific and atlantic\n" +
            "\n" +
            "        return [[r, c] for r in range(m) for c in range(n) if can_reach(r, c)]",
          plain:
            "class Solution:\n" +
            "    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n" +
            "        m, n = len(heights), len(heights[0])\n" +
            "\n" +
            "        def can_reach(sr, sc):\n" +
            "            seen = set()\n" +
            "            stack = [(sr, sc)]\n" +
            "            pacific = atlantic = False\n" +
            "            while stack:\n" +
            "                r, c = stack.pop()\n" +
            "                if (r, c) in seen:\n" +
            "                    continue\n" +
            "                seen.add((r, c))\n" +
            "                if r == 0 or c == 0:\n" +
            "                    pacific = True\n" +
            "                if r == m - 1 or c == n - 1:\n" +
            "                    atlantic = True\n" +
            "                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < m and 0 <= nc < n and heights[nr][nc] <= heights[r][c]:\n" +
            "                        stack.append((nr, nc))\n" +
            "            return pacific and atlantic\n" +
            "\n" +
            "        return [[r, c] for r in range(m) for c in range(n) if can_reach(r, c)]"
        },
        {
          name: "Optimized — Reverse DFS from each ocean's border",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "The expected solution: whenever many sources must reach a target set, flip the search and flood from the target.",
          logic:
            "**D. Key reversal.** Instead of asking 'from each cell, can water flow DOWN to an ocean?', ask the reverse: 'starting AT an ocean's border, which cells can water climb UP from?'. Reverse the edge condition: from a border we move to a neighbor whose height is `>=` the current cell (water could have flowed the other way). Every cell we reach this way can drain into that ocean.\n\n" +
            "**E. Multi-source flood.** Run one traversal seeded with *all* Pacific border cells at once (top row + left column), marking every cell reachable \u2192 set `pac`. Run another seeded with all Atlantic border cells (bottom row + right column) \u2192 set `atl`. The answer is the **intersection** `pac \u2229 atl`.\n\n" +
            "**G/H. What visited means.** `pac` is the set of cells that can reach the Pacific; `atl` the set that can reach the Atlantic. Each set is its own visited marker for its flood, preventing re-processing.\n\n" +
            "**F. Why this is `O(m*n)`.** Each ocean flood visits every cell at most once (a cell is added to a set once). Two floods + one intersection = linear in the number of cells, versus the quadratic brute force.\n\n" +
            "**I. Step by step.** For each border cell of an ocean, DFS: mark it in the ocean's set, then for each neighbor not yet in the set with `heights[neighbor] >= heights[cur]`, recurse. After both floods, output cells present in both sets.\n\n" +
            "**J. Why correct.** Reversing the inequality makes 'reachable from the ocean going uphill' equivalent to 'can send water to the ocean going downhill'. A cell in both sets can therefore drain to both oceans.\n\n" +
            "**K/L. Complexity.** `O(m*n)` time and space.",
          rcs:
            "class Solution:\n" +
            "    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n" +
            "        if not heights or not heights[0]:\n" +
            "            return []\n" +
            "        m, n = len(heights), len(heights[0])\n" +
            "        pac, atl = set(), set()              # Cells that can reach Pacific / Atlantic.\n" +
            "\n" +
            "        def dfs(r, c, visited):\n" +
            "            visited.add((r, c))              # Mark reachable-from-this-ocean.\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if (0 <= nr < m and 0 <= nc < n\n" +
            "                        and (nr, nc) not in visited\n" +
            "                        and heights[nr][nc] >= heights[r][c]):  # Reverse flow: uphill/equal.\n" +
            "                    dfs(nr, nc, visited)\n" +
            "\n" +
            "        for c in range(n):                   # Top row + bottom row seeds.\n" +
            "            dfs(0, c, pac)                   # Top edge touches Pacific.\n" +
            "            dfs(m - 1, c, atl)               # Bottom edge touches Atlantic.\n" +
            "        for r in range(m):                   # Left col + right col seeds.\n" +
            "            dfs(r, 0, pac)                   # Left edge touches Pacific.\n" +
            "            dfs(r, n - 1, atl)               # Right edge touches Atlantic.\n" +
            "\n" +
            "        return [[r, c] for r, c in (pac & atl)]  # Cells reaching both oceans.",
          plain:
            "class Solution:\n" +
            "    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n" +
            "        if not heights or not heights[0]:\n" +
            "            return []\n" +
            "        m, n = len(heights), len(heights[0])\n" +
            "        pac, atl = set(), set()\n" +
            "\n" +
            "        def dfs(r, c, visited):\n" +
            "            visited.add((r, c))\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if (0 <= nr < m and 0 <= nc < n\n" +
            "                        and (nr, nc) not in visited\n" +
            "                        and heights[nr][nc] >= heights[r][c]):\n" +
            "                    dfs(nr, nc, visited)\n" +
            "\n" +
            "        for c in range(n):\n" +
            "            dfs(0, c, pac)\n" +
            "            dfs(m - 1, c, atl)\n" +
            "        for r in range(m):\n" +
            "            dfs(r, 0, pac)\n" +
            "            dfs(r, n - 1, atl)\n" +
            "\n" +
            "        return [[r, c] for r, c in (pac & atl)]"
        }
      ],
      patternRecognition: [
        "Grid + 'can reach a border/target' for many sources => flip it and flood FROM the border.",
        "Two targets ('both oceans') => two floods and intersect the reachable sets.",
        "Grid neighbors with a height/weight condition => implicit graph, DFS/BFS in 4 directions."
      ],
      interviewRecall: [
        "Reverse the flow: DFS from the ocean edges going uphill (neighbor height >= current).",
        "Seed each flood with an ENTIRE border (multi-source), keep a visited set per ocean.",
        "Answer = pacific_reachable INTERSECT atlantic_reachable. Corners are always in both."
      ]
    },

    {
      id: "number-of-islands",
      lc: 200,
      title: "Number of Islands",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/number-of-islands/",
      meta: { pattern: "Connected Components (flood fill)", dataStructure: "Grid as implicit graph", technique: "DFS/BFS flood fill" },
      description:
        "Given an `m x n` 2D grid of `'1'`s (land) and `'0'`s (water), return the number of **islands**.\n\n" +
        "An island is a maximal group of `'1'`s connected **horizontally or vertically** (not diagonally). Assume all four edges of the grid are surrounded by water.",
      constraints: [
        "`m == grid.length`, `n == grid[i].length`",
        "`1 <= m, n <= 300`",
        "`grid[i][j]` is `'0'` or `'1'` (characters, not integers)."
      ],
      notes: [
        "Connectivity is 4-directional only; diagonal touches do NOT join two islands.",
        "The grid entries are string characters '0'/'1', so compare against '1' not 1.",
        "You may modify the grid in place (sink visited land) or keep a separate visited set."
      ],
      examples: [
        {
          input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
          output: "1",
          reasoning: "All the land cells connect into a single island.",
          visual: "```\n1 1 1 1 0\n1 1 0 1 0     one connected blob of 1s\n1 1 0 0 0\n0 0 0 0 0\n=> 1 island\n```"
        },
        {
          input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
          output: "3",
          reasoning: "Top-left 2x2 block, a lone center cell, and the bottom-right pair — three separate islands.",
          visual: "```\n1 1 0 0 0\n1 1 0 0 0     island A (top-left 2x2)\n0 0 1 0 0     island B (single)\n0 0 0 1 1     island C (pair)\n=> 3 islands\n```"
        },
        {
          input: 'grid = [["0","0","0"],["0","0","0"]]',
          output: "0",
          reasoning: "No land at all."
        },
        {
          input: 'grid = [["1","0","1"],["0","1","0"],["1","0","1"]]',
          output: "5",
          reasoning: "Diagonal land does not connect, so each '1' is its own island."
        }
      ],
      approaches: [
        {
          name: "DFS flood fill",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "The default: counting connected regions in a grid; concise recursion that sinks each island as it is found.",
          logic:
            "**Modeling.** The grid is an implicit graph: **nodes** are land cells (`'1'`); an **edge** connects two land cells that are vertically/horizontally adjacent. An **island is a connected component**. We are *counting connected components*.\n\n" +
            "**D. Key idea.** Scan every cell. The first time we hit unvisited land, we have discovered a new island \u2014 increment the count, then flood-fill (DFS) the entire component so its cells are never counted again.\n\n" +
            "**E. Why DFS fits.** Flood fill = 'from this land cell, reach all land connected to it'. That is exactly a component traversal. The `visited` marker prevents recounting: either a separate boolean grid/set, or (cheaper) overwrite each visited `'1'` with `'0'` to 'sink' it.\n\n" +
            "**G/H. What visited represents.** A cell is visited once its entire island is being flooded; sinking it to `'0'` means 'already part of a counted island'.\n\n" +
            "**I. Step by step.** For each `(r, c)`: if `grid[r][c] == '1'`, do `count += 1` and call `dfs(r, c)`. `dfs` sinks the current cell to `'0'` and recurses into the four neighbors that are still `'1'` and in bounds.\n\n" +
            "**J. Why correct.** Each land cell is flooded exactly once, by the first scan that reaches its island; the count increments once per component because subsequent cells of that island are already `'0'`.\n\n" +
            "**K/L. Complexity.** Every cell is examined a constant number of times \u2192 `O(m*n)` time; worst-case recursion depth (one giant island) is `O(m*n)` space.",
          rcs:
            "class Solution:\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:\n" +
            "        if not grid or not grid[0]:\n" +
            "            return 0\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        count = 0\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':\n" +
            "                return                        # Out of bounds or water/visited: stop.\n" +
            "            grid[r][c] = '0'                  # Sink this land so it isn't counted again.\n" +
            "            dfs(r + 1, c)                     # Flood the four connected neighbors.\n" +
            "            dfs(r - 1, c)\n" +
            "            dfs(r, c + 1)\n" +
            "            dfs(r, c - 1)\n" +
            "\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == '1':         # New unvisited land => a new island.\n" +
            "                    count += 1\n" +
            "                    dfs(r, c)                 # Erase the whole island.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:\n" +
            "        if not grid or not grid[0]:\n" +
            "            return 0\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        count = 0\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':\n" +
            "                return\n" +
            "            grid[r][c] = '0'\n" +
            "            dfs(r + 1, c)\n" +
            "            dfs(r - 1, c)\n" +
            "            dfs(r, c + 1)\n" +
            "            dfs(r, c - 1)\n" +
            "\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == '1':\n" +
            "                    count += 1\n" +
            "                    dfs(r, c)\n" +
            "        return count"
        },
        {
          name: "BFS flood fill (queue)",
          time: "O(m*n)",
          space: "O(min(m, n))",
          whenToUse: "When the grid is huge and deep recursion could overflow the stack; iterative flood fill with a queue.",
          logic:
            "**Same modeling, iterative flood.** Nodes = land cells, edges = 4-directional adjacency, an island = a component. We still scan for the first cell of each island and count it, but we flood the component with a **queue** instead of recursion.\n\n" +
            "**D. Key idea.** On finding unvisited land, increment the count, sink the starting cell, and push it onto a queue. Repeatedly pop a cell and enqueue its still-`'1'` neighbors, sinking each as it is enqueued (so it can't be enqueued twice).\n\n" +
            "**F. Why sink-on-enqueue matters.** Marking a cell `'0'` at the moment it enters the queue is the visited check; without it the same cell could be added by two neighbors and processed twice.\n\n" +
            "**I. Step by step.** For each `(r, c)` with `grid[r][c] == '1'`: `count += 1`, set it to `'0'`, `queue = deque([(r,c)])`; while the queue is non-empty pop `(cr, cc)` and for each in-bounds `'1'` neighbor, sink it and enqueue.\n\n" +
            "**K/L. Complexity.** `O(m*n)` time; the queue holds at most a frontier of the grid, so `O(min(m, n))` in the typical analysis \u2014 no deep call stack.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:\n" +
            "        if not grid or not grid[0]:\n" +
            "            return 0\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        count = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == '1':         # Start of a new island.\n" +
            "                    count += 1\n" +
            "                    grid[r][c] = '0'          # Sink immediately (mark visited).\n" +
            "                    queue = deque([(r, c)])\n" +
            "                    while queue:\n" +
            "                        cr, cc = queue.popleft()\n" +
            "                        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                            nr, nc = cr + dr, cc + dc\n" +
            "                            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == '1':\n" +
            "                                grid[nr][nc] = '0'  # Sink on enqueue to avoid duplicates.\n" +
            "                                queue.append((nr, nc))\n" +
            "        return count",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:\n" +
            "        if not grid or not grid[0]:\n" +
            "            return 0\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        count = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == '1':\n" +
            "                    count += 1\n" +
            "                    grid[r][c] = '0'\n" +
            "                    queue = deque([(r, c)])\n" +
            "                    while queue:\n" +
            "                        cr, cc = queue.popleft()\n" +
            "                        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                            nr, nc = cr + dr, cc + dc\n" +
            "                            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == '1':\n" +
            "                                grid[nr][nc] = '0'\n" +
            "                                queue.append((nr, nc))\n" +
            "        return count"
        }
      ],
      patternRecognition: [
        "'Count regions / groups / blobs in a grid' => connected components via flood fill.",
        "4-directional adjacency on a 2D grid => implicit graph, DFS or BFS.",
        "'Sink' visited land to '0' (or keep a visited set) so each component is counted once."
      ],
      interviewRecall: [
        "Increment the count once per NEW unvisited land cell, then flood the whole island.",
        "Grid cells are the string '1'/'0' — compare to '1', not the integer 1.",
        "DFS is shorter but can overflow on giant grids; BFS with a queue avoids deep recursion."
      ]
    },

    {
      id: "alien-dictionary",
      lc: 269,
      title: "Alien Dictionary",
      difficulty: "Hard",
      category: "Graphs",
      link: "https://leetcode.com/problems/alien-dictionary/",
      meta: { pattern: "Topological Sort", dataStructure: "Directed adjacency (letters)", technique: "Kahn BFS on derived edges" },
      description:
        "There is a new alien language using the lowercase English letters, but in an **unknown order**. You are given a list of `words` that is sorted **lexicographically** by the rules of this alien language.\n\n" +
        "Derive an order of the letters that is consistent with the given sorting, and return it as a string. If no valid order exists, return `\"\"`. If several orders are valid, return **any** of them.",
      constraints: [
        "`1 <= words.length <= 100`",
        "`1 <= words[i].length <= 100`",
        "`words[i]` consists of only lowercase English letters."
      ],
      notes: [
        "Every distinct letter that appears must be included in the output exactly once.",
        "Invalid case 1: a cycle in the derived order (e.g. a<b and b<a).",
        "Invalid case 2 (the prefix rule): if a longer word comes BEFORE its own prefix, like ['abc','ab'], no order can justify that \u2014 return \"\"."
      ],
      examples: [
        {
          input: 'words = ["wrt","wrf","er","ett","rftt"]',
          output: '"wertf"',
          reasoning: "Adjacent-pair comparisons give edges t->f, w->e, r->t, e->r. A topological order is w,e,r,t,f.",
          visual:
            "```\nwrt vs wrf : first diff t<f  => t -> f\nwrf vs er  : first diff w<e  => w -> e\ner  vs ett : first diff r<t  => r -> t\nett vs rftt: first diff e<r  => e -> r\norder: w -> e -> r -> t -> f  => 'wertf'\n```"
        },
        {
          input: 'words = ["z","x"]',
          output: '"zx"',
          reasoning: "z comes before x, so edge z->x; order is 'zx'."
        },
        {
          input: 'words = ["z","x","z"]',
          output: '""',
          reasoning: "z->x from the first pair and x->z from the second pair form a cycle — invalid."
        },
        {
          input: 'words = ["abc","ab"]',
          output: '""',
          reasoning: "A word cannot come before its own prefix in a valid dictionary, so return \"\"."
        }
      ],
      approaches: [
        {
          name: "Topological sort (Kahn's BFS on derived edges)",
          time: "O(C)",
          space: "O(1) letters (O(U + E) in general)",
          whenToUse: "The standard approach: order elements given pairwise ordering constraints => build a graph and topo-sort.",
          logic:
            "**Modeling.** **Nodes** are the distinct letters appearing anywhere in `words`. **Edges** are ordering constraints we DERIVE by comparing adjacent word pairs. We are *finding a total order of the letters consistent with all constraints* \u2014 a topological ordering of a directed graph.\n\n" +
            "**D. Deriving edges.** Compare each adjacent pair `(w1, w2)`. Because the list is sorted, the FIRST position where they differ tells us `w1[i]` comes before `w2[i]` in the alien order \u2192 add edge `w1[i] -> w2[i]`, then stop comparing this pair (later characters give no information). Only the first difference matters.\n\n" +
            "**The prefix trap.** If we reach the end of the shorter word with no difference AND `w1` is longer than `w2` (e.g. 'abc' before 'ab'), the ordering is impossible \u2014 return `\"\"` immediately. A valid dictionary always lists a prefix before the longer word.\n\n" +
            "**E. Why topo-sort.** Each edge `a -> b` means 'a must appear before b'. A valid alphabet is any linear order respecting all edges \u2014 exactly a topological sort. Kahn's algorithm: repeatedly output letters with **indegree 0** (no letter must precede them), removing their outgoing edges.\n\n" +
            "**Cycle detection.** If a cycle exists (a<b and b<a), some letters never reach indegree 0, so the output length is shorter than the number of distinct letters \u2192 return `\"\"`.\n\n" +
            "**G/H. What we track.** `adj[a]` = letters that must come after `a`; `indegree[c]` = number of letters that must come before `c`; the queue holds letters ready to be placed (indegree 0).\n\n" +
            "**I. Step by step.** (1) Initialize `indegree` for every distinct letter to 0 and `adj` empty. (2) For each adjacent pair, find the first differing char, add the edge (guarding the prefix case). (3) Enqueue all indegree-0 letters, pop and append to the result, decrementing neighbors' indegrees. (4) If the result covers all letters, return it; else return `\"\"`.\n\n" +
            "**K/L. Complexity.** Let `C` be total characters across all words. Building edges is `O(C)`; the sort is `O(U + E)` where `U` \u2264 26 letters \u2192 effectively `O(C)` time and `O(1)` extra for the fixed alphabet.",
          rcs:
            "from collections import deque, defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def alienOrder(self, words: List[str]) -> str:\n" +
            "        adj = defaultdict(set)                # adj[a] = letters that must come AFTER a.\n" +
            "        indegree = {ch: 0 for w in words for ch in w}  # Every distinct letter, indegree 0.\n" +
            "\n" +
            "        for w1, w2 in zip(words, words[1:]):  # Compare each adjacent pair of words.\n" +
            "            min_len = min(len(w1), len(w2))\n" +
            "            if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:\n" +
            "                return \"\"                    # Prefix rule violated: 'abc' before 'ab'.\n" +
            "            for i in range(min_len):\n" +
            "                if w1[i] != w2[i]:           # First difference gives the ordering...\n" +
            "                    if w2[i] not in adj[w1[i]]:\n" +
            "                        adj[w1[i]].add(w2[i])    # Edge w1[i] -> w2[i].\n" +
            "                        indegree[w2[i]] += 1\n" +
            "                    break                    # Only the first differing char matters.\n" +
            "\n" +
            "        queue = deque(c for c in indegree if indegree[c] == 0)  # Letters with nothing before them.\n" +
            "        order = []\n" +
            "        while queue:\n" +
            "            c = queue.popleft()\n" +
            "            order.append(c)                  # Safe to place next in the alphabet.\n" +
            "            for nxt in adj[c]:               # Removing c frees its dependents.\n" +
            "                indegree[nxt] -= 1\n" +
            "                if indegree[nxt] == 0:\n" +
            "                    queue.append(nxt)\n" +
            "\n" +
            "        if len(order) < len(indegree):       # Some letters stuck in a cycle.\n" +
            "            return \"\"\n" +
            "        return \"\".join(order)",
          plain:
            "from collections import deque, defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def alienOrder(self, words: List[str]) -> str:\n" +
            "        adj = defaultdict(set)\n" +
            "        indegree = {ch: 0 for w in words for ch in w}\n" +
            "\n" +
            "        for w1, w2 in zip(words, words[1:]):\n" +
            "            min_len = min(len(w1), len(w2))\n" +
            "            if len(w1) > len(w2) and w1[:min_len] == w2[:min_len]:\n" +
            "                return \"\"\n" +
            "            for i in range(min_len):\n" +
            "                if w1[i] != w2[i]:\n" +
            "                    if w2[i] not in adj[w1[i]]:\n" +
            "                        adj[w1[i]].add(w2[i])\n" +
            "                        indegree[w2[i]] += 1\n" +
            "                    break\n" +
            "\n" +
            "        queue = deque(c for c in indegree if indegree[c] == 0)\n" +
            "        order = []\n" +
            "        while queue:\n" +
            "            c = queue.popleft()\n" +
            "            order.append(c)\n" +
            "            for nxt in adj[c]:\n" +
            "                indegree[nxt] -= 1\n" +
            "                if indegree[nxt] == 0:\n" +
            "                    queue.append(nxt)\n" +
            "\n" +
            "        if len(order) < len(indegree):\n" +
            "            return \"\"\n" +
            "        return \"\".join(order)"
        }
      ],
      patternRecognition: [
        "'Recover an ordering from pairwise comparisons' => build a directed graph and topologically sort.",
        "Sorted input where adjacent items reveal a single ordering constraint => compare neighbors, take first difference.",
        "Two failure modes to remember: a cycle (contradiction) and the prefix-comes-after rule."
      ],
      interviewRecall: [
        "Only the FIRST differing character between two adjacent words gives an edge; break after adding it.",
        "Guard the prefix case: longer word before its prefix => return \"\" (e.g. 'abc' then 'ab').",
        "Kahn's: output indegree-0 letters; if the result misses any letter there was a cycle => \"\"."
      ]
    },

    {
      id: "graph-valid-tree",
      lc: 261,
      title: "Graph Valid Tree",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/graph-valid-tree/",
      meta: { pattern: "Union-Find / connectivity", dataStructure: "Disjoint Set Union", technique: "n-1 edges + no cycle" },
      description:
        "You are given `n` nodes labeled `0` to `n - 1` and a list of undirected `edges` where `edges[i] = [a, b]`. Determine whether these edges form a **valid tree**.\n\n" +
        "A valid tree is connected and contains no cycles.",
      constraints: [
        "`1 <= n <= 2000`",
        "`0 <= edges.length <= 5000`",
        "`edges[i].length == 2`, `0 <= a, b < n`, `a != b`",
        "There are no duplicate edges and no self-loops."
      ],
      notes: [
        "A tree on `n` nodes has **exactly `n - 1` edges**. With the right count, connected <=> acyclic, so you can check either.",
        "Fast reject: if `len(edges) != n - 1` it cannot be a tree.",
        "A single node with no edges (`n = 1`, `edges = []`) IS a valid tree."
      ],
      examples: [
        {
          input: "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]",
          output: "true",
          reasoning: "4 edges for 5 nodes, connected and acyclic — a valid tree.",
          visual: "```\n    0\n   /|\\\n  1 2 3\n  |\n  4      connected, no cycle => tree\n```"
        },
        {
          input: "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
          output: "false",
          reasoning: "Edges 1-2, 2-3, 1-3 form a cycle (1-2-3-1), so it is not a tree.",
          visual: "```\n  0-1-2\n    |\\|\n    4 3   cycle 1-2-3-1 => not a tree\n```"
        },
        {
          input: "n = 4, edges = [[0,1],[2,3]]",
          output: "false",
          reasoning: "Two separate components (0-1 and 2-3); not connected."
        },
        {
          input: "n = 1, edges = []",
          output: "true",
          reasoning: "A lone node is a trivial tree."
        }
      ],
      approaches: [
        {
          name: "Union-Find (Disjoint Set Union)",
          time: "O(n + E * \u03b1(n))",
          space: "O(n)",
          whenToUse: "The go-to for undirected connectivity/cycle questions; each edge either joins two groups or reveals a cycle.",
          logic:
            "**Modeling.** **Nodes** are `0..n-1`; **edges** are the undirected pairs. A valid tree means: (1) exactly `n - 1` edges, (2) all nodes in ONE connected group, (3) no cycle. Union-Find checks all three cheaply.\n\n" +
            "**D. Key idea.** Union-Find maintains disjoint sets, each identified by a representative 'root'. `find(x)` returns x's root; `union(a, b)` merges their sets. Process each edge: if its two endpoints are ALREADY in the same set, adding this edge creates a **cycle** \u2192 not a tree. Otherwise union them.\n\n" +
            "**E. Why it works.** Start with `n` singleton sets. Each successful union reduces the number of components by one. A tree needs exactly one component at the end, which requires exactly `n - 1` successful unions and zero cycle-forming edges. So: reject early if `len(edges) != n - 1`; then if no edge connects two already-joined nodes, the graph is a single acyclic component \u2014 a tree.\n\n" +
            "**find / union with path compression.** `find` walks parent pointers up to the root; **path compression** re-points visited nodes directly to the root so future `find`s are near-`O(1)`. **Union by rank/size** attaches the smaller tree under the larger to keep them shallow. Together they give near-linear `\u03b1(n)` (inverse Ackermann) amortized cost.\n\n" +
            "**G/H. What visited/state means.** `parent[x]` is x's current parent (itself if it is a root). Two nodes share a root iff they are in the same connected component so far.\n\n" +
            "**I. Step by step.** If `len(edges) != n - 1` return `False`. Init `parent[i] = i`. For each `(a, b)`: `ra, rb = find(a), find(b)`; if `ra == rb` return `False` (cycle); else set `parent[ra] = rb`. If we survive all edges, return `True`.\n\n" +
            "**J. Why correct.** With exactly `n - 1` edges and no cycle detected, every union succeeded, collapsing `n` singletons into a single component \u2014 the definition of a tree.\n\n" +
            "**K/L. Complexity.** `O(n + E * \u03b1(n))` \u2248 linear time, `O(n)` space. (A DFS/BFS from node 0 that checks 'visited all n nodes and never revisits a non-parent' is an equivalent alternative.)",
          rcs:
            "class Solution:\n" +
            "    def validTree(self, n: int, edges: List[List[int]]) -> bool:\n" +
            "        if len(edges) != n - 1:              # A tree has EXACTLY n-1 edges; fast reject.\n" +
            "            return False\n" +
            "        parent = list(range(n))              # Each node starts as its own set root.\n" +
            "\n" +
            "        def find(x):                         # Root of x's set, with path compression.\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]  # Point x at its grandparent (flatten).\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        for a, b in edges:\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:                     # Endpoints already connected => this edge is a cycle.\n" +
            "                return False\n" +
            "            parent[ra] = rb                  # Union the two sets.\n" +
            "        return True                          # n-1 edges, no cycle => connected acyclic tree.",
          plain:
            "class Solution:\n" +
            "    def validTree(self, n: int, edges: List[List[int]]) -> bool:\n" +
            "        if len(edges) != n - 1:\n" +
            "            return False\n" +
            "        parent = list(range(n))\n" +
            "\n" +
            "        def find(x):\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        for a, b in edges:\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:\n" +
            "                return False\n" +
            "            parent[ra] = rb\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "Undirected graph + 'is it a tree / any cycle / all connected' => Union-Find or one DFS/BFS.",
        "Remember the counting shortcut: a tree on n nodes has exactly n-1 edges.",
        "Cycle in an undirected graph = an edge whose endpoints are already in the same set."
      ],
      interviewRecall: [
        "Two checks == a tree: exactly n-1 edges AND connected (equivalently, no cycle).",
        "Union-Find: if find(a) == find(b) before uniting, that edge closes a cycle => not a tree.",
        "Path compression in find keeps it near O(1); n=1 with no edges is a valid tree."
      ]
    },

    {
      id: "number-of-connected-components",
      lc: 323,
      title: "Number of Connected Components in an Undirected Graph",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/",
      meta: { pattern: "Connected Components", dataStructure: "Disjoint Set Union", technique: "Union-Find count" },
      description:
        "You have a graph of `n` nodes labeled `0` to `n - 1`, given as `n` and a list of undirected `edges` where `edges[i] = [a, b]` connects nodes `a` and `b`.\n\n" +
        "Return the number of **connected components** in the graph.",
      constraints: [
        "`1 <= n <= 2000`",
        "`0 <= edges.length <= 5000`",
        "`edges[i].length == 2`, `0 <= a, b < n`, `a != b`",
        "There are no duplicate edges and no self-loops."
      ],
      notes: [
        "An isolated node with no edges is its own component.",
        "With no edges at all, the answer is `n`.",
        "Each edge can at most merge two components into one, never more."
      ],
      examples: [
        {
          input: "n = 5, edges = [[0,1],[1,2],[3,4]]",
          output: "2",
          reasoning: "{0,1,2} form one component and {3,4} form another.",
          visual: "```\n0-1-2      3-4\ncomponent A  component B\n=> 2 components\n```"
        },
        {
          input: "n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]",
          output: "1",
          reasoning: "A single chain connects all five nodes."
        },
        {
          input: "n = 4, edges = []",
          output: "4",
          reasoning: "No edges, so each node is its own component."
        },
        {
          input: "n = 1, edges = []",
          output: "1",
          reasoning: "One isolated node is one component."
        }
      ],
      approaches: [
        {
          name: "Union-Find with a component counter",
          time: "O(n + E * \u03b1(n))",
          space: "O(n)",
          whenToUse: "The cleanest way to count components as edges arrive; also the base for many connectivity problems.",
          logic:
            "**Modeling.** **Nodes** are `0..n-1`; **edges** are undirected pairs. A **connected component** is a maximal set of mutually reachable nodes. We are *counting components*.\n\n" +
            "**D. Key idea.** Start assuming every node is isolated: `count = n` separate components. Each edge that connects two nodes from DIFFERENT components merges them, reducing `count` by 1. An edge between two nodes already in the same component changes nothing.\n\n" +
            "**E. Why Union-Find fits.** `find(x)` gives the representative root of x's component; `union(a, b)` merges two components. Decrement `count` only when a union actually joins two distinct sets. After processing all edges, `count` is the number of components.\n\n" +
            "**find / union with path compression.** `find` follows parent pointers to the root and flattens the path so repeated lookups are near-constant; **union by rank/size** keeps trees shallow. Amortized cost is `\u03b1(n)` (inverse Ackermann), effectively constant.\n\n" +
            "**G/H. State.** `parent[x]` is x's parent (root if equal to x); `count` is the current number of disjoint sets. Two nodes are in the same component iff they share a root.\n\n" +
            "**I. Step by step.** Init `parent[i] = i`, `count = n`. For each `(a, b)`: `ra, rb = find(a), find(b)`; if `ra != rb`, set `parent[ra] = rb` and do `count -= 1`. Return `count`.\n\n" +
            "**J. Why correct.** Each real merge reduces the component count by exactly one; redundant edges (same root) are ignored, so `count` always equals the true number of components.\n\n" +
            "**K/L. Complexity.** `O(n + E * \u03b1(n))` \u2248 linear time, `O(n)` space. (Equivalently: build an adjacency list and run a DFS/BFS from each unvisited node, incrementing a counter once per traversal.)",
          rcs:
            "class Solution:\n" +
            "    def countComponents(self, n: int, edges: List[List[int]]) -> int:\n" +
            "        parent = list(range(n))              # Each node begins in its own component.\n" +
            "        count = n                            # Start with n separate components.\n" +
            "\n" +
            "        def find(x):                         # Root of x's set, with path compression.\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]  # Flatten the path toward the root.\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        for a, b in edges:\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra != rb:                     # Different components -> a real merge.\n" +
            "                parent[ra] = rb\n" +
            "                count -= 1                   # One fewer component.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def countComponents(self, n: int, edges: List[List[int]]) -> int:\n" +
            "        parent = list(range(n))\n" +
            "        count = n\n" +
            "\n" +
            "        def find(x):\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        for a, b in edges:\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra != rb:\n" +
            "                parent[ra] = rb\n" +
            "                count -= 1\n" +
            "        return count"
        },
        {
          name: "DFS over an adjacency list",
          time: "O(n + E)",
          space: "O(n + E)",
          whenToUse: "When you prefer explicit traversal or also need to enumerate the members of each component.",
          logic:
            "**Same modeling, explicit traversal.** Nodes `0..n-1`, undirected edges, components = maximal reachable groups. Instead of merging sets, we *walk each component once and count how many walks it takes*.\n\n" +
            "**D. Key idea.** Build an adjacency list. Keep a `visited` set. Scan nodes `0..n-1`; each time we find an unvisited node, it belongs to a component not yet counted \u2014 increment the count and DFS/BFS to mark every node reachable from it as visited.\n\n" +
            "**G/H. What visited means.** A node is in `visited` once some component traversal has reached it; it will never start a new count again. The number of traversals launched equals the number of components.\n\n" +
            "**I. Step by step.** Build `adj[a].append(b)` and `adj[b].append(a)` for every edge (undirected => both directions). For each node `i` not in `visited`: `count += 1`, then DFS from `i` adding every reachable node to `visited`.\n\n" +
            "**J. Why correct.** Each component is entered exactly once \u2014 by the first of its nodes reached in the outer scan \u2014 and fully marked, so no component is counted twice and none is missed.\n\n" +
            "**K/L. Complexity.** Building the list and visiting every node/edge once \u2192 `O(n + E)` time and space.",
          rcs:
            "class Solution:\n" +
            "    def countComponents(self, n: int, edges: List[List[int]]) -> int:\n" +
            "        adj = [[] for _ in range(n)]         # Undirected adjacency list.\n" +
            "        for a, b in edges:\n" +
            "            adj[a].append(b)\n" +
            "            adj[b].append(a)                 # Store both directions.\n" +
            "        visited = set()\n" +
            "        count = 0\n" +
            "\n" +
            "        def dfs(node):\n" +
            "            stack = [node]\n" +
            "            while stack:\n" +
            "                cur = stack.pop()\n" +
            "                for nei in adj[cur]:\n" +
            "                    if nei not in visited:\n" +
            "                        visited.add(nei)     # Mark on discovery.\n" +
            "                        stack.append(nei)\n" +
            "\n" +
            "        for i in range(n):\n" +
            "            if i not in visited:             # New, unseen component.\n" +
            "                count += 1\n" +
            "                visited.add(i)\n" +
            "                dfs(i)                       # Mark the whole component.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def countComponents(self, n: int, edges: List[List[int]]) -> int:\n" +
            "        adj = [[] for _ in range(n)]\n" +
            "        for a, b in edges:\n" +
            "            adj[a].append(b)\n" +
            "            adj[b].append(a)\n" +
            "        visited = set()\n" +
            "        count = 0\n" +
            "\n" +
            "        def dfs(node):\n" +
            "            stack = [node]\n" +
            "            while stack:\n" +
            "                cur = stack.pop()\n" +
            "                for nei in adj[cur]:\n" +
            "                    if nei not in visited:\n" +
            "                        visited.add(nei)\n" +
            "                        stack.append(nei)\n" +
            "\n" +
            "        for i in range(n):\n" +
            "            if i not in visited:\n" +
            "                count += 1\n" +
            "                visited.add(i)\n" +
            "                dfs(i)\n" +
            "        return count"
        }
      ],
      patternRecognition: [
        "'How many separate groups / clusters?' in an undirected graph => count connected components.",
        "Union-Find shines when edges stream in and you want a running component count.",
        "DFS/BFS from each unvisited node is the explicit alternative and lets you list each group."
      ],
      interviewRecall: [
        "Union-Find: start count = n, decrement only on a real merge (find(a) != find(b)).",
        "DFS approach: count once per unvisited node, then flood the whole component.",
        "Isolated nodes count; with no edges the answer is n."
      ]
    }
  ]);
})();
