/*
 * Blind 75 — Linked List
 * =========================================================================
 * Registers the Linked List problems on the global registry:
 *     window.BLIND75.register("Linked List", [ ...problems ]);
 *
 * Node model assumed throughout (LeetCode style):
 *     class ListNode:
 *         def __init__(self, val=0, next=None):
 *             self.val = val
 *             self.next = next
 *
 * Signatures use Optional[ListNode]. See arrays_hashing.js for the full schema.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Linked List", [
    {
      id: "linked-list-cycle",
      lc: 141,
      title: "Linked List Cycle",
      difficulty: "Easy",
      category: "Linked List",
      link: "https://leetcode.com/problems/linked-list-cycle/",
      meta: { pattern: "Fast & Slow Pointers", dataStructure: "Linked List", technique: "Floyd's tortoise & hare" },
      description:
        "Given the `head` of a singly linked list, determine whether the list contains a **cycle**.\n\n" +
        "A cycle exists if some node can be reached again by continuously following the `next` pointers. Internally the position is tracked by a `pos` index that marks which node the tail's `next` connects to, but `pos` is **not** passed to you \u2014 you only get `head`.\n\n" +
        "Return `true` if there is a cycle, otherwise `false`.",
      constraints: [
        "The number of nodes is in the range `[0, 10^4]`.",
        "`-10^5 <= Node.val <= 10^5`",
        "`pos` is `-1` (no cycle) or a valid index into the list."
      ],
      notes: [
        "You are not given `pos`; you must detect the cycle from the pointers alone.",
        "Try to solve it using `O(1)` extra memory (constant space)."
      ],
      examples: [
        {
          input: "head = [3, 2, 0, -4], pos = 1",
          output: "true",
          reasoning: "The tail node (-4) points back to the node at index 1 (value 2), forming a cycle.",
          visual:
            "```\n 3 -> 2 -> 0 -> -4\n      ^          |\n      |__________|   (tail links back to index 1)\n```"
        },
        {
          input: "head = [1, 2], pos = 0",
          output: "true",
          reasoning: "The tail (2) points back to the head (1)."
        },
        {
          input: "head = [1], pos = -1",
          output: "false",
          reasoning: "A single node whose next is null cannot cycle.",
          visual: "```\n 1 -> null\n```"
        },
        {
          input: "head = [], pos = -1",
          output: "false",
          reasoning: "An empty list has no nodes and therefore no cycle."
        }
      ],
      approaches: [
        {
          name: "Hash Set of visited nodes",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The most intuitive answer; reach for it first if constant space is not required.",
          logic:
            "**What it asks.** Starting from `head` and following the `next` pointers, determine whether you ever revisit a node \u2014 i.e. whether the chain loops back on itself instead of ending at `null`.\n\n" +
            "**Why the naive idea fails.** There is nothing wrong with the brute-force intuition here \u2014 it is just memory-hungry. A cycle means you eventually step onto a node you have already stepped on, so the obvious plan is to record every node you pass and flag the first repeat. That works but spends `O(n)` extra memory, which the constant-space version below avoids.\n\n" +
            "**Key Idea.** The only way to land on the same node twice in a singly linked list is if some node's `next` points backward into the part you have already walked \u2014 that is exactly a cycle. So remembering the nodes you have seen and watching for a repeat is a direct, correct test.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a single walking pointer `curr` starting at `head`, and an empty hash `set` of nodes.\n" +
            "2. At each node, first check whether `curr` is already in the set. If it is, you have looped back \u2014 return `true`.\n" +
            "3. Otherwise record `curr` in the set (by identity, the object itself, not its value) and move `curr` one node forward along `next`.\n" +
            "4. If `curr` ever becomes `null`, the chain reached a real end, so return `false`.\n\n" +
            "**Why it works.** A singly linked list is a simple chain: each node is reached by following one `next`. If the walk terminates at `null`, no node was ever repeated, so there is no cycle. If instead you meet a node already in the set, a `next` pointer led you back into visited territory \u2014 the definition of a cycle. Both outcomes are handled and exactly one must occur.\n\n" +
            "**Common Gotchas.**\n" +
            "- Compare nodes by identity, not by value \u2014 two different nodes can share the same value without any cycle.\n" +
            "- An empty list (`head` is `null`) must return `false`; the loop simply never runs.\n" +
            "- Do not confuse a repeated *value* with a repeated *node*; only the object identity signals a cycle.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 each node is visited once. Space `O(n)` \u2014 the set may hold every node in the worst case.\n\n" +
            "**Interview mindset.** 'Does this linked structure loop forever?' with no space constraint stated is the cue for the seen-set approach; if the interviewer then demands `O(1)` space, pivot to fast/slow pointers.",
          rcs:
            "class Solution:\n" +
            "    def hasCycle(self, head: Optional[ListNode]) -> bool:\n" +
            "        seen = set()                    # Node OBJECTS we've already stepped on.\n" +
            "        curr = head                     # Walk from the front.\n" +
            "        while curr:                     # Stop if we fall off the end (null).\n" +
            "            if curr in seen:            # Revisiting a node => there is a cycle.\n" +
            "                return True\n" +
            "            seen.add(curr)              # Remember this node by identity.\n" +
            "            curr = curr.next            # Advance one step.\n" +
            "        return False                    # Reached null: the chain terminates.",
          plain:
            "class Solution:\n" +
            "    def hasCycle(self, head: Optional[ListNode]) -> bool:\n" +
            "        seen = set()\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            if curr in seen:\n" +
            "                return True\n" +
            "            seen.add(curr)\n" +
            "            curr = curr.next\n" +
            "        return False"
        },
        {
          name: "Optimized — Floyd's Tortoise & Hare",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer: cycle detection in constant space.",
          logic:
            "**What it asks.** Detect whether the list has a cycle, but using only constant extra memory \u2014 no hash set of visited nodes.\n\n" +
            "**Why the naive idea fails.** The seen-set approach is correct but stores up to `n` nodes, costing `O(n)` space. To hit `O(1)` we need a way to sense the loop without recording where we have been.\n\n" +
            "**Key Idea.** Run two pointers at different speeds. Picture a `slow` tortoise that hops one node at a time and a `fast` hare that hops two. If the chain ends, the hare falls off into `null` \u2014 no cycle. But if there is a loop, both pointers eventually enter it and can never escape, and since the hare gains ground on the tortoise every step, it must eventually land on the exact same node \u2014 a collision that only a cycle can produce.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Place both `slow` and `fast` at `head`. Think of them as tortoise and hare on the same track.\n" +
            "2. Loop only while `fast` and `fast.next` both exist, so the hare can safely take its double hop.\n" +
            "3. Each iteration move `slow` forward one node and `fast` forward two nodes.\n" +
            "4. After moving, if `slow` and `fast` point at the very same node, they have collided inside a loop \u2014 return `true`.\n" +
            "5. If the loop condition fails, the hare reached the end of the chain \u2014 return `false`.\n\n" +
            "**Why it works.** With no cycle the hare hits `null` and the loop ends with `false`. With a cycle, once both pointers are inside the loop the distance from the hare to the tortoise (measured forward around the loop) shrinks by exactly one every step, because the hare closes the gap at net +1 per move. A gap that decreases by one each step must reach zero, and it can never jump past zero \u2014 so a meeting is guaranteed. Both cases are covered.\n\n" +
            "**Common Gotchas.**\n" +
            "- Guard the loop with `fast` and `fast.next` both non-null, or the double hop `fast.next.next` will crash at the end of an acyclic list.\n" +
            "- Compare the pointers by identity, not value.\n" +
            "- Starting both at `head` is fine; the first comparison happens after the first pair of moves, so they do not falsely collide at the start.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 the tortoise travels at most `n` steps before the meeting. Space `O(1)` \u2014 just the two pointers.\n\n" +
            "**Interview mindset.** 'Detect a cycle with no extra memory' is the canonical trigger for fast/slow (Floyd's tortoise and hare) pointers; the same two-speed trick also finds the list's middle and the cycle's entry point.",
          rcs:
            "class Solution:\n" +
            "    def hasCycle(self, head: Optional[ListNode]) -> bool:\n" +
            "        slow = head                     # Tortoise: one step at a time.\n" +
            "        fast = head                     # Hare: two steps at a time.\n" +
            "        while fast and fast.next:       # Need fast.next so the double hop is safe.\n" +
            "            slow = slow.next            # +1 node.\n" +
            "            fast = fast.next.next       # +2 nodes.\n" +
            "            if slow is fast:            # Same node => hare lapped tortoise => cycle.\n" +
            "                return True\n" +
            "        return False                    # Hare reached null: no cycle.",
          plain:
            "class Solution:\n" +
            "    def hasCycle(self, head: Optional[ListNode]) -> bool:\n" +
            "        slow = head\n" +
            "        fast = head\n" +
            "        while fast and fast.next:\n" +
            "            slow = slow.next\n" +
            "            fast = fast.next.next\n" +
            "            if slow is fast:\n" +
            "                return True\n" +
            "        return False"
        }
      ],
      patternRecognition: [
        "'Is there a loop / does it repeat forever?' in a linked structure \u2192 fast & slow pointers.",
        "Constant-space requirement rules out the hash set and points to Floyd's algorithm.",
        "Two pointers at different speeds is the go-to for cycle questions (also used to find a middle)."
      ],
      interviewRecall: [
        "Guard the loop with `while fast and fast.next` so `fast.next.next` never crashes.",
        "Compare nodes by identity (`is`), not by value \u2014 duplicate values do not imply a cycle.",
        "The meeting is guaranteed because the hare gains exactly one position per step and cannot jump over the tortoise."
      ]
    },

    {
      id: "merge-two-sorted-lists",
      lc: 21,
      title: "Merge Two Sorted Lists",
      difficulty: "Easy",
      category: "Linked List",
      link: "https://leetcode.com/problems/merge-two-sorted-lists/",
      meta: { pattern: "Two Pointers + Dummy Head", dataStructure: "Linked List", technique: "Splice sorted nodes" },
      description:
        "You are given the heads of two sorted singly linked lists, `list1` and `list2`. Merge them into **one sorted list** by splicing together the existing nodes (do not create new node values), and return the head of the merged list.",
      constraints: [
        "The number of nodes in each list is in the range `[0, 50]`.",
        "`-100 <= Node.val <= 100`",
        "Both `list1` and `list2` are sorted in **non-decreasing** order."
      ],
      notes: [
        "Either or both lists may be empty.",
        "Reuse the given nodes by relinking `next` \u2014 no need to allocate new nodes."
      ],
      examples: [
        {
          input: "list1 = [1, 2, 4], list2 = [1, 3, 4]",
          output: "[1, 1, 2, 3, 4, 4]",
          reasoning: "Repeatedly take the smaller head; ties can go either way.",
          visual:
            "```\nlist1: 1 -> 2 -> 4\nlist2: 1 -> 3 -> 4\nmerge: 1 -> 1 -> 2 -> 3 -> 4 -> 4\n```"
        },
        {
          input: "list1 = [], list2 = []",
          output: "[]",
          reasoning: "Both empty \u2192 the merged list is empty."
        },
        {
          input: "list1 = [], list2 = [0]",
          output: "[0]",
          reasoning: "One empty list means simply return the other."
        },
        {
          input: "list1 = [5], list2 = [1, 2, 3]",
          output: "[1, 2, 3, 5]",
          reasoning: "Take 1, 2, 3 from list2, then the remaining 5 from list1 is attached in one link."
        }
      ],
      approaches: [
        {
          name: "Iterative with a Dummy Head",
          time: "O(n + m)",
          space: "O(1)",
          whenToUse: "The clean, standard answer for merging two sorted linked lists.",
          logic:
            "**What it asks.** Given the heads of two already-sorted singly linked lists, weave them into one sorted list by relinking the existing nodes \u2014 not by allocating new ones.\n\n" +
            "**Why the naive idea fails.** You could dump every value into an array, sort it, and build a fresh list \u2014 but that ignores the fact that the inputs are already sorted, wastes `O(n + m)` space, and creates new nodes when the problem asks you to splice the given ones. Exploiting the existing order is both faster and cleaner.\n\n" +
            "**Key Idea.** Because both lists are sorted, the very next node of the merged result is always the smaller of the two current front nodes. Compare the two heads, splice off the smaller, advance only that list, and repeat \u2014 exactly the merge step of merge sort. The one nuisance is the first node of the output, which has no predecessor to attach to; a `dummy` (sentinel) node in front solves that so every append is uniform.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create a `dummy` node and let `tail` point at it. `tail` will always be the last node of the merged list built so far.\n" +
            "2. Keep two cursors `l1` and `l2` at the heads of the two input lists.\n" +
            "3. While both `l1` and `l2` are non-null, compare their values; attach the smaller one to `tail.next`, advance that list's cursor, then move `tail` onto the node just appended.\n" +
            "4. When one list runs out, the other is entirely sorted and every value in it is at least as large as everything already appended \u2014 so link the whole remainder onto `tail.next` in a single step.\n" +
            "5. Return `dummy.next`, the real head just past the sentinel.\n\n" +
            "**Why it works.** Loop invariant: `tail` always holds the largest node placed so far, and every node placed is the smallest remaining across both lists at the moment it was chosen. Appending the globally smallest remaining node each time keeps the output sorted, and the leftover tail is already sorted and no smaller than what precedes it, so appending it whole preserves order.\n\n" +
            "**Common Gotchas.**\n" +
            "- Either or both inputs may be empty \u2014 the `dummy` and the single-step leftover link both handle this without special cases.\n" +
            "- Use `<=` rather than `<` when comparing so ties are handled without extra branching (and the merge stays stable).\n" +
            "- Return `dummy.next`, never `dummy` itself; forgetting the sentinel offset is a classic slip.\n\n" +
            "**Complexity.** Time `O(n + m)` \u2014 each node from both lists is visited once. Space `O(1)` \u2014 only existing nodes are relinked; the `dummy` and pointers are constant overhead.\n\n" +
            "**Interview mindset.** 'Merge sorted sequences' plus 'linked list' should immediately suggest a `dummy` head with a running `tail` you keep appending the smaller front node to.",
          rcs:
            "class Solution:\n" +
            "    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        dummy = ListNode()              # Sentinel so the first append needs no special case.\n" +
            "        tail = dummy                    # Last node of the merged list built so far.\n" +
            "        l1, l2 = list1, list2           # Cursors over the two inputs.\n" +
            "        while l1 and l2:                # While both still have nodes to compare.\n" +
            "            if l1.val <= l2.val:        # Smaller (or tie) head goes next.\n" +
            "                tail.next = l1          # Splice l1's node onto the tail.\n" +
            "                l1 = l1.next            # Advance only that list.\n" +
            "            else:\n" +
            "                tail.next = l2          # Otherwise splice l2's node.\n" +
            "                l2 = l2.next\n" +
            "            tail = tail.next            # The appended node is the new tail.\n" +
            "        tail.next = l1 if l1 else l2    # One list is empty; attach the sorted leftover.\n" +
            "        return dummy.next               # Real head is after the sentinel.",
          plain:
            "class Solution:\n" +
            "    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        dummy = ListNode()\n" +
            "        tail = dummy\n" +
            "        l1, l2 = list1, list2\n" +
            "        while l1 and l2:\n" +
            "            if l1.val <= l2.val:\n" +
            "                tail.next = l1\n" +
            "                l1 = l1.next\n" +
            "            else:\n" +
            "                tail.next = l2\n" +
            "                l2 = l2.next\n" +
            "            tail = tail.next\n" +
            "        tail.next = l1 if l1 else l2\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "Combining two (or more) already-sorted sequences \u2192 the merge step of merge sort.",
        "Building a linked list where the first node is awkward \u2192 use a dummy head.",
        "You can attach the remainder of one list in a single link once the other is empty."
      ],
      interviewRecall: [
        "Dummy head + a `tail` pointer removes all first-node special-casing.",
        "Use `<=` (not `<`) to keep it stable and handle ties without extra logic.",
        "When one list runs out, `tail.next = l1 or l2` finishes the merge in O(1)."
      ]
    },

    {
      id: "merge-k-sorted-lists",
      lc: 23,
      title: "Merge K Sorted Lists",
      difficulty: "Hard",
      category: "Linked List",
      link: "https://leetcode.com/problems/merge-k-sorted-lists/",
      meta: { pattern: "K-Way Merge", dataStructure: "Min-Heap", technique: "Priority queue over heads" },
      description:
        "You are given an array `lists` of `k` sorted linked lists, each in non-decreasing order. Merge all of them into a single sorted linked list and return its head.",
      constraints: [
        "`0 <= k <= 10^4`",
        "`0 <= lists[i].length <= 500`",
        "`-10^4 <= lists[i][j] <= 10^4`",
        "Each `lists[i]` is sorted in non-decreasing order.",
        "The total number of nodes across all lists does not exceed `10^4`."
      ],
      notes: [
        "`lists` may be empty, or may contain empty (null) lists.",
        "Let `N` be the total number of nodes across all `k` lists."
      ],
      examples: [
        {
          input: "lists = [[1,4,5], [1,3,4], [2,6]]",
          output: "[1, 1, 2, 3, 4, 4, 5, 6]",
          reasoning: "The three sorted chains are interleaved into one sorted chain.",
          visual:
            "```\nA: 1 -> 4 -> 5\nB: 1 -> 3 -> 4\nC: 2 -> 6\n-> 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6\n```"
        },
        {
          input: "lists = []",
          output: "[]",
          reasoning: "No lists to merge \u2192 empty result."
        },
        {
          input: "lists = [[]]",
          output: "[]",
          reasoning: "A single empty list still merges to nothing."
        },
        {
          input: "lists = [[], [1], []]",
          output: "[1]",
          reasoning: "Empty lists are skipped; only the node 1 remains."
        }
      ],
      approaches: [
        {
          name: "Brute Force — Sequential Merge",
          time: "O(k * N)",
          space: "O(1)",
          whenToUse: "Simple to reason about, but slow when k is large.",
          logic:
            "**What it asks.** Combine `k` sorted linked lists into a single sorted list. This approach reaches for the simplest correct plan before worrying about speed.\n\n" +
            "**The idea, and why it's slow.** Reuse the two-list merge from LC 21 and fold the lists in one at a time: merge list 1 with list 2, merge that result with list 3, then with list 4, and so on until every list is absorbed. It is obviously correct because each individual merge is correct. The cost is that the accumulated list keeps growing, and every later merge re-walks all the nodes already merged. By the time you fold in the last list you re-touch nearly all `N` nodes again, and across `k` rounds that repeated walking sums to `O(k * N)` \u2014 for large `k` this is far worse than the heap version.\n\n" +
            "**Key Idea.** The only insight in play is that merging is associative: merging lists pairwise in sequence yields the same sorted result as any other order. That correctness is what makes the fold valid; the inefficiency comes purely from re-scanning the ever-larger accumulator.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep an `result` accumulator, initially an empty (null) list.\n" +
            "2. For each list in `lists`, merge it into `result` using the standard two-pointer, `dummy`-plus-`tail` merge of two sorted lists.\n" +
            "3. After the last fold, `result` is the fully merged list \u2014 return it.\n\n" +
            "**Why it works.** Each pairwise merge produces a correctly sorted list from two sorted inputs, and the accumulator is always sorted going into the next round, so by induction the final `result` is sorted and contains every node exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- `lists` may be empty or contain empty (null) lists; merging with a null accumulator or a null list must be a clean no-op, which the two-list merge already handles.\n" +
            "- Feed the *growing* accumulator back in each round; merging the raw inputs against each other out of order is easy to botch.\n\n" +
            "**Complexity.** Time `O(k * N)` \u2014 the accumulator is re-walked on every fold. Space `O(1)` extra \u2014 only existing nodes are relinked.\n\n" +
            "**Interview mindset.** State this as your baseline to show you can solve it, then note the repeated re-walking as the exact weakness that motivates a min-heap or divide-and-conquer.",
          rcs:
            "class Solution:\n" +
            "    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n" +
            "        def merge(a, b):                     # Standard merge of two sorted lists.\n" +
            "            dummy = ListNode()\n" +
            "            tail = dummy\n" +
            "            while a and b:\n" +
            "                if a.val <= b.val:\n" +
            "                    tail.next = a\n" +
            "                    a = a.next\n" +
            "                else:\n" +
            "                    tail.next = b\n" +
            "                    b = b.next\n" +
            "                tail = tail.next\n" +
            "            tail.next = a if a else b\n" +
            "            return dummy.next\n" +
            "        result = None                       # Accumulated merged list.\n" +
            "        for lst in lists:                   # Fold each list into the accumulator.\n" +
            "            result = merge(result, lst)\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n" +
            "        def merge(a, b):\n" +
            "            dummy = ListNode()\n" +
            "            tail = dummy\n" +
            "            while a and b:\n" +
            "                if a.val <= b.val:\n" +
            "                    tail.next = a\n" +
            "                    a = a.next\n" +
            "                else:\n" +
            "                    tail.next = b\n" +
            "                    b = b.next\n" +
            "                tail = tail.next\n" +
            "            tail.next = a if a else b\n" +
            "            return dummy.next\n" +
            "        result = None\n" +
            "        for lst in lists:\n" +
            "            result = merge(result, lst)\n" +
            "        return result"
        },
        {
          name: "Optimized — Min-Heap (Priority Queue)",
          time: "O(N log k)",
          space: "O(k)",
          whenToUse: "The expected answer: efficiently pick the global minimum across k lists at each step.",
          logic:
            "**What it asks.** Merge `k` sorted lists into one sorted list efficiently, avoiding the repeated re-walking that makes sequential folding `O(k * N)`.\n\n" +
            "**Why the naive idea fails.** Sequential merging re-scans the growing accumulator on every fold, so nodes near the front are touched again and again \u2014 `O(k * N)`. The fix is to stop re-walking finished nodes and instead look only at the current front of each list.\n\n" +
            "**Key Idea.** At any moment the next node of the answer is the smallest among just the *current heads* of the `k` lists \u2014 only `k` candidates, not `N`. If you can find that minimum quickly and, after taking it, immediately consider the `next` node of the list it came from, you perform a true k-way merge. A min-heap gives you exactly that: the smallest of up to `k` frontier nodes in `O(log k)` time. Because each list is sorted, popping a node's only fresh contribution is its own successor, so the heap always holds at most one 'frontier' node per still-active list and its minimum is the global minimum of everything remaining.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Seed a min-heap with the head of every non-empty list. Store each entry as a tuple `(node.val, counter, node)`, where `counter` is a strictly increasing integer.\n" +
            "2. Set up a `dummy` head with a `tail` pointer, just like the two-list merge.\n" +
            "3. Pop the smallest tuple, take its `node`, attach it to `tail.next`, and advance `tail` onto it.\n" +
            "4. If that popped node has a `next`, push `next` into the heap (with a fresh counter) \u2014 it is the list's new frontier.\n" +
            "5. Repeat until the heap is empty, then return `dummy.next`.\n\n" +
            "**Why it works.** Each pop yields the smallest node not yet placed, so the output comes out sorted. Every node is pushed exactly once \u2014 either as an initial head or when its predecessor in the same list is popped \u2014 so nothing is lost or duplicated, and the process ends precisely when all `N` nodes have been emitted.\n\n" +
            "**Common Gotchas.**\n" +
            "- Nodes are not orderable, so if two values tie the heap would try to compare `ListNode` objects and crash. The integer `counter` in the middle of the tuple breaks every tie before that can happen.\n" +
            "- Skip null lists when seeding, and handle an empty `lists` (the heap starts empty, so you return `dummy.next`, which is null).\n" +
            "- Push the successor's `(value, counter, node)`, not the node alone, to keep entries consistently comparable.\n\n" +
            "**Complexity.** Time `O(N log k)` \u2014 `N` pops and pushes, each `O(log k)` on a heap of size at most `k`. Space `O(k)` \u2014 the heap never exceeds one frontier node per list.\n\n" +
            "**Interview mindset.** 'Merge k sorted things' should light up 'min-heap of the k frontiers.' Divide-and-conquer \u2014 merging the lists pairwise, halving `k` each round \u2014 is the equally optimal alternative, also `O(N log k)` and with `O(1)` extra space.",
          rcs:
            "class Solution:\n" +
            "    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n" +
            "        import heapq\n" +
            "        heap = []                           # Min-heap of (value, counter, node).\n" +
            "        counter = 0                         # Unique tiebreaker: nodes aren't comparable.\n" +
            "        for node in lists:                  # Seed the heap with each list's head.\n" +
            "            if node:\n" +
            "                heapq.heappush(heap, (node.val, counter, node))\n" +
            "                counter += 1\n" +
            "        dummy = ListNode()                  # Sentinel head for the output.\n" +
            "        tail = dummy\n" +
            "        while heap:                         # Repeatedly extract the global minimum.\n" +
            "            val, _, node = heapq.heappop(heap)\n" +
            "            tail.next = node                # Append the smallest frontier node.\n" +
            "            tail = tail.next\n" +
            "            if node.next:                   # That list's next node becomes a new frontier.\n" +
            "                heapq.heappush(heap, (node.next.val, counter, node.next))\n" +
            "                counter += 1\n" +
            "        return dummy.next",
          plain:
            "class Solution:\n" +
            "    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n" +
            "        import heapq\n" +
            "        heap = []\n" +
            "        counter = 0\n" +
            "        for node in lists:\n" +
            "            if node:\n" +
            "                heapq.heappush(heap, (node.val, counter, node))\n" +
            "                counter += 1\n" +
            "        dummy = ListNode()\n" +
            "        tail = dummy\n" +
            "        while heap:\n" +
            "            val, _, node = heapq.heappop(heap)\n" +
            "            tail.next = node\n" +
            "            tail = tail.next\n" +
            "            if node.next:\n" +
            "                heapq.heappush(heap, (node.next.val, counter, node.next))\n" +
            "                counter += 1\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "'Merge k sorted lists/arrays/streams' \u2192 min-heap of the k current frontiers.",
        "You keep needing the minimum across several sorted sources \u2192 priority queue.",
        "Large k where sequential merging would re-walk nodes \u2192 heap or divide-and-conquer."
      ],
      interviewRecall: [
        "Push all heads, pop the min, then push the popped node's `next` \u2014 heap size stays <= k.",
        "Add a counter to the heap tuple so ties never compare un-orderable ListNode objects.",
        "O(N log k) with a heap; divide-and-conquer pairwise merges give the same bound with O(1) extra space."
      ]
    },

    {
      id: "remove-nth-node-from-end-of-list",
      lc: 19,
      title: "Remove Nth Node From End of List",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/",
      meta: { pattern: "Two Pointers (Gap of n)", dataStructure: "Linked List", technique: "One-pass with dummy" },
      description:
        "Given the `head` of a linked list, remove the `n`-th node counting from the **end** of the list, and return the head of the modified list.\n\n" +
        "Aim to do it in a single pass over the list.",
      constraints: [
        "The number of nodes is `sz`, with `1 <= sz <= 30`.",
        "`0 <= Node.val <= 100`",
        "`1 <= n <= sz`"
      ],
      notes: [
        "`n` is guaranteed valid (never larger than the list length).",
        "Removing the 1st-from-end means removing the tail; removing the `sz`-th-from-end means removing the head."
      ],
      examples: [
        {
          input: "head = [1, 2, 3, 4, 5], n = 2",
          output: "[1, 2, 3, 5]",
          reasoning: "The 2nd node from the end is 4; removing it links 3 -> 5.",
          visual:
            "```\n 1 -> 2 -> 3 -> 4 -> 5\n               ^remove (2nd from end)\n 1 -> 2 -> 3 -> 5\n```"
        },
        {
          input: "head = [1], n = 1",
          output: "[]",
          reasoning: "The only node is the 1st from the end; removing it empties the list."
        },
        {
          input: "head = [1, 2], n = 1",
          output: "[1]",
          reasoning: "The 1st from the end is the tail (2); remove it."
        },
        {
          input: "head = [1, 2], n = 2",
          output: "[2]",
          reasoning: "The 2nd from the end is the head (1); the dummy node makes deleting the head uniform.",
          visual:
            "```\ndummy -> 1 -> 2\n         ^remove head\ndummy -> 2   =>   return dummy.next = 2\n```"
        }
      ],
      approaches: [
        {
          name: "Optimized — Two Pointers, One Pass",
          time: "O(sz)",
          space: "O(1)",
          whenToUse: "The expected answer: find the node before the target in a single scan.",
          logic:
            "**What it asks.** Remove the `n`-th node counting from the end of the list and return the new head, ideally in a single pass without first measuring the list's length.\n\n" +
            "**Why the naive idea fails.** The straightforward plan is to walk the whole list once to count its length `sz`, then walk again `sz - n` steps to reach the node before the target and unlink it. That is correct but takes two passes; with a gap between two pointers you can do it in one.\n\n" +
            "**Key Idea.** To delete a node you need a handle on the node *before* it. Keep two pointers exactly `n` links apart: a `fast` front-runner and a `slow` trailer. Advance `fast` ahead by `n` first, then move both in lockstep. When `fast` reaches the last node, the fixed gap means `slow` is sitting exactly at the predecessor of the node to remove. A `dummy` node placed before `head` guarantees the target always has a predecessor \u2014 even when the target is the head itself \u2014 so deleting the first node needs no special case.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create a `dummy` whose `next` is `head`, and start both `fast` and `slow` at `dummy`.\n" +
            "2. Advance `fast` forward `n` times, opening a gap of exactly `n` nodes between `fast` and `slow`.\n" +
            "3. While `fast.next` is non-null, move `fast` and `slow` forward together \u2014 this preserves the gap and stops with `fast` resting on the last node.\n" +
            "4. Now `slow.next` is the target; unlink it with `slow.next = slow.next.next`, splicing the trailer's `next` past the removed node.\n" +
            "5. Return `dummy.next`, since the head itself may have been the node removed.\n\n" +
            "**Why it works.** After step 2 the gap between `slow` and `fast` is `n`. Moving them together keeps that gap constant, so when `fast` is the final node there are exactly `n` nodes from `slow.next` through the end \u2014 making `slow.next` the n-th node from the end. The `dummy` ensures this reasoning holds uniformly even when the target is the original head.\n\n" +
            "**Common Gotchas.**\n" +
            "- Start both pointers at the `dummy`, not at `head`; starting at `head` breaks the gap arithmetic when the head must be deleted.\n" +
            "- Stop the second loop on `fast.next` being null (fast on the last node), not on `fast` being null, or `slow` lands one node too far.\n" +
            "- Return `dummy.next`, never the original `head`, since the head may have been removed.\n\n" +
            "**Complexity.** Time `O(sz)` \u2014 a single pass over the list. Space `O(1)` \u2014 just two pointers and the dummy.\n\n" +
            "**Interview mindset.** 'The n-th from the end' or 'k-th from the end' is the signal for two pointers held a fixed gap apart; add a `dummy` whenever the head is a candidate for deletion.",
          rcs:
            "class Solution:\n" +
            "    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:\n" +
            "        dummy = ListNode(0, head)       # Sentinel so deleting the head is not special.\n" +
            "        fast = dummy                    # Front runner.\n" +
            "        slow = dummy                    # Trailer: ends just before the target.\n" +
            "        for _ in range(n):              # Open a gap of exactly n between them.\n" +
            "            fast = fast.next\n" +
            "        while fast.next:                # Advance both until fast is the LAST node.\n" +
            "            fast = fast.next\n" +
            "            slow = slow.next\n" +
            "        slow.next = slow.next.next      # slow.next is the n-th from end: unlink it.\n" +
            "        return dummy.next               # Head may have changed; return via dummy.",
          plain:
            "class Solution:\n" +
            "    def removeNthFromEnd(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:\n" +
            "        dummy = ListNode(0, head)\n" +
            "        fast = dummy\n" +
            "        slow = dummy\n" +
            "        for _ in range(n):\n" +
            "            fast = fast.next\n" +
            "        while fast.next:\n" +
            "            fast = fast.next\n" +
            "            slow = slow.next\n" +
            "        slow.next = slow.next.next\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "'n-th from the end' of a linked list \u2192 two pointers with a fixed gap of n.",
        "Single-pass deletion without pre-computing the length.",
        "The node to delete might be the head \u2192 add a dummy so every node has a predecessor."
      ],
      interviewRecall: [
        "Advance `fast` n steps first, then move both until `fast.next` is null \u2014 `slow` lands on the predecessor.",
        "Start both pointers at the dummy (not head) so the gap math handles head deletion.",
        "Unlink with `slow.next = slow.next.next` and return `dummy.next`."
      ]
    },

    {
      id: "reorder-list",
      lc: 143,
      title: "Reorder List",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/reorder-list/",
      meta: { pattern: "Middle + Reverse + Merge", dataStructure: "Linked List", technique: "Find mid, reverse, interleave" },
      description:
        "You are given the head of a singly linked list `L0 -> L1 -> ... -> Ln-1 -> Ln`.\n\n" +
        "Reorder it in place to `L0 -> Ln -> L1 -> Ln-1 -> L2 -> Ln-2 -> ...`, interleaving nodes from the front and the back.\n\n" +
        "You may **not** change node values \u2014 only rearrange the nodes themselves. Return nothing (the list is modified in place).",
      constraints: [
        "The number of nodes is in the range `[1, 5 * 10^4]`.",
        "`1 <= Node.val <= 1000`"
      ],
      notes: [
        "Modify the list in place; do not build a new list of values.",
        "Aim for `O(n)` time and `O(1)` extra space."
      ],
      examples: [
        {
          input: "head = [1, 2, 3, 4]",
          output: "[1, 4, 2, 3]",
          reasoning: "Front 1, back 4, front 2, back 3.",
          visual:
            "```\n 1 -> 2 -> 3 -> 4\nsplit:  1 -> 2   |   4 -> 3   (second half reversed)\nweave:  1 -> 4 -> 2 -> 3\n```"
        },
        {
          input: "head = [1, 2, 3, 4, 5]",
          output: "[1, 5, 2, 4, 3]",
          reasoning: "Odd length: the middle node 3 ends up last.",
          visual:
            "```\n 1 -> 2 -> 3 -> 4 -> 5\nhalves: 1 -> 2 -> 3   |   5 -> 4   (reversed)\nweave:  1 -> 5 -> 2 -> 4 -> 3\n```"
        },
        {
          input: "head = [1]",
          output: "[1]",
          reasoning: "A single node is already reordered."
        },
        {
          input: "head = [1, 2]",
          output: "[1, 2]",
          reasoning: "Two nodes: front then back leaves it unchanged."
        }
      ],
      approaches: [
        {
          name: "Optimized — Find Middle, Reverse, Merge",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected in-place answer combining three classic linked-list moves.",
          logic:
            "**What it asks.** Rearrange the list in place to `L0 -> Ln -> L1 -> Ln-1 -> L2 -> ...`, interleaving nodes from the front and the back, without changing any values and without allocating a new list.\n\n" +
            "**Why the naive idea fails.** You could copy every node reference into an array to get `O(1)` indexing, then relink by walking one index inward from each end. It is correct but spends `O(n)` extra space; the pointer-surgery method below achieves the same in `O(1)`.\n\n" +
            "**Key Idea.** The target ordering is precisely the front half of the list woven together with the *reversed* back half. That decomposes the problem into three staple linked-list operations: (1) find the middle, (2) reverse the second half, (3) merge the two halves by alternating one node from each. Each is a well-known move; the trick is recognizing the composition.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Find the middle with a slow/fast pair: `slow` hops one node, `fast` hops two. When `fast` can no longer advance, `slow` rests at the end of the first half. For even lengths this leaves the first half equal or one longer, and `slow.next` marks the clean split point.\n" +
            "2. Detach the second half: set a `second` pointer to `slow.next`, then cut with `slow.next = None` so the two halves are fully independent.\n" +
            "3. Reverse the second half with the classic `prev`/`curr` walk: at each node remember `curr.next`, flip `curr.next` to point back at `prev`, then slide `prev` and `curr` forward. When done, `prev` is the head of the reversed back half.\n" +
            "4. Interleave using two cursors, `first` over the front half and `second` over the reversed back half. Each round save both continuations, link `first -> second` and then `second -> (old first.next)`, and advance both cursors into their halves. Drive the loop by `second`, which is the shorter-or-equal half, so the front never overruns.\n\n" +
            "**Why it works.** After the split, the front half holds `L0..Lmid` in order and the reversed back half holds `Ln, Ln-1, ...`. Alternating one node from each therefore emits `L0, Ln, L1, Ln-1, ...` \u2014 exactly the target. Cutting at the middle guarantees the halves share no nodes, so the weave terminates cleanly for both odd and even lengths, and because the back half is never longer than the front, the front cursor always has a node to place before the loop ends.\n\n" +
            "**Common Gotchas.**\n" +
            "- Handle the base case of 0 or 1 node up front \u2014 such a list is already reordered and the pointer walks would misbehave.\n" +
            "- You must cut the list with `slow.next = None`; skipping the cut leaves a cycle and the weave never terminates.\n" +
            "- In the reversal, save `curr.next` before flipping the pointer, or you lose the rest of the half.\n" +
            "- Save both `next` pointers each interleave step before rewiring, or you drop nodes.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 each of the three phases is a single linear pass. Space `O(1)` \u2014 all work is in-place pointer manipulation.\n\n" +
            "**Interview mindset.** When a linked-list problem asks you to combine a list with its own reverse, or weave front and back together in place, recognize it as a *composition* of the three staples \u2014 find middle, reverse, merge \u2014 and knowing each cold makes this Medium routine.",
          rcs:
            "class Solution:\n" +
            "    def reorderList(self, head: Optional[ListNode]) -> None:\n" +
            "        if not head or not head.next:\n" +
            "            return                      # 0 or 1 node: already reordered.\n" +
            "        slow, fast = head, head         # Step 1: locate the middle.\n" +
            "        while fast.next and fast.next.next:\n" +
            "            slow = slow.next            # slow moves 1...\n" +
            "            fast = fast.next.next       # ...fast moves 2; slow ends at the middle.\n" +
            "        second = slow.next              # Head of the second half.\n" +
            "        slow.next = None                # Cut the list into two independent halves.\n" +
            "        prev = None                     # Step 2: reverse the second half.\n" +
            "        curr = second\n" +
            "        while curr:\n" +
            "            nxt = curr.next             # Save the next node before rewiring.\n" +
            "            curr.next = prev            # Flip the pointer backward.\n" +
            "            prev = curr                 # Advance prev...\n" +
            "            curr = nxt                  # ...and curr.\n" +
            "        second = prev                   # prev is now the reversed second half's head.\n" +
            "        first = head                    # Step 3: interleave the two halves.\n" +
            "        while second:                   # Second half is shorter or equal, so drive by it.\n" +
            "            tmp1 = first.next           # Remember where each half continues.\n" +
            "            tmp2 = second.next\n" +
            "            first.next = second         # first -> second ...\n" +
            "            second.next = tmp1          # ... -> old first.next\n" +
            "            first = tmp1                # Advance both cursors into their halves.\n" +
            "            second = tmp2",
          plain:
            "class Solution:\n" +
            "    def reorderList(self, head: Optional[ListNode]) -> None:\n" +
            "        if not head or not head.next:\n" +
            "            return\n" +
            "        slow, fast = head, head\n" +
            "        while fast.next and fast.next.next:\n" +
            "            slow = slow.next\n" +
            "            fast = fast.next.next\n" +
            "        second = slow.next\n" +
            "        slow.next = None\n" +
            "        prev = None\n" +
            "        curr = second\n" +
            "        while curr:\n" +
            "            nxt = curr.next\n" +
            "            curr.next = prev\n" +
            "            prev = curr\n" +
            "            curr = nxt\n" +
            "        second = prev\n" +
            "        first = head\n" +
            "        while second:\n" +
            "            tmp1 = first.next\n" +
            "            tmp2 = second.next\n" +
            "            first.next = second\n" +
            "            second.next = tmp1\n" +
            "            first = tmp1\n" +
            "            second = tmp2"
        }
      ],
      patternRecognition: [
        "Weaving front and back of a list together \u2192 middle + reverse second half + merge.",
        "'In place, O(1) space' on a linked list \u2192 pointer surgery, not an array of nodes.",
        "Any problem asking to compare/combine a list with its reverse hints at reversing a half."
      ],
      interviewRecall: [
        "Three steps: find middle (slow/fast), reverse the second half, then interleave.",
        "Cut the list with `slow.next = None` so the two halves are independent and the weave terminates.",
        "Drive the merge loop by the (shorter-or-equal) second half; save both `next` pointers before rewiring."
      ]
    },

    {
      id: "reverse-linked-list",
      lc: 206,
      title: "Reverse Linked List",
      difficulty: "Easy",
      category: "Linked List",
      link: "https://leetcode.com/problems/reverse-linked-list/",
      meta: { pattern: "Pointer Reversal", dataStructure: "Linked List", technique: "prev/curr in-place flip" },
      description:
        "Given the `head` of a singly linked list, reverse the list and return the head of the reversed list.\n\n" +
        "Each node's `next` pointer must be flipped so that the last node becomes the new head and the original head becomes the tail.",
      constraints: [
        "The number of nodes is in the range `[0, 5000]`.",
        "`-5000 <= Node.val <= 5000`"
      ],
      notes: [
        "The list may be empty (`head` is `null`).",
        "Both an iterative `O(1)`-space and a recursive `O(n)`-stack solution are commonly expected."
      ],
      examples: [
        {
          input: "head = [1, 2, 3, 4, 5]",
          output: "[5, 4, 3, 2, 1]",
          reasoning: "Every `next` pointer is flipped so the chain runs backward.",
          visual:
            "```\nbefore: 1 -> 2 -> 3 -> 4 -> 5 -> null\nafter:  5 -> 4 -> 3 -> 2 -> 1 -> null\n```"
        },
        {
          input: "head = [1, 2]",
          output: "[2, 1]",
          reasoning: "Two nodes swap direction: 2 becomes head, 1 becomes tail."
        },
        {
          input: "head = []",
          output: "[]",
          reasoning: "An empty list reverses to an empty list."
        },
        {
          input: "head = [7]",
          output: "[7]",
          reasoning: "A single node is its own reverse."
        }
      ],
      approaches: [
        {
          name: "Iterative — prev/curr Pointer Flip",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The standard, constant-space answer; reach for this first.",
          logic:
            "**What it asks.** You are handed the `head` of a singly linked list, where each node knows only its own value and a single forward pointer `next` to the node after it. Turn the chain `head -> ... -> tail -> null` into `tail -> ... -> head -> null` by redirecting every `next` pointer to face the opposite way, then return the new head (which is the old tail). Crucially, you are rewiring the *existing* nodes, not producing a copy.\n\n" +
            "**Why the naive idea fails.** The tempting shortcut is to walk the list once collecting all values into an array, then build a brand-new list by reading that array back to front. It works, but it allocates `O(n)` extra memory for the array and constructs `n` fresh nodes, when the real task is simply to turn the arrows already present. It also side-steps the actual skill the problem is testing — pointer manipulation on the nodes themselves. In-place flipping achieves the same result touching each node once and using only a handful of pointer variables.\n\n" +
            "**Key Idea.** Sweep the list a single time with a `curr` cursor, while dragging a second pointer `prev` one step behind it. Think of `prev` as the head of the part you have *already* reversed and `curr` as the head of the part still untouched. At each node you perform one local surgery: make `curr.next` point *backward* at `prev` instead of forward at its old successor. But there is a trap unique to linked lists — the moment you overwrite `curr.next`, the link to the rest of the untouched list is gone forever. So before rewiring you must stash `curr.next` in a temporary (`nxt`); that saved reference is your only remaining handle on the remainder. `prev` is seeded with `None` because the original head is destined to become the new tail, and a tail's `next` must be `null`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `prev = None` — nothing precedes the list yet, and this null will become the terminator sitting after the old head. Set `curr = head` to start the cursor at the front.\n" +
            "2. While `curr` is non-null, first save `nxt = curr.next`. This is the single most important line: it preserves the doorway into the rest of the list before that doorway is bricked over.\n" +
            "3. Flip the link with `curr.next = prev`, so the current node now points back at the reversed prefix instead of forward.\n" +
            "4. Slide both pointers one step down the original list: `prev = curr` (the reversed prefix now begins at the node we just flipped), then `curr = nxt` (advance into the saved remainder).\n" +
            "5. When `curr` finally becomes `null`, the remainder is empty, so `prev` is resting on the old last node — the new head. Return `prev`.\n\n" +
            "**Why it works.** The engine is a loop invariant: at the top of every iteration, `prev` heads a fully and correctly reversed prefix of the nodes already visited, and `curr` heads the still-original remainder. Each pass detaches exactly one node from the front of the remainder and prepends it to the reversed prefix, which re-establishes the invariant with the boundary moved one node forward. Because the total node count only shrinks on the untouched side, the loop must terminate; and when the remainder is finally empty, the invariant guarantees `prev` heads the entire reversed list.\n\n" +
            "**Common Gotchas.**\n" +
            "- Save `curr.next` into a temp *before* overwriting `curr.next`. Reverse the order and you sever the list, stranding every node past `curr`.\n" +
            "- Start `prev` at `None`, not at `head`. If `prev` began at `head`, the original head would keep a `next` pointing at itself-region and you would form a cycle instead of a null-terminated tail.\n" +
            "- Return `prev` (the new head), not `curr` — `curr` is `None` once the loop ends.\n" +
            "- The empty-list case falls out for free: if `head` is `None`, the loop body never runs and `prev` stays `None`, which is the correct answer.\n\n" +
            "**Complexity.** Time `O(n)` — a single pass that flips each of the `n` pointers exactly once. Space `O(1)` — only three pointer variables (`prev`, `curr`, `nxt`) regardless of list length; no auxiliary arrays or nodes.\n\n" +
            "**Interview mindset.** 'Reverse a linked list' is the canonical `prev`/`curr` walk — burn the save-flip-advance rhythm into muscle memory. It reappears as a subroutine inside reorder-list, reverse-nodes-in-k-group, and palindrome-linked-list, so the four lines inside this loop are worth being able to write without thinking.",
          rcs:
            "from typing import Optional  # Optional[ListNode] means the value is either a ListNode or None (an empty list).\n\n\n" +
            "# ListNode is the singly-linked-list node LeetCode provides: it has .val (the payload)\n" +
            "# and .next (a pointer to the next node, or None at the tail). We only rewire .next here.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls reverseList on it.\n\n" +
            "    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:  # Return the head of the reversed list.\n\n" +
            "        # ==================== PHASE 1: SET UP THE TWO WALKING POINTERS ====================\n\n" +
            "        prev = None  # Head of the reversed part so far; nothing precedes the list yet.\n" +
            "                     # Why None: the original head becomes the new tail, and a tail's .next must be None.\n" +
            "                     # State: prev will grow into the fully reversed prefix, one node per iteration.\n\n" +
            "        curr = head  # Cursor over the still-untouched remainder; starts at the original front.\n" +
            "                     # State: curr always points at the first node we have NOT reversed yet.\n" +
            "                     # Execution flow: Python continues to the while loop below.\n\n" +
            "        # ==================== PHASE 2: WALK THE LIST, FLIPPING ONE POINTER PER STEP ====================\n\n" +
            "        while curr:  # Keep going until curr falls off the end (curr becomes None).\n" +
            "                     # Loop invariant: everything from prev backward is already correctly reversed;\n" +
            "                     #                 everything from curr forward is still in original order.\n" +
            "                     # Execution flow: each pass moves the boundary between the two parts forward by one node.\n\n" +
            "            nxt = curr.next  # SAVE FIRST: stash the next node before we destroy the link to it.\n" +
            "                             # Why critical: the very next line overwrites curr.next, so without this\n" +
            "                             #               temporary we would lose our only handle on the rest of the list.\n" +
            "                             # State: nxt now points at the head of the remaining untouched list.\n\n" +
            "            curr.next = prev  # THE FLIP: point the current node backward at the reversed prefix.\n" +
            "                              # Before: curr -> nxt (forward).  After: prev <- curr (backward).\n" +
            "                              # State change: curr is now attached to the reversed side instead of the original side.\n\n" +
            "            prev = curr  # Extend the reversed prefix: its new head is the node we just flipped.\n" +
            "                         # State: prev has grown by one node; it heads a longer reversed chain.\n\n" +
            "            curr = nxt  # Advance the cursor into the remainder we saved earlier.\n" +
            "                        # State change: curr moves one node forward (or becomes None at the end).\n" +
            "                        # Execution flow: end of iteration; Python jumps back to the while header to re-test curr.\n\n" +
            "        # ==================== PHASE 3: HAND BACK THE NEW HEAD ====================\n\n" +
            "        return prev  # curr is None now, so prev sits on the old last node = the new head.\n" +
            "                     # Execution flow: return ends reverseList; the reversed list's head goes to the caller.\n" +
            "                     # Why safe: the loop invariant guarantees prev heads the entire, fully reversed list.",
          plain:
            "class Solution:\n" +
            "    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        prev = None\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            nxt = curr.next\n" +
            "            curr.next = prev\n" +
            "            prev = curr\n" +
            "            curr = nxt\n" +
            "        return prev"
        },
        {
          name: "Recursive — Reverse from the Tail",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "When an interviewer asks for a recursive version, or to show you can reason about the call stack.",
          logic:
            "**What it asks.** Reverse the very same singly linked list, but express the solution recursively — letting the call stack keep track of where you are, instead of the hand-maintained trailing `prev` pointer of the iterative version. The output contract is identical: return the head of the reversed list (the old tail).\n\n" +
            "**Why the naive idea fails.** There is nothing wrong with the iterative flip — it is already optimal at `O(1)` space. Recursion does not beat it; it trades that constant space for `O(n)` stack frames, one per node. So you reach for it not for efficiency but because interviewers frequently ask for it, and because it exposes the underlying structure of the problem beautifully: 'reverse the rest, then fix a single boundary link.'\n\n" +
            "**Key Idea.** Trust the recursion to reverse everything *after* the current node, then do one small fix-up locally. Concretely, standing at node `head`: first recurse on `head.next`, which dives all the way to the end and hands back `new_head` — the old last node, which is the head of the now-reversed remainder. At this moment `head.next` still points at the node immediately after `head`, and that node is now the *tail* of the reversed remainder. So the one link you must repair is: make that node point back at `head` (`head.next.next = head`), then sever `head`'s own forward link (`head.next = None`) so that `head` becomes a proper tail with a null terminator. Each unwinding frame stitches exactly one node onto the growing reversed chain.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Base case: if `head` is `None` (empty list) or `head.next` is `None` (single node), the list is already its own reverse, so return `head`. This is also the value that becomes `new_head` and rides all the way back up the stack.\n" +
            "2. Recurse on `head.next`. The current frame pauses here and does not continue until the entire tail has been reversed; the call returns `new_head`, the head of the reversed remainder.\n" +
            "3. Rewire the boundary: `head.next.next = head`. Read it slowly — `head.next` is the node just after `head` (now the reversed remainder's tail), and we set *its* `next` to point back at `head`.\n" +
            "4. Set `head.next = None` so `head` stops pointing forward and becomes the new tail.\n" +
            "5. Return `new_head` unchanged. It is the same object at every level, so the top-level call returns the true head of the fully reversed list.\n\n" +
            "**Why it works.** Induction on list length. Assume the recursive call correctly reverses the sublist starting at `head.next`. When that call returns, everything past `head` is reversed and `head.next` references its tail. Pointing that tail back at `head` and nulling `head`'s own forward link appends `head` to the end of the reversed sublist — extending a correct reversal of length `k` into a correct reversal of length `k+1`. The base case handles lengths 0 and 1 directly, so by induction every length is handled. `new_head` never changes as frames unwind, so it faithfully names the head all the way up.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do not forget `head.next = None`. Skip it and the original head keeps its old forward pointer while also being pointed *at*, producing a two-node cycle that loops forever.\n" +
            "- Return `new_head` (bubbled up from the base case), never `head` — `head` ends up as the tail, not the head.\n" +
            "- `head.next.next = head` is only valid because the base case guaranteed `head.next` exists at this point; the base case is what makes the dereference safe.\n" +
            "- Deep lists (up to 5000 nodes here) can approach Python's default recursion limit; the iterative version sidesteps that entirely.\n\n" +
            "**Complexity.** Time `O(n)` — exactly one call per node, each doing constant work. Space `O(n)` — the call stack holds one frame per node until the deepest call returns.\n\n" +
            "**Interview mindset.** This is the cleanest illustration of 'delegate the rest to recursion, then fix one boundary link.' Say the base case out loud, describe what a single call is responsible for, and flag the `O(n)` stack cost as the exact reason the iterative walk is preferred in production.",
          rcs:
            "from typing import Optional  # Optional[ListNode] means the value is either a ListNode or None (an empty list).\n\n\n" +
            "# ListNode is the singly-linked-list node LeetCode provides: it has .val (the payload)\n" +
            "# and .next (a pointer to the next node, or None at the tail). We rewire .next during unwinding.\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls reverseList on it.\n\n" +
            "    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:  # Return the head of the reversed list.\n\n" +
            "        # ==================== PHASE 1: BASE CASE (STOP THE RECURSION) ====================\n\n" +
            "        if not head or not head.next:  # Empty list (head is None) or a single node (head.next is None).\n" +
            "                                       # Why stop: a list of length 0 or 1 is already its own reverse.\n" +
            "            return head  # Hand this node (or None) back up; it becomes new_head for the whole chain.\n" +
            "                         # Execution flow: this return unwinds one level to the caller frame.\n\n" +
            "        # ==================== PHASE 2: REVERSE THE REST, THEN FIX ONE LINK ====================\n\n" +
            "        new_head = self.reverseList(head.next)  # Recurse: reverse everything AFTER head first.\n" +
            "                                                # What one call does: fully reverses the sublist starting at head.next.\n" +
            "                                                # Pause point: this frame waits here; it resumes only when the\n" +
            "                                                #              deeper calls finish and hand back new_head.\n" +
            "                                                # new_head: the old last node, head of the reversed remainder; it is\n" +
            "                                                #           the same object returned unchanged at every level.\n\n" +
            "        # -- At this moment: head.next is the node right after head, which is now the TAIL of the reversed remainder. --\n\n" +
            "        head.next.next = head  # Point that tail node BACK at head, appending head to the reversed chain.\n" +
            "                               # Read carefully: head.next is the following node; we set ITS .next to head.\n" +
            "                               # Why safe: the base case guaranteed head.next exists, so this dereference is valid.\n\n" +
            "        head.next = None  # Cut head's own forward link so head becomes the new tail with a null terminator.\n" +
            "                          # Why critical: skip this and head still points forward while being pointed at -> a 2-node cycle.\n\n" +
            "        # ==================== PHASE 3: PASS THE NEW HEAD UPWARD ====================\n\n" +
            "        return new_head  # Return the unchanged head of the reversed list to the caller one level up.\n" +
            "                         # Execution flow: this return ends the current frame; when all frames unwind,\n" +
            "                         #                 the top-level call hands new_head to LeetCode as the final answer.",
          plain:
            "class Solution:\n" +
            "    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        if not head or not head.next:\n" +
            "            return head\n" +
            "        new_head = self.reverseList(head.next)\n" +
            "        head.next.next = head\n" +
            "        head.next = None\n" +
            "        return new_head"
        }
      ],
      patternRecognition: [
        "'Reverse a linked list' or 'flip pointer direction' → the prev/curr save-flip-advance walk.",
        "Reversal is a reusable subroutine inside reorder, palindrome, and k-group problems.",
        "Constant-space requirement → iterative; 'do it recursively' → reverse-the-rest-then-fix-boundary."
      ],
      interviewRecall: [
        "Iterative: `prev=None`, save `nxt`, `curr.next=prev`, advance both; return `prev`.",
        "Always stash `curr.next` before flipping, or you lose the remainder of the list.",
        "Recursive: reverse `head.next`, then `head.next.next=head` and `head.next=None`."
      ]
    },

    {
      id: "add-two-numbers",
      lc: 2,
      title: "Add Two Numbers",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/add-two-numbers/",
      meta: { pattern: "Elementary Addition + Dummy Head", dataStructure: "Linked List", technique: "Digit-by-digit carry" },
      description:
        "You are given two non-empty linked lists, `l1` and `l2`, representing two non-negative integers. The digits are stored in **reverse order**, one digit per node (so the ones place is the head).\n\n" +
        "Add the two numbers and return the sum as a linked list, also in reverse-order digits.\n\n" +
        "Neither number has leading zeros, except the number 0 itself.",
      constraints: [
        "The number of nodes in each list is in the range `[1, 100]`.",
        "`0 <= Node.val <= 9`",
        "Each input represents a number without leading zeros."
      ],
      notes: [
        "Reverse-order storage is convenient: the heads are the ones digits, so you add left to right exactly as you carry.",
        "The lists may differ in length, and a final carry can add one more node."
      ],
      examples: [
        {
          input: "l1 = [2, 4, 3], l2 = [5, 6, 4]",
          output: "[7, 0, 8]",
          reasoning: "342 + 465 = 807, stored in reverse as 7 -> 0 -> 8.",
          visual:
            "```\n  2 -> 4 -> 3   (342)\n+ 5 -> 6 -> 4   (465)\n---------------\n  7 -> 0 -> 8   (807)   digit sums: 7, 10(->0 carry 1), 3+4+1=8\n```"
        },
        {
          input: "l1 = [0], l2 = [0]",
          output: "[0]",
          reasoning: "0 + 0 = 0."
        },
        {
          input: "l1 = [9, 9, 9, 9, 9, 9, 9], l2 = [9, 9, 9, 9]",
          output: "[8, 9, 9, 9, 0, 0, 0, 1]",
          reasoning: "9999999 + 9999 = 10009998; the final carry creates an extra leading node (1 at the end in reverse order).",
          visual:
            "```\n  9 9 9 9 9 9 9\n+ 9 9 9 9\n= 8 9 9 9 0 0 0 1   (carry propagates and adds one node)\n```"
        },
        {
          input: "l1 = [5], l2 = [5]",
          output: "[0, 1]",
          reasoning: "5 + 5 = 10; the carry produces a second node."
        }
      ],
      approaches: [
        {
          name: "Digit-by-Digit with Carry and a Dummy Head",
          time: "O(max(n, m))",
          space: "O(max(n, m))",
          whenToUse: "The standard, single-pass answer for reverse-order digit lists.",
          logic:
            "**What it asks.** Add two numbers whose digits are given least-significant-first as linked lists, returning the sum in the same reverse-digit format.\n\n" +
            "**Why the naive idea fails.** You might walk both lists to reconstruct two integers, add them, then rebuild a list from the sum's digits. In many languages that overflows for the 100-digit inputs allowed here; even in Python it throws away the very convenience the format hands you. Because the heads are the ones digits, you can add place by place in one pass with a running carry — exactly grade-school addition.\n\n" +
            "**Key Idea.** Reverse order means the two nodes you meet at each step share the same place value, so their digits add directly. Maintain a single `carry`. At each position compute `carry + d1 + d2`, write `sum % 10` as the new digit, and roll `sum // 10` into the carry for the next position. A `dummy` head lets you append result nodes uniformly without special-casing the first one, and a running `tail` tracks where to append.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create a `dummy` node and a `tail = dummy`; initialize `carry = 0`.\n" +
            "2. Loop while either list has nodes left **or** the carry is nonzero.\n" +
            "3. Read `d1 = l1.val if l1 else 0` and `d2 = l2.val if l2 else 0`, treating a finished list as contributing 0.\n" +
            "4. Compute `total = d1 + d2 + carry`; set `carry = total // 10` and append a new node with value `total % 10` to `tail`, then advance `tail`.\n" +
            "5. Advance whichever of `l1`, `l2` still has nodes. When the loop ends, return `dummy.next`.\n\n" +
            "**Why it works.** Since the lists are least-significant-first, position `i` of both inputs holds the same power of ten, so adding them with a carried overflow reproduces long addition exactly. Padding a shorter list with 0 keeps alignment; continuing the loop while `carry` is nonzero captures a final overflow digit (the extra node in 5+5=10). Each iteration emits exactly one output digit, so the result is correct and complete.\n\n" +
            "**Common Gotchas.**\n" +
            "- Keep looping while `carry` is nonzero even after both lists end, or you drop the leading digit of sums like 5+5.\n" +
            "- Use `if l1 else 0` for the missing digit when lists have different lengths.\n" +
            "- Split the total with `divmod` (or `% 10` and `// 10`); do not forget to reset the carry each step.\n" +
            "- Return `dummy.next`, not `dummy`.\n\n" +
            "**Complexity.** Time `O(max(n, m))` — one pass over the longer list. Space `O(max(n, m))` — the result list, which is the required output.\n\n" +
            "**Interview mindset.** Reverse-order digits plus 'add' is textbook long addition with a carry; a `dummy` head plus a `while ... or carry` guard is the clean idiom that folds the leftover carry into the same loop.",
          rcs:
            "class Solution:\n" +
            "    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        dummy = ListNode()              # Sentinel so the first append is uniform.\n" +
            "        tail = dummy                    # Last node of the result so far.\n" +
            "        carry = 0                       # Overflow carried into the next place.\n" +
            "        while l1 or l2 or carry:        # Continue while digits remain OR a carry is pending.\n" +
            "            d1 = l1.val if l1 else 0    # Missing digit counts as 0.\n" +
            "            d2 = l2.val if l2 else 0\n" +
            "            total = d1 + d2 + carry     # Column sum plus incoming carry.\n" +
            "            carry, digit = divmod(total, 10)  # carry = total//10, digit = total%10.\n" +
            "            tail.next = ListNode(digit) # Append the new digit node.\n" +
            "            tail = tail.next\n" +
            "            l1 = l1.next if l1 else None  # Advance each list that still has nodes.\n" +
            "            l2 = l2.next if l2 else None\n" +
            "        return dummy.next               # Real head is past the sentinel.",
          plain:
            "class Solution:\n" +
            "    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n" +
            "        dummy = ListNode()\n" +
            "        tail = dummy\n" +
            "        carry = 0\n" +
            "        while l1 or l2 or carry:\n" +
            "            d1 = l1.val if l1 else 0\n" +
            "            d2 = l2.val if l2 else 0\n" +
            "            total = d1 + d2 + carry\n" +
            "            carry, digit = divmod(total, 10)\n" +
            "            tail.next = ListNode(digit)\n" +
            "            tail = tail.next\n" +
            "            l1 = l1.next if l1 else None\n" +
            "            l2 = l2.next if l2 else None\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "Digits stored least-significant-first → add head to head with a running carry (long addition).",
        "Building a result list whose first node is awkward → dummy head plus a tail pointer.",
        "A trailing carry can add one more node → loop while `l1 or l2 or carry`."
      ],
      interviewRecall: [
        "Loop condition is `while l1 or l2 or carry` so the final carry becomes its own node.",
        "Treat a finished list as digit 0; use `divmod(total, 10)` for carry and digit.",
        "Dummy head + tail pointer, return `dummy.next`."
      ]
    },

    {
      id: "copy-list-with-random-pointer",
      lc: 138,
      title: "Copy List with Random Pointer",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/copy-list-with-random-pointer/",
      meta: { pattern: "Deep Copy with Back-References", dataStructure: "Linked List", technique: "Old->new hash map / interleave clone" },
      description:
        "You are given the `head` of a linked list where each node has a `val`, a `next` pointer, and an extra `random` pointer that can point to **any** node in the list or to `null`.\n\n" +
        "Construct a **deep copy** of the list: a brand-new set of nodes whose `next` and `random` pointers mirror the original structure but point only to the copied nodes, never to the originals. Return the head of the copied list.\n\n" +
        "Each node is described as a pair `[val, random_index]`, where `random_index` is the index of the node `random` points to, or `null`.",
      constraints: [
        "The number of nodes is in the range `[0, 1000]`.",
        "`-10^4 <= Node.val <= 10^4`",
        "`random` is `null` or points to some node in the list."
      ],
      notes: [
        "The challenge is `random`: it may point forward, backward, at the node itself, or nowhere.",
        "Assume the node class is `class Node: def __init__(self, x, next=None, random=None): ...`."
      ],
      examples: [
        {
          input: "head = [[7,null],[13,0],[11,4],[10,2],[1,0]]",
          output: "[[7,null],[13,0],[11,4],[10,2],[1,0]]",
          reasoning: "The copy has identical values and random targets by index, but all pointers reference new nodes.",
          visual:
            "```\nidx:   0    1    2    3    4\nval:   7    13   11   10   1\nrand:  -    ->0  ->4  ->2  ->0   (random targets by index)\ncopy mirrors every next and random among the NEW nodes\n```"
        },
        {
          input: "head = [[1,1],[2,1]]",
          output: "[[1,1],[2,1]]",
          reasoning: "Both nodes' random pointers target index 1 (the second node)."
        },
        {
          input: "head = [[3,null],[3,0],[3,null]]",
          output: "[[3,null],[3,0],[3,null]]",
          reasoning: "Duplicate values are fine; identity, not value, defines each random target."
        },
        {
          input: "head = []",
          output: "[]",
          reasoning: "An empty list copies to an empty list."
        }
      ],
      approaches: [
        {
          name: "Hash Map old -> new (Two Passes)",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The most intuitive answer; explain this first before the O(1)-space trick.",
          logic:
            "**What it asks.** Produce a fully independent clone of the list — new nodes only — whose `next` and `random` pointers reproduce the original wiring but stay entirely within the copy.\n\n" +
            "**Why the naive idea fails.** Copying `next` in a single walk is easy, but `random` can point to a node you have not created yet (a forward reference) or one you already passed. You cannot set a clone's `random` until the clone of its target exists, so a single naive pass cannot resolve all the back- and forward-references.\n\n" +
            "**Key Idea.** Break the dependency by first creating every clone, then wiring the pointers. A hash map from each original node to its clone gives you `O(1)` lookup of 'the copy of this node.' In pass one, create a bare clone for every original and record the mapping. In pass two, for each original node set `clone.next = map[original.next]` and `clone.random = map[original.random]` — both targets now exist in the map, forward or backward.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `head` is `null`, return `null`.\n" +
            "2. Pass one: walk the list; for each `curr`, create `Node(curr.val)` and store `mapping[curr] = clone`.\n" +
            "3. Pass two: walk again; for each `curr`, set `mapping[curr].next = mapping.get(curr.next)` and `mapping[curr].random = mapping.get(curr.random)`.\n" +
            "4. Use `.get(...)` (or map `None -> None`) so a `null` `next`/`random` maps cleanly to `null`.\n" +
            "5. Return `mapping[head]`, the clone of the original head.\n\n" +
            "**Why it works.** After pass one, every original node has a corresponding clone recorded in the map, so any reference target — no matter its direction — can be translated to its clone in pass two. Wiring both pointers through the map guarantees the copy references only copied nodes and mirrors the original topology exactly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Map `null` to `null`: a node's `next` or `random` may be `null`, so use `.get()` which returns `None` for a missing key.\n" +
            "- Key the map by node identity, not value — duplicate values must remain distinct nodes.\n" +
            "- Do not set pointers during pass one; the target clones may not exist yet.\n\n" +
            "**Complexity.** Time `O(n)` — two linear passes. Space `O(n)` — the hash map holds one entry per node.\n\n" +
            "**Interview mindset.** 'Deep copy with arbitrary cross-references' is the signature cue for an old-to-new hash map; mention it first, then offer the interleaving trick if asked to drop the `O(n)` map.",
          rcs:
            "class Solution:\n" +
            "    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not head:\n" +
            "            return None\n" +
            "        mapping = {}                    # original node -> its clone.\n" +
            "        curr = head                     # Pass 1: create every clone first.\n" +
            "        while curr:\n" +
            "            mapping[curr] = Node(curr.val)\n" +
            "            curr = curr.next\n" +
            "        curr = head                     # Pass 2: wire next and random via the map.\n" +
            "        while curr:\n" +
            "            mapping[curr].next = mapping.get(curr.next)      # None -> None automatically.\n" +
            "            mapping[curr].random = mapping.get(curr.random)  # Forward or backward, both exist now.\n" +
            "            curr = curr.next\n" +
            "        return mapping[head]            # Clone of the original head.",
          plain:
            "class Solution:\n" +
            "    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not head:\n" +
            "            return None\n" +
            "        mapping = {}\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            mapping[curr] = Node(curr.val)\n" +
            "            curr = curr.next\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            mapping[curr].next = mapping.get(curr.next)\n" +
            "            mapping[curr].random = mapping.get(curr.random)\n" +
            "            curr = curr.next\n" +
            "        return mapping[head]"
        },
        {
          name: "Optimized — Interleave Clones (O(1) extra space)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The follow-up answer when asked to copy without the O(n) hash map.",
          logic:
            "**What it asks.** Produce the same deep copy but without an auxiliary map — using only constant extra space beyond the output itself.\n\n" +
            "**Why the naive idea fails.** The hash map answer is clean but costs `O(n)` memory just to answer 'what is the clone of this node?' We can encode that lookup directly in the list's own structure instead of a separate map.\n\n" +
            "**Key Idea.** Weave each clone in right after its original, so the list becomes `A -> A' -> B -> B' -> C -> C' -> ...`. Now the clone of any node `X` is simply `X.next`, giving the same lookup the map provided — for free. That lets you set each clone's `random`: `X'.random = X.random.next` (the clone sitting just after `X`'s random target). Finally, unweave the two lists to restore the original and extract the copy.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `head` is `null`, return `null`.\n" +
            "2. Interleave: for each original `curr`, create `clone = Node(curr.val)`, splice it in with `clone.next = curr.next` and `curr.next = clone`, then jump to `clone.next`.\n" +
            "3. Assign randoms: walk originals again; if `curr.random` exists, set `curr.next.random = curr.random.next` (each clone is one step after its original).\n" +
            "4. Separate the lists: restore each original's `next` and stitch the clones together into their own chain.\n" +
            "5. Return the head of the extracted clone list.\n\n" +
            "**Why it works.** After interleaving, the invariant `X.next` is the clone of `X` holds for every node, so `X.random.next` is exactly the clone of `X`'s random target — no map needed. The unweave step reverses the splice, leaving the original list untouched and the copies linked correctly among themselves.\n\n" +
            "**Common Gotchas.**\n" +
            "- Guard `curr.random` before dereferencing: `curr.random.next` crashes if `random` is `null`.\n" +
            "- During separation, fully restore the original `next` pointers, or you corrupt the input list.\n" +
            "- Advance in steps of two (original, clone) consistently; off-by-one weaving tangles the chains.\n\n" +
            "**Complexity.** Time `O(n)` — three linear passes. Space `O(1)` — no map; the interleaving reuses the list's own links.\n\n" +
            "**Interview mindset.** When told 'do the deep copy without extra space,' the interleave-clone-then-split trick is the expected reply; the crux is that a node's clone lives at `node.next` so `random` resolves without a lookup table.",
          rcs:
            "class Solution:\n" +
            "    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not head:\n" +
            "            return None\n" +
            "        curr = head                     # Pass 1: weave A -> A' -> B -> B' -> ...\n" +
            "        while curr:\n" +
            "            clone = Node(curr.val)\n" +
            "            clone.next = curr.next      # Clone points to the original's successor.\n" +
            "            curr.next = clone           # Original now points to its clone.\n" +
            "            curr = clone.next           # Jump past the clone to the next original.\n" +
            "        curr = head                     # Pass 2: set each clone's random.\n" +
            "        while curr:\n" +
            "            if curr.random:             # Clone of X is X.next, so target clone is X.random.next.\n" +
            "                curr.next.random = curr.random.next\n" +
            "            curr = curr.next.next       # Advance two nodes (original -> next original).\n" +
            "        dummy = Node(0)                 # Pass 3: unweave the two lists.\n" +
            "        copy_tail = dummy\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            copy_tail.next = curr.next  # Detach the clone into the copy list.\n" +
            "            copy_tail = copy_tail.next\n" +
            "            curr.next = curr.next.next  # Restore the original's next pointer.\n" +
            "            curr = curr.next\n" +
            "        return dummy.next               # Head of the extracted copy.",
          plain:
            "class Solution:\n" +
            "    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':\n" +
            "        if not head:\n" +
            "            return None\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            clone = Node(curr.val)\n" +
            "            clone.next = curr.next\n" +
            "            curr.next = clone\n" +
            "            curr = clone.next\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            if curr.random:\n" +
            "                curr.next.random = curr.random.next\n" +
            "            curr = curr.next.next\n" +
            "        dummy = Node(0)\n" +
            "        copy_tail = dummy\n" +
            "        curr = head\n" +
            "        while curr:\n" +
            "            copy_tail.next = curr.next\n" +
            "            copy_tail = copy_tail.next\n" +
            "            curr.next = curr.next.next\n" +
            "            curr = curr.next\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "'Deep copy' a structure with arbitrary cross-pointers → old-to-new hash map.",
        "'Copy without extra space' → interleave each clone after its original so `node.next` IS the clone.",
        "Any time a pointer may reference a not-yet-created node → create all nodes first, wire second."
      ],
      interviewRecall: [
        "Two-pass map: create all clones (map original->clone), then wire next/random via the map.",
        "Map null to null with `.get()`, and key by node identity not value.",
        "O(1) trick: weave A->A'->B->B', set `X'.random = X.random.next`, then unweave to restore the original."
      ]
    },

    {
      id: "find-the-duplicate-number",
      lc: 287,
      title: "Find the Duplicate Number",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/find-the-duplicate-number/",
      meta: { pattern: "Cycle Detection on Implicit List", dataStructure: "Array as Linked List", technique: "Floyd's tortoise & hare" },
      description:
        "Given an array `nums` of `n + 1` integers where each value is in the range `[1, n]`, exactly one value is repeated — possibly more than once. Return that repeated number.\n\n" +
        "You must solve it **without modifying** the array and using only `O(1)` extra space.",
      constraints: [
        "`1 <= n <= 10^5`, and `nums` has length `n + 1`.",
        "`1 <= nums[i] <= n`",
        "Exactly one value appears more than once; it may appear multiple times."
      ],
      notes: [
        "The pigeonhole principle guarantees a duplicate: `n + 1` values drawn from `[1, n]`.",
        "The 'do not modify + O(1) space' pair is what forces the cycle-detection insight."
      ],
      examples: [
        {
          input: "nums = [1, 3, 4, 2, 2]",
          output: "2",
          reasoning: "The value 2 appears twice.",
          visual:
            "```\nindex: 0 1 2 3 4\nvalue: 1 3 4 2 2\nfollow i -> nums[i] as a 'next' pointer:\n0->1->3->2->4->2->4...  (cycle enters at value 2)\n```"
        },
        {
          input: "nums = [3, 1, 3, 4, 2]",
          output: "3",
          reasoning: "The value 3 appears twice."
        },
        {
          input: "nums = [2, 2, 2, 2, 2]",
          output: "2",
          reasoning: "The duplicate value can appear many times; the answer is still 2."
        },
        {
          input: "nums = [1, 1]",
          output: "1",
          reasoning: "n = 1, two elements both equal 1."
        }
      ],
      approaches: [
        {
          name: "Floyd's Cycle Detection (values as next-pointers)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer given the no-modify, O(1)-space constraints.",
          logic:
            "**What it asks.** Find the one repeated value among `n + 1` numbers drawn from `[1, n]`, without altering the array and using constant extra space.\n\n" +
            "**Why the naive idea fails.** Sorting or a hash set finds the duplicate easily, but sorting mutates the array (or costs `O(n)` space for a copy) and a set costs `O(n)` space — both violate the constraints. Marking visited indices by negating values also mutates the input. The constraints deliberately rule out every easy route.\n\n" +
            "**Key Idea.** Treat the array as a hidden linked list: from index `i`, the 'next' index is `nums[i]`. Because every value lies in `[1, n]`, following `i -> nums[i]` always lands on a valid index and never on index 0 after the start, so the sequence `0, nums[0], nums[nums[0]], ...` never falls off. With `n + 1` slots but values only in `[1, n]`, two different indices must point to the same value — that shared target is a node with two incoming links, which forces a **cycle**, and the value at the cycle's entrance is exactly the duplicate. So this is Floyd's tortoise-and-hare cycle detection, and finding the cycle's entry point yields the answer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Phase 1 (find a meeting point): start `slow = nums[0]` and `fast = nums[0]`. Repeatedly move `slow = nums[slow]` (one hop) and `fast = nums[nums[fast]]` (two hops) until `slow == fast`. They are now somewhere inside the cycle.\n" +
            "2. Phase 2 (find the entrance): reset `slow = nums[0]`, keep `fast` at the meeting point, then advance both one hop at a time (`slow = nums[slow]`, `fast = nums[fast]`) until they are equal again.\n" +
            "3. The index where they meet the second time is the cycle's entrance — return that value, the duplicate.\n\n" +
            "**Why it works.** The duplicate value is pointed to by at least two indices, so it is the unique node with two predecessors — the entry of the loop. Phase 1 guarantees a meeting inside the loop (the hare gains one step per move and cannot skip past the tortoise). For phase 2: let `F` be the distance from start to entry and `a` the distance from entry to the meeting point. Floyd's math shows the distance from the start to the entry equals the distance from the meeting point to the entry (mod cycle length), so two pointers advancing one step each — one from the start, one from the meeting point — collide exactly at the entrance.\n\n" +
            "**Common Gotchas.**\n" +
            "- Start both pointers at `nums[0]` (one step in), consistent with the `i -> nums[i]` mapping.\n" +
            "- In phase 2 both pointers move at the *same* speed (one hop); only phase 1 uses the 2x hare.\n" +
            "- This works because values are in `[1, n]` and length is `n + 1`; index 0 is never a link target, so it can safely be the entry point of the whole traversal.\n\n" +
            "**Complexity.** Time `O(n)` — both phases are linear. Space `O(1)` — two integer pointers; the array is never modified.\n\n" +
            "**Interview mindset.** 'Find a duplicate, no modification, O(1) space' is the disguised-cycle tell: reframe values as `next` pointers and run Floyd's two-phase algorithm, returning the cycle entrance.",
          rcs:
            "class Solution:\n" +
            "    def findDuplicate(self, nums: List[int]) -> int:\n" +
            "        slow = nums[0]                  # Tortoise: one hop, i -> nums[i].\n" +
            "        fast = nums[0]                  # Hare: two hops.\n" +
            "        while True:                     # Phase 1: find a meeting point in the cycle.\n" +
            "            slow = nums[slow]\n" +
            "            fast = nums[nums[fast]]\n" +
            "            if slow == fast:\n" +
            "                break\n" +
            "        slow = nums[0]                  # Phase 2: reset one pointer to the start.\n" +
            "        while slow != fast:             # Both move one hop until they meet at the entrance.\n" +
            "            slow = nums[slow]\n" +
            "            fast = nums[fast]\n" +
            "        return slow                     # Cycle entrance = the duplicate value.",
          plain:
            "class Solution:\n" +
            "    def findDuplicate(self, nums: List[int]) -> int:\n" +
            "        slow = nums[0]\n" +
            "        fast = nums[0]\n" +
            "        while True:\n" +
            "            slow = nums[slow]\n" +
            "            fast = nums[nums[fast]]\n" +
            "            if slow == fast:\n" +
            "                break\n" +
            "        slow = nums[0]\n" +
            "        while slow != fast:\n" +
            "            slow = nums[slow]\n" +
            "            fast = nums[fast]\n" +
            "        return slow"
        },
        {
          name: "Binary Search on the Count",
          time: "O(n log n)",
          space: "O(1)",
          whenToUse: "An alternative when the cycle insight feels slippery, or as a second idea in interview.",
          logic:
            "**What it asks.** Find the repeated value under the same no-modify, `O(1)`-space rules, without needing the linked-list reframing.\n\n" +
            "**Why the naive idea fails.** Direct approaches either mutate the array or use linear extra space. Instead of searching positions, we binary-search over the *value range* `[1, n]`, using a counting property that never touches the array's order.\n\n" +
            "**Key Idea.** Pick a candidate value `mid`. Count how many array elements are `<= mid`. If there were no duplicate, exactly `mid` of the numbers `1..n` would be `<= mid`. A count strictly greater than `mid` means the extra copies of the duplicate fall at or below `mid`, so the duplicate lies in `[low, mid]`; otherwise it lies in `[mid + 1, high]`. This is a monotone predicate, so binary search on the value converges to the duplicate.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set `low = 1`, `high = n` (the value bounds, where `n = len(nums) - 1`).\n" +
            "2. While `low < high`, let `mid = (low + high) // 2` and count elements `<= mid` in one pass.\n" +
            "3. If `count > mid`, the duplicate is in the lower half: set `high = mid`. Otherwise set `low = mid + 1`.\n" +
            "4. When `low == high`, that value is the duplicate — return it.\n\n" +
            "**Why it works.** Define `f(x)` = count of elements `<= x`. Without a duplicate `f(x) = x`; the duplicate adds extra elements, making `f(x) > x` for every `x` at or above the duplicate value and `f(x) = x` below it. That threshold is monotone, so halving the value range on the `count > mid` test always keeps the duplicate inside `[low, high]` and squeezes it to a single value.\n\n" +
            "**Common Gotchas.**\n" +
            "- Binary-search the value range `[1, n]`, not array indices.\n" +
            "- Use `count > mid` (strictly greater) as the go-left test; `>=` is wrong.\n" +
            "- The array is read-only here too — counting never reorders it.\n\n" +
            "**Complexity.** Time `O(n log n)` — `log n` iterations, each an `O(n)` count. Space `O(1)`. Slower than Floyd's `O(n)` but conceptually simpler.\n\n" +
            "**Interview mindset.** When 'binary search' is not obvious because the array is unsorted, remember you can search the *answer's value range* whenever a monotone counting predicate exists — a broadly reusable technique.",
          rcs:
            "class Solution:\n" +
            "    def findDuplicate(self, nums: List[int]) -> int:\n" +
            "        low, high = 1, len(nums) - 1    # Search the VALUE range [1, n].\n" +
            "        while low < high:\n" +
            "            mid = (low + high) // 2\n" +
            "            count = sum(1 for x in nums if x <= mid)  # How many values are <= mid.\n" +
            "            if count > mid:             # Too many => duplicate is in the lower half.\n" +
            "                high = mid\n" +
            "            else:                       # Otherwise it is in the upper half.\n" +
            "                low = mid + 1\n" +
            "        return low                      # low == high == the duplicate value.",
          plain:
            "class Solution:\n" +
            "    def findDuplicate(self, nums: List[int]) -> int:\n" +
            "        low, high = 1, len(nums) - 1\n" +
            "        while low < high:\n" +
            "            mid = (low + high) // 2\n" +
            "            count = sum(1 for x in nums if x <= mid)\n" +
            "            if count > mid:\n" +
            "                high = mid\n" +
            "            else:\n" +
            "                low = mid + 1\n" +
            "        return low"
        }
      ],
      patternRecognition: [
        "'Find a duplicate, no modification, O(1) space' → treat values as next-pointers and run Floyd's cycle detection.",
        "Values in `[1, n]` over `n + 1` slots → pigeonhole guarantees a duplicate = a cycle entrance.",
        "Unsorted array but a monotone counting predicate → binary search on the value range."
      ],
      interviewRecall: [
        "Phase 1 finds a meeting point (slow 1 hop, fast 2 hops); phase 2 resets slow to `nums[0]`, both move 1 hop to the entrance.",
        "The cycle entrance is the node with two predecessors — exactly the duplicate value.",
        "Binary search alternative: count elements `<= mid`; if `count > mid`, go left. O(n log n)."
      ]
    },

    {
      id: "lru-cache",
      lc: 146,
      title: "LRU Cache",
      difficulty: "Medium",
      category: "Linked List",
      link: "https://leetcode.com/problems/lru-cache/",
      meta: { pattern: "Hash Map + Doubly Linked List", dataStructure: "DLL + Dict", technique: "O(1) move-to-front, evict-tail" },
      description:
        "Design a data structure for a **Least Recently Used (LRU) cache**. Implement `LRUCache`:\n\n" +
        "- `LRUCache(capacity)` initializes the cache with a positive `capacity`.\n" +
        "- `get(key)` returns the value for `key` if present, otherwise `-1`.\n" +
        "- `put(key, value)` inserts or updates the value. If inserting exceeds `capacity`, evict the **least recently used** entry first.\n\n" +
        "Both `get` and `put` must run in average `O(1)` time. Any access (get or put) counts as a use, making that key the most recently used.",
      constraints: [
        "`1 <= capacity <= 3000`",
        "`0 <= key <= 10^4`, `0 <= value <= 10^5`",
        "At most `2 * 10^5` calls to `get` and `put`."
      ],
      notes: [
        "'Least recently used' = the entry untouched for the longest time; it is the one evicted on overflow.",
        "The `O(1)` requirement is what forces a doubly linked list paired with a hash map."
      ],
      examples: [
        {
          input: "LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2); put(4,4); get(1); get(3); get(4)",
          output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
          reasoning: "Capacity 2. get(1)=1 makes 1 most-recent; put(3,3) evicts key 2 (LRU); get(2)=-1; put(4,4) evicts key 1; get(1)=-1; get(3)=3; get(4)=4.",
          visual:
            "```\nput(1,1): [1]\nput(2,2): [2,1]           (front = most recent)\nget(1)=1: [1,2]\nput(3,3): [3,1]  evict 2  (2 was LRU at the tail)\nget(2)=-1\nput(4,4): [4,3]  evict 1\nget(1)=-1  get(3)=3  get(4)=4\n```"
        },
        {
          input: "LRUCache(1); put(1,1); get(1); put(2,2); get(1); get(2)",
          output: "[null, null, 1, null, -1, 2]",
          reasoning: "Capacity 1: put(2,2) evicts key 1, so get(1)=-1."
        },
        {
          input: "LRUCache(2); put(1,1); put(1,10); get(1)",
          output: "[null, null, null, 10]",
          reasoning: "put on an existing key updates its value and marks it most-recent, without adding a new entry."
        },
        {
          input: "LRUCache(2); put(2,1); put(2,2); get(2); put(1,1); put(4,1); get(2)",
          output: "[null, null, null, 2, null, null, -1]",
          reasoning: "After put(4,1) with capacity 2, key 2 was least recently used and is evicted, so get(2)=-1."
        }
      ],
      approaches: [
        {
          name: "Hash Map + Doubly Linked List",
          time: "O(1) per operation",
          space: "O(capacity)",
          whenToUse: "The expected design answer, showing you can build the O(1) structure by hand.",
          logic:
            "**What it asks.** Support `get` and `put` in `O(1)` while always knowing which entry is least recently used so it can be evicted on overflow.\n\n" +
            "**Why the naive idea fails.** A plain dictionary gives `O(1)` lookup but no notion of recency order, so finding the LRU entry to evict would need an `O(n)` scan. An array or singly linked list ordered by recency makes eviction easy but moving a touched entry to the front is `O(n)` because you cannot splice it out without its predecessor. You need both: instant lookup **and** instant reordering.\n\n" +
            "**Key Idea.** Combine a hash map with a **doubly** linked list. The hash map maps `key -> node` for `O(1)` lookup. The doubly linked list keeps entries in recency order, most-recent at the head and least-recent at the tail. Because the list is doubly linked, any node can be unlinked in `O(1)` (you have both neighbors) and reinserted at the head in `O(1)`. Two sentinel nodes, `head` and `tail`, remove all edge cases for inserting and removing at the ends. The core invariant: after any access, the touched node sits right behind `head`, and the node just before `tail` is always the eviction victim.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In `__init__`, store `capacity`, an empty `cache` dict, and create two sentinels `head` and `tail` linked to each other (`head.next = tail`, `tail.prev = head`).\n" +
            "2. Helper `_remove(node)`: splice it out via `node.prev.next = node.next` and `node.next.prev = node.prev`.\n" +
            "3. Helper `_insert_front(node)`: link it between `head` and `head.next`.\n" +
            "4. `get(key)`: if absent return `-1`; else `_remove` the node, `_insert_front` it (mark most-recent), and return its value.\n" +
            "5. `put(key, value)`: if the key exists, remove its old node; create a new node, insert at front, and record it in the dict. If size now exceeds `capacity`, evict `tail.prev` — remove it from the list and delete its key from the dict.\n\n" +
            "**Why it works.** The dict guarantees `O(1)` access to any node, and the doubly linked list makes unlink-and-move-to-front `O(1)`. Every access moves its node to the front, so recency order is maintained continuously; therefore the node adjacent to the `tail` sentinel is, by construction, always the least recently used and correct to evict.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a *doubly* linked list; a singly linked list cannot unlink an interior node in `O(1)`.\n" +
            "- On `put` of an existing key, remove the old node before inserting the new one, or the key appears twice in the list.\n" +
            "- Keep the dict and list in sync on eviction: remove from both.\n" +
            "- Sentinel `head`/`tail` nodes avoid null checks when inserting/removing at the ends.\n\n" +
            "**Complexity.** Time `O(1)` amortized for both `get` and `put`. Space `O(capacity)` — the dict and list hold at most `capacity` entries.\n\n" +
            "**Interview mindset.** 'O(1) get and put with eviction by recency' is the flagship hash-map-plus-doubly-linked-list design; rehearse the `_remove`/`_insert_front` helpers and the head=most-recent, tail=LRU invariant until they are automatic.",
          rcs:
            "class Node:\n" +
            "    def __init__(self, key=0, value=0):\n" +
            "        self.key = key                  # Store key so eviction can delete it from the dict.\n" +
            "        self.value = value\n" +
            "        self.prev = None                # Doubly linked: both neighbors known.\n" +
            "        self.next = None\n" +
            "\n" +
            "class LRUCache:\n" +
            "    def __init__(self, capacity: int):\n" +
            "        self.capacity = capacity\n" +
            "        self.cache = {}                 # key -> Node.\n" +
            "        self.head = Node()              # Sentinel: most-recent side.\n" +
            "        self.tail = Node()              # Sentinel: least-recent side.\n" +
            "        self.head.next = self.tail      # Empty list: head <-> tail.\n" +
            "        self.tail.prev = self.head\n" +
            "\n" +
            "    def _remove(self, node):            # Unlink a node in O(1).\n" +
            "        node.prev.next = node.next\n" +
            "        node.next.prev = node.prev\n" +
            "\n" +
            "    def _insert_front(self, node):      # Insert just behind head (most recent).\n" +
            "        node.prev = self.head\n" +
            "        node.next = self.head.next\n" +
            "        self.head.next.prev = node\n" +
            "        self.head.next = node\n" +
            "\n" +
            "    def get(self, key: int) -> int:\n" +
            "        if key not in self.cache:\n" +
            "            return -1\n" +
            "        node = self.cache[key]\n" +
            "        self._remove(node)              # Touching it makes it most-recent...\n" +
            "        self._insert_front(node)        # ...move to the front.\n" +
            "        return node.value\n" +
            "\n" +
            "    def put(self, key: int, value: int) -> None:\n" +
            "        if key in self.cache:           # Overwrite: drop the stale node first.\n" +
            "            self._remove(self.cache[key])\n" +
            "        node = Node(key, value)\n" +
            "        self.cache[key] = node\n" +
            "        self._insert_front(node)        # New/updated entry is most-recent.\n" +
            "        if len(self.cache) > self.capacity:  # Over capacity: evict the LRU.\n" +
            "            lru = self.tail.prev        # Node just before tail = least recently used.\n" +
            "            self._remove(lru)\n" +
            "            del self.cache[lru.key]",
          plain:
            "class Node:\n" +
            "    def __init__(self, key=0, value=0):\n" +
            "        self.key = key\n" +
            "        self.value = value\n" +
            "        self.prev = None\n" +
            "        self.next = None\n" +
            "\n" +
            "class LRUCache:\n" +
            "    def __init__(self, capacity: int):\n" +
            "        self.capacity = capacity\n" +
            "        self.cache = {}\n" +
            "        self.head = Node()\n" +
            "        self.tail = Node()\n" +
            "        self.head.next = self.tail\n" +
            "        self.tail.prev = self.head\n" +
            "\n" +
            "    def _remove(self, node):\n" +
            "        node.prev.next = node.next\n" +
            "        node.next.prev = node.prev\n" +
            "\n" +
            "    def _insert_front(self, node):\n" +
            "        node.prev = self.head\n" +
            "        node.next = self.head.next\n" +
            "        self.head.next.prev = node\n" +
            "        self.head.next = node\n" +
            "\n" +
            "    def get(self, key: int) -> int:\n" +
            "        if key not in self.cache:\n" +
            "            return -1\n" +
            "        node = self.cache[key]\n" +
            "        self._remove(node)\n" +
            "        self._insert_front(node)\n" +
            "        return node.value\n" +
            "\n" +
            "    def put(self, key: int, value: int) -> None:\n" +
            "        if key in self.cache:\n" +
            "            self._remove(self.cache[key])\n" +
            "        node = Node(key, value)\n" +
            "        self.cache[key] = node\n" +
            "        self._insert_front(node)\n" +
            "        if len(self.cache) > self.capacity:\n" +
            "            lru = self.tail.prev\n" +
            "            self._remove(lru)\n" +
            "            del self.cache[lru.key]"
        },
        {
          name: "OrderedDict (built-in)",
          time: "O(1) per operation",
          space: "O(capacity)",
          whenToUse: "A concise Python answer once you have explained the underlying DLL design.",
          logic:
            "**What it asks.** The same `O(1)` LRU cache, but leveraging Python's `collections.OrderedDict`, which is internally a dict plus a doubly linked list — exactly the structure built by hand above.\n\n" +
            "**Why the naive idea fails.** A regular dict has no recency ordering. `OrderedDict` remembers insertion order and, crucially, supports `move_to_end` and `popitem(last=False)` in `O(1)`, giving the recency operations for free.\n\n" +
            "**Key Idea.** Treat the *end* of the `OrderedDict` as most-recently-used. On any access, `move_to_end(key)` promotes it. On overflow, `popitem(last=False)` removes and returns the oldest (front) item — the LRU — in `O(1)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `__init__`: store `capacity` and an empty `OrderedDict`.\n" +
            "2. `get(key)`: if absent return `-1`; else `move_to_end(key)` to mark most-recent and return the value.\n" +
            "3. `put(key, value)`: if the key exists, `move_to_end(key)`; set `cache[key] = value`.\n" +
            "4. If `len(cache) > capacity`, call `popitem(last=False)` to evict the least-recently-used entry.\n\n" +
            "**Why it works.** `OrderedDict` maintains the same dict-plus-doubly-linked-list internally, so `move_to_end` and `popitem(last=False)` are `O(1)` and preserve recency order automatically. The semantics match the manual version exactly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Choose an end convention and stick with it: here end = most-recent, so evict with `last=False`.\n" +
            "- On `put` of an existing key you must still `move_to_end`; a bare reassignment does not reorder it.\n" +
            "- Interviewers often want the manual DLL design first; offer this as the concise follow-up.\n\n" +
            "**Complexity.** Time `O(1)` per operation. Space `O(capacity)`.\n\n" +
            "**Interview mindset.** Knowing that `OrderedDict` *is* a hash map over a doubly linked list is the connective insight; use it to write the short version, but be ready to expand it into the hand-rolled structure on request.",
          rcs:
            "from collections import OrderedDict\n" +
            "\n" +
            "class LRUCache:\n" +
            "    def __init__(self, capacity: int):\n" +
            "        self.capacity = capacity\n" +
            "        self.cache = OrderedDict()      # dict + doubly linked list under the hood.\n" +
            "\n" +
            "    def get(self, key: int) -> int:\n" +
            "        if key not in self.cache:\n" +
            "            return -1\n" +
            "        self.cache.move_to_end(key)     # End = most recently used.\n" +
            "        return self.cache[key]\n" +
            "\n" +
            "    def put(self, key: int, value: int) -> None:\n" +
            "        if key in self.cache:\n" +
            "            self.cache.move_to_end(key) # Refresh recency for an existing key.\n" +
            "        self.cache[key] = value\n" +
            "        if len(self.cache) > self.capacity:\n" +
            "            self.cache.popitem(last=False)  # Evict the front = least recently used.",
          plain:
            "from collections import OrderedDict\n" +
            "\n" +
            "class LRUCache:\n" +
            "    def __init__(self, capacity: int):\n" +
            "        self.capacity = capacity\n" +
            "        self.cache = OrderedDict()\n" +
            "\n" +
            "    def get(self, key: int) -> int:\n" +
            "        if key not in self.cache:\n" +
            "            return -1\n" +
            "        self.cache.move_to_end(key)\n" +
            "        return self.cache[key]\n" +
            "\n" +
            "    def put(self, key: int, value: int) -> None:\n" +
            "        if key in self.cache:\n" +
            "            self.cache.move_to_end(key)\n" +
            "        self.cache[key] = value\n" +
            "        if len(self.cache) > self.capacity:\n" +
            "            self.cache.popitem(last=False)"
        }
      ],
      patternRecognition: [
        "'O(1) get and put with eviction by recency' → hash map + doubly linked list.",
        "Need instant lookup AND instant reordering → dict for lookup, DLL for order.",
        "In Python, `OrderedDict` (move_to_end + popitem) is the ready-made version of that structure."
      ],
      interviewRecall: [
        "Head = most recent, tail = least recent; evict `tail.prev` on overflow.",
        "Doubly linked list so any node unlinks in O(1); sentinels remove end-case checks.",
        "Store the key inside each node so eviction can also delete it from the dict."
      ]
    },

    {
      id: "reverse-nodes-in-k-group",
      lc: 25,
      title: "Reverse Nodes in k-Group",
      difficulty: "Hard",
      category: "Linked List",
      link: "https://leetcode.com/problems/reverse-nodes-in-k-group/",
      meta: { pattern: "Grouped Pointer Reversal", dataStructure: "Linked List", technique: "Dummy + per-group reverse & reconnect" },
      description:
        "Given the `head` of a linked list, reverse the nodes of the list `k` at a time and return the modified list.\n\n" +
        "`k` is a positive integer no larger than the list length. If the number of nodes is not a multiple of `k`, the leftover nodes at the end stay in their original order.\n\n" +
        "You may not change node values — only rearrange the nodes themselves.",
      constraints: [
        "The number of nodes is `n`, with `1 <= k <= n <= 5000`.",
        "`0 <= Node.val <= 1000`",
        "Solve it using `O(1)` extra memory (in-place)."
      ],
      notes: [
        "A trailing group of fewer than `k` nodes is left as-is, not reversed.",
        "This generalizes 'reverse a linked list': the same prev/curr flip, applied group by group and stitched together."
      ],
      examples: [
        {
          input: "head = [1, 2, 3, 4, 5], k = 2",
          output: "[2, 1, 4, 3, 5]",
          reasoning: "Reverse [1,2]->[2,1] and [3,4]->[4,3]; the leftover [5] stays.",
          visual:
            "```\n 1 -> 2 | 3 -> 4 | 5\n reverse each full group of 2:\n 2 -> 1 | 4 -> 3 | 5   (5 alone, unchanged)\n```"
        },
        {
          input: "head = [1, 2, 3, 4, 5], k = 3",
          output: "[3, 2, 1, 4, 5]",
          reasoning: "Reverse [1,2,3]->[3,2,1]; [4,5] is shorter than k, so it stays.",
          visual:
            "```\n 1 -> 2 -> 3 | 4 -> 5\n 3 -> 2 -> 1 | 4 -> 5   (leftover of 2 < k=3 left as-is)\n```"
        },
        {
          input: "head = [1, 2, 3, 4], k = 4",
          output: "[4, 3, 2, 1]",
          reasoning: "The whole list is one group of 4 and gets fully reversed."
        },
        {
          input: "head = [1, 2, 3, 4, 5], k = 1",
          output: "[1, 2, 3, 4, 5]",
          reasoning: "k = 1 reverses each single node — no change."
        }
      ],
      approaches: [
        {
          name: "Dummy + Per-Group Reverse and Reconnect",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected in-place answer; the canonical hard linked-list reversal.",
          logic:
            "**What it asks.** Reverse the list in consecutive blocks of `k` nodes, leaving a final block shorter than `k` untouched, all in place without altering values.\n\n" +
            "**Why the naive idea fails.** Reversing the whole list, or copying values into an array to reverse in chunks, either produces the wrong order or spends `O(n)` extra space and sidesteps the pointer work the problem is about. The real task is careful pointer surgery: reverse each full group and re-stitch the groups so the boundaries connect correctly.\n\n" +
            "**Key Idea.** Process the list group by group. Before reversing a group, check that a full `k` nodes remain — if not, stop and leave the tail as-is. Track a `group_prev` pointer: the node just before the current group (initially a `dummy` before `head`). Find the group's `kth` node, reverse the `k` nodes with the standard `prev`/`curr` flip, then reconnect: `group_prev.next` becomes the group's new front (the old `kth` node), and the group's new tail (the old first node) links to the node after the group. Advance `group_prev` to that old first node and repeat.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create `dummy` with `dummy.next = head`; set `group_prev = dummy`.\n" +
            "2. Loop: from `group_prev`, walk `k` steps to find the group's `kth` node. If you run off the end (fewer than `k` nodes remain), break — the leftover stays in place.\n" +
            "3. Record `group_next = kth.next` (the first node of the following group) as the reversal's stopping point.\n" +
            "4. Reverse the group: set `prev = group_next`, `curr = group_prev.next`, and repeatedly flip `curr.next = prev`, advancing `prev` and `curr` until `curr` reaches `group_next`. Now the group points backward and its last-processed node's `next` already points at `group_next`.\n" +
            "5. Reconnect: the old first node (now the group's tail) is `group_prev.next`; save it as `new_group_prev`. Set `group_prev.next = kth` (the group's new front), then move `group_prev = new_group_prev` for the next iteration.\n" +
            "6. When no full group remains, return `dummy.next`.\n\n" +
            "**Why it works.** Reversing a group with `prev` initialized to `group_next` automatically wires the group's new tail to the next group, so no separate link fix is needed there. Setting `group_prev.next = kth` attaches the reversed group's new front to the preceding part. Because `group_prev` advances to the group's tail (the old first node), each subsequent group attaches seamlessly. The pre-check for `k` remaining nodes guarantees a short final group is never reversed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check that a full group of `k` exists *before* reversing; otherwise you would wrongly reverse a short tail.\n" +
            "- Initialize the group reversal's `prev` to `group_next` (not `None`) so the group's tail connects to the following group.\n" +
            "- Update `group_prev` to the old first node (the group's new tail), not to `kth`.\n" +
            "- Use a `dummy` so the very first group's front can be reattached uniformly; return `dummy.next`.\n\n" +
            "**Complexity.** Time `O(n)` — each node is visited a constant number of times (one scan to find `kth`, one to reverse). Space `O(1)` — only pointers.\n\n" +
            "**Interview mindset.** k-group reversal is 'reverse a linked list' scaled up with bookkeeping: a helper to locate the `kth` node, the standard flip bounded by `group_next`, and disciplined reconnection through `group_prev`. Draw the three boundary pointers before coding.",
          rcs:
            "class Solution:\n" +
            "    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:\n" +
            "        dummy = ListNode(0, head)       # Sentinel so the first group reattaches uniformly.\n" +
            "        group_prev = dummy              # Node just before the current group.\n" +
            "\n" +
            "        def get_kth(node, k):           # Walk k steps; return the kth node or None.\n" +
            "            while node and k > 0:\n" +
            "                node = node.next\n" +
            "                k -= 1\n" +
            "            return node\n" +
            "\n" +
            "        while True:\n" +
            "            kth = get_kth(group_prev, k)  # Last node of the group to reverse.\n" +
            "            if not kth:                 # Fewer than k nodes remain: leave the tail as-is.\n" +
            "                break\n" +
            "            group_next = kth.next       # First node of the NEXT group = reversal boundary.\n" +
            "            prev = group_next           # Initializing prev here wires the tail to the next group.\n" +
            "            curr = group_prev.next      # First node of the current group.\n" +
            "            while curr != group_next:   # Standard prev/curr flip across the group.\n" +
            "                nxt = curr.next\n" +
            "                curr.next = prev\n" +
            "                prev = curr\n" +
            "                curr = nxt\n" +
            "            new_group_prev = group_prev.next  # Old first node = group's new tail.\n" +
            "            group_prev.next = kth       # Attach preceding part to the group's new front.\n" +
            "            group_prev = new_group_prev # Advance to the group's tail for the next round.\n" +
            "        return dummy.next",
          plain:
            "class Solution:\n" +
            "    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:\n" +
            "        dummy = ListNode(0, head)\n" +
            "        group_prev = dummy\n" +
            "\n" +
            "        def get_kth(node, k):\n" +
            "            while node and k > 0:\n" +
            "                node = node.next\n" +
            "                k -= 1\n" +
            "            return node\n" +
            "\n" +
            "        while True:\n" +
            "            kth = get_kth(group_prev, k)\n" +
            "            if not kth:\n" +
            "                break\n" +
            "            group_next = kth.next\n" +
            "            prev = group_next\n" +
            "            curr = group_prev.next\n" +
            "            while curr != group_next:\n" +
            "                nxt = curr.next\n" +
            "                curr.next = prev\n" +
            "                prev = curr\n" +
            "                curr = nxt\n" +
            "            new_group_prev = group_prev.next\n" +
            "            group_prev.next = kth\n" +
            "            group_prev = new_group_prev\n" +
            "        return dummy.next"
        }
      ],
      patternRecognition: [
        "'Reverse in blocks of k' → per-group prev/curr flip stitched together with a dummy.",
        "Leftover shorter than k stays put → check k nodes exist before reversing each group.",
        "Boundary-heavy linked-list surgery → draw group_prev, kth, and group_next before coding."
      ],
      interviewRecall: [
        "Find the kth node first; if it is null, stop and leave the tail unreversed.",
        "Init the group flip's `prev` to `group_next` so the group's tail auto-links to the next group.",
        "Reconnect: `group_prev.next = kth`, then advance `group_prev` to the old first node (the new tail)."
      ]
    }
  ]);
})();
