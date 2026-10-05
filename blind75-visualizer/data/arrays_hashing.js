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
            "**What it asks.** You are given an unsorted array `nums` and a number `target`. Return the two *positions* (indices) whose values add up to `target`. Two details drive everything: you return indices (not the values themselves), and you may not use the same element twice.\n\n" +
            "**Why the naive idea fails.** The most direct idea is to test every possible pair: fix one element, then walk through all the others looking for a partner that completes the sum. It is correct, but it does heavily redundant work — for each of the `n` elements it re-scans much of the array, giving about `n·(n-1)/2` comparisons. At `n = 10^4` that is roughly 50 million checks, and the pattern of re-examining the same values over and over is exactly what the optimized version eliminates.\n\n" +
            "**Key Idea.** The only property this approach leans on is *exhaustiveness*: if an answer exists, then looking at every unordered pair exactly once must run into it. There is no cleverness here — it is the correctness baseline you state first, and then improve.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Use an outer loop to fix the first index `i`.\n" +
            "2. Use an inner loop over `j = i + 1 … n-1`, so every unordered pair `(i, j)` is generated once and no element is paired with itself.\n" +
            "3. For each pair, test whether `nums[i] + nums[j]` equals `target`.\n" +
            "4. Return `[i, j]` on the first match — because the problem promises exactly one solution, the first hit is the answer.\n\n" +
            "**Why it works.** Every pair with `i < j` is visited exactly once, so the unique valid pair cannot be missed. Stopping at the first match is safe precisely because a single solution is guaranteed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Start the inner loop at `i + 1`, never `0` — otherwise you re-check pairs and may add an element to itself.\n" +
            "- Return the indices, not the values at those indices.\n" +
            "- Equal values (e.g. `[3, 3]`) are valid as long as the two indices differ.\n\n" +
            "**Complexity.** Two nested loops give time `O(n^2)`; no auxiliary storage means space `O(1)`.\n\n" +
            "**Interview mindset.** Say this approach first to prove you understand the problem, then point at the repeated re-scanning as the concrete inefficiency that motivates reaching for a hash map.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls twoSum on it.\n\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:  # Return the indices of the two values summing to target.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(nums)  # Cache the element count so we do not recompute len(nums) on every loop.\n" +
            "                       # State: n is the number of valid indices, 0 through n - 1.\n" +
            "                       # Execution flow: Python continues to the outer for loop.\n\n" +
            "        # ==================== PHASE 2: TRY EVERY UNORDERED PAIR ====================\n\n" +
            "        for i in range(n):  # Fix the first index i of the candidate pair.\n" +
            "                            # Loop invariant: every pair whose first index is < i has already been tested.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i automatically.\n\n" +
            "            for j in range(i + 1, n):  # Try every LATER index j, so each unordered pair is seen exactly once.\n" +
            "                                       # Why i + 1: starting at 0 would retest pairs and let i pair with itself.\n" +
            "                                       # Execution flow: after one j finishes, Python assigns the next j.\n\n" +
            "                if nums[i] + nums[j] == target:  # Do these two values add up to target?\n" +
            "                    return [i, j]  # Yes: hand the two indices to the caller and end the function now.\n" +
            "                                   # Execution flow: no code after return runs; control leaves twoSum.\n" +
            "                                   # Why safe: exactly one solution exists, so the first match IS the answer.\n\n" +
            "        return []  # Unreachable given the one-solution guarantee; kept so every path returns a list.",
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
            "**What it asks.** Return the indices of the two numbers in an unsorted `nums` that add up to `target`, ideally in a single pass over the array.\n\n" +
            "**Why the naive idea fails.** Brute force re-scans the array to find each element's partner, costing `O(n^2)`. The wasted effort is *searching* for the partner every single time \u2014 information we could instead have remembered from the elements we already walked past.\n\n" +
            "**Key Idea.** Once you fix a value `x`, its partner is not a mystery: it must be exactly `target - x`, the *complement*. So flip the question around \u2014 as you pass each value, store it in a hash map, and for the current value simply ask the map, in `O(1)`, whether its complement has already gone by. Searching for one *known* value is far cheaper than searching for an unknown pair.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a hash map `seen` that maps each value you have already passed to the index where it appeared.\n" +
            "2. Scan left to right. For the current value `num` at index `i`, compute `complement = target - num`.\n" +
            "3. If `complement` is already a key in `seen`, the pair is complete \u2014 return `[seen[complement], i]`, earlier index first.\n" +
            "4. Otherwise store `seen[num] = i` and move on.\n\n" +
            "**Why it works.** You only ever match the current element against one that came *strictly before* it, so the same index can never be used twice. If the true pair is `x` then `y` (with `x` earlier), then by the time the scan reaches `y`, `x` is already in the map \u2014 so the answer is detected the moment its second member is processed. With exactly one solution guaranteed, that moment is certain to arrive.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check for the complement *before* inserting the current number; inserting first can let an element pair with itself when `num == complement`.\n" +
            "- Store `value \u2192 index`, not the reverse; you need the indices back.\n" +
            "- Duplicates are handled correctly because each occurrence is checked before it overwrites the previous one in the map.\n\n" +
            "**Complexity.** A single pass with average-`O(1)` map operations gives time `O(n)`; the map holds up to `n` entries, so space `O(n)`. You spend `O(n)` memory to turn an `O(n^2)` search into `O(n)`.\n\n" +
            "**Interview mindset.** \u201cFind two things that combine to a fixed target\u201d in an unsorted array is the canonical trigger for a hash map of what you have already seen \u2014 remember-as-you-go beats search-again.",
          rcs:
            "from typing import List  # List lets the type hints describe the int list in and the two-index list out.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls twoSum on the object.\n\n" +
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:  # Return indices of the two values summing to target, in one pass.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        seen = {}  # Hash map: a value we have already passed -> the index where it lives.\n" +
            "                   # Why a dict: average O(1) membership tests and lookups are what make a single pass possible.\n" +
            "                   # State: seen starts empty and gains one entry per element we pass.\n" +
            "                   # Execution flow: Python enters the scan loop.\n\n" +
            "        # ==================== PHASE 2: ONE-PASS COMPLEMENT SEARCH ====================\n\n" +
            "        for i, num in enumerate(nums):  # Walk left to right; enumerate yields both the index i and the value num.\n" +
            "                                        # Loop invariant: seen holds every value strictly before index i, mapped to its index.\n" +
            "                                        # Execution flow: after each iteration Python advances to the next (i, num).\n\n" +
            "            complement = target - num  # The exact partner num needs, since complement + num == target.\n" +
            "                                       # Why: fixing num pins its partner to ONE known value, so we search for a value, not a pair.\n\n" +
            "            if complement in seen:  # Have we already passed that exact partner value?\n" +
            "                                    # Python hashes complement and checks the dict in average O(1).\n" +
            "                return [seen[complement], i]  # Yes: earlier index first (seen[complement]), current index second.\n" +
            "                                              # Execution flow: return ends twoSum; nothing below runs.\n" +
            "                                              # Why safe: the partner sits at an earlier index, so no index is reused.\n\n" +
            "            seen[num] = i  # No partner yet: record this value's index so a LATER element can find it.\n" +
            "                           # State change: seen now also maps num -> i.\n" +
            "                           # Why check before insert: inserting first could let an element match itself when num == complement.\n" +
            "                           # Execution flow: end of iteration; Python returns to the for header for the next element.\n\n" +
            "        return []  # Unreachable under the one-solution guarantee; keeps the function total.",
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
            "**What it asks.** Return `true` if any value in `nums` appears at least twice, and `false` if every element is distinct. Notice how little the question actually wants: not *how many* repeats, not *which* value repeats, not *where* \u2014 just a single yes/no about whether any collision exists at all. That minimalism is the lever the optimal solution pulls on.\n\n" +
            "**Why the naive idea fails.** The most literal reading is to compare every element against every other, which is the classic double loop at `O(n^2)`. For `n = 10^5` that is on the order of ten billion comparisons \u2014 hopelessly slow.\n\n" +
            "A gentler improvement is to sort the array first and then scan adjacent pairs: after sorting, any two equal values sit next to each other, so a single neighbour-compare pass finds a repeat. That is `O(n log n)`, which is fine, but it either mutates the caller's array or pays for a copy, and the `log n` factor is still more work than the problem needs.\n\n" +
            "**Key Idea.** A duplicate reveals itself the *instant* you meet a value you have already met \u2014 you do not need the whole array in view, only a memory of what has gone by. Replace \u2018compare against everything\u2019 with \u2018ask a fast set whether I have seen this before\u2019. A hash set answers that membership question in average `O(1)`, so the whole scan collapses to linear time and can stop early the moment the first repeat appears.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create an empty hash **set** `seen`; it will hold exactly the values lying to the left of the cursor.\n" +
            "2. Walk `nums` once, left to right.\n" +
            "3. For the current `num`, ask `num in seen`. If it is present, this same value appeared earlier \u2014 return `true` immediately.\n" +
            "4. Otherwise add `num` to `seen` and continue to the next element.\n" +
            "5. If the loop drains the whole array without a hit, every value was distinct \u2014 return `false`.\n\n" +
            "**Why it works.** The loop maintains a simple invariant: when the cursor is at index `i`, `seen` contains precisely the values at indices `0 .. i-1`. So a membership hit on `nums[i]` means that identical value occurred at some strictly earlier index \u2014 a genuine duplicate at two different positions, exactly what we are asked to detect. Conversely, if the scan reaches the end with no hit, no value ever matched an earlier one, so all values are distinct. Checking *before* inserting is what keeps an element from matching itself.\n\n" +
            "**Common Gotchas.**\n" +
            "- A single-element (or empty) array can never contain a duplicate \u2014 the loop simply never fires a hit, so this falls out for free.\n" +
            "- Insert each value only *after* the membership check; inserting first would let the current element be \u2018found\u2019 as its own duplicate.\n" +
            "- Return on the first collision rather than tallying every occurrence \u2014 the question is existential, not a count.\n\n" +
            "**Complexity.** One pass with average-`O(1)` set operations gives time `O(n)`; the set can grow to hold every distinct value, so space is `O(n)`. (The Python one-liner `len(set(nums)) != len(nums)` expresses the same idea but always consumes the entire array, forfeiting the early exit.)\n\n" +
            "**Interview mindset.** \u201cAre there any repeats / is everything unique?\u201d is the canonical cue for a hash set built as you scan. Mention the sort-and-compare alternative to show you understand the time/space trade-off, then reach for the set because it is linear and can bail out early.",
          rcs:
            "from typing import List  # List lets the type hint say we accept a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls containsDuplicate on it.\n\n" +
            "    def containsDuplicate(self, nums: List[int]) -> bool:  # Return True if any value repeats, else False.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        seen = set()  # Hash set of every value we have already walked past.\n" +
            "                      # Why a set: membership tests (x in seen) run in average O(1), which is what makes one pass enough.\n" +
            "                      # State: seen starts empty and gains one value per iteration.\n" +
            "                      # Execution flow: Python enters the scan loop below.\n\n" +
            "        # ==================== PHASE 2: SCAN AND DETECT ====================\n\n" +
            "        for num in nums:  # Walk the array once, left to right; num is the current value.\n" +
            "                          # Loop invariant: seen holds exactly the values at every index strictly before this one.\n" +
            "                          # Execution flow: after each iteration Python advances num to the next element.\n\n" +
            "            if num in seen:  # Have we met this exact value at an earlier index?\n" +
            "                             # Python hashes num and checks the set in average O(1).\n" +
            "                return True  # Yes: two different positions share this value, so a duplicate exists.\n" +
            "                             # Execution flow: return ends the function immediately; nothing below runs.\n" +
            "                             # Why safe: the match came from an EARLIER element, never from num itself (we check before we insert).\n\n" +
            "            seen.add(num)  # First sighting of this value: remember it for later comparisons.\n" +
            "                           # State change: seen now also contains num.\n" +
            "                           # Why after the check: adding first would let num be 'found' as its own duplicate.\n" +
            "                           # Execution flow: end of iteration; Python returns to the for header for the next value.\n\n" +
            "        return False  # The whole array was scanned with no repeat, so every value is distinct.",
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
            "**What it asks.** Build a new array `answer` where `answer[i]` is the product of every element of `nums` *except* `nums[i]`. The catch that shapes the whole problem: you may not use division.\n\n" +
            "**Why the naive idea fails.** The most direct reading is: for each output slot `i`, loop over the whole array again and multiply together everything except `nums[i]`. It is correct and easy to trust, but it is a nested loop \u2014 `O(n^2)`. At `n = 10^5` that is around ten billion multiplications, which blows past any reasonable time limit and violates the required `O(n)` bound.\n\n" +
            "The deeper problem is *repeated work*. When you compute `answer[0]` you multiply `nums[1] * nums[2] * ... ` and then throw that entire product away; computing `answer[1]` you rebuild almost the same product from scratch. The left-of-`i` and right-of-`i` products overlap enormously between neighbouring indices, and the brute force recomputes them every time.\n\n" +
            "**Key Idea.** There is no clever trick in this baseline \u2014 that is precisely its purpose. Writing it out makes the wasted, overlapping sub-products visible, and *seeing* that waste is what motivates the prefix/suffix method that reuses those running products instead of rebuilding them. Using multiplication (never division) also sidesteps the zero problem for free.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create `answer` filled with `1`s \u2014 `1` is the multiplicative identity, a safe starting point for a running product.\n" +
            "2. For each output index `i`, reset a local `product` to `1`.\n" +
            "3. Loop an inner index `j` across the whole array, and whenever `j != i`, fold `nums[j]` into `product`.\n" +
            "4. After the inner loop, store `answer[i] = product` \u2014 the product of every element other than `nums[i]`.\n\n" +
            "**Why it works.** By construction the inner loop multiplies together exactly the elements whose index is not `i`, so `answer[i]` is the product-except-self by definition. Because we only ever multiply, a zero in the data is just another factor \u2014 there is no division to blow up on it.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `j != i` guard is essential; drop it and every slot collapses to the full product of the array.\n" +
            "- Start `product` at `1`, never `0` \u2014 a `0` would annihilate every product.\n" +
            "- Zeros in `nums` need no special handling here precisely because nothing divides.\n\n" +
            "**Complexity.** Two nested loops give time `O(n^2)`; the output array is the only extra storage, so space `O(n)`.\n\n" +
            "**Interview mindset.** State this only to frame the problem and pin down correctness. The instant you articulate that the left and right sub-products are being recomputed for every `i`, you have handed yourself the motivation to pivot to prefix/suffix accumulation.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls productExceptSelf on it.\n\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:  # Return answer where answer[i] = product of all others.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(nums)  # Cache the length so we do not recompute len(nums) inside the loops.\n" +
            "                       # State: n is the number of output slots, indices 0 .. n - 1.\n\n" +
            "        answer = [1] * n  # One result slot per input element, each primed to 1.\n" +
            "                          # Why 1: it is the multiplicative identity, the correct seed for a running product.\n" +
            "                          # State: answer will be overwritten slot by slot below.\n" +
            "                          # Execution flow: Python enters the outer loop.\n\n" +
            "        # ==================== PHASE 2: PRODUCT OF ALL OTHERS PER INDEX ====================\n\n" +
            "        for i in range(n):  # i is the output position we are currently filling.\n" +
            "                            # Loop invariant: answer[0 .. i-1] already hold their product-except-self.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i.\n\n" +
            "            product = 1  # Running product of every element except nums[i], reset for this i.\n" +
            "                         # Why reset each i: the excluded element changes, so the product must be rebuilt.\n\n" +
            "            for j in range(n):  # Walk every index j to consider nums[j] as a factor.\n" +
            "                                # Execution flow: after one j finishes, Python assigns the next j.\n\n" +
            "                if j != i:  # Include nums[j] only when j is not the excluded index i.\n" +
            "                    product *= nums[j]  # Fold this other element into the running product.\n" +
            "                                        # State change: product now also carries the factor nums[j].\n" +
            "                                        # Why safe: skipping j == i is exactly what makes this 'except self'.\n\n" +
            "            answer[i] = product  # This slot now holds the product of all elements other than nums[i].\n" +
            "                                 # State change: answer[i] is finalized.\n" +
            "                                 # Execution flow: end of the i iteration; Python returns to the outer for header.\n\n" +
            "        return answer  # Every slot filled; hand the finished array to the caller and end the function.",
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
            "**What it asks.** For each index `i`, produce the product of all *other* elements of `nums`, achieving `O(n)` time and using no division.\n\n" +
            "**Why the naive idea fails.** Brute force rebuilds the product of every other element for each index, which is `O(n^2)`. The tempting `O(n)` shortcut \u2014 compute the product of the whole array once, then set `answer[i] = total / nums[i]` \u2014 is doubly disqualified: division is banned outright, and even if it were allowed it breaks on zeros (dividing by a `0`, and a single `0` collapses `total` to `0` so you lose the information needed for the one slot that should be non-zero).\n\n" +
            "**Key Idea.** Split the product around each index. Everything except `nums[i]` factors cleanly into two independent pieces: *(the product of all elements to the LEFT of `i`)* multiplied by *(the product of all elements to the RIGHT of `i`)*. Neither piece includes `nums[i]` itself. Both can be accumulated with a single running scalar swept across the array, so no division and no nested loop is ever needed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Fill `answer` with `1`s so it can absorb running products.\n" +
            "2. **Left pass.** Keep a running `prefix`, starting at `1` (there is nothing to the left of index 0). Sweeping left to right, at each `i` first store `answer[i] = prefix`, *then* fold `nums[i]` into `prefix`. Writing before folding is what keeps `nums[i]` out of its own slot. After this pass, `answer[i]` holds the product of everything strictly left of `i`.\n" +
            "3. **Right pass.** Keep a running `suffix`, starting at `1` (nothing to the right of the last index). Sweeping right to left, at each `i` multiply `answer[i] *= suffix`, then fold `nums[i]` into `suffix`. Again the multiply happens before the fold, so `nums[i]` stays excluded.\n\n" +
            "**Why it works.** After both sweeps, `answer[i]` equals `prefix_i * suffix_i` \u2014 the left product times the right product \u2014 which is exactly the product of every element except `nums[i]`. The \u2018store/multiply before you fold in `nums[i]`\u2019 ordering is the linchpin that guarantees each index excludes itself. Zeros need no special case at all: a single zero simply makes every prefix/suffix that spans it zero, leaving a non-zero value only in the zero's own slot \u2014 which is the correct answer, produced without a single division.\n\n" +
            "**Common Gotchas.**\n" +
            "- Assign to `answer[i]` *before* folding `nums[i]` into the running product, in both passes; do it after and the index stops excluding itself.\n" +
            "- Seed both `prefix` and `suffix` at `1`, never `0` \u2014 a `0` seed zeroes out every result.\n" +
            "- Resist \u2018optimizing\u2019 with division; the prefix/suffix method exists precisely so zeros are handled automatically.\n\n" +
            "**Complexity.** Two independent linear sweeps give `O(n)` time. The output array does not count as extra space (per the follow-up), and we keep only the two scalar accumulators, so auxiliary space is `O(1)`.\n\n" +
            "**Interview mindset.** Whenever an answer at index `i` depends on \u2018everything before `i`\u2019 and \u2018everything after `i`\u2019 \u2014 especially when division is banned or made unsafe by zeros \u2014 prefix/suffix accumulation is the pattern to reach for.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of ints and return a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls productExceptSelf on it.\n\n" +
            "    def productExceptSelf(self, nums: List[int]) -> List[int]:  # Return answer[i] = product of all elements except nums[i].\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(nums)  # Cache the length; used to size the result and bound both sweeps.\n" +
            "                       # State: n is the number of elements and of output slots.\n\n" +
            "        answer = [1] * n  # Result array; each slot starts at 1 so running products can multiply into it.\n" +
            "                          # Why 1: it is the multiplicative identity, safe to accumulate onto.\n" +
            "                          # State: answer will first collect LEFT products, then be multiplied by RIGHT products.\n\n" +
            "        # ==================== PHASE 2: LEFT PASS (PREFIX PRODUCTS) ====================\n\n" +
            "        prefix = 1  # Running product of every element strictly to the LEFT of i; nothing is left of index 0, so 1.\n" +
            "                    # State: prefix grows as we move rightward.\n\n" +
            "        for i in range(n):  # Sweep left to right filling in left-of-i products.\n" +
            "                            # Loop invariant: prefix equals the product of nums[0 .. i-1] when this iteration begins.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next i.\n\n" +
            "            answer[i] = prefix  # Store the product of everything to the left BEFORE nums[i] is folded in.\n" +
            "                                # Why before: this is what keeps nums[i] itself out of answer[i].\n" +
            "                                # State change: answer[i] now holds the left product for index i.\n\n" +
            "            prefix *= nums[i]  # Now include nums[i] so prefix is ready for the NEXT index.\n" +
            "                               # State change: prefix becomes the product of nums[0 .. i].\n" +
            "                               # Execution flow: end of iteration; Python returns to the for header.\n\n" +
            "        # ==================== PHASE 3: RIGHT PASS (SUFFIX PRODUCTS) ====================\n\n" +
            "        suffix = 1  # Running product of every element strictly to the RIGHT of i; nothing is right of the last index, so 1.\n" +
            "                    # State: suffix grows as we move leftward.\n\n" +
            "        for i in range(n - 1, -1, -1):  # Sweep right to left; range(n-1, -1, -1) yields n-1, n-2, ..., 0.\n" +
            "                                        # Loop invariant: suffix equals the product of nums[i+1 .. n-1] when this iteration begins.\n" +
            "                                        # Execution flow: after one i finishes, Python assigns the next (smaller) i.\n\n" +
            "            answer[i] *= suffix  # Combine the stored left product with the right product: left_i * right_i.\n" +
            "                                 # State change: answer[i] is now the full product-except-self and is final.\n" +
            "                                 # Why correct: left product excludes nums[i], right product excludes nums[i], so their product does too.\n\n" +
            "            suffix *= nums[i]  # Fold nums[i] into suffix for the NEXT (smaller) index.\n" +
            "                               # State change: suffix becomes the product of nums[i .. n-1].\n" +
            "                               # Execution flow: end of iteration; Python returns to the for header.\n\n" +
            "        return answer  # Both sweeps done; every slot is final. Hand it back and end the function.",
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
            "**What it asks.** Find the length of the longest run of *consecutive integers* present in an unsorted `nums` \u2014 values like `3,4,5,6` that follow one another by exactly one \u2014 regardless of where they sit in the array.\n\n" +
            "**Why the naive idea fails.** The literal approach picks each value and asks \u2018how long is the run built on this value?\u2019, re-scanning the array to look for `value+1`, then `value+2`, and so on. Because that inner search restarts from every element, it degrades to `O(n^2)`.\n\n" +
            "Sorting is the natural fix that most people reach for first. It does not meet the problem's stated `O(n)` requirement, but it is genuinely easy to reason about and is often good enough in practice, which is exactly why it is worth knowing as a fallback.\n\n" +
            "**Key Idea.** Once the numbers are in sorted order, every consecutive run appears as a contiguous stretch of neighbours that each differ by exactly one. So a single left-to-right walk can measure all runs at once: extend the current run whenever the next value is one greater, ignore an exact repeat, and reset the run to length 1 whenever a gap larger than one appears.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Return `0` immediately for an empty array \u2014 there is no run to measure.\n" +
            "2. Sort `nums` in place so equal and consecutive values become adjacent.\n" +
            "3. Keep `current` (the length of the run being extended) and `longest` (the best run seen), both seeded at `1` since a non-empty array already contains a run of at least one.\n" +
            "4. Walk from the second element. If it equals its predecessor, `continue` \u2014 a duplicate must not lengthen a run.\n" +
            "5. If it is exactly one greater than its predecessor, increment `current` and refresh `longest` with the larger of the two.\n" +
            "6. Otherwise the gap exceeds one and the run is broken, so reset `current` to `1` \u2014 the current element is itself the start of a fresh run.\n\n" +
            "**Why it works.** After sorting, every maximal set of consecutive integers is a block of adjacent values that step up by one; the walk measures the length of each such block exactly and remembers the maximum. Skipping equal neighbours ensures a value repeated in the input (like the second `2` in `[1,2,2,3]`) does not inflate the count, so the run length reflects distinct consecutive values only.\n\n" +
            "**Common Gotchas.**\n" +
            "- Handle the empty array before seeding `longest = 1`, otherwise you would return `1` for no elements.\n" +
            "- Skip duplicates explicitly; `[1,2,2,3]` still has longest run `3`, not `4`.\n" +
            "- Reset `current` to `1` (not `0`) on a gap, because the value that broke the run is the first member of the next run.\n\n" +
            "**Complexity.** Time `O(n log n)`, dominated by the sort; the scan itself is `O(n)`. Space is `O(1)` auxiliary beyond sorting in place.\n\n" +
            "**Interview mindset.** If the `O(n)` bound were not demanded, sort-then-scan is the solution that is fastest to get provably correct \u2014 offer it as a clean fallback, then explicitly name the sort as the reason it misses the required linear bound, which sets up the hash-set optimization.",
          rcs:
            "from typing import List  # List lets the type hint say we accept a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls longestConsecutive on it.\n\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:  # Return the length of the longest consecutive-integer run.\n\n" +
            "        # ==================== PHASE 1: HANDLE THE EMPTY CASE ====================\n\n" +
            "        if not nums:  # An empty list is falsy in Python, so 'not nums' is True only when there are no elements.\n" +
            "            return 0  # No elements means no run; end the function here.\n" +
            "                      # Execution flow: return exits immediately; nothing below runs.\n" +
            "                      # Why needed: the code past this seeds longest = 1, which would be wrong for an empty input.\n\n" +
            "        # ==================== PHASE 2: SORT SO RUNS BECOME ADJACENT ====================\n\n" +
            "        nums.sort()  # Sort in place; now equal values and consecutive values sit next to each other.\n" +
            "                     # Why: a run of consecutive integers becomes a contiguous block we can measure in one walk.\n" +
            "                     # State change: nums is reordered ascending.\n\n" +
            "        longest = 1  # Best run length seen so far; a non-empty array already contains a run of at least 1.\n" +
            "        current = 1  # Length of the run we are currently extending.\n" +
            "                     # State: both start at 1 because the first element alone is a run of length 1.\n\n" +
            "        # ==================== PHASE 3: WALK AND MEASURE RUNS ====================\n\n" +
            "        for i in range(1, len(nums)):  # Compare each element with its predecessor; start at 1 so nums[i-1] is valid.\n" +
            "                                       # Loop invariant: current is the length of the consecutive run ending at nums[i-1].\n" +
            "                                       # Execution flow: after one i finishes, Python assigns the next i.\n\n" +
            "            if nums[i] == nums[i - 1]:  # Same value as the previous element: a duplicate.\n" +
            "                continue  # Skip it; a repeat must not lengthen the run.\n" +
            "                          # Execution flow: jump straight to the next iteration, leaving current unchanged.\n\n" +
            "            if nums[i] == nums[i - 1] + 1:  # Exactly one greater: the run continues.\n" +
            "                current += 1  # Extend the current run by one.\n" +
            "                              # State change: current grows.\n" +
            "                longest = max(longest, current)  # Keep longest as the best run length seen so far.\n" +
            "                                                 # State change: longest may increase to current.\n\n" +
            "            else:  # Neither equal nor one-greater, so the gap exceeds 1 and the run is broken.\n" +
            "                current = 1  # Restart: nums[i] itself is the first element of a new run.\n" +
            "                             # State change: current resets to 1.\n" +
            "                             # Execution flow: end of iteration; Python returns to the for header.\n\n" +
            "        return longest  # The longest run measured across the whole array.",
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
            "**What it asks.** Return the length of the longest run of consecutive integers in `nums`, achieving `O(n)` time and using no sorting.\n\n" +
            "**Why the naive idea fails.** Extending a run outward from *every* value with repeated membership checks re-walks the same run once per member: for a run of length `L` you would walk `L`, then `L-1`, then `L-2`, and so on, which is quadratic. Sorting would put runs in order but costs `O(n log n)` and so misses the required linear bound.\n\n" +
            "**Key Idea.** The trick is to walk each run only from its *start*. A value `num` is the start of a consecutive run **exactly when `num - 1` is not present** \u2014 if its left neighbour existed, `num` would sit in the middle of a longer run and someone else would count it. So dump every value into a hash set (for `O(1)` presence tests), and only launch an upward walk from values that have no left neighbour. Each value is then touched at most twice across the whole algorithm \u2014 once when the outer loop considers it as a candidate start, and at most once more while some run walks over it \u2014 which is what makes the total work linear.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `num_set = set(nums)`, giving `O(1)` membership checks and collapsing duplicates automatically.\n" +
            "2. Seed `longest = 0` so an empty input naturally returns `0`.\n" +
            "3. Iterate over the *distinct* values in the set.\n" +
            "4. For each `num`, test `num - 1 not in num_set`. If `num - 1` is present, skip `num` \u2014 it is not a run start and will be counted from elsewhere.\n" +
            "5. If `num - 1` is absent, `num` is a run start: set `length = 1` and keep incrementing while `num + length` is in the set, counting how far the run reaches.\n" +
            "6. Update `longest` with the best length found.\n\n" +
            "**Why it works.** Every maximal consecutive run has exactly one value with no predecessor in the set \u2014 its start \u2014 so the guard `num - 1 not in num_set` fires for exactly one member of each run, and that run is therefore measured once and only once. Because the inner `while` loops only ever begin at those starts, and each run's walk visits its own members, the walks summed across all runs touch each value at most once. Combined with the single outer pass, the algorithm is `O(n)` overall despite the nested loop.\n\n" +
            "**Common Gotchas.**\n" +
            "- Iterate the *set* of distinct values, not the original list; iterating the list re-does the walk for every duplicate and can reintroduce quadratic behaviour.\n" +
            "- Initialize `longest` to `0`, not `1`, so the empty input returns `0`.\n" +
            "- Only start walking when `num - 1` is absent; walking from every value is exactly the quadratic trap this method avoids.\n\n" +
            "**Complexity.** Time `O(n)` amortized \u2014 each value is entered by an inner walk at most once. Space `O(n)` for the set.\n\n" +
            "**Interview mindset.** \u2018Longest run of consecutive integers, in `O(n)`, where only which values are *present* matters (not their order)\u2019 is the signal for a hash set plus the \u2018count only from run starts\u2019 trick. The whole insight to verbalize is why the nested loop is still linear.",
          rcs:
            "from typing import List  # List lets the type hint say we accept a list of ints.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls longestConsecutive on it.\n\n" +
            "    def longestConsecutive(self, nums: List[int]) -> int:  # Return the length of the longest consecutive-integer run.\n\n" +
            "        # ==================== PHASE 1: BUILD THE MEMBERSHIP SET ====================\n\n" +
            "        num_set = set(nums)  # Put every value in a hash set for average O(1) 'is this value present?' checks.\n" +
            "                             # Why a set: the whole method rests on constant-time presence tests.\n" +
            "                             # State: duplicates collapse, so num_set holds only distinct values.\n\n" +
            "        longest = 0  # Best run length seen so far; 0 so an empty input returns 0 with no special case.\n" +
            "                     # State: longest only ever increases below.\n\n" +
            "        # ==================== PHASE 2: COUNT EACH RUN FROM ITS START ====================\n\n" +
            "        for num in num_set:  # Consider each DISTINCT value as a possible run start.\n" +
            "                             # Loop invariant: longest holds the longest run among all starts examined before this one.\n" +
            "                             # Execution flow: after one num finishes, Python assigns the next value from the set.\n\n" +
            "            if num - 1 not in num_set:  # num is a run START only if its left neighbour is absent.\n" +
            "                                        # Why: if num - 1 existed, num sits mid-run and gets counted from that run's real start.\n" +
            "                                        # This guard is what keeps the total work O(n) instead of O(n^2).\n\n" +
            "                length = 1  # The run currently holds just num itself.\n" +
            "                            # State: length will grow as we extend upward.\n\n" +
            "                while num + length in num_set:  # Extend the run upward while the next integer is present.\n" +
            "                                                # Loop invariant: num, num+1, ..., num+length-1 are all in the set.\n" +
            "                    length += 1  # One more consecutive value confirmed; grow the run.\n" +
            "                                 # State change: length increases by 1 each pass.\n" +
            "                                 # Execution flow: re-test the while condition with the new length.\n\n" +
            "                longest = max(longest, length)  # Keep the best run length across all starts.\n" +
            "                                                # State change: longest may rise to this run's length.\n" +
            "                                                # Execution flow: end of the if; Python returns to the for header.\n\n" +
            "        return longest  # The length of the longest consecutive run found anywhere.",
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
            "**What it asks.** Design two mirror-image methods: `encode` flattens a list of arbitrary strings into one single string, and `decode` reconstructs the exact original list from that string. The pair must round-trip perfectly \u2014 `decode(encode(x))` must equal `x` for any input.\n\n" +
            "**Why the naive idea fails.** The obvious approach glues the strings together with a separator such as `,` or `#`, then splits on it. But the strings may contain *any* character \u2014 including whatever you picked as the separator. The instant a payload contains `#`, the decoder can no longer tell a structural delimiter from ordinary data, and the split shatters the original strings. There is no \u2018safe\u2019 single character to reserve, because every character is legal payload; that impossibility is the entire difficulty of the problem.\n\n" +
            "**Key Idea.** Stop trying to *find* boundaries and instead *declare* them. Prefix each string with its length and a marker, as `length + '#' + payload` \u2014 so `hello` becomes `5#hello`. Now the decoder never searches inside a payload: it reads digits up to the `#` to learn the length, then consumes *exactly* that many characters as the string. Because the count tells it precisely where the payload ends, the payload's own contents \u2014 even `#`, even digits \u2014 are read purely as data and can never be mistaken for structure. This length-prefix framing is the same technique real network protocols use for exactly this reason.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. **Encode.** For each string `s`, build the frame `str(len(s)) + '#' + s` and collect the frames; join them into one string. An empty list yields the empty string; an empty string yields the frame `0#`.\n" +
            "2. **Decode.** Keep a cursor `i` at the start of the current frame.\n" +
            "3. Advance a second index `j` from `i` until it lands on `#`; the digits in `s[i:j]` are the payload length `n`.\n" +
            "4. The payload starts just after the `#`, at `j + 1`; slice exactly `n` characters from there to recover one original string.\n" +
            "5. Jump the cursor past that payload and repeat until the whole encoded string is consumed.\n\n" +
            "**Why it works.** The length prefix makes every payload *self-describing*: before the decoder reads a single character of content, it already knows exactly how many characters that content occupies. So it never has to guess at or search for a delimiter, which is precisely what made the naive separator fragile. Each frame \u2014 its length digits, its `#`, and its payload \u2014 is scanned a constant number of times, so both directions are linear.\n\n" +
            "**Common Gotchas.**\n" +
            "- The `#` marker (and digits) can appear inside a payload \u2014 that is fine, because decode counts characters and never searches for `#` inside the payload.\n" +
            "- Empty strings must round-trip: they encode as `0#` and decode back to `''`; an empty list encodes to `''` and decodes to `[]`.\n" +
            "- Read the length by scanning digits up to the *first* `#` after the cursor \u2014 that `#` is guaranteed to be the structural one, never a payload character, because the cursor always sits on a length prefix.\n\n" +
            "**Complexity.** Both encode and decode run in `O(N)` where `N` is the total number of characters, since each character is touched a constant number of times. Space is `O(N)` for the produced output.\n\n" +
            "**Interview mindset.** \u2018A separator won't work because the payload can contain it\u2019 is the exact trigger to switch to length-prefixed framing. Say that sentence out loud and the length-prefix design follows immediately.",
          rcs:
            "from typing import List  # List lets the type hints describe a list of strings in and out.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls decode(encode(strs)) to check the round-trip.\n\n" +
            "    # ==================== PHASE 1: ENCODE (LIST -> ONE STRING) ====================\n\n" +
            "    def encode(self, strs: List[str]) -> str:  # Flatten the list into a single, self-describing string.\n\n" +
            "        encoded = []  # Collect each framed string here, then join once at the end.\n" +
            "                      # Why a list + join: repeated string '+' is O(n^2); building a list and joining is O(N).\n" +
            "                      # State: encoded gains one frame per input string.\n\n" +
            "        for s in strs:  # Frame every string in the input list.\n" +
            "                        # Execution flow: after one s finishes, Python assigns the next string.\n\n" +
            "            encoded.append(str(len(s)) + '#' + s)  # Frame = length digits, then '#', then the raw payload.\n" +
            "                                                   # Why: the length lets the decoder consume exactly len(s) chars later.\n" +
            "                                                   # Why safe: even if s contains '#' or digits, decode counts chars and never searches.\n" +
            "                                                   # State change: one frame is appended to encoded.\n\n" +
            "        return ''.join(encoded)  # Concatenate all frames into the single encoded string and return it.\n" +
            "                                 # Execution flow: return ends encode; an empty strs yields '' naturally.\n\n" +
            "    # ==================== PHASE 2: DECODE (ONE STRING -> LIST) ====================\n\n" +
            "    def decode(self, s: str) -> List[str]:  # Rebuild the original list from the encoded string.\n\n" +
            "        result = []  # The reconstructed list of original strings.\n" +
            "                     # State: result gains one string per frame decoded.\n\n" +
            "        i = 0  # Cursor sitting at the start of the current frame (on its first length digit).\n" +
            "               # Loop invariant: i always points at the beginning of an unread frame's length prefix.\n\n" +
            "        while i < len(s):  # Keep decoding frames until the whole encoded string is consumed.\n" +
            "                           # Execution flow: each iteration decodes exactly one original string.\n\n" +
            "            j = i  # Second index used to scan across the length digits.\n" +
            "                   # State: j will advance to the '#' that ends the length.\n\n" +
            "            while s[j] != '#':  # Walk j forward over the digits until the structural '#'.\n" +
            "                                # Why safe: i sits on a length prefix, so the first '#' found is the delimiter, not payload.\n" +
            "                j += 1  # Move past one digit character.\n" +
            "                        # State change: j increases until s[j] == '#'.\n\n" +
            "            length = int(s[i:j])  # The digits from i up to (not including) j give this payload's length.\n" +
            "                                  # State: length is how many characters the next string occupies.\n\n" +
            "            start = j + 1  # The payload begins immediately after the '#'.\n" +
            "                           # State: start indexes the first payload character.\n\n" +
            "            result.append(s[start:start + length])  # Take EXACTLY length chars as one original string.\n" +
            "                                                    # Why safe: slicing by count treats '#'/digits inside as plain data.\n" +
            "                                                    # State change: one recovered string is appended to result.\n\n" +
            "            i = start + length  # Jump the cursor past this payload to the next frame's length prefix.\n" +
            "                                # State change: i advances to the start of the next frame (or to len(s) to stop).\n" +
            "                                # Execution flow: back to the while header; loop ends when i reaches len(s).\n\n" +
            "        return result  # All frames consumed; return the fully reconstructed list.",
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
            "**What it asks.** You are given two strings s and t and must decide whether t is an anagram of s - that is, whether t is exactly s with its characters shuffled into a different order. Same letters, the same number of each, only the arrangement differs.\n\n" +
            "**Why the naive idea fails.** Comparing the strings position by position does not work at all: anagrams are defined by reordering, so 'anagram' and 'nagaram' disagree at almost every index yet are perfectly valid anagrams. Position carries no information here - only the multiset of characters (which letters, and how many of each) matters.\n\n" +
            "**Key Idea.** Two strings are anagrams if and only if their sorted forms are identical. Sorting is a canonicalization: it discards the original order and lays the characters out in one fixed sequence. Any two strings built from the same multiset of characters therefore sort to exactly the same string, and strings with different multisets cannot.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the two lengths differ, return false right away - different lengths guarantee different multisets, and this avoids sorting entirely.\n" +
            "2. Sort the characters of s and, separately, the characters of t.\n" +
            "3. Return whether the two sorted sequences are equal.\n\n" +
            "**Why it works.** Sorting maps every string to a canonical representative of its multiset. Equal multisets produce byte-for-byte identical sorted sequences, and unequal multisets must differ in at least one position after sorting. So equality of the sorted forms is exactly equality of the character multisets, which is the definition of an anagram.\n\n" +
            "**Common Gotchas.**\n" +
            "- Check the lengths first; it is a cheap, correct early reject and spares you sorting when the answer is already no.\n" +
            "- Sorting costs O(n log n) - more than the counting approach - so present it as the simple-but-slower option.\n" +
            "- The comparison is between the sorted CHARACTERS, not the untouched original strings.\n\n" +
            "**Complexity.** Sorting dominates at O(n log n) time; the two sorted copies take O(n) space.\n\n" +
            "**Interview mindset.** Reach for this as the one-line answer you can write without thinking, then immediately offer the O(n) frequency-count version as the optimization - naming the trade-off is what the interviewer wants to hear.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls isAnagram on the object.\n\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:  # Return True iff t is a reordering of the same characters as s.\n\n" +
            "        # ==================== PHASE 1: FAST LENGTH REJECT ====================\n\n" +
            "        if len(s) != len(t):  # Anagrams must use the exact same number of characters.\n" +
            "                              # Why: two strings with different character counts can never be reorderings of each other.\n" +
            "                              # Execution flow: when the lengths differ, control drops into the return False just below.\n" +
            "            return False  # Different lengths => definitely not an anagram; end the function now.\n" +
            "                          # Execution flow: this return exits isAnagram immediately; nothing after it runs on this path.\n\n" +
            "        # ==================== PHASE 2: COMPARE SORTED FORMS ====================\n\n" +
            "        return sorted(s) == sorted(t)  # Sort each string, then compare: equal multisets produce identical sorted lists.\n" +
            "                                       # Why: sorted() sends every anagram of a string to the SAME character sequence (its canonical form).\n" +
            "                                       # State: sorted(s) and sorted(t) are lists of characters compared element by element.\n" +
            "                                       # Execution flow: the boolean result is handed straight back to the caller.",
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
            "**What it asks.** Same question as before: is t a reordering of s, using the same characters with the same frequencies?\n\n" +
            "**Why the naive idea fails, and how this beats sorting.** Sorting both strings is correct but spends O(n log n) arranging characters we never actually need in order - we only care HOW MANY of each character there are. Counting extracts exactly that information in a single linear pass, replacing the log-n sorting factor with plain O(n) work.\n\n" +
            "**Key Idea.** Build a frequency map (character -> count) for each string. That map IS the character multiset. Two strings are anagrams if and only if their frequency maps are equal, and Python's Counter both builds the map in O(n) and compares two maps with a single ==.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If the lengths differ, return false - a fast reject before any counting.\n" +
            "2. Build Counter(s): a map from each character of s to how many times it occurs.\n" +
            "3. Build Counter(t) the same way.\n" +
            "4. Return whether the two counters are equal.\n\n" +
            "**Why it works.** A Counter records precisely the multiset of characters: which letters appear and with what multiplicity. Anagrams are defined as having identical multisets, so the two Counters are equal exactly when t is an anagram of s. Equality checks every character's count, so a mismatch anywhere makes the result false.\n\n" +
            "**Common Gotchas.**\n" +
            "- Keep the length check as a cheap early exit (Counter equality would also catch it, but the guard is essentially free).\n" +
            "- For a bounded lowercase alphabet you can swap the Counter for a fixed 26-slot array; for Unicode, keep the hash map because the alphabet is unbounded.\n" +
            "- Count once per string and compare the maps; do not hand-roll a per-character comparison loop.\n\n" +
            "**Complexity.** Time O(n) to build and compare the maps; space O(1) for a fixed lowercase alphabet (at most 26 keys), or O(k) for a general alphabet of size k.\n\n" +
            "**Interview mindset.** 'Compare character frequencies' is the trigger phrase - whenever the alphabet is bounded, counting beats sorting, and saying so out loud is exactly what the interviewer is listening for.",
          rcs:
            "from collections import Counter  # Counter builds a character -> frequency map; comparing two Counters compares those maps.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls isAnagram on the object.\n\n" +
            "    def isAnagram(self, s: str, t: str) -> bool:  # Return True iff s and t hold the same characters with the same frequencies.\n\n" +
            "        # ==================== PHASE 1: FAST LENGTH REJECT ====================\n\n" +
            "        if len(s) != len(t):  # Different lengths can never be anagrams, so reject before counting.\n" +
            "                              # Why: equal multisets force equal totals, so a length mismatch makes the rest of the work pointless.\n" +
            "            return False  # Bail out immediately on a length mismatch.\n" +
            "                          # Execution flow: this return exits the function; the counting below never runs on this path.\n\n" +
            "        # ==================== PHASE 2: COMPARE FREQUENCY MAPS ====================\n\n" +
            "        return Counter(s) == Counter(t)  # Tally both strings, then compare the two character -> count maps for equality.\n" +
            "                                         # Why a Counter: it IS the character multiset; two strings are anagrams exactly when their multisets match.\n" +
            "                                         # State: Counter(s) maps each char to its count in s; Counter(t) does the same for t.\n" +
            "                                         # Execution flow: dict-style equality is True iff every char has the same count in both, which is the answer.",
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
            "**What it asks.** Given a list of strings, partition them into groups where every string in a group is an anagram of the others. The groups, and the order of words within them, may be returned in any order.\n\n" +
            "**Why the naive idea fails.** The literal approach compares every pair of strings and asks 'are these two anagrams?', which is O(n^2) pairs times the per-comparison cost - hopelessly slow for up to 10^4 strings. Worse, pairwise matching does not naturally yield clean disjoint groups; you would need extra union-find-style bookkeeping to stitch the matches together.\n\n" +
            "**Key Idea.** Give each string a canonical signature: a value that is identical for all anagrams and different for everything else. Then a single hash map keyed by that signature buckets the strings in one pass. Sorting a word's letters is the simplest such signature - 'eat', 'tea', and 'ate' all sort to 'aet', so they collide in the same bucket while non-anagrams land elsewhere.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create a dict mapping signature -> list of words, using defaultdict(list) so new keys auto-create an empty list.\n" +
            "2. For each word, compute key = ''.join(sorted(word)).\n" +
            "3. Append the ORIGINAL word (not the sorted key) to groups[key].\n" +
            "4. Return the dict's values - the buckets are exactly the anagram groups.\n\n" +
            "**Why it works.** Two words are anagrams if and only if they consist of the same multiset of letters, which holds if and only if their sorted letter sequences are identical. So the sorted key induces precisely the anagram equivalence relation, and grouping by equal keys partitions the input exactly into anagram classes.\n\n" +
            "**Common Gotchas.**\n" +
            "- Store the original word in each bucket, not its sorted form - the answer must contain the real words.\n" +
            "- Use defaultdict(list) (or setdefault) so you never have to test whether a key already exists.\n" +
            "- The empty string is a valid word; it sorts to '' and simply forms its own bucket.\n\n" +
            "**Complexity.** For n words of length up to k, sorting each is O(k log k), so time is O(n * k log k); space is O(n * k) to hold all the words and keys.\n\n" +
            "**Interview mindset.** 'Group items that are equivalent under some transformation' is the canonical cue to hash by a canonical form of each item - here, the sorted string.",
          rcs:
            "from collections import defaultdict  # defaultdict(list) auto-creates an empty list the first time a new key is used.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls groupAnagrams on the object.\n\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:  # Return the input words bucketed into anagram groups (any order is fine).\n\n" +
            "        # ==================== PHASE 1: PREPARE THE BUCKETS ====================\n\n" +
            "        groups = defaultdict(list)  # Map a canonical key -> the list of original words that share it.\n" +
            "                                    # Why defaultdict(list): the first append to a missing key auto-creates an empty list, so no key-exists check.\n" +
            "                                    # State: groups starts empty and gains one bucket per distinct anagram class.\n\n" +
            "        # ==================== PHASE 2: BUCKET EACH WORD BY ITS SORTED KEY ====================\n\n" +
            "        for word in strs:  # Walk every input word once.\n" +
            "                           # Loop invariant: groups holds the correct buckets for all words processed before this one.\n" +
            "                           # Execution flow: after one word finishes, Python assigns the next word.\n\n" +
            "            key = ''.join(sorted(word))  # Canonical signature: sort the letters so all anagrams collapse to one key.\n" +
            "                                         # Why: 'eat', 'tea', and 'ate' all sort to 'aet', so anagrams share an identical key and non-anagrams do not.\n" +
            "                                         # State: key is the sorted-letters string for this word.\n\n" +
            "            groups[key].append(word)  # Drop the ORIGINAL word into the bucket named by its sorted key.\n" +
            "                                      # Why the original, not the key: the answer must contain the real words, not their sorted forms.\n" +
            "                                      # State change: groups[key] grows by one word (the list is auto-created on first use).\n" +
            "                                      # Execution flow: end of iteration; Python returns to the for header for the next word.\n\n" +
            "        # ==================== PHASE 3: RETURN THE GROUPS ====================\n\n" +
            "        return list(groups.values())  # Hand back just the buckets (the lists of words); the keys were internal bookkeeping.\n" +
            "                                      # Why values(): the caller wants the groups themselves, in any order.\n" +
            "                                      # Execution flow: the list of word-lists is returned and the function ends.",
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
            "**What it asks.** Same task - bucket the strings into anagram groups - but now aiming to avoid the per-word sort so the signature is cheaper to build.\n\n" +
            "**Why the naive idea fails, and how this improves on the sorted key.** The sorted-key solution is already correct, but sorting each word costs O(k log k). Since the alphabet is a fixed 26 lowercase letters, we can describe a word's multiset directly as a vector of 26 counts, which is built in O(k) - dropping the log-k factor while keeping the exact same grouping behavior.\n\n" +
            "**Key Idea.** Represent each word by a length-26 count vector: count[i] is how many times the i-th letter appears. Anagrams have identical letter counts, so they produce identical vectors; non-anagrams differ in at least one slot. A tuple of that vector is hashable, so it can serve directly as the dictionary key.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create a dict mapping signature -> list of words (defaultdict(list)).\n" +
            "2. For each word, build count = [0] * 26 and, for each character c, increment count[ord(c) - ord('a')].\n" +
            "3. Convert the list to a tuple (lists are unhashable) and use it as the key, appending the original word.\n" +
            "4. Return the dict's values.\n\n" +
            "**Why it works.** The 26-slot count vector IS the multiset of characters, and an anagram class is by definition a set of strings sharing one multiset. Identical vectors therefore correspond exactly to anagrams, so grouping by the tuple key reproduces the anagram partition - the same result as the sorted key, computed faster.\n\n" +
            "**Common Gotchas.**\n" +
            "- The key must be hashable: convert the count list to a tuple before using it as a dict key.\n" +
            "- ord(c) - ord('a') assumes lowercase a-z; widen the array (or switch to a hash-map count) for other alphabets.\n" +
            "- Still append the original word, never the count vector.\n\n" +
            "**Complexity.** Building each vector is O(k) and there are n words, so time is O(n * k); space is O(n * k) for the stored words and keys.\n\n" +
            "**Interview mindset.** When the canonical key must be cheap and the alphabet is bounded, counting beats sorting - the same insight as in Valid Anagram, here applied to build a hash key rather than a direct comparison.",
          rcs:
            "from collections import defaultdict  # defaultdict(list) auto-creates an empty list the first time a new key is used.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls groupAnagrams on the object.\n\n" +
            "    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:  # Return the words bucketed into anagram groups using a count-based key.\n\n" +
            "        # ==================== PHASE 1: PREPARE THE BUCKETS ====================\n\n" +
            "        groups = defaultdict(list)  # Map a canonical count-signature -> the list of words that share it.\n" +
            "                                    # Why defaultdict(list): appending to a missing key auto-creates its list, avoiding a key-exists check.\n" +
            "                                    # State: groups starts empty and grows one bucket per anagram class.\n\n" +
            "        # ==================== PHASE 2: BUILD EACH WORD'S 26-SLOT COUNT SIGNATURE ====================\n\n" +
            "        for word in strs:  # Process each input word once.\n" +
            "                           # Loop invariant: groups holds correct buckets for every word handled before this one.\n" +
            "                           # Execution flow: after one word finishes, Python moves to the next word.\n\n" +
            "            count = [0] * 26  # One counter slot per letter a..z, all starting at zero.\n" +
            "                              # Why 26: the alphabet is lowercase a-z, so 26 fixed slots capture the whole multiset.\n" +
            "                              # State: count[i] will hold how many times the letter at index i appears in word.\n\n" +
            "            for c in word:  # Scan each character of the word to tally it.\n" +
            "                            # Execution flow: after one c finishes, Python assigns the next char; when the word ends, control leaves this inner loop.\n\n" +
            "                count[ord(c) - ord('a')] += 1  # Convert the letter to an index 0..25 and increment that slot.\n" +
            "                                               # Why ord(c) - ord('a'): it maps 'a'->0 through 'z'->25, giving each letter its own slot.\n" +
            "                                               # State change: the counter for character c goes up by one.\n" +
            "                                               # Execution flow: back to the inner for header for the next character.\n\n" +
            "            groups[tuple(count)].append(word)  # Use the counts as a hashable key and file the original word under it.\n" +
            "                                               # Why tuple(count): a list is unhashable and cannot be a dict key; a tuple of the same numbers can.\n" +
            "                                               # Why anagrams collide: identical letter counts produce identical tuples, so anagrams land in one bucket.\n" +
            "                                               # State change: the bucket for this signature gains word.\n" +
            "                                               # Execution flow: end of the outer iteration; Python returns to the outer for header.\n\n" +
            "        # ==================== PHASE 3: RETURN THE GROUPS ====================\n\n" +
            "        return list(groups.values())  # Return the buckets themselves (lists of words); the keys were only for grouping.\n" +
            "                                      # Execution flow: the list of word-lists is returned and the function ends.",
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
            "**What it asks.** Given a 9x9 board that is partially filled (empty cells marked '.'), decide whether the digits already placed are legal: no digit repeats within any single row, any single column, or any of the nine 3x3 sub-boxes. You are validating the current state only - not solving the puzzle, and not checking that it can be completed.\n\n" +
            "**Why the naive idea fails.** You can validate each of the 9 rows, then each of the 9 columns, then each of the 9 boxes in three separate sweeps, which is correct but re-reads the board three times and duplicates the same logic. A single pass that updates all three kinds of constraint at once is cleaner and touches each cell exactly once.\n\n" +
            "**Key Idea.** Keep one set of seen digits per row, one per column, and one per box - nine of each. The only non-obvious part is naming the box: the cell at (r, c) lives in box (r // 3, c // 3), because integer-dividing the row and column indices by 3 collapses 0-2 to 0, 3-5 to 1, and 6-8 to 2, giving a 3x3 grid of box coordinates. As you scan, a digit is a violation the instant it already appears in its row set, its column set, or its box set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create rows, cols, and boxes as dictionaries of sets (defaultdict(set)).\n" +
            "2. Scan every cell (r, c). If it holds '.', skip it - empty cells constrain nothing.\n" +
            "3. Compute the box key b = (r // 3, c // 3).\n" +
            "4. If the digit is already in rows[r], cols[c], or boxes[b], return false - a duplicate exists in that unit.\n" +
            "5. Otherwise add the digit to all three sets and continue.\n" +
            "6. If the whole scan finishes with no conflict, return true.\n\n" +
            "**Why it works.** Each set holds exactly the digits seen so far in its unit, so a membership hit is precisely a repeated digit within that row, column, or box - the exact conditions the rules forbid. Because every cell belongs to exactly one row, one column, and one box, updating all three sets per cell checks all three constraint families in a single pass. Skipping '.' ensures empty cells never create a false conflict.\n\n" +
            "**Common Gotchas.**\n" +
            "- Skip the '.' cells; counting them would immediately and wrongly report duplicates.\n" +
            "- The box key is (r // 3, c // 3) - a pair - not r // 3 + c // 3, which would merge distinct boxes (for instance (0,3) and (3,0) both give 1).\n" +
            "- Add the digit to all THREE sets, not just the one that happened to be checked first.\n" +
            "- Check membership BEFORE inserting, or every digit would appear to duplicate itself.\n\n" +
            "**Complexity.** The board is a fixed 9x9, so there are always 81 cells and constant-size sets: O(1) time and O(1) space. (For a general n x n variant it would be O(n^2).)\n\n" +
            "**Interview mindset.** 'No duplicates within each of several overlapping groups' is the signal for one set per group plus a single check-then-insert scan - the box-index formula (r // 3, c // 3) is the one detail worth memorizing.",
          rcs:
            "from collections import defaultdict  # defaultdict(set) hands back a fresh empty set the first time each row/col/box index is used.\n\n\n" +
            "class Solution:  # LeetCode instantiates this class and calls isValidSudoku on the object.\n\n" +
            "    def isValidSudoku(self, board: List[List[str]]) -> bool:  # Return True iff no filled digit repeats within any row, column, or 3x3 box.\n\n" +
            "        # ==================== PHASE 1: PREPARE THE THREE FAMILIES OF SETS ====================\n\n" +
            "        rows = defaultdict(set)  # For each row index r, the set of digits already placed in that row.\n" +
            "                                 # Why a set: 'is this digit already here?' is an average O(1) membership test.\n" +
            "        cols = defaultdict(set)  # For each column index c, the set of digits already placed in that column.\n" +
            "        boxes = defaultdict(set)  # For each box key, the set of digits already placed in that 3x3 box.\n" +
            "                                  # State: all three start empty and gain digits as the scan proceeds.\n\n" +
            "        # ==================== PHASE 2: SCAN EVERY CELL ONCE ====================\n\n" +
            "        for r in range(9):  # Walk the 9 rows top to bottom.\n" +
            "                            # Execution flow: after a row finishes, Python advances r to the next row.\n\n" +
            "            for c in range(9):  # Walk the 9 columns of the current row left to right.\n" +
            "                                # Loop invariant: rows/cols/boxes hold exactly the digits of all cells visited before (r, c).\n" +
            "                                # Execution flow: after one c finishes, Python advances to the next column.\n\n" +
            "                d = board[r][c]  # The character in this cell: a digit '1'-'9', or '.' for empty.\n" +
            "                                 # State: d is the value we are about to validate.\n\n" +
            "                if d == '.':  # Empty cells impose no constraint.\n" +
            "                    continue  # Skip this cell and move to the next column.\n" +
            "                              # Execution flow: jump straight to the next inner-loop iteration, touching none of the sets.\n\n" +
            "                b = (r // 3, c // 3)  # Identify which 3x3 box the cell sits in.\n" +
            "                                      # Why r // 3, c // 3: integer division maps 0-2 -> 0, 3-5 -> 1, 6-8 -> 2, so (0..2, 0..2) names the nine boxes.\n" +
            "                                      # State: b is the box key used to index boxes.\n\n" +
            "                if d in rows[r] or d in cols[c] or d in boxes[b]:  # Has this digit already appeared in this row, column, or box?\n" +
            "                                                                   # Why: a repeat in ANY of the three units violates Sudoku's rules.\n" +
            "                                                                   # Execution flow: if any check is true, control drops into the return False below.\n" +
            "                    return False  # A duplicate was found, so the board is invalid; end now.\n" +
            "                                  # Execution flow: this return exits the function immediately; no further cells are scanned.\n\n" +
            "                rows[r].add(d)  # No conflict: record the digit as now present in its row.\n" +
            "                                # State change: rows[r] gains d.\n" +
            "                cols[c].add(d)  # Record it as present in its column.\n" +
            "                                # State change: cols[c] gains d.\n" +
            "                boxes[b].add(d)  # Record it as present in its 3x3 box.\n" +
            "                                 # State change: boxes[b] gains d.\n" +
            "                                 # Execution flow: end of this cell; Python continues to the next column.\n\n" +
            "        # ==================== PHASE 3: EVERY CELL PASSED ====================\n\n" +
            "        return True  # Every filled cell was unique within its row, column, and box.\n" +
            "                     # Execution flow: the scan completed with no conflict, so the board is valid.",
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
    },
    {
      "id": "range-sum-query-immutable",
      "lc": 303,
      "title": "Range Sum Query - Immutable",
      "difficulty": "Easy",
      "category": "Arrays & Hashing",
      "link": "https://leetcode.com/problems/range-sum-query-immutable/",
      "meta": {
        "pattern": "Prefix Sums",
        "dataStructure": "Prefix-sum array",
        "technique": "Preprocessing"
      },
      "description": "Given an integer array `nums`, design a data structure that answers many **range-sum queries**. Each query gives two indices `left` and `right` and asks for the sum `nums[left] + nums[left+1] + ... + nums[right]` (inclusive).\n\nThe array never changes after construction (it is *immutable*), and `sumRange` may be called many times — so the work should go into **preprocessing once**, making each query cheap.",
      "constraints": [
        "`1 <= nums.length <= 10^4`",
        "`-10^5 <= nums[i] <= 10^5`",
        "`0 <= left <= right < nums.length`",
        "Up to `10^4` calls to `sumRange`."
      ],
      "notes": [
        "The range is **inclusive** of both `left` and `right`.",
        "Because the array is immutable, you can precompute everything in the constructor."
      ],
      "examples": [
        {
          "input": "NumArray([-2, 0, 3, -5, 2, -1]); sumRange(0, 2)",
          "output": "1",
          "reasoning": "-2 + 0 + 3 = 1."
        },
        {
          "input": "sumRange(2, 5)",
          "output": "-1",
          "reasoning": "3 + (-5) + 2 + (-1) = -1."
        },
        {
          "input": "sumRange(0, 5)",
          "output": "-3",
          "reasoning": "The sum of the whole array.",
          "visual": "```\nindex :   0   1   2   3   4   5\nvalue :  -2   0   3  -5   2  -1\nprefix: 0  -2  -2   1  -4  -2  -3   <- prefix[i] = sum of first i values\nsumRange(2,5) = prefix[6] - prefix[2] = -3 - (-2) = -1\n```"
        }
      ],
      "approaches": [
        {
          "name": "Brute Force — sum per query",
          "time": "O(n) per query",
          "space": "O(1)",
          "whenToUse": "Fine if sumRange is called only a handful of times; the baseline you mention before preprocessing.",
          "logic": "**What it asks.** Answer repeated inclusive range-sum queries on a fixed array.\n\n**Why the naive idea is slow.** The direct approach stores the array and, on each `sumRange(i, j)`, loops from `i` to `j` adding values. One query is `O(n)`; with up to `10^4` queries on a length-`10^4` array that is `~10^8` additions, and all of it is re-done work — the same prefixes are summed again and again.\n\n**Key Idea.** Correct but wasteful: it does no preprocessing, so every query pays full price.\n\n**Step-by-Step Approach.**\n1. Store a reference to `nums` in the constructor.\n2. On each query, slice `nums[i..j]` and return its sum.\n\n**Complexity.** Construction `O(1)`; each query `O(n)`; space `O(1)` beyond the input.\n\n**Interview mindset.** State this first, then note that *the array never changes* — a strong hint that preprocessing can make queries `O(1)`.",
          "rcs": "from typing import List  # Type hints: the constructor takes a list of ints.\n\n\nclass NumArray:  # LeetCode constructs this once, then calls sumRange many times.\n\n    def __init__(self, nums: List[int]):  # Preprocessing step (here: just keep the array).\n        self.nums = nums  # Keep a reference so sumRange can read the values later.\n\n    def sumRange(self, left: int, right: int) -> int:  # Inclusive sum over [left, right].\n        # Slice copies the inclusive window [left .. right] and sum() adds it up.\n        # This re-scans the window on EVERY call -> O(n) per query.\n        return sum(self.nums[left:right + 1])",
          "plain": "from typing import List\n\n\nclass NumArray:\n    def __init__(self, nums: List[int]):\n        self.nums = nums\n\n    def sumRange(self, left: int, right: int) -> int:\n        return sum(self.nums[left:right + 1])"
        },
        {
          "name": "Optimized — Prefix Sums",
          "time": "O(n) build, O(1) per query",
          "space": "O(n)",
          "whenToUse": "The standard answer: many queries on an immutable array. Preprocess once, answer each query with one subtraction.",
          "logic": "**What it asks.** Same inclusive range-sum queries, but now we exploit that the array is fixed.\n\n**Key Idea — prefix sums.** Build an array `prefix` where `prefix[i]` is the sum of the first `i` elements (`nums[0] + ... + nums[i-1]`), with `prefix[0] = 0`. Then the sum of any range `[left, right]` is just the difference of two prefixes:\n\n`sumRange(left, right) = prefix[right + 1] - prefix[left]`\n\nIntuitively, `prefix[right+1]` is the total up to and including `right`, and subtracting `prefix[left]` removes everything before `left` — leaving exactly the window we want.\n\n**Why the `+1` / leading zero.** Prepending a `0` (so `prefix` has length `n + 1`) makes the formula uniform: it works even when `left == 0`, with no special case, because `prefix[0] = 0` represents the empty prefix.\n\n**Step-by-Step Approach.**\n1. In the constructor, allocate `prefix = [0]` and walk `nums`, appending the running total each step.\n2. For a query, return `prefix[right + 1] - prefix[left]`.\n\n**Why it works.** `prefix[j] - prefix[i]` telescopes to `nums[i] + ... + nums[j-1]`; substituting `j = right + 1` and `i = left` gives the inclusive window.\n\n**Common Gotchas.**\n- Index the prefix array with `right + 1`, not `right` — off-by-one here is the classic bug.\n- The leading `0` is what removes the `left == 0` special case; don't drop it.\n\n**Complexity.** Building `prefix` is `O(n)` once; every query is a single subtraction, `O(1)`; the prefix array costs `O(n)` space.\n\n**Interview mindset.** 'Subarray sum' + 'repeated queries' + 'immutable' is the textbook prefix-sum signal.",
          "rcs": "from typing import List  # Type hints for the constructor's list argument.\n\n\nclass NumArray:\n\n    def __init__(self, nums: List[int]):  # Preprocess: build the prefix-sum array ONCE.\n        self.prefix = [0]  # prefix[0] = 0 represents the empty prefix (sum of zero elements).\n        for x in nums:  # Walk the array left to right.\n            self.prefix.append(self.prefix[-1] + x)  # Running total: prefix[i+1] = prefix[i] + nums[i].\n        # Now prefix[i] holds the sum of the first i elements (nums[0..i-1]).\n\n    def sumRange(self, left: int, right: int) -> int:  # Answer one inclusive query in O(1).\n        # Total up to and INCLUDING 'right' is prefix[right + 1];\n        # subtract everything before 'left' (prefix[left]) to isolate the window.\n        return self.prefix[right + 1] - self.prefix[left]",
          "plain": "from typing import List\n\n\nclass NumArray:\n    def __init__(self, nums: List[int]):\n        self.prefix = [0]\n        for x in nums:\n            self.prefix.append(self.prefix[-1] + x)\n\n    def sumRange(self, left: int, right: int) -> int:\n        return self.prefix[right + 1] - self.prefix[left]"
        }
      ],
      "patternRecognition": [
        "Repeated range-sum / subarray-sum queries on a fixed array -> prefix sums.",
        "A leading 0 in the prefix array removes the left==0 edge case.",
        "Trade O(n) preprocessing + O(n) space for O(1) queries."
      ],
      "interviewRecall": [
        "prefix[i] = sum of first i elements, prefix[0] = 0.",
        "sumRange(l, r) = prefix[r + 1] - prefix[l].",
        "Build once in the constructor; each query is one subtraction."
      ]
    },
    {
      "id": "subarray-sum-equals-k",
      "lc": 560,
      "title": "Subarray Sum Equals K",
      "difficulty": "Medium",
      "category": "Arrays & Hashing",
      "link": "https://leetcode.com/problems/subarray-sum-equals-k/",
      "meta": {
        "pattern": "Prefix Sums + Hash Map",
        "dataStructure": "Hash Map",
        "technique": "Running prefix + complement"
      },
      "description": "Given an integer array `nums` and an integer `k`, return the **total number of contiguous subarrays** whose elements sum to exactly `k`.\n\nThe array may contain negative numbers, so a sliding window does **not** work here — shrinking/growing a window can't rely on the sum being monotonic.",
      "constraints": [
        "`1 <= nums.length <= 2 * 10^4`",
        "`-1000 <= nums[i] <= 1000`",
        "`-10^7 <= k <= 10^7`"
      ],
      "notes": [
        "Count subarrays, not elements — overlapping subarrays each count.",
        "Negatives rule out the two-pointer sliding window; reach for prefix sums instead."
      ],
      "examples": [
        {
          "input": "nums = [1, 1, 1], k = 2",
          "output": "2",
          "reasoning": "The subarrays [1,1] at indices (0,1) and (1,2) both sum to 2."
        },
        {
          "input": "nums = [1, 2, 3], k = 3",
          "output": "2",
          "reasoning": "[1,2] and [3] each sum to 3."
        },
        {
          "input": "nums = [1, 2, -1, 1, 2], k = 3",
          "output": "3",
          "reasoning": "[1,2], [2,-1,1,2] ... counting all contiguous runs that total 3.",
          "visual": "```\nrunning prefix sums (with leading 0):\n0  1  3  2  3  5\n      ↑     ↑\nfor each prefix p, how many earlier prefixes equal p - k?\nthat count is the number of subarrays ending here that sum to k\n```"
        }
      ],
      "approaches": [
        {
          "name": "Brute Force — prefix sums, all pairs",
          "time": "O(n^2)",
          "space": "O(n)",
          "whenToUse": "A clear stepping stone: shows the prefix-sum formula before the hash-map leap.",
          "logic": "**What it asks.** Count contiguous subarrays summing to `k`.\n\n**Why the most naive idea is slow.** Trying every subarray and re-summing it is `O(n^3)`. A first improvement uses prefix sums so a subarray's sum is a subtraction: with `prefix[0] = 0` and `prefix[i]` the sum of the first `i` elements, the sum of `nums[i..j-1]` is `prefix[j] - prefix[i]`.\n\n**Step-by-Step Approach.**\n1. Build the prefix-sum array with a leading `0`.\n2. For every pair `i < j`, check whether `prefix[j] - prefix[i] == k`; count the hits.\n\n**Why it works.** Every contiguous subarray corresponds to exactly one prefix pair `(i, j)`, so checking all pairs counts each once.\n\n**Complexity.** The double loop is `O(n^2)`; the prefix array is `O(n)` space.\n\n**Interview mindset.** Notice we scan backward for 'how many earlier prefixes equal `prefix[j] - k`' — that count is exactly what a hash map can give in `O(1)`.",
          "rcs": "from typing import List  # Type hint for the nums argument.\n\n\nclass Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        n = len(nums)\n        count = 0  # Number of subarrays found so far.\n        prefix = [0]  # prefix[0] = 0 handles subarrays starting at index 0.\n        for x in nums:  # Build running totals.\n            prefix.append(prefix[-1] + x)\n        # Every subarray = a pair of prefix indices (i, j) with i < j.\n        for j in range(1, n + 1):  # Right boundary (exclusive end).\n            for i in range(0, j):  # Left boundary.\n                if prefix[j] - prefix[i] == k:  # Window sum equals k?\n                    count += 1  # Count this subarray.\n        return count",
          "plain": "from typing import List\n\n\nclass Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        n = len(nums)\n        count = 0\n        prefix = [0]\n        for x in nums:\n            prefix.append(prefix[-1] + x)\n        for j in range(1, n + 1):\n            for i in range(0, j):\n                if prefix[j] - prefix[i] == k:\n                    count += 1\n        return count"
        },
        {
          "name": "Optimized — Running prefix + Hash Map",
          "time": "O(n)",
          "space": "O(n)",
          "whenToUse": "The intended solution; works with negatives where sliding windows fail.",
          "logic": "**Key Idea.** Rearrange the formula. For a subarray ending at the current position with running prefix sum `curr`, it sums to `k` exactly when some earlier prefix equalled `curr - k` (because `curr - earlier = k`). So instead of searching, we **remember how often each prefix sum has occurred** in a hash map and look up `curr - k` in `O(1)`.\n\n**Why a frequency map, not a set.** The same prefix sum can occur multiple times (especially with negatives/zeros), and *each* occurrence starts a distinct valid subarray — so we add the **count**, not just +1.\n\n**The seed `{0: 1}`.** Initializing the map with prefix sum `0` seen once accounts for subarrays that start at index 0 (where `curr` itself equals `k`, so `curr - k == 0`).\n\n**Step-by-Step Approach.**\n1. `count = 0`, `curr = 0`, `seen = {0: 1}`.\n2. For each `num`: add it to `curr`; add `seen.get(curr - k, 0)` to `count`; then increment `seen[curr]`.\n3. Return `count`.\n\n**Why it works.** When we reach index `j`, `seen` holds the frequencies of all prefix sums for indices `< j`. Every earlier prefix equal to `curr - k` marks a subarray `(i, j]` summing to `k`, so adding its frequency counts them all at once.\n\n**Common Gotchas.**\n- Seed the map with `{0: 1}`, or you miss subarrays beginning at index 0.\n- Look up `curr - k` **before** inserting `curr`, so a zero-length match can't be counted.\n- Store frequencies, not a boolean set.\n\n**Complexity.** One pass with `O(1)` map operations is `O(n)` time; the map holds up to `n` distinct prefixes, `O(n)` space.\n\n**Interview mindset.** This is the same 'complement in a hash map' trick as Two Sum, applied to prefix sums.",
          "rcs": "from typing import List  # Type hint for nums.\n\n\nclass Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        count = 0  # Total subarrays summing to k.\n        curr = 0  # Running prefix sum up to the current index.\n        seen = {0: 1}  # prefix-sum -> frequency; seed 0 handles subarrays starting at index 0.\n        for num in nums:  # Single left-to-right pass.\n            curr += num  # Extend the prefix sum to include this element.\n            # Any earlier prefix equal to (curr - k) begins a subarray ending here that sums to k.\n            count += seen.get(curr - k, 0)  # Add ALL such occurrences at once.\n            # Record this prefix sum (increment its frequency) for future lookups.\n            seen[curr] = seen.get(curr, 0) + 1\n        return count",
          "plain": "from typing import List\n\n\nclass Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        count = 0\n        curr = 0\n        seen = {0: 1}\n        for num in nums:\n            curr += num\n            count += seen.get(curr - k, 0)\n            seen[curr] = seen.get(curr, 0) + 1\n        return count"
        }
      ],
      "patternRecognition": [
        "'Number of subarrays that sum to k' with possible negatives -> prefix sum + hash map.",
        "curr - k in the map is the Two Sum complement idea applied to prefixes.",
        "Store frequencies because a prefix sum can repeat."
      ],
      "interviewRecall": [
        "Seed seen = {0: 1}.",
        "Per element: curr += num; count += seen.get(curr - k, 0); seen[curr] += 1.",
        "Negatives break sliding windows -> that's why prefix sums are needed."
      ]
    },
    {
      "id": "sort-an-array",
      "lc": 912,
      "title": "Sort an Array",
      "difficulty": "Medium",
      "category": "Arrays & Hashing",
      "link": "https://leetcode.com/problems/sort-an-array/",
      "meta": {
        "pattern": "Sort & Search",
        "dataStructure": "Array",
        "technique": "Quicksort / divide & conquer"
      },
      "description": "Given an integer array `nums`, return it **sorted in ascending order** — without using any built-in sort.\n\nThe classic answer is **quicksort**: repeatedly pick a pivot, *partition* the array so smaller elements sit left of it and larger elements sit right, then recursively sort each side. Each partition locks one element into its final position.",
      "constraints": [
        "`1 <= nums.length <= 5 * 10^4`",
        "`-5 * 10^4 <= nums[i] <= 5 * 10^4`",
        "Solve it without the language's built-in sort."
      ],
      "notes": [
        "Quicksort is in-place; its average time is O(n log n) but a bad pivot gives O(n^2).",
        "Randomizing the pivot makes the worst case astronomically unlikely — important because the online judge includes adversarial (already-sorted) inputs."
      ],
      "examples": [
        {
          "input": "nums = [5, 2, 3, 1]",
          "output": "[1, 2, 3, 5]",
          "reasoning": "Ascending order."
        },
        {
          "input": "nums = [5, 1, 1, 2, 0, 0]",
          "output": "[0, 0, 1, 1, 2, 5]",
          "reasoning": "Duplicates are preserved; order among equal values doesn't matter."
        },
        {
          "input": "nums = [6, 8, 4, 2, 7, 3, 1, 5]",
          "output": "[1, 2, 3, 4, 5, 6, 7, 8]",
          "reasoning": "A full shuffle sorted via repeated partitioning.",
          "visual": "```\npartition around pivot p:\n [ ... < p ... ] p [ ... >= p ... ]\n         ^pivot now in final place^\nthen recurse on the left part and the right part\n```"
        }
      ],
      "approaches": [
        {
          "name": "Quicksort — rightmost pivot (Lomuto)",
          "time": "O(n log n) avg, O(n^2) worst",
          "space": "O(log n) avg (recursion)",
          "whenToUse": "The clean teaching version: shows partitioning with a fixed pivot. Vulnerable to sorted inputs.",
          "logic": "**What it asks.** Sort the array yourself. We use quicksort, a **divide-and-conquer** method.\n\n**Key Idea — partitioning.** Pick a `pivot`. Rearrange the current range so every element `< pivot` ends up left of it and everything `>= pivot` ends up right. After this, the pivot is in its **final sorted position**, and we recurse on the two sides.\n\n**Lomuto partition (two pointers).** Choose the rightmost element as pivot. Keep a boundary pointer `lo` for 'where the next smaller element goes'. Scan `i` across the range; whenever `nums[i] < pivot`, swap it to `nums[lo]` and advance `lo`. Finally swap the pivot into `nums[lo]` — now everything left of `lo` is smaller and everything right is `>=`.\n\n**Step-by-Step Approach.**\n1. `quicksort(left, right)`: if `left >= right`, the range has 0 or 1 element and is already sorted — return.\n2. `p = partition(left, right)` places the pivot and returns its index.\n3. Recurse `quicksort(left, p - 1)` and `quicksort(p + 1, right)`.\n\n**Why it works.** Each partition correctly fixes one element; the ranges shrink and the recursion bottoms out at size-1 ranges, so the whole array ends sorted.\n\n**Common Gotchas.**\n- Base case `left >= right` (not `==`) — ranges can cross.\n- Scan the inner loop over `[left, right)` and swap the pivot in at the end.\n\n**Complexity.** Average `O(n log n)` (balanced splits, `log n` depth x `O(n)` partition). Worst case `O(n^2)` when the pivot is always the min/max — e.g. an already-sorted array. Space `O(log n)` for the call stack on average.\n\n**Interview mindset.** Explain partitioning with the two-pointer picture, then immediately flag the sorted-input worst case — which motivates the randomized pivot.",
          "rcs": "from typing import List  # Type hint for the array.\n\n\nclass Solution:\n    def sortArray(self, nums: List[int]) -> List[int]:\n        def partition(left: int, right: int) -> int:\n            pivot = nums[right]  # Choose the rightmost element as the pivot.\n            lo = left  # Boundary: everything in [left, lo) is < pivot.\n            for i in range(left, right):  # Scan the range excluding the pivot slot.\n                if nums[i] < pivot:  # Found a value that belongs on the left.\n                    nums[lo], nums[i] = nums[i], nums[lo]  # Swap it to the boundary.\n                    lo += 1  # Grow the 'smaller' region.\n            nums[lo], nums[right] = nums[right], nums[lo]  # Drop the pivot into its final place.\n            return lo  # Pivot's sorted index.\n\n        def quicksort(left: int, right: int) -> None:\n            if left >= right:  # 0 or 1 element -> already sorted.\n                return\n            p = partition(left, right)  # Fix one element, split into two parts.\n            quicksort(left, p - 1)  # Sort the left part.\n            quicksort(p + 1, right)  # Sort the right part.\n\n        quicksort(0, len(nums) - 1)  # Sort the whole array in place.\n        return nums",
          "plain": "from typing import List\n\n\nclass Solution:\n    def sortArray(self, nums: List[int]) -> List[int]:\n        def partition(left, right):\n            pivot = nums[right]\n            lo = left\n            for i in range(left, right):\n                if nums[i] < pivot:\n                    nums[lo], nums[i] = nums[i], nums[lo]\n                    lo += 1\n            nums[lo], nums[right] = nums[right], nums[lo]\n            return lo\n\n        def quicksort(left, right):\n            if left >= right:\n                return\n            p = partition(left, right)\n            quicksort(left, p - 1)\n            quicksort(p + 1, right)\n\n        quicksort(0, len(nums) - 1)\n        return nums"
        },
        {
          "name": "Optimized — Randomized pivot",
          "time": "O(n log n) expected",
          "space": "O(log n) expected",
          "whenToUse": "The robust version to submit: randomizing the pivot makes the O(n^2) worst case practically impossible, even on sorted input.",
          "logic": "**Why randomize.** The fixed-pivot version degrades to `O(n^2)` on already-sorted (or reverse-sorted) arrays, which online judges deliberately test. If instead we pick the pivot **uniformly at random** and swap it to the end before partitioning, no specific input can reliably trigger unbalanced splits — the expected time becomes `O(n log n)` regardless of input order.\n\n**Key Idea.** Identical partitioning; the only change is one random swap at the top of `partition` that chooses the pivot.\n\n**Step-by-Step Approach.**\n1. In `partition`, pick `r = random index in [left, right]` and swap `nums[r]` with `nums[right]`.\n2. Proceed with the same Lomuto scan as before.\n\n**Why it works.** Randomization decouples the split quality from the input's existing order, so the expected recursion depth is `O(log n)`.\n\n**Common Gotchas.**\n- Swap the random pivot to `right` first, then run the unchanged partition — keeps the code simple.\n- Deep recursion on huge inputs can still hit Python's recursion limit; recursing into the smaller side first (or raising the limit) avoids it.\n\n**Complexity.** Expected `O(n log n)` time, `O(log n)` expected stack space.\n\n**Interview mindset.** 'I'd randomize the pivot to avoid the sorted-input worst case' is exactly the follow-up interviewers want after you describe basic quicksort.",
          "rcs": "import random  # For choosing a random pivot.\nfrom typing import List\n\n\nclass Solution:\n    def sortArray(self, nums: List[int]) -> List[int]:\n        def partition(left: int, right: int) -> int:\n            r = random.randint(left, right)  # Pick a random pivot index...\n            nums[r], nums[right] = nums[right], nums[r]  # ...and move it to the end.\n            pivot = nums[right]  # Same Lomuto scheme from here on.\n            lo = left\n            for i in range(left, right):\n                if nums[i] < pivot:\n                    nums[lo], nums[i] = nums[i], nums[lo]\n                    lo += 1\n            nums[lo], nums[right] = nums[right], nums[lo]\n            return lo\n\n        def quicksort(left: int, right: int) -> None:\n            if left >= right:\n                return\n            p = partition(left, right)\n            quicksort(left, p - 1)\n            quicksort(p + 1, right)\n\n        quicksort(0, len(nums) - 1)\n        return nums",
          "plain": "import random\nfrom typing import List\n\n\nclass Solution:\n    def sortArray(self, nums: List[int]) -> List[int]:\n        def partition(left, right):\n            r = random.randint(left, right)\n            nums[r], nums[right] = nums[right], nums[r]\n            pivot = nums[right]\n            lo = left\n            for i in range(left, right):\n                if nums[i] < pivot:\n                    nums[lo], nums[i] = nums[i], nums[lo]\n                    lo += 1\n            nums[lo], nums[right] = nums[right], nums[lo]\n            return lo\n\n        def quicksort(left, right):\n            if left >= right:\n                return\n            p = partition(left, right)\n            quicksort(left, p - 1)\n            quicksort(p + 1, right)\n\n        quicksort(0, len(nums) - 1)\n        return nums"
        }
      ],
      "patternRecognition": [
        "'Sort without built-ins' -> implement quicksort / mergesort / heapsort.",
        "Partitioning places one element in its final spot and splits the rest.",
        "Randomize the pivot to dodge the sorted-input O(n^2) case."
      ],
      "interviewRecall": [
        "quicksort: if left >= right return; p = partition; recurse both sides.",
        "Lomuto: boundary lo, swap smaller-than-pivot elements left, then swap pivot into lo.",
        "Average O(n log n); worst O(n^2) on bad pivots -> randomize."
      ]
    },
    {
      "id": "geometric-sequence-triplets",
      "lc": null,
      "title": "Geometric Sequence Triplets",
      "difficulty": "Medium",
      "category": "Arrays & Hashing",
      "link": null,
      "meta": {
        "pattern": "Hash Map (two-sided)",
        "dataStructure": "Hash Map",
        "technique": "Middle-element counting"
      },
      "description": "A **geometric sequence triplet** is three numbers where each is the previous one times a fixed **common ratio** `r` — e.g. `(1, 2, 4)` with `r = 2`, or `(5, 15, 45)` with `r = 3`.\n\nGiven an integer array `nums` and a ratio `r`, count all index triplets `(i, j, k)` with `i < j < k` such that `nums[i], nums[j], nums[k]` form a geometric sequence (`nums[j] = nums[i] * r` and `nums[k] = nums[j] * r`). The array may contain duplicates, so the **same values can form many triplets** at different index positions.",
      "constraints": [
        "`1 <= nums.length <= 10^5`",
        "`-10^9 <= nums[i] <= 10^9`",
        "`1 <= r <= 10^6`",
        "Count every valid index triplet, including duplicates."
      ],
      "notes": [
        "Count index triplets, not distinct value triplets.",
        "Anchor on the MIDDLE element x: its partners are x/r (to the left) and x*r (to the right)."
      ],
      "examples": [
        {
          "input": "nums = [2, 1, 2, 4, 8, 8], r = 2",
          "output": "5",
          "reasoning": "[2,4,8] occurs at (0,3,4), (0,3,5), (2,3,4), (2,3,5); [1,2,4] at (1,2,3). Total 5."
        },
        {
          "input": "nums = [1, 1, 1, 1], r = 1",
          "output": "4",
          "reasoning": "With r = 1 every value equals its neighbors; any 3 of the 4 indices work: C(4,3) = 4."
        },
        {
          "input": "nums = [1, 5, 5, 25], r = 5",
          "output": "2",
          "reasoning": "[1,5,25] via the 5 at index 1 -> (0,1,3), and via the 5 at index 2 -> (0,2,3).",
          "visual": "```\nanchor each element as the MIDDLE value x:\n  left_map  counts values seen to the LEFT  (candidates for x / r)\n  right_map counts values still to the RIGHT (candidates for x * r)\n  triplets through x = left_map[x/r] * right_map[x*r]\n```"
        }
      ],
      "approaches": [
        {
          "name": "Brute Force — three nested loops",
          "time": "O(n^3)",
          "space": "O(1)",
          "whenToUse": "Baseline to state the definition precisely before optimizing.",
          "logic": "**What it asks.** Count ordered index triplets `i < j < k` forming a geometric sequence with ratio `r`.\n\n**Why it's slow.** The direct approach tries every triplet with three nested loops and checks the ratio relationship, costing `O(n^3)` — far too slow at `n = 10^5`.\n\n**Step-by-Step Approach.**\n1. Loop `i`, then `j > i`, then `k > j`.\n2. Count the triplet when `nums[j] == nums[i] * r` and `nums[k] == nums[j] * r`.\n\n**Key observation that unlocks the optimum.** If you know the middle value `x = nums[j]`, the other two are forced: the left one must be `x / r` and the right one `x * r`. So you don't need to search pairs — you just need *how many* `x/r` lie to the left and *how many* `x*r` lie to the right.\n\n**Complexity.** `O(n^3)` time, `O(1)` space.\n\n**Interview mindset.** Representing the triplet as `(x/r, x, x*r)` and anchoring on the middle is the leap to an `O(n)` solution.",
          "rcs": "from typing import List  # Type hint for nums.\n\n\nclass Solution:\n    def geometricTriplets(self, nums: List[int], r: int) -> int:\n        n = len(nums)\n        count = 0\n        for i in range(n):  # First element of the triplet.\n            for j in range(i + 1, n):  # Middle element, to the right of i.\n                for k in range(j + 1, n):  # Last element, to the right of j.\n                    # Check the geometric relationship in order.\n                    if nums[j] == nums[i] * r and nums[k] == nums[j] * r:\n                        count += 1\n        return count",
          "plain": "from typing import List\n\n\nclass Solution:\n    def geometricTriplets(self, nums: List[int], r: int) -> int:\n        n = len(nums)\n        count = 0\n        for i in range(n):\n            for j in range(i + 1, n):\n                for k in range(j + 1, n):\n                    if nums[j] == nums[i] * r and nums[k] == nums[j] * r:\n                        count += 1\n        return count"
        },
        {
          "name": "Optimized — Two hash maps (left & right)",
          "time": "O(n)",
          "space": "O(n)",
          "whenToUse": "The intended solution: anchor on the middle element and count partners in O(1) each.",
          "logic": "**Key Idea.** Treat every element `x` as the **middle** of a triplet `(x/r, x, x*r)`. The number of triplets centered on this `x` is `(# of x/r to its left) * (# of x*r to its right)`. Two frequency maps give both counts in `O(1)`.\n\n**Setup.** `right_map` starts with the frequency of **every** value (all are initially to the right). `left_map` starts empty. We then sweep left to right; at each element `x` we move it out of 'right' and, after processing, into 'left'.\n\n**Step-by-Step Approach.**\n1. Fill `right_map` with the count of each value in `nums`.\n2. For each `x` in order: first `right_map[x] -= 1` (x is no longer to the right of itself).\n3. If `x` is divisible by `r` (so `x/r` is an integer), add `left_map[x // r] * right_map[x * r]` to the answer.\n4. Then `left_map[x] += 1` (x is now a left-candidate for later elements).\n\n**Why it works.** When `x` is the middle, every earlier `x/r` can be the left end and every later `x*r` the right end; multiplying their frequencies counts all combinations — including duplicates — in one shot, and the `i < j < k` ordering is guaranteed by the left/right split.\n\n**Common Gotchas.**\n- Decrement `right_map[x]` **before** counting, or `x` would count itself as a partner.\n- Guard the `x / r` lookup with `x % r == 0`; otherwise `x/r` isn't a real array value.\n- Use frequency maps (not sets) so duplicates are counted correctly; missing keys default to frequency 0.\n\n**Complexity.** One pass with `O(1)` map work per element is `O(n)` time; the maps hold up to `n` values, `O(n)` space.\n\n**Interview mindset.** 'Fix the middle, multiply the left/right frequencies' generalizes to many 'count triplets/pairs with a relationship' problems.",
          "rcs": "from collections import defaultdict  # defaultdict(int) gives missing keys a frequency of 0.\nfrom typing import List\n\n\nclass Solution:\n    def geometricTriplets(self, nums: List[int], r: int) -> int:\n        left_map = defaultdict(int)  # Frequencies of values seen to the LEFT of the current element.\n        right_map = defaultdict(int)  # Frequencies of values still to the RIGHT.\n        for x in nums:  # Initially every element is to the right.\n            right_map[x] += 1\n        count = 0\n        for x in nums:  # Treat each x as the MIDDLE of a triplet.\n            right_map[x] -= 1  # x is no longer to the right of itself.\n            if x % r == 0:  # Only then is x / r a valid integer partner.\n                # (# of x/r on the left) * (# of x*r on the right) = triplets centered on this x.\n                count += left_map[x // r] * right_map[x * r]\n            left_map[x] += 1  # x becomes a left-candidate for later middles.\n        return count",
          "plain": "from collections import defaultdict\nfrom typing import List\n\n\nclass Solution:\n    def geometricTriplets(self, nums: List[int], r: int) -> int:\n        left_map = defaultdict(int)\n        right_map = defaultdict(int)\n        for x in nums:\n            right_map[x] += 1\n        count = 0\n        for x in nums:\n            right_map[x] -= 1\n            if x % r == 0:\n                count += left_map[x // r] * right_map[x * r]\n            left_map[x] += 1\n        return count"
        }
      ],
      "patternRecognition": [
        "'Count triplets with a fixed relationship' -> anchor on the middle element.",
        "Two frequency maps (left + right) turn partner-finding into O(1) lookups.",
        "Multiply left and right frequencies to count all duplicate combinations at once."
      ],
      "interviewRecall": [
        "Represent the triplet as (x/r, x, x*r) and sweep with left_map / right_map.",
        "Decrement right_map[x] before counting; guard x % r == 0.",
        "count += left_map[x//r] * right_map[x*r]; then left_map[x] += 1."
      ]
    },

    {
      id: "majority-element",
      lc: 169,
      title: "Majority Element",
      difficulty: "Easy",
      category: "Arrays & Hashing",
      link: "https://leetcode.com/problems/majority-element/",
      meta: { pattern: "Boyer–Moore Majority Vote", dataStructure: "Two running counters (candidate + count)", technique: "Cancel out opposing votes" },
      description:
        "Given an array `nums` of size `n`, return the **majority element** — the element that appears **more than** `⌊n/2⌋` times.\n\n" +
        "You may assume the majority element **always exists**, so there is exactly one answer.",
      constraints: [
        "`n == nums.length`",
        "`1 <= n <= 5 * 10^4`",
        "`-10^9 <= nums[i] <= 10^9`",
        "Follow-up: can you solve it in `O(n)` time and `O(1)` space?"
      ],
      notes: [
        "'More than n/2' is strict — the majority element strictly dominates, so it survives pairing each of its occurrences against a different value.",
        "The problem guarantees a majority exists; without that guarantee you would need a second pass to verify the candidate."
      ],
      examples: [
        { input: "nums = [3,2,3]", output: "3", reasoning: "3 appears twice out of three elements (> 3/2 = 1.5)." },
        { input: "nums = [2,2,1,1,1,2,2]", output: "2", reasoning: "2 appears four times out of seven (> 3.5)." },
        {
          input: "nums = [6,5,5]",
          output: "5",
          reasoning: "Boyer–Moore: candidate=6 (count 1), then 5 cancels it to 0, then 5 becomes the new candidate and wins.",
          visual: "```\nn=6: count 0->1, cand=6\nn=5: 5!=6 -> count 1->0\nn=5: count 0 -> cand=5, count 0->1\nresult: 5\n```"
        }
      ],
      approaches: [
        {
          name: "Hash Map Counting",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The obvious first answer; also the template when a majority is NOT guaranteed or you need every element's count.",
          logic:
            "**What it asks.** Find the value that occurs more than `n/2` times.\n\n" +
            "**Brute force.** For each value, scan the array and count its occurrences — `O(n^2)`.\n\n" +
            "**Key Idea.** One pass that tallies counts in a hash map is enough: increment `counts[x]`, and the moment any count exceeds `n//2` you have the answer.\n\n" +
            "**Why it works.** A value with more than `n/2` occurrences must cross the `n//2` threshold at some point during the scan, so returning as soon as it does is correct.\n\n" +
            "**Complexity.** Time `O(n)`; space `O(n)` for the map — which is exactly what Boyer–Moore removes.",
          rcs:
            "class Solution:\n" +
            "    def majorityElement(self, nums: List[int]) -> int:\n" +
            "        counts = {}\n" +
            "        for n in nums:\n" +
            "            counts[n] = counts.get(n, 0) + 1   # Tally each value.\n" +
            "            if counts[n] > len(nums) // 2:      # Crossed the majority threshold?\n" +
            "                return n                        # It can only be this value.\n" +
            "        return nums[0]                          # Unreachable when a majority is guaranteed.",
          plain:
            "class Solution:\n" +
            "    def majorityElement(self, nums: List[int]) -> int:\n" +
            "        counts = {}\n" +
            "        for n in nums:\n" +
            "            counts[n] = counts.get(n, 0) + 1\n" +
            "            if counts[n] > len(nums) // 2:\n" +
            "                return n\n" +
            "        return nums[0]"
        },
        {
          name: "Boyer–Moore Majority Vote",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "The optimal answer and the whole point of the problem: constant space by cancelling opposing votes.",
          logic:
            "**Key Idea.** Keep a single `candidate` and a `count`. Walking left to right, when `count` is `0` adopt the current value as the new candidate; then add `1` to `count` when the value equals the candidate and subtract `1` otherwise.\n\n" +
            "**Why it works.** Think of each non-candidate value as cancelling one candidate vote. Because the majority element appears more than `n/2` times, there are strictly more votes for it than for everything else combined — so no matter how the cancellations interleave, its net count can never be driven to zero permanently, and it is whatever `candidate` holds at the end.\n\n" +
            "**What each variable holds.** `candidate` is the value currently 'winning' the running duel; `count` is how far ahead it is among the elements seen so far.\n\n" +
            "**Step-by-Step.**\n" +
            "1. `count = 0`, `candidate = None`.\n" +
            "2. For each `n`: if `count == 0`, set `candidate = n`; then `count += 1 if n == candidate else -1`.\n" +
            "3. Return `candidate`.\n\n" +
            "**Gotcha.** This returns a value even if no true majority exists; when the guarantee is absent, add a verification pass that counts the candidate.\n\n" +
            "**Complexity.** Time `O(n)`, space `O(1)`.\n\n" +
            "**Interview mindset.** 'Appears more than half the time' + 'O(1) space' is the Boyer–Moore signal.",
          rcs:
            "class Solution:\n" +
            "    def majorityElement(self, nums: List[int]) -> int:\n" +
            "        count = 0\n" +
            "        candidate = None\n" +
            "        for n in nums:\n" +
            "            if count == 0:\n" +
            "                candidate = n                   # No one is winning -> back this value.\n" +
            "            count += 1 if n == candidate else -1 # Same value supports it; different cancels.\n" +
            "        return candidate                        # Majority survives all cancellations.",
          plain:
            "class Solution:\n" +
            "    def majorityElement(self, nums: List[int]) -> int:\n" +
            "        count = 0\n" +
            "        candidate = None\n" +
            "        for n in nums:\n" +
            "            if count == 0:\n" +
            "                candidate = n\n" +
            "            count += 1 if n == candidate else -1\n" +
            "        return candidate"
        }
      ],
      patternRecognition: [
        "'Element appearing more than n/2 times' is the canonical Boyer–Moore Majority Vote problem.",
        "A follow-up demanding O(1) space rules out the hash map and points straight at the vote-cancelling trick.",
        "'Cancel each opposing value against one candidate' generalizes to 'more than n/3' with two candidates."
      ],
      interviewRecall: [
        "candidate + count; reset candidate when count hits 0; +1 on match, -1 otherwise.",
        "Works because the majority has more votes than everything else combined, so its net count never dies.",
        "Mention the verification pass needed when a majority is not guaranteed."
      ]
    },

    {
      id: "kmp-string-matching",
      lc: null,
      title: "Knuth–Morris–Pratt (KMP) String Matching",
      difficulty: "Hard",
      category: "Arrays & Hashing",
      link: null,
      meta: { pattern: "String Matching (KMP)", dataStructure: "Prefix-function LPS array over the string", technique: "Reuse the longest proper prefix-suffix" },
      description:
        "Find every starting index where a `pattern` occurs inside a `text`, in **linear** `O(n + m)` time (`n = len(text)`, `m = len(pattern)`).\n\n" +
        "The naive approach re-compares the pattern from scratch after every mismatch, costing `O(n*m)`. **KMP** precomputes a table — the **LPS** (Longest proper Prefix which is also a Suffix) array for the pattern — so that after a mismatch it can skip ahead without ever moving the text pointer backward.\n\n" +
        "This is a technique explainer (no single LeetCode number); the same machinery powers problems like *Implement strStr()*, *Shortest Palindrome*, and *Repeated String Pattern*.",
      constraints: [
        "`0 <= len(text), len(pattern)`",
        "Characters can be any comparable symbols (letters, digits, bytes).",
        "Return all match start indices (overlapping matches included)."
      ],
      notes: [
        "`lps[i]` = length of the longest proper prefix of `pattern[0..i]` that is also a suffix of `pattern[0..i]`. 'Proper' means it cannot be the whole substring.",
        "On a mismatch at pattern index `j`, KMP falls back to `j = lps[j-1]` instead of `0` — that is the entire speedup.",
        "The text index `i` never decreases, which is why the scan is linear."
      ],
      examples: [
        {
          input: "text = \"ababcababa\", pattern = \"ababa\"",
          output: "[5]",
          reasoning: "The only occurrence of 'ababa' starts at index 5.",
          visual: "```\nindex: 0123456789\ntext:  ababcababa\nmatch:      ababa  (starts at 5)\n```"
        },
        {
          input: "pattern = \"aabaa\"  (LPS table)",
          output: "[0,1,0,1,2]",
          reasoning: "At each position, the longest proper prefix that is also a suffix: 'a'->0, 'aa'->1, 'aab'->0, 'aaba'->1, 'aabaa'->2.",
          visual: "```\np:   a a b a a\nlps: 0 1 0 1 2\n```"
        },
        {
          input: "text = \"aaaaa\", pattern = \"aa\"",
          output: "[0,1,2,3]",
          reasoning: "Overlapping matches are reported; after a full match KMP resets j = lps[j-1] to keep finding them."
        }
      ],
      approaches: [
        {
          name: "LPS prefix function + linear scan",
          time: "O(n + m)",
          space: "O(m)",
          whenToUse: "Any exact substring search where O(n*m) is too slow, or when a problem secretly reduces to 'match a string against a shifted copy of itself'.",
          logic:
            "**What it asks.** Locate the pattern inside the text without the quadratic blow-up of restarting the comparison on every mismatch.\n\n" +
            "**Why naive is slow.** After matching `j` characters and then hitting a mismatch, the naive method slides the pattern by one and recompares everything — re-examining text characters it already saw, giving `O(n*m)`.\n\n" +
            "**Key Idea.** The already-matched prefix `pattern[0..j-1]` equals the text window that just matched. If that prefix has its own prefix that is also its suffix (length `lps[j-1]`), those characters are **already aligned** after the shift — so we can resume comparing at `j = lps[j-1]` and never re-read text.\n\n" +
            "**Building LPS.** Compute it with the same self-matching idea: compare `pattern[i]` against `pattern[length]`; on a match extend `length` and record it, on a mismatch fall back to `length = lps[length-1]` until it matches or `length` hits 0.\n\n" +
            "**Scanning.** Walk `i` over the text with a pattern cursor `j`; on mismatch fall back `j = lps[j-1]`; on match advance `j`; when `j == m` record a hit at `i - m + 1` and fall back `j = lps[j-1]` to allow overlaps.\n\n" +
            "**Why it works.** `lps` guarantees the fallback never skips a real occurrence, because any shorter overlap would have been captured by a smaller prefix-suffix. Each text character is visited once and `j` only moves backward via fallbacks whose total is bounded by its forward moves — amortized `O(n)`.\n\n" +
            "**Complexity.** Time `O(n + m)`; space `O(m)` for the LPS table.\n\n" +
            "**Interview mindset.** 'Linear substring search' or 'find the longest prefix that is also a suffix' = KMP prefix function.",
          rcs:
            "class Solution:\n" +
            "    def kmp_search(self, text: str, pattern: str) -> List[int]:\n" +
            "        if not pattern:\n" +
            "            return []\n" +
            "        lps = self._build_lps(pattern)      # Precompute fallback table.\n" +
            "        res, j = [], 0                      # j = chars of pattern currently matched.\n" +
            "        for i in range(len(text)):\n" +
            "            while j > 0 and text[i] != pattern[j]:\n" +
            "                j = lps[j - 1]              # Mismatch: fall back, DON'T move i.\n" +
            "            if text[i] == pattern[j]:\n" +
            "                j += 1                      # Matched one more pattern char.\n" +
            "            if j == len(pattern):\n" +
            "                res.append(i - j + 1)       # Full match ends at i.\n" +
            "                j = lps[j - 1]              # Reset to allow overlapping matches.\n" +
            "        return res\n" +
            "\n" +
            "    def _build_lps(self, pattern: str) -> List[int]:\n" +
            "        lps = [0] * len(pattern)\n" +
            "        length, i = 0, 1                    # length = current prefix-suffix size.\n" +
            "        while i < len(pattern):\n" +
            "            if pattern[i] == pattern[length]:\n" +
            "                length += 1\n" +
            "                lps[i] = length\n" +
            "                i += 1\n" +
            "            elif length > 0:\n" +
            "                length = lps[length - 1]   # Fall back within the pattern itself.\n" +
            "            else:\n" +
            "                lps[i] = 0\n" +
            "                i += 1\n" +
            "        return lps",
          plain:
            "class Solution:\n" +
            "    def kmp_search(self, text: str, pattern: str) -> List[int]:\n" +
            "        if not pattern:\n" +
            "            return []\n" +
            "        lps = self._build_lps(pattern)\n" +
            "        res, j = [], 0\n" +
            "        for i in range(len(text)):\n" +
            "            while j > 0 and text[i] != pattern[j]:\n" +
            "                j = lps[j - 1]\n" +
            "            if text[i] == pattern[j]:\n" +
            "                j += 1\n" +
            "            if j == len(pattern):\n" +
            "                res.append(i - j + 1)\n" +
            "                j = lps[j - 1]\n" +
            "        return res\n" +
            "\n" +
            "    def _build_lps(self, pattern: str) -> List[int]:\n" +
            "        lps = [0] * len(pattern)\n" +
            "        length, i = 0, 1\n" +
            "        while i < len(pattern):\n" +
            "            if pattern[i] == pattern[length]:\n" +
            "                length += 1\n" +
            "                lps[i] = length\n" +
            "                i += 1\n" +
            "            elif length > 0:\n" +
            "                length = lps[length - 1]\n" +
            "            else:\n" +
            "                lps[i] = 0\n" +
            "                i += 1\n" +
            "        return lps"
        }
      ],
      patternRecognition: [
        "Exact substring search where O(n*m) is too slow -> KMP with the LPS prefix function.",
        "'Longest proper prefix that is also a suffix' is literally the LPS array — many string puzzles reduce to one LPS computation.",
        "Problems that match a string against a shifted copy of itself (shortest palindrome, repeated pattern) are KMP in disguise."
      ],
      interviewRecall: [
        "lps[i] = longest proper prefix == suffix of pattern[0..i]; on mismatch fall back j = lps[j-1].",
        "The text pointer i never moves backward -> O(n+m) total.",
        "After a full match, set j = lps[j-1] to catch overlapping occurrences."
      ]
    }
  ]);
})();
