/*
 * Blind 75 — Math & Geometry
 * =========================================================================
 * Registers this category's problems on the global registry:
 *     window.BLIND75.register("Math & Geometry", [ ...problems ]);
 *
 * Format mirrors data/arrays_hashing.js (the gold-standard exemplar).
 * All multi-line string fields use backtick template literals; no ${...}
 * interpolation is used anywhere.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Math & Geometry", [
    {
      id: "rotate-image",
      lc: 48,
      title: "Rotate Image",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/rotate-image/",
      meta: { pattern: "In-place Matrix Transform", dataStructure: "2D Array", technique: "Transpose + reverse rows" },
      description:
        "You are given an `n x n` 2D `matrix` representing an image. Rotate the image by **90 degrees clockwise**.\n\n" +
        "You must rotate the matrix **in place** — modify the input `matrix` directly and do **not** allocate another 2D matrix to do the rotation. The method returns nothing (`None`).",
      constraints: [
        "`n == matrix.length == matrix[i].length`",
        "`1 <= n <= 20`",
        "`-1000 <= matrix[i][j] <= 1000`"
      ],
      notes: [
        "The matrix is square (`n x n`), which is what makes the transpose-in-place trick work.",
        "In place means O(1) extra space aside from the input itself — no second grid."
      ],
      examples: [
        {
          input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
          output: "[[7,4,1],[8,5,2],[9,6,3]]",
          reasoning: "Each element moves to the column that mirrors its old row. The top row 1,2,3 becomes the right column, top to bottom.",
          visual:
            "```\nbefore            after (90° CW)\n1 2 3             7 4 1\n4 5 6      ->      8 5 2\n7 8 9             9 6 3\n\nold row 0 (1 2 3) becomes new col 2, read top->bottom\nold col 0 (1 4 7) becomes new row 0, reversed -> 7 4 1\n```"
        },
        {
          input: "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
          output: "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
          reasoning: "Same rule on a 4x4: the left column 5,2,13,15 (top to bottom) becomes the top row 15,13,2,5 (left to right)."
        },
        {
          input: "matrix = [[1]]",
          output: "[[1]]",
          reasoning: "A single cell is unchanged by any rotation."
        },
        {
          input: "matrix = [[1,2],[3,4]]",
          output: "[[3,1],[4,2]]",
          reasoning: "Transpose gives [[1,3],[2,4]]; reversing each row gives [[3,1],[4,2]].",
          visual:
            "```\n1 2   transpose   1 3   reverse rows   3 1\n3 4   -------->    2 4   ---------->     4 2\n```"
        }
      ],
      approaches: [
        {
          name: "Transpose + Reverse Each Row",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "The clean, expected answer for a square-matrix 90° clockwise rotation in place.",
          logic:
            "**What it asks.** Rotate a square `n x n` grid 90° clockwise, editing the same array, without allocating a second matrix.\n\n" +
            "**Why the naive idea fails.** The obvious approach allocates a fresh `n x n` grid and copies each element to its rotated home: the value at `(r, c)` lands at `(c, n-1-r)` under a 90° clockwise rotation. That is correct and easy, but it uses `O(n^2)` extra space, which the problem explicitly forbids.\n\n" +
            "**Key Idea.** A 90° clockwise rotation is exactly two simpler in-place reflections composed. First **transpose** the matrix (reflect across the main diagonal) by swapping `matrix[i][j]` with `matrix[j][i]`; afterwards `(r, c)` holds what used to sit at `(c, r)`. Then **reverse each row** (reflect left-to-right); afterwards column `c` becomes column `n-1-c`. Two reflections across lines meeting at angle θ compose into a rotation by `2θ`, and here the diagonal and the vertical axis meet at 45°, giving a 90° turn.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Transpose: for every `i`, for every `j > i`, swap `matrix[i][j]` and `matrix[j][i]`. Only the upper triangle is touched so each mirror pair swaps exactly once.\n" +
            "2. Reverse each row: for every row, use two pointers `left` and `right` moving inward, swapping until they meet (equivalent to `row.reverse()`).\n\n" +
            "**Why it works.** Track a single value `v` starting at `(r, c)`. The transpose sends it to `(c, r)`; reversing row `c` then sends `(c, r)` to `(c, n-1-r)`. That is precisely where a 90° clockwise rotation puts the value originally at `(r, c)`, and since every cell follows the same composed map `(r, c) -> (c, n-1-r)`, the whole grid is rotated correctly.\n\n" +
            "**Common Gotchas.**\n" +
            "- In the transpose you must start the inner loop at `j = i + 1`; iterating the full range (or including the diagonal) swaps every pair twice and undoes the work.\n" +
            "- The trick relies on the matrix being square — a rectangular grid cannot be transposed in place this way.\n" +
            "- For counter-clockwise, reverse each row first and then transpose (or transpose then reverse each column); getting the order backwards rotates the wrong way.\n\n" +
            "**Complexity.** Time `O(n^2)` — each phase touches about `n^2/2` cells. Space `O(1)` — only scalar temporaries are used, no second grid.\n\n" +
            "**Interview mindset.** “Rotate a square matrix in place” should immediately trigger “transpose, then reverse each row” for clockwise. Recognizing a rotation as a composition of two reflections is the reusable insight.",
          rcs:
            "class Solution:\n" +
            "    def rotate(self, matrix: List[List[int]]) -> None:\n" +
            "        n = len(matrix)                          # Square matrix side length.\n" +
            "        # Phase 1: transpose (reflect across the main diagonal).\n" +
            "        for i in range(n):                       # Row index.\n" +
            "            for j in range(i + 1, n):            # Only the upper triangle so each pair swaps once.\n" +
            "                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]  # Swap mirror cells.\n" +
            "        # Phase 2: reverse each row (reflect left-to-right).\n" +
            "        for row in range(n):                     # Each row independently.\n" +
            "            left, right = 0, n - 1              # Two-pointer reversal, no extra array.\n" +
            "            while left < right:\n" +
            "                matrix[row][left], matrix[row][right] = matrix[row][right], matrix[row][left]\n" +
            "                left += 1\n" +
            "                right -= 1\n" +
            "        # Composition of the two reflections is a 90-degree clockwise rotation.",
          plain:
            "class Solution:\n" +
            "    def rotate(self, matrix: List[List[int]]) -> None:\n" +
            "        n = len(matrix)\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]\n" +
            "        for row in range(n):\n" +
            "            left, right = 0, n - 1\n" +
            "            while left < right:\n" +
            "                matrix[row][left], matrix[row][right] = matrix[row][right], matrix[row][left]\n" +
            "                left += 1\n" +
            "                right -= 1"
        },
        {
          name: "Layer-by-layer 4-way swap",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "When you want to rotate in a single pass, or to show you understand the geometry directly.",
          logic:
            "**What it asks.** Rotate a square `n x n` grid 90° clockwise in place, but in a single geometric pass rather than two reflection phases.\n\n" +
            "**Why the naive idea fails.** Copying into a fresh grid is simple but costs `O(n^2)` extra space, which is forbidden. We need to permute cells directly inside the input.\n\n" +
            "**Key Idea.** A clockwise rotation permutes cells in disjoint groups of four: each cell maps to the next corner of a rotated square, and after four moves you return to the start. So you can rotate four elements at a time using just one temporary variable. Viewing the matrix as concentric square rings (layers), each ring can be rotated independently.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Process each layer for `layer` in `0 .. n//2 - 1`; set `first = layer` (top/left boundary) and `last = n - 1 - layer` (bottom/right boundary).\n" +
            "2. Walk `i` across the top edge from `first` to `last - 1`, letting `offset = i - first` measure distance from the corner.\n" +
            "3. Save the top element `top = matrix[first][i]`.\n" +
            "4. Perform the 4-way cycle with one temp: left into top (`matrix[last-offset][first]` -> top), bottom into left, right into bottom, and the saved top into right (`matrix[i][last]`).\n" +
            "The four cells involved are top `matrix[first][i]`, left `matrix[last-offset][first]`, bottom `matrix[last][last-offset]`, and right `matrix[i][last]`.\n\n" +
            "**Why it works.** Each group of four cells is exactly the orbit of the clockwise rotation acting on those positions; performing the cycle moves each of the four to where a 90° clockwise turn sends it. Rotating every orbit in every layer therefore rotates the whole matrix, and because the orbits are disjoint no cell is disturbed twice.\n\n" +
            "**Common Gotchas.**\n" +
            "- The inner loop must stop at `last - 1` (range `[first, last)`); including `last` re-processes a corner already handled by the next side.\n" +
            "- The offset indexing is the classic trap — pull the four cells in the correct clockwise order (top <- left <- bottom <- right <- saved top) or you rotate the wrong direction.\n" +
            "- Only `n // 2` layers are needed; an odd `n` leaves a fixed center cell that never moves.\n\n" +
            "**Complexity.** Time `O(n^2)` — every cell is moved exactly once. Space `O(1)` — a single saved temporary, no scratch grid.\n\n" +
            "**Interview mindset.** When you want to show you understand the rotation's geometry directly, reach for the layer-by-layer 4-way swap; the signal is any in-place ring/layer permutation of a grid.",
          rcs:
            "class Solution:\n" +
            "    def rotate(self, matrix: List[List[int]]) -> None:\n" +
            "        n = len(matrix)\n" +
            "        for layer in range(n // 2):              # Process each concentric ring.\n" +
            "            first = layer                        # Top/left boundary of this ring.\n" +
            "            last = n - 1 - layer                 # Bottom/right boundary of this ring.\n" +
            "            for i in range(first, last):         # Walk across the top edge.\n" +
            "                offset = i - first               # Distance from the ring's corner.\n" +
            "                top = matrix[first][i]           # Save the top element.\n" +
            "                matrix[first][i] = matrix[last - offset][first]   # left -> top\n" +
            "                matrix[last - offset][first] = matrix[last][last - offset]  # bottom -> left\n" +
            "                matrix[last][last - offset] = matrix[i][last]     # right -> bottom\n" +
            "                matrix[i][last] = top            # saved top -> right\n",
          plain:
            "class Solution:\n" +
            "    def rotate(self, matrix: List[List[int]]) -> None:\n" +
            "        n = len(matrix)\n" +
            "        for layer in range(n // 2):\n" +
            "            first = layer\n" +
            "            last = n - 1 - layer\n" +
            "            for i in range(first, last):\n" +
            "                offset = i - first\n" +
            "                top = matrix[first][i]\n" +
            "                matrix[first][i] = matrix[last - offset][first]\n" +
            "                matrix[last - offset][first] = matrix[last][last - offset]\n" +
            "                matrix[last][last - offset] = matrix[i][last]\n" +
            "                matrix[i][last] = top"
        }
      ],
      patternRecognition: [
        "“Rotate a square matrix in place” -> transpose then reverse each row (clockwise).",
        "Any 90° rotation can be built from a transpose plus a reversal; pick which reversal by direction.",
        "If forbidden from a second grid, think in terms of swapping mirror cells or 4-way corner cycles."
      ],
      interviewRecall: [
        "Clockwise = transpose (swap [i][j] with [j][i] for j>i) then reverse every row.",
        "Counter-clockwise = reverse every row first, then transpose (or transpose then reverse each column).",
        "Two reflections across axes 45° apart compose into a 90° rotation — that is WHY the trick works.",
        "Transpose only the upper triangle (j starts at i+1), or you swap everything back."
      ]
    },

    {
      id: "spiral-matrix",
      lc: 54,
      title: "Spiral Matrix",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/spiral-matrix/",
      meta: { pattern: "Boundary Shrinking", dataStructure: "2D Array", technique: "Four moving boundaries" },
      description:
        "Given an `m x n` `matrix`, return **all of its elements in clockwise spiral order**, starting from the top-left corner.\n\n" +
        "The spiral goes: across the top row left-to-right, down the right column, across the bottom row right-to-left, up the left column, then inward and repeat until every element has been visited exactly once. Return the visited values as a flat list.",
      constraints: [
        "`m == matrix.length`",
        "`n == matrix[i].length`",
        "`1 <= m, n <= 10`",
        "`-100 <= matrix[i][j] <= 100`"
      ],
      notes: [
        "The matrix need not be square; `m` (rows) and `n` (columns) can differ.",
        "Each element must appear exactly once in the output — the tricky part is not revisiting a row or column when the spiral narrows to a single line."
      ],
      examples: [
        {
          input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
          output: "[1,2,3,6,9,8,7,4,5]",
          reasoning: "Top row 1,2,3; right col 6,9; bottom row (reversed) 8,7; left col 4; then the center 5.",
          visual:
            "```\n 1 -> 2 -> 3\n           |\n 4 -> 5    6\n |         |\n 7 <- 8 <- 9\norder: 1 2 3 6 9 8 7 4 5\n```"
        },
        {
          input: "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]",
          output: "[1,2,3,4,8,12,11,10,9,5,6,7]",
          reasoning: "Outer ring first (1,2,3,4,8,12,11,10,9,5), then the inner row 6,7.",
          visual:
            "```\n 1  2  3  4\n 5  6  7  8\n 9 10 11 12\nring: 1 2 3 4 | 8 12 | 11 10 9 | 5\ninner: 6 7\n```"
        },
        {
          input: "matrix = [[7]]",
          output: "[7]",
          reasoning: "A single element is its own spiral."
        },
        {
          input: "matrix = [[1,2,3,4]]",
          output: "[1,2,3,4]",
          reasoning: "A single row: only the left-to-right pass happens; the boundary checks stop the others from re-reading it."
        },
        {
          input: "matrix = [[1],[2],[3]]",
          output: "[1,2,3]",
          reasoning: "A single column: only the top-to-bottom pass runs."
        }
      ],
      approaches: [
        {
          name: "Four shrinking boundaries",
          time: "O(m * n)",
          space: "O(1)",
          whenToUse: "The standard approach for any clockwise/counter-clockwise spiral traversal of a grid.",
          logic:
            "**What it asks.** Visit every cell of an `m x n` grid exactly once following a clockwise inward spiral, collecting the values into a flat list in visit order.\n\n" +
            "**Why the naive idea fails.** You might try to simulate a walker with a direction and a `visited` grid, turning right whenever the next cell is out of bounds or already seen. That works but costs `O(m * n)` extra space for the visited marks and is fiddly to get right. Tracking the frontier as a rectangle is cleaner and needs no auxiliary grid.\n\n" +
            "**Key Idea.** At any moment the un-visited region is exactly a rectangle, so track it with four *inclusive* boundaries: `top` and `bottom` (row indices) and `left` and `right` (column indices). One full pass peels the outer ring of that rectangle with four directional sweeps in fixed clockwise order, and after each sweep you retract the edge it consumed so it is never touched again.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sweep **right** along row `top` from column `left` to `right`, then do `top += 1`.\n" +
            "2. Sweep **down** column `right` from row `top` to `bottom`, then do `right -= 1`.\n" +
            "3. If `top <= bottom`, sweep **left** along row `bottom` from column `right` to `left`, then do `bottom -= 1`.\n" +
            "4. If `left <= right`, sweep **up** column `left` from row `bottom` to `top`, then do `left += 1`.\n" +
            "5. Repeat the whole loop while `top <= bottom` and `left <= right`.\n\n" +
            "**Why it works.** Each sweep traverses exactly one edge of the current rectangle and then retracts it, so no cell is visited twice; the loop terminates precisely when the boundaries cross and the rectangle is empty, so no cell is missed. The two inner guards handle the subtle case: after the top and right sweeps retract, the leftover strip may be a single row or single column, and without `if top <= bottom` the bottom sweep would re-read a row the top sweep already consumed (and likewise `if left <= right` protects against re-reading a column). Those guards are what keep thin or odd rectangles correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- Skipping the two guards before the bottom and left sweeps causes double-visits on single-row or single-column leftovers.\n" +
            "- Handle an empty matrix (or a matrix whose first row is empty) up front, or the boundary initialization breaks.\n" +
            "- The grid need not be square; `m` and `n` can differ, so use both row and column boundaries independently.\n\n" +
            "**Complexity.** Time `O(m * n)` — every cell is appended exactly once. Space `O(1)` — aside from the output list, only four integer indices.\n\n" +
            "**Interview mindset.** “Spiral / ring / layer traversal of a grid” is the signal for four shrinking boundaries. State the two guards before the bottom and left sweeps explicitly — that is the detail interviewers watch for.",
          rcs:
            "class Solution:\n" +
            "    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:\n" +
            "        result = []\n" +
            "        if not matrix or not matrix[0]:\n" +
            "            return result                        # Empty grid: nothing to visit.\n" +
            "        top, bottom = 0, len(matrix) - 1         # Inclusive row bounds of unvisited rect.\n" +
            "        left, right = 0, len(matrix[0]) - 1      # Inclusive column bounds.\n" +
            "        while top <= bottom and left <= right:   # While the rectangle is non-empty.\n" +
            "            for col in range(left, right + 1):   # 1) top edge, left -> right.\n" +
            "                result.append(matrix[top][col])\n" +
            "            top += 1                             # Top row consumed; retract it.\n" +
            "            for row in range(top, bottom + 1):   # 2) right edge, top -> bottom.\n" +
            "                result.append(matrix[row][right])\n" +
            "            right -= 1                           # Right column consumed; retract it.\n" +
            "            if top <= bottom:                    # Guard: a row still remains.\n" +
            "                for col in range(right, left - 1, -1):  # 3) bottom edge, right -> left.\n" +
            "                    result.append(matrix[bottom][col])\n" +
            "                bottom -= 1                      # Bottom row consumed; retract it.\n" +
            "            if left <= right:                    # Guard: a column still remains.\n" +
            "                for row in range(bottom, top - 1, -1):  # 4) left edge, bottom -> top.\n" +
            "                    result.append(matrix[row][left])\n" +
            "                left += 1                        # Left column consumed; retract it.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:\n" +
            "        result = []\n" +
            "        if not matrix or not matrix[0]:\n" +
            "            return result\n" +
            "        top, bottom = 0, len(matrix) - 1\n" +
            "        left, right = 0, len(matrix[0]) - 1\n" +
            "        while top <= bottom and left <= right:\n" +
            "            for col in range(left, right + 1):\n" +
            "                result.append(matrix[top][col])\n" +
            "            top += 1\n" +
            "            for row in range(top, bottom + 1):\n" +
            "                result.append(matrix[row][right])\n" +
            "            right -= 1\n" +
            "            if top <= bottom:\n" +
            "                for col in range(right, left - 1, -1):\n" +
            "                    result.append(matrix[bottom][col])\n" +
            "                bottom -= 1\n" +
            "            if left <= right:\n" +
            "                for row in range(bottom, top - 1, -1):\n" +
            "                    result.append(matrix[row][left])\n" +
            "                left += 1\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "“Traverse a grid in spiral / ring / layer order” -> four shrinking boundaries.",
        "You are peeling concentric rings off a rectangle, one edge per sweep.",
        "Non-square grids and single-row/single-column inputs are the edge cases the guards handle."
      ],
      interviewRecall: [
        "Keep top/bottom/left/right as inclusive edges; retract each edge right after sweeping it.",
        "Fixed sweep order: right across top, down right, left across bottom, up left.",
        "The two guards (if top<=bottom before going left, if left<=right before going up) stop double-visiting a leftover single row/column."
      ]
    },

    {
      id: "set-matrix-zeroes",
      lc: 73,
      title: "Set Matrix Zeroes",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/set-matrix-zeroes/",
      meta: { pattern: "In-place Marking", dataStructure: "2D Array", technique: "First row/col as markers" },
      description:
        "Given an `m x n` integer `matrix`, if an element is `0`, set its **entire row and entire column** to `0`. Do it **in place** and return nothing (`None`).\n\n" +
        "The follow-up asks for a solution that uses **O(1)** extra space (beyond the matrix itself).",
      constraints: [
        "`m == matrix.length`",
        "`n == matrix[0].length`",
        "`1 <= m, n <= 200`",
        "`-2^31 <= matrix[i][j] <= 2^31 - 1`"
      ],
      notes: [
        "The zeroing must be based on the ORIGINAL zeros. If you naively zero rows/columns as you scan, newly created zeros trigger more zeroing and the whole matrix collapses — you must separate detection from mutation.",
        "A straightforward solution uses O(m + n) space; the follow-up wants O(1)."
      ],
      examples: [
        {
          input: "matrix = [[1,1,1],[1,0,1],[1,1,1]]",
          output: "[[1,0,1],[0,0,0],[1,0,1]]",
          reasoning: "The single 0 at (1,1) zeros out row 1 and column 1.",
          visual:
            "```\nbefore        after\n1 1 1         1 0 1\n1 0 1   ->    0 0 0\n1 1 1         1 0 1\nthe 0 at (1,1) clears its row AND its column\n```"
        },
        {
          input: "matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]",
          output: "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]",
          reasoning: "Zeros at (0,0) and (0,3) clear rows 0 and columns 0 and 3.",
          visual:
            "```\nbefore            after\n0 1 2 0           0 0 0 0\n3 4 5 2     ->    0 4 5 0\n1 3 1 5           0 3 1 0\ncols 0 and 3 cleared, row 0 cleared\n```"
        },
        {
          input: "matrix = [[1,2,3]]",
          output: "[[1,2,3]]",
          reasoning: "No zeros present, so nothing changes."
        },
        {
          input: "matrix = [[5,0],[0,5]]",
          output: "[[0,0],[0,0]]",
          reasoning: "Zeros at (0,1) and (1,0) clear both rows and both columns, wiping the whole grid."
        }
      ],
      approaches: [
        {
          name: "Marker sets (O(m + n) space)",
          time: "O(m * n)",
          space: "O(m + n)",
          whenToUse: "The clear, correct baseline — say this first, then optimize to O(1) for the follow-up.",
          logic:
            "**What it asks.** For every element that is originally `0`, blank its entire row and entire column, editing the matrix in place.\n\n" +
            "**Why the naive idea fails.** Zeroing a row or column the instant you see a `0` corrupts the scan: the freshly written zeros are indistinguishable from original zeros, so they trigger more zeroing and the whole matrix cascades to all zeros. Detection must be fully separated from mutation.\n\n" +
            "**Key Idea.** You do not need to remember every zero — only *which rows* and *which columns* contain at least one zero. That is two small collections rather than a grid of decisions, and it captures all the information needed to blank correctly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create two sets, `zero_rows` and `zero_cols`.\n" +
            "2. First pass: scan every cell; whenever `matrix[r][c] == 0`, add `r` to `zero_rows` and `c` to `zero_cols`. Never mutate the matrix here.\n" +
            "3. Second pass: scan every cell again; set `matrix[r][c] = 0` whenever `r in zero_rows` or `c in zero_cols`.\n\n" +
            "**Why it works.** Because detection completes entirely before any mutation, only the ORIGINAL zeros are recorded in the sets, so the blanking phase is driven purely by original zeros and can never cascade. Every cell in a marked row or column is set to zero, and no other cell is touched.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do not zero cells during the first pass — mixing detection and mutation is the classic bug that collapses the grid.\n" +
            "- A matrix with no zeros must be left unchanged; the two-pass structure handles this naturally.\n" +
            "- Use both a row set and a column set; a single combined structure loses the ability to test rows and columns independently.\n\n" +
            "**Complexity.** Time `O(m * n)` — two full passes over the grid. Space `O(m + n)` — the sets hold at most `m` rows and `n` columns.\n\n" +
            "**Interview mindset.** “A zero clears its whole row and column” is the signal to separate detection from mutation. State this clean `O(m + n)` baseline first, then offer the `O(1)` optimization for the follow-up.",
          rcs:
            "class Solution:\n" +
            "    def setZeroes(self, matrix: List[List[int]]) -> None:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        zero_rows = set()                        # Rows that contain at least one zero.\n" +
            "        zero_cols = set()                        # Columns that contain at least one zero.\n" +
            "        for r in range(rows):                    # Pass 1: detect only, never mutate.\n" +
            "            for c in range(cols):\n" +
            "                if matrix[r][c] == 0:\n" +
            "                    zero_rows.add(r)             # Mark this row for clearing.\n" +
            "                    zero_cols.add(c)             # Mark this column for clearing.\n" +
            "        for r in range(rows):                    # Pass 2: mutate based on marks.\n" +
            "            for c in range(cols):\n" +
            "                if r in zero_rows or c in zero_cols:\n" +
            "                    matrix[r][c] = 0             # Blank cells in a marked row or column.\n",
          plain:
            "class Solution:\n" +
            "    def setZeroes(self, matrix: List[List[int]]) -> None:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        zero_rows = set()\n" +
            "        zero_cols = set()\n" +
            "        for r in range(rows):\n" +
            "            for c in range(cols):\n" +
            "                if matrix[r][c] == 0:\n" +
            "                    zero_rows.add(r)\n" +
            "                    zero_cols.add(c)\n" +
            "        for r in range(rows):\n" +
            "            for c in range(cols):\n" +
            "                if r in zero_rows or c in zero_cols:\n" +
            "                    matrix[r][c] = 0"
        },
        {
          name: "Optimized — First row/column as markers (O(1) space)",
          time: "O(m * n)",
          space: "O(1)",
          whenToUse: "The follow-up answer: same logic but store the marks inside the matrix's own first row and column.",
          logic:
            "**What it asks.** Same task — blank the row and column of every original zero, in place — but now using only `O(1)` extra space, as the follow-up demands.\n\n" +
            "**Why the naive idea fails.** The baseline stores which rows and columns to clear in two sets costing `O(m + n)` space. To reach `O(1)` we cannot keep any auxiliary collection that grows with the matrix.\n\n" +
            "**Key Idea.** The marker sets can live *inside the matrix itself*, in its own first row and first column. Let `matrix[0][c]` flag whether column `c` contains a zero, and `matrix[r][0]` flag whether row `r` contains a zero. This reuses existing storage, so no extra sets are needed. The one wrinkle: cell `matrix[0][0]` is shared between the row-0 flag and the column-0 flag — one bit for two facts. Resolve it by keeping `matrix[0][0]` to mean “row 0 has a zero” and using a single separate boolean `col0` for “column 0 has a zero”.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Determine `col0` first: scan column 0, and if any `matrix[r][0] == 0`, set `col0 = True`.\n" +
            "2. First pass over cells with `c >= 1`: whenever `matrix[r][c] == 0`, write the marks `matrix[r][0] = 0` and `matrix[0][c] = 0`.\n" +
            "3. Second pass over the interior only (`r >= 1`, `c >= 1`): set `matrix[r][c] = 0` if its row marker `matrix[r][0] == 0` or its column marker `matrix[0][c] == 0`. Doing the interior before the borders protects the marker line from being overwritten before it is read.\n" +
            "4. Handle row 0 last: if `matrix[0][0] == 0`, blank the entire first row.\n" +
            "5. Handle column 0 last: if `col0` is True, blank the entire first column.\n\n" +
            "**Why it works.** The border markers record exactly which rows and columns held an original zero — the same information the two sets held. Clearing the interior before overwriting the marker row and column ensures no marker is destroyed before it is used, and deferring row 0 and column 0 to the end (using `matrix[0][0]` and `col0`) means every original zero clears its full row and column with no cascade.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compute `col0` before writing marks into column 0, or you cannot tell an original zero from a mark you just wrote.\n" +
            "- Clear the interior BEFORE overwriting the marker row and column — reversing the order destroys markers still needed.\n" +
            "- The shared cell `(0,0)` must not carry both flags; the extra boolean `col0` is what prevents the collision.\n" +
            "- Handle row 0 and column 0 last, separately from the interior.\n\n" +
            "**Complexity.** Time `O(m * n)` — a constant number of passes. Space `O(1)` — only the single boolean `col0` beyond the matrix.\n\n" +
            "**Interview mindset.** “Store your auxiliary marks inside the input's border” is the classic `O(1)`-space matrix trick; the only subtlety is the shared `(0,0)` cell, solved with one extra flag. Any “in-place, `O(1)` extra space” matrix problem hints at reusing the border as scratch space.",
          rcs:
            "class Solution:\n" +
            "    def setZeroes(self, matrix: List[List[int]]) -> None:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        col0 = False                             # Separate flag: does column 0 have a zero?\n" +
            "        for r in range(rows):                    # Pass 1: set markers in row 0 / col 0.\n" +
            "            if matrix[r][0] == 0:\n" +
            "                col0 = True                      # Remember col 0 separately (avoids (0,0) clash).\n" +
            "            for c in range(1, cols):             # Columns 1.. use matrix[0][c] as the flag.\n" +
            "                if matrix[r][c] == 0:\n" +
            "                    matrix[r][0] = 0             # Mark this row (via col 0).\n" +
            "                    matrix[0][c] = 0             # Mark this column (via row 0).\n" +
            "        for r in range(1, rows):                 # Pass 2: clear the interior first.\n" +
            "            for c in range(1, cols):\n" +
            "                if matrix[r][0] == 0 or matrix[0][c] == 0:  # Row or column was marked.\n" +
            "                    matrix[r][c] = 0\n" +
            "        if matrix[0][0] == 0:                     # matrix[0][0] flags row 0 itself.\n" +
            "            for c in range(cols):\n" +
            "                matrix[0][c] = 0                 # Blank the entire first row.\n" +
            "        if col0:                                  # The separate first-column flag.\n" +
            "            for r in range(rows):\n" +
            "                matrix[r][0] = 0                 # Blank the entire first column.\n",
          plain:
            "class Solution:\n" +
            "    def setZeroes(self, matrix: List[List[int]]) -> None:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        col0 = False\n" +
            "        for r in range(rows):\n" +
            "            if matrix[r][0] == 0:\n" +
            "                col0 = True\n" +
            "            for c in range(1, cols):\n" +
            "                if matrix[r][c] == 0:\n" +
            "                    matrix[r][0] = 0\n" +
            "                    matrix[0][c] = 0\n" +
            "        for r in range(1, rows):\n" +
            "            for c in range(1, cols):\n" +
            "                if matrix[r][0] == 0 or matrix[0][c] == 0:\n" +
            "                    matrix[r][c] = 0\n" +
            "        if matrix[0][0] == 0:\n" +
            "            for c in range(cols):\n" +
            "                matrix[0][c] = 0\n" +
            "        if col0:\n" +
            "            for r in range(rows):\n" +
            "                matrix[r][0] = 0"
        }
      ],
      patternRecognition: [
        "“A zero clears its whole row and column” -> separate detection from mutation.",
        "First instinct O(m+n) with two sets; follow-up O(1) by marking inside row 0 / column 0.",
        "Any “in-place, O(1) extra space” matrix problem hints at reusing the border as scratch space."
      ],
      interviewRecall: [
        "Never zero as you scan — new zeros cascade. Detect all original zeros first.",
        "O(1) trick: row 0 flags zero-columns, column 0 flags zero-rows.",
        "The shared cell (0,0) needs an extra boolean (col0) so row-0 and col-0 flags don't collide.",
        "Clear the interior BEFORE overwriting the marker row/column; handle row 0 and column 0 last."
      ]
    },

    {
      id: "happy-number",
      lc: 202,
      title: "Happy Number",
      difficulty: "Easy",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/happy-number/",
      meta: { pattern: "Cycle Detection", dataStructure: "Hash Set", technique: "Digit-square iteration" },
      description:
        "A number is **happy** if the following process reaches `1`: repeatedly replace the number with the **sum of the squares of its digits**; keep going, and if the sequence ever reaches `1` the number is happy.\n\n" +
        "The danger is that the sequence can instead fall into a **cycle that never contains `1`**, looping forever. Given an integer `n`, return `true` if `n` is happy and `false` otherwise.",
      constraints: [
        "`1 <= n <= 2^31 - 1`"
      ],
      notes: [
        "Every starting number either reaches 1 or enters a cycle — it can never grow without bound, because for any number the digit-square sum is small (a 3-digit number maps to at most 3·81 = 243), so the sequence is eventually trapped in a small range and must repeat.",
        "Because the sequence must eventually repeat, detecting a repeated value (other than 1) proves the number is unhappy.",
        "The famous non-1 cycle is 4 -> 16 -> 37 -> 58 -> 89 -> 145 -> 42 -> 20 -> 4; every unhappy number funnels into it."
      ],
      examples: [
        {
          input: "n = 19",
          output: "true",
          reasoning: "1^2 + 9^2 = 82; 8^2 + 2^2 = 68; 6^2 + 8^2 = 100; 1^2 + 0^2 + 0^2 = 1. Reached 1, so happy.",
          visual:
            "```\n19 -> 1+81 = 82\n82 -> 64+4 = 68\n68 -> 36+64 = 100\n100 -> 1+0+0 = 1   <- happy!\n```"
        },
        {
          input: "n = 2",
          output: "false",
          reasoning: "2 -> 4 -> 16 -> 37 -> 58 -> 89 -> 145 -> 42 -> 20 -> 4, which repeats 4. A cycle that never hits 1, so unhappy.",
          visual:
            "```\n2 -> 4 -> 16 -> 37 -> 58 -> 89 -> 145 -> 42 -> 20 -> 4 ...\n                                                    ^-- back to 4: cycle, no 1\n```"
        },
        {
          input: "n = 1",
          output: "true",
          reasoning: "Already 1, so trivially happy."
        },
        {
          input: "n = 7",
          output: "true",
          reasoning: "7 -> 49 -> 97 -> 130 -> 10 -> 1. Reaches 1, so happy."
        }
      ],
      approaches: [
        {
          name: "Hash Set of Seen Values",
          time: "O(log n) per step, O(k) total",
          space: "O(k)",
          whenToUse: "The clearest, most direct answer — record every value you have seen and stop when one repeats.",
          logic:
            "**What it asks.** Repeatedly replace `n` with the sum of the squares of its digits; decide whether this process ever reaches `1` (happy) or loops forever without reaching `1` (unhappy).\n\n" +
            "**Why the naive idea fails.** Simply iterating until you hit `1` never terminates for an unhappy number — the sequence loops forever. You need a way to detect that you have entered a cycle so you can stop and answer `false`.\n\n" +
            "**Key Idea.** The sequence is deterministic: each value maps to exactly one next value. So if you ever see the same value twice, you are in a cycle and will never escape it. Track every value you have produced in a hash set; if the next value is `1` the number is happy, and if the next value is already in the set you have found a cycle and the number is unhappy.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create an empty set `seen`.\n" +
            "2. Loop while `n != 1` and `n not in seen`: add `n` to `seen`, then replace `n` with the digit-square sum of `n`.\n" +
            "3. To compute the digit-square sum, repeatedly take `n % 10` (last digit), add its square to a running total, and do `n //= 10` until `n` becomes 0.\n" +
            "4. When the loop ends, return `n == 1` — true if we exited because we reached 1, false if we exited because we revisited a value.\n\n" +
            "**Why it works.** The mapping from a number to its digit-square sum is a function, so the trajectory from any start is a single deterministic path. Because values stay bounded (they cannot grow without limit), the path must eventually repeat a value. If `1` appears first, the number is happy; otherwise the first repeat marks the entrance to a non-1 cycle, so the number is unhappy. The set guarantees we detect that first repeat.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do not forget to add the current value to the set before advancing, or you can loop forever.\n" +
            "- The digit-square helper must fully consume `n` with `//= 10` until it reaches 0; stopping early drops digits.\n" +
            "- Return `n == 1` (not `True` unconditionally) after the loop — the loop can end for either reason.\n\n" +
            "**Complexity.** Time is proportional to the number of steps before a repeat, each step costing `O(log n)` to sum digits; the values quickly collapse into a small range so the step count is small. Space `O(k)` for the set of distinct values seen.\n\n" +
            "**Interview mindset.** 'A deterministic sequence that either terminates or loops' is textbook cycle detection — reach for a seen-set first, then mention Floyd's if asked to save space.",
          rcs:
            "class Solution:\n" +
            "    def isHappy(self, n: int) -> bool:\n" +
            "        def digit_square_sum(x: int) -> int:\n" +
            "            total = 0\n" +
            "            while x > 0:                          # Consume every digit of x.\n" +
            "                d = x % 10                        # Last digit.\n" +
            "                total += d * d                    # Add its square.\n" +
            "                x //= 10                          # Drop the last digit.\n" +
            "            return total\n" +
            "        seen = set()                             # Values we have already produced.\n" +
            "        while n != 1 and n not in seen:          # Stop at 1 (happy) or a repeat (cycle).\n" +
            "            seen.add(n)                           # Record before advancing.\n" +
            "            n = digit_square_sum(n)               # Move to the next value.\n" +
            "        return n == 1                            # 1 -> happy; otherwise we hit a cycle.",
          plain:
            "class Solution:\n" +
            "    def isHappy(self, n: int) -> bool:\n" +
            "        def digit_square_sum(x: int) -> int:\n" +
            "            total = 0\n" +
            "            while x > 0:\n" +
            "                d = x % 10\n" +
            "                total += d * d\n" +
            "                x //= 10\n" +
            "            return total\n" +
            "        seen = set()\n" +
            "        while n != 1 and n not in seen:\n" +
            "            seen.add(n)\n" +
            "            n = digit_square_sum(n)\n" +
            "        return n == 1"
        },
        {
          name: "Floyd's Cycle Detection (slow / fast)",
          time: "O(log n) per step",
          space: "O(1)",
          whenToUse: "When asked to detect the cycle without any extra memory — treat the sequence as an implicit linked list.",
          logic:
            "**What it asks.** Same task — decide if the digit-square-sum sequence reaches `1` — but detect the cycle using `O(1)` extra space instead of a hash set.\n\n" +
            "**Why the naive idea fails.** The seen-set answer is correct but stores every visited value, costing `O(k)` memory. If an interviewer asks for constant space, that set is exactly what must be eliminated.\n\n" +
            "**Key Idea.** The sequence `n -> next(n) -> next(next(n)) -> ...` is an implicit linked list where each node points to its digit-square successor. Detecting whether such a list contains a cycle is exactly **Floyd's tortoise-and-hare**: run a `slow` pointer one step at a time and a `fast` pointer two steps at a time. If the fast pointer reaches `1`, the number is happy; otherwise slow and fast must eventually meet inside the cycle, proving it is unhappy — all without storing history.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `slow = n` and `fast = next(n)` where `next(x)` is the digit-square sum.\n" +
            "2. Loop while `fast != 1` and `slow != fast`: advance `slow` by one step (`slow = next(slow)`) and `fast` by two steps (`fast = next(next(fast))`).\n" +
            "3. When the loop ends, return `fast == 1`. If fast reached 1 the number is happy; if slow met fast first they collided inside a non-1 cycle.\n\n" +
            "**Why it works.** In any functional graph (each node has exactly one successor) a path from a start either terminates at a fixed point that leads to `1` or enters a cycle. If a cycle exists, a pointer moving twice as fast gains one step per iteration on the slower pointer and, modulo the cycle length, must land on it — the classic Floyd guarantee. Reaching `1` first means the sequence terminated happily before any cycle closed. Either way we decide correctly, keeping only two integers.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check `fast == 1` (the fast pointer is the one that races ahead to the terminal value); testing slow instead can miss the early exit.\n" +
            "- Advance fast by two `next` calls per iteration and slow by one — mismatched speeds break the meeting guarantee.\n" +
            "- Start `fast` one step ahead of `slow` so the `slow != fast` termination check does not fire immediately.\n\n" +
            "**Complexity.** Time comparable to the set approach — proportional to the number of steps before termination or meeting. Space `O(1)`: only two integer pointers, no history.\n\n" +
            "**Interview mindset.** When a deterministic sequence must be cycle-checked in constant space, say 'treat it as a linked list and run Floyd's tortoise and hare' — the same trick as Linked List Cycle.",
          rcs:
            "class Solution:\n" +
            "    def isHappy(self, n: int) -> bool:\n" +
            "        def next_num(x: int) -> int:\n" +
            "            total = 0\n" +
            "            while x > 0:                          # Sum of squares of digits.\n" +
            "                d = x % 10\n" +
            "                total += d * d\n" +
            "                x //= 10\n" +
            "            return total\n" +
            "        slow = n                                 # Tortoise: one step at a time.\n" +
            "        fast = next_num(n)                       # Hare: starts one step ahead.\n" +
            "        while fast != 1 and slow != fast:        # Stop at 1 (happy) or a meeting (cycle).\n" +
            "            slow = next_num(slow)                 # Advance slow by one.\n" +
            "            fast = next_num(next_num(fast))       # Advance fast by two.\n" +
            "        return fast == 1                         # 1 -> happy; meeting -> unhappy.",
          plain:
            "class Solution:\n" +
            "    def isHappy(self, n: int) -> bool:\n" +
            "        def next_num(x: int) -> int:\n" +
            "            total = 0\n" +
            "            while x > 0:\n" +
            "                d = x % 10\n" +
            "                total += d * d\n" +
            "                x //= 10\n" +
            "            return total\n" +
            "        slow = n\n" +
            "        fast = next_num(n)\n" +
            "        while fast != 1 and slow != fast:\n" +
            "            slow = next_num(slow)\n" +
            "            fast = next_num(next_num(fast))\n" +
            "        return fast == 1"
        }
      ],
      patternRecognition: [
        "'Iterate a deterministic transform until it repeats or hits a target' -> cycle detection.",
        "Values stay bounded, so the sequence must eventually cycle — a seen-set or Floyd's both work.",
        "Constant-space variant: model the sequence as a linked list and run tortoise/hare."
      ],
      interviewRecall: [
        "Happy = sum of squares of digits eventually reaches 1; unhappy = falls into a non-1 cycle.",
        "Seen-set: loop while n != 1 and n not in seen; return n == 1.",
        "Floyd's O(1): slow one step, fast two steps; return fast == 1 (start fast one step ahead).",
        "Digit-square helper: while x: d = x%10; total += d*d; x //= 10."
      ]
    },

    {
      id: "plus-one",
      lc: 66,
      title: "Plus One",
      difficulty: "Easy",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/plus-one/",
      meta: { pattern: "Digit Array Arithmetic", dataStructure: "Array", technique: "Right-to-left carry" },
      description:
        "You are given a large integer represented as an array of digits `digits`, where `digits[0]` is the **most significant** digit. The array contains no leading zeros (except the number 0 itself).\n\n" +
        "**Increment** the integer by one and return the resulting digit array.",
      constraints: [
        "`1 <= digits.length <= 100`",
        "`0 <= digits[i] <= 9`",
        "`digits` does not contain any leading zeros except for the number `0` itself."
      ],
      notes: [
        "Because you add 1 to the last digit, a carry only ever propagates leftward, and only while it meets a 9.",
        "The only case that changes the array's length is an all-9s number (like 99 or 999), which becomes a 1 followed by all zeros and gains one digit."
      ],
      examples: [
        {
          input: "digits = [1,2,3]",
          output: "[1,2,4]",
          reasoning: "The number is 123; adding one gives 124. Only the last digit changes, no carry.",
          visual:
            "```\n1 2 3\n    +1\n-----\n1 2 4   (3 -> 4, no carry)\n```"
        },
        {
          input: "digits = [4,3,2,1]",
          output: "[4,3,2,2]",
          reasoning: "1321 + 1 = 1322 (the array reads most-significant first, so [4,3,2,1] is 4321; 4321 + 1 = 4322)."
        },
        {
          input: "digits = [9]",
          output: "[1,0]",
          reasoning: "9 + 1 = 10; the carry ripples off the front, so we prepend a 1 and the length grows.",
          visual:
            "```\n  9\n +1\n---\n1 0   (9 -> 0 with carry, prepend 1)\n```"
        },
        {
          input: "digits = [9,9,9]",
          output: "[1,0,0,0]",
          reasoning: "999 + 1 = 1000; every 9 becomes 0 and a leading 1 is prepended.",
          visual:
            "```\n9 9 9  +1\n-------\n1 0 0 0   (all nines roll over, new leading digit)\n```"
        },
        {
          input: "digits = [1,9,9]",
          output: "[2,0,0]",
          reasoning: "199 + 1 = 200; the trailing 9s roll to 0 and the carry stops at the 1, which becomes 2. No length change."
        }
      ],
      approaches: [
        {
          name: "Right-to-left carry",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The standard approach — add one at the least significant end and propagate the carry only as far as needed.",
          logic:
            "**What it asks.** Treat a digit array as one big integer (most significant digit first) and return the array for that integer plus one.\n\n" +
            "**Why the naive idea fails.** Converting the array to an actual integer, adding one, and converting back works in many languages but is conceptually a cheat and can overflow fixed-width integer types for the 100-digit upper bound. The array itself is the number, so we should do the arithmetic digit by digit exactly as you would on paper.\n\n" +
            "**Key Idea.** Adding one only ever affects the **rightmost** digit and any carry it triggers. Walk from the last digit toward the first: if a digit is less than 9, increment it and you are done immediately (no carry can propagate further). If a digit is 9, it becomes 0 and the carry moves one position left. If the carry survives past the front, the whole number was all 9s and we prepend a single 1.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Loop `i` from the last index down to 0.\n" +
            "2. If `digits[i] < 9`, do `digits[i] += 1` and immediately return `digits` — the carry stops here.\n" +
            "3. Otherwise `digits[i] == 9`: set `digits[i] = 0` and continue left (the carry rolls on).\n" +
            "4. If the loop finishes without returning, every digit was 9. Return `[1] + digits` (a leading 1 followed by all the zeros we just wrote).\n\n" +
            "**Why it works.** Incrementing a base-10 number affects the units digit; a carry appears only when that digit is 9 and turns to 0, and it continues leftward exactly while it keeps meeting 9s. The first non-9 digit absorbs the carry by increasing by one and halts the process, which is precisely the early return. The array grows by one digit only when the carry escapes the most significant position — the all-9s case — handled by prepending 1.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return as soon as a digit is incremented; failing to break keeps looping and can corrupt other digits.\n" +
            "- Remember the all-9s case explicitly — after the loop you must prepend the leading 1, or you return an all-zeros array.\n" +
            "- Iterate from the LEAST significant digit (the end of the array), since that is where +1 is applied.\n\n" +
            "**Complexity.** Time `O(n)` worst case (all 9s force a full sweep); best case `O(1)` when the last digit is not 9. Space `O(1)` in place, or `O(n)` only in the all-9s case where a new longer array is built.\n\n" +
            "**Interview mindset.** 'A number stored as a digit array' means simulate grade-school arithmetic right-to-left with a carry; the single edge case to name aloud is the all-9s rollover that lengthens the array.",
          rcs:
            "class Solution:\n" +
            "    def plusOne(self, digits: List[int]) -> List[int]:\n" +
            "        for i in range(len(digits) - 1, -1, -1):  # Walk from least significant digit.\n" +
            "            if digits[i] < 9:\n" +
            "                digits[i] += 1                     # Absorb the +1, carry stops here.\n" +
            "                return digits                      # Done immediately.\n" +
            "            digits[i] = 0                          # A 9 rolls to 0 and carries left.\n" +
            "        return [1] + digits                        # All nines: prepend a new leading 1.",
          plain:
            "class Solution:\n" +
            "    def plusOne(self, digits: List[int]) -> List[int]:\n" +
            "        for i in range(len(digits) - 1, -1, -1):\n" +
            "            if digits[i] < 9:\n" +
            "                digits[i] += 1\n" +
            "                return digits\n" +
            "            digits[i] = 0\n" +
            "        return [1] + digits"
        }
      ],
      patternRecognition: [
        "'Integer stored as an array of digits' -> simulate paper arithmetic digit by digit.",
        "Adding one propagates a carry leftward only while it meets 9s; the first non-9 stops it.",
        "The array lengthens exactly when the number is all 9s (carry escapes the front)."
      ],
      interviewRecall: [
        "Iterate from the last index toward 0.",
        "digit < 9 -> increment and return; digit == 9 -> set 0 and continue.",
        "After the loop (all nines) -> return [1] + digits."
      ]
    },

    {
      id: "pow-x-n",
      lc: 50,
      title: "Pow(x, n)",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/powx-n/",
      meta: { pattern: "Fast Exponentiation", dataStructure: "None", technique: "Exponentiation by squaring" },
      description:
        "Implement `pow(x, n)`, which computes `x` raised to the power `n` (that is, `x^n`).\n\n" +
        "`n` can be **negative**, in which case `x^n = 1 / x^(-n)`.",
      constraints: [
        "`-100.0 < x < 100.0`",
        "`-2^31 <= n <= 2^31 - 1`",
        "`n` is an integer",
        "Either `x` is not zero, or `n > 0`",
        "`-10^4 <= x^n <= 10^4`"
      ],
      notes: [
        "Multiplying x by itself n times is O(n) and far too slow for n up to ~2·10^9 — you must exploit that x^n can be built from x^(n/2).",
        "For negative n, compute the positive power and take the reciprocal: x^n = 1 / x^(-n).",
        "Watch the most negative n = -2^31: negating it overflows fixed-width ints in some languages (Python is fine, but state the guard in interview)."
      ],
      examples: [
        {
          input: "x = 2.00000, n = 10",
          output: "1024.00000",
          reasoning: "2^10 = 1024. Built as ((2^2)^2 ... ) via repeated squaring in ~log2(10) multiplications.",
          visual:
            "```\n2^10 = (2^5)^2\n2^5  = 2 * (2^2)^2\n2^2  = 2 * 2 = 4\n=> 2^5 = 2*16 = 32 ; 2^10 = 32*32 = 1024\n(only ~4 multiplications, not 10)\n```"
        },
        {
          input: "x = 2.10000, n = 3",
          output: "9.26100",
          reasoning: "2.1^3 = 2.1 * 2.1 * 2.1 = 9.261."
        },
        {
          input: "x = 2.00000, n = -2",
          output: "0.25000",
          reasoning: "2^-2 = 1 / 2^2 = 1/4 = 0.25. Compute 2^2 = 4, then take the reciprocal.",
          visual:
            "```\nn = -2  ->  x = 1/2 = 0.5, n = 2\n0.5^2 = 0.25\n(equivalently 1 / 2^2 = 1/4)\n```"
        },
        {
          input: "x = 2.00000, n = 0",
          output: "1.00000",
          reasoning: "Any nonzero base to the power 0 is 1 (the base case of the recursion)."
        }
      ],
      approaches: [
        {
          name: "Recursive Exponentiation by Squaring",
          time: "O(log n)",
          space: "O(log n)",
          whenToUse: "The most readable way to show the halving recurrence x^n = (x^(n/2))^2.",
          logic:
            "**What it asks.** Compute `x^n` for a floating-point base and an integer exponent that may be negative, efficiently.\n\n" +
            "**Why the naive idea fails.** Multiplying `x` by itself `n` times is `O(n)`; with `|n|` up to about `2·10^9` that is billions of operations — far too slow and also numerically wasteful. We need to reduce the number of multiplications drastically.\n\n" +
            "**Key Idea — the halving recurrence.** `x^n` can be expressed in terms of a half-sized problem: if `n` is even, `x^n = (x^(n/2))^2` — compute the half power once and square it. If `n` is odd, `x^n = x · (x^((n-1)/2))^2`. Each step **halves the exponent**, so only `O(log n)` multiplications are needed instead of `O(n)`. Negative exponents are handled once at the top: `x^n = 1 / x^(-n)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle sign: if `n < 0`, set `x = 1 / x` and `n = -n`, then compute the positive power.\n" +
            "2. Define a recursive helper `power(base, exp)`:\n" +
            "   - Base case: if `exp == 0`, return `1.0`.\n" +
            "   - Compute `half = power(base, exp // 2)` (solve the half problem once).\n" +
            "   - If `exp` is even, return `half * half`; if odd, return `half * half * base`.\n" +
            "3. Return the helper's result.\n\n" +
            "**Why it works.** The recurrence is exact algebra: `(x^(n/2))^2 = x^n` for even `n`, and one extra factor of `x` accounts for the dropped unit when `n` is odd (integer division floors). Reusing `half` for both factors of the square is what turns linear work into logarithmic — the exponent strictly decreases toward the `exp == 0` base case, guaranteeing termination.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compute `half` ONCE and square it; calling `power` twice re-expands the recursion into `O(n)`.\n" +
            "- Convert negative `n` up front (`x = 1/x`, `n = -n`); mixing the sign into the recursion is error-prone.\n" +
            "- The most negative exponent `-2^31` overflows when negated in fixed-width languages — negate as a wider/absolute value (Python's ints are unbounded, so it is safe here, but say so).\n" +
            "- Base case `exp == 0` returns `1.0` (a float), keeping the result a float throughout.\n\n" +
            "**Complexity.** Time `O(log n)` — the exponent halves each call. Space `O(log n)` for the recursion stack.\n\n" +
            "**Interview mindset.** 'Compute a power fast' is the signature of exponentiation by squaring; state the recurrence `x^n = (x^(n/2))^2` (times an extra `x` when odd) and handle negative `n` by reciprocal.",
          rcs:
            "class Solution:\n" +
            "    def myPow(self, x: float, n: int) -> float:\n" +
            "        def power(base: float, exp: int) -> float:\n" +
            "            if exp == 0:\n" +
            "                return 1.0                        # Base case: anything^0 = 1.\n" +
            "            half = power(base, exp // 2)          # Solve the half problem ONCE.\n" +
            "            if exp % 2 == 0:\n" +
            "                return half * half                # Even: square the half power.\n" +
            "            return half * half * base             # Odd: square, plus one extra factor.\n" +
            "        if n < 0:                                 # Negative exponent -> reciprocal base.\n" +
            "            x = 1 / x\n" +
            "            n = -n\n" +
            "        return power(x, n)",
          plain:
            "class Solution:\n" +
            "    def myPow(self, x: float, n: int) -> float:\n" +
            "        def power(base: float, exp: int) -> float:\n" +
            "            if exp == 0:\n" +
            "                return 1.0\n" +
            "            half = power(base, exp // 2)\n" +
            "            if exp % 2 == 0:\n" +
            "                return half * half\n" +
            "            return half * half * base\n" +
            "        if n < 0:\n" +
            "            x = 1 / x\n" +
            "            n = -n\n" +
            "        return power(x, n)"
        },
        {
          name: "Iterative Exponentiation by Squaring (binary exponent)",
          time: "O(log n)",
          space: "O(1)",
          whenToUse: "When you want constant space and to show the bit-by-bit view: multiply in x^(2^k) for each set bit of n.",
          logic:
            "**What it asks.** Same computation of `x^n`, but iteratively so it uses only `O(1)` extra space.\n\n" +
            "**Why the naive idea fails.** The linear repeated-multiply is `O(n)`; even the clean recursion costs `O(log n)` stack space. To reach constant space we unroll the halving into a loop.\n\n" +
            "**Key Idea — read the exponent in binary.** Write `n` in binary. Then `x^n` is the product of `x^(2^k)` over exactly the bit positions `k` where `n` has a 1. Maintain a running `result = 1` and a running `contrib = x` that is repeatedly squared (`x, x^2, x^4, x^8, ...`, i.e. `x^(2^k)`). Walk the bits of `n` from least significant to most: whenever the current bit is 1, multiply that power of `x` into `result`; square `contrib` and shift to the next bit each iteration.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `n < 0`, set `x = 1 / x` and `n = -n`.\n" +
            "2. Initialize `result = 1.0` and `contrib = x` (this is `x^(2^0)`).\n" +
            "3. While `n > 0`:\n" +
            "   - If `n` is odd (`n & 1`), do `result *= contrib` — this bit contributes `x^(2^k)`.\n" +
            "   - Square the contribution: `contrib *= contrib` (advance from `x^(2^k)` to `x^(2^(k+1))`).\n" +
            "   - Halve the exponent: `n //= 2` (drop the processed bit).\n" +
            "4. Return `result`.\n\n" +
            "**Why it works.** `n = sum of 2^k` over its set bits, and `x^(sum) = product of x^(2^k)`. The loop generates each `x^(2^k)` by repeated squaring and folds in only those whose bit is set — exactly the binary expansion of the exponent. The number of iterations equals the number of bits in `n`, giving `O(log n)` multiplications with no recursion.\n\n" +
            "**Common Gotchas.**\n" +
            "- Square `contrib` every iteration regardless of whether the bit was set — the powers of two must keep advancing.\n" +
            "- Convert negative `n` before the loop; a negative `n` never enters `while n > 0`.\n" +
            "- Use integer halving `n //= 2` (or `n >>= 1`) so the loop terminates cleanly.\n" +
            "- Initialize `result` to `1.0` (float) so the return type stays float.\n\n" +
            "**Complexity.** Time `O(log n)` — one iteration per bit of `n`. Space `O(1)` — a handful of scalars, no stack.\n\n" +
            "**Interview mindset.** The iterative 'square-and-multiply' is the constant-space form of fast power; frame it as 'multiply in `x^(2^k)` for each set bit of `n`.'",
          rcs:
            "class Solution:\n" +
            "    def myPow(self, x: float, n: int) -> float:\n" +
            "        if n < 0:                                 # Negative exponent -> reciprocal base.\n" +
            "            x = 1 / x\n" +
            "            n = -n\n" +
            "        result = 1.0                              # Accumulates the product.\n" +
            "        contrib = x                               # Current x^(2^k), starts at x^1.\n" +
            "        while n > 0:\n" +
            "            if n & 1:                             # This bit of n is set...\n" +
            "                result *= contrib                 # ...so fold in x^(2^k).\n" +
            "            contrib *= contrib                    # Advance to x^(2^(k+1)).\n" +
            "            n //= 2                               # Drop the processed bit.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def myPow(self, x: float, n: int) -> float:\n" +
            "        if n < 0:\n" +
            "            x = 1 / x\n" +
            "            n = -n\n" +
            "        result = 1.0\n" +
            "        contrib = x\n" +
            "        while n > 0:\n" +
            "            if n & 1:\n" +
            "                result *= contrib\n" +
            "            contrib *= contrib\n" +
            "            n //= 2\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Compute x^n efficiently' -> exponentiation by squaring, O(log n).",
        "Halving recurrence: x^n = (x^(n/2))^2, times an extra x when n is odd.",
        "Negative exponent -> take the reciprocal of the base and negate n.",
        "Iterative form reads the binary bits of n: multiply in x^(2^k) for each set bit."
      ],
      interviewRecall: [
        "Handle n < 0 first: x = 1/x, n = -n.",
        "Recursive: half = power(x, n//2); even -> half*half; odd -> half*half*x.",
        "Iterative: result=1, contrib=x; while n: if n&1 result*=contrib; contrib*=contrib; n//=2.",
        "Watch n = -2^31 negation overflow in fixed-width languages."
      ]
    },

    {
      id: "multiply-strings",
      lc: 43,
      title: "Multiply Strings",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/multiply-strings/",
      meta: { pattern: "Big-Integer Arithmetic", dataStructure: "Array", technique: "Schoolbook multiply with position array" },
      description:
        "Given two non-negative integers `num1` and `num2` represented as **strings**, return the product of `num1` and `num2`, also as a **string**.\n\n" +
        "You must **not** use any built-in big-integer library or convert the inputs directly to an integer.",
      constraints: [
        "`1 <= num1.length, num2.length <= 200`",
        "`num1` and `num2` consist of digits only.",
        "Both `num1` and `num2` do not contain any leading zero, except the number `0` itself."
      ],
      notes: [
        "The product of an m-digit and an n-digit number has at most m + n digits (and at least m + n - 1), which is exactly the size of the result buffer you allocate.",
        "When you multiply digit i of num1 by digit j of num2, the product lands in result positions i+j (carry) and i+j+1 (units) — this index rule is the crux.",
        "Remember the '0' edge case: if either input is \"0\" the answer is \"0\", and stripping leading zeros from the buffer must not leave an empty string."
      ],
      examples: [
        {
          input: 'num1 = "2", num2 = "3"',
          output: '"6"',
          reasoning: "2 * 3 = 6."
        },
        {
          input: 'num1 = "123", num2 = "456"',
          output: '"56088"',
          reasoning: "123 * 456 = 56088, computed by schoolbook multiplication accumulating partial products by position.",
          visual:
            "```\n      1 2 3\n    x 4 5 6\n    -------\n      7 3 8   (123 x 6)\n    6 1 5 .    (123 x 5, shifted)\n  4 9 2 . .    (123 x 4, shifted)\n  ---------\n  5 6 0 8 8\ndigit i (num1) x digit j (num2) -> positions i+j, i+j+1\n```"
        },
        {
          input: 'num1 = "0", num2 = "52"',
          output: '"0"',
          reasoning: "Anything times 0 is 0; the explicit zero check (or leading-zero strip) returns \"0\"."
        },
        {
          input: 'num1 = "9", num2 = "9"',
          output: '"81"',
          reasoning: "9 * 9 = 81; the single-digit product 81 splits as 8 into the tens position and 1 into the units."
        }
      ],
      approaches: [
        {
          name: "Schoolbook multiplication into a position array",
          time: "O(m * n)",
          space: "O(m + n)",
          whenToUse: "The standard big-integer multiply: accumulate every digit-pair product into a result buffer using the i+j / i+j+1 index rule, then handle carries.",
          logic:
            "**What it asks.** Multiply two non-negative integers given as strings and return the product as a string, without converting the whole numbers to native integers or using a bigint library.\n\n" +
            "**Why the naive idea fails.** Converting `num1` and `num2` to `int` is disallowed (and would overflow fixed-width types for 200-digit inputs). Repeated addition (`num1` added `num2` times) is astronomically slow. We must reproduce grade-school long multiplication directly on the digits.\n\n" +
            "**Key Idea — the position rule.** The product of an `m`-digit number and an `n`-digit number has at most `m + n` digits, so allocate a result buffer `res` of `m + n` zeros. When you multiply digit `num1[i]` by digit `num2[j]`, the two-digit product contributes to exactly two positions of the buffer: the **units** go to index `i + j + 1` and the **carry (tens)** go to index `i + j`, using **right-aligned** indexing (index 0 is the most significant slot). Accumulate every pair's contribution, carrying as you go, then read the buffer back as a string.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If either input is `\"0\"`, return `\"0\"` immediately.\n" +
            "2. Reverse both strings (or index from the right) so digit `i` is the `10^i` place; create `res = [0] * (len(num1) + len(num2))`.\n" +
            "3. For each `i` (over `num1`, from the right) and each `j` (over `num2`, from the right):\n" +
            "   - Compute `mul = (num1[i]) * (num2[j])`.\n" +
            "   - Let `p1 = i + j` (carry position) and `p2 = i + j + 1` (units position).\n" +
            "   - Add to the existing value: `total = mul + res[p2]`.\n" +
            "   - Write `res[p2] = total % 10` and add the carry `res[p1] += total // 10`.\n" +
            "4. Build the answer string from `res`, skipping leading zeros; if the result is empty, return `\"0\"`.\n\n" +
            "**Why it works.** Digit `num1[i]` has place value `10^i` and `num2[j]` has `10^j` (counting from the right), so their product has place value `10^(i+j)` — which is exactly buffer index `i + j + 1` when the buffer is filled right-aligned, with the overflow tens spilling one place higher into `i + j`. Adding `res[p2]` before splitting folds in any prior contribution to that place, and pushing `total // 10` into `p1` carries correctly. Summing all `m·n` partial products reconstructs the full product, place value by place value.\n\n" +
            "**Common Gotchas.**\n" +
            "- Get the index rule right: units at `i + j + 1`, carry at `i + j`. Swapping them misplaces every digit.\n" +
            "- Add the existing `res[p2]` before taking `% 10` so overlapping partial products accumulate, and push the carry into `p1` (not directly out of range).\n" +
            "- Strip leading zeros at the end, but guard against returning an empty string — the true `\"0\"` case (handled up front) must survive.\n" +
            "- Index from the right (reverse the strings, or convert with `ord(c) - ord('0')`); mixing up digit order corrupts place values.\n\n" +
            "**Complexity.** Time `O(m * n)` — every pair of digits is multiplied once. Space `O(m + n)` for the result buffer.\n\n" +
            "**Interview mindset.** 'Multiply big numbers given as strings' is schoolbook long multiplication into a size-`m+n` array; the one line that matters is 'digit i times digit j lands at positions i+j and i+j+1.'",
          rcs:
            "class Solution:\n" +
            "    def multiply(self, num1: str, num2: str) -> str:\n" +
            "        if num1 == \"0\" or num2 == \"0\":\n" +
            "            return \"0\"                            # Zero product shortcut.\n" +
            "        m, n = len(num1), len(num2)\n" +
            "        res = [0] * (m + n)                       # Buffer: product has <= m+n digits.\n" +
            "        # Index digits from the right so position reflects place value.\n" +
            "        for i in range(m - 1, -1, -1):\n" +
            "            d1 = ord(num1[i]) - ord('0')          # Digit of num1 at place (m-1-i).\n" +
            "            for j in range(n - 1, -1, -1):\n" +
            "                d2 = ord(num2[j]) - ord('0')      # Digit of num2 at place (n-1-j).\n" +
            "                mul = d1 * d2                     # Single digit-pair product.\n" +
            "                p1, p2 = i + j, i + j + 1         # carry position, units position.\n" +
            "                total = mul + res[p2]             # Fold into any prior contribution.\n" +
            "                res[p2] = total % 10              # Units digit here.\n" +
            "                res[p1] += total // 10            # Carry into the higher position.\n" +
            "        # Skip leading zeros while building the string.\n" +
            "        start = 0\n" +
            "        while start < len(res) and res[start] == 0:\n" +
            "            start += 1\n" +
            "        return \"\".join(str(d) for d in res[start:]) or \"0\"",
          plain:
            "class Solution:\n" +
            "    def multiply(self, num1: str, num2: str) -> str:\n" +
            "        if num1 == \"0\" or num2 == \"0\":\n" +
            "            return \"0\"\n" +
            "        m, n = len(num1), len(num2)\n" +
            "        res = [0] * (m + n)\n" +
            "        for i in range(m - 1, -1, -1):\n" +
            "            d1 = ord(num1[i]) - ord('0')\n" +
            "            for j in range(n - 1, -1, -1):\n" +
            "                d2 = ord(num2[j]) - ord('0')\n" +
            "                mul = d1 * d2\n" +
            "                p1, p2 = i + j, i + j + 1\n" +
            "                total = mul + res[p2]\n" +
            "                res[p2] = total % 10\n" +
            "                res[p1] += total // 10\n" +
            "        start = 0\n" +
            "        while start < len(res) and res[start] == 0:\n" +
            "            start += 1\n" +
            "        return \"\".join(str(d) for d in res[start:]) or \"0\""
        }
      ],
      patternRecognition: [
        "'Multiply numbers given as strings without bigint' -> schoolbook long multiplication into a position array.",
        "Product of m-digit and n-digit numbers fits in m + n digits.",
        "digit i x digit j contributes to result positions i+j (carry) and i+j+1 (units)."
      ],
      interviewRecall: [
        "Allocate res = [0]*(m+n); index digits from the right.",
        "For each pair: total = d1*d2 + res[i+j+1]; res[i+j+1] = total%10; res[i+j] += total//10.",
        "Strip leading zeros at the end; handle the \"0\" input up front, never return \"\"."
      ]
    },

    {
      id: "detect-squares",
      lc: 2013,
      title: "Detect Squares",
      difficulty: "Medium",
      category: "Math & Geometry",
      link: "https://leetcode.com/problems/detect-squares/",
      meta: { pattern: "Point Counting", dataStructure: "Hash Map (Counter)", technique: "Diagonal + corner lookup" },
      description:
        "Design a data structure that lets you add points in the 2D plane and, given a query point, count the number of **axis-aligned squares** that can be formed using the query point as one corner and three previously added points as the other corners.\n\n" +
        "Implement `DetectSquares`:\n" +
        "- `add(point)` — adds `point = [x, y]` to the structure (duplicate points are allowed and counted with multiplicity).\n" +
        "- `count(point)` — returns the number of axis-aligned squares with `point` as one corner and three added points as the others.",
      constraints: [
        "`point.length == 2`",
        "`0 <= x, y <= 1000`",
        "Points may be added **multiple times** (duplicates count).",
        "At most `3000` calls total to `add` and `count`."
      ],
      notes: [
        "Axis-aligned means the sides are parallel to the axes, so a valid square is determined by two opposite corners that lie on a diagonal — the diagonal must have equal horizontal and vertical span (|dx| == |dy|) and be nonzero.",
        "Duplicates matter: if a corner point was added k times, it contributes k to the count, so combinations multiply the stored frequencies of the three other corners.",
        "The efficient query fixes the query point, iterates candidate points sharing its x-coordinate (a vertical side), and multiplies the counts of the two remaining corners."
      ],
      examples: [
        {
          input: "add([3,10]); add([11,2]); add([3,2]); count([11,10])",
          output: "1",
          reasoning: "Query (11,10) pairs with the diagonal point (3,2): |dx|=|dy|=8. The other two corners (3,10) and (11,2) both exist once each, so 1 square.",
          visual:
            "```\n(3,10) ------- (11,10)  <- query\n  |               |\n  |               |\n(3,2) -------- (11,2)\ndiagonal (11,10)-(3,2): |dx|=8,|dy|=8 -> square; corners (3,10),(11,2) present -> count 1\n```"
        },
        {
          input: "... then count([14,8])",
          output: "0",
          reasoning: "No stored point forms a valid diagonal (equal |dx|,|dy|) with (14,8) whose other two corners also exist, so 0 squares."
        },
        {
          input: "add([11,2]) again; count([11,10])",
          output: "2",
          reasoning: "Now (11,2) has count 2. The square with diagonal (3,2) uses corner (11,2), which exists twice, so the square is counted twice -> 2.",
          visual:
            "```\n(11,2) added twice -> the square counts once per copy of each corner\ncount = cnt(3,2) * cnt(3,10) * cnt(11,2) = 1 * 1 * 2 = 2\n```"
        }
      ],
      approaches: [
        {
          name: "Counter of points + diagonal iteration",
          time: "O(1) add, O(k) count",
          space: "O(k)",
          whenToUse: "The intended design: store point frequencies, then for a query iterate points on the same vertical line and check the two opposite corners.",
          logic:
            "**What it asks.** Support adding points (with duplicates) and, for a query point, count axis-aligned squares that use the query point as a corner and three stored points as the other corners.\n\n" +
            "**Why the naive idea fails.** Enumerating all triples of stored points for every `count` is `O(k^3)` and hopeless. Even fixing the query point and trying all pairs of others is `O(k^2)`. We need to exploit the rigid geometry of an axis-aligned square so each query scans points only once.\n\n" +
            "**Key Idea — a diagonal fixes the whole square.** For an axis-aligned square, picking the query point and the **diagonally opposite** corner determines the other two corners uniquely. A point `(px, py)` is diagonal to the query `(qx, qy)` exactly when the horizontal and vertical distances are equal and nonzero: `abs(px - qx) == abs(py - qy)` and `px != qx`. Given such a diagonal point, the remaining two corners are `(qx, py)` and `(px, qy)`. So store a frequency map of all points; for a query, iterate only the **candidate diagonal points that share the query's x-coordinate** (forming a vertical side), and for each, multiply the stored counts of the two other corners.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `__init__`: keep `self.counts`, a `Counter` mapping `(x, y) -> frequency`, and `self.points_by_x`, a map from x-coordinate to the **set of distinct points** added there, to iterate candidates quickly (a set, not a list, so multiplicity is carried only by `counts` and never double-counted).\n" +
            "2. `add(point)`: increment `self.counts[(x, y)]` and add the point to `self.points_by_x[x]`.\n" +
            "3. `count(point)` with query `(qx, qy)`: initialize `total = 0`. For every stored point `(qx, py)` on the same vertical line as the query (so it shares `qx`) with `py != qy`, let the side length `d = abs(py - qy)`.\n" +
            "   - The two other corners are at `(qx + d, qy)`, `(qx + d, py)` and at `(qx - d, qy)`, `(qx - d, py)` — check both the left and right square.\n" +
            "   - For each side, add `counts[(qx, py)] * counts[(other_x, qy)] * counts[(other_x, py)]` to `total`.\n" +
            "4. Return `total`.\n\n" +
            "**Why it works.** Every axis-aligned square with the query as a corner has exactly one corner directly above or below the query (sharing its x) — that is the vertical side. Iterating those candidates enumerates each square exactly once. The side length `d` fixes the opposite vertical line at `qx ± d`, and the two remaining corners are forced; multiplying the three stored frequencies counts every combination of duplicate points, which is precisely the required multiplicity.\n\n" +
            "**Common Gotchas.**\n" +
            "- Skip the degenerate case `py == qy` (zero side length) — a square needs a nonzero side.\n" +
            "- Check BOTH horizontal directions (`qx + d` and `qx - d`); a square can extend left or right of the vertical side.\n" +
            "- Multiply the counts of all three other corners (not just check existence) so duplicate points are counted with correct multiplicity.\n" +
            "- Iterate candidates sharing the query's x (a vertical side) so the enumeration is by diagonal/side, not all pairs.\n\n" +
            "**Complexity.** `add` is `O(1)`. `count` is `O(k)` where `k` is the number of points sharing the query's x-coordinate — each contributes an `O(1)` corner lookup. Space `O(k)` for the stored points.\n\n" +
            "**Interview mindset.** 'Count axis-aligned squares from a corner' -> store point frequencies and, per query, walk the vertical-line candidates; a diagonal (or one shared-coordinate side) pins the square, then multiply the three corner counts for duplicates.",
          rcs:
            "from collections import Counter, defaultdict\n" +
            "\n" +
            "class DetectSquares:\n" +
            "    def __init__(self):\n" +
            "        self.counts = Counter()                   # (x, y) -> how many times added.\n" +
            "        self.points_by_x = defaultdict(list)      # x -> list of points with that x.\n" +
            "\n" +
            "    def add(self, point: List[int]) -> None:\n" +
            "        x, y = point\n" +
            "        self.counts[(x, y)] += 1                   # Record with multiplicity.\n" +
            "        self.points_by_x[x].append((x, y))         # Index by x for fast candidate scan.\n" +
            "\n" +
            "    def count(self, point: List[int]) -> int:\n" +
            "        qx, qy = point\n" +
            "        total = 0\n" +
            "        # Candidates share the query's x -> they form a vertical side with the query.\n" +
            "        for (_, py) in self.points_by_x[qx]:\n" +
            "            if py == qy:\n" +
            "                continue                           # Zero-length side: not a square.\n" +
            "            d = abs(py - qy)                        # Side length.\n" +
            "            # Two opposite corners can lie to the right (qx+d) or left (qx-d).\n" +
            "            for other_x in (qx + d, qx - d):\n" +
            "                total += (self.counts[(qx, py)]\n" +
            "                          * self.counts[(other_x, qy)]\n" +
            "                          * self.counts[(other_x, py)])\n" +
            "        return total",
          plain:
            "from collections import Counter, defaultdict\n" +
            "\n" +
            "class DetectSquares:\n" +
            "    def __init__(self):\n" +
            "        self.counts = Counter()\n" +
            "        self.points_by_x = defaultdict(list)\n" +
            "\n" +
            "    def add(self, point: List[int]) -> None:\n" +
            "        x, y = point\n" +
            "        self.counts[(x, y)] += 1\n" +
            "        self.points_by_x[x].append((x, y))\n" +
            "\n" +
            "    def count(self, point: List[int]) -> int:\n" +
            "        qx, qy = point\n" +
            "        total = 0\n" +
            "        for (_, py) in self.points_by_x[qx]:\n" +
            "            if py == qy:\n" +
            "                continue\n" +
            "            d = abs(py - qy)\n" +
            "            for other_x in (qx + d, qx - d):\n" +
            "                total += (self.counts[(qx, py)]\n" +
            "                          * self.counts[(other_x, qy)]\n" +
            "                          * self.counts[(other_x, py)])\n" +
            "        return total"
        }
      ],
      patternRecognition: [
        "'Count axis-aligned squares with a query corner' -> store point frequencies, iterate a shared-coordinate side.",
        "Two opposite corners on a diagonal (|dx| == |dy| != 0) fix the whole axis-aligned square.",
        "Duplicates -> multiply the counts of the three other corners for correct multiplicity."
      ],
      interviewRecall: [
        "counts = Counter of (x,y); points_by_x indexes candidates on the query's vertical line.",
        "For each candidate (qx, py) with py != qy: d = |py - qy|; check other_x = qx+d and qx-d.",
        "Add counts[(qx,py)] * counts[(other_x,qy)] * counts[(other_x,py)] per side.",
        "Skip py == qy (zero side); check both left and right; multiply (don't just test presence)."
      ]
    }
  ]);
})();
