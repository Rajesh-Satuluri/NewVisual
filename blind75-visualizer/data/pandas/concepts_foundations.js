/*
 * data/pandas/concepts_foundations.js — Pandas "Learn" Foundations topics.
 * Registered into window.LEARN under the "pandas" stack. Runnable in-browser via
 * Pyodide (pandas auto-loads). Content grounded in real pandas semantics;
 * teaching structure mirrors the groupby exemplar.
 */
window.LEARN.register("pandas", "Foundations", [
  {
    id: "series-and-dataframe",
    title: "Series & DataFrame",
    difficulty: "Beginner",
    estMinutes: 10,
    relevance: 3,
    tagline: "The two core structures — a labeled 1-D array and a table of aligned columns that share one index.",

    whatIsIt: [
      "A <code>Series</code> is a <b>1-D labeled array</b>: a column of values plus an <b>index</b> (the row labels). A <code>DataFrame</code> is a <b>2-D table</b> — think of it as a dict of <code>Series</code> that all share the <b>same index</b>, one Series per column.",
      "Build them from plain Python: a <code>Series</code> from a list (default integer index) or a dict (keys become the index); a <code>DataFrame</code> from a dict of lists (keys become <b>columns</b>) or a list of dicts (one row each).",
      "Every column has a single <code>dtype</code> (<code>int64</code>, <code>float64</code>, <code>bool</code>, <code>object</code> for strings). Mixing types in a column falls back to <code>object</code>; an integer column with any <code>NaN</code> is promoted to <code>float64</code>.",
      "The <b>index</b> is the superpower: operations <b>align on the index automatically</b>, so adding two Series matches values by label — not by position — and fills unmatched labels with <code>NaN</code>."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "\n" +
        "# Series from a dict: keys become the index\n" +
        "s = pd.Series({'Asha': 120, 'Ravi': 100, 'Mia': 80})\n" +
        "print(s)\n" +
        "print('dtype:', s.dtype)\n" +
        "\n" +
        "# DataFrame from a dict of lists: keys become columns\n" +
        "df = pd.DataFrame({\n" +
        "    'name':   ['Asha', 'Ravi', 'Mia'],\n" +
        "    'salary': [120, 100, 80],\n" +
        "    'active': [True, False, True],\n" +
        "})\n" +
        "print(df)\n" +
        "print(df.dtypes)\n" +
        "\n" +
        "# Automatic alignment on the INDEX (the superpower)\n" +
        "a = pd.Series([1, 2, 3], index=['x', 'y', 'z'])\n" +
        "b = pd.Series([10, 20, 30], index=['z', 'y', 'x'])\n" +
        "print(a + b)   # matched by label, not position",
      caption:
        "The Series prints values beside their index labels. df.dtypes shows one dtype per column (object, int64, bool). a + b lines the two Series up by LABEL — x=1+30, y=2+20, z=3+10 — so order of construction never matters."
    },

    whyMatters:
      "<p>Series and DataFrame are the vocabulary of every pandas task — you cannot filter, group, join, or plot without first knowing which of the two you are holding and what its index is. Nearly every confusing error (\"why is this NaN?\", \"why did my columns become rows?\") traces back to the index.</p>" +
      "<ul>" +
      "<li><b>Alignment</b> means arithmetic between two objects matches on labels first. This prevents position bugs but produces surprise <code>NaN</code> when labels do not overlap.</li>" +
      "<li><b>dtypes</b> drive behavior and memory: numeric columns vectorize in C, <code>object</code> columns fall back to slow Python. Knowing a column is <code>object</code> when you expected <code>int</code> explains a lot of slowness.</li>" +
      "</ul>",

    recognize: [
      { q: "\"a single column / one labeled 1-D array of values\"", think: "Series — has one dtype and an index" },
      { q: "\"a whole table with named columns\"", think: "DataFrame — a dict of aligned Series sharing an index" },
      { q: "\"build a table from records / rows\"", think: "pd.DataFrame(list_of_dicts) — one dict per row" },
      { q: "\"why did adding two Series give NaN?\"", think: "index labels did not overlap — alignment fills gaps with NaN" },
      { q: "\"why is my whole-number column a float?\"", think: "a NaN promoted int64 to float64" }
    ],

    matchTags: ["series", "dataframe", "index", "dtype", "dtypes", "alignment", "align",
                "structure", "create", "construct", "columns"],

    traps: [
      {
        bad: "df = pd.DataFrame(['Asha', 'Ravi', 'Mia'])   # one unnamed column '0'",
        good: "df = pd.DataFrame({'name': ['Asha', 'Ravi', 'Mia']})   # named column",
        why: "A bare list makes a single column labeled 0. Pass a dict so the keys become meaningful column names."
      },
      {
        bad: "a = pd.Series([1, 2, 3])\nb = pd.Series([4, 5, 6], index=[1, 2, 3])\na + b   # mostly NaN!",
        good: "a.reset_index(drop=True) + b.reset_index(drop=True)   # align by position",
        why: "a has index 0,1,2 and b has index 1,2,3, so alignment only matches labels 1 and 2 — the rest is NaN. Reset the index (or use .values) when you truly want positional math."
      },
      {
        bad: "s = pd.Series([1, 2, None])\ns.dtype   # float64, not int64",
        good: "s = pd.Series([1, 2, None], dtype='Int64')   # nullable integer",
        why: "A None/NaN forces a plain integer Series to float64. Use the nullable 'Int64' dtype (capital I) to keep integers with missing values."
      }
    ],

    complexity: [
      { op: "pd.Series(list) / pd.DataFrame(dict)", big_o: "O(n)", note: "Copies the data into a contiguous typed array and builds the index once." },
      { op: "df['col'] (select a column)", big_o: "O(1)", note: "Returns the existing Series by label — no copy of the data, just a view/reference." },
      { op: "a + b (aligned arithmetic)", big_o: "O(n)", note: "Aligns the two indexes (hash/merge of labels) then does one vectorized pass." },
      { op: "df.dtypes", big_o: "O(#columns)", note: "Just reads the stored dtype of each column block; independent of row count." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A DataFrame is not a grid of loose cells — pandas stores each column as its own typed 1-D array (a NumPy array, or an ExtensionArray for nullable/categorical dtypes), all sharing one <code>Index</code> object. That is why a column has exactly one dtype and why column selection is cheap: it hands back the array that already exists.</p>" +
      "<p>The <code>Index</code> is backed by a hash table, so label lookups and alignment are fast. When two objects combine, pandas first computes the <b>union of their indexes</b>, reindexes both to it, and only then runs the vectorized operation — this is the mechanism behind every \"why is it NaN?\" surprise.</p>" +
      "<p>Because numeric columns are NumPy arrays, arithmetic runs in compiled C. <code>object</code> columns (typically strings) hold Python pointers, so the same operation loops in the interpreter — a common, invisible performance cliff.</p>",

    challenge: {
      prompt:
        "Build a DataFrame of three products with columns name, price, and stock. Then create a Series of discounts indexed by product name (only two of the three products), and add it to a price Series indexed by name. Observe which product ends up NaN and explain why. Print the dtypes too.",
      starter:
        "import pandas as pd\n" +
        "# TODO: build df with name/price/stock, then a discount Series indexed by name\n" +
        "# add price (indexed by name) + discount, print result and df.dtypes\n",
      solution:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'name':  ['Pen', 'Notebook', 'Eraser'],\n" +
        "    'price': [1.5, 4.0, 0.75],\n" +
        "    'stock': [100, 40, 200],\n" +
        "})\n" +
        "print(df)\n" +
        "print(df.dtypes)\n" +
        "\n" +
        "price = pd.Series(df['price'].values, index=df['name'])   # indexed by name\n" +
        "discount = pd.Series({'Pen': 0.5, 'Notebook': 1.0})        # only two names\n" +
        "print(price + discount)\n" +
        "# Eraser is NaN: it has no matching label in `discount`, so alignment\n" +
        "# fills the gap with NaN. Pen -> 2.0, Notebook -> 5.0, Eraser -> NaN."
    }
  },

  {
    id: "indexing-loc-iloc",
    title: "Indexing (loc/iloc)",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 3,
    tagline: "Select by label with .loc, by position with .iloc — and always assign through .loc to dodge the copy-vs-view trap.",

    whatIsIt: [
      "<code>.loc</code> selects by <b>label</b> (the index/column names); <code>.iloc</code> selects by <b>integer position</b> (0-based). Both take <code>[rows, cols]</code>, so <code>df.loc[2, 'salary']</code> and <code>df.iloc[0, 1]</code> pick a row/column pair.",
      "A crucial difference: label slices with <code>.loc</code> are <b>inclusive of the stop</b> (<code>df.loc['a':'c']</code> includes <code>'c'</code>), while position slices with <code>.iloc</code> are <b>exclusive</b> (<code>df.iloc[0:3]</code> stops before 3), just like normal Python.",
      "<code>df['col']</code> returns a <b>Series</b> (single column); <code>df[['col']]</code> — a list inside the brackets — returns a one-column <b>DataFrame</b>. Passing a list always keeps you in 2-D.",
      "Use <code>.at</code> / <code>.iat</code> for a single <b>scalar</b> cell — they are faster than <code>.loc</code>/<code>.iloc</code> for one value: <code>df.at[2, 'salary']</code> (label) or <code>df.iat[0, 1]</code> (position)."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "df = pd.DataFrame(\n" +
        "    {'name': ['Asha','Ravi','Mia','Sam'], 'salary': [120,100,80,90]},\n" +
        "    index=['a','b','c','d'],\n" +
        ")\n" +
        "\n" +
        "# label vs position\n" +
        "print(df.loc['b', 'salary'])     # 100  (by label)\n" +
        "print(df.iloc[1, 1])             # 100  (by position)\n" +
        "\n" +
        "# slice endpoints differ!\n" +
        "print(df.loc['a':'c'])           # includes 'c'  -> 3 rows\n" +
        "print(df.iloc[0:2])              # excludes 2    -> 2 rows\n" +
        "\n" +
        "# Series vs DataFrame\n" +
        "print(type(df['salary']))        # Series\n" +
        "print(type(df[['salary']]))      # DataFrame\n" +
        "\n" +
        "# scalar accessors\n" +
        "print(df.at['a', 'name'])        # 'Asha'\n" +
        "print(df.iat[3, 1])             # 90",
      caption:
        ".loc['a':'c'] returns 3 rows (stop label 'c' is INCLUDED); .iloc[0:2] returns 2 rows (stop 2 is EXCLUDED). df['salary'] is a Series, df[['salary']] is a 1-column DataFrame. .at/.iat pull one scalar cell."
    },

    whyMatters:
      "<p>Selection is the operation you perform most, and the loc/iloc distinction is the single most common source of pandas bugs and confusing warnings. Two habits save hours:</p>" +
      "<ul>" +
      "<li><b>Assign through <code>.loc[rows, cols]</code></b>, never through chained brackets. <code>df[mask]['col'] = x</code> assigns into a temporary copy and silently does nothing, raising <code>SettingWithCopyWarning</code>.</li>" +
      "<li><b>Know your return type.</b> Downstream code often breaks because you handed it a Series when it expected a DataFrame (or vice versa) — the <code>[['col']]</code> vs <code>['col']</code> choice.</li>" +
      "</ul>",

    recognize: [
      { q: "\"get the row named X / the column called Y\"", think: ".loc[label, 'col'] — label-based" },
      { q: "\"get the first / Nth row by position\"", think: ".iloc[i] or .iloc[i, j] — position-based" },
      { q: "\"filter rows AND set a value at once\"", think: "df.loc[mask, 'col'] = value — one assignment, no chaining" },
      { q: "\"I got SettingWithCopyWarning\"", think: "you chained indexers; rewrite as a single df.loc[...] assignment" },
      { q: "\"I need a DataFrame, not a Series, back\"", think: "df[['col']] with a list, not df['col']" },
      { q: "\"read/write just one cell fast\"", think: ".at (label) or .iat (position)" }
    ],

    matchTags: ["loc", "iloc", "indexing", "select", "selection", "at", "iat",
                "settingwithcopy", "chained", "slice", "subset"],

    traps: [
      {
        bad: "df[df['salary'] > 90]['salary'] = 0   # SettingWithCopyWarning; nothing changes",
        good: "df.loc[df['salary'] > 90, 'salary'] = 0   # single .loc assignment works",
        why: "Chained indexing (df[...][...] =) writes into a temporary copy, so the original is untouched. Do the filter and the target column in ONE .loc call."
      },
      {
        bad: "df.loc[0:3]   # assuming it stops before 3 like Python slicing",
        good: "df.iloc[0:3]   # position slice is exclusive; or know .loc includes the stop",
        why: ".loc slices by label and INCLUDES the stop label, so df.loc[0:3] on a default index returns 4 rows (0,1,2,3). Use .iloc for the familiar half-open behavior."
      },
      {
        bad: "df['salary'].iloc[0] = 999   # may warn / not stick (writes to a Series copy)",
        good: "df.iloc[0, df.columns.get_loc('salary')] = 999   # or df.at[df.index[0], 'salary'] = 999",
        why: "Selecting the column first, then indexing, is chained indexing again. Address the cell in one call via .iloc[row, col] or .at/.iat."
      }
    ],

    complexity: [
      { op: ".loc[label] / .at[label, col]", big_o: "O(1) avg", note: "Hash lookup in the Index to find the row position, then a direct read." },
      { op: ".iloc[i] / .iat[i, j]", big_o: "O(1)", note: "Direct positional access into the underlying array — no hashing." },
      { op: ".loc['a':'c'] (label slice)", big_o: "O(log n) / O(1)", note: "Finds the start and stop label positions, then slices; inclusive of the stop." },
      { op: "df.loc[boolean_mask]", big_o: "O(n)", note: "Scans the full-length mask and gathers the True rows." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> <code>SettingWithCopyWarning</code> exists because pandas cannot always tell whether an indexing result is a <b>view</b> (shares memory with the parent, so assignment writes through) or a <b>copy</b> (independent, so assignment is lost). Chained indexing <code>df[...][...]</code> creates an intermediate whose view-or-copy status is undefined — hence the warning and the silent no-op.</p>" +
      "<p>A single <code>df.loc[rows, cols] = value</code> avoids the ambiguity entirely: pandas resolves the row and column selection together and writes straight into the parent's arrays. This is why the fix is always \"collapse the two brackets into one <code>.loc</code>.\"</p>" +
      "<p><code>.at</code>/<code>.iat</code> skip the machinery that supports slices, lists, and masks, taking a fast path for exactly one label/position pair — measurably quicker inside tight loops over individual cells.</p>",

    challenge: {
      prompt:
        "Given the DataFrame below (indexed by employee id string), (1) select just the 'salary' column as a Series, then as a 1-column DataFrame; (2) use a single .loc call to give everyone earning under 100 a raise to exactly 100; (3) show that df.loc['e2':'e4'] returns 3 rows because the stop label is inclusive.",
      starter:
        "import pandas as pd\n" +
        "df = pd.DataFrame(\n" +
        "    {'name': ['Asha','Ravi','Mia','Sam','Zoe'], 'salary': [120,90,80,100,85]},\n" +
        "    index=['e1','e2','e3','e4','e5'],\n" +
        ")\n" +
        "# TODO: (1) Series vs DataFrame, (2) single-.loc raise, (3) inclusive slice\n",
      solution:
        "import pandas as pd\n" +
        "df = pd.DataFrame(\n" +
        "    {'name': ['Asha','Ravi','Mia','Sam','Zoe'], 'salary': [120,90,80,100,85]},\n" +
        "    index=['e1','e2','e3','e4','e5'],\n" +
        ")\n" +
        "print(type(df['salary']))        # <class 'pandas.core.series.Series'>\n" +
        "print(type(df[['salary']]))      # <class 'pandas.core.frame.DataFrame'>\n" +
        "\n" +
        "df.loc[df['salary'] < 100, 'salary'] = 100   # one .loc, no chaining\n" +
        "print(df)\n" +
        "\n" +
        "print(df.loc['e2':'e4'])         # 3 rows: e2, e3, e4 (stop INCLUDED)\n" +
        "# .loc raise mutates the real df; the label slice includes 'e4'."
    }
  },

  {
    id: "filtering-and-boolean",
    title: "Filtering & Boolean",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Keep the rows you want with boolean masks — combine conditions with & | ~ and parentheses, never Python and/or.",

    whatIsIt: [
      "A <b>boolean mask</b> is a Series of True/False the same length as the DataFrame. <code>df['x'] > k</code> builds one; <code>df[mask]</code> keeps only the rows where it is True.",
      "Combine masks with the <b>bitwise</b> operators <code>&</code> (and), <code>|</code> (or), <code>~</code> (not) — and <b>wrap each condition in parentheses</b>, because <code>&</code>/<code>|</code> bind tighter than the comparison operators.",
      "Python's <code>and</code>/<code>or</code> do <b>not</b> work on Series — they try to take a single truth value of the whole array and raise <code>ValueError: The truth value of a Series is ambiguous</code>. Always use <code>&</code>/<code>|</code>.",
      "Handy shortcuts: <code>.isin([...])</code> for membership, <code>.between(lo, hi)</code> for ranges (inclusive by default), and <code>.query('x > 5 and y == \"N\"')</code> for a readable string form where <code>and</code>/<code>or</code> <i>are</i> allowed.",
      "Pair a mask with <code>.loc</code> to <b>filter and assign together</b>: <code>df.loc[mask, 'col'] = value</code>."
    ],

    showMe: {
      code:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'name':   ['Asha','Ravi','Mia','Sam','Zoe'],\n" +
        "    'dept':   ['Eng','Eng','Sales','Sales','Ops'],\n" +
        "    'salary': [120, 100, 80, 90, 85],\n" +
        "})\n" +
        "\n" +
        "# a single mask\n" +
        "print(df[df['salary'] > 90])\n" +
        "\n" +
        "# combine masks: & | ~  with PARENTHESES around each condition\n" +
        "print(df[(df['dept'] == 'Sales') & (df['salary'] >= 85)])\n" +
        "\n" +
        "# isin / between / query\n" +
        "print(df[df['dept'].isin(['Eng', 'Ops'])])\n" +
        "print(df[df['salary'].between(85, 100)])     # inclusive both ends\n" +
        "print(df.query('salary > 90 and dept == \"Eng\"'))\n" +
        "\n" +
        "# filter + assign in one step\n" +
        "df.loc[df['salary'] < 90, 'salary'] = 90\n" +
        "print(df)",
      caption:
        "Each filter returns only the matching rows. between(85,100) includes both endpoints. query lets you write and/or as words. The final .loc floors every salary below 90 up to 90, editing df in place."
    },

    whyMatters:
      "<p>Filtering is step one of almost every analysis — \"just the rows where...\" — and the operators trip up nearly everyone at first. Two rules prevent the most common errors:</p>" +
      "<ul>" +
      "<li><b>Use <code>&amp;</code> <code>|</code> <code>~</code>, not <code>and</code> <code>or</code> <code>not</code>.</b> The Python keywords demand a single truth value and blow up on an array with the classic \"truth value is ambiguous\" error.</li>" +
      "<li><b>Parenthesize every condition.</b> <code>df['a'] &gt; 1 &amp; df['b'] &lt; 2</code> parses as <code>df['a'] &gt; (1 &amp; df['b']) &lt; 2</code> and misbehaves; write <code>(df['a'] &gt; 1) &amp; (df['b'] &lt; 2)</code>.</li>" +
      "</ul>" +
      "<p><code>.isin</code>, <code>.between</code>, and <code>.query</code> make the common cases readable and cut down on parenthesis mistakes.</p>",

    recognize: [
      { q: "\"rows where column meets a condition\"", think: "df[df['col'] > k] — boolean mask" },
      { q: "\"rows meeting two+ conditions\"", think: "df[(cond1) & (cond2)] — bitwise ops, parentheses" },
      { q: "\"column value is one of a set\"", think: "df[df['col'].isin([...])]" },
      { q: "\"value within a numeric/date range\"", think: "df[df['col'].between(lo, hi)] — inclusive by default" },
      { q: "\"a readable multi-condition filter\"", think: "df.query('a > 5 and b == \"N\"')" },
      { q: "\"ValueError: truth value of a Series is ambiguous\"", think: "you used and/or; switch to & / |" }
    ],

    matchTags: ["filter", "filtering", "boolean", "mask", "query", "isin", "between",
                "condition", "where", "bitwise", "select-rows"],

    traps: [
      {
        bad: "df[df['dept'] == 'Eng' and df['salary'] > 100]   # ValueError: ambiguous",
        good: "df[(df['dept'] == 'Eng') & (df['salary'] > 100)]   # bitwise & + parentheses",
        why: "Python's `and` needs one True/False, but a mask is an array of many. Use `&` and wrap each comparison in parentheses."
      },
      {
        bad: "df[df['a'] > 1 & df['b'] < 2]   # parses as df['a'] > (1 & df['b']) < 2",
        good: "df[(df['a'] > 1) & (df['b'] < 2)]   # parenthesize each condition",
        why: "`&` has higher precedence than `>` and `<`, so without parentheses pandas combines the wrong operands and raises or returns garbage."
      },
      {
        bad: "df[df['dept'] == 'Eng' | df['dept'] == 'Ops']   # precedence bug",
        good: "df[df['dept'].isin(['Eng', 'Ops'])]   # clearer, no precedence traps",
        why: "Chaining == with | invites precedence mistakes. For membership in a set of values, .isin([...]) is shorter and safer."
      }
    ],

    complexity: [
      { op: "df['x'] > k (build a mask)", big_o: "O(n)", note: "One vectorized comparison pass producing a boolean Series." },
      { op: "df[mask] (apply the mask)", big_o: "O(n)", note: "Scans the mask and copies the True rows into a new frame." },
      { op: ".isin([...])", big_o: "O(n + m)", note: "Builds a hash set of the m values, then one O(n) membership pass." },
      { op: ".query('...')", big_o: "O(n)", note: "Parses the expression once, then evaluates it vectorized — same cost as the equivalent mask." }
    ],

    engineNote:
      "<p><b>Under the hood.</b> A mask is an ordinary boolean Series (a NumPy bool array). <code>df[mask]</code> uses <b>boolean indexing</b>: NumPy walks the array and gathers exactly the positions marked True into a new frame — so filtering returns a copy, not a view, which is why you assign through <code>df.loc[mask, col]</code> rather than into the filtered result.</p>" +
      "<p>The operators <code>&amp;</code> <code>|</code> <code>~</code> are Python's <b>bitwise</b> operators, which pandas overloads to combine masks element-wise. Python's <code>and</code>/<code>or</code> cannot be overloaded that way — they call <code>__bool__</code> on the whole Series, which pandas refuses (\"ambiguous\") because a multi-element array has no single truth value. And because bitwise operators outrank comparisons in precedence, the parentheses are mandatory.</p>" +
      "<p><code>.query()</code> parses its string into an expression tree and evaluates it against the columns (optionally via <code>numexpr</code> for large frames), which is why it can accept the words <code>and</code>/<code>or</code> and reference columns by bare name.</p>",

    challenge: {
      prompt:
        "From the orders DataFrame, select rows where region is 'N' OR 'S' AND amount is between 100 and 300 (inclusive). Write it once with & | and parentheses, and once with .isin plus .between, and confirm both give the same rows. Then use a single .loc to add a 10% surcharge to every order over 200.",
      starter:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'region': ['N','N','S','E','S'],\n" +
        "    'amount': [100.0, 350.0, 300.0, 150.0, 90.0],\n" +
        "})\n" +
        "# TODO: two equivalent filters, then a single-.loc surcharge on amount > 200\n",
      solution:
        "import pandas as pd\n" +
        "df = pd.DataFrame({\n" +
        "    'region': ['N','N','S','E','S'],\n" +
        "    'amount': [100.0, 350.0, 300.0, 150.0, 90.0],\n" +
        "})\n" +
        "m1 = ((df['region'] == 'N') | (df['region'] == 'S')) & df['amount'].between(100, 300)\n" +
        "m2 = df['region'].isin(['N', 'S']) & df['amount'].between(100, 300)\n" +
        "print(df[m1])\n" +
        "print(df[m2])\n" +
        "print('same rows:', df[m1].equals(df[m2]))   # True\n" +
        "\n" +
        "df.loc[df['amount'] > 200, 'amount'] *= 1.10   # surcharge, one .loc call\n" +
        "print(df)\n" +
        "# both masks keep N(100) and S(300); the surcharge only lifts amounts > 200."
    }
  }
]);
