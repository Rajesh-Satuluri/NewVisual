/*
 * Blind 75 — 1-D Dynamic Programming
 * =========================================================================
 * Registers this category's problems on the global registry:
 *     window.BLIND75.register("1-D Dynamic Programming", [ ...problems ]);
 *
 * See data/arrays_hashing.js for the full PROBLEM SCHEMA reference. Every
 * DP problem's `logic` explains: what dp[i] means, the decision made at each
 * step, the base cases, the recurrence/transition, WHY the transition is
 * correct, how the state evolves, and whether it can be space-optimized.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("1-D Dynamic Programming", [
    {
      id: "climbing-stairs",
      lc: 70,
      title: "Climbing Stairs",
      difficulty: "Easy",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/climbing-stairs/",
      meta: { pattern: "Fibonacci DP", dataStructure: "Array / Two Variables", technique: "Bottom-up recurrence" },
      description:
        "You are climbing a staircase that takes `n` steps to reach the top. Each time you may climb either **1** step or **2** steps.\n\n" +
        "Return the number of **distinct ways** you can climb to the top.",
      constraints: [
        "`1 <= n <= 45`"
      ],
      notes: [
        "The count grows like the Fibonacci sequence, so it stays within 32-bit range for `n <= 45`.",
        "Order matters: taking 1-then-2 is a different way from 2-then-1."
      ],
      examples: [
        {
          input: "n = 2",
          output: "2",
          reasoning: "Either 1+1 or a single 2-step. Two distinct ways."
        },
        {
          input: "n = 3",
          output: "3",
          reasoning: "1+1+1, 1+2, and 2+1 — three distinct ways."
        },
        {
          input: "n = 4",
          output: "5",
          reasoning: "ways(4) = ways(3) + ways(2) = 3 + 2 = 5.",
          visual:
            "```\nstep n :  1  2  3  4\nways   :  1  2  3  5\n            \\  \\  \\\n   ways[i] = ways[i-1] + ways[i-2]\n   ways[4] = 3 + 2 = 5\n```"
        },
        {
          input: "n = 5",
          output: "8",
          reasoning: "ways(5) = ways(4) + ways(3) = 5 + 3 = 8 — the Fibonacci progression 1,2,3,5,8."
        }
      ],
      approaches: [
        {
          name: "Top-down Recursion + Memoization",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "Good first framing: state the recurrence naturally as a recursion, then add a cache to kill the exponential blowup.",
          logic:
            "**A. What is asked.** Count the distinct ordered sequences of 1s and 2s that sum to `n`.\n\n" +
            "**B. The recursive insight.** To reach step `n`, your *last* move was either a 1-step (arriving from step `n-1`) or a 2-step (arriving from step `n-2`). Those two arrival sets are disjoint and cover every possibility, so `ways(n) = ways(n-1) + ways(n-2)`.\n\n" +
            "**C. Why naive recursion is slow.** Expanding that recurrence without a cache re-solves the same subproblems over and over — `ways(n-2)` is recomputed by both `ways(n)` and `ways(n-1)`. The call tree has ~Fibonacci(n) leaves, i.e. exponential `O(2^n)` time.\n\n" +
            "**D. Memoization.** Store each `ways(i)` the first time it is computed in a `memo` dict. Every state is then solved once; later calls are `O(1)` lookups.\n\n" +
            "**Base cases.** `ways(1) = 1` (one single step) and `ways(2) = 2` (1+1 or 2). Here `ways(i) = i` for `i <= 2` captures both cleanly.\n\n" +
            "**Transition & why it is correct.** `ways(i) = ways(i-1) + ways(i-2)`. Correct because the last step partitions all paths to `i` into exactly two non-overlapping groups by whether it was a 1 or a 2.\n\n" +
            "**K/L. Complexity.** `n` distinct states, each `O(1)` → time `O(n)`; recursion stack + memo → space `O(n)`.",
          rcs:
            "class Solution:\n" +
            "    def climbStairs(self, n: int) -> int:\n" +
            "        memo = {}                          # Cache: step index -> number of ways.\n" +
            "        def ways(i):\n" +
            "            if i <= 2:                     # Base cases: ways(1)=1, ways(2)=2.\n" +
            "                return i\n" +
            "            if i in memo:                  # Already solved this subproblem?\n" +
            "                return memo[i]\n" +
            "            memo[i] = ways(i - 1) + ways(i - 2)  # Last move was a 1-step or a 2-step.\n" +
            "            return memo[i]\n" +
            "        return ways(n)",
          plain:
            "class Solution:\n" +
            "    def climbStairs(self, n: int) -> int:\n" +
            "        memo = {}\n" +
            "        def ways(i):\n" +
            "            if i <= 2:\n" +
            "                return i\n" +
            "            if i in memo:\n" +
            "                return memo[i]\n" +
            "            memo[i] = ways(i - 1) + ways(i - 2)\n" +
            "            return memo[i]\n" +
            "        return ways(n)"
        },
        {
          name: "Optimized — Bottom-up Rolling Variables",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer: any Fibonacci-shaped recurrence where dp[i] depends only on the previous two states.",
          logic:
            "**E. Turn it around.** Instead of recursing down from `n`, build up from the base. Define `dp[i]` = number of distinct ways to reach step `i`.\n\n" +
            "**dp meaning.** `dp[i]` is the answer to the whole problem for a staircase of height `i`.\n\n" +
            "**Base cases.** `dp[1] = 1`, `dp[2] = 2`.\n\n" +
            "**Transition.** `dp[i] = dp[i-1] + dp[i-2]` — identical recurrence, now filled left to right so each dependency is already known.\n\n" +
            "**F. Space optimization.** `dp[i]` only ever looks back two cells, so we never need the whole array. Keep two scalars — `first = dp[i-2]` and `second = dp[i-1]` — and roll them forward. This drops space from `O(n)` to `O(1)`.\n\n" +
            "**G/H. What the variables hold.** After each iteration `second` holds `dp[i]` and `first` holds `dp[i-1]`, ready for the next step.\n\n" +
            "**J. Why correct.** Same last-move argument as the recursion; we simply compute the states in dependency order.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** Recognizing 'count paths where each step depends on the last one or two' as Fibonacci-style DP is the whole game; then collapse to two variables.",
          rcs:
            "class Solution:\n" +
            "    def climbStairs(self, n: int) -> int:\n" +
            "        if n <= 2:                         # Handle the base cases directly.\n" +
            "            return n\n" +
            "        first, second = 1, 2               # dp[1]=1, dp[2]=2 (the two previous states).\n" +
            "        for _ in range(3, n + 1):          # Build dp[3..n] one step at a time.\n" +
            "            first, second = second, first + second  # Roll forward: new dp = sum of prev two.\n" +
            "        return second                      # 'second' now holds dp[n].",
          plain:
            "class Solution:\n" +
            "    def climbStairs(self, n: int) -> int:\n" +
            "        if n <= 2:\n" +
            "            return n\n" +
            "        first, second = 1, 2\n" +
            "        for _ in range(3, n + 1):\n" +
            "            first, second = second, first + second\n" +
            "        return second"
        }
      ],
      patternRecognition: [
        "'Count the number of ways to reach a goal by taking limited step sizes' → additive DP.",
        "Each state depends only on a fixed number of previous states (here the last two) → Fibonacci pattern.",
        "The answer sequence 1,2,3,5,8,... is a dead giveaway for the Fibonacci recurrence."
      ],
      interviewRecall: [
        "ways(n) = ways(n-1) + ways(n-2); base cases ways(1)=1, ways(2)=2.",
        "The last move (1-step or 2-step) partitions all paths — that's why you ADD the two subproblems.",
        "Collapse the dp array to two rolling variables for O(1) space."
      ]
    },

    {
      id: "coin-change",
      lc: 322,
      title: "Coin Change",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/coin-change/",
      meta: { pattern: "Unbounded Knapsack", dataStructure: "1-D DP Array", technique: "Bottom-up minimization" },
      description:
        "You are given an array of coin denominations `coins` and an integer `amount`. Return the **fewest number of coins** needed to make up `amount`.\n\n" +
        "You have an **unlimited** supply of each coin. If the amount cannot be formed by any combination of the coins, return `-1`.",
      constraints: [
        "`1 <= coins.length <= 12`",
        "`1 <= coins[i] <= 2^31 - 1`",
        "`0 <= amount <= 10^4`"
      ],
      notes: [
        "A greedy 'take the biggest coin first' strategy does NOT work in general (e.g. coins [1,3,4], amount 6).",
        "`amount = 0` needs 0 coins."
      ],
      examples: [
        {
          input: "coins = [1, 2, 5], amount = 11",
          output: "3",
          reasoning: "11 = 5 + 5 + 1, which uses 3 coins — no combination uses fewer.",
          visual:
            "```\namount a : 0 1 2 3 4 5 6 7 8 9 10 11\ndp[a]    : 0 1 1 2 2 1 2 2 3 3  2  3\n                                       ^\n dp[11] = 1 + min(dp[10], dp[9], dp[6]) = 1 + min(2,3,2) = 3\n```"
        },
        {
          input: "coins = [2], amount = 3",
          output: "-1",
          reasoning: "Only even totals are reachable with a 2-coin, so 3 is impossible → -1."
        },
        {
          input: "coins = [1], amount = 0",
          output: "0",
          reasoning: "Zero amount needs zero coins."
        },
        {
          input: "coins = [1, 3, 4], amount = 6",
          output: "2",
          reasoning: "Greedy would take 4+1+1 = 3 coins, but the optimal is 3+3 = 2 coins — proving greedy fails and DP is required."
        }
      ],
      approaches: [
        {
          name: "Bottom-up DP (unbounded knapsack)",
          time: "O(amount * len(coins))",
          space: "O(amount)",
          whenToUse: "The canonical solution for 'minimum items to reach a target' with unlimited reuse of each item.",
          logic:
            "**A. What is asked.** The minimum coin count to total exactly `amount`, or `-1` if impossible.\n\n" +
            "**B. Why greedy fails.** Taking the largest coin that fits can strand you (coins `[1,3,4]`, amount `6`: greedy gives 4+1+1=3, optimal is 3+3=2). We must consider all denominations at each sub-total, which is what DP does.\n\n" +
            "**dp meaning.** `dp[a]` = the fewest coins needed to make exactly amount `a`. The final answer is `dp[amount]`.\n\n" +
            "**Base case.** `dp[0] = 0` — zero coins make amount 0. Initialize every other `dp[a]` to a sentinel 'infinity' (`amount + 1`, which is larger than any real answer since you can never need more than `amount` coins of value >= 1).\n\n" +
            "**Decision at each step.** To build amount `a`, the *last coin* placed was some `coin <= a`. Removing it leaves the subproblem `a - coin`, already solved. So try every coin and take the best.\n\n" +
            "**Transition.** `dp[a] = min(dp[a], dp[a - coin] + 1)` for every `coin <= a`.\n\n" +
            "**Why the transition is correct.** Any optimal way to make `a` ends with *some* coin; that coin's removal yields an optimal way to make `a - coin` (optimal substructure). Minimizing over all possible last coins therefore finds the global minimum. Because coins are reusable, we read `dp[a - coin]` from the *same* dp array (unbounded knapsack), not a previous 'row'.\n\n" +
            "**State evolution.** Fill `dp` from `a = 1` up to `amount`; each cell only depends on smaller amounts, which are already final.\n\n" +
            "**Answer / impossibility.** If `dp[amount]` is still the sentinel, no combination works → return `-1`.\n\n" +
            "**Space.** Already `O(amount)`; this 1-D array is the space-optimized form of the 2-D coins-vs-amount table.\n\n" +
            "**K/L. Complexity.** `amount` cells × `len(coins)` choices → time `O(amount * len(coins))`, space `O(amount)`.",
          rcs:
            "class Solution:\n" +
            "    def coinChange(self, coins: List[int], amount: int) -> int:\n" +
            "        dp = [amount + 1] * (amount + 1)   # Sentinel 'infinity' = amount+1 (unreachable).\n" +
            "        dp[0] = 0                          # Base case: 0 coins make amount 0.\n" +
            "        for a in range(1, amount + 1):     # Solve every sub-amount from small to large.\n" +
            "            for coin in coins:             # Consider each coin as the LAST one placed.\n" +
            "                if coin <= a:              # Coin must fit into the current amount.\n" +
            "                    dp[a] = min(dp[a], dp[a - coin] + 1)  # Best of current vs using this coin.\n" +
            "        return dp[amount] if dp[amount] != amount + 1 else -1  # Sentinel => impossible.",
          plain:
            "class Solution:\n" +
            "    def coinChange(self, coins: List[int], amount: int) -> int:\n" +
            "        dp = [amount + 1] * (amount + 1)\n" +
            "        dp[0] = 0\n" +
            "        for a in range(1, amount + 1):\n" +
            "            for coin in coins:\n" +
            "                if coin <= a:\n" +
            "                    dp[a] = min(dp[a], dp[a - coin] + 1)\n" +
            "        return dp[amount] if dp[amount] != amount + 1 else -1"
        }
      ],
      patternRecognition: [
        "'Minimum / maximum number of items to reach a target sum' with unlimited reuse → unbounded knapsack DP.",
        "Greedy is tempting but breaks on non-canonical coin systems — that's your cue to reach for DP.",
        "Answer for a target is built from answers to smaller targets (dp[a] from dp[a-coin])."
      ],
      interviewRecall: [
        "dp[a] = min over coins of dp[a-coin] + 1; base dp[0]=0.",
        "Initialize unreachable amounts to a sentinel (amount+1) and return -1 if it survives.",
        "Reuse allowed → read from the same dp array (that's what makes it 'unbounded')."
      ]
    },

    {
      id: "longest-increasing-subsequence",
      lc: 300,
      title: "Longest Increasing Subsequence",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/longest-increasing-subsequence/",
      meta: { pattern: "Subsequence DP / Patience", dataStructure: "Array + Binary Search", technique: "Tails-of-piles" },
      description:
        "Given an integer array `nums`, return the length of the **longest strictly increasing subsequence**.\n\n" +
        "A subsequence is derived by deleting zero or more elements without changing the order of the remaining elements.",
      constraints: [
        "`1 <= nums.length <= 2500`",
        "`-10^4 <= nums[i] <= 10^4`"
      ],
      notes: [
        "Strictly increasing: equal values cannot both be in the subsequence.",
        "The elements need not be contiguous in the array."
      ],
      examples: [
        {
          input: "nums = [10, 9, 2, 5, 3, 7, 101, 18]",
          output: "4",
          reasoning: "One longest increasing subsequence is [2, 3, 7, 101] (also [2,3,7,18]) of length 4.",
          visual:
            "```\nnums : 10  9  2  5  3  7 101 18\n              \u2193     \u2193  \u2193      \n pick:        2     3  7  101   -> length 4\n```"
        },
        {
          input: "nums = [0, 1, 0, 3, 2, 3]",
          output: "4",
          reasoning: "[0, 1, 2, 3] is increasing and has length 4."
        },
        {
          input: "nums = [7, 7, 7, 7]",
          output: "1",
          reasoning: "All equal → the strictly increasing subsequence can hold only one element."
        },
        {
          input: "nums = [4, 10, 4, 3, 8, 9]",
          output: "3",
          reasoning: "[4, 8, 9] (or [3,8,9]) is a longest strictly increasing subsequence, length 3."
        }
      ],
      approaches: [
        {
          name: "DP on subsequence endings",
          time: "O(n^2)",
          space: "O(n)",
          whenToUse: "The intuitive DP: clear, easy to reason about, fine for n up to a few thousand.",
          logic:
            "**A. What is asked.** The length of the longest strictly increasing subsequence (LIS).\n\n" +
            "**dp meaning.** `dp[i]` = the length of the longest increasing subsequence that **ends exactly at index `i`** (i.e. `nums[i]` is its final element).\n\n" +
            "**Base case.** Every element alone is a subsequence of length 1, so `dp[i]` starts at 1.\n\n" +
            "**Decision at each step.** For element `i`, look at every earlier element `j < i`. If `nums[j] < nums[i]`, then `nums[i]` can extend the best subsequence ending at `j`.\n\n" +
            "**Transition.** `dp[i] = max(dp[i], dp[j] + 1)` for all `j < i` with `nums[j] < nums[i]`.\n\n" +
            "**Why correct.** Any LIS ending at `i` has some second-to-last element at index `j < i` with `nums[j] < nums[i]`; that prefix is itself an LIS ending at `j`, whose length we already have in `dp[j]`. Taking the max over all valid `j` finds the best predecessor.\n\n" +
            "**State evolution.** Fill `dp` left to right; the answer is `max(dp)`, not `dp[n-1]`, because the LIS can end anywhere.\n\n" +
            "**K/L. Complexity.** Nested loops → time `O(n^2)`, space `O(n)`.",
          rcs:
            "class Solution:\n" +
            "    def lengthOfLIS(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        dp = [1] * n                       # dp[i]=longest increasing subseq ENDING at i (>=1).\n" +
            "        for i in range(n):                 # For each element as a possible endpoint...\n" +
            "            for j in range(i):             # ...check every earlier element as predecessor.\n" +
            "                if nums[j] < nums[i]:      # Strictly smaller => can extend that subseq.\n" +
            "                    dp[i] = max(dp[i], dp[j] + 1)\n" +
            "        return max(dp)                     # LIS may end at any index.",
          plain:
            "class Solution:\n" +
            "    def lengthOfLIS(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        dp = [1] * n\n" +
            "        for i in range(n):\n" +
            "            for j in range(i):\n" +
            "                if nums[j] < nums[i]:\n" +
            "                    dp[i] = max(dp[i], dp[j] + 1)\n" +
            "        return max(dp)"
        },
        {
          name: "Optimized — Patience / Binary Search on tails",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "When O(n^2) is too slow, or the interviewer explicitly asks for the O(n log n) follow-up.",
          logic:
            "**D. Key observation.** Maintain an array `tails` where `tails[k]` = the **smallest possible tail value** of any increasing subsequence of length `k+1` seen so far. Keeping tails as small as possible leaves the most room to extend later.\n\n" +
            "**Invariant.** `tails` is always sorted in strictly increasing order. Its **length equals the current LIS length**.\n\n" +
            "**Decision per element.** For each `num`, binary-search the first tail `>= num` (`bisect_left`). Two cases:\n" +
            "1. If none exists (num is larger than all tails), `num` extends the longest subsequence → append it, growing the LIS by 1.\n" +
            "2. Otherwise overwrite that tail with `num`. This does not change the LIS length but lowers the tail for that length, improving future extensibility.\n\n" +
            "**Why correct.** Overwriting keeps each `tails[k]` minimal for its length while preserving sortedness; the length of `tails` therefore tracks the true LIS length. (Note: `tails` itself is not necessarily a real subsequence — only its *length* is the answer.)\n\n" +
            "**Why strict.** `bisect_left` finds the first element `>= num`, so an equal value overwrites rather than extends — enforcing *strictly* increasing.\n\n" +
            "**K/L. Complexity.** `n` elements × `O(log n)` binary search → time `O(n log n)`, space `O(n)` for `tails`.",
          rcs:
            "class Solution:\n" +
            "    def lengthOfLIS(self, nums: List[int]) -> int:\n" +
            "        import bisect\n" +
            "        tails = []                         # tails[k] = smallest tail of an LIS of length k+1.\n" +
            "        for num in nums:\n" +
            "            i = bisect.bisect_left(tails, num)  # First tail >= num (strict increase).\n" +
            "            if i == len(tails):            # num beats every tail => extends the LIS.\n" +
            "                tails.append(num)\n" +
            "            else:                          # Otherwise shrink that length's tail to num.\n" +
            "                tails[i] = num\n" +
            "        return len(tails)                  # LIS length == number of piles/tails.",
          plain:
            "class Solution:\n" +
            "    def lengthOfLIS(self, nums: List[int]) -> int:\n" +
            "        import bisect\n" +
            "        tails = []\n" +
            "        for num in nums:\n" +
            "            i = bisect.bisect_left(tails, num)\n" +
            "            if i == len(tails):\n" +
            "                tails.append(num)\n" +
            "            else:\n" +
            "                tails[i] = num\n" +
            "        return len(tails)"
        }
      ],
      patternRecognition: [
        "'Longest increasing / non-decreasing subsequence' (not subarray) → LIS DP.",
        "dp[i] defined as 'best answer ENDING at i' is the standard subsequence-DP framing.",
        "Need O(n log n)? Think 'tails of piles' + binary search (patience sorting)."
      ],
      interviewRecall: [
        "O(n^2): dp[i] = 1 + max(dp[j]) over j<i with nums[j]<nums[i]; answer is max(dp).",
        "O(n log n): keep 'tails', bisect_left to place each number, LIS length = len(tails).",
        "bisect_left enforces STRICTLY increasing; bisect_right would allow equal (non-decreasing)."
      ]
    },

    {
      id: "word-break",
      lc: 139,
      title: "Word Break",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/word-break/",
      meta: { pattern: "Partition DP", dataStructure: "1-D DP Array + Set", technique: "Prefix reachability" },
      description:
        "Given a string `s` and a dictionary of words `wordDict`, return `true` if `s` can be segmented into a **space-separated sequence of one or more dictionary words**.\n\n" +
        "The same dictionary word may be reused any number of times.",
      constraints: [
        "`1 <= s.length <= 300`",
        "`1 <= wordDict.length <= 1000`",
        "`1 <= wordDict[i].length <= 20`",
        "`s` and `wordDict[i]` consist of lowercase English letters.",
        "All dictionary words are distinct."
      ],
      notes: [
        "Words may be reused, so this is not a simple 'cover each word once' problem.",
        "You only need to return whether a valid segmentation EXISTS, not the segmentation itself."
      ],
      examples: [
        {
          input: 's = "leetcode", wordDict = ["leet", "code"]',
          output: "true",
          reasoning: '"leetcode" splits as "leet" + "code", both in the dictionary.',
          visual:
            "```\ns = l e e t c o d e\n    |__leet__|__code__|\n dp[0]=T dp[4]=T   dp[8]=T  -> reachable end\n```"
        },
        {
          input: 's = "applepenapple", wordDict = ["apple", "pen"]',
          output: "true",
          reasoning: '"apple" + "pen" + "apple" — the word "apple" is reused.'
        },
        {
          input: 's = "catsandog", wordDict = ["cats", "dog", "sand", "and", "cat"]',
          output: "false",
          reasoning: "No segmentation covers the whole string; every attempt strands the trailing letters."
        },
        {
          input: 's = "aaaaaaa", wordDict = ["aaaa", "aaa"]',
          output: "true",
          reasoning: '"aaa" + "aaaa" (or "aaaa" + "aaa") covers all 7 characters.'
        }
      ],
      approaches: [
        {
          name: "Brute Force Recursion",
          time: "O(2^n) worst case",
          space: "O(n) recursion depth",
          whenToUse: "To frame the recurrence before optimizing; unusable on long strings without memoization.",
          logic:
            "**A. What is asked.** Can `s` be cut into pieces that are all dictionary words?\n\n" +
            "**B. Recursive idea.** Define `can(start)` = 'can the suffix `s[start:]` be fully segmented?'. Try every prefix `s[start:end]`; if it is a dictionary word AND the remainder `can(end)` is segmentable, the answer is true.\n\n" +
            "**C. Why it is slow.** Overlapping subproblems: many different prefix choices lead to the same `start`, and each is re-explored from scratch, giving exponential `O(2^n)` time in the worst case (e.g. `s = 'aaaa...'`).\n\n" +
            "**Base case.** `can(len(s)) = True` — reaching the end means every character was consumed by valid words.\n\n" +
            "**J. Why correct.** It exhaustively tries every way to place the first word, and recursion handles the rest — so if any valid segmentation exists it will be found.",
          rcs:
            "class Solution:\n" +
            "    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n" +
            "        words = set(wordDict)              # O(1) word lookups.\n" +
            "        def can(start):                   # Can s[start:] be fully segmented?\n" +
            "            if start == len(s):           # Consumed the whole string => success.\n" +
            "                return True\n" +
            "            for end in range(start + 1, len(s) + 1):  # Try each prefix s[start:end].\n" +
            "                if s[start:end] in words and can(end):  # Word + rest segmentable?\n" +
            "                    return True\n" +
            "            return False                  # No prefix worked from here.\n" +
            "        return can(0)",
          plain:
            "class Solution:\n" +
            "    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n" +
            "        words = set(wordDict)\n" +
            "        def can(start):\n" +
            "            if start == len(s):\n" +
            "                return True\n" +
            "            for end in range(start + 1, len(s) + 1):\n" +
            "                if s[start:end] in words and can(end):\n" +
            "                    return True\n" +
            "            return False\n" +
            "        return can(0)"
        },
        {
          name: "Optimized — Bottom-up DP",
          time: "O(n^2) (times word-slice cost)",
          space: "O(n)",
          whenToUse: "The expected solution: turn the reachability recursion into a linear-scan DP over prefixes.",
          logic:
            "**D. Reframe as reachability.** `dp[i]` = 'can the **prefix** `s[:i]` (the first `i` characters) be segmented into dictionary words?'. The answer is `dp[n]`.\n\n" +
            "**Base case.** `dp[0] = True` — the empty prefix is trivially segmentable.\n\n" +
            "**Decision at each step.** For each end position `i`, ask: is there a split point `j < i` such that the prefix up to `j` is segmentable (`dp[j]` is true) AND the chunk `s[j:i]` is a dictionary word? If so, `s[:i]` is segmentable too.\n\n" +
            "**Transition.** `dp[i] = True` if any `j` in `[0, i)` has `dp[j] and s[j:i] in words`.\n\n" +
            "**Why the transition is correct.** A valid segmentation of `s[:i]` must end with some final word `s[j:i]`; removing it leaves a valid segmentation of `s[:j]`, which is exactly `dp[j]`. Scanning all `j` covers every possible last word.\n\n" +
            "**State evolution.** Fill `dp[1..n]` left to right; each `dp[i]` only reads smaller, already-final `dp[j]`. Break as soon as one `j` works.\n\n" +
            "**Space.** `O(n)` for the boolean array — this is already the minimal 1-D state.\n\n" +
            "**K/L. Complexity.** Two nested position loops → `O(n^2)` combinations, each doing an `O(word length)` slice/lookup; space `O(n)`.",
          rcs:
            "class Solution:\n" +
            "    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n" +
            "        words = set(wordDict)              # Fast membership tests.\n" +
            "        n = len(s)\n" +
            "        dp = [False] * (n + 1)            # dp[i] = can s[:i] be segmented?\n" +
            "        dp[0] = True                     # Empty prefix is segmentable.\n" +
            "        for i in range(1, n + 1):        # End position of the prefix we're deciding.\n" +
            "            for j in range(i):           # Split point: last word is s[j:i].\n" +
            "                if dp[j] and s[j:i] in words:  # Prefix good AND final chunk is a word.\n" +
            "                    dp[i] = True\n" +
            "                    break                # One valid split is enough.\n" +
            "        return dp[n]",
          plain:
            "class Solution:\n" +
            "    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n" +
            "        words = set(wordDict)\n" +
            "        n = len(s)\n" +
            "        dp = [False] * (n + 1)\n" +
            "        dp[0] = True\n" +
            "        for i in range(1, n + 1):\n" +
            "            for j in range(i):\n" +
            "                if dp[j] and s[j:i] in words:\n" +
            "                    dp[i] = True\n" +
            "                    break\n" +
            "        return dp[n]"
        }
      ],
      patternRecognition: [
        "'Can this string be split into valid pieces?' → partition / reachability DP over prefixes.",
        "dp[i] as a boolean 'is the first i characters segmentable' is the standard framing.",
        "Words reusable + only need existence → boolean DP, not counting."
      ],
      interviewRecall: [
        "dp[i] = OR over j<i of (dp[j] AND s[j:i] in wordSet); base dp[0]=True.",
        "Put the dictionary in a set for O(1) lookups before starting.",
        "Break the inner loop on the first valid split — you only need existence."
      ]
    },

    {
      id: "house-robber",
      lc: 198,
      title: "House Robber",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/house-robber/",
      meta: { pattern: "Pick / Skip DP", dataStructure: "Array / Two Variables", technique: "Non-adjacent max sum" },
      description:
        "You are a robber planning to rob houses along a street. Each house `i` holds `nums[i]` money, but adjacent houses have connected alarms — robbing **two adjacent houses** on the same night triggers the police.\n\n" +
        "Return the **maximum amount** you can rob tonight without alerting the police.",
      constraints: [
        "`1 <= nums.length <= 100`",
        "`0 <= nums[i] <= 400`"
      ],
      notes: [
        "The houses are in a straight line (not a circle) — the first and last houses are not adjacent.",
        "You may rob any set of non-adjacent houses, including choosing to skip freely."
      ],
      examples: [
        {
          input: "nums = [1, 2, 3, 1]",
          output: "4",
          reasoning: "Rob house 0 (1) and house 2 (3) → 1 + 3 = 4. Robbing 2 and 3 (adjacent) is not allowed.",
          visual:
            "```\nnums :  1  2  3  1\ndp   :  1  2  4  4\n  dp[i] = max(dp[i-1], dp[i-2] + nums[i])\n  dp[2] = max(2, 1+3) = 4\n```"
        },
        {
          input: "nums = [2, 7, 9, 3, 1]",
          output: "12",
          reasoning: "Rob houses 0, 2, 4 → 2 + 9 + 1 = 12, the maximum non-adjacent total."
        },
        {
          input: "nums = [5]",
          output: "5",
          reasoning: "A single house — just rob it."
        },
        {
          input: "nums = [2, 1, 1, 2]",
          output: "4",
          reasoning: "Rob houses 0 and 3 → 2 + 2 = 4 (they are not adjacent)."
        }
      ],
      approaches: [
        {
          name: "DP Array",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "Clearest first version: makes the pick/skip decision and base cases explicit.",
          logic:
            "**A. What is asked.** Maximum total from a subset of houses with no two adjacent.\n\n" +
            "**dp meaning.** `dp[i]` = the most money robbable considering houses `0..i` (the best answer for the prefix ending at house `i`).\n\n" +
            "**Base cases.** `dp[0] = nums[0]` (only one house). `dp[1] = max(nums[0], nums[1])` (can't take both adjacent, so take the richer).\n\n" +
            "**Decision at each step.** At house `i` you choose: **skip it** and keep `dp[i-1]`, or **rob it** and add `nums[i]` to the best total that ended at `i-2` (skipping the adjacent `i-1`).\n\n" +
            "**Transition.** `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.\n\n" +
            "**Why correct.** The two options are exhaustive and mutually exclusive: either house `i` is robbed or not. If robbed, house `i-1` must be skipped, so the compatible best is `dp[i-2]`. If skipped, the best is whatever `dp[i-1]` already achieved. Taking the max is optimal by induction on the prefix.\n\n" +
            "**State evolution.** Fill left to right; `dp[n-1]` is the answer.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(n)` (reducible — see next approach).",
          rcs:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        if n == 1:                        # Only one house => rob it.\n" +
            "            return nums[0]\n" +
            "        dp = [0] * n                      # dp[i] = best loot from houses 0..i.\n" +
            "        dp[0] = nums[0]                   # Base: single house.\n" +
            "        dp[1] = max(nums[0], nums[1])     # Base: can't take both adjacent.\n" +
            "        for i in range(2, n):\n" +
            "            dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])  # Skip i, or rob i + dp[i-2].\n" +
            "        return dp[n - 1]",
          plain:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        if n == 1:\n" +
            "            return nums[0]\n" +
            "        dp = [0] * n\n" +
            "        dp[0] = nums[0]\n" +
            "        dp[1] = max(nums[0], nums[1])\n" +
            "        for i in range(2, n):\n" +
            "            dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])\n" +
            "        return dp[n - 1]"
        },
        {
          name: "Optimized — Two Rolling Variables",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The polished answer: dp[i] depends only on the two previous states, so two scalars suffice.",
          logic:
            "**F. Space optimization.** In `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`, only `dp[i-1]` and `dp[i-2]` are ever read. Track them as two variables and roll forward — no array needed.\n\n" +
            "**What the variables hold.** Let `prev` = best loot up to two houses back (`dp[i-2]`), and `curr` = best loot up to the previous house (`dp[i-1]`). Starting both at 0 elegantly handles the base cases without special-casing `n == 1`.\n\n" +
            "**Transition (rolled).** For each `num`: `new = max(curr, prev + num)`; then shift `prev = curr`, `curr = new`. In one tuple assignment: `prev, curr = curr, max(curr, prev + num)`.\n\n" +
            "**Why correct.** Identical recurrence and pick/skip logic; the initial zeros act as `dp[-1] = dp[-2] = 0`, and the first iteration correctly yields `max(0, 0 + nums[0]) = nums[0]`.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** 'Max sum of non-adjacent elements' is the signature House Robber pattern; always mention the O(1) rolling form.",
          rcs:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        prev, curr = 0, 0                 # prev=dp[i-2], curr=dp[i-1]; zeros = clean base.\n" +
            "        for num in nums:\n" +
            "            prev, curr = curr, max(curr, prev + num)  # Skip house, or rob it + prev.\n" +
            "        return curr                       # curr holds the best for the whole street.",
          plain:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        prev, curr = 0, 0\n" +
            "        for num in nums:\n" +
            "            prev, curr = curr, max(curr, prev + num)\n" +
            "        return curr"
        }
      ],
      patternRecognition: [
        "'Maximum sum where you cannot pick two adjacent items' → House Robber DP.",
        "Each element poses a binary take/skip choice, and taking it blocks its neighbor.",
        "dp[i] depends on dp[i-1] and dp[i-2] → two rolling variables suffice."
      ],
      interviewRecall: [
        "dp[i] = max(dp[i-1], dp[i-2] + nums[i]).",
        "Rolling form: prev, curr = curr, max(curr, prev + num); return curr.",
        "Initializing prev=curr=0 removes the need to special-case tiny arrays."
      ]
    },

    {
      id: "house-robber-ii",
      lc: 213,
      title: "House Robber II",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/house-robber-ii/",
      meta: { pattern: "Circular Pick / Skip DP", dataStructure: "Array / Two Variables", technique: "Two linear passes" },
      description:
        "Houses are arranged in a **circle**: the first and last house are adjacent. Each house `i` holds `nums[i]` money, and robbing two adjacent houses triggers the alarm.\n\n" +
        "Return the **maximum amount** you can rob without alerting the police.",
      constraints: [
        "`1 <= nums.length <= 100`",
        "`0 <= nums[i] <= 1000`"
      ],
      notes: [
        "Because the street is circular, houses 0 and n-1 cannot both be robbed.",
        "A single house is its own answer (no neighbors to conflict with)."
      ],
      examples: [
        {
          input: "nums = [2, 3, 2]",
          output: "3",
          reasoning: "Houses 0 and 2 are adjacent (circle), so you cannot take 2+2=4. The best single choice is house 1 → 3."
        },
        {
          input: "nums = [1, 2, 3, 1]",
          output: "4",
          reasoning: "Rob houses 0 and 2 → 1 + 3 = 4; houses 0 and 3 being adjacent doesn't hurt this pick."
        },
        {
          input: "nums = [1, 2, 3]",
          output: "3",
          reasoning: "Take just house 2 → 3; 0 and 2 are adjacent so 1+3 is disallowed."
        },
        {
          input: "nums = [200]",
          output: "200",
          reasoning: "One house — rob it directly."
        }
      ],
      approaches: [
        {
          name: "Two Linear House-Robber Passes",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The clean reduction: turn the circular constraint into two ordinary (linear) House Robber problems.",
          logic:
            "**A. What is asked.** House Robber, but houses 0 and n-1 are now adjacent (a circle).\n\n" +
            "**D. Key observation.** The only new constraint is 'you cannot rob both the first and the last house'. So in any valid plan, at least one of them is left out. Split into two independent linear scenarios:\n" +
            "1. **Exclude the last house** → solve House Robber on `nums[0 .. n-2]`.\n" +
            "2. **Exclude the first house** → solve House Robber on `nums[1 .. n-1]`.\n\n" +
            "The true answer is the max of the two. This is correct because every legal circular plan falls into at least one of these two windows (it must skip house 0, or skip house n-1, or both), and neither window contains the forbidden adjacent pair.\n\n" +
            "**Reused subroutine.** Each scenario is plain House Robber solved with the O(1) rolling recurrence `prev, curr = curr, max(curr, prev + num)` — `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.\n\n" +
            "**Edge case.** If there is only one house, the split windows would be empty, so return `nums[0]` directly.\n\n" +
            "**State evolution.** Two independent left-to-right passes, each maintaining two rolling variables.\n\n" +
            "**K/L. Complexity.** Two O(n) passes with O(1) memory → time `O(n)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        if len(nums) == 1:                # Single house: no circular conflict.\n" +
            "            return nums[0]\n" +
            "        def rob_line(houses):            # Plain (linear) House Robber, O(1) space.\n" +
            "            prev, curr = 0, 0\n" +
            "            for num in houses:\n" +
            "                prev, curr = curr, max(curr, prev + num)\n" +
            "            return curr\n" +
            "        # Case 1 drops the first house; Case 2 drops the last house.\n" +
            "        return max(rob_line(nums[1:]), rob_line(nums[:-1]))",
          plain:
            "class Solution:\n" +
            "    def rob(self, nums: List[int]) -> int:\n" +
            "        if len(nums) == 1:\n" +
            "            return nums[0]\n" +
            "        def rob_line(houses):\n" +
            "            prev, curr = 0, 0\n" +
            "            for num in houses:\n" +
            "                prev, curr = curr, max(curr, prev + num)\n" +
            "            return curr\n" +
            "        return max(rob_line(nums[1:]), rob_line(nums[:-1]))"
        }
      ],
      patternRecognition: [
        "House Robber with a wrap-around / circular adjacency between the ends.",
        "A circular constraint on endpoints → split into cases that each exclude one endpoint.",
        "Reuse a simpler linear solution as a subroutine over two windows."
      ],
      interviewRecall: [
        "Answer = max(robLinear(nums[1:]), robLinear(nums[:-1])).",
        "The insight: you can never take both the first and last house, so drop one and reduce to linear.",
        "Special-case length 1 before slicing, or the empty windows misbehave."
      ]
    },

    {
      id: "decode-ways",
      lc: 91,
      title: "Decode Ways",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/decode-ways/",
      meta: { pattern: "Count-Ways DP", dataStructure: "1-D DP Array", technique: "One-digit / two-digit split" },
      description:
        "A message of letters A–Z is encoded to digits using the mapping `A = 1`, `B = 2`, ..., `Z = 26`. To **decode**, the digit string is grouped back into these codes.\n\n" +
        "Given a string `s` of digits, return the **number of ways** to decode it. Note that groupings like `06` are invalid (a leading zero is not a valid code), so `\"06\"` cannot map to `F`.",
      constraints: [
        "`1 <= s.length <= 100`",
        "`s` contains only digits and may contain leading zeros."
      ],
      notes: [
        "A standalone '0' can never be decoded, and only '10' and '20' are valid codes that contain a zero.",
        "Two-digit codes are valid only in the range 10–26."
      ],
      examples: [
        {
          input: 's = "12"',
          output: "2",
          reasoning: '"12" decodes as "AB" (1,2) or "L" (12) → 2 ways.',
          visual:
            "```\ns  =  1  2\n         split as (1)(2) -> A B\n         or       (12)  -> L\n dp: dp0=1  dp1=1  dp2 = dp1 + dp0 = 2\n```"
        },
        {
          input: 's = "226"',
          output: "3",
          reasoning: '"2 2 6" (BBF), "22 6" (VF), "2 26" (BZ) → 3 ways.'
        },
        {
          input: 's = "06"',
          output: "0",
          reasoning: "Leading zero: '0' alone is invalid and '06' is not in 10–26, so there is no valid decoding."
        },
        {
          input: 's = "10"',
          output: "1",
          reasoning: "Only '10' → 'J' works; splitting as '1','0' fails because '0' alone is invalid."
        }
      ],
      approaches: [
        {
          name: "Bottom-up DP",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The standard count-ways DP where each position can be consumed as one digit or paired with the previous.",
          logic:
            "**A. What is asked.** Count the distinct ways to group the digit string into valid codes (1–26, no leading zeros).\n\n" +
            "**dp meaning.** `dp[i]` = the number of ways to decode the first `i` characters, `s[:i]`. The answer is `dp[n]`.\n\n" +
            "**Base cases.** `dp[0] = 1` — the empty string has exactly one (empty) decoding, which anchors the recurrence. `dp[1] = 1` if `s[0] != '0'` else `0` — a single leading zero is undecodable.\n\n" +
            "**Decision at each step.** The character `s[i-1]` (the i-th character) is decoded either:\n" +
            "1. as a **single digit** — valid iff it is not '0'; this contributes `dp[i-1]` ways, or\n" +
            "2. as the **second half of a two-digit code** with `s[i-2]` — valid iff that two-digit value is in 10–26; this contributes `dp[i-2]` ways.\n\n" +
            "**Transition.** `dp[i] = (dp[i-1] if s[i-1] != '0') + (dp[i-2] if '10' <= s[i-2:i] <= '26')`.\n\n" +
            "**Why the transition is correct.** Any decoding of `s[:i]` ends with a last code that is either one digit or two digits; these cases are disjoint and exhaustive, and the count of decodings for each equals the count for the string with that last code stripped off (`dp[i-1]` or `dp[i-2]`). Summing counts all decodings exactly once. A '0' can only survive as part of '10' or '20'; otherwise it kills the single-digit branch and, if not preceded by a valid tens digit, forces `dp[i] = 0`.\n\n" +
            "**State evolution.** Fill `dp[2..n]` left to right; each cell reads the previous two. (Two-character string comparison `'10' <= two <= '26'` orders identically to the numeric value.)\n\n" +
            "**Space.** Only `dp[i-1]` and `dp[i-2]` are used, so this is space-optimizable to two rolling variables → `O(1)`.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(n)` (or `O(1)` rolled).",
          rcs:
            "class Solution:\n" +
            "    def numDecodings(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        dp = [0] * (n + 1)               # dp[i] = ways to decode s[:i].\n" +
            "        dp[0] = 1                        # Empty string: one way (anchors recurrence).\n" +
            "        dp[1] = 1 if s[0] != '0' else 0  # A lone '0' cannot be decoded.\n" +
            "        for i in range(2, n + 1):\n" +
            "            one = s[i - 1]               # The current single digit.\n" +
            "            two = s[i - 2:i]             # The current two-digit chunk.\n" +
            "            if one != '0':               # Valid single digit (1-9)...\n" +
            "                dp[i] += dp[i - 1]       # ...extends every decoding of s[:i-1].\n" +
            "            if '10' <= two <= '26':      # Valid two-digit code (10-26)...\n" +
            "                dp[i] += dp[i - 2]       # ...extends every decoding of s[:i-2].\n" +
            "        return dp[n]",
          plain:
            "class Solution:\n" +
            "    def numDecodings(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        dp = [0] * (n + 1)\n" +
            "        dp[0] = 1\n" +
            "        dp[1] = 1 if s[0] != '0' else 0\n" +
            "        for i in range(2, n + 1):\n" +
            "            one = s[i - 1]\n" +
            "            two = s[i - 2:i]\n" +
            "            if one != '0':\n" +
            "                dp[i] += dp[i - 1]\n" +
            "            if '10' <= two <= '26':\n" +
            "                dp[i] += dp[i - 2]\n" +
            "        return dp[n]"
        }
      ],
      patternRecognition: [
        "'Count the number of ways to parse/segment a sequence' where each unit is 1 or 2 tokens → count-ways DP.",
        "Fibonacci-shaped recurrence (dp[i] from dp[i-1] and dp[i-2]) but with validity guards.",
        "Zeros and range limits (10–26) are the tricky guards that gate each branch."
      ],
      interviewRecall: [
        "dp[i] += dp[i-1] if the single digit is 1–9; dp[i] += dp[i-2] if the two-digit chunk is 10–26.",
        "Base dp[0]=1; dp[1]=0 when the string starts with '0'.",
        "The only zeros that decode are inside '10' and '20'; a stray '0' zeroes out that position."
      ]
    },

    {
      id: "maximum-subarray",
      lc: 53,
      title: "Maximum Subarray",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/maximum-subarray/",
      meta: { pattern: "Kadane's Algorithm", dataStructure: "Running Sum", technique: "Extend-or-restart" },
      description:
        "Given an integer array `nums`, find the **contiguous subarray** (containing at least one element) with the **largest sum**, and return that sum.",
      constraints: [
        "`1 <= nums.length <= 10^5`",
        "`-10^4 <= nums[i] <= 10^4`"
      ],
      notes: [
        "The subarray must be contiguous and non-empty.",
        "All-negative arrays are allowed — the answer is then the single largest (least negative) element."
      ],
      examples: [
        {
          input: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
          output: "6",
          reasoning: "The subarray [4, -1, 2, 1] sums to 6, the largest of any contiguous run.",
          visual:
            "```\nnums    : -2  1 -3  4 -1  2  1 -5  4\ncurrent : -2  1 -2  4  3  5  6  1  5\nbest    : -2  1  1  4  4  5  6  6  6\n  current = max(num, current + num); best = max(best, current)\n```"
        },
        {
          input: "nums = [1]",
          output: "1",
          reasoning: "A single element is its own maximum subarray."
        },
        {
          input: "nums = [5, 4, -1, 7, 8]",
          output: "23",
          reasoning: "The entire array sums to 23; every prefix stays positive so nothing is worth dropping."
        },
        {
          input: "nums = [-3, -1, -2]",
          output: "-1",
          reasoning: "All negative → pick the single least-negative element, -1."
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "Only to state the naive baseline before presenting Kadane.",
          logic:
            "**B. Brute force.** Fix each start index `i`, extend a running total across every end `j >= i`, and track the best sum seen. This examines all `O(n^2)` contiguous subarrays.\n\n" +
            "**C. Why it is slow.** For `n = 10^5` that is ~5 billion operations. It redundantly recomputes overlapping sums instead of reusing the previous window's work.\n\n" +
            "**J. Why correct.** Every contiguous subarray is generated exactly once by some `(i, j)` pair, so the maximum cannot be missed.",
          rcs:
            "class Solution:\n" +
            "    def maxSubArray(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        best = nums[0]                   # Best sum found so far.\n" +
            "        for i in range(n):               # Every possible start index.\n" +
            "            total = 0\n" +
            "            for j in range(i, n):        # Extend the subarray to each end index.\n" +
            "                total += nums[j]         # Running sum of nums[i..j].\n" +
            "                best = max(best, total)  # Track the maximum.\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxSubArray(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        best = nums[0]\n" +
            "        for i in range(n):\n" +
            "            total = 0\n" +
            "            for j in range(i, n):\n" +
            "                total += nums[j]\n" +
            "                best = max(best, total)\n" +
            "        return best"
        },
        {
          name: "Optimized — Kadane's Algorithm",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer for maximum contiguous sum in one linear pass.",
          logic:
            "**D. Key observation.** As we scan, we track the best subarray sum that **ends at the current index**. At each new element, that best-ending-here is either the element **started fresh**, or the element **appended** to the previous best-ending-here — whichever is larger.\n\n" +
            "**dp meaning.** `current` = maximum sum of a subarray ending exactly at index `i`. (This is the classic `dp[i]`, collapsed to a single variable because only the previous value is needed.)\n\n" +
            "**Base case.** `current = best = nums[0]` — the subarray ending at index 0 is just `nums[0]`.\n\n" +
            "**Transition.** `current = max(num, current + num)`. If the running sum has gone negative, carrying it forward would only hurt, so we discard it and restart at `num`. Then `best = max(best, current)`.\n\n" +
            "**Why the transition is correct.** A max-sum subarray ending at `i` must either be `nums[i]` alone or `nums[i]` glued to a max-sum subarray ending at `i-1`; extending a *negative* prefix can never help, so restarting is optimal exactly when `current + num < num`. Taking the running max of `current` over all `i` yields the global maximum, since every subarray ends *somewhere*.\n\n" +
            "**State evolution.** `current` rolls forward one element at a time; `best` records the high-water mark. Starting `best` at `nums[0]` (not 0) correctly handles all-negative arrays.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** 'Largest contiguous sum' is the textbook Kadane trigger: extend-or-restart in a single scan.",
          rcs:
            "class Solution:\n" +
            "    def maxSubArray(self, nums: List[int]) -> int:\n" +
            "        best = nums[0]                   # Global best subarray sum.\n" +
            "        current = nums[0]                # Best sum of a subarray ENDING at current index.\n" +
            "        for num in nums[1:]:\n" +
            "            current = max(num, current + num)  # Restart at num, or extend the run.\n" +
            "            best = max(best, current)          # Update the global maximum.\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxSubArray(self, nums: List[int]) -> int:\n" +
            "        best = nums[0]\n" +
            "        current = nums[0]\n" +
            "        for num in nums[1:]:\n" +
            "            current = max(num, current + num)\n" +
            "            best = max(best, current)\n" +
            "        return best"
        }
      ],
      patternRecognition: [
        "'Largest sum of a contiguous subarray' → Kadane's Algorithm.",
        "The extend-or-restart decision (drop a negative prefix) is Kadane's signature.",
        "dp[i] = best sum ending at i, collapsed to a single rolling variable."
      ],
      interviewRecall: [
        "current = max(num, current + num); best = max(best, current).",
        "Initialize both to nums[0], not 0, so all-negative arrays work.",
        "A running sum that turns negative should be dropped — it can only drag future sums down."
      ]
    },

    {
      id: "maximum-product-subarray",
      lc: 152,
      title: "Maximum Product Subarray",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/maximum-product-subarray/",
      meta: { pattern: "Min/Max Tracking DP", dataStructure: "Two Running Extremes", technique: "Track min and max" },
      description:
        "Given an integer array `nums`, find the **contiguous subarray** (containing at least one element) that has the **largest product**, and return that product.\n\n" +
        "The answer is guaranteed to fit in a 32-bit integer.",
      constraints: [
        "`1 <= nums.length <= 2 * 10^4`",
        "`-10 <= nums[i] <= 10`",
        "The product of any prefix is guaranteed to fit in a 32-bit integer."
      ],
      notes: [
        "Negatives flip sign, so the smallest (most negative) running product can become the largest after multiplying by another negative.",
        "Zeros reset both running products — a product-subarray cannot span a zero."
      ],
      examples: [
        {
          input: "nums = [2, 3, -2, 4]",
          output: "6",
          reasoning: "The subarray [2, 3] gives 6; extending across -2 would flip the sign.",
          visual:
            "```\nnums   :  2   3  -2   4\ncur_max:  2   6  -2   4\ncur_min:  2   3 -12  -48\n  each step swaps roles when num < 0\n```"
        },
        {
          input: "nums = [-2, 0, -1]",
          output: "0",
          reasoning: "The best product is 0; no contiguous run of the non-zero elements beats it."
        },
        {
          input: "nums = [-2, 3, -4]",
          output: "24",
          reasoning: "The whole array: (-2) * 3 * (-4) = 24 — two negatives make a large positive."
        },
        {
          input: "nums = [-1, -1]",
          output: "1",
          reasoning: "(-1) * (-1) = 1 beats either single element."
        }
      ],
      approaches: [
        {
          name: "Track Min and Max Simultaneously",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The go-to when products can flip sign — you must carry the minimum as a candidate future maximum.",
          logic:
            "**A. What is asked.** The largest product over all contiguous subarrays.\n\n" +
            "**B. Why Kadane alone fails.** For sums, a negative prefix is always bad. For products, a very *negative* running product is valuable: one more negative number flips it to a large positive. So tracking only the max loses information.\n\n" +
            "**dp meaning.** At each index `i` keep TWO values: `cur_max` = largest product of a subarray ending at `i`, and `cur_min` = smallest (most negative) product of a subarray ending at `i`.\n\n" +
            "**Base case.** `best = cur_max = cur_min = nums[0]`.\n\n" +
            "**Decision at each step.** The product ending at `i` is either `num` alone (restart), or `num * cur_max`, or `num * cur_min`. When `num` is negative, multiplying flips signs, so the previous *min* can produce the new *max* and vice versa.\n\n" +
            "**Transition.** `cur_max = max(num, cur_max*num, cur_min*num)` and `cur_min = min(num, cur_max*num, cur_min*num)` — computed from the SAME old values (compute both candidate sets before overwriting). Then `best = max(best, cur_max)`.\n\n" +
            "**Why correct.** Every subarray ending at `i` extends one ending at `i-1` (or restarts). The extremes of the extended products can only come from multiplying `num` into the previous extreme products or starting fresh — considering all three candidates for both min and max captures every sign flip. Restarting at `num` naturally handles zeros: after a 0, both extremes reset to the next element.\n\n" +
            "**State evolution.** Two rolling scalars sweep left to right; `best` tracks the running maximum.\n\n" +
            "**K/L. Complexity.** One pass → time `O(n)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def maxProduct(self, nums: List[int]) -> int:\n" +
            "        best = nums[0]                   # Global best product.\n" +
            "        cur_max = nums[0]                # Max product of a subarray ending here.\n" +
            "        cur_min = nums[0]                # Min (most negative) product ending here.\n" +
            "        for num in nums[1:]:\n" +
            "            candidates = (num, cur_max * num, cur_min * num)  # Restart, or extend either extreme.\n" +
            "            cur_max = max(candidates)    # New max from the three options.\n" +
            "            cur_min = min(candidates)    # New min (may become max after a future negative).\n" +
            "            best = max(best, cur_max)    # Update the global best.\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxProduct(self, nums: List[int]) -> int:\n" +
            "        best = nums[0]\n" +
            "        cur_max = nums[0]\n" +
            "        cur_min = nums[0]\n" +
            "        for num in nums[1:]:\n" +
            "            candidates = (num, cur_max * num, cur_min * num)\n" +
            "            cur_max = max(candidates)\n" +
            "            cur_min = min(candidates)\n" +
            "            best = max(best, cur_max)\n" +
            "        return best"
        }
      ],
      patternRecognition: [
        "'Largest product of a contiguous subarray' → track BOTH running min and max.",
        "Sign-flipping operations (products) mean the minimum is a candidate future maximum.",
        "Zeros partition the array; restarting from the current element handles them for free."
      ],
      interviewRecall: [
        "Carry cur_max AND cur_min; a negative number swaps their roles.",
        "Candidates each step: num, cur_max*num, cur_min*num — compute before overwriting either.",
        "Initialize everything to nums[0]; the min matters precisely because of negatives."
      ]
    },

    {
      id: "palindromic-substrings",
      lc: 647,
      title: "Palindromic Substrings",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/palindromic-substrings/",
      meta: { pattern: "Expand Around Center", dataStructure: "String", technique: "Center expansion" },
      description:
        "Given a string `s`, return the **total number of palindromic substrings** in it.\n\n" +
        "A substring is a contiguous sequence of characters, and two substrings are counted separately if they start or end at different indices (even if the text is identical).",
      constraints: [
        "`1 <= s.length <= 1000`",
        "`s` consists of lowercase English letters."
      ],
      notes: [
        "Every single character is a palindrome, so the count is at least `s.length`.",
        "Substrings at different positions count separately even if they look the same."
      ],
      examples: [
        {
          input: 's = "abc"',
          output: "3",
          reasoning: 'Three single-character palindromes: "a", "b", "c".'
        },
        {
          input: 's = "aaa"',
          output: "6",
          reasoning: '"a"×3, "aa"×2, "aaa"×1 = 6 palindromic substrings.',
          visual:
            "```\ns = a a a\ncenters (odd) : a | a | a    -> 3\ncenters (even): aa | aa      -> 2\nfull expand   : aaa          -> 1\ntotal = 6\n```"
        },
        {
          input: 's = "abba"',
          output: "6",
          reasoning: '"a","b","b","a" (4) + "bb" (1) + "abba" (1) = 6.'
        },
        {
          input: 's = "racecar"',
          output: "10",
          reasoning: "7 single letters + 'cec' + 'aceca' + 'racecar' = 10."
        }
      ],
      approaches: [
        {
          name: "Expand Around Center",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "The clean, memory-light way to count/find palindromes without a full DP table.",
          logic:
            "**A. What is asked.** Count every contiguous substring of `s` that reads the same forwards and backwards.\n\n" +
            "**B. Naive idea.** Check all `O(n^2)` substrings, each verified in `O(n)` → `O(n^3)`. Too much repeated work.\n\n" +
            "**D. Key observation.** Every palindrome has a **center** and is symmetric around it. Rather than test arbitrary substrings, grow outward from each possible center: matching characters on both sides extend the palindrome, a mismatch stops it.\n\n" +
            "**The two center types.** A palindrome of **odd** length has a single-character center (index `i`); one of **even** length has a center *between* two characters (indices `i` and `i+1`). For a string of length `n` there are `2n - 1` centers total.\n\n" +
            "**Expansion routine.** From `(left, right)`, while `left >= 0`, `right < n`, and `s[left] == s[right]`: you have found one more palindrome (count it), then step `left--`, `right++`. Each successful expansion is a distinct, valid palindromic substring, so counting per step gives the total.\n\n" +
            "**Why correct.** Every palindromic substring is uniquely identified by its center and radius, and center expansion visits each (center, radius) once, counting exactly the palindromes centered there. Summing over all centers counts every palindrome exactly once.\n\n" +
            "**State / space.** No table needed — just the two pointers and a counter, so `O(1)` extra space (an alternative 2-D DP where `dp[i][j]` = 'is s[i..j] a palindrome' also works but uses `O(n^2)` space).\n\n" +
            "**K/L. Complexity.** `2n-1` centers, each expanding up to `O(n)` → time `O(n^2)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def countSubstrings(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        count = 0\n" +
            "        def expand(left, right):         # Count palindromes centered at (left,right).\n" +
            "            c = 0\n" +
            "            while left >= 0 and right < n and s[left] == s[right]:  # Symmetric?\n" +
            "                c += 1                    # s[left..right] is a palindrome.\n" +
            "                left -= 1                 # Grow outward on both sides.\n" +
            "                right += 1\n" +
            "            return c\n" +
            "        for center in range(n):\n" +
            "            count += expand(center, center)      # Odd-length palindromes.\n" +
            "            count += expand(center, center + 1)  # Even-length palindromes.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def countSubstrings(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        count = 0\n" +
            "        def expand(left, right):\n" +
            "            c = 0\n" +
            "            while left >= 0 and right < n and s[left] == s[right]:\n" +
            "                c += 1\n" +
            "                left -= 1\n" +
            "                right += 1\n" +
            "            return c\n" +
            "        for center in range(n):\n" +
            "            count += expand(center, center)\n" +
            "            count += expand(center, center + 1)\n" +
            "        return count"
        }
      ],
      patternRecognition: [
        "'Count / find palindromic substrings' → expand around center.",
        "Remember BOTH center kinds: single index (odd) and between two indices (even).",
        "Symmetry around a center beats brute-force substring checking."
      ],
      interviewRecall: [
        "There are 2n-1 centers; expand each while s[left]==s[right].",
        "Count one palindrome per successful expansion step.",
        "O(n^2) time, O(1) space — no DP table required (though a dp[i][j] table is an alternative)."
      ]
    },

    {
      id: "longest-palindromic-substring",
      lc: 5,
      title: "Longest Palindromic Substring",
      difficulty: "Medium",
      category: "1-D Dynamic Programming",
      link: "https://leetcode.com/problems/longest-palindromic-substring/",
      meta: { pattern: "Expand Around Center", dataStructure: "String", technique: "Center expansion" },
      description:
        "Given a string `s`, return the **longest substring** of `s` that is a palindrome.\n\n" +
        "If several substrings tie for the longest length, returning any one of them is acceptable.",
      constraints: [
        "`1 <= s.length <= 1000`",
        "`s` consists of digits and English letters."
      ],
      notes: [
        "A single character is a valid palindrome, so the answer is never empty for a non-empty input.",
        "Any one of the longest palindromes is accepted when there is a tie."
      ],
      examples: [
        {
          input: 's = "babad"',
          output: '"bab"',
          reasoning: '"bab" is a longest palindrome; "aba" is an equally valid answer.',
          visual:
            "```\ns = b a b a d\n     \\ | /\n    expand center at index 1: b[a]b -> \"bab\" (len 3)\n```"
        },
        {
          input: 's = "cbbd"',
          output: '"bb"',
          reasoning: 'The even-length center between the two b\'s gives "bb", the longest palindrome.'
        },
        {
          input: 's = "a"',
          output: '"a"',
          reasoning: "A single character is trivially a palindrome."
        },
        {
          input: 's = "forgeeksskeegfor"',
          output: '"geeksskeeg"',
          reasoning: 'The even-length palindrome "geeksskeeg" (length 10) is the longest.'
        }
      ],
      approaches: [
        {
          name: "Expand Around Center",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "The standard interview solution: no DP table, constant extra space, easy to reason about.",
          logic:
            "**A. What is asked.** Return a longest contiguous substring that reads the same both ways.\n\n" +
            "**B. Naive idea.** Test every substring for palindromeness → `O(n^3)`; wasteful.\n\n" +
            "**D. Key observation.** A palindrome is symmetric around its center, so grow outward from each center and keep track of the longest span found. Odd-length palindromes center on a character; even-length ones center between two characters — try both for every position (`2n-1` centers).\n\n" +
            "**Expansion routine.** From `(left, right)`, expand while `left >= 0`, `right < n`, and `s[left] == s[right]`. When the loop stops, the widest valid palindrome is `s[left+1 : right]` (the pointers overshoot by one on each side), i.e. the inclusive range `[left+1, right-1]`. Return those bounds.\n\n" +
            "**Tracking the best.** Keep `start` and `end` for the best range seen. After expanding both center types at index `i`, if a returned span is longer than `end - start`, update the bounds.\n\n" +
            "**Why correct.** Every palindrome corresponds to exactly one center; expanding each center finds the maximal palindrome around it, and taking the longest across all centers is therefore the global longest.\n\n" +
            "**State / space.** Only a few index variables → `O(1)` extra space. (A 2-D `dp[i][j]` = 'is s[i..j] a palindrome' table also solves it but costs `O(n^2)` space.)\n\n" +
            "**K/L. Complexity.** `2n-1` centers × up to `O(n)` expansion → time `O(n^2)`, space `O(1)`. (Manacher's algorithm reaches `O(n)` but is rarely required.)",
          rcs:
            "class Solution:\n" +
            "    def longestPalindrome(self, s: str) -> str:\n" +
            "        if len(s) <= 1:                  # Single char (or empty) is its own answer.\n" +
            "            return s\n" +
            "        start, end = 0, 0                # Best palindrome bounds so far (inclusive).\n" +
            "        def expand(left, right):         # Widest palindrome around this center.\n" +
            "            while left >= 0 and right < len(s) and s[left] == s[right]:\n" +
            "                left -= 1                # Grow outward while symmetric.\n" +
            "                right += 1\n" +
            "            return left + 1, right - 1   # Step back the overshoot to inclusive bounds.\n" +
            "        for i in range(len(s)):\n" +
            "            l1, r1 = expand(i, i)        # Odd-length center at i.\n" +
            "            if r1 - l1 > end - start:    # Longer than current best?\n" +
            "                start, end = l1, r1\n" +
            "            l2, r2 = expand(i, i + 1)    # Even-length center between i and i+1.\n" +
            "            if r2 - l2 > end - start:\n" +
            "                start, end = l2, r2\n" +
            "        return s[start:end + 1]",
          plain:
            "class Solution:\n" +
            "    def longestPalindrome(self, s: str) -> str:\n" +
            "        if len(s) <= 1:\n" +
            "            return s\n" +
            "        start, end = 0, 0\n" +
            "        def expand(left, right):\n" +
            "            while left >= 0 and right < len(s) and s[left] == s[right]:\n" +
            "                left -= 1\n" +
            "                right += 1\n" +
            "            return left + 1, right - 1\n" +
            "        for i in range(len(s)):\n" +
            "            l1, r1 = expand(i, i)\n" +
            "            if r1 - l1 > end - start:\n" +
            "                start, end = l1, r1\n" +
            "            l2, r2 = expand(i, i + 1)\n" +
            "            if r2 - l2 > end - start:\n" +
            "                start, end = l2, r2\n" +
            "        return s[start:end + 1]"
        }
      ],
      patternRecognition: [
        "'Longest palindromic substring' → expand around center.",
        "Handle odd and even centers separately (2n-1 centers total).",
        "Track the best (start, end) bounds instead of rebuilding strings each step."
      ],
      interviewRecall: [
        "Expand while s[left]==s[right]; on exit the palindrome is s[left+1 : right].",
        "Try center (i, i) for odd lengths and (i, i+1) for even lengths.",
        "O(n^2)/O(1) is expected; mention Manacher's O(n) only if pushed."
      ]
    }
  ]);
})();
