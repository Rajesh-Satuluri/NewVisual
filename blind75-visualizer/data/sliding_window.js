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
            "**A. What is being asked?** The length of the longest contiguous stretch of `s` in which no character repeats.\n\n" +
            "**B. Brute force idea.** Consider every possible starting index `i`. From each `i`, extend a substring one character at a time using a growing set of seen characters. The instant the next character is already in the set, this starting point can go no further — record how long it got and move to the next `i`.\n\n" +
            "**C. Why it is slow.** There are `O(n)` starting points, and each can scan up to `O(n)` characters, so the work is `O(n^2)`. For `n = 5 * 10^4` that is billions of operations — too slow. The waste is that when we advance the start from `i` to `i+1`, we throw away everything we just learned and rebuild the set from scratch.\n\n" +
            "**I. Step by step.** For each start `i`: create an empty `seen` set; walk `j` from `i` forward; if `s[j]` is in `seen`, stop; otherwise add it and update the best length as `j - i + 1`.\n\n" +
            "**J. Why correct.** Every substring is characterized by its start and its (exclusive) end; by trying every start and extending maximally, we examine the longest unique run beginning at each position, and the global answer is the max of those.\n\n" +
            "**K/L. Complexity.** Time `O(n^2)`, space `O(min(n, alphabet))` for the per-start set.",
          rcs:
            "class Solution:\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:\n" +
            "        n = len(s)\n" +
            "        longest = 0\n" +
            "        for i in range(n):                     # Try every starting index.\n" +
            "            seen = set()                       # Characters in the current attempt.\n" +
            "            for j in range(i, n):              # Extend the substring rightward.\n" +
            "                if s[j] in seen:               # A repeat ends this attempt.\n" +
            "                    break\n" +
            "                seen.add(s[j])                 # Character is new: keep it.\n" +
            "                longest = max(longest, j - i + 1)  # Update best length seen.\n" +
            "        return longest",
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
            "**D. Key observation.** As we extend the window to the right, the only thing that can break the 'all unique' invariant is the character we just added. When it duplicates something already inside the window, we do NOT need to restart — we only need to shrink from the LEFT until the duplicate is gone. Both pointers move strictly forward, so total work is linear.\n\n" +
            "**E. Pattern / data structure.** A **variable-size sliding window** `[left, right]`. The WINDOW represents the current candidate substring with all-distinct characters. It EXPANDS by moving `right` one step to admit `s[right]`. It CONTRACTS by moving `left` forward whenever `s[right]` is already inside the window. The driving condition is 'the window must contain no duplicate'. Track membership with a **hash set** (or, faster, a map from character → its last seen index so `left` can jump directly).\n\n" +
            "**F. Why it works.** At every moment after the shrink step, the window `[left, right]` holds a substring with no repeats, and it is the longest such substring ending exactly at `right`. Taking the maximum window size over all `right` therefore yields the global longest.\n\n" +
            "**G/H. What each variable holds.** `left` is the start of the current window; `right` scans every character once; `seen` is the set of characters currently inside `[left, right]`; `longest` is the best width found.\n\n" +
            "**I. Step by step.** For each `right`, while `s[right]` is already in `seen`, remove `s[left]` and advance `left` (this evicts characters until the duplicate is expelled). Then add `s[right]` and update `longest = max(longest, right - left + 1)`.\n\n" +
            "**J. Why correct.** The while-loop guarantees the invariant (no duplicates) is restored before we measure, and because `left` never moves backward we never miss a longer valid window. The last-index-map variant is the same idea with a shortcut: on a duplicate, jump `left` to `max(left, last[c] + 1)` instead of stepping one at a time.\n\n" +
            "**K/L. Complexity.** Each character is added once and removed at most once → `O(n)` time; the set holds at most one of each distinct character → `O(min(n, alphabet))` space.\n\n" +
            "**M. Interview mindset.** 'Longest/shortest contiguous run under a constraint' + 'you can fix a violation by dropping elements from the front' is the classic sliding-window signal.",
          rcs:
            "class Solution:\n" +
            "    def lengthOfLongestSubstring(self, s: str) -> int:\n" +
            "        seen = set()                           # Characters currently inside the window.\n" +
            "        left = 0                               # Left edge of the window.\n" +
            "        longest = 0\n" +
            "        for right in range(len(s)):            # Expand the window one char at a time.\n" +
            "            while s[right] in seen:            # New char duplicates one inside the window...\n" +
            "                seen.remove(s[left])           # ...so evict from the left...\n" +
            "                left += 1                      # ...until the duplicate is gone.\n" +
            "            seen.add(s[right])                 # Now safe to admit s[right].\n" +
            "            longest = max(longest, right - left + 1)  # Window is valid: measure it.\n" +
            "        return longest",
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
            "**A. What is being asked?** The longest substring that becomes uniform after changing at most `k` characters.\n\n" +
            "**B. Brute force.** Try every substring, and for each count how many characters are NOT the most common one; if that count `<= k`, it is achievable. That is `O(n^2)` (or worse) and too slow for `n = 10^5`.\n\n" +
            "**D. Key observation.** For a fixed window, the cheapest way to make it uniform is to keep whichever letter already appears most often and replace all the rest. So the number of replacements needed is `window_length - maxFreq`, where `maxFreq` is the count of the most frequent character in the window. The window is **feasible** exactly when `window_length - maxFreq <= k`.\n\n" +
            "**E. Pattern / data structure.** A **variable-size sliding window** with a **frequency array** of the 26 letters. The WINDOW represents a candidate substring we intend to make uniform. It EXPANDS by moving `right` to admit `s[right]` (incrementing its count). It CONTRACTS from the LEFT only when the feasibility condition `window_length - maxFreq <= k` is violated. The condition on `maxFreq` is what drives the movement.\n\n" +
            "**F. Why we track max frequency.** `maxFreq` is what determines how many characters are 'wrong' and must be replaced. We do not need it to be perfectly up to date after shrinking: because we only ever want a LONGER answer, letting `maxFreq` be a historical high is fine — the window never shrinks below the best length already found, and it only grows when a genuinely better window appears. This lets us avoid recomputing the true maximum each step.\n\n" +
            "**G/H. What each variable holds.** `count[c]` = occurrences of letter `c` inside `[left, right]`; `maxFreq` = the largest single-letter count seen; `left` = window start; `longest` = best width.\n\n" +
            "**I. Step by step.** For each `right`: increment `count[s[right]]`, refresh `maxFreq`. If `(right - left + 1) - maxFreq > k` the window needs more than `k` replacements, so decrement `count[s[left]]` and advance `left` once. Then record `longest = max(longest, right - left + 1)`.\n\n" +
            "**J. Why correct.** Whenever the window is measured it satisfies `len - maxFreq <= k`, meaning it is truly achievable. Because `left` advances by at most one per step (a single `if`, not a `while`), the window width is non-decreasing and captures the maximum feasible length.\n\n" +
            "**K/L. Complexity.** One pass, constant-size 26-letter table → time `O(n)`, space `O(1)`.\n\n" +
            "**M. Interview mindset.** 'At most k changes/removals to make a window satisfy a property' → sliding window where the cost of the window is compared against `k`.",
          rcs:
            "class Solution:\n" +
            "    def characterReplacement(self, s: str, k: int) -> int:\n" +
            "        from collections import defaultdict\n" +
            "        count = defaultdict(int)               # count[c] = c's frequency in the window.\n" +
            "        left = 0\n" +
            "        max_freq = 0                           # Highest single-letter count seen so far.\n" +
            "        longest = 0\n" +
            "        for right in range(len(s)):            # Expand the window rightward.\n" +
            "            count[s[right]] += 1               # Admit the new character.\n" +
            "            max_freq = max(max_freq, count[s[right]])  # Update the dominant count.\n" +
            "            # Characters to replace = window size - most common char's count.\n" +
            "            if (right - left + 1) - max_freq > k:  # Too many replacements needed?\n" +
            "                count[s[left]] -= 1            # Shrink from the left by one.\n" +
            "                left += 1\n" +
            "            longest = max(longest, right - left + 1)  # Window is feasible now.\n" +
            "        return longest",
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
            "**A. What is being asked?** The shortest contiguous slice of `s` that contains all characters of `t`, respecting how many times each is required.\n\n" +
            "**B. Brute force.** Enumerate all `O(n^2)` substrings and check each against `t`'s requirement — far too slow for `n = 10^5`.\n\n" +
            "**D. Key observation.** A valid window must simply cover `t`. So we can GROW the window on the right until it becomes valid (covers `t`), then SHRINK it on the left as far as possible while it stays valid — each such shrink might give a smaller answer. Sweeping `right` across `s` once, and letting `left` chase it, visits each character at most twice.\n\n" +
            "**E. Pattern / data structure.** A **variable-size sliding window** `[left, right]`. The WINDOW represents a candidate covering substring. It EXPANDS (`right++`) to acquire missing required characters; it CONTRACTS (`left++`) to drop surplus once the window is already valid. The driving condition is validity: 'does the window currently contain every character of `t` with enough multiplicity?'\n\n" +
            "**F. The have / need counters.** `need` is a map of each required character to its required count (from `t`). `required` is the number of DISTINCT characters we must satisfy (`len(need)`). `window` counts characters currently inside `[left, right]`. `have` counts how many DISTINCT required characters are currently fully satisfied (their window count equals their needed count). The window is valid exactly when `have == required`. Using `have`/`required` lets us test validity in `O(1)` instead of comparing whole maps.\n\n" +
            "**G/H. What each variable holds.** `left`, `right` = window edges; `window[c]` = occurrences of `c` in the window; `have` = how many required characters are satisfied; `best_len` and `best_start` = the smallest valid window found.\n\n" +
            "**I. Step by step.** For each `right`, add `s[right]` to `window`; if it is a required character and its window count now equals its needed count, increment `have`. While `have == required` (window valid): update the best answer if this window is shorter, then remove `s[left]` from `window` — if that drops a required character below its needed count, decrement `have` — and advance `left`. Continue until `right` reaches the end.\n\n" +
            "**J. Why correct.** We only record the answer while the window is valid, and the inner while-loop contracts to the smallest valid window ending at each `right`. Taking the minimum over all `right` yields the global shortest. `have == required` precisely captures full coverage with multiplicity, because a character only bumps `have` when its count first reaches the needed amount and only drops it when it falls below.\n\n" +
            "**K/L. Complexity.** `right` and `left` each traverse `s` once → `O(|s| + |t|)` time; the maps hold at most the distinct characters → `O(|s| + |t|)` space.\n\n" +
            "**M. Interview mindset.** 'Smallest window covering a required set/multiset' → expand to become valid, contract to minimize, and use a satisfied-counter for O(1) validity checks.",
          rcs:
            "class Solution:\n" +
            "    def minWindow(self, s: str, t: str) -> str:\n" +
            "        if not s or not t:\n" +
            "            return \"\"\n" +
            "        from collections import Counter, defaultdict\n" +
            "        need = Counter(t)                      # Required char -> required count.\n" +
            "        required = len(need)                   # Distinct chars we must satisfy.\n" +
            "        window = defaultdict(int)              # Char counts inside the window.\n" +
            "        have = 0                               # Distinct required chars fully satisfied.\n" +
            "        best_len = float('inf')                # Smallest valid window width so far.\n" +
            "        best_start = 0                         # Start index of that best window.\n" +
            "        left = 0\n" +
            "        for right in range(len(s)):           # Expand the window rightward.\n" +
            "            c = s[right]\n" +
            "            window[c] += 1                     # Admit the new character.\n" +
            "            if c in need and window[c] == need[c]:  # Just met this char's requirement.\n" +
            "                have += 1\n" +
            "            while have == required:            # Window covers all of t: try to shrink.\n" +
            "                if right - left + 1 < best_len:  # Found a smaller valid window.\n" +
            "                    best_len = right - left + 1\n" +
            "                    best_start = left\n" +
            "                left_char = s[left]\n" +
            "                window[left_char] -= 1         # Drop the leftmost character...\n" +
            "                if left_char in need and window[left_char] < need[left_char]:\n" +
            "                    have -= 1                  # ...it broke a requirement, no longer valid.\n" +
            "                left += 1                      # Advance the left edge.\n" +
            "        return s[best_start:best_start + best_len] if best_len != float('inf') else \"\"",
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
    }
  ]);
})();
