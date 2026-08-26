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
            "**What it asks.** Return every distinct group of three values from `nums` that sum to zero, with no duplicate triplets in the output.\n\n" +
            "**The idea.** The most direct approach is to try all triples of indices `(i, j, k)` with `i < j < k` and check whether the three values sum to 0. This examines every possible triplet, so it cannot miss an answer.\n\n" +
            "**Why it's slow.** There are about `n^3 / 6` triples, so for `n = 3000` that is billions of checks — far too slow for the given limits. It also does nothing on its own to prevent duplicate triplets, so we must deduplicate the results ourselves.\n\n" +
            "**Key Idea.** Because the same value can appear at different indices, two different index-triples may produce the *same* triplet of values. Normalize each zero-sum hit by sorting its three values into a tuple and store those tuples in a **set**, which collapses duplicates automatically regardless of the order the indices were found in.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Use three nested loops with `i < j < k` to enumerate every index triple.\n" +
            "2. When `nums[i] + nums[j] + nums[k] == 0`, sort the three values and add the resulting tuple to a set.\n" +
            "3. After all triples are examined, convert the set of tuples back into a list of lists and return it.\n\n" +
            "**Why it works.** Every index-triple is examined, so no valid triplet is missed. Sorting each hit into a canonical tuple plus storing it in a set guarantees each distinct value-triplet is reported exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to canonicalize before inserting: `(-1, 0, 1)` and `(0, 1, -1)` are the same triplet and must collapse — always sort before adding to the set.\n" +
            "- All-equal inputs like `[0, 0, 0]` must still produce one triplet; distinct indices with equal values are valid.\n" +
            "- The set holds tuples, not lists (lists are unhashable in Python).\n\n" +
            "**Complexity.** Time `O(n^3)` for the three nested loops; space `O(n)` for the set of unique triplets.\n\n" +
            "**Interview mindset.** State this only as the baseline before optimizing — it shows you understand the problem and the duplication trap, then you pivot to sort + two pointers to cut a factor of `n`.",
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
            "**What it asks.** Return all unique zero-sum triplets, efficiently enough for `n` up to 3000.\n\n" +
            "**Why the naive idea fails.** Checking all `O(n^3)` triples is far too slow at these limits, and it forces a separate deduplication pass over the results.\n\n" +
            "**Key Idea.** 3Sum is really \"for each fixed first value, solve **2Sum-to-a-target** on the rest,\" where the target is `-nums[i]`. If we **sort** the array first, that inner 2Sum can be solved with two converging pointers in linear time instead of a hash map — and sorting also groups equal values together, which makes deduplication trivial. After sorting, values increase left to right, so a `left` pointer just after the fixed element and a `right` pointer at the end can be steered by the sign of `total = nums[i] + nums[left] + nums[right]`: if `total < 0` the sum is too small, so move `left` rightward to a bigger value; if `total > 0` it is too big, so move `right` leftward to a smaller value; if `total == 0` we have a triplet. Each move changes the sum in a known direction, so we never backtrack and the pair sweeps inward in `O(n)` per fixed element.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `nums`. `i` will be the fixed first element; `left` and `right` bound the still-unexamined window `nums[left..right]` whose two-sum target is `-nums[i]`.\n" +
            "2. For each `i`: if `nums[i] > 0`, stop entirely — three ascending values starting positive can never sum to 0. If `nums[i]` equals the previous fixed value (`i > 0 and nums[i] == nums[i-1]`), **skip** it to avoid repeating triplets.\n" +
            "3. Set `left = i+1`, `right = n-1`, and move them inward according to the sign of `total`.\n" +
            "4. On a hit, record `[nums[i], nums[left], nums[right]]`, advance **both** pointers, then walk `left` forward while `nums[left] == nums[left-1]` and `right` backward while `nums[right] == nums[right+1]` so an adjacent equal value cannot re-emit the same triplet.\n\n" +
            "**Why it works.** Sorting groups equal values, so the two skip rules provably reach every distinct triplet exactly once: skipping an equal `nums[i]` avoids re-running an inner scan that could only reproduce known triplets, and the post-hit skips (done *only after* recording, so no genuinely new pair is lost) prevent adjacent duplicates. The two-pointer sweep is a complete search of the 2Sum subproblem because each move only discards pairs that cannot beat the current comparison.\n\n" +
            "**Common Gotchas.**\n" +
            "- Two independent dedup steps are needed — the skip on `nums[i]` and the post-hit skips on `left`/`right`; missing either produces duplicate triplets.\n" +
            "- Skip duplicates *after* recording a hit, never before, or you will drop valid pairs.\n" +
            "- Guard the inner skip loops with `left < right` so the pointers do not cross while skipping.\n" +
            "- The `nums[i] > 0` early break is a real speedup but must not be an early `continue` — once the fixed value is positive, all later ones are too.\n\n" +
            "**Complexity.** Sorting is `O(n log n)`; the outer loop with an inner linear sweep is `O(n^2)`, which dominates. Extra space is `O(1)` beyond the output (or `O(n)` depending on the sort implementation).\n\n" +
            "**Interview mindset.** \"Find k numbers that sum to a target\" almost always means: sort, fix `k-2` of them with loops, and finish with two pointers. 3Sum is the canonical instance of that template.",
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
            "**What it asks.** Choose two of the vertical lines that, with the x-axis, hold the most water — maximize `width * min(height)` over every pair.\n\n" +
            "**The idea.** The most direct approach is to try every pair of lines `(i, j)`, compute the area `(j - i) * min(height[i], height[j])`, and keep the maximum seen.\n\n" +
            "**Why it's slow.** There are about `n^2 / 2` pairs, so for `n = 10^5` that is roughly 5 billion evaluations — far too slow for the given limits.\n\n" +
            "**Key Idea.** There is no clever insight here; the value of the brute force is simply that it exhaustively considers every candidate pair, which makes it an unmissable baseline and a correctness reference for the optimized version.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a running `best`, the largest area found so far, initialized to 0.\n" +
            "2. Outer loop fixes the left line `i`.\n" +
            "3. Inner loop tries every line `j` to the right of `i`.\n" +
            "4. Compute `(j - i) * min(height[i], height[j])` and update `best` with the larger of the two.\n\n" +
            "**Why it works.** Every pair of lines is considered exactly once, so the optimal container is necessarily evaluated and captured in `best`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The height is the `min` of the two walls, not the max — water spills over the shorter wall.\n" +
            "- Start the inner loop at `i + 1` to avoid pairing a line with itself and to avoid re-checking pairs.\n" +
            "- With `n` up to 10^5 this will time out; state it only as a stepping stone.\n\n" +
            "**Complexity.** Time `O(n^2)` for the nested loops; space `O(1)`.\n\n" +
            "**Interview mindset.** Name the brute force to lock down the definition of area (min of the two walls times width), then immediately look for a way to discard candidates without checking them — which points to two pointers.",
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
            "**What it asks.** Find the maximum water area over all pairs of walls, `width * min(height)`, in linear time.\n\n" +
            "**Why the naive idea fails.** Evaluating all `O(n^2)` pairs is too slow at `n` up to 10^5, and most of those pairs can be ruled out without ever computing them.\n\n" +
            "**Key Idea.** Start with the **widest possible** container: one pointer at each end. This pair has the maximum width, so any other pair is strictly narrower and can only beat it by being **taller** — by having a larger *limiting* (shorter) wall. This lets us throw away one wall per step. Suppose `height[left] < height[right]`, so `left` is the bottleneck. If we instead kept `left` and moved the taller wall `right` inward, the width would shrink and the height would still be at most `height[left]` (since `left` is already the shorter one) — so every container pairing the short wall `left` with any nearer right wall is no larger than the one we just measured. Those containers can never win, so we safely **discard the shorter wall** and never revisit it. The short wall is the bottleneck; the only hope of improvement is to replace it with something taller. (Note we do not sort as in 3Sum — the pointers instead exploit that width is maximal at the ends and shrinks monotonically inward, trading width for a shot at more height.)\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set `left = 0` and `right = n-1` (the widest container), and `best = 0` to track the largest area found.\n" +
            "2. Compute `area = (right - left) * min(height[left], height[right])` and update `best`.\n" +
            "3. Move whichever pointer sits at the shorter wall inward; if the two walls are equal, moving either is fine.\n" +
            "4. Repeat until the pointers meet.\n\n" +
            "**Why it works.** Each move discards only containers that are provably no larger than one already measured (the exchange argument above), so the optimum is never skipped. One pointer advances every step, so the pointers meet after `O(n)` steps while still covering the optimal pair.\n\n" +
            "**Common Gotchas.**\n" +
            "- Move the pointer at the **shorter** wall; moving the taller one can never raise the limiting height and may skip the optimum.\n" +
            "- When the walls are equal, moving either is safe — but you must move one, not both prematurely.\n" +
            "- Record the area **before** moving a pointer, so no candidate is missed.\n" +
            "- Use strict `left < right` as the loop condition; a wall paired with itself has zero width.\n\n" +
            "**Complexity.** A single inward sweep gives time `O(n)`, space `O(1)`.\n\n" +
            "**Interview mindset.** When you want to maximize something governed by two endpoints and a min/width trade-off, start at the extremes and greedily discard the limiting side. Be ready to justify WHY discarding the shorter wall loses nothing — that exchange argument is the whole interview.",
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
            "**What it asks.** Ignoring case and non-alphanumeric characters, is `s` a palindrome?\n\n" +
            "**Key Idea.** Build the cleaned sequence (lowercase alphanumerics only), then check it equals its reverse.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep only `c.lower()` for each alphanumeric `c`.\n" +
            "2. Compare the cleaned list to its reverse.\n\n" +
            "**Why it works.** Filtering canonicalizes the string to exactly the characters that matter; a sequence is a palindrome iff it equals its reverse.\n\n" +
            "**Common Gotchas.**\n" +
            "- Remember to lowercase.\n" +
            "- Uses O(n) extra space for the filtered copy.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(n)`.\n\n" +
            "**Interview mindset.** State this, then offer the two-pointer O(1)-space version.",
          rcs:
            "class Solution:\n" +
            "    def isPalindrome(self, s: str) -> bool:\n" +
            "        cleaned = [c.lower() for c in s if c.isalnum()]  # keep letters/digits, lowered\n" +
            "        return cleaned == cleaned[::-1]                   # palindrome iff equal to reverse",
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
            "**Key Idea.** Use two pointers, `left` from the start and `right` from the end. Skip any non-alphanumeric character, then compare the two ends case-insensitively and move inward. A mismatch means it is not a palindrome.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `left = 0`, `right = len(s) - 1`.\n" +
            "2. While `left < right`: advance `left` past non-alnum; retreat `right` past non-alnum.\n" +
            "3. If `s[left].lower() != s[right].lower()`, return `false`.\n" +
            "4. Otherwise step both inward. If the pointers cross, return `true`.\n\n" +
            "**Why it works.** A palindrome mirrors around its center; comparing symmetric alphanumeric characters from both ends verifies every mirrored pair, and skipping junk enforces the 'alphanumeric only' rule without copying.\n\n" +
            "**Common Gotchas.**\n" +
            "- Guard the skip loops with `left < right` so you don't run off the ends.\n" +
            "- Lowercase both sides before comparing.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(1)`.\n\n" +
            "**Interview mindset.** 'Compare a sequence against itself from both ends' is the canonical two-pointer signal.",
          rcs:
            "class Solution:\n" +
            "    def isPalindrome(self, s: str) -> bool:\n" +
            "        left, right = 0, len(s) - 1                          # converging pointers\n" +
            "        while left < right:\n" +
            "            while left < right and not s[left].isalnum():    # skip junk on the left\n" +
            "                left += 1\n" +
            "            while left < right and not s[right].isalnum():   # skip junk on the right\n" +
            "                right -= 1\n" +
            "            if s[left].lower() != s[right].lower():          # mirrored chars must match\n" +
            "                return False\n" +
            "            left += 1\n" +
            "            right -= 1\n" +
            "        return True",
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
            "**What it asks.** In a SORTED array, find the two values summing to `target`; return their 1-based indices.\n\n" +
            "**Why the naive idea fails.** The hash-map Two Sum works (O(n) time) but uses O(n) space and ignores the gift of sortedness; the follow-up asks for O(1) space.\n\n" +
            "**Key Idea.** Put one pointer at the smallest value (`left`) and one at the largest (`right`). Their sum is **monotonic** under pointer moves: increasing `left` can only raise the sum, decreasing `right` can only lower it — so the sum tells you which pointer to move.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `left = 0`, `right = n - 1`.\n" +
            "2. Compute `s = numbers[left] + numbers[right]`.\n" +
            "3. If `s == target`, return `[left + 1, right + 1]` (1-based).\n" +
            "4. If `s < target`, we need a bigger sum → `left += 1`.\n" +
            "5. If `s > target`, we need a smaller sum → `right -= 1`.\n\n" +
            "**Why it works.** Because the array is sorted, the discarded pointer position cannot participate in any solution: if `s < target`, `numbers[left]` paired with anything ≤ `numbers[right]` is still too small, so `left` is safely abandoned (symmetric for `right`). No pair is missed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Return 1-based indices.\n" +
            "- Move exactly one pointer per step based on the comparison.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(1)`.\n\n" +
            "**Interview mindset.** 'Sorted array + find a pair by value' → converging two pointers, no hash map needed.",
          rcs:
            "class Solution:\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:\n" +
            "        left, right = 0, len(numbers) - 1        # smallest and largest values\n" +
            "        while left < right:\n" +
            "            s = numbers[left] + numbers[right]   # current pair sum\n" +
            "            if s == target:\n" +
            "                return [left + 1, right + 1]     # 1-based indices\n" +
            "            if s < target:\n" +
            "                left += 1                        # need a larger sum\n" +
            "            else:\n" +
            "                right -= 1                       # need a smaller sum\n" +
            "        return []                                # guaranteed unreachable",
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
            "**Key Idea.** For each index `i`, the partner value is `target - numbers[i]`. Since the array is sorted, **binary search** the portion to the right of `i` for that complement.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each `i`, set `need = target - numbers[i]`.\n" +
            "2. Binary search `numbers[i+1 .. n-1]` for `need`.\n" +
            "3. If found at `j`, return `[i + 1, j + 1]`.\n\n" +
            "**Why it works.** Sortedness makes binary search valid; scanning every `i` guarantees the unique pair is found.\n\n" +
            "**Common Gotchas.**\n" +
            "- Search only to the right of `i` to avoid reusing an element.\n" +
            "- It's `O(n log n)` — strictly worse than two pointers here; mention it only as an alternative.\n\n" +
            "**Complexity.** Time `O(n log n)`; space `O(1)`.\n\n" +
            "**Interview mindset.** Naming it shows breadth, but lead with the O(n) two-pointer solution.",
          rcs:
            "import bisect\n" +
            "\n" +
            "class Solution:\n" +
            "    def twoSum(self, numbers: List[int], target: int) -> List[int]:\n" +
            "        n = len(numbers)\n" +
            "        for i in range(n):\n" +
            "            need = target - numbers[i]                     # value to find on the right\n" +
            "            j = bisect.bisect_left(numbers, need, i + 1, n) # binary search the right part\n" +
            "            if j < n and numbers[j] == need:\n" +
            "                return [i + 1, j + 1]                      # 1-based indices\n" +
            "        return []",
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
