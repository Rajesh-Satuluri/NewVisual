/*
 * NumPy Interview Lab — Reshaping & Combining
 * =========================================================================
 * Registers on the global registry:
 *     window.NUMPY.register("Reshaping & Combining", [ ...problems ]);
 *
 * See data/numpy/problems_arrays_creation.js for the full PROBLEM SCHEMA and
 * the LOGIC bold-lead-in format. Every rcs/plain snippet is self-contained
 * runnable NumPy (starts with `import numpy as np`), prints output, and was
 * executed against NumPy 2.4.6 before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Reshaping & Combining", [

    // ------------------------------------------------------------------ Q1
    {
      id: "reshape-inferred-dimension",
      num: 1,
      title: "Reshape with an inferred (-1) dimension",
      difficulty: "Easy",
      category: "Reshaping & Combining",
      importance: "essential",
      meta: { pattern: "Reshape", technique: "-1 inferred dim", functions: "reshape, np.reshape" },
      description:
        "Change an array's shape without changing its data. Take a flat array of 12 elements and view it as a `(3, 4)` matrix, then let NumPy infer one dimension with `-1` — e.g. `reshape(4, -1)` — so you only spell out the axis you care about.",
      notes: [
        "The total number of elements must stay constant: `3*4 == 12`.",
        "Exactly **one** axis may be `-1`; NumPy solves for it from the remaining sizes."
      ],
      examples: [
        {
          input: "np.arange(12).reshape(4, -1)",
          output: "shape (4, 3)",
          reasoning: "12 elements with 4 rows forces 3 columns, so -1 resolves to 3."
        }
      ],
      approaches: [
        {
          name: "reshape with -1",
          whenToUse: "Whenever you know all but one dimension and want NumPy to compute the rest.",
          logic:
            "**What it asks.** Reinterpret a flat buffer as a 2-D grid, spelling out one axis and inferring the other.\n\n" +
            "**Key idea.** `reshape` keeps the data and reindexes it; passing `-1` for one axis tells NumPy to solve `size / (other dims)` for you.\n\n" +
            "**Step by step.**\n" +
            "1. `a = np.arange(12)` → 12 elements.\n" +
            "2. `a.reshape(3, 4)` → explicit 3×4.\n" +
            "3. `a.reshape(4, -1)` → 4 rows, columns inferred as 3.\n\n" +
            "**Why it works.** Element count is fixed, so once you fix all but one axis the last one is determined; `-1` just asks NumPy to do that division.\n\n" +
            "**Gotchas.**\n" +
            "- The product of the given dimensions must divide the size evenly, or you get a ValueError.\n" +
            "- Only one axis can be `-1`; two `-1`s are ambiguous and rejected.\n" +
            "- `reshape` returns a **view** when it can, so writes may propagate to the original.\n\n" +
            "**Interview mindset.** 'Fix the axes I know, let -1 fill in the rest — same data, new shape.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(12)                # flat: 0..11\n" +
            "grid = a.reshape(3, 4)           # explicit 3x4\n" +
            "auto = a.reshape(4, -1)          # -1 -> columns inferred as 3\n" +
            "print(grid)\n" +
            "print(auto.shape)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(12)\n" +
            "grid = a.reshape(3, 4)\n" +
            "auto = a.reshape(4, -1)\n" +
            "print(grid)\n" +
            "print(auto.shape)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'flatten into rows', 'make it N columns', 'batch of vectors'.",
        "**Say it:** `a.reshape(rows, -1)` — spell one axis, infer the other with -1.",
        "**Trap:** the count must divide evenly; only one -1 allowed."
      ],
      commonMistakes: [
        "Using two `-1` dimensions (ambiguous — NumPy rejects it).",
        "Reshaping to a shape whose product doesn't equal the element count."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "ravel-vs-flatten",
      num: 2,
      title: "Flatten to 1-D: ravel vs flatten (view vs copy)",
      difficulty: "Medium",
      category: "Reshaping & Combining",
      importance: "essential",
      meta: { pattern: "Flatten", technique: "View vs copy", functions: "ravel, flatten, np.shares_memory" },
      description:
        "Collapse a 2-D array into 1-D two ways and understand the key difference: `flatten()` **always returns a copy**, while `ravel()` returns a **view when it can** (falling back to a copy only when a contiguous view is impossible). Writing through a ravel view can therefore change the original.",
      notes: [
        "`flatten()` is a method only (arrays), and always copies.",
        "`ravel()` prefers a view; it copies when the data isn't contiguous (e.g. after a transpose)."
      ],
      examples: [
        {
          input: "m = np.arange(6).reshape(2,3); r = m.ravel(); r[0] = 99",
          output: "m[0,0] becomes 99 (ravel shared memory)",
          reasoning: "ravel returned a view, so mutating r wrote back into m; flatten would not."
        }
      ],
      approaches: [
        {
          name: "ravel (view) vs flatten (copy)",
          whenToUse: "ravel when you want a cheap 1-D handle on the same data; flatten when you need an independent copy.",
          logic:
            "**What it asks.** Produce a 1-D version of a 2-D array, and show that ravel may alias the original while flatten never does.\n\n" +
            "**Key idea.** `flatten` always allocates new memory; `ravel` returns a **view** onto the same buffer whenever the layout allows, so writes leak back.\n\n" +
            "**Step by step.**\n" +
            "1. `m = np.arange(6).reshape(2, 3)`.\n" +
            "2. `r = m.ravel()` (view), `f = m.flatten()` (copy).\n" +
            "3. Confirm with `np.shares_memory`: True for r, False for f.\n" +
            "4. Set `r[0] = 99` → `m` changes; `f` stays untouched.\n\n" +
            "**Why it works.** A contiguous C-order array can be relabeled as 1-D with no data move, so ravel just returns a view; flatten's contract is a fresh independent array.\n\n" +
            "**Gotchas.**\n" +
            "- ravel of a **non-contiguous** array (e.g. `m.T`) is forced to copy — don't rely on it always aliasing.\n" +
            "- If you need a guaranteed-independent 1-D array, use `flatten()` (or `ravel().copy()`).\n" +
            "- `flatten` is an ndarray method; there is no `np.flatten` free function (use `np.ravel`).\n\n" +
            "**Interview mindset.** 'flatten = always copy, ravel = view when possible — reach for ravel to save memory, flatten to stay safe.'",
          perfNote: "ravel is O(1) when it returns a view (no data movement); flatten is always O(n) because it copies.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "m = np.arange(6).reshape(2, 3)\n" +
            "r = m.ravel()                    # view when possible\n" +
            "f = m.flatten()                  # always a copy\n" +
            "print(np.shares_memory(m, r))    # True  -> ravel aliased m\n" +
            "print(np.shares_memory(m, f))    # False -> flatten is independent\n" +
            "r[0] = 99                        # writes through the view...\n" +
            "print(m[0, 0])                   # ...so m changed: 99\n" +
            "print(f)                         # copy untouched: [0 1 2 3 4 5]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "m = np.arange(6).reshape(2, 3)\n" +
            "r = m.ravel()\n" +
            "f = m.flatten()\n" +
            "print(np.shares_memory(m, r))\n" +
            "print(np.shares_memory(m, f))\n" +
            "r[0] = 99\n" +
            "print(m[0, 0])\n" +
            "print(f)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'flatten to 1-D', 'why did the original change?', 'copy or view?'.",
        "**Say it:** `flatten()` always copies; `ravel()` gives a view when the data is contiguous.",
        "**Trap:** ravel of a transposed/non-contiguous array copies — aliasing is not guaranteed."
      ],
      commonMistakes: [
        "Assuming `ravel()` always returns a view (it copies for non-contiguous data).",
        "Mutating a `ravel()` result and being surprised the source array changed."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "transpose-and-swapaxes",
      num: 3,
      title: "Transpose (.T) and swap arbitrary axes",
      difficulty: "Medium",
      category: "Reshaping & Combining",
      importance: "common",
      meta: { pattern: "Axis reorder", technique: "Transpose / swapaxes", functions: ".T, np.transpose, np.swapaxes" },
      description:
        "Reorder an array's axes without moving data. Use `.T` to transpose a 2-D matrix (rows become columns), then use `np.swapaxes` to exchange two specific axes of a 3-D array when a plain `.T` (which reverses *all* axes) is too blunt.",
      notes: [
        "For 2-D, `.T` swaps the two axes; for N-D, `.T` reverses the entire axis order.",
        "`np.swapaxes(a, i, j)` exchanges exactly axes i and j; both return views (no copy)."
      ],
      examples: [
        {
          input: "np.arange(6).reshape(2,3).T",
          output: "[[0 3]\n [1 4]\n [2 5]]",
          reasoning: "A (2,3) matrix transposes to (3,2): element [i,j] moves to [j,i]."
        },
        {
          input: "np.swapaxes(np.arange(24).reshape(2,3,4), 0, 2).shape",
          output: "(4, 3, 2)",
          reasoning: "Swapping axes 0 and 2 exchanges the first and last dimension lengths."
        }
      ],
      approaches: [
        {
          name: ".T for 2-D, swapaxes for targeted N-D",
          whenToUse: ".T for quick matrix transpose; swapaxes when you must move only two named axes of a higher-D array.",
          logic:
            "**What it asks.** Transpose a matrix, then swap two chosen axes of a 3-D array.\n\n" +
            "**Key idea.** Transposing relabels how indices map to memory — no elements move. `.T` reverses all axes; `swapaxes(i, j)` touches only two.\n\n" +
            "**Step by step.**\n" +
            "1. `M = np.arange(6).reshape(2, 3)`; `M.T` → shape (3, 2).\n" +
            "2. `A = np.arange(24).reshape(2, 3, 4)`.\n" +
            "3. `np.swapaxes(A, 0, 2)` → shape (4, 3, 2), leaving axis 1 in place.\n\n" +
            "**Why it works.** NumPy stores data once and describes it with strides; transposing just permutes the strides, so it's an O(1) view.\n\n" +
            "**Gotchas.**\n" +
            "- On a 3-D array, `.T` reverses **all** axes — use `swapaxes` (or `transpose(order)`) to move just two.\n" +
            "- The result is a view and often **non-contiguous**; a later `ravel` may then copy.\n\n" +
            "**Interview mindset.** 'Transpose permutes strides, not data; .T for matrices, swapaxes when I need surgical axis control.'",
          perfNote: "Both are O(1) view operations — only the stride/shape metadata changes, no data is copied.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "M = np.arange(6).reshape(2, 3)\n" +
            "print(M.T)                       # (2,3) -> (3,2)\n" +
            "A = np.arange(24).reshape(2, 3, 4)\n" +
            "print(np.swapaxes(A, 0, 2).shape)  # swap only axes 0 and 2 -> (4, 3, 2)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "M = np.arange(6).reshape(2, 3)\n" +
            "print(M.T)\n" +
            "A = np.arange(24).reshape(2, 3, 4)\n" +
            "print(np.swapaxes(A, 0, 2).shape)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'rows to columns', 'move the channel axis', 'reorder dimensions'.",
        "**Say it:** `.T` transposes; `np.swapaxes(a, i, j)` exchanges exactly two axes.",
        "**Trap:** on N-D, `.T` reverses every axis; the result is a non-contiguous view."
      ],
      commonMistakes: [
        "Expecting `.T` on a 3-D array to swap just two axes (it reverses all of them).",
        "Assuming the transposed view is contiguous when it usually is not."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "vstack-hstack-concatenate",
      num: 4,
      title: "Combine arrays with vstack, hstack, and concatenate(axis=)",
      difficulty: "Easy",
      category: "Reshaping & Combining",
      importance: "essential",
      meta: { pattern: "Join", technique: "Stack along existing axis", functions: "np.vstack, np.hstack, np.concatenate" },
      description:
        "Join arrays along an existing axis. Stack two 2×2 matrices vertically with `np.vstack` and horizontally with `np.hstack`, then reproduce both with the general `np.concatenate(..., axis=)` to see that vstack is `axis=0` and hstack is `axis=1`.",
      notes: [
        "`vstack` ≈ `concatenate(axis=0)` (rows), `hstack` ≈ `concatenate(axis=1)` (columns) for 2-D input.",
        "All axes **except** the join axis must match in size."
      ],
      examples: [
        {
          input: "np.vstack([[[1,2],[3,4]], [[5,6],[7,8]]])",
          output: "[[1 2]\n [3 4]\n [5 6]\n [7 8]]",
          reasoning: "Vertical stack appends rows → shape grows from (2,2)+(2,2) to (4,2)."
        }
      ],
      approaches: [
        {
          name: "vstack / hstack vs concatenate(axis=)",
          whenToUse: "vstack/hstack for readable 2-D joins; concatenate when you need to name the axis explicitly (incl. higher-D).",
          logic:
            "**What it asks.** Join matrices vertically and horizontally, and express both with the general concatenate.\n\n" +
            "**Key idea.** These all glue arrays along an **existing** axis (ndim stays the same); vstack/hstack are just named shortcuts for `concatenate` with a fixed axis.\n\n" +
            "**Step by step.**\n" +
            "1. `np.vstack([a, b])` → rows appended (axis 0).\n" +
            "2. `np.hstack([a, b])` → columns appended (axis 1).\n" +
            "3. `np.concatenate([a, b], axis=0)` and `axis=1` reproduce them.\n\n" +
            "**Why it works.** concatenate copies the inputs side by side along one axis; the other axes must already agree in length.\n\n" +
            "**Gotchas.**\n" +
            "- Every non-join axis must match, or you get a dimension-mismatch error.\n" +
            "- For **1-D** inputs `hstack` joins end-to-end while `vstack` promotes to 2-D rows — behavior differs from the 2-D case.\n" +
            "- The arrays go in a **list/tuple** as the first argument.\n\n" +
            "**Interview mindset.** 'Same-ndim join along an existing axis: vstack=axis0, hstack=axis1, concatenate when I want to say the axis out loud.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2], [3, 4]])\n" +
            "b = np.array([[5, 6], [7, 8]])\n" +
            "print(np.vstack([a, b]))         # rows -> (4, 2)\n" +
            "print(np.hstack([a, b]))         # cols -> (2, 4)\n" +
            "print(np.concatenate([a, b], axis=0).shape)  # (4, 2), same as vstack\n" +
            "print(np.concatenate([a, b], axis=1).shape)  # (2, 4), same as hstack",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2], [3, 4]])\n" +
            "b = np.array([[5, 6], [7, 8]])\n" +
            "print(np.vstack([a, b]))\n" +
            "print(np.hstack([a, b]))\n" +
            "print(np.concatenate([a, b], axis=0).shape)\n" +
            "print(np.concatenate([a, b], axis=1).shape)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'stack these matrices', 'append rows/columns', 'combine along an axis'.",
        "**Say it:** vstack=`concatenate(axis=0)`, hstack=`concatenate(axis=1)`; pass arrays as a list.",
        "**Trap:** all non-join axes must match; 1-D hstack/vstack behave differently than 2-D."
      ],
      commonMistakes: [
        "Passing arrays as separate args instead of a list: `np.vstack(a, b)`.",
        "Trying to join along an axis where the other dimensions don't match."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "stack-new-axis-vs-concatenate",
      num: 5,
      title: "np.stack adds a NEW axis vs concatenate joins an existing one",
      difficulty: "Medium",
      category: "Reshaping & Combining",
      importance: "essential",
      meta: { pattern: "Join", technique: "New axis vs existing axis", functions: "np.stack, np.concatenate" },
      description:
        "Contrast the two joiners. Given two 1-D arrays of length 3, `np.concatenate` glues them into one longer 1-D array (shape `(6,)`), while `np.stack` introduces a **new** axis to build a 2-D array (shape `(2, 3)`), letting you choose where the new axis goes via `axis=`.",
      notes: [
        "`concatenate` keeps ndim the same; `stack` increases ndim by one.",
        "`np.stack([u, v])` → shape `(2, 3)`; `np.stack([u, v], axis=1)` → shape `(3, 2)`."
      ],
      examples: [
        {
          input: "np.stack([[1,2,3], [4,5,6]])",
          output: "[[1 2 3]\n [4 5 6]]  (shape (2, 3))",
          reasoning: "stack introduces a leading axis of length 2, so each input becomes a row."
        },
        {
          input: "np.concatenate([[1,2,3], [4,5,6]])",
          output: "[1 2 3 4 5 6]  (shape (6,))",
          reasoning: "concatenate joins along the existing axis 0, staying 1-D."
        }
      ],
      approaches: [
        {
          name: "stack (new axis) vs concatenate (existing axis)",
          whenToUse: "stack to build a batch/extra dimension from equal-shaped pieces; concatenate to lengthen along an axis you already have.",
          logic:
            "**What it asks.** Show that stacking two 1-D arrays creates a 2-D array while concatenating keeps them 1-D.\n\n" +
            "**Key idea.** `stack` **adds** a dimension (all inputs must share the exact same shape); `concatenate` extends an **existing** dimension.\n\n" +
            "**Step by step.**\n" +
            "1. `u, v` are 1-D, length 3.\n" +
            "2. `np.stack([u, v])` → (2, 3): a new axis 0 of length 2.\n" +
            "3. `np.stack([u, v], axis=1)` → (3, 2): the new axis goes last.\n" +
            "4. `np.concatenate([u, v])` → (6,): still 1-D.\n\n" +
            "**Why it works.** stack first inserts a length-1 axis into each input, then concatenates along it — netting a brand-new dimension of length = number of inputs.\n\n" +
            "**Gotchas.**\n" +
            "- `stack` requires **identical** input shapes; concatenate only needs the non-join axes to match.\n" +
            "- Picture the target ndim first: adding a dimension → stack; growing one → concatenate.\n\n" +
            "**Interview mindset.** 'New axis → stack; longer existing axis → concatenate. That one sentence answers most join questions.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "u = np.array([1, 2, 3])\n" +
            "v = np.array([4, 5, 6])\n" +
            "print(np.stack([u, v]).shape)        # new axis -> (2, 3)\n" +
            "print(np.stack([u, v], axis=1).shape)  # new axis last -> (3, 2)\n" +
            "print(np.concatenate([u, v]).shape)  # existing axis -> (6,)\n" +
            "print(np.concatenate([u, v]))        # [1 2 3 4 5 6]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "u = np.array([1, 2, 3])\n" +
            "v = np.array([4, 5, 6])\n" +
            "print(np.stack([u, v]).shape)\n" +
            "print(np.stack([u, v], axis=1).shape)\n" +
            "print(np.concatenate([u, v]).shape)\n" +
            "print(np.concatenate([u, v]))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'make a batch from these vectors', 'add a dimension' vs 'just make it longer'.",
        "**Say it:** `np.stack` adds a new axis (inputs must match shape); `np.concatenate` extends an existing axis.",
        "**Trap:** stack needs identical shapes; check whether the target ndim grows."
      ],
      commonMistakes: [
        "Using `concatenate` when you actually wanted a new batch dimension (reach for `stack`).",
        "Calling `stack` on differently-shaped inputs (it requires identical shapes)."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "split-array-split",
      num: 6,
      title: "Split an array into chunks (split vs array_split)",
      difficulty: "Easy",
      category: "Reshaping & Combining",
      importance: "common",
      meta: { pattern: "Split", technique: "Even vs uneven chunks", functions: "np.split, np.array_split" },
      description:
        "Break one array into several. `np.split(a, n)` divides into `n` **equal** parts and errors if it doesn't divide evenly; `np.array_split(a, n)` is the forgiving version that allows uneven sizes, making the earlier chunks one element larger.",
      notes: [
        "Both return a **list** of sub-arrays (views into the original).",
        "`np.split` raises if `n` doesn't divide the length; `np.array_split` never raises for a count."
      ],
      examples: [
        {
          input: "np.split(np.arange(9), 3)",
          output: "[array([0,1,2]), array([3,4,5]), array([6,7,8])]",
          reasoning: "9 divides evenly by 3 → three equal chunks of length 3."
        },
        {
          input: "np.array_split(np.arange(10), 3)",
          output: "[array([0,1,2,3]), array([4,5,6]), array([7,8,9])]",
          reasoning: "10 into 3 can't be even, so array_split makes the first chunk size 4."
        }
      ],
      approaches: [
        {
          name: "split (even) vs array_split (uneven-safe)",
          whenToUse: "split when the length divides cleanly and you want the safety of an error otherwise; array_split when leftovers are fine.",
          logic:
            "**What it asks.** Cut an array into n chunks, handling both the even and uneven cases.\n\n" +
            "**Key idea.** `split` demands an exact division; `array_split` tolerates a remainder by front-loading the extra elements.\n\n" +
            "**Step by step.**\n" +
            "1. `np.split(np.arange(9), 3)` → three equal length-3 chunks.\n" +
            "2. `np.array_split(np.arange(10), 3)` → sizes 4, 3, 3.\n" +
            "3. Both give a Python list of sub-arrays.\n\n" +
            "**Why it works.** array_split spreads the remainder `r` across the first `r` chunks (each +1), guaranteeing it always succeeds for any count.\n\n" +
            "**Gotchas.**\n" +
            "- `np.split(arange(10), 3)` raises a ValueError — reach for `array_split` when evenness isn't guaranteed.\n" +
            "- The results are **views**; mutating a chunk edits the source array.\n" +
            "- Pass a list of indices instead of a count to split at specific cut points: `np.split(a, [2, 5])`.\n\n" +
            "**Interview mindset.** 'Even, must-be-exact → split; any count, uneven OK → array_split.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "even = np.split(np.arange(9), 3)        # 9/3 exact -> equal chunks\n" +
            "uneven = np.array_split(np.arange(10), 3)  # 10/3 -> sizes 4,3,3\n" +
            "print([p.tolist() for p in even])\n" +
            "print([p.tolist() for p in uneven])",
          plain:
            "import numpy as np\n" +
            "\n" +
            "even = np.split(np.arange(9), 3)\n" +
            "uneven = np.array_split(np.arange(10), 3)\n" +
            "print([p.tolist() for p in even])\n" +
            "print([p.tolist() for p in uneven])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'break into n batches', 'chunk the array', 'partition rows'.",
        "**Say it:** `np.split(a, n)` for exact division; `np.array_split(a, n)` for uneven-safe chunks.",
        "**Trap:** `split` raises when n doesn't divide; results are views, not copies."
      ],
      commonMistakes: [
        "Using `np.split` when the length may not divide evenly (use `np.array_split`).",
        "Forgetting the chunks are views, so editing one changes the original array."
      ]
    }

  ]);
})();
