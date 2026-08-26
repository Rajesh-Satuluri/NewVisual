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
            "**What it asks.** Given an unsorted array `nums` and a `target`, return the indices of the two elements whose values add up to `target`.\n\n" +
            "**Why the naive idea fails.** The brute-force idea is to try every pair `(i, j)`: for each `i`, scan every later `j` and check whether `nums[i] + nums[j] == target`. It's correct, but there are about `n^2 / 2` pairs, so for `n = 10^4` that's ~50 million checks. The waste is re-scanning the whole array for every element instead of remembering what we've already seen.\n\n" +
            "**Key Idea.** For this approach the insight is simply exhaustiveness: if a valid pair exists, checking every unordered pair once is guaranteed to find it. This is the baseline you state before optimizing.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Let the outer loop fix the first index `i`.\n" +
            "2. Let the inner loop try each later index `j` (starting at `i + 1`), so each unordered pair is considered exactly once.\n" +
            "3. Check whether `nums[i] + nums[j]` equals `target`.\n" +
            "4. On the first match, return `[i, j]` immediately.\n\n" +
            "**Why it works.** Every unordered pair `(i, j)` with `i < j` is examined exactly once, so the guaranteed unique answer cannot be skipped. Returning on the first hit is safe because only one solution exists.\n\n" +
            "**Common Gotchas.**\n" +
            "- Start the inner loop at `i + 1`, not `0`, so an element is never paired with itself.\n" +
            "- Return the indices, not the values.\n" +
            "- Duplicate values are fine as long as the two indices differ.\n\n" +
            "**Complexity.** Time `O(n^2)` from the nested loops; space `O(1)` since no extra structure is used.\n\n" +
            "**Interview mindset.** State this first to show you understand the problem, then immediately note the redundant re-scanning as the motivation to reach for a hash map.",
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
            "**What it asks.** Return the indices of the two numbers in an unsorted `nums` that sum to `target`, in a single pass.\n\n" +
            "**Why the naive idea fails.** Brute force tries every pair in `O(n^2)`, re-scanning the array for each element's partner. That repeated searching is the wasted work we want to eliminate.\n\n" +
            "**Key Idea.** For each number `x`, its partner is completely determined: it must be `target - x`, the *complement*. So rather than searching for the partner, we *remember* the numbers we've already passed in a hash map and ask, in `O(1)`, \u201chave I already seen the complement?\u201d\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a hash map `seen` mapping each value we've passed to its index.\n" +
            "2. Walk left to right; for the current `num` at index `i`, compute `complement = target - num`.\n" +
            "3. If `complement` is already in `seen`, the pair is complete \u2014 return `[seen[complement], i]` (earlier index first).\n" +
            "4. Otherwise record `seen[num] = i` and continue.\n\n" +
            "**Why it works.** We only ever pair the current element with an *earlier* one, so the same index is never reused. If `x` and `y` are the answer and `x` comes first, then by the time we reach `y` its complement `x` is already stored, so the pair is discovered when its second member is processed. Since exactly one solution exists, it's guaranteed to be found.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check for the complement *before* inserting the current number, or an element could match itself.\n" +
            "- Store value `\u2192` index, not the reverse; you need indices back.\n" +
            "- Duplicate values are handled correctly because each is checked before it overwrites the map.\n\n" +
            "**Complexity.** One pass with `O(1)` map operations gives time `O(n)`; space `O(n)` for the map.\n\n" +
            "**Interview mindset.** \u201cFind two things that combine to a target\u201d in an unsorted array is the canonical signal to reach for a hash map of what you've already seen.",
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
            "**What it asks.** Return `true` if any value in `nums` appears at least twice, and `false` if every element is distinct.\n\n" +
            "**Why the naive idea fails.** Comparing every pair is `O(n^2)`. Sorting first and checking neighbours is better at `O(n log n)`, but it mutates or copies the array and is still slower than necessary \u2014 the pairwise comparison is more work than the question requires.\n\n" +
            "**Key Idea.** A duplicate exists the instant we encounter a value we have already seen. We never need to compare all pairs \u2014 we only need a fast membership test on the values encountered so far.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a hash **set** `seen` of the values encountered so far (empty at the start).\n" +
            "2. Scan `nums` left to right.\n" +
            "3. For each `num`, if it is already in `seen`, return `true`.\n" +
            "4. Otherwise add it to `seen` and continue.\n" +
            "5. If the scan finishes with no hit, return `false`.\n\n" +
            "**Why it works.** At any point the set holds exactly the values to the left of the cursor, so a membership hit means that same value occurred earlier \u2014 a genuine duplicate. Finishing the scan without a hit proves every value was distinct.\n\n" +
            "**Common Gotchas.**\n" +
            "- A single-element (or empty) array can never contain a duplicate.\n" +
            "- Add each value only after checking it, so the current element isn't matched against itself.\n" +
            "- Early-exit on the first repeat instead of counting all occurrences.\n\n" +
            "**Complexity.** Time `O(n)` for one pass with `O(1)` set operations; space `O(n)` for the set. (The one-liner `len(set(nums)) != len(nums)` is the same idea but always scans the whole array.)\n\n" +
            "**Interview mindset.** \u201cAre there any repeats / is everything unique?\u201d is the signal to reach for a hash set built as you scan.",
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
            "**What it asks.** Build an array where `answer[i]` is the product of every element of `nums` except `nums[i]`, without using division.\n\n" +
            "**Why the naive idea fails.** The obvious approach fixes each index `i` and multiplies every other element with a nested inner loop. It's simple and correct, but it's `O(n^2)`, and for `n = 10^5` that's far too slow \u2014 it also violates the required `O(n)` time.\n\n" +
            "**Key Idea.** For this baseline there's no clever insight beyond directness: each `answer[i]` is just the product of all `j != i`. The point of writing it out is to expose the waste \u2014 the products to the left and right of each index are shared work being recomputed for every `i`, which motivates the prefix/suffix approach.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `answer` with all `1`s (the multiplicative identity).\n" +
            "2. For each output index `i`, start a running `product` at `1`.\n" +
            "3. In an inner loop over every `j`, multiply `product` by `nums[j]` whenever `j != i`.\n" +
            "4. Store `answer[i] = product`.\n\n" +
            "**Why it works.** By construction, `answer[i]` accumulates the product of exactly the elements other than `nums[i]`, and using multiplication avoids the banned division entirely.\n\n" +
            "**Common Gotchas.**\n" +
            "- Skip the element itself (`j != i`) or the answer collapses to the full product.\n" +
            "- Zeros need no special handling here since we never divide.\n" +
            "- Starting `product` at `1` (not `0`) is essential.\n\n" +
            "**Complexity.** Time `O(n^2)` from the nested loops; space `O(n)` for the output array.\n\n" +
            "**Interview mindset.** Reach for this only to frame the problem \u2014 the moment you notice you're recomputing overlapping left/right products, pivot to prefix/suffix accumulation.",
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
            "**What it asks.** For each index `i`, produce the product of all other elements of `nums`, in `O(n)` time and without division.\n\n" +
            "**Why the naive idea fails.** Brute force multiplies every other element per index in `O(n^2)`. The tempting `O(n)` shortcut \u2014 divide the total product by `nums[i]` \u2014 breaks on zeros (division by zero, and a single zero makes the total zero), and division is banned outright.\n\n" +
            "**Key Idea.** The product of everything except index `i` equals *(product of all elements to the LEFT of `i`)* \u00d7 *(product of all elements to the RIGHT of `i`)*. If we precompute those two running products, no division is ever needed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `answer` with all `1`s.\n" +
            "2. Left pass: keep a running `prefix` (product of elements seen so far, starting at `1`). At each `i`, set `answer[i] = prefix` *before* folding `nums[i]` into `prefix`. Now `answer[i]` holds the product of everything to the left of `i`.\n" +
            "3. Right pass: keep a running `suffix` (starting at `1`), walking from the last index down. At each `i`, multiply `answer[i] *= suffix`, then fold `nums[i]` into `suffix`.\n\n" +
            "**Why it works.** After both sweeps `answer[i] = prefix_i * suffix_i`, which is precisely the product of all elements other than `nums[i]`. Writing the prefix in *before* multiplying `nums[i]` guarantees index `i` excludes itself. Zeros fall out naturally \u2014 no special casing, no division.\n\n" +
            "**Common Gotchas.**\n" +
            "- Store the prefix into `answer[i]` *before* including `nums[i]`, or the index won't exclude itself.\n" +
            "- Start both `prefix` and `suffix` at `1`, not `0`.\n" +
            "- One or more zeros are handled automatically; don't add division to \"optimize.\"\n\n" +
            "**Complexity.** Two linear passes give `O(n)` time. The output array isn't counted as extra space and we use only a couple of scalars, so `O(1)` auxiliary space.\n\n" +
            "**Interview mindset.** When each answer depends on \"everything before\" and \"everything after\" an index \u2014 especially with division banned or unsafe \u2014 reach for prefix/suffix accumulation.",
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
            "**What it asks.** Find the length of the longest run of consecutive integers present in an unsorted `nums`, ignoring their positions in the array.\n\n" +
            "**Why the naive idea fails.** Checking, for each value, how far its run extends by scanning the whole array repeatedly is `O(n^2)`. Sorting is the intuitive fix, but it costs `O(n log n)` and so does not meet the stated `O(n)` requirement \u2014 still, it's a clean, easy-to-reason fallback and often good enough.\n\n" +
            "**Key Idea.** Once the numbers are sorted, consecutive values sit right next to each other, so a single linear walk can measure every run: extend the current run when the next value is exactly one more, and reset when there's a gap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Handle the empty array up front (answer `0`).\n" +
            "2. Sort `nums` so equal and consecutive values become adjacent.\n" +
            "3. Track `current` (length of the run being extended) and `longest` (best seen), both starting at `1`.\n" +
            "4. Walk from the second element: if it equals the previous value, skip it (a duplicate doesn't extend a run).\n" +
            "5. If it is exactly one more than the previous, increment `current` and update `longest`.\n" +
            "6. Otherwise the run is broken \u2014 reset `current` to `1`.\n\n" +
            "**Why it works.** After sorting, any maximal run of consecutive integers appears as a contiguous block of adjacent values differing by one; the walk measures each such block exactly, and skipping equal neighbours keeps duplicates from inflating a run.\n\n" +
            "**Common Gotchas.**\n" +
            "- Handle the empty array separately, or the initial `longest = 1` returns a wrong answer.\n" +
            "- Skip duplicates explicitly; `[1,2,2,3]` still has run length 3.\n" +
            "- Reset `current` to `1` (not `0`) on a gap, since the breaking element itself starts a new run.\n\n" +
            "**Complexity.** Time `O(n log n)` dominated by the sort; space `O(1)` beyond the sort (in-place).\n\n" +
            "**Interview mindset.** If the `O(n)` bound weren't required, sorting-then-scanning is the fastest thing to reason about correctly \u2014 offer it as a fallback, then note sorting is why it misses `O(n)`.",
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
            "**What it asks.** Return the length of the longest run of consecutive integers in `nums`, in `O(n)` time and without sorting.\n\n" +
            "**Why the naive idea fails.** Naively extending a run from every value by repeated membership checks risks re-walking the same run from each of its members, which is `O(n^2)`. Sorting would fix ordering but costs `O(n log n)`, missing the required bound.\n\n" +
            "**Key Idea.** A number begins a consecutive run **only if `num - 1` is not present**. If we start counting *only* from those true run-starts, each value is visited at most twice overall (once as a candidate start, once while being walked over), so the total work is `O(n)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Put every value into a hash **set** for `O(1)` presence checks; duplicates collapse automatically.\n" +
            "2. Iterate the distinct values in the set.\n" +
            "3. For each `num`, if `num - 1` is in the set, skip it \u2014 it sits in the middle of some run and will be counted from that run's start.\n" +
            "4. If `num - 1` is absent, `num` is a run start: walk `num, num+1, num+2, \u2026` while each next value is in the set, counting the length.\n" +
            "5. Track the maximum length seen.\n\n" +
            "**Why it works.** Every maximal run has exactly one start \u2014 the value with no predecessor in the set \u2014 so each run is measured exactly once, from that start. Because inner walks only ever begin at starts, the walks across the whole array sum to `O(n)` rather than `O(n^2)`.\n\n" +
            "**Common Gotchas.**\n" +
            "- Iterate the *set* (distinct values), not the list, to avoid redundant work on duplicates.\n" +
            "- The empty input must return `0`; initialize `longest` to `0`, not `1`.\n" +
            "- Only start walking when `num - 1` is absent \u2014 walking from every value reintroduces `O(n^2)`.\n\n" +
            "**Complexity.** Time `O(n)` amortized (each value entered by an inner walk at most once); space `O(n)` for the set.\n\n" +
            "**Interview mindset.** Consecutive-integer runs required in `O(n)` where only presence (not order) matters is the signal for a hash set plus the \"count only from run starts\" trick.",
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
            "**What it asks.** Turn a list of arbitrary strings into one single string, and later reconstruct the exact original list from it \u2014 losslessly.\n\n" +
            "**Why the naive idea fails.** The tempting approach is to join the strings with a separator like `,` or `#`. But the strings can contain any character, including your separator. The moment a string contains `#`, the decoder can't tell a real delimiter from data, and the round-trip breaks.\n\n" +
            "**Key Idea.** To distinguish the separator from the content, we prepend each string with its length followed by a special character (e.g. `#`). For example, `hello` becomes `5#hello`. During decoding we read digits until we hit `#` to get the length, then read exactly that many characters as the payload \u2014 so whatever those characters are (even `#` or digits) they're treated as data, never as structure.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Encode: for each string `s`, append `len(s) + '#' + s` to a result string; return the concatenation of all frames.\n" +
            "2. Decode: use a pointer `i` to traverse the encoded string.\n" +
            "3. Scan from `i` to the next `#` to read the length `n`.\n" +
            "4. Extract the substring starting just after the `#`, of length `n` \u2014 that's one original string.\n" +
            "5. Move `i` past that substring and repeat until the string is consumed.\n\n" +
            "**Why it works.** The length prefix makes every payload self-describing: the decoder always knows precisely where the current string ends before it starts reading it, so it never guesses at delimiters. Each frame is read exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `#` character (or digits) can appear inside a string \u2014 the length prefix removes the ambiguity; never search for `#` inside a payload.\n" +
            "- Empty strings must round-trip cleanly (they encode as `0#`), and an empty list encodes to the empty string.\n\n" +
            "**Complexity.** Time `O(N)` for both encode and decode (N = total characters, each read a constant number of times). Space `O(N)` for the output.\n\n" +
            "**Interview mindset.** \"A separator won't work because the payload can contain it\" is the exact signal to switch to length-prefixed framing \u2014 the same trick network protocols use.",
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
    },

    {
      id: "valid-anagram",
      lc: 242,
      title: "Valid Anagram",
      difficulty: "Easy",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/valid-anagram/",
      meta: { pattern: "Frequency Count", dataStructure: "Hash Map", technique: "Char counting" },
      description:
        "Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s` — it uses exactly the same characters with the same frequencies, just reordered.",
      constraints: [
        "`1 <= s.length, t.length <= 5 * 10^4`",
        "`s` and `t` consist of lowercase English letters."
      ],
      notes: [
        "If the lengths differ, they cannot be anagrams.",
        "Follow-up: for Unicode, a fixed 26-slot array no longer suffices — use a hash map."
      ],
      examples: [
        { input: 's = "anagram", t = "nagaram"', output: "true", reasoning: "Both have a×3, n×1, g×1, r×1, m×1." },
        { input: 's = "rat", t = "car"', output: "false", reasoning: "The character multisets differ (r,a,t vs c,a,r)." },
        { input: 's = "ab", t = "a"', output: "false", reasoning: "Different lengths can't be anagrams." },
        { input: 's = "aacc", t = "ccac"', output: "false", reasoning: "s has a×2,c×2; t has a×1,c×3 — counts differ." }
      ],
      approaches: [
        {
          name: "Sort both",
          time: "O(n log n)", space: "O(n)",
          whenToUse: "Quick to write; fine when n is modest and the sort cost is acceptable.",
          logic:
            "**What it asks.** Decide if `t` is a reordering of `s` (same letters, same counts).\n\n" +
            "**Why the naive idea fails.** Comparing character by character in order fails because anagrams are reorderings — position doesn't matter, only the multiset of characters does.\n\n" +
            "**Key Idea.** Two strings are anagrams iff their **sorted forms are identical** — sorting canonicalizes the multiset so equal multisets become equal strings.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the lengths differ, return `false` immediately.\n" +
            "2. Sort both strings.\n" +
            "3. Return whether the sorted strings are equal.\n\n" +
            "**Why it works.** Sorting maps every string with the same character counts to the exact same sequence, so equality of sorted forms is equivalent to equality of multisets.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check lengths first as a fast reject.\n" +
            "- Sorting is `O(n log n)` — slower than counting for large inputs.\n\n" +
            "**Complexity.** Time `O(n log n)`; space `O(n)` for the sorted copies.\n\n" +
            "**Interview mindset.** Offer this one-liner, then propose the O(n) counting approach as the optimization.",
          rcs:
            "class Solution:\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:\n" +
            "        if len(s) != len(t):        # Different lengths => cannot match.\n" +
            "            return False\n" +
            "        return sorted(s) == sorted(t)  # Same multiset => same sorted sequence.",
          plain:
            "class Solution:\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:\n" +
            "        if len(s) != len(t):\n" +
            "            return False\n" +
            "        return sorted(s) == sorted(t)"
        },
        {
          name: "Optimized — Frequency count",
          time: "O(n)", space: "O(1)",
          whenToUse: "The expected answer; linear time with a bounded-size count map.",
          logic:
            "**What it asks.** Same as above — equal character multisets.\n\n" +
            "**Key Idea.** Count how many times each character appears in `s`, then compare against the counts of `t`. Equal count maps mean equal multisets. A hash map (or a 26-slot array for lowercase) gives `O(1)` updates.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If lengths differ, return `false`.\n" +
            "2. Tally each character of `s` into a count map.\n" +
            "3. Tally each character of `t` the same way.\n" +
            "4. Return whether the two maps are equal.\n\n" +
            "**Why it works.** The count map is exactly the character multiset; two strings are anagrams iff their multisets match, so equal maps are necessary and sufficient.\n\n" +
            "**Common Gotchas.**\n" +
            "- Length check first is a cheap early exit.\n" +
            "- For Unicode, use a hash map rather than a fixed 26 array.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(1)` for lowercase (≤26 keys), `O(k)` for a general alphabet.\n\n" +
            "**Interview mindset.** 'Compare character frequencies' is the signal — counting beats sorting whenever the alphabet is bounded.",
          rcs:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:\n" +
            "        if len(s) != len(t):             # Fast reject on length mismatch.\n" +
            "            return False\n" +
            "        return Counter(s) == Counter(t)  # Compare character -> frequency maps.",
          plain:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:\n" +
            "        if len(s) != len(t):\n" +
            "            return False\n" +
            "        return Counter(s) == Counter(t)"
        }
      ],
      patternRecognition: [
        "'Same characters reordered' / 'is it a permutation' → compare frequency maps.",
        "Bounded alphabet → counting is O(n), beats sorting."
      ],
      interviewRecall: [
        "Length check first.",
        "Counter(s) == Counter(t), or a 26-array increment/decrement.",
        "Mention the Unicode follow-up (hash map, not a fixed array)."
      ]
    },

    {
      id: "group-anagrams",
      lc: 49,
      title: "Group Anagrams",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/group-anagrams/",
      meta: { pattern: "Hash by Signature", dataStructure: "Hash Map", technique: "Canonical key" },
      description:
        "Given an array of strings `strs`, group together the ones that are anagrams of each other. Return the groups in any order.",
      constraints: [
        "`1 <= strs.length <= 10^4`",
        "`0 <= strs[i].length <= 100`",
        "`strs[i]` consists of lowercase English letters."
      ],
      examples: [
        { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["eat","tea","ate"],["tan","nat"],["bat"]]', reasoning: "eat/tea/ate share {a,e,t}; tan/nat share {a,n,t}; bat is alone." },
        { input: 'strs = [""]', output: '[[""]]', reasoning: "A single empty string forms one group." },
        { input: 'strs = ["a"]', output: '[["a"]]', reasoning: "One string, one group." }
      ],
      approaches: [
        {
          name: "Sorted-string key",
          time: "O(n·k log k)", space: "O(n·k)",
          whenToUse: "Simplest canonical key; k = max word length.",
          logic:
            "**What it asks.** Bucket strings so every member of a bucket is an anagram of the others.\n\n" +
            "**Why the naive idea fails.** Comparing every pair for anagram-ness is `O(n^2 · k)` — far too slow for 10^4 strings.\n\n" +
            "**Key Idea.** Give each string a **canonical signature** that is identical for anagrams and different otherwise, then group by it in a hash map. Sorting a word's letters is such a signature: `\"eat\"`, `\"tea\"`, `\"ate\"` all sort to `\"aet\"`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each word, compute `key = ''.join(sorted(word))`.\n" +
            "2. Append the ORIGINAL word to `groups[key]` (a dict of key → list).\n" +
            "3. Return the dict's values.\n\n" +
            "**Why it works.** Two words are anagrams iff their sorted letters match, so the sorted key partitions the input exactly into anagram classes.\n\n" +
            "**Common Gotchas.**\n" +
            "- Store the original word in the bucket, not the sorted key.\n" +
            "- The empty string is its own valid key.\n\n" +
            "**Complexity.** Time `O(n·k log k)` (sorting each word); space `O(n·k)`.\n\n" +
            "**Interview mindset.** 'Group by an equivalence relation' → hash by a canonical form of each item.",
          rcs:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n" +
            "        groups = defaultdict(list)          # canonical key -> list of words\n" +
            "        for word in strs:\n" +
            "            key = ''.join(sorted(word))     # anagrams share the same sorted letters\n" +
            "            groups[key].append(word)        # bucket the original word\n" +
            "        return list(groups.values())",
          plain:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n" +
            "        groups = defaultdict(list)\n" +
            "        for word in strs:\n" +
            "            key = ''.join(sorted(word))\n" +
            "            groups[key].append(word)\n" +
            "        return list(groups.values())"
        },
        {
          name: "Optimized — Character-count key",
          time: "O(n·k)", space: "O(n·k)",
          whenToUse: "Avoids the per-word sort; best when k is large.",
          logic:
            "**Key Idea.** Instead of sorting, build the signature from **letter counts**: a length-26 tuple of how many times each letter appears. Anagrams produce identical count tuples, and building one is `O(k)` rather than `O(k log k)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each word, build `count[26]`, incrementing `count[ord(c) - ord('a')]`.\n" +
            "2. Use `tuple(count)` as the hash key and append the word.\n" +
            "3. Return the buckets.\n\n" +
            "**Why it works.** The count vector IS the multiset of characters, which is exactly what defines an anagram class.\n\n" +
            "**Common Gotchas.**\n" +
            "- The key must be hashable — convert the list to a tuple.\n" +
            "- Assumes lowercase a–z; widen the array for other alphabets.\n\n" +
            "**Complexity.** Time `O(n·k)`; space `O(n·k)`.\n\n" +
            "**Interview mindset.** When a canonical key must be cheap, counting beats sorting for bounded alphabets.",
          rcs:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n" +
            "        groups = defaultdict(list)          # count-signature -> words\n" +
            "        for word in strs:\n" +
            "            count = [0] * 26                # counts of 'a'..'z'\n" +
            "            for c in word:\n" +
            "                count[ord(c) - ord('a')] += 1\n" +
            "            groups[tuple(count)].append(word)  # tuple is hashable => usable key\n" +
            "        return list(groups.values())",
          plain:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n" +
            "        groups = defaultdict(list)\n" +
            "        for word in strs:\n" +
            "            count = [0] * 26\n" +
            "            for c in word:\n" +
            "                count[ord(c) - ord('a')] += 1\n" +
            "            groups[tuple(count)].append(word)\n" +
            "        return list(groups.values())"
        }
      ],
      patternRecognition: [
        "'Group items equivalent under reordering' → hash by a canonical form.",
        "Bounded alphabet → count-tuple key is O(k) per word."
      ],
      interviewRecall: [
        "Key = sorted word, or a 26-count tuple.",
        "Bucket the original word; return dict.values().",
        "defaultdict(list) keeps it clean."
      ]
    },

    {
      id: "valid-sudoku",
      lc: 36,
      title: "Valid Sudoku",
      difficulty: "Medium",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/valid-sudoku/",
      meta: { pattern: "Set Validation", dataStructure: "Hash Set", technique: "Row/col/box sets" },
      description:
        "Given a 9×9 Sudoku board (partially filled, empty cells marked `'.'`), determine whether the currently-placed digits are valid: no repeated digit within any row, any column, or any of the nine 3×3 sub-boxes. Only filled cells are checked — the board need not be solvable.",
      constraints: [
        "`board.length == 9` and `board[i].length == 9`",
        "Each cell is a digit `'1'`–`'9'` or `'.'`."
      ],
      notes: [
        "You are NOT solving the puzzle, only validating the filled cells.",
        "Empty cells ('.') are skipped."
      ],
      examples: [
        { input: "a valid partially-filled board", output: "true", reasoning: "No digit repeats within any row, column, or 3×3 box." },
        { input: "the same board but with two 8s in the top-left box", output: "false", reasoning: "A 3×3 box repeat makes it invalid even if rows/columns look fine." }
      ],
      approaches: [
        {
          name: "One pass with row/col/box sets",
          time: "O(1) (fixed 81 cells)", space: "O(1)",
          whenToUse: "Standard approach; a single scan tracking three families of sets.",
          logic:
            "**What it asks.** Check that no row, column, or 3×3 box contains a duplicate digit among the filled cells.\n\n" +
            "**Why the naive idea fails.** Scanning each row, then each column, then each box separately works but repeats work; a single pass with the right bookkeeping is cleaner and equally correct.\n\n" +
            "**Key Idea.** Maintain **one set per row, one per column, and one per box** (nine of each). Cell `(r, c)` belongs to box `(r // 3, c // 3)`. As you scan, a digit is invalid the moment it is already present in its row set, column set, or box set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create `rows`, `cols`, `boxes` as dictionaries of sets.\n" +
            "2. For each filled cell with digit `d`: if `d` is already in `rows[r]`, `cols[c]`, or `boxes[(r//3, c//3)]`, return `false`.\n" +
            "3. Otherwise add `d` to all three sets and continue.\n" +
            "4. If the scan completes, return `true`.\n\n" +
            "**Why it works.** Each set records exactly the digits seen so far in that unit; a membership hit is precisely a duplicate within a row, column, or box.\n\n" +
            "**Common Gotchas.**\n" +
            "- Skip `'.'` cells.\n" +
            "- The box key is `(r // 3, c // 3)`, not `r // 3 + c // 3`.\n" +
            "- Add to all three sets, not just one.\n\n" +
            "**Complexity.** The board is fixed 9×9 → `O(1)` (81 cells, constant sets).\n\n" +
            "**Interview mindset.** 'No duplicates within groups' → a set per group and a single membership-then-insert scan.",
          rcs:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def isValidSudoku(self, board: List[List[str]]) -> bool:\n" +
            "        rows = defaultdict(set)                 # digits seen in each row\n" +
            "        cols = defaultdict(set)                 # digits seen in each column\n" +
            "        boxes = defaultdict(set)                # digits seen in each 3x3 box\n" +
            "        for r in range(9):\n" +
            "            for c in range(9):\n" +
            "                d = board[r][c]\n" +
            "                if d == '.':                    # skip empty cells\n" +
            "                    continue\n" +
            "                b = (r // 3, c // 3)            # which 3x3 box this cell is in\n" +
            "                if d in rows[r] or d in cols[c] or d in boxes[b]:\n" +
            "                    return False               # duplicate in a row/col/box\n" +
            "                rows[r].add(d)                  # record the digit in all three units\n" +
            "                cols[c].add(d)\n" +
            "                boxes[b].add(d)\n" +
            "        return True",
          plain:
            "from collections import defaultdict\n" +
            "\n" +
            "class Solution:\n" +
            "    def isValidSudoku(self, board: List[List[str]]) -> bool:\n" +
            "        rows = defaultdict(set)\n" +
            "        cols = defaultdict(set)\n" +
            "        boxes = defaultdict(set)\n" +
            "        for r in range(9):\n" +
            "            for c in range(9):\n" +
            "                d = board[r][c]\n" +
            "                if d == '.':\n" +
            "                    continue\n" +
            "                b = (r // 3, c // 3)\n" +
            "                if d in rows[r] or d in cols[c] or d in boxes[b]:\n" +
            "                    return False\n" +
            "                rows[r].add(d)\n" +
            "                cols[c].add(d)\n" +
            "                boxes[b].add(d)\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'No duplicates within each group (row/col/box)' → a hash set per group.",
        "Grid sub-box indexing via (r // 3, c // 3)."
      ],
      interviewRecall: [
        "Three families of sets: rows, cols, boxes.",
        "Box key = (r // 3, c // 3).",
        "Check-then-insert; skip '.'."
      ]
    }
  ]);
})();
