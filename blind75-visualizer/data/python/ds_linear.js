/*
 * data/python/ds_linear.js — LINEAR data structures for DSA:
 * Linked List, Stack, and Queue & Deque.
 * Registered into the Python-for-DSA workspace (window.PYDSA).
 */
window.PYDSA.register("Data Structures (DSA)", [
  {
    id: "linked-list",
    title: "Linked List",
    difficulty: "Intermediate",
    estMinutes: 13,
    dsaRelevance: 3,
    prerequisites: ["recursion"],
    tagline: "A chain of nodes joined by pointers \u2014 no Python built-in, but the substrate for a whole family of pointer problems.",

    whatIsIt: [
      "A <b>linked list</b> is a chain of <b>nodes</b>, where each node holds a value plus a reference (<code>next</code>) to the following node. The list is just a pointer to the first node (the <b>head</b>); the last node's <code>next</code> is <code>None</code>.",
      "Python has <b>no built-in linked list</b> \u2014 the <code>list</code> type is a dynamic <i>array</i>, not a linked list. You build one yourself from a tiny <code>Node</code> class, which is exactly what interviewers hand you: <code>class ListNode: def __init__(self, val): self.val = val; self.next = None</code>.",
      "A <b>doubly</b> linked list adds a <code>prev</code> pointer so you can walk both directions and delete a node in O(1) when you already hold it. A <b>singly</b> linked list only has <code>next</code>.",
      "Two techniques carry most problems: a <b>dummy head</b> (a throwaway node before the real head so insert/delete never special-case the first element) and <b>fast/slow pointers</b> (Floyd's tortoise-and-hare, for the middle, the cycle, or the k-th from the end)."
    ],

    showMe: {
      code:
        "class ListNode:\n" +
        "    def __init__(self, val=0, nxt=None):\n" +
        "        self.val = val\n" +
        "        self.next = nxt\n" +
        "\n" +
        "def build(vals):\n" +
        "    dummy = tail = ListNode()      # dummy head avoids a first-node special case\n" +
        "    for v in vals:\n" +
        "        tail.next = ListNode(v)\n" +
        "        tail = tail.next\n" +
        "    return dummy.next\n" +
        "\n" +
        "def to_list(head):\n" +
        "    out = []\n" +
        "    while head:\n" +
        "        out.append(head.val)\n" +
        "        head = head.next\n" +
        "    return out\n" +
        "\n" +
        "# reverse iteratively: flip each next pointer as you walk\n" +
        "def reverse(head):\n" +
        "    prev = None\n" +
        "    while head:\n" +
        "        head.next, prev, head = prev, head, head.next\n" +
        "    return prev\n" +
        "\n" +
        "# middle via fast/slow: fast moves 2x, so slow lands in the middle\n" +
        "def middle(head):\n" +
        "    slow = fast = head\n" +
        "    while fast and fast.next:\n" +
        "        slow = slow.next\n" +
        "        fast = fast.next.next\n" +
        "    return slow.val\n" +
        "\n" +
        "head = build([1, 2, 3, 4, 5])\n" +
        "print(to_list(head))          # [1, 2, 3, 4, 5]\n" +
        "print(middle(head))           # 3\n" +
        "print(to_list(reverse(head))) # [5, 4, 3, 2, 1]",
      caption: "A Node class, a dummy-head builder, an iterative reversal (three-way swap), and fast/slow pointers to find the middle."
    },

    whyDsa:
      "<p>The <b>dummy head</b> is the single most useful trick: put a throwaway node before the real head so inserting or deleting at the front is identical to everywhere else \u2014 no <code>if node is head</code> branch. You return <code>dummy.next</code> at the end.</p>" +
      "<pre class=\"why-pre\">dummy -> 1 -> 2 -> 3\n  \u2191 always have a node BEFORE the one you touch,\n    so delete/insert at the front needs no special case</pre>" +
      "<p><b>Iterative reversal</b> walks the list flipping each <code>next</code> to point backward, holding three pointers (prev, curr, next). This is the reversal pattern under \u201creverse a list\u201d, \u201creverse in k-groups\u201d, and \u201cpalindrome list\u201d.</p>" +
      "<pre class=\"why-pre\">prev=None  curr=head\nwhile curr:\n    nxt = curr.next\n    curr.next = prev   \u2192 flip the arrow\n    prev = curr        \u2192 advance both\n    curr = nxt</pre>" +
      "<p><b>Floyd's fast/slow</b> pointers detect a cycle: if a loop exists the fast pointer (2 steps) eventually laps the slow one (1 step) and they collide; if <code>fast</code> hits <code>None</code>, the list is straight. The same idea finds the middle and the k-th-from-end in one pass.</p>" +
      "<pre class=\"why-pre\">slow=fast=head\nwhile fast and fast.next:\n    slow = slow.next          \u2192 1 step\n    fast = fast.next.next     \u2192 2 steps\n    if slow is fast: cycle!   \u2192 they meet inside a loop</pre>",

    recognize: [
      { q: "\u201cReverse a linked list / reverse in k-groups\u201d", think: "three-pointer flip: prev, curr, nxt \u2014 curr.next = prev each step" },
      { q: "\u201cDoes the list have a cycle? / where does it start?\u201d", think: "Floyd fast/slow \u2014 they collide inside the loop, then reset one to head" },
      { q: "\u201cFind the middle / k-th from the end\u201d", think: "fast/slow, or a k-ahead lead pointer, in a single pass" },
      { q: "\u201cInsert/delete without special-casing the head\u201d", think: "prepend a dummy node, operate, return dummy.next" },
      { q: "\u201cMerge two sorted lists / remove nth from end\u201d", think: "dummy head + walking pointer; splice by rewiring next" }
    ],

    matchTags: ["linked list", "reverse", "cycle", "fast slow", "two pointers", "node", "dummy"],
    relatedProblems: ["reverse-linked-list", "linked-list-cycle", "merge-two-sorted-lists", "remove-nth-node-from-end-of-list", "reorder-list", "add-two-numbers"],

    traps: [
      {
        bad: "head.next = prev\nprev = head\nhead = head.next   # BUG: head.next was already overwritten",
        good: "nxt = head.next\nhead.next = prev\nprev = head\nhead = nxt          # save next BEFORE rewiring",
        why: "Once you set head.next = prev you have lost the original next link. Always stash the next node in a temp (or use Python's simultaneous unpacking head.next, prev, head = prev, head, head.next) before you overwrite the pointer."
      },
      {
        bad: "while fast.next.next:   # AttributeError when fast.next is None",
        good: "while fast and fast.next:",
        why: "In fast/slow traversal, fast can reach the end. Guard BOTH fast and fast.next before dereferencing fast.next.next, or an even-length list crashes with 'NoneType has no attribute next'."
      },
      {
        bad: "lst = [0] * n\nlst.insert(0, x)   # O(n): a Python list is an ARRAY, not a linked list",
        good: "from collections import deque\ndq = deque(); dq.appendleft(x)   # O(1) at the front",
        why: "Python's list is a dynamic array, so inserting/deleting at the front shifts every element (O(n)). If you need genuine O(1) ends, reach for collections.deque; write your own Node-based list only when a problem is specifically about pointer manipulation."
      }
    ],

    cpython:
      "<p>There is no linked-list type in the standard library \u2014 <code>list</code> is a contiguous, over-allocated array of PyObject pointers, so indexing is O(1) but front insertion is O(n). <code>collections.deque</code> is the closest built-in: it is a doubly linked list of fixed-size arrays (blocks), giving O(1) at both ends. When a problem hands you a <code>ListNode</code> class, you are manipulating real heap objects joined by <code>next</code> references; Python's garbage collector reclaims a node once nothing points to it, which is why 'deleting' a node is just rewiring the previous node's <code>next</code> past it.</p>",

    complexity: [
      { op: "access / search by value", big_o: "O(n)", note: "No random access \u2014 you must walk from the head following next pointers until you find it." },
      { op: "insert / delete at head", big_o: "O(1)", note: "Rewire one or two pointers; no shifting, unlike a front insert on an array-backed list." },
      { op: "insert / delete after a known node", big_o: "O(1)", note: "Given the node, splice by reassigning next (and prev if doubly). Finding the node first is the O(n) part." },
      { op: "reverse (iterative or recursive)", big_o: "O(n) time", note: "One pass flipping every pointer. Iterative is O(1) space; recursive is O(n) stack \u2014 and can hit Python's ~1000-frame recursion limit on long lists." },
      { op: "cycle detection (Floyd)", big_o: "O(n) time, O(1) space", note: "Fast/slow meet within one full traversal if a cycle exists \u2014 constant extra memory, no visited set." },
      { op: "find middle / k-th from end", big_o: "O(n) time, O(1) space", note: "A single pass with two pointers a fixed gap apart \u2014 no length precount needed." }
    ],

    challenge: {
      prompt: "Detect whether a singly linked list has a cycle, using O(1) space (Floyd's tortoise and hare). Build a 4-node list whose tail links back to node 2 and return True.",
      starter: "class ListNode:\n    def __init__(self, val=0, nxt=None):\n        self.val, self.next = val, nxt\n# advance slow by 1 and fast by 2; they meet iff there is a cycle\n",
      solution:
        "class ListNode:\n    def __init__(self, val=0, nxt=None):\n        self.val, self.next = val, nxt\n\ndef has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:\n            return True\n    return False\n\nn1 = ListNode(1); n2 = ListNode(2); n3 = ListNode(3); n4 = ListNode(4)\nn1.next, n2.next, n3.next, n4.next = n2, n3, n4, n2   # tail loops back to n2\nprint(has_cycle(n1))   # True"
    }
  },

  {
    id: "stack",
    title: "Stack",
    difficulty: "Beginner",
    estMinutes: 10,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "Last-in, first-out \u2014 and in Python it is just a list with append() and pop(). The engine behind parentheses, DFS, and monotonic tricks.",

    whatIsIt: [
      "A <b>stack</b> is a <b>LIFO</b> (last-in, first-out) collection: you <b>push</b> onto the top and <b>pop</b> from the same top, like a stack of plates. The last thing in is the first thing out.",
      "In Python the idiomatic stack is a plain <code>list</code>: <code>append(x)</code> pushes onto the end, <code>pop()</code> removes and returns from the end, and both are <b>O(1) amortized</b>. Peek is <code>stack[-1]</code>.",
      "Stacks power three interview staples: <b>matching parentheses</b> (push openers, pop-and-check on closers), <b>DFS with an explicit stack</b> (an iterative alternative to recursion), and the <b>monotonic stack</b> (keep the stack sorted to answer \u201cnext greater / smaller element\u201d in one pass).",
      "A <b>monotonic stack</b> holds elements in increasing (or decreasing) order: before pushing a new value you pop everything that violates the order, and each popped element has just found its 'next greater' neighbor."
    ],

    showMe: {
      code:
        "# A Python list IS a stack: append = push, pop = pop, [-1] = peek\n" +
        "stack = []\n" +
        "stack.append(1)\n" +
        "stack.append(2)\n" +
        "stack.append(3)\n" +
        "print(stack[-1])   # peek top -> 3\n" +
        "print(stack.pop()) # 3\n" +
        "print(stack)       # [1, 2]\n" +
        "\n" +
        "# 1) matching parentheses: push openers, match on closers\n" +
        "def valid(s):\n" +
        "    pairs = {')': '(', ']': '[', '}': '{'}\n" +
        "    st = []\n" +
        "    for c in s:\n" +
        "        if c in '([{':\n" +
        "            st.append(c)\n" +
        "        elif not st or st.pop() != pairs[c]:\n" +
        "            return False\n" +
        "    return not st\n" +
        "\n" +
        "print(valid('([{}])'))   # True\n" +
        "print(valid('([)]'))     # False\n" +
        "\n" +
        "# 2) monotonic stack: next greater element to the right\n" +
        "def next_greater(nums):\n" +
        "    res = [-1] * len(nums)\n" +
        "    st = []                      # holds indices, values DECREASING\n" +
        "    for i, n in enumerate(nums):\n" +
        "        while st and nums[st[-1]] < n:\n" +
        "            res[st.pop()] = n    # n is the next greater for that index\n" +
        "        st.append(i)\n" +
        "    return res\n" +
        "\n" +
        "print(next_greater([2, 1, 2, 4, 3]))   # [4, 2, 4, -1, -1]",
      caption: "A list used directly as a stack, valid-parentheses via push/pop, and a monotonic (decreasing) stack solving next-greater-element in one pass."
    },

    whyDsa:
      "<p>The stack shines whenever you must remember 'the most recent unresolved thing'. <b>Matching parentheses</b> is the archetype: push each opener, and on a closer the correct match must be exactly what is on top \u2014 LIFO order is the nesting order.</p>" +
      "<pre class=\"why-pre\">( [ {  }  ]  )\npush ( [ {   \u2192 stack: ( [ {\non } pop { \u2713   on ] pop [ \u2713   on ) pop ( \u2713\nempty at end \u2192 balanced</pre>" +
      "<p>A <b>monotonic stack</b> answers 'next greater element' in a single O(n) pass. Keep indices with decreasing values; when a bigger number arrives, everything smaller on the stack has just found its answer, so pop them.</p>" +
      "<pre class=\"why-pre\">nums = 2 1 2 4 3\nwhile stack top &lt; current: pop \u2192 current is its 'next greater'\neach index pushed once and popped once \u2192 O(n)</pre>" +
      "<p>A stack is also how you do <b>DFS without recursion</b>: push the start, then repeatedly pop a node and push its neighbors. That sidesteps Python's ~1000-frame recursion limit on deep graphs while visiting nodes in the same last-in-first-out order.</p>" +
      "<pre class=\"why-pre\">stack = [start]\nwhile stack:\n    node = stack.pop()      \u2192 newest first (LIFO = depth-first)\n    for nb in neighbors[node]:\n        stack.append(nb)</pre>",

    recognize: [
      { q: "\u201cValid parentheses / balanced brackets\u201d", think: "push openers, on a closer pop and check it matches; empty at end = valid" },
      { q: "\u201cNext greater / next smaller / daily temperatures\u201d", think: "monotonic stack of indices; pop while the top violates the order" },
      { q: "\u201cEvaluate RPN / simplify a path / decode nested string\u201d", think: "push operands or context, pop to combine when you hit an operator/closer" },
      { q: "\u201cIterative DFS / undo history / backtracking frames\u201d", think: "explicit list-as-stack, push to descend, pop to return" },
      { q: "\u201cO(1) getMin alongside push/pop\u201d", think: "min-stack: a second stack tracking the running minimum" }
    ],

    matchTags: ["stack", "monotonic", "parentheses", "lifo", "next greater", "dfs"],
    relatedProblems: ["valid-parentheses", "min-stack", "daily-temperatures", "evaluate-reverse-polish-notation", "car-fleet", "largest-rectangle-in-histogram"],

    traps: [
      {
        bad: "x = stack.pop(0)   # O(n): pops from the FRONT, shifting everything",
        good: "x = stack.pop()    # O(1): default pops from the END (the top)",
        why: "list.pop() with no argument removes from the end in O(1) \u2014 that is the stack top. pop(0) removes from the front and shifts every remaining element down, making it O(n). For a stack, always pop from the end."
      },
      {
        bad: "top = stack.pop()   # IndexError if the stack is empty",
        good: "if stack:\n    top = stack.pop()",
        why: "pop() and stack[-1] both raise on an empty list (IndexError). In parentheses / monotonic problems the stack often empties mid-loop, so guard with 'if stack' (or 'while stack and ...') before touching the top."
      },
      {
        bad: "st = [[]] * 3\nst[0].append(1)   # every row is the SAME list -> [[1],[1],[1]]",
        good: "st = [[] for _ in range(3)]   # three independent lists",
        why: "[x] * n repeats the SAME object reference, so mutating one 'row' mutates all of them. When your stack holds mutable items (lists/dicts), build them with a comprehension so each is distinct."
      }
    ],

    cpython:
      "<p>CPython's <code>list</code> is a contiguous array of object pointers with spare capacity at the end, so <code>append</code> and <code>pop()</code> touch only the tail and run in <b>O(1) amortized</b> \u2014 append occasionally reallocates to a bigger block (growth is geometric, so the average stays O(1)), and pop just decrements the length. That tail-only cost is exactly why the end of a list is the natural stack top. Popping or inserting at index 0, by contrast, memmoves every following pointer, which is the O(n) trap. There is no separate stack type because a list already does the job optimally.</p>",

    complexity: [
      { op: "push \u2014 list.append(x)", big_o: "O(1) amortized", note: "Writes to the pre-allocated tail; only an occasional geometric resize costs more, averaging out to constant." },
      { op: "pop \u2014 list.pop()", big_o: "O(1)", note: "Removes from the end \u2014 the stack top \u2014 with no shifting. This is the correct, fast pop." },
      { op: "peek \u2014 stack[-1]", big_o: "O(1)", note: "Direct index of the last slot; raises IndexError on an empty stack, so guard first." },
      { op: "WRONG pop \u2014 list.pop(0)", big_o: "O(n)", note: "Front removal shifts every remaining element down one \u2014 the classic accidental slowdown; use a deque if you truly need the front." },
      { op: "monotonic-stack pass", big_o: "O(n) total", note: "Each element is pushed once and popped at most once, so the whole 'next greater' sweep is linear despite the inner while." },
      { op: "search / contains \u2014 x in stack", big_o: "O(n)", note: "A stack has no index by value; scanning defeats the point \u2014 use a set alongside it if you need membership." }
    ],

    challenge: {
      prompt: "Daily temperatures: for each day return how many days until a warmer temperature (0 if none). Use a monotonic stack of indices. Try temps = [73, 74, 75, 71, 69, 72, 76, 73].",
      starter: "temps = [73, 74, 75, 71, 69, 72, 76, 73]\n# stack holds indices whose warmer day is still unknown (temps DECREASING)\n",
      solution:
        "temps = [73, 74, 75, 71, 69, 72, 76, 73]\nres = [0] * len(temps)\nst = []                       # indices, temps decreasing\nfor i, t in enumerate(temps):\n    while st and temps[st[-1]] < t:\n        j = st.pop()\n        res[j] = i - j        # days until warmer\n    st.append(i)\nprint(res)   # [1, 1, 4, 2, 1, 1, 0, 0]"
    }
  },

  {
    id: "queue-deque",
    title: "Queue & Deque",
    difficulty: "Intermediate",
    estMinutes: 12,
    dsaRelevance: 3,
    prerequisites: [],
    tagline: "First-in, first-out with collections.deque \u2014 O(1) at both ends, the backbone of BFS and sliding-window maximum.",

    whatIsIt: [
      "A <b>queue</b> is <b>FIFO</b> (first-in, first-out): you enqueue at the back and dequeue from the front, like a checkout line. The first thing in is the first thing out \u2014 the opposite of a stack.",
      "In Python the tool is <b>collections.deque</b> (double-ended queue): <code>append</code> / <code>pop</code> at the right and <code>appendleft</code> / <code>popleft</code> at the left, <b>all O(1)</b>. It is both a queue and a stack, and it can grow or shrink from either end.",
      "Do <b>not</b> use a plain <code>list</code> as a queue: <code>list.pop(0)</code> removes from the front and shifts every remaining element, so it is <b>O(n)</b>. A deque's front operations are O(1) because it is a doubly linked list of blocks.",
      "Two power patterns: <b>BFS</b> (a queue drives level-by-level graph/tree traversal and shortest unweighted paths) and the <b>monotonic deque</b> (a deque kept sorted from both ends solves the sliding-window maximum in O(n)). <code>deque(maxlen=k)</code> gives a fixed-size rolling buffer that auto-evicts from the far end."
    ],

    showMe: {
      code:
        "from collections import deque\n" +
        "\n" +
        "# deque is O(1) at BOTH ends -> the right way to do a queue\n" +
        "q = deque([1, 2, 3])\n" +
        "q.append(4)          # enqueue at back  -> deque([1, 2, 3, 4])\n" +
        "print(q.popleft())   # dequeue front    -> 1\n" +
        "q.appendleft(0)      # also O(1) at front\n" +
        "print(list(q))       # [0, 2, 3, 4]\n" +
        "\n" +
        "# fixed-size rolling buffer: appending past maxlen drops the far end\n" +
        "window = deque(maxlen=3)\n" +
        "for x in [1, 2, 3, 4, 5]:\n" +
        "    window.append(x)\n" +
        "print(list(window))  # [3, 4, 5]\n" +
        "\n" +
        "# sliding-window maximum via a MONOTONIC deque of indices (values decreasing)\n" +
        "def max_sliding_window(nums, k):\n" +
        "    dq, out = deque(), []            # dq holds indices, nums[dq] decreasing\n" +
        "    for i, n in enumerate(nums):\n" +
        "        while dq and nums[dq[-1]] < n:\n" +
        "            dq.pop()                 # drop smaller values at the back\n" +
        "        dq.append(i)\n" +
        "        if dq[0] == i - k:\n" +
        "            dq.popleft()             # front slid out of the window\n" +
        "        if i >= k - 1:\n" +
        "            out.append(nums[dq[0]])  # front is the window max\n" +
        "    return out\n" +
        "\n" +
        "print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))\n" +
        "# [3, 3, 5, 5, 6, 7]",
      caption: "deque as an O(1)-both-ends queue, a maxlen rolling buffer, and a monotonic deque solving sliding-window maximum in one linear pass."
    },

    whyDsa:
      "<p><b>BFS</b> is the flagship queue algorithm: process nodes in the order they were discovered, so you fan out level by level. That order is exactly what makes BFS find the shortest path in an unweighted graph \u2014 the first time you reach a node is via a shortest route.</p>" +
      "<pre class=\"why-pre\">q = deque([start])\nwhile q:\n    node = q.popleft()      \u2192 FIFO = oldest first = level order\n    for nb in neighbors[node]:\n        q.append(nb)        \u2192 discovered nodes wait at the back</pre>" +
      "<p>A <b>monotonic deque</b> answers 'maximum of every window of size k' in O(n). Keep indices with decreasing values: the front is always the window's max, and you evict from the back anything a newer, larger value dominates.</p>" +
      "<pre class=\"why-pre\">new value bigger than the back? pop the back (it can never be the max again)\nfront index slid out of the window? popleft it\nfront of the deque is the current window maximum</pre>" +
      "<p>The reason this is a <b>deque</b> and not a list: you push and pop at the <b>back</b> while also popping from the <b>front</b>, and both must be O(1). A list's <code>pop(0)</code> would make the whole thing O(n\u00b2). Each index enters and leaves the deque once, so the total work is linear.</p>" +
      "<pre class=\"why-pre\">list.pop(0)   \u2192 shifts everything  \u2192 O(n)  \u2717\ndeque.popleft \u2192 unlink one block   \u2192 O(1)  \u2713</pre>",

    recognize: [
      { q: "\u201cShortest path / fewest steps in an unweighted grid or graph\u201d", think: "BFS with a deque; first arrival = shortest, track a visited set" },
      { q: "\u201cLevel-order traversal of a tree\u201d", think: "queue; pop the whole current level (for _ in range(len(q))) before descending" },
      { q: "\u201cMaximum/minimum of every window of size k\u201d", think: "monotonic deque of indices; front is the answer, evict stale/back-dominated" },
      { q: "\u201cKeep only the last N items / rolling buffer\u201d", think: "deque(maxlen=N) auto-drops the far end on overflow" },
      { q: "\u201cImplement a queue / need O(1) at both ends\u201d", think: "collections.deque, never list.pop(0)" }
    ],

    matchTags: ["queue", "deque", "bfs", "sliding window", "fifo", "monotonic", "level order"],
    relatedProblems: ["sliding-window-maximum", "implement-queue-using-stacks", "number-of-islands", "rotting-oranges", "binary-tree-level-order-traversal", "design-circular-queue"],

    traps: [
      {
        bad: "q = [1, 2, 3]\nx = q.pop(0)      # O(n): shifts every element on each dequeue",
        good: "from collections import deque\nq = deque([1, 2, 3])\nx = q.popleft()   # O(1)",
        why: "A list dequeue via pop(0) reindexes the whole list each time, turning an O(n) BFS into O(n^2). Use collections.deque and popleft() for any FIFO \u2014 this is the single most common queue mistake in Python interviews."
      },
      {
        bad: "q = deque()\nx = q[5]          # O(n): deque has no fast random access",
        good: "x = q[0]  or  x = q[-1]   # ends are O(1); convert to list for indexing",
        why: "deque is optimized for the two ends. Indexing in the middle is O(n) because it walks block by block, and there is no slicing. If you need random access, use a list; if you need fast ends, use a deque \u2014 not both from one structure."
      },
      {
        bad: "for node in q:\n    q.append(child)   # mutating the deque you iterate over",
        good: "while q:\n    node = q.popleft()\n    q.append(child)   # drain with popleft, not a for-loop",
        why: "Appending to a deque (or list) while iterating it with 'for' gives undefined/looping behavior. BFS must consume with popleft() in a while loop so newly discovered nodes are processed after the current frontier, not mid-iteration."
      }
    ],

    cpython:
      "<p><code>collections.deque</code> is implemented in C as a <b>doubly linked list of fixed-size blocks</b> (arrays of ~64 pointers), not one flat array. That block structure is why <code>append</code>, <code>appendleft</code>, <code>pop</code>, and <code>popleft</code> are all true O(1) \u2014 they only unlink or extend an end block, never shift the interior \u2014 while indexing the middle is O(n) because it must hop block to block. A <code>list</code> is the opposite: one contiguous array, so middle indexing is O(1) but front insert/delete is O(n). <code>deque(maxlen=k)</code> makes appends past the limit discard from the far end atomically, giving a free fixed-size sliding buffer. This is precisely the trade-off behind 'use deque for queues, list for stacks'.</p>",

    complexity: [
      { op: "append / appendleft (deque)", big_o: "O(1)", note: "Extends an end block; both ends are genuinely constant time \u2014 the whole point of a deque." },
      { op: "pop / popleft (deque)", big_o: "O(1)", note: "Unlinks from an end block with no shifting \u2014 the correct O(1) dequeue, unlike list.pop(0)." },
      { op: "list.pop(0) (WRONG queue)", big_o: "O(n)", note: "Front removal on a list shifts every element; using a list as a FIFO makes BFS quadratic." },
      { op: "deque middle index / search", big_o: "O(n)", note: "No fast random access \u2014 it walks block by block. Only the two ends are O(1); use a list if you need indexing." },
      { op: "BFS over V nodes, E edges", big_o: "O(V + E)", note: "Each node is enqueued/dequeued once and each edge examined once, driven by the O(1) deque operations." },
      { op: "sliding-window max (monotonic deque)", big_o: "O(n)", note: "Every index is appended and popped at most once across the whole scan, so the amortized cost per element is O(1)." }
    ],

    challenge: {
      prompt: "Number of islands (BFS): count connected groups of '1's in a grid (4-directional). Use a deque as the BFS queue and a visited set. Try the grid below (expected 3).",
      starter: "from collections import deque\ngrid = [\n    ['1','1','0','1'],\n    ['1','0','0','0'],\n    ['0','0','1','1'],\n]\n# BFS from each unvisited land cell, flooding its whole island\n",
      solution:
        "from collections import deque\ngrid = [\n    ['1','1','0','1'],\n    ['1','0','0','0'],\n    ['0','0','1','1'],\n]\nR, C = len(grid), len(grid[0])\nseen = set()\nislands = 0\nfor r in range(R):\n    for c in range(C):\n        if grid[r][c] == '1' and (r, c) not in seen:\n            islands += 1\n            q = deque([(r, c)])\n            seen.add((r, c))\n            while q:\n                i, j = q.popleft()\n                for di, dj in ((1,0),(-1,0),(0,1),(0,-1)):\n                    ni, nj = i + di, j + dj\n                    if 0 <= ni < R and 0 <= nj < C and grid[ni][nj] == '1' and (ni, nj) not in seen:\n                        seen.add((ni, nj))\n                        q.append((ni, nj))\nprint(islands)   # 3"
    }
  }
]);
