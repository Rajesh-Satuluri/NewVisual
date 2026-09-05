/*
 * data/numpy/concepts_foundations.js — NumPy "Learn" foundations topics.
 * Registered into window.LEARN under the "numpy" stack. Runnable in-browser via
 * Pyodide (numpy auto-loads). Content grounded in NumPy's documented behavior;
 * teaching structure mirrors the broadcasting exemplar.
 */
window.LEARN.register("numpy", "Foundations", [
  {
    id: "ndarray-dtype",
    title: "ndarray & dtype",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "One contiguous block of same-typed numbers — the single object every NumPy operation reads, reshapes, and vectorizes over.",

    whatIsIt: [
      "The <b>ndarray</b> is NumPy's core object: an <b>N-dimensional</b> grid of elements that <i>all share one type</i>. Unlike a Python list, it isn't a box of pointers to scattered objects — it's a single <b>contiguous buffer</b> in memory plus a little metadata (<code>shape</code>, <code>strides</code>, <code>dtype</code>).",
      "The <b>dtype</b> (data type) describes what each element is and how many bytes it takes: <code>int64</code>, <code>float64</code>, <code>bool</code>, <code>complex128</code>, and so on. Because every element is the <b>same fixed size</b>, NumPy can jump to element <i>k</i> by simple arithmetic and run the same machine instruction over the whole buffer.",
      "This is the whole trick: a fixed <code>dtype</code> + a flat buffer = data that CPU-level vectorized C loops can rip through. <code>arr.dtype</code>, <code>arr.itemsize</code> (bytes per element), and <code>arr.nbytes</code> (total bytes) let you inspect exactly what you're holding.",
      "A dtype is <b>sticky</b>: an <code>int64</code> array stays integer. Assigning <code>3.9</code> into it silently <i>truncates</i> to <code>3</code>. Choose the dtype up front, or convert explicitly with <code>astype</code>."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "a = np.array([1, 2, 3, 4])\n" +
        "print(a.dtype)        # int64  (default integer on most platforms)\n" +
        "print(a.itemsize)     # 8      bytes per element\n" +
        "print(a.nbytes)       # 32     4 elements x 8 bytes\n" +
        "print(a.ndim, a.shape)  # 1 (4,)\n" +
        "\n" +
        "# fixed dtype is sticky: floats truncate into an int array\n" +
        "a[0] = 3.9\n" +
        "print(a)              # [3 2 3 4]  -> 3.9 truncated to 3\n" +
        "\n" +
        "# choose the type up front, or convert explicitly\n" +
        "f = np.array([1, 2, 3], dtype=np.float64)\n" +
        "print(f, f.dtype)     # [1. 2. 3.] float64\n" +
        "print(a.astype(np.float64))  # [3. 2. 3. 4.]  (astype returns a COPY)",
      caption:
        "Every element shares one dtype and a fixed itemsize, so the buffer is a tight n*itemsize block. Writing a float into an int array truncates; astype makes a new, converted copy."
    },

    whyMatters:
      "<p>The fixed-dtype contiguous buffer is <i>why</i> NumPy is fast. A Python list of a million ints stores a million pointer-boxed objects scattered on the heap; a NumPy <code>int64</code> array stores 8,000,000 tight bytes the CPU streams through. That's the 10-100x speedup, plus far less memory.</p>" +
      "<p>It also explains bugs beginners hit constantly: an array that \"lost its decimals\" (integer dtype), an overflow that wrapped around (<code>int8</code> can't hold 300), or a memory blow-up (<code>float64</code> when <code>float32</code> would do). Reading the dtype first turns those mysteries into one-line fixes.</p>" +
      "<pre class=\"why-pre\">np.array([300], dtype=np.int8)   # array([44], dtype=int8)  -> 300 wrapped mod 256</pre>",

    recognize: [
      { q: "\"my array dropped the decimals / stored 3 instead of 3.9\"", think: "it's an integer dtype — create it with dtype=np.float64 or call astype(float)" },
      { q: "\"how much memory will this array use?\"", think: "arr.nbytes, or size * itemsize; shrink the dtype (float32, int32) if it's too big" },
      { q: "\"the numbers wrapped around / went negative unexpectedly\"", think: "integer overflow on a small dtype (int8/int16/uint8) — widen the dtype" },
      { q: "\"I need to change a column's type\"", think: "astype(new_dtype) returns a converted COPY; the original is unchanged" },
      { q: "\"can this array hold strings AND numbers?\"", think: "no — one fixed dtype per array; mixed data means object dtype (slow) or a structured dtype" }
    ],

    matchTags: ["ndarray", "dtype", "array", "itemsize", "astype", "nbytes", "int64", "float64", "type", "buffer"],

    traps: [
      {
        bad: "a = np.array([1, 2, 3])   # dtype int64\na[1] = 2.75\nprint(a)                  # [1 2 3]  -> 2.75 silently truncated",
        good: "a = np.array([1, 2, 3], dtype=np.float64)\na[1] = 2.75\nprint(a)                  # [1.   2.75 3.  ]",
        why: "A dtype is fixed at creation. Writing a float into an int array truncates toward zero with no warning. Pick float64 up front when you'll store fractional values."
      },
      {
        bad: "x = np.array([200, 100], dtype=np.uint8)\nprint(x + x)              # [144 200]  -> 400 and 200 wrap mod 256",
        good: "x = np.array([200, 100], dtype=np.int64)\nprint(x + x)              # [400 200]  no overflow",
        why: "Small integer dtypes wrap around silently (modular arithmetic). If sums can exceed the type's range, use a wider dtype like int64."
      },
      {
        bad: "b = a.astype(np.float64)\nb[0] = 99\nprint(a[0])               # unchanged -> astype made a COPY, not a view",
        good: "# expect a fresh array from astype; assign it back if you meant to replace\na = a.astype(np.float64)",
        why: "astype always returns a new array (a copy). Edits to the result never touch the original, so capture the return value."
      }
    ],

    complexity: [
      { op: "np.array(list)", big_o: "O(n)", note: "Copies every element from the Python list into one contiguous buffer, inferring or applying the dtype as it goes." },
      { op: "indexing a[k]", big_o: "O(1)", note: "The address is base + k * itemsize, so any element is reached with one arithmetic step regardless of array size." },
      { op: "arr.astype(dtype)", big_o: "O(n)", note: "Allocates a new buffer and converts each element, so it costs one full pass and doubles memory during the copy." },
      { op: "arr.dtype / itemsize / nbytes", big_o: "O(1)", note: "These read stored metadata, not the data, so they return instantly no matter how large the array is." },
      { op: "elementwise ufunc (a + b)", big_o: "O(n)", note: "One vectorized C pass over the buffer; a uniform dtype is what lets a single machine instruction apply to every element." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> An ndarray is three things: a pointer to a flat, contiguous memory buffer; a <b>dtype</b> that fixes the size and interpretation of each element; and <b>shape</b> + <b>strides</b> that map N-D indices onto that 1-D buffer. Element <code>(i, j)</code> lives at <code>base + i*strides[0] + j*strides[1]</code>.</p>" +
      "<p>Because the dtype is fixed and elements are equal-sized and packed, the CPU can prefetch cache lines and apply <b>SIMD</b> vector instructions across many elements at once. A Python list can't: its items are heap-scattered boxed objects reached through pointers, defeating both the cache and vectorization. The fixed dtype is precisely what unlocks that speed.</p>",

    challenge: {
      prompt:
        "You have measurements np.array([1, 2, 3, 4]). (1) Print its dtype and confirm assigning 5.5 truncates. (2) Make a float64 version and show 5.5 is preserved there. (3) Print nbytes for both. What does astype return — a view or a copy? Prove it.",
      starter:
        "import numpy as np\n" +
        "a = np.array([1, 2, 3, 4])\n" +
        "# TODO: show the int dtype truncates, make a float64 copy that doesn't,\n" +
        "#       print nbytes, and prove astype returns a copy\n",
      solution:
        "import numpy as np\n" +
        "a = np.array([1, 2, 3, 4])\n" +
        "print(a.dtype)              # int64\n" +
        "a[0] = 5.5\n" +
        "print(a)                    # [5 2 3 4] -> truncated\n" +
        "f = a.astype(np.float64)    # astype returns a fresh COPY\n" +
        "f[0] = 5.5\n" +
        "print(f)                    # [5.5 2.  3.  4. ] -> preserved\n" +
        "print(a.nbytes, f.nbytes)   # 32 32  (both 4 elements x 8 bytes)\n" +
        "print(a[0])                 # 5  -> unchanged, proving astype copied\n" +
        "# a stayed integer (5) while f holds 5.5: they are independent buffers."
    }
  },
  {
    id: "creating-arrays",
    title: "Creating Arrays",
    difficulty: "Beginner",
    estMinutes: 9,
    relevance: 3,
    tagline: "A handful of constructors that turn ranges, counts, and fill values into ready-made arrays — no Python loop in sight.",

    whatIsIt: [
      "You rarely build arrays element by element. NumPy gives you <b>constructors</b> that generate whole arrays at once: from existing data with <code>np.array</code>, or from scratch with generators like <code>arange</code>, <code>linspace</code>, <code>zeros</code>, <code>ones</code>, <code>full</code>, <code>eye</code>, and <code>empty</code>.",
      "Two are easy to confuse. <code>np.arange(start, stop, step)</code> works like Python's <code>range</code> — <b>stop is exclusive</b> and you control the <i>step</i>. <code>np.linspace(start, stop, num)</code> instead gives you a fixed <b>count</b> of evenly spaced points and, by default, <b>includes the endpoint</b>.",
      "The <b>fill</b> family takes a <code>shape</code> tuple: <code>np.zeros((2, 3))</code>, <code>np.ones((2, 3))</code>, and <code>np.full((2, 3), 7)</code> make arrays of that shape filled with 0, 1, or any value. <code>np.eye(n)</code> makes the n-by-n identity matrix.",
      "<code>np.empty(shape)</code> allocates memory <b>without initializing it</b>, so its contents are arbitrary garbage — it's a speed shortcut for when you're about to overwrite every element. Most constructors accept a <code>dtype=</code> argument to set the element type up front."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "# from an existing Python list\n" +
        "print(np.array([[1, 2], [3, 4]]))   # 2x2 from nested lists\n" +
        "\n" +
        "# arange: like range(), stop is EXCLUSIVE, you set the step\n" +
        "print(np.arange(0, 10, 2))          # [0 2 4 6 8]\n" +
        "\n" +
        "# linspace: fixed COUNT of points, endpoint INCLUDED by default\n" +
        "print(np.linspace(0, 1, 5))         # [0.   0.25 0.5  0.75 1.  ]\n" +
        "\n" +
        "# fill family takes a shape tuple\n" +
        "print(np.zeros((2, 3)))             # 2x3 of 0.\n" +
        "print(np.full((2, 2), 7))           # 2x2 of 7\n" +
        "print(np.eye(3))                    # 3x3 identity\n" +
        "\n" +
        "# set the dtype at creation\n" +
        "print(np.ones(3, dtype=np.int64))   # [1 1 1]",
      caption:
        "arange is range-like (exclusive stop, chosen step); linspace is count-based (inclusive endpoint). zeros/ones/full/eye take a shape and a fill; dtype= sets the element type up front."
    },

    whyMatters:
      "<p>Choosing the right constructor is the difference between one clear line and a fragile loop. <code>linspace</code> is the correct tool for sampling a function or building a plot axis (you want <i>exactly</i> N points including both ends); <code>arange</code> is right when the <i>step</i> matters (every 2, every 0.5).</p>" +
      "<p>Pre-allocating with <code>zeros</code>/<code>empty</code> and filling in place is the standard pattern for building results without growing an array repeatedly (which copies every time). And setting <code>dtype=</code> at creation avoids the classic \"why is my array full of floats?\" surprise.</p>" +
      "<pre class=\"why-pre\">out = np.zeros(n)            # pre-allocate the result buffer once...\nfor i in range(n): out[i] = f(i)   # ...then fill it in place (no re-copying)</pre>",

    recognize: [
      { q: "\"I need exactly N evenly spaced points from a to b\"", think: "np.linspace(a, b, N) — endpoint included; use endpoint=False to drop it" },
      { q: "\"count from a to b by a fixed step\"", think: "np.arange(a, b, step) — remember stop is EXCLUSIVE" },
      { q: "\"I need a blank array to fill in / accumulate into\"", think: "np.zeros(shape) (safe) or np.empty(shape) (faster but uninitialized garbage)" },
      { q: "\"a matrix of all the same value\"", think: "np.full(shape, value); use zeros/ones for 0 and 1" },
      { q: "\"an identity matrix\"", think: "np.eye(n) — 1s on the diagonal, 0s elsewhere" }
    ],

    matchTags: ["array", "arange", "linspace", "zeros", "ones", "full", "eye", "empty", "creation", "dtype"],

    traps: [
      {
        bad: "np.arange(0, 1, 0.1)   # float step -> may give 10 or 11 points\n# floating-point rounding makes the endpoint count unreliable",
        good: "np.linspace(0, 1, 11)  # exactly 11 points, 0.0 .. 1.0, endpoint included",
        why: "arange with a fractional step accumulates float error, so the number of points near the stop is unpredictable. When you need a known count over a range, use linspace."
      },
      {
        bad: "np.arange(1, 5)        # [1 2 3 4]  -> where did 5 go?",
        good: "np.arange(1, 6)        # [1 2 3 4 5]  -> stop is EXCLUSIVE, like range()",
        why: "arange excludes the stop value, exactly like Python's range. To include N, pass stop = N + 1 (or use linspace, whose endpoint is inclusive)."
      },
      {
        bad: "np.empty((2, 2))       # contains arbitrary garbage, not zeros!\n# reading it before filling gives meaningless numbers",
        good: "np.zeros((2, 2))       # guaranteed all 0. -- use this unless you'll overwrite every cell",
        why: "empty skips initialization for speed, so its contents are whatever was in that memory. Only use it when you'll write every element before reading; otherwise use zeros."
      }
    ],

    complexity: [
      { op: "np.array(list)", big_o: "O(n)", note: "Walks the input sequence once and copies each value into a new contiguous buffer." },
      { op: "np.arange / linspace", big_o: "O(n)", note: "Allocates the buffer and computes each of the n values, so cost grows linearly with the number of elements produced." },
      { op: "np.zeros / ones / full", big_o: "O(n)", note: "Allocates the buffer and writes the fill value into every element, one pass over the whole array." },
      { op: "np.empty(shape)", big_o: "O(1) to O(n)", note: "Allocation itself is fast and skips filling, so it can be near-constant; the OS may still zero pages lazily on first touch." },
      { op: "np.eye(n)", big_o: "O(n^2)", note: "Builds a full n-by-n array and sets the diagonal, so both time and memory scale with the square of n." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Every constructor ends the same way: it allocates one contiguous, dtype-sized buffer, then fills it. <code>zeros</code>, <code>ones</code>, and <code>full</code> write the fill value across the whole buffer; <code>empty</code> <i>skips that write</i>, which is why it's faster and why its contents are undefined.</p>" +
      "<p>The dtype is decided at allocation. Give plain integers and <code>arange</code> yields an integer array; give a float bound (or <code>linspace</code>, which is inherently float) and you get <code>float64</code>. Passing <code>dtype=</code> forces the choice, avoiding a later <code>astype</code> copy. Note <code>arange</code>'s length is computed as <code>ceil((stop-start)/step)</code>, and float steps make that count fragile — the reason <code>linspace</code> exists.</p>",

    challenge: {
      prompt:
        "Build a plot-ready x axis of exactly 5 points from 0 to 2 (inclusive). Then, without a Python loop, make y = x squared. Finally pre-allocate a zeros array of the same shape and confirm np.zeros_like(x) matches. Which constructor guarantees the endpoint 2.0 appears?",
      starter:
        "import numpy as np\n" +
        "# TODO: make x = 5 evenly spaced points 0..2 inclusive, then y = x**2,\n" +
        "#       and a zeros array shaped like x\n",
      solution:
        "import numpy as np\n" +
        "x = np.linspace(0, 2, 5)     # [0.  0.5 1.  1.5 2. ] -> endpoint 2.0 included\n" +
        "y = x ** 2                   # vectorized, no loop: [0.   0.25 1.   2.25 4.  ]\n" +
        "print(x)\n" +
        "print(y)\n" +
        "z = np.zeros_like(x)         # same shape and dtype as x, all 0.\n" +
        "print(z)                     # [0. 0. 0. 0. 0.]\n" +
        "print(z.shape == x.shape)    # True\n" +
        "# linspace guarantees the inclusive endpoint (2.0); arange would exclude the stop."
    }
  },
  {
    id: "shape-reshape",
    title: "Shape & Reshape",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Rearrange how the same buffer is read — rows, columns, extra axes — usually without moving a single byte.",

    whatIsIt: [
      "An array's <b>shape</b> is the tuple of its dimension sizes; <code>ndim</code> is how many dimensions there are, and <code>size</code> is the total element count (the product of the shape). A (3, 4) array has <code>ndim == 2</code> and <code>size == 12</code>.",
      "<code>reshape</code> hands you a <b>new view</b> of the same data laid out under a different shape — as long as the total <code>size</code> stays the same. You can leave one axis as <code>-1</code> and NumPy <b>infers</b> it: <code>a.reshape(3, -1)</code> figures out the missing dimension from the element count.",
      "To go back to 1-D, <code>ravel()</code> returns a flattened <b>view</b> when it can (no copy), while <code>flatten()</code> <b>always returns a copy</b>. <code>transpose</code> (or <code>.T</code>) swaps axes — also a view — so rows become columns without touching memory.",
      "To <i>add</i> a dimension of size 1, use <code>np.newaxis</code> (or <code>None</code>) in an index: <code>a[:, np.newaxis]</code> turns a (n,) vector into an (n, 1) column. That size-1 axis is exactly what makes broadcasting line up."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "a = np.arange(12)\n" +
        "print(a.shape, a.ndim, a.size)   # (12,) 1 12\n" +
        "\n" +
        "# reshape to 3x4; -1 lets NumPy infer that axis\n" +
        "m = a.reshape(3, -1)\n" +
        "print(m.shape)                   # (3, 4)  -> -1 inferred as 4\n" +
        "print(m)\n" +
        "\n" +
        "# transpose swaps axes (a view): rows <-> columns\n" +
        "print(m.T.shape)                 # (4, 3)\n" +
        "\n" +
        "# ravel back to 1-D (view when possible)\n" +
        "print(m.ravel())                 # [ 0  1  2 ... 11]\n" +
        "\n" +
        "# newaxis adds a size-1 dimension -> (12,) becomes (12, 1)\n" +
        "col = a[:, np.newaxis]\n" +
        "print(col.shape)                 # (12, 1)\n" +
        "\n" +
        "# reshape shares memory: editing the view changes the original\n" +
        "m[0, 0] = 99\n" +
        "print(a[0])                      # 99  -> same buffer",
      caption:
        "shape/ndim/size describe the layout; reshape and transpose return views over the SAME buffer (editing one shows in the other); -1 infers an axis; newaxis inserts a size-1 axis for broadcasting."
    },

    whyMatters:
      "<p>Most \"shape mismatch\" errors are really <i>reshape</i> problems. Feeding data to a model, stacking features, building a batch dimension, or aligning arrays for broadcasting all come down to getting the shape right — and <code>reshape</code>/<code>newaxis</code> are how you do it in one line, usually with <b>zero copy</b>.</p>" +
      "<p>Knowing that reshape and transpose return <b>views</b> matters for both speed and correctness: it's free, but an in-place edit to the view mutates the original. When you need an independent array, ask for a copy explicitly. And <code>-1</code> inference keeps code robust when only one dimension is known ahead of time (e.g. <code>x.reshape(batch, -1)</code>).</p>" +
      "<pre class=\"why-pre\">x.reshape(-1, 1)   # (n,) -> (n,1) column;  x.reshape(1, -1)  # -> (1,n) row</pre>",

    recognize: [
      { q: "\"convert this vector into a column / row\"", think: "a[:, None] for a column (n,1); a[None, :] for a row (1,n); or reshape(-1,1)/(1,-1)" },
      { q: "\"reshape but I only know one dimension\"", think: "pass -1 for the unknown axis and let NumPy infer it from size" },
      { q: "\"cannot reshape array of size X into shape Y\"", think: "the products don't match -- new shape must have the same total size" },
      { q: "\"I flattened it and the original changed too\"", think: "ravel returns a VIEW; use flatten() (or .copy()) for an independent array" },
      { q: "\"swap rows and columns of a matrix\"", think: "m.T or m.transpose() -- a view, no data moved" }
    ],

    matchTags: ["shape", "ndim", "size", "reshape", "ravel", "flatten", "transpose", "newaxis", "view", "axis"],

    traps: [
      {
        bad: "a = np.arange(10)\na.reshape(3, 4)   # ValueError: cannot reshape size 10 into (3,4)",
        good: "a = np.arange(12)\na.reshape(3, 4)   # ok: 3*4 == 12; or a.reshape(2, -1) to infer",
        why: "reshape cannot change the number of elements. The product of the new shape must equal size. Use -1 to infer one axis instead of computing it by hand."
      },
      {
        bad: "flat = m.ravel()\nflat[0] = 0        # ravel is a VIEW -> this also changes m!",
        good: "flat = m.flatten()   # always a copy; edits don't touch m\n# or: flat = m.ravel().copy()",
        why: "ravel returns a view when the layout allows, so writing to it mutates the original array. Use flatten (or add .copy()) when you need an independent flat array."
      },
      {
        bad: "v = np.array([1, 2, 3])\nM + v              # if M is (3,3) this broadcasts across ROWS, maybe not what you want",
        good: "M + v[:, np.newaxis]   # v -> (3,1), now it broadcasts down the COLUMNS",
        why: "A 1-D array aligns to the LAST axis. To control which axis it broadcasts over, insert a size-1 dimension with np.newaxis (or None) to make it (3,1) vs (1,3)."
      }
    ],

    complexity: [
      { op: "arr.shape / ndim / size", big_o: "O(1)", note: "These read stored metadata, so they return instantly regardless of how many elements the array holds." },
      { op: "reshape (view)", big_o: "O(1)", note: "When the data is contiguous it only rewrites shape and stride metadata, so no elements are moved or copied." },
      { op: "reshape (forced copy)", big_o: "O(n)", note: "If the requested layout can't be a view (e.g. after some transposes), NumPy copies the whole buffer, costing one full pass." },
      { op: "transpose / .T", big_o: "O(1)", note: "Swaps the shape and stride entries to reinterpret the same buffer, so it never moves data." },
      { op: "flatten()", big_o: "O(n)", note: "Always allocates a new contiguous buffer and copies every element, since it guarantees an independent array." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Shape and strides are just metadata over one flat buffer. <code>reshape</code> and <code>transpose</code> return a <b>view</b> — they rewrite that metadata and share the original memory, which is why editing a view is visible in the original and why they're O(1). <code>flatten()</code> always copies, so it's independent but O(n).</p>" +
      "<p>NumPy stores rows in <b>C order</b> (row-major) by default: the last axis varies fastest in memory. Fortran order (column-major) is the transpose of that layout. <code>reshape</code> can stay a view only when the requested traversal matches the buffer's contiguity; when it can't (for instance reshaping a transposed array), NumPy silently makes a copy. Adding a <code>newaxis</code> is always a view — it just inserts a size-1 axis (with stride 0's role in broadcasting), giving you the extra dimension that makes shapes align.</p>",

    challenge: {
      prompt:
        "Take np.arange(6). (1) Reshape it to (2, 3) using -1 for one axis. (2) Show that transposing gives (3, 2) and is a view (edit it, see the change in the original). (3) Turn the original 1-D array into a column of shape (6, 1) two different ways. Which flatten call is safe to edit without touching the source?",
      starter:
        "import numpy as np\n" +
        "a = np.arange(6)\n" +
        "# TODO: reshape with -1, prove transpose is a view, make a (6,1) column,\n" +
        "#       and pick the copy-making flatten\n",
      solution:
        "import numpy as np\n" +
        "a = np.arange(6)\n" +
        "m = a.reshape(2, -1)        # (2, 3) -> -1 inferred as 3\n" +
        "print(m.shape)              # (2, 3)\n" +
        "t = m.T                     # (3, 2), a VIEW of the same buffer\n" +
        "t[0, 0] = 99\n" +
        "print(a[0])                 # 99 -> edit to the view reached the original\n" +
        "col1 = a[:, np.newaxis]     # (6, 1) via newaxis\n" +
        "col2 = a.reshape(-1, 1)     # (6, 1) via reshape\n" +
        "print(col1.shape, col2.shape)   # (6, 1) (6, 1)\n" +
        "safe = a.flatten()          # flatten COPIES, so editing it is safe\n" +
        "safe[0] = -1\n" +
        "print(a[0])                 # still 99 -> flatten did not touch the source"
    }
  }
]);
