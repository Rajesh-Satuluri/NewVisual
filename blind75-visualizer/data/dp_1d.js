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
            "**What it asks.** Count the distinct ordered sequences of 1-steps and 2-steps that sum to `n` — the number of different ways to climb to the top.\n\n" +
            "**Why the naive idea fails.** You could recurse on the last move without a cache, but that re-solves the same subproblems repeatedly: `ways(n-2)` is recomputed by both `ways(n)` and `ways(n-1)`. The call tree has roughly Fibonacci(n) leaves, giving exponential `O(2^n)` time.\n\n" +
            "**Key Idea.** Let `dp[i]` (written here as `ways(i)`) be the number of distinct ways to reach step `i`. To land on step `i`, your last move was either a 1-step (arriving from `i-1`) or a 2-step (arriving from `i-2`). Those two arrival sets are disjoint and cover every path, so `ways(i) = ways(i-1) + ways(i-2)`. Caching each result once removes the exponential blowup.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `ways(1) = 1` (a single step) and `ways(2) = 2` (1+1 or one 2). The check `i <= 2` returns `i`, which captures both.\n" +
            "2. For any larger `i`, if it is already in the `memo` cache, return the stored value.\n" +
            "3. Otherwise compute `ways(i-1) + ways(i-2)` — the transition in words: the ways to reach `i` are the ways to reach the step one below plus the ways to reach the step two below.\n" +
            "4. Store the result in `memo[i]` before returning, so each state is solved exactly once.\n\n" +
            "**Why it works.** The last move partitions every path to step `i` into exactly two non-overlapping groups (ended with a 1 or a 2), so adding the two subproblem counts counts each path exactly once. Induction from the base cases proves every `ways(i)` correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting the cache leaves the solution exponential — the memo is what makes it linear.\n" +
            "- Off-by-one in the base cases: `ways(2)` is 2, not 1.\n" +
            "- Deep recursion for large `n` uses `O(n)` stack; an iterative bottom-up form avoids it.\n\n" +
            "**Complexity.** `n` distinct states each solved in `O(1)` → time `O(n)`; recursion stack plus memo → space `O(n)`.\n\n" +
            "**Interview mindset.** 'Count paths where each step depends on the previous one or two' is the Fibonacci-DP signal: write the recurrence naturally as recursion, then add a cache.",
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
            "**What it asks.** Count the distinct ordered sequences of 1-steps and 2-steps that sum to `n`.\n\n" +
            "**Why the naive idea fails.** Plain recursion on the last move re-solves the same subproblems, giving exponential `O(2^n)` time. Even memoized top-down recursion, while linear, carries `O(n)` call-stack and cache overhead — building the answer iteratively removes both.\n\n" +
            "**Key Idea.** Let `dp[i]` be the number of distinct ways to reach step `i`. To land on step `i` your last move was a 1-step (arriving from `i-1`) or a 2-step (arriving from `i-2`), and those two arrival sets are disjoint and cover every path, so `dp[i] = dp[i-1] + dp[i-2]`. Building `dp` bottom-up means every dependency is already known when you need it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[1] = 1` (one way — a single step) and `dp[2] = 2` (1+1 or one 2-step).\n" +
            "2. Transition in words: for each step from 3 up to `n`, the number of ways to reach it is the ways to reach the step one below plus the ways to reach the step two below.\n" +
            "3. Fill left to right so each `dp[i]` reads the two already-final cells before it; `dp[n]` is the answer.\n\n" +
            "**Why it works.** The last-move argument partitions every path to step `i` into exactly two non-overlapping groups (ended with a 1 or a 2), so adding the two subproblem counts counts each path once. Computing states in dependency order (small to large) guarantees each value is final when read; induction from the base cases proves every `dp[i]` correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- Off-by-one in the base cases: `dp[2]` is 2, not 1.\n" +
            "- Reading a cell before it is filled — always go strictly left to right.\n" +
            "- Remember to handle `n <= 2` before the loop starts.\n\n" +
            "**Space optimization.** `dp[i]` only ever looks back two cells, so the whole array is unnecessary: keep two scalars `first = dp[i-2]` and `second = dp[i-1]`, roll them forward (`second` becomes the new `dp[i]`), and space drops from `O(n)` to `O(1)`.\n\n" +
            "**Complexity.** One pass over the steps → time `O(n)`; two rolling variables → space `O(1)`.\n\n" +
            "**Interview mindset.** 'Count paths where each step depends only on the last one or two' is the Fibonacci-DP signal: write the recurrence, fill it bottom-up, then collapse to two variables.",
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
            "**What it asks.** Find the fewest coins that total exactly `amount`, with unlimited copies of each denomination, or `-1` if it cannot be formed.\n\n" +
            "**Why the naive idea fails.** The tempting greedy 'take the largest coin that fits' can strand you: for coins `[1,3,4]` and amount `6`, greedy gives 4+1+1 = 3 coins but the optimum is 3+3 = 2. Greedy ignores that a smaller coin now can unlock a better total later, so we must consider every denomination at every sub-amount — which is what DP does.\n\n" +
            "**Key Idea.** Let `dp[a]` be the minimum number of coins needed to make exactly amount `a`. Any optimal way to make `a` ends with *some* last coin `c <= a`; strip that coin and what remains is an optimal way to make `a - c`. So `dp[a]` is one more than the best `dp[a - c]` over all coins that fit. Because coins are reusable, `dp[a - c]` is read from the *same* array (unbounded knapsack), not a previous row.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: `dp[0] = 0` — zero coins make amount 0. Initialize every other `dp[a]` to a sentinel 'infinity' (`amount + 1`, larger than any real answer since you never need more than `amount` coins of value >= 1).\n" +
            "2. Transition in words: for each amount `a` from 1 up to `amount`, try every coin that fits and set `dp[a]` to one plus the smallest `dp[a - coin]` — the best over all choices of last coin.\n" +
            "3. Fill `a` from small to large so every `dp[a - coin]` is already final when read.\n" +
            "4. Answer: if `dp[amount]` is still the sentinel, no combination works → return `-1`; otherwise return `dp[amount]`.\n\n" +
            "**Why it works.** Optimal substructure: an optimal solution for `a` contains an optimal solution for `a - c` for its last coin `c`. Minimizing over all possible last coins finds the global minimum, and filling amounts in increasing order guarantees each subproblem is solved before it is needed. Induction from `dp[0] = 0` proves every cell correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- `amount = 0` must return 0 — the base case handles it.\n" +
            "- Use a sentinel that can't collide with a real count (`amount + 1`) and check for it before returning, or you'll return a bogus large number instead of `-1`.\n" +
            "- Skip coins larger than the current amount to avoid a negative index.\n\n" +
            "**Space optimization.** The 1-D `dp` array of size `amount + 1` is already the space-optimized form of the 2-D coins-vs-amount table; reusing the same row is exactly what models unlimited coin reuse.\n\n" +
            "**Complexity.** `amount` cells × `len(coins)` choices each → time `O(amount * len(coins))`; space `O(amount)` for the array.\n\n" +
            "**Interview mindset.** 'Minimum / maximum items to reach a target with unlimited reuse' — especially when greedy visibly breaks on non-canonical coins — is the unbounded-knapsack DP signal.",
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
            "**What it asks.** Return the length of the longest strictly increasing subsequence (LIS) — elements kept in order but not necessarily contiguous.\n\n" +
            "**Why the naive idea fails.** Enumerating all subsequences to test which are increasing is `O(2^n)`; even the obvious 'for each element, how long a chain ends here?' is wasteful if recomputed from scratch. DP reuses the answers for earlier endpoints.\n\n" +
            "**Key Idea.** Let `dp[i]` be the length of the longest increasing subsequence that ends *exactly* at index `i` (with `nums[i]` as its final element). Any such subsequence has a second-to-last element at some `j < i` with `nums[j] < nums[i]`, and that prefix is itself an LIS ending at `j` — whose length is already `dp[j]`. So `dp[i]` is one more than the best compatible `dp[j]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: every element alone is a subsequence of length 1, so initialize each `dp[i] = 1`.\n" +
            "2. Transition in words: for each `i`, look at every earlier `j`; if `nums[j] < nums[i]`, then `nums[i]` can extend the chain ending at `j`, so take the max of the current `dp[i]` and `dp[j] + 1`.\n" +
            "3. Fill `dp` left to right.\n" +
            "4. Answer: `max(dp)` — the LIS can end at any index, not necessarily the last one.\n\n" +
            "**Why it works.** Every increasing subsequence ends somewhere; defining `dp` by its endpoint makes the choices exhaustive, and taking the best valid predecessor `j` finds the longest chain that can precede `nums[i]`. Induction over increasing `i` proves each `dp[i]` optimal.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return `max(dp)`, not `dp[n-1]` — the longest subsequence rarely ends at the last element.\n" +
            "- 'Strictly' increasing means the comparison is `<`, not `<=`; equal values cannot both be chosen.\n" +
            "- Don't confuse subsequence with subarray — elements need not be contiguous.\n\n" +
            "**Space optimization.** The `O(n)` `dp` array is intrinsic to this formulation; reducing time (not space) below `O(n^2)` requires the patience/binary-search approach.\n\n" +
            "**Complexity.** Nested loops over pairs `(i, j)` → time `O(n^2)`; space `O(n)` for `dp`.\n\n" +
            "**Interview mindset.** 'Longest increasing/decreasing subsequence (not subarray)' with `dp[i]` defined as 'best answer ending at i' is the standard subsequence-DP framing.",
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
            "**What it asks.** The length of the longest strictly increasing subsequence, in `O(n log n)` instead of `O(n^2)`.\n\n" +
            "**Why the naive idea fails.** The `O(n^2)` endpoint DP compares each new element against every earlier one. Most of that work is redundant: what actually matters is, for each achievable subsequence length, the smallest value that can end it.\n\n" +
            "**Key Idea.** Maintain an array `tails` where `tails[k]` is the smallest possible tail value of any increasing subsequence of length `k+1` seen so far. Keeping each length's tail as small as possible leaves the most room to extend later. Crucially, `tails` stays sorted in strictly increasing order, and its length equals the current LIS length — so we can binary-search it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `tails`. The search space each step is the sorted `tails` array.\n" +
            "2. For each `num`, binary-search (`bisect_left`) for the first tail `>= num`.\n" +
            "3. If none exists (`num` is larger than every tail), `num` extends the longest chain → append it, growing the LIS by one.\n" +
            "4. Otherwise overwrite that first tail `>= num` with `num`: this eliminates a larger, less useful tail for that length without changing the LIS length, improving future extensibility.\n\n" +
            "**Why it works.** Each overwrite keeps `tails[k]` minimal for its length while preserving sortedness, so the length of `tails` always tracks the true LIS length. Using `bisect_left` (first element `>= num`) means an equal value overwrites rather than appends, enforcing *strictly* increasing. Note `tails` is not necessarily a real subsequence — only its length is the answer.\n\n" +
            "**Common Gotchas.**\n" +
            "- `bisect_left` (>=) enforces strict increase; `bisect_right` (>) would allow equal values (non-decreasing) — pick deliberately.\n" +
            "- Don't treat `tails` as the actual subsequence; reconstructing the sequence needs extra bookkeeping.\n" +
            "- Appending only when the insertion point is at the end is what grows the length — get that boundary right.\n\n" +
            "**Complexity.** `n` elements × `O(log n)` binary search → time `O(n log n)`; space `O(n)` for `tails`.\n\n" +
            "**Interview mindset.** When an `O(n^2)` subsequence DP is too slow, 'smallest tail per length + binary search' (patience sorting) is the go-to `O(n log n)` upgrade.",
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
            "**What it asks.** Decide whether `s` can be cut into a sequence of pieces that are all dictionary words (words may be reused).\n\n" +
            "**The idea, and why it's slow.** Define `can(start)` = 'can the suffix `s[start:]` be fully segmented?'. Try every prefix `s[start:end]`; if it is a dictionary word AND the remainder `can(end)` is segmentable, the answer is true. Without caching this re-explores the same `start` positions through many different prefix choices, giving exponential `O(2^n)` time on strings like `'aaaa...'`.\n\n" +
            "**Key Idea.** The problem has a clean recursive structure: a suffix is segmentable iff some dictionary word is a prefix of it and the rest of the suffix is also segmentable. That recurrence is the seed for both this brute force and the memoized/bottom-up optimizations.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Put the dictionary in a set for `O(1)` membership tests.\n" +
            "2. Base case: `can(len(s))` is true — reaching the end means every character was consumed by valid words.\n" +
            "3. From `start`, try each end position; if `s[start:end]` is a word and `can(end)` returns true, succeed.\n" +
            "4. If no prefix leads to a full segmentation, return false.\n\n" +
            "**Why it works.** It exhaustively tries every way to place the first word and recurses on the rest, so if any valid segmentation exists it is found. Correctness is by induction on suffix length from the base case.\n\n" +
            "**Common Gotchas.**\n" +
            "- Without memoization this is exponential — usable only to frame the recurrence.\n" +
            "- The base case is 'index reached the end', not 'the sliced string is empty' — index bookkeeping matters.\n" +
            "- Words are reusable, so don't remove a word from the set once used.\n\n" +
            "**Complexity.** Exponential `O(2^n)` time in the worst case; `O(n)` recursion depth for the stack.\n\n" +
            "**Interview mindset.** State the suffix-reachability recurrence first; the moment you see overlapping `start` calls, reach for memoization or a bottom-up prefix DP.",
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
            "**What it asks.** Return whether `s` can be segmented into dictionary words, computed efficiently.\n\n" +
            "**Why the naive idea fails.** The plain recursion re-solves the same suffix positions, exponentially. Turning it into a bottom-up scan over prefixes solves each position once.\n\n" +
            "**Key Idea.** Let `dp[i]` be true iff the prefix `s[:i]` (the first `i` characters) can be segmented into dictionary words. A valid segmentation of `s[:i]` must end with some final word `s[j:i]`; removing it leaves a valid segmentation of `s[:j]`, which is exactly `dp[j]`. So `dp[i]` is true when some split point `j` has `dp[j]` true and `s[j:i]` in the dictionary. The answer is `dp[n]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Put the dictionary in a set for `O(1)` lookups.\n" +
            "2. Base case: `dp[0] = True` — the empty prefix is trivially segmentable.\n" +
            "3. Transition in words: for each end position `i` from 1 to `n`, scan split points `j < i`; if the prefix up to `j` is segmentable and the chunk `s[j:i]` is a dictionary word, mark `dp[i]` true and stop scanning (one valid split is enough).\n" +
            "4. Fill `dp[1..n]` left to right; each `dp[i]` reads only smaller, already-final cells. Return `dp[n]`.\n\n" +
            "**Why it works.** Scanning all `j` covers every possible last word, and every segmentation of `s[:i]` corresponds to exactly one such last word plus a segmentation of the preceding prefix. Induction over increasing `i` from `dp[0]` proves correctness.\n\n" +
            "**Common Gotchas.**\n" +
            "- `dp[0] = True` is the anchor; forgetting it makes everything false.\n" +
            "- Break the inner loop on the first working split — you only need existence, not a count.\n" +
            "- Index vs. length: `dp[i]` covers the first `i` characters, so the array has size `n + 1`.\n\n" +
            "**Space optimization.** The boolean `dp` array of size `n + 1` is already the minimal 1-D state; there's no smaller rolling window because `s[j:i]` can reach far back.\n\n" +
            "**Complexity.** Two nested position loops → `O(n^2)` combinations, each doing an `O(word length)` slice/lookup; space `O(n)`.\n\n" +
            "**Interview mindset.** 'Can this string be split into valid pieces?' → boolean partition/reachability DP over prefixes with `dp[i]` = 'is the first i characters segmentable'.",
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
            "**What it asks.** Maximize the total money robbed from a straight line of houses without robbing two adjacent houses.\n\n" +
            "**Why the naive idea fails.** Trying every valid subset of non-adjacent houses is exponential. But each house poses only a local take/skip choice whose best outcome depends on a couple of earlier answers, so DP collapses the search.\n\n" +
            "**Key Idea.** Let `dp[i]` be the most money robbable considering houses `0..i` (the best answer for the prefix ending at house `i`). At house `i` you either skip it — keeping `dp[i-1]` — or rob it, adding `nums[i]` to the best total that ended at `i-2` (the adjacent house `i-1` must be skipped). So `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[0] = nums[0]` (only one house); `dp[1] = max(nums[0], nums[1])` (can't take both adjacent, so take the richer).\n" +
            "2. Transition in words: for each house from index 2 onward, the best total is the larger of (skip this house, keep the previous best) and (rob this house plus the best total from two houses back).\n" +
            "3. Fill left to right; `dp[n-1]` is the answer.\n\n" +
            "**Why it works.** The two options — rob house `i` or not — are exhaustive and mutually exclusive. Robbing forces skipping `i-1`, so the compatible best is `dp[i-2]`; skipping inherits `dp[i-1]`. Taking the max is optimal by induction on the prefix length.\n\n" +
            "**Common Gotchas.**\n" +
            "- Handle `n == 1` (and technically empty input) before touching `dp[1]`.\n" +
            "- `dp[1]` is `max(nums[0], nums[1])`, not `nums[1]`.\n" +
            "- Adjacency is the only constraint — non-adjacent houses can always be combined freely.\n\n" +
            "**Space optimization.** `dp[i]` reads only `dp[i-1]` and `dp[i-2]`, so the array collapses to two rolling variables for `O(1)` space (the next approach).\n\n" +
            "**Complexity.** One pass → time `O(n)`; the `dp` array → space `O(n)`.\n\n" +
            "**Interview mindset.** 'Maximum sum where you cannot pick two adjacent items' is the signature House Robber pattern: a per-element take/skip decision resolved by `dp[i-1]` vs `dp[i-2] + value`.",
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
            "**What it asks.** The same maximum non-adjacent total, in constant extra space.\n\n" +
            "**Why the naive idea fails.** Keeping the full `dp` array wastes memory: in `dp[i] = max(dp[i-1], dp[i-2] + nums[i])` only the two most recent states are ever read.\n\n" +
            "**Key Idea.** Track just two scalars that roll forward: `prev` holds the best loot up to two houses back (`dp[i-2]`) and `curr` holds the best up to the previous house (`dp[i-1]`). Each element updates them with the same take/skip recurrence, so the whole array is never needed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case (rolled): start `prev = 0` and `curr = 0`; these zeros act as `dp[-2] = dp[-1] = 0` and cleanly handle tiny arrays with no special-casing.\n" +
            "2. Transition in words: for each house's value, the new best is the larger of the previous best (skip) and `prev + value` (rob this house plus the best from two back); then shift `prev` to the old `curr` and `curr` to the new best.\n" +
            "3. After the loop, `curr` holds `dp[n-1]`, the best for the whole street.\n\n" +
            "**Why it works.** It is the identical recurrence and pick/skip logic as the array version, computed in the same left-to-right order; the initial zeros make the first iteration yield `max(0, 0 + nums[0]) = nums[0]`, matching the base case.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do the shift as a single simultaneous assignment (`prev, curr = curr, max(curr, prev + num)`); updating `prev` first would corrupt the computation.\n" +
            "- Starting both at 0 is what removes the need to special-case length 1 — don't seed them with `nums` values.\n" +
            "- Return `curr`, not `prev`.\n\n" +
            "**Complexity.** One pass → time `O(n)`; two variables → space `O(1)`.\n\n" +
            "**Interview mindset.** Whenever `dp[i]` depends only on the last one or two states, mention the rolling-variable collapse to `O(1)` — it's the polished House Robber answer.",
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
            "**What it asks.** House Robber on a circle: houses are in a ring, so the first and last house are now adjacent and can't both be robbed.\n\n" +
            "**Why the naive idea fails.** You can't just run linear House Robber once — it would happily rob both ends, which the circular adjacency forbids. Patching that constraint into a single pass is awkward.\n\n" +
            "**Key Idea.** The only new constraint is 'not both house 0 and house n-1'. In any valid plan at least one of them is left out, which splits the problem into two ordinary (linear) House Robber problems: one on `nums[0 .. n-2]` (exclude the last house) and one on `nums[1 .. n-1]` (exclude the first house). The answer is the larger of the two, since every legal circular plan fits at least one window and neither window contains the forbidden adjacent pair.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Edge case: if there is only one house, return `nums[0]` directly (the split windows would be empty).\n" +
            "2. Run linear House Robber on the array with the last element dropped.\n" +
            "3. Run linear House Robber on the array with the first element dropped.\n" +
            "4. Each linear pass uses the `O(1)` rolling recurrence — best-so-far is `max(skip previous, rob this + best from two back)` — and the final answer is the max of the two passes.\n\n" +
            "**Why it works.** Every circular-legal selection must skip house 0, or skip house n-1, or both; each of those cases is exactly captured by one of the two linear windows, and within a window the ordinary non-adjacency rule is all that remains. Taking the max covers all cases without ever allowing both ends together.\n\n" +
            "**Common Gotchas.**\n" +
            "- Special-case length 1 before slicing, or an empty window misbehaves.\n" +
            "- Both windows exclude exactly one endpoint — don't accidentally drop an interior house.\n" +
            "- The two subproblems are independent; don't share rolling state between them.\n\n" +
            "**Space optimization.** Each linear pass is the `O(1)` rolling-variable House Robber, so the whole solution is two `O(n)` scans with constant memory.\n\n" +
            "**Complexity.** Two linear passes → time `O(n)`; rolling variables → space `O(1)`.\n\n" +
            "**Interview mindset.** A circular/wrap-around constraint on the endpoints → split into cases that each exclude one endpoint and reuse the simpler linear solution as a subroutine.",
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
            "**What it asks.** Count the distinct ways to group a digit string back into letter codes A=1..Z=26, where a leading zero (e.g. `06`) is not a valid code.\n\n" +
            "**Why the naive idea fails.** Recursively trying one-digit and two-digit splits at every position re-solves the same suffixes exponentially. Since each position's count depends only on the previous one or two, DP makes it linear.\n\n" +
            "**Key Idea.** Let `dp[i]` be the number of ways to decode the first `i` characters, `s[:i]`. Any decoding of `s[:i]` ends with a last code that is either one digit or two digits — disjoint, exhaustive cases — so `dp[i]` is the sum of the ways with each valid ending: `dp[i-1]` if the single digit `s[i-1]` is 1–9, plus `dp[i-2]` if the two-digit chunk `s[i-2:i]` is in 10–26. The answer is `dp[n]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[0] = 1` — the empty string has exactly one (empty) decoding, which anchors the recurrence; `dp[1] = 1` if `s[0] != '0'`, else `0` (a lone leading zero is undecodable).\n" +
            "2. Transition in words: for each position `i` from 2 to `n`, if the current single digit is not '0' add the ways for the string one shorter (`dp[i-1]`); if the current two-digit chunk is between 10 and 26 add the ways for the string two shorter (`dp[i-2]`).\n" +
            "3. Fill `dp[2..n]` left to right; each cell reads the previous two. Return `dp[n]`.\n\n" +
            "**Why it works.** The last code of any decoding is one or two digits, so summing the counts of both stripped-down strings counts every decoding exactly once. A '0' survives only inside '10' or '20'; otherwise it kills the single-digit branch and, if not preceded by a valid tens digit, forces `dp[i] = 0`. Induction from the base cases proves each cell.\n\n" +
            "**Common Gotchas.**\n" +
            "- A string starting with '0' has `dp[1] = 0` and decodes to 0 ways overall.\n" +
            "- The only zeros that decode are inside '10' and '20'; a stray '0' zeroes out its position.\n" +
            "- Two-digit codes are valid only in 10–26; '27'..'99' and anything below '10' don't count as a pair. (String comparison `'10' <= two <= '26'` orders identically to the numeric value.)\n\n" +
            "**Space optimization.** Only `dp[i-1]` and `dp[i-2]` are ever read, so this reduces to two rolling variables for `O(1)` space.\n\n" +
            "**Complexity.** One pass → time `O(n)`; the `dp` array → space `O(n)` (or `O(1)` rolled).\n\n" +
            "**Interview mindset.** 'Count the ways to parse a sequence where each unit is 1 or 2 tokens' is a Fibonacci-shaped count DP — but with validity guards (no leading zero, pair in range) gating each branch.",
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
            "**What it asks.** Find the largest sum among all contiguous, non-empty subarrays of `nums`.\n\n" +
            "**The idea, and why it's slow.** Fix each start index `i`, extend a running total across every end `j >= i`, and track the best sum seen — examining all `O(n^2)` contiguous subarrays. For `n = 10^5` that is billions of operations, because it recomputes overlapping sums from scratch instead of reusing the previous window's work.\n\n" +
            "**Key Idea.** There is no clever insight here — this is the exhaustive baseline. Its value is establishing correctness and the `O(n^2)` bar that Kadane's single-pass idea then beats.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `best` to `nums[0]` so all-negative arrays are handled.\n" +
            "2. For each start index `i`, reset a running total to 0.\n" +
            "3. For each end index `j` from `i` onward, add `nums[j]` to the total and update `best`.\n" +
            "4. Return `best` after all pairs are considered.\n\n" +
            "**Why it works.** Every contiguous subarray is generated exactly once by some `(i, j)` pair and its sum is tracked, so the maximum cannot be missed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Initialize `best` to `nums[0]`, not 0, or all-negative inputs wrongly return 0.\n" +
            "- Reset the running total at each new start `i`.\n" +
            "- The subarray must be non-empty — never consider the empty range.\n\n" +
            "**Complexity.** Two nested loops → time `O(n^2)`; a couple of scalars → space `O(1)`.\n\n" +
            "**Interview mindset.** State this only as the naive baseline; the redundant overlapping sums are exactly the signal to look for a single-pass 'best ending here' recurrence (Kadane).",
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
            "**What it asks.** The largest sum over all contiguous, non-empty subarrays, in one linear pass.\n\n" +
            "**Why the naive idea fails.** The `O(n^2)` brute force recomputes overlapping sums. The fix is to reuse the best subarray sum ending at the previous index when deciding the current one.\n\n" +
            "**Key Idea.** Let `current` be the maximum sum of a subarray ending exactly at the current index — the classic `dp[i]`, collapsed to a single variable because only the previous value is needed. A best subarray ending at `i` is either `nums[i]` started fresh or `nums[i]` appended to the best subarray ending at `i-1`, whichever is larger: `current = max(num, current + num)`. The overall answer is the running maximum of `current`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: `current = best = nums[0]` — the subarray ending at index 0 is just `nums[0]`.\n" +
            "2. Transition in words: for each later element, the best sum ending here is the larger of starting a new subarray at this element or extending the previous best-ending-here by this element.\n" +
            "3. After updating `current`, update `best = max(best, current)` so the high-water mark is never lost.\n" +
            "4. Return `best`.\n\n" +
            "**Why it works.** A max-sum subarray ending at `i` is either `nums[i]` alone or `nums[i]` glued to a max-sum subarray ending at `i-1`; extending a *negative* prefix can only hurt, so restarting is optimal exactly when `current + num < num`. Since every subarray ends somewhere, the running max of `current` over all `i` is the global maximum.\n\n" +
            "**Common Gotchas.**\n" +
            "- Seed both `current` and `best` with `nums[0]`, not 0, so all-negative arrays return the least-negative element.\n" +
            "- Update `best` every iteration, not just at the end.\n" +
            "- A running sum that turns negative should be dropped — carrying it forward only drags future sums down.\n\n" +
            "**Space optimization.** `dp[i]` needs only `dp[i-1]`, so it is already collapsed to the single scalar `current` — `O(1)` space.\n\n" +
            "**Complexity.** One pass → time `O(n)`; two scalars → space `O(1)`.\n\n" +
            "**Interview mindset.** 'Largest contiguous sum' is the textbook Kadane trigger: an extend-or-restart decision on a single 'best ending here' variable.",
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
            "**What it asks.** Find the largest product among all contiguous, non-empty subarrays of `nums`.\n\n" +
            "**Why the naive idea fails.** Plain Kadane on products breaks: for sums a negative prefix is always bad, but for products a very *negative* running product is valuable, since one more negative number flips it to a large positive. Tracking only the maximum throws away that information.\n\n" +
            "**Key Idea.** At each index keep TWO states: `cur_max` = the largest product of a subarray ending here, and `cur_min` = the smallest (most negative) product ending here. When the current number is negative, multiplying flips signs, so the previous *min* can become the new *max* and vice versa — carrying both is what handles sign flips.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: `best = cur_max = cur_min = nums[0]`.\n" +
            "2. Transition in words: for each later `num`, the product ending here is `num` alone (restart), `num * cur_max`, or `num * cur_min`; the new `cur_max` is the largest of these three and the new `cur_min` is the smallest.\n" +
            "3. Compute both new values from the SAME old `cur_max`/`cur_min` before overwriting either (evaluate the three candidates first).\n" +
            "4. Update `best = max(best, cur_max)` each step; return `best`.\n\n" +
            "**Why it works.** Every subarray ending at `i` extends one ending at `i-1` or restarts, and the extreme products of the extended subarray can only come from multiplying `num` into the previous extremes or starting fresh. Considering all three candidates for both min and max captures every sign flip; restarting at `num` also resets cleanly after a zero, since a product-subarray cannot span a zero.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compute the candidates before overwriting `cur_max`; using the just-updated `cur_max` to compute `cur_min` is a classic bug.\n" +
            "- Initialize everything to `nums[0]`, not 0 or 1 — the min matters precisely because of negatives.\n" +
            "- Zeros reset both extremes; the 'restart at `num`' candidate handles them for free.\n\n" +
            "**Space optimization.** Two rolling scalars replace any array — `O(1)` space.\n\n" +
            "**Complexity.** One pass → time `O(n)`; a few scalars → space `O(1)`.\n\n" +
            "**Interview mindset.** 'Largest product of a contiguous subarray' means sign flips matter, so track BOTH the running min and max — the minimum is a candidate future maximum.",
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
            "**What it asks.** Count every contiguous substring of `s` that reads the same forwards and backwards (substrings at different positions count separately).\n\n" +
            "**Why the naive idea fails.** Checking all `O(n^2)` substrings and verifying each in `O(n)` is `O(n^3)` — it repeats work because a longer palindrome contains shorter ones with the same center.\n\n" +
            "**Key Idea.** Every palindrome is symmetric around a center, so instead of testing arbitrary substrings, grow outward from each possible center: matching characters on both sides extend the palindrome, a mismatch stops it. A palindrome of odd length has a single-character center (index `i`); an even-length one has a center *between* two characters (`i` and `i+1`) — giving `2n - 1` centers total.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a running `count`.\n" +
            "2. For each index, run an expansion for the odd center `(i, i)` and another for the even center `(i, i+1)`.\n" +
            "3. In each expansion, while `left >= 0`, `right < n`, and `s[left] == s[right]`, count one more palindrome and step `left` down and `right` up.\n" +
            "4. Sum the counts from all centers and return the total.\n\n" +
            "**Why it works.** Every palindromic substring is uniquely identified by its center and radius; center expansion visits each (center, radius) exactly once and counts exactly the palindromes centered there, so summing over all centers counts every palindrome once and none twice.\n\n" +
            "**Common Gotchas.**\n" +
            "- Remember BOTH center kinds — odd (single index) and even (between two indices); missing the even centers undercounts.\n" +
            "- Bound-check `left >= 0` and `right < n` before comparing characters.\n" +
            "- Each successful expansion step is its own palindrome — count per step, not once per center.\n\n" +
            "**Complexity.** `2n - 1` centers, each expanding up to `O(n)` → time `O(n^2)`; only two pointers and a counter → space `O(1)`. (A 2-D `dp[i][j]` = 'is s[i..j] a palindrome' table also works but costs `O(n^2)` space.)\n\n" +
            "**Interview mindset.** 'Count or find palindromic substrings' → expand around center; symmetry around a center beats brute-force substring checking.",
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
            "**What it asks.** Return a longest contiguous substring of `s` that reads the same both ways (any one, if several tie).\n\n" +
            "**Why the naive idea fails.** Testing every substring for palindromeness is `O(n^3)` and wastefully rechecks nested palindromes that share a center.\n\n" +
            "**Key Idea.** A palindrome is symmetric around its center, so grow outward from each center and remember the longest span found. Odd-length palindromes center on a character, even-length ones between two characters — try both for every position (`2n - 1` centers). Tracking `(start, end)` bounds avoids rebuilding strings while comparing lengths.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep best bounds `start`, `end` (initially the first character).\n" +
            "2. For each index, expand the odd center `(i, i)` and the even center `(i, i+1)`.\n" +
            "3. In an expansion, step `left` down and `right` up while `left >= 0`, `right < n`, and `s[left] == s[right]`; when it stops, the widest palindrome is the inclusive range `[left+1, right-1]` (the pointers overshoot by one on each side).\n" +
            "4. If a returned span is longer than the current best, update `start` and `end`; finally return the substring between them.\n\n" +
            "**Why it works.** Every palindrome corresponds to exactly one center; expanding each center yields the maximal palindrome around it, so the longest across all centers is the global longest.\n\n" +
            "**Common Gotchas.**\n" +
            "- On exit the palindrome is `s[left+1 : right]` — forgetting to step back the overshoot gives wrong bounds.\n" +
            "- Handle both odd `(i, i)` and even `(i, i+1)` centers, or you miss even-length answers like 'bb'.\n" +
            "- Compare spans by length and track bounds rather than slicing repeatedly.\n\n" +
            "**Complexity.** `2n - 1` centers × up to `O(n)` expansion → time `O(n^2)`; a few index variables → space `O(1)`. (A 2-D `dp[i][j]` palindrome table also solves it but costs `O(n^2)` space; Manacher's reaches `O(n)` time but is rarely required.)\n\n" +
            "**Interview mindset.** 'Longest palindromic substring' → expand around center, handling odd and even centers and tracking `(start, end)`; mention Manacher's `O(n)` only if pushed.",
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
