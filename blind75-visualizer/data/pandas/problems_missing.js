/*
 * Pandas Interview Lab — Missing Data & Cleaning
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 * Registers on the global registry:
 *     window.PANDAS.register("Missing Data & Cleaning", [ ...problems ]);
 *
 * All rcs/plain snippets are self-contained runnable pandas (start with
 * `import pandas as pd`, add numpy for np.nan) and print output. Every
 * snippet was executed and its output verified against pandas before commit.
 * Sticks to STABLE pandas 2.x core APIs (isna, dropna, fillna, ffill, bfill,
 * drop_duplicates, .str, astype, to_numeric) so it also runs under Pyodide.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Missing Data & Cleaning", [

    // ------------------------------------------------------------------ Q1
    {
      id: "count-nulls-per-column",
      num: 1,
      title: "Count missing values per column",
      difficulty: "Easy",
      category: "Missing Data & Cleaning",
      importance: "essential",
      meta: { pattern: "Null audit", technique: "isna().sum()", functions: "DataFrame.isna, sum" },
      description:
        "Before cleaning anything, measure the damage: report how many missing values each column has. `df.isna()` marks every cell `True`/`False`, and summing down each column (`.sum()`) counts the `True`s — one null total per column.",
      notes: [
        "`isna` and `isnull` are aliases; `notna` is the inverse.",
        "`df.isna().sum().sum()` gives the grand total; `df.isna().mean()` gives the fraction missing per column."
      ],
      examples: [
        {
          input: "age = [25, NaN, 30]; city = ['NYC', 'LA', None]",
          output: "age 1, city 1",
          reasoning: "Each column has exactly one missing cell, so each count is 1."
        }
      ],
      approaches: [
        {
          name: "isna().sum()",
          whenToUse: "The first step of any cleaning pass — profiling where the gaps are.",
          logic:
            "**What it asks.** Count the missing values in each column.\n\n" +
            "**Key idea.** `isna()` returns a boolean frame; summing a boolean column counts its `True` values because `True` acts as 1.\n\n" +
            "**Step by step.**\n" +
            "1. `df.isna()` — a same-shaped frame of `True` where a cell is null.\n" +
            "2. `.sum()` — sums down each column (axis 0 by default), giving per-column null counts.\n\n" +
            "**Why it works.** Booleans sum as integers, so the column total is exactly the number of `True` (missing) cells.\n\n" +
            "**Gotchas.**\n" +
            "- `isna` flags `NaN`, `None`, and `NaT`, but not empty strings or sentinel values like `-1` — those need explicit handling first.\n" +
            "- Use `.mean()` instead of `.sum()` when you want the fraction rather than the count.\n\n" +
            "**Interview mindset.** Lead with 'profile first': `df.isna().sum()` before deciding to drop or fill.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'age': [25, np.nan, 30],\n" +
            "                   'city': ['NYC', 'LA', None]})\n" +
            "print(df.isna().sum())        # True counts as 1, so this counts nulls",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'age': [25, np.nan, 30],\n" +
            "                   'city': ['NYC', 'LA', None]})\n" +
            "print(df.isna().sum())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many missing', 'nulls per column', 'data quality check'.",
        "**Say it:** `df.isna().sum()` — booleans sum to counts.",
        "**Trap:** empty strings and sentinels aren't nulls; isna won't catch them."
      ],
      commonMistakes: [
        "Treating `''` or `-1` as missing when `isna` only flags NaN/None/NaT.",
        "Confusing `.sum()` (counts) with `.mean()` (fraction missing)."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "dropna-rows-cols",
      num: 2,
      title: "Drop rows or columns with missing values",
      difficulty: "Easy",
      category: "Missing Data & Cleaning",
      importance: "essential",
      meta: { pattern: "Row/col removal", technique: "dropna subset/how/thresh", functions: "DataFrame.dropna" },
      description:
        "Discard incomplete data with `dropna`. By default it removes any row containing a null; tune it with `subset` (only these columns matter), `how='all'` (drop only fully-empty rows), and `thresh=k` (keep rows with at least k non-null values).",
      notes: [
        "`axis=0` drops rows (default), `axis=1` drops columns.",
        "`subset`, `how`, and `thresh` interact: `thresh` overrides `how` when both are given."
      ],
      examples: [
        {
          input: "4 rows; only row 0 has no nulls; ages missing in rows 1 and 3",
          output: "dropna() keeps row 0; dropna(subset=['age']) keeps rows 0 and 2",
          reasoning: "Plain dropna needs a fully complete row; subset only checks the age column."
        }
      ],
      approaches: [
        {
          name: "dropna with subset / how / thresh",
          whenToUse: "When missing rows are few and safe to discard, or a column is too sparse to keep.",
          logic:
            "**What it asks.** Remove rows (or columns) that are too incomplete to use.\n\n" +
            "**Key idea.** `dropna` deletes along an axis based on how many nulls it finds; the parameters control how strict that test is.\n\n" +
            "**Step by step.**\n" +
            "1. `df.dropna()` — drop every row with any null.\n" +
            "2. `df.dropna(subset=['age'])` — drop only rows null in `age`.\n" +
            "3. `df.dropna(how='all')` — drop only rows that are entirely null.\n" +
            "4. `df.dropna(thresh=3)` — keep rows with at least 3 non-null values.\n\n" +
            "**Why it works.** Each option changes the null-count threshold at which a row (or column, with `axis=1`) is removed.\n\n" +
            "**Gotchas.**\n" +
            "- `dropna` returns a new frame; it doesn't mutate in place unless `inplace=True`.\n" +
            "- The default `how='any'` is aggressive — one null anywhere kills the whole row.\n" +
            "- `thresh` counts non-null values, not nulls — easy to invert by mistake.\n\n" +
            "**Interview mindset.** Drop only when loss is acceptable; otherwise prefer filling. Name `subset` to avoid nuking rows over an irrelevant column.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia', 'Leo'],\n" +
            "                   'age': [25, np.nan, 30, np.nan],\n" +
            "                   'city': ['NYC', 'LA', None, 'SF']})\n" +
            "print(df.dropna())                    # any null -> row removed\n" +
            "print(df.dropna(subset=['age']))      # only the age column matters",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia', 'Leo'],\n" +
            "                   'age': [25, np.nan, 30, np.nan],\n" +
            "                   'city': ['NYC', 'LA', None, 'SF']})\n" +
            "print(df.dropna())\n" +
            "print(df.dropna(subset=['age']))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'remove incomplete rows', 'drop columns that are mostly empty'.",
        "**Say it:** `df.dropna(subset=[...])`, `how='all'`, or `thresh=k`.",
        "**Trap:** default `how='any'` drops a row for a single null anywhere."
      ],
      commonMistakes: [
        "Calling `dropna()` without `subset` and losing rows over an unrelated null.",
        "Assuming it mutates the frame — it returns a copy unless `inplace=True`.",
        "Reading `thresh` as a null limit instead of a non-null minimum."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "fillna-constant-or-dict",
      num: 3,
      title: "Fill missing values with a constant or per-column dict",
      difficulty: "Easy",
      category: "Missing Data & Cleaning",
      importance: "essential",
      meta: { pattern: "Imputation", technique: "fillna scalar/dict", functions: "DataFrame.fillna" },
      description:
        "Replace nulls instead of dropping them. `df.fillna(0)` puts the same value everywhere, while a dict `df.fillna({'age': 0, 'city': 'Unknown'})` fills each column with its own sensible default.",
      notes: [
        "Pass a scalar for one value everywhere, or a dict keyed by column for per-column fills.",
        "A common statistical fill is `df['age'].fillna(df['age'].mean())` (or median/mode)."
      ],
      examples: [
        {
          input: "age = [25, NaN, 30]; city = ['NYC', None, 'SF']",
          output: "age null becomes 0; city null becomes 'Unknown'",
          reasoning: "The dict maps each column to its own replacement value."
        }
      ],
      approaches: [
        {
          name: "fillna with scalar or dict",
          whenToUse: "When you want to keep the rows and substitute a default or an estimated value.",
          logic:
            "**What it asks.** Replace missing cells with a chosen value rather than removing the row.\n\n" +
            "**Key idea.** `fillna` accepts a scalar (same fill everywhere) or a dict mapping column -> fill value.\n\n" +
            "**Step by step.**\n" +
            "1. Uniform: `df.fillna(0)`.\n" +
            "2. Per-column: `df.fillna({'age': 0, 'city': 'Unknown'})`.\n" +
            "3. Statistical: `df['age'].fillna(df['age'].mean())`.\n\n" +
            "**Why it works.** The dict form targets each column independently, so numeric and text columns get type-appropriate defaults in one call.\n\n" +
            "**Gotchas.**\n" +
            "- Filling a numeric column with a mean can change its distribution — note that trade-off in interviews.\n" +
            "- `fillna` returns a new frame unless `inplace=True`; reassign the result.\n" +
            "- Filling `0` into a column where 0 is a valid measurement hides the fact that data was missing.\n\n" +
            "**Interview mindset.** Match the fill to the column's meaning: mean/median for numbers, a category like 'Unknown' for labels.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'age': [25, np.nan, 30],\n" +
            "                   'city': ['NYC', None, 'SF']})\n" +
            "print(df.fillna({'age': 0, 'city': 'Unknown'}))   # per-column defaults",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'age': [25, np.nan, 30],\n" +
            "                   'city': ['NYC', None, 'SF']})\n" +
            "print(df.fillna({'age': 0, 'city': 'Unknown'}))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'replace missing with', 'impute', 'default value for nulls'.",
        "**Say it:** `df.fillna(0)` or `df.fillna({'col': value})`.",
        "**Trap:** filling 0 where 0 is meaningful erases the missingness signal."
      ],
      commonMistakes: [
        "Forgetting to reassign (or use `inplace=True`) so the fill is discarded.",
        "Using a single scalar across mixed-type columns and getting nonsense fills."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "ffill-bfill-timeorder",
      num: 4,
      title: "Forward/backward fill time-ordered data",
      difficulty: "Medium",
      category: "Missing Data & Cleaning",
      importance: "common",
      meta: { pattern: "Directional fill", technique: "ffill / bfill", functions: "DataFrame.ffill, bfill" },
      description:
        "For ordered data (a time series of prices, say), carry the last known value forward into the gaps with `.ffill()`, or pull the next value backward with `.bfill()`. This propagates a real observation rather than inventing a constant.",
      notes: [
        "Use `.ffill()` / `.bfill()` — the old `fillna(method='ffill')` form is deprecated.",
        "Fill only makes sense once the frame is sorted by its time/order key."
      ],
      examples: [
        {
          input: "price = [10, NaN, NaN, 13] over days 1..4",
          output: "ffill -> [10, 10, 10, 13]; bfill -> [10, 13, 13, 13]",
          reasoning: "ffill carries 10 forward; bfill pulls 13 backward into the gaps."
        }
      ],
      approaches: [
        {
          name: "ffill vs bfill",
          whenToUse: "Sequential data where the nearest known value is a reasonable estimate for a gap.",
          logic:
            "**What it asks.** Fill gaps by propagating the neighbouring known value along the order.\n\n" +
            "**Key idea.** `ffill` copies the last valid value downward into the nulls; `bfill` copies the next valid value upward.\n\n" +
            "**Step by step.**\n" +
            "1. Sort the frame by its time/order column first.\n" +
            "2. `df.ffill()` to carry values forward, or `df.bfill()` to carry them backward.\n\n" +
            "**Why it works.** In ordered data the previous (or next) observation is usually the best cheap estimate of a missing point.\n\n" +
            "**Gotchas.**\n" +
            "- A leading null has nothing before it, so `ffill` leaves it null (mirror for a trailing null with `bfill`); combine both or add a final `fillna` if needed.\n" +
            "- Fill is only valid on sorted data — filling an unsorted frame propagates the wrong neighbour.\n" +
            "- Within groups, use `df.groupby(key).ffill()` so values don't leak across group boundaries.\n\n" +
            "**Interview mindset.** Call it 'last observation carried forward' and stress the sort-first, mind-the-edges caveats.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'day': [1, 2, 3, 4],\n" +
            "                   'price': [10.0, np.nan, np.nan, 13.0]})\n" +
            "print(df.ffill())     # carry last known price forward\n" +
            "print(df.bfill())     # pull next known price backward",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'day': [1, 2, 3, 4],\n" +
            "                   'price': [10.0, np.nan, np.nan, 13.0]})\n" +
            "print(df.ffill())\n" +
            "print(df.bfill())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'time series', 'carry forward', 'last known value', 'sensor gaps'.",
        "**Say it:** `df.ffill()` (forward) or `df.bfill()` (backward), after sorting.",
        "**Trap:** leading/trailing nulls can't be filled from that direction."
      ],
      commonMistakes: [
        "Filling before sorting by the time key, propagating the wrong value.",
        "Using the deprecated `fillna(method='ffill')` instead of `.ffill()`.",
        "Letting values bleed across groups instead of `groupby(key).ffill()`."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "drop-duplicates",
      num: 5,
      title: "Remove duplicate rows",
      difficulty: "Easy",
      category: "Missing Data & Cleaning",
      importance: "essential",
      meta: { pattern: "Dedup", technique: "drop_duplicates subset/keep", functions: "DataFrame.drop_duplicates" },
      description:
        "Collapse repeated records with `drop_duplicates`. By default it compares whole rows and keeps the first occurrence; `subset` limits the comparison to key columns, and `keep='last'` (or `keep=False`) changes which copy survives.",
      notes: [
        "`keep='first'` (default), `keep='last'`, or `keep=False` to drop every duplicated row.",
        "`subset=[...]` defines what 'duplicate' means — often an id or natural key."
      ],
      examples: [
        {
          input: "id = [1, 1, 2, 3] with row 0 and 1 identical",
          output: "drop_duplicates() removes the repeated id 1 row, keeping the first",
          reasoning: "Rows 0 and 1 are identical, so only the first is kept."
        }
      ],
      approaches: [
        {
          name: "drop_duplicates with subset / keep",
          whenToUse: "De-duplicating after concatenation, joins, or repeated ingestion.",
          logic:
            "**What it asks.** Keep one copy of each duplicated record and drop the rest.\n\n" +
            "**Key idea.** `drop_duplicates` compares rows (or just `subset` columns) and keeps the occurrence chosen by `keep`.\n\n" +
            "**Step by step.**\n" +
            "1. `df.drop_duplicates()` — full-row dedup, keep first.\n" +
            "2. `df.drop_duplicates(subset=['id'])` — dedup by key column only.\n" +
            "3. `keep='last'` keeps the final copy; `keep=False` drops all duplicates entirely.\n\n" +
            "**Why it works.** pandas hashes the compared columns and keeps only the first/last row per unique combination.\n\n" +
            "**Gotchas.**\n" +
            "- Without `subset`, two rows must match on **every** column to count as duplicates.\n" +
            "- The kept row depends on order, so sort first when 'latest wins' matters.\n" +
            "- Returns a copy; the original index is preserved (gaps appear), reset with `reset_index(drop=True)` if needed.\n\n" +
            "**Interview mindset.** Ask 'duplicate on what key?' — the answer decides `subset`; 'which copy to keep?' decides `keep`.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'id': [1, 1, 2, 3],\n" +
            "                   'name': ['Asha', 'Asha', 'Ravi', 'Mia'],\n" +
            "                   'city': ['NYC', 'NYC', 'LA', 'SF']})\n" +
            "print(df.drop_duplicates())                       # identical rows collapse\n" +
            "print(df.drop_duplicates(subset=['id'], keep='last'))  # dedup by id, keep last",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'id': [1, 1, 2, 3],\n" +
            "                   'name': ['Asha', 'Asha', 'Ravi', 'Mia'],\n" +
            "                   'city': ['NYC', 'NYC', 'LA', 'SF']})\n" +
            "print(df.drop_duplicates())\n" +
            "print(df.drop_duplicates(subset=['id'], keep='last'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'remove duplicates', 'one row per id', 'dedupe after merge'.",
        "**Say it:** `df.drop_duplicates(subset=[key], keep='last')`.",
        "**Trap:** default compares all columns; kept row depends on order."
      ],
      commonMistakes: [
        "Omitting `subset` and missing near-duplicates that differ in one column.",
        "Assuming a specific copy survives without sorting to control `keep`."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "clean-text-fix-dtypes",
      num: 6,
      title: "Standardize a text column and fix dtypes",
      difficulty: "Medium",
      category: "Missing Data & Cleaning",
      importance: "common",
      meta: { pattern: "Normalize + convert", technique: ".str + to_numeric/astype", functions: "Series.str, to_numeric, astype" },
      description:
        "Messy imports arrive with padded, inconsistent-case text and numbers stored as strings. Clean the text with `.str.strip().str.lower()`, then coerce a column to a real numeric dtype with `pd.to_numeric(..., errors='coerce')` (bad values become NaN) or `astype` when the data is already clean.",
      notes: [
        "`.str.strip()` trims whitespace; `.str.lower()` normalizes case for reliable grouping/joins.",
        "`to_numeric(errors='coerce')` turns unparseable values into NaN instead of raising; `astype(int)` fails on any bad value."
      ],
      examples: [
        {
          input: "city = ['  NYC ', 'la', 'SF  ']; price = ['10', '20', 'x']",
          output: "city -> ['nyc', 'la', 'sf']; price -> [10.0, 20.0, NaN] (float64)",
          reasoning: "strip+lower normalizes the text; to_numeric coerces 'x' to NaN, making the column float."
        }
      ],
      approaches: [
        {
          name: ".str cleaning + to_numeric/astype",
          whenToUse: "Right after loading raw CSV/scraped data, before grouping, joining, or aggregating.",
          logic:
            "**What it asks.** Normalize a text column and convert a mistyped column to its proper dtype.\n\n" +
            "**Key idea.** The `.str` accessor vectorizes string cleanup; `to_numeric`/`astype` then fix the storage type so math and comparisons work.\n\n" +
            "**Step by step.**\n" +
            "1. `df['city'] = df['city'].str.strip().str.lower()` — trim and lowercase.\n" +
            "2. `df['price'] = pd.to_numeric(df['price'], errors='coerce')` — parse to numbers, bad values -> NaN.\n" +
            "3. When values are guaranteed clean, `df['col'].astype(int)` is the direct cast.\n\n" +
            "**Why it works.** `.str` methods chain element-wise; `to_numeric` with `errors='coerce'` guarantees a numeric column even amid junk, isolating problems as NaN.\n\n" +
            "**Gotchas.**\n" +
            "- `astype(int)` raises on any non-numeric value or NaN — use `to_numeric(errors='coerce')` first for dirty data.\n" +
            "- Coercing bad values to NaN silently hides them; audit with `isna().sum()` afterward.\n" +
            "- Case/whitespace differences make ` 'NYC'` and `'nyc'` distinct keys until normalized — clean before grouping or joining.\n\n" +
            "**Interview mindset.** Sequence it: normalize text, coerce types, then re-check nulls. Prefer `to_numeric(errors='coerce')` over `astype` on untrusted input.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'city': ['  NYC ', 'la', 'SF  '],\n" +
            "                   'price': ['10', '20', 'x']})\n" +
            "df['city'] = df['city'].str.strip().str.lower()          # trim + lowercase\n" +
            "df['price'] = pd.to_numeric(df['price'], errors='coerce')  # 'x' -> NaN\n" +
            "print(df)\n" +
            "print(df['price'].dtype)                                 # now float64",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'city': ['  NYC ', 'la', 'SF  '],\n" +
            "                   'price': ['10', '20', 'x']})\n" +
            "df['city'] = df['city'].str.strip().str.lower()\n" +
            "df['price'] = pd.to_numeric(df['price'], errors='coerce')\n" +
            "print(df)\n" +
            "print(df['price'].dtype)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'trim/normalize text', 'numbers stored as strings', 'inconsistent case'.",
        "**Say it:** `.str.strip().str.lower()` then `pd.to_numeric(errors='coerce')`.",
        "**Trap:** `astype(int)` blows up on junk/NaN; coerce first."
      ],
      commonMistakes: [
        "Grouping/joining on text before normalizing case and whitespace.",
        "Using `astype` on dirty data and hitting a ValueError.",
        "Coercing to NaN and never re-checking with `isna().sum()`."
      ]
    }

  ]);
})();
