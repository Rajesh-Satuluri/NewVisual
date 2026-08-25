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
            "**What it asks.** Add two integers `a` and `b` and return their sum using only bitwise operators \u2014 no `+` or `-`. In effect, you have to build a hardware adder by hand.\n\n" +
            "**Why the naive idea fails.** The obvious move is to just write `a + b`, but that is exactly the operator we are forbidden to use. There is no arithmetic shortcut; we must reconstruct what `+` does at the level of individual bits.\n\n" +
            "**Key Idea.** Adding two bits produces a *sum bit* and a *carry bit*, and each can be computed separately with a bitwise operator. The sum-without-carry table is `0+0=0`, `0+1=1`, `1+0=1`, `1+1=0` \u2014 that is **exactly XOR** (`a ^ b`). A carry is generated only where *both* bits are 1, and it belongs one column to the left, which is `(a & b) << 1`. So addition splits into two independent pieces: XOR gives every column's sum ignoring carries, and AND-shift gives the carries. Folding the carry back in can generate new carries, so we repeat until no carry remains.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Let `a` hold the running sum-without-carry and `b` hold the carry still waiting to be added.\n" +
            "2. Compute `sum = a ^ b` \u2014 add every column, ignoring carries.\n" +
            "3. Compute `carry = (a & b) << 1` \u2014 the carries, moved one column left.\n" +
            "4. Set `a = sum` and `b = carry`, then repeat from step 2.\n" +
            "5. Stop when `b == 0`; the answer is `a`.\n\n" +
            "**Python 32-bit masking (crucial).** Java/C++ ints wrap at 32 bits automatically, which is what makes two's-complement negatives work. `Python` ints are unbounded, so a left-shifted carry would grow forever and negatives would never settle. The fix: after every step AND with `mask = 0xFFFFFFFF` to keep only the low 32 bits. When the loop ends, if `a` is above `0x7FFFFFFF` the 32-bit pattern represents a **negative** number, so convert it back with `~(a ^ mask)` (flip the low 32 bits and negate) to recover Python's signed value.\n\n" +
            "**Why it works.** XOR plus carry-shift is precisely the definition of binary addition, so looping until the carry is exhausted reproduces a ripple-carry adder. Each iteration the carry shifts strictly left, so after at most 32 shifts it falls off the top and becomes 0 \u2014 the loop is guaranteed to terminate. Masking makes Python behave like a fixed-width 32-bit machine, so signs are handled exactly as hardware handles them.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting the mask in Python: the carry keeps growing and the loop never ends (or negatives never resolve).\n" +
            "- Skipping the final sign fix: without it, negative results come back as huge positive numbers.\n" +
            "- Looping on `b` alone rather than `b & mask` \u2014 out-of-range carry bits can keep the loop alive spuriously.\n\n" +
            "**Complexity.** Time `O(1)` \u2014 at most ~32 iterations of constant work. Space `O(1)`.\n\n" +
            "**Interview mindset.** \u201cAdd without `+`\u201d should immediately trigger: XOR is the sum, AND-shift is the carry, loop until the carry is gone. Then volunteer the Python masking caveat \u2014 it is the detail interviewers are listening for.",
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
            "**What it asks.** Given an integer, return how many of its bits equal `1` \u2014 its Hamming weight, or population count.\n\n" +
            "**The idea.** Walk the bits one at a time from the bottom. Inspect the lowest bit with `n & 1`; if it is `1`, add to the count. Then shift `n` right by one (`n >>= 1`) to expose the next bit, and repeat until `n` becomes 0. This is the straightforward baseline: it always does a fixed amount of work per bit position, regardless of how many bits are actually set.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `count = 0`; `n` is the shrinking value we consume bit by bit.\n" +
            "2. While `n` is non-zero, add `n & 1` to `count` (adds 1 exactly when the current lowest bit is set).\n" +
            "3. Shift `n` right by one to drop the bit just examined and expose the next.\n" +
            "4. When `n` reaches 0, return `count`.\n\n" +
            "**Why it works.** Every bit of the original number passes through position 0 exactly once as we keep shifting right, so each `1` is inspected and counted exactly once, and no bit is counted twice.\n\n" +
            "**Common Gotchas.**\n" +
            "- For `n = 0` the loop body never runs and correctly returns 0.\n" +
            "- In fixed-width languages a signed right shift can smear the sign bit; use an unsigned shift or a 32-iteration loop. Python ints are non-negative here, so `n >>= 1` is safe.\n\n" +
            "**Complexity.** Time `O(1)` \u2014 at most 32 iterations for a fixed-width integer. Space `O(1)`.\n\n" +
            "**Interview mindset.** \u201cCount the set bits\u201d has this shift-and-mask baseline as the obvious first answer; state it plainly, then reach for the faster `n & (n - 1)` trick.",
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
            "**What it asks.** Return the number of `1` bits in an integer \u2014 but loop once per set bit instead of once per bit position, so sparse numbers are handled faster.\n\n" +
            "**Why the naive idea is slower.** Shifting through all 32 positions does constant work per position even when almost every bit is 0. If only a few bits are set, most of that work is wasted. We want the loop count to track the number of ones, not the width of the integer.\n\n" +
            "**Key Idea.** The trick `n & (n - 1)` clears the lowest set bit in one step. Subtracting 1 flips the lowest `1` to `0` and turns every `0` below it into `1`; AND-ing that with the original `n` wipes out that lowest set bit and leaves all higher bits untouched. For example with `n = 12 = 1100`: `n - 1 = 1011`, and `n & (n - 1) = 1100 & 1011 = 1000` \u2014 the lowest set bit (bit 2) is gone. Because each application removes exactly one set bit, the number of applications needed to reach 0 *is* the number of 1 bits.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `count = 0`.\n" +
            "2. While `n` is non-zero, do `n &= n - 1` to drop the lowest set bit.\n" +
            "3. Increment `count` \u2014 one set bit was just removed.\n" +
            "4. Stop when `n == 0` and return `count`.\n\n" +
            "**Why it works.** `n - 1` borrows through the trailing zeros up to and including the lowest `1`: that lowest `1` becomes `0`, the zeros beneath it become `1`s, and everything above is unchanged. AND-ing with `n` keeps only those unchanged upper bits, so precisely one set bit disappears per iteration. The loop therefore runs exactly once per set bit and terminates when the last one is cleared.\n\n" +
            "**Common Gotchas.**\n" +
            "- For `n = 0` the loop never runs and returns 0 correctly.\n" +
            "- Remember the operation clears the *lowest* set bit, not the highest \u2014 don't expect it to strip from the top.\n" +
            "- The same identity `n & (n - 1) == 0` (for `n > 0`) is the standard power-of-two check.\n\n" +
            "**Complexity.** Time `O(k)` where `k` is the number of set bits (at most 32). Space `O(1)`.\n\n" +
            "**Interview mindset.** `n & (n - 1)` is the single most reused bit trick in interviews \u2014 recognizing it also unlocks the power-of-two test and the Counting Bits recurrence.",
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
            "**What it asks.** Produce an array whose `i`-th entry is the number of `1` bits in `i`, for every `i` from `0` to `n`.\n\n" +
            "**The idea and why it's not ideal.** The obvious approach is to count each number's bits independently: for every `i`, run the `i & (i - 1)` loop (clear the lowest set bit, count the removals). It is simple and correct, but each number costs up to `O(log i)` work, making the whole array `O(n log n)`. Worse, it repeats effort \u2014 the bit count of `i` is closely related to that of a smaller, already-computed number, a relationship the DP approach exploits to reach `O(n)`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Loop `i` from `0` to `n`.\n" +
            "2. For each `i`, run the clear-lowest-set-bit loop (`i &= i - 1`, incrementing a counter) to get its popcount.\n" +
            "3. Store that count at position `i` in the result.\n\n" +
            "**Why it works.** The per-number popcount is itself exact \u2014 each pass removes exactly one set bit and counts it \u2014 so filling every index with an independently correct value yields the correct array.\n\n" +
            "**Common Gotchas.**\n" +
            "- The result array has length `n + 1`, not `n` \u2014 index `0` through `n` inclusive.\n" +
            "- `ans[0]` is always 0; the inner loop handles this naturally.\n\n" +
            "**Complexity.** Time `O(n log n)` \u2014 up to `O(log i)` per number. Space `O(1)` beyond the required output.\n\n" +
            "**Interview mindset.** State this per-number baseline first to show you can solve it, then note the wasted, repeated work \u2014 that observation is the natural bridge to the `O(n)` DP.",
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
            "**What it asks.** Return, in a single `O(n)` pass, the set-bit count of every integer from `0` to `n` \u2014 without calling a popcount routine per number.\n\n" +
            "**Why the naive idea falls short.** Counting each number's bits independently costs `O(log i)` per value and `O(n log n)` overall, and it recomputes work that a smaller number already established. We want to reuse those smaller results so each new count is `O(1)`.\n\n" +
            "**Key Idea.** Define `dp[i]` as the number of set bits in `i`. The binary form of `i` is the binary form of `i >> 1` (i.e. `i // 2`) with one extra bit \u2014 the lowest bit of `i` \u2014 appended at the bottom. So the ones in `i` equal the ones in `i >> 1` **plus** the lowest bit of `i` itself. Concretely, `i = 13 = 1101`: then `i >> 1 = 110 = 6` has two ones, and the dropped lowest bit is `i & 1 = 1`, giving `ones(13) = ones(6) + 1 = 3`. Since `i >> 1 < i`, that smaller answer is already computed when we reach `i`, so we fill the array left to right.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Allocate `dp` of length `n + 1` filled with 0. The base case is `dp[0] = 0` (zero has no set bits).\n" +
            "2. Loop `i` from `1` to `n`.\n" +
            "3. Apply the transition `dp[i] = dp[i >> 1] + (i & 1)` \u2014 the ones in `i // 2`, plus `i`'s own lowest bit.\n" +
            "4. Return `dp`.\n\n" +
            "**Why it works.** Right-shifting by one discards exactly the lowest bit and keeps all higher bits in place, so `ones(i)` equals `ones(i with its lowest bit removed)` plus the value of that lowest bit, which is `i & 1` (0 or 1) \u2014 the transition is exactly this identity. Each `dp[i]` depends only on a strictly smaller, already-finalized index, so by induction every entry is exact.\n\n" +
            "**Common Gotchas.**\n" +
            "- The array length is `n + 1`; starting the loop at `1` leaves the correct `dp[0] = 0` base case intact.\n" +
            "- Use `i >> 1` (or `i // 2`), not a signed shift that could misbehave on negatives \u2014 inputs here are non-negative.\n" +
            "- An equivalent recurrence is `dp[i] = dp[i & (i - 1)] + 1` (one more than the number with its lowest set bit cleared); don't mix the two up.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 one constant-time step per index. Space `O(1)` extra beyond the required output array.\n\n" +
            "**Interview mindset.** \u201cCompute a bit property for every number up to n\u201d signals reusing a smaller already-solved subproblem \u2014 relating `i` to `i >> 1` (or to `i & (i - 1)`) is the DP hook that turns `O(n log n)` into `O(n)`.",
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
            "**What it asks.** An array holds `n` distinct numbers drawn from the range `0..n`, which has `n + 1` possible values, so exactly one is absent. Find that missing value.\n\n" +
            "**Why the naive idea is heavier.** You could sort and scan for the gap (`O(n log n)`), or build a hash set of the values and check each candidate (`O(n)` time but `O(n)` extra space). Both do more work than necessary when a closed-form total is available.\n\n" +
            "**Key Idea.** The sum of all integers from `0` to `n` is fixed by Gauss's formula: `n * (n + 1) / 2`. If you subtract the actual sum of the array from that expected total, every value that is *present* cancels out, and only the single **missing** number remains.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Let `n` be the array length; the range is `0..n`.\n" +
            "2. Compute `expected = n * (n + 1) // 2` \u2014 the sum of the full range.\n" +
            "3. Compute `actual = sum(nums)` \u2014 the sum of what is actually present.\n" +
            "4. Return `expected - actual`.\n\n" +
            "**Why it works.** `expected` counts every value in `0..n` exactly once, and `actual` counts every present value exactly once. Subtracting removes each present value entirely, leaving precisely the one absent value as the difference.\n\n" +
            "**Common Gotchas.**\n" +
            "- The range size is `n + 1`, so `expected` uses the length `n` in `n * (n + 1) // 2` \u2014 off-by-one here gives a wrong total.\n" +
            "- In fixed-width languages the sum can overflow for large `n`, which is why XOR is often preferred; Python integers are unbounded, so this is safe here.\n" +
            "- Use integer division (`//`) so `expected` stays an exact integer.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 one pass to sum the array. Space `O(1)`.\n\n" +
            "**Interview mindset.** A contiguous range `0..n` with a single gap should suggest a closed-form total: the expected sum minus the actual sum isolates the missing element without extra space.",
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
            "**What it asks.** Find the single value from `0..n` missing from an array of `n` distinct numbers \u2014 the preferred bit-manipulation answer, with no overflow risk and pure `O(1)` space.\n\n" +
            "**Why the naive idea is heavier.** Sorting is `O(n log n)`, and a hash set of seen values costs `O(n)` extra space. The Gauss-sum trick is `O(1)` space but can overflow in fixed-width languages. We want the space efficiency without any arithmetic overflow.\n\n" +
            "**Key Idea.** XOR has three properties that make this work: `x ^ x = 0` (a value XORed with itself cancels), `x ^ 0 = x` (0 is the identity), and XOR is commutative and associative so order does not matter. If we XOR together **all indices `0..n`** and **all values in the array**, every *present* number appears exactly twice \u2014 once as an index (or as the extra top value `n`) and once as an array value \u2014 and cancels to 0. The one missing value appears only once (as an index) and survives.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `result = len(nums)` \u2014 this seeds the accumulator with `n`, the top index that has no array slot.\n" +
            "2. For each position, fold in both the index `i` and the value `nums[i]` with `result ^= i ^ num`.\n" +
            "3. After the full pass, return `result`.\n\n" +
            "Concrete trace on `nums = [3, 0, 1]`, `n = 3`: start `result = 3`; at `i=0`, `result ^= 0 ^ 3` gives `0`; at `i=1`, `result ^= 1 ^ 0` gives `1`; at `i=2`, `result ^= 2 ^ 1` gives `2` \u2014 the missing number.\n\n" +
            "**Why it works.** Every value in `0..n` except the missing one is XORed an even number of times (once as an index, once as a value) and cancels to 0; the missing value is XORed exactly once \u2014 it has no matching array entry \u2014 so it is precisely what remains.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to seed `result` with `n`: the top index has no array slot, so without it that value is never paired.\n" +
            "- XOR needs each present value to pair index-with-value, which relies on the values being distinct and within `0..n`.\n" +
            "- Unlike the sum method, there is no overflow to worry about \u2014 a point worth stating.\n\n" +
            "**Complexity.** Time `O(n)` \u2014 a single pass. Space `O(1)`, with no sum and thus no overflow.\n\n" +
            "**Interview mindset.** \u201cEverything appears twice except one\u201d is the flagship XOR signal; here we manufacture that pairing by XORing indices against values to cancel all present numbers.",
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
            "**What it asks.** Given a 32-bit unsigned integer, produce the value whose 32-bit binary pattern is the input's pattern reversed \u2014 the most significant bit becomes the least significant and vice versa.\n\n" +
            "**Why care about the naive framing.** It is tempting to convert to a bit string, reverse it, and convert back, but that is clumsy and easy to get wrong on width. A direct bit-shuffle over a fixed 32 positions is cleaner and constant space \u2014 the key is to process exactly 32 bits so leading zeros are handled.\n\n" +
            "**Key Idea.** Pour bits from one end of the input into the other end of the result. Repeatedly take the **lowest** bit of the input (`n & 1`) and append it to the result \u2014 but before each append, shift the result **left** by one. Because the result shifts left every step, each bit lands one position higher than the last, so the first bit read ends up highest and the last bit read stays lowest: the order is mirrored. Small 4-bit trace with `n = 1011` (reading right to left, building left to right): read `1` -> `1`; read `1` -> `11`; read `0` -> `110`; read `1` -> `1101`. So `1011` reverses to `1101`.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start `result = 0`; `n` is consumed one bit at a time.\n" +
            "2. Repeat exactly 32 times: set `result = (result << 1) | (n & 1)` \u2014 make room, then drop in the input's current lowest bit.\n" +
            "3. Shift `n` right by one (`n >>= 1`) to discard the consumed bit and expose the next.\n" +
            "4. After 32 iterations, return `result`.\n\n" +
            "**Why it works.** The first bit read is the input's least significant bit; after 31 further left-shifts of the result it lands in the most significant position. The last bit read (the input's MSB) is appended last and stays least significant. That end-to-end swap is exactly a mirror. Running a fixed 32 times is what makes leading zeros of the input become trailing zeros of the result.\n\n" +
            "**Common Gotchas.**\n" +
            "- Do not stop early when `n` hits 0 \u2014 the remaining leading zeros must still be shifted into the result, or the magnitude comes out wrong.\n" +
            "- Always loop exactly 32 times, matching the fixed width, regardless of how many bits are set.\n" +
            "- In fixed-width languages keep the result unsigned so the top bit is not misread as a sign.\n\n" +
            "**Complexity.** Time `O(1)` \u2014 a fixed 32 iterations. Space `O(1)`.\n\n" +
            "**Interview mindset.** \u201cReverse or mirror the bits of a fixed-width integer\u201d signals shift-out-of-one, shift-into-the-other over a constant number of positions; emphasize the fixed 32 loops so leading zeros are handled correctly.",
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
