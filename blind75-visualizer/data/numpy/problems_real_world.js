/*
 * NumPy Interview Lab — Real-World Patterns
 * =========================================================================
 * Feature-engineering / data-prep tasks a data engineer actually hits:
 * scaling, encoding, smoothing, frequency counts, binning, and outlier
 * capping. Same schema and LOGIC format as problems_arrays_creation.js.
 *
 * Registers on the global registry:
 *     window.NUMPY.register("Real-World Patterns", [ ...problems ]);
 *
 * Every rcs (commented) and plain (clean) snippet is self-contained runnable
 * NumPy that starts with `import numpy as np` and prints; both were executed
 * against NumPy before commit.
 * =========================================================================
 */
(function () {
  window.NUMPY.register("Real-World Patterns", [

    // ------------------------------------------------------------------ Q1
    {
      id: "min-max-normalize",
      num: 1,
      title: "Min-max normalize a feature column to [0, 1]",
      difficulty: "Medium",
      category: "Real-World Patterns",
      importance: "essential",
      meta: { pattern: "Feature scaling", technique: "Vectorized rescale", functions: "arr.min, arr.max, broadcasting" },
      description:
        "Scale a numeric feature so every value lands in `[0, 1]`: subtract the column minimum, then divide by the range (max − min). This is the standard min-max scaler used before feeding features to distance- or gradient-based models.",
      notes: [
        "Formula: `(x - min) / (max - min)` — the min maps to 0 and the max to 1.",
        "Guard against a constant column: `max == min` makes the denominator 0."
      ],
      examples: [
        {
          input: "col = [10, 20, 30, 40, 50]",
          output: "[0.   0.25 0.5  0.75 1.  ]",
          reasoning: "min=10, max=50, range=40; (30-10)/40 = 0.5, and the endpoints map to 0 and 1."
        }
      ],
      approaches: [
        {
          name: "Vectorized (x - min) / (max - min)",
          whenToUse: "Standard preprocessing when you need bounded features in [0, 1] (neural nets, kNN, clustering).",
          logic:
            "**What it asks.** Rescale a feature column so its smallest value becomes 0 and its largest becomes 1.\n\n" +
            "**Key idea.** Shift by the min, then squash by the range — both are single reductions plus broadcasting, no loop.\n\n" +
            "**Step by step.**\n" +
            "1. Compute `lo = col.min()` and `hi = col.max()`.\n" +
            "2. Subtract `lo` from every element (broadcast).\n" +
            "3. Divide by `hi - lo`.\n\n" +
            "**Why it works.** The affine map `(x-lo)/(hi-lo)` sends `lo→0` and `hi→1` and is monotonic, so ordering and relative spacing are preserved.\n\n" +
            "**Gotchas.**\n" +
            "- A constant column gives `hi - lo == 0` → division by zero (NaN/inf); special-case it.\n" +
            "- Fit `lo`/`hi` on the training split only, then reuse them on validation/test to avoid leakage.\n" +
            "- Outliers stretch the range and compress everyone else toward 0 — consider robust scaling if they exist.\n\n" +
            "**Interview mindset.** 'Min-max is one affine transform; state the constant-column guard and the train/test leakage point.'",
          perfNote: "Two O(n) reductions plus one O(n) broadcast pass — all in C, no Python loop.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "col = np.array([10.0, 20.0, 30.0, 40.0, 50.0])\n" +
            "lo, hi = col.min(), col.max()          # column stats\n" +
            "scaled = (col - lo) / (hi - lo)        # affine map -> [0, 1]\n" +
            "print(np.round(scaled, 3))",
          plain:
            "import numpy as np\n" +
            "\n" +
            "col = np.array([10.0, 20.0, 30.0, 40.0, 50.0])\n" +
            "lo, hi = col.min(), col.max()\n" +
            "scaled = (col - lo) / (hi - lo)\n" +
            "print(np.round(scaled, 3))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'scale to [0, 1]', 'normalize the feature', 'bounded input for the model'.",
        "**Say it:** `(x - x.min()) / (x.max() - x.min())`, fit min/max on train only.",
        "**Trap:** constant column → divide-by-zero; outliers distort the range."
      ],
      commonMistakes: [
        "Refitting min/max on the test set (data leakage).",
        "Ignoring the constant-column case and producing NaNs."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "one-hot-encode-labels",
      num: 2,
      title: "One-hot encode an integer label array",
      difficulty: "Medium",
      category: "Real-World Patterns",
      importance: "essential",
      meta: { pattern: "Categorical encoding", technique: "Identity-matrix fancy index", functions: "np.eye, fancy indexing" },
      description:
        "Turn a 1-D array of integer class labels into a one-hot matrix where row *i* has a single 1 in the column of its label. The trick: index the identity matrix `np.eye(n_classes)` with the label array.",
      notes: [
        "`np.eye(n)[labels]` picks one identity row per label — that row *is* its one-hot vector.",
        "Labels must be 0-based contiguous integers; map arbitrary categories to `0..n-1` first."
      ],
      examples: [
        {
          input: "labels = [0, 2, 1, 2, 0], n_classes = 3",
          output: "[[1 0 0]\n [0 0 1]\n [0 1 0]\n [0 0 1]\n [1 0 0]]",
          reasoning: "Row for label 0 → identity row 0, label 2 → identity row 2, etc. One 1 per row."
        }
      ],
      approaches: [
        {
          name: "np.eye(n)[labels] fancy index",
          whenToUse: "Encoding a small, fixed set of integer classes into model-ready one-hot columns.",
          logic:
            "**What it asks.** Expand each integer label into a binary indicator vector of length `n_classes`.\n\n" +
            "**Key idea.** Row *k* of the identity matrix is exactly the one-hot vector for class *k* — so fancy-indexing `eye` by the labels gathers them all at once.\n\n" +
            "**Step by step.**\n" +
            "1. Build `np.eye(n_classes)` (each row is one one-hot pattern).\n" +
            "2. Index it with the label array: `np.eye(n_classes)[labels]`.\n" +
            "3. Result shape is `(len(labels), n_classes)`.\n\n" +
            "**Why it works.** Fancy indexing with an array of row numbers returns those rows in order, and identity rows are precisely the standard basis vectors.\n\n" +
            "**Gotchas.**\n" +
            "- Labels must be integers in `0..n_classes-1`; a label ≥ `n_classes` raises `IndexError`.\n" +
            "- Non-integer or string categories need a `0..n-1` mapping (e.g. `np.unique(..., return_inverse=True)`) first.\n" +
            "- Use `dtype=int` on `eye` if you want an integer matrix rather than floats.\n\n" +
            "**Interview mindset.** 'One-hot = identity rows gathered by label; mention the contiguous-integer requirement.'",
          perfNote: "One fancy-index gather, O(len(labels) * n_classes) writes, fully vectorized.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "labels = np.array([0, 2, 1, 2, 0])\n" +
            "n_classes = 3\n" +
            "onehot = np.eye(n_classes, dtype=int)[labels]  # gather identity rows\n" +
            "print(onehot)",
          plain:
            "import numpy as np\n" +
            "\n" +
            "labels = np.array([0, 2, 1, 2, 0])\n" +
            "n_classes = 3\n" +
            "onehot = np.eye(n_classes, dtype=int)[labels]\n" +
            "print(onehot)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'one-hot', 'dummy variables', 'indicator columns from a label'.",
        "**Say it:** `np.eye(n_classes)[labels]` — each label gathers its identity row.",
        "**Trap:** labels must be 0-based contiguous ints; map categories first."
      ],
      commonMistakes: [
        "Passing raw string/arbitrary-int categories without remapping to 0..n-1.",
        "Setting `n_classes` too small so a valid label indexes out of bounds."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "moving-average",
      num: 3,
      title: "Compute a moving average (convolve vs cumsum)",
      difficulty: "Hard",
      category: "Real-World Patterns",
      importance: "common",
      meta: { pattern: "Windowed smoothing", technique: "Sliding-window mean", functions: "np.convolve, np.cumsum, np.insert" },
      description:
        "Smooth a 1-D signal with a length-`w` sliding-window mean. Show two vectorized ways: `np.convolve` with a uniform kernel (`mode='valid'`), and the O(n) prefix-sum (cumsum) trick that avoids the kernel's cost entirely.",
      notes: [
        "A window of `w` over `n` points yields `n - w + 1` outputs in `valid` mode.",
        "The cumsum trick uses the identity `sum(x[i:i+w]) = C[i+w] - C[i]` where `C` is the prefix sum."
      ],
      examples: [
        {
          input: "x = [1,2,3,4,5,6], w = 3",
          output: "[2. 3. 4. 5.]",
          reasoning: "Means of each length-3 window: (1+2+3)/3=2, (2+3+4)/3=3, (3+4+5)/3=4, (4+5+6)/3=5."
        }
      ],
      approaches: [
        {
          name: "np.convolve with a uniform kernel",
          whenToUse: "Readable, direct smoothing when the signal is short-to-moderate and clarity beats raw speed.",
          logic:
            "**What it asks.** Replace each point with the mean of its surrounding length-`w` window.\n\n" +
            "**Key idea.** Convolving with a kernel of `w` copies of `1/w` computes exactly the windowed average; `mode='valid'` keeps only fully-overlapping positions.\n\n" +
            "**Step by step.**\n" +
            "1. Build `kernel = np.ones(w) / w`.\n" +
            "2. `np.convolve(x, kernel, mode='valid')`.\n" +
            "3. Get `n - w + 1` averaged points.\n\n" +
            "**Why it works.** Discrete convolution slides the kernel over `x`, and a uniform kernel makes each output the plain mean of the covered window.\n\n" +
            "**Gotchas.**\n" +
            "- `mode='same'` returns length `n` but the edges are averaged over partial (zero-padded) windows — misleading unless you want that.\n" +
            "- Convolution is O(n·w); for a large window prefer the cumsum trick.\n\n" +
            "**Interview mindset.** 'Uniform kernel + convolve = moving average; call out the edge/mode behavior.'",
          perfNote: "O(n·w) direct convolution — fine for small w, quadratic-ish as w grows.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])\n" +
            "w = 3\n" +
            "kernel = np.ones(w) / w                       # uniform weights\n" +
            "ma = np.convolve(x, kernel, mode='valid')     # n - w + 1 outputs\n" +
            "print(np.round(ma, 3))",
          plain:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])\n" +
            "w = 3\n" +
            "kernel = np.ones(w) / w\n" +
            "ma = np.convolve(x, kernel, mode='valid')\n" +
            "print(np.round(ma, 3))"
        },
        {
          name: "Prefix-sum (cumsum) trick — O(n)",
          whenToUse: "Large arrays and/or large windows where you want linear time regardless of `w`.",
          logic:
            "**What it asks.** Same windowed mean, but in time independent of the window size.\n\n" +
            "**Key idea.** With a prefix sum `C`, any window sum is one subtraction: `C[i+w] - C[i]`. Divide by `w` for the mean.\n\n" +
            "**Step by step.**\n" +
            "1. Prepend a 0 and take the cumulative sum: `C = np.cumsum(np.insert(x, 0, 0))`.\n" +
            "2. Window sums = `C[w:] - C[:-w]`.\n" +
            "3. Divide by `w`.\n\n" +
            "**Why it works.** `C[k] = x[0] + ... + x[k-1]`, so `C[i+w] - C[i]` telescopes to exactly the sum of `x[i:i+w]` — computed once each, hence O(n) total.\n\n" +
            "**Gotchas.**\n" +
            "- The leading 0 (`np.insert(x, 0, 0)`) is what aligns the slices; drop it and you are off by one.\n" +
            "- Very long sums in float32 can accumulate error — use float64 for long signals.\n\n" +
            "**Interview mindset.** 'Prefix sums turn every window into an O(1) subtraction — the linear-time moving average.'",
          perfNote: "O(n): one cumsum pass plus one vectorized subtraction, independent of w.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])\n" +
            "w = 3\n" +
            "c = np.cumsum(np.insert(x, 0, 0.0))  # prefix sums with a leading 0\n" +
            "ma = (c[w:] - c[:-w]) / w            # window sum via subtraction\n" +
            "print(np.round(ma, 3))",
          plain:
            "import numpy as np\n" +
            "\n" +
            "x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])\n" +
            "w = 3\n" +
            "c = np.cumsum(np.insert(x, 0, 0.0))\n" +
            "ma = (c[w:] - c[:-w]) / w\n" +
            "print(np.round(ma, 3))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'moving/rolling average', 'smooth the signal', 'window mean'.",
        "**Say it:** small → `np.convolve(x, np.ones(w)/w, 'valid')`; large → cumsum trick `(C[w:]-C[:-w])/w`.",
        "**Trap:** `valid` gives n-w+1 points; the cumsum trick needs the leading 0."
      ],
      commonMistakes: [
        "Forgetting the leading 0 in the cumsum trick and getting an off-by-one window.",
        "Using `mode='same'` and treating the zero-padded edge values as true averages."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "unique-value-counts",
      num: 4,
      title: "Value frequencies with np.unique(return_counts=True)",
      difficulty: "Medium",
      category: "Real-World Patterns",
      importance: "essential",
      meta: { pattern: "Frequency counts", technique: "Sort-based grouping", functions: "np.unique, argmax" },
      description:
        "Get the frequency of each distinct value in an array — a `value_counts` in one call. `np.unique(arr, return_counts=True)` returns the sorted unique values alongside how many times each appears; `argmax` on the counts finds the mode.",
      notes: [
        "The returned unique values are always **sorted ascending**, and counts line up positionally.",
        "`return_counts=True` is the NumPy equivalent of pandas' `value_counts()`."
      ],
      examples: [
        {
          input: "arr = [3, 1, 2, 3, 3, 1]",
          output: "values [1 2 3]\ncounts [2 1 3]\nmode 3",
          reasoning: "1 appears twice, 2 once, 3 three times; sorted values with aligned counts, mode = value with max count."
        }
      ],
      approaches: [
        {
          name: "np.unique(return_counts=True) + argmax",
          whenToUse: "Class-balance checks, histogramming discrete labels, finding the most common value.",
          logic:
            "**What it asks.** Report each distinct value and its frequency, then the most frequent one.\n\n" +
            "**Key idea.** `np.unique` sorts and de-duplicates in one pass; `return_counts` hands back the run lengths so values and counts stay index-aligned.\n\n" +
            "**Step by step.**\n" +
            "1. `vals, counts = np.unique(arr, return_counts=True)`.\n" +
            "2. `vals` is sorted; `counts[i]` is the frequency of `vals[i]`.\n" +
            "3. `vals[counts.argmax()]` is the mode.\n\n" +
            "**Why it works.** After sorting, identical values sit adjacently, so counting is just measuring run lengths — done in C.\n\n" +
            "**Gotchas.**\n" +
            "- Output is sorted by value, **not** by frequency; sort by `counts` yourself for a top-k.\n" +
            "- `argmax` breaks ties by returning the first (smallest-value) mode.\n" +
            "- NaNs are tricky — each NaN can count as distinct; clean them first.\n\n" +
            "**Interview mindset.** 'That is `value_counts` in NumPy; note the output is value-sorted, not count-sorted.'",
          perfNote: "O(n log n) — dominated by the internal sort.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([3, 1, 2, 3, 3, 1])\n" +
            "vals, counts = np.unique(arr, return_counts=True)  # sorted + aligned\n" +
            "print(vals)\n" +
            "print(counts)\n" +
            "print(vals[counts.argmax()])                       # mode\n",
          plain:
            "import numpy as np\n" +
            "\n" +
            "arr = np.array([3, 1, 2, 3, 3, 1])\n" +
            "vals, counts = np.unique(arr, return_counts=True)\n" +
            "print(vals)\n" +
            "print(counts)\n" +
            "print(vals[counts.argmax()])\n"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many of each', 'value counts', 'most common value / mode'.",
        "**Say it:** `vals, counts = np.unique(arr, return_counts=True)`; mode = `vals[counts.argmax()]`.",
        "**Trap:** result is sorted by value, not by count."
      ],
      commonMistakes: [
        "Assuming the output is ordered by frequency (it is ordered by value).",
        "Letting NaNs inflate the unique count instead of cleaning them first."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "bin-continuous-values",
      num: 5,
      title: "Bin continuous values (digitize vs histogram)",
      difficulty: "Medium",
      category: "Real-World Patterns",
      importance: "common",
      meta: { pattern: "Discretization", technique: "Binning by edges", functions: "np.digitize, np.histogram" },
      description:
        "Bucket continuous measurements into discrete bins. `np.digitize` labels each value with the index of the bin it falls in (great for turning a numeric feature into a categorical one); `np.histogram` returns the per-bin counts.",
      notes: [
        "`np.digitize(x, edges)` returns, per value, how many edges it exceeds — a 1-based bin index for interior points.",
        "`np.histogram(x, bins=edges)` returns `(counts, edges)`; its rightmost bin is closed on both sides."
      ],
      examples: [
        {
          input: "data = [0.1,0.5,1.2,2.7,3.9,5.0], edges = [0,1,2,3,4]",
          output: "digitize [1 1 2 3 4 5]\nhist counts [2 1 1 1 1]",
          reasoning: "0.1 & 0.5 fall in bin 1; 1.2 in bin 2; 2.7 in 3; 3.9 in 4; 5.0 is past the last edge → bin 5."
        }
      ],
      approaches: [
        {
          name: "digitize (labels) & histogram (counts)",
          whenToUse: "digitize to convert a numeric column into ordinal bin labels; histogram to summarize a distribution.",
          logic:
            "**What it asks.** Assign each value to a bin, and separately count how many values land in each bin.\n\n" +
            "**Key idea.** Both work off monotonically increasing edges: `digitize` returns a per-value index, `histogram` aggregates those into counts.\n\n" +
            "**Step by step.**\n" +
            "1. Define increasing `edges`.\n" +
            "2. `np.digitize(data, edges)` → bin index per value.\n" +
            "3. `np.histogram(data, bins=[...])` → `(counts, edges)`.\n\n" +
            "**Why it works.** Sorted edges let each value's bin be found by binary search (`searchsorted` under the hood), so both are fast and consistent.\n\n" +
            "**Gotchas.**\n" +
            "- `digitize` indices are **1-based** for interior values; index 0 means below the first edge and `len(edges)` means at/above the last.\n" +
            "- Bins are half-open `[left, right)`, **except** histogram's last bin which includes the right endpoint.\n" +
            "- Flip `right=True` in `digitize` to make intervals `(left, right]` instead.\n\n" +
            "**Interview mindset.** 'digitize = per-value bin label, histogram = counts; watch the half-open edges and the 1-based index.'",
          perfNote: "O(n log b) for b edges via binary search per value.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "data = np.array([0.1, 0.5, 1.2, 2.7, 3.9, 5.0])\n" +
            "edges = np.array([0.0, 1.0, 2.0, 3.0, 4.0])\n" +
            "idx = np.digitize(data, edges)               # 1-based bin per value\n" +
            "print(idx)\n" +
            "counts, _ = np.histogram(data, bins=[0, 1, 2, 3, 4, 5])  # per-bin counts\n" +
            "print(counts)\n",
          plain:
            "import numpy as np\n" +
            "\n" +
            "data = np.array([0.1, 0.5, 1.2, 2.7, 3.9, 5.0])\n" +
            "edges = np.array([0.0, 1.0, 2.0, 3.0, 4.0])\n" +
            "idx = np.digitize(data, edges)\n" +
            "print(idx)\n" +
            "counts, _ = np.histogram(data, bins=[0, 1, 2, 3, 4, 5])\n" +
            "print(counts)\n"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'bucket the values', 'bin the feature', 'distribution counts'.",
        "**Say it:** `np.digitize(x, edges)` for per-value labels; `np.histogram(x, bins)` for counts.",
        "**Trap:** digitize is 1-based; bins are half-open except histogram's last bin."
      ],
      commonMistakes: [
        "Treating digitize's index as 0-based and mislabeling every bin.",
        "Forgetting histogram's final bin is closed on the right, so an edge value lands there."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "cap-outliers-percentile",
      num: 6,
      title: "Cap outliers at a percentile threshold (winsorize)",
      difficulty: "Medium",
      category: "Real-World Patterns",
      importance: "common",
      meta: { pattern: "Outlier handling", technique: "Percentile clip", functions: "np.percentile, np.clip, np.where" },
      description:
        "Tame extreme values by capping anything above a high percentile at that threshold (one-sided winsorizing). Compute the cutoff with `np.percentile`, then apply it with `np.clip` — or equivalently `np.where` — so outliers are pulled down to the cap instead of dropped.",
      notes: [
        "`np.percentile(x, 95)` is the value below which ~95% of the data lies.",
        "`np.clip(x, None, cap)` caps the upper side only; `np.where(x > cap, cap, x)` does the same thing explicitly."
      ],
      examples: [
        {
          input: "vals = [10,11,...,18, 500], cap = 95th pct",
          output: "cap 283.1\nclipped [ 10. 11. ... 18. 283.1]",
          reasoning: "The 500 outlier is pulled down to the 95th-percentile cap 283.1; every in-range value is untouched."
        }
      ],
      approaches: [
        {
          name: "np.percentile + np.clip (with np.where equivalent)",
          whenToUse: "Robustifying a feature against a few extreme values without discarding rows.",
          logic:
            "**What it asks.** Replace values above a chosen percentile with that percentile, leaving the rest unchanged.\n\n" +
            "**Key idea.** Pick the threshold from the data itself (`np.percentile`), then squash the tail into it with a single vectorized cap.\n\n" +
            "**Step by step.**\n" +
            "1. `cap = np.percentile(vals, 95)`.\n" +
            "2. `np.clip(vals, None, cap)` — `None` leaves the lower bound open.\n" +
            "3. `np.where(vals > cap, cap, vals)` gives the identical result, more explicitly.\n\n" +
            "**Why it works.** `clip` maps anything over `cap` to `cap` element-wise; `where` selects `cap` where the mask is true and the original elsewhere — same mapping, two spellings.\n\n" +
            "**Gotchas.**\n" +
            "- `np.percentile` interpolates by default, so the cap can be a non-data value (e.g. 283.1) — that's expected.\n" +
            "- Fit the percentile on training data and reuse the cap on new data to avoid leakage.\n" +
            "- For both tails, clip with a low and high percentile: `np.clip(x, lo, hi)`.\n\n" +
            "**Interview mindset.** 'Winsorize = percentile threshold + clip; clip and where are equivalent, and the cap is a fitted parameter.'",
          perfNote: "One O(n log n) percentile (internal sort) plus one O(n) clip/where pass.",
          rcs:
            "import numpy as np\n" +
            "\n" +
            "vals = np.array([10.0, 11.0, 12.0, 13.0, 14.0,\n" +
            "                 15.0, 16.0, 17.0, 18.0, 500.0])\n" +
            "cap = np.percentile(vals, 95)             # data-driven threshold\n" +
            "print(np.round(cap, 2))\n" +
            "clipped = np.clip(vals, None, cap)        # cap the upper tail\n" +
            "print(np.round(clipped, 2))\n" +
            "same = np.where(vals > cap, cap, vals)    # equivalent, explicit\n" +
            "print(np.round(same, 2))\n",
          plain:
            "import numpy as np\n" +
            "\n" +
            "vals = np.array([10.0, 11.0, 12.0, 13.0, 14.0,\n" +
            "                 15.0, 16.0, 17.0, 18.0, 500.0])\n" +
            "cap = np.percentile(vals, 95)\n" +
            "print(np.round(cap, 2))\n" +
            "clipped = np.clip(vals, None, cap)\n" +
            "print(np.round(clipped, 2))\n" +
            "same = np.where(vals > cap, cap, vals)\n" +
            "print(np.round(same, 2))\n"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'cap outliers', 'winsorize', 'clip at the 95th/99th percentile'.",
        "**Say it:** `cap = np.percentile(x, 95)`, then `np.clip(x, None, cap)` (or `np.where`).",
        "**Trap:** the percentile interpolates (cap may not be a real data value); fit it on train only."
      ],
      commonMistakes: [
        "Recomputing the percentile cap on test data instead of reusing the fitted one.",
        "Expecting the cap to always equal an observed value (percentile interpolation)."
      ]
    }

  ]);
})();
