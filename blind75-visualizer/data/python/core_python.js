/*
 * data/python/core_python.js — "Core Python" section:
 * Functions, Recursion, Comprehensions.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Core Python", [
  {
    id: "functions",
    title: "Functions",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "A named, reusable block that takes inputs and hands back a result — the unit you organize every solution around.",

    whatIsIt: [
      "You define a function with <code>def</code>, give it parameters, and use <code>return</code> to send a value back to whoever called it.",
      "A function that never hits a <code>return</code> — or just falls off the end — hands back <code>None</code>. That silent <code>None</code> is behind a surprising number of “why is my answer empty?” bugs.",
      "In DSA you mostly write small helpers: a recursive <code>dfs(node)</code>, a <code>sort</code> key, a check like <code>is_valid(board)</code>. Small and focused beats one giant function."
    ],

    showMe: {
      code:
        "def add(a, b):\n" +
        "    return a + b        # sends a value back\n" +
        "\n" +
        "def greet(name):\n" +
        "    print(name)         # no return -> hands back None\n" +
        "\n" +
        "# positional, keyword, and default arguments:\n" +
        "def make(host, port=8080):   # port has a default\n" +
        "    return (host, port)\n" +
        "make('localhost')            # port -> 8080\n" +
        "make('localhost', port=9000) # by keyword\n" +
        "\n" +
        "# variadic: *args collects extras, **kwargs collects named ones\n" +
        "def f(*args, **kwargs):\n" +
        "    return args, kwargs      # (tuple, dict)\n" +
        "\n" +
        "# lambda: a tiny anonymous function, mostly used as a sort key\n" +
        "pairs.sort(key=lambda p: p[1])   # sort by second element\n" +
        "\n" +
        "# type annotations are hints only — Python does NOT enforce them\n" +
        "def area(w: int, h: int) -> int:\n" +
        "    return w * h",
      caption: "return sends a value out; no return means None. Defaults, keywords, *args/**kwargs, and lambdas cover almost everything you'll write."
    },

    whyDsa:
      "<p>Functions are how you tame a hard problem: name the sub-question, solve it once, call it wherever you need it. A backtracking solution is really just one small function calling itself.</p>" +
      "<pre class=\"why-pre\">def dfs(node):\n    if not node: return          → base case returns early\n    dfs(node.left)               → recurse\n    dfs(node.right)</pre>" +
      "<p>Two habits that save you: <b>return</b> a value instead of printing it (the caller needs it), and remember an early <code>return</code> with no value gives back <code>None</code> — not <code>0</code>, not <code>[]</code>.</p>",

    recognize: [
      { q: "“I keep writing the same few lines”", think: "extract a helper → def, call it in both places" },
      { q: "“Some arguments are usually the same”", think: "give them defaults → def f(x, base=0)" },
      { q: "“I need a one-line function just for sorting”", think: "lambda → sorted(xs, key=lambda x: ...)" },
      { q: "“My function returns None unexpectedly”", think: "a branch fell off the end → add / fix the return" }
    ],

    matchTags: [],
    relatedProblems: [],

    traps: [
      {
        bad: "def append_one(x=[]):\n    x.append(1)\n    return x\n# append_one() -> [1]; call again -> [1, 1] !",
        good: "def append_one(x=None):\n    if x is None:\n        x = []\n    x.append(1)\n    return x",
        why: "A default value is created ONCE, when the function is defined — not on each call. A mutable default (list/dict/set) is then shared and quietly accumulates across calls. Use None as a sentinel and build a fresh object inside."
      },
      {
        bad: "def total(nums):\n    s = 0\n    for n in nums:\n        s += n\n    # forgot to return -> total(...) is None",
        good: "def total(nums):\n    s = 0\n    for n in nums:\n        s += n\n    return s",
        why: "Falling off the end returns None. If the caller does None + 1 you get a TypeError far from the real cause."
      },
      {
        bad: "count = 0\ndef bump():\n    count += 1   # UnboundLocalError",
        good: "count = 0\ndef bump():\n    global count\n    count += 1",
        why: "Assigning to a name inside a function makes it LOCAL for the whole function, so reading it first fails. Use global for a module-level variable, or nonlocal to reach an enclosing function's variable — handy for a counter inside a nested dfs()."
      }
    ],

    cpython:
      "<p>Type annotations like <code>def f(x: int) -> int</code> are stored as metadata and otherwise ignored at runtime — CPython never checks them, so <code>f('hi')</code> still runs. They're for readers and external tools (mypy, your editor), not enforcement.</p>",

    complexity: [
      { op: "call a function", big_o: "O(1) + body", note: "The call itself is cheap constant overhead (bind arguments, push a frame); the real cost is whatever the body does." },
      { op: "*args / **kwargs binding", big_o: "O(k)", note: "Packing extra arguments builds a tuple and a dict of size k, so it costs in proportion to how many extras you pass — usually tiny." },
      { op: "lambda as a sort key", big_o: "O(n log n)", note: "The lambda runs once per element while sorting, so it adds a constant factor to the sort's own O(n log n); a slow key function makes every comparison slower." }
    ],

    challenge: {
      prompt: "Write count_positives(nums) that returns how many numbers are greater than 0. Then explain what it returns if you forget the return statement.",
      starter: "def count_positives(nums):\n    # your code here\n\nprint(count_positives([-1, 2, 0, 5]))\n",
      solution:
        "def count_positives(nums):\n    c = 0\n    for n in nums:\n        if n > 0:\n            c += 1\n    return c\n# count_positives([-1, 2, 0, 5]) -> 2\n# Without the return, the function falls off the end and hands back None."
    }
  },

  {
    id: "recursion",
    title: "Recursion",
    difficulty: "Intermediate",
    estMinutes: 11,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A function that calls itself — the natural shape of trees, graphs, and try-a-choice/undo backtracking.",

    whatIsIt: [
      "A recursive function solves a big problem by calling itself on a smaller piece, until the piece is small enough to answer directly.",
      "Every recursion needs two parts: a <b>base case</b> that stops (and returns an answer directly), and a <b>recursive case</b> that shrinks the problem and calls itself.",
      "Each call gets its own <b>stack frame</b> — its own local variables — stacked on top of its caller. When a call returns, its frame pops and the value travels back <i>up</i> to the caller that was waiting."
    ],

    showMe: {
      code:
        "def factorial(n):\n" +
        "    if n == 0:          # base case: stop here\n" +
        "        return 1\n" +
        "    return n * factorial(n - 1)   # recursive case\n" +
        "\n" +
        "factorial(3)\n" +
        "# 3 * factorial(2)\n" +
        "#     2 * factorial(1)\n" +
        "#         1 * factorial(0)\n" +
        "#             -> 1     (base case)\n" +
        "#         -> 1\n" +
        "#     -> 2\n" +
        "# -> 6      returns travel back UP the stack\n" +
        "\n" +
        "# tree recursion: two calls per level (like a binary tree)\n" +
        "def fib(n):\n" +
        "    if n < 2:\n" +
        "        return n\n" +
        "    return fib(n - 1) + fib(n - 2)",
      viz: { type: "callStack", data: { calls: ["factorial(3)", "factorial(2)", "factorial(1)", "factorial(0)"], returns: ["1", "1", "2", "6"] } },
      caption: "Calls stack downward until the base case, then each return travels back up: 1 → 1 → 2 → 6."
    },

    whyDsa:
      "<p>Recursion is the natural shape of anything branching. A tree is defined in terms of smaller trees; a graph search explores a node then its neighbors; backtracking tries a choice, recurses, then undoes it. All of these are far cleaner recursive than as hand-managed loops.</p>" +
      "<pre class=\"why-pre\">def dfs(node):\n    if not node: return         → base case\n    process(node)\n    dfs(node.left)              → recurse on each child\n    dfs(node.right)</pre>" +
      "<p>Subsets, permutations, and backtracking are the same skeleton: <b>choose</b> an option, <b>recurse</b>, <b>un-choose</b> — the call stack remembers exactly where to resume when you back out.</p>",

    recognize: [
      { q: "“Walk a tree / explore a graph”", think: "recursion → dfs(node) with a base case for empty" },
      { q: "“Generate all subsets / permutations”", think: "backtracking → choose, recurse, un-choose" },
      { q: "“The problem is defined in terms of a smaller version of itself”", think: "recursive case → solve(n) uses solve(n-1)" },
      { q: "“I'm hitting RecursionError”", think: "missing/wrong base case, or genuinely too deep (~1000)" }
    ],

    matchTags: ["recursion", "backtracking", "tree", "dfs", "depth-first search"],
    relatedProblems: [],

    traps: [
      {
        bad: "def countdown(n):\n    print(n)\n    countdown(n - 1)   # never stops -> RecursionError",
        good: "def countdown(n):\n    if n < 0:          # base case\n        return\n    print(n)\n    countdown(n - 1)",
        why: "Without a base case (or with one the recursion never reaches) the calls never stop and you blow the stack. Always write the stopping condition first."
      },
      {
        bad: "def f(n):\n    if n == 0: return 0\n    f(n - 1) + 1   # value computed then thrown away",
        good: "def f(n):\n    if n == 0: return 0\n    return f(n - 1) + 1",
        why: "A recursive call's result only reaches the caller if you return it. Forgetting the return here makes the recursive case yield None."
      }
    ],

    cpython:
      "<p>CPython caps recursion depth at about <b>1000</b> nested calls (a guard against a C-level stack overflow) and raises <code>RecursionError</code> past it. You can lift it with <code>sys.setrecursionlimit(n)</code>, but on very deep inputs prefer an explicit stack / iterative version — raising the limit too far can crash the interpreter outright.</p>",

    complexity: [
      { op: "linear recursion (e.g. factorial)", big_o: "O(n)", note: "One call per level for n levels, so n frames of work total — same as a simple loop, plus the call overhead." },
      { op: "recursion call-stack space", big_o: "O(depth)", note: "Every pending call keeps a frame alive until it returns, so the deepest chain of unfinished calls sets your memory cost — O(n) for a linear chain, O(h) for a tree of height h." },
      { op: "tree recursion (e.g. naive fib)", big_o: "O(2ⁿ)", note: "Each call spawns two more, so the number of calls roughly doubles each level — which is why naive fib is exponential and why memoization matters." }
    ],

    challenge: {
      prompt: "Write a recursive sum_list(nums) that returns the sum of a list without using the built-in sum(). What's your base case?",
      starter: "def sum_list(nums):\n    # base case?\n    # recursive case?\n\nprint(sum_list([1, 2, 3, 4]))\n",
      solution:
        "def sum_list(nums):\n    if not nums:            # base case: empty list sums to 0\n        return 0\n    return nums[0] + sum_list(nums[1:])\n# sum_list([1, 2, 3, 4]) -> 10"
    }
  },

  {
    id: "comprehensions",
    title: "Comprehensions",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "Build a list, set, or dict from a loop in one readable line — the Pythonic way to transform and filter.",

    whatIsIt: [
      "A comprehension builds a new collection from an existing iterable in a single expression: <code>[expr for x in xs]</code> is a list, <code>{expr for x in xs}</code> a set, <code>{k: v for ...}</code> a dict.",
      "You can <b>filter</b> with a trailing <code>if</code>, and <b>transform</b> each element with the expression up front. The two are different jobs in different spots.",
      "In DSA they're everywhere: build a DP table, collect matching elements, invert a mapping, or flatten a grid — all without the boilerplate of an empty list plus <code>append</code> in a loop."
    ],

    showMe: {
      code:
        "nums = [1, 2, 3, 4]\n" +
        "\n" +
        "[x * x for x in nums]           # list  -> [1, 4, 9, 16]\n" +
        "{x % 3 for x in nums}           # set   -> {1, 2, 0}\n" +
        "{x: x * x for x in nums}        # dict  -> {1: 1, 2: 4, ...}\n" +
        "\n" +
        "# filter: trailing 'if' keeps only some elements\n" +
        "[x for x in nums if x % 2 == 0] # -> [2, 4]\n" +
        "\n" +
        "# conditional EXPRESSION: choose the value per element\n" +
        "['even' if x % 2 == 0 else 'odd' for x in nums]\n" +
        "\n" +
        "# nested: build an n x m grid of zeros (independent rows!)\n" +
        "grid = [[0] * m for _ in range(n)]\n" +
        "\n" +
        "# flatten a 2D grid into one list\n" +
        "flat = [v for row in grid for v in row]\n" +
        "\n" +
        "# generator expression: parentheses, streams one at a time\n" +
        "total = sum(x * x for x in nums)   # no full list built",
      caption: "Filter with a trailing 'if'; pick a value with 'a if cond else b' up front. Parentheses make a lazy generator instead of a list."
    },

    whyDsa:
      "<p>Comprehensions turn a four-line accumulate loop into one line that reads like what it produces — less to write, less to misread.</p>" +
      "<pre class=\"why-pre\">out = []\nfor x in xs:\n    if ok(x):\n        out.append(f(x))\n# becomes:\nout = [f(x) for x in xs if ok(x)]</pre>" +
      "<p>The generator form matters for memory: <code>sum(x*x for x in xs)</code> streams one value at a time instead of materializing a whole list — useful when the input is huge and you only need to fold over it once.</p>",

    recognize: [
      { q: "“Transform every element into something”", think: "map → [f(x) for x in xs]" },
      { q: "“Keep only elements that match”", think: "filter → [x for x in xs if cond]" },
      { q: "“Build a 2D DP table / grid”", think: "nested → [[0]*cols for _ in range(rows)]" },
      { q: "“Sum/any/max over a transform of a big input”", think: "generator → sum(f(x) for x in xs)  (no list built)" }
    ],

    matchTags: [],
    relatedProblems: [],

    traps: [
      {
        bad: "grid = [[0] * m] * n     # n references to ONE row",
        good: "grid = [[0] * m for _ in range(n)]",
        why: "Multiplying a list of lists copies the reference, not the row — grid[0][0] = 1 changes every row. The comprehension runs [0]*m fresh each iteration, giving n independent rows."
      },
      {
        bad: "[print(x) for x in xs]   # building a list of Nones just to loop",
        good: "for x in xs:\n    print(x)",
        why: "Comprehensions are for BUILDING a collection. Using one only for its side effect creates a throwaway list of Nones and hides the intent — use a plain for loop."
      },
      {
        bad: "[y for sub in data for y in sub if y > 0 if len(sub) > 1 ...]",
        good: "result = []\nfor sub in data:\n    if len(sub) > 1:\n        for y in sub:\n            if y > 0:\n                result.append(y)",
        why: "Once a comprehension has several clauses and conditions it stops being readable. If you have to pause to parse it, a plain loop is the better tool."
      }
    ],

    cpython:
      "<p>A generator expression uses <b>parentheses</b> and is lazy: it produces values one at a time and holds only the current one in memory, so <code>sum(x*x for x in big)</code> never builds the full list. A list comprehension with <code>[]</code> is eager — it materializes every element at once.</p>",

    complexity: [
      { op: "[f(x) for x in xs]", big_o: "O(n)", note: "Runs the expression once per element and appends it, so the cost scales linearly with the input — the same work as the equivalent for-loop, just faster in practice." },
      { op: "[f(x) for x in xs if cond]", big_o: "O(n)", note: "Still one pass over all n elements; the filter only decides whether to keep each, so it doesn't change the linear order." },
      { op: "[[0]*m for _ in range(n)]", big_o: "O(n·m)", note: "Builds n rows of m cells each, so the total work is the size of the grid — exactly what you'd expect for allocating a 2D table." },
      { op: "(f(x) for x in xs)  generator", big_o: "O(1) space", note: "Creating the generator does no work and holds one value at a time; the O(n) time only happens as something consumes it, making it the memory-friendly choice for a single pass." }
    ],

    challenge: {
      prompt: "Given words = ['hi', 'hello', 'hey', 'yo'], use a comprehension to build a list of only the words longer than 2 characters, uppercased.",
      starter: "words = ['hi', 'hello', 'hey', 'yo']\nresult = # your comprehension here\nprint(result)\n",
      solution:
        "words = ['hi', 'hello', 'hey', 'yo']\nresult = [w.upper() for w in words if len(w) > 2]\n# -> ['HELLO', 'HEY']"
    }
  }
]);
