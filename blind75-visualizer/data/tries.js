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
            "**What it asks.** Build a container that not only answers 'is this exact word present?' but also 'does any stored word start with this prefix?' — both quickly. Support `insert`, `search`, and `startsWith`.\n\n" +
            "**Why the naive idea fails.** A `set` of words answers exact-match `search` in `O(L)`, but `startsWith` would force you to scan every stored word and test whether it begins with the prefix — `O(number of words * L)` per query. As the dictionary grows, prefix questions get linearly slower. Prefix queries are the whole reason a trie exists.\n\n" +
            "**Key Idea.** Words that share a prefix should share storage for that prefix. Lay the strings out character-by-character along a tree so the common prefix `app` of `app` and `apple` becomes one single path from the root. Then any prefix question reduces to 'can I walk this path from the root?' — and, crucially, that walk costs `O(L)` no matter how many words are stored, because you only follow the query's own characters.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Represent each **node** as a dictionary `children` (mapping one character to the next node) plus a boolean `is_end`. The root represents the empty prefix; descending one edge consumes exactly one character.\n" +
            "2. `insert(word)`: start at the root; for each character, create the child node if it is missing, then move into it; after the last character, mark the final node `is_end = True`.\n" +
            "3. `search(word)`: walk the characters from the root; if any child is missing, return `False`; after the last character, return the final node's `is_end` flag.\n" +
            "4. `startsWith(prefix)`: identical walk, but at the end just return `True` — reaching the end of the path is enough, with no `is_end` check.\n\n" +
            "**Why it works.** `children[c]` is precisely the node you reach by reading character `c`, and `is_end` means 'the characters spelled from the root to here form a complete inserted word.' So a word is present iff its full path exists AND its terminal node is flagged — exactly what `insert` guarantees and `search` checks. A prefix exists iff its path exists, which is what `startsWith` checks. That single `is_end` flag is the only thing separating the two queries.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to set `is_end` on `insert` makes every `search` return `False` even though the path exists.\n" +
            "- Confusing `search` and `startsWith`: `startsWith` must NOT check `is_end`, or valid prefixes report as absent.\n" +
            "- A single-character word marks the child reached directly from the root — don't special-case it away.\n" +
            "- Querying an empty trie must fail gracefully at the first missing child, not crash.\n\n" +
            "**Complexity.** Every operation is `O(L)` time (one `O(1)` dict lookup per edge, at most `L` edges), independent of how many words are stored. Space is `O(total characters inserted)` in the worst case (no shared prefixes), less when prefixes overlap.\n\n" +
            "**Interview mindset.** The instant you hear 'prefix', 'autocomplete', or 'words sharing a start', reach for a trie — a hash set gives you only exact lookup. The one subtlety to get right is the `is_end` flag; it is what distinguishes `search` from `startsWith`.",
          rcs:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}              # Maps a single char -> the next TrieNode.\n" +
            "        self.is_end = False             # True if a word ends exactly at this node.\n" +
            "\n" +
            "class Trie:\n" +
            "    def __init__(self):\n" +
            "        self.root = TrieNode()          # Root represents the empty prefix.\n" +
            "\n" +
            "    def insert(self, word: str) -> None:\n" +
            "        node = self.root                # Start every insert at the root.\n" +
            "        for ch in word:                 # Consume one character per edge.\n" +
            "            if ch not in node.children: # No path yet for this char?\n" +
            "                node.children[ch] = TrieNode()  # Create it.\n" +
            "            node = node.children[ch]    # Descend into the child.\n" +
            "        node.is_end = True              # Mark the terminal node as a full word.\n" +
            "\n" +
            "    def search(self, word: str) -> bool:\n" +
            "        node = self._find(word)         # Walk the whole word's path.\n" +
            "        return node is not None and node.is_end  # Present only if path exists AND flagged.\n" +
            "\n" +
            "    def startsWith(self, prefix: str) -> bool:\n" +
            "        return self._find(prefix) is not None    # Prefix present iff its path exists.\n" +
            "\n" +
            "    def _find(self, s: str) -> 'TrieNode':\n" +
            "        node = self.root\n" +
            "        for ch in s:                    # Follow the characters one by one.\n" +
            "            if ch not in node.children: # A missing edge means no such path.\n" +
            "                return None\n" +
            "            node = node.children[ch]\n" +
            "        return node                     # The node reached after the last char.",
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
            "**What it asks.** The same trie as before, plus a `search` that may include the wildcard `.`, which matches any single letter. Return `true` if any stored word matches the pattern.\n\n" +
            "**Why the naive idea fails.** For a concrete letter you always know which single edge to follow, but a `.` gives no such guidance. Trying to keep just one 'current node' breaks down the moment you hit a dot, because the right next node might be any of the current node's children — and you can't know which until you look further ahead. You need to explore multiple branches, not commit to one.\n\n" +
            "**Key Idea.** A concrete character is deterministic — from the current node you follow exactly one edge (or fail). A `.` is non-deterministic — it could be any of the current node's children, so you must **try them all** and succeed if any branch leads to a full match. That is a depth-first search with backtracking over the trie, parameterized by (position in the pattern, current node).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build the identical `TrieNode` (children dict + `is_end`). `addWord` is exactly the plain trie insert.\n" +
            "2. `search` runs a recursive DFS carrying an index `i` into the pattern and the current trie `node`, starting at (index 0, root).\n" +
            "3. If `word[i]` is a normal letter, look it up in `node.children`; if absent, this branch fails; if present, recurse into that one child at `i+1`.\n" +
            "4. If `word[i]` is `.`, iterate over EVERY child and recurse into each at `i+1`; if any recursion returns `True`, the match succeeds; if none do, this branch fails.\n" +
            "5. Base case: when `i` reaches the end of the pattern, return the current node's `is_end` — the consumed letters must spell a complete stored word of exactly this length.\n\n" +
            "**Why it works.** A stored word matches the pattern iff, letter by letter, each concrete character equals the word's character and each dot lines up with some character — which is exactly the set of root-to-node paths the DFS explores. Backtracking is automatic: a failed child simply returns and the loop tries the next. The `is_end` base case enforces both that the lengths agree and that the path is a real word, not just a prefix.\n\n" +
            "**Common Gotchas.**\n" +
            "- The base case must check `is_end`, not merely that the node exists — a pattern matching only a prefix is not a match.\n" +
            "- `.` matches exactly ONE character, so it still consumes one trie edge; it is not a multi-character wildcard.\n" +
            "- On a dot, remember to return `False` after the loop if no child succeeded — don't fall through.\n" +
            "- A pattern longer than every stored word simply hits missing children and fails; a pattern shorter than a word fails the `is_end` check.\n\n" +
            "**Complexity.** With no dots it is a straight `O(L)` walk. Each dot can fan out to up to 26 children, so with `d` dots the worst case is `O(26^d * L)`. Space is the trie plus `O(L)` recursion depth.\n\n" +
            "**Interview mindset.** 'Wildcard that matches one character' over a dictionary is the signal for trie + DFS. The concrete-letter case narrows to one child; the dot case forks over all children. The moment a query becomes non-deterministic about the next node, reach for backtracking over the structure you already have.",
          rcs:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}              # char -> TrieNode.\n" +
            "        self.is_end = False             # Marks a complete added word.\n" +
            "\n" +
            "class WordDictionary:\n" +
            "    def __init__(self):\n" +
            "        self.root = TrieNode()\n" +
            "\n" +
            "    def addWord(self, word: str) -> None:\n" +
            "        node = self.root                # Ordinary trie insert.\n" +
            "        for ch in word:\n" +
            "            if ch not in node.children:\n" +
            "                node.children[ch] = TrieNode()\n" +
            "            node = node.children[ch]\n" +
            "        node.is_end = True              # Flag the end of the word.\n" +
            "\n" +
            "    def search(self, word: str) -> bool:\n" +
            "        def dfs(i: int, node: 'TrieNode') -> bool:\n" +
            "            if i == len(word):          # Consumed the whole pattern...\n" +
            "                return node.is_end      # ...match iff a word ends right here.\n" +
            "            ch = word[i]\n" +
            "            if ch == '.':               # Wildcard: try EVERY child branch.\n" +
            "                for child in node.children.values():\n" +
            "                    if dfs(i + 1, child):    # Any branch that matches wins.\n" +
            "                        return True\n" +
            "                return False            # No child led to a match.\n" +
            "            else:                       # Concrete letter: exactly one edge to follow.\n" +
            "                if ch not in node.children:\n" +
            "                    return False        # Dead end: that letter is absent.\n" +
            "                return dfs(i + 1, node.children[ch])\n" +
            "        return dfs(0, self.root)        # Start the search at the root.",
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
            "**What it asks.** Given a grid of letters and a list of `W` words, return every listed word that can be traced along a path of adjacent, non-repeating cells on the board.\n\n" +
            "**The idea, and why it's slow.** The obvious approach treats each word independently: for each of the `W` words, run the standard Word Search I DFS over the whole board, trying to trace that one word starting from every cell. It is correct but wasteful — every word restarts the search from scratch, and words sharing a prefix (e.g. `oath`, `oat`, `oatmeal`) each re-walk the same `oat` cells over and over. The board gets explored `W` separate times with no sharing between words.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each word, define a DFS carrying a board position `(r, c)` and an index `i` into the word.\n" +
            "2. Succeed when `i` reaches the word's length; fail when off-grid or when the cell's letter differs from `word[i]`.\n" +
            "3. Mark the current cell used (temporarily overwrite it with `#`), recurse into the four neighbours at `i+1`, then restore the cell on backtrack so it can be reused for a different starting position.\n" +
            "4. Launch the DFS from every cell; if any start traces the whole word, record the word.\n\n" +
            "**Why it works.** For each word it is exactly Word Search I, which is a sound backtracking search: the `#` marker enforces 'no cell reused within one word' and restoring on backtrack keeps the board intact for the next attempt. Running it once per word therefore finds precisely the traceable words.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to restore the cell after recursion corrupts the board for subsequent searches.\n" +
            "- Not bounds-checking before reading `board[r][c]` causes index errors at the edges.\n" +
            "- Duplicate work across shared prefixes is the whole weakness — it is correct, just slow.\n\n" +
            "**Complexity.** `O(W * m * n * 4^L)` time — for each of `W` words, a DFS from every one of `m*n` cells branching up to 4 ways for `L` steps. Space is `O(L)` recursion depth.\n\n" +
            "**Interview mindset.** This is the baseline to contrast against, not the answer. Recognizing that many words share prefixes and that re-searching per word duplicates that shared traversal is exactly what motivates flipping to a trie-driven single board search.",
          rcs:
            "class Solution:\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "        result = []\n" +
            "\n" +
            "        def exists(word: str) -> bool:\n" +
            "            def dfs(r: int, c: int, i: int) -> bool:\n" +
            "                if i == len(word):\n" +
            "                    return True                 # Matched every character.\n" +
            "                if (r < 0 or r >= rows or c < 0 or c >= cols\n" +
            "                        or board[r][c] != word[i]):\n" +
            "                    return False                # Off-grid or wrong letter.\n" +
            "                tmp = board[r][c]\n" +
            "                board[r][c] = '#'               # Mark cell used for this word.\n" +
            "                found = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1)\n" +
            "                         or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))\n" +
            "                board[r][c] = tmp               # Restore on backtrack.\n" +
            "                return found\n" +
            "            for r in range(rows):\n" +
            "                for c in range(cols):\n" +
            "                    if dfs(r, c, 0):\n" +
            "                        return True\n" +
            "            return False\n" +
            "\n" +
            "        for word in words:                      # Independent search per word.\n" +
            "            if exists(word):\n" +
            "                result.append(word)\n" +
            "        return result",
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
            "**What it asks.** Return all listed words traceable on the board, but do it efficiently across the whole dictionary at once rather than one word at a time.\n\n" +
            "**Why the naive idea fails.** Searching the board once per word re-walks every shared prefix repeatedly and rescans the entire grid `W` times — `O(W * m * n * 4^L)`. With up to `3 * 10^4` words this is far too much duplicated traversal, and nothing tells the search to stop early when no word could possibly continue.\n\n" +
            "**Key Idea.** Invert the loop: build a **trie of all the words** and search the board ONCE. As the DFS moves cell to cell it simultaneously descends the trie — the current cell's letter must be a child of the current trie node, or the entire branch is dead. This does two things at once. Shared prefixes are walked a single time: tracing `oat` on the board advances `oath`, `oats`, and `oatmeal` together. And the trie **prunes** — from a cell you only recurse into neighbours whose letter is an existing child, so you stop the instant no word continues with the letter under you instead of blindly trying all four directions.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Insert every word into a trie; store the finished word string at its terminal node, which makes collecting results trivial.\n" +
            "2. The DFS carries a board position `(r, c)` and the current trie `node`. Look up the cell's letter among `node.children`; if it is absent, return immediately (prune).\n" +
            "3. Otherwise descend into that child. If the child holds a stored word, append it to results and clear the marker so it is reported only once.\n" +
            "4. Mark the cell used (overwrite with `#`), recurse into the four neighbours with the descended child node, then restore the cell on backtrack so other words may reuse it.\n" +
            "5. Launch the DFS from every board cell, starting at the trie root.\n" +
            "6. Optional pruning refinement: after fully exploring a node, if it has no remaining children, delete it from its parent — this shrinks the trie and makes future DFS branches end even sooner.\n\n" +
            "**Why it works.** A word is reported iff there is an adjacent, non-repeating cell path spelling it — which is exactly a DFS path along the board that also forms a root-to-terminal path in the trie. Marking cells with `#` enforces 'no cell reused within one word'; restoring on backtrack lets a different word reuse the cell. Clearing the stored word after finding it prevents duplicate reports.\n\n" +
            "**Common Gotchas.**\n" +
            "- Not clearing the terminal marker after a find causes the same word to be reported multiple times.\n" +
            "- Forgetting to restore the cell after recursion corrupts the board for other starting cells.\n" +
            "- Checking `board[nr][nc] != '#'` (or bounds) before recursing is what enforces non-reuse and stays on-grid.\n" +
            "- The trie must drive the pruning: recurse only into children that exist, or you lose the entire speedup.\n\n" +
            "**Complexity.** Building the trie is `O(total characters in the words)`. The board DFS is bounded by `O(m * n * 4 * 3^(L-1))` — from each start cell the first step has 4 directions and each later step at most 3 (it cannot return to the previous cell), with `L` the max word length — but the trie prunes most of this in practice. Space is `O(total characters in the words)` for the trie.\n\n" +
            "**Interview mindset.** 'Find MANY words on one grid' is the flag to invert the naive per-word loop: put the words in a trie and drive a single board search with it. The trie serves double duty as the shared-prefix optimizer and the branch pruner.",
          rcs:
            "class TrieNode:\n" +
            "    def __init__(self):\n" +
            "        self.children = {}                  # char -> TrieNode.\n" +
            "        self.word = None                    # Holds the full word at a terminal node.\n" +
            "\n" +
            "class Solution:\n" +
            "    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n" +
            "        root = TrieNode()\n" +
            "        for word in words:                  # Build a trie of all target words.\n" +
            "            node = root\n" +
            "            for ch in word:\n" +
            "                if ch not in node.children:\n" +
            "                    node.children[ch] = TrieNode()\n" +
            "                node = node.children[ch]\n" +
            "            node.word = word                # Stash the word at its end node.\n" +
            "\n" +
            "        rows, cols = len(board), len(board[0])\n" +
            "        result = []\n" +
            "\n" +
            "        def dfs(r: int, c: int, node: 'TrieNode') -> None:\n" +
            "            ch = board[r][c]\n" +
            "            child = node.children.get(ch)   # Can the trie continue with this letter?\n" +
            "            if child is None:               # No word uses this letter here -> prune.\n" +
            "                return\n" +
            "            if child.word is not None:      # Reached a complete word.\n" +
            "                result.append(child.word)\n" +
            "                child.word = None           # Clear so we report it only once.\n" +
            "            board[r][c] = '#'               # Mark this cell used for the current path.\n" +
            "            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n" +
            "                nr, nc = r + dr, c + dc\n" +
            "                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':\n" +
            "                    dfs(nr, nc, child)      # Explore neighbour with the descended node.\n" +
            "            board[r][c] = ch                # Restore the cell on backtrack.\n" +
            "            if not child.children:          # Optional pruning: drop dead-end nodes.\n" +
            "                node.children.pop(ch, None)\n" +
            "\n" +
            "        for r in range(rows):               # Kick off a DFS from every cell.\n" +
            "            for c in range(cols):\n" +
            "                dfs(r, c, root)\n" +
            "        return result",
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
