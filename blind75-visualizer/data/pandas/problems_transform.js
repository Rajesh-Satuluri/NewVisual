/*
 * Pandas Interview Lab — Transform & Apply
 * =========================================================================
 * Follows the SCHEMA and LOGIC format defined in problems_selection.js.
 *
 * Registers on the global registry:
 *     window.PANDAS.register("Transform & Apply", [ ...problems ]);
 *
 * Every rcs/plain snippet is self-contained runnable pandas (starts with
 * `import pandas as pd`, adds numpy where needed) and prints output. Sticks to
 * stable pandas 2.x core APIs (assign, np.where, np.select, pd.cut, map, apply,
 * rank, groupby) so it also runs under the browser's Pyodide pandas. Every
 * snippet was executed and its output verified before commit.
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Transform & Apply", [

    // ------------------------------------------------------------------ Q1
    {
      id: "derived-column-vectorized",
      num: 1,
      title: "Add a derived column with a vectorized expression",
      difficulty: "Easy",
      category: "Transform & Apply",
      importance: "essential",
      meta: { pattern: "New column", technique: "Vectorized arithmetic", functions: "df['new']=, DataFrame.assign" },
      description:
        "Create a new column from existing ones with a single vectorized expression — compute `total = price * qty`. Either assign in place with `df['total'] = ...` or return a new frame with `df.assign(total=...)`.",
      notes: [
        "Column arithmetic is element-wise and index-aligned — no loops needed.",
        "`df.assign(...)` returns a copy (chainable); `df['new'] = ...` mutates in place."
      ],
      examples: [
        {
          input: "price = [100, 200, 50], qty = [2, 3, 4]",
          output: "total = [200, 600, 200]",
          reasoning: "Each row multiplies price by qty in one vectorized pass."
        }
      ],
      approaches: [
        {
          name: "df['new'] = expr  /  df.assign",
          whenToUse: "Any column that is a formula over other columns.",
          logic:
            "**What it asks.** Add a column whose values come from a formula over existing columns.\n\n" +
            "**Key idea.** Arithmetic on columns is vectorized: `df['price'] * df['qty']` computes the whole column at once, aligned on the index.\n\n" +
            "**Step by step.**\n" +
            "1. Write the expression over columns: `df['price'] * df['qty']`.\n" +
            "2. Assign it: `df['total'] = ...` (in place) or `df.assign(total=...)` (returns a copy).\n\n" +
            "**Why it works.** pandas pushes the operation to C over the whole array, and the index alignment guarantees each row pairs with its own values.\n\n" +
            "**Gotchas.**\n" +
            "- `assign` cannot reference a column it is creating in the same call; chain a second `assign` for that.\n" +
            "- Mixing frames with different indexes aligns on labels and can inject `NaN`.\n\n" +
            "**Interview mindset.** Reach for a vectorized expression first — say 'no apply needed, it's just column arithmetic.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'price': [100, 200, 50],\n" +
            "                   'qty': [2, 3, 4]})\n" +
            "df['total'] = df['price'] * df['qty']   # vectorized, element-wise\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'price': [100, 200, 50],\n" +
            "                   'qty': [2, 3, 4]})\n" +
            "df['total'] = df['price'] * df['qty']\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'add a column that is A times/plus B', a computed field.",
        "**Say it:** `df['new'] = df['a'] * df['b']` — vectorized, no loop.",
        "**Trap:** `assign` can't see a column it's creating in the same call."
      ],
      commonMistakes: [
        "Looping over rows to fill a column instead of a vectorized expression.",
        "Referencing a just-created column inside the same `assign` call."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "conditional-column-np-where",
      num: 2,
      title: "Conditional column with np.where (two-way)",
      difficulty: "Easy",
      category: "Transform & Apply",
      importance: "essential",
      meta: { pattern: "If/else column", technique: "np.where", functions: "numpy.where" },
      description:
        "Build a column with two possible values based on a condition: label each `score` as `pass` when it is at least 60, otherwise `fail`. `np.where(cond, a, b)` picks `a` where the condition is `True` and `b` elsewhere.",
      notes: [
        "`np.where` is the vectorized ternary: one condition, two outcomes.",
        "For three or more branches, reach for `np.select` or `pd.cut` instead."
      ],
      examples: [
        {
          input: "score = [82, 47, 65]",
          output: "result = ['pass', 'fail', 'pass']",
          reasoning: "The mask [True, False, True] selects 'pass' where True, 'fail' where False."
        }
      ],
      approaches: [
        {
          name: "np.where(cond, a, b)",
          whenToUse: "Exactly two outcomes chosen by one boolean condition.",
          logic:
            "**What it asks.** Assign one of two labels per row based on a threshold.\n\n" +
            "**Key idea.** `np.where(cond, a, b)` is a vectorized if/else — it returns `a` wherever `cond` is `True` and `b` wherever it is `False`.\n\n" +
            "**Step by step.**\n" +
            "1. Build the condition: `df['score'] >= 60`.\n" +
            "2. `df['result'] = np.where(cond, 'pass', 'fail')`.\n\n" +
            "**Why it works.** The condition is a boolean array; `np.where` selects element-wise between the two choices in one C-level pass.\n\n" +
            "**Gotchas.**\n" +
            "- Only two branches — nesting `np.where` inside `np.where` gets unreadable fast; switch to `np.select`.\n" +
            "- `NaN` in the condition column makes the comparison `False`, so those rows take the `b` branch.\n\n" +
            "**Interview mindset.** Say 'vectorized if/else with `np.where`' — cleaner and faster than an `apply` with a lambda.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'score': [82, 47, 65]})\n" +
            "df['result'] = np.where(df['score'] >= 60, 'pass', 'fail')  # if/else\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'score': [82, 47, 65]})\n" +
            "df['result'] = np.where(df['score'] >= 60, 'pass', 'fail')\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'if condition then X else Y', a two-value flag column.",
        "**Say it:** `np.where(cond, a, b)` — vectorized ternary.",
        "**Trap:** more than two outcomes? use `np.select`, don't nest where."
      ],
      commonMistakes: [
        "Nesting many `np.where` calls instead of `np.select`.",
        "Using a slow row-wise `apply` for what is a simple two-way choice."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "multiway-bucketing-np-select",
      num: 3,
      title: "Multi-way bucketing with np.select or pd.cut",
      difficulty: "Hard",
      category: "Transform & Apply",
      importance: "common",
      meta: { pattern: "Multi-branch column", technique: "np.select / pd.cut", functions: "numpy.select, pandas.cut" },
      description:
        "Assign a letter grade from a numeric `score` across several bands (A/B/C/F). Use `np.select` with a list of conditions and matching choices (plus a `default`), or `pd.cut` with explicit `bins` and `labels`.",
      notes: [
        "`np.select(condlist, choicelist, default=...)` picks the first condition that matches, in order.",
        "`pd.cut(x, bins, labels)` slices a continuous range into ordered, labeled intervals."
      ],
      examples: [
        {
          input: "score = [95, 82, 67, 40]",
          output: "grade = ['A', 'B', 'C', 'F']",
          reasoning: "95>=90 -> A; 82>=70 -> B; 67>=50 -> C; 40 falls to the default F."
        }
      ],
      approaches: [
        {
          name: "np.select (condition list)",
          whenToUse: "Several arbitrary conditions, evaluated top-to-bottom with a fallback.",
          logic:
            "**What it asks.** Map a number into one of many labeled buckets.\n\n" +
            "**Key idea.** `np.select` takes parallel lists of conditions and choices; for each row it uses the choice of the **first** condition that is `True`, falling back to `default`.\n\n" +
            "**Step by step.**\n" +
            "1. List conditions, most specific / highest first: `[s>=90, s>=70, s>=50]`.\n" +
            "2. List the matching labels: `['A', 'B', 'C']`.\n" +
            "3. `np.select(conds, choices, default='F')`.\n\n" +
            "**Why it works.** Order matters — because it takes the first match, descending thresholds naturally carve non-overlapping bands.\n\n" +
            "**Gotchas.**\n" +
            "- `condlist` and `choicelist` must be the same length, or it errors.\n" +
            "- Get the order wrong (ascending) and every row matches the loosest condition first.\n\n" +
            "**Interview mindset.** Call it 'the multi-branch case statement' — cleaner than nested `np.where`.",
          rcs:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'score': [95, 82, 67, 40]})\n" +
            "conds = [df['score'] >= 90, df['score'] >= 70, df['score'] >= 50]\n" +
            "choices = ['A', 'B', 'C']\n" +
            "df['grade'] = np.select(conds, choices, default='F')  # first match wins\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "import numpy as np\n" +
            "\n" +
            "df = pd.DataFrame({'score': [95, 82, 67, 40]})\n" +
            "conds = [df['score'] >= 90, df['score'] >= 70, df['score'] >= 50]\n" +
            "choices = ['A', 'B', 'C']\n" +
            "df['grade'] = np.select(conds, choices, default='F')\n" +
            "print(df)"
        },
        {
          name: "pd.cut (bins + labels)",
          whenToUse: "Bucketing a continuous quantity into contiguous, ordered ranges.",
          logic:
            "**What it asks.** Slice a numeric range into labeled intervals.\n\n" +
            "**Key idea.** `pd.cut` defines cut points (`bins`) and one `label` per interval; each value lands in the band that contains it.\n\n" +
            "**Step by step.**\n" +
            "1. Choose edges covering the range: `bins=[0, 50, 70, 90, 100]`.\n" +
            "2. Give N-1 labels for the N-1 intervals: `labels=['F', 'C', 'B', 'A']`.\n" +
            "3. `pd.cut(df['score'], bins=bins, labels=labels)`.\n\n" +
            "**Why it works.** `cut` maps each value to its interval by binary search, producing an ordered categorical.\n\n" +
            "**Gotchas.**\n" +
            "- Intervals are right-closed by default `(a, b]`; the leftmost edge is exclusive, so pick edges carefully.\n" +
            "- Values outside every bin become `NaN`.\n\n" +
            "**Interview mindset.** Prefer `cut` when the buckets are ranges of one number; prefer `np.select` for arbitrary conditions.",
          perfNote: "pd.cut returns an ordered Categorical, which is memory-cheap and sorts by band, not alphabetically.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'score': [95, 82, 67, 40]})\n" +
            "df['grade'] = pd.cut(df['score'], bins=[0, 50, 70, 90, 100],\n" +
            "                     labels=['F', 'C', 'B', 'A'])   # right-closed bands\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'score': [95, 82, 67, 40]})\n" +
            "df['grade'] = pd.cut(df['score'], bins=[0, 50, 70, 90, 100],\n" +
            "                     labels=['F', 'C', 'B', 'A'])\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'bucket into tiers/grades/age groups', multiple thresholds.",
        "**Say it:** `np.select(conds, choices, default=...)` or `pd.cut(x, bins, labels)`.",
        "**Trap:** np.select takes the FIRST true condition — order thresholds descending."
      ],
      commonMistakes: [
        "Ordering np.select conditions ascending so the loosest matches everyone.",
        "Giving pd.cut the wrong count of labels (need one fewer than edges)."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "map-categorical-dict",
      num: 4,
      title: "Map categorical values via Series.map with a dict",
      difficulty: "Easy",
      category: "Transform & Apply",
      importance: "common",
      meta: { pattern: "Value remap", technique: "Series.map(dict)", functions: "Series.map" },
      description:
        "Translate short codes into full labels with a lookup dictionary — turn country codes like `US`/`IN`/`FR` into their names. `Series.map(mapping)` replaces each value by its dictionary entry; unmatched keys become `NaN`.",
      notes: [
        "`map` with a dict is a fast vectorized lookup — no `apply` needed.",
        "Keys not present in the dict produce `NaN`; guard with `.fillna(...)` if needed."
      ],
      examples: [
        {
          input: "code = ['US', 'IN', 'FR', 'US']",
          output: "country = ['United States', 'India', 'France', 'United States']",
          reasoning: "Each code is looked up in the dict and replaced by its value."
        }
      ],
      approaches: [
        {
          name: "Series.map(dict)",
          whenToUse: "One-to-one replacement of category values from a known lookup.",
          logic:
            "**What it asks.** Replace each coded value with its human-readable label.\n\n" +
            "**Key idea.** `Series.map(mapping)` looks up every element in the dict and substitutes the value.\n\n" +
            "**Step by step.**\n" +
            "1. Build the lookup dict: `{'US': 'United States', ...}`.\n" +
            "2. `df['country'] = df['code'].map(names)`.\n" +
            "3. Optionally `.fillna('Unknown')` for codes missing from the dict.\n\n" +
            "**Why it works.** `map` is a vectorized hash lookup over the Series, far faster than a per-row `apply`.\n\n" +
            "**Gotchas.**\n" +
            "- A value absent from the dict becomes `NaN`, not the original — use `.fillna` to keep a fallback.\n" +
            "- `map` is for element replacement; use `.replace` when you only want to change some values and keep the rest.\n\n" +
            "**Interview mindset.** Say 'dictionary map' — the idiomatic, vectorized way to recode categories.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'code': ['US', 'IN', 'FR', 'US']})\n" +
            "names = {'US': 'United States', 'IN': 'India', 'FR': 'France'}\n" +
            "df['country'] = df['code'].map(names)   # dict lookup per element\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'code': ['US', 'IN', 'FR', 'US']})\n" +
            "names = {'US': 'United States', 'IN': 'India', 'FR': 'France'}\n" +
            "df['country'] = df['code'].map(names)\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'translate codes to names', 'recode categories', a lookup table.",
        "**Say it:** `df['c'].map({...})` — vectorized dict lookup.",
        "**Trap:** unmapped keys become NaN; `.replace` keeps unlisted values."
      ],
      commonMistakes: [
        "Expecting unmapped values to stay unchanged (they become NaN).",
        "Using a row-wise `apply` for a plain dictionary lookup."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "apply-axis1-vs-vectorize",
      num: 5,
      title: "Row-wise apply vs vectorization — and why to prefer vectorizing",
      difficulty: "Medium",
      category: "Transform & Apply",
      importance: "essential",
      meta: { pattern: "Row function", technique: "apply(axis=1) vs vectorized", functions: "DataFrame.apply" },
      description:
        "You can compute across a row with `df.apply(func, axis=1)`, but it calls a Python function once per row and is slow. The same result usually comes from a vectorized column expression that runs in C. Compute `price * qty` both ways and confirm they match.",
      notes: [
        "`axis=1` hands each row (as a Series) to your function — flexible but row-by-row in Python.",
        "Prefer vectorized column arithmetic; reserve `apply(axis=1)` for logic that truly can't be vectorized."
      ],
      examples: [
        {
          input: "price = [100, 200, 50], qty = [2, 3, 4]",
          output: "both give [200, 600, 200]; equal is True",
          reasoning: "The row-wise apply and the vectorized product produce identical values."
        }
      ],
      approaches: [
        {
          name: "apply(axis=1) vs vectorized product",
          whenToUse: "Know both; default to the vectorized form for speed.",
          logic:
            "**What it asks.** Produce a per-row value and understand why vectorizing beats `apply`.\n\n" +
            "**Key idea.** `apply(axis=1)` loops in Python (one call per row); a column expression does the whole thing in one compiled pass.\n\n" +
            "**Step by step.**\n" +
            "1. Slow way: `df.apply(lambda r: r['price'] * r['qty'], axis=1)`.\n" +
            "2. Fast way: `df['price'] * df['qty']`.\n" +
            "3. Verify they agree: `slow.equals(fast)`.\n\n" +
            "**Why it works.** Both compute the same arithmetic; only the vectorized form avoids the per-row Python overhead, so it scales to large frames.\n\n" +
            "**Gotchas.**\n" +
            "- `apply(axis=1)` can be orders of magnitude slower on big data — it is a Python loop in disguise.\n" +
            "- Reach for it only when the row logic genuinely resists vectorization (e.g. calling an external API).\n\n" +
            "**Interview mindset.** State the rule: 'try vectorized first; `apply(axis=1)` is the fallback, not the default.'",
          perfNote: "apply(axis=1) builds a Series per row and calls Python each time — typically 10-100x slower than the vectorized op.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'price': [100, 200, 50],\n" +
            "                   'qty': [2, 3, 4]})\n" +
            "slow = df.apply(lambda r: r['price'] * r['qty'], axis=1)  # per-row Python\n" +
            "fast = df['price'] * df['qty']                            # one C-level op\n" +
            "print(fast.tolist())\n" +
            "print(slow.equals(fast))                                  # same result",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'price': [100, 200, 50],\n" +
            "                   'qty': [2, 3, 4]})\n" +
            "slow = df.apply(lambda r: r['price'] * r['qty'], axis=1)\n" +
            "fast = df['price'] * df['qty']\n" +
            "print(fast.tolist())\n" +
            "print(slow.equals(fast))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'apply a function to each row', a lambda over multiple columns.",
        "**Say it:** try `df['a'] * df['b']` first; `apply(axis=1)` only if it can't vectorize.",
        "**Trap:** apply(axis=1) is a Python loop — slow on large frames."
      ],
      commonMistakes: [
        "Defaulting to `apply(axis=1)` when a column expression would do.",
        "Confusing `axis=0` (down columns) with `axis=1` (across a row)."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "rank-within-group",
      num: 6,
      title: "Rank rows, including within groups",
      difficulty: "Medium",
      category: "Transform & Apply",
      importance: "common",
      meta: { pattern: "Ranking", technique: "Series.rank / groupby.rank", functions: "Series.rank, DataFrame.groupby" },
      description:
        "Assign a rank by a numeric column — highest gets rank 1 — with `Series.rank(method='dense', ascending=False)`. To rank *within* each group (e.g. salary rank inside each department), rank on a `groupby` column.",
      notes: [
        "`method='dense'` gives ties the same rank with no gaps (1, 1, 2 rather than 1, 1, 3).",
        "`ascending=False` makes the largest value rank 1; combine with `groupby` for per-group ranks."
      ],
      examples: [
        {
          input: "dept=[Eng,Eng,Sales,Sales], salary=[120,150,90,90]",
          output: "rank = [2, 1, 1, 1] within each dept",
          reasoning: "Within Eng, 150 ranks 1 and 120 ranks 2; the two equal Sales salaries tie at 1."
        }
      ],
      approaches: [
        {
          name: "Series.rank (whole column)",
          whenToUse: "A single ordering across all rows.",
          logic:
            "**What it asks.** Number rows by a value, biggest first, sharing ranks on ties.\n\n" +
            "**Key idea.** `rank` assigns an ordinal position; `method='dense'` keeps ties equal with no gaps, `ascending=False` puts the largest at rank 1.\n\n" +
            "**Step by step.**\n" +
            "1. `df['score'].rank(method='dense', ascending=False)`.\n" +
            "2. Cast to int if you want whole-number ranks: `.astype(int)`.\n\n" +
            "**Why it works.** `rank` sorts values internally and maps each to its position, resolving ties by the chosen `method`.\n\n" +
            "**Gotchas.**\n" +
            "- Default `method='average'` gives ties a fractional rank (1.5) — pick `'dense'` or `'min'` deliberately.\n" +
            "- `rank` returns floats; `.astype(int)` is safe only once you know there are no NaNs.\n\n" +
            "**Interview mindset.** Name the `method`: 'dense' for no gaps, 'min' for competition-style ranking.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'score': [90, 90, 70, 85]})\n" +
            "df['rank'] = df['score'].rank(method='dense', ascending=False).astype(int)\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'score': [90, 90, 70, 85]})\n" +
            "df['rank'] = df['score'].rank(method='dense', ascending=False).astype(int)\n" +
            "print(df)"
        },
        {
          name: "groupby(...).rank (per group)",
          whenToUse: "Rank restarts within each category — 'top earner per department'.",
          logic:
            "**What it asks.** Rank rows separately inside each group so every group starts at 1.\n\n" +
            "**Key idea.** `df.groupby('dept')['salary'].rank(...)` computes the rank independently within each group, returning a Series aligned to the original rows.\n\n" +
            "**Step by step.**\n" +
            "1. Group and rank: `df.groupby('dept')['salary'].rank(method='dense', ascending=False)`.\n" +
            "2. Assign it back as a column.\n\n" +
            "**Why it works.** `groupby().rank` applies the ranking per group but keeps the original index, so it lines up as a new column without a merge.\n\n" +
            "**Gotchas.**\n" +
            "- The result stays aligned to the rows — do not sort in between and expect it to still match.\n" +
            "- Ties within a group follow the same `method` rule (here both Sales salaries share rank 1).\n\n" +
            "**Interview mindset.** 'Rank within group' = `groupby(key)[value].rank(...)` — the transform pattern that returns row-aligned output.",
          perfNote: "groupby().rank is vectorized per group and returns a row-aligned Series — no manual merge back needed.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'salary': [120, 150, 90, 90]})\n" +
            "df['rank'] = (df.groupby('dept')['salary']\n" +
            "                .rank(method='dense', ascending=False).astype(int))  # per dept\n" +
            "print(df)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales', 'Sales'],\n" +
            "                   'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'salary': [120, 150, 90, 90]})\n" +
            "df['rank'] = (df.groupby('dept')['salary']\n" +
            "                .rank(method='dense', ascending=False).astype(int))\n" +
            "print(df)"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'rank by', 'top N per group', 'position within department'.",
        "**Say it:** `s.rank(method='dense', ascending=False)`; per group via `groupby(k)[v].rank(...)`.",
        "**Trap:** default method='average' yields fractional ranks on ties."
      ],
      commonMistakes: [
        "Leaving the default `method='average'` and getting 1.5-style ranks.",
        "Sorting the frame after a groupby rank and breaking the row alignment."
      ]
    }

  ]);
})();
