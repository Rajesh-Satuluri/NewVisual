/*
 * Blind 75 — 2-D Dynamic Programming
 * =========================================================================
 * Registers this category's problems on the global registry:
 *     window.BLIND75.register("2-D Dynamic Programming", [ ...problems ]);
 *
 * See data/arrays_hashing.js for the full PROBLEM SCHEMA and authoring notes.
 * Every multi-line field uses a BACKTICK TEMPLATE LITERAL (no ${...} inside).
 * =========================================================================
 */
(function () {
  window.BLIND75.register("2-D Dynamic Programming", [
    {
      id: "unique-paths",
      lc: 62,
      title: "Unique Paths",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/unique-paths/",
      meta: { pattern: "Grid DP", dataStructure: "2-D Array", technique: "Additive path counting" },
      description:
        "A robot sits in the **top-left** corner of an `m x n` grid. It can move only **right** or **down** by one cell at a time, and it wants to reach the **bottom-right** corner.\n\n" +
        "Return the number of **distinct paths** the robot can take from the start to the finish. The answer is guaranteed to fit in a 32-bit signed integer.",
      constraints: [
        "`1 <= m, n <= 100`",
        "The answer is guaranteed to be `<= 2 * 10^9`."
      ],
      notes: [
        "Only two moves are allowed: one step right or one step down.",
        "A path is a full sequence of cells from `(0,0)` to `(m-1,n-1)`; two paths differ if they visit any different cell."
      ],
      examples: [
        {
          input: "m = 3, n = 7",
          output: "28",
          reasoning: "There are 28 distinct right/down routes across a 3-row, 7-column grid."
        },
        {
          input: "m = 3, n = 2",
          output: "3",
          reasoning: "From the top-left you can go Down-Down-Right, Down-Right-Down, or Right-Down-Down.",
          visual:
            "```\ngrid (3x2), each cell = ways to reach it\n\ncol:     0   1\nrow 0:   1   1\nrow 1:   1   2\nrow 2:   1   3   <- answer at bottom-right\n\nevery cell = (cell above) + (cell to the left)\n```"
        },
        {
          input: "m = 1, n = 1",
          output: "1",
          reasoning: "Start already equals finish; the single empty path counts as one."
        },
        {
          input: "m = 3, n = 3",
          output: "6",
          reasoning: "A 3x3 grid has C(4,2) = 6 monotone right/down paths."
        }
      ],
      approaches: [
        {
          name: "2-D DP (grid of counts)",
          time: "O(m * n)",
          space: "O(n)",
          whenToUse: "The go-to approach: intuitive, generalizes to grids with obstacles or weights.",
          logic:
            "**What it asks.** Count the distinct paths a robot can take from the top-left to the bottom-right of an `m x n` grid when it may only move one step **right** or one step **down** at a time.\n\n" +
            "**Why the naive idea fails.** The obvious recursion is `paths(i,j) = paths(i+1,j) + paths(i,j+1)`, bottoming out at the goal. But it re-explores the same cells over and over — the number of recursive branches blows up to roughly `2^(m+n)`, far too slow even for a 100x100 grid.\n\n" +
            "**Key Idea.** Let `dp[i][j]` be the number of distinct paths from the start to cell `(i,j)`. The only way to arrive at `(i,j)` is from directly **above** `(i-1,j)` or directly **left** `(i,j-1)`. Those two families of paths are disjoint and together cover every path, so the count at a cell is simply the sum of the counts of its top and left neighbours.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[0][0] = 1` (the single empty path), and the entire **first row** and **first column** are all `1` — along an edge there is exactly one way to get there (keep going straight).\n" +
            "2. Transition: for every interior cell, `dp[i][j] = dp[i-1][j] + dp[i][j-1]` — the ways from above plus the ways from the left.\n" +
            "3. Fill the table row by row (or column by column) so each cell reads neighbours that are already computed.\n" +
            "4. The answer is `dp[m-1][n-1]`, the count at the bottom-right corner.\n\n" +
            "**Why it works.** By induction: if `dp[i-1][j]` and `dp[i][j-1]` correctly count the paths to those cells, then since any path to `(i,j)` ends with exactly one final move — from above or from the left — summing the two counts every path to `(i,j)` exactly once. No path is double-counted, because its last move is uniquely 'from above' or 'from the left'.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to seed the whole first row and first column to `1` — a single missed edge cell corrupts everything downstream.\n" +
            "- The `1 x 1` grid must return `1` (start already equals finish), which the base case handles.\n" +
            "- Iterating in the wrong order so a cell reads a neighbour that hasn't been filled yet.\n\n" +
            "**Complexity.** Time `O(m*n)` — each cell is filled once with `O(1)` work. Space `O(m*n)` for the full table, but a cell only ever needs the current and previous rows. **Space optimization:** since `dp[i][j]` depends only on the row above and the cell just written, keep a single 1-D array of length `n`; sweeping left to right, `row[j] += row[j-1]` folds in the left neighbour while `row[j]` still holds the value from the row above — reducing space to `O(n)`.\n\n" +
            "**Interview mindset.** 'Count the ways to reach a cell while moving in fixed directions' is the textbook grid-DP trigger: define `dp` as ways-to-reach and add the incoming directions.",
          rcs:
            "class Solution:\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:\n" +
            "        # dp[j] = number of paths to the current row's column j.\n" +
            "        # Start as the first row: exactly one way to reach any edge cell.\n" +
            "        dp = [1] * n\n" +
            "        for i in range(1, m):                # For each subsequent row...\n" +
            "            for j in range(1, n):            # ...update columns left to right.\n" +
            "                # dp[j] still holds the value from the row ABOVE (i-1, j);\n" +
            "                # dp[j-1] already holds the LEFT neighbour (i, j-1).\n" +
            "                dp[j] += dp[j - 1]           # above + left, stored in place.\n" +
            "        return dp[n - 1]                     # Bottom-right count.",
          plain:
            "class Solution:\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:\n" +
            "        dp = [1] * n\n" +
            "        for i in range(1, m):\n" +
            "            for j in range(1, n):\n" +
            "                dp[j] += dp[j - 1]\n" +
            "        return dp[n - 1]"
        },
        {
          name: "Combinatorics — C(m+n-2, m-1)",
          time: "O(min(m, n))",
          space: "O(1)",
          whenToUse: "When you recognize the closed form: no obstacles, pure right/down grid.",
          logic:
            "**What it asks.** Count the distinct right/down paths across an `m x n` grid — but here we solve it with counting math instead of a table.\n\n" +
            "**Key Idea.** Every valid path is a sequence of exactly `(m-1)` down-moves and `(n-1)` right-moves — `(m+n-2)` moves in total. A path is fully determined by **which of those move-slots are the downs**. So the count is just the number of ways to choose the `m-1` down positions among `m+n-2` slots: the binomial coefficient `C(m+n-2, m-1)` (equivalently `C(m+n-2, n-1)`).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Recognize the total move count is `m+n-2` and the number of downs is `m-1`.\n" +
            "2. Compute `C(m+n-2, m-1)` with a multiplicative loop to avoid overflow and huge factorials — multiply by numerator terms and divide by denominator terms as you go.\n" +
            "3. Choose the smaller of `m-1` and `n-1` as the count to keep the loop short.\n\n" +
            "**Why it works.** There is a bijection between paths and choices of down-move positions: distinct choices give distinct paths, and every path yields exactly one choice. Counting the choices therefore counts the paths exactly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Computing `(m+n-2)!` directly overflows and is wasteful — build the coefficient incrementally instead.\n" +
            "- This closed form only holds for an unobstructed pure right/down grid; add any obstacle or weight and you must fall back to the DP.\n\n" +
            "**Complexity.** `O(min(m,n))` multiplications and `O(1)` space — the fastest possible.\n\n" +
            "**Interview mindset.** Offer it as the elegant alternative after the DP: it shows you see the structure (a fixed multiset of moves), but be clear the DP is what generalizes once obstacles appear.",
          rcs:
            "import math\n" +
            "\n" +
            "class Solution:\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:\n" +
            "        # A path is m-1 downs and n-1 rights in some order:\n" +
            "        # choose which of the (m+n-2) moves are the downs.\n" +
            "        return math.comb(m + n - 2, m - 1)   # C(m+n-2, m-1).",
          plain:
            "import math\n" +
            "\n" +
            "class Solution:\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:\n" +
            "        return math.comb(m + n - 2, m - 1)"
        }
      ],
      patternRecognition: [
        "Counting paths through a grid with fixed move directions (right/down).",
        "'Number of ways to reach a cell' → dp = sum of the ways from each allowed incoming direction.",
        "No obstacles and pure right/down movement also admits the closed-form C(m+n-2, m-1)."
      ],
      interviewRecall: [
        "Transition: dp[i][j] = dp[i-1][j] + dp[i][j-1]; first row/col are all 1.",
        "Collapse to a 1-D row and do dp[j] += dp[j-1] for O(n) space.",
        "Combinatorial answer is C(m+n-2, m-1) — mention it, but DP generalizes to obstacles."
      ]
    },

    {
      id: "longest-common-subsequence",
      lc: 1143,
      title: "Longest Common Subsequence",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/longest-common-subsequence/",
      meta: { pattern: "String DP", dataStructure: "2-D Array", technique: "Match-diagonal / skip" },
      description:
        "Given two strings `text1` and `text2`, return the length of their **longest common subsequence**. If there is no common subsequence, return `0`.\n\n" +
        "A **subsequence** is formed by deleting zero or more characters from a string without changing the order of the remaining ones (for example, `ace` is a subsequence of `abcde`). A **common** subsequence is one that appears in both strings.",
      constraints: [
        "`1 <= text1.length, text2.length <= 1000`",
        "`text1` and `text2` consist only of lowercase English letters."
      ],
      notes: [
        "Characters must keep their relative order; they need not be contiguous.",
        "You return the LENGTH, not the subsequence itself."
      ],
      examples: [
        {
          input: 'text1 = "abcde", text2 = "ace"',
          output: "3",
          reasoning: 'The longest common subsequence is "ace", of length 3.',
          visual:
            "```\n        \"\"  a  c  e\n    \"\"   0  0  0  0\n    a    0  1  1  1\n    b    0  1  1  1\n    c    0  1  2  2\n    d    0  1  2  2\n    e    0  1  2  3  <- LCS length\n\nmatch -> diagonal + 1;  else -> max(up, left)\n```"
        },
        {
          input: 'text1 = "abc", text2 = "abc"',
          output: "3",
          reasoning: "Identical strings; the whole string is the common subsequence."
        },
        {
          input: 'text1 = "abc", text2 = "def"',
          output: "0",
          reasoning: "No character is shared, so the longest common subsequence is empty."
        },
        {
          input: 'text1 = "bl", text2 = "yby"',
          output: "1",
          reasoning: 'Only "b" is common; length 1.'
        }
      ],
      approaches: [
        {
          name: "2-D DP (LCS table)",
          time: "O(m * n)",
          space: "O(m * n)",
          whenToUse: "The canonical, easy-to-explain version; build the full table when you may need to reconstruct the subsequence.",
          logic:
            "**What it asks.** Find the length of the longest sequence of characters that appears, in the same relative order (but not necessarily contiguously), in both `text1` and `text2`.\n\n" +
            "**Why the naive idea fails.** You could enumerate every subsequence of `text1` and test membership in `text2` — but there are `2^m` subsequences, hopelessly exponential. Even the natural recursion on the two indices (if the front characters match, take them and advance both; otherwise try advancing each side and keep the max) re-solves the same `(i,j)` pairs over and over.\n\n" +
            "**Key Idea.** Define `dp[i][j]` = the length of the LCS of the first `i` characters of `text1` and the first `j` characters of `text2`. Compare the two strings by their prefixes and look at the last character of each. If `text1[i-1] == text2[j-1]`, that shared character can be the tail of an LCS, so the answer is `1 +` the LCS of the two strings with those characters removed. If they differ, at least one of those last characters is not in the LCS, so drop one side and take the better of the two options.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[0][j] = dp[i][0] = 0` — an empty string shares nothing. This is why the table carries an extra leading row and column of zeros.\n" +
            "2. Transition (in words): when the current characters **match** (`text1[i-1] == text2[j-1]`), extend the diagonal result — `dp[i][j] = dp[i-1][j-1] + 1`. When they **mismatch**, take the best of dropping the last character of one string or the other — `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.\n" +
            "3. Fill the table row by row so each cell can read its already-computed diagonal, up, and left neighbours.\n" +
            "4. The answer is `dp[m][n]`, covering both full strings.\n\n" +
            "**Why it works.** Any common subsequence either uses the pair of equal last characters — captured by the diagonal `+ 1` case — or does not use at least one of them — captured by taking the max after dropping one side. These two cases are exhaustive, and each subproblem is optimal by induction, so the recurrence yields the true optimum. This is optimal substructure plus overlapping subproblems, the DP hallmark.\n\n" +
            "**Common Gotchas.**\n" +
            "- Off-by-one on indexing: `dp[i][j]` refers to `text1[i-1]` and `text2[j-1]` because of the zero-padded row/column.\n" +
            "- This is a subsequence, not a substring — order matters but contiguity does not; do not require adjacency.\n" +
            "- Forgetting the extra zero row and column, which the base cases rely on.\n\n" +
            "**Complexity.** `m*n` cells with `O(1)` work each → time `O(m*n)`, space `O(m*n)`. **Space optimization:** each row depends only on the row above and the current row, so two rolling 1-D arrays of length `n+1` (or even one array with a saved diagonal value) shrink space to `O(n)`.\n\n" +
            "**Interview mindset.** 'Compare two sequences / an edit-style problem' → reach for a 2-D table indexed by prefixes of each string, with a match-diagonal-versus-skip transition. LCS is the template for edit distance and many variants.",
          rcs:
            "class Solution:\n" +
            "    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n" +
            "        m, n = len(text1), len(text2)\n" +
            "        # dp[i][j] = LCS length of text1[:i] and text2[:j].\n" +
            "        # Extra row/col of zeros handles the empty-prefix base cases.\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if text1[i - 1] == text2[j - 1]:  # Characters match:\n" +
            "                    dp[i][j] = dp[i - 1][j - 1] + 1  # extend the diagonal LCS.\n" +
            "                else:                             # Mismatch:\n" +
            "                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])  # drop one char.\n" +
            "        return dp[m][n]                          # LCS of the full strings.",
          plain:
            "class Solution:\n" +
            "    def longestCommonSubsequence(self, text1: str, text2: str) -> int:\n" +
            "        m, n = len(text1), len(text2)\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if text1[i - 1] == text2[j - 1]:\n" +
            "                    dp[i][j] = dp[i - 1][j - 1] + 1\n" +
            "                else:\n" +
            "                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n" +
            "        return dp[m][n]"
        }
      ],
      patternRecognition: [
        "Two strings/sequences compared for a shared ordered pattern → 2-D prefix DP.",
        "Order matters but contiguity does not (subsequence, not substring).",
        "Match => take diagonal + 1; mismatch => max of dropping one side."
      ],
      interviewRecall: [
        "dp[i][j] = LCS of the first i and first j characters; pad with a zero row and column.",
        "Match: dp[i-1][j-1] + 1. Mismatch: max(dp[i-1][j], dp[i][j-1]).",
        "Same skeleton powers edit distance; roll to two rows for O(n) space."
      ]
    },

    {
      id: "maximum-profit-in-job-scheduling",
      lc: 1235,
      title: "Maximum Profit in Job Scheduling",
      difficulty: "Hard",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/maximum-profit-in-job-scheduling/",
      meta: { pattern: "Weighted Interval Scheduling", dataStructure: "Sorted array + DP", technique: "Sort by end + binary search" },
      description:
        "You are given `n` jobs, where job `i` runs during the half-open time interval `[startTime[i], endTime[i])` and pays `profit[i]`. You may take any subset of jobs as long as **no two chosen jobs overlap in time** — a job that starts exactly when another ends is allowed.\n\n" +
        "Return the **maximum total profit** you can earn.",
      constraints: [
        "`1 <= startTime.length == endTime.length == profit.length <= 5 * 10^4`",
        "`1 <= startTime[i] < endTime[i] <= 10^9`",
        "`1 <= profit[i] <= 10^4`"
      ],
      notes: [
        "Two jobs conflict only if their open intervals overlap; `end == start` of the next is fine.",
        "This is the weighted version of interval scheduling — a greedy 'fewest overlaps' rule does NOT work because profits differ."
      ],
      examples: [
        {
          input: "startTime = [1,2,3,3], endTime = [3,4,5,6], profit = [50,10,40,70]",
          output: "120",
          reasoning: "Take job 0 ([1,3), 50) and job 3 ([3,6), 70): they do not overlap and total 120.",
          visual:
            "```\ntime: 1  2  3  4  5  6\njob0 [==50==)\njob1    [==10==)\njob2       [===40===)\njob3       [======70=====)\n\nchoose job0 + job3  ->  50 + 70 = 120\n```"
        },
        {
          input: "startTime = [1,2,3,4,6], endTime = [3,5,10,6,9], profit = [20,20,100,70,60]",
          output: "150",
          reasoning: "Take job 0 ([1,3),20), job 3 ([4,6),70), job 4 ([6,9),60) = 150; the fat 100-profit job blocks too much."
        },
        {
          input: "startTime = [1,1,1], endTime = [2,3,4], profit = [5,6,4]",
          output: "6",
          reasoning: "All three start at 1 and thus mutually overlap; take the single most profitable, 6."
        },
        {
          input: "startTime = [1,2], endTime = [2,3], profit = [50,50]",
          output: "100",
          reasoning: "Job 0 ends exactly when job 1 starts, so they do not conflict; take both for 100."
        }
      ],
      approaches: [
        {
          name: "Sort by end time + DP with binary search",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "The canonical weighted-interval-scheduling solution whenever intervals carry values you must maximize.",
          logic:
            "**What it asks.** From a set of jobs, each with a start time, an end time, and a profit, pick a subset of **non-overlapping** jobs (a job may start exactly when another ends) so that the total profit is maximized — the classic **weighted interval scheduling** problem.\n\n" +
            "**Why the naive idea fails.** Unweighted interval scheduling (maximize the *count* of jobs) has a clean greedy rule: always take the job that ends earliest. But here profits differ, so 'earliest finish' or 'fewest conflicts' can skip a single hugely profitable job and lose. The differing weights are exactly what breaks greedy and force a DP.\n\n" +
            "**Key Idea.** Sort the jobs by **end time** and define `dp[i]` = the maximum profit obtainable using only the first `i` jobs in that sorted order. For each job you then face a binary either/or: **skip it** (carry the best profit so far) or **take it** (its profit plus the best profit achievable among jobs that finish at or before this job's start). Sorting by end time is what makes 'the best profit up to a given time' a monotonic quantity you can look back into — and it guarantees the compatible earlier jobs always form a prefix, so a binary search can locate them.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: `dp[0] = 0` — no jobs means no profit.\n" +
            "2. Zip the jobs together and sort them by end time; keep a separate array of the sorted end times for binary searching.\n" +
            "3. Transition (in words): for job `i` with start `s` and profit `p`, `dp[i]` is the better of **skipping** it (`dp[i-1]`) or **taking** it (`p + dp[k]`), where `k` is the count of jobs whose end time is `<= s` — the last job compatible with job `i`.\n" +
            "4. Find `k` with a binary search (`bisect_right` on the sorted end times against the start `s`), since `end == start` does not conflict.\n" +
            "5. The answer is `dp[n]`.\n\n" +
            "**Why it works.** Consider the optimal subset restricted to the first `i` jobs. Either it excludes job `i` — then it is optimal for the first `i-1` jobs, i.e. `dp[i-1]` — or it includes job `i`, in which case every other chosen job must end by job `i`'s start (non-overlap), so the rest is an optimal solution over the compatible prefix, i.e. `dp[k]`. These two cases are exhaustive, so their max is the optimum, and induction over `i` completes the proof. The end-time sort is what guarantees the compatible jobs form a prefix that `bisect` can pinpoint.\n\n" +
            "**Common Gotchas.**\n" +
            "- Sort by **end** time, not start time — sorting by start breaks the prefix property the binary search relies on.\n" +
            "- `end == start` is allowed, so use `bisect_right` on the start value (not `bisect_left`), or you will wrongly reject jobs that merely touch.\n" +
            "- Keep the `dp` array 1-indexed against the sorted jobs so `dp[i-1]` (skip) and `dp[k]` (compatible prefix) line up correctly.\n\n" +
            "**Complexity.** Sorting is `O(n log n)`, and each of the `n` jobs does one `O(log n)` binary search → `O(n log n)` total, with `O(n)` space for the `dp` and end-time arrays.\n\n" +
            "**Interview mindset.** Intervals + a value to maximize + a non-overlap constraint → name it 'weighted interval scheduling': sort by end time, run a DP, and binary-search for the last compatible job. The give-away that greedy is wrong is that the intervals are *weighted*.",
          rcs:
            "import bisect\n" +
            "\n" +
            "class Solution:\n" +
            "    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:\n" +
            "        # Pair the jobs and sort by END time so 'compatible earlier jobs'\n" +
            "        # always form a prefix we can binary-search.\n" +
            "        jobs = sorted(zip(endTime, startTime, profit))\n" +
            "        ends = [e for e, s, p in jobs]        # Sorted end times, for bisect.\n" +
            "        n = len(jobs)\n" +
            "        # dp[i] = max profit using the first i jobs (in end-time order).\n" +
            "        dp = [0] * (n + 1)\n" +
            "        for i in range(1, n + 1):\n" +
            "            e, s, p = jobs[i - 1]\n" +
            "            # k = number of jobs whose end time <= this job's start time.\n" +
            "            # bisect_right on start s over the sorted ends gives that count,\n" +
            "            # allowing end == start (jobs touching at a point don't conflict).\n" +
            "            k = bisect.bisect_right(ends, s)\n" +
            "            take = p + dp[k]                  # Take job i + best compatible prefix.\n" +
            "            skip = dp[i - 1]                  # Or ignore job i entirely.\n" +
            "            dp[i] = max(take, skip)\n" +
            "        return dp[n]",
          plain:
            "import bisect\n" +
            "\n" +
            "class Solution:\n" +
            "    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:\n" +
            "        jobs = sorted(zip(endTime, startTime, profit))\n" +
            "        ends = [e for e, s, p in jobs]\n" +
            "        n = len(jobs)\n" +
            "        dp = [0] * (n + 1)\n" +
            "        for i in range(1, n + 1):\n" +
            "            e, s, p = jobs[i - 1]\n" +
            "            k = bisect.bisect_right(ends, s)\n" +
            "            take = p + dp[k]\n" +
            "            skip = dp[i - 1]\n" +
            "            dp[i] = max(take, skip)\n" +
            "        return dp[n]"
        }
      ],
      patternRecognition: [
        "Intervals each carrying a value/profit, choose non-overlapping ones to maximize the total.",
        "Greedy 'earliest finish' is tempting but WRONG because the intervals are weighted.",
        "Sort by end time, then DP + binary search for the last non-conflicting job."
      ],
      interviewRecall: [
        "Recurrence: dp[i] = max(skip = dp[i-1], take = profit + dp[last compatible]).",
        "Sort by END time so compatible earlier jobs form a prefix; bisect_right(ends, start) finds it.",
        "end == start is allowed, so use bisect_right on the start value (not bisect_left)."
      ]
    },

    {
      id: "regular-expression-matching",
      lc: 10,
      title: "Regular Expression Matching",
      difficulty: "Hard",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/regular-expression-matching/",
      meta: { pattern: "String DP", dataStructure: "2-D Array", technique: "Pattern matching with '*'" },
      description:
        "Given an input string `s` and a pattern `p`, implement regular-expression matching where:\n\n" +
        "- `.` matches **any single character**.\n" +
        "- `*` matches **zero or more** of the character **immediately preceding it**.\n\n" +
        "The match must cover the **entire** input string `s`, not just a part of it. Return `true` if `p` matches all of `s`.",
      constraints: [
        "`1 <= s.length <= 20`",
        "`1 <= p.length <= 20`",
        "`s` contains only lowercase English letters.",
        "`p` contains lowercase letters plus `.` and `*`.",
        "Every `*` in `p` has a valid character or `.` immediately before it."
      ],
      notes: [
        "`*` is a quantifier on the preceding token, not a wildcard by itself — `a*` means 'zero or more a's', not 'any string'.",
        "`.*` therefore matches any sequence of characters (including the empty string).",
        "Matching must consume the whole string; a partial match returns false."
      ],
      examples: [
        {
          input: 's = "aa", p = "a"',
          output: "false",
          reasoning: '"a" matches only a single "a", but the string is "aa", so the whole input is not covered.'
        },
        {
          input: 's = "aa", p = "a*"',
          output: "true",
          reasoning: '"a*" means zero or more "a", which can expand to "aa".',
          visual:
            "```\n         \"\"   a    a      (s across the top)\n    \"\"    T    F    F\n    a     F    T    F\n    *     T    T    T   (p = \"a*\", '*' pairs with 'a')\n\n'*' cell = (skip a* : two left)  OR  (use one more a : one up)\n```"
        },
        {
          input: 's = "ab", p = ".*"',
          output: "true",
          reasoning: '".*" is zero or more of "." (any char), so it matches the whole "ab".'
        },
        {
          input: 's = "aab", p = "c*a*b"',
          output: "true",
          reasoning: '"c*" matches zero c\'s, "a*" matches "aa", and "b" matches "b".'
        },
        {
          input: 's = "mississippi", p = "mis*is*p*."',
          output: "false",
          reasoning: "The pattern cannot consume the full string; matching stops short, so it is false."
        }
      ],
      approaches: [
        {
          name: "2-D DP over string and pattern",
          time: "O(m * n)",
          space: "O(m * n)",
          whenToUse: "The robust, provably-correct approach for full-string regex matching with '.' and '*'.",
          logic:
            "**What it asks.** Decide whether the pattern `p` matches the **entire** string `s`, where `.` matches any single character and `*` matches zero or more copies of the token immediately preceding it.\n\n" +
            "**Why the naive idea fails.** You can recurse over positions in `s` and `p`, but the trouble is `*`: at each `*` you may consume zero characters, or one-more-and-stay, so the recursion branches heavily and re-visits the same `(i,j)` position pairs exponentially. Memoizing those states is exactly what turns it into the DP below.\n\n" +
            "**Key Idea.** Let `dp[i][j]` be `True` if the first `i` characters of `s` match the first `j` characters of `p`. All that matters is how far into `s` and how far into `p` we are, so we can decide each cell character by character — with `*` always handled as a **pair** with the token before it — by looking back at shorter prefixes. The answer is `dp[m][n]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[0][0] = True` (empty pattern matches empty string); `dp[i][0] = False` for `i > 0` (a non-empty string cannot match an empty pattern). Then seed the **first row** `dp[0][j]`: a non-empty pattern can still match the empty string when a `*` erases its token, so whenever `p[j-1] == '*'`, set `dp[0][j] = dp[0][j-2]`. This handles patterns like `a*`, `a*b*`, and `.*`.\n" +
            "2. Transition (in words), for `i>=1, j>=1`, based on `p[j-1]`:\n" +
            "   - **Ordinary char or `.`** (matches `s[i-1]`): this token consumes one string char, so inherit the shorter-suffix result — `dp[i][j] = dp[i-1][j-1]`.\n" +
            "   - **`*`** (quantifying `p[j-2]`): combine two possibilities with OR. **Zero occurrences** — ignore the `*` and its token, `dp[i][j-2]`. **One or more occurrences** — only if the token `p[j-2]` matches `s[i-1]` (equal or `.`); then consume that string char and stay on the same `*` to allow more repeats, `dp[i-1][j]`.\n" +
            "   - **Mismatch** (a plain char that differs): `dp[i][j] = False`.\n" +
            "3. Fill the `(m+1) x (n+1)` table after seeding row 0, sweeping `i` then `j`; each cell reads only earlier cells. Return `dp[m][n]`.\n\n" +
            "**Why it works.** A `*` group `x*` in any match either contributes **no** copies of `x` — identical to deleting `x*`, i.e. `dp[i][j-2]` — or **at least one** copy, whose final copy must match the last string char `s[i-1]`; peeling that copy off leaves the rest of the string still facing the same `x*` (since `*` permits more), i.e. `dp[i-1][j]`. Every match falls into exactly one of these cases, so the OR is exhaustive and sound. The plain-char and `.` cases are direct one-to-one consumption. With the base cases, induction over `(i,j)` proves the whole table correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- `*` is a quantifier on the *preceding* token, never a wildcard on its own — always pair it with `p[j-2]`, never evaluate it alone.\n" +
            "- Forgetting to seed the first row means patterns that erase to empty (like `a*` against `\"\"`) wrongly fail.\n" +
            "- The match must cover the whole string — return `dp[m][n]`, not any earlier partial match.\n" +
            "- Off-by-one: `dp[i][j]` reasons about `s[i-1]` and `p[j-1]` because of the zero-padded row and column.\n\n" +
            "**Complexity.** `(m+1)(n+1)` cells with `O(1)` work each → time `O(m*n)`, space `O(m*n)`. **Space optimization:** row `i` depends only on row `i` itself (via `j-2`) and row `i-1` (via the `*` repeat), so two rolling rows of length `n+1` reduce space to `O(n)`.\n\n" +
            "**Interview mindset.** The whole difficulty is the `*`: treat it as a pair with its preceding token and split into 'zero copies (jump two back)' versus 'one-more copy (stay, move one string char up)'. Seeding the first row for patterns that erase to empty is the classic missed edge case.",
          rcs:
            "class Solution:\n" +
            "    def isMatch(self, s: str, p: str) -> bool:\n" +
            "        m, n = len(s), len(p)\n" +
            "        # dp[i][j] = does s[:i] match p[:j]?\n" +
            "        dp = [[False] * (n + 1) for _ in range(m + 1)]\n" +
            "        dp[0][0] = True                       # Empty pattern matches empty string.\n" +
            "        # First row: patterns like a*, a*b*, .* can match the empty string\n" +
            "        # by letting each '*' erase its token (contribute zero copies).\n" +
            "        for j in range(2, n + 1):\n" +
            "            if p[j - 1] == '*':\n" +
            "                dp[0][j] = dp[0][j - 2]       # Skip the '*' and its preceding token.\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if p[j - 1] == '*':           # '*' quantifies p[j-2].\n" +
            "                    # Case 1: zero occurrences -> drop the token+'*' pair.\n" +
            "                    dp[i][j] = dp[i][j - 2]\n" +
            "                    # Case 2: one-or-more -> the token must match s[i-1],\n" +
            "                    # then consume that char and stay on the same '*'.\n" +
            "                    if p[j - 2] == s[i - 1] or p[j - 2] == '.':\n" +
            "                        dp[i][j] = dp[i][j] or dp[i - 1][j]\n" +
            "                elif p[j - 1] == s[i - 1] or p[j - 1] == '.':\n" +
            "                    # Plain char or '.': consume one matching char on each side.\n" +
            "                    dp[i][j] = dp[i - 1][j - 1]\n" +
            "                # else: literal mismatch -> dp[i][j] stays False.\n" +
            "        return dp[m][n]",
          plain:
            "class Solution:\n" +
            "    def isMatch(self, s: str, p: str) -> bool:\n" +
            "        m, n = len(s), len(p)\n" +
            "        dp = [[False] * (n + 1) for _ in range(m + 1)]\n" +
            "        dp[0][0] = True\n" +
            "        for j in range(2, n + 1):\n" +
            "            if p[j - 1] == '*':\n" +
            "                dp[0][j] = dp[0][j - 2]\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if p[j - 1] == '*':\n" +
            "                    dp[i][j] = dp[i][j - 2]\n" +
            "                    if p[j - 2] == s[i - 1] or p[j - 2] == '.':\n" +
            "                        dp[i][j] = dp[i][j] or dp[i - 1][j]\n" +
            "                elif p[j - 1] == s[i - 1] or p[j - 1] == '.':\n" +
            "                    dp[i][j] = dp[i - 1][j - 1]\n" +
            "        return dp[m][n]"
        }
      ],
      patternRecognition: [
        "Full-string pattern matching with quantifiers ('*') and wildcards ('.') → 2-D DP over s and p.",
        "'*' repeats the PRECEDING token — always handle it paired with p[j-2], never alone.",
        "Whenever a pattern token can consume zero characters, you need first-row / base-case seeding."
      ],
      interviewRecall: [
        "dp[i][j] = does s[:i] match p[:j]; dp[0][0] = True.",
        "'*' split: zero copies -> dp[i][j-2]; one-or-more (token matches s[i-1]) -> dp[i-1][j].",
        "Seed the first row: dp[0][j] = dp[0][j-2] when p[j-1]=='*' so a*, .* can match empty."
      ]
    }
  ]);
})();
