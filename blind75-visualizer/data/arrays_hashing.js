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
