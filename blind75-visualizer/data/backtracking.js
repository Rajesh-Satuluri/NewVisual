/*
 * Blind 75 — Backtracking
 * =========================================================================
 * Registers the Backtracking category on the global registry:
 *     window.BLIND75.register("Backtracking", [ ...problems ]);
 *
 * Backtracking is depth-first search over a tree of PARTIAL solutions. The
 * template is always the same three moves:
 *     choose  ->  explore (recurse)  ->  un-choose (undo the choice)
 * You build a candidate one decision at a time; when a decision cannot lead
 * to a valid answer you PRUNE that branch instead of walking it; when the
 * candidate is complete you RECORD a copy. Undoing after the recursive call
 * lets the same state object be reused down every branch.
 *
 * See arrays_hashing.js for the full field-by-field schema documentation.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Backtracking", [
    {
      id: "combination-sum",
      lc: 39,
      title: "Combination Sum",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/combination-sum/",
      meta: { pattern: "Backtracking (reuse)", dataStructure: "Recursion / Array", technique: "Choose-explore-unchoose with start index" },
      description:
        "You are given an array of **distinct** integers `candidates` and a target integer `target`. Return a list of **all unique combinations** of `candidates` where the chosen numbers sum to `target`.\n\n" +
        "The **same** number from `candidates` may be chosen an **unlimited** number of times. Two combinations are the same if they contain the same numbers with the same multiplicities (order does not matter), so each distinct multiset must appear at most once.\n\n" +
        "The problem guarantees the number of unique combinations that sum to `target` is fewer than 150 for the given input.",
      constraints: [
        "`1 <= candidates.length <= 30`",
        "`2 <= candidates[i] <= 40`",
        "All elements of `candidates` are **distinct**.",
        "`1 <= target <= 40`"
      ],
      notes: [
        "Reuse is allowed: a single candidate can appear many times in one combination (e.g. `2 + 2 + 3`).",
        "Combinations are multisets \u2014 `[2,2,3]` and `[3,2,2]` are the SAME combination and must not both appear.",
        "Because all candidates are `>= 2` and target is bounded, the recursion depth is bounded and the search terminates."
      ],
      examples: [
        {
          input: "candidates = [2, 3, 6, 7], target = 7",
          output: "[[2, 2, 3], [7]]",
          reasoning: "2+2+3 = 7 and 7 = 7. There is no other multiset of these values summing to 7.",
          visual:
            "```\n" +
            "start at index 0, remaining = 7\n" +
            "pick 2 -> rem 5\n" +
            "  pick 2 -> rem 3\n" +
            "    pick 2 -> rem 1 (no candidate <=1) prune\n" +
            "    pick 3 -> rem 0  RECORD [2,2,3]\n" +
            "    pick 6 -> rem -3 prune\n" +
            "  pick 3 -> rem 2 -> pick 3 rem -1 prune ...\n" +
            "pick 7 -> rem 0  RECORD [7]\n" +
            "```"
        },
        {
          input: "candidates = [2, 3, 5], target = 8",
          output: "[[2, 2, 2, 2], [2, 3, 3], [3, 5]]",
          reasoning: "2*4 = 8, 2+3+3 = 8, and 3+5 = 8. All three are distinct multisets."
        },
        {
          input: "candidates = [2], target = 1",
          output: "[]",
          reasoning: "The only candidate is 2, which already overshoots target 1, so no combination exists."
        },
        {
          input: "candidates = [4, 2, 8], target = 8",
          output: "[[2, 2, 2, 2], [4, 4], [8]]",
          reasoning: "Candidates need not be sorted in the input; every multiset summing to 8 is returned once."
        }
      ],
      approaches: [
        {
          name: "Backtracking with a start index",
          time: "O(N^(T/M))",
          space: "O(T/M)",
          whenToUse: "The canonical solution: 'find all combinations that reach a target with unlimited reuse' is a textbook backtracking signal.",
          logic:
            "**What it asks.** Enumerate *every* multiset of `candidates` (elements may be reused an unlimited number of times) that sums to exactly `target`, reporting each distinct multiset once.\n\n" +
            "**Why the naive idea fails.** The obvious move is to try picking any candidate at every step and collect the runs that hit `target`. Two things break it: growth is unbounded because numbers can be reused, and it floods the answer with duplicates \u2014 `[2,3]` and `[3,2]` are the same multiset but this generates both. We need a decision tree that terminates *and* produces each combination in exactly one canonical form.\n\n" +
            "**Key Idea.** Model the search as a decision tree and control it with two levers. (1) *Reuse:* after choosing `candidates[i]`, recurse while still allowing index `i` \u2014 so the same value can be picked again on the next level. (2) *No duplicates:* forbid looking backwards \u2014 each recursive call may only choose candidates at index `>= start`. That forces every combination to be built in non-decreasing index order, so each multiset corresponds to exactly one root-to-leaf path. Pair this with a `remaining` counter that you drive toward `0`, and the whole thing prunes itself.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `candidates` first (enables the strongest pruning below).\n" +
            "2. Carry three pieces of state: `path` (candidates chosen so far on this branch), `remaining` (target minus the sum of `path`), and `start` (smallest index still allowed to pick).\n" +
            "3. Start the DFS at `(start = 0, remaining = target)`.\n" +
            "4. **choose:** loop `i` from `start`; append `candidates[i]` to `path` and conceptually subtract it from `remaining`.\n" +
            "5. **explore:** recurse with `start = i` (not `i + 1`, so the value stays reusable) and `remaining - candidates[i]`.\n" +
            "6. **un-choose:** pop `candidates[i]` back off `path` so the sibling branch starts from a clean state.\n" +
            "7. When `remaining` reaches `0`, record a **copy** of `path` \u2014 a copy, because `path` keeps mutating as the search continues.\n\n" +
            "**Why it works.** Requiring `i >= start` makes every accepted sequence non-decreasing by index, so each distinct multiset maps to exactly one path in the tree \u2014 none duplicated, none missed. Reusing index `i` on recursion is precisely what allows repeats. Driving `remaining` down to `0` guarantees every recorded `path` sums to `target`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record a *copy* of `path` at a hit; appending the live list stores a reference that later mutations will corrupt.\n" +
            "- Pass `i`, not `i + 1`, to the recursive call \u2014 `i + 1` silently forbids reuse and produces wrong answers here.\n" +
            "- A branch can overshoot: if `remaining < 0` it must be pruned. With a sorted array this is cleaner \u2014 once `candidates[i] > remaining`, every later candidate also overshoots, so `break` the whole loop instead of continuing.\n" +
            "- All candidates are `>= 2` and `target` is bounded, so depth is finite and the search terminates.\n\n" +
            "**Complexity.** Let `T` be `target` and `M` the smallest candidate; tree depth is at most `T/M` and branching is bounded by `N`, giving `O(N^(T/M))` time in the worst case. Extra space is `O(T/M)` for the recursion stack plus `path` (the output is not counted).\n\n" +
            "**Interview mindset.** 'Find ALL combinations / all ways to reach X, with reuse' is the textbook signal for backtracking with a start index. Passing `i` enables reuse; requiring `i >= start` kills duplicates \u2014 those two choices are the entire trick.",
          rcs:
            "class Solution:\n" +
            "    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n" +
            "        candidates.sort()                     # Sorting lets us break early once a candidate overshoots.\n" +
            "        result = []                           # Collects every valid combination (as copies).\n" +
            "        path = []                             # The combination we are currently building.\n" +
            "\n" +
            "        def backtrack(start: int, remaining: int) -> None:\n" +
            "            if remaining == 0:                # Exact hit: 'path' sums to target.\n" +
            "                result.append(path[:])        # Store a COPY; 'path' will keep mutating.\n" +
            "                return\n" +
            "            for i in range(start, len(candidates)):  # Only look at index >= start (no going back).\n" +
            "                if candidates[i] > remaining: # Sorted, so this and all later ones overshoot.\n" +
            "                    break                     # Prune the rest of this level.\n" +
            "                path.append(candidates[i])    # CHOOSE candidates[i].\n" +
            "                backtrack(i, remaining - candidates[i])  # EXPLORE; pass i again to allow reuse.\n" +
            "                path.pop()                    # UN-CHOOSE so siblings start clean.\n" +
            "\n" +
            "        backtrack(0, target)                  # Begin: nothing chosen, full target remaining.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n" +
            "        candidates.sort()\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int, remaining: int) -> None:\n" +
            "            if remaining == 0:\n" +
            "                result.append(path[:])\n" +
            "                return\n" +
            "            for i in range(start, len(candidates)):\n" +
            "                if candidates[i] > remaining:\n" +
            "                    break\n" +
            "                path.append(candidates[i])\n" +
            "                backtrack(i, remaining - candidates[i])\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0, target)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Find ALL combinations / all ways' (not just one, not just a count) \u2192 backtracking.",
        "Unlimited reuse of elements \u2192 recurse with the same start index, not start+1.",
        "Combinations are order-insensitive multisets \u2192 enforce non-decreasing index order to avoid duplicates.",
        "A running 'remaining target' that you drive toward 0 is the classic backtracking state."
      ],
      interviewRecall: [
        "Template: choose (append + subtract), explore (recurse), un-choose (pop).",
        "Reuse = pass i to the recursive call; de-dup = only pick indices >= start.",
        "Base cases: remaining == 0 records a COPY of path; remaining < 0 prunes.",
        "Sort first so you can break the loop once candidates[i] > remaining."
      ]
    },

    {
      id: "n-queens",
      lc: 51,
      title: "N-Queens",
      difficulty: "Hard",
      category: "Backtracking",
      link: "https://leetcode.com/problems/n-queens/",
      meta: { pattern: "Backtracking (constraints)", dataStructure: "Sets / Board", technique: "Row-by-row placement with conflict sets" },
      description:
        "The n-queens puzzle asks you to place `n` queens on an `n x n` chessboard so that **no two queens attack each other**. A queen attacks any square in the same row, the same column, or either diagonal.\n\n" +
        "Return **all distinct** board configurations that solve the puzzle. Each solution is a list of `n` strings; each string is one row of length `n`, using `'Q'` for a queen and `'.'` for an empty square.",
      constraints: [
        "`1 <= n <= 9`"
      ],
      notes: [
        "Because at most one queen can occupy a row, every solution places **exactly one queen per row** \u2014 this is the fact that makes the search tractable.",
        "For `n = 2` and `n = 3` there are **no** solutions; the answer is an empty list.",
        "Rows and columns are 0-indexed; the top-left square is `(0, 0)`."
      ],
      examples: [
        {
          input: "n = 4",
          output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]',
          reasoning: "There are exactly two ways to place 4 non-attacking queens on a 4x4 board.",
          visual:
            "```\n" +
            "solution 1        solution 2\n" +
            ". Q . .           . . Q .\n" +
            ". . . Q           Q . . .\n" +
            "Q . . .           . . . Q\n" +
            ". . Q .           . Q . .\n" +
            "```"
        },
        {
          input: "n = 1",
          output: '[["Q"]]',
          reasoning: "A single queen on a 1x1 board attacks nothing; one trivial solution."
        },
        {
          input: "n = 2",
          output: "[]",
          reasoning: "Two queens on a 2x2 board always share a row, column, or diagonal, so no solution exists."
        },
        {
          input: "n = 3",
          output: "[]",
          reasoning: "No arrangement of 3 non-attacking queens fits on a 3x3 board."
        }
      ],
      approaches: [
        {
          name: "Backtracking with board scan",
          time: "O(N!) with O(N) per validity check",
          space: "O(N^2)",
          whenToUse: "The intuitive first version: build the board, and re-check the three attack lines by scanning whenever you try a square.",
          logic:
            "**What it asks.** Enumerate every full placement of `n` mutually non-attacking queens on an `n x n` board and render each valid placement as a list of row strings.\n\n" +
            "**Why the naive idea fails.** Trying all `C(n*n, n)` ways to drop `n` queens on `n*n` squares is astronomically large and wastes almost all of its work on obviously illegal boards. The first real reduction is a structural observation: since no two queens can share a row, **each row holds exactly one queen**. That collapses the problem to a per-row column choice \u2014 for rows `0..n-1`, pick a column that doesn't conflict with any queen already placed.\n\n" +
            "**Key Idea.** Treat it as a decision tree with one level per row and up to `n` branches (columns) per level, and *prune* the instant a placement is illegal. A partial board that already has a conflict can never become a solution, so we reject that column immediately and never explore its subtree \u2014 that pruning is what makes an otherwise factorial search tractable for `n <= 9`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a 2-D `board` of `'.'`/`'Q'` and process one `row` at a time.\n" +
            "2. For the current `row`, loop `col` from `0` to `n-1`.\n" +
            "3. Test `is_safe(row, col)`: scan upward in the same column and along both upper diagonals for an existing `'Q'`. Rows below `row` are still empty, so they never need checking.\n" +
            "4. **choose:** if the square is safe, set `board[row][col] = 'Q'`.\n" +
            "5. **explore:** recurse to `row + 1`.\n" +
            "6. **un-choose:** reset `board[row][col] = '.'` before trying the next column.\n" +
            "7. When `row == n`, every row is filled \u2014 render the board (join each row into a string) and record it.\n\n" +
            "**Why it works.** A queen is only ever added when it conflicts with none already on the board, so any board that reaches row `n` is fully valid by construction. Fixing a top-to-bottom row order gives every solution one canonical generation order, and trying every safe column in every row means all solutions are produced exactly once \u2014 none duplicated, none missed.\n\n" +
            "**Common Gotchas.**\n" +
            "- The un-choose step is essential: forgetting to reset the square to `'.'` leaves phantom queens that corrupt sibling branches.\n" +
            "- `is_safe` only needs to look *upward* (same column and the two upper diagonals); scanning the whole board is wasteful and checking rows below is meaningless since they're empty.\n" +
            "- `n = 2` and `n = 3` have no solutions and must legitimately return an empty list.\n" +
            "- Record a rendered copy of the board at a solution; storing the live grid would be overwritten as the search backtracks.\n\n" +
            "**Complexity.** Branching over rows yields roughly `O(N!)` leaves, and each `is_safe` check costs `O(N)` \u2014 fine for `n <= 9`. Space is `O(N^2)` for the board plus `O(N)` recursion depth.\n\n" +
            "**Interview mindset.** 'Place N items on a grid with no two conflicting, return all configurations' is a backtracking-by-row signal. The one-queen-per-row insight that turns a 2-D placement into a 1-D column choice per row is the move to reach for first.",
          rcs:
            "class Solution:\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:\n" +
            "        board = [['.'] * n for _ in range(n)]   # n x n grid, all empty to start.\n" +
            "        result = []\n" +
            "\n" +
            "        def is_safe(row: int, col: int) -> bool:\n" +
            "            for r in range(row):                # Check the column above this square.\n" +
            "                if board[r][col] == 'Q':\n" +
            "                    return False\n" +
            "            r, c = row - 1, col - 1             # Upper-left diagonal.\n" +
            "            while r >= 0 and c >= 0:\n" +
            "                if board[r][c] == 'Q':\n" +
            "                    return False\n" +
            "                r -= 1\n" +
            "                c -= 1\n" +
            "            r, c = row - 1, col + 1             # Upper-right diagonal.\n" +
            "            while r >= 0 and c < n:\n" +
            "                if board[r][c] == 'Q':\n" +
            "                    return False\n" +
            "                r -= 1\n" +
            "                c += 1\n" +
            "            return True                         # No queen attacks (row, col).\n" +
            "\n" +
            "        def backtrack(row: int) -> None:\n" +
            "            if row == n:                        # All rows filled: a complete solution.\n" +
            "                result.append([''.join(r) for r in board])  # Render each row to a string.\n" +
            "                return\n" +
            "            for col in range(n):                # Try every column for this row.\n" +
            "                if is_safe(row, col):\n" +
            "                    board[row][col] = 'Q'       # CHOOSE.\n" +
            "                    backtrack(row + 1)          # EXPLORE the next row.\n" +
            "                    board[row][col] = '.'       # UN-CHOOSE.\n" +
            "\n" +
            "        backtrack(0)                            # Start from the top row.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:\n" +
            "        board = [['.'] * n for _ in range(n)]\n" +
            "        result = []\n" +
            "\n" +
            "        def is_safe(row: int, col: int) -> bool:\n" +
            "            for r in range(row):\n" +
            "                if board[r][col] == 'Q':\n" +
            "                    return False\n" +
            "            r, c = row - 1, col - 1\n" +
            "            while r >= 0 and c >= 0:\n" +
            "                if board[r][c] == 'Q':\n" +
            "                    return False\n" +
            "                r -= 1\n" +
            "                c -= 1\n" +
            "            r, c = row - 1, col + 1\n" +
            "            while r >= 0 and c < n:\n" +
            "                if board[r][c] == 'Q':\n" +
            "                    return False\n" +
            "                r -= 1\n" +
            "                c += 1\n" +
            "            return True\n" +
            "\n" +
            "        def backtrack(row: int) -> None:\n" +
            "            if row == n:\n" +
            "                result.append([''.join(r) for r in board])\n" +
            "                return\n" +
            "            for col in range(n):\n" +
            "                if is_safe(row, col):\n" +
            "                    board[row][col] = 'Q'\n" +
            "                    backtrack(row + 1)\n" +
            "                    board[row][col] = '.'\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        },
        {
          name: "Optimized — Backtracking with O(1) conflict sets",
          time: "O(N!)",
          space: "O(N)",
          whenToUse: "The interview-preferred version: replace the O(N) scan with O(1) diagonal/column set lookups.",
          logic:
            "**What it asks.** Same problem \u2014 all placements of `n` non-attacking queens \u2014 but with the per-square safety check made `O(1)` instead of an `O(N)` scan.\n\n" +
            "**Why the naive idea fails.** The board-scan version re-walks a column and two diagonals on every attempted placement, an `O(N)` cost paid at every node of a factorial-sized tree. That work is redundant: whether a square is attacked depends only on which lines are already occupied, which we can track incrementally.\n\n" +
            "**Key Idea.** Diagonals have a closed form. Every square on the same **`\\` (top-left to bottom-right) diagonal** shares the same value of `row - col`; every square on the same **`/` (top-right to bottom-left) diagonal** shares the same value of `row + col`. Combined with the column index, these two numbers uniquely identify the three attack lines a queen controls (the row line is free \u2014 we place one queen per row). So we can keep three hash **sets** of occupied lines and reduce each safety test to three constant-time membership checks.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain three sets \u2014 `cols` (occupied columns), `diag1` (occupied `row - col` diagonals), `diag2` (occupied `row + col` diagonals) \u2014 and a `path` list storing the chosen column for each row so far.\n" +
            "2. Process one `row` at a time; loop `col` from `0` to `n-1`.\n" +
            "3. Prune: if `col in cols` or `(row - col) in diag1` or `(row + col) in diag2`, this square is attacked \u2014 skip it.\n" +
            "4. **choose:** add `col`, `row - col`, and `row + col` to the three sets and append `col` to `path`.\n" +
            "5. **explore:** recurse to `row + 1`.\n" +
            "6. **un-choose:** remove all three set entries and pop `path`, freeing those lines for the next column.\n" +
            "7. When `row == n`, reconstruct each solution: for each stored column `c` build the row string `'.'*c + 'Q' + '.'*(n-c-1)`, then record the board.\n\n" +
            "**Why it works.** A queen at `(row, col)` attacks exactly the squares sharing its column, its `row - col` diagonal, or its `row + col` diagonal; excluding those three sets guarantees no two placed queens attack each other. Placing one queen per row means the row line can never conflict. Every safe column in every row is tried, so all solutions are produced exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- `row - col` can be negative \u2014 that is perfectly fine as a set key; no offset is required.\n" +
            "- The un-choose must remove from *all three* sets and pop `path`; leaving any entry behind poisons later branches.\n" +
            "- Store the column-per-row in `path` rather than a full board \u2014 it is enough to reconstruct the answer and far cheaper to copy and undo.\n" +
            "- `n = 2` and `n = 3` still legitimately yield an empty list.\n\n" +
            "**Complexity.** Still `O(N!)` leaves, but each safety check and each choose/un-choose is `O(1)`, so it is meaningfully faster in practice. Space is `O(N)` for the three sets, `path`, and the recursion stack.\n\n" +
            "**Interview mindset.** Encoding diagonals as `row - col` and `row + col` is the move that impresses: it turns constraint checking from a scan into constant-time set lookups \u2014 the standard optimization for N-Queens and grid-constraint backtracking in general.",
          rcs:
            "class Solution:\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:\n" +
            "        cols = set()                        # Columns already holding a queen.\n" +
            "        diag1 = set()                       # Occupied '\\' diagonals, keyed by (row - col).\n" +
            "        diag2 = set()                       # Occupied '/' diagonals, keyed by (row + col).\n" +
            "        path = []                           # path[r] = column of the queen in row r.\n" +
            "        result = []\n" +
            "\n" +
            "        def backtrack(row: int) -> None:\n" +
            "            if row == n:                    # Placed a queen in every row: a full solution.\n" +
            "                board = []\n" +
            "                for c in path:              # Turn each stored column into a board row.\n" +
            "                    board.append('.' * c + 'Q' + '.' * (n - c - 1))\n" +
            "                result.append(board)\n" +
            "                return\n" +
            "            for col in range(n):            # Try each column in the current row.\n" +
            "                if col in cols or (row - col) in diag1 or (row + col) in diag2:\n" +
            "                    continue                # Conflict on column or a diagonal: skip (prune).\n" +
            "                cols.add(col)               # CHOOSE: mark all three attack lines occupied.\n" +
            "                diag1.add(row - col)\n" +
            "                diag2.add(row + col)\n" +
            "                path.append(col)\n" +
            "                backtrack(row + 1)          # EXPLORE the next row.\n" +
            "                path.pop()                  # UN-CHOOSE: free the lines for the next column.\n" +
            "                cols.remove(col)\n" +
            "                diag1.remove(row - col)\n" +
            "                diag2.remove(row + col)\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:\n" +
            "        cols = set()\n" +
            "        diag1 = set()\n" +
            "        diag2 = set()\n" +
            "        path = []\n" +
            "        result = []\n" +
            "\n" +
            "        def backtrack(row: int) -> None:\n" +
            "            if row == n:\n" +
            "                board = []\n" +
            "                for c in path:\n" +
            "                    board.append('.' * c + 'Q' + '.' * (n - c - 1))\n" +
            "                result.append(board)\n" +
            "                return\n" +
            "            for col in range(n):\n" +
            "                if col in cols or (row - col) in diag1 or (row + col) in diag2:\n" +
            "                    continue\n" +
            "                cols.add(col)\n" +
            "                diag1.add(row - col)\n" +
            "                diag2.add(row + col)\n" +
            "                path.append(col)\n" +
            "                backtrack(row + 1)\n" +
            "                path.pop()\n" +
            "                cols.remove(col)\n" +
            "                diag1.remove(row - col)\n" +
            "                diag2.remove(row + col)\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Place N items on a grid with no two conflicting' \u2192 row-by-row backtracking.",
        "One item per row/column constraint collapses a 2-D search into a 1-D column choice per row.",
        "Diagonal constraints on a grid \u2192 encode them as row-col and row+col so checks are O(1).",
        "'Return ALL distinct configurations' (not just whether one exists) signals full enumeration by backtracking."
      ],
      interviewRecall: [
        "Exactly one queen per row: recurse on row, choose a column.",
        "Three conflict sets: cols, diag1 = row - col, diag2 = row + col; each check is O(1).",
        "Choose = add to all three sets + record column; un-choose = remove all three + pop.",
        "Reconstruct a row as '.'*col + 'Q' + '.'*(n-col-1); n=2 and n=3 legitimately yield []."
      ]
    }
  ]);
})();
