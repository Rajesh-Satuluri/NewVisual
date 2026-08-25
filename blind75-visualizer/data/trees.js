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
            "**A. What is being asked?** Turn the tree into its mirror image: at every node the left subtree and right subtree switch places.\n\n" +
            "**D. Key observation.** Inverting a tree is *self-similar*: the mirror of a node is that node with its two subtrees swapped **and each of those subtrees already inverted**. That recursive definition is the whole solution.\n\n" +
            "**E. Pattern / data structure.** Plain tree recursion (a post-order-flavoured DFS). Trust the recursion: assume the calls on the children return correctly inverted subtrees, then wire them in reversed.\n\n" +
            "**F. Why it works.** If `invert(left)` and `invert(right)` correctly mirror the subtrees, then attaching the inverted right subtree as the new left child (and vice-versa) mirrors the current node too. By induction on tree height, the whole tree is mirrored.\n\n" +
            "**I. Step by step.** If the node is `None`, return `None` (base case). Otherwise recursively invert both children, assign them to the *opposite* sides, and return the node. The order — swap first vs recurse first — does not matter as long as you capture both results before overwriting.\n\n" +
            "**J. Why correct.** Every node is visited exactly once and has its two children swapped exactly once, which is precisely the definition of the mirror.\n\n" +
            "**K/L. Complexity.** Each of `n` nodes is touched once → time `O(n)`. Space is the recursion stack, `O(h)` where `h` is the height (`O(log n)` balanced, `O(n)` worst case / skewed).\n\n" +
            "**M. Interview mindset.** When an operation on a tree is defined the same way on every subtree, reach for recursion and let the base case (`None`) do the stopping.",
          rcs:
`class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root:                       # Base case: nothing to invert.
            return None
        left = self.invertTree(root.left)  # Invert the left subtree fully first.
        right = self.invertTree(root.right)  # Invert the right subtree fully.
        root.left = right                  # Attach them on the OPPOSITE sides.
        root.right = left
        return root                        # Return this (now mirrored) node.`,
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
            "**A. What is being asked?** The length (in nodes) of the longest downward path.\n\n" +
            "**D. Key observation.** The depth of a tree is `1 + the depth of its deeper subtree`. That single recurrence solves it: a node contributes 1 (itself) plus the best its children can offer.\n\n" +
            "**E. Pattern.** Bottom-up DFS: the recursion returns the height of each subtree, and the parent combines them with `max`.\n\n" +
            "**F. Why it works.** The longest path through a node either goes down its left subtree or its right subtree; taking the max of the two subtree depths and adding 1 gives the deepest reach from that node.\n\n" +
            "**I. Step by step.** If the node is `None`, its depth is 0 (base case). Otherwise compute the depth of each child, take the larger, add 1 for the current node.\n\n" +
            "**J. Why correct.** By induction: if each child returns its own correct max depth, `1 + max(left, right)` is correct for the parent, and the base case anchors it.\n\n" +
            "**K/L. Complexity.** Every node contributes one call → time `O(n)`; stack depth is the tree height → space `O(h)`.\n\n" +
            "**M. Interview mindset.** 'Height / depth / max path length downward' is the textbook cue for `1 + max(recurse left, recurse right)`.",
          rcs:
`class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        if not root:                       # Empty subtree has depth 0.
            return 0
        left = self.maxDepth(root.left)    # Deepest reach on the left.
        right = self.maxDepth(root.right)  # Deepest reach on the right.
        return 1 + max(left, right)        # This node + the deeper side.`,
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
            "**A. What is being asked?** Are the two trees structurally identical with matching values everywhere?\n\n" +
            "**D. Key observation.** Two trees are the same iff their **roots match** and their **left subtrees are the same** and their **right subtrees are the same**. That definition is directly recursive.\n\n" +
            "**E. Pattern.** Walk both trees *in lockstep*, comparing the two current nodes at each step.\n\n" +
            "**F. Why it works.** We check three things at every position: both nodes exist (or both are `None`), their values are equal, and the recursion agrees on both children. Any mismatch anywhere short-circuits to `False`.\n\n" +
            "**I. Step by step.**\n" +
            "1. If both nodes are `None` → identical here, return `True`.\n" +
            "2. If exactly one is `None`, or the values differ → return `False`.\n" +
            "3. Otherwise recurse on `(p.left, q.left)` **and** `(p.right, q.right)`.\n\n" +
            "**J. Why correct.** The base cases capture the leaf/empty boundaries; the `and` requires every corresponding pair of nodes to agree, so a single difference propagates up as `False`.\n\n" +
            "**K/L. Complexity.** Each pair of nodes is compared once → time `O(n)` (n = size of the smaller tree, since a shape mismatch stops early); space `O(h)` for the stack.\n\n" +
            "**M. Interview mindset.** 'Compare two trees' → parallel recursion with the None/None, None/one, value-mismatch cases handled first.",
          rcs:
