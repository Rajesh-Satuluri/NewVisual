/*
 * data/numpy/concepts_broadcasting.js — NumPy "Learn" exemplar topic.
 * Registered into window.LEARN under the "numpy" stack. Runnable in-browser via
 * Pyodide (numpy auto-loads). Content grounded in NumPy's documented
 * broadcasting rules; teaching structure mirrors the Python lab.
 */
window.LEARN.register("numpy", "Operations", [
  {
    id: "broadcasting",
    title: "Broadcasting",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "How NumPy stretches a smaller array across a bigger one so you can do math without writing a single loop.",

    whatIsIt: [
      "<b>Broadcasting</b> is the rule NumPy uses to combine arrays of <b>different shapes</b> in an element-wise operation. Instead of looping, NumPy virtually <b>stretches</b> the smaller array to match the larger — without ever copying the data.",
      "The rule, applied to shapes <b>right-to-left</b>: two dimensions are compatible when they are <b>equal</b>, or one of them is <b>1</b>. A size-1 dimension is stretched to match; a missing dimension is treated as 1.",
      "This is what makes NumPy fast and readable: <code>prices * 1.1</code>, <code>matrix - column_mean</code>, or <code>a[:, None] + b[None, :]</code> all run in optimized C over the whole array at once, with no Python loop."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "# scalar broadcasts to every element\n" +
        "a = np.array([1, 2, 3])\n" +
        "print(a * 10)                 # [10 20 30]\n" +
        "\n" +
        "# (3,1) column + (3,) row  ->  (3,3) outer sum\n" +
        "col = np.array([[0], [10], [20]])   # shape (3,1)\n" +
        "row = np.array([1, 2, 3])           # shape (3,)\n" +
        "print(col + row)\n" +
        "# [[ 1  2  3]\n" +
        "#  [11 12 13]\n" +
        "#  [21 22 23]]\n" +
        "\n" +
        "# center each column of a matrix by its mean (no loop!)\n" +
        "m = np.array([[1., 2.], [3., 4.], [5., 6.]])   # (3,2)\n" +
        "print(m - m.mean(axis=0))     # mean is (2,) -> broadcast down the rows",
      caption:
        "Align shapes right-to-left; a dimension of 1 (or a missing one) stretches. (3,1)+(3,) → both become (3,3). m.mean(axis=0) is (2,), broadcast across all 3 rows to center each column."
    },

    whyMatters:
      "<p>Broadcasting is the difference between NumPy code that runs in C at array speed and a Python <code>for</code> loop that's 10–100× slower. Every vectorized data-prep step — normalizing features, applying per-column scales, computing pairwise distances, one-hot masks — leans on it.</p>" +
      "<p>It's also the mental model you carry straight into <b>Pandas</b> (a DataFrame minus a row-Series broadcasts the same way) and into ML libraries. Get the shape-alignment rule right and a whole class of \"how do I do this without a loop?\" problems collapses to one line.</p>" +
      "<pre class=\"why-pre\">pairwise = np.abs(x[:, None] - x[None, :])   # (n,1)-(1,n) -> (n,n) distance matrix</pre>",

    recognize: [
      { q: "\"apply this per-column / per-row scale or offset\"", think: "make the scale broadcastable: (n,) for columns, or (n,1) for rows via [:, None]" },
      { q: "\"I'm about to write a for-loop over array elements\"", think: "there's almost always a broadcast/vectorized form — stop and reshape instead" },
      { q: "\"outer product / all pairs of two vectors\"", think: "a[:, None] <op> b[None, :] → (n,m) grid" },
      { q: "\"ValueError: operands could not be broadcast together\"", think: "align shapes right-to-left; insert a size-1 axis with None/reshape where they disagree" }
    ],

    matchTags: ["broadcasting", "vectorization", "ufunc", "shape", "axis", "reshape", "newaxis", "elementwise"],

    traps: [
      {
        bad: "a = np.ones((3, 4))\nb = np.array([1, 2, 3])    # shape (3,)\na + b                      # ValueError: (3,4) vs (3,)",
        good: "a + b[:, None]             # b -> (3,1), broadcasts across the 4 columns",
        why: "Right-to-left alignment compares 4 with 3 — incompatible. To add b down the ROWS, give it shape (3,1) with b[:, None] so its 1 stretches across the columns."
      },
      {
        bad: "row_means = m.mean(axis=1)   # shape (n,)\nm - row_means                # wrong axis: (n,m) vs (n,) fails or misaligns",
        good: "m - m.mean(axis=1, keepdims=True)   # (n,1) broadcasts cleanly across columns",
        why: "keepdims=True preserves the reduced axis as size 1, so the result lines up for broadcasting. Without it you get a 1-D result that aligns to the wrong axis."
      },
      {
        bad: "big = np.zeros((10000, 10000))\nresult = big + big           # materializes a huge array",
        good: "# broadcasting itself makes NO copy — but the RESULT is full-size.\n# operate in-place / in chunks when the output is large: big += 1",
        why: "Broadcasting the inputs is free (no copy), but the OUTPUT array is fully materialized. For very large results, use in-place ops or process in chunks to avoid blowing up memory."
      }
    ],

    complexity: [
      { op: "scalar op (a * 5)", big_o: "O(n)", note: "One vectorized C pass over n elements; the scalar is not copied, just reused for every element." },
      { op: "broadcast (n,1)+(1,m)", big_o: "O(n·m) time, O(n·m) output", note: "Time and memory scale with the RESULT size, not the inputs — the two small arrays aren't copied, but the (n,m) result is materialized." },
      { op: "a[:, None] (add axis)", big_o: "O(1)", note: "Creates a view with a new size-1 axis; no data is copied, only strides/shape metadata change." },
      { op: "reduction with keepdims", big_o: "O(n)", note: "One pass to reduce; keepdims only affects the output shape (keeps a size-1 axis), not the cost." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A NumPy array is a flat memory buffer plus <b>shape</b> and <b>strides</b> metadata. Broadcasting a size-1 axis simply sets that axis's <b>stride to 0</b> — so the same memory is re-read for every position along it. That's why no copy happens and why it's so cheap.</p>" +
      "<p><code>a[:, None]</code> (equivalently <code>np.expand_dims(a, 1)</code> or <code>a.reshape(-1, 1)</code>) returns a <b>view</b>: it only rewrites shape/stride metadata. The operation's <b>output</b>, however, is a new contiguous array sized to the broadcast shape — that's where the memory goes.</p>",

    challenge: {
      prompt:
        "Given a (5, 3) matrix X, min-max normalize EACH COLUMN to [0, 1] in two vectorized lines (no loops). What shape must the per-column min and max have so they broadcast correctly? Run it and check every column's min is 0 and max is 1.",
      starter:
        "import numpy as np\n" +
        "X = np.array([[10., 1., 100.],\n" +
        "              [20., 3., 300.],\n" +
        "              [30., 2., 200.],\n" +
        "              [40., 5., 500.],\n" +
        "              [50., 4., 400.]])\n" +
        "# TODO: min-max normalize each column, then print result, result.min(0), result.max(0)\n",
      solution:
        "import numpy as np\n" +
        "X = np.array([[10.,1.,100.],[20.,3.,300.],[30.,2.,200.],[40.,5.,500.],[50.,4.,400.]])\n" +
        "mn = X.min(axis=0)          # shape (3,) — per-column min\n" +
        "mx = X.max(axis=0)          # shape (3,) — per-column max\n" +
        "norm = (X - mn) / (mx - mn) # (5,3)-(3,) broadcasts down every row\n" +
        "print(norm)\n" +
        "print(norm.min(axis=0))     # [0. 0. 0.]\n" +
        "print(norm.max(axis=0))     # [1. 1. 1.]\n" +
        "# (3,) aligns right-to-left with (5,3): the 3s match, and the column stats\n" +
        "# broadcast across all 5 rows."
    }
  }
]);
