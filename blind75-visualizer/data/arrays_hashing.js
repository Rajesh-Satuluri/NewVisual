/*
 * Blind 75 — Arrays & Hashing
 * =========================================================================
 * This file is the FORMAT REFERENCE for every other category file.
 *
 * Each category file registers its problems on the global registry:
 *     window.BLIND75.register("Category Name", [ ...problems ]);
 *
 * PROBLEM SCHEMA (all fields required unless marked optional):
 * {
 *   id:            "kebab-case-unique-id",
 *   lc:            1,                       // LeetCode number
 *   title:         "Two Sum",
 *   difficulty:    "Easy" | "Medium" | "Hard",
 *   category:      "Arrays & Hashing",      // must match register() key
 *   link:          "https://leetcode.com/problems/two-sum/",
 *   meta: { pattern, dataStructure, technique },   // short strings for the badge row + search
 *   description:   "markdown string — faithful PARAPHRASE, never verbatim LeetCode text",
 *   constraints:   ["markdown line", ...],
 *   notes:         ["markdown line", ...],  // optional; important caveats from the statement
 *   examples: [                             // 3–5 items
 *     { input, output, reasoning, visual? } // visual optional: fenced ascii block (markdown)
 *   ],
 *   approaches: [                           // 1 or 2; add a 2nd ONLY when a naive->optimal
 *                                           // contrast is genuinely instructive
 *     {
 *       name:      "Brute Force" | "Optimized — Hash Map" | ...,
 *       time:      "O(n)",  space: "O(n)",
 *       whenToUse: "one-line note on when this approach is the right call",
 *       logic:     "markdown — the A–M reasoning (see below)",
 *       rcs:       "python source WITH parallel explanatory comments",
 *       plain:     "python source, SAME algorithm, NO explanatory comments"
 *     }
 *   ],
 *   patternRecognition: ["how to spot this problem type", ...],
 *   interviewRecall:    ["what to remember under pressure", ...]
 * }
 *
 * LOGIC markdown should walk: what's being asked, brute force, why it's slow,
 * the key observation, the pattern/DS, why it works, what each variable holds,
 * the step-by-step, why it's correct, and time/space. For DP add dp[i] meaning,
 * transition, base cases; for graphs nodes/edges/visited; etc.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Arrays & Hashing", [
    {
      id: "two-sum",
      lc: 1,
      title: "Two Sum",
      difficulty: "Easy",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/two-sum/",
      meta: { pattern: "Hash Map Lookup", dataStructure: "Hash Map", technique: "Complement search" },
      description:
        "You are given an array of integers `nums` and an integer `target`. Return the **indices** of the two numbers that add up to `target`.\n\n" +
        "You may assume that each input has **exactly one** solution, and you may not use the same element twice. The answer can be returned in any order.",
      constraints: [
        "`2 <= nums.length <= 10^4`",
        "`-10^9 <= nums[i] <= 10^9`",
        "`-10^9 <= target <= 10^9`",
        "Exactly one valid pair exists."
      ],
      notes: [
        "Return the two **indices**, not the values.",
        "The array is **not** sorted, so you cannot rely on ordering."
      ],
      examples: [
        {
          input: "nums = [2, 7, 11, 15], target = 9",
          output: "[0, 1]",
          reasoning: "nums[0] + nums[1] = 2 + 7 = 9, so the indices are 0 and 1."
        },
        {
          input: "nums = [3, 2, 4], target = 6",
          output: "[1, 2]",
          reasoning: "3 does not pair with anything to make 6, but 2 + 4 = 6 at indices 1 and 2. Note 3+3 is not allowed (same element twice)."
        },
        {
          input: "nums = [3, 3], target = 6",
          output: "[0, 1]",
          reasoning: "Duplicate values are fine as long as they are two different indices."
        },
        {
          input: "nums = [-1, -2, -3, -4, -5], target = -8",
          output: "[2, 4]",
          reasoning: "Negatives work identically: -3 + -5 = -8.",
          visual:
            "```\nindex :  0   1   2   3   4\nvalue : -1  -2  -3  -4  -5\n                 \u2191       \u2191\n              need -5   found\n```"
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "Fine for tiny inputs or as the first thing you say in an interview before optimizing.",
          logic:
            "**A. What is being asked?** Find two positions whose values sum to `target`.\n\n" +
            "**B. Brute force idea.** Try every pair `(i, j)`. For each `i`, scan every later `j` and check whether `nums[i] + nums[j] == target`.\n\n" +
            "**C. Why it is slow.** There are about `n^2 / 2` pairs, so for `n = 10^4` that is ~50 million checks. It works but wastes effort re-scanning the array for every element.\n\n" +
            "**I. Step by step.** Outer loop fixes the first index; inner loop looks for a partner among the elements after it. The moment a pair sums to target, return both indices.\n\n" +
            "**J. Why correct.** Every unordered pair is examined exactly once, so the unique answer cannot be missed.\n\n" +
            "**K/L. Complexity.** Time `O(n^2)`, space `O(1)`.",
          rcs:
            "class Solution:\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n" +
            "        n = len(nums)                       # Number of elements to pair up.\n" +
            "        for i in range(n):                  # Fix the first element of the pair.\n" +
            "            for j in range(i + 1, n):       # Only look ahead so each pair is tried once.\n" +
            "                if nums[i] + nums[j] == target:  # Found the two values that add to target.\n" +
            "                    return [i, j]           # Return their indices immediately.\n" +
            "        return []                           # Unreachable given the problem guarantee.",
          plain:
            "class Solution:\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n" +
            "        n = len(nums)\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                if nums[i] + nums[j] == target:\n" +
            "                    return [i, j]\n" +
            "        return []"
        },
        {
          name: "Optimized — Hash Map (one pass)",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The expected answer. Use whenever you need to find pairs by value in an unsorted array.",
          logic:
            "**D. Key observation.** For each number `x`, its partner is fixed: it must be `target - x` (the *complement*). So instead of searching for the partner by scanning, we can *remember* the numbers we have already seen and ask a hash map \u201chave I seen the complement?\u201d in `O(1)`.\n\n" +
            "**E. Pattern / data structure.** Hash map from **value \u2192 index**. This trades `O(n)` space for turning the inner scan into a constant-time lookup.\n\n" +
            "**F. Why it works.** If `x` and `y` form the answer and `x` appears earlier, then when we reach `y` the value `x` is already stored, and `target - y == x` is a hit. Every valid pair is discovered when its *second* member is processed.\n\n" +
            "**G/H. What we store.** `seen[value] = index` for every element to the left of the current one.\n\n" +
            "**I. Step by step.** Walk left to right. For the current `num`, compute `complement = target - num`. If the complement is already in `seen`, we have the pair \u2014 return `[seen[complement], i]`. Otherwise record `seen[num] = i` and continue.\n\n" +
            "**J. Why correct.** We only ever pair the current element with an *earlier* one, so we never reuse the same index, and because exactly one solution exists it is guaranteed to be found.\n\n" +
            "**K/L. Complexity.** One pass with `O(1)` map operations \u2192 time `O(n)`, space `O(n)` for the map.\n\n" +
            "**M. Interview mindset.** \u201cFind two things that combine to a target\u201d in an unsorted array is the canonical signal to reach for a hash map of what you have seen.",
          rcs:
            "class Solution:\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n" +
            "        seen = {}                           # Maps a value we've passed -> its index.\n" +
            "        for i, num in enumerate(nums):      # Scan once, left to right.\n" +
            "            complement = target - num       # The exact partner 'num' needs.\n" +
            "            if complement in seen:          # Have we already passed that partner?\n" +
            "                return [seen[complement], i]  # Yes: earlier index first, current second.\n" +
            "            seen[num] = i                   # Otherwise remember num for future lookups.\n" +
            "        return []                           # Guaranteed unreachable by the constraints.",
          plain:
            "class Solution:\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n" +
            "        seen = {}\n" +
            "        for i, num in enumerate(nums):\n" +
            "            complement = target - num\n" +
            "            if complement in seen:\n" +
            "                return [seen[complement], i]\n" +
            "            seen[num] = i\n" +
            "        return []"
        }
      ],
      patternRecognition: [
        "\u201cFind a pair / two elements that satisfy a value relationship\u201d in an unsorted array.",
        "You need indices back, and you want a single pass.",
        "Whenever you catch yourself writing a nested loop to match values, ask: can a hash map remember what I've seen?"
      ],
      interviewRecall: [
        "State brute force first (O(n^2)), then optimize to the hash map \u2014 shows your thought process.",
        "The trick is the complement: partner of x is always target - x.",
        "Store value \u2192 index, and check for the complement BEFORE inserting the current number to avoid using an element twice."
      ]
    },

    {
      id: "contains-duplicate",
      lc: 217,
      title: "Contains Duplicate",
      difficulty: "Easy",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/contains-duplicate/",
      meta: { pattern: "Membership Set", dataStructure: "Hash Set", technique: "Seen-set scan" },
      description:
        "Given an integer array `nums`, return `true` if **any value appears at least twice**, and `false` if every element is distinct.",
      constraints: [
        "`1 <= nums.length <= 10^5`",
        "`-10^9 <= nums[i] <= 10^9`"
      ],
      examples: [
        { input: "nums = [1, 2, 3, 1]", output: "true", reasoning: "The value 1 appears at indices 0 and 3." },
        { input: "nums = [1, 2, 3, 4]", output: "false", reasoning: "All four values are distinct." },
        { input: "nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", output: "true", reasoning: "Several values repeat; the first repeat (a second 1) already forces true." },
        { input: "nums = [5]", output: "false", reasoning: "A single element cannot duplicate anything." }
      ],
      approaches: [
        {
          name: "Optimized — Hash Set",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "Default answer whenever you must detect repeats and can spend O(n) extra memory.",
          logic:
            "**A. Asked.** Does any number repeat?\n\n" +
            "**B. Brute force.** Compare every pair \u2014 `O(n^2)`. Or sort first (`O(n log n)`) and check neighbours; that mutates/copies and is slower than needed.\n\n" +
            "**D. Key observation.** A duplicate exists the instant we encounter a value we have already seen. We do not need to compare all pairs \u2014 we just need fast membership tests.\n\n" +
            "**E. Data structure.** A hash **set** of values seen so far gives `O(1)` add and lookup.\n\n" +
            "**I. Step by step.** For each number: if it is already in the set, return `true`; otherwise add it. If the scan finishes, everything was unique \u2192 `false`.\n\n" +
            "**J. Correctness.** The set holds exactly the values to the left of the cursor; a hit means the same value occurred earlier.\n\n" +
            "**K/L. Complexity.** Time `O(n)`, space `O(n)`. (A one-liner `len(set(nums)) != len(nums)` is the same idea but always scans the whole array.)",
          rcs:
            "class Solution:\n" +
            "    def containsDuplicate(self, nums: List[int]) -> bool:\n" +
            "        seen = set()                    # Values encountered so far.\n" +
            "        for num in nums:                # Single left-to-right pass.\n" +
            "            if num in seen:             # Already met this value earlier?\n" +
            "                return True             # Then it's a duplicate.\n" +
            "            seen.add(num)               # First time: remember it.\n" +
            "        return False                    # No repeats found anywhere.",
          plain:
            "class Solution:\n" +
            "    def containsDuplicate(self, nums: List[int]) -> bool:\n" +
            "        seen = set()\n" +
            "        for num in nums:\n" +
            "            if num in seen:\n" +
            "                return True\n" +
            "            seen.add(num)\n" +
            "        return False"
        }
      ],
      patternRecognition: [
        "\u201cAre there any repeats / is everything unique?\u201d \u2192 hash set.",
        "Early-exit on the first repeat instead of counting everything."
      ],
      interviewRecall: [
        "Set membership is O(1); adding as you go lets you return on the first collision.",
        "Mention the sort-and-compare alternative (O(n log n), O(1) extra) as a space/time trade-off."
      ]
    },

    {
      id: "product-of-array-except-self",
      lc: 238,
      title: "Product of Array Except Self",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/product-of-array-except-self/",
      meta: { pattern: "Prefix / Suffix Products", dataStructure: "Array", technique: "Two directional passes" },
      description:
        "Given an integer array `nums`, return an array `answer` where `answer[i]` is the product of **all** elements of `nums` **except** `nums[i]`.\n\n" +
        "You must solve it **without using division**, and in `O(n)` time.",
      constraints: [
        "`2 <= nums.length <= 10^5`",
        "`-30 <= nums[i] <= 30`",
        "The full product fits in a 32-bit integer.",
        "No division allowed."
      ],
      notes: [
        "The output array does not count as extra space for the follow-up O(1)-space version."
      ],
      examples: [
        {
          input: "nums = [1, 2, 3, 4]",
          output: "[24, 12, 8, 6]",
          reasoning: "answer[0]=2*3*4=24, answer[1]=1*3*4=12, answer[2]=1*2*4=8, answer[3]=1*2*3=6."
        },
        {
          input: "nums = [-1, 1, 0, -3, 3]",
          output: "[0, 0, 9, 0, 0]",
          reasoning: "Because one element is 0, only the slot at the zero's index is non-zero (product of the others = -1*1*-3*3 = 9); every other slot includes the 0."
        },
        {
          input: "nums = [2, 3]",
          output: "[3, 2]",
          reasoning: "Each answer is simply the other element."
        },
        {
          input: "nums = [5, 0, 0]",
          output: "[0, 0, 0]",
          reasoning: "Two zeros means every position still multiplies by at least one 0."
        }
      ],
      approaches: [
        {
          name: "Brute Force",
          time: "O(n^2)",
          space: "O(n)",
          whenToUse: "Only to illustrate the naive idea; it violates the required O(n) time.",
          logic:
            "**B. Brute force.** For each index `i`, multiply every other element with a nested loop. Simple but `O(n^2)`, and for `n = 10^5` that is far too slow.\n\n" +
            "**C. Why insufficient.** It recomputes overlapping products again and again \u2014 the products to the left and right of each index are shared work we throw away.",
          rcs:
            "class Solution:\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:\n" +
            "        n = len(nums)\n" +
            "        answer = [1] * n                     # Result slots, start at multiplicative identity.\n" +
            "        for i in range(n):                   # For each output position...\n" +
            "            product = 1\n" +
            "            for j in range(n):               # ...multiply every OTHER element.\n" +
            "                if j != i:                   # Skip the element itself.\n" +
            "                    product *= nums[j]\n" +
            "            answer[i] = product\n" +
            "        return answer",
          plain:
            "class Solution:\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:\n" +
            "        n = len(nums)\n" +
            "        answer = [1] * n\n" +
            "        for i in range(n):\n" +
            "            product = 1\n" +
            "            for j in range(n):\n" +
            "                if j != i:\n" +
            "                    product *= nums[j]\n" +
            "            answer[i] = product\n" +
            "        return answer"
        },
        {
          name: "Optimized — Prefix & Suffix Products",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The expected solution: any 'combine everything except me' where division is banned or unsafe (zeros).",
          logic:
            "**D. Key observation.** The product of everything except index `i` equals *(product of all elements to the LEFT of i)* \u00d7 *(product of all elements to the RIGHT of i)*. Division is unnecessary if we precompute those two running products.\n\n" +
            "**E. Pattern.** Prefix / suffix accumulation \u2014 a hallmark of array problems where each answer depends on 'everything before' and 'everything after'.\n\n" +
            "**G/H. What we store.** We build the answer in two sweeps. First pass fills `answer[i]` with the prefix product (product of all elements before `i`). Second pass walks from the right multiplying in a running `suffix` product.\n\n" +
            "**I. Step by step.**\n" +
            "1. Left pass: keep a running `prefix` = product of elements seen so far; set `answer[i] = prefix` *before* multiplying `nums[i]` in.\n" +
            "2. Right pass: keep a running `suffix`; multiply `answer[i] *= suffix`, then fold `nums[i]` into `suffix`.\n\n" +
            "**J. Why correct.** After both passes `answer[i] = prefix_i * suffix_i`, which is exactly the product of all elements other than `nums[i]`. Zeros are handled naturally \u2014 no special casing, no division by zero.\n\n" +
            "**K/L. Complexity.** Two linear passes \u2192 `O(n)` time. The output array is not counted as extra space, and we only use a couple of scalars, so `O(1)` auxiliary space.",
          rcs:
            "class Solution:\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:\n" +
            "        n = len(nums)\n" +
            "        answer = [1] * n                 # answer[i] will accumulate the product-except-self.\n" +
            "        prefix = 1                       # Running product of everything to the LEFT of i.\n" +
            "        for i in range(n):               # Left-to-right pass.\n" +
            "            answer[i] = prefix           # Store left product BEFORE including nums[i].\n" +
            "            prefix *= nums[i]            # Now fold nums[i] in for the next index.\n" +
            "        suffix = 1                       # Running product of everything to the RIGHT of i.\n" +
            "        for i in range(n - 1, -1, -1):   # Right-to-left pass.\n" +
            "            answer[i] *= suffix          # Multiply left product by right product.\n" +
            "            suffix *= nums[i]            # Fold nums[i] into the right product.\n" +
            "        return answer",
          plain:
            "class Solution:\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:\n" +
            "        n = len(nums)\n" +
            "        answer = [1] * n\n" +
            "        prefix = 1\n" +
            "        for i in range(n):\n" +
            "            answer[i] = prefix\n" +
            "            prefix *= nums[i]\n" +
            "        suffix = 1\n" +
            "        for i in range(n - 1, -1, -1):\n" +
            "            answer[i] *= suffix\n" +
            "            suffix *= nums[i]\n" +
            "        return answer"
        }
      ],
      patternRecognition: [
        "Answer at each index depends on 'everything to the left' and 'everything to the right'.",
        "Division is forbidden or unsafe (possible zeros) \u2192 prefix/suffix products.",
        "You want O(n) and are tempted by dividing the total product \u2014 that breaks on zeros."
      ],
      interviewRecall: [
        "answer[i] = prefix[i] * suffix[i]; build both with running scalars, reuse the output array to hit O(1) space.",
        "Write the prefix into answer[i] BEFORE multiplying nums[i] so index i excludes itself.",
        "Zeros are the reason division is banned \u2014 the prefix/suffix method sidesteps them."
      ]
    },

    {
      id: "longest-consecutive-sequence",
      lc: 128,
      title: "Longest Consecutive Sequence",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/longest-consecutive-sequence/",
      meta: { pattern: "Hash Set + Sequence Start", dataStructure: "Hash Set", technique: "Count only from run starts" },
      description:
        "Given an unsorted array `nums`, return the length of the **longest run of consecutive integers** (values that follow each other like 3,4,5,6), regardless of their order in the array.\n\n" +
        "You must design an algorithm that runs in `O(n)` time.",
      constraints: [
        "`0 <= nums.length <= 10^5`",
        "`-10^9 <= nums[i] <= 10^9`"
      ],
      notes: [
        "Duplicates should not extend a run; [1,2,2,3] still has longest run length 3.",
        "The consecutive values do not need to be adjacent in the array."
      ],
      examples: [
        {
          input: "nums = [100, 4, 200, 1, 3, 2]",
          output: "4",
          reasoning: "The consecutive run 1,2,3,4 has length 4; 100 and 200 are isolated.",
          visual: "```\nvalues present: {1,2,3,4, 100, 200}\nrun starting at 1: 1\u21922\u21923\u21924  (length 4)\n```"
        },
        {
          input: "nums = [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]",
          output: "9",
          reasoning: "0 through 8 are all present (a duplicate 0 is ignored) \u2192 run length 9."
        },
        {
          input: "nums = []",
          output: "0",
          reasoning: "No elements, so the longest run is 0."
        },
        {
          input: "nums = [1, 2, 0, 1]",
          output: "3",
          reasoning: "0,1,2 form a run of length 3; the duplicate 1 does not lengthen it."
        }
      ],
      approaches: [
        {
          name: "Sort then scan",
          time: "O(n log n)",
          space: "O(1)",
          whenToUse: "Acceptable when O(n log n) is fine and you want minimal extra memory / simple code.",
          logic:
            "**B. Idea.** If we sort the numbers, consecutive values sit next to each other, so we can walk the sorted array counting run lengths, resetting when the gap is not exactly 1 (and skipping equal neighbours).\n\n" +
            "**C. Why not ideal.** Sorting is `O(n log n)`, which violates the stated `O(n)` requirement \u2014 but it is a clean, easy-to-reason fallback and often good enough.",
          rcs:
            "class Solution:\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:\n" +
            "        if not nums:\n" +
            "            return 0\n" +
            "        nums.sort()                       # Consecutive values become adjacent.\n" +
            "        longest = 1                       # At least one number => run of 1.\n" +
            "        current = 1                       # Length of the run we're currently extending.\n" +
            "        for i in range(1, len(nums)):\n" +
            "            if nums[i] == nums[i - 1]:    # Duplicate: ignore, run length unchanged.\n" +
            "                continue\n" +
            "            if nums[i] == nums[i - 1] + 1:  # Exactly one more: extend the run.\n" +
            "                current += 1\n" +
            "                longest = max(longest, current)\n" +
            "            else:                         # Gap > 1: the run breaks, start over.\n" +
            "                current = 1\n" +
            "        return longest",
          plain:
            "class Solution:\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:\n" +
            "        if not nums:\n" +
            "            return 0\n" +
            "        nums.sort()\n" +
            "        longest = 1\n" +
            "        current = 1\n" +
            "        for i in range(1, len(nums)):\n" +
            "            if nums[i] == nums[i - 1]:\n" +
            "                continue\n" +
            "            if nums[i] == nums[i - 1] + 1:\n" +
            "                current += 1\n" +
            "                longest = max(longest, current)\n" +
            "            else:\n" +
            "                current = 1\n" +
            "        return longest"
        },
        {
          name: "Optimized — Hash Set from run starts",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The required O(n) solution. Use when you must find consecutive runs without sorting.",
          logic:
            "**D. Key observation.** A number begins a consecutive run **only if `num - 1` is not present**. If we start counting only from those true starts, each element is visited at most twice overall, giving `O(n)`.\n\n" +
            "**E. Data structure.** Put every value in a hash **set** for `O(1)` presence checks; duplicates collapse automatically.\n\n" +
            "**F. Why it works / avoids blowup.** For a start value `s`, we walk `s, s+1, s+2, \u2026` while each next value is in the set, counting the length. Because we only ever start walking from run starts, the inner walks across the whole array sum to `O(n)`, not `O(n^2)`.\n\n" +
            "**I. Step by step.** For each `num`: if `num - 1` is in the set, skip (it is in the middle of some run, someone else will count it). Otherwise it is a start \u2014 extend upward counting length, and track the max.\n\n" +
            "**J. Correctness.** Every maximal run has exactly one start (the value with no predecessor in the set); we measure each run once, from its start.\n\n" +
            "**K/L. Complexity.** Time `O(n)` amortized, space `O(n)` for the set.",
          rcs:
            "class Solution:\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:\n" +
            "        num_set = set(nums)               # O(1) membership; duplicates removed.\n" +
            "        longest = 0\n" +
            "        for num in num_set:               # Iterate the distinct values.\n" +
            "            if num - 1 not in num_set:    # 'num' starts a run only if it has no left neighbour.\n" +
            "                length = 1                # The run currently holds just 'num'.\n" +
            "                while num + length in num_set:  # Extend upward while the next value exists.\n" +
            "                    length += 1\n" +
            "                longest = max(longest, length)  # Record the best run so far.\n" +
            "        return longest",
          plain:
            "class Solution:\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:\n" +
            "        num_set = set(nums)\n" +
            "        longest = 0\n" +
            "        for num in num_set:\n" +
            "            if num - 1 not in num_set:\n" +
            "                length = 1\n" +
            "                while num + length in num_set:\n" +
            "                    length += 1\n" +
            "                longest = max(longest, length)\n" +
            "        return longest"
        }
      ],
      patternRecognition: [
        "Consecutive integers / runs required in O(n) with no sorting.",
        "Order in the array doesn't matter, only which values are present \u2192 hash set.",
        "The 'only count from a run start' trick is what keeps it linear."
      ],
      interviewRecall: [
        "Build a set, then only start counting when num-1 is absent.",
        "Iterate the SET (distinct values), not the list, to avoid redundant work on duplicates.",
        "Explain why it's O(n): each value is entered by an inner while-loop at most once."
      ]
    },

    {
      id: "encode-and-decode-strings",
      lc: 271,
      title: "Encode and Decode Strings",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/encode-and-decode-strings/",
      meta: { pattern: "Length-Prefix Framing", dataStructure: "String", technique: "Serialize / deserialize" },
      description:
        "Design an algorithm to **encode** a list of strings into a single string, and **decode** that single string back into the original list.\n\n" +
        "The strings may contain **any** characters (including digits, spaces, and your delimiter), so a naive separator is not safe. The encode/decode pair must round-trip perfectly.",
      constraints: [
        "`0 <= strs.length <= 200`",
        "`0 <= strs[i].length <= 200`",
        "`strs[i]` may contain any characters in the range [0, 255]."
      ],
      notes: [
        "You cannot assume any character is 'unused' as a delimiter \u2014 that is the whole difficulty.",
        "Encode and decode are two methods; the grader calls decode(encode(strs))."
      ],
      examples: [
        {
          input: 'strs = ["neet", "code", "love", "you"]',
          output: '["neet","code","love","you"]',
          reasoning: 'Encoded as "4#neet4#code4#love3#you", then decoded back exactly.',
          visual: "```\n\"neet\" -> 4#neet\n\"code\" -> 4#code\nencoded: 4#neet4#code4#love3#you\n         ^len ^payload\n```"
        },
        {
          input: 'strs = ["", ""]',
          output: '["",""]',
          reasoning: 'Two empty strings encode to "0#0#" \u2014 lengths make empties unambiguous.'
        },
        {
          input: 'strs = ["a#b", "3#c"]',
          output: '["a#b","3#c"]',
          reasoning: "Payloads that themselves contain '#' and digits still decode correctly because we read exactly 'length' characters, never search for '#'."
        },
        {
          input: "strs = []",
          output: "[]",
          reasoning: "Empty list encodes to the empty string and decodes back to an empty list."
        }
      ],
      approaches: [
        {
          name: "Length-prefix encoding",
          time: "O(N) encode & decode (N = total characters)",
          space: "O(N)",
          whenToUse: "The standard, robust serialization trick whenever payloads can contain your delimiter.",
          logic:
            "**A. Asked.** Turn a list of arbitrary strings into one string and back, losslessly.\n\n" +
            "**B. Naive idea and why it fails.** Joining with a separator like `,` or `#` breaks the moment a string *contains* that separator \u2014 decode can't tell a real delimiter from data.\n\n" +
            "**D. Key observation.** If we prefix each string with its **length** plus a marker, decode never has to guess. It reads the number, reads the marker, then consumes *exactly* that many characters as the payload \u2014 regardless of what those characters are.\n\n" +
            "**E. Pattern.** Length-prefixed framing (the same idea network protocols use). Format each item as `len(s) + '#' + s`.\n\n" +
            "**I. Step by step (decode).** Start at position 0. Scan digits until the `#` to get the length `L`. The payload is the next `L` characters after the `#`. Append it, jump the cursor past the payload, and repeat until the string is consumed.\n\n" +
            "**J. Why correct.** The length tells decode precisely where each payload ends, so a `#` or digits *inside* a payload are just data, never misread as structure.\n\n" +
            "**K/L. Complexity.** Each character is written/read a constant number of times \u2192 `O(N)` time and space where `N` is the total length.",
          rcs:
            "class Solution:\n" +
            "    def encode(self, strs: List[str]) -> str:\n" +
            "        encoded = []\n" +
            "        for s in strs:                       # Frame every string as length + '#' + payload.\n" +
            "            encoded.append(str(len(s)) + '#' + s)\n" +
            "        return ''.join(encoded)              # Concatenate all frames into one string.\n" +
            "\n" +
            "    def decode(self, s: str) -> List[str]:\n" +
            "        result = []\n" +
            "        i = 0                                # Cursor over the encoded string.\n" +
            "        while i < len(s):\n" +
            "            j = i                            # Find the '#' that ends the length digits.\n" +
            "            while s[j] != '#':\n" +
            "                j += 1\n" +
            "            length = int(s[i:j])             # Digits before '#' give the payload length.\n" +
            "            start = j + 1                    # Payload begins right after '#'.\n" +
            "            result.append(s[start:start + length])  # Take exactly 'length' chars.\n" +
            "            i = start + length               # Jump past this payload to the next frame.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def encode(self, strs: List[str]) -> str:\n" +
            "        encoded = []\n" +
            "        for s in strs:\n" +
            "            encoded.append(str(len(s)) + '#' + s)\n" +
            "        return ''.join(encoded)\n" +
            "\n" +
            "    def decode(self, s: str) -> List[str]:\n" +
            "        result = []\n" +
            "        i = 0\n" +
            "        while i < len(s):\n" +
            "            j = i\n" +
            "            while s[j] != '#':\n" +
            "                j += 1\n" +
            "            length = int(s[i:j])\n" +
            "            start = j + 1\n" +
            "            result.append(s[start:start + length])\n" +
            "            i = start + length\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "Serialize/deserialize where the payload can contain any character, including your delimiter.",
        "'A separator won't work' is the clue to switch to length-prefix framing.",
        "Round-trip guarantee needed (decode(encode(x)) == x)."
      ],
      interviewRecall: [
        "Format: len(s) + '#' + s. Decode reads the number, then consumes exactly that many chars.",
        "Never search for a delimiter inside payloads \u2014 the length makes payloads self-describing.",
        "Handles empty strings and empty lists cleanly (0#, and \"\")."
      ]
    }
  ]);
})();