`class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        if not p and not q:                # Both empty here -> matched.
            return True
        if not p or not q or p.val != q.val:  # One missing, or values differ -> not same.
            return False
        # Roots match; both subtrees must also match.
        return (self.isSameTree(p.left, q.left)
                and self.isSameTree(p.right, q.right))`,
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
            "**A. What is being asked?** Does `subRoot` appear somewhere inside `root` as a *complete* subtree (node + all descendants)?\n\n" +
            "**D. Key observation.** `subRoot` is a subtree of `root` iff **some** node of `root` roots a tree identical to `subRoot`. So the problem decomposes into: (1) visit every node of `root`, and (2) at each node run a full 'same tree' check against `subRoot`.\n\n" +
            "**E. Pattern.** Outer traversal over `root` + the Same-Tree comparison (LC 100) as a helper. Two recursions working together.\n\n" +
            "**F. Why it works.** If any starting node produces an exact match, we have found the subtree; if we exhaust all nodes without a match, it does not exist. An empty `subRoot` is a subtree of anything; if `root` runs out first, the answer is `False`.\n\n" +
            "**I. Step by step.** At the current `root` node: if `sameTree(root, subRoot)` is `True`, return `True`. Otherwise recurse into the left and right children with `or` — a match anywhere below suffices.\n\n" +
            "**J. Why correct.** Every node of `root` is tried as a potential match point, and `sameTree` verifies the *entire* subtree, so partial fragments never count.\n\n" +
            "**K/L. Complexity.** For each of the `m` nodes in `root` we may compare against up to `n` nodes of `subRoot` → time `O(m * n)`; space `O(m + n)` for the two recursion stacks. (An `O(m + n)` solution exists via serialization + KMP, but the nested-recursion version is the expected answer.)\n\n" +
            "**M. Interview mindset.** 'Find a pattern tree inside a big tree' → traverse the big tree and run an equality check at each node; factor the equality check into its own function.",
          rcs:
`class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        if not subRoot:                    # An empty pattern is a subtree of anything.
            return True
        if not root:                       # Ran out of tree before matching.
            return False
        if self.sameTree(root, subRoot):   # Does the subtree HERE match exactly?
            return True
        # Otherwise try to match somewhere in the left or right subtree.
        return (self.isSubtree(root.left, subRoot)
                or self.isSubtree(root.right, subRoot))

    def sameTree(self, a: Optional[TreeNode], b: Optional[TreeNode]) -> bool:
        if not a and not b:                # Both empty -> matched here.
            return True
        if not a or not b or a.val != b.val:  # Missing node or value mismatch.
            return False
        return (self.sameTree(a.left, b.left)
                and self.sameTree(a.right, b.right))`,
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
            "**A. What is being asked?** The deepest node that is an ancestor of both `p` and `q`.\n\n" +
            "**D. Key observation.** In a BST the LCA is the unique **split point**: the first node from the root where `p` and `q` stop going the same direction. If both values are **less** than the current node, the LCA is somewhere to the **left**; if both are **greater**, it is to the **right**; the moment they straddle the node (one ≤ node ≤ other, i.e. they diverge), the current node is the LCA.\n\n" +
            "**E. Pattern.** BST navigation using value comparisons — no full traversal needed, just follow one root-to-target path.\n\n" +
            "**F. Why it works.** As long as `p` and `q` are both on the same side, their common ancestor must also be on that side, so we can safely descend and discard the other half. When they split (or one equals the current node), no deeper node can contain both, so this is the lowest such ancestor.\n\n" +
            "**I. Step by step.** Start at the root. While both `p.val` and `q.val` are less than `node.val`, move left; while both are greater, move right; otherwise return `node`. Because both nodes are guaranteed present, we always stop at a valid answer.\n\n" +
            "**J. Why correct.** Every step preserves the invariant 'the LCA is in the current subtree.' The stopping condition is exactly the definition of the split point, and a node counts as its own descendant, so the `p == node` case is handled naturally (values no longer both smaller or both larger).\n\n" +
            "**K/L. Complexity.** We descend at most the height of the tree → time `O(h)`; only a moving pointer is stored → space `O(1)`.\n\n" +
            "**M. Interview mindset.** See 'BST' + 'LCA' and immediately think 'walk down until the two targets split' — this is strictly better than the general-tree recursion.",
          rcs:
