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
            "**What it asks.** Choose one buy day `i` and a strictly later sell day `j > i` that maximize `prices[j] - prices[i]`, returning `0` if no positive difference exists.\n\n" +
            "**Why the naive idea fails.** The brute-force idea is to try every ordered pair `(i, j)` with `i < j`: for each buy day, scan every later sell day and keep the largest `prices[j] - prices[i]`. There are about `n^2 / 2` such pairs — for `n = 10^5` that is roughly 5 billion checks, far too slow. It also repeats work, re-scanning the whole suffix for each buy day even though the useful information is shared across them.\n\n" +
            "**Key Idea.** There is no shortcut inside the brute force itself; the only insight here is that every valid (buy, sell) ordering must be considered, and initializing the best profit to `0` bakes in the 'do nothing' option so a purely falling market yields `0`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep `best = 0`, representing the maximum profit found (and the 'no trade' floor).\n" +
            "2. Outer loop fixes the buy day `i`.\n" +
            "3. Inner loop tries every later sell day `j > i`.\n" +
            "4. Whenever `prices[j] - prices[i] > best`, update `best`.\n" +
            "5. After all pairs, return `best`.\n\n" +
            "**Why it works.** Every valid buy-before-sell ordering is examined exactly once, so the true optimum cannot be skipped. Because `best` starts at `0`, if no pair gives a positive profit the answer stays `0`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The sell index must be strictly greater than the buy index — never allow `j <= i` (you cannot sell before you buy).\n" +
            "- Do not initialize `best` to a negative number or the first price difference; `0` must remain the floor so a decreasing series returns `0`.\n\n" +
            "**Complexity.** Time `O(n^2)` from the nested loops over all pairs; space `O(1)` since only a running `best` is stored.\n\n" +
            "**Interview mindset.** State this only to frame the problem — the moment you write a nested loop over pairs to maximize a later-minus-earlier value, that is the signal to look for a single-pass improvement.",
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
            "**What it asks.** Find the maximum profit from a single buy-then-later-sell over the price series, in one efficient pass instead of checking all pairs.\n\n" +
            "**Why the naive idea fails.** Comparing every (buy, sell) pair is `O(n^2)` — about 5 billion operations at `n = 10^5`. It re-scans the suffix for each buy day even though the only thing that governs the best profit at a sell day is one number: the cheapest price before it.\n\n" +
            "**Key Idea.** On any given sell day `j`, the best possible profit ending there is `prices[j] - (cheapest price on any day before j)`. So the only thing worth remembering as we move right is the **minimum price seen so far** — never the full history, just that one scalar. Carry `min_price` (best buy point so far) and `best` (best profit so far) in a single left-to-right sweep, no extra array needed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `min_price` to infinity (no buy seen yet) and `best = 0` (the 'don't trade' floor).\n" +
            "2. Walk the prices, treating each `price` as a candidate sell day.\n" +
            "3. First update `best = max(best, price - min_price)` — selling today against the cheapest prior buy.\n" +
            "4. Then update `min_price = min(min_price, price)` so later days can buy today if it is a new low.\n" +
            "5. After the pass, return `best`.\n\n" +
            "**Why it works.** The greedy choice is 'always buy at the minimum price seen so far,' and an exchange argument shows this is safe. Consider any optimal solution that buys on day `b` and sells on day `s`. Let `m` be the day of the minimum price in `prices[0..s-1]`. Since `prices[m] <= prices[b]`, swapping the buy from `b` to `m` can only *increase* profit (`prices[s] - prices[m] >= prices[s] - prices[b]`) while keeping `m < s`. So some optimal solution always buys at the running minimum before the sell day — exactly what tracking `min_price` does. Because we evaluate every sell day against its best-possible buy and take the max over all of them, the result is the global optimum; starting `best` at `0` keeps the answer non-negative.\n\n" +
            "**Common Gotchas.**\n" +
            "- Update `best` using the *prior* `min_price` before folding today's price into `min_price`; the two-line order avoids ever pairing a day with itself (`price - price = 0` is harmless but the intent is buy-before-sell).\n" +
            "- Initialize `best` to `0`, not to a negative sentinel, so a strictly decreasing series correctly returns `0`.\n" +
            "- A single-day array yields `0` — the loop runs once and no profitable sell exists.\n\n" +
            "**Complexity.** Time `O(n)` — one pass; space `O(1)` — just the two scalars `min_price` and `best`.\n\n" +
            "**Interview mindset.** 'Best single transaction / maximum difference where the smaller value must come first' is the signal to track a running minimum and a running best answer in one sweep.",
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
            "**What it asks.** Decide whether some sequence of jumps starting at index `0` can land exactly on the last index, given each `nums[i]` is a maximum step length.\n\n" +
            "**Why the naive idea fails.** Model it as a search: from index `i` you may move to any of `i+1 .. i+nums[i]`, and an index is 'good' if it is the last index or if any position it can reach is 'good'. Pure recursion re-explores the same indices exponentially, because the same index is asked 'can you reach the end?' over and over. Memoizing each index as good/bad collapses this to `O(n^2)`, but that is still wasteful compared to the greedy `O(n)`.\n\n" +
            "**Key Idea.** Reachability of the end is a recursive property with heavily overlapping subproblems, so caching each index's answer removes the exponential blowup. Define `can_reach[i]` = whether the last index is reachable from index `i`; the whole answer is `can_reach[0]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Allocate a boolean array `can_reach` of length `n`, all false.\n" +
            "2. Set `can_reach[n-1] = true` — the goal trivially reaches itself.\n" +
            "3. Fill from right to left: for each index `i`, compute `farthest = min(i + nums[i], n - 1)`.\n" +
            "4. Scan `j` from `i+1` to `farthest`; if any `can_reach[j]` is true, mark `can_reach[i] = true` and stop.\n" +
            "5. Return `can_reach[0]`.\n\n" +
            "**Why it works.** The recurrence directly encodes the definition of reachability: `i` reaches the end iff it is the end or some landing spot `j` reaches the end. Computing right to left guarantees every `can_reach[j]` needed by `i` is already final, so by induction each entry is correct. Memoization changes only the running time, not the answer.\n\n" +
            "**Common Gotchas.**\n" +
            "- Clamp the landing range with `min(i + nums[i], n - 1)` so you never index past the array.\n" +
            "- A `0` value at index `i` gives an empty landing range, correctly leaving `can_reach[i]` false unless `i` is the last index.\n" +
            "- Must fill from the right; scanning left to right would read `can_reach[j]` entries that are not yet computed.\n\n" +
            "**Complexity.** Time `O(n^2)` — each of `n` indices may scan up to `n` successors; space `O(n)` for the cache.\n\n" +
            "**Interview mindset.** Reaching this DP is a good first step, but 'each value is a *maximum* reach' is the hint that a single farthest-reach scalar can replace the whole table — recognize that to jump to the `O(n)` greedy.",
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
            "**What it asks.** Return whether the last index is reachable from index `0`, given each `nums[i]` is a maximum jump length.\n\n" +
            "**Why the naive idea fails.** Searching over concrete jump sequences (backtracking, or even the `O(n^2)` reachability DP) tracks *which* paths reach the end — far more information than the yes/no question needs, and too slow at `n = 10^4` in the exponential form.\n\n" +
            "**Key Idea.** You do not need to know which path reaches the end — only how far you can possibly get. Scanning left to right, maintain one scalar `farthest`, the maximum index reachable using everything seen so far; at each reachable index `i` you can extend the horizon to `i + nums[i]`. This is the canonical 'greedy farthest reach' pattern, one pass and `O(1)` space.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `farthest = 0` — index `0` is where you stand.\n" +
            "2. For each index `i` from `0`: if `i > farthest`, index `i` lies beyond the frontier and is unreachable, so return `false`.\n" +
            "3. Otherwise fold in `farthest = max(farthest, i + nums[i])`.\n" +
            "4. If `farthest >= n - 1` at any point, the last index is within reach, so return `true`.\n" +
            "5. If the loop finishes without stalling, return `true`.\n\n" +
            "**Why it works.** The loop maintains the invariant that after processing indices `0..i`, `farthest` equals the largest index reachable from the start. The subtle part is that reachability is *downward closed*: if index `i` is reachable (`i <= farthest`), then every index in `[i+1, i+nums[i]]` is reachable too, since you can land on `i` and step from it to anywhere up to `i+nums[i]`. So folding `max(farthest, i + nums[i])` at each reachable `i` never overstates the frontier, and taking the maximum never understates it — a longer reach can only ever help, so the greedy misses no reachable path. Conversely, once `i > farthest`, index `i` is unreachable, hence everything beyond it is unreachable too, and returning `false` is justified.\n\n" +
            "**Common Gotchas.**\n" +
            "- A `0` value is only fatal if the frontier cannot already extend past it; the `i > farthest` check captures exactly that, so do not special-case zeros.\n" +
            "- A single-element array must return `true` — you already stand on the last index; the early `farthest >= n - 1` check (or the loop finishing) handles it.\n" +
            "- Compare against `n - 1`, the last *index*, not `n`; an off-by-one here misjudges success.\n\n" +
            "**Complexity.** Time `O(n)` — one pass; space `O(1)` — a single scalar `farthest`.\n\n" +
            "**Interview mindset.** 'Can I reach the end with max-length steps?' → forget explicit paths, carry the farthest reachable index and check whether the frontier stalls before an index.",
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
            "**What it asks.** Return the *fewest* jumps to go from index `0` to the last index, where each `nums[i]` is a maximum step length (reachability is guaranteed).\n\n" +
            "**Why the naive idea fails.** A DP where `dp[i]` = minimum jumps to reach `i`, filled from every predecessor, is `O(n^2)`. Plain BFS over indices with an explicit queue gives the right count but wastes time and space managing the queue — unnecessary because the reachable set at each level is always a contiguous window.\n\n" +
            "**Key Idea.** Think of it as breadth-first search where a 'level' is the set of indices reachable in exactly `k` jumps. Level 0 is just index `0`. From all indices in the current level, the next level covers `[current_end + 1 .. farthest]`, where `farthest` is the maximum `i + nums[i]` over the current level. Every time you exhaust the current level's window you have spent one more jump — so an implicit BFS needs only two scalars instead of a queue: `current_end` (right boundary of the current level) and `farthest` (the best index reachable while scanning within it).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `jumps = 0`, `current_end = 0`, `farthest = 0`.\n" +
            "2. Scan `i` from `0` to `n - 2` — you never need to jump *from* the last index.\n" +
            "3. At each `i`, extend `farthest = max(farthest, i + nums[i])`.\n" +
            "4. When `i == current_end`, the current level's window is consumed: increment `jumps` and set `current_end = farthest` to open the next level.\n" +
            "5. If `current_end >= n - 1`, the last index is inside the newest window — stop and return `jumps`.\n\n" +
            "**Why it works.** BFS explores indices in nondecreasing order of jump count, so the first level whose window covers `n - 1` uses the minimum number of jumps — the same reason BFS finds shortest paths in an unweighted graph. The greedy choice is 'within a level, push `farthest` as far as possible,' and it is safe by an exchange/dominance argument: we need not know *which* index inside the window we jumped from, because reachability is downward closed — from somewhere in the current level every index up to `farthest` is reachable. A window ending at a larger `farthest` contains every index a smaller one would, so committing to the maximal frontier can never require more jumps than any alternative choice. Incrementing `jumps` exactly when `i` hits `current_end` therefore counts the minimum levels crossed; the reachability guarantee ensures `farthest` always advances past `current_end` so we never stall.\n\n" +
            "**Common Gotchas.**\n" +
            "- Loop only to `n - 2`; scanning through the last index can add a phantom extra jump when `current_end` lands exactly on `n - 1`.\n" +
            "- A single-element array must return `0` — the loop body never runs, leaving `jumps` at `0`.\n" +
            "- Increment `jumps` when you *reach* the window edge, not on every index; the count is levels crossed, not indices visited.\n\n" +
            "**Complexity.** Time `O(n)` — one pass; space `O(1)` — the three scalars `jumps`, `current_end`, `farthest`.\n\n" +
            "**Interview mindset.** 'Minimum steps / jumps to the end' with max-length moves is greedy-BFS: expand a window level by level and count a jump each time you reach the current window's edge.",
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
    },

    {
      id: "gas-station",
      lc: 134,
      title: "Gas Station",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/gas-station/",
      meta: { pattern: "Running Tank + Reset", dataStructure: "Array", technique: "Single-pass greedy start" },
      description:
        "There are `n` gas stations arranged in a **circle**. At station `i` you can pick up `gas[i]` units of fuel, and it costs `cost[i]` units to drive from station `i` to the next station `i + 1` (wrapping around from the last back to the first).\n\n" +
        "You begin with an empty tank and may start at any station. Return the **index of the starting station** from which you can drive all the way around the circuit exactly once, or `-1` if no such start exists. If a solution exists, it is **guaranteed to be unique**.",
      constraints: [
        "`n == gas.length == cost.length`",
        "`1 <= n <= 10^5`",
        "`0 <= gas[i], cost[i] <= 10^4`"
      ],
      notes: [
        "The tank starts empty and can never go negative at any point along the route.",
        "The net fuel gained by driving one leg from station `i` is `gas[i] - cost[i]`.",
        "A complete loop is possible if and only if the total gas is at least the total cost."
      ],
      examples: [
        {
          input: "gas = [1, 2, 3, 4, 5], cost = [3, 4, 5, 1, 2]",
          output: "3",
          reasoning: "Total gas (15) equals total cost (15), so a solution exists. Starting at index 3: tank = 4, then +5-2=... a full loop 3->4->0->1->2->3 succeeds. No earlier start survives.",
          visual:
            "```\nstation :   0   1   2   3   4\ngas     :   1   2   3   4   5\ncost    :   3   4   5   1   2\ndiff    :  -2  -2  -2  +3  +3\n                          start=3\ntank from 3: 0 ->+3=3 ->+3=6 ->-2=4 ->-2=2 ->-2=0  (never < 0)\n```"
        },
        {
          input: "gas = [2, 3, 4], cost = [3, 4, 3]",
          output: "-1",
          reasoning: "Total gas (9) is less than total cost (10), so no starting station can complete the loop; return -1."
        },
        {
          input: "gas = [5, 1, 2, 3, 4], cost = [4, 4, 1, 5, 1]",
          output: "4",
          reasoning: "Total gas (15) equals total cost (15). The unique valid start is index 4."
        },
        {
          input: "gas = [3], cost = [2]",
          output: "0",
          reasoning: "One station: gas 3 covers cost 2 to loop back to itself, so start at index 0."
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "Only to state the naive idea before optimizing; too slow for n up to 10^5.",
          logic:
            "**What it asks.** Find a start index from which a running tank never dips below zero across the full circular route, or report `-1` if none exists.\n\n" +
            "**Why the naive idea fails.** The brute-force idea tries every station as a candidate start: simulate the whole loop from it, adding `gas[i] - cost[i]` at each step, and accept the first start whose tank stays non-negative all the way around. Each simulation is `O(n)` and there are `n` candidates, so it is `O(n^2)` — about 10^10 operations at `n = 10^5`. It also throws away information: when a simulation fails partway, it restarts from the next station and re-drives legs it already knew the outcome of.\n\n" +
            "**Key Idea.** There is no shortcut inside the brute force itself; the only correctness fact it relies on is that a start works iff the prefix sum of `gas[i] - cost[i]` (from that start, wrapping) is non-negative at every step of the loop.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each candidate start `s` from `0` to `n - 1`:\n" +
            "2. Set `tank = 0` and drive `n` legs, visiting stations `s, s+1, …` modulo `n`.\n" +
            "3. At each leg add `gas[cur] - cost[cur]`; if `tank` ever goes negative, abandon this start.\n" +
            "4. If all `n` legs complete with `tank >= 0` throughout, return `s`.\n" +
            "5. If no start survives, return `-1`.\n\n" +
            "**Why it works.** Every possible start is simulated exactly and fully, so a valid start cannot be missed, and the first one found is returned (uniqueness guarantees there is at most one anyway).\n\n" +
            "**Common Gotchas.**\n" +
            "- Use modular indexing `(s + k) % n` to wrap around the circle correctly.\n" +
            "- The tank must stay non-negative at *every* step, not just at the end of the loop.\n" +
            "- Drive exactly `n` legs — returning to the start is the completion condition.\n\n" +
            "**Complexity.** Time `O(n^2)` from re-simulating the loop per candidate; space `O(1)`.\n\n" +
            "**Interview mindset.** State this to frame the problem — then notice that a failed simulation tells you something about *many* starts at once, which is the door to the linear greedy.",
          rcs:
            "class Solution:\n" +
            "    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:\n" +
            "        n = len(gas)\n" +
            "        for s in range(n):                      # Try every station as a start.\n" +
            "            tank = 0\n" +
            "            ok = True\n" +
            "            for k in range(n):                  # Drive all n legs from s.\n" +
            "                cur = (s + k) % n               # Wrap around the circle.\n" +
            "                tank += gas[cur] - cost[cur]    # Net fuel for this leg.\n" +
            "                if tank < 0:                    # Ran dry: this start fails.\n" +
            "                    ok = False\n" +
            "                    break\n" +
            "            if ok:                              # Completed the whole loop.\n" +
            "                return s\n" +
            "        return -1                               # No start works.",
          plain:
            "class Solution:\n" +
            "    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:\n" +
            "        n = len(gas)\n" +
            "        for s in range(n):\n" +
            "            tank = 0\n" +
            "            ok = True\n" +
            "            for k in range(n):\n" +
            "                cur = (s + k) % n\n" +
            "                tank += gas[cur] - cost[cur]\n" +
            "                if tank < 0:\n" +
            "                    ok = False\n" +
            "                    break\n" +
            "            if ok:\n" +
            "                return s\n" +
            "        return -1"
        },
        {
          name: "Optimized — One Pass (total check + reset start)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer whenever you need the unique circular start in a single scan.",
          logic:
            "**What it asks.** Return the unique start index that lets a running tank survive the whole circular route, or `-1` if the trip is impossible.\n\n" +
            "**Why the naive idea fails.** Re-simulating from every candidate is `O(n^2)`. It ignores a powerful fact: when a run starting at `s` first goes negative at station `j`, *none* of the stations `s, s+1, …, j` can be a valid start either — so re-testing each of them one by one is wasted work.\n\n" +
            "**Key Idea.** Two observations collapse the problem to one pass. First, **feasibility**: a full loop is possible iff `sum(gas) >= sum(cost)`; if total gas falls short, no start can work, so return `-1`. Second, **locating the start**: sweep left to right keeping a running `tank`; whenever `tank` drops below zero at station `i`, reset `tank = 0` and set the candidate `start = i + 1`. The station immediately after the failure point becomes the new candidate. Carry two scalars — `total` (to decide feasibility) and `tank` (the run since the last reset).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `total = 0`, `tank = 0`, `start = 0`.\n" +
            "2. Walk `i` from `0` to `n - 1`, computing the leg's net `diff = gas[i] - cost[i]`.\n" +
            "3. Add `diff` to both `total` and `tank`.\n" +
            "4. If `tank < 0`, the segment from `start` through `i` cannot begin a valid loop: set `start = i + 1` and reset `tank = 0`.\n" +
            "5. After the pass, return `start` if `total >= 0`, else `-1`.\n\n" +
            "**Why it works — and why the reset is safe.** The feasibility half is a global conservation argument: driving the whole circle nets exactly `sum(gas) - sum(cost)`, so if that total is negative the tank must go negative somewhere no matter where you begin, and `-1` is correct; if it is non-negative, a valid start is guaranteed to exist and be unique.\n\n" +
            "The reset is the greedy choice, and its safety is an exchange/contradiction argument. Suppose the run from the current `start` accumulates a non-negative tank across stations `start, …, i-1` but goes negative for the first time at station `i` (`tank + diff_i < 0`). Claim: **no station `p` in `[start, i]` can be a valid starting point.** Take any such `p`. Because `start` reached `p` with a non-negative tank (that was the running invariant up to the failure — every partial sum from `start` up to any station before `i` was `>= 0`), the tank a real trip beginning at `p` would have on arriving at `i` is *no larger* than the tank our run from `start` had there: starting at `p` you forgo the (non-negative) fuel banked from `start` to `p`. Formally, `prefix(p..i) = prefix(start..i) - prefix(start..p-1) <= prefix(start..i) < 0`. So a trip from `p` also fails to clear the leg into/at `i` — `p` cannot be a valid start. Hence every candidate up to and including `i` is eliminated in one stroke, and the only stations that remain possible are those from `i + 1` onward. That is exactly why we jump `start` to `i + 1` and zero the tank, and why a single left-to-right sweep never skips the true start: whenever total fuel suffices, the last surviving candidate is the unique answer.\n\n" +
            "**Common Gotchas.**\n" +
            "- Keep `total` (over the whole array) separate from `tank` (which resets); the feasibility decision uses `total`, the start location uses `tank`.\n" +
            "- On a negative tank, reset the candidate to `i + 1`, not `i` — station `i` is the one that just failed.\n" +
            "- Do not return `start` without the `total >= 0` check; a surviving `start` from the sweep is only valid when the whole trip is feasible.\n\n" +
            "**Complexity.** Time `O(n)` — one pass; space `O(1)` — the three scalars `total`, `tank`, `start`.\n\n" +
            "**Interview mindset.** 'Circular route, running resource that can't go negative, find the start' is the signal: check global feasibility with a total, then locate the start by resetting the moment a running sum dips below zero.",
          rcs:
            "class Solution:\n" +
            "    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:\n" +
            "        total = 0                               # Net fuel over the WHOLE circle (feasibility).\n" +
            "        tank = 0                                # Running tank since the last reset.\n" +
            "        start = 0                               # Current candidate start station.\n" +
            "        for i in range(len(gas)):\n" +
            "            diff = gas[i] - cost[i]             # Net fuel for the leg out of station i.\n" +
            "            total += diff                       # Accumulate the global total.\n" +
            "            tank += diff                        # Accumulate the current run.\n" +
            "            if tank < 0:                        # Ran dry within this segment...\n" +
            "                start = i + 1                   # ...so no station start..i works; jump past.\n" +
            "                tank = 0                        # Fresh tank for the new candidate.\n" +
            "        return start if total >= 0 else -1      # Feasible only if total gas >= total cost.",
          plain:
            "class Solution:\n" +
            "    def canCompleteCircuit(self, gas: List[int], cost: List[int]) -> int:\n" +
            "        total = 0\n" +
            "        tank = 0\n" +
            "        start = 0\n" +
            "        for i in range(len(gas)):\n" +
            "            diff = gas[i] - cost[i]\n" +
            "            total += diff\n" +
            "            tank += diff\n" +
            "            if tank < 0:\n" +
            "                start = i + 1\n" +
            "                tank = 0\n" +
            "        return start if total >= 0 else -1"
        }
      ],
      patternRecognition: [
        "'Circular route with a running resource that must never go negative' → total-feasibility check plus a reset scan.",
        "A failed prefix eliminates a whole segment of candidate starts at once, not just one.",
        "Answer is guaranteed unique when total supply >= total demand."
      ],
      interviewRecall: [
        "Two accumulators: total (whole array, decides -1) and tank (resets on negativity).",
        "When tank < 0 at i, set start = i + 1 and zero the tank.",
        "Return start only if total >= 0, else -1."
      ]
    },

    {
      id: "hand-of-straights",
      lc: 846,
      title: "Hand of Straights",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/hand-of-straights/",
      meta: { pattern: "Count Map + Smallest-First", dataStructure: "Hash Map / Heap", technique: "Consume runs greedily" },
      description:
        "You are given an integer array `hand` of card values and an integer `groupSize`. Determine whether the cards can be rearranged into groups such that **every group has exactly `groupSize` cards** and each group is a run of **consecutive** values (like 3,4,5).\n\n" +
        "Return `true` if such a rearrangement is possible and `false` otherwise.",
      constraints: [
        "`1 <= hand.length <= 10^4`",
        "`0 <= hand[i] <= 10^9`",
        "`1 <= groupSize <= hand.length`"
      ],
      notes: [
        "If `len(hand)` is not divisible by `groupSize`, grouping is impossible.",
        "Duplicate values are allowed; they simply belong to different groups.",
        "Each group must be `groupSize` *consecutive* integers, e.g. size 3 means `x, x+1, x+2`."
      ],
      examples: [
        {
          input: "hand = [1, 2, 3, 6, 2, 3, 4, 7, 8], groupSize = 3",
          output: "true",
          reasoning: "The cards split into [1,2,3], [2,3,4], [6,7,8] — three consecutive runs of size 3.",
          visual:
            "```\ncounts: {1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1}\nsmallest=1 -> take 1,2,3   remaining {2:1,3:1,4:1,6:1,7:1,8:1}\nsmallest=2 -> take 2,3,4   remaining {6:1,7:1,8:1}\nsmallest=6 -> take 6,7,8   remaining {}\nall consumed -> true\n```"
        },
        {
          input: "hand = [1, 2, 3, 4, 5], groupSize = 4",
          output: "false",
          reasoning: "5 cards cannot be split into groups of 4 (5 is not divisible by 4), so it fails immediately."
        },
        {
          input: "hand = [1, 2, 3, 4, 5, 6], groupSize = 2",
          output: "true",
          reasoning: "Split into [1,2], [3,4], [5,6] — three consecutive pairs."
        },
        {
          input: "hand = [8, 10, 12], groupSize = 3",
          output: "false",
          reasoning: "Starting from 8, the values 9 and 10 are needed but 9 is missing, so no consecutive run of size 3 can form."
        }
      ],
      approaches: [
        {
          name: "Optimized — Count Map + Smallest Available First",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "The expected answer for 'partition into consecutive fixed-size groups' problems.",
          logic:
            "**What it asks.** Decide whether every card can be placed into groups of exactly `groupSize` consecutive values, using each card exactly once.\n\n" +
            "**Why the naive idea fails.** Trying all ways to assign cards to groups is combinatorial. Even sorting and greedily forming groups left to right needs a way to know, quickly, whether the *next consecutive card* is still available — a plain sorted list forces expensive scans or deletions from the middle.\n\n" +
            "**Key Idea.** The smallest remaining card is the crux: it can only ever be the **lowest** value of some group (nothing smaller exists to sit below it). So its group is forced to be `min, min+1, …, min+groupSize-1`. Track how many of each value remain in a count map (a `Counter`), repeatedly take the smallest available value, and try to remove one of each of the next `groupSize` consecutive values. A min-heap or the sorted keys give the smallest value cheaply.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `len(hand) % groupSize != 0`, return `false` — the cards cannot divide evenly.\n" +
            "2. Build `count = Counter(hand)` and get the values in sorted order (or push them into a min-heap).\n" +
            "3. Take the smallest value `v` that still has a positive count; it must start a group.\n" +
            "4. For `k` in `0 … groupSize-1`, check that `v + k` is present with count `>= count[v]` needed; decrement `count[v + k]`. If any `v + k` is missing (count `0`), return `false`.\n" +
            "5. Continue until all counts hit zero; return `true`.\n\n" +
            "**Why it works — greedy-choice safety.** The greedy choice is 'always build the group anchored at the smallest available card.' It is safe by an exchange argument. Let `m` be the smallest remaining value. In *any* valid full grouping, `m` belongs to some group `G`; because a group is `groupSize` consecutive values and `m` is the global minimum remaining, `m` must be the *smallest* element of `G` (any element below `m` would contradict minimality). Therefore `G` is exactly `m, m+1, …, m+groupSize-1` — the identical group our greedy forms. Removing this forced group leaves a strictly smaller subproblem whose solvability is unchanged, so by induction the greedy reaches a valid grouping exactly when one exists. Equivalently: since every solution is *forced* to spend `m` as a group-minimum, committing to that group can never rule out an otherwise-achievable solution. If at any point the required `m+k` is absent, then even this forced group cannot be completed, so no valid grouping exists and `false` is correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- Divisibility check first: skip it and you can loop into a wrong answer on non-divisible sizes.\n" +
            "- Always start from the *smallest* available value; starting elsewhere can strand a value that nothing below it can absorb.\n" +
            "- Decrement counts and treat count `0` as 'absent'; a value can be needed by multiple overlapping groups (via duplicates), so respect the multiplicity.\n\n" +
            "**Complexity.** Time `O(n log n)` — sorting the distinct values (or heap operations) dominates; each card is consumed once. Space `O(n)` for the count map / heap.\n\n" +
            "**Interview mindset.** 'Partition into consecutive groups of fixed size' → count map plus 'the smallest leftover card forces its group,' consumed smallest-first.",
          rcs:
            "from collections import Counter\n" +
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:\n" +
            "        if len(hand) % groupSize != 0:          # Cannot split evenly at all.\n" +
            "            return False\n" +
            "        count = Counter(hand)                   # value -> how many copies remain.\n" +
            "        min_heap = list(count.keys())           # Distinct values...\n" +
            "        heapq.heapify(min_heap)                 # ...as a min-heap for smallest-first access.\n" +
            "        while min_heap:\n" +
            "            start = min_heap[0]                 # Smallest remaining value must start a group.\n" +
            "            need = count[start]                 # This many groups all begin at 'start'.\n" +
            "            for v in range(start, start + groupSize):  # Need v, v+1, ..., v+groupSize-1.\n" +
            "                if count[v] < need:             # Not enough copies to complete the runs.\n" +
            "                    return False\n" +
            "                count[v] -= need               # Consume 'need' copies of this value.\n" +
            "                if count[v] == 0:              # Exhausted; must be the current heap min.\n" +
            "                    if v != min_heap[0]:       # A hole below the smallest => impossible.\n" +
            "                        return False\n" +
            "                    heapq.heappop(min_heap)    # Remove the used-up smallest value.\n" +
            "        return True",
          plain:
            "from collections import Counter\n" +
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def isNStraightHand(self, hand: List[int], groupSize: int) -> bool:\n" +
            "        if len(hand) % groupSize != 0:\n" +
            "            return False\n" +
            "        count = Counter(hand)\n" +
            "        min_heap = list(count.keys())\n" +
            "        heapq.heapify(min_heap)\n" +
            "        while min_heap:\n" +
            "            start = min_heap[0]\n" +
            "            need = count[start]\n" +
            "            for v in range(start, start + groupSize):\n" +
            "                if count[v] < need:\n" +
            "                    return False\n" +
            "                count[v] -= need\n" +
            "                if count[v] == 0:\n" +
            "                    if v != min_heap[0]:\n" +
            "                        return False\n" +
            "                    heapq.heappop(min_heap)\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'Partition all items into consecutive runs of a fixed size' → count map + smallest-first.",
        "The smallest remaining value is forced to be a group's minimum.",
        "Divisibility of the total by the group size is a necessary first check."
      ],
      interviewRecall: [
        "Counter of values + a min-heap (or sorted keys) for smallest-first access.",
        "Each group is forced: min, min+1, ..., min+groupSize-1.",
        "Decrement counts; a missing consecutive value means return false."
      ]
    },

    {
      id: "merge-triplets-to-form-target-triplet",
      lc: 1899,
      title: "Merge Triplets to Form Target Triplet",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/merge-triplets-to-form-target-triplet/",
      meta: { pattern: "Componentwise Max Filter", dataStructure: "Array", technique: "Feasible-triplet selection" },
      description:
        "You are given a 2D array `triplets` where `triplets[i] = [a_i, b_i, c_i]`, and a `target = [x, y, z]`. You may repeatedly pick two triplets and replace them with their **componentwise maximum** — i.e. merging `[a, b, c]` and `[d, e, f]` produces `[max(a,d), max(b,e), max(c,f)]`.\n\n" +
        "Return `true` if, by choosing some subset of triplets and merging them, you can produce a triplet exactly equal to `target`.",
      constraints: [
        "`1 <= triplets.length <= 10^5`",
        "`triplets[i].length == target.length == 3`",
        "`1 <= a_i, b_i, c_i, x, y, z <= 1000`"
      ],
      notes: [
        "Merging takes the max per position, so a chosen component can never decrease.",
        "Any triplet with a component strictly greater than the matching target component is unusable — it would push that position past the target.",
        "You do not need to use every triplet; you choose which ones to merge."
      ],
      examples: [
        {
          input: "triplets = [[2,5,3],[1,8,4],[1,7,5]], target = [2,7,5]",
          output: "true",
          reasoning: "All three triplets are usable (no component exceeds target). Merge [2,5,3] and [1,7,5] -> [2,7,5], which equals target.",
          visual:
            "```\ntarget       : [2, 7, 5]\n[2,5,3] ok -> hits x=2 (pos0)\n[1,8,4] BAD -> 8 > 7 at pos1, discard\n[1,7,5] ok -> hits y=7 (pos1) and z=5 (pos2)\ncovered positions: {0,1,2} -> true\n```"
        },
        {
          input: "triplets = [[3,4,5],[4,5,6]], target = [3,2,5]",
          output: "false",
          reasoning: "Every triplet has a component larger than the target (4>2 or 5>2 at position 1), so none is usable and target can never be hit."
        },
        {
          input: "triplets = [[2,5,3],[2,3,4],[1,2,5],[5,2,3]], target = [5,5,5]",
          output: "true",
          reasoning: "Usable triplets contribute x=5 (from [5,2,3]), y=5 (from [2,5,3]), z=5 (from [1,2,5]); merging them yields [5,5,5]."
        },
        {
          input: "triplets = [[1,1,1]], target = [2,2,2]",
          output: "false",
          reasoning: "The only triplet cannot reach any target component (all are below), so target is unreachable."
        }
      ],
      approaches: [
        {
          name: "Optimized — Filter then Componentwise Max",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer for 'reach a target vector via componentwise max of chosen items'.",
          logic:
            "**What it asks.** Decide whether some subset of triplets, combined by taking the maximum in each of the three positions, produces exactly `target = [x, y, z]`.\n\n" +
            "**Why the naive idea fails.** Enumerating subsets to merge is exponential (`2^n` choices). Even considering pairs of merges is unnecessary work — merging is just a repeated componentwise max, so the order and grouping of merges never matter; only *which* triplets are included does.\n\n" +
            "**Key Idea.** Componentwise max is monotonic and can never *decrease* a coordinate, so a triplet with any component **strictly greater than the target** is poison: include it and that position overshoots `target` forever. Discard those. Among the remaining *safe* triplets (every component `<=` target), we can freely merge all of them, and the result is exactly the componentwise max over that safe set. So the answer is `true` iff, restricting to safe triplets, some triplet hits `x` in position 0, some hits `y` in position 1, and some hits `z` in position 2. Track three booleans, one per coordinate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize three flags `found = [false, false, false]` for positions 0, 1, 2.\n" +
            "2. For each triplet `[a, b, c]`, skip it if `a > x` or `b > y` or `c > z` (unsafe — would overshoot).\n" +
            "3. For a safe triplet, set `found[0] = true` if `a == x`, `found[1] = true` if `b == y`, `found[2] = true` if `c == z`.\n" +
            "4. After scanning, return `true` iff all three flags are set.\n\n" +
            "**Why it works — greedy-choice safety.** The greedy choice is 'include every safe triplet, exclude every unsafe one,' and it is safe by a dominance/exchange argument in both directions. *Unsafe triplets:* if a triplet has a component above the target, including it forces that coordinate strictly above the target (max only grows), so no valid solution can contain it — discarding is never a loss. *Safe triplets:* including *all* of them is optimal because adding a safe triplet can only raise coordinates toward (never past) the target — its components are all `<=` target — so it can only help satisfy an as-yet-unmet coordinate and can never break an already-met one. Thus the componentwise max over the full safe set dominates the max of any sub-selection: if *any* achievable subset reaches `target`, the all-safe set reaches it too. Since each target coordinate `x`, `y`, `z` must be attained by *some* included triplet whose component equals it (max can't exceed the values present), checking that each coordinate is hit by at least one safe triplet is exactly necessary and sufficient.\n\n" +
            "**Common Gotchas.**\n" +
            "- The exceed test must use strict `>` against the target; a component *equal* to the target is exactly what you want, not a disqualifier.\n" +
            "- A single triplet may satisfy more than one coordinate at once — check all three flags per safe triplet.\n" +
            "- Do not require one triplet to match all three positions; different triplets can cover different coordinates and merge together.\n\n" +
            "**Complexity.** Time `O(n)` — one pass over the triplets; space `O(1)` — three boolean flags.\n\n" +
            "**Interview mindset.** 'Reach a target vector by componentwise max of chosen items' → filter out anything that overshoots, then check each coordinate is individually achievable among survivors.",
          rcs:
            "class Solution:\n" +
            "    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:\n" +
            "        x, y, z = target\n" +
            "        found = [False, False, False]           # Whether each target coord is achievable.\n" +
            "        for a, b, c in triplets:\n" +
            "            if a > x or b > y or c > z:         # Overshoots the target somewhere: unusable.\n" +
            "                continue\n" +
            "            if a == x:                         # Safe triplet hits target position 0.\n" +
            "                found[0] = True\n" +
            "            if b == y:                         # ...position 1.\n" +
            "                found[1] = True\n" +
            "            if c == z:                         # ...position 2.\n" +
            "                found[2] = True\n" +
            "        return all(found)                       # All three coords covered => target reachable.",
          plain:
            "class Solution:\n" +
            "    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:\n" +
            "        x, y, z = target\n" +
            "        found = [False, False, False]\n" +
            "        for a, b, c in triplets:\n" +
            "            if a > x or b > y or c > z:\n" +
            "                continue\n" +
            "            if a == x:\n" +
            "                found[0] = True\n" +
            "            if b == y:\n" +
            "                found[1] = True\n" +
            "            if c == z:\n" +
            "                found[2] = True\n" +
            "        return all(found)"
        }
      ],
      patternRecognition: [
        "'Reach a target vector via componentwise max of a chosen subset' → filter overshooters, check each coord.",
        "Merge is monotone (never decreases), so order/grouping is irrelevant — only inclusion matters.",
        "Any item exceeding the target in any coordinate is disqualified outright."
      ],
      interviewRecall: [
        "Discard any triplet with a component > the target's; it can only overshoot.",
        "Among safe triplets, mark which target coordinate each one equals.",
        "Return true iff all three coordinates are individually matched."
      ]
    },

    {
      id: "partition-labels",
      lc: 763,
      title: "Partition Labels",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/partition-labels/",
      meta: { pattern: "Last-Occurrence Reach", dataStructure: "Hash Map", technique: "Extend-until-closed window" },
      description:
        "You are given a string `s`. Partition it into as **many parts as possible** so that each letter appears in **at most one** part. Return a list of the sizes of these parts, in order.\n\n" +
        "The concatenation of the parts, in order, must reconstruct the original string `s`.",
      constraints: [
        "`1 <= s.length <= 500`",
        "`s` consists of lowercase English letters."
      ],
      notes: [
        "Every occurrence of a given letter must fall inside the same part.",
        "The parts are contiguous and in order; you are only choosing where to cut.",
        "Returning as many parts as possible is achieved by cutting at the earliest safe boundary."
      ],
      examples: [
        {
          input: 's = "ababcbacadefegdehijhklij"',
          output: "[9, 7, 8]",
          reasoning: "The first part 'ababcbaca' (length 9) contains all a's, b's, and c's. Then 'defegde' (7) contains all d/e/f/g, and 'hijhklij' (8) the rest.",
          visual:
            "```\ns: a b a b c b a c a d e f e g d e h i j h k l i j\n   |-------- 9 --------|--- 7 ---|---- 8 ----|\nlast('a')=8 -> window must reach >=8; c ends at 7, all fit by index 8\ncut at 8, restart; next window d..g ends at 15; etc.\n```"
        },
        {
          input: 's = "eccbbbbdec"',
          output: "[10]",
          reasoning: "The letter 'e' first appears at index 0 and last at index 8, and 'c' spans to index 9, so the whole string must stay in one part.",
        },
        {
          input: 's = "a"',
          output: "[1]",
          reasoning: "A single character is its own part of size 1."
        },
        {
          input: 's = "abcabc"',
          output: "[6]",
          reasoning: "Each of a, b, c appears on both sides, so no cut is safe; the whole string is one part."
        }
      ],
      approaches: [
        {
          name: "Optimized — Last-Occurrence + Extend Window",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer for 'cut a string/array into maximal independent segments'.",
          logic:
            "**What it asks.** Split `s` into the greatest number of contiguous pieces such that no letter is shared between two pieces, and return the piece sizes.\n\n" +
            "**Why the naive idea fails.** Trying candidate cut positions and verifying that no letter crosses each cut is expensive and repetitive. The real constraint is simple: a piece must extend far enough to include the **last occurrence** of every letter it contains, so brute-forcing cuts ignores that this reach is directly computable.\n\n" +
            "**Key Idea.** First record `last[ch]` = the last index at which each character appears (one pass). Then sweep left to right maintaining `end`, the farthest last-occurrence index among letters seen since the current part began. Every time the scan index `i` **reaches `end`**, every letter inside the current window has all its occurrences within `[start, i]`, so it is safe to cut — this is the earliest legal boundary, which maximizes the number of parts. Carry two scalars, `start` and `end`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `last` mapping each character to its final index in `s`.\n" +
            "2. Initialize `start = 0` and `end = 0`.\n" +
            "3. Walk `i` over `s`; extend `end = max(end, last[s[i]])` to cover the current letter's full span.\n" +
            "4. When `i == end`, the window is self-contained: append `i - start + 1` to the answer and set `start = i + 1`.\n" +
            "5. Continue to the end of the string and return the list of sizes.\n\n" +
            "**Why it works — greedy-choice safety.** The greedy choice is 'cut at the first index `i` where `i == end`.' It is safe by an invariant plus an exchange argument. *Invariant:* while scanning a part beginning at `start`, `end` is the maximum last-occurrence over all letters in `[start, i]`; so the part cannot legally end before `end`, because some letter still has an occurrence at `end` (cutting earlier would split that letter across parts). *Earliest is optimal:* when `i` first equals `end`, no letter within `[start, i]` occurs after `i` (that is exactly what `i == end` asserts), so `[start, i]` is a valid, self-contained part. Cutting here rather than later can only *increase* the number of parts: any valid partition's first cut must be at index `>= end` (by the invariant), and choosing the minimum such index leaves the largest possible remainder to subdivide. Formally, an exchange argument shows that from any optimal partition we can move its first boundary left to `end` without merging any letter's occurrences across the cut and without reducing the part count — so a partition that always cuts at the earliest safe boundary is optimal (maximal in count). Applying this inductively to each remaining suffix yields the maximum number of parts.\n\n" +
            "**Common Gotchas.**\n" +
            "- The part size is `i - start + 1` (inclusive of both endpoints), then reset `start = i + 1`.\n" +
            "- Extend `end` with the *current* letter's last index before testing `i == end`.\n" +
            "- Compute `last` in a separate first pass; you need each letter's final index before deciding any cut.\n\n" +
            "**Complexity.** Time `O(n)` — one pass to build `last`, one pass to partition; space `O(1)` — the last-occurrence map holds at most 26 entries.\n\n" +
            "**Interview mindset.** 'Cut into maximal independent segments where each item type stays in one segment' → record each type's last position, then close a window the moment the scan reaches its farthest required reach.",
          rcs:
            "class Solution:\n" +
            "    def partitionLabels(self, s: str) -> List[int]:\n" +
            "        last = {ch: i for i, ch in enumerate(s)}  # Final index of each character.\n" +
            "        result = []\n" +
            "        start = 0                               # Left boundary of the current part.\n" +
            "        end = 0                                 # Farthest last-occurrence seen in this part.\n" +
            "        for i, ch in enumerate(s):\n" +
            "            end = max(end, last[ch])            # Window must reach this letter's last index.\n" +
            "            if i == end:                       # Every letter here is fully contained.\n" +
            "                result.append(i - start + 1)   # Close the part; record its size.\n" +
            "                start = i + 1                  # Next part starts after the cut.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def partitionLabels(self, s: str) -> List[int]:\n" +
            "        last = {ch: i for i, ch in enumerate(s)}\n" +
            "        result = []\n" +
            "        start = 0\n" +
            "        end = 0\n" +
            "        for i, ch in enumerate(s):\n" +
            "            end = max(end, last[ch])\n" +
            "            if i == end:\n" +
            "                result.append(i - start + 1)\n" +
            "                start = i + 1\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Cut a sequence into maximal parts where each element type stays in one part' → last-occurrence + window reach.",
        "The part must extend to the farthest last-occurrence of any element inside it.",
        "Closing at the earliest safe boundary maximizes the number of parts."
      ],
      interviewRecall: [
        "Precompute each character's last index in one pass.",
        "Sweep, extend end = max(end, last[ch]); cut when i == end.",
        "Part size is i - start + 1; then move start to i + 1."
      ]
    },

    {
      id: "valid-parenthesis-string",
      lc: 678,
      title: "Valid Parenthesis String",
      difficulty: "Medium",
      category: "Greedy",
      link: "https://leetcode.com/problems/valid-parenthesis-string/",
      meta: { pattern: "Open-Count Range", dataStructure: "Two Counters", technique: "Track [low, high] open bounds" },
      description:
        "Given a string `s` containing only the characters `'('`, `')'`, and `'*'`, determine whether it can be interpreted as a **valid** parenthesis string. Each `'*'` may be treated as a single `'('`, a single `')'`, or an empty string `\"\"`.\n\n" +
        "A string is valid if every `'('` has a matching later `')'`, every `')'` has a matching earlier `'('`, and matches are properly nested.",
      constraints: [
        "`1 <= s.length <= 100`",
        "`s[i]` is one of `'('`, `')'`, or `'*'`."
      ],
      notes: [
        "A `'*'` is flexible: it can open, close, or vanish — the challenge is choosing consistently.",
        "The string is valid iff there exists *some* assignment of the stars that balances it.",
        "At no prefix may the number of ')' forced so far exceed the '(' available."
      ],
      examples: [
        {
          input: 's = "()"',
          output: "true",
          reasoning: "Already balanced with no stars needed."
        },
        {
          input: 's = "(*)"',
          output: "true",
          reasoning: "Treat '*' as empty (or as anything harmless); '(' matches ')'.",
          visual:
            "```\ns:  (   *   )\nlow: 1  0   -1->0(clamped)   high: 1  2  1\nend: low reaches 0 -> valid (some assignment balances)\n```"
        },
        {
          input: 's = "(*))"',
          output: "true",
          reasoning: "Treat '*' as '(' : then we have '(())'... actually '*'='(' gives '(())'? Use '*'='(' -> ( ( ) ) balanced. Valid."
        },
        {
          input: 's = ")("',
          output: "false",
          reasoning: "The leading ')' has no '(' before it and no star to supply one, so high goes negative immediately — invalid."
        }
      ],
      approaches: [
        {
          name: "Optimized — Greedy Open-Count Range [low, high]",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer for wildcard-parenthesis validity in one pass without DP.",
          logic:
            "**What it asks.** Decide whether *some* interpretation of each `'*'` (as `'('`, `')'`, or empty) makes the whole string a properly matched parenthesis string.\n\n" +
            "**Why the naive idea fails.** Brute force tries all `3^k` star assignments — exponential. A DP over (index, open-count) is `O(n^2)` and works, but carries far more state than needed: at each prefix the *set* of reachable open-counts is always a contiguous interval, so two numbers suffice.\n\n" +
            "**Key Idea.** Track the **range of possible open-parenthesis counts** as `[low, high]` while scanning: `low` = the fewest open brackets we could have (treating stars as favorably-closing), `high` = the most (treating stars as opening). A `'('` bumps both up; a `')'` drops both; a `'*'` widens the range (it could open, so `high++`, or close/vanish, so `low--`). Two rules keep the range meaningful: if `high < 0` at any point, even the most generous reading has more `')'` than `'('` — impossible, return `false`; and clamp `low` at `0`, since the open count can never truly be negative (we would just have used fewer stars as closers). The string is valid iff `low == 0` at the end (a balanced assignment is reachable).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `low = 0`, `high = 0`.\n" +
            "2. For each character: on `'('`, do `low += 1; high += 1`. On `')'`, do `low -= 1; high -= 1`. On `'*'`, do `low -= 1; high += 1`.\n" +
            "3. If `high < 0`, too many `')'` even in the best case — return `false` immediately.\n" +
            "4. Clamp `low` to `0` if it went negative (open count can't be below zero).\n" +
            "5. After the scan, return `true` iff `low == 0`.\n\n" +
            "**Why it works — greedy-choice safety.** The core invariant is that `[low, high]` is exactly the set of achievable open-bracket counts after the current prefix: it starts as the single value `{0}`, and each character transforms the whole interval consistently (every operation shifts an interval to another interval), so contiguity is preserved and the interval never omits a reachable count. The greedy handling of stars is safe by an exchange argument. Clamping `low` at `0` is justified because a negative `low` would correspond to having designated more stars as closers than there were open brackets — an infeasible reading — and for any such over-close there is an equally-or-more valid reading that instead treats one of those stars as empty, giving open count `0`; so `0` is the true minimum feasible open count and no valid assignment is discarded. Returning `false` on `high < 0` is safe because `high` is the *maximum* possible open count, and if even that is negative then every assignment has a closer with no opener at this prefix — no interpretation can recover. Finally, `low == 0` reachable at the end means some assignment lands at zero unmatched opens with every prefix legal (guaranteed by never letting `high` go negative), which is precisely validity; if `low > 0`, every reading ends with unmatched `'('`. Thus the two-scalar greedy accepts exactly the valid strings.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check `high < 0` and return `false` *during* the scan, right after updating on each character.\n" +
            "- Clamp `low` at `0` (`low = max(low, 0)`) each step; letting it go negative corrupts the reachable range.\n" +
            "- The final test is `low == 0`, not `high == 0` — you want the *minimum* feasible open count to be zero.\n\n" +
            "**Complexity.** Time `O(n)` — one pass; space `O(1)` — the two scalars `low` and `high`.\n\n" +
            "**Interview mindset.** Wildcards that can be one of several things, asking 'is any interpretation valid?' → track a contiguous range of the key quantity (here open-count) with a low/high pair instead of exploring every choice.",
          rcs:
            "class Solution:\n" +
            "    def checkValidString(self, s: str) -> bool:\n" +
            "        low = 0                                 # Fewest possible open '(' so far.\n" +
            "        high = 0                                # Most possible open '(' so far.\n" +
            "        for ch in s:\n" +
            "            if ch == '(':                      # Must open: both bounds rise.\n" +
            "                low += 1\n" +
            "                high += 1\n" +
            "            elif ch == ')':                    # Must close: both bounds fall.\n" +
            "                low -= 1\n" +
            "                high -= 1\n" +
            "            else:                              # '*': could close/vanish (low--) or open (high++).\n" +
            "                low -= 1\n" +
            "                high += 1\n" +
            "            if high < 0:                       # Too many ')' even in the best case.\n" +
            "                return False\n" +
            "            if low < 0:                        # Open count can't truly be negative.\n" +
            "                low = 0\n" +
            "        return low == 0                         # Some assignment balances exactly.",
          plain:
            "class Solution:\n" +
            "    def checkValidString(self, s: str) -> bool:\n" +
            "        low = 0\n" +
            "        high = 0\n" +
            "        for ch in s:\n" +
            "            if ch == '(':\n" +
            "                low += 1\n" +
            "                high += 1\n" +
            "            elif ch == ')':\n" +
            "                low -= 1\n" +
            "                high -= 1\n" +
            "            else:\n" +
            "                low -= 1\n" +
            "                high += 1\n" +
            "            if high < 0:\n" +
            "                return False\n" +
            "            if low < 0:\n" +
            "                low = 0\n" +
            "        return low == 0"
        }
      ],
      patternRecognition: [
        "Wildcards that can each be one of several things, asking 'is any interpretation valid?' → track a [low, high] range.",
        "Parenthesis validity with a flexible token → bound the open-count instead of committing to a choice.",
        "The reachable set of a running quantity is a contiguous interval → two scalars replace a DP table."
      ],
      interviewRecall: [
        "low/high = min/max possible open count; '(' +1/+1, ')' -1/-1, '*' -1/+1.",
        "Fail if high < 0; clamp low at 0 each step.",
        "Valid iff low == 0 at the end."
      ]
    }
  ]);
})();
