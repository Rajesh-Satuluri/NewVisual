/*
 * prefix_sum.js — Prefix Sum pattern.
 * Registers the Prefix Sum problems (new category added to core.js
 * CATEGORY_ORDER). Precompute cumulative totals for O(1) range queries and
 * pair with a hash map to count subarrays by sum. ES5-safe, no build step.
 */
(function () {
  window.BLIND75.register("Prefix Sum", [
  {
    "id": "subarray-sum-equals-k",
    "lc": 560,
    "title": "Subarray Sum Equals K",
    "difficulty": "Medium",
    "category": "Prefix Sum",
    "link": "https://leetcode.com/problems/subarray-sum-equals-k/",
    "meta": {
      "pattern": "Prefix Sum + Hash Map",
      "dataStructure": "Hash Map",
      "technique": "Count prefix sums seen so far"
    },
    "description": "Given an integer array `nums` and an integer `k`, return the total number of **contiguous** subarrays whose elements sum to exactly `k`.\n\nA subarray is a non-empty run of consecutive elements. Different start/end index pairs that produce the same sum are each counted separately, so you are counting index ranges, not distinct value patterns.\n\nNote that `nums` may contain negative numbers and zeros, which rules out any sliding-window shortcut that assumes the running sum only grows.",
    "constraints": [
      "`1 <= nums.length <= 2 * 10^4`",
      "`-1000 <= nums[i] <= 1000`",
      "`-10^7 <= k <= 10^7`"
    ],
    "notes": [
      "Negative values mean a sliding window does not work; prefix sums do.",
      "Define `prefix[i]` as the sum of the first `i` elements; a subarray `(i, j]` sums to `prefix[j] - prefix[i]`.",
      "The empty-prefix sum `0` must be seeded once so subarrays starting at index 0 are counted."
    ],
    "examples": [
      {
        "input": "nums = [1, 1, 1], k = 2",
        "output": "2",
        "reasoning": "The subarrays [1,1] at indices (0,1) and (1,2) each sum to 2.",
        "visual": "```\n nums:   1   1   1\n prefix: 1   2   3   (running sum)\n (0,1]: 2-0 = 2  ✓\n (1,2]: 3-1 = 2  ✓\n```"
      },
      {
        "input": "nums = [1, 2, 3], k = 3",
        "output": "2",
        "reasoning": "[1,2] (sum 3) and [3] (sum 3) both qualify."
      },
      {
        "input": "nums = [1, -1, 0], k = 0",
        "output": "3",
        "reasoning": "[1,-1], [1,-1,0], and [0] all sum to 0; negatives and zeros are why a window fails.",
        "visual": "```\n nums:   1  -1   0\n prefix: 1   0   0\n (0,1]: 0-0 = 0  ✓\n (0,2]: 0-0 = 0  ✓\n (2,2]: 0-0 = 0  ✓\n```"
      },
      {
        "input": "nums = [3, 4, 7, 2, -3, 1, 4, 2], k = 7",
        "output": "4",
        "reasoning": "[3,4], [7], [7,2,-3,1], and [1,4,2] each total 7."
      }
    ],
    "approaches": [
      {
        "name": "Brute Force — Check Every Subarray",
        "time": "O(n^2)",
        "space": "O(1)",
        "whenToUse": "The first thing to state; fine for small inputs but too slow near the upper bound.",
        "logic": "**What it asks.** Count how many contiguous slices of `nums` add up to exactly `k`. This approach simply tries every possible slice.\n\n**Why the naive idea fails.** There is nothing logically wrong with enumerating all subarrays, it is purely a speed problem. For each start index you extend the slice one element at a time, keeping a running sum, and tally a hit whenever it equals `k`. That is correct, but there are about `n^2 / 2` subarrays, so at `n = 2 * 10^4` you perform on the order of `2 * 10^8` additions, which the prefix-sum-plus-hash-map version collapses to a single pass.\n\n**Key Idea.** Fix a left endpoint and grow the window to the right, accumulating the sum as you go rather than re-adding from scratch. Each time the running total hits `k`, you have found one valid subarray ending at the current right endpoint. Sweeping every left endpoint covers all possibilities exactly once.\n\n**Step-by-Step Approach.**\n1. Initialize a `count` of zero.\n2. For each start index `i` from `0` to `n - 1`, reset a running `total` to zero.\n3. For each end index `j` from `i` to `n - 1`, add `nums[j]` to `total`.\n4. Whenever `total == k`, increment `count`; a longer slice may still match later, so do not break.\n5. After both loops finish, return `count`.\n\n**Why it works.** The inner loop maintains the invariant that `total` is exactly the sum of `nums[i..j]`. Because every `(i, j)` pair is visited precisely once and tested, every contiguous subarray is considered, so no valid slice is missed and none is counted twice.\n\n**Common Gotchas.**\n- Do not stop the inner loop on the first match; with negatives and zeros a longer slice from the same start can also equal `k`.\n- Reset `total` to zero at the start of every outer iteration, not once at the top.\n- Subarrays must be contiguous and non-empty, so the inner loop starts at `j = i`, not `j = i + 1`.\n\n**Complexity.** Time `O(n^2)`, since every start/end pair is examined. Space `O(1)`, just the two counters.\n\n**Interview mindset.** State this baseline to prove the problem is understood, then immediately flag the repeated summation across overlapping slices as the waste that the prefix-sum hash-map approach removes.",
        "rcs": "from typing import List  # List[int] is the integer array nums; k is a plain int.\n\n\nclass Solution:  # LeetCode creates an object of this class and calls subarraySum on it.\n\n    def subarraySum(self, nums: List[int], k: int) -> int:  # Return how many contiguous subarrays sum to exactly k.\n\n        # ==================== PHASE 1: PREPARE THE COUNTER ====================\n\n        count = 0  # Running tally of subarrays whose sum equals k.\n                   # State: starts at 0 and is incremented once per matching slice.\n\n        n = len(nums)  # Cache the length so range() calls below stay clear.\n                       # Execution flow: Python continues to the outer loop over start indices.\n\n        # ==================== PHASE 2: FIX EACH LEFT ENDPOINT ====================\n\n        for i in range(n):  # i is the START index of the current family of subarrays.\n                            # Loop invariant: all subarrays starting before i have already been fully counted.\n\n            total = 0  # Running sum of nums[i..j]; reset fresh for every new start index.\n                       # Why reset here: each new left endpoint begins a brand-new accumulation.\n\n            # ==================== PHASE 3: GROW THE RIGHT ENDPOINT ====================\n\n            for j in range(i, n):  # j is the END index; start at i so single-element slices are included.\n                                   # Loop invariant: total holds the sum of nums[i..j-1] before this body runs.\n\n                total += nums[j]  # Extend the slice by one element instead of re-summing from scratch.\n                                  # State change: total now equals the sum of nums[i..j].\n\n                if total == k:  # Does the slice nums[i..j] hit the target exactly?\n                    count += 1  # Yes: record one more valid subarray.\n                                # Why no break: with negatives/zeros a longer slice from i can also equal k.\n\n        # ==================== PHASE 4: RETURN THE TOTAL ====================\n\n        return count  # Every start/end pair was tested exactly once, so count is complete.",
        "plain": "class Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        count = 0\n        n = len(nums)\n        for i in range(n):\n            total = 0\n            for j in range(i, n):\n                total += nums[j]\n                if total == k:\n                    count += 1\n        return count"
      },
      {
        "name": "Optimized — Prefix Sum + Hash Map",
        "time": "O(n)",
        "space": "O(n)",
        "whenToUse": "The expected answer: count subarrays in a single pass, works with negatives and zeros.",
        "logic": "**What it asks.** Count the contiguous subarrays summing to `k` in a single pass, without re-adding overlapping slices and without assuming the running sum only grows.\n\n**Why the naive idea fails.** The brute force re-sums overlapping slices, costing `O(n^2)`. A sliding window would fix that for positive-only arrays, but `nums` has negatives and zeros, so shrinking or growing a window gives no monotonic signal about the sum. We need an approach that tolerates any sign.\n\n**Key Idea.** Let `prefix` be the running sum of everything seen so far. The sum of a subarray ending at the current position with some earlier start equals `prefix - (prefix at that earlier start)`. So a subarray ending here sums to `k` exactly when some earlier prefix equalled `prefix - k`. If you keep a hash map counting how many times each prefix value has occurred, then at each step the number of valid subarrays ending here is simply how many times `prefix - k` has been seen. Seeding the map with `{0: 1}` accounts for subarrays that start at index 0 (where the needed earlier prefix is the empty prefix, 0).\n\n**Step-by-Step Approach.**\n1. Create a hash map `seen` mapping a prefix-sum value to how many times it has occurred, seeded with `{0: 1}`.\n2. Maintain a running `prefix` sum, starting at zero, and a `count` of zero.\n3. For each number, add it to `prefix`.\n4. Add `seen.get(prefix - k, 0)` to `count`: every earlier position whose prefix was `prefix - k` marks the start of a subarray ending here that sums to `k`.\n5. Increment `seen[prefix]` by one so this prefix is available to future positions, then continue. Return `count` at the end.\n\n**Why it works.** The invariant is that `seen` holds the count of every prefix value produced at the positions strictly before the current one, and `prefix` is the sum up to and including the current element. A subarray `(i, j]` sums to `prefix[j] - prefix[i]`, so it equals `k` precisely when `prefix[i] = prefix[j] - k`; summing the occurrences of that earlier value counts all such `i` at once. Updating the map after the lookup guarantees we only pair the current position with strictly earlier starts.\n\n**Common Gotchas.**\n- Seed `seen` with `{0: 1}`, or every subarray that starts at index 0 is undercounted.\n- Look up `prefix - k` *before* inserting the current `prefix`, otherwise a `k == 0` case double-counts the length-zero slice.\n- Accumulate the *count* of occurrences, not just presence; the same prefix value can recur many times and each occurrence is a distinct valid start.\n\n**Complexity.** Time `O(n)`, a single pass with `O(1)` hash operations per element. Space `O(n)`, since the map may hold a distinct entry for every prefix value.\n\n**Interview mindset.** 'Count/388 find subarrays with a given sum' plus 'negatives allowed' is the canonical trigger for prefix sum with a hash map of counts. The load-bearing line is `count += seen[prefix - k]`; everything else is bookkeeping.",
        "rcs": "from typing import List  # List[int] is the integer array nums; k is a plain int.\nfrom collections import defaultdict  # defaultdict(int) returns 0 for any unseen key, so missing prefixes read as 0 counts.\n\n\nclass Solution:  # LeetCode creates an object of this class and calls subarraySum on it.\n\n    def subarraySum(self, nums: List[int], k: int) -> int:  # Count contiguous subarrays summing to k in one pass.\n\n        # ==================== PHASE 1: SEED THE PREFIX-COUNT MAP AND RUNNING STATE ====================\n\n        seen = defaultdict(int)  # Maps a prefix-sum VALUE -> how many earlier positions produced it.\n                                 # Why counts, not a set: the same prefix can recur, and each recurrence is a distinct valid start.\n\n        seen[0] = 1  # Seed the EMPTY prefix (sum 0) once, so subarrays starting at index 0 are counted.\n                     # Why: a slice from index 0 needs an earlier prefix of 0; without this seed those slices are missed.\n\n        prefix = 0  # Running sum of nums[0..current]; grows as we walk the array.\n                    # State: prefix always equals the sum of every element processed so far.\n\n        count = 0  # Tally of subarrays summing to exactly k.\n                   # Execution flow: Python continues to the single pass below.\n\n        # ==================== PHASE 2: ONE PASS — EXTEND, COUNT, RECORD ====================\n\n        for num in nums:  # Walk left to right; each step treats the current index as a subarray END.\n                          # Loop invariant: seen holds the prefix counts for every position STRICTLY before this one.\n\n            prefix += num  # Extend the running sum to include the current element.\n                           # State change: prefix now equals the sum up to and including this index.\n\n            count += seen[prefix - k]  # KEY LINE: every earlier position whose prefix was (prefix - k) starts a\n                                       # subarray ending here that sums to k, since prefix - (prefix - k) = k.\n                                       # Why before the insert: we pair only with STRICTLY earlier starts, never the current index.\n\n            seen[prefix] += 1  # Record this prefix so future positions can pair with the current index as their start.\n                               # State change: seen[prefix] rises by one.\n                               # Execution flow: end of iteration; Python advances to the next element.\n\n        # ==================== PHASE 3: RETURN THE TOTAL ====================\n\n        return count  # After the full pass, count holds every contiguous subarray summing to k.",
        "plain": "class Solution:\n    def subarraySum(self, nums: List[int], k: int) -> int:\n        seen = defaultdict(int)\n        seen[0] = 1\n        prefix = 0\n        count = 0\n        for num in nums:\n            prefix += num\n            count += seen[prefix - k]\n            seen[prefix] += 1\n        return count"
      }
    ],
    "patternRecognition": [
      "'Count subarrays with sum = k' where negatives are allowed → prefix sum + hash map of counts.",
      "A sliding window is ruled out by negative numbers / zeros → reach for prefix sums instead.",
      "'How many ranges satisfy a sum condition' → track complements (`prefix - k`) seen so far."
    ],
    "interviewRecall": [
      "Seed the map with `{0: 1}` so subarrays starting at index 0 are counted.",
      "The core line is `count += seen[prefix - k]`, then `seen[prefix] += 1` — look up before inserting.",
      "Store counts of each prefix, not just presence, since a value can recur many times."
    ]
  },
  {
    "id": "range-sum-query-immutable",
    "lc": 303,
    "title": "Range Sum Query - Immutable",
    "difficulty": "Easy",
    "category": "Prefix Sum",
    "link": "https://leetcode.com/problems/range-sum-query-immutable/",
    "meta": {
      "pattern": "Prefix Sum Precomputation",
      "dataStructure": "Array",
      "technique": "Precompute cumulative sums for O(1) queries"
    },
    "description": "Design a class `NumArray` that is initialized with an integer array `nums` and then answers many range-sum queries against it.\n\nThe method `sumRange(left, right)` must return the sum of the elements between indices `left` and `right` **inclusive**, i.e. `nums[left] + nums[left+1] + ... + nums[right]`.\n\nThe array is **immutable** (never updated after construction), and `sumRange` may be called many times, so the design should make each query cheap even if setup does more work.",
    "constraints": [
      "`1 <= nums.length <= 10^4`",
      "`-10^5 <= nums[i] <= 10^5`",
      "`0 <= left <= right < nums.length`",
      "At most `10^4` calls are made to `sumRange`."
    ],
    "notes": [
      "Because the array never changes, all heavy work can be done once in the constructor.",
      "Define `prefix[i]` as the sum of the first `i` elements, with `prefix[0] = 0`; then `sumRange(left, right) = prefix[right + 1] - prefix[left]`.",
      "The `+1` offset in the prefix array is what lets `left = 0` be handled without a special case."
    ],
    "examples": [
      {
        "input": "NumArray([-2, 0, 3, -5, 2, -1]); sumRange(0, 2)",
        "output": "1",
        "reasoning": "-2 + 0 + 3 = 1.",
        "visual": "```\n nums:    -2   0   3  -5   2  -1\n prefix: 0  -2  -2   1  -4  -2  -3   (prefix[0]=0)\n sumRange(0,2) = prefix[3] - prefix[0] = 1 - 0 = 1\n```"
      },
      {
        "input": "sumRange(2, 5)",
        "output": "-1",
        "reasoning": "3 + (-5) + 2 + (-1) = -1."
      },
      {
        "input": "sumRange(0, 5)",
        "output": "-3",
        "reasoning": "The sum of the whole array: prefix[6] - prefix[0] = -3 - 0 = -3."
      },
      {
        "input": "sumRange(3, 3)",
        "output": "-5",
        "reasoning": "A single-element range returns nums[3] = -5; prefix[4] - prefix[3] = -4 - 1 = -5."
      }
    ],
    "approaches": [
      {
        "name": "Brute Force — Re-sum on Every Query",
        "time": "O(1) init, O(n) per query",
        "space": "O(1) extra",
        "whenToUse": "Acceptable only when queries are rare; it re-walks the range every single call.",
        "logic": "**What it asks.** Support `sumRange(left, right)` returning the inclusive sum of that slice. This approach does no setup and simply adds the range up each time it is asked.\n\n**Why the naive idea fails.** Storing the array and looping from `left` to `right` on every call is correct, but each query is `O(n)` in the worst case. With up to `10^4` queries over a length-`10^4` array that is `10^8` additions, and it throws away the fact that the array never changes, which is exactly the property the prefix-sum version exploits for `O(1)` queries.\n\n**Key Idea.** Keep a reference to the original array in the constructor and compute each requested range on demand by iterating across it. No precomputation means a trivial constructor but an expensive, repeated query cost.\n\n**Step-by-Step Approach.**\n1. In `__init__`, store `nums` on the instance (for example as `self.nums`).\n2. In `sumRange`, initialize a `total` of zero.\n3. Loop `i` from `left` to `right` inclusive, adding `self.nums[i]` to `total`.\n4. Return `total`.\n\n**Why it works.** The loop directly accumulates exactly the elements `nums[left..right]`, so it returns the correct inclusive sum by definition. Correctness is never in doubt; only the per-query cost is.\n\n**Common Gotchas.**\n- The range is inclusive of `right`, so the loop must run to `right + 1` in a Python `range`.\n- Do not mutate `self.nums`; the array is immutable and shared.\n- Re-initialize `total` inside `sumRange`, not in the constructor, or results bleed across calls.\n\n**Complexity.** Time `O(1)` for construction and `O(n)` per query. Space `O(1)` beyond the stored array reference.\n\n**Interview mindset.** Mention this only to contrast it with the prefix-sum design; the word 'immutable' plus 'many queries' is a loud signal to move the work into the constructor instead.",
        "rcs": "from typing import List  # List[int] is the integer array the NumArray is built over.\n\n\nclass NumArray:  # LeetCode constructs one NumArray, then calls sumRange on it many times.\n\n    # ==================== PHASE 1: CONSTRUCTOR — JUST KEEP A REFERENCE ====================\n\n    def __init__(self, nums: List[int]):  # Called once; here we do no precomputation at all.\n\n        self.nums = nums  # Stash the array so sumRange can read it later.\n                          # State: self.nums points at the original array; we never modify it (it is immutable).\n                          # Trade-off: a cheap O(1) constructor buys an expensive O(n) query below.\n\n    # ==================== PHASE 2: QUERY — RE-ADD THE RANGE EACH TIME ====================\n\n    def sumRange(self, left: int, right: int) -> int:  # Return the inclusive sum nums[left..right].\n\n        total = 0  # Accumulator for this one query; reset fresh on every call.\n                   # Why inside the method: results must not leak between separate queries.\n\n        for i in range(left, right + 1):  # Inclusive of right, so iterate up to right + 1.\n                                          # Loop invariant: total holds the sum of nums[left..i-1] before this body.\n\n            total += self.nums[i]  # Add the current element into the running sum.\n                                   # State change: total grows by nums[i].\n\n        return total  # The accumulated inclusive sum of the requested range.",
        "plain": "class NumArray:\n    def __init__(self, nums: List[int]):\n        self.nums = nums\n\n    def sumRange(self, left: int, right: int) -> int:\n        total = 0\n        for i in range(left, right + 1):\n            total += self.nums[i]\n        return total"
      },
      {
        "name": "Optimized — Precomputed Prefix Sums",
        "time": "O(n) init, O(1) per query",
        "space": "O(n)",
        "whenToUse": "The expected answer: do the work once in the constructor so each query is constant time.",
        "logic": "**What it asks.** Answer each `sumRange(left, right)` in constant time, exploiting the fact that the array never changes so the heavy lifting can happen once.\n\n**Why the naive idea fails.** Re-summing on every call wastes the immutability of the array, repeating the same additions across overlapping queries and costing `O(n)` each time. Since the data is fixed, those sums can be computed a single time up front.\n\n**Key Idea.** Build a prefix-sum array where `prefix[i]` is the sum of the first `i` elements, with `prefix[0] = 0`. Then the inclusive sum of `nums[left..right]` is just `prefix[right + 1] - prefix[left]`: the cumulative sum up through `right` minus everything before `left`. The extra leading zero (so the array has length `n + 1`) is what makes `left = 0` work with the same formula, because `prefix[left]` then reads the seeded `0` instead of needing a special case.\n\n**Step-by-Step Approach.**\n1. In `__init__`, allocate `prefix` of length `n + 1` filled with zeros; `prefix[0] = 0` represents the empty prefix.\n2. For `i` from `0` to `n - 1`, set `prefix[i + 1] = prefix[i] + nums[i]`, so each entry is the cumulative sum of the first `i + 1` elements.\n3. Store `prefix` on the instance.\n4. In `sumRange(left, right)`, return `prefix[right + 1] - prefix[left]`.\n\n**Why it works.** By construction `prefix[j]` equals `nums[0] + ... + nums[j-1]`. Subtracting gives `prefix[right + 1] - prefix[left] = (nums[0..right]) - (nums[0..left-1]) = nums[left..right]`, the exact inclusive range sum. The leading zero makes the identity hold even when `left = 0`, since `prefix[0]` is `0`.\n\n**Common Gotchas.**\n- The prefix array has length `n + 1`, not `n`; off-by-one here is the classic mistake.\n- The query uses `right + 1` (not `right`) because the range is inclusive and `prefix` is offset by one.\n- Build `prefix` once in the constructor; rebuilding it inside `sumRange` reintroduces the `O(n)` cost you were avoiding.\n\n**Complexity.** Time `O(n)` to build the prefix array once, then `O(1)` per query. Space `O(n)` for the stored prefix array.\n\n**Interview mindset.** 'Immutable array' plus 'repeated range-sum queries' is the textbook cue for a precomputed prefix-sum array; the whole design is the one-line subtraction `prefix[right + 1] - prefix[left]`.",
        "rcs": "from typing import List  # List[int] is the integer array the NumArray is built over.\n\n\nclass NumArray:  # LeetCode constructs one NumArray, then calls sumRange on it many times.\n\n    # ==================== PHASE 1: CONSTRUCTOR — PRECOMPUTE CUMULATIVE SUMS ONCE ====================\n\n    def __init__(self, nums: List[int]):  # Called once; do all the heavy work here so queries are O(1).\n\n        n = len(nums)  # Number of elements; the prefix array will be one longer than this.\n\n        self.prefix = [0] * (n + 1)  # prefix[i] will hold the sum of the FIRST i elements; prefix[0] = 0 is the empty prefix.\n                                     # Why length n + 1: the leading 0 lets left = 0 use the same formula with no special case.\n\n        for i in range(n):  # Walk the array once, building each cumulative sum from the previous one.\n                            # Loop invariant: prefix[i] already holds the sum of nums[0..i-1] when this body runs.\n\n            self.prefix[i + 1] = self.prefix[i] + nums[i]  # Extend the running total by one element.\n                                                           # State change: prefix[i+1] = sum of the first i+1 elements.\n\n    # ==================== PHASE 2: QUERY — ONE SUBTRACTION, O(1) ====================\n\n    def sumRange(self, left: int, right: int) -> int:  # Return the inclusive sum nums[left..right].\n\n        return self.prefix[right + 1] - self.prefix[left]  # Cumulative sum through right MINUS everything before left.\n                                                           # Why right + 1: the range is inclusive and prefix is offset by one,\n                                                           # so prefix[right+1] covers nums[0..right] and prefix[left] covers nums[0..left-1].",
        "plain": "class NumArray:\n    def __init__(self, nums: List[int]):\n        n = len(nums)\n        self.prefix = [0] * (n + 1)\n        for i in range(n):\n            self.prefix[i + 1] = self.prefix[i] + nums[i]\n\n    def sumRange(self, left: int, right: int) -> int:\n        return self.prefix[right + 1] - self.prefix[left]"
      }
    ],
    "patternRecognition": [
      "'Immutable array' + 'many range-sum queries' → precompute a prefix-sum array in the constructor.",
      "Repeated overlapping range queries → trade O(n) setup for O(1) lookups.",
      "Any 'sum of nums[left..right]' question → cumulative sums with a leading zero."
    ],
    "interviewRecall": [
      "Make `prefix` length `n + 1` with `prefix[0] = 0` so `left = 0` needs no special case.",
      "The query is `prefix[right + 1] - prefix[left]` — note the `+1` from the inclusive range.",
      "Do the O(n) work once in `__init__`; each `sumRange` is then O(1)."
    ]
  }
    ]);
})();
