/*
 * Blind 75 — Sliding Window
 * =========================================================================
 * Registers the Sliding Window category on the global registry.
 * See data/arrays_hashing.js for the full PROBLEM SCHEMA documentation.
 *
 * The sliding window pattern maintains a contiguous range [left, right] over a
 * sequence. The RIGHT pointer expands the window to admit new elements; the
 * LEFT pointer contracts it to restore some invariant. Each pointer only ever
 * moves forward, so the whole scan is O(n) even though it "revisits" elements.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Sliding Window", [
    {
      id: "longest-substring-without-repeating-characters",
      lc: 3,
      title: "Longest Substring Without Repeating Characters",
      difficulty: "Medium",
      category: "Sliding Window",
      link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
      meta: { pattern: "Variable Sliding Window", dataStructure: "Hash Set / Map", technique: "Expand & contract" },
      description:
        "Given a string `s`, return the length of the **longest substring** that contains **no repeated characters**.\n\n" +
        "A *substring* is a contiguous slice of `s` (order preserved, no gaps). You are asked only for the **length**, not the substring itself.",
      constraints: [
        "`0 <= s.length <= 5 * 10^4`",
        "`s` consists of English letters, digits, symbols, and spaces."
      ],
      notes: [
        "The empty string has answer `0`.",
        "'Substring' is contiguous — do not confuse it with 'subsequence'."
      ],
      examples: [
        {
          input: 's = "abcabcbb"',
          output: "3",
          reasoning: 'The longest substring with all-unique characters is "abc", of length 3. After that a repeat forces the window to shrink.',
          visual:
            "```\ns:  a  b  c  a  b  c  b  b\n    L        R                 window \"abc\" (len 3)\n    when the second 'a' arrives at R,\n    left slides past the first 'a':\ns:  a  b  c  a  b  c  b  b\n          L  R                    window \"bca\" (still len 3)\n```"
        },
        {
          input: 's = "bbbbb"',
          output: "1",
          reasoning: 'Every character is the same, so the best unique substring is a single "b".'
        },
        {
          input: 's = "pwwkew"',
          output: "3",
          reasoning: 'The answer is "wke" (length 3). Note "pwke" is a subsequence, not a substring, so it does not count.',
          visual:
            "```\ns:  p  w  w  k  e  w\n          L  R              second 'w' seen -> shrink\ns:  p  w  w  k  e  w\n             L        R     window \"wke\" (len 3)\n```"
        },
        {
          input: 's = ""',
          output: "0",
          reasoning: "No characters means the longest unique substring has length 0."
        },
        {
          input: 's = " "',
          output: "1",
          reasoning: "A single space is one valid character; length 1."
        }
      ],
      approaches: [
        {
          name: "Brute Force — check every substring",
          time: "O(n^2) (with O(1) set checks, effectively O(n^2))",
          space: "O(min(n, alphabet))",
          whenToUse: "The baseline you describe first in an interview before optimizing to a window.",
          logic:
            "**What it asks.** Return the length of the longest contiguous stretch of `s` in which no character repeats. Two words carry all the weight: *contiguous* (a substring, no gaps — not a subsequence) and *length* (you report a number, never the substring itself). The empty string and a single space are both legal inputs, answering `0` and `1` respectively.\n\n" +
            "**Why the naive idea fails.** The most direct approach fixes a starting index `i` and, from each `i`, extends a substring one character at a time, keeping a `seen` set of the characters used so far. The instant the next character is already in `seen`, this start can go no further, so you record how long it got and move on to the next `i`. It is correct, but wasteful: there are `O(n)` starting points and each can scan up to `O(n)` characters, giving `O(n^2)` work — on the order of billions of operations at `n = 5 * 10^4`. The concrete waste is that when the start advances from `i` to `i+1`, everything learned about the overlapping prefix is thrown away and the `seen` set is rebuilt from scratch, even though the two attempts share almost all of their characters.\n\n" +
            "**Key Idea.** The longest unique run *beginning at each start* can be found independently by extending until the first repeat, and the global answer is simply the maximum of these per-start runs. There is no cleverness here — it is the exhaustive correctness baseline you state first, and its overlapping-rescan waste is exactly what motivates collapsing the two nested scans into a single sliding window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Keep a running best `longest`, initialised to `0` so the empty string is handled for free.\n" +
            "2. For each start index `i`, create a *fresh* empty `seen` set — each start is an independent attempt.\n" +
            "3. Walk `j` from `i` forward, character by character.\n" +
            "4. If `s[j]` is already in `seen`, `break` — this start can extend no further, and any longer substring from `i` would still contain the same duplicate.\n" +
            "5. Otherwise add `s[j]` to `seen` and update `longest = max(longest, j - i + 1)`.\n" +
            "6. Move to the next start `i` and repeat.\n\n" +
            "**Why it works.** Every substring is uniquely identified by its start and its (inclusive) end. By trying every start and extending maximally until the first repeat, we examine the longest all-unique run beginning at each position; the maximum over all starts is therefore necessarily the global longest. Stopping at the first repeat is safe because once a character has appeared, extending further can never remove it — the run beginning at this `i` is already at its maximum.\n\n" +
            "**Common Gotchas.**\n" +
            "- The empty string must return `0` — the outer loop simply never runs, and the initial `longest = 0` is already correct.\n" +
            "- The `seen` set must be reset for each new start, or stale characters from a previous attempt leak in and cut runs short.\n" +
            "- The measured width is `j - i + 1` (both ends inclusive), a classic off-by-one spot.\n" +
            "- Use `break`, not `continue`, on a repeat: `continue` would keep scanning past the duplicate and wrongly count a substring that is no longer unique.\n\n" +
            "**Complexity.** Time `O(n^2)` — `O(n)` starts, each scanning up to `O(n)` characters, with `O(1)` set operations. Space `O(min(n, alphabet))` for the per-start set, since it never holds more than one of each distinct character.\n\n" +
            "**Interview mindset.** State this first to show you genuinely understand the problem, then point at the redundant re-scanning of overlapping substrings as the concrete inefficiency. That waste — a nested loop re-examining shared prefixes — is the signal to collapse the two scans into one sliding window.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls lengthOfLongestSubstring on the object.\n\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:  # Return the length of the longest substring of s with no repeated character.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        n = len(s)  # Cache the length so we do not recompute len(s) on every loop step.\n" +
            "                    # State: n is the number of valid indices, 0 through n - 1.\n" +
            "                    # Execution flow: Python continues to initialise the running best below.\n\n" +
            "        longest = 0  # Best all-unique length found so far; 0 already handles the empty string.\n" +
            "                     # State: longest only ever grows, through the max() update inside the scan.\n" +
            "                     # Execution flow: Python enters the outer loop over start indices.\n\n" +
            "        # ==================== PHASE 2: EXTEND FROM EVERY START INDEX ====================\n\n" +
            "        for i in range(n):  # Fix the start index i of a fresh candidate substring.\n" +
            "                            # Loop invariant: every start strictly before i has already been extended maximally.\n" +
            "                            # Execution flow: after one i finishes, Python assigns the next start i.\n\n" +
            "            seen = set()  # Characters currently inside the substring that starts at i.\n" +
            "                          # Why reset per start: each start is an independent attempt, so stale chars must not leak in.\n" +
            "                          # Why a set: membership tests (c in seen) run in average O(1).\n" +
            "                          # State: seen is rebuilt from empty for every new i.\n\n" +
            "            for j in range(i, n):  # Extend the substring rightward, one character at a time.\n" +
            "                                   # Loop invariant: seen holds exactly s[i..j-1], all distinct so far.\n" +
            "                                   # Execution flow: after one j finishes, Python assigns the next j.\n\n" +
            "                if s[j] in seen:  # Is the next character already inside this attempt?\n" +
            "                                  # Python hashes s[j] and checks the set in average O(1).\n" +
            "                    break  # A repeat ends this start: it cannot extend any further.\n" +
            "                           # Execution flow: break exits the inner loop; control returns to the outer for.\n" +
            "                           # Why safe: any longer substring starting at i would still contain this duplicate.\n\n" +
            "                seen.add(s[j])  # No repeat: admit s[j] into the current attempt.\n" +
            "                                # State change: seen now also contains s[j].\n" +
            "                                # Execution flow: fall through to update the running best.\n\n" +
            "                longest = max(longest, j - i + 1)  # Width of s[i..j] is j - i + 1, inclusive of both ends.\n" +
            "                                                   # State change: longest grows when this attempt beats the record.\n" +
            "                                                   # Execution flow: end of iteration; Python advances j.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return longest  # The maximum over all per-start runs is the global longest unique substring.\n" +
            "                        # Execution flow: this value is handed to the caller and the function ends.",
          plain:
            "class Solution:\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        longest = 0\n" +
            "        for i in range(n):\n" +
            "            seen = set()\n" +
            "            for j in range(i, n):\n" +
            "                if s[j] in seen:\n" +
            "                    break\n" +
            "                seen.add(s[j])\n" +
            "                longest = max(longest, j - i + 1)\n" +
            "        return longest"
        },
        {
          name: "Optimized — Sliding Window (set / last-index map)",
          time: "O(n)",
          space: "O(min(n, alphabet))",
          whenToUse: "The expected answer for any 'longest/shortest contiguous stretch satisfying a constraint' problem.",
          logic:
            "**What it asks.** Return the length of the longest contiguous substring of `s` that contains no repeated character — the same question as the brute force, now answered in a single linear pass.\n\n" +
            "**Why the naive idea fails.** Restarting from every possible start and rebuilding a `seen` set from scratch is `O(n^2)`, because advancing the start by one throws away everything already learned about the overlapping prefix. For `n = 5 * 10^4` that is far too slow. The redundancy is the clue: two adjacent starting points share nearly all of their characters, so the work of validating that shared middle should not be repeated.\n\n" +
            "**Key Idea.** Maintain a **window** `[left, right]` — a contiguous slice — that is kept all-distinct at all times. As we extend it to the right, the *only* thing that can break the 'all unique' property is the single character we just added. When `s[right]` duplicates something already inside the window, we do NOT restart: we only drop characters from the LEFT until that one duplicate is expelled, then admit `s[right]`. Crucially, `left` never has to move backward — a character evicted from the front is gone for good — so both pointers only ever advance, and the whole scan is linear even though it appears to revisit elements.\n\n" +
            "**What the pointers and set mean.** `left` and `right` are the inclusive boundaries of the current window; `seen` is exactly the multiset-free set of characters inside `[left, right]`. The **loop invariant** is that at the top of each iteration `seen` contains precisely the characters of `s[left..right-1]` and holds no duplicate. The window **grows** (advance `right`) unconditionally once per iteration to consider a new character; it **shrinks** (advance `left`) only while `s[right]` is already present, and only far enough to restore uniqueness.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialise `seen = {}` (a set), `left = 0`, and `longest = 0`.\n" +
            "2. Drive `right` across `s` — the outer loop that admits one new character per step.\n" +
            "3. **Contract** while the invariant is broken: `while s[right] in seen`, `seen.remove(s[left])` and `left += 1`, evicting from the front until the duplicate of `s[right]` has left the window.\n" +
            "4. Now that the front is clear, `seen.add(s[right])` — safe because the duplicate is gone.\n" +
            "5. **Measure** the now-valid window: `longest = max(longest, right - left + 1)`.\n\n" +
            "**Why it works.** After the contract step, `[left, right]` is guaranteed to hold a substring with no repeats, and it is the *longest* all-unique substring ending exactly at `right`: `left` sits just past the most recent copy of any repeated character, so it cannot be pushed further left without re-admitting a duplicate. Because `left` never moves backward, every candidate 'best window ending at `right`' is measured for some `right`, so taking the maximum width over all `right` yields the global longest.\n\n" +
            "**Common Gotchas.**\n" +
            "- Add `s[right]` to `seen` only AFTER the contract loop; adding first would make `s[right] in seen` true and evict the character you just admitted.\n" +
            "- Measure the window after contracting, not before, or you may record an invalid (duplicate-containing) width.\n" +
            "- Use `while`, not `if`, to shrink — a single duplicate might require evicting several front characters before it is expelled.\n" +
            "- The empty string returns `0` — the loop never runs, which is correct.\n" +
            "- A faster variant maps each character to its last-seen index so `left` can JUMP directly to `max(left, last[c] + 1)` instead of stepping one character at a time; same `O(n)`, fewer set operations.\n\n" +
            "**Complexity.** Time `O(n)` — each character is added once and removed at most once, so `left` and `right` together traverse `s` at most twice. Space `O(min(n, alphabet))`, since the set holds at most one of each distinct character.\n\n" +
            "**Interview mindset.** 'Longest (or shortest) contiguous run under a constraint' combined with 'a violation caused by the newest element can be repaired by dropping elements from the front' is the classic sliding-window signal. Say aloud what `left`/`right` bound and what invariant the window preserves — that framing is what interviewers listen for.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls lengthOfLongestSubstring on the object.\n\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:  # Return the longest all-unique substring length in a single pass.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        seen = set()  # The set of characters currently inside the window [left, right].\n" +
            "                      # Why a set: add, remove, and membership all run in average O(1).\n" +
            "                      # Invariant we maintain: seen never holds a duplicate, so the window is always all-distinct.\n" +
            "                      # Execution flow: Python continues to initialise the window's left edge.\n\n" +
            "        left = 0  # Left boundary of the window; the current candidate is the slice s[left..right] inclusive.\n" +
            "                  # State: left only ever moves forward, chasing right to restore the no-duplicate invariant.\n" +
            "                  # Why forward-only: an evicted character never needs to re-enter, which is what makes the scan O(n).\n\n" +
            "        longest = 0  # Widest valid (all-unique) window seen so far; 0 handles the empty string.\n" +
            "                     # State: updated via max() only after the window has been made valid again.\n" +
            "                     # Execution flow: Python enters the loop that drives the right edge.\n\n" +
            "        # ==================== PHASE 2: EXPAND RIGHT, SHRINK LEFT ON A DUPLICATE ====================\n\n" +
            "        for right in range(len(s)):  # Advance the right edge to admit s[right] into the window.\n" +
            "                                     # Loop invariant: before this step, s[left..right-1] is all-distinct.\n" +
            "                                     # Execution flow: after each right, Python advances to the next index.\n\n" +
            "            while s[right] in seen:  # The incoming character duplicates one already inside the window...\n" +
            "                                     # Why a while, not an if: keep evicting until THIS duplicate has left the window.\n" +
            "                                     # Only the newest character can break the invariant, so the repair is purely on the left.\n" +
            "                seen.remove(s[left])  # ...so drop the leftmost character out of the window.\n" +
            "                                      # State change: seen shrinks by one; the window's front content is discarded.\n" +
            "                left += 1  # ...and advance the left edge past it.\n" +
            "                           # State change: the window narrows from the front; the while then re-tests s[right].\n" +
            "                           # Why safe: shrinking from the left is the only way to expel an earlier duplicate.\n\n" +
            "            seen.add(s[right])  # The front is now clear, so it is safe to admit s[right].\n" +
            "                                # State change: seen gains s[right]; the window is all-distinct again.\n" +
            "                                # Why add AFTER the while: adding first would immediately evict the char we just added.\n\n" +
            "            longest = max(longest, right - left + 1)  # Measure the now-valid window: its width is right - left + 1.\n" +
            "                                                      # Why measure here: the window is guaranteed duplicate-free at this point.\n" +
            "                                                      # State change: longest grows if this is the widest valid window yet.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return longest  # The largest valid window width over the whole scan is the answer.\n" +
            "                        # Execution flow: this value is handed to the caller and the function ends.",
          plain:
            "class Solution:\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:\n" +
            "        seen = set()\n" +
            "        left = 0\n" +
            "        longest = 0\n" +
            "        for right in range(len(s)):\n" +
            "            while s[right] in seen:\n" +
            "                seen.remove(s[left])\n" +
            "                left += 1\n" +
            "            seen.add(s[right])\n" +
            "            longest = max(longest, right - left + 1)\n" +
            "        return longest"
        }
      ],
      patternRecognition: [
        "'Longest substring / subarray with all-distinct (or some constraint on) elements'.",
        "A violation caused by the newest element can always be repaired by dropping elements from the front.",
        "You catch yourself re-scanning overlapping substrings with a nested loop → collapse it into one window."
      ],
      interviewRecall: [
        "Two pointers both move forward only; that is what makes it O(n) despite the inner while-loop.",
        "Expand right to admit; shrink left while the invariant (no duplicate) is broken; measure after the shrink.",
        "The map-of-last-index variant lets left JUMP past the duplicate instead of stepping one at a time — mention it as an optimization."
      ]
    },

    {
      id: "longest-repeating-character-replacement",
      lc: 424,
      title: "Longest Repeating Character Replacement",
      difficulty: "Medium",
      category: "Sliding Window",
      link: "https://leetcode.com/problems/longest-repeating-character-replacement/",
      meta: { pattern: "Variable Sliding Window", dataStructure: "Frequency Count", technique: "Track max frequency" },
      description:
        "Given a string `s` of uppercase English letters and an integer `k`, you may choose **at most `k`** characters in `s` and replace each with **any** uppercase letter.\n\n" +
        "Return the length of the **longest substring** that can be made to consist of a **single repeated character** after performing at most `k` such replacements.",
      constraints: [
        "`1 <= s.length <= 10^5`",
        "`s` consists of only uppercase English letters.",
        "`0 <= k <= s.length`"
      ],
      notes: [
        "You do not have to use all `k` replacements.",
        "The replacements are hypothetical — you are counting the best achievable length, not returning a modified string."
      ],
      examples: [
        {
          input: 's = "ABAB", k = 2',
          output: "4",
          reasoning: 'Replace the two "A"s with "B" (or the two "B"s with "A") to get "BBBB" — the whole string, length 4.',
          visual:
            "```\ns:  A  B  A  B      k = 2\n    L        R      window \"ABAB\": maxFreq('A' or 'B')=2\n    len - maxFreq = 4 - 2 = 2 <= k  -> valid, len 4\n```"
        },
        {
          input: 's = "AABABBA", k = 1',
          output: "4",
          reasoning: 'The window "ABBA" (or "AABA") can become "BBBB"/"AAAA" with one replacement, giving length 4. A length-5 window would need 2+ replacements.',
          visual:
            "```\ns:  A  A  B  A  B  B  A     k = 1\n          L        R          window \"BABB\": maxFreq('B')=3\n          len - maxFreq = 4 - 3 = 1 <= k -> valid, len 4\n```"
        },
        {
          input: 's = "AAAA", k = 0',
          output: "4",
          reasoning: "Already all identical; no replacements needed, length 4."
        },
        {
          input: 's = "ABCDE", k = 1',
          output: "2",
          reasoning: "With one replacement you can only make two adjacent letters match (e.g. \"AB\"→\"AA\")."
        }
      ],
      approaches: [
        {
          name: "Sliding Window with max-frequency count",
          time: "O(n)",
          space: "O(1) (26 letters)",
          whenToUse: "The canonical answer: 'longest window where at most k elements differ from the dominant one'.",
          logic:
            "**What it asks.** Find the length of the longest substring that can be turned into a single repeated character by replacing at most `k` of its characters. The replacements are *hypothetical*: you are counting the best achievable length, not building a modified string, and you need not use all `k`.\n\n" +
            "**Why the naive idea fails.** The obvious approach tries every substring and, for each, counts how many characters are NOT the most common one; if that count is `<= k` the substring is achievable, so track the longest achievable. Enumerating all `O(n^2)` substrings and counting within each is far too slow for `n = 10^5`, and it re-counts the heavily overlapping regions of adjacent substrings over and over.\n\n" +
            "**Key Idea.** For any fixed window, the cheapest way to make it uniform is to keep whichever letter already appears most often and replace *all the rest*. So the number of replacements a window needs is exactly `window_length - maxFreq`, where `maxFreq` is the count of the most frequent character in the window. The window is **feasible** precisely when `window_length - maxFreq <= k`. That single arithmetic test converts the whole problem into 'find the longest feasible window', which a sliding window solves in one pass.\n\n" +
            "**What the pointers and counters mean.** `left` and `right` are the inclusive window boundaries; `count[c]` is the frequency of letter `c` inside `[left, right]`; `maxFreq` is the highest single-letter count seen so far. The **loop invariant** is that after each iteration the window `[left, right]` is feasible — `(right - left + 1) - maxFreq <= k`. The window **grows** (advance `right`) every iteration to admit a new letter; it **shrinks** (advance `left` once) only on the step where admitting the new letter would make the window infeasible. Because the shrink is a single `if`, not a `while`, `left` moves at most once per `right`, so the window width is non-decreasing — it only ever grows or stays the same, which is what lets it settle on the maximum feasible length.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialise `count` (a `defaultdict(int)`, or a 26-slot array), `left = 0`, `max_freq = 0`, `longest = 0`.\n" +
            "2. Drive `right` across `s`. Admit `s[right]`: `count[s[right]] += 1`, then `max_freq = max(max_freq, count[s[right]])` — only the letter that just entered can raise the dominant count.\n" +
            "3. Test feasibility: if `(right - left + 1) - max_freq > k`, the window needs too many replacements, so evict one from the left — `count[s[left]] -= 1`, `left += 1`.\n" +
            "4. Record `longest = max(longest, right - left + 1)`.\n\n" +
            "**Why it works.** Whenever the window is measured it satisfies `len - maxFreq <= k`, so it is genuinely achievable. The subtle part is that `max_freq` is *never decremented* on a shrink, so it may be a historical high that no longer reflects the current window. This is fine, and in fact deliberate: we only care about finding a window *longer* than the current best. A stale `max_freq` can only make `len - max_freq` smaller, i.e. make the feasibility test *stricter*, never looser — so it can never validate an impossible window; it can only fail to grow the window on a step where a recomputed max might have allowed it, which does not matter because that recomputed larger window would not exceed the length already recorded. Since `left` advances by at most one per `right`, the width never decreases, so the loop captures the maximum feasible length.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a single `if` to shrink, not a `while` — the window width must never actually decrease. This is what keeps it `O(n)` and what makes the stale-`maxFreq` trick sound.\n" +
            "- Do not bother recomputing the true maximum frequency after shrinking; it is unnecessary work and, as argued above, never changes the answer.\n" +
            "- `k = 0` (no replacements allowed) and an already-uniform string both work without special-casing — they fall out of the same feasibility test.\n" +
            "- Refresh `maxFreq` from the *entering* letter only; scanning all 26 counts every step would still be linear but is wasted effort.\n\n" +
            "**Complexity.** Time `O(n)` — one pass with `O(1)` work per step over a constant-size (26-letter) count. Space `O(1)`: the count map holds at most 26 distinct uppercase letters regardless of input size.\n\n" +
            "**Interview mindset.** 'At most `k` changes/removals to make a window satisfy a property' points to a sliding window whose *cost* is compared against `k`; here the cost is `window_length - maxFreq`. The uppercase-only alphabet is a strong hint to back the counts with a fixed 26-slot table, and being able to explain why the never-decremented `maxFreq` is safe is exactly the insight interviewers probe for.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls characterReplacement on the object.\n\n" +
            "    def characterReplacement(self, s: str, k: int) -> int:  # Longest substring that becomes one repeated letter after at most k replacements.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        from collections import defaultdict  # defaultdict(int) returns 0 for a never-seen key, so count[c] needs no manual initialisation.\n" +
            "                                             # Execution flow: Python continues to build the frequency table below.\n\n" +
            "        count = defaultdict(int)  # count[c] = how many times letter c currently appears inside the window [left, right].\n" +
            "                                  # Why a count map: the window's cost depends only on per-letter frequencies, not positions.\n" +
            "                                  # State: incremented when a letter enters on the right, decremented when one leaves on the left.\n\n" +
            "        left = 0  # Left boundary of the window; the current candidate is the slice s[left..right] inclusive.\n" +
            "                  # State: left advances at most once per step, so the window width never actually shrinks.\n" +
            "                  # Why forward-only: keeping left monotonic is what makes the single pass O(n).\n\n" +
            "        max_freq = 0  # Highest single-letter count seen in ANY window so far (a running high-water mark).\n" +
            "                      # Why never decreased: we only care about growing the answer; a stale high can never validate an\n" +
            "                      # impossible window (it only makes the feasibility test stricter), so leaving it is safe and fast.\n\n" +
            "        longest = 0  # Widest feasible window found so far; feasible means it needs at most k replacements.\n" +
            "                     # Execution flow: Python enters the loop that drives the right edge.\n\n" +
            "        # ==================== PHASE 2: EXPAND RIGHT, SHRINK LEFT IF INFEASIBLE ====================\n\n" +
            "        for right in range(len(s)):  # Advance the right edge to admit s[right] into the window.\n" +
            "                                     # Loop invariant: on entry the window [left, right-1] was feasible ((len - max_freq) <= k).\n" +
            "                                     # Execution flow: after each right, Python advances to the next index.\n\n" +
            "            count[s[right]] += 1  # Admit the new character: bump its frequency inside the window.\n" +
            "                                  # State change: count[s[right]] grows by one.\n\n" +
            "            max_freq = max(max_freq, count[s[right]])  # Refresh the dominant count: only the letter that just entered can push the max up.\n" +
            "                                                       # State change: max_freq becomes the count of the most frequent letter, if this one now leads.\n\n" +
            "            if (right - left + 1) - max_freq > k:  # Cost of making the window uniform = window_length - max_freq (replace all but the dominant letter).\n" +
            "                                                   # If that exceeds k the window is infeasible, so trim exactly one character from the left.\n" +
            "                                                   # Why an if, not a while: one eviction restores feasibility and keeps the window width non-decreasing.\n" +
            "                count[s[left]] -= 1  # Evict the leftmost character: drop its frequency as it leaves the window.\n" +
            "                                     # State change: count[s[left]] shrinks by one.\n" +
            "                left += 1  # Advance the left edge past the evicted character.\n" +
            "                           # State change: the window slides right by one; its width stays the same as before this step.\n\n" +
            "            longest = max(longest, right - left + 1)  # Record the width of the current (now-feasible) window.\n" +
            "                                                      # Why safe: after the shrink the window satisfies (len - max_freq) <= k, so it is achievable.\n" +
            "                                                      # State change: longest grows if this feasible window is the widest yet.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return longest  # The widest feasible window width over the whole scan is the answer.\n" +
            "                        # Execution flow: this value is handed to the caller and the function ends.",
          plain:
            "class Solution:\n" +
            "    def characterReplacement(self, s: str, k: int) -> int:\n" +
            "        from collections import defaultdict\n" +
            "        count = defaultdict(int)\n" +
            "        left = 0\n" +
            "        max_freq = 0\n" +
            "        longest = 0\n" +
            "        for right in range(len(s)):\n" +
            "            count[s[right]] += 1\n" +
            "            max_freq = max(max_freq, count[s[right]])\n" +
            "            if (right - left + 1) - max_freq > k:\n" +
            "                count[s[left]] -= 1\n" +
            "                left += 1\n" +
            "            longest = max(longest, right - left + 1)\n" +
            "        return longest"
        }
      ],
      patternRecognition: [
        "'Longest window where at most k elements differ from the most common one'.",
        "The feasibility test reduces to (window length - maxFreq) <= k.",
        "Uppercase-letters-only hints at a fixed 26-slot frequency table."
      ],
      interviewRecall: [
        "Cost of a window = window_length - maxFreq; valid when that is <= k.",
        "Track maxFreq as a running high; you do not need to decrement it on shrink because you only care about growing the answer.",
        "Use a single `if` (not a `while`) to shrink — the window width never decreases, giving a clean O(n)."
      ]
    },

    {
      id: "minimum-window-substring",
      lc: 76,
      title: "Minimum Window Substring",
      difficulty: "Hard",
      category: "Sliding Window",
      link: "https://leetcode.com/problems/minimum-window-substring/",
      meta: { pattern: "Variable Sliding Window", dataStructure: "Hash Map + counters", technique: "Expand then contract" },
      description:
        "Given two strings `s` and `t`, return the **shortest substring** of `s` that contains **every character of `t`**, counting multiplicities (if `t` has two `'a'`s, the window must too).\n\n" +
        "If no such window exists, return the empty string `\"\"`. The answer is guaranteed to be **unique** when it exists.",
      constraints: [
        "`1 <= s.length, t.length <= 10^5`",
        "`s` and `t` consist of uppercase and lowercase English letters.",
        "The answer window is unique when one exists."
      ],
      notes: [
        "Character multiplicity matters: `t = \"aa\"` requires two `'a'`s in the window.",
        "If `t` is longer than `s`, or some character of `t` never appears, the answer is `\"\"`."
      ],
      examples: [
        {
          input: 's = "ADOBECODEBANC", t = "ABC"',
          output: '"BANC"',
          reasoning: '"BANC" is the shortest substring containing A, B, and C. Earlier windows like "ADOBEC" also qualify but are longer.',
          visual:
            "```\ns:  A D O B E C O D E B A N C\n    L         R                expand until all of ABC covered: \"ADOBEC\"\n    then contract from left to minimize:\ns:  A D O B E C O D E B A N C\n                        L   R    final window \"BANC\" (len 4)\n```"
        },
        {
          input: 's = "a", t = "a"',
          output: '"a"',
          reasoning: "The whole string is the smallest window covering t."
        },
        {
          input: 's = "a", t = "aa"',
          output: '""',
          reasoning: 't needs two "a"s but s has only one, so no valid window exists.'
        },
        {
          input: 's = "ADOBECODEBANC", t = "AABC"',
          output: '"ADOBECODEBA"',
          reasoning: 'Now two "A"s are required; the shortest window holding A, A, B, C is "ADOBECODEBA".'
        }
      ],
      approaches: [
        {
          name: "Sliding Window with have / need counters",
          time: "O(|s| + |t|)",
          space: "O(|s| + |t|)",
          whenToUse: "The standard approach for 'smallest window covering a required multiset of characters'.",
          logic:
            "**What it asks.** Return the shortest contiguous slice of `s` that contains every character of `t`, respecting how many times each is required (multiplicity: `t = \"aa\"` needs two `'a'`s in the window), or `\"\"` if no such slice exists. When an answer exists it is guaranteed unique.\n\n" +
            "**Why the naive idea fails.** Enumerating all `O(n^2)` substrings and checking each against `t`'s multiset requirement is far too slow for `n = 10^5`. Worse, adjacent substrings overlap enormously, so this recomputes coverage for the same shared characters again and again — the exact redundancy a sliding window removes.\n\n" +
            "**Key Idea.** A valid window need only *cover* `t` (it may contain extra junk characters). So run a two-phase window: GROW on the right until the window first becomes valid — covers every character of `t` with the right multiplicity — then SHRINK on the left as far as it stays valid, because every successful shrink is a chance at a smaller answer. Sweeping `right` across `s` once while `left` chases it visits each character at most twice, giving linear time. The trick that makes each step cheap is tracking coverage with a single satisfied-counter rather than re-comparing whole frequency maps.\n\n" +
            "**What the pointers and counters mean.** `left`/`right` are the inclusive window boundaries. `need` (a `Counter` of `t`) is the fixed target multiset; `required = len(need)` is the number of DISTINCT characters that must be satisfied. `window[c]` counts copies of `c` currently inside `[left, right]`. `have` is the number of distinct required characters currently *fully* satisfied — i.e. those whose `window[c]` has reached `need[c]`. The **validity test is `have == required`**, an `O(1)` check that replaces comparing the whole `window` map against `need`. The window **grows** (advance `right`) whenever it is not yet valid; it **shrinks** (advance `left`) while it *is* valid, trying to minimise. `best_len`/`best_start` remember the smallest valid window found.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Guard the empty-input edge case, then build `need = Counter(t)`, `required = len(need)`, an empty `window`, `have = 0`, `best_len = inf`, `best_start = 0`, `left = 0`.\n" +
            "2. Drive `right` across `s`. Admit `c = s[right]`: `window[c] += 1`, and if `c` is required and `window[c]` has just REACHED `need[c]` (use `==`), then `have += 1`.\n" +
            "3. **Contract while valid** — `while have == required`: first record the answer if `right - left + 1 < best_len` (update `best_len`/`best_start`); then evict `s[left]` — `window[s[left]] -= 1`, and if that pushes a required character strictly BELOW `need`, `have -= 1`; finally `left += 1`.\n" +
            "4. When `right` reaches the end, return `s[best_start:best_start + best_len]` if a valid window was ever found, else `\"\"`.\n\n" +
            "**Why it works.** The answer is recorded only while the window is valid, and the inner `while` contracts to the *smallest* valid window whose right edge is `right`; taking the minimum over all `right` therefore yields the global shortest. The satisfied-counter is exact: `have` rises only when a character's count first *reaches* its needed amount and falls only when it first drops *below* it, so `have == required` holds if and only if every required character is present with full multiplicity — no more, no less. Because both pointers only move forward, each character is admitted once and evicted at most once.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record the answer INSIDE the while-loop, *before* shrinking, or you will step past and miss the minimal window.\n" +
            "- Bump `have` only when a count first REACHES its needed value (`==`, never `>=`), otherwise surplus copies over-count satisfaction and validity fires early.\n" +
            "- Symmetrically, decrement `have` only when a count drops strictly BELOW its need (`<`), so an evicted surplus copy does not falsely break validity.\n" +
            "- Return `\"\"` when no valid window was ever found — e.g. `t` longer than `s`, or a character of `t` absent from `s`; the `best_len == inf` guard handles this.\n" +
            "- Multiplicity matters: `t = \"aa\"` requires two `'a'`s in the window, not one.\n\n" +
            "**Complexity.** Time `O(|s| + |t|)` — `right` and `left` each traverse `s` once, and `t` is scanned once to build `need`. Space `O(|s| + |t|)` for the two maps holding distinct characters (bounded by the alphabet in practice).\n\n" +
            "**Interview mindset.** 'Smallest window covering a required set/multiset' is the signal: expand to *become* valid, contract to *minimise*, and use a satisfied-counter (`have`/`required`) for `O(1)` validity checks instead of comparing maps every step. Being able to state precisely when `have` goes up and down — and why `==`/`<` are the right comparisons — is what separates a correct implementation from an off-by-one one.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls minWindow on the object.\n\n" +
            "    def minWindow(self, s: str, t: str) -> str:  # Return the shortest substring of s that covers every character of t (with multiplicity).\n\n" +
            "        # ==================== PHASE 1: EDGE CASE ====================\n\n" +
            "        if not s or not t:  # An empty s or empty t can have no valid covering window.\n" +
            "                            # Why safe: with nothing to cover (or nothing to cover it), the answer is the empty string.\n" +
            "            return \"\"  # Bail out immediately; nothing below needs to run.\n\n" +
            "        # ==================== PHASE 2: PREPARE COUNTERS ====================\n\n" +
            "        from collections import Counter, defaultdict  # Counter(t) tallies t's letters in one pass; defaultdict(int) returns 0 for unseen window keys.\n" +
            "                                                      # Execution flow: Python continues to build the requirement counters below.\n\n" +
            "        need = Counter(t)  # need[c] = how many copies of character c the window must contain (t's multiset).\n" +
            "                           # Why multiplicity matters: t = 'aa' requires two 'a's, so counts, not mere presence, decide coverage.\n" +
            "                           # State: need is fixed for the whole run; it is the target the window must meet.\n\n" +
            "        required = len(need)  # Number of DISTINCT characters that must each be fully satisfied.\n" +
            "                              # Why: the window is valid exactly when all `required` distinct requirements are met at once.\n\n" +
            "        window = defaultdict(int)  # window[c] = how many copies of c are currently inside [left, right].\n" +
            "                                   # State: incremented as characters enter on the right, decremented as they leave on the left.\n\n" +
            "        have = 0  # How many DISTINCT required characters are currently fully satisfied (window count == need count).\n" +
            "                  # Validity test: the window covers t exactly when have == required, an O(1) check.\n" +
            "                  # State: bumped up when a requirement is first met, bumped down when it is first broken.\n\n" +
            "        best_len = float('inf')  # Width of the smallest valid window found so far; infinity means none found yet.\n" +
            "                                 # State: only ever shrinks, and only while the window is valid.\n\n" +
            "        best_start = 0  # Start index of that smallest valid window, used to slice the answer at the end.\n\n" +
            "        left = 0  # Left boundary of the window; the candidate is the slice s[left..right] inclusive.\n" +
            "                  # State: left only moves forward, chasing right to shrink valid windows toward the minimum.\n\n" +
            "        # ==================== PHASE 3: EXPAND RIGHT, CONTRACT WHILE VALID ====================\n\n" +
            "        for right in range(len(s)):  # Advance the right edge to admit s[right] into the window.\n" +
            "                                     # Loop invariant: window holds exact counts for s[left..right-1] before this step.\n" +
            "                                     # Execution flow: after each right, Python advances to the next index.\n" +
            "            c = s[right]  # The character entering the window on the right.\n" +
            "            window[c] += 1  # Admit it: bump its count inside the window.\n" +
            "                            # State change: window[c] grows by one.\n" +
            "            if c in need and window[c] == need[c]:  # Is c required, and did its count just REACH the needed amount?\n" +
            "                                                    # Why == and not >=: only the moment a requirement is first met should raise satisfaction;\n" +
            "                                                    # surplus copies beyond need[c] must not over-count coverage.\n" +
            "                have += 1  # One more distinct requirement is now fully satisfied.\n" +
            "                           # State change: have grows; when it equals required the window becomes valid.\n\n" +
            "            while have == required:  # The window now covers all of t: try to shrink it from the left to find a smaller answer.\n" +
            "                                     # Why a while: keep contracting as long as validity holds, seizing every smaller valid window.\n" +
            "                                     # Execution flow: the loop body records, then evicts, until validity breaks.\n" +
            "                if right - left + 1 < best_len:  # Is this valid window shorter than the best recorded so far?\n" +
            "                                                 # Why record here, inside the while and BEFORE evicting: this is where the window is both valid\n" +
            "                                                 # and at its current shrink minimum; measuring after the eviction would miss the true minimum.\n" +
            "                    best_len = right - left + 1  # Remember the new smallest width.\n" +
            "                                                 # State change: best_len shrinks to this window's width.\n" +
            "                    best_start = left  # Remember where that smallest window begins.\n" +
            "                left_char = s[left]  # The character about to leave the window on the left.\n" +
            "                window[left_char] -= 1  # Evict it: drop its count as it leaves the window.\n" +
            "                                        # State change: window[left_char] shrinks by one.\n" +
            "                if left_char in need and window[left_char] < need[left_char]:  # Did dropping it push a required character BELOW its needed count?\n" +
            "                                                                               # If so, this requirement is no longer met and the window has just stopped being valid.\n" +
            "                    have -= 1  # One fewer distinct requirement is satisfied.\n" +
            "                               # State change: have drops below required, so the while will exit after left advances.\n" +
            "                left += 1  # Advance the left edge past the evicted character.\n" +
            "                           # State change: the window narrows from the front; re-test validity at the while header.\n\n" +
            "        # ==================== PHASE 4: RETURN ====================\n\n" +
            "        return s[best_start:best_start + best_len] if best_len != float('inf') else \"\"  # If a valid window was ever found, slice and return it; otherwise no window covers t, so return ''.\n" +
            "                                                                                        # Why the guard: best_len stays infinity when t cannot be covered (too long, or a char of t absent).\n" +
            "                                                                                        # Execution flow: this value is handed to the caller and the function ends.",
          plain:
            "class Solution:\n" +
            "    def minWindow(self, s: str, t: str) -> str:\n" +
            "        if not s or not t:\n" +
            "            return \"\"\n" +
            "        from collections import Counter, defaultdict\n" +
            "        need = Counter(t)\n" +
            "        required = len(need)\n" +
            "        window = defaultdict(int)\n" +
            "        have = 0\n" +
            "        best_len = float('inf')\n" +
            "        best_start = 0\n" +
            "        left = 0\n" +
            "        for right in range(len(s)):\n" +
            "            c = s[right]\n" +
            "            window[c] += 1\n" +
            "            if c in need and window[c] == need[c]:\n" +
            "                have += 1\n" +
            "            while have == required:\n" +
            "                if right - left + 1 < best_len:\n" +
            "                    best_len = right - left + 1\n" +
            "                    best_start = left\n" +
            "                left_char = s[left]\n" +
            "                window[left_char] -= 1\n" +
            "                if left_char in need and window[left_char] < need[left_char]:\n" +
            "                    have -= 1\n" +
            "                left += 1\n" +
            "        return s[best_start:best_start + best_len] if best_len != float('inf') else \"\""
        }
      ],
      patternRecognition: [
        "'Smallest / shortest window of s that contains all of t' (with multiplicity).",
        "You need coverage of a required multiset → need/window counters plus a have/required satisfaction check.",
        "Expand to satisfy, then contract to minimize — a two-phase window."
      ],
      interviewRecall: [
        "need = Counter(t); required = number of distinct chars; have bumps only when a char's window count first reaches its needed count.",
        "Validity test is have == required in O(1) — do not compare whole maps every step.",
        "Record the answer INSIDE the while-loop before shrinking, and remember to return \"\" when no window was ever valid."
      ]
    },

    {
      id: "permutation-in-string",
      lc: 567,
      title: "Permutation in String",
      difficulty: "Medium",
      category: "Sliding Window",
      link: "https://leetcode.com/problems/permutation-in-string/",
      meta: { pattern: "Fixed-size Sliding Window", dataStructure: "Frequency Count (26-array)", technique: "Anagram / count match" },
      description:
        "Given two strings `s1` and `s2`, return `true` if `s2` contains a **permutation** of `s1` as a **contiguous substring**, and `false` otherwise.\n\n" +
        "In other words, does any window of `s2` of length `|s1|` have exactly the same character multiset as `s1`? A permutation is just a reordering, so order inside the window does not matter — only the counts do.",
      constraints: [
        "`1 <= s1.length, s2.length <= 10^4`",
        "`s1` and `s2` consist of lowercase English letters."
      ],
      notes: [
        "The match must be a contiguous substring of `s2` — not a subsequence.",
        "If `|s1| > |s2|` the answer is immediately `false`; no window of the required size exists.",
        "'Contains a permutation of s1' is the same as 'contains an anagram of s1'."
      ],
      examples: [
        {
          input: 's1 = "ab", s2 = "eidbaooo"',
          output: "true",
          reasoning: 'The window "ba" (starting at index 3) is a permutation of "ab", so the answer is true.',
          visual:
            "```\ns2:  e i d b a o o o     |s1| = 2, target counts a:1 b:1\n         [d b]              window \"db\" -> no match\n           [b a]            window \"ba\" -> counts a:1 b:1 -> MATCH\n```"
        },
        {
          input: 's1 = "ab", s2 = "eidboaoo"',
          output: "false",
          reasoning: 'No length-2 window of "eidboaoo" ("ei","id","db","bo","oa","ao","oo") has exactly one "a" and one "b".'
        },
        {
          input: 's1 = "adc", s2 = "dcda"',
          output: "true",
          reasoning: 'The window "dca" is a permutation of "adc" (counts a:1 c:1 d:1).'
        },
        {
          input: 's1 = "abc", s2 = "ab"',
          output: "false",
          reasoning: "s2 is shorter than s1, so no window of the required length exists."
        }
      ],
      approaches: [
        {
          name: "Fixed-size Sliding Window with count match",
          time: "O(|s1| + |s2|)",
          space: "O(1) (two 26-slot arrays)",
          whenToUse: "The canonical answer for 'does any fixed-length window equal a target multiset' (anagram/permutation search).",
          logic:
            "**What it asks.** Determine whether some contiguous substring of `s2` is a rearrangement of `s1` — i.e. a window of length `|s1|` whose letter counts exactly match those of `s1`.\n\n" +
            "**Why the naive idea fails.** The obvious approach takes every length-`|s1|` substring of `s2`, sorts it (or builds a fresh count), and compares to `s1`. There are `O(|s2|)` such windows and each sort/rebuild costs `O(|s1| log|s1|)` or `O(|s1|)`, giving `O(|s2| * |s1|)` overall — too slow when both are up to `10^4`, and wasteful because adjacent windows overlap in all but two characters.\n\n" +
            "**Key Idea.** A permutation is defined purely by character counts, so build a target count for `s1` and slide a FIXED-width window of length `|s1|` across `s2`, maintaining the window's counts INCREMENTALLY. When the window moves one step, only two letters change: the new letter entering on the right and the old letter leaving on the left. So each step is `O(1)` to update, and a match is just 'window counts == target counts'. To avoid re-comparing all 26 slots every step, keep a `matches` counter of how many of the 26 letters currently agree between window and target, and adjust it as the two changing letters shift their agreement in or out.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. If `|s1| > |s2|`, return `false` — no window of the needed length fits. Build `s1_count[26]` from `s1` and `window_count[26]` from the first `|s1|` characters of `s2`; this first window is the initial candidate.\n" +
            "2. Initialize `matches` = the number of the 26 letters for which `s1_count[c] == window_count[c]`. If `matches == 26` right away, return `true`.\n" +
            "3. The **window** is always exactly `|s1|` wide; it does not grow or shrink, it only SLIDES. Slide `right` from `|s1|` to the end of `s2`: the letter `s2[right]` enters and the letter `s2[left]` (with `left = right - |s1|`) leaves.\n" +
            "4. For the entering letter, adjust `matches` around the increment: if its window count was equal to target before the change, it is about to break agreement (decrement `matches`); increment the count; if it now equals target, agreement is restored (increment `matches`).\n" +
            "5. Do the symmetric update for the leaving letter: check-before, decrement its window count, check-after, adjusting `matches` the same way.\n" +
            "6. After each slide, if `matches == 26` the whole multiset agrees — return `true`. If the loop finishes with no match, return `false`.\n\n" +
            "**Why it works.** The window always has the exact length of `s1`, so a full 26-letter count match is a necessary and sufficient condition for the window to be a permutation of `s1`. The `matches` counter is kept exactly in sync because only the two letters that change can alter agreement, and for each we compare 'equal to target' immediately before and after its single count change. Every window of the correct length is examined, so if a permutation exists it is found.\n\n" +
            "**Common Gotchas.**\n" +
            "- Handle `|s1| > |s2|` up front, or the initial window build reads past the end of `s2`.\n" +
            "- Check for a match on the INITIAL window (before sliding), otherwise a permutation at the very start is missed.\n" +
            "- When updating `matches`, compare against the target BEFORE and AFTER changing a letter's count — flipping the order or forgetting one side corrupts the counter.\n" +
            "- A simpler variant just compares the two 26-arrays for equality after every slide; that is `O(26)` per step (still `O(26 * |s2|)` = linear) and is easier to get right if the `matches` bookkeeping feels error-prone.\n\n" +
            "**Complexity.** Time `O(|s1| + |s2|)` — building the counts is linear and each of the `O(|s2|)` slides is `O(1)` with the `matches` counter (or `O(26)` = `O(1)` with the array-compare variant). Space `O(1)`: two fixed 26-slot arrays regardless of input size.\n\n" +
            "**Interview mindset.** 'Does a fixed-length window match a target multiset?' (anagram/permutation search) is the fixed-size sliding-window signal: the window never changes width, you update counts by add-right/remove-left, and a lowercase-only alphabet points to a 26-slot array.",
          rcs:
            "class Solution:\n" +
            "    def checkInclusion(self, s1: str, s2: str) -> bool:\n" +
            "        if len(s1) > len(s2):                  # No window of the needed length fits.\n" +
            "            return False\n" +
            "        s1_count = [0] * 26                    # Target letter counts from s1.\n" +
            "        window_count = [0] * 26                # Letter counts in the current window.\n" +
            "        for i in range(len(s1)):               # Build target and the first window.\n" +
            "            s1_count[ord(s1[i]) - ord('a')] += 1\n" +
            "            window_count[ord(s2[i]) - ord('a')] += 1\n" +
            "        matches = 0                            # How many of 26 letters currently agree.\n" +
            "        for c in range(26):\n" +
            "            if s1_count[c] == window_count[c]:\n" +
            "                matches += 1\n" +
            "        left = 0\n" +
            "        for right in range(len(s1), len(s2)):  # Slide the fixed-width window right.\n" +
            "            if matches == 26:                  # First window already matched.\n" +
            "                return True\n" +
            "            enter = ord(s2[right]) - ord('a')  # Letter entering on the right.\n" +
            "            if window_count[enter] == s1_count[enter]:  # Was equal -> about to break.\n" +
            "                matches -= 1\n" +
            "            window_count[enter] += 1\n" +
            "            if window_count[enter] == s1_count[enter]:  # Now equal -> restored.\n" +
            "                matches += 1\n" +
            "            leave = ord(s2[left]) - ord('a')   # Letter leaving on the left.\n" +
            "            if window_count[leave] == s1_count[leave]:  # Was equal -> about to break.\n" +
            "                matches -= 1\n" +
            "            window_count[leave] -= 1\n" +
            "            if window_count[leave] == s1_count[leave]:  # Now equal -> restored.\n" +
            "                matches += 1\n" +
            "            left += 1\n" +
            "        return matches == 26                   # Check the final window too.",
          plain:
            "class Solution:\n" +
            "    def checkInclusion(self, s1: str, s2: str) -> bool:\n" +
            "        if len(s1) > len(s2):\n" +
            "            return False\n" +
            "        s1_count = [0] * 26\n" +
            "        window_count = [0] * 26\n" +
            "        for i in range(len(s1)):\n" +
            "            s1_count[ord(s1[i]) - ord('a')] += 1\n" +
            "            window_count[ord(s2[i]) - ord('a')] += 1\n" +
            "        matches = 0\n" +
            "        for c in range(26):\n" +
            "            if s1_count[c] == window_count[c]:\n" +
            "                matches += 1\n" +
            "        left = 0\n" +
            "        for right in range(len(s1), len(s2)):\n" +
            "            if matches == 26:\n" +
            "                return True\n" +
            "            enter = ord(s2[right]) - ord('a')\n" +
            "            if window_count[enter] == s1_count[enter]:\n" +
            "                matches -= 1\n" +
            "            window_count[enter] += 1\n" +
            "            if window_count[enter] == s1_count[enter]:\n" +
            "                matches += 1\n" +
            "            leave = ord(s2[left]) - ord('a')\n" +
            "            if window_count[leave] == s1_count[leave]:\n" +
            "                matches -= 1\n" +
            "            window_count[leave] -= 1\n" +
            "            if window_count[leave] == s1_count[leave]:\n" +
            "                matches += 1\n" +
            "            left += 1\n" +
            "        return matches == 26"
        }
      ],
      patternRecognition: [
        "'Does any fixed-length window equal a target character multiset' → fixed-size sliding window with a 26-slot count.",
        "'Permutation / anagram of s1 as a substring' is a counts-only comparison; order inside the window is irrelevant.",
        "The window width is constant (|s1|); it only slides — one letter in on the right, one out on the left."
      ],
      interviewRecall: [
        "Fixed window of width |s1|: update counts incrementally (add-right, remove-left), don't rebuild each step.",
        "A `matches` counter tracks how many of the 26 letters agree, giving O(1) match checks; adjust it before/after each count change.",
        "Guard |s1| > |s2| up front, and check the initial window before you start sliding."
      ]
    },

    {
      id: "sliding-window-maximum",
      lc: 239,
      title: "Sliding Window Maximum",
      difficulty: "Hard",
      category: "Sliding Window",
      link: "https://leetcode.com/problems/sliding-window-maximum/",
      meta: { pattern: "Fixed-size Sliding Window", dataStructure: "Monotonic Deque", technique: "Maintain decreasing candidates" },
      description:
        "Given an integer array `nums` and an integer `k`, a window of size `k` slides from the far left to the far right, one position at a time. Each position covers `k` consecutive elements.\n\n" +
        "Return an array of the **maximum** value in each window, in order — there are `len(nums) - k + 1` windows.",
      constraints: [
        "`1 <= nums.length <= 10^5`",
        "`-10^4 <= nums[i] <= 10^4`",
        "`1 <= k <= nums.length`"
      ],
      notes: [
        "The output has exactly `len(nums) - k + 1` entries.",
        "The window always has exactly `k` elements — it slides, it does not grow or shrink.",
        "A naive max-per-window recompute is O(n*k); the goal is to do better."
      ],
      examples: [
        {
          input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
          output: "[3,3,5,5,6,7]",
          reasoning: "Each window of 3 contributes its maximum: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7.",
          visual:
            "```\nnums:  1  3 -1 -3  5  3  6  7      k = 3\n      [1  3 -1]                    max = 3\n         [3 -1 -3]                 max = 3\n            [-1 -3  5]             max = 5\n               [-3  5  3]          max = 5\n                  [5  3  6]        max = 6\n                     [3  6  7]     max = 7\n```"
        },
        {
          input: "nums = [1], k = 1",
          output: "[1]",
          reasoning: "One window containing the single element."
        },
        {
          input: "nums = [9,8,7,6], k = 2",
          output: "[9,8,7]",
          reasoning: "A strictly decreasing array: each window's max is its leftmost element, which is why old maxima must be evicted as the window moves past them."
        },
        {
          input: "nums = [1,2,3,4], k = 2",
          output: "[2,3,4]",
          reasoning: "A strictly increasing array: each new right element becomes the max, wiping out smaller candidates behind it."
        }
      ],
      approaches: [
        {
          name: "Max-heap of (value, index)",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "A clean first improvement over the O(n*k) brute force; easy to reason about, though not optimal.",
          logic:
            "**What it asks.** Produce the maximum of every contiguous window of size `k` as the window slides across `nums`.\n\n" +
            "**Why the naive idea fails.** Recomputing the max of each window from scratch scans `k` elements per window across `n - k + 1` windows — `O(n*k)`, up to `10^10` for the limits. Adjacent windows overlap in `k - 1` elements, so this repeats almost all the work.\n\n" +
            "**Key Idea.** A max-heap can report the largest element in `O(log n)`, but heap entries do not disappear when the window moves past them. Store `(value, index)` pairs so that whenever we peek the top, we can check whether that maximum's index has fallen OUT of the current window; if so, discard it (lazy deletion) and peek again. The top of the heap, once we have discarded any stale entries, is the current window's maximum.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Use a max-heap of `(value, index)` (in Python, push `(-value, index)` since `heapq` is a min-heap). The window is the fixed range of the last `k` indices; the heap holds candidates, some possibly stale.\n" +
            "2. For each index `right`, push `(nums[right], right)` — the window has just admitted this element.\n" +
            "3. Before recording an answer, evict stale maxima: while the top entry's index is `<= right - k` (left of the window), pop it. This lazy deletion is what keeps the top valid.\n" +
            "4. Once `right >= k - 1` (the first full window is formed), the heap top's value is this window's maximum — append it.\n\n" +
            "**Why it works.** The true maximum of the current window is always somewhere in the heap (we never remove an in-window element early). Stale entries only ever sit ABOVE valid ones if they are larger, and we pop exactly those whose index has left the window before reading the top, so the exposed top is guaranteed to be the largest element whose index is still inside the window.\n\n" +
            "**Common Gotchas.**\n" +
            "- Push index alongside value; a bare value heap cannot tell whether the max is still in the window.\n" +
            "- Evict stale tops (`index <= right - k`) BEFORE reading the answer, not after.\n" +
            "- In Python negate values to simulate a max-heap with `heapq`.\n" +
            "- Only start recording once the first window is complete (`right >= k - 1`).\n\n" +
            "**Complexity.** Time `O(n log n)` — each element is pushed once and popped at most once, each `O(log n)`. Space `O(n)` for the heap in the worst case (e.g. a strictly increasing array where nothing is evicted early).\n\n" +
            "**Interview mindset.** State brute force `O(n*k)`, then reach for a structure that yields the running max cheaply; a lazily-deleted max-heap is the natural first upgrade, and it sets up the observation that leads to the optimal deque.",
          rcs:
            "class Solution:\n" +
            "    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n" +
            "        import heapq\n" +
            "        heap = []                              # Max-heap of (-value, index).\n" +
            "        result = []\n" +
            "        for right in range(len(nums)):         # Slide the right edge across nums.\n" +
            "            heapq.heappush(heap, (-nums[right], right))  # Admit the new element.\n" +
            "            while heap[0][1] <= right - k:     # Top's index has left the window...\n" +
            "                heapq.heappop(heap)            # ...lazily discard the stale max.\n" +
            "            if right >= k - 1:                 # First full window formed onward.\n" +
            "                result.append(-heap[0][0])     # Top is the current window max.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n" +
            "        import heapq\n" +
            "        heap = []\n" +
            "        result = []\n" +
            "        for right in range(len(nums)):\n" +
            "            heapq.heappush(heap, (-nums[right], right))\n" +
            "            while heap[0][1] <= right - k:\n" +
            "                heapq.heappop(heap)\n" +
            "            if right >= k - 1:\n" +
            "                result.append(-heap[0][0])\n" +
            "        return result"
        },
        {
          name: "Monotonic decreasing deque of indices",
          time: "O(n)",
          space: "O(k)",
          whenToUse: "The optimal answer for 'max (or min) of every fixed-size window' — linear time, constant-ish space.",
          logic:
            "**What it asks.** Return the maximum of every window of size `k` as it slides across `nums`, in `O(n)`.\n\n" +
            "**Why the naive idea fails.** Recomputing each window's max is `O(n*k)`. Even the heap approach is `O(n log n)` and can hold stale entries. We want each element handled in amortized `O(1)`.\n\n" +
            "**Key Idea.** Maintain a **deque of INDICES** whose corresponding values are in strictly (or weakly) DECREASING order — a monotonic deque. The invariant: the front always holds the index of the current window's maximum, and every index in the deque is a genuine 'future candidate' — an element still in the window that has not yet been beaten by a later, larger element. When a new element arrives, any smaller-or-equal values sitting at the BACK can never be the max again (the newcomer is larger and stays in the window at least as long), so we pop them off before appending the newcomer. When the front index falls out of the window's left edge, we pop it off the front. What the deque holds: indices of elements, largest at the front, decreasing toward the back; its invariant is that it contains exactly the elements that could still become a window maximum, in decreasing value order.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Use a `deque` of indices, `dq`, and an output list. The window is the last `k` indices ending at `right`; `dq` holds the candidates for its maximum, front = largest.\n" +
            "2. For each `right`: **maintain monotonicity at the back** — while `dq` is non-empty and `nums[dq[-1]] <= nums[right]`, pop from the back. Those elements are smaller than the incoming one and stay in-window no longer, so they can never again be a maximum.\n" +
            "3. Append `right` to the back — it is the newest candidate.\n" +
            "4. **Evict the expired front** — if the front index `dq[0]` equals `right - k` it has just slid out of the window; pop it from the front.\n" +
            "5. **Record the max** — once `right >= k - 1`, the front `nums[dq[0]]` is this window's maximum; append it to the output.\n\n" +
            "**Why it works.** The deque's decreasing invariant guarantees the front is the largest value among all indices still in the window: any element smaller than a later one was removed from the back when that later, longer-lived element arrived, so nothing at the front is ever dominated by something behind it. Front eviction removes exactly the element leaving the window. Each index is appended once and removed once, so the total back-pops and front-pops are bounded by `n` — amortized `O(1)` per element.\n\n" +
            "**Common Gotchas.**\n" +
            "- The deque stores INDICES, not values — you need indices to know when the front has left the window.\n" +
            "- Use `<=` (not `<`) when popping the back so equal values do not linger as dead weight; either works for correctness but `<=` keeps the deque smaller.\n" +
            "- Evict the front by comparing index to `right - k` (the position that just fell out), a common off-by-one.\n" +
            "- Only start appending answers once the first full window exists (`right >= k - 1`).\n\n" +
            "**Complexity.** Time `O(n)` — every index enters and leaves the deque at most once. Space `O(k)` — the deque never holds more than one window's worth of candidates.\n\n" +
            "**Interview mindset.** 'Running max/min over a fixed-size sliding window in linear time' is THE monotonic-deque signal. Say aloud what the deque holds (indices, values decreasing front-to-back) and its invariant (front = window max, everything inside is still a live candidate) — that framing is what interviewers listen for.",
          rcs:
            "class Solution:\n" +
            "    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n" +
            "        from collections import deque\n" +
            "        dq = deque()                           # Indices, values decreasing front->back.\n" +
            "        result = []\n" +
            "        for right in range(len(nums)):         # Slide the right edge across nums.\n" +
            "            while dq and nums[dq[-1]] <= nums[right]:  # Back values <= newcomer...\n" +
            "                dq.pop()                       # ...can never be max again: drop them.\n" +
            "            dq.append(right)                   # Newcomer is the newest candidate.\n" +
            "            if dq[0] == right - k:             # Front index slid out of the window.\n" +
            "                dq.popleft()                   # Evict the expired maximum.\n" +
            "            if right >= k - 1:                 # First full window formed onward.\n" +
            "                result.append(nums[dq[0]])     # Front is the current window max.\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n" +
            "        from collections import deque\n" +
            "        dq = deque()\n" +
            "        result = []\n" +
            "        for right in range(len(nums)):\n" +
            "            while dq and nums[dq[-1]] <= nums[right]:\n" +
            "                dq.pop()\n" +
            "            dq.append(right)\n" +
            "            if dq[0] == right - k:\n" +
            "                dq.popleft()\n" +
            "            if right >= k - 1:\n" +
            "                result.append(nums[dq[0]])\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'Maximum (or minimum) of every fixed-size window' in better than O(n*k) → monotonic deque.",
        "You need the running extreme of a window and old extremes must expire as the window moves → deque of indices.",
        "Each element can be dominated by a later, larger element that outlives it → pop smaller values from the back."
      ],
      interviewRecall: [
        "Deque holds INDICES with values strictly decreasing front-to-back; the front is always the window max.",
        "Pop smaller-or-equal values off the back before appending; pop the front when its index == right - k.",
        "Amortized O(n): every index is pushed once and popped once. Mention the O(n log n) lazy-deletion max-heap as the simpler alternative."
      ]
    }
  ]);
})();