`class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while node:
            if p.val < node.val and q.val < node.val:   # Both smaller -> LCA is left.
                node = node.left
            elif p.val > node.val and q.val > node.val:  # Both larger -> LCA is right.
                node = node.right
            else:                                        # They split here (or one IS node).
                return node                              # This node is the LCA.
        return None                                      # Unreachable: both nodes exist.`,
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
            "**A. What is being asked?** Group node values by depth, each level left to right.\n\n" +
            "**D. Key observation.** Breadth-first search naturally visits a tree level by level. The trick to *separate* the levels is to record the queue's size at the start of each round — that count is exactly how many nodes are on the current level.\n\n" +
            "**E. Pattern / data structure.** A FIFO **queue** (`collections.deque`). We enqueue children as we dequeue parents, so the queue always holds one contiguous frontier.\n\n" +
            "**F. Why it works.** When we begin a round, everything in the queue belongs to the same level. By looping exactly `len(queue)` times, we drain that whole level (collecting its values) while enqueuing the *next* level's nodes behind them — cleanly partitioning the waves.\n\n" +
            "**I. Step by step.** Seed the queue with the root. While it is non-empty: take `size = len(queue)`, then pop `size` nodes, append each value to the current level's list and push its non-null children. After the inner loop, append the level list to the result.\n\n" +
            "**J. Why correct.** The size snapshot freezes the level boundary before any children of this level are added, so each output sublist contains exactly one level in left-to-right order.\n\n" +
            "**K/L. Complexity.** Every node is enqueued and dequeued once → time `O(n)`; the queue holds at most one level, up to `O(n)` in the worst case (a full bottom level) → space `O(n)`.\n\n" +
            "**M. Interview mindset.** 'Per level', 'shortest path in an unweighted graph', 'wave/ripple outward' → BFS with a queue and the level-size snapshot.",
          rcs:
`class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        from collections import deque
        if not root:                       # Empty tree -> no levels.
            return []
        result = []
        queue = deque([root])              # Frontier of nodes to process.
        while queue:
            size = len(queue)              # Number of nodes on THIS level.
            level = []
            for _ in range(size):          # Drain exactly this level.
                node = queue.popleft()
                level.append(node.val)
                if node.left:              # Queue next level's children...
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            result.append(level)           # One sublist per level.
        return result`,
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
            "**D. Alternative observation.** You do not strictly need BFS: a DFS that carries the current **depth** can drop each value into the sublist for its level. The order of levels is still correct because level `d`'s list is created the first time depth `d` is reached, and left-before-right recursion preserves left-to-right order within a level.\n\n" +
            "**E. Pattern.** Pre-order DFS with an extra `depth` argument; `result[depth]` is the bucket for that level.\n\n" +
            "**F. Why it works.** We recurse left before right, so within any level, nodes are appended in left-to-right order. The first time we descend to a new depth, we append a fresh empty list, guaranteeing `result` grows one level at a time in order.\n\n" +
            "**I. Step by step.** Call `dfs(root, 0)`. In `dfs(node, depth)`: return if `node` is `None`; if `depth == len(result)` this level is new, so append `[]`; append `node.val` to `result[depth]`; recurse into left then right at `depth + 1`.\n\n" +
            "**J. Why correct.** Every node lands in the bucket matching its depth, and buckets are filled left to right, matching the required output.\n\n" +
            "**K/L. Complexity.** One visit per node → time `O(n)`; recursion stack up to the height → space `O(h)` (plus the output).",
          rcs:
