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
    },

    {
      id: "kth-largest-element-in-a-stream",
      lc: 703,
      title: "Kth Largest Element in a Stream",
      difficulty: "Easy",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/kth-largest-element-in-a-stream/",
      meta: { pattern: "Streaming top-k", dataStructure: "Min-heap of size k", technique: "Bounded heap, peek the root" },
      description:
        "Design a class that tracks the `k`-th **largest** value in a stream of numbers. Note this is the k-th largest in *sorted order*, not the k-th distinct element.\n\n" +
        "Implement:\n\n" +
        "- `KthLargest(k, nums)` — initialize with the integer `k` and an initial array `nums`.\n" +
        "- `add(val)` — append `val` to the stream and return the current `k`-th largest element.\n\n" +
        "Each `add` should be fast because it may be called many times.",
      constraints: [
        "`1 <= k <= 10^4`",
        "`0 <= nums.length <= 10^4`",
        "`-10^4 <= nums[i] <= 10^4`",
        "`-10^4 <= val <= 10^4`",
        "At most `10^4` calls to `add`.",
        "It is guaranteed there are at least `k` elements in the array when `add` is called."
      ],
      notes: [
        "Re-sorting the whole collection on every `add` would be `O(n log n)` per call — far too slow across thousands of calls.",
        "You never need the full ordering, only fast access to the smallest of the k largest values seen so far."
      ],
      examples: [
        {
          input: "KthLargest(3, [4, 5, 8, 2]); add(3); add(5); add(10); add(9); add(4)",
          output: "4, 5, 5, 8, 8",
          reasoning: "k=3 tracks the 3rd largest. After adding 3 the stream is [4,5,8,2,3] whose 3rd largest is 4; after 5 -> 5; after 10 -> 5; after 9 -> 8; after 4 -> 8.",
          visual:
            "```\n" +
            "k = 3  ->  keep a MIN-heap of the 3 largest values; its root is the answer.\n" +
            "\n" +
            "init [4,5,8,2] -> keep top 3 -> heap = [4, 5, 8]   root=4\n" +
            "add 3: push 3 -> [3,5,8,4], size 4 > 3, pop min 3 -> [4,5,8]  root=4\n" +
            "add 5: push 5 -> size 4, pop min 4 -> [5,8,5]                 root=5\n" +
            "add 10: push 10, pop min 5 -> [8,10,5]... root stays 5        root=5\n" +
            "add 9: push 9, pop min 5 -> [8,10,9]                          root=8\n" +
            "add 4: push 4, pop min 4 -> [8,10,9]                          root=8\n" +
            "```"
        },
        {
          input: "KthLargest(1, []); add(-3); add(-2); add(-4); add(0); add(4)",
          output: "-3, -2, -2, 0, 4",
          reasoning: "k=1 tracks the maximum so far. The running max is -3, -2, -2, 0, 4."
        },
        {
          input: "KthLargest(2, [0]); add(-1); add(1); add(-2); add(-4); add(3)",
          output: "-1, 0, 0, 0, 1",
          reasoning: "k=2 tracks the 2nd largest. After each add the 2nd largest is -1, 0, 0, 0, then 1."
        },
        {
          input: "KthLargest(2, [7, 7]); add(7); add(6)",
          output: "7, 7",
          reasoning: "Duplicates count, so with values [7,7,7] the 2nd largest is 7; after adding 6 it is still 7."
        }
      ],
      approaches: [
        {
          name: "Min-heap of size k",
          time: "O((n + m) log k) for n initial elements and m adds",
          space: "O(k)",
          whenToUse: "The natural fit for a streaming k-th largest: values arrive over time and each query must be fast with bounded memory.",
          logic:
            "**What it asks.** Support a stream of integers and, after every insertion, report the k-th largest value seen so far. Duplicates count, so this is rank `k` in sorted order.\n\n" +
            "**Why the naive idea fails.** Storing everything and re-sorting on each `add` is `O(n log n)` per call; with up to 10^4 adds that repeated sorting is wasteful, because each call recomputes the full order when we only need one boundary value.\n\n" +
            "**Key Idea.** The k-th largest element is exactly the **smallest** among the k largest elements. So keep a **min-heap that never holds more than k values**: it retains precisely the k biggest numbers seen so far, and its root — the minimum of those k — is the k-th largest. Python's `heapq` is a MIN-heap, which is exactly the polarity we want here (no negation needed): the root is the weakest survivor, the first to be evicted when a bigger value arrives.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. In `__init__`, store `k`, copy `nums` into a list, and `heapq.heapify` it into a min-heap in `O(n)`. Then pop the smallest until the heap has at most `k` elements, so it holds only the k largest.\n" +
            "2. In `add(val)`, push `val` onto the heap.\n" +
            "3. If the heap now exceeds size `k`, pop the root (the current minimum) so it is back to `k` items.\n" +
            "4. Return `heap[0]`, the root — the smallest of the k largest, i.e. the current k-th largest.\n\n" +
            "**Why it works.** At all times the heap contains the k largest values of the stream: we only ever discard the minimum once size exceeds `k`, and any discarded value is smaller than `k` retained values, so it can never be the k-th largest. The root is therefore always the k-th largest overall.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a MIN-heap for the k-th LARGEST; reaching for a max-heap here is the classic slip.\n" +
            "- The initial array may be longer than `k`, so trim it down to size `k` in the constructor, not just in `add`.\n" +
            "- Pop only when the size strictly exceeds `k`; the answer is the root, never a popped value.\n" +
            "- Duplicates are kept, so `[7,7,7]` has 2nd largest `7`.\n\n" +
            "**Complexity.** Building and trimming the initial heap is `O(n log k)` (heapify `O(n)` plus trimming pops). Each `add` does a push and possibly a pop, `O(log k)`, and returns the root in `O(1)`. Space `O(k)` for the bounded heap.\n\n" +
            "**Interview mindset.** 'k-th largest in a stream' is the textbook cue for a size-`k` min-heap: bounded memory, `O(log k)` updates, and the root is the answer at all times. Note that `heapq` being a min-heap is a convenience here — no negation trick needed, unlike max-heap problems where you push `-x`.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class KthLargest:\n" +
            "    def __init__(self, k: int, nums: List[int]):\n" +
            "        self.k = k\n" +
            "        self.heap = nums[:]               # Copy so we don't mutate the caller's list.\n" +
            "        heapq.heapify(self.heap)          # O(n): turn the list into a min-heap.\n" +
            "        while len(self.heap) > k:         # Trim down to the k largest values.\n" +
            "            heapq.heappop(self.heap)      # Drop the current smallest.\n" +
            "\n" +
            "    def add(self, val: int) -> int:\n" +
            "        heapq.heappush(self.heap, val)    # Tentatively add the new value.\n" +
            "        if len(self.heap) > self.k:       # More than k? The smallest can't be top-k.\n" +
            "            heapq.heappop(self.heap)      # Evict the current minimum.\n" +
            "        return self.heap[0]               # Root = smallest of the k largest = k-th largest.",
          plain:
            "import heapq\n" +
            "\n" +
            "class KthLargest:\n" +
            "    def __init__(self, k: int, nums: List[int]):\n" +
            "        self.k = k\n" +
            "        self.heap = nums[:]\n" +
            "        heapq.heapify(self.heap)\n" +
            "        while len(self.heap) > k:\n" +
            "            heapq.heappop(self.heap)\n" +
            "\n" +
            "    def add(self, val: int) -> int:\n" +
            "        heapq.heappush(self.heap, val)\n" +
            "        if len(self.heap) > self.k:\n" +
            "            heapq.heappop(self.heap)\n" +
            "        return self.heap[0]"
        }
      ],
      patternRecognition: [
        "'k-th largest in a stream' or 'return the k-th largest after each insertion' -> size-k min-heap.",
        "Values arrive over time and each query must be fast with bounded memory -> bounded heap, peek the root.",
        "You need only the boundary of the top-k, never the full order -> keep exactly k elements."
      ],
      interviewRecall: [
        "Keep a MIN-heap of size k; the root is the k-th largest at all times.",
        "Constructor: heapify nums (O(n)), then pop until size <= k.",
        "add: push val, pop if size > k, return heap[0].",
        "heapq is a min-heap, which is exactly what we want for k-th LARGEST — no negation needed here."
      ]
    },

    {
      id: "last-stone-weight",
      lc: 1046,
      title: "Last Stone Weight",
      difficulty: "Easy",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/last-stone-weight/",
      meta: { pattern: "Repeated extract-max", dataStructure: "Max-heap (via negation)", technique: "Pop two heaviest, push difference" },
      description:
        "You are given an array `stones` of positive integer weights. Each turn, pick the two **heaviest** stones and smash them together:\n\n" +
        "- If they weigh the same, both are destroyed.\n" +
        "- Otherwise the lighter is destroyed and the heavier loses the lighter's weight (a new stone of weight `heavier - lighter` remains).\n\n" +
        "Repeat until at most one stone is left. Return the weight of the last remaining stone, or `0` if none remain.",
      constraints: [
        "`1 <= stones.length <= 30`",
        "`1 <= stones[i] <= 1000`"
      ],
      notes: [
        "Each turn removes the two largest weights, so you repeatedly need fast access to the maximum — a heap fits perfectly.",
        "Python's `heapq` is a MIN-heap, so store NEGATED weights to simulate a max-heap: the smallest negative is the largest weight."
      ],
      examples: [
        {
          input: "stones = [2, 7, 4, 1, 8, 1]",
          output: "1",
          reasoning: "Smash 8 and 7 -> 1 remains, giving [2,4,1,1,1]. Smash 4 and 2 -> 2, giving [2,1,1,1]. Smash 2 and 1 -> 1, giving [1,1,1]. Smash 1 and 1 -> 0, giving [1]. Last stone is 1.",
          visual:
            "```\n" +
            "Use a MAX-heap (store negatives). Each turn pop the two largest:\n" +
            "\n" +
            "[2,7,4,1,8,1]  pop 8,7 -> push 8-7=1   -> [2,4,1,1,1]\n" +
            "[2,4,1,1,1]    pop 4,2 -> push 4-2=2   -> [2,1,1,1]\n" +
            "[2,1,1,1]      pop 2,1 -> push 2-1=1   -> [1,1,1]\n" +
            "[1,1,1]        pop 1,1 -> equal, nothing pushed -> [1]\n" +
            "one stone left -> answer 1\n" +
            "```"
        },
        {
          input: "stones = [1]",
          output: "1",
          reasoning: "A single stone never gets smashed; it is the last one."
        },
        {
          input: "stones = [3, 3]",
          output: "0",
          reasoning: "The two equal stones destroy each other, leaving none, so the answer is 0."
        },
        {
          input: "stones = [10, 4, 2, 10]",
          output: "2",
          reasoning: "Smash 10 and 10 -> 0 (both gone), leaving [4,2]. Smash 4 and 2 -> 2. Last stone is 2."
        }
      ],
      approaches: [
        {
          name: "Max-heap (via negation)",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "Whenever a process repeatedly consumes the largest one or two elements and feeds a new element back in.",
          logic:
            "**What it asks.** Simulate smashing the two heaviest stones each turn — the heavier keeps the difference, equal stones vanish — until one or zero stones remain, then report the survivor's weight.\n\n" +
            "**Why the naive idea fails.** You could re-sort the array every turn to find the two largest, but that is `O(n log n)` *per turn* and up to `n` turns, `O(n^2 log n)`. Each turn only needs the top two elements and one insertion, so a full re-sort is overkill.\n\n" +
            "**Key Idea.** The operation is 'repeatedly take the maximum, then the next maximum, then put one value back'. That is precisely what a **max-heap** delivers: `O(1)` peek and `O(log n)` pop/push. Python's `heapq` is a MIN-heap only, so we **negate** every weight going in — the most negative stored value is the heaviest real stone — and negate again when reading a value out.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build a max-heap by pushing every `-weight` (or negate the list and `heapq.heapify` it in `O(n)`).\n" +
            "2. While more than one stone remains, pop the two heaviest: `first = -heappop` and `second = -heappop` (un-negated, so `first >= second`).\n" +
            "3. If `first != second`, push the difference back as a negative: `heappush(-(first - second))`. If they are equal, push nothing — both are destroyed.\n" +
            "4. When at most one stone remains, return `-heap[0]` if the heap is non-empty, otherwise `0`.\n\n" +
            "**Why it works.** The heap invariant guarantees the two pops always yield the current two heaviest stones, exactly the pair the rules smash. Pushing back only a positive difference faithfully models 'the heavier loses the lighter's weight', and pushing nothing on a tie models mutual destruction. The loop shrinks the multiset by at least one each turn, so it terminates with zero or one stone.\n\n" +
            "**Common Gotchas.**\n" +
            "- Forgetting to negate: `heapq` is a min-heap, so store `-weight` and read back `-value` to get max-heap behaviour.\n" +
            "- Only push the difference when it is non-zero; pushing a `0` stone would corrupt the count of remaining stones.\n" +
            "- Handle the empty-heap case at the end (all stones destroyed) by returning `0`.\n" +
            "- After popping two you must re-check the loop condition; don't assume two are always available.\n\n" +
            "**Complexity.** Building the heap is `O(n)`; each turn does a constant number of `O(log n)` heap operations over up to `n` turns, so `O(n log n)` overall. Space `O(n)` for the heap.\n\n" +
            "**Interview mindset.** 'Repeatedly take the largest (or two largest) and feed something back' is the signature of a max-heap simulation. In Python, say out loud that `heapq` is a min-heap and you negate to simulate a max-heap — interviewers look for that detail.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def lastStoneWeight(self, stones: List[int]) -> int:\n" +
            "        heap = [-w for w in stones]         # Negate: min-heap of negatives == max-heap of weights.\n" +
            "        heapq.heapify(heap)                 # O(n) build.\n" +
            "        while len(heap) > 1:                # Need two stones to smash.\n" +
            "            first = -heapq.heappop(heap)    # Heaviest stone (un-negate).\n" +
            "            second = -heapq.heappop(heap)   # Second heaviest.\n" +
            "            if first != second:             # Unequal -> a stone of the difference survives.\n" +
            "                heapq.heappush(heap, -(first - second))  # Push it back (negated).\n" +
            "            # Equal -> both destroyed, push nothing.\n" +
            "        return -heap[0] if heap else 0      # Survivor's weight, or 0 if none left.",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def lastStoneWeight(self, stones: List[int]) -> int:\n" +
            "        heap = [-w for w in stones]\n" +
            "        heapq.heapify(heap)\n" +
            "        while len(heap) > 1:\n" +
            "            first = -heapq.heappop(heap)\n" +
            "            second = -heapq.heappop(heap)\n" +
            "            if first != second:\n" +
            "                heapq.heappush(heap, -(first - second))\n" +
            "        return -heap[0] if heap else 0"
        }
      ],
      patternRecognition: [
        "'Repeatedly take the largest / two largest and feed a value back' -> max-heap simulation.",
        "You need the maximum many times, interleaved with insertions -> heap, not repeated sorting.",
        "In Python, max-heap behaviour is achieved by negating values into heapq (a min-heap)."
      ],
      interviewRecall: [
        "Max-heap via negation: push -weight, the smallest negative is the heaviest stone.",
        "Each turn pop two, and if they differ push back -(first - second); if equal push nothing.",
        "Loop while len(heap) > 1; answer is -heap[0] or 0 if empty.",
        "State that heapq is a MIN-heap, hence the negation to simulate a max-heap."
      ]
    },

    {
      id: "k-closest-points-to-origin",
      lc: 973,
      title: "K Closest Points to Origin",
      difficulty: "Medium",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/k-closest-points-to-origin/",
      meta: { pattern: "Top-k by distance", dataStructure: "Max-heap of size k / heapify", technique: "Squared distance, bounded heap or nsmallest" },
      description:
        "Given an array `points` where `points[i] = [xi, yi]` on the 2-D plane and an integer `k`, return the `k` points **closest** to the origin `(0, 0)`.\n\n" +
        "Distance is the usual Euclidean distance `sqrt(x^2 + y^2)`, but since we only compare distances you can compare the **squared** distance `x^2 + y^2` and skip the square root entirely. The answer may be returned in any order and is guaranteed to be unique.",
      constraints: [
        "`1 <= k <= points.length <= 10^4`",
        "`-10^4 <= xi, yi <= 10^4`"
      ],
      notes: [
        "`sqrt` is monotonic, so ordering by `x^2 + y^2` is identical to ordering by true distance — never compute the square root.",
        "Only the SET of k closest points matters, not their order."
      ],
      examples: [
        {
          input: "points = [[1, 3], [-2, 2]], k = 1",
          output: "[[-2, 2]]",
          reasoning: "Squared distances: [1,3] -> 1+9=10, [-2,2] -> 4+4=8. The closer point is [-2,2].",
          visual:
            "```\n" +
            "squared dist = x^2 + y^2  (no sqrt needed, ordering is identical)\n" +
            "\n" +
            "[1,3]   -> 1 + 9 = 10\n" +
            "[-2,2]  -> 4 + 4 = 8   <- smaller -> closer -> the k=1 answer\n" +
            "```"
        },
        {
          input: "points = [[3, 3], [5, -1], [-2, 4]], k = 2",
          output: "[[3, 3], [-2, 4]]",
          reasoning: "Squared distances: [3,3]->18, [5,-1]->26, [-2,4]->20. The two smallest are 18 and 20."
        },
        {
          input: "points = [[1, 1], [2, 2], [3, 3]], k = 3",
          output: "[[1, 1], [2, 2], [3, 3]]",
          reasoning: "k equals the number of points, so all of them are returned."
        },
        {
          input: "points = [[0, 1], [1, 0]], k = 1",
          output: "[[0, 1]]",
          reasoning: "Both have squared distance 1 — a tie — and any one is acceptable; the answer is guaranteed unique for the judge's inputs."
        }
      ],
      approaches: [
        {
          name: "Max-heap of size k",
          time: "O(n log k)",
          space: "O(k)",
          whenToUse: "When k is much smaller than n, or points stream in and you want bounded memory holding just the current k closest.",
          logic:
            "**What it asks.** Return the `k` points with the smallest distance to the origin. Only the set matters, and squared distance suffices for comparison.\n\n" +
            "**Why the naive idea fails.** Sorting all points by distance and taking the first `k` is correct but `O(n log n)`, fully ordering every point when we only need the closest `k`. When `k` is small that is wasted work.\n\n" +
            "**Key Idea.** To keep the k *smallest* distances, use a **max-heap of size k**: its root is the *largest* distance among the current k candidates — the weakest, the first to be evicted. Whenever a new point is closer than the root, it belongs in the top-k, so we drop the root and add it. Python's `heapq` is a MIN-heap, so we simulate the max-heap by **negating** the distance in each heap entry (`(-dist, point)`); the most-negative distance (largest real distance) sits at the root.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each point compute `dist = x*x + y*y` (no square root).\n" +
            "2. Push `(-dist, x, y)` onto the heap.\n" +
            "3. Whenever the heap exceeds size `k`, pop the root — the entry with the largest real distance — so the heap keeps only the k closest so far.\n" +
            "4. After all points, the heap holds the k closest; extract their coordinates as the answer.\n\n" +
            "**Why it works.** The heap always retains the k smallest distances seen so far: the only entry ever discarded is the current maximum once size exceeds `k`, and that discarded point is farther than `k` retained points, so it cannot be among the k closest. Negating turns 'evict the largest' into a min-heap pop.\n\n" +
            "**Common Gotchas.**\n" +
            "- For the k CLOSEST (smallest) use a MAX-heap (store negated distances); mixing up the polarity is the classic error.\n" +
            "- Compare squared distance, never `sqrt` — it is slower and can introduce floating-point noise.\n" +
            "- Pop only when size strictly exceeds `k`.\n\n" +
            "**Complexity.** Each of the `n` points does an `O(log k)` heap operation, so `O(n log k)` time with `O(k)` space for the bounded heap.\n\n" +
            "**Interview mindset.** 'k closest / k smallest by a score, k small' -> a size-`k` heap of the OPPOSITE polarity: max-heap for the k smallest, min-heap for the k largest.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:\n" +
            "        heap = []                              # Max-heap of size k via negated distances.\n" +
            "        for x, y in points:\n" +
            "            dist = x * x + y * y               # Squared distance — no sqrt needed.\n" +
            "            heapq.heappush(heap, (-dist, x, y)) # Negate so the farthest sits at the root.\n" +
            "            if len(heap) > k:                  # Too many? Drop the farthest of the k+1.\n" +
            "                heapq.heappop(heap)            # Root = largest real distance -> evict.\n" +
            "        return [[x, y] for _, x, y in heap]    # The k closest points.",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:\n" +
            "        heap = []\n" +
            "        for x, y in points:\n" +
            "            dist = x * x + y * y\n" +
            "            heapq.heappush(heap, (-dist, x, y))\n" +
            "            if len(heap) > k:\n" +
            "                heapq.heappop(heap)\n" +
            "        return [[x, y] for _, x, y in heap]"
        },
        {
          name: "Optimized — heapify + nsmallest",
          time: "O(n) to build + O(k log n) to extract",
          space: "O(n)",
          whenToUse: "When all points are available at once and k is not tiny relative to n; the shortest, most idiomatic Python solution.",
          logic:
            "**What it asks.** Return the `k` closest points, this time leaning on `heapq`'s bulk helpers for a concise solution when the whole input is in hand.\n\n" +
            "**Why the naive idea fails.** Sorting is `O(n log n)`. If we build a min-heap of *all* points keyed by distance, we can then pop just the `k` smallest, paying the log factor only `k` times instead of for the full sort.\n\n" +
            "**Key Idea.** Build one min-heap over *all* points keyed by squared distance in `O(n)` via `heapq.heapify`, then pull the `k` smallest. `heapq.nsmallest(k, iterable, key=...)` does exactly this: it returns the k items with the smallest key. Because we want the k *closest*, we use a plain min-heap here — no negation — and let distance be the key.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Compute `(dist, point)` for every point, where `dist = x^2 + y^2`.\n" +
            "2. Either `heapq.heapify` the list of `(dist, x, y)` in `O(n)` and `heappop` `k` times, or call `heapq.nsmallest(k, points, key=lambda p: p[0]**2 + p[1]**2)` directly.\n" +
            "3. Return the coordinates of the k extracted entries.\n\n" +
            "**Why it works.** A min-heap over all distances has the globally closest point at its root, so the first `k` pops are the k closest in order. `nsmallest` performs the same selection internally (it maintains a bounded max-heap of size k under the hood), returning exactly the k smallest-key items.\n\n" +
            "**Common Gotchas.**\n" +
            "- Building a heap of all `n` points costs `O(n)` space; the size-`k` max-heap approach uses only `O(k)`, which matters for very large `n`.\n" +
            "- Still compare squared distance, not `sqrt`.\n" +
            "- With `nsmallest`, pass a `key` so it compares distances, not raw coordinate tuples.\n\n" +
            "**Complexity.** `heapify` is `O(n)`; popping `k` times (or `nsmallest`) is `O(k log n)`, so `O(n + k log n)` overall — better than `O(n log n)` sorting when `k << n`. Space `O(n)` for the heap. For an even faster average `O(n)` selection, mention **Quickselect** partitioning around the k-th distance.\n\n" +
            "**Interview mindset.** Know your language's bulk heap helpers: `heapq.nsmallest`/`nlargest` express 'k smallest/largest' in one line. If asked for the theoretical best, cite Quickselect at average `O(n)`; the size-`k` heap wins on memory for streams.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:\n" +
            "        # nsmallest keeps the k smallest by key; squared distance is the key (no sqrt).\n" +
            "        return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:\n" +
            "        return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])"
        }
      ],
      patternRecognition: [
        "'k closest / k nearest / k smallest by a computed score' -> top-k selection.",
        "k small vs n -> size-k MAX-heap (store negated distances) for O(n log k) and O(k) space.",
        "All data in hand -> heapify + nsmallest for O(n + k log n); mention Quickselect for average O(n)."
      ],
      interviewRecall: [
        "Compare squared distance x^2 + y^2 — never take sqrt (monotonic, same ordering).",
        "k closest -> MAX-heap of size k via negated distance; root is the farthest, evict it.",
        "One-liner: heapq.nsmallest(k, points, key=squared distance).",
        "heapq is a MIN-heap, so simulate the max-heap by negating; Quickselect gives average O(n)."
      ]
    },

    {
      id: "task-scheduler",
      lc: 621,
      title: "Task Scheduler",
      difficulty: "Medium",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/task-scheduler/",
      meta: { pattern: "Greedy scheduling with cooldown", dataStructure: "Frequency count / Max-heap + queue", technique: "Idle-slot formula or heap simulation" },
      description:
        "You are given an array `tasks` of CPU tasks, each labeled by an uppercase letter, and an integer `n` — the **cooldown**: identical tasks must be separated by at least `n` intervals. Each task takes one interval; the CPU may also sit **idle** in an interval.\n\n" +
        "Return the **minimum number of intervals** needed to finish all tasks.",
      constraints: [
        "`1 <= tasks.length <= 10^4`",
        "`tasks[i]` is an uppercase English letter.",
        "`0 <= n <= 100`"
      ],
      notes: [
        "The bottleneck is the MOST frequent task: it forces a fixed skeleton of slots, and other tasks fill the gaps.",
        "If there are enough distinct tasks to fill every cooldown gap, no idling is needed and the answer is just `len(tasks)`."
      ],
      examples: [
        {
          input: "tasks = ['A','A','A','B','B','B'], n = 2",
          output: "8",
          reasoning: "One optimal order is A B idle A B idle A B — 8 intervals. A appears 3 times and needs 2 gaps between copies, so those gaps must be filled by B or idle.",
          visual:
            "```\n" +
            "max_count = 3 (A appears 3x), n = 2\n" +
            "\n" +
            "skeleton built around A with gaps of size n:\n" +
            "  A _ _ | A _ _ | A\n" +
            "(max_count-1) full frames of size (n+1), then the last A:\n" +
            "  (3-1) * (2+1) + 1 = 2*3 + 1 = 7\n" +
            "\n" +
            "fill gaps with B (also 3x, ties A -> num_max = 2):\n" +
            "  A B _ | A B _ | A B  -> the last frame carries both A and B\n" +
            "  (3-1) * (2+1) + 2 = 8\n" +
            "answer = max(8, len(tasks)=6) = 8\n" +
            "```"
        },
        {
          input: "tasks = ['A','A','A','B','B','B'], n = 0",
          output: "6",
          reasoning: "With no cooldown there is never any idling, so the answer is simply the number of tasks, 6."
        },
        {
          input: "tasks = ['A','A','A','A','A','A','B','C','D','E','F','G'], n = 2",
          output: "16",
          reasoning: "A appears 6 times (max_count=6, num_max=1): (6-1)*(2+1)+1 = 16. The other tasks are too few to fill all gaps, so idles are needed and the formula dominates len(tasks)=12."
        },
        {
          input: "tasks = ['A','A','A','B','B','B','C','C','C','D','D','E'], n = 2",
          output: "12",
          reasoning: "There are enough distinct tasks to fill every gap, so no idling is needed and the answer equals len(tasks)=12."
        }
      ],
      approaches: [
        {
          name: "Max-heap + queue simulation",
          time: "O(N) where N = len(tasks) (heap over <= 26 letters)",
          space: "O(1) (at most 26 distinct tasks)",
          whenToUse: "When you want to actually simulate the timeline, or the interviewer wants a solution that generalizes (e.g. also outputs a valid schedule).",
          logic:
            "**What it asks.** Compute the fewest intervals to run all tasks so that identical tasks are always at least `n` intervals apart, inserting idles only when forced.\n\n" +
            "**Why the naive idea fails.** Greedily running whatever task is available can strand a very frequent task at the end with mandatory idles between its remaining copies, inflating the total. We must always prefer the task with the most remaining copies so its copies get spread out as early as possible.\n\n" +
            "**Key Idea.** At each interval, run the **available task with the highest remaining count** — a **max-heap** on counts gives that in `O(log 26)`. After running a task, it enters cooldown and cannot run again until `n` intervals later, so we park it in a **queue** together with the time it becomes available; when that time arrives we push it back onto the heap. Python's `heapq` is a MIN-heap, so store **negated** counts to pull the largest count first.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Count each task's frequency and push all counts (negated) onto the max-heap.\n" +
            "2. Keep a `time` counter and a FIFO queue of `(remaining_count, ready_time)` for cooling tasks.\n" +
            "3. Each loop iteration is one interval: increment `time`. If the heap is non-empty, pop the largest count, decrement it (one copy done); if copies remain, enqueue `(count_left, time + n)`.\n" +
            "4. If the heap is empty but the queue is not, the CPU idles this interval (still increment `time`).\n" +
            "5. Whenever the front of the queue has `ready_time == time`, move it back to the heap.\n" +
            "6. Stop when both heap and queue are empty; `time` is the answer.\n\n" +
            "**Why it works.** Always scheduling the highest-count available task keeps the most-constrained task flowing as fast as its cooldown allows, which is optimal — delaying it could only add idles later. The queue enforces the exact cooldown by withholding a task until `time + n`. Counting intervals directly (including idles) yields the true minimum length.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use a max-heap (negated counts) — always run the MOST frequent available task, not any task.\n" +
            "- The cooldown target is `time + n` (the task is available again `n` intervals after it runs).\n" +
            "- Remember to advance `time` on idle intervals too, and to return items from the queue to the heap when they cool down.\n\n" +
            "**Complexity.** The heap holds at most 26 entries, so each operation is `O(1)` effectively; total work is `O(N)` over the schedule length (bounded by output size). Space `O(1)` (at most 26 tasks in heap + queue).\n\n" +
            "**Interview mindset.** 'Schedule with a cooldown / rate limit, minimize time' -> greedily run the highest-remaining task via a max-heap, parking cooling tasks in a timed queue. The simulation also lets you emit an actual valid schedule if asked.",
          rcs:
            "import heapq\n" +
            "from collections import Counter, deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def leastInterval(self, tasks: List[str], n: int) -> int:\n" +
            "        counts = Counter(tasks)\n" +
            "        heap = [-c for c in counts.values()]   # Max-heap of remaining counts (negated).\n" +
            "        heapq.heapify(heap)\n" +
            "        queue = deque()                        # (remaining_count_negated, ready_time) while cooling.\n" +
            "        time = 0\n" +
            "        while heap or queue:\n" +
            "            time += 1                          # This interval is consumed (task or idle).\n" +
            "            if heap:\n" +
            "                count = heapq.heappop(heap) + 1  # Run one copy: -count moves toward 0.\n" +
            "                if count != 0:                 # Copies remain -> it must cool down.\n" +
            "                    queue.append((count, time + n))\n" +
            "            # else: nothing available -> CPU idles this interval.\n" +
            "            if queue and queue[0][1] == time:  # A cooled task is ready again.\n" +
            "                heapq.heappush(heap, queue.popleft()[0])\n" +
            "        return time",
          plain:
            "import heapq\n" +
            "from collections import Counter, deque\n" +
            "\n" +
            "class Solution:\n" +
            "    def leastInterval(self, tasks: List[str], n: int) -> int:\n" +
            "        counts = Counter(tasks)\n" +
            "        heap = [-c for c in counts.values()]\n" +
            "        heapq.heapify(heap)\n" +
            "        queue = deque()\n" +
            "        time = 0\n" +
            "        while heap or queue:\n" +
            "            time += 1\n" +
            "            if heap:\n" +
            "                count = heapq.heappop(heap) + 1\n" +
            "                if count != 0:\n" +
            "                    queue.append((count, time + n))\n" +
            "            if queue and queue[0][1] == time:\n" +
            "                heapq.heappush(heap, queue.popleft()[0])\n" +
            "        return time"
        },
        {
          name: "Optimized — Greedy math formula",
          time: "O(N)",
          space: "O(1)",
          whenToUse: "When you only need the minimum count (not an actual schedule); the fastest and simplest solution.",
          logic:
            "**What it asks.** Return just the minimum number of intervals, without necessarily producing a schedule.\n\n" +
            "**Why the naive idea fails.** Simulating interval by interval works but is more code than needed when only the count is required. The structure of an optimal schedule can be computed directly from a single statistic: the maximum task frequency.\n\n" +
            "**Key Idea.** The most frequent task dictates a rigid skeleton. Let `max_count` be the highest frequency and `num_max` how many tasks share it. Place the `max_count` copies of the busiest task as anchors separated by gaps of size `n`. That forms `(max_count - 1)` **frames** of length `(n + 1)` — each frame is 'the anchor plus `n` following slots' — followed by a final partial frame holding the last anchors. Every gap slot can be filled by another task or, if none is available, left idle. So the skeleton length is `(max_count - 1) * (n + 1) + num_max`, where `num_max` accounts for the several equally-frequent tasks that all appear in the last frame.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Count frequencies; find `max_count` (the largest) and `num_max` (how many tasks equal it).\n" +
            "2. Compute the skeleton length `slots = (max_count - 1) * (n + 1) + num_max`.\n" +
            "3. The answer is `max(slots, len(tasks))`.\n\n" +
            "**Why it works.** The formula counts the anchor frames plus the tail. But if there are *many distinct tasks*, the gaps overflow — there are more tasks than idle slots — and no idling is ever needed; in that case the schedule is simply packed and its length is `len(tasks)`. The formula can *undercount* in that regime (idles it assumed don't exist), so taking `max(slots, len(tasks))` picks the binding constraint. When idles ARE forced, `slots >= len(tasks)` and the formula wins.\n\n" +
            "**Common Gotchas.**\n" +
            "- Don't forget the `max(..., len(tasks))` guard — with many distinct tasks the packed length dominates and the formula alone is too small.\n" +
            "- `num_max` (not 1) is added, to seat every maximally-frequent task in the last frame.\n" +
            "- A frame has length `n + 1` (the anchor plus `n` cooldown slots), and there are `max_count - 1` full frames, not `max_count`.\n\n" +
            "**Complexity.** Counting is `O(N)`; the rest is `O(1)` arithmetic over at most 26 counts. Space `O(1)`.\n\n" +
            "**Interview mindset.** When a greedy schedule's length is governed by one dominant frequency, look for a closed-form: `(max_count - 1) * (n + 1) + num_max`, clamped up to `len(tasks)`. State the idle-slot intuition (frames around the busiest task) so the formula isn't a magic incantation.",
          rcs:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def leastInterval(self, tasks: List[str], n: int) -> int:\n" +
            "        counts = Counter(tasks)\n" +
            "        max_count = max(counts.values())            # Frequency of the busiest task.\n" +
            "        num_max = sum(1 for c in counts.values() if c == max_count)  # How many tie for it.\n" +
            "        # (max_count-1) frames of size (n+1), plus the last frame's num_max anchors.\n" +
            "        slots = (max_count - 1) * (n + 1) + num_max\n" +
            "        return max(slots, len(tasks))               # Packed length wins when no idles are forced.",
          plain:
            "from collections import Counter\n" +
            "\n" +
            "class Solution:\n" +
            "    def leastInterval(self, tasks: List[str], n: int) -> int:\n" +
            "        counts = Counter(tasks)\n" +
            "        max_count = max(counts.values())\n" +
            "        num_max = sum(1 for c in counts.values() if c == max_count)\n" +
            "        slots = (max_count - 1) * (n + 1) + num_max\n" +
            "        return max(slots, len(tasks))"
        }
      ],
      patternRecognition: [
        "'Schedule tasks with a cooldown / rate limit, minimize total time' -> greedy around the most frequent task.",
        "Need only the count -> closed-form (max_count-1)*(n+1)+num_max clamped to len(tasks).",
        "Need an actual schedule or a generalization -> max-heap + timed queue simulation."
      ],
      interviewRecall: [
        "Bottleneck is the busiest task: build frames of size (n+1) around its copies.",
        "Formula: (max_count-1)*(n+1) + num_max, then max with len(tasks).",
        "Simulation: max-heap of counts (negated) + queue of (count, ready_time = time+n); idle when heap empty.",
        "heapq is a MIN-heap, so negate counts to always run the MOST frequent available task."
      ]
    },

    {
      id: "design-twitter",
      lc: 355,
      title: "Design Twitter",
      difficulty: "Medium",
      category: "Heap / Priority Queue",
      link: "https://leetcode.com/problems/design-twitter/",
      meta: { pattern: "Merge k recent lists", dataStructure: "Hash maps + Max-heap", technique: "Global timestamp, heap-merge newest" },
      description:
        "Design a simplified Twitter where users post tweets, follow/unfollow others, and read a news feed. Implement:\n\n" +
        "- `Twitter()` — initialize.\n" +
        "- `postTweet(userId, tweetId)` — user `userId` posts a tweet with id `tweetId`.\n" +
        "- `getNewsFeed(userId)` — return the ids of the **10 most recent** tweets in the user's feed, newest first, drawn from the user's own tweets and the tweets of everyone they follow.\n" +
        "- `follow(followerId, followeeId)` — `followerId` starts following `followeeId`.\n" +
        "- `unfollow(followerId, followeeId)` — `followerId` stops following `followeeId`.",
      constraints: [
        "`1 <= userId, followeeId, followerId <= 500`",
        "`0 <= tweetId <= 10^4`",
        "All tweetIds are unique.",
        "At most `3 * 10^4` calls total across all methods."
      ],
      notes: [
        "Recency is the ordering key, so stamp each tweet with a global counter that only increases (or decreases) — no wall-clock time needed.",
        "The feed is a merge of several time-ordered tweet lists, taking only the 10 newest — a classic 'merge k sorted lists, keep the top' via a heap."
      ],
      examples: [
        {
          input: "postTweet(1,5); getNewsFeed(1); follow(1,2); postTweet(2,6); getNewsFeed(1); unfollow(1,2); getNewsFeed(1)",
          output: "[5], then [6,5], then [5]",
          reasoning: "User 1's feed starts with their own tweet 5. After following 2 and 2 posting 6, the feed merges to [6,5] (6 is newer). After unfollowing 2, tweet 6 drops out, leaving [5].",
          visual:
            "```\n" +
            "global timestamp ticks down each post so 'smaller' = newer in a min-heap,\n" +
            "or ticks and we use a MAX-heap on the timestamp. Either way newest first.\n" +
            "\n" +
            "postTweet(1,5): tweets[1] = [(t0, 5)]\n" +
            "follow(1,2); postTweet(2,6): tweets[2] = [(t1, 6)]   (t1 newer than t0)\n" +
            "\n" +
            "getNewsFeed(1): merge user 1's + followees' tweet lists by timestamp,\n" +
            "  push each list's newest into a max-heap, pop 10 times newest-first:\n" +
            "  -> [6, 5]\n" +
            "```"
        },
        {
          input: "postTweet(1,1); postTweet(1,2); ... postTweet(1,11); getNewsFeed(1)",
          output: "[11,10,9,8,7,6,5,4,3,2]",
          reasoning: "A single user with 11 tweets: the feed returns only the 10 most recent, newest first, so tweet 1 is excluded."
        },
        {
          input: "follow(1,1); getNewsFeed(1)",
          output: "[]",
          reasoning: "Following yourself is a no-op / harmless; with no tweets posted the feed is empty."
        },
        {
          input: "postTweet(2,7); follow(1,2); getNewsFeed(1); unfollow(1,2); getNewsFeed(1)",
          output: "[7], then []",
          reasoning: "After following 2 the feed shows 2's tweet 7; after unfollowing, user 1 has no tweets of their own so the feed is empty."
        }
      ],
      approaches: [
        {
          name: "Hash maps + max-heap merge",
          time: "postTweet/follow/unfollow O(1); getNewsFeed O(F + 10 log F) where F = number of followees",
          space: "O(U + T) for users, follows, and tweets",
          whenToUse: "The standard design: recency-ordered feeds assembled from a user's own tweets plus their followees', taking only the newest few.",
          logic:
            "**What it asks.** Support posting, following/unfollowing, and reading a feed of the 10 most recent tweets from a user and everyone they follow, newest first.\n\n" +
            "**Why the naive idea fails.** Collecting *all* tweets from the user and every followee and fully sorting them by time is `O(M log M)` in the total tweet count `M` per feed request — wasteful when we only want the newest 10. We should merge just enough to surface the top 10.\n\n" +
            "**Key Idea.** Give every tweet a monotonic **global timestamp** so recency is a simple integer comparison — no clocks. Store each user's tweets as a time-ordered list (append-only, so it is already sorted by time). A feed is then a **merge of several already-sorted lists**, and we want only the 10 newest — exactly the 'merge k sorted lists, take the top-k' pattern solved with a **heap**. Seed the heap with each relevant list's newest tweet; repeatedly pop the newest and push that list's previous tweet, ten times. Using a **decreasing** global counter makes 'most recent' the smallest number, so a plain `heapq` MIN-heap pops newest-first; equivalently, keep an increasing counter and negate it to make a max-heap.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Data: `tweets` maps `userId -> list of (timestamp, tweetId)` in post order; `following` maps `userId -> set of followees`; a global `time` counter.\n" +
            "2. `postTweet`: append `(time, tweetId)` to the user's list and decrement `time` (so later tweets have smaller = 'more recent' keys). `O(1)`.\n" +
            "3. `follow` / `unfollow`: add/discard the followee in the user's set. `O(1)`.\n" +
            "4. `getNewsFeed`: consider the user plus their followees (a user always sees their own tweets). For each whose tweet list is non-empty, push its *newest* tweet into the heap as `(timestamp, tweetId, ownerId, index_of_that_tweet)`.\n" +
            "5. Pop up to 10 times: each pop yields the current newest tweet across all lists; append its `tweetId` to the result, and if that owner has an older tweet, push it next. This heap-merge surfaces the 10 newest without sorting everything.\n\n" +
            "**Why it works.** Each user's list is already sorted by time, so the newest unseen tweet of every list is always one of the heap entries; popping the heap's extreme repeatedly yields a globally time-ordered stream, and stopping after 10 gives exactly the 10 most recent. The monotonic counter guarantees a total order over tweets even within the same call.\n\n" +
            "**Common Gotchas.**\n" +
            "- A user must see their OWN tweets even if they don't follow themselves — include `userId` in the merge set.\n" +
            "- Ordering must be by the global timestamp, not by `tweetId` (ids are unique but not time-ordered).\n" +
            "- With a decreasing counter, newest = smallest, so a min-heap works directly; if you use an increasing counter, negate it for a max-heap.\n" +
            "- `unfollow` should not error if the pair isn't followed — use `set.discard`, and don't let a user unfollow into an inconsistent state.\n\n" +
            "**Complexity.** `postTweet`, `follow`, `unfollow` are `O(1)`. `getNewsFeed` seeds the heap with one entry per followee (`O(F)`) then does at most 10 pop/push pairs, each `O(log F)`, so `O(F + 10 log F)`. Space `O(U + T)` across users, follow sets, and stored tweets.\n\n" +
            "**Interview mindset.** 'Merge several time-ordered streams and take the newest few' is a heap-merge (LC 23, Merge k Sorted Lists, in disguise). The reusable trick: a monotonic global counter turns recency into an integer key, and a size-bounded heap-merge extracts the top-k without a full sort.",
          rcs:
            "import heapq\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class Twitter:\n" +
            "    def __init__(self):\n" +
            "        self.time = 0                              # Decreasing counter: newer tweets get smaller keys.\n" +
            "        self.tweets = defaultdict(list)            # userId -> list of (timestamp, tweetId).\n" +
            "        self.following = defaultdict(set)          # userId -> set of followee ids.\n" +
            "\n" +
            "    def postTweet(self, userId: int, tweetId: int) -> None:\n" +
            "        self.tweets[userId].append((self.time, tweetId))  # Append in post order.\n" +
            "        self.time -= 1                             # Next tweet is 'more recent' (smaller key).\n" +
            "\n" +
            "    def getNewsFeed(self, userId: int) -> List[int]:\n" +
            "        heap = []                                  # Min-heap on timestamp; smallest = newest.\n" +
            "        people = self.following[userId] | {userId} # Own tweets + followees'.\n" +
            "        for uid in people:\n" +
            "            if self.tweets[uid]:                   # Seed with each person's newest tweet.\n" +
            "                idx = len(self.tweets[uid]) - 1\n" +
            "                t, tid = self.tweets[uid][idx]\n" +
            "                heapq.heappush(heap, (t, tid, uid, idx))\n" +
            "        feed = []\n" +
            "        while heap and len(feed) < 10:             # Pop the 10 newest across all lists.\n" +
            "            t, tid, uid, idx = heapq.heappop(heap)\n" +
            "            feed.append(tid)\n" +
            "            if idx > 0:                            # Push this owner's next-newest tweet.\n" +
            "                nidx = idx - 1\n" +
            "                nt, ntid = self.tweets[uid][nidx]\n" +
            "                heapq.heappush(heap, (nt, ntid, uid, nidx))\n" +
            "        return feed\n" +
            "\n" +
            "    def follow(self, followerId: int, followeeId: int) -> None:\n" +
            "        self.following[followerId].add(followeeId)\n" +
            "\n" +
            "    def unfollow(self, followerId: int, followeeId: int) -> None:\n" +
            "        self.following[followerId].discard(followeeId)  # discard: no error if absent.",
          plain:
            "import heapq\n" +
            "from collections import defaultdict\n" +
            "\n" +
            "class Twitter:\n" +
            "    def __init__(self):\n" +
            "        self.time = 0\n" +
            "        self.tweets = defaultdict(list)\n" +
            "        self.following = defaultdict(set)\n" +
            "\n" +
            "    def postTweet(self, userId: int, tweetId: int) -> None:\n" +
            "        self.tweets[userId].append((self.time, tweetId))\n" +
            "        self.time -= 1\n" +
            "\n" +
            "    def getNewsFeed(self, userId: int) -> List[int]:\n" +
            "        heap = []\n" +
            "        people = self.following[userId] | {userId}\n" +
            "        for uid in people:\n" +
            "            if self.tweets[uid]:\n" +
            "                idx = len(self.tweets[uid]) - 1\n" +
            "                t, tid = self.tweets[uid][idx]\n" +
            "                heapq.heappush(heap, (t, tid, uid, idx))\n" +
            "        feed = []\n" +
            "        while heap and len(feed) < 10:\n" +
            "            t, tid, uid, idx = heapq.heappop(heap)\n" +
            "            feed.append(tid)\n" +
            "            if idx > 0:\n" +
            "                nidx = idx - 1\n" +
            "                nt, ntid = self.tweets[uid][nidx]\n" +
            "                heapq.heappush(heap, (nt, ntid, uid, nidx))\n" +
            "        return feed\n" +
            "\n" +
            "    def follow(self, followerId: int, followeeId: int) -> None:\n" +
            "        self.following[followerId].add(followeeId)\n" +
            "\n" +
            "    def unfollow(self, followerId: int, followeeId: int) -> None:\n" +
            "        self.following[followerId].discard(followeeId)"
        }
      ],
      patternRecognition: [
        "'Merge several time-ordered lists and return the newest k' -> heap-merge (Merge k Sorted Lists in disguise).",
        "Recency ordering with no real clock -> a monotonic global counter as the timestamp key.",
        "Design problem with follow graph + feed -> hash map of tweet lists + hash map of follow sets + a heap."
      ],
      interviewRecall: [
        "Stamp every tweet with a global counter; decreasing counter makes newest = smallest for a min-heap.",
        "Feed = user's own tweets + followees'; a user always sees their own posts.",
        "Seed the heap with each person's newest tweet, pop 10 times, pushing each owner's next-newest.",
        "postTweet/follow/unfollow are O(1); getNewsFeed is O(F + 10 log F). heapq is a MIN-heap — use a decreasing counter or negate for a max-heap."
      ]
    }
  ]);
})();
