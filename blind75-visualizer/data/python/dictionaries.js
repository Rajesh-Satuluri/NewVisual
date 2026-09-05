/*
 * data/python/dictionaries.js — "Dictionaries / Hash Maps" topic.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures", [
  {
    id: "dictionaries",
    title: "Dictionaries",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "The tool you reach for when the question is \u201cHave I seen this before, and what came with it?\u201d",

    whatIsIt: [
      "A dictionary maps a <b>key</b> to a <b>value</b>. You hand it a key and it hands back the value \u2014 without scanning anything.",
      "That \u201cwithout scanning\u201d is the whole point. A list makes you walk every element to find something (<code>O(n)</code>). A dict jumps straight to it in roughly one step (<code>O(1)</code> average).",
      "Reach for a dict whenever you catch yourself thinking <i>\u201cfor each thing, have I already seen \u2026?\u201d</i> or <i>\u201chow many times did \u2026 appear?\u201d</i>"
    ],

    showMe: {
      code:
        "freq = {}\n" +
        "for x in nums:\n" +
        "    freq[x] = freq.get(x, 0) + 1\n" +
        "\n" +
        "# the operations you'll actually reach for:\n" +
        "freq[k]                 # read (KeyError if k is missing)\n" +
        "freq.get(k, 0)          # read with a fallback\n" +
        "k in freq               # membership          O(1) avg\n" +
        "for k, v in freq.items():  ...   # iterate pairs\n" +
        "{k: v for k, v in pairs}   # dict comprehension",
      viz: { type: "dictHash", data: { pairs: [["cat", 3], ["dog", 1], ["fox", 2]] } },
      caption: "A key is hashed to find its slot, then the value is read/written there \u2014 no scanning of other keys."
    },

    whyDsa:
      "<p><b>Without</b> a hash map, \u201cfind two numbers that sum to target\u201d means: for every number, scan the rest of the array.</p>" +
      "<pre class=\"why-pre\">for i in nums:\n    for j in rest:      \u2192 O(n\u00b2)</pre>" +
      "<p><b>With</b> a dict, you remember what you've seen and ask one O(1) question per number.</p>" +
      "<pre class=\"why-pre\">seen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:   \u2192 O(1) average\n        return [seen[target - x], i]\n    seen[x] = i          \u2192 overall O(n)</pre>",

    recognize: [
      { q: "\u201cHow many times have I seen this?\u201d", think: "frequency map \u2192 dict or Counter" },
      { q: "\u201cHave I seen this exact value / its complement before?\u201d", think: "membership \u2192 x in dict (O(1) avg)" },
      { q: "\u201cGiven this key, what's attached to it?\u201d", think: "lookup table \u2192 dict[key] / dict.get(key)" },
      { q: "\u201cGroup these items by some property\u201d", think: "bucket by key \u2192 dict of lists / defaultdict(list)" }
    ],

    matchTags: ["hash map", "hashmap", "hash table", "dictionary", "frequency", "prefix sum", "memoization"],
    relatedProblems: ["two-sum", "group-anagrams", "top-k-frequent-elements", "valid-anagram", "contains-duplicate"],

    traps: [
      {
        bad: "if x in freq:\n    freq[x] += 1\nelse:\n    freq[x] = 1",
        good: "freq[x] = freq.get(x, 0) + 1",
        why: "get(key, default) collapses the check-then-set into one line \u2014 and one dict lookup path. Same O(1), less to get wrong."
      },
      {
        bad: "total = freq[x]        # KeyError if x was never seen",
        good: "total = freq.get(x, 0)",
        why: "Indexing a missing key raises KeyError. Use .get() (or defaultdict) whenever the key may be absent."
      },
      {
        bad: "for k in d:\n    if cond: del d[k]   # RuntimeError",
        good: "for k in list(d):\n    if cond: del d[k]",
        why: "You cannot change a dict's size while iterating it. Iterate over a snapshot \u2014 list(d) \u2014 if you need to delete."
      }
    ],

    cpython:
      "<p>Python's <code>dict</code> is a hash table. A key's <code>__hash__()</code> value picks a slot; if two keys collide, CPython probes for the next open slot (open addressing).</p>" +
      "<p>\u201cO(1) average\u201d assumes a good hash and few collisions \u2014 a deliberately adversarial set of keys can degrade lookups. For interview purposes, treat dict/set lookups as O(1) average.</p>" +
      "<p><b>CPython detail:</b> since 3.7 dicts preserve <i>insertion order</i>. That is a language guarantee now, not just an implementation quirk \u2014 you can rely on iteration order matching insertion order.</p>",

    complexity: [
      { op: "d[key]  (read)", big_o: "O(1) avg", note: "hash \u2192 slot, no scan" },
      { op: "d[key] = v  (write)", big_o: "O(1) avg", note: "amortized; may trigger a resize" },
      { op: "key in d", big_o: "O(1) avg", note: "this is why dicts beat lists for membership" },
      { op: "del d[key]", big_o: "O(1) avg", note: "" },
      { op: "d.keys() / .values() / .items()", big_o: "O(n)", note: "iterating the view; the view object itself is O(1)" },
      { op: "for k in d", big_o: "O(n)", note: "visits every key once, in insertion order" }
    ],

    challenge: {
      prompt: "Given [\"apple\", \"banana\", \"apple\"], build a frequency dictionary mapping each word to its count.",
      starter: "words = [\"apple\", \"banana\", \"apple\"]\nfreq = {}\n# your code here\n",
      solution:
        "words = [\"apple\", \"banana\", \"apple\"]\nfreq = {}\nfor w in words:\n    freq[w] = freq.get(w, 0) + 1\n# {'apple': 2, 'banana': 1}"
    }
  }
]);
