/*
 * NumPy Interview Lab — Broadcasting & Vectorization
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_arrays_creation.js.
 *
 * Registers on the global registry:
 *     window.NUMPY.register("Broadcasting & Vectorization", [ ...problems ]);
 *
 * Every rcs (commented) / plain (clean) snippet is self-contained runnable
 * NumPy that starts with `import numpy as np` and prints output. rcs and plain
 * are the SAME program; rcs only adds trailing `# comments`. Every snippet and
 * every claimed example output was executed against NumPy before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Broadcasting & Vectorization", [

    // ------------------------------------------------------------------ Q1
    {
      id: "add-scalar-and-row-vector",
      num: 1,
      title: "Add a scalar and a row vector to a matrix",
      difficulty: "Easy",
      category: "Broadcasting & Vectorization",
      importance: "essential",
      meta: { pattern: "Broadcasting", technique: "Shape stretching", functions: "+ (ufunc broadcasting)" },
      description:
        "Add a single number to every entry of a 2×3 matrix, then add a length-3 **row vector** to each row of that matrix — all without any loops. Explain why a `(3,)` vector lines up with a `(2, 3)` matrix but a `(2,)` vector would not.",
      notes: [
        "Broadcasting rule: compare shapes **right-to-left**; dims must be equal or one of them must be 1 (a missing leading dim counts as 1).",
        "A `(2, 3)` matrix + `(3,)` row → the row is stretched down all 2 rows; no data is copied, the stretch is virtual."
      ],
      examples: [
        {
          input: "np.array([[1,2,3],[4,5,6]]) + np.array([10,20,30])",
          output: "[[11 22 33]\n [14 25 36]]",
          reasoning: "The (3,) row aligns with the trailing dim 3 and is added to each of the 2 rows."
        },
        {
          input: "np.array([[1,2,3],[4,5,6]]) + 10",
          output: "[[11 12 13]\n [14 15 16]]",
          reasoning: "A scalar broadcasts against any shape — added to every element."
        }
      ],
      approaches: [
        {
          name: "scalar & row-vector broadcasting",
          whenToUse: "Any element-wise offset applied uniformly (scalar) or per-column (row vector).",
          logic:
            "**What it asks.** Offset a matrix by a scalar, then by a per-column row vector, with no loop.\n\n" +
            "**Key idea.** Broadcasting stretches a smaller operand across the larger one when their shapes are **compatible** — align trailing dims, and any dim of size 1 (or missing) stretches to match.\n\n" +
            "**Step by step.**\n" +
            "1. `M + 10` → the scalar expands to `(2, 3)` and adds everywhere.\n" +
            "2. `M + row` with `row` of shape `(3,)` → NumPy treats it as `(1, 3)`, stretches the 1 down to 2 rows, adds per column.\n\n" +
            "**Why it works.** NumPy compares shapes right-to-left: `(2, 3)` vs `(3,)` → trailing 3 == 3 ✓, leading 2 vs (missing→1) ✓. The virtual stretch costs no extra memory.\n\n" +
            "**Gotchas.**\n" +
            "- A `(2,)` vector would fail: trailing dims 3 vs 2 are unequal and neither is 1.\n" +
            "- To add a **column** offset instead, reshape to `(2, 1)` so it stretches across columns.\n\n" +
            "**Interview mindset.** 'Line up trailing dims; a dim of 1 stretches. Scalar fits anything; a row of length = #cols fits each row.'",
          perfNote: "The stretch is virtual (stride tricks), so it stays O(n) with no materialized copy of the operand.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "M = np.array([[1, 2, 3], [4, 5, 6]])   # shape (2, 3)\n" +
            "row = np.array([10, 20, 30])           # shape (3,) -> treated as (1, 3)\n" +
            "print(M + 10)                          # scalar broadcasts to every element\n" +
            "print(M + row)                         # (3,) stretched down both rows",
          plain:
            "import numpy as np\n" +
            "\n" +
            "M = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "row = np.array([10, 20, 30])\n" +
            "print(M + 10)\n" +
            "print(M + row)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'add the same value everywhere', 'add this vector to each row'.",
        "**Say it:** scalar broadcasts to any shape; a `(cols,)` row adds per column via right-to-left alignment.",
        "**Trap:** a vector whose length ≠ #cols (and ≠ 1) raises a broadcast error."
      ],
      commonMistakes: [
        "Trying to add a `(2,)` vector to a `(2, 3)` matrix expecting per-row offsets (reshape to `(2, 1)` instead).",
        "Looping over rows to add a constant vector instead of relying on broadcasting."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "column-mean-centering",
      num: 2,
      title: "Center each column by subtracting its mean",
      difficulty: "Easy",
      category: "Broadcasting & Vectorization",
      importance: "essential",
      meta: { pattern: "Reduce + broadcast", technique: "axis=0 mean, subtract back", functions: "np.mean(axis=0), -" },
      description:
        "Given a data matrix where rows are samples and columns are features, subtract each column's mean from that column so every column becomes mean-zero. Compute the mean over `axis=0` and broadcast the result back against the full matrix.",
      notes: [
        "`A.mean(axis=0)` collapses the row axis → one value per column, shape `(ncols,)`.",
        "That `(ncols,)` vector broadcasts against `(nrows, ncols)` because trailing dims match."
      ],
      examples: [
        {
          input: "A = [[1,2,3],[3,4,9]]; A - A.mean(axis=0)",
          output: "[[-1. -1. -3.]\n [ 1.  1.  3.]]",
          reasoning: "Column means are [2, 3, 6]; subtracting them per column zeroes each column's average."
        }
      ],
      approaches: [
        {
          name: "mean over axis=0, subtract via broadcast",
          whenToUse: "Standardizing/centering features before ML, PCA, or distance computations.",
          logic:
            "**What it asks.** Make every column mean-zero by subtracting its own average.\n\n" +
            "**Key idea.** Reduce along the sample axis (`axis=0`) to get a per-column mean, then let broadcasting subtract that `(ncols,)` row from every row.\n\n" +
            "**Step by step.**\n" +
            "1. `col_mean = A.mean(axis=0)` → shape `(ncols,)`.\n" +
            "2. `A - col_mean` → `(nrows, ncols)` vs `(ncols,)`: trailing dims match, the mean row stretches down all rows.\n\n" +
            "**Why it works.** `axis=0` says 'move down the rows,' leaving one number per column; that vector aligns on the trailing dim and broadcasts cleanly.\n\n" +
            "**Gotchas.**\n" +
            "- Getting the axis backwards: `axis=1` gives a per-**row** mean of shape `(nrows,)`, which will NOT broadcast back without `keepdims=True` and reshaping.\n" +
            "- For per-row centering, use `A.mean(axis=1, keepdims=True)` so the shape is `(nrows, 1)`.\n\n" +
            "**Interview mindset.** 'axis=0 → per-column stat; it broadcasts straight back because the trailing dim already matches.'",
          perfNote: "One vectorized reduction plus one vectorized subtract — both O(n) in C, no Python loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[1., 2., 3.], [3., 4., 9.]])   # rows = samples, cols = features\n" +
            "col_mean = A.mean(axis=0)                    # per-column mean, shape (3,)\n" +
            "print(col_mean)\n" +
            "print(A - col_mean)                          # (3,) broadcasts down every row",
          plain:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[1., 2., 3.], [3., 4., 9.]])\n" +
            "col_mean = A.mean(axis=0)\n" +
            "print(col_mean)\n" +
            "print(A - col_mean)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'center the features', 'subtract the column mean', 'make each column zero-mean'.",
        "**Say it:** `A - A.mean(axis=0)`; axis=0 collapses rows so the `(ncols,)` mean broadcasts back.",
        "**Trap:** per-row centering needs `axis=1, keepdims=True` to keep a `(nrows, 1)` shape."
      ],
      commonMistakes: [
        "Using `axis=1` and then failing to broadcast a `(nrows,)` vector against `(nrows, ncols)`.",
        "Forgetting `keepdims=True` when centering along the other axis."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "outer-sum-and-product",
      num: 3,
      title: "Build a pairwise sum / outer product with None indexing",
      difficulty: "Medium",
      category: "Broadcasting & Vectorization",
      importance: "common",
      meta: { pattern: "Outer combination", technique: "column[:,None] + row[None,:]", functions: "np.newaxis / None indexing" },
      description:
        "From two 1-D arrays `a` (length m) and `b` (length n), build the m×n matrix of all pairwise sums `a[i] + b[j]`, and the outer product `a[i] * b[j]`, using `a[:, None]` and `b[None, :]` to reshape into orthogonal axes.",
      notes: [
        "`a[:, None]` turns shape `(m,)` into `(m, 1)`; `b[None, :]` turns `(n,)` into `(1, n)`.",
        "`(m, 1)` op `(1, n)` broadcasts to `(m, n)` — each axis stretches over the other."
      ],
      examples: [
        {
          input: "a=[1,2,3]; b=[10,20]; a[:,None] + b[None,:]",
          output: "[[11 21]\n [12 22]\n [13 23]]",
          reasoning: "Row i holds a[i] added to every b[j]; shapes (3,1) and (1,2) broadcast to (3,2)."
        }
      ],
      approaches: [
        {
          name: "orthogonal axes via None (np.newaxis)",
          whenToUse: "Any all-pairs combination of two 1-D arrays: sum tables, outer products, gram-style grids.",
          logic:
            "**What it asks.** Combine every element of `a` with every element of `b` into a 2-D table, no loop.\n\n" +
            "**Key idea.** Put `a` on the row axis `(m, 1)` and `b` on the column axis `(1, n)`; broadcasting expands each size-1 dim to cover the other, giving `(m, n)`.\n\n" +
            "**Step by step.**\n" +
            "1. `a[:, None]` → `(m, 1)` (a column).\n" +
            "2. `b[None, :]` → `(1, n)` (a row).\n" +
            "3. `a[:, None] + b[None, :]` → `(m, n)` pairwise sums; swap `+` for `*` to get the outer product.\n\n" +
            "**Why it works.** Trailing dims align as `1` vs `n` (stretch) and `m` vs `1` (stretch); a size-1 dim is exactly the one broadcasting is allowed to expand.\n\n" +
            "**Gotchas.**\n" +
            "- `None` is `np.newaxis`; forgetting one axis leaves you with an element-wise op that needs equal lengths, not an all-pairs grid.\n" +
            "- `np.outer(a, b)` is the shortcut for the product, but the `None` trick generalizes to any operation (sum, max, distance).\n\n" +
            "**Interview mindset.** 'Column `[:,None]` + row `[None,:]` = every pair. The size-1 axes are what broadcasting stretches.'",
          perfNote: "Materializes the full m×n grid once in C; no Python-level double loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([1, 2, 3])          # shape (3,)\n" +
            "b = np.array([10, 20])           # shape (2,)\n" +
            "print(a[:, None] + b[None, :])   # (3,1) + (1,2) -> (3,2) pairwise sums\n" +
            "print(a[:, None] * b[None, :])   # same shapes -> outer product",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([1, 2, 3])\n" +
            "b = np.array([10, 20])\n" +
            "print(a[:, None] + b[None, :])\n" +
            "print(a[:, None] * b[None, :])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'all pairs', 'outer product', 'a table of a[i] op b[j]'.",
        "**Say it:** `a[:, None] <op> b[None, :]` broadcasts `(m,1)` against `(1,n)` to `(m,n)`.",
        "**Trap:** omit a `None` and you get an element-wise op requiring equal lengths, not a grid."
      ],
      commonMistakes: [
        "Writing `a + b` (element-wise, needs equal lengths) when you meant an all-pairs grid.",
        "Putting `None` on the wrong axis and getting a transposed / mismatched shape."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "pairwise-distance-matrix",
      num: 4,
      title: "Pairwise Euclidean distance matrix via broadcasting",
      difficulty: "Hard",
      category: "Broadcasting & Vectorization",
      importance: "common",
      meta: { pattern: "3-D broadcasting", technique: "X[:,None,:] - Y[None,:,:]", functions: "np.sqrt, sum(axis=-1)" },
      description:
        "Given two point sets `X` (shape `(m, d)`) and `Y` (shape `(n, d)`), compute the `(m, n)` matrix `D` where `D[i, j]` is the Euclidean distance between row i of X and row j of Y — using broadcasting, no explicit loops.",
      notes: [
        "Insert a new axis so the point sets occupy different broadcasting axes: `X[:, None, :]` is `(m, 1, d)`, `Y[None, :, :]` is `(1, n, d)`.",
        "Their difference broadcasts to `(m, n, d)`; square, sum over the last (feature) axis, then `sqrt`."
      ],
      examples: [
        {
          input: "X=[[0,0],[1,0],[0,1]], Y=[[0,0],[1,1]]",
          output: "[[0.         1.41421356]\n [1.         1.        ]\n [1.         1.        ]]",
          reasoning: "Row 0 is distances of (0,0) to each Y point: 0 and √2; other rows follow, giving a (3,2) matrix."
        }
      ],
      approaches: [
        {
          name: "3-D difference, reduce over the feature axis",
          whenToUse: "k-NN, clustering, kernels — whenever you need all cross-distances between two sets.",
          logic:
            "**What it asks.** All cross distances between rows of X and rows of Y as an `(m, n)` matrix.\n\n" +
            "**Key idea.** Lift each set onto its own axis so the difference spans `(m, n, d)`; reduce the feature axis to collapse `d` away.\n\n" +
            "**Step by step.**\n" +
            "1. `X[:, None, :]` → `(m, 1, d)`; `Y[None, :, :]` → `(1, n, d)`.\n" +
            "2. Subtract → `(m, n, d)` of coordinate differences (the 1-dims stretch to m and n).\n" +
            "3. Square, `sum(axis=-1)` → `(m, n)` squared distances.\n" +
            "4. `np.sqrt(...)` → the distance matrix.\n\n" +
            "**Why it works.** Trailing dims align as `d==d`, and the two size-1 axes (`1` vs `n`, `m` vs `1`) each stretch — the classic broadcast rule extended to 3-D.\n\n" +
            "**Gotchas.**\n" +
            "- Memory: the intermediate is `m*n*d` — large sets can blow up RAM; `scipy.spatial.distance.cdist` or the `(x²+y²-2xy)` expansion avoids the 3-D temporary.\n" +
            "- Reduce over `axis=-1` (features), not `axis=0`, or you collapse the wrong dimension.\n" +
            "- Squared differences can be negative-free, but floating error may give a tiny negative under `sqrt`; clip at 0 if it matters.\n\n" +
            "**Interview mindset.** 'Add axes so the two sets live on separate dims, difference to `(m,n,d)`, then sum the feature axis and sqrt.'",
          perfNote: "Builds an `m*n*d` temporary; fine for modest sizes, but for large sets prefer the dot-product expansion or `cdist` to skip the 3-D array.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "X = np.array([[0., 0.], [1., 0.], [0., 1.]])   # (3, 2)\n" +
            "Y = np.array([[0., 0.], [1., 1.]])             # (2, 2)\n" +
            "diff = X[:, None, :] - Y[None, :, :]           # (3,1,2)-(1,2,2) -> (3,2,2)\n" +
            "D = np.sqrt((diff ** 2).sum(axis=-1))          # sum feature axis -> (3, 2)\n" +
            "print(D)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "X = np.array([[0., 0.], [1., 0.], [0., 1.]])\n" +
            "Y = np.array([[0., 0.], [1., 1.]])\n" +
            "diff = X[:, None, :] - Y[None, :, :]\n" +
            "D = np.sqrt((diff ** 2).sum(axis=-1))\n" +
            "print(D)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'distance between every pair', 'k-NN', 'similarity/kernel matrix'.",
        "**Say it:** `X[:,None,:] - Y[None,:,:]` → `(m,n,d)`, then `sqrt((diff**2).sum(-1))`.",
        "**Trap:** the `(m,n,d)` temporary is a memory hazard at scale; sum over the feature axis (`-1`)."
      ],
      commonMistakes: [
        "Summing over the wrong axis (collapsing points instead of features).",
        "Materializing the 3-D difference for huge sets and running out of memory."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "vectorize-python-loop",
      num: 5,
      title: "Replace a Python for-loop with a vectorized expression",
      difficulty: "Easy",
      category: "Broadcasting & Vectorization",
      importance: "essential",
      meta: { pattern: "Vectorization", technique: "element-wise ufunc", functions: "** , + (whole-array ops)" },
      description:
        "Compute `x[i]**2 + 1` for every element of an array. A beginner writes a Python `for` loop that assigns element by element; rewrite it as one whole-array expression that runs in NumPy's C core.",
      notes: [
        "Whole-array arithmetic applies element-wise, so `x**2 + 1` needs no index at all.",
        "The loop version is not just slower — it also fights NumPy's design; keep operations at the array level."
      ],
      examples: [
        {
          input: "x = [1,2,3,4,5]; x**2 + 1",
          output: "[ 2  5 10 17 26]",
          reasoning: "Each element is squared then incremented: 1→2, 2→5, 3→10, 4→17, 5→26."
        }
      ],
      approaches: [
        {
          name: "whole-array expression (vectorized)",
          whenToUse: "Any element-wise transform currently written as a Python loop over indices.",
          logic:
            "**What it asks.** Apply `x**2 + 1` to every element without a Python-level loop.\n\n" +
            "**Key idea.** NumPy ufuncs act on the entire array at once; the index disappears and the loop runs in compiled C.\n\n" +
            "**Step by step.**\n" +
            "1. Recognize the loop body `out[i] = x[i]**2 + 1` is purely element-wise.\n" +
            "2. Drop the index: `out = x**2 + 1`.\n\n" +
            "**Why it works.** `**` and `+` are ufuncs that map over every element in a single C pass, so no per-element Python overhead is paid.\n\n" +
            "**Gotchas.**\n" +
            "- The slow way — a Python loop — is the anti-pattern:\n" +
            "  ```\n" +
            "  out = np.empty_like(x)\n" +
            "  for i in range(len(x)):\n" +
            "      out[i] = x[i] ** 2 + 1   # per-element Python overhead; avoid\n" +
            "  ```\n" +
            "- Integer arrays keep an integer dtype: `x**2` on int stays int (watch for overflow on large values).\n" +
            "- `np.vectorize` is NOT a speed-up — it is still a Python loop under the hood; use true array ops.\n\n" +
            "**Interview mindset.** 'If the loop body is element-wise, delete the loop and write the expression on the whole array.'",
          perfNote: "Vectorized `x**2 + 1` is one C-level pass; the equivalent Python loop is typically 10–100× slower.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "x = np.arange(1, 6)     # [1 2 3 4 5]\n" +
            "out = x ** 2 + 1        # whole-array: no loop, no index\n" +
            "print(out)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "x = np.arange(1, 6)\n" +
            "out = x ** 2 + 1\n" +
            "print(out)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** a `for i in range(len(x))` loop whose body only touches `x[i]`.",
        "**Say it:** drop the index — `out = x**2 + 1` runs element-wise in C.",
        "**Trap:** `np.vectorize` looks vectorized but is still a Python loop; it is not a performance fix."
      ],
      commonMistakes: [
        "Writing an explicit `for` loop for an element-wise transform NumPy does in one pass.",
        "Reaching for `np.vectorize` expecting a speed-up."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "where-vs-clip",
      num: 6,
      title: "Vectorized conditional: np.where vs np.clip",
      difficulty: "Easy",
      category: "Broadcasting & Vectorization",
      importance: "common",
      meta: { pattern: "Conditional select", technique: "boolean mask branchless", functions: "np.where, np.clip" },
      description:
        "Clip all negative values of an array to 0 (a ReLU) two ways: with `np.where(cond, a, b)` as a general element-wise if/else, and with `np.clip` as the purpose-built bounding function. Note when each is the right tool.",
      notes: [
        "`np.where(a < 0, 0, a)` reads as 'where negative use 0, else keep a' — a vectorized ternary.",
        "`np.clip(a, 0, None)` bounds below at 0 with no upper bound; it is clearer for pure min/max clamping."
      ],
      examples: [
        {
          input: "a = [-3,-1,0,2,5]",
          output: "np.where -> [0 0 0 2 5]\nnp.clip  -> [0 0 0 2 5]",
          reasoning: "Both set the two negatives to 0 and leave the non-negatives untouched."
        }
      ],
      approaches: [
        {
          name: "where (general) & clip (bounding)",
          whenToUse: "where for any condition→two-choice select; clip when you only need lower/upper bounds.",
          logic:
            "**What it asks.** Turn negatives into 0 without a loop, comparing a general and a specialized tool.\n\n" +
            "**Key idea.** `np.where` is a branchless vectorized if/else over a boolean mask; `np.clip` is the specialized case of bounding to `[min, max]`.\n\n" +
            "**Step by step.**\n" +
            "1. `np.where(a < 0, 0, a)` → evaluate the mask, pick 0 where True, `a` where False.\n" +
            "2. `np.clip(a, 0, None)` → clamp values below 0 up to 0, leave the rest.\n\n" +
            "**Why it works.** `where` selects element-wise from two broadcast-compatible choices using the mask; `clip` is a fused min/max that is both faster to type and to read for bounds.\n\n" +
            "**Gotchas.**\n" +
            "- `where` evaluates BOTH branch expressions before selecting — if a branch can error (e.g. divide by zero), guard it; a plain scalar like 0 is safe.\n" +
            "- `np.clip(a, 0, None)` needs `None` (not omission) for 'no upper bound'.\n" +
            "- The choices in `where` broadcast against the condition, so a scalar and an array mix freely.\n\n" +
            "**Interview mindset.** 'Arbitrary condition → `np.where`; just bounding a range → `np.clip`. Both are branchless and vectorized.'",
          perfNote: "Both are single C-level passes; `clip` avoids constructing an explicit boolean mask.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([-3, -1, 0, 2, 5])\n" +
            "print('np.where ->', np.where(a < 0, 0, a))   # if a<0 then 0 else a\n" +
            "print('np.clip  ->', np.clip(a, 0, None))     # lower-bound at 0, no upper",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([-3, -1, 0, 2, 5])\n" +
            "print('np.where ->', np.where(a < 0, 0, a))\n" +
            "print('np.clip  ->', np.clip(a, 0, None))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'set values below/above a threshold', 'ReLU', 'if condition then x else y'.",
        "**Say it:** `np.where(cond, x, y)` for any if/else; `np.clip(a, lo, hi)` for pure bounds.",
        "**Trap:** `np.where` evaluates both branches; use `None` in `clip` for an open bound."
      ],
      commonMistakes: [
        "Putting an expression that can error into a `np.where` branch (both branches are evaluated).",
        "Using a Python loop with `if` per element instead of `where`/`clip`."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "scale-rows-reshape",
      num: 7,
      title: "Scale each row by a per-row factor with reshape(-1, 1)",
      difficulty: "Medium",
      category: "Broadcasting & Vectorization",
      importance: "common",
      meta: { pattern: "Per-row broadcast", technique: "reshape(-1,1) column vector", functions: "reshape, * " },
      description:
        "Multiply each row of a `(2, 3)` matrix by its own scalar factor from a length-2 vector. A raw `(2,)` factor vector will NOT broadcast against the rows — reshape it to `(2, 1)` so it stretches across the columns.",
      notes: [
        "`factors.reshape(-1, 1)` turns `(2,)` into `(2, 1)`; the `-1` means 'infer this dim from the size'.",
        "`(2, 3) * (2, 1)` → the single column stretches to 3 columns, scaling each row uniformly."
      ],
      examples: [
        {
          input: "M=[[1,2,3],[4,5,6]]; factors=[10,100]; M * factors.reshape(-1,1)",
          output: "[[ 10  20  30]\n [400 500 600]]",
          reasoning: "Row 0 ×10, row 1 ×100; the (2,1) column broadcasts across all 3 columns."
        }
      ],
      approaches: [
        {
          name: "reshape to a column, then multiply",
          whenToUse: "Row-wise weighting/normalization: per-sample scaling, applying row sums, weighting rows.",
          logic:
            "**What it asks.** Scale row i of a matrix by `factors[i]`, no loop.\n\n" +
            "**Key idea.** Per-row scaling needs the factors on the **column** axis — shape `(nrows, 1)` — so they stretch across columns.\n\n" +
            "**Step by step.**\n" +
            "1. `factors` is `(2,)`; `M * factors` fails or misaligns because `(2, 3)` vs `(2,)` compares trailing 3 vs 2.\n" +
            "2. `factors.reshape(-1, 1)` → `(2, 1)`.\n" +
            "3. `M * factors.reshape(-1, 1)` → `(2, 3)` vs `(2, 1)`: rows match, the 1 stretches to 3 columns.\n\n" +
            "**Why it works.** Right-to-left the shapes are `3` vs `1` (stretch) and `2` vs `2` (equal) — a valid broadcast that repeats each factor across its row.\n\n" +
            "**Gotchas.**\n" +
            "- A bare `(2,)` vector aligns on the **last** axis, so it tries to scale columns, not rows — hence the reshape to `(2, 1)`.\n" +
            "- `-1` in `reshape` infers the length; `factors[:, None]` is the equivalent shortcut.\n" +
            "- To scale **columns** instead, a `(1, ncols)` / `(ncols,)` vector is already correct without reshaping.\n\n" +
            "**Interview mindset.** 'Per-row factor → make it a column `(n,1)`. Per-column factor → a row `(n,)` already works.'",
          perfNote: "Virtual stretch (no copy of the factors) plus one C-level multiply — O(n).",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "M = np.array([[1, 2, 3], [4, 5, 6]])   # (2, 3)\n" +
            "factors = np.array([10, 100])          # (2,) -> needs to be a column\n" +
            "print(M * factors.reshape(-1, 1))      # (2,3) * (2,1): each row scaled",
          plain:
            "import numpy as np\n" +
            "\n" +
            "M = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "factors = np.array([10, 100])\n" +
            "print(M * factors.reshape(-1, 1))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'scale/weight each row', 'multiply row i by w[i]', 'per-sample factor'.",
        "**Say it:** `M * factors.reshape(-1, 1)` (or `factors[:, None]`) puts factors on the column axis.",
        "**Trap:** a bare `(nrows,)` vector aligns on columns, not rows — reshape to `(nrows, 1)`."
      ],
      commonMistakes: [
        "Writing `M * factors` with a `(nrows,)` vector expecting per-row scaling.",
        "Reshaping to `(1, nrows)` (a row) instead of `(nrows, 1)` (a column)."
      ]
    }

  ]);
})();
