/*
 * Pandas Interview Lab — Reshape & Pivot
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 * Registers on the global registry:
 *     window.PANDAS.register("Reshape & Pivot", [ ...problems ]);
 *
 * Every rcs/plain snippet is self-contained runnable pandas (starts with
 * `import pandas as pd`) and prints its output. rcs and plain are the SAME
 * program; rcs adds trailing `# comments`. All snippets executed against
 * pandas before commit. Only stable pandas 2.x core reshape APIs are used
 * (pivot, pivot_table, melt, stack, unstack, crosstab, set_index,
 * reset_index) so the code also runs under the browser's Pyodide pandas.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Reshape & Pivot", [

    // ------------------------------------------------------------------ Q1
    {
      id: "pivot-long-to-wide",
      num: 1,
      title: "Pivot long rows into a wide table",
      difficulty: "Easy",
      category: "Reshape & Pivot",
      importance: "essential",
      meta: { pattern: "Long → wide", technique: "pivot (unique keys)", functions: "DataFrame.pivot" },
      description:
        "Reshape a tidy long table into a wide one: turn each distinct `city` into its own column, indexed by `date`, with `temp` as the cell value. `df.pivot(index=..., columns=..., values=...)` does the spread — but only when each (index, columns) pair is unique.",
      notes: [
        "`pivot` is a pure reshape — it never aggregates, so duplicate index/column pairs raise `ValueError`.",
        "For data with duplicates that must be combined, use `pivot_table` with an `aggfunc` instead."
      ],
      examples: [
        {
          input: "rows: (2021-01, NYC, 30), (2021-01, LA, 60), (2021-02, NYC, 35), (2021-02, LA, 62)",
          output: "index date; columns LA, NYC; each cell the temp",
          reasoning: "Each date/city pair appears once, so the values slot in with no aggregation."
        }
      ],
      approaches: [
        {
          name: "df.pivot(index, columns, values)",
          whenToUse: "Spreading one categorical column into headers when every index/column pair is unique.",
          logic:
            "**What it asks.** Move the values of a category column up into column headers, one column per category.\n\n" +
            "**Key idea.** `pivot` maps `(index, columns)` coordinates to `values` cells — a direct spread with no math.\n\n" +
            "**Step by step.**\n" +
            "1. Pick the row key: `index='date'`.\n" +
            "2. Pick the column key: `columns='city'`.\n" +
            "3. Pick the payload: `values='temp'`.\n" +
            "4. `df.pivot(index='date', columns='city', values='temp')`.\n\n" +
            "**Why it works.** Each unique index/column pair addresses exactly one cell, so pandas can place values without deciding how to combine them.\n\n" +
            "**Gotchas.**\n" +
            "- Duplicate `(index, columns)` pairs raise `ValueError: Index contains duplicate entries` — reach for `pivot_table`.\n" +
            "- Missing combinations become `NaN`, which can upcast integer columns to float.\n\n" +
            "**Interview mindset.** Say 'pivot for a pure reshape, pivot_table when duplicates need aggregating.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': ['2021-01', '2021-01', '2021-02', '2021-02'],\n" +
            "                   'city': ['NYC', 'LA', 'NYC', 'LA'],\n" +
            "                   'temp': [30, 60, 35, 62]})\n" +
            "wide = df.pivot(index='date', columns='city', values='temp')  # one col per city\n" +
            "print(wide)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'date': ['2021-01', '2021-01', '2021-02', '2021-02'],\n" +
            "                   'city': ['NYC', 'LA', 'NYC', 'LA'],\n" +
            "                   'temp': [30, 60, 35, 62]})\n" +
            "print(df.pivot(index='date', columns='city', values='temp'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'one column per category', 'spread values into headers', tidy → matrix.",
        "**Say it:** `df.pivot(index, columns, values)` when pairs are unique.",
        "**Trap:** duplicate pairs raise — that is pivot_table's job."
      ],
      commonMistakes: [
        "Using `pivot` on data with duplicate index/column pairs (raises ValueError).",
        "Expecting `pivot` to aggregate — it only reshapes."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "pivot-table-aggfunc-margins",
      num: 2,
      title: "Aggregate duplicates with pivot_table (and margins)",
      difficulty: "Medium",
      category: "Reshape & Pivot",
      importance: "essential",
      meta: { pattern: "Long → wide + aggregate", technique: "pivot_table aggfunc / margins", functions: "DataFrame.pivot_table" },
      description:
        "When several rows share the same `(index, columns)` pair, `pivot` fails — `pivot_table` collapses them with an `aggfunc` (e.g. `sum`, `mean`). Add `margins=True` to append an `All` row and column of totals.",
      notes: [
        "`aggfunc` defaults to `mean`; pass `'sum'`, `'count'`, a list, or a dict per value column.",
        "`margins=True` adds grand totals labeled `All`; `fill_value=0` replaces missing cells."
      ],
      examples: [
        {
          input: "region E has two A-sales (10, 20); margins=True",
          output: "E/A cell = 30, plus an All row and All column of totals",
          reasoning: "Duplicate E/A rows are summed to 30; margins add per-axis and grand totals."
        }
      ],
      approaches: [
        {
          name: "df.pivot_table(aggfunc=..., margins=True)",
          whenToUse: "Cross-tab of a numeric measure when index/column pairs repeat, or when you want totals.",
          logic:
            "**What it asks.** Spread a category into columns while combining duplicate cells, optionally with totals.\n\n" +
            "**Key idea.** `pivot_table` is a `groupby` + reshape: it groups by index and columns, then reduces each cell with `aggfunc`.\n\n" +
            "**Step by step.**\n" +
            "1. Set `index`, `columns`, `values` as in `pivot`.\n" +
            "2. Choose how to combine: `aggfunc='sum'`.\n" +
            "3. Add totals: `margins=True` (row/column labeled `All`).\n" +
            "4. `df.pivot_table(index='region', columns='product', values='sales', aggfunc='sum', margins=True)`.\n\n" +
            "**Why it works.** Grouping guarantees one value per cell, so repeated pairs no longer collide the way they do in `pivot`.\n\n" +
            "**Gotchas.**\n" +
            "- The default `aggfunc` is `mean`, not `sum` — set it explicitly.\n" +
            "- The margin label is always `All`; watch for it when you later index the result.\n\n" +
            "**Interview mindset.** Describe `pivot_table` as 'groupby that reshapes' — it is the aggregating cousin of `pivot`.",
          perfNote: "pivot_table runs a groupby under the hood; for a single aggregation groupby(...).unstack() is equivalent.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'region': ['E', 'E', 'W', 'W', 'E'],\n" +
            "                   'product': ['A', 'A', 'A', 'B', 'B'],\n" +
            "                   'sales': [10, 20, 30, 40, 50]})\n" +
            "pt = df.pivot_table(index='region', columns='product',\n" +
            "                    values='sales', aggfunc='sum', margins=True)  # sum + totals\n" +
            "print(pt)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'region': ['E', 'E', 'W', 'W', 'E'],\n" +
            "                   'product': ['A', 'A', 'A', 'B', 'B'],\n" +
            "                   'sales': [10, 20, 30, 40, 50]})\n" +
            "print(df.pivot_table(index='region', columns='product',\n" +
            "                     values='sales', aggfunc='sum', margins=True))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'sum/average by row and column', repeated keys, 'with totals'.",
        "**Say it:** `df.pivot_table(index, columns, values, aggfunc, margins=True)`.",
        "**Trap:** default aggfunc is mean; totals arrive under the label All."
      ],
      commonMistakes: [
        "Forgetting the default aggfunc is `mean` and getting averages instead of sums.",
        "Reaching for `pivot` on duplicated pairs instead of `pivot_table`."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "melt-wide-to-long",
      num: 3,
      title: "Melt wide columns into long rows",
      difficulty: "Easy",
      category: "Reshape & Pivot",
      importance: "essential",
      meta: { pattern: "Wide → long", technique: "melt (id_vars/value_vars)", functions: "DataFrame.melt" },
      description:
        "The inverse of pivot: fold several measure columns (`math`, `science`) into two tidy columns — one holding the former header name, one holding the value. `df.melt` keeps `id_vars` fixed and unpivots `value_vars`.",
      notes: [
        "`id_vars` are the identifier columns to keep; `value_vars` are the columns to unpivot.",
        "`var_name` / `value_name` rename the two output columns (default `variable` / `value`)."
      ],
      examples: [
        {
          input: "columns name, math, science → melt on name",
          output: "one row per (name, subject) with a score column",
          reasoning: "Each wide value column becomes rows tagged by subject, name repeated per subject."
        }
      ],
      approaches: [
        {
          name: "df.melt(id_vars, value_vars)",
          whenToUse: "Turning a wide matrix back into tidy long form for grouping or plotting.",
          logic:
            "**What it asks.** Collapse many value columns into a single (variable, value) pair, keeping id columns.\n\n" +
            "**Key idea.** `melt` stacks the chosen columns beneath each other, tagging each value with the header it came from.\n\n" +
            "**Step by step.**\n" +
            "1. Keep the identifiers: `id_vars='name'`.\n" +
            "2. Choose columns to unpivot: `value_vars=['math', 'science']`.\n" +
            "3. Name the outputs: `var_name='subject', value_name='score'`.\n" +
            "4. `df.melt(id_vars='name', value_vars=['math', 'science'], var_name='subject', value_name='score')`.\n\n" +
            "**Why it works.** Each value column is repeated down the rows with `id_vars` broadcast alongside, producing tidy long data.\n\n" +
            "**Gotchas.**\n" +
            "- Omitting `value_vars` melts every non-id column — usually what you want, but be explicit.\n" +
            "- The result's row count is `n_rows * len(value_vars)`; the index resets to a default range.\n\n" +
            "**Interview mindset.** Call it 'unpivot' — melt is the tidy-data inverse of pivot.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi'],\n" +
            "                   'math': [90, 80],\n" +
            "                   'science': [85, 95]})\n" +
            "long = df.melt(id_vars='name', value_vars=['math', 'science'],\n" +
            "               var_name='subject', value_name='score')  # unpivot to tidy\n" +
            "print(long)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi'],\n" +
            "                   'math': [90, 80],\n" +
            "                   'science': [85, 95]})\n" +
            "print(df.melt(id_vars='name', value_vars=['math', 'science'],\n" +
            "              var_name='subject', value_name='score'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'unpivot', 'columns into rows', 'tidy for plotting', wide → long.",
        "**Say it:** `df.melt(id_vars, value_vars, var_name, value_name)`.",
        "**Trap:** no value_vars means every non-id column is melted."
      ],
      commonMistakes: [
        "Forgetting `id_vars`, so identifier columns get unpivoted too.",
        "Assuming the original index is preserved — melt resets it."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "stack-unstack-multiindex",
      num: 4,
      title: "Move levels with stack and unstack",
      difficulty: "Hard",
      category: "Reshape & Pivot",
      importance: "common",
      meta: { pattern: "Index ↔ columns", technique: "stack / unstack a level", functions: "DataFrame.stack, DataFrame.unstack" },
      description:
        "On a frame with a MultiIndex, `unstack(level)` pushes one index level up into the columns (long → wide), and `stack(level)` pulls a column level back down into the index (wide → long). They are exact inverses and are the low-level engine behind `pivot`.",
      notes: [
        "`unstack` moves an *index* level to columns; `stack` moves a *column* level to the index.",
        "Either level can be named or positional; the result gains or loses a MultiIndex level accordingly."
      ],
      examples: [
        {
          input: "index (date, city); unstack('city') then stack('city')",
          output: "unstack widens city into columns; stack returns to the (date, city) index",
          reasoning: "unstack lifts the city level up; stack lowers it back — a round trip."
        }
      ],
      approaches: [
        {
          name: "unstack(level) / stack(level)",
          whenToUse: "Reshaping around a MultiIndex without building a full pivot, or inverting one.",
          logic:
            "**What it asks.** Rotate a chosen level between the row index and the column headers.\n\n" +
            "**Key idea.** `unstack` promotes an index level to columns; `stack` demotes a column level to the index — mirror operations.\n\n" +
            "**Step by step.**\n" +
            "1. Start from a MultiIndex frame (index levels `date`, `city`).\n" +
            "2. Widen: `df.unstack('city')` lifts `city` into the columns.\n" +
            "3. Narrow again: `wide.stack('city')` pushes `city` back into the index.\n\n" +
            "**Why it works.** Both operations just relabel one axis level onto the other; the underlying values are permuted, never aggregated.\n\n" +
            "**Gotchas.**\n" +
            "- Missing combinations after `unstack` fill with `NaN` (and may upcast ints to float).\n" +
            "- Classic `stack` drops all-`NaN` rows by default and sorts the levels, so a round trip can reorder rows.\n" +
            "- `pivot` is just `set_index([index, columns]).unstack(columns)` under the hood.\n\n" +
            "**Interview mindset.** Explain stack/unstack as the primitives; pivot and pivot_table are conveniences built on them.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "idx = pd.MultiIndex.from_tuples(\n" +
            "    [('2021-01', 'NYC'), ('2021-01', 'LA'),\n" +
            "     ('2021-02', 'NYC'), ('2021-02', 'LA')],\n" +
            "    names=['date', 'city'])\n" +
            "df = pd.DataFrame({'temp': [30, 60, 35, 62],\n" +
            "                   'humid': [40, 20, 45, 25]}, index=idx)\n" +
            "wide = df.unstack('city')     # city index level -> columns\n" +
            "print(wide)\n" +
            "print(wide.stack('city'))     # column level -> back to the index",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "idx = pd.MultiIndex.from_tuples(\n" +
            "    [('2021-01', 'NYC'), ('2021-01', 'LA'),\n" +
            "     ('2021-02', 'NYC'), ('2021-02', 'LA')],\n" +
            "    names=['date', 'city'])\n" +
            "df = pd.DataFrame({'temp': [30, 60, 35, 62],\n" +
            "                   'humid': [40, 20, 45, 25]}, index=idx)\n" +
            "wide = df.unstack('city')\n" +
            "print(wide)\n" +
            "print(wide.stack('city'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** MultiIndex reshapes, 'move a level to columns / to the index', inverting a pivot.",
        "**Say it:** `df.unstack(level)` (index→columns), `df.stack(level)` (columns→index).",
        "**Trap:** classic stack drops all-NaN rows and sorts, so a round trip may reorder."
      ],
      commonMistakes: [
        "Confusing the two directions — stack goes to the index, unstack goes to the columns.",
        "Assuming a stack/unstack round trip preserves the original row order."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "crosstab-frequency",
      num: 5,
      title: "Build a frequency table with crosstab",
      difficulty: "Medium",
      category: "Reshape & Pivot",
      importance: "common",
      meta: { pattern: "Contingency table", technique: "crosstab counts", functions: "pandas.crosstab" },
      description:
        "Count how often each combination of two categoricals occurs: `pd.crosstab(df['dept'], df['level'])` returns a contingency table of counts, rows indexed by `dept`, columns by `level`.",
      notes: [
        "`crosstab` defaults to counting; pass `values=` with `aggfunc=` to summarize a third column instead.",
        "`normalize=True` gives proportions; `margins=True` adds `All` totals."
      ],
      examples: [
        {
          input: "dept=[Eng,Eng,Sales,Sales,Eng], level=[Jr,Sr,Jr,Jr,Sr]",
          output: "Eng: Jr 1, Sr 2; Sales: Jr 2, Sr 0",
          reasoning: "Each cell counts rows with that (dept, level) pair."
        }
      ],
      approaches: [
        {
          name: "pd.crosstab(rows, cols)",
          whenToUse: "A quick count or proportion table across two (or more) category columns.",
          logic:
            "**What it asks.** Tabulate the frequency of each pair of category values.\n\n" +
            "**Key idea.** `crosstab` is a specialized `pivot_table` whose default aggregation is a count of occurrences.\n\n" +
            "**Step by step.**\n" +
            "1. Pass the row grouping Series and the column grouping Series.\n" +
            "2. `pd.crosstab(df['dept'], df['level'])`.\n" +
            "3. Optionally add `normalize=True` for shares or `margins=True` for totals.\n\n" +
            "**Why it works.** Each observed (row, column) pair increments its cell, giving a full contingency table with zeros for absent pairs.\n\n" +
            "**Gotchas.**\n" +
            "- It takes array-like arguments (Series), not a DataFrame plus column names like `pivot_table`.\n" +
            "- Absent combinations show as `0`, not `NaN` — handy for counts.\n\n" +
            "**Interview mindset.** Name it for 'frequency / contingency tables'; mention `pivot_table` for aggregating a measure.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Eng'],\n" +
            "                   'level': ['Jr', 'Sr', 'Jr', 'Jr', 'Sr']})\n" +
            "ct = pd.crosstab(df['dept'], df['level'])   # counts per (dept, level)\n" +
            "print(ct)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales', 'Eng'],\n" +
            "                   'level': ['Jr', 'Sr', 'Jr', 'Jr', 'Sr']})\n" +
            "print(pd.crosstab(df['dept'], df['level']))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'how many of each', 'frequency table', 'contingency table', counts by two categories.",
        "**Say it:** `pd.crosstab(rows, cols)`; add normalize/margins as needed.",
        "**Trap:** it takes Series, not a DataFrame + column names."
      ],
      commonMistakes: [
        "Passing the DataFrame and column-name strings like pivot_table (crosstab wants the Series).",
        "Forgetting `normalize=True` when proportions are wanted instead of raw counts."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "set-reset-index",
      num: 6,
      title: "Move data between index and columns",
      difficulty: "Easy",
      category: "Reshape & Pivot",
      importance: "essential",
      meta: { pattern: "Index ↔ column", technique: "set_index / reset_index", functions: "DataFrame.set_index, reset_index" },
      description:
        "`set_index('city')` promotes a column into the row index; `reset_index()` demotes the index back into a regular column and restores a default integer index. They are the everyday inverses for controlling what is an index vs. a column.",
      notes: [
        "`reset_index()` after a `groupby` turns group keys back into columns — a very common cleanup.",
        "`set_index(..., drop=False)` keeps the column too; `reset_index(drop=True)` discards the old index."
      ],
      examples: [
        {
          input: "columns city, pop → set_index('city') then reset_index()",
          output: "set_index makes city the index; reset_index restores it as a column",
          reasoning: "set_index lifts city into the index; reset_index puts it back and re-adds 0..n."
        }
      ],
      approaches: [
        {
          name: "set_index / reset_index",
          whenToUse: "Preparing an index for alignment/reshape, or flattening a result back to plain columns.",
          logic:
            "**What it asks.** Turn a column into the index, or turn the index back into a column.\n\n" +
            "**Key idea.** `set_index` and `reset_index` are inverses that relabel data between the index and the column axis.\n\n" +
            "**Step by step.**\n" +
            "1. Promote: `df.set_index('city')` makes `city` the row index.\n" +
            "2. Demote: `.reset_index()` returns `city` to a column and adds a fresh 0..n index.\n\n" +
            "**Why it works.** The index is just another labeled axis, so moving a column onto it (or off it) is a relabel, not a data change.\n\n" +
            "**Gotchas.**\n" +
            "- Both return a new frame by default — assign the result (or pass `inplace=True`).\n" +
            "- `reset_index(drop=True)` throws the old index away instead of keeping it as a column.\n\n" +
            "**Interview mindset.** Mention `reset_index()` as the standard tidy-up after `groupby`/`pivot` to get flat columns back.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'city': ['NYC', 'LA', 'SF'], 'pop': [8, 4, 1]})\n" +
            "idx = df.set_index('city')     # city column -> row index\n" +
            "print(idx)\n" +
            "print(idx.reset_index())       # index -> column, add 0..n back",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'city': ['NYC', 'LA', 'SF'], 'pop': [8, 4, 1]})\n" +
            "idx = df.set_index('city')\n" +
            "print(idx)\n" +
            "print(idx.reset_index())"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'make this column the index', 'flatten the index back', post-groupby cleanup.",
        "**Say it:** `df.set_index(col)` and `df.reset_index()` are inverses.",
        "**Trap:** they return a copy; `reset_index(drop=True)` discards the old index."
      ],
      commonMistakes: [
        "Forgetting to assign the result (or use inplace=True), so nothing changes.",
        "Using `reset_index(drop=True)` when you actually needed the index kept as a column."
      ]
    }

  ]);
})();
