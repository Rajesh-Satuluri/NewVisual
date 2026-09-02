/*
 * Blind 75 — Two Pointers
 * =========================================================================
 * Registers the Two Pointers category on the global registry:
 *     window.BLIND75.register("Two Pointers", [ ...problems ]);
 *
 * Format matches data/arrays_hashing.js (the format reference). See that file
 * for the full problem schema documentation.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Two Pointers", [
    {
      id: "3sum",
      lc: 15,
      title: "3Sum",
      difficulty: "Medium",
      category: "Two Pointers",
      link: "https://leetcode.com/problems/3sum/",
      meta: { pattern: "Sort + Two Pointers", dataStructure: "Sorted Array", technique: "Fix one, converge two" },
      description:
        "Given an integer array `nums`, return **all unique triplets** `[nums[i], nums[j], nums[k]]` such that `i`, `j`, and `k` are three **different** indices and `nums[i] + nums[j] + nums[k] == 0`.\n\n" +
        "The solution set must **not contain duplicate triplets** — two triplets with the same three values (in any order) count as the same.",
      constraints: [
        "`3 <= nums.length <= 3000`",
        "`-10^5 <= nums[i] <= 10^5`"
      ],
      notes: [
        "The three indices must be distinct, but the same *value* may appear more than once in the array (e.g. `[0, 0, 0]`).",
        "Order of triplets in the output does not matter, and the order of values inside a triplet does not matter.",
        "The tricky part is not finding triplets — it is returning each unique one **exactly once**."
      ],
      examples: [
        {
          input: "nums = [-1, 0, 1, 2, -1, -4]",
          output: "[[-1, -1, 2], [-1, 0, 1]]",
          reasoning: "After sorting: [-4,-1,-1,0,1,2]. The distinct triplets summing to 0 are (-1,-1,2) and (-1,0,1). The second -1 does not create a duplicate triplet because of duplicate skipping.",
          visual:
            "```\nsorted:  -4  -1  -1   0   1   2\nindex:    0   1   2   3   4   5\n\nfix i=1 (-1):   L=2        R=5\n              -1  -1 ... 2   sum = -1 + -1 + 2 = 0  -> take [-1,-1,2]\n                     L=3   R=4\n              -1   0 ... 1   sum = -1 +  0 + 1 = 0  -> take [-1,0,1]\n```"
        },
        {
          input: "nums = [0, 1, 1]",
          output: "[]",
          reasoning: "No three of these values add to 0 (0+1+1 = 2)."
        },
        {
          input: "nums = [0, 0, 0]",
          output: "[[0, 0, 0]]",
          reasoning: "Three distinct indices all holding 0 sum to 0; there is exactly one unique triplet."
        },
        {
          input: "nums = [-2, 0, 0, 2, 2]",
          output: "[[-2, 0, 2]]",
          reasoning: "Only (-2, 0, 2) works. Even though 0 and 2 each appear twice, duplicate skipping ensures the triplet is reported once.",
          visual:
            "```\nsorted:  -2   0   0   2   2\nfix i=0 (-2):  L=1 -> R=4  sum=-2+0+2=0  take [-2,0,2]\n  then skip duplicate 0 at L, skip duplicate 2 at R\n  L, R cross -> done\n```"
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^3)",
          space: "O(n)",
          whenToUse: "Only to state the naive baseline before optimizing; too slow for the given limits.",
          logic:
            "**What it asks.** Return every distinct group of three values from `nums` that sums to zero, and report each unique triplet exactly once — no duplicates in the output, even when the array itself contains repeated values.\n\n" +
            "**Why the naive idea fails.** The most direct approach tries all index triples `(i, j, k)` with `i < j < k` and checks whether the three values sum to 0. There are about `n^3 / 6` such triples, so for `n = 3000` that is billions of checks — far too slow for the given limits. Worse, it does nothing on its own to prevent duplicate triplets, so a separate deduplication step becomes unavoidable.\n\n" +
            "**Key Idea.** Because the same value can sit at different indices, two different index-triples may produce the *same* triplet of values. Normalize each zero-sum hit by sorting its three values into a tuple, then store those tuples in a **set**, which collapses duplicates automatically regardless of the order in which the indices were discovered.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Use three nested loops with `i < j < k` to enumerate every index triple exactly once.\n" +
            "2. When `nums[i] + nums[j] + nums[k] == 0`, sort the three values and add the resulting tuple to a set.\n" +
            "3. After all triples are examined, convert the set of tuples back into a list of lists and return it.\n\n" +
            "**Why it works.** Every index-triple with `i < j < k` is examined, so no valid triplet can be missed. Sorting each hit into a canonical tuple and storing it in a set guarantees each distinct value-triplet is recorded exactly once, whatever order its members happened to be found in.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to canonicalize before inserting: `(-1, 0, 1)` and `(0, 1, -1)` are the same triplet and must collapse — always sort before adding to the set.\n" +
            "- All-equal inputs like `[0, 0, 0]` must still produce one triplet; three distinct indices holding equal values are valid.\n" +
            "- The set must hold tuples, not lists — lists are unhashable in Python.\n\n" +
            "**Complexity.** Time `O(n^3)` for the three nested loops; space `O(n)` for the set of unique triplets.\n\n" +
            "**Interview mindset.** State this only as the baseline before optimizing — it proves you understand the problem and the duplication trap, and it sets up the pivot to sort + two pointers that cuts a whole factor of `n`.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of int-lists.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls threeSum on it.\n\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:  # Return every unique triplet of values that sums to zero.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(nums)  # Cache the element count so we do not recompute len(nums) inside the loops.\n" +
            "                       # State: n is the number of valid indices, 0 through n - 1.\n" +
            "                       # Execution flow: Python continues to build the dedup set.\n\n" +
            "        found = set()  # Stores each zero-sum triplet ONCE, as a sorted tuple of its three values.\n" +
            "                       # Why a set: identical triplets found via different index orders collapse automatically.\n" +
            "                       # Why tuples: lists are unhashable in Python, so they cannot be set members.\n" +
            "                       # State: found starts empty and gains one entry per DISTINCT triplet.\n" +
            "                       # Execution flow: Python enters the outer loop.\n\n" +
            "        # ==================== PHASE 2: TRY EVERY INDEX TRIPLE i < j < k ====================\n\n" +
            "        for i in range(n):  # Fix the first index i of the triple.\n" +
            "                            # Loop invariant: every triple whose first index is < i has already been tested.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i automatically.\n\n" +
            "            for j in range(i + 1, n):  # Second index, always AFTER i.\n" +
            "                                       # Why i + 1: keeps i < j so no index repeats and each pair is seen once.\n" +
            "                                       # Execution flow: after one j finishes, Python assigns the next j.\n\n" +
            "                for k in range(j + 1, n):  # Third index, always AFTER j.\n" +
            "                                           # Why j + 1: keeps j < k, so the three indices i < j < k are distinct.\n" +
            "                                           # Execution flow: after one k finishes, Python assigns the next k.\n\n" +
            "                    if nums[i] + nums[j] + nums[k] == 0:  # Do these three values sum to zero?\n" +
            "                        triplet = tuple(sorted((nums[i], nums[j], nums[k])))  # Canonical form: sort the three values.\n" +
            "                                                                              # Why sort: (-1, 0, 1) and (0, 1, -1) must count as the SAME triplet.\n" +
            "                        found.add(triplet)  # Insert the canonical triplet; a repeat is silently ignored by the set.\n" +
            "                                            # State change: found now contains this triplet exactly once.\n" +
            "                                            # Execution flow: fall through to the next k -- no early exit, we want ALL triplets.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return [list(t) for t in found]  # Convert each stored tuple back into a list for the expected output shape.\n" +
            "                                         # Execution flow: return ends threeSum; the caller receives the unique triplets.",
          plain:
            "class Solution:\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:\n" +
            "        n = len(nums)\n" +
            "        found = set()\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                for k in range(j + 1, n):\n" +
            "                    if nums[i] + nums[j] + nums[k] == 0:\n" +
            "                        triplet = tuple(sorted((nums[i], nums[j], nums[k])))\n" +
            "                        found.add(triplet)\n" +
            "        return [list(t) for t in found]"
        },
        {
          name: "Optimized — Sort + Two Pointers",
          time: "O(n^2)",
          space: "O(1) or O(n)",
          whenToUse: "The expected answer: reduce a k-sum problem by one dimension by sorting and sweeping two pointers inward.",
          logic:
            "**What it asks.** Return all unique zero-sum triplets, efficiently enough for `n` up to 3000, with no duplicate triplets in the output.\n\n" +
            "**Why the naive idea fails.** Checking all `O(n^3)` triples is far too slow at these limits, and it forces a separate deduplication pass over the results afterward.\n\n" +
            "**Key Idea.** 3Sum is really *for each fixed first value, solve 2Sum-to-a-target on the rest*, where the target is `-nums[i]`. If we **sort** the array first, that inner 2Sum can be solved with two converging pointers in linear time instead of a hash map — and sorting also groups equal values together, which makes deduplication trivial. After sorting, values increase from left to right, so a `left` pointer just after the fixed element and a `right` pointer at the end can be steered by the sign of `total = nums[i] + nums[left] + nums[right]`. Moving `left` rightward lands on a *larger* value, so it can only *increase* the sum; moving `right` leftward lands on a *smaller* value, so it can only *decrease* the sum. That gives an unambiguous rule: if `total < 0` the sum is too small, advance `left`; if `total > 0` it is too big, retreat `right`; if `total == 0` we have a triplet. Because each move changes the sum in a known direction, we never need to backtrack, and the pair sweeps inward in `O(n)` per fixed element.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `nums`. `i` will be the fixed first element; `left` and `right` bound the still-unexamined window `nums[left..right]` whose two-sum target is `-nums[i]`.\n" +
            "2. For each `i`: if `nums[i] > 0`, stop entirely with `break` — once the smallest of three ascending values is positive, their sum is strictly positive and can never reach 0. If `nums[i]` equals the previous fixed value (`i > 0 and nums[i] == nums[i-1]`), **skip** it with `continue` to avoid repeating triplets already produced by that value.\n" +
            "3. Set `left = i+1`, `right = n-1`, and move them inward according to the sign of `total`.\n" +
            "4. On a hit, record `[nums[i], nums[left], nums[right]]`, advance **both** pointers, then walk `left` forward while `nums[left] == nums[left-1]` and `right` backward while `nums[right] == nums[right+1]`, so an adjacent equal value cannot re-emit the triplet just recorded.\n\n" +
            "**Why it works.** Sorting groups equal values, so the two skip rules provably reach every distinct triplet exactly once. Skipping an equal `nums[i]` avoids re-running an inner scan that could only reproduce triplets already found for that first value. The post-hit skips prevent adjacent duplicates, and because they run *only after* the triplet is recorded, no genuinely new pair is ever lost. The two-pointer sweep itself is a complete search of the 2Sum subproblem: whenever it discards a pointer position, that value has been shown too small or too large to complete any pair with the values still in range, so nothing is missed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Two independent dedup steps are needed — the skip on `nums[i]` and the post-hit skips on `left`/`right`; missing either produces duplicate triplets.\n" +
            "- Skip duplicates *after* recording a hit, never before, or you will drop valid pairs.\n" +
            "- Guard the inner skip loops with `left < right` so the pointers do not cross while skipping.\n" +
            "- The `nums[i] > 0` early exit must be a `break`, not a `continue` — once the fixed value is positive, every later fixed value is too, so there is nothing left to try.\n\n" +
            "**Complexity.** Sorting is `O(n log n)`; the outer loop with an inner linear sweep is `O(n^2)`, which dominates. Extra space is `O(1)` beyond the output (or `O(n)` depending on the sort implementation).\n\n" +
            "**Interview mindset.** *Find k numbers that sum to a target* almost always means: sort, fix `k-2` of them with loops, and finish with two pointers. 3Sum is the canonical instance of that template.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of int-lists.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls threeSum on it.\n\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:  # Return every unique triplet of values that sums to zero.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        nums.sort()  # Sort ascending so values grow left to right; this is what unlocks two pointers.\n" +
            "                     # Why sort: it makes the running sum move predictably AND clusters equal values for easy dedup.\n" +
            "                     # State change: nums is now in non-decreasing order.\n" +
            "                     # Execution flow: Python continues to set up the loop.\n\n" +
            "        n = len(nums)  # Cache the length so we do not recompute len(nums) each iteration.\n" +
            "                       # State: valid indices are 0 through n - 1.\n\n" +
            "        result = []  # Collects the unique triplets we confirm sum to zero.\n" +
            "                     # State: starts empty and grows only on confirmed hits.\n" +
            "                     # Execution flow: Python enters the outer loop.\n\n" +
            "        # ==================== PHASE 2: FIX THE FIRST NUMBER ====================\n\n" +
            "        for i in range(n):  # Fix nums[i] as the first value of the triplet.\n" +
            "                            # Loop invariant: all unique triplets whose smallest fixed value is < nums[i] are already in result.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i.\n\n" +
            "            if nums[i] > 0:  # The smallest of the three ascending values is already positive.\n" +
            "                break        # Control-flow: three positive values cannot sum to 0, and every LATER i is >= this one.\n" +
            "                             # Why break (not continue): the rest of the array is positive too, so no work remains.\n\n" +
            "            if i > 0 and nums[i] == nums[i - 1]:  # This first value equals the one we just processed.\n" +
            "                continue                          # Control-flow: skip it -- it would only reproduce triplets already recorded.\n" +
            "                                                  # Why safe: duplicates are adjacent after sorting, so nums[i-1] already covered them.\n\n" +
            "            # ==================== PHASE 3: TWO-POINTER SEARCH FOR -nums[i] ====================\n\n" +
            "            left, right = i + 1, n - 1  # Search the sorted window to the right of i for two values summing to -nums[i].\n" +
            "                                        # State: left starts small, right starts large; the window shrinks inward.\n\n" +
            "            while left < right:  # While the window holds at least two distinct positions.\n" +
            "                                 # Loop invariant: [left, right] is the unexplored window; positions outside cannot form a NEW triplet.\n\n" +
            "                total = nums[i] + nums[left] + nums[right]  # Sum of the fixed value and the two pointer values.\n\n" +
            "                if total < 0:    # Sum too small: we need a bigger value.\n" +
            "                    left += 1    # Move left rightward onto a LARGER value, which raises the sum.\n" +
            "                                 # Why only useful direction: right already sits at the largest value in range.\n" +
            "                elif total > 0:  # Sum too big: we need a smaller value.\n" +
            "                    right -= 1   # Move right leftward onto a SMALLER value, which lowers the sum.\n" +
            "                                 # Why only useful direction: left already sits at the smallest value in range.\n" +
            "                else:            # total == 0: exactly a zero-sum triplet.\n" +
            "                    result.append([nums[i], nums[left], nums[right]])  # Record this triplet.\n" +
            "                    left += 1    # Advance BOTH pointers off the pair we just used...\n" +
            "                    right -= 1   # ...since reusing either value with the other end repeats this same triplet.\n" +
            "                    while left < right and nums[left] == nums[left - 1]:   # Skip duplicate left values.\n" +
            "                        left += 1                                          # Why after recording: an equal left would re-emit the triplet.\n" +
            "                    while left < right and nums[right] == nums[right + 1]: # Skip duplicate right values.\n" +
            "                        right -= 1                                         # Guard left < right so the pointers never cross while skipping.\n\n" +
            "        # ==================== PHASE 4: RETURN ====================\n\n" +
            "        return result  # Every unique zero-sum triplet, each recorded exactly once.\n" +
            "                       # Execution flow: return ends threeSum; the caller receives the answer.",
          plain:
            "class Solution:\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:\n" +
            "        nums.sort()\n" +
            "        n = len(nums)\n" +
            "        result = []\n" +
            "        for i in range(n):\n" +
            "            if nums[i] > 0:\n" +
            "                break\n" +
            "            if i > 0 and nums[i] == nums[i - 1]:\n" +
            "                continue\n" +
            "            left, right = i + 1, n - 1\n" +
            "            while left < right:\n" +
            "                total = nums[i] + nums[left] + nums[right]\n" +
            "                if total < 0:\n" +
            "                    left += 1\n" +
            "                elif total > 0:\n" +
            "                    right -= 1\n" +
            "                else:\n" +
            "                    result.append([nums[i], nums[left], nums[right]])\n" +
            "                    left += 1\n" +
            "                    right -= 1\n" +
            "                    while left < right and nums[left] == nums[left - 1]:\n" +
            "                        left += 1\n" +
            "                    while left < right and nums[right] == nums[right + 1]:\n" +
            "                        right -= 1\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "\"Find triplets / k numbers that sum to a target\" in an array where order doesn't matter.",
        "Duplicates must be avoided in the output -> sort first so equal values cluster and can be skipped.",
        "You reduced the problem to 2Sum-on-a-sorted-range -> two pointers converging inward.",
        "The array can be reordered freely (you only need values, not original indices)."
      ],
      interviewRecall: [
        "Template: sort, fix element i with an outer loop, two-pointer the rest for target -nums[i].",
        "Two dedup steps: skip equal nums[i] before scanning, and skip equal left/right AFTER recording a hit.",
        "Move left right when the sum is too small, move right left when too big — sorted order makes the direction unambiguous.",
        "Early break when nums[i] > 0 since all following values are also positive."
      ]
    },

    {
      id: "container-with-most-water",
      lc: 11,
      title: "Container With Most Water",
      difficulty: "Medium",
      category: "Two Pointers",
      link: "https://leetcode.com/problems/container-with-most-water/",
      meta: { pattern: "Converging Two Pointers", dataStructure: "Array", technique: "Move the shorter wall" },
      description:
        "You are given an integer array `height` of length `n`, where `height[i]` is the height of a vertical line drawn at x-coordinate `i`.\n\n" +
        "Pick **two** of these lines that, together with the x-axis, form a container. Return the **maximum amount of water** the container can hold.\n\n" +
        "The container's water area is `width * height`, where the width is the horizontal distance between the two lines and the height is the **shorter** of the two lines (water spills over the lower wall). The container cannot be tilted.",
      constraints: [
        "`n == height.length`",
        "`2 <= n <= 10^5`",
        "`0 <= height[i] <= 10^4`"
      ],
      notes: [
        "Area is limited by the SHORTER of the two chosen lines, not the taller one.",
        "This is not the same as the trapping-rain-water problem — here you choose exactly two walls and ignore everything between them."
      ],
      examples: [
        {
          input: "height = [1, 8, 6, 2, 5, 4, 8, 3, 7]",
          output: "49",
          reasoning: "Lines at index 1 (height 8) and index 8 (height 7) give width 7 and limiting height min(8,7)=7, so area = 7 * 7 = 49, the maximum.",
          visual:
            "```\nindex:  0  1  2  3  4  5  6  7  8\nheight: 1  8  6  2  5  4  8  3  7\n           |                    |\n           |  <-- width = 7 --> |\n           +--------------------+  height = min(8,7) = 7\n           area = 7 * 7 = 49\n```"
        },
        {
          input: "height = [1, 1]",
          output: "1",
          reasoning: "Only one pair: width 1, height min(1,1)=1, so area = 1.",
          visual:
            "```\nL          R\n1          1\nwidth = 1, height = 1, area = 1\n```"
        },
        {
          input: "height = [4, 3, 2, 1, 4]",
          output: "16",
          reasoning: "The two outermost 4s: width 4, height min(4,4)=4, area = 16."
        },
        {
          input: "height = [1, 2, 4, 3]",
          output: "4",
          reasoning: "Lines at index 1 (height 2) and index 3 (height 3): width 2, height min(2,3)=2, area=4. Also index 2 and 3 give width 1, height 3, area 3 — smaller."
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "Only as the naive baseline to state before optimizing; too slow for n up to 10^5.",
          logic:
            "**What it asks.** Choose two of the vertical lines that, together with the x-axis, hold the most water — maximize `width * min(height)` over every pair of lines.\n\n" +
            "**Why the naive idea fails.** The most direct approach tries every pair of lines `(i, j)`, computes the area `(j - i) * min(height[i], height[j])`, and keeps the maximum seen. There are about `n^2 / 2` pairs, so for `n = 10^5` that is roughly 5 billion evaluations — far too slow for the given limits.\n\n" +
            "**Key Idea.** There is no clever insight to lean on here; the value of the brute force is simply that it exhaustively considers every candidate pair. That makes it an unmissable correctness baseline and a reference the optimized two-pointer version must agree with.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a running `best`, the largest area found so far, initialized to 0.\n" +
            "2. The outer loop fixes the left line `i`.\n" +
            "3. The inner loop tries every line `j` strictly to the right of `i`.\n" +
            "4. Compute `(j - i) * min(height[i], height[j])` and update `best` with the larger of the two.\n\n" +
            "**Why it works.** Every unordered pair of lines is considered exactly once, so the optimal container is necessarily evaluated and its area captured in `best`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The height is the `min` of the two walls, not the max — water spills over the shorter wall.\n" +
            "- Start the inner loop at `i + 1` to avoid pairing a line with itself and to avoid re-checking the same pair twice.\n" +
            "- With `n` up to 10^5 this will time out; state it only as a stepping stone toward the linear solution.\n\n" +
            "**Complexity.** Time `O(n^2)` for the nested loops; space `O(1)`.\n\n" +
            "**Interview mindset.** Name the brute force to lock down the definition of area (the min of the two walls times the width), then immediately look for a way to discard candidates without checking them — which points straight at two pointers.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a single int.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls maxArea on it.\n\n" +
            "    def maxArea(self, height: List[int]) -> int:  # Return the maximum water area over all pairs of walls.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(height)  # Cache the wall count so we do not recompute len(height) inside the loops.\n" +
            "                         # State: valid line indices are 0 through n - 1.\n\n" +
            "        best = 0  # Largest area found so far; 0 is a safe floor since areas are non-negative.\n" +
            "                  # State: best only ever increases as we discover larger containers.\n" +
            "                  # Execution flow: Python enters the outer loop.\n\n" +
            "        # ==================== PHASE 2: TRY EVERY PAIR OF WALLS ====================\n\n" +
            "        for i in range(n):  # Fix the left line i.\n" +
            "                            # Loop invariant: the best area among all pairs whose left line is < i is already in best.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i.\n\n" +
            "            for j in range(i + 1, n):  # Try every right line j strictly to the right of i.\n" +
            "                                       # Why i + 1: keeps i < j so no line pairs with itself and each pair is seen once.\n" +
            "                                       # Execution flow: after one j finishes, Python assigns the next j.\n\n" +
            "                area = (j - i) * min(height[i], height[j])  # Width (j - i) times the LIMITING (shorter) wall.\n" +
            "                                                            # Why min: water spills over the shorter of the two walls.\n\n" +
            "                best = max(best, area)  # Keep the larger of the previous best and this container.\n" +
            "                                        # State change: best updates only when this pair beats it.\n" +
            "                                        # Execution flow: fall through to the next j.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return best  # The maximum area over every pair of walls.\n" +
            "                     # Execution flow: return ends maxArea; the caller receives the answer.",
          plain:
            "class Solution:\n" +
            "    def maxArea(self, height: List[int]) -> int:\n" +
            "        n = len(height)\n" +
            "        best = 0\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                area = (j - i) * min(height[i], height[j])\n" +
            "                best = max(best, area)\n" +
            "        return best"
        },
        {
          name: "Optimized — Two Pointers (move the shorter wall)",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected answer: converging two pointers when an area/width is maximized by walls at the two ends.",
          logic:
            "**What it asks.** Find the maximum water area over all pairs of walls, `width * min(height)`, in linear time.\n\n" +
            "**Why the naive idea fails.** Evaluating all `O(n^2)` pairs is too slow at `n` up to 10^5, and most of those pairs can be ruled out without ever computing them.\n\n" +
            "**Key Idea.** Start with the **widest possible** container: one pointer at each end. This pair has the maximum width, so any *other* pair is strictly narrower and can only beat it by being **taller** — by having a larger *limiting* (shorter) wall. That observation lets us throw away exactly one wall per step. Suppose `height[left] < height[right]`, so `left` is the bottleneck. Consider what happens if we keep `left` and instead move the taller wall `right` inward: the width strictly shrinks, and the limiting height stays capped at `height[left]` (since `left` is still the shorter wall). So every container that pairs the short wall `left` with any *nearer* right wall is no larger than the one we just measured — none of them can win. That is why we always move the pointer at the **shorter** wall: the short wall is the bottleneck, and the only hope of a bigger area is to replace it with something taller; moving the taller wall could only shrink the width while leaving the bottleneck in place. So we safely **discard the shorter wall** and never revisit it. (Note we do not sort as in 3Sum — the pointers instead exploit that width is maximal at the ends and shrinks monotonically inward, trading width for a shot at more height.)\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set `left = 0` and `right = n-1` (the widest container), and `best = 0` to track the largest area found.\n" +
            "2. Compute `area = (right - left) * min(height[left], height[right])` and update `best`.\n" +
            "3. Move whichever pointer sits at the shorter wall inward; if the two walls are equal, moving either is fine.\n" +
            "4. Repeat until the pointers meet.\n\n" +
            "**Why it works.** Each move discards only containers that are provably no larger than one already measured (the exchange argument above), so the optimum is never skipped. Exactly one pointer advances every step, so the pointers meet after `O(n)` steps while still having covered the optimal pair along the way.\n\n" +
            "**Common Gotchas.**\n" +
            "- Move the pointer at the **shorter** wall; moving the taller one can never raise the limiting height and may skip the optimum.\n" +
            "- When the walls are equal, moving either is safe — but move exactly one, not both prematurely.\n" +
            "- Record the area **before** moving a pointer, so no candidate is missed.\n" +
            "- Use strict `left < right` as the loop condition; a wall paired with itself has zero width.\n\n" +
            "**Complexity.** A single inward sweep gives time `O(n)`, space `O(1)`.\n\n" +
            "**Interview mindset.** When you want to maximize something governed by two endpoints and a min/width trade-off, start at the extremes and greedily discard the limiting side. Be ready to justify WHY discarding the shorter wall loses nothing — that exchange argument is the whole interview.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a single int.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls maxArea on it.\n\n" +
            "    def maxArea(self, height: List[int]) -> int:  # Return the maximum water area over all pairs of walls.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        left, right = 0, len(height) - 1  # Start with the WIDEST possible container: the two extreme walls.\n" +
            "                                          # Why the ends: width is maximal here, so any other pair must win on HEIGHT instead.\n" +
            "                                          # State: [left, right] is the current candidate width; it only shrinks from here.\n\n" +
            "        best = 0  # Largest area found so far; 0 is a safe floor since areas are non-negative.\n" +
            "                  # State: best only ever increases.\n" +
            "                  # Execution flow: Python enters the sweep loop.\n\n" +
            "        # ==================== PHASE 2: CONVERGE, ALWAYS MOVING THE SHORTER WALL ====================\n\n" +
            "        while left < right:  # Continue while the two walls still enclose a positive width.\n" +
            "                             # Loop invariant: the optimal pair still lies within [left, right]; no discarded pair could beat best.\n" +
            "                             # Why strict <: left == right is a wall paired with itself, which has zero width.\n\n" +
            "            area = (right - left) * min(height[left], height[right])  # Width times the LIMITING (shorter) wall.\n" +
            "                                                                      # Why min: water spills over the shorter of the two walls.\n\n" +
            "            best = max(best, area)  # Keep the larger of the previous best and this container.\n" +
            "                                    # Why before moving: record the area first so this candidate is never skipped.\n\n" +
            "            if height[left] < height[right]:  # The LEFT wall is the bottleneck.\n" +
            "                left += 1                     # Discard it: keeping it and shrinking width could only match or lose.\n" +
            "                                              # Why-safe: any nearer right wall paired with this short left is <= the area just measured.\n" +
            "                                              # Why this is the only useful move: only a TALLER left wall can raise the limiting height.\n" +
            "            else:                             # The RIGHT wall is the bottleneck (or the two are equal).\n" +
            "                right -= 1                    # Discard the shorter/equal right wall for the same exchange-argument reason.\n" +
            "                                              # Why equal is fine: when heights tie, moving either loses no strictly larger container.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return best  # The maximum water area achievable by any pair of walls.\n" +
            "                     # Execution flow: return ends maxArea; the caller receives the answer.",
          plain:
            "class Solution:\n" +
            "    def maxArea(self, height: List[int]) -> int:\n" +
            "        left, right = 0, len(height) - 1\n" +
            "        best = 0\n" +
            "        while left < right:\n" +
            "            area = (right - left) * min(height[left], height[right])\n" +
            "            best = max(best, area)\n" +
            "            if height[left] < height[right]:\n" +
            "                left += 1\n" +
            "            else:\n" +
            "                right -= 1\n" +
            "        return best"
        }
      ],
      patternRecognition: [
        "Maximize an area/value determined by two endpoints, where the value uses the MIN of the two and the distance between them.",
        "Starting at both ends and converging inward feels natural -> two pointers.",
        "You catch yourself checking all pairs -> ask whether one side can be safely discarded each step.",
        "Distinct from trapping rain water: here you pick exactly two walls, not all of them."
      ],
      interviewRecall: [
        "Begin with the widest container (pointers at both ends).",
        "Always move the pointer at the SHORTER wall inward — moving the taller one can never increase the limiting height.",
        "Be able to state the exchange argument: keeping the short wall and shrinking width only makes area smaller or equal.",
        "Single pass, O(n) time, O(1) space; update best before moving a pointer."
      ]
    },

    {
      id: "valid-palindrome",
      lc: 125,
      title: "Valid Palindrome",
      difficulty: "Easy",
      category: "Two Pointers",
      link: "https://leetcode.com/problems/valid-palindrome/",
      meta: { pattern: "Two Pointers", dataStructure: "String", technique: "Converging pointers" },
      description:
        "Given a string `s`, consider only its **alphanumeric** characters and ignore case. Return `true` if the resulting sequence reads the same forwards and backwards.",
      constraints: [
        "`1 <= s.length <= 2 * 10^5`",
        "`s` may contain letters, digits, spaces, and punctuation."
      ],
      notes: [
        "An empty string (after filtering) is considered a palindrome → true.",
        "Comparison is case-insensitive and ignores non-alphanumeric characters."
      ],
      examples: [
        { input: 's = "A man, a plan, a canal: Panama"', output: "true", reasoning: "Filtered/lowercased: 'amanaplanacanalpanama' reads the same both ways." },
        { input: 's = "race a car"', output: "false", reasoning: "'raceacar' reversed is 'racaecar' — not equal." },
        { input: 's = " "', output: "true", reasoning: "No alphanumerics → empty → palindrome.",
          visual: "```\nA man , a ... Panama\n^                  ^\nl                  r   compare ends, skip non-alnum, move inward\n```" }
      ],
      approaches: [
        {
          name: "Filter then compare",
          time: "O(n)", space: "O(n)",
          whenToUse: "Most readable; fine unless O(1) space is required.",
          logic:
            "**What it asks.** Look at the string `s` but consider only its **alphanumeric** characters (letters and digits), treating uppercase and lowercase as the same. Return `true` if that filtered, case-folded sequence reads identically forwards and backwards. Spaces, punctuation, and letter case are all noise that must be ignored before you judge symmetry.\n\n" +
            "**Why the naive idea fails.** The tempting one-liner is to compare `s` directly against `s[::-1]`. That is wrong for this problem: `'A man, a plan, a canal: Panama'` reversed is not equal to itself character-for-character, because the raw string still carries capitals, spaces, commas, and a colon. The comparison would report `false` for a genuine palindrome. The fix is not a smarter comparison but a **normalization step first**: strip everything that does not count and fold case, so that only the meaningful characters are ever compared.\n\n" +
            "**Key Idea.** Split the job into *canonicalize, then check*. First build a cleaned sequence containing exactly the characters that matter — each alphanumeric character, lowercased. Once the string has been reduced to that canonical form, the palindrome test is the textbook one: a sequence is a palindrome **if and only if it equals its own reverse**. All the problem-specific rules (ignore case, ignore punctuation) live entirely in how the cleaned sequence is built, leaving the comparison trivial.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Walk the string once and keep only the characters for which `c.isalnum()` is true, applying `c.lower()` to each so case no longer matters. Collect them into a list `cleaned`.\n" +
            "2. Produce the reverse of that list with `cleaned[::-1]`.\n" +
            "3. Return whether `cleaned == cleaned[::-1]`; Python compares the two sequences element by element, which is exactly the mirrored-pair check a palindrome requires.\n\n" +
            "**Why it works.** Filtering canonicalizes the input down to precisely the characters the problem cares about, so every character remaining in `cleaned` is one that must participate in the symmetry test — no more, no less. For any sequence, equalling its own reverse is the definition of a palindrome: position `k` from the front must equal position `k` from the back for all `k`, and `==` against the reversed copy verifies all of those at once. An all-junk input filters down to an empty list, and an empty list equals its own reverse, correctly yielding `true`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Lowercase while filtering, not after comparing — otherwise `'A'` and `'a'` are treated as different and a valid palindrome is rejected.\n" +
            "- Use `isalnum()`, which admits digits as well as letters; palindromes here may legitimately contain numbers.\n" +
            "- This builds a whole new list, so it costs `O(n)` extra space; if the interviewer asks for constant space, switch to the two-pointer version.\n\n" +
            "**Complexity.** One pass to build `cleaned` and one comparison against its reverse are each linear, so time is `O(n)`; the filtered copy holds up to `n` characters, so space is `O(n)`.\n\n" +
            "**Interview mindset.** Reach for this first because it is the clearest correct solution: it cleanly separates *what counts as a character* from *what makes a palindrome*. State it, note the `O(n)` extra space as its one weakness, then offer the two-pointer version that verifies the same symmetry in place with `O(1)` space.",
          rcs:
            "class Solution:  # LeetCode creates an object of this class and calls isPalindrome on it.\n" +
            "\n" +
            "    def isPalindrome(self, s: str) -> bool:  # Return True iff s reads the same forwards and backwards, ignoring case and non-alphanumeric characters.\n" +
            "\n" +
            "        # ==================== PHASE 1: BUILD THE CLEANED SEQUENCE ====================\n" +
            "\n" +
            "        cleaned = [c.lower() for c in s if c.isalnum()]  # Keep only the alphanumeric characters, each lowered to fold case.\n" +
            "                                                         # Why filter: the problem counts ONLY letters and digits, so spaces and punctuation are dropped entirely.\n" +
            "                                                         # Why lower: comparison is case-insensitive, so A and a must be treated as the same character.\n" +
            "                                                         # State: cleaned is the canonical sequence that actually decides the answer.\n" +
            "                                                         # Execution flow: Python builds the whole list, then continues to the comparison.\n" +
            "\n" +
            "        # ==================== PHASE 2: COMPARE AGAINST THE REVERSE ====================\n" +
            "\n" +
            "        return cleaned == cleaned[::-1]  # A sequence is a palindrome exactly when it equals its own reverse.\n" +
            "                                         # Why: cleaned[::-1] is a reversed copy; the == compares every mirrored position in one shot.\n" +
            "                                         # Execution flow: return ends isPalindrome; the caller receives True or False.",
          plain:
            "class Solution:\n" +
            "    def isPalindrome(self, s: str) -> bool:\n" +
            "        cleaned = [c.lower() for c in s if c.isalnum()]\n" +
            "        return cleaned == cleaned[::-1]"
        },
        {
          name: "Optimized — Two pointers in place",
          time: "O(n)", space: "O(1)",
          whenToUse: "When you want no extra allocation; the interview-preferred version.",
          logic:
            "**What it asks.** The same question — is `s` a palindrome over its alphanumeric characters, ignoring case — but now with an explicit goal of **constant extra space**, so building a cleaned copy of the string is off the table.\n\n" +
            "**Why the naive idea fails.** The filter-then-compare approach is correct but allocates a second sequence of size `O(n)`. For a string up to `2 * 10^5` characters that is real memory spent to hold information the original string already contains. The insight we are missing is that a palindrome check never needs the whole reversed copy at once: it only ever compares one mirrored *pair* at a time, so we can verify those pairs directly on `s` and store nothing beyond two indices.\n\n" +
            "**Key Idea.** Walk inward from both ends with two pointers. `left` starts at the first character and `right` at the last; together they name the mirrored pair currently under test. Before comparing, each pointer skips over any non-alphanumeric character, because those do not count. Then compare `s[left]` and `s[right]` case-insensitively: if they differ, the mirror is broken and the answer is `false`; if they match, step both pointers one place toward the center and test the next mirrored pair. When the pointers meet or cross, every meaningful pair has matched and the answer is `true`. All the filtering happens *on the fly* via the skips, so no copy is ever made.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `left = 0` and `right = len(s) - 1`.\n" +
            "2. While `left < right`: first advance `left` rightward while `s[left]` is not alphanumeric, and retreat `right` leftward while `s[right]` is not alphanumeric — each skip guarded by `left < right` so a pointer never runs past the other.\n" +
            "3. Compare `s[left].lower()` with `s[right].lower()`. If they differ, return `false` immediately — one broken pair disqualifies the whole string.\n" +
            "4. Otherwise the pair matched: do `left += 1` and `right -= 1` to move toward the center, and loop.\n" +
            "5. If the loop ends without a mismatch, every mirrored pair matched, so return `true`.\n\n" +
            "**Why it works.** A palindrome is exactly a sequence symmetric about its center: the k-th meaningful character from the left must equal the k-th from the right. The two pointers enumerate precisely those mirrored pairs in order, from the outside in, and the skip loops guarantee that whenever a comparison happens both characters are alphanumeric — so the pairs compared are the same ones the cleaned-string approach would compare, just visited without materializing the copy. Skipping is safe because a non-alphanumeric character is invisible to the definition of the palindrome; passing over it changes nothing about which real characters must mirror. Returning `false` on the first mismatch is safe because symmetry is an all-or-nothing property — a single disagreeing pair means no arrangement of the rest can rescue it. Reaching `left >= right` means the two frontiers have swept past each other having agreed on every pair, including the trivially-true empty and single-character cases.\n\n" +
            "**Common Gotchas.**\n" +
            "- Guard **each** skip loop with `left < right`; without it, a string that is all punctuation lets a pointer walk off its end and index out of range.\n" +
            "- Lowercase (or otherwise case-fold) both characters before comparing — forgetting this rejects `'Aa'`.\n" +
            "- Use `isalnum()` so digits are treated as meaningful, not just letters.\n" +
            "- Only step both pointers inward *after* a successful match; stepping before you have compared would skip a pair.\n\n" +
            "**Complexity.** Each pointer moves monotonically toward the center and never backtracks, so the total work is a single linear sweep: time `O(n)`. Only the two index variables are stored, so space is `O(1)` — the whole point of this version.\n\n" +
            "**Interview mindset.** 'Verify a sequence is symmetric about its center' is the canonical converging-two-pointers signal. Lead with filter-then-compare for clarity, then present this as the `O(1)`-space refinement, calling out the two subtleties that trip people up: guarding the skip loops and case-folding before the compare.",
          rcs:
            "class Solution:  # LeetCode creates an object of this class and calls isPalindrome on it.\n" +
            "\n" +
            "    def isPalindrome(self, s: str) -> bool:  # Return True iff s is a palindrome over its alphanumeric characters, using O(1) extra space.\n" +
            "\n" +
            "        # ==================== PHASE 1: SET UP TWO POINTERS ====================\n" +
            "\n" +
            "        left, right = 0, len(s) - 1  # left starts at the first character, right at the last.\n" +
            "                                     # Meaning: left scans inward from the front, right scans inward from the back.\n" +
            "                                     # State: the still-unchecked region is s[left..right]; everything outside is already matched.\n" +
            "                                     # Execution flow: Python enters the outer while loop.\n" +
            "\n" +
            "        # ==================== PHASE 2: CONVERGE FROM BOTH ENDS ====================\n" +
            "\n" +
            "        while left < right:  # Keep going while the two pointers still enclose at least two characters.\n" +
            "                             # Loop invariant: every mirrored pair already passed matched case-insensitively.\n" +
            "                             # Why left < right ends it: once they meet or cross, every mirrored pair has been verified.\n" +
            "\n" +
            "        # ==================== PHASE 3: SKIP NON-ALPHANUMERIC CHARACTERS ====================\n" +
            "\n" +
            "            while left < right and not s[left].isalnum():  # Advance left past anything that is not a letter or digit.\n" +
            "                                                           # Why: only alphanumerics count, so junk on the left must be stepped over before comparing.\n" +
            "                                                           # Why guard left < right: it stops left from running past right when the tail is all junk.\n" +
            "                                                           # Execution flow: loop until s[left] is alphanumeric or the pointers meet.\n" +
            "                left += 1  # Move left one character rightward, skipping the junk.\n" +
            "                           # State change: the left frontier advances by one.\n" +
            "            while left < right and not s[right].isalnum():  # Retreat right past anything that is not a letter or digit.\n" +
            "                                                            # Why: symmetric to the left skip, so both compared characters are guaranteed alphanumeric.\n" +
            "                                                            # Why guard left < right: it stops right from crossing left when the front is all junk.\n" +
            "                                                            # Execution flow: loop until s[right] is alphanumeric or the pointers meet.\n" +
            "                right -= 1  # Move right one character leftward, skipping the junk.\n" +
            "                            # State change: the right frontier retreats by one.\n" +
            "\n" +
            "        # ==================== PHASE 4: COMPARE THE MIRRORED PAIR ====================\n" +
            "\n" +
            "            if s[left].lower() != s[right].lower():  # Compare the two ends case-insensitively.\n" +
            "                                                     # Why lower on both: A and a are the same letter for this check.\n" +
            "                                                     # Execution flow: a mismatch means the mirror is broken, so we can answer immediately.\n" +
            "                return False  # Not a palindrome: one mirrored pair disagrees, so end now.\n" +
            "                              # Execution flow: return leaves isPalindrome; no code below runs.\n" +
            "                              # Why safe: a single mismatched pair is enough to disqualify the whole string.\n" +
            "            left += 1  # Characters matched: step left inward toward the center.\n" +
            "                       # State change: left advances past the character just confirmed.\n" +
            "            right -= 1  # And step right inward toward the center.\n" +
            "                        # State change: right retreats past the character just confirmed.\n" +
            "                        # Execution flow: end of iteration; Python returns to the while header.\n" +
            "\n" +
            "        # ==================== PHASE 5: EVERY PAIR MATCHED ====================\n" +
            "\n" +
            "        return True  # The pointers met without any mismatch, so s is a palindrome.\n" +
            "                     # Execution flow: return ends isPalindrome; the caller receives True.",
          plain:
            "class Solution:\n" +
            "    def isPalindrome(self, s: str) -> bool:\n" +
            "        left, right = 0, len(s) - 1\n" +
            "        while left < right:\n" +
            "            while left < right and not s[left].isalnum():\n" +
            "                left += 1\n" +
            "            while left < right and not s[right].isalnum():\n" +
            "                right -= 1\n" +
            "            if s[left].lower() != s[right].lower():\n" +
            "                return False\n" +
            "            left += 1\n" +
            "            right -= 1\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'Reads the same both ways' → two pointers from both ends.",
        "Filtering rules (ignore case/punctuation) handled by skipping, not extra passes."
      ],
      interviewRecall: [
        "left/right converge; skip non-alnum; compare lowercased.",
        "O(1) space beats filter-and-reverse.",
        "Empty-after-filter is true."
      ]
    },

    {
      id: "two-sum-ii-input-array-is-sorted",
      lc: 167,
      title: "Two Sum II - Input Array Is Sorted",
      difficulty: "Medium",
      category: "Two Pointers",
      link: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
      meta: { pattern: "Two Pointers", dataStructure: "Array", technique: "Sum-directed movement" },
      description:
        "Given a **1-indexed** array `numbers` sorted in non-decreasing order, find the two numbers that add up to `target`. Return their 1-based indices `[i, j]` with `i < j`. Exactly one solution exists, you may not use the same element twice, and you should aim for O(1) extra space.",
      constraints: [
        "`2 <= numbers.length <= 3 * 10^4`",
        "`-1000 <= numbers[i] <= 1000`, sorted ascending",
        "Exactly one solution; returned indices are 1-based."
      ],
      notes: [
        "Indices returned are 1-based, not 0-based.",
        "The sortedness is the point — it enables two pointers without a hash map."
      ],
      examples: [
        { input: "numbers = [2,7,11,15], target = 9", output: "[1,2]", reasoning: "2 + 7 = 9 at 1-based indices 1 and 2." },
        { input: "numbers = [2,3,4], target = 6", output: "[1,3]", reasoning: "2 + 4 = 6." },
        { input: "numbers = [-1,0], target = -1", output: "[1,2]", reasoning: "-1 + 0 = -1.",
          visual: "```\n[2, 7, 11, 15]  target 9\n ^          ^   sum=17>9 -> move right in\n ^      ^       sum=13>9 -> move right in\n ^  ^           sum=9    -> answer [1,2]\n```" }
      ],
      approaches: [
        {
          name: "Two pointers",
          time: "O(n)", space: "O(1)",
          whenToUse: "The intended solution; leverages the sorted order for O(1) space.",
          logic:
            "**What it asks.** You are given an array `numbers` that is **already sorted** in non-decreasing order and a `target`. Find the unique pair of values that add up to `target` and return their **1-based** indices `[i, j]` with `i < j`. Exactly one solution is guaranteed, an element may not be used twice, and the follow-up specifically wants `O(1)` extra space.\n\n" +
            "**Why the naive idea fails.** The classic hash-map Two Sum solves this in `O(n)` time by remembering each value's complement, and it would work here too — but it spends `O(n)` extra space on the map and completely ignores the fact that the array is sorted. Trying every pair with nested loops is worse still at `O(n^2)`. Both leave the array's most useful property — its order — entirely unused, and neither meets the `O(1)`-space goal.\n\n" +
            "**Key Idea.** Sortedness turns the sum into a **steerable, monotonic** quantity. Place `left` on the smallest value (index 0) and `right` on the largest (index n-1), and look at `s = numbers[left] + numbers[right]`. Moving `left` one step rightward lands on a value that is `>=` the current one, so it can only **raise** `s`; moving `right` one step leftward lands on a value that is `<=` the current one, so it can only **lower** `s`. That gives an unambiguous control rule: if `s` is too small, the only way to grow it is `left += 1`; if `s` is too big, the only way to shrink it is `right -= 1`; if `s == target`, you have found the pair. Each comparison eliminates one pointer position for good, so the window collapses inward in a single linear pass with no memory beyond two indices.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set `left = 0` and `right = n - 1`, bracketing the smallest and largest values.\n" +
            "2. While `left < right`, compute `s = numbers[left] + numbers[right]`.\n" +
            "3. If `s == target`, return `[left + 1, right + 1]` — add one to each index to convert from 0-based to the required 1-based form.\n" +
            "4. If `s < target`, the sum is too small; do `left += 1` to reach for a larger value.\n" +
            "5. If `s > target`, the sum is too large; do `right -= 1` to reach for a smaller value.\n" +
            "6. The guarantee of exactly one solution ensures the loop returns before the pointers cross.\n\n" +
            "**Why it works.** The correctness rests on showing that each discarded pointer position truly cannot belong to any solution. Suppose `s < target`. Then `numbers[left]`, paired with `numbers[right]` — the **largest** value still in the window — already falls short of `target`; paired with any other in-range value (all `<= numbers[right]`) it would fall short by at least as much. So `numbers[left]` can complete no valid pair within the window and is safely abandoned by `left += 1`. The mirror argument holds when `s > target`: `numbers[right]` paired with the smallest in-range value `numbers[left]` already overshoots, so it overshoots against every in-range value and is safely dropped by `right -= 1`. Because every abandoned position provably participates in no solution, the one guaranteed pair is never skipped, and the pointers must meet it exactly when their sum equals `target`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return **1-based** indices: `[left + 1, right + 1]`, not `[left, right]`.\n" +
            "- Move exactly **one** pointer per iteration, chosen by comparing `s` to `target`; moving both, or the wrong one, can step over the answer.\n" +
            "- The loop condition is `left < right` (strict): a value may not pair with itself.\n" +
            "- This relies on the input being sorted — if it were not, you would be back to the hash-map approach.\n\n" +
            "**Complexity.** Each iteration advances exactly one pointer toward the other, so the pointers meet after at most `n` steps: time `O(n)`. Only two indices are stored, so space is `O(1)` — meeting the follow-up's constraint that the hash map cannot.\n\n" +
            "**Interview mindset.** 'Sorted array' plus 'find a pair by value' is the textbook trigger for converging two pointers. The move you must be able to justify out loud is *why discarding a pointer is safe* — that the eliminated value cannot pair with anything left in the window — because that monotonicity argument is the whole reason the linear sweep is correct.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a two-index list.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls twoSum on it.\n" +
            "\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:  # Return the 1-based indices of the two values that sum to target.\n" +
            "\n" +
            "        # ==================== PHASE 1: SET UP TWO POINTERS ====================\n" +
            "\n" +
            "        left, right = 0, len(numbers) - 1  # left points at the smallest value, right at the largest.\n" +
            "                                           # Why the ends: the array is sorted ascending, so index 0 holds the minimum and n-1 the maximum.\n" +
            "                                           # State: the pair (left, right) brackets the whole search window and will converge inward.\n" +
            "                                           # Execution flow: Python enters the while loop.\n" +
            "\n" +
            "        # ==================== PHASE 2: SUM-DIRECTED CONVERGENCE ====================\n" +
            "\n" +
            "        while left < right:  # Keep searching while the two pointers still enclose two distinct indices.\n" +
            "                             # Loop invariant: no pair using an already-discarded position can reach target, so the answer lies in [left, right].\n" +
            "                             # Why left < right ends it: once they meet, every candidate pair has been ruled in or out.\n" +
            "\n" +
            "            s = numbers[left] + numbers[right]  # Sum of the current smallest-and-largest candidate pair.\n" +
            "                                                # Key property: because the array is sorted, moving left right RAISES this sum and moving right left LOWERS it.\n" +
            "\n" +
            "            if s == target:  # Exact hit: this pair sums to target.\n" +
            "                return [left + 1, right + 1]  # Return the indices, converted from 0-based to the required 1-based form.\n" +
            "                                              # Execution flow: return ends twoSum; nothing below runs.\n" +
            "                                              # Why safe: exactly one solution exists, so the first exact hit IS the answer.\n" +
            "\n" +
            "            if s < target:  # Sum too small: we must increase it.\n" +
            "                left += 1  # Move left onto the next-larger value, the only move that can raise the sum.\n" +
            "                           # Why safe: numbers[left] paired with the largest remaining value (numbers[right]) is still < target,\n" +
            "                           # so numbers[left] can pair with nothing in range to reach target and is safely abandoned.\n" +
            "                           # Execution flow: end of iteration; Python returns to the while header.\n" +
            "            else:  # Otherwise s > target: we must decrease it.\n" +
            "                right -= 1  # Move right onto the next-smaller value, the only move that can lower the sum.\n" +
            "                            # Why safe: numbers[right] paired with the smallest remaining value (numbers[left]) is still > target,\n" +
            "                            # so numbers[right] can pair with nothing in range to reach target and is safely abandoned.\n" +
            "                            # Execution flow: end of iteration; Python returns to the while header.\n" +
            "\n" +
            "        # ==================== PHASE 3: RETURN ====================\n" +
            "\n" +
            "        return []  # Unreachable given the one-solution guarantee; kept so every path returns a list.\n" +
            "                   # Execution flow: only reached if the loop exhausted the window, which the problem promises cannot happen.",
          plain:
            "class Solution:\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:\n" +
            "        left, right = 0, len(numbers) - 1\n" +
            "        while left < right:\n" +
            "            s = numbers[left] + numbers[right]\n" +
            "            if s == target:\n" +
            "                return [left + 1, right + 1]\n" +
            "            if s < target:\n" +
            "                left += 1\n" +
            "            else:\n" +
            "                right -= 1\n" +
            "        return []"
        },
        {
          name: "Binary search for the complement",
          time: "O(n log n)", space: "O(1)",
          whenToUse: "An alternative to name if asked; slower than two pointers.",
          logic:
            "**What it asks.** The same sorted-array Two Sum: return the 1-based indices of the unique pair summing to `target`. This approach reaches the answer a different way — by turning it into a series of lookups — which is worth knowing as an alternative even though it is not the optimal one.\n\n" +
            "**Why the naive idea fails.** Comparing every pair is `O(n^2)`, and the hash map spends `O(n)` space. But there is a second thing to notice: once you **fix** one element, its partner is no longer unknown — it must be exactly `target - numbers[i]`. Searching a sorted array for one specific value is the canonical job of binary search, so we can find that partner in `O(log n)` instead of scanning for it.\n\n" +
            "**Key Idea.** Sweep a fixed index `i` across the array. For each `i`, the value that would complete the pair is the **complement** `need = target - numbers[i]`. Because the array is sorted, binary-search for `need` — but only in the region **strictly to the right of `i`** (indices `i+1 .. n-1`). Restricting the search rightward does double duty: it prevents `numbers[i]` from pairing with itself, and, since every unordered pair has a smaller-indexed member, fixing that smaller member and looking rightward is guaranteed to encounter the true pair.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Let `n = len(numbers)` and loop `i` from `0` to `n - 1`, fixing `numbers[i]` as the first member.\n" +
            "2. Compute `need = target - numbers[i]`, the exact value the partner must hold.\n" +
            "3. Binary-search the slice `numbers[i+1 .. n-1]` for `need` — here with `bisect.bisect_left(numbers, need, i + 1, n)`, which returns the leftmost index `j` where `need` could sit.\n" +
            "4. Confirm the hit: if `j < n` (the search did not fall off the end) **and** `numbers[j] == need` (the position actually holds the value, not just an insertion point), return `[i + 1, j + 1]` in 1-based form.\n" +
            "5. Otherwise continue to the next `i`.\n\n" +
            "**Why it works.** Sortedness is exactly the precondition that makes binary search valid, so each lookup correctly reports whether `need` exists to the right of `i`. Because the loop fixes every possible smaller index and the true pair has some smaller-indexed member, that member is eventually chosen as `i`, at which point its partner lies to the right and the binary search finds it. Searching only `i+1 .. n-1` guarantees the two indices are distinct, so an element is never paired with itself. The `j < n and numbers[j] == need` guard is essential: `bisect_left` returns an insertion point, which may be `n` or may point at a value that is merely `>= need` rather than equal, and only an exact-value match is a real solution.\n\n" +
            "**Common Gotchas.**\n" +
            "- Bound the search to start at `i + 1`; searching from `0` (or including `i`) can pair an element with itself or re-find the mirror pair pointlessly.\n" +
            "- After `bisect_left`, always verify **both** `j < n` and `numbers[j] == need`; a bare `bisect` result is an insertion index, not a confirmed match.\n" +
            "- Return 1-based indices `[i + 1, j + 1]`.\n" +
            "- This is `O(n log n)` — strictly worse than the two-pointer `O(n)` here — so present it only as an alternative, not your lead answer.\n\n" +
            "**Complexity.** The outer loop runs `n` times and each binary search costs `O(log n)`, giving time `O(n log n)`; only a handful of scalars are stored, so space is `O(1)`.\n\n" +
            "**Interview mindset.** Naming this shows breadth — it demonstrates you recognize 'fixed element plus sorted array' as a binary-search setup. But say plainly that it is slower than the converging two-pointer sweep, and lead with the `O(n)` solution; reach for binary search only when a two-pointer move is not available.",
          rcs:
            "import bisect  # bisect gives a fast binary search over the sorted array.\n" +
            "from typing import List  # List lets the type hints say we take a list of ints and return a two-index list.\n" +
            "\n" +
            "\n" +
            "class Solution:  # LeetCode creates an object of this class and calls twoSum on it.\n" +
            "\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:  # Return the 1-based indices of the two values that sum to target.\n" +
            "\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n" +
            "\n" +
            "        n = len(numbers)  # Cache the length so we do not recompute len(numbers) each iteration.\n" +
            "                          # State: valid indices are 0 through n - 1.\n" +
            "                          # Execution flow: Python enters the scan loop.\n" +
            "\n" +
            "        # ==================== PHASE 2: FIX ONE INDEX, BINARY-SEARCH ITS COMPLEMENT ====================\n" +
            "\n" +
            "        for i in range(n):  # Fix numbers[i] as the first member of the pair.\n" +
            "                            # Loop invariant: no pair whose first index is < i sums to target, so the answer starts at i or later.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i.\n" +
            "\n" +
            "            need = target - numbers[i]  # The exact partner value numbers[i] requires, since need + numbers[i] == target.\n" +
            "                                        # Why: fixing one value pins its partner to ONE known number, so we can search for it directly.\n" +
            "            j = bisect.bisect_left(numbers, need, i + 1, n)  # Binary-search the sorted region strictly right of i for the value need.\n" +
            "                                                             # Why start at i + 1: searching only to the right prevents pairing numbers[i] with itself.\n" +
            "                                                             # Why sorted matters: binary search is valid only because numbers is in non-decreasing order.\n" +
            "                                                             # State: j is the leftmost index in [i+1, n) whose value is >= need.\n" +
            "\n" +
            "            if j < n and numbers[j] == need:  # Did the search land inside the array on an exact match?\n" +
            "                                              # Why both checks: j < n guards against need being larger than every value on the right,\n" +
            "                                              # and numbers[j] == need confirms bisect found the value itself, not just an insertion point.\n" +
            "                return [i + 1, j + 1]  # Return the pair, converted from 0-based to the required 1-based form.\n" +
            "                                       # Execution flow: return ends twoSum; nothing below runs.\n" +
            "                                       # Why safe: exactly one solution exists, so this match IS the answer.\n" +
            "\n" +
            "        # ==================== PHASE 3: RETURN ====================\n" +
            "\n" +
            "        return []  # Unreachable given the one-solution guarantee; kept so every path returns a list.\n" +
            "                   # Execution flow: only reached if no i had its complement, which the problem promises cannot happen.",
          plain:
            "import bisect\n" +
            "\n" +
            "class Solution:\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:\n" +
            "        n = len(numbers)\n" +
            "        for i in range(n):\n" +
            "            need = target - numbers[i]\n" +
            "            j = bisect.bisect_left(numbers, need, i + 1, n)\n" +
            "            if j < n and numbers[j] == need:\n" +
            "                return [i + 1, j + 1]\n" +
            "        return []"
        }
      ],
      patternRecognition: [
        "'Sorted array' + 'find a pair summing to X' → converging two pointers.",
        "An O(1)-space requirement rules out the hash map."
      ],
      interviewRecall: [
        "left/right; move by comparing the sum to target.",
        "Return 1-based indices.",
        "Two pointers O(n) beats per-element binary search O(n log n)."
      ]
    },

    {
      id: "trapping-rain-water",
      lc: 42,
      title: "Trapping Rain Water",
      difficulty: "Hard",
      category: "Two Pointers",
      link: "https://leetcode.com/problems/trapping-rain-water/",
      meta: { pattern: "Two Pointers", dataStructure: "Array", technique: "Bounded by shorter wall" },
      description:
        "Given `height`, a list of non-negative bar heights each of width 1, compute how many units of water are trapped after raining.",
      constraints: [
        "`1 <= height.length <= 2 * 10^4`",
        "`0 <= height[i] <= 10^5`"
      ],
      notes: [
        "Water above a bar is limited by the shorter of the tallest wall to its left and to its right.",
        "Water at index i = max(0, min(leftMax, rightMax) - height[i])."
      ],
      examples: [
        { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", reasoning: "The dips between taller bars hold 6 total units." },
        { input: "height = [4,2,0,3,2,5]", output: "9", reasoning: "The basin between the 4 and the 5 traps 9 units." },
        { input: "height = [3,0,2]", output: "2", reasoning: "min(3,2) - 0 = 2 above the middle bar.",
          visual: "```\nindex:  0 1 2\nbars :  3 . 2\n        3|~~|2   ~ = trapped (min(3,2)-0 = 2)\n```" }
      ],
      approaches: [
        {
          name: "Prefix/suffix max arrays",
          time: "O(n)", space: "O(n)",
          whenToUse: "Clear first solution; precompute the walls, then sum.",
          logic:
            "**What it asks.** Total water trapped between bars after rain.\n\n" +
            "**Why the naive idea fails.** For each index, scanning left and right for the max walls is `O(n^2)` — too slow at 2·10^4.\n\n" +
            "**Key Idea.** Water on bar `i` is `min(leftMax[i], rightMax[i]) - height[i]` (if positive), where `leftMax[i]`/`rightMax[i]` are the tallest bars at-or-before / at-or-after `i`. Precompute those two arrays in linear time.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `left_max` scanning left → right (running max).\n" +
            "2. Build `right_max` scanning right → left.\n" +
            "3. Sum `min(left_max[i], right_max[i]) - height[i]` over all `i`.\n\n" +
            "**Why it works.** The water level above a bar is capped by the shorter of the two tallest surrounding walls; subtracting the bar's own height gives the depth (never negative, since each running max includes the bar itself).\n\n" +
            "**Common Gotchas.**\n" +
            "- Include the bar itself in the running maxima.\n" +
            "- Depth is never negative because `min(left_max[i], right_max[i]) >= height[i]`.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(n)` for the two arrays.\n\n" +
            "**Interview mindset.** 'Answer at i depends on max-so-far from both sides' → prefix/suffix maxima (then optimize to two pointers).",
          rcs:
            "class Solution:\n" +
            "    def trap(self, height: List[int]) -> int:\n" +
            "        n = len(height)\n" +
            "        if n == 0:\n" +
            "            return 0\n" +
            "        left_max = [0] * n                       # tallest wall at or left of i\n" +
            "        right_max = [0] * n                      # tallest wall at or right of i\n" +
            "        left_max[0] = height[0]\n" +
            "        for i in range(1, n):\n" +
            "            left_max[i] = max(left_max[i - 1], height[i])\n" +
            "        right_max[n - 1] = height[n - 1]\n" +
            "        for i in range(n - 2, -1, -1):\n" +
            "            right_max[i] = max(right_max[i + 1], height[i])\n" +
            "        total = 0\n" +
            "        for i in range(n):\n" +
            "            total += min(left_max[i], right_max[i]) - height[i]  # water above bar i\n" +
            "        return total",
          plain:
            "class Solution:\n" +
            "    def trap(self, height: List[int]) -> int:\n" +
            "        n = len(height)\n" +
            "        if n == 0:\n" +
            "            return 0\n" +
            "        left_max = [0] * n\n" +
            "        right_max = [0] * n\n" +
            "        left_max[0] = height[0]\n" +
            "        for i in range(1, n):\n" +
            "            left_max[i] = max(left_max[i - 1], height[i])\n" +
            "        right_max[n - 1] = height[n - 1]\n" +
            "        for i in range(n - 2, -1, -1):\n" +
            "            right_max[i] = max(right_max[i + 1], height[i])\n" +
            "        total = 0\n" +
            "        for i in range(n):\n" +
            "            total += min(left_max[i], right_max[i]) - height[i]\n" +
            "        return total"
        },
        {
          name: "Optimized — Two pointers",
          time: "O(n)", space: "O(1)",
          whenToUse: "The interview-preferred solution; constant space.",
          logic:
            "**Key Idea.** Keep two pointers and running `left_max`/`right_max`. The trick: whichever side has the **smaller running max** is the bounded one — water there depends only on that smaller max, so you can settle it without knowing the far side exactly.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `left = 0`, `right = n - 1`, `left_max = right_max = 0`, `total = 0`.\n" +
            "2. While `left < right`: if `height[left] < height[right]`, the left side is bounded — update `left_max`, add `left_max - height[left]`, `left += 1`.\n" +
            "3. Else the right side is bounded — update `right_max`, add `right_max - height[right]`, `right -= 1`.\n\n" +
            "**Why it works.** If `height[left] < height[right]`, then `right_max >= height[right] > height[left]`, so the left cell's water is limited strictly by `left_max` (the smaller side) — its depth is known without the far wall's exact value. Moving the smaller side inward preserves this invariant.\n\n" +
            "**Common Gotchas.**\n" +
            "- Update the running max BEFORE adding water for that cell.\n" +
            "- Move the pointer on the smaller-height side.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(1)`.\n\n" +
            "**Interview mindset.** Recognizing 'the shorter wall dictates the water' collapses the two prefix arrays into two pointers — a classic optimization to have ready.",
          rcs:
            "class Solution:\n" +
            "    def trap(self, height: List[int]) -> int:\n" +
            "        left, right = 0, len(height) - 1\n" +
            "        left_max, right_max = 0, 0\n" +
            "        total = 0\n" +
            "        while left < right:\n" +
            "            if height[left] < height[right]:      # left side is the bounded one\n" +
            "                left_max = max(left_max, height[left])\n" +
            "                total += left_max - height[left]  # water capped by left_max\n" +
            "                left += 1\n" +
            "            else:                                 # right side is bounded\n" +
            "                right_max = max(right_max, height[right])\n" +
            "                total += right_max - height[right]\n" +
            "                right -= 1\n" +
            "        return total",
          plain:
            "class Solution:\n" +
            "    def trap(self, height: List[int]) -> int:\n" +
            "        left, right = 0, len(height) - 1\n" +
            "        left_max, right_max = 0, 0\n" +
            "        total = 0\n" +
            "        while left < right:\n" +
            "            if height[left] < height[right]:\n" +
            "                left_max = max(left_max, height[left])\n" +
            "                total += left_max - height[left]\n" +
            "                left += 1\n" +
            "            else:\n" +
            "                right_max = max(right_max, height[right])\n" +
            "                total += right_max - height[right]\n" +
            "                right -= 1\n" +
            "        return total"
        }
      ],
      patternRecognition: [
        "'Water/area bounded by walls on both sides' → min of left/right maxima.",
        "O(1) space → two pointers moving the smaller side."
      ],
      interviewRecall: [
        "water[i] = min(leftMax, rightMax) - height[i].",
        "Two pointers: move the smaller-height side, update its running max first.",
        "Prefix/suffix arrays are the O(n)-space stepping stone."
      ]
    }
  ]);
})();
