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
            "**A. What is being asked?** Maintain the median of a growing multiset under two operations: insert a number, and read the current median. The challenge is doing both fast — inserting into a sorted array is `O(n)` (shifting), and sorting on every query is `O(n log n)`.\n\n" +
            "**D. Key observation.** The median only cares about the *boundary* between the smaller half of the values and the larger half. If we could always peek at the largest element of the low half and the smallest element of the high half, we would have everything we need — and a heap peeks at its extreme in `O(1)`.\n\n" +
            "**E. Pattern / data structure — TWO heaps.** Split the numbers into two balanced halves:\n" +
            "- `low`: a **max-heap** holding the smaller half. Its root is the *largest* of the low half.\n" +
            "- `high`: a **min-heap** holding the larger half. Its root is the *smallest* of the high half.\n\n" +
            "Because Python only has a min-heap, we simulate the max-heap by **negating** every value pushed into `low` (push `-num`, and read the max back as `-low[0]`).\n\n" +
            "**F. The balancing invariant.** We enforce two rules after every insert:\n" +
            "1. **Ordering:** every value in `low` is `<=` every value in `high` (so `-low[0] <= high[0]`). This is what makes the two roots the true middle elements.\n" +
            "2. **Size:** the heaps differ in size by at most 1. We choose the convention that `low` may have one extra element (i.e. `len(low) == len(high)` or `len(low) == len(high) + 1`).\n\n" +
            "**G/H. What each structure holds.** `low` = smaller half (negated for max-heap behaviour); `high` = larger half. Together they hold every number ever added.\n\n" +
            "**I. Step by step (addNum).**\n" +
            "1. Push the new number onto `low` (as `-num`). Now `low`'s root is a candidate for the overall middle.\n" +
            "2. **Fix ordering:** move `low`'s root over to `high` — pop the max of `low` and push it to `high`. This guarantees rule 1 (the element we just moved is the largest of the low side and now sits on the high side, so nothing on the low side exceeds the high side).\n" +
            "3. **Fix size:** if `high` now has more elements than `low`, move `high`'s root (its min) back to `low`. This restores the size convention (`low` >= `high`).\n\n" +
            "**I. Step by step (findMedian).**\n" +
            "- If the heaps are equal in size, the count is even and the two middles are the two roots: `(-low[0] + high[0]) / 2`.\n" +
            "- Otherwise `low` has the extra element, so the count is odd and the single middle is `low`'s root: `-low[0]`.\n\n" +
            "**J. Why it is correct.** Steps 2 and 3 together guarantee both invariants after every insert, so at all times `low` holds the floor(count/2) or ceil(count/2) smallest values and `high` holds the rest. The boundary between the halves is exactly the roots, which is exactly where the median lives.\n\n" +
            "**K/L. Complexity.** Each `addNum` does a constant number of heap push/pop operations = `O(log n)`. `findMedian` just reads one or two roots = `O(1)`. Space `O(n)` to store all elements.\n\n" +
            "**M. Interview mindset.** 'Running median / running percentile of a stream' is the signature cue for the two-heaps pattern. The reusable idea: a max-heap and a min-heap facing each other let you keep the middle of a dataset accessible in `O(1)` while inserts stay `O(log n)`.",
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
            "**A. Asked.** Return the `k` values that occur most often.\n\n" +
            "**B. First step (both approaches share it).** Count occurrences with a hash map in one `O(n)` pass: `count[value] = frequency`.\n\n" +
            "**C. Naive follow-up.** Sort the distinct values by frequency and take the last `k` — that is `O(m log m)` where `m` is the number of distinct values. Correct but does more work than needed when `k` is small.\n\n" +
            "**D. Key observation.** We don't need the full ordering of all frequencies — we only need the top `k`. A **min-heap of size k** lets us keep exactly the k most frequent seen so far: the smallest frequency in the heap sits at the root, so whenever a new element beats it we evict the root.\n\n" +
            "**E. Pattern / data structure.** Push `(frequency, value)` pairs. Because it is a min-heap keyed on frequency, the root is always the *least* frequent of the current top-k — the first candidate to drop.\n\n" +
            "**I. Step by step.** Build the counts. Iterate the distinct `(value, freq)` pairs: push each onto the heap; if the heap exceeds size `k`, pop the smallest-frequency entry. After processing everything, the heap holds exactly the k most frequent — extract their values.\n\n" +
            "**J. Why correct.** At all times the heap contains the k highest frequencies seen so far, since we only ever discard the current minimum once size exceeds k. Anything discarded had a frequency no larger than k surviving entries.\n\n" +
            "**K/L. Complexity.** Counting is `O(n)`. Each of the `m` distinct values does an `O(log k)` heap op, and the heap never exceeds size `k`, so `O(m log k) <= O(n log k)`. Space `O(n)` for the counts.\n\n" +
            "**M. Interview mindset.** 'Top-k by some score' with k small -> a size-k heap keyed on the score. Use a min-heap when you want the k LARGEST (root = the weakest survivor to evict).",
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
            "**D. Key observation that beats the heap.** A frequency can be at most `n` (an element cannot appear more times than the array is long). So frequencies live in the small range `1..n` and can be used directly as **array indices** — no comparisons, no logs.\n\n" +
            "**E. Pattern — bucket sort.** Create `n + 1` buckets, where `buckets[f]` is the list of values that occur exactly `f` times. This places every distinct value into its frequency slot in `O(m)` total.\n\n" +
            "**F. Why it works.** Frequency is a bounded integer, which is exactly the precondition for counting/bucket sort to sort in linear time. We sidestep comparison-based sorting entirely.\n\n" +
            "**I. Step by step.**\n" +
            "1. Count frequencies with a hash map (`O(n)`).\n" +
            "2. Fill buckets: for each `(value, freq)`, append `value` to `buckets[freq]`.\n" +
            "3. Walk buckets from the **highest** frequency downward, collecting values until we have `k`.\n\n" +
            "**J. Why correct.** Scanning from the highest index means we always take the most frequent remaining values first, so the first `k` collected are the top-k by frequency.\n\n" +
            "**K/L. Complexity.** Counting `O(n)`, filling buckets `O(m)`, scanning buckets `O(n)` in the worst case -> `O(n)` overall. Space `O(n)` for counts and buckets.\n\n" +
            "**M. Interview mindset.** When the sort key is a bounded integer (here, frequency <= n), reach for bucket/counting sort to break the `O(n log n)` barrier. Index by the key instead of comparing.",
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
            "**A. Asked.** Find the value that would sit at position `k` if the array were sorted from largest to smallest.\n\n" +
            "**B. Brute force.** Sort the whole array descending and index `k-1`: correct but `O(n log n)` and computes far more order than we need.\n\n" +
            "**D. Key observation.** The k-th largest element is precisely the **smallest** among the k largest elements. If we keep only the k biggest values seen so far in a **min-heap**, the root is that smallest-of-the-top-k — which is exactly the answer.\n\n" +
            "**E. Pattern / data structure.** A min-heap capped at size `k`. Its root is the weakest member of the current top-k, so any incoming value larger than the root deserves to replace it.\n\n" +
            "**I. Step by step.** Push elements one by one. Whenever the heap grows beyond `k`, pop the root (the current smallest of the top-k). After the whole array is processed, the heap holds the k largest values and its root is the k-th largest.\n\n" +
            "**J. Why correct.** The heap always retains the k largest values seen so far: we only ever evict the minimum once size exceeds k, and an evicted value is smaller than k others, so it can never be the k-th largest. At the end the root is the minimum of the top-k, i.e. the k-th largest overall.\n\n" +
            "**K/L. Complexity.** Each of `n` elements does an `O(log k)` heap op -> `O(n log k)` time, `O(k)` space for the heap.\n\n" +
            "**M. Interview mindset.** 'k-th largest / k-th smallest / top-k' -> a size-k heap of the OPPOSITE polarity: for k-th largest use a MIN-heap (root = the one to evict); for k-th smallest use a max-heap.",
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
            "**D. Key observation.** Sorting orders *all* n elements, but we only need the ONE element at a known rank. Quickselect adapts quicksort's partition step to home in on that single position without sorting the rest.\n\n" +
            "**E. Rank conversion.** The k-th *largest* is the element at 0-based index `target = len(nums) - k` in **ascending** sorted order (e.g. the largest sits at the last index `n-1`). We hunt for whatever value ends up at that index.\n\n" +
            "**F. Partition intuition.** Pick a `pivot`. Rearrange the current range so that every element `< pivot` comes before it and every element `>= pivot` comes after — the pivot lands at its **final sorted index** `p`. Crucially we now KNOW the pivot's true rank for free.\n" +
            "- If `p == target`, the pivot IS the answer — return it.\n" +
            "- If `p < target`, the answer lies to the RIGHT; recurse (or loop) on the right part only.\n" +
            "- If `p > target`, the answer lies to the LEFT; recurse on the left part only.\n\n" +
            "**G/H. Why it is fast.** Unlike quicksort we discard one side each round instead of recursing into both. On average each partition halves the search range, so the work is `n + n/2 + n/4 + ... = O(n)`. The worst case (`O(n^2)`) happens with pathological pivots; a random pivot makes that astronomically unlikely.\n\n" +
            "**I. Step by step.** Maintain a `[left, right]` window over the array. Repeatedly partition it around a (randomly chosen) pivot; compare the pivot's final index `p` to `target` and shrink the window to the side that must contain `target`, until `p == target`.\n\n" +
            "**J. Why correct.** After each partition the pivot is at its exact sorted position, so comparing `p` with `target` reliably tells us which side holds the target rank. The window always contains index `target`, and it terminates when a pivot lands exactly on it.\n\n" +
            "**K/L. Complexity.** Average `O(n)` time, worst `O(n^2)`; `O(1)` extra space (in-place partitioning, iterative loop).\n\n" +
            "**M. Interview mindset.** 'Find the element of a given rank (median, k-th largest) without full sorting' -> Quickselect. Say the average is `O(n)`, mention random pivots to dodge the `O(n^2)` worst case, and note the size-k heap as the simpler `O(n log k)` alternative.",
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
