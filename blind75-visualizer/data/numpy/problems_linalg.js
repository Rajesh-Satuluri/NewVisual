/*
 * NumPy Interview Lab — Linear Algebra
 * =========================================================================
 * Registers on the global registry:
 *     window.NUMPY.register("Linear Algebra", [ ...problems ]);
 *
 * See data/numpy/problems_arrays_creation.js for the full PROBLEM SCHEMA and
 * LOGIC format. Every rcs/plain snippet is self-contained runnable NumPy that
 * starts with `import numpy as np` and prints its output. All snippets were
 * executed against NumPy before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Linear Algebra", [

    // ------------------------------------------------------------------ Q1
    {
      id: "matmul-vs-elementwise",
      num: 1,
      title: "Matrix multiply @ / np.matmul vs element-wise *",
      difficulty: "Medium",
      category: "Linear Algebra",
      importance: "essential",
      meta: { pattern: "Matrix product", technique: "@ vs *", functions: "@, np.matmul, *, np.multiply" },
      description:
        "The single most common NumPy linear-algebra confusion: `A @ B` (equivalently `np.matmul(A, B)`) is the **matrix product** — rows-times-columns with a contraction — while `A * B` is **element-wise** multiplication (Hadamard product), multiplying matching positions. For two 2×2 matrices, show that these give completely different results.",
      notes: [
        "`@` is the matrix-multiply operator; `*` is always element-wise in NumPy (it is **not** matrix multiply).",
        "Matrix multiply requires inner dimensions to match: `(m,k) @ (k,n) -> (m,n)`. Element-wise requires the shapes to match (or broadcast)."
      ],
      examples: [
        {
          input: "A = [[1,2],[3,4]], B = [[5,6],[7,8]]; A @ B",
          output: "[[19 22]\n [43 50]]",
          reasoning: "Row 0 · col 0 = 1*5 + 2*7 = 19; row 0 · col 1 = 1*6 + 2*8 = 22, and so on — a rows-by-columns contraction."
        },
        {
          input: "A * B",
          output: "[[ 5 12]\n [21 32]]",
          reasoning: "Element-wise: 1*5=5, 2*6=12, 3*7=21, 4*8=32. Same positions multiplied, no contraction."
        }
      ],
      approaches: [
        {
          name: "@ (matrix product) vs * (element-wise)",
          whenToUse: "Use `@` for real linear algebra (transforming vectors, chaining transforms, Ax). Use `*` only when you genuinely want to scale positions element-by-element.",
          logic:
            "**What it asks.** Distinguish the matrix product from element-wise multiplication on the same two matrices.\n\n" +
            "**Key idea.** `@` contracts along the inner dimension (a sum of products per output cell); `*` never contracts — it just multiplies aligned entries.\n\n" +
            "**Step by step.**\n" +
            "1. `A @ B` (or `np.matmul(A, B)`): each output cell `[i,j]` = sum over k of `A[i,k]*B[k,j]`.\n" +
            "2. `A * B` (or `np.multiply(A, B)`): each output cell `[i,j]` = `A[i,j]*B[i,j]`.\n" +
            "3. Print both and compare — they differ entirely.\n\n" +
            "**Why it works.** The matrix product encodes composition of linear maps, so it must sum across the shared dimension; element-wise is a pointwise op with no dimensional interaction.\n\n" +
            "**Gotchas.**\n" +
            "- `*` is NOT matrix multiply — reaching for `*` when you meant `@` is the classic bug.\n" +
            "- `@` needs matching inner dims `(m,k)@(k,n)`; a mismatch raises a `ValueError` (shapes not aligned).\n" +
            "- `np.dot` also does matrix multiply for 2-D inputs, but `@` is the clearest, preferred spelling.\n\n" +
            "**Interview mindset.** Say it out loud: '`@` is matrix multiply, `*` is element-wise.' Never let `*` stand in for a matrix product.",
          perfNote: "`@` dispatches to optimized BLAS for float matrices — far faster than any manual triple loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[1, 2], [3, 4]])\n" +
            "B = np.array([[5, 6], [7, 8]])\n" +
            "print(A @ B)                     # matrix product (rows x columns, contracted)\n" +
            "print(A * B)                     # element-wise (Hadamard), same positions",
          plain:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[1, 2], [3, 4]])\n" +
            "B = np.array([[5, 6], [7, 8]])\n" +
            "print(A @ B)\n" +
            "print(A * B)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'multiply two matrices', 'apply a transform', 'compose transforms' → matrix product.",
        "**Say it:** `A @ B` (or `np.matmul`) for the matrix product; `A * B` for element-wise.",
        "**Trap:** `*` is element-wise, never matrix multiply; `@` needs inner dims to match."
      ],
      commonMistakes: [
        "Using `A * B` when you meant the matrix product `A @ B`.",
        "Forgetting `@` requires `(m,k) @ (k,n)` — inner dimensions must agree."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "dot-and-matvec",
      num: 2,
      title: "Dot product and matrix-vector product",
      difficulty: "Easy",
      category: "Linear Algebra",
      importance: "essential",
      meta: { pattern: "Contraction", technique: "dot / matvec", functions: "np.dot, @, np.matmul" },
      description:
        "Compute two fundamental products. First the **dot product** of two 1-D vectors (a single scalar = sum of element-wise products). Then a **matrix-vector product** `A @ x`, which applies the matrix `A` to the vector `x`, producing one output per row.",
      notes: [
        "For 1-D inputs, `u @ v` and `np.dot(u, v)` both return a scalar.",
        "For a 2-D `A` and 1-D `x`, `A @ x` gives a 1-D result of length `A.shape[0]` — each entry is a dot product of a row of A with x."
      ],
      examples: [
        {
          input: "u = [1,2,3], v = [4,5,6]; u @ v",
          output: "32",
          reasoning: "1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32 — a single scalar."
        },
        {
          input: "A = [[1,2,3],[4,5,6]], v = [4,5,6]; A @ v",
          output: "[32 77]",
          reasoning: "Row 0 · v = 32; row 1 · v = 16+25+36 = 77. One dot product per row."
        }
      ],
      approaches: [
        {
          name: "@ / np.dot for vector and matrix-vector products",
          whenToUse: "Dot product for similarity/projection/weighted sums; matrix-vector for applying a linear transform to a point.",
          logic:
            "**What it asks.** Contract a vector with a vector (scalar), then a matrix with a vector (vector).\n\n" +
            "**Key idea.** Both are contractions over the shared dimension. The dot product collapses two length-n vectors to one number; the matrix-vector product runs that dot product once per row.\n\n" +
            "**Step by step.**\n" +
            "1. `u @ v` → sum of `u[i]*v[i]` → a scalar.\n" +
            "2. Build a 2-D `A` and 1-D `x` whose length equals A's number of columns.\n" +
            "3. `A @ x` → length `A.shape[0]`; entry `i` is `A[i,:] @ x`.\n\n" +
            "**Why it works.** `@` contracts the last axis of the left operand with the first axis of the right, which is exactly the definition of both a dot product and a matrix-vector product.\n\n" +
            "**Gotchas.**\n" +
            "- Lengths must line up: for `A @ x`, `len(x)` must equal `A.shape[1]`.\n" +
            "- `u @ v` returns a scalar, not a 1-element array.\n" +
            "- For 1-D vectors there is no row/column distinction — no need to reshape.\n\n" +
            "**Interview mindset.** 'A dot product is a matrix-vector product with a single row — same `@`, same contraction.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "u = np.array([1, 2, 3])\n" +
            "v = np.array([4, 5, 6])\n" +
            "print(u @ v)                     # dot product -> scalar 32\n" +
            "\n" +
            "A = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(A @ v)                     # matrix-vector -> one dot per row",
          plain:
            "import numpy as np\n" +
            "\n" +
            "u = np.array([1, 2, 3])\n" +
            "v = np.array([4, 5, 6])\n" +
            "print(u @ v)\n" +
            "\n" +
            "A = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(A @ v)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'dot product', 'weighted sum', 'project', 'apply matrix to a vector'.",
        "**Say it:** `u @ v` for the scalar dot product; `A @ x` for the matrix-vector product.",
        "**Trap:** `len(x)` must match `A.shape[1]`; a vector dot returns a scalar."
      ],
      commonMistakes: [
        "Mismatched lengths in `A @ x` (x must have A.shape[1] entries).",
        "Expecting `u @ v` to return an array instead of a scalar."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "norm-and-normalize",
      num: 3,
      title: "Vector length with np.linalg.norm (and unit vectors)",
      difficulty: "Medium",
      category: "Linear Algebra",
      importance: "essential",
      meta: { pattern: "Magnitude", technique: "L2 norm / normalize", functions: "np.linalg.norm" },
      description:
        "Measure the **length (magnitude)** of a vector with `np.linalg.norm`, which by default is the Euclidean (L2) norm = sqrt of the sum of squares. Then **normalize** the vector to unit length by dividing by its norm, and confirm the result has length 1.",
      notes: [
        "Default is the L2 norm; pass `ord=1` for the Manhattan (sum of absolute values) norm, `ord=np.inf` for the max absolute entry.",
        "Use the `axis=` argument to take norms row-wise or column-wise on a 2-D array."
      ],
      examples: [
        {
          input: "np.linalg.norm([3.0, 4.0])",
          output: "5.0",
          reasoning: "sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5 — the classic 3-4-5 triangle."
        },
        {
          input: "v / np.linalg.norm(v)  where v = [3.0, 4.0]",
          output: "[0.6 0.8]",
          reasoning: "Dividing by the length 5 gives a unit vector: [3/5, 4/5]; its own norm is 1."
        }
      ],
      approaches: [
        {
          name: "np.linalg.norm + divide to normalize",
          whenToUse: "Measuring distances/magnitudes, and normalizing vectors before cosine similarity or as direction-only inputs.",
          logic:
            "**What it asks.** Get a vector's Euclidean length, then rescale it to length 1.\n\n" +
            "**Key idea.** The L2 norm is `sqrt(sum(v**2))`. A unit vector keeps the direction but sets the magnitude to 1 by dividing every component by that norm.\n\n" +
            "**Step by step.**\n" +
            "1. `n = np.linalg.norm(v)` → the vector's length.\n" +
            "2. `unit = v / n` → same direction, length 1.\n" +
            "3. `np.linalg.norm(unit)` → 1.0, confirming.\n\n" +
            "**Why it works.** Scaling a vector by `1/||v||` scales its norm by the same factor, so the result has norm `||v|| / ||v|| = 1`.\n\n" +
            "**Gotchas.**\n" +
            "- Normalizing a zero vector divides by zero — guard against `norm == 0`.\n" +
            "- `norm` defaults to L2; specify `ord=` for other norms.\n" +
            "- On a 2-D array without `axis=`, `norm` returns the Frobenius norm of the whole matrix, not per-row lengths.\n\n" +
            "**Interview mindset.** 'norm is sqrt of sum of squares; to normalize, divide by the norm — and watch for the zero vector.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "v = np.array([3.0, 4.0])\n" +
            "n = np.linalg.norm(v)            # L2 length: sqrt(9+16) = 5.0\n" +
            "print(n)\n" +
            "unit = v / n                     # scale to length 1\n" +
            "print(unit)                      # [0.6 0.8]\n" +
            "print(np.linalg.norm(unit))      # 1.0 -> confirmed unit vector",
          plain:
            "import numpy as np\n" +
            "\n" +
            "v = np.array([3.0, 4.0])\n" +
            "n = np.linalg.norm(v)\n" +
            "print(n)\n" +
            "unit = v / n\n" +
            "print(unit)\n" +
            "print(np.linalg.norm(unit))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'length', 'magnitude', 'distance', 'unit vector', 'normalize'.",
        "**Say it:** `np.linalg.norm(v)` for length; `v / np.linalg.norm(v)` to normalize.",
        "**Trap:** guard the zero vector; on 2-D pass `axis=` for per-row/column norms."
      ],
      commonMistakes: [
        "Normalizing without checking for a zero-length vector (division by zero).",
        "Expecting per-row norms on a 2-D array without passing `axis=`."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "solve-linear-system",
      num: 4,
      title: "Solve Ax = b with np.linalg.solve (not inv)",
      difficulty: "Medium",
      category: "Linear Algebra",
      importance: "essential",
      meta: { pattern: "Linear system", technique: "solve vs inv", functions: "np.linalg.solve" },
      description:
        "Solve the linear system `A x = b` for the unknown vector `x` using `np.linalg.solve`. This is the correct, numerically stable way to solve a system — prefer it over forming `np.linalg.inv(A) @ b`, which is slower and less accurate.",
      notes: [
        "`np.linalg.solve(A, b)` factorizes A (LU) and solves directly — more accurate and faster than inverting.",
        "Requires A to be square and non-singular; a singular A raises `LinAlgError`."
      ],
      examples: [
        {
          input: "A = [[3,1],[1,2]], b = [9,8]; np.linalg.solve(A, b)",
          output: "[2. 3.]",
          reasoning: "Solves 3x+y=9 and x+2y=8 → x=2, y=3. Check: A @ [2,3] = [9, 8] = b."
        }
      ],
      approaches: [
        {
          name: "np.linalg.solve (preferred over inv)",
          whenToUse: "Any time you need x such that Ax = b for a square, non-singular A.",
          logic:
            "**What it asks.** Find the vector x satisfying `A x = b`.\n\n" +
            "**Key idea.** Solve directly via factorization rather than computing the inverse. `solve` gives the same answer as `inv(A) @ b` but with better accuracy and speed.\n\n" +
            "**Step by step.**\n" +
            "1. Build square `A` and right-hand side `b`.\n" +
            "2. `x = np.linalg.solve(A, b)`.\n" +
            "3. Verify with `A @ x` ≈ `b`.\n\n" +
            "**Why it works.** `solve` performs an LU decomposition and back-substitution — O(n^3) but with a smaller constant and less floating-point error than explicitly building `A^{-1}` and then multiplying.\n\n" +
            "**Gotchas.**\n" +
            "- Prefer `solve(A, b)` over `inv(A) @ b`: inverting is extra work and accumulates more rounding error.\n" +
            "- A must be square and non-singular; a singular/near-singular A raises `LinAlgError` or gives an unstable answer.\n" +
            "- For non-square or overdetermined systems, use `np.linalg.lstsq` instead.\n\n" +
            "**Interview mindset.** 'Never invert to solve — reach for `np.linalg.solve`. It is what a numerical library is for.'",
          perfNote: "`solve` avoids materializing the inverse; one factorization + solve beats inv-then-multiply on both speed and accuracy.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[3.0, 1.0], [1.0, 2.0]])\n" +
            "b = np.array([9.0, 8.0])\n" +
            "x = np.linalg.solve(A, b)        # solve Ax=b directly (LU), stable\n" +
            "print(x)                         # [2. 3.]\n" +
            "print(A @ x)                     # [9. 8.] -> matches b",
          plain:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[3.0, 1.0], [1.0, 2.0]])\n" +
            "b = np.array([9.0, 8.0])\n" +
            "x = np.linalg.solve(A, b)\n" +
            "print(x)\n" +
            "print(A @ x)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'solve for x', 'system of equations', 'Ax = b'.",
        "**Say it:** `x = np.linalg.solve(A, b)` — direct and stable.",
        "**Trap:** don't use `inv(A) @ b`; A must be square and non-singular."
      ],
      commonMistakes: [
        "Computing `np.linalg.inv(A) @ b` instead of `np.linalg.solve(A, b)`.",
        "Calling `solve` on a singular or non-square matrix."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "inverse-and-determinant",
      num: 5,
      title: "Matrix inverse and determinant",
      difficulty: "Medium",
      category: "Linear Algebra",
      importance: "common",
      meta: { pattern: "Inverse / determinant", technique: "inv / det", functions: "np.linalg.inv, np.linalg.det" },
      description:
        "Compute the **inverse** of a square matrix with `np.linalg.inv` (so that `A @ inv(A)` is the identity) and its **determinant** with `np.linalg.det`. A zero (or near-zero) determinant means the matrix is singular and has no inverse.",
      notes: [
        "A matrix is invertible exactly when its determinant is non-zero.",
        "For solving `A x = b`, prefer `np.linalg.solve` over `inv(A) @ b` — inverting is slower and less numerically accurate."
      ],
      examples: [
        {
          input: "A = [[4,7],[2,6]]; np.round(np.linalg.det(A), 1)",
          output: "10.0",
          reasoning: "det = 4*6 - 7*2 = 24 - 14 = 10; non-zero, so A is invertible."
        },
        {
          input: "np.round(np.linalg.inv(A), 3)",
          output: "[[ 0.6 -0.7]\n [-0.2  0.4]]",
          reasoning: "Each entry is a cofactor divided by det (10). Check: A @ inv(A) is the identity."
        }
      ],
      approaches: [
        {
          name: "np.linalg.inv and np.linalg.det",
          whenToUse: "det to test invertibility or measure volume scaling; inv when you genuinely need the inverse matrix itself (not just to solve one system).",
          logic:
            "**What it asks.** Invert a square matrix and compute its determinant.\n\n" +
            "**Key idea.** `det(A)` is a single number: non-zero ⇒ invertible. `inv(A)` is the matrix that undoes A, so `A @ inv(A)` equals the identity.\n\n" +
            "**Step by step.**\n" +
            "1. `d = np.linalg.det(A)` (round for a clean display — raw floats drift).\n" +
            "2. If `d != 0`, `inv = np.linalg.inv(A)`.\n" +
            "3. Confirm `A @ inv` ≈ identity.\n\n" +
            "**Why it works.** The inverse exists precisely when the columns are linearly independent, which is exactly when the determinant is non-zero.\n\n" +
            "**Gotchas.**\n" +
            "- `det` returns a float that can carry tiny rounding error (e.g. `10.000000000000002`) — round it before printing/comparing.\n" +
            "- A singular matrix (det = 0) makes `inv` raise `LinAlgError`.\n" +
            "- To SOLVE a system, use `np.linalg.solve`, not `inv` — it is faster and more accurate.\n\n" +
            "**Interview mindset.** 'det tells me if the inverse exists; but if I only need to solve Ax=b, I use solve, not inv.'",
          perfNote: "Both are O(n^3); explicitly inverting to then multiply is wasted work versus a single `solve`.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[4.0, 7.0], [2.0, 6.0]])\n" +
            "print(np.round(np.linalg.det(A), 1))   # 10.0 -> non-zero, invertible\n" +
            "inv = np.linalg.inv(A)                  # the inverse matrix\n" +
            "print(np.round(inv, 3))\n" +
            "print(np.round(A @ inv, 6))            # identity -> inverse verified",
          plain:
            "import numpy as np\n" +
            "\n" +
            "A = np.array([[4.0, 7.0], [2.0, 6.0]])\n" +
            "print(np.round(np.linalg.det(A), 1))\n" +
            "inv = np.linalg.inv(A)\n" +
            "print(np.round(inv, 3))\n" +
            "print(np.round(A @ inv, 6))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'inverse of a matrix', 'is it invertible', 'determinant'.",
        "**Say it:** `np.linalg.det(A)` for invertibility; `np.linalg.inv(A)` for the inverse.",
        "**Trap:** det can carry float noise (round it); to solve Ax=b use `solve`, not `inv`."
      ],
      commonMistakes: [
        "Using `inv(A) @ b` to solve a system instead of `np.linalg.solve(A, b)`.",
        "Comparing a raw `det` result to 0 without rounding (tiny float error)."
      ]
    }

  ]);
})();
