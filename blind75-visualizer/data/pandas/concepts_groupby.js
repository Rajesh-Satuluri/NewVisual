/*
 * data/pandas/concepts_groupby.js — Pandas "Learn" exemplar topic.
 * Registered into window.LEARN under the "pandas" stack. Runnable in-browser via
 * Pyodide (pandas auto-loads). Content grounded in the pandas groupby model;
 * teaching structure mirrors the Python lab.
 */
window.LEARN.register("pandas", "Transform", [
  {
    id: "groupby-aggregation",
    title: "GroupBy & Aggregation",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Split rows into groups, apply a function to each, combine the results — the workhorse of every analysis.",

    whatIsIt: [
      "Pandas <code>groupby</code> follows the <b>split–apply–combine</b> model: <b>split</b> the rows by one or more keys, <b>apply</b> a function to each group, then <b>combine</b> the per-group results back into a Series or DataFrame.",
      "<code>df.groupby('k')</code> is <b>lazy</b> — it builds a grouping, nothing runs until you call an aggregation. <code>.agg()</code> collapses each group to one row; <code>.transform()</code> returns a result <b>aligned to the original rows</b> (same length); <code>.filter()</code> keeps or drops whole groups.",
      "By default the group keys become the <b>index</b> of the result. Pass <code>as_index=False</code> (or call <code>.reset_index()</code>) to get them back as plain columns — the shape most people actually want."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'dept':   ['Eng','Eng','Sales','Sales','Sales'],\n" +
        "    'name':   ['Asha','Ravi','Mia','Sam','Zoe'],\n" +
        "    'salary': [120, 100, 80, 90, 85],\n" +
        "})\n" +
        "\n" +
        "# one aggregate per group\n" +
        "print(df.groupby('dept')['salary'].mean())\n" +
        "\n" +
        "# named aggregations -> tidy columns (the interview-friendly form)\n" +
        "out = df.groupby('dept', as_index=False).agg(\n" +
        "    headcount = ('name',   'size'),\n" +
        "    avg_sal   = ('salary', 'mean'),\n" +
        "    top_sal   = ('salary', 'max'),\n" +
        ")\n" +
        "print(out)\n" +
        "\n" +
        "# transform: broadcast the group aggregate BACK to every row\n" +
        "df['dept_avg'] = df.groupby('dept')['salary'].transform('mean')\n" +
        "print(df)",
      caption:
        "agg collapses each dept to one row (named aggregation → clean columns). transform('mean') returns a full-length column so every employee row carries its department average — perfect for per-row comparisons."
    },

    whyMatters:
      "<p>GroupBy is the most-used tool in day-to-day Pandas and the heart of nearly every data-analysis interview task: totals per category, averages per segment, counts per day, top-N per group. It's also the concept that maps <b>1:1 onto SQL's <code>GROUP BY</code> and PySpark's <code>groupBy</code></b> — learn it once, reuse it across the whole stack.</p>" +
      "<p>The single most valuable distinction is <b>agg vs transform</b>:</p>" +
      "<ul>" +
      "<li><b>agg</b> → one row per group (a summary table).</li>" +
      "<li><b>transform</b> → same number of rows as the input (a new column you can compare row-by-row, e.g. \"is this sale above its region's average?\").</li>" +
      "</ul>",

    recognize: [
      { q: "\"total / average / count PER category\"", think: "df.groupby(key).agg(...) — one row per group" },
      { q: "\"each row's value vs its group's aggregate\" (share of total, above-average flag)", think: "groupby(key)[col].transform('sum'/'mean') — full-length, aligns to rows" },
      { q: "\"keep only groups where <condition on the whole group>\"", think: "groupby(key).filter(lambda g: ...) — keeps/drops entire groups" },
      { q: "\"top N rows within each group\"", think: "sort_values then groupby(key).head(N) (or .rank within group)" },
      { q: "\"my group keys disappeared into the index\"", think: "as_index=False, or .reset_index()" }
    ],

    matchTags: ["groupby", "aggregation", "agg", "transform", "split-apply-combine", "pivot", "group",
                "aggregate", "value_counts"],

    traps: [
      {
        bad: "df.groupby('dept').apply(lambda g: g.salary.mean())   # slow, opaque",
        good: "df.groupby('dept')['salary'].mean()                  # vectorized built-in",
        why: "apply runs a Python function per group (slow) and its output shape is unpredictable. Prefer built-in aggregations (mean/sum/size/agg) — they run in C and return a clean shape."
      },
      {
        bad: "g = df.groupby('dept')\ng['salary'].mean()   # then later, surprised the keys are the index",
        good: "df.groupby('dept', as_index=False)['salary'].mean()   # keys stay columns",
        why: "By default group keys become the index. For a tidy table with keys as columns, use as_index=False (or reset_index())."
      },
      {
        bad: "df.groupby('region')['sales'].sum()   # silently DROPS rows where region is NaN",
        good: "df.groupby('region', dropna=False)['sales'].sum()   # keep the NaN group",
        why: "groupby drops rows whose key is NaN by default, so totals can silently miss data. Pass dropna=False when missing keys are meaningful."
      }
    ],

    complexity: [
      { op: "groupby(key) (build groups)", big_o: "O(n)", note: "A hash of the key column to bucket rows; lazy — no aggregation runs yet, just the grouping." },
      { op: ".agg / .sum / .mean (built-in)", big_o: "O(n)", note: "One vectorized C pass over the rows accumulating per group; the fast path." },
      { op: ".transform('mean')", big_o: "O(n)", note: "Computes each group's value, then broadcasts it back to every row — still linear, returns input-length output." },
      { op: ".apply(python_fn)", big_o: "O(n · f) in Python", note: "Calls your Python function once per group with the interpreter overhead — avoid on hot paths; use built-ins where possible." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Pandas groups by hashing the key(s) into a mapping of key → row positions, then dispatches to Cython-optimized reducers for the common functions (sum, mean, min, max, count, size). Those built-ins are why <code>groupby.sum()</code> is dramatically faster than an equivalent <code>apply</code>.</p>" +
      "<p><code>size()</code> counts <b>all</b> rows per group (including NaN); <code>count()</code> counts only <b>non-null</b> values per column — a distinction that trips people up. Named aggregation (<code>agg(newcol=('col','func'))</code>, pandas ≥ 0.25) is the readable way to build multiple output columns at once.</p>" +
      "<p>This is the same split-apply-combine engine behind <code>pivot_table</code> and <code>resample</code>; and the identical model runs distributed in PySpark's <code>groupBy</code>, where the 'combine' step is a shuffle.</p>",

    challenge: {
      prompt:
        "Using the orders DataFrame below, add a column pct_of_region = each order's amount as a percentage of its region's total. Which groupby method gives a full-length, row-aligned result (agg or transform)? Run it and confirm each region's pct_of_region sums to 100.",
      starter:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'region': ['N','N','S','S','S'],\n" +
        "    'amount': [100, 300, 50, 100, 50],\n" +
        "})\n" +
        "# TODO: df['pct_of_region'] = ...   then print(df) and the per-region sums\n",
      solution:
        "import pandas as pd\n" +
        "df = pd.DataFrame({'region':['N','N','S','S','S'], 'amount':[100,300,50,100,50]})\n" +
        "region_total = df.groupby('region')['amount'].transform('sum')  # full-length!\n" +
        "df['pct_of_region'] = 100 * df['amount'] / region_total\n" +
        "print(df)\n" +
        "print(df.groupby('region')['pct_of_region'].sum())   # N: 100.0, S: 100.0\n" +
        "# transform (not agg) because we need a value on EVERY row, aligned to the\n" +
        "# original index, to divide row-by-row."
    }
  }
]);
