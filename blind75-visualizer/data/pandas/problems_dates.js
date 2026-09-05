/*
 * Pandas Interview Lab — Dates & Time Series
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 * Registers on the global registry:
 *     window.PANDAS.register("Dates & Time Series", [ ...problems ]);
 *
 * All rcs/plain snippets are self-contained, start with `import pandas as pd`,
 * print output, and were executed against pandas before commit. Sticks to
 * stable 2.x core APIs (to_datetime, .dt, resample, rolling, diff, pct_change)
 * so they also run under the browser's Pyodide pandas. The runnable resample
 * snippet uses 'W' (weekly), whose output is identical across pandas versions;
 * the 'M' -> 'ME' month-end alias rename is called out in a Gotcha instead.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Dates & Time Series", [

    // ------------------------------------------------------------------ Q1
    {
      id: "to-datetime-coerce",
      num: 1,
      title: "Parse text into datetimes",
      difficulty: "Easy",
      category: "Dates & Time Series",
      importance: "essential",
      meta: { pattern: "Type conversion", technique: "pd.to_datetime(errors='coerce')", functions: "pd.to_datetime" },
      description:
        "Convert a column of date strings into real `datetime64` values with `pd.to_datetime`. Use `errors='coerce'` so any string that cannot be parsed becomes `NaT` (the datetime version of `NaN`) instead of raising and killing the whole conversion.",
      notes: [
        "A parsed column has dtype `datetime64`, which unlocks the `.dt` accessor, sorting, resampling, and date arithmetic.",
        "`errors='coerce'` turns bad values into `NaT`; the default `errors='raise'` stops on the first unparseable string."
      ],
      examples: [
        {
          input: "raw = ['2021-01-05', '2021-02-20', 'not a date']",
          output: "two datetimes and one NaT",
          reasoning: "The two ISO strings parse; 'not a date' is unparseable so coerce maps it to NaT."
        }
      ],
      approaches: [
        {
          name: "pd.to_datetime with errors='coerce'",
          whenToUse: "Any time a date arrives as text (CSV, JSON, user input) and you want the bad rows flagged, not fatal.",
          logic:
            "**What it asks.** Turn a text column into a genuine datetime column, tolerating garbage values.\n\n" +
            "**Key idea.** `pd.to_datetime` parses the whole Series at once; `errors='coerce'` replaces anything it can't parse with `NaT` rather than raising.\n\n" +
            "**Step by step.**\n" +
            "1. Call `pd.to_datetime(df['raw'], errors='coerce')`.\n" +
            "2. Assign it back: `df['date'] = ...`.\n" +
            "3. Optionally inspect the failures with `df['date'].isna()`.\n\n" +
            "**Why it works.** The result has dtype `datetime64`, so downstream operations (`.dt`, resample, slicing) work; `NaT` behaves like a null so those rows are simply skipped by aggregations.\n\n" +
            "**Gotchas.**\n" +
            "- Ambiguous formats like `01/02/2021` are read month-first by default; pass an explicit `format=` (or `dayfirst=True`) when day-first data is possible.\n" +
            "- Silent `NaT` can hide dirty data — count `.isna()` after coercing so failures don't pass unnoticed.\n\n" +
            "**Interview mindset.** Say 'parse to datetime with coerce, then check how many became NaT' — it shows you handle messy real-world dates defensively.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'raw': ['2021-01-05', '2021-02-20', 'not a date']})\n" +
            "df['date'] = pd.to_datetime(df['raw'], errors='coerce')   # bad -> NaT\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'raw': ['2021-01-05', '2021-02-20', 'not a date']})\n" +
            "df['date'] = pd.to_datetime(df['raw'], errors='coerce')\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** dates stored as strings, 'convert to datetime', 'handle invalid dates'.",
        "**Say it:** `pd.to_datetime(col, errors='coerce')` — unparseable becomes NaT.",
        "**Trap:** `01/02/2021` parses month-first; set `format=` or `dayfirst=True`."
      ],
      commonMistakes: [
        "Leaving the default `errors='raise'`, so one bad row aborts the whole parse.",
        "Never checking `.isna()` afterward and letting coerced NaT hide dirty data."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "dt-accessor-parts",
      num: 2,
      title: "Extract year, month, and weekday",
      difficulty: "Easy",
      category: "Dates & Time Series",
      importance: "essential",
      meta: { pattern: "Feature extraction", technique: ".dt accessor", functions: "Series.dt.year, dt.month, dt.dayofweek" },
      description:
        "Pull calendar components out of a datetime column using the `.dt` accessor: `dt.year`, `dt.month`, and `dt.dayofweek` (Monday=0 ... Sunday=6). These are the building blocks for grouping by month or flagging weekends.",
      notes: [
        "`.dt` is to datetime Series what `.str` is to text Series — it vectorizes per-element access.",
        "`dayofweek` is 0-indexed from Monday; `dt.day_name()` returns the label ('Monday', ...)."
      ],
      examples: [
        {
          input: "dates = ['2021-01-05', '2021-06-20', '2021-12-25']",
          output: "year 2021; month 1/6/12; dow 1/6/5",
          reasoning: "Jan 5 2021 is a Tuesday (dow 1), Jun 20 a Sunday (6), Dec 25 a Saturday (5)."
        }
      ],
      approaches: [
        {
          name: ".dt component accessors",
          whenToUse: "Turning a timestamp into features — month for seasonality, weekday for weekend flags, year for cohorts.",
          logic:
            "**What it asks.** Break a datetime column into its calendar parts.\n\n" +
            "**Key idea.** On a `datetime64` Series, `.dt` exposes attributes like `.year`, `.month`, `.day`, `.hour`, and `.dayofweek`, each returning an aligned Series.\n\n" +
            "**Step by step.**\n" +
            "1. Ensure the column is datetime (`pd.to_datetime` if needed).\n" +
            "2. `df['year'] = df['date'].dt.year`.\n" +
            "3. `df['month'] = df['date'].dt.month`; `df['dow'] = df['date'].dt.dayofweek`.\n\n" +
            "**Why it works.** `.dt` reads the underlying integer timestamp components vectorized in C, so extraction is fast and index-aligned.\n\n" +
            "**Gotchas.**\n" +
            "- `.dt` only exists on datetime dtype — on an object/string column it raises `AttributeError`; convert first.\n" +
            "- `dayofweek` counts Monday as 0; a weekend mask is `dt.dayofweek >= 5`.\n\n" +
            "**Interview mindset.** Mention `.dt` as the datetime twin of `.str`, and that weekday is Monday-zero-based.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-05', '2021-06-20', '2021-12-25'])})\n" +
            "df['year'] = df['date'].dt.year\n" +
            "df['month'] = df['date'].dt.month\n" +
            "df['dow'] = df['date'].dt.dayofweek        # Monday=0 .. Sunday=6\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-05', '2021-06-20', '2021-12-25'])})\n" +
            "df['year'] = df['date'].dt.year\n" +
            "df['month'] = df['date'].dt.month\n" +
            "df['dow'] = df['date'].dt.dayofweek\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'group by month', 'flag weekends', 'extract the year'.",
        "**Say it:** `df['d'].dt.year / .dt.month / .dt.dayofweek`.",
        "**Trap:** `.dt` needs datetime dtype; `dayofweek` is Monday=0."
      ],
      commonMistakes: [
        "Calling `.dt` on a string column (AttributeError) without parsing first.",
        "Assuming `dayofweek` starts on Sunday or is 1-indexed."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "date-range-filter",
      num: 3,
      title: "Filter rows within a date range",
      difficulty: "Medium",
      category: "Dates & Time Series",
      importance: "essential",
      meta: { pattern: "Range filter", technique: "DatetimeIndex slice / between", functions: "set_index, loc, Series.between" },
      description:
        "Keep only the rows falling between two dates. The cleanest way is to set the datetime column as the index and slice it with `df.loc[start:end]` — label slicing on a `DatetimeIndex` is inclusive of both ends. A `between`-style boolean mask is the alternative when you'd rather keep the column.",
      notes: [
        "Label slicing on a `DatetimeIndex` includes both endpoints, unlike positional slicing.",
        "`Series.between(a, b)` defaults to inclusive on both sides too, so the two approaches match."
      ],
      examples: [
        {
          input: "dates 01-03,01-10,01-17,01-24; window 01-08..01-20",
          output: "the 01-10 and 01-17 rows",
          reasoning: "Only those two dates fall inside the inclusive window; 01-03 is before and 01-24 is after."
        }
      ],
      approaches: [
        {
          name: "DatetimeIndex slice vs between mask",
          whenToUse: "Sub-setting a time series to a period — a month, a quarter, a custom window.",
          logic:
            "**What it asks.** Return the rows whose date lies inside a start/end window.\n\n" +
            "**Key idea.** With a `DatetimeIndex`, `df.loc[start:end]` slices by label and includes both endpoints; equivalently a `df['date'].between(start, end)` mask filters the column in place.\n\n" +
            "**Step by step.**\n" +
            "1. `df = df.set_index('date')` (the column must already be datetime).\n" +
            "2. `df.loc['2021-01-08':'2021-01-20']` — inclusive slice.\n" +
            "3. Or keep the column: `df[df['date'].between('2021-01-08', '2021-01-20')]`.\n\n" +
            "**Why it works.** pandas parses the string endpoints into timestamps and compares against the index/column; label slicing on a monotonic DatetimeIndex is inclusive by design.\n\n" +
            "**Gotchas.**\n" +
            "- The index should be sorted; slicing an unsorted DatetimeIndex can raise or return nothing.\n" +
            "- Partial strings work as ranges — `df.loc['2021-01']` grabs the whole month — but that convenience is index-only.\n\n" +
            "**Interview mindset.** Offer the index slice as the idiomatic time-series move, and `between` as the keep-the-column fallback.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-03', '2021-01-10',\n" +
            "                                            '2021-01-17', '2021-01-24']),\n" +
            "                   'sales': [10, 20, 30, 40]})\n" +
            "df = df.set_index('date')\n" +
            "print(df.loc['2021-01-08':'2021-01-20'])   # inclusive label slice",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-03', '2021-01-10',\n" +
            "                                            '2021-01-17', '2021-01-24']),\n" +
            "                   'sales': [10, 20, 30, 40]})\n" +
            "df = df.set_index('date')\n" +
            "print(df.loc['2021-01-08':'2021-01-20'])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'between these dates', 'sales in January', 'last 30 days'.",
        "**Say it:** set a DatetimeIndex, then `df.loc[start:end]` (inclusive), or `df[col.between(a, b)]`.",
        "**Trap:** the index must be sorted; label slicing includes both ends."
      ],
      commonMistakes: [
        "Slicing an unsorted DatetimeIndex and getting an error or empty result.",
        "Expecting `df.loc[a:b]` to be end-exclusive like Python list slicing."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "resample-downsample",
      num: 4,
      title: "Aggregate to weekly or monthly totals",
      difficulty: "Hard",
      category: "Dates & Time Series",
      importance: "essential",
      meta: { pattern: "Downsampling", technique: "resample(freq).sum()", functions: "set_index, DataFrame.resample" },
      description:
        "Roll daily records up into weekly (or monthly) totals with `resample`. Set a datetime index, then `df.resample('W').sum()` groups the rows into calendar buckets and sums each. This is downsampling — going from a finer to a coarser frequency.",
      notes: [
        "`resample` is like a `groupby` over regular time buckets; it needs a datetime index (or a `on=` column).",
        "Any aggregation follows the bucketing: `.sum()`, `.mean()`, `.count()`, or `.agg([...])`."
      ],
      examples: [
        {
          input: "daily sales on Jan 4,6,12,14,20 = [10,5,20,4,30]; resample('W').sum()",
          output: "week ending 01-10 -> 15, 01-17 -> 24, 01-24 -> 30",
          reasoning: "'W' buckets end on Sunday: Jan 4+6 land in the week ending 01-10 (15), Jan 12+14 in 01-17 (24), Jan 20 in 01-24 (30)."
        }
      ],
      approaches: [
        {
          name: "resample('W'/'ME').sum()",
          whenToUse: "Turning transaction-level or daily data into weekly/monthly/quarterly summaries.",
          logic:
            "**What it asks.** Collapse fine-grained dated rows into totals per larger time bucket.\n\n" +
            "**Key idea.** `resample(freq)` groups a datetime-indexed frame into fixed calendar bins; chaining an aggregation reduces each bin to one value.\n\n" +
            "**Step by step.**\n" +
            "1. `df = df.set_index('date')` so the index is a DatetimeIndex.\n" +
            "2. `df.resample('W').sum()` for weekly totals (buckets end Sunday).\n" +
            "3. Swap the frequency for other grains: `'ME'` month-end, `'QE'` quarter-end, `'D'` daily.\n\n" +
            "**Why it works.** resample computes each period's boundaries and assigns every timestamp to its bin, then applies the aggregation per bin — a groupby specialized for regular time intervals.\n\n" +
            "**Gotchas.**\n" +
            "- Frequency aliases changed in pandas 2.2: month-end is `'ME'` (and quarter-end `'QE'`) in 2.2+, but the older spelling was `'M'`/`'Q'` — `'W'` and `'D'` are unchanged across versions.\n" +
            "- Empty periods still appear (as `0` for sum, `NaN` for mean); use `label=`/`closed=` to control which edge a bin is stamped and closed on.\n\n" +
            "**Interview mindset.** Call it 'a groupby over time buckets', name the downsample-vs-upsample distinction, and flag the `'M'` -> `'ME'` alias change so your code runs on the interviewer's pandas.",
          perfNote: "resample does one linear pass to bin timestamps — far cheaper than manually grouping on extracted period keys.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-04', '2021-01-06', '2021-01-12',\n" +
            "                                            '2021-01-14', '2021-01-20']),\n" +
            "                   'sales': [10, 5, 20, 4, 30]})\n" +
            "df = df.set_index('date')\n" +
            "weekly = df.resample('W').sum()    # 'W' = week ending Sunday; totals per week\n" +
            "print(weekly)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-04', '2021-01-06', '2021-01-12',\n" +
            "                                            '2021-01-14', '2021-01-20']),\n" +
            "                   'sales': [10, 5, 20, 4, 30]})\n" +
            "df = df.set_index('date')\n" +
            "weekly = df.resample('W').sum()\n" +
            "print(weekly)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'weekly totals', 'monthly revenue', 'roll daily up to ...'.",
        "**Say it:** set a DatetimeIndex, then `df.resample('W').sum()` (or `'ME'` for month-end).",
        "**Trap:** month-end alias is `'ME'` in pandas 2.2+, `'M'` in older versions."
      ],
      commonMistakes: [
        "Calling `resample` without a datetime index (and without `on=`).",
        "Using `'M'` on pandas 2.2+ where it warns/errs — reach for `'ME'`."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "rolling-moving-average",
      num: 5,
      title: "Compute a rolling moving average",
      difficulty: "Medium",
      category: "Dates & Time Series",
      importance: "common",
      meta: { pattern: "Sliding window", technique: "rolling(window).mean()", functions: "Series.rolling, rolling.mean" },
      description:
        "Smooth a noisy series with a moving average: `df['price'].rolling(window=3).mean()` averages each value with the two before it. The first `window-1` rows have too few prior points, so they come out as `NaN`.",
      notes: [
        "`rolling` builds a sliding window; the aggregation (`.mean()`, `.sum()`, `.max()`) runs over each window.",
        "Leading rows are `NaN` until the window is full; pass `min_periods=1` to emit partial-window results instead."
      ],
      examples: [
        {
          input: "price = [10, 12, 14, 16, 18]; window=3",
          output: "NaN, NaN, 12.0, 14.0, 16.0",
          reasoning: "The 3rd value averages 10,12,14 = 12; the 4th averages 12,14,16 = 14; the first two lack three points."
        }
      ],
      approaches: [
        {
          name: "rolling(window).mean()",
          whenToUse: "Smoothing trends, computing moving averages/sums, or any fixed-length sliding-window stat.",
          logic:
            "**What it asks.** Replace each point with an aggregate of it and its recent neighbours.\n\n" +
            "**Key idea.** `rolling(window=n)` yields a windowed view; the chained aggregation reduces each n-length window to one number, sliding one row at a time.\n\n" +
            "**Step by step.**\n" +
            "1. (Optional but idiomatic) sort by date / set a DatetimeIndex so 'recent' is well defined.\n" +
            "2. `df['ma3'] = df['price'].rolling(window=3).mean()`.\n" +
            "3. To fill the leading gap, add `min_periods=1`.\n\n" +
            "**Why it works.** rolling maintains the window in one pass, recomputing the statistic as the window advances — the standard trailing moving average.\n\n" +
            "**Gotchas.**\n" +
            "- The first `window-1` rows are `NaN` by default (the window isn't full yet); `min_periods` relaxes this.\n" +
            "- The window is trailing (includes the current row and looks back); use `center=True` for a centered window.\n" +
            "- Order matters — sort by time first, or the 'moving average' averages the wrong neighbours.\n\n" +
            "**Interview mindset.** Say 'trailing window, leading NaNs until it fills', and mention `min_periods` / `center` as the two knobs.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-01', '2021-01-02', '2021-01-03',\n" +
            "                                            '2021-01-04', '2021-01-05']),\n" +
            "                   'price': [10, 12, 14, 16, 18]})\n" +
            "df = df.set_index('date')\n" +
            "df['ma3'] = df['price'].rolling(window=3).mean()   # first 2 rows -> NaN\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-01', '2021-01-02', '2021-01-03',\n" +
            "                                            '2021-01-04', '2021-01-05']),\n" +
            "                   'price': [10, 12, 14, 16, 18]})\n" +
            "df = df.set_index('date')\n" +
            "df['ma3'] = df['price'].rolling(window=3).mean()\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'moving average', 'smooth the series', '7-day rolling sum'.",
        "**Say it:** `s.rolling(window=n).mean()` — trailing window, leading NaNs.",
        "**Trap:** unsorted data averages the wrong neighbours; sort by time first."
      ],
      commonMistakes: [
        "Forgetting the first `window-1` rows are NaN and treating them as zeros.",
        "Running rolling on unsorted data so the window spans the wrong rows."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "diff-pct-change",
      num: 6,
      title: "Row-over-row change and percent change",
      difficulty: "Medium",
      category: "Dates & Time Series",
      importance: "common",
      meta: { pattern: "Period-over-period delta", technique: "diff / pct_change", functions: "Series.diff, Series.pct_change" },
      description:
        "Measure how each row moves relative to the previous one. `.diff()` gives the absolute change (this value minus the one before); `.pct_change()` gives the fractional change. The first row has nothing to compare against, so both return `NaN` there.",
      notes: [
        "`.diff()` is `s - s.shift(1)`; `.pct_change()` is that difference divided by the prior value.",
        "`pct_change` returns a fraction (0.5 = +50%); multiply by 100 for a percentage."
      ],
      examples: [
        {
          input: "sales = [100, 150, 120, 180]",
          output: "diff: NaN,50,-30,60 ; pct: NaN,0.5,-0.2,0.5",
          reasoning: "150-100=50 (=+50%); 120-150=-30 (=-20%); 180-120=60 (=+50%); row 0 has no predecessor -> NaN."
        }
      ],
      approaches: [
        {
          name: "diff() and pct_change()",
          whenToUse: "Day-over-day deltas, growth rates, returns, or detecting jumps between consecutive periods.",
          logic:
            "**What it asks.** Compare each row to its immediate predecessor, in absolute and relative terms.\n\n" +
            "**Key idea.** `.diff()` subtracts the shifted-by-one series; `.pct_change()` divides that difference by the previous value.\n\n" +
            "**Step by step.**\n" +
            "1. Sort by date so 'previous' means the earlier period.\n" +
            "2. `df['change'] = df['sales'].diff()` for the absolute step.\n" +
            "3. `df['pct'] = df['sales'].pct_change(fill_method=None)` for the fractional step.\n\n" +
            "**Why it works.** Both are built on `shift(1)`, which aligns each value with the one above it; the first row aligns with nothing and yields `NaN`.\n\n" +
            "**Gotchas.**\n" +
            "- Row 0 is always `NaN` — there is no prior value; drop or fill it before summing.\n" +
            "- On unsorted data the 'previous' row is wrong; sort by time first.\n" +
            "- `pct_change` used to forward-fill gaps by default (a deprecation in pandas 2.1); pass `fill_method=None` to be explicit and warning-free across versions.\n\n" +
            "**Interview mindset.** Both lean on `shift`; name the leading `NaN` and that `pct_change` returns a fraction, not a percent.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-01', '2021-01-02',\n" +
            "                                            '2021-01-03', '2021-01-04']),\n" +
            "                   'sales': [100, 150, 120, 180]})\n" +
            "df['change'] = df['sales'].diff()                     # row 0 -> NaN\n" +
            "df['pct'] = df['sales'].pct_change(fill_method=None)  # fraction: 0.5 = +50%\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': pd.to_datetime(['2021-01-01', '2021-01-02',\n" +
            "                                            '2021-01-03', '2021-01-04']),\n" +
            "                   'sales': [100, 150, 120, 180]})\n" +
            "df['change'] = df['sales'].diff()\n" +
            "df['pct'] = df['sales'].pct_change(fill_method=None)\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'change from yesterday', 'growth rate', 'daily return', 'delta between rows'.",
        "**Say it:** `s.diff()` for absolute, `s.pct_change(fill_method=None)` for relative.",
        "**Trap:** row 0 is NaN; sort by time; pct_change is a fraction not a percent."
      ],
      commonMistakes: [
        "Treating the leading `NaN` as a real zero change.",
        "Multiplying nothing and reporting `pct_change` (a fraction) as if it were already a percent."
      ]
    }

  ]);
})();
