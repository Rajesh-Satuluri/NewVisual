/*
 * data/python/complexity.js — "Complexity" section topics.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Complexity", [
  {
    id: "big-o-by-example",
    title: "Big-O by Example",
    difficulty: "Beginner",
    estMinutes: 10,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Forget the math — learn to read the shape of the code and name its growth on sight.",

    whatIsIt: [
      "Big-O answers one question: <b>as the input gets big, how fast does the work grow?</b> Constants and small stuff drop away — only the shape matters.",
      "You almost never compute it. You <b>recognize</b> it: a single loop, a nested loop, halving the range, a sort. Each shape has a name.",
      "The goal here is pattern-matching. See <code>for i in range(n)</code> and think <code>O(n)</code>. See a loop inside a loop over the same data and think <code>O(n²)</code>."
    ],

    showMe: {
      code:
        "# O(1)   — no loop over the input, just a few steps\n" +
        "arr[0]\n" +
        "\n" +
        "# O(log n) — the range HALVES each step (binary search)\n" +
        "while lo <= hi:\n" +
        "    mid = (lo + hi) // 2\n" +
        "    lo = mid + 1   # or hi = mid - 1\n" +
        "\n" +
        "# O(n)   — one pass over the input\n" +
        "for x in nums:\n" +
        "    ...\n" +
        "\n" +
        "# O(n log n) — sort, then a single scan\n" +
        "nums.sort()\n" +
        "for x in nums: ...\n" +
        "\n" +
        "# O(n²) — nested loop over the SAME data\n" +
        "for i in range(n):\n" +
        "    for j in range(n): ...\n" +
        "\n" +
        "# O(2ⁿ) — recursion that branches twice, no memo\n" +
        "def fib(k):\n" +
        "    if k < 2: return k\n" +
        "    return fib(k-1) + fib(k-2)",
      viz: { type: "growth" },
      caption: "Drag n and watch the classes fan out. Near n=1 they look alike; by n=32 the gap between O(n) and O(2ⁿ) is the whole point of this topic."
    },

    whyDsa:
      "<p>Two Sum makes it concrete. The brute force checks every pair — a nested loop over the same array.</p>" +
      "<pre class=\"why-pre\">for i in range(n):\n    for j in range(i+1, n):   → O(n²)\n        if nums[i] + nums[j] == target: ...</pre>" +
      "<p>Remember what you've seen in a dict and each number asks one O(1) question instead of a whole inner loop.</p>" +
      "<pre class=\"why-pre\">seen = {}\nfor i, x in enumerate(nums):   → O(n)\n    if target - x in seen: ...</pre>" +
      "<p>At n=10,000 that's ~100,000,000 steps versus ~10,000. Same answer; one finishes instantly, one times out.</p>",

    recognize: [
      { q: "“No loop — just index / arithmetic / a dict lookup”", think: "O(1) — work doesn't grow with n at all" },
      { q: "“The search range halves every step”", think: "O(log n) — binary search, or shrinking by half" },
      { q: "“One loop over the input”", think: "O(n) — a single pass" },
      { q: "“Sort first, then one scan”", think: "O(n log n) — the sort dominates the scan" },
      { q: "“A loop inside a loop over the same data”", think: "O(n²) — the classic brute force" },
      { q: "“Recursion that calls itself twice with no memo”", think: "O(2ⁿ) — the call tree doubles each level" }
    ],

    matchTags: [],
    relatedProblems: ["two-sum", "binary-search", "climbing-stairs", "subsets", "merge-intervals"],

    traps: [
      {
        bad: "for i in range(n):\n    if x in some_list:   # O(n) hidden INSIDE the loop\n        ...",
        good: "seen = set(some_list)\nfor i in range(n):\n    if x in seen:        # O(1) each\n        ...",
        why: "An O(n) operation inside an O(n) loop is O(n²). The nested cost is often hidden in an innocent-looking `in`, slice, or `.index()` call, not a visible second loop."
      },
      {
        bad: "# two SEPARATE loops\nfor x in nums: ...\nfor y in nums: ...",
        good: "# still O(n) — not O(n²)",
        why: "Sequential loops ADD (n + n = 2n → O(n)); only loops NESTED inside each other MULTIPLY (n × n → O(n²)). Side-by-side is fine."
      },
      {
        bad: "def fib(k):\n    if k < 2: return k\n    return fib(k-1) + fib(k-2)   # O(2ⁿ)",
        good: "from functools import lru_cache\n@lru_cache(None)\ndef fib(k):\n    if k < 2: return k\n    return fib(k-1) + fib(k-2)    # O(n)",
        why: "The naive version recomputes the same subproblems over and over, doubling the call tree. Memoizing collapses the repeated work to O(n) — this is exactly the leap from exponential to linear that DP is about."
      }
    ],

    cpython:
      "<p>Big-O is a property of the algorithm's shape, not of Python — the same nested loop is O(n²) in any language. What Python adds is a big <i>constant factor</i>: interpreted bytecode makes each step slower than in C.</p>" +
      "<p>That's why an O(n log n) sort in C-implemented <code>list.sort()</code> can beat an O(n) hand-written Python loop for small n. Big-O tells you which one wins as n grows — it does not promise anything about tiny inputs.</p>",

    complexity: [
      { op: "arr[i]  /  d[key]", big_o: "O(1)", note: "A fixed number of steps that never depends on how big the input is — the flat line at the bottom of the growth chart." },
      { op: "while lo <= hi: mid = (lo+hi)//2", big_o: "O(log n)", note: "Halving the search range each step means it takes only about log₂(n) steps to finish — a million items resolve in roughly twenty." },
      { op: "for x in nums:", big_o: "O(n)", note: "A single pass touches each element once, so the work grows in lockstep with the input size." },
      { op: "nums.sort(); for x in nums:", big_o: "O(n log n)", note: "The sort costs n log n and the following scan only costs n, so the sort dominates and sets the overall class." },
      { op: "for i in range(n): for j in range(n):", big_o: "O(n²)", note: "A loop nested inside a loop over the same data runs n × n times — the classic brute-force shape you learn to replace with a hash map." },
      { op: "return fib(k-1) + fib(k-2)", big_o: "O(2ⁿ)", note: "Each call spawns two more with no memory of past results, so the call tree doubles at every level and blows up fast." },
      { op: "for p in permutations(items):", big_o: "O(n!)", note: "Generating every ordering of n items means n! arrangements — usable only for tiny n (n=10 is already 3.6 million)." }
    ],

    challenge: {
      prompt: "Name the Big-O of this function and say why: it sorts the list, then loops once over it.\n\ndef f(nums):\n    nums.sort()\n    for x in nums:\n        print(x)",
      starter: "# Your answer (as a comment):\n# Big-O = ?\n# Why?\n",
      solution:
        "# Big-O = O(n log n)\n" +
        "# The sort is O(n log n) and the single loop is O(n).\n" +
        "# You ADD them (n log n + n) and keep the bigger term,\n" +
        "# so the sort dominates -> O(n log n)."
    }
  },

  {
    id: "operation-complexity",
    title: "Operation Complexity",
    difficulty: "Beginner",
    estMinutes: 11,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "The one cheat-sheet worth memorizing: what every common operation actually costs, and what to use instead.",

    whatIsIt: [
      "Picking the right data structure is mostly knowing which operations are cheap and which are secretly O(n). This is that lookup table.",
      "The wins are almost always the same three moves: <b>membership → set/dict</b> (not <code>x in list</code>), <b>front operations → deque</b> (not <code>list.pop(0)</code>), and <b>repeated min/max → heapq</b> (not re-sorting).",
      "Skim it now; come back to it whenever a solution feels slow. One wrong container turns an O(n) solution into O(n²)."
    ],

    showMe: {
      code:
        "# membership: list is O(n), set is O(1)\n" +
        "if x in big_list:  ...   # O(n)  — scans\n" +
        "seen = set(big_list)\n" +
        "if x in seen:      ...   # O(1) avg\n" +
        "\n" +
        "# queue: list.pop(0) is O(n), deque.popleft is O(1)\n" +
        "from collections import deque\n" +
        "q = deque([1, 2, 3])\n" +
        "q.popleft()              # O(1)\n" +
        "\n" +
        "# repeated smallest: heapq keeps min at the front\n" +
        "import heapq\n" +
        "heapq.heappush(h, 5)     # O(log n)\n" +
        "heapq.heappop(h)         # O(log n) — smallest",
      caption: "Same logic, different container — and a different Big-O. The container is the decision that makes or breaks the time limit."
    },

    whyDsa:
      "<p>The most common way a correct solution still fails is a hidden O(n) operation inside a loop.</p>" +
      "<pre class=\"why-pre\">for x in nums:\n    if x in result_list:   → O(n) each → O(n²) total\n        ...</pre>" +
      "<p>Swap the list for a set and the same code is O(n). No cleverness — just the right container.</p>" +
      "<pre class=\"why-pre\">seen = set()\nfor x in nums:\n    if x in seen:          → O(1) each → O(n) total\n        ...</pre>",

    recognize: [
      { q: "“I keep checking if something is in a collection”", think: "fast membership → set / dict, NOT `x in list`" },
      { q: "“I add and remove from the FRONT (a queue / BFS)”", think: "FIFO → collections.deque, NOT list.pop(0)" },
      { q: "“I repeatedly need the smallest (or largest) item”", think: "priority queue → heapq, NOT re-sorting each time" },
      { q: "“I'm inserting into a list I need kept sorted”", think: "bisect to find the spot (O(log n)) — but insort still shifts, O(n)" },
      { q: "“I call .pop(0) or .insert(0, x) in a loop”", think: "hidden O(n²) — that's a deque, not a list" }
    ],

    matchTags: [],
    relatedProblems: ["contains-duplicate", "implement-queue-using-stacks", "kth-largest-element-in-an-array", "top-k-frequent-elements", "merge-k-sorted-lists"],

    traps: [
      {
        bad: "seen = []\nfor x in nums:\n    if x in seen:  ...   # O(n) each\n    seen.append(x)",
        good: "seen = set()\nfor x in nums:\n    if x in seen:  ...   # O(1) avg\n    seen.add(x)",
        why: "`x in list` scans every element, so doing it in a loop is O(n²). A set hashes straight to the answer in O(1) average — the single most common speed fix in DSA."
      },
      {
        bad: "queue = [1, 2, 3]\nfront = queue.pop(0)   # O(n) every time",
        good: "from collections import deque\nqueue = deque([1, 2, 3])\nfront = queue.popleft()   # O(1)",
        why: "pop(0) shifts every remaining element left, so a BFS built on a list is O(n²). A deque removes from either end in O(1)."
      },
      {
        bad: "for _ in range(k):\n    nums.sort()          # O(n log n) EACH time\n    smallest = nums.pop(0)",
        good: "import heapq\nheapq.heapify(nums)      # O(n) once\nfor _ in range(k):\n    smallest = heapq.heappop(nums)   # O(log n)",
        why: "Re-sorting to grab the minimum repeatedly is wasteful. A heap gives the smallest in O(log n) per pop after an O(n) heapify — the standard tool for 'k smallest / largest' problems."
      }
    ],

    cpython:
      "<p><b>“O(1) average”</b> for set/dict is the honest caveat worth knowing: it assumes a good hash and few collisions. A deliberately adversarial set of keys can degrade lookups toward O(n), but for interview and everyday DSA purposes you treat set/dict membership as O(1).</p>",

    complexity: [
      { op: "list: arr[i]", big_o: "O(1)", note: "Indexing is direct address arithmetic, so it costs the same no matter how long the list is." },
      { op: "list: arr.append(x)", big_o: "O(1) amortized", note: "Adding at the end is constant on average; the occasional resize-and-copy of the backing array averages out across many appends." },
      { op: "list: arr.pop()", big_o: "O(1)", note: "Removing the last element leaves nothing to shift, which is exactly why a list makes a good stack." },
      { op: "list: arr.pop(0) / arr.insert(0, x)", big_o: "O(n)", note: "Touching the front forces every other element to slide over by one — use collections.deque when you need cheap front operations." },
      { op: "list: x in arr", big_o: "O(n)", note: "Membership walks the list element by element until it finds a match — for repeated checks, build a set instead." },
      { op: "list: arr[a:b]  (slice)", big_o: "O(k)", note: "Copies the k selected elements into a new list, so slicing inside a loop is a common accidental O(n²)." },
      { op: "list: arr.sort() / sorted(arr)", big_o: "O(n log n)", note: "Python's Timsort; .sort() reorders in place while sorted() returns a new list and leaves the original alone." },
      { op: "set/dict: x in s / x in d", big_o: "O(1) avg", note: "Hashing jumps straight to the slot with no scanning — this is the container you reach for whenever membership is in a hot loop." },
      { op: "set/dict: insert / read / delete", big_o: "O(1) avg", note: "Add, look up, and remove all hash to a slot directly, so each is constant time on average." },
      { op: "deque: append / appendleft", big_o: "O(1)", note: "A deque is built for both ends, so adding at the front is as cheap as adding at the back — unlike a list." },
      { op: "deque: pop / popleft", big_o: "O(1)", note: "Removing from either end is constant time, which is what makes deque the right structure for a queue or BFS." },
      { op: "heapq: heappush / heappop", big_o: "O(log n)", note: "Push and pop each sift one element up or down the tree, keeping the smallest item reachable in O(1) at index 0." },
      { op: "heapq: heapify(list)", big_o: "O(n)", note: "Turning an existing list into a heap in one pass is O(n) — cheaper than pushing n items one at a time." },
      { op: "bisect: bisect(arr, x)", big_o: "O(log n)", note: "Binary-searches a sorted list for the insertion point without touching the elements." },
      { op: "bisect: insort(arr, x)", big_o: "O(n)", note: "Finds the spot in O(log n) but the actual insertion still shifts every element after it, so the operation as a whole is O(n)." }
    ],

    challenge: {
      prompt: "You process a stream and must reject any value you've already seen. Which container do you use for the seen-set, and what's the per-check cost?",
      starter: "def dedupe(stream):\n    # pick the right container for `seen`\n    seen = ?\n    out = []\n    for x in stream:\n        # your check here\n        pass\n    return out\n",
      solution:
        "def dedupe(stream):\n" +
        "    seen = set()          # O(1) avg membership\n" +
        "    out = []\n" +
        "    for x in stream:\n" +
        "        if x not in seen:  # O(1) avg — NOT a list (that'd be O(n))\n" +
        "            seen.add(x)\n" +
        "            out.append(x)\n" +
        "    return out\n" +
        "# Overall O(n). A list for `seen` would make it O(n²)."
    }
  }
]);
