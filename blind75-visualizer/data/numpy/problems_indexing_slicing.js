/*
 * NumPy Interview Lab — Indexing & Slicing
 * =========================================================================
 * Registers on the global registry:
 *     window.NUMPY.register("Indexing & Slicing", [ ...problems ]);
 *
 * See data/numpy/problems_arrays_creation.js for the full SCHEMA and LOGIC
 * format reference. Every rcs/plain snippet here is self-contained runnable
 * NumPy (starts with `import numpy as np`) and prints its output, and every
 * example output was executed against NumPy 2.4.6 before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Indexing & Slicing", [

    // ------------------------------------------------------------------ Q1
    {
      id: "integer-and-negative-indexing",
      num: 1,
      title: "Index with positive and negative positions",
      difficulty: "Easy",
      category: "Indexing & Slicing",
      importance: "essential",
      meta: { pattern: "Element access", technique: "Integer / negative index", functions: "[i], [-i]" },
      description:
        "Read single elements out of a 1-D array by position. Grab the first element with index `0`, the last with `-1`, and the second-to-last with `-2` — negative indices count backward from the end.",
      notes: [
        "Indexing is 0-based: the first element is `a[0]`, not `a[1]`.",
        "`a[-1]` is the last element; `a[-k]` is the k-th from the end — no need to compute `len(a) - k`."
      ],
      examples: [
        {
          input: "a = np.array([10, 20, 30, 40, 50]); a[-2]",
          output: "40",
          reasoning: "-1 is the last (50), so -2 is the second-to-last, 40."
        }
      ],
      approaches: [
        {
          name: "positive & negative integer index",
          whenToUse: "Any time you need one element by its position, especially the last few without knowing the length.",
          logic:
            "**What it asks.** Pull individual elements by position, from the front and from the back.\n\n" +
            "**Key idea.** A non-negative index counts from the start (0-based); a negative index counts from the end, with `-1` being the last.\n\n" +
            "**Step by step.**\n" +
            "1. `a[0]` → first element.\n" +
            "2. `a[-1]` → last element.\n" +
            "3. `a[-2]` → second from the end.\n\n" +
            "**Why it works.** NumPy maps a negative index `i` to `len(a) + i` internally, so the end is always addressable without computing the length yourself.\n\n" +
            "**Gotchas.**\n" +
            "- An out-of-range integer index raises `IndexError` (unlike a slice, which just clips).\n" +
            "- Indexing a scalar out returns a NumPy scalar, not a 0-length array.\n\n" +
            "**Interview mindset.** '0-based from the front, `-1` from the back — negative indices save a `len()` call.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([10, 20, 30, 40, 50])\n" +
            "print(a[0])    # first element -> 10\n" +
            "print(a[-1])   # last element  -> 50\n" +
            "print(a[-2])   # second from end -> 40",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([10, 20, 30, 40, 50])\n" +
            "print(a[0])\n" +
            "print(a[-1])\n" +
            "print(a[-2])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'the first/last element', 'count from the end'.",
        "**Say it:** `a[0]` front, `a[-1]` back, `a[-k]` is k-th from the end.",
        "**Trap:** out-of-range integer indexing raises, unlike slicing."
      ],
      commonMistakes: [
        "Using `a[len(a)-1]` when `a[-1]` is clearer and shorter.",
        "Expecting an out-of-range index to clip instead of raising IndexError."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "one-d-slicing-step-reverse",
      num: 2,
      title: "Slice a 1-D array with start:stop:step (and reverse it)",
      difficulty: "Easy",
      category: "Indexing & Slicing",
      importance: "essential",
      meta: { pattern: "Slicing", technique: "start:stop:step", functions: "[a:b], [::2], [::-1]" },
      description:
        "Take contiguous and strided sub-ranges of a 1-D array using `start:stop:step`. Extract a middle chunk `a[2:5]`, every other element `a[::2]`, and the whole array reversed with the idiom `a[::-1]`.",
      notes: [
        "`stop` is **exclusive**, just like Python list slicing.",
        "Omitted parts default to start=0, stop=len, step=1; a negative step walks backward."
      ],
      examples: [
        {
          input: "a = np.arange(10); a[2:5]",
          output: "[2 3 4]",
          reasoning: "Indices 2, 3, 4 — index 5 is excluded because stop is exclusive."
        },
        {
          input: "np.arange(10)[::-1]",
          output: "[9 8 7 6 5 4 3 2 1 0]",
          reasoning: "step = -1 walks from the end to the start, reversing the array."
        }
      ],
      approaches: [
        {
          name: "start:stop:step slicing",
          whenToUse: "Selecting a contiguous window, downsampling with a stride, or reversing an axis.",
          logic:
            "**What it asks.** Produce sub-arrays with a slice: a window, a strided pick, and a full reversal.\n\n" +
            "**Key idea.** The slice `start:stop:step` selects indices `start, start+step, ...` up to but **not including** `stop`; a negative step reverses direction.\n\n" +
            "**Step by step.**\n" +
            "1. `a[2:5]` → indices 2..4.\n" +
            "2. `a[::2]` → every second element from the start.\n" +
            "3. `a[::-1]` → the whole array reversed.\n\n" +
            "**Why it works.** NumPy fills in the omitted defaults (0, len, 1) per axis, then strides through the buffer — no data is copied, you get a view.\n\n" +
            "**Gotchas.**\n" +
            "- `stop` is exclusive; `a[2:5]` yields three elements, not four.\n" +
            "- Out-of-range bounds are clipped silently (no error), unlike integer indexing.\n" +
            "- `a[::-1]` is a view with negative stride, not a fresh reversed copy.\n\n" +
            "**Interview mindset.** '`start:stop:step`, stop exclusive; `[::-1]` is the reverse idiom.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(10)\n" +
            "print(a[2:5])   # window: indices 2,3,4 (stop exclusive)\n" +
            "print(a[::2])   # stride 2: every other element\n" +
            "print(a[::-1])  # reverse the whole array",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(10)\n" +
            "print(a[2:5])\n" +
            "print(a[::2])\n" +
            "print(a[::-1])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'a range of elements', 'every other', 'reverse it'.",
        "**Say it:** `a[start:stop:step]`, stop exclusive; `a[::-1]` reverses.",
        "**Trap:** slice bounds clip silently; a slice is a view, not a copy."
      ],
      commonMistakes: [
        "Expecting `a[2:5]` to include index 5 (stop is exclusive).",
        "Thinking `a[::-1]` allocates a reversed copy (it's a strided view)."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "two-d-indexing-comma-vs-chained",
      num: 3,
      title: "2-D indexing: a[i, j] vs a[i][j]",
      difficulty: "Easy",
      category: "Indexing & Slicing",
      importance: "essential",
      meta: { pattern: "Multi-axis access", technique: "Tuple index", functions: "[i, j], [i][j]" },
      description:
        "Read one element from a 2-D array. Prefer the single tuple index `a[i, j]` over the chained `a[i][j]`: both return the same scalar here, but the tuple form is one operation while the chained form builds an intermediate row array first.",
      notes: [
        "`a[i, j]` passes the tuple `(i, j)` in one indexing operation — the idiomatic NumPy way.",
        "`a[i][j]` first materializes row `i` (a view), then indexes it — an extra step that also breaks down for fancy/boolean multi-axis indexing."
      ],
      examples: [
        {
          input: "a = np.array([[1,2,3],[4,5,6]]); a[1, 2]",
          output: "6",
          reasoning: "Row 1, column 2 (both 0-based) is the last element of the second row."
        }
      ],
      approaches: [
        {
          name: "tuple index vs chained index",
          whenToUse: "Reach for `a[i, j]` always for element access; only chain when you deliberately want the intermediate row.",
          logic:
            "**What it asks.** Access a single cell of a matrix and understand the two syntaxes.\n\n" +
            "**Key idea.** `a[i, j]` is one lookup with a coordinate tuple; `a[i][j]` is two lookups — grab the row, then index into it.\n\n" +
            "**Step by step.**\n" +
            "1. `a[1, 2]` → row 1, col 2 in a single operation.\n" +
            "2. `a[1][2]` → same value via an intermediate row view.\n\n" +
            "**Why it works.** NumPy interprets a comma-separated index as a tuple of per-axis selectors, resolving all axes at once against the strided buffer.\n\n" +
            "**Gotchas.**\n" +
            "- For plain integers both give the same scalar, but `a[i][j]` is slower (extra view) and cannot express things like `a[[0,1], [2,0]]` (fancy indexing across axes).\n" +
            "- Column selection needs the tuple form: `a[:, j]`, not `a[:][j]`.\n\n" +
            "**Interview mindset.** 'Comma indexing addresses all axes at once — `a[i, j]`, never `a[i][j]`.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(a[1, 2])   # tuple index: row 1, col 2 -> 6\n" +
            "print(a[1][2])   # chained: row 1 view, then col 2 -> 6 (extra step)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(a[1, 2])\n" +
            "print(a[1][2])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'element at row i, column j' in a matrix.",
        "**Say it:** `a[i, j]` — one tuple index across all axes.",
        "**Trap:** `a[i][j]` works for scalars but is slower and breaks for multi-axis fancy indexing and column slices."
      ],
      commonMistakes: [
        "Using `a[i][j]` habitually from Python lists instead of `a[i, j]`.",
        "Trying `a[:][j]` for a column (it does nothing useful — use `a[:, j]`)."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "row-column-slicing",
      num: 4,
      title: "Select whole rows, columns, and sub-blocks",
      difficulty: "Easy",
      category: "Indexing & Slicing",
      importance: "essential",
      meta: { pattern: "Axis selection", technique: "Slice per axis", functions: "[i, :], [:, k], [r0:r1, c0:c1]" },
      description:
        "Slice a 2-D array along each axis: pull a full row with `a[i, :]`, a full column with `a[:, k]`, and a rectangular sub-block with `a[r0:r1, c0:c1]`. The `:` means 'all of this axis'.",
      notes: [
        "`a[:, k]` returns the column as a 1-D array (the length-1 axis is dropped by integer indexing).",
        "Use a slice `a[:, k:k+1]` instead if you need the column kept as a 2-D column vector."
      ],
      examples: [
        {
          input: "a = np.arange(1,13).reshape(3,4); a[:, 2]",
          output: "[ 3  7 11]",
          reasoning: "Column index 2 across all three rows: 3, 7, 11."
        },
        {
          input: "a[0:2, 1:3]",
          output: "[[2 3]\n [6 7]]",
          reasoning: "Rows 0-1 and columns 1-2 (both stops exclusive) form a 2x2 block."
        }
      ],
      approaches: [
        {
          name: "per-axis slicing with ':'",
          whenToUse: "Extracting rows/columns for feature selection, or cropping a rectangular region.",
          logic:
            "**What it asks.** Select a row, a column, and a sub-matrix using slices on each axis.\n\n" +
            "**Key idea.** In `a[rows, cols]`, each position is a selector for that axis; a bare `:` means take everything on that axis.\n\n" +
            "**Step by step.**\n" +
            "1. `a[1, :]` → all columns of row 1.\n" +
            "2. `a[:, 2]` → all rows of column 2 (returned 1-D).\n" +
            "3. `a[0:2, 1:3]` → rows 0-1, cols 1-2 sub-block.\n\n" +
            "**Why it works.** Each axis is sliced independently, so combining slices carves out any axis-aligned rectangle in one operation — all as a view.\n\n" +
            "**Gotchas.**\n" +
            "- Integer indexing an axis **drops** it: `a[:, 2]` is 1-D. Keep it 2-D with `a[:, 2:3]`.\n" +
            "- Both stops in `a[0:2, 1:3]` are exclusive.\n" +
            "- These are views — writing to them mutates the parent (see the views problem).\n\n" +
            "**Interview mindset.** '`:` = whole axis; integer drops the axis, a slice keeps it.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(1, 13).reshape(3, 4)\n" +
            "print(a[1, :])       # entire row 1\n" +
            "print(a[:, 2])       # entire column 2 (returned as 1-D)\n" +
            "print(a[0:2, 1:3])   # sub-block: rows 0-1, cols 1-2",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(1, 13).reshape(3, 4)\n" +
            "print(a[1, :])\n" +
            "print(a[:, 2])\n" +
            "print(a[0:2, 1:3])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'this row', 'that column', 'a rectangular region'.",
        "**Say it:** `a[i, :]` row, `a[:, k]` column, `a[r0:r1, c0:c1]` block.",
        "**Trap:** integer indexing an axis drops it (column comes back 1-D)."
      ],
      commonMistakes: [
        "Expecting `a[:, k]` to stay a 2-D column (use `a[:, k:k+1]` for that).",
        "Writing `a[1]` and forgetting it already means the whole of row 1."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "slices-are-views-not-copies",
      num: 5,
      title: "Slices are views — mutating one mutates the parent",
      difficulty: "Medium",
      category: "Indexing & Slicing",
      importance: "essential",
      meta: { pattern: "Views vs copies", technique: "View aliasing / .copy()", functions: "slicing, .copy(), .base" },
      description:
        "A basic slice returns a **view** that shares memory with the original array — not a copy. Writing into the slice therefore changes the parent array. To get an independent array you must call `.copy()`. Demonstrate both behaviors side by side.",
      notes: [
        "Basic slicing (`a[1:4]`, `a[:, k]`) shares the buffer; fancy/boolean indexing returns a copy instead.",
        "`slice.base is a` (or `a.base`) reveals whether an array is a view into another."
      ],
      examples: [
        {
          input: "a = np.arange(6); s = a[1:4]; s[0] = 99; a",
          output: "[ 0 99  2  3  4  5]",
          reasoning: "s is a view; s[0] is a[1], so writing 99 through the view changes the parent at index 1."
        },
        {
          input: "a = np.arange(6); c = a[1:4].copy(); c[0] = 99; a",
          output: "[0 1 2 3 4 5]",
          reasoning: ".copy() detaches c from a, so mutating c leaves the original untouched."
        }
      ],
      approaches: [
        {
          name: "view aliasing vs .copy()",
          whenToUse: "Views for cheap in-place work on a region; `.copy()` whenever the sub-array must be independent.",
          logic:
            "**What it asks.** Show that a slice aliases the parent's memory, and how `.copy()` breaks that link.\n\n" +
            "**Key idea.** Basic slicing does **not** duplicate data — it returns a new array object pointing at the same buffer, so writes propagate both ways.\n\n" +
            "**Step by step.**\n" +
            "1. Slice `s = a[1:4]` — a view over a's elements 1..3.\n" +
            "2. Assign `s[0] = 99` — this writes into a[1]; printing `a` shows the change.\n" +
            "3. For independence, slice then `.copy()`: `c = a[1:4].copy()`; now `c[0] = 99` leaves `a` unchanged.\n\n" +
            "**Why it works.** NumPy separates the array object (shape, strides, offset) from the underlying data buffer; a basic slice reuses the buffer, while `.copy()` allocates a fresh one.\n\n" +
            "**Gotchas.**\n" +
            "- The bug is silent: you 'edit a slice' and mysteriously corrupt the original.\n" +
            "- Fancy indexing (`a[[1,2,3]]`) and boolean masks return copies, so this trap is specific to basic slicing.\n" +
            "- `a.base` is not None when `a` is a view — a quick way to check.\n\n" +
            "**Interview mindset.** 'A basic slice is a view sharing memory; call `.copy()` when you need to mutate without touching the source.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(6)\n" +
            "s = a[1:4]          # VIEW: shares memory with a\n" +
            "s[0] = 99           # writes through to a[1]\n" +
            "print(a)            # -> [ 0 99  2  3  4  5]  parent changed!\n" +
            "\n" +
            "a2 = np.arange(6)\n" +
            "c = a2[1:4].copy()  # independent COPY\n" +
            "c[0] = 99           # only c changes\n" +
            "print(a2)           # -> [0 1 2 3 4 5]  parent intact\n" +
            "print(c)            # -> [99  2  3]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(6)\n" +
            "s = a[1:4]\n" +
            "s[0] = 99\n" +
            "print(a)\n" +
            "\n" +
            "a2 = np.arange(6)\n" +
            "c = a2[1:4].copy()\n" +
            "c[0] = 99\n" +
            "print(a2)\n" +
            "print(c)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'I edited a slice and the original changed', 'do I need .copy()?'.",
        "**Say it:** basic slices are views sharing memory; `.copy()` makes an independent array.",
        "**Trap:** fancy/boolean indexing copies, but basic slicing aliases — silent bugs otherwise."
      ],
      commonMistakes: [
        "Assuming a slice is a fresh copy and accidentally corrupting the parent array.",
        "Calling `.copy()` on everything defensively (wasteful) — or never, when you actually need it."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "ellipsis-and-newaxis",
      num: 6,
      title: "Ellipsis (...) and np.newaxis to manage axes",
      difficulty: "Medium",
      category: "Indexing & Slicing",
      importance: "common",
      meta: { pattern: "Axis manipulation", technique: "Ellipsis / new axis", functions: "..., np.newaxis, None" },
      description:
        "Use `...` (ellipsis) to stand in for 'all remaining axes' so indexing code works regardless of dimensionality, and use `np.newaxis` (or `None`) inside an index to insert a length-1 axis — the standard trick for reshaping a 1-D vector into a row or column for broadcasting.",
      notes: [
        "`a[..., 0]` takes index 0 on the **last** axis and keeps every axis before it, whatever the ndim.",
        "`v[:, np.newaxis]` turns a shape `(n,)` vector into a `(n, 1)` column; `v[np.newaxis, :]` makes a `(1, n)` row."
      ],
      examples: [
        {
          input: "a = np.arange(24).reshape(2,3,4); a[..., 0]",
          output: "[[ 0  4  8]\n [12 16 20]]",
          reasoning: "... keeps the first two axes; index 0 on the last axis leaves a (2, 3) array."
        },
        {
          input: "v = np.array([1,2,3]); v[:, np.newaxis].shape",
          output: "(3, 1)",
          reasoning: "newaxis inserts a length-1 second axis, turning (3,) into a (3, 1) column."
        }
      ],
      approaches: [
        {
          name: "ellipsis + newaxis",
          whenToUse: "Ellipsis for dimension-agnostic indexing; newaxis to add an axis so shapes broadcast.",
          logic:
            "**What it asks.** Select on the last axis without hard-coding the others, and add a length-1 axis to reshape for broadcasting.\n\n" +
            "**Key idea.** `...` expands to as many full slices as needed to cover the unmentioned axes; `np.newaxis` (an alias for `None`) inserts a new size-1 axis at its position.\n\n" +
            "**Step by step.**\n" +
            "1. `a[..., 0]` → index 0 on the last axis, all earlier axes kept.\n" +
            "2. `v[:, np.newaxis]` → shape `(n,)` becomes `(n, 1)` (a column).\n" +
            "3. `v[np.newaxis, :]` → shape `(n,)` becomes `(1, n)` (a row).\n\n" +
            "**Why it works.** Ellipsis is a placeholder the indexer fills with `slice(None)` for each missing axis; newaxis adds an axis of length 1, which broadcasting can then stretch.\n\n" +
            "**Gotchas.**\n" +
            "- Only one `...` is allowed per index expression.\n" +
            "- `np.newaxis` is literally `None`; `v[:, None]` does the same thing.\n" +
            "- Adding an axis changes ndim/shape but not the data — it's a view.\n\n" +
            "**Interview mindset.** '`...` = the rest of the axes; `np.newaxis` = insert a length-1 axis so shapes line up for broadcasting.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(24).reshape(2, 3, 4)\n" +
            "print(a[..., 0])           # index 0 on last axis, keep the rest -> (2,3)\n" +
            "\n" +
            "v = np.array([1, 2, 3])\n" +
            "print(v[:, np.newaxis])    # (3,) -> (3,1) column\n" +
            "print(v[:, np.newaxis].shape)\n" +
            "print(v[np.newaxis, :].shape)  # (3,) -> (1,3) row",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(24).reshape(2, 3, 4)\n" +
            "print(a[..., 0])\n" +
            "\n" +
            "v = np.array([1, 2, 3])\n" +
            "print(v[:, np.newaxis])\n" +
            "print(v[:, np.newaxis].shape)\n" +
            "print(v[np.newaxis, :].shape)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'index the last axis whatever the ndim', 'make it a column/row', 'add an axis to broadcast'.",
        "**Say it:** `a[..., k]` for the last axis; `v[:, np.newaxis]` for a column, `v[np.newaxis, :]` for a row.",
        "**Trap:** only one ellipsis allowed; `np.newaxis` is just `None`."
      ],
      commonMistakes: [
        "Hard-coding `a[:, :, 0]` where `a[..., 0]` would generalize across dimensions.",
        "Using `.reshape` for a simple axis insert when `np.newaxis` is clearer."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "take-and-fancy-row-selection",
      num: 7,
      title: "Pick rows/elements by an index list (np.take & fancy indexing)",
      difficulty: "Easy",
      category: "Indexing & Slicing",
      importance: "common",
      meta: { pattern: "Gather", technique: "Index-list selection", functions: "np.take, a[[i, j]]" },
      description:
        "Select multiple elements or rows at once by supplying a list of indices. Use fancy indexing `a[[0, 3]]` to grab specific rows, and `np.take(a, idx, axis=...)` to gather along a chosen axis — the index list may repeat and reorder freely.",
      notes: [
        "Fancy/index-list selection returns a **copy**, not a view (unlike a basic slice).",
        "`np.take(a, idx, axis=0)` is equivalent to `a[idx]`; without `axis` it works on the flattened array."
      ],
      examples: [
        {
          input: "a = np.arange(1,13).reshape(4,3); a[[0, 3]]",
          output: "[[ 1  2  3]\n [10 11 12]]",
          reasoning: "The index list [0, 3] gathers rows 0 and 3 in that order into a new 2x3 array."
        },
        {
          input: "np.take(np.array([10,20,30,40]), [3,0,1])",
          output: "[40 10 20]",
          reasoning: "take gathers elements at positions 3, 0, 1 — order follows the index list."
        }
      ],
      approaches: [
        {
          name: "fancy indexing & np.take",
          whenToUse: "Reordering, subsetting, or duplicating rows/elements by an explicit list of positions.",
          logic:
            "**What it asks.** Gather several rows or elements at once using a list of indices, along a chosen axis.\n\n" +
            "**Key idea.** Passing an array/list of indices selects each of those positions; the result's order and length follow the index list, and repeats are allowed.\n\n" +
            "**Step by step.**\n" +
            "1. `a[[0, 3]]` → rows 0 and 3 as a new array.\n" +
            "2. `np.take(a, [0, 2], axis=0)` → same idea, axis made explicit.\n" +
            "3. `np.take(v, [3, 0, 1])` → gather elements in a custom order.\n\n" +
            "**Why it works.** Fancy indexing computes each output position from the index list and copies the corresponding source element, so the output is a fresh array.\n\n" +
            "**Gotchas.**\n" +
            "- The result is a **copy** — mutating it never touches the source (opposite of basic slicing).\n" +
            "- `np.take` needs `axis=` to pick rows/columns; without it, indices refer to the flattened array.\n" +
            "- Out-of-range indices raise `IndexError` (or wrap/clip only if you pass `mode=` to `take`).\n\n" +
            "**Interview mindset.** 'Index list = gather specific positions, returns a copy; `np.take(..., axis=)` makes the axis explicit.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(1, 13).reshape(4, 3)\n" +
            "print(a[[0, 3]])                 # fancy indexing: rows 0 and 3\n" +
            "print(np.take(a, [0, 2], axis=0))  # same via take, axis explicit\n" +
            "\n" +
            "v = np.array([10, 20, 30, 40])\n" +
            "print(np.take(v, [3, 0, 1]))    # gather + reorder -> [40 10 20]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.arange(1, 13).reshape(4, 3)\n" +
            "print(a[[0, 3]])\n" +
            "print(np.take(a, [0, 2], axis=0))\n" +
            "\n" +
            "v = np.array([10, 20, 30, 40])\n" +
            "print(np.take(v, [3, 0, 1]))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'these specific rows', 'reorder by an index list', 'gather selected elements'.",
        "**Say it:** `a[[i, j, ...]]` fancy indexing, or `np.take(a, idx, axis=k)`.",
        "**Trap:** fancy indexing returns a copy, not a view; `take` needs `axis=` for rows/cols."
      ],
      commonMistakes: [
        "Expecting `a[[0, 3]]` to be a view you can write back through (it's a copy).",
        "Forgetting `axis=` in `np.take` and gathering from the flattened array by accident."
      ]
    }

  ]);
})();
