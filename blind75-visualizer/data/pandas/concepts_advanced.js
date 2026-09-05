/*
 * data/pandas/concepts_advanced.js — Pandas "Learn" Advanced topics.
 * Registered into window.LEARN under the "pandas" stack. Runnable in-browser via
 * Pyodide (pandas auto-loads). Stable pandas ~2.x core APIs only.
 */
window.LEARN.register("pandas", "Advanced", [
  {
    id: "dates-and-resample",
    title: "Dates & Resample",
    difficulty: "Advanced",
    estMinutes: 14,
    relevance: 3,
    tagline: "Parse strings into real timestamps, put time on the index, then bucket by day/week/month and smooth with rolling windows.",

    whatIsIt: [
      "<code>pd.to_datetime(s)</code> turns strings (or numbers) into a real datetime dtype. Pass <code>errors='coerce'</code> to make unparseable values become <code>NaT</code> (the datetime NaN) instead of raising — essential for messy real-world data.",
      "Once a column is datetime you get the <b><code>.dt</code> accessor</b>: <code>s.dt.year</code>, <code>s.dt.month</code>, <code>s.dt.dayofweek</code> (Mon=0), <code>s.dt.day_name()</code> — vectorized calendar fields, no loops.",
      "Put the datetime on the index (<code>df.set_index('ts')</code>) to unlock <b><code>resample</code></b>: a time-aware groupby. <code>df.resample('D').sum()</code> buckets rows into calendar days; <code>'W'</code> weeks, <code>'ME'</code> month-ends. That is <b>downsampling</b> (many rows → fewer buckets). <code>asfreq</code> just re-stamps the index to a regular grid without aggregating.",
      "<b><code>rolling(window)</code></b> is different: it slides a fixed-size window over the rows for moving averages/sums — it keeps the same number of rows, it does not bucket them."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "\n" +
        "raw = pd.DataFrame({\n" +
        "    'ts':  ['2024-01-01','2024-01-02','oops','2024-01-08','2024-01-09'],\n" +
        "    'sales': [10, 20, 30, 40, 50],\n" +
        "})\n" +
        "\n" +
        "# parse -> real datetimes; bad string becomes NaT instead of crashing\n" +
        "raw['ts'] = pd.to_datetime(raw['ts'], errors='coerce')\n" +
        "print(raw)\n" +
        "\n" +
        "# .dt accessor: vectorized calendar fields\n" +
        "clean = raw.dropna(subset=['ts']).copy()\n" +
        "clean['weekday'] = clean['ts'].dt.day_name()\n" +
        "print(clean[['ts','weekday']])\n" +
        "\n" +
        "# datetime on the index -> resample into weekly buckets (downsampling)\n" +
        "weekly = clean.set_index('ts')['sales'].resample('W').sum()\n" +
        "print(weekly)",
      caption:
        "to_datetime(errors='coerce') survives the bad 'oops' string (it becomes NaT). The .dt accessor reads calendar fields vectorized. With the timestamp on the index, resample('W').sum() collapses days into weekly totals — a time-based groupby."
    },

    whyMatters:
      "<p>Almost every real dataset has a time column, and interviews love time questions: daily active users, weekly revenue, month-over-month growth, 7-day moving averages. All of those are <code>to_datetime</code> → <code>set_index</code> → <code>resample</code>/<code>rolling</code>.</p>" +
      "<p>The key mental model is <b>resample vs groupby</b>:</p>" +
      "<ul>" +
      "<li><b>resample</b> is a groupby whose keys are <b>regular time buckets</b> — it fills in empty periods and understands the calendar (<code>'D'</code>, <code>'W'</code>, <code>'ME'</code>, <code>'h'</code>).</li>" +
      "<li>plain <b>groupby</b> on <code>df['ts'].dt.month</code> just buckets by that field and skips periods that have no rows.</li>" +
      "</ul>" +
      "<p>Use <b>resample</b> to change the time grain (downsample), and <b>rolling</b> to smooth without changing the grain.</p>",

    recognize: [
      { q: "\"my dates are strings\" / \"sort by date isn't working\"", think: "pd.to_datetime(col) — convert first; add errors='coerce' if some are junk" },
      { q: "\"total PER day / week / month\" on a time series", think: "set_index(datetime) then resample('D'/'W'/'ME').sum()" },
      { q: "\"7-day moving average\" / \"smooth the noise\"", think: "series.rolling(7).mean() — same length, sliding window" },
      { q: "\"extract the year / weekday / hour\"", think: ".dt accessor: s.dt.year, s.dt.dayofweek, s.dt.hour" },
      { q: "\"fill gaps / put on a regular time grid\" without aggregating", think: "resample('D').asfreq() (optionally .ffill())" }
    ],

    matchTags: ["datetime", "to_datetime", "resample", "rolling", "dt accessor", "timeseries",
                "time series", "date", "asfreq", "moving average", "datetimeindex"],

    traps: [
      {
        bad: "df.groupby(df['ts'].dt.date)['sales'].sum()   # skips days with no rows",
        good: "df.set_index('ts')['sales'].resample('D').sum()   # every calendar day present",
        why: "resample understands the calendar and includes empty periods as zero/NaN buckets, so a gap-free daily series comes out. groupby on the date field silently omits days that had no rows."
      },
      {
        bad: "df.resample('D').sum()   # ValueError: not a DatetimeIndex",
        good: "df.set_index('ts').resample('D').sum()   # datetime must be the index",
        why: "resample groups by the index. The datetime column has to be the index first (set_index) — or pass on='ts' to name it explicitly."
      },
      {
        bad: "pd.to_datetime(messy)   # one bad value raises and kills the whole parse",
        good: "pd.to_datetime(messy, errors='coerce')   # bad values -> NaT, keep going",
        why: "A single unparseable string aborts the entire conversion. errors='coerce' turns just the offenders into NaT so you can inspect or drop them."
      }
    ],

    complexity: [
      { op: "pd.to_datetime(col)", big_o: "O(n)", note: "One pass parsing each value; giving format=... (or a consistent ISO layout) makes it markedly faster." },
      { op: "resample('D').agg(...)", big_o: "O(n)", note: "A time-bucketed groupby: hash rows into calendar periods, reduce each — same linear cost as groupby." },
      { op: "rolling(w).mean()", big_o: "O(n)", note: "Sliding window uses a running accumulator, so it is linear in rows, not O(n·w)." },
      { op: ".dt.year / .dt.dayofweek", big_o: "O(n)", note: "Vectorized calendar extraction over the whole column in C — no Python loop." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A datetime column is stored as 64-bit integers counting nanoseconds from the epoch (1970-01-01), which is why comparisons, sorting, and arithmetic on it are as fast as plain integers. The <code>.dt</code> accessor and <code>resample</code> decode those integers into calendar fields on demand.</p>" +
      "<p><code>resample</code> is literally a groupby whose grouper is a <code>TimeGrouper</code>: it maps each timestamp to its period bin (day, week, month-end, hour) and dispatches to the same Cython reducers as <code>groupby</code>. Because the bins come from a regular calendar grid, empty periods still appear in the output — unlike a groupby on a derived date field.</p>" +
      "<p>Note the frequency alias modernization in pandas 2.x: month-end is <code>'ME'</code> (old <code>'M'</code>) and hour is <code>'h'</code> (old <code>'H'</code>). <code>'D'</code> and <code>'W'</code> are unchanged. <code>asfreq</code> only re-indexes onto the grid (no aggregation); pair it with <code>ffill()</code>/<code>interpolate()</code> to fill the new slots.</p>",

    challenge: {
      prompt:
        "You have hourly-ish readings as strings (one is malformed). Parse them safely, drop the bad row, then produce a DAILY total and a 2-day rolling mean of those daily totals. Which tool changes the time grain (resample) and which smooths it (rolling)?",
      starter:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'ts': ['2024-03-01 09:00','2024-03-01 15:00','BAD','2024-03-02 10:00','2024-03-03 11:00'],\n" +
        "    'reading': [5, 7, 99, 4, 6],\n" +
        "})\n" +
        "# TODO: parse ts (coerce), drop NaT, daily sum, then 2-day rolling mean\n",
      solution:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'ts': ['2024-03-01 09:00','2024-03-01 15:00','BAD','2024-03-02 10:00','2024-03-03 11:00'],\n" +
        "    'reading': [5, 7, 99, 4, 6],\n" +
        "})\n" +
        "df['ts'] = pd.to_datetime(df['ts'], errors='coerce')  # BAD -> NaT\n" +
        "df = df.dropna(subset=['ts'])\n" +
        "daily = df.set_index('ts')['reading'].resample('D').sum()  # change the grain\n" +
        "print(daily)\n" +
        "print(daily.rolling(2).mean())  # smooth, same length\n" +
        "# resample('D') buckets timestamps into calendar days (downsampling);\n" +
        "# rolling(2) slides a 2-day window over those daily totals without rebucketing."
    }
  },

  {
    id: "performance-and-dtypes",
    title: "Performance & dtypes",
    difficulty: "Advanced",
    estMinutes: 13,
    relevance: 2,
    tagline: "The dtype is the performance knob: category for repeated strings, smaller ints, and vectorized ops instead of row loops.",

    whatIsIt: [
      "Every column has a <b>dtype</b> that decides how much memory it uses and how fast operations run. Text stored as the default <code>object</code> dtype is a column of Python string pointers — flexible but slow and memory-hungry.",
      "<code>astype('category')</code> replaces a low-cardinality string column (few distinct values repeated many times, e.g. country, status) with small integer codes plus a lookup table — often a large memory win and faster groupby/compare.",
      "<b>Downcast numbers</b> when the range allows: <code>int64</code> → <code>int32</code>/<code>int16</code>, <code>float64</code> → <code>float32</code> via <code>astype</code> or <code>pd.to_numeric(s, downcast='integer')</code>. Half the width, half the memory.",
      "<b>Vectorize, never iterate rows.</b> <code>df['a'] + df['b']</code> runs in C over the whole column; <code>iterrows()</code>/<code>apply(axis=1)</code> pay Python overhead per row and are orders of magnitude slower. Inspect real cost with <code>df.memory_usage(deep=True)</code> (deep=True actually counts the strings). Nullable <code>Int64</code> (capital I) holds integers <b>and</b> missing values without falling back to float."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "\n" +
        "# low-cardinality string: 4 distinct values repeated many times\n" +
        "n = 10_000\n" +
        "s_obj = pd.Series(['North','South','East','West'] * (n // 4))\n" +
        "s_cat = s_obj.astype('category')\n" +
        "\n" +
        "obj_bytes = s_obj.memory_usage(deep=True)\n" +
        "cat_bytes = s_cat.memory_usage(deep=True)\n" +
        "print('object  bytes:', obj_bytes)\n" +
        "print('category bytes:', cat_bytes)\n" +
        "print('category smaller?', cat_bytes < obj_bytes)\n" +
        "print('shrunk to ~ {:.1%} of object'.format(cat_bytes / obj_bytes))\n" +
        "\n" +
        "# downcast a wide int column\n" +
        "i64 = pd.Series(range(n), dtype='int64')\n" +
        "i32 = i64.astype('int32')\n" +
        "print('int64 vs int32 bytes:', i64.memory_usage(deep=True), i32.memory_usage(deep=True))\n" +
        "print('int32 smaller?', i32.memory_usage(deep=True) < i64.memory_usage(deep=True))",
      caption:
        "Same data, different dtype. The category column stores small integer codes + one lookup table instead of 10k string pointers, so it uses far less memory (the exact bytes vary by build, so we print the comparison, not a fixed number). Downcasting int64→int32 halves the numeric footprint."
    },

    whyMatters:
      "<p>When a DataFrame is slow or blows up memory, the dtype is almost always the cause and the cure — no algorithm change needed. Picking the right dtype can cut memory several-fold and speed up groupby, merge, and comparisons at the same time.</p>" +
      "<p>Two habits separate fast Pandas from slow Pandas:</p>" +
      "<ul>" +
      "<li><b>Right-size dtypes</b>: <code>category</code> for repeated strings, the smallest int/float that fits your range.</li>" +
      "<li><b>Vectorize</b>: operate on whole columns; treat <code>iterrows</code>/<code>apply(axis=1)</code> as a red flag, not a tool.</li>" +
      "</ul>" +
      "<p>This is exactly what interviewers probe with \"this is too slow / uses too much RAM — what would you change?\"</p>",

    recognize: [
      { q: "\"DataFrame uses too much memory\"", think: "df.memory_usage(deep=True); convert repeated-string columns to 'category', downcast numbers" },
      { q: "\"a column of a few repeated labels\" (status, country, plan)", think: "astype('category') — integer codes + lookup table" },
      { q: "\"my loop over rows is really slow\"", think: "replace iterrows()/apply(axis=1) with vectorized column arithmetic" },
      { q: "\"integers but I need NaN too\"", think: "nullable Int64 (capital I) keeps ints instead of upcasting to float" },
      { q: "\"which columns are the memory hogs?\"", think: "df.memory_usage(deep=True).sort_values() — deep=True counts object strings" }
    ],

    matchTags: ["performance", "dtype", "dtypes", "category", "categorical", "memory", "memory_usage",
                "downcast", "vectorization", "iterrows", "apply", "int64", "object", "nullable"],

    traps: [
      {
        bad: "for i, row in df.iterrows():\n    df.loc[i,'c'] = row['a'] + row['b']   # per-row Python, very slow",
        good: "df['c'] = df['a'] + df['b']   # one vectorized C operation",
        why: "iterrows yields a Python object per row and updates one cell at a time. Whole-column arithmetic does it all in C — commonly 100x+ faster and less code."
      },
      {
        bad: "df.memory_usage()   # object columns reported as ~8 bytes each (just the pointer)",
        good: "df.memory_usage(deep=True)   # follows the pointers, counts the real strings",
        why: "Without deep=True, object columns only report the pointer size, badly under-counting string memory. Use deep=True to see the true footprint before optimizing."
      },
      {
        bad: "df['flag'] = df['flag'].astype('category')   # then df['flag'] = df['flag'] + '_x'",
        good: "keep it as a category only for stable label sets; convert back to object before free-form string edits",
        why: "category is ideal for a fixed, repeated label set. Doing arbitrary string manipulation or adding many new values fights the codes+lookup design and can be slower — pick category for stable, low-cardinality columns."
      }
    ],

    complexity: [
      { op: "astype('category')", big_o: "O(n)", note: "Factorizes the column once into codes + unique lookup; afterward compares/groupby run on small ints." },
      { op: "vectorized col op (a + b)", big_o: "O(n)", note: "Single C loop over contiguous memory — the fast path." },
      { op: "iterrows / apply(axis=1)", big_o: "O(n) with Python per-row overhead", note: "Same big-O but a huge constant factor from boxing each row into Python; avoid on large frames." },
      { op: "memory_usage(deep=True)", big_o: "O(n)", note: "Walks object columns following pointers to size each string — slower than shallow but accurate." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> Numeric columns are stored as tight, contiguous NumPy arrays (an <code>int32</code> array is literally 4 bytes per element), so CPU vector instructions and cache prefetch make column math fast. An <code>object</code> column is instead an array of <b>pointers</b> to scattered Python string objects — each access is a pointer chase plus Python overhead, which is why object is both slow and memory-heavy.</p>" +
      "<p>A <code>category</code> column has two parts: a small integer <b>codes</b> array (one code per row) and a <b>categories</b> index holding each distinct value once. With 10,000 rows but 4 labels, you store 10,000 tiny codes + 4 strings instead of 10,000 string pointers — hence the win, and groupby/compare operate on the ints.</p>" +
      "<p>The nullable dtypes (<code>Int64</code>, <code>Float64</code>, <code>boolean</code>) pair the value array with a separate boolean <b>mask</b> for missing entries, so an integer column can hold <code>&lt;NA&gt;</code> without silently upcasting to float (the classic surprise with plain <code>int64</code> + NaN).</p>",

    challenge: {
      prompt:
        "Build a 12,000-row frame with a 'status' column of 3 repeated labels and an int64 'id'. Show that converting status to category shrinks memory, downcast id to int32, and report total memory before vs after. Print booleans proving each step got smaller.",
      starter:
        "import pandas as pd\n" +
        "n = 12_000\n" +
        "df = pd.DataFrame({\n" +
        "    'status': ['open','closed','pending'] * (n // 3),\n" +
        "    'id': range(n),\n" +
        "})\n" +
        "# TODO: measure memory, convert status->category, id->int32, compare totals\n",
      solution:
        "import pandas as pd\n" +
        "n = 12_000\n" +
        "df = pd.DataFrame({\n" +
        "    'status': ['open','closed','pending'] * (n // 3),\n" +
        "    'id': range(n),\n" +
        "})\n" +
        "before = df.memory_usage(deep=True).sum()\n" +
        "\n" +
        "opt = df.copy()\n" +
        "opt['status'] = opt['status'].astype('category')\n" +
        "opt['id'] = opt['id'].astype('int32')\n" +
        "after = opt.memory_usage(deep=True).sum()\n" +
        "\n" +
        "print('status shrank:',\n" +
        "      opt['status'].memory_usage(deep=True) < df['status'].memory_usage(deep=True))\n" +
        "print('id shrank:',\n" +
        "      opt['id'].memory_usage(deep=True) < df['id'].memory_usage(deep=True))\n" +
        "print('total before:', before, 'after:', after, 'smaller?', after < before)\n" +
        "# category = codes + tiny lookup; int32 = half of int64. Both cut memory\n" +
        "# with no change to the data or the analysis code."
    }
  }
]);
