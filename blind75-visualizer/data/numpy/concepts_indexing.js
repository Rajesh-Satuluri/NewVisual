/*
 * data/numpy/concepts_indexing.js — NumPy "Learn" indexing topics.
 * Registered into window.LEARN under the "numpy" stack. Runnable in-browser via
 * Pyodide (numpy auto-loads). Content grounded in NumPy's documented indexing
 * rules (basic indexing returns views; advanced indexing returns copies);
 * teaching structure mirrors the Python lab.
 */
window.LEARN.register("numpy", "Indexing", [
  {
    id: "indexing-slicing-views",
    title: "Indexing, Slicing & Views",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "How to pull out single elements, rows, columns and sub-blocks — and why a slice hands you a live window onto the original array, not a copy.",

    whatIsIt: [
      "<b>Basic indexing</b> selects elements with integers and <b>slices</b>. A single index like <code>a[2]</code> returns one element; for multi-dimensional arrays you index every axis at once inside <b>one</b> bracket: <code>a[i, j]</code>, not <code>a[i][j]</code>.",
      "A <b>slice</b> <code>start:stop:step</code> selects a range along an axis. <code>stop</code> is exclusive, <code>step</code> can skip elements (<code>a[::2]</code>) or reverse (<code>a[::-1]</code>), and <b>negative</b> indices count from the end (<code>a[-1]</code> is the last element). Omitted parts default to the whole axis.",
      "The crucial fact: a basic slice returns a <b>VIEW</b>, not a copy. The view shares the same underlying memory buffer as the parent, so writing into the view <b>mutates the original</b>. NumPy does this by only changing shape/stride/offset metadata — no data is copied, which is what makes slicing O(1).",
      "If you need an independent array, call <code>.copy()</code> on the slice to detach it from the parent's buffer."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "a = np.arange(10)             # [0 1 2 3 4 5 6 7 8 9]\n" +
        "print(a[3])                   # 3   (single element)\n" +
        "print(a[-1])                  # 9   (negative index = from the end)\n" +
        "print(a[2:7])                 # [2 3 4 5 6]  (stop is exclusive)\n" +
        "print(a[::2])                 # [0 2 4 6 8]  (step)\n" +
        "print(a[::-1])                # [9 8 7 6 5 4 3 2 1 0]  (reversed)\n" +
        "\n" +
        "# multi-dim: index all axes in ONE bracket\n" +
        "m = np.arange(12).reshape(3, 4)\n" +
        "print(m[1, 2])                # 6   (row 1, col 2)\n" +
        "print(m[0])                   # [0 1 2 3]  (whole first row)\n" +
        "print(m[:, 1])               # [1 5 9]     (whole second column)\n" +
        "\n" +
        "# a slice is a VIEW — writing to it changes the parent\n" +
        "s = a[2:5]                    # view onto a[2], a[3], a[4]\n" +
        "s[0] = 999\n" +
        "print(a)                      # [  0   1 999   3   4   5   6   7   8   9]\n" +
        "print(s.base is a)            # True  (s borrows a's buffer)",
      caption:
        "Index every axis in one bracket: m[1, 2], not m[1][2]. Slices are half-open (stop excluded) and negative indices count from the end. s = a[2:5] is a VIEW — s[0] = 999 rewrites a[2] in place, and s.base is a proves they share memory."
    },

    whyMatters:
      "<p>Views make NumPy fast: slicing a million-row array to grab a window is O(1) because nothing is copied — only metadata changes. You can hand a slice to a function and let it write results straight back into the parent, which is how in-place pipelines avoid doubling memory.</p>" +
      "<p>But the same feature is the <b>#1 source of NumPy bugs</b>. Code that \"took a slice to work on it safely\" silently corrupts the original, because the slice was never a separate array. The fix is one method call: <code>.copy()</code> when you need independence, and knowing that a plain slice never gives it to you.</p>" +
      "<ul>" +
      "<li><b>Views</b> (basic indexing): <code>a[1:3]</code>, <code>a[:, 0]</code>, <code>a[::2]</code> — share memory.</li>" +
      "<li><b>Copies</b>: <code>a[1:3].copy()</code>, and (next topic) boolean/fancy indexing.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">window = big[1000:2000]      # O(1) view, no copy\nwindow[:] = 0                # zeroes big[1000:2000] IN PLACE</pre>",

    recognize: [
      { q: "\"grab row i, column j of a 2-D array\"", think: "one bracket, comma-separated: a[i, j] — a[i][j] works but is slower and only for basic cases" },
      { q: "\"I took a slice, edited it, and the original changed too\"", think: "a basic slice is a VIEW sharing memory — take a[...].copy() if you need an independent array" },
      { q: "\"reverse an array / take every other element\"", think: "step in the slice: a[::-1] to reverse, a[::2] for every second element" },
      { q: "\"select a whole column\"", think: "a[:, j] — the colon keeps the whole first axis, j picks the column" },
      { q: "\"last row / last N elements\"", think: "negative indices: a[-1] is the last, a[-3:] is the last three" }
    ],

    matchTags: ["index", "slice", "view", "subarray", "axis", "negative index", "step"],

    traps: [
      {
        bad: "m = np.arange(12).reshape(3, 4)\nm[1][2]        # works, but chains two index ops",
        good: "m[1, 2]        # single indexing op, all axes at once",
        why: "m[1][2] first builds the view m[1] (a whole row) then indexes into it — two operations and only valid for pure integer indexing. m[1, 2] indexes every axis in one step and is the form that generalizes to slices like m[1:, 2]."
      },
      {
        bad: "part = a[2:5]\npart[:] = 0     # OOPS: also zeroes a[2], a[3], a[4]",
        good: "part = a[2:5].copy()\npart[:] = 0     # a is untouched — part has its own buffer",
        why: "A basic slice is a view sharing the parent's memory, so writing through it mutates the parent. .copy() allocates a detached buffer so edits stay local."
      },
      {
        bad: "print(a[10])    # IndexError if a has 10 elements (valid indices 0..9)",
        good: "print(a[-1])    # last element, or slice a[9:12] which just returns what exists",
        why: "A scalar index out of range raises IndexError, but a slice that runs past the end is clamped silently — a[9:12] on a length-10 array returns just a[9] instead of erroring."
      }
    ],

    complexity: [
      { op: "single element a[i, j]", big_o: "O(1)", note: "NumPy computes one memory offset from the indices and strides, then reads that one location." },
      { op: "basic slice a[1:3]", big_o: "O(1)", note: "Returns a view by writing new shape/stride/offset metadata; no element data is copied regardless of how many elements the slice spans." },
      { op: "slice then .copy()", big_o: "O(k)", note: "Copying materializes a new buffer, so the cost is linear in k, the number of elements selected." },
      { op: "a[::-1] (reverse)", big_o: "O(1)", note: "Just a view with a negative stride; the reversal is lazy metadata, not a rearrangement of the buffer." },
      { op: "iterating a[i] in Python", big_o: "O(n) with high constant", note: "Element-by-element Python indexing pays interpreter overhead per step — prefer a vectorized slice or operation." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A NumPy array is a flat memory <b>buffer</b> plus <b>shape</b>, <b>strides</b>, and an <b>offset</b>. Basic indexing with integers and slices returns a <b>VIEW</b>: NumPy just computes new shape/stride/offset numbers that point into the <b>same</b> buffer. That's why it's O(1) and why mutating the view writes straight through to the parent — this is the single most common NumPy gotcha.</p>" +
      "<p>You can check the relationship at runtime: a view's <code>.base</code> attribute points to the array it borrows from (<code>s.base is a</code>), and <code>np.shares_memory(s, a)</code> returns <code>True</code>. To break the link, call <code>.copy()</code>, which allocates a fresh contiguous buffer whose <code>.base</code> is <code>None</code>.</p>" +
      "<p>Advanced indexing (boolean masks and integer-array/fancy indexing — the next topic) is different: it always returns a <b>COPY</b>, because the selected elements generally aren't a regular strided window into the buffer.</p>",

    challenge: {
      prompt:
        "Given a (4, 4) matrix, extract the inner 2x2 block (rows 1-2, cols 1-2) as a slice, set that block to 0, and confirm the change appears in the ORIGINAL matrix (proving the slice was a view). Then redo it with .copy() and show the original is left untouched.",
      starter:
        "import numpy as np\n" +
        "M = np.arange(16).reshape(4, 4)\n" +
        "# TODO: slice the inner 2x2 block, zero it, print M (should change)\n" +
        "# TODO: then use .copy() on a fresh M and show M is unchanged\n",
      solution:
        "import numpy as np\n" +
        "M = np.arange(16).reshape(4, 4)\n" +
        "inner = M[1:3, 1:3]         # VIEW onto the center block\n" +
        "print(np.shares_memory(inner, M))   # True\n" +
        "inner[:] = 0                # writes through to M\n" +
        "print(M)\n" +
        "# [[ 0  1  2  3]\n" +
        "#  [ 4  0  0  7]\n" +
        "#  [ 8  0  0 11]\n" +
        "#  [12 13 14 15]]\n" +
        "\n" +
        "M2 = np.arange(16).reshape(4, 4)\n" +
        "inner2 = M2[1:3, 1:3].copy()   # detached COPY\n" +
        "inner2[:] = 0\n" +
        "print(M2)                   # unchanged: still 0..15 in order\n" +
        "# The plain slice shares M's buffer; .copy() gives an independent one."
    }
  },

  {
    id: "boolean-fancy-indexing",
    title: "Boolean & Fancy Indexing",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Select elements by a condition (a[a > 0]) or by an explicit list of positions (a[[0, 2, 4]]) — powerful, and always a fresh copy.",

    whatIsIt: [
      "<b>Boolean (mask) indexing</b> selects elements where a condition is <code>True</code>. Comparing an array yields a boolean array of the same shape (<code>a > 0</code>), and indexing with it — <code>a[a > 0]</code> — returns a 1-D array of just the matching elements. This is the workhorse for filtering.",
      "<b>Fancy (integer-array) indexing</b> selects elements by an explicit array of positions: <code>a[[0, 2, 4]]</code> pulls those three rows/elements, in that order, and may repeat them (<code>a[[1, 1, 1]]</code>). You choose exactly what to take and in what order.",
      "Both are <b>advanced indexing</b>, and both <b>return a COPY</b> — never a view. The selected elements generally aren't a regular strided slice of the buffer, so NumPy allocates a new array. Editing the result does <b>not</b> touch the parent.",
      "But there's a key asymmetry: <b>assigning THROUGH</b> a mask writes in place. <code>a[a &lt; 0] = 0</code> clamps every negative to zero in the original array. Reading with a mask copies out; assigning with a mask writes back. <code>np.nonzero(cond)</code> / <code>np.where(cond)</code> give you the integer <b>indices</b> where a condition holds."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "a = np.array([-3, 5, -1, 8, 0, -7, 2])\n" +
        "\n" +
        "# boolean mask: same-shape True/False array\n" +
        "print(a > 0)                 # [False  True False  True False False  True]\n" +
        "print(a[a > 0])              # [5 8 2]   (filter — a COPY of matches)\n" +
        "\n" +
        "# reading with a mask is a COPY: editing it leaves a alone\n" +
        "picked = a[a > 0]\n" +
        "picked[0] = 999\n" +
        "print(a)                     # [-3  5 -1  8  0 -7  2]  (unchanged)\n" +
        "\n" +
        "# but ASSIGNING through a mask writes IN PLACE\n" +
        "a[a < 0] = 0\n" +
        "print(a)                     # [0 5 0 8 0 0 2]  (negatives clamped)\n" +
        "\n" +
        "# fancy indexing: pick positions explicitly (also a COPY)\n" +
        "b = np.array([10, 20, 30, 40, 50])\n" +
        "print(b[[0, 2, 4]])          # [10 30 50]\n" +
        "print(b[[1, 1, 3]])          # [20 20 40]  (repeats allowed)\n" +
        "\n" +
        "# indices where a condition holds\n" +
        "print(np.nonzero(b > 25))    # (array([2, 3, 4]),)",
      caption:
        "a[a > 0] filters to matches and returns a COPY (editing 'picked' leaves a untouched). Assigning a[a < 0] = 0 instead writes back into a. Fancy indexing b[[0,2,4]] picks positions by list (also a copy, order preserved, repeats allowed). np.nonzero returns the True indices."
    },

    whyMatters:
      "<p>Boolean and fancy indexing are how you express \"give me the rows that match\" without a loop — filtering outliers, selecting a class, gathering a batch of rows by index, reordering. It's the same mental model you carry into Pandas' <code>df[df.col > 0]</code>.</p>" +
      "<p>Getting the <b>copy-vs-view</b> distinction right prevents two opposite bugs: expecting a mask read to alias the parent (it doesn't — it's a copy), and forgetting that a mask <b>assignment</b> mutates the parent (it does). Read = copy out; assign = write back.</p>" +
      "<ul>" +
      "<li><b>Copy</b>: <code>a[mask]</code>, <code>a[[0, 2, 4]]</code> — a new array of the selected elements.</li>" +
      "<li><b>In-place</b>: <code>a[mask] = value</code>, <code>a[[0, 2]] = value</code> — writes into the original.</li>" +
      "<li><b>Indices</b>: <code>np.nonzero(cond)</code> / <code>np.where(cond)</code> return the positions where cond is True.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">a[np.abs(a) > 3*a.std()] = np.nan   # flag outliers IN PLACE via a mask assignment</pre>",

    recognize: [
      { q: "\"keep only elements matching a condition\"", think: "boolean mask: a[a > threshold] returns the matches as a new 1-D copy" },
      { q: "\"replace all negatives / clip in place\"", think: "assign through the mask: a[a < 0] = 0 mutates the original array" },
      { q: "\"pick these specific rows/indices, maybe reordered or repeated\"", think: "fancy indexing: a[[3, 1, 3, 0]] — order and repeats are honored, result is a copy" },
      { q: "\"I filtered an array, edited the result, but the original didn't change\"", think: "expected — a[mask] is a COPY; to change the parent, assign through the mask instead" },
      { q: "\"where in the array is the condition true?\"", think: "np.nonzero(cond) or np.where(cond) return the integer indices" }
    ],

    matchTags: ["boolean", "mask", "fancy indexing", "filter", "where", "nonzero", "condition", "select"],

    traps: [
      {
        bad: "sub = a[a > 0]\nsub[:] = -1     # does NOTHING to a — sub is a copy",
        good: "a[a > 0] = -1   # assign THROUGH the mask to change a in place",
        why: "Reading a[a > 0] returns a fresh copy of the matches, so editing that copy can't reach the parent. To modify the original, put the mask on the LEFT of the assignment."
      },
      {
        bad: "mask = a > 0\nresult = a[mask.astype(int)]   # int array -> FANCY indexing, wrong!",
        good: "result = a[mask]               # keep the mask boolean for filtering",
        why: "A boolean array filters by True/False, but casting it to int turns it into an array of positions (0s and 1s), so a[mask.astype(int)] fancy-indexes elements 0 and 1 repeatedly instead of filtering. Keep masks as bool."
      },
      {
        bad: "idx = np.array([1, 5, 9])\nrows = big[idx]\nrows *= 2                       # doubles the COPY, not big",
        good: "big[idx] *= 2                  # in-place on the selected rows of big",
        why: "Fancy indexing returns a copy, so rows *= 2 modifies only that copy. Combining the fancy index with augmented assignment (big[idx] *= 2) writes back into the original rows."
      }
    ],

    complexity: [
      { op: "build mask a > 0", big_o: "O(n)", note: "One vectorized pass compares every element, producing a same-shape boolean array." },
      { op: "read a[mask]", big_o: "O(n)", note: "Scans all n elements to test the mask and copies the matches into a new buffer, so it is linear and allocates." },
      { op: "assign a[mask] = v", big_o: "O(n)", note: "Also scans all n elements but writes the value into matching slots in place, allocating no new data array." },
      { op: "fancy a[[i0, i1, ...]]", big_o: "O(k)", note: "Gathers the k requested positions into a fresh array of size k; the cost scales with how many indices you ask for." },
      { op: "np.nonzero(cond)", big_o: "O(n)", note: "Scans all n elements to collect the indices where the condition is True, returning them as new index arrays." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Boolean masks and fancy (integer-array) indexing are <b>advanced indexing</b>, and they always return a <b>COPY</b>. Unlike a slice, the selected elements usually don't form a regular strided window into the buffer, so NumPy can't describe them with shape/stride metadata — it must gather them into a brand-new contiguous array. The result's <code>.base</code> is <code>None</code> and <code>np.shares_memory(a[mask], a)</code> is <code>False</code>.</p>" +
      "<p>The exception is <b>assignment</b>: <code>a[mask] = v</code> and <code>a[idx] = v</code> scatter values directly into the original buffer, so they mutate the parent in place. Rule of thumb — reading with advanced indexing copies OUT; assigning with it writes BACK.</p>" +
      "<p><code>np.nonzero(cond)</code> and <code>np.where(cond)</code> (with one argument) return a tuple of integer index arrays marking where the condition is True — useful when you want the <b>positions</b> rather than the values. Since a mask read is already a copy, calling <code>.copy()</code> on it is redundant; use <code>.copy()</code> to detach a basic slice, which is the one that aliases.</p>",

    challenge: {
      prompt:
        "Given an array of temperatures with some sentinel -999 error values, (1) count how many valid readings there are, (2) build a cleaned copy with every -999 replaced by the mean of the valid readings, WITHOUT mutating the original, and (3) report the indices of the error values using np.nonzero. Prove the original array still contains its -999 sentinels at the end.",
      starter:
        "import numpy as np\n" +
        "t = np.array([21., -999., 23., 22., -999., 25., 24.])\n" +
        "# TODO: valid count, cleaned copy with -999 -> mean(valid), error indices\n" +
        "# TODO: show t is unchanged\n",
      solution:
        "import numpy as np\n" +
        "t = np.array([21., -999., 23., 22., -999., 25., 24.])\n" +
        "valid = t != -999                 # boolean mask\n" +
        "print(valid.sum())                # 5  (count of True)\n" +
        "print(np.nonzero(~valid))         # (array([1, 4]),)  error positions\n" +
        "\n" +
        "clean = t.copy()                  # detach so we don't touch t\n" +
        "clean[~valid] = t[valid].mean()   # assign through the mask, in place on the COPY\n" +
        "print(clean)                      # [21. 23. 23. 22. 23. 25. 24.]\n" +
        "print(t)                          # [  21. -999.   23.   22. -999.   25.   24.]\n" +
        "# t[valid] is a copy of the good readings; assigning clean[~valid]=... edits\n" +
        "# only 'clean' because we copied first — the original keeps its sentinels."
    }
  }
]);