`class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        result = []
        def dfs(node: Optional[TreeNode], depth: int) -> None:
            if not node:
                return
            if depth == len(result):       # First node seen at this depth.
                result.append([])          # Start a new level bucket.
            result[depth].append(node.val) # Drop value into its level.
            dfs(node.left, depth + 1)      # Left before right keeps order.
            dfs(node.right, depth + 1)
        dfs(root, 0)
        return result`,
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
            "**A. What is being asked?** Is the tree a valid BST — strictly increasing left-to-right at every scale?\n\n" +
            "**B. Naive trap.** Checking only `left < node < right` for each node is **wrong**: it misses violations from deeper descendants (e.g. a node in the far-left of a right subtree that is smaller than a high ancestor). The constraint is global, not local.\n\n" +
            "**D. Key observation.** As we descend, each node is confined to an **open interval `(low, high)`** dictated by all its ancestors. Going left tightens the upper bound to the current value; going right tightens the lower bound.\n\n" +
            "**E. Pattern.** DFS that threads a valid `(low, high)` range down the tree.\n\n" +
            "**F. Why it works.** A node is valid iff `low < node.val < high`. When we recurse left, everything there must be less than `node.val`, so `high` becomes `node.val`. When we recurse right, everything must exceed `node.val`, so `low` becomes `node.val`. This carries every ancestor's constraint to every descendant.\n\n" +
            "**I. Step by step.** Start with bounds `(-inf, +inf)`. At each node: if it is `None`, return `True`; if `node.val` is not strictly inside `(low, high)`, return `False`; otherwise validate the left child with `(low, node.val)` and the right child with `(node.val, high)`.\n\n" +
            "**J. Why correct.** The interval passed to any node is the exact intersection of all constraints from the path above it, so a single out-of-range value anywhere is caught.\n\n" +
            "**K/L. Complexity.** One visit per node → time `O(n)`; recursion depth up to the height → space `O(h)`.\n\n" +
            "**M. Interview mindset.** The word 'valid BST' should trigger 'carry min/max bounds down' — never validate with only the immediate children.",
          rcs:
`class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def valid(node: Optional[TreeNode], low: float, high: float) -> bool:
            if not node:                   # Empty subtree is a valid BST.
                return True
            if not (low < node.val < high):  # Must fit STRICTLY inside the allowed range.
                return False
            # Left subtree must be < node.val; right subtree must be > node.val.
            return (valid(node.left, low, node.val)
                    and valid(node.right, node.val, high))
        return valid(root, float('-inf'), float('inf'))`,
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
            "**D. Alternative observation.** The **inorder traversal** (left, node, right) of a BST visits values in **strictly increasing** order. So a tree is a valid BST iff its inorder sequence never fails to increase.\n\n" +
            "**E. Pattern.** Iterative inorder using an explicit stack, tracking only the **previous** value visited.\n\n" +
            "**F. Why it works.** We push left spines onto the stack, then pop to visit nodes in sorted order. At each visit we compare against the previously visited value: if the current value is **not strictly greater**, the increasing property is broken and it is not a BST.\n\n" +
            "**I. Step by step.** Keep a stack and a `prev = -inf`. Walk left pushing nodes; pop a node, and if `node.val <= prev` return `False`; otherwise set `prev = node.val` and move to the right child. Repeat until both stack and pointer are exhausted.\n\n" +
            "**J. Why correct.** Inorder yields the values in the exact left-to-right order they should appear; a strictly increasing check on that stream is equivalent to the full BST property.\n\n" +
            "**K/L. Complexity.** Each node is pushed and popped once → time `O(n)`; the stack holds at most one root-to-leaf path → space `O(h)`.",
          rcs:
`class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        stack = []
        prev = float('-inf')               # Last value visited in inorder.
        node = root
        while stack or node:
            while node:                    # Dive to the leftmost node.
                stack.append(node)
                node = node.left
            node = stack.pop()             # Visit in increasing order.
            if node.val <= prev:           # Must be STRICTLY greater than the previous.
                return False
            prev = node.val
            node = node.right              # Then explore the right subtree.
        return True`,
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
            "**A. What is being asked?** The kth smallest value (1-indexed) in a BST.\n\n" +
            "**D. Key observation.** An **inorder traversal** of a BST visits values in **ascending** order. So the kth node visited in inorder is exactly the kth smallest — we do not need to sort or count anything extra.\n\n" +
            "**E. Pattern.** Inorder DFS with a running counter; stop as soon as the counter reaches `k`.\n\n" +
            "**F. Why it works.** Inorder = (left subtree, node, right subtree). Because everything in the left subtree is smaller, visiting left-then-node-then-right emits values smallest to largest. Decrementing `k` on each visit and capturing the value when `k` hits 0 pinpoints the target.\n\n" +
            "**I. Step by step.** Recurse left; on 'visiting' a node decrement `k` and, if it reached 0, record the value and stop descending further; otherwise recurse right. Guard with an early return once the answer is set so we do not keep walking.\n\n" +
            "**J. Why correct.** The counter counts nodes in ascending order; the value captured when the count equals `k` is the kth smallest by definition.\n\n" +
            "**K/L. Complexity.** Worst case visits `O(n)` nodes (and at least `k`); recursion depth is the height → space `O(h)`.",
          rcs:
