/*
 * data/numpy/concepts_advanced.js — NumPy "Learn" advanced topics.
 * Registered into window.LEARN under the "numpy" stack. Runnable in-browser via
 * Pyodide (numpy auto-loads). Content grounded in NumPy's documented behavior
 * (np.linalg, np.random Generator, ndarray memory model); teaching structure
 * mirrors the broadcasting exemplar.
 */
window.LEARN.register("numpy", "Advanced", [
  {
    id: "linear-algebra",
    title: "Linear Algebra",
    difficulty: "Advanced",
    estMinutes: 12,
    relevance: 3,
    tagline: "Matrix products with @, and solving/inverting/measuring systems with np.linalg — the math engine behind ML, graphics, and simulations.",

    whatIsIt: [
      "NumPy's linear algebra splits into two worlds that beginners constantly confuse. <code>*</code> is <b>elementwise</b> multiplication (Hadamard product): it multiplies matching positions. <code>@</code> (and <code>np.dot</code> / <code>np.matmul</code>) is the <b>matrix product</b>: rows-times-columns, the operation from your linear-algebra class.",
      "For 2-D arrays, <code>A @ B</code> requires the inner dimensions to match — <code>(m,k) @ (k,n) -> (m,n)</code>. The same <code>@</code> also does vector dot products (<code>(n,) @ (n,) -> scalar</code>) and batched matrix products for stacks of matrices.",
      "The <code>np.linalg</code> module holds the heavier tools: <code>np.linalg.solve(A, b)</code> solves <code>Ax = b</code>, <code>np.linalg.inv(A)</code> inverts a square matrix, <code>np.linalg.norm(v)</code> measures length/magnitude, and <code>np.linalg.eig(A)</code> returns eigenvalues and eigenvectors. These are backed by battle-tested LAPACK/BLAS routines."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "A = np.array([[1., 2.], [3., 4.]])\n" +
        "B = np.array([[5., 6.], [7., 8.]])\n" +
        "\n" +
        "# * is ELEMENTWISE (multiply matching positions)\n" +
        "print(A * B)\n" +
        "# [[ 5. 12.]\n" +
        "#  [21. 32.]]\n" +
        "\n" +
        "# @ is the MATRIX PRODUCT (rows times columns)\n" +
        "print(A @ B)\n" +
        "# [[19. 22.]\n" +
        "#  [43. 50.]]\n" +
        "\n" +
        "# solve A x = b  (preferred over inv)\n" +
        "b = np.array([1., 1.])\n" +
        "x = np.linalg.solve(A, b)\n" +
        "print(x)                      # [-1.  1.]\n" +
        "print(A @ x)                  # [1. 1.]  -> checks out\n" +
        "\n" +
        "# vector length via the L2 norm\n" +
        "print(np.linalg.norm([3., 4.]))   # 5.0",
      caption:
        "A * B multiplies element-by-element; A @ B is the real matrix product. np.linalg.solve(A, b) finds x in Ax=b, and np.linalg.norm gives the Euclidean length of a vector."
    },

    whyMatters:
      "<p>Almost every numerical workload reduces to linear algebra: a neural-network layer is <code>X @ W + b</code>, least-squares regression solves a linear system, PCA is an eigen-decomposition, and 3-D graphics multiply coordinate vectors by transformation matrices. Knowing which operator does what is the difference between correct math and silent garbage.</p>" +
      "<ul>" +
      "<li><b>Prefer <code>solve</code> over <code>inv</code>:</b> to compute <code>x = A⁻¹b</code>, call <code>np.linalg.solve(A, b)</code> — it is faster and numerically more stable than forming the inverse and multiplying.</li>" +
      "<li><b>Norms measure size:</b> <code>norm(v)</code> for vector length, <code>norm(a - b)</code> for distance, <code>norm(M, axis=1)</code> for per-row magnitudes.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">theta = np.linalg.solve(X.T @ X, X.T @ y)   # least-squares fit (normal equations)</pre>",

    recognize: [
      { q: "\"the two matrices multiply but the result looks wrong\"", think: "you probably used * (elementwise) where you meant @ (matrix product), or vice versa" },
      { q: "\"solve for x in A x = b\"", think: "np.linalg.solve(A, b) — do not compute inv(A) @ b" },
      { q: "\"how long / how far is this vector\"", think: "np.linalg.norm(v), or norm(a - b) for the distance between two points" },
      { q: "\"shapes (m,k) and (p,n) won't multiply\"", think: "matmul needs the inner dims equal: k must equal p; check with .shape and transpose if needed" },
      { q: "\"principal axes / stretch directions of a matrix\"", think: "np.linalg.eig returns (eigenvalues, eigenvectors)" }
    ],

    matchTags: ["dot", "matmul", "@", "matrix", "inverse", "solve", "norm", "linalg", "eigen"],

    traps: [
      {
        bad: "A = np.array([[1, 2], [3, 4]])\nB = np.array([[5, 6], [7, 8]])\nA * B                      # elementwise, NOT the matrix product",
        good: "A @ B                      # matrix product (or np.matmul(A, B) / np.dot(A, B))",
        why: "* is always elementwise. For rows-times-columns matrix multiplication use @, np.matmul, or np.dot. Mixing them up compiles fine and returns a same-shaped array, so the bug is silent."
      },
      {
        bad: "x = np.linalg.inv(A) @ b   # forms the full inverse first",
        good: "x = np.linalg.solve(A, b)  # solves directly",
        why: "Explicitly inverting is slower and accumulates more floating-point error than solving the system directly. Only compute inv(A) when you genuinely need the inverse matrix itself."
      },
      {
        bad: "vals, vecs = np.linalg.eig(A)\nfirst = vecs[0]            # WRONG: that's a row, not an eigenvector",
        good: "first = vecs[:, 0]         # eigenvectors are the COLUMNS of vecs",
        why: "np.linalg.eig returns eigenvectors as the columns of the second output, so eigenvector i is vecs[:, i]. Indexing a row silently mixes components from different eigenvectors."
      }
    ],

    complexity: [
      { op: "A @ B, (n,n) @ (n,n)", big_o: "O(n^3)", note: "A dense matrix product of two n-by-n matrices costs about n^3 multiply-adds, handed off to tuned BLAS routines." },
      { op: "u @ v (vector dot)", big_o: "O(n)", note: "A dot product of two length-n vectors is a single pass of n multiply-adds." },
      { op: "np.linalg.solve(A, b)", big_o: "O(n^3)", note: "Solving an n-by-n system uses LU decomposition, which is roughly n^3/3 operations — cheaper than forming the inverse." },
      { op: "np.linalg.inv(A)", big_o: "O(n^3)", note: "Inverting an n-by-n matrix is also cubic but does more work than solve, so avoid it unless the inverse itself is needed." },
      { op: "np.linalg.norm(v)", big_o: "O(n)", note: "An L2 norm squares and sums n elements in one pass, then takes a single square root." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> The single most common mistake is treating <code>*</code> as matrix multiplication — it is <b>elementwise</b>. The matrix product is <code>@</code> / <code>np.matmul</code> / <code>np.dot</code>. Keep them straight and half of linear-algebra bugs disappear.</p>" +
      "<p>Matrix multiplication and the <code>np.linalg</code> solvers do not run in interpreted Python. They dispatch to <b>BLAS and LAPACK</b> — decades-old, heavily optimized Fortran/C libraries that use blocking and CPU vector instructions. That is why a <code>(1000,1000) @ (1000,1000)</code> product finishes in a fraction of a second while the equivalent triple-nested Python loop would take minutes.</p>",

    challenge: {
      prompt:
        "You have 3 data points and want to fit a line y = m·x + c through them by least squares. Build the design matrix X with a column of x-values and a column of ones, then solve the normal equations (Xᵀ X) θ = Xᵀ y for θ = [m, c]. Print θ and verify X @ θ is close to y.",
      starter:
        "import numpy as np\n" +
        "xs = np.array([0., 1., 2.])\n" +
        "y  = np.array([1., 3., 5.])   # perfectly on y = 2x + 1\n" +
        "# TODO: build X = [[x, 1], ...], solve (X.T @ X) theta = X.T @ y, print theta and X @ theta\n",
      solution:
        "import numpy as np\n" +
        "xs = np.array([0., 1., 2.])\n" +
        "y  = np.array([1., 3., 5.])\n" +
        "X = np.column_stack([xs, np.ones_like(xs)])   # shape (3, 2): [x, 1]\n" +
        "theta = np.linalg.solve(X.T @ X, X.T @ y)     # solve, don't invert\n" +
        "print(theta)                 # [2. 1.]  -> slope 2, intercept 1\n" +
        "print(X @ theta)             # [1. 3. 5.]  -> matches y\n" +
        "# X.T @ X is (2,2), X.T @ y is (2,); solve returns [m, c].\n" +
        "# @ is the matrix product throughout; using * here would be wrong."
    }
  },

  {
    id: "random",
    title: "Random",
    difficulty: "Core",
    estMinutes: 10,
    relevance: 3,
    tagline: "Reproducible randomness the modern way: one np.random.default_rng(seed) Generator for integers, samples, normals, shuffles, and permutations.",

    whatIsIt: [
      "NumPy's modern random API starts with a <b>Generator</b>: <code>rng = np.random.default_rng(seed)</code>. You create it once and call methods on it. Passing a <b>seed</b> makes every subsequent draw <b>reproducible</b> — the same seed always yields the same sequence, which is essential for debuggable experiments and tests.",
      "The Generator covers the common needs: <code>rng.integers(low, high, size)</code> for random ints, <code>rng.random(size)</code> for floats in [0, 1), <code>rng.normal(mean, std, size)</code> for Gaussian samples, <code>rng.choice(a, size, replace=...)</code> for sampling from a set, and <code>rng.shuffle</code> / <code>rng.permutation</code> for reordering.",
      "This <b>replaces the legacy</b> functions like <code>np.random.seed</code> and <code>np.random.rand</code>. The old global-state API still works but the docs now recommend the explicit Generator: it is faster, statistically better, and avoids one part of your program silently reseeding another."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "# one seeded Generator -> fully reproducible\n" +
        "rng = np.random.default_rng(42)\n" +
        "\n" +
        "print(rng.integers(0, 10, size=5))   # random ints in [0, 10)\n" +
        "print(rng.random(3))                 # floats in [0, 1)\n" +
        "print(rng.normal(0, 1, size=3))      # standard-normal samples\n" +
        "\n" +
        "# sample 3 items WITHOUT replacement\n" +
        "print(rng.choice(['a', 'b', 'c', 'd'], size=3, replace=False))\n" +
        "\n" +
        "# permutation returns a shuffled COPY; shuffle is in-place\n" +
        "print(rng.permutation(np.arange(5)))\n" +
        "\n" +
        "# same seed -> identical first draw, every run\n" +
        "rng2 = np.random.default_rng(42)\n" +
        "print(rng2.integers(0, 10, size=5))  # matches the first line above",
      caption:
        "default_rng(42) builds a seeded Generator; integers/random/normal/choice draw from it. A fresh Generator with the SAME seed reproduces the same sequence — reproducibility by construction."
    },

    whyMatters:
      "<p>Reproducibility is the whole game in data work. A model that trains differently every run is impossible to debug or compare; a test that uses unseeded randomness fails intermittently. Seeding one Generator pins the entire experiment so results are repeatable and diffable.</p>" +
      "<ul>" +
      "<li><b>One Generator, passed around:</b> create <code>rng</code> at the top and hand it to functions, rather than reseeding a global inside each call.</li>" +
      "<li><b>shuffle vs permutation:</b> <code>rng.shuffle(a)</code> reorders <code>a</code> in place and returns None; <code>rng.permutation(a)</code> leaves <code>a</code> alone and returns a shuffled copy.</li>" +
      "<li><b>Sampling:</b> <code>rng.choice(..., replace=False)</code> for a subset with no repeats; the default <code>replace=True</code> allows repeats.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">rng = np.random.default_rng(0)\nidx = rng.permutation(len(X))     # shuffle a dataset by index, reproducibly\nX, y = X[idx], y[idx]</pre>",

    recognize: [
      { q: "\"my results change every time I run the script\"", think: "seed a Generator: rng = np.random.default_rng(seed) and draw from rng" },
      { q: "\"shuffle my dataset before splitting\"", think: "rng.permutation(n) for an index order, then index both X and y with it" },
      { q: "\"pick k items at random, no duplicates\"", think: "rng.choice(items, size=k, replace=False)" },
      { q: "\"I need normally-distributed noise\"", think: "rng.normal(mean, std, size=...)" },
      { q: "\"tutorial uses np.random.seed / np.random.rand\"", think: "that's the legacy API; prefer default_rng(seed) and rng.random for new code" }
    ],

    matchTags: ["random", "seed", "rng", "normal", "choice", "shuffle", "permutation", "sample"],

    traps: [
      {
        bad: "a = np.arange(5)\nb = rng.shuffle(a)         # b is None!\nprint(b)                   # None",
        good: "b = rng.permutation(a)     # returns a shuffled COPY; a is untouched",
        why: "rng.shuffle reorders its argument in place and returns None. If you want a returned value (and to keep the original), use rng.permutation, which produces a new array."
      },
      {
        bad: "def sample():\n    rng = np.random.default_rng(0)   # reseeds EVERY call\n    return rng.random()              # always the same number",
        good: "rng = np.random.default_rng(0)   # create ONCE, outside\ndef sample():\n    return rng.random()              # advances the stream each call",
        why: "Re-creating a seeded Generator inside a function resets the stream every time, so you get the identical 'random' value on each call. Build the Generator once and reuse it."
      },
      {
        bad: "rng.choice([1, 2, 3], size=5, replace=False)   # ValueError",
        good: "rng.choice([1, 2, 3], size=5)                  # replace=True allows repeats",
        why: "Sampling without replacement cannot draw more items than exist in the population. Either reduce size to at most the population count or allow replacement."
      }
    ],

    complexity: [
      { op: "default_rng(seed)", big_o: "O(1)", note: "Constructing a seeded Generator just initializes the bit-generator state; it does no sampling work." },
      { op: "rng.random(n) / integers(n)", big_o: "O(n)", note: "Drawing n values is a single vectorized pass in C, one step of the bit generator per element." },
      { op: "rng.normal(size=n)", big_o: "O(n)", note: "Each normal sample is a constant amount of work, so generating n of them scales linearly with n." },
      { op: "rng.choice(a, k, replace=False)", big_o: "O(n)", note: "Sampling k without replacement from n items is linear in the population size n, not just in k." },
      { op: "rng.permutation(n)", big_o: "O(n)", note: "A Fisher-Yates style shuffle touches each of the n elements once, giving linear time." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Prefer the modern <code>np.random.default_rng(seed)</code> <b>Generator</b> over the legacy <code>np.random.seed</code> + <code>np.random.rand</code> family. The legacy functions share one hidden global state, so unrelated code (or a library you imported) can reseed or advance it behind your back. A Generator object is explicit: whoever holds it controls its stream.</p>" +
      "<p>A Generator wraps a fast bit generator (PCG64 by default) that turns internal state into uniform bits; every distribution — normals, integers, choices — is derived from those bits. Seeding fixes the starting state, so the whole derived sequence is deterministic. That is why one seed reproduces an entire run exactly.</p>",

    challenge: {
      prompt:
        "Do a reproducible train/test split. Given X (10 rows) and y, use a seeded Generator to shuffle the row indices, then take the first 7 as train and the last 3 as test. Print the two index groups, and prove reproducibility by re-running with the same seed and getting the identical split.",
      starter:
        "import numpy as np\n" +
        "X = np.arange(20).reshape(10, 2)\n" +
        "y = np.arange(10)\n" +
        "# TODO: seed a Generator, permute indices, split 7/3, print train & test indices\n",
      solution:
        "import numpy as np\n" +
        "X = np.arange(20).reshape(10, 2)\n" +
        "y = np.arange(10)\n" +
        "rng = np.random.default_rng(7)\n" +
        "idx = rng.permutation(len(X))     # shuffled row order, reproducible\n" +
        "train_idx, test_idx = idx[:7], idx[7:]\n" +
        "print('train', train_idx)\n" +
        "print('test ', test_idx)\n" +
        "X_train, y_train = X[train_idx], y[train_idx]\n" +
        "# same seed -> same permutation, every run:\n" +
        "again = np.random.default_rng(7).permutation(len(X))\n" +
        "print(np.array_equal(idx, again))   # True"
    }
  },

  {
    id: "performance-vs-lists",
    title: "Performance vs Lists",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Why a NumPy array crushes a Python list: one contiguous typed buffer and C-level vectorized loops instead of boxed objects and interpreted iteration.",

    whatIsIt: [
      "A Python <b>list</b> is an array of <b>pointers</b> to full Python objects scattered around the heap. Each <code>int</code> in <code>[1, 2, 3]</code> is a boxed object with its own type tag and reference count. Looping over it runs the <b>interpreter</b> once per element, and each arithmetic op dispatches on the object's type.",
      "A NumPy <b>ndarray</b> is one <b>contiguous block of typed memory</b> — e.g. 1,000,000 <code>float64</code>s packed as 8 bytes each, back to back. Operations like <code>a + b</code> or <code>a * 2</code> run a single <b>vectorized C loop</b> over that buffer, with no Python object per element and no per-element interpreter overhead.",
      "The payoff is both <b>speed</b> and <b>memory</b>: vectorized array ops are commonly <b>10–100× faster</b> than the equivalent Python loop, and the packed buffer uses far less memory than a list of boxed objects. The rule of thumb: if you are writing a Python <code>for</code> loop over array elements, there is almost always a faster vectorized form."
    ],

    showMe: {
      code:
        "import numpy as np\n" +
        "\n" +
        "n = 1_000_000\n" +
        "\n" +
        "# Python list: interpreted loop, one boxed object per element\n" +
        "py = list(range(n))\n" +
        "sq_list = [v * v for v in py]     # runs the interpreter n times\n" +
        "\n" +
        "# NumPy: one contiguous buffer, one vectorized C loop\n" +
        "arr = np.arange(n)\n" +
        "sq_arr = arr * arr               # no Python-level loop at all\n" +
        "\n" +
        "print(sq_arr[:5])                 # [ 0  1  4  9 16]\n" +
        "print(sq_arr.sum())              # 333332833333500000\n" +
        "\n" +
        "# memory: packed typed bytes vs a list of pointers-to-objects\n" +
        "print(arr.dtype, arr.itemsize)   # int64 8\n" +
        "print(arr.nbytes, 'bytes')       # 8000000 bytes (8 MB, tightly packed)",
      caption:
        "The list comprehension runs the interpreter a million times; arr * arr runs one C loop over a packed buffer. nbytes shows the array is a single 8-byte-per-element block, not a list of boxed objects."
    },

    whyMatters:
      "<p>This is the reason NumPy exists. Data pipelines, feature engineering, and numerical simulation touch millions of values; doing that in Python loops is often the difference between a script that finishes in milliseconds and one that takes minutes. Vectorizing is usually the single biggest performance win available.</p>" +
      "<ul>" +
      "<li><b>Avoid element loops:</b> replace <code>for i in range(len(a)): out[i] = a[i] * 2</code> with <code>out = a * 2</code>.</li>" +
      "<li><b>Contiguous + typed = cache-friendly:</b> the CPU streams a packed buffer efficiently; chasing scattered pointers stalls it.</li>" +
      "<li><b>Less memory:</b> a million int64s is ~8 MB in an array versus tens of MB as a Python list of int objects.</li>" +
      "</ul>" +
      "<pre class=\"why-pre\">total = (prices * quantities).sum()   # one vectorized pass; no Python loop</pre>",

    recognize: [
      { q: "\"my loop over a big list is too slow\"", think: "put the data in an ndarray and express the loop body as a vectorized array expression" },
      { q: "\"for i in range(len(a)): ... a[i] ...\"", think: "that's the vectorization smell — rewrite as whole-array ops (a * 2, a + b, a.sum())" },
      { q: "\"summing / averaging millions of numbers\"", think: "arr.sum() / arr.mean() run in C; a Python loop with += is far slower" },
      { q: "\"this list of numbers uses too much memory\"", think: "a typed ndarray packs values contiguously and drops the per-object overhead" },
      { q: "\"I need speed but I'm calling a Python function per element\"", think: "look for a NumPy ufunc / vectorized equivalent so the loop runs in C" }
    ],

    matchTags: ["performance", "vectorize", "loop", "memory", "speed", "contiguous"],

    traps: [
      {
        bad: "out = []\nfor v in arr:\n    out.append(v * 2)    # interpreter runs once per element\nout = np.array(out)",
        good: "out = arr * 2            # single vectorized C loop over the buffer",
        why: "Looping in Python and rebuilding an array throws away NumPy's whole advantage. The vectorized form stays in C the entire time and is typically 10-100x faster."
      },
      {
        bad: "total = 0\nfor v in arr:\n    total += v           # slow Python accumulation",
        good: "total = arr.sum()        # reduction in C",
        why: "Reductions like sum, mean, min, max have optimized C implementations. A Python += loop pays interpreter and boxing overhead on every single element."
      },
      {
        bad: "big = np.arange(10**8, dtype=np.int64)   # ~800 MB\nbig = big.astype(np.float64)             # doubles into another ~800 MB",
        good: "big = np.arange(10**8, dtype=np.int32)   # pick the smallest dtype that fits",
        why: "dtype directly controls memory: int8/int16/int32/float32 use less than the 64-bit defaults. Casting also allocates a whole new buffer, so avoid needless conversions on large arrays."
      }
    ],

    complexity: [
      { op: "arr * 2 (vectorized)", big_o: "O(n)", note: "Still linear in element count, but each element is handled by a tight C loop rather than a full interpreter step, so the constant factor is far smaller." },
      { op: "Python loop over list", big_o: "O(n)", note: "Same asymptotic order as the vectorized op, yet 10-100x slower in practice because every iteration incurs interpreter dispatch and object boxing." },
      { op: "arr.sum() (reduction)", big_o: "O(n)", note: "One C pass accumulates all n elements; no per-element Python overhead, unlike a += loop." },
      { op: "element access arr[i]", big_o: "O(1)", note: "A single indexed read is constant time, but doing it a million times from Python reintroduces the very per-element overhead vectorization avoids." },
      { op: "np.array(pylist)", big_o: "O(n)", note: "Converting a Python list copies and unboxes each element once into the packed typed buffer; do it once, not repeatedly inside a loop." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A Python list stores <b>pointers to boxed objects</b>: each element is a separate heap-allocated Python object with a type tag and refcount, and the elements can live anywhere in memory. An ndarray stores <b>one contiguous typed buffer</b> — raw values packed back to back with a single dtype. That is the root of every difference.</p>" +
      "<p>Because the buffer is contiguous and typed, <code>a + b</code> dispatches once to a C loop that walks raw memory with CPU vector instructions and good cache behavior — no per-element Python object, no per-element type check. That is why vectorized ops run <b>10-100x faster</b> and use less memory than the list-of-objects equivalent. The practical takeaway: keep data in arrays and express computation as whole-array operations instead of Python loops.</p>",

    challenge: {
      prompt:
        "You are given a Python list of a million numbers and a slow loop that computes the sum of squares. Rewrite it as a vectorized NumPy one-liner, confirm the two results match, and report how many bytes the packed array uses via nbytes.",
      starter:
        "import numpy as np\n" +
        "data = list(range(1_000_000))\n" +
        "# slow reference:\n" +
        "ref = 0\n" +
        "for v in data:\n" +
        "    ref += v * v\n" +
        "# TODO: build an ndarray, compute sum of squares vectorized, compare to ref, print nbytes\n",
      solution:
        "import numpy as np\n" +
        "data = list(range(1_000_000))\n" +
        "ref = 0\n" +
        "for v in data:\n" +
        "    ref += v * v\n" +
        "arr = np.array(data)                 # one contiguous typed buffer\n" +
        "fast = (arr * arr).sum()             # vectorized: C loop, no Python iteration\n" +
        "print(fast, ref, fast == ref)        # 333332833333500000 ... True\n" +
        "print(arr.nbytes, 'bytes')           # 8000000 bytes (int64: 8 per element)\n" +
        "# The loop ran the interpreter a million times; the array version ran one\n" +
        "# C pass over packed memory."
    }
  }
]);
