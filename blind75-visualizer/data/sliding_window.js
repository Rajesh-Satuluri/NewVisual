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
            "**What it asks.** Return the length of the longest contiguous stretch of `s` in which no character repeats.\n\n" +
            "**The idea (and why it's slow).** The obvious approach is to consider every possible starting index `i`, and from each `i` extend a substring one character at a time using a growing set of seen characters. The instant the next character is already in the set, this starting point can go no further — record how long it got and move to the next `i`. This is slow because there are `O(n)` starting points and each can scan up to `O(n)` characters, so the work is `O(n^2)`. For `n = 5 * 10^4` that is billions of operations. The waste is that when we advance the start from `i` to `i+1`, we throw away everything we just learned and rebuild the `seen` set from scratch.\n\n" +
            "**Key Idea.** The longest unique run beginning at each starting position can be found independently by extending until the first repeat; the global answer is the maximum of these per-start runs. This is the brute-force baseline you state before collapsing the two nested scans into a single sliding window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each start index `i`, create an empty `seen` set.\n" +
            "2. Walk `j` from `i` forward.\n" +
            "3. If `s[j]` is already in `seen`, stop — this start can extend no further.\n" +
            "4. Otherwise add `s[j]` to `seen` and update the best length as `j - i + 1`.\n" +
            "5. Move to the next start `i` and repeat.\n\n" +
            "**Why it works.** Every substring is uniquely characterized by its start and its (exclusive) end. By trying every start and extending maximally until a repeat, we examine the longest unique run beginning at each position, so the maximum over all starts is necessarily the global answer.\n\n" +
            "**Common Gotchas.**\n" +
            "- The empty string must return `0` — the outer loop simply never runs.\n" +
            "- The `seen` set must be reset for each new start, or stale characters leak between attempts.\n" +
            "- The measured length is `j - i + 1` (inclusive of both ends), a classic off-by-one spot.\n\n" +
            "**Complexity.** Time `O(n^2)` — `O(n)` starts each scanning up to `O(n)` characters. Space `O(min(n, alphabet))` for the per-start set.\n\n" +
            "**Interview mindset.** State this first to show you understand the problem, then note the redundant re-scanning of overlapping substrings — that waste is the signal to reach for a sliding window.",
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
            "**What it asks.** Return the length of the longest contiguous substring of `s` that contains no repeated character.\n\n" +
            "**Why the naive idea fails.** Restarting from every possible start and rebuilding a `seen` set from scratch is `O(n^2)`, because advancing the start by one throws away everything already learned about the overlapping prefix. For `n = 5 * 10^4` that is far too slow.\n\n" +
            "**Key Idea.** As we extend the substring to the right, the only thing that can break the 'all unique' invariant is the character we just added. When `s[right]` duplicates something already inside the current stretch, we do NOT need to restart — we only need to drop characters from the LEFT until that duplicate is expelled. Because both ends only ever move forward, the whole scan is linear even though it appears to revisit elements.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. The **window** `[left, right]` represents the current candidate substring, which we maintain as all-distinct. `seen` is the set of characters currently inside it; `longest` is the best width found.\n" +
            "2. The window **expands** by moving `right` one step to admit `s[right]` — this is the outer loop driving the scan.\n" +
            "3. The window **contracts** whenever admitting `s[right]` would repeat a character: the driving condition is a duplicate. While `s[right]` is already in `seen`, remove `s[left]` and advance `left`, evicting characters from the front until the duplicate is gone.\n" +
            "4. Once the front has been cleared, add `s[right]` to `seen`.\n" +
            "5. Measure the now-valid window: `longest = max(longest, right - left + 1)`.\n\n" +
            "**Why it works.** After the contract step, the window `[left, right]` is guaranteed to hold a substring with no repeats, and it is the longest such substring ending exactly at `right`. Because `left` never moves backward, no longer valid window is ever skipped, so taking the maximum width over all `right` yields the global longest.\n\n" +
            "**Common Gotchas.**\n" +
            "- Add `s[right]` to `seen` only AFTER the contract loop, otherwise you would immediately evict the character you just added.\n" +
            "- Measure the window after contracting, not before, or you might record an invalid (duplicate-containing) width.\n" +
            "- The empty string returns `0` — the loop never runs, which is correct.\n" +
            "- A faster variant maps each character to its last seen index so `left` can jump directly to `max(left, last[c] + 1)` instead of stepping one character at a time.\n\n" +
            "**Complexity.** Time `O(n)` — each character is added once and removed at most once, so both pointers together traverse `s` at most twice. Space `O(min(n, alphabet))`, since the set holds at most one of each distinct character.\n\n" +
            "**Interview mindset.** 'Longest/shortest contiguous run under a constraint' combined with 'a violation caused by the newest element can be repaired by dropping elements from the front' is the classic sliding-window signal.",
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
            "**What it asks.** Find the longest substring that can be turned into a single repeated character by replacing at most `k` of its characters.\n\n" +
            "**Why the naive idea fails.** The obvious approach tries every substring and, for each, counts how many characters are NOT the most common one; if that count is `<= k` the substring is achievable. Enumerating all `O(n^2)` substrings (and counting within each) is far too slow for `n = 10^5`.\n\n" +
            "**Key Idea.** For any fixed window, the cheapest way to make it uniform is to keep whichever letter already appears most often and replace all the rest. So the number of replacements a window needs is `window_length - maxFreq`, where `maxFreq` is the count of the most frequent character in the window. The window is **feasible** exactly when `window_length - maxFreq <= k`. This single test turns the problem into finding the longest feasible window.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. The **window** `[left, right]` represents a candidate substring we intend to make uniform. `count[c]` holds occurrences of letter `c` inside it, `maxFreq` is the largest single-letter count seen, and `longest` is the best width found. A fixed 26-slot frequency table backs the counts.\n" +
            "2. The window **expands** by moving `right` to admit `s[right]`: increment `count[s[right]]` and refresh `maxFreq`.\n" +
            "3. The window **contracts** from the LEFT only when the feasibility condition is violated — that condition, `window_length - maxFreq <= k`, is what drives the movement. If `(right - left + 1) - maxFreq > k`, decrement `count[s[left]]` and advance `left` once.\n" +
            "4. Record `longest = max(longest, right - left + 1)`.\n\n" +
            "**Why it works.** Whenever the window is measured it satisfies `len - maxFreq <= k`, so it is genuinely achievable. A subtle point: `maxFreq` is never decremented on shrink, so it may be a historical high — but that is fine, because we only care about finding a LONGER window. A stale `maxFreq` can only make the feasibility test stricter, never looser, so it never validates an impossible window; and since `left` advances by at most one per step (a single `if`, not a `while`), the window width is non-decreasing and ends up capturing the maximum feasible length.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a single `if` to shrink, not a `while` — the window width should never actually decrease, which is what keeps it `O(n)` and lets the stale-`maxFreq` trick work.\n" +
            "- Do not bother recomputing the true maximum frequency after shrinking; it is unnecessary and only slows the loop.\n" +
            "- `k = 0` (no replacements allowed) and an already-uniform string must both work — they fall out naturally.\n" +
            "- The replacements are hypothetical: you count the best achievable length, you do not build a modified string.\n\n" +
            "**Complexity.** Time `O(n)` — one pass with a constant-size 26-letter table. Space `O(1)`.\n\n" +
            "**Interview mindset.** 'At most k changes/removals to make a window satisfy a property' points to a sliding window where the window's cost is compared against `k`; the uppercase-only alphabet hints at a fixed 26-slot frequency table.",
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
            "**What it asks.** Return the shortest contiguous slice of `s` that contains every character of `t`, respecting how many times each is required (multiplicity), or `\"\"` if none exists.\n\n" +
            "**Why the naive idea fails.** Enumerating all `O(n^2)` substrings and checking each against `t`'s multiset requirement is far too slow for `n = 10^5`, and re-checks enormous overlap between adjacent substrings.\n\n" +
            "**Key Idea.** A valid window need only cover `t`. So GROW the window on the right until it first becomes valid (covers `t` with multiplicity), then SHRINK it on the left as far as it stays valid — every such shrink is a chance for a smaller answer. Sweeping `right` across `s` once while `left` chases it visits each character at most twice, giving linear time. The trick that makes this cheap is tracking coverage with a satisfied-counter rather than re-comparing whole maps.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Set up the counters. `need` maps each required character to its required count (from `t`); `required` is the number of DISTINCT characters to satisfy (`len(need)`); `window[c]` counts characters currently inside `[left, right]`; `have` counts how many DISTINCT required characters are currently fully satisfied (window count equals needed count). The window is valid exactly when `have == required`, an `O(1)` test. `best_len`/`best_start` remember the smallest valid window.\n" +
            "2. The window **expands** by moving `right` to admit `s[right]`: increment `window[s[right]]`, and if it is a required character whose window count now equals its needed count, increment `have`.\n" +
            "3. The window **contracts** while it is valid — validity, `have == required`, is the driving condition. While valid: first update the best answer if this window is shorter, then drop `s[left]` (decrement `window[s[left]]`); if that pushes a required character below its needed count, decrement `have`; advance `left`.\n" +
            "4. Continue until `right` reaches the end, then return the best window (or `\"\"` if none was ever valid).\n\n" +
            "**Why it works.** The answer is recorded only while the window is valid, and the inner while-loop contracts to the smallest valid window ending at each `right`; taking the minimum over all `right` yields the global shortest. `have == required` captures full multiset coverage exactly, because a character bumps `have` only when its count first reaches the needed amount and drops it only when it falls below.\n\n" +
            "**Common Gotchas.**\n" +
            "- Record the answer INSIDE the while-loop, before shrinking, or you will miss the minimal window.\n" +
            "- Increment `have` only when a count first REACHES its needed value (use `==`, not `>=`), otherwise surplus copies over-count satisfaction.\n" +
            "- Return `\"\"` when no valid window was ever found, e.g. `t` longer than `s` or a character of `t` absent from `s`.\n" +
            "- Multiplicity matters: `t = \"aa\"` requires two `'a'`s in the window, not one.\n\n" +
            "**Complexity.** Time `O(|s| + |t|)` — `right` and `left` each traverse `s` once and `t` is scanned to build `need`. Space `O(|s| + |t|)` for the maps holding distinct characters.\n\n" +
            "**Interview mindset.** 'Smallest window covering a required set/multiset' is the signal: expand to become valid, contract to minimize, and use a satisfied-counter for `O(1)` validity checks instead of comparing maps each step.",
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
