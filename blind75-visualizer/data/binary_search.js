/*
 * Blind 75 — Binary Search
 * =========================================================================
 * Registers this category's problems on the global registry:
 *     window.BLIND75.register("Binary Search", [ ...problems ]);
 *
 * See data/arrays_hashing.js for the full PROBLEM SCHEMA documentation.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Binary Search", [
    {
      id: "find-minimum-in-rotated-sorted-array",
      lc: 153,
      title: "Find Minimum in Rotated Sorted Array",
      difficulty: "Medium",
      category: "Binary Search",
      link: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
      meta: { pattern: "Binary Search on Rotation", dataStructure: "Array", technique: "Compare mid to right" },
      description:
        "You are given an array `nums` of **unique** integers that was originally sorted in ascending order, then **rotated** between `1` and `n` times. Rotating `[0,1,2,4,5,6,7]` four times, for example, yields `[4,5,6,7,0,1,2]`.\n\n" +
        "Return the **minimum element** of the array. You must write an algorithm that runs in `O(log n)` time.",
      constraints: [
        "`n == nums.length`",
        "`1 <= n <= 5000`",
        "`-5000 <= nums[i] <= 5000`",
        "All integers in `nums` are **unique**.",
        "`nums` is a sorted ascending array rotated between `1` and `n` times."
      ],
      notes: [
        "A rotation by a multiple of `n` (including the full `n` rotations mentioned) leaves the array fully sorted, so the minimum is simply `nums[0]` in that case.",
        "Because values are unique you can use strict comparisons; you never have to worry about `nums[mid] == nums[right]` ambiguity (that only arises in the LC 154 duplicates variant)."
      ],
      examples: [
        {
          input: "nums = [3, 4, 5, 1, 2]",
          output: "1",
          reasoning: "The original sorted array [1,2,3,4,5] was rotated 3 times. The minimum 1 sits at the rotation point (index 3).",
          visual:
            "```\nindex :  0   1   2   3   4\nvalue :  3   4   5   1   2\n         L       M       R\nnums[M]=5 > nums[R]=2  -> min is strictly RIGHT of M\n=> discard left half, search [3..4]\n```"
        },
        {
          input: "nums = [4, 5, 6, 7, 0, 1, 2]",
          output: "0",
          reasoning: "The original [0,1,2,4,5,6,7] rotated 4 times. The pivot (smallest value) is 0 at index 4.",
          visual:
            "```\nindex :  0   1   2   3   4   5   6\nvalue :  4   5   6   7   0   1   2\n         L           M           R\nnums[M]=7 > nums[R]=2  -> min lies to the RIGHT of M\n```"
        },
        {
          input: "nums = [11, 13, 15, 17]",
          output: "11",
          reasoning: "Rotated a full n times, so it looks fully sorted. nums[mid] < nums[right] on the first step, so the answer is in the left portion and ultimately nums[0]."
        },
        {
          input: "nums = [2, 1]",
          output: "1",
          reasoning: "Rotated once. L=0, R=1, M=0: nums[0]=2 > nums[1]=1, so the minimum is to the right; left collapses to index 1."
        }
      ],
      approaches: [
        {
          name: "Optimized — Binary Search (compare mid to right)",
          time: "O(log n)",
          space: "O(1)",
          whenToUse: "The expected O(log n) answer for locating the rotation point / minimum in a rotated, uniquely-valued sorted array.",
          logic:
            "**What it asks.** Find the smallest value in an array that was sorted ascending and then rotated. The minimum is exactly the *rotation point* — the one place where a larger number is immediately followed by a smaller one — and the algorithm must run in `O(log n)`, which rules out simply scanning every element.\n" +
            "\n" +
            "**Why the naive idea fails.** Walking all `n` elements and keeping a running minimum is correct but `O(n)`. It throws away the enormous amount of order still present: even after rotation the data is two sorted runs, and ignoring that structure means doing linear work where logarithmic work suffices.\n" +
            "\n" +
            "**Key Idea.** A rotated sorted array is two ascending runs glued together, and *every* value in the second (right) run is smaller than *every* value in the first (left) run. In `[4,5,6,7,0,1,2]` the left run `4,5,6,7` is entirely larger than the right run `0,1,2`, and the minimum is the first element of that lower run. The move that unlocks a clean binary search is to compare `nums[mid]` against the **right end** `nums[right]` rather than the left end. Why the right end? Because `nums[right]` always sits in the lower run whenever the array is actually rotated, and it is the global maximum when the array is not rotated at all — either way the comparison is unambiguous. Comparing against `nums[left]` instead cannot separate a rotated array from a fully sorted one without extra special cases.\n" +
            "\n" +
            "**What `left`, `right`, and `mid` mean.** `[left, right]` is the search space: the window of indices still guaranteed to contain the minimum. `left` is the lowest index that might be the answer, `right` the highest, and `mid` the index tested this step. The window starts as the whole array and halves each iteration.\n" +
            "\n" +
            "**Step-by-Step Approach.**\n" +
            "\n" +
            "1. Set `left = 0`, `right = n - 1` so the window is the entire array — the minimum is certainly inside it.\n" +
            "2. While `left < right`, take `mid = (left + right) // 2` (floor division, so `mid < right` whenever the window has two or more elements).\n" +
            "3. **If `nums[mid] > nums[right]`**: `mid` is in the upper run and a drop lies strictly after it, so the minimum is **strictly right of mid**. Discard `left..mid` with `left = mid + 1`.\n" +
            "4. **If `nums[mid] <= nums[right]`**: the stretch `mid..right` ascends with no drop, so `nums[mid]` is the smallest there and nothing to its right can beat it. Keep `mid` as a candidate with `right = mid` (never `mid - 1`).\n" +
            "5. When the loop ends, `left == right` points at the single surviving index — return `nums[left]`. No separate answer variable is needed.\n" +
            "\n" +
            "**Why it works.** The loop invariant is that **the minimum always lies within `[left, right]`**. Each branch discards only a half proven not to contain it — the upper-run half in step 3, the strictly-larger-than-mid tail in step 4 — so the invariant is preserved every step. The window also strictly shrinks: the `left = mid + 1` branch always advances `left`, and the `right = mid` branch shrinks because floor division guarantees `mid < right` while `left < right`. A strictly shrinking window that always contains the answer must converge onto exactly the minimum.\n" +
            "\n" +
            "**Common Gotchas.**\n" +
            "\n" +
            "- Use `right = mid`, **not** `right = mid - 1`, in the ascending branch: `nums[mid]` is itself a live candidate, and dropping it can discard the true minimum.\n" +
            "- Compare to `nums[right]`, not `nums[left]`; the left end cannot distinguish the rotated case from the sorted case.\n" +
            "- An unrotated array (rotation by a multiple of `n`) is handled automatically: `nums[mid] <= nums[right]` holds on the first step and keeps driving the window left until it lands on `nums[0]`.\n" +
            "- Use `while left < right` (converge to one index), not `while left <= right`; the latter with `right = mid` never terminates when `left == right == mid`.\n" +
            "\n" +
            "**Complexity.** Time `O(log n)` — the window halves each iteration. Space `O(1)` — only the two indices.\n" +
            "\n" +
            "**Interview mindset.** 'Sorted-ish but rotated, and `O(log n)`' is the signal to binary-search the rotation point. The one line to say out loud: compare `mid` to `right`, then `right = mid` (keep mid) versus `left = mid + 1` (drop mid). Trace on `[4,5,6,7,0,1,2]`: L=0,R=6,M=3 → `7 > 2` → L=4; L=4,R=6,M=5 → `1 <= 2` → R=5; L=4,R=5,M=4 → `0 <= 1` → R=4; L=R=4 → return `nums[4]=0`.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return one int.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls findMin on it.\n" +
            "\n" +
            "    def findMin(self, nums: List[int]) -> int:  # Return the minimum element of the rotated ascending array.\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n" +
            "\n" +
            "        left, right = 0, len(nums) - 1  # Search space is the whole array; the answer (the minimum) lives inside [left, right].\n" +
            "                                        # Why these bounds: a rotation between 1 and n means the pivot can be at any index 0..n-1.\n" +
            "                                        # Invariant to hold: the minimum is ALWAYS within [left, right] as the window shrinks.\n" +
            "                                        # Execution flow: Python enters the while loop below.\n" +
            "\n" +
            "        # ==================== PHASE 2: BINARY-SEARCH THE ROTATION POINT ====================\n" +
            "\n" +
            "        while left < right:  # Keep halving until the window collapses to a single surviving index.\n" +
            "                             # Why '<' not '<=': we converge two bounds onto ONE index, not probe for an exact value.\n" +
            "                             # Loop invariant: nums[left..right] still contains the minimum; each pass drops a half that cannot.\n" +
            "                             # Execution flow: when left == right the loop ends and that lone index is the answer.\n" +
            "\n" +
            "            mid = (left + right) // 2  # Midpoint of the current window [left, right].\n" +
            "                                       # Why floor division: with left < right it guarantees mid < right, so 'right = mid' strictly shrinks\n" +
            "                                       # the window and the loop cannot spin forever.\n" +
            "                                       # State: mid splits the window into [left..mid] and [mid+1..right].\n" +
            "\n" +
            "            if nums[mid] > nums[right]:  # mid sits in the UPPER (larger) run; a drop lies strictly AFTER mid.\n" +
            "                                         # Why compare to nums[right]: the right end is always in the LOWER run when rotated (and is the\n" +
            "                                         # global max when unrotated), so this test is unambiguous -- unlike comparing to nums[left].\n" +
            "                                         # Meaning: nums[mid] beating the right end proves the minimum is to the right of mid.\n" +
            "                left = mid + 1  # Discard the left half [left..mid]; mid itself cannot be the minimum.\n" +
            "                                # State change: left jumps past mid; the window becomes [mid+1..right].\n" +
            "                                # Why safe: every index in [left..mid] is in the upper run, strictly greater than nums[right],\n" +
            "                                # so none of them can be the minimum.\n" +
            "            else:  # nums[mid] <= nums[right]: the stretch mid..right ascends with no drop.\n" +
            "                   # Why: with no drop between mid and right, nums[mid] is the smallest value in mid..right.\n" +
            "                right = mid  # Keep mid as a live candidate and discard everything strictly to its right.\n" +
            "                             # Why 'right = mid' not 'mid - 1': nums[mid] could itself be the minimum, so we must not drop it.\n" +
            "                             # State change: the window becomes [left..mid]; the minimum is mid or to its left.\n" +
            "                             # Execution flow: back to the while header with a strictly smaller window.\n" +
            "\n" +
            "        # ==================== PHASE 3: RETURN ====================\n" +
            "\n" +
            "        return nums[left]  # left == right now, and the invariant kept the minimum inside [left, right], so this index IS it.\n" +
            "                           # Execution flow: the value is handed to the caller and findMin ends.",
          plain:
            "class Solution:\n" +
            "    def findMin(self, nums: List[int]) -> int:\n" +
            "        left, right = 0, len(nums) - 1\n" +
            "        while left < right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if nums[mid] > nums[right]:\n" +
            "                left = mid + 1\n" +
            "            else:\n" +
            "                right = mid\n" +
            "        return nums[left]"
        }
      ],
      patternRecognition: [
        "Array is sorted then rotated, and you're asked for the minimum / rotation point in O(log n).",
        "Values are unique -> strict comparisons work; the mid-vs-right test is unambiguous.",
        "You want to locate the single 'drop' where a bigger number precedes a smaller one."
      ],
      interviewRecall: [
        "Compare nums[mid] to nums[right], NOT to nums[left].",
        "nums[mid] > nums[right] -> min is right (left = mid + 1); else min is mid-or-left (right = mid).",
        "Use right = mid (not mid - 1) so you never discard the candidate at mid; loop while left < right and return nums[left]."
      ]
    },

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
    },

    {
      id: "binary-search",
      lc: 704,
      title: "Binary Search",
      difficulty: "Easy",
      category: "Binary Search",
      link: "https://leetcode.com/problems/binary-search/",
      meta: { pattern: "Classic Binary Search", dataStructure: "Array", technique: "Halve the search space" },
      description:
        "Given a **sorted** array of distinct integers `nums` (ascending) and an integer `target`, return the **index** of `target` if it is present, or `-1` if it is not.\n\n" +
        "You must write an algorithm with `O(log n)` runtime complexity.",
      constraints: [
        "`1 <= nums.length <= 10^4`",
        "`-10^4 < nums[i], target < 10^4`",
        "All integers in `nums` are **unique**.",
        "`nums` is sorted in **ascending** order."
      ],
      notes: [
        "This is the canonical template every other binary-search problem specializes; getting the boundary conventions right here pays off everywhere.",
        "Return the **index**, not the value; return `-1` when the target is absent."
      ],
      examples: [
        {
          input: "nums = [-1, 0, 3, 5, 9, 12], target = 9",
          output: "4",
          reasoning: "9 sits at index 4. Each step halves the window until it lands on 9.",
          visual:
            "```\nindex :  0    1   2   3   4   5\nvalue : -1    0   3   5   9  12\n         L            M           R\nnums[M]=5 < 9  -> target is RIGHT -> discard [0..M], L = M+1\n```"
        },
        {
          input: "nums = [-1, 0, 3, 5, 9, 12], target = 2",
          output: "-1",
          reasoning: "2 never appears; the window shrinks to empty (left > right) and we return -1."
        },
        {
          input: "nums = [5], target = 5",
          output: "0",
          reasoning: "Single element equal to target; mid = 0 hits immediately."
        },
        {
          input: "nums = [2, 5], target = 0",
          output: "-1",
          reasoning: "L=0,R=1,M=0: nums[0]=2 > 0 so go left, R = -1, window empty -> -1."
        }
      ],
      approaches: [
        {
          name: "Optimized — Iterative Binary Search",
          time: "O(log n)",
          space: "O(1)",
          whenToUse: "The expected O(log n) answer whenever the array is sorted and you need an exact index; this is the base template.",
          logic:
            "**What it asks.** Return the index of `target` in an ascending array of distinct integers, or `-1`, in `O(log n)`.\n\n" +
            "**Why the naive idea fails.** Scanning left to right is correct but `O(n)`; it ignores the sortedness that lets you rule out half the array with a single comparison. The problem explicitly demands `O(log n)`.\n\n" +
            "**Key Idea.** The **search space** is the window of indices `[left, right]` that may still contain `target`; it starts as the whole array. Because the array is sorted, comparing `target` to the middle element `nums[mid]` tells you which half the target must lie in, and the **other half is eliminated wholesale** — every value in it is provably on the wrong side of `nums[mid]`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set `left = 0`, `right = n - 1` — the full search space.\n" +
            "2. Take `mid = (left + right) // 2`, the midpoint of the current window.\n" +
            "3. **If `nums[mid] == target`**, return `mid`.\n" +
            "4. **If `nums[mid] < target`**, everything at indices `left..mid` is `<= nums[mid] < target`, so none of them can be the answer. **Eliminate the left half** including mid: `left = mid + 1`.\n" +
            "5. **If `nums[mid] > target`**, everything at indices `mid..right` is `>= nums[mid] > target`, so **eliminate the right half** including mid: `right = mid - 1`.\n" +
            "6. Loop `while left <= right`. If the window empties (`left > right`), `target` is absent — return `-1`.\n\n" +
            "**Why it works.** The invariant is that **if `target` exists, its index is always inside `[left, right]`**. Each branch discards only indices proven to be on the wrong side of `target`, so the invariant is preserved, and the window strictly shrinks every step (mid is always excluded from the next window), guaranteeing termination.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `while left <= right` (with `right = mid - 1` / `left = mid + 1`), the exact-match template; `left < right` here can miss the final single-element window.\n" +
            "- `mid = left + (right - left) // 2` avoids integer overflow in languages with fixed-width ints (Python is immune, but say it in an interview).\n" +
            "- Move past mid on both sides (`mid + 1`, `mid - 1`) — mid was already tested, so keeping it would loop forever.\n\n" +
            "**Complexity.** Time `O(log n)` — the window halves each iteration. Space `O(1)` — two indices.\n\n" +
            "**Interview mindset.** 'Sorted array + find an exact value/index' is the textbook binary-search cue. Say the search space out loud (`[left, right]`) and state which half you eliminate on each comparison.\n\n" +
            "Trace on `[-1,0,3,5,9,12]`, target = 9: L=0,R=5,M=2 → `nums[2]=3 < 9` → L=3; L=3,R=5,M=4 → `nums[4]=9 == 9` → return 4.",
          rcs:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        left, right = 0, len(nums) - 1     # Search space: indices that may hold target.\n" +
            "        while left <= right:               # Stop when the window empties.\n" +
            "            mid = (left + right) // 2      # Midpoint of the current window.\n" +
            "            if nums[mid] == target:        # Direct hit.\n" +
            "                return mid\n" +
            "            if nums[mid] < target:         # left..mid all < target.\n" +
            "                left = mid + 1             # Eliminate the left half (incl. mid).\n" +
            "            else:                          # mid..right all > target.\n" +
            "                right = mid - 1            # Eliminate the right half (incl. mid).\n" +
            "        return -1                          # Window emptied -> target absent.",
          plain:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        left, right = 0, len(nums) - 1\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if nums[mid] == target:\n" +
            "                return mid\n" +
            "            if nums[mid] < target:\n" +
            "                left = mid + 1\n" +
            "            else:\n" +
            "                right = mid - 1\n" +
            "        return -1"
        }
      ],
      patternRecognition: [
        "Sorted array + find an exact value/index in O(log n) -> classic binary search.",
        "This is the base template: [left, right], mid, eliminate one half per comparison.",
        "Distinct sorted values -> a single nums[mid] vs target comparison picks the side."
      ],
      interviewRecall: [
        "left=0, right=n-1; loop while left <= right.",
        "nums[mid] < target -> left = mid + 1; nums[mid] > target -> right = mid - 1; equal -> return mid.",
        "Empty window -> return -1; mention mid = left + (right-left)//2 for overflow safety."
      ]
    },

    {
      id: "search-a-2d-matrix",
      lc: 74,
      title: "Search a 2D Matrix",
      difficulty: "Medium",
      category: "Binary Search",
      link: "https://leetcode.com/problems/search-a-2d-matrix/",
      meta: { pattern: "Binary Search on Flattened Grid", dataStructure: "Matrix", technique: "Index/coord mapping" },
      description:
        "You are given an `m x n` integer matrix with two properties: each row is sorted in **non-decreasing** order left to right, and the **first integer of each row is greater than the last integer of the previous row**. Given a `target`, return `true` if it appears in the matrix and `false` otherwise.\n\n" +
        "You must write an algorithm with `O(log(m·n))` runtime complexity.",
      constraints: [
        "`m == matrix.length`",
        "`n == matrix[0].length`",
        "`1 <= m, n <= 100`",
        "`-10^4 <= matrix[i][j], target <= 10^4`",
        "Each row is sorted, and every row's first element exceeds the previous row's last element."
      ],
      notes: [
        "The two properties together mean the matrix, read row by row, is one fully sorted sequence — that is what lets a single binary search work.",
        "This is stronger than LC 240 (Search a 2D Matrix II), where rows/columns are sorted but rows are NOT globally ordered; that variant needs a staircase walk, not this trick.",
        "Return a boolean (present or not), not an index or coordinate."
      ],
      examples: [
        {
          input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3",
          output: "true",
          reasoning: "Reading row by row gives [1,3,5,7,10,11,16,20,23,30,34,60]; 3 is the element at flat index 1, i.e. matrix[0][1].",
          visual:
            "```\nflat idx: 0  1  2  3  4  5  6  7  8  9 10 11\nvalue   : 1  3  5  7 10 11 16 20 23 30 34 60\n              ^ target 3 at flat index 1 = matrix[1//4][1%4] = matrix[0][1]\n```"
        },
        {
          input: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13",
          output: "false",
          reasoning: "13 falls between 11 and 16 in the flattened order; the search window empties without a hit."
        },
        {
          input: "matrix = [[1]], target = 1",
          output: "true",
          reasoning: "Single cell equal to target."
        },
        {
          input: "matrix = [[1,3]], target = 2",
          output: "false",
          reasoning: "One row; 2 is not present between 1 and 3."
        }
      ],
      approaches: [
        {
          name: "Two-Step — Binary Search Row, then Column",
          time: "O(log m + log n)",
          space: "O(1)",
          whenToUse: "Intuitive when you'd rather reason in (row, col) than in flat indices; two clean 1-D searches.",
          logic:
            "**What it asks.** Report whether `target` exists in a matrix that is sorted within each row and across rows, in logarithmic time.\n\n" +
            "**Why the naive idea fails.** Scanning all `m·n` cells is `O(m·n)`; even binary-searching every row independently is `O(m log n)`. Both ignore that the rows are globally ordered, so the *first elements* of the rows are themselves sorted.\n\n" +
            "**Key Idea.** Do binary search **twice**. First search space: the **rows**, keyed by each row's `[first, last]` range — find the one row whose range could contain `target`. Second search space: the **columns of that single row** — an ordinary sorted-array binary search.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Binary search over row indices `[top, bottom]`. For the middle row: if `target < matrix[mid][0]` the answer row is above (`bottom = mid - 1`); if `target > matrix[mid][-1]` it is below (`top = mid + 1`); otherwise `target` lies within this row's range — stop.\n" +
            "2. If no candidate row is found (`top > bottom`), return `false`.\n" +
            "3. Binary search within that row over columns `[left, right]`, comparing `matrix[row][mid]` to `target` exactly like a 1-D search.\n" +
            "4. Return whether the column search found `target`.\n\n" +
            "**Why it works.** The row search eliminates, each step, all rows whose entire range lies strictly on one side of `target` — safe because rows are globally ordered. At most one row can contain `target`, and within it the plain binary search is exact.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `matrix[mid][0]` and `matrix[mid][-1]` as the row's low/high bounds; comparing to just one end misclassifies the row.\n" +
            "- Handle 'no candidate row' before the column search, or you'll index a bad row.\n\n" +
            "**Complexity.** Time `O(log m + log n)` = `O(log(m·n))`. Space `O(1)`.\n\n" +
            "**Interview mindset.** Two nested search spaces (which row? then where in it?) is the natural mental model; mention the flattened one-pass version as the tighter alternative.",
          rcs:
            "class Solution:\n" +
            "    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        top, bottom = 0, rows - 1                 # Search space #1: which row.\n" +
            "        while top <= bottom:\n" +
            "            mid = (top + bottom) // 2\n" +
            "            if target < matrix[mid][0]:          # Row's range starts above target.\n" +
            "                bottom = mid - 1                 # Eliminate this row and below.\n" +
            "            elif target > matrix[mid][-1]:       # Row's range ends below target.\n" +
            "                top = mid + 1                    # Eliminate this row and above.\n" +
            "            else:                                # target within [first, last] of row.\n" +
            "                break\n" +
            "        if top > bottom:                         # No row could contain target.\n" +
            "            return False\n" +
            "        row = (top + bottom) // 2                # The candidate row.\n" +
            "        left, right = 0, cols - 1                # Search space #2: columns in that row.\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if matrix[row][mid] == target:\n" +
            "                return True\n" +
            "            if matrix[row][mid] < target:\n" +
            "                left = mid + 1                   # Eliminate left columns.\n" +
            "            else:\n" +
            "                right = mid - 1                  # Eliminate right columns.\n" +
            "        return False",
          plain:
            "class Solution:\n" +
            "    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        top, bottom = 0, rows - 1\n" +
            "        while top <= bottom:\n" +
            "            mid = (top + bottom) // 2\n" +
            "            if target < matrix[mid][0]:\n" +
            "                bottom = mid - 1\n" +
            "            elif target > matrix[mid][-1]:\n" +
            "                top = mid + 1\n" +
            "            else:\n" +
            "                break\n" +
            "        if top > bottom:\n" +
            "            return False\n" +
            "        row = (top + bottom) // 2\n" +
            "        left, right = 0, cols - 1\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if matrix[row][mid] == target:\n" +
            "                return True\n" +
            "            if matrix[row][mid] < target:\n" +
            "                left = mid + 1\n" +
            "            else:\n" +
            "                right = mid - 1\n" +
            "        return False"
        },
        {
          name: "Optimized — Flatten to One Sorted Array",
          time: "O(log(m·n))",
          space: "O(1)",
          whenToUse: "The cleanest single-pass solution; treats the whole grid as one sorted array with index mapping.",
          logic:
            "**What it asks.** Same membership test, but in a single binary search over the whole matrix.\n\n" +
            "**Why the naive idea fails.** A linear scan is `O(m·n)`; searching row-by-row is `O(m log n)`. Both miss that the two ordering guarantees make the matrix, read in row-major order, a **single strictly increasing sequence**.\n\n" +
            "**Key Idea.** Imagine the `m x n` grid **flattened** into one sorted array of length `m·n`. Binary search that virtual array over flat indices `[0, m·n - 1]`; convert a flat index back to a cell with `row = index // cols`, `col = index % cols`. No actual flattening is needed — the mapping is `O(1)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Let `cols = len(matrix[0])`; set the search space `left = 0`, `right = m·n - 1` (indices into the virtual flat array).\n" +
            "2. Take `mid`, then read the real value `matrix[mid // cols][mid % cols]`.\n" +
            "3. If it equals `target`, return `true`.\n" +
            "4. If it is `< target`, the target is later in the flattened order → **eliminate `[left, mid]`** with `left = mid + 1`.\n" +
            "5. If it is `> target`, the target is earlier → **eliminate `[mid, right]`** with `right = mid - 1`.\n" +
            "6. If the window empties, return `false`.\n\n" +
            "**Why it works.** The two properties guarantee the flattened sequence is sorted, so ordinary binary search is valid; each comparison eliminates half of the *remaining cells* just as in a 1-D array. The index/coordinate conversion is a bijection, so no cell is skipped or visited twice.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `cols` (the row length), not `rows`, in both `index // cols` and `index % cols`.\n" +
            "- `right` starts at `m·n - 1`, the last flat index, not `m·n`.\n" +
            "- This relies on the cross-row ordering; on LC 240 (rows/cols sorted but not globally) this exact trick is invalid.\n\n" +
            "**Complexity.** Time `O(log(m·n))`. Space `O(1)` — no real flattening.\n\n" +
            "**Interview mindset.** The reusable trick: when a grid is globally sorted in row-major order, binary search it as a 1-D array via `// cols` and `% cols`.\n\n" +
            "Trace on the example, target = 16: cols=4, L=0,R=11,M=5 → `matrix[1][1]=11 < 16` → L=6; L=6,R=11,M=8 → `matrix[2][0]=23 > 16` → R=7; L=6,R=7,M=6 → `matrix[1][2]=16 == 16` → return true.",
          rcs:
            "class Solution:\n" +
            "    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        left, right = 0, rows * cols - 1     # Flat indices into the virtual sorted array.\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            value = matrix[mid // cols][mid % cols]  # Map flat index -> (row, col).\n" +
            "            if value == target:\n" +
            "                return True\n" +
            "            if value < target:\n" +
            "                left = mid + 1              # Eliminate the earlier half.\n" +
            "            else:\n" +
            "                right = mid - 1             # Eliminate the later half.\n" +
            "        return False",
          plain:
            "class Solution:\n" +
            "    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:\n" +
            "        rows, cols = len(matrix), len(matrix[0])\n" +
            "        left, right = 0, rows * cols - 1\n" +
            "        while left <= right:\n" +
            "            mid = (left + right) // 2\n" +
            "            value = matrix[mid // cols][mid % cols]\n" +
            "            if value == target:\n" +
            "                return True\n" +
            "            if value < target:\n" +
            "                left = mid + 1\n" +
            "            else:\n" +
            "                right = mid - 1\n" +
            "        return False"
        }
      ],
      patternRecognition: [
        "Grid sorted within rows AND across rows (row's first > prev row's last) -> treat as one flat sorted array.",
        "Map flat index to a cell with row = idx // cols, col = idx % cols.",
        "Contrast with LC 240 (no cross-row ordering) which needs a staircase walk instead."
      ],
      interviewRecall: [
        "Flatten: left=0, right=m*n-1; value = matrix[mid//cols][mid%cols].",
        "Or two-step: binary search the row via [first,last], then binary search that row's columns.",
        "Use cols (row length) in both // and %; right starts at m*n-1."
      ]
    },

    {
      id: "koko-eating-bananas",
      lc: 875,
      title: "Koko Eating Bananas",
      difficulty: "Medium",
      category: "Binary Search",
      link: "https://leetcode.com/problems/koko-eating-bananas/",
      meta: { pattern: "Binary Search on the Answer", dataStructure: "Array", technique: "Monotonic feasibility" },
      description:
        "Koko has `piles` of bananas and the guards return in `h` hours. Each hour she picks one pile and eats up to `k` bananas from it; if the pile has fewer than `k` she eats the whole pile and does nothing more that hour (she never spreads one hour across two piles).\n\n" +
        "Return the **minimum** integer eating speed `k` such that she finishes all the bananas within `h` hours.",
      constraints: [
        "`1 <= piles.length <= 10^4`",
        "`piles.length <= h <= 10^9`",
        "`1 <= piles[i] <= 10^9`"
      ],
      notes: [
        "Because `h >= piles.length`, a speed of `max(piles)` always finishes in exactly `len(piles)` hours, so a valid answer always exists in `[1, max(piles)]`.",
        "Hours for one pile at speed `k` is `ceil(pile / k)` — the leftover of a partial pile still costs a whole hour.",
        "Speed above `max(piles)` never helps: a pile takes at least one hour regardless, so the answer is capped at `max(piles)`."
      ],
      examples: [
        {
          input: "piles = [3,6,7,11], h = 8",
          output: "4",
          reasoning: "At k=4: ceil(3/4)+ceil(6/4)+ceil(7/4)+ceil(11/4) = 1+2+2+3 = 8 <= 8. At k=3 it needs 1+2+3+4 = 10 > 8, so 4 is the minimum.",
          visual:
            "```\nspeed k :  1    2    3    4    5   ...\nfeasible?  N    N    N    Y    Y   ...  (hours <= h)\n                        ^ first Y = minimum k -> answer 4\n```"
        },
        {
          input: "piles = [30,11,23,4,20], h = 5",
          output: "30",
          reasoning: "Only 5 hours for 5 piles means one hour per pile, so k must clear the largest pile in one hour: k = 30."
        },
        {
          input: "piles = [30,11,23,4,20], h = 6",
          output: "23",
          reasoning: "With one extra hour the 30-pile can take two hours (k as low as 15 for it), but the binding pile is 23; k=23 gives 2+1+1+1+1 = 6 <= 6, and k=22 needs 7 hours."
        },
        {
          input: "piles = [312884470], h = 968709470",
          output: "1",
          reasoning: "Plenty of hours for one pile, so the slowest speed 1 suffices."
        }
      ],
      approaches: [
        {
          name: "Optimized — Binary Search on the Answer",
          time: "O(n log(max(piles)))",
          space: "O(1)",
          whenToUse: "The template for 'minimum/maximum value that satisfies a monotonic feasibility test' — search the answer range, not an array.",
          logic:
            "**What it asks.** Find the smallest integer speed `k` for which Koko's total eating time `sum(ceil(pile / k))` is at most `h`.\n\n" +
            "**Why the naive idea fails.** Trying every speed from `1` upward and returning the first that fits is `O(max(piles) · n)` — with `max(piles)` up to `10^9` that is hopeless. But it reveals the structure we exploit.\n\n" +
            "**Key Idea — binary search on the answer.** Here we do **not** binary search an input array; we binary search the **range of possible answers**, the speeds `[1, max(piles)]`. The unlocking property is **monotonicity of feasibility**: faster eating never takes more time, so if speed `k` finishes in time, so does every speed `> k`, and if `k` is too slow, so is every speed `< k`. Feasibility therefore looks like `N N N ... N Y Y ... Y`, and we want the **first `Y`** — the classic lower-bound binary search. The search space is the answer axis; each step eliminates the half of speeds that cannot be the minimum.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Define `feasible(k)` = `sum(ceil(pile / k) for pile in piles) <= h`. Compute `ceil(pile / k)` as `math.ceil(pile / k)` or the integer form `-(-pile // k)`.\n" +
            "2. Set the search space `left = 1`, `right = max(piles)` — the smallest and largest speeds worth considering.\n" +
            "3. Take `mid = (left + right) // 2`.\n" +
            "4. **If `feasible(mid)`**: `mid` works, but a smaller speed might too, so `mid` is a candidate we keep — **eliminate everything faster** with `right = mid`.\n" +
            "5. **If not `feasible(mid)`**: `mid` is too slow, and so is every speed below it — **eliminate `[left, mid]`** with `left = mid + 1`.\n" +
            "6. Loop `while left < right`; when the window collapses, `left` is the smallest feasible speed — return it.\n\n" +
            "**Why it works.** Monotonicity guarantees a single boundary between infeasible and feasible speeds. The invariant is that **the answer always lies in `[left, right]`**: the `right = mid` branch keeps `mid` (it is feasible, possibly the minimum), the `left = mid + 1` branch drops only proven-too-slow speeds. The window strictly shrinks, so it converges exactly to the first feasible speed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `right = mid` (not `mid - 1`) in the feasible branch — `mid` might itself be the minimum; pair it with `while left < right` to converge to one value.\n" +
            "- Round **up**: `ceil(pile / k)`, since a partial pile still consumes a full hour. `-(-pile // k)` is the overflow-free integer trick.\n" +
            "- `right` starts at `max(piles)`, not `sum(piles)`; larger speeds never reduce the hour count.\n" +
            "- Total hours can exceed 32-bit range in other languages (`n` up to `10^4`, each `ceil` up to `10^9`) — use 64-bit; Python is immune.\n\n" +
            "**Complexity.** Time `O(n log(max(piles)))` — `log(max(piles))` binary-search steps, each an `O(n)` feasibility sum. Space `O(1)`.\n\n" +
            "**Interview mindset.** The tell for 'binary search on the answer' is: you're asked for a minimum/maximum value, and you can write a monotonic yes/no feasibility check for a candidate value. Say 'the answer space is monotonic, so I binary search it and find the first feasible value.'\n\n" +
            "Trace on `[3,6,7,11], h = 8`: L=1,R=11,M=6 → hours 1+1+2+2=6 <=8 feasible → R=6; L=1,R=6,M=3 → 1+2+3+4=10 >8 infeasible → L=4; L=4,R=6,M=5 → 1+2+2+3=8 <=8 → R=5; L=4,R=5,M=4 → 1+2+2+3=8 <=8 → R=4; L=R=4 → return 4.",
          rcs:
            "import math\n" +
            "\n" +
            "class Solution:\n" +
            "    def minEatingSpeed(self, piles: List[int], h: int) -> int:\n" +
            "        def hours_needed(k: int) -> int:\n" +
            "            return sum(math.ceil(p / k) for p in piles)  # Whole hour per (partial) pile.\n" +
            "        left, right = 1, max(piles)          # Answer space: candidate speeds.\n" +
            "        while left < right:                  # Converge to the first feasible speed.\n" +
            "            mid = (left + right) // 2\n" +
            "            if hours_needed(mid) <= h:       # mid is fast enough...\n" +
            "                right = mid                  # ...keep it, try slower (eliminate faster).\n" +
            "            else:                            # mid too slow -> everything <= mid too slow.\n" +
            "                left = mid + 1               # Eliminate [left, mid].\n" +
            "        return left                          # Smallest feasible speed.",
          plain:
            "import math\n" +
            "\n" +
            "class Solution:\n" +
            "    def minEatingSpeed(self, piles: List[int], h: int) -> int:\n" +
            "        def hours_needed(k: int) -> int:\n" +
            "            return sum(math.ceil(p / k) for p in piles)\n" +
            "        left, right = 1, max(piles)\n" +
            "        while left < right:\n" +
            "            mid = (left + right) // 2\n" +
            "            if hours_needed(mid) <= h:\n" +
            "                right = mid\n" +
            "            else:\n" +
            "                left = mid + 1\n" +
            "        return left"
        }
      ],
      patternRecognition: [
        "'Minimum/maximum value such that a condition holds' + you can write a monotonic feasibility test -> binary search on the answer.",
        "Feasibility here is sum(ceil(pile/k)) <= h, monotonic in k (faster never costs more time).",
        "Search the answer range [1, max(piles)], not the input array."
      ],
      interviewRecall: [
        "left=1, right=max(piles); feasible(k) = sum(ceil(p/k)) <= h.",
        "feasible -> right = mid (keep, go slower); else left = mid + 1; loop while left < right.",
        "Round UP with ceil or -(-p//k); return left."
      ]
    },

    {
      id: "time-based-key-value-store",
      lc: 981,
      title: "Time Based Key-Value Store",
      difficulty: "Medium",
      category: "Binary Search",
      link: "https://leetcode.com/problems/time-based-key-value-store/",
      meta: { pattern: "Binary Search on Timestamps", dataStructure: "Hash Map + Sorted List", technique: "Upper-bound (bisect)" },
      description:
        "Design a time-based key-value store that supports setting a value for a key at a given timestamp and retrieving, for a key and query timestamp, the value stored at the **largest timestamp `<= ` the query**.\n\n" +
        "Implement `TimeMap`:\n" +
        "- `set(key, value, timestamp)` — stores `value` under `key` at time `timestamp`.\n" +
        "- `get(key, timestamp)` — returns the value whose stored time `time_prev` is the largest with `time_prev <= timestamp`; if there is no such value, return `\"\"`.",
      constraints: [
        "`1 <= key.length, value.length <= 100`",
        "`key` and `value` consist of lowercase/uppercase English letters and digits.",
        "`1 <= timestamp <= 10^7`",
        "**All `set` calls for a given key have strictly increasing timestamps.**",
        "At most `2 * 10^5` calls total to `set` and `get`."
      ],
      notes: [
        "The guarantee that timestamps are strictly increasing per key means each key's list is already sorted by append order — no sorting needed, which is exactly what makes binary search on `get` valid.",
        "`get` asks for a floor query (largest key <= query), which is an upper-bound search minus one: find the first entry strictly greater than the query, then step back one.",
        "Return `\"\"` when every stored timestamp for the key exceeds the query (or the key was never set)."
      ],
      examples: [
        {
          input: 'set("foo","bar",1); set("foo","bar2",4); get("foo",1); get("foo",3); get("foo",4); get("foo",5); get("foo",0)',
          output: '"bar", "bar", "bar2", "bar2", ""',
          reasoning: "get(1)->exact 'bar'. get(3)->largest time <=3 is 1 ->'bar'. get(4)->exact 'bar2'. get(5)->largest <=5 is 4 ->'bar2'. get(0)->no time <=0 ->''.",
          visual:
            "```\nfoo timeline:  (1,'bar')      (4,'bar2')\ntime:          1              4\nquery 3 -----------> floor is time 1 -> 'bar'\nquery 5 --------------------------> floor is time 4 -> 'bar2'\nquery 0 --> nothing <= 0 -> ''\n```"
        },
        {
          input: 'set("love","high",10); set("love","low",20); get("love",5); get("love",10); get("love",25)',
          output: '"", "high", "low"',
          reasoning: "get(5): no time <=5 -> ''. get(10): exact -> 'high'. get(25): largest <=25 is 20 -> 'low'."
        },
        {
          input: 'get("missing", 100)',
          output: '""',
          reasoning: "A key that was never set has an empty list, so the floor query returns \"\"."
        }
      ],
      approaches: [
        {
          name: "Optimized — Per-Key Sorted List + Binary Search",
          time: "O(1) set, O(log n) get",
          space: "O(total set calls)",
          whenToUse: "The intended design: append-only sorted timestamp lists per key, binary-searched on get for the floor entry.",
          logic:
            "**What it asks.** Support `set(key, value, timestamp)` and a `get(key, timestamp)` that returns the value at the **largest timestamp not exceeding** the query — a floor lookup over time.\n\n" +
            "**Why the naive idea fails.** Storing every write and, on each `get`, scanning all of a key's entries for the best timestamp `<= query` is `O(n)` per `get`; with up to `2·10^5` calls this is quadratic in the worst case. It also ignores that the timestamps arrive already sorted.\n\n" +
            "**Key Idea.** Keep a hash map `key -> list of (timestamp, value)`. Because the problem guarantees **strictly increasing timestamps per key**, each list is **sorted by timestamp automatically** as you append. A sorted list is exactly what binary search needs, so `get` becomes a floor query: over the search space of that key's timestamps, find the **rightmost entry with `timestamp <= query`**.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `__init__`: create `store = defaultdict(list)`.\n" +
            "2. `set`: append `(timestamp, value)` to `store[key]`. Sorted order is preserved for free by the increasing-timestamp guarantee — `O(1)`.\n" +
            "3. `get`: let `pairs = store[key]`. Binary search for the boundary between timestamps `<= query` and those `> query`. Using `bisect_right(pairs, (timestamp, chr(127)))` finds the first index whose timestamp is strictly greater than the query (the sentinel high character makes the tuple compare after any real value at the same timestamp, so an exact-timestamp match is included).\n" +
            "4. If that index `i` is `0`, no timestamp is `<= query` → return `\"\"`. Otherwise return `pairs[i - 1][1]`, the value at the largest qualifying timestamp.\n\n" +
            "**Why it works.** The search space is the sorted list of a key's timestamps; `bisect_right` eliminates, each step, the half that cannot hold the boundary, landing on the first entry strictly after the query in `O(log n)`. Stepping back one index gives the floor — the largest timestamp `<= query` — which is precisely the value `get` must return. If the boundary is at index 0, every stored time is greater than the query, so `\"\"` is correct.\n\n" +
            "**Common Gotchas.**\n" +
            "- This is a **floor** (largest `<= query`), so use an upper-bound search and step back one — not a plain equality search, which would miss the common between-timestamps case.\n" +
            "- Include exact matches: query `t` must return a value stored *at* `t`. The `chr(127)` sentinel (or `bisect_right` on a parallel list of just timestamps) ensures the equal-timestamp entry is on the `<=` side.\n" +
            "- Handle the empty/missing-key list → return `\"\"`; `defaultdict(list)` makes a missing key an empty list rather than a KeyError.\n" +
            "- The per-key increasing-timestamp guarantee is what lets `set` be `O(1)`; without it you'd need to insert in sorted position (`O(n)`) or sort lazily.\n\n" +
            "**Complexity.** `set` `O(1)`; `get` `O(log n)` where `n` is the number of writes for that key. Space `O(total set calls)`.\n\n" +
            "**Interview mindset.** 'Retrieve the most recent value at or before time T' over an append-only, time-ordered log is a floor query → hash map of sorted lists + `bisect`. Say which side exact matches fall on and why you step back one index.\n\n" +
            "Trace `get(\"foo\", 3)` with `foo = [(1,'bar'),(4,'bar2')]`: `bisect_right` for time 3 returns index 1 (1 is `<=3`, 4 is `>3`); `i-1 = 0` → `pairs[0][1] = 'bar'`.",
          rcs:
            "import bisect\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class TimeMap:\n" +
            "    def __init__(self):\n" +
            "        self.store = defaultdict(list)          # key -> sorted [(timestamp, value)]\n" +
            "\n" +
            "    def set(self, key: str, value: str, timestamp: int) -> None:\n" +
            "        self.store[key].append((timestamp, value))  # Timestamps arrive increasing -> stays sorted.\n" +
            "\n" +
            "    def get(self, key: str, timestamp: int) -> str:\n" +
            "        pairs = self.store[key]                  # Search space: this key's sorted times.\n" +
            "        # First index whose timestamp > query; chr(127) puts an exact match on the <= side.\n" +
            "        i = bisect.bisect_right(pairs, (timestamp, chr(127)))\n" +
            "        if i == 0:                              # Every stored time > query.\n" +
            "            return \"\"\n" +
            "        return pairs[i - 1][1]                  # Value at the largest time <= query.",
          plain:
            "import bisect\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class TimeMap:\n" +
            "    def __init__(self):\n" +
            "        self.store = defaultdict(list)\n" +
            "\n" +
            "    def set(self, key: str, value: str, timestamp: int) -> None:\n" +
            "        self.store[key].append((timestamp, value))\n" +
            "\n" +
            "    def get(self, key: str, timestamp: int) -> str:\n" +
            "        pairs = self.store[key]\n" +
            "        i = bisect.bisect_right(pairs, (timestamp, chr(127)))\n" +
            "        if i == 0:\n" +
            "            return \"\"\n" +
            "        return pairs[i - 1][1]"
        }
      ],
      patternRecognition: [
        "'Most recent value at or before time T' over a time-ordered log -> floor query via binary search.",
        "Per-key strictly increasing timestamps -> append keeps the list sorted, so set is O(1) and get can bisect.",
        "Hash map of sorted lists is the go-to structure for keyed, time-versioned lookups."
      ],
      interviewRecall: [
        "store = defaultdict(list); set appends (timestamp, value) (already sorted).",
        "get: bisect_right for first time > query, step back one; index 0 -> return \"\".",
        "It's a floor (largest <= query), not an equality search; make exact matches fall on the <= side."
      ]
    },

    {
      id: "median-of-two-sorted-arrays",
      lc: 4,
      title: "Median of Two Sorted Arrays",
      difficulty: "Hard",
      category: "Binary Search",
      link: "https://leetcode.com/problems/median-of-two-sorted-arrays/",
      meta: { pattern: "Binary Search on Partition", dataStructure: "Array", technique: "Partition invariant" },
      description:
        "Given two sorted arrays `nums1` and `nums2` of sizes `m` and `n`, return the **median** of the combined sorted array.\n\n" +
        "The overall run time complexity must be `O(log(m + n))` — and the intended solution achieves `O(log(min(m, n)))`.",
      constraints: [
        "`nums1.length == m`, `nums2.length == n`",
        "`0 <= m <= 1000`, `0 <= n <= 1000`, `1 <= m + n <= 2000`",
        "`-10^6 <= nums1[i], nums2[i] <= 10^6`",
        "Both `nums1` and `nums2` are sorted ascending."
      ],
      notes: [
        "The median splits the merged array into a left half and a right half of equal size (with the median(s) at the boundary); the whole trick is finding that split without merging.",
        "Always binary search the **smaller** array so the range of partition positions is `[0, min(m, n)]` — this gives `O(log(min(m, n)))` and avoids out-of-range partitions.",
        "Sentinels `-inf` / `+inf` at the ends let the boundary checks work uniformly when a partition sits at index 0 or at the array's end."
      ],
      examples: [
        {
          input: "nums1 = [1,3], nums2 = [2]",
          output: "2.0",
          reasoning: "Merged is [1,2,3]; the single middle element is 2.",
          visual:
            "```\nmerged: 1  2  3   (odd total) -> median is the middle = 2\n```"
        },
        {
          input: "nums1 = [1,2], nums2 = [3,4]",
          output: "2.5",
          reasoning: "Merged is [1,2,3,4]; even total, median = (2 + 3) / 2 = 2.5.",
          visual:
            "```\nmerged: 1  2 | 3  4   (even total) -> median = (max(left) + min(right)) / 2 = (2+3)/2\n```"
        },
        {
          input: "nums1 = [], nums2 = [1]",
          output: "1.0",
          reasoning: "One array empty; median of [1] is 1."
        },
        {
          input: "nums1 = [1,3], nums2 = [2,7]",
          output: "2.5",
          reasoning: "Merged [1,2,3,7]; median = (2 + 3) / 2 = 2.5."
        }
      ],
      approaches: [
        {
          name: "Optimized — Partition Binary Search on the Smaller Array",
          time: "O(log(min(m, n)))",
          space: "O(1)",
          whenToUse: "The expected logarithmic solution; binary search the cut position in the smaller array so the two left halves together form the lower half of the merge.",
          logic:
            "**What it asks.** Return the median of the merge of two sorted arrays without paying `O(m + n)` to merge them — in `O(log(min(m, n)))`.\n\n" +
            "**Why the naive idea fails.** Merging (or even walking halfway with two pointers) is `O(m + n)`, which violates the required bound. The order statistics are already implied by the two sorted arrays; we should exploit that, not rebuild the merged list.\n\n" +
            "**Key Idea — binary search on the partition.** A median splits the merged array into a **left half** and a **right half** of equal size, where every element on the left is `<=` every element on the right. Choose a cut `i` in `nums1` (so `i` elements of `nums1` go left) and a cut `j` in `nums2`; if we fix the total left size, then `j` is **determined** by `i` as `j = half - i`. So there is really **one degree of freedom, `i`**, and we binary search it over the **smaller** array. The **search space is the cut position `i` in `[0, m]`**, and each step eliminates the half of positions that can't give a valid partition.\n\n" +
            "**The partition invariant.** Let `aLeft = nums1[i-1]`, `aRight = nums1[i]`, `bLeft = nums2[j-1]`, `bRight = nums2[j]` (with `-inf`/`+inf` sentinels at the ends). A cut is the correct median split exactly when **`aLeft <= bRight` and `bLeft <= aRight`** — i.e. the largest element on the left of each array does not exceed the smallest on the right of the other. Since each array is internally sorted, this cross-check is all that's needed to guarantee every left element `<=` every right element.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Ensure `nums1` is the smaller array (swap if needed) so `i` ranges over the shorter one.\n" +
            "2. Set `half = (m + n) // 2`; search space `left = 0`, `right = m` for the cut `i`.\n" +
            "3. `i = (left + right) // 2`, then `j = half - i` (fixes the left-half size at `half`).\n" +
            "4. Compute `aLeft/aRight/bLeft/bRight` using `-inf`/`+inf` when a cut sits at an array's edge.\n" +
            "5. **If `aLeft <= bRight and bLeft <= aRight`** the partition is correct: for an odd total the median is `min(aRight, bRight)`; for an even total it is `(max(aLeft, bLeft) + min(aRight, bRight)) / 2`.\n" +
            "6. **If `aLeft > bRight`**, `i` is too far right — too many small-side elements from `nums1` — so **eliminate the right half**: `right = i - 1`.\n" +
            "7. **Otherwise (`bLeft > aRight`)**, `i` is too far left → **eliminate the left half**: `left = i + 1`.\n\n" +
            "**Why it works.** With the left-half size pinned to `half`, correctness reduces to the two cross inequalities. If `aLeft > bRight`, we took too much from `nums1`'s left, and moving `i` left (smaller) is the only fix, so every `i` at or above the current one is safe to discard; the symmetric argument handles `bLeft > aRight`. Feasibility is monotonic in `i`, so binary search converges to the unique correct cut. Sentinels make edge partitions (one array entirely on one side) obey the same inequalities.\n\n" +
            "**Common Gotchas.**\n" +
            "- Always search the **smaller** array; searching the larger can drive `j` negative or past its end.\n" +
            "- Use `float('-inf')` / `float('inf')` for the missing `aLeft/aRight/bLeft/bRight` at edges so the comparisons stay uniform.\n" +
            "- `j = half - i` must use the SAME `half = (m + n) // 2`; this floor choice puts the extra element on the right half, so the odd-case median is `min(aRight, bRight)`.\n" +
            "- Move `right = i - 1` / `left = i + 1` on the cut index; off-by-one here either loops or picks a wrong cut.\n\n" +
            "**Complexity.** Time `O(log(min(m, n)))` — binary search over the shorter array's cut positions. Space `O(1)`.\n\n" +
            "**Interview mindset.** Say it as: 'Don't merge — binary search the partition of the smaller array so the two left parts form the lower half; the answer is where `aLeft <= bRight` and `bLeft <= aRight`.' Naming the invariant and the `j = half - i` coupling is the core of the solution.\n\n" +
            "Trace on `nums1 = [1,3]`, `nums2 = [2]` (swap so smaller is `[2]`? m=1,n=2): half=1, L=0,R=1,i=0 → j=1; aLeft=-inf,aRight=2,bLeft=nums2[0]=1,bRight=nums2[1]=3; `-inf<=3` and `1<=2` → valid; odd total → `min(2,3)=2` → 2.0.",
          rcs:
            "class Solution:\n" +
            "    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n" +
            "        A, B = nums1, nums2\n" +
            "        if len(A) > len(B):\n" +
            "            A, B = B, A                     # Binary search the SMALLER array.\n" +
            "        m, n = len(A), len(B)\n" +
            "        total = m + n\n" +
            "        half = total // 2                   # Size of the combined left half.\n" +
            "        left, right = 0, m                  # Search space: cut position i in A.\n" +
            "        while left <= right:\n" +
            "            i = (left + right) // 2         # Elements of A on the left.\n" +
            "            j = half - i                   # Elements of B on the left (coupled to i).\n" +
            "            aLeft = A[i - 1] if i > 0 else float('-inf')   # Max of A's left part.\n" +
            "            aRight = A[i] if i < m else float('inf')       # Min of A's right part.\n" +
            "            bLeft = B[j - 1] if j > 0 else float('-inf')   # Max of B's left part.\n" +
            "            bRight = B[j] if j < n else float('inf')       # Min of B's right part.\n" +
            "            if aLeft <= bRight and bLeft <= aRight:        # Partition invariant holds.\n" +
            "                if total % 2:                              # Odd total.\n" +
            "                    return float(min(aRight, bRight))\n" +
            "                return (max(aLeft, bLeft) + min(aRight, bRight)) / 2  # Even total.\n" +
            "            elif aLeft > bRight:            # Took too much from A -> move cut left.\n" +
            "                right = i - 1\n" +
            "            else:                          # Took too little from A -> move cut right.\n" +
            "                left = i + 1\n" +
            "        return 0.0                          # Unreachable for valid input.",
          plain:
            "class Solution:\n" +
            "    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n" +
            "        A, B = nums1, nums2\n" +
            "        if len(A) > len(B):\n" +
            "            A, B = B, A\n" +
            "        m, n = len(A), len(B)\n" +
            "        total = m + n\n" +
            "        half = total // 2\n" +
            "        left, right = 0, m\n" +
            "        while left <= right:\n" +
            "            i = (left + right) // 2\n" +
            "            j = half - i\n" +
            "            aLeft = A[i - 1] if i > 0 else float('-inf')\n" +
            "            aRight = A[i] if i < m else float('inf')\n" +
            "            bLeft = B[j - 1] if j > 0 else float('-inf')\n" +
            "            bRight = B[j] if j < n else float('inf')\n" +
            "            if aLeft <= bRight and bLeft <= aRight:\n" +
            "                if total % 2:\n" +
            "                    return float(min(aRight, bRight))\n" +
            "                return (max(aLeft, bLeft) + min(aRight, bRight)) / 2\n" +
            "            elif aLeft > bRight:\n" +
            "                right = i - 1\n" +
            "            else:\n" +
            "                left = i + 1\n" +
            "        return 0.0"
        }
      ],
      patternRecognition: [
        "Median/k-th of two sorted arrays in O(log) -> binary search the PARTITION, don't merge.",
        "Search the smaller array's cut i; j = half - i couples the two cuts to fix the left-half size.",
        "Correct cut is the partition invariant: aLeft <= bRight and bLeft <= aRight."
      ],
      interviewRecall: [
        "Swap so you search the smaller array; half = (m+n)//2, i in [0, m], j = half - i.",
        "Use -inf/+inf sentinels at edges; valid when aLeft<=bRight and bLeft<=aRight.",
        "Odd -> min(aRight,bRight); even -> (max(aLeft,bLeft)+min(aRight,bRight))/2; else move i left/right."
      ]
    }
  ]);
})();
