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
    }
  ]);
})();
