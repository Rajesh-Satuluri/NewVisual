/*
 * NumPy Interview Lab — Array Creation & Basics
 * =========================================================================
 * FORMAT REFERENCE for every other NumPy practice file.
 *
 * Each file registers its problems on the global registry:
 *     window.NUMPY.register("Category Name", [ ...problems ]);
 *
 * PROBLEM SCHEMA (all fields required unless marked optional):
 * {
 *   id:          "kebab-case-unique-id",
 *   num:         1,                        // question number (Q#)
 *   title:       "Create an array of evenly spaced values",
 *   difficulty:  "Easy" | "Medium" | "Hard",
 *   category:    "Array Creation & Basics", // must match register() key
 *   importance:  "essential" | "common" | "occasional",  // optional, default "common"
 *   meta: { pattern, technique, functions },  // short strings: badges + search
 *   description: "markdown — faithful PARAPHRASE of the task, never verbatim",
 *   notes:       ["markdown line", ...],   // optional
 *   examples: [ { input, output, reasoning } ],   // 1–2, concrete values
 *   approaches: [                          // 1–2; add a 2nd ONLY for a real contrast
 *     { name, whenToUse, logic, perfNote?, rcs, plain }  // rcs = commented; plain = clean
 *   ],                                     // rcs & plain MUST be runnable NumPy that prints
 *   recognizeRecall: ["merged cue: how to spot it + what to say", ...],  // optional
 *   commonMistakes:  ["one-line pitfall", ...]  // optional
 * }
 *
 * IMPORTANT: rcs/plain code must be self-contained runnable NumPy (start with
 * `import numpy as np`) and print something, so the in-browser Run button works.
 * Every snippet in this repo was executed against NumPy before commit.
 *
 * LOGIC format (bold lead-ins, omit a section only if it truly doesn't apply):
 * **What it asks.** → **Key idea.** → **Step by step.** (numbered) →
 * **Why it works.** → **Gotchas.** (bullets) → **Interview mindset.**
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Array Creation & Basics", [

    // ------------------------------------------------------------------ Q1
    {
      id: "arange-vs-linspace",
      num: 1,
      title: "Generate evenly spaced values (arange vs linspace)",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "essential",
      meta: { pattern: "Ranges", technique: "Step vs count", functions: "np.arange, np.linspace" },
      description:
        "Produce a sequence of evenly spaced numbers two ways: by **step size** with `np.arange`, and by **number of points** with `np.linspace`. Return the integers 0–9, and then 5 points evenly spread across the inclusive interval [0, 1].",
      notes: [
        "`np.arange(stop)` is like Python's `range` but returns an ndarray and accepts float steps.",
        "`np.linspace(a, b, n)` includes **both** endpoints by default — the safe choice for floats."
      ],
      examples: [
        {
          input: "np.arange(10)",
          output: "[0 1 2 3 4 5 6 7 8 9]",
          reasoning: "Start defaults to 0, step to 1, stop is exclusive — ten values."
        },
        {
          input: "np.linspace(0, 1, 5)",
          output: "[0.   0.25 0.5  0.75 1.  ]",
          reasoning: "5 points from 0 to 1 inclusive → spacing 1/(5-1) = 0.25."
        }
      ],
      approaches: [
        {
          name: "arange (by step) & linspace (by count)",
          whenToUse: "arange for integer index ranges; linspace whenever you need floats to land exactly on both endpoints.",
          logic:
            "**What it asks.** Build evenly spaced sequences — one integer range, one float range with exact endpoints.\n\n" +
            "**Key idea.** `arange` is defined by a **step**; `linspace` is defined by a **count** and guarantees the last value equals `stop`.\n\n" +
            "**Step by step.**\n" +
            "1. `np.arange(10)` → 0..9 (stop is exclusive).\n" +
            "2. `np.linspace(0, 1, 5)` → 5 points, endpoints included.\n\n" +
            "**Why it works.** `linspace` computes spacing as `(stop-start)/(n-1)`, so floating-point drift never makes you miss the endpoint the way `arange(0, 1, 0.25)` can.\n\n" +
            "**Gotchas.**\n" +
            "- `np.arange` with a float step can yield an unexpected count due to rounding — prefer `linspace` for floats.\n" +
            "- `arange`'s `stop` is exclusive; `linspace`'s is inclusive.\n\n" +
            "**Interview mindset.** Say: 'step → arange, count → linspace; linspace for anything float because it nails both endpoints.'",
          perfNote: "Both allocate once and fill in C — O(n) with no Python-level loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(10)             # step-based: 0..9, stop exclusive\n" +
            "b = np.linspace(0, 1, 5)      # count-based: 5 points, endpoints included\n" +
            "print(a)\n" +
            "print(b)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(10)\n" +
            "b = np.linspace(0, 1, 5)\n" +
            "print(a)\n" +
            "print(b)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'evenly spaced', 'from a to b', an axis for plotting or sampling.",
        "**Say it:** integer index → `arange`; float interval with exact ends → `linspace(a, b, n)`.",
        "**Trap:** `arange` float steps drift; its stop is exclusive."
      ],
      commonMistakes: [
        "Using `arange(0, 1, 0.1)` and expecting exactly 10 clean values (float step rounding).",
        "Forgetting `arange`'s stop is exclusive while `linspace`'s is inclusive."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "zeros-ones-full-like",
      num: 2,
      title: "Pre-allocate arrays (zeros, ones, full, *_like)",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "essential",
      meta: { pattern: "Pre-allocation", technique: "Constant fills", functions: "np.zeros, np.ones, np.full, np.zeros_like" },
      description:
        "Create constant-filled arrays without a Python loop: a 2×3 array of zeros, a 2×3 array filled with 7, and a zeros array that copies the **shape and dtype** of an existing array using `zeros_like`.",
      notes: [
        "Pass `dtype=` to control the element type (default is float64).",
        "The `*_like` family (`zeros_like`, `ones_like`, `full_like`) mirrors another array's shape and dtype."
      ],
      examples: [
        {
          input: "np.full((2, 3), 7)",
          output: "[[7 7 7]\n [7 7 7]]",
          reasoning: "Every element is set to the fill value 7; shape is (2, 3)."
        }
      ],
      approaches: [
        {
          name: "zeros / full / zeros_like",
          whenToUse: "Any time you need a correctly-shaped buffer to write into, or a constant matrix.",
          logic:
            "**What it asks.** Allocate constant-filled arrays of a given shape, and one that matches another array's shape/dtype.\n\n" +
            "**Key idea.** Shape goes in as a **tuple**; the fill decides the function (`zeros`, `ones`, or `full(shape, value)`).\n\n" +
            "**Step by step.**\n" +
            "1. `np.zeros((2, 3))` → 2×3 float zeros.\n" +
            "2. `np.full((2, 3), 7)` → 2×3 sevens.\n" +
            "3. `np.zeros_like(a)` → zeros with a's shape and dtype.\n\n" +
            "**Why it works.** NumPy allocates the whole block in C and fills it in one pass — far faster than list comprehensions.\n\n" +
            "**Gotchas.**\n" +
            "- Shape must be a tuple: `np.zeros((2, 3))`, not `np.zeros(2, 3)`.\n" +
            "- Default dtype is `float64`; use `dtype=int` for integer buffers.\n" +
            "- `np.empty` is faster but returns **uninitialized** garbage — only use it if you overwrite every element.\n\n" +
            "**Interview mindset.** 'Pre-allocate then fill' beats growing a list; mention `*_like` for shape-matching.",
          perfNote: "O(n) single C-level fill; `np.empty` skips the fill entirely (uninitialized memory).",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "z = np.zeros((2, 3))              # 2x3 floats, all 0.0\n" +
            "f = np.full((2, 3), 7)           # 2x3, all 7\n" +
            "like = np.zeros_like(f)          # same shape & dtype as f, zeroed\n" +
            "print(f)\n" +
            "print(like.shape, like.dtype)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "z = np.zeros((2, 3))\n" +
            "f = np.full((2, 3), 7)\n" +
            "like = np.zeros_like(f)\n" +
            "print(f)\n" +
            "print(like.shape, like.dtype)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'initialize a matrix', 'a buffer to fill', 'same shape as X but zeros'.",
        "**Say it:** `np.zeros(shape)` / `np.full(shape, v)` / `np.zeros_like(a)`; shape is a tuple.",
        "**Trap:** `np.empty` is uninitialized — not zero."
      ],
      commonMistakes: [
        "Writing `np.zeros(2, 3)` instead of `np.zeros((2, 3))`.",
        "Assuming `np.empty` returns zeros."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "identity-and-eye",
      num: 3,
      title: "Build an identity matrix and diagonal array",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "common",
      meta: { pattern: "Special matrices", technique: "Identity / diagonal", functions: "np.eye, np.identity, np.diag" },
      description:
        "Create a 3×3 identity matrix, then build a diagonal matrix whose diagonal is `[1, 2, 3]`. Also show that `np.diag` **extracts** the diagonal when given a 2-D array.",
      examples: [
        {
          input: "np.diag([1, 2, 3])",
          output: "[[1 0 0]\n [0 2 0]\n [0 0 3]]",
          reasoning: "Given a 1-D array, np.diag places it on the main diagonal of a zero matrix."
        }
      ],
      approaches: [
        {
          name: "eye / diag (dual behavior)",
          whenToUse: "Identity for linear algebra; diag to build or read a diagonal.",
          logic:
            "**What it asks.** Make an identity matrix and a custom-diagonal matrix, and extract a diagonal back.\n\n" +
            "**Key idea.** `np.eye(n)` is the n×n identity. `np.diag` is **overloaded**: a 1-D input builds a diagonal matrix; a 2-D input returns its diagonal.\n\n" +
            "**Step by step.**\n" +
            "1. `np.eye(3)` → 3×3 identity.\n" +
            "2. `np.diag([1, 2, 3])` → matrix with that diagonal.\n" +
            "3. `np.diag(M)` → 1-D array of M's diagonal.\n\n" +
            "**Why it works.** `diag` checks the input's ndim to decide which direction to run.\n\n" +
            "**Gotchas.**\n" +
            "- `np.eye` can be non-square with an offset `k`; `np.identity(n)` is always square.\n" +
            "- Remember diag's two modes so you don't double-wrap.\n\n" +
            "**Interview mindset.** 'diag builds from 1-D and extracts from 2-D — same function, dimension decides.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "I = np.eye(3)                    # 3x3 identity\n" +
            "D = np.diag([1, 2, 3])           # 1-D in -> diagonal matrix out\n" +
            "back = np.diag(D)                # 2-D in -> diagonal extracted\n" +
            "print(D)\n" +
            "print(back)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "I = np.eye(3)\n" +
            "D = np.diag([1, 2, 3])\n" +
            "back = np.diag(D)\n" +
            "print(D)\n" +
            "print(back)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'identity', 'diagonal matrix', 'pull the diagonal'.",
        "**Say it:** `np.eye(n)` for identity; `np.diag(v)` builds, `np.diag(M)` extracts.",
        "**Trap:** diag's behavior flips with input dimensionality."
      ],
      commonMistakes: [
        "Calling `np.diag(np.diag(v))` expecting the matrix (the inner call already extracts).",
        "Reaching for a loop to place values on a diagonal instead of `np.diag`."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "reproducible-random",
      num: 4,
      title: "Generate reproducible random data",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "essential",
      meta: { pattern: "Randomness", technique: "Seeded Generator", functions: "np.random.default_rng, rng.random, rng.integers" },
      description:
        "Create random data that is **reproducible** across runs using the modern Generator API. Produce a 2×3 array of floats in [0, 1) and a 1-D array of 5 integers in [0, 10), seeding so the output is identical every run.",
      notes: [
        "`np.random.default_rng(seed)` is the recommended modern API — prefer it over the legacy `np.random.seed` + `np.random.rand`.",
        "`rng.integers(low, high)` has an **exclusive** high bound (unlike the legacy `randint` semantics people misremember)."
      ],
      examples: [
        {
          input: "rng = np.random.default_rng(0); rng.integers(0, 10, size=5)",
          output: "[8 6 5 2 3]",
          reasoning: "Seeding with 0 fixes the stream, so this exact array reproduces every run."
        }
      ],
      approaches: [
        {
          name: "default_rng (modern Generator)",
          whenToUse: "Any time results must reproduce — tests, demos, shareable notebooks.",
          logic:
            "**What it asks.** Draw random floats and integers that reproduce given a seed.\n\n" +
            "**Key idea.** Build **one** seeded `Generator` and draw everything from it, rather than the global legacy state.\n\n" +
            "**Step by step.**\n" +
            "1. `rng = np.random.default_rng(0)`.\n" +
            "2. `rng.random((2, 3))` → floats in [0, 1).\n" +
            "3. `rng.integers(0, 10, size=5)` → ints in [0, 10).\n\n" +
            "**Why it works.** The Generator holds its own bit stream; the same seed replays the same sequence deterministically.\n\n" +
            "**Gotchas.**\n" +
            "- `integers` high bound is exclusive by default (pass `endpoint=True` to include it).\n" +
            "- Don't mix the legacy `np.random.*` global calls with a Generator — pick one.\n\n" +
            "**Interview mindset.** 'Modern NumPy = `default_rng`; seed it once for reproducibility.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "rng = np.random.default_rng(0)   # seeded Generator -> reproducible\n" +
            "floats = rng.random((2, 3))      # floats in [0, 1)\n" +
            "ints = rng.integers(0, 10, size=5)  # ints in [0, 10), high exclusive\n" +
            "print(ints)\n" +
            "print(floats.shape)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "rng = np.random.default_rng(0)\n" +
            "floats = rng.random((2, 3))\n" +
            "ints = rng.integers(0, 10, size=5)\n" +
            "print(ints)\n" +
            "print(floats.shape)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'random but reproducible', 'set a seed', 'same output every run'.",
        "**Say it:** `rng = np.random.default_rng(seed)`, then `rng.random` / `rng.integers`.",
        "**Trap:** `integers` high is exclusive; legacy global RNG isn't the modern way."
      ],
      commonMistakes: [
        "Expecting `rng.integers(0, 10)` to ever return 10.",
        "Using `np.random.rand` with `np.random.seed` in new code instead of a Generator."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "array-from-python-dtype",
      num: 5,
      title: "Convert a Python list and control the dtype",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "common",
      meta: { pattern: "Conversion", technique: "dtype control / casting", functions: "np.array, astype, dtype" },
      description:
        "Turn a nested Python list into a 2-D array, inspect its inferred `dtype` and `shape`, then cast a float array to `int` with `astype` — noting that the cast **truncates** toward zero rather than rounding.",
      examples: [
        {
          input: "np.array([1.9, 2.1, -1.9]).astype(int)",
          output: "[ 1  2 -1]",
          reasoning: "astype(int) truncates toward zero: 1.9→1, 2.1→2, -1.9→-1 (not rounded)."
        }
      ],
      approaches: [
        {
          name: "np.array + astype",
          whenToUse: "Bringing external data into NumPy and pinning a memory-efficient type.",
          logic:
            "**What it asks.** Build an array from a list, read its dtype/shape, and convert types.\n\n" +
            "**Key idea.** `np.array` **infers** the smallest common dtype; `astype` makes a **copy** in the requested dtype.\n\n" +
            "**Step by step.**\n" +
            "1. `a = np.array([[1, 2, 3], [4, 5, 6]])` → int 2×3.\n" +
            "2. Inspect `a.dtype`, `a.shape`.\n" +
            "3. `np.array([1.9, 2.1, -1.9]).astype(int)` → truncated ints.\n\n" +
            "**Why it works.** Inference scans values for a type that holds them all; casting float→int drops the fractional part (truncation, not rounding).\n\n" +
            "**Gotchas.**\n" +
            "- `astype` returns a **new** array; the original is unchanged.\n" +
            "- float→int truncates toward zero — use `np.round` first if you want rounding.\n" +
            "- A list mixing ints and strings becomes an all-string array.\n\n" +
            "**Interview mindset.** 'dtype is inferred; astype copies and truncates on float→int.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])   # inferred int64, shape (2,3)\n" +
            "print(a.dtype, a.shape)\n" +
            "\n" +
            "cast = np.array([1.9, 2.1, -1.9]).astype(int)  # truncates toward 0\n" +
            "print(cast)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(a.dtype, a.shape)\n" +
            "\n" +
            "cast = np.array([1.9, 2.1, -1.9]).astype(int)\n" +
            "print(cast)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'from a list', 'change the type', 'as integers/floats'.",
        "**Say it:** `np.array(data)` infers dtype; `arr.astype(t)` copies to type t.",
        "**Trap:** float→int truncates; astype does not mutate in place."
      ],
      commonMistakes: [
        "Expecting `astype(int)` to round (it truncates toward zero).",
        "Assuming `astype` modifies the array in place."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "meshgrid-coordinates",
      num: 6,
      title: "Build a coordinate grid with meshgrid",
      difficulty: "Medium",
      category: "Array Creation & Basics",
      importance: "common",
      meta: { pattern: "Coordinate grids", technique: "meshgrid", functions: "np.meshgrid, np.arange" },
      description:
        "Given 1-D x and y axes, produce the 2-D coordinate matrices needed to evaluate a function `f(x, y)` over every grid point — e.g. compute `X + Y` for x in `[0,1,2]` and y in `[0,10]` without any Python loops.",
      notes: [
        "`np.meshgrid(x, y)` returns `X, Y` each of shape `(len(y), len(x))` in the default 'xy' indexing.",
        "Combined with broadcasting, meshgrid evaluates surfaces/heatmaps vectorized."
      ],
      examples: [
        {
          input: "X, Y = np.meshgrid([0,1,2], [0,10]); X + Y",
          output: "[[ 0  1  2]\n [10 11 12]]",
          reasoning: "Row 0 adds y=0 to each x; row 1 adds y=10 — every (x,y) pair in one array."
        }
      ],
      approaches: [
        {
          name: "meshgrid + vectorized expression",
          whenToUse: "Evaluating a 2-variable function over a grid (surfaces, heatmaps, distance fields).",
          logic:
            "**What it asks.** Evaluate an expression at every (x, y) pair without looping.\n\n" +
            "**Key idea.** `meshgrid` expands two 1-D axes into two 2-D grids of matching shape; element-wise ops then cover all pairs.\n\n" +
            "**Step by step.**\n" +
            "1. Define axes `x`, `y`.\n" +
            "2. `X, Y = np.meshgrid(x, y)`.\n" +
            "3. Compute the vectorized expression, e.g. `X + Y`.\n\n" +
            "**Why it works.** After meshgrid, `X` and `Y` align position-for-position, so any element-wise formula is evaluated at every grid point at once.\n\n" +
            "**Gotchas.**\n" +
            "- Default `indexing='xy'` gives shape `(len(y), len(x))`; use `indexing='ij'` for matrix-style.\n" +
            "- For big grids, `sparse=True` saves memory (broadcasting fills in the rest).\n\n" +
            "**Interview mindset.** 'meshgrid + broadcasting replaces a double for-loop over coordinates.'",
          perfNote: "Dense meshgrid materializes len(x)*len(y) elements per grid; `sparse=True` keeps them 1-D and lets broadcasting expand lazily.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([0, 1, 2])\n" +
            "y = np.array([0, 10])\n" +
            "X, Y = np.meshgrid(x, y)         # each shape (len(y), len(x)) = (2, 3)\n" +
            "print(X + Y)                     # f(x, y) at every grid point",
          plain:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([0, 1, 2])\n" +
            "y = np.array([0, 10])\n" +
            "X, Y = np.meshgrid(x, y)\n" +
            "print(X + Y)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'evaluate over a grid', 'every (x, y) pair', 'surface/heatmap'.",
        "**Say it:** `X, Y = np.meshgrid(x, y)`, then a vectorized expression in X and Y.",
        "**Trap:** default 'xy' shape is `(len(y), len(x))`."
      ],
      commonMistakes: [
        "Confusing 'xy' vs 'ij' indexing and getting transposed grids.",
        "Looping over coordinates instead of broadcasting the grids."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "inspect-array-attributes",
      num: 7,
      title: "Inspect shape, ndim, size, dtype, itemsize",
      difficulty: "Easy",
      category: "Array Creation & Basics",
      importance: "common",
      meta: { pattern: "Introspection", technique: "Array attributes", functions: "ndim, shape, size, dtype, itemsize, nbytes" },
      description:
        "Given an array, read its core attributes: number of dimensions (`ndim`), the `shape` tuple, total element count (`size`), element type (`dtype`), bytes per element (`itemsize`), and total memory (`nbytes`).",
      notes: [
        "These are **attributes**, not methods — no parentheses (`a.shape`, not `a.shape()`).",
        "`nbytes == size * itemsize` — a quick memory estimate."
      ],
      examples: [
        {
          input: "a = np.arange(6, dtype=np.int32).reshape(2, 3)",
          output: "ndim=2 shape=(2, 3) size=6 dtype=int32 itemsize=4 nbytes=24",
          reasoning: "6 int32 elements × 4 bytes each = 24 bytes; 2 rows × 3 cols."
        }
      ],
      approaches: [
        {
          name: "read the attribute set",
          whenToUse: "Debugging shape mismatches and estimating memory before scaling up.",
          logic:
            "**What it asks.** Report the standard descriptive attributes of an ndarray.\n\n" +
            "**Key idea.** Every ndarray carries metadata separate from its data buffer — read it directly.\n\n" +
            "**Step by step.**\n" +
            "1. Build an array with a known dtype and shape.\n" +
            "2. Print `ndim`, `shape`, `size`, `dtype`, `itemsize`, `nbytes`.\n\n" +
            "**Why it works.** These are precomputed properties of the array object, so access is O(1).\n\n" +
            "**Gotchas.**\n" +
            "- `len(a)` returns only the **first** axis length, not the total — use `a.size`.\n" +
            "- Attributes take no parentheses.\n\n" +
            "**Interview mindset.** 'shape/ndim/dtype are the first things I print when a broadcast or reshape misbehaves.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(6, dtype=np.int32).reshape(2, 3)\n" +
            "print('ndim', a.ndim, 'shape', a.shape, 'size', a.size)\n" +
            "print('dtype', a.dtype, 'itemsize', a.itemsize, 'nbytes', a.nbytes)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(6, dtype=np.int32).reshape(2, 3)\n" +
            "print(a.ndim, a.shape, a.size)\n" +
            "print(a.dtype, a.itemsize, a.nbytes)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many dimensions', 'how much memory', 'what type'.",
        "**Say it:** `a.ndim / a.shape / a.size / a.dtype / a.itemsize / a.nbytes`.",
        "**Trap:** `len(a)` is only the first-axis length; attributes have no parentheses."
      ],
      commonMistakes: [
        "Using `len(a)` as the total element count instead of `a.size`.",
        "Writing `a.shape()` — shape is an attribute, not a method."
      ]
    }

  ]);
})();
