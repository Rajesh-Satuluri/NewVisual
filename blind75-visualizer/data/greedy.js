/*
 * Blind 75 — Greedy
 * =========================================================================
 * Registers the Greedy category problems on the global registry.
 * Format reference: data/arrays_hashing.js
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Greedy", [
    {
      id: "best-time-to-buy-and-sell-stock",
      lc: 121,
      title: "Best Time to Buy and Sell Stock",
      difficulty: "Easy",
      category: "Greedy",
      link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
      meta: { pattern: "Running Minimum", dataStructure: "Array", technique: "Single pass tracking" },
      description:
        "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`.\n\n" +
        "You may choose **one** day to buy and a **later** day to sell. Return the **maximum profit** you can achieve from that single transaction. If no profitable transaction is possible, return `0`.",
      constraints: [
        "`1 <= prices.length <= 10^5`",
        "`0 <= prices[i] <= 10^4`"
      ],
      notes: [
        "You must buy **before** you sell — the sell day index must be strictly greater than the buy day index.",
        "Exactly one buy and one sell are allowed (a single transaction); you cannot re-buy.",
        "If prices only ever fall, the best you can do is not trade, so the answer is `0`."
      ],
      examples: [
        {
          input: "prices = [7, 1, 5, 3, 6, 4]",
          output: "5",
          reasoning: "Buy on day 1 at price 1, sell on day 4 at price 6, for a profit of 6 - 1 = 5. You cannot buy at 1 and sell at 6 in the reverse order.",
          visual:
            "```\nday    :  0   1   2   3   4   5\nprice  :  7   1   5   3   6   4\n              buy         sell\n              (1)          (6)     profit = 6 - 1 = 5\nmin so far: 7   1   1   1   1   1\n```"
        },
        {
          input: "prices = [7, 6, 4, 3, 1]",
          output: "0",
          reasoning: "Prices only decrease, so every sell day is cheaper than the buy day before it. No profitable trade exists, so return 0."
        },
        {
          input: "prices = [2, 4, 1]",
          output: "2",
          reasoning: "Buy at 2, sell at 4 for profit 2. The later dip to 1 is a cheaper buy but there is no future day to sell into, so it does not help."
        },
        {
          input: "prices = [3, 3, 3]",
          output: "0",
          reasoning: "Flat prices mean buy and sell prices are equal; the best profit is 0."
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "Only to state the naive idea before optimizing; too slow for n up to 10^5.",
          logic:
            "**A. What is being asked?** Pick a buy day `i` and a strictly later sell day `j > i` that maximize `prices[j] - prices[i]`, or `0` if no positive difference exists.\n\n" +
            "**B. Brute force idea.** Try every ordered pair `(i, j)` with `i < j`. For each buy day, scan every later sell day and track the largest `prices[j] - prices[i]` seen.\n\n" +
            "**C. Why it is slow.** There are about `n^2 / 2` pairs. For `n = 10^5` that is ~5 billion checks — far too slow. It repeats work: for each buy day it re-scans the entire suffix even though the profitable information is highly shared across buy days.\n\n" +
            "**I. Step by step.** Keep `best = 0`. Outer loop fixes the buy day; inner loop tries every later sell day; whenever `prices[j] - prices[i] > best`, update `best`.\n\n" +
            "**J. Why correct.** Every valid (buy, sell) ordering is examined exactly once, so the optimum cannot be missed. Initializing `best` to `0` encodes the 'do nothing' option.\n\n" +
            "**K/L. Complexity.** Time `O(n^2)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        best = 0                              # Best profit found; 0 covers 'don't trade'.\n" +
            "        n = len(prices)\n" +
            "        for i in range(n):                    # Fix the buy day.\n" +
            "            for j in range(i + 1, n):         # Only sell on a strictly later day.\n" +
            "                profit = prices[j] - prices[i]  # Profit for this buy/sell pair.\n" +
            "                if profit > best:             # Keep the largest profit seen.\n" +
            "                    best = profit\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        best = 0\n" +
            "        n = len(prices)\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                profit = prices[j] - prices[i]\n" +
            "                if profit > best:\n" +
            "                    best = profit\n" +
            "        return best"
        },
        {
          name: "Optimized — One Pass (min price so far)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer whenever you want the best single buy-then-sell profit in one scan.",
          logic:
            "**D. Key observation (the greedy insight).** On any given sell day `j`, the best possible profit ending there is `prices[j] - (cheapest price on any day before j)`. So the only thing worth remembering as we move right is the **minimum price seen so far**. We never need the full history — just that one number.\n\n" +
            "**E. Pattern / data structure.** Single left-to-right pass carrying two scalars: `min_price` (best buy point so far) and `best` (best profit so far). No extra array needed.\n\n" +
            "**F. Why the greedy choice is safe (exchange argument).** Consider any optimal solution that buys on day `b` and sells on day `s`. Let `m` be the day of the minimum price in `prices[0..s-1]`. Since `prices[m] <= prices[b]`, replacing the buy day `b` with `m` can only *increase* profit (`prices[s] - prices[m] >= prices[s] - prices[b]`) and keeps `m < s`. So there is always an optimal solution that buys at the running minimum before the sell day. That is exactly what tracking `min_price` does — for each candidate sell day it pairs it with the cheapest prior buy, which is never worse than any other choice. The greedy 'always buy at the min so far' therefore loses nothing.\n\n" +
            "**G/H. What we store.** `min_price` = smallest price among all days processed so far (the best day to have bought). `best` = maximum of `price - min_price` over all sell days considered.\n\n" +
            "**I. Step by step.** Walk the prices. For each `price`: first update the best profit as `max(best, price - min_price)` (selling today against the cheapest prior buy), then update `min_price = min(min_price, price)` so future days can buy today if it is the new low. Order matters conceptually but either order works because you cannot buy and sell the same slot for positive profit (`price - price = 0`).\n\n" +
            "**J. Why correct.** By the exchange argument every sell day is evaluated against its optimal buy day (the running minimum), and we take the max over all sell days — which is the global optimum. Initializing `best = 0` guarantees a non-negative answer.\n\n" +
            "**K/L. Complexity.** One pass, `O(n)` time; two scalars, `O(1)` space.\n\n" +
            "**M. Interview mindset.** 'Best single transaction / max difference where the smaller value must come first' is the signal to track a running minimum and a running best answer in one sweep.",
          rcs:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        min_price = float('inf')              # Cheapest buy price seen so far.\n" +
            "        best = 0                              # Max profit so far; 0 = don't trade.\n" +
            "        for price in prices:                  # Treat each day as a candidate sell day.\n" +
            "            best = max(best, price - min_price)  # Sell today vs. cheapest prior buy.\n" +
            "            min_price = min(min_price, price)    # Update the best buy point for later days.\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        min_price = float('inf')\n" +
            "        best = 0\n" +
            "        for price in prices:\n" +
            "            best = max(best, price - min_price)\n" +
            "            min_price = min(min_price, price)\n" +
            "        return best"
        }
      ],
      patternRecognition: [
        "'Maximum difference where the smaller element must appear before the larger one.'",
        "Single buy/sell (one transaction) over a time series → track running minimum.",
        "You catch yourself writing a nested loop over pairs to maximize a later-minus-earlier value."
      ],
      interviewRecall: [
        "Carry two scalars: min price so far and best profit so far, in one pass.",
        "Update best (sell today) against the cheapest prior buy, then update the min.",
        "Initialize best to 0 so a purely decreasing series returns 0 (don't trade)."
      ]
    },

    {
      id: "jump-game",
      lc: 55,
      title: "Jump Game",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/jump-game/",
      meta: { pattern: "Farthest Reach", dataStructure: "Array", technique: "Greedy reachability" },
      description:
        "You are given an integer array `nums`. You start at index `0`, and each `nums[i]` is the **maximum** jump length you can take from index `i` (you may jump any distance from `0` up to `nums[i]`).\n\n" +
        "Return `true` if you can reach the **last index**, and `false` otherwise.",
      constraints: [
        "`1 <= nums.length <= 10^4`",
        "`0 <= nums[i] <= 10^5`"
      ],
      notes: [
        "A single-element array is trivially reachable — you are already at the last index.",
        "A `0` is only fatal if you cannot 'jump over' it — i.e. no earlier index reaches past it.",
        "`nums[i]` is a maximum, so from index `i` you can land anywhere in `[i+1, i+nums[i]]`."
      ],
      examples: [
        {
          input: "nums = [2, 3, 1, 1, 4]",
          output: "true",
          reasoning: "From index 0 (jump up to 2) reach index 1; from index 1 (jump up to 3) reach the last index 4. Many paths work; one is enough.",
          visual:
            "```\nindex :  0   1   2   3   4\nvalue :  2   3   1   1   4\nreach :  2   4   4   4   4   <- farthest reachable index so far\n         start ...................... last (4 <= 4) OK\n```"
        },
        {
          input: "nums = [3, 2, 1, 0, 4]",
          output: "false",
          reasoning: "The best reach from indices 0..2 is index 3. Index 3 holds 0, so it cannot advance, and nothing reaches index 4. The farthest reachable index gets stuck at 3.",
          visual:
            "```\nindex :  0   1   2   3   4\nvalue :  3   2   1   0   4\nreach :  3   3   3   3   x   <- stuck at 3; index 4 unreachable\n                     ^ value 0, cannot move; 3 < 4\n```"
        },
        {
          input: "nums = [0]",
          output: "true",
          reasoning: "You start already on the last (and only) index, so no jump is needed."
        },
        {
          input: "nums = [2, 0, 0]",
          output: "true",
          reasoning: "Index 0 can jump up to 2, landing directly on the last index, skipping over the zeros."
        }
      ],
      approaches: [
        {
          name: "Naive — Backtracking / DP",
          time: "O(n^2) (memoized) / exponential (pure backtracking)",
          space: "O(n)",
          whenToUse: "To illustrate the search view before recognizing the greedy shortcut; too slow at the naive extreme.",
          logic:
            "**A. What is being asked?** Decide whether some sequence of jumps from index `0` lands on the last index.\n\n" +
            "**B. Naive idea.** Model it as a search: from index `i` you may move to any `i+1 .. i+nums[i]`. Recurse from each choice; a position is 'good' if it is the last index or if any reachable next position is 'good'. Pure recursion re-explores the same indices exponentially.\n\n" +
            "**C. Why it is slow.** Overlapping subproblems: the same index is asked 'can you reach the end?' many times. Memoizing each index as GOOD/BAD collapses it to `O(n^2)` (each index scans up to `n` next positions), but even that is wasteful compared to the greedy `O(n)`.\n\n" +
            "**I. Step by step (memoized).** Cache `can_reach[i]`. `can_reach[i]` is true if `i` is the last index, or if any `j` in `[i+1, i+nums[i]]` has `can_reach[j]` true. Compute from the right so each lookup is ready.\n\n" +
            "**J. Why correct.** It literally enumerates reachability via the transition, so it cannot be wrong; memoization only removes repeated work.\n\n" +
            "**K/L. Complexity.** Time `O(n^2)`, space `O(n)` for the cache.",
          rcs:
            "class Solution:\n" +
            "    def canJump(self, nums: List[int]) -> bool:\n" +
            "        n = len(nums)\n" +
            "        # can_reach[i] = True if the last index is reachable from i.\n" +
            "        can_reach = [False] * n\n" +
            "        can_reach[n - 1] = True               # The goal reaches itself.\n" +
            "        for i in range(n - 2, -1, -1):        # Fill from right to left.\n" +
            "            farthest = min(i + nums[i], n - 1)  # Highest index reachable from i.\n" +
            "            for j in range(i + 1, farthest + 1):  # Any good landing spot suffices.\n" +
            "                if can_reach[j]:\n" +
            "                    can_reach[i] = True\n" +
            "                    break\n" +
            "        return can_reach[0]",
          plain:
            "class Solution:\n" +
            "    def canJump(self, nums: List[int]) -> bool:\n" +
            "        n = len(nums)\n" +
            "        can_reach = [False] * n\n" +
            "        can_reach[n - 1] = True\n" +
            "        for i in range(n - 2, -1, -1):\n" +
            "            farthest = min(i + nums[i], n - 1)\n" +
            "            for j in range(i + 1, farthest + 1):\n" +
            "                if can_reach[j]:\n" +
            "                    can_reach[i] = True\n" +
            "                    break\n" +
            "        return can_reach[0]"
        },
        {
          name: "Optimized — Greedy Farthest Reach",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer: reachability with 'max jump' values — track the farthest index you can get to.",
          logic:
            "**D. Key observation (the greedy insight).** You do not need to know *which* path reaches the end — only how far you can possibly get. As you scan left to right, maintain `farthest`, the maximum index reachable using everything seen so far. At index `i`, you can extend the horizon to `i + nums[i]`.\n\n" +
            "**E. Pattern / data structure.** One scalar, `farthest`. Single pass. This is the canonical 'greedy reachability / farthest reach' pattern.\n\n" +
            "**F. Why the greedy choice is safe (invariant argument).** Invariant: after processing indices `0..i`, `farthest` equals the largest index reachable from the start. The key subtlety is that if index `i` is itself reachable (`i <= farthest`), then *every* index in `[i+1, i+nums[i]]` is reachable too — because reachability is 'downward closed': if you can land on `i`, you can also land on any nearer index and step from `i` to anywhere up to `i+nums[i]`. So folding `max(farthest, i + nums[i])` in at each reachable `i` never overstates reach, and taking the maximum never understates it. There is no path the greedy could miss, because a longer reach can only ever help. Conversely, once `i > farthest`, index `i` is unreachable, so nothing beyond it can be reached either — we can stop and return `false`.\n\n" +
            "**G/H. What we store.** `farthest` = the rightmost index currently reachable from index 0.\n\n" +
            "**I. Step by step.** Start `farthest = 0`. For each index `i`: if `i > farthest`, index `i` is unreachable → return `false`. Otherwise update `farthest = max(farthest, i + nums[i])`. If `farthest >= n - 1` at any point, the last index is reachable → return `true`. If the loop finishes, return `true`.\n\n" +
            "**J. Why correct.** The invariant guarantees `farthest` is always exactly the true reachable frontier. Reaching or passing the last index means success; getting stuck (`i > farthest`) means the frontier can never advance again.\n\n" +
            "**K/L. Complexity.** One pass, `O(n)` time; a single scalar, `O(1)` space.\n\n" +
            "**M. Interview mindset.** 'Can I reach the end with max-length steps?' → forget explicit paths, just carry the farthest reachable index and check whether the frontier stalls before an index.",
          rcs:
            "class Solution:\n" +
            "    def canJump(self, nums: List[int]) -> bool:\n" +
            "        farthest = 0                          # Rightmost index reachable so far.\n" +
            "        n = len(nums)\n" +
            "        for i in range(n):\n" +
            "            if i > farthest:                  # This index is beyond the frontier: stuck.\n" +
            "                return False\n" +
            "            farthest = max(farthest, i + nums[i])  # Extend the frontier from i.\n" +
            "            if farthest >= n - 1:             # Last index is within reach: done.\n" +
            "                return True\n" +
            "        return True                           # Reached here => start was the last index.",
          plain:
            "class Solution:\n" +
            "    def canJump(self, nums: List[int]) -> bool:\n" +
            "        farthest = 0\n" +
            "        n = len(nums)\n" +
            "        for i in range(n):\n" +
            "            if i > farthest:\n" +
            "                return False\n" +
            "            farthest = max(farthest, i + nums[i])\n" +
            "            if farthest >= n - 1:\n" +
            "                return True\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'Max jump length at each index, can you reach the end?' → greedy farthest reach.",
        "You only care whether the end is reachable, not the exact path taken.",
        "A stalled frontier (current index passes the farthest reachable) means failure."
      ],
      interviewRecall: [
        "Track a single 'farthest' scalar; fail the moment i > farthest.",
        "Reachability is downward-closed: reaching i means reaching all of i+1..i+nums[i].",
        "Return true as soon as farthest >= n-1; no need to finish the loop."
      ]
    },

    {
      id: "jump-game-ii",
      lc: 45,
      title: "Jump Game II",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/jump-game-ii/",
      meta: { pattern: "Greedy BFS Levels", dataStructure: "Array", technique: "Reachability windows" },
      description:
        "You are given a 0-indexed integer array `nums` of length `n`. You start at index `0`, and each `nums[i]` is the **maximum** jump length from index `i`.\n\n" +
        "It is guaranteed that you can reach the last index. Return the **minimum number of jumps** needed to get from index `0` to index `n - 1`.",
      constraints: [
        "`1 <= nums.length <= 10^4`",
        "`0 <= nums[i] <= 1000`",
        "It is guaranteed that you can reach `nums[n - 1]`."
      ],
      notes: [
        "If you are already at the last index (length 1), the answer is `0` jumps.",
        "From index `i` you may land on any index in `[i+1, i+nums[i]]` at the cost of one jump.",
        "The reachability is guaranteed, so you never have to handle the 'impossible' case."
      ],
      examples: [
        {
          input: "nums = [2, 3, 1, 1, 4]",
          output: "2",
          reasoning: "Jump from index 0 to index 1 (one jump), then from index 1 straight to the last index 4 (second jump). Two jumps is optimal; you cannot do it in one.",
          visual:
            "```\nindex :  0   1   2   3   4\nvalue :  2   3   1   1   4\n\nlevel 0: [0]            reach up to index 2\nlevel 1: [1,2]         reach up to index 4  (1 -> 4)\nlevel 2: [3,4]         last index found -> 2 jumps\n```"
        },
        {
          input: "nums = [2, 3, 0, 1, 4]",
          output: "2",
          reasoning: "Index 0 -> index 1 -> index 4. The zero at index 2 is simply avoided by jumping farther from index 1."
        },
        {
          input: "nums = [1, 1, 1, 1]",
          output: "3",
          reasoning: "Each index can only step one forward, so it takes 3 jumps: 0->1->2->3."
        },
        {
          input: "nums = [0]",
          output: "0",
          reasoning: "Already at the last index; no jumps are required."
        }
      ],
      approaches: [
        {
          name: "Optimized — Greedy BFS Level Expansion",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer for 'minimum jumps to reach the end' with max-length steps.",
          logic:
            "**A. What is being asked?** The *fewest* jumps to go from index 0 to the last index, where each `nums[i]` is a maximum step length.\n\n" +
            "**B. Naive idea.** A DP where `dp[i]` = min jumps to reach `i`, filling each index from all its predecessors, is `O(n^2)`. Plain BFS over indices also works but managing a queue is unnecessary here.\n\n" +
            "**D. Key observation (the greedy / BFS-levels insight).** Think of it as breadth-first search where a 'level' is the set of indices reachable in exactly `k` jumps. Level 0 is just index 0. From all indices in the current level, the next level covers `[current_end + 1 .. farthest]`, where `farthest` is the maximum `i + nums[i]` over the current level. Every time you exhaust the current level's window, you have spent one more jump.\n\n" +
            "**E. Pattern / data structure.** Implicit BFS with two scalars instead of a queue: `current_end` (right boundary of the current jump level) and `farthest` (the best index reachable while scanning within this level).\n\n" +
            "**F. Why the greedy choice is safe (BFS optimality).** BFS explores indices in nondecreasing order of jump count, so the first time an index enters a level is via the minimum number of jumps — identical to why BFS finds shortest paths in an unweighted graph. We do not need to know *which* index inside the current window we jumped from; because reachability is downward-closed, from somewhere in the current level we can reach every index up to `farthest`. Committing a jump exactly when we hit `current_end` and resetting the window to `farthest` therefore counts the minimum number of levels crossed. Greedily maximizing `farthest` within a level can never require more jumps than any other choice, since a farther frontier only ever includes more of the next indices.\n\n" +
            "**G/H. What we store.** `jumps` = levels crossed so far. `current_end` = the last index reachable with the jumps counted so far. `farthest` = the farthest index reachable if we take one more jump from anywhere in the current window.\n\n" +
            "**I. Step by step.** Scan `i` from `0` to `n - 2` (we never need to jump *from* the last index). At each `i` extend `farthest = max(farthest, i + nums[i])`. When `i == current_end`, we have consumed the current level's window, so increment `jumps` and set `current_end = farthest`. When `current_end >= n - 1`, we can stop — the last index is inside the newest window. Stopping the loop at `n - 2` also prevents an extra phantom jump if `current_end` lands exactly on the last index.\n\n" +
            "**J. Why correct.** `jumps` increments once per BFS level, and BFS levels correspond to exact jump counts; the first level whose window covers `n - 1` is the minimum. The guarantee that the end is reachable means `farthest` always advances past `current_end` before we get stuck.\n\n" +
            "**K/L. Complexity.** One pass, `O(n)` time; three scalars, `O(1)` space.\n\n" +
            "**M. Interview mindset.** 'Minimum steps / jumps to the end' with max-length moves is greedy-BFS: expand a window level by level, count a jump each time you reach the current window's edge.",
          rcs:
            "class Solution:\n" +
            "    def jump(self, nums: List[int]) -> int:\n" +
            "        jumps = 0                             # Number of jumps (BFS levels) taken.\n" +
            "        current_end = 0                       # Right edge of the current jump's window.\n" +
            "        farthest = 0                          # Farthest index reachable with one more jump.\n" +
            "        n = len(nums)\n" +
            "        for i in range(n - 1):                # Never need to jump FROM the last index.\n" +
            "            farthest = max(farthest, i + nums[i])  # Extend next level's frontier.\n" +
            "            if i == current_end:              # Reached the edge of the current level.\n" +
            "                jumps += 1                    # Commit one jump to open the next level.\n" +
            "                current_end = farthest        # New window spans up to 'farthest'.\n" +
            "                if current_end >= n - 1:      # Last index now inside the window: done.\n" +
            "                    break\n" +
            "        return jumps",
          plain:
            "class Solution:\n" +
            "    def jump(self, nums: List[int]) -> int:\n" +
            "        jumps = 0\n" +
            "        current_end = 0\n" +
            "        farthest = 0\n" +
            "        n = len(nums)\n" +
            "        for i in range(n - 1):\n" +
            "            farthest = max(farthest, i + nums[i])\n" +
            "            if i == current_end:\n" +
            "                jumps += 1\n" +
            "                current_end = farthest\n" +
            "                if current_end >= n - 1:\n" +
            "                    break\n" +
            "        return jumps"
        }
      ],
      patternRecognition: [
        "'Minimum number of jumps/steps to reach the end' with max-length moves → greedy BFS levels.",
        "You want a shortest-path count in an unweighted implicit graph → BFS, but windows replace the queue.",
        "Each 'level' is the set of indices reachable in one more jump than the last."
      ],
      interviewRecall: [
        "Two boundaries: current_end (this level's edge) and farthest (next level's reach).",
        "Increment jumps exactly when i reaches current_end, then jump the window to farthest.",
        "Loop only to n-2 so you never count a phantom jump from the last index."
      ]
    }
  ]);
})();
