/*
 * NumPy Interview Lab — Aggregation & Axis
 * =========================================================================
 * Reductions (sum, mean, argmax, cumsum, NaN-aware variants) and the axis
 * mental model. See data/numpy/problems_arrays_creation.js for the full
 * SCHEMA and LOGIC-format reference this file follows.
 *
 * Every rcs/plain snippet is self-contained runnable NumPy (starts with
 * `import numpy as np`) and prints its output. All were executed before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Aggregation & Axis", [

    // ------------------------------------------------------------------ Q1
    {
      id: "sum-mean-axis0-vs-axis1",
      num: 1,
      title: "Sum/mean down columns (axis=0) vs across rows (axis=1)",
      difficulty: "Easy",
      category: "Aggregation & Axis",
      importance: "essential",
      meta: { pattern: "Reduction", technique: "Axis selection", functions: "np.sum, np.mean, arr.sum" },
      description:
        "Given a 2-D array, compute the column totals and the row totals. Reduce **down the columns** with `axis=0` (one number per column) and **across the rows** with `axis=1` (one number per row), and note what `sum()` with no axis returns.",
      notes: [
        "The axis you name is the one that **collapses (disappears)**. `axis=0` collapses the rows, leaving one value per column; `axis=1` collapses the columns, leaving one value per row.",
        "Omitting `axis` reduces the whole array to a single scalar."
      ],
      examples: [
        {
          input: "a = [[1,2,3],[4,5,6]]; a.sum(axis=0)",
          output: "[5 7 9]",
          reasoning: "axis=0 collapses the 2 rows: column sums 1+4, 2+5, 3+6 → one value per column."
        },
        {
          input: "a.sum(axis=1)",
          output: "[ 6 15]",
          reasoning: "axis=1 collapses the 3 columns: row sums 1+2+3, 4+5+6 → one value per row."
        }
      ],
      approaches: [
        {
          name: "axis=0 (down columns) vs axis=1 (across rows)",
          whenToUse: "Any per-column or per-row aggregate — column means, row totals, feature-wise stats.",
          logic:
            "**What it asks.** Aggregate a matrix once per column and once per row.\n\n" +
            "**Key idea.** The axis argument names the dimension that **COLLAPSES**. For a 2-D array, `axis=0` runs the reduction vertically and removes the row dimension (leaving one number per column); `axis=1` runs it horizontally and removes the column dimension (leaving one number per row).\n\n" +
            "**Step by step.**\n" +
            "1. `a.sum(axis=0)` → walk down each column, add → shape drops from (2,3) to (3,).\n" +
            "2. `a.sum(axis=1)` → walk across each row, add → shape drops from (2,3) to (2,).\n" +
            "3. `a.sum()` → no axis, collapse everything → a scalar.\n\n" +
            "**Why it works.** A reduction eliminates the named axis by combining all its entries; the surviving axes keep their length, which is why the result shape is the input shape with that one axis deleted.\n\n" +
            "**Gotchas.**\n" +
            "- Don't memorize 'axis=0 is columns' as a noun — remember 'axis=0 collapses the rows, so a per-column answer survives'.\n" +
            "- Column result length = number of columns; row result length = number of rows.\n" +
            "- `mean` behaves identically to `sum` on axes; only the combine step differs.\n\n" +
            "**Interview mindset.** Say: 'the axis I pass is the one that disappears — axis=0 collapses down the rows into column stats, axis=1 collapses across the columns into row stats.'",
          perfNote: "Single vectorized C reduction, O(n) over the elements — no Python loop over rows or columns.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(a.sum(axis=0))   # collapse rows -> per-column totals: [5 7 9]\n" +
            "print(a.sum(axis=1))   # collapse cols -> per-row totals:   [6 15]\n" +
            "print(a.mean(axis=0))  # per-column means: [2.5 3.5 4.5]\n" +
            "print(a.sum())         # no axis -> scalar total: 21",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(a.sum(axis=0))\n" +
            "print(a.sum(axis=1))\n" +
            "print(a.mean(axis=0))\n" +
            "print(a.sum())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'per column', 'per row', 'column means', 'sum each row'.",
        "**Say it:** the axis you name COLLAPSES — `axis=0` for per-column, `axis=1` for per-row.",
        "**Trap:** result shape = input shape with the named axis removed; no axis → scalar."
      ],
      commonMistakes: [
        "Reversing axis=0 and axis=1 by treating 'axis=0' as a fixed noun instead of 'the axis that collapses'.",
        "Expecting `a.sum(axis=0)` length to equal the number of rows (it equals the number of columns)."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "keepdims-normalize-rows",
      num: 2,
      title: "Keep dimensions with keepdims to normalize each row",
      difficulty: "Medium",
      category: "Aggregation & Axis",
      importance: "essential",
      meta: { pattern: "Reduction + broadcast", technique: "keepdims=True", functions: "arr.sum, keepdims" },
      description:
        "Divide every row of a 2-D array by that row's own sum so each row totals 1. Use `keepdims=True` on the row-sum reduction to preserve a broadcast-compatible shape, then divide.",
      notes: [
        "`a.sum(axis=1)` returns shape `(rows,)`; `a.sum(axis=1, keepdims=True)` returns shape `(rows, 1)`.",
        "The `(rows, 1)` shape broadcasts cleanly against `(rows, cols)`; the flat `(rows,)` shape does not."
      ],
      examples: [
        {
          input: "a = [[1,2,3],[4,4,2]]; a.sum(axis=1, keepdims=True).shape",
          output: "(2, 1)",
          reasoning: "keepdims retains the collapsed axis as length 1 instead of dropping it."
        },
        {
          input: "a / a.sum(axis=1, keepdims=True)",
          output: "[[0.167 0.333 0.5  ]\n [0.4   0.4   0.2  ]]",
          reasoning: "Each row is divided by its own sum (6 and 10), so every row now sums to 1."
        }
      ],
      approaches: [
        {
          name: "keepdims=True then broadcast-divide",
          whenToUse: "Row/column normalization, softmax-style scaling, subtracting per-row means — any reduce-then-combine.",
          logic:
            "**What it asks.** Scale each row by its own sum so rows become proportions.\n\n" +
            "**Key idea.** A reduction normally deletes the axis; `keepdims=True` keeps it as a length-1 axis, and length-1 axes broadcast against the original shape.\n\n" +
            "**Step by step.**\n" +
            "1. `s = a.sum(axis=1, keepdims=True)` → shape `(rows, 1)`, each row's total.\n" +
            "2. `a / s` → broadcasting stretches the length-1 column across every column.\n" +
            "3. Each row now sums to 1.\n\n" +
            "**Why it works.** Broadcasting aligns trailing dimensions; `(rows, 1)` vs `(rows, cols)` matches on the row axis and stretches the size-1 axis, so row i is divided by s[i] element-wise.\n\n" +
            "**Gotchas.**\n" +
            "- Without `keepdims`, the sum is shape `(rows,)`, which broadcasts against the **columns**, not the rows — wrong answer or a shape error.\n" +
            "- Alternative to keepdims: reshape with `s[:, None]`; keepdims is cleaner and dimension-agnostic.\n" +
            "- Guard against divide-by-zero if any row can sum to 0.\n\n" +
            "**Interview mindset.** 'keepdims leaves a size-1 axis so the reduced result broadcasts back against the original — the standard reduce-then-normalize move.'",
          perfNote: "One reduction plus one broadcast division, both vectorized; no intermediate reshape copy needed.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 4, 2]], dtype=float)\n" +
            "s = a.sum(axis=1, keepdims=True)   # shape (2, 1), NOT (2,)\n" +
            "print(s.shape)                     # (2, 1)\n" +
            "norm = a / s                       # broadcasts down each row\n" +
            "print(np.round(norm, 3))           # each row sums to 1",
          plain:
            "import numpy as np\n" +
            "\n" +
            "a = np.array([[1, 2, 3], [4, 4, 2]], dtype=float)\n" +
            "s = a.sum(axis=1, keepdims=True)\n" +
            "print(s.shape)\n" +
            "norm = a / s\n" +
            "print(np.round(norm, 3))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'normalize each row', 'make rows sum to 1', 'divide by row total', 'softmax'.",
        "**Say it:** reduce with `keepdims=True` to get a `(rows, 1)` shape, then broadcast-divide.",
        "**Trap:** without keepdims the `(rows,)` sum broadcasts against columns, not rows."
      ],
      commonMistakes: [
        "Dividing by `a.sum(axis=1)` (shape `(rows,)`) and getting a broadcast error or wrong normalization.",
        "Forgetting to guard rows that sum to zero before dividing."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "argmax-argmin-per-row",
      num: 3,
      title: "Find the index of the max/min (argmax, argmin) per row",
      difficulty: "Easy",
      category: "Aggregation & Axis",
      importance: "essential",
      meta: { pattern: "Arg-reduction", technique: "argmax / argmin", functions: "np.argmax, np.argmin" },
      description:
        "Return the **position** of the largest value in each row with `argmax(axis=1)`, and the position of the smallest with `argmin(axis=1)`. Note that `argmax` with no axis gives a single index into the **flattened** array.",
      notes: [
        "`argmax`/`argmin` return **indices**, not the values themselves — index back in if you need the value.",
        "On ties, `argmax` returns the index of the **first** maximum."
      ],
      examples: [
        {
          input: "c = [[3,7,2],[9,1,6]]; c.argmax(axis=1)",
          output: "[1 0]",
          reasoning: "Row 0's max 7 sits at index 1; row 1's max 9 sits at index 0."
        },
        {
          input: "c.argmax()",
          output: "3",
          reasoning: "No axis flattens to [3,7,2,9,1,6]; the max 9 is at flat index 3."
        }
      ],
      approaches: [
        {
          name: "argmax/argmin along an axis",
          whenToUse: "Picking the winning class per sample, the best column per row, or nearest neighbor index.",
          logic:
            "**What it asks.** Get the index of the extreme value along a chosen axis.\n\n" +
            "**Key idea.** `argmax` is a reduction that returns a **position** instead of a value; `axis=1` collapses each row to the index of that row's maximum.\n\n" +
            "**Step by step.**\n" +
            "1. `c.argmax(axis=1)` → for each row, the column index of its max.\n" +
            "2. `c.argmin(axis=1)` → same for the minimum.\n" +
            "3. `c.argmax()` (no axis) → one index into the flattened array.\n\n" +
            "**Why it works.** Like any reduction it removes the named axis; the emitted value is the offset where the extreme occurred rather than the extreme itself.\n\n" +
            "**Gotchas.**\n" +
            "- Returns an index — to fetch the value use `c[np.arange(len(c)), c.argmax(axis=1)]` or `c.max(axis=1)`.\n" +
            "- Ties resolve to the **first** occurrence.\n" +
            "- With no axis you get a flat index; convert with `np.unravel_index` if you need row/col.\n\n" +
            "**Interview mindset.** 'argmax gives the where, max gives the what — I pick argmax when I need the position (e.g. predicted label).'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "c = np.array([[3, 7, 2], [9, 1, 6]])\n" +
            "print(c.argmax(axis=1))   # index of each row's max: [1 0]\n" +
            "print(c.argmin(axis=1))   # index of each row's min: [2 1]\n" +
            "print(c.argmax())         # flat index of global max (9): 3",
          plain:
            "import numpy as np\n" +
            "\n" +
            "c = np.array([[3, 7, 2], [9, 1, 6]])\n" +
            "print(c.argmax(axis=1))\n" +
            "print(c.argmin(axis=1))\n" +
            "print(c.argmax())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'which one is largest', 'index of the max', 'predicted class', 'position of best'.",
        "**Say it:** `argmax(axis=1)` for the per-row index; `max(axis=1)` for the per-row value.",
        "**Trap:** it returns an index (ties → first); no axis → flat index."
      ],
      commonMistakes: [
        "Using the argmax result as if it were the max value instead of an index.",
        "Forgetting `argmax()` with no axis indexes the flattened array, not a row."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "cumsum-cumprod-running",
      num: 4,
      title: "Running totals with cumulative sum and product",
      difficulty: "Easy",
      category: "Aggregation & Axis",
      importance: "common",
      meta: { pattern: "Scan", technique: "Cumulative reduction", functions: "np.cumsum, np.cumprod" },
      description:
        "Produce a **running total** with `np.cumsum` and a running product with `np.cumprod`. Unlike `sum`, a cumulative op keeps the array's length — element i holds the aggregate of everything up to and including i.",
      notes: [
        "`cumsum`/`cumprod` return an array the **same length** as the input, not a scalar.",
        "On a 2-D array pass `axis` to accumulate down columns (`axis=0`) or across rows (`axis=1`)."
      ],
      examples: [
        {
          input: "np.cumsum([10, 20, 30, 40])",
          output: "[ 10  30  60 100]",
          reasoning: "Running total: 10, 10+20, 10+20+30, 10+20+30+40."
        },
        {
          input: "np.cumprod([1, 2, 3, 4])",
          output: "[ 1  2  6 24]",
          reasoning: "Running product: 1, 1*2, 1*2*3, 1*2*3*4 (a factorial sequence)."
        }
      ],
      approaches: [
        {
          name: "cumsum / cumprod (prefix scan)",
          whenToUse: "Running balances, cumulative distributions, factorial-style products, prefix sums for range queries.",
          logic:
            "**What it asks.** Emit the aggregate-so-far at every position, not just the final total.\n\n" +
            "**Key idea.** A cumulative op is a **scan**: output[i] combines input[0..i]. It preserves length instead of collapsing an axis.\n\n" +
            "**Step by step.**\n" +
            "1. `np.cumsum(x)` → each slot = sum of all earlier slots plus itself.\n" +
            "2. `np.cumprod(x)` → each slot = product of all earlier slots plus itself.\n" +
            "3. For 2-D, add `axis=` to scan along one direction.\n\n" +
            "**Why it works.** The scan carries a running accumulator left to right, writing it out at each step — so the last element equals the plain `sum`/`prod`.\n\n" +
            "**Gotchas.**\n" +
            "- Output length equals input length (it is not a scalar like `sum`).\n" +
            "- On a 2-D array with no `axis`, NumPy flattens first, then scans — usually not what you want.\n" +
            "- `cumprod` overflows fast on integers; cast to float for long sequences.\n\n" +
            "**Interview mindset.** 'cumsum is a prefix scan — same length, running aggregate; the last value matches sum.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([10, 20, 30, 40])\n" +
            "print(np.cumsum(x))    # running total: [10 30 60 100]\n" +
            "print(np.cumprod([1, 2, 3, 4]))   # running product: [1 2 6 24]\n" +
            "\n" +
            "m = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(np.cumsum(m, axis=1))       # running total across each row",
          plain:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([10, 20, 30, 40])\n" +
            "print(np.cumsum(x))\n" +
            "print(np.cumprod([1, 2, 3, 4]))\n" +
            "\n" +
            "m = np.array([[1, 2, 3], [4, 5, 6]])\n" +
            "print(np.cumsum(m, axis=1))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'running total', 'cumulative', 'balance over time', 'prefix sum'.",
        "**Say it:** `np.cumsum` / `np.cumprod` — same length, aggregate-so-far at each index.",
        "**Trap:** no `axis` on 2-D flattens first; integer `cumprod` overflows."
      ],
      commonMistakes: [
        "Expecting `cumsum` to return a single number like `sum`.",
        "Running `cumsum` on a 2-D array without `axis` and getting a flattened scan."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "nanmean-nansum-vs-nan",
      num: 5,
      title: "Aggregate data with missing values (nanmean, nansum)",
      difficulty: "Medium",
      category: "Aggregation & Axis",
      importance: "common",
      meta: { pattern: "Missing data", technique: "NaN-aware reduction", functions: "np.nanmean, np.nansum, np.isnan" },
      description:
        "A single `NaN` (not-a-number) poisons a plain `mean` — the whole result becomes `nan`. Use the NaN-aware reductions `np.nanmean` and `np.nansum`, which skip missing entries, and contrast them with the ordinary `mean`.",
      notes: [
        "Any arithmetic touching `NaN` yields `NaN`, so `arr.mean()` returns `nan` if even one element is missing.",
        "`np.nanmean` averages only the non-NaN values (it divides by the count of present values, not the full length)."
      ],
      examples: [
        {
          input: "f = [1.0, 2.0, nan, 4.0]; f.mean()",
          output: "nan",
          reasoning: "The NaN propagates through the sum, so the plain mean is nan."
        },
        {
          input: "np.nanmean(f)",
          output: "2.3333",
          reasoning: "NaN is skipped: (1+2+4)/3 = 7/3 ≈ 2.3333, dividing by the 3 present values."
        }
      ],
      approaches: [
        {
          name: "nanmean / nansum (skip missing)",
          whenToUse: "Real-world data with gaps — sensor dropouts, blank survey fields, unmatched joins.",
          logic:
            "**What it asks.** Aggregate an array that contains missing entries without letting them corrupt the result.\n\n" +
            "**Key idea.** Plain reductions propagate `NaN`; the `nan*` family ignores `NaN` and reduces over the present values only.\n\n" +
            "**Step by step.**\n" +
            "1. `f.mean()` → `nan` because the NaN contaminates the sum.\n" +
            "2. `np.nanmean(f)` → average of the non-NaN values (divides by the present count).\n" +
            "3. `np.nansum(f)` → sum treating each NaN as 0.\n\n" +
            "**Why it works.** IEEE-754 makes any operation with `NaN` return `NaN`; the `nan*` functions mask those slots out before combining.\n\n" +
            "**Gotchas.**\n" +
            "- `nanmean` of an all-NaN slice still returns `nan` (and warns) — nothing to average.\n" +
            "- `nansum` treats NaN as 0, so an all-NaN array sums to `0.0`, which may hide the fact that everything was missing.\n" +
            "- `NaN != NaN`, so test with `np.isnan`, never `== np.nan`.\n\n" +
            "**Interview mindset.** 'One NaN poisons a normal reduction; switch to `nanmean`/`nansum` (or mask first) when data has gaps.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "f = np.array([1.0, 2.0, np.nan, 4.0])\n" +
            "print(f.mean())               # nan -> one NaN poisons the whole mean\n" +
            "print(round(np.nanmean(f), 4))  # skips NaN: 7/3 = 2.3333\n" +
            "print(np.nansum(f))           # NaN treated as 0: 7.0\n" +
            "print(np.isnan(f))            # locate missing values (== np.nan never works)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "f = np.array([1.0, 2.0, np.nan, 4.0])\n" +
            "print(f.mean())\n" +
            "print(round(np.nanmean(f), 4))\n" +
            "print(np.nansum(f))\n" +
            "print(np.isnan(f))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'missing values', 'NaN', 'gaps in the data', 'mean keeps returning nan'.",
        "**Say it:** plain reductions propagate NaN; use `np.nanmean` / `np.nansum` to skip them.",
        "**Trap:** all-NaN → nanmean is nan / nansum is 0; test with `np.isnan`, not `==`."
      ],
      commonMistakes: [
        "Expecting `arr.mean()` to ignore NaNs automatically.",
        "Comparing with `x == np.nan` (always False) instead of `np.isnan(x)`."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "count-and-share-via-boolean",
      num: 6,
      title: "Count and share of elements meeting a condition",
      difficulty: "Easy",
      category: "Aggregation & Axis",
      importance: "essential",
      meta: { pattern: "Boolean reduction", technique: "sum/mean on a mask", functions: "arr.sum, arr.mean, comparison" },
      description:
        "Count how many elements exceed a threshold with `(arr > k).sum()`, and get the **fraction** that do with `(arr > k).mean()`. A boolean mask sums as 1s and 0s, so its sum is a count and its mean is a proportion.",
      notes: [
        "A comparison produces a boolean array; `True` counts as 1 and `False` as 0 under arithmetic.",
        "`mask.sum()` = how many are True; `mask.mean()` = the share that are True (in [0, 1])."
      ],
      examples: [
        {
          input: "g = [1,5,8,3,10,6]; (g > 5).sum()",
          output: "3",
          reasoning: "Values above 5 are 8, 10, 6 → three of them, so the boolean mask sums to 3."
        },
        {
          input: "(g > 5).mean()",
          output: "0.5",
          reasoning: "3 of 6 elements are above 5, so the mean of the mask is 3/6 = 0.5."
        }
      ],
      approaches: [
        {
          name: "sum/mean on a boolean mask",
          whenToUse: "Counting matches, computing hit rates, pass/fail percentages, or per-row counts with an axis.",
          logic:
            "**What it asks.** Count matching elements and the proportion that match.\n\n" +
            "**Key idea.** A comparison yields a boolean array; under arithmetic `True==1` and `False==0`, so `sum` is the count and `mean` is the share.\n\n" +
            "**Step by step.**\n" +
            "1. `mask = arr > k` → boolean array of matches.\n" +
            "2. `mask.sum()` → number of True entries (the count).\n" +
            "3. `mask.mean()` → count / total (the fraction in [0, 1]).\n\n" +
            "**Why it works.** Booleans upcast to integers in numeric reductions, so summing the mask literally tallies the 1s and averaging divides that tally by the element count.\n\n" +
            "**Gotchas.**\n" +
            "- Combine conditions with `&` / `|` and parenthesize each: `(arr > 2) & (arr < 8)` (not Python `and`).\n" +
            "- Add `axis=` for per-row/column counts, e.g. `(arr > k).sum(axis=1)`.\n" +
            "- `mean` gives a proportion, not a percentage — multiply by 100 if you want percent.\n\n" +
            "**Interview mindset.** 'sum a mask to count, mean a mask for the rate — no explicit loop or filter needed.'",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "g = np.array([1, 5, 8, 3, 10, 6])\n" +
            "print((g > 5).sum())    # count above 5: 3 (True==1)\n" +
            "print((g > 5).mean())   # share above 5: 0.5 (3 of 6)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "g = np.array([1, 5, 8, 3, 10, 6])\n" +
            "print((g > 5).sum())\n" +
            "print((g > 5).mean())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many are greater than', 'what fraction', 'hit rate', 'percentage passing'.",
        "**Say it:** `(arr > k).sum()` counts, `(arr > k).mean()` gives the share.",
        "**Trap:** combine masks with `&`/`|` and parentheses, not `and`/`or`."
      ],
      commonMistakes: [
        "Using Python `and`/`or` on arrays instead of `&`/`|` with parentheses.",
        "Reading `(arr > k).mean()` as a percentage rather than a 0–1 proportion."
      ]
    }

  ]);
})();
