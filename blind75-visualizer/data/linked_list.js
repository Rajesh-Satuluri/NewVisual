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
            "**A. Asked.** Does following `next` ever revisit a node?\n\n" +
            "**B. Naive intuition.** A cycle means we come back to a node we already stepped on. So just remember every node we visit; the first time we see one twice, there is a cycle.\n\n" +
            "**E. Data structure.** A hash **set** of node *identities* (the objects themselves, not their values \u2014 values can repeat without a cycle).\n\n" +
            "**I. Step by step.** Walk from `head`. Before moving on, check if the current node is already in the set. If yes \u2192 cycle. Otherwise add it and advance. If we reach `null`, the list ends, so no cycle.\n\n" +
            "**J. Why correct.** A singly linked list is a chain: the only way to revisit a node is a back-pointer, i.e. a cycle. Reaching `null` proves the chain terminates.\n\n" +
            "**K/L. Complexity.** Each node visited once \u2192 time `O(n)`; the set can hold all `n` nodes \u2192 space `O(n)`.",
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
            "**D. Key observation.** Send two pointers along the list at different speeds: `slow` moves one node per step, `fast` moves two. If the list ends (`fast` hits `null`), there is no cycle. If there *is* a cycle, both pointers eventually enter the loop and can never leave it \u2014 so the faster one must lap the slower and they collide.\n\n" +
            "**F. Why the fast pointer WILL catch the slow one.** Once both are inside the cycle, look at the gap between them measured *around the loop*. Each step `fast` gains exactly one position on `slow` (it moves 2, slow moves 1, net +1). A gap that shrinks by 1 every step must reach 0 \u2014 they cannot skip past each other because the gap changes by exactly one, never two. So a meeting is guaranteed inside a loop of finite length.\n\n" +
            "**G/H. Pointers.** `slow` = tortoise (step 1), `fast` = hare (step 2). Their meeting is the cycle signal; if `fast` or `fast.next` is `null`, the hare ran off the end \u2192 no cycle.\n\n" +
            "**I. Step by step.**\n" +
            "1. Start `slow` and `fast` at `head`.\n" +
            "2. Loop while `fast` and `fast.next` exist (so `fast` can safely jump two).\n" +
            "3. Advance `slow` by 1 and `fast` by 2.\n" +
            "4. If they ever point to the same node \u2192 cycle, return `true`.\n" +
            "5. If the loop exits (hare hit `null`), return `false`.\n\n" +
            "**J. Why correct.** No cycle \u21d2 `fast` reaches `null` and we return false. Cycle \u21d2 by the gap argument they must meet, and we return true. Both cases are covered exactly.\n\n" +
            "**K/L. Complexity.** Time `O(n)` (slow travels at most n steps before the meeting), space `O(1)` \u2014 just two pointers.\n\n" +
            "**M. Interview mindset.** 'Detect a cycle with no extra memory' is the canonical trigger for fast/slow pointers.",
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
            "**A. Asked.** Weave two already-sorted chains into one sorted chain, reusing the nodes.\n\n" +
            "**D. Key observation.** Because both lists are sorted, the next node of the merged list is always the smaller of the two current heads. So we compare heads, take the smaller, and advance only that list \u2014 like merging in merge-sort.\n\n" +
            "**E. Pattern \u2014 the dummy head.** Building a list from scratch has an annoying edge case: the *first* node is special because there is no predecessor to attach it to. A **dummy** (sentinel) node fixes this \u2014 we always attach to `tail.next`, and at the end the real answer is `dummy.next`. No branching for the first element.\n\n" +
            "**G/H. Pointers.** `tail` is the last node of the merged list so far (starts at `dummy`). `l1`, `l2` walk the two inputs.\n\n" +
            "**I. Step by step.**\n" +
            "1. Create `dummy`; set `tail = dummy`.\n" +
            "2. While both `l1` and `l2` are non-null: attach the smaller head to `tail.next`, advance that list and `tail`.\n" +
            "3. One list is now exhausted; the other is already sorted, so link the leftover in a single step (`tail.next = l1 or l2`).\n" +
            "4. Return `dummy.next`.\n\n" +
            "**J. Why correct.** At each step we append the globally smallest remaining node, so the output stays sorted. The leftover tail is sorted and all its values are >= everything appended, so appending it whole is valid.\n\n" +
            "**K/L. Complexity.** Each node is visited once \u2192 `O(n + m)` time; we only relink existing nodes \u2192 `O(1)` extra space.\n\n" +
            "**M. Interview mindset.** 'Merge sorted things' + linked list \u2192 dummy head plus a `tail` you keep appending to.",
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
            "**B. Brute force.** Merge the lists one at a time: fold list 2 into the accumulated result, then list 3, and so on, using the two-list merge from LC 21.\n\n" +
            "**C. Why it is slow.** The accumulated list keeps growing, and every later merge re-walks all the nodes already merged. In the worst case list `i` re-touches `i` lists' worth of nodes, giving `O(k * N)` \u2014 for large `k` this is much worse than the heap.",
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
            "**D. Key observation.** At every moment, the next node of the answer is the smallest among the *current heads* of the k lists \u2014 only k candidates, not N. If we can grab that minimum fast and, after taking it, insert the *next* node of the list it came from, we do a true k-way merge.\n\n" +
            "**E. Data structure \u2014 min-heap.** A min-heap of size at most `k` gives the smallest current head in `O(log k)`. We push the head of each non-empty list, then repeatedly pop the smallest and push its successor.\n\n" +
            "**F. Why it works.** Because each list is sorted, once we pop a node the only new candidate it can contribute is its own `next`. The heap therefore always holds exactly one 'frontier' node per still-active list, and its minimum is the global minimum of all remaining nodes.\n\n" +
            "**G/H. What we store.** Heap entries are tuples `(node.val, tiebreaker, node)`. The integer tiebreaker (a counter) prevents Python from ever comparing two `ListNode` objects when values tie \u2014 nodes are not orderable.\n\n" +
            "**I. Step by step.**\n" +
            "1. Push every non-empty list's head into the heap.\n" +
            "2. Use a dummy head + `tail`.\n" +
            "3. Pop the smallest `(val, _, node)`, append `node` to `tail`, advance `tail`.\n" +
            "4. If `node.next` exists, push it.\n" +
            "5. Repeat until the heap is empty; return `dummy.next`.\n\n" +
            "**J. Why correct.** Each pop yields the smallest node not yet placed, so the output is sorted; every node is pushed exactly once (when its predecessor in the same list is popped, or as an initial head), so nothing is lost or duplicated.\n\n" +
            "**K/L. Complexity.** N pops/pushes, each `O(log k)` \u2192 time `O(N log k)`; the heap holds at most k entries \u2192 space `O(k)`.\n\n" +
            "**M. Interview mindset.** 'Merge k sorted things' \u2192 min-heap of the k frontiers. Divide-and-conquer (pairwise merge, halving k each round) is the other optimal, also `O(N log k)`.",
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
            "**A. Asked.** Delete the n-th node from the end without knowing the length up front (ideally one pass).\n\n" +
            "**B. Naive idea.** Count the length in one pass, then walk `sz - n` steps to reach the node before the target. That is two passes \u2014 correct but we can do better.\n\n" +
            "**D. Key observation.** To delete a node we need the node *before* it. If two pointers are kept exactly `n` links apart, then when the front pointer reaches the end, the back pointer sits `n` nodes from the end \u2014 precisely at the node just before the one to remove.\n\n" +
            "**E. Pattern \u2014 dummy head + gapped pointers.** A **dummy** before `head` guarantees the target always has a predecessor, even when the target is the head itself. This removes the special case for deleting the first node.\n\n" +
            "**G/H. Pointers.** `fast` and `slow` both start at `dummy`. First advance `fast` by `n` steps to open a gap of `n`. Then move both together until `fast` reaches the last node; now `slow` is the predecessor of the target.\n\n" +
            "**I. Step by step.**\n" +
            "1. `dummy.next = head`; set `fast = slow = dummy`.\n" +
            "2. Advance `fast` `n` times (open the n-gap).\n" +
            "3. While `fast.next` is not null, advance both `fast` and `slow` (keep the gap; stop with `fast` on the last node).\n" +
            "4. `slow.next` is the node to remove: splice it out with `slow.next = slow.next.next`.\n" +
            "5. Return `dummy.next`.\n\n" +
            "**J. Why correct.** After step 2 the gap is `n`. Moving in lockstep preserves that gap, so when `fast` is the last node, there are exactly `n` nodes from `slow.next` to the end \u2014 `slow.next` is the n-th from the end. The dummy handles head deletion uniformly.\n\n" +
            "**K/L. Complexity.** One pass \u2192 time `O(sz)`; two pointers \u2192 space `O(1)`.\n\n" +
            "**M. Interview mindset.** 'From the end' / 'k-th from the end' \u2192 two pointers with a fixed gap; add a dummy whenever the head might be deleted.",
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
            "**A. Asked.** Interleave the list front-to-back (first, last, second, second-last, ...) in place.\n\n" +
            "**B. Naive idea.** Dump all nodes into an array for `O(1)` indexing, then re-link with two indices moving inward. That works but costs `O(n)` extra space \u2014 the pointer method avoids it.\n\n" +
            "**D. Key insight \u2014 three sub-problems.** The target ordering is exactly the front half woven with the *reversed* back half. So: (1) find the middle, (2) reverse the second half, (3) merge the two halves alternately.\n\n" +
            "**E. Step 1 \u2014 find the middle (slow/fast).** Advance `slow` by 1 and `fast` by 2. When `fast` runs off the end, `slow` is at the middle. For even length this leaves the first half one node longer or equal \u2014 the split `slow.next` cleanly separates the halves.\n\n" +
            "**F. Step 2 \u2014 reverse the second half.** Standard `prev`/`curr` reversal: repeatedly point `curr.next` back to `prev`. The second half `... -> Ln-1 -> Ln` becomes `Ln -> Ln-1 -> ...`.\n\n" +
            "**G/H. Step 3 \u2014 interleave.** Two cursors `first` (front half) and `second` (reversed back half). Repeatedly splice one node from each: save the nexts, link `first -> second -> (next first)`, and advance. Because the second half was cut off, the front half never overruns.\n\n" +
            "**I. Step by step.**\n" +
            "1. Find middle with slow/fast.\n" +
            "2. `second = slow.next`; cut with `slow.next = None`; reverse `second`.\n" +
            "3. Merge `first = head` and `second`, alternating nodes until `second` is exhausted.\n\n" +
            "**J. Why correct.** The front half holds `L0..Lmid` in order; the reversed back half holds `Ln, Ln-1, ...`. Alternating them produces `L0, Ln, L1, Ln-1, ...` exactly. Cutting at the middle guarantees the two halves don't share nodes, so the weave terminates cleanly for both odd and even lengths.\n\n" +
            "**K/L. Complexity.** Each phase is linear and in place \u2192 time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** Recognize the answer as a *composition* of three staple operations (middle, reverse, merge); knowing each cold makes this Medium tractable.",
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
