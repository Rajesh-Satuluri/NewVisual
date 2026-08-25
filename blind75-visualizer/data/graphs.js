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
            "**What it asks.** Produce an independent deep copy of a connected, undirected graph given a reference to one node: brand-new nodes, brand-new edges, nothing shared with the original.\n\n" +
            "**Graph modeling.** The **nodes** are the `Node` objects; the **edges** are the entries in each node's `neighbors` list (each undirected edge is stored on both endpoints). We are *visiting every node once* and, as we go, rebuilding each node and re-wiring its neighbor list to point at the clones instead of the originals.\n\n" +
            "**Why the naive idea fails.** The graph is connected and can contain cycles (node 1 points to 2, node 2 points back to 1). If you just recurse into neighbors you bounce 1\u21922\u21921\u21922\u2026 forever, and you also risk creating two different copies of the same original node when several neighbors point back to it.\n\n" +
            "**Key Idea.** Keep one memo: a hash map `old -> new` that records, for each original node, its unique clone. Before cloning a node, check the map \u2014 if its clone already exists, return that. This single structure both stops the infinite loop AND guarantees exactly one copy per node. The clone map IS the `visited` structure: a node counts as visited the moment its clone is placed in the map.\n\n" +
            "**Why DFS fits.** Cloning a node requires cloning all of its neighbors, which is naturally recursive \u2014 clone me, then for each neighbor clone it (or fetch its existing clone) and attach. Depth-first recursion follows edges to their end and unwinds, wiring each node's neighbor list on the way back.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain `clones`, mapping each original node to its clone (also the visited set).\n" +
            "2. To clone the current node: if it is already in `clones`, return `clones[node]`.\n" +
            "3. Otherwise create its clone by copying `val`.\n" +
            "4. Register the clone in `clones` *before* recursing, so a cycle leading back here resolves to the in-progress clone rather than recreating it.\n" +
            "5. For each neighbor of the original, recurse to get that neighbor's clone and append it to the current clone's neighbor list.\n" +
            "6. Return the clone; kick the whole thing off from the entry node (or return null if the input is null).\n\n" +
            "**Why it works.** Registering the clone before descending means any cycle that leads back to this node finds the existing clone in the map instead of building a fresh one, so every edge is wired exactly once in each direction and the traversal terminates.\n\n" +
            "**Common Gotchas.**\n" +
            "- A null input must be handled first \u2014 return null before touching the map.\n" +
            "- Register the clone in the map BEFORE recursing; doing it after descending reintroduces the infinite loop on cycles.\n" +
            "- Undirected edges live on both endpoints; wiring each neighbor once per direction reproduces that symmetry.\n\n" +
            "**Complexity.** Time `O(V + E)` \u2014 every node and every edge is processed a constant number of times. Space `O(V)` for the recursion stack and the clone map.\n\n" +
            "**Interview mindset.** 'Deep copy a graph with possible cycles' is the signal for an `old -> new` map that doubles as the visited set \u2014 the same memo pattern any traversal over a cyclic graph needs to terminate.",
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
            "**What it asks.** The same task \u2014 a deep copy of the connected, undirected graph \u2014 but produced with an explicit queue instead of recursion.\n\n" +
            "**Graph modeling.** Unchanged: **nodes** are `Node` objects, **edges** are neighbor-list entries stored on both endpoints. We still keep the `old -> new` clone map that doubles as the `visited` set, but expand the graph outward with a queue instead of the call stack.\n\n" +
            "**Why the naive idea fails.** The DFS solution is correct, but on a very large graph deep recursion can hit the interpreter's recursion limit and blow the stack. An iterative BFS sidesteps that entirely while keeping the same linear cost.\n\n" +
            "**Key Idea.** Clone the start node up front and seed both the map and the queue with it. A node is enqueued only at the instant its clone is first created and inserted into the map, so the `if neighbor not in clones` guard is exactly the visited check \u2014 each node enters the queue once and each edge is wired once per direction.\n\n" +
            "**Why BFS fits.** Cloning only needs every node reached and every edge re-pointed; the order does not matter, so a queue-driven frontier works just as well as recursion. The queue holds the original nodes still waiting to have their neighbor lists copied.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle the null input first \u2014 return null.\n" +
            "2. Seed `clones[node] = Node(node.val)` and put the original `node` in the queue.\n" +
            "3. While the queue is non-empty, pop an original node `cur`.\n" +
            "4. For each neighbor `nei` of `cur`: if `nei` has no clone yet, create one and enqueue `nei`.\n" +
            "5. Append `clones[nei]` to `clones[cur]`'s neighbor list to wire the cloned edge.\n" +
            "6. When the queue drains, return the clone of the entry node.\n\n" +
            "**Why it works.** Inserting a clone into the map at enqueue time makes the guard a true visited check, so no node is processed twice and no edge is duplicated; every reachable node is eventually dequeued and fully wired.\n\n" +
            "**Common Gotchas.**\n" +
            "- Clone the start node and put it in the map before the loop, or its own edges never get wired.\n" +
            "- Mark on enqueue, not on dequeue \u2014 otherwise two neighbors can enqueue the same node twice.\n" +
            "- Still handle the null input, and remember each undirected edge is wired once from each side.\n\n" +
            "**Complexity.** Time `O(V + E)` and space `O(V)` for the map and queue \u2014 identical asymptotics to DFS, just with no recursion depth.\n\n" +
            "**Interview mindset.** When a graph traversal is correct recursively but the input could be huge, reach for the queue-based BFS variant \u2014 same clone map, no stack-overflow risk.",
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
            "**What it asks.** Given courses with prerequisite pairs, decide whether it is possible to finish all of them \u2014 i.e. whether a valid order exists that respects every prerequisite.\n\n" +
            "**Graph modeling.** **Nodes** are courses `0..numCourses-1`. Each pair `[a, b]` ('take b before a') is a directed **edge `b -> a`** \u2014 b unlocks a. Finishing everything is possible exactly when this directed graph is a **DAG** (no cycle), so we are really asking 'is this graph acyclic?'.\n\n" +
            "**Why the naive idea fails.** Trying to simulate 'pick a course whose prereqs are all done, repeat' without structure means rescanning all courses each round to find a ready one \u2014 and it is easy to loop forever or miss the cycle. We need a systematic way to track readiness and detect the deadlock.\n\n" +
            "**Key Idea.** A course is ready to take once all its prerequisites are done \u2014 in graph terms, when its **indegree** (count of incoming edges = unmet prerequisites) drops to 0. Kahn's algorithm repeatedly removes indegree-0 nodes and deletes their outgoing edges, which lowers other nodes' indegrees and may free them. If every node can be removed this way the graph is acyclic; if some never reach indegree 0 they are trapped in a cycle.\n\n" +
            "**Why topological sort fits.** 'Order tasks under dependency constraints' is the definition of a topological ordering, and Kahn's BFS produces one (or proves none exists) using indegrees. The `visited` measure here is a `processed` counter \u2014 how many courses were successfully scheduled.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build adjacency list `graph[b].append(a)` and an `indegree` array counting incoming edges per course.\n" +
            "2. Enqueue every course whose indegree is already 0 (no prerequisites).\n" +
            "3. Pop a course, increment `processed` \u2014 it is now 'taken'.\n" +
            "4. For each course it unlocks, decrement that course's indegree; if it hits 0, enqueue it.\n" +
            "5. When the queue drains, return whether `processed == numCourses`.\n\n" +
            "**Why it works.** Each edge is relaxed exactly once, when its source is processed. A node reaches indegree 0 iff all its prerequisites were scheduled before it, so if `processed` equals `numCourses` every course had its prereqs met in order; any node that never reaches 0 is on a cycle where each waits on another, and the count falls short.\n\n" +
            "**Common Gotchas.**\n" +
            "- Edge direction is the #1 bug: `[a, b]` means b before a, i.e. edge `b -> a`. Draw it before coding.\n" +
            "- The graph may be disconnected and include courses with no edges \u2014 those start at indegree 0 and must be counted.\n" +
            "- Compare the final `processed` count to `numCourses`, not to the number of edges.\n\n" +
            "**Complexity.** Time `O(V + E)` and space `O(V + E)` \u2014 building and traversing touch every node and edge once.\n\n" +
            "**Interview mindset.** 'Can all tasks finish?' or 'is there a valid build/schedule order?' under pairwise dependencies is the classic signal for topological sort via indegree BFS.",
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
            "**What it asks.** The same question \u2014 can all courses finish? \u2014 answered by detecting whether the directed prerequisite graph contains a cycle.\n\n" +
            "**Graph modeling.** Same graph: **nodes** are courses, and each `[a, b]` is a directed **edge `b -> a`**. 'Finishable' is equivalent to 'a depth-first walk finds no back edge', i.e. the graph is acyclic. We find a cycle by coloring nodes as we descend.\n\n" +
            "**Why the naive idea fails.** A plain DFS with a single boolean visited set can't tell 'this node is an ancestor still on my current path' (which signals a cycle) from 'this node was fully explored earlier on a different path' (which is safe). Conflating them either misses cycles or wrongly reports them.\n\n" +
            "**Key Idea.** Give each node three states: **0 = unvisited**, **1 = on the current DFS path (visiting)**, **2 = fully explored and proven safe**. The color array IS the traversal's memory. A cycle exists precisely when DFS reaches a node currently colored 1 \u2014 a *back edge* to an ancestor on the active recursion path. Color 2 lets a later path short-circuit a node already cleared, which keeps the whole search linear instead of exponential.\n\n" +
            "**Why DFS fits.** Cycle detection in a directed graph is exactly about the recursion stack: the set of color-1 nodes is the current path. Depth-first descent naturally maintains that path, marking a node gray on entry and black on exit.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build adjacency list `graph[b].append(a)` and a `color` array initialized to 0.\n" +
            "2. In `dfs(c)`: if `color[c] == 1` a back edge was found \u2014 return false (cycle).\n" +
            "3. If `color[c] == 2` the node is already cleared \u2014 return true.\n" +
            "4. Mark `color[c] = 1` (now on the active path) and recurse into every neighbor; if any returns false, propagate false up.\n" +
            "5. After exploring all neighbors, mark `color[c] = 2` (done, safe) and return true.\n" +
            "6. Run `dfs` from every course, since the graph may be disconnected; return false the moment any call reports a cycle.\n\n" +
            "**Why it works.** A directed graph has a cycle iff a DFS encounters a back edge to a gray ancestor. Marking nodes black after fully exploring them means each node and edge is examined once, and a black node can be trusted as cycle-free without re-descending.\n\n" +
            "**Common Gotchas.**\n" +
            "- Two distinct states are essential: gray (on path) vs black (done). A single visited flag is the classic wrong answer here.\n" +
            "- Restart the DFS from every unfinished node \u2014 a cycle may live in a component you haven't entered.\n" +
            "- Keep edge direction straight: `[a, b]` is `b -> a`.\n\n" +
            "**Complexity.** Time `O(V + E)` \u2014 each node colored a constant number of times, each edge followed once. Space `O(V + E)` for the recursion, color array, and adjacency list.\n\n" +
            "**Interview mindset.** 'Detect a cycle in a directed graph' \u2014 build order, dependency resolution, deadlock detection \u2014 is the trigger for three-color DFS (or, equivalently, Kahn's indegree BFS).",
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
            "**What it asks.** Find every grid cell from which water can flow to *both* oceans \u2014 the Pacific (top/left edges) and the Atlantic (bottom/right edges) \u2014 where water moves to an equal-or-lower neighbor.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are cells `(r, c)`; a directed **edge** goes from cell X to neighbor Y when `heights[Y] <= heights[X]` (water can flow X -> Y downhill). We want cells that can reach both border sets, and a `visited`/`seen` set per search prevents re-processing cells during one flow.\n\n" +
            "**Why the naive idea fails (this is the idea).** The obvious approach: for every cell, run a DFS/BFS following the downhill (\u2264) edges and check whether it touches a top/left border (Pacific) and, separately, a bottom/right border (Atlantic); collect the cells that reach both. It is correct but slow \u2014 each of the `m*n` cells launches its own traversal that can visit up to `m*n` cells, giving `O((m*n)^2)`. For a 200x200 grid that is ~1.6 billion steps.\n\n" +
            "**Key Idea.** Model each cell's ability to drain as a reachability query in the downhill graph, then simply answer that query independently for every source cell. There is no sharing between searches \u2014 which is exactly why it is quadratic and motivates the reverse-flood optimization.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each cell `(r, c)`, start a fresh DFS/BFS with its own `seen` set.\n" +
            "2. During the walk, if the current cell is on the top or left edge, mark Pacific reached; on the bottom or right edge, mark Atlantic reached.\n" +
            "3. Move to any in-bounds neighbor whose height is `<=` the current cell's (water flows down-or-equal).\n" +
            "4. When the walk ends, the cell qualifies iff both oceans were marked.\n" +
            "5. Collect all qualifying cells.\n\n" +
            "**Why it works.** Each per-cell search explores exactly the set of cells water can drain through from that source, so touching both a Pacific and an Atlantic border proves that cell drains to both. The `seen` set guarantees termination on flat/equal regions.\n\n" +
            "**Common Gotchas.**\n" +
            "- Flow uses `<=`, so equal-height neighbors pass water both ways \u2014 the `seen` set is essential or the search loops.\n" +
            "- A border cell reaches its own ocean immediately; don't require it to move first.\n" +
            "- Re-initialize `seen` (and the two ocean flags) for every source cell.\n\n" +
            "**Complexity.** Time `O((m*n)^2)` \u2014 one traversal of up to `m*n` cells per source cell. Space `O(m*n)` for the per-search `seen` set.\n\n" +
            "**Interview mindset.** When 'can each of many sources reach a target?' leads to relaunching a full search per source, that quadratic blowup is the cue to flip the direction and flood once from the targets instead.",
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
            "**What it asks.** The same result \u2014 cells that can drain to both oceans \u2014 computed in linear time instead of quadratic.\n\n" +
            "**Graph modeling.** Same implicit grid graph (nodes = cells, edges follow height). But instead of the downhill edge, we traverse its reverse: from a cell we step to a neighbor whose height is `>=` (water could have flowed the other way, from that neighbor down into us).\n\n" +
            "**Why the naive idea fails.** Searching from every cell repeats enormous overlapping work \u2014 `O((m*n)^2)`. The oceans, however, are shared targets, so the reachability should be computed once per ocean, not once per cell.\n\n" +
            "**Key Idea.** Flip the question. Instead of 'from each cell, can water flow DOWN to an ocean?', ask 'starting AT an ocean's border, which cells can water have come DOWN from?' \u2014 walk uphill (neighbor height `>=` current). Every cell reachable this way can drain into that ocean. Do this once per ocean and intersect.\n\n" +
            "**Why multi-source DFS/BFS fits.** All border cells of one ocean are equivalent sources, so we seed a single flood with the entire border at once. Two floods \u2014 Pacific set `pac` and Atlantic set `atl` \u2014 each act as their own `visited` marker (a cell is added once, preventing re-processing), and the answer is the intersection `pac \u2229 atl`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create two sets, `pac` and `atl`, for cells that can reach each ocean.\n" +
            "2. Seed the Pacific flood from every top-row and left-column cell; seed the Atlantic flood from every bottom-row and right-column cell.\n" +
            "3. From each seed, DFS/BFS: mark the cell in that ocean's set, then move to any neighbor not yet in the set whose height is `>=` the current cell's (reverse/uphill flow).\n" +
            "4. After both floods complete, output every cell present in both `pac` and `atl`.\n\n" +
            "**Why it works.** Reversing the inequality makes 'reachable from the ocean going uphill' logically equivalent to 'can send water to the ocean going downhill'. So `pac` is exactly the cells that drain to the Pacific and `atl` those that drain to the Atlantic; a cell in both drains to both.\n\n" +
            "**Common Gotchas.**\n" +
            "- The inequality flips to `>=` for the reverse flow \u2014 using `<=` here silently computes the wrong set.\n" +
            "- Seed each flood with the whole border (multi-source), and keep a separate visited set per ocean.\n" +
            "- Corner cells touch both oceans and are always in the answer; a 1x1 or single-row/column grid is all-answer.\n\n" +
            "**Complexity.** Time `O(m*n)` and space `O(m*n)` \u2014 each cell is visited at most once per ocean, so two floods plus an intersection stay linear.\n\n" +
            "**Interview mindset.** Grid plus 'can many sources reach a border/target' is the signal to reverse the search and flood FROM the target; two targets means two floods and intersect the reachable sets.",
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
            "**What it asks.** Count the islands in a grid of `'1'` (land) and `'0'` (water), where an island is a maximal group of land cells connected horizontally or vertically.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are land cells (`'1'`); an **edge** connects two land cells that are vertically or horizontally adjacent. An **island is exactly a connected component**, so the task is *counting connected components*.\n\n" +
            "**Why the naive idea fails.** You can't just count `'1'`s \u2014 many belong to the same island. And re-scanning the whole grid to test membership of already-counted land wastes work. We need to discover each component once and mark all its cells so they're never recounted.\n\n" +
            "**Key Idea.** Scan every cell. The first time you hit unvisited land, you've found a new island \u2014 increment the count, then flood-fill (DFS) its entire component so none of its cells triggers another increment. The flood is a connected-component traversal: 'from this land cell, reach all land connected to it'.\n\n" +
            "**Why DFS fits.** Reaching all land connected to a start cell is precisely a depth-first traversal over the adjacency edges. The `visited` marker prevents recounting \u2014 either a separate set, or (cheaper) overwrite each visited `'1'` with `'0'` to 'sink' it, meaning 'already part of a counted island'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Iterate over every cell `(r, c)`.\n" +
            "2. When `grid[r][c] == '1'`, increment the island count and call `dfs(r, c)`.\n" +
            "3. `dfs` sinks the current cell to `'0'`, then recurses into the four neighbors (up/down/left/right).\n" +
            "4. Each recursive call stops immediately if it is out of bounds or on water/visited (`!= '1'`).\n" +
            "5. Return the accumulated count after the full scan.\n\n" +
            "**Why it works.** Each land cell is flooded exactly once \u2014 by the first scan that reaches its island \u2014 so the count increments once per component, since every other cell of that island is already `'0'` by the time the outer loop reaches it.\n\n" +
            "**Common Gotchas.**\n" +
            "- Cells are the string characters `'1'`/`'0'`, not integers \u2014 compare against `'1'`.\n" +
            "- Connectivity is 4-directional only; diagonal touches do NOT join islands.\n" +
            "- On a single giant island the recursion depth reaches `m*n`, which can overflow the stack \u2014 that's the reason BFS exists.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 each cell examined a constant number of times. Space `O(m*n)` worst-case recursion depth (one grid-filling island).\n\n" +
            "**Interview mindset.** 'Count regions/blobs/clusters in a grid' with 4-directional adjacency is the connected-components-via-flood-fill signal \u2014 DFS or BFS, sinking visited land as you go.",
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
            "**What it asks.** The same island count, produced with an explicit queue so there's no deep recursion.\n\n" +
            "**Graph modeling.** Unchanged: **nodes** are land cells, **edges** are 4-directional adjacency, and an island is a connected component. We still scan for the first cell of each island and count it, but flood the component with a **queue** instead of the call stack.\n\n" +
            "**Why the naive idea fails.** The recursive DFS is correct but on a huge single island (up to 300x300 land cells) its recursion depth can overflow the stack. An iterative BFS keeps memory to the frontier and avoids that.\n\n" +
            "**Key Idea.** On finding unvisited land, increment the count, sink the starting cell to `'0'`, and push it onto a queue. Repeatedly pop a cell and enqueue its still-`'1'` neighbors, sinking each *as it is enqueued*. Marking a cell `'0'` at enqueue time is the visited check \u2014 without it, two neighbors could enqueue the same cell and it would be processed twice.\n\n" +
            "**Why BFS fits.** Flood fill only needs to reach every connected land cell; order is irrelevant, so a queue-driven frontier explores the component just as completely as recursion, with bounded depth.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Iterate over every cell `(r, c)`.\n" +
            "2. When `grid[r][c] == '1'`, increment the count, sink it to `'0'`, and seed a queue with `(r, c)`.\n" +
            "3. While the queue is non-empty, pop a cell and look at its four neighbors.\n" +
            "4. For each in-bounds neighbor still equal to `'1'`, sink it to `'0'` and enqueue it.\n" +
            "5. When the queue drains, the island is fully consumed; continue the scan and return the count.\n\n" +
            "**Why it works.** Sinking on enqueue makes each land cell enter the queue exactly once, so a component is flooded completely and counted a single time, identical in outcome to the DFS version.\n\n" +
            "**Common Gotchas.**\n" +
            "- Sink cells on enqueue, not on dequeue \u2014 otherwise duplicates enter the queue.\n" +
            "- Cells are string `'1'`/`'0'`; compare against the character.\n" +
            "- 4-directional only; diagonals don't connect.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 every cell processed once. Space is the queue frontier, `O(min(m, n))` in the usual analysis \u2014 no deep call stack.\n\n" +
            "**Interview mindset.** When a grid flood-fill is correct recursively but the grid is large, switch to the queue-based BFS to remove stack-overflow risk while keeping linear time.",
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
