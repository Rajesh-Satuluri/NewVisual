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
    }
  ]);
})();
