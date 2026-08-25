/*
 * Blind 75 — Heap / Priority Queue
 * =========================================================================
 * Format reference: ../data/arrays_hashing.js
 *
 * A heap (binary heap) is a complete binary tree kept in an array that
 * maintains the "heap property": in a MIN-heap every parent <= its children,
 * so the smallest element is always at the root. It gives you:
 *   - push  : O(log n)  (bubble up)
 *   - pop   : O(log n)  (remove root, bubble down)
 *   - peek  : O(1)      (root is the min/max)
 * You DON'T get sorted iteration or O(1) arbitrary lookup — a heap only
 * promises fast access to the single most extreme element. That is exactly
 * the right tool when a problem repeatedly asks "give me the smallest/largest
 * so far" or "keep the top-k".
 *
 * Python's `heapq` is a MIN-heap ONLY. To get MAX-heap behaviour you negate
 * the values on the way in and negate again on the way out (push -x, the
 * smallest -x corresponds to the largest x). For tuples you can negate the
 * first (priority) field. This negation trick appears in every file below.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Heap / Priority Queue", [
    {
      id: "find-median-from-data-stream",
      lc: 295,
      title: "Find Median from Data Stream",
      difficulty: "Hard",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/find-median-from-data-stream/",
      meta: { pattern: "Two Heaps (balanced halves)", dataStructure: "Max-heap + Min-heap", technique: "Rebalance on insert" },
      description:
        "Design a data structure that ingests integers one at a time and can report the **median** of everything seen so far at any moment.\n\n" +
        "The median is the middle value of an ordered list; when the count is **even**, it is the average of the two middle values. Implement:\n\n" +
        "- `MedianFinder()` — initialize the structure.\n" +
        "- `addNum(num)` — add integer `num` to the stream.\n" +
        "- `findMedian()` — return the current median as a `float`.\n\n" +
        "The stream can be long, so `addNum` should be fast (`O(log n)`) and `findMedian` should be `O(1)`.",
      constraints: [
        "`-10^5 <= num <= 10^5`",
        "There will be at least one element before `findMedian` is called.",
        "At most `5 * 10^4` calls total to `addNum` and `findMedian`."
      ],
      notes: [
        "Re-sorting the whole collection on every query would be `O(n log n)` per call — far too slow across tens of thousands of calls.",
        "The median only depends on the one or two values in the MIDDLE, so you never need the full ordering — just fast access to the boundary between the lower and upper halves."
      ],
      examples: [
        {
          input: "addNum(1); addNum(2); findMedian(); addNum(3); findMedian()",
          output: "1.5, then 2.0",
          reasoning: "After 1 and 2 the sorted view is [1,2] so the median is (1+2)/2 = 1.5. After adding 3 the view is [1,2,3] and the middle value is 2.0.",
          visual:
            "```\n" +
            "Keep two heaps that split the sorted data in half:\n" +
            "\n" +
            "  low  = MAX-heap of the smaller half   (its root = largest of the low half)\n" +
            "  high = MIN-heap of the larger half    (its root = smallest of the high half)\n" +
            "\n" +
            "after 1,2,3:      low = [2, 1]        high = [3]\n" +
            "                    ^ max-heap root      ^ min-heap root\n" +
            "sorted picture:   1  2 | 3\n" +
            "                       ^ median = low root = 2.0\n" +
            "\n" +
            "even count (1,2): low = [1]   high = [2]\n" +
            "  median = (low root + high root) / 2 = (1 + 2)/2 = 1.5\n" +
            "```"
        },
        {
          input: "addNum(6); findMedian(); addNum(10); addNum(2); addNum(6); findMedian()",
          output: "6.0, then 6.0",
          reasoning: "After [6] the median is 6.0. After [2,6,6,10] the two middle values are 6 and 6, average 6.0.",
          visual:
            "```\n" +
            "stream: 6, 10, 2, 6   sorted view: 2  6 | 6  10\n" +
            "        low = [6, 2]   (max-heap, root 6)\n" +
            "        high= [6, 10]  (min-heap, root 6)\n" +
            "        even -> median = (6 + 6)/2 = 6.0\n" +
            "```"
        },
        {
          input: "addNum(-1); addNum(-2); addNum(-3); findMedian()",
          output: "-2.0",
          reasoning: "Sorted view is [-3,-2,-1]; the middle value is -2.0. Negative numbers behave identically."
        },
        {
          input: "addNum(5); findMedian()",
          output: "5.0",
          reasoning: "A single element is its own median."
        }
      ],
      approaches: [
        {
          name: "Optimized — Two Heaps",
          time: "O(log n) per addNum, O(1) per findMedian",
          space: "O(n)",
          whenToUse: "The canonical streaming-median solution: any time you need the middle (or a running percentile) of data that keeps arriving.",
          logic:
            "**What it asks.** Maintain the median of a growing multiset under two operations: insert a number, and read the current median at any moment. Both must be fast because the stream can hold tens of thousands of values.\n\n" +
            "**Why the naive idea fails.** The obvious approach is to keep the numbers in a sorted array. But inserting into a sorted array is `O(n)` because you must shift elements to make room, and if instead you re-sort on every query that is `O(n log n)` per call — far too slow across so many operations.\n\n" +
            "**Key Idea.** The median only cares about the *boundary* between the smaller half of the values and the larger half — never the full ordering. If we could always peek at the largest element of the low half and the smallest element of the high half, we would have everything we need. A heap peeks at its extreme element in `O(1)`, so we keep two heaps facing each other: `low`, a **max-heap** holding the smaller half (its root is the largest of the low half), and `high`, a **min-heap** holding the larger half (its root is the smallest of the high half). Because Python's `heapq` is a min-heap only, we simulate the max-heap by **negating** every value pushed into `low` (push `-num`, read the max back as `-low[0]`).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Maintain two invariants after every insert. **Ordering:** every value in `low` is `<=` every value in `high` (so `-low[0] <= high[0]`), which makes the two roots the true middle elements. **Size:** the heaps differ by at most 1, with the convention that `low` may carry the one extra element (`len(low) == len(high)` or `len(low) == len(high) + 1`).\n" +
            "2. On `addNum`, push the new number onto `low` (as `-num`); its root is now a candidate for the middle.\n" +
            "3. Fix ordering: pop the max of `low` and push it onto `high`. The moved element is the largest of the low side and now sits on the high side, so nothing on the low side exceeds the high side.\n" +
            "4. Fix size: if `high` now has more elements than `low`, pop `high`'s root (its min) and push it back onto `low`, restoring the `low >= high` size convention.\n" +
            "5. On `findMedian`, if the heaps are equal in size the count is even and the median is the average of the two roots, `(-low[0] + high[0]) / 2`; otherwise `low` holds the extra element, the count is odd, and the median is its root, `-low[0]`.\n\n" +
            "**Why it works.** The ordering and size fixes together guarantee both invariants after every insert, so at all times `low` holds the `floor(count/2)` or `ceil(count/2)` smallest values and `high` holds the rest. The boundary between the two halves is exactly the two roots, which is exactly where the median lives.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting the negation: `heapq` is a min-heap, so `low` must store negatives and be read back as `-low[0]`.\n" +
            "- Skipping the size rebalance step lets the heaps drift apart, breaking the median lookup — always re-check sizes after the ordering fix.\n" +
            "- Even counts must average the two middles as a `float`; returning only one root gives a wrong answer.\n" +
            "- A single element is its own median — the odd-count branch handles it naturally.\n\n" +
            "**Complexity.** `addNum` does a constant number of heap push/pop operations, each `O(log n)`, so `O(log n)` per insert. `findMedian` reads one or two roots, `O(1)`. Space `O(n)` to store every element.\n\n" +
            "**Interview mindset.** 'Running median' or 'running percentile of a stream' is the signature cue for the two-heaps pattern. The reusable idea: a max-heap and a min-heap facing each other keep the middle of a dataset accessible in `O(1)` while inserts stay `O(log n)`.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class MedianFinder:\n" +
            "    def __init__(self):\n" +
            "        self.low = []        # Max-heap (store negatives): the smaller half of the numbers.\n" +
            "        self.high = []       # Min-heap: the larger half of the numbers.\n" +
            "\n" +
            "    def addNum(self, num: int) -> None:\n" +
            "        heapq.heappush(self.low, -num)              # Tentatively add to the low (max) heap.\n" +
            "        # Ordering fix: hand low's largest over to high so low's every value <= high's.\n" +
            "        heapq.heappush(self.high, -heapq.heappop(self.low))\n" +
            "        # Size fix: keep low >= high in count; if high grew bigger, move its min back.\n" +
            "        if len(self.high) > len(self.low):\n" +
            "            heapq.heappush(self.low, -heapq.heappop(self.high))\n" +
            "\n" +
            "    def findMedian(self) -> float:\n" +
            "        if len(self.low) > len(self.high):          # Odd count: low holds the extra middle.\n" +
            "            return float(-self.low[0])              # low's root (un-negated) is the median.\n" +
            "        # Even count: average the two middle roots.\n" +
            "        return (-self.low[0] + self.high[0]) / 2.0",
          plain:
            "import heapq\n" +
            "\n" +
            "class MedianFinder:\n" +
            "    def __init__(self):\n" +
            "        self.low = []\n" +
            "        self.high = []\n" +
            "\n" +
            "    def addNum(self, num: int) -> None:\n" +
            "        heapq.heappush(self.low, -num)\n" +
            "        heapq.heappush(self.high, -heapq.heappop(self.low))\n" +
            "        if len(self.high) > len(self.low):\n" +
            "            heapq.heappush(self.low, -heapq.heappop(self.high))\n" +
            "\n" +
            "    def findMedian(self) -> float:\n" +
            "        if len(self.low) > len(self.high):\n" +
            "            return float(-self.low[0])\n" +
            "        return (-self.low[0] + self.high[0]) / 2.0"
        }
      ],
      patternRecognition: [
        "'Running median', 'median of a stream', or 'middle value that must stay queryable as data arrives'.",
        "You need the middle of a dataset repeatedly but never the full sorted order — two heaps facing each other.",
        "More generally: keep a balanced split of data so a boundary statistic (median, running percentile) is O(1) to read."
      ],
      interviewRecall: [
        "low = max-heap (store negatives) of the smaller half; high = min-heap of the larger half.",
        "Invariants: every low <= every high, and sizes differ by at most 1 (let low keep the extra).",
        "Insert trick: push to low, pop-and-move its max to high, then if high is bigger move its min back to low.",
        "Median: odd -> -low[0]; even -> (-low[0] + high[0]) / 2. Remember Python heapq is a MIN-heap, hence the negation."
      ]
    },

    {
      id: "top-k-frequent-elements",
      lc: 347,
      title: "Top K Frequent Elements",
      difficulty: "Medium",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/top-k-frequent-elements/",
      meta: { pattern: "Frequency + Heap / Bucket", dataStructure: "Hash Map + Heap / Buckets", technique: "Count then select top-k" },
      description:
        "Given an integer array `nums` and an integer `k`, return the `k` **most frequent** elements. The answer may be returned in any order.\n\n" +
        "The problem asks for an algorithm better than `O(n log n)` (i.e. better than fully sorting by frequency).",
      constraints: [
        "`1 <= nums.length <= 10^5`",
        "`-10^4 <= nums[i] <= 10^4`",
        "`1 <= k <= number of distinct elements in nums`",
        "The answer is guaranteed to be unique."
      ],
      notes: [
        "`k` is always valid (never larger than the number of distinct values).",
        "Only the SET of top-k values matters, not their order."
      ],
      examples: [
        {
          input: "nums = [1, 1, 1, 2, 2, 3], k = 2",
          output: "[1, 2]",
          reasoning: "1 appears 3 times, 2 appears twice, 3 once. The two most frequent are 1 and 2.",
          visual:
            "```\n" +
            "counts: {1:3, 2:2, 3:1}\n" +
            "\n" +
            "bucket by frequency (index = count):\n" +
            "  freq: 0   1     2     3\n" +
            "        []  [3]   [2]   [1]\n" +
            "walk buckets from the RIGHT, take values until we have k=2: 1, then 2\n" +
            "```"
        },
        {
          input: "nums = [1], k = 1",
          output: "[1]",
          reasoning: "Only one distinct value; it is trivially the most frequent."
        },
        {
          input: "nums = [4, 4, 4, 5, 5, 6, 6, 6, 6], k = 1",
          output: "[6]",
          reasoning: "6 appears 4 times, more than 4 (three times) and 5 (twice)."
        },
        {
          input: "nums = [7, 7, 8, 8, 9], k = 2",
          output: "[7, 8]",
          reasoning: "7 and 8 each appear twice, 9 once; the two most frequent are 7 and 8."
        }
      ],
      approaches: [
        {
          name: "Heap of size k",
          time: "O(n log k)",
          space: "O(n)",
          whenToUse: "When k is much smaller than the number of distinct elements, or when a streaming / bounded-memory top-k is wanted.",
          logic:
            "**What it asks.** Return the `k` values that occur most often in the array. Only the set of top-k values matters, not their order.\n\n" +
            "**Why the naive idea fails.** After counting occurrences with a hash map in one `O(n)` pass (`count[value] = frequency`), the tempting follow-up is to sort the distinct values by frequency and take the last `k`. That is `O(m log m)` where `m` is the number of distinct values — correct, but it fully orders every frequency when we only need the largest `k`, wasted work when `k` is small.\n\n" +
            "**Key Idea.** We don't need the full ordering of all frequencies, only the top `k`. A **min-heap of size k** keeps exactly the k most frequent values seen so far: the smallest frequency in the heap sits at the root, so whenever a new candidate beats the root we evict the root. Storing `(frequency, value)` pairs makes the heap order by frequency, so the root is always the *least* frequent of the current top-k — the first to drop.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Count occurrences into a hash map in one `O(n)` pass.\n" +
            "2. Iterate the distinct `(value, freq)` pairs. Push each as a `(freq, value)` pair onto the heap.\n" +
            "3. Whenever the heap exceeds size `k`, pop the root — the smallest-frequency entry — so the heap never holds more than `k` items.\n" +
            "4. After processing everything, the heap holds exactly the k most frequent pairs; extract their values as the answer.\n\n" +
            "**Why it works.** At all times the heap contains the k highest frequencies seen so far, because we only ever discard the current minimum once size exceeds `k`. Anything discarded had a frequency no larger than the `k` surviving entries, so it can never belong in the top-k.\n\n" +
            "**Common Gotchas.**\n" +
            "- Pairs must be keyed with frequency FIRST (`(freq, value)`) so the heap orders by frequency, not by value.\n" +
            "- Pop only when the size strictly exceeds `k`; popping at exactly `k` would discard a valid survivor.\n" +
            "- The final result is the heap's values in arbitrary order — that is acceptable since order does not matter.\n\n" +
            "**Complexity.** Counting is `O(n)`. Each of the `m` distinct values does an `O(log k)` heap operation and the heap never exceeds size `k`, so `O(m log k) <= O(n log k)` overall. Space `O(n)` for the counts.\n\n" +
            "**Interview mindset.** 'Top-k by some score' with small `k` is the cue for a size-`k` heap keyed on the score. Use a min-heap when you want the k LARGEST — the root is the weakest survivor, the one to evict.",
          rcs:
            "import heapq\n" +
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n" +
            "        count = Counter(nums)                 # value -> frequency, O(n).\n" +
            "        heap = []                             # Min-heap of (freq, value), kept at size <= k.\n" +
            "        for value, freq in count.items():     # Consider each distinct value.\n" +
            "            heapq.heappush(heap, (freq, value))  # Add it as a (freq, value) pair.\n" +
            "            if len(heap) > k:                 # Too many? Drop the least frequent.\n" +
            "                heapq.heappop(heap)           # Root is the smallest frequency -> evict it.\n" +
            "        return [value for freq, value in heap]  # Survivors are the k most frequent.",
          plain:
            "import heapq\n" +
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n" +
            "        count = Counter(nums)\n" +
            "        heap = []\n" +
            "        for value, freq in count.items():\n" +
            "            heapq.heappush(heap, (freq, value))\n" +
            "            if len(heap) > k:\n" +
            "                heapq.heappop(heap)\n" +
            "        return [value for freq, value in heap]"
        },
        {
          name: "Optimized — Bucket Sort by frequency",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The linear-time answer: frequencies are bounded by n, so they can index buckets directly instead of being sorted.",
          logic:
            "**What it asks.** Return the `k` most frequent values, this time in guaranteed linear time — better than any comparison-based sort of the frequencies.\n\n" +
            "**Why the naive idea fails.** Even the size-`k` heap costs `O(n log k)` because it compares frequencies. The `log` factor comes from treating frequency as an opaque value to be compared, when in fact it is a small bounded integer we could exploit directly.\n\n" +
            "**Key Idea.** A frequency can be at most `n` — an element cannot appear more times than the array is long. So frequencies live in the small range `1..n` and can be used directly as **array indices**, with no comparisons and no logs. This is exactly the precondition for bucket/counting sort to run in linear time. Create `n + 1` buckets where `buckets[f]` is the list of values that occur exactly `f` times, placing every distinct value into its frequency slot.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Count frequencies with a hash map (`O(n)`).\n" +
            "2. Fill buckets: for each `(value, freq)`, append `value` to `buckets[freq]`. Every distinct value lands in its frequency slot in `O(m)` total.\n" +
            "3. Walk the buckets from the **highest** frequency index downward, collecting values into the result until it holds `k`, then return.\n\n" +
            "**Why it works.** Scanning from the highest index means we always take the most frequent remaining values first, so the first `k` values collected are precisely the top-k by frequency. Because frequency is a bounded integer, indexing replaces comparison entirely and no ordering step is needed.\n\n" +
            "**Common Gotchas.**\n" +
            "- Size the bucket array `n + 1` so index `n` (a value appearing in every position) is valid; an off-by-one here overflows.\n" +
            "- Index 0 stays empty — no value has frequency 0 — so the downward scan can stop at 1.\n" +
            "- A single frequency bucket may hold several values (ties); collect them all but stop the instant the result reaches `k`.\n\n" +
            "**Complexity.** Counting `O(n)`, filling buckets `O(m)`, scanning buckets `O(n)` in the worst case, so `O(n)` overall. Space `O(n)` for the counts and buckets.\n\n" +
            "**Interview mindset.** When the sort key is a bounded integer (here, frequency <= n), reach for bucket/counting sort to break the `O(n log n)` barrier — index by the key instead of comparing it.",
          rcs:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n" +
            "        count = Counter(nums)                     # value -> frequency, O(n).\n" +
            "        n = len(nums)\n" +
            "        buckets = [[] for _ in range(n + 1)]      # buckets[f] = values seen exactly f times.\n" +
            "        for value, freq in count.items():         # Place each value in its frequency slot.\n" +
            "            buckets[freq].append(value)\n" +
            "        result = []\n" +
            "        for freq in range(n, 0, -1):              # Scan from most frequent downward.\n" +
            "            for value in buckets[freq]:\n" +
            "                result.append(value)\n" +
            "                if len(result) == k:             # Collected k values -> done.\n" +
            "                    return result\n" +
            "        return result                             # Fallback (guaranteed reached earlier).",
          plain:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n" +
            "        count = Counter(nums)\n" +
            "        n = len(nums)\n" +
            "        buckets = [[] for _ in range(n + 1)]\n" +
            "        for value, freq in count.items():\n" +
            "            buckets[freq].append(value)\n" +
            "        result = []\n" +
            "        for freq in range(n, 0, -1):\n" +
            "            for value in buckets[freq]:\n" +
            "                result.append(value)\n" +
            "                if len(result) == k:\n" +
            "                    return result\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "'k most frequent / k most common' -> count with a hash map, then select the top-k.",
        "k small vs number of distinct values -> size-k heap (O(n log k)).",
        "The sort key is a bounded integer (frequency <= n) -> bucket sort for O(n)."
      ],
      interviewRecall: [
        "Always start by counting: Counter(nums) gives value -> frequency in O(n).",
        "Heap way: min-heap of (freq, value), pop when size exceeds k; survivors are the answer.",
        "Bucket way: buckets[f] holds values with frequency f, then scan from f=n down to 1 taking k values.",
        "Mention both and note bucket sort is O(n) because frequency is bounded by n."
      ]
    },

    {
      id: "kth-largest-element-in-an-array",
      lc: 215,
      title: "Kth Largest Element in an Array",
      difficulty: "Medium",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/kth-largest-element-in-an-array/",
      meta: { pattern: "Selection (top-k / Quickselect)", dataStructure: "Min-heap / Array partition", technique: "Heap of size k or partition" },
      description:
        "Given an integer array `nums` and an integer `k`, return the `k`-th **largest** element in the array.\n\n" +
        "This is the k-th largest in **sorted order**, not the k-th *distinct* element — duplicates count. (For example, the 2nd largest of `[3, 3, 1]` is `3`, not `1`.)",
      constraints: [
        "`1 <= k <= nums.length <= 10^5`",
        "`-10^4 <= nums[i] <= 10^4`"
      ],
      notes: [
        "Duplicates are counted, so 'k-th largest' means position k when the array is sorted in descending order.",
        "Sorting is O(n log n); the heap solution is O(n log k) and Quickselect is O(n) on average."
      ],
      examples: [
        {
          input: "nums = [3, 2, 1, 5, 6, 4], k = 2",
          output: "5",
          reasoning: "Sorted descending: [6,5,4,3,2,1]. The 2nd largest is 5.",
          visual:
            "```\n" +
            "sorted desc:  6  5  4  3  2  1\n" +
            "              1  2                <- k=2 lands on 5\n" +
            "\n" +
            "min-heap of size k=2 after scanning all:\n" +
            "  heap = [5, 6]   (root 5 = smallest of the top-2 = the k-th largest)\n" +
            "```"
        },
        {
          input: "nums = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4",
          output: "4",
          reasoning: "Sorted descending: [6,5,5,4,3,3,2,2,1]. The 4th value is 4."
        },
        {
          input: "nums = [1], k = 1",
          output: "1",
          reasoning: "Single element; the 1st largest is itself."
        },
        {
          input: "nums = [7, 7, 7], k = 2",
          output: "7",
          reasoning: "Duplicates count, so the 2nd largest is still 7."
        }
      ],
      approaches: [
        {
          name: "Min-heap of size k",
          time: "O(n log k)",
          space: "O(k)",
          whenToUse: "Clean and reliable; ideal when k is small or when elements arrive as a stream and you want bounded memory.",
          logic:
            "**What it asks.** Find the value that would sit at position `k` if the array were sorted from largest to smallest. Duplicates count, so this is rank `k` in sorted order, not the k-th distinct value.\n\n" +
            "**Why the naive idea fails.** Sorting the whole array descending and indexing `k-1` is correct but `O(n log n)`, computing the full order of every element when we only need one of them.\n\n" +
            "**Key Idea.** The k-th largest element is precisely the **smallest** among the k largest elements. If we keep only the `k` biggest values seen so far in a **min-heap**, its root is that smallest-of-the-top-k — which is exactly the answer. The root is the weakest member of the current top-k, so any incoming value larger than the root deserves to replace it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty min-heap.\n" +
            "2. Push array elements onto it one by one.\n" +
            "3. Whenever the heap grows beyond size `k`, pop the root — the current smallest of the top-k — so the heap never exceeds `k` items.\n" +
            "4. After the whole array is processed, the heap holds the k largest values and its root (`heap[0]`) is the k-th largest.\n\n" +
            "**Why it works.** The heap always retains the k largest values seen so far: we only ever evict the minimum once size exceeds `k`, and an evicted value is smaller than `k` other retained values, so it can never be the k-th largest. At the end the root is the minimum of the top-k, i.e. the k-th largest overall.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a MIN-heap for the k-th LARGEST — a common slip is to reach for a max-heap here.\n" +
            "- Pop only when the size strictly exceeds `k`; the answer is the root, not a popped value.\n" +
            "- Duplicates are kept, not deduplicated, so the k-th largest of `[7,7,7]` is still `7`.\n\n" +
            "**Complexity.** Each of the `n` elements does an `O(log k)` heap operation, so `O(n log k)` time, with `O(k)` space for the bounded heap.\n\n" +
            "**Interview mindset.** 'k-th largest / k-th smallest / top-k' calls for a size-`k` heap of the OPPOSITE polarity: for the k-th largest use a MIN-heap (root = the one to evict); for the k-th smallest use a max-heap.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def findKthLargest(self, nums: List[int], k: int) -> int:\n" +
            "        heap = []                         # Min-heap holding the k largest values seen so far.\n" +
            "        for num in nums:                  # Single pass over the array.\n" +
            "            heapq.heappush(heap, num)     # Tentatively keep this value.\n" +
            "            if len(heap) > k:             # More than k? The smallest can't be top-k.\n" +
            "                heapq.heappop(heap)       # Evict the current minimum.\n" +
            "        return heap[0]                    # Root = smallest of the top-k = k-th largest.",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def findKthLargest(self, nums: List[int], k: int) -> int:\n" +
            "        heap = []\n" +
            "        for num in nums:\n" +
            "            heapq.heappush(heap, num)\n" +
            "            if len(heap) > k:\n" +
            "                heapq.heappop(heap)\n" +
            "        return heap[0]"
        },
        {
          name: "Optimized — Quickselect",
          time: "O(n) average, O(n^2) worst",
          space: "O(1)",
          whenToUse: "When you want the best average-case running time and the array is available in full (not a stream); the classic selection algorithm.",
          logic:
            "**What it asks.** Return the k-th largest value, aiming for the best average running time by finding only the ONE element at that rank rather than ordering the whole array.\n\n" +
            "**Why the naive idea fails.** Sorting orders *all* `n` elements, but we need only the single element at a known rank. Even the size-`k` heap pays a `log` factor. Quickselect adapts quicksort's partition step to home in on one position without sorting the rest.\n\n" +
            "**Key Idea.** Pick a `pivot` and partition the current range so every element `< pivot` comes before it and every element `>= pivot` comes after — the pivot then lands at its **final sorted index** `p`, so we learn its true rank for free. First convert the target: the k-th *largest* is the element at 0-based index `target = len(nums) - k` in **ascending** sorted order (the largest sits at index `n-1`). Now compare `p` to `target`: if equal, the pivot IS the answer; if `p < target`, the answer lies to the right; if `p > target`, it lies to the left. Each round we discard one whole side instead of recursing into both.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `target = len(nums) - k`, the ascending-order index of the k-th largest.\n" +
            "2. Maintain a `[left, right]` window over the array, initially the whole array.\n" +
            "3. Partition the window around a randomly chosen pivot: sweep the range moving elements smaller than the pivot to the front, then drop the pivot into the boundary slot; that slot index `p` is its final sorted position.\n" +
            "4. If `p == target`, return `nums[p]`. If `p < target`, move `left` to `p + 1`; if `p > target`, move `right` to `p - 1`.\n" +
            "5. Repeat until a pivot lands exactly on `target`.\n\n" +
            "**Why it works.** After each partition the pivot is at its exact sorted position, so comparing `p` with `target` reliably tells us which side holds the target rank. The window always contains index `target`, and the loop terminates when a pivot lands exactly on it. On average each partition roughly halves the search range, giving `n + n/2 + n/4 + ... = O(n)`.\n\n" +
            "**Common Gotchas.**\n" +
            "- The rank conversion `target = n - k` is the classic trap — ascending index, not `k` or `k-1`.\n" +
            "- A pathological pivot sequence causes the `O(n^2)` worst case; a random pivot makes it astronomically unlikely.\n" +
            "- Partitioning mutates `nums` in place — fine here, but note it if the caller needs the original order.\n" +
            "- Shrink the window to `p + 1` / `p - 1`, excluding the pivot, or the loop can fail to make progress.\n\n" +
            "**Complexity.** Average `O(n)` time, worst `O(n^2)`; `O(1)` extra space with in-place partitioning and an iterative loop.\n\n" +
            "**Interview mindset.** 'Find the element of a given rank (median, k-th largest) without full sorting' points to Quickselect. State the average is `O(n)`, mention random pivots to dodge the `O(n^2)` worst case, and note the size-`k` heap as the simpler `O(n log k)` alternative.",
          rcs:
            "import random\n" +
            "\n" +
            "class Solution:\n" +
            "    def findKthLargest(self, nums: List[int], k: int) -> int:\n" +
            "        target = len(nums) - k              # k-th largest = index target in ASCENDING order.\n" +
            "\n" +
            "        def partition(left: int, right: int) -> int:\n" +
            "            pivot_idx = random.randint(left, right)   # Random pivot avoids worst case.\n" +
            "            pivot = nums[pivot_idx]\n" +
            "            nums[pivot_idx], nums[right] = nums[right], nums[pivot_idx]  # Park pivot at the end.\n" +
            "            store = left                    # Next slot for an element < pivot.\n" +
            "            for i in range(left, right):     # Sweep the window (pivot sits at 'right').\n" +
            "                if nums[i] < pivot:          # Smaller elements go to the left region.\n" +
            "                    nums[store], nums[i] = nums[i], nums[store]\n" +
            "                    store += 1\n" +
            "            nums[store], nums[right] = nums[right], nums[store]  # Drop pivot into its final spot.\n" +
            "            return store                    # Pivot's true sorted index.\n" +
            "\n" +
            "        left, right = 0, len(nums) - 1\n" +
            "        while True:                          # Iterative Quickselect on a shrinking window.\n" +
            "            p = partition(left, right)       # Pivot lands at its final index p.\n" +
            "            if p == target:                  # Found the element at the target rank.\n" +
            "                return nums[p]\n" +
            "            elif p < target:                 # Target is further right.\n" +
            "                left = p + 1\n" +
            "            else:                            # Target is further left.\n" +
            "                right = p - 1",
          plain:
            "import random\n" +
            "\n" +
            "class Solution:\n" +
            "    def findKthLargest(self, nums: List[int], k: int) -> int:\n" +
            "        target = len(nums) - k\n" +
            "\n" +
            "        def partition(left: int, right: int) -> int:\n" +
            "            pivot_idx = random.randint(left, right)\n" +
            "            pivot = nums[pivot_idx]\n" +
            "            nums[pivot_idx], nums[right] = nums[right], nums[pivot_idx]\n" +
            "            store = left\n" +
            "            for i in range(left, right):\n" +
            "                if nums[i] < pivot:\n" +
            "                    nums[store], nums[i] = nums[i], nums[store]\n" +
            "                    store += 1\n" +
            "            nums[store], nums[right] = nums[right], nums[store]\n" +
            "            return store\n" +
            "\n" +
            "        left, right = 0, len(nums) - 1\n" +
            "        while True:\n" +
            "            p = partition(left, right)\n" +
            "            if p == target:\n" +
            "                return nums[p]\n" +
            "            elif p < target:\n" +
            "                left = p + 1\n" +
            "            else:\n" +
            "                right = p - 1"
        }
      ],
      patternRecognition: [
        "'k-th largest / k-th smallest / element of a given rank' without needing full order.",
        "Small k or streaming input -> size-k heap (min-heap for k-th largest).",
        "Best average time on an in-memory array -> Quickselect (partition and discard one side)."
      ],
      interviewRecall: [
        "k-th largest = smallest of the k largest -> min-heap of size k, answer is heap[0].",
        "For k-th largest with a heap use a MIN-heap; for k-th smallest use a max-heap (store negatives).",
        "Quickselect: target index = n - k in ascending order; partition, compare pivot index to target, recurse on one side only.",
        "Use a random pivot to avoid Quickselect's O(n^2) worst case; average is O(n)."
      ]
    }
  ]);
})();
