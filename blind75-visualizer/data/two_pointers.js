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
            "**A. What is being asked?** Find every distinct group of three values that sum to zero.\n\n" +
            "**B. Brute force idea.** Try all triples of indices `(i, j, k)` with `i < j < k` and check whether the three values sum to 0.\n\n" +
            "**C. Why it is slow.** There are about `n^3 / 6` triples, so for `n = 3000` that is billions of checks — far too slow. It also does nothing to prevent duplicate triplets, so we must deduplicate the results ourselves.\n\n" +
            "**G/H. Handling duplicates.** Because the same values can appear at different indices, two different index-triples may produce the *same* triplet of values. We normalize each hit by sorting its three values into a tuple and storing those tuples in a **set**, which collapses duplicates automatically.\n\n" +
            "**I. Step by step.** Three nested loops enumerate every index triple; when the sum is 0, add the sorted tuple to a set; at the end convert the set back to a list of lists.\n\n" +
            "**J. Why correct.** Every index-triple is examined, so no valid triplet is missed; the set guarantees uniqueness.\n\n" +
            "**K/L. Complexity.** Time `O(n^3)`, space `O(n)` for the set of results.",
          rcs:
            "class Solution:\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:\n" +
            "        n = len(nums)\n" +
            "        found = set()                          # Stores unique triplets as sorted tuples.\n" +
            "        for i in range(n):                     # First index.\n" +
            "            for j in range(i + 1, n):          # Second index, always after i.\n" +
            "                for k in range(j + 1, n):      # Third index, always after j.\n" +
            "                    if nums[i] + nums[j] + nums[k] == 0:   # Three values sum to zero?\n" +
            "                        triplet = tuple(sorted((nums[i], nums[j], nums[k])))  # Normalize order.\n" +
            "                        found.add(triplet)     # Set discards duplicate triplets.\n" +
            "        return [list(t) for t in found]        # Convert tuples back to lists.",
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
            "**D. Key observation.** 3Sum is really \"for each fixed first value, solve **2Sum-to-a-target** on the rest.\" If we **sort** the array first, that inner 2Sum can be solved with two pointers in linear time instead of a hash map — and sorting also makes deduplication trivial.\n\n" +
            "**E. Why sorted order enables two pointers.** After sorting, values increase left to right. Put a `left` pointer just after the fixed element and a `right` pointer at the end, and look at `total = nums[i] + nums[left] + nums[right]`:\n" +
            "- If `total < 0`, the sum is **too small**. The only way to increase it is to bring in a larger value, so move `left` **rightward** (to a bigger number).\n" +
            "- If `total > 0`, the sum is **too big**. Move `right` **leftward** (to a smaller number) to decrease it.\n" +
            "- If `total == 0`, we found a triplet.\n\n" +
            "This works *because* the array is sorted: each pointer move changes the sum in a known direction, so we never have to backtrack. Every step eliminates possibilities we can prove cannot contain a new answer, so the two pointers sweep toward each other in `O(n)` per fixed element.\n\n" +
            "**F. Pattern.** Fix one element (outer loop), converge two pointers on the remaining sorted range. This drops one factor of `n` versus brute force.\n\n" +
            "**G/H. What the pointers hold.** `i` is the fixed first element; `left` and `right` bound the still-unexamined window `nums[left..right]` whose two-sum target is `-nums[i]`.\n\n" +
            "**I. Step by step.**\n" +
            "1. Sort `nums`.\n" +
            "2. For each `i`: if `nums[i] > 0` we can stop entirely (three ascending values starting positive can never sum to 0). If `nums[i]` equals the previous fixed value, **skip** it to avoid repeating triplets.\n" +
            "3. Set `left = i+1`, `right = n-1`; move them inward per the sign of `total`.\n" +
            "4. On a hit, record the triplet, then advance **both** pointers past any duplicate values so the same triplet is not emitted twice.\n\n" +
            "**Deduplication — the subtle part.** There are two independent dedup steps, and both matter:\n" +
            "- *Skip duplicate `i`*: `if i > 0 and nums[i] == nums[i-1]: continue`. If we already used a given first value, running the whole inner scan again from an equal first value can only reproduce triplets we already found.\n" +
            "- *Skip duplicate `left`/`right` after a hit*: once a zero-sum triplet is recorded, walk `left` forward while `nums[left] == nums[left-1]` and `right` backward while `nums[right] == nums[right+1]`. Otherwise an adjacent equal value would yield an identical triplet. We only do this *after* recording a hit so we never skip a genuinely new pair.\n\n" +
            "**J. Why correct.** Sorting groups equal values together, so the skip rules provably reach every distinct triplet exactly once; the two-pointer sweep is a complete search of the 2Sum subproblem because each move only discards pairs that cannot beat the current comparison.\n\n" +
            "**K/L. Complexity.** Sorting is `O(n log n)`; the outer loop with an inner linear sweep is `O(n^2)`, which dominates. Extra space is `O(1)` beyond the output (or `O(n)` depending on the sort implementation).\n\n" +
            "**M. Interview mindset.** \"Find k numbers that sum to a target\" almost always means: sort, fix `k-2` of them with loops, and finish with two pointers. 3Sum is the canonical instance of that template.",
          rcs:
            "class Solution:\n" +
            "    def threeSum(self, nums: List[int]) -> List[List[int]]:\n" +
            "        nums.sort()                              # Sorting enables two pointers + easy dedup.\n" +
            "        n = len(nums)\n" +
            "        result = []\n" +
            "        for i in range(n):                       # Fix the first element of the triplet.\n" +
            "            if nums[i] > 0:                      # Smallest value already positive => no zero sum possible.\n" +
            "                break\n" +
            "            if i > 0 and nums[i] == nums[i - 1]: # Same first value as before -> skip duplicate triplets.\n" +
            "                continue\n" +
            "            left, right = i + 1, n - 1           # Two pointers over the remaining sorted window.\n" +
            "            while left < right:\n" +
            "                total = nums[i] + nums[left] + nums[right]\n" +
            "                if total < 0:                    # Sum too small -> need a bigger value.\n" +
            "                    left += 1\n" +
            "                elif total > 0:                  # Sum too big -> need a smaller value.\n" +
            "                    right -= 1\n" +
            "                else:                            # Exactly zero: record the triplet.\n" +
            "                    result.append([nums[i], nums[left], nums[right]])\n" +
            "                    left += 1\n" +
            "                    right -= 1\n" +
            "                    while left < right and nums[left] == nums[left - 1]:   # Skip duplicate lefts.\n" +
            "                        left += 1\n" +
            "                    while left < right and nums[right] == nums[right + 1]: # Skip duplicate rights.\n" +
            "                        right -= 1\n" +
            "        return result",
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
            "**A. What is being asked?** Choose two lines maximizing `width * min(height)`.\n\n" +
            "**B. Brute force idea.** Try every pair of lines `(i, j)`, compute the area `(j - i) * min(height[i], height[j])`, and keep the maximum.\n\n" +
            "**C. Why it is slow.** There are about `n^2 / 2` pairs, so for `n = 10^5` that is ~5 billion evaluations — far too slow.\n\n" +
            "**I. Step by step.** Outer loop fixes the left line; inner loop tries every line to its right; track the best area.\n\n" +
            "**J. Why correct.** Every pair is considered, so the optimum cannot be missed.\n\n" +
            "**K/L. Complexity.** Time `O(n^2)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def maxArea(self, height: List[int]) -> int:\n" +
            "        n = len(height)\n" +
            "        best = 0                                 # Largest area seen so far.\n" +
            "        for i in range(n):                       # Left line.\n" +
            "            for j in range(i + 1, n):            # Right line, always to the right of i.\n" +
            "                area = (j - i) * min(height[i], height[j])  # Width * limiting height.\n" +
            "                best = max(best, area)           # Keep the best.\n" +
            "        return best",
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
            "**D. Key observation.** Start with the **widest possible** container: one pointer at each end. This pair has the maximum width. From here, any other pair is narrower, so it can only beat the current area by being **taller** — i.e. by having a larger *limiting* (shorter) wall.\n\n" +
            "**E. Why move the SHORTER wall (the greedy exchange argument).** The area is `width * min(left_height, right_height)`. Suppose `height[left] < height[right]`. The limiting wall is `left`. Consider what happens if we instead moved the *taller* wall (`right`) inward: the width shrinks by 1, and the new height is `min(height[left], height[new_right])`, which is **still at most `height[left]`** — because `left` is already the shorter one. So every container that keeps the short wall `left` and uses any `right' < right` has width smaller *and* height no larger than the current one — it can never be bigger. Therefore we can safely **discard the shorter wall** and never revisit it: move `left` inward. (Symmetrically, if `right` is shorter, move `right`.) The short wall is the bottleneck; the only hope of improvement is to replace it with something taller.\n\n" +
            "**F. Why sorted order isn't needed here.** Unlike 3Sum, we do not sort — the two pointers instead exploit that width is maximal at the ends and shrinks monotonically as we move inward, so we trade width for a chance at more height, one step at a time.\n\n" +
            "**G/H. What the pointers hold.** `left` and `right` are the two candidate walls. `best` tracks the largest area found. Every step computes the current area, records it, then eliminates the provably-dominated shorter wall.\n\n" +
            "**I. Step by step.**\n" +
            "1. `left = 0`, `right = n-1` (widest container).\n" +
            "2. Compute `area = (right - left) * min(height[left], height[right])`; update `best`.\n" +
            "3. Move whichever pointer points at the shorter wall inward (if equal, moving either is fine).\n" +
            "4. Repeat until the pointers meet.\n\n" +
            "**J. Why correct.** Each move discards only containers that are provably no larger than one we have already measured (the exchange argument above), so the optimum is never skipped. Since one pointer moves each step, we examine `O(n)` containers yet still cover the optimum.\n\n" +
            "**K/L. Complexity.** A single inward sweep -> time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** When you want to maximize something governed by two endpoints and a min/width trade-off, start at the extremes and greedily discard the limiting side. Be ready to justify WHY discarding the shorter wall loses nothing — that exchange argument is the whole interview.",
          rcs:
            "class Solution:\n" +
            "    def maxArea(self, height: List[int]) -> int:\n" +
            "        left, right = 0, len(height) - 1         # Start with the widest container.\n" +
            "        best = 0\n" +
            "        while left < right:\n" +
            "            area = (right - left) * min(height[left], height[right])  # Width * shorter wall.\n" +
            "            best = max(best, area)               # Track the maximum area.\n" +
            "            if height[left] < height[right]:     # Left wall is the bottleneck...\n" +
            "                left += 1                        # ...discard it; only a taller wall can help.\n" +
            "            else:                                # Right wall is the bottleneck (or equal).\n" +
            "                right -= 1                       # Discard the shorter/equal right wall.\n" +
            "        return best",
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
    }
  ]);
})();
