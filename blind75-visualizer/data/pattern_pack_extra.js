/*
 * pattern_pack_extra.js — additional pattern-coverage problems.
 * Fills gaps across existing categories (fast/slow, binary-search peak, tree
 * path sum, LIS variant, interval DP, greedy, MST, trie autocomplete, bit).
 * Each block appends to its category via window.BLIND75.register(); schema
 * matches the other data/*.js files. ES5-safe, no build step.
 */
(function () {
  window.BLIND75.register("Binary Search", [
  {
    "id": "find-peak-element",
    "lc": 162,
    "title": "Find Peak Element",
    "difficulty": "Medium",
    "category": "Binary Search",
    "link": "https://leetcode.com/problems/find-peak-element/",
    "meta": {
      "pattern": "Binary Search on the Slope",
      "dataStructure": "Array",
      "technique": "Climb toward the higher neighbor"
    },
    "description": "A **peak element** is an element that is strictly greater than both of its neighbors. Given a 0-indexed integer array `nums`, find a peak element and return **its index**. If the array contains multiple peaks, return the index of **any** of them.\n\nYou may imagine that `nums[-1] = nums[n] = -infinity`, so the two ends count as bordered by negative infinity. This guarantees at least one peak always exists.\n\nAim for `O(log n)` time, which rules out a simple linear scan.",
    "constraints": [
      "`1 <= nums.length <= 1000`",
      "`-2^31 <= nums[i] <= 2^31 - 1`",
      "`nums[i] != nums[i + 1]` for all valid `i` (no two adjacent elements are equal)."
    ],
    "notes": [
      "Treat out-of-bounds neighbors as negative infinity; the first and last elements only need to beat their single real neighbor.",
      "Because adjacent elements are never equal, a strictly uphill step always leads toward a peak."
    ],
    "examples": [
      {
        "input": "nums = [1, 2, 3, 1]",
        "output": "2",
        "reasoning": "nums[2] = 3 is greater than its neighbors 2 and 1, so index 2 is a peak.",
        "visual": "```\n idx:  0  1  2  3\n val:  1  2  3  1\n             ^peak (3 > 2 and 3 > 1)\n```"
      },
      {
        "input": "nums = [1, 2, 1, 3, 5, 6, 4]",
        "output": "5",
        "reasoning": "Index 1 (value 2) and index 5 (value 6) are both peaks; returning either is accepted, here 5.",
        "visual": "```\n idx:  0  1  2  3  4  5  6\n val:  1  2  1  3  5  6  4\n          ^peak        ^peak\n```"
      },
      {
        "input": "nums = [1]",
        "output": "0",
        "reasoning": "A single element has both neighbors at -infinity, so it is trivially a peak."
      },
      {
        "input": "nums = [5, 4, 3, 2, 1]",
        "output": "0",
        "reasoning": "Strictly decreasing, so the first element beats its -infinity left neighbor and its smaller right neighbor; index 0 is a peak."
      }
    ],
    "approaches": [
      {
        "name": "Linear scan for an uphill-to-downhill turn",
        "time": "O(n)",
        "space": "O(1)",
        "whenToUse": "The most intuitive answer; reach for it first if the log-n constraint has not been stated.",
        "logic": "**What it asks.** Return the index of any element strictly greater than both neighbors, where the two ends are treated as bordered by negative infinity. At least one such peak is guaranteed to exist.\n\n**Why the naive idea fails.** Nothing here is incorrect; the approach is simply linear when the problem wants logarithmic. Checking every element against its neighbors is the obvious plan and it always finds a peak, but it touches up to `n` elements. The binary-search version below reaches a peak in `O(log n)` by never examining most of the array.\n\n**Key Idea.** Walk left to right and watch the slope between consecutive elements. As long as the array keeps rising, you have not yet peaked. The very first place where the next element is smaller than the current one marks a turn from uphill to downhill, and the current element at that turn is strictly greater than both the element before it (which was smaller, since we were rising) and the element after it (which is smaller, which is why we stopped). That element is a peak. If no such turn is ever found, the array rose all the way to the end, so the last element is a peak against its negative-infinity right border.\n\n**Step-by-Step Approach.**\n1. Scan `i` from `0` up to `n - 2`.\n2. At each `i`, compare `nums[i]` with `nums[i + 1]`; if `nums[i] > nums[i + 1]`, the slope just turned downward, so return `i`.\n3. If the loop completes without finding a downward step, the array was non-decreasing throughout, so return the last index `n - 1`.\n\n**Why it works.** The first index `i` with `nums[i] > nums[i + 1]` is a peak: everything up to `i` was strictly increasing (otherwise an earlier turn would have fired first), so `nums[i - 1] < nums[i]`, and `nums[i] > nums[i + 1]` by the test, making `nums[i]` strictly greater than both neighbors. If no downward step exists, every step went up, so `nums[n - 1]` beats `nums[n - 2]` and its negative-infinity right neighbor, making the last index a peak.\n\n**Common Gotchas.**\n- Stop the comparison loop at `n - 2` so `nums[i + 1]` never reads past the end of the array.\n- A single-element array must return `0`; the loop body never runs and the fallback return of `n - 1` handles it.\n- The problem guarantees no two adjacent elements are equal, so you never have to resolve a flat `nums[i] == nums[i + 1]` tie.\n\n**Complexity.** Time `O(n)`, a single linear scan in the worst case. Space `O(1)`, only an index.\n\n**Interview mindset.** Offer this as the clear baseline, then point out that because any uphill step must eventually reach a peak, you can discard half the array at a time and achieve `O(log n)` with binary search.",
        "rcs": "from typing import List  # List[int] is the input array of integers.\n\n\n# A peak is an element strictly greater than both neighbors, with nums[-1] = nums[n] = -infinity.\n# At least one peak always exists, and we may return the index of ANY peak.\n\nclass Solution:  # LeetCode creates an object of this class and calls findPeakElement on it.\n\n    def findPeakElement(self, nums: List[int]) -> int:  # Return the index of any peak element.\n\n        # ==================== PHASE 1: PREPARE TO SCAN FOR THE FIRST DOWNHILL STEP ====================\n\n        n = len(nums)  # Total number of elements; we compare each element with the one to its right.\n                       # State: n stays fixed; it bounds the scan and names the final fallback index.\n\n        # ==================== PHASE 2: WALK LEFT TO RIGHT WATCHING THE SLOPE ====================\n\n        for i in range(n - 1):  # Compare pairs (i, i+1); stop at n-1 exclusive so nums[i+1] never reads past the end.\n                                # Loop invariant: every element before i was part of a non-decreasing run (no earlier downhill step fired).\n\n            if nums[i] > nums[i + 1]:  # The slope just turned downward: the current element is higher than the next.\n                                       # Why this is a peak: everything up to i was rising, so nums[i-1] < nums[i], and nums[i] > nums[i+1] here,\n                                       # which makes nums[i] strictly greater than both neighbors.\n\n                return i  # Found the uphill-to-downhill turn; i is a peak, so hand its index back and stop.\n                          # Execution flow: return ends findPeakElement immediately; nothing below runs.\n\n        # ==================== PHASE 3: THE ARRAY ROSE ALL THE WAY TO THE END ====================\n\n        return n - 1  # No downhill step was found, so every step went up: the last element beats its -infinity right border.\n                      # Why safe: this also covers a single-element array, where the loop never ran and index 0 (= n-1) is the peak.",
        "plain": "class Solution:\n    def findPeakElement(self, nums: List[int]) -> int:\n        n = len(nums)\n        for i in range(n - 1):\n            if nums[i] > nums[i + 1]:\n                return i\n        return n - 1"
      },
      {
        "name": "Optimized — Binary Search on the Slope",
        "time": "O(log n)",
        "space": "O(1)",
        "whenToUse": "The expected answer: discard half the array each step by climbing toward the higher neighbor.",
        "logic": "**What it asks.** Return the index of any peak in `O(log n)` time, where a peak is strictly greater than both neighbors and the ends are bordered by negative infinity.\n\n**Why the naive idea fails.** The linear scan examines up to `n` elements. To hit `O(log n)` we must throw away half the search space at every step, which means deciding which half is guaranteed to contain a peak by looking at just one midpoint.\n\n**Key Idea.** Although the array is not sorted, binary search still applies because of a slope argument. Look at the midpoint `mid` and compare it with its right neighbor `mid + 1`. If `nums[mid] < nums[mid + 1]`, you are on an uphill slope, and walking uphill must eventually reach a peak (the array ends at a negative-infinity border, so it cannot rise forever); therefore a peak exists somewhere to the right of `mid`, and you can safely discard `mid` and everything left of it. Otherwise `nums[mid] > nums[mid + 1]` is a downhill step, and by the same reasoning a peak lies at `mid` or to its left, so you discard everything right of `mid`. Each comparison halves the range while always keeping a peak inside it.\n\n**Step-by-Step Approach.**\n1. Set `lo = 0` and `hi = n - 1` as an inclusive search window that always contains at least one peak.\n2. While `lo < hi`, compute `mid = (lo + hi) // 2` (which, since `lo < hi`, satisfies `mid < hi`, so `mid + 1` is in range).\n3. If `nums[mid] < nums[mid + 1]` you are climbing, so a peak is to the right: set `lo = mid + 1`.\n4. Otherwise you are descending (or at a local high), so a peak is at `mid` or left: set `hi = mid`.\n5. When `lo == hi` the window has collapsed to a single index, which must be a peak, so return `lo`.\n\n**Why it works.** The invariant is that the window `[lo, hi]` always contains a peak. Each step preserves it: an uphill `mid` guarantees a peak strictly to the right, so dropping the left half is safe; a downhill `mid` guarantees a peak at or left of `mid`, so dropping the right half is safe. The window strictly shrinks every iteration and never excludes all peaks, so when it narrows to one element that element must be the peak the invariant promised.\n\n**Common Gotchas.**\n- Use `hi = mid` (not `mid - 1`) on the downhill branch, because `mid` itself may be the peak and must stay in the window.\n- Use `lo = mid + 1` on the uphill branch, because `mid` is known not to be a peak (its right neighbor is larger), so excluding it is both safe and necessary for progress.\n- Loop while `lo < hi`, never `lo <= hi`, so the window collapses to exactly one index instead of looping forever.\n\n**Complexity.** Time `O(log n)`, since each iteration halves the window. Space `O(1)`, just two indices.\n\n**Interview mindset.** 'Find a peak' or 'any element bigger than its neighbors in log n' signals binary search on an unsorted array driven by the local slope. The trick to internalize is that monotonic movement toward the higher neighbor is always guaranteed to converge on a peak.",
        "rcs": "from typing import List  # List[int] is the input array of integers.\n\n\n# A peak is an element strictly greater than both neighbors, with nums[-1] = nums[n] = -infinity.\n# Binary search works on this UNSORTED array because climbing toward the higher neighbor must reach a peak.\n\nclass Solution:  # LeetCode creates an object of this class and calls findPeakElement on it.\n\n    def findPeakElement(self, nums: List[int]) -> int:  # Return the index of any peak in O(log n).\n\n        # ==================== PHASE 1: AN INCLUSIVE WINDOW THAT ALWAYS CONTAINS A PEAK ====================\n\n        lo = 0  # Left boundary of the search window (inclusive).\n                # Invariant: the window [lo, hi] always holds at least one peak.\n\n        hi = len(nums) - 1  # Right boundary of the search window (inclusive).\n                            # State: lo and hi close in on each other, each step halving the window.\n                            # Execution flow: Python continues to the binary-search loop below.\n\n        # ==================== PHASE 2: HALVE THE WINDOW BY FOLLOWING THE SLOPE ====================\n\n        while lo < hi:  # Stop when the window collapses to a single index; strict < guarantees termination.\n                        # Loop invariant: a peak is always inside [lo, hi], and the window shrinks every iteration.\n\n            mid = (lo + hi) // 2  # Midpoint; since lo < hi we have mid < hi, so mid + 1 is always a valid index.\n                                  # State: mid is the element whose slope we inspect to decide which half to keep.\n\n            if nums[mid] < nums[mid + 1]:  # Uphill step: the element to the right is larger.\n                                           # Why go right: an uphill run must eventually peak before the -infinity border,\n                                           # so a peak is guaranteed strictly to the right of mid.\n\n                lo = mid + 1  # Discard mid and everything left of it; mid itself cannot be a peak (its right neighbor is larger).\n                              # State change: the window shrinks to [mid + 1, hi], still containing a peak.\n\n            else:  # Downhill step (nums[mid] > nums[mid + 1]); adjacent values are never equal, so this is strict.\n                   # Why go left: a downhill run means a peak lies at mid or somewhere to its left.\n\n                hi = mid  # Keep mid in the window (it might BE the peak) and discard everything right of it.\n                          # State change: the window shrinks to [lo, mid], still containing a peak.\n                          # Execution flow: end of iteration; Python re-tests lo < hi.\n\n        # ==================== PHASE 3: THE WINDOW COLLAPSED ONTO THE PEAK ====================\n\n        return lo  # lo == hi now, and the invariant promised a peak inside the window, so this single index is a peak.\n                   # Execution flow: return ends findPeakElement and hands the peak index to the caller.",
        "plain": "class Solution:\n    def findPeakElement(self, nums: List[int]) -> int:\n        lo = 0\n        hi = len(nums) - 1\n        while lo < hi:\n            mid = (lo + hi) // 2\n            if nums[mid] < nums[mid + 1]:\n                lo = mid + 1\n            else:\n                hi = mid\n        return lo"
      }
    ],
    "patternRecognition": [
      "'Find any element greater than its neighbors in O(log n)' → binary search on the local slope.",
      "Binary search on an UNSORTED array is possible when a comparison guarantees a peak in one half.",
      "'Climb toward the higher neighbor' converges on a peak because the ends are -infinity."
    ],
    "interviewRecall": [
      "Compare `nums[mid]` with `nums[mid + 1]`: uphill → go right (`lo = mid + 1`), else go left (`hi = mid`).",
      "Use `hi = mid` not `mid - 1`, since mid itself may be the peak; loop while `lo < hi`.",
      "The -infinity borders guarantee a peak always exists, so the window never empties."
    ]
  }
    ]);

  window.BLIND75.register("Linked List", [
  {
    "id": "middle-of-the-linked-list",
    "lc": 876,
    "title": "Middle of the Linked List",
    "difficulty": "Easy",
    "category": "Linked List",
    "link": "https://leetcode.com/problems/middle-of-the-linked-list/",
    "meta": {
      "pattern": "Fast & Slow Pointers",
      "dataStructure": "Linked List",
      "technique": "Two-speed traversal"
    },
    "description": "Given the `head` of a singly linked list, return the **middle node** of the list.\n\nIf the list has an **even** number of nodes, there are two middle nodes, and you must return the **second** of the two. For example, for `[1, 2, 3, 4]` the two middles are `2` and `3`, and you return `3`.\n\nYou are handed only `head`; the length is not given, so you must either measure it or sense the middle as you walk.\n\n**Odd length — the middle is node 3:**\n\n```linkedlist\n1 -> 2 -> 3 -> 4 -> 5 -> None\n```\n\n**Even length — return the second middle, node 4:**\n\n```linkedlist\n1 -> 2 -> 3 -> 4 -> 5 -> 6 -> None\n```",
    "constraints": [
      "The number of nodes is in the range `[1, 100]`.",
      "`1 <= Node.val <= 100`",
      "The list is non-empty (at least one node)."
    ],
    "notes": [
      "For an even-length list, return the SECOND middle node, not the first.",
      "Try to do it in a single pass without first counting the length."
    ],
    "examples": [
      {
        "input": "head = [1, 2, 3, 4, 5]",
        "output": "[3, 4, 5]",
        "reasoning": "Odd length of 5; the single middle is the 3rd node (value 3), and the returned node carries the rest of the list with it.",
        "visual": "```\n 1 -> 2 -> 3 -> 4 -> 5\n           ^middle (index 2)\n```"
      },
      {
        "input": "head = [1, 2, 3, 4, 5, 6]",
        "output": "[4, 5, 6]",
        "reasoning": "Even length of 6; the two middles are 3 and 4, and we return the SECOND one (value 4).",
        "visual": "```\n 1 -> 2 -> 3 -> 4 -> 5 -> 6\n                ^second middle (index 3)\n```"
      },
      {
        "input": "head = [1]",
        "output": "[1]",
        "reasoning": "A single node is its own middle."
      },
      {
        "input": "head = [1, 2]",
        "output": "[2]",
        "reasoning": "Even length of 2; the middles are 1 and 2, and the second one (value 2) is returned."
      }
    ],
    "approaches": [
      {
        "name": "Count the length, then re-walk to the middle",
        "time": "O(n)",
        "space": "O(1)",
        "whenToUse": "The most direct answer; reach for it first when you want an obviously correct two-pass solution.",
        "logic": "**Odd length returns the middle (node 3); even length returns the second middle (node 4):**\n\n```linkedlist\n1 -> 2 -> 3 -> 4 -> 5 -> None\n```\n\n```linkedlist\n1 -> 2 -> 3 -> 4 -> 5 -> 6 -> None\n```\n\n**What it asks.** Return the middle node of the list, and for an even length return the second of the two middles. You are given only `head`, so the middle's position is not known up front and must be computed.\n\n**Why the naive idea fails.** There is nothing logically wrong with this approach; it simply walks the list twice instead of once. You cannot jump to the middle of a singly linked list because there is no random access, so the plain plan is to first discover how many nodes there are, then walk forward to the middle index. That is correct, but the fast/slow version below reaches the same node in a single pass.\n\n**Key Idea.** If the list has `length` nodes, the middle you want is at index `length // 2` counting from zero. For an odd length that integer division lands on the true center, and for an even length it lands on the second of the two centers, which is exactly the node the problem asks for. So measure the length in one scan, then step `length // 2` times from the head to arrive there.\n\n**Step-by-Step Approach.**\n1. Walk the whole list once with a counter to find `length`, the total number of nodes.\n2. Compute the target index as `length // 2` (integer division), which gives the center for odd lengths and the second center for even lengths.\n3. Reset a pointer `curr` to `head` and advance it `length // 2` times.\n4. Return `curr`, which now sits on the middle node and drags the rest of the list behind it.\n\n**Why it works.** After the first pass `length` is exact. Advancing from the head exactly `length // 2` times lands on index `length // 2` by definition. For odd `length = 2k + 1` that index is `k`, the unique middle; for even `length = 2k` that index is `k`, the second of the two middles at indices `k - 1` and `k`. Both cases match the required behavior.\n\n**Common Gotchas.**\n- Use integer division `//`, not float division; `length / 2` yields a float that cannot index steps cleanly and picks the wrong node.\n- `length // 2` deliberately selects the SECOND middle on even lengths; do not subtract one trying to 'center' it.\n- A single node has `length = 1` and `1 // 2 = 0`, so zero steps correctly return the head.\n\n**Complexity.** Time `O(n)`, two linear passes which is still linear overall. Space `O(1)`, only a counter and a pointer.\n\n**Interview mindset.** State this first to show a bulletproof baseline, then note that the two passes can be collapsed into one with fast and slow pointers, which is the answer the interviewer is really listening for.",
        "rcs": "from typing import Optional  # Optional[ListNode] means the parameter is either a ListNode or None (an empty list).\n\n\n# ListNode is the singly-linked-list node LeetCode provides: it has .val (the payload)\n# and .next (a pointer to the next node, or None at the tail). We only READ .next here; nothing is rewired.\n\nclass Solution:  # LeetCode creates an object of this class and calls middleNode on it.\n\n    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:  # Return the middle node (second middle if even length).\n\n        # ==================== PHASE 1: FIRST PASS — MEASURE THE LENGTH ====================\n\n        length = 0  # Running count of how many nodes the list has; starts at zero before we see any node.\n                    # State: length will equal the exact node count once the first walk finishes.\n\n        curr = head  # Cursor that walks the chain from the front, one node at a time.\n                     # State: curr always points at the node we are currently counting.\n                     # Execution flow: Python continues to the counting loop below.\n\n        while curr:  # Keep going while curr is a real node; a None curr means we reached the tail.\n                     # Loop invariant: length equals the number of nodes strictly before curr.\n\n            length += 1  # Count the node under curr.\n                         # State change: length grows by one for each node visited.\n\n            curr = curr.next  # Step forward one link toward the tail.\n                              # State change: curr advances, or becomes None at the end.\n                              # Execution flow: end of iteration; Python re-tests the while header.\n\n        # ==================== PHASE 2: SECOND PASS — WALK TO INDEX length // 2 ====================\n\n        curr = head  # Reset the cursor to the front so we can step toward the middle.\n                     # Why reset: the first pass left curr at None; we need to start over from head.\n\n        for _ in range(length // 2):  # Take exactly length // 2 steps.\n                                      # Why length // 2: that index is the center for odd lengths and the SECOND center for even lengths,\n                                      # which is precisely the node the problem asks us to return.\n\n            curr = curr.next  # Advance one node per step toward the middle.\n                              # State change: after the loop, curr sits on index length // 2.\n\n        # ==================== PHASE 3: RETURN THE MIDDLE NODE ====================\n\n        return curr  # curr now points at the middle node, which carries the rest of the list with it.\n                     # Execution flow: return ends middleNode and hands the middle node to the caller.",
        "plain": "class Solution:\n    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        length = 0\n        curr = head\n        while curr:\n            length += 1\n            curr = curr.next\n        curr = head\n        for _ in range(length // 2):\n            curr = curr.next\n        return curr"
      },
      {
        "name": "Optimized — Fast & Slow Pointers (one pass)",
        "time": "O(n)",
        "space": "O(1)",
        "whenToUse": "The expected answer: find the middle in a single scan without measuring the length.",
        "logic": "**What it asks.** Return the middle node in a single pass, and for an even length return the second of the two middles, without first counting how many nodes there are.\n\n**Why the naive idea fails.** Counting the length and re-walking is correct but makes two passes. To do it in one pass we need a way to sense the middle while moving, rather than deriving an index from a length we measured separately.\n\n**Key Idea.** Run two pointers at different speeds from the head. A `slow` pointer hops one node at a time and a `fast` pointer hops two. Because `fast` covers twice the ground, by the time it runs off the end `slow` has covered exactly half, so `slow` lands on the middle. The precise stopping rule is what controls which middle you get on even lengths: guarding the loop with `while fast and fast.next` lets the fast pointer take one extra pair of steps on even-length lists, pushing `slow` onto the SECOND middle, which is exactly what this problem wants.\n\n**Step-by-Step Approach.**\n1. Start both `slow` and `fast` at `head`.\n2. Loop while `fast` and `fast.next` are both non-null, so the double hop `fast.next.next` is always safe.\n3. Each iteration, move `slow` forward one node and `fast` forward two nodes.\n4. When the loop ends, `fast` has reached the end and `slow` is resting on the middle node.\n5. Return `slow`.\n\n**Why it works.** Maintain the relationship that `slow` has taken half as many steps as `fast`. For an odd length `2k + 1`, `fast` stops when it lands on the final node (its `next` is null) after `k` iterations, leaving `slow` on index `k`, the unique middle. For an even length `2k`, `fast` becomes null after `k` iterations, leaving `slow` on index `k`, the second of the two middles at indices `k - 1` and `k`. The single guard handles both parities and selects the required middle automatically.\n\n**Common Gotchas.**\n- The guard must be `while fast and fast.next`; check `fast` first so Python short-circuits before evaluating `fast.next` and never dereferences null.\n- This exact guard is what yields the SECOND middle on even lengths; stopping on a looser condition would return the first middle instead.\n- Start both pointers at `head`, not at a dummy, since this problem wants the middle of the real list and the list is guaranteed non-empty.\n\n**Complexity.** Time `O(n)`, a single pass where `fast` traverses the list once. Space `O(1)`, just the two pointers.\n\n**Interview mindset.** 'Find the middle of a linked list in one pass' is the canonical cue for fast and slow pointers. The same two-speed idea also detects cycles and finds the n-th node from the end, so recognizing it pays off across many list problems.",
        "rcs": "from typing import Optional  # Optional[ListNode] means the parameter is either a ListNode or None (an empty list).\n\n\n# ListNode is the singly-linked-list node LeetCode provides: it has .val (the payload)\n# and .next (a pointer to the next node, or None at the tail). We only READ .next here; nothing is rewired.\n\nclass Solution:  # LeetCode creates an object of this class and calls middleNode on it.\n\n    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:  # One pass; returns the SECOND middle on even lengths.\n\n        # ==================== PHASE 1: PLACE BOTH POINTERS ON THE HEAD ====================\n\n        slow = head  # Slow pointer: advances exactly ONE node per iteration.\n                     # State: slow ends up on the middle, having taken half as many steps as fast.\n\n        fast = head  # Fast pointer: advances TWO nodes per iteration.\n                     # Why two speeds: fast covers twice the ground, so when it reaches the end slow has covered exactly half.\n                     # State: both start on the head; the loop guard decides which middle slow lands on.\n                     # Execution flow: Python continues to the while loop below.\n\n        # ==================== PHASE 2: WALK; fast AT DOUBLE SPEED, slow AT SINGLE ====================\n\n        while fast and fast.next:  # Need BOTH fast and fast.next to exist so the double hop fast.next.next is safe.\n                                   # Why this exact guard: it lets fast take an extra pair of steps on EVEN lengths, which pushes\n                                   # slow onto the SECOND middle — precisely the node this problem requires.\n                                   # Loop invariant: slow has taken exactly half as many steps as fast.\n\n            slow = slow.next  # Slow steps forward one node.\n                              # State change: slow moves +1 toward the middle.\n\n            fast = fast.next.next  # Fast steps forward two nodes.\n                                   # Why safe: the loop guard just confirmed fast and fast.next are non-None.\n                                   # State change: fast moves +2; when it falls off the end, slow is sitting on the middle.\n                                   # Execution flow: end of iteration; Python re-tests the while header.\n\n        # ==================== PHASE 3: RETURN THE MIDDLE ====================\n\n        return slow  # fast has reached the end, so slow rests on the middle node and carries the rest of the list with it.\n                     # Execution flow: return ends middleNode and hands the middle node to the caller.",
        "plain": "class Solution:\n    def middleNode(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        slow = head\n        fast = head\n        while fast and fast.next:\n            slow = slow.next\n            fast = fast.next.next\n        return slow"
      }
    ],
    "patternRecognition": [
      "'Find the middle of a linked list' → fast & slow pointers at double and single speed.",
      "Need a single pass without knowing the length → two pointers moving at different rates.",
      "Even-length 'return the second middle' is controlled by the `while fast and fast.next` guard."
    ],
    "interviewRecall": [
      "Guard with `while fast and fast.next` to safely do `fast.next.next` and land slow on the second middle.",
      "slow ends on index `length // 2`, the center for odd and the second center for even lengths.",
      "Both pointers start at `head`; when fast runs off the end, slow is the answer."
    ]
  }
    ]);

  window.BLIND75.register("Trees", [
  {
    "id": "path-sum",
    "lc": 112,
    "title": "Path Sum",
    "difficulty": "Easy",
    "category": "Trees",
    "link": "https://leetcode.com/problems/path-sum/",
    "meta": {
      "pattern": "Tree DFS",
      "dataStructure": "Binary Tree",
      "technique": "Subtract-on-descent with leaf check"
    },
    "description": "Given the `root` of a binary tree and an integer `targetSum`, determine whether the tree has a **root-to-leaf** path such that adding up all the values along the path equals `targetSum`.\n\nA **leaf** is a node with no children (both `left` and `right` are null). The path must start at the root and end at a leaf — stopping partway down does not count, even if the running sum happens to match.\n\nReturn `true` if such a path exists, otherwise `false`. An empty tree (`root` is null) contains no path and therefore returns `false`.",
    "constraints": [
      "The number of nodes is in the range `[0, 5000]`.",
      "`-1000 <= Node.val <= 1000`",
      "`-1000 <= targetSum <= 1000`"
    ],
    "notes": [
      "Node values may be negative, so you cannot prune a branch just because the running sum already exceeds the target.",
      "The match must occur exactly at a leaf; a partial path that sums to the target does not qualify."
    ],
    "examples": [
      {
        "input": "root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22",
        "output": "true",
        "reasoning": "The path 5 -> 4 -> 11 -> 2 sums to 22 and ends at the leaf 2.",
        "visual": "```\n        5\n       / \\\n      4   8\n     /   / \\\n    11  13  4\n   /  \\       \\\n  7    2       1\n  path: 5 -> 4 -> 11 -> 2 = 22\n```"
      },
      {
        "input": "root = [1,2,3], targetSum = 5",
        "output": "false",
        "reasoning": "The two root-to-leaf paths sum to 1+2=3 and 1+3=4; neither equals 5.",
        "visual": "```\n    1\n   / \\\n  2   3\n  (1+2=3, 1+3=4)\n```"
      },
      {
        "input": "root = [], targetSum = 0",
        "output": "false",
        "reasoning": "An empty tree has no root-to-leaf path, so the answer is false even when targetSum is 0."
      },
      {
        "input": "root = [1,2], targetSum = 1",
        "output": "false",
        "reasoning": "The only leaf is 2, reached via 1 -> 2 = 3. The root 1 alone is not a leaf, so a sum of 1 does not count."
      }
    ],
    "approaches": [
      {
        "name": "Recursive DFS (subtract on the way down)",
        "time": "O(n)",
        "space": "O(h)",
        "whenToUse": "The clean, canonical answer: a few lines of recursion that mirror the definition directly.",
        "logic": "**What it asks.** Decide whether some path that starts at the root and ends at a leaf has values adding up to exactly `targetSum`. The endpoints are fixed — root at the top, a leaf at the bottom — so a correct answer must verify the sum precisely when it lands on a node with no children.\n\n**Why the naive idea fails.** There is nothing logically wrong with recursion here; the trap is the leaf test. A common slip is to return `true` the moment the running sum hits the target at any node, but the target must be met *at a leaf*, not partway down. Another is to treat `root is None` as a success when the remaining sum is zero, which wrongly reports a path through a missing child of a one-sided node. Both are fixed by checking for a genuine leaf explicitly.\n\n**Key Idea.** Instead of carrying the accumulated sum downward, subtract each node's value from the target as you descend. Then the question at every node becomes the same smaller question on its children: 'does a child subtree contain a root-to-leaf path summing to the *reduced* target?' When you reach a leaf, the path is valid exactly when the remaining target equals that leaf's value, i.e. the subtraction has consumed the whole sum precisely at the bottom.\n\n**Step-by-Step Approach.**\n1. If `root` is null, there is no path, so return `false`.\n2. If `root` is a leaf (no `left` and no `right`), return whether `targetSum` equals `root.val` — the path ends here and must match exactly.\n3. Otherwise recurse into the children with the reduced target `targetSum - root.val`.\n4. Return `true` if *either* child subtree reports a valid path; a single qualifying path anywhere is enough.\n\n**Why it works.** Each recursive call answers 'is there a root-to-leaf path in this subtree summing to the current target?' The subtraction keeps the remaining target in sync with how much of the sum is still unaccounted for, so by the time you reach a leaf the test `targetSum == root.val` is equivalent to the full original path matching. Combining the children with `or` means the whole tree reports success iff any single path does.\n\n**Common Gotchas.**\n- Test for a real leaf (`not root.left and not root.right`); do not accept a match at an internal node or at a null child.\n- Handle the empty tree first — returning `false` for `root is None` also makes the recursion into a missing child safe.\n- Values can be negative, so never prune a branch early assuming the sum can only grow; you must walk to the leaves.\n\n**Complexity.** Time `O(n)`, since each node is visited at most once. Space `O(h)` for the recursion stack, where `h` is the tree height — `O(log n)` if balanced, `O(n)` in the worst case of a skewed tree.\n\n**Interview mindset.** 'Is there a root-to-leaf path with property X?' is the signal for top-down DFS that threads a running quantity down and checks the condition at the leaf. Say the leaf check out loud — it is the single detail interviewers watch for here.",
        "rcs": "from typing import Optional  # Optional[TreeNode] means the parameter is either a TreeNode or None (an empty tree / missing child).\n\n\n# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload), .left and .right\n# (pointers to the child subtrees, each a TreeNode or None). We only READ the tree here; nothing is modified.\n\nclass Solution:  # LeetCode creates an object of this class and calls hasPathSum on it.\n\n    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:  # True iff a root-to-leaf path sums to targetSum.\n\n        # ==================== PHASE 1: THE EMPTY-SUBTREE BASE CASE ====================\n\n        if not root:  # No node here: an empty tree (or a missing child of a one-sided node) holds no root-to-leaf path.\n                      # Why first: this guard makes the recursive calls into None children below safe to write unconditionally.\n\n            return False  # Nothing to match against, so this branch contributes no valid path.\n                          # Execution flow: return ends this call; the caller's `or` folds this False in.\n\n        # ==================== PHASE 2: THE LEAF CHECK — WHERE A PATH IS ALLOWED TO END ====================\n\n        if not root.left and not root.right:  # A leaf: no children, so a root-to-leaf path must TERMINATE at this node.\n                                              # Why this exact test: the target must be met at a leaf, not partway down an internal node.\n\n            return targetSum == root.val  # Valid iff the sum still owed equals this leaf's value, i.e. the whole path summed exactly.\n                                          # State: targetSum here is the original target minus every ancestor value already subtracted.\n                                          # Execution flow: return ends this call with the leaf's verdict.\n\n        # ==================== PHASE 3: DESCEND, SHRINKING THE TARGET BY THIS NODE'S VALUE ====================\n\n        remaining = targetSum - root.val  # Subtract the current node so each child answers the same question with a smaller target.\n                                          # Why subtract: it keeps `remaining` equal to how much sum is still unaccounted for below here.\n\n        # Recurse into BOTH children; a single qualifying path anywhere is enough, so combine with `or`.\n        # Short-circuiting: if the left subtree already found a path, Python skips the right call entirely.\n        return (self.hasPathSum(root.left, remaining)  # Does the left subtree hold a root-to-leaf path summing to `remaining`?\n                or self.hasPathSum(root.right, remaining))  # ...or the right subtree? Either success makes this node a success.\n                                                            # Execution flow: this value bubbles up as this node's answer.",
        "plain": "class Solution:\n    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:\n        if not root:\n            return False\n        if not root.left and not root.right:\n            return targetSum == root.val\n        remaining = targetSum - root.val\n        return (self.hasPathSum(root.left, remaining)\n                or self.hasPathSum(root.right, remaining))"
      },
      {
        "name": "Iterative DFS with an explicit stack",
        "time": "O(n)",
        "space": "O(h)",
        "whenToUse": "When you want to avoid recursion (e.g. to dodge a deep-tree stack-overflow risk) or the interviewer asks for an iterative version.",
        "logic": "**What it asks.** The same question — does a root-to-leaf path sum to `targetSum`? — but solved without recursion, managing the traversal state yourself on an explicit stack.\n\n**Why the naive idea fails.** Converting to iteration tempts you to push only nodes and track the running sum in a single shared variable, but a tree has many branches, so one shared accumulator gets corrupted the moment you backtrack to a sibling. The sum belonging to each node's path must travel *with* that node, not in a global.\n\n**Key Idea.** Push pairs of `(node, remaining)` onto the stack, where `remaining` is the target still owed when that node's path is extended to it. Each pair carries its own path's bookkeeping, so popping and pushing in any order stays correct. When you pop a leaf whose `remaining` equals its value, you have found a complete matching path.\n\n**Step-by-Step Approach.**\n1. If `root` is null, return `false`.\n2. Initialize a stack with the single pair `(root, targetSum)`.\n3. Pop a `(node, remaining)` pair. If `node` is a leaf and `remaining == node.val`, return `true`.\n4. Otherwise, for each existing child, push `(child, remaining - node.val)` so the child inherits the correctly reduced target.\n5. If the stack empties without a match, return `false`.\n\n**Why it works.** The invariant is that every pair on the stack pairs a node with the exact remaining target for the path from the root to that node. A leaf satisfying `remaining == node.val` is therefore a root-to-leaf path summing to the original target. Because each pair is self-contained, the order of exploration (DFS via a stack) never contaminates another branch's sum.\n\n**Common Gotchas.**\n- Store the remaining sum *per node* in the stack entry; a single shared running total breaks across branches.\n- Still apply the leaf test — matching at an internal node is wrong even if the arithmetic lines up.\n- Only push children that exist; pushing `None` and then dereferencing it later causes an error.\n\n**Complexity.** Time `O(n)`, each node pushed and popped once. Space `O(h)` for the stack in the worst case — the same order as the recursion it replaces.\n\n**Interview mindset.** When asked to 'do it without recursion,' reach for an explicit stack and bundle whatever the recursion passed as arguments (here, the remaining sum) into the stack entries. That pairing trick generalizes to most tree-path problems.",
        "rcs": "from typing import Optional  # Optional[TreeNode] means root is either a TreeNode or None (an empty tree).\n\n\n# TreeNode is the binary-tree node LeetCode provides: it has .val (the payload), .left and .right\n# (child subtrees, each a TreeNode or None). We only READ the tree here; nothing is modified.\n\nclass Solution:  # LeetCode creates an object of this class and calls hasPathSum on it.\n\n    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:  # Iterative DFS version, same contract.\n\n        # ==================== PHASE 1: HANDLE THE EMPTY TREE UP FRONT ====================\n\n        if not root:  # No root means no root-to-leaf path can exist.\n            return False  # Nothing to search; return immediately.\n\n        # ==================== PHASE 2: SEED THE STACK WITH (node, remaining) PAIRS ====================\n\n        stack = [(root, targetSum)]  # Each entry bundles a node with the target STILL OWED at the path reaching that node.\n                                     # Why bundle: a tree branches, so the per-path sum must travel with its node, not in one shared variable.\n                                     # State: the stack holds the frontier of nodes still to explore, each with its own remaining target.\n\n        # ==================== PHASE 3: POP, CHECK FOR A MATCHING LEAF, PUSH CHILDREN ====================\n\n        while stack:  # Keep exploring while any node remains on the frontier.\n                      # Loop invariant: every (node, remaining) on the stack pairs a node with the exact sum owed on its root-to-node path.\n\n            node, remaining = stack.pop()  # Take the most recently added pair (LIFO), giving depth-first order.\n                                           # State change: the stack shrinks by one; `node` is the node we now examine.\n\n            if not node.left and not node.right and remaining == node.val:  # A leaf whose owed sum equals its value...\n                                                                           # ...means the whole root-to-leaf path summed exactly to the target.\n\n                return True  # Found a qualifying path; hand True back and stop.\n                             # Execution flow: return ends hasPathSum immediately; nothing below runs.\n\n            if node.left:  # Only push a child that actually exists, or we would later dereference None.\n                stack.append((node.left, remaining - node.val))  # The child inherits the target reduced by THIS node's value.\n                                                                 # State change: left child joins the frontier with its own remaining sum.\n\n            if node.right:  # Same for the right child.\n                stack.append((node.right, remaining - node.val))  # Reduced target carried along for the right branch too.\n                                                                  # Execution flow: end of iteration; Python re-tests the while header.\n\n        # ==================== PHASE 4: NO PATH MATCHED ====================\n\n        return False  # The stack emptied without finding a matching leaf, so no root-to-leaf path sums to targetSum.",
        "plain": "class Solution:\n    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:\n        if not root:\n            return False\n        stack = [(root, targetSum)]\n        while stack:\n            node, remaining = stack.pop()\n            if not node.left and not node.right and remaining == node.val:\n                return True\n            if node.left:\n                stack.append((node.left, remaining - node.val))\n            if node.right:\n                stack.append((node.right, remaining - node.val))\n        return False"
      }
    ],
    "patternRecognition": [
      "'Root-to-leaf path with a target property' → top-down DFS carrying a running value.",
      "Subtracting the target on the way down is cleaner than accumulating and comparing at the leaf.",
      "The condition must be verified at a leaf, not at any internal node."
    ],
    "interviewRecall": [
      "Base case `root is None` returns False and makes recursion into missing children safe.",
      "Leaf test is `not root.left and not root.right`; match there with `targetSum == root.val`.",
      "For the iterative version, push `(node, remaining)` pairs so each path keeps its own sum."
    ]
  }
    ]);

  window.BLIND75.register("Tries", [
  {
    "id": "autocomplete-system",
    "lc": 642,
    "title": "Design Autocomplete / Search Autocomplete System",
    "difficulty": "Hard",
    "category": "Tries",
    "link": "https://leetcode.com/problems/design-search-autocomplete-system/",
    "meta": {
      "pattern": "Trie + Ranked Prefix Search",
      "dataStructure": "Trie (Prefix Tree) + Hash Map",
      "technique": "Prefix collect, sort by hotness"
    },
    "description": "Design a search autocomplete system. The constructor receives historical `sentences` and their `times` (how many times each was previously typed). The user then types characters one at a time through `input(c)`.\n\nWhile typing, `input(c)` returns the **top 3** historical sentences that start with the characters typed so far (the current prefix), ranked by **hotness**: higher frequency first, and ties broken by **lexicographically smaller** sentence. Fewer than 3 are returned if fewer match.\n\nThe special character `'#'` marks the **end** of a sentence: it saves the currently typed sentence into history (incrementing its count), resets the current prefix to empty, and returns an empty list. Characters are lowercase letters, spaces, or `'#'`.",
    "constraints": [
      "`1 <= sentences.length == times.length <= 100`, and `1 <= sentences[i].length <= 100`.",
      "Each sentence consists of lowercase English letters and spaces only; it contains at most 100 characters.",
      "`1 <= times[i] <= 50`, and up to `5000` calls to `input` may be made in total.",
      "Each `input(c)` is a lowercase letter, a space, or `'#'`."
    ],
    "notes": [
      "Ranking is (frequency descending, then sentence ascending); the space character sorts before lowercase letters in ASCII, which matters for tie-breaking.",
      "On `'#'`, commit the accumulated prefix as a sentence (count += 1), clear the prefix buffer, and return an empty list."
    ],
    "examples": [
      {
        "input": "AutocompleteSystem([\"i love you\", \"island\", \"iroman\", \"i love leetcode\"], [5, 3, 2, 2])\ninput('i')",
        "output": "[\"i love you\", \"island\", \"i love leetcode\"]",
        "reasoning": "Prefix 'i' matches all four. By hotness: 'i love you' (5), 'island' (3), then tie at 2 between 'i love leetcode' and 'iroman' → 'i love leetcode' is lexicographically smaller (space < 'r'). Top 3 returned.",
        "visual": "```\nprefix 'i' matches:\n  i love you      5\n  island          3\n  i love leetcode 2  (' ' < 'r' breaks tie)\n  iroman          2\ntop 3 -> first three above\n```"
      },
      {
        "input": "input(' ')",
        "output": "[\"i love you\", \"i love leetcode\"]",
        "reasoning": "Prefix is now 'i '. Only the two 'i love ...' sentences match; ranked by frequency 5 then 2.",
        "visual": "```\nprefix 'i ' matches:\n  i love you      5\n  i love leetcode 2\n```"
      },
      {
        "input": "input('a')",
        "output": "[]",
        "reasoning": "Prefix 'i a' matches no historical sentence, so nothing is returned.",
        "visual": "```\nprefix 'i a' -> no matches -> []\n```"
      },
      {
        "input": "input('#')",
        "output": "[]",
        "reasoning": "'#' saves 'i a' into history with count 1, resets the current prefix to empty, and returns []. A later 'i a' prefix would now surface it.",
        "visual": "```\n'#': save 'i a' (count 1), reset prefix -> []\n```"
      }
    ],
    "approaches": [
      {
        "name": "Hash Map of Counts — Collect Then Sort",
        "time": "O(S) per input (scan all sentences)",
        "space": "O(S) for the count map",
        "whenToUse": "The most direct correct answer; fine for the small constraints, and a clear baseline before the trie.",
        "logic": "**What it asks.** Maintain typed-sentence history with frequencies and, as each character is typed, return the three hottest historical sentences that begin with everything typed so far, resetting on `'#'`.\n\n**Why the naive idea fails.** Nothing is logically wrong with simply storing every sentence's count in a hash map and, on each keystroke, scanning all stored sentences for those that start with the current prefix. It is correct. The weakness is that every single `input` call rescans the entire history and does a full startswith test on each sentence, which is `O(S)` work per keystroke where `S` is the total length of all stored sentences. For the given limits that is perfectly acceptable, but it does not scale, and it motivates the trie that narrows the search to only the matching subtree.\n\n**Key Idea.** Keep a `counts` dictionary mapping each committed sentence to how many times it has been typed, plus a growing `prefix` buffer. On a normal character, append it to the buffer, filter the dictionary keys to those starting with the buffer, and pick the three best by the ranking `(-count, sentence)`. On `'#'`, increment the buffer's count in the dictionary, clear the buffer, and return nothing.\n\n**Step-by-Step Approach.**\n1. In the constructor, build `counts` from `sentences` and `times`, and set `prefix = \"\"`.\n2. On `input(c)` where `c == '#'`: do `counts[prefix] += 1`, reset `prefix = \"\"`, and return `[]`.\n3. Otherwise append `c` to `prefix`, then collect every sentence in `counts` that `startswith(prefix)`.\n4. Sort the matches by `(-count, sentence)` so higher frequency comes first and ties break lexicographically, and return the first three.\n\n**Why it works.** The dictionary holds the exact frequency of every historical sentence, so the ranking is always computed on current data. `startswith` precisely selects the sentences that match the prefix typed so far, and the `(-count, sentence)` sort key encodes the required hotness ordering exactly. The `'#'` branch implements the save-and-reset contract.\n\n**Common Gotchas.**\n- The tie-break is lexicographic on the raw string, and a space (ASCII 32) sorts before any lowercase letter — do not uppercase or strip.\n- Use `counts.get(prefix, 0) + 1` style updates so a brand-new sentence is saved with count 1 on `'#'`.\n- Reset the `prefix` buffer to empty on `'#'`, and return `[]` from that branch, not the matches.\n\n**Complexity.** Time `O(S)` per `input`, scanning all stored sentence characters. Space `O(S)` for the count map.\n\n**Interview mindset.** State this as the obvious baseline, then say 'to avoid rescanning every sentence on each keystroke I'd put the history in a trie and walk to the prefix node once,' which is the optimization below.",
        "rcs": "from typing import List  # sentences is a list of historical strings; times[i] is how often sentences[i] was typed.\n\n\n# Baseline design: store each sentence's frequency in a dict, and on every keystroke filter + sort the keys.\n# Correct and simple; the cost is that each input() rescans the whole history.\n\nclass AutocompleteSystem:  # LeetCode constructs this once, then calls input() repeatedly.\n\n    def __init__(self, sentences: List[str], times: List[int]):  # Seed history with sentences and their counts.\n\n        # ==================== PHASE 1: BUILD THE FREQUENCY MAP AND EMPTY PREFIX BUFFER ====================\n\n        self.counts = {}  # Maps each historical sentence -> number of times it has been typed.\n                          # State: this dict is the single source of truth for ranking.\n\n        for sentence, time in zip(sentences, times):  # Pair each sentence with its historical count.\n            self.counts[sentence] = self.counts.get(sentence, 0) + time  # Accumulate (handles accidental duplicates safely).\n\n        self.prefix = \"\"  # The characters typed since the last '#'; grows one char per input() until reset.\n                          # State: starts empty; '#' clears it back to empty.\n\n    # ==================== PHASE 2: HANDLE ONE TYPED CHARACTER ====================\n\n    def input(self, c: str) -> List[str]:  # Return the top-3 matches for the running prefix (or [] on '#').\n\n        if c == '#':  # '#' ends the current sentence.\n            self.counts[self.prefix] = self.counts.get(self.prefix, 0) + 1  # Save the typed sentence, count += 1.\n                                                                            # State change: a new sentence enters history with count 1.\n            self.prefix = \"\"  # Reset the buffer so the next sentence starts fresh.\n            return []  # Contract: '#' returns an empty list.\n\n        # ---- normal character: extend the prefix and search ----\n\n        self.prefix += c  # Append the new character to the running prefix.\n                          # State change: the set of matching sentences can only shrink from here.\n\n        # ==================== PHASE 3: COLLECT MATCHES, THEN RANK BY HOTNESS ====================\n\n        matches = [s for s in self.counts if s.startswith(self.prefix)]  # Every historical sentence beginning with the prefix.\n                                                                         # Why startswith: these are exactly the autocomplete candidates.\n\n        matches.sort(key=lambda s: (-self.counts[s], s))  # Rank: higher count first (-count), ties broken by smaller string.\n                                                          # Why -count: sorting ascending on -count puts the hottest first,\n                                                          # and the second key s breaks ties lexicographically (space < letters).\n\n        # ==================== PHASE 4: RETURN THE TOP 3 ====================\n\n        return matches[:3]  # At most three hottest matches, fewer if fewer exist.",
        "plain": "from typing import List\n\nclass AutocompleteSystem:\n    def __init__(self, sentences: List[str], times: List[int]):\n        self.counts = {}\n        for sentence, time in zip(sentences, times):\n            self.counts[sentence] = self.counts.get(sentence, 0) + time\n        self.prefix = \"\"\n\n    def input(self, c: str) -> List[str]:\n        if c == '#':\n            self.counts[self.prefix] = self.counts.get(self.prefix, 0) + 1\n            self.prefix = \"\"\n            return []\n        self.prefix += c\n        matches = [s for s in self.counts if s.startswith(self.prefix)]\n        matches.sort(key=lambda s: (-self.counts[s], s))\n        return matches[:3]"
      },
      {
        "name": "Optimized — Trie + Per-Query DFS, Pick Top 3",
        "time": "O(p + k log k) per input (p = prefix length, k = matches in subtree)",
        "space": "O(S) for the trie",
        "whenToUse": "The expected answer: walk to the prefix node once, then collect only the sentences under it.",
        "logic": "**What it asks.** The same autocomplete contract, but without rescanning every stored sentence on each keystroke — narrow the search to only the sentences sharing the current prefix.\n\n**Why the naive idea fails.** The hash-map baseline tests `startswith` against every sentence on each keystroke, `O(S)` per call. Most of those sentences do not share the prefix, so the work is wasted. A trie lets us walk directly to the node for the prefix and then look only at the sentences stored beneath it.\n\n**Key Idea.** Build a **trie** keyed by characters of the stored sentences. Each node has a `children` map and a `counts` dictionary recording, for every full sentence passing through this node, that sentence's frequency — so any node instantly knows all sentences in its subtree and their hotness. Keep a `curr` pointer that walks the trie in lockstep with the characters typed, plus a `prefix` buffer for saving on `'#'`. On a normal character, descend `curr` to the child for `c`; the matching sentences are exactly the keys of `curr.counts`, from which we pick the three hottest. On `'#'`, insert the accumulated sentence (bumping its count in `counts` along every node of its path), reset the buffer, and send `curr` back to the root.\n\n**Step-by-Step Approach.**\n1. In the constructor, insert each seed sentence into the trie with its time, and remember the `root`. Set `curr = root` and `prefix = \"\"`.\n2. `insert(sentence, count)`: from the root, for each character create or follow the child, and at **every** node on the path set `node.counts[sentence] += count` so each prefix node knows this sentence.\n3. On `input(c)` with `c == '#'`: insert the buffered sentence with count 1, reset `prefix = \"\"` and `curr = root`, return `[]`.\n4. Otherwise append `c` to `prefix`. If `curr` is not null, descend to its child for `c` (or null if absent). The candidates are `curr.counts` if `curr` exists, else empty.\n5. Sort those candidate sentences by `(-count, sentence)` and return the first three.\n\n**Why it works.** Because `insert` records the sentence's count at every node along its path, the node you reach after typing a prefix holds exactly the sentences that begin with that prefix, together with their current frequencies — no scanning of unrelated sentences. The `(-count, sentence)` ordering reproduces the required hotness ranking, and once `curr` becomes null (a prefix with no matches) it stays null until the `'#'` reset, correctly yielding empty results for the rest of the sentence.\n\n**Common Gotchas.**\n- Store the count at **every** node on the insertion path, not just the leaf, or a prefix node cannot list its subtree's sentences in one step.\n- Once `curr` walks off the trie (no child for `c`), keep it null and return `[]` for subsequent characters until `'#'` resets it to the root.\n- On `'#'`, insert with count 1, reset BOTH the `prefix` buffer and `curr` to the root, and return `[]`.\n- Keep the tie-break lexicographic on the raw sentence; the space character sorts before letters.\n\n**Complexity.** Time `O(p + k log k)` per `input`, where `p` is the prefix length to descend and `k` is the number of sentences under the prefix node. Space `O(S)`, the total characters stored, with count dictionaries along each path.\n\n**Interview mindset.** 'Prefix + ranking + repeated queries' is the trie signature. Storing per-node count maps trades memory for an instant subtree view; mention that a heap of size 3 can replace the full sort when `k` is large.",
        "rcs": "from typing import List, Dict  # sentences/times seed the history; each node keeps a Dict of sentence -> count.\n\n\n# Trie design: each node stores, for every sentence passing through it, that sentence's frequency.\n# Typing a prefix walks to one node whose count-map IS the set of matching sentences — no rescanning history.\n\nclass TrieNode:  # One node of the prefix tree.\n    def __init__(self):\n        self.children: Dict[str, 'TrieNode'] = {}  # Map from next character -> child node.\n        self.counts: Dict[str, int] = {}  # Map from full sentence passing through here -> its frequency.\n                                          # Why here: lets this prefix node list all its subtree's sentences instantly.\n\n\nclass AutocompleteSystem:  # LeetCode constructs this once, then calls input() repeatedly.\n\n    def __init__(self, sentences: List[str], times: List[int]):  # Seed the trie with history.\n\n        # ==================== PHASE 1: BUILD THE TRIE AND POSITION POINTERS ====================\n\n        self.root = TrieNode()  # The empty-prefix node; every search starts here.\n\n        for sentence, time in zip(sentences, times):  # Insert each historical sentence with its count.\n            self._insert(sentence, time)  # Record the sentence along its whole path.\n\n        self.curr = self.root  # Walks the trie in lockstep with characters typed since the last '#'.\n                               # State: curr is None once we type a prefix that no sentence has.\n\n        self.prefix = \"\"  # Buffer of characters typed since the last '#', needed to save on '#'.\n\n    # ==================== PHASE 2: INSERT A SENTENCE, TAGGING EVERY NODE ON ITS PATH ====================\n\n    def _insert(self, sentence: str, count: int) -> None:  # Add 'count' occurrences of sentence into the trie.\n        node = self.root  # Start at the empty-prefix node.\n        for ch in sentence:  # Walk/create one node per character.\n            if ch not in node.children:  # No path for this character yet?\n                node.children[ch] = TrieNode()  # Create the missing child.\n            node = node.children[ch]  # Descend into the child for ch.\n            node.counts[sentence] = node.counts.get(sentence, 0) + count  # Record this sentence's count AT THIS NODE.\n                                                                          # Why every node: any prefix node must know the\n                                                                          # full sentences that pass through it, with frequency.\n\n    # ==================== PHASE 3: HANDLE ONE TYPED CHARACTER ====================\n\n    def input(self, c: str) -> List[str]:  # Return top-3 matches for the running prefix (or [] on '#').\n\n        if c == '#':  # End of the current sentence.\n            self._insert(self.prefix, 1)  # Save the typed sentence with count 1 (new or incremented).\n            self.prefix = \"\"  # Reset the buffer.\n            self.curr = self.root  # Send the walking pointer back to the empty-prefix node.\n            return []  # Contract: '#' returns [].\n\n        # ---- normal character: extend prefix and descend ----\n\n        self.prefix += c  # Grow the running prefix so '#' can later save the whole sentence.\n\n        if self.curr is not None:  # Only descend while we are still on a real path.\n            self.curr = self.curr.children.get(c)  # Step to the child for c, or None if no sentence has this prefix.\n                                                   # State change: once None, it stays None until the '#' reset.\n\n        if self.curr is None:  # The current prefix matches no historical sentence.\n            return []  # Nothing to suggest.\n\n        # ==================== PHASE 4: RANK THE SUBTREE'S SENTENCES AND RETURN TOP 3 ====================\n\n        candidates = list(self.curr.counts.keys())  # Exactly the sentences beginning with the current prefix.\n\n        candidates.sort(key=lambda s: (-self.curr.counts[s], s))  # Hotter first (-count), ties by smaller string.\n\n        return candidates[:3]  # The three hottest matches (fewer if fewer exist).",
        "plain": "from typing import List, Dict\n\nclass TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.counts = {}\n\nclass AutocompleteSystem:\n    def __init__(self, sentences: List[str], times: List[int]):\n        self.root = TrieNode()\n        for sentence, time in zip(sentences, times):\n            self._insert(sentence, time)\n        self.curr = self.root\n        self.prefix = \"\"\n\n    def _insert(self, sentence: str, count: int) -> None:\n        node = self.root\n        for ch in sentence:\n            if ch not in node.children:\n                node.children[ch] = TrieNode()\n            node = node.children[ch]\n            node.counts[sentence] = node.counts.get(sentence, 0) + count\n\n    def input(self, c: str) -> List[str]:\n        if c == '#':\n            self._insert(self.prefix, 1)\n            self.prefix = \"\"\n            self.curr = self.root\n            return []\n        self.prefix += c\n        if self.curr is not None:\n            self.curr = self.curr.children.get(c)\n        if self.curr is None:\n            return []\n        candidates = list(self.curr.counts.keys())\n        candidates.sort(key=lambda s: (-self.curr.counts[s], s))\n        return candidates[:3]"
      }
    ],
    "patternRecognition": [
      "'Autocomplete / type-ahead over a prefix with ranking' → trie with per-node frequency maps.",
      "Repeated prefix queries on a growing dictionary → trie beats rescanning all strings.",
      "Top-k by (frequency desc, lexicographic asc) → sort key (-count, string)."
    ],
    "interviewRecall": [
      "Store each sentence's count at EVERY node on its path so a prefix node lists its matches instantly.",
      "Rank with key `(-count, sentence)`; space sorts before letters in the tie-break.",
      "On '#': insert the buffered sentence (count 1), reset the prefix AND the walk pointer to root, return []."
    ]
  }
    ]);

  window.BLIND75.register("Greedy", [
  {
    "id": "activity-selection",
    "lc": 0,
    "title": "Activity Selection",
    "difficulty": "Medium",
    "category": "Greedy",
    "link": "",
    "meta": {
      "pattern": "Interval Scheduling (Greedy)",
      "dataStructure": "Arrays / Intervals",
      "technique": "Sort by finish time, earliest-finish-first"
    },
    "description": "You are given two arrays `start` and `end` of equal length, where activity `i` occupies the half-open interval `[start[i], end[i])`. A single resource (a room, a machine, a person) can run only **one activity at a time**, so two activities **conflict** if their intervals overlap.\n\nSelect the **maximum number** of mutually non-overlapping activities that can be scheduled on the resource, and return that count.\n\nThis is the classic **activity-selection** (interval-scheduling-maximization) problem. It is the mirror image of LeetCode 435 *Non-overlapping Intervals*: there you delete the fewest intervals to remove all overlap; here you keep the most intervals with no overlap, and `kept = total - removed`.",
    "constraints": [
      "`len(start) == len(end) == n`, with `0 <= n <= 10^5`.",
      "`start[i] < end[i]` for every activity.",
      "Treat intervals as half-open: an activity ending exactly when another starts does **not** conflict (`end[i] <= start[j]` is compatible)."
    ],
    "notes": [
      "The greedy choice is to sort by **finish (end) time**, not by start time or by duration — those two orderings are provably wrong.",
      "Activity selection is the textbook example of a problem where a greedy choice plus an exchange argument gives a globally optimal answer."
    ],
    "examples": [
      {
        "input": "start = [1, 3, 0, 5, 8, 5], end = [2, 4, 6, 7, 9, 9]",
        "output": "4",
        "reasoning": "Sorted by end: (1,2),(3,4),(0,6),(5,7),(8,9),(5,9). Pick (1,2), then (3,4), then (5,7), then (8,9) — four compatible activities.",
        "visual": "```\ntime  0 1 2 3 4 5 6 7 8 9\n(1,2)   [-)\n(3,4)       [-)\n(5,7)           [---)\n(8,9)                   [-)\nchosen: 4 activities, none overlap\n```"
      },
      {
        "input": "start = [10, 12, 20], end = [20, 25, 30]",
        "output": "2",
        "reasoning": "Sorted by end: (10,20),(12,25),(20,30). Pick (10,20); (12,25) starts before 20 so skip it; (20,30) starts exactly at 20 so take it. Total 2.",
        "visual": "```\n(10,20) [--------)\n(12,25)   [---------)   conflicts with (10,20)\n(20,30)          [--------)   starts at 20, OK\nchosen: (10,20) and (20,30)\n```"
      },
      {
        "input": "start = [1, 2, 3], end = [10, 9, 8]",
        "output": "1",
        "reasoning": "All three overlap heavily. Sorted by end the first pick (3,8) blocks the rest, so only one activity fits.",
        "visual": "```\n(3,8)  [-----)\n(2,9)  overlaps\n(1,10) overlaps\nonly 1 can run\n```"
      },
      {
        "input": "start = [], end = []",
        "output": "0",
        "reasoning": "No activities means nothing to schedule."
      }
    ],
    "approaches": [
      {
        "name": "Brute Force — Try All Subsets / DP Reasoning",
        "time": "O(2^n) subsets (or O(n^2) DP)",
        "space": "O(n)",
        "whenToUse": "Only to build intuition and to see why a simple local rule could possibly be optimal; never as a real answer for large n.",
        "logic": "**What it asks.** Choose the largest set of activities whose intervals pairwise do not overlap. Phrased as a search, you are hunting for the biggest compatible subset of the `n` intervals.\n\n**Why the naive idea fails.** The most literal plan is to enumerate every subset of activities, discard the ones that contain a conflicting pair, and keep the largest surviving subset. That is unarguably correct — you literally examine every possibility — but there are `2^n` subsets, so it collapses past roughly twenty activities. A smarter but still heavy option is a DP: sort by finish time, and let `dp[i]` be the best count using only activities `0..i` where activity `i` is taken, combining it with the best compatible earlier activity; that is `O(n^2)` (or `O(n log n)` with binary search), correct, but still more machinery than the problem needs.\n\n**Key Idea.** Both the subset scan and the DP quietly reveal the same structural fact: in any optimal schedule the activities can be laid out left to right in increasing finish time, and the *first* one to finish can always be the earliest-finishing activity of all. That single observation is what the greedy solution below exploits to drop from exponential or quadratic time to a single sorted pass.\n\n**Step-by-Step Approach.**\n1. Generate every subset of the `n` activities (or, for the DP, sort by finish time first).\n2. For each subset, verify no two chosen intervals overlap by checking every pair.\n3. Track the largest valid subset size seen, and return it.\n\n**Why it works.** By exhaustively testing all subsets you cannot miss the optimum — the best compatible set is one of the subsets you checked. The DP variant works because, once sorted by finish, any optimal solution ending at activity `i` is `i` appended to an optimal solution over the compatible prefix, which is the standard optimal-substructure argument.\n\n**Common Gotchas.**\n- Overlap must be tested with the correct boundary convention: half-open intervals mean `end[a] <= start[b]` is compatible, so do not reject touching intervals.\n- The subset scan is only for tiny `n`; it is a teaching device, not a submission.\n- The DP must sort by finish time first, or its optimal-substructure recurrence does not hold.\n\n**Complexity.** Time `O(2^n)` for the subset scan, or `O(n^2)` for the pairwise DP. Space `O(n)` to hold a subset or the DP table.\n\n**Interview mindset.** Mention the brute force only to motivate the leap: 'enumerating subsets is exponential, but notice the optimum always lets the earliest-finishing activity go first, which means I can just be greedy.' That sentence is the bridge the interviewer wants to hear.",
        "rcs": "from typing import List  # start and end are plain integer lists of equal length n.\n\n\n# This brute-force version exists purely to JUSTIFY the greedy rule below.\n# It enumerates every subset of activities and keeps the largest one with no overlapping pair.\n# It is exponential (2^n) and must never be used for large n; it is a correctness yardstick only.\n\nclass Solution:  # LeetCode-style wrapper so the brute force and greedy share one class.\n\n    def activitySelection(self, start: List[int], end: List[int]) -> int:  # Return the max count of compatible activities.\n\n        # ==================== PHASE 1: PAIR UP (start, end) SO EACH ACTIVITY IS ONE OBJECT ====================\n\n        from itertools import combinations  # combinations lets us generate every subset of a given size.\n\n        n = len(start)  # Number of activities; also the length of end.\n                        # State: if n is 0 the two loops below never run and we return 0.\n\n        acts = list(zip(start, end))  # acts[i] = (start[i], end[i]); bundling makes overlap checks read cleanly.\n                                      # State: acts is an immutable snapshot of all activities as (s, e) tuples.\n\n        # ==================== PHASE 2: HELPER — DOES A CHOSEN SUBSET HAVE ANY OVERLAP? ====================\n\n        def compatible(subset):  # True if no two intervals in subset overlap.\n            ordered = sorted(subset, key=lambda a: a[1])  # Sort by finish time so we only compare neighbors.\n            for i in range(1, len(ordered)):  # Walk adjacent pairs in finish order.\n                prev_end = ordered[i - 1][1]  # Finish time of the earlier-finishing activity.\n                curr_start = ordered[i][0]  # Start time of the next activity.\n                if curr_start < prev_end:  # Half-open: starting BEFORE the previous end is a real overlap.\n                    return False  # A conflicting pair exists, so this subset is invalid.\n            return True  # No adjacent conflict in finish order means no conflict at all.\n\n        # ==================== PHASE 3: TRY EVERY SUBSET, LARGEST FIRST, KEEP THE FIRST VALID SIZE ====================\n\n        best = 0  # Largest compatible subset size found so far.\n                  # Why start at 0: the empty schedule is always valid and selects zero activities.\n\n        for size in range(n, 0, -1):  # Try big subsets first; the first size that yields a valid subset is the answer.\n            for subset in combinations(acts, size):  # Every way to pick exactly 'size' activities.\n                if compatible(subset):  # If this subset has no overlap...\n                    return size  # ...it is the largest possible, so return immediately.\n                                 # Execution flow: returning here short-circuits the whole exponential search.\n\n        # ==================== PHASE 4: NOTHING SELECTABLE ====================\n\n        return best  # Reached only when n == 0; best is still 0.",
        "plain": "from typing import List\nfrom itertools import combinations\n\nclass Solution:\n    def activitySelection(self, start: List[int], end: List[int]) -> int:\n        n = len(start)\n        acts = list(zip(start, end))\n        def compatible(subset):\n            ordered = sorted(subset, key=lambda a: a[1])\n            for i in range(1, len(ordered)):\n                if ordered[i][0] < ordered[i - 1][1]:\n                    return False\n            return True\n        for size in range(n, 0, -1):\n            for subset in combinations(acts, size):\n                if compatible(subset):\n                    return size\n        return 0"
      },
      {
        "name": "Optimized — Greedy, Sort by Finish Time",
        "time": "O(n log n)",
        "space": "O(n)",
        "whenToUse": "The expected answer: pick the earliest-finishing compatible activity every time.",
        "logic": "**What it asks.** Return the maximum number of mutually non-overlapping activities, efficiently, without enumerating subsets.\n\n**Why the naive idea fails.** Subset enumeration is `O(2^n)` and the pairwise DP is `O(n^2)`; both do far more work than necessary because the problem has a simple local rule that is globally optimal. The trick is choosing *which* local rule, since two tempting ones (earliest start, shortest duration) are both wrong and can be defeated by small counterexamples.\n\n**Key Idea.** Sort the activities by **finish time** and sweep left to right, always taking the next activity whose start is at or after the finish time of the last one you took. The intuition: finishing a chosen activity as early as possible leaves the resource free as early as possible, which can only help — it leaves the largest remaining time window for everything that follows. So among all first choices, the earliest-finishing activity dominates, and the same argument then applies recursively to the rest.\n\n**Step-by-Step Approach.**\n1. Zip `start` and `end` into pairs and sort the pairs by finish time (the end value).\n2. Keep a running `count` of chosen activities and `last_end`, the finish time of the most recently chosen activity, initialized to negative infinity.\n3. Scan the sorted activities. For each one, if its `start` is `>= last_end`, it is compatible with everything chosen so far, so select it: increment `count` and set `last_end` to this activity's finish time.\n4. Otherwise skip it — it overlaps the last chosen activity.\n5. After the sweep, `count` is the maximum number of compatible activities.\n\n**Why it works (exchange argument).** Let `g` be the greedy solution and `o` any optimal solution, each listed in increasing finish time. Greedy's first pick, call it `a1`, is the globally earliest-finishing activity, so it finishes no later than `o`'s first pick `b1`. Swap `b1` for `a1` in `o`: because `a1` finishes no later than `b1`, every activity that was compatible after `b1` is still compatible after `a1`, so the swapped schedule is still valid and has the same size — it is still optimal. Repeating this exchange activity by activity transforms `o` into `g` without ever shrinking it, which proves `g` is itself optimal. The greedy choice is 'safe' at every step, which is exactly what makes the one-pass rule correct.\n\n**Common Gotchas.**\n- Sort by **finish** time, never by start time or by duration — both of those orderings have simple counterexamples.\n- Use `start >= last_end` (not `>`) so half-open intervals that merely touch are counted as compatible.\n- Initialize `last_end` to negative infinity so the very first activity is always accepted.\n\n**Complexity.** Time `O(n log n)`, dominated by the sort; the sweep is `O(n)`. Space `O(n)` to hold the paired-and-sorted activities (`O(1)` beyond that).\n\n**Interview mindset.** 'Maximize the number of non-overlapping intervals' is the canonical cue for the earliest-finish-time greedy. Be ready to recite the exchange argument on demand — interviewers love asking *why* the greedy is correct, and this is the same engine behind LC 435 and LC 452.",
        "rcs": "from typing import List  # start[i] and end[i] describe activity i over the half-open interval [start[i], end[i]).\n\n\n# Greedy interval scheduling: sort by FINISH time, then keep every activity compatible with the last one kept.\n# Finishing as early as possible maximizes the free time left for future activities, which is provably optimal.\n\nclass Solution:  # LeetCode creates an object of this class and calls activitySelection on it.\n\n    def activitySelection(self, start: List[int], end: List[int]) -> int:  # Return the max count of compatible activities.\n\n        # ==================== PHASE 1: PAIR UP AND SORT BY FINISH TIME ====================\n\n        activities = sorted(zip(start, end), key=lambda a: a[1])  # Pair each (start, end) and order by end (finish) ascending.\n                                                                  # Why sort by end: the earliest-finishing activity is always a\n                                                                  # safe first choice, so processing in finish order lets a single\n                                                                  # left-to-right sweep make the greedy pick every step.\n                                                                  # State: activities is now sorted; index 0 finishes first.\n\n        # ==================== PHASE 2: SWEEP, KEEPING EACH COMPATIBLE ACTIVITY ====================\n\n        count = 0  # Number of activities selected so far.\n                   # State: count only ever increases, and it is the value we return.\n\n        last_end = float('-inf')  # Finish time of the most recently SELECTED activity.\n                                  # Why -inf: it guarantees the very first activity in sorted order is always accepted.\n                                  # State: last_end jumps forward each time we select an activity.\n\n        for s, e in activities:  # Walk the activities in increasing finish time.\n                                 # Loop invariant: count is the max compatible set among activities seen so far,\n                                 # and last_end is the finish time of the last one we committed to.\n\n            if s >= last_end:  # This activity starts at or after the last selected one finished — no overlap.\n                               # Why >= and not >: half-open intervals that merely touch (s == last_end) are compatible.\n\n                count += 1  # Select it: it fits on the resource without conflict.\n                            # State change: our schedule grows by one activity.\n\n                last_end = e  # The resource is now busy until this activity's finish time.\n                              # State change: future activities must start at or after e to be compatible.\n                              # Execution flow: continue to the next (already later-finishing) activity.\n\n        # ==================== PHASE 3: RETURN THE COUNT ====================\n\n        return count  # The maximum number of mutually non-overlapping activities.",
        "plain": "from typing import List\n\nclass Solution:\n    def activitySelection(self, start: List[int], end: List[int]) -> int:\n        activities = sorted(zip(start, end), key=lambda a: a[1])\n        count = 0\n        last_end = float('-inf')\n        for s, e in activities:\n            if s >= last_end:\n                count += 1\n                last_end = e\n        return count"
      }
    ],
    "patternRecognition": [
      "'Maximum number of non-overlapping intervals / activities' → sort by finish time, greedily take earliest finisher.",
      "Mirror of LC 435 (minimize deletions): kept = total - removed.",
      "A single resource that runs one task at a time and you want to fit the most tasks."
    ],
    "interviewRecall": [
      "Sort by END time, not start or duration — the other two orderings are provably wrong.",
      "Accept when `start >= last_end` (>= handles touching half-open intervals).",
      "Be ready to give the exchange argument: swapping in the earliest finisher never hurts optimality."
    ]
  }
    ]);

  window.BLIND75.register("Advanced Graphs", [
  {
    "id": "kruskals-mst",
    "lc": 0,
    "title": "Kruskal's Minimum Spanning Tree",
    "difficulty": "Hard",
    "category": "Advanced Graphs",
    "link": "",
    "meta": {
      "pattern": "Minimum Spanning Tree (Greedy)",
      "dataStructure": "Union-Find (DSU)",
      "technique": "Sort edges, union disjoint components"
    },
    "description": "You are given `n` nodes labeled `0..n-1` and a list of weighted undirected `edges`, where each edge is `[u, v, w]` connecting nodes `u` and `v` with weight `w`. Assume the graph is **connected**.\n\nA **spanning tree** is a subset of `n - 1` edges that connects all `n` nodes with no cycle. The **minimum spanning tree (MST)** is the spanning tree whose total edge weight is smallest. Return that **minimum total weight**.\n\n**Kruskal's algorithm** builds the MST greedily: sort all edges by weight ascending, then add each edge if and only if it joins two currently-disconnected components, using a **Union-Find (Disjoint Set Union, DSU)** structure to test connectivity in near-constant time.",
    "constraints": [
      "`1 <= n <= 10^5`.",
      "`0 <= u, v < n` and `u != v`.",
      "Edge weights `w` may be any integer (positive, zero, or negative).",
      "The graph is connected, so an MST with exactly `n - 1` edges always exists."
    ],
    "notes": [
      "Kruskal is edge-centric and shines on sparse graphs; Prim's (a node-centric heap approach) is the usual alternative.",
      "DSU with **path compression** plus **union by rank** gives an almost-constant per-operation cost (inverse-Ackermann), so the overall cost is dominated by the edge sort."
    ],
    "examples": [
      {
        "input": "n = 4, edges = [[0,1,1],[1,2,2],[0,2,2],[2,3,3]]",
        "output": "6",
        "reasoning": "Sort by weight: (0,1,1),(1,2,2),(0,2,2),(2,3,3). Take (0,1,1); take (1,2,2); skip (0,2,2) because 0 and 2 are already connected; take (2,3,3). Total = 1 + 2 + 3 = 6.",
        "visual": "```\n   0 --1-- 1\n   |        |\n  (2 skip)  2\n   |        |\n   2 --3-- 3\nMST edges: (0,1),(1,2),(2,3)  weight 1+2+3 = 6\n```"
      },
      {
        "input": "n = 3, edges = [[0,1,5],[1,2,5],[0,2,5]]",
        "output": "10",
        "reasoning": "All weights equal. Take (0,1,5) and (1,2,5); the third edge (0,2,5) would form a cycle, so skip it. Total = 10.",
        "visual": "```\n 0 --5-- 1 --5-- 2\n  \\______ 5 ______/   (skipped: forms a cycle)\nMST weight = 10\n```"
      },
      {
        "input": "n = 1, edges = []",
        "output": "0",
        "reasoning": "A single node needs no edges; the MST is empty with weight 0."
      },
      {
        "input": "n = 5, edges = [[0,1,2],[0,3,6],[1,2,3],[1,3,8],[1,4,5],[2,4,7],[3,4,9]]",
        "output": "16",
        "reasoning": "Sort and add: (0,1,2),(1,2,3),(1,4,5),(0,3,6); the rest would form cycles. Total = 2 + 3 + 5 + 6 = 16.",
        "visual": "```\nMST edges: (0,1,2),(1,2,3),(1,4,5),(0,3,6)\nweight = 2 + 3 + 5 + 6 = 16\n```"
      }
    ],
    "approaches": [
      {
        "name": "Conceptual Brute Force — Enumerate All Spanning Trees",
        "time": "Exponential (up to n^(n-2) trees)",
        "space": "O(n)",
        "whenToUse": "Only to motivate why a greedy edge rule is needed; never run for real graphs.",
        "logic": "**What it asks.** Among all ways to connect the `n` nodes with exactly `n - 1` acyclic edges (every spanning tree), find the one of least total weight and report that weight.\n\n**Why the naive idea fails.** The literal definition suggests enumerating every spanning tree and taking the cheapest. By Cayley's formula a complete graph on `n` nodes already has `n^(n-2)` spanning trees — over a hundred thousand for just `n = 8`, astronomically more beyond that — so enumeration is hopeless past tiny graphs. Even generating them without duplication is awkward. The payoff of thinking about it is realizing we do not need to see whole trees: we can build the one optimal tree directly, edge by edge.\n\n**Key Idea.** The decisive structural fact is the **cut property**: for any way of splitting the nodes into two non-empty groups, the single cheapest edge crossing that split is safe to include in *some* MST. That means we never have to compare whole trees — we can keep committing to locally cheapest safe edges and still land on a globally minimum tree. Kruskal's algorithm below is exactly this idea applied in global weight order.\n\n**Step-by-Step Approach.**\n1. Enumerate every subset of `n - 1` edges.\n2. Keep only those subsets that connect all `n` nodes without a cycle (i.e. are spanning trees).\n3. Return the minimum total weight among them.\n\n**Why it works.** By examining every spanning tree you cannot miss the minimum; it is one of the subsets you scored. The reason we can abandon this and trust a greedy rule is the cut property, which guarantees a locally cheapest crossing edge always belongs to some optimal tree.\n\n**Common Gotchas.**\n- A valid spanning tree has exactly `n - 1` edges AND connects every node AND has no cycle; checking only the edge count is not enough.\n- The enumeration is strictly a thought experiment; it is exponential and must not be submitted.\n- Disconnected inputs have no spanning tree at all — here we are told the graph is connected.\n\n**Complexity.** Time exponential (as many as `n^(n-2)` trees). Space `O(n)` to hold one candidate tree.\n\n**Interview mindset.** Use one sentence: 'There are exponentially many spanning trees, but the cut property lets me greedily add the cheapest safe edge instead,' then pivot straight to Kruskal with Union-Find.",
        "rcs": "from typing import List  # n is the node count; edges is a list of [u, v, w] weighted undirected edges.\n\n\n# This brute force enumerates every (n-1)-edge subset and keeps the cheapest one that is a valid spanning tree.\n# It is exponential and exists ONLY to motivate the greedy cut-property reasoning that Kruskal exploits.\n\nclass Solution:  # Shared wrapper so brute force and Kruskal live in one class.\n\n    def kruskalMST(self, n: int, edges: List[List[int]]) -> int:  # Return the minimum total MST weight.\n\n        # ==================== PHASE 1: HELPER — IS A SET OF EDGES A SPANNING TREE? ====================\n\n        from itertools import combinations  # Generates every subset of edges of a chosen size.\n\n        def is_spanning(chosen):  # True if 'chosen' connects all n nodes with no cycle.\n            parent = list(range(n))  # A fresh DSU: each node starts as its own component.\n            def find(x):  # Return the representative of x's component (with path compression).\n                while parent[x] != x:\n                    parent[x] = parent[parent[x]]\n                    x = parent[x]\n                return x\n            for u, v, w in chosen:  # Union the endpoints of every chosen edge.\n                ru, rv = find(u), find(v)  # Roots of the two endpoints.\n                if ru == rv:  # Both endpoints already connected → this edge closes a cycle.\n                    return False  # A tree has no cycle, so reject.\n                parent[ru] = rv  # Merge the two components.\n            roots = {find(i) for i in range(n)}  # Distinct component roots across all nodes.\n            return len(roots) == 1  # Exactly one component means every node is connected.\n\n        # ==================== PHASE 2: TRY EVERY (n-1)-EDGE SUBSET, KEEP THE CHEAPEST TREE ====================\n\n        if n <= 1:  # Zero or one node needs no edges.\n            return 0  # The MST weight is trivially 0.\n\n        best = float('inf')  # Smallest total weight of any valid spanning tree seen so far.\n\n        for subset in combinations(edges, n - 1):  # Every way to choose exactly n-1 edges.\n            if is_spanning(subset):  # Only score subsets that actually form a spanning tree.\n                total = sum(w for _, _, w in subset)  # Total weight of this candidate tree.\n                best = min(best, total)  # Keep the cheapest tree found.\n\n        # ==================== PHASE 3: RETURN THE MINIMUM WEIGHT ====================\n\n        return best if best != float('inf') else 0  # best stays inf only if no tree exists (not for connected input).",
        "plain": "from typing import List\nfrom itertools import combinations\n\nclass Solution:\n    def kruskalMST(self, n: int, edges: List[List[int]]) -> int:\n        def is_spanning(chosen):\n            parent = list(range(n))\n            def find(x):\n                while parent[x] != x:\n                    parent[x] = parent[parent[x]]\n                    x = parent[x]\n                return x\n            for u, v, w in chosen:\n                ru, rv = find(u), find(v)\n                if ru == rv:\n                    return False\n                parent[ru] = rv\n            return len({find(i) for i in range(n)}) == 1\n        if n <= 1:\n            return 0\n        best = float('inf')\n        for subset in combinations(edges, n - 1):\n            if is_spanning(subset):\n                best = min(best, sum(w for _, _, w in subset))\n        return best if best != float('inf') else 0"
      },
      {
        "name": "Optimized — Kruskal with Union-Find (Path Compression + Union by Rank)",
        "time": "O(E log E)",
        "space": "O(n)",
        "whenToUse": "The expected answer: sort edges, union disjoint components with DSU.",
        "logic": "**What it asks.** Build the minimum spanning tree efficiently and return its total weight, without enumerating trees.\n\n**Why the naive idea fails.** Enumerating spanning trees is exponential. The cut property tells us we can instead add edges greedily, but we need a fast way to answer 'are these two endpoints already connected?' after every addition — doing a graph search per edge would be `O(E * n)`. A Union-Find structure answers that connectivity question in almost `O(1)`.\n\n**Key Idea.** Sort all edges by weight ascending and consider them cheapest first. Maintain a **DSU** partitioning the nodes into connected components. For each edge, if its two endpoints lie in **different** components, the edge is the cheapest edge crossing the cut between those components, so by the cut property it is safe — add it to the MST and `union` the components. If the endpoints are already in the same component, the edge would close a cycle, so skip it. Stop once `n - 1` edges have been taken. Two DSU optimizations keep it fast: **path compression** flattens the tree during `find`, and **union by rank** always attaches the shorter tree under the taller, so trees stay shallow; together they give inverse-Ackermann per operation.\n\n**Step-by-Step Approach.**\n1. Sort `edges` by weight ascending.\n2. Initialize DSU arrays: `parent[i] = i` and `rank[i] = 0` for every node.\n3. Walk the sorted edges. For edge `(u, v, w)`, compute `find(u)` and `find(v)`.\n4. If the roots differ, the edge is safe: add `w` to the running total, `union` the two roots, and increment a count of chosen edges.\n5. Stop early once `n - 1` edges are chosen, and return the total weight.\n\n**Why it works.** Processing edges in increasing weight means the first edge that crosses any cut is the cheapest such edge, which the cut property proves belongs to some MST — so every edge Kruskal accepts is safe, and greedily accepting safe edges yields a globally minimum tree. The DSU guarantees we never accept an edge that forms a cycle, because same-root endpoints are exactly the ones already connected. After `n - 1` safe edges the graph is a single component: the MST.\n\n**Common Gotchas.**\n- `find` must use path compression (and `union` by rank) or deep DSU chains degrade performance toward `O(n)` per query.\n- Only accept an edge when the roots **differ**; accepting same-root edges creates cycles.\n- Edge weights can be negative or zero — Kruskal handles them fine since it only compares weights.\n- You can stop as soon as `n - 1` edges are chosen; scanning the rest is harmless but wasteful.\n\n**Complexity.** Time `O(E log E)`, dominated by sorting the edges (the DSU operations are near-constant). Space `O(n)` for the `parent` and `rank` arrays.\n\n**Interview mindset.** 'Minimum spanning tree' over an edge list is the signal for Kruskal + Union-Find. Be ready to implement DSU inline with path compression and union by rank, and to name Prim's (node-centric, min-heap) as the alternative that is better on dense graphs.",
        "rcs": "from typing import List  # n is the node count (0..n-1); edges is a list of [u, v, w] weighted undirected edges.\n\n\n# Kruskal's MST: sort edges by weight, then greedily add an edge iff it joins two different components.\n# Connectivity is tracked with a Disjoint Set Union (DSU) using path compression + union by rank.\n\nclass Solution:  # LeetCode creates an object of this class and calls kruskalMST on it.\n\n    def kruskalMST(self, n: int, edges: List[List[int]]) -> int:  # Return the total weight of the MST.\n\n        # ==================== PHASE 1: INITIALIZE THE DISJOINT SET UNION (DSU) ====================\n\n        parent = list(range(n))  # parent[i] is i's parent in its component tree; each node starts as its own root.\n                                 # State: initially there are n singleton components, 0..n-1.\n\n        rank = [0] * n  # Upper bound on each component tree's height; used to attach shorter trees under taller ones.\n                        # Why: keeping trees shallow makes find almost O(1).\n\n        def find(x: int) -> int:  # Return the representative (root) of x's component, compressing the path on the way.\n            root = x  # First, climb to the actual root.\n            while parent[root] != root:  # A node is its own parent exactly when it is the root.\n                root = parent[root]  # Step upward one level.\n            while parent[x] != root:  # PATH COMPRESSION: re-point every node on the path straight to the root.\n                parent[x], x = root, parent[x]  # Flatten x to root, then advance x to its old parent.\n                                               # Why: future finds on these nodes become O(1).\n            return root  # The component's representative.\n\n        def union(a: int, b: int) -> bool:  # Merge the components of a and b; return True if they were separate.\n            ra, rb = find(a), find(b)  # Roots of the two nodes.\n            if ra == rb:  # Already in the same component → joining them would make a cycle.\n                return False  # Signal 'no merge happened'.\n            if rank[ra] < rank[rb]:  # UNION BY RANK: ensure ra is the taller (or equal) tree's root.\n                ra, rb = rb, ra  # Swap so we always attach the shorter tree (rb) under the taller (ra).\n            parent[rb] = ra  # Hang rb's tree under ra, keeping overall height small.\n            if rank[ra] == rank[rb]:  # Heights tied → the merged tree grew by one level.\n                rank[ra] += 1  # Bump the surviving root's rank.\n            return True  # A real merge happened, so the edge was useful.\n\n        # ==================== PHASE 2: SORT EDGES BY WEIGHT, CHEAPEST FIRST ====================\n\n        edges.sort(key=lambda e: e[2])  # Order edges by weight ascending; Kruskal considers the cheapest safe edge first.\n                                        # Why: the cheapest edge crossing any cut is safe (cut property), so weight order works.\n\n        # ==================== PHASE 3: GREEDILY ADD SAFE EDGES UNTIL THE TREE IS COMPLETE ====================\n\n        total = 0  # Running sum of the weights of edges added to the MST.\n                   # State: total is the value we return.\n\n        picked = 0  # How many edges we have committed to the MST so far.\n                    # Why track it: a spanning tree needs exactly n-1 edges, so we can stop early.\n\n        for u, v, w in edges:  # Walk edges from cheapest to most expensive.\n                               # Loop invariant: the chosen edges so far form a minimum spanning FOREST of the processed graph.\n\n            if union(u, v):  # True only if u and v were in different components → the edge joins them with no cycle.\n                total += w  # Commit this edge's weight to the MST.\n                            # State change: the MST weight grows by w.\n\n                picked += 1  # One more edge locked into the tree.\n\n                if picked == n - 1:  # A spanning tree of n nodes has exactly n-1 edges.\n                    break  # The MST is complete; remaining (pricier) edges cannot improve it.\n                           # Execution flow: exit the loop early for efficiency.\n\n        # ==================== PHASE 4: RETURN THE TOTAL WEIGHT ====================\n\n        return total  # The minimum total weight connecting all n nodes.",
        "plain": "from typing import List\n\nclass Solution:\n    def kruskalMST(self, n: int, edges: List[List[int]]) -> int:\n        parent = list(range(n))\n        rank = [0] * n\n        def find(x: int) -> int:\n            root = x\n            while parent[root] != root:\n                root = parent[root]\n            while parent[x] != root:\n                parent[x], x = root, parent[x]\n            return root\n        def union(a: int, b: int) -> bool:\n            ra, rb = find(a), find(b)\n            if ra == rb:\n                return False\n            if rank[ra] < rank[rb]:\n                ra, rb = rb, ra\n            parent[rb] = ra\n            if rank[ra] == rank[rb]:\n                rank[ra] += 1\n            return True\n        edges.sort(key=lambda e: e[2])\n        total = 0\n        picked = 0\n        for u, v, w in edges:\n            if union(u, v):\n                total += w\n                picked += 1\n                if picked == n - 1:\n                    break\n        return total"
      }
    ],
    "patternRecognition": [
      "'Minimum spanning tree' / 'connect all nodes at least cost' over an edge list → Kruskal + Union-Find.",
      "You repeatedly need 'are these two nodes already connected?' → Disjoint Set Union.",
      "Sparse graph given as an edge list favors Kruskal; dense graph favors Prim's min-heap."
    ],
    "interviewRecall": [
      "Sort edges by weight, add an edge only when its endpoints have different DSU roots.",
      "DSU needs path compression AND union by rank for near-constant operations.",
      "Stop once n-1 edges are chosen; the cut property is why the greedy is optimal."
    ]
  }
    ]);

  window.BLIND75.register("1-D Dynamic Programming", [
  {
    "id": "fibonacci-number",
    "lc": 509,
    "title": "Fibonacci Number",
    "difficulty": "Easy",
    "category": "1-D Dynamic Programming",
    "link": "https://leetcode.com/problems/fibonacci-number/",
    "meta": {
      "pattern": "Linear DP (Fibonacci recurrence)",
      "dataStructure": "Rolling variables",
      "technique": "Memoization / bottom-up iteration"
    },
    "description": "The Fibonacci numbers form a sequence where each term is the sum of the two before it. Formally, `F(0) = 0`, `F(1) = 1`, and for every `n >= 2`, `F(n) = F(n - 1) + F(n - 2)`.\n\nGiven an integer `n`, return `F(n)`.\n\nThis is the canonical first problem of **1-D dynamic programming**: the answer at index `n` depends only on the two smaller subproblems `n - 1` and `n - 2`, so once those are known the rest is a single addition.",
    "constraints": [
      "`0 <= n <= 30`",
      "The result always fits comfortably in a standard integer for this range."
    ],
    "notes": [
      "The recurrence has overlapping subproblems, which is exactly what memoization or tabulation is built to exploit.",
      "Because each state looks back only two steps, you can drop the full table and keep just two rolling variables for `O(1)` space."
    ],
    "examples": [
      {
        "input": "n = 2",
        "output": "1",
        "reasoning": "F(2) = F(1) + F(0) = 1 + 0 = 1.",
        "visual": "```\nindex:  0  1  2\nvalue:  0  1  1\n              ^ F(2) = F(1)+F(0) = 1+0\n```"
      },
      {
        "input": "n = 3",
        "output": "2",
        "reasoning": "F(3) = F(2) + F(1) = 1 + 1 = 2."
      },
      {
        "input": "n = 4",
        "output": "3",
        "reasoning": "F(4) = F(3) + F(2) = 2 + 1 = 3.",
        "visual": "```\nindex:  0  1  2  3  4\nvalue:  0  1  1  2  3\n                    ^ F(4) = F(3)+F(2) = 2+1\n```"
      },
      {
        "input": "n = 0",
        "output": "0",
        "reasoning": "F(0) is the base case 0 and is returned directly."
      }
    ],
    "approaches": [
      {
        "name": "Top-Down Memoized Recursion",
        "time": "O(n)",
        "space": "O(n)",
        "whenToUse": "The most direct way to turn the recurrence straight into code while still avoiding exponential recomputation.",
        "logic": "**What it asks.** Compute the `n`-th Fibonacci number, where each value is defined recursively as the sum of the two preceding values, bottoming out at `F(0) = 0` and `F(1) = 1`.\n\n**Why the naive idea fails.** Translating the recurrence literally into `fib(n) = fib(n-1) + fib(n-2)` with no memory is correct but catastrophically slow: `fib(n-1)` and `fib(n-2)` both re-expand the same smaller calls, so the call tree branches into roughly `2^n` leaves and recomputes `fib(2)` an exponential number of times. The subproblems overlap massively, and plain recursion solves each one over and over.\n\n**Key Idea.** Each `fib(k)` has one fixed answer, so compute it once and cache it. Keep a dictionary (or array) `memo` from `k` to `F(k)`. Before doing any work for `k`, check the cache; if the answer is there, return it instantly. Otherwise compute it from the two recursive calls, store it, and return it. Caching collapses the exponential tree into a linear chain because every distinct subproblem is solved exactly once.\n\n**Step-by-Step Approach.**\n1. Handle the base cases directly: if `n < 2`, return `n` (covers both `F(0) = 0` and `F(1) = 1`).\n2. Keep a cache `memo` of already-computed values.\n3. On a call for `k`, if `k` is in `memo`, return the stored value without recursing.\n4. Otherwise compute `fib(k - 1) + fib(k - 2)`, store the result in `memo[k]`, and return it.\n5. The top-level call for `n` triggers the whole chain and yields `F(n)`.\n\n**Why it works.** The recurrence is correct by definition, and the cache preserves correctness while removing redundancy: the first time a value is computed it is stored, and every later request for that same index is answered from the cache instead of recomputing. Since there are only `n + 1` distinct indices and each is computed once, the total work is linear.\n\n**Common Gotchas.**\n- Check the cache *before* recursing, not after, or you still pay the exponential cost.\n- Get the base cases right: `F(0)` is `0` and `F(1)` is `1`; returning `n` for `n < 2` captures both.\n- Deep recursion can approach Python's recursion limit for large `n`; the bottom-up version sidesteps the call stack entirely.\n\n**Complexity.** Time `O(n)`, since each of the `n + 1` subproblems is computed once. Space `O(n)` for the cache plus the recursion stack.\n\n**Interview mindset.** When a recurrence has overlapping subproblems, say 'memoize' out loud and add a cache keyed by the subproblem's parameters. This top-down shape is the quickest bridge from a recursive definition to an efficient solution; mention you can then convert it to bottom-up for constant space.",
        "rcs": "from functools import lru_cache  # lru_cache auto-memoizes a function by its arguments; here we memoize by hand to show the mechanism.\n\n\n# Fibonacci: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). The subproblems OVERLAP, so we cache each F(k) once.\n\nclass Solution:  # LeetCode creates an object of this class and calls fib on it.\n\n    def fib(self, n: int) -> int:  # Return the n-th Fibonacci number.\n\n        # ==================== PHASE 1: SET UP THE CACHE OF SOLVED SUBPROBLEMS ====================\n\n        memo = {}  # Maps an index k -> its computed Fibonacci value F(k), so each index is solved only once.\n                   # Why: plain recursion re-expands fib(n-1) and fib(n-2) into the SAME smaller calls, giving ~2^n work;\n                   # the cache collapses that exponential tree into a linear chain of n+1 distinct subproblems.\n\n        # ==================== PHASE 2: THE RECURSIVE SOLVER WITH A CACHE CHECK ====================\n\n        def solve(k):  # Returns F(k), consulting and filling memo.\n                       # Execution flow: each call either hits a base case, returns a cached value, or computes and caches one.\n\n            if k < 2:  # Base cases F(0)=0 and F(1)=1 are both just k itself.\n                return k  # No recursion needed; hand back 0 or 1 directly.\n\n            if k in memo:  # Have we already solved this exact subproblem?\n                           # Why check BEFORE recursing: answering from the cache is what removes the exponential blow-up.\n                return memo[k]  # Yes: return the stored answer instantly, no further work.\n\n            memo[k] = solve(k - 1) + solve(k - 2)  # First time: compute from the two smaller subproblems and cache the result.\n                                                   # State change: memo now holds F(k); future requests for k are O(1).\n\n            return memo[k]  # Return the freshly computed and now-cached value.\n\n        # ==================== PHASE 3: KICK OFF THE TOP-LEVEL CALL ====================\n\n        return solve(n)  # Requesting F(n) drives the whole chain; each index below n is computed exactly once.",
        "plain": "class Solution:\n    def fib(self, n: int) -> int:\n        memo = {}\n        def solve(k):\n            if k < 2:\n                return k\n            if k in memo:\n                return memo[k]\n            memo[k] = solve(k - 1) + solve(k - 2)\n            return memo[k]\n        return solve(n)"
      },
      {
        "name": "Optimized — Bottom-Up Two Variables",
        "time": "O(n)",
        "space": "O(1)",
        "whenToUse": "The expected answer: linear time with constant space and no recursion.",
        "logic": "**What it asks.** Compute `F(n)` efficiently, ideally without the recursion stack or a full cache, since each value depends only on the two immediately preceding values.\n\n**Why the naive idea fails.** Memoized recursion is already linear, but it stores all `n + 1` values and carries a recursion stack `n` deep. That extra `O(n)` space is unnecessary: at any moment the recurrence only reaches back two steps, so keeping the entire history is wasteful.\n\n**Key Idea.** Build the sequence forward from the base cases instead of backward from `n`. Hold just two rolling variables, `prev` for `F(k - 2)` and `curr` for `F(k - 1)`. The next value is their sum; then slide the window forward by letting `prev` take `curr` and `curr` take the new sum. After stepping from index `2` up to index `n`, `curr` holds `F(n)`. Because only the last two values are ever needed, two scalars replace the whole table.\n\n**Step-by-Step Approach.**\n1. Handle the base cases: if `n < 2`, return `n` directly.\n2. Initialize `prev = 0` (`F(0)`) and `curr = 1` (`F(1)`).\n3. Loop for each index from `2` through `n`: compute `nxt = prev + curr`.\n4. Slide the window: set `prev = curr` and `curr = nxt`.\n5. After the loop, `curr` holds `F(n)`; return it.\n\n**Why it works.** The loop maintains the invariant that at the start of the iteration for index `k`, `prev = F(k - 2)` and `curr = F(k - 1)`. The recurrence makes `prev + curr = F(k)`, which becomes the new `curr`, and shifting `prev` to the old `curr` restores the invariant for `k + 1`. When the loop finishes at `k = n`, `curr` is exactly `F(n)`.\n\n**Common Gotchas.**\n- Perform the slide as a simultaneous update (`prev, curr = curr, prev + curr`) or use a temp, so you do not overwrite `curr` before computing the sum.\n- The loop runs from `2` to `n` inclusive; off-by-one here returns `F(n - 1)` or `F(n + 1)`.\n- Return `n` immediately for `n < 2`; otherwise the loop never runs and the initial `curr = 1` is wrong for `n = 0`.\n\n**Complexity.** Time `O(n)`, a single forward pass. Space `O(1)`, just two integers regardless of `n`.\n\n**Interview mindset.** Whenever a 1-D DP state looks back only a constant number of steps, replace the array with that many rolling variables to drop the space to `O(1)`. Fibonacci is the textbook case; the same window trick optimizes climbing stairs, house robber, and many linear DPs.",
        "rcs": "# Fibonacci: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). Each value looks back only TWO steps,\n# so we keep two rolling variables instead of a full table and build the sequence forward.\n\nclass Solution:  # LeetCode creates an object of this class and calls fib on it.\n\n    def fib(self, n: int) -> int:  # Return the n-th Fibonacci number in O(1) space.\n\n        # ==================== PHASE 1: HANDLE THE BASE CASES DIRECTLY ====================\n\n        if n < 2:  # F(0)=0 and F(1)=1 are both just n.\n            return n  # Return immediately; the loop below assumes n >= 2.\n                      # Why needed: for n=0 the initial curr (F(1)=1) would be wrong, so we short-circuit here.\n\n        # ==================== PHASE 2: SEED THE TWO ROLLING VALUES ====================\n\n        prev = 0  # Holds F(k-2); starts as F(0)=0 before we compute F(2).\n                  # State: prev always trails one index behind curr.\n\n        curr = 1  # Holds F(k-1); starts as F(1)=1.\n                  # Invariant entering the loop at k: prev == F(k-2) and curr == F(k-1).\n                  # Execution flow: Python continues to the forward build loop.\n\n        # ==================== PHASE 3: BUILD FORWARD FROM INDEX 2 UP TO n ====================\n\n        for _ in range(2, n + 1):  # One step per index from 2 through n inclusive; each step advances the window by one.\n                                   # Loop invariant: at the top of each pass, curr is the previous index's value.\n\n            prev, curr = curr, prev + curr  # Simultaneously: new F(k) is prev+curr, and prev slides onto the old curr.\n                                            # Why simultaneous: computing the sum and shifting in one tuple assignment avoids\n                                            # overwriting curr before it is used in the sum.\n                                            # State change: the (prev, curr) window moves forward exactly one index.\n\n        # ==================== PHASE 4: RETURN THE RESULT ====================\n\n        return curr  # After the final step at k=n, curr holds F(n).",
        "plain": "class Solution:\n    def fib(self, n: int) -> int:\n        if n < 2:\n            return n\n        prev = 0\n        curr = 1\n        for _ in range(2, n + 1):\n            prev, curr = curr, prev + curr\n        return curr"
      }
    ],
    "patternRecognition": [
      "A value defined as the sum of the two (or a few) preceding values → linear DP recurrence.",
      "Overlapping subproblems in a recursion → memoize or tabulate.",
      "State depends only on a constant number of previous states → roll it up into a few variables for O(1) space."
    ],
    "interviewRecall": [
      "Base cases: F(0)=0, F(1)=1, so returning n for n < 2 covers both.",
      "Memoize before recursing to turn exponential recursion into O(n).",
      "Two rolling variables with `prev, curr = curr, prev + curr` give O(n) time and O(1) space."
    ]
  },
  {
    "id": "painting-the-walls",
    "lc": 2742,
    "title": "Painting the Walls",
    "difficulty": "Hard",
    "category": "1-D Dynamic Programming",
    "link": "https://leetcode.com/problems/painting-the-walls/",
    "meta": {
      "pattern": "0/1 Knapsack on time-capacity",
      "dataStructure": "1-D DP array",
      "technique": "Reframe as covering n walls, minimize cost"
    },
    "description": "You have `n` walls to paint and two painters. The **paid** painter paints wall `i` in `time[i]` units of time and charges `cost[i]`. The **free** painter paints any wall in `1` unit of time and charges nothing, but can only work while the paid painter is already busy.\n\nReturn the **minimum total cost** to paint all `n` walls.\n\nThe key reframing: whenever the paid painter spends `time[i]` units on a wall, the free painter can finish `time[i]` other walls in that same window, and the paid wall itself also gets done. So choosing wall `i` for the paid painter 'buys' `time[i] + 1` walls' worth of total painting capacity. We need to pick a subset of walls for the paid painter whose combined `time[i] + 1` is at least `n`, at minimum total `cost` — a knapsack-style 1-D DP.",
    "constraints": [
      "`1 <= cost.length <= 500`",
      "`cost.length == time.length == n`",
      "`1 <= cost[i] <= 10^6`",
      "`1 <= time[i] <= 500`"
    ],
    "notes": [
      "The free painter needs the paid painter to be actively working, so free walls only count while paid time is being spent.",
      "Cap the covered-wall count at `n`: any coverage beyond `n` is wasted, and capping keeps the DP dimension bounded."
    ],
    "examples": [
      {
        "input": "cost = [1, 2, 3, 2], time = [1, 2, 3, 2]",
        "output": "3",
        "reasoning": "Have the paid painter do walls 0 and 1 (cost 1+2 = 3). That spends time 1+2 = 3 units, during which the free painter paints the remaining 2 walls (2 and 3). Paid covers 2 walls, free covers 2 walls, total 4 = n.",
        "visual": "```\npaid walls: 0 (t=1) + 1 (t=2) -> 3 time units, cost 3\n(t[0]+1)+(t[1]+1) = 2 + 3 = 5 >= 4 walls covered\nfree painter paints walls 2 and 3 during those 3 units\n```"
      },
      {
        "input": "cost = [2, 3, 4, 2], time = [1, 1, 1, 1]",
        "output": "4",
        "reasoning": "Pick the two cheapest walls (cost 2 and 2). Each buys time[i]+1 = 2 walls of coverage, so 2+2 = 4 >= n, at total cost 4."
      },
      {
        "input": "cost = [1], time = [1]",
        "output": "1",
        "reasoning": "Only one wall; the paid painter must paint it (there is no other wall to keep him busy), costing 1."
      },
      {
        "input": "cost = [26, 53, 10, 24, 25, 20, 63, 51], time = [1, 1, 1, 1, 2, 2, 2, 1]",
        "output": "55",
        "reasoning": "A subset of paid walls whose (time[i]+1) sums to at least 8 at minimum cost; the DP searches all such subsets efficiently."
      }
    ],
    "approaches": [
      {
        "name": "Top-Down Memoized Recursion",
        "time": "O(n^2)",
        "space": "O(n^2)",
        "whenToUse": "The clearest way to express the choice-per-wall recurrence before compressing it to a 1-D array.",
        "logic": "**What it asks.** Paint all `n` walls at minimum cost, where paying `cost[i]` to have the paid painter do wall `i` for `time[i]` units simultaneously lets the free painter knock out `time[i]` other walls. Reframed: each paid wall covers `time[i] + 1` walls, and we need total coverage `>= n` at minimum cost.\n\n**Why the naive idea fails.** Trying every subset of walls for the paid painter and checking whether the covered count reaches `n` is `2^n` subsets, far too slow for `n` up to 500. But the decision is naturally sequential — for each wall, pay for it or leave it to the free painter — and the subproblems that result overlap, so a per-wall recursive choice with memoization tames the explosion.\n\n**Key Idea.** Walk the walls index by index. At wall `i` you have two options. **Pay** for it: add `cost[i]`, and because it buys `time[i] + 1` coverage, the number of walls that still need covering drops by `time[i] + 1`. **Skip** it (do not pay for it): add nothing, and leave `remaining` unchanged, because only paid walls provide coverage — the free walls are exactly the ones a paid wall's time window funds, so a skipped wall is simply one that some paid wall will cover. The state is `(i, remaining)` where `remaining` is how many walls still need coverage; once `remaining <= 0` everything is covered at cost `0`, and if you run out of walls with `remaining > 0` that path is impossible (cost `infinity`).\n\n**Step-by-Step Approach.**\n1. Define `solve(i, remaining)` = minimum cost to cover `remaining` more walls using walls `i..n-1`.\n2. If `remaining <= 0`, everything needed is already covered, so return `0`.\n3. If `i == n` but `remaining > 0`, there are no walls left to pay for, so this is impossible; return infinity.\n4. Otherwise return the minimum of: **pay** `cost[i] + solve(i + 1, remaining - (time[i] + 1))`, and **skip** `solve(i + 1, remaining)` (coverage owed is unchanged).\n5. Memoize on `(i, remaining)` and return `solve(0, n)`.\n\n**Why it works.** Only paid walls reduce `remaining`, and each reduces it by `time[i] + 1`, which exactly models that paying for wall `i` paints it plus funds `time[i]` free walls. Driving `remaining` down to `0` therefore requires the chosen paid walls' combined `(time[i] + 1)` to be at least `n`, which is precisely the condition that every wall gets painted. Taking the per-wall minimum over pay-vs-skip explores every valid subset of paid walls implicitly, and memoization ensures each `(i, remaining)` state is solved once.\n\n**Common Gotchas.**\n- The 'skip' branch must leave `remaining` unchanged, not decrement it; if skipping also reduced `remaining`, you could 'cover' every wall for free and get a nonsensical cost of `0`. Only paid walls may reduce `remaining`.\n- Let `remaining` go negative (or clamp it) rather than forbidding over-coverage; coverage beyond `n` is harmless and must not be treated as failure.\n- Return infinity, not `0`, when you run out of walls with coverage still owed, or the `min` will wrongly pick an impossible path.\n\n**Complexity.** Time `O(n^2)`, since there are `O(n)` indices times `O(n)` distinct `remaining` values, each resolved in `O(1)`. Space `O(n^2)` for the memo plus `O(n)` recursion depth.\n\n**Interview mindset.** 'Choose a subset to meet a threshold at minimum cost' is a knapsack tell. Model the per-item pay/skip choice first with memoization, confirm the reframing (`time[i] + 1` coverage per paid wall), then flatten it to a 1-D array for the optimal space.",
        "rcs": "from typing import List  # cost and time are List[int], one entry per wall.\nfrom functools import lru_cache  # Memoizes solve by its (i, remaining) arguments so each state is computed once.\n\n\n# Reframing: paying for wall i buys time[i]+1 walls of coverage (the wall itself + time[i] free walls).\n# We need total coverage >= n at minimum cost. State = (index i, walls still needing coverage).\n\nclass Solution:  # LeetCode creates an object of this class and calls paintWalls on it.\n\n    def paintWalls(self, cost: List[int], time: List[int]) -> int:  # Minimum total cost to paint all walls.\n\n        # ==================== PHASE 1: SET UP SIZES AND THE MEMOIZED SOLVER ====================\n\n        n = len(cost)  # Number of walls; also the initial amount of coverage we must accumulate.\n\n        @lru_cache(maxsize=None)  # Cache solve by (i, remaining); overlapping subproblems make this collapse to O(n^2).\n        def solve(i, remaining):  # Min cost to cover `remaining` more walls using walls i..n-1.\n                                  # Execution flow: each call returns a base value or the min of pay vs skip.\n\n            # ==================== PHASE 2: BASE CASES ====================\n\n            if remaining <= 0:  # Everything that needed covering is already covered (over-coverage is fine).\n                return 0  # No further cost required on this path.\n\n            if i == n:  # Ran out of walls to pay for, but coverage is still owed (remaining > 0 here).\n                return float('inf')  # Impossible path; infinity makes the outer min reject it.\n\n            # ==================== PHASE 3: THE TWO CHOICES FOR WALL i ====================\n\n            pay = cost[i] + solve(i + 1, remaining - (time[i] + 1))  # Paid painter does wall i: pay cost[i],\n                                                                     # and it covers time[i]+1 walls (itself + time[i] free),\n                                                                     # so remaining drops by time[i]+1.\n\n            skip = solve(i + 1, remaining)  # Do NOT pay for wall i: no cost, and remaining is UNCHANGED, because only paid\n                                            # walls provide coverage; this wall will be one of the free ones a paid wall funds.\n                                            # Why not remaining-1: letting a skip reduce remaining would 'cover' walls for free and give cost 0.\n\n            # ==================== PHASE 4: TAKE THE CHEAPER CHOICE ====================\n\n            return min(pay, skip)  # Best cost from wall i onward is whichever decision leads to the smaller total.\n\n        # ==================== PHASE 5: SOLVE THE FULL PROBLEM ====================\n\n        return solve(0, n)  # Start at wall 0 needing to cover all n walls.",
        "plain": "from typing import List\nfrom functools import lru_cache\n\nclass Solution:\n    def paintWalls(self, cost: List[int], time: List[int]) -> int:\n        n = len(cost)\n        @lru_cache(maxsize=None)\n        def solve(i, remaining):\n            if remaining <= 0:\n                return 0\n            if i == n:\n                return float('inf')\n            pay = cost[i] + solve(i + 1, remaining - (time[i] + 1))\n            skip = solve(i + 1, remaining)\n            return min(pay, skip)\n        return solve(0, n)"
      },
      {
        "name": "Optimized — Bottom-Up 1-D Knapsack",
        "time": "O(n^2)",
        "space": "O(n)",
        "whenToUse": "The expected answer: same time, but a single array instead of a 2-D memo and no recursion.",
        "logic": "**What it asks.** Compute the minimum cost directly, reframing the problem as a knapsack: pick a subset of walls for the paid painter whose summed `(time[i] + 1)` capacity covers all `n` walls, minimizing total `cost`.\n\n**Why the naive idea fails.** The memoized version is already `O(n^2)` time but spends `O(n^2)` space on the `(i, remaining)` table and carries a recursion stack. Since processing wall `i` only reads values from 'before wall `i` was considered,' we can reuse a single 1-D array and update it in place, dropping the space to `O(n)`.\n\n**Key Idea.** Let `dp[j]` be the minimum cost to cover `j` walls. Initialize `dp[0] = 0` (covering zero walls is free) and every other `dp[j] = infinity` (not yet achievable). For each wall `i`, consider adding it to the paid set: paying `cost[i]` extends coverage by `time[i] + 1`. Treat it exactly like a 0/1 knapsack item and iterate `j` from `n` down to `0`, relaxing `dp[min(n, j + time[i] + 1)] = min(that, dp[j] + cost[i])`. The `min(n, ...)` caps coverage at `n` so any overshoot lands on the final bucket. Iterating `j` downward guarantees each wall is used at most once in a given update sweep.\n\n**Step-by-Step Approach.**\n1. Create `dp` of length `n + 1`, with `dp[0] = 0` and `dp[1..n] = infinity`.\n2. For each wall `i`, let `coverage = time[i] + 1`.\n3. For `j` from `n` down to `0`: if `dp[j]` is reachable, relax `target = min(n, j + coverage)` via `dp[target] = min(dp[target], dp[j] + cost[i])`.\n4. The downward `j` order ensures wall `i` contributes to each state at most once (true 0/1 behavior).\n5. After all walls, `dp[n]` is the minimum cost to cover all `n` walls; return it.\n\n**Why it works.** `dp[j]` always holds the cheapest way to reach exactly (or at least, after capping) `j` covered walls using the walls processed so far. Adding wall `i` to a configuration that covered `j` walls yields `j + time[i] + 1` coverage for an extra `cost[i]`, which is precisely the relaxation. Capping at `n` merges all over-coverage into `dp[n]`, the only bucket whose meaning is 'all walls painted,' so the final `dp[n]` is the global minimum. The reverse `j` loop is the standard 0/1-knapsack trick that prevents a single wall from being counted multiple times within one item's sweep.\n\n**Common Gotchas.**\n- Iterate `j` from high to low; a low-to-high loop would let the same wall be reused, turning it into unbounded knapsack and undercounting cost.\n- Cap the target index with `min(n, j + time[i] + 1)` so coverage beyond `n` is not lost or indexed out of bounds; over-coverage is valid and must funnel into `dp[n]`.\n- Skip relaxing from an unreachable `dp[j]` (infinity) to avoid overflow-style additions and pointless writes.\n\n**Complexity.** Time `O(n^2)`, from `n` walls times the `O(n)` inner sweep over `j`. Space `O(n)` for the single `dp` array.\n\n**Interview mindset.** Once a DP's state is '(items considered, budget/target reached),' collapse it to a 1-D array indexed by the target and update in reverse for 0/1 items. Spotting that each paid wall buys `time[i] + 1` coverage is the whole trick; the rest is a textbook min-cost knapsack.",
        "rcs": "from typing import List  # cost and time are List[int], one entry per wall.\n\n\n# Knapsack reframing: paying for wall i costs cost[i] and covers time[i]+1 walls.\n# dp[j] = minimum cost to cover j walls; we want dp[n]. Cap coverage at n since any overshoot is wasted.\n\nclass Solution:  # LeetCode creates an object of this class and calls paintWalls on it.\n\n    def paintWalls(self, cost: List[int], time: List[int]) -> int:  # Minimum total cost to paint all walls.\n\n        # ==================== PHASE 1: INITIALIZE THE 1-D DP ARRAY ====================\n\n        n = len(cost)  # Number of walls; dp is indexed 0..n by walls-covered.\n\n        dp = [float('inf')] * (n + 1)  # dp[j] = min cost to cover j walls; start all states unreachable...\n        dp[0] = 0  # ...except covering zero walls, which costs nothing. This is the only seeded state.\n                   # State: as walls are processed, dp[j] drops to the cheapest cost achieving j coverage.\n\n        # ==================== PHASE 2: TREAT EACH WALL AS A 0/1 KNAPSACK ITEM ====================\n\n        for i in range(n):  # Decide, for each wall, whether the paid painter takes it.\n\n            coverage = time[i] + 1  # Paying for wall i covers itself PLUS time[i] free walls during that window.\n\n            # ==================== PHASE 3: RELAX STATES IN REVERSE (0/1 KNAPSACK ORDER) ====================\n\n            for j in range(n, -1, -1):  # Iterate j from n DOWN to 0 so wall i is used at most once per sweep.\n                                        # Why downward: a low-to-high loop would let this same wall be reused (unbounded knapsack).\n\n                if dp[j] == float('inf'):  # This coverage level is not yet reachable, so nothing to extend from it.\n                    continue  # Skip to avoid adding cost to an impossible state.\n\n                target = min(n, j + coverage)  # Adding wall i reaches j+coverage walls, capped at n (over-coverage funnels to dp[n]).\n\n                dp[target] = min(dp[target], dp[j] + cost[i])  # Relax: cheaper to reach `target` via paying for wall i from state j?\n                                                               # State change: dp[target] becomes the smaller of its old value and dp[j]+cost[i].\n\n        # ==================== PHASE 4: ANSWER IS THE COST TO COVER ALL n WALLS ====================\n\n        return dp[n]  # Minimum cost whose chosen paid walls cover all n walls (free walls fill the rest).",
        "plain": "from typing import List\n\nclass Solution:\n    def paintWalls(self, cost: List[int], time: List[int]) -> int:\n        n = len(cost)\n        dp = [float('inf')] * (n + 1)\n        dp[0] = 0\n        for i in range(n):\n            coverage = time[i] + 1\n            for j in range(n, -1, -1):\n                if dp[j] == float('inf'):\n                    continue\n                target = min(n, j + coverage)\n                dp[target] = min(dp[target], dp[j] + cost[i])\n        return dp[n]"
      }
    ],
    "patternRecognition": [
      "'Pick a subset to meet a threshold at minimum cost' → min-cost knapsack DP.",
      "A resource (paid time) that funds free work → reframe each paid item as buying time[i]+1 units of capacity.",
      "State is (items considered, target remaining) and the target is bounded → collapse to a 1-D dp array."
    ],
    "interviewRecall": [
      "Reframe: paying for wall i covers time[i]+1 walls; need total coverage >= n at min cost.",
      "dp[j] = min cost to cover j walls; iterate j downward for 0/1 knapsack and cap target at n.",
      "Answer is dp[n]; seed dp[0]=0 and everything else as infinity."
    ]
  },
  {
    "id": "russian-doll-envelopes",
    "lc": 354,
    "title": "Russian Doll Envelopes",
    "difficulty": "Hard",
    "category": "1-D Dynamic Programming",
    "link": "https://leetcode.com/problems/russian-doll-envelopes/",
    "meta": {
      "pattern": "Longest Increasing Subsequence",
      "dataStructure": "Array",
      "technique": "Sort + LIS with patience sorting"
    },
    "description": "You are given a 2-D array `envelopes` where `envelopes[i] = [w, h]` are the width and height of the `i`-th envelope. One envelope fits inside another only when **both** its width and its height are **strictly greater** — you may not rotate envelopes.\n\nReturn the maximum number of envelopes you can **Russian-doll** (nest one inside another, deepest chain).\n\nThis is a disguised **Longest Increasing Subsequence** problem in two dimensions. Sorting collapses one dimension so that a single increasing-subsequence pass handles the other.",
    "constraints": [
      "`1 <= envelopes.length <= 10^5`",
      "`envelopes[i].length == 2`",
      "`1 <= w, h <= 10^5`"
    ],
    "notes": [
      "'Strictly greater' in both dimensions is the whole difficulty — equal widths must NOT be allowed to nest.",
      "The `O(n log n)` solution hinges on a clever tie-break: sort heights DESCENDING among equal widths.",
      "This generalizes the classic LIS; knowing LIS cold makes this tractable."
    ],
    "examples": [
      {
        "input": "envelopes = [[5,4],[6,4],[6,7],[2,3]]",
        "output": "3",
        "reasoning": "Sort gives [2,3],[5,4],[6,7] as one valid nesting chain: [2,3] => [5,4] => [6,7].",
        "visual": "```\n[2,3] inside [5,4] inside [6,7]\n  2<5<6  (widths strictly increase)\n  3<4<7  (heights strictly increase)\n  depth = 3\n```"
      },
      {
        "input": "envelopes = [[1,1],[1,1],[1,1]]",
        "output": "1",
        "reasoning": "All envelopes are identical; equal dimensions cannot nest, so only one can be used."
      },
      {
        "input": "envelopes = [[4,5],[4,6],[6,7],[2,3],[1,1]]",
        "output": "4",
        "reasoning": "[1,1] => [2,3] => [4,6] => [6,7] nests four deep; note [4,5] and [4,6] share a width so only one of them may appear.",
        "visual": "```\nwidth : 1 -> 2 -> 4 -> 6\nheight: 1 -> 3 -> 6 -> 7\n(the other width-4 envelope [4,5] is skipped)\n```"
      },
      {
        "input": "envelopes = [[30,50],[12,2],[3,4],[12,15]]",
        "output": "3",
        "reasoning": "[3,4] => [12,15] => [30,50] gives depth 3; [12,2] shares width 12 with [12,15] but cannot nest with it."
      }
    ],
    "approaches": [
      {
        "name": "Sort + O(n^2) LIS DP",
        "time": "O(n^2)",
        "space": "O(n)",
        "whenToUse": "The intuitive first answer; fine for small n, and the clearest way to see this is LIS in 2-D.",
        "logic": "**What it asks.** Find the longest chain of envelopes in which each later envelope is strictly larger than the previous one in BOTH width and height. 'Longest chain under a strict two-dimensional ordering' is precisely the Longest Increasing Subsequence problem, just with a 2-D comparison instead of a 1-D one.\n\n**Why the naive idea fails.** Trying every subset of envelopes and checking whether it forms a valid nesting chain is exponential (`2^n` subsets), which is hopeless beyond a handful of envelopes. We need the overlapping-subproblem structure of LIS instead of brute enumeration.\n\n**Key Idea.** First sort the envelopes so that one dimension is non-decreasing; sort by width ascending, breaking ties by height ascending for this version. After sorting, any valid nesting chain must appear left-to-right in the array, so the problem reduces to: pick the longest subsequence whose widths are strictly increasing AND whose heights are strictly increasing. Define `dp[i]` = the length of the longest valid nesting chain that ENDS at envelope `i`. To fill `dp[i]`, look back at every earlier envelope `j` that strictly fits inside `i` and extend its best chain.\n\n**Step-by-Step Approach.**\n1. Sort `envelopes` by width ascending, and by height ascending for equal widths.\n2. Initialize `dp[i] = 1` for all `i`, since each envelope alone is a chain of length 1.\n3. For each `i`, scan all `j < i`; if `envelopes[j][0] < envelopes[i][0]` AND `envelopes[j][1] < envelopes[i][1]`, then `i` can sit outside `j`, so set `dp[i] = max(dp[i], dp[j] + 1)`.\n4. The answer is `max(dp)`, the deepest chain ending anywhere.\n\n**Why it works.** Sorting guarantees that if envelope `j` can nest inside `i`, then `j` comes before `i`, so every valid chain is a left-to-right subsequence and no nesting relationship is missed. The `dp` recurrence is the standard LIS recurrence: the longest chain ending at `i` is one more than the best chain ending at any strictly-smaller predecessor. Checking BOTH coordinates strictly (`<`, not `<=`) enforces the 'strictly greater in both dimensions' rule and automatically rejects equal-width or equal-height pairs.\n\n**Common Gotchas.**\n- Both comparisons must be strict (`<`). Using `<=` would let equal widths or equal heights nest, which is wrong.\n- Sorting is not optional: without it, a valid predecessor could appear after `i` and be missed by the `j < i` scan.\n- The answer is `max(dp)`, not `dp[-1]`; the deepest chain may end before the last envelope.\n\n**Complexity.** Time `O(n^2)` for the nested scan over all pairs. Space `O(n)` for the `dp` array.\n\n**Interview mindset.** Recognizing 'nest / stack / chain under a multi-key strict ordering' as LIS is the whole battle. State this `O(n^2)` version to show you see the LIS structure, then upgrade to the `O(n log n)` tie-break trick below.",
        "rcs": "from typing import List  # List[List[int]] is the array of [width, height] pairs.\n\n\nclass Solution:  # LeetCode creates an object of this class and calls maxEnvelopes on it.\n\n    def maxEnvelopes(self, envelopes: List[List[int]]) -> int:  # Return the max nesting depth.\n\n        # ==================== PHASE 1: SORT SO VALID CHAINS READ LEFT-TO-RIGHT ====================\n\n        envelopes.sort(key=lambda e: (e[0], e[1]))  # Sort by width ASC, then height ASC for equal widths.\n                                                    # Why: after sorting, any envelope that fits inside envelope i must appear\n                                                    # before i, so a valid nesting chain is just a left-to-right subsequence.\n                                                    # State: envelopes is now ordered; original indices no longer matter.\n\n        n = len(envelopes)  # Number of envelopes; dp will have one slot per envelope.\n\n        # ==================== PHASE 2: dp[i] = LONGEST CHAIN ENDING AT ENVELOPE i ====================\n\n        dp = [1] * n  # Every envelope alone is a chain of length 1, the base case for LIS.\n                      # State: dp[i] will grow as we find predecessors that strictly fit inside i.\n\n        best = 1  # Running maximum chain length seen so far (answer is the deepest chain ending anywhere).\n\n        # ==================== PHASE 3: FILL dp WITH THE LIS RECURRENCE (2-D STRICT COMPARE) ====================\n\n        for i in range(n):  # Compute dp[i] for each envelope in sorted order.\n                            # Loop invariant: dp[j] for all j < i already holds the best chain ending at j.\n\n            for j in range(i):  # Look back at every earlier envelope as a possible inner envelope.\n\n                if envelopes[j][0] < envelopes[i][0] and envelopes[j][1] < envelopes[i][1]:  # j fits STRICTLY inside i?\n                                                                                             # Both width and height must be\n                                                                                             # strictly greater for nesting; < not <=.\n\n                    dp[i] = max(dp[i], dp[j] + 1)  # Extend j's best chain by placing i on the outside.\n                                                  # State change: dp[i] becomes the longest chain ending at i.\n\n            best = max(best, dp[i])  # Track the global deepest nesting.\n                                     # State change: best never decreases.\n\n        # ==================== PHASE 4: RETURN THE DEEPEST CHAIN ====================\n\n        return best  # The maximum number of envelopes that can be Russian-dolled.",
        "plain": "class Solution:\n    def maxEnvelopes(self, envelopes: List[List[int]]) -> int:\n        envelopes.sort(key=lambda e: (e[0], e[1]))\n        n = len(envelopes)\n        dp = [1] * n\n        best = 1\n        for i in range(n):\n            for j in range(i):\n                if envelopes[j][0] < envelopes[i][0] and envelopes[j][1] < envelopes[i][1]:\n                    dp[i] = max(dp[i], dp[j] + 1)\n            best = max(best, dp[i])\n        return best"
      },
      {
        "name": "Optimized — Sort (height DESC on ties) + LIS via Binary Search",
        "time": "O(n log n)",
        "space": "O(n)",
        "whenToUse": "The expected answer for large n; reduces the 2-D problem to a 1-D LIS solvable with patience sorting.",
        "logic": "**What it asks.** Find the deepest nesting chain under the strict two-dimensional ordering, but fast enough for `n` up to `10^5`, where the `O(n^2)` scan is far too slow.\n\n**Why the naive idea fails.** The `O(n^2)` LIS re-scans all earlier envelopes for each one. Classic 1-D LIS can be sped up to `O(n log n)` with patience sorting (binary search over a 'tails' array), but that technique only compares a SINGLE value per element. Here each envelope has two values, so we must first collapse the width dimension away via sorting, leaving a pure 1-D LIS on heights.\n\n**Key Idea.** Sort by width ASCENDING, and — this is the clever part — for envelopes that share the same width, sort by height DESCENDING. Then run a standard `O(n log n)` Longest Increasing Subsequence on the heights alone.\n\n  Why the height-DESC tie-break is exactly right: once widths are non-decreasing left-to-right, a width-increasing chain would seem to allow picking two envelopes of the SAME width — which is illegal, because nesting needs STRICTLY greater width. We must forbid any run of equal-width envelopes from contributing more than one element to the heights-LIS. Sorting their heights in DESCENDING order accomplishes this automatically: within one width group the heights go large-to-small, so they can never form an increasing subsequence among themselves. The strictly-increasing heights-LIS therefore can pick at most one height from each width group, which means it only ever chains envelopes whose widths are strictly increasing — and whose heights are strictly increasing because the LIS is strict. Both strictness conditions fall out of one tie-break.\n\n**Step-by-Step Approach.**\n1. Sort `envelopes` by `(width ascending, height descending)`.\n2. Extract the heights in this sorted order into a list `heights`.\n3. Run the patience-sorting LIS on `heights`: maintain a `tails` array where `tails[k]` is the smallest possible tail of any increasing subsequence of length `k+1`.\n4. For each height `h`, binary-search (`bisect_left`) for the first entry in `tails` that is `>= h`. If found, overwrite it with `h`; otherwise append `h` (extending the longest subsequence).\n5. The length of `tails` at the end is the LIS length, which is the answer.\n\n**Why it works.** Sorting by width ascending means every candidate inner envelope precedes its outer one. The height-DESC tie-break guarantees equal-width envelopes are listed with non-increasing heights, so a STRICTLY increasing subsequence of heights can include at most one of them — enforcing strict width increase for free. A strict heights-LIS then enforces strict height increase. `bisect_left` (first element `>= h`) makes the subsequence strictly increasing: it replaces an equal-or-larger tail rather than appending after an equal value, so equal heights never extend the chain.\n\n**Common Gotchas.**\n- The tie-break MUST be height descending. Height ascending would let two equal-width envelopes both enter the heights-LIS and falsely nest.\n- Use `bisect_left` (not `bisect_right`); `bisect_right` would permit equal heights to extend the chain, breaking the strict-height requirement.\n- `tails` is NOT the actual subsequence — only its LENGTH is meaningful; do not try to read envelopes back out of it.\n\n**Complexity.** Time `O(n log n)`: the sort plus `n` binary searches of `O(log n)` each. Space `O(n)` for the heights and `tails` arrays.\n\n**Interview mindset.** The signature move here is 'sort one dimension away, then LIS the other.' Whenever a 2-D strict-ordering chain appears, collapse a coordinate by sorting and reach for patience-sorting LIS. The height-descending tie-break to kill same-key nesting is a reusable trick worth memorizing.",
        "rcs": "from typing import List  # List[List[int]] is the array of [width, height] pairs.\nfrom bisect import bisect_left  # bisect_left(a, x) returns the leftmost index i where a[i] >= x (strict-LIS binary search).\n\n\nclass Solution:  # LeetCode creates an object of this class and calls maxEnvelopes on it.\n\n    def maxEnvelopes(self, envelopes: List[List[int]]) -> int:  # O(n log n) via sort + LIS on heights.\n\n        # ==================== PHASE 1: THE CLEVER SORT (WIDTH ASC, HEIGHT DESC ON TIES) ====================\n\n        envelopes.sort(key=lambda e: (e[0], -e[1]))  # Width ascending; for EQUAL widths, height DESCENDING (note the -e[1]).\n                                                     # Why height DESC: once widths are non-decreasing, a strict-increasing LIS on\n                                                     # heights could otherwise pick two SAME-width envelopes, which cannot legally\n                                                     # nest (nesting needs STRICTLY greater width). Listing a width group's heights\n                                                     # large-to-small makes them non-increasing, so a strictly increasing heights-LIS\n                                                     # can grab at most ONE per width group -> strict width increase comes for free.\n\n        # ==================== PHASE 2: COLLAPSE TO A 1-D LIS PROBLEM ON HEIGHTS ====================\n\n        heights = [e[1] for e in envelopes]  # Pull out just the heights in the sorted order.\n                                             # The whole 2-D problem is now: longest STRICTLY increasing subsequence of heights.\n\n        # ==================== PHASE 3: PATIENCE-SORTING LIS IN O(n log n) ====================\n\n        tails = []  # tails[k] = the smallest possible tail value of an increasing subsequence of length k+1.\n                    # Why this works: keeping each length's tail as small as possible maximizes room to extend later.\n                    # State: len(tails) always equals the length of the longest increasing subsequence found so far.\n\n        for h in heights:  # Process heights left-to-right (which is sorted width order).\n\n            idx = bisect_left(tails, h)  # First position holding a value >= h.\n                                         # Why bisect_left (>=) not bisect_right (>): replacing an equal-or-larger tail keeps the\n                                         # subsequence STRICTLY increasing; equal heights must NOT extend the chain.\n\n            if idx == len(tails):  # h is larger than every current tail -> it extends the longest subsequence.\n                tails.append(h)  # Grow the LIS by one.\n                                 # State change: a new, longer increasing subsequence length is now achievable.\n            else:  # h can replace an existing tail to make that length's tail smaller.\n                tails[idx] = h  # Overwrite the first tail >= h, leaving more room for future extensions.\n                                # State change: tails[idx] shrinks; the LIS length is unchanged this step.\n\n        # ==================== PHASE 4: THE LIS LENGTH IS THE ANSWER ====================\n\n        return len(tails)  # Length of the longest strictly increasing heights subsequence = deepest valid nesting.",
        "plain": "class Solution:\n    def maxEnvelopes(self, envelopes: List[List[int]]) -> int:\n        envelopes.sort(key=lambda e: (e[0], -e[1]))\n        heights = [e[1] for e in envelopes]\n        tails = []\n        for h in heights:\n            idx = bisect_left(tails, h)\n            if idx == len(tails):\n                tails.append(h)\n            else:\n                tails[idx] = h\n        return len(tails)"
      }
    ],
    "patternRecognition": [
      "'Nest / stack / chain items under a strict ordering in 2+ keys' → sort one key, LIS the other.",
      "'Strictly greater in both dimensions' → collapse a dimension by sorting, with a tie-break to forbid equal-key nesting.",
      "Need an LIS but n is large → patience sorting with bisect gives O(n log n)."
    ],
    "interviewRecall": [
      "Sort width ASC, height DESC on ties — the DESC tie-break stops same-width envelopes from nesting.",
      "Run a STRICT LIS on heights with bisect_left (first tail >= h), not bisect_right.",
      "len(tails) is the LIS length; tails is not the actual subsequence."
    ]
  }
    ]);

  window.BLIND75.register("2-D Dynamic Programming", [
  {
    "id": "matrix-chain-multiplication",
    "lc": 0,
    "title": "Matrix Chain Multiplication",
    "difficulty": "Hard",
    "category": "2-D Dynamic Programming",
    "link": "",
    "meta": {
      "pattern": "Interval DP",
      "dataStructure": "Array",
      "technique": "Partition at every split point"
    },
    "description": "You are given an array `p` of length `n + 1` describing a chain of `n` matrices, where matrix `i` (for `1 <= i <= n`) has dimensions `p[i-1] x p[i]`. Multiplying an `a x b` matrix by a `b x c` matrix costs `a * b * c` scalar multiplications and yields an `a x c` matrix.\n\nMatrix multiplication is **associative**, so `(A B) C` and `A (B C)` give the same product — but the number of scalar multiplications can differ wildly depending on the parenthesization. Find the **minimum** total scalar multiplications needed to compute the whole chain.\n\nThis is the archetypal **interval (range) DP** problem: the optimal cost of a range is found by trying every place to split it into two sub-ranges.",
    "constraints": [
      "`2 <= p.length <= 100`  (so there are `n = p.length - 1` matrices)",
      "`1 <= p[i] <= 500`",
      "The chain has at least one matrix; a single matrix costs `0`."
    ],
    "notes": [
      "You are NOT multiplying the matrices — only computing the cheapest multiplication ORDER (cost).",
      "The split point `k` means compute the product of matrices `i..k`, then `k+1..j`, then combine them.",
      "Bottom-up fills the DP table by increasing chain length so every sub-interval is ready before it is used."
    ],
    "examples": [
      {
        "input": "p = [40, 20, 30, 10, 30]",
        "output": "26000",
        "reasoning": "Four matrices A(40x20) B(20x30) C(30x10) D(10x30). The optimal order ((A(BC))D) costs 26000 vs 30000+ for other orders.",
        "visual": "```\nA:40x20  B:20x30  C:30x10  D:10x30\nbest = ((A (B C)) D)\n  BC   : 20*30*10 = 6000  -> 20x10\n  A(BC): 40*20*10 = 8000  -> 40x10\n  (..)D: 40*10*30 = 12000 -> 40x30\n  total = 26000\n```"
      },
      {
        "input": "p = [10, 20, 30]",
        "output": "6000",
        "reasoning": "Two matrices A(10x20), B(20x30); only one order exists: 10*20*30 = 6000."
      },
      {
        "input": "p = [10, 20]",
        "output": "0",
        "reasoning": "A single matrix needs no multiplication, so the cost is 0."
      },
      {
        "input": "p = [10, 30, 5, 60]",
        "output": "4500",
        "reasoning": "Matrices A(10x30) B(30x5) C(5x60). ((AB)C) = 1500 + 3000 = 4500; (A(BC)) = 9000 + 18000 = 27000, so split after A.",
        "visual": "```\n((A B) C):  AB=10*30*5=1500, then 10*5*60=3000  -> 4500  (best)\n(A (B C)):  BC=30*5*60=9000, then 10*30*60=18000 -> 27000\n```"
      }
    ],
    "approaches": [
      {
        "name": "Top-Down Memoization over (i, j)",
        "time": "O(n^3)",
        "space": "O(n^2)",
        "whenToUse": "The most intuitive DP once you see the 'try every split' recurrence; writes almost exactly like the math.",
        "logic": "**What it asks.** Among all ways to parenthesize the matrix chain, find the one minimizing total scalar multiplications. Every full parenthesization has a unique OUTERMOST multiplication, which splits the chain into a left group and a right group at some matrix boundary `k`.\n\n**Why the naive idea fails.** Enumerating every parenthesization is counted by the Catalan numbers, which grow exponentially, so brute force is intractable. But the same sub-chains (intervals) are re-parenthesized over and over, which is the classic overlapping-subproblems signal for DP.\n\n**Key Idea.** Let `cost(i, j)` be the minimum scalar multiplications to multiply matrices `i` through `j` inclusive. The last multiplication combines the product of `i..k` (an `p[i-1] x p[k]` matrix) with the product of `k+1..j` (a `p[k] x p[j]` matrix), costing `p[i-1] * p[k] * p[j]` on top of solving both sub-chains optimally. Try every split `k` from `i` to `j-1` and take the minimum:\n\n  `cost(i, j) = min over k in [i, j-1] of ( cost(i, k) + cost(k+1, j) + p[i-1] * p[k] * p[j] )`\n\n  The base case is `cost(i, i) = 0`: a single matrix needs no multiplication. Memoize `cost(i, j)` so each interval is solved once.\n\n**Step-by-Step Approach.**\n1. Let `n = len(p) - 1` be the number of matrices, indexed `1..n`.\n2. Define a recursive `cost(i, j)` returning `0` when `i == j`.\n3. Otherwise try every split `k` in `[i, j-1]`, recursing on `cost(i, k)` and `cost(k+1, j)`, adding the combine cost `p[i-1] * p[k] * p[j]`, and keep the minimum.\n4. Cache each `(i, j)` result; return `cost(1, n)`.\n\n**Why it works.** Any optimal parenthesization of `i..j` has some outermost split `k`; its two halves must themselves be optimally parenthesized (optimal substructure), or we could improve the whole by improving a half. Trying ALL `k` guarantees we consider the true optimal split, and memoization ensures each of the `O(n^2)` intervals is computed once.\n\n**Common Gotchas.**\n- Indexing: matrix `i` is `p[i-1] x p[i]`, so the combine cost uses `p[i-1]`, `p[k]`, and `p[j]` — off-by-one here is the #1 bug.\n- The base case is `i == j` returning `0`, NOT `i > j`; a single matrix is free.\n- The split `k` ranges over `[i, j-1]` so that both `i..k` and `k+1..j` are non-empty.\n\n**Complexity.** Time `O(n^3)`: `O(n^2)` intervals, each trying up to `O(n)` splits. Space `O(n^2)` for the memo plus `O(n)` recursion depth.\n\n**Interview mindset.** 'Optimal way to combine a sequence by choosing split points' is the interval-DP tell. Write the `cost(i, j) = min over k (...)` recurrence first; it reads straight off the problem, then add memoization.",
        "rcs": "from typing import List  # p is a List[int] of length n+1 giving the chain's dimensions.\nfrom functools import lru_cache  # Decorator that memoizes cost(i, j) so each interval is computed once.\n\n\nclass Solution:  # A sensible class wrapper; matrixChainOrder(p) returns the minimum cost.\n\n    def matrixChainOrder(self, p: List[int]) -> int:  # Min scalar multiplications for the whole chain.\n\n        # ==================== PHASE 1: SET UP MATRIX COUNT AND INDEXING ====================\n\n        n = len(p) - 1  # Number of matrices; matrix i (1-based) has dimensions p[i-1] x p[i].\n                        # Why n+1 dims for n matrices: adjacent matrices share a dimension, so they chain.\n\n        if n <= 1:  # Zero or one matrix needs no multiplication at all.\n            return 0  # A single matrix (or empty chain) costs 0.\n\n        # ==================== PHASE 2: RECURSIVE cost(i, j) WITH MEMOIZATION ====================\n\n        @lru_cache(maxsize=None)  # Cache results keyed by (i, j); the O(n^2) intervals are each solved once.\n        def cost(i: int, j: int) -> int:  # Min cost to multiply matrices i through j inclusive (1-based).\n\n            if i == j:  # BASE CASE: a single matrix needs no multiplication.\n                return 0  # Cost of multiplying one matrix is zero.\n\n            best = float('inf')  # Track the cheapest split for this interval.\n                                 # State: best shrinks as we try each split point k.\n\n            for k in range(i, j):  # Try every place to split i..j into i..k and (k+1)..j.\n                                   # k ranges [i, j-1] so BOTH halves are non-empty.\n\n                # Combine cost: product of i..k is p[i-1] x p[k]; product of (k+1)..j is p[k] x p[j];\n                # multiplying those two costs p[i-1] * p[k] * p[j] scalar multiplications.\n                combine = p[i - 1] * p[k] * p[j]  # The cost of the OUTERMOST multiplication at split k.\n\n                total = cost(i, k) + cost(k + 1, j) + combine  # Optimal left + optimal right + combine here.\n                                                               # Optimal substructure: each half solved optimally.\n\n                best = min(best, total)  # Keep the minimum over all split points.\n                                         # State change: best holds the cheapest parenthesization of i..j so far.\n\n            return best  # The minimum cost to fully multiply matrices i..j.\n\n        # ==================== PHASE 3: SOLVE THE WHOLE CHAIN 1..n ====================\n\n        return cost(1, n)  # Minimum scalar multiplications for the entire chain.",
        "plain": "class Solution:\n    def matrixChainOrder(self, p: List[int]) -> int:\n        n = len(p) - 1\n        if n <= 1:\n            return 0\n        @lru_cache(maxsize=None)\n        def cost(i, j):\n            if i == j:\n                return 0\n            best = float('inf')\n            for k in range(i, j):\n                total = cost(i, k) + cost(k + 1, j) + p[i - 1] * p[k] * p[j]\n                best = min(best, total)\n            return best\n        return cost(1, n)"
      },
      {
        "name": "Optimized — Bottom-Up Interval DP by Chain Length",
        "time": "O(n^3)",
        "space": "O(n^2)",
        "whenToUse": "The expected clean answer: an explicit table filled by increasing interval length, no recursion overhead.",
        "logic": "**What it asks.** Compute the same minimum multiplication cost, but iteratively — filling a 2-D table so that every sub-interval is finished before any larger interval that depends on it.\n\n**Why the naive idea fails.** Top-down memoization is correct but carries recursion overhead and risks deep call stacks. The dependency structure here is clean and predictable, so an explicit bottom-up fill is both faster in practice and easier to reason about.\n\n**Key Idea.** `dp[i][j]` = minimum scalar multiplications to multiply matrices `i..j`. A larger interval only ever depends on STRICTLY SHORTER intervals (`dp[i][k]` and `dp[k+1][j]`, both shorter than `i..j`). So if we fill the table in order of increasing interval LENGTH, every value we read has already been computed. The transition is the same split recurrence:\n\n  `dp[i][j] = min over k in [i, j-1] of ( dp[i][k] + dp[k+1][j] + p[i-1] * p[k] * p[j] )`\n\n  Diagonal `dp[i][i] = 0` (single matrices) seeds the table.\n\n**Step-by-Step Approach.**\n1. Let `n = len(p) - 1`. Build an `(n+1) x (n+1)` table `dp`, with the diagonal `dp[i][i] = 0`.\n2. Iterate the interval `length` from `2` to `n` (number of matrices in the interval).\n3. For each starting index `i`, set `j = i + length - 1` (the interval `i..j` of that length).\n4. For each split `k` in `[i, j-1]`, compute `dp[i][k] + dp[k+1][j] + p[i-1] * p[k] * p[j]` and keep the minimum into `dp[i][j]`.\n5. The answer is `dp[1][n]`.\n\n**Why it works.** Filling by increasing length guarantees that when computing `dp[i][j]`, both `dp[i][k]` (interval length `k - i + 1 < j - i + 1`) and `dp[k+1][j]` (length `j - k < j - i + 1`) are strictly shorter and therefore already final. This is exactly the memoized recurrence evaluated in a valid topological order, so it yields the same optimal values without recursion.\n\n**Common Gotchas.**\n- Fill by LENGTH, not by raw `i`/`j` loops in the wrong order, or you will read table cells that are not yet computed.\n- The combine term is `p[i-1] * p[k] * p[j]`; the `p[i-1]` (left matrix's row count) is the easiest index to get wrong.\n- Initialize off-diagonal cells to infinity before taking the `min`, and keep the diagonal at `0`.\n\n**Complexity.** Time `O(n^3)`: `O(n^2)` intervals times `O(n)` splits each. Space `O(n^2)` for the table.\n\n**Interview mindset.** When intervals depend only on shorter intervals, 'loop over length, then start, then split' is the canonical bottom-up interval-DP skeleton — the same shape reused for burst balloons, palindrome partitioning, and optimal BSTs.",
        "rcs": "from typing import List  # p is a List[int] of length n+1 giving the chain's dimensions.\n\n\nclass Solution:  # A sensible class wrapper; matrixChainOrder(p) returns the minimum cost.\n\n    def matrixChainOrder(self, p: List[int]) -> int:  # Min scalar multiplications, bottom-up.\n\n        # ==================== PHASE 1: COUNT MATRICES AND ALLOCATE THE DP TABLE ====================\n\n        n = len(p) - 1  # Number of matrices; matrix i (1-based) is p[i-1] x p[i].\n\n        if n <= 1:  # Zero or one matrix needs no multiplication.\n            return 0  # Single matrix (or empty chain) costs 0.\n\n        dp = [[0] * (n + 1) for _ in range(n + 1)]  # dp[i][j] = min cost to multiply matrices i..j.\n                                                    # Why (n+1) x (n+1): 1-based indices, diagonal dp[i][i] left at 0.\n                                                    # State: the diagonal (single matrices) is already correct at 0.\n\n        # ==================== PHASE 2: FILL BY INCREASING INTERVAL LENGTH ====================\n\n        for length in range(2, n + 1):  # length = number of matrices in the interval, from 2 up to n.\n                                        # Why length order: dp[i][j] depends only on STRICTLY shorter intervals,\n                                        # so filling shortest-first guarantees those are already final.\n\n            for i in range(1, n - length + 2):  # Starting matrix index i for an interval of this length.\n\n                j = i + length - 1  # Ending matrix index so the interval i..j has exactly `length` matrices.\n\n                dp[i][j] = float('inf')  # Seed with infinity before minimizing over split points.\n                                         # State: any real split will lower this below inf.\n\n                # ---------- try every split point k dividing i..j into i..k and (k+1)..j ----------\n                for k in range(i, j):  # k ranges [i, j-1] so both halves are non-empty.\n\n                    # Combine cost: (i..k) is p[i-1] x p[k], (k+1..j) is p[k] x p[j];\n                    # multiplying them costs p[i-1] * p[k] * p[j].\n                    cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]  # Left + right + combine.\n                                                                            # Both halves already final (shorter).\n\n                    if cost < dp[i][j]:  # Keep the cheapest split for this interval.\n                        dp[i][j] = cost  # State change: dp[i][j] holds the best parenthesization of i..j so far.\n\n        # ==================== PHASE 3: THE WHOLE CHAIN IS dp[1][n] ====================\n\n        return dp[1][n]  # Minimum scalar multiplications to multiply all n matrices.",
        "plain": "class Solution:\n    def matrixChainOrder(self, p: List[int]) -> int:\n        n = len(p) - 1\n        if n <= 1:\n            return 0\n        dp = [[0] * (n + 1) for _ in range(n + 1)]\n        for length in range(2, n + 1):\n            for i in range(1, n - length + 2):\n                j = i + length - 1\n                dp[i][j] = float('inf')\n                for k in range(i, j):\n                    cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]\n                    if cost < dp[i][j]:\n                        dp[i][j] = cost\n        return dp[1][n]"
      }
    ],
    "patternRecognition": [
      "'Optimal order to combine a sequence' where each merge has a cost → interval (range) DP.",
      "Answer for a range = best over all split points of (left range + right range + merge cost).",
      "Dimensions chain via a shared index (p[i-1] x p[i]) → matrix chain / optimal parenthesization."
    ],
    "interviewRecall": [
      "Recurrence: dp[i][j] = min over k of dp[i][k] + dp[k+1][j] + p[i-1]*p[k]*p[j].",
      "Bottom-up: loop over interval LENGTH first, then start i, then split k.",
      "Combine cost uses p[i-1], p[k], p[j]; base case dp[i][i] = 0."
    ]
  }
    ]);

  window.BLIND75.register("Bit Manipulation", [
  {
    "id": "power-of-two",
    "lc": 231,
    "title": "Power of Two",
    "difficulty": "Easy",
    "category": "Bit Manipulation",
    "link": "https://leetcode.com/problems/power-of-two/",
    "meta": {
      "pattern": "Bit Manipulation",
      "dataStructure": "Integer (bits)",
      "technique": "Clear the lowest set bit (n & (n-1))"
    },
    "description": "Given an integer `n`, return `true` if it is a **power of two**, and `false` otherwise.\n\nAn integer `n` is a power of two if there exists an integer `x` such that `n == 2^x`. The valid powers are `1` (which is `2^0`), `2`, `4`, `8`, `16`, and so on — always positive.\n\nZero and all negative integers are **not** powers of two, so any `n <= 0` must return `false`.",
    "constraints": [
      "`-2^31 <= n <= 2^31 - 1`"
    ],
    "notes": [
      "`1` counts as a power of two since `2^0 == 1`.",
      "Could you solve it without loops or recursion, in `O(1)` time?"
    ],
    "examples": [
      {
        "input": "n = 1",
        "output": "true",
        "reasoning": "1 equals 2^0, so it is a power of two.",
        "visual": "```\nn = 1 -> binary 0001\nexactly one bit set -> power of two\n```"
      },
      {
        "input": "n = 16",
        "output": "true",
        "reasoning": "16 equals 2^4.",
        "visual": "```\nn    = 16 -> 1 0000\nn-1  = 15 -> 0 1111\nn & (n-1) = 0 0000 = 0  -> power of two\n```"
      },
      {
        "input": "n = 3",
        "output": "false",
        "reasoning": "3 is binary 11, which has two set bits, so it is not a power of two.",
        "visual": "```\nn    = 3 -> 11\nn-1  = 2 -> 10\nn & (n-1) = 10 = 2 (not 0) -> not a power of two\n```"
      },
      {
        "input": "n = 0",
        "output": "false",
        "reasoning": "Zero is not a power of two; the n > 0 guard rejects it (and 0 & -1 would otherwise be 0)."
      }
    ],
    "approaches": [
      {
        "name": "Iterative division by two",
        "time": "O(log n)",
        "space": "O(1)",
        "whenToUse": "The most intuitive answer; reach for it first before recalling the bit trick.",
        "logic": "**What it asks.** Decide whether `n` is some whole power of two: `1, 2, 4, 8, ...`. Only strictly positive numbers qualify, so `0` and every negative number must be rejected.\n\n**Why the naive idea fails.** The idea itself is sound; the pitfalls are the edges. If you start dividing without first ruling out `n <= 0`, then `0` enters the loop and never divides down to `1`, and negative numbers behave unexpectedly, so the guard must come first. A second slip is forgetting that `1` (that is `2^0`) is a valid power of two — the loop must leave it as the accepted end state.\n\n**Key Idea.** A power of two is built only from the factor `2`. So repeatedly divide `n` by `2` as long as it stays evenly divisible. If `n` truly was `2^x`, this strips one factor of two per step and lands exactly on `1`. If `n` had any other prime factor, you will hit a number that is even no longer and stop short of `1`, revealing it was not a pure power of two.\n\n**Step-by-Step Approach.**\n1. If `n <= 0`, return `false` immediately — powers of two are positive.\n2. While `n` is even (divisible by `2`), divide it by `2`.\n3. When the loop stops, `n` is odd; return whether it equals `1`.\n\n**Why it works.** Every positive integer factors uniquely into primes. Dividing out all factors of two leaves the product of the remaining odd primes. That leftover is `1` exactly when there were no other primes, i.e. when the original number was a pure power of two; otherwise it is some odd number greater than `1`.\n\n**Common Gotchas.**\n- Guard `n <= 0` before the loop, or `0` loops as even forever (dividing `0` by `2` stays `0`) and negatives misbehave.\n- Use integer division (`//`) so the value stays an exact integer, not a float.\n- Remember `1` is the accepted result; the final check is `n == 1`, not `n == 0`.\n\n**Complexity.** Time `O(log n)`, since each division removes one bit. Space `O(1)`, just the running value.\n\n**Interview mindset.** State this divide-down version first to show the reasoning, then mention you can make it a branchless `O(1)` check with a single bit trick — which is what the interviewer is usually fishing for.",
        "rcs": "# No imports needed: this works on a single int with ordinary arithmetic.\n\n\nclass Solution:  # LeetCode creates an object of this class and calls isPowerOfTwo on it.\n\n    def isPowerOfTwo(self, n: int) -> bool:  # True iff n == 2^x for some integer x >= 0.\n\n        # ==================== PHASE 1: REJECT NON-POSITIVE INPUTS ====================\n\n        if n <= 0:  # Powers of two are strictly positive (1, 2, 4, ...); 0 and negatives can never qualify.\n                    # Why first: without this, 0 would loop forever (0 stays even) and negatives would misbehave.\n\n            return False  # Short-circuit: no non-positive number is a power of two.\n                          # Execution flow: return ends isPowerOfTwo immediately.\n\n        # ==================== PHASE 2: STRIP OUT EVERY FACTOR OF TWO ====================\n\n        while n % 2 == 0:  # While n is still even, it still carries at least one factor of 2 to remove.\n                           # Loop invariant: n stays a positive integer equal to the original with some 2s divided out.\n\n            n //= 2  # Integer-divide by 2, peeling off exactly one factor of two this step.\n                     # Why // not /: keeps n an exact int; / would produce a float and break the parity test.\n                     # State change: n shrinks by one bit; execution flow jumps back to the while header.\n\n        # ==================== PHASE 3: WHAT REMAINS DECIDES THE ANSWER ====================\n\n        return n == 1  # All factors of two are gone. If nothing else was multiplied in, we land exactly on 1 (a power of two);\n                       # any other leftover is an odd number > 1, proving the original had a different prime factor.",
        "plain": "class Solution:\n    def isPowerOfTwo(self, n: int) -> bool:\n        if n <= 0:\n            return False\n        while n % 2 == 0:\n            n //= 2\n        return n == 1"
      },
      {
        "name": "Optimized — Bit Trick n & (n - 1)",
        "time": "O(1)",
        "space": "O(1)",
        "whenToUse": "The expected answer: a constant-time, loop-free test on the binary representation.",
        "logic": "**What it asks.** Decide in constant time, with no loop, whether `n` is a power of two, using the structure of its binary representation.\n\n**Why the naive idea fails.** The divide-down loop is correct but takes `O(log n)` steps. A power of two has a very special bit pattern — exactly one set bit — and recognizing that pattern directly lets us skip the loop entirely.\n\n**Key Idea.** In binary, a power of two is a single `1` followed by zeros: `1`, `10`, `100`, `1000`, .... Subtracting `1` from such a number flips that lone `1` to `0` and turns every zero below it into a `1`: for example `1000 - 1 = 0111`. The two patterns share no set bit, so `n & (n - 1)` wipes out to `0`. For any number with *more than one* set bit, subtracting `1` only affects the bits at and below the lowest set bit, leaving the higher set bits untouched, so `n & (n - 1)` is non-zero. Pair this with `n > 0` to exclude zero and negatives, and the whole test is one expression.\n\n**Step-by-Step Approach.**\n1. Check `n > 0`; powers of two are positive, and this also rejects `n == 0` (for which the bit trick alone would wrongly give `0`).\n2. Compute `n & (n - 1)`, which clears the lowest set bit of `n`.\n3. Return `true` exactly when both `n > 0` and `n & (n - 1) == 0`.\n\n**Why it works.** `n & (n - 1)` always removes precisely the lowest set bit of `n`. If `n` has exactly one set bit (a power of two), removing it yields `0`. If `n` has two or more set bits, at least one remains after clearing the lowest, so the result is non-zero. The `n > 0` guard handles the two cases bit-logic alone cannot: `0`, where `0 & -1 == 0` would masquerade as a match, and negatives, whose two's-complement form has many set bits.\n\n**Common Gotchas.**\n- You must keep the `n > 0` test; `0 & (0 - 1) == 0` would otherwise falsely report `0` as a power of two.\n- Negatives in two's complement have multiple set bits, so the guard rejects them too — do not drop it.\n- `n & (n - 1)` clears the lowest set bit; `n & (-n)` instead *isolates* it — do not mix the two idioms up.\n\n**Complexity.** Time `O(1)`, a single subtraction and bitwise-and. Space `O(1)`.\n\n**Interview mindset.** 'Exactly one set bit' is the mental image for power-of-two; `n > 0 and n & (n - 1) == 0` is the idiom to recall cold. The cousin trick `n & (-n)` (isolate the lowest set bit) shows up in Fenwick trees and is worth knowing alongside it.",
        "rcs": "# No imports needed: this is a single constant-time bitwise expression on one int.\n\n\nclass Solution:  # LeetCode creates an object of this class and calls isPowerOfTwo on it.\n\n    def isPowerOfTwo(self, n: int) -> bool:  # True iff n has EXACTLY one set bit and is positive.\n\n        # ==================== PHASE 1: THE ONE-LINE BIT TEST ====================\n\n        # A power of two in binary is a single 1 followed by zeros: 1, 10, 100, 1000, ...\n        # Subtracting 1 flips that lone 1 to 0 and sets every lower bit, e.g. 1000 - 1 = 0111,\n        # so n & (n - 1) clears the LOWEST set bit and lands on 0 only when there was exactly one set bit.\n\n        return n > 0 and (n & (n - 1)) == 0  # n > 0 rejects 0 and negatives; the & clears the lowest set bit.\n                                             # Why n > 0 is required: 0 & (0 - 1) == 0 would otherwise pass 0 off as a power of two,\n                                             # and negatives in two's complement carry many set bits. Both are excluded by the guard.\n                                             # Why == 0 proves it: only a single-set-bit number leaves nothing behind after clearing it.\n                                             # Execution flow: Python short-circuits; if n <= 0 it returns False without the bit math.",
        "plain": "class Solution:\n    def isPowerOfTwo(self, n: int) -> bool:\n        return n > 0 and (n & (n - 1)) == 0"
      }
    ],
    "patternRecognition": [
      "'Is n a power of two / exactly one set bit?' → the n & (n - 1) idiom.",
      "A constant-time, loop-free requirement on an integer points to bit manipulation.",
      "Subtracting 1 to clear the lowest set bit is the recurring trick for single-bit questions."
    ],
    "interviewRecall": [
      "Always guard with n > 0 first; 0 and negatives are never powers of two.",
      "n & (n - 1) clears the lowest set bit; it is 0 iff n had exactly one set bit.",
      "Remember 1 counts (2^0), and n & (-n) isolates the lowest set bit — a related idiom."
    ]
  }
    ]);

})();
