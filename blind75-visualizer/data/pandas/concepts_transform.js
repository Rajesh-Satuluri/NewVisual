/*
 * data/pandas/concepts_transform.js — Pandas "Learn" topics.
 * Registered into window.LEARN under the "pandas" stack. Runnable in-browser via
 * Pyodide (pandas ~2.x auto-loads). Snippets use stable core APIs only.
 */
window.LEARN.register("pandas", "Transform", [
  {
    id: "apply-map-vectorization",
    title: "Apply, Map & Vectorization",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Operate on whole columns at once — vectorized ops run in C and beat row-wise .apply by orders of magnitude.",

    whatIsIt: [
      "<b>Vectorization</b> means applying an operation to an entire Series/array in one shot (<code>df['a'] * df['b']</code>) instead of looping row by row. Pandas dispatches these to compiled C/NumPy code — no Python-level loop, no per-row interpreter overhead.",
      "<code>Series.map(dict_or_func)</code> transforms each value of one column (great for relabeling via a dict). <code>df.apply(func, axis=0)</code> runs a function <b>once per column</b>; <code>axis=1</code> runs it <b>once per row</b> — the slow path, because it calls Python for every row.",
      "For conditional columns, reach for <code>np.where(cond, a, b)</code> (vectorized if/else) or <code>Series.where(cond, other)</code> (keep where True, replace elsewhere) rather than an <code>apply</code> with an <code>if</code> inside. The big lesson: <b>prefer built-in vectorized ops; treat row-wise <code>apply</code> as a last resort.</b>"
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'name':  ['Asha','Ravi','Mia','Sam'],\n" +
        "    'price': [100.0, 250.0, 80.0, 300.0],\n" +
        "    'qty':   [2, 1, 5, 3],\n" +
        "})\n" +
        "\n" +
        "# SLOW: row-wise apply calls a Python function once PER ROW\n" +
        "df['total_slow'] = df.apply(lambda r: r['price'] * r['qty'], axis=1)\n" +
        "\n" +
        "# FAST: vectorized column arithmetic — one C-level pass, same result\n" +
        "df['total_fast'] = df['price'] * df['qty']\n" +
        "\n" +
        "# conditional column without a loop\n" +
        "df['tier'] = np.where(df['total_fast'] >= 300, 'high', 'low')\n" +
        "\n" +
        "# Series.map: relabel values through a dict\n" +
        "df['code'] = df['name'].map({'Asha':'A','Ravi':'R','Mia':'M','Sam':'S'})\n" +
        "\n" +
        "print(df)",
      caption:
        "total_slow (row-wise apply) and total_fast (vectorized) are identical, but the vectorized form runs far faster and reads cleaner. np.where builds the tier column with no Python loop; Series.map relabels names via a dict."
    },

    whyMatters:
      "<p>Reaching for <code>df.apply(..., axis=1)</code> is the single most common performance mistake beginners make. It looks convenient, but it executes your Python function once for every row — on a million-row frame that is a million interpreter round-trips. The vectorized equivalent hands the whole column to compiled code and finishes in a fraction of the time.</p>" +
      "<p>The mental model to build:</p>" +
      "<ul>" +
      "<li><b>Arithmetic / comparisons on columns</b> → just write them (<code>df['a'] + df['b']</code>, <code>df['a'] > 0</code>). Already vectorized.</li>" +
      "<li><b>Conditional value</b> → <code>np.where</code> / <code>Series.where</code>, not an <code>apply</code> with <code>if</code>.</li>" +
      "<li><b>Per-value lookup/relabel</b> → <code>Series.map(dict)</code>.</li>" +
      "<li><b>Row-wise <code>apply</code></b> → only when the logic genuinely cannot be expressed as column ops.</li>" +
      "</ul>",

    recognize: [
      { q: "\"new column = arithmetic on other columns\"", think: "df['c'] = df['a'] * df['b'] — plain vectorized math, no apply" },
      { q: "\"if/else value per row\" (flag, bucket, category)", think: "np.where(cond, a, b); nest or use np.select for many branches" },
      { q: "\"replace values that fail a condition, keep the rest\"", think: "Series.where(cond, other) — keeps where True" },
      { q: "\"map each value through a lookup table / dict\"", think: "df['col'].map(mapping)" },
      { q: "\"my .apply(axis=1) is really slow on a big frame\"", think: "rewrite as column ops / np.where — vectorize the logic" }
    ],

    matchTags: ["apply", "map", "applymap", "vectorization", "vectorized", "np.where", "where",
                "transform", "elementwise", "performance", "axis"],

    traps: [
      {
        bad: "df['total'] = df.apply(lambda r: r['price'] * r['qty'], axis=1)   # Python loop per row",
        good: "df['total'] = df['price'] * df['qty']                            # vectorized, C speed",
        why: "axis=1 apply invokes your function once per row. Simple arithmetic between columns is already vectorized — just write it as column math."
      },
      {
        bad: "df['tier'] = df['total'].apply(lambda x: 'high' if x >= 300 else 'low')",
        good: "df['tier'] = np.where(df['total'] >= 300, 'high', 'low')",
        why: "A conditional per element is exactly what np.where is for. It evaluates the whole condition array at once instead of calling Python for each value."
      },
      {
        bad: "df['code'] = df['name'].apply(lambda n: mapping[n])   # KeyError-prone, slow",
        good: "df['code'] = df['name'].map(mapping)                 # vectorized lookup, unmatched -> NaN",
        why: "Series.map is the built-in for dict lookups: faster, and missing keys become NaN instead of raising, which is usually what you want."
      }
    ],

    complexity: [
      { op: "df['a'] * df['b'] (vectorized)", big_o: "O(n)", note: "One compiled pass over the arrays; the fast path, no Python per element." },
      { op: "np.where(cond, a, b)", big_o: "O(n)", note: "Evaluates the condition and selects elementwise in C — vectorized if/else." },
      { op: "Series.map(dict)", big_o: "O(n)", note: "Hash lookup per value, but the loop runs in optimized code, not the Python interpreter." },
      { op: "df.apply(fn, axis=1)", big_o: "O(n · f) in Python", note: "Calls your function once per row with full interpreter overhead — the slow path to avoid on hot code." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A pandas column is backed by a contiguous NumPy (or extension) array. Vectorized operations push the loop down into C/NumPy, where it runs over raw memory with no per-element Python object creation. That is why <code>df['a'] * df['b']</code> can be 10–100× faster than the equivalent <code>apply(axis=1)</code>.</p>" +
      "<p><code>apply(axis=1)</code> is slow for two reasons: it constructs a Series object for each row and it re-enters the Python interpreter every iteration. <code>map</code> and elementwise <code>apply</code> on a single Series are less costly but still Python-level; prefer true vectorized primitives (<code>np.where</code>, <code>np.select</code>, arithmetic, string/`dt` accessors) whenever the logic allows.</p>" +
      "<p>For multi-branch conditions, <code>np.select(condlist, choicelist, default=...)</code> stays vectorized where a chain of <code>if/elif</code> inside an apply would not.</p>",

    challenge: {
      prompt:
        "Given the products frame below, add revenue = price * units WITHOUT using apply, and a flag column that is 'bulk' when revenue >= 100 else 'normal' using np.where. Then prove your vectorized revenue matches a row-wise apply result. Print the frame and the True/False check.",
      starter:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'product': ['A', 'B', 'C', 'D'],\n" +
        "    'price':   [20.0, 50.0, 15.0, 80.0],\n" +
        "    'units':   [3, 1, 10, 2],\n" +
        "})\n" +
        "# TODO: df['revenue'] = ...   df['flag'] = np.where(...)\n" +
        "# then compare against df.apply(..., axis=1) and print(df)\n",
      solution:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'product': ['A', 'B', 'C', 'D'],\n" +
        "    'price':   [20.0, 50.0, 15.0, 80.0],\n" +
        "    'units':   [3, 1, 10, 2],\n" +
        "})\n" +
        "df['revenue'] = df['price'] * df['units']            # vectorized, no apply\n" +
        "df['flag'] = np.where(df['revenue'] >= 100, 'bulk', 'normal')\n" +
        "print(df)\n" +
        "slow = df.apply(lambda r: r['price'] * r['units'], axis=1)\n" +
        "print(bool((slow == df['revenue']).all()))           # True — same numbers\n" +
        "# vectorized math replaces the row-wise loop and is far faster at scale."
    }
  },

  {
    id: "missing-data",
    title: "Missing Data",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "NaN, None and pd.NA — how to detect, drop, and fill gaps, and why one missing value turns an int column into float.",

    whatIsIt: [
      "Pandas represents a missing value as <code>NaN</code> (a float sentinel from NumPy), sometimes <code>None</code>, and the newer typed <code>pd.NA</code>. Because <code>NaN</code> is a <b>float</b>, a single missing value forces an integer column to become <code>float64</code> — that is why counts and ids sometimes show up as <code>10.0</code>.",
      "Detect gaps with <code>df.isna()</code> / <code>df.notna()</code> (and the aliases <code>isnull</code>/<code>notnull</code>). <code>df.isna().sum()</code> gives a missing-count per column — usually your first move on a new dataset.",
      "Remove gaps with <code>dropna</code>: <code>how='any'|'all'</code>, <code>subset=[...]</code> to look at specific columns, <code>thresh=k</code> to keep rows with at least k non-null values. Fill them with <code>fillna(value)</code>, forward/back fill via <code>.ffill()</code> / <code>.bfill()</code> (the modern form of <code>fillna(method='ffill'/'bfill')</code>), or <code>interpolate()</code> for numeric gap-filling."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'city':  ['NY', 'LA', 'SF', 'NY'],\n" +
        "    'temp':  [30.0, np.nan, 18.0, np.nan],\n" +
        "    'humid': [55.0, 60.0, np.nan, 50.0],\n" +
        "})\n" +
        "\n" +
        "print(df['temp'].dtype)      # float64 — one NaN forces the column to float\n" +
        "print(df.isna().sum())       # missing values per column\n" +
        "print()\n" +
        "\n" +
        "print(df['temp'].mean())     # 24.0 — NaN skipped by default (skipna=True)\n" +
        "print(df['temp'].sum())      # 48.0 — aggregations ignore NaN too\n" +
        "print()\n" +
        "\n" +
        "df['temp'] = df['temp'].ffill()                          # carry last valid forward\n" +
        "df['humid'] = df['humid'].fillna(df['humid'].mean())    # fill with column mean\n" +
        "print(df)",
      caption:
        "isna().sum() reports 2 missing temps and 1 missing humid. mean/sum skip NaN by default, so the mean of [30, 18] is 24.0. ffill carries the previous valid temp into the gaps; fillna replaces missing humidity with the column mean."
    },

    whyMatters:
      "<p>Real data is full of holes, and how you handle them changes your answers. Two facts trip people up constantly:</p>" +
      "<ul>" +
      "<li><b>NaN is a float.</b> Put one missing value in an int column and the whole column becomes <code>float64</code>; ids and counts start printing as <code>3.0</code>. (The nullable <code>Int64</code> dtype and <code>pd.NA</code> exist precisely to keep integers integer.)</li>" +
      "<li><b>Aggregations skip NaN by default</b> (<code>skipna=True</code>). A <code>mean()</code> silently ignores missing values — convenient, but it means your average is over the <i>present</i> values only. Pass <code>skipna=False</code> when a NaN should poison the result.</li>" +
      "</ul>" +
      "<p>Deciding to <b>drop</b> vs <b>fill</b> (and which fill: constant, ffill/bfill, interpolate) is a genuine modeling choice, not a formatting detail — it directly affects downstream statistics.</p>",

    recognize: [
      { q: "\"how many missing values per column?\"", think: "df.isna().sum()" },
      { q: "\"drop rows that are missing a key field\"", think: "df.dropna(subset=['col'])" },
      { q: "\"keep rows with at least k real values\"", think: "df.dropna(thresh=k)" },
      { q: "\"carry the last observation forward\" (time series)", think: "series.ffill() (or .bfill() to fill backward)" },
      { q: "\"my int column turned into floats\"", think: "a NaN forced float64 — fill/drop it, or use the nullable Int64 dtype" },
      { q: "\"is the mean over all rows or just the non-missing ones?\"", think: "skipna=True by default — it's over the present values" }
    ],

    matchTags: ["nan", "none", "na", "pd.na", "missing", "isna", "notna", "isnull", "dropna",
                "fillna", "ffill", "bfill", "interpolate", "skipna", "null"],

    traps: [
      {
        bad: "df[df['x'] == np.nan]        # always empty — NaN != NaN",
        good: "df[df['x'].isna()]          # the correct missing-value test",
        why: "NaN compares unequal to everything, including itself, so == np.nan matches nothing. Always detect missing values with isna()/notna()."
      },
      {
        bad: "df = df.dropna()             # drops a row if ANY column is null",
        good: "df = df.dropna(subset=['temp'])   # only rows missing the column you care about",
        why: "Bare dropna uses how='any' across all columns and can wipe out most of your data. Scope it with subset (or thresh) to the fields that actually matter."
      },
      {
        bad: "df['x'].fillna(method='ffill')   # method= is deprecated",
        good: "df['x'].ffill()                  # modern equivalent",
        why: "In current pandas the method= argument to fillna is deprecated in favor of the dedicated .ffill()/.bfill() methods — same behavior, clearer intent."
      }
    ],

    complexity: [
      { op: "isna() / notna()", big_o: "O(n)", note: "One vectorized pass producing a boolean mask over the values." },
      { op: "dropna()", big_o: "O(n·m)", note: "Scans rows across m columns to find nulls, then builds a filtered copy." },
      { op: "fillna(value) / ffill / bfill", big_o: "O(n)", note: "Single pass replacing or propagating values; returns a new column by default." },
      { op: "interpolate()", big_o: "O(n)", note: "Walks the series estimating each gap from neighboring valid points (linear by default)." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Classic pandas leans on NumPy, whose float arrays have a natural missing sentinel (IEEE <code>NaN</code>) but whose integer and boolean arrays do not. So mixing in a missing value <b>upcasts</b> the column to float (or to <code>object</code>) to have somewhere to store the gap. That is the mechanical reason a NaN changes your dtype.</p>" +
      "<p><code>pd.NA</code> is the newer, type-agnostic missing marker used by the nullable extension dtypes (<code>Int64</code>, <code>boolean</code>, string). With those you can have a genuine integer column that still holds missing values, and comparisons return <code>pd.NA</code> (missing) rather than silently becoming float.</p>" +
      "<p>The reduction functions (<code>sum</code>, <code>mean</code>, <code>min</code>, <code>max</code>, <code>std</code>, …) all take <code>skipna</code>, defaulting to True. <code>count()</code> reports non-null counts, which is how you check how much data actually fed an aggregate.</p>",

    challenge: {
      prompt:
        "The daily sales below have two gaps. Report how many values are missing and the mean (which skips NaN). Then build two repaired columns: one using ffill (carry forward) and one using interpolate (linear estimate between neighbors). Print the missing count, the mean, and the frame with both repaired columns.",
      starter:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'day':   [1, 2, 3, 4, 5],\n" +
        "    'sales': [100.0, np.nan, np.nan, 160.0, 200.0],\n" +
        "})\n" +
        "# TODO: print missing count and mean; add ffill and interpolate columns; print(df)\n",
      solution:
        "import pandas as pd\n" +
        "import numpy as np\n" +
        "df = pd.DataFrame({\n" +
        "    'day':   [1, 2, 3, 4, 5],\n" +
        "    'sales': [100.0, np.nan, np.nan, 160.0, 200.0],\n" +
        "})\n" +
        "print('missing:', int(df['sales'].isna().sum()))     # 2\n" +
        "print('mean (skips NaN):', df['sales'].mean())        # 153.333...\n" +
        "df['ffill']  = df['sales'].ffill()                    # both gaps -> 100.0\n" +
        "df['interp'] = df['sales'].interpolate()              # 120.0, 140.0 between 100 and 160\n" +
        "print(df)\n" +
        "# ffill repeats the last known value; interpolate estimates a linear trend."
    }
  }
]);
