/*
 * data/python/sequences.js — "Strings", "Tuples", "Sets" topics.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures", [
  {
    id: "strings",
    title: "Strings",
    difficulty: "Beginner",
    estMinutes: 10,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "An immutable sequence of characters \u2014 index it and slice it like a list, but you can never change it in place.",

    whatIsIt: [
      "A string is an ordered sequence of characters. You reach into it by <b>index</b> exactly like a list: <code>s[0]</code> is the first char, <code>s[-1]</code> the last.",
      "The one rule that changes everything: a string is <b>immutable</b>. <code>s[i] = 'x'</code> is not a typo you can fix \u2014 it simply doesn't exist. Every 'edit' actually builds a brand-new string.",
      "In DSA strings show up everywhere \u2014 palindromes, anagrams, parsing, sliding-window substring problems \u2014 and the immutability rule quietly decides how fast your solution runs."
    ],

    showMe: {
      code:
        "s = \"HELLO\"\n" +
        "s[0]              # -> 'H'            O(1)\n" +
        "s[-1]             # -> 'O'   (negative index from the end)\n" +
        "s[1:4]            # -> 'ELL'  a NEW string           O(k)\n" +
        "for c in s: ...   # walk char by char                O(n)\n" +
        "\n" +
        "# handy methods you'll reach for constantly:\n" +
        "\"a,b,c\".split(\",\")   # -> ['a', 'b', 'c']\n" +
        "\"\".join([\"a\", \"b\"])  # -> 'ab'   (glue a list back together)\n" +
        "\"lo\" in s            # substring membership   ~O(n*m)",
      viz: { type: "sequence", data: { items: ["H", "E", "L", "L", "O"], label: "s" } },
      caption: "Characters sit at fixed indices \u2014 s[i] is O(1) \u2014 but there is no s[i] = ... : the boxes are read-only."
    },

    whyDsa:
      "<p>Because a string is immutable, building one up with <code>+=</code> in a loop is a hidden trap. Each <code>+=</code> copies the <i>whole</i> string so far into a new one:</p>" +
      "<pre class=\"why-pre\">out = \"\"\nfor c in chars:\n    out += c          \u2192 copies all of out each time \u2192 O(n\u00b2)</pre>" +
      "<p>The fix is to collect the pieces in a list (append is cheap) and join once at the end:</p>" +
      "<pre class=\"why-pre\">parts = []\nfor c in chars:\n    parts.append(c)   \u2192 O(1) amortized each\nout = \"\".join(parts) \u2192 one pass, O(n) total</pre>",

    recognize: [
      { q: "\u201cIs this a palindrome / do these read the same both ways?\u201d", think: "two pointers \u2192 compare s[i] and s[-1-i]" },
      { q: "\u201cAre these two words anagrams?\u201d", think: "count characters \u2192 dict / Counter, or sort both" },
      { q: "\u201cFind the longest substring with some property\u201d", think: "sliding window over indices, never re-slicing" },
      { q: "\u201cI'm building a result character by character\u201d", think: "append to a list, then \"\".join(list) \u2014 not += " }
    ],

    matchTags: ["string", "two pointers", "sliding window", "palindrome", "anagram"],
    relatedProblems: ["valid-palindrome", "valid-anagram", "group-anagrams", "longest-substring-without-repeating-characters", "encode-and-decode-strings"],

    traps: [
      {
        bad: "s = \"cat\"\ns[0] = \"b\"      # TypeError",
        good: "s = \"b\" + s[1:]  # -> 'bat'  (a new string)",
        why: "Strings are immutable \u2014 you cannot assign to s[i]. To 'change' a char, build a new string by slicing around it (or work in a list, then \"\".join)."
      },
      {
        bad: "out = \"\"\nfor c in chars:\n    out += c        # O(n\u00b2) overall",
        good: "parts = []\nfor c in chars:\n    parts.append(c)\nout = \"\".join(parts)   # O(n)",
        why: "Each += rebuilds the entire string, so a loop of them is O(n\u00b2). Collect pieces in a list and join once \u2014 this is the single most common string performance bug."
      },
      {
        bad: "if s.find(\"x\") : ...   # 0 is falsy!",
        good: "if \"x\" in s: ...       # or  if s.find(\"x\") != -1",
        why: "find() returns the index, or -1 if absent. A match at index 0 is falsy, so the truthiness test is wrong. Use 'in' for a yes/no question."
      }
    ],

    cpython:
      "<p>A CPython <code>str</code> is an immutable array of Unicode code points. Because it can never change, Python is free to share and cache strings \u2014 which is why short identical literals can even be the same object.</p>" +
      "<p><code>ord('A')</code> gives the code point <code>65</code> and <code>chr(65)</code> gives it back \u2014 handy for mapping letters to array slots, e.g. <code>ord(c) - ord('a')</code> for a 26-length count table.</p>" +
      "<p>Immutability is also why strings are <b>hashable</b>: they can be dict keys and set members, which most character-counting solutions rely on.</p>",

    complexity: [
      { op: "s[i]", big_o: "O(1)", note: "Jumps straight to character i by address arithmetic \u2014 no scanning, the same cost whether the string has 5 characters or 5 million." },
      { op: "s[a:b]  (slice)", big_o: "O(k)", note: "Copies the k selected characters into a brand-new string. Slicing inside a loop (e.g. s[i:]) is a very common accidental O(n\u00b2)." },
      { op: "sub in s", big_o: "O(n*m)", note: "Substring search scans the text of length n, and at each spot may compare up to m characters of the pattern \u2014 so worst case is about n times m." },
      { op: "\"\".join(parts)", big_o: "O(n)", note: "Walks the pieces once, sizes the result, and copies everything in a single pass \u2014 the correct way to assemble a string from many parts." },
      { op: "s += x  (in a loop)", big_o: "O(n\u00b2)", note: "Each += builds a whole new string by copying all of s so far, so repeating it n times costs O(n\u00b2). Build a list and join instead." },
      { op: "s.split() / s.strip() / s.replace()", big_o: "O(n)", note: "Each scans the string once and returns a new string (or list). They never mutate s \u2014 because they can't \u2014 so remember to capture the return value." }
    ],

    challenge: {
      prompt: "Reverse the string \"code\" WITHOUT using slicing (no s[::-1]). Build the reversed string efficiently.",
      starter: "s = \"code\"\n# build the reverse without s[::-1]\n",
      solution:
        "s = \"code\"\nparts = []\nfor c in s:\n    parts.append(c)\nparts.reverse()\nout = \"\".join(parts)   # 'edoc'\n# (in real code you'd just write s[::-1])"
    }
  },

  {
    id: "tuples",
    title: "Tuples",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "An immutable, fixed record \u2014 a handful of values that travel together, and (unlike a list) can be a dict key or set element.",

    whatIsIt: [
      "A tuple is an ordered, <b>immutable</b> group of values written with commas: <code>(3, 1, 4)</code>. Index it like a list \u2014 <code>t[0]</code> \u2014 but you can never change it.",
      "The everyday use is <b>unpacking</b>: <code>a, b = pair</code> pulls the two values into two names in one line. This is how you swap, return multiple values, and read <code>enumerate</code>/<code>items()</code>.",
      "The DSA superpower: because tuples are immutable they are <b>hashable</b>, so they can be dict keys and set members \u2014 something a list can never do \u2014 and they sort <b>lexicographically</b>, which makes them perfect heap items."
    ],

    showMe: {
      code:
        "t = (3, 1, 4)\n" +
        "t[0]              # -> 3\n" +
        "a, b, c = t       # unpacking: a=3, b=1, c=4\n" +
        "\n" +
        "one = (5,)        # a SINGLETON needs the comma\n" +
        "not_tuple = (5)   # -> just the int 5!\n" +
        "\n" +
        "# unpacking is everywhere:\n" +
        "for i, x in enumerate(nums): ...   # (index, value)\n" +
        "visited.add((r, c))                # coordinate as a set key",
      viz: { type: "sequence", data: { items: [3, 1, 4], label: "t" } },
      caption: "A tuple indexes like a list, but the boxes are frozen \u2014 that immutability is exactly what lets it be hashed."
    },

    whyDsa:
      "<p>A heap needs to know which item is 'smallest'. Store each item as a tuple whose <b>first</b> element is the priority \u2014 tuples compare lexicographically, so the heap orders by priority automatically:</p>" +
      "<pre class=\"why-pre\">import heapq\nheap = []\nheapq.heappush(heap, (dist, node))   # (priority, item)\n\ndist, node = heapq.heappop(heap)      \u2192 smallest dist first\n                                      \u2192 unpacked in one line</pre>" +
      "<p>This <code>(priority, item)</code> tuple is the backbone of Dijkstra, A*, and every 'process the cheapest option next' algorithm.</p>",

    recognize: [
      { q: "\u201cI need a coordinate / pair as a key or a visited marker\u201d", think: "hashable \u2192 tuple (r, c) in a set or dict" },
      { q: "\u201cProcess the smallest / highest-priority item next\u201d", think: "heap of (priority, item) tuples \u2192 heapq" },
      { q: "\u201cReturn several values from a function\u201d", think: "return a, b \u2192 caller unpacks x, y = f()" },
      { q: "\u201cGroup a few related fields that shouldn't change\u201d", think: "lightweight record \u2192 tuple (or namedtuple)" }
    ],

    matchTags: ["heap", "priority queue", "graph", "interval", "dynamic programming"],
    relatedProblems: ["kth-largest-element-in-an-array", "merge-k-sorted-lists", "merge-intervals"],

    traps: [
      {
        bad: "one = (5)      # this is just 5, not a tuple",
        good: "one = (5,)     # the trailing comma makes it a tuple",
        why: "Parentheses don't make a tuple \u2014 the comma does. Without it, (5) is just a parenthesized int. This bites people building single-element tuples."
      },
      {
        bad: "t = (1, 2, 3)\nt[0] = 9       # TypeError",
        good: "t = (9,) + t[1:]   # build a new tuple",
        why: "Tuples are immutable \u2014 no item assignment. If the data genuinely needs to change, you probably wanted a list instead."
      },
      {
        bad: "seen = set()\nseen.add([r, c])   # TypeError: unhashable",
        good: "seen.add((r, c))   # a tuple is hashable",
        why: "Lists can't go in a set or be dict keys because they're mutable and therefore unhashable. Use a tuple for coordinate keys and visited markers."
      }
    ],

    cpython:
      "<p>A tuple is stored much like a list \u2014 an array of pointers \u2014 but with no capacity to grow, so it's a touch smaller and can be safely <b>hashed</b> (its hash is derived from its elements' hashes).</p>" +
      "<p><b>Subtle:</b> a tuple is only hashable if <i>every</i> element is hashable. <code>(1, 2)</code> works as a set member; <code>(1, [2])</code> raises <code>TypeError</code> because it contains a list.</p>",

    complexity: [
      { op: "t[i]", big_o: "O(1)", note: "Direct index by address arithmetic, exactly like a list \u2014 the same cost regardless of the tuple's length." },
      { op: "a, b = t  (unpacking)", big_o: "O(k)", note: "Binds each of the k elements to a name; for the small fixed tuples you use in practice this is effectively constant." },
      { op: "hash(t)", big_o: "O(k)", note: "Combines the hashes of all k elements, which is why every element must itself be hashable \u2014 a tuple with a list inside can't be hashed." },
      { op: "t1 < t2  (comparison)", big_o: "O(k)", note: "Compares element by element left to right and stops at the first difference \u2014 this lexicographic order is what makes (priority, item) heap items sort correctly." },
      { op: "x in t", big_o: "O(n)", note: "Scans the tuple one element at a time \u2014 tuples are for small fixed records, so if you need fast membership use a set instead." }
    ],

    challenge: {
      prompt: "You have points = [(2, 'b'), (1, 'a'), (3, 'c')]. Sort them by the first element and unpack the smallest into num, letter.",
      starter: "points = [(2, 'b'), (1, 'a'), (3, 'c')]\n# sort, then unpack the smallest\n",
      solution:
        "points = [(2, 'b'), (1, 'a'), (3, 'c')]\npoints.sort()          # lexicographic: by first element\nnum, letter = points[0]   # num == 1, letter == 'a'"
    }
  },

  {
    id: "sets",
    title: "Sets",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "An unordered bag of unique, hashable items with O(1) membership \u2014 the tool that turns 'have I seen this?' into one fast question.",

    whatIsIt: [
      "A set is an unordered collection of <b>unique</b> items. Add a duplicate and nothing happens \u2014 it's already there.",
      "Like a dict (it's the same hash table underneath, minus the values), it answers <code>x in s</code> in <b>O(1) average</b> \u2014 no scanning. That single fact is why sets show up in so many efficient solutions.",
      "Reach for a set whenever the question is <i>\u201chave I seen this?\u201d</i>, <i>\u201care there duplicates?\u201d</i>, or <i>\u201cwhich items are in both / either?\u201d</i>"
    ],

    showMe: {
      code:
        "seen = set()          # EMPTY set \u2014 note: {} is an empty DICT!\n" +
        "seen.add(3)\n" +
        "3 in seen             # -> True     O(1) average\n" +
        "seen.discard(9)       # safe: no error if 9 is absent\n" +
        "\n" +
        "# dedup a list in one step:\n" +
        "unique = set([1, 1, 2, 3])   # -> {1, 2, 3}\n" +
        "\n" +
        "# set algebra:\n" +
        "a | b   # union         a & b   # intersection\n" +
        "a - b   # difference",
      viz: { type: "setOps", data: { a: [1, 2, 3, 4], b: [3, 4, 5, 6] } },
      caption: "A set stores only keys \u2014 hashed to slots like a dict \u2014 so membership is a direct O(1) lookup, not a scan. Try the union / intersection / difference buttons."
    },

    whyDsa:
      "<p>Detecting a duplicate by comparing every pair is O(n\u00b2):</p>" +
      "<pre class=\"why-pre\">for i in range(n):\n    for j in range(i+1, n):\n        if nums[i] == nums[j]:   \u2192 O(n\u00b2)</pre>" +
      "<p>A set remembers what you've already passed and asks one O(1) question per item, collapsing it to O(n):</p>" +
      "<pre class=\"why-pre\">seen = set()\nfor x in nums:\n    if x in seen:        \u2192 O(1) average\n        return True      \u2192 duplicate found\n    seen.add(x)          \u2192 overall O(n)</pre>",

    recognize: [
      { q: "\u201cAre there any duplicates?\u201d", think: "set of seen items, or len(set(nums)) != len(nums)" },
      { q: "\u201cHave I already visited this node / cell?\u201d", think: "visited = set(), check before recursing (graphs, DFS/BFS)" },
      { q: "\u201cWhat's common to both / in either collection?\u201d", think: "set intersection a & b / union a | b" },
      { q: "\u201cI keep testing membership against the same list\u201d", think: "convert the list to a set once \u2192 O(1) lookups after" }
    ],

    matchTags: ["set", "hash set", "duplicate", "visited", "graph", "two pointers"],
    relatedProblems: ["contains-duplicate", "longest-consecutive-sequence", "happy-number"],

    traps: [
      {
        bad: "s = {}          # this is an empty DICT, not a set",
        good: "s = set()       # the only way to make an empty set",
        why: "{} always means an empty dict. There is no empty-set literal \u2014 you must write set(). (A non-empty {1, 2} IS a set, though.)"
      },
      {
        bad: "s.remove(9)     # KeyError if 9 isn't present",
        good: "s.discard(9)    # no error if 9 is absent",
        why: "remove() raises KeyError on a missing item; discard() removes if present and stays quiet otherwise. Use discard when absence is fine."
      },
      {
        bad: "s.add([1, 2])   # TypeError: unhashable type: 'list'",
        good: "s.add((1, 2))   # a tuple is hashable",
        why: "Set members must be hashable, so no lists or dicts inside a set. Use a tuple for a coordinate or pair you want to store."
      }
    ],

    cpython:
      "<p>A CPython <code>set</code> is a hash table just like <code>dict</code>, but storing only keys \u2014 same O(1)-average membership, same requirement that elements be hashable, and the same 'unordered' consequence: iteration order is <b>not</b> guaranteed and you should never rely on it.</p>",

    complexity: [
      { op: "x in s", big_o: "O(1) avg", note: "Hashes x and checks its slot directly \u2014 no scanning. This is the whole reason a set turns an O(n\u00b2) 'have I seen it?' loop into O(n)." },
      { op: "s.add(x)", big_o: "O(1) avg", note: "Hashes to a slot and stores it; a duplicate is simply a no-op. Occasionally the table is resized, but that cost averages out." },
      { op: "s.remove(x) / s.discard(x)", big_o: "O(1) avg", note: "Locates the slot by hash and clears it. remove raises KeyError if x is absent; discard stays silent \u2014 same speed, different behavior on a miss." },
      { op: "set(list)  (dedup)", big_o: "O(n)", note: "Hashes and inserts each of the n items once \u2014 a one-pass way to drop duplicates, though it discards the original order." },
      { op: "a & b / a | b / a - b", big_o: "O(min or sum of sizes)", note: "Intersection walks the smaller set checking membership in the other; union and difference scan the sizes involved \u2014 all far cheaper than nested loops." }
    ],

    challenge: {
      prompt: "Given nums = [1, 2, 3, 2, 4, 1], return True if it contains any duplicate, in a single pass.",
      starter: "nums = [1, 2, 3, 2, 4, 1]\nseen = set()\n# your code here\n",
      solution:
        "nums = [1, 2, 3, 2, 4, 1]\nseen = set()\nfor x in nums:\n    if x in seen:\n        # duplicate found -> True\n        break\n    seen.add(x)\n# equivalently: len(set(nums)) != len(nums)"
    }
  }
]);
