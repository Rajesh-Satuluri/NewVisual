/*
 * Pandas Interview Lab — Selection & Filtering
 * =========================================================================
 * FORMAT REFERENCE for every other Pandas practice file.
 *
 * Each file registers its problems on the global registry:
 *     window.PANDAS.register("Category Name", [ ...problems ]);
 *
 * PROBLEM SCHEMA (all fields required unless marked optional):
 * {
 *   id:          "kebab-case-unique-id",
 *   num:         1,                        // question number (Q#)
 *   title:       "Filter rows by a condition",
 *   difficulty:  "Easy" | "Medium" | "Hard",
 *   category:    "Selection & Filtering",  // must match register() key
 *   importance:  "essential" | "common" | "occasional",  // optional, default "common"
 *   meta: { pattern, technique, functions },  // short strings: badges + search
 *   description: "markdown — faithful PARAPHRASE of the task, never verbatim",
 *   notes:       ["markdown line", ...],   // optional
 *   examples: [ { input, output, reasoning } ],   // 1–2, concrete values
 *   approaches: [                          // 1–2; add a 2nd ONLY for a real contrast
 *     { name, whenToUse, logic, perfNote?, rcs, plain }  // rcs = commented; plain = clean
 *   ],                                     // rcs & plain MUST be runnable pandas that prints
 *   recognizeRecall: ["merged cue: how to spot it + what to say", ...],  // optional
 *   commonMistakes:  ["one-line pitfall", ...]  // optional
 * }
 *
 * IMPORTANT: rcs/plain code must be self-contained runnable pandas (start with
 * `import pandas as pd`, add numpy if needed) and print something, so the
 * in-browser Run button works. Stick to STABLE pandas 2.x core APIs so the code
 * also runs under the browser's Pyodide pandas — no removed/deprecated calls
 * (no df.append, no .ix). Every snippet was executed against pandas before commit.
 *
 * LOGIC format (bold lead-ins, omit a section only if it truly doesn't apply):
 * **What it asks.** → **Key idea.** → **Step by step.** (numbered) →
 * **Why it works.** → **Gotchas.** (bullets) → **Interview mindset.**
 * =========================================================================
 */
