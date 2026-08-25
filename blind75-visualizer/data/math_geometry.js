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
            "**A. What is being asked?** Rotate a square grid 90° clockwise, editing the same array, using no second matrix.\n\n" +
            "**B. Brute force idea.** Allocate a fresh `n x n` grid and copy: the element at `(r, c)` in a 90°-clockwise rotation lands at `(c, n-1-r)`. That is correct and easy, but it uses `O(n^2)` extra space, which the problem forbids.\n\n" +
            "**D. Key observation.** A 90° clockwise rotation is exactly two simpler, in-place operations composed:\n" +
            "1. **Transpose** the matrix (reflect across the main diagonal): swap `matrix[i][j]` with `matrix[j][i]`. After this, `(r, c)` holds what used to be at `(c, r)`.\n" +
            "2. **Reverse each row** (reflect left-to-right). After this, column `c` becomes column `n-1-c`.\n\n" +
            "**E. Why the composition equals a rotation.** Track a single cell. Start with value `v` at `(r, c)`. Transpose sends it to `(c, r)`. Reversing row `c` sends `(c, r)` to `(c, n-1-r)`. So `v` ends at `(c, n-1-r)` — which is precisely where a 90° clockwise rotation puts the value from `(r, c)`. Two reflections about intersecting axes always compose into a rotation; here the two axes (main diagonal, then vertical) meet at 45°, and reflecting across two lines that meet at angle θ rotates by `2θ` = 90°.\n\n" +
            "**F. Why in place works.** The transpose only swaps mirror pairs across the diagonal, so we iterate the upper triangle (`j > i`) and swap each pair once — touching the diagonal itself would undo swaps. Reversing a row is a standard two-pointer swap needing no extra grid.\n\n" +
            "**I. Step by step.**\n" +
            "1. For every `i`, for every `j > i`: swap `matrix[i][j]` and `matrix[j][i]` (transpose).\n" +
            "2. For every row, reverse it in place with two pointers (or `row.reverse()`).\n\n" +
            "**J. Why correct.** Shown per-cell in E: the composed map `(r, c) -> (c, n-1-r)` is the clockwise rotation, and every cell follows it.\n\n" +
            "**K/L. Complexity.** Each phase touches ~`n^2/2` cells, so time `O(n^2)`; only scalar temporaries are used, so space `O(1)`.\n\n" +
            "**M. Interview mindset.** “Rotate a square matrix in place” should immediately trigger “transpose, then reverse each row” for clockwise (and “reverse each row, then transpose”, or transpose then reverse each column, for counter-clockwise).",
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
            "**D. Alternative observation.** A rotation permutes cells in groups of four: each cell maps to the next corner of a rotated square, and after four moves you return to the start. So we can move four elements at a time with one temporary variable.\n\n" +
            "**E. Layers.** Think of the matrix as concentric square rings (layers). The outermost ring is layer 0, then layer 1 inside it, and so on for `n // 2` layers. We rotate each ring independently.\n\n" +
            "**F. The 4-way cycle.** Within a layer, for each offset `i` along the top edge, four positions rotate into each other clockwise: top -> right -> bottom -> left -> top. Save the top element, then pull left into top, bottom into left, right into bottom, and the saved top into right.\n\n" +
            "**G/H. Index bookkeeping.** With `first = layer` and `last = n - 1 - layer`, for `i` in `[first, last)` the four cells are:\n" +
            "- top:    `matrix[first][i]`\n" +
            "- left:   `matrix[last - offset][first]`  (where `offset = i - first`)\n" +
            "- bottom: `matrix[last][last - offset]`\n" +
            "- right:  `matrix[i][last]`\n\n" +
            "**I. Step by step.** For each layer, walk `i` across the top edge and perform the four assignments above using one saved temp, so no scratch grid is needed.\n\n" +
            "**J. Why correct.** Each 4-cycle is exactly the orbit of the clockwise rotation on those four cells; rotating every orbit in every layer rotates the whole matrix.\n\n" +
            "**K/L. Complexity.** Every cell is moved exactly once -> time `O(n^2)`, space `O(1)`.",
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
            "**A. What is being asked?** Visit every cell exactly once following a clockwise inward spiral, collecting values in order.\n\n" +
            "**D. Key observation.** At any moment the un-visited region is a rectangle. Track it with four boundaries: `top`, `bottom` (row indices) and `left`, `right` (column indices). One full loop peels the outer ring of that rectangle and then moves the four boundaries inward by one.\n\n" +
            "**E. Pattern / data structure.** No auxiliary grid — just four integer boundaries and the output list. The spiral is four directional sweeps in a fixed clockwise order.\n\n" +
            "**G/H. What the boundaries mean.** `top`/`bottom`/`left`/`right` are the *inclusive* edges of the still-unvisited rectangle. The instant a sweep finishes an edge, we retract that edge so it is never touched again.\n\n" +
            "**I. Step by step (one iteration of the outer loop).**\n" +
            "1. Go **right** along `top` from `left` to `right`, then `top += 1`.\n" +
            "2. Go **down** along `right` from `top` to `bottom`, then `right -= 1`.\n" +
            "3. If `top <= bottom`: go **left** along `bottom` from `right` to `left`, then `bottom -= 1`.\n" +
            "4. If `left <= right`: go **up** along `left` from `bottom` to `top`, then `left += 1`.\n" +
            "Repeat while `top <= bottom` and `left <= right`.\n\n" +
            "**F. Why the two inner checks matter (avoiding double-visits).** After the top and right sweeps retract their edges, the leftover strip may be a *single* row or a *single* column. Without the `if top <= bottom` guard, the bottom sweep would re-read a row the top sweep already consumed; without `if left <= right`, the up sweep would re-read a column the right sweep already consumed. Those two guards are exactly what prevent duplicates on odd/thin rectangles.\n\n" +
            "**J. Why correct.** Each of the four sweeps traverses one edge of the current rectangle and then that edge is retracted, so no cell is ever visited twice; the loop ends precisely when the rectangle is empty, so no cell is missed.\n\n" +
            "**K/L. Complexity.** Every cell is appended once -> time `O(m * n)`; aside from the output, only four indices -> space `O(1)`.\n\n" +
            "**M. Interview mindset.** “Spiral / ring / layer traversal of a grid” = shrinking boundaries. The one thing that trips people is the two guards before the bottom and left sweeps; state them explicitly.",
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
            "**A. What is being asked?** For every original zero, blank its whole row and whole column, editing the matrix in place.\n\n" +
            "**B. Broken naive idea.** Zeroing a row/column the instant you see a 0 corrupts the scan: the new zeros look like original zeros and cascade until everything is 0. So detection must finish before any mutation.\n\n" +
            "**D. Key observation.** We only need to know *which rows* and *which columns* contain at least one zero. That is two small collections, not the full grid of decisions.\n\n" +
            "**E. Data structure.** A set `zero_rows` and a set `zero_cols`. First pass records every row and column that holds a zero; second pass blanks any cell whose row or column is marked.\n\n" +
            "**I. Step by step.**\n" +
            "1. Scan all cells; whenever `matrix[r][c] == 0`, add `r` to `zero_rows` and `c` to `zero_cols`.\n" +
            "2. Scan all cells again; set `matrix[r][c] = 0` if `r in zero_rows` or `c in zero_cols`.\n\n" +
            "**J. Why correct.** Detection is fully separated from mutation, so only ORIGINAL zeros drive the blanking — no cascade.\n\n" +
            "**K/L. Complexity.** Two full passes -> time `O(m * n)`; the two sets hold at most `m` rows and `n` columns -> space `O(m + n)`.",
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
            "**D. Key observation.** The marker sets from the baseline can live *inside the matrix*. Use row 0 as the “this column has a zero” flags and column 0 as the “this row has a zero” flags. Cell `matrix[0][c]` records whether column `c` must be cleared; `matrix[r][0]` records whether row `r` must be cleared. That reuses existing storage, so no extra sets.\n\n" +
            "**F. The conflict, and why we need two extra flags.** Cell `matrix[0][0]` is shared — it would have to flag both “row 0 has a zero” and “column 0 has a zero”, which is one bit for two facts. Resolve it by pulling one of them out into a single boolean. We keep `matrix[0][0]` to mean “row 0 has a zero” and use a separate variable `col0` to mean “column 0 has a zero”.\n\n" +
            "**G/H. What each marker holds.**\n" +
            "- `col0` (bool): does the first column contain any original zero?\n" +
            "- `matrix[r][0]` for `r >= 0`: does row `r` contain a zero? (`matrix[0][0]` covers row 0.)\n" +
            "- `matrix[0][c]` for `c >= 1`: does column `c` contain a zero?\n\n" +
            "**I. Step by step.**\n" +
            "1. Determine `col0` first: scan column 0; if any `matrix[r][0] == 0`, set `col0 = True`.\n" +
            "2. First pass over cells with `c >= 1`: if `matrix[r][c] == 0`, write the marks `matrix[r][0] = 0` and `matrix[0][c] = 0`.\n" +
            "3. Second pass over the *interior* (`r >= 1`, `c >= 1`), from anywhere: if `matrix[r][0] == 0` or `matrix[0][c] == 0`, set the cell to 0. Doing the interior first protects the marker line from being overwritten before it is read.\n" +
            "4. Handle row 0: if `matrix[0][0] == 0`, blank the entire first row.\n" +
            "5. Handle column 0: if `col0` is True, blank the entire first column.\n\n" +
            "**J. Why correct.** The marks record exactly which rows/columns had an original zero (same information as the two sets). By clearing the interior before overwriting the marker row/column, and by handling row 0 and column 0 last using `matrix[0][0]` and `col0`, every original zero clears its full row and column and nothing cascades.\n\n" +
            "**K/L. Complexity.** A constant number of passes -> time `O(m * n)`; only the single boolean `col0` beyond the matrix -> space `O(1)`.\n\n" +
            "**M. Interview mindset.** The move “store your auxiliary marks inside the input's border” is the classic O(1)-space matrix trick; the only subtlety is the shared `(0,0)` cell, solved with one extra flag.",
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
