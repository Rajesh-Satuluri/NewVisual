/*
 * Blind 75 — Bit Manipulation
 * =========================================================================
 * Registers this category's problems on the global registry:
 *     window.BLIND75.register("Bit Manipulation", [ ...problems ]);
 *
 * Format mirrors data/arrays_hashing.js (the gold-standard reference).
 * All multi-line string fields use backtick template literals; no ${...}.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Bit Manipulation", [
    {
      id: "sum-of-two-integers",
      lc: 371,
      title: "Sum of Two Integers",
      difficulty: "Medium",
      category: "Bit Manipulation",
      link: "https://leetcode.com/problems/sum-of-two-integers/",
      meta: { pattern: "Bitwise Addition", dataStructure: "Integer bits", technique: "XOR sum + AND carry" },
      description:
        "Given two integers `a` and `b`, return their sum **without using the `+` or `-` operators**. You may only use bitwise operations.\n\n" +
        "Inputs can be negative, so your solution must handle two's-complement arithmetic correctly.",
      constraints: [
        "`-1000 <= a, b <= 1000`",
        "You may not use the `+` or `-` operators.",
        "Values fit in a signed 32-bit integer."
      ],
      notes: [
        "In languages with fixed 32-bit ints (Java/C++) overflow wraps naturally; in **Python** integers are unbounded, so you must **mask to 32 bits** yourself and re-interpret the sign at the end.",
        "This is really a question about how a hardware adder works: XOR produces the sum bits, AND-shifted produces the carry bits."
      ],
      examples: [
        {
          input: "a = 1, b = 2",
          output: "3",
          reasoning: "1 XOR 2 = 3 with no carry, so the answer is 3 in a single step.",
          visual:
            "```\n a = 01\n b = 10\n-------\nXOR  = 11  (sum without carry)\nAND<<1 = 00 (no carry)  -> done, result 11 = 3\n```"
        },
        {
          input: "a = 2, b = 3",
          output: "5",
          reasoning: "There is a carry out of bit 1, which must be folded back in.",
          visual:
            "```\nstep 1:  a=010  b=011\n  sum = a^b   = 001\n  carry=(a&b)<<1 = 100\nstep 2:  a=001  b=100\n  sum = a^b   = 101 = 5\n  carry=(a&b)<<1 = 000  -> done\n```"
        },
        {
          input: "a = -2, b = 3",
          output: "1",
          reasoning: "Negatives work identically once values are treated as 32-bit two's-complement patterns; the loop terminates and the final pattern is re-read as the signed value 1."
        },
        {
          input: "a = 0, b = 0",
          output: "0",
          reasoning: "No set bits at all, so both the running sum and carry are 0 immediately."
        }
      ],
      approaches: [
        {
          name: "Bitwise — XOR sum + AND carry",
          time: "O(1)",
          space: "O(1)",
          whenToUse: "The only real answer: any time addition must be simulated with bit operations.",
          logic:
            "**A. What is being asked?** Add two integers using only bitwise operators \u2014 essentially, build an adder by hand.\n\n" +
            "**B. Brute force is off the table.** We cannot use `+`, so we have to reconstruct what `+` does at the bit level.\n\n" +
            "**D. Key observation \u2014 split addition into two independent pieces.** When you add two bits you get a *sum bit* and a *carry bit*:\n" +
            "- `0+0=0`, `0+1=1`, `1+0=1`, `1+1=0 carry 1`.\n" +
            "That sum-without-carry table is **exactly XOR** (`a ^ b`). The carry is generated only where *both* bits are 1, and it applies to the **next** position up \u2014 that is `(a & b) << 1`.\n\n" +
            "**E. Pattern.** Repeatedly: let `a` hold the running sum-without-carry and `b` hold the carry that still needs to be added. Adding the carry can itself generate new carries, so we loop until there is no carry left (`b == 0`).\n\n" +
            "**F. Why it terminates.** Each iteration the carry shifts strictly left. After at most 32 shifts (for 32-bit values) the carry falls off the top and becomes 0, so the loop runs a bounded number of times \u2014 `O(1)`.\n\n" +
            "**G/H. What the variables hold.** `a` = partial sum so far; `b` = the pending carry to fold in next.\n\n" +
            "**I. Step by step.**\n" +
            "1. `sum = a ^ b` (add every column, ignoring carries).\n" +
            "2. `carry = (a & b) << 1` (carries move one column left).\n" +
            "3. Set `a = sum`, `b = carry`, repeat until `b == 0`.\n\n" +
            "**Python 32-bit masking (crucial).** Java/C++ ints wrap at 32 bits automatically, which is what makes two's-complement negatives work. **Python ints are unbounded**, so left-shifting a carry would grow forever and negatives would never settle. Fix: after every step AND with `mask = 0xFFFFFFFF` to keep only the low 32 bits. When the loop ends, if `a` is above `0x7FFFFFFF` the 32-bit pattern represents a **negative** number, so convert it back with `~(a ^ mask)` (flip the low 32 bits and negate) to recover Python's signed value.\n\n" +
            "**J. Why correct.** XOR + carry-shift is precisely the definition of binary addition; looping until the carry is exhausted reproduces a ripple-carry adder. Masking makes Python behave like a 32-bit machine so signs are handled the same way hardware handles them.\n\n" +
            "**K/L. Complexity.** At most ~32 iterations of constant work \u2192 time `O(1)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** \u201cAdd without +\u201d \u2192 immediately say: XOR is the sum, AND-shift is the carry, loop until carry is gone. Then mention the Python masking caveat \u2014 it is the detail interviewers look for.",
          rcs:
            "class Solution:\n" +
            "    def getSum(self, a: int, b: int) -> int:\n" +
            "        mask = 0xFFFFFFFF               # Keep only the low 32 bits (simulate a 32-bit int).\n" +
            "        while b & mask:                # Loop while there is still a carry within 32 bits.\n" +
            "            carry = (a & b) << 1       # Carry: set where BOTH bits are 1, shifted left.\n" +
            "            a = (a ^ b) & mask         # Sum without carry (XOR), truncated to 32 bits.\n" +
            "            b = carry & mask           # The carry becomes the next thing to add.\n" +
            "        # If a sits in the negative half of the 32-bit range, re-interpret its sign.\n" +
            "        return a if a <= 0x7FFFFFFF else ~(a ^ mask)",
          plain:
            "class Solution:\n" +
            "    def getSum(self, a: int, b: int) -> int:\n" +
            "        mask = 0xFFFFFFFF\n" +
            "        while b & mask:\n" +
            "            carry = (a & b) << 1\n" +
            "            a = (a ^ b) & mask\n" +
            "            b = carry & mask\n" +
            "        return a if a <= 0x7FFFFFFF else ~(a ^ mask)"
        }
      ],
      patternRecognition: [
        "\u201cAdd/subtract without arithmetic operators\u201d \u2192 simulate the adder with XOR (sum) and AND-shift (carry).",
        "Any problem that asks you to reason about carries bit by bit.",
        "In Python specifically, watch for the 32-bit masking requirement whenever bit tricks meet negative numbers."
      ],
      interviewRecall: [
        "XOR = sum without carry; (a & b) << 1 = carry; loop until carry is 0.",
        "Python needs mask = 0xFFFFFFFF because its ints are unbounded (no natural overflow).",
        "Final sign fix: if a > 0x7FFFFFFF it's negative -> return ~(a ^ mask)."
      ]
    },

    {
      id: "number-of-1-bits",
      lc: 191,
      title: "Number of 1 Bits",
      difficulty: "Easy",
      category: "Bit Manipulation",
      link: "https://leetcode.com/problems/number-of-1-bits/",
      meta: { pattern: "Population Count", dataStructure: "Integer bits", technique: "n & (n-1) clears lowest set bit" },
      description:
        "Write a function that takes an integer and returns the number of `1` bits it has in its binary representation (also called the **Hamming weight** or population count).",
      constraints: [
        "The input is a 32-bit unsigned integer.",
        "`0 <= n <= 2^32 - 1`"
      ],
      notes: [
        "The famous trick `n & (n - 1)` removes the **lowest set bit** each time, so the loop runs once per set bit rather than 32 times.",
        "In some LeetCode variants the input is given as a binary string; here it is an integer."
      ],
      examples: [
        {
          input: "n = 11",
          output: "3",
          reasoning: "11 is 1011 in binary, which has three 1 bits.",
          visual:
            "```\n11 = 1011\n     ^ ^^  three set bits -> answer 3\n```"
        },
        {
          input: "n = 128",
          output: "1",
          reasoning: "128 is 10000000, a single 1 bit."
        },
        {
          input: "n = 0",
          output: "0",
          reasoning: "No bits are set."
        },
        {
          input: "n = 4294967293",
          output: "31",
          reasoning: "That is 2^32 - 3 = 11111111111111111111111111111101; all 32 bits are 1 except bit 1, giving 31 ones."
        }
      ],
      approaches: [
        {
          name: "Naive — check each bit",
          time: "O(32) = O(1)",
          space: "O(1)",
          whenToUse: "Perfectly fine and easy to explain; loops a fixed 32 times regardless of how many bits are set.",
          logic:
            "**A. Asked.** Count how many bits equal 1.\n\n" +
            "**D. Idea.** Inspect the lowest bit with `n & 1`; if it is 1 add to the count. Then shift `n` right by one (`n >>= 1`) to expose the next bit, and repeat until `n` becomes 0.\n\n" +
            "**G/H. What we store.** A running `count` of ones and the shrinking value `n`.\n\n" +
            "**J. Correctness.** Every bit passes through position 0 exactly once as we shift, so each 1 is counted exactly once.\n\n" +
            "**K/L. Complexity.** At most 32 iterations \u2192 `O(1)` for a fixed-width integer, `O(1)` space.",
          rcs:
            "class Solution:\n" +
            "    def hammingWeight(self, n: int) -> int:\n" +
            "        count = 0                 # Number of 1 bits seen so far.\n" +
            "        while n:                  # Continue until every bit has been shifted out.\n" +
            "            count += n & 1        # Add 1 if the current lowest bit is set.\n" +
            "            n >>= 1               # Drop the lowest bit, expose the next one.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def hammingWeight(self, n: int) -> int:\n" +
            "        count = 0\n" +
            "        while n:\n" +
            "            count += n & 1\n" +
            "            n >>= 1\n" +
            "        return count"
        },
        {
          name: "Optimized — n & (n - 1)",
          time: "O(k), k = number of set bits",
          space: "O(1)",
          whenToUse: "The slick answer: loops once per set bit, so it is faster on sparse numbers.",
          logic:
            "**D. Key trick \u2014 `n & (n - 1)` clears the lowest set bit.** Subtracting 1 flips the lowest `1` to `0` and turns every `0` below it into `1`. AND-ing that with the original `n` wipes out the lowest set bit and leaves all higher bits untouched.\n\n" +
            "Concrete example with `n = 12 = 1100`:\n" +
            "- `n - 1 = 1011`\n" +
            "- `n & (n - 1) = 1100 & 1011 = 1000` \u2014 the lowest set bit (bit 2) is gone.\n\n" +
            "**E. Pattern.** Each application removes exactly one set bit, so if we count how many times we can do it before `n` reaches 0, that count is the number of 1 bits.\n\n" +
            "**F. Why it works.** `n - 1` borrows through the trailing zeros up to (and including) the lowest 1: that lowest 1 becomes 0, the zeros beneath it become 1s, and everything above is unchanged. AND with `n` keeps only the unchanged upper bits.\n\n" +
            "**I. Step by step.** While `n` is non-zero: do `n &= n - 1` (drop one set bit) and increment the count. Stop when `n == 0`.\n\n" +
            "**J. Correctness.** The loop runs exactly once per set bit, and there is nothing left when all set bits are cleared.\n\n" +
            "**K/L. Complexity.** Time `O(k)` where `k` is the number of set bits (at most 32), space `O(1)`.\n\n" +
            "**M. Interview mindset.** `n & (n - 1)` is the single most reused bit trick in interviews \u2014 knowing it also unlocks 'is power of two' (`n & (n-1) == 0`) and Counting Bits.",
          rcs:
            "class Solution:\n" +
            "    def hammingWeight(self, n: int) -> int:\n" +
            "        count = 0                 # Number of set bits removed so far.\n" +
            "        while n:                  # Repeat until no set bits remain.\n" +
            "            n &= n - 1            # Clear the LOWEST set bit in one step.\n" +
            "            count += 1            # We removed exactly one 1 bit.\n" +
            "        return count",
          plain:
            "class Solution:\n" +
            "    def hammingWeight(self, n: int) -> int:\n" +
            "        count = 0\n" +
            "        while n:\n" +
            "            n &= n - 1\n" +
            "            count += 1\n" +
            "        return count"
        }
      ],
      patternRecognition: [
        "\u201cCount / detect set bits\u201d is the canonical popcount problem.",
        "See `n & (n - 1)` anywhere and think 'clear the lowest set bit'.",
        "Sparse-bit inputs favor the n&(n-1) loop over shifting all 32 positions."
      ],
      interviewRecall: [
        "n & (n - 1) removes the lowest set bit; count the removals.",
        "Naive alternative: (n & 1) then n >>= 1 for up to 32 bits.",
        "Same trick powers 'power of two' checks: n > 0 and n & (n-1) == 0."
      ]
    },

    {
      id: "counting-bits",
      lc: 338,
      title: "Counting Bits",
      difficulty: "Easy",
      category: "Bit Manipulation",
      link: "https://leetcode.com/problems/counting-bits/",
      meta: { pattern: "Bit DP", dataStructure: "Array", technique: "dp[i] = dp[i>>1] + (i&1)" },
      description:
        "Given an integer `n`, return an array `ans` of length `n + 1` where `ans[i]` is the number of `1` bits in the binary representation of `i`, for every `i` from `0` to `n`.\n\n" +
        "Try to do it in a single pass and, ideally, in `O(n)` time without calling a popcount routine per number.",
      constraints: [
        "`0 <= n <= 10^5`"
      ],
      notes: [
        "The interesting version is the `O(n)` dynamic-programming solution, not calling a per-number bit count `n` times.",
        "`ans[0]` is always 0."
      ],
      examples: [
        {
          input: "n = 2",
          output: "[0, 1, 1]",
          reasoning: "0=0b0 (0 ones), 1=0b1 (1 one), 2=0b10 (1 one)."
        },
        {
          input: "n = 5",
          output: "[0, 1, 1, 2, 1, 2]",
          reasoning: "Counts for 0..5 are 0,1,1,2,1,2.",
          visual:
            "```\ni : bin  : ones\n0 : 000  : 0\n1 : 001  : 1\n2 : 010  : 1\n3 : 011  : 2\n4 : 100  : 1\n5 : 101  : 2\n```"
        },
        {
          input: "n = 0",
          output: "[0]",
          reasoning: "Only i=0, which has zero set bits."
        },
        {
          input: "n = 8",
          output: "[0, 1, 1, 2, 1, 2, 2, 3, 1]",
          reasoning: "8=0b1000 resets to a single 1 bit after 7=0b111 (three ones)."
        }
      ],
      approaches: [
        {
          name: "Naive — popcount each number",
          time: "O(n log n)",
          space: "O(1) extra",
          whenToUse: "Simple and correct; fine when n is small or you just want to state the obvious baseline first.",
          logic:
            "**A. Asked.** Produce the set-bit count for every value in `0..n`.\n\n" +
            "**B. Brute force.** For each `i`, count its bits independently using the `i & (i - 1)` trick (clear the lowest set bit, count the removals).\n\n" +
            "**C. Why it is not ideal.** Each number costs up to `O(log i)` work, so the whole array is `O(n log n)`. It repeats effort \u2014 the bit count of `i` is closely related to that of a smaller number, which the DP approach exploits.\n\n" +
            "**I. Step by step.** Loop `i` from 0 to `n`; for each, run the clear-lowest-set-bit loop to get its popcount and store it.\n\n" +
            "**K/L. Complexity.** Time `O(n log n)`, space `O(1)` beyond the required output.",
          rcs:
            "class Solution:\n" +
            "    def countBits(self, n: int) -> List[int]:\n" +
            "        def popcount(x: int) -> int:\n" +
            "            c = 0\n" +
            "            while x:               # Clear one set bit per iteration.\n" +
            "                x &= x - 1         # Drop the lowest set bit.\n" +
            "                c += 1\n" +
            "            return c\n" +
            "        return [popcount(i) for i in range(n + 1)]  # Count each number independently.",
          plain:
            "class Solution:\n" +
            "    def countBits(self, n: int) -> List[int]:\n" +
            "        def popcount(x: int) -> int:\n" +
            "            c = 0\n" +
            "            while x:\n" +
            "                x &= x - 1\n" +
            "                c += 1\n" +
            "            return c\n" +
            "        return [popcount(i) for i in range(n + 1)]"
        },
        {
          name: "Optimized — DP dp[i] = dp[i >> 1] + (i & 1)",
          time: "O(n)",
          space: "O(1) extra",
          whenToUse: "The intended answer: reuse already-computed smaller results to build each count in O(1).",
          logic:
            "**D. Key observation.** The binary form of `i` is the binary form of `i >> 1` (i.e. `i // 2`) with one extra bit \u2014 the lowest bit of `i` \u2014 appended at the bottom. So the number of ones in `i` equals the number of ones in `i >> 1` **plus** the lowest bit of `i` itself.\n\n" +
            "Concretely, `i = 13 = 1101`. Then `i >> 1 = 110 = 6` which has two ones, and the dropped lowest bit `i & 1 = 1`. So `ones(13) = ones(6) + 1 = 2 + 1 = 3`. Check: `1101` has three ones.\n\n" +
            "**E. Pattern \u2014 dynamic programming over bits.** Define `dp[i]` = number of set bits in `i`. Because `i >> 1 < i`, its answer is already computed when we reach `i`, so we can fill the array left to right.\n\n" +
            "**Transition.** `dp[i] = dp[i >> 1] + (i & 1)`.\n\n" +
            "**Base case.** `dp[0] = 0`.\n\n" +
            "**F. Why the transition is correct.** Right-shifting by one discards exactly the lowest bit and keeps all higher bits in place, so `ones(i)` = `ones(i without its lowest bit)` + `value of that lowest bit`. The lowest bit's value is `i & 1` (0 or 1).\n\n" +
            "**I. Step by step.** Allocate `dp` of length `n + 1` filled with 0. For `i` from 1 to `n`, set `dp[i] = dp[i >> 1] + (i & 1)`. Return `dp`.\n\n" +
            "**J. Correctness.** Each `dp[i]` depends only on a strictly smaller, already-finalized index, so by induction every entry is exact.\n\n" +
            "**K/L. Complexity.** One `O(1)` step per index \u2192 time `O(n)`, `O(1)` extra space beyond the output.\n\n" +
            "**M. Interview mindset.** Recognizing that a number relates to its halved self is the whole insight \u2014 an alternative DP is `dp[i] = dp[i & (i - 1)] + 1` (one more than the number with its lowest bit cleared).",
          rcs:
            "class Solution:\n" +
            "    def countBits(self, n: int) -> List[int]:\n" +
            "        dp = [0] * (n + 1)             # dp[i] = number of set bits in i; dp[0] = 0.\n" +
            "        for i in range(1, n + 1):\n" +
            "            dp[i] = dp[i >> 1] + (i & 1)  # Ones in i//2, plus i's own lowest bit.\n" +
            "        return dp",
          plain:
            "class Solution:\n" +
            "    def countBits(self, n: int) -> List[int]:\n" +
            "        dp = [0] * (n + 1)\n" +
            "        for i in range(1, n + 1):\n" +
            "            dp[i] = dp[i >> 1] + (i & 1)\n" +
            "        return dp"
        }
      ],
      patternRecognition: [
        "\u201cCompute a bit property for every number up to n\u201d hints at reusing smaller results (bit DP).",
        "Relating i to i >> 1 or to i & (i - 1) is the DP hook.",
        "If a per-number popcount feels wasteful, look for the O(n) recurrence."
      ],
      interviewRecall: [
        "dp[i] = dp[i >> 1] + (i & 1): ones of i//2 plus the lowest bit.",
        "Alternative recurrence: dp[i] = dp[i & (i - 1)] + 1.",
        "State the O(n log n) per-number popcount baseline before the O(n) DP."
      ]
    },

    {
      id: "missing-number",
      lc: 268,
      title: "Missing Number",
      difficulty: "Easy",
      category: "Bit Manipulation",
      link: "https://leetcode.com/problems/missing-number/",
      meta: { pattern: "XOR Pairing / Gauss Sum", dataStructure: "Array", technique: "XOR indices with values" },
      description:
        "Given an array `nums` containing `n` **distinct** numbers drawn from the range `[0, n]`, exactly one number in that range is missing. Return the missing number.\n\n" +
        "Aim for `O(n)` time and `O(1)` extra space.",
      constraints: [
        "`n == nums.length`",
        "`0 <= n <= 10^4`",
        "`0 <= nums[i] <= n`",
        "All values in `nums` are distinct."
      ],
      notes: [
        "The array holds `n` numbers but the range `[0, n]` has `n + 1` possible values, so exactly one is absent.",
        "Both the XOR method and the Gauss-sum method achieve O(n) time and O(1) space; XOR avoids any overflow concern."
      ],
      examples: [
        {
          input: "nums = [3, 0, 1]",
          output: "2",
          reasoning: "n = 3, so the range is 0..3; 2 is the only value not present.",
          visual:
            "```\nindices: 0 1 2   (and n=3)\nvalues : 3 0 1\nXOR indices+n : 0^1^2^3 = 0\nXOR values    : 3^0^1   = 2\ntotal XOR     : 0 ^ 2   = 2  -> missing\n```"
        },
        {
          input: "nums = [0, 1]",
          output: "2",
          reasoning: "Range is 0..2; both 0 and 1 are present, so 2 is missing."
        },
        {
          input: "nums = [9, 6, 4, 2, 3, 5, 7, 0, 1]",
          output: "8",
          reasoning: "n = 9, range 0..9; every value except 8 appears."
        },
        {
          input: "nums = [0]",
          output: "1",
          reasoning: "n = 1, range 0..1; 0 is present so 1 is missing."
        }
      ],
      approaches: [
        {
          name: "Gauss sum",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "Cleanest to explain: the missing value is the expected total minus the actual total.",
          logic:
            "**A. Asked.** Find the one value from `0..n` that is not in the array.\n\n" +
            "**D. Key observation.** The sum of all integers from `0` to `n` is fixed: `n * (n + 1) / 2` (Gauss's formula). If we subtract the actual sum of the array from that expected total, everything present cancels and only the **missing** number remains.\n\n" +
            "**I. Step by step.** Compute `expected = n * (n + 1) // 2`, compute `actual = sum(nums)`, return `expected - actual`.\n\n" +
            "**J. Correctness.** `expected` counts every value in `0..n` exactly once; `actual` counts every present value exactly once. Their difference is precisely the single absent value.\n\n" +
            "**K/L. Complexity.** One pass to sum \u2192 time `O(n)`, space `O(1)`.\n\n" +
            "**Caveat.** In fixed-width languages the sum can overflow for large `n`; that is why XOR is often preferred. Python integers are unbounded, so this is safe here.",
          rcs:
            "class Solution:\n" +
            "    def missingNumber(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)                     # Range is 0..n (n+1 possible values).\n" +
            "        expected = n * (n + 1) // 2       # Sum of 0..n via Gauss's formula.\n" +
            "        return expected - sum(nums)       # Present values cancel; the gap is the answer.",
          plain:
            "class Solution:\n" +
            "    def missingNumber(self, nums: List[int]) -> int:\n" +
            "        n = len(nums)\n" +
            "        expected = n * (n + 1) // 2\n" +
            "        return expected - sum(nums)"
        },
        {
          name: "Optimized — XOR indices with values",
          time: "O(n)",
          space: "O(1)",
          whenToUse: "Preferred bit-manipulation answer: no overflow risk and pure O(1) space.",
          logic:
            "**D. Key XOR properties.** XOR has three properties that make this work:\n" +
            "- `x ^ x = 0` (a value XORed with itself cancels).\n" +
            "- `x ^ 0 = x` (0 is the identity).\n" +
            "- XOR is commutative and associative, so order does not matter.\n\n" +
            "**E. The idea.** If we XOR together **all indices `0..n`** and **all values in the array**, every number that is *present* appears exactly twice \u2014 once as an index (or as the extra `n`) and once as a value \u2014 and cancels to 0. The one value that is missing appears only once (as an index) and survives.\n\n" +
            "**F. Why it works.** Start the accumulator at `n` (to cover the top index that has no array slot). Then for each position `i`, fold in both `i` and `nums[i]`. Present values pair up index-with-value and vanish; the absent value has no matching array entry, so it remains.\n\n" +
            "Concrete trace on `nums = [3, 0, 1]`, `n = 3`:\n" +
            "- start `result = 3`\n" +
            "- i=0: `result ^= 0 ^ 3` \u2192 `3 ^ 0 ^ 3 = 0`\n" +
            "- i=1: `result ^= 1 ^ 0` \u2192 `0 ^ 1 ^ 0 = 1`\n" +
            "- i=2: `result ^= 2 ^ 1` \u2192 `1 ^ 2 ^ 1 = 2` \u2192 missing number is 2.\n\n" +
            "**I. Step by step.** Initialize `result = len(nums)`. For each `i, num`, do `result ^= i ^ num`. Return `result`.\n\n" +
            "**J. Correctness.** Every value in `0..n` except the missing one is XORed an even number of times (cancels to 0); the missing value is XORed exactly once, so it is what remains.\n\n" +
            "**K/L. Complexity.** One pass \u2192 time `O(n)`, space `O(1)`. No sum, so no overflow.\n\n" +
            "**M. Interview mindset.** \u201cEverything appears twice except one\u201d is the flagship XOR signal \u2014 here we manufacture the pairing by XORing indices against values.",
          rcs:
            "class Solution:\n" +
            "    def missingNumber(self, nums: List[int]) -> int:\n" +
            "        result = len(nums)               # Seed with n (the index that has no array slot).\n" +
            "        for i, num in enumerate(nums):   # Fold in each index and its value.\n" +
            "            result ^= i ^ num            # Present numbers cancel; the missing one survives.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def missingNumber(self, nums: List[int]) -> int:\n" +
            "        result = len(nums)\n" +
            "        for i, num in enumerate(nums):\n" +
            "            result ^= i ^ num\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "\u201cExactly one element missing / everything else pairs up\u201d \u2192 XOR to cancel pairs.",
        "A contiguous range 0..n with one gap \u2192 Gauss sum or XOR of indices vs values.",
        "Constraints demand O(1) space, ruling out a seen-set or sorting."
      ],
      interviewRecall: [
        "XOR properties: x^x=0, x^0=x, order-independent.",
        "Seed the accumulator with n, then XOR every index and value together.",
        "Gauss alternative: n*(n+1)//2 - sum(nums); XOR avoids overflow."
      ]
    },

    {
      id: "reverse-bits",
      lc: 190,
      title: "Reverse Bits",
      difficulty: "Easy",
      category: "Bit Manipulation",
      link: "https://leetcode.com/problems/reverse-bits/",
      meta: { pattern: "Bit Reversal", dataStructure: "Integer bits", technique: "Shift result, pull lowest bit" },
      description:
        "Reverse the bits of a given 32-bit **unsigned** integer. The most significant bit becomes the least significant and vice versa, producing the mirror image of the 32-bit pattern.",
      constraints: [
        "The input is a 32-bit unsigned integer.",
        "`0 <= n <= 2^32 - 1`"
      ],
      notes: [
        "Always process exactly **32** bits, including leading zeros \u2014 those zeros become trailing zeros in the result and matter to the answer.",
        "If the function is called many times, caching results per byte (a lookup table) is a common follow-up optimization."
      ],
      examples: [
        {
          input: "n = 43261596",
          output: "964176192",
          reasoning: "00000010100101000001111010011100 reversed is 00111001011110000010100101000000.",
          visual:
            "```\ninput : 00000010100101000001111010011100\nreverse each bit position (mirror):\noutput: 00111001011110000010100101000000\n```"
        },
        {
          input: "n = 4294967293",
          output: "3221225471",
          reasoning: "11111111111111111111111111111101 reversed is 10111111111111111111111111111111."
        },
        {
          input: "n = 1",
          output: "2147483648",
          reasoning: "The lowest bit (bit 0) moves to the highest position (bit 31) = 2^31 = 2147483648.",
          visual:
            "```\ninput : 00000000000000000000000000000001\noutput: 10000000000000000000000000000000  (2^31)\n```"
        },
        {
          input: "n = 0",
          output: "0",
          reasoning: "All zeros reversed are still all zeros."
        }
      ],
      approaches: [
        {
          name: "Bit-by-bit build",
          time: "O(32) = O(1)",
          space: "O(1)",
          whenToUse: "The standard approach: pull bits off one end of the input and push them onto the other end of the result.",
          logic:
            "**A. Asked.** Produce the value whose 32-bit binary pattern is the input's pattern reversed.\n\n" +
            "**D. Key idea \u2014 pour from one end into the other.** Think of two containers. We repeatedly take the **lowest** bit of the input (`n & 1`) and place it as the **next-lowest** bit of the result. But between placements we shift the result **left**, so each bit we add lands one position higher than the previous \u2014 effectively reversing the order.\n\n" +
            "**E. Pattern.** Build the answer over exactly 32 iterations:\n" +
            "- `result = (result << 1) | (n & 1)` \u2014 make room in the result and drop in the input's current lowest bit.\n" +
            "- `n >>= 1` \u2014 discard the bit we just consumed, exposing the next one.\n\n" +
            "**F. Why it reverses.** The **first** bit we read is the input's least significant bit; after 31 more left-shifts of the result it ends up in the **most significant** position. The **last** bit we read (input's MSB) is the final one appended and stays least significant. That is exactly a mirror.\n\n" +
            "Small 4-bit illustration with `n = 1011` (reading right to left, building left to right):\n" +
            "```\nread 1 -> result 1\nread 1 -> result 11\nread 0 -> result 110\nread 1 -> result 1101\n```\n" +
            "`1011` reversed is `1101`.\n\n" +
            "**G/H. What we store.** `result` accumulates the reversed bits; `n` is consumed one bit at a time.\n\n" +
            "**I. Step by step.** Loop 32 times: shift `result` left by 1, OR in `n & 1`, then shift `n` right by 1.\n\n" +
            "**J. Why correct / fixed 32 iterations.** We must run exactly 32 times so leading zeros of the input are reversed into trailing zeros of the result; stopping early (e.g. when `n` hits 0) would drop those and give the wrong magnitude.\n\n" +
            "**K/L. Complexity.** Fixed 32 iterations \u2192 time `O(1)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** \u201cReverse bits\u201d \u2192 shift-in/shift-out over a fixed width; emphasize the fixed 32 loops so the leading zeros are handled.",
          rcs:
            "class Solution:\n" +
            "    def reverseBits(self, n: int) -> int:\n" +
            "        result = 0\n" +
            "        for _ in range(32):                # Exactly 32 bits, including leading zeros.\n" +
            "            result = (result << 1) | (n & 1)  # Make room, then append n's lowest bit.\n" +
            "            n >>= 1                        # Consume that bit; expose the next one.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def reverseBits(self, n: int) -> int:\n" +
            "        result = 0\n" +
            "        for _ in range(32):\n" +
            "            result = (result << 1) | (n & 1)\n" +
            "            n >>= 1\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "\u201cReverse / mirror the bits of a fixed-width integer\u201d \u2192 shift-out of one, shift-into the other.",
        "Any fixed-width bit rearrangement loops a constant number of times (here 32).",
        "Leading zeros matter \u2014 they become trailing zeros, so never stop early."
      ],
      interviewRecall: [
        "result = (result << 1) | (n & 1); n >>= 1; repeat exactly 32 times.",
        "The first bit read (LSB) ends up as the MSB \u2014 that is the reversal.",
        "Loop a fixed 32 times so leading zeros are reversed correctly."
      ]
    }
  ]);
})();
