/*
 * data/python/toolkit.js — "DSA Toolkit" section.
 * The standard-library tools you actually reach for in interviews:
 * deque, Counter, defaultdict, heapq, bisect.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("DSA Toolkit", [
  {
    id: "deque",
    title: "deque",
    difficulty: "Intermediate",
    estMinutes: 8,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A list that is fast at BOTH ends \u2014 the queue every BFS is quietly asking for.",

    whatIsIt: [
      "A <b>deque</b> (\u201cdeck\u201d, double-ended queue) is a sequence you can push and pop at <i>either</i> end in <code>O(1)</code>.",
      "A plain list is only cheap at the <b>end</b>. Touching the <b>front</b> \u2014 <code>pop(0)</code> or <code>insert(0, x)</code> \u2014 shifts every other element, so it is <code>O(n)</code>.",
      "That one difference is why BFS uses a deque: you add at one end and remove from the other, thousands of times, and every single one stays <code>O(1)</code>."
    ],

    showMe: {
      code:
        "from collections import deque\n" +
        "\n" +
        "q = deque([1, 2, 3])\n" +
        "q.append(4)      # add at the RIGHT    -> deque([1, 2, 3, 4])   O(1)\n" +
        "q.appendleft(0)  # add at the LEFT     -> deque([0, 1, 2, 3, 4]) O(1)\n" +
        "q.pop()          # remove from RIGHT   -> 4                      O(1)\n" +
        "q.popleft()      # remove from LEFT    -> 0                      O(1)\n" +
        "\n" +
        "# a BFS queue: push at the back, take from the front\n" +
        "q = deque([start])\n" +
        "while q:\n" +
        "    node = q.popleft()   # O(1) every time\n" +
        "    for nxt in graph[node]:\n" +
        "        q.append(nxt)",
      viz: { type: "sequence", data: { items: [1, 2, 3, 4], label: "queue" } },
      caption: "Both ends are cheap: append/pop at the right, appendleft/popleft at the left \u2014 all O(1)."
    },

    whyDsa:
      "<p>BFS pulls nodes off the front of a queue and pushes neighbours on the back. Do that with a <b>list</b> and every <code>pop(0)</code> shifts the whole queue over one slot.</p>" +
      "<pre class=\"why-pre\">queue = [start]\nwhile queue:\n    node = queue.pop(0)   \u2192 O(n) each dequeue \u2192 O(n\u00b2) overall</pre>" +
      "<p>Swap in a <b>deque</b> and each dequeue is O(1), so the whole traversal is O(V + E) like it should be.</p>" +
      "<pre class=\"why-pre\">from collections import deque\nqueue = deque([start])\nwhile queue:\n    node = queue.popleft()   \u2192 O(1) each dequeue</pre>",

    recognize: [
      { q: "\u201cI need a QUEUE \u2014 first in, first out\u201d", think: "FIFO \u2192 deque with append() / popleft()" },
      { q: "\u201cBFS: process level by level from a frontier\u201d", think: "frontier queue \u2192 deque([start]); popleft() in the loop" },
      { q: "\u201cI keep adding/removing at the FRONT\u201d", think: "not a list \u2192 deque (appendleft/popleft are O(1))" },
      { q: "\u201cSliding-window max / a monotonic queue of indices\u201d", think: "pop from both ends \u2192 deque of candidate indices" }
    ],

    matchTags: ["bfs", "queue", "graph", "tree", "sliding window", "monotonic"],
    relatedProblems: ["number-of-islands", "rotting-oranges", "clone-graph", "word-ladder"],

    traps: [
      {
        bad: "queue = [start]\nnode = queue.pop(0)   # BFS \u2014 O(n) every dequeue",
        good: "from collections import deque\nqueue = deque([start])\nnode = queue.popleft()   # O(1)",
        why: "list.pop(0) shifts every remaining element left, so a BFS built on a list is secretly O(n\u00b2). deque.popleft() removes from the front in O(1) \u2014 use it for any queue."
      },
      {
        bad: "q[len(q) // 2]   # random access into a deque",
        good: "arr[len(arr) // 2]   # use a list when you need arr[i]",
        why: "Indexing the MIDDLE of a deque is O(n) \u2014 it is a linked structure, not a flat array. A deque is for the two ends; if you need fast arr[i], stay on a list."
      }
    ],

    cpython:
      "<p>CPython implements <code>deque</code> as a doubly linked list of fixed-size blocks. That is what makes both ends O(1) \u2014 and also why reaching into the middle by index is O(n), unlike a list.</p>",

    complexity: [
      { op: "append(x) / appendleft(x)", big_o: "O(1)", note: "Adds to either end without moving anything else, so it costs the same no matter how long the deque is." },
      { op: "pop() / popleft()", big_o: "O(1)", note: "Removes from either end in constant time \u2014 this is exactly why a deque makes a proper FIFO queue for BFS." },
      { op: "dq[i]  (index)", big_o: "O(n)", note: "Reaching a middle position means walking from an end, so random access is linear \u2014 reach for a list when you need arr[i]." },
      { op: "x in dq", big_o: "O(n)", note: "Scans element by element, just like a list; a deque gives you fast ends, not fast membership." },
      { op: "for x in dq", big_o: "O(n)", note: "Visits every element once, in order from left to right." }
    ],

    challenge: {
      prompt: "Use a deque as a queue: start with [1, 2, 3], dequeue one from the front, then enqueue 4 at the back. What is the final deque and what did the dequeue return?",
      starter: "from collections import deque\nq = deque([1, 2, 3])\n# dequeue one, then enqueue 4\n",
      solution:
        "from collections import deque\nq = deque([1, 2, 3])\nfirst = q.popleft()   # first == 1\nq.append(4)\n# q is now deque([2, 3, 4])"
    }
  },

  {
    id: "counter",
    title: "Counter",
    difficulty: "Intermediate",
    estMinutes: 7,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A frequency map in one line \u2014 counting done, so you can get on with the problem.",

    whatIsIt: [
      "A <b>Counter</b> is a dict subclass built for tallying. Hand it any iterable and it counts everything for you: <code>Counter('aab')</code> \u2192 <code>{'a': 2, 'b': 1}</code>.",
      "It treats missing keys as <b>0</b> instead of raising, so <code>c['z']</code> is a safe 0 for a letter that never appeared.",
      "It also does the counting chores you'd otherwise hand-roll: <code>most_common(k)</code> for the top-k, and <code>+ - & |</code> to combine tallies."
    ],

    showMe: {
      code:
        "from collections import Counter\n" +
        "\n" +
        "c = Counter('anagram')      # {'a': 3, 'n': 1, 'g': 1, 'r': 1, 'm': 1}\n" +
        "c['a']                      # -> 3\n" +
        "c['z']                      # -> 0   (missing key is 0, no KeyError)\n" +
        "c.most_common(2)            # -> [('a', 3), ('n', 1)]\n" +
        "\n" +
        "# combine tallies with arithmetic:\n" +
        "Counter('aab') + Counter('bcc')   # {'a':2,'b':2,'c':2}\n" +
        "Counter('aab') - Counter('abx')   # {'a':1}  (drops <= 0)\n" +
        "Counter('aab') & Counter('abx')   # {'a':1,'b':1}  (min / intersection)",
      viz: { type: "dictHash", data: { pairs: [["a", 3], ["n", 1], ["g", 1]] } },
      caption: "A Counter is just a dict under the hood \u2014 each distinct item hashes to a slot holding its count."
    },

    whyDsa:
      "<p>\u201cAre these two strings anagrams?\u201d is just \u201cdo they have the same letter counts?\u201d \u2014 which a Counter answers in one comparison.</p>" +
      "<pre class=\"why-pre\">Counter(s) == Counter(t)   \u2192 anagram? (O(n))</pre>" +
      "<p>And \u201cthe k most frequent items\u201d is what <code>most_common</code> exists for \u2014 no manual sort-and-slice.</p>" +
      "<pre class=\"why-pre\">[x for x, _ in Counter(nums).most_common(k)]   \u2192 top-k</pre>",

    recognize: [
      { q: "\u201cHow many times does each thing appear?\u201d", think: "one-shot tally \u2192 Counter(iterable)" },
      { q: "\u201cAre these two things anagrams / permutations?\u201d", think: "compare tallies \u2192 Counter(a) == Counter(b)" },
      { q: "\u201cWhich k items show up most?\u201d", think: "top-k \u2192 Counter(...).most_common(k)" },
      { q: "\u201cWhat is left after removing these from those?\u201d", think: "combine tallies \u2192 Counter - / & / | / +" }
    ],

    matchTags: ["frequency", "hash map", "anagram", "counting"],
    relatedProblems: ["valid-anagram", "group-anagrams", "top-k-frequent-elements", "contains-duplicate"],

    traps: [
      {
        bad: "freq = {}\nfor x in nums:\n    if x in freq: freq[x] += 1\n    else: freq[x] = 1",
        good: "from collections import Counter\nfreq = Counter(nums)",
        why: "When you just need counts of an iterable, Counter(nums) does the whole loop in one line \u2014 same O(n), nothing to get wrong."
      },
      {
        bad: "c = Counter(s)\nif c['x'] > 0: ...   # this LOOKS up 'x'",
        good: "if 'x' in c and c['x'] > 0: ...   # or just: if c['x']",
        why: "Reading c['x'] returns 0 for a missing key WITHOUT inserting it \u2014 that part is safe. But most_common and len still only see keys that were actually counted, so don't rely on a 0-read to add a key."
      }
    ],

    cpython:
      "<p><code>Counter</code> is a real <code>dict</code> subclass, so lookups are the same O(1)-average hash-table operations \u2014 the counting behaviour and <code>most_common</code> are just convenience on top. Note that <code>most_common(k)</code> sorts, so it is O(n log n), not free.</p>",

    complexity: [
      { op: "Counter(iterable)", big_o: "O(n)", note: "Walks the iterable once, doing an O(1)-average dict update per item \u2014 the same work as a hand-written frequency loop." },
      { op: "c[key]  (read)", big_o: "O(1) avg", note: "A plain hash-table lookup that returns 0 for a missing key instead of raising KeyError." },
      { op: "c[key] += 1", big_o: "O(1) avg", note: "Reads the current count (0 if absent) and writes the new one \u2014 one hash-to-slot jump, like any dict write." },
      { op: "c.most_common(k)", big_o: "O(n log n)", note: "It sorts the counts, so asking for the top-k still pays the full sort of n distinct items \u2014 for large n a size-k heap can beat it." },
      { op: "a + b / a - b / a & b / a | b", big_o: "O(n)", note: "Walks the keys of both counters once to build the combined tally, dropping non-positive counts along the way." }
    ],

    challenge: {
      prompt: "Write a one-liner that returns True if strings s and t are anagrams of each other.",
      starter: "from collections import Counter\ns, t = \"listen\", \"silent\"\n# your one-liner\n",
      solution:
        "from collections import Counter\ns, t = \"listen\", \"silent\"\nis_anagram = Counter(s) == Counter(t)   # True"
    }
  },

  {
    id: "defaultdict",
    title: "defaultdict",
    difficulty: "Intermediate",
    estMinutes: 8,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A dict that fills in the missing value for you \u2014 so grouping and adjacency lists become one line.",

    whatIsIt: [
      "A <b>defaultdict</b> is a dict that, when you touch a key that isn't there, calls a <b>factory</b> to create a value on the spot instead of raising <code>KeyError</code>.",
      "You pass the factory at creation: <code>defaultdict(list)</code> gives every new key an empty list, <code>defaultdict(int)</code> gives every new key a 0.",
      "That turns the usual \u201cis the key here yet? if not, create it\u201d dance into a single append or increment."
    ],

    showMe: {
      code:
        "from collections import defaultdict\n" +
        "\n" +
        "# grouping / adjacency list \u2014 factory is list:\n" +
        "graph = defaultdict(list)\n" +
        "graph[0].append(1)   # key 0 auto-starts as [] then appends\n" +
        "graph[0].append(2)   # -> {0: [1, 2]}\n" +
        "\n" +
        "# counting \u2014 factory is int (starts at 0):\n" +
        "freq = defaultdict(int)\n" +
        "for x in \"aab\":\n" +
        "    freq[x] += 1     # no get(), no setdefault -> {'a': 2, 'b': 1}\n" +
        "\n" +
        "# contrast, on a plain dict:\n" +
        "# d.get(k, 0)              read-with-fallback (does NOT insert)\n" +
        "# d.setdefault(k, []).append(v)   insert-if-absent, then use",
      viz: { type: "dictHash", data: { pairs: [["0", 2], ["1", 1], ["2", 1]] } },
      caption: "Still a hash table underneath \u2014 the factory only changes what a MISSING key returns (a fresh [] or 0)."
    },

    whyDsa:
      "<p>Building a graph's adjacency list from an edge list is the canonical case. On a plain dict you must guard every key first.</p>" +
      "<pre class=\"why-pre\">graph = {}\nfor u, v in edges:\n    if u not in graph: graph[u] = []\n    graph[u].append(v)</pre>" +
      "<p>With <code>defaultdict(list)</code> the missing key auto-creates its list, so the guard vanishes.</p>" +
      "<pre class=\"why-pre\">graph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)   \u2192 clean adjacency list</pre>",

    recognize: [
      { q: "\u201cGroup these items into buckets by some key\u201d", think: "buckets \u2192 defaultdict(list); d[key].append(item)" },
      { q: "\u201cBuild a graph / adjacency list from edges\u201d", think: "graph = defaultdict(list); graph[u].append(v)" },
      { q: "\u201cCount things, incrementing as I go\u201d", think: "defaultdict(int); d[key] += 1  (or just Counter)" },
      { q: "\u201cMap each key to a set of related keys\u201d", think: "defaultdict(set); d[key].add(other)" }
    ],

    matchTags: ["graph", "adjacency", "hash map", "grouping", "dfs", "bfs"],
    relatedProblems: ["group-anagrams", "course-schedule", "clone-graph", "number-of-islands"],

    traps: [
      {
        bad: "graph = defaultdict(list)\nif graph[node]:   # <-- just CREATED graph[node] = []\n    ...",
        good: "if node in graph and graph[node]:\n    ...",
        why: "Merely READING graph[node] on a defaultdict inserts it (as an empty list) if it wasn't there. Test membership with `node in graph` \u2014 which never inserts \u2014 when you only want to check."
      },
      {
        bad: "d = defaultdict(int)\nreturn len(d)   # after probing keys with d[k] reads",
        good: "d = defaultdict(int)\n# only assign keys you truly mean to add",
        why: "Because reads can insert, len(d) / iteration can quietly include keys you only glanced at. If that matters, use a plain dict with .get(), which reads without inserting."
      }
    ],

    cpython:
      "<p>A <code>defaultdict</code> is a <code>dict</code> subclass; the only change is a <code>__missing__</code> hook that calls your factory when a lookup fails. Every other operation \u2014 and its O(1)-average cost \u2014 is exactly a normal dict.</p>",

    complexity: [
      { op: "d[key]  (present)", big_o: "O(1) avg", note: "An ordinary hash-table read when the key already exists \u2014 identical to a plain dict." },
      { op: "d[key]  (missing)", big_o: "O(1) avg", note: "Calls the factory to build a fresh value and inserts it \u2014 still constant time, but be aware it MUTATES the dict." },
      { op: "d[key] += 1  /  d[key].append(x)", big_o: "O(1) avg", note: "Auto-creates the 0 or [] on first touch, then does the increment or append \u2014 no membership guard needed." },
      { op: "key in d", big_o: "O(1) avg", note: "Checks membership WITHOUT triggering the factory, so use this when you only want to look, not create." },
      { op: "for k in d", big_o: "O(n)", note: "Visits each stored key once \u2014 including any auto-created by earlier reads, which is the gotcha to watch for." }
    ],

    challenge: {
      prompt: "Given edges = [(0, 1), (0, 2), (1, 2)], build an adjacency list (each node mapped to its neighbours) using defaultdict.",
      starter: "from collections import defaultdict\nedges = [(0, 1), (0, 2), (1, 2)]\ngraph = defaultdict(list)\n# your code here\n",
      solution:
        "from collections import defaultdict\nedges = [(0, 1), (0, 2), (1, 2)]\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n# {0: [1, 2], 1: [2]}"
    }
  },

  {
    id: "heapq",
    title: "heapq",
    difficulty: "Intermediate",
    estMinutes: 9,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A min-heap over a plain list \u2014 always hand me the smallest, in O(log n).",

    whatIsIt: [
      "<b>heapq</b> turns an ordinary list into a <b>min-heap</b>: the smallest element is always at index 0, and push/pop keep that true in <code>O(log n)</code>.",
      "It is not an object \u2014 it's a set of functions that operate on your list in place: <code>heappush(h, x)</code>, <code>heappop(h)</code>, <code>heapify(h)</code>.",
      "Two tricks you'll use constantly: store <b>tuples</b> <code>(priority, item)</code> to order by priority, and push <b>negated</b> values to fake a max-heap."
    ],

    showMe: {
      code:
        "import heapq\n" +
        "\n" +
        "h = [5, 1, 3]\n" +
        "heapq.heapify(h)      # rearrange in place -> smallest at h[0]   O(n)\n" +
        "heapq.heappush(h, 2)  # add                                      O(log n)\n" +
        "heapq.heappop(h)      # remove & return SMALLEST -> 1            O(log n)\n" +
        "h[0]                  # peek at smallest (no removal)            O(1)\n" +
        "\n" +
        "# order by priority: store (priority, item) tuples\n" +
        "pq = []\n" +
        "heapq.heappush(pq, (2, 'b'))\n" +
        "heapq.heappush(pq, (1, 'a'))\n" +
        "heapq.heappop(pq)     # -> (1, 'a')   compares first field first\n" +
        "\n" +
        "# MAX-heap trick: push negatives, negate again on the way out\n" +
        "heapq.heappush(h, -x)\n" +
        "largest = -heapq.heappop(h)",
      viz: { type: "sequence", data: { items: [1, 2, 3, 5], label: "heap" } },
      caption: "A heap is stored as a flat list; h[0] is always the minimum. Push/pop bubble one element up or down \u2014 O(log n)."
    },

    whyDsa:
      "<p>\u201cThe k largest / k most frequent\u201d does not need a full sort. Keep a size-<b>k</b> MIN-heap: whenever it grows past k, pop the smallest, and the k biggest survive.</p>" +
      "<pre class=\"why-pre\">import heapq\nh = []\nfor x in nums:\n    heapq.heappush(h, x)\n    if len(h) > k:\n        heapq.heappop(h)   \u2192 O(n log k), beats O(n log n) sort\n# h holds the k largest; h[0] is the kth largest</pre>" +
      "<p>The same shape powers Dijkstra (pop the closest node), merge-k-sorted-lists, and a running median (two heaps).</p>",

    recognize: [
      { q: "\u201cThe k largest / k smallest / top-k\u201d", think: "size-k heap \u2192 heappush then pop when len > k" },
      { q: "\u201cThe kth largest / kth smallest element\u201d", think: "keep a size-k heap; the answer sits at h[0]" },
      { q: "\u201cAlways pull out the current min (or max) next\u201d", think: "priority queue \u2192 heapq (negate for a max-heap)" },
      { q: "\u201cMerge k sorted lists / streams\u201d", think: "heap of one head per list \u2192 pop smallest, push its successor" }
    ],

    matchTags: ["heap", "priority queue", "top k", "kth largest", "dijkstra"],
    relatedProblems: ["kth-largest-element-in-an-array", "top-k-frequent-elements", "merge-k-sorted-lists", "find-median-from-data-stream"],

    traps: [
      {
        bad: "biggest = heapq.heappop(h)   # expecting the LARGEST",
        good: "biggest = -heapq.heappop(h)  # after pushing -x values",
        why: "heapq is a MIN-heap only \u2014 heappop always returns the smallest. For a max-heap, push -x and negate again when you pop."
      },
      {
        bad: "heapq.heappush(pq, (dist, node))   # node is a custom object",
        good: "heapq.heappush(pq, (dist, tie_breaker, node))",
        why: "If two priorities tie, Python compares the NEXT tuple field. If that field is an object with no ordering, it raises TypeError. Add a unique tie-breaker (like an index) before any unorderable payload."
      },
      {
        bad: "nums.sort()\nkth = nums[-k]   # full sort just for the kth largest",
        good: "kth = heapq.nlargest(k, nums)[-1]   # or a size-k heap",
        why: "Sorting is O(n log n). A size-k heap (or heapq.nlargest/nsmallest) gets the top-k in O(n log k) \u2014 a real win when k is much smaller than n."
      }
    ],

    cpython:
      "<p>heapq stores the heap as a normal Python list using the standard array layout: the children of index <code>i</code> live at <code>2i+1</code> and <code>2i+2</code>. There is no separate heap object \u2014 you are responsible for only mutating the list through heapq's functions so the ordering invariant holds.</p>",

    complexity: [
      { op: "heapify(h)", big_o: "O(n)", note: "Builds the heap from an existing list in one linear pass \u2014 cheaper than pushing n items one at a time." },
      { op: "heappush(h, x)", big_o: "O(log n)", note: "Appends x, then bubbles it up until the parent is smaller \u2014 at most the height of the tree, which is log n." },
      { op: "heappop(h)", big_o: "O(log n)", note: "Removes the root (the minimum), moves the last item to the top, and sifts it down \u2014 again bounded by the tree height." },
      { op: "h[0]  (peek)", big_o: "O(1)", note: "The minimum is always sitting at index 0, so looking at it (without removing) is free." },
      { op: "nlargest(k, it) / nsmallest(k, it)", big_o: "O(n log k)", note: "Maintains a size-k heap across the iterable \u2014 the standard way to get the top-k without a full O(n log n) sort." }
    ],

    challenge: {
      prompt: "Find the 2nd largest number in [3, 1, 5, 2, 4] using a size-k min-heap (k = 2). The kth largest ends up at the heap's root.",
      starter: "import heapq\nnums = [3, 1, 5, 2, 4]\nk = 2\nh = []\n# push, and pop when len(h) > k\n",
      solution:
        "import heapq\nnums = [3, 1, 5, 2, 4]\nk = 2\nh = []\nfor x in nums:\n    heapq.heappush(h, x)\n    if len(h) > k:\n        heapq.heappop(h)\nkth_largest = h[0]   # 4  (the 2nd largest)"
    }
  },

  {
    id: "bisect",
    title: "bisect",
    difficulty: "Intermediate",
    estMinutes: 8,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Binary search you don't have to hand-write \u2014 find where a value belongs in a sorted list, in O(log n).",

    whatIsIt: [
      "<b>bisect</b> answers one question on a <b>sorted</b> list: \u201cat which index would this value be inserted to keep the order?\u201d \u2014 in <code>O(log n)</code>.",
      "<code>bisect_left</code> returns the leftmost such spot, <code>bisect_right</code> the rightmost. For a value that's present, they straddle its run of duplicates.",
      "<code>insort</code> does the insert for you \u2014 but the shift to make room is <code>O(n)</code>, so it is find-fast, insert-still-linear."
    ],

    showMe: {
      code:
        "import bisect\n" +
        "\n" +
        "a = [10, 20, 20, 30]\n" +
        "bisect.bisect_left(a, 20)   # -> 1   (leftmost slot for 20)\n" +
        "bisect.bisect_right(a, 20)  # -> 3   (rightmost slot for 20)\n" +
        "bisect.bisect_left(a, 25)   # -> 3   (where 25 would go)\n" +
        "\n" +
        "# is x present? check the slot bisect_left points at:\n" +
        "i = bisect.bisect_left(a, 20)\n" +
        "found = i < len(a) and a[i] == 20   # True\n" +
        "\n" +
        "# keep a list sorted as you insert (find O(log n), shift O(n)):\n" +
        "bisect.insort(a, 25)        # a -> [10, 20, 20, 25, 30]\n" +
        "\n" +
        "# count elements in [lo, hi]:\n" +
        "bisect.bisect_right(a, hi) - bisect.bisect_left(a, lo)",
      viz: { type: "sequence", data: { items: [10, 20, 20, 30], label: "sorted" } },
      caption: "On a sorted list, bisect halves the search range each step \u2014 O(log n) to find the insertion index."
    },

    whyDsa:
      "<p>If the array is already sorted, you never need a linear scan. bisect is a correct, off-the-shelf binary search \u2014 no <code>lo &lt;= hi</code> off-by-one bugs to write.</p>" +
      "<pre class=\"why-pre\">i = bisect.bisect_left(a, x)\nfound = i < len(a) and a[i] == x   \u2192 O(log n) membership</pre>" +
      "<p>It also maintains a sorted structure as data streams in, and it's the engine behind the O(n log n) patience-sorting solution to Longest Increasing Subsequence.</p>",

    recognize: [
      { q: "\u201cThe array is SORTED \u2014 find / locate a value\u201d", think: "binary search \u2192 bisect_left, then check a[i] == x" },
      { q: "\u201cHow many items are < x (or in a range)?\u201d", think: "count by index \u2192 bisect_right(a, hi) - bisect_left(a, lo)" },
      { q: "\u201cKeep this collection sorted as I add to it\u201d", think: "insort (find O(log n), but shift is O(n))" },
      { q: "\u201cLongest Increasing Subsequence in n log n\u201d", think: "patience sorting \u2192 bisect_left onto a tails array" }
    ],

    matchTags: ["binary search", "sorted", "search", "lis"],
    relatedProblems: ["binary-search", "search-in-rotated-sorted-array", "search-a-2d-matrix", "two-sum-ii-input-array-is-sorted"],

    traps: [
      {
        bad: "i = bisect.bisect_left(a, x)\nreturn a[i] == x   # IndexError when x is bigger than everything",
        good: "return i < len(a) and a[i] == x",
        why: "bisect can return len(a) (x belongs at the very end). Always bounds-check `i < len(a)` before reading a[i]."
      },
      {
        bad: "i = bisect.bisect_left(unsorted, x)",
        good: "unsorted.sort()\ni = bisect.bisect_left(unsorted, x)",
        why: "bisect ASSUMES the list is already sorted \u2014 it never checks. On unsorted input it returns a meaningless index with no error. Sort first (once)."
      },
      {
        bad: "for x in stream:\n    bisect.insort(sorted_list, x)   # O(n) per insert",
        good: "# collect, then sort once: sorted(all_items)  \u2014 O(n log n) total",
        why: "insort finds the spot in O(log n) but shifting elements to open a gap is O(n), so inserting n items one by one is O(n\u00b2). If you have them all up front, sort once instead."
      }
    ],

    cpython:
      "<p>bisect is a thin, pure binary search over <code>a[i]</code> indexing \u2014 it only needs the list to be sorted and the elements to be comparable with <code>&lt;</code>. Since Python 3.10 the functions also take a <code>key=</code> argument, so you can bisect by a computed field without pre-building a separate keys list.</p>",

    complexity: [
      { op: "bisect_left(a, x) / bisect_right(a, x)", big_o: "O(log n)", note: "Halves the candidate range each step, so it finds the insertion index in about log2(n) comparisons \u2014 no scanning." },
      { op: "a[i] == x  (after bisect_left)", big_o: "O(1)", note: "Once bisect hands you the index, confirming presence is a single bounds-checked comparison." },
      { op: "insort(a, x)", big_o: "O(n)", note: "Finding the spot is O(log n), but opening a gap shifts every later element, so the insert itself is linear \u2014 the search being fast doesn't make the write fast." },
      { op: "range count via two bisects", big_o: "O(log n)", note: "bisect_right(a, hi) - bisect_left(a, lo) counts everything in [lo, hi] with two binary searches and no loop." }
    ],

    challenge: {
      prompt: "In the sorted list [1, 3, 3, 3, 5], use bisect to count how many times 3 appears \u2014 without a loop.",
      starter: "import bisect\na = [1, 3, 3, 3, 5]\n# count the 3s using two bisects\n",
      solution:
        "import bisect\na = [1, 3, 3, 3, 5]\ncount = bisect.bisect_right(a, 3) - bisect.bisect_left(a, 3)   # 3"
    }
  }
]);
