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
            "**Why the naive idea fails.** The obvious recursion is `paths(i,j) = paths(i+1,j) + paths(i,j+1)`, bottoming out at the goal. But it re-explores the same cells over and over — the number of recursive branches blows up to roughly `2^(m+n)`, far too slow even for a 100x100 grid. Every overlapping subproblem here is a `(i,j)` cell whose answer never changes, which is exactly the signal to cache it in a table.\n\n" +
            "**Key Idea.** Let `dp[i][j]` be the number of distinct paths from the start `(0,0)` to cell `(i,j)`. The only way to arrive at `(i,j)` is from directly **above** `(i-1,j)` (a down-move) or directly **left** `(i,j-1)` (a right-move). Those two families of paths are disjoint (a path's final move is either down or right, never both) and together cover every path, so the count at a cell is simply the sum of the counts of its top and left neighbours.\n\n" +
            "**The DP, stated precisely.**\n" +
            "- **Meaning:** `dp[i][j]` = number of distinct right/down paths from `(0,0)` to `(i,j)`.\n" +
            "- **Base cases:** `dp[0][0] = 1` (the single empty path). The entire **first row** `dp[0][j] = 1` and **first column** `dp[i][0] = 1` — along an edge there is exactly one straight-line way to arrive (all rights, or all downs).\n" +
            "- **Transition:** for every interior cell, `dp[i][j] = dp[i-1][j] + dp[i][j-1]` — the ways from above plus the ways from the left.\n" +
            "- **Fill order:** row by row, and left to right within a row (or column by column), so both the `dp[i-1][j]` (above) and `dp[i][j-1]` (left) a cell reads are already final.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Seed the base cases: the first row and first column are all `1`.\n" +
            "2. For each interior cell in fill order, apply `dp[i][j] = dp[i-1][j] + dp[i][j-1]`.\n" +
            "3. The answer is `dp[m-1][n-1]`, the count at the bottom-right corner.\n\n" +
            "**Why it works.** By induction on the cells in fill order: if `dp[i-1][j]` and `dp[i][j-1]` correctly count the paths to those cells, then since any path to `(i,j)` ends with exactly one final move — from above or from the left — summing the two counts tallies every path to `(i,j)` exactly once. No path is double-counted, because its last move is uniquely 'from above' or 'from the left', and none is missed, because those are the only two ways in.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to seed the whole first row and first column to `1` — a single missed edge cell corrupts everything downstream.\n" +
            "- The `1 x 1` grid must return `1` (start already equals finish), which the base case `dp[0][0] = 1` handles.\n" +
            "- Iterating in the wrong order so a cell reads a neighbour that hasn't been filled yet.\n\n" +
            "**Complexity.** Time `O(m*n)` — each of the `m*n` cells is filled once with `O(1)` work. Space `O(m*n)` for the full table, but a cell only ever needs the current and previous rows. **Space optimization:** since `dp[i][j]` depends only on the row above and the cell just written, keep a single 1-D array of length `n`; sweeping left to right, `row[j] += row[j-1]` folds in the left neighbour while `row[j]` still holds the value from the row above — reducing space to `O(n)` (this is the version implemented here).\n\n" +
            "**Interview mindset.** 'Count the ways to reach a cell while moving in fixed directions' is the textbook grid-DP trigger: define `dp` as ways-to-reach and add the incoming directions. The same skeleton extends directly to grids with obstacles (set blocked cells to `0`) or weighted/min-cost paths (swap the sum for a min).",
          rcs:
            "class Solution:  # LeetCode creates an object of this class and calls uniquePaths on it.\n" +
            "\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:  # Return the count of distinct right/down paths from the top-left to the bottom-right.\n" +
            "\n" +
            "        # ==================== PHASE 1: SEED THE FIRST ROW ====================\n" +
            "\n" +
            "        dp = [1] * n  # dp[j] = number of distinct paths to column j of the row we are currently filling.\n" +
            "                      # Represents row 0: exactly one way to reach any top-edge cell, since you can only move straight right.\n" +
            "                      # State: dp starts as row 0 (all 1s) and is overwritten in place to become each successive row.\n" +
            "                      # Why safe: the whole first row and first column are base cases equal to 1; dp[0] stays 1 throughout.\n" +
            "\n" +
            "        # ==================== PHASE 2: FILL EACH REMAINING ROW ====================\n" +
            "\n" +
            "        for i in range(1, m):  # Advance through rows 1..m-1; row 0 is already the seeded base case.\n" +
            "                               # State: when row i begins, dp[] still holds the fully computed values of row i-1.\n" +
            "                               # Execution flow: after a row is finished, Python moves on to the next i.\n" +
            "\n" +
            "            for j in range(1, n):  # Sweep columns left to right; column 0 is a base case (one way down the left edge) and stays 1.\n" +
            "                                   # Why start at 1: dp[0] is the left-edge count and must not be modified.\n" +
            "                                   # Execution flow: after one j, Python assigns the next column.\n" +
            "\n" +
            "                dp[j] += dp[j - 1]  # Paths to (i,j) = paths from ABOVE (old dp[j], still row i-1) + paths from the LEFT (dp[j-1], already row i).\n" +
            "                                    # Why: the only moves that enter (i,j) are one step down or one step right, so their path counts add.\n" +
            "                                    # State: dp[j] is upgraded in place from its row-i-1 value to its row-i value.\n" +
            "                                    # Why safe: dp[j-1] was already updated this sweep (left, row i); dp[j] not yet, so it still holds above.\n" +
            "\n" +
            "        # ==================== PHASE 3: READ THE ANSWER ====================\n" +
            "\n" +
            "        return dp[n - 1]  # Bottom-right cell (m-1, n-1): the total number of distinct paths to the finish.\n" +
            "                          # Loop invariant at the end: dp[] holds the final row, so dp[n-1] is the answer.",
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
            "import math  # math.comb gives exact binomial coefficients using big-integer arithmetic.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls uniquePaths on it.\n" +
            "\n" +
            "    def uniquePaths(self, m: int, n: int) -> int:  # Return the path count via a closed-form binomial coefficient instead of a table.\n" +
            "\n" +
            "        # ==================== PHASE 1: COUNT THE MOVE ARRANGEMENTS ====================\n" +
            "\n" +
            "        return math.comb(m + n - 2, m - 1)  # Every path is exactly m-1 downs and n-1 rights in some order: m+n-2 moves in total.\n" +
            "                                            # A path is fixed by choosing which of the m+n-2 move-slots are the downs -> C(m+n-2, m-1).\n" +
            "                                            # Why safe: distinct choices of down-positions map one-to-one to distinct paths, counting each once.",
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
            "class Solution:  # LeetCode creates an object of this class and calls longestCommonSubsequence on it.\n" +
            "\n" +
            "    def longestCommonSubsequence(self, text1: str, text2: str) -> int:  # Return the length of the longest common subsequence of text1 and text2.\n" +
            "\n" +
            "        # ==================== PHASE 1: BUILD THE DP TABLE ====================\n" +
            "\n" +
            "        m, n = len(text1), len(text2)  # Cache both lengths; m indexes prefixes of text1, n indexes prefixes of text2.\n" +
            "                                       # Execution flow: Python continues to allocate the table.\n" +
            "\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]  # dp[i][j] = length of the LCS of the prefixes text1[:i] and text2[:j].\n" +
            "                                                    # Base row/col: dp[0][*] = dp[*][0] = 0, since an empty prefix shares nothing (the extra zero row/column).\n" +
            "                                                    # State: every cell starts at 0; interior cells are filled from their diagonal, up, and left neighbours.\n" +
            "\n" +
            "        # ==================== PHASE 2: FILL BY PREFIX LENGTHS ====================\n" +
            "\n" +
            "        for i in range(1, m + 1):  # Grow text1's prefix one character at a time; i corresponds to text1[i-1].\n" +
            "                                   # Execution flow: after a row completes, Python advances to the next i.\n" +
            "\n" +
            "            for j in range(1, n + 1):  # Grow text2's prefix one character at a time; j corresponds to text2[j-1].\n" +
            "                                       # Loop invariant: all cells with a smaller (i,j) are already final when this cell is computed.\n" +
            "\n" +
            "                if text1[i - 1] == text2[j - 1]:  # Do the two current last characters match?\n" +
            "                                                  # Why -1: dp[i][j] reasons about text1[i-1] and text2[j-1] because of the zero-padded row/column.\n" +
            "                    dp[i][j] = dp[i - 1][j - 1] + 1  # Match: extend the LCS of the two shorter prefixes (the DIAGONAL) by this shared character.\n" +
            "                                                     # Why diagonal: dropping both matched characters leaves text1[:i-1] vs text2[:j-1] = dp[i-1][j-1].\n" +
            "                else:  # Mismatch: at least one of the two last characters is not part of the LCS.\n" +
            "                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])  # Drop text1's last char (UP = dp[i-1][j]) or text2's last char (LEFT = dp[i][j-1]); keep the better.\n" +
            "                                                                # Why: those are the only two ways to shorten the problem, and the LCS must survive one of them.\n" +
            "\n" +
            "        # ==================== PHASE 3: READ THE ANSWER ====================\n" +
            "\n" +
            "        return dp[m][n]  # Bottom-right cell: the LCS length over both full strings.\n" +
            "                         # Loop invariant at the end: dp[m][n] holds the true LCS length of text1 and text2.",
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
            "import bisect  # bisect gives an O(log n) binary search over the sorted end times.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls jobScheduling on it.\n" +
            "\n" +
            "    def jobScheduling(self, startTime: List[int], endTime: List[int], profit: List[int]) -> int:  # Return the maximum total profit from a set of non-overlapping jobs (weighted interval scheduling).\n" +
            "\n" +
            "        # ==================== PHASE 1: SORT JOBS BY END TIME ====================\n" +
            "\n" +
            "        jobs = sorted(zip(endTime, startTime, profit))  # Pair each job as (end, start, profit) and sort by end time (the tuple's first field).\n" +
            "                                                        # Why sort by end: it makes the jobs compatible with a later job always form a prefix we can binary-search.\n" +
            "                                                        # State: jobs is now in nondecreasing end-time order.\n" +
            "\n" +
            "        ends = [e for e, s, p in jobs]  # Extract just the sorted end times into their own list for bisect to search.\n" +
            "                                        # Why separate: bisect needs a plain sorted sequence of the keys we compare a start time against.\n" +
            "\n" +
            "        n = len(jobs)  # Total number of jobs.\n" +
            "\n" +
            "        dp = [0] * (n + 1)  # dp[i] = maximum profit obtainable using only the first i jobs in end-time order.\n" +
            "                            # Base case: dp[0] = 0, no jobs means no profit; dp is 1-indexed against the sorted jobs.\n" +
            "\n" +
            "        # ==================== PHASE 2: DP WITH BINARY SEARCH ====================\n" +
            "\n" +
            "        for i in range(1, n + 1):  # Consider the jobs one at a time in end-time order; job i is jobs[i-1].\n" +
            "                                   # Loop invariant: dp[0..i-1] already hold the optimal profit for those prefixes.\n" +
            "\n" +
            "            e, s, p = jobs[i - 1]  # Unpack this job's end e, start s, and profit p.\n" +
            "\n" +
            "            k = bisect.bisect_right(ends, s)  # k = number of jobs whose end time is <= this job's start s (the last compatible earlier job).\n" +
            "                                              # Why bisect_right on s: end == start does NOT conflict, so a job ending exactly at s stays compatible.\n" +
            "                                              # Why safe: ends is sorted, so bisect_right returns the count of ends that are <= s in O(log n).\n" +
            "\n" +
            "            take = p + dp[k]  # TAKE job i: its profit plus the best profit over the compatible prefix dp[k].\n" +
            "                              # Why dp[k]: every other chosen job must end by s, and those jobs are exactly the first k.\n" +
            "\n" +
            "            skip = dp[i - 1]  # SKIP job i: carry the best profit achievable without it.\n" +
            "\n" +
            "            dp[i] = max(take, skip)  # Keep whichever choice yields more profit.\n" +
            "                                     # Why exhaustive: the optimum over the first i jobs either uses job i or it does not.\n" +
            "\n" +
            "        # ==================== PHASE 3: READ THE ANSWER ====================\n" +
            "\n" +
            "        return dp[n]  # dp[n]: the maximum profit using all jobs.\n" +
            "                      # Loop invariant at the end: dp[n] holds the global optimum.",
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
            "class Solution:  # LeetCode creates an object of this class and calls isMatch on it.\n" +
            "\n" +
            "    def isMatch(self, s: str, p: str) -> bool:  # Return True iff pattern p matches the ENTIRE string s ('.' any char, '*' zero-or-more of the previous token).\n" +
            "\n" +
            "        # ==================== PHASE 1: BUILD AND ANCHOR THE TABLE ====================\n" +
            "\n" +
            "        m, n = len(s), len(p)  # Cache both lengths; rows index s, columns index p.\n" +
            "\n" +
            "        dp = [[False] * (n + 1) for _ in range(m + 1)]  # dp[i][j] = does the prefix s[:i] match the prefix p[:j]?\n" +
            "                                                        # State: all cells start False; the zero-padded row/column represent empty prefixes.\n" +
            "\n" +
            "        dp[0][0] = True  # Empty pattern matches empty string.\n" +
            "                         # Why safe: matching nothing against nothing succeeds; this anchors the induction.\n" +
            "\n" +
            "        # ==================== PHASE 2: SEED ROW 0 (PATTERNS THAT ERASE TO EMPTY) ====================\n" +
            "\n" +
            "        for j in range(2, n + 1):  # Fill dp[0][j]: can the first j pattern chars match the EMPTY string?\n" +
            "                                   # Why start at 2: a '*' needs a token before it, so the earliest erasable pair ends at column 2.\n" +
            "            if p[j - 1] == '*':  # Only a '*' can erase its token to contribute zero characters.\n" +
            "                dp[0][j] = dp[0][j - 2]  # Skip the '*' and its preceding token (zero copies) -> look two columns back.\n" +
            "                                         # Why -2: dropping the token+'*' pair lets a*, a*b*, .* all match the empty string.\n" +
            "\n" +
            "        # ==================== PHASE 3: FILL THE TABLE ====================\n" +
            "\n" +
            "        for i in range(1, m + 1):  # Extend s's prefix one character; i corresponds to s[i-1].\n" +
            "            for j in range(1, n + 1):  # Extend p's prefix one character; j corresponds to p[j-1].\n" +
            "                                       # Loop invariant: all cells with a smaller (i,j) are already final.\n" +
            "                if p[j - 1] == '*':  # The current pattern token is '*', which quantifies the preceding token p[j-2].\n" +
            "                    dp[i][j] = dp[i][j - 2]  # Case 1 (zero occurrences): drop the token+'*' pair and look two columns back.\n" +
            "                    if p[j - 2] == s[i - 1] or p[j - 2] == '.':  # Case 2 applies only if the quantified token matches s[i-1] ('.' matches any char).\n" +
            "                        dp[i][j] = dp[i][j] or dp[i - 1][j]  # One-or-more: consume s[i-1] and STAY on this '*' (dp[i-1][j]) so more repeats are allowed.\n" +
            "                                                             # Why dp[i-1][j]: '*' may repeat, so after eating one char the same '*' still faces the shorter string.\n" +
            "                elif p[j - 1] == s[i - 1] or p[j - 1] == '.':  # Plain char or '.': this single token matches the current string char s[i-1].\n" +
            "                    dp[i][j] = dp[i - 1][j - 1]  # Consume one char on each side; inherit the shorter-prefix result (the DIAGONAL).\n" +
            "                                                 # Why: a one-to-one match reduces both prefixes by exactly one character.\n" +
            "                # else: a literal mismatch leaves dp[i][j] at its default False.\n" +
            "\n" +
            "        # ==================== PHASE 4: READ THE ANSWER ====================\n" +
            "\n" +
            "        return dp[m][n]  # Full match over both strings: True iff all of s is matched by all of p.\n" +
            "                         # Why the corner: the match must cover the ENTIRE string, so the answer is dp[m][n].",
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
    },

    {
      id: "best-time-to-buy-and-sell-stock-with-cooldown",
      lc: 309,
      title: "Best Time to Buy and Sell Stock with Cooldown",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/",
      meta: { pattern: "State-machine DP", dataStructure: "1-D rolling states", technique: "hold / sold / rest" },
      description:
        "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. You may complete **as many transactions as you like** (buy one and sell one share, repeatedly), but you may hold **at most one share** at a time and you must **not buy on the day immediately after you sell** — there is a one-day **cooldown** after every sale.\n\n" +
        "Return the **maximum profit** you can achieve. You cannot buy and sell on the same day.",
      constraints: [
        "`1 <= prices.length <= 5000`",
        "`0 <= prices[i] <= 1000`"
      ],
      notes: [
        "You must sell the share you hold before buying again — no stacking shares.",
        "The cooldown applies only after a SELL: the day right after a sale cannot be a buy day."
      ],
      examples: [
        {
          input: "prices = [1,2,3,0,2]",
          output: "3",
          reasoning: "Buy at 1, sell at 3 (profit 2), cooldown on day 3, buy at 0, sell at 2 (profit 1): total 3.",
          visual:
            "```\nday :   0   1   2   3   4\nprice:  1   2   3   0   2\naction: buy  -  sell cd  buy(->sell later)\n\nbuy@1 sell@3 = +2 ; cooldown ; buy@0 sell@2 = +1  ->  3\n```"
        },
        {
          input: "prices = [1]",
          output: "0",
          reasoning: "A single day gives no chance to sell, so profit is 0."
        },
        {
          input: "prices = [2,1]",
          output: "0",
          reasoning: "Prices only fall; the best you can do is never trade, for 0 profit."
        },
        {
          input: "prices = [1,2,4]",
          output: "3",
          reasoning: "Buy at 1 and sell at 4 for 3; splitting into two trades would waste a cooldown day."
        }
      ],
      approaches: [
        {
          name: "State-machine DP (hold / sold / rest)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The clean, canonical way to model transaction problems with an extra constraint like a cooldown or a fee.",
          logic:
            "**What it asks.** Maximize profit over unlimited buy/sell transactions when you may hold at most one share and must sit out (cooldown) for exactly one day after every sale.\n\n" +
            "**Why the naive idea fails.** Trying every subset of buy/sell days is exponential, and a plain greedy 'grab every upward step' rule breaks because the cooldown makes some upward steps not worth taking — you might forfeit a bigger later gain by being frozen. You need to track *what situation you are in* each day, not just the price trend.\n\n" +
            "**Key Idea.** Model each day as one of three mutually exclusive states and let the DP value be the best profit achievable while ending day `i` in that state:\n" +
            "- `hold[i]` = max profit if you currently **own** a share.\n" +
            "- `sold[i]` = max profit if you **just sold** today (so tomorrow is a forced cooldown).\n" +
            "- `rest[i]` = max profit if you own nothing and are **free to buy** (not in cooldown).\n" +
            "The cooldown is captured purely by the wiring: you can only enter `hold` by buying from a previous `rest`, never directly from `sold`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases (day 0): `hold = -prices[0]` (bought today), `sold = 0` (impossible to have just sold, so it contributes nothing / negative-infinity-like), `rest = 0` (did nothing).\n" +
            "2. Transitions (in words) for each new day at price `p`:\n" +
            "   - `hold` = best of staying in hold, or buying today from yesterday's `rest`: `max(hold, rest - p)`.\n" +
            "   - `sold` = you must have been holding and sell today: `hold + p`.\n" +
            "   - `rest` = best of staying rested, or coming off yesterday's cooldown: `max(rest, sold)`.\n" +
            "3. Compute the new triple from the old triple each day (order the updates so each reads yesterday's values).\n" +
            "4. The answer is `max(sold, rest)` on the last day — you never want to end still holding a share.\n\n" +
            "**Why it works.** Every legal trading history ends each day in exactly one of the three states, and each transition corresponds to the only legal moves out of the previous states. The forbidden 'buy right after sell' is impossible by construction because `hold` draws from `rest`, and `rest` can only inherit `sold` one day later — that one-day gap is the cooldown. Taking the max within each state keeps the best history for every state, so induction over days yields the global optimum.\n\n" +
            "**Common Gotchas.**\n" +
            "- Buying must come from `rest`, not from `sold` — wiring `hold = max(hold, sold - p)` silently deletes the cooldown.\n" +
            "- Update all three using the *previous* day's values; overwrite `hold` before you read it for `sold` and you corrupt the day.\n" +
            "- The final answer excludes `hold` — ending while holding an unsold share is never optimal.\n\n" +
            "**Complexity.** Time `O(n)` — one pass, `O(1)` work per day. **Space optimization:** each day depends only on the previous day's three values, so three scalars replace any array — `O(1)` space.\n\n" +
            "**Interview mindset.** 'Unlimited transactions with an extra rule (cooldown / fee / at-most-k)' is the flag for state-machine DP: name the states you can be in, then draw the only arrows between them.",
          rcs:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        # Three states, best profit ending the day in each:\n" +
            "        #   hold = own a share; sold = just sold (tomorrow is cooldown);\n" +
            "        #   rest = own nothing and free to buy.\n" +
            "        hold = float('-inf')                  # can't hold before buying anything\n" +
            "        sold = 0\n" +
            "        rest = 0\n" +
            "        for p in prices:\n" +
            "            prev_hold, prev_sold, prev_rest = hold, sold, rest\n" +
            "            hold = max(prev_hold, prev_rest - p)   # keep holding OR buy from rest\n" +
            "            sold = prev_hold + p                    # sell the share we held\n" +
            "            rest = max(prev_rest, prev_sold)        # stay free OR leave cooldown\n" +
            "        return max(sold, rest)                      # never end still holding",
          plain:
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        hold = float('-inf')\n" +
            "        sold = 0\n" +
            "        rest = 0\n" +
            "        for p in prices:\n" +
            "            prev_hold, prev_sold, prev_rest = hold, sold, rest\n" +
            "            hold = max(prev_hold, prev_rest - p)\n" +
            "            sold = prev_hold + p\n" +
            "            rest = max(prev_rest, prev_sold)\n" +
            "        return max(sold, rest)"
        },
        {
          name: "Top-down memoized recursion (index + holding flag)",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "When you prefer to write the recurrence directly from the decision at each day and let memoization handle overlap.",
          logic:
            "**What it asks.** Same problem — maximum profit with unlimited transactions and a one-day cooldown after each sale.\n\n" +
            "**Key Idea.** Define `dp(i, holding)` = the best profit obtainable from day `i` onward given whether you currently hold a share. At each day you either act or skip, and the cooldown is encoded by **jumping to `i+2`** after a sell instead of `i+1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: if `i >= len(prices)`, no days remain, return `0`.\n" +
            "2. Always consider **doing nothing today** and moving to `i+1` in the same holding state.\n" +
            "3. If `holding`, you may **sell**: add `prices[i]` and recurse to `i+2` not-holding (skipping the cooldown day). If not holding, you may **buy**: subtract `prices[i]` and recurse to `i+1` holding.\n" +
            "4. Return the max of the choices; memoize on `(i, holding)`.\n\n" +
            "**Why it works.** The choices at each day are exhaustive (act or wait), and the `i+2` jump after selling enforces the exact cooldown rule. Memoizing collapses the exponential tree to one value per `(i, holding)` pair.\n\n" +
            "**Common Gotchas.**\n" +
            "- Jump to `i+2` on a **sell**, not on a buy — the cooldown follows selling.\n" +
            "- Without memoization this is exponential; the cache on `(i, holding)` is what makes it linear.\n\n" +
            "**Complexity.** `2n` distinct states, `O(1)` each → time `O(n)`; space `O(n)` for the recursion stack and cache. The bottom-up state machine trims this to `O(1)` space.\n\n" +
            "**Interview mindset.** Writing `dp(i, holding)` first is often the fastest path to a correct recurrence; convert to the three-state iterative form afterward if asked for constant space.",
          rcs:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        n = len(prices)\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dp(i: int, holding: bool) -> int:\n" +
            "            if i >= n:                       # no days left\n" +
            "                return 0\n" +
            "            skip = dp(i + 1, holding)        # do nothing today\n" +
            "            if holding:\n" +
            "                # sell today, then cooldown -> jump to i+2 not holding\n" +
            "                act = prices[i] + dp(i + 2, False)\n" +
            "            else:\n" +
            "                # buy today -> next day holding\n" +
            "                act = -prices[i] + dp(i + 1, True)\n" +
            "            return max(skip, act)\n" +
            "        return dp(0, False)",
          plain:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def maxProfit(self, prices: List[int]) -> int:\n" +
            "        n = len(prices)\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dp(i: int, holding: bool) -> int:\n" +
            "            if i >= n:\n" +
            "                return 0\n" +
            "            skip = dp(i + 1, holding)\n" +
            "            if holding:\n" +
            "                act = prices[i] + dp(i + 2, False)\n" +
            "            else:\n" +
            "                act = -prices[i] + dp(i + 1, True)\n" +
            "            return max(skip, act)\n" +
            "        return dp(0, False)"
        }
      ],
      patternRecognition: [
        "Unlimited transactions plus an extra rule (cooldown / fee) → state-machine DP.",
        "Enumerate the states you can be in each day (hold / sold / rest) and the legal transitions.",
        "A one-day cooldown = buying may only come from 'rest', or a sell jumps forward two days."
      ],
      interviewRecall: [
        "hold = max(hold, rest - p); sold = hold + p; rest = max(rest, sold).",
        "Buying draws from rest (not sold) — that gap IS the cooldown.",
        "Answer is max(sold, rest) on the last day; three scalars give O(1) space."
      ]
    },

    {
      id: "coin-change-ii",
      lc: 518,
      title: "Coin Change II",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/coin-change-ii/",
      meta: { pattern: "Unbounded knapsack (counting)", dataStructure: "1-D DP array", technique: "Coins-outer to avoid permutations" },
      description:
        "You are given an integer array `coins` of distinct denominations and an integer `amount`. Return the **number of combinations** of coins that add up to exactly `amount`. You may use each coin an **unlimited** number of times.\n\n" +
        "Two combinations are the same if they use the same **multiset** of coins — order does **not** matter (so `1+2` and `2+1` count once). If no combination sums to `amount`, return `0`.",
      constraints: [
        "`1 <= coins.length <= 300`",
        "`1 <= coins[i] <= 5000`",
        "All values of `coins` are distinct.",
        "`0 <= amount <= 5000`"
      ],
      notes: [
        "This counts combinations (multisets), NOT permutations — order is irrelevant.",
        "There is always exactly one way to make amount 0: use no coins."
      ],
      examples: [
        {
          input: "amount = 5, coins = [1,2,5]",
          output: "4",
          reasoning: "5 = 5; 5 = 2+2+1; 5 = 2+1+1+1; 5 = 1+1+1+1+1 — four distinct combinations.",
          visual:
            "```\ndp over amounts 0..5, adding one coin denomination at a time\n\nstart:        [1,0,0,0,0,0]\nafter coin 1: [1,1,1,1,1,1]\nafter coin 2: [1,1,2,2,3,3]\nafter coin 5: [1,1,2,2,3,4]  <- dp[5] = 4\n```"
        },
        {
          input: "amount = 3, coins = [2]",
          output: "0",
          reasoning: "No number of 2-coins sums to the odd amount 3."
        },
        {
          input: "amount = 10, coins = [10]",
          output: "1",
          reasoning: "Exactly one combination: a single 10-coin."
        },
        {
          input: "amount = 0, coins = [1,2]",
          output: "1",
          reasoning: "The empty combination makes amount 0 — always exactly one way."
        }
      ],
      approaches: [
        {
          name: "2-D DP (coins x amount)",
          time: "O(len(coins) * amount)",
          space: "O(len(coins) * amount)",
          whenToUse: "The explicit table version — clearest for seeing why iterating coins on the outside avoids double-counting orders.",
          logic:
            "**What it asks.** Count the distinct **combinations** (order-independent multisets) of unlimited-supply coins that sum exactly to `amount`.\n\n" +
            "**Why the naive idea fails.** A recursion that, at every amount, tries adding *any* coin counts `1+2` and `2+1` as different paths — that gives permutations, not combinations, and overcounts. You must impose an order on which coins may be considered so each multiset is generated exactly once.\n\n" +
            "**Key Idea.** Let `dp[i][a]` = the number of combinations of the **first `i` coin types** that sum to `a`. Considering coins one type at a time is what enforces order-independence: once you move past coin type `i`, you never revisit it, so no multiset is built two different ways. For each cell you either **don't use** coin `i` (inherit `dp[i-1][a]`) or **use at least one** copy of coin `i` (add `dp[i][a - coins[i-1]]`, staying on row `i` because the coin is reusable).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[i][0] = 1` for every `i` — there is exactly one way to make amount 0 (take nothing). `dp[0][a] = 0` for `a > 0` — no coin types can make a positive amount.\n" +
            "2. Transition (in words): `dp[i][a] = dp[i-1][a]` (skip coin `i`) `+ dp[i][a - coins[i-1]]` (use one more coin `i`, only when `a >= coins[i-1]`).\n" +
            "3. Fill row by row over coin types, and within a row over amounts `0..amount`.\n" +
            "4. The answer is `dp[len(coins)][amount]`.\n\n" +
            "**Why it works.** Any combination summing to `a` either contains zero copies of coin `i` — counted by `dp[i-1][a]` — or at least one copy, and removing one copy leaves a combination of the first `i` coins summing to `a - coins[i-1]`, counted by `dp[i][a-coins[i-1]]`. These cases partition all combinations, and fixing the coin-type order guarantees each multiset is counted exactly once. Induction over coin types proves correctness.\n\n" +
            "**Common Gotchas.**\n" +
            "- Iterate **coin types on the outside**; swapping the loops so amount is outer counts ordered sequences (permutations) and overcounts.\n" +
            "- Seed `dp[.][0] = 1` — forgetting the empty-combination base case yields all zeros.\n" +
            "- 'Use coin `i`' stays on the **same** row (unbounded reuse), unlike 0/1 knapsack which would use the previous row.\n\n" +
            "**Complexity.** `O(len(coins) * amount)` cells, `O(1)` each → same time; space `O(len(coins) * amount)`. **Space optimization:** each row only reads the row above (skip) and the current row (reuse), so a single 1-D array of length `amount+1` suffices — see the optimized approach.\n\n" +
            "**Interview mindset.** 'Count ways with unlimited reuse, order-independent' = combination-counting unbounded knapsack; the make-or-break detail is putting the item loop outside the capacity loop.",
          rcs:
            "class Solution:\n" +
            "    def change(self, amount: int, coins: List[int]) -> int:\n" +
            "        n = len(coins)\n" +
            "        # dp[i][a] = combinations of the first i coin types summing to a.\n" +
            "        dp = [[0] * (amount + 1) for _ in range(n + 1)]\n" +
            "        for i in range(n + 1):\n" +
            "            dp[i][0] = 1                      # one way to make 0: take nothing\n" +
            "        for i in range(1, n + 1):\n" +
            "            c = coins[i - 1]\n" +
            "            for a in range(1, amount + 1):\n" +
            "                dp[i][a] = dp[i - 1][a]       # skip coin i\n" +
            "                if a >= c:\n" +
            "                    dp[i][a] += dp[i][a - c]  # use one more coin i (reusable)\n" +
            "        return dp[n][amount]",
          plain:
            "class Solution:\n" +
            "    def change(self, amount: int, coins: List[int]) -> int:\n" +
            "        n = len(coins)\n" +
            "        dp = [[0] * (amount + 1) for _ in range(n + 1)]\n" +
            "        for i in range(n + 1):\n" +
            "            dp[i][0] = 1\n" +
            "        for i in range(1, n + 1):\n" +
            "            c = coins[i - 1]\n" +
            "            for a in range(1, amount + 1):\n" +
            "                dp[i][a] = dp[i - 1][a]\n" +
            "                if a >= c:\n" +
            "                    dp[i][a] += dp[i][a - c]\n" +
            "        return dp[n][amount]"
        },
        {
          name: "Optimized — 1-D DP, coins outer",
          time: "O(len(coins) * amount)",
          space: "O(amount)",
          whenToUse: "The compact interview form: same recurrence collapsed to one array.",
          logic:
            "**What it asks.** Same as above — count order-independent coin combinations summing to `amount`.\n\n" +
            "**Key Idea.** In the 2-D table, `dp[i][a]` needs only `dp[i-1][a]` (the row above) and `dp[i][a-c]` (already updated on the current row). Both can live in a single array `dp[a]` if we process **each coin fully before the next** and sweep amounts **increasing**: when we reach `dp[a]`, `dp[a-c]` already includes the current coin (allowing reuse), while `dp[a]` still holds the pre-coin value (the skip case). So `dp[a] += dp[a-c]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: `dp[0] = 1`, all other `dp[a] = 0`.\n" +
            "2. For each coin `c` (outer loop): for `a` from `c` up to `amount` (inner, **increasing**): `dp[a] += dp[a - c]`.\n" +
            "3. The answer is `dp[amount]`.\n\n" +
            "**Why it works.** Fixing the coin as the outer loop keeps combinations order-independent (each coin type is fully absorbed before the next is seen). Sweeping amounts **upward** lets `dp[a-c]` already reflect the current coin, which is exactly the unbounded-reuse (`dp[i][a-c]`) term; a downward sweep would instead give 0/1-knapsack (each coin used at most once).\n\n" +
            "**Common Gotchas.**\n" +
            "- Coin loop **outside**, amount loop inside — reversing them counts permutations.\n" +
            "- Sweep amounts **increasing** for unbounded reuse; decreasing would forbid reusing a coin.\n" +
            "- Start the inner loop at `c` so `a - c >= 0`.\n\n" +
            "**Complexity.** Time `O(len(coins) * amount)`; space `O(amount)` — one array.\n\n" +
            "**Interview mindset.** Memorize the two-line pattern and the loop order: outer = items, inner = capacity increasing → combinations with reuse.",
          rcs:
            "class Solution:\n" +
            "    def change(self, amount: int, coins: List[int]) -> int:\n" +
            "        dp = [0] * (amount + 1)\n" +
            "        dp[0] = 1                             # one way to make 0\n" +
            "        for c in coins:                       # each coin type, once (outer)\n" +
            "            for a in range(c, amount + 1):    # increasing -> allows reuse\n" +
            "                dp[a] += dp[a - c]            # add combos that end with coin c\n" +
            "        return dp[amount]",
          plain:
            "class Solution:\n" +
            "    def change(self, amount: int, coins: List[int]) -> int:\n" +
            "        dp = [0] * (amount + 1)\n" +
            "        dp[0] = 1\n" +
            "        for c in coins:\n" +
            "            for a in range(c, amount + 1):\n" +
            "                dp[a] += dp[a - c]\n" +
            "        return dp[amount]"
        }
      ],
      patternRecognition: [
        "Count ways to reach a target with unlimited reuse, order-independent → combination unbounded knapsack.",
        "dp[a] += dp[a-coin] with the coin loop OUTSIDE the amount loop.",
        "Increasing amount sweep = reuse allowed; decreasing = each item once (0/1)."
      ],
      interviewRecall: [
        "dp[0] = 1; for each coin: for a in range(coin, amount+1): dp[a] += dp[a-coin].",
        "Coins outer avoids counting 1+2 and 2+1 separately (combinations, not permutations).",
        "Combinations vs permutations = which loop is outer; that's the whole trick."
      ]
    },

    {
      id: "target-sum",
      lc: 494,
      title: "Target Sum",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/target-sum/",
      meta: { pattern: "Subset-sum counting", dataStructure: "Hash map / 1-D DP", technique: "Reduce +/- to subset partition" },
      description:
        "You are given an integer array `nums` and an integer `target`. You must place a `+` or a `-` in front of **every** number and concatenate them into an expression. Return the **number of different assignments** of signs that make the expression evaluate to `target`.\n\n" +
        "Every element must receive a sign, and different sign choices on equal-valued elements count as different assignments.",
      constraints: [
        "`1 <= nums.length <= 20`",
        "`0 <= nums[i] <= 1000`",
        "`0 <= sum(nums) <= 1000`",
        "`-1000 <= target <= 1000`"
      ],
      notes: [
        "Every number must get a sign; you cannot skip any element.",
        "Elements with value 0 still get a sign, so a single 0 doubles the count of ways (+0 and -0)."
      ],
      examples: [
        {
          input: "nums = [1,1,1,1,1], target = 3",
          output: "5",
          reasoning: "One number is negative and the rest positive: choosing which single 1 is '-' gives 5 assignments (each nets 4-1 = 3).",
          visual:
            "```\nsplit into P (plus) and N (minus): sum(P) - sum(N) = target\ntotal = 5, target = 3  ->  sum(P) = (5 + 3) / 2 = 4\ncount subsets of nums summing to 4  ->  5 ways\n```"
        },
        {
          input: "nums = [1], target = 1",
          output: "1",
          reasoning: "Only +1 reaches 1; -1 does not."
        },
        {
          input: "nums = [1], target = 2",
          output: "0",
          reasoning: "Neither +1 nor -1 can reach 2."
        },
        {
          input: "nums = [0,0,0,0,0,0,0,0,1], target = 1",
          output: "256",
          reasoning: "The 1 must be +; each of the eight 0's can be + or -, giving 2^8 = 256 assignments."
        }
      ],
      approaches: [
        {
          name: "Reduce to subset-sum count (1-D DP)",
          time: "O(n * S)",
          space: "O(S)",
          whenToUse: "The elegant reduction: turns a signs problem into counting subsets with a fixed sum.",
          logic:
            "**What it asks.** Count the sign assignments (each element gets `+` or `-`) that make the signed total equal `target`.\n\n" +
            "**Why the naive idea fails.** Brute force tries all `2^n` sign combinations. With `n` up to 20 that is a million — borderline — but the cleaner and faster route recognizes the hidden subset structure and counts with a DP over sums instead.\n\n" +
            "**Key Idea.** Let `P` be the subset of elements we make positive and `N` the ones we make negative. Then `sum(P) - sum(N) = target` and `sum(P) + sum(N) = total`. Adding these gives `sum(P) = (total + target) / 2`. So the problem reduces to: **count the subsets of `nums` whose sum equals `(total + target) / 2`** — a standard subset-sum counting DP. Define `dp[s]` = the number of subsets summing to `s`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `total = sum(nums)`. If `total + target` is **odd** or `abs(target) > total`, the required subset sum is not a non-negative integer → return `0`.\n" +
            "2. Let `S = (total + target) // 2`. Base case: `dp[0] = 1` (the empty subset sums to 0).\n" +
            "3. Transition (in words): for each number `x`, sweep sums **downward** from `S` to `x` and do `dp[s] += dp[s - x]` — each element may be included at most once (0/1 knapsack), so the decreasing sweep prevents reusing `x`.\n" +
            "4. The answer is `dp[S]`.\n\n" +
            "**Why it works.** The algebra makes 'sign assignments hitting target' a bijection with 'subsets summing to `S`': choosing which elements are positive *is* choosing the subset `P`. The counting DP is correct because a subset summing to `s` either excludes `x` (`dp[s]` unchanged) or includes it (`dp[s-x]` ways for the rest); the downward sweep ensures each `x` contributes to at most one inclusion. Zeros are handled naturally — a 0 leaves the sum unchanged but still forms a distinct subset choice, doubling counts.\n\n" +
            "**Common Gotchas.**\n" +
            "- Guard the parity: if `(total + target)` is odd, no integer subset sum exists → 0.\n" +
            "- Guard the range: if `abs(target) > total`, impossible → 0.\n" +
            "- Sweep sums **downward** (0/1 knapsack); an upward sweep would allow reusing an element and overcount.\n" +
            "- Do not forget `dp[0] = 1`; zeros in `nums` correctly multiply the count.\n\n" +
            "**Complexity.** Time `O(n * S)` where `S <= total <= 1000`; space `O(S)` for the 1-D array. **Space optimization:** already 1-D; the 2-D `dp[i][s]` form collapses to this single array via the downward sweep.\n\n" +
            "**Interview mindset.** 'Assign +/- to hit a target' → rewrite as `sum(P) = (total+target)/2` and count subsets. Spotting that reduction is the whole insight; the rest is textbook 0/1 subset-sum counting.",
          rcs:
            "class Solution:\n" +
            "    def findTargetSumWays(self, nums: List[int], target: int) -> int:\n" +
            "        total = sum(nums)\n" +
            "        # Need sum(P) = (total + target) / 2, a non-negative integer.\n" +
            "        if (total + target) % 2 != 0 or abs(target) > total:\n" +
            "            return 0\n" +
            "        S = (total + target) // 2\n" +
            "        # dp[s] = number of subsets of nums summing to s.\n" +
            "        dp = [0] * (S + 1)\n" +
            "        dp[0] = 1                             # empty subset sums to 0\n" +
            "        for x in nums:\n" +
            "            for s in range(S, x - 1, -1):     # downward -> each x used once (0/1)\n" +
            "                dp[s] += dp[s - x]\n" +
            "        return dp[S]",
          plain:
            "class Solution:\n" +
            "    def findTargetSumWays(self, nums: List[int], target: int) -> int:\n" +
            "        total = sum(nums)\n" +
            "        if (total + target) % 2 != 0 or abs(target) > total:\n" +
            "            return 0\n" +
            "        S = (total + target) // 2\n" +
            "        dp = [0] * (S + 1)\n" +
            "        dp[0] = 1\n" +
            "        for x in nums:\n" +
            "            for s in range(S, x - 1, -1):\n" +
            "                dp[s] += dp[s - x]\n" +
            "        return dp[S]"
        },
        {
          name: "Top-down memoized recursion (index + running sum)",
          time: "O(n * S)",
          space: "O(n * S)",
          whenToUse: "When you want to model the +/- choice literally without spotting the subset reduction.",
          logic:
            "**What it asks.** Same — count sign assignments that make the signed sum equal `target`.\n\n" +
            "**Key Idea.** Define `dp(i, cur)` = the number of ways to sign the elements from index `i` onward so the running total reaches `target`, given the sum `cur` accumulated so far. At each index you branch on `+nums[i]` and `-nums[i]`; memoize on `(i, cur)` because many sign prefixes reach the same running sum.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: at `i == len(nums)`, return `1` if `cur == target`, else `0`.\n" +
            "2. Transition: `dp(i, cur) = dp(i+1, cur + nums[i]) + dp(i+1, cur - nums[i])` — add the plus branch and the minus branch.\n" +
            "3. Memoize `(i, cur)` so each state is computed once.\n" +
            "4. Return `dp(0, 0)`.\n\n" +
            "**Why it works.** Every sign assignment corresponds to exactly one root-to-leaf path in the +/- decision tree; summing both children at each node counts all leaves that end at `target`. Memoization removes the exponential re-computation over repeated `(i, cur)` pairs.\n\n" +
            "**Common Gotchas.**\n" +
            "- Running sums can be negative; a dict-based cache handles that cleanly.\n" +
            "- Without memoization the tree is `2^n`; the cache on `(i, cur)` is essential.\n\n" +
            "**Complexity.** Distinct states are `O(n * S)` (index times the range of reachable sums), `O(1)` each → time `O(n * S)`; space `O(n * S)` for the cache and stack.\n\n" +
            "**Interview mindset.** If the subset reduction doesn't come to mind, this literal two-branch memoized recursion is a safe, quick-to-write fallback that still passes.",
          rcs:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def findTargetSumWays(self, nums: List[int], target: int) -> int:\n" +
            "        n = len(nums)\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dp(i: int, cur: int) -> int:\n" +
            "            if i == n:                       # all signs placed\n" +
            "                return 1 if cur == target else 0\n" +
            "            # branch on + and - for nums[i]\n" +
            "            return dp(i + 1, cur + nums[i]) + dp(i + 1, cur - nums[i])\n" +
            "        return dp(0, 0)",
          plain:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def findTargetSumWays(self, nums: List[int], target: int) -> int:\n" +
            "        n = len(nums)\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dp(i: int, cur: int) -> int:\n" +
            "            if i == n:\n" +
            "                return 1 if cur == target else 0\n" +
            "            return dp(i + 1, cur + nums[i]) + dp(i + 1, cur - nums[i])\n" +
            "        return dp(0, 0)"
        }
      ],
      patternRecognition: [
        "Assign +/- to every element to hit a target → reduce to subset-sum counting.",
        "sum(P) - sum(N) = target and sum(P) + sum(N) = total → sum(P) = (total+target)/2.",
        "Counting subsets with a fixed sum = 0/1 knapsack with a downward sweep."
      ],
      interviewRecall: [
        "S = (total + target) // 2; return 0 if it isn't a valid non-negative integer.",
        "dp[0] = 1; for x in nums: for s from S down to x: dp[s] += dp[s-x].",
        "Fallback: memoized dp(i, cur) branching on +nums[i] and -nums[i]."
      ]
    },

    {
      id: "interleaving-string",
      lc: 97,
      title: "Interleaving String",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/interleaving-string/",
      meta: { pattern: "String DP", dataStructure: "2-D Array", technique: "Prefix interleave grid" },
      description:
        "Given three strings `s1`, `s2`, and `s3`, return `true` if `s3` is formed by an **interleaving** of `s1` and `s2`.\n\n" +
        "An interleaving of two strings keeps the internal order of each string, splitting them into pieces and alternating: `s3` is an interleaving of `s1` and `s2` if `s3` can be produced by choosing, at each step, the next character from either `s1` or `s2` (in order) until both are exhausted. A necessary first check is `len(s1) + len(s2) == len(s3)`.",
      constraints: [
        "`0 <= s1.length, s2.length <= 100`",
        "`0 <= s3.length <= 200`",
        "`s1`, `s2`, and `s3` consist of lowercase English letters."
      ],
      notes: [
        "The relative order of characters within s1 and within s2 must be preserved.",
        "If len(s1) + len(s2) != len(s3), the answer is immediately false."
      ],
      examples: [
        {
          input: 's1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"',
          output: "true",
          reasoning: 'Interleave as aa (s1) + dbbc (s2) + b (s1) + c (s2) + c (s1) ... producing "aadbbcbcac".',
          visual:
            "```\ndp[i][j] = can s3[:i+j] be made from s1[:i] and s2[:j]?\n\n       \"\"  d  b  b  c  a   (s2 across)\n  \"\"    T  F  F  F  F  F\n  a     T  F  F  F  F  F\n  a     T  T  T  T  T  F\n  b     F  T  T  F  T  F\n  c     F  F  T  T  T  T\n  c     F  F  F  T  F  T  <- dp[5][5] = True\n```"
        },
        {
          input: 's1 = "aabcc", s2 = "dbbca", s3 = "aadbbbaccc"',
          output: "false",
          reasoning: "No interleaving preserving both orders can produce this s3."
        },
        {
          input: 's1 = "", s2 = "", s3 = ""',
          output: "true",
          reasoning: "Two empty strings interleave to the empty string."
        },
        {
          input: 's1 = "a", s2 = "", s3 = "a"',
          output: "true",
          reasoning: 'Taking the single character from s1 yields "a".'
        }
      ],
      approaches: [
        {
          name: "2-D DP over prefixes of s1 and s2",
          time: "O(m * n)",
          space: "O(n)",
          whenToUse: "The standard way to decide interleavings; the grid makes the two source choices explicit.",
          logic:
            "**What it asks.** Decide whether `s3` can be produced by merging `s1` and `s2` while keeping each one's characters in their original order.\n\n" +
            "**Why the naive idea fails.** A greedy 'match whichever source has the same next character' can make the wrong choice when both sources offer the same character, and backtracking over every choice is exponential. The same `(i,j)` prefix state is reached by many different merge orders, so it must be memoized.\n\n" +
            "**Key Idea.** Let `dp[i][j]` be `True` if the first `i` characters of `s1` and the first `j` characters of `s2` can interleave to form the first `i+j` characters of `s3`. Because the total consumed length is always `i+j`, the position in `s3` is determined by `i` and `j` — no third index is needed. You reach `(i,j)` either by taking the last character from `s1` (if `s1[i-1] == s3[i+j-1]` and `(i-1,j)` was reachable) or from `s2` (if `s2[j-1] == s3[i+j-1]` and `(i,j-1)` was reachable).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `len(s1) + len(s2) != len(s3)`, return `False` immediately.\n" +
            "2. Base cases: `dp[0][0] = True`. First column `dp[i][0]` is true only while `s1[:i]` exactly matches `s3[:i]`; first row `dp[0][j]` only while `s2[:j]` matches `s3[:j]`.\n" +
            "3. Transition (in words): `dp[i][j]` is true if **either** the previous state `dp[i-1][j]` is true and `s1`'s next char matches `s3[i+j-1]`, **or** `dp[i][j-1]` is true and `s2`'s next char matches `s3[i+j-1]`.\n" +
            "4. Fill the grid; the answer is `dp[m][n]`.\n\n" +
            "**Why it works.** Any interleaving of the two prefixes ends by placing one final character, which came from either `s1` or `s2`. Those two possibilities are exhaustive, and each reduces to a smaller reachable prefix state. Induction over `i+j` proves every reachable configuration is marked true and no unreachable one is.\n\n" +
            "**Common Gotchas.**\n" +
            "- The length check is mandatory — without it the indexing into `s3[i+j-1]` and the logic both break.\n" +
            "- Seed both the first row and first column correctly; each stays true only up to the first mismatch.\n" +
            "- `s3` position is `i+j-1`, not a separate pointer — deriving it from `i` and `j` is the key simplification.\n\n" +
            "**Complexity.** `(m+1)(n+1)` cells, `O(1)` each → time `O(m*n)`. Space `O(m*n)` for the full grid. **Space optimization:** each row depends only on the row above (`dp[i-1][j]`) and the current row's left neighbour (`dp[i][j-1]`), so a single 1-D array of length `n+1` reduces space to `O(n)`.\n\n" +
            "**Interview mindset.** 'Can two sequences merge into a third, preserving order' → 2-D prefix DP where a third pointer is redundant because it equals `i+j`.",
          rcs:
            "class Solution:\n" +
            "    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:\n" +
            "        m, n = len(s1), len(s2)\n" +
            "        if m + n != len(s3):                 # lengths must add up\n" +
            "            return False\n" +
            "        # dp[i][j] = can s1[:i] and s2[:j] interleave to s3[:i+j]?\n" +
            "        dp = [[False] * (n + 1) for _ in range(m + 1)]\n" +
            "        dp[0][0] = True\n" +
            "        for i in range(1, m + 1):            # first column: only s1 used\n" +
            "            dp[i][0] = dp[i - 1][0] and s1[i - 1] == s3[i - 1]\n" +
            "        for j in range(1, n + 1):            # first row: only s2 used\n" +
            "            dp[0][j] = dp[0][j - 1] and s2[j - 1] == s3[j - 1]\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                k = i + j - 1                # matching position in s3\n" +
            "                take_s1 = dp[i - 1][j] and s1[i - 1] == s3[k]\n" +
            "                take_s2 = dp[i][j - 1] and s2[j - 1] == s3[k]\n" +
            "                dp[i][j] = take_s1 or take_s2\n" +
            "        return dp[m][n]",
          plain:
            "class Solution:\n" +
            "    def isInterleave(self, s1: str, s2: str, s3: str) -> bool:\n" +
            "        m, n = len(s1), len(s2)\n" +
            "        if m + n != len(s3):\n" +
            "            return False\n" +
            "        dp = [[False] * (n + 1) for _ in range(m + 1)]\n" +
            "        dp[0][0] = True\n" +
            "        for i in range(1, m + 1):\n" +
            "            dp[i][0] = dp[i - 1][0] and s1[i - 1] == s3[i - 1]\n" +
            "        for j in range(1, n + 1):\n" +
            "            dp[0][j] = dp[0][j - 1] and s2[j - 1] == s3[j - 1]\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                k = i + j - 1\n" +
            "                take_s1 = dp[i - 1][j] and s1[i - 1] == s3[k]\n" +
            "                take_s2 = dp[i][j - 1] and s2[j - 1] == s3[k]\n" +
            "                dp[i][j] = take_s1 or take_s2\n" +
            "        return dp[m][n]"
        }
      ],
      patternRecognition: [
        "Merge two sequences into a third preserving each one's order → 2-D prefix DP.",
        "The s3 index is i+j-1, so no third dimension is needed.",
        "Reach a cell from above (took s1) or left (took s2) when the char matches s3."
      ],
      interviewRecall: [
        "First check len(s1)+len(s2)==len(s3), else false.",
        "dp[i][j] = (dp[i-1][j] and s1[i-1]==s3[i+j-1]) or (dp[i][j-1] and s2[j-1]==s3[i+j-1]).",
        "Seed first row/col along exact prefix matches; roll to 1-D for O(n) space."
      ]
    },

    {
      id: "longest-increasing-path-in-a-matrix",
      lc: 329,
      title: "Longest Increasing Path in a Matrix",
      difficulty: "Hard",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/longest-increasing-path-in-a-matrix/",
      meta: { pattern: "DFS + memo on a DAG", dataStructure: "2-D memo grid", technique: "Cell-independent longest path" },
      description:
        "Given an `m x n` integer matrix, return the length of the **longest strictly increasing path**. From each cell you may move in the four directions — **up, down, left, right** — to an adjacent cell with a **strictly greater** value; you may not move diagonally or off the grid.\n\n" +
        "The path length is the number of cells it visits.",
      constraints: [
        "`m == matrix.length`",
        "`n == matrix[i].length`",
        "`1 <= m, n <= 200`",
        "`0 <= matrix[i][j] <= 2^31 - 1`"
      ],
      notes: [
        "Moves must be STRICTLY increasing, so equal-valued neighbours are not connected — no cycles are possible.",
        "Because the strict-increase rule forbids cycles, the grid is effectively a DAG and each cell's longest path is fixed."
      ],
      examples: [
        {
          input: "matrix = [[9,9,4],[6,6,8],[2,1,1]]",
          output: "4",
          reasoning: "The longest increasing path is 1 -> 2 -> 6 -> 9 (length 4).",
          visual:
            "```\n 9  9  4\n 6  6  8\n 2  1  1\n\npath: 1 -> 2 -> 6 -> 9   (each step to a strictly larger neighbour)\nlength = 4\n```"
        },
        {
          input: "matrix = [[3,4,5],[3,2,6],[2,2,1]]",
          output: "4",
          reasoning: "3 -> 4 -> 5 -> 6 is a strictly increasing path of length 4."
        },
        {
          input: "matrix = [[1]]",
          output: "1",
          reasoning: "A single cell is a path of length 1."
        },
        {
          input: "matrix = [[7,6,5],[8,9,4]]",
          output: "5",
          reasoning: "5 -> 6 -> 7 -> 8 -> 9 winds through the grid for length 5."
        }
      ],
      approaches: [
        {
          name: "DFS + memoization",
          time: "O(m * n)",
          space: "O(m * n)",
          whenToUse: "The natural solution: each cell's longest outgoing path is fixed, so compute it once and cache.",
          logic:
            "**What it asks.** Find the length of the longest path that strictly increases at every step, moving between the four orthogonal neighbours.\n\n" +
            "**Why the naive idea fails.** Plain DFS from every cell re-explores overlapping tails again and again — the same cell's longest path gets recomputed once per path that reaches it, blowing up exponentially. But that recomputation is wasted work: the answer for a cell never changes.\n\n" +
            "**Key Idea.** Because every step must go to a **strictly greater** value, no path can revisit a cell — the grid behaves like a **DAG**. Define `dp[r][c]` = the length of the longest strictly increasing path that **starts** at cell `(r,c)`. This value depends only on the cell itself and its larger neighbours, never on how you arrived — so it can be computed once and memoized. `dp[r][c] = 1 + max(dp of each strictly-greater neighbour)`, or `1` if no neighbour is larger.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: a cell with no strictly-greater neighbour has `dp = 1` (the path is just itself).\n" +
            "2. Transition (in words): for a cell, look at each of the four neighbours; for every neighbour whose value is strictly greater, recurse to get its longest path, and set this cell's value to `1 +` the maximum over those neighbours.\n" +
            "3. Memoize `dp[r][c]` on first computation so each cell is solved once; subsequent visits read the cache.\n" +
            "4. Run the DFS from every cell and return the overall maximum `dp` value.\n\n" +
            "**Why it works.** The strict-increase rule guarantees acyclicity, so the recursion always terminates and each cell's longest path is a well-defined function of its larger neighbours' longest paths (optimal substructure). Memoization ensures each of the `m*n` cells is evaluated exactly once, turning the exponential search into linear work.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison must be **strict** (`>`); allowing equal values could create cycles and infinite recursion.\n" +
            "- You must try starting the DFS from **every** cell — the global longest path may not start at an extreme cell.\n" +
            "- Cache the result the first time; without memoization it is exponential.\n\n" +
            "**Complexity.** Each cell computed once, examining 4 neighbours → time `O(m*n)`; space `O(m*n)` for the memo table plus recursion stack. **Space optimization:** the memo grid is intrinsic to the approach (each of the `m*n` answers is distinct), so `O(m*n)` is the natural floor; an iterative peeling by in-degree (topological / BFS by levels) uses the same order of space but avoids deep recursion.\n\n" +
            "**Interview mindset.** 'Longest path where each cell's answer is independent of how you got there' → DFS + memo on the implicit DAG. The strict-increase condition is precisely what makes it a DAG and the caching valid.",
          rcs:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:\n" +
            "        if not matrix or not matrix[0]:\n" +
            "            return 0\n" +
            "        m, n = len(matrix), len(matrix[0])\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dfs(r: int, c: int) -> int:\n" +
            "            best = 1                          # the cell alone is a path of length 1\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:\n" +
            "                    best = max(best, 1 + dfs(nr, nc))  # extend into larger neighbour\n" +
            "            return best\n" +
            "        return max(dfs(r, c) for r in range(m) for c in range(n))",
          plain:
            "from functools import lru_cache\n" +
            "\n" +
            "class Solution:\n" +
            "    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:\n" +
            "        if not matrix or not matrix[0]:\n" +
            "            return 0\n" +
            "        m, n = len(matrix), len(matrix[0])\n" +
            "        @lru_cache(maxsize=None)\n" +
            "        def dfs(r: int, c: int) -> int:\n" +
            "            best = 1\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:\n" +
            "                    best = max(best, 1 + dfs(nr, nc))\n" +
            "            return best\n" +
            "        return max(dfs(r, c) for r in range(m) for c in range(n))"
        }
      ],
      patternRecognition: [
        "Longest path in a grid where each cell's answer is independent of the route taken → DFS + memo.",
        "A strictly-increasing move rule forbids cycles, making the grid a DAG.",
        "dp[cell] = 1 + max(dp of strictly-greater neighbours)."
      ],
      interviewRecall: [
        "Memoize dfs(r,c) = longest increasing path starting at (r,c).",
        "Recurse only into strictly-greater neighbours; base case is 1.",
        "Start DFS from every cell and take the global max; O(m*n) time and space."
      ]
    },

    {
      id: "distinct-subsequences",
      lc: 115,
      title: "Distinct Subsequences",
      difficulty: "Hard",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/distinct-subsequences/",
      meta: { pattern: "String DP", dataStructure: "2-D Array", technique: "Match: sum skip options" },
      description:
        "Given two strings `s` and `t`, return the **number of distinct subsequences of `s`** that equal `t`.\n\n" +
        "A **subsequence** is formed by deleting zero or more characters from a string without changing the relative order of the remaining characters. Different sets of deleted positions that yield the same `t` are counted separately (they are distinct subsequences of `s`). The answer fits in a 32-bit signed integer.",
      constraints: [
        "`1 <= s.length, t.length <= 1000`",
        "`s` and `t` consist of English letters."
      ],
      notes: [
        "You count subsequences of s (by position) that spell t, not distinct string values.",
        "If t is empty there is exactly one matching subsequence: delete everything."
      ],
      examples: [
        {
          input: 's = "rabbbit", t = "rabbit"',
          output: "3",
          reasoning: "There are three ways to pick which of the three b's to drop so the remaining letters spell rabbit.",
          visual:
            "```\ns = r a b b b i t   (choose which two of the 3 b's to keep)\nt = r a b b i t\n\nkeep b's {1,2}, {1,3}, or {2,3}  ->  3 distinct subsequences\n```"
        },
        {
          input: 's = "babgbag", t = "bag"',
          output: "5",
          reasoning: "Five different position-sets in s spell bag."
        },
        {
          input: 's = "abc", t = ""',
          output: "1",
          reasoning: "The empty string is a subsequence of s in exactly one way (delete all)."
        },
        {
          input: 's = "aaa", t = "aa"',
          output: "3",
          reasoning: "Choosing which single a to drop gives C(3,2) = 3 subsequences."
        }
      ],
      approaches: [
        {
          name: "2-D DP over prefixes of s and t",
          time: "O(m * n)",
          space: "O(n)",
          whenToUse: "The canonical counting-DP for 'how many subsequences of one string equal another'.",
          logic:
            "**What it asks.** Count how many distinct subsequences of `s` (distinct by the positions chosen) exactly spell the string `t`.\n\n" +
            "**Why the naive idea fails.** Enumerating all `2^m` subsequences of `s` and comparing each to `t` is exponential. The recursion 'at each character of `s`, either use it to match `t` or skip it' revisits the same `(i,j)` prefix pairs repeatedly, so it must be memoized into a table.\n\n" +
            "**Key Idea.** Let `dp[i][j]` = the number of distinct subsequences of the first `i` characters of `s` that equal the first `j` characters of `t`. Walk `s` character by character. If the current characters differ, the current `s` character cannot serve as `t[j-1]`, so it must be skipped. If they match, you may **either** use `s[i-1]` to match `t[j-1]` (then both prefixes shrink) **or** skip `s[i-1]` and match `t` using earlier characters — so you **sum both** counts.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[i][0] = 1` for all `i` — the empty `t` is matched exactly one way (delete everything). `dp[0][j] = 0` for `j > 0` — an empty `s` cannot form a non-empty `t`.\n" +
            "2. Transition (in words): if `s[i-1] == t[j-1]`, then `dp[i][j] = dp[i-1][j-1]` (use the matching char) `+ dp[i-1][j]` (skip it and match with earlier `s`). If they differ, `dp[i][j] = dp[i-1][j]` (must skip `s[i-1]`).\n" +
            "3. Fill the table row by row so each cell reads its diagonal and up neighbours.\n" +
            "4. The answer is `dp[m][n]`.\n\n" +
            "**Why it works.** Every subsequence of `s` equal to `t` either uses the last `s` character (only possible when it equals `t`'s last char, contributing `dp[i-1][j-1]`) or does not use it (contributing `dp[i-1][j]`). These cases are disjoint and cover all possibilities, so summing counts each subsequence exactly once. Induction over the prefixes proves the total is exact.\n\n" +
            "**Common Gotchas.**\n" +
            "- On a **match** you must **add both** the use and the skip terms — taking only the diagonal undercounts.\n" +
            "- Seed `dp[i][0] = 1` (empty `t`), a base case that is easy to forget.\n" +
            "- Off-by-one: `dp[i][j]` refers to `s[i-1]` and `t[j-1]` because of the zero-padded row/column.\n\n" +
            "**Complexity.** `(m+1)(n+1)` cells, `O(1)` each → time `O(m*n)`, space `O(m*n)`. **Space optimization:** each row reads only the row above, so a single 1-D array of length `n+1` works if you sweep `j` **right to left** (so `dp[j-1]` still holds the previous row's value) — space `O(n)`.\n\n" +
            "**Interview mindset.** 'Count subsequences of one string equal to another' → 2-D prefix DP where a match sums the use-it and skip-it options. It is a counting cousin of edit distance / LCS.",
          rcs:
            "class Solution:\n" +
            "    def numDistinct(self, s: str, t: str) -> int:\n" +
            "        m, n = len(s), len(t)\n" +
            "        # dp[i][j] = # subsequences of s[:i] equal to t[:j].\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(m + 1):\n" +
            "            dp[i][0] = 1                      # empty t: one way (delete all)\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                dp[i][j] = dp[i - 1][j]       # skip s[i-1]\n" +
            "                if s[i - 1] == t[j - 1]:\n" +
            "                    dp[i][j] += dp[i - 1][j - 1]  # also use s[i-1] to match t[j-1]\n" +
            "        return dp[m][n]",
          plain:
            "class Solution:\n" +
            "    def numDistinct(self, s: str, t: str) -> int:\n" +
            "        m, n = len(s), len(t)\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(m + 1):\n" +
            "            dp[i][0] = 1\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                dp[i][j] = dp[i - 1][j]\n" +
            "                if s[i - 1] == t[j - 1]:\n" +
            "                    dp[i][j] += dp[i - 1][j - 1]\n" +
            "        return dp[m][n]"
        }
      ],
      patternRecognition: [
        "Count subsequences of s that equal t → 2-D prefix counting DP.",
        "Match => sum both the 'use it' (diagonal) and 'skip it' (up) counts.",
        "Mismatch => only the skip option carries over."
      ],
      interviewRecall: [
        "dp[i][j] = subsequences of s[:i] equal to t[:j]; dp[i][0] = 1.",
        "Match: dp[i-1][j-1] + dp[i-1][j]. Mismatch: dp[i-1][j].",
        "Roll to a 1-D array swept right-to-left for O(n) space."
      ]
    },

    {
      id: "edit-distance",
      lc: 72,
      title: "Edit Distance",
      difficulty: "Medium",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/edit-distance/",
      meta: { pattern: "String DP", dataStructure: "2-D Array", technique: "Levenshtein three-way min" },
      description:
        "Given two strings `word1` and `word2`, return the **minimum number of operations** required to convert `word1` into `word2`.\n\n" +
        "You may perform three operations on `word1`, each costing 1: **insert** a character, **delete** a character, or **replace** a character. This minimum count is the **Levenshtein edit distance**.",
      constraints: [
        "`0 <= word1.length, word2.length <= 500`",
        "`word1` and `word2` consist of lowercase English letters."
      ],
      notes: [
        "All three operations cost exactly 1.",
        "If one string is empty, the distance is the length of the other (all inserts or all deletes)."
      ],
      examples: [
        {
          input: 'word1 = "horse", word2 = "ros"',
          output: "3",
          reasoning: "horse -> rorse (replace h->r) -> rose (delete r) -> ros (delete e): 3 operations.",
          visual:
            "```\n        \"\"  r  o  s\n    \"\"   0  1  2  3\n    h    1  1  2  3\n    o    2  2  1  2\n    r    3  2  2  2\n    s    4  3  3  2\n    e    5  4  4  3  <- edit distance = 3\n\nmatch -> diagonal;  else -> 1 + min(insert, delete, replace)\n```"
        },
        {
          input: 'word1 = "intention", word2 = "execution"',
          output: "5",
          reasoning: "Five edits transform intention into execution."
        },
        {
          input: 'word1 = "", word2 = "abc"',
          output: "3",
          reasoning: "Insert all three characters."
        },
        {
          input: 'word1 = "abc", word2 = "abc"',
          output: "0",
          reasoning: "The strings are identical; no edits needed."
        }
      ],
      approaches: [
        {
          name: "2-D DP (Levenshtein table)",
          time: "O(m * n)",
          space: "O(n)",
          whenToUse: "The textbook edit-distance DP — the template for most string-transformation problems.",
          logic:
            "**What it asks.** Compute the fewest single-character inserts, deletes, and replacements needed to turn `word1` into `word2`.\n\n" +
            "**Why the naive idea fails.** Trying all edit sequences branches three ways at every position — exponential. The recursion on the two indices revisits the same `(i,j)` prefix pairs constantly, which is exactly what a 2-D table memoizes.\n\n" +
            "**Key Idea.** Let `dp[i][j]` = the minimum edits to convert the first `i` characters of `word1` into the first `j` characters of `word2`. Compare the last characters of the two prefixes. If they are equal, no edit is needed for them and the cost is the diagonal `dp[i-1][j-1]`. If they differ, one of the three operations must apply, so take `1 +` the cheapest of the three neighbouring subproblems: **delete** from `word1` (`dp[i-1][j]`), **insert** into `word1` (`dp[i][j-1]`), or **replace** (`dp[i-1][j-1]`).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base cases: `dp[i][0] = i` (delete all `i` characters) and `dp[0][j] = j` (insert all `j` characters) — converting to/from an empty string.\n" +
            "2. Transition (in words): if `word1[i-1] == word2[j-1]`, `dp[i][j] = dp[i-1][j-1]` (free match). Otherwise `dp[i][j] = 1 + min(dp[i-1][j]` delete, `dp[i][j-1]` insert, `dp[i-1][j-1]` replace`)`.\n" +
            "3. Fill the table row by row so each cell reads its up, left, and diagonal neighbours.\n" +
            "4. The answer is `dp[m][n]`.\n\n" +
            "**Why it works.** Consider the last operation of an optimal transformation of the two prefixes. It is either a free match (equal last chars, reducing to `dp[i-1][j-1]`), or one of delete / insert / replace, each reducing to the corresponding smaller prefix pair at cost 1. These options are exhaustive, and each subproblem is optimal by induction, so the three-way min yields the true minimum — optimal substructure with overlapping subproblems.\n\n" +
            "**Common Gotchas.**\n" +
            "- Seed the first row and column to `j` and `i` respectively; zeros there give wrong answers.\n" +
            "- Map the three neighbours to the right operations: up = delete, left = insert, diagonal = replace.\n" +
            "- On a matching pair take the diagonal with **no** `+1` — do not force an edit.\n\n" +
            "**Complexity.** `(m+1)(n+1)` cells, `O(1)` each → time `O(m*n)`, space `O(m*n)`. **Space optimization:** each cell depends only on the current and previous rows, so two rolling 1-D arrays (or one array with a saved diagonal) reduce space to `O(n)`.\n\n" +
            "**Interview mindset.** 'Minimum operations to transform one string into another' → the Levenshtein table with the three-way min. It is the parent template for many string-DP variants (delete-only distance, one-edit checks, etc.).",
          rcs:
            "class Solution:\n" +
            "    def minDistance(self, word1: str, word2: str) -> int:\n" +
            "        m, n = len(word1), len(word2)\n" +
            "        # dp[i][j] = min edits to turn word1[:i] into word2[:j].\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(m + 1):\n" +
            "            dp[i][0] = i                      # delete all i chars\n" +
            "        for j in range(n + 1):\n" +
            "            dp[0][j] = j                      # insert all j chars\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if word1[i - 1] == word2[j - 1]:\n" +
            "                    dp[i][j] = dp[i - 1][j - 1]   # chars match, no edit\n" +
            "                else:\n" +
            "                    dp[i][j] = 1 + min(\n" +
            "                        dp[i - 1][j],         # delete from word1\n" +
            "                        dp[i][j - 1],         # insert into word1\n" +
            "                        dp[i - 1][j - 1],     # replace\n" +
            "                    )\n" +
            "        return dp[m][n]",
          plain:
            "class Solution:\n" +
            "    def minDistance(self, word1: str, word2: str) -> int:\n" +
            "        m, n = len(word1), len(word2)\n" +
            "        dp = [[0] * (n + 1) for _ in range(m + 1)]\n" +
            "        for i in range(m + 1):\n" +
            "            dp[i][0] = i\n" +
            "        for j in range(n + 1):\n" +
            "            dp[0][j] = j\n" +
            "        for i in range(1, m + 1):\n" +
            "            for j in range(1, n + 1):\n" +
            "                if word1[i - 1] == word2[j - 1]:\n" +
            "                    dp[i][j] = dp[i - 1][j - 1]\n" +
            "                else:\n" +
            "                    dp[i][j] = 1 + min(\n" +
            "                        dp[i - 1][j],\n" +
            "                        dp[i][j - 1],\n" +
            "                        dp[i - 1][j - 1],\n" +
            "                    )\n" +
            "        return dp[m][n]"
        }
      ],
      patternRecognition: [
        "Minimum operations to transform one string into another → Levenshtein 2-D DP.",
        "Match => take the diagonal free; mismatch => 1 + min(delete, insert, replace).",
        "Up = delete, left = insert, diagonal = replace."
      ],
      interviewRecall: [
        "dp[i][0] = i, dp[0][j] = j (all deletes / all inserts).",
        "Match: dp[i-1][j-1]. Mismatch: 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]).",
        "Two rolling rows give O(n) space."
      ]
    },

    {
      id: "burst-balloons",
      lc: 312,
      title: "Burst Balloons",
      difficulty: "Hard",
      category: "2-D Dynamic Programming",
      link: "https://leetcode.com/problems/burst-balloons/",
      meta: { pattern: "Interval DP", dataStructure: "2-D Array", technique: "Last-to-burst framing" },
      description:
        "You are given `n` balloons indexed `0` to `n-1`, each painted with a number in the array `nums`. If you burst balloon `i`, you gain `nums[left] * nums[i] * nums[right]` coins, where `left` and `right` are the balloons **adjacent to `i` at the moment it bursts** (bursting removes it, so neighbours change over time). If a neighbour is out of bounds, treat it as a balloon with value `1`.\n\n" +
        "Return the **maximum coins** you can collect by bursting all the balloons in some order.",
      constraints: [
        "`n == nums.length`",
        "`1 <= n <= 300`",
        "`0 <= nums[i] <= 100`"
      ],
      notes: [
        "The coins for bursting a balloon depend on its neighbours AT THAT MOMENT, which change as balloons pop — that coupling is what makes a naive order-DP fail.",
        "Pad the array with a 1 on each end so every real balloon always has defined neighbours."
      ],
      examples: [
        {
          input: "nums = [3,1,5,8]",
          output: "167",
          reasoning: "Burst order 1,5,3,8 gives 3*1*5 + 3*5*8 + 1*3*8 + 1*8*1 = 15+120+24+8 = 167.",
          visual:
            "```\npad:  [1] 3  1  5  8 [1]\n\nchoose which balloon bursts LAST in a range:\ncoins(i..j) = max over k of\n    coins(i..k-1) + nums[i-1]*nums[k]*nums[j+1] + coins(k+1..j)\n(k bursts last, so its neighbours are the range's borders)\n```"
        },
        {
          input: "nums = [1,5]",
          output: "10",
          reasoning: "Burst 1 first (1*1*5 = 5), then 5 (1*5*1 = 5): total 10."
        },
        {
          input: "nums = [5]",
          output: "5",
          reasoning: "Only balloon; with padded 1's: 1*5*1 = 5."
        },
        {
          input: "nums = [7,9,8,0,7,1,3,5,5,2,3]",
          output: "1654",
          reasoning: "An optimal last-to-burst ordering collects 1654 coins."
        }
      ],
      approaches: [
        {
          name: "Interval DP (last balloon to burst)",
          time: "O(n^3)",
          space: "O(n^2)",
          whenToUse: "The classic interval-DP; the 'which is burst last' reframing is the key trick for coupled-neighbour problems.",
          logic:
            "**What it asks.** Choose the order to burst all balloons so total coins are maximized, where each burst pays `left * self * right` using the neighbours present **at burst time**.\n\n" +
            "**Why the naive idea fails.** The obvious DP over 'which balloon to burst **first**' fails because bursting a balloon merges its neighbours, so the coins for later bursts depend on the whole history — the subproblems on the left and right of the first burst are **not independent** (they can become adjacent). This coupling breaks clean divide-and-conquer.\n\n" +
            "**Key Idea.** Reframe by asking, for a range of balloons, **which balloon is burst LAST** in that range. If balloon `k` is the last to pop within the open range `(i, j)` (using padded borders `i-1` and `j+1`), then at the moment it bursts, everything else in the range is already gone, so its neighbours are exactly the range borders `nums[i-1]` and `nums[j+1]` — a **fixed, known** pair. That decouples the range into two **independent** subranges to its left and right, which can be solved separately. Define `dp[i][j]` = the max coins from bursting all balloons strictly inside the padded interval with borders `i-1` and `j+1` (equivalently, balloons `i..j`).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Pad: build `vals = [1] + nums + [1]` so every balloon has defined neighbours. Index real balloons `1..n`.\n" +
            "2. Base case: an empty range (`i > j`) yields `dp[i][j] = 0` — no balloons, no coins.\n" +
            "3. Transition (in words): for a range `[i, j]`, try each `k` in it as the **last** to burst: the coins are `vals[i-1] * vals[k] * vals[j+1]` (k's neighbours are the borders, since all else in-range is gone) plus `dp[i][k-1]` (left subrange solved independently) plus `dp[k+1][j]` (right subrange). Take the max over all `k`.\n" +
            "4. Fill by **increasing interval length** so both subranges are already computed. The answer is `dp[1][n]`.\n\n" +
            "**Why it works.** Fixing `k` as the *last* burst is what makes the two sides independent: once everything else in `(i,j)` is gone, `k`'s coins use only the fixed borders, and the left and right groups never interact (they were fully burst before `k`, each within its own border). Every complete burst order has a unique last-in-range balloon, so ranging `k` over the interval covers all orders exactly, and the interval-length ordering guarantees optimal substructure. This is the hallmark of **interval DP**.\n\n" +
            "**Common Gotchas.**\n" +
            "- Think 'last to burst', **not** 'first to burst' — the first-burst framing does not decouple the subproblems.\n" +
            "- Pad both ends with `1` and index carefully; the burst value uses the padded borders `vals[i-1]` and `vals[j+1]`.\n" +
            "- Iterate by increasing interval length (or memoize) so `dp[i][k-1]` and `dp[k+1][j]` are ready before `dp[i][j]`.\n\n" +
            "**Complexity.** `O(n^2)` intervals times `O(n)` choices of `k` → time `O(n^3)`; space `O(n^2)` for the table. **Space optimization:** the transition reads scattered cells of the whole table, so the full `O(n^2)` grid is required — there is no row-rolling reduction here.\n\n" +
            "**Interview mindset.** When bursting/removing an element changes its neighbours and couples the subproblems, flip the question to 'what happens **last** in this range' → interval DP over `dp[i][j]` with a split index `k`, filled by growing interval length.",
          rcs:
            "class Solution:\n" +
            "    def maxCoins(self, nums: List[int]) -> int:\n" +
            "        # Pad with 1s so every balloon has defined neighbours.\n" +
            "        vals = [1] + nums + [1]\n" +
            "        n = len(vals)\n" +
            "        # dp[i][j] = max coins bursting all balloons in range [i, j].\n" +
            "        dp = [[0] * n for _ in range(n)]\n" +
            "        # Grow the interval length so sub-intervals are ready.\n" +
            "        for length in range(1, n - 1):        # number of balloons in the range\n" +
            "            for i in range(1, n - length):    # left border of real balloons\n" +
            "                j = i + length - 1            # right border of real balloons\n" +
            "                for k in range(i, j + 1):     # k bursts LAST in [i, j]\n" +
            "                    coins = vals[i - 1] * vals[k] * vals[j + 1]\n" +
            "                    coins += dp[i][k - 1] + dp[k + 1][j]\n" +
            "                    dp[i][j] = max(dp[i][j], coins)\n" +
            "        return dp[1][n - 2]",
          plain:
            "class Solution:\n" +
            "    def maxCoins(self, nums: List[int]) -> int:\n" +
            "        vals = [1] + nums + [1]\n" +
            "        n = len(vals)\n" +
            "        dp = [[0] * n for _ in range(n)]\n" +
            "        for length in range(1, n - 1):\n" +
            "            for i in range(1, n - length):\n" +
            "                j = i + length - 1\n" +
            "                for k in range(i, j + 1):\n" +
            "                    coins = vals[i - 1] * vals[k] * vals[j + 1]\n" +
            "                    coins += dp[i][k - 1] + dp[k + 1][j]\n" +
            "                    dp[i][j] = max(dp[i][j], coins)\n" +
            "        return dp[1][n - 2]"
        }
      ],
      patternRecognition: [
        "Removing an element changes neighbours and couples subproblems → interval DP.",
        "Reframe as 'which element is handled LAST in this range' to decouple the two sides.",
        "Pad the ends so every element has defined neighbours."
      ],
      interviewRecall: [
        "dp[i][j] = max coins bursting balloons in [i,j]; pad nums with 1s on both ends.",
        "k burst last: coins = vals[i-1]*vals[k]*vals[j+1] + dp[i][k-1] + dp[k+1][j].",
        "Fill by increasing interval length; O(n^3) time, O(n^2) space."
      ]
    }
  ]);
})();
