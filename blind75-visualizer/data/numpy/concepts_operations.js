/*
 * data/numpy/concepts_operations.js — NumPy "Learn" topics for the Operations section.
 * Registered into window.LEARN under the "numpy" stack. Runnable in-browser via
 * Pyodide (numpy auto-loads). Content grounded in NumPy's documented ufunc and
 * reduction semantics; teaching structure mirrors the Broadcasting exemplar.
 */
window.LEARN.register("numpy", "Operations", [
  {
    id: "vectorized-ufuncs",
    title: "Vectorized Ops & ufuncs",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Do math on whole arrays at once — +, -, *, /, np.sqrt, np.where — in fast C, so you never write a Python loop over elements.",

    whatIsIt: [
      "A <b>ufunc</b> (universal function) is a function that operates <b>element-wise</b> over an entire array in compiled C. Every arithmetic operator (<code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>**</code>) and the math functions (<code>np.sqrt</code>, <code>np.exp</code>, <code>np.log</code>, <code>np.abs</code>) is a ufunc — one call touches every element, no Python loop involved.",
      "Comparisons (<code>a &gt; 0</code>, <code>a == b</code>) are ufuncs too: they return a <b>boolean array</b> the same shape as the input. Feed that mask to <code>np.where(cond, a, b)</code> — the <b>vectorized if/else</b> — to pick element-by-element between two values or arrays.",
      "Most ufuncs accept an <code>out=</code> argument that writes the result into an array you already own, <b>avoiding a fresh allocation</b>. This is how you keep tight memory loops from churning garbage.",
      "The rule of thumb: if you're about to loop over elements in Python, there is almost always a ufunc or a combination of them that does it in one line, orders of magnitude faster. Avoid <code>np.vectorize</code> — it is a convenience wrapper around a Python loop, <b>not</b> a speedup."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "a = np.array([1., 4., 9., 16.])\n" +
        "\n" +
        "# elementwise arithmetic — all ufuncs, no loops\n" +
        "print(a * 2 + 1)              # [ 3.  9. 19. 33.]\n" +
        "print(np.sqrt(a))            # [1. 2. 3. 4.]\n" +
        "\n" +
        "# comparison ufunc -> boolean mask\n" +
        "x = np.array([-2, -1, 0, 3, 5])\n" +
        "print(x > 0)                 # [False False False  True  True]\n" +
        "\n" +
        "# np.where(cond, a, b): vectorized if/else\n" +
        "print(np.where(x > 0, x, 0)) # clamp negatives to 0 -> [0 0 0 3 5]\n" +
        "\n" +
        "# out= writes into an existing buffer, no new allocation\n" +
        "buf = np.empty_like(a)\n" +
        "np.exp(a, out=buf)\n" +
        "print(buf[:2])               # [2.71828183e+00 5.45981500e+01]",
      caption:
        "Every operator and np.* math call runs in C over the whole array. x > 0 gives a boolean mask; np.where(cond, a, b) picks a where True, b where False. out=buf reuses memory instead of allocating a new result."
    },

    whyMatters:
      "<p>Vectorized ufuncs are the reason NumPy exists. A Python <code>for</code> loop pays interpreter overhead on <i>every</i> element; a ufunc drops into a tight C loop once and runs 10–100× faster. Feature scaling, activation functions, log-transforms, masking outliers — all of it is ufuncs.</p>" +
      "<p><code>np.where</code> replaces whole cascades of if/else logic with a single vectorized expression, and it composes: nest it, or combine masks with <code>&amp;</code> / <code>|</code> (use parentheses — they bind looser than comparisons).</p>" +
      "<ul>" +
      "<li><b>Elementwise math:</b> <code>np.sqrt</code>, <code>np.exp</code>, <code>np.log</code>, <code>np.abs</code>, <code>np.clip</code>.</li>" +
      "<li><b>Selection:</b> <code>np.where(cond, a, b)</code>, boolean indexing <code>a[a &gt; 0]</code>.</li>" +
      "<li><b>Memory:</b> <code>out=</code> for in-place results in hot paths.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">relu = np.where(x &gt; 0, x, 0)          # vectorized ReLU, no loop, no branch</pre>",

    recognize: [
      { q: "\"apply this formula to every element\"", think: "it's a ufunc expression — write it once on the whole array, no loop" },
      { q: "\"set values to X where a condition holds, else Y\"", think: "np.where(cond, X, Y) — vectorized if/else" },
      { q: "\"keep only elements that satisfy a condition\"", think: "build a boolean mask (a > 0) and index: a[a > 0]" },
      { q: "\"I need this to not allocate a new array each iteration\"", think: "use out= (or += / *=) to write in place" },
      { q: "\"np.vectorize made it slower\"", think: "np.vectorize is a Python loop in disguise — reach for a real ufunc instead" }
    ],

    matchTags: ["vectorize", "ufunc", "elementwise", "np.where", "sqrt", "exp", "log", "clip"],

    traps: [
      {
        bad: "out = []\nfor v in x:\n    out.append(v * v + 1)   # Python loop, slow\nresult = np.array(out)",
        good: "result = x * x + 1            # one vectorized ufunc pass in C",
        why: "Looping in Python pays interpreter overhead per element and rebuilds an array at the end. The vectorized form runs a single C loop over the buffer — 10–100× faster and shorter."
      },
      {
        bad: "mask = (x > 0) & x < 5        # WRONG: & binds tighter than < and >",
        good: "mask = (x > 0) & (x < 5)      # parenthesize each comparison",
        why: "The bitwise operators &, |, ~ have higher precedence than the comparison operators, so unparenthesized expressions parse in the wrong order and raise or give garbage. Always wrap each comparison in parentheses."
      },
      {
        bad: "slow = np.vectorize(my_func)(x)   # feels vectorized, isn't",
        good: "# express my_func with real ufuncs, e.g.\nfast = np.where(x > 0, np.sqrt(x), 0.0)",
        why: "np.vectorize is documented as a convenience wrapper that loops in Python — it is not a performance tool. Rebuild the logic from genuine ufuncs (arithmetic, np.where, np.clip) to actually run in C."
      }
    ],

    complexity: [
      { op: "elementwise op (a * b)", big_o: "O(n)", note: "One C pass over all n elements; the per-element cost is a machine instruction, not an interpreter step." },
      { op: "np.sqrt / np.exp / np.log", big_o: "O(n)", note: "A single vectorized pass calling the C math routine once per element, often auto-vectorized with SIMD." },
      { op: "np.where(cond, a, b)", big_o: "O(n)", note: "Evaluates the mask and both branches element-wise in one pass, selecting per element with no Python-level branching." },
      { op: "ufunc with out=", big_o: "O(n) time, O(1) extra", note: "Same time as the plain call but writes into the supplied buffer, so it allocates no new array for the result." },
      { op: "np.vectorize(f)(x)", big_o: "O(n) with Python overhead", note: "Still linear but pays full interpreter cost per element because it loops in Python — treat it as a fallback, not a speedup." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A ufunc is a small C function plus an <b>inner loop</b> that walks the array's flat memory buffer, applying that function to each element. Because the loop is compiled and the data is contiguous, the CPU can prefetch and often apply <b>SIMD</b> vector instructions — several elements per clock — which no Python loop can touch.</p>" +
      "<p><code>out=</code> hands the ufunc a destination buffer instead of letting it allocate one, so <code>np.exp(a, out=a)</code> transforms the array in place with <b>zero extra allocation</b>. The in-place operators <code>+=</code>, <code>*=</code>, <code>/=</code> do the same. In hot loops this is the difference between steady memory and constant garbage collection.</p>",

    challenge: {
      prompt:
        "Given an array of raw scores, some negative, do THREE things with no Python loop: (1) clamp every value into [0, 100] with np.clip; (2) take the natural log of (value + 1) with np.log1p; (3) build a label array that is \"pass\" where the clamped score >= 50 and \"fail\" otherwise using np.where. Print all three.",
      starter:
        "import numpy as np\n" +
        "scores = np.array([-5., 30., 120., 50., 75., 49.9])\n" +
        "# TODO: clamp to [0,100], log1p it, and np.where a pass/fail label\n",
      solution:
        "import numpy as np\n" +
        "scores = np.array([-5., 30., 120., 50., 75., 49.9])\n" +
        "clamped = np.clip(scores, 0, 100)     # [ 0. 30. 100. 50. 75. 49.9]\n" +
        "print(clamped)\n" +
        "logged = np.log1p(clamped)            # log(1 + x), stable near 0\n" +
        "print(logged)\n" +
        "labels = np.where(clamped >= 50, \"pass\", \"fail\")\n" +
        "print(labels)                         # ['fail' 'fail' 'pass' 'pass' 'pass' 'fail']\n" +
        "# np.clip, np.log1p and np.where are all ufuncs — three vectorized\n" +
        "# passes over the buffer, zero Python loops."
    }
  },

  {
    id: "aggregation-axis",
    title: "Aggregation & Axis",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Reduce an array to summaries — sum, mean, max, std — and control exactly which axis collapses so you get per-row or per-column results.",

    whatIsIt: [
      "<b>Aggregation</b> (a <i>reduction</i>) collapses many values into fewer: <code>sum</code>, <code>mean</code>, <code>max</code>, <code>min</code>, <code>std</code>, plus the index-finders <code>argmax</code> / <code>argmin</code> and the running <code>cumsum</code>. Called with no axis, they reduce the <b>whole</b> array to a single scalar.",
      "The <code>axis</code> argument names the axis that <b>collapses</b>. For a 2-D array, <code>axis=0</code> aggregates <b>DOWN the columns</b> — it eats the row axis, leaving one value per column. <code>axis=1</code> aggregates <b>ACROSS the rows</b> — it eats the column axis, leaving one value per row.",
      "<code>keepdims=True</code> keeps the reduced axis as size <b>1</b> instead of dropping it, so the result stays 2-D and <b>broadcasts back</b> against the original array — essential for centering or normalizing.",
      "<code>argmax</code> / <code>argmin</code> return the <b>index</b> of the extreme value (along an axis, or into the flattened array with no axis), and <code>cumsum</code> returns a <b>running total</b> the same shape as the input — a scan, not a reduction."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "m = np.array([[1, 2, 3],\n" +
        "              [4, 5, 6]])        # shape (2, 3)\n" +
        "\n" +
        "print(m.sum())                  # 21  — whole array\n" +
        "print(m.sum(axis=0))            # [5 7 9]   — DOWN columns, one per column\n" +
        "print(m.sum(axis=1))            # [ 6 15]   — ACROSS rows, one per row\n" +
        "\n" +
        "# keepdims keeps a size-1 axis so it broadcasts back\n" +
        "col_mean = m.mean(axis=0, keepdims=True)\n" +
        "print(col_mean.shape)           # (1, 3)\n" +
        "print(m - col_mean)             # center each column, shapes line up\n" +
        "\n" +
        "# argmax / cumsum\n" +
        "print(m.argmax(axis=1))         # [2 2] — index of max in each row\n" +
        "print(np.cumsum(m, axis=1))     # [[ 1  3  6]\n" +
        "                                #  [ 4  9 15]]",
      caption:
        "axis=0 collapses the rows (result: one value per column), axis=1 collapses the columns (one value per row). keepdims=True leaves that axis as size 1 so the summary broadcasts back. argmax gives the index; cumsum is a running total, same shape as input."
    },

    whyMatters:
      "<p>Nearly every analysis is a reduction: column means for feature scaling, per-row sums for totals, max along an axis for pooling, std for normalization. Getting <code>axis</code> right is the single most common source of silent bugs — the code runs, the numbers are just wrong.</p>" +
      "<p>The reliable mnemonic: <b>axis is the dimension that disappears.</b> A (rows, cols) array reduced over <code>axis=0</code> loses the rows, so you're left with a per-column result; over <code>axis=1</code> you lose the cols, so per-row. Pair reductions with <code>keepdims=True</code> whenever you plan to subtract or divide the summary back into the original.</p>" +
      "<ul>" +
      "<li><b>Reductions:</b> <code>sum</code>, <code>mean</code>, <code>max</code>, <code>min</code>, <code>std</code>, <code>prod</code>.</li>" +
      "<li><b>Index finders:</b> <code>argmax</code>, <code>argmin</code> (position, not value).</li>" +
      "<li><b>Scans:</b> <code>cumsum</code>, <code>cumprod</code> (same shape, running result).</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">z = (X - X.mean(axis=0, keepdims=True)) / X.std(axis=0, keepdims=True)   # per-column z-score</pre>",

    recognize: [
      { q: "\"average / total of each column\"", think: "axis=0 — it collapses the rows, giving one value per column" },
      { q: "\"average / total of each row\"", think: "axis=1 — it collapses the columns, giving one value per row" },
      { q: "\"subtract the column mean from every row\"", think: "mean(axis=0, keepdims=True) so the (1,n) result broadcasts back" },
      { q: "\"which column/row had the largest value\"", think: "argmax gives the INDEX, not the value; pick the axis to search along" },
      { q: "\"running total / cumulative sum\"", think: "cumsum — a scan that keeps the original shape, not a reduction" }
    ],

    matchTags: ["sum", "mean", "max", "min", "std", "axis", "keepdims", "argmax", "argmin", "cumsum", "reduce"],

    traps: [
      {
        bad: "# want per-column mean but reduced the wrong axis\ncol_means = m.mean(axis=1)   # this is per-ROW, not per-column",
        good: "col_means = m.mean(axis=0)   # axis=0 collapses rows -> one value per column",
        why: "axis names the axis that COLLAPSES, not the one you keep. To get a value per column you must eat the row axis (axis=0). Mixing these up runs fine but returns the wrong summary."
      },
      {
        bad: "row_mean = m.mean(axis=1)    # shape (2,)\ncentered = m - row_mean      # (2,3) - (2,) -> ValueError / misaligns",
        good: "row_mean = m.mean(axis=1, keepdims=True)  # (2,1) broadcasts across columns\ncentered = m - row_mean",
        why: "Dropping the reduced axis gives a 1-D result that aligns to the wrong dimension. keepdims=True preserves it as size 1 so the summary broadcasts cleanly back into the original shape."
      },
      {
        bad: "best = m.max(axis=1)         # gives the VALUE of the max\n# ...but I needed to know WHERE it was",
        good: "best_idx = m.argmax(axis=1)  # gives the INDEX of the max along each row",
        why: "max returns the extreme value; argmax returns its position. With no axis, argmax indexes into the FLATTENED array — use np.unravel_index to convert that back to 2-D coordinates."
      }
    ],

    complexity: [
      { op: "sum / mean / max / min", big_o: "O(n)", note: "A single pass visits every element once, whether reducing the whole array or along one axis." },
      { op: "std / var", big_o: "O(n)", note: "Linear in the element count; it just does a couple of passes (or one with the running formula) over the same buffer." },
      { op: "argmax / argmin", big_o: "O(n)", note: "One scan tracking the running best position, so it costs the same as a plain reduction but returns an index." },
      { op: "cumsum / cumprod", big_o: "O(n) time, O(n) output", note: "A single sequential scan that writes a running result the same size as the input, so the output is full-size." },
      { op: "reduce with keepdims", big_o: "O(n)", note: "Identical work to the plain reduction; keepdims only changes the output shape by keeping a size-1 axis, not the cost." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A reduction is a ufunc's <code>.reduce</code> method walking the buffer and folding elements together in C — <code>np.add.reduce</code> is exactly what <code>sum</code> calls. It's one pass over contiguous memory, which is why it's fast and why the cost is O(n) regardless of the axis you pick.</p>" +
      "<p>The <b>axis is the one that COLLAPSES</b>: reducing a (2,3) array over axis 0 folds the 2 rows together and leaves shape (3,); over axis 1 it folds the 3 columns and leaves (2,). <code>keepdims=True</code> instead leaves that axis as size <b>1</b> — (1,3) or (2,1) — so the summary lines up under broadcasting and can be subtracted or divided straight back into the original array with no manual reshaping.</p>",

    challenge: {
      prompt:
        "Given a (4, 3) matrix of exam scores (rows = students, columns = subjects), compute WITHOUT loops: (1) each student's average (per row); (2) each subject's max (per column); (3) the index of each student's best subject with argmax; (4) a z-scored matrix where every COLUMN has mean 0 and std 1 using keepdims. Print each and verify the z-scored column means are ~0.",
      starter:
        "import numpy as np\n" +
        "scores = np.array([[80., 70., 90.],\n" +
        "                   [60., 95., 85.],\n" +
        "                   [70., 60., 75.],\n" +
        "                   [90., 85., 65.]])\n" +
        "# TODO: per-row mean, per-column max, per-row argmax, per-column z-score\n",
      solution:
        "import numpy as np\n" +
        "scores = np.array([[80.,70.,90.],[60.,95.,85.],[70.,60.,75.],[90.,85.,65.]])\n" +
        "student_avg = scores.mean(axis=1)     # collapse columns -> one per student\n" +
        "print(student_avg)                     # [80. 80. 68.33333333 80.]\n" +
        "subject_max = scores.max(axis=0)      # collapse rows -> one per subject\n" +
        "print(subject_max)                     # [90. 95. 90.]\n" +
        "best_subject = scores.argmax(axis=1)  # index of top subject per student\n" +
        "print(best_subject)                    # [2 1 2 0]\n" +
        "mu = scores.mean(axis=0, keepdims=True)   # (1,3)\n" +
        "sd = scores.std(axis=0, keepdims=True)    # (1,3)\n" +
        "z = (scores - mu) / sd                # (4,3) broadcasts cleanly\n" +
        "print(z.mean(axis=0))                  # ~[0. 0. 0.]\n" +
        "print(z.std(axis=0))                   # [1. 1. 1.]\n" +
        "# axis=1 collapses columns (per student), axis=0 collapses rows (per subject);\n" +
        "# keepdims keeps (1,3) so the column stats broadcast back down every row."
    }
  }
]);
