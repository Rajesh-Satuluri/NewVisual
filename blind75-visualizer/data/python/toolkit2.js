/*
 * data/python/toolkit2.js — "DSA Toolkit" section (part 2).
 * More standard-library tools you reach for in interviews:
 * functools.cache, itertools, math, custom sorting.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("DSA Toolkit", [
  {
    id: "functools-cache",
    title: "functools · cache",
    difficulty: "Intermediate",
    estMinutes: 8,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "One decorator that turns an exponential recursion into O(n) — the fastest way to memoize in an interview.",

    whatIsIt: [
      "<b>@functools.cache</b> remembers what a function returned for each set of arguments. Call it again with the same args and it hands back the stored answer instead of recomputing.",
      "For a recursive solution that revisits the same subproblems — naive Fibonacci, top-down DP — that memory collapses an <code>O(2^n)</code> tree of calls into <code>O(n)</code> distinct calls.",
      "<code>@functools.cache</code> (Python 3.9+) is just <code>@lru_cache(maxsize=None)</code> — an unbounded cache. The arguments must be <b>hashable</b>, because they become dict keys."
    ],

    showMe: {
      code:
        "import functools\n" +
        "\n" +
        "@functools.cache            # memoize every (n,) it is called with\n" +
        "def fib(n):\n" +
        "    if n < 2:\n" +
        "        return n\n" +
        "    return fib(n - 1) + fib(n - 2)\n" +
        "\n" +
        "print(fib(30))              # 832040  -- O(n) calls, not O(2^n)\n" +
        "print(fib.cache_info())     # hits/misses prove the memo is working\n" +
        "\n" +
        "# @cache is exactly @lru_cache(maxsize=None):\n" +
        "@functools.lru_cache(maxsize=None)\n" +
        "def climb(n):               # ways to climb n stairs (1 or 2 at a time)\n" +
        "    if n <= 2:\n" +
        "        return n\n" +
        "    return climb(n - 1) + climb(n - 2)\n" +
        "\n" +
        "print(climb(10))            # 89",
      caption: "Add one line above a recursive function and repeated subproblems are answered from a dict — exponential becomes linear."
    },

    whyDsa:
      "<p>Naive Fibonacci recomputes the same subtrees over and over — <code>fib(5)</code> calls <code>fib(3)</code> twice, and it explodes from there into <code>O(2^n)</code> calls.</p>" +
      "<pre class=\"why-pre\">def fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)   → O(2^n)  (recomputes everything)</pre>" +
      "<p>Cache the results and each <code>n</code> is computed once; every later hit is O(1), so the whole thing is O(n). This is the fastest way to turn a clean recursive idea into an accepted top-down DP under interview time pressure.</p>" +
      "<pre class=\"why-pre\">@functools.cache\ndef fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)   → O(n)  (each n computed once)</pre>",

    recognize: [
      { q: "“My recursion is correct but times out / recomputes”", think: "overlapping subproblems → slap @functools.cache on it" },
      { q: "“Top-down DP: define f(state) in terms of smaller states”", think: "memoize f → @cache, args are the state" },
      { q: "“Count the ways to reach n (stairs, decode, coins)”", think: "recursive count + @cache = O(states)" },
      { q: "“The recursive args are ints/strings/tuples”", think: "hashable → @cache works directly (lists don't — use tuples)" }
    ],

    matchTags: ["dynamic programming", "memoization", "recursion", "top down", "dp"],
    relatedProblems: ["climbing-stairs", "coin-change", "house-robber", "decode-ways"],

    traps: [
      {
        bad: "@functools.cache\ndef solve(grid, i, j):   # grid is a list of lists",
        good: "@functools.cache\ndef solve(i, j):   # pass only hashable state; read grid from outer scope",
        why: "Cache keys must be hashable, and lists/dicts are not. Keep only hashable values (ints, strings, tuples) in the arguments and close over the mutable grid, or convert rows to tuples."
      },
      {
        bad: "@functools.cache\ndef f(n, seen):   # seen is a set that changes per call",
        good: "@functools.cache\ndef f(n):   # cache only pure functions of the args",
        why: "Memoization assumes the same args always give the same answer. If a mutable argument (or hidden global state) changes between calls, the cache returns stale results. Only cache functions whose output depends solely on their hashable arguments."
      }
    ],

    cpython:
      "<p>The decorator wraps your function and keeps a dict from the argument tuple to the return value. On each call it builds a key from the args, looks it up, and either returns the hit or runs the body and stores the result. <code>@cache</code> never evicts (unbounded); <code>@lru_cache(maxsize=N)</code> caps the size and drops the least-recently-used entry, which is why unbounded <code>@cache</code> is the simpler default for DP where you want every state kept.</p>",

    complexity: [
      { op: "cached call, first time (miss)", big_o: "O(work)", note: "Runs the function body once and stores the result — the normal cost, paid a single time per distinct argument set." },
      { op: "cached call, repeat (hit)", big_o: "O(1) avg", note: "A hash-table lookup on the argument tuple returns the stored answer without re-running the body." },
      { op: "memoized recursion overall", big_o: "O(#states)", note: "Each distinct state is computed once; overlapping subproblems become O(1) hits, so total work is the number of distinct states times the work per state." },
      { op: "extra space", big_o: "O(#states)", note: "The cache stores one entry per distinct argument set — the memory you trade for the speedup." }
    ],

    challenge: {
      prompt: "The recursive fib below is correct but exponential. Add one line so fib(50) returns instantly, then print fib(50).",
      starter: "import functools\n\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(10))\n",
      solution:
        "import functools\n\n@functools.cache\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(50))   # 12586269025 -- instant with the cache"
    }
  },

  {
    id: "itertools",
    title: "itertools",
    difficulty: "Intermediate",
    estMinutes: 10,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Combinatorics and scanning done for you — the loops behind backtracking and prefix sums, in one call.",

    whatIsIt: [
      "<b>itertools</b> is a box of iterator builders. The combinatorics ones — <code>product</code>, <code>permutations</code>, <code>combinations</code>, <code>combinations_with_replacement</code> — generate exactly the shapes backtracking problems ask for.",
      "The scanning ones — <code>accumulate</code> (running/prefix sums), <code>pairwise</code> (adjacent pairs), <code>chain</code> (glue iterables), <code>groupby</code> (runs of equal items) — replace hand-written index loops.",
      "They're <b>lazy</b>: each yields items one at a time, so you can wrap them in <code>list(...)</code> to see everything or iterate without building the whole result in memory."
    ],

    showMe: {
      code:
        "from itertools import (product, permutations, combinations,\n" +
        "                       combinations_with_replacement, accumulate,\n" +
        "                       pairwise, chain, groupby)\n" +
        "\n" +
        "# --- combinatorics (backtracking shapes) ---\n" +
        "print(list(product([0, 1], repeat=2)))   # grid / all choices per slot\n" +
        "print(list(permutations([1, 2, 3], 2)))  # ordered, no repeats\n" +
        "print(list(combinations([1, 2, 3], 2)))  # unordered subsets\n" +
        "print(list(combinations_with_replacement([1, 2], 2)))  # reuse allowed\n" +
        "\n" +
        "# --- scanning ---\n" +
        "print(list(accumulate([1, 2, 3, 4])))    # [1, 3, 6, 10]  prefix sums\n" +
        "print(list(pairwise([1, 2, 3, 4])))      # [(1,2),(2,3),(3,4)]\n" +
        "print(list(chain([1, 2], [3, 4])))       # [1, 2, 3, 4]\n" +
        "print([(k, list(g)) for k, g in groupby(\"aabbbc\")])  # runs",
      caption: "Each builder maps to a problem shape: product/permutations/combinations for backtracking, accumulate for prefix sums, pairwise/chain/groupby for scanning."
    },

    whyDsa:
      "<p>Backtracking is “enumerate a structured set of choices.” itertools generates those sets directly, so you can prototype (or replace) the recursion:</p>" +
      "<pre class=\"why-pre\">combinations(nums, k)  → k-subsets      (Combinations)\npermutations(nums)     → all orderings  (Permutations)\nproduct(opts, repeat) → one choice per slot (letter combos, grids)</pre>" +
      "<p>And <code>accumulate</code> is a prefix-sum array in one call — the setup for range-sum and subarray problems:</p>" +
      "<pre class=\"why-pre\">prefix = [0] + list(accumulate(nums))\nrange_sum(i, j) = prefix[j+1] - prefix[i]   → O(1) per query</pre>",

    recognize: [
      { q: "“All subsets / combinations of size k”", think: "combinations(nums, k)" },
      { q: "“All orderings / arrangements”", think: "permutations(nums)" },
      { q: "“One choice from each position (phone-letter combos, grids)”", think: "product(options, repeat=n)" },
      { q: "“Range sums / running total / prefix sums”", think: "accumulate(nums)  (build a prefix array)" },
      { q: "“Compare each element with its neighbour”", think: "pairwise(seq)  → (a, b) adjacent pairs" },
      { q: "“Collapse consecutive equal items (run-length)”", think: "groupby(seq)  → (value, run)" }
    ],

    matchTags: ["backtracking", "combinatorics", "prefix sum", "subsets", "permutations", "iteration"],
    relatedProblems: ["subsets", "permutations", "combinations", "letter-combinations-of-a-phone-number"],

    traps: [
      {
        bad: "combos = combinations(nums, 2)\nprint(len(combos))   # TypeError: no len on an iterator",
        good: "combos = list(combinations(nums, 2))\nprint(len(combos))",
        why: "itertools objects are lazy iterators, not lists — they have no len() and can only be consumed once. Wrap in list() when you need to count, index, or reuse them."
      },
      {
        bad: "for k, g in groupby(nums):   # nums = [1, 2, 1]\n    ...   # expecting distinct groups",
        good: "for k, g in groupby(sorted(nums)):\n    ...",
        why: "groupby only groups CONSECUTIVE equal items — [1, 2, 1] yields three groups, not two. Sort first if you want all equal values collected into one group."
      }
    ],

    cpython:
      "<p>Every itertools function returns a C-implemented iterator that computes each item on demand — nothing is materialized until you consume it. That laziness keeps memory O(1) for the iterator itself even when the full result would be huge (e.g. <code>permutations</code> of a long list), so you pay only for what you actually pull out.</p>",

    complexity: [
      { op: "combinations(n, k) / permutations", big_o: "O(count) total", note: "Each item is produced in O(k); the total work is the number of tuples generated — which grows combinatorially, so guard the input size." },
      { op: "product(iters, repeat=r)", big_o: "O(count) total", note: "Yields the full Cartesian product; the count is the product of the input sizes, so it blows up fast — fine for small slot counts." },
      { op: "accumulate(it)", big_o: "O(n)", note: "One pass, emitting the running total after each element — exactly the cost of building a prefix-sum array." },
      { op: "pairwise / chain", big_o: "O(n)", note: "A single lazy pass over the input(s); pairwise emits n-1 adjacent pairs, chain streams the inputs back to back." },
      { op: "groupby(it)", big_o: "O(n)", note: "One pass that batches consecutive equal keys — remember it only sees runs, so sort first if order isn't guaranteed." }
    ],

    challenge: {
      prompt: "Use itertools.combinations to build the full power set (every subset, all sizes) of [1, 2, 3, 4], then print it and its length (should be 16).",
      starter: "from itertools import combinations\nnums = [1, 2, 3, 4]\n# print every 2-element subset to get started\nprint(list(combinations(nums, 2)))\n",
      solution:
        "from itertools import combinations\nnums = [1, 2, 3, 4]\nsubsets = [list(c) for r in range(len(nums) + 1) for c in combinations(nums, r)]\nprint(subsets)        # all subsets, sizes 0..4\nprint(len(subsets))   # 16 == 2 ** 4"
    }
  },

  {
    id: "math",
    title: "math",
    difficulty: "Intermediate",
    estMinutes: 8,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "The small pile of number helpers interviews lean on — infinity seeds, gcd/lcm, exact isqrt, and the floor gotcha.",

    whatIsIt: [
      "<b>math.inf</b> and <b>-math.inf</b> are true positive/negative infinity — the safe seed for a running min/max or an unreachable cell in DP and grid problems (bigger/smaller than any real value).",
      "<b>math.gcd</b> / <b>math.lcm</b> handle divisibility; <b>math.isqrt</b> gives the exact integer floor of a square root with <i>no</i> float error; <b>math.comb</b> / <b>math.perm</b> compute n-choose-k and ordered counts.",
      "<b>math.floor</b> / <b>math.ceil</b> round to integers — and the subtle one: Python's <code>//</code> floors toward negative infinity, which is <i>not</i> the same as <code>int()</code> truncating toward zero on negatives."
    ],

    showMe: {
      code:
        "import math\n" +
        "\n" +
        "print(math.inf > 10**18)     # True  -- larger than any real value\n" +
        "print(-math.inf < -10**18)   # True  -- seed for a running max\n" +
        "\n" +
        "print(math.gcd(12, 18))      # 6\n" +
        "print(math.lcm(4, 6))        # 12\n" +
        "print(math.isqrt(17))        # 4   exact integer sqrt (no float error)\n" +
        "print(math.comb(5, 2))       # 10  n-choose-k\n" +
        "print(math.perm(5, 2))       # 20  ordered arrangements\n" +
        "print(math.floor(3.7), math.ceil(3.2))   # 3 4\n" +
        "\n" +
        "# the negatives gotcha: // and math.floor agree, int() does NOT\n" +
        "print(-7 // 2)               # -4  (floors toward -inf)\n" +
        "print(math.floor(-7 / 2))    # -4\n" +
        "print(int(-7 / 2))           # -3  (int() truncates toward zero!)",
      caption: "math.inf seeds min/max and DP tables; gcd/lcm/isqrt/comb are exact integer helpers; watch how // floors negatives toward -infinity."
    },

    whyDsa:
      "<p>DP and grid problems start cells at “impossible” and relax toward the answer. <code>math.inf</code> is the clean seed — any real candidate beats it, so the first <code>min</code> just works:</p>" +
      "<pre class=\"why-pre\">dp = [math.inf] * (amount + 1)   # coin change: unreachable\ndp[0] = 0\n...\ndp[a] = min(dp[a], dp[a - coin] + 1)</pre>" +
      "<p>And <code>isqrt</code> avoids the classic float bug where <code>int(n ** 0.5)</code> is off by one for large perfect squares:</p>" +
      "<pre class=\"why-pre\">math.isqrt(n) ** 2 == n   → exact “is n a perfect square?”</pre>",

    recognize: [
      { q: "“Seed a running min / max or a DP table”", think: "start at math.inf / -math.inf" },
      { q: "“Reduce a fraction / step size / period”", think: "math.gcd (and math.lcm for common multiples)" },
      { q: "“Is n a perfect square? floor of a big sqrt”", think: "math.isqrt(n) -- exact, no float error" },
      { q: "“Count combinations / arrangements”", think: "math.comb(n, k) / math.perm(n, k)" },
      { q: "“Round / index with negatives involved”", think: "// floors toward -inf; int() truncates toward 0" }
    ],

    matchTags: ["math", "dynamic programming", "number theory", "gcd", "grid"],
    relatedProblems: ["coin-change", "valid-perfect-square", "sqrtx", "unique-paths"],

    traps: [
      {
        bad: "root = int(n ** 0.5)\nis_square = root * root == n   # float error trips large n",
        good: "root = math.isqrt(n)\nis_square = root * root == n",
        why: "n ** 0.5 is a float and loses precision on large integers, so int(...) can land one short of the true root. math.isqrt does exact integer arithmetic — always correct."
      },
      {
        bad: "mid = int((lo + hi) / 2)   # fine for positives, wrong idea on negatives",
        good: "mid = (lo + hi) // 2",
        why: "int() truncates toward zero, so int(-7/2) is -3 while -7 // 2 is -4. For array midpoints and any floor-toward-negative-infinity intent, use // (or math.floor), not int()."
      }
    ],

    cpython:
      "<p>Most of <code>math</code> is a thin wrapper over the C library and works on floats, but the integer-focused helpers — <code>gcd</code>, <code>lcm</code>, <code>isqrt</code>, <code>comb</code>, <code>perm</code> — operate on Python's arbitrary-precision ints and return exact integers with no floating-point rounding. <code>math.inf</code> is the IEEE-754 float infinity, so comparisons against it are ordinary float comparisons and always land the way you expect against real numbers.</p>",

    complexity: [
      { op: "math.inf comparison", big_o: "O(1)", note: "An ordinary float comparison — infinity is greater/less than every finite value, so min/max seeding is free." },
      { op: "math.gcd(a, b)", big_o: "O(log min(a, b))", note: "The Euclidean algorithm halves the problem quickly; lcm is gcd plus one multiply and divide." },
      { op: "math.isqrt(n)", big_o: "O(log n) ops", note: "Exact integer square root via Newton-style iteration on big ints — no float, so no off-by-one on large perfect squares." },
      { op: "math.comb(n, k) / perm", big_o: "O(k)", note: "Computes the product/ratio in about k multiplications on big ints — exact even when the result is enormous." },
      { op: "math.floor / ceil, // ", big_o: "O(1)", note: "Constant-time rounding; remember // and math.floor go toward -infinity while int() truncates toward zero." }
    ],

    challenge: {
      prompt: "Coin change setup: seed a dp array of length amount+1 with math.inf, set dp[0]=0, then print the array for amount=5 to confirm the 'unreachable' seed.",
      starter: "import math\namount = 5\ndp = [math.inf] * (amount + 1)\nprint(dp)   # all inf so far -- now set the base case\n",
      solution:
        "import math\namount = 5\ndp = [math.inf] * (amount + 1)\ndp[0] = 0\nprint(dp)   # [0, inf, inf, inf, inf, inf] -- every real cost beats inf"
    }
  },

  {
    id: "custom-sorting",
    title: "Custom Sorting",
    difficulty: "Intermediate",
    estMinutes: 9,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "sorted(key=...) does almost everything — tuple keys, mixed directions, stability, and cmp_to_key for the rest.",

    whatIsIt: [
      "<b>sorted(iterable, key=f)</b> sorts by whatever <code>f(x)</code> returns, not by <code>x</code> itself. Sort by length with <code>key=len</code>, by an attribute with <code>key=lambda o: o.age</code>.",
      "Return a <b>tuple</b> from the key to sort by several fields at once: <code>key=lambda p: (p.last, p.first)</code>. Flip one field to descending by negating it — <code>(-score, name)</code> is score-desc, name-asc.",
      "Python's sort is <b>stable</b>: equal keys keep their original order. When negation won't work (strings, custom pairwise rules), <b>functools.cmp_to_key</b> turns an old-style compare-two function into a key."
    ],

    showMe: {
      code:
        "from functools import cmp_to_key\n" +
        "\n" +
        "words = [\"pear\", \"fig\", \"apple\", \"kiwi\"]\n" +
        "print(sorted(words, key=len))               # by length, ascending\n" +
        "print(sorted(words, key=len, reverse=True))  # longest first\n" +
        "\n" +
        "people = [(\"Ann\", 30), (\"Bob\", 25), (\"Ann\", 20)]\n" +
        "# multi-key: name ASC, then age DESC (negate the numeric field)\n" +
        "print(sorted(people, key=lambda p: (p[0], -p[1])))\n" +
        "\n" +
        "# cmp_to_key: pairwise rule for Largest Number\n" +
        "nums = [3, 30, 34, 5, 9]\n" +
        "def cmp(a, b):\n" +
        "    if a + b > b + a: return -1   # a should come first\n" +
        "    if a + b < b + a: return 1\n" +
        "    return 0\n" +
        "order = sorted(map(str, nums), key=cmp_to_key(cmp))\n" +
        "print(\"\".join(order))                        # 9534330",
      caption: "key= handles single fields, tuple keys handle multi-key (negate a number to reverse just that field); cmp_to_key covers pairwise rules negation can't express."
    },

    whyDsa:
      "<p>Most sorting tasks are one <code>key=</code> away. Multi-field ordering — “by score descending, then name ascending” — is a single tuple key with one field negated:</p>" +
      "<pre class=\"why-pre\">sorted(rows, key=lambda r: (-r.score, r.name))   → score ↓, name ↑</pre>" +
      "<p>Some orderings can't be expressed by transforming one element — “Largest Number” needs to compare two candidates by <code>a+b vs b+a</code>. That's what <code>cmp_to_key</code> is for:</p>" +
      "<pre class=\"why-pre\">sorted(strs, key=cmp_to_key(lambda a, b: (a+b < b+a) - (a+b > b+a)))</pre>",

    recognize: [
      { q: "“Sort by a computed value / an attribute”", think: "sorted(xs, key=lambda x: ...)" },
      { q: "“Sort by A, then break ties by B”", think: "tuple key → key=lambda x: (A, B)" },
      { q: "“Field A descending but field B ascending”", think: "negate the numeric field → (-A, B)" },
      { q: "“Order depends on comparing two items directly”", think: "cmp_to_key(compare)  (e.g. Largest Number)" },
      { q: "“Ties must keep their original order”", think: "rely on Python's stable sort — no extra work" }
    ],

    matchTags: ["sorting", "custom sort", "comparator", "greedy", "intervals"],
    relatedProblems: ["largest-number", "merge-intervals", "sort-colors", "meeting-rooms"],

    traps: [
      {
        bad: "sorted(rows, key=lambda r: (-r.name, r.score))   # can't negate a string",
        good: "sorted(rows, key=lambda r: (r.name, -r.score))   # or cmp_to_key for descending strings",
        why: "Negation only reverses NUMERIC fields. To sort a string (or other non-numeric) field descending, sort ascending and reverse, split into passes using stability, or use cmp_to_key."
      },
      {
        bad: "nums.sort(key=cmp)   # passing a two-argument compare directly",
        good: "from functools import cmp_to_key\nnums.sort(key=cmp_to_key(cmp))",
        why: "Python 3 removed the cmp= parameter; key= expects a ONE-argument function returning a sort value. Wrap any two-argument comparator in functools.cmp_to_key to use it."
      }
    ],

    cpython:
      "<p>Sorting uses Timsort, an adaptive, <b>stable</b> merge sort that runs in O(n log n) and exploits already-ordered runs (near-sorted input approaches O(n)). With <code>key=</code>, each element's key is computed <i>once</i> up front (the decorate-sort-undecorate pattern), so an expensive key isn't recomputed on every comparison. <code>cmp_to_key</code> wraps your comparator in a small object whose <code>__lt__</code> calls it — correct, but with per-comparison overhead, so prefer a plain <code>key=</code> when one exists.</p>",

    complexity: [
      { op: "sorted(xs) / list.sort()", big_o: "O(n log n)", note: "Timsort's worst and average case; already-sorted or reverse-sorted runs are detected and can approach O(n)." },
      { op: "key= (per element)", big_o: "O(n) key calls", note: "The key function runs exactly once per element before sorting, not once per comparison — cheap even if the key is a bit costly." },
      { op: "tuple key comparison", big_o: "O(fields)", note: "Tuples compare field by field, stopping at the first difference — so multi-key sorting adds only a small constant per comparison." },
      { op: "cmp_to_key(compare)", big_o: "O(n log n)", note: "Same asymptotic sort, but each of the ~n log n comparisons calls your Python comparator — slower by a constant than a direct key=." },
      { op: "stability", big_o: "—", note: "Equal keys keep input order, which lets you sort in passes (least significant field first) instead of one big comparator." }
    ],

    challenge: {
      prompt: "Sort records = [(\"Ann\", 85), (\"Bob\", 92), (\"Cid\", 85)] by score DESCENDING, then name ASCENDING, in a single sorted() call. Expected: [('Bob', 92), ('Ann', 85), ('Cid', 85)].",
      starter: "records = [(\"Ann\", 85), (\"Bob\", 92), (\"Cid\", 85)]\n# one tuple key, mixed directions\nprint(sorted(records, key=lambda r: r[1], reverse=True))\n",
      solution:
        "records = [(\"Ann\", 85), (\"Bob\", 92), (\"Cid\", 85)]\nout = sorted(records, key=lambda r: (-r[1], r[0]))   # score DESC, name ASC\nprint(out)   # [('Bob', 92), ('Ann', 85), ('Cid', 85)]"
    }
  }
]);
