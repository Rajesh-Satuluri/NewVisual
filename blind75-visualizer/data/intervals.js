/*
 * Blind 75 — Intervals
 * =========================================================================
 * Registers the Intervals category on the global registry:
 *     window.BLIND75.register("Intervals", [ ...problems ]);
 *
 * THE RECURRING IDEA (read once, applies to all five problems):
 *   An interval is a pair [start, end] on a 1-D number line. Almost every
 *   interval problem is solved by SORTING first (by start, or sometimes by
 *   end), then SWEEPING left to right and comparing each interval to the
 *   previous / accumulated one.
 *
 *   THE OVERLAP CONDITION. Two intervals a and b, with a starting no later
 *   than b (a.start <= b.start after sorting by start), overlap iff:
 *
 *        a.start <= b.end   AND   b.start <= a.end
 *
 *   Once sorted by start we already know a.start <= b.start <= b.end, so the
 *   only test that matters is:  b.start <= a.end   (i.e. the next interval
 *   begins before the current one ends). If it holds, they touch/overlap and
 *   can be merged into [min(starts), max(ends)] = [a.start, max(a.end,b.end)].
 *   Whether "touching" endpoints (b.start == a.end) count as overlap depends
 *   on the problem — noted per problem below.
 *
 *   Picture it on a timeline:
 *        [1,3]   [2,6]        [8,10]
 *        1 2 3 4 5 6 7 8 9 10
 *        [---]                        <- [1,3]
 *          [-------]                  <- [2,6]  (2 <= 3 -> overlaps [1,3])
 *                        [---]        <- [8,10] (8 > 6  -> separate)
 *        merged: [1,6]        [8,10]
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Intervals", [
    {
      id: "insert-interval",
      lc: 57,
      title: "Insert Interval",
      difficulty: "Medium",
      category: "Intervals",
      link: "https://leetcode.com/problems/insert-interval/",
      meta: { pattern: "Sorted Interval Merge", dataStructure: "Array", technique: "Single pass around new interval" },
      description:
        "You are given an array `intervals` where each `intervals[i] = [start_i, end_i]` represents a closed interval, and the list is **already sorted by start** and contains **no overlaps**. You are also given one new interval `newInterval = [start, end]`.\n\n" +
        "Insert `newInterval` into `intervals` so the result is still sorted by start and still has no overlaps (merging with any intervals it overlaps). Return the resulting list.",
      constraints: [
        "`0 <= intervals.length <= 10^4`",
        "`intervals[i].length == 2`",
        "`0 <= start_i <= end_i <= 10^5`",
        "`intervals` is sorted by `start_i` in ascending order and has no overlaps.",
        "`newInterval.length == 2` and `0 <= start <= end <= 10^5`"
      ],
      notes: [
        "The input is ALREADY sorted and non-overlapping, so you do not need to sort — that is what lets this run in O(n).",
        "Touching intervals count as overlapping here: `[1,3]` and `[3,5]` merge into `[1,5]` because 3 <= 3.",
        "The answer must remain sorted and non-overlapping."
      ],
      examples: [
        {
          input: "intervals = [[1,3],[6,9]], newInterval = [2,5]",
          output: "[[1,5],[6,9]]",
          reasoning: "[2,5] overlaps [1,3] (2 <= 3) so they merge into [1,5]; [6,9] starts after 5 so it is untouched.",
          visual:
            "```\n1 2 3 4 5 6 7 8 9\n[---]                 [1,3]\n  [-------]           [2,5]  new (2 <= 3 -> overlaps)\n          [-----]     [6,9]\nresult: [1,5]  [6,9]\n```"
        },
        {
          input: "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
          output: "[[1,2],[3,10],[12,16]]",
          reasoning: "[4,8] overlaps [3,5], [6,7], and [8,10] (touching at 8), swallowing all three into [3,10]. [1,2] is before it, [12,16] is after.",
          visual:
            "```\n1 2 3 4 5 6 7 8 9 10   12..16\n[-]                          [1,2]\n    [---]                    [3,5]\n        [-]                  [6,7]\n            [----]           [8,10]\n      [----------]           [4,8] new\nresult: [1,2] [3,10] [12,16]\n```"
        },
        {
          input: "intervals = [], newInterval = [5,7]",
          output: "[[5,7]]",
          reasoning: "Nothing to merge with; the new interval is the whole answer."
        },
        {
          input: "intervals = [[1,5]], newInterval = [2,3]",
          output: "[[1,5]]",
          reasoning: "The new interval is entirely inside [1,5]; merging leaves [1,5] unchanged."
        },
        {
          input: "intervals = [[1,5]], newInterval = [6,8]",
          output: "[[1,5],[6,8]]",
          reasoning: "6 > 5, so no overlap; the new interval is appended after."
        }
      ],
      approaches: [
        {
          name: "Single pass — before / overlap / after",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The expected answer: exploit the fact that the list is already sorted, so one linear scan suffices.",
          logic:
            "**What it asks.** Drop one new interval into an already-sorted, non-overlapping list and return the list still sorted and still non-overlapping.\n\n" +
            "**Why the naive idea fails.** The tempting approach is to append `newInterval`, sort everything (`O(n log n)`), then run the full Merge-Intervals routine. It works, but it throws away the gift the problem hands you: the input is ALREADY sorted, so the re-sort is wasted work.\n\n" +
            "**Key Idea.** Because the list is sorted by start, every existing interval falls into exactly one of three CONTIGUOUS zones relative to `newInterval`: entirely BEFORE it (ends before `newInterval` starts, `interval.end < newInterval.start`), OVERLAPPING it (neither fully before nor fully after), or entirely AFTER it (starts after `newInterval` ends, `interval.start > newInterval.end`). Since the zones never interleave, one linear sweep that only ever compares against the single growing `newInterval` suffices — no repeated sorting.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Copy every interval that ends before `newInterval` starts straight into the result.\n" +
            "2. While the current interval overlaps `newInterval` (`interval.start <= newInterval.end`), absorb it by widening: set `newInterval.start` to the `min` of the two starts and `newInterval.end` to the `max` of the two ends.\n" +
            "3. Push the fully merged `newInterval` exactly once.\n" +
            "4. Copy every remaining interval as-is.\n\n" +
            "**Why it works.** Sorting makes the three zones contiguous: all the before intervals come first, then a (possibly empty) run of overlapping ones, then all the after intervals. Collapsing the middle run into one widened interval keeps the whole result sorted and non-overlapping, and each interval is placed exactly once.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching endpoints count as overlap here (`[1,3]` and `[3,5]` merge into `[1,5]`), so the overlap test must use `<=`.\n" +
            "- Empty input, or a `newInterval` that lands entirely before or after everything, must still work — the overlapping run is simply empty and `newInterval` is pushed in its sorted position.\n" +
            "- A `newInterval` fully contained in an existing one leaves that interval effectively unchanged after taking the `min`/`max`.\n\n" +
            "**Complexity.** Time `O(n)` — each interval is examined once. Space `O(n)` for the output list.\n\n" +
            "**Interview mindset.** When the input is already sorted, resist re-sorting — a single positional sweep past the insertion point is the intended, faster solution.",
          rcs:
            "class Solution:\n" +
            "    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        i = 0\n" +
            "        n = len(intervals)\n" +
            "        # Phase 1: intervals strictly BEFORE newInterval (end before new start).\n" +
            "        while i < n and intervals[i][1] < newInterval[0]:\n" +
            "            result.append(intervals[i])     # No overlap possible; copy as-is.\n" +
            "            i += 1\n" +
            "        # Phase 2: intervals that OVERLAP newInterval; grow newInterval to swallow them.\n" +
            "        while i < n and intervals[i][0] <= newInterval[1]:  # start <= new end -> overlap.\n" +
            "            newInterval[0] = min(newInterval[0], intervals[i][0])  # Widen left edge.\n" +
            "            newInterval[1] = max(newInterval[1], intervals[i][1])  # Widen right edge.\n" +
            "            i += 1\n" +
            "        result.append(newInterval)          # Push the fully merged new interval once.\n" +
            "        # Phase 3: everything strictly AFTER newInterval.\n" +
            "        while i < n:\n" +
            "            result.append(intervals[i])\n" +
            "            i += 1\n" +
            "        return result",
          plain:
            "class Solution:\n" +
            "    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:\n" +
            "        result = []\n" +
            "        i = 0\n" +
            "        n = len(intervals)\n" +
            "        while i < n and intervals[i][1] < newInterval[0]:\n" +
            "            result.append(intervals[i])\n" +
            "            i += 1\n" +
            "        while i < n and intervals[i][0] <= newInterval[1]:\n" +
            "            newInterval[0] = min(newInterval[0], intervals[i][0])\n" +
            "            newInterval[1] = max(newInterval[1], intervals[i][1])\n" +
            "            i += 1\n" +
            "        result.append(newInterval)\n" +
            "        while i < n:\n" +
            "            result.append(intervals[i])\n" +
            "            i += 1\n" +
            "        return result"
        }
      ],
      patternRecognition: [
        "Input is a sorted, non-overlapping interval list and you must splice one interval in.",
        "The three-zone split (before / overlapping / after) is the signature of this problem.",
        "'Already sorted' is the hint to do a single O(n) pass rather than re-sorting."
      ],
      interviewRecall: [
        "Three phases: copy the 'before' ones, merge the overlapping run into newInterval, copy the 'after' ones.",
        "Overlap test after sort: intervals[i][0] <= newInterval[1] (next start <= growing end).",
        "Merge by widening: new start = min of starts, new end = max of ends."
      ]
    },

    {
      id: "merge-intervals",
      lc: 56,
      title: "Merge Intervals",
      difficulty: "Medium",
      category: "Intervals",
      link: "https://leetcode.com/problems/merge-intervals/",
      meta: { pattern: "Sort + Sweep Merge", dataStructure: "Array", technique: "Sort by start, merge adjacent" },
      description:
        "Given an array `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals and return an array of the non-overlapping intervals that exactly cover all the input intervals.",
      constraints: [
        "`1 <= intervals.length <= 10^4`",
        "`intervals[i].length == 2`",
        "`0 <= start_i <= end_i <= 10^4`"
      ],
      notes: [
        "The input is NOT sorted, so you must sort by start first.",
        "Touching intervals merge: `[1,4]` and `[4,5]` become `[1,5]` (4 <= 4).",
        "The output should be sorted by start (a natural byproduct of sorting first)."
      ],
      examples: [
        {
          input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
          output: "[[1,6],[8,10],[15,18]]",
          reasoning: "[1,3] and [2,6] overlap (2 <= 3) → [1,6]; the rest are disjoint.",
          visual:
            "```\n1 2 3 4 5 6   8 9 10   15..18\n[---]                        [1,3]\n  [-------]                  [2,6]  (2 <= 3 -> merge)\n            [----]           [8,10]\n                     [----]  [15,18]\nresult: [1,6] [8,10] [15,18]\n```"
        },
        {
          input: "intervals = [[1,4],[4,5]]",
          output: "[[1,5]]",
          reasoning: "They touch at 4; since 4 <= 4 they are considered overlapping and merge into [1,5].",
          visual:
            "```\n1 2 3 4 5\n[-----]      [1,4]\n      [-]    [4,5]  (touch at 4 -> merge)\nresult: [1,5]\n```"
        },
        {
          input: "intervals = [[1,4],[2,3]]",
          output: "[[1,4]]",
          reasoning: "[2,3] is fully contained in [1,4]; taking max(4,3)=4 keeps [1,4]."
        },
        {
          input: "intervals = [[1,4],[5,6]]",
          output: "[[1,4],[5,6]]",
          reasoning: "5 > 4, a real gap, so nothing merges."
        }
      ],
      approaches: [
        {
          name: "Sort by start, then sweep and merge",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "The canonical interval-merging routine; the foundation nearly every other interval problem builds on.",
          logic:
            "**What it asks.** Collapse every group of overlapping intervals into a single covering interval and return the minimal set of disjoint intervals that exactly covers the input.\n\n" +
            "**Why the naive idea fails.** Brute force repeatedly scans all pairs, merges any that overlap, and repeats until nothing changes. That is `O(n^2)` or worse and awkward to code, because overlaps can chain arbitrarily (A overlaps B overlaps C) and a single pass over unsorted data misses them.\n\n" +
            "**Key Idea.** If you **sort by start**, any interval that overlaps a given one must come immediately after it in sorted order. So overlaps are always between *adjacent* intervals — you never need to look back further than the last interval already committed to the answer. That lets you sweep once, keeping a single 'accumulator' interval (the last element of the result list).\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `intervals` by start.\n" +
            "2. Seed the result with the first interval; its last element is the interval currently being extended.\n" +
            "3. For each subsequent interval `[start, end]`, let `last_end` be the end of the result's last interval. If `start <= last_end` they overlap (or touch) — extend only the end via `last.end = max(last_end, end)`. Otherwise there is a gap — append `[start, end]` as a new block.\n\n" +
            "**Why it works.** After sorting, `last.start <= cur.start` always holds, so the only overlap test that matters is `cur.start <= last.end`. Sorting guarantees the members of any overlapping cluster are met consecutively, so one running interval captures the whole cluster before a gap ends it — no overlap can be stranded earlier in the list. The start of the accumulator never changes because it is already the smallest in its cluster.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching intervals merge here (`[1,4]` and `[4,5]` become `[1,5]`), so the test is `<=`, not `<`.\n" +
            "- A fully contained interval (`[2,3]` inside `[1,4]`) must not shrink the accumulator — take `max` of the ends, never overwrite.\n" +
            "- Merging extends only the end; do not touch the accumulator's start.\n\n" +
            "**Complexity.** Time `O(n log n)`, dominated by the sort; the sweep itself is `O(n)`. Space `O(n)` for the output (plus the sort's own `O(log n)`–`O(n)` scratch).\n\n" +
            "**Interview mindset.** 'Merge / combine overlapping ranges' or 'return the minimal set of disjoint intervals' → sort by start, then compare each interval to the last kept one. Memorize this loop; nearly every other interval problem builds on it.",
          rcs:
            "class Solution:\n" +
            "    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n" +
            "        intervals.sort(key=lambda x: x[0])   # Sort by start so overlaps are adjacent.\n" +
            "        merged = [intervals[0]]              # Seed the result with the first interval.\n" +
            "        for start, end in intervals[1:]:     # Sweep the rest in sorted order.\n" +
            "            last_end = merged[-1][1]         # End of the interval we're currently extending.\n" +
            "            if start <= last_end:            # Overlap (or touch) -> merge into the last one.\n" +
            "                merged[-1][1] = max(last_end, end)  # Extend its right edge only.\n" +
            "            else:                            # Gap -> this interval starts a new block.\n" +
            "                merged.append([start, end])\n" +
            "        return merged",
          plain:
            "class Solution:\n" +
            "    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n" +
            "        intervals.sort(key=lambda x: x[0])\n" +
            "        merged = [intervals[0]]\n" +
            "        for start, end in intervals[1:]:\n" +
            "            last_end = merged[-1][1]\n" +
            "            if start <= last_end:\n" +
            "                merged[-1][1] = max(last_end, end)\n" +
            "            else:\n" +
            "                merged.append([start, end])\n" +
            "        return merged"
        }
      ],
      patternRecognition: [
        "'Merge / combine overlapping ranges' or 'return the minimal set of disjoint intervals'.",
        "Any time you need to detect overlaps: sort by start first so overlaps become adjacent.",
        "The result's last element as a mutable 'accumulator' is the recurring trick."
      ],
      interviewRecall: [
        "Sort by start, then compare each interval's start to the last kept interval's end.",
        "Overlap condition after sorting: cur.start <= last.end (touching counts).",
        "Merge extends only the end: last.end = max(last.end, cur.end); the start never changes."
      ]
    },

    {
      id: "non-overlapping-intervals",
      lc: 435,
      title: "Non-overlapping Intervals",
      difficulty: "Medium",
      category: "Intervals",
      link: "https://leetcode.com/problems/non-overlapping-intervals/",
      meta: { pattern: "Greedy Interval Scheduling", dataStructure: "Array", technique: "Sort by end, keep earliest finisher" },
      description:
        "Given an array `intervals` where `intervals[i] = [start_i, end_i]`, return the **minimum number of intervals you must remove** so that the remaining intervals are non-overlapping.",
      constraints: [
        "`1 <= intervals.length <= 10^5`",
        "`intervals[i].length == 2`",
        "`-5 * 10^4 <= start_i < end_i <= 5 * 10^4`"
      ],
      notes: [
        "Intervals that only touch at an endpoint are NOT considered overlapping here: `[1,2]` and `[2,3]` can both stay.",
        "Removing the fewest to make the rest disjoint is the same as KEEPING the most non-overlapping intervals — the classic 'activity selection' problem."
      ],
      examples: [
        {
          input: "intervals = [[1,2],[2,3],[3,4],[1,3]]",
          output: "1",
          reasoning: "Remove [1,3]; then [1,2],[2,3],[3,4] are all non-overlapping (touching endpoints are fine).",
          visual:
            "```\n1 2 3 4\n[-]          [1,2] keep\n  [-]        [2,3] keep\n    [-]      [3,4] keep\n[---]        [1,3] REMOVE (overlaps [2,3])\nremovals = 1\n```"
        },
        {
          input: "intervals = [[1,2],[1,2],[1,2]]",
          output: "2",
          reasoning: "All three are identical and overlap; keep one, remove the other two."
        },
        {
          input: "intervals = [[1,2],[2,3]]",
          output: "0",
          reasoning: "They only touch at 2, which is not an overlap, so nothing must be removed."
        },
        {
          input: "intervals = [[1,100],[11,22],[1,11],[2,12]]",
          output: "2",
          reasoning: "Keeping the earliest-finishing intervals ([1,11] then [11,22]) leaves 2 to remove ([1,100] and [2,12])."
        }
      ],
      approaches: [
        {
          name: "Greedy — sort by end, keep the earliest finisher",
          time: "O(n log n)",
          space: "O(1)",
          whenToUse: "The optimal solution; recognize it as interval scheduling / activity selection whenever you must keep as many disjoint intervals as possible.",
          logic:
            "**What it asks.** Delete as few intervals as possible so none of the survivors overlap. Equivalently, **keep the maximum number of mutually non-overlapping intervals**; then removals = total − kept.\n\n" +
            "**Why the naive idea fails.** Sorting by start feels natural but misleads: a very long interval could start earliest yet block many short ones that could otherwise coexist. Trying every subset to find the largest non-overlapping one is exponential. The quantity that actually matters for packing in more intervals is how *early each one finishes*, not when it starts.\n\n" +
            "**Key Idea.** Among intervals competing for the same space, always keep the one that **ends earliest**. Finishing as early as possible leaves the most room on the right for future intervals, which can never hurt and often helps. This is the classic greedy 'activity selection' choice.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort by end time, ascending.\n" +
            "2. Initialize `prev_end` to `-infinity` (end of the last interval kept) and `removals` to `0`.\n" +
            "3. For each `[start, end]`: if `start >= prev_end` it does not overlap the last kept interval — keep it and set `prev_end = end`. Otherwise it overlaps — increment `removals` and leave `prev_end` unchanged, dropping the later finisher.\n\n" +
            "**Why it works.** The exchange argument proves optimality. Suppose an optimal solution keeps some interval X where greedy would keep Y, the earliest-finishing compatible interval, with `Y.end <= X.end`. Swap X for Y: Y finishes no later than X, so it cannot conflict with anything scheduled after X — the swapped set is still valid and just as large. Repeating this exchange transforms any optimal solution into the greedy one without shrinking it, so always retaining the earliest finisher maximizes survivors and forces removals to be minimal.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching endpoints are NOT overlaps here, so the keep test uses `>=` (`[1,2]` and `[2,3]` can both stay).\n" +
            "- Sort by END, not start — sorting by start gives the wrong answer on the long-interval case.\n" +
            "- Initialize `prev_end` to `-infinity` so the very first interval is always kept.\n\n" +
            "**Complexity.** Time `O(n log n)` for the sort; the single sweep is `O(n)`. Space `O(1)` beyond the sort.\n\n" +
            "**Interview mindset.** 'Minimum removals to make disjoint' or 'maximum count of non-overlapping intervals' → greedy by earliest END time. It is the interval-scheduling / activity-selection signature.",
          rcs:
            "class Solution:\n" +
            "    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:\n" +
            "        intervals.sort(key=lambda x: x[1])   # Sort by END time (earliest finisher first).\n" +
            "        removals = 0\n" +
            "        prev_end = float('-inf')             # End of the last interval we chose to keep.\n" +
            "        for start, end in intervals:\n" +
            "            if start >= prev_end:            # Starts at/after last kept end -> no overlap.\n" +
            "                prev_end = end               # Keep it; advance the boundary.\n" +
            "            else:                            # Starts before -> overlaps, must remove one.\n" +
            "                removals += 1                # Drop this later-finisher; keep the earlier end.\n" +
            "        return removals",
          plain:
            "class Solution:\n" +
            "    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:\n" +
            "        intervals.sort(key=lambda x: x[1])\n" +
            "        removals = 0\n" +
            "        prev_end = float('-inf')\n" +
            "        for start, end in intervals:\n" +
            "            if start >= prev_end:\n" +
            "                prev_end = end\n" +
            "            else:\n" +
            "                removals += 1\n" +
            "        return removals"
        }
      ],
      patternRecognition: [
        "'Minimum removals to make non-overlapping' or 'maximum count of disjoint intervals'.",
        "Classic activity-selection / interval-scheduling → greedy by earliest end time.",
        "Touching endpoints allowed (start >= prev_end uses >=, not >)."
      ],
      interviewRecall: [
        "Sort by END, keep the earliest finisher, count everything that overlaps the last kept.",
        "The exchange argument: swapping in the earliest finisher never conflicts with later picks, so greedy is optimal.",
        "removals = total - (max non-overlapping kept); you can count removals directly in one sweep."
      ]
    },

    {
      id: "meeting-rooms",
      lc: 252,
      title: "Meeting Rooms",
      difficulty: "Easy",
      category: "Intervals",
      link: "https://leetcode.com/problems/meeting-rooms/",
      meta: { pattern: "Sort + Adjacent Overlap", dataStructure: "Array", technique: "Sort by start, check neighbors" },
      description:
        "Given an array of meeting time intervals where `intervals[i] = [start_i, end_i]`, determine whether a single person could attend **all** of the meetings — that is, return `true` if no two meetings overlap, and `false` otherwise.",
      constraints: [
        "`0 <= intervals.length <= 10^4`",
        "`intervals[i].length == 2`",
        "`0 <= start_i < end_i <= 10^6`"
      ],
      notes: [
        "This is a premium/locked problem; the standard signature takes `List[List[int]]` (LeetCode also phrases it with a `List[Interval]` — the [start, end] list form used here is the portable version and translates directly).",
        "Meetings that merely touch (`[1,5]` then `[5,10]`) do NOT conflict — one ends exactly as the next begins.",
        "An empty list of meetings trivially returns true."
      ],
      examples: [
        {
          input: "intervals = [[0,30],[5,10],[15,20]]",
          output: "false",
          reasoning: "[0,30] overlaps both [5,10] and [15,20] — you cannot attend all three.",
          visual:
            "```\n0        10   15  20        30\n[--------------------------]   [0,30]\n     [--]                       [5,10]  (5 < 30 -> conflict)\n           [--]                 [15,20]\nresult: false\n```"
        },
        {
          input: "intervals = [[7,10],[2,4]]",
          output: "true",
          reasoning: "Sorted → [2,4],[7,10]; 7 >= 4, so no overlap.",
          visual:
            "```\n2   4       7    10\n[--]                 [2,4]\n         [----]      [7,10]  (7 >= 4 -> ok)\nresult: true\n```"
        },
        {
          input: "intervals = [[1,5],[5,10]]",
          output: "true",
          reasoning: "They touch at 5; the first ends exactly as the second starts, which is allowed."
        },
        {
          input: "intervals = []",
          output: "true",
          reasoning: "No meetings means there is nothing to conflict."
        }
      ],
      approaches: [
        {
          name: "Sort by start, check adjacent pairs",
          time: "O(n log n)",
          space: "O(1)",
          whenToUse: "Whenever you must simply confirm that a set of intervals is conflict-free.",
          logic:
            "**What it asks.** Can a single person attend every meeting? That is `true` exactly when no two meetings overlap.\n\n" +
            "**Why the naive idea fails.** Comparing every pair of meetings for overlap is `O(n^2)`. It is correct but does unnecessary work — most pairs are far apart in time and can never conflict.\n\n" +
            "**Key Idea.** After **sorting by start**, any conflict must be between two *consecutive* meetings. Why: if meeting A (earlier start) conflicts with some later meeting C, then A also conflicts with the meeting immediately after it in sorted order — that neighbor starts no later than C and A extends past it. So checking only adjacent pairs catches every conflict.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort the meetings by start.\n" +
            "2. For `i` from 1 to n−1, compare `intervals[i].start` with `intervals[i-1].end`.\n" +
            "3. If `intervals[i].start < intervals[i-1].end`, a meeting begins before the previous one ends → return `false`.\n" +
            "4. If no such pair is found, return `true`.\n\n" +
            "**Why it works.** Sorting guarantees any overlapping pair becomes adjacent, so a single adjacent scan is sufficient to find a conflict if one exists. The strict `<` lets meetings that merely touch at an endpoint pass as non-conflicting.\n\n" +
            "**Common Gotchas.**\n" +
            "- Meetings that touch (`[1,5]` then `[5,10]`) do NOT conflict, so use strict `<`, not `<=`.\n" +
            "- An empty list returns `true` — there is nothing to conflict.\n" +
            "- Do not forget to sort first; scanning neighbors in the original order misses conflicts.\n\n" +
            "**Complexity.** Time `O(n log n)`, dominated by the sort; the scan is `O(n)`. Space `O(1)` extra.\n\n" +
            "**Interview mindset.** 'Can one person do all of these?' = 'are these intervals pairwise disjoint?' → sort by start and scan neighbors. This is the warm-up to Meeting Rooms II.",
          rcs:
            "class Solution:\n" +
            "    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:\n" +
            "        intervals.sort(key=lambda x: x[0])   # Sort by start so conflicts are adjacent.\n" +
            "        for i in range(1, len(intervals)):\n" +
            "            if intervals[i][0] < intervals[i - 1][1]:  # Starts before previous ends?\n" +
            "                return False                 # Overlap -> cannot attend all.\n" +
            "        return True                          # No adjacent overlap anywhere.",
          plain:
            "class Solution:\n" +
            "    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:\n" +
            "        intervals.sort(key=lambda x: x[0])\n" +
            "        for i in range(1, len(intervals)):\n" +
            "            if intervals[i][0] < intervals[i - 1][1]:\n" +
            "                return False\n" +
            "        return True"
        }
      ],
      patternRecognition: [
        "'Can one person attend all meetings?' = 'are all intervals disjoint?'",
        "Sort by start, then a conflict can only be between adjacent meetings.",
        "Strict `<` because meetings that touch at an endpoint do not conflict."
      ],
      interviewRecall: [
        "Sort by start; compare intervals[i].start with intervals[i-1].end.",
        "Return false on the first start < previous end; otherwise true.",
        "Empty list returns true — there is nothing to conflict."
      ]
    },

    {
      id: "meeting-rooms-ii",
      lc: 253,
      title: "Meeting Rooms II",
      difficulty: "Medium",
      category: "Intervals",
      link: "https://leetcode.com/problems/meeting-rooms-ii/",
      meta: { pattern: "Sweep Line / Min-Heap", dataStructure: "Min-Heap", technique: "Track concurrent meetings" },
      description:
        "Given an array of meeting time intervals `intervals[i] = [start_i, end_i]`, return the **minimum number of conference rooms** required so that no meeting is left without a room — i.e. the maximum number of meetings happening at the same time.",
      constraints: [
        "`1 <= intervals.length <= 10^4`",
        "`intervals[i].length == 2`",
        "`0 <= start_i < end_i <= 10^6`"
      ],
      notes: [
        "This is a premium/locked problem; standard signature takes `List[List[int]]` (a `List[Interval]` phrasing exists — the [start, end] form used here is portable).",
        "A room frees up exactly at its meeting's end time, so a meeting starting at time t can reuse a room that ends at t (start == end does NOT need a new room).",
        "The answer equals the peak number of simultaneously ongoing meetings."
      ],
      examples: [
        {
          input: "intervals = [[0,30],[5,10],[15,20]]",
          output: "2",
          reasoning: "[0,30] runs the whole time; [5,10] needs a 2nd room; [15,20] reuses the room [5,10] freed at 10. Peak concurrency is 2.",
          visual:
            "```\n0    5   10   15   20        30\n[===========================]  [0,30]  room A\n     [====]                    [5,10]  room B\n              [====]           [15,20] reuse B (freed at 10)\npeak concurrent = 2 -> 2 rooms\n```"
        },
        {
          input: "intervals = [[7,10],[2,4]]",
          output: "1",
          reasoning: "They do not overlap, so one room hosts both in sequence."
        },
        {
          input: "intervals = [[1,5],[5,10],[10,15]]",
          output: "1",
          reasoning: "Each meeting ends exactly when the next begins, so a single room is reused throughout.",
          visual:
            "```\n1    5    10   15\n[====]              [1,5]\n     [====]         [5,10]  reuse (5 == 5)\n          [====]    [10,15] reuse\npeak concurrent = 1 -> 1 room\n```"
        },
        {
          input: "intervals = [[1,10],[2,7],[3,19],[8,12],[10,20],[11,30]]",
          output: "4",
          reasoning: "Around time 11, meetings [3,19],[8,12],[10,20],[11,30] all overlap → 4 rooms."
        }
      ],
      approaches: [
        {
          name: "Min-Heap of end times",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "Clean, intuitive approach: keep a heap of the end times of meetings currently using rooms.",
          logic:
            "**What it asks.** Find the minimum number of conference rooms so every meeting has one. That equals the maximum number of meetings that are ever simultaneously in progress — the peak concurrency.\n\n" +
            "**Why the naive idea fails.** For every meeting you could count how many others overlap it and take the maximum, but that is `O(n^2)`. It re-checks the same time regions over and over; the structure of the problem lets us track concurrency incrementally instead.\n\n" +
            "**Key Idea.** Process meetings in order of **start time**, and keep a **min-heap of the end times** of the meetings still occupying a room. The heap's root is the earliest time any current room frees up. When a new meeting begins, we ask in `O(log n)`: 'has the earliest-finishing ongoing meeting already ended?' If yes, that room is free and can be reused instead of allocating a new one. The heap's size is exactly the number of rooms in use, so its peak is the answer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort the meetings by start time so we consider them chronologically.\n" +
            "2. Keep a min-heap `heap` holding the end times of meetings currently using a room.\n" +
            "3. For each meeting `[start, end]`: if the heap is non-empty and its smallest end (`heap[0]`) is `<= start`, the earliest-finishing room is already free — pop it to reuse it. Then push `end` onto the heap for this meeting.\n" +
            "4. Because we pop at most one room before each push, the heap grows only when no room was free. The final heap size (equivalently the running maximum) is the minimum rooms needed.\n\n" +
            "**Why it works.** Sorting by start guarantees that when we consider a meeting, every room that could possibly be free has already had its end time pushed onto the heap. Freeing the earliest-ending room first is optimal: if the earliest finisher has not ended yet, no room has, so we genuinely need a new one. If it has ended, reusing it is always safe. Thus the heap size tracks true concurrency at every step, and its peak is the fewest rooms that suffice.\n\n" +
            "**Common Gotchas.**\n" +
            "- A room frees exactly at its end time, so a meeting starting at `t` may reuse a room ending at `t` — the reuse test is `heap[0] <= start`, not strict `<`.\n" +
            "- Handle the empty input by returning `0` before touching the heap.\n" +
            "- The heap must be keyed on END time, and you must sort the meetings by START — mixing these up breaks the reuse logic.\n\n" +
            "**Complexity.** Time `O(n log n)`: the sort plus `n` heap operations each `O(log n)`. Space `O(n)` for the heap in the worst case (all meetings overlap).\n\n" +
            "**Interview mindset.** 'Minimum rooms / machines / resources for a set of overlapping intervals' → a min-heap of end times that models 'when does the next resource free up'. The same shape solves any 'reuse the earliest-freed resource' problem.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:\n" +
            "        if not intervals:\n" +
            "            return 0\n" +
            "        intervals.sort(key=lambda x: x[0])   # Process meetings by start time.\n" +
            "        heap = []                            # Min-heap of end times of ongoing meetings.\n" +
            "        for start, end in intervals:\n" +
            "            if heap and heap[0] <= start:    # Earliest-ending room is already free?\n" +
            "                heapq.heappop(heap)          # Reuse it (start == end counts as free).\n" +
            "            heapq.heappush(heap, end)        # This meeting occupies a room until 'end'.\n" +
            "        return len(heap)                     # Peak rooms held simultaneously.",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:\n" +
            "        if not intervals:\n" +
            "            return 0\n" +
            "        intervals.sort(key=lambda x: x[0])\n" +
            "        heap = []\n" +
            "        for start, end in intervals:\n" +
            "            if heap and heap[0] <= start:\n" +
            "                heapq.heappop(heap)\n" +
            "            heapq.heappush(heap, end)\n" +
            "        return len(heap)"
        },
        {
          name: "Sweep line — separate sorted starts and ends",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "When you want the raw 'count concurrent events' intuition without a heap — two sorted arrays and two pointers.",
          logic:
            "**What it asks.** Return the minimum number of rooms for all meetings, which is the peak number of meetings in progress at any single instant.\n\n" +
            "**Why the naive idea fails.** Comparing every meeting against every other to count overlaps is `O(n^2)`. Instead of thinking in terms of whole meetings, we can think in terms of the individual moments when concurrency changes — starts and ends — and count them directly.\n\n" +
            "**Key Idea.** Split every meeting into two events: a `+1` at its start and a `-1` at its end. If you sweep through time and keep a running sum of these events, that sum is the number of meetings open at each instant, and its maximum is the answer. Crucially, we do not need to keep starts and ends paired — we only care *how many* meetings are open at a time, not which one owns which room. So extract all starts into one sorted array and all ends into another, then walk both with two pointers.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Build `starts` = all start times sorted, and `ends` = all end times sorted, independently.\n" +
            "2. Set two pointers `s` and `e` to 0, and `rooms = 0`, `max_rooms = 0`.\n" +
            "3. While `s < n`: if `starts[s] < ends[e]`, the next chronological event is a meeting BEGINNING — do `rooms += 1`, advance `s`, and update `max_rooms`. Otherwise the next event is a meeting ENDING — do `rooms -= 1` and advance `e`, freeing a room.\n" +
            "4. When all starts are consumed, `max_rooms` holds the peak concurrency; return it.\n\n" +
            "**Why it works.** Sorting starts and ends separately is valid because concurrency at a time depends only on how many meetings have begun but not yet ended, not on their identities. The two-pointer walk visits the events in chronological order, and the running counter is exactly the concurrency; its peak is therefore the minimum rooms.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use strict `<` when comparing `starts[s]` with `ends[e]`: if a start equals an end, the ending meeting frees its room exactly in time, so the end must be processed first (no new room). `<=` would over-count.\n" +
            "- Return `0` for empty input before building the arrays.\n" +
            "- The loop condition only needs `s < n`; once starts are exhausted, no further increases to concurrency are possible.\n\n" +
            "**Complexity.** Time `O(n log n)` for the two sorts; the sweep is `O(n)`. Space `O(n)` for the two arrays.\n\n" +
            "**Interview mindset.** 'Maximum simultaneous X' — concurrent calls, cars on a road, rooms in use — is the signal for this chronological event-counting sweep: turn each entity into a `+1`/`-1` event and track the running peak.",
          rcs:
            "class Solution:\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:\n" +
            "        if not intervals:\n" +
            "            return 0\n" +
            "        starts = sorted(i[0] for i in intervals)  # All start times, sorted.\n" +
            "        ends = sorted(i[1] for i in intervals)    # All end times, sorted.\n" +
            "        n = len(intervals)\n" +
            "        s = e = 0                                 # Pointers into starts / ends.\n" +
            "        rooms = 0\n" +
            "        max_rooms = 0\n" +
            "        while s < n:\n" +
            "            if starts[s] < ends[e]:               # Next event is a meeting STARTING.\n" +
            "                rooms += 1                        # Need one more room right now.\n" +
            "                s += 1\n" +
            "                max_rooms = max(max_rooms, rooms) # Track the peak concurrency.\n" +
            "            else:                                 # Next event is a meeting ENDING.\n" +
            "                rooms -= 1                        # A room frees up (tie -> reuse).\n" +
            "                e += 1\n" +
            "        return max_rooms",
          plain:
            "class Solution:\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:\n" +
            "        if not intervals:\n" +
            "            return 0\n" +
            "        starts = sorted(i[0] for i in intervals)\n" +
            "        ends = sorted(i[1] for i in intervals)\n" +
            "        n = len(intervals)\n" +
            "        s = e = 0\n" +
            "        rooms = 0\n" +
            "        max_rooms = 0\n" +
            "        while s < n:\n" +
            "            if starts[s] < ends[e]:\n" +
            "                rooms += 1\n" +
            "                s += 1\n" +
            "                max_rooms = max(max_rooms, rooms)\n" +
            "            else:\n" +
            "                rooms -= 1\n" +
            "                e += 1\n" +
            "        return max_rooms"
        }
      ],
      patternRecognition: [
        "'Minimum rooms / resources / machines' for a set of overlapping intervals.",
        "The answer is the PEAK number of intervals overlapping at any single point in time.",
        "Two toolkits: min-heap of end times, or sweep line over separately-sorted starts and ends."
      ],
      interviewRecall: [
        "Heap: sort by start, pop a freed room if heap[0] <= start, always push the current end; heap size = rooms.",
        "Sweep: sort starts and ends separately; count +1 on a start, -1 on an end; peak count is the answer.",
        "Tie handling: a room freed at time t can host a meeting starting at t (use <= to pop / < to add)."
      ]
    }
  ]);
})();