`class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        self.k = k                         # Remaining nodes to skip.
        self.result = None                 # Answer, once found.
        def inorder(node: Optional[TreeNode]) -> None:
            if not node or self.result is not None:  # Stop if done or answer found.
                return
            inorder(node.left)             # Smaller values first.
            self.k -= 1                    # Visiting this node in sorted order.
            if self.k == 0:                # This is the kth smallest.
                self.result = node.val
                return
            inorder(node.right)            # Then the larger values.
        inorder(root)
        return self.result`,
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
            "**D. Same observation, better control.** Inorder still gives ascending order, but doing it **iteratively** with an explicit stack lets us **stop the instant** we pop the kth node — no wasted work on the rest of the tree, and no recursion-depth worries.\n\n" +
            "**E. Pattern.** Explicit-stack inorder: repeatedly push the entire left spine, then pop to visit.\n\n" +
            "**F. Why it works.** Pushing left children until `None` stacks the smallest unvisited nodes on top. Each pop yields the next value in sorted order; counting pops and returning on the kth gives the answer directly.\n\n" +
            "**I. Step by step.** With `node = root` and an empty stack: while `node` exists, push it and go left. Then pop a node, decrement `k`; if `k == 0` return its value; otherwise set `node = node.right` and repeat.\n\n" +
            "**J. Why correct.** The stack order guarantees pops happen in ascending value order, so the kth pop is the kth smallest.\n\n" +
            "**K/L. Complexity.** We descend one spine (`O(h)`) and pop `k` nodes → time `O(h + k)`, better than `O(n)` when `k` is small; the stack holds one path → space `O(h)`.",
          rcs:
`class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        stack = []
        node = root
        while stack or node:
            while node:                    # Push the whole left spine.
                stack.append(node)
                node = node.left
            node = stack.pop()             # Next-smallest unvisited node.
            k -= 1
            if k == 0:                     # Popped the kth smallest.
                return node.val
            node = node.right              # Move on to larger values.
        return -1                          # Unreachable: k <= n guaranteed.`,
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
            "**A. What is being asked?** Rebuild the unique tree that produced these two traversals.\n\n" +
            "**D. Key observation.** The **first** element of `preorder` is always the **root**. Finding that root inside `inorder` splits it into everything **left** of the root (the left subtree) and everything **right** (the right subtree). The sizes of those halves tell us how to split `preorder` too.\n\n" +
            "**E. Pattern.** Divide and conquer: pick the root, partition both arrays, recurse on each side.\n\n" +
            "**F. Why it works.** In inorder, all left-subtree nodes come before the root and all right-subtree nodes after it. In preorder, the root is followed by its entire left subtree, then its entire right subtree. Matching the left-subtree size from inorder lets us carve preorder into the correct left/right chunks.\n\n" +
            "**I. Step by step.** Take `root_val = preorder[0]`, build the node, find `mid = inorder.index(root_val)`. The left subtree uses `preorder[1:mid+1]` with `inorder[:mid]`; the right uses `preorder[mid+1:]` with `inorder[mid+1:]`. Recurse.\n\n" +
            "**J. Why correct.** Uniqueness guarantees `mid` is well-defined, and the slice sizes exactly correspond, so each recursive call receives a valid (preorder, inorder) pair for a genuine subtree.\n\n" +
            "**K/L. Complexity.** `inorder.index` is `O(n)` and slicing copies `O(n)` per call across `O(n)` calls → time `O(n^2)`, and the slices cost `O(n^2)` space too. Clean, but improvable.",
          rcs:
