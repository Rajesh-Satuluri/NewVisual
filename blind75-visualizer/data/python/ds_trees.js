/*
 * data/python/ds_trees.js — "Data Structures (DSA)" tree topics:
 * Binary Tree, Binary Search Tree, and Trie (Prefix Tree).
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures (DSA)", [
  {
    id: "binary-tree",
    title: "Binary Tree",
    difficulty: "Intermediate",
    estMinutes: 13,
    dsaRelevance: 3,
    prerequisites: ["recursion"],
    tagline: "A node with a left and a right child \u2014 recursion is the natural tool, and the four traversals unlock most tree problems.",

    whatIsIt: [
      "A <b>binary tree</b> is nodes linked so each node has up to two children, <code>left</code> and <code>right</code>. One node is the <b>root</b>; a node with no children is a <b>leaf</b>. There are no cycles \u2014 every node has exactly one parent except the root.",
      "The shape is <b>recursive</b>: a tree is either empty (<code>None</code>) or a node whose left and right subtrees are themselves trees. That is why almost every tree function is a recursion with <code>if not node: return</code> as the base case.",
      "You visit the nodes with a <b>traversal</b>. Depth-first (DFS) comes in three flavors by <i>when</i> you touch the node relative to its children: <b>preorder</b> (node, left, right), <b>inorder</b> (left, node, right), <b>postorder</b> (left, right, node). Breadth-first (BFS) is <b>level-order</b> \u2014 row by row using a queue.",
      "Two words that trip people up: <b>height</b> is the longest downward path from a node to a leaf (a leaf has height 0), and <b>depth</b> is the distance from the root down to a node (the root has depth 0)."
    ],

    showMe: {
      code:
        "from collections import deque\n" +
        "\n" +
        "class TreeNode:\n" +
        "    def __init__(self, val, left=None, right=None):\n" +
        "        self.val = val\n" +
        "        self.left = left\n" +
        "        self.right = right\n" +
        "\n" +
        "#         1\n" +
        "#        / \\\n" +
        "#       2   3\n" +
        "#      / \\\n" +
        "#     4   5\n" +
        "root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))\n" +
        "\n" +
        "# DFS -- recursive. Move the visit line to change the order.\n" +
        "def inorder(node, out):\n" +
        "    if not node:\n" +
        "        return\n" +
        "    inorder(node.left, out)\n" +
        "    out.append(node.val)      # visit BETWEEN children -> inorder\n" +
        "    inorder(node.right, out)\n" +
        "\n" +
        "res = []\n" +
        "inorder(root, res)\n" +
        "print(res)                    # [4, 2, 5, 1, 3]\n" +
        "\n" +
        "# DFS -- iterative preorder with an explicit stack\n" +
        "def preorder_iter(node):\n" +
        "    out, stack = [], [node]\n" +
        "    while stack:\n" +
        "        n = stack.pop()\n" +
        "        if not n:\n" +
        "            continue\n" +
        "        out.append(n.val)\n" +
        "        stack.append(n.right) # push right first so left pops first\n" +
        "        stack.append(n.left)\n" +
        "    return out\n" +
        "\n" +
        "print(preorder_iter(root))    # [1, 2, 4, 5, 3]\n" +
        "\n" +
        "# BFS -- level-order with a deque queue\n" +
        "def level_order(node):\n" +
        "    out, q = [], deque([node])\n" +
        "    while q:\n" +
        "        row = []\n" +
        "        for _ in range(len(q)):   # fix this level's width first\n" +
        "            n = q.popleft()\n" +
        "            row.append(n.val)\n" +
        "            if n.left:  q.append(n.left)\n" +
        "            if n.right: q.append(n.right)\n" +
        "        out.append(row)\n" +
        "    return out\n" +
        "\n" +
        "print(level_order(root))      # [[1], [2, 3], [4, 5]]\n" +
        "\n" +
        "# height: return a value UP from the recursion\n" +
        "def height(node):\n" +
        "    if not node:\n" +
        "        return -1             # empty is -1 so a leaf is 0\n" +
        "    return 1 + max(height(node.left), height(node.right))\n" +
        "\n" +
        "print(height(root))           # 2",
      caption: "TreeNode, then the three DFS orders (recursive inorder + iterative preorder with a stack), level-order BFS with a deque, and height by returning a value up."
    },

    whyDsa:
      "<p>The reason recursion fits so well is that the three DFS orders are the <i>same</i> function \u2014 only the line where you visit the node moves. Memorize the skeleton and you have all three:</p>" +
      "<pre class=\"why-pre\">def dfs(node):\n    if not node: return      \u2190 base case, every tree recursion\n    # visit here  -> PREORDER  (node, left, right)\n    dfs(node.left)\n    # visit here  -> INORDER   (left, node, right)\n    dfs(node.right)\n    # visit here  -> POSTORDER (left, right, node)</pre>" +
      "<p>The deeper decision in every tree problem is <b>return a value up</b> vs <b>pass state down</b>. Height, \u201cis this balanced\u201d, and subtree sums bubble an answer <i>up</i> from the leaves; path-sum and \u201cprint every root-to-leaf path\u201d thread an accumulator <i>down</i> as an argument.</p>" +
      "<pre class=\"why-pre\">def height(node):\n    if not node: return -1        \u2190 answer flows UP\n    return 1 + max(height(node.left),\n                   height(node.right))</pre>" +
      "<p>BFS is the other half. When a problem says <i>level</i>, <i>row</i>, <i>width</i>, or <i>nearest</i>, reach for a <code>deque</code> and process one level at a time by snapshotting <code>len(q)</code> before the inner loop \u2014 that fixes how many nodes belong to the current row.</p>" +
      "<pre class=\"why-pre\">q = deque([root])\nwhile q:\n    for _ in range(len(q)):   \u2190 exactly one level\n        n = q.popleft()\n        ... enqueue children</pre>",

    recognize: [
      { q: "\u201cReturn nodes level by level / zigzag / right side view\u201d", think: "BFS with a deque, snapshot len(q) per level" },
      { q: "\u201cMax depth / is balanced / diameter\u201d", think: "post-order DFS, return the height UP and combine at each node" },
      { q: "\u201cRoot-to-leaf path sum / print all paths\u201d", think: "DFS passing an accumulator DOWN as an argument" },
      { q: "\u201cInvert / mirror the tree\u201d", think: "recurse, swap node.left and node.right on the way back up" },
      { q: "\u201cValidate / traverse a BST in sorted order\u201d", think: "inorder DFS (left, node, right) yields ascending values" }
    ],

    matchTags: ["tree", "binary tree", "dfs", "bfs", "traversal", "inorder", "preorder", "postorder", "level order", "recursion"],
    relatedProblems: ["invert-binary-tree", "maximum-depth-of-binary-tree", "binary-tree-level-order-traversal", "same-tree", "subtree-of-another-tree", "diameter-of-binary-tree"],

    traps: [
      {
        bad: "def dfs(node):\n    dfs(node.left)     # crashes at the bottom\n    dfs(node.right)",
        good: "def dfs(node):\n    if not node:\n        return         # base case FIRST\n    dfs(node.left)\n    dfs(node.right)",
        why: "Every tree recursion must handle the empty child before touching .left/.right. Without the None guard you dereference None at the leaves and get AttributeError. Write the base case before anything else."
      },
      {
        bad: "for _ in range(len(q)):\n    ...\n    q.append(child)   # len(q) re-read each pass?",
        good: "level_size = len(q)\nfor _ in range(level_size):\n    ...              # snapshot BEFORE enqueuing children",
        why: "In level-order BFS you must capture the number of nodes in this level BEFORE the loop adds their children. range(len(q)) evaluates len(q) once so it is actually fine, but reading len(q) live inside the loop condition would sweep children into the current row and merge levels."
      },
      {
        bad: "import sys\n# deep skewed tree of 10000 nodes\nheight(root)   # RecursionError",
        good: "sys.setrecursionlimit(20000)   # or convert to an iterative stack traversal",
        why: "Python's default recursion limit is ~1000 frames, and a degenerate (linked-list-shaped) tree recurses once per node. For very deep trees either raise the limit with sys.setrecursionlimit or switch to an explicit-stack iterative traversal."
      }
    ],

    cpython:
      "<p>Recursive traversals ride CPython's <b>call stack</b>: each recursive call is a new frame, and the interpreter caps that at roughly 1000 frames by default (<code>sys.getrecursionlimit()</code>), raising <code>RecursionError</code> on a deep skewed tree \u2014 raise it with <code>sys.setrecursionlimit</code> or go iterative with an explicit <code>list</code> as a stack. For BFS, <code>collections.deque</code> is a C-implemented doubly-linked block list, so <code>popleft()</code> is O(1); a plain <code>list</code> would make <code>pop(0)</code> O(n) by shifting every element, which is why the queue is always a deque.</p>",

    complexity: [
      { op: "DFS traversal (any order)", big_o: "O(n) time", note: "Every node is visited exactly once; the constant work per node makes it linear regardless of preorder / inorder / postorder." },
      { op: "BFS level-order", big_o: "O(n) time", note: "Each node is enqueued and dequeued once from the deque, both O(1), so the whole sweep is linear." },
      { op: "recursion call-stack space", big_o: "O(h)", note: "The stack holds one frame per level down to the current node, so it costs the height h \u2014 O(log n) for a balanced tree, O(n) for a degenerate one." },
      { op: "BFS queue space", big_o: "O(w)", note: "The queue holds at most one level at a time, so it peaks at the tree's maximum width w \u2014 up to n/2 leaves in a full tree." },
      { op: "height / balanced / diameter", big_o: "O(n) time", note: "A single post-order pass returns each subtree's height and combines it at the parent \u2014 one visit per node, no recomputation." }
    ],

    challenge: {
      prompt: "Compute the maximum depth (number of nodes on the longest root-to-leaf path) of a binary tree with a recursion. Try the tree 1 -> (2 -> (4, 5), 3).",
      starter: "class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val, self.left, self.right = val, left, right\nroot = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))\n# empty tree is depth 0; a node is 1 + deeper child\n",
      solution:
        "class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val, self.left, self.right = val, left, right\nroot = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))\n\ndef max_depth(node):\n    if not node:\n        return 0                # empty subtree contributes 0\n    return 1 + max(max_depth(node.left), max_depth(node.right))\n\nprint(max_depth(root))          # 3"
    }
  },

  {
    id: "binary-search-tree",
    title: "Binary Search Tree",
    difficulty: "Advanced",
    estMinutes: 15,
    dsaRelevance: 3,
    prerequisites: ["binary-tree", "recursion"],
    tagline: "A binary tree with an ordering invariant \u2014 left < node < right \u2014 so search, insert, and inorder-sorted all fall out for free.",

    whatIsIt: [
      "A <b>binary search tree</b> (BST) is a binary tree with one extra rule, the <b>BST invariant</b>: for every node, <i>all</i> values in its left subtree are less than the node, and <i>all</i> values in its right subtree are greater. It holds recursively for every node, not just the immediate children.",
      "That invariant is what makes search cheap: at each node you compare and go left or right, discarding half the tree \u2014 <b>O(h)</b>, which is O(log n) when the tree is balanced. Insert follows the same descent and hangs the new value where the search falls off.",
      "The magic property is that an <b>inorder traversal</b> (left, node, right) visits the values in <b>sorted ascending order</b>. \u201cKth smallest\u201d, \u201cvalidate a BST\u201d, and \u201crange sum\u201d all lean on this.",
      "Python has <b>no built-in balanced BST</b> (no TreeMap/TreeSet). In practice you reach for <code>bisect</code> on a sorted <code>list</code>, or <code>sortedcontainers.SortedList</code> (a third-party B-tree-backed structure) when you need O(log n) insert <i>and</i> ordered access."
    ],

    showMe: {
      code:
        "class TreeNode:\n" +
        "    def __init__(self, val, left=None, right=None):\n" +
        "        self.val, self.left, self.right = val, left, right\n" +
        "\n" +
        "def insert(root, val):\n" +
        "    if not root:\n" +
        "        return TreeNode(val)      # fell off -> new leaf here\n" +
        "    if val < root.val:\n" +
        "        root.left = insert(root.left, val)\n" +
        "    else:\n" +
        "        root.right = insert(root.right, val)\n" +
        "    return root\n" +
        "\n" +
        "root = None\n" +
        "for v in [5, 3, 8, 1, 4, 7, 9]:\n" +
        "    root = insert(root, v)\n" +
        "#         5\n" +
        "#        / \\\n" +
        "#       3   8\n" +
        "#      / \\ / \\\n" +
        "#     1  4 7  9\n" +
        "\n" +
        "def search(root, val):\n" +
        "    while root and root.val != val:\n" +
        "        root = root.left if val < root.val else root.right\n" +
        "    return root is not None\n" +
        "\n" +
        "print(search(root, 7), search(root, 6))   # True False\n" +
        "\n" +
        "# inorder yields SORTED order -- the defining BST property\n" +
        "def inorder(node, out):\n" +
        "    if not node:\n" +
        "        return\n" +
        "    inorder(node.left, out)\n" +
        "    out.append(node.val)\n" +
        "    inorder(node.right, out)\n" +
        "\n" +
        "vals = []\n" +
        "inorder(root, vals)\n" +
        "print(vals)                               # [1, 3, 4, 5, 7, 8, 9]\n" +
        "\n" +
        "# validate with BOUNDS -- not just parent comparison\n" +
        "def is_valid(node, low=float('-inf'), high=float('inf')):\n" +
        "    if not node:\n" +
        "        return True\n" +
        "    if not (low < node.val < high):\n" +
        "        return False\n" +
        "    return (is_valid(node.left, low, node.val) and\n" +
        "            is_valid(node.right, node.val, high))\n" +
        "\n" +
        "print(is_valid(root))                     # True\n" +
        "\n" +
        "# lowest common ancestor in a BST: walk using the ordering\n" +
        "def lca(root, p, q):\n" +
        "    while root:\n" +
        "        if p < root.val and q < root.val:\n" +
        "            root = root.left\n" +
        "        elif p > root.val and q > root.val:\n" +
        "            root = root.right\n" +
        "        else:\n" +
        "            return root.val   # split point IS the LCA\n" +
        "\n" +
        "print(lca(root, 1, 4))                     # 3",
      caption: "Insert and iterative search, inorder giving sorted order, bounds-based validation, and BST lowest common ancestor by walking toward the split point."
    },

    whyDsa:
      "<p>The single most common BST bug is validating by comparing each node only to its <b>parent</b>. That is not enough \u2014 the invariant is about the <i>whole</i> subtree, so a value can satisfy its parent yet violate an ancestor.</p>" +
      "<pre class=\"why-pre\">      5\n     / \\\n    3   8\n         \\\n          4    \u2190 4 > 8's parent? no: 4 is 8's LEFT-side,\n               but 4 &lt; 5, so it is in the WRONG subtree</pre>" +
      "<p>The fix is to carry a <b>(low, high) bound</b> down the recursion. Going left tightens the upper bound to the node's value; going right tightens the lower bound. A node is legal only if it sits strictly inside its inherited window.</p>" +
      "<pre class=\"why-pre\">valid(node, low, high):\n    low &lt; node.val &lt; high ?\n    left  \u2192 (low, node.val)   \u2190 tighten HIGH\n    right \u2192 (node.val, high)  \u2190 tighten LOW</pre>" +
      "<p>The other lever is that <b>inorder = sorted</b>. \u201cKth smallest\u201d is just the kth value an inorder walk emits (stop early), and LCA in a BST needs no recursion at all: walk down while both targets are on the same side; the first node that <i>splits</i> them is their lowest common ancestor.</p>",

    recognize: [
      { q: "\u201cValidate that a tree is a BST\u201d", think: "bounds recursion (low, high), NOT parent-only comparison" },
      { q: "\u201cKth smallest / kth largest element\u201d", think: "inorder traversal is sorted \u2014 take the kth value and stop" },
      { q: "\u201cLowest common ancestor in a BST\u201d", think: "walk down; first node between p and q is the answer" },
      { q: "\u201cSearch / insert / does this value exist\u201d", think: "compare and descend left or right \u2014 O(h)" },
      { q: "\u201cNeed an ordered set / sorted inserts in Python\u201d", think: "no built-in BST \u2014 use bisect on a list or sortedcontainers.SortedList" }
    ],

    matchTags: ["bst", "binary search tree", "tree", "inorder", "search", "lca", "sorted", "bisect", "invariant"],
    relatedProblems: ["validate-binary-search-tree", "lowest-common-ancestor-of-a-binary-search-tree", "kth-smallest-element-in-a-bst", "insert-into-a-binary-search-tree", "search-in-a-binary-search-tree", "convert-sorted-array-to-binary-search-tree"],

    traps: [
      {
        bad: "def is_valid(n):\n    return (n.left.val < n.val < n.right.val)  # parent-only",
        good: "def is_valid(n, low=-inf, high=inf):\n    return low < n.val < high and ...bounds down",
        why: "Comparing a node only to its immediate parent (or immediate children) accepts trees that violate the invariant with respect to a farther ancestor. Thread a (low, high) window down the recursion so every node is checked against its entire ancestry, not one neighbor."
      },
      {
        bad: "if low <= node.val <= high:   # <= allows duplicates through",
        good: "if low < node.val < high:     # strict: a proper BST has no equal keys",
        why: "Standard BST problems assume strictly increasing keys, so the bound check must be strict (<, not <=). Using <= silently accepts a duplicate value that a well-formed BST should reject \u2014 a classic off-by-one on validation."
      },
      {
        bad: "# expecting O(log n) after inserting sorted data\nfor v in [1,2,3,4,5]: insert(root, v)  # degenerates to a line",
        good: "use sortedcontainers.SortedList, or balance the tree (AVL / red-black)",
        why: "A plain BST does NOT self-balance. Inserting already-sorted values chains every node down the right spine, turning the tree into a linked list where search is O(n). When you need guaranteed O(log n), use a balanced structure \u2014 in Python that means sortedcontainers.SortedList or bisect."
      }
    ],

    cpython:
      "<p>Python ships no balanced BST in the standard library \u2014 there is no TreeMap or TreeSet \u2014 so <code>dict</code> and <code>set</code> (hash tables, O(1) average but <i>unordered</i>) cover membership, and for <b>ordered</b> operations you use <code>bisect</code> (binary search over a sorted <code>list</code>, though insert is O(n) from the shift) or the third-party <code>sortedcontainers.SortedList</code>, which is backed by a list of lists that behaves like a B-tree and gives O(log n)-ish ordered insert and lookup. A hand-rolled BST in an interview also inherits CPython's ~1000-frame recursion limit, so a deep unbalanced tree needs an iterative walk or a raised limit.</p>",

    complexity: [
      { op: "search / insert (balanced)", big_o: "O(log n)", note: "Each comparison discards half the remaining tree, so the descent is the height \u2014 log n when the tree stays balanced." },
      { op: "search / insert (worst case)", big_o: "O(n)", note: "A degenerate tree (e.g. built from sorted input) is a single chain, so a plain unbalanced BST can degrade all the way to linear." },
      { op: "inorder traversal", big_o: "O(n)", note: "Visits every node once in sorted order \u2014 the basis for kth-smallest and range queries; can stop early once you have enough." },
      { op: "validate (bounds recursion)", big_o: "O(n) time, O(h) space", note: "One pass touching each node with its inherited (low, high) window; the recursion stack costs the height h." },
      { op: "lowest common ancestor", big_o: "O(h)", note: "Walk down toward the split point without backtracking \u2014 O(log n) balanced, O(n) if the tree is a chain." },
      { op: "sortedcontainers.SortedList op", big_o: "O(log n)*", note: "The practical Python substitute for a balanced BST: ordered insert, delete, and index are all near-logarithmic in amortized terms." }
    ],

    challenge: {
      prompt: "Return the kth smallest value in a BST using the fact that an inorder traversal is sorted. Build the tree from [5,3,8,1,4] and find the 3rd smallest.",
      starter: "class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val, self.left, self.right = val, left, right\ndef insert(root, v):\n    if not root: return TreeNode(v)\n    if v < root.val: root.left = insert(root.left, v)\n    else: root.right = insert(root.right, v)\n    return root\nroot = None\nfor v in [5, 3, 8, 1, 4]:\n    root = insert(root, v)\n# inorder emits sorted -> take the kth\n",
      solution:
        "class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val, self.left, self.right = val, left, right\ndef insert(root, v):\n    if not root: return TreeNode(v)\n    if v < root.val: root.left = insert(root.left, v)\n    else: root.right = insert(root.right, v)\n    return root\nroot = None\nfor v in [5, 3, 8, 1, 4]:\n    root = insert(root, v)\n\ndef kth_smallest(root, k):\n    stack = []\n    node = root\n    while stack or node:\n        while node:              # go as far left as possible\n            stack.append(node)\n            node = node.left\n        node = stack.pop()\n        k -= 1\n        if k == 0:\n            return node.val      # kth value inorder\n        node = node.right\n\nprint(kth_smallest(root, 3))     # 4"
    }
  },

  {
    id: "trie-prefix-tree",
    title: "Trie (Prefix Tree)",
    difficulty: "Advanced",
    estMinutes: 14,
    dsaRelevance: 3,
    prerequisites: ["binary-tree"],
    tagline: "A tree keyed by characters \u2014 each path spells a prefix, so insert / search / startsWith all cost O(length), independent of how many words you store.",

    whatIsIt: [
      "A <b>trie</b> (say \u201ctry\u201d), or <b>prefix tree</b>, stores strings by their characters. Each edge is one character, so the path from the root to a node spells out a <b>prefix</b>, and words that share a prefix share the same path down to where they diverge.",
      "Every node holds a <b>children map</b> (a dict from character to child node) plus an <b>is_end</b> flag marking whether a word actually terminates there. Without <code>is_end</code> you can't tell a stored word from a mere prefix \u2014 <code>\"app\"</code> vs a prefix of <code>\"apple\"</code>.",
      "Three operations, all a walk down one path: <b>insert</b> creates missing children as it goes and sets <code>is_end</code> at the last char; <b>search</b> walks and checks <code>is_end</code>; <b>startsWith</b> walks and just checks the path exists.",
      "The payoff over a hash set: a set answers \u201cis this exact word present?\u201d in O(1), but it <i>cannot</i> answer \u201chow many stored words start with <code>\"pre\"</code>?\u201d without scanning everything. A trie answers any <b>prefix</b> query in O(prefix length) \u2014 the basis for autocomplete and word-search."
    ],

    showMe: {
      code:
        "class TrieNode:\n" +
        "    def __init__(self):\n" +
        "        self.children = {}     # char -> TrieNode (fresh dict per node)\n" +
        "        self.is_end = False    # does a word END here?\n" +
        "\n" +
        "class Trie:\n" +
        "    def __init__(self):\n" +
        "        self.root = TrieNode()\n" +
        "\n" +
        "    def insert(self, word):\n" +
        "        node = self.root\n" +
        "        for ch in word:\n" +
        "            if ch not in node.children:\n" +
        "                node.children[ch] = TrieNode()\n" +
        "            node = node.children[ch]\n" +
        "        node.is_end = True     # mark the terminal node\n" +
        "\n" +
        "    def _walk(self, prefix):   # follow the path or return None\n" +
        "        node = self.root\n" +
        "        for ch in prefix:\n" +
        "            if ch not in node.children:\n" +
        "                return None\n" +
        "            node = node.children[ch]\n" +
        "        return node\n" +
        "\n" +
        "    def search(self, word):    # exact word must END here\n" +
        "        node = self._walk(word)\n" +
        "        return node is not None and node.is_end\n" +
        "\n" +
        "    def startsWith(self, prefix):   # path just has to exist\n" +
        "        return self._walk(prefix) is not None\n" +
        "\n" +
        "t = Trie()\n" +
        "for w in ['apple', 'app', 'apply']:\n" +
        "    t.insert(w)\n" +
        "\n" +
        "print(t.search('app'))        # True   (inserted, is_end set)\n" +
        "print(t.search('appl'))       # False  (a prefix, never a word)\n" +
        "print(t.startsWith('appl'))   # True   (path exists)\n" +
        "print(t.startsWith('bpp'))    # False  (no such path)\n" +
        "print(t.search('banana'))     # False",
      caption: "TrieNode (children dict + is_end), then insert / search / startsWith \u2014 search demands is_end, startsWith only demands the path exists."
    },

    whyDsa:
      "<p>The whole structure is a nested dict where each level narrows by one character. Insert is a walk that creates missing links; the terminal <code>is_end</code> flag is what separates a stored word from a passing-through prefix.</p>" +
      "<pre class=\"why-pre\">insert(\"app\"), insert(\"apple\")\n\nroot \u2192 a \u2192 p \u2192 p [end]\n                  \u2514 l \u2192 e [end]\n\n\"app\"  : path ends on a node with is_end \u2713\n\"appl\" : path exists but is_end is False \u2717 (prefix only)</pre>" +
      "<p>That is exactly why a trie beats a <code>set</code> for <b>prefix</b> questions. A hash set gives O(1) exact lookup but has no notion of \u201cshares a prefix\u201d \u2014 answering \u201call words starting with <code>pre</code>\u201d means scanning the entire set. The trie walks straight to the <code>pre</code> node in O(3) and everything beneath it is an answer.</p>" +
      "<pre class=\"why-pre\">set:   startswith(\"pre\") \u2192 scan ALL n words   O(n\u00b7L)\ntrie:  walk to \"pre\" node \u2192 subtree is the set  O(L)</pre>" +
      "<p>This is what powers <b>autocomplete</b>, spell-check, and grid <b>word-search II</b> (build a trie of the dictionary, then DFS the board pruning the moment the current path leaves the trie). The cost is <b>memory</b>: a node per character per branch, so a trie can hold far more objects than the flat set of words it represents.</p>",

    recognize: [
      { q: "\u201cImplement insert / search / startsWith\u201d", think: "trie: children dict + is_end flag, each op walks one path" },
      { q: "\u201cAutocomplete / all words with a given prefix\u201d", think: "walk to the prefix node, DFS the subtree beneath it" },
      { q: "\u201cSearch many dictionary words in a grid (word search II)\u201d", think: "build a trie of the words, DFS the board pruning off-trie paths" },
      { q: "\u201cAdd word with '.' wildcards, then search\u201d", think: "trie + DFS: a '.' tries every child at that level" },
      { q: "\u201cLongest common prefix / replace words with roots\u201d", think: "trie of the roots, walk each word until you hit is_end" }
    ],

    matchTags: ["trie", "prefix", "prefix tree", "tree", "dictionary", "autocomplete", "string", "children"],
    relatedProblems: ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii", "replace-words", "longest-word-in-dictionary", "map-sum-pairs"],

    traps: [
      {
        bad: "def search(self, word):\n    return self._walk(word) is not None   # forgets is_end",
        good: "node = self._walk(word)\nreturn node is not None and node.is_end",
        why: "search (exact word) and startsWith (any prefix) differ only in the is_end check. If search skips it, 'appl' returns True just because 'apple' was inserted \u2014 you would be reporting every prefix as a stored word. Only startsWith is allowed to ignore is_end."
      },
      {
        bad: "class TrieNode:\n    def __init__(self, children={}):   # SHARED dict across nodes!",
        good: "class TrieNode:\n    def __init__(self):\n        self.children = {}   # fresh dict per instance",
        why: "A mutable default argument is created ONCE and shared by every node, so all nodes would mutate the same children dict and the tree collapses into one tangled level. Always build the children dict inside __init__ (or use None as the default and assign a new dict)."
      },
      {
        bad: "# storing 100k long words then wondering about memory",
        good: "weigh the trie vs a set: prefix speed for a node-per-char cost",
        why: "A trie allocates a node (and a dict) per character along every distinct path, so it can use far more memory than the set of words it holds. Use it when you genuinely need prefix queries; if you only ever test exact membership, a plain set is smaller and simpler."
      }
    ],

    cpython:
      "<p>The children map is a plain CPython <code>dict</code>, a hash table, so each step \u2014 \u201cdoes this node have a child <code>'p'</code>?\u201d \u2014 is an O(1)-average lookup, which is why a whole trie operation costs O(word length) and not O(alphabet). Because the default character set is small you sometimes see a fixed <code>[None]*26</code> array of children instead of a dict to shave the hashing overhead, trading a little memory for speed. The recursive variants (wildcard search, subtree DFS for autocomplete) ride the same ~1000-frame call stack as any tree recursion, but trie depth is bounded by the longest word, so that limit is rarely a concern here.</p>",

    complexity: [
      { op: "insert(word)", big_o: "O(L)", note: "One step per character of the word, each an O(1)-average dict operation \u2014 independent of how many words are already stored." },
      { op: "search(word) / startsWith(prefix)", big_o: "O(L)", note: "Walk the L characters of the query following children; startsWith stops at the path, search also checks is_end." },
      { op: "prefix query vs a hash set", big_o: "O(L) vs O(n\u00b7L)", note: "The trie walks straight to the prefix node; a set has no prefix structure, so the same question forces a scan of all n words." },
      { op: "space", big_o: "O(total chars)", note: "A node per character along each distinct path \u2014 shared prefixes are stored once, but distinct words each add their own tail of nodes." },
      { op: "word-search II (grid DFS + trie)", big_o: "O(cells\u00b7branch)", note: "DFS every board cell against the trie, pruning the instant the current path leaves the trie \u2014 the trie is what makes checking many words at once affordable." }
    ],

    challenge: {
      prompt: "Build a trie, insert ['cat', 'car', 'card'], then report search('car'), search('ca'), and startsWith('ca'). search needs an exact word; startsWith only needs the prefix path.",
      starter: "class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\nroot = TrieNode()\n# insert each word, then implement the two queries\n",
      solution:
        "class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nroot = TrieNode()\n\ndef insert(word):\n    node = root\n    for ch in word:\n        node = node.children.setdefault(ch, TrieNode())\n    node.is_end = True\n\ndef walk(prefix):\n    node = root\n    for ch in prefix:\n        if ch not in node.children:\n            return None\n        node = node.children[ch]\n    return node\n\nfor w in ['cat', 'car', 'card']:\n    insert(w)\n\nprint(bool(walk('car') and walk('car').is_end))   # True\nprint(bool(walk('ca') and walk('ca').is_end))      # False\nprint(walk('ca') is not None)                      # True"
    }
  }
]);
