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
            "**What it asks.** Produce the mirror image of the tree: at every node, its left subtree and right subtree switch places, all the way down.\n\n" +
            "**Why the naive idea fails.** There is no shortcut that touches only the top — swapping just the root's two children leaves every deeper level un-mirrored. The flip has to reach every node, so the real question is how to express 'do this everywhere' cleanly rather than manually walking level by level.\n\n" +
            "**Key Idea.** Inverting a tree is *self-similar*: the mirror of a node is that same node with its two subtrees swapped **and each of those subtrees already inverted**. That recursive definition is the entire solution — you only have to trust that the recursive calls return correctly inverted subtrees and then wire them in reversed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the node is `None`, return `None` — the base case that stops the recursion.\n" +
            "2. Recursively invert the left child; call the result `left`.\n" +
            "3. Recursively invert the right child; call the result `right`.\n" +
            "4. Assign `right` to the node's left pointer and `left` to its right pointer — the swap onto the *opposite* sides.\n" +
            "5. Return the node, now the root of a fully mirrored subtree.\n\n" +
            "**Why it works.** By induction on height: the base case (`None`) is trivially its own mirror. If `invert(left)` and `invert(right)` correctly mirror the subtrees, then attaching the inverted right subtree as the new left child (and vice-versa) mirrors the current node too. Every node is visited exactly once and has its children swapped exactly once, which is precisely the definition of the mirror.\n\n" +
            "**Common Gotchas.**\n" +
            "- Capture *both* inverted subtrees in local variables before reassigning either pointer; overwriting `root.left` first would clobber the value you still need for `root.right`.\n" +
            "- An empty tree (`root == None`) must return `None`, not error.\n" +
            "- The swap must happen at every level, not just the root's immediate children.\n\n" +
            "**Complexity.** Time `O(n)` — each of the `n` nodes is touched once. Space `O(h)` for the recursion stack, where `h` is the height (`O(log n)` balanced, `O(n)` for a skewed tree).\n\n" +
            "**Interview mindset.** When an operation on a tree is defined the same way on every subtree, reach for recursion and let the base case (`None`) do the stopping — 'mirror / flip / reverse a tree' is the textbook cue.",
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
            "**What it asks.** Return the maximum depth — the number of nodes along the longest path from the root down to the farthest leaf.\n\n" +
            "**Why the naive idea fails.** You could try to enumerate every root-to-leaf path and take the longest, but that repeats work and is awkward to code. The cleaner realization is that depth is defined recursively, so you never need to materialize whole paths.\n\n" +
            "**Key Idea.** The depth of a tree is `1 + the depth of its deeper subtree`. That single recurrence solves everything: a node contributes 1 (itself) plus the best its two children can offer. A bottom-up DFS lets each subtree report its own height and the parent simply combines them with `max`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the node is `None`, its depth is 0 — the base case.\n" +
            "2. Recursively compute the depth of the left child.\n" +
            "3. Recursively compute the depth of the right child.\n" +
            "4. Take the larger of the two and add 1 for the current node; return that.\n\n" +
            "**Why it works.** The longest path through a node goes down either its left subtree or its right subtree, so the deeper side plus the node itself is the deepest reach from that node. By induction: if each child returns its own correct max depth, `1 + max(left, right)` is correct for the parent, and the base case of 0 anchors it.\n\n" +
            "**Common Gotchas.**\n" +
            "- Depth here is counted in *nodes*, not edges, so a single node has depth 1 and an empty tree has depth 0.\n" +
            "- Do not forget the `+ 1` for the current node — returning just `max(left, right)` undercounts by one.\n\n" +
            "**Complexity.** Time `O(n)` — every node contributes exactly one call. Space `O(h)` for the recursion stack, where `h` is the tree height.\n\n" +
            "**Interview mindset.** 'How deep / how tall / longest root-to-leaf' is the textbook cue for `1 + max(recurse left, recurse right)`; a bottom-up DFS that returns a number the parent combines.",
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
            "**What it asks.** Decide whether two binary trees are the same — identical in structure and in every corresponding node value.\n\n" +
            "**Why the naive idea fails.** You might be tempted to compare serializations or value sets, but same values with a different shape are *not* the same tree, and serialization needs careful null markers to be correct. Comparing the trees directly, position by position, is simpler and airtight.\n\n" +
            "**Key Idea.** Two trees are the same iff their **roots match** and their **left subtrees are the same** and their **right subtrees are the same**. That definition is directly recursive: walk both trees *in lockstep*, comparing the two current nodes at each step.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If both nodes are `None`, they are identical here — return `True`.\n" +
            "2. If exactly one is `None`, or the two values differ, return `False`.\n" +
            "3. Otherwise recurse on `(p.left, q.left)` **and** `(p.right, q.right)`, combining with `and`.\n\n" +
            "**Why it works.** The base cases capture the leaf and empty boundaries: both-`None` means a matched gap, one-`None` means a shape mismatch. The `and` requires every corresponding pair of nodes to agree on existence and value, so a single difference anywhere propagates up as `False`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Order the base cases: both `None` (True) must be checked before the one-`None`-or-value-mismatch (False) test, or you would dereference a `None`.\n" +
            "- Both structure *and* values must match — equal value multisets in different shapes is still `False`.\n" +
            "- Two empty trees are trivially the same and should return `True`.\n\n" +
            "**Complexity.** Time `O(n)` — each pair of nodes is compared once (n = size of the smaller tree, since a shape mismatch stops early). Space `O(h)` for the recursion stack.\n\n" +
            "**Interview mindset.** 'Compare two trees for equality' signals parallel/lockstep recursion with the None/None, None/one, and value-mismatch cases handled first — and this exact helper gets reused inside subtree, mirror, and symmetric-tree problems.",
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
            "**What it asks.** Determine whether `subRoot` appears somewhere inside `root` as a *complete* subtree — a node together with all of its descendants, matching in structure and values.\n\n" +
            "**Why the naive idea fails.** Searching for just the value of `subRoot`'s root inside `root` is not enough: matching one value (or even a fragment) does not guarantee the whole subtree beneath it matches. A subtree must include *all* descendants, so any check that stops short of the full subtree can produce false positives.\n\n" +
            "**Key Idea.** `subRoot` is a subtree of `root` iff **some** node of `root` roots a tree identical to `subRoot`. So the problem decomposes into two pieces: (1) visit every node of `root`, and (2) at each node run a full 'same tree' equality check against `subRoot`. This factors cleanly into an outer traversal plus the Same-Tree comparison (LC 100) as a reusable helper — two recursions working together.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `subRoot` is `None`, it is a subtree of anything — return `True`.\n" +
            "2. If `root` is `None` (but `subRoot` is not), we ran out of tree — return `False`.\n" +
            "3. If `sameTree(root, subRoot)` is `True`, the subtree rooted here matches — return `True`.\n" +
            "4. Otherwise recurse into the left child *or* the right child; a match anywhere below suffices.\n\n" +
            "**Why it works.** Every node of `root` is tried as a potential match point via the `or`, and `sameTree` verifies the *entire* subtree at that point, so partial fragments never count. If any starting node produces an exact match we return `True`; if all nodes are exhausted without one, the subtree genuinely does not exist.\n\n" +
            "**Common Gotchas.**\n" +
            "- An empty `subRoot` is a subtree of everything; an empty `root` with a non-empty `subRoot` never is — handle these base cases before comparing.\n" +
            "- The inner check must be full tree equality, not a value search — matching descendants is required.\n" +
            "- Combine the two recursive calls with `or` (a match on either side is enough), not `and`.\n\n" +
            "**Complexity.** Time `O(m * n)` — for each of the `m` nodes in `root` we may compare against up to `n` nodes of `subRoot`. Space `O(m + n)` for the two recursion stacks. (An `O(m + n)` solution exists via serialization + substring/KMP, but the nested-recursion version is the expected answer.)\n\n" +
            "**Interview mindset.** 'Find a pattern tree inside a bigger tree' → traverse the big tree and run an equality check at each node, factoring that equality check into its own function you can reuse.",
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
            "**What it asks.** Find the lowest common ancestor of two nodes `p` and `q` in a binary search tree — the deepest node that has both as descendants (a node counts as its own descendant).\n\n" +
            "**Why the naive idea fails.** The general-tree LCA does a full DFS to find both nodes and reconcile their paths, taking `O(n)` time and touching the whole tree. On a BST that ignores the ordering that makes the tree special — you can do far better than searching everything.\n\n" +
            "**Key Idea.** In a BST the LCA is the unique **split point**: the first node, walking down from the root, where `p` and `q` stop heading in the same direction. If both values are **less** than the current node, the LCA lies to the **left**; if both are **greater**, it lies to the **right**; the moment they straddle the node — one on each side, or one equal to it — that node is the LCA. This is pure BST navigation by value comparison: follow a single root-to-target path, no full traversal.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with a pointer `node` at the root.\n" +
            "2. If both `p.val` and `q.val` are less than `node.val`, move `node` to its left child.\n" +
            "3. Else if both are greater than `node.val`, move `node` to its right child.\n" +
            "4. Otherwise the targets diverge here (or one equals `node`) — return `node`.\n" +
            "5. Repeat; because both nodes are guaranteed present, the walk always stops at a valid answer.\n\n" +
            "**Why it works.** Each step preserves the invariant 'the LCA is in the current subtree': as long as `p` and `q` are both on the same side, their common ancestor must be on that side too, so discarding the other half is safe. When they split, no deeper node can contain both, so the split point is the *lowest* common ancestor. Because a node is its own descendant, the case where one target equals the current node is handled naturally — the values are no longer both smaller or both larger, so the walk stops.\n\n" +
            "**Common Gotchas.**\n" +
            "- This relies on the BST ordering; the same trick does not apply to a general binary tree.\n" +
            "- Do not overlook the self-descendant rule: if `p` is an ancestor of `q`, the answer is `p`, and the straddle condition captures that automatically.\n" +
            "- Compare values, not node identities, to decide direction.\n\n" +
            "**Complexity.** Time `O(h)` — we descend at most the height of the tree. Space `O(1)` iteratively, since only a moving pointer is stored.\n\n" +
            "**Interview mindset.** See 'BST' plus 'LCA' and immediately think 'walk down until the two targets split' — exploiting the ordering is strictly better than the general-tree recursion.",
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
            "**What it asks.** Return the level-order traversal: a list of lists where each inner list holds one level's node values, top to bottom, left to right within a level.\n\n" +
            "**Why the naive idea fails.** A plain BFS visits nodes level by level but produces one flat stream — it loses the level boundaries the problem wants. You need a way to know where one level ends and the next begins, otherwise you cannot slice the output into per-level sublists.\n\n" +
            "**Key Idea.** Breadth-first search naturally visits the tree in horizontal waves. The trick to *separate* the levels is to record the queue's size at the start of each round: at that instant the queue holds exactly the current level's nodes, so that count tells you precisely how many to drain before the next level begins.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the tree is empty, return `[]`.\n" +
            "2. Seed a FIFO queue (`collections.deque`) with the root.\n" +
            "3. While the queue is non-empty, snapshot `size = len(queue)` and start an empty `level` list.\n" +
            "4. Loop exactly `size` times: pop a node from the front, append its value to `level`, and push its non-null left then right children to the back.\n" +
            "5. After the inner loop, append `level` to the result. Return the result when the queue empties.\n\n" +
            "**Why it works.** When a round begins, everything in the queue belongs to the same level. The size snapshot freezes that boundary *before* any of this level's children are enqueued, so looping `size` times drains exactly one level while the next level's nodes accumulate behind them — cleanly partitioning the waves in left-to-right order.\n\n" +
            "**Common Gotchas.**\n" +
            "- Snapshot `len(queue)` *before* the inner loop; reading it inside the loop would include the children you just pushed and merge levels.\n" +
            "- Only enqueue non-null children, and push left before right to preserve order.\n" +
            "- An empty tree must return `[]`, not `[[]]`.\n\n" +
            "**Complexity.** Time `O(n)` — every node is enqueued and dequeued once. Space `O(n)` — the queue holds at most one level, which can be up to `O(n)` for a full bottom level.\n\n" +
            "**Interview mindset.** 'Per level', 'shortest path in an unweighted graph', 'wave/ripple outward' → reach for BFS with a queue plus the level-size snapshot.",
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
            "**What it asks.** Same goal — group node values by level, each level left to right — but built with recursion instead of an explicit queue.\n\n" +
            "**Why the naive idea fails.** A DFS visits nodes in depth-first order, which does *not* naturally emit them level by level. Without extra bookkeeping the output would be scrambled across levels, so we need each node to know which level it belongs to.\n\n" +
            "**Key Idea.** You do not strictly need BFS: a DFS that carries the current **depth** as an argument can drop each value into the sublist for its level, using `result[depth]` as that level's bucket. Level order still comes out correctly because level `d`'s bucket is created the first time depth `d` is reached, and recursing left before right fills each bucket left to right.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `result` and call `dfs(root, 0)`.\n" +
            "2. In `dfs(node, depth)`, return immediately if `node` is `None`.\n" +
            "3. If `depth == len(result)`, this is the first node seen at this depth — append a fresh empty list `[]` to start the level bucket.\n" +
            "4. Append `node.val` to `result[depth]`.\n" +
            "5. Recurse into the left child, then the right child, each at `depth + 1`.\n\n" +
            "**Why it works.** Every node lands in the bucket matching its depth, so values never cross levels. Because we recurse left before right, nodes within a level are appended in left-to-right order, and because a new bucket is created only the first time a depth is reached, `result` grows one level at a time in order — matching the required output.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `depth == len(result)` check is what lazily creates each level's bucket; forgetting it causes an index error on the first node of a new level.\n" +
            "- Recurse left before right, or the within-level order is wrong.\n" +
            "- An empty tree yields an empty `result`, which is correct.\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node. Space `O(h)` for the recursion stack (plus the `O(n)` output).",
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
            "**What it asks.** Decide whether a binary tree is a valid BST: every node's entire left subtree is strictly smaller, its entire right subtree strictly larger, recursively — i.e. strictly increasing left-to-right at every scale.\n\n" +
            "**Why the naive idea fails.** Checking only `left.val < node.val < right.val` for each node against its immediate children is **wrong**: it misses violations from deeper descendants. A node in the far left of a right subtree can be smaller than a high ancestor while still satisfying its own parent locally. The constraint is global, not local — every node must respect the limits imposed by *all* of its ancestors.\n\n" +
            "**Key Idea.** As we descend, each node is confined to an **open interval `(low, high)`** dictated by all its ancestors. Going left tightens the upper bound to the current node's value; going right tightens the lower bound. A node is valid iff `low < node.val < high`. Threading this range down the tree carries every ancestor's constraint to every descendant.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start at the root with bounds `(-inf, +inf)`.\n" +
            "2. At each node: if it is `None`, return `True` (an empty subtree is a valid BST).\n" +
            "3. If `node.val` is not strictly inside `(low, high)`, return `False`.\n" +
            "4. Validate the left child with the range `(low, node.val)` — everything left must be below the current value.\n" +
            "5. Validate the right child with `(node.val, high)` — everything right must be above it. Require both to hold.\n\n" +
            "**Why it works.** The interval passed to any node is the exact intersection of all constraints from the path above it: left turns lower the ceiling, right turns raise the floor. So a single out-of-range value anywhere in the tree falls outside its inherited `(low, high)` and is caught, and if every node fits its interval the ordering holds globally.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison must be *strict* (`low < node.val < high`); equal values are not allowed in a valid BST.\n" +
            "- The bound is global — never validate against only the immediate children.\n" +
            "- Use `float('-inf')` and `float('inf')` as the initial sentinels so any integer value fits at the root, including the extreme `-2^31` / `2^31 - 1`.\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node. Space `O(h)` for the recursion depth.\n\n" +
            "**Interview mindset.** The phrase 'valid BST' should trigger 'carry min/max bounds down' — the classic wrong answer is a parent-only check.",
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
            "**What it asks.** The same question — is this a valid BST — approached without threading bounds through the recursion.\n\n" +
            "**Why the naive idea fails.** As with the bounds method, a local parent-only comparison is wrong. This approach instead leans on a global property of BSTs so you never have to reason about ancestor limits explicitly.\n\n" +
            "**Key Idea.** The **inorder traversal** (left, node, right) of a BST visits values in **strictly increasing** order. So a tree is a valid BST iff its inorder sequence never fails to increase. Doing inorder iteratively with an explicit stack, and remembering only the **previous** value visited, is enough to check this in one pass.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep an explicit `stack`, a pointer `node = root`, and `prev = -inf` (the last value visited in inorder).\n" +
            "2. While `node` exists or the stack is non-empty, dive left: push `node` and move to its left child until `None`.\n" +
            "3. Pop a node — this is the next value in sorted order.\n" +
            "4. If `node.val <= prev`, the strictly-increasing property is broken — return `False`.\n" +
            "5. Otherwise set `prev = node.val` and move to `node.right`; repeat. If the walk completes, return `True`.\n\n" +
            "**Why it works.** Pushing left spines then popping visits nodes in exactly the left-node-right order, which for a BST is the order the values should appear sorted. A strictly-increasing check across that stream is therefore equivalent to the full global BST property — any inversion between consecutive visited values pinpoints a violation.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `<=` against `prev` so equal values are rejected — the ordering must be strict.\n" +
            "- Initialize `prev` to `float('-inf')` so the very first (smallest) node always passes.\n" +
            "- The outer loop condition must be `stack or node`, or you stop before finishing the right subtrees.\n\n" +
            "**Complexity.** Time `O(n)` — each node is pushed and popped once. Space `O(h)` — the stack holds at most one root-to-leaf path.",
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
            "**What it asks.** Return the value of the kth smallest element (1-indexed) among all node values of a binary search tree.\n\n" +
            "**Why the naive idea fails.** You could collect every value, sort them, and index the `k`-th — but that is `O(n log n)` and throws away the structure the BST already gives you for free. A BST is *already* sorted if you read it in the right order, so sorting is wasted work.\n\n" +
            "**Key Idea.** An **inorder traversal** of a BST (left subtree, node, right subtree) visits values in **ascending** order. So the kth node visited in inorder is exactly the kth smallest — no sorting or extra counting needed, just a running counter that stops when it reaches `k`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a counter `k` (remaining nodes to reach) and a `result` slot, initially unset.\n" +
            "2. Run an inorder DFS: for each node, return immediately if the node is `None` or the answer has already been found.\n" +
            "3. Recurse into the left child first — the smaller values.\n" +
            "4. 'Visit' the node: decrement `k`; if `k` has reached 0, record `node.val` as the answer and stop descending.\n" +
            "5. Otherwise recurse into the right child — the larger values.\n\n" +
            "**Why it works.** Because everything in a node's left subtree is smaller, visiting left-then-node-then-right emits values smallest to largest. The counter therefore counts nodes in ascending order, and the value captured exactly when the count hits `k` is the kth smallest by definition. The early-return guard stops the walk the instant the answer is set so no further nodes are touched needlessly.\n\n" +
            "**Common Gotchas.**\n" +
            "- `k` is 1-indexed, so `k = 1` asks for the minimum — decrement *before* the zero-check, not after.\n" +
            "- Guard the recursion with an early return once `result` is set, or the DFS keeps walking the right subtree after the answer is found.\n" +
            "- Recurse left before right, or the visit order is no longer ascending.\n\n" +
            "**Complexity.** Time `O(n)` worst case — it may visit up to all `n` nodes (at least `k`). Space `O(h)` for the recursion stack, where `h` is the tree height.\n\n" +
            "**Interview mindset.** 'kth smallest / largest in a BST' is the cue that inorder gives sorted order for free — count down `k` and grab the value when it hits 0; reverse inorder handles kth largest.",
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
            "**What it asks.** The same goal — the kth smallest value (1-indexed) in a BST — but with tighter control over when to stop.\n\n" +
            "**Why the naive idea fails.** The recursive inorder is correct but keeps unwinding call frames even after the answer is found, and on a deeply skewed tree it can hit the recursion limit. When `k` is small, walking the whole subtree is also wasteful.\n\n" +
            "**Key Idea.** Inorder still yields ascending order, but doing it **iteratively** with an explicit stack lets you **stop the instant** the kth node is popped — no wasted work on the rest of the tree and no recursion-depth worries. The stack simulates the recursion: push the entire left spine, then pop to visit.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty `stack` and a pointer `node = root`.\n" +
            "2. While `node` exists or the stack is non-empty, dive left: push `node` and move to its left child until `None` — this stacks the smallest unvisited nodes on top.\n" +
            "3. Pop a node — this is the next value in ascending order — and decrement `k`.\n" +
            "4. If `k` has reached 0, return `node.val` immediately.\n" +
            "5. Otherwise move to `node.right` and repeat.\n\n" +
            "**Why it works.** Pushing left children until `None` guarantees the top of the stack is always the smallest unvisited node, so each pop yields the next value in sorted order. Counting pops and returning on the kth therefore returns the kth smallest, and the early return means only the first `k` values in sorted order are ever touched.\n\n" +
            "**Common Gotchas.**\n" +
            "- The outer loop condition must be `stack or node`, or the walk stops before finishing right subtrees.\n" +
            "- `k` is 1-indexed; decrement on each pop and return when it hits 0.\n" +
            "- Push the whole left spine before popping — popping too early skips smaller values.\n\n" +
            "**Complexity.** Time `O(h + k)` — descend one spine (`O(h)`) then pop `k` nodes, better than `O(n)` when `k` is small. Space `O(h)` — the stack holds at most one root-to-leaf path.\n\n" +
            "**Interview mindset.** When you want to stop a traversal early or avoid recursion depth, convert the inorder DFS into an explicit-stack loop; 'kth smallest and stop as soon as possible' is the signal.",
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
            "**What it asks.** Rebuild the unique binary tree that produced the given `preorder` and `inorder` traversals, and return its root.\n\n" +
            "**Why the naive idea fails.** There is no way to guess the shape from either traversal alone — many trees share a preorder, and many share an inorder. You need both together, and the obvious 'try every shape' search is exponential. The two traversals must be combined structurally instead.\n\n" +
            "**Key Idea.** The **first** element of `preorder` is always the **root**. Locating that root value inside `inorder` splits it cleanly: everything **left** of it is the left subtree, everything **right** is the right subtree. The size of the left half then tells you exactly how to split `preorder` into its left and right chunks too. That decomposition is directly recursive — divide and conquer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `preorder` is empty, return `None` — the base case for an empty subtree.\n" +
            "2. Take `root_val = preorder[0]` and build the root node.\n" +
            "3. Find `mid = inorder.index(root_val)` — the root's position inside `inorder`.\n" +
            "4. Build the left child from `preorder[1:mid+1]` paired with `inorder[:mid]`.\n" +
            "5. Build the right child from `preorder[mid+1:]` paired with `inorder[mid+1:]`. Recurse and attach both.\n\n" +
            "**Why it works.** In inorder, all left-subtree nodes appear before the root and all right-subtree nodes after it; in preorder, the root is followed by its entire left subtree, then its entire right subtree. Because values are unique, `mid` is well-defined, and the left-subtree size read from inorder carves preorder into exactly the matching left/right chunks. Each recursive call therefore receives a valid (preorder, inorder) pair describing a genuine subtree.\n\n" +
            "**Common Gotchas.**\n" +
            "- The slice sizes must line up: `preorder[1:mid+1]` has exactly `mid` elements to match `inorder[:mid]`.\n" +
            "- Uniqueness of values is what makes `inorder.index` unambiguous — the method breaks if values repeat.\n" +
            "- The empty-slice base case must return `None`, not error, at the leaves.\n\n" +
            "**Complexity.** Time `O(n^2)` — `inorder.index` is `O(n)` and each call copies `O(n)` slices, across `O(n)` calls. Space `O(n^2)` from the accumulated slice copies. Clean to reason about, but improvable.\n\n" +
            "**Interview mindset.** 'Reconstruct a tree from two traversals' → preorder's first (or postorder's last) element is the root, and inorder splits left from right; start with this slicing version, then optimize.",
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
            "**What it asks.** The same reconstruction, done in linear time by removing the two costs that made the slicing version quadratic.\n\n" +
            "**Why the naive idea fails.** The slicing approach wastes time twice: each `inorder.index(...)` is an `O(n)` linear search, and every recursive call copies fresh subarrays. Both compound to `O(n^2)`. To reach `O(n)` you must locate the root in `O(1)` and stop copying.\n\n" +
            "**Key Idea.** Two optimizations do it: pre-build a hash map `value → index in inorder` so the root's split point is found in `O(1)`, and consume `preorder` left-to-right with a single moving **pointer** instead of slicing. Recursion then passes index **ranges** into `inorder` rather than new arrays, while one global preorder cursor advances through the roots.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `idx = {val: i}` mapping each inorder value to its position, for `O(1)` lookups.\n" +
            "2. Keep a shared cursor `self.pre = 0` pointing at the next preorder value (the next root).\n" +
            "3. Define `build(left, right)` over inorder bounds: if `left > right`, the range is empty — return `None`.\n" +
            "4. Take `val = preorder[self.pre]` as this subtree's root, advance `self.pre`, and create the node.\n" +
            "5. Look up `mid = idx[val]`, build the left child over `(left, mid-1)` **first**, then the right child over `(mid+1, right)`; attach both and return the node.\n\n" +
            "**Why it works.** Preorder lists the root, then the *entire* left subtree, then the *entire* right subtree — exactly the order recursion consumes it if you always take 'the next preorder value' as the current root and recurse left before right. So the shared cursor always points at the correct next root, and the inorder index map instantly tells you where that root splits the current `[left, right]` range. The range shrinks to empty precisely at the leaves.\n\n" +
            "**Common Gotchas.**\n" +
            "- Build the left subtree **before** the right, or the shared preorder cursor falls out of sync and the tree is wrong.\n" +
            "- The base case is `left > right` (empty inorder range), not a length check on a slice.\n" +
            "- The cursor must be shared across all calls (an attribute or nonlocal), not a fresh local per call.\n\n" +
            "**Complexity.** Time `O(n)` — each node is created once with `O(1)` work. Space `O(n)` for the index map plus the recursion stack.\n\n" +
            "**Interview mindset.** When a divide-and-conquer repeatedly searches for a value or copies subarrays, replace the search with a hash map and the copies with index ranges plus a shared cursor — the standard way to turn `O(n^2)` reconstruction into `O(n)`.",
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
            "**What it asks.** Return the largest possible sum along any non-empty connected path in the tree. A path may bend at a node (using both of its children) or run straight down, and it need not pass through the root.\n\n" +
            "**Why the naive idea fails.** Enumerating every possible path and summing each is exponential — there are far too many paths. And because values can be negative, you cannot greedily keep extending a path; sometimes a single node beats any longer path. You need to compute the answer bottom-up in one pass while being careful about what a subtree can contribute upward.\n\n" +
            "**Key Idea.** At each node, distinguish **two different quantities**. First, the **path that peaks here** — the node plus its best left downward path plus its best right downward path; this can update the global answer but **cannot be handed to the parent**, because a path continuing through the parent may only enter this node from one side. Second, the **gain to hand upward** — the node plus the *better single* child branch — which is what a parent may attach to. Splitting these two is the whole trick.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a global `best`, initialized to negative infinity, recording the maximum 'peak-here' path seen anywhere.\n" +
            "2. Define `gain(node)` returning the best sum of a path that starts at `node` and goes strictly downward. For a `None` node it returns 0.\n" +
            "3. Compute `left = max(gain(node.left), 0)` and `right = max(gain(node.right), 0)` — clamping at 0 drops any branch that would only subtract.\n" +
            "4. Update `best = max(best, node.val + left + right)` — the bent path that peaks at this node using both sides.\n" +
            "5. Return `node.val + max(left, right)` as the upward gain — the parent can only continue through one child.\n\n" +
            "**Why it works.** Every path has a unique highest node, its 'peak'. At that node the path sum is exactly `node.val + left_gain + right_gain`, which is tested against `best`. Since this test runs at every node, the true maximum path is always considered. Returning only the single better branch upward respects that a path cannot fork at the parent, and clamping negative gains at 0 encodes 'only extend into a child if it helps.'\n\n" +
            "**Common Gotchas.**\n" +
            "- Initialize `best` to `float('-inf')`, not 0 — all values can be negative, and a single node may be the answer.\n" +
            "- The `max(gain(child), 0)` clamp is essential; without it a negative subtree drags valid paths down.\n" +
            "- Do not return `node.val + left + right` upward — that would let a path illegally fork at the parent; return `node.val + max(left, right)`.\n\n" +
            "**Complexity.** Time `O(n)` — one visit per node. Space `O(h)` for the recursion stack, where `h` is the tree height.\n\n" +
            "**Interview mindset.** When 'the answer computed at a node' (bend allowed) differs from 'what you can pass to the parent' (one branch only), split them into a returned value plus a global variable — the signature tree-DP move.",
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
