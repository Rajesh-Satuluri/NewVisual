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
            "**What it asks.** Enumerate *every* multiset of `candidates` (each value may be reused an unlimited number of times) whose elements sum to exactly `target`, reporting each distinct multiset once. Order within a combination is irrelevant, so `[2,2,3]` and `[3,2,2]` are the *same* answer and must appear only once.\n\n" +
            "**Why the naive idea fails.** The obvious move is to try picking any candidate at every step and collect the runs that hit `target`. Two things break it. First, growth is unbounded: because numbers can be reused, a purely free choice at each step never terminates on its own \u2014 you need the sum itself to bound the depth. Second, it floods the answer with duplicates \u2014 `[2,3]` and `[3,2]` are the same multiset but a free choice generates both, once for every ordering. We need a decision tree that both *terminates* and produces each combination in exactly one canonical form.\n\n" +
            "**Key Idea.** Model the search as a decision tree where each node chooses the *next* element of the combination, and control it with two levers. (1) *Reuse:* after choosing `candidates[i]`, recurse while still allowing index `i` \u2014 so the same value can be picked again on the next level, which is exactly what makes `2 + 2 + 3` reachable. (2) *No duplicates:* forbid looking backwards \u2014 each recursive call may only choose candidates at index `>= start`. That forces every combination to be built in non-decreasing index order, so each distinct multiset corresponds to exactly one root-to-leaf path. Pair this with a `remaining` counter (target minus the running sum) that you drive toward `0`, and the tree prunes itself: a branch dies the instant it overshoots.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `candidates` first; this enables the strongest pruning below (a single overshoot ends the level).\n" +
            "2. Carry three pieces of state: `path` (candidates chosen so far on this branch), `remaining` (target minus the sum of `path`), and `start` (smallest index still allowed to pick).\n" +
            "3. Start the DFS at `(start = 0, remaining = target)` \u2014 the root, with nothing chosen.\n" +
            "4. **Base / goal case:** when `remaining == 0`, `path` sums to `target` exactly; record a **copy** of `path` and return.\n" +
            "5. **choose:** loop `i` from `start`; append `candidates[i]` to `path`, conceptually subtracting it from `remaining`.\n" +
            "6. **explore:** recurse with `start = i` (not `i + 1`, so the value stays reusable) and `remaining - candidates[i]`.\n" +
            "7. **un-choose:** pop `candidates[i]` back off `path` so the sibling branch resumes from the exact state it had before this choice.\n\n" +
            "**Why it works.** Requiring `i >= start` makes every accepted sequence non-decreasing by index, so each distinct multiset maps to exactly one path in the tree \u2014 none duplicated, none missed. Reusing index `i` on recursion is precisely what allows repeats of a value. Driving `remaining` down to `0` guarantees every recorded `path` sums to `target`, and pruning at `candidates[i] > remaining` discards only branches that can never reach `0`. The un-choose step is what lets one shared `path` object serve every branch: undoing the last append restores the exact partial state the parent had, so sibling branches never see each other's leftovers.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record a *copy* of `path` at a hit (`path[:]`); appending the live list stores a reference that later mutations will corrupt.\n" +
            "- Pass `i`, not `i + 1`, to the recursive call \u2014 `i + 1` silently forbids reuse and produces wrong answers here (it would solve Combination Sum II's no-reuse variant instead).\n" +
            "- A branch can overshoot: if `remaining < 0` it must be pruned. With a sorted array this is cleaner \u2014 once `candidates[i] > remaining`, every later candidate also overshoots, so `break` the whole loop instead of `continue`-ing.\n" +
            "- Forgetting the `path.pop()` un-choose leaves stale elements that poison every sibling branch.\n" +
            "- All candidates are `>= 2` and `target` is bounded, so depth is finite and the search always terminates.\n\n" +
            "**Complexity.** Let `T` be `target` and `M` the smallest candidate; tree depth is at most `T/M` and branching is bounded by `N`, giving `O(N^(T/M))` time in the worst case. Extra space is `O(T/M)` for the recursion stack plus `path` (the output list itself is not counted).\n\n" +
            "**Interview mindset.** 'Find ALL combinations / all ways to reach X, with reuse' is the textbook signal for backtracking with a start index. Passing `i` enables reuse; requiring `i >= start` kills duplicates \u2014 those two choices are the entire trick, and naming them explicitly is what an interviewer wants to hear.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of lists of ints.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode instantiates this class and calls combinationSum on the object.\n" +
            "\n" +
            "    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:  # Return every multiset of candidates summing to target.\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n" +
            "\n" +
            "        candidates.sort()  # Sort ascending so an overshoot lets us break the whole level at once.\n" +
            "                           # Why: once candidates[i] > remaining, every LATER candidate is larger and also overshoots.\n" +
            "                           # State: candidates is now non-decreasing; indices still address the same value pool.\n" +
            "                           # Execution flow: Python continues to the setup below.\n" +
            "\n" +
            "        result = []  # Collects every valid combination, each stored as a COPY of path.\n" +
            "                     # State: starts empty; one entry appended per exact hit.\n" +
            "\n" +
            "        path = []  # The combination currently being built along this root-to-leaf branch of the tree.\n" +
            "                   # State: mutated in place by CHOOSE (append) and UN-CHOOSE (pop); never stored directly.\n" +
            "                   # Execution flow: Python defines the recursive helper next.\n" +
            "\n" +
            "        # ==================== PHASE 2: DECISION TREE (choose / explore / un-choose) ====================\n" +
            "\n" +
            "        # Mental model: each backtrack call decides which candidate to add NEXT to path.\n" +
            "        #   start     = smallest index still allowed, so combinations are built in non-decreasing index order.\n" +
            "        #   remaining = target minus the sum of path, i.e. how much is still needed to reach target.\n" +
            "        # One call fans out into one child branch per allowed candidate; the tree is that fan-out repeated.\n" +
            "\n" +
            "        def backtrack(start: int, remaining: int) -> None:  # Explore every combination that continues from index 'start'.\n" +
            "\n" +
            "            if remaining == 0:  # GOAL: path sums to target exactly, so nothing more can or should be added.\n" +
            "                result.append(path[:])  # Record a COPY; path keeps mutating, so store a snapshot, not the live list.\n" +
            "                                        # Why a copy: appending path itself stores a reference that later pops would corrupt.\n" +
            "                return  # Branch done; control returns to the caller's loop, which UN-CHOOSES and tries the next sibling.\n" +
            "\n" +
            "            for i in range(start, len(candidates)):  # Try each candidate at index >= start (never look backwards).\n" +
            "                                                     # Why i >= start: forbidding earlier indices makes every combo non-decreasing,\n" +
            "                                                     #   so each multiset maps to exactly ONE path -> no duplicates, none missed.\n" +
            "                                                     # Execution flow: after a child returns, Python advances i to the next sibling.\n" +
            "\n" +
            "                if candidates[i] > remaining:  # This candidate alone already overshoots what is left to reach.\n" +
            "                    break  # PRUNE: the array is sorted, so every later candidate overshoots too -> abandon the whole level.\n" +
            "                           # Why safe: no remaining sibling can reach remaining == 0, so skipping them loses no solution.\n" +
            "\n" +
            "                path.append(candidates[i])  # CHOOSE: tentatively add this candidate to the current combination.\n" +
            "                                            # State: path now represents one deeper partial combination.\n" +
            "\n" +
            "                backtrack(i, remaining - candidates[i])  # EXPLORE: recurse to decide the NEXT element.\n" +
            "                                                         # Why pass i (not i + 1): re-allowing index i lets the SAME value repeat.\n" +
            "                                                         # Execution flow: this call PAUSES the loop until the child subtree finishes,\n" +
            "                                                         #   then resumes here at the next line.\n" +
            "\n" +
            "                path.pop()  # UN-CHOOSE (backtrack): remove the candidate just tried.\n" +
            "                            # Why: undoing the choice restores path to its prior state, so the next sibling starts clean.\n" +
            "                            # Execution flow: the loop continues with the next i, exploring a different choice at this level.\n" +
            "\n" +
            "        # ==================== PHASE 3: RUN THE SEARCH ====================\n" +
            "\n" +
            "        backtrack(0, target)  # Begin at the root: nothing chosen, full target remaining, all indices allowed.\n" +
            "        return result  # Every branch explored and every hit recorded: hand back all combinations.",
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
            "**What it asks.** Enumerate every full placement of `n` mutually non-attacking queens on an `n x n` board and render each valid placement as a list of row strings (`'Q'` for a queen, `'.'` for an empty square). A queen attacks along its row, its column, and both diagonals.\n\n" +
            "**Why the naive idea fails.** Trying all `C(n*n, n)` ways to drop `n` queens on `n*n` squares is astronomically large and wastes almost all of its work on obviously illegal boards. The first real reduction is a structural observation: since no two queens can share a row, **each row holds exactly one queen**. That collapses the problem from choosing `n` squares out of `n*n` to a per-row column choice \u2014 for rows `0..n-1`, pick a column that doesn't conflict with any queen already placed. The row-attack constraint is then satisfied automatically.\n\n" +
            "**Key Idea.** Treat it as a decision tree with one level per row and up to `n` branches (columns) per level, and *prune* the instant a placement is illegal. A partial board that already contains a conflict can never grow into a solution, so we reject that column immediately and never explore its subtree \u2014 that early pruning is what makes an otherwise factorial search tractable for `n <= 9`. Each node of the tree fixes one more row; a leaf at depth `n` is a complete board.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a 2-D `board` of `'.'`/`'Q'` and process one `row` at a time, top to bottom.\n" +
            "2. **Base / goal case:** when `row == n`, every row is filled \u2014 render the board (join each row list into a string) and record it, then return.\n" +
            "3. For the current `row`, loop `col` from `0` to `n-1`.\n" +
            "4. Test `is_safe(row, col)`: scan *upward* in the same column, and along both upper diagonals, for an existing `'Q'`. Rows below `row` are still empty, so they never need checking.\n" +
            "5. **choose:** if the square is safe, set `board[row][col] = 'Q'`.\n" +
            "6. **explore:** recurse to `row + 1` to place the next row's queen.\n" +
            "7. **un-choose:** reset `board[row][col] = '.'` before trying the next column, so the board returns to the state the parent left it in.\n\n" +
            "**Why it works.** A queen is only ever added when it conflicts with none already on the board, so any board that reaches row `n` is fully valid by construction. Fixing a top-to-bottom row order gives every solution exactly one canonical generation order, and trying every safe column in every row means all solutions are produced exactly once \u2014 none duplicated, none missed. The un-choose step is what lets a single shared `board` serve every branch: resetting the cell to `'.'` restores the exact partial board the recursion started from, so sibling columns explore independently.\n\n" +
            "**Common Gotchas.**\n" +
            "- The un-choose step is essential: forgetting to reset the square to `'.'` leaves phantom queens that corrupt every sibling branch.\n" +
            "- `is_safe` only needs to look *upward* (the same column and the two upper diagonals); scanning the whole board is wasteful, and checking rows below is meaningless since they are still empty.\n" +
            "- `n = 2` and `n = 3` have no solutions and must legitimately return an empty list.\n" +
            "- Record a rendered *copy* of the board at a solution; storing the live grid would be overwritten as the search backtracks.\n\n" +
            "**Complexity.** Branching over rows yields roughly `O(N!)` leaves (row 0 has `n` choices, the next fewer, and so on), and each `is_safe` check costs `O(N)` \u2014 fine for `n <= 9`. Space is `O(N^2)` for the board plus `O(N)` recursion depth.\n\n" +
            "**Interview mindset.** 'Place N items on a grid with no two conflicting, return all configurations' is a backtracking-by-row signal. The one-queen-per-row insight that turns a 2-D placement into a 1-D column choice per row is the move to reach for first; the `O(N)` scan version is the honest starting point before optimizing the safety check to `O(1)`.",
          rcs:
            "from typing import List  # List lets the type hints say we return a list of solutions, each a list of row strings.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode instantiates this class and calls solveNQueens on the object.\n" +
            "\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:  # Return every board placing n mutually non-attacking queens.\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE THE BOARD ====================\n" +
            "\n" +
            "        # Key structural fact: no two queens may share a row, so every solution has EXACTLY ONE queen per row.\n" +
            "        # That collapses a 2-D placement into a 1-D choice: for each row, pick a column that is not attacked.\n" +
            "\n" +
            "        board = [['.'] * n for _ in range(n)]  # n x n grid of '.' (empty); one cell per row becomes 'Q'.\n" +
            "                                               # State: starts all empty; mutated by CHOOSE / UN-CHOOSE during the search.\n" +
            "        result = []  # Collects every completed board, each rendered as a list of row strings.\n" +
            "                     # Execution flow: Python defines the two helpers below, then launches the search.\n" +
            "\n" +
            "        # ==================== PHASE 2: VALIDITY CHECK (scan the three attack lines above) ====================\n" +
            "\n" +
            "        def is_safe(row: int, col: int) -> bool:  # Can a queen sit at (row, col) with no already-placed queen attacking it?\n" +
            "                                                  # Only rows above 'row' hold queens, so we look UPWARD only; rows below are empty.\n" +
            "\n" +
            "            for r in range(row):  # Walk every row above and check the SAME column for an existing queen.\n" +
            "                if board[r][col] == 'Q':  # A queen already occupies this column.\n" +
            "                    return False  # Attacked vertically: reject (row, col).\n" +
            "\n" +
            "            r, c = row - 1, col - 1  # Start one step UP-LEFT along the '\\' diagonal.\n" +
            "            while r >= 0 and c >= 0:  # Stay on the board.\n" +
            "                if board[r][c] == 'Q':  # A queen shares this '\\' diagonal.\n" +
            "                    return False  # Attacked on the up-left diagonal: reject.\n" +
            "                r -= 1  # Keep moving up...\n" +
            "                c -= 1  # ...and left.\n" +
            "\n" +
            "            r, c = row - 1, col + 1  # Start one step UP-RIGHT along the '/' diagonal.\n" +
            "            while r >= 0 and c < n:  # Stay on the board.\n" +
            "                if board[r][c] == 'Q':  # A queen shares this '/' diagonal.\n" +
            "                    return False  # Attacked on the up-right diagonal: reject.\n" +
            "                r -= 1  # Keep moving up...\n" +
            "                c += 1  # ...and right.\n" +
            "\n" +
            "            return True  # No queen attacks via the column or either upper diagonal: the square is safe.\n" +
            "\n" +
            "        # ==================== PHASE 3: DECISION TREE, ONE ROW PER LEVEL ====================\n" +
            "\n" +
            "        # Mental model: each backtrack call decides the column for ONE row; the tree has one level per row,\n" +
            "        # up to n branches (columns) per level, and prunes any column that is not safe.\n" +
            "\n" +
            "        def backtrack(row: int) -> None:  # Place queens in rows 'row', row + 1, ..., n - 1.\n" +
            "\n" +
            "            if row == n:  # GOAL: a queen sits in every row -> a complete, valid board.\n" +
            "                result.append([''.join(r) for r in board])  # Render each row list into a string and store a snapshot.\n" +
            "                                                            # Why snapshot now: the live board keeps mutating as the search backtracks.\n" +
            "                return  # Branch done; return so the caller can UN-CHOOSE and try another column.\n" +
            "\n" +
            "            for col in range(n):  # Try each column as the queen's position in this row.\n" +
            "                if is_safe(row, col):  # Descend only into columns that conflict with no placed queen (PRUNE the rest).\n" +
            "                    board[row][col] = 'Q'  # CHOOSE: place a queen here.\n" +
            "                    backtrack(row + 1)  # EXPLORE: recurse to place a queen in the NEXT row.\n" +
            "                                        # Execution flow: pauses the loop until the subtree finishes, then resumes below.\n" +
            "                    board[row][col] = '.'  # UN-CHOOSE (backtrack): remove the queen so the next column starts clean.\n" +
            "                                           # Why: undoing the placement restores state, keeping sibling branches independent.\n" +
            "\n" +
            "        # ==================== PHASE 4: RUN THE SEARCH ====================\n" +
            "\n" +
            "        backtrack(0)  # Start from the top row with an empty board.\n" +
            "        return result  # Every safe placement explored and every full board recorded: return them all.",
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
            "**What it asks.** Same problem \u2014 all placements of `n` non-attacking queens \u2014 but with the per-square safety check made `O(1)` instead of the `O(N)` scan of the board-scan version.\n\n" +
            "**Why the naive idea fails.** The board-scan version re-walks a column and two diagonals on every attempted placement, an `O(N)` cost paid at every node of a factorial-sized tree. That work is redundant: whether a square is attacked depends only on *which lines are already occupied*, and that set of occupied lines can be maintained incrementally as queens are placed and removed, rather than rediscovered by scanning each time.\n\n" +
            "**Key Idea.** Diagonals have a closed form. Every square on the same **`\\` (top-left to bottom-right) diagonal** shares the same value of `row - col` \u2014 moving down-right increases both `row` and `col` by 1, leaving the difference unchanged. Every square on the same **`/` (top-right to bottom-left) diagonal** shares the same value of `row + col` \u2014 moving down-left increases `row` and decreases `col`, leaving the sum unchanged. Combined with the column index, these two numbers uniquely identify the three attack lines a queen controls (the row line is free \u2014 we place one queen per row). So we can keep three hash **sets** of occupied lines and reduce each safety test to three constant-time membership checks.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain three sets \u2014 `cols` (occupied columns), `diag1` (occupied `row - col` diagonals), `diag2` (occupied `row + col` diagonals) \u2014 and a `path` list storing the chosen column for each row so far.\n" +
            "2. Process one `row` at a time; loop `col` from `0` to `n-1`.\n" +
            "3. **Prune:** if `col in cols` or `(row - col) in diag1` or `(row + col) in diag2`, this square is attacked \u2014 skip it.\n" +
            "4. **choose:** add `col`, `row - col`, and `row + col` to the three sets and append `col` to `path`.\n" +
            "5. **explore:** recurse to `row + 1` to place the next row's queen.\n" +
            "6. **un-choose:** remove all three set entries and pop `path`, freeing those lines for the next column.\n" +
            "7. **Base / goal case:** when `row == n`, reconstruct each solution \u2014 for each stored column `c` build the row string `'.'*c + 'Q' + '.'*(n-c-1)`, then record the board.\n\n" +
            "**Why it works.** A queen at `(row, col)` attacks exactly the squares sharing its column, its `row - col` diagonal, or its `row + col` diagonal; excluding those three sets guarantees no two placed queens attack each other. Placing one queen per row means the row line can never conflict, so the three tracked lines are sufficient. Every safe column in every row is tried and rows are fixed top-to-bottom, so all solutions are produced exactly once. The symmetry of choose and un-choose (add three keys / remove the same three) keeps the sets an exact record of the queens currently on the board at every node.\n\n" +
            "**Common Gotchas.**\n" +
            "- `row - col` can be negative \u2014 that is perfectly fine as a set key; no offset is required (unlike a fixed-size boolean array, where you would add `n - 1`).\n" +
            "- The un-choose must remove from *all three* sets and pop `path`; leaving any single entry behind poisons later branches with a phantom queen.\n" +
            "- Store the column-per-row in `path` rather than a full board \u2014 it is enough to reconstruct the answer and far cheaper to copy and undo.\n" +
            "- `n = 2` and `n = 3` still legitimately yield an empty list.\n\n" +
            "**Complexity.** Still `O(N!)` leaves, but each safety check and each choose/un-choose is `O(1)` instead of `O(N)`, so it is meaningfully faster in practice. Space is `O(N)` for the three sets, `path`, and the recursion stack.\n\n" +
            "**Interview mindset.** Encoding diagonals as `row - col` and `row + col` is the move that impresses: it turns constraint checking from a scan into constant-time set lookups \u2014 the standard optimization for N-Queens and grid-constraint backtracking in general.",
          rcs:
            "from typing import List  # List lets the type hints say we return a list of solutions, each a list of row strings.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode instantiates this class and calls solveNQueens on the object.\n" +
            "\n" +
            "    def solveNQueens(self, n: int) -> List[List[str]]:  # Return every board of n non-attacking queens, with O(1) checks.\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE THE CONFLICT SETS ====================\n" +
            "\n" +
            "        # Key idea: a queen at (row, col) controls three attack lines we must track (the row line is free,\n" +
            "        # since we place exactly one queen per row):\n" +
            "        #   - its COLUMN, identified by col.\n" +
            "        #   - its '\\' diagonal, on which every square shares the SAME value of (row - col).\n" +
            "        #   - its '/' diagonal, on which every square shares the SAME value of (row + col).\n" +
            "        # Keeping occupied lines in hash sets turns each safety test into three O(1) membership checks.\n" +
            "\n" +
            "        cols = set()  # Columns that already hold a queen.\n" +
            "        diag1 = set()  # Occupied '\\' diagonals, keyed by (row - col).\n" +
            "        diag2 = set()  # Occupied '/' diagonals, keyed by (row + col).\n" +
            "        path = []  # path[r] = the column of the queen in row r; enough to rebuild the board at the end.\n" +
            "                   # State: grows by CHOOSE (append) and shrinks by UN-CHOOSE (pop).\n" +
            "        result = []  # Collects every completed board as a list of row strings.\n" +
            "\n" +
            "        # ==================== PHASE 2: DECISION TREE, ONE ROW PER LEVEL ====================\n" +
            "\n" +
            "        # Each backtrack call decides the column for ONE row: one level per row, up to n branches per level,\n" +
            "        # pruning any column whose column or either diagonal is already occupied.\n" +
            "\n" +
            "        def backtrack(row: int) -> None:  # Place queens in rows 'row', row + 1, ..., n - 1.\n" +
            "\n" +
            "            if row == n:  # GOAL: a queen sits in every row -> a complete, valid board.\n" +
            "                board = []  # Build the row strings for this solution.\n" +
            "                for c in path:  # For each stored column c, in row order...\n" +
            "                    board.append('.' * c + 'Q' + '.' * (n - c - 1))  # ...'.'*c, then 'Q', then the trailing dots.\n" +
            "                result.append(board)  # Store this finished board.\n" +
            "                return  # Branch done; return so the caller can UN-CHOOSE and try another column.\n" +
            "\n" +
            "            for col in range(n):  # Try each column for the queen in this row.\n" +
            "                if col in cols or (row - col) in diag1 or (row + col) in diag2:  # Column or a diagonal already attacked?\n" +
            "                    continue  # PRUNE: this square is under attack, so skip it and try the next column.\n" +
            "                              # Why safe: any board through this square puts two queens in conflict -> never a solution.\n" +
            "\n" +
            "                cols.add(col)  # CHOOSE: mark the three attack lines this queen now occupies -- its column...\n" +
            "                diag1.add(row - col)  # ...its '\\' diagonal...\n" +
            "                diag2.add(row + col)  # ...and its '/' diagonal.\n" +
            "                path.append(col)  # Record this row's chosen column.\n" +
            "\n" +
            "                backtrack(row + 1)  # EXPLORE: recurse to place a queen in the NEXT row.\n" +
            "                                    # Execution flow: pauses the loop until the subtree finishes, then resumes below.\n" +
            "\n" +
            "                path.pop()  # UN-CHOOSE (backtrack): remove this row's queen...\n" +
            "                cols.remove(col)  # ...free its column...\n" +
            "                diag1.remove(row - col)  # ...its '\\' diagonal...\n" +
            "                diag2.remove(row + col)  # ...and its '/' diagonal, restoring state for the next column.\n" +
            "                                         # Why: all three sets AND path must be undone, or later branches see phantom queens.\n" +
            "\n" +
            "        # ==================== PHASE 3: RUN THE SEARCH ====================\n" +
            "\n" +
            "        backtrack(0)  # Start from the top row with every set empty.\n" +
            "        return result  # Every safe placement explored and every full board recorded: return them all.",
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
    },

    {
      id: "subsets",
      lc: 78,
      title: "Subsets",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/subsets/",
      meta: { pattern: "Backtracking (include/exclude)", dataStructure: "Recursion / Array", technique: "Choose-explore-unchoose from a start index" },
      description:
        "Given an integer array `nums` of **unique** elements, return **all possible subsets** (the *power set*).\n\n" +
        "The solution set must **not** contain duplicate subsets, and you may return the subsets in any order.",
      constraints: [
        "`1 <= nums.length <= 10`",
        "`-10 <= nums[i] <= 10`",
        "All the numbers of `nums` are **unique**."
      ],
      notes: [
        "A set of `n` elements has exactly `2^n` subsets, so the output alone is exponential \u2014 there is no sub-exponential solution.",
        "The empty subset `[]` is always part of the answer, and so is the full array.",
        "Because the elements are unique, no duplicate-subset pruning is needed here (contrast with Subsets II)."
      ],
      examples: [
        {
          input: "nums = [1, 2, 3]",
          output: "[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]",
          reasoning: "All 2^3 = 8 subsets, from the empty set up to the full set.",
          visual:
            "```\n" +
            "include/exclude decision tree (branch left = take nums[i])\n" +
            "                     []\n" +
            "          take 1 /        \\ skip 1\n" +
            "            [1]              []\n" +
            "        +2 /   \\ -2      +2 /   \\ -2\n" +
            "     [1,2]     [1]     [2]      []\n" +
            "     +3 -3    +3 -3   +3 -3    +3 -3\n" +
            "  [1,2,3]..  every leaf is one subset (8 leaves)\n" +
            "```"
        },
        {
          input: "nums = [0]",
          output: "[[], [0]]",
          reasoning: "Two subsets: the empty set and the whole set."
        },
        {
          input: "nums = [1, 2]",
          output: "[[], [1], [2], [1,2]]",
          reasoning: "2^2 = 4 subsets."
        }
      ],
      approaches: [
        {
          name: "Iterative cascading (build up)",
          time: "O(n * 2^n)",
          space: "O(n * 2^n)",
          whenToUse: "A clean non-recursive alternative worth mentioning as 'another way'; it makes the doubling nature of the power set obvious.",
          logic:
            "**What it asks.** Produce every subset of `nums` \u2014 all `2^n` of them \u2014 with no duplicates.\n\n" +
            "**Why the naive idea fails.** There is no way to avoid producing `2^n` subsets (that is the required output), but you can still generate them badly \u2014 e.g. by re-deriving each subset from scratch. The goal is to build them incrementally so each new subset reuses work already done.\n\n" +
            "**Key Idea.** Adding one new element `num` to the picture exactly *doubles* the set of subsets: every subset that existed before is still valid, and each also spawns a new subset with `num` appended. So start from `[[]]` and fold in one number at a time, each time copying every existing subset with `num` added.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `result = [[]]` (the power set of the empty prefix is just the empty subset).\n" +
            "2. For each `num` in `nums`, look at every subset currently in `result`.\n" +
            "3. For each such subset, make a copy that also contains `num`, and collect those new subsets.\n" +
            "4. Append all the new subsets to `result`, doubling its size.\n\n" +
            "**Why it works.** After processing the first `k` numbers, `result` holds exactly the `2^k` subsets of that prefix. Folding in the `(k+1)`-th number partitions the `2^(k+1)` subsets of the larger prefix into those that exclude it (already present) and those that include it (the freshly copied ones) \u2014 so every subset appears exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- Iterate over a snapshot of `result` while extending it, or you will keep re-processing the very subsets you just added (in Python, build a separate `new_subsets` list first).\n" +
            "- Append `subset + [num]` (a fresh list), never mutate the existing subset in place.\n\n" +
            "**Complexity.** Time `O(n * 2^n)` \u2014 `2^n` subsets, each costing up to `O(n)` to copy; space `O(n * 2^n)` for the output.\n\n" +
            "**Interview mindset.** Offer this to show you understand the power set doubles with each element, then present the backtracking template as the more general pattern.",
          rcs:
            "class Solution:\n" +
            "    def subsets(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = [[]]                        # Power set of the empty prefix.\n" +
            "        for num in nums:                     # Fold in one number at a time.\n" +
            "            new_subsets = []\n" +
            "            for subset in result:            # For every subset built so far...\n" +
            "                new_subsets.append(subset + [num])  # ...a copy that also includes num.\n" +
            "            result += new_subsets            # Doubles the collection.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def subsets(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = [[]]\n" +
            "        for num in nums:\n" +
            "            new_subsets = []\n" +
            "            for subset in result:\n" +
            "                new_subsets.append(subset + [num])\n" +
            "            result += new_subsets\n" +
            "        return result"
        },
        {
          name: "Backtracking (choose / un-choose from a start index)",
          time: "O(n * 2^n)",
          space: "O(n)",
          whenToUse: "The canonical template: 'enumerate ALL subsets / all combinations' is a textbook backtracking signal, and this generalizes directly to Subsets II and the combination problems.",
          logic:
            "**What it asks.** Enumerate every subset of `nums`, each exactly once.\n\n" +
            "**Why the naive idea fails.** A subset is a set of yes/no decisions \u2014 include or exclude each element. Making those decisions carelessly (e.g. picking any remaining element at every step) generates the same subset in many orders, so `[1,2]` and `[2,1]` both appear. We need each subset to be built in exactly one canonical order.\n\n" +
            "**Key Idea.** Fix a left-to-right order with a `start` index: each recursive call may only choose elements at index `>= start`. That forces every subset to be built in increasing index order, so each subset corresponds to exactly one root-to-leaf path. Crucially, in the power set **every node of the tree is itself a valid subset** \u2014 not just the leaves \u2014 so we record `path` at the *entry* of every call.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Carry `path` (elements chosen so far) and `start` (smallest index still allowed).\n" +
            "2. On entering `backtrack(start)`, record a **copy** of `path` \u2014 the current subset is complete as-is.\n" +
            "3. **choose:** loop `i` from `start`; append `nums[i]` to `path`.\n" +
            "4. **explore:** recurse with `start = i + 1` (each element used at most once, so advance the index).\n" +
            "5. **un-choose:** pop `nums[i]` so the sibling branch starts from a clean `path`.\n\n" +
            "**Why it works.** Requiring `i >= start` means every accepted sequence is strictly increasing by index, so each subset maps to exactly one path \u2014 none duplicated, none missed. Recording at every node (not only leaves) captures the partial subsets, which are themselves valid answers.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record a *copy* (`path[:]`); appending the live list stores a reference that later mutations corrupt.\n" +
            "- Recurse with `i + 1`, not `i` \u2014 `i` would allow reuse and produce multisets, which is wrong for subsets.\n" +
            "- No explicit base case is needed beyond the loop naturally ending; the append-at-entry handles the empty and full subsets uniformly.\n\n" +
            "**Complexity.** Time `O(n * 2^n)` \u2014 `2^n` subsets, each up to `O(n)` to copy; space `O(n)` for the recursion stack and `path` (output not counted).\n\n" +
            "**Interview mindset.** The include/exclude-with-start-index template is the foundation for the whole subset/combination family \u2014 remember 'record at every node, advance the index to forbid reuse.'",
          rcs:
            "class Solution:\n" +
            "    def subsets(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        path = []                             # The subset we are currently building.\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            result.append(path[:])            # Every node is a valid subset -> record a COPY.\n" +
            "            for i in range(start, len(nums)): # Only look forward: no going back.\n" +
            "                path.append(nums[i])          # CHOOSE nums[i].\n" +
            "                backtrack(i + 1)              # EXPLORE with the next index (no reuse).\n" +
            "                path.pop()                    # UN-CHOOSE so the sibling starts clean.\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def subsets(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            result.append(path[:])\n" +
            "            for i in range(start, len(nums)):\n" +
            "                path.append(nums[i])\n" +
            "                backtrack(i + 1)\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Return ALL subsets / the power set / all combinations of any size' \u2192 backtracking with a start index.",
        "Each element is an independent include/exclude decision \u2192 a binary decision tree.",
        "Advancing to i + 1 (never i) enforces 'use each element at most once'.",
        "Recording at every node (not just leaves) is what makes this the power set rather than fixed-size combinations."
      ],
      interviewRecall: [
        "Template: choose (append), explore (recurse with i + 1), un-choose (pop).",
        "Record a COPY of path at the top of every call \u2014 every node is a valid subset.",
        "start index forces increasing order, so no subset is generated twice.",
        "Alternative: iterative cascading from [[]], doubling for each new element."
      ]
    },

    {
      id: "permutations",
      lc: 46,
      title: "Permutations",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/permutations/",
      meta: { pattern: "Backtracking (ordering)", dataStructure: "Recursion / Array", technique: "Choose-explore-unchoose with a used[] marker" },
      description:
        "Given an array `nums` of **distinct** integers, return **all the possible permutations** (every ordering of the elements). You may return the answer in any order.",
      constraints: [
        "`1 <= nums.length <= 6`",
        "`-10 <= nums[i] <= 10`",
        "All the integers of `nums` are **unique**."
      ],
      notes: [
        "There are exactly `n!` permutations of `n` distinct elements, so the output is factorial in size.",
        "Unlike subsets and combinations, **order matters** here \u2014 `[1,2]` and `[2,1]` are different permutations.",
        "Because the elements are distinct, no duplicate pruning is needed (contrast with Permutations II)."
      ],
      examples: [
        {
          input: "nums = [1, 2, 3]",
          output: "[[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]",
          reasoning: "All 3! = 6 orderings of three distinct numbers.",
          visual:
            "```\n" +
            "pick position 0, then 1, then 2 (only unused values branch)\n" +
            "               ( )\n" +
            "        1 /     2 |     3 \\\n" +
            "       (1)      (2)      (3)\n" +
            "      2 / 3\\   1 / 3\\   1 / 2\\\n" +
            "    123 132  213 231  312 321   <- 6 leaves = 6 permutations\n" +
            "```"
        },
        {
          input: "nums = [0, 1]",
          output: "[[0,1], [1,0]]",
          reasoning: "Two orderings of two elements."
        },
        {
          input: "nums = [1]",
          output: "[[1]]",
          reasoning: "A single element has exactly one permutation."
        }
      ],
      approaches: [
        {
          name: "Backtracking by swapping (in place)",
          time: "O(n * n!)",
          space: "O(n)",
          whenToUse: "A space-lean alternative that mutates the array itself; good to mention when asked to avoid the extra used[] array.",
          logic:
            "**What it asks.** Enumerate every ordering of `nums`, each exactly once.\n\n" +
            "**Why the naive idea fails.** Building permutations by repeatedly scanning for 'which elements are still free' works but needs bookkeeping. If instead we think of it as *deciding what sits in each position*, we can rearrange the array in place and avoid an auxiliary structure.\n\n" +
            "**Key Idea.** Fix positions left to right. At position `first`, any of the elements from index `first` onward may go there. Swap each candidate into `first`, recurse to fill the rest, then swap it back. The prefix `nums[0:first]` is 'locked in' at each level; `nums[first:]` is the pool still to be arranged.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Recurse on `first`, the position currently being filled.\n" +
            "2. If `first == n`, the whole array is arranged \u2014 record a **copy** of `nums`.\n" +
            "3. **choose:** for each `i` from `first` to `n-1`, swap `nums[first]` and `nums[i]` so `nums[i]` occupies `first`.\n" +
            "4. **explore:** recurse to `first + 1`.\n" +
            "5. **un-choose:** swap them back so the next candidate is tried from the original arrangement.\n\n" +
            "**Why it works.** Every element from `first` onward gets a turn in position `first`, and each choice fixes one more position, so all `n!` orderings are produced. Swapping back restores the pool exactly, keeping sibling branches independent.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record a *copy* (`nums[:]`); the live array keeps mutating as the search backtracks.\n" +
            "- The swap-back is the un-choose step \u2014 omitting it scrambles the array for sibling branches.\n" +
            "- Loop `i` from `first` (not `first + 1`), so the element already in place is also a valid choice for its own position.\n\n" +
            "**Complexity.** Time `O(n * n!)` \u2014 `n!` permutations, each `O(n)` to copy; space `O(n)` for the recursion stack (no extra array).\n\n" +
            "**Interview mindset.** The swap trick is the classic 'permutations in O(1) extra space beyond recursion' answer \u2014 reach for it when interviewers ask to drop the used[] array.",
          rcs:
            "class Solution:\n" +
            "    def permute(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        n = len(nums)\n" +
            "\n" +
            "        def backtrack(first: int) -> None:\n" +
            "            if first == n:                    # All positions fixed: a full ordering.\n" +
            "                result.append(nums[:])        # Record a COPY of the current arrangement.\n" +
            "                return\n" +
            "            for i in range(first, n):         # Any element from 'first' on can go here.\n" +
            "                nums[first], nums[i] = nums[i], nums[first]  # CHOOSE: put nums[i] at 'first'.\n" +
            "                backtrack(first + 1)          # EXPLORE the remaining positions.\n" +
            "                nums[first], nums[i] = nums[i], nums[first]  # UN-CHOOSE: swap back.\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def permute(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        n = len(nums)\n" +
            "\n" +
            "        def backtrack(first: int) -> None:\n" +
            "            if first == n:\n" +
            "                result.append(nums[:])\n" +
            "                return\n" +
            "            for i in range(first, n):\n" +
            "                nums[first], nums[i] = nums[i], nums[first]\n" +
            "                backtrack(first + 1)\n" +
            "                nums[first], nums[i] = nums[i], nums[first]\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        },
        {
          name: "Backtracking with a used[] marker",
          time: "O(n * n!)",
          space: "O(n)",
          whenToUse: "The clearest template: an explicit path + used[] set that maps directly onto choose / explore / un-choose and generalizes to Permutations II.",
          logic:
            "**What it asks.** Enumerate all `n!` orderings of the distinct elements in `nums`.\n\n" +
            "**Why the naive idea fails.** Because order matters, we cannot use the 'start index' trick from subsets \u2014 that forbids revisiting earlier elements, but a permutation may place element 0 *after* element 2. Every unused element is a legal next choice at every step, so we need to know which elements are still available.\n\n" +
            "**Key Idea.** Grow a `path` one element at a time, and keep a boolean `used[]` array marking which elements are already in `path`. At each step, branch over every element that is **not** yet used. When `path` reaches length `n`, it is a complete permutation.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Carry `path` (the ordering so far) and `used` (a boolean per index).\n" +
            "2. Base case: when `len(path) == len(nums)`, record a **copy** of `path`.\n" +
            "3. **choose:** loop over every index `i`; skip it if `used[i]` (prune). Otherwise mark `used[i] = True` and append `nums[i]`.\n" +
            "4. **explore:** recurse.\n" +
            "5. **un-choose:** pop `nums[i]` and set `used[i] = False`, freeing it for other branches.\n\n" +
            "**Why it works.** At each level we consider exactly the elements not already placed, so no element repeats within one permutation, and because we try *all* of them, every ordering is generated. The `used` flag flipping back on un-choose keeps sibling branches independent.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record a *copy* of `path`; the live list keeps changing.\n" +
            "- Reset `used[i] = False` **and** pop `path` on un-choose \u2014 forgetting either poisons later branches.\n" +
            "- The pool is 'all unused indices', not 'indices >= start' \u2014 using a start index here would wrongly produce combinations, not permutations.\n\n" +
            "**Complexity.** Time `O(n * n!)` \u2014 `n!` leaves, each `O(n)` to copy; space `O(n)` for `path`, `used`, and the recursion stack.\n\n" +
            "**Interview mindset.** 'All orderings / arrangements where order matters' \u2192 backtracking over the *unused* elements with a used[] marker. This is the template to extend for Permutations II (add a sorted-sibling skip).",
          rcs:
            "class Solution:\n" +
            "    def permute(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        path = []                             # The ordering being built.\n" +
            "        used = [False] * len(nums)            # used[i] = is nums[i] already in path?\n" +
            "\n" +
            "        def backtrack() -> None:\n" +
            "            if len(path) == len(nums):        # A full ordering is complete.\n" +
            "                result.append(path[:])        # Record a COPY.\n" +
            "                return\n" +
            "            for i in range(len(nums)):        # Consider every element as the next pick.\n" +
            "                if used[i]:                   # Already placed -> skip (prune).\n" +
            "                    continue\n" +
            "                used[i] = True                # CHOOSE nums[i].\n" +
            "                path.append(nums[i])\n" +
            "                backtrack()                   # EXPLORE the rest of the ordering.\n" +
            "                path.pop()                    # UN-CHOOSE.\n" +
            "                used[i] = False\n" +
            "\n" +
            "        backtrack()\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def permute(self, nums: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        path = []\n" +
            "        used = [False] * len(nums)\n" +
            "\n" +
            "        def backtrack() -> None:\n" +
            "            if len(path) == len(nums):\n" +
            "                result.append(path[:])\n" +
            "                return\n" +
            "            for i in range(len(nums)):\n" +
            "                if used[i]:\n" +
            "                    continue\n" +
            "                used[i] = True\n" +
            "                path.append(nums[i])\n" +
            "                backtrack()\n" +
            "                path.pop()\n" +
            "                used[i] = False\n" +
            "\n" +
            "        backtrack()\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'All orderings / arrangements' where order matters \u2192 permutation backtracking (not a start index).",
        "You must track which elements are already used \u2192 used[] boolean array (or in-place swaps).",
        "Base case is 'path length == n', unlike subsets which records at every node.",
        "Output size is n! \u2014 factorial, so only small n is feasible."
      ],
      interviewRecall: [
        "Template: choose (mark used + append), explore (recurse), un-choose (pop + unmark).",
        "Branch over UNUSED elements every level \u2014 no start index (that would give combinations).",
        "Record a COPY of path when its length reaches n.",
        "Swap-in-place is the O(1)-extra-space alternative; swap back is the un-choose."
      ]
    },

    {
      id: "subsets-ii",
      lc: 90,
      title: "Subsets II",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/subsets-ii/",
      meta: { pattern: "Backtracking (dedup siblings)", dataStructure: "Recursion / Array", technique: "Sort + skip equal siblings at each level" },
      description:
        "Given an integer array `nums` that **may contain duplicates**, return **all possible subsets** (the *power set*).\n\n" +
        "The solution set must **not** contain duplicate subsets. Return the solution in any order.",
      constraints: [
        "`1 <= nums.length <= 10`",
        "`-10 <= nums[i] <= 10`"
      ],
      notes: [
        "Duplicates in the input are exactly what makes this harder than Subsets \u2014 e.g. `[1,2,2]` must yield `[2]` and `[2,2]` only once each.",
        "**Sort first** so equal values are adjacent; that is what makes duplicate subsets skippable in one comparison.",
        "The de-dup rule fires only *within a level*: skip a value equal to the previous sibling (`i > start and nums[i] == nums[i-1]`), never across levels."
      ],
      examples: [
        {
          input: "nums = [1, 2, 2]",
          output: "[[], [1], [1,2], [1,2,2], [2], [2,2]]",
          reasoning: "Without de-dup we would get [2] and [1,2] twice (once for each of the two 2s). Skipping the equal sibling keeps one of each.",
          visual:
            "```\n" +
            "sorted: [1, 2, 2]  (start index shown as s)\n" +
            "at level s=1: first 2 -> explore;  second 2 has i>start & nums[i]==nums[i-1] -> SKIP\n" +
            "  so [2] is recorded once; [2,2] still forms by descending (start advances)\n" +
            "```"
        },
        {
          input: "nums = [0]",
          output: "[[], [0]]",
          reasoning: "No duplicates; behaves like plain Subsets."
        },
        {
          input: "nums = [2, 1, 2]",
          output: "[[], [1], [1,2], [1,2,2], [2], [2,2]]",
          reasoning: "Sorting to [1,2,2] first is what brings the duplicate 2s next to each other so they can be skipped."
        }
      ],
      approaches: [
        {
          name: "Backtracking with sort + skip equal siblings",
          time: "O(n * 2^n)",
          space: "O(n)",
          whenToUse: "The canonical de-dup pattern: whenever an input with duplicates must yield unique subsets/combinations, sort and skip equal siblings.",
          logic:
            "**What it asks.** Produce every subset of `nums`, but count each *distinct* subset only once even though `nums` may contain repeated values.\n\n" +
            "**Why the naive idea fails.** The plain Subsets backtracking (record at every node, advance the index) still works to enumerate, but with duplicate values it emits the same subset multiple times: with two 2s, choosing 'the first 2' and 'the second 2' both build `[2]`. We need to collapse those identical choices.\n\n" +
            "**Key Idea.** Sort `nums` so equal values sit next to each other. Then, within a single recursion level (the `for` loop over choices), the *first* occurrence of a value is allowed, but any later occurrence equal to its immediate predecessor is skipped \u2014 taking it would build a subtree identical to one a sibling already covers. The test is `i > start and nums[i] == nums[i-1]`: the `i > start` part is what limits the skip to *siblings at the same level*, so a duplicate can still be chosen when we descend deeper (that is how `[2,2]` is still formed).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `nums` so duplicates are adjacent.\n" +
            "2. Carry `path` and `start`; on entering each call, record a **copy** of `path` (every node is a subset).\n" +
            "3. **choose:** loop `i` from `start`. If `i > start and nums[i] == nums[i-1]`, `continue` (skip the duplicate sibling). Otherwise append `nums[i]`.\n" +
            "4. **explore:** recurse with `start = i + 1` (each element used once).\n" +
            "5. **un-choose:** pop `nums[i]`.\n\n" +
            "**Why it works.** For a group of equal values, the branch that takes the *first* of them, then optionally more of them by descending, already generates every distinct multiset of that value (`[]`, `[2]`, `[2,2]`, ...). A sibling that starts by taking a *later* equal value would only regenerate multisets the first branch already produced, so skipping it removes exactly the duplicates and nothing else.\n\n" +
            "**Common Gotchas.**\n" +
            "- The condition must be `i > start`, **not** `i > 0`. Using `i > 0` would wrongly skip the second element of `[2,2]` when it should be taken by descending.\n" +
            "- You must sort first \u2014 the skip test compares adjacent values, which only groups duplicates after sorting.\n" +
            "- Still advance with `i + 1` (subsets use each element at most once); record a *copy* of `path`.\n\n" +
            "**Complexity.** Time `O(n * 2^n)` in the worst case (all-distinct input); de-dup only ever prunes, never adds. Space `O(n)` for `path` and the recursion stack.\n\n" +
            "**Interview mindset.** 'Input has duplicates, output must be unique' is the universal signal for 'sort + skip equal siblings (i > start)'. It is the single most reused de-dup trick across the backtracking family.",
          rcs:
            "class Solution:\n" +
            "    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:\n" +
            "        nums.sort()                           # Equal values become adjacent.\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            result.append(path[:])            # Every node is a valid subset -> record a COPY.\n" +
            "            for i in range(start, len(nums)):\n" +
            "                if i > start and nums[i] == nums[i - 1]:  # Same value as previous SIBLING -> skip.\n" +
            "                    continue\n" +
            "                path.append(nums[i])          # CHOOSE.\n" +
            "                backtrack(i + 1)              # EXPLORE (no reuse: i + 1).\n" +
            "                path.pop()                    # UN-CHOOSE.\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:\n" +
            "        nums.sort()\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            result.append(path[:])\n" +
            "            for i in range(start, len(nums)):\n" +
            "                if i > start and nums[i] == nums[i - 1]:\n" +
            "                    continue\n" +
            "                path.append(nums[i])\n" +
            "                backtrack(i + 1)\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Input may contain duplicates, output subsets/combinations must be unique' \u2192 sort + skip equal siblings.",
        "The skip guard is i > start (same level), never i > 0.",
        "Still a subset problem \u2192 record at every node and advance with i + 1.",
        "Duplicates deeper in the path (e.g. [2,2]) are still allowed \u2014 only sibling duplicates are pruned."
      ],
      interviewRecall: [
        "Sort first so duplicates are adjacent.",
        "Skip rule: if i > start and nums[i] == nums[i-1]: continue.",
        "i > start (not i > 0) is the whole subtlety \u2014 it prunes siblings, keeps descendants.",
        "Otherwise identical to Subsets: record a COPY at every node, recurse with i + 1."
      ]
    },

    {
      id: "combination-sum-ii",
      lc: 40,
      title: "Combination Sum II",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/combination-sum-ii/",
      meta: { pattern: "Backtracking (dedup + no reuse)", dataStructure: "Recursion / Array", technique: "Sort + advance index + skip equal siblings" },
      description:
        "Given a collection of candidate numbers `candidates` (which **may contain duplicates**) and a target number `target`, return **all unique combinations** in `candidates` where the chosen numbers sum to `target`.\n\n" +
        "**Each number in `candidates` may be used at most once** in each combination. The solution set must not contain duplicate combinations.",
      constraints: [
        "`1 <= candidates.length <= 100`",
        "`1 <= candidates[i] <= 50`",
        "`1 <= target <= 30`"
      ],
      notes: [
        "Contrast with Combination Sum (LC 39): there the numbers were distinct and could be reused; here they may repeat but each *position* is used at most once.",
        "Two levers together: advance the index (`i + 1`) so each element is used once, and skip equal siblings (`i > start and candidates[i] == candidates[i-1]`) so duplicate combinations never form.",
        "Sorting also enables an early `break` once a candidate exceeds the remaining target."
      ],
      examples: [
        {
          input: "candidates = [10, 1, 2, 7, 6, 1, 5], target = 8",
          output: "[[1,1,6], [1,2,5], [1,7], [2,6]]",
          reasoning: "After sorting to [1,1,2,5,6,7,10], each combination sums to 8; the two 1s can both appear (via descending) but never produce a duplicate combination.",
          visual:
            "```\n" +
            "sorted: [1, 1, 2, 5, 6, 7, 10], target 8\n" +
            "take first 1 -> rem 7\n" +
            "   take second 1 -> rem 6 -> take 6 RECORD [1,1,6]\n" +
            "   (a second sibling 1 at the SAME level would be skipped: i>start & equal)\n" +
            "```"
        },
        {
          input: "candidates = [2, 5, 2, 1, 2], target = 5",
          output: "[[1,2,2], [5]]",
          reasoning: "Sorted [1,2,2,2,5]: 1+2+2 = 5 (one distinct combination despite three 2s) and 5 = 5."
        },
        {
          input: "candidates = [2], target = 1",
          output: "[]",
          reasoning: "The only candidate overshoots the target, so no combination exists."
        }
      ],
      approaches: [
        {
          name: "Backtracking with sort + advance index + skip siblings",
          time: "O(2^n)",
          space: "O(n)",
          whenToUse: "The template for 'sum-to-target combinations with duplicate inputs and no reuse' \u2014 it combines both de-dup levers.",
          logic:
            "**What it asks.** Find every distinct combination of `candidates` that sums to `target`, where each element may be used at most once and duplicate combinations are forbidden.\n\n" +
            "**Why the naive idea fails.** Two independent problems collide. (1) Elements can be reused if you recurse with the same index \u2014 but here each element is a single-use position, so you must advance the index. (2) The input has duplicate *values*, so even with `i + 1` you would emit the same combination once per equal element (two 1s both start `[1, ...]`). You need both a no-reuse rule and a de-dup rule.\n\n" +
            "**Key Idea.** Sort `candidates`, then combine two levers: recurse with `start = i + 1` (each element used at most once, so we never revisit a position), and within a level skip a value equal to the previous sibling with `i > start and candidates[i] == candidates[i-1]` (so duplicate combinations never form). Sorting additionally lets us `break` the loop the moment `candidates[i] > remaining`, since all later candidates are even larger.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `candidates` (groups duplicates and enables the early break).\n" +
            "2. Carry `path`, `remaining = target`, and `start`.\n" +
            "3. Base case: `remaining == 0` records a **copy** of `path`.\n" +
            "4. **choose:** loop `i` from `start`. Skip if `i > start and candidates[i] == candidates[i-1]` (duplicate sibling). Break if `candidates[i] > remaining` (overshoot \u2014 all later overshoot too). Otherwise append `candidates[i]`.\n" +
            "5. **explore:** recurse with `start = i + 1` and `remaining - candidates[i]`.\n" +
            "6. **un-choose:** pop `candidates[i]`.\n\n" +
            "**Why it works.** Advancing to `i + 1` guarantees each element index is used at most once per combination. The sibling-skip removes exactly the branches that would rebuild a combination another sibling already produces \u2014 while descendants can still take a second equal value, so `[1,1,6]` is preserved. Driving `remaining` to `0` guarantees each recorded path sums to `target`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The two rules are different: `i + 1` (no reuse) vs `i > start` skip (no duplicate combos). You need **both**.\n" +
            "- Use `i > start`, not `i > 0`, or you would drop legitimate combinations like `[1,1,6]`.\n" +
            "- Prune overshoot via the sorted `break`; record a *copy* of `path`.\n\n" +
            "**Complexity.** Time `O(2^n)` in the worst case (each element in or out), pruned heavily by the sort and target bound; space `O(n)` for `path` and the recursion stack.\n\n" +
            "**Interview mindset.** When you see 'candidates may contain duplicates' + 'each used once' + 'unique combinations summing to target', instantly reach for sort + `i + 1` + `i > start` skip \u2014 the two-lever de-dup pattern.",
          rcs:
            "class Solution:\n" +
            "    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:\n" +
            "        candidates.sort()                     # Duplicates adjacent + enables the early break.\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int, remaining: int) -> None:\n" +
            "            if remaining == 0:                # Exact hit: path sums to target.\n" +
            "                result.append(path[:])        # Record a COPY.\n" +
            "                return\n" +
            "            for i in range(start, len(candidates)):\n" +
            "                if i > start and candidates[i] == candidates[i - 1]:  # Duplicate SIBLING -> skip.\n" +
            "                    continue\n" +
            "                if candidates[i] > remaining: # Sorted: this and all later overshoot.\n" +
            "                    break                     # Prune the rest of this level.\n" +
            "                path.append(candidates[i])    # CHOOSE.\n" +
            "                backtrack(i + 1, remaining - candidates[i])  # EXPLORE; i + 1 => used once.\n" +
            "                path.pop()                    # UN-CHOOSE.\n" +
            "\n" +
            "        backtrack(0, target)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:\n" +
            "        candidates.sort()\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(start: int, remaining: int) -> None:\n" +
            "            if remaining == 0:\n" +
            "                result.append(path[:])\n" +
            "                return\n" +
            "            for i in range(start, len(candidates)):\n" +
            "                if i > start and candidates[i] == candidates[i - 1]:\n" +
            "                    continue\n" +
            "                if candidates[i] > remaining:\n" +
            "                    break\n" +
            "                path.append(candidates[i])\n" +
            "                backtrack(i + 1, remaining - candidates[i])\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0, target)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Sum to target' + 'each element used at most once' + 'unique combinations' \u2192 backtracking with i + 1 and sibling-skip.",
        "Duplicate input values \u2192 sort + skip equal siblings (i > start).",
        "Sorted candidates \u2192 break the loop once candidates[i] > remaining.",
        "Distinguish from Combination Sum (LC 39): that reuses (recurse with i); this does not (recurse with i + 1)."
      ],
      interviewRecall: [
        "Two levers: i + 1 (no reuse) AND skip when i > start and candidates[i]==candidates[i-1] (no dup combos).",
        "Sort first \u2014 needed for both the sibling-skip and the early break.",
        "Base case remaining == 0 records a COPY; break on candidates[i] > remaining.",
        "i > start, never i > 0, or you lose combinations like [1,1,6]."
      ]
    },

    {
      id: "word-search",
      lc: 79,
      title: "Word Search",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/word-search/",
      meta: { pattern: "Grid DFS backtracking", dataStructure: "2-D grid / Recursion", technique: "In-place visited marking with restore (un-choose)" },
      description:
        "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\n" +
        "The word can be constructed from letters of **sequentially adjacent** cells, where adjacent cells are horizontally or vertically neighboring. The **same cell may not be used more than once**.",
      constraints: [
        "`m == board.length`",
        "`n == board[i].length`",
        "`1 <= m, n <= 6`",
        "`1 <= word.length <= 15`",
        "`board` and `word` consist of only lowercase and uppercase English letters."
      ],
      notes: [
        "This is an *existence* problem \u2014 return `true` as soon as one matching path is found; you are not enumerating all paths.",
        "The un-choose step here is restoring a temporarily-marked cell so it can be reused by a different starting path.",
        "Adjacency is 4-directional (up/down/left/right), never diagonal."
      ],
      examples: [
        {
          input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
          output: "true",
          reasoning: "A(0,0) -> B(0,1) -> C(0,2) -> C(1,2) -> E(2,2) -> D(2,1) spells ABCCED along adjacent cells.",
          visual:
            "```\n" +
            "A  B  C  E        path: A(0,0) B(0,1) C(0,2)\n" +
            "S  F  C  S              C(1,2) E(2,2) D(2,1)\n" +
            "A  D  E  E        -> spells ABCCED\n" +
            "```"
        },
        {
          input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
          output: "true",
          reasoning: "S(1,3) -> E(2,3) -> E(2,2) are adjacent and spell SEE."
        },
        {
          input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
          output: "false",
          reasoning: "Spelling ABCB would require reusing the B cell, which is not allowed."
        }
      ],
      approaches: [
        {
          name: "DFS backtracking with in-place visited marking",
          time: "O(m * n * 4^L)",
          space: "O(L)",
          whenToUse: "The standard grid-path search: 'does a path spelling X exist through adjacent cells without reuse' is a DFS-backtracking signal.",
          logic:
            "**What it asks.** Decide whether `word` can be traced through the grid by stepping between 4-directionally adjacent cells, never reusing a cell.\n\n" +
            "**Why the naive idea fails.** You cannot know from a single cell whether the word fits \u2014 you must try to extend a partial match in every direction, and a wrong turn must be *undone* so a different route from the same cell can be tried. A plain scan or greedy walk cannot recover from a dead end.\n\n" +
            "**Key Idea.** Run a DFS from each cell that matches `word[0]`. At depth `k` you require the current cell to equal `word[k]`; if so, mark the cell used, recurse into the four neighbours for `word[k+1]`, then restore the cell. Marking the cell in place (overwriting it with a sentinel like `'#'`) is the *choose*; restoring the original letter afterward is the *un-choose*, which frees the cell for other paths.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `backtrack(r, c, k)`: can we match `word[k:]` starting at cell `(r, c)`?\n" +
            "2. Base case: if `k == len(word)`, every character matched \u2014 return `true`.\n" +
            "3. Prune: if `(r, c)` is off the grid or `board[r][c] != word[k]`, return `false`.\n" +
            "4. **choose:** save the letter, then set `board[r][c] = '#'` so it cannot be revisited on this path.\n" +
            "5. **explore:** recurse into the four neighbours for `k + 1`; combine with `or` (any success suffices).\n" +
            "6. **un-choose:** restore `board[r][c]` to its saved letter.\n" +
            "7. Launch the DFS from every cell; return `true` on the first success, else `false`.\n\n" +
            "**Why it works.** The sentinel guarantees no cell appears twice on the current path (the no-reuse rule), and restoring it means a cell blocked for one route is available for a different route. Trying all four directions at each step means every possible adjacent path is explored, so if a valid tracing exists it is found.\n\n" +
            "**Common Gotchas.**\n" +
            "- The restore (un-choose) is essential \u2014 without it, cells stay marked and later starting points wrongly fail.\n" +
            "- Do the bounds and letter check *before* marking, or you risk indexing out of range.\n" +
            "- Combine the four recursive calls with `or` and short-circuit \u2014 no need to keep searching after a hit.\n" +
            "- Choose a sentinel (`'#'`) that can never be a real letter of `word`.\n\n" +
            "**Complexity.** Time `O(m * n * 4^L)` where `L = len(word)`: `m*n` starting cells, and up to 4 branches per character (really 3 after the first step). Space `O(L)` for the recursion depth (marking is in place, no separate visited grid).\n\n" +
            "**Interview mindset.** 'Trace a string / find a path through a grid of adjacent cells without reuse' is grid DFS backtracking. The in-place mark-and-restore is the memory-efficient way to track 'visited on the current path'.",
          rcs:
            "class Solution:\n" +
            "    def exist(self, board: List[List[str]], word: str) -> bool:\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "\n" +
            "        def backtrack(r: int, c: int, k: int) -> bool:\n" +
            "            if k == len(word):                 # Matched every character -> found it.\n" +
            "                return True\n" +
            "            if (r < 0 or r >= rows or c < 0 or c >= cols  # Off the grid...\n" +
            "                    or board[r][c] != word[k]):           # ...or wrong letter -> dead end.\n" +
            "                return False\n" +
            "            temp = board[r][c]                 # CHOOSE: remember and mark this cell used.\n" +
            "            board[r][c] = '#'                  # '#' can never match a letter of word.\n" +
            "            found = (backtrack(r + 1, c, k + 1) or        # EXPLORE the four neighbours.\n" +
            "                     backtrack(r - 1, c, k + 1) or\n" +
            "                     backtrack(r, c + 1, k + 1) or\n" +
            "                     backtrack(r, c - 1, k + 1))\n" +
            "            board[r][c] = temp                 # UN-CHOOSE: restore the cell for other paths.\n" +
            "            return found\n" +
            "\n" +
            "        for r in range(rows):                  # Try every starting cell.\n" +
            "            for c in range(cols):\n" +
            "                if backtrack(r, c, 0):\n" +
            "                    return True\n" +
            "        return False",
          plain:
            "class Solution:\n" +
            "    def exist(self, board: List[List[str]], word: str) -> bool:\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "\n" +
            "        def backtrack(r: int, c: int, k: int) -> bool:\n" +
            "            if k == len(word):\n" +
            "                return True\n" +
            "            if (r < 0 or r >= rows or c < 0 or c >= cols\n" +
            "                    or board[r][c] != word[k]):\n" +
            "                return False\n" +
            "            temp = board[r][c]\n" +
            "            board[r][c] = '#'\n" +
            "            found = (backtrack(r + 1, c, k + 1) or\n" +
            "                     backtrack(r - 1, c, k + 1) or\n" +
            "                     backtrack(r, c + 1, k + 1) or\n" +
            "                     backtrack(r, c - 1, k + 1))\n" +
            "            board[r][c] = temp\n" +
            "            return found\n" +
            "\n" +
            "        for r in range(rows):\n" +
            "            for c in range(cols):\n" +
            "                if backtrack(r, c, 0):\n" +
            "                    return True\n" +
            "        return False"
        }
      ],
      patternRecognition: [
        "'Find a path through adjacent grid cells spelling / matching X, no reuse' \u2192 grid DFS backtracking.",
        "'Same cell not used twice' \u2192 mark visited on the current path, then restore.",
        "Existence (true/false) rather than enumeration \u2192 short-circuit with or on the first success.",
        "Try every cell as a start; recurse in the 4 directions."
      ],
      interviewRecall: [
        "Template: choose (mark cell '#'), explore (4 neighbours, k + 1), un-choose (restore letter).",
        "Base case k == len(word) -> True; prune on out-of-bounds or mismatch.",
        "In-place marking avoids a separate visited grid \u2014 remember to restore it.",
        "Kick off the DFS from every cell; return on the first hit."
      ]
    },

    {
      id: "palindrome-partitioning",
      lc: 131,
      title: "Palindrome Partitioning",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/palindrome-partitioning/",
      meta: { pattern: "Backtracking (cut positions)", dataStructure: "String / Recursion", technique: "Recurse only when the prefix is a palindrome" },
      description:
        "Given a string `s`, partition `s` such that **every substring** of the partition is a **palindrome**. Return **all possible** palindrome partitionings of `s`.",
      constraints: [
        "`1 <= s.length <= 16`",
        "`s` contains only lowercase English letters."
      ],
      notes: [
        "A partition cuts `s` into contiguous, non-overlapping pieces that concatenate back to `s`; every piece must read the same forwards and backwards.",
        "Prune: only recurse into a cut when the prefix `s[start:end+1]` is already a palindrome \u2014 that skips whole branches that can never yield a valid partition.",
        "Single characters are always palindromes, so a partition into all single characters always exists."
      ],
      examples: [
        {
          input: 's = "aab"',
          output: '[["a","a","b"], ["aa","b"]]',
          reasoning: "The valid all-palindrome cuts are a|a|b and aa|b; a cut leaving 'ab' is rejected because 'ab' is not a palindrome.",
          visual:
            "```\n" +
            "start=0: try prefixes of 'aab'\n" +
            "  'a'  (pal) -> start=1: 'a'(pal)->start=2:'b'(pal)->end RECORD [a,a,b]\n" +
            "                        'ab'(not pal) skip\n" +
            "  'aa' (pal) -> start=2: 'b'(pal)->end RECORD [aa,b]\n" +
            "  'aab'(not pal) skip\n" +
            "```"
        },
        {
          input: 's = "a"',
          output: '[["a"]]',
          reasoning: "A single character is a palindrome; only one partition exists."
        },
        {
          input: 's = "aba"',
          output: '[["a","b","a"], ["aba"]]',
          reasoning: "Both the all-singles cut and the whole string (aba is a palindrome) are valid."
        }
      ],
      approaches: [
        {
          name: "Backtracking over cut positions with a palindrome check",
          time: "O(n * 2^n)",
          space: "O(n)",
          whenToUse: "The canonical 'enumerate all partitions with a validity constraint on each piece' backtracking.",
          logic:
            "**What it asks.** Enumerate every way to split `s` into contiguous pieces such that each piece is a palindrome.\n\n" +
            "**Why the naive idea fails.** A string of length `n` has `2^(n-1)` possible partitions (a cut or no cut between each adjacent pair). Generating them all and then filtering keeps only the palindromic ones, but wastes enormous effort building partitions whose *first* piece is already non-palindromic. We want to reject bad prefixes early.\n\n" +
            "**Key Idea.** Think of it as choosing the *end* of the next piece. From position `start`, try every prefix `s[start:end+1]`; **only if that prefix is a palindrome** do we commit it as a piece and recurse on the remainder from `end+1`. That palindrome check is the pruning that keeps the search from exploring partitions doomed by their first piece.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Carry `path` (pieces chosen so far) and `start` (index where the next piece begins).\n" +
            "2. Base case: if `start == len(s)`, the whole string is consumed \u2014 record a **copy** of `path`.\n" +
            "3. **choose:** loop `end` from `start`; consider the piece `s[start:end+1]`. If it is *not* a palindrome, skip it (prune). Otherwise append it to `path`.\n" +
            "4. **explore:** recurse with `start = end + 1`.\n" +
            "5. **un-choose:** pop the piece so the next `end` is tried on a clean `path`.\n\n" +
            "**Why it works.** Every partition corresponds to a unique increasing sequence of cut positions, and we generate them by choosing each piece's end left to right, so no partition is produced twice or missed. Committing a piece only when it is a palindrome guarantees every recorded partition has all-palindromic pieces; consuming the whole string (`start == len(s)`) guarantees the pieces exactly tile `s`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The palindrome check must be `s[start:end+1]` (inclusive of `end`), and the recursion advances to `end + 1`, not `end`.\n" +
            "- Record a *copy* of `path`; the live list keeps mutating.\n" +
            "- The prune (skip non-palindromic prefixes) is what keeps this efficient \u2014 do not generate all partitions and filter afterward.\n\n" +
            "**Complexity.** Time `O(n * 2^n)`: up to `2^(n-1)` partitions, each costing `O(n)` to build/copy and check. Space `O(n)` for `path` and the recursion depth (the output is not counted).\n\n" +
            "**Interview mindset.** 'All ways to split a string where each piece satisfies a property' is backtracking over cut positions \u2014 validate the *prefix* piece before recursing so you prune impossible branches instead of filtering at the end.",
          rcs:
            "class Solution:\n" +
            "    def partition(self, s: str) -> List[List[str]]:\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def is_pal(l: int, r: int) -> bool:   # Is s[l..r] a palindrome?\n" +
            "            while l < r:\n" +
            "                if s[l] != s[r]:\n" +
            "                    return False\n" +
            "                l += 1\n" +
            "                r -= 1\n" +
            "            return True\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            if start == len(s):               # Consumed the whole string -> a full partition.\n" +
            "                result.append(path[:])        # Record a COPY.\n" +
            "                return\n" +
            "            for end in range(start, len(s)):  # Try every prefix s[start:end+1] as the next piece.\n" +
            "                if not is_pal(start, end):    # Prune: only cut where the prefix is a palindrome.\n" +
            "                    continue\n" +
            "                path.append(s[start:end + 1]) # CHOOSE this palindromic piece.\n" +
            "                backtrack(end + 1)            # EXPLORE the remainder.\n" +
            "                path.pop()                    # UN-CHOOSE.\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def partition(self, s: str) -> List[List[str]]:\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def is_pal(l: int, r: int) -> bool:\n" +
            "            while l < r:\n" +
            "                if s[l] != s[r]:\n" +
            "                    return False\n" +
            "                l += 1\n" +
            "                r -= 1\n" +
            "            return True\n" +
            "\n" +
            "        def backtrack(start: int) -> None:\n" +
            "            if start == len(s):\n" +
            "                result.append(path[:])\n" +
            "                return\n" +
            "            for end in range(start, len(s)):\n" +
            "                if not is_pal(start, end):\n" +
            "                    continue\n" +
            "                path.append(s[start:end + 1])\n" +
            "                backtrack(end + 1)\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'All ways to split a string so each piece satisfies a property' \u2192 backtracking over cut positions.",
        "Validate the prefix piece BEFORE recursing \u2014 that is the pruning that beats generate-then-filter.",
        "start index = where the next piece begins; recurse with end + 1.",
        "Base case: start == len(s) means the pieces exactly tile the string."
      ],
      interviewRecall: [
        "Template: choose (append palindromic prefix), explore (recurse end + 1), un-choose (pop).",
        "Only recurse when s[start:end+1] is a palindrome \u2014 the key prune.",
        "Record a COPY of path when start reaches len(s).",
        "Single chars are always palindromes, so an all-singles partition always exists."
      ]
    },

    {
      id: "letter-combinations-of-a-phone-number",
      lc: 17,
      title: "Letter Combinations of a Phone Number",
      difficulty: "Medium",
      category: "Backtracking",
      link: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/",
      meta: { pattern: "Backtracking (cartesian product)", dataStructure: "String / Recursion", technique: "One recursion level per digit" },
      description:
        "Given a string `digits` containing digits from `2`-`9` (inclusive), return **all possible letter combinations** that the number could spell. Return the answer in any order.\n\n" +
        "The digit-to-letter mapping is the classic telephone keypad: `2`\u2192abc, `3`\u2192def, `4`\u2192ghi, `5`\u2192jkl, `6`\u2192mno, `7`\u2192pqrs, `8`\u2192tuv, `9`\u2192wxyz. Note that `1` maps to no letters.",
      constraints: [
        "`0 <= digits.length <= 4`",
        "`digits[i]` is a digit in the range `'2'`-`'9'`."
      ],
      notes: [
        "If `digits` is empty, return an **empty list** (`[]`), not a list containing an empty string.",
        "The number of combinations is the product of the letter-counts of the digits (3 or 4 each), i.e. a Cartesian product.",
        "There is nothing to prune here \u2014 every combination is valid \u2014 so this is pure enumeration via the choose/explore/un-choose template."
      ],
      examples: [
        {
          input: 'digits = "23"',
          output: '["ad","ae","af","bd","be","bf","cd","ce","cf"]',
          reasoning: "2\u2192{a,b,c} and 3\u2192{d,e,f}; every pairing gives 3*3 = 9 combinations.",
          visual:
            "```\n" +
            "digit 2: a b c        digit 3: d e f\n" +
            "        a-> ad ae af\n" +
            "        b-> bd be bf   (one recursion level per digit)\n" +
            "        c-> cd ce cf\n" +
            "```"
        },
        {
          input: 'digits = ""',
          output: "[]",
          reasoning: "No digits means no combinations \u2014 return an empty list."
        },
        {
          input: 'digits = "2"',
          output: '["a","b","c"]',
          reasoning: "A single digit maps directly to its letters."
        }
      ],
      approaches: [
        {
          name: "Backtracking over digit positions",
          time: "O(4^n * n)",
          space: "O(n)",
          whenToUse: "The canonical Cartesian-product enumeration: 'produce every combination of choices, one choice per position'.",
          logic:
            "**What it asks.** Produce every string formed by picking one letter for each digit, in order \u2014 the Cartesian product of the digits' letter sets.\n\n" +
            "**Why the naive idea fails.** With a variable number of digits you cannot hard-code nested loops (one per digit). You need a general mechanism that handles 0 to 4 digits uniformly and lists every combination exactly once.\n\n" +
            "**Key Idea.** Use one recursion level per digit. At level `index`, branch over each letter mapped to `digits[index]`, append it to the current `path`, recurse to the next digit, then remove it. When `index` reaches the end, `path` holds one complete combination \u2014 record it. There is no pruning: every branch leads to a valid answer, so this is enumeration in its purest form.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle the empty input up front: return `[]` (not `[\"\"]`).\n" +
            "2. Build the keypad map from digit characters to their letter strings.\n" +
            "3. Carry `path` (letters chosen so far) and `index` (which digit we are on).\n" +
            "4. Base case: if `index == len(digits)`, join `path` into a string and record it.\n" +
            "5. **choose:** for each `letter` mapped to `digits[index]`, append `letter` to `path`.\n" +
            "6. **explore:** recurse with `index + 1`.\n" +
            "7. **un-choose:** pop `letter` so the next branch starts clean.\n\n" +
            "**Why it works.** Each level fixes exactly one digit's letter, and trying every letter at every level covers every element of the Cartesian product exactly once. Reaching `index == len(digits)` means every digit has contributed one letter, so `path` is a complete, valid combination.\n\n" +
            "**Common Gotchas.**\n" +
            "- Empty `digits` must return `[]`, not `[\"\"]` \u2014 a common off-by-one edge case.\n" +
            "- Un-choose (pop) after recursing, or letters leak into sibling branches.\n" +
            "- `1` (and `0`) map to no letters, but the constraints exclude them from the input here.\n\n" +
            "**Complexity.** Time `O(4^n * n)` where `n = len(digits)` and each digit maps to up to 4 letters (there are up to `4^n` combinations, each `O(n)` to build). Space `O(n)` for `path` and the recursion depth.\n\n" +
            "**Interview mindset.** 'Every combination of one choice per slot' is a Cartesian-product enumeration \u2014 the choose/explore/un-choose template with one level per slot handles a variable number of slots cleanly.",
          rcs:
            "class Solution:\n" +
            "    def letterCombinations(self, digits: str) -> List[str]:\n" +
            "        if not digits:                         # Empty input -> no combinations.\n" +
            "            return []\n" +
            "        keypad = {\n" +
            "            '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',\n" +
            "            '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',\n" +
            "        }\n" +
            "        result = []\n" +
            "        path = []                              # Letters chosen so far.\n" +
            "\n" +
            "        def backtrack(index: int) -> None:\n" +
            "            if index == len(digits):           # One letter chosen per digit -> done.\n" +
            "                result.append(''.join(path))   # Record the finished combination.\n" +
            "                return\n" +
            "            for letter in keypad[digits[index]]:  # Each letter of this digit is a branch.\n" +
            "                path.append(letter)            # CHOOSE.\n" +
            "                backtrack(index + 1)           # EXPLORE the next digit.\n" +
            "                path.pop()                     # UN-CHOOSE.\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def letterCombinations(self, digits: str) -> List[str]:\n" +
            "        if not digits:\n" +
            "            return []\n" +
            "        keypad = {\n" +
            "            '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',\n" +
            "            '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',\n" +
            "        }\n" +
            "        result = []\n" +
            "        path = []\n" +
            "\n" +
            "        def backtrack(index: int) -> None:\n" +
            "            if index == len(digits):\n" +
            "                result.append(''.join(path))\n" +
            "                return\n" +
            "            for letter in keypad[digits[index]]:\n" +
            "                path.append(letter)\n" +
            "                backtrack(index + 1)\n" +
            "                path.pop()\n" +
            "\n" +
            "        backtrack(0)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Every combination of one choice per position' \u2192 Cartesian-product backtracking, one recursion level per position.",
        "Variable number of positions \u2192 recurse on an index rather than nesting fixed loops.",
        "No validity constraint on combinations \u2192 pure enumeration, no pruning.",
        "A fixed lookup table (digit \u2192 letters) drives the branches at each level."
      ],
      interviewRecall: [
        "Template: choose (append letter), explore (recurse index + 1), un-choose (pop).",
        "One recursion level per digit; base case index == len(digits) records ''.join(path).",
        "Empty digits -> return [] (NOT ['']).",
        "Up to 4^n combinations \u2014 this is the Cartesian product of the digits' letter sets."
      ]
    }
  ]);
})();
