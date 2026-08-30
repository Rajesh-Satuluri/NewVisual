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
            "**What it asks.** Count the islands in an `m x n` grid whose cells are the *characters* `'1'` (land) and `'0'` (water). An island is a maximal group of land cells joined horizontally or vertically \u2014 diagonal touches do not count. The productive way to see this is as an *implicit graph*: each land cell is a **node**, and an **edge** joins two land cells that are 4-directionally adjacent. Under that lens an island is exactly a **connected component**, so the real question is 'how many connected components of land does this grid contain?'\n\n" +
            "**Why the naive idea fails.** You cannot simply count the `'1'`s \u2014 a single island may be made of hundreds of land cells, and each one would be counted separately. Nor can you re-scan the whole grid to test whether a cell already belongs to a counted island; that repeated membership testing explodes the work. What you need is to discover each component *once* and permanently mark all of its cells, so none of them is ever counted or explored a second time.\n\n" +
            "**Key Idea.** Sweep the grid cell by cell. The first time you land on a cell that is still `'1'`, you have found a brand-new island: increment the counter once, then *flood-fill* the entire component so every other cell of that same island gets marked and can never trigger another increment. Flood-fill is just 'from this land cell, reach every land cell connected to it' \u2014 a traversal over the adjacency edges, which is a natural fit for depth-first search.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle the empty grid up front, then cache `m` (rows) and `n` (columns) and start `count = 0`.\n" +
            "2. Define `dfs(r, c)` whose job is to sink one whole component. Its base case returns immediately when `(r, c)` is out of bounds or the cell is not `'1'` (water or already-sunk land).\n" +
            "3. Otherwise `dfs` sinks the current cell by overwriting `'1'` with `'0'`, then recurses into all four neighbours (down, up, right, left).\n" +
            "4. In the main double loop, whenever `grid[r][c] == '1'`, do `count += 1` and call `dfs(r, c)` to erase the whole island.\n" +
            "5. Return `count` once the scan completes.\n\n" +
            "**Why it works.** Overwriting each visited `'1'` with `'0'` *is* the visited-marker: a sunk cell fails the `'1'` test, so neither the recursion nor the outer scan can revisit it \u2014 that is what prevents infinite loops and double counting. As a result each land cell is flooded exactly once, by the first scan that reaches its island, and every remaining cell of that island is already `'0'` by the time the outer loop arrives at it. So the counter advances exactly once per component.\n\n" +
            "**Common Gotchas.**\n" +
            "- The cells are the *string characters* `'1'`/`'0'`, not integers \u2014 compare against `'1'`, never `1`.\n" +
            "- Connectivity is 4-directional only; diagonal adjacency does not join two islands.\n" +
            "- Put the bounds checks *before* the `grid[r][c]` access in the base case, so you never index out of range.\n" +
            "- On a grid that is one giant island the recursion depth can reach `m*n` and overflow the call stack \u2014 precisely the motivation for the iterative BFS variant.\n\n" +
            "**Complexity.** Time `O(m*n)`: every cell is examined a constant number of times (once by the outer scan, plus a constant number of times as a neighbour during flooding). Space `O(m*n)` in the worst case \u2014 the recursion stack for a single space-filling island.\n\n" +
            "**Interview mindset.** 'Count regions / blobs / clusters in a grid' with 4-directional adjacency is the textbook signal for connected-components-via-flood-fill. Say you will scan for new land, count once, and sink the component with DFS (or BFS); mention the stack-depth caveat as the reason BFS exists.",
          rcs:
            "from typing import List  # List lets the type hints say the grid is a list of lists of str characters.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls numIslands on the object.\n\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:  # Return how many separate islands of '1' land the grid holds.\n\n" +
            "        # ==================== PHASE 1: MODEL THE GRID AS A GRAPH ====================\n\n" +
            "        # Mental model: read the grid as an IMPLICIT graph.\n" +
            "        #   Node   = one land cell, i.e. a cell holding the character '1'.\n" +
            "        #   Edge   = joins two land cells that touch up / down / left / right (never diagonally).\n" +
            "        #   Island = one CONNECTED COMPONENT of that graph, so counting islands == counting components.\n\n" +
            "        if not grid or not grid[0]:  # Guard the empty grid (no rows) and the empty-first-row case.\n" +
            "            return 0                 # No cells => no land => zero islands; nothing below runs.\n" +
            "                                     # Why safe: everything after this assumes grid[0] exists for len(grid[0]).\n\n" +
            "        m, n = len(grid), len(grid[0])  # m = row count, n = column count; cached for the bounds checks.\n" +
            "                                        # State: every cell is addressed by 0 <= r < m and 0 <= c < n.\n" +
            "        count = 0                       # Running island tally; incremented once per NEW component we discover.\n" +
            "                                        # Loop invariant (Phase 3): count == number of islands fully sunk so far.\n\n" +
            "        # ==================== PHASE 2: FLOOD-FILL ONE ISLAND (DFS) ====================\n\n" +
            "        def dfs(r, c):  # One call means 'from cell (r, c), sink every land cell reachable from it'.\n" +
            "                        # Returns nothing: its whole purpose is the SIDE EFFECT of mutating grid to '0'.\n\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != '1':  # Base case: off-grid, or water/already-sunk.\n" +
            "                return  # Stop this branch; do not recurse further.\n" +
            "                        # Short-circuit order matters: the four bounds tests run BEFORE grid[r][c],\n" +
            "                        # so a neighbour past the edge is rejected and we never index out of range.\n\n" +
            "            grid[r][c] = '0'  # Sink this land cell: overwrite '1' -> '0' to mark it visited.\n" +
            "                              # Why: this IS the visited-marker; a sunk cell fails the '1' test above,\n" +
            "                              #      so recursion can never revisit it -> no infinite loop, no double count.\n\n" +
            "            dfs(r + 1, c)  # Recurse DOWN. This call PAUSES the current frame until the neighbour finishes,\n" +
            "                           #             then execution RESUMES here at the next line.\n" +
            "            dfs(r - 1, c)  # Recurse UP.\n" +
            "            dfs(r, c + 1)  # Recurse RIGHT.\n" +
            "            dfs(r, c - 1)  # Recurse LEFT.\n" +
            "                           # These four edges together reach the WHOLE component before dfs(r, c) returns.\n\n" +
            "        # ==================== PHASE 3: SCAN EVERY CELL ====================\n\n" +
            "        for r in range(m):          # Walk every row, top to bottom...\n" +
            "            for c in range(n):      # ...and every column, left to right: each cell is visited exactly once.\n" +
            "                if grid[r][c] == '1':  # Unvisited land the scan has not yet sunk => the first cell of a NEW island.\n" +
            "                    count += 1         # Count that island ONCE, here, before flooding it.\n" +
            "                    dfs(r, c)          # Flood-fill sinks the entire component to '0', so every OTHER cell of\n" +
            "                                       # this island is already '0' when the scan reaches it -> one component,\n" +
            "                                       # one increment. Water ('0') is simply skipped by the if.\n\n" +
            "        return count  # Every cell scanned, every island sunk and counted: hand back the total; nothing runs after.",
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
            "**What it asks.** Produce the same island count, but flood each component with an explicit *queue* so there is no deep recursion. The graph model is unchanged: land cells are **nodes**, 4-directional adjacency gives the **edges**, and an island is a **connected component**. We still scan for the first cell of each island and count it once \u2014 only the traversal mechanism changes.\n\n" +
            "**Why the naive idea fails.** The recursive DFS is correct, but on a huge single island \u2014 up to `300 x 300 = 90,000` connected land cells \u2014 its recursion depth can grow to the size of the component and overflow the call stack. Replacing the implicit call stack with an explicit queue keeps the extra memory bounded to the current frontier and removes that failure mode entirely.\n\n" +
            "**Key Idea.** When the scan finds unvisited land, increment the count, sink that starting cell to `'0'`, and push it onto a queue. Then repeatedly pop a cell from the *front* of the queue and, for each of its four neighbours that is still `'1'`, sink it and enqueue it. Sinking a cell to `'0'` *at the moment it is enqueued* is the visited-check: without it, two different frontier cells could each enqueue the same shared neighbour and it would be processed twice. BFS works because flood-fill only needs to *reach* every connected land cell \u2014 the order is irrelevant, so a queue-driven frontier explores the component just as completely as recursion, but with bounded depth. (The `popleft` gives FIFO order, so cells are visited in expanding rings around the seed.)\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle the empty grid, cache `m` and `n`, and start `count = 0`.\n" +
            "2. Scan every cell `(r, c)`. When `grid[r][c] == '1'`, increment the count, sink it to `'0'`, and seed a `deque` with `(r, c)`.\n" +
            "3. While the queue is non-empty, `popleft` a cell and examine its four neighbours.\n" +
            "4. For each in-bounds neighbour still equal to `'1'`, sink it to `'0'` and append it to the queue.\n" +
            "5. When the queue drains, the island is fully consumed; continue the scan, and return `count` at the end.\n\n" +
            "**Why it works.** Sinking on enqueue makes each land cell enter the queue exactly once, so a component is flooded completely and counted a single time \u2014 identical in outcome to the DFS version, just with an explicit frontier instead of the call stack.\n\n" +
            "**Common Gotchas.**\n" +
            "- Sink cells *on enqueue*, not on dequeue \u2014 sinking at dequeue lets the same cell be appended by several neighbours before it is popped, so duplicates pile into the queue.\n" +
            "- The cells are the string characters `'1'`/`'0'`; compare against the character, not the integer `1`.\n" +
            "- Connectivity is 4-directional only; diagonals do not connect.\n" +
            "- Check bounds *before* indexing `grid[nr][nc]` so an off-grid neighbour never raises.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 every cell is enqueued and processed at most once. Space is the size of the queue frontier, `O(min(m, n))` in the usual analysis, with no deep call stack to worry about.\n\n" +
            "**Interview mindset.** When a grid flood-fill is correct recursively but the grid is large, switch to the queue-based BFS to remove the stack-overflow risk while keeping the same linear time. Stress that marking visited at enqueue time is what keeps the traversal linear.",
          rcs:
            "from typing import List  # List types the grid as a list of lists of str characters.\n" +
            "from collections import deque  # deque is a double-ended queue: O(1) popleft from the front, append to the back.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls numIslands on the object.\n\n" +
            "    def numIslands(self, grid: List[List[str]]) -> int:  # Return the number of '1'-land islands, using a queue not recursion.\n\n" +
            "        # ==================== PHASE 1: MODEL THE GRID AS A GRAPH ====================\n\n" +
            "        # Same implicit graph as the DFS version:\n" +
            "        #   Node   = a land cell ('1').\n" +
            "        #   Edge   = up / down / left / right adjacency between two land cells.\n" +
            "        #   Island = one connected component; counting islands == counting components.\n" +
            "        # Only the traversal changes: an explicit QUEUE floods each component, so depth stays\n" +
            "        # bounded and a 300x300 all-land grid cannot overflow the call stack the way deep recursion would.\n\n" +
            "        if not grid or not grid[0]:  # Guard the empty grid / empty first row.\n" +
            "            return 0                 # No cells => zero islands; nothing below runs.\n\n" +
            "        m, n = len(grid), len(grid[0])  # m = row count, n = column count; cached for the neighbour bounds test.\n" +
            "                                        # State: every cell is addressed by 0 <= r < m and 0 <= c < n.\n" +
            "        count = 0                       # Running island tally; incremented once per NEW component.\n\n" +
            "        # ==================== PHASE 2: SCAN EVERY CELL ====================\n\n" +
            "        for r in range(m):          # Visit every cell exactly once, top-to-bottom...\n" +
            "            for c in range(n):      # ...left-to-right.\n" +
            "                if grid[r][c] == '1':      # Unvisited land => the first cell of a NEW island.\n" +
            "                    count += 1             # Count the island once, right here.\n" +
            "                    grid[r][c] = '0'       # Sink the seed cell immediately: mark visited BEFORE it enters the queue.\n\n" +
            "                    # ==================== PHASE 3: FLOOD-FILL ONE ISLAND (BFS) ====================\n\n" +
            "                    queue = deque([(r, c)])  # Frontier of cells still to expand; seeded with this island's first cell.\n" +
            "                                             # Invariant: every cell sitting in the queue is land we have already sunk.\n" +
            "                    while queue:             # Keep going until the whole component has been drained.\n" +
            "                        cr, cc = queue.popleft()  # Remove the FRONT (oldest) cell -> FIFO order gives ring-by-ring BFS.\n" +
            "                        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):  # The four 4-directional steps: down, up, right, left.\n" +
            "                            nr, nc = cr + dr, cc + dc  # Coordinates of one neighbour of (cr, cc).\n" +
            "                            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == '1':  # In bounds AND still-unsunk land?\n" +
            "                                                                                     # Bounds tested first, so grid[nr][nc] is always safe.\n" +
            "                                grid[nr][nc] = '0'      # Sink it NOW, at enqueue time, not at dequeue.\n" +
            "                                                        # Why on enqueue: two frontier cells can share a neighbour;\n" +
            "                                                        #   marking it here stops that cell entering the queue twice.\n" +
            "                                queue.append((nr, nc))  # Add to the BACK; it will be expanded in a later ring.\n" +
            "                    # Queue empty => this component is fully sunk; the outer scan moves on to find the next island.\n\n" +
            "        return count  # All cells scanned, all islands flooded and counted: return the total; nothing runs after.",
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
            "**What it asks.** Given a list of words sorted lexicographically by an unknown alien alphabet, recover any letter ordering consistent with that sorting, or return `\"\"` if no valid order exists.\n\n" +
            "**Why the naive idea fails.** You can't read the order off a single word \u2014 the ordering information is hidden in how *adjacent* words relate. Brute-forcing every permutation of up to 26 letters (26! orders) to find one consistent with the sorting is astronomically slow. We need to extract the pairwise constraints directly and stitch them into one global order.\n\n" +
            "**Key Idea.** Model letters as graph **nodes** and each derived 'letter X comes before letter Y' as a directed **edge** `X -> Y`, then topologically sort. The constraints come from comparing adjacent words: at the FIRST position where two adjacent words differ, the earlier word's character must precede the later word's character in the alien order \u2014 that single first difference is the only edge that pair yields (later characters tell you nothing). A valid alphabet is any linear order respecting every edge, which is exactly a topological ordering.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Collect every distinct letter as a node; initialize `indegree` to 0 for each and an empty `adj` map where `adj[a]` = letters that must come after `a`.\n" +
            "2. For each adjacent word pair `(w1, w2)`, scan to the first differing character, add edge `w1[i] -> w2[i]` (incrementing `indegree[w2[i]]`), and stop comparing that pair.\n" +
            "3. Guard the prefix trap: if you reach the end of the shorter word with no difference and `w1` is longer than `w2` (e.g. 'abc' before 'ab'), the sorting is impossible \u2014 return `\"\"`.\n" +
            "4. Kahn's BFS: enqueue every letter with `indegree` 0 (nothing must precede it), pop and append to the result, decrementing each neighbor's indegree and enqueuing any that reach 0.\n" +
            "5. If the result contains every distinct letter, return it; otherwise a cycle stranded some letters \u2014 return `\"\"`.\n\n" +
            "**Why it works.** Each edge `a -> b` enforces 'a before b', so any order that places a node only after all its predecessors satisfies every constraint \u2014 which is precisely what Kahn's algorithm does. A cycle (a<b and b<a) means some letters never reach indegree 0, so the output is shorter than the letter count and we correctly report failure. The `visited`/readiness structure here is the `indegree` array plus the queue of indegree-0 letters.\n\n" +
            "**Common Gotchas.**\n" +
            "- Only the FIRST differing character between two adjacent words gives an edge; break immediately after adding it.\n" +
            "- The prefix rule: a longer word before its own prefix is invalid \u2014 check it before assuming 'no difference' means 'no constraint'.\n" +
            "- Include every distinct letter as a node even if it appears in no comparison, or it will be missing from the output.\n" +
            "- Adding the same edge twice inflates indegree \u2014 guard against re-adding a duplicate edge.\n\n" +
            "**Complexity.** Let `C` be the total number of characters across all words. Building the graph is `O(C)`; the topological sort is `O(U + E)` where `U` \u2264 26 letters \u2014 so overall `O(C)` time and `O(1)` extra space for the fixed alphabet (`O(U + E)` in general).\n\n" +
            "**Interview mindset.** 'Recover an ordering from pairwise comparisons' is the signal to build a directed graph of the constraints and topologically sort \u2014 and to remember the two failure modes: a cycle (contradiction) and the prefix-comes-after rule.",
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
            "**What it asks.** Given `n` nodes and a list of undirected edges, decide whether they form a valid **tree** \u2014 a graph that is both connected and contains no cycle.\n\n" +
            "**Why the naive idea fails.** You could run a full DFS/BFS and separately test connectivity and acyclicity, but checking cycles ad hoc is clumsy and easy to get wrong. The cleaner realization is structural: with the right edge count the two conditions collapse into one cheap check.\n\n" +
            "**Key Idea.** A tree on `n` nodes has EXACTLY `n - 1` edges, and given that count, 'connected' and 'acyclic' are equivalent \u2014 so it suffices to confirm `n - 1` edges and that no edge closes a cycle. Model the **nodes** as `0..n-1` and the **edges** as undirected pairs; Union-Find tracks connectivity incrementally. Process each edge and, if its two endpoints already share a root (same component), that edge would create a **cycle** \u2192 not a tree. The `visited`/state structure is `parent[x]`, x's representative root; two nodes are in the same component iff `find` returns the same root.\n\n" +
            "**Why Union-Find fits.** Undirected connectivity plus cycle detection is its canonical use \u2014 each edge either merges two disjoint groups or reveals a cycle by linking two already-connected nodes.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Fast reject: if the number of edges `!= n - 1`, it cannot be a tree \u2014 return false.\n" +
            "2. Initialize `parent[i] = i` so every node is its own singleton set.\n" +
            "3. `find(x)` walks parent pointers to the root using path compression (re-point each node toward its grandparent) so future finds are near-`O(1)`.\n" +
            "4. For each edge `(a, b)`: let `ra = find(a)`, `rb = find(b)`. If `ra == rb` the endpoints are already connected, so this edge closes a cycle \u2014 return false. Otherwise union them (`parent[ra] = rb`).\n" +
            "5. If all edges survive, return true.\n\n" +
            "**Why it works.** Starting from `n` singleton components, each successful union reduces the component count by one. With exactly `n - 1` edges and no cycle-forming edge, all `n - 1` unions succeed, collapsing the `n` singletons into a single connected, acyclic component \u2014 the definition of a tree. If any edge joined two already-connected nodes, a cycle exists; if the edge count is wrong, connectivity and acyclicity cannot both hold.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check the `n - 1` edge count first \u2014 it rejects most non-trees instantly and is what makes 'no cycle => connected' valid.\n" +
            "- `n = 1` with no edges is a valid tree (`0 == n - 1`).\n" +
            "- Path compression (and/or union by rank) keeps `find` near-constant; without it adversarial inputs degrade to `O(n)` per find.\n" +
            "- A cycle in an undirected graph is exactly an edge whose endpoints already share a root.\n\n" +
            "**Complexity.** `O(n + E * \u03b1(n))` \u2248 linear time (\u03b1 is the inverse Ackermann function), `O(n)` space for the parent array. A DFS/BFS from node 0 that checks 'visited all n nodes and never revisits a non-parent' is an equivalent alternative.\n\n" +
            "**Interview mindset.** An undirected graph plus 'is it a tree / any cycle / all connected' is the Union-Find signal \u2014 recall the counting shortcut that a tree on `n` nodes has exactly `n - 1` edges.",
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
            "**What it asks.** Given `n` nodes and undirected edges, count the **connected components** \u2014 the number of maximal groups of mutually reachable nodes.\n\n" +
            "**Why the naive idea fails.** Just counting nodes or edges tells you nothing directly; you must actually determine which nodes reach which. Testing reachability between all pairs would be wasteful. Instead we want to merge nodes into groups as edges arrive and keep a running count.\n\n" +
            "**Key Idea.** Start by assuming every node is isolated: `count = n` separate components. Each edge that links two nodes from DIFFERENT components merges them and reduces `count` by one; an edge between two nodes already in the same component changes nothing. Model the **nodes** as `0..n-1` and the **edges** as undirected pairs; Union-Find maintains the disjoint sets, so decrementing `count` only on a genuine merge yields the answer. The `visited`/state structure is `parent[x]` (root if equal to x) plus `count`; two nodes are in the same component iff they share a root.\n\n" +
            "**Why Union-Find fits.** It is the cleanest way to maintain a running component count as edges stream in \u2014 `find(x)` gives x's representative root and `union` merges two sets in near-constant amortized time.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `parent[i] = i` and `count = n`.\n" +
            "2. `find(x)` follows parent pointers to the root with path compression (flatten each node toward its grandparent) for near-constant lookups.\n" +
            "3. For each edge `(a, b)`: let `ra = find(a)`, `rb = find(b)`. If `ra != rb` it is a real merge \u2014 set `parent[ra] = rb` and decrement `count`.\n" +
            "4. Return `count` after processing all edges.\n\n" +
            "**Why it works.** Each real merge reduces the component count by exactly one, and redundant edges (endpoints already sharing a root) are ignored, so `count` always equals the true number of disjoint sets remaining.\n\n" +
            "**Common Gotchas.**\n" +
            "- Decrement `count` only when `find(a) != find(b)`; decrementing on every edge overcounts merges.\n" +
            "- Isolated nodes count as their own components; with no edges the answer is `n`.\n" +
            "- Use path compression (and/or union by rank) to keep `find` near-`O(1)`.\n" +
            "- Each edge merges at most two components into one, never more.\n\n" +
            "**Complexity.** `O(n + E * \u03b1(n))` \u2248 linear time (\u03b1 = inverse Ackermann), `O(n)` space for the parent array.\n\n" +
            "**Interview mindset.** 'How many separate groups/clusters?' in an undirected graph is the connected-components signal; Union-Find shines when edges stream in and you want a running count.",
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
            "**What it asks.** The same count of connected components, computed with explicit traversal instead of disjoint sets \u2014 handy when you also want to enumerate each group's members.\n\n" +
            "**Why the naive idea fails (the idea itself).** Rather than merging sets, we walk each component once and count how many walks it takes to cover all nodes. It is correct and linear; the only pitfall is re-entering a component that was already counted, which a `visited` set prevents.\n\n" +
            "**Key Idea.** Build an adjacency list from the edges, keep a `visited` set, and scan nodes `0..n-1`. The first time you hit an unvisited node it belongs to a component not yet counted \u2014 increment the count and flood (DFS/BFS) from it, marking every reachable node visited so none of them starts a new count. The **nodes** are `0..n-1` and each undirected **edge** is stored in both directions; `visited` holds every node some component traversal has already reached, and the number of traversals launched equals the number of components.\n\n" +
            "**Why DFS fits.** Reaching all nodes connected to a start node is exactly a depth-first (or breadth-first) traversal over the adjacency edges \u2014 one flood covers one whole component.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `adj[a].append(b)` and `adj[b].append(a)` for every edge (undirected => both directions).\n" +
            "2. Initialize an empty `visited` set and `count = 0`.\n" +
            "3. For each node `i` in `0..n-1` not yet in `visited`: increment `count`, mark `i` visited, and DFS/BFS from `i`, adding every reachable node to `visited`.\n" +
            "4. Return `count`.\n\n" +
            "**Why it works.** Each component is entered exactly once \u2014 by the first of its nodes the outer scan reaches \u2014 and then fully marked, so no component is counted twice and none is missed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Store both directions for each undirected edge, or the traversal misses reachable nodes.\n" +
            "- Mark nodes visited on discovery (when pushed), so the same node isn't enqueued twice.\n" +
            "- Isolated nodes still count \u2014 the outer scan reaches them and launches a one-node traversal.\n" +
            "- A recursive DFS can overflow the stack on a long chain; an explicit stack (as here) or BFS avoids that.\n\n" +
            "**Complexity.** `O(n + E)` time and space \u2014 building the adjacency list and visiting every node and edge once.\n\n" +
            "**Interview mindset.** DFS/BFS from each unvisited node is the explicit alternative to Union-Find, and it lets you list the members of each group, not just count them.",
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
    },

    {
      id: "max-area-of-island",
      lc: 695,
      title: "Max Area of Island",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/max-area-of-island/",
      meta: { pattern: "Connected Components (flood fill)", dataStructure: "Grid as implicit graph", technique: "DFS/BFS area count" },
      description:
        "You are given an `m x n` binary matrix `grid`. An **island** is a maximal group of `1`s connected **4-directionally** (horizontal or vertical). You may assume all four edges of the grid are surrounded by water (`0`).\n\n" +
        "The **area** of an island is the number of cells with value `1` in it. Return the **maximum** area of an island in `grid`. If there is no island, return `0`.",
      constraints: [
        "`m == grid.length`, `n == grid[i].length`",
        "`1 <= m, n <= 50`",
        "`grid[i][j]` is `0` or `1` (integers, not characters)."
      ],
      notes: [
        "Same shape as Number of Islands, but instead of *counting* components you measure the *size* of each and keep the maximum.",
        "Connectivity is 4-directional only; diagonal touches do NOT join two islands.",
        "Cells here are integers `0`/`1`, so compare against `1` not `'1'`."
      ],
      examples: [
        {
          input: "grid = [[0,0,1,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,1,0,0,0]]",
          output: "3",
          reasoning: "The largest island is the L-shaped group of 3 cells at the bottom-left; the lone 1 at top has area 1.",
          visual: "```\n0 0 1 0 0     top 1: area 1\n0 0 0 0 0\n0 1 1 0 0     bottom blob:\n0 1 0 0 0       (2,1)(2,2)(3,1) = area 3\n=> max area 3\n```"
        },
        {
          input: "grid = [[0,0,0,0,0,0,0,0]]",
          output: "0",
          reasoning: "No land at all, so the maximum area is 0."
        },
        {
          input: "grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,0,1,1],[0,0,0,1,1]]",
          output: "4",
          reasoning: "Two separate 2x2 blocks, each of area 4; the maximum is 4.",
          visual: "```\n1 1 0 0 0\n1 1 0 0 0     block A = 4\n0 0 0 1 1\n0 0 0 1 1     block B = 4\n=> max area 4\n```"
        },
        {
          input: "grid = [[1,0,1],[0,1,0],[1,0,1]]",
          output: "1",
          reasoning: "Diagonal land does not connect, so every island is a single cell of area 1."
        }
      ],
      approaches: [
        {
          name: "DFS flood fill returning area",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "The default: measuring the size of each connected region; concise recursion that returns a cell count and sinks land as it goes.",
          logic:
            "**What it asks.** Find the largest island by cell count in a binary grid, where an island is a maximal group of `1`s connected up/down/left/right.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are land cells (value `1`); an **edge** connects two land cells that are vertically or horizontally adjacent. An **island is a connected component**, so we are computing the size of each component and taking the maximum.\n\n" +
            "**Why the naive idea fails.** You can't just tally `1`s \u2014 that gives the total land, not the size of any single island. And rescanning to test which counted cells belong together wastes work. We must discover each component once, measure it, and mark its cells so they are never remeasured.\n\n" +
            "**Key Idea.** Scan every cell; the first time you hit unvisited land you've found a new island, so flood-fill (DFS) its whole component and have the flood *return the number of cells it consumed*. Compare that area against a running maximum. The flood is a connected-component traversal that both measures and marks.\n\n" +
            "**Why DFS fits.** Reaching every land cell connected to a start cell is precisely a depth-first traversal over the adjacency edges, and recursion naturally sums subresults \u2014 each call returns `1 + area of its four neighbors`. The `visited` marker is the grid itself: sink each visited `1` to `0` so it is neither remeasured nor recounted.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Iterate over every cell `(r, c)`.\n" +
            "2. When `grid[r][c] == 1`, call `dfs(r, c)` and update `best = max(best, dfs result)`.\n" +
            "3. `dfs` returns `0` if out of bounds or on water/visited (`!= 1`); otherwise it sinks the cell to `0` and returns `1 +` the areas of the four neighbors.\n" +
            "4. Return `best` after the full scan.\n\n" +
            "**Why it works.** Each land cell is flooded exactly once \u2014 by the first scan that reaches its island \u2014 so each component contributes its true size once, and sinking guarantees the outer loop never re-enters an already-measured island.\n\n" +
            "**Common Gotchas.**\n" +
            "- Cells are integers `1`/`0`, not the string characters \u2014 compare against `1`.\n" +
            "- The base case must return `0` (not `None`) so the `1 + sum` arithmetic works.\n" +
            "- Connectivity is 4-directional only; diagonals do NOT join islands.\n" +
            "- On a grid that is one giant island the recursion depth reaches `m*n` \u2014 the reason a BFS variant exists.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 each cell examined a constant number of times. Space `O(m*n)` worst-case recursion depth (a single grid-filling island).\n\n" +
            "**Interview mindset.** 'Largest / size of a region in a grid' with 4-directional adjacency is flood fill that RETURNS a count \u2014 the same connected-components traversal as Number of Islands, but you track a max area instead of a component tally.",
          rcs:
            "class Solution:\n" +
            "    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != 1:\n" +
            "                return 0                      # Out of bounds or water/visited: contributes 0.\n" +
            "            grid[r][c] = 0                    # Sink this land so it isn't recounted.\n" +
            "            return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)\n" +
            "\n" +
            "        best = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 1:           # New unvisited land => a new island.\n" +
            "                    best = max(best, dfs(r, c))  # Measure it, keep the biggest.\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or grid[r][c] != 1:\n" +
            "                return 0\n" +
            "            grid[r][c] = 0\n" +
            "            return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)\n" +
            "\n" +
            "        best = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 1:\n" +
            "                    best = max(best, dfs(r, c))\n" +
            "        return best"
        },
        {
          name: "BFS flood fill (queue)",
          time: "O(m*n)",
          space: "O(min(m, n))",
          whenToUse: "When the grid could be large and deep recursion risks a stack overflow; iterative area count with a queue.",
          logic:
            "**What it asks.** The same maximum island area, produced with an explicit queue so there is no deep recursion.\n\n" +
            "**Graph modeling.** Unchanged: **nodes** are land cells, **edges** are 4-directional adjacency, an island is a connected component. We scan for the first cell of each island, then flood the component with a **queue**, counting cells as we go.\n\n" +
            "**Why the naive idea fails.** The recursive DFS is correct but on a single large island its recursion depth can overflow the stack. An iterative BFS keeps memory to the frontier and sidesteps that entirely.\n\n" +
            "**Key Idea.** On finding unvisited land, sink it to `0`, seed a queue with it, and initialize `area = 0`. Pop cells one at a time, incrementing `area`, and enqueue each still-`1` neighbor \u2014 sinking it *at enqueue time*. Marking on enqueue is the visited check: without it two neighbors could enqueue the same cell and it would be counted twice.\n\n" +
            "**Why BFS fits.** Measuring a component only needs every connected land cell reached; order is irrelevant, so a queue-driven frontier covers the island just as completely as recursion, with bounded depth.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Iterate over every cell `(r, c)`.\n" +
            "2. When `grid[r][c] == 1`, sink it, seed a queue with `(r, c)`, and set `area = 0`.\n" +
            "3. While the queue is non-empty, pop a cell, add `1` to `area`, and for each in-bounds neighbor still equal to `1`, sink it and enqueue it.\n" +
            "4. Update `best = max(best, area)` and continue the scan; return `best`.\n\n" +
            "**Why it works.** Sinking on enqueue makes each land cell enter the queue exactly once, so a component's `area` counts each of its cells a single time \u2014 identical in outcome to the DFS version.\n\n" +
            "**Common Gotchas.**\n" +
            "- Sink cells on enqueue, not on dequeue \u2014 otherwise duplicates enter the queue and inflate the area.\n" +
            "- Count the seed cell too (it is popped and adds 1), so start `area` at 0 and increment per pop.\n" +
            "- Cells are integers `1`/`0`; 4-directional adjacency only.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 every cell processed once. Space is the queue frontier, `O(min(m, n))` in the usual analysis \u2014 no deep call stack.\n\n" +
            "**Interview mindset.** When a grid flood-fill is correct recursively but the grid could be large, switch to the queue-based BFS to remove stack-overflow risk while keeping linear time.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        best = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 1:           # Start of a new island.\n" +
            "                    grid[r][c] = 0            # Sink immediately (mark visited).\n" +
            "                    queue = deque([(r, c)])\n" +
            "                    area = 0\n" +
            "                    while queue:\n" +
            "                        cr, cc = queue.popleft()\n" +
            "                        area += 1            # Count this cell.\n" +
            "                        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                            nr, nc = cr + dr, cc + dc\n" +
            "                            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:\n" +
            "                                grid[nr][nc] = 0   # Sink on enqueue to avoid duplicates.\n" +
            "                                queue.append((nr, nc))\n" +
            "                    best = max(best, area)\n" +
            "        return best",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        best = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 1:\n" +
            "                    grid[r][c] = 0\n" +
            "                    queue = deque([(r, c)])\n" +
            "                    area = 0\n" +
            "                    while queue:\n" +
            "                        cr, cc = queue.popleft()\n" +
            "                        area += 1\n" +
            "                        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                            nr, nc = cr + dr, cc + dc\n" +
            "                            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:\n" +
            "                                grid[nr][nc] = 0\n" +
            "                                queue.append((nr, nc))\n" +
            "                    best = max(best, area)\n" +
            "        return best"
        }
      ],
      patternRecognition: [
        "'Largest / size of a region in a grid' => flood fill that RETURNS a cell count, not just a tally.",
        "4-directional adjacency on a 2D grid => implicit graph, DFS or BFS.",
        "Track a running max area across components; sink visited land so each is measured once."
      ],
      interviewRecall: [
        "DFS returns 1 + area of the four neighbors; base case returns 0 for out-of-bounds/water.",
        "Sink each visited 1 to 0 so no cell is counted twice; cells here are integers, not '1'.",
        "Same skeleton as Number of Islands \u2014 keep a max area instead of incrementing a count."
      ]
    },

    {
      id: "surrounded-regions",
      lc: 130,
      title: "Surrounded Regions",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/surrounded-regions/",
      meta: { pattern: "Border-anchored flood fill", dataStructure: "Grid as implicit graph", technique: "DFS/BFS from border, then flip" },
      description:
        "Given an `m x n` matrix `board` containing `'X'` and `'O'`, **capture** all regions that are 4-directionally **surrounded** by `'X'`.\n\n" +
        "A region is captured by flipping all `'O'`s into `'X'`s in that surrounded region. An `'O'` is **safe** (never captured) if it is connected \u2014 4-directionally, through other `'O'`s \u2014 to an `'O'` on the **border** of the board. Modify the board **in place**.",
      constraints: [
        "`m == board.length`, `n == board[i].length`",
        "`1 <= m, n <= 200`",
        "`board[i][j]` is `'X'` or `'O'`."
      ],
      notes: [
        "The key insight: only `'O'`s connected to the border survive; every other `'O'` is surrounded and gets captured.",
        "Any `'O'` on an edge, plus everything reachable from it through `'O'`s, is safe.",
        "This is easier to solve by finding the SAFE cells (border-anchored) than by trying to detect enclosure directly."
      ],
      examples: [
        {
          input: 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
          output: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
          reasoning: "The interior O region (1,1)(1,2)(2,2) is fully surrounded and captured. The O at (3,1) touches the bottom border, so it survives.",
          visual:
            "```\nX X X X          X X X X\nX O O X   =>     X X X X\nX X O X          X X X X\nX O X X          X O X X   <- (3,1) touches border, stays O\n```"
        },
        {
          input: 'board = [["X"]]',
          output: '[["X"]]',
          reasoning: "No O cells, nothing to capture."
        },
        {
          input: 'board = [["O","O"],["O","O"]]',
          output: '[["O","O"],["O","O"]]',
          reasoning: "Every O is on the border, so all are safe \u2014 nothing is captured."
        },
        {
          input: 'board = [["X","X","X"],["X","O","X"],["X","X","X"]]',
          output: '[["X","X","X"],["X","X","X"],["X","X","X"]]',
          reasoning: "The single interior O is completely surrounded and flips to X."
        }
      ],
      approaches: [
        {
          name: "DFS from the border (mark safe, then flip)",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "The expected solution: when 'enclosed' is hard to test directly, flood from the border to mark what is NOT enclosed.",
          logic:
            "**What it asks.** Flip every `'O'` region that is completely surrounded by `'X'` into `'X'`, in place \u2014 leaving only the `'O'` regions that touch (or connect to) the border.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are `'O'` cells; an **edge** connects two `'O'`s that are 4-directionally adjacent. An `'O'` region is a connected component of `'O'`s, and a region is 'safe' exactly when its component includes a border cell.\n\n" +
            "**Why the naive idea fails.** Trying to test each region for enclosure directly \u2014 'does this blob touch any edge?' \u2014 forces you to explore a region and then decide, and it is fiddly to flip only the enclosed ones without accidentally capturing a border-connected region mid-search. The relationship is easier read the other way around.\n\n" +
            "**Border-anchoring insight (Key Idea).** Turn the problem inside out: instead of hunting for surrounded regions, find the SAFE ones. Every `'O'` on the border cannot be captured, and neither can any `'O'` reachable from a border `'O'` through other `'O'`s. So flood-fill from every border `'O'`, marking all reached cells as safe (e.g. a temporary `'#'`). After that sweep, any cell still `'O'` is genuinely surrounded \u2014 flip it to `'X'` \u2014 and every `'#'` is restored to `'O'`. This converts a hard 'is it enclosed?' test into an easy reachability flood from a known-safe frontier.\n\n" +
            "**Why DFS fits.** Reaching all `'O'`s connected to a border `'O'` is a depth-first traversal over the adjacency edges. The temporary `'#'` marker doubles as the `visited` structure \u2014 a cell marked `'#'` is both 'safe' and 'already processed', so the flood terminates.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For every cell on the four borders that is `'O'`, launch a DFS.\n" +
            "2. `dfs` returns immediately if out of bounds or the cell is not `'O'`; otherwise mark it `'#'` (safe) and recurse into the four neighbors.\n" +
            "3. After all border floods finish, scan the entire board: flip each remaining `'O'` to `'X'` (it was unreachable from any border, hence surrounded), and revert each `'#'` back to `'O'`.\n\n" +
            "**Why it works.** A region is captured iff none of its cells is on the border. The border flood marks precisely the border-connected component of `'O'`s as `'#'`; whatever stays `'O'` is in no such component, so it is fully enclosed and correctly flipped. Reverting `'#'` restores the safe cells untouched.\n\n" +
            "**Common Gotchas.**\n" +
            "- Anchor the flood at the BORDER, not the interior \u2014 flooding from interior `'O'`s captures nothing useful.\n" +
            "- Use a distinct temporary marker (`'#'`) so the final pass can tell 'safe' from 'to-capture'; do not flip during the flood.\n" +
            "- Do the flip and the revert in the SAME final scan, after every border flood completes.\n" +
            "- A recursive DFS can overflow the stack on a 200x200 all-`'O'` board \u2014 the reason a BFS variant exists.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 each cell is visited a constant number of times across the floods and the final scan. Space `O(m*n)` worst-case recursion depth.\n\n" +
            "**Interview mindset.** When 'is this region enclosed / trapped?' is awkward to test directly, flip it: flood from the border to mark everything that ESCAPES, then whatever is left is trapped. The same reverse-from-the-target trick as Pacific Atlantic.",
          rcs:
            "class Solution:\n" +
            "    def solve(self, board: List[List[str]]) -> None:\n" +
            "        if not board or not board[0]:\n" +
            "            return\n" +
            "        m, n = len(board), len(board[0])\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != 'O':\n" +
            "                return                        # Off board or not an O: stop.\n" +
            "            board[r][c] = '#'                 # Mark border-connected O as safe (also visited).\n" +
            "            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)\n" +
            "\n" +
            "        for r in range(m):                    # Left and right border columns.\n" +
            "            dfs(r, 0); dfs(r, n - 1)\n" +
            "        for c in range(n):                    # Top and bottom border rows.\n" +
            "            dfs(0, c); dfs(m - 1, c)\n" +
            "\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if board[r][c] == 'O':        # Unreached O => surrounded => capture.\n" +
            "                    board[r][c] = 'X'\n" +
            "                elif board[r][c] == '#':      # Safe O => restore.\n" +
            "                    board[r][c] = 'O'",
          plain:
            "class Solution:\n" +
            "    def solve(self, board: List[List[str]]) -> None:\n" +
            "        if not board or not board[0]:\n" +
            "            return\n" +
            "        m, n = len(board), len(board[0])\n" +
            "\n" +
            "        def dfs(r, c):\n" +
            "            if r < 0 or r >= m or c < 0 or c >= n or board[r][c] != 'O':\n" +
            "                return\n" +
            "            board[r][c] = '#'\n" +
            "            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)\n" +
            "\n" +
            "        for r in range(m):\n" +
            "            dfs(r, 0); dfs(r, n - 1)\n" +
            "        for c in range(n):\n" +
            "            dfs(0, c); dfs(m - 1, c)\n" +
            "\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if board[r][c] == 'O':\n" +
            "                    board[r][c] = 'X'\n" +
            "                elif board[r][c] == '#':\n" +
            "                    board[r][c] = 'O'"
        },
        {
          name: "BFS from the border (queue)",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "When the board is large and deep recursion could overflow the stack; the same border-anchoring with an explicit queue.",
          logic:
            "**What it asks.** The same capture, produced with an explicit queue so there is no deep recursion.\n\n" +
            "**Graph modeling.** Unchanged: **nodes** are `'O'` cells, **edges** are 4-directional `'O'`-to-`'O'` adjacency, and a region is safe iff it connects to a border `'O'`. We still mark the border-connected component as `'#'`, but expand it with a **queue** instead of the call stack.\n\n" +
            "**Why the naive idea fails.** The recursive border DFS is correct, but on a 200x200 board that is essentially all `'O'` the recursion depth can overflow the stack. Multi-source BFS from the border keeps memory to the frontier.\n\n" +
            "**Key Idea (same border anchoring).** Seed a queue with EVERY border `'O'` at once (multi-source), marking each `'#'` as it is enqueued. Repeatedly pop a cell and enqueue its `'O'` neighbors, marking them `'#'` on enqueue \u2014 that mark is the visited check, so each safe cell enters the queue once. Then the same final scan flips leftover `'O'` to `'X'` and reverts `'#'` to `'O'`.\n\n" +
            "**Why BFS fits.** Marking the border-connected component needs every such `'O'` reached; order is irrelevant, so a queue-driven frontier covers it just as completely as recursion, without deep stacks.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Enqueue every border cell that is `'O'`, marking each `'#'` immediately.\n" +
            "2. While the queue is non-empty, pop a cell and, for each in-bounds `'O'` neighbor, mark it `'#'` and enqueue it.\n" +
            "3. Scan the whole board: flip each remaining `'O'` to `'X'` and revert each `'#'` to `'O'`.\n\n" +
            "**Why it works.** The multi-source flood reaches exactly the border-connected `'O'`s (marking them safe), so anything still `'O'` afterward is enclosed and captured \u2014 identical in outcome to the DFS version.\n\n" +
            "**Common Gotchas.**\n" +
            "- Mark `'#'` on enqueue, not on dequeue \u2014 otherwise a cell can be enqueued twice.\n" +
            "- Seed the queue with the ENTIRE border, then do the flip/revert in the final scan only.\n" +
            "- Use a temporary marker distinct from `'O'`/`'X'` so the last pass can distinguish safe from captured.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 every cell processed once. Space `O(m*n)` for the queue in the worst case.\n\n" +
            "**Interview mindset.** Same border-anchoring insight, iterative form: when the region flood could be deep, seed a multi-source BFS from the border instead of recursing.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def solve(self, board: List[List[str]]) -> None:\n" +
            "        if not board or not board[0]:\n" +
            "            return\n" +
            "        m, n = len(board), len(board[0])\n" +
            "        queue = deque()\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if (r in (0, m - 1) or c in (0, n - 1)) and board[r][c] == 'O':\n" +
            "                    board[r][c] = '#'         # Border O is safe; mark on enqueue.\n" +
            "                    queue.append((r, c))\n" +
            "        while queue:\n" +
            "            r, c = queue.popleft()\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and board[nr][nc] == 'O':\n" +
            "                    board[nr][nc] = '#'       # Reachable from border => safe.\n" +
            "                    queue.append((nr, nc))\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if board[r][c] == 'O':        # Enclosed => capture.\n" +
            "                    board[r][c] = 'X'\n" +
            "                elif board[r][c] == '#':      # Safe => restore.\n" +
            "                    board[r][c] = 'O'",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def solve(self, board: List[List[str]]) -> None:\n" +
            "        if not board or not board[0]:\n" +
            "            return\n" +
            "        m, n = len(board), len(board[0])\n" +
            "        queue = deque()\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if (r in (0, m - 1) or c in (0, n - 1)) and board[r][c] == 'O':\n" +
            "                    board[r][c] = '#'\n" +
            "                    queue.append((r, c))\n" +
            "        while queue:\n" +
            "            r, c = queue.popleft()\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and board[nr][nc] == 'O':\n" +
            "                    board[nr][nc] = '#'\n" +
            "                    queue.append((nr, nc))\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if board[r][c] == 'O':\n" +
            "                    board[r][c] = 'X'\n" +
            "                elif board[r][c] == '#':\n" +
            "                    board[r][c] = 'O'"
        }
      ],
      patternRecognition: [
        "'Capture / enclosed / trapped regions' => flip it: flood from the border to mark what ESCAPES.",
        "Whatever the border flood does NOT reach is the enclosed set to transform.",
        "Use a temporary marker for safe cells, then a final scan to flip and revert."
      ],
      interviewRecall: [
        "Border-anchoring: only O's connected to a border O survive; everything else is captured.",
        "Mark border-reachable O's as '#', then flip leftover O->X and revert '#'->O in one scan.",
        "DFS is concise; multi-source BFS from the border avoids stack overflow on big boards."
      ]
    },

    {
      id: "rotting-oranges",
      lc: 994,
      title: "Rotting Oranges",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/rotting-oranges/",
      meta: { pattern: "Multi-source BFS (level-order)", dataStructure: "Grid as implicit graph", technique: "Simultaneous BFS counting minutes" },
      description:
        "You are given an `m x n` grid where each cell is `0` (empty), `1` (a **fresh** orange), or `2` (a **rotten** orange).\n\n" +
        "Each minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the **minimum number of minutes** that must elapse until no cell has a fresh orange. If this is impossible (some fresh orange can never be reached), return `-1`.",
      constraints: [
        "`m == grid.length`, `n == grid[i].length`",
        "`1 <= m, n <= 10`",
        "`grid[i][j]` is `0`, `1`, or `2`."
      ],
      notes: [
        "All currently-rotten oranges spread at the SAME time each minute \u2014 this is why it is multi-source BFS, not one BFS per source.",
        "The elapsed minutes equal the number of BFS levels after the initial one.",
        "If any fresh orange remains after the BFS drains, it was unreachable => return -1.",
        "If there are no fresh oranges to begin with, the answer is 0."
      ],
      examples: [
        {
          input: "grid = [[2,1,1],[1,1,0],[0,1,1]]",
          output: "4",
          reasoning: "Rot spreads outward from (0,0) one ring per minute; the last fresh orange at (2,2) rots at minute 4.",
          visual:
            "```\nmin 0:  2 1 1     min 1:  2 2 1     ...     min 4:  2 2 2\n        1 1 0             2 1 0                     2 2 0\n        0 1 1             0 1 1                     0 2 2\nfront expands one ring per minute => 4 minutes\n```"
        },
        {
          input: "grid = [[2,1,1],[0,1,1],[1,0,1]]",
          output: "-1",
          reasoning: "The orange at (2,0) is isolated by empty cells and can never rot, so it is impossible.",
          visual: "```\n2 1 1\n0 1 1\n1 0 1   <- (2,0) is boxed off by 0s => never rots => -1\n```"
        },
        {
          input: "grid = [[0,2]]",
          output: "0",
          reasoning: "No fresh oranges exist, so zero minutes are needed."
        },
        {
          input: "grid = [[1]]",
          output: "-1",
          reasoning: "A single fresh orange with no rotten source can never rot."
        }
      ],
      approaches: [
        {
          name: "Multi-source BFS (level-order)",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "The canonical multi-source BFS: many sources spread simultaneously and you need the time for everything to be reached.",
          logic:
            "**What it asks.** Find the number of minutes until every fresh orange has rotted, where each minute rot spreads from every rotten orange to its fresh 4-directional neighbors \u2014 or `-1` if some fresh orange can never be reached.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are orange cells; an **edge** connects two 4-directionally adjacent oranges. 'Minutes to rot' is the **shortest distance** from the nearest initially-rotten orange, measured in edges \u2014 and the answer is the MAXIMUM such distance over all fresh oranges.\n\n" +
            "**Why the naive idea fails.** Running a separate BFS from each rotten orange and combining distances is wasteful and error-prone, and simulating minute-by-minute with full grid rescans is clumsy. Because ALL rotten oranges spread at once, the frontiers should advance together in lockstep.\n\n" +
            "**Key Idea.** Seed a BFS queue with EVERY initially-rotten orange at once (multi-source), and process the queue **level by level** \u2014 each level is one minute. All cells enqueued so far rot their fresh neighbors simultaneously; those newly-rotten cells form the next level. The number of levels processed after the initial seeding is the elapsed minutes. Track a `fresh` counter, decrementing it as each fresh orange rots; if it hits `0` everything was reached, and if any remains the answer is `-1`. The `visited` structure is the grid itself \u2014 a cell set to `2` is 'already rotten', so it is never reprocessed.\n\n" +
            "**Why multi-source BFS fits.** Simultaneous spread from many equivalent sources with 'time = distance' is exactly what a level-order BFS seeded with all sources computes \u2014 one shared frontier expands one ring per minute, giving each fresh orange its true shortest time to rot.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan the grid: enqueue every rotten orange `(r, c)` and count the `fresh` oranges.\n" +
            "2. If `fresh == 0`, return `0` immediately (nothing to rot).\n" +
            "3. BFS in levels: while the queue is non-empty and fresh remain, process the whole current level \u2014 for each cell, rot each fresh neighbor (set it to `2`), decrement `fresh`, and enqueue it. After the level, increment `minutes`.\n" +
            "4. Return `minutes` if `fresh == 0`, else `-1` (some fresh orange was unreachable).\n\n" +
            "**Why it works.** Level `k` of a multi-source BFS holds exactly the cells at shortest distance `k` from the nearest source, so an orange rots at the minute equal to its distance from the closest rotten orange \u2014 and the last level processed equals the maximum such distance, the total time. Any fresh orange in a component with no rotten orange is never enqueued, so `fresh` stays positive and we report `-1`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Seed the queue with ALL rotten oranges before starting \u2014 the 'simultaneous' rule is the whole point.\n" +
            "- Advance minutes per LEVEL, not per cell; process a snapshot of the current queue size each round.\n" +
            "- Handle `fresh == 0` up front so an all-empty or all-rotten grid returns `0`, not an off-by-one.\n" +
            "- Mark a fresh orange rotten (set `2`) when you enqueue it, so it isn't counted or spread twice.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 each cell enqueued and processed at most once. Space `O(m*n)` for the queue in the worst case.\n\n" +
            "**Interview mindset.** 'Spread / infect / fill from multiple starting points at once, how long until everything is covered?' is the multi-source BFS signal \u2014 seed all sources, expand level by level, and count levels.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def orangesRotting(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        queue = deque()\n" +
            "        fresh = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 2:\n" +
            "                    queue.append((r, c))      # Seed every rotten orange (multi-source).\n" +
            "                elif grid[r][c] == 1:\n" +
            "                    fresh += 1                # Count what must still rot.\n" +
            "        if fresh == 0:\n" +
            "            return 0                          # Nothing fresh => 0 minutes.\n" +
            "        minutes = 0\n" +
            "        while queue and fresh > 0:\n" +
            "            minutes += 1                      # One BFS level = one minute.\n" +
            "            for _ in range(len(queue)):       # Process this whole level at once.\n" +
            "                r, c = queue.popleft()\n" +
            "                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:\n" +
            "                        grid[nr][nc] = 2      # Rot it (and mark visited).\n" +
            "                        fresh -= 1\n" +
            "                        queue.append((nr, nc))\n" +
            "        return minutes if fresh == 0 else -1  # Leftover fresh => unreachable.",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def orangesRotting(self, grid: List[List[int]]) -> int:\n" +
            "        m, n = len(grid), len(grid[0])\n" +
            "        queue = deque()\n" +
            "        fresh = 0\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if grid[r][c] == 2:\n" +
            "                    queue.append((r, c))\n" +
            "                elif grid[r][c] == 1:\n" +
            "                    fresh += 1\n" +
            "        if fresh == 0:\n" +
            "            return 0\n" +
            "        minutes = 0\n" +
            "        while queue and fresh > 0:\n" +
            "            minutes += 1\n" +
            "            for _ in range(len(queue)):\n" +
            "                r, c = queue.popleft()\n" +
            "                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                    nr, nc = r + dr, c + dc\n" +
            "                    if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1:\n" +
            "                        grid[nr][nc] = 2\n" +
            "                        fresh -= 1\n" +
            "                        queue.append((nr, nc))\n" +
            "        return minutes if fresh == 0 else -1"
        }
      ],
      patternRecognition: [
        "'Everything spreads simultaneously, how long until all covered?' => multi-source BFS, count levels.",
        "Seed the queue with ALL sources at once, then expand the shared frontier one ring per minute.",
        "Track a fresh/remaining counter; if any is left after the BFS drains, return -1."
      ],
      interviewRecall: [
        "Level-order BFS: one level = one minute; process len(queue) cells per round.",
        "Handle no-fresh up front (answer 0); leftover fresh after the BFS => -1.",
        "Set a fresh orange to rotten on enqueue so it isn't spread or counted twice."
      ]
    },

    {
      id: "walls-and-gates",
      lc: 286,
      title: "Walls and Gates",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/walls-and-gates/",
      meta: { pattern: "Multi-source BFS (shortest distance)", dataStructure: "Grid as implicit graph", technique: "BFS from all gates at once" },
      description:
        "You are given an `m x n` grid `rooms` initialized with three possible values:\n\n" +
        "- `-1` \u2014 a **wall** or obstacle.\n" +
        "- `0` \u2014 a **gate**.\n" +
        "- `2147483647` (`INF`) \u2014 an **empty room** (this is 2^31 - 1, used to mean infinity).\n\n" +
        "Fill each empty room with the distance to its **nearest gate**, moving 4-directionally. If an empty room cannot reach any gate, leave it as `INF`. Modify the grid **in place**.\n\n" +
        "_(This is a LeetCode premium problem; the statement above is the standard formulation.)_",
      constraints: [
        "`m == rooms.length`, `n == rooms[i].length`",
        "`1 <= m, n <= 250`",
        "`rooms[i][j]` is `-1`, `0`, or `2147483647`."
      ],
      notes: [
        "`INF = 2147483647` marks an empty room; walls are `-1`; gates are `0`.",
        "Distance is the number of 4-directional steps; a room right beside a gate gets `1`.",
        "Running one BFS per gate would be O(gates * m * n); a single multi-source BFS from all gates at once is O(m * n)."
      ],
      examples: [
        {
          input: "rooms = [[INF,-1,0,INF],[INF,INF,INF,-1],[INF,-1,INF,-1],[0,-1,INF,INF]]",
          output: "[[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]",
          reasoning: "Each empty room is filled with its shortest 4-directional distance to the nearest of the two gates.",
          visual:
            "```\n INF  -1   0  INF          3  -1   0   1\n INF INF INF  -1     =>     2   2   1  -1\n INF  -1 INF  -1            1  -1   2  -1\n  0   -1 INF INF            0  -1   3   4\n(-1 = wall, 0 = gate, numbers = steps to nearest gate)\n```"
        },
        {
          input: "rooms = [[-1]]",
          output: "[[-1]]",
          reasoning: "A single wall; nothing to fill."
        },
        {
          input: "rooms = [[0]]",
          output: "[[0]]",
          reasoning: "A single gate; distance to itself is 0."
        },
        {
          input: "rooms = [[INF]]",
          output: "[[INF]]",
          reasoning: "One empty room with no gate reachable \u2014 stays INF."
        }
      ],
      approaches: [
        {
          name: "Multi-source BFS from all gates",
          time: "O(m*n)",
          space: "O(m*n)",
          whenToUse: "Shortest distance from EACH cell to the nearest of many targets => one BFS seeded with all targets, not one per target.",
          logic:
            "**What it asks.** Fill every empty room with the number of 4-directional steps to the closest gate, leaving unreachable rooms as `INF`, modifying the grid in place.\n\n" +
            "**Graph modeling.** The grid is an implicit graph: **nodes** are non-wall cells; an **edge** connects two 4-directionally adjacent non-wall cells. Each empty room's answer is its **shortest distance to the nearest gate** \u2014 a shortest-path-in-an-unweighted-graph query, from every cell to a set of targets (the gates).\n\n" +
            "**Why the naive idea fails.** BFS from every empty room to find its nearest gate reprocesses the grid once per room \u2014 far too slow. Even BFS from each gate separately costs `O(gates * m * n)` and needs distance-merging. The efficient move is to compute all nearest-gate distances in a single pass.\n\n" +
            "**Key Idea.** Reverse the direction and go multi-source: instead of searching from each room to a gate, flood OUTWARD from ALL gates simultaneously. Seed a BFS queue with every gate (all at distance `0`) and expand level by level; the first time the flood reaches an empty room, that room is at its shortest distance from SOME gate \u2014 necessarily the nearest, because BFS explores in nondecreasing distance order. Because all gates share one frontier, each room is claimed by whichever gate reaches it first. A room stays `INF` iff no flood ever reaches it. The `visited` structure is the grid itself: an empty room still equal to `INF` is unvisited; once assigned a finite distance it is 'done' and never reprocessed.\n\n" +
            "**Why multi-source BFS fits.** 'Nearest of many targets' for every cell is exactly a BFS seeded with all targets at once \u2014 the merged frontier assigns each cell the minimum distance to any source in a single linear sweep, and BFS's level order guarantees the first assignment is the smallest.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan the grid and enqueue every gate `(r, c)` (value `0`). Gates already hold distance `0`.\n" +
            "2. While the queue is non-empty, pop a cell `(r, c)` with its known distance `d = rooms[r][c]`.\n" +
            "3. For each 4-directional neighbor that is still `INF` (an unvisited empty room), set it to `d + 1` and enqueue it.\n" +
            "4. Walls (`-1`) and already-assigned rooms are skipped by the `== INF` check. When the queue drains, every reachable room holds its nearest-gate distance.\n\n" +
            "**Why it works.** A multi-source BFS processes cells in nondecreasing distance from the closest source, so when a room is first dequeued-into and assigned `d + 1`, no shorter path from any gate exists \u2014 that value is the true minimum. Rooms in a component with no gate are never reached and correctly remain `INF`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Seed with ALL gates before the loop \u2014 one BFS per gate defeats the purpose and is slower.\n" +
            "- The `== INF` test doubles as the visited check; it naturally skips walls (`-1`) and rooms already assigned a smaller distance, so never overwrite them.\n" +
            "- Set the neighbor's distance when you ENQUEUE it, not when you pop it, or a room can be enqueued by two gates and get the larger value.\n" +
            "- `INF` is exactly `2147483647`; compare against it explicitly.\n\n" +
            "**Complexity.** Time `O(m*n)` \u2014 each cell is enqueued and assigned at most once. Space `O(m*n)` for the queue in the worst case.\n\n" +
            "**Interview mindset.** 'Distance from every cell to the nearest of several sources' in an unweighted grid is the multi-source BFS signal \u2014 seed all sources at distance 0 and let one flood assign every cell its minimum.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def wallsAndGates(self, rooms: List[List[int]]) -> None:\n" +
            "        if not rooms or not rooms[0]:\n" +
            "            return\n" +
            "        INF = 2147483647\n" +
            "        m, n = len(rooms), len(rooms[0])\n" +
            "        queue = deque()\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if rooms[r][c] == 0:          # Seed EVERY gate (all distance 0).\n" +
            "                    queue.append((r, c))\n" +
            "        while queue:\n" +
            "            r, c = queue.popleft()\n" +
            "            d = rooms[r][c]                   # Distance already assigned to this cell.\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:\n" +
            "                    rooms[nr][nc] = d + 1     # First flood to reach it = nearest gate.\n" +
            "                    queue.append((nr, nc))    # Assign on enqueue (also marks visited).",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def wallsAndGates(self, rooms: List[List[int]]) -> None:\n" +
            "        if not rooms or not rooms[0]:\n" +
            "            return\n" +
            "        INF = 2147483647\n" +
            "        m, n = len(rooms), len(rooms[0])\n" +
            "        queue = deque()\n" +
            "        for r in range(m):\n" +
            "            for c in range(n):\n" +
            "                if rooms[r][c] == 0:\n" +
            "                    queue.append((r, c))\n" +
            "        while queue:\n" +
            "            r, c = queue.popleft()\n" +
            "            d = rooms[r][c]\n" +
            "            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and rooms[nr][nc] == INF:\n" +
            "                    rooms[nr][nc] = d + 1\n" +
            "                    queue.append((nr, nc))"
        }
      ],
      patternRecognition: [
        "'Distance from every cell to the NEAREST of many targets' => multi-source BFS from all targets.",
        "Seed the queue with all sources at distance 0; the first flood to reach a cell gives its minimum.",
        "One BFS from all gates is O(m*n); one BFS per gate would be O(gates * m*n)."
      ],
      interviewRecall: [
        "Multi-source BFS: enqueue every gate first, then flood outward assigning d+1.",
        "The '== INF' check is the visited test; it skips walls (-1) and already-filled rooms.",
        "Assign a neighbor's distance on enqueue so the nearest gate (smallest d) wins."
      ]
    },

    {
      id: "course-schedule-ii",
      lc: 210,
      title: "Course Schedule II",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/course-schedule-ii/",
      meta: { pattern: "Topological Sort (produce ordering)", dataStructure: "Directed adjacency list", technique: "Kahn BFS or DFS postorder" },
      description:
        "There are `numCourses` courses labeled `0` to `numCourses - 1`. You are given `prerequisites`, where `prerequisites[i] = [a, b]` means you **must take course `b` before course `a`**.\n\n" +
        "Return **any valid order** in which you can take all the courses. If it is impossible to finish all courses (the prerequisites contain a cycle), return an **empty array** `[]`.",
      constraints: [
        "`1 <= numCourses <= 2000`",
        "`0 <= prerequisites.length <= numCourses * (numCourses - 1)`",
        "`prerequisites[i].length == 2`, `0 <= a, b < numCourses`, `a != b`",
        "All prerequisite pairs `[a, b]` are distinct."
      ],
      notes: [
        "This is Course Schedule I but you must OUTPUT an ordering, not just a boolean.",
        "A valid order exists iff the prerequisite graph is acyclic (a DAG); otherwise return `[]`.",
        "`[a, b]` is a directed edge b -> a (take b, which unlocks a).",
        "Several valid orders may exist \u2014 returning any one is accepted."
      ],
      examples: [
        {
          input: "numCourses = 2, prerequisites = [[1,0]]",
          output: "[0,1]",
          reasoning: "Course 0 has no prerequisite; take it first, then course 1.",
          visual: "```\n0 --> 1     order: [0, 1]\n```"
        },
        {
          input: "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
          output: "[0,1,2,3]",
          reasoning: "0 unlocks 1 and 2; both unlock 3. A valid order is 0,1,2,3 (0,2,1,3 also works).",
          visual: "```\n     0\n    / \\\n   1   2      one valid order: 0 1 2 3\n    \\ /\n     3\n```"
        },
        {
          input: "numCourses = 1, prerequisites = []",
          output: "[0]",
          reasoning: "A single course with no prerequisites."
        },
        {
          input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
          output: "[]",
          reasoning: "0 requires 1 and 1 requires 0 \u2014 a cycle, so no valid order exists."
        }
      ],
      approaches: [
        {
          name: "Kahn's Algorithm (BFS topological sort by indegree)",
          time: "O(V + E)",
          space: "O(V + E)",
          whenToUse: "The clean, iterative way to emit a topological order and detect a cycle in one pass; no recursion depth risk.",
          logic:
            "**What it asks.** Produce a valid order to take all courses respecting every prerequisite, or return `[]` if the prerequisites form a cycle (no order can exist).\n\n" +
            "**Graph modeling.** **Nodes** are courses `0..numCourses-1`. Each pair `[a, b]` ('take b before a') is a directed **edge `b -> a`** \u2014 b unlocks a. A valid course order is exactly a **topological ordering** of this directed graph, which exists iff the graph is a **DAG** (acyclic).\n\n" +
            "**Why the naive idea fails.** 'Repeatedly pick any course whose prerequisites are all done' is the right instinct but needs structure: rescanning all courses each round to find a ready one is slow, and without tracking readiness you cannot cleanly detect the deadlock (cycle) that makes the task impossible.\n\n" +
            "**Key Idea.** A course is ready once all its prerequisites are taken \u2014 in graph terms, when its **indegree** (count of unmet prerequisites = incoming edges) reaches `0`. Kahn's algorithm repeatedly removes an indegree-`0` course, APPENDS IT TO THE ORDER, and deletes its outgoing edges, which lowers other courses' indegrees and may free them. Building the output list as you remove nodes yields the topological order directly. The `visited`/readiness structure is the `indegree` array plus the queue of ready courses.\n\n" +
            "**Why topological sort fits.** 'Order tasks under dependency constraints' is the definition of a topological ordering, and Kahn's BFS both produces one and proves when none exists (a leftover cycle).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build adjacency list `graph[b].append(a)` and an `indegree` array of incoming-edge counts.\n" +
            "2. Enqueue every course with indegree `0` (no prerequisites).\n" +
            "3. Pop a course, append it to `order`, and for each course it unlocks, decrement that course's indegree; if it hits `0`, enqueue it.\n" +
            "4. When the queue drains, if `len(order) == numCourses` return `order`; otherwise a cycle left some courses unscheduled \u2014 return `[]`.\n\n" +
            "**Why it works.** Each edge is relaxed once, when its source is appended. A course reaches indegree `0` only after all its prerequisites precede it in `order`, so the list respects every constraint. If a cycle exists, its courses forever wait on one another, never reach indegree `0`, and `order` falls short of `numCourses` \u2014 exactly the impossible case.\n\n" +
            "**Common Gotchas.**\n" +
            "- Edge direction: `[a, b]` means b before a, i.e. edge `b -> a`. Draw it before coding.\n" +
            "- Return `[]` only when the order is INCOMPLETE (`len < numCourses`); a complete order is the answer even with many courses of indegree 0.\n" +
            "- Include courses that appear in no prerequisite \u2014 they start at indegree `0` and belong in the order.\n\n" +
            "**Complexity.** Time `O(V + E)` and space `O(V + E)` \u2014 building and traversing touch every course and edge once.\n\n" +
            "**Interview mindset.** 'Give a valid build/schedule order under pairwise dependencies' is the topological-sort signal; Kahn's indegree BFS emits the order and flags a cycle in the same loop.",
          rcs:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:\n" +
            "        graph = [[] for _ in range(numCourses)]   # graph[b] = courses b unlocks.\n" +
            "        indegree = [0] * numCourses               # indegree[c] = unmet prerequisites of c.\n" +
            "        for a, b in prerequisites:                # 'b before a' => edge b -> a.\n" +
            "            graph[b].append(a)\n" +
            "            indegree[a] += 1\n" +
            "        queue = deque(c for c in range(numCourses) if indegree[c] == 0)  # Ready courses.\n" +
            "        order = []\n" +
            "        while queue:\n" +
            "            course = queue.popleft()\n" +
            "            order.append(course)                  # Schedule it next.\n" +
            "            for nxt in graph[course]:             # Every course it unlocks...\n" +
            "                indegree[nxt] -= 1                # ...loses one unmet prerequisite.\n" +
            "                if indegree[nxt] == 0:            # Now ready.\n" +
            "                    queue.append(nxt)\n" +
            "        return order if len(order) == numCourses else []  # Incomplete => cycle => [].",
          plain:
            "from collections import deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:\n" +
            "        graph = [[] for _ in range(numCourses)]\n" +
            "        indegree = [0] * numCourses\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "            indegree[a] += 1\n" +
            "        queue = deque(c for c in range(numCourses) if indegree[c] == 0)\n" +
            "        order = []\n" +
            "        while queue:\n" +
            "            course = queue.popleft()\n" +
            "            order.append(course)\n" +
            "            for nxt in graph[course]:\n" +
            "                indegree[nxt] -= 1\n" +
            "                if indegree[nxt] == 0:\n" +
            "                    queue.append(nxt)\n" +
            "        return order if len(order) == numCourses else []"
        },
        {
          name: "DFS postorder (three-color cycle detection)",
          time: "O(V + E)",
          space: "O(V + E)",
          whenToUse: "When you think in DFS; the reverse of the postorder finishing sequence is a valid topological order, with coloring to catch cycles.",
          logic:
            "**What it asks.** The same valid course ordering (or `[]` on a cycle), produced by a depth-first traversal instead of indegree bookkeeping.\n\n" +
            "**Graph modeling.** Same graph: **nodes** are courses, each `[a, b]` is a directed **edge `b -> a`**. A valid order is a topological ordering, which the DFS finishing order gives: a node is finished only after all courses it unlocks are finished, so reversing the finish order places every prerequisite before what it unlocks.\n\n" +
            "**Why the naive idea fails.** A plain DFS with a single visited flag cannot distinguish 'this node is an ancestor still on my current path' (a cycle) from 'this node was fully explored earlier on another path' (safe). Conflating the two either misses cycles or falsely reports them, and gives no clean way to emit the order.\n\n" +
            "**Key Idea.** Color each node `0 = unvisited`, `1 = on the current DFS path`, `2 = fully explored`. A cycle exists exactly when DFS reaches a color-`1` node (a back edge to an ancestor on the active path) \u2014 then return `[]`. Otherwise, when a node finishes (all its unlocked courses explored), append it to a list; the REVERSE of that postorder list is a valid topological order. The color array is the traversal's memory: `1` is the recursion path, `2` short-circuits already-cleared nodes to keep the search linear.\n\n" +
            "**Why DFS fits.** Topological ordering falls straight out of DFS postorder, and directed-cycle detection is precisely about the recursion stack \u2014 the set of color-`1` nodes IS the current path.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build adjacency list `graph[b].append(a)` and a `color` array of `0`s; prepare an empty `order` list.\n" +
            "2. In `dfs(c)`: if `color[c] == 1` return False (back edge => cycle); if `color[c] == 2` return True (already safe).\n" +
            "3. Mark `color[c] = 1`, recurse into every neighbor; if any returns False, propagate False.\n" +
            "4. Mark `color[c] = 2`, append `c` to `order` (postorder), and return True.\n" +
            "5. Run `dfs` from every course; if any reports a cycle, return `[]`. Otherwise return `order` REVERSED.\n\n" +
            "**Why it works.** A node is appended only after everything it depends on it (its unlocked courses) is appended, so reversing puts prerequisites first \u2014 a valid topological order. The gray/black coloring detects a back edge iff the directed graph has a cycle, correctly yielding `[]` when no order exists.\n\n" +
            "**Common Gotchas.**\n" +
            "- Two states are essential: gray (on path) vs black (done). A single visited flag is the classic wrong answer.\n" +
            "- REVERSE the postorder \u2014 the raw finishing order is the opposite of a valid schedule.\n" +
            "- Restart DFS from every course; the graph may be disconnected, and a cycle can hide in an unvisited component.\n" +
            "- On deep chains the recursion can approach `numCourses` frames \u2014 Kahn's BFS avoids that.\n\n" +
            "**Complexity.** Time `O(V + E)` \u2014 each node colored a constant number of times, each edge followed once. Space `O(V + E)` for recursion, the color array, and the adjacency list.\n\n" +
            "**Interview mindset.** 'Produce a dependency order' via DFS = postorder then reverse, with three-color coloring to reject cycles \u2014 the recursive twin of Kahn's indegree BFS.",
          rcs:
            "class Solution:\n" +
            "    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:\n" +
            "        graph = [[] for _ in range(numCourses)]   # graph[b] = courses b unlocks.\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "        color = [0] * numCourses                  # 0=unvisited, 1=on path, 2=done.\n" +
            "        order = []\n" +
            "\n" +
            "        def dfs(c):\n" +
            "            if color[c] == 1:                     # Back edge to an active node => cycle.\n" +
            "                return False\n" +
            "            if color[c] == 2:                     # Already explored and safe.\n" +
            "                return True\n" +
            "            color[c] = 1                          # Enter the current path.\n" +
            "            for nxt in graph[c]:\n" +
            "                if not dfs(nxt):                  # Cycle found deeper => propagate.\n" +
            "                    return False\n" +
            "            color[c] = 2                          # Fully explored.\n" +
            "            order.append(c)                       # Postorder: append on finish.\n" +
            "            return True\n" +
            "\n" +
            "        for c in range(numCourses):               # Graph may be disconnected.\n" +
            "            if not dfs(c):\n" +
            "                return []                         # Cycle => no valid order.\n" +
            "        return order[::-1]                        # Reverse postorder = topological order.",
          plain:
            "class Solution:\n" +
            "    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:\n" +
            "        graph = [[] for _ in range(numCourses)]\n" +
            "        for a, b in prerequisites:\n" +
            "            graph[b].append(a)\n" +
            "        color = [0] * numCourses\n" +
            "        order = []\n" +
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
            "            order.append(c)\n" +
            "            return True\n" +
            "\n" +
            "        for c in range(numCourses):\n" +
            "            if not dfs(c):\n" +
            "                return []\n" +
            "        return order[::-1]"
        }
      ],
      patternRecognition: [
        "'Give a valid order under dependencies' => topological sort (Kahn's BFS or DFS postorder).",
        "A valid order exists iff the directed graph is acyclic; a cycle => return [].",
        "Direction matters: '[a,b] = b before a' is edge b -> a. Draw it before coding."
      ],
      interviewRecall: [
        "Kahn's: append indegree-0 nodes as you pop them; if the order misses any course there was a cycle => [].",
        "DFS: append on finish (postorder), then REVERSE for the order; gray-node revisit => cycle.",
        "Same graph as Course Schedule I \u2014 here you output the order instead of a boolean."
      ]
    },

    {
      id: "redundant-connection",
      lc: 684,
      title: "Redundant Connection",
      difficulty: "Medium",
      category: "Graphs",
      link: "https://leetcode.com/problems/redundant-connection/",
      meta: { pattern: "Cycle detection (undirected)", dataStructure: "Disjoint Set Union", technique: "Union-Find first cycle-closing edge" },
      description:
        "A tree is an undirected graph that is connected and has no cycles. You start with a tree of `n` nodes labeled `1` to `n`, then **one extra edge is added**. The result is given as `edges`, where `edges[i] = [a, b]` is an undirected edge.\n\n" +
        "Return the **one edge** that can be removed so the graph becomes a tree of `n` nodes again. If multiple answers exist, return the one that appears **last** in the input.",
      constraints: [
        "`n == edges.length`",
        "`3 <= n <= 1000`",
        "`edges[i].length == 2`, `1 <= a < b <= n`",
        "There are no repeated edges and no self-loops.",
        "The input graph is guaranteed to be a tree plus exactly one extra edge (so exactly one cycle)."
      ],
      notes: [
        "The graph has exactly `n` nodes and `n` edges \u2014 a tree has `n - 1`, so the one extra edge creates exactly one cycle.",
        "Nodes are labeled from `1` (not `0`); size the parent array `n + 1` or offset by one.",
        "Processing edges in order and returning the FIRST edge whose endpoints already share a root gives the last such edge on the unique cycle \u2014 which is what 'last in input' asks for."
      ],
      examples: [
        {
          input: "edges = [[1,2],[1,3],[2,3]]",
          output: "[2,3]",
          reasoning: "Edges 1-2 and 1-3 join everything; adding 2-3 closes the cycle 1-2-3-1, so [2,3] is redundant.",
          visual: "```\n1-2   union 1,2\n1-3   union 1,3 (now 1,2,3 connected)\n2-3   find(2)==find(3) already => redundant edge [2,3]\n```"
        },
        {
          input: "edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]",
          output: "[1,4]",
          reasoning: "1-2, 2-3, 3-4 form a chain; 1-4 closes the cycle 1-2-3-4-1, so [1,4] is the answer.",
          visual: "```\n1-2-3-4 chain, then 1-4 closes cycle 1-2-3-4-1 => [1,4]\n(1-5 comes later but is not part of the cycle)\n```"
        },
        {
          input: "edges = [[1,2],[2,3],[1,3]]",
          output: "[1,3]",
          reasoning: "The first two edges connect 1,2,3; edge 1-3 finds both endpoints already connected."
        }
      ],
      approaches: [
        {
          name: "Union-Find (first edge that closes a cycle)",
          time: "O(n * \u03b1(n))",
          space: "O(n)",
          whenToUse: "The canonical use of Union-Find: process undirected edges and catch the one that links two already-connected nodes.",
          logic:
            "**What it asks.** In a graph that is a tree plus one extra edge, find the edge whose removal restores a tree \u2014 i.e. the edge lying on the single cycle \u2014 returning the one that appears last in the input.\n\n" +
            "**Graph modeling.** **Nodes** are `1..n`; **edges** are the undirected pairs, processed in input order. The graph has `n` nodes and `n` edges, so it contains exactly one cycle. The redundant edge is any edge on that cycle; among them we want the last-listed.\n\n" +
            "**Why the naive idea fails.** You could, for each edge, remove it and run a full connectivity/acyclicity check \u2014 `O(n^2)`. Or DFS to find the cycle and pick an edge \u2014 workable but fiddly to get 'last in input' right. Union-Find catches the cycle-closing edge directly as edges arrive.\n\n" +
            "**Key Idea.** Maintain disjoint sets over the nodes with Union-Find. Process edges left to right; for edge `(a, b)`, if `a` and `b` are ALREADY in the same set (`find(a) == find(b)`), this edge connects two already-connected nodes and therefore closes a cycle \u2014 it is redundant, so return it. Otherwise `union(a, b)` and continue. Because the graph is a tree plus one edge, exactly one edge triggers this, and processing in order means it is the last edge of the cycle as listed \u2014 which is what the problem wants. The `visited`/state structure is `parent[x]`, x's representative root; two nodes are connected iff `find` returns the same root.\n\n" +
            "**find with path compression + union.** `find(x)` walks parent pointers up to the set's root; **path compression** re-points each node along the way toward its grandparent (`parent[x] = parent[parent[x]]`), flattening the tree so later `find`s on those nodes are near-`O(1)`. **union(a, b)** links the two roots (`parent[find(a)] = find(b)`), merging the sets \u2014 after which `a` and `b`, and everything in their two groups, share one root.\n\n" +
            "**Why Union-Find fits.** Detecting a cycle in an undirected graph as edges stream in is its textbook application \u2014 each edge either merges two disjoint groups or, if both endpoints already share a root, reveals the cycle.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `parent[i] = i` for `i` in `1..n` (nodes are 1-indexed, so size `n + 1`).\n" +
            "2. For each edge `(a, b)` in order: compute `find(a)` and `find(b)` (with path compression).\n" +
            "3. If the two roots are equal, `a` and `b` are already connected \u2014 return `[a, b]` (it closes the cycle).\n" +
            "4. Otherwise union them (`parent[find(a)] = find(b)`) and move on.\n\n" +
            "**Why it works.** Union-Find keeps each connected component as one set. An edge whose endpoints already share a root would add a second path between them, forming a cycle; since the graph is a tree plus exactly one edge, precisely one edge does this, and scanning in input order returns it \u2014 the last edge on the cycle as listed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Nodes are labeled from `1`; size the parent array `n + 1` (or offset), or you index out of range / mishandle node `n`.\n" +
            "- Return the edge the FIRST time `find(a) == find(b)` while scanning in order \u2014 that is the last-in-input cycle edge the problem asks for.\n" +
            "- Include path compression (and/or union by rank) to keep `find` near-`O(1)`.\n" +
            "- A cycle in an UNDIRECTED graph is exactly an edge whose endpoints already share a root \u2014 different from directed cycle detection.\n\n" +
            "**Complexity.** Time `O(n * \u03b1(n))` \u2248 linear (\u03b1 is the inverse Ackermann function), `O(n)` space for the parent array.\n\n" +
            "**Interview mindset.** 'Find the edge that creates a cycle in an undirected graph' is the Union-Find signal \u2014 process edges in order and return the one whose endpoints are already united.",
          rcs:
            "class Solution:\n" +
            "    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:\n" +
            "        parent = list(range(len(edges) + 1))     # Nodes 1..n; index 0 unused.\n" +
            "\n" +
            "        def find(x):                             # Root of x's set, with path compression.\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]    # Point x at its grandparent (flatten).\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        def union(a, b):                         # Merge the two sets; True if merged.\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:                         # Already connected => this edge is a cycle.\n" +
            "                return False\n" +
            "            parent[ra] = rb\n" +
            "            return True\n" +
            "\n" +
            "        for a, b in edges:                       # Scan in input order.\n" +
            "            if not union(a, b):                  # First edge that fails to merge...\n" +
            "                return [a, b]                    # ...is the redundant (last cycle) edge.\n" +
            "        return []",
          plain:
            "class Solution:\n" +
            "    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:\n" +
            "        parent = list(range(len(edges) + 1))\n" +
            "\n" +
            "        def find(x):\n" +
            "            while parent[x] != x:\n" +
            "                parent[x] = parent[parent[x]]\n" +
            "                x = parent[x]\n" +
            "            return x\n" +
            "\n" +
            "        def union(a, b):\n" +
            "            ra, rb = find(a), find(b)\n" +
            "            if ra == rb:\n" +
            "                return False\n" +
            "            parent[ra] = rb\n" +
            "            return True\n" +
            "\n" +
            "        for a, b in edges:\n" +
            "            if not union(a, b):\n" +
            "                return [a, b]\n" +
            "        return []"
        }
      ],
      patternRecognition: [
        "'Find the edge that creates a cycle in an undirected graph' => Union-Find as edges arrive.",
        "Tree + one extra edge => n nodes, n edges, exactly one cycle.",
        "The redundant edge is the first one (scanning in order) whose endpoints already share a root."
      ],
      interviewRecall: [
        "Union-Find: return the edge where find(a) == find(b) before union \u2014 it closes the cycle.",
        "find uses path compression (point nodes at grandparents); union links the two roots.",
        "Nodes are 1-indexed \u2014 size parent as n + 1; scan in order to get the last-in-input edge."
      ]
    },

    {
      id: "word-ladder",
      lc: 127,
      title: "Word Ladder",
      difficulty: "Hard",
      category: "Graphs",
      link: "https://leetcode.com/problems/word-ladder/",
      meta: { pattern: "Shortest path (unweighted)", dataStructure: "Implicit word graph", technique: "BFS over wildcard adjacency buckets" },
      description:
        "A **transformation sequence** from `beginWord` to `endWord` using a dictionary `wordList` is a sequence `beginWord -> s1 -> s2 -> ... -> endWord` where every adjacent pair differs by exactly **one letter**, and every `si` (for `i >= 1`) is in `wordList`. Note `beginWord` itself need not be in `wordList`.\n\n" +
        "Return the **number of words** in the shortest such transformation sequence, or `0` if none exists.",
      constraints: [
        "`1 <= beginWord.length <= 10`",
        "`endWord.length == beginWord.length`",
        "`1 <= wordList.length <= 5000`",
        "`wordList[i].length == beginWord.length`",
        "All words consist of lowercase English letters; `beginWord != endWord`; all words in `wordList` are unique."
      ],
      notes: [
        "The answer counts WORDS (nodes), not steps \u2014 begin -> end changing one letter with end in the list returns 2.",
        "If `endWord` is not in `wordList`, no valid sequence exists => return 0.",
        "Building edges by comparing all pairs of words is O(N^2 * L); wildcard patterns make adjacency O(N * L) to build.",
        "BFS (not DFS) because we need the SHORTEST sequence in an unweighted graph."
      ],
      examples: [
        {
          input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
          output: "5",
          reasoning: "hit -> hot -> dot -> dog -> cog is a shortest chain of 5 words.",
          visual:
            "```\nhit -> hot -> dot -> dog -> cog\n  (h*t) (*ot) (do*) (*og)\n5 words in the shortest ladder\n```"
        },
        {
          input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
          output: "0",
          reasoning: "endWord 'cog' is not in the word list, so no sequence can end there."
        },
        {
          input: 'beginWord = "a", endWord = "c", wordList = ["a","b","c"]',
          output: "2",
          reasoning: "a -> c directly (one letter changes, 'c' is in the list): 2 words."
        }
      ],
      approaches: [
        {
          name: "BFS over wildcard-pattern adjacency buckets",
          time: "O(N * L^2)",
          space: "O(N * L^2)",
          whenToUse: "Shortest transformation / fewest steps where each move changes one unit and the endpoints are unweighted => BFS.",
          logic:
            "**What it asks.** Find the length (in words) of the shortest chain from `beginWord` to `endWord` where each step changes exactly one letter and every intermediate word is in `wordList`, or `0` if no such chain exists.\n\n" +
            "**Graph modeling.** Model each word as a **node**; an undirected **edge** connects two words that differ by exactly one letter. The shortest transformation is the **shortest path** in this unweighted graph, and its word-count is that path's node count. We are doing a shortest-path search, so `visited` marks words already reached (at their minimum distance) to avoid revisiting.\n\n" +
            "**Why the naive idea fails.** Building the graph by comparing every pair of words to see if they differ by one letter is `O(N^2 * L)` \u2014 up to 5000 words makes ~25 million pairwise comparisons. And DFS would explore long chains without guaranteeing the shortest. We need cheap adjacency and a breadth-first search.\n\n" +
            "**Key Idea.** Two ideas combine. First, **wildcard patterns for adjacency**: for a word like `hot`, generate the patterns `*ot`, `h*t`, `ho*` (each with one position replaced by `*`). Two words are one letter apart iff they share a wildcard pattern, so bucket every word under each of its `L` patterns; the words in a bucket are mutually adjacent. This builds all edges in `O(N * L^2)` instead of `O(N^2 * L)`. Second, **BFS for the shortest path**: because every edge has weight 1, BFS explores words in increasing distance from `beginWord`, so the first time it reaches `endWord` it has found the shortest ladder. The BFS level (starting the count at 1 for `beginWord`) is the number of words in the sequence.\n\n" +
            "**Why BFS fits.** Fewest one-letter steps in an unweighted graph is the definition of an unweighted shortest path, and BFS is exactly that \u2014 level `k` holds all words reachable in `k-1` transformations, so the level at which `endWord` first appears is the answer. DFS could find A path but not necessarily the shortest.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `endWord` is not in `wordList`, return `0` immediately.\n" +
            "2. Build a map `patterns`: for every word, for each position `i`, add the word to the bucket keyed by `word[:i] + '*' + word[i+1:]`.\n" +
            "3. BFS from `beginWord` with a queue of `(word, level)` starting at level `1`, and a `visited` set.\n" +
            "4. Pop a word; if it equals `endWord`, return its level. Otherwise, for each of its `L` wildcard patterns, visit every unvisited word in that bucket \u2014 mark it visited and enqueue it at `level + 1`.\n" +
            "5. If the queue drains without reaching `endWord`, return `0`.\n\n" +
            "**Why it works.** The wildcard buckets encode exactly the one-letter-difference edges, so the BFS traverses the true transformation graph. BFS's level order guarantees the first arrival at `endWord` is via a shortest path, and marking words visited on enqueue keeps each word processed once and prevents cycles.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return early if `endWord` is absent from the list \u2014 otherwise you search for an unreachable target.\n" +
            "- Count WORDS, not steps: start the level at `1` for `beginWord`, so a direct one-letter transform to `endWord` returns `2`.\n" +
            "- Mark words visited on enqueue (not dequeue), or the same word floods in from several buckets.\n" +
            "- `beginWord` may not be in `wordList`, but you still expand from it; include its patterns when searching buckets.\n\n" +
            "**Complexity.** With `N` words of length `L`: building the buckets and each expansion cost `O(N * L^2)` (each of `N` words yields `L` patterns, each of length `L`). Space `O(N * L^2)` for the pattern map and queue.\n\n" +
            "**Interview mindset.** 'Shortest transformation / minimum steps changing one unit at a time' is an unweighted shortest-path problem \u2014 reach for BFS, and use wildcard buckets (or precomputed adjacency) to avoid the `O(N^2)` edge build.",
          rcs:
            "from collections import deque, defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:\n" +
            "        words = set(wordList)\n" +
            "        if endWord not in words:                 # Target unreachable => no ladder.\n" +
            "            return 0\n" +
            "        L = len(beginWord)\n" +
            "        patterns = defaultdict(list)             # 'h*t' -> [words matching that pattern].\n" +
            "        for word in words:\n" +
            "            for i in range(L):\n" +
            "                patterns[word[:i] + '*' + word[i+1:]].append(word)\n" +
            "\n" +
            "        visited = {beginWord}\n" +
            "        queue = deque([(beginWord, 1)])          # Count WORDS: beginWord is level 1.\n" +
            "        while queue:\n" +
            "            word, level = queue.popleft()\n" +
            "            if word == endWord:                  # First arrival = shortest (BFS).\n" +
            "                return level\n" +
            "            for i in range(L):                   # Each one-letter-off neighbor...\n" +
            "                pat = word[:i] + '*' + word[i+1:]\n" +
            "                for nei in patterns[pat]:        # ...shares a wildcard pattern.\n" +
            "                    if nei not in visited:\n" +
            "                        visited.add(nei)         # Mark on enqueue.\n" +
            "                        queue.append((nei, level + 1))\n" +
            "        return 0                                 # endWord never reached.",
          plain:
            "from collections import deque, defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def ladderLength(self, beginWord: str, endWord: str, wordList: List[str]) -> int:\n" +
            "        words = set(wordList)\n" +
            "        if endWord not in words:\n" +
            "            return 0\n" +
            "        L = len(beginWord)\n" +
            "        patterns = defaultdict(list)\n" +
            "        for word in words:\n" +
            "            for i in range(L):\n" +
            "                patterns[word[:i] + '*' + word[i+1:]].append(word)\n" +
            "\n" +
            "        visited = {beginWord}\n" +
            "        queue = deque([(beginWord, 1)])\n" +
            "        while queue:\n" +
            "            word, level = queue.popleft()\n" +
            "            if word == endWord:\n" +
            "                return level\n" +
            "            for i in range(L):\n" +
            "                pat = word[:i] + '*' + word[i+1:]\n" +
            "                for nei in patterns[pat]:\n" +
            "                    if nei not in visited:\n" +
            "                        visited.add(nei)\n" +
            "                        queue.append((nei, level + 1))\n" +
            "        return 0"
        }
      ],
      patternRecognition: [
        "'Shortest transformation / fewest one-step changes' in an unweighted graph => BFS.",
        "One-letter-difference adjacency => wildcard patterns (h*t) as buckets, not O(N^2) pairwise checks.",
        "First BFS arrival at the target is the shortest; count words by starting the level at 1."
      ],
      interviewRecall: [
        "Build 'h*t'-style pattern buckets so one-letter neighbors are found in O(L), not O(N).",
        "BFS gives the shortest ladder; return 0 immediately if endWord is not in the list.",
        "Answer counts WORDS: beginWord is level 1, so a single transform to endWord returns 2."
      ]
    }
  ]);
})();
