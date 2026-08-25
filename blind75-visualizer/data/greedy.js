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
    }
  ]);
})();
