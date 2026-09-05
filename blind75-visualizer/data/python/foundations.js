/*
 * data/python/foundations.js — "Foundations" section topics.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Foundations", [
  {
    id: "variables-objects",
    title: "Variables & Objects",
    difficulty: "Beginner",
    estMinutes: 8,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "A Python name isn't a box holding a value — it's a label stuck onto an object.",

    whatIsIt: [
      "In Python a variable is a <b>name that refers to an object</b>. Assignment doesn't copy a value into a box; it points a name at an object that lives somewhere in memory.",
      "So <code>b = a</code> doesn't duplicate anything — now <b>both names point at the same object</b>. <code>id(x)</code> shows an object's identity (roughly, its address).",
      "This is why <code>is</code> (same object?) and <code>==</code> (same value?) are different questions — and why mutating through one name can surprise you through another."
    ],

    showMe: {
      code:
        "a = [1, 2, 3]\n" +
        "b = a              # b points at the SAME list, no copy\n" +
        "b.append(4)\n" +
        "a                  # -> [1, 2, 3, 4]   a saw it too!\n" +
        "\n" +
        "a is b             # -> True   (same object)\n" +
        "a == b             # -> True   (same contents)\n" +
        "\n" +
        "a = a + [5]        # rebinding: a now points at a NEW list\n" +
        "a is b             # -> False",
      caption: "b = a binds a second name to one object. Rebinding a (a = ...) just re-points the label — b is unaffected."
    },

    whyDsa:
      "<p>Passing a list into a function passes the <b>same object</b>, not a copy. If the function does <code>arr.append(x)</code>, the caller's list changes too — that's how in-place algorithms (sorting, two-pointer swaps) mutate the input on purpose.</p>" +
      "<pre class=\"why-pre\">def push(stack, x):\n    stack.append(x)   → caller's list really grows\n\ndef rebind(stack):\n    stack = stack + [0]  → local name only; caller sees nothing</pre>" +
      "<p>Knowing whether you <b>mutated</b> an object or <b>rebound</b> a name is the difference between a working algorithm and a silent bug.</p>",

    recognize: [
      { q: "“Is this the exact same object, or just an equal one?”", think: "identity → a is b (and id())" },
      { q: "“Do these two things hold the same value?”", think: "equality → a == b" },
      { q: "“Is this variable empty / not set yet?”", think: "x is None — None is a singleton, so identity is the idiom" },
      { q: "“Why did my other variable change when I only touched this one?”", think: "both names point at one mutable object → copy it first" }
    ],

    matchTags: ["variables", "references", "identity", "mutability", "aliasing", "none"],
    relatedProblems: [],

    traps: [
      {
        bad: "if x == None:",
        good: "if x is None:",
        why: "None is a single, unique object, so identity is exact and fast — x is None is the Python idiom. == can be fooled by a class that overrides __eq__."
      },
      {
        bad: "b = a          # a is a list\nb.append(9)    # a changed too!",
        good: "b = a.copy()   # or a[:], or list(a)\nb.append(9)    # a is untouched",
        why: "b = a makes two names for ONE list. For an independent object you must copy it explicitly."
      },
      {
        bad: "if flag is True:",
        good: "if flag:",
        why: "Compare values, not identities, for booleans and numbers. is asks 'same object', which is not what you mean — just test truthiness."
      }
    ],

    cpython:
      "<p>Everything in Python is an object with an identity, a type, and a value. <code>id(x)</code> returns that identity; <code>a is b</code> is just <code>id(a) == id(b)</code>.</p>" +
      "<p><b>CPython detail:</b> small integers (from -5 to 256) and short strings are <i>interned</i> — cached and reused — so <code>x = 100; y = 100; x is y</code> is often True. Never rely on this: it's an optimization, not a language rule. Use <code>==</code> to compare values.</p>",

    complexity: [
      { op: "name lookup (x)", big_o: "O(1)", note: "Resolving a name to its object is a constant-time dictionary/array lookup — it doesn't depend on how big the object is." },
      { op: "a is b", big_o: "O(1)", note: "Just compares two identities (addresses); it never looks inside the objects, so it's constant time no matter how large they are." },
      { op: "a == b", big_o: "O(1) to O(n)", note: "For simple scalars it's constant, but for containers it may compare element by element, so equality on two long lists or strings can cost O(n)." },
      { op: "id(x)", big_o: "O(1)", note: "Reads the object's identity directly — constant time." }
    ],

    challenge: {
      prompt: "After a = [1, 2]; b = a; b.append(3), what is a? Then a = a + [4] runs — now is a still the same object as b?",
      starter: "a = [1, 2]\nb = a\nb.append(3)\n# what is a?\na = a + [4]\n# a is b ?\n",
      solution:
        "a = [1, 2]\nb = a\nb.append(3)\n# a is [1, 2, 3]  (b mutated the shared list)\na = a + [4]\n# a is [1, 2, 3, 4], b is [1, 2, 3]\n# a is b  ->  False  (a was rebound to a new list)"
    }
  },

  {
    id: "numbers-booleans",
    title: "Numbers & Booleans",
    difficulty: "Beginner",
    estMinutes: 8,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "Python ints never overflow, floats can't be trusted with ==, and True is quietly just 1.",

    whatIsIt: [
      "Python <code>int</code>s are <b>arbitrary precision</b> — they grow as large as memory allows, with no overflow. In many languages you'd fight a 64-bit ceiling; here you just don't.",
      "<code>float</code>s are binary approximations, so <code>0.1 + 0.2 != 0.3</code>. Never compare floats with <code>==</code>.",
      "<code>bool</code> is a <b>subclass of int</b>: <code>True == 1</code> and <code>False == 0</code>. That means you can <i>sum booleans</i> to count how many conditions were true."
    ],

    showMe: {
      code:
        "2 ** 200           # a 61-digit int, no overflow at all\n" +
        "\n" +
        "0.1 + 0.2          # -> 0.30000000000000004  (not 0.3!)\n" +
        "0.1 + 0.2 == 0.3   # -> False\n" +
        "\n" +
        "True == 1          # -> True   (bool is a subclass of int)\n" +
        "sum([True, False, True])   # -> 2   (counts the Trues)\n" +
        "\n" +
        "7 // 2, 7 % 2      # -> (3, 1)   floor-div and modulo\n" +
        "divmod(7, 2)       # -> (3, 1)   both at once\n" +
        "-7 // 2, -7 % 2    # -> (-4, 1)  floors toward -inf",
      caption: "Big ints just work, floats round, bools are ints, and // floors toward negative infinity (so -7 // 2 is -4)."
    },

    whyDsa:
      "<p>Arbitrary-precision ints are a real advantage: hashing, factorials, big products, or 2^n counts never silently wrap around like they would in a fixed-width language.</p>" +
      "<pre class=\"why-pre\">count = sum(x > 0 for x in nums)   → count positives in one line\nmid = (lo + hi) // 2               → no overflow risk, ever</pre>" +
      "<p>The float trap bites in comparisons and money math. When you must compare, check closeness instead:</p>" +
      "<pre class=\"why-pre\">abs(a - b) < 1e-9        → or math.isclose(a, b)</pre>",

    recognize: [
      { q: "“Could this number get astronomically large?”", think: "no problem → Python int has no overflow" },
      { q: "“Are these two floats equal?”", think: "don't use == → math.isclose or abs(diff) < eps" },
      { q: "“How many items satisfy this condition?”", think: "sum(cond for x in items) — bools add up as 1/0" },
      { q: "“Is this value 'empty' / should I skip it?”", think: "truthiness → 0, '', [], {}, None are all falsy" }
    ],

    matchTags: ["integers", "floats", "booleans", "modulo", "floor division", "truthiness", "overflow"],
    relatedProblems: [],

    traps: [
      {
        bad: "if 0.1 + 0.2 == 0.3:   # never True",
        good: "import math\nif math.isclose(0.1 + 0.2, 0.3):",
        why: "Floats are binary approximations, so tiny rounding error breaks ==. Compare with a tolerance (math.isclose) instead."
      },
      {
        bad: "if len(items) == 0:",
        good: "if not items:",
        why: "Empty containers are already falsy, so not items reads cleaner and works for lists, strings, dicts, and sets alike."
      },
      {
        bad: "# expecting -7 % 2 to be -1 (like C)",
        good: "-7 % 2   # -> 1 in Python",
        why: "Python's % follows the sign of the divisor, not the dividend. This is handy for wrap-around indexing (i % n is always 0..n-1)."
      }
    ],

    cpython:
      "<p>A Python <code>int</code> stores its value in as many machine words as it needs, so it grows without a fixed ceiling — that's the arbitrary precision.</p>" +
      "<p><code>float</code> is an IEEE-754 double (64-bit), which cannot represent 0.1 exactly — that's the source of the rounding, and it's true on every language that uses IEEE floats, not just Python.</p>" +
      "<p><b>CPython detail:</b> because <code>bool</code> subclasses <code>int</code>, <code>True + True == 2</code>. It's legal and occasionally handy, but sum a generator of conditions rather than leaning on it for anything subtle.</p>",

    complexity: [
      { op: "a + b, a * b (small ints)", big_o: "O(1)", note: "For numbers that fit in a machine word this is a single hardware operation — constant time." },
      { op: "a * b (very big ints)", big_o: "O(n) or more", note: "Once integers span many words, arithmetic scales with the number of digits, so giant-number math is not free — it just never overflows." },
      { op: "a // b, a % b, divmod(a, b)", big_o: "O(1)", note: "Floor division and modulo on normal-sized ints are constant time; divmod computes both the quotient and remainder in one call." },
      { op: "bool(x) / truthiness test", big_o: "O(1) to O(n)", note: "For numbers it's constant, but for a container it may need to check emptiness — usually O(1) since len is stored, not counted." }
    ],

    challenge: {
      prompt: "Given nums = [-2, 3, 0, 5, -1], count how many are strictly positive in a single expression using booleans.",
      starter: "nums = [-2, 3, 0, 5, -1]\n# count positives in one line\n",
      solution:
        "nums = [-2, 3, 0, 5, -1]\ncount = sum(x > 0 for x in nums)\n# each (x > 0) is True/False -> 1/0\n# count == 2"
    }
  },

  {
    id: "type-conversion",
    title: "Type Conversion",
    difficulty: "Beginner",
    estMinutes: 8,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "Convert on purpose: strings to lists to mutate them, and back with join — because strings can't be edited in place.",

    whatIsIt: [
      "Python makes you convert types <b>explicitly</b>: <code>int(\"42\")</code>, <code>str(42)</code>, <code>float(\"3.5\")</code>, <code>list(s)</code>, <code>set(nums)</code>, <code>tuple(x)</code>, <code>bool(v)</code>. There's no silent string+number magic.",
      "Since <b>strings are immutable</b>, the common move is <code>list(s)</code> to get an editable list of characters, change it, then <code>\"\".join(chars)</code> to rebuild a string.",
      "To check a type, prefer <code>isinstance(x, int)</code> over <code>type(x) == int</code> — isinstance respects subclasses and reads better."
    ],

    showMe: {
      code:
        "int(\"42\"), str(42), float(\"3.5\")   # explicit, on purpose\n" +
        "list(\"abc\")        # -> ['a', 'b', 'c']\n" +
        "set([1, 1, 2])     # -> {1, 2}   dedupe\n" +
        "\n" +
        "# strings are immutable -> convert, edit, rebuild:\n" +
        "chars = list(\"cat\")\n" +
        "chars[0] = \"b\"\n" +
        "\"\".join(chars)     # -> 'bat'\n" +
        "\n" +
        "int(\"7\")           # -> 7   (parse the number 7)\n" +
        "ord(\"7\") - ord(\"0\")# -> 7   digit value from a char\n" +
        "isinstance(x, int) # prefer this over type(x) == int",
      caption: "list(s) gives editable chars, ''.join(chars) rebuilds a string. int('7') parses; ord/chr map chars <-> codes."
    },

    whyDsa:
      "<p>Half of string problems are really 'edit a string' problems — and you can't, directly. The standard pattern is convert-out and join-back:</p>" +
      "<pre class=\"why-pre\">chars = list(s)      → now mutable\n# ... swap, reverse, replace in place ...\nresult = ''.join(chars)   → O(n), one new string</pre>" +
      "<p>And <code>set(...)</code> is a one-liner to dedupe or to turn an O(n) membership test into O(1):</p>" +
      "<pre class=\"why-pre\">seen = set(nums)\nif x in seen:   → O(1) average, vs O(n) on a list</pre>",

    recognize: [
      { q: "“I need to change characters in a string”", think: "list(s) → edit → ''.join(chars)" },
      { q: "“Remove duplicates / test membership fast”", think: "set(items) — dedupe and O(1) lookups" },
      { q: "“Is this an int / a string / a list?”", think: "isinstance(x, int) — not type(x) == int" },
      { q: "“Turn a digit character into its number”", think: "int(ch) for one digit, or ord(ch) - ord('0')" }
    ],

    matchTags: ["type conversion", "casting", "strings", "join", "isinstance", "ord", "chr", "set"],
    relatedProblems: [],

    traps: [
      {
        bad: "int(\"7\") == \"7\"   # -> False (int vs str)",
        good: "str(7) == \"7\"    # -> True",
        why: "Python won't compare across types as equal. Convert both sides to the same type before comparing."
      },
      {
        bad: "int(ch)          # ch = 'a'  -> ValueError",
        good: "ord(ch) - ord('0')   # only for digit chars, or ord(ch) for the code point",
        why: "int(ch) only works when ch is a digit character. For letters or arbitrary chars, use ord() to get the code point."
      },
      {
        bad: "s[0] = 'b'       # TypeError: strings are immutable",
        good: "chars = list(s)\nchars[0] = 'b'\ns = ''.join(chars)",
        why: "You can't assign into a string. Convert to a list of chars, mutate, then join back into a fresh string."
      }
    ],

    cpython:
      "<p>These converters are really <i>constructors</i>: <code>int</code>, <code>str</code>, <code>list</code>, and friends are types, and calling them builds a new object — the original is never changed in place.</p>" +
      "<p><code>isinstance(x, int)</code> beats <code>type(x) == int</code> because it also matches subclasses — remember <code>bool</code> is a subclass of <code>int</code>, so <code>isinstance(True, int)</code> is True (and often exactly what you want).</p>" +
      "<p><code>ord(ch)</code> returns a character's Unicode code point and <code>chr(n)</code> maps back — the pair behind lowercase-index tricks like <code>ord(ch) - ord('a')</code>.</p>",

    complexity: [
      { op: "int(s), float(s)", big_o: "O(n)", note: "Parsing has to read every character of the string, so the cost scales with the length of the text being parsed." },
      { op: "str(n)", big_o: "O(d)", note: "Building the text form visits each digit, so it scales with the number of digits d — constant for normal-sized numbers." },
      { op: "list(s) / tuple(x)", big_o: "O(n)", note: "Copies every element into the new container, so it costs one pass over the input of length n." },
      { op: "set(items)", big_o: "O(n)", note: "Hashes and inserts each item once (O(1) average per item), so building the set is a single O(n) pass — then lookups are O(1) average." },
      { op: "''.join(chars)", big_o: "O(n)", note: "Walks the sequence once and allocates one final string of the total length — far better than repeated + concatenation, which is a hidden O(n²)." },
      { op: "ord(ch) / chr(n)", big_o: "O(1)", note: "A direct mapping between a single character and its integer code point — constant time." }
    ],

    challenge: {
      prompt: "Write a one-liner-ish routine that reverses the string 'code' by converting to a list and joining back.",
      starter: "s = \"code\"\n# convert to chars, reverse, rebuild\n",
      solution:
        "s = \"code\"\nchars = list(s)\nchars.reverse()\ns = \"\".join(chars)   # 'edoc'\n# (or simply s[::-1], but list/join is the general mutate pattern)"
    }
  }
]);
