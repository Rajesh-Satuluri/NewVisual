/*
 * data/pandas/concepts_combine.js — Pandas "Learn" module: Combine & Reshape.
 * Registered into window.LEARN under the "pandas" stack. Runnable in-browser via
 * Pyodide (pandas ~2.x auto-loads). Core, stable APIs only (merge, join, concat,
 * pivot, pivot_table, melt, stack, unstack). Teaching structure mirrors the lab.
 */
window.LEARN.register("pandas", "Combine & Reshape", [
  {
    id: "merge-join",
    title: "Merge & Join",
    difficulty: "Core",
    estMinutes: 14,
    relevance: 3,
    tagline: "Line up two tables on shared keys — the pandas answer to a SQL JOIN.",

    whatIsIt: [
      "<code>pd.merge(left, right, on='key', how=...)</code> matches rows from two DataFrames by key. The <code>how</code> argument mirrors SQL exactly: <code>'inner'</code> keeps only matched keys, <code>'left'</code> keeps every left row, <code>'right'</code> every right row, and <code>'outer'</code> keeps everything from both sides (filling gaps with <code>NaN</code>).",
      "Use <code>on=</code> when both frames share the key name; use <code>left_on=</code>/<code>right_on=</code> when the columns are named differently. The relationship matters: <b>1:1</b> keeps the row count, <b>1:many</b> multiplies the 'one' side out, and <b>many:many</b> forms a cross-product <b>within each key</b> — the classic row-count blow-up.",
      "Two guardrails: <code>validate='1:m'</code> (etc.) makes merge <b>raise</b> if the relationship isn't what you claimed, and <code>indicator=True</code> adds a <code>_merge</code> column telling you whether each row came from <code>left_only</code>, <code>right_only</code>, or <code>both</code>.",
      "<code>df.join(other)</code> is a convenience wrapper that merges on the <b>index</b> by default — handy for index-aligned tables, but <code>merge</code> is the general tool when you match on columns."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "customers = pd.DataFrame({'cust_id': [1, 2, 3],\n" +
        "                         'name':    ['Ana', 'Ben', 'Cid']})\n" +
        "orders = pd.DataFrame({'order_id': [10, 11, 12, 13],\n" +
        "                       'cust_id':  [1, 1, 2, 9],\n" +
        "                       'amt':      [50, 20, 75, 10]})\n" +
        "\n" +
        "# inner: only orders whose cust_id exists in customers (order 13 -> cust 9 dropped)\n" +
        "print(pd.merge(orders, customers, on='cust_id', how='inner'))\n" +
        "\n" +
        "# left + indicator: keep EVERY order, flag which matched\n" +
        "print(pd.merge(orders, customers, on='cust_id', how='left', indicator=True))",
      caption:
        "inner drops order 13 (cust_id 9 has no customer). left keeps all four orders and NaN-fills the missing name; the _merge column shows 'both' vs 'left_only' so unmatched rows are impossible to miss."
    },

    whyMatters:
      "<p>Real data lives in many tables — orders here, customers there, products elsewhere — and almost every analysis begins by stitching them together on a key. Merge is the tool, and it maps <b>1:1 onto SQL joins</b>, so the mental model transfers straight to databases and PySpark.</p>" +
      "<p>The mistake that silently corrupts results is the <b>row-count blow-up</b>: you expect a lookup (1:many) but the key is duplicated on both sides (many:many), and merge quietly returns a cross-product. Sums double, averages drift, and nothing errors. Checking row counts before and after — or passing <code>validate=</code> — turns that silent bug into a loud one.</p>",

    recognize: [
      { q: "\"attach columns from another table by a shared id\"", think: "pd.merge(a, b, on='id', how='left') — lookup / enrichment" },
      { q: "\"keys are named differently in each frame\"", think: "left_on='user_id', right_on='id'" },
      { q: "\"my result has way more rows than I started with\"", think: "duplicated keys on both sides → many:many cross-product; check with validate=" },
      { q: "\"which rows failed to match?\"", think: "how='left'/'outer' with indicator=True, then filter _merge" },
      { q: "\"both tables are already aligned on the index\"", think: "a.join(b) — index-based merge" }
    ],

    matchTags: ["merge", "join", "how", "on", "left_on", "right_on", "inner", "outer",
                "left join", "right join", "sql join", "validate", "indicator", "keys"],

    traps: [
      {
        bad: "pd.merge(left, right, on='k')                 # k duplicated on BOTH sides",
        good: "pd.merge(left, right, on='k', validate='1:m') # raises if not one-to-many",
        why: "When the key repeats on both sides, merge builds a cross-product within each key (2×2 → 4 rows) and totals silently double. validate= makes merge check the relationship and raise instead of corrupting the result."
      },
      {
        bad: "pd.merge(orders, customers, on='cust_id')      # how defaults to 'inner'",
        good: "pd.merge(orders, customers, on='cust_id', how='left')  # keep all orders",
        why: "merge defaults to how='inner', so unmatched rows vanish without warning. If you meant to keep every row on one side (a lookup), say how='left' explicitly."
      },
      {
        bad: "combined = df.join(other)                       # collides if columns share names",
        good: "pd.merge(df, other, on='key', suffixes=('_a','_b'))",
        why: "join matches on the index and errors on overlapping column names; when you're really matching on a column and both frames carry same-named columns, use merge with suffixes to disambiguate."
      }
    ],

    complexity: [
      { op: "merge on a key (hash join)", big_o: "O(n + m)", note: "Builds a hash of one side's keys, then probes it with the other — linear in the two row counts for typical 1:1 / 1:many joins." },
      { op: "many:many merge", big_o: "O(output rows)", note: "Cost is driven by the size of the cross-product per key, which can be far larger than n + m — the blow-up." },
      { op: "df.join (index-based)", big_o: "O(n + m)", note: "Same hash-join machinery, keyed on the index instead of a column." },
      { op: "sorting keys first (optional)", big_o: "O(n log n)", note: "Only relevant for ordered/merge_asof style joins; the default merge does not require sorted keys." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A column merge is a <b>hash join</b>: pandas hashes the keys of one frame into a lookup structure, then scans the other frame probing that table. That is why merge doesn't need sorted input and runs roughly linearly for well-behaved relationships.</p>" +
      "<p><code>how</code> selects which non-matching rows survive — inner keeps intersections, outer keeps the union, left/right keep one whole side. Missing matches are filled with <code>NaN</code>, which can quietly upcast integer columns to float. Use <code>validate=</code> ('1:1', '1:m', 'm:1', 'm:m') to assert the cardinality you expect, and <code>indicator=True</code> to audit match provenance — both turn subtle join bugs into explicit failures.</p>",

    challenge: {
      prompt:
        "orders has five rows (a 1:many lookup into customers by cust_id). Left-merge to attach each order's city, confirm the row count is unchanged, then count orders per city. Which how avoids dropping any order?",
      starter:
        "import pandas as pd\n" +
        "customers = pd.DataFrame({'cust_id': [1, 2, 3],\n" +
        "                         'city':    ['NYC', 'LA', 'SF']})\n" +
        "orders = pd.DataFrame({'cust_id': [1, 1, 2, 2, 2]})\n" +
        "print(orders)\n" +
        "# TODO: merged = ...  ; then print row count and orders-per-city\n",
      solution:
        "import pandas as pd\n" +
        "customers = pd.DataFrame({'cust_id': [1, 2, 3], 'city': ['NYC', 'LA', 'SF']})\n" +
        "orders = pd.DataFrame({'cust_id': [1, 1, 2, 2, 2]})\n" +
        "merged = pd.merge(orders, customers, on='cust_id', how='left')\n" +
        "print(len(orders), '->', len(merged))            # 5 -> 5, no rows lost\n" +
        "print(merged.groupby('city').size())             # NYC: 2, LA: 3\n" +
        "# how='left' keeps every order; because customers is unique on cust_id\n" +
        "# (the 'one' side) the count stays 5 — a clean 1:many lookup."
    }
  },

  {
    id: "reshape-pivot-melt",
    title: "Reshape (pivot/melt)",
    difficulty: "Core",
    estMinutes: 13,
    relevance: 3,
    tagline: "Rotate data between long (tidy) and wide (grid) — pivot out, melt back.",

    whatIsIt: [
      "<b>Long → wide:</b> <code>df.pivot(index=, columns=, values=)</code> turns unique values of the <code>columns</code> field into new columns, producing a grid. It <b>raises</b> if any <code>(index, columns)</code> pair is duplicated — because it has no rule for combining two values into one cell.",
      "<code>pd.pivot_table(...)</code> is pivot's aggregating sibling: give it an <code>aggfunc</code> (default <code>'mean'</code>) and it <b>collapses duplicate keys</b> instead of raising — pivot for guaranteed-unique keys, pivot_table when duplicates must be summarized.",
      "<b>Wide → long:</b> <code>df.melt(id_vars=, value_vars=)</code> unpivots spread-out columns back into two tidy columns — one holding the former column names (<code>variable</code>), one holding the values (<code>value</code>). It's the inverse of pivot and the shape most groupby/plotting code wants.",
      "<code>stack()</code> and <code>unstack()</code> do the same rotation but on the <b>index</b>: <code>stack</code> pushes the innermost column level down into the row index (wide → long), <code>unstack</code> pulls an index level up into columns (long → wide)."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "long = pd.DataFrame({\n" +
        "    'date': ['Mon', 'Mon', 'Tue', 'Tue'],\n" +
        "    'city': ['NYC', 'LA',  'NYC', 'LA'],\n" +
        "    'temp': [40,    70,     42,    72],\n" +
        "})\n" +
        "\n" +
        "# long -> wide: one column per city\n" +
        "wide = long.pivot(index='date', columns='city', values='temp')\n" +
        "print(wide)\n" +
        "\n" +
        "# wide -> long again with melt (reset_index so 'date' is a real column)\n" +
        "back = wide.reset_index().melt(id_vars='date',\n" +
        "                               var_name='city', value_name='temp')\n" +
        "print(back)",
      caption:
        "pivot spreads each city into its own column keyed by date; melt reverses it, folding the NYC/LA columns back into tidy (date, city, temp) rows. pivot ↔ melt are inverses."
    },

    whyMatters:
      "<p>Data arrives in whichever shape someone else chose, and analysis tools are picky: <b>groupby, plotting, and modeling</b> want tidy <b>long</b> data (one observation per row), while humans and spreadsheets read <b>wide</b> grids. Reshaping is the constant translation between the two.</p>" +
      "<p>The trap that surprises people is <b>pivot raising on duplicate keys</b>. pivot is a pure reshuffle — it assumes each cell has exactly one value. The moment your keys repeat, you don't want a reshape, you want an <b>aggregation</b>, and that's precisely the line between <code>pivot</code> (unique keys, reshuffle) and <code>pivot_table</code> (duplicate keys, aggregate with aggfunc).</p>",

    recognize: [
      { q: "\"turn categories into columns / build a grid\"", think: "df.pivot(index=, columns=, values=) — keys must be unique" },
      { q: "\"same grid but keys repeat / I need a sum-per-cell\"", think: "pd.pivot_table(..., aggfunc='sum') — aggregates duplicates" },
      { q: "\"columns should become rows (tidy for plotting/groupby)\"", think: "df.melt(id_vars=, value_vars=)" },
      { q: "\"ValueError: Index contains duplicate entries, cannot reshape\"", think: "duplicate (index, columns) pair → switch pivot to pivot_table" },
      { q: "\"rotate on the index, not a column\"", think: "stack() (cols→index) / unstack() (index→cols)" }
    ],

    matchTags: ["pivot", "pivot_table", "melt", "stack", "unstack", "reshape", "long",
                "wide", "unpivot", "aggfunc", "tidy", "spread", "gather"],

    traps: [
      {
        bad: "df.pivot(index='date', columns='city', values='temp')  # two readings per (date,city)",
        good: "pd.pivot_table(df, index='date', columns='city', values='temp', aggfunc='mean')",
        why: "pivot has no way to put two values in one cell, so a duplicated (index, columns) pair raises ValueError. When duplicates are expected, pivot_table aggregates them with aggfunc instead of failing."
      },
      {
        bad: "wide.melt(id_vars='date')       # 'date' is the index, not a column -> KeyError",
        good: "wide.reset_index().melt(id_vars='date')",
        why: "After pivot, the index field ('date') isn't a column, so melt can't find it. reset_index() promotes it back to a column before you unpivot."
      },
      {
        bad: "df.pivot_table(index='city', values='temp')   # silently averaged (default aggfunc)",
        good: "df.pivot_table(index='city', values='temp', aggfunc='sum')",
        why: "pivot_table's default aggfunc is 'mean'. If you actually wanted totals (or counts), you'll get quietly-averaged numbers — always state aggfunc when duplicates exist."
      }
    ],

    complexity: [
      { op: "pivot (pure reshape)", big_o: "O(n)", note: "A relabeling/reshuffle of existing values into a grid; no computation per cell, just placement." },
      { op: "pivot_table (aggregate)", big_o: "O(n)", note: "Runs a groupby under the hood, then lays the aggregates out as a grid — linear plus the aggregation cost." },
      { op: "melt (unpivot)", big_o: "O(n·k)", note: "Stacks k value columns into rows, so output is roughly rows × (number of melted columns)." },
      { op: "stack / unstack", big_o: "O(n)", note: "Rotates a level between the row and column index; reindexing work is linear in the cells." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>pivot</code> is a pure reindexing operation: it maps each row to a <code>(index, columns)</code> cell and places the value there. With one value per cell that's unambiguous; with two it cannot choose, so it raises <code>ValueError</code> rather than guess. <code>pivot_table</code> sidesteps this by running a <b>groupby</b> on the keys first and reducing each group with <code>aggfunc</code>, then reshaping the result.</p>" +
      "<p><code>stack</code>/<code>unstack</code> are the same rotation expressed through a <code>MultiIndex</code>: stack moves a column level into the row index (taller, narrower), unstack moves a row level into the columns (shorter, wider). <code>melt</code> is the column-oriented inverse of pivot. Together they let you switch freely between the wide layout people read and the long layout the rest of pandas prefers.</p>",

    challenge: {
      prompt:
        "long holds one (student, subject, score) row each. Pivot it wide so each subject is a column, then add a per-student 'avg' column across subjects. Print both the long and wide frames.",
      starter:
        "import pandas as pd\n" +
        "long = pd.DataFrame({\n" +
        "    'student': ['Ana', 'Ana', 'Ben', 'Ben'],\n" +
        "    'subject': ['math', 'sci', 'math', 'sci'],\n" +
        "    'score':   [90,     80,    70,     85],\n" +
        "})\n" +
        "print(long)\n" +
        "# TODO: wide = ...  ; add wide['avg'] across subjects ; print(wide)\n",
      solution:
        "import pandas as pd\n" +
        "long = pd.DataFrame({'student': ['Ana','Ana','Ben','Ben'],\n" +
        "                     'subject': ['math','sci','math','sci'],\n" +
        "                     'score':   [90, 80, 70, 85]})\n" +
        "wide = long.pivot(index='student', columns='subject', values='score')\n" +
        "print(wide)\n" +
        "wide['avg'] = wide.mean(axis=1)          # mean across the subject columns\n" +
        "print(wide)\n" +
        "# pivot (not pivot_table) works because each (student, subject) pair is unique."
    }
  },

  {
    id: "concatenation",
    title: "Concatenation",
    difficulty: "Beginner",
    estMinutes: 11,
    relevance: 2,
    tagline: "Stack frames end-to-end (rows) or side-by-side (columns) — no key matching.",

    whatIsIt: [
      "<code>pd.concat([df1, df2, ...])</code> glues a <b>list</b> of frames together. Default <code>axis=0</code> stacks them <b>vertically</b> (append rows); <code>axis=1</code> joins them <b>horizontally</b> (add columns side by side).",
      "Concat <b>aligns on the other axis</b>. Stacking rows (axis=0) aligns by column name — mismatched columns are kept and filled with <code>NaN</code>. Joining columns (axis=1) aligns by index — mismatched index labels are filled with <code>NaN</code>.",
      "Row concat <b>preserves each frame's original index</b>, so you often get duplicate labels; pass <code>ignore_index=True</code> for a fresh 0..n-1 range. Pass <code>keys=['a','b']</code> to add an outer index level marking which source each row came from (a <b>MultiIndex</b>).",
      "Concat only stacks — it never matches on a key. That's the difference from <code>merge</code>: merge lines rows up by <b>key values</b>, concat just places frames <b>next to each other</b>. Note <code>df.append</code> was <b>removed</b> in pandas 2.0 — use <code>pd.concat</code> instead."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "q1 = pd.DataFrame({'name': ['Ana', 'Ben'], 'sales': [10, 20]})\n" +
        "q2 = pd.DataFrame({'name': ['Cid', 'Dee'], 'sales': [30, 40]})\n" +
        "\n" +
        "# stack rows; ignore_index gives a clean 0..3 index\n" +
        "print(pd.concat([q1, q2], ignore_index=True))\n" +
        "\n" +
        "# keys= tags each source with an outer index level (Q1 / Q2)\n" +
        "print(pd.concat([q1, q2], keys=['Q1', 'Q2']))",
      caption:
        "concat stacks the two quarters end-to-end. ignore_index=True renumbers the rows 0..3; keys=['Q1','Q2'] instead builds a MultiIndex so you can tell which quarter each row came from."
    },

    whyMatters:
      "<p>Data often arrives <b>split into pieces</b> — one file per month, one frame per API page, one table per region — and concat is how you reassemble them into a single frame before analysis. It's the everyday 'combine these into one' operation, and the standard pattern is: build a list of frames in a loop, then <code>pd.concat</code> them <b>once</b> at the end.</p>" +
      "<p>Knowing concat vs merge saves you from reaching for the wrong tool. If the frames describe the <b>same columns for different rows</b> (more of the same data), concat. If they describe <b>different attributes tied together by a key</b> (enrichment), merge. And because the old <code>df.append</code> is gone in modern pandas, concat is now the single answer for stacking.</p>",

    recognize: [
      { q: "\"combine monthly files / API pages into one frame\"", think: "pd.concat([...], ignore_index=True) — stack rows" },
      { q: "\"add these columns onto that frame, same rows\"", think: "pd.concat([...], axis=1) — align on index" },
      { q: "\"label which source each chunk came from\"", think: "pd.concat([...], keys=[...]) — outer MultiIndex level" },
      { q: "\"duplicate index labels after stacking\"", think: "ignore_index=True for a fresh 0..n-1 range" },
      { q: "\"AttributeError: 'DataFrame' object has no attribute 'append'\"", think: "df.append was removed → use pd.concat([...])" }
    ],

    matchTags: ["concat", "concatenate", "append", "axis", "ignore_index", "keys",
                "stack rows", "combine", "vstack", "hstack", "union"],

    traps: [
      {
        bad: "out = df1.append(df2)                 # AttributeError in pandas 2.x",
        good: "out = pd.concat([df1, df2], ignore_index=True)",
        why: "DataFrame.append was deprecated and removed in pandas 2.0. pd.concat is the replacement; pass ignore_index=True to avoid carrying over each frame's original row labels."
      },
      {
        bad: "for chunk in chunks:\n    out = pd.concat([out, chunk])   # quadratic: recopies everything each loop",
        good: "out = pd.concat(list_of_chunks, ignore_index=True)   # one concat at the end",
        why: "Concatenating inside a loop recopies the growing frame every iteration (O(n²)). Collect the pieces in a list and concat once — a single linear pass."
      },
      {
        bad: "pd.concat([a, b], axis=1)             # misaligned indexes -> stray NaNs",
        good: "pd.concat([a.reset_index(drop=True), b.reset_index(drop=True)], axis=1)",
        why: "axis=1 aligns on the index, so frames with different index labels produce NaN-filled gaps. Reset both indexes first (or ensure they match) when you just want to bolt columns together positionally."
      }
    ],

    complexity: [
      { op: "pd.concat (single call)", big_o: "O(total rows)", note: "Allocates the result once and copies each piece in — linear in the combined size." },
      { op: "concat inside a loop", big_o: "O(n²)", note: "Each iteration recopies the whole accumulated frame; collect into a list and concat once instead." },
      { op: "axis=1 with index alignment", big_o: "O(n log n)", note: "Aligning non-matching indexes requires reindexing both frames to their union before joining columns." },
      { op: "keys= (MultiIndex)", big_o: "O(total rows)", note: "Adds an outer index level tagging each source; same linear copy plus index construction." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>concat</code> allocates one output block and copies each input frame into it, aligning the <b>other</b> axis by label along the way: stacking rows unions the column labels, joining columns unions the index labels, and any label present in only some frames becomes <code>NaN</code> (which can upcast ints to float). Because it copies, calling concat repeatedly in a loop is quadratic — the reason the idiom is 'build a list, concat once'.</p>" +
      "<p>Unlike <code>merge</code>, concat does <b>no key matching</b> — it never looks at cell values to decide what lines up, only labels on the opposite axis. <code>ignore_index=True</code> discards the incoming labels for a clean range; <code>keys=</code> instead layers a <code>MultiIndex</code> on top so each block stays identifiable. And with <code>DataFrame.append</code> removed in pandas 2.0, concat is the one supported way to stack frames.</p>",

    challenge: {
      prompt:
        "jan and feb hold the same two people's sales. Concat them into one frame tagged by month with keys=['Jan','Feb'], then compute total sales per person across both months. Print the stacked frame and the per-person totals.",
      starter:
        "import pandas as pd\n" +
        "jan = pd.DataFrame({'name': ['Ana', 'Ben'], 'sales': [10, 20]})\n" +
        "feb = pd.DataFrame({'name': ['Ana', 'Ben'], 'sales': [15, 25]})\n" +
        "print(jan)\n" +
        "# TODO: allm = pd.concat(...)  ; then total sales per name\n",
      solution:
        "import pandas as pd\n" +
        "jan = pd.DataFrame({'name': ['Ana','Ben'], 'sales': [10, 20]})\n" +
        "feb = pd.DataFrame({'name': ['Ana','Ben'], 'sales': [15, 25]})\n" +
        "allm = pd.concat([jan, feb], keys=['Jan', 'Feb'], names=['month', 'row'])\n" +
        "print(allm)\n" +
        "print(allm.groupby('name')['sales'].sum())   # Ana: 25, Ben: 45\n" +
        "# concat stacks the months (keys tags each source); groupby then sums\n" +
        "# per person across both — concat to combine, groupby to aggregate."
    }
  }
]);
