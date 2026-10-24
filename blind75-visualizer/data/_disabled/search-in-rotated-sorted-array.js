/*
 * DISABLED PROBLEM — Search in Rotated Sorted Array (LC 33)
 * Removed from data/binary_search.js on 2026-10-24 pending investigation of a
 * reported issue. To restore: paste the object below back into the
 * window.BLIND75.register("Binary Search", [ ... ]) array in data/binary_search.js
 * (e.g. right after the find-minimum-in-rotated-sorted-array entry).
 *
 * This file is NOT loaded by the app.
 */
/* eslint-disable */
var SEARCH_IN_ROTATED_SORTED_ARRAY_BACKUP =
    {
      id: "search-in-rotated-sorted-array",
      lc: 33,
      title: "Search in Rotated Sorted Array",
      difficulty: "Medium",
      category: "Binary Search",
      link: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
      meta: { pattern: "Binary Search on Rotation", dataStructure: "Array", technique: "Find sorted half" },
      description:
        "You are given an integer array `nums` of **distinct** values, originally sorted in ascending order, then possibly **rotated** at an unknown pivot (e.g. `[0,1,2,4,5,6,7]` might become `[4,5,6,7,0,1,2]`). Given a `target`, return the **index** of `target` in `nums`, or `-1` if it is not present.\n\n" +
        "You must write an algorithm with `O(log n)` runtime complexity.",
      constraints: [
        "`1 <= nums.length <= 5000`",
        "`-10^4 <= nums[i] <= 10^4`",
        "All values of `nums` are **unique**.",
        "`nums` is an ascending array possibly rotated at some pivot.",
        "`-10^4 <= target <= 10^4`"
      ],
      notes: [
        "Return the **index**, not the value; return `-1` when the target is absent.",
        "The pivot is unknown, and the array may not be rotated at all (still one sorted run).",
        "Distinct values guarantee that at each step exactly one half is cleanly sorted, which the algorithm relies on."
      ],
      examples: [
        {
          input: "nums = [4, 5, 6, 7, 0, 1, 2], target = 0",
          output: "4",
          reasoning: "0 is present at index 4. The left half is the sorted run and target 0 is not inside it, so we search the right half where 0 lives.",
          visual:
            "```\nindex :  0   1   2   3   4   5   6\nvalue :  4   5   6   7   0   1   2\n         L           M           R\nnums[L]=4 <= nums[M]=7 -> LEFT half [4..7] is sorted\ntarget 0 not in [4,7) -> search RIGHT half\n```"
        },
        {
          input: "nums = [4, 5, 6, 7, 0, 1, 2], target = 3",
          output: "-1",
          reasoning: "3 never appears; the search window empties and we return -1."
        },
        {
          input: "nums = [1], target = 0",
          output: "-1",
          reasoning: "Single element that isn't the target."
        },
        {
          input: "nums = [5, 1, 3], target = 5",
          output: "0",
          reasoning: "L=0,R=2,M=1: nums[1]=1 <= nums[2]=3 so the RIGHT half [1..2] is sorted; target 5 is not within (1,3], so search the LEFT half and find 5 at index 0.",
          visual:
            "```\nindex :  0   1   2\nvalue :  5   1   3\n         L   M   R\nnums[M]=1 <= nums[R]=3 -> RIGHT half [1..3] sorted\ntarget 5 not in (1,3] -> go LEFT\n```"
        }
      ],
      approaches: [
        {
          name: "Brute Force — Linear Scan",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "Only as the naive baseline to contrast against; it ignores the rotation structure and misses the required O(log n).",
          logic:
            "**What it asks.** Return the index of `target` in an array that was sorted ascending and then possibly rotated at an unknown pivot, or `-1` if `target` is absent. Values are distinct, and the required runtime is `O(log n)` — which this brute-force baseline deliberately ignores.\n" +
            "\n" +
            "**Why the naive idea fails.** Forget the rotation entirely and walk the array left to right, returning the first index whose value equals `target`, else `-1`. It is trivially correct, but it is `O(n)`: it makes no use of the fact that the array is two sorted runs, so it inspects every element in the worst case. The problem explicitly demands `O(log n)`, so this exists only as the obvious starting point that motivates the binary-search solution.\n" +
            "\n" +
            "**Key Idea.** There is no cleverness here — just exhaustiveness. If `target` is present, a full linear scan is guaranteed to meet it; if it is absent, the scan falls through to `-1`.\n" +
            "\n" +
            "**Step-by-Step Approach.**\n" +
            "\n" +
            "1. Iterate over `nums` with both the index `i` and the value `num`.\n" +
            "2. If `num == target`, return `i` immediately — distinct values mean the first match is the only match.\n" +
            "3. If the loop finishes with no match, return `-1`.\n" +
            "\n" +
            "**Why it works.** Every index is examined in order, so a present target cannot be skipped, and reaching the end without a hit proves the target is not in the array.\n" +
            "\n" +
            "**Common Gotchas.**\n" +
            "\n" +
            "- Return the index `i`, not the value at that index.\n" +
            "- Return `-1` (not `0` or `None`) when the target is absent.\n" +
            "\n" +
            "**Complexity.** Time `O(n)` — every element may be inspected. Space `O(1)`.\n" +
            "\n" +
            "**Interview mindset.** State this as the obvious baseline, then immediately pivot: a sorted-then-rotated array plus an `O(log n)` requirement is the cue to reach for binary search over a sorted half.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints (plus an int target) and return one int.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls search on it.\n" +
            "\n" +
            "    def search(self, nums: List[int], target: int) -> int:  # Return the index of target in nums, or -1 if absent.\n" +
            "\n" +
            "        # ==================== PHASE 1: SCAN EVERY ELEMENT ====================\n" +
            "\n" +
            "        for i, num in enumerate(nums):  # Walk the array left to right; enumerate yields both the index i and the value num.\n" +
            "                                        # Why ignore the rotation: brute force uses none of the ordering, so any element order works.\n" +
            "                                        # Loop invariant: every index before i has already been checked and did not match.\n" +
            "                                        # Execution flow: after each element Python advances to the next (i, num).\n" +
            "\n" +
            "            if num == target:  # Is this element the one we are looking for?\n" +
            "                return i  # Yes: hand back its index and end the function immediately.\n" +
            "                          # Execution flow: no code after return runs; control leaves search.\n" +
            "                          # Why safe: values are distinct, so the first match is the only match.\n" +
            "\n" +
            "        return -1  # Fell off the end with no match, so target is not present in nums.\n" +
            "                   # Execution flow: this value is handed to the caller and search ends.",
          plain:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        for i, num in enumerate(nums):\n" +
            "            if num == target:\n" +
            "                return i\n" +
            "        return -1"
        },
        {
          name: "Optimized — Binary Search (find the sorted half)",
          time: "O(log n)",
          space: "O(1)",
          whenToUse: "The expected O(log n) solution for locating a target in a rotated, uniquely-valued sorted array.",
          logic:
            "**What it asks.** Locate `target` in a single binary-search pass over a sorted-then-rotated array of distinct values, returning its index or `-1`, all in `O(log n)`.\n" +
            "\n" +
            "**Why the naive idea fails.** A linear scan is `O(n)` and ignores the ordering. But *plain* binary search fails too: ordinary binary search assumes the entire range is sorted, so `nums[mid]` versus `target` alone tells it whether to go left or right. After rotation the range as a whole is **not** sorted — `nums[mid]` could be in either run — so that single comparison no longer reveals which side holds `target`.\n" +
            "\n" +
            "**Key Idea.** A rotated sorted array is two ascending runs stuck together, e.g. `4 5 6 7 | 0 1 2`. The unlocking invariant is: **for any `mid`, at least one of the two halves `[left..mid]` and `[mid..right]` is fully sorted.** The single rotation point can lie in only one half, so the other is a clean ascending stretch. Because values are distinct, one comparison (`nums[left]` vs `nums[mid]`) reveals which half is sorted, and within a sorted half deciding whether `target` lies inside is a plain bounds check. So each step: identify the sorted half, test whether `target` falls within its known range, and discard the half that provably cannot contain it.\n" +
            "\n" +
            "**What `left`, `right`, and `mid` mean.** `[left, right]` is the search space — the window of indices that might still hold `target`. `left`/`right` are its inclusive ends and `mid` the probed index. Unlike the find-minimum variant, here we hunt an exact value, so the window can legitimately shrink to empty, which means 'not found'.\n" +
            "\n" +
            "**Step-by-Step Approach.**\n" +
            "\n" +
            "1. Set `left = 0`, `right = n - 1`. Loop `while left <= right` and take `mid = (left + right) // 2`.\n" +
            "2. If `nums[mid] == target`, return `mid` immediately.\n" +
            "3. **Identify the sorted half.** If `nums[left] <= nums[mid]`, the **left half `[left..mid]` is sorted** (no drop between the ends); otherwise the drop is on the left, so the **right half `[mid..right]` is sorted**.\n" +
            "4. **Test `target` against that half's ends.** If the left half is sorted and `nums[left] <= target < nums[mid]`, `target` is inside it → `right = mid - 1`; otherwise it can only be in the other half → `left = mid + 1`. Symmetrically, if the right half is sorted and `nums[mid] < target <= nums[right]`, `target` is inside it → `left = mid + 1`; otherwise → `right = mid - 1`.\n" +
            "5. If the window empties (`left > right`) without a hit, return `-1`.\n" +
            "\n" +
            "**Why it works.** We always test `target` against the boundaries of the half we *know* is sorted, where 'between the ends' means exactly 'present in this half'. The half that fails that test provably cannot contain `target` — its values are either outside the range or belong to the other run — so discarding it is safe. Each step eliminates half the window while the surviving half still satisfies the invariant, giving both correctness and convergence. Termination is guaranteed because every branch moves `left` past `mid` or `right` below `mid`, strictly shrinking the window.\n" +
            "\n" +
            "**Common Gotchas.**\n" +
            "\n" +
            "- The sorted-half test must be `<=` (`nums[left] <= nums[mid]`), not `<`, so a one- or two-element window with `left == mid` still classifies as sorted.\n" +
            "- Get the in-range bounds right: `nums[left] <= target < nums[mid]` and `nums[mid] < target <= nums[right]`. The strict end sits at `mid` because `mid` was already checked and excluded above.\n" +
            "- This relies on **distinct** values; with duplicates `nums[left] == nums[mid]` becomes ambiguous about which half is sorted (the harder LC 81 variant).\n" +
            "- Use `right = mid - 1` / `left = mid + 1` with `while left <= right` — the standard exact-match template. Off-by-one here either misses the target or loops forever.\n" +
            "\n" +
            "**Complexity.** Time `O(log n)` — one half discarded per step. Space `O(1)` — just the two indices.\n" +
            "\n" +
            "**Interview mindset.** The whole trick is: **identify the sorted half first** (compare `nums[left]` and `nums[mid]`), then run a plain in-range check on that half to choose a direction. Rotated sorted array + `O(log n)` is the exact signal. Trace on `nums = [4,5,6,7,0,1,2]`, target = 0: L=0,R=6,M=3 → `nums[3]=7`≠0, `4 <= 7` left sorted, `4 <= 0 < 7`? no → L=4; L=4,R=6,M=5 → `nums[5]=1`≠0, `0 <= 1` left sorted, `0 <= 0 < 1`? yes → R=4; L=4,R=4,M=4 → `nums[4]=0`==target → return 4.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints (plus an int target) and return one int.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls search on it.\n" +
            "\n" +
            "    def search(self, nums: List[int], target: int) -> int:  # Return the index of target, or -1, in O(log n).\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n" +
            "\n" +
            "        left, right = 0, len(nums) - 1  # Search space is the whole array; target, if present, lives inside [left, right].\n" +
            "                                        # Why these bounds: indices 0..n-1 cover every position where target could sit.\n" +
            "                                        # Invariant: if target is in nums, its index stays within [left, right] as the window shrinks.\n" +
            "                                        # Execution flow: Python enters the while loop.\n" +
            "\n" +
            "        # ==================== PHASE 2: BINARY SEARCH VIA THE SORTED HALF ====================\n" +
            "\n" +
            "        while left <= right:  # Standard exact-match template: keep going while the window still holds at least one index.\n" +
            "                              # Why '<=' not '<': with 'mid +/- 1' updates the answer can be the final lone element, so\n" +
            "                              # left == right must still be probed.\n" +
            "                              # Loop invariant: every index OUTSIDE [left, right] has been proven not to hold target.\n" +
            "                              # Execution flow: when left > right the window is empty and the loop ends.\n" +
            "\n" +
            "            mid = (left + right) // 2  # Midpoint of the current window.\n" +
            "                                       # Why floor division is fine here: every branch below moves off mid by at least one, so the\n" +
            "                                       # window always shrinks regardless of rounding.\n" +
            "                                       # State: mid splits the window into a left part [left..mid] and a right part [mid..right].\n" +
            "\n" +
            "            if nums[mid] == target:  # Direct hit at the midpoint?\n" +
            "                return mid  # Found it: return the index and end search immediately.\n" +
            "                            # Execution flow: no code below runs; control leaves search.\n" +
            "                            # Why safe: distinct values mean this is the unique occurrence of target.\n" +
            "\n" +
            "            if nums[left] <= nums[mid]:  # LEFT half [left..mid] is cleanly sorted (no rotation drop between left and mid).\n" +
            "                                         # Why '<=' not '<': when the window is one or two elements (left == mid), the half is trivially\n" +
            "                                         # sorted and must still classify as such.\n" +
            "                                         # Key fact: the single rotation point can sit in only ONE half, so a drop-free left half is fully\n" +
            "                                         # ascending -- which makes a bounds check on it exact.\n" +
            "                if nums[left] <= target < nums[mid]:  # Does target fall inside the sorted left half's value range?\n" +
            "                                                      # Why these bounds: '>= nums[left]' and '< nums[mid]' means target lies strictly between the known\n" +
            "                                                      # ends; nums[mid] was already ruled out just above.\n" +
            "                    right = mid - 1  # Yes: keep the left half and discard [mid..right].\n" +
            "                                     # State change: window becomes [left..mid-1]; mid is dropped since it was already checked.\n" +
            "                                     # Why safe: target is provably inside the sorted left half, so the right half cannot hold it.\n" +
            "                else:  # target is NOT in the sorted left half, so it can only be in the right half.\n" +
            "                    left = mid + 1  # Discard [left..mid] and search the right half.\n" +
            "                                    # State change: window becomes [mid+1..right].\n" +
            "                                    # Why safe: the left half is fully sorted and target is outside its range, so it is absent there.\n" +
            "            else:  # nums[left] > nums[mid]: the drop is in the left half, so the RIGHT half [mid..right] is sorted.\n" +
            "                if nums[mid] < target <= nums[right]:  # Does target fall inside the sorted right half's value range?\n" +
            "                                                       # Why these bounds: '> nums[mid]' and '<= nums[right]' means target lies strictly between the known\n" +
            "                                                       # ends; nums[mid] was already ruled out above.\n" +
            "                    left = mid + 1  # Yes: keep the right half and discard [left..mid].\n" +
            "                                    # State change: window becomes [mid+1..right].\n" +
            "                                    # Why safe: target is provably inside the sorted right half, so the left half cannot hold it.\n" +
            "                else:  # target is NOT in the sorted right half, so it can only be in the left half.\n" +
            "                    right = mid - 1  # Discard [mid..right] and search the left half.\n" +
            "                                     # State change: window becomes [left..mid-1].\n" +
            "                                     # Why safe: the right half is fully sorted and target is outside its range, so it is absent there.\n" +
            "\n" +
            "        # ==================== PHASE 3: RETURN ====================\n" +
            "\n" +
            "        return -1  # The window emptied (left > right) without a hit, so target is not in nums.\n" +
            "                   # Execution flow: this value is handed to the caller and search ends.",
          plain:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        left, right = 0, len(nums) - 1\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if nums[mid] == target:\n" +
            "                return mid\n" +
            "            if nums[left] <= nums[mid]:\n" +
            "                if nums[left] <= target < nums[mid]:\n" +
            "                    right = mid - 1\n" +
            "                else:\n" +
            "                    left = mid + 1\n" +
            "            else:\n" +
            "                if nums[mid] < target <= nums[right]:\n" +
            "                    left = mid + 1\n" +
            "                else:\n" +
            "                    right = mid - 1\n" +
            "        return -1"
        }
      ],
      patternRecognition: [
        "Sorted array that has been rotated, and you must find a target's index in O(log n).",
        "Plain binary search won't work because the whole range isn't sorted -> split into a sorted half + the other.",
        "Distinct values let you identify exactly one sorted half per step with a single comparison."
      ],
      interviewRecall: [
        "First check nums[mid] == target and return mid.",
        "Determine the sorted half with nums[left] <= nums[mid] (left sorted) else right sorted.",
        "Then do an in-range bounds check on the sorted half to pick which side to keep; use left <= right and mid +/- 1."
      ]
    };