`class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder:                   # No values -> empty subtree.
            return None
        root_val = preorder[0]             # Preorder's first element is the root.
        root = TreeNode(root_val)
        mid = inorder.index(root_val)      # Split point inside inorder.
        # Left part sizes 'mid'; carve both arrays accordingly.
        root.left = self.buildTree(preorder[1:mid + 1], inorder[:mid])
        root.right = self.buildTree(preorder[mid + 1:], inorder[mid + 1:])
        return root`,
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
            "**D. Two optimizations.** The slicing version wastes time on (1) `inorder.index(...)` linear searches and (2) copying subarrays. Fix both: pre-build a hash map `value → index in inorder` for `O(1)` root location, and consume `preorder` left-to-right with a single moving **pointer** instead of slicing.\n\n" +
            "**E. Pattern.** Same divide and conquer, but pass index **ranges** into `inorder` rather than new arrays, and advance one global preorder cursor.\n\n" +
            "**F. Why it works.** Preorder is root, then the whole left subtree, then the whole right subtree — exactly the order recursion needs if we always take 'the next preorder value' as the current root. Recursing left before right consumes preorder in precisely the right sequence. The inorder index map instantly tells us where the root splits the current `[left, right]` range.\n\n" +
            "**I. Step by step.** Build `idx = {val: i}` over `inorder`. Keep `self.pre = 0`. `build(l, r)` over inorder bounds: if `l > r` return `None`; take `val = preorder[self.pre]`, advance `self.pre`; make the node; `mid = idx[val]`; build left over `(l, mid-1)` **first**, then right over `(mid+1, r)`.\n\n" +
            "**J. Why correct.** Because left is built before right and preorder lists the left subtree entirely before the right, the shared cursor always points at the correct next root. The inorder range shrinks to empty exactly at leaves.\n\n" +
            "**K/L. Complexity.** Each node is created once with `O(1)` work → time `O(n)`; the map plus recursion stack → space `O(n)`.\n\n" +
            "**M. Interview mindset.** 'Reconstruct a tree from traversals' → first element/last element of preorder/postorder is the root; use inorder to split; optimize the root lookup with a hash map.",
          rcs:
`class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        idx = {val: i for i, val in enumerate(inorder)}  # value -> inorder position, O(1) lookup.
        self.pre = 0                       # Cursor over preorder (next root).
        def build(left: int, right: int) -> Optional[TreeNode]:
            if left > right:               # Empty inorder range -> no node.
                return None
            val = preorder[self.pre]       # Next preorder value is this subtree's root.
            self.pre += 1
            root = TreeNode(val)
            mid = idx[val]                 # Where the root sits inside inorder.
            root.left = build(left, mid - 1)   # Build left FIRST (preorder order).
            root.right = build(mid + 1, right) # Then the right subtree.
            return root
        return build(0, len(inorder) - 1)`,
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
            "**A. What is being asked?** The largest possible sum along any connected path in the tree — it may bend at a node using both children, or run straight down.\n\n" +
            "**D. Key observation — two different quantities.** At each node distinguish:\n" +
            "- The **path that peaks here** (the node plus its best left downward path plus its best right downward path). This can update the global answer but **cannot be passed to the parent**, because a path through the parent can only enter this node from one side.\n" +
            "- The **gain to hand upward** (the node plus the **better single** child branch). This is what the parent may attach to.\n\n" +
            "**E. Pattern.** Post-order DFS (tree DP): compute children first, combine, and bubble up a single number while separately tracking a global maximum.\n\n" +
            "**F. Why the `max(..., 0)` matters.** A subtree that returns a negative gain should be **dropped** (contribute 0) rather than dragging a path down. Clamping each child's gain at 0 encodes 'only extend into a child if it helps.'\n\n" +
            "**G/H. State.** `gain(node)` returns the best sum of a path that **starts at `node` and goes strictly downward**. A global `best` records the maximum over all 'peak-here' paths seen.\n\n" +
            "**I. Step by step.** For each node: `left = max(gain(left), 0)`, `right = max(gain(right), 0)`. Update `best = max(best, node.val + left + right)` (the bent path through this node). Return `node.val + max(left, right)` as the upward gain.\n\n" +
            "**J. Why correct.** Every path has a unique highest node (its 'peak'); at that node the path is exactly `node.val + left_gain + right_gain`, which we test against `best`. Since we do this at every node, the true maximum path is considered. Returning only one branch upward respects that a path cannot fork at the parent.\n\n" +
            "**K/L. Complexity.** One visit per node → time `O(n)`; recursion depth is the height → space `O(h)`.\n\n" +
            "**M. Interview mindset.** When 'the answer at a node' (bend allowed) differs from 'what you can pass to the parent' (one branch only), split them into a returned value plus a global variable — the signature tree-DP move.",
          rcs:
`class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        self.best = float('-inf')          # Global max over all 'peak-here' paths.
        def gain(node: Optional[TreeNode]) -> int:
            if not node:                   # Empty branch contributes nothing.
                return 0
            left = max(gain(node.left), 0)   # Drop a branch if it would hurt.
            right = max(gain(node.right), 0)
            # Path that bends at this node uses BOTH sides.
            self.best = max(self.best, node.val + left + right)
            # But upward we can only continue through ONE side.
            return node.val + max(left, right)
        gain(root)
        return self.best`,
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
    }
  ]);
})();
