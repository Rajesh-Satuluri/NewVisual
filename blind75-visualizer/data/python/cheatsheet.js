/*
 * Python Function Cheatsheet — interview coding-round depth.
 * Consumed by js/cheatsheet.js: window.PYTHON_CHEAT = { groups, rankOrder, essentialCount, fns }.
 * Rendering rules (identical to the PySpark cheatsheet):
 *   - summary, params[].desc, notes  -> innerHTML (escape < > & ; <code>/<b> allowed)
 *   - example, output                -> textContent (PLAIN text, real newlines)
 * Focus: the built-ins, idioms, and stdlib you actually reach for under time
 * pressure in a LeetCode-style round — not the whole language.
 */
window.PYTHON_CHEAT = {
  groups: [
    "Built-ins",
    "Sequences & Slicing",
    "Dicts & Sets",
    "collections",
    "heapq & bisect",
    "itertools",
    "Strings",
    "functools & math"
  ],

  // Global usage ranking — most-reached-for in coding rounds first. Drives the
  // default "Most used" sort, within-category order, and the ★ essential badge.
  rankOrder: [
    // ── Tier 1: the everyday core ──
    "enumerate", "list-comp", "sorted", "dict-get", "zip", "range", "len",
    "dict-comp", "Counter", "defaultdict", "str-join", "str-split", "fstring",
    "sum", "min-max", "deque", "heappush", "heappop", "set-ops", "slicing",
    // ── Tier 2 ──
    "map", "filter", "any-all", "reversed", "dict-items", "unpacking",
    "list-append-pop", "list-sort", "heapify", "heap-nlargest", "bisect",
    "combinations", "permutations", "product", "accumulate", "str-replace",
    "str-strip", "ord-chr", "lru-cache", "abs-round",
    // ── Tier 3 ──
    "list-insert-remove", "list-index-count", "list-extend", "dict-setdefault",
    "dict-update", "set-add", "namedtuple", "heap-pushpop", "insort", "groupby-it",
    "chain", "pairwise", "count-it", "str-find", "str-case", "str-isx",
    "str-count", "str-startswith", "str-pad", "reduce", "cmp-to-key",
    "math-gcd", "math-inf", "pow-mod", "divmod", "isinstance"
  ],

  essentialCount: 20,

  fns: [
    // ============================================================ Built-ins
    {
      id: "enumerate", group: "Built-ins", name: "enumerate",
      signature: "enumerate(iterable, start=0)",
      summary: "Loop over an iterable with a running <b>index</b> — cleaner than <code>range(len(...))</code>.",
      returns: "iterator of (index, item)",
      params: [
        { name: "iterable", type: "iterable", desc: "Any sequence/iterator to walk." },
        { name: "start", type: "int", desc: "First index value (default <code>0</code>). Use <code>1</code> for human-friendly numbering." }
      ],
      example: "for i, x in enumerate(['a','b','c'], start=1):\n    print(i, x)",
      output: "1 a / 2 b / 3 c",
      notes: "Returns a lazy iterator; wrap in <code>list(...)</code> to materialize pairs."
    },
    {
      id: "zip", group: "Built-ins", name: "zip",
      signature: "zip(*iterables, strict=False)",
      summary: "Iterate several sequences in lockstep, pairing element <code>i</code> of each.",
      returns: "iterator of tuples",
      params: [
        { name: "*iterables", type: "iterable", desc: "Two or more iterables. Stops at the <b>shortest</b> one." },
        { name: "strict", type: "bool", desc: "Python 3.10+: raise if lengths differ instead of truncating silently." }
      ],
      example: "names, ages = ['A','B'], [30, 25]\nfor n, a in zip(names, ages):\n    print(n, a)\n# transpose: rows = zip(*matrix)",
      output: "A 30 / B 25",
      notes: "<code>dict(zip(keys, vals))</code> builds a dict; <code>zip(*matrix)</code> transposes rows↔columns."
    },
    {
      id: "sorted", group: "Built-ins", name: "sorted",
      signature: "sorted(iterable, key=None, reverse=False)",
      summary: "Return a <b>new</b> sorted list (does not mutate the input). Stable sort.",
      returns: "list",
      params: [
        { name: "iterable", type: "iterable", desc: "Items to sort." },
        { name: "key", type: "callable", desc: "One-arg function producing the sort value, e.g. <code>key=len</code> or <code>key=lambda x: (x[1], -x[0])</code> for multi-key / mixed-direction." },
        { name: "reverse", type: "bool", desc: "Descending when <code>True</code>." }
      ],
      example: "sorted(['bb','a','ccc'], key=len)\nsorted(pairs, key=lambda p: (-p[1], p[0]))",
      output: "['a', 'bb', 'ccc']",
      notes: "Sort is <b>stable</b>: equal keys keep input order — chain sorts or use tuple keys for tie-breaks. <code>list.sort()</code> sorts in place instead."
    },
    {
      id: "range", group: "Built-ins", name: "range",
      signature: "range(stop) | range(start, stop, step)",
      summary: "Lazy arithmetic sequence — the standard counting loop. <code>stop</code> is <b>exclusive</b>.",
      returns: "range object",
      params: [
        { name: "start", type: "int", desc: "First value (default <code>0</code>)." },
        { name: "stop", type: "int", desc: "One past the last value (exclusive)." },
        { name: "step", type: "int", desc: "Increment; negative counts down (<code>range(n-1, -1, -1)</code>)." }
      ],
      example: "list(range(2, 10, 2))\nfor i in range(len(a)-1, -1, -1): ...",
      output: "[2, 4, 6, 8]",
      notes: "Cheap and lazy — <code>range(10**9)</code> uses no memory. Supports <code>in</code>, indexing, and <code>len</code>."
    },
    {
      id: "len", group: "Built-ins", name: "len",
      signature: "len(obj)",
      summary: "Number of items in a sequence, mapping, or set — O(1).",
      returns: "int",
      params: [
        { name: "obj", type: "sized", desc: "list, tuple, str, dict, set, range… anything implementing <code>__len__</code>." }
      ],
      example: "len('hello')\nlen({'a': 1, 'b': 2})",
      output: "5",
      notes: "Not defined for generators/iterators — materialize first or count manually."
    },
    {
      id: "sum", group: "Built-ins", name: "sum",
      signature: "sum(iterable, start=0)",
      summary: "Add up an iterable of numbers, optionally onto a starting value.",
      returns: "number",
      params: [
        { name: "iterable", type: "iterable", desc: "Numbers to total. Combine with a generator: <code>sum(x*x for x in nums)</code>." },
        { name: "start", type: "number", desc: "Initial accumulator (default <code>0</code>)." }
      ],
      example: "sum(x for x in range(5) if x % 2 == 0)\nsum([[1],[2]], [])  # flatten (small only)",
      output: "6",
      notes: "For floats prefer <code>math.fsum</code> (less rounding error). Don't use <code>sum</code> to concatenate strings — use <code>''.join</code>."
    },
    {
      id: "min-max", group: "Built-ins", name: "min / max",
      signature: "min(iterable, key=None, default=…)",
      summary: "Smallest / largest item, with the same <code>key</code> trick as <code>sorted</code>.",
      returns: "item",
      params: [
        { name: "iterable / *args", type: "iterable", desc: "An iterable, or several positional values (<code>max(a, b, c)</code>)." },
        { name: "key", type: "callable", desc: "Compare by a derived value, e.g. <code>max(words, key=len)</code>." },
        { name: "default", type: "any", desc: "Returned when the iterable is empty (else raises <code>ValueError</code>)." }
      ],
      example: "max(words, key=len)\nmin(nums, default=0)",
      output: "the longest word",
      notes: "<code>key</code> can return a tuple for multi-key comparison. Argmax: <code>max(range(n), key=lambda i: a[i])</code>."
    },
    {
      id: "map", group: "Built-ins", name: "map",
      signature: "map(func, *iterables)",
      summary: "Apply a function to every item lazily. Often a comprehension reads clearer.",
      returns: "iterator",
      params: [
        { name: "func", type: "callable", desc: "Applied to each item; with N iterables it takes N args." },
        { name: "*iterables", type: "iterable", desc: "One or more; stops at the shortest." }
      ],
      example: "nums = list(map(int, input().split()))\nlist(map(str.upper, ['a','b']))",
      output: "parse a line of ints",
      notes: "<code>map(int, tokens)</code> is the idiomatic input parser. Lazy — wrap in <code>list</code> to reuse."
    },
    {
      id: "filter", group: "Built-ins", name: "filter",
      signature: "filter(func, iterable)",
      summary: "Keep items where <code>func(item)</code> is truthy. A comprehension is usually clearer.",
      returns: "iterator",
      params: [
        { name: "func", type: "callable | None", desc: "Predicate. <code>None</code> keeps truthy items (drops <code>0</code>, <code>''</code>, <code>None</code>…)." },
        { name: "iterable", type: "iterable", desc: "Source items." }
      ],
      example: "list(filter(None, [0, 1, '', 'x']))\nlist(filter(lambda n: n % 2, nums))",
      output: "[1, 'x']",
      notes: "Lazy iterator. <code>[x for x in xs if pred(x)]</code> is the common alternative."
    },
    {
      id: "any-all", group: "Built-ins", name: "any / all",
      signature: "any(iterable) | all(iterable)",
      summary: "<code>any</code>: is at least one truthy? <code>all</code>: are they all truthy? Both <b>short-circuit</b>.",
      returns: "bool",
      params: [
        { name: "iterable", type: "iterable", desc: "Often a generator of booleans, e.g. <code>all(x &gt; 0 for x in nums)</code>." }
      ],
      example: "all(a[i] <= a[i+1] for i in range(len(a)-1))\nany(c.isdigit() for c in s)",
      output: "True if sorted ascending",
      notes: "<code>all([])</code> is <code>True</code>, <code>any([])</code> is <code>False</code>. Stop early on the first decisive item."
    },
    {
      id: "reversed", group: "Built-ins", name: "reversed",
      signature: "reversed(seq)",
      summary: "Iterate a sequence back-to-front without copying.",
      returns: "iterator",
      params: [
        { name: "seq", type: "sequence", desc: "Must support <code>len</code> and indexing (list, tuple, str, range)." }
      ],
      example: "for x in reversed(a): ...\n''.join(reversed('abc'))",
      output: "walks a from last to first",
      notes: "For a reversed <b>copy</b> of a list use <code>a[::-1]</code>; <code>reversed</code> is lazier."
    },
    {
      id: "abs-round", group: "Built-ins", name: "abs / round",
      signature: "abs(x) | round(x, ndigits=None)",
      summary: "Magnitude, and rounding to N decimals (banker's rounding).",
      returns: "number",
      params: [
        { name: "x", type: "number", desc: "Value to transform." },
        { name: "ndigits", type: "int", desc: "Decimal places for <code>round</code>; omit for nearest int." }
      ],
      example: "abs(-7)\nround(2.675, 2)   # 2.67 (banker's rounding)",
      output: "7",
      notes: "<code>round</code> uses round-half-to-even — <code>round(0.5)==0</code>. Use <code>decimal</code>/<code>format</code> for money."
    },
    {
      id: "divmod", group: "Built-ins", name: "divmod",
      signature: "divmod(a, b)",
      summary: "Quotient and remainder in one call — handy for digit / grid math.",
      returns: "(quotient, remainder)",
      params: [
        { name: "a", type: "int|float", desc: "Dividend." },
        { name: "b", type: "int|float", desc: "Divisor." }
      ],
      example: "q, r = divmod(17, 5)\nrow, col = divmod(idx, ncols)",
      output: "(3, 2)",
      notes: "Great for converting a flat index to (row, col) or peeling digits: <code>n, d = divmod(n, 10)</code>."
    },
    {
      id: "isinstance", group: "Built-ins", name: "isinstance",
      signature: "isinstance(obj, class_or_tuple)",
      summary: "Runtime type check that respects inheritance.",
      returns: "bool",
      params: [
        { name: "obj", type: "any", desc: "Value to test." },
        { name: "class_or_tuple", type: "type | tuple", desc: "A type, or a tuple to match any of several: <code>isinstance(x, (int, float))</code>." }
      ],
      example: "isinstance(x, (list, tuple))\nif isinstance(node, TreeNode): ...",
      output: "True / False",
      notes: "Prefer over <code>type(x) == T</code> (that ignores subclasses). Beware <code>bool</code> is a subclass of <code>int</code>."
    },

    // ==================================================== Sequences & Slicing
    {
      id: "slicing", group: "Sequences & Slicing", name: "slice",
      signature: "seq[start:stop:step]",
      summary: "Extract a subsequence (a <b>copy</b> for lists/strings). All parts optional.",
      returns: "same type as seq",
      params: [
        { name: "start", type: "int", desc: "First index (inclusive, default 0). Negatives count from the end." },
        { name: "stop", type: "int", desc: "End index (exclusive, default len)." },
        { name: "step", type: "int", desc: "Stride; <code>-1</code> reverses." }
      ],
      example: "a[1:4]      # items 1,2,3\na[::-1]     # reversed copy\na[::2]      # every other\na[:] = [ ] # clear in place",
      output: "a shallow copy of the range",
      notes: "Out-of-range bounds are clamped (no error). Slice assignment <code>a[i:j] = [...]</code> can resize a list."
    },
    {
      id: "list-comp", group: "Sequences & Slicing", name: "list / set / dict comprehension",
      signature: "[expr for x in it if cond]",
      summary: "Build a collection in one pass — the Pythonic map+filter. Nest for grids.",
      returns: "list / set / dict",
      params: [
        { name: "expr", type: "expression", desc: "Value produced per item; use <code>{k: v ...}</code> for dict, <code>{expr ...}</code> for set." },
        { name: "for x in it", type: "clause", desc: "One or more; later loops are inner: <code>[c for row in grid for c in row]</code> flattens." },
        { name: "if cond", type: "clause", desc: "Optional filter. A trailing <code>if/else</code> goes in <code>expr</code> instead." }
      ],
      example: "[x*x for x in range(5) if x % 2 == 0]\ngrid = [[0]*cols for _ in range(rows)]",
      output: "[0, 4, 16]",
      notes: "<b>Trap:</b> <code>[[0]*c]*r</code> shares one row — always use the <code>for _ in range(r)</code> form. Use <code>(...)</code> for a lazy generator."
    },
    {
      id: "list-append-pop", group: "Sequences & Slicing", name: "list.append / pop",
      signature: "a.append(x) | a.pop(i=-1)",
      summary: "Amortized-O(1) push/pop at the end — a list is your default stack.",
      returns: "None / popped item",
      params: [
        { name: "x", type: "any", desc: "Item to append at the end." },
        { name: "i", type: "int", desc: "Index to pop (default last). <code>pop(0)</code> is O(n) — use a <code>deque</code> for a queue." }
      ],
      example: "stack = []\nstack.append(5)\ntop = stack.pop()",
      output: "top == 5",
      notes: "<code>append</code> returns <code>None</code> — never <code>a = a.append(x)</code>. For left-end ops use <code>collections.deque</code>."
    },
    {
      id: "list-sort", group: "Sequences & Slicing", name: "list.sort",
      signature: "a.sort(key=None, reverse=False)",
      summary: "Sort a list <b>in place</b> (returns <code>None</code>). Same <code>key</code>/<code>reverse</code> as <code>sorted</code>.",
      returns: "None",
      params: [
        { name: "key", type: "callable", desc: "Derived sort value; tuple keys for multi-level sorts." },
        { name: "reverse", type: "bool", desc: "Descending when <code>True</code>." }
      ],
      example: "intervals.sort(key=lambda x: x[0])\na.sort(reverse=True)",
      output: "a is now sorted in place",
      notes: "Use when you don't need the original order and want to avoid a copy. Returns <code>None</code> — don't assign it."
    },
    {
      id: "list-insert-remove", group: "Sequences & Slicing", name: "list.insert / remove",
      signature: "a.insert(i, x) | a.remove(x)",
      summary: "Insert at an index / delete the first matching value — both O(n).",
      returns: "None",
      params: [
        { name: "i", type: "int", desc: "Insert position (items shift right)." },
        { name: "x", type: "any", desc: "For <code>remove</code>, the value to delete (<code>ValueError</code> if absent)." }
      ],
      example: "a.insert(0, 'first')\na.remove(42)   # first 42 only",
      output: "None (mutates a)",
      notes: "<code>del a[i]</code> removes by index; <code>a.pop(i)</code> removes and returns it. All O(n) mid-list."
    },
    {
      id: "list-index-count", group: "Sequences & Slicing", name: "list.index / count",
      signature: "a.index(x[, start]) | a.count(x)",
      summary: "First position of a value / how many times it occurs. Both O(n).",
      returns: "int",
      params: [
        { name: "x", type: "any", desc: "Value to locate/count." },
        { name: "start", type: "int", desc: "Optional search start for <code>index</code>." }
      ],
      example: "['a','b','a'].index('a')\n['a','b','a'].count('a')",
      output: "0   then   2",
      notes: "<code>index</code> raises <code>ValueError</code> if missing — guard with <code>if x in a</code>. For frequency of many values use <code>Counter</code>."
    },
    {
      id: "list-extend", group: "Sequences & Slicing", name: "list.extend / +=",
      signature: "a.extend(iterable)",
      summary: "Append every item of another iterable (in place). Unlike <code>append</code>, which adds one item.",
      returns: "None",
      params: [
        { name: "iterable", type: "iterable", desc: "Items appended one by one." }
      ],
      example: "a = [1, 2]\na.extend([3, 4])   # [1,2,3,4]\na += [5]           # same",
      output: "[1, 2, 3, 4]",
      notes: "<code>a.append([3,4])</code> would nest a list instead. <code>a + b</code> builds a new list; <code>+=</code>/<code>extend</code> mutate."
    },
    {
      id: "unpacking", group: "Sequences & Slicing", name: "unpacking / star",
      signature: "a, *rest = seq   |   f(*args, **kw)",
      summary: "Destructure sequences and splat iterables into calls / literals.",
      returns: "—",
      params: [
        { name: "*rest", type: "pattern", desc: "Star target absorbs the middle/tail as a list: <code>first, *mid, last = xs</code>." },
        { name: "*args / **kwargs", type: "call", desc: "Spread a list into positional args / a dict into keyword args." }
      ],
      example: "first, *rest = [1, 2, 3]\nmerged = [*a, *b]\nd = {**d1, **d2}",
      output: "first=1, rest=[2, 3]",
      notes: "Swap without a temp: <code>a, b = b, a</code>. <code>{**d1, **d2}</code> merges dicts (right wins)."
    },

    // ========================================================= Dicts & Sets
    {
      id: "dict-comp", group: "Dicts & Sets", name: "dict comprehension",
      signature: "{k: v for x in it}",
      summary: "Build a dict in one pass — inversion, indexing, grouping keys.",
      returns: "dict",
      params: [
        { name: "k: v", type: "expression", desc: "Key/value produced per item. Later duplicate keys overwrite earlier ones." },
        { name: "for / if", type: "clause", desc: "Same loop/filter clauses as a list comprehension." }
      ],
      example: "{c: i for i, c in enumerate(s)}   # char -> last index\n{v: k for k, v in d.items()}      # invert",
      output: "position lookup by char",
      notes: "Values on duplicate keys: the <b>last</b> wins. Great for building index maps in one line."
    },
    {
      id: "dict-get", group: "Dicts & Sets", name: "dict.get",
      signature: "d.get(key, default=None)",
      summary: "Read a key with a fallback instead of a <code>KeyError</code> — the safe lookup.",
      returns: "value or default",
      params: [
        { name: "key", type: "hashable", desc: "Key to look up." },
        { name: "default", type: "any", desc: "Returned when the key is absent (default <code>None</code>). Does <b>not</b> insert it." }
      ],
      example: "count[c] = count.get(c, 0) + 1\nname = d.get('name', 'anon')",
      output: "manual frequency count",
      notes: "For counting prefer <code>Counter</code>; for auto-inserting defaults use <code>defaultdict</code> or <code>setdefault</code>."
    },
    {
      id: "dict-items", group: "Dicts & Sets", name: "dict.items / keys / values",
      signature: "d.items() | d.keys() | d.values()",
      summary: "Live <b>views</b> for iterating a dict; <code>items()</code> gives (key, value) pairs.",
      returns: "view object",
      params: [
        { name: "—", type: "", desc: "Views reflect later mutations; wrap in <code>list(...)</code> if you'll modify <code>d</code> while looping." }
      ],
      example: "for k, v in d.items():\n    ...\nmax(d, key=d.get)   # key with largest value",
      output: "iterate key/value pairs",
      notes: "Iterating a dict yields its <b>keys</b>. Dicts preserve insertion order (3.7+)."
    },
    {
      id: "dict-setdefault", group: "Dicts & Sets", name: "dict.setdefault",
      signature: "d.setdefault(key, default)",
      summary: "Get <code>key</code>, inserting <code>default</code> first if it's missing — one-liner grouping.",
      returns: "value at key",
      params: [
        { name: "key", type: "hashable", desc: "Key to fetch or create." },
        { name: "default", type: "any", desc: "Inserted and returned when the key is absent." }
      ],
      example: "groups.setdefault(k, []).append(x)",
      output: "append into a per-key list",
      notes: "<code>defaultdict(list)</code> is usually cleaner. <code>default</code> is evaluated every call — avoid expensive expressions."
    },
    {
      id: "dict-update", group: "Dicts & Sets", name: "dict.update / merge",
      signature: "d.update(other) | d | other",
      summary: "Bulk-set keys from another dict/pairs; right side wins on conflicts.",
      returns: "None / dict",
      params: [
        { name: "other", type: "dict | pairs", desc: "Mapping or iterable of (k, v) pairs to merge in." }
      ],
      example: "d.update({'a': 1, 'b': 2})\nmerged = d1 | d2   # 3.9+, new dict",
      output: "d gains a and b",
      notes: "<code>|</code> makes a new dict; <code>|=</code> / <code>update</code> mutate in place."
    },
    {
      id: "set-ops", group: "Dicts & Sets", name: "set operations",
      signature: "a & b | a | b | a - b | a ^ b",
      summary: "O(1) membership plus fast intersection / union / difference / symmetric-diff.",
      returns: "set / bool",
      params: [
        { name: "&amp; | -  ^", type: "operators", desc: "<code>&amp;</code> intersection, <code>|</code> union, <code>-</code> difference, <code>^</code> symmetric difference. <code>x in s</code> is O(1)." }
      ],
      example: "common = set(a) & set(b)\nseen = set(); seen.add(x)\nif x in seen: ...",
      output: "shared elements",
      notes: "Dedupe a list: <code>list(set(a))</code> (order lost — use <code>dict.fromkeys(a)</code> to keep order). Only hashable items."
    },
    {
      id: "set-add", group: "Dicts & Sets", name: "set.add / discard",
      signature: "s.add(x) | s.discard(x) | s.remove(x)",
      summary: "Insert / delete a single element. <code>discard</code> is the no-error remove.",
      returns: "None",
      params: [
        { name: "x", type: "hashable", desc: "Element to add or remove." }
      ],
      example: "seen = set()\nseen.add(v)\nseen.discard(v)  # no error if absent",
      output: "None (mutates s)",
      notes: "<code>remove</code> raises <code>KeyError</code> if missing; <code>discard</code> doesn't. Use a set as your 'visited' marker in BFS/DFS."
    },

    // =========================================================== collections
    {
      id: "Counter", group: "collections", name: "Counter",
      signature: "Counter(iterable_or_mapping)",
      summary: "A dict subclass that <b>tallies</b> hashables — frequencies in one line.",
      returns: "Counter",
      params: [
        { name: "iterable / mapping", type: "iterable | dict", desc: "Items to count, or preset counts. Missing keys read as <code>0</code> (no KeyError)." }
      ],
      example: "c = Counter('mississippi')\nc.most_common(2)     # [('s',4),('i',4)]\nc['x'] += 1          # missing -> 0 then +1",
      output: "Counter({'i':4,'s':4,'p':2,'m':1})",
      notes: "Supports <code>+ - &amp; |</code> between Counters. <code>most_common(k)</code> gives the top-k by count. Perfect for anagram / frequency problems."
    },
    {
      id: "defaultdict", group: "collections", name: "defaultdict",
      signature: "defaultdict(default_factory)",
      summary: "A dict that auto-creates a value on first access — no <code>get</code>/<code>setdefault</code> boilerplate.",
      returns: "defaultdict",
      params: [
        { name: "default_factory", type: "callable", desc: "Zero-arg factory called for missing keys: <code>int</code>→0, <code>list</code>→[], <code>set</code>→set(), <code>lambda: ...</code>." }
      ],
      example: "g = defaultdict(list)\nfor u, v in edges:\n    g[u].append(v)   # adjacency list",
      output: "graph adjacency without KeyError",
      notes: "Merely <b>reading</b> a missing key inserts it — guard membership tests with <code>key in g</code> if that matters."
    },
    {
      id: "deque", group: "collections", name: "deque",
      signature: "deque(iterable, maxlen=None)",
      summary: "Double-ended queue with O(1) push/pop at <b>both</b> ends — the BFS queue & sliding window.",
      returns: "deque",
      params: [
        { name: "iterable", type: "iterable", desc: "Optional initial items." },
        { name: "maxlen", type: "int", desc: "Bounded ring buffer: appending past it drops the opposite end." }
      ],
      example: "q = deque([root])\nnode = q.popleft()\nq.append(child)\nwindow = deque(maxlen=k)",
      output: "FIFO queue for BFS",
      notes: "<code>popleft</code>/<code>appendleft</code> are O(1) (a list's <code>pop(0)</code> is O(n)). Also <code>rotate(n)</code>."
    },
    {
      id: "namedtuple", group: "collections", name: "namedtuple",
      signature: "namedtuple('Name', ['a', 'b'])",
      summary: "A lightweight immutable record with named fields — readable coordinates/nodes.",
      returns: "tuple subclass",
      params: [
        { name: "typename", type: "str", desc: "Class name for reprs." },
        { name: "field_names", type: "list|str", desc: "Field names (list or space-separated string)." }
      ],
      example: "Point = namedtuple('Point', 'x y')\np = Point(1, 2)\np.x, p.y",
      output: "1 2",
      notes: "Behaves like a tuple (unpacks, indexes) but self-documenting. Use <code>@dataclass</code> when you need mutability/methods."
    },

    // ========================================================= heapq & bisect
    {
      id: "heappush", group: "heapq & bisect", name: "heapq.heappush",
      signature: "heapq.heappush(heap, item)",
      summary: "Push onto a <b>min-heap</b> (a plain list) in O(log n). Smallest stays at <code>heap[0]</code>.",
      returns: "None",
      params: [
        { name: "heap", type: "list", desc: "A list maintained in heap order (start with <code>[]</code>)." },
        { name: "item", type: "orderable", desc: "Value or tuple; tuples order by first element, so <code>(priority, task)</code>." }
      ],
      example: "import heapq\nh = []\nheapq.heappush(h, (dist, node))",
      output: "min stays at h[0]",
      notes: "Python only has a <b>min</b>-heap — negate values (or priorities) for a max-heap. Peek with <code>h[0]</code>."
    },
    {
      id: "heappop", group: "heapq & bisect", name: "heapq.heappop",
      signature: "heapq.heappop(heap)",
      summary: "Pop and return the smallest item in O(log n).",
      returns: "smallest item",
      params: [
        { name: "heap", type: "list", desc: "A non-empty heap-ordered list (raises <code>IndexError</code> if empty)." }
      ],
      example: "smallest = heapq.heappop(h)\nwhile h:\n    d, node = heapq.heappop(h)",
      output: "the minimum element",
      notes: "Standard Dijkstra / merge-k-lists loop. Guard with <code>while h:</code>."
    },
    {
      id: "heapify", group: "heapq & bisect", name: "heapq.heapify",
      signature: "heapq.heapify(list)",
      summary: "Rearrange an existing list into a heap <b>in place</b> in O(n) — faster than n pushes.",
      returns: "None",
      params: [
        { name: "list", type: "list", desc: "Mutated into min-heap order." }
      ],
      example: "h = [5, 1, 3]\nheapq.heapify(h)   # h[0] == 1",
      output: "h is now a valid heap",
      notes: "Prefer over pushing items one at a time when you already have them all."
    },
    {
      id: "heap-nlargest", group: "heapq & bisect", name: "heapq.nlargest / nsmallest",
      signature: "heapq.nlargest(k, it, key=None)",
      summary: "Top-k / bottom-k without a full sort — O(n log k). Beats <code>sorted(...)[:k]</code> for small k.",
      returns: "list (sorted)",
      params: [
        { name: "k", type: "int", desc: "How many to return." },
        { name: "iterable", type: "iterable", desc: "Source items." },
        { name: "key", type: "callable", desc: "Optional derived comparison value." }
      ],
      example: "heapq.nlargest(3, nums)\nheapq.nsmallest(2, pts, key=dist)",
      output: "the 3 biggest numbers",
      notes: "For k close to n, a plain <code>sorted</code> is simpler. Result is returned already ordered."
    },
    {
      id: "heap-pushpop", group: "heapq & bisect", name: "heapq.heappushpop / heapreplace",
      signature: "heapq.heappushpop(h, x)",
      summary: "Push then pop (or pop then push) in a single O(log n) op — the fixed-size top-k trick.",
      returns: "popped item",
      params: [
        { name: "h", type: "list", desc: "Heap-ordered list." },
        { name: "x", type: "orderable", desc: "Item to push. <code>heappushpop</code> pushes first; <code>heapreplace</code> pops first." }
      ],
      example: "if len(h) < k: heapq.heappush(h, x)\nelif x > h[0]: heapq.heappushpop(h, x)",
      output: "maintains k largest in a min-heap",
      notes: "Keep the k largest in a size-k <b>min</b>-heap: replace the smallest whenever a bigger one arrives."
    },
    {
      id: "bisect", group: "heapq & bisect", name: "bisect_left / bisect_right",
      signature: "bisect.bisect_left(a, x)",
      summary: "Binary-search the insertion index in a <b>sorted</b> list — O(log n). No manual lo/hi.",
      returns: "int index",
      params: [
        { name: "a", type: "sorted list", desc: "Must already be sorted ascending." },
        { name: "x", type: "orderable", desc: "Target. <code>bisect_left</code> lands before equal items, <code>bisect_right</code> after." },
        { name: "lo, hi", type: "int", desc: "Optional bounds to restrict the search window." }
      ],
      example: "i = bisect.bisect_left(a, x)\nfound = i < len(a) and a[i] == x\ncount_lt = bisect.bisect_left(a, x)",
      output: "leftmost position for x",
      notes: "Count of values &lt; x is <code>bisect_left</code>; count &le; x is <code>bisect_right</code>. Backbone of LIS and range-count problems."
    },
    {
      id: "insort", group: "heapq & bisect", name: "bisect.insort",
      signature: "bisect.insort(a, x)",
      summary: "Insert <code>x</code> keeping the list sorted — the search is O(log n), the shift O(n).",
      returns: "None",
      params: [
        { name: "a", type: "sorted list", desc: "Sorted list, mutated in place." },
        { name: "x", type: "orderable", desc: "Value to insert at the correct spot." }
      ],
      example: "bisect.insort(a, 7)   # a stays sorted",
      output: "a with 7 in order",
      notes: "For many inserts into a large list, a balanced structure (or <code>SortedList</code>) beats the O(n) shift."
    },

    // ============================================================= itertools
    {
      id: "accumulate", group: "itertools", name: "itertools.accumulate",
      signature: "accumulate(it, func=add, initial=None)",
      summary: "Running totals (prefix sums) — or any running fold with a custom function.",
      returns: "iterator",
      params: [
        { name: "it", type: "iterable", desc: "Source values." },
        { name: "func", type: "callable", desc: "Binary combiner (default <code>operator.add</code>); e.g. <code>max</code> for running max, <code>mul</code> for products." },
        { name: "initial", type: "any", desc: "3.8+: seed value prepended before the first item." }
      ],
      example: "list(accumulate([1,2,3,4]))\nlist(accumulate(a, max))",
      output: "[1, 3, 6, 10]",
      notes: "Prefix sums in one line — pair with <code>bisect</code> or a dict for range-sum / subarray problems."
    },
    {
      id: "combinations", group: "itertools", name: "itertools.combinations",
      signature: "combinations(iterable, r)",
      summary: "All unordered <code>r</code>-length selections (no repeats, order ignored).",
      returns: "iterator of tuples",
      params: [
        { name: "iterable", type: "iterable", desc: "Source pool (uses positions, so duplicates in input yield duplicate combos)." },
        { name: "r", type: "int", desc: "Size of each combination." }
      ],
      example: "list(combinations([1,2,3], 2))\n# [(1,2),(1,3),(2,3)]",
      output: "all pairs",
      notes: "<code>combinations_with_replacement</code> allows repeats. Count is C(n, r) — beware blowups for large n."
    },
    {
      id: "permutations", group: "itertools", name: "itertools.permutations",
      signature: "permutations(iterable, r=None)",
      summary: "All ordered arrangements of length <code>r</code> (default: full length).",
      returns: "iterator of tuples",
      params: [
        { name: "iterable", type: "iterable", desc: "Source pool." },
        { name: "r", type: "int", desc: "Length of each arrangement; defaults to len(iterable)." }
      ],
      example: "list(permutations([1,2,3], 2))\n# (1,2)(1,3)(2,1)(2,3)(3,1)(3,2)",
      output: "all ordered pairs",
      notes: "n! growth — fine for tiny n (brute-force / TSP-style). Order matters, unlike combinations."
    },
    {
      id: "product", group: "itertools", name: "itertools.product",
      signature: "product(*iterables, repeat=1)",
      summary: "Cartesian product — flattens nested loops into one, incl. grid neighbors.",
      returns: "iterator of tuples",
      params: [
        { name: "*iterables", type: "iterable", desc: "One tuple emitted per combination across all inputs." },
        { name: "repeat", type: "int", desc: "Repeat a single iterable N times: <code>product(range(3), repeat=2)</code>." }
      ],
      example: "for r, c in product(range(rows), range(cols)):\n    ...\nlist(product('01', repeat=2))",
      output: "every (row, col) cell",
      notes: "<code>product(A, B)</code> replaces a double <code>for</code>. <code>repeat</code> enumerates fixed-length strings/tuples over an alphabet."
    },
    {
      id: "groupby-it", group: "itertools", name: "itertools.groupby",
      signature: "groupby(iterable, key=None)",
      summary: "Group <b>consecutive</b> equal-key runs — run-length encoding, streaks.",
      returns: "iterator of (key, group)",
      params: [
        { name: "iterable", type: "iterable", desc: "Must be <b>sorted by key</b> first, or you only get adjacent runs." },
        { name: "key", type: "callable", desc: "Grouping value per item." }
      ],
      example: "for ch, grp in groupby('aaabbc'):\n    print(ch, len(list(grp)))",
      output: "a 3 / b 2 / c 1",
      notes: "<b>Trap:</b> groups only <b>adjacent</b> items — <code>sorted(...)</code> first for whole-collection grouping. The group is a one-shot iterator."
    },
    {
      id: "chain", group: "itertools", name: "itertools.chain",
      signature: "chain(*iterables) | chain.from_iterable(it)",
      summary: "Concatenate iterables lazily / flatten one level of nesting.",
      returns: "iterator",
      params: [
        { name: "*iterables", type: "iterable", desc: "Streamed one after another." },
        { name: "from_iterable", type: "iterable", desc: "Flatten a nested iterable: <code>chain.from_iterable(grid)</code>." }
      ],
      example: "list(chain([1,2], [3,4]))\nflat = list(chain.from_iterable(rows))",
      output: "[1, 2, 3, 4]",
      notes: "No intermediate list — memory-friendly for concatenating big sequences."
    },
    {
      id: "pairwise", group: "itertools", name: "itertools.pairwise",
      signature: "pairwise(iterable)",
      summary: "Yield overlapping adjacent pairs — perfect for diffs / consecutive checks (3.10+).",
      returns: "iterator of pairs",
      params: [
        { name: "iterable", type: "iterable", desc: "Yields <code>(x0,x1), (x1,x2), ...</code>." }
      ],
      example: "diffs = [b - a for a, b in pairwise(nums)]",
      output: "successive differences",
      notes: "Pre-3.10: <code>zip(a, a[1:])</code>. Handy for 'is it strictly increasing?' style checks."
    },
    {
      id: "count-it", group: "itertools", name: "itertools.count / cycle / repeat",
      signature: "count(start=0, step=1)",
      summary: "Infinite counters and cyclers — pair with <code>zip</code>/<code>islice</code> to bound them.",
      returns: "iterator",
      params: [
        { name: "count", type: "start, step", desc: "Endless arithmetic sequence." },
        { name: "cycle", type: "iterable", desc: "Loops an iterable forever." },
        { name: "repeat", type: "elem, times", desc: "Same value N times (or forever)." }
      ],
      example: "for i, x in zip(count(1), items): ...\nturn = cycle(['X', 'O'])",
      output: "1-based index without len",
      notes: "Always bound infinite iterators (<code>zip</code>, <code>islice</code>, a <code>break</code>) or you loop forever."
    },

    // ================================================================ Strings
    {
      id: "fstring", group: "Strings", name: "f-string",
      signature: "f'{value!r:>10.2f}'",
      summary: "Inline expression formatting — width, precision, alignment, and debug <code>=</code>.",
      returns: "str",
      params: [
        { name: "{expr}", type: "expression", desc: "Any expression, evaluated and inserted." },
        { name: ":spec", type: "format spec", desc: "<code>.2f</code> decimals, <code>&gt;10</code>/<code>&lt;</code>/<code>^</code> align+width, <code>,</code> thousands, <code>b</code>/<code>x</code>/<code>o</code> base, <code>0</code> zero-pad." }
      ],
      example: "f'{name} scored {pct:.1%}'\nf'{n:08b}'   # 8-bit binary\nf'{x=}'      # x=5  (debug)",
      output: "Ann scored 92.0%",
      notes: "<code>f'{x=}'</code> prints <code>x=&lt;value&gt;</code> for quick debugging. Format spec is shared with <code>format()</code> and <code>str.format</code>."
    },
    {
      id: "str-join", group: "Strings", name: "str.join",
      signature: "sep.join(iterable_of_str)",
      summary: "Concatenate strings with a separator — the <b>right</b> way to build a string (O(n)).",
      returns: "str",
      params: [
        { name: "iterable", type: "iterable[str]", desc: "Must yield strings — map non-strings first: <code>','.join(map(str, nums))</code>." }
      ],
      example: "'-'.join(['a','b','c'])\n''.join(reversed(s))\n','.join(map(str, nums))",
      output: "a-b-c",
      notes: "Never build strings with <code>+=</code> in a loop (O(n²)) — collect in a list and <code>join</code> once."
    },
    {
      id: "str-split", group: "Strings", name: "str.split / rsplit / splitlines",
      signature: "s.split(sep=None, maxsplit=-1)",
      summary: "Break a string into a list. Default splits on <b>any run of whitespace</b> and trims ends.",
      returns: "list[str]",
      params: [
        { name: "sep", type: "str", desc: "Delimiter; <code>None</code> = split on whitespace runs (and ignore leading/trailing)." },
        { name: "maxsplit", type: "int", desc: "Max splits; <code>rsplit</code> counts from the right." }
      ],
      example: "'a, b,c'.split(',')\n'  x   y '.split()   # ['x','y']\n'k=v'.split('=', 1)",
      output: "['a', ' b', 'c']",
      notes: "<code>split()</code> vs <code>split(' ')</code> differ on runs/empties. <code>splitlines()</code> handles all newline styles."
    },
    {
      id: "str-replace", group: "Strings", name: "str.replace / translate",
      signature: "s.replace(old, new, count=-1)",
      summary: "Return a copy with substrings swapped (strings are immutable).",
      returns: "str",
      params: [
        { name: "old / new", type: "str", desc: "Substring to find and its replacement." },
        { name: "count", type: "int", desc: "Max replacements (default all)." }
      ],
      example: "'a.b.c'.replace('.', '/')\ns.translate(str.maketrans('', '', string.punctuation))",
      output: "a/b/c",
      notes: "For deleting/mapping many chars at once, <code>str.translate</code> with <code>maketrans</code> is fastest."
    },
    {
      id: "str-strip", group: "Strings", name: "str.strip / lstrip / rstrip",
      signature: "s.strip(chars=None)",
      summary: "Trim leading/trailing whitespace — or any set of characters.",
      returns: "str",
      params: [
        { name: "chars", type: "str", desc: "Set of characters to strip (not a prefix!). Default: whitespace." }
      ],
      example: "'  hi \\n'.strip()\n'xxhixx'.strip('x')   # 'hi'",
      output: "'hi'",
      notes: "<code>strip('ab')</code> removes any of a/b from both ends, not the literal substring. Use <code>removeprefix</code>/<code>removesuffix</code> (3.9+) for that."
    },
    {
      id: "str-find", group: "Strings", name: "str.find / index",
      signature: "s.find(sub) | s.index(sub)",
      summary: "Locate a substring. <code>find</code> returns <code>-1</code> if absent; <code>index</code> raises.",
      returns: "int",
      params: [
        { name: "sub", type: "str", desc: "Substring to search for." },
        { name: "start, end", type: "int", desc: "Optional search window." }
      ],
      example: "'hello'.find('l')\nif s.find('x') != -1: ...",
      output: "2",
      notes: "Membership only? <code>'x' in s</code> is clearer. <code>rfind</code> searches from the right."
    },
    {
      id: "str-case", group: "Strings", name: "str.upper / lower / title / swapcase",
      signature: "s.lower() | s.upper() | s.title()",
      summary: "Case transforms — normalize before comparing case-insensitively.",
      returns: "str",
      params: [
        { name: "—", type: "", desc: "<code>casefold()</code> is the aggressive lower for Unicode-safe comparisons." }
      ],
      example: "if a.lower() == b.lower(): ...\n'hello world'.title()",
      output: "'Hello World'",
      notes: "For robust case-insensitive matching prefer <code>casefold()</code> over <code>lower()</code>."
    },
    {
      id: "str-isx", group: "Strings", name: "str.isdigit / isalpha / isalnum",
      signature: "s.isdigit() | s.isalpha() | s.isalnum()",
      summary: "Character-class tests — validate tokens, filter input.",
      returns: "bool",
      params: [
        { name: "—", type: "", desc: "True only if <b>every</b> char qualifies and the string is non-empty. <code>isspace</code>, <code>islower</code> too." }
      ],
      example: "if tok.isdigit(): n = int(tok)\n''.join(c for c in s if c.isalnum())",
      output: "keep letters+digits only",
      notes: "<code>isdigit</code> accepts some Unicode digits; use <code>str.isdecimal</code> or a try/<code>int</code> for strict parsing."
    },
    {
      id: "str-count", group: "Strings", name: "str.count",
      signature: "s.count(sub[, start[, end]])",
      summary: "Count non-overlapping occurrences of a substring.",
      returns: "int",
      params: [
        { name: "sub", type: "str", desc: "Substring to count." },
        { name: "start, end", type: "int", desc: "Optional slice window." }
      ],
      example: "'banana'.count('a')\n'aaa'.count('aa')   # 1 (non-overlapping)",
      output: "3",
      notes: "Overlaps are not counted — <code>'aaa'.count('aa')</code> is 1, not 2."
    },
    {
      id: "str-startswith", group: "Strings", name: "str.startswith / endswith",
      signature: "s.startswith(prefix) | s.endswith(suffix)",
      summary: "Prefix/suffix test; accepts a <b>tuple</b> to match any of several.",
      returns: "bool",
      params: [
        { name: "prefix/suffix", type: "str | tuple", desc: "One string, or a tuple: <code>name.endswith(('.jpg', '.png'))</code>." }
      ],
      example: "path.endswith(('.py', '.txt'))\nline.startswith('#')",
      output: "True / False",
      notes: "Tuple form avoids chained <code>or</code>s. To strip a matched prefix use <code>removeprefix</code> (3.9+)."
    },
    {
      id: "str-pad", group: "Strings", name: "str.zfill / ljust / rjust / center",
      signature: "s.zfill(w) | s.rjust(w, fill)",
      summary: "Pad a string to a width — zero-pad numbers or align columns.",
      returns: "str",
      params: [
        { name: "width", type: "int", desc: "Target total length; shorter strings get padded." },
        { name: "fillchar", type: "str", desc: "Pad char for <code>ljust</code>/<code>rjust</code>/<code>center</code> (default space)." }
      ],
      example: "'42'.zfill(5)     # '00042'\n'hi'.ljust(6, '.')  # 'hi....'",
      output: "'00042'",
      notes: "f-strings do the same: <code>f'{n:05d}'</code>, <code>f'{s:&lt;6}'</code>. <code>zfill</code> keeps a leading sign correctly."
    },
    {
      id: "ord-chr", group: "Strings", name: "ord / chr",
      signature: "ord(char) | chr(codepoint)",
      summary: "Char ↔ code point — alphabet indexing and char arithmetic.",
      returns: "int / str",
      params: [
        { name: "char", type: "str", desc: "Single character → its Unicode code point." },
        { name: "codepoint", type: "int", desc: "Integer → the character." }
      ],
      example: "ord('a')          # 97\nidx = ord(c) - ord('a')   # 0..25\nchr(ord('a') + 1)  # 'b'",
      output: "letter → 0-based index",
      notes: "A 26-length list indexed by <code>ord(c)-ord('a')</code> is the fast lowercase-frequency table."
    },

    // ======================================================= functools & math
    {
      id: "lru-cache", group: "functools & math", name: "functools.lru_cache / cache",
      signature: "@lru_cache(maxsize=None)",
      summary: "Memoize a function by its args — turns exponential recursion into linear DP.",
      returns: "decorator",
      params: [
        { name: "maxsize", type: "int|None", desc: "Cache capacity; <code>None</code> = unbounded. <code>@cache</code> (3.9+) is the same as <code>lru_cache(None)</code>." }
      ],
      example: "from functools import cache\n@cache\ndef fib(n):\n    return n if n < 2 else fib(n-1) + fib(n-2)",
      output: "fib(50) instantly",
      notes: "All arguments must be <b>hashable</b> (no lists/dicts). Clear with <code>fib.cache_clear()</code>; raise the recursion limit for deep calls."
    },
    {
      id: "reduce", group: "functools & math", name: "functools.reduce",
      signature: "reduce(func, iterable[, initializer])",
      summary: "Fold an iterable to a single value with a binary function.",
      returns: "value",
      params: [
        { name: "func", type: "callable", desc: "Two-arg combiner applied left to right." },
        { name: "iterable", type: "iterable", desc: "Values to fold." },
        { name: "initializer", type: "any", desc: "Optional seed; also the result for an empty iterable." }
      ],
      example: "from functools import reduce\nreduce(lambda a, b: a ^ b, nums)   # XOR all\nreduce(gcd, nums)",
      output: "cumulative XOR",
      notes: "Prefer a plain loop or <code>sum</code>/<code>math.prod</code> when they fit — <code>reduce</code> is easy to over-use."
    },
    {
      id: "cmp-to-key", group: "functools & math", name: "functools.cmp_to_key",
      signature: "sorted(it, key=cmp_to_key(cmp))",
      summary: "Sort by a pairwise comparator when no simple key exists (e.g. custom orderings).",
      returns: "key function",
      params: [
        { name: "cmp", type: "callable", desc: "Two-arg function returning negative / 0 / positive like the old <code>cmp</code>." }
      ],
      example: "def cmp(a, b):\n    return 1 if a+b < b+a else -1\nsorted(nums, key=cmp_to_key(cmp))   # largest number",
      output: "'Largest Number' ordering",
      notes: "Slower than a plain <code>key</code> — use only when the order can't be expressed as a per-item value."
    },
    {
      id: "math-gcd", group: "functools & math", name: "math.gcd / lcm / prod / isqrt",
      signature: "math.gcd(*ints) | math.isqrt(n)",
      summary: "Number-theory helpers: gcd/lcm, integer product, exact integer sqrt.",
      returns: "int",
      params: [
        { name: "gcd/lcm", type: "*int", desc: "Variadic (3.9+): <code>math.gcd(a, b, c)</code>." },
        { name: "isqrt", type: "int", desc: "Floor of √n with no float error — use for prime/divisor loops." },
        { name: "prod", type: "iterable", desc: "Product of an iterable (like <code>sum</code> for ×)." }
      ],
      example: "math.gcd(12, 18)      # 6\nmath.isqrt(17)        # 4\nmath.prod([1,2,3,4])  # 24",
      output: "6",
      notes: "<code>isqrt</code> avoids <code>int(n**0.5)</code> float bugs. <code>comb</code>/<code>perm</code> give binomials directly."
    },
    {
      id: "math-inf", group: "functools & math", name: "float('inf') / -inf",
      signature: "float('inf') | math.inf",
      summary: "Sentinel infinities — safe initial values for min/max scans.",
      returns: "float",
      params: [
        { name: "—", type: "", desc: "Bigger/smaller than any real number; <code>math.nan</code> is the not-a-number sentinel." }
      ],
      example: "best = float('inf')\nfor x in xs: best = min(best, cost(x))",
      output: "seed a running minimum",
      notes: "Any comparison with <code>nan</code> is <code>False</code> (even <code>nan == nan</code>) — test with <code>math.isnan</code>."
    },
    {
      id: "pow-mod", group: "functools & math", name: "pow (modular)",
      signature: "pow(base, exp, mod)",
      summary: "Fast modular exponentiation — <code>(base**exp) % mod</code> without huge intermediates.",
      returns: "int",
      params: [
        { name: "base, exp", type: "int", desc: "Base and (non-negative) exponent." },
        { name: "mod", type: "int", desc: "Modulus. With <code>exp=-1</code> gives the modular inverse (3.8+, prime mod)." }
      ],
      example: "pow(2, 100, 1_000_000_007)\ninv = pow(a, -1, p)   # modular inverse",
      output: "2^100 mod 1e9+7",
      notes: "O(log exp) and memory-safe vs <code>2**100 % m</code>. The 3-arg form is the standard competitive-programming tool."
    }
  ]
};
