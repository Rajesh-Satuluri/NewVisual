/*
 * data/python/lists.js — "Lists / Arrays" topic.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures", [
  {
    id: "lists",
    title: "Lists",
    difficulty: "Beginner",
    estMinutes: 10,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Python's array: an ordered, index-addressable, growable sequence — your default container for DSA.",

    whatIsIt: [
      "A list is an ordered sequence you reach into by <b>index</b>: <code>arr[0]</code> is the first element, <code>arr[-1]</code> the last.",
      "It's <b>mutable</b> — you can change, append, and remove elements in place — and it <b>grows</b> as needed, so you don't declare a size up front.",
      "In DSA a list plays many roles: a plain array, a <b>stack</b> (append/pop at the end), a DP table, a grid row, or an adjacency list."
    ],

    showMe: {
      code:
        "arr = [10, 20, 30]\n" +
        "arr.append(40)     # -> [10, 20, 30, 40]   O(1) amortized\n" +
        "arr[1]             # -> 20                  O(1)\n" +
        "arr.pop()          # -> 40 (removes last)   O(1)",
      viz: { type: "sequence", data: { items: [10, 20, 30], label: "arr" } },
      caption: "Elements sit at contiguous indices. Index access is direct math (base + i) — that's why arr[i] is O(1)."
    },

    whyDsa:
      "<p>The end of a list is cheap; the front is not. Appending or popping at the <b>end</b> is O(1), but inserting or removing at the <b>front</b> shifts every other element.</p>" +
      "<pre class=\"why-pre\">arr.append(x)   → O(1)      (end)\narr.pop()       → O(1)      (end)\narr.pop(0)      → O(n)      (front — everything shifts left)\narr.insert(0,x) → O(n)      (front — everything shifts right)</pre>" +
      "<p>This single fact decides data-structure choices: use a list as a <b>stack</b> (end operations), but a <b>deque</b> for a queue (front operations).</p>",

    recognize: [
      { q: "“I need LIFO — last in, first out”", think: "stack → list with append() / pop()" },
      { q: "“I need to index or slice an ordered collection”", think: "array → list (arr[i], arr[a:b])" },
      { q: "“I keep adding/removing at the FRONT”", think: "not a list → collections.deque (popleft is O(1))" },
      { q: "“I need a fixed grid / DP table”", think: "2D list → [[0]*cols for _ in range(rows)]" }
    ],

    matchTags: ["array", "arrays", "stack", "two pointers", "sliding window", "dynamic programming", "matrix"],
    relatedProblems: ["valid-parentheses", "two-sum", "best-time-to-buy-and-sell-stock", "product-of-array-except-self"],

    traps: [
      {
        bad: "grid = [[0] * m] * n",
        good: "grid = [[0] * m for _ in range(n)]",
        why: "[[0]*m]*n makes n references to the SAME inner list. Writing grid[0][0]=1 changes every row. The comprehension builds n independent rows."
      },
      {
        bad: "queue.pop(0)   # BFS — O(n) every dequeue",
        good: "from collections import deque\nqueue.popleft()   # O(1)",
        why: "pop(0) shifts all remaining elements each time, turning a BFS into O(n²). A deque removes from the front in O(1)."
      },
      {
        bad: "b = a\nb.append(3)    # a changed too!",
        good: "b = a.copy()   # or a[:]\nb.append(3)    # a is untouched",
        why: "b = a makes both names point at the SAME list. To get an independent copy, use a.copy(), a[:], or list(a)."
      }
    ],

    cpython:
      "<p>A CPython list is an array of pointers to objects, plus a length and a (larger) capacity. Indexing is pointer arithmetic — genuinely O(1).</p>" +
      "<p><code>append</code> is <i>amortized</i> O(1): when the backing array fills, CPython allocates a bigger one and copies the pointers over. That occasional copy averages out across many appends.</p>" +
      "<p>Because it stores <b>pointers</b>, a list can hold mixed types — but for DSA you'll almost always keep one type per list.</p>",

    complexity: [
      { op: "arr[i]", big_o: "O(1)", note: "direct index" },
      { op: "arr.append(x)", big_o: "O(1) amortized", note: "occasional resize copy" },
      { op: "arr.pop()", big_o: "O(1)", note: "removes from the end" },
      { op: "arr.pop(0) / insert(0,x)", big_o: "O(n)", note: "shifts every element" },
      { op: "x in arr", big_o: "O(n)", note: "linear scan — use a set for membership" },
      { op: "arr.sort()", big_o: "O(n log n)", note: "Timsort, in place" }
    ],

    challenge: {
      prompt: "Implement a stack using a list: push 1, 2, 3, then pop once. What's left, and what did pop return?",
      starter: "stack = []\n# push 1, 2, 3\n# pop once\n",
      solution:
        "stack = []\nstack.append(1)\nstack.append(2)\nstack.append(3)\ntop = stack.pop()   # top == 3\n# stack is now [1, 2]"
    }
  }
]);
