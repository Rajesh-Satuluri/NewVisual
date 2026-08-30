/*
 * Blind 75 — Tries (Prefix Trees)
 * =========================================================================
 * Registers the Tries category on the global registry:
 *     window.BLIND75.register("Tries", [ ...problems ]);
 *
 * See data/arrays_hashing.js for the full problem schema documentation.
 *
 * THE TRIE IN ONE PICTURE
 * -----------------------
 * A trie (a.k.a. prefix tree) stores strings by their characters, one
 * character per edge. Every node holds:
 *   - children: a dict mapping a single character -> the child node
 *   - is_end:   a boolean marking "a complete word ends here"
 *
 * Words that share a prefix share the SAME path of nodes for that prefix.
 * Because you descend one node per character, every operation (insert /
 * search / prefix-check) costs O(L) where L is the length of the query word
 * — completely INDEPENDENT of how many words the trie already holds. A hash
 * set answers "is this exact word present?" in O(L) too, but it cannot answer
 * "does ANY stored word start with this prefix?" without scanning everything.
 * The trie's shared-path structure is what makes prefix queries cheap, and it
 * is what lets us prune whole branches of a DFS in Word Search II.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Tries", [
    {
      id: "implement-trie-prefix-tree",
      lc: 208,
      title: "Implement Trie (Prefix Tree)",
      difficulty: "Medium",
      category: "Tries",
      link: "https://leetcode.com/problems/implement-trie-prefix-tree/",
      meta: { pattern: "Prefix Tree", dataStructure: "Trie", technique: "Char-by-char descent" },
      description:
        "Design a **trie** (prefix tree): a data structure that stores strings and answers prefix questions efficiently. Implement the `Trie` class with:\n\n" +
        "- `Trie()` — create an empty trie.\n" +
        "- `insert(word)` — add `word` to the trie.\n" +
        "- `search(word)` — return `true` if the exact `word` was inserted earlier, else `false`.\n" +
        "- `startsWith(prefix)` — return `true` if any previously inserted word begins with `prefix`, else `false`.",
      constraints: [
        "`1 <= word.length, prefix.length <= 2000`",
        "`word` and `prefix` consist only of lowercase English letters.",
        "At most `3 * 10^4` calls in total to `insert`, `search`, and `startsWith`."
      ],
      notes: [
        "`search` requires the WHOLE word to have been inserted (the end node must be marked); `startsWith` only requires the path to exist.",
        "The distinction between the two is entirely the `is_end` flag on the final node."
      ],
      examples: [
        {
          input:
            'insert("apple"); search("apple"); search("app"); startsWith("app"); insert("app"); search("app")',
          output: "true, false, true, true",
          reasoning:
            'After inserting "apple", search("apple") is true. search("app") is false because "app" was never marked as a complete word, even though the path exists. startsWith("app") is true because "apple" begins with it. After inserting "app", search("app") becomes true.',
          visual:
            "```\nAfter insert(\"apple\") and insert(\"app\"):\n\n        (root)\n          |a\n          v\n         [a]\n          |p\n          v\n         [p]\n          |p\n          v\n         [p]*        <- is_end (word \"app\")\n          |l\n          v\n         [l]\n          |e\n          v\n         [e]*        <- is_end (word \"apple\")\n\n* = is_end flag set\nsearch(\"app\")   -> path exists AND node is_end -> True\nsearch(\"ap\")    -> path exists but node not is_end -> False\nstartsWith(\"ap\")-> path exists -> True\n```"
        },
        {
          input: 'insert("cat"); startsWith("ca"); search("ca"); startsWith("dog")',
          output: "true, false, false",
          reasoning:
            'The path c-a exists as a prefix of "cat", so startsWith("ca") is true, but "ca" is not a complete word so search("ca") is false. No word starts with "dog", so that prefix check is false.'
        },
        {
          input: 'search("x") on an empty trie; startsWith("x") on an empty trie',
          output: "false, false",
          reasoning: "With nothing inserted, the root has no children, so both queries fail immediately at the first character."
        },
        {
          input: 'insert("a"); search("a"); startsWith("a")',
          output: "true, true",
          reasoning: "A single-character word marks the child node reached from the root as is_end, satisfying both queries."
        }
      ],
      approaches: [
        {
          name: "Trie with child dictionaries",
          time: "O(L) per operation (L = word length)",
          space: "O(total characters inserted)",
          whenToUse: "The canonical design whenever you need fast prefix membership, autocomplete, or shared-prefix storage.",
          logic:
            "**What it asks.** Build a container that answers two different questions quickly: 'is this EXACT word present?' (which a set already does) and 'does ANY stored word start with this prefix?' (which a set cannot do cheaply). Implement `insert(word)`, `search(word)`, and `startsWith(prefix)`, each ideally running in time proportional only to the length of the string handed in, never to how many words are stored.\n\n" +
            "**Why the naive idea fails.** A `set` of the inserted words nails `search`: membership is `O(L)` to hash the L-character key. But `startsWith` has no shortcut — you would iterate the entire set and test `word.startswith(prefix)` on each, which is `O(number_of_words * L)` per query and degrades linearly as the dictionary grows. Storing the words as one flat, unstructured blob throws away the very thing prefix questions need: the fact that many words share leading characters.\n\n" +
            "**Key Idea.** Words that share a prefix should share the STORAGE for that prefix. Lay every string out character by character along a tree, one character per edge, so the common start `app` of `app` and `apple` becomes a SINGLE path descending from the root. Every question then reduces to 'can I walk this string's path from the root?' — and that walk costs `O(L)` regardless of how many words are stored, because you only ever follow the query's own characters, never anyone else's.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Model each **node** as `children` (a dict mapping one character to the next node) plus a boolean `is_end`. The root is the empty prefix; following one edge consumes exactly one character.\n" +
            "2. `insert(word)`: start at the root and, for each character, create the child node if the edge is missing, then descend into it. After the final character, set the terminal node's `is_end = True`.\n" +
            "3. `search(word)`: walk the word's characters from the root; if any edge is missing return `False`, otherwise return the final node's `is_end` flag.\n" +
            "4. `startsWith(prefix)`: the identical walk, but on reaching the end just return `True` — no `is_end` check.\n\n" +
            "**Why it works.** By construction `children[c]` is exactly the node you reach by reading character `c`, so following a string's characters lands you on the unique node that string spells (or fails at the first absent edge). `is_end` means 'the characters from the root to here form a complete inserted word.' Therefore a word is present iff its full path exists AND its terminal node is flagged — precisely what `insert` guarantees and `search` verifies. A prefix exists iff its path exists, which is all `startsWith` checks. That single `is_end` flag is the entire difference between the two queries.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting `node.is_end = True` at the end of `insert` makes `search` return `False` for words whose path plainly exists.\n" +
            "- Letting `startsWith` check `is_end` is wrong: a genuine prefix that is not itself a full word would then report as absent.\n" +
            "- A single-character word marks the child reached directly from the root — there is nothing to special-case.\n" +
            "- Querying an empty trie must fail cleanly at the first missing child; the `ch not in node.children` guard handles that without a crash.\n\n" +
            "**Complexity.** Every operation is `O(L)` time: at most `L` edges, each an average-`O(1)` dict lookup or insert, and completely independent of the number of stored words. Space is `O(total characters inserted)` in the worst case of no shared prefixes, and less whenever prefixes overlap and paths are reused.\n\n" +
            "**Interview mindset.** The words 'prefix', 'autocomplete', or 'words sharing a start' should immediately make you reach for a trie — a hash set gives exact lookup only. The lone subtlety to state clearly is the `is_end` flag: it is what makes `search` stricter than `startsWith`.",
          rcs:
            "# No imports needed: a trie is just nested dicts wrapped in a small node class.\n\n\n" +
            "class TrieNode:  # One node of the prefix tree; the root, plus one node per character-edge descended.\n" +
            "    def __init__(self):  # Build a fresh, empty node.\n" +
            "        self.children = {}   # Map from a single character to the child TrieNode for that character.\n" +
            "                             # Why a dict: average O(1) lookup and insert per edge is what keeps every operation O(L).\n" +
            "                             # State: an empty dict means no letters branch out of this node yet.\n" +
            "        self.is_end = False  # True only when a COMPLETE inserted word ends exactly at this node.\n" +
            "                             # Why it matters: this single flag is the ONLY thing that separates search from startsWith.\n\n" +
            "class Trie:  # LeetCode creates one Trie object and calls insert / search / startsWith on it.\n" +
            "    def __init__(self):  # Create an empty trie.\n" +
            "        self.root = TrieNode()  # The root stands for the empty prefix; every walk begins here.\n" +
            "                                # State: root.children is empty and root.is_end is False until a word is inserted.\n\n" +
            "    # ==================== PHASE 1: INSERT A WORD ====================\n\n" +
            "    def insert(self, word: str) -> None:  # Add word, creating any nodes its characters do not have yet.\n" +
            "        node = self.root  # Cursor we descend as we read characters; start at the root.\n" +
            "                          # Loop invariant: node is always the node spelled by the characters read so far.\n" +
            "        for ch in word:   # Consume the word one character per edge, left to right.\n" +
            "                          # Execution flow: after each iteration node has moved exactly one level deeper.\n" +
            "            if ch not in node.children:         # Is there no edge yet for this character?\n" +
            "                node.children[ch] = TrieNode()  # Create the missing child so the path can continue.\n" +
            "                                                # State change: node now has an edge labelled ch.\n" +
            "            node = node.children[ch]  # Descend into the child for ch (whether just made or already present).\n" +
            "        node.is_end = True  # After the final character, flag this terminal node as a whole word.\n" +
            "                            # Why: without this, search would find the path but still report the word absent.\n\n" +
            "    # ==================== PHASE 2: EXACT-WORD SEARCH ====================\n\n" +
            "    def search(self, word: str) -> bool:  # True iff this EXACT word was inserted earlier.\n" +
            "        node = self._find(word)  # Walk the whole word's path; node is the terminal node, or None if a step is missing.\n" +
            "        return node is not None and node.is_end  # Present iff the full path exists AND its end node is flagged a word.\n" +
            "                                                 # Why both: a bare path like 'app' under 'apple' is a prefix, not a stored word.\n" +
            "                                                 # Why safe: 'and' short-circuits at node is not None, so is_end is never read on None.\n\n" +
            "    # ==================== PHASE 3: PREFIX CHECK ====================\n\n" +
            "    def startsWith(self, prefix: str) -> bool:  # True iff SOME inserted word begins with prefix.\n" +
            "        return self._find(prefix) is not None  # Reaching the end of the path is enough; is_end is deliberately NOT checked.\n" +
            "                                               # Why: a prefix only has to be walkable, it need not be a complete word itself.\n\n" +
            "    # ==================== PHASE 4: SHARED PATH WALK ====================\n\n" +
            "    def _find(self, s: str) -> 'TrieNode':  # Helper both queries share: follow s char by char, return the node reached or None.\n" +
            "        node = self.root  # One descent implementation reused by search and startsWith.\n" +
            "        for ch in s:      # Follow exactly one edge per character.\n" +
            "                          # Loop invariant: node is the node spelled by the characters of s consumed so far.\n" +
            "            if ch not in node.children:  # A missing edge means no stored word contains this path.\n" +
            "                return None  # Give up now; nothing below runs and control returns to the caller.\n" +
            "                             # Execution flow: search turns this None into False; startsWith turns it into False too.\n" +
            "            node = node.children[ch]  # Descend into the child for ch and continue.\n" +
            "        return node  # The node reached after the final character; its is_end is what search inspects.",
          plain:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}\n" +
            "        self.is_end = False\n" +
            "\n" +
            "class Trie:\n" +
            "    def __init__(self):\n" +
            "        self.root = TrieNode()\n" +
            "\n" +
            "    def insert(self, word: str) -> None:\n" +
            "        node = self.root\n" +
            "        for ch in word:\n" +
            "            if ch not in node.children:\n" +
            "                node.children[ch] = TrieNode()\n" +
            "            node = node.children[ch]\n" +
            "        node.is_end = True\n" +
            "\n" +
            "    def search(self, word: str) -> bool:\n" +
            "        node = self._find(word)\n" +
            "        return node is not None and node.is_end\n" +
            "\n" +
            "    def startsWith(self, prefix: str) -> bool:\n" +
            "        return self._find(prefix) is not None\n" +
            "\n" +
            "    def _find(self, s: str) -> 'TrieNode':\n" +
            "        node = self.root\n" +
            "        for ch in s:\n" +
            "            if ch not in node.children:\n" +
            "                return None\n" +
            "            node = node.children[ch]\n" +
            "        return node"
        }
      ],
      patternRecognition: [
        "Any mention of 'prefix', 'starts with', or 'autocomplete' over a set of words.",
        "You need BOTH exact-word lookup and prefix lookup fast — a hash set gives you only the first.",
        "Many words share leading characters and you want to store/query them by shared path."
      ],
      interviewRecall: [
        "A node = { children dict, is_end flag }. The root is the empty prefix.",
        "search checks is_end at the end; startsWith does not — that single flag is the only difference.",
        "Every operation is O(L) in the query length, independent of how many words are stored."
      ]
    },

    {
      id: "design-add-and-search-words-data-structure",
      lc: 211,
      title: "Design Add and Search Words Data Structure",
      difficulty: "Medium",
      category: "Tries",
      link: "https://leetcode.com/problems/design-add-and-search-words-data-structure/",
      meta: { pattern: "Trie + Wildcard DFS", dataStructure: "Trie", technique: "Backtracking on '.'" },
      description:
        "Design a data structure `WordDictionary` that supports adding words and searching for words, where a search pattern may contain the wildcard `.` that matches **any single character**.\n\n" +
        "- `WordDictionary()` — create the structure.\n" +
        "- `addWord(word)` — store `word`.\n" +
        "- `search(word)` — return `true` if any stored word matches `word`, where each `.` in `word` may stand for any one letter.",
        constraints: [
        "`1 <= word.length <= 25`",
        "`addWord` words consist of lowercase English letters.",
        "`search` words consist of lowercase English letters or `.`.",
        "There are at most `2` dots in a search word for the hard follow-up, but general inputs may contain more.",
        "At most `10^4` calls to `addWord` and `search`."
      ],
      notes: [
        "`.` matches exactly ONE character — it is not a multi-character wildcard.",
        "A search still requires the whole pattern length to line up with a complete stored word (the end node must be is_end)."
      ],
      examples: [
        {
          input:
            'addWord("bad"); addWord("dad"); addWord("mad"); search("pad"); search("bad"); search(".ad"); search("b..")',
          output: "false, true, true, true",
          reasoning:
            '"pad" was never added, so false. "bad" matches exactly. ".ad" matches bad/dad/mad because the dot can be any letter followed by "ad". "b.." matches "bad": b, then any char, then any char.',
          visual:
            "```\nStored: bad, dad, mad\n\n        (root)\n       b/  d|  m\\\n      [b] [d] [m]\n       |a  |a  |a\n      [a] [a] [a]\n       |d  |d  |d\n      [d]*[d]*[d]*      (* = is_end)\n\nsearch(\".ad\"):\n  '.' at root -> try b, d, m branches\n     b -> a -> d* MATCH (also d.., m.. would match)\n```"
        },
        {
          input: 'addWord("a"); search("."); search("a"); search("aa")',
          output: "true, true, false",
          reasoning:
            'search(".") matches the single stored letter "a". search("a") matches exactly. search("aa") needs a two-letter word, and none was stored, so false.'
        },
        {
          input: 'addWord("word"); search("w.r."); search("....")',
          output: "true, true",
          reasoning: 'Both patterns are length 4 and every dot can match the corresponding letter of "word".'
        },
        {
          input: 'addWord("ab"); search("a."); search(".b"); search("..")',
          output: "true, true, true",
          reasoning: 'All three patterns are length 2 and match "ab" by letting each dot stand for the needed letter.'
        }
      ],
      approaches: [
        {
          name: "Trie with wildcard DFS",
          time: "O(L) without dots; O(26^d * L) worst case with d dots",
          space: "O(total characters added) + O(L) recursion",
          whenToUse: "When exact-match prefix storage must also support single-character wildcards in queries.",
          logic:
            "**What it asks.** The same trie as the previous problem, but `search` may now contain the wildcard `.`, which matches any single letter. Return `true` if ANY stored word matches the pattern, where the match must be full-length (a real word, not merely a prefix). `addWord` is unchanged from an ordinary trie insert.\n\n" +
            "**Why the naive idea fails.** For a concrete letter you always know which single edge to follow — or you fail. A `.` gives no such guidance: the correct next node might be any of the current node's children, and you cannot tell which until you look further down the pattern. Keeping just one 'current node' therefore breaks the instant you hit a dot, because you would have to commit to one child with no basis for the choice. The query has become non-deterministic, so a single linear walk is no longer enough.\n\n" +
            "**Key Idea.** Split the two cases by how much choice they carry. A concrete character is deterministic — from the current node follow exactly one edge, or report failure. A `.` is non-deterministic — it could be any child, so **try them all** and succeed if ANY branch leads to a full match. That is a depth-first search with backtracking over the trie, whose state is the pair `(position in the pattern, current node)`. Backtracking is free here: a failed child simply returns `False` and the loop moves on to the next child.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Reuse the plain `TrieNode` (children dict + `is_end`); `addWord` is the ordinary insert that flags the terminal node.\n" +
            "2. Drive `search` with a recursive `dfs(i, node)` starting at `(0, root)`, where `i` indexes the pattern and `node` is where we currently sit in the trie.\n" +
            "3. If `word[i]` is a normal letter, look it up in `node.children`; missing means this branch fails, present means recurse into that one child at `i + 1`.\n" +
            "4. If `word[i]` is `.`, iterate over EVERY child and recurse into each at `i + 1`; return `True` the moment one succeeds, `False` if none do.\n" +
            "5. Base case: when `i` reaches `len(word)`, return `node.is_end` — the consumed characters must spell a complete stored word of exactly this length.\n\n" +
            "**Why it works.** A stored word matches the pattern iff, character by character, each concrete letter equals the word's letter and each dot lines up with some letter — which is exactly the set of root-to-node paths the DFS enumerates. The dot case explores all children so no valid alignment is missed; the letter case prunes to the only edge that could work. The `is_end` base case enforces both that the lengths agree and that the path ends on a genuine word rather than a mid-word prefix. Because each recursive call returns cleanly on failure, every alternative is tried without corrupting any shared state.\n\n" +
            "**Common Gotchas.**\n" +
            "- The base case must return `is_end`, not merely that a node exists — matching only a prefix is not a match.\n" +
            "- `.` consumes exactly ONE trie edge; it is a single-character wildcard, never a multi-character one, so pattern and word length must still agree.\n" +
            "- After the dot loop, remember to return `False` explicitly if no child succeeded — falling through would return `None` and misreport.\n" +
            "- A pattern longer than every stored word hits missing children and fails; a pattern shorter than a word fails the `is_end` check.\n\n" +
            "**Complexity.** With no dots, `search` is a straight `O(L)` walk. Each dot can fan out over up to 26 children, so with `d` dots the worst case is `O(26^d * L)`. Space is the trie itself plus `O(L)` recursion depth on the call stack.\n\n" +
            "**Interview mindset.** 'A wildcard that matches one character' over a dictionary is the classic signal for trie + DFS. State the split out loud: a concrete letter narrows to one child, a dot forks over all children. The general lesson — the moment a query stops telling you which node comes next, switch from a single walk to backtracking over the structure you already have.",
          rcs:
            "# No imports needed: children live in a plain dict and the search is ordinary recursion.\n\n\n" +
            "class TrieNode:  # One node of the trie; identical to the plain-trie node.\n" +
            "    def __init__(self):  # Build a fresh, empty node.\n" +
            "        self.children = {}   # Map from a single character to the child TrieNode for that character.\n" +
            "                             # State: empty means no letters branch out of this node yet.\n" +
            "        self.is_end = False  # True only when a complete added word ends exactly at this node.\n" +
            "                             # Why it matters: the DFS base case returns this flag, so it decides a full match.\n\n" +
            "class WordDictionary:  # LeetCode creates one object and calls addWord / search on it.\n" +
            "    def __init__(self):  # Create the empty structure.\n" +
            "        self.root = TrieNode()  # The root stands for the empty prefix; both add and search start here.\n\n" +
            "    # ==================== PHASE 1: ADD A WORD (plain trie insert) ====================\n\n" +
            "    def addWord(self, word: str) -> None:  # Store word; the wildcard lives entirely in search, never here.\n" +
            "        node = self.root  # Cursor we descend as we read characters.\n" +
            "                          # Loop invariant: node is the node spelled by the characters read so far.\n" +
            "        for ch in word:   # Consume one character per edge, left to right.\n" +
            "            if ch not in node.children:         # No edge yet for this character?\n" +
            "                node.children[ch] = TrieNode()  # Create the missing child so the path can continue.\n" +
            "                                                # State change: node now has an edge labelled ch.\n" +
            "            node = node.children[ch]  # Descend into the child for ch.\n" +
            "        node.is_end = True  # Flag the terminal node so search can recognise a complete word here.\n\n" +
            "    # ==================== PHASE 2: WILDCARD SEARCH (DFS with backtracking) ====================\n\n" +
            "    def search(self, word: str) -> bool:  # True iff some stored word matches word, where '.' matches any one letter.\n" +
            "        def dfs(i: int, node: 'TrieNode') -> bool:  # State = (index i into the pattern, current trie node).\n" +
            "                                                    # Contract: True iff word[i:] can be matched from node down to an is_end node.\n" +
            "            if i == len(word):    # Base case: the whole pattern has been consumed.\n" +
            "                return node.is_end  # Match iff a complete word ends exactly here (lengths line up, not just a prefix).\n" +
            "                                    # Execution flow: returns up to whichever branch called this frame.\n" +
            "            ch = word[i]  # The pattern character we must satisfy at this position.\n" +
            "            if ch == '.':  # Wildcard: it matches ANY one letter, so the next node could be any child.\n" +
            "                for child in node.children.values():  # Non-deterministic: try EVERY branch out of node.\n" +
            "                    if dfs(i + 1, child):  # Recurse one position deeper into this child.\n" +
            "                        return True  # Any branch that reaches a full match wins; stop exploring the rest.\n" +
            "                                     # Execution flow: short-circuits out of the loop and the function.\n" +
            "                return False  # Every child was tried and none matched -> this branch fails.\n" +
            "                              # Why explicit: without it the function would fall through and return None.\n" +
            "            else:  # Concrete letter: deterministic, there is exactly one edge that could match.\n" +
            "                if ch not in node.children:  # That letter does not continue any stored word from here.\n" +
            "                    return False  # Dead end; nothing below runs for this branch.\n" +
            "                return dfs(i + 1, node.children[ch])  # Follow the one matching edge and recurse deeper.\n" +
            "                                                      # Why safe: no backtracking needed, a concrete letter has a single choice.\n" +
            "        return dfs(0, self.root)  # Kick off the search at pattern index 0 from the root; its result is the answer.",
          plain:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}\n" +
            "        self.is_end = False\n" +
            "\n" +
            "class WordDictionary:\n" +
            "    def __init__(self):\n" +
            "        self.root = TrieNode()\n" +
            "\n" +
            "    def addWord(self, word: str) -> None:\n" +
            "        node = self.root\n" +
            "        for ch in word:\n" +
            "            if ch not in node.children:\n" +
            "                node.children[ch] = TrieNode()\n" +
            "            node = node.children[ch]\n" +
            "        node.is_end = True\n" +
            "\n" +
            "    def search(self, word: str) -> bool:\n" +
            "        def dfs(i: int, node: 'TrieNode') -> bool:\n" +
            "            if i == len(word):\n" +
            "                return node.is_end\n" +
            "            ch = word[i]\n" +
            "            if ch == '.':\n" +
            "                for child in node.children.values():\n" +
            "                    if dfs(i + 1, child):\n" +
            "                        return True\n" +
            "                return False\n" +
            "            else:\n" +
            "                if ch not in node.children:\n" +
            "                    return False\n" +
            "                return dfs(i + 1, node.children[ch])\n" +
            "        return dfs(0, self.root)"
        }
      ],
      patternRecognition: [
        "A trie problem where the query has a single-character wildcard ('.').",
        "The moment a query becomes non-deterministic (many possible next characters), think DFS/backtracking over the trie.",
        "'Match any one character' vs 'match any sequence' — the dot here is exactly one character, so no length ambiguity."
      ],
      interviewRecall: [
        "addWord is just trie insert; the wildcard lives entirely in search.",
        "DFS state is (index into pattern, current node). Base case: index == len -> return node.is_end.",
        "Concrete letter -> recurse into one child; '.' -> loop over all children and OR the results."
      ]
    },

    {
      id: "word-search-ii",
      lc: 212,
      title: "Word Search II",
      difficulty: "Hard",
      category: "Tries",
      link: "https://leetcode.com/problems/word-search-ii/",
      meta: { pattern: "Trie + Grid DFS", dataStructure: "Trie", technique: "Backtracking with pruning" },
      description:
        "Given an `m x n` board of characters and a list of `words`, return **all** words from the list that can be formed on the board.\n\n" +
        "A word is formed by a path of **adjacent** cells (horizontally or vertically neighbouring), where the **same cell may not be used more than once** within a single word.",
      constraints: [
        "`1 <= m, n <= 12`",
        "`1 <= words.length <= 3 * 10^4`",
        "`1 <= words[i].length <= 10`",
        "`board[i][j]` and `words[i]` consist of lowercase English letters.",
        "All words in `words` are distinct."
      ],
      notes: [
        "The same board cell cannot be reused within one word, but different words may reuse cells.",
        "Return each found word once; ordering does not matter.",
        "Removing a word from the trie once found (or de-duplicating results) avoids reporting duplicates."
      ],
      examples: [
        {
          input:
            'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]',
          output: '["oath","eat"]',
          reasoning:
            '"oath" traces o(0,0)->a(0,1)->t(1,1)->h(2,1). "eat" traces e(1,0)->a? ... e(1,3)->a(1,2)->t(1,1). "pea" and "rain" cannot be traced along adjacent cells.',
          visual:
            "```\nboard:                 \"oath\" path:\n o  a  a  n            (o)->(a) a  n\n e  t  a  e             e (t) a  e\n i  h  k  r             i (h) k  r\n i  f  l  v             i  f  l  v\n\nStart DFS from each cell; follow only\nletters that continue a trie path.\n```"
        },
        {
          input: 'board = [["a","b"],["c","d"]], words = ["abcb"]',
          output: "[]",
          reasoning: 'To spell "abcb" you would have to reuse cell b, which is not allowed within one word, so it cannot be formed.'
        },
        {
          input: 'board = [["a"]], words = ["a"]',
          output: '["a"]',
          reasoning: "The single cell alone spells the one-letter word."
        },
        {
          input: 'board = [["a","b"],["a","a"]], words = ["aba","baa","aaa","abaa"]',
          output: '["aba","baa","aaa","abaa"]',
          reasoning: "Multiple words can be traced through the small board; different words are free to reuse cells across separate searches."
        }
      ],
      approaches: [
        {
          name: "Run Word Search once per word (naive)",
          time: "O(W * m * n * 4^L)",
          space: "O(L) recursion",
          whenToUse: "Only as the baseline you contrast against; it re-explores the board for every single word.",
          logic:
            "**What it asks.** Given an `m x n` grid of letters and a list of `W` words, return every listed word that can be traced along a path of adjacent (up/down/left/right) cells, where no single cell is reused within one word. Different words are free to reuse cells across separate searches.\n\n" +
            "**Why the naive idea fails.** The crudest attempt — enumerate raw paths on the board and check each against the word list — has no structure and cannot prune, so it drowns in board paths. The natural fix is to lean on Word Search I: for a given word, a backtracking DFS from each cell either traces it or does not. That per-word search is sound, and it is the baseline here — but, as we will see, running it once for every word repeats an enormous amount of work.\n\n" +
            "**Key Idea.** Treat each word completely independently: for each of the `W` words, run the standard Word Search I DFS over the entire board, attempting to trace that one word from every possible starting cell. Correct, but blind to sharing — two words that share a prefix (say `oath`, `oat`, `oatmeal`) each re-walk the same `oat` cells from scratch, and the whole grid is re-explored `W` separate times with nothing carried between words. This is the version you present in order to then improve on it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each word, define `dfs(r, c, i)` carrying a board position `(r, c)` and an index `i` into the word.\n" +
            "2. Succeed when `i` reaches the word's length; fail when `(r, c)` is off-grid or the cell's letter differs from `word[i]`.\n" +
            "3. Mark the current cell used by overwriting it with `#`, recurse into the four neighbours at `i + 1`, then restore the original letter on backtrack so the cell is free for a different starting position.\n" +
            "4. Launch the DFS from every cell; if any start traces the whole word, record it and move on to the next word.\n\n" +
            "**Why it works.** For a single word this is exactly Word Search I, a sound backtracking search: the `#` marker enforces 'no cell reused within one word', and restoring the letter on backtrack keeps the board pristine for the next attempt. Trying every start cell guarantees no traceable placement is missed. Running that once per word therefore returns precisely the set of traceable words.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to restore the cell after recursion corrupts the board for every subsequent search.\n" +
            "- Not bounds-checking before reading `board[r][c]` causes index errors at the edges — test bounds first, letter second.\n" +
            "- The wasted effort across shared prefixes is intrinsic to this approach; it is correct, only slow.\n\n" +
            "**Complexity.** `O(W * m * n * 4^L)` time — for each of `W` words, a DFS from every one of `m * n` cells, branching up to 4 ways for up to `L` steps. Space is `O(L)` for the recursion depth.\n\n" +
            "**Interview mindset.** Present this as the baseline, not the answer. The key observation to voice is that many words share prefixes and that re-searching the board per word duplicates exactly that shared traversal — which is precisely what motivates flipping the loop inside out and letting a trie of all the words drive a SINGLE board search.",
          rcs:
            "from typing import List  # List lets the type hints say the board is a list of lists of str, and words a list of str.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls findWords on the object.\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:  # Return every listed word traceable on the board.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        rows, cols = len(board), len(board[0])  # Cache the grid dimensions for the bounds checks below.\n" +
            "                                                # State: every cell is addressed by 0 <= r < rows and 0 <= c < cols.\n" +
            "        result = []  # Collects the words we manage to trace; grows by one per successful word.\n\n" +
            "        # ==================== PHASE 2: WORD SEARCH I FOR ONE WORD ====================\n\n" +
            "        def exists(word: str) -> bool:  # True iff this ONE word can be traced along adjacent, non-repeating cells.\n\n" +
            "            def dfs(r: int, c: int, i: int) -> bool:  # State = (cell (r, c), index i into word).\n" +
            "                                                      # Contract: True iff word[i:] can be spelled starting at cell (r, c).\n" +
            "                if i == len(word):  # Base case: every character has already been matched.\n" +
            "                    return True                 # The whole word is traced; nothing below runs.\n" +
            "                if (r < 0 or r >= rows or c < 0 or c >= cols  # Off the grid on any side...\n" +
            "                        or board[r][c] != word[i]):  # ...or this cell is not the letter we need (also rejects the '#' marker).\n" +
            "                    return False                # This path cannot spell word[i]; back out of the branch.\n" +
            "                                                # Short-circuit order: bounds are tested BEFORE board[r][c], so no out-of-range read.\n" +
            "                tmp = board[r][c]               # Remember the real letter so we can restore it after recursing.\n" +
            "                board[r][c] = '#'               # Mark this cell used for the CURRENT word so the path cannot reuse it.\n" +
            "                                                # Why: enforces 'the same cell may not be used more than once within a single word'.\n" +
            "                found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)   # Try DOWN, then UP...\n" +
            "                         or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))  # ...then RIGHT, then LEFT, at the next index.\n" +
            "                                                # 'or' short-circuits: the first direction that completes the word stops the rest.\n" +
            "                board[r][c] = tmp               # Restore the cell on backtrack so a different starting position can reuse it.\n" +
            "                                                # State change: the board is left exactly as it was before this frame.\n" +
            "                return found                    # Report whether any of the four directions completed the word.\n" +
            "            for r in range(rows):               # Try starting the trace from every cell...\n" +
            "                for c in range(cols):           # ...because the word could begin anywhere on the board.\n" +
            "                    if dfs(r, c, 0):            # Does a full trace start here?\n" +
            "                        return True             # Yes: this word exists; stop scanning start cells.\n" +
            "            return False                        # No start cell traced the whole word -> it cannot be formed.\n\n" +
            "        # ==================== PHASE 3: RUN THE SEARCH ONCE PER WORD ====================\n\n" +
            "        for word in words:                      # Each word is searched INDEPENDENTLY -> shared prefixes are re-walked every time (the weakness).\n" +
            "            if exists(word):                    # Can this word be traced on the board?\n" +
            "                result.append(word)             # Yes: record it.\n" +
            "        return result                           # Every word tested; hand back all the ones that were traceable.",
          plain:
            "class Solution:\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "        result = []\n" +
            "\n" +
            "        def exists(word: str) -> bool:\n" +
            "            def dfs(r: int, c: int, i: int) -> bool:\n" +
            "                if i == len(word):\n" +
            "                    return True\n" +
            "                if (r < 0 or r >= rows or c < 0 or c >= cols\n" +
            "                        or board[r][c] != word[i]):\n" +
            "                    return False\n" +
            "                tmp = board[r][c]\n" +
            "                board[r][c] = '#'\n" +
            "                found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)\n" +
            "                         or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))\n" +
            "                board[r][c] = tmp\n" +
            "                return found\n" +
            "            for r in range(rows):\n" +
            "                for c in range(cols):\n" +
            "                    if dfs(r, c, 0):\n" +
            "                        return True\n" +
            "            return False\n" +
            "\n" +
            "        for word in words:\n" +
            "            if exists(word):\n" +
            "                result.append(word)\n" +
            "        return result"
        },
        {
          name: "Optimized — Trie of words + single board DFS",
          time: "O(m * n * 4 * 3^(L-1)) after O(total chars) trie build",
          space: "O(total characters in words)",
          whenToUse: "The expected solution: many words to find on one grid, especially when words share prefixes.",
          logic:
            "**What it asks.** Return every listed word that can be traced on the board along adjacent, non-repeating cells — but do it efficiently across the WHOLE dictionary at once, rather than one word at a time.\n\n" +
            "**Why the naive idea fails.** Searching the board once per word re-walks every shared prefix repeatedly and rescans the entire grid `W` times, for `O(W * m * n * 4^L)`. With up to `3 * 10^4` words that is a mountain of duplicated traversal, and nothing ever tells the DFS to stop early when no word could possibly continue down the current path — it keeps branching into all four directions on faith.\n\n" +
            "**Key Idea.** Invert the loop. Instead of 'for each word, search the board', build a **trie of all the words** and search the board ONCE, descending the trie in lockstep with the board walk. As the DFS steps from cell to cell, the current cell's letter must be a child of the current trie node, or the entire branch is dead. This buys two wins simultaneously. First, shared prefixes are walked a single time: tracing `oat` on the board advances the branches for `oath`, `oats`, and `oatmeal` together. Second, the trie **prunes** — from a cell you recurse only into neighbours whose letter continues some word, so you stop the instant nothing can extend the current path instead of trying all four directions blindly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Insert every word into a trie and store the finished word string at its terminal node (`node.word = word`), which makes collecting a hit trivial — no path reconstruction.\n" +
            "2. `dfs(r, c, node)` carries a board position and the current trie node. Read the cell's letter and look it up via `node.children.get(ch)`; if it is `None`, return at once (prune).\n" +
            "3. Otherwise descend into that child. If the child holds a stored word, append it to `result` and set its `word` back to `None` so it is reported only once.\n" +
            "4. Mark the cell used (overwrite with `#`), recurse into the four in-bounds neighbours that are not already `#`, passing the descended child node, then restore the cell's letter on backtrack so other words may reuse it.\n" +
            "5. Launch the DFS from every board cell, each time starting at the trie root.\n" +
            "6. Optional refinement: after fully exploring a child, if it has no remaining children, delete it from its parent — this shrinks the trie and makes future branches die even sooner.\n\n" +
            "**Why it works.** A word is reported iff there is an adjacent, non-repeating cell path spelling it — which is exactly a board DFS path that simultaneously forms a root-to-terminal path in the trie. The two structures advance together, so a branch survives only while both agree. Marking cells with `#` enforces 'no cell reused within one word'; restoring on backtrack lets a different word (or a different start cell) reuse that cell. Clearing `node.word` after a find prevents the same word from being appended twice. The optional node deletion never removes a still-reachable word, because a node is dropped only once it has no children and its own word (if any) has already been collected.\n\n" +
            "**Common Gotchas.**\n" +
            "- Not clearing the terminal marker (`child.word = None`) after a find reports the same word multiple times.\n" +
            "- Forgetting to restore the cell after recursion corrupts the board for other starting cells.\n" +
            "- Checking bounds and `board[nr][nc] != '#'` BEFORE recursing is what keeps you on-grid and enforces non-reuse.\n" +
            "- The trie must drive the pruning: recurse only into children that exist. Walk all four directions unconditionally and you throw away the entire speedup.\n\n" +
            "**Complexity.** Building the trie is `O(total characters in the words)`. The board DFS is bounded by `O(m * n * 4 * 3^(L-1))` — from each start cell the first step has 4 directions and every later step at most 3 (it cannot step back onto the cell it came from), with `L` the maximum word length — but in practice the trie prunes most of that away. Space is `O(total characters in the words)` for the trie, plus `O(L)` recursion depth.\n\n" +
            "**Interview mindset.** 'Find MANY words on one grid' is the flag to invert the naive per-word loop: load the words into a trie and drive a single board search with it. Say clearly that the trie does double duty — it is both the shared-prefix optimizer and the branch pruner — and mention storing the whole word at the terminal node as the trick that makes result collection free.",
          rcs:
            "from typing import List  # List types the board (list of lists of str) and words (list of str).\n\n\n" +
            "class TrieNode:  # One node of the trie built from the WORD LIST (not the board).\n" +
            "    def __init__(self):  # Build a fresh, empty node.\n" +
            "        self.children = {}  # Map from a single character to the child TrieNode; these edges drive the pruning.\n" +
            "                            # State: empty means no word continues past this node.\n" +
            "        self.word = None    # At a terminal node, holds the FULL word string; None everywhere else.\n" +
            "                            # Why store the word (not a bool): finding it lets us append the result with zero reconstruction.\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls findWords on the object.\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:  # Return all listed words traceable on the board.\n\n" +
            "        # ==================== PHASE 1: BUILD A TRIE OF ALL WORDS ====================\n\n" +
            "        root = TrieNode()  # Root of the dictionary trie; every board DFS starts here.\n" +
            "        for word in words:  # Insert each target word once; shared prefixes automatically share nodes.\n" +
            "            node = root  # Cursor descending the trie as we read the word.\n" +
            "            for ch in word:  # One edge per character.\n" +
            "                if ch not in node.children:  # No edge yet for this character?\n" +
            "                    node.children[ch] = TrieNode()  # Create it.\n" +
            "                node = node.children[ch]  # Descend into the child for ch.\n" +
            "            node.word = word  # Stash the whole word at its terminal node so a later find can collect it directly.\n\n" +
            "        # ==================== PHASE 2: PREPARE THE BOARD SCAN ====================\n\n" +
            "        rows, cols = len(board), len(board[0])  # Grid dimensions, cached for the neighbour bounds test.\n" +
            "        result = []  # Collected words; grows as terminal nodes are reached during the DFS.\n\n" +
            "        # ==================== PHASE 3: ONE BOARD DFS, DRIVEN BY THE TRIE ====================\n\n" +
            "        def dfs(r: int, c: int, node: 'TrieNode') -> None:  # State = (cell (r, c), trie node whose children we may continue into).\n" +
            "                                                            # Side effect only: it appends to result and returns nothing.\n" +
            "            ch = board[r][c]  # The letter sitting under the cursor on the board.\n" +
            "            child = node.children.get(ch)   # Can the trie continue with this letter from where we are?\n" +
            "            if child is None:               # No stored word uses this letter here -> the whole branch is dead.\n" +
            "                return                      # PRUNE: stop instantly instead of blindly walking neighbours (the trie's payoff).\n" +
            "            if child.word is not None:      # Descending into child completes a stored word.\n" +
            "                result.append(child.word)   # Collect it.\n" +
            "                child.word = None           # Clear the marker so the SAME word is never reported twice.\n" +
            "            board[r][c] = '#'               # Mark this cell used for the current path so it cannot be reused within one word.\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):  # The four adjacent steps: down, up, right, left.\n" +
            "                nr, nc = r + dr, c + dc     # Coordinates of one neighbour.\n" +
            "                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':  # In bounds AND not already on this path?\n" +
            "                                                                                # Bounds first, so board[nr][nc] is always safe to read.\n" +
            "                    dfs(nr, nc, child)      # Recurse with the DESCENDED node: board and trie advance together.\n" +
            "            board[r][c] = ch                # Restore the cell on backtrack so other words / start cells may reuse it.\n" +
            "            if not child.children:          # Optional pruning: child now leads nowhere...\n" +
            "                node.children.pop(ch, None) # ...so cut it from its parent to make future branches die even sooner.\n\n" +
            "        # ==================== PHASE 4: LAUNCH FROM EVERY CELL ====================\n\n" +
            "        for r in range(rows):               # A word may start anywhere, so seed a DFS at each cell...\n" +
            "            for c in range(cols):           # ...always beginning at the trie root.\n" +
            "                dfs(r, c, root)\n" +
            "        return result                       # Every start explored; hand back all the words that were found.",
          plain:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}\n" +
            "        self.word = None\n" +
            "\n" +
            "class Solution:\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n" +
            "        root = TrieNode()\n" +
            "        for word in words:\n" +
            "            node = root\n" +
            "            for ch in word:\n" +
            "                if ch not in node.children:\n" +
            "                    node.children[ch] = TrieNode()\n" +
            "                node = node.children[ch]\n" +
            "            node.word = word\n" +
            "\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "        result = []\n" +
            "\n" +
            "        def dfs(r: int, c: int, node: 'TrieNode') -> None:\n" +
            "            ch = board[r][c]\n" +
            "            child = node.children.get(ch)\n" +
            "            if child is None:\n" +
            "                return\n" +
            "            if child.word is not None:\n" +
            "                result.append(child.word)\n" +
            "                child.word = None\n" +
            "            board[r][c] = '#'\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':\n" +
            "                    dfs(nr, nc, child)\n" +
            "            board[r][c] = ch\n" +
            "            if not child.children:\n" +
            "                node.children.pop(ch, None)\n" +
            "\n" +
            "        for r in range(rows):\n" +
            "            for c in range(cols):\n" +
            "                dfs(r, c, root)\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "Search a grid for MANY words at once, especially when the words share prefixes.",
        "Word Search I generalized to a dictionary of words -> invert it: trie drives one board DFS.",
        "You need pruning to stay fast: the trie tells you when to stop exploring a branch."
      ],
      interviewRecall: [
        "Build a trie of the words; store the full word at each terminal node to collect results easily.",
        "DFS state is (row, col, trie node). Prune the instant the board letter is not a child of the current node.",
        "Mark cells with '#' during a path and restore on backtrack; clear a word after finding it to avoid duplicates.",
        "Optional: delete exhausted trie nodes to keep pruning aggressive."
      ]
    }
  ]);
})();