(function () {
  window.PANDAS.register("Selection & Filtering", [

    // ------------------------------------------------------------------ Q1
    {
      id: "boolean-mask-filter",
      num: 1,
      title: "Filter rows with a boolean mask",
      difficulty: "Easy",
      category: "Selection & Filtering",
      importance: "essential",
      meta: { pattern: "Row filter", technique: "Boolean indexing", functions: "df[mask], comparison" },
      description:
        "Keep only the rows that satisfy a condition — return every employee whose `salary` is greater than 100. A boolean Series (`df['salary'] > 100`) indexes the DataFrame, keeping the `True` rows.",
      notes: [
        "The mask is a boolean Series aligned to the index; `df[mask]` keeps rows where it is `True`.",
        "`df.loc[mask]` is equivalent and extends to selecting columns at the same time."
      ],
      examples: [
        {
          input: "salary = [120, 90, 150]",
          output: "rows with 120 and 150",
          reasoning: "The mask [True, False, True] keeps the first and third rows."
        }
      ],
      approaches: [
        {
          name: "boolean mask",
          whenToUse: "Any single-column row condition — the everyday filter.",
          logic:
            "**What it asks.** Return the subset of rows meeting a numeric condition.\n\n" +
            "**Key idea.** Comparing a column produces a boolean Series; passing it to `df[...]` selects the `True` rows.\n\n" +
            "**Step by step.**\n" +
            "1. Build the mask: `df['salary'] > 100`.\n" +
            "2. Index with it: `df[mask]` (or `df.loc[mask]`).\n\n" +
            "**Why it works.** The boolean Series is index-aligned to the frame, so pandas keeps exactly the matching rows.\n\n" +
            "**Gotchas.**\n" +
            "- Comparisons treat `NaN` as `False`, so null rows are dropped.\n" +
            "- `df.loc[mask]` also lets you pick columns: `df.loc[mask, 'name']`.\n\n" +
            "**Interview mindset.** Say 'boolean mask' — the same idea powers every filter, including SQL's `WHERE`.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "mask = df['salary'] > 100          # boolean Series aligned to the index\n" +
            "print(df[mask])                    # keep the True rows",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "print(df[df['salary'] > 100])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'rows where…', 'only the ones that…', a single WHERE-style condition.",
        "**Say it:** `df[df['col'] > k]` — a boolean mask keeps the True rows.",
        "**Trap:** NaN comparisons are False, so nulls drop out."
      ],
      commonMistakes: [
        "Using Python `and`/`or` between conditions instead of `&`/`|`.",
        "Forgetting NaN rows silently fail the comparison and disappear."
      ]
    },

    // ------------------------------------------------------------------ Q2
    {
      id: "combine-conditions",
      num: 2,
      title: "Combine multiple conditions",
      difficulty: "Easy",
      category: "Selection & Filtering",
      importance: "essential",
      meta: { pattern: "Compound filter", technique: "& | ~ with parentheses", functions: "df[(m1) & (m2)]" },
      description:
        "Filter on two conditions at once: employees in the `Eng` department **and** earning more than 100. Combine masks with `&` / `|` / `~` — and remember each condition needs its own parentheses.",
      notes: [
        "Use `&` (and), `|` (or), `~` (not) — the bitwise operators — never Python's `and`/`or`.",
        "Operator precedence means each comparison must be wrapped: `(a) & (b)`."
      ],
      examples: [
        {
          input: "dept = ['Eng','Eng','Sales'], salary = [120, 90, 150]",
          output: "only the first row (Eng & >100)",
          reasoning: "Row 0 is Eng and 120>100; row 1 fails salary; row 2 is not Eng."
        }
      ],
      approaches: [
        {
          name: "& / | with parentheses",
          whenToUse: "Any filter with more than one condition.",
          logic:
            "**What it asks.** Keep rows meeting two conditions simultaneously.\n\n" +
            "**Key idea.** Build one boolean Series per condition and combine them with the **bitwise** operators.\n\n" +
            "**Step by step.**\n" +
            "1. `(df['dept'] == 'Eng')`.\n" +
            "2. `(df['salary'] > 100)`.\n" +
            "3. Combine: `df[(cond1) & (cond2)]`.\n\n" +
            "**Why it works.** `&`/`|` operate element-wise on the boolean Series; parentheses force the comparisons to evaluate before the combine.\n\n" +
            "**Gotchas.**\n" +
            "- `and`/`or` raise `ValueError: truth value of a Series is ambiguous` — use `&`/`|`.\n" +
            "- Without parentheses, `&` binds tighter than `>` and you get a cryptic error.\n\n" +
            "**Interview mindset.** State the rule up front: 'bitwise operators, each condition parenthesized.'",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "mask = (df['dept'] == 'Eng') & (df['salary'] > 100)   # each cond in ()\n" +
            "print(df[mask])",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "print(df[(df['dept'] == 'Eng') & (df['salary'] > 100)])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'A and B', 'either X or Y', multi-part filters.",
        "**Say it:** `df[(c1) & (c2)]` — bitwise operators, parentheses on each.",
        "**Trap:** `and`/`or` throw the 'ambiguous truth value' error."
      ],
      commonMistakes: [
        "Writing `df[df.a > 1 and df.b < 2]` (raises ValueError).",
        "Omitting parentheses, so `&` binds before the comparison."
      ]
    },

    // ------------------------------------------------------------------ Q3
    {
      id: "isin-membership",
      num: 3,
      title: "Filter by membership in a list",
      difficulty: "Easy",
      category: "Selection & Filtering",
      importance: "common",
      meta: { pattern: "Membership filter", technique: "isin / ~isin", functions: "Series.isin" },
      description:
        "Keep rows whose `dept` is one of a set of values — `Eng` or `Data` — using `isin`. Negate with `~` to exclude a set instead.",
      examples: [
        {
          input: "dept = ['Eng','Sales','Data','HR']; keep ['Eng','Data']",
          output: "rows for Eng and Data",
          reasoning: "isin(['Eng','Data']) is True for those two rows."
        }
      ],
      approaches: [
        {
          name: "isin (and its negation)",
          whenToUse: "Matching a column against a fixed allow-list or block-list.",
          logic:
            "**What it asks.** Keep rows whose category is in a given set.\n\n" +
            "**Key idea.** `df['dept'].isin(values)` is a clean membership test returning a boolean Series.\n\n" +
            "**Step by step.**\n" +
            "1. List the allowed values.\n" +
            "2. `mask = df['dept'].isin(['Eng', 'Data'])`.\n" +
            "3. `df[mask]` — or `df[~mask]` to exclude them.\n\n" +
            "**Why it works.** `isin` checks each element against the set in one vectorized pass.\n\n" +
            "**Gotchas.**\n" +
            "- Matching is exact and case-sensitive — normalize with `.str.lower()` if the data is messy.\n" +
            "- Pass a list/set, not a bare string (a string would test character membership).\n\n" +
            "**Interview mindset.** Reach for `isin` instead of chaining `==` with `|`.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Sales', 'Data', 'HR']})\n" +
            "mask = df['dept'].isin(['Eng', 'Data'])   # membership test\n" +
            "print(df[mask])\n" +
            "print(df[~mask])                          # ~ negates: everything else",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Sales', 'Data', 'HR']})\n" +
            "print(df[df['dept'].isin(['Eng', 'Data'])])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'in this set', 'one of these categories', 'exclude these'.",
        "**Say it:** `df[df['c'].isin([...])]`; negate with `~`.",
        "**Trap:** case-sensitive; pass a list, not a string."
      ],
      commonMistakes: [
        "Chaining `(c=='a') | (c=='b') | ...` instead of `isin`.",
        "Passing a string to isin and testing characters by accident."
      ]
    },

    // ------------------------------------------------------------------ Q4
    {
      id: "loc-rows-and-columns",
      num: 4,
      title: "Select rows and columns together with .loc",
      difficulty: "Easy",
      category: "Selection & Filtering",
      importance: "essential",
      meta: { pattern: "Slice + project", technique: ".loc[mask, cols]", functions: "DataFrame.loc" },
      description:
        "In one step, filter rows **and** pick specific columns: return the `name` and `salary` of everyone earning over 100, using `df.loc[mask, ['name', 'salary']]`.",
      notes: [
        "`.loc` takes `[row_selector, column_selector]` — labels, masks, or slices.",
        "This avoids the chained-indexing `df[mask][cols]` that can trigger `SettingWithCopyWarning`."
      ],
      examples: [
        {
          input: "columns name/dept/salary; keep salary>100, cols [name, salary]",
          output: "a 2-column frame of matching rows",
          reasoning: "The row mask filters; the column list projects — in a single .loc call."
        }
      ],
      approaches: [
        {
          name: ".loc[rows, cols]",
          whenToUse: "Whenever you filter and select columns at once, especially before assigning.",
          logic:
            "**What it asks.** Filter rows by a condition and keep only chosen columns.\n\n" +
            "**Key idea.** `.loc` accepts both selectors together: a boolean mask for rows and a label list for columns.\n\n" +
            "**Step by step.**\n" +
            "1. Build the row mask: `df['salary'] > 100`.\n" +
            "2. `df.loc[mask, ['name', 'salary']]`.\n\n" +
            "**Why it works.** `.loc` resolves rows and columns in a single indexing operation, returning one clean view/copy.\n\n" +
            "**Gotchas.**\n" +
            "- Prefer `df.loc[mask, cols]` over `df[mask][cols]` — the latter is chained indexing and warns on assignment.\n" +
            "- A single column label returns a Series; a one-element list returns a DataFrame.\n\n" +
            "**Interview mindset.** 'One `.loc` for rows and columns' signals you know how to avoid the copy-warning trap.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'dept': ['Eng', 'Sales', 'Data'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "out = df.loc[df['salary'] > 100, ['name', 'salary']]   # rows + cols\n" +
            "print(out)",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia'],\n" +
            "                   'dept': ['Eng', 'Sales', 'Data'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "print(df.loc[df['salary'] > 100, ['name', 'salary']])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'return columns X, Y for rows where…'.",
        "**Say it:** `df.loc[mask, ['x', 'y']]` — rows and columns in one call.",
        "**Trap:** `df[mask][cols]` is chained indexing; use `.loc`."
      ],
      commonMistakes: [
        "Chained `df[mask][cols]` triggering SettingWithCopyWarning on later assignment.",
        "Expecting a DataFrame back from a single column label (it returns a Series)."
      ]
    },

    // ------------------------------------------------------------------ Q5
    {
      id: "query-string-filter",
      num: 5,
      title: "Filter with a query string",
      difficulty: "Medium",
      category: "Selection & Filtering",
      importance: "common",
      meta: { pattern: "Expression filter", technique: "DataFrame.query", functions: "df.query, @variable" },
      description:
        "Use `df.query('salary > 100 and dept == \"Eng\"')` for a readable, SQL-like filter. Reference an outside Python variable inside the expression with the `@` prefix.",
      notes: [
        "Inside `query`, use plain `and`/`or` and bare column names — it parses its own mini-language.",
        "`@threshold` injects a local variable; column names with spaces need backticks."
      ],
      examples: [
        {
          input: "query('salary > 100 and dept == \"Eng\"')",
          output: "rows that are Eng with salary over 100",
          reasoning: "query evaluates the expression against the columns and keeps matching rows."
        }
      ],
      approaches: [
        {
          name: "df.query(expr)",
          whenToUse: "Complex, readable filters — especially many conditions or interactive analysis.",
          logic:
            "**What it asks.** Express a multi-condition filter as a readable string.\n\n" +
            "**Key idea.** `query` parses an expression referencing columns by name, returning the matching rows.\n\n" +
            "**Step by step.**\n" +
            "1. Write the expression with column names and `and`/`or`.\n" +
            "2. `df.query('salary > 100 and dept == \"Eng\"')`.\n" +
            "3. For a variable, use `@`: `df.query('salary > @threshold')`.\n\n" +
            "**Why it works.** `query` compiles the string against the frame's columns, avoiding repetitive `df['...']` and parentheses.\n\n" +
            "**Gotchas.**\n" +
            "- Inside the string it's `and`/`or` (not `&`/`|`), the opposite of mask syntax.\n" +
            "- Outside variables need `@`; spaced column names need backticks.\n\n" +
            "**Interview mindset.** Offer `query` for readability, but note it's slower on tiny frames due to parsing overhead.",
          perfNote: "query uses numexpr for large frames (can beat masks), but parsing adds overhead on small ones.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "threshold = 100\n" +
            "print(df.query('salary > @threshold and dept == \"Eng\"'))  # @ = local var",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'dept': ['Eng', 'Eng', 'Sales'],\n" +
            "                   'salary': [120, 90, 150]})\n" +
            "threshold = 100\n" +
            "print(df.query('salary > @threshold and dept == \"Eng\"'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** many conditions, or a request for a readable/SQL-like filter.",
        "**Say it:** `df.query('a > 1 and b == \"x\"')`; `@var` for locals.",
        "**Trap:** inside query it's `and`/`or`, not `&`/`|`."
      ],
      commonMistakes: [
        "Using `&`/`|` inside the query string.",
        "Referencing a Python variable without the `@` prefix."
      ]
    },

    // ------------------------------------------------------------------ Q6
    {
      id: "nlargest-top-n",
      num: 6,
      title: "Get the top-N rows by a column",
      difficulty: "Easy",
      category: "Selection & Filtering",
      importance: "common",
      meta: { pattern: "Top-N", technique: "nlargest / sort_values", functions: "DataFrame.nlargest, sort_values, head" },
      description:
        "Return the 2 highest-paid employees. Use `df.nlargest(2, 'salary')` — cleaner and faster than sorting the whole frame and taking `head`.",
      examples: [
        {
          input: "salary = [120, 90, 150, 110]; top 2",
          output: "rows with 150 and 120",
          reasoning: "nlargest returns the 2 rows with the biggest salary, already ordered."
        }
      ],
      approaches: [
        {
          name: "nlargest vs sort_values().head()",
          whenToUse: "Top/bottom-N by a numeric column.",
          logic:
            "**What it asks.** Return the N rows with the largest values in a column.\n\n" +
            "**Key idea.** `nlargest(n, col)` finds the top N directly; `sort_values(col, ascending=False).head(n)` is the general equivalent.\n\n" +
            "**Step by step.**\n" +
            "1. `df.nlargest(2, 'salary')` for the top 2 (use `nsmallest` for the bottom).\n" +
            "2. Or `df.sort_values('salary', ascending=False).head(2)`.\n\n" +
            "**Why it works.** `nlargest` uses a partial selection instead of a full sort, so it's faster for small N on big frames.\n\n" +
            "**Gotchas.**\n" +
            "- `nlargest` keeps ties per its `keep=` policy ('first' by default).\n" +
            "- For top-N *within groups*, combine `sort_values` with `groupby().head(N)`.\n\n" +
            "**Interview mindset.** Prefer `nlargest` for a single top-N; mention the groupby pattern for per-group top-N.",
          perfNote: "nlargest is O(n log k) vs a full O(n log n) sort — a real win when k << n.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'salary': [120, 90, 150, 110]})\n" +
            "print(df.nlargest(2, 'salary'))       # top 2, already ordered",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'name': ['A', 'B', 'C', 'D'],\n" +
            "                   'salary': [120, 90, 150, 110]})\n" +
            "print(df.nlargest(2, 'salary'))"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'top 3', 'highest/lowest N', 'largest by'.",
        "**Say it:** `df.nlargest(n, col)` (or sort_values().head(n)).",
        "**Trap:** per-group top-N needs groupby().head after sorting."
      ],
      commonMistakes: [
        "Sorting the entire frame when only a small top-N is needed.",
        "Forgetting `nsmallest` exists for the bottom-N."
      ]
    },

    // ------------------------------------------------------------------ Q7
    {
      id: "string-contains-filter",
      num: 7,
      title: "Filter rows by a text pattern",
      difficulty: "Medium",
      category: "Selection & Filtering",
      importance: "common",
      meta: { pattern: "Text filter", technique: ".str accessor", functions: "Series.str.contains, startswith" },
      description:
        "Keep rows whose `email` contains `@corp.com`. Use the vectorized `.str.contains(...)` accessor, and guard against `NaN` values with `na=False`.",
      notes: [
        "`.str.contains` treats its argument as a regex by default — pass `regex=False` for a literal substring.",
        "`na=False` makes missing values evaluate to `False` instead of raising."
      ],
      examples: [
        {
          input: "emails = ['a@corp.com', 'b@gmail.com', 'c@corp.com']",
          output: "rows 0 and 2",
          reasoning: "contains('@corp.com') is True for the two corporate addresses."
        }
      ],
      approaches: [
        {
          name: ".str.contains with na=False",
          whenToUse: "Substring / pattern filtering on a text column.",
          logic:
            "**What it asks.** Keep rows whose text column matches a pattern.\n\n" +
            "**Key idea.** The `.str` accessor vectorizes Python string methods; `.str.contains(pat)` returns a boolean Series.\n\n" +
            "**Step by step.**\n" +
            "1. `mask = df['email'].str.contains('@corp.com', na=False)`.\n" +
            "2. `df[mask]`.\n\n" +
            "**Why it works.** `.str.contains` applies the match element-wise in C; `na=False` handles missing values cleanly.\n\n" +
            "**Gotchas.**\n" +
            "- The pattern is a **regex** by default — escape special chars or pass `regex=False`.\n" +
            "- Without `na=False`, `NaN` values raise a `ValueError` when used as a mask.\n\n" +
            "**Interview mindset.** Mention `.str` for all text ops and always add `na=False` on real data.",
          rcs:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'email': ['a@corp.com', 'b@gmail.com', 'c@corp.com']})\n" +
            "mask = df['email'].str.contains('@corp.com', na=False)   # regex-safe here\n" +
            "print(df[mask])",
          plain:
            "import pandas as pd\n" +
            "\n" +
            "df = pd.DataFrame({'email': ['a@corp.com', 'b@gmail.com', 'c@corp.com']})\n" +
            "print(df[df['email'].str.contains('@corp.com', na=False)])"
        }
      ],
      recognizeRecall: [
        "**Spot it:** 'contains', 'starts with', 'matches', text pattern filters.",
        "**Say it:** `df[df['c'].str.contains(pat, na=False)]`.",
        "**Trap:** contains is regex by default; NaN needs na=False."
      ],
      commonMistakes: [
        "Forgetting `na=False` and hitting a ValueError from NaN in the mask.",
        "Passing a regex-special string without escaping or `regex=False`."
      ]
    }

  ]);
})();
