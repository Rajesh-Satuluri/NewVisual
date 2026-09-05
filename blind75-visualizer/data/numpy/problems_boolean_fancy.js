/*
 * NumPy Interview Lab — Boolean & Fancy Indexing
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in
 * data/numpy/problems_arrays_creation.js (read that file for the reference).
 *
 * Registers on the global registry:
 *     window.NUMPY.register("Boolean & Fancy Indexing", [ ...problems ]);
 *
 * Every rcs (commented) and plain (clean) snippet is self-contained runnable
 * NumPy: starts with `import numpy as np`, prints output, and was executed
 * against NumPy 2.4.6 before commit.
 *
 * Theme reminders threaded through these problems:
 *   - Combine masks with & / | and WRAP EACH in parentheses — Python's
 *     `and`/`or` raise ValueError on arrays.
 *   - Boolean masks and fancy (integer) indexing return COPIES, not views
 *     (unlike basic slices, which alias the original buffer).
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Boolean & Fancy Indexing", [

    // ------------------------------------------------------------------ Q1
    {
      id: "boolean-mask-select",
      num: 1,
      title: "Select elements with a boolean mask (arr[arr > k])",
      difficulty: "Easy",
      category: "Boolean & Fancy Indexing",
      importance: "essential",
      meta: { pattern: "Boolean indexing", technique: "Mask filter", functions: "arr > k, arr[mask]" },
      description:
        "Keep only the elements of an array that satisfy a condition. Given `[1, 5, 2, 8, 3, 9]`, return the values greater than 4. Do it by building a boolean mask (`arr > 4`) and indexing the array with it.",
      notes: [
        "A comparison like `arr > 4` returns a **boolean array** of the same shape, not a single True/False.",
        "Indexing with that mask returns a **new 1-D array** (a copy) of just the selected elements."
      ],
      examples: [
        {
          input: "arr = np.array([1, 5, 2, 8, 3, 9]); arr[arr > 4]",
          output: "[5 8 9]",
          reasoning: "The mask is [F T F T F T]; indexing keeps the positions that are True."
        }
      ],
      approaches: [
        {
          name: "comparison mask + indexing",
          whenToUse: "Any 'give me the elements where <condition>' filter over an array.",
          logic:
            "**What it asks.** Return the subset of elements passing a condition.\n\n" +
            "**Key idea.** A comparison produces a boolean array of the same shape; using it as an index picks out the True positions.\n\n" +
            "**Step by step.**\n" +
            "1. `mask = arr > 4` → boolean array `[F T F T F T]`.\n" +
            "2. `arr[mask]` → the elements aligned with the True entries.\n\n" +
            "**Why it works.** Boolean indexing walks the mask position-for-position and collects each element where the mask is True, flattening the result to 1-D.\n\n" +
            "**Gotchas.**\n" +
            "- The mask must match the array's shape — a mismatched-length mask errors.\n" +
            "- The result is a **copy**, not a view: editing it never touches the original (unlike a slice).\n" +
            "- The output is always 1-D, even for a 2-D input.\n\n" +
            "**Interview mindset.** 'Comparison makes a mask; the mask filters. It returns a fresh 1-D copy.'",
          perfNote: "One vectorized pass in C to build the mask, one to gather — O(n), no Python loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, 5, 2, 8, 3, 9])\n" +
            "mask = arr > 4                 # boolean array: [F T F T F T]\n" +
            "print(mask)\n" +
            "print(arr[mask])              # keep only True positions -> [5 8 9]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, 5, 2, 8, 3, 9])\n" +
            "mask = arr > 4\n" +
            "print(mask)\n" +
            "print(arr[mask])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'elements greater than', 'values where', 'filter the array'.",
        "**Say it:** `arr[arr > k]` — build a boolean mask, index with it.",
        "**Trap:** the result is a 1-D copy, not a view."
      ],
      commonMistakes: [
        "Thinking `arr > 4` returns one boolean instead of a boolean array.",
        "Expecting the filtered result to share memory with the original array."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "combine-masks-and-or",
      num: 2,
      title: "Combine conditions with & and | (parentheses required)",
      difficulty: "Easy",
      category: "Boolean & Fancy Indexing",
      importance: "essential",
      meta: { pattern: "Boolean indexing", technique: "Elementwise & / |", functions: "&, |, ~, arr[mask]" },
      description:
        "Filter with **multiple** conditions. From `[1, 5, 2, 8, 3, 9]`, select values that are greater than 2 **and** less than 9, then values that are less than 2 **or** greater than 8. Use the elementwise operators `&` and `|` — and wrap each condition in parentheses.",
      notes: [
        "Use `&` (and), `|` (or), `~` (not) for arrays — **never** Python's `and`/`or`/`not`, which raise `ValueError` on arrays.",
        "Parentheses are mandatory: `&`/`|` bind **tighter** than `<`/`>`, so `arr > 2 & arr < 9` parses wrongly."
      ],
      examples: [
        {
          input: "arr[(arr > 2) & (arr < 9)]",
          output: "[5 8 3]",
          reasoning: "Both conditions must hold: 5, 8, 3 pass; 1 and 2 fail the >2 test, 9 fails the <9 test."
        },
        {
          input: "arr[(arr < 2) | (arr > 8)]",
          output: "[1 9]",
          reasoning: "Either condition suffices: 1 (<2) and 9 (>8) qualify."
        }
      ],
      approaches: [
        {
          name: "parenthesized elementwise combine",
          whenToUse: "Any filter with two or more conditions joined by AND/OR.",
          logic:
            "**What it asks.** Filter on a compound condition made of two comparisons.\n\n" +
            "**Key idea.** Combine boolean arrays elementwise with `&` and `|`, parenthesizing each comparison so operator precedence doesn't scramble it.\n\n" +
            "**Step by step.**\n" +
            "1. Build each mask: `(arr > 2)`, `(arr < 9)`.\n" +
            "2. Combine: `(arr > 2) & (arr < 9)` for AND, `|` for OR.\n" +
            "3. Index: `arr[combined]`.\n\n" +
            "**Why it works.** `&` and `|` are elementwise bitwise ops on boolean arrays; position i is True only if the combined logic holds there.\n\n" +
            "**Gotchas.**\n" +
            "- **Parentheses are required** — `&`/`|` have higher precedence than comparisons, so `arr > 2 & arr < 9` is parsed as `arr > (2 & arr) < 9` and misbehaves.\n" +
            "- Using Python `and`/`or` raises `ValueError: The truth value of an array ... is ambiguous`.\n" +
            "- Use `~mask` for NOT, not Python's `not`.\n\n" +
            "**Interview mindset.** 'Vectorized boolean logic = `&`, `|`, `~`, each comparison in parens. `and`/`or` are a hard error on arrays.'",
          perfNote: "Each mask and the combine are single vectorized C passes — O(n) total.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, 5, 2, 8, 3, 9])\n" +
            "both = arr[(arr > 2) & (arr < 9)]   # AND: parens REQUIRED -> [5 8 3]\n" +
            "either = arr[(arr < 2) | (arr > 8)] # OR -> [1 9]\n" +
            "print(both)\n" +
            "print(either)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, 5, 2, 8, 3, 9])\n" +
            "both = arr[(arr > 2) & (arr < 9)]\n" +
            "either = arr[(arr < 2) | (arr > 8)]\n" +
            "print(both)\n" +
            "print(either)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'between a and b', 'this or that', 'multiple conditions'.",
        "**Say it:** `arr[(cond1) & (cond2)]`; `&`/`|`/`~`, each comparison parenthesized.",
        "**Trap:** `and`/`or` raise ValueError; missing parens misparse due to precedence."
      ],
      commonMistakes: [
        "Writing `arr[arr > 2 and arr < 9]` — Python `and` on arrays raises ValueError.",
        "Dropping parentheses: `arr[(arr > 2) & arr < 9]` fails on operator precedence."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "conditional-assignment-mask",
      num: 3,
      title: "Assign to matched elements in place (arr[mask] = value)",
      difficulty: "Easy",
      category: "Boolean & Fancy Indexing",
      importance: "essential",
      meta: { pattern: "Boolean indexing", technique: "In-place masked write", functions: "arr[mask] = value" },
      description:
        "Overwrite just the elements that match a condition, **mutating the array in place**. Given `[1, -5, 2, -8, 3]`, clamp every negative value to 0 by assigning to the masked positions.",
      notes: [
        "`arr[mask] = value` writes into the original buffer — no copy, the array itself changes.",
        "The right-hand side can be a scalar (broadcast to all matches) or an array with exactly as many elements as there are True entries."
      ],
      examples: [
        {
          input: "arr = np.array([1, -5, 2, -8, 3]); arr[arr < 0] = 0; arr",
          output: "[1 0 2 0 3]",
          reasoning: "Only the two negative positions are rewritten to 0; the rest are untouched."
        }
      ],
      approaches: [
        {
          name: "masked assignment (in place)",
          whenToUse: "Clamping, flooring, replacing sentinels, or zeroing out bad values in place.",
          logic:
            "**What it asks.** Replace the elements meeting a condition with a new value, changing the array itself.\n\n" +
            "**Key idea.** A boolean mask on the **left** of `=` targets exactly the True positions for writing.\n\n" +
            "**Step by step.**\n" +
            "1. `mask = arr < 0`.\n" +
            "2. `arr[mask] = 0` → scalar 0 is broadcast into every True slot.\n\n" +
            "**Why it works.** Boolean assignment scatters the right-hand value(s) into the matched positions of the original buffer — this is a mutation, not a new array.\n\n" +
            "**Gotchas.**\n" +
            "- This **mutates** the original. If you need the original preserved, copy first or use `np.where` (next problem) to build a new array.\n" +
            "- Reading `arr[mask]` returns a copy, but assigning `arr[mask] = ...` writes back in place — the two directions differ.\n" +
            "- A non-scalar RHS must have length equal to the number of True entries.\n\n" +
            "**Interview mindset.** 'Mask on the left of `=` edits in place; mask on the right reads a copy.'",
          perfNote: "Single vectorized scatter into existing memory — O(n), no allocation.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, -5, 2, -8, 3])\n" +
            "arr[arr < 0] = 0              # in-place: rewrite negatives to 0\n" +
            "print(arr)                    # [1 0 2 0 3] (original mutated)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, -5, 2, -8, 3])\n" +
            "arr[arr < 0] = 0\n" +
            "print(arr)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'set all negatives to 0', 'clamp', 'replace values that ...'.",
        "**Say it:** `arr[mask] = value` writes in place into the matched positions.",
        "**Trap:** it mutates the original — copy first if you must keep it."
      ],
      commonMistakes: [
        "Expecting the original to be unchanged after `arr[mask] = value`.",
        "Giving a RHS array whose length doesn't equal the number of True entries."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "np-where-select",
      num: 4,
      title: "Build a new array with np.where(cond, a, b)",
      difficulty: "Medium",
      category: "Boolean & Fancy Indexing",
      importance: "essential",
      meta: { pattern: "Conditional select", technique: "Vectorized ternary", functions: "np.where" },
      description:
        "Produce a **new** array by choosing per element between two options based on a condition — the vectorized form of `x if cond else y`. Given `[1, -5, 2, -8, 3]`, build a copy where negatives become 0 and everything else is kept, **without** mutating the original.",
      notes: [
        "`np.where(cond, a, b)` returns a new array: take from `a` where `cond` is True, else from `b`.",
        "`a` and `b` broadcast — either can be a scalar or an array shaped like `cond`."
      ],
      examples: [
        {
          input: "np.where(arr < 0, 0, arr)   # arr = [1, -5, 2, -8, 3]",
          output: "[1 0 2 0 3]",
          reasoning: "Where the value is negative, take 0; otherwise take the original element."
        },
        {
          input: "np.where(arr >= 0, 'pos', 'neg')",
          output: "['pos' 'neg' 'pos' 'neg' 'pos']",
          reasoning: "Both choices are strings, so the result is a string array of labels."
        }
      ],
      approaches: [
        {
          name: "np.where as a vectorized ternary",
          whenToUse: "When you need a new array whose values depend on a condition, and want the original left intact.",
          logic:
            "**What it asks.** Select between two values per element by a condition, returning a fresh array.\n\n" +
            "**Key idea.** `np.where(cond, a, b)` is `a if cond else b` applied elementwise; `a` and `b` broadcast against `cond`.\n\n" +
            "**Step by step.**\n" +
            "1. Form the condition: `arr < 0`.\n" +
            "2. `np.where(arr < 0, 0, arr)` → 0 where True, original where False.\n" +
            "3. The original `arr` is unchanged — the result is new.\n\n" +
            "**Why it works.** `where` walks the condition and, position by position, pulls from `a` or `b` (broadcasting scalars), assembling a brand-new array.\n\n" +
            "**Gotchas.**\n" +
            "- Unlike `arr[mask] = v`, this does **not** mutate — it returns a copy.\n" +
            "- `np.where(cond)` with **one** argument is different: it returns the indices where cond is True (a tuple of index arrays).\n" +
            "- `a` and `b` must broadcast to the condition's shape.\n\n" +
            "**Interview mindset.** 'Need a new array from a condition → `np.where(cond, a, b)`. Need to edit in place → masked assignment.'",
          perfNote: "Single vectorized pass building one new array — O(n), no Python loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, -5, 2, -8, 3])\n" +
            "clamped = np.where(arr < 0, 0, arr)  # new array: 0 where <0, else keep\n" +
            "print(clamped)               # [1 0 2 0 3]\n" +
            "print(arr)                    # original UNCHANGED: [ 1 -5  2 -8  3]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([1, -5, 2, -8, 3])\n" +
            "clamped = np.where(arr < 0, 0, arr)\n" +
            "print(clamped)\n" +
            "print(arr)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'if positive keep else 0', 'label each as A or B', 'new array based on a condition'.",
        "**Say it:** `np.where(cond, a, b)` — vectorized ternary, returns a new array.",
        "**Trap:** one-arg `np.where(cond)` returns indices, not values; `where` doesn't mutate."
      ],
      commonMistakes: [
        "Confusing `np.where(cond)` (returns indices) with `np.where(cond, a, b)` (returns values).",
        "Expecting `np.where` to modify the input in place — it always builds a copy."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "fancy-indexing-arrays",
      num: 5,
      title: "Fancy indexing: pick by index list and 2-D cells",
      difficulty: "Medium",
      category: "Boolean & Fancy Indexing",
      importance: "essential",
      meta: { pattern: "Fancy indexing", technique: "Integer index arrays", functions: "arr[[i,j,k]], arr[rows, cols]" },
      description:
        "Select elements by explicit position. From `[10, 20, 30, 40, 50]`, grab positions 0, 2, and 3 with an index list. Then, from a 3×4 grid, pull specific cells `(0,3)`, `(1,2)`, `(2,0)` at once by passing a row-index array and a column-index array.",
      notes: [
        "1-D fancy indexing: `arr[[0, 2, 3]]` returns those elements in that order — you can repeat or reorder indices freely.",
        "2-D fancy indexing: `grid[rows, cols]` pairs them elementwise — `rows[i]` with `cols[i]` — so the result has one value per pair."
      ],
      examples: [
        {
          input: "arr = np.array([10, 20, 30, 40, 50]); arr[[0, 2, 3]]",
          output: "[10 30 40]",
          reasoning: "The index array picks elements at positions 0, 2, 3, in that order."
        },
        {
          input: "grid = np.arange(1,13).reshape(3,4); grid[[0,1,2], [3,2,0]]",
          output: "[4 7 9]",
          reasoning: "Cells (0,3)=4, (1,2)=7, (2,0)=9 — rows and cols are zipped elementwise."
        }
      ],
      approaches: [
        {
          name: "integer index arrays (1-D and 2-D)",
          whenToUse: "Gathering an arbitrary set/order of positions, or plucking specific (row, col) cells.",
          logic:
            "**What it asks.** Select elements by an explicit list of indices, in 1-D and by paired row/column arrays in 2-D.\n\n" +
            "**Key idea.** Pass an **array of integer positions**; NumPy gathers those elements. In 2-D, the row array and column array are **zipped** position-by-position.\n\n" +
            "**Step by step.**\n" +
            "1. `arr[[0, 2, 3]]` → elements at 0, 2, 3.\n" +
            "2. Build `rows = [0, 1, 2]`, `cols = [3, 2, 0]`.\n" +
            "3. `grid[rows, cols]` → `grid[0,3], grid[1,2], grid[2,0]` = `[4, 7, 9]`.\n\n" +
            "**Why it works.** Fancy indexing broadcasts the index arrays together and reads one element per aligned index tuple, so paired arrays pick individual cells (not a sub-block).\n\n" +
            "**Gotchas.**\n" +
            "- The result is a **copy**, like boolean indexing — not a view.\n" +
            "- `grid[rows, cols]` picks the cells `(rows[i], cols[i])`; it does **not** select a rectangular block — for that use slicing or `grid[np.ix_(rows, cols)]`.\n" +
            "- Index arrays must broadcast to a common shape; the output takes that shape.\n" +
            "- Negative indices count from the end, and repeats are allowed.\n\n" +
            "**Interview mindset.** 'Index array = gather by position; paired arrays zip to pick individual cells; the result is a copy.'",
          perfNote: "Vectorized gather — O(k) in the number of selected elements, no Python loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([10, 20, 30, 40, 50])\n" +
            "print(arr[[0, 2, 3]])        # gather positions 0,2,3 -> [10 30 40]\n" +
            "\n" +
            "grid = np.arange(1, 13).reshape(3, 4)\n" +
            "rows = np.array([0, 1, 2])\n" +
            "cols = np.array([3, 2, 0])\n" +
            "print(grid[rows, cols])      # cells (0,3),(1,2),(2,0) -> [4 7 9]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([10, 20, 30, 40, 50])\n" +
            "print(arr[[0, 2, 3]])\n" +
            "\n" +
            "grid = np.arange(1, 13).reshape(3, 4)\n" +
            "rows = np.array([0, 1, 2])\n" +
            "cols = np.array([3, 2, 0])\n" +
            "print(grid[rows, cols])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'these specific positions', 'reorder by index', 'pick cells (r,c)'.",
        "**Say it:** `arr[[i, j, k]]` gathers; `grid[rows, cols]` zips indices to pick cells.",
        "**Trap:** `grid[rows, cols]` pairs elementwise (not a block); result is a copy."
      ],
      commonMistakes: [
        "Expecting `grid[[0,1,2], [3,2,0]]` to return a 3×3 sub-block instead of 3 cells.",
        "Assuming fancy indexing returns a view — it returns a copy."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "argsort-top-k",
      num: 6,
      title: "Find the top-k elements with argsort",
      difficulty: "Hard",
      category: "Boolean & Fancy Indexing",
      importance: "common",
      meta: { pattern: "Fancy indexing", technique: "argsort + slice", functions: "np.argsort, arr[idx]" },
      description:
        "Return the k largest values of an array **and** their original positions. Given `[15, 3, 27, 8, 42, 19]` and k=3, produce the indices of the top 3 (largest first) and the values at those indices, using `np.argsort` plus fancy indexing.",
      notes: [
        "`np.argsort(arr)` returns the **indices** that would sort the array **ascending** — not the sorted values.",
        "Take the last k of the ascending order and reverse to get the top k in descending order.",
        "For very large arrays, `np.argpartition(arr, -k)[-k:]` finds the top k in O(n) without fully sorting."
      ],
      examples: [
        {
          input: "arr = np.array([15,3,27,8,42,19]); np.argsort(arr)",
          output: "[1 3 0 5 2 4]",
          reasoning: "Ascending order of values (3,8,15,19,27,42) sits at original indices 1,3,0,5,2,4."
        },
        {
          input: "idx = np.argsort(arr)[-3:][::-1]; idx, arr[idx]",
          output: "[4 2 5]  ->  [42 27 19]",
          reasoning: "Last 3 of the ascending order are the largest; reversing puts the biggest first."
        }
      ],
      approaches: [
        {
          name: "argsort, slice last k, reverse",
          whenToUse: "Top-k / bottom-k selection where you need the indices (leaderboards, nearest neighbors, ranking).",
          logic:
            "**What it asks.** Get the indices and values of the k largest elements, largest first.\n\n" +
            "**Key idea.** `argsort` gives the ascending order of positions; the top k are its **last** k entries, reversed.\n\n" +
            "**Step by step.**\n" +
            "1. `order = np.argsort(arr)` → indices sorting ascending: `[1 3 0 5 2 4]`.\n" +
            "2. `order[-k:]` → indices of the k largest (still ascending): `[5 2 4]`.\n" +
            "3. `[::-1]` → reverse to largest-first: `[4 2 5]`.\n" +
            "4. `arr[idx]` → the values `[42 27 19]` via fancy indexing.\n\n" +
            "**Why it works.** Sorting ascending puts the biggest values at the end; slicing the tail and reversing yields the top k in descending order, and the index array reads their values in one gather.\n\n" +
            "**Gotchas.**\n" +
            "- `argsort` returns **indices**, not sorted values — don't confuse it with `np.sort`.\n" +
            "- Order is **ascending**; for top-k you must take the tail and reverse (or `argsort(-arr)` for a descending order directly).\n" +
            "- Ties keep a stable-ish arbitrary order; use `kind='stable'` if exact tie order matters.\n" +
            "- At scale prefer `np.argpartition(arr, -k)[-k:]` — O(n) vs O(n log n), though its k indices aren't internally sorted.\n\n" +
            "**Interview mindset.** 'argsort → ascending indices; tail-k reversed = top-k indices; fancy-index to read values. Mention argpartition for big n.'",
          perfNote: "Full argsort is O(n log n); `np.argpartition` gets the top-k boundary in O(n) when you don't need the losers ordered.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([15, 3, 27, 8, 42, 19])\n" +
            "k = 3\n" +
            "order = np.argsort(arr)      # ascending indices: [1 3 0 5 2 4]\n" +
            "idx = order[-k:][::-1]       # last k, reversed -> top-k indices [4 2 5]\n" +
            "print(idx)\n" +
            "print(arr[idx])              # top-k values -> [42 27 19]",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([15, 3, 27, 8, 42, 19])\n" +
            "k = 3\n" +
            "order = np.argsort(arr)\n" +
            "idx = order[-k:][::-1]\n" +
            "print(idx)\n" +
            "print(arr[idx])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'top k', 'k largest/smallest', 'rank by value', 'indices of the biggest'.",
        "**Say it:** `np.argsort(arr)[-k:][::-1]` for top-k indices, then `arr[idx]` for values.",
        "**Trap:** argsort returns indices (ascending); use argpartition for O(n) top-k."
      ],
      commonMistakes: [
        "Treating `np.argsort` output as sorted values instead of indices.",
        "Forgetting the order is ascending and returning the smallest k as 'top'."
      ]
    }

  ]);
})();
