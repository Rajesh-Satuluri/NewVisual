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
            "**A. What is asked.** Drop one new interval into an already-sorted, non-overlapping list and re-establish those two properties (sorted, non-overlapping).\n\n" +
            "**B. Naive idea.** Append the new interval, sort everything (`O(n log n)`), then run the Merge-Intervals routine. Correct, but it throws away the gift the problem hands you: the input is ALREADY sorted.\n\n" +
            "**D. Key observation.** Because the list is sorted by start, every existing interval falls into exactly one of three zones relative to `newInterval`:\n" +
            "1. **Entirely BEFORE** it: the interval ends before `newInterval` starts (`interval.end < newInterval.start`). Copy it as-is.\n" +
            "2. **OVERLAPPING** it: not fully before and not fully after. Absorb it into `newInterval` by widening: `newInterval.start = min(...)`, `newInterval.end = max(...)`.\n" +
            "3. **Entirely AFTER** it: the interval starts after `newInterval` ends (`interval.start > newInterval.end`). Everything from here on is copied as-is.\n\n" +
            "**E. Pattern.** A one-pass merge that only ever compares against the (growing) `newInterval`, so no repeated sorting is needed.\n\n" +
            "**I. Step by step.**\n" +
            "1. Copy all intervals that end before `newInterval` starts.\n" +
            "2. While the current interval overlaps `newInterval` (`interval.start <= newInterval.end`), grow `newInterval` to cover both. Then push the merged `newInterval` once.\n" +
            "3. Copy the remaining intervals.\n\n" +
            "**J. Why correct.** The three zones are contiguous because the list is sorted: all 'before' intervals come first, then a (possibly empty) run of overlapping ones, then all 'after' intervals. Merging the middle run into one interval keeps the whole result sorted and non-overlapping.\n\n" +
            "**K/L. Complexity.** Each interval is examined once → `O(n)` time; the output list is `O(n)` space.\n\n" +
            "**M. Interview mindset.** When the input is pre-sorted, resist re-sorting — a single positional sweep is the intended, faster solution.",
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
            "**A. What is asked.** Collapse any group of overlapping intervals into a single covering interval and return the minimal disjoint set.\n\n" +
            "**B. Brute force.** Repeatedly scan all pairs, merge any that overlap, and repeat until nothing changes — `O(n^2)` or worse and awkward to code.\n\n" +
            "**D. Key observation.** If we **sort by start**, then any interval that overlaps a given one must come immediately after it. So overlaps are always between *adjacent* intervals in sorted order — we never need to look back further than the last interval we committed to the answer.\n\n" +
            "**E. Pattern / data structure.** Sort, then sweep left to right keeping a single 'current accumulated' interval (the last one in the result list).\n\n" +
            "**F. Why it works.** After sorting, let `last` be the most recent merged interval. For the next interval `cur`, we already know `last.start <= cur.start`. They overlap iff `cur.start <= last.end`. If so, extend `last.end = max(last.end, cur.end)` (the start stays, since `last.start` is the smaller). If not, `cur` opens a brand-new block and becomes the new `last`.\n\n" +
            "**G/H. What we track.** The result list; its final element is the interval currently being extended.\n\n" +
            "**I. Step by step.**\n" +
            "1. Sort `intervals` by start.\n" +
            "2. Put the first interval in `result`.\n" +
            "3. For each subsequent interval: if its start <= result's last end, merge by taking `max` of the ends; otherwise append it as a new block.\n\n" +
            "**J. Why correct.** Sorting guarantees we meet the intervals of any overlapping cluster consecutively, so a single running interval captures the whole cluster before a gap ends it. No overlap can be 'stranded' earlier in the list.\n\n" +
            "**K/L. Complexity.** Sorting dominates: `O(n log n)` time; `O(n)` for the output (or `O(log n)`–`O(n)` for the sort's own scratch space).\n\n" +
            "**M. Interview mindset.** 'Merge / combine overlapping ranges' → sort by start, then compare each to the last kept interval. Memorize this loop; it is reused everywhere.",
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
            "**A. What is asked.** Delete as few intervals as possible so none of the survivors overlap. Equivalently: **keep the maximum number of mutually non-overlapping intervals**, then removals = total − kept.\n\n" +
            "**B. Why not sort by start.** Sorting by start can trip you up: a very long interval could start earliest yet block many short ones. The quantity that matters for packing more intervals afterward is how *early each one finishes*.\n\n" +
            "**D. Key greedy observation.** Among intervals competing for the same space, always keep the one that **ends earliest**. Finishing as early as possible leaves the most room on the right for future intervals, which can never hurt and often helps.\n\n" +
            "**E. Pattern.** Classic greedy 'activity selection'. Sort by end time; sweep once; whenever the next interval starts before the last kept interval ends, it overlaps — drop it (count a removal). Otherwise keep it and advance the 'last end' pointer.\n\n" +
            "**Greedy exchange argument (why it is optimal).** Suppose an optimal solution keeps some interval X where our greedy would have kept Y, the earliest-finishing compatible interval, and `Y.end <= X.end`. Swap X for Y in the optimal set. Y finishes no later than X, so it cannot conflict with anything scheduled after X — the swapped set is still valid and just as large. Repeating this exchange transforms any optimal solution into the greedy one without shrinking it, so the greedy choice is optimal.\n\n" +
            "**G/H. What we track.** `prev_end` = end of the last interval we decided to keep; `removals` = how many we dropped.\n\n" +
            "**I. Step by step.**\n" +
            "1. Sort by end ascending.\n" +
            "2. Initialize `prev_end = -infinity`, `removals = 0`.\n" +
            "3. For each `[start, end]`: if `start >= prev_end` it does not overlap the last kept one — keep it, set `prev_end = end`. Otherwise it overlaps — increment `removals` (drop it, `prev_end` unchanged).\n\n" +
            "**J. Why correct.** By always retaining the earliest finisher we maximize the count of survivors; removals is then forced to be minimal.\n\n" +
            "**K/L. Complexity.** Sorting → `O(n log n)` time, `O(1)` extra space beyond the sort.\n\n" +
            "**M. Interview mindset.** 'Minimum removals to make disjoint' or 'maximum non-overlapping intervals' → greedy by END time. Note `start >= prev_end` (strict endpoints touch and are allowed).",
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
            "**A. What is asked.** Can all meetings be attended by one person? That is true exactly when no two meetings overlap.\n\n" +
            "**B. Brute force.** Compare every pair of meetings for overlap — `O(n^2)`. Correct but unnecessary.\n\n" +
            "**D. Key observation.** After **sorting by start**, if any conflict exists it must be between two *consecutive* meetings. Why: if meeting A (earlier start) conflicts with some later meeting C, then A also conflicts with the meeting immediately after A in sorted order (that neighbor starts no later than C and A extends past it). So checking neighbors is enough.\n\n" +
            "**E. Pattern.** Sort, then a single sweep comparing each meeting's start to the previous meeting's end.\n\n" +
            "**I. Step by step.**\n" +
            "1. Sort by start.\n" +
            "2. For i from 1 to n−1: if `intervals[i].start < intervals[i-1].end`, a meeting begins before the previous one ends → return `false`.\n" +
            "3. If no such pair, return `true`.\n\n" +
            "**J. Why correct.** Sorting guarantees any overlapping pair becomes adjacent, so a single adjacent check catches every conflict; the strict `<` lets touching endpoints pass.\n\n" +
            "**K/L. Complexity.** Sorting dominates → `O(n log n)` time, `O(1)` extra space.\n\n" +
            "**M. Interview mindset.** 'Can one person do all of these?' = 'are these intervals pairwise disjoint?' → sort by start and scan neighbors. This is the warm-up to Meeting Rooms II.",
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
            "**A. What is asked.** The fewest rooms = the maximum number of meetings that are ever simultaneously in progress.\n\n" +
            "**B. Naive idea.** For every meeting, count how many others overlap it — `O(n^2)`. We can do better.\n\n" +
            "**D. Key observation.** Process meetings in order of **start time**. A min-heap holding the **end times** of meetings still occupying a room lets us ask, in `O(log n)`, 'has the earliest-finishing ongoing meeting already ended?' If it has, that room is free and can be reused.\n\n" +
            "**E. Pattern / data structure.** A min-heap keyed on end time = a priority queue of 'when does a room next free up'. Its size at any moment is the number of rooms in use; the maximum size is the answer.\n\n" +
            "**I. Step by step.**\n" +
            "1. Sort meetings by start time.\n" +
            "2. For each meeting `[start, end]`: if the heap is non-empty and its smallest end `<= start`, that room is free — pop it (reuse). Then push `end`.\n" +
            "3. The heap's size after each push is the rooms currently needed; the running maximum (equivalently, the final heap size given this reuse rule) is the answer. Popping at most one before each push means heap size grows only when no room is free.\n\n" +
            "**J. Why correct.** Sorting by start means when we consider a meeting, every room that could possibly be free has already had its end time pushed. Freeing the earliest-ending room first is optimal because it is the one most likely to have finished.\n\n" +
            "**K/L. Complexity.** Sort `O(n log n)` plus `n` heap operations at `O(log n)` → `O(n log n)` time, `O(n)` space for the heap.\n\n" +
            "**M. Interview mindset.** 'Minimum resources for overlapping intervals' → min-heap of end times, or the sweep-line below.",
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
            "**D. Key observation.** Rooms needed = the peak number of meetings in progress at once. If we split every meeting into two events — a `+1` at its start and a `−1` at its end — then sweeping through time and keeping a running sum gives the concurrency at each instant. The maximum that running sum ever reaches is the answer.\n\n" +
            "**E. Pattern.** Extract the starts and the ends into two SEPARATE arrays, sort each. Walk them with two pointers: whenever the next start is strictly before the next end, a meeting begins and rooms go up; otherwise a meeting has ended and a room frees.\n\n" +
            "**F. Why the `<` (not `<=`) matters.** If a start equals an end (`start_i == end_j`), the ending meeting frees its room exactly in time for the starting one, so we should process the END first (no new room). Using `if start < end: rooms += 1 else: free` handles ties by advancing the end pointer, correctly reusing the room.\n\n" +
            "**I. Step by step.**\n" +
            "1. `starts = sorted(all start times)`, `ends = sorted(all end times)`.\n" +
            "2. Two pointers `s`, `e` at 0; `rooms = 0`, `max_rooms = 0`.\n" +
            "3. While `s < n`: if `starts[s] < ends[e]`, a meeting starts → `rooms += 1`, `s += 1`, update `max_rooms`. Else a meeting ended → `rooms -= 1`, `e += 1`.\n" +
            "4. Return `max_rooms`.\n\n" +
            "**J. Why correct.** Sorting starts and ends independently is legitimate because we only care about *how many* meetings are open at each time, not which specific meeting owns which room. The running counter is exactly the concurrency; its peak is the minimum rooms.\n\n" +
            "**K/L. Complexity.** Two sorts → `O(n log n)` time, `O(n)` space for the two arrays.\n\n" +
            "**M. Interview mindset.** This 'chronological ordering / event counting' framing generalizes to any 'maximum simultaneous X' problem (max concurrent calls, cars on a road, etc.).",
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
