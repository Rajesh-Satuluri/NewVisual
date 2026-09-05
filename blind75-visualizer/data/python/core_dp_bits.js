/*
 * data/python/core_dp_bits.js — extra "Core Python" topics:
 * Bit Manipulation and Dynamic Programming.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Core Python", [
  {
    id: "bit-manipulation",
    title: "Bit Manipulation",
    difficulty: "Intermediate",
    estMinutes: 12,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Work on the raw bits of an integer \u2014 test, flip, count, and XOR your way through a whole NeetCode track.",

    whatIsIt: [
      "Every integer is a row of <b>bits</b> (base-2 digits). Bit manipulation is operating on those bits directly with <code>&amp;</code> (AND), <code>|</code> (OR), <code>^</code> (XOR), <code>~</code> (NOT), and the shifts <code>&lt;&lt;</code> / <code>&gt;&gt;</code>.",
      "The four things you do to a single bit <code>i</code>: <b>test</b> it with <code>(x &gt;&gt; i) &amp; 1</code>, <b>set</b> it with <code>x | (1 &lt;&lt; i)</code>, <b>clear</b> it with <code>x &amp; ~(1 &lt;&lt; i)</code>, and <b>toggle</b> it with <code>x ^ (1 &lt;&lt; i)</code>.",
      "A handful of idioms carry most bit problems: <code>x &amp; 1</code> is parity (odd/even), <code>x &amp; (x-1)</code> clears the lowest set bit, <code>x &amp; -x</code> isolates it, and XOR cancels pairs because <code>a ^ a == 0</code>.",
      "Python ints are <b>arbitrary precision</b> \u2014 they never overflow \u2014 so when a problem assumes fixed 32-bit words you mask with <code>&amp; 0xFFFFFFFF</code> to keep only the low 32 bits."
    ],

    showMe: {
      code:
        "x = 0b1011              # 11\n" +
        "print(bin(x))          # 0b1011\n" +
        "\n" +
        "# the operators\n" +
        "print(5 & 3)           # AND -> 1\n" +
        "print(5 | 3)           # OR  -> 7\n" +
        "print(5 ^ 3)           # XOR -> 6\n" +
        "print(5 << 1)          # shift left  -> 10\n" +
        "print(5 >> 1)          # shift right -> 2\n" +
        "\n" +
        "# test / set / clear / toggle bit i\n" +
        "i = 2\n" +
        "print((x >> i) & 1)          # TEST bit 2   -> 0\n" +
        "print(bin(x | (1 << i)))     # SET bit 2    -> 0b1111\n" +
        "print(bin(x & ~(1 << 0)))    # CLEAR bit 0  -> 0b1010\n" +
        "print(bin(x ^ (1 << 0)))     # TOGGLE bit 0 -> 0b1010\n" +
        "\n" +
        "# the three idioms you reach for constantly\n" +
        "print(x & 1)                 # parity: 1 -> odd\n" +
        "print(bin(x & (x - 1)))      # drops LOWEST set bit -> 0b1010\n" +
        "print(bin(x & -x))           # ISOLATES lowest set bit -> 0b1\n" +
        "\n" +
        "# count set bits (bin().count works everywhere, incl. Pyodide)\n" +
        "print(bin(x).count('1'))     # 3   (3.10+: x.bit_count())",
      caption: "The five operators, then test/set/clear/toggle a bit, then x&1 (parity), x&(x-1) (clear lowest), x&-x (isolate lowest)."
    },

    whyDsa:
      "<p>A whole NeetCode track is just these idioms. <b>Counting set bits</b> the fast way uses <code>x &amp; (x-1)</code>, which erases the lowest 1-bit each step \u2014 so you loop only as many times as there are 1s (Brian Kernighan), not 32 times.</p>" +
      "<pre class=\"why-pre\">count = 0\nwhile x:\n    x &= x - 1     \u2192 clears the lowest set bit\n    count += 1     \u2192 loops once per 1-bit</pre>" +
      "<p>The same trick is a one-line <b>power-of-two check</b>: a power of two has exactly one set bit, so clearing it leaves zero.</p>" +
      "<pre class=\"why-pre\">is_pow2 = x > 0 and (x & (x - 1)) == 0</pre>" +
      "<p><b>XOR</b> powers \u201cfind the single number\u201d: XOR every element and the pairs cancel (<code>a ^ a == 0</code>), leaving the loner. And because Python ints never overflow, <b>reverse-bits</b> / <b>sum-of-two-integers</b> problems need you to mask back to a 32-bit window with <code>&amp; 0xFFFFFFFF</code>.</p>" +
      "<pre class=\"why-pre\">ans = 0\nfor n in nums:\n    ans ^= n       \u2192 pairs cancel, the unique value survives</pre>",

    recognize: [
      { q: "\u201cEvery element appears twice except one \u2014 find it\u201d", think: "XOR them all \u2192 pairs cancel (a ^ a == 0), loner remains" },
      { q: "\u201cCount the 1-bits / Hamming weight\u201d", think: "loop x &= x - 1 (once per set bit), or bin(x).count('1')" },
      { q: "\u201cIs this a power of two?\u201d", think: "x > 0 and (x & (x - 1)) == 0" },
      { q: "\u201cReverse bits / add without + \u2014 assume 32-bit\u201d", think: "mask each step with & 0xFFFFFFFF (Python ints don't overflow)" },
      { q: "\u201cCheck / flip a specific bit\u201d", think: "test (x>>i)&1, set x|(1<<i), clear x&~(1<<i), toggle x^(1<<i)" }
    ],

    matchTags: ["bit manipulation", "bitwise", "xor", "bit", "binary"],
    relatedProblems: ["single-number", "number-of-1-bits", "counting-bits", "reverse-bits", "sum-of-two-integers", "missing-number"],

    traps: [
      {
        bad: "if x & 1 == 0:   # parses as x & (1 == 0) -> x & False",
        good: "if (x & 1) == 0:",
        why: "Comparisons bind TIGHTER than the bitwise operators &, |, ^ in Python. Without parentheses, x & 1 == 0 is x & (1 == 0). Always parenthesize the bit op before comparing."
      },
      {
        bad: "x = -1\nreverse_bits(x)   # negative ints have infinite leading 1s",
        good: "x &= 0xFFFFFFFF   # keep only the low 32 bits first",
        why: "Python ints are arbitrary precision, so ~ and negatives behave as if there are infinitely many sign bits. For fixed-width (32-bit) problems, mask with & 0xFFFFFFFF to pin the value into a real 32-bit window."
      },
      {
        bad: "count = x.bit_count()   # AttributeError before Python 3.10",
        good: "count = bin(x).count('1')   # works on every version",
        why: "int.bit_count() only exists in Python 3.10+ (and isn't in older Pyodide builds). bin(x).count('1') is the portable equivalent \u2014 use it when you can't guarantee the version."
      }
    ],

    cpython:
      "<p>CPython stores an <code>int</code> as a variable-length array of 30-bit \u201cdigits\u201d, which is why it has no fixed width and never overflows \u2014 it just grows more digits. The bitwise operators act on the two's-complement view of that value, and a negative number behaves as if it has an infinite run of leading 1-bits, so <code>~x == -x - 1</code>. <code>int.bit_count()</code> (3.10+) is a C-level popcount; <code>bin(x).count('1')</code> is the version-independent fallback.</p>",

    complexity: [
      { op: "x & y, x | y, x ^ y, x << k, x >> k", big_o: "O(1)*", note: "Constant time for the machine-word ints you meet in interviews; on a huge arbitrary-precision int it scales with the number of digits, but that rarely matters here." },
      { op: "(x >> i) & 1 / x | (1 << i) / x & ~(1 << i)", big_o: "O(1)", note: "Testing, setting, or clearing a single bit is a couple of primitive operations \u2014 no loop." },
      { op: "count bits via while x: x &= x - 1", big_o: "O(set bits)", note: "Each iteration removes exactly one 1-bit, so it loops only as many times as there are 1s \u2014 at most 32 for a 32-bit number, often far fewer." },
      { op: "bin(x).count('1')", big_o: "O(b)", note: "Builds the binary string and scans it once, so it costs in proportion to the number of bits b \u2014 fine in practice, though x.bit_count() (3.10+) avoids the string." },
      { op: "XOR-reduce a list", big_o: "O(n)", note: "One pass folding ^ over every element \u2014 the standard O(1)-space way to find a unique value among pairs." }
    ],

    challenge: {
      prompt: "Given nums where every value appears exactly twice except one, return the single number using O(1) extra space. Try nums = [4, 1, 2, 1, 2].",
      starter: "nums = [4, 1, 2, 1, 2]\n# XOR them all together\n",
      solution:
        "nums = [4, 1, 2, 1, 2]\nunique = 0\nfor n in nums:\n    unique ^= n   # pairs cancel (a ^ a == 0)\nprint(unique)   # 4"
    }
  },

  {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    difficulty: "Advanced",
    estMinutes: 16,
    dsaRelevance: 3,
    prerequisites: ["recursion"],
    tagline: "Solve each subproblem once and reuse the answer \u2014 the framework behind a huge slice of hard problems.",

    whatIsIt: [
      "<b>Dynamic programming</b> applies when a problem has two properties: <b>optimal substructure</b> (the best answer is built from best answers to smaller pieces) and <b>overlapping subproblems</b> (those pieces repeat again and again).",
      "When both hold, plain recursion recomputes the same pieces exponentially many times. DP fixes that by <b>storing</b> each subproblem's answer and reusing it \u2014 turning exponential work into linear.",
      "There is a standard progression, all the same recurrence: naive recursion \u2192 <b>top-down memoization</b> (cache the recursion) \u2192 <b>bottom-up tabulation</b> (fill a table from the base cases up) \u2192 <b>space-optimized</b> rolling variables when each answer only needs the last few.",
      "The whole skill is defining the <b>state</b> (what a subproblem is) and the <b>recurrence</b> (how it's built from smaller states). Everything else is bookkeeping."
    ],

    showMe: {
      code:
        "import functools\n" +
        "\n" +
        "# Climbing stairs: how many ways to reach step n taking 1 or 2 at a time?\n" +
        "# Same recurrence f(n) = f(n-1) + f(n-2), shown four ways.\n" +
        "\n" +
        "# 1) NAIVE recursion -- O(2^n): recomputes the same subproblems\n" +
        "def climb_naive(n):\n" +
        "    if n <= 2:\n" +
        "        return n\n" +
        "    return climb_naive(n - 1) + climb_naive(n - 2)\n" +
        "\n" +
        "# 2) TOP-DOWN memoization -- @cache remembers each answer -> O(n)\n" +
        "@functools.cache\n" +
        "def climb_memo(n):\n" +
        "    if n <= 2:\n" +
        "        return n\n" +
        "    return climb_memo(n - 1) + climb_memo(n - 2)\n" +
        "\n" +
        "# 3) BOTTOM-UP tabulation -- fill an array from the base cases up -> O(n)\n" +
        "def climb_tab(n):\n" +
        "    if n <= 2:\n" +
        "        return n\n" +
        "    dp = [0] * (n + 1)\n" +
        "    dp[1], dp[2] = 1, 2\n" +
        "    for i in range(3, n + 1):\n" +
        "        dp[i] = dp[i - 1] + dp[i - 2]\n" +
        "    return dp[n]\n" +
        "\n" +
        "# 4) SPACE-OPTIMIZED -- only the last two values matter -> O(1) space\n" +
        "def climb_opt(n):\n" +
        "    if n <= 2:\n" +
        "        return n\n" +
        "    a, b = 1, 2\n" +
        "    for _ in range(3, n + 1):\n" +
        "        a, b = b, a + b\n" +
        "    return b\n" +
        "\n" +
        "print(climb_naive(10), climb_memo(10), climb_tab(10), climb_opt(10))\n" +
        "# 89 89 89 89",
      caption: "One recurrence, four stages: naive O(2^n) -> memoized O(n) -> tabulated O(n) -> rolling O(1) space. The answer never changes; the cost does."
    },

    whyDsa:
      "<p>The tell for DP is a recursion that recomputes the same call. Naive climbing-stairs (or Fibonacci) recomputes <code>f(n-2)</code> from both <code>f(n-1)</code> and <code>f(n)</code>, and the duplication explodes \u2014 that is the <i>overlapping subproblems</i> signal.</p>" +
      "<pre class=\"why-pre\">f(5)\n\u251c\u2500 f(4)\n\u2502   \u251c\u2500 f(3)  \u2190 also computed under f(3) below\n\u2502   \u2514\u2500 f(2)\n\u2514\u2500 f(3)  \u2190 recomputed from scratch  \u2192 O(2\u207f)</pre>" +
      "<p>The fastest fix is one line: memoize the recursion with <code>@cache</code> (see the DSA Toolkit) so each state is computed once. That alone drops O(2\u207f) to O(n).</p>" +
      "<pre class=\"why-pre\">@functools.cache\ndef f(n):\n    if n < 2: return n\n    return f(n-1) + f(n-2)   \u2192 each n solved once, O(n)</pre>" +
      "<p>Tabulation flips it around \u2014 fill a table from the base cases upward, no recursion \u2014 and once you notice a cell only reads the previous one or two cells, you drop the table for a couple of <b>rolling variables</b> and reach O(1) space.</p>",

    recognize: [
      { q: "\u201cCount the number of ways to do something\u201d", think: "sum over choices \u2192 dp[i] = dp[i-1] + dp[i-2] (or similar)" },
      { q: "\u201cMax / min value achievable under constraints\u201d", think: "optimize \u2192 dp[i] = max/min over the last valid moves" },
      { q: "\u201cMy recursion is exponential / times out\u201d", think: "overlapping subproblems \u2192 add @cache (top-down DP)" },
      { q: "\u201cEach answer depends only on the last row/two values\u201d", think: "1-D or rolling variables \u2192 O(1) or O(n) space" },
      { q: "\u201cTwo strings / a grid, best path or match\u201d", think: "2-D DP \u2192 dp[i][j] from dp[i-1][j], dp[i][j-1], dp[i-1][j-1]" }
    ],

    matchTags: ["dynamic programming", "dp", "memoization", "tabulation", "recurrence"],
    relatedProblems: ["climbing-stairs", "house-robber", "coin-change", "longest-common-subsequence", "word-break", "unique-paths"],

    traps: [
      {
        bad: "def f(n):        # exponential: no caching\n    if n < 2: return n\n    return f(n-1) + f(n-2)",
        good: "@functools.cache   # one line -> O(n)\ndef f(n):\n    if n < 2: return n\n    return f(n-1) + f(n-2)",
        why: "The recurrence is correct but recomputes each subproblem exponentially many times. @functools.cache stores each result the first time, so every state is solved once \u2014 the single biggest DP win for the least effort."
      },
      {
        bad: "dp = [0] * n\ndp[2] = ...        # IndexError / wrong base cases",
        good: "dp = [0] * (n + 1)\ndp[1], dp[2] = 1, 2   # size n+1, seed the base cases",
        why: "Off-by-one sizing and unseeded base cases are the usual tabulation bugs. Size the table to hold index n (so n+1 entries), and set the base cases explicitly before the loop reads them."
      },
      {
        bad: "@functools.cache\ndef f(i, seen):    # seen is a list -> unhashable",
        good: "@functools.cache\ndef f(i, seen):    # pass a tuple / frozenset, or an int bitmask",
        why: "@cache keys on the arguments, so every argument must be hashable. A list or set as a state argument raises TypeError \u2014 use an immutable form (tuple, frozenset, or an integer bitmask) for the state."
      }
    ],

    cpython:
      "<p><code>@functools.cache</code> (3.9+) is <code>lru_cache(maxsize=None)</code>: it wraps your function in a dict keyed by the arguments, so a repeated call is an O(1)-average dict hit instead of a re-computation. That is exactly memoization \u2014 the cache lives as long as the function object, which is why top-down DP is often just one decorator over an otherwise plain recursion. Tabulation avoids the recursion (and Python's ~1000-frame recursion limit) entirely by computing the same states iteratively.</p>",

    complexity: [
      { op: "naive recursion (fib / stairs)", big_o: "O(2\u207f)", note: "Each call spawns two more and nothing is remembered, so the call tree roughly doubles every level \u2014 the problem DP exists to fix." },
      { op: "top-down @cache", big_o: "O(n) time", note: "Each distinct state is computed once and stored; every later hit is an O(1)-average cache lookup, collapsing the exponential tree to one pass." },
      { op: "bottom-up tabulation", big_o: "O(n) time, O(n) space", note: "Fills each of the n table cells once in a simple loop \u2014 same time as memoization, no recursion, but it holds the whole table." },
      { op: "space-optimized rolling vars", big_o: "O(n) time, O(1) space", note: "When a cell only needs the last one or two, a couple of variables replace the table \u2014 same linear time, constant memory." },
      { op: "2-D DP (grid / two strings)", big_o: "O(n\u00b7m)", note: "One value per (i, j) pair, so the work is the size of the table; often reducible to O(min(n, m)) space by keeping just the previous row." }
    ],

    challenge: {
      prompt: "House robber: given nums, return the max sum you can take with no two adjacent elements chosen. Use O(1) space with two rolling variables. Try nums = [2, 7, 9, 3, 1].",
      starter: "nums = [2, 7, 9, 3, 1]\n# roll two values: best-up-to-i-2 and best-up-to-i-1\n",
      solution:
        "nums = [2, 7, 9, 3, 1]\nprev, curr = 0, 0        # best up to i-2, best up to i-1\nfor n in nums:\n    prev, curr = curr, max(curr, prev + n)\nprint(curr)   # 12  (2 + 9 + 1)"
    }
  }
]);
