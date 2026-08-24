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
            "**A. What is being asked?** Enumerate *every* multiset of candidates (repeats allowed) that sums to exactly `target`, each multiset reported once.\n\n" +
            "**B. Brute force idea.** Try to build sums by picking any candidate at every step. The danger is two-fold: infinite growth (numbers can be reused) and duplicates (`[2,3]` vs `[3,2]`). We need structure that both terminates and de-duplicates.\n\n" +
            "**D. Key observation \u2014 the two levers.** (1) To *reuse* an element, when we recurse after choosing `candidates[i]` we pass the **same** index `i` again, so `i` is still available next level. (2) To *avoid duplicate combinations*, we never look **backwards**: each recursive call is only allowed to choose candidates at index `>= start`. That imposes a fixed non-decreasing order on the picks, so every multiset is generated in exactly one canonical order and thus counted once.\n\n" +
            "**E. Pattern / structure.** Classic backtracking = DFS over a decision tree. At each node we decide which candidate (from `start` onward) to append. **choose** append `candidates[i]` and subtract it from the remaining target; **explore** recurse with `start = i` (reuse allowed) and the reduced remainder; **un-choose** pop the value back off so the shared `path` list is clean for the sibling branch.\n\n" +
            "**G/H. What state is carried.** `path` = the candidates chosen so far on this root-to-node route; `remaining` = target minus the sum of `path`; `start` = the smallest index we are still allowed to pick, which enforces the no-going-back rule.\n\n" +
            "**Base cases / pruning.** If `remaining == 0` we have a complete valid combination \u2014 record a **copy** of `path` (a copy, because `path` keeps mutating). If `remaining < 0` this branch overshot \u2014 prune (return). Sorting `candidates` first lets us prune even earlier: once `candidates[i] > remaining`, every later candidate is also too big, so we can `break` the loop.\n\n" +
            "**I. Step by step.** Sort candidates. Start DFS at `(start=0, remaining=target)`. Loop `i` from `start`: if `candidates[i] > remaining` break; otherwise append it, recurse with `(i, remaining - candidates[i])`, then pop. When `remaining` hits 0, snapshot the path.\n\n" +
            "**J. Why correct.** The `start` index guarantees picks are non-decreasing by index, so each distinct multiset corresponds to exactly one path in the tree \u2014 no duplicates, none missed. Subtracting toward 0 guarantees the recorded paths sum to target.\n\n" +
            "**K/L. Complexity.** Let `T` be target and `M` the smallest candidate; the tree depth is at most `T/M` and its branching is bounded by `N`, giving `O(N^(T/M))` time in the worst case. Extra space is the recursion stack plus `path`, `O(T/M)` (output not counted).\n\n" +
            "**M. Interview mindset.** 'All combinations / all ways to reach X, with reuse' means backtracking with a start index. Passing `i` (not `i+1`) is what enables reuse; requiring `i >= start` is what kills duplicates.",
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
            "**A. What is being asked?** Enumerate every full placement of `n` mutually non-attacking queens and render each as a board of strings.\n\n" +
            "**B. Brute force framing.** Trying all `C(n*n, n)` placements is astronomically large. The first real reduction is the observation that **each row holds exactly one queen**, so the problem becomes: for row 0, 1, ..., n-1, pick a column for that row's queen such that it does not conflict with any queen already placed.\n\n" +
            "**E. Pattern / structure.** Backtracking row by row. **choose** put a queen at `(row, col)`; **explore** recurse to `row + 1`; **un-choose** remove it before trying the next column. The decision tree has one level per row and up to `n` branches per level.\n\n" +
            "**G/H. State carried.** A 2-D `board` of `'.'`/`'Q'`, and the current `row`. Before placing at `(row, col)` we call `is_safe`, which scans upward in the same column and along both upper diagonals to confirm no earlier queen attacks that square (we never need to look at rows below `row` because they are still empty).\n\n" +
            "**Base case / pruning.** When `row == n` all rows are filled \u2014 snapshot the board as strings. `is_safe` is the pruning: an unsafe square is skipped so its whole subtree is never explored.\n\n" +
            "**I. Step by step.** For `row`, loop `col` 0..n-1; if `is_safe(row, col)`, place `'Q'`, recurse to `row+1`, then reset to `'.'`. Collect a rendered copy whenever a full board is reached.\n\n" +
            "**J. Why correct.** Because we only ever add a queen that conflicts with none already placed, any board reaching row `n` is fully valid; and by trying every safe column in every row we generate all solutions exactly once (row order fixes a canonical generation order).\n\n" +
            "**K/L. Complexity.** The branching over rows gives roughly `O(N!)` leaves, and each `is_safe` check is `O(N)` \u2014 fine for `n <= 9`. Space is `O(N^2)` for the board plus `O(N)` recursion depth.",
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
            "**D. Key observation \u2014 diagonals have a closed form.** Every square on the same **'\\' (top-left to bottom-right) diagonal** shares the same value of `row - col`; every square on the same **'/' (top-right to bottom-left) diagonal** shares the same value of `row + col`. Combined with the column index, these two numbers uniquely identify the three attack lines a queen controls (the row line is handled automatically because we place one queen per row).\n\n" +
            "**E. Pattern / data structure.** Keep three hash **sets** of the lines already occupied: `cols` (columns), `diag1` (values of `row - col`), and `diag2` (values of `row + col`). Checking whether `(row, col)` is safe becomes three `O(1)` membership tests instead of an `O(N)` scan.\n\n" +
            "**G/H. State carried.** The three sets, plus a `path` list holding the chosen column for each row so far (enough to reconstruct the board). `diag1` uses `row - col`, which can be negative \u2014 that is fine for a set/dict key.\n\n" +
            "**Base case / pruning.** When `row == n`, reconstruct the board: for each row's stored column, build a string of `'.'` with a single `'Q'` at that column. Pruning is the set test \u2014 if `col in cols or (row - col) in diag1 or (row + col) in diag2`, skip.\n\n" +
            "**I. Step by step.** At `row`, loop `col`; if the column and both diagonals are free, add `col`/`row-col`/`row+col` to the three sets and append `col` to `path` (**choose**), recurse to `row + 1` (**explore**), then remove all three set entries and pop `path` (**un-choose**). At `row == n`, render and store the solution.\n\n" +
            "**J. Why correct.** A queen at `(row, col)` attacks exactly the squares sharing its column, its `row - col` diagonal, or its `row + col` diagonal; excluding those three sets guarantees no two placed queens attack each other. One queen per row means the row line never conflicts. Every safe column in every row is tried, so all solutions are produced once.\n\n" +
            "**K/L. Complexity.** Still `O(N!)` leaves, but each safety check and each choose/un-choose is `O(1)`, so this is meaningfully faster in practice. Space is `O(N)` for the three sets, `path`, and the recursion stack.\n\n" +
            "**M. Interview mindset.** The move that impresses is encoding diagonals as `row - col` and `row + col`; it turns constraint checking from a scan into constant-time set lookups \u2014 the standard optimization for N-Queens and grid-constraint backtracking generally.",
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
