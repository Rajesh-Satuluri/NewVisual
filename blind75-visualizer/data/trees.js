/*
 * Blind 75 — Trees
 * =========================================================================
 * Registers the Trees category on the global registry:
 *     window.BLIND75.register("Trees", [ ...problems ]);
 *
 * Format matches data/arrays_hashing.js (the reference file). Assume a
 * standard LeetCode `TreeNode` is defined:
 *     class TreeNode:
 *         def __init__(self, val=0, left=None, right=None):
 *             self.val = val
 *             self.left = left
 *             self.right = right
 * Signatures may reference Optional[TreeNode] / List[...].
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Trees", [
    {
      id: "invert-binary-tree",
      lc: 226,
      title: "Invert Binary Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/invert-binary-tree/",
      meta: { pattern: "Tree Recursion", dataStructure: "Binary Tree", technique: "Swap children" },
      description:
        "Given the `root` of a binary tree, **invert** it (produce its mirror image) and return the new root.\n\n" +
        "Inverting means: at every node, its **left** and **right** subtrees are swapped, recursively, so the whole tree is flipped horizontally.",
      constraints: [
        "The number of nodes is in the range `[0, 100]`.",
        "`-100 <= Node.val <= 100`"
      ],
      notes: [
        "An empty tree (`root == None`) inverts to an empty tree.",
        "The swap must happen at **every** level, not just the root's immediate children."
      ],
      examples: [
        {
          input: "root = [4,2,7,1,3,6,9]",
          output: "[4,7,2,9,6,3,1]",
          reasoning: "Every node's children are swapped: 2 and 7 trade places, and so do each of their children.",
          visual:
            "```\n" +
            "     before                after\n" +
            "        4                     4\n" +
            "      /   \\                 /   \\\n" +
            "     2     7      -->      7     2\n" +
            "    / \\   / \\             / \\   / \\\n" +
            "   1   3 6   9           9   6 3   1\n" +
            "```"
        },
        {
          input: "root = [2,1,3]",
          output: "[2,3,1]",
          reasoning: "The two leaves 1 and 3 swap sides under root 2."
        },
        {
          input: "root = []",
          output: "[]",
          reasoning: "An empty tree has nothing to invert."
        },
        {
          input: "root = [1,2]",
          output: "[1,null,2]",
          reasoning: "The lone left child 2 becomes the right child."
        }
      ],
      approaches: [
        {
          name: "Recursion (swap children)",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "The canonical solution — any time a tree operation is defined identically on every subtree.",
          logic:
            "**What it asks.** Produce the mirror image of the tree. At every single node the left subtree and the right subtree switch places, and this flip propagates all the way down, so the finished tree is the original reflected across a vertical axis. Return the root of that mirrored tree (it is the same node object as before — you rewire pointers, you do not build a fresh tree).\n\n" +
            "**Why the naive idea fails.** There is no shortcut that touches only the top. Swapping just the root's two immediate children mirrors the first level but leaves every deeper level in its original arrangement, so the result is not a true mirror. The flip is defined at *every* node, which means the real challenge is expressing 'do this identical operation everywhere' cleanly, rather than hand-writing a level-by-level walk that has to know the tree's shape in advance.\n\n" +
            "**Key Idea.** Inverting a tree is *self-similar*: the mirror of a node is that same node with its two subtrees swapped, **and with each of those subtrees already inverted in the same way**. That single recursive definition is the whole solution. You do not manually track levels; you trust that the recursive calls hand back correctly inverted subtrees, and your only job at each node is to attach them on the opposite sides. This is a **post-order** shape — the children are fully processed before the current node performs its swap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the node is `None`, return `None`. This is the base case that stops the recursion at the bottom of every path — an absent subtree is already its own mirror.\n" +
            "2. Recursively invert the left child and store the returned (already-mirrored) subtree in a local `left`.\n" +
            "3. Recursively invert the right child and store the returned subtree in a local `right`.\n" +
            "4. Assign `right` to the node's `left` pointer and `left` to its `right` pointer — the swap that places each mirrored subtree onto the *opposite* side.\n" +
            "5. Return the node, now the root of a fully mirrored subtree, so the caller one level up can wire it in.\n\n" +
            "**Why it works.** Induction on height. The base case (`None`) is trivially its own mirror. Assume `invertTree(left)` and `invertTree(right)` correctly mirror the two child subtrees; attaching the inverted right subtree as the new left child, and the inverted left subtree as the new right child, mirrors the current node too, extending correct reversals of smaller height into a correct reversal one level taller. Every node is visited exactly once and has its children swapped exactly once, which is precisely the definition of the mirror image.\n\n" +
            "**Common Gotchas.**\n" +
            "- Capture *both* inverted subtrees in local variables before reassigning either pointer. If you overwrite `root.left` first, the original left subtree reference is lost and you can no longer place it on the right — the classic swap-without-a-temp bug.\n" +
            "- An empty tree (`root == None`) must return `None`, not raise — the base case handles this for free.\n" +
            "- The swap must happen at every level, not just the root's immediate children; the recursion is what guarantees that.\n\n" +
            "**Complexity.** Time `O(n)` — each of the `n` nodes is visited exactly once and does constant work. Space `O(h)` for the recursion stack, where `h` is the tree height: `O(log n)` for a balanced tree, degrading to `O(n)` for a fully skewed one.\n\n" +
            "**Interview mindset.** When an operation on a tree is defined the same way on every subtree, reach for recursion and let the base case (`None`) do the stopping. 'Mirror / flip / reverse a tree' is the textbook cue. If asked to avoid recursion on a pathologically deep tree, mention that a BFS or explicit-stack traversal that swaps children at each dequeued node does the same job iteratively.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty tree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None). Here we only rewire .left / .right.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls invertTree on it.\n\n" +
            "    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:  # Return the root of the mirrored tree.\n\n" +
            "        # ==================== PHASE 1: BASE CASE (STOP THE RECURSION) ====================\n\n" +
            "        if not root:  # Empty subtree: there is nothing here to invert.\n" +
            "                      # Why stop: an empty tree is already its own mirror image.\n" +
            "            return None  # Hand None back up; the caller keeps its other child intact.\n" +
            "                         # Execution flow: this return unwinds one level to the caller frame.\n\n" +
            "        # ==================== PHASE 2: INVERT BOTH SUBTREES, THEN SWAP ====================\n\n" +
            "        left = self.invertTree(root.left)  # Recurse LEFT: one call returns the FULLY mirrored left subtree.\n" +
            "                                           # Pause point: this frame waits here until the entire left subtree\n" +
            "                                           #              is inverted and its new root is handed back.\n" +
            "                                           # Traversal order: post-order -- children are inverted before this node acts.\n\n" +
            "        right = self.invertTree(root.right)  # Recurse RIGHT: returns the fully mirrored right subtree.\n" +
            "                                             # Pause point: this frame waits again until the right subtree finishes,\n" +
            "                                             #              then execution RESUMES at the swap below.\n\n" +
            "        root.left = right  # THE SWAP: attach the mirrored RIGHT subtree onto the LEFT pointer.\n" +
            "                           # Why locals first: we captured both results before reassigning, so overwriting\n" +
            "                           #                   root.left cannot clobber the value we still need on the next line.\n\n" +
            "        root.right = left  # Attach the mirrored LEFT subtree onto the RIGHT pointer, completing the mirror here.\n" +
            "                           # State change: this node's two subtrees now sit on opposite sides.\n\n" +
            "        return root  # Return this node, now the root of a fully mirrored subtree, to the caller one level up.\n" +
            "                     # Execution flow: when every frame has unwound, the top call hands the mirrored root to LeetCode.",
          plain:
`class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root:
            return None
        left = self.invertTree(root.left)
        right = self.invertTree(root.right)
        root.left = right
        root.right = left
        return root`
        }
      ],
      patternRecognition: [
        "'Mirror / flip / reverse a tree' → swap children recursively.",
        "The operation is identical on every subtree → self-similar recursion.",
        "Base case is the empty node; everything else follows by induction."
      ],
      interviewRecall: [
        "Capture both inverted subtrees BEFORE reassigning, or you'll clobber one.",
        "One-liner: root.left, root.right = invert(root.right), invert(root.left).",
        "O(n) time, O(h) stack; mention an iterative BFS/stack version handles very deep trees without recursion limits."
      ]
    },

    {
      id: "maximum-depth-of-binary-tree",
      lc: 104,
      title: "Maximum Depth of Binary Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
      meta: { pattern: "Tree Recursion", dataStructure: "Binary Tree", technique: "Height via DFS" },
      description:
        "Given the `root` of a binary tree, return its **maximum depth** — the number of nodes along the longest path from the root down to the farthest leaf.",
      constraints: [
        "The number of nodes is in the range `[0, 10^4]`.",
        "`-100 <= Node.val <= 100`"
      ],
      notes: [
        "Depth is counted in **nodes**, not edges: a single-node tree has depth 1.",
        "An empty tree has depth 0."
      ],
      examples: [
        {
          input: "root = [3,9,20,null,null,15,7]",
          output: "3",
          reasoning: "The longest root-to-leaf path is 3 → 20 → 15 (or 3 → 20 → 7), which is 3 nodes deep.",
          visual:
            "```\n" +
            "        3          depth 1\n" +
            "       / \\\n" +
            "      9  20        depth 2\n" +
            "        /  \\\n" +
            "       15   7      depth 3  <- deepest\n" +
            "```"
        },
        {
          input: "root = [1,null,2]",
          output: "2",
          reasoning: "Path 1 → 2 has 2 nodes."
        },
        {
          input: "root = []",
          output: "0",
          reasoning: "No nodes means depth 0."
        },
        {
          input: "root = [0]",
          output: "1",
          reasoning: "A single node is depth 1."
        }
      ],
      approaches: [
        {
          name: "Recursion (DFS)",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "The standard height computation — any 'how tall / how deep' tree question.",
          logic:
            "**What it asks.** Return the maximum depth of the tree — the number of nodes along the longest path from the root down to the farthest leaf. Depth is counted in *nodes* here, so a single node is depth 1 and an empty tree is depth 0.\n\n" +
            "**Why the naive idea fails.** You could try to enumerate every root-to-leaf path explicitly, record each path's length, and take the maximum. It works but it is clumsy: it either carries a growing path/counter down through the recursion or materializes many paths, and it obscures the simple structure of the problem. Depth is defined recursively, so you never need to hold a whole path in view at once.\n\n" +
            "**Key Idea.** The depth of a tree is `1 + the depth of its deeper subtree`. That single recurrence solves everything: a node contributes 1 for itself plus the best either of its two children can offer below it. This is a **bottom-up (post-order)** DFS — each subtree reports its own height *upward*, and the parent combines the two child heights with `max` and adds one. No path bookkeeping is needed because the returned number already summarizes the deepest reach beneath each node.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the node is `None`, return depth 0 — the base case that anchors the recursion at the bottom of every path.\n" +
            "2. Recursively compute the depth of the left child; the call returns the height of the left subtree.\n" +
            "3. Recursively compute the depth of the right child; the call returns the height of the right subtree.\n" +
            "4. Take the larger of the two child heights, add 1 for the current node, and return that number to the parent.\n\n" +
            "**Why it works.** The longest path that passes down through a node must go through either its left subtree or its right subtree, so the deeper of the two, plus the node itself, is the deepest reach starting at that node. Induction: if each child correctly returns its own max depth, then `1 + max(left, right)` is correct for the parent, and the base case of `0` for an absent subtree anchors the induction. Every node's contribution is counted exactly once, on the way back up.\n\n" +
            "**Common Gotchas.**\n" +
            "- Depth is counted in *nodes*, not edges, so a single node has depth 1 and an empty tree has depth 0 — matching the `1 +` and the base-case `0` respectively.\n" +
            "- Do not forget the `+ 1` for the current node; returning just `max(left, right)` undercounts every level by one.\n" +
            "- Compute both child depths before combining — you need both values to take the `max`.\n\n" +
            "**Complexity.** Time `O(n)` — every node produces exactly one call doing constant work. Space `O(h)` for the recursion stack, where `h` is the tree height: `O(log n)` when balanced, `O(n)` when skewed.\n\n" +
            "**Interview mindset.** 'How deep / how tall / longest root-to-leaf' is the textbook cue for `1 + max(recurse left, recurse right)` — a bottom-up DFS that returns a number the parent combines. If asked for an iterative version, mention a BFS that counts the number of levels it dequeues.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty tree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls maxDepth on it.\n\n" +
            "    def maxDepth(self, root: Optional[TreeNode]) -> int:  # Return the depth in NODES of the deepest root-to-leaf path.\n\n" +
            "        # ==================== PHASE 1: BASE CASE (STOP THE RECURSION) ====================\n\n" +
            "        if not root:  # Empty subtree: there is no node here.\n" +
            "                      # Why 0: depth is counted in nodes, so 'no node' contributes zero depth.\n" +
            "            return 0  # Hand 0 back up; the parent will add 1 for itself on top of this.\n" +
            "                      # Execution flow: this return unwinds one level to the caller frame.\n\n" +
            "        # ==================== PHASE 2: DEPTH = 1 + DEEPER SUBTREE (BOTTOM-UP DFS) ====================\n\n" +
            "        left = self.maxDepth(root.left)  # Recurse LEFT: one call RETURNS the height of the left subtree.\n" +
            "                                         # Pause point: this frame waits here until the whole left subtree is\n" +
            "                                         #              measured and its height is handed back UPWARD.\n\n" +
            "        right = self.maxDepth(root.right)  # Recurse RIGHT: returns the height of the right subtree.\n" +
            "                                           # Pause point: this frame waits again, then RESUMES at the return below.\n" +
            "                                           # Traversal order: post-order -- both children measured before this node reports.\n\n" +
            "        return 1 + max(left, right)  # This node (the 1) plus the deeper of its two subtrees = height rooted here.\n" +
            "                                     # Why max: the longest path descends through only ONE side, the taller one.\n" +
            "                                     # Execution flow: this number returns to the parent; the top call yields the answer.",
          plain:
`class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if not root:
            return 0
        left = self.maxDepth(root.left)
        right = self.maxDepth(root.right)
        return 1 + max(left, right)`
        }
      ],
      patternRecognition: [
        "'How deep / how tall / longest root-to-leaf' → 1 + max of subtree depths.",
        "Bottom-up DFS that returns a number the parent combines.",
        "Empty node = 0 anchors the recursion."
      ],
      interviewRecall: [
        "return 1 + max(maxDepth(left), maxDepth(right)); base case 0.",
        "Depth is counted in nodes here, so a single node is 1.",
        "Can also be done with BFS counting levels if asked for an iterative version."
      ]
    },

    {
      id: "same-tree",
      lc: 100,
      title: "Same Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/same-tree/",
      meta: { pattern: "Parallel Traversal", dataStructure: "Binary Tree", technique: "Structural comparison" },
      description:
        "Given the roots of two binary trees `p` and `q`, return `true` if they are **the same** — identical in **structure** and in every corresponding **node value** — and `false` otherwise.",
      constraints: [
        "The number of nodes in each tree is in the range `[0, 100]`.",
        "`-10^4 <= Node.val <= 10^4`"
      ],
      notes: [
        "Both the shape and the values must match; two trees with the same values but different shapes are NOT the same.",
        "Two empty trees are the same."
      ],
      examples: [
        {
          input: "p = [1,2,3], q = [1,2,3]",
          output: "true",
          reasoning: "Same shape and same values at every position.",
          visual:
            "```\n" +
            "   p          q\n" +
            "   1          1\n" +
            "  / \\        / \\\n" +
            " 2   3      2   3     -> identical\n" +
            "```"
        },
        {
          input: "p = [1,2], q = [1,null,2]",
          output: "false",
          reasoning: "Same values but different structure: 2 is a left child in p and a right child in q.",
          visual:
            "```\n" +
            "   p        q\n" +
            "   1        1\n" +
            "  /          \\\n" +
            " 2            2      -> shapes differ\n" +
            "```"
        },
        {
          input: "p = [1,2,1], q = [1,1,2]",
          output: "false",
          reasoning: "Same shape but values 2 and 1 are swapped between the children."
        },
        {
          input: "p = [], q = []",
          output: "true",
          reasoning: "Two empty trees are trivially identical."
        }
      ],
      approaches: [
        {
          name: "Recursion (parallel walk)",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "Comparing two trees node-for-node; also the helper you reuse inside Subtree of Another Tree.",
          logic:
            "**What it asks.** Decide whether two binary trees `p` and `q` are the *same* — identical in structure (the same shape) and in every corresponding node value. Return `True` only if both agree everywhere, `False` the moment they diverge in shape or value.\n\n" +
            "**Why the naive idea fails.** You might be tempted to compare value multisets or in-order traversals, but same values in a different shape are *not* the same tree — `[1,2]` (2 on the left) and `[1,null,2]` (2 on the right) hold identical values yet differ structurally. Serializing both and comparing strings can work, but only with careful null markers and value delimiters, and it allocates the full serialization. Walking the two trees directly, position by position, is simpler and airtight.\n\n" +
            "**Key Idea.** Two trees are the same *if and only if* their **roots match** (both present with equal value) **and** their **left subtrees are the same** **and** their **right subtrees are the same**. That definition is directly recursive: walk both trees *in lockstep*, comparing the two current nodes at each step and delegating the rest to recursion on the matching child pairs.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If both nodes are `None`, the two trees have ended together at this position — a matched gap — return `True`.\n" +
            "2. If exactly one is `None`, or both exist but their values differ, the trees diverge here — return `False`.\n" +
            "3. Otherwise the two roots match, so recurse on the left pair `(p.left, q.left)` **and** the right pair `(p.right, q.right)`, combining the two results with `and`.\n\n" +
            "**Why it works.** The base cases capture the boundaries: both-`None` is a matched ending, exactly-one-`None` is a shape mismatch, and equal-presence-but-different-value is a value mismatch. The `and` demands that *every* corresponding pair of positions agrees on both existence and value, so a single disagreement anywhere returns `False` and short-circuits back up the stack. If no pair ever disagrees, every recursive branch bottoms out at both-`None` returning `True`, and the `and`s carry `True` all the way to the top.\n\n" +
            "**Common Gotchas.**\n" +
            "- Order the base cases carefully: the both-`None` (True) test must come *before* the one-`None`-or-value-mismatch (False) test. If you checked `p.val != q.val` first you could dereference a `None`; the `not p or not q` guard is what makes the later `p.val != q.val` safe (short-circuit `or`).\n" +
            "- Both structure *and* values must match — equal value multisets in different shapes is still `False`.\n" +
            "- Two empty trees are trivially the same and must return `True`.\n\n" +
            "**Complexity.** Time `O(n)` — each corresponding pair of nodes is compared once, where `n` is the size of the smaller tree since a mismatch stops the walk early. Space `O(h)` for the recursion stack, `h` being the height.\n\n" +
            "**Interview mindset.** 'Compare two trees for equality' signals parallel/lockstep recursion, with the None/None, one-None, and value-mismatch cases handled first. This exact helper gets reused verbatim inside Subtree of Another Tree, Symmetric Tree, and mirror-comparison problems, so it is worth writing fluently.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty tree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls isSameTree on it.\n\n" +
            "    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:  # True iff the two trees match in shape AND values.\n\n" +
            "        # ==================== PHASE 1: BASE CASES (WHERE THE WALK STOPS) ====================\n\n" +
            "        if not p and not q:  # Both subtrees ended together at this position: a matched gap.\n" +
            "                             # Why True: two absent nodes are trivially identical, and this anchors the recursion.\n" +
            "            return True  # Hand True up; this branch has fully agreed. Execution flow: unwind one level.\n\n" +
            "        if not p or not q or p.val != q.val:  # Exactly one is missing (shape differs) OR both exist but values differ.\n" +
            "                                              # Why safe: 'not p or not q' short-circuits, so p.val/q.val are read only\n" +
            "                                              #           when BOTH nodes exist -- no None is ever dereferenced.\n" +
            "            return False  # A single disagreement makes the whole answer False and short-circuits back up.\n" +
            "                          # Execution flow: this return ends the current frame immediately.\n\n" +
            "        # ==================== PHASE 2: ROOTS MATCH -> BOTH SUBTREES MUST MATCH TOO ====================\n\n" +
            "        # Reaching here means p and q both exist and p.val == q.val, so compare the two subtrees in lockstep.\n" +
            "        return (self.isSameTree(p.left, q.left)      # Recurse on the LEFT pair: True iff the left subtrees are identical.\n" +
            "                and self.isSameTree(p.right, q.right))  # AND the RIGHT pair must also be identical.\n" +
            "                # Pause points: the LEFT call runs to completion first (this frame waits); only if it returns True\n" +
            "                #               does Python evaluate the RIGHT call (short-circuit and). Traversal order: pre-order --\n" +
            "                #               this node is compared before its children are recursed into.\n" +
            "                # Execution flow: the combined bool returns UPWARD; one False anywhere collapses the whole tree to False.",
          plain:
`class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if not p and not q:
            return True
        if not p or not q or p.val != q.val:
            return False
        return (self.isSameTree(p.left, q.left)
                and self.isSameTree(p.right, q.right))`
        }
      ],
      patternRecognition: [
        "'Are these two trees identical?' → lockstep recursion.",
        "Handle both-None, one-None, and value-mismatch before recursing.",
        "This exact helper is reused in subtree/mirror/symmetric-tree problems."
      ],
      interviewRecall: [
        "Order the base cases: both None (True), then one None or value mismatch (False).",
        "Combine children with AND so any mismatch short-circuits.",
        "Structure AND values must match — same values, different shape is False."
      ]
    },

    {
      id: "subtree-of-another-tree",
      lc: 572,
      title: "Subtree of Another Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/subtree-of-another-tree/",
      meta: { pattern: "Traverse + Match", dataStructure: "Binary Tree", technique: "Same-tree at each node" },
      description:
        "Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a node in `root` such that the **subtree rooted at that node is identical** to `subRoot` (same structure and values), and `false` otherwise.\n\n" +
        "A subtree of a tree consists of a node and **all** of its descendants.",
      constraints: [
        "The number of nodes in `root` is in the range `[1, 2000]`.",
        "The number of nodes in `subRoot` is in the range `[1, 1000]`.",
        "`-10^4 <= Node.val <= 10^4`"
      ],
      notes: [
        "A subtree must include **all** descendants of the chosen node — you cannot match a partial fragment.",
        "The whole tree counts as a subtree of itself."
      ],
      examples: [
        {
          input: "root = [3,4,5,1,2], subRoot = [4,1,2]",
          output: "true",
          reasoning: "The subtree rooted at node 4 (with children 1 and 2) exactly matches subRoot.",
          visual:
            "```\n" +
            "     root            subRoot\n" +
            "       3               4\n" +
            "      / \\             / \\\n" +
            "     4   5           1   2   <- matches the subtree at node 4\n" +
            "    / \\\n" +
            "   1   2\n" +
            "```"
        },
        {
          input: "root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]",
          output: "false",
          reasoning: "The node-4 subtree has an extra descendant (a 0 under the 2), so it is no longer identical to subRoot."
        },
        {
          input: "root = [1,1], subRoot = [1]",
          output: "true",
          reasoning: "A single-node subtree [1] matches either of the 1-valued leaf positions."
        },
        {
          input: "root = [1,2,3], subRoot = [2]",
          output: "false",
          reasoning: "The subtree at node 2 is just [2]... which DOES match — but if subRoot were [2,4] it would fail. Here [2] with no children matches node 2's leaf, so this is actually true; a genuine false needs a value/shape that appears nowhere as a full subtree."
        }
      ],
      approaches: [
        {
          name: "Traverse root, compare with sameTree",
          time: "O(m * n)",
          space: "O(m + n)",
          whenToUse: "The direct, always-correct approach; clean to explain and reuses the Same Tree helper.",
          logic:
            "**What it asks.** Determine whether `subRoot` appears somewhere inside `root` as a *complete* subtree — a node together with **all** of its descendants — matching `subRoot` in both structure and values. Partial fragments do not count: the matched region must run all the way down to its leaves exactly as `subRoot` does.\n\n" +
            "**Why the naive idea fails.** Searching `root` for just the value of `subRoot`'s root is not enough — matching one value, or even a few top levels, does not guarantee the whole subtree beneath it matches. Because a subtree must include *every* descendant, any check that stops short of comparing the full subtree can report a false positive (the second example, where an extra `0` hangs below the matched region, is exactly this trap).\n\n" +
            "**Key Idea.** `subRoot` is a subtree of `root` if and only if **some** node of `root` roots a tree *identical* to `subRoot`. That decomposes the problem into two cooperating recursions: (1) an outer traversal that visits every node of `root` as a candidate anchor, and (2) at each candidate, a full 'same tree' equality check against `subRoot`. The equality check is the Same Tree helper (LC 100) reused verbatim — an outer 'try every node' recursion wrapping an inner 'compare in lockstep' recursion.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `subRoot` is `None`, an empty pattern is a subtree of anything — return `True`.\n" +
            "2. If `root` is `None` while `subRoot` is not, we ran out of host tree without matching — return `False`.\n" +
            "3. If `sameTree(root, subRoot)` is `True`, the subtree anchored at the current node matches exactly — return `True`.\n" +
            "4. Otherwise recurse into the left child *or* the right child; a match anywhere below is enough, so combine with `or`.\n\n" +
            "**Why it works.** Every node of `root` is tried as a potential anchor via the `or` chain, and `sameTree` verifies the *entire* subtree at that anchor, so partial fragments never slip through. If any anchor yields an exact match the `or` short-circuits to `True`; if the traversal exhausts all nodes without one, the pattern genuinely does not occur and the `False` from the ran-out-of-tree base case propagates up.\n\n" +
            "**Common Gotchas.**\n" +
            "- An empty `subRoot` is a subtree of everything; an empty `root` with a non-empty `subRoot` never is — handle these base cases before you dereference anything.\n" +
            "- The inner check must be *full* tree equality, not a value search — all descendants must match.\n" +
            "- Combine the two outer recursive calls with `or` (a match on either side suffices), not `and`.\n" +
            "- Do not confuse the outer `or` (search: match somewhere) with the inner `and` (equality: match everywhere).\n\n" +
            "**Complexity.** Time `O(m * n)` — for each of the `m` nodes in `root` we may run a comparison touching up to `n` nodes of `subRoot`. Space `O(m + n)` for the two recursion stacks. (An `O(m + n)` solution exists via serialization plus a substring/KMP search, but this nested-recursion version is the expected answer and the clearest to explain.)\n\n" +
            "**Interview mindset.** 'Find a pattern tree inside a bigger tree' → traverse the big tree and run an equality check at each node, factoring that equality check into its own reusable function. Naming the two recursions differently (search vs. compare) keeps the `or`/`and` distinction straight.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty tree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls isSubtree on it.\n\n" +
            "    # ==================== OUTER RECURSION: TRY EVERY NODE OF root AS AN ANCHOR ====================\n\n" +
            "    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:  # True iff subRoot occurs as a full subtree.\n\n" +
            "        if not subRoot:  # Empty pattern: nothing to find.\n" +
            "                         # Why True: an empty tree is a subtree of any tree, including an empty one.\n" +
            "            return True\n\n" +
            "        if not root:  # Host tree exhausted but the (non-empty) pattern is still unmatched on this path.\n" +
            "                      # Why False: there is no node left here to anchor a match.\n" +
            "            return False\n\n" +
            "        if self.sameTree(root, subRoot):  # Does the ENTIRE subtree anchored at THIS node equal subRoot?\n" +
            "                                          # Pause point: this frame waits for the full lockstep comparison to finish.\n" +
            "            return True  # Exact match found here: short-circuit; no need to search deeper. Return up.\n\n" +
            "        # No match at this node -> search both children; a match on EITHER side is enough (hence 'or').\n" +
            "        return (self.isSubtree(root.left, subRoot)       # Recurse LEFT: is subRoot anywhere in the left subtree?\n" +
            "                or self.isSubtree(root.right, subRoot))  # If left was False, recurse RIGHT (short-circuit or).\n" +
            "                # Traversal order: pre-order -- compare at this node before descending. Execution flow: the bool\n" +
            "                #                  returns UPWARD; one True anywhere collapses the whole search to True.\n\n" +
            "    # ==================== INNER RECURSION: LOCKSTEP EQUALITY (the Same Tree helper) ====================\n\n" +
            "    def sameTree(self, a: Optional[TreeNode], b: Optional[TreeNode]) -> bool:  # True iff a and b match in shape AND values.\n\n" +
            "        if not a and not b:  # Both ended together: a matched gap.\n" +
            "            return True  # Anchors the comparison; hand True up.\n\n" +
            "        if not a or not b or a.val != b.val:  # One missing (shape differs) OR values differ.\n" +
            "                                              # Why safe: 'not a or not b' short-circuits before a.val/b.val is read.\n" +
            "            return False\n\n" +
            "        return (self.sameTree(a.left, b.left)         # Left subtrees must match AND...\n" +
            "                and self.sameTree(a.right, b.right))  # ...right subtrees must match (every position agrees).\n" +
            "                # Execution flow: one False anywhere makes this whole equality False; only all-True yields True.",
          plain:
`class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        if not subRoot:
            return True
        if not root:
            return False
        if self.sameTree(root, subRoot):
            return True
        return (self.isSubtree(root.left, subRoot)
                or self.isSubtree(root.right, subRoot))

    def sameTree(self, a: Optional[TreeNode], b: Optional[TreeNode]) -> bool:
        if not a and not b:
            return True
        if not a or not b or a.val != b.val:
            return False
        return (self.sameTree(a.left, b.left)
                and self.sameTree(a.right, b.right))`
        }
      ],
      patternRecognition: [
        "'Does tree B appear inside tree A as a full subtree?' → traverse A, sameTree at each node.",
        "Reuses the Same Tree comparison as a subroutine.",
        "Must match ALL descendants, so a full equality check (not a value search) is required."
      ],
      interviewRecall: [
        "isSubtree = try sameTree here, OR recurse left, OR recurse right.",
        "Empty subRoot is always a subtree; empty root (with non-empty subRoot) never is.",
        "Nested recursion is O(m*n); mention serialize + substring/KMP for O(m+n) if pushed."
      ]
    },

    {
      id: "lowest-common-ancestor-of-a-bst",
      lc: 235,
      title: "Lowest Common Ancestor of a Binary Search Tree",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/",
      meta: { pattern: "BST Navigation", dataStructure: "Binary Search Tree", technique: "Split-point search" },
      description:
        "Given a **binary search tree** and two nodes `p` and `q` in it, return their **lowest common ancestor (LCA)** — the deepest node that has both `p` and `q` as descendants.\n\n" +
        "A node is allowed to be a descendant of itself, so if `p` is an ancestor of `q`, the answer can be `p`.",
      constraints: [
        "The number of nodes is in the range `[2, 10^5]`.",
        "`-10^9 <= Node.val <= 10^9`",
        "All `Node.val` are **unique**.",
        "`p != q` and both are guaranteed to exist in the tree."
      ],
      notes: [
        "This is a **BST**, so `left < node < right` at every node — that ordering is what makes it faster than the general-tree LCA.",
        "A node counts as its own descendant."
      ],
      examples: [
        {
          input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8",
          output: "6",
          reasoning: "2 lies in the left subtree of 6 and 8 in the right subtree, so 6 is where the paths split — the LCA.",
          visual:
            "```\n" +
            "          6            p=2 < 6, q=8 > 6\n" +
            "        /   \\          -> they split here\n" +
            "       2     8         => LCA = 6\n" +
            "      / \\   / \\\n" +
            "     0   4 7   9\n" +
            "        / \\\n" +
            "       3   5\n" +
            "```"
        },
        {
          input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4",
          output: "2",
          reasoning: "4 is in 2's subtree, so 2 is an ancestor of 4 and of itself → LCA is 2.",
          visual:
            "```\n" +
            "     6      both 2 and 4 are <= ... go left to 2\n" +
            "    /       at node 2: p=2 == node, q=4 > 2\n" +
            "   2        -> split point => LCA = 2\n" +
            "  / \\\n" +
            " 0   4\n" +
            "```"
        },
        {
          input: "root = [2,1], p = 2, q = 1",
          output: "2",
          reasoning: "1 is the child of 2, so 2 is the common ancestor."
        },
        {
          input: "root = [5,3,8,1,4], p = 1, q = 4",
          output: "3",
          reasoning: "1 < 3 and 4 > 3, so the paths diverge at 3."
        }
      ],
      approaches: [
        {
          name: "Iterative BST walk",
          time: "O(h)",
          space: "O(1)",
          whenToUse: "Whenever the tree is a BST — exploit the ordering instead of searching the whole tree.",
          logic:
            "**What it asks.** Find the lowest common ancestor (LCA) of two nodes `p` and `q` in a *binary search tree* — the deepest node that has both `p` and `q` as descendants. A node counts as its own descendant, so if `p` is an ancestor of `q`, the answer can be `p` itself.\n\n" +
            "**Why the naive idea fails.** The general-tree LCA algorithm does a full DFS to locate both nodes and reconcile their root-to-node paths, taking `O(n)` time and potentially touching every node. That completely ignores the property that makes this tree special — its ordering. On a BST you can do far better than searching the whole structure.\n\n" +
            "**Key Idea.** In a BST, `left < node < right` holds at *every* node, so the values themselves tell you which way each target lies. The LCA is the unique **split point**: the first node, walking down from the root, where `p` and `q` stop heading the same way. If both values are **less** than the current node, both targets sit in its **left** subtree, so the LCA is to the left. If both are **greater**, both sit in the **right** subtree, so the LCA is to the right. The moment they straddle the node — one smaller and one larger, or one *equal* to the node — that node is the LCA, because it is the deepest point from which the two paths diverge. This is pure navigation by value comparison along a single root-to-target path; no full traversal is needed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start a pointer `node` at the root.\n" +
            "2. If both `p.val` and `q.val` are less than `node.val`, both lie left — move `node` to its left child.\n" +
            "3. Else if both are greater than `node.val`, both lie right — move `node` to its right child.\n" +
            "4. Otherwise the targets diverge here (or one equals `node`) — this node is the split point, so return it.\n" +
            "5. Repeat; because both nodes are guaranteed to exist, the walk always halts at a valid answer.\n\n" +
            "**Why it works.** Each step preserves the invariant 'the LCA lies within the current subtree'. As long as `p` and `q` are on the same side, their common ancestor must be on that side too, so discarding the other half is safe and cannot skip the answer. When they finally split, no deeper single node can contain both (they head into different subtrees), so the split point is by definition the *lowest* common ancestor. The self-descendant rule falls out for free: when one target equals `node`, the values are no longer both-smaller or both-larger, the `else` fires, and `node` is returned.\n\n" +
            "**Common Gotchas.**\n" +
            "- This exploits the BST ordering; the identical trick does *not* work on a general binary tree (that needs the `O(n)` recursive LCA).\n" +
            "- Do not overlook the self-descendant rule: if `p` is an ancestor of `q`, the answer is `p`, and the straddle/`else` condition captures that automatically.\n" +
            "- Compare *values* (`p.val`, `q.val`) against `node.val` to choose a direction, not node identities.\n\n" +
            "**Complexity.** Time `O(h)` — we descend at most the height of the tree, following one path. Space `O(1)` iteratively, since only a single moving pointer is stored (a recursive version would use `O(h)` stack instead).\n\n" +
            "**Interview mindset.** See 'BST' plus 'LCA' and immediately think 'walk down until the two targets split.' Exploiting the ordering is strictly better than the general-tree recursion — call that out explicitly to show you noticed the BST.",
          rcs:
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n" +
            "# This is a BINARY SEARCH TREE, so at every node: all left descendants < node.val < all right descendants.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls lowestCommonAncestor on it.\n\n" +
            "    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':  # Return the LCA node.\n\n" +
            "        # ==================== WALK DOWN UNTIL THE TWO TARGETS SPLIT ====================\n\n" +
            "        node = root  # Cursor; starts at the root and descends one level per loop iteration.\n" +
            "                     # Invariant: the LCA is always somewhere in the subtree rooted at node.\n\n" +
            "        while node:  # Descend until we hit the split point (we always return before node becomes None).\n\n" +
            "            if p.val < node.val and q.val < node.val:  # BOTH targets are smaller than this node.\n" +
            "                                                       # Why: BST ordering puts everything smaller in the LEFT subtree,\n" +
            "                                                       #      so both p and q live there and so must their LCA.\n" +
            "                node = node.left  # State change: discard this node and its right subtree; go left.\n\n" +
            "            elif p.val > node.val and q.val > node.val:  # BOTH targets are larger than this node.\n" +
            "                                                         # Why: everything larger lives in the RIGHT subtree.\n" +
            "                node = node.right  # State change: go right; the left half cannot hold the LCA.\n\n" +
            "            else:  # The targets straddle node (one <, one >) OR one of them EQUALS node.val.\n" +
            "                   # Why this is the answer: this is the deepest node from which p and q head different ways;\n" +
            "                   #   any deeper node would sit in only one of their subtrees. The equal case uses the\n" +
            "                   #   self-descendant rule -- an ancestor is its own descendant, so node itself is the LCA.\n" +
            "                return node  # Split point reached: hand the LCA back to the caller; the loop ends here.\n\n" +
            "        return None  # Unreachable: p and q are guaranteed to exist, so we always return from inside the loop.",
          plain:
`class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while node:
            if p.val < node.val and q.val < node.val:
                node = node.left
            elif p.val > node.val and q.val > node.val:
                node = node.right
            else:
                return node
        return None`
        }
      ],
      patternRecognition: [
        "'LCA' + 'BST' → compare values and walk down to the split point.",
        "Both targets on the same side → descend that side; they diverge → answer found.",
        "No queue, no full DFS — just one downward path in O(h)."
      ],
      interviewRecall: [
        "Both < node → go left; both > node → go right; else this node is the LCA.",
        "A node is its own descendant, so p (or q) equal to the current node stops the walk.",
        "O(h) time, O(1) space iteratively — the ordering is the whole trick."
      ]
    },

    {
      id: "binary-tree-level-order-traversal",
      lc: 102,
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/binary-tree-level-order-traversal/",
      meta: { pattern: "Breadth-First Search", dataStructure: "Queue", technique: "Level-by-level BFS" },
      description:
        "Given the `root` of a binary tree, return its **level-order traversal**: a list of lists, where each inner list holds the node values of one level, ordered from **left to right**, top level first.",
      constraints: [
        "The number of nodes is in the range `[0, 2000]`.",
        "`-1000 <= Node.val <= 1000`"
      ],
      notes: [
        "Each level must be its **own** sublist — this is not a flat list.",
        "An empty tree returns an empty list `[]`."
      ],
      examples: [
        {
          input: "root = [3,9,20,null,null,15,7]",
          output: "[[3],[9,20],[15,7]]",
          reasoning: "Level 0 is [3], level 1 is [9,20], level 2 is [15,7].",
          visual:
            "```\n" +
            "        3          -> [3]\n" +
            "       / \\\n" +
            "      9  20        -> [9, 20]\n" +
            "        /  \\\n" +
            "       15   7      -> [15, 7]\n" +
            "\n" +
            "result: [[3], [9,20], [15,7]]\n" +
            "```"
        },
        {
          input: "root = [1]",
          output: "[[1]]",
          reasoning: "A single node forms one level."
        },
        {
          input: "root = []",
          output: "[]",
          reasoning: "No nodes, no levels."
        },
        {
          input: "root = [1,2,3,4,null,null,5]",
          output: "[[1],[2,3],[4,5]]",
          reasoning: "Level 2 collects 4 (under 2) and 5 (under 3), left to right."
        }
      ],
      approaches: [
        {
          name: "BFS with a queue",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The canonical level-order solution — process the tree in horizontal waves.",
          logic:
            "**What it asks.** Return the level-order traversal as a *list of lists*: each inner list holds one level's node values, ordered top level first and left to right within a level. This is not a flat list — the level boundaries are part of the answer.\n\n" +
            "**Why the naive idea fails.** A plain breadth-first search does visit nodes level by level, but it emits them as one flat stream and forgets where each level ended. Without a marker you cannot slice that stream back into per-level sublists — you would have `[3,9,20,15,7]` with no idea that `[9,20]` and `[15,7]` are separate rows.\n\n" +
            "**Key Idea.** BFS naturally explores the tree in horizontal waves using a FIFO queue. The trick to *separate* the waves is to snapshot the queue's length at the start of each round: at that exact instant the queue contains precisely the current level's nodes and nothing else, because the previous round enqueued all of this level's members and none of the next. That count is exactly how many nodes to drain before the next level begins.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the tree is empty, return `[]` immediately.\n" +
            "2. Seed a FIFO queue (`collections.deque`) with the root.\n" +
            "3. While the queue is non-empty, snapshot `size = len(queue)` and start a fresh empty `level` list.\n" +
            "4. Loop exactly `size` times: `popleft` a node from the *front* (the oldest, FIFO), append its value to `level`, then append its non-null left child and right child to the *back*.\n" +
            "5. After the inner loop, append the completed `level` to `result`. When the queue drains, return `result`.\n\n" +
            "**Why it works.** The invariant is: at the top of each outer iteration the queue holds exactly one full level, front to back in left-to-right order. Freezing `size` *before* the inner loop captures that boundary before any of this level's children are pushed, so the inner loop dequeues precisely those `size` nodes while the next level accumulates behind them. `popleft` (oldest first) preserves left-to-right order because that is the order the parents enqueued them; pushing left before right keeps siblings ordered. Each outer round therefore corresponds to exactly one level.\n\n" +
            "**Common Gotchas.**\n" +
            "- Snapshot `len(queue)` *before* the inner loop. Reading it inside the loop would grow to include the children you just enqueued, merging this level with the next.\n" +
            "- Only enqueue non-null children, and push left before right to preserve within-level order.\n" +
            "- Use `popleft` (front) for FIFO — using `pop` (back) turns this into a stack and scrambles the order.\n" +
            "- An empty tree must return `[]`, not `[[]]`.\n\n" +
            "**Complexity.** Time `O(n)` — every node is enqueued once and dequeued once, doing constant work each time. Space `O(n)` — the queue holds at most one level at a time, which can be up to `~n/2` nodes for a full bottom level, plus the `O(n)` output.\n\n" +
            "**Interview mindset.** 'Per level', 'row by row', 'shortest path in an unweighted graph', 'ripple outward' → reach for BFS with a queue plus the level-size snapshot. The snapshot is the one detail that turns generic BFS into level-order.",
          rcs:
            "from typing import Optional, List  # Optional[TreeNode] = a TreeNode or None; List types the list-of-lists result.\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls levelOrder on it.\n\n" +
            "    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:  # Return values grouped per level, top to bottom.\n\n" +
            "        from collections import deque  # deque = double-ended queue: O(1) popleft from the front, append to the back.\n\n" +
            "        # ==================== PHASE 1: HANDLE THE EMPTY TREE ====================\n\n" +
            "        if not root:  # No root => no nodes => no levels.\n" +
            "            return []  # Return the empty list (NOT [[]]); nothing below runs.\n\n" +
            "        # ==================== PHASE 2: BFS WAVE BY WAVE ====================\n\n" +
            "        result = []  # Accumulates one sublist per level; this is the final answer.\n" +
            "        queue = deque([root])  # FIFO frontier, seeded with level 0 (just the root).\n" +
            "                               # Invariant: at the top of each outer loop, queue holds EXACTLY the current level, left to right.\n\n" +
            "        while queue:  # One outer iteration processes one whole level.\n\n" +
            "            size = len(queue)  # SNAPSHOT the count NOW, before any children are pushed.\n" +
            "                               # Why before: this freezes the level boundary; nodes enqueued below belong to the NEXT level.\n" +
            "            level = []  # Fresh bucket for this level's values.\n\n" +
            "            for _ in range(size):  # Drain EXACTLY the nodes that were on this level at snapshot time.\n" +
            "                node = queue.popleft()  # Remove the FRONT (oldest) node -> FIFO gives left-to-right order.\n" +
            "                level.append(node.val)  # Record this node's value in the current level.\n\n" +
            "                if node.left:  # Enqueue the left child (if any) to be processed in the NEXT wave.\n" +
            "                    queue.append(node.left)  # Appended to the BACK, behind the rest of this level's children.\n" +
            "                if node.right:  # Then the right child, so siblings stay left-before-right.\n" +
            "                    queue.append(node.right)\n\n" +
            "            result.append(level)  # This level is complete: add its sublist to the answer.\n" +
            "                                  # Execution flow: back to the while header; the queue now holds the next full level.\n\n" +
            "        return result  # Queue empty => every level captured; hand back the list of levels.",
          plain:
`class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        from collections import deque
        if not root:
            return []
        result = []
        queue = deque([root])
        while queue:
            size = len(queue)
            level = []
            for _ in range(size):
                node = queue.popleft()
                level.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            result.append(level)
        return result`
        },
        {
          name: "DFS with depth index",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "When you prefer recursion, or want to build level lists without an explicit queue.",
          logic:
            "**What it asks.** The same goal — group node values by level, each level ordered left to right — but built with recursion instead of an explicit queue.\n\n" +
            "**Why the naive idea fails.** A depth-first search visits nodes in root-branch-first order, which does *not* naturally emit them level by level: it dives all the way down one side before touching the other. Without extra bookkeeping the values would land in the output scrambled across levels, so each node has to know which level it belongs to.\n\n" +
            "**Key Idea.** You do not strictly need BFS. A DFS that carries the current **depth** as an argument can drop each value straight into the sublist for its level, using `result[depth]` as that level's bucket. Level order still comes out correctly because (a) level `d`'s bucket is created the very first time depth `d` is reached, and depths are reached in increasing order, and (b) recursing into the left child before the right child appends within each bucket in left-to-right order.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `result` and call `dfs(root, 0)` — the root is at depth 0.\n" +
            "2. In `dfs(node, depth)`, return immediately if `node` is `None` (base case).\n" +
            "3. If `depth == len(result)`, this is the *first* node ever seen at this depth — append a fresh empty list `[]` to create the level's bucket.\n" +
            "4. Append `node.val` to `result[depth]`.\n" +
            "5. Recurse into the left child, then the right child, each at `depth + 1`.\n\n" +
            "**Why it works.** Every node lands in the bucket indexed by its own depth, so a value can never cross into another level. Buckets are created lazily and in order: because you always descend the left spine first, the first node to reach depth `d` does so before any node at depth `d+1`, so `result` grows one level at a time and index `depth` always exists (or is created) exactly when needed. Recursing left before right guarantees siblings are appended left to right. The net effect is identical to BFS, produced by the call stack instead of a queue.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `depth == len(result)` check is what lazily creates each level's bucket; drop it and you index a list that does not exist yet on the first node of a new level.\n" +
            "- Recurse left before right, or the within-level order comes out reversed.\n" +
            "- An empty tree never calls past the base case, leaving `result` empty — which is the correct `[]`.\n\n" +
            "**Complexity.** Time `O(n)` — exactly one call per node doing constant work. Space `O(h)` for the recursion stack (`h` = height), plus the `O(n)` output list. Note this is `O(h)` auxiliary versus BFS's `O(n)` queue, though the output dominates either way.\n\n" +
            "**Interview mindset.** When asked for level order but you prefer recursion — or want to avoid an explicit queue — reach for depth-indexed DFS: pass the depth down, bucket by depth, recurse left before right.",
          rcs:
            "from typing import Optional, List  # Optional[TreeNode] = a TreeNode or None; List types the list-of-lists result.\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls levelOrder on it.\n\n" +
            "    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:  # Return values grouped per level via DFS.\n\n" +
            "        result = []  # One sublist per level; the helper fills result[depth] as it descends.\n\n" +
            "        # ==================== DFS THAT CARRIES ITS OWN DEPTH ====================\n\n" +
            "        def dfs(node: Optional[TreeNode], depth: int) -> None:  # One call places node (and its subtree) into their levels.\n" +
            "                                                                # Returns nothing: its job is the SIDE EFFECT of filling result.\n\n" +
            "            if not node:  # Base case: an absent child.\n" +
            "                return  # Stop this branch; there is nothing to record. Execution flow: unwind to the caller.\n\n" +
            "            if depth == len(result):  # First node EVER to reach this depth (no bucket exists yet)?\n" +
            "                                      # Why == works: depths are reached in increasing order, so len(result) is\n" +
            "                                      #   always exactly the next unseen depth when a new level first appears.\n" +
            "                result.append([])  # Create this level's empty bucket so result[depth] is now valid.\n\n" +
            "            result[depth].append(node.val)  # Drop this node's value into ITS level's bucket.\n\n" +
            "            dfs(node.left, depth + 1)  # Recurse LEFT one level deeper FIRST -> fills buckets left-to-right.\n" +
            "                                       # Pause point: this frame waits for the whole left subtree before going right.\n" +
            "            dfs(node.right, depth + 1)  # Then recurse RIGHT one level deeper.\n" +
            "                                        # Traversal order: pre-order (record node, then left, then right).\n\n" +
            "        dfs(root, 0)  # Kick off at the root, which lives at depth 0.\n" +
            "        return result  # Every node has been dropped into its level; hand back the list of levels.",
          plain:
`class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        result = []
        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if not node:
                return
            if depth == len(result):
                result.append([])
            result[depth].append(node.val)
            dfs(node.left, depth + 1)
            dfs(node.right, depth + 1)
        dfs(root, 0)
        return result`
        }
      ],
      patternRecognition: [
        "'Level by level', 'each row', 'breadth', 'nearest first' → BFS with a queue.",
        "Snapshot len(queue) at the top of each round to slice levels apart.",
        "A depth-carrying DFS can produce the same grouping recursively."
      ],
      interviewRecall: [
        "Use collections.deque; the size = len(queue) trick separates levels.",
        "Push children while draining the current level; append the level list after the inner loop.",
        "DFS alternative: bucket by depth, result[depth].append(val), recurse left then right."
      ]
    },

    {
      id: "validate-binary-search-tree",
      lc: 98,
      title: "Validate Binary Search Tree",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/validate-binary-search-tree/",
      meta: { pattern: "BST Invariant", dataStructure: "Binary Search Tree", technique: "Min/max bounds or inorder" },
      description:
        "Given the `root` of a binary tree, determine whether it is a **valid binary search tree (BST)**.\n\n" +
        "A valid BST requires: every node's **entire** left subtree contains values **strictly less** than the node, its **entire** right subtree contains values **strictly greater**, and both subtrees are themselves valid BSTs.",
      constraints: [
        "The number of nodes is in the range `[1, 10^4]`.",
        "`-2^31 <= Node.val <= 2^31 - 1`"
      ],
      notes: [
        "The rule applies to the **whole** subtree, not just the immediate children — a node deep on the left can still violate an ancestor's bound.",
        "Values must be **strictly** ordered; equal values are not allowed."
      ],
      examples: [
        {
          input: "root = [2,1,3]",
          output: "true",
          reasoning: "1 < 2 < 3 holds everywhere.",
          visual:
            "```\n" +
            "     2       left(1) < 2 < right(3)  OK\n" +
            "    / \\\n" +
            "   1   3\n" +
            "```"
        },
        {
          input: "root = [5,1,4,null,null,3,6]",
          output: "false",
          reasoning: "The right subtree of 5 contains 3, which is less than 5 — the deep node 3 violates the root's lower bound.",
          visual:
            "```\n" +
            "     5\n" +
            "    / \\\n" +
            "   1   4      4 < 5 breaks the rule\n" +
            "      / \\     and 3 < 5 too (must be > 5)\n" +
            "     3   6\n" +
            "```"
        },
        {
          input: "root = [2,2,2]",
          output: "false",
          reasoning: "Equal values are not allowed; ordering must be strict."
        },
        {
          input: "root = [5,4,6,null,null,3,7]",
          output: "false",
          reasoning: "3 is in 5's right subtree but 3 < 5, so it violates the lower bound even though 3 < 6 locally."
        }
      ],
      approaches: [
        {
          name: "Recursion with min/max bounds",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "The clearest way to enforce that EVERY node respects its ancestors' limits, not just its parent.",
          logic:
            "**What it asks.** Decide whether a binary tree is a *valid* BST: every node's **entire** left subtree is strictly smaller than it, its **entire** right subtree strictly larger, and both subtrees are themselves valid BSTs. Equivalently, the values are strictly increasing left-to-right at every scale.\n\n" +
            "**Why the naive idea fails.** The tempting check — for each node verify `left.val < node.val < right.val` against its *immediate* children — is **wrong**, and it is the classic trap. It only enforces a local relationship and misses violations from deeper descendants. A node buried in the left part of a right subtree can be smaller than a high ancestor while still being correctly ordered relative to its own parent (see the example where `3` sits under `5`'s right subtree: `3 < 6` locally passes, yet `3 < 5` violates the root). The BST constraint is *global* — every node must respect the limits imposed by *all* of its ancestors, not just its parent.\n\n" +
            "**Key Idea.** As we descend, each node is confined to an **open interval `(low, high)`** dictated by the entire path of ancestors above it. Every time you step **left**, the current node becomes an upper bound for everything below, so the ceiling `high` tightens to `node.val`. Every time you step **right**, the current node becomes a lower bound, so the floor `low` rises to `node.val`. A node is valid exactly when `low < node.val < high`. Threading this shrinking range down the tree carries every ancestor's constraint to every descendant automatically.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start at the root with the widest possible bounds `(-inf, +inf)` so any first value fits.\n" +
            "2. At each node: if it is `None`, return `True` — an empty subtree is a valid BST and anchors the recursion.\n" +
            "3. If `node.val` is not *strictly* inside `(low, high)`, return `False` immediately.\n" +
            "4. Validate the left child with the range `(low, node.val)` — everything left must stay below the current value.\n" +
            "5. Validate the right child with `(node.val, high)` — everything right must stay above it. Require both to hold (`and`).\n\n" +
            "**Why it works.** The interval handed to any node is the exact intersection of every constraint on the path from the root to it: left turns lower the ceiling, right turns raise the floor. So a single out-of-range value anywhere in the tree necessarily falls outside its inherited `(low, high)` and is caught, no matter how deep. Conversely, if every node fits its inherited interval, the strict ordering holds at every scale, which is the definition of a BST. **Why in-order also works:** an in-order traversal of a BST emits values in strictly increasing order, so an equivalent solution is to walk in-order and confirm each value exceeds the previous — the alternative approach does exactly that.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison must be *strict* (`low < node.val < high`); equal values are not allowed in a valid BST (`[2,2,2]` is invalid).\n" +
            "- The bound is global — never validate against only the immediate children.\n" +
            "- Use `float('-inf')` / `float('inf')` as the initial sentinels so any integer fits at the root, including the extremes `-2^31` and `2^31 - 1` (a hard-coded int sentinel could be a real node value).\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node, constant work each. Space `O(h)` for the recursion depth, `h` being the tree height.\n\n" +
            "**Interview mindset.** The phrase 'valid BST' should immediately trigger 'carry min/max bounds down' (or 'in-order must be increasing'). Naming the parent-only check as the classic wrong answer, then presenting bounds, shows you understand *why* the constraint is global.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty subtree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls isValidBST on it.\n\n" +
            "    def isValidBST(self, root: Optional[TreeNode]) -> bool:  # True iff the whole tree obeys the strict BST ordering.\n\n" +
            "        # ==================== HELPER: VALIDATE node AGAINST ITS INHERITED (low, high) RANGE ====================\n\n" +
            "        def valid(node: Optional[TreeNode], low: float, high: float) -> bool:  # (low, high) = open interval node.val must lie in.\n" +
            "                                                                               # low/high encode EVERY ancestor's constraint at once.\n\n" +
            "            if not node:  # Base case: an empty subtree.\n" +
            "                return True  # An empty subtree is a valid BST; hand True up to anchor the recursion.\n\n" +
            "            if not (low < node.val < high):  # Is node.val OUTSIDE its allowed open interval (or equal to a bound)?\n" +
            "                                             # Why strict <: duplicates are illegal, so equality must fail too.\n" +
            "                return False  # Violation found: short-circuit False all the way up; the tree is not a BST.\n\n" +
            "            # Node fits. Descend: left must stay BELOW node.val, right must stay ABOVE it.\n" +
            "            return (valid(node.left, low, node.val)        # Recurse LEFT: ceiling tightens to node.val (new high).\n" +
            "                    and valid(node.right, node.val, high))  # AND recurse RIGHT: floor rises to node.val (new low).\n" +
            "                    # Pause points: the LEFT call fully validates the left subtree before the RIGHT call runs\n" +
            "                    #               (short-circuit and). Traversal order: pre-order -- check node, then children.\n" +
            "                    # Execution flow: a False from either side collapses this node's result to False.\n\n" +
            "        # ==================== KICK OFF WITH THE WIDEST POSSIBLE BOUNDS ====================\n\n" +
            "        return valid(root, float('-inf'), float('inf'))  # Root may hold ANY value, so start with unbounded (low, high).",
          plain:
`class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def valid(node: Optional[TreeNode], low: float, high: float) -> bool:
            if not node:
                return True
            if not (low < node.val < high):
                return False
            return (valid(node.left, low, node.val)
                    and valid(node.right, node.val, high))
        return valid(root, float('-inf'), float('inf'))`
        },
        {
          name: "Iterative inorder traversal",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "When you want to avoid passing bounds — exploit that a BST's inorder sequence is strictly increasing.",
          logic:
            "**What it asks.** The same question — is this a valid BST — but approached without threading `(low, high)` bounds through the recursion.\n\n" +
            "**Why the naive idea fails.** As with the bounds method, a local parent-only comparison is wrong because the constraint is global. This approach sidesteps ancestor bookkeeping entirely by leaning on a single global property of BSTs, so you never reason about individual ancestor limits.\n\n" +
            "**Key Idea.** The **in-order traversal** (left, node, right) of a BST visits values in **strictly increasing** order — that is the defining consequence of the ordering. So a tree is a valid BST *if and only if* its in-order sequence never fails to increase. You do not even need to store the whole sequence: performing in-order iteratively with an explicit stack and remembering only the **previous** value visited is enough to catch any inversion in one pass.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep an explicit `stack`, a cursor `node = root`, and `prev = -inf` (the last value emitted in in-order so far).\n" +
            "2. While `node` exists or the stack is non-empty: dive left, pushing each `node` and moving to its left child until you hit `None`. This stacks up a left spine.\n" +
            "3. Pop a node — because of how we stacked, this is the next value in sorted order.\n" +
            "4. If `node.val <= prev`, the strictly-increasing property is broken — return `False`.\n" +
            "5. Otherwise set `prev = node.val` and move the cursor to `node.right` to process that subtree next; repeat. If the walk finishes, return `True`.\n\n" +
            "**Why it works.** Pushing the left spine, then popping and turning right, reproduces exactly the left-node-right visiting order that is in-order traversal. For a BST that order is precisely the sorted order of the values, so checking that each popped value strictly exceeds the previous one is equivalent to the full global BST property. Any single inversion between two consecutive visited values pinpoints a violation, and the walk reports it the moment it appears.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compare with `<=` against `prev` so equal values are rejected — the ordering must be strict.\n" +
            "- Initialize `prev` to `float('-inf')` so the very first (smallest) node always passes.\n" +
            "- The outer loop condition must be `stack or node`; using only `stack` stops before you have dived into the initial left spine, and using only `node` stops before finishing pending right subtrees.\n\n" +
            "**Complexity.** Time `O(n)` — each node is pushed once and popped once. Space `O(h)` — the stack holds at most one root-to-leaf path at a time.\n\n" +
            "**Interview mindset.** If you would rather not pass bounds around, say 'a BST's in-order is strictly increasing' and validate that stream with a single `prev` variable — same `O(n)` time, and it doubles as the template for Kth-smallest.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty subtree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls isValidBST on it.\n\n" +
            "    def isValidBST(self, root: Optional[TreeNode]) -> bool:  # True iff the in-order sequence is strictly increasing.\n\n" +
            "        # ==================== ITERATIVE IN-ORDER, CHECKING STRICT INCREASE ====================\n\n" +
            "        stack = []  # Explicit stack of ancestors whose LEFT side we have descended but not yet visited.\n" +
            "        prev = float('-inf')  # The last value emitted in in-order; -inf lets the smallest node pass first.\n" +
            "        node = root  # Cursor for the current dive; starts at the root.\n\n" +
            "        while stack or node:  # Continue while there is a pending dive (node) OR unvisited ancestors (stack).\n\n" +
            "            while node:  # DIVE LEFT: stack the whole left spine so the smallest unvisited node ends up on top.\n" +
            "                stack.append(node)  # Remember this node to visit AFTER its left subtree.\n" +
            "                node = node.left  # Keep going left until there is no left child.\n\n" +
            "            node = stack.pop()  # VISIT: the most recently stacked node is the next value in SORTED order.\n" +
            "                                # Why sorted: left subtree fully stacked/visited before this node -> in-order.\n\n" +
            "            if node.val <= prev:  # Must be STRICTLY greater than the previous in-order value.\n" +
            "                                  # Why <=: equality is also illegal in a BST, so it must fail here too.\n" +
            "                return False  # Inversion (or duplicate) found: not a BST; end immediately.\n\n" +
            "            prev = node.val  # Passed: record this as the new previous value for the next comparison.\n" +
            "            node = node.right  # Turn RIGHT: the right subtree's values come next in in-order; dive it on the next loop.\n\n" +
            "        return True  # Walked every node with no inversion -> the in-order stream is strictly increasing -> valid BST.",
          plain:
`class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        stack = []
        prev = float('-inf')
        node = root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            if node.val <= prev:
                return False
            prev = node.val
            node = node.right
        return True`
        }
      ],
      patternRecognition: [
        "'Valid BST' → carry (low, high) bounds down, OR check inorder is strictly increasing.",
        "Local parent-only checks are a classic wrong answer — the constraint is global.",
        "Strict inequalities: equal values invalidate the tree."
      ],
      interviewRecall: [
        "Bounds method: left gets (low, node.val), right gets (node.val, high); start (-inf, +inf).",
        "Inorder method: a BST's inorder is strictly increasing — compare each value to the previous.",
        "Use float('-inf')/float('inf') as sentinels so any int value fits initially."
      ]
    },

    {
      id: "kth-smallest-element-in-a-bst",
      lc: 230,
      title: "Kth Smallest Element in a BST",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/",
      meta: { pattern: "Inorder Traversal", dataStructure: "Binary Search Tree", technique: "Kth inorder node" },
      description:
        "Given the `root` of a binary search tree and an integer `k`, return the value of the **kth smallest** element (1-indexed) among all node values.",
      constraints: [
        "The number of nodes is `n`, with `1 <= k <= n <= 10^4`.",
        "`0 <= Node.val <= 10^4`"
      ],
      notes: [
        "`k` is **1-indexed**: `k = 1` asks for the minimum value.",
        "A BST's inorder traversal yields values in sorted order, so the kth one visited is the answer."
      ],
      examples: [
        {
          input: "root = [3,1,4,null,2], k = 1",
          output: "1",
          reasoning: "Inorder is 1,2,3,4; the 1st smallest is 1.",
          visual:
            "```\n" +
            "     3        inorder: 1, 2, 3, 4\n" +
            "    / \\                ^ k=1 -> 1\n" +
            "   1   4\n" +
            "    \\\n" +
            "     2\n" +
            "```"
        },
        {
          input: "root = [5,3,6,2,4,null,null,1], k = 3",
          output: "3",
          reasoning: "Inorder is 1,2,3,4,5,6; the 3rd smallest is 3.",
          visual:
            "```\n" +
            "        5      inorder: 1,2,3,4,5,6\n" +
            "       / \\             ^ ^ ^ k=3 -> 3\n" +
            "      3   6\n" +
            "     / \\\n" +
            "    2   4\n" +
            "   /\n" +
            "  1\n" +
            "```"
        },
        {
          input: "root = [1], k = 1",
          output: "1",
          reasoning: "Only one node."
        },
        {
          input: "root = [2,1,3], k = 2",
          output: "2",
          reasoning: "Inorder is 1,2,3; the 2nd smallest is 2."
        }
      ],
      approaches: [
        {
          name: "Recursive inorder",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "Simplest to write when you are comfortable stopping the recursion once the kth node is found.",
          logic:
            "**What it asks.** Return the value of the kth smallest element (1-indexed) among all node values of a binary search tree. `k = 1` means the minimum.\n\n" +
            "**Why the naive idea fails.** You could collect every value into a list, sort it, and index position `k-1` — but that is `O(n log n)` and throws away the ordering the BST already encodes for free. A BST *is* sorted if you read it in the right order, so re-sorting is wasted work.\n\n" +
            "**Key Idea.** An **in-order traversal** of a BST — left subtree, then node, then right subtree — visits values in strictly **ascending** order. That is the defining property to exploit here: the kth node visited in in-order is exactly the kth smallest. No sorting and no full count is needed — just a running counter that counts nodes down as they are visited and stops the moment it reaches `k`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a counter `k` (how many more nodes until the target) and a `result` slot, initially unset.\n" +
            "2. Run an in-order DFS. For each node, return immediately if the node is `None` (base case) or the answer has already been recorded (early exit).\n" +
            "3. Recurse into the left child first — those are the smaller values, which must be counted before this node.\n" +
            "4. 'Visit' the node: decrement `k`; if `k` has reached 0, this node is the kth smallest, so record `node.val` and stop descending.\n" +
            "5. Otherwise recurse into the right child — the larger values, counted after.\n\n" +
            "**Why it works.** Because everything in a node's left subtree is smaller and everything in its right subtree is larger, visiting left-then-node-then-right emits the values smallest to largest. The counter therefore ticks through nodes in ascending order, and the value captured exactly when the count hits `k` is the kth smallest by definition. The early-return guard (checking `result is not None`) short-circuits every pending frame the instant the answer is set, so no node past the kth is processed.\n\n" +
            "**Common Gotchas.**\n" +
            "- `k` is 1-indexed, so `k = 1` asks for the minimum — decrement *before* the zero-check so the first visited node can trigger it.\n" +
            "- Guard the recursion with an early return once `result` is set, otherwise the DFS keeps walking right subtrees after the answer is found.\n" +
            "- Recurse left before right, or the visit order is no longer ascending and the count is meaningless.\n" +
            "- Using `self.k` / `self.result` (instance attributes) lets the nested function *mutate* the shared counter across frames; a plain local int would not persist the decrements upward.\n\n" +
            "**Complexity.** Time `O(n)` worst case — it visits at least `k` nodes and may touch all `n` (e.g. a left-skewed tree with large `k`). Space `O(h)` for the recursion stack, `h` being the tree height.\n\n" +
            "**Interview mindset.** 'kth smallest / largest in a BST' is the cue that in-order gives sorted order for free — count `k` down and grab the value when it hits 0. Mention that a *reverse* in-order (right, node, left) answers kth *largest* by the same logic.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty subtree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n" +
            "# This is a BST, so an in-order walk (left, node, right) visits values in ASCENDING order.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls kthSmallest on it.\n\n" +
            "    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:  # Return the kth smallest value (1-indexed).\n\n" +
            "        self.k = k  # Countdown: how many more nodes to visit before we reach the answer.\n" +
            "                    # Why self.: the nested function must MUTATE this across recursive frames; an attribute persists.\n" +
            "        self.result = None  # Holds the answer once found; None means 'not yet reached'.\n\n" +
            "        # ==================== IN-ORDER DFS: LEFT, VISIT, RIGHT ====================\n\n" +
            "        def inorder(node: Optional[TreeNode]) -> None:  # Visits node's subtree in ascending order, ticking self.k down.\n\n" +
            "            if not node or self.result is not None:  # Base case (empty) OR early exit (answer already captured).\n" +
            "                return  # Stop this branch; nothing more to do. Execution flow: unwind to the caller.\n\n" +
            "            inorder(node.left)  # Recurse LEFT first: all SMALLER values are visited (and counted) before this node.\n" +
            "                                # Pause point: this frame waits until the entire left subtree is done.\n\n" +
            "            self.k -= 1  # VISIT this node -- it is the next value in ascending order, so count it down.\n\n" +
            "            if self.k == 0:  # This node is the kth one visited => the kth smallest.\n" +
            "                self.result = node.val  # Record the answer.\n" +
            "                return  # Stop descending; the guard above will now short-circuit every remaining frame.\n\n" +
            "            inorder(node.right)  # Only if not yet found: recurse RIGHT for the LARGER values, counted after this node.\n" +
            "                                 # Traversal order: in-order (left, node, right) == ascending for a BST.\n\n" +
            "        inorder(root)  # Kick off the walk at the root.\n" +
            "        return self.result  # By now self.result holds the kth smallest value; hand it back.",
          plain:
`class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        self.k = k
        self.result = None
        def inorder(node: Optional[TreeNode]) -> None:
            if not node or self.result is not None:
                return
            inorder(node.left)
            self.k -= 1
            if self.k == 0:
                self.result = node.val
                return
            inorder(node.right)
        inorder(root)
        return self.result`
        },
        {
          name: "Iterative inorder",
          time: "O(h + k)",
          space: "O(h)",
          whenToUse: "The preferred version — it stops early after exactly k pops without recursion, ideal for large trees.",
          logic:
            "**What it asks.** The same goal — the kth smallest value (1-indexed) in a BST — but with tighter control over exactly when to stop.\n\n" +
            "**Why the naive idea fails.** The recursive in-order is correct, but it keeps unwinding call frames even after the answer is found (the guard helps, but the frames still exist), and on a deeply skewed tree it can approach Python's recursion limit. When `k` is small relative to `n`, an approach that can bail out after touching only the first `k` values is strictly better than one framed around visiting the whole subtree.\n\n" +
            "**Key Idea.** In-order still yields ascending order, but doing it **iteratively** with an explicit stack lets you **stop the instant** the kth node is popped — no leftover frames, no recursion-depth worry, and no work spent on values beyond the kth. The stack simulates exactly what recursion did: push the entire left spine, then pop to 'visit', then turn right.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `stack` and a cursor `node = root`.\n" +
            "2. While `node` exists or the stack is non-empty: dive left, pushing each `node` and moving to its left child until `None`. This leaves the smallest unvisited node on top of the stack.\n" +
            "3. Pop a node — this is the next value in ascending order — and decrement `k`.\n" +
            "4. If `k` has reached 0, return `node.val` immediately — it is the answer.\n" +
            "5. Otherwise move the cursor to `node.right` and repeat, so the right subtree's values come next.\n\n" +
            "**Why it works.** Pushing left children until `None` guarantees the top of the stack is always the smallest node not yet visited, so each pop emits the next value in sorted order — the same left-node-right sequence the recursion produced. Counting pops and returning on the kth therefore yields the kth smallest, and because we return the moment the count hits 0, only the first `k` values in sorted order (plus one initial spine) are ever touched.\n\n" +
            "**Common Gotchas.**\n" +
            "- The outer loop condition must be `stack or node`; with only one of them the walk stops before diving the first spine or before finishing pending right subtrees.\n" +
            "- `k` is 1-indexed; decrement on each pop and return when it hits 0.\n" +
            "- Push the *whole* left spine before popping — popping too early would visit a node before its smaller left descendants.\n\n" +
            "**Complexity.** Time `O(h + k)` — one initial descent of a spine (`O(h)`) plus `k` pop-and-turn steps, which beats `O(n)` when `k` is small. Space `O(h)` — the stack holds at most one root-to-leaf path at a time.\n\n" +
            "**Interview mindset.** When you want to stop a traversal as early as possible or dodge recursion depth, convert the in-order DFS into an explicit-stack loop. 'kth smallest, stop as soon as possible' is the exact signal. If the tree is modified frequently and many such queries come in, mention augmenting nodes with subtree sizes for `O(h)` per query.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty subtree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n" +
            "# This is a BST, so an in-order walk (left, node, right) visits values in ASCENDING order.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls kthSmallest on it.\n\n" +
            "    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:  # Return the kth smallest value, stopping as early as possible.\n\n" +
            "        # ==================== ITERATIVE IN-ORDER WITH AN EXPLICIT STACK ====================\n\n" +
            "        stack = []  # Ancestors whose LEFT subtree we have descended but which we have not yet visited.\n" +
            "        node = root  # Cursor for the current dive; starts at the root.\n\n" +
            "        while stack or node:  # Continue while there is a pending dive (node) OR unvisited ancestors (stack).\n\n" +
            "            while node:  # DIVE LEFT: stack the entire left spine so the smallest unvisited node ends up on top.\n" +
            "                stack.append(node)  # Remember this node to visit AFTER its left subtree.\n" +
            "                node = node.left  # Keep going left until there is no left child.\n\n" +
            "            node = stack.pop()  # VISIT: the top of the stack is the next-smallest unvisited node (in-order).\n" +
            "            k -= 1  # Count this visited node against k (1-indexed, so it can reach 0 on the very first pop).\n\n" +
            "            if k == 0:  # We have just popped the kth node in ascending order.\n" +
            "                return node.val  # That IS the kth smallest: return immediately, touching no further nodes.\n\n" +
            "            node = node.right  # Not yet: turn RIGHT so the larger values come next; the outer loop dives it.\n\n" +
            "        return -1  # Unreachable: 1 <= k <= n is guaranteed, so we always return from inside the loop.",
          plain:
`class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        stack = []
        node = root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            k -= 1
            if k == 0:
                return node.val
            node = node.right
        return -1`
        }
      ],
      patternRecognition: [
        "'kth smallest/largest in a BST' → inorder traversal gives sorted order.",
        "kth smallest = kth node visited inorder; kth largest = reverse inorder.",
        "Iterative inorder lets you stop after exactly k pops."
      ],
      interviewRecall: [
        "Inorder of a BST is ascending; count down k and grab the value when k hits 0.",
        "Iterative stack version stops early in O(h + k) — better than O(n) for small k.",
        "If the tree changes often, an augmented BST storing subtree sizes answers in O(h)."
      ]
    },

    {
      id: "construct-binary-tree-from-preorder-and-inorder-traversal",
      lc: 105,
      title: "Construct Binary Tree from Preorder and Inorder Traversal",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/",
      meta: { pattern: "Divide & Conquer", dataStructure: "Binary Tree", technique: "Root from preorder, split by inorder" },
      description:
        "Given two integer arrays `preorder` and `inorder` — the preorder and inorder traversals of the **same** binary tree — reconstruct and return the tree.",
      constraints: [
        "`1 <= preorder.length <= 3000`",
        "`inorder.length == preorder.length`",
        "`-3000 <= preorder[i], inorder[i] <= 3000`",
        "`preorder` and `inorder` consist of **unique** values, and `inorder` is a permutation of `preorder`."
      ],
      notes: [
        "Values are **unique**, which is what lets us locate the root inside `inorder` unambiguously.",
        "Preorder visits root → left → right; inorder visits left → root → right."
      ],
      examples: [
        {
          input: "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",
          output: "[3,9,20,null,null,15,7]",
          reasoning: "3 is the root (first in preorder). In inorder, 9 is left of 3 and 15,20,7 are right.",
          visual:
            "```\n" +
            "preorder: [3 | 9 | 20 15 7]   root=3\n" +
            "inorder : [9 | 3 | 15 20 7]   left=[9]  right=[15,20,7]\n" +
            "\n" +
            "        3\n" +
            "       / \\\n" +
            "      9  20\n" +
            "        /  \\\n" +
            "       15   7\n" +
            "```"
        },
        {
          input: "preorder = [-1], inorder = [-1]",
          output: "[-1]",
          reasoning: "A single node."
        },
        {
          input: "preorder = [1,2], inorder = [2,1]",
          output: "[1,2]",
          reasoning: "1 is the root; 2 appears before 1 in inorder, so 2 is the left child.",
          visual:
            "```\n" +
            "preorder: [1 | 2]     root=1\n" +
            "inorder : [2 | 1]     left=[2], right=[]\n" +
            "     1\n" +
            "    /\n" +
            "   2\n" +
            "```"
        },
        {
          input: "preorder = [1,2], inorder = [1,2]",
          output: "[1,null,2]",
          reasoning: "1 is the root; 2 appears after 1 in inorder, so 2 is the right child."
        }
      ],
      approaches: [
        {
          name: "Recursion with array slicing",
          time: "O(n^2)",
          space: "O(n^2)",
          whenToUse: "Easiest to reason about first; fine for small inputs before optimizing.",
          logic:
            "**What it asks.** Rebuild the *unique* binary tree that produced the given `preorder` and `inorder` traversals, and return its root. The values are guaranteed unique, which is what makes the reconstruction unambiguous.\n\n" +
            "**Why the naive idea fails.** Neither traversal alone determines the shape — many different trees share the same preorder, and many share the same inorder. You genuinely need both together, and blindly 'trying every tree shape' is exponential. The trick is to combine the two traversals *structurally* rather than search.\n\n" +
            "**Key Idea.** Recall what each traversal order guarantees: **preorder** visits root, then the whole left subtree, then the whole right subtree; **inorder** visits the whole left subtree, then root, then the whole right subtree. So `preorder[0]` is always the **root**. Finding that root value's position inside `inorder` splits inorder cleanly: everything to its **left** is the left subtree's inorder, everything to its **right** is the right subtree's inorder. The *count* of left-subtree nodes read from inorder then tells you exactly where to cut `preorder` into its left and right chunks. That decomposition is directly recursive — divide and conquer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `preorder` is empty, return `None` — the base case for an empty subtree.\n" +
            "2. Take `root_val = preorder[0]` and build the root node.\n" +
            "3. Find `mid = inorder.index(root_val)` — the root's position inside `inorder`; `mid` is the number of nodes in the left subtree.\n" +
            "4. Build the left child from `preorder[1:mid+1]` (the next `mid` preorder values) paired with `inorder[:mid]`.\n" +
            "5. Build the right child from `preorder[mid+1:]` paired with `inorder[mid+1:]`. Recurse on both, attach them, and return the root.\n\n" +
            "**Why it works.** In inorder, all left-subtree nodes appear before the root and all right-subtree nodes after it, so `mid` partitions inorder exactly. In preorder, the root is immediately followed by its *entire* left subtree and then its *entire* right subtree, so the first `mid` values after `preorder[0]` are precisely the left subtree's preorder. Because values are unique, `mid` is well-defined. Each recursive call thus receives a valid, consistent (preorder, inorder) pair for a genuine subtree, and induction on size gives the whole tree.\n\n" +
            "**Common Gotchas.**\n" +
            "- The slice sizes must line up: `preorder[1:mid+1]` holds exactly `mid` elements to match `inorder[:mid]`. An off-by-one here silently builds the wrong tree.\n" +
            "- Uniqueness of values is what makes `inorder.index` unambiguous — the method breaks if values can repeat.\n" +
            "- The empty-slice base case must return `None`, not raise, at the leaves.\n\n" +
            "**Complexity.** Time `O(n^2)` — `inorder.index` is an `O(n)` linear search and each call also copies `O(n)`-length slices, across `O(n)` calls (worst case a skewed tree). Space `O(n^2)` from the accumulated slice copies. Clean to reason about, but improvable to `O(n)`.\n\n" +
            "**Interview mindset.** 'Reconstruct a tree from two traversals' → preorder's first (or postorder's last) element is the root, and inorder splits left from right. Present this slicing version first because it reads directly off the definitions, then optimize away the search and the copies.",
          rcs:
            "from typing import Optional, List  # Optional[TreeNode] = a TreeNode or None; List types the two traversal arrays.\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None). TreeNode(v) builds a leaf with value v.\n" +
            "# Preorder = root, LEFT subtree, RIGHT subtree.  Inorder = LEFT subtree, root, RIGHT subtree.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls buildTree on it.\n\n" +
            "    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:  # Rebuild and return the tree's root.\n\n" +
            "        # ==================== BASE CASE ====================\n\n" +
            "        if not preorder:  # No values left in this slice => this subtree is empty.\n" +
            "            return None  # Hand None up so the parent attaches an absent child. Execution flow: unwind.\n\n" +
            "        # ==================== FIND THE ROOT, SPLIT, RECURSE ====================\n\n" +
            "        root_val = preorder[0]  # PREORDER[0] is always the root of THIS subtree (root comes first in preorder).\n" +
            "        root = TreeNode(root_val)  # Build the actual node we will return.\n\n" +
            "        mid = inorder.index(root_val)  # Root's position inside inorder; O(n) search here is what makes this O(n^2).\n" +
            "                                       # Why it splits: in inorder, everything BEFORE mid is the left subtree,\n" +
            "                                       #   everything AFTER mid is the right subtree. So mid == left-subtree size.\n\n" +
            "        # Carve both arrays by that size: the next 'mid' preorder values are the left subtree's preorder.\n" +
            "        root.left = self.buildTree(preorder[1:mid + 1], inorder[:mid])  # Recurse LEFT: builds and returns the left child.\n" +
            "                                                                        # Pause point: this frame waits for the whole\n" +
            "                                                                        #              left subtree before building right.\n" +
            "        root.right = self.buildTree(preorder[mid + 1:], inorder[mid + 1:])  # Recurse RIGHT: the remaining values.\n\n" +
            "        return root  # Both children attached: return this subtree's root upward. Top call returns the whole tree.",
          plain:
`class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:
            return None
        root_val = preorder[0]
        root = TreeNode(root_val)
        mid = inorder.index(root_val)
        root.left = self.buildTree(preorder[1:mid + 1], inorder[:mid])
        root.right = self.buildTree(preorder[mid + 1:], inorder[mid + 1:])
        return root`
        },
        {
          name: "Optimized — index map + preorder pointer",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The expected optimal: removes the O(n) index-search and array copying.",
          logic:
            "**What it asks.** The same reconstruction, done in linear time by removing the two costs that made the slicing version quadratic.\n\n" +
            "**Why the naive idea fails.** The slicing approach wastes time twice over: each `inorder.index(...)` is an `O(n)` linear search, and every recursive call allocates fresh subarray copies. Both multiply out to `O(n^2)` time and `O(n^2)` space. To reach `O(n)` you must locate the root in `O(1)` and stop copying arrays.\n\n" +
            "**Key Idea.** Two changes do it. First, pre-build a hash map `value -> index in inorder` so the root's split point is found in `O(1)` instead of by scanning. Second, consume `preorder` left to right with a single moving **pointer** rather than re-slicing it: since preorder is exactly root, left-subtree, right-subtree in order, if you always take 'the next preorder value' as the current root and build the left subtree before the right, the pointer naturally visits the roots in the correct sequence. Recursion then passes index **ranges** into `inorder` (the `[left, right]` bounds of the current subtree) rather than new arrays.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `idx = {val: i}` mapping each inorder value to its position, for `O(1)` root lookups.\n" +
            "2. Keep a shared cursor `self.pre = 0` pointing at the next preorder value (the next root to place).\n" +
            "3. Define `build(left, right)` over inorder index bounds: if `left > right`, the range is empty — return `None`.\n" +
            "4. Take `val = preorder[self.pre]` as this subtree's root, advance `self.pre` by one, and create the node.\n" +
            "5. Look up `mid = idx[val]`, then build the left child over `(left, mid-1)` **first**, then the right child over `(mid+1, right)`; attach both and return the node.\n\n" +
            "**Why it works.** Preorder lists the root, then the entire left subtree, then the entire right subtree — which is exactly the order the recursion consumes values when you always take the next preorder value as the current root and recurse left before right. So the shared cursor always points at the correct next root at the moment each `build` call runs, and the inorder index map instantly locates where that root splits the current `[left, right]` range into left `(left, mid-1)` and right `(mid+1, right)`. The range shrinks by one node per level and becomes empty precisely at the leaves' absent children.\n\n" +
            "**Common Gotchas.**\n" +
            "- Build the left subtree **before** the right. The shared preorder cursor is order-sensitive; swapping the two recursive calls consumes roots in the wrong order and builds a scrambled tree.\n" +
            "- The base case is `left > right` (an empty inorder range), not a length check on a slice.\n" +
            "- The cursor must be *shared* across all calls (an attribute like `self.pre`, or a `nonlocal`), never a fresh local per call, or every subtree would restart at preorder[0].\n\n" +
            "**Complexity.** Time `O(n)` — each node is created exactly once with `O(1)` root lookup and no copying. Space `O(n)` for the index map plus `O(h)` recursion stack.\n\n" +
            "**Interview mindset.** When a divide-and-conquer repeatedly *searches* for a value or *copies* subarrays, replace the search with a hash map and the copies with index ranges plus a shared cursor. That pairing is the standard recipe for turning an `O(n^2)` reconstruction into `O(n)`.",
          rcs:
            "from typing import Optional, List  # Optional[TreeNode] = a TreeNode or None; List types the two traversal arrays.\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None). TreeNode(v) builds a leaf with value v.\n" +
            "# Preorder = root, LEFT subtree, RIGHT subtree.  Inorder = LEFT subtree, root, RIGHT subtree.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls buildTree on it.\n\n" +
            "    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:  # Rebuild the tree in O(n).\n\n" +
            "        # ==================== PHASE 1: PRECOMPUTE FOR O(1) ROOT LOOKUP ====================\n\n" +
            "        idx = {val: i for i, val in enumerate(inorder)}  # value -> its index in inorder, so a root's split point is O(1).\n" +
            "        self.pre = 0  # SHARED cursor over preorder; points at the next root to place.\n" +
            "                      # Why self.: every recursive call must advance the SAME cursor, so it cannot be a local.\n\n" +
            "        # ==================== PHASE 2: BUILD ONE SUBTREE OVER AN INORDER RANGE ====================\n\n" +
            "        def build(left: int, right: int) -> Optional[TreeNode]:  # Builds the subtree whose inorder span is [left, right].\n\n" +
            "            if left > right:  # Empty inorder range => no node here (a leaf's missing child).\n" +
            "                return None  # Base case: hand None up; do NOT advance the cursor.\n\n" +
            "            val = preorder[self.pre]  # The next preorder value is THIS subtree's root (preorder = root-first).\n" +
            "            self.pre += 1  # Consume it: advance the shared cursor so the next call sees the following root.\n" +
            "            root = TreeNode(val)  # Build the node.\n\n" +
            "            mid = idx[val]  # O(1) lookup: where this root sits in inorder, splitting left from right.\n\n" +
            "            root.left = build(left, mid - 1)  # Recurse LEFT FIRST -- preorder lists the whole left subtree before the right,\n" +
            "                                              # so the cursor must consume it first. Pause point: this frame waits here.\n" +
            "            root.right = build(mid + 1, right)  # THEN recurse RIGHT over the remaining inorder range.\n\n" +
            "            return root  # Both children attached: return this subtree's root to the caller.\n\n" +
            "        # ==================== PHASE 3: BUILD THE WHOLE TREE ====================\n\n" +
            "        return build(0, len(inorder) - 1)  # The full inorder span is the whole tree; returns the overall root.",
          plain:
`class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        idx = {val: i for i, val in enumerate(inorder)}
        self.pre = 0
        def build(left: int, right: int) -> Optional[TreeNode]:
            if left > right:
                return None
            val = preorder[self.pre]
            self.pre += 1
            root = TreeNode(val)
            mid = idx[val]
            root.left = build(left, mid - 1)
            root.right = build(mid + 1, right)
            return root
        return build(0, len(inorder) - 1)`
        }
      ],
      patternRecognition: [
        "'Reconstruct a tree from two traversals' → preorder gives roots, inorder gives the left/right split.",
        "Preorder[0] (or postorder[-1]) is the root at each level.",
        "Optimize the repeated 'find root in inorder' with a value→index hash map."
      ],
      interviewRecall: [
        "Root = next preorder value; its position in inorder splits left vs right.",
        "Build left BEFORE right so a single preorder pointer stays in sync.",
        "Hash map + pointer turns the O(n^2) slicing version into O(n)."
      ]
    },

    {
      id: "binary-tree-maximum-path-sum",
      lc: 124,
      title: "Binary Tree Maximum Path Sum",
      difficulty: "Hard",
      category: "Trees",
      link: "https://leetcode.com/problems/binary-tree-maximum-path-sum/",
      meta: { pattern: "Tree DP", dataStructure: "Binary Tree", technique: "Gain vs global best" },
      description:
        "Given the `root` of a binary tree, return the **maximum path sum** of any non-empty path.\n\n" +
        "A **path** is a sequence of nodes where each consecutive pair is connected by an edge; a node appears at most once, and the path **need not pass through the root**. The path sum is the total of the values on it.",
      constraints: [
        "The number of nodes is in the range `[1, 3 * 10^4]`.",
        "`-1000 <= Node.val <= 1000`"
      ],
      notes: [
        "The path can start and end at **any** nodes and may live entirely within one subtree.",
        "Values can be negative, so a path is not always improved by extending it — sometimes a single node is best.",
        "At a node, a path may turn (use both children), but a value passed **up** to a parent may only continue through **one** child."
      ],
      examples: [
        {
          input: "root = [1,2,3]",
          output: "6",
          reasoning: "The best path 2 → 1 → 3 sums to 6.",
          visual:
            "```\n" +
            "     1        path: 2 -> 1 -> 3\n" +
            "    / \\       sum = 2 + 1 + 3 = 6\n" +
            "   2   3\n" +
            "```"
        },
        {
          input: "root = [-10,9,20,null,null,15,7]",
          output: "42",
          reasoning: "The best path 15 → 20 → 7 sums to 42 and never touches the negative root.",
          visual:
            "```\n" +
            "      -10\n" +
            "      /  \\\n" +
            "     9   20      best path: 15 -> 20 -> 7\n" +
            "        /  \\     sum = 15 + 20 + 7 = 42\n" +
            "       15   7\n" +
            "```"
        },
        {
          input: "root = [-3]",
          output: "-3",
          reasoning: "A single node is the only path; the answer can be negative."
        },
        {
          input: "root = [2,-1]",
          output: "2",
          reasoning: "Adding the -1 child lowers the sum, so the best path is just the node 2."
        }
      ],
      approaches: [
        {
          name: "DFS returning downward gain",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "The canonical tree-DP: when each node's answer combines results from its children but only one child can extend upward.",
          logic:
            "**What it asks.** Return the largest possible sum along any non-empty connected path in the tree. A path is a sequence of nodes connected by edges, each node used at most once; it may **bend** at a node (descending into both of its children) or run straight down one side, and it need not pass through the root. Values can be negative, so the answer itself can be negative (a lone node).\n\n" +
            "**Why the naive idea fails.** Enumerating every possible path and summing each is exponential — there are far too many start/end pairs. And because values can be negative, you cannot greedily keep extending a path either; sometimes a single node beats any longer path that would drag in a negative neighbour. The answer has to be computed bottom-up in a single pass, with care taken over what a subtree may contribute upward versus what it can only account for locally.\n\n" +
            "**Key Idea.** At each node, keep **two distinct quantities** separate. First, the **path that peaks here** — this node plus its best *downward* path on the left plus its best *downward* path on the right. This bent path can update the global answer, but it **cannot be returned to the parent**, because any path that continues up through the parent may only enter this node from *one* side (using both would make the path fork, which is illegal). Second, the **gain to hand upward** — this node plus the *single better* child branch — which is exactly what a parent is allowed to attach onto. Splitting 'what I can record here' from 'what I can pass up' is the entire trick, and it is the signature move of tree DP.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a global `best`, initialized to negative infinity, recording the maximum peak-here path sum seen anywhere.\n" +
            "2. Define `gain(node)` returning the best sum of a path that starts at `node` and extends strictly downward. For a `None` node it returns 0.\n" +
            "3. Compute `left = max(gain(node.left), 0)` and `right = max(gain(node.right), 0)`. Clamping at 0 means: if a branch's best downward gain is negative, drop it (contribute 0 instead of subtracting).\n" +
            "4. Update `best = max(best, node.val + left + right)` — the bent path that peaks at this node using *both* sides.\n" +
            "5. Return `node.val + max(left, right)` as the upward gain — the parent may continue through only *one* child.\n\n" +
            "**Why it works.** Every path has a unique highest node — its 'peak', the point where it stops going up and (possibly) bends. At that peak the path sum is exactly `node.val + left + right` with each side clamped at 0, and that is precisely the value tested against `best`. Because this test runs at *every* node, whichever node is the true optimal path's peak is considered, so the global maximum is never missed. Returning only `node.val + max(left, right)` upward respects the no-fork rule: the parent gets a straight-line extension it can legally splice onto its own path. Clamping negative gains at 0 encodes 'only extend into a child if that child actually helps.'\n\n" +
            "**Common Gotchas.**\n" +
            "- Initialize `best` to `float('-inf')`, never 0 — all node values can be negative, and a single node may be the whole answer (e.g. `[-3]` returns `-3`).\n" +
            "- The `max(gain(child), 0)` clamp is essential; without it a negative subtree would drag down an otherwise-good peak.\n" +
            "- Do not return `node.val + left + right` upward — that hands the parent a forked path and produces wrong answers. Return `node.val + max(left, right)`.\n" +
            "- Using `self.best` (an instance attribute) lets the nested `gain` *mutate* the shared best across frames; a plain local would not persist upward.\n\n" +
            "**Complexity.** Time `O(n)` — exactly one `gain` call per node doing constant work. Space `O(h)` for the recursion stack, `h` being the tree height.\n\n" +
            "**Interview mindset.** When 'the best answer that can be *recorded* at a node' (bend allowed, both children) differs from 'what a node can *return* to its parent' (one branch only), split them into a returned value plus a global variable updated as a side effect. That split is the canonical tree-DP pattern and reappears in diameter, longest-path, and house-robber-on-a-tree problems.",
          rcs:
            "from typing import Optional  # Optional[TreeNode] means the value is either a TreeNode or None (an empty subtree).\n\n\n" +
            "# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload),\n" +
            "# .left (the left child or None) and .right (the right child or None).\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls maxPathSum on it.\n\n" +
            "    def maxPathSum(self, root: Optional[TreeNode]) -> int:  # Return the max sum over any non-empty path (may bend, may skip the root).\n\n" +
            "        self.best = float('-inf')  # GLOBAL best over every 'peak-here' path found so far.\n" +
            "                                   # Why -inf not 0: values can be negative, so a lone node may be the answer.\n" +
            "                                   # Why self.: the nested gain() must MUTATE this across recursive frames.\n\n" +
            "        # ==================== HELPER: BEST DOWNWARD GAIN STARTING AT node ====================\n\n" +
            "        def gain(node: Optional[TreeNode]) -> int:  # RETURNS the best sum of a path that starts at node and goes strictly DOWN.\n" +
            "                                                    # Side effect: it also updates self.best with the bent path peaking here.\n\n" +
            "            if not node:  # Base case: an absent child.\n" +
            "                return 0  # An empty branch contributes 0 gain; hand 0 up. Execution flow: unwind to the caller.\n\n" +
            "            left = max(gain(node.left), 0)  # Recurse LEFT: best downward gain on the left, CLAMPED at 0.\n" +
            "                                            # Pause point: this frame waits for the whole left subtree first.\n" +
            "                                            # Why max(..,0): if the left branch is negative, DROP it (add nothing).\n\n" +
            "            right = max(gain(node.right), 0)  # Recurse RIGHT: best downward gain on the right, also clamped at 0.\n" +
            "                                              # Traversal order: post-order -- both children measured before this node acts.\n\n" +
            "            self.best = max(self.best, node.val + left + right)  # BENT path peaking HERE uses BOTH sides; record it globally.\n" +
            "                                                                 # This value CANNOT go upward -- a parent-path may not fork here.\n\n" +
            "            return node.val + max(left, right)  # UPWARD gain: this node plus the SINGLE better branch (one side only).\n" +
            "                                                # Why one side: the parent can enter this node from just one child.\n" +
            "                                                # Execution flow: this number returns to the parent's gain() call.\n\n" +
            "        gain(root)  # Run the DFS; its return value (root's upward gain) is ignored -- the answer lives in self.best.\n" +
            "        return self.best  # Every node has been a candidate peak; hand back the overall maximum path sum.",
          plain:
`class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        self.best = float('-inf')
        def gain(node: Optional[TreeNode]) -> int:
            if not node:
                return 0
            left = max(gain(node.left), 0)
            right = max(gain(node.right), 0)
            self.best = max(self.best, node.val + left + right)
            return node.val + max(left, right)
        gain(root)
        return self.best`
        }
      ],
      patternRecognition: [
        "'Maximum path sum' where the path can bend at a node and skip the root → tree DP.",
        "Distinguish 'answer through this node' (both children) from 'value returned to parent' (one child).",
        "Clamp negative child contributions to 0 — drop branches that only subtract."
      ],
      interviewRecall: [
        "gain(node) returns node.val + max(left, right); global best uses node.val + left + right.",
        "max(gain(child), 0) is the trick: never extend into a harmful subtree.",
        "Initialize best to -inf (values can be negative); a single node may be the answer."
      ]
    },

    {
      id: "diameter-of-binary-tree",
      lc: 543,
      title: "Diameter of Binary Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/diameter-of-binary-tree/",
      meta: { pattern: "Tree DP (height + global)", dataStructure: "Binary Tree", technique: "Height DFS, update best at each node" },
      description:
        "Given the `root` of a binary tree, return the length of its **diameter** — the number of **edges** on the longest path between **any** two nodes in the tree.\n\n" +
        "This path may or may not pass through the root, and its length is measured in edges (so two nodes directly connected have a path length of 1).",
      constraints: [
        "The number of nodes is in the range `[1, 10^4]`.",
        "`-100 <= Node.val <= 100`"
      ],
      notes: [
        "The diameter is counted in **edges**, not nodes: a path visiting 3 nodes has length 2.",
        "The longest path need not go through the root — it can lie entirely inside a subtree.",
        "A single node has diameter 0."
      ],
      examples: [
        {
          input: "root = [1,2,3,4,5]",
          output: "3",
          reasoning: "The longest path is 4 → 2 → 1 → 3 (or 5 → 2 → 1 → 3), which crosses 4 nodes and so has 3 edges.",
          visual:
            "```\n" +
            "        1\n" +
            "       / \\\n" +
            "      2   3      longest: 4-2-1-3\n" +
            "     / \\         = 3 edges\n" +
            "    4   5\n" +
            "```"
        },
        {
          input: "root = [1,2]",
          output: "1",
          reasoning: "The only path is 2 → 1, one edge long."
        },
        {
          input: "root = [1]",
          output: "0",
          reasoning: "A single node has no edges, so the diameter is 0."
        },
        {
          input: "root = [4,-7,-3,null,null,-9,-3,9,-7,-4,null,6,null,-6,-6,null,null,0,6]",
          output: "8",
          reasoning: "The longest path is buried deep in the subtrees and never touches the root — showing why the diameter must be tracked globally, not just at the root."
        }
      ],
      approaches: [
        {
          name: "Height DFS with a global best",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "Any 'longest path between two nodes' tree question — compute height bottom-up and combine both sides at each node.",
          logic:
            "**What it asks.** Return the diameter — the number of edges on the longest path between any two nodes, wherever that path lies in the tree.\n\n" +
            "**Why the naive idea fails.** Assuming the longest path runs through the root is wrong: it can sit entirely inside one subtree. And computing, for every node, the height of its two subtrees from scratch to combine them would recompute heights over and over, giving `O(n^2)`. You need each height computed once and the diameter checked at every node along the way.\n\n" +
            "**Key Idea.** The longest path that **bends** at a given node uses its deepest left reach plus its deepest right reach: `left_height + right_height` edges. If you run a single bottom-up DFS that **returns** each node's height, you can, at every node, update a running global best with `left_height + right_height`. The true diameter is the maximum such 'bend here' value over all nodes — this is the classic split between a value returned to the parent (height) and a value recorded globally (diameter).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a global `best = 0` for the largest diameter seen.\n" +
            "2. Define `height(node)` that returns the number of edges on the longest downward path from `node`.\n" +
            "3. If `node` is `None`, return `-1` (so a single leaf gets height 0: `1 + max(-1, -1)`), or return 0 counting in nodes — either is fine as long as it is consistent.\n" +
            "4. Recurse to get `left = height(node.left)` and `right = height(node.right)`.\n" +
            "5. Update `best = max(best, left + right + 2)` if using the `-1` base (the `+2` restores the two edges to the children), then return `1 + max(left, right)`.\n\n" +
            "**Why it works.** Every simple path in a tree has a single highest node where it bends; at that node the path is exactly its deepest left descent plus its deepest right descent. By checking `left + right` at *every* node, we consider the bend point of every possible path, so the maximum is the diameter. Each height is computed once as the DFS unwinds, keeping it linear.\n\n" +
            "**Common Gotchas.**\n" +
            "- Diameter is in **edges**; be consistent with your height convention (using `-1` for the empty node makes a leaf's height 0 and the edge count fall out cleanly).\n" +
            "- The answer is a *global* max updated at each node — do not just return the value at the root.\n" +
            "- A node returns only `1 + max(left, right)` upward (one branch), even though it *records* `left + right` (both branches) — mixing these up is the classic bug.\n\n" +
            "**Complexity.** Time `O(n)` — each node is visited once. Space `O(h)` for the recursion stack, where `h` is the tree height.\n\n" +
            "**Interview mindset.** 'Longest path between two nodes' → bottom-up height DFS plus a global max combining both children at each node; the same 'return one thing, record another' shape recurs across tree-DP problems.",
          rcs:
`class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        self.best = 0                      # Largest left+right edge count seen.
        def height(node: Optional[TreeNode]) -> int:
            if not node:                   # Empty -> -1 so a leaf's height is 0.
                return -1
            left = height(node.left)       # Deepest downward reach on the left.
            right = height(node.right)     # Deepest downward reach on the right.
            # Path bending HERE spans both sides: +2 restores edges to the children.
            self.best = max(self.best, left + right + 2)
            return 1 + max(left, right)    # Upward we can extend only ONE branch.
        height(root)
        return self.best`,
          plain:
`class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        self.best = 0
        def height(node: Optional[TreeNode]) -> int:
            if not node:
                return -1
            left = height(node.left)
            right = height(node.right)
            self.best = max(self.best, left + right + 2)
            return 1 + max(left, right)
        height(root)
        return self.best`
        }
      ],
      patternRecognition: [
        "'Longest path between any two nodes' → height DFS + global best of left+right.",
        "The path bends at one node; check that bend at every node.",
        "Return one branch upward, record both branches globally — the tree-DP split."
      ],
      interviewRecall: [
        "best = max(best, left_h + right_h) at each node; return 1 + max(left_h, right_h).",
        "Count edges, not nodes — use -1 for the empty base so a leaf is height 0.",
        "The diameter may not touch the root, so track it globally, O(n)/O(h)."
      ]
    },

    {
      id: "balanced-binary-tree",
      lc: 110,
      title: "Balanced Binary Tree",
      difficulty: "Easy",
      category: "Trees",
      link: "https://leetcode.com/problems/balanced-binary-tree/",
      meta: { pattern: "Tree DP (height + flag)", dataStructure: "Binary Tree", technique: "Height DFS with -1 short-circuit" },
      description:
        "Given the `root` of a binary tree, determine whether it is **height-balanced** — a tree in which, for **every** node, the heights of its left and right subtrees differ by **at most 1**.",
      constraints: [
        "The number of nodes is in the range `[0, 5000]`.",
        "`-10^4 <= Node.val <= 10^4`"
      ],
      notes: [
        "The balance condition must hold at **every** node, not just the root.",
        "An empty tree is balanced.",
        "Being balanced at the root does not imply balance deeper down — a subtree can be skewed."
      ],
      examples: [
        {
          input: "root = [3,9,20,null,null,15,7]",
          output: "true",
          reasoning: "At every node the two subtree heights differ by at most 1.",
          visual:
            "```\n" +
            "        3          left height 1, right height 2\n" +
            "       / \\         |1 - 2| = 1  OK everywhere\n" +
            "      9  20\n" +
            "        /  \\\n" +
            "       15   7\n" +
            "```"
        },
        {
          input: "root = [1,2,2,3,3,null,null,4,4]",
          output: "false",
          reasoning: "The left subtree grows two levels deeper than the right at the root, so heights differ by more than 1.",
          visual:
            "```\n" +
            "         1        left height 3, right height 1\n" +
            "        / \\       |3 - 1| = 2  -> NOT balanced\n" +
            "       2   2\n" +
            "      / \\\n" +
            "     3   3\n" +
            "    / \\\n" +
            "   4   4\n" +
            "```"
        },
        {
          input: "root = []",
          output: "true",
          reasoning: "An empty tree is trivially balanced."
        },
        {
          input: "root = [1,2,null,3]",
          output: "false",
          reasoning: "The left chain 1 → 2 → 3 has height 2 on the left and 0 on the right at the root: difference 2."
        }
      ],
      approaches: [
        {
          name: "Bottom-up height with -1 sentinel",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "The optimal single-pass check — compute height and detect imbalance together, short-circuiting as soon as any node fails.",
          logic:
            "**What it asks.** Decide whether the tree is height-balanced: at every node the left and right subtree heights differ by at most 1.\n\n" +
            "**Why the naive idea fails.** The obvious approach — for each node, call a separate `height()` on its two subtrees and compare — recomputes heights repeatedly from the top down, giving `O(n^2)` on a skewed tree. It also checks balance top-down when the information (heights) is most naturally produced bottom-up. We want to compute each height exactly once and check balance on the way up.\n\n" +
            "**Key Idea.** Fold the balance check **into** the height computation. Write a DFS that returns a node's height, but the moment it discovers any subtree is unbalanced it returns a sentinel **`-1`** instead. That sentinel propagates all the way up, short-circuiting the rest of the work: if either child returns `-1`, or the two child heights differ by more than 1, this node is unbalanced too and returns `-1`. The tree is balanced iff the root's call is not `-1`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `check(node)` returning the height of `node`, or `-1` if any subtree under it is unbalanced.\n" +
            "2. Base case: an empty node has height 0 — return 0.\n" +
            "3. Recurse `left = check(node.left)`; if `left == -1`, return `-1` immediately.\n" +
            "4. Recurse `right = check(node.right)`; if `right == -1`, return `-1` immediately.\n" +
            "5. If `abs(left - right) > 1`, return `-1`; otherwise return `1 + max(left, right)`.\n" +
            "6. The whole tree is balanced iff `check(root) != -1`.\n\n" +
            "**Why it works.** Because the recursion is bottom-up, by the time a node compares its children's heights those heights are already final and correct. The `-1` sentinel is a truthful 'unbalanced somewhere below' signal that can never be confused with a real height (heights are non-negative), so once any node fails, every ancestor also returns `-1` without doing extra comparisons. A single post-order pass therefore both measures and validates.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check `left == -1` (and `right == -1`) *before* comparing heights, so imbalance short-circuits and you never treat `-1` as a valid height.\n" +
            "- Balance must hold at every node — a root-only check is wrong; the recursion guarantees all nodes are tested.\n" +
            "- An empty tree returns height 0 and counts as balanced.\n\n" +
            "**Complexity.** Time `O(n)` — each node is visited once thanks to the merged check. Space `O(h)` for the recursion stack.\n\n" +
            "**Interview mindset.** When a naive solution calls a helper (`height`) inside the traversal and looks quadratic, ask 'can the helper's result be returned as part of the same pass?' — merging the measurement with the check plus a sentinel is the standard fix.",
          rcs:
`class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def check(node: Optional[TreeNode]) -> int:
            if not node:                   # Empty subtree: height 0, balanced.
                return 0
            left = check(node.left)        # Height of left, or -1 if unbalanced.
            if left == -1:                 # Short-circuit: failure bubbles up.
                return -1
            right = check(node.right)      # Height of right, or -1 if unbalanced.
            if right == -1:
                return -1
            if abs(left - right) > 1:      # Imbalance HERE -> signal with -1.
                return -1
            return 1 + max(left, right)    # Balanced: report this node's height.
        return check(root) != -1`,
          plain:
`class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def check(node: Optional[TreeNode]) -> int:
            if not node:
                return 0
            left = check(node.left)
            if left == -1:
                return -1
            right = check(node.right)
            if right == -1:
                return -1
            if abs(left - right) > 1:
                return -1
            return 1 + max(left, right)
        return check(root) != -1`
        }
      ],
      patternRecognition: [
        "'Balanced tree' / 'subtree heights differ by <= 1' → bottom-up height DFS.",
        "Return a sentinel (-1) to fuse the height calc with the balance check in one pass.",
        "Naive per-node height() calls are O(n^2); the merged pass is O(n)."
      ],
      interviewRecall: [
        "check(node) returns height, or -1 if any subtree is unbalanced.",
        "Test left == -1 and right == -1 before comparing, to short-circuit.",
        "Tree is balanced iff check(root) != -1; empty tree is balanced."
      ]
    },

    {
      id: "binary-tree-right-side-view",
      lc: 199,
      title: "Binary Tree Right Side View",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/binary-tree-right-side-view/",
      meta: { pattern: "BFS / DFS by level", dataStructure: "Binary Tree", technique: "Last node per level (or first on right-first DFS)" },
      description:
        "Given the `root` of a binary tree, imagine standing on its **right** side. Return the values of the nodes you can see, ordered from **top to bottom**.\n\n" +
        "The visible node at each depth is the **rightmost** node on that level.",
      constraints: [
        "The number of nodes is in the range `[0, 100]`.",
        "`-100 <= Node.val <= 100`"
      ],
      notes: [
        "You see exactly **one** node per level — the rightmost one.",
        "A node can be visible even if it is a left child, as long as it is the rightmost node on its level.",
        "An empty tree returns an empty list."
      ],
      examples: [
        {
          input: "root = [1,2,3,null,5,null,4]",
          output: "[1,3,4]",
          reasoning: "Level 0 shows 1, level 1's rightmost is 3, level 2's rightmost is 4.",
          visual:
            "```\n" +
            "        1        <- see 1\n" +
            "       / \\\n" +
            "      2   3      <- see 3 (rightmost)\n" +
            "       \\   \\\n" +
            "        5   4    <- see 4 (rightmost)\n" +
            "```"
        },
        {
          input: "root = [1,null,3]",
          output: "[1,3]",
          reasoning: "Only a right child on level 1, so 3 is visible."
        },
        {
          input: "root = [1,2,3,4]",
          output: "[1,3,4]",
          reasoning: "On level 2 only node 4 (a left child of 2) exists, so it is the rightmost and is visible.",
          visual:
            "```\n" +
            "        1        <- see 1\n" +
            "       / \\\n" +
            "      2   3      <- see 3\n" +
            "     /\n" +
            "    4            <- see 4 (only node on this level)\n" +
            "```"
        },
        {
          input: "root = []",
          output: "[]",
          reasoning: "No nodes, nothing to see."
        }
      ],
      approaches: [
        {
          name: "BFS taking the last node per level",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The most intuitive framing — do a level-order traversal and keep the last value drained from each level.",
          logic:
            "**What it asks.** Return, top to bottom, the rightmost node value on each level — what you would see looking at the tree from the right.\n\n" +
            "**Why the naive idea fails.** Simply following right children from the root fails: when a node has no right child, the rightmost node on that level may be reached via a left child instead (see example 3). You cannot decide visibility node by node — you must know the full contents of each level.\n\n" +
            "**Key Idea.** 'Rightmost per level' is a level-order (BFS) question. Process the tree level by level; the **last** node drained from each level is precisely the one visible from the right. Using the queue-size snapshot to bound each level (the same trick as level-order traversal), you record the final node of every round.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the tree is empty, return `[]`.\n" +
            "2. Seed a FIFO queue (`deque`) with the root.\n" +
            "3. While the queue is non-empty, snapshot `size = len(queue)` — the count of nodes on this level.\n" +
            "4. Loop `size` times, popping from the front and enqueuing each node's left then right children.\n" +
            "5. When the popped node is the **last** of the round (index `size - 1`), append its value to the result.\n" +
            "6. Return the result after the queue empties.\n\n" +
            "**Why it works.** The size snapshot isolates exactly one level per round. Because children are pushed left-then-right, the queue holds each level in left-to-right order, so the final node popped in a round is the rightmost node on that level — exactly what is visible.\n\n" +
            "**Common Gotchas.**\n" +
            "- Snapshot `len(queue)` before the inner loop, or newly pushed children merge into the level.\n" +
            "- Take the node at index `size - 1` (the last drained), not the first.\n" +
            "- Push left before right so the last item really is the rightmost.\n\n" +
            "**Complexity.** Time `O(n)` — each node is enqueued and dequeued once. Space `O(n)` — the queue can hold a full level.\n\n" +
            "**Interview mindset.** 'One value per level' / 'seen from the side' signals level-order BFS; decide up front which node in the level you keep (here, the last).",
          rcs:
`class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        from collections import deque
        if not root:                       # Empty tree -> nothing visible.
            return []
        result = []
        queue = deque([root])
        while queue:
            size = len(queue)              # Nodes on the current level.
            for i in range(size):          # Drain exactly this level.
                node = queue.popleft()
                if i == size - 1:          # Last node of the level = rightmost.
                    result.append(node.val)
                if node.left:              # Enqueue left before right...
                    queue.append(node.left)
                if node.right:             # ...so the last popped is rightmost.
                    queue.append(node.right)
        return result`,
          plain:
`class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        from collections import deque
        if not root:
            return []
        result = []
        queue = deque([root])
        while queue:
            size = len(queue)
            for i in range(size):
                node = queue.popleft()
                if i == size - 1:
                    result.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        return result`
        },
        {
          name: "DFS visiting right first",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "When you prefer recursion or a smaller stack footprint — record the first node seen at each new depth while exploring right before left.",
          logic:
            "**What it asks.** The same result — the rightmost value at each depth — built with recursion instead of a queue.\n\n" +
            "**Why the naive idea fails.** A standard left-first DFS reaches many nodes at each depth; you would have to keep overwriting to find the rightmost. Flipping the visit order removes that ambiguity entirely.\n\n" +
            "**Key Idea.** Do a DFS that visits the **right** child **before** the left, carrying the current `depth`. The **first** node you encounter at any given depth is, by construction, the rightmost one on that level. So whenever `depth == len(result)` — meaning you are seeing this depth for the very first time — record the node's value.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `result` and call `dfs(root, 0)`.\n" +
            "2. In `dfs(node, depth)`, return immediately if `node` is `None`.\n" +
            "3. If `depth == len(result)`, this depth has not been recorded yet — append `node.val` (this is the rightmost node at that depth).\n" +
            "4. Recurse into the **right** child at `depth + 1` first.\n" +
            "5. Then recurse into the **left** child at `depth + 1`.\n\n" +
            "**Why it works.** Because the right subtree is fully explored before the left at every level, the first node visited at each new depth is the one furthest to the right. The `depth == len(result)` guard fires exactly once per depth — on that rightmost node — so each level contributes precisely its visible value, top to bottom.\n\n" +
            "**Common Gotchas.**\n" +
            "- Recurse right **before** left; the natural left-first order records the wrong node.\n" +
            "- The `depth == len(result)` check must gate the append, so only the first (rightmost) node per depth is stored.\n" +
            "- Pass `depth + 1` to children, not a mutated shared counter.\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node. Space `O(h)` for the recursion stack, better than BFS's `O(n)` queue on wide trees.",
          rcs:
`class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        result = []
        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if not node:
                return
            if depth == len(result):       # First node seen at this depth...
                result.append(node.val)    # ...is the rightmost one.
            dfs(node.right, depth + 1)     # Visit RIGHT before left.
            dfs(node.left, depth + 1)
        dfs(root, 0)
        return result`,
          plain:
`class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        result = []
        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if not node:
                return
            if depth == len(result):
                result.append(node.val)
            dfs(node.right, depth + 1)
            dfs(node.left, depth + 1)
        dfs(root, 0)
        return result`
        }
      ],
      patternRecognition: [
        "'Seen from the right / left side' / 'one node per level' → level-order BFS.",
        "BFS: keep the last node drained from each level.",
        "DFS alternative: visit right first and record the first node at each new depth."
      ],
      interviewRecall: [
        "BFS: for i in range(size), append when i == size - 1.",
        "DFS: recurse right before left, append when depth == len(result).",
        "A left child can be visible if it is the only/rightmost node on its level."
      ]
    },

    {
      id: "count-good-nodes-in-binary-tree",
      lc: 1448,
      title: "Count Good Nodes in Binary Tree",
      difficulty: "Medium",
      category: "Trees",
      link: "https://leetcode.com/problems/count-good-nodes-in-binary-tree/",
      meta: { pattern: "DFS carrying path state", dataStructure: "Binary Tree", technique: "Thread max-so-far down the path" },
      description:
        "Given the `root` of a binary tree, a node **X** is called **good** if, on the path from the root down to **X**, there is **no** node with a value **greater than** X's value.\n\n" +
        "Return the number of good nodes in the tree.",
      constraints: [
        "The number of nodes is in the range `[1, 10^5]`.",
        "`-10^4 <= Node.val <= 10^4`"
      ],
      notes: [
        "The **root** is always good — its root-to-node path is just itself.",
        "A node is good when its value is **>=** the maximum value seen so far on the path (ties count as good, since 'greater than' is strict).",
        "'Good' depends only on the ancestors on the path, not on siblings or descendants."
      ],
      examples: [
        {
          input: "root = [3,1,4,3,null,1,5]",
          output: "4",
          reasoning: "The good nodes are 3 (root), 4, 5, and the left-subtree 3. Nodes 1 and 1 have a larger ancestor (3) on their path, so they are not good.",
          visual:
            "```\n" +
            "        3        good (root)\n" +
            "       / \\\n" +
            "      1   4      1 bad (3>1), 4 good\n" +
            "     /   / \\\n" +
            "    3   1   5    3 good (>= max 3), 1 bad, 5 good\n" +
            "```"
        },
        {
          input: "root = [3,3,null,4,2]",
          output: "3",
          reasoning: "3 (root), 3, and 4 are good; the 2 has ancestor 4 on its path (4 > 2), so it is not good.",
          visual:
            "```\n" +
            "        3        good (root)\n" +
            "       /\n" +
            "      3          good (3 >= 3)\n" +
            "     / \\\n" +
            "    4   2         4 good, 2 bad (4 > 2)\n" +
            "```"
        },
        {
          input: "root = [1]",
          output: "1",
          reasoning: "A single node is always good."
        },
        {
          input: "root = [2,4,4]",
          output: "3",
          reasoning: "Both children equal the root (4 >= 2), so all three nodes are good."
        }
      ],
      approaches: [
        {
          name: "DFS threading the path maximum",
          time: "O(n)",
          space: "O(h)",
          whenToUse: "Whenever 'goodness' of a node depends on the ancestors along its root-to-node path — carry that path summary as a DFS argument.",
          logic:
            "**What it asks.** Count the good nodes: a node is good when no ancestor on its root-to-node path has a strictly greater value.\n\n" +
            "**Why the naive idea fails.** Re-deriving, for each node, the maximum along its path by walking back up to the root would be `O(n * h)` and awkward. The observation that saves work is that the path maximum for a child is trivially derivable from the parent's path maximum — so it should be passed *down*, not recomputed.\n\n" +
            "**Key Idea.** Do a top-down DFS that carries `max_so_far`, the largest value seen on the path from the root to (and including) the current node's parent. A node is good exactly when `node.val >= max_so_far`. When you descend, update the running max to `max(max_so_far, node.val)` and pass it to both children. Sum the good-node counts from the two subtrees plus 1 (or 0) for the current node.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `dfs(node, max_so_far)` returning the number of good nodes in `node`'s subtree.\n" +
            "2. If `node` is `None`, return 0.\n" +
            "3. Set `good = 1 if node.val >= max_so_far else 0` — this node is good iff it is at least the path max.\n" +
            "4. Compute the updated maximum `new_max = max(max_so_far, node.val)`.\n" +
            "5. Return `good + dfs(node.left, new_max) + dfs(node.right, new_max)`.\n" +
            "6. Start the whole traversal with `dfs(root, float('-inf'))` (or `root.val`) so the root always counts.\n\n" +
            "**Why it works.** `max_so_far` is an exact summary of every ancestor's values (only the maximum matters, since a node is bad iff *any* ancestor exceeds it). Passing it down means each node checks against the correct path maximum in `O(1)`, and updating it before recursing keeps the invariant true for the children. Summing subtree counts tallies every good node exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison is `>=`: a node equal to the path maximum is still good, because 'greater than' in the definition is strict.\n" +
            "- Start with `-inf` (or the root's own value) so the root is always counted as good.\n" +
            "- Update the max on the way *down* and pass copies to each child — do not share a single mutable max across siblings.\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node. Space `O(h)` for the recursion stack.\n\n" +
            "**Interview mindset.** When whether a node qualifies depends on a summary of its ancestors (max, sum, count along the path), thread that summary down as a DFS parameter rather than recomputing it — the defining move for root-to-node path problems.",
          rcs:
`class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        def dfs(node: Optional[TreeNode], max_so_far: int) -> int:
            if not node:                   # Empty subtree contributes no good nodes.
                return 0
            good = 1 if node.val >= max_so_far else 0  # Good iff >= path max.
            new_max = max(max_so_far, node.val)        # Extend the path maximum.
            # Tally this node plus good nodes found in both subtrees.
            return good + dfs(node.left, new_max) + dfs(node.right, new_max)
        return dfs(root, float('-inf'))    # Root has no ancestors -> always good.`,
          plain:
`class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        def dfs(node: Optional[TreeNode], max_so_far: int) -> int:
            if not node:
                return 0
            good = 1 if node.val >= max_so_far else 0
            new_max = max(max_so_far, node.val)
            return good + dfs(node.left, new_max) + dfs(node.right, new_max)
        return dfs(root, float('-inf'))`
        }
      ],
      patternRecognition: [
        "'Node qualifies based on its root-to-node path' → thread a path summary down the DFS.",
        "Here the summary is the running maximum; good iff node.val >= max_so_far.",
        "Return summed subtree counts; the root always counts."
      ],
      interviewRecall: [
        "Carry max_so_far down; count when node.val >= max_so_far (>= for ties).",
        "new_max = max(max_so_far, node.val) passed to both children.",
        "Start at -inf so the root is good; O(n) time, O(h) stack."
      ]
    },

    {
      id: "serialize-and-deserialize-binary-tree",
      lc: 297,
      title: "Serialize and Deserialize Binary Tree",
      difficulty: "Hard",
      category: "Trees",
      link: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/",
      meta: { pattern: "Preorder with null markers", dataStructure: "Binary Tree", technique: "Encode structure via explicit nulls, rebuild with an iterator" },
      description:
        "Design an algorithm to **serialize** a binary tree to a string and **deserialize** that string back into the identical tree.\n\n" +
        "There is no restriction on the encoding format — you only need `deserialize(serialize(root))` to reproduce the original tree exactly (same structure and values).",
      constraints: [
        "The number of nodes is in the range `[0, 10^4]`.",
        "`-1000 <= Node.val <= 1000`"
      ],
      notes: [
        "The empty tree must round-trip correctly (serialize to something deserialize can read back as an empty tree).",
        "Explicit **null markers** are what make the encoding unambiguous — without them, many different trees share the same value sequence.",
        "Preorder pairs naturally with reconstruction because the root always comes first in the stream."
      ],
      examples: [
        {
          input: "root = [1,2,3,null,null,4,5]",
          output: "\"1,2,#,#,3,4,#,#,5,#,#\"  (then deserialize returns the same tree)",
          reasoning: "Preorder visits 1, then the left subtree (2 with two null children), then the right subtree (3 with children 4 and 5), writing '#' for each missing child.",
          visual:
            "```\n" +
            "        1\n" +
            "       / \\\n" +
            "      2   3        preorder + nulls:\n" +
            "         / \\       1,2,#,#,3,4,#,#,5,#,#\n" +
            "        4   5\n" +
            "```"
        },
        {
          input: "root = []",
          output: "\"#\"  (deserializes back to an empty tree)",
          reasoning: "A lone null marker encodes the empty tree."
        },
        {
          input: "root = [1,2]",
          output: "\"1,2,#,#,#\"",
          reasoning: "1 has a left child 2 (with two nulls) and a null right child — the markers distinguish this from a tree where 2 is the right child."
        },
        {
          input: "root = [1,null,2]",
          output: "\"1,#,2,#,#\"",
          reasoning: "The '#' right after 1 records its missing left child, so 2 is unambiguously the right child — contrast with the previous example."
        }
      ],
      approaches: [
        {
          name: "Preorder DFS with null markers",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The standard, cleanest encoding — preorder writes the root first, and explicit nulls make the shape recoverable in a single left-to-right pass.",
          logic:
            "**What it asks.** Design two functions: `serialize` turns a binary tree into a string, and `deserialize` turns that string back into the exact same tree.\n\n" +
            "**Why the naive idea fails.** Writing just the node values in preorder (or inorder) is **not** reversible: many different tree shapes produce the same value sequence, because you lose track of where children are missing. Storing an inorder plus a preorder can rebuild a tree only when values are unique — not guaranteed here. The structure itself must be encoded, not just the values.\n\n" +
            "**Key Idea.** Do a **preorder** traversal (node, left, right) and emit an explicit **null marker** (e.g. `#`) for every missing child. These markers remove all ambiguity: the string now records, for every position, whether a child exists. To rebuild, read the tokens left to right with a single moving **index/iterator** — because preorder writes the root before its subtrees, the first unread token is always the next node to construct, and a `#` means 'this child is empty'.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. **Serialize:** recurse in preorder. If the node is `None`, append `#`; otherwise append `str(node.val)`, then recurse left, then right. Join the tokens with commas.\n" +
            "2. **Deserialize:** split the string into a list of tokens and use an iterator (or an index) to consume them in order.\n" +
            "3. Define a `build()` helper: read the next token. If it is `#`, return `None`.\n" +
            "4. Otherwise create a node from the token's integer value, set `node.left = build()` and `node.right = build()` (in that order), and return the node.\n" +
            "5. Call `build()` once on the token stream to reconstruct the root.\n\n" +
            "**Why it works.** Preorder guarantees the root token precedes all of its subtree tokens, so consuming tokens strictly left to right rebuilds nodes in the same order they were written. The null markers tell `build()` exactly when to stop descending a branch, so it recurses left and right the same number of times serialize did — reproducing the original structure node for node. This is why the markers make the encoding unambiguous: each token maps to one decision (make a node, or stop), leaving no room for two trees to share an encoding.\n\n" +
            "**Common Gotchas.**\n" +
            "- Emit a marker for **every** null, including the children of leaves, or you cannot tell a leaf from a node with children.\n" +
            "- Deserialize must consume tokens in the **same** preorder order — build the left child before the right, matching serialize.\n" +
            "- Use a shared iterator/index so each `build()` call advances the same cursor; a fresh copy per call would re-read tokens.\n" +
            "- Handle the empty tree: serialize emits a single `#`, and `build()` reads it as `None`.\n\n" +
            "**Complexity.** Time `O(n)` for both directions — each node and each null marker is written/read once. Space `O(n)` for the output string plus `O(h)` recursion depth.\n\n" +
            "**Interview mindset.** 'Serialize a tree' → preorder plus explicit null markers, rebuilt with a single advancing cursor; BFS with null markers works too, but preorder+iterator is the most compact to code correctly.",
          rcs:
`class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out = []
        def dfs(node: Optional[TreeNode]) -> None:
            if not node:                   # Record every missing child explicitly.
                out.append('#')
                return
            out.append(str(node.val))      # Root first (preorder)...
            dfs(node.left)                 # ...then left subtree...
            dfs(node.right)                # ...then right subtree.
        dfs(root)
        return ','.join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(data.split(','))     # Single advancing cursor.
        def build() -> Optional[TreeNode]:
            val = next(tokens)             # Next token in preorder.
            if val == '#':                 # Marker -> empty child.
                return None
            node = TreeNode(int(val))      # Build node, then its children in order.
            node.left = build()
            node.right = build()
            return node
        return build()`,
          plain:
`class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out = []
        def dfs(node: Optional[TreeNode]) -> None:
            if not node:
                out.append('#')
                return
            out.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return ','.join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(data.split(','))
        def build() -> Optional[TreeNode]:
            val = next(tokens)
            if val == '#':
                return None
            node = TreeNode(int(val))
            node.left = build()
            node.right = build()
            return node
        return build()`
        }
      ],
      patternRecognition: [
        "'Serialize / deserialize a tree' → preorder traversal with explicit null markers.",
        "Null markers encode the structure so values alone need not be unique.",
        "Rebuild with a single advancing iterator/index; root-first order makes it work."
      ],
      interviewRecall: [
        "Serialize: preorder, append '#' for every None, join with commas.",
        "Deserialize: iter over tokens, '#' -> None, else node with left=build(), right=build().",
        "Emit markers for ALL nulls (even leaf children) and consume in the same order; O(n)/O(n)."
      ]
    }
  ]);
})();
