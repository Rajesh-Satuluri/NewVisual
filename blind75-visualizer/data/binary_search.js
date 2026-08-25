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
            "**What it asks.** Find the smallest value in an ascending array that has been rotated. The minimum is exactly the *rotation point* — the single place where a larger number is immediately followed by a smaller one — and it must be found in `O(log n)`.\n\n" +
            "**Why the naive idea fails.** Scanning all `n` elements and taking the min is correct but `O(n)`. It throws away the huge amount of structure still present in the array and violates the required `O(log n)` bound.\n\n" +
            "**Key Idea.** A rotated sorted array is really **two ascending runs** glued together, and the second run is entirely *smaller* than the first. In `[4,5,6,7,0,1,2]` the left run `4,5,6,7` is all larger than the right run `0,1,2`; the minimum is the first element of the lower (right) run. The unlocking move is to compare `nums[mid]` to the **right end** `nums[right]` rather than the left: `nums[right]` always sits in the lower run when a rotation exists (and is the maximum when the array is unrotated), which makes the comparison unambiguous. If instead we compared `nums[mid]` to `nums[left]`, we could not distinguish a rotated array from a fully-sorted one without extra cases.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain a window `[left, right]` that is **guaranteed to still contain the minimum**; start it as the whole array. This is the search space, and each step discards a half that provably cannot hold the minimum.\n" +
            "2. Take `mid` as the midpoint of the current window.\n" +
            "3. **If `nums[mid] > nums[right]`**: the values dropped somewhere *after* mid (a bigger number lies left of a smaller one), so the minimum is **strictly to the right of mid**. Eliminate `left..mid` by setting `left = mid + 1`.\n" +
            "4. **If `nums[mid] <= nums[right]`**: the segment `mid..right` is cleanly ascending with no drop, so `nums[mid]` is the smallest value in it and nothing right of mid can be smaller. The minimum is `nums[mid]` or to its left, so keep mid by setting `right = mid` (not `mid - 1`).\n" +
            "5. Loop `while left < right`. When the window collapses to a single index, that index *is* the minimum — return `nums[left]`; no separate answer variable is needed.\n\n" +
            "**Why it works.** The loop invariant is that **the minimum always lies within `[left, right]`**, and every branch discards only a half proven not to contain it, so the invariant is preserved. The window also strictly shrinks each step (the `left = mid + 1` branch always advances; the `right = mid` branch shrinks because `mid < right` whenever `left < right`), so it converges to exactly the minimum.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `right = mid`, **not** `right = mid - 1`, in the ascending branch — `nums[mid]` is itself a live candidate and discarding it can drop the true minimum.\n" +
            "- Compare to `nums[right]`, not `nums[left]`; comparing to the left end fails to separate the rotated case from the sorted case.\n" +
            "- An unrotated array (rotation by a multiple of `n`) is handled automatically: `nums[mid] <= nums[right]` on the first step drives the window left until it lands on `nums[0]`.\n" +
            "- This uses `while left < right` (converge to one index), not `while left <= right`, which would loop forever with `right = mid`.\n\n" +
            "**Complexity.** Time `O(log n)` — the window halves each iteration. Space `O(1)` — only two indices.\n\n" +
            "**Interview mindset.** 'Sorted-ish but rotated + O(log n)' is the signal to run binary search on the rotation point. The line to say out loud: compare `mid` to `right`, then `right = mid` (keep mid) versus `left = mid + 1` (drop mid).\n\n" +
            "Trace on `[4,5,6,7,0,1,2]`: L=0,R=6,M=3 → `nums[3]=7 > nums[6]=2` → L=4; L=4,R=6,M=5 → `nums[5]=1 <= nums[6]=2` → R=5; L=4,R=5,M=4 → `nums[4]=0 <= nums[5]=1` → R=4; L=R=4 → return `nums[4]=0`.",
          rcs:
            "class Solution:\n" +
            "    def findMin(self, nums: List[int]) -> int:\n" +
            "        left, right = 0, len(nums) - 1      # Window guaranteed to contain the minimum.\n" +
            "        while left < right:                 # Stop when the window is one element.\n" +
            "            mid = (left + right) // 2       # Midpoint of the current window.\n" +
            "            if nums[mid] > nums[right]:     # A drop lies AFTER mid (upper run).\n" +
            "                left = mid + 1             # So the min is strictly right of mid.\n" +
            "            else:                          # nums[mid] <= nums[right]: mid..right ascends.\n" +
            "                right = mid                # Min is mid or left of it; keep mid.\n" +
            "        return nums[left]                  # left == right points at the minimum.",
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
            "**What it asks.** Return the index of `target` in a sorted-then-rotated array of distinct values, or `-1` if it is absent.\n\n" +
            "**The idea, and why it's slow.** Ignore the rotation entirely and walk the array from left to right, returning the first index whose value equals `target`, else `-1`. It is trivially correct, but it is `O(n)` — it throws away the fact that the array is (piecewise) sorted. The problem explicitly demands `O(log n)`, so this brute force serves only as the baseline that motivates the binary-search solution.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Iterate over `nums` with both index `i` and value.\n" +
            "2. If the value equals `target`, return `i` immediately.\n" +
            "3. If the loop finishes with no match, return `-1`.\n\n" +
            "**Complexity.** Time `O(n)` — every element may be inspected. Space `O(1)`.\n\n" +
            "**Interview mindset.** State this as the obvious baseline, then immediately pivot: the sorted-then-rotated structure plus an `O(log n)` requirement is the cue to reach for binary search.",
          rcs:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        for i, num in enumerate(nums):     # Look at every element in order.\n" +
            "            if num == target:             # Direct hit?\n" +
            "                return i                  # Return its index.\n" +
            "        return -1                          # Never found -> not present.",
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
            "**What it asks.** Locate `target` in one binary-search pass over a sorted-then-rotated array of distinct values, returning its index or `-1`, in `O(log n)`.\n\n" +
            "**Why the naive idea fails.** A linear scan is `O(n)` and ignores the ordering. But plain binary search fails too: ordinary binary search assumes the whole range is sorted so it can pick 'go left' vs 'go right' from `nums[mid]` alone. After rotation the range as a whole is *not* sorted, so that single comparison is no longer enough to know which side holds `target`.\n\n" +
            "**Key Idea.** A rotated sorted array is two ascending runs stuck together (e.g. `4 5 6 7 | 0 1 2`). The unlocking invariant is: **for any `mid`, at least one of the two halves `[left..mid]` or `[mid..right]` is fully sorted** — the single rotation point can lie in only one of them, so the other is a clean ascending stretch. Because values are distinct, one comparison tells us which half is sorted, and within a sorted half membership of `target` is a simple bounds check. So each step we identify the sorted half, decide whether `target` falls inside it, and eliminate the half that provably cannot contain it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain a window `[left, right]` — the search space that may still contain `target` — and take `mid` as its midpoint.\n" +
            "2. If `nums[mid] == target`, return `mid` immediately.\n" +
            "3. **Identify the sorted half.** If `nums[left] <= nums[mid]`, the **left half `[left..mid]` is sorted** (no drop between them); otherwise the drop is on the left, so the **right half `[mid..right]` is sorted**.\n" +
            "4. **Test `target` against the sorted half's ends.** If the left half is sorted and `nums[left] <= target < nums[mid]`, `target` is in it → `right = mid - 1`; else it can only be in the right half → `left = mid + 1`. If instead the right half is sorted and `nums[mid] < target <= nums[right]`, `target` is in it → `left = mid + 1`; else → `right = mid - 1`.\n" +
            "5. Loop `while left <= right`; if the window empties, return `-1`.\n\n" +
            "**Why it works.** We always test `target` against the boundaries of the half we *know* is sorted, where 'strictly between the ends' exactly means 'present in this half'. The half that fails that test provably cannot contain `target` — its values are either outside the range or lie in the other run — so discarding it is safe. Each step eliminates half the window and the remaining half still satisfies the invariant, so the search is both correct and converges. Termination is guaranteed because every branch moves `left` past `mid` or `right` below `mid`, strictly shrinking the window.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison for the sorted half must be `<=` (`nums[left] <= nums[mid]`), not `<`, so a two-element or equal-boundary window still classifies correctly.\n" +
            "- Get the in-range bounds right: the strict/non-strict ends (`nums[left] <= target < nums[mid]` and `nums[mid] < target <= nums[right]`) matter because `mid` was already handled.\n" +
            "- This relies on **distinct** values; with duplicates `nums[left] == nums[mid]` becomes ambiguous (that is the harder LC 81 variant).\n" +
            "- Use `right = mid - 1` / `left = mid + 1` (mid is already checked) with `while left <= right`, the standard exact-match template — off-by-one here either misses the target or loops.\n\n" +
            "**Complexity.** Time `O(log n)` — one half discarded per step. Space `O(1)` — just the two indices.\n\n" +
            "**Interview mindset.** The whole trick is: **identify the sorted half first** (compare `nums[left]` and `nums[mid]`), then apply a plain in-range check on that half to pick a direction. A rotated sorted array plus an `O(log n)` requirement is the exact signal for this technique.\n\n" +
            "Trace on `nums = [4,5,6,7,0,1,2]`, target = 0: L=0,R=6,M=3 → `nums[3]=7`≠0, `nums[0]=4 <= 7` left sorted, `4 <= 0 < 7`? no → L=4; L=4,R=6,M=5 → `nums[5]=1`≠0, `nums[4]=0 <= 1` left sorted, `0 <= 0 < 1`? yes → R=4; L=4,R=4,M=4 → `nums[4]=0`==target → return 4.",
          rcs:
            "class Solution:\n" +
            "    def search(self, nums: List[int], target: int) -> int:\n" +
            "        left, right = 0, len(nums) - 1          # Live window that may contain target.\n" +
            "        while left <= right:                    # Standard exact-match binary search.\n" +
            "            mid = (left + right) // 2           # Midpoint of the window.\n" +
            "            if nums[mid] == target:            # Direct hit at mid.\n" +
            "                return mid\n" +
            "            if nums[left] <= nums[mid]:        # LEFT half [left..mid] is sorted.\n" +
            "                if nums[left] <= target < nums[mid]:  # Target within the sorted left half?\n" +
            "                    right = mid - 1            # Yes: discard the right half.\n" +
            "                else:\n" +
            "                    left = mid + 1             # No: target must be in the right half.\n" +
            "            else:                              # Otherwise the RIGHT half [mid..right] is sorted.\n" +
            "                if nums[mid] < target <= nums[right]:  # Target within the sorted right half?\n" +
            "                    left = mid + 1             # Yes: discard the left half.\n" +
            "                else:\n" +
            "                    right = mid - 1            # No: target must be in the left half.\n" +
            "        return -1                              # Window emptied -> target absent.",
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
    }
  ]);
})();
