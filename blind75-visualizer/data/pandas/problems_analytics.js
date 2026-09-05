/*
 * Pandas Interview Lab — Real-World Analytics
 * =========================================================================
 * Follows the FORMAT REFERENCE documented in problems_selection.js.
 *
 * Each file registers its problems on the global registry:
 *     window.PANDAS.register("Category Name", [ ...problems ]);
 *
 * These are data-engineering / analyst style interview tasks: share of total,
 * month-over-month growth, running totals, Nth-highest per group, cohort
 * retention, and top category per region. Every rcs/plain snippet is a
 * self-contained runnable pandas program that prints its result, and every
 * printed output below was executed against pandas before commit. Only stable
 * pandas 2.x core APIs are used (groupby, transform, pct_change, cumsum, rank,
 * nlargest, pivot_table, idxmax, sort_values, drop_duplicates) so the code also
 * runs under the browser's Pyodide pandas — no df.append, no deprecated calls.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Real-World Analytics", [

    // ------------------------------------------------------------------ Q1
    {
      id: "share-of-total-per-category",
      num: 1,
      title: "Share of total per category",
      difficulty: "Medium",
      category: "Real-World Analytics",
      importance: "essential",
      meta: { pattern: "Part-of-whole", technique: "groupby transform / sum then divide", functions: "groupby, transform, sum" },
      description:
        "For a table of sales rows, compute each row's revenue as a **percentage of its category total** — e.g. a row of 30 in a category summing to 40 is 75%. `groupby(...).transform('sum')` broadcasts the category total back onto every row so you can divide in one aligned step.",
      notes: [
        "`transform('sum')` returns a Series the **same length** as the frame — one total per row — so it divides cleanly.",
        "If you only need the category-level share (one row per category), aggregate with `groupby().sum()` first, then divide by the grand total."
      ],
      examples: [
        {
          input: "category=[A,A,B,B,C], revenue=[30,10,40,20,100]",
          output: "pct_of_total = [75.0, 25.0, 66.67, 33.33, 100.0]",
          reasoning: "Each value is divided by its own category's sum (A=40, B=60, C=100), times 100."
        }
      ],
      approaches: [
        {
          name: "groupby().transform('sum') — row-level share",
          whenToUse: "You want to keep every original row and attach its share of the group.",
          logic:
            "**What it asks.** Add a column giving each row's contribution to its category total, as a percent.\n\n" +
            "**Key idea.** `transform` computes a group aggregate but returns it **aligned to every row**, so the per-row divide just works.\n\n" +
            "**Step by step.**\n" +
            "1. Get the per-row category total: `df.groupby('category')['revenue'].transform('sum')`.\n" +
            "2. Divide: `df['revenue'] / total * 100`.\n" +
            "3. Round for a stable, readable result.\n\n" +
            "**Why it works.** Unlike `agg`, `transform` preserves the frame's shape and index, so the result lines up row-for-row for arithmetic.\n\n" +
            "**Gotchas.**\n" +
            "- Don't use `groupby().sum()` here and divide — the shapes differ and it won't align.\n" +
            "- Watch for a category total of 0, which yields `inf`/`NaN`.\n\n" +
            "**Interview mindset.** Say 'transform broadcasts the group total back to each row' — that one line signals you know the shape difference from `agg`.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'category': ['A', 'A', 'B', 'B', 'C'],\n" +
            "                   'revenue':  [30, 10, 40, 20, 100]})\n" +
            "total = df.groupby('category')['revenue'].transform('sum')  # one total per ROW\n" +
            "df['pct_of_total'] = (df['revenue'] / total * 100).round(2)  # aligned divide\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'category': ['A', 'A', 'B', 'B', 'C'],\n" +
            "                   'revenue':  [30, 10, 40, 20, 100]})\n" +
            "total = df.groupby('category')['revenue'].transform('sum')\n" +
            "df['pct_of_total'] = (df['revenue'] / total * 100).round(2)\n" +
            "print(df)"
        },
        {
          name: "groupby().sum() then divide by grand total — category-level share",
          whenToUse: "You want one row per category, each with its share of the overall total.",
          logic:
            "**What it asks.** Collapse to one row per category and give each category's percent of the grand total.\n\n" +
            "**Key idea.** Aggregate first, then divide the category totals by their own sum.\n\n" +
            "**Step by step.**\n" +
            "1. `grp = df.groupby('category', as_index=False)['revenue'].sum()`.\n" +
            "2. `grp['share_pct'] = grp['revenue'] / grp['revenue'].sum() * 100`.\n\n" +
            "**Why it works.** After aggregation each category is a single row, so dividing by the column's total gives a clean part-of-whole.\n\n" +
            "**Gotchas.**\n" +
            "- `as_index=False` keeps `category` as a column instead of pushing it into the index.\n" +
            "- This is a different output shape from the transform approach — pick based on whether you need per-row detail.\n\n" +
            "**Interview mindset.** Clarify up front: 'row-level share, or category-level share?' — they need different tools.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'category': ['A', 'A', 'B', 'B', 'C'],\n" +
            "                   'revenue':  [30, 10, 40, 20, 100]})\n" +
            "grp = df.groupby('category', as_index=False)['revenue'].sum()      # one row/category\n" +
            "grp['share_pct'] = (grp['revenue'] / grp['revenue'].sum() * 100).round(2)\n" +
            "print(grp)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'category': ['A', 'A', 'B', 'B', 'C'],\n" +
            "                   'revenue':  [30, 10, 40, 20, 100]})\n" +
            "grp = df.groupby('category', as_index=False)['revenue'].sum()\n" +
            "grp['share_pct'] = (grp['revenue'] / grp['revenue'].sum() * 100).round(2)\n" +
            "print(grp)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'percent of total', 'share of category', 'contribution to the group'.",
        "**Say it:** `df.groupby(k)[v].transform('sum')` for a per-row divide.",
        "**Trap:** `groupby().sum()` changes shape; use `transform` to keep every row."
      ],
      commonMistakes: [
        "Dividing by `groupby().sum()` (wrong shape) instead of `transform('sum')`.",
        "Forgetting a zero group total produces inf/NaN."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "month-over-month-growth",
      num: 2,
      title: "Month-over-month growth per group",
      difficulty: "Medium",
      category: "Real-World Analytics",
      importance: "essential",
      meta: { pattern: "Period-over-period", technique: "sort + groupby pct_change", functions: "sort_values, groupby, pct_change" },
      description:
        "For each product, compute the month-over-month revenue growth as a percent. **Sort by product and month first**, then `groupby('product')['revenue'].pct_change()` so each product's series is differenced independently and never bleeds across the group boundary.",
      notes: [
        "The first month of each product has no prior period, so its growth is `NaN` — that is correct, not a bug.",
        "Sorting before the groupby is essential; `pct_change` compares against the *previous row within the group*."
      ],
      examples: [
        {
          input: "product X revenue by month = [100, 150, 120]",
          output: "mom_growth = [NaN, 50.0, -20.0]",
          reasoning: "150/100-1 = +50%, then 120/150-1 = -20%; the first month has no predecessor."
        }
      ],
      approaches: [
        {
          name: "sort_values then groupby().pct_change()",
          whenToUse: "Any per-group time series where each row should compare to the prior period.",
          logic:
            "**What it asks.** The percentage change from the previous month, computed separately per product.\n\n" +
            "**Key idea.** `pct_change` inside a `groupby` restarts at each group, so growth never leaks from one product into the next.\n\n" +
            "**Step by step.**\n" +
            "1. `df.sort_values(['product', 'month'])` so rows are in chronological order within each product.\n" +
            "2. `df.groupby('product')['revenue'].pct_change()` for the fraction change.\n" +
            "3. Multiply by 100 and round to get a percent.\n\n" +
            "**Why it works.** Grouped `pct_change` resets its 'previous value' at each group's first row, yielding `NaN` there and clean ratios after.\n\n" +
            "**Gotchas.**\n" +
            "- Forgetting to sort gives nonsense — it differences whatever row happened to come before.\n" +
            "- Without the groupby, the first row of a product would compare to the last row of the previous product.\n\n" +
            "**Interview mindset.** State the two-step recipe: 'sort within group, then grouped pct_change' — and call out the leading NaN as expected.",
          perfNote: "Equivalent to `x / x.shift(1) - 1` within each group; pct_change just packages it.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'product': ['X', 'X', 'X', 'Y', 'Y', 'Y'],\n" +
            "    'month':   ['2024-01', '2024-02', '2024-03', '2024-01', '2024-02', '2024-03'],\n" +
            "    'revenue': [100, 150, 120, 200, 180, 220],\n" +
            "})\n" +
            "df = df.sort_values(['product', 'month'])                # chronological per product\n" +
            "df['mom_growth'] = (df.groupby('product')['revenue']\n" +
            "                      .pct_change() * 100).round(2)       # NaN for each first month\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'product': ['X', 'X', 'X', 'Y', 'Y', 'Y'],\n" +
            "    'month':   ['2024-01', '2024-02', '2024-03', '2024-01', '2024-02', '2024-03'],\n" +
            "    'revenue': [100, 150, 120, 200, 180, 220],\n" +
            "})\n" +
            "df = df.sort_values(['product', 'month'])\n" +
            "df['mom_growth'] = (df.groupby('product')['revenue'].pct_change() * 100).round(2)\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'month-over-month', 'week-over-week', 'growth vs previous period per group'.",
        "**Say it:** sort within group, then `groupby(k)[v].pct_change()`.",
        "**Trap:** unsorted data or a plain `pct_change` leaks across group boundaries."
      ],
      commonMistakes: [
        "Calling `pct_change` without sorting the periods first.",
        "Dropping the leading NaN and mis-aligning the rows."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "running-total-per-group",
      num: 3,
      title: "Running (cumulative) total per group",
      difficulty: "Medium",
      category: "Real-World Analytics",
      importance: "common",
      meta: { pattern: "Cumulative window", technique: "groupby cumsum", functions: "sort_values, groupby, cumsum" },
      description:
        "Compute a running balance per account: sort by account and day, then `groupby('account')['amount'].cumsum()` to accumulate transactions independently within each account. This is the pandas answer to SQL's `SUM(...) OVER (PARTITION BY account ORDER BY day)`.",
      notes: [
        "`cumsum` inside a groupby restarts the accumulator at each new group.",
        "Sort within the group first so the running total follows the intended order."
      ],
      examples: [
        {
          input: "account A amounts in day order = [100, -30, 50]",
          output: "balance = [100, 70, 120]",
          reasoning: "Each row adds to the prior cumulative sum: 100, 100-30=70, 70+50=120."
        }
      ],
      approaches: [
        {
          name: "groupby().cumsum()",
          whenToUse: "Running totals, cumulative counts, or any partitioned prefix-sum.",
          logic:
            "**What it asks.** A per-account balance that accumulates transactions in day order.\n\n" +
            "**Key idea.** `cumsum` within a `groupby` is a partitioned prefix sum — it resets at each account.\n\n" +
            "**Step by step.**\n" +
            "1. `df.sort_values(['account', 'day'])` for correct ordering.\n" +
            "2. `df.groupby('account')['amount'].cumsum()` for the running total.\n" +
            "3. Assign it back as a new column.\n\n" +
            "**Why it works.** Grouped `cumsum` walks each group's rows in order, carrying a running sum that starts fresh per group.\n\n" +
            "**Gotchas.**\n" +
            "- Order matters — sort before accumulating or the running total is meaningless.\n" +
            "- `cumsum` keeps every row (unlike `sum`, which collapses the group).\n\n" +
            "**Interview mindset.** Map it to the SQL window function out loud: `SUM() OVER (PARTITION BY ... ORDER BY ...)`.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'account': ['A', 'A', 'A', 'B', 'B'],\n" +
            "    'day':     [1, 2, 3, 1, 2],\n" +
            "    'amount':  [100, -30, 50, 200, 40],\n" +
            "})\n" +
            "df = df.sort_values(['account', 'day'])               # order within each account\n" +
            "df['balance'] = df.groupby('account')['amount'].cumsum()  # resets per account\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'account': ['A', 'A', 'A', 'B', 'B'],\n" +
            "    'day':     [1, 2, 3, 1, 2],\n" +
            "    'amount':  [100, -30, 50, 200, 40],\n" +
            "})\n" +
            "df = df.sort_values(['account', 'day'])\n" +
            "df['balance'] = df.groupby('account')['amount'].cumsum()\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'running total', 'cumulative balance', 'so far', SQL `SUM() OVER`.",
        "**Say it:** sort, then `groupby(k)[v].cumsum()`.",
        "**Trap:** must sort within the group; `cumsum` keeps all rows, `sum` collapses them."
      ],
      commonMistakes: [
        "Skipping the sort so the running total follows arbitrary row order.",
        "Reaching for `sum` (collapses groups) when a per-row `cumsum` is needed."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "second-highest-salary-per-dept",
      num: 4,
      title: "Second-highest salary per department",
      difficulty: "Hard",
      category: "Real-World Analytics",
      importance: "essential",
      meta: { pattern: "Nth-per-group", technique: "dense rank / distinct + nth", functions: "groupby, rank, drop_duplicates, nth" },
      description:
        "A classic SQL-style interview question in pandas: find the **second-highest distinct salary within each department**. Rank salaries per department in descending order with `method='dense'` (so ties share a rank and don't skip values), then keep the rows where the rank equals 2.",
      notes: [
        "`method='dense'` is the key: with salaries 100, 100, 90 the second-highest distinct salary is 90 — dense rank gives it rank 2, whereas the default `'average'`/`'min'` would skip it.",
        "If a department has only one distinct salary, no row gets rank 2 and it simply drops out."
      ],
      examples: [
        {
          input: "Eng salaries = [100, 100, 90]",
          output: "second-highest = 90 (dense rank 2)",
          reasoning: "The two 100s tie at dense rank 1; 90 is the next distinct value, rank 2."
        }
      ],
      approaches: [
        {
          name: "groupby().rank(method='dense', ascending=False)",
          whenToUse: "Nth-highest/lowest per group, with ties treated as one value.",
          logic:
            "**What it asks.** The 2nd distinct-highest salary in each department, handling ties correctly.\n\n" +
            "**Key idea.** A **dense** descending rank labels distinct values 1, 2, 3… per group; filter to rank 2.\n\n" +
            "**Step by step.**\n" +
            "1. `df.groupby('dept')['salary'].rank(method='dense', ascending=False)`.\n" +
            "2. Keep rows where that rank equals 2.\n" +
            "3. (Optional) project just the columns you need.\n\n" +
            "**Why it works.** Dense ranking never skips numbers on ties, so 'rank == 2' means exactly the second-highest distinct salary.\n\n" +
            "**Gotchas.**\n" +
            "- The default `method` skips ranks after ties — always specify `'dense'` for Nth-distinct.\n" +
            "- Set `ascending=False` for highest-first; omit it and you'd get the 2nd-*lowest*.\n\n" +
            "**Interview mindset.** Name the tie policy explicitly: 'dense rank so ties collapse and I get the true 2nd distinct value.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'dept':   ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "    'name':   ['A', 'B', 'C', 'D', 'E'],\n" +
            "    'salary': [100, 100, 90, 80, 70],\n" +
            "})\n" +
            "df['rnk'] = df.groupby('dept')['salary'].rank(method='dense', ascending=False)\n" +
            "print(df[df['rnk'] == 2])          # second-highest DISTINCT salary per dept",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'dept':   ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "    'name':   ['A', 'B', 'C', 'D', 'E'],\n" +
            "    'salary': [100, 100, 90, 80, 70],\n" +
            "})\n" +
            "df['rnk'] = df.groupby('dept')['salary'].rank(method='dense', ascending=False)\n" +
            "print(df[df['rnk'] == 2])"
        },
        {
          name: "drop_duplicates + sort + groupby().nth(1)",
          whenToUse: "You want the single second row per group and prefer positional selection.",
          logic:
            "**What it asks.** The same second-highest distinct salary, via distinct values and positional picking.\n\n" +
            "**Key idea.** Remove duplicate (dept, salary) pairs, sort each department high-to-low, then take the row at position 1 (0-indexed).\n\n" +
            "**Step by step.**\n" +
            "1. `drop_duplicates(['dept', 'salary'])` to collapse tied salaries.\n" +
            "2. `sort_values(['dept', 'salary'], ascending=[True, False])`.\n" +
            "3. `groupby('dept').nth(1)` for the second row per department.\n\n" +
            "**Why it works.** Dropping duplicates makes 'second row' equal 'second distinct value'; `nth(1)` grabs it positionally.\n\n" +
            "**Gotchas.**\n" +
            "- Skip `drop_duplicates` and `nth(1)` would return a duplicate of the top salary when the max is tied.\n" +
            "- `nth` is 0-indexed: position 1 is the second row.\n\n" +
            "**Interview mindset.** Offer this as the 'distinct-then-positional' alternative to ranking — same answer, different mental model.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'dept':   ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "    'name':   ['A', 'B', 'C', 'D', 'E'],\n" +
            "    'salary': [100, 100, 90, 80, 70],\n" +
            "})\n" +
            "distinct = df.drop_duplicates(['dept', 'salary'])            # collapse ties\n" +
            "ordered = distinct.sort_values(['dept', 'salary'], ascending=[True, False])\n" +
            "print(ordered.groupby('dept').nth(1))                        # 2nd row per dept",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'dept':   ['Eng', 'Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "    'name':   ['A', 'B', 'C', 'D', 'E'],\n" +
            "    'salary': [100, 100, 90, 80, 70],\n" +
            "})\n" +
            "distinct = df.drop_duplicates(['dept', 'salary'])\n" +
            "ordered = distinct.sort_values(['dept', 'salary'], ascending=[True, False])\n" +
            "print(ordered.groupby('dept').nth(1))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'second-highest', 'Nth largest per group', the classic SQL salary question.",
        "**Say it:** `groupby(k)[v].rank(method='dense', ascending=False) == N`.",
        "**Trap:** default rank skips ties — use `'dense'` for Nth-*distinct*."
      ],
      commonMistakes: [
        "Using the default rank method, which skips numbers after ties.",
        "Forgetting `drop_duplicates`, so tied top salaries pollute the 'second' row."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "cohort-retention-pivot",
      num: 5,
      title: "Cohort retention counts with pivot_table",
      difficulty: "Hard",
      category: "Real-World Analytics",
      importance: "common",
      meta: { pattern: "Cohort matrix", technique: "pivot_table of unique counts", functions: "pivot_table, nunique" },
      description:
        "Build a cohort-retention matrix: rows are the month a user first joined (`cohort_month`), columns are the month they were active (`active_month`), and each cell counts the **distinct users** from that cohort active in that month. `pivot_table` with `aggfunc='nunique'` and `fill_value=0` produces the grid in one call.",
      notes: [
        "`aggfunc='nunique'` counts distinct users so a user active twice in a month is counted once.",
        "`fill_value=0` replaces the `NaN`s for cohort/month combinations that never occurred."
      ],
      examples: [
        {
          input: "Jan cohort: 2 users; both active in Jan, one returns in Feb, one in Mar",
          output: "row 2024-01 = [2, 1, 1] across Jan/Feb/Mar",
          reasoning: "2 distinct users in month 0, then 1 distinct returner in each of the next two months."
        }
      ],
      approaches: [
        {
          name: "pivot_table(aggfunc='nunique', fill_value=0)",
          whenToUse: "Turning long event logs into a cohort x period retention grid.",
          logic:
            "**What it asks.** Count distinct users per (cohort_month, active_month) as a matrix.\n\n" +
            "**Key idea.** `pivot_table` reshapes long rows into a grid, and `aggfunc='nunique'` counts unique users per cell.\n\n" +
            "**Step by step.**\n" +
            "1. Put the cohort on `index` and the active period on `columns`.\n" +
            "2. Aggregate the user id with `aggfunc='nunique'`.\n" +
            "3. `fill_value=0` for empty cohort/month cells.\n\n" +
            "**Why it works.** `pivot_table` groups by the index/column pair and applies the aggregator, giving one distinct-user count per intersection.\n\n" +
            "**Gotchas.**\n" +
            "- Use `nunique`, not `count`, or duplicate activity inflates the numbers.\n" +
            "- Missing combinations are `NaN` without `fill_value=0`, which breaks later integer math.\n\n" +
            "**Interview mindset.** Frame it as 'reshape then count distinct' — cohort analysis is just a pivot with the right aggregator.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'user':         [1, 1, 2, 2, 3, 3, 3],\n" +
            "    'cohort_month': ['2024-01', '2024-01', '2024-01', '2024-01', '2024-02', '2024-02', '2024-02'],\n" +
            "    'active_month': ['2024-01', '2024-02', '2024-01', '2024-03', '2024-02', '2024-03', '2024-03'],\n" +
            "})\n" +
            "pivot = pd.pivot_table(df, index='cohort_month', columns='active_month',\n" +
            "                       values='user', aggfunc='nunique', fill_value=0)  # distinct users\n" +
            "print(pivot)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'user':         [1, 1, 2, 2, 3, 3, 3],\n" +
            "    'cohort_month': ['2024-01', '2024-01', '2024-01', '2024-01', '2024-02', '2024-02', '2024-02'],\n" +
            "    'active_month': ['2024-01', '2024-02', '2024-01', '2024-03', '2024-02', '2024-03', '2024-03'],\n" +
            "})\n" +
            "pivot = pd.pivot_table(df, index='cohort_month', columns='active_month',\n" +
            "                       values='user', aggfunc='nunique', fill_value=0)\n" +
            "print(pivot)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'cohort', 'retention', 'users active by month joined', a matrix of counts.",
        "**Say it:** `pivot_table(index=cohort, columns=period, values=user, aggfunc='nunique', fill_value=0)`.",
        "**Trap:** `count` double-counts repeat activity — use `nunique`."
      ],
      commonMistakes: [
        "Using `count` instead of `nunique` and inflating retention.",
        "Leaving NaN cells (no `fill_value`) that break downstream integer math."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "top-category-per-region",
      num: 6,
      title: "Top category by revenue per region",
      difficulty: "Medium",
      category: "Real-World Analytics",
      importance: "common",
      meta: { pattern: "Argmax-per-group", technique: "groupby idxmax / sort + drop_duplicates", functions: "groupby, sum, idxmax, sort_values, drop_duplicates" },
      description:
        "For each region, find the single category with the highest total revenue. Aggregate revenue by (region, category), then use `idxmax` **within each region** to grab the index of its top category and select those rows.",
      notes: [
        "`groupby('region')['revenue'].idxmax()` returns the row label of the max per region; use it with `.loc` to pull the winning rows.",
        "An alternative — sort descending then `drop_duplicates('region')` — keeps the first (largest) row per region."
      ],
      examples: [
        {
          input: "East: Books 500, Toys 300, Games 700",
          output: "East -> Games (700)",
          reasoning: "Games has the highest total revenue in the East region."
        }
      ],
      approaches: [
        {
          name: "aggregate then groupby().idxmax()",
          whenToUse: "You need the argmax row (which category wins), not just the max value.",
          logic:
            "**What it asks.** The top-revenue category for each region — one winning row per region.\n\n" +
            "**Key idea.** `idxmax` gives the **index of the maximum**; run it per region to find each winner's row.\n\n" +
            "**Step by step.**\n" +
            "1. Aggregate: `df.groupby(['region', 'category'], as_index=False)['revenue'].sum()`.\n" +
            "2. Per region, get the winning row label: `g.groupby('region')['revenue'].idxmax()`.\n" +
            "3. Select those rows with `g.loc[...]`.\n\n" +
            "**Why it works.** `idxmax` returns a label, not a value, so `.loc` retrieves the full winning row — category included.\n\n" +
            "**Gotchas.**\n" +
            "- `max` gives the value only; you need `idxmax` to know *which* category won.\n" +
            "- Ties resolve to the first occurrence — mention it if ties matter.\n\n" +
            "**Interview mindset.** Stress 'idxmax returns the label, then .loc pulls the row' — that's the argmax-per-group idiom.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'region':   ['East', 'East', 'East', 'West', 'West', 'West'],\n" +
            "    'category': ['Books', 'Toys', 'Games', 'Books', 'Toys', 'Games'],\n" +
            "    'revenue':  [500, 300, 700, 200, 900, 400],\n" +
            "})\n" +
            "g = df.groupby(['region', 'category'], as_index=False)['revenue'].sum()\n" +
            "top = g.loc[g.groupby('region')['revenue'].idxmax()]   # winning row per region\n" +
            "print(top)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'region':   ['East', 'East', 'East', 'West', 'West', 'West'],\n" +
            "    'category': ['Books', 'Toys', 'Games', 'Books', 'Toys', 'Games'],\n" +
            "    'revenue':  [500, 300, 700, 200, 900, 400],\n" +
            "})\n" +
            "g = df.groupby(['region', 'category'], as_index=False)['revenue'].sum()\n" +
            "top = g.loc[g.groupby('region')['revenue'].idxmax()]\n" +
            "print(top)"
        },
        {
          name: "sort_values then drop_duplicates('region')",
          whenToUse: "A quick one-liner when you just want the top row per group.",
          logic:
            "**What it asks.** The same per-region winner, via sort-and-dedupe.\n\n" +
            "**Key idea.** Sort by revenue descending, then keep the first row seen for each region.\n\n" +
            "**Step by step.**\n" +
            "1. Aggregate to (region, category) totals.\n" +
            "2. `sort_values('revenue', ascending=False)`.\n" +
            "3. `drop_duplicates('region')` — the first (largest) row per region survives.\n\n" +
            "**Why it works.** `drop_duplicates` keeps the first occurrence, and after a descending sort that's the maximum.\n\n" +
            "**Gotchas.**\n" +
            "- Must sort **before** dropping duplicates, or you keep an arbitrary row.\n" +
            "- Output row order follows the sort, not the original order — re-sort if needed.\n\n" +
            "**Interview mindset.** Offer this as the terse alternative, but note `idxmax` reads more clearly as 'the max per group'.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'region':   ['East', 'East', 'East', 'West', 'West', 'West'],\n" +
            "    'category': ['Books', 'Toys', 'Games', 'Books', 'Toys', 'Games'],\n" +
            "    'revenue':  [500, 300, 700, 200, 900, 400],\n" +
            "})\n" +
            "top = (df.groupby(['region', 'category'], as_index=False)['revenue'].sum()\n" +
            "         .sort_values('revenue', ascending=False)   # largest first\n" +
            "         .drop_duplicates('region'))                # keep first per region\n" +
            "print(top)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({\n" +
            "    'region':   ['East', 'East', 'East', 'West', 'West', 'West'],\n" +
            "    'category': ['Books', 'Toys', 'Games', 'Books', 'Toys', 'Games'],\n" +
            "    'revenue':  [500, 300, 700, 200, 900, 400],\n" +
            "})\n" +
            "top = (df.groupby(['region', 'category'], as_index=False)['revenue'].sum()\n" +
            "         .sort_values('revenue', ascending=False)\n" +
            "         .drop_duplicates('region'))\n" +
            "print(top)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'top category per region', 'best-selling per store', argmax within a group.",
        "**Say it:** aggregate, then `groupby(g)[v].idxmax()` + `.loc`; or sort desc + `drop_duplicates`.",
        "**Trap:** `max` gives the value; you need `idxmax` for the winning label."
      ],
      commonMistakes: [
        "Using `max` (the value) when you need `idxmax` (the row).",
        "Running `drop_duplicates` before sorting, keeping an arbitrary row."
      ]
    }

  ]);
})();
