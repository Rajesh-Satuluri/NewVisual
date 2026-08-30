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
            "**What it asks.** Drop one new interval into an already-sorted, non-overlapping list and return the list still sorted and still non-overlapping, merging `newInterval` with any intervals it happens to touch or overlap.\n\n" +
            "**Why the naive idea fails.** The tempting approach is to append `newInterval`, sort the whole thing (`O(n log n)`), then run the full Merge-Intervals routine. It is correct, but it throws away the gift the problem hands you: the input is ALREADY sorted by start and already non-overlapping, so the re-sort is pure wasted work and needlessly pushes an `O(n)` task up to `O(n log n)`.\n\n" +
            "**Key Idea.** Because the list is sorted by start, every existing interval falls into exactly one of three CONTIGUOUS zones relative to `newInterval`: entirely BEFORE it (the interval ends before `newInterval` starts, `interval.end < newInterval.start`), OVERLAPPING it (neither fully before nor fully after), or entirely AFTER it (the interval starts after `newInterval` ends, `interval.start > newInterval.end`). The sort is what guarantees these zones never interleave — a 'before' interval can never appear after an 'after' interval — so a single linear sweep that only ever compares against the one growing `newInterval` handles all three in order, with no repeated sorting.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. **Before zone.** Copy every interval that ends strictly before `newInterval` starts (`interval.end < newInterval.start`) straight into the result; none of them can overlap.\n" +
            "2. **Overlap zone.** While the current interval starts at or before `newInterval` ends (`interval.start <= newInterval.end`), absorb it by widening `newInterval`: set its start to the `min` of the two starts and its end to the `max` of the two ends.\n" +
            "3. Push the fully merged `newInterval` exactly once, in its correct sorted slot.\n" +
            "4. **After zone.** Copy every remaining interval as-is.\n\n" +
            "**Why it works.** Sorting by start makes the three zones contiguous: all the 'before' intervals come first, then a (possibly empty) run of overlapping ones, then all the 'after' intervals. Within the overlap run, taking `min` of starts and `max` of ends collapses the whole run into one widened interval that exactly covers it; because the run is contiguous, no overlapping interval can be stranded outside it. The result is therefore still sorted (we emit the before-zone, then the merged interval, then the after-zone, in order) and still non-overlapping, and each interval is placed exactly once — an `O(n)` pass.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching endpoints count as overlap here (`[1,3]` and `[3,5]` merge into `[1,5]`), so the overlap test uses `<=`, not `<`; the before-zone test correspondingly uses strict `<`.\n" +
            "- Empty input, or a `newInterval` that lands entirely before or after everything, must still work — the overlapping run is simply empty and `newInterval` is pushed in its sorted position.\n" +
            "- A `newInterval` fully contained in an existing one leaves that interval effectively unchanged after the `min`/`max`; never overwrite an edge without comparing.\n\n" +
            "**Complexity.** Time `O(n)` — each interval is examined exactly once across the three phases. Space `O(n)` for the output list.\n\n" +
            "**Interview mindset.** When the input is already sorted, resist re-sorting — a single positional sweep past the insertion point is the intended, faster solution. The three-zone split (before / overlapping / after) is the reusable idea.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of [start, end] pairs plus one new pair and return the merged list.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls insert on it.\n\n" +
            "    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:  # Splice newInterval into an already-sorted, non-overlapping list.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        result = []  # Output list we build left to right; it stays sorted and non-overlapping by construction.\n" +
            "                     # State: result holds every interval already placed in its final position.\n" +
            "                     # Execution flow: Python continues to initialize the scan pointer.\n\n" +
            "        i = 0  # Cursor into intervals; the input is already sorted by start, so one forward pass suffices.\n" +
            "               # Why no sort: the problem guarantees intervals is sorted and non-overlapping, so re-sorting would waste O(n log n).\n" +
            "               # State: i is the index of the next interval we have not yet classified.\n\n" +
            "        n = len(intervals)  # Cache the length so len is not recomputed on every loop turn.\n" +
            "                            # Execution flow: Python enters the first while loop.\n\n" +
            "        # ==================== PHASE 2: INTERVALS ENTIRELY BEFORE newInterval ====================\n\n" +
            "        while i < n and intervals[i][1] < newInterval[0]:  # This interval ENDS before newInterval STARTS.\n" +
            "                                                           # Why strict <: if the end equals the new start they touch and must merge, which phase 3 handles.\n" +
            "                                                           # Loop invariant: every interval before i has been copied and lies fully left of newInterval.\n" +
            "            result.append(intervals[i])  # No overlap possible; copy this interval unchanged.\n" +
            "                                         # Why-safe: sorted order means all later intervals start even later, so none of them precede this one.\n" +
            "            i += 1  # Advance to the next candidate.\n" +
            "                    # Execution flow: back to the while header to re-test the new intervals[i].\n\n" +
            "        # ==================== PHASE 3: INTERVALS THAT OVERLAP newInterval ====================\n\n" +
            "        while i < n and intervals[i][0] <= newInterval[1]:  # This interval STARTS at or before newInterval ENDS -> overlap or touch.\n" +
            "                                                            # Why <=: touching endpoints count as overlap here ([1,3] and [3,5] merge into [1,5]).\n" +
            "                                                            # Why this is the only overlap test: everything left of here already ended before newInterval began.\n" +
            "                                                            # Loop invariant: newInterval has absorbed every overlapping interval seen so far.\n" +
            "            newInterval[0] = min(newInterval[0], intervals[i][0])  # Widen the LEFT edge to the smaller of the two starts.\n" +
            "                                                                   # Why min: the merged interval must cover both, so its start is the minimum start.\n" +
            "            newInterval[1] = max(newInterval[1], intervals[i][1])  # Widen the RIGHT edge to the larger of the two ends.\n" +
            "                                                                   # Why max: a fully contained interval must not shrink newInterval, so take the larger end.\n" +
            "            i += 1  # Move past the absorbed interval.\n" +
            "                    # State change: newInterval now spans a strictly wider range; the overlapping run stays contiguous thanks to sorting.\n\n" +
            "        result.append(newInterval)  # Push the fully grown newInterval exactly once, in its correct sorted slot.\n" +
            "                                    # Why-safe: sorting makes the overlapping intervals a single contiguous block, so one widened interval replaces them all.\n\n" +
            "        # ==================== PHASE 4: INTERVALS ENTIRELY AFTER newInterval ====================\n\n" +
            "        while i < n:  # Everything left starts strictly after newInterval ends.\n" +
            "                      # Why no overlap test is needed: phase 3 stopped exactly when intervals[i][0] > newInterval[1].\n" +
            "            result.append(intervals[i])  # Copy the trailing intervals unchanged.\n" +
            "            i += 1  # Advance to the next interval.\n" +
            "                    # Execution flow: back to the while header until the input is exhausted.\n\n" +
            "        # ==================== PHASE 5: RETURN THE RESULT ====================\n\n" +
            "        return result  # result is sorted, non-overlapping, and contains newInterval merged into place.",
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
            "**What it asks.** Collapse every group of overlapping intervals into a single covering interval and return the minimal set of disjoint intervals that exactly covers the input. The input is NOT sorted, so sorting is part of the job.\n\n" +
            "**Why the naive idea fails.** Brute force repeatedly scans all pairs, merges any that overlap, and repeats until nothing changes. That is `O(n^2)` or worse and awkward to code, because overlaps can chain arbitrarily (A overlaps B overlaps C) and a single pass over unsorted data can meet the members of one cluster far apart, missing merges.\n\n" +
            "**Key Idea.** If you **sort by start**, the members of any overlapping cluster become CONSECUTIVE, so an interval can only ever overlap the one immediately before it in sorted order — you never need to look back further than the last interval already committed to the answer. That is what lets you sweep once while keeping a single 'accumulator' interval (the last element of the result list) and extending it in place.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `intervals` by start.\n" +
            "2. Seed the result with the first interval; its last element is the interval currently being extended.\n" +
            "3. For each subsequent interval `[start, end]`, let `last_end` be the end of the result's last interval. If `start <= last_end` they overlap (or touch) — extend only the end via `last.end = max(last_end, end)`. Otherwise there is a gap — append `[start, end]` as a new block.\n\n" +
            "**Why it works — and why sorting by start is the crux.** After sorting, `last.start <= cur.start` always holds, so the general overlap test `a.start <= b.end AND b.start <= a.end` reduces to the single condition `cur.start <= last.end`. Sorting guarantees that all members of an overlapping cluster are met one after another, so a single running interval captures the whole cluster before the first gap ends it — no overlap can be stranded earlier in the list, which is exactly the failure mode of an unsorted scan. The accumulator's start never needs updating because, being the earliest start in its cluster, it is already the minimum; only the end can grow.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching intervals merge here (`[1,4]` and `[4,5]` become `[1,5]`), so the test is `<=`, not `<`.\n" +
            "- A fully contained interval (`[2,3]` inside `[1,4]`) must not shrink the accumulator — take `max` of the ends, never overwrite.\n" +
            "- Merging extends only the end; do not touch the accumulator's start, or you break the sorted invariant.\n\n" +
            "**Complexity.** Time `O(n log n)`, dominated by the sort; the sweep itself is `O(n)`. Space `O(n)` for the output (plus the sort's own `O(log n)`–`O(n)` scratch).\n\n" +
            "**Interview mindset.** 'Merge / combine overlapping ranges' or 'return the minimal set of disjoint intervals' → sort by start, then compare each interval to the last kept one. Memorize this loop; nearly every other interval problem builds on it.",
          rcs:
            "from typing import List  # List lets the type hints say we take and return a list of [start, end] pairs.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls merge on it.\n\n" +
            "    def merge(self, intervals: List[List[int]]) -> List[List[int]]:  # Collapse overlapping intervals into the minimal disjoint set.\n\n" +
            "        # ==================== PHASE 1: SORT BY START ====================\n\n" +
            "        intervals.sort(key=lambda x: x[0])  # Sort by START so overlapping intervals become adjacent.\n" +
            "                                            # Why this key: after sorting, only the last kept interval can overlap the next, so overlaps are always between neighbors.\n" +
            "                                            # State: intervals is now in nondecreasing start order.\n" +
            "                                            # Execution flow: Python continues to seed the accumulator.\n\n" +
            "        # ==================== PHASE 2: SWEEP AND MERGE ====================\n\n" +
            "        merged = [intervals[0]]  # Seed the result with the first interval; merged[-1] is the accumulator we extend.\n" +
            "                                 # State: merged holds the disjoint intervals finalized so far, plus one in-progress accumulator at the end.\n\n" +
            "        for start, end in intervals[1:]:  # Sweep the remaining intervals in sorted order.\n" +
            "                                          # Loop invariant: merged[-1] is the widest interval covering the current cluster so far.\n" +
            "                                          # Execution flow: after each interval Python advances to the next (start, end).\n\n" +
            "            last_end = merged[-1][1]  # End of the interval we are currently extending.\n" +
            "                                      # Why only the end matters: sorting guarantees merged[-1] starts no later than start, so the start can never move.\n\n" +
            "            if start <= last_end:  # Does this interval start at or before the accumulator ends?\n" +
            "                                   # Why <=: touching counts as overlap here ([1,4] and [4,5] -> [1,5]).\n" +
            "                merged[-1][1] = max(last_end, end)  # Overlap: extend only the RIGHT edge, taking the larger end.\n" +
            "                                                    # Why max: a fully contained interval ([2,3] in [1,4]) must not shrink the accumulator.\n" +
            "            else:  # start > last_end: a genuine gap separates this interval from the accumulator.\n" +
            "                merged.append([start, end])  # Start a brand-new block; it becomes the new accumulator.\n" +
            "                                             # Why-safe: sorted order means every later interval starts even later, so the closed block can never be reopened.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return merged  # merged is sorted, disjoint, and exactly covers the input.",
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
            "**What it asks.** Delete as few intervals as possible so none of the survivors overlap. Equivalently, **keep the maximum number of mutually non-overlapping intervals**; then removals = total − kept. This is the classic interval-scheduling / activity-selection problem.\n\n" +
            "**Why the naive idea fails.** Sorting by start feels natural but misleads: a very long interval could start earliest yet block many short ones that could otherwise coexist, so a start-ordered greedy keeps the wrong interval. Trying every subset to find the largest non-overlapping one is exponential. The quantity that actually governs how many more intervals you can pack in is how *early each one finishes*, not when it starts.\n\n" +
            "**Key Idea — why sort by END.** Among intervals competing for the same space, always keep the one that **ends earliest**. Finishing as early as possible leaves the maximum room on the right for future intervals, which can never hurt and often helps. Sorting by end time makes this choice trivial: sweep left to right, and the first compatible interval you meet is by definition the earliest finisher, so you keep it and measure everyone else against its end.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort by end time, ascending.\n" +
            "2. Initialize `prev_end` to `-infinity` (end of the last interval kept) and `removals` to `0`.\n" +
            "3. For each `[start, end]`: if `start >= prev_end` it does not overlap the last kept interval — keep it and set `prev_end = end`. Otherwise it overlaps — increment `removals` and leave `prev_end` unchanged, dropping the later finisher.\n\n" +
            "**Why it works.** The exchange argument proves optimality. Suppose an optimal solution keeps some interval X where greedy would keep Y, the earliest-finishing compatible interval, with `Y.end <= X.end`. Swap X for Y: because Y finishes no later than X, it cannot conflict with anything scheduled after X, so the swapped set is still valid and just as large. Repeating this exchange transforms any optimal solution into the greedy one without shrinking it, so always retaining the earliest finisher maximizes survivors and forces removals to be minimal. Sorting by end is precisely what makes 'the next compatible interval is the earliest finisher' true at every step.\n\n" +
            "**Common Gotchas.**\n" +
            "- Touching endpoints are NOT overlaps here, so the keep test uses `>=` (`[1,2]` and `[2,3]` can both stay).\n" +
            "- Sort by END, not start — sorting by start gives the wrong answer on the long-interval case (`[1,100]` would be kept and block everything).\n" +
            "- Initialize `prev_end` to `-infinity` so the very first interval is always kept.\n\n" +
            "**Complexity.** Time `O(n log n)` for the sort; the single sweep is `O(n)`. Space `O(1)` beyond the sort.\n\n" +
            "**Interview mindset.** 'Minimum removals to make disjoint' or 'maximum count of non-overlapping intervals' → greedy by earliest END time. It is the interval-scheduling / activity-selection signature.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of [start, end] pairs and return an int count.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls eraseOverlapIntervals on it.\n\n" +
            "    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:  # Return the fewest intervals to remove so the rest are disjoint.\n\n" +
            "        # ==================== PHASE 1: SORT BY END ====================\n\n" +
            "        intervals.sort(key=lambda x: x[1])  # Sort by END time so the earliest finisher comes first.\n" +
            "                                            # Why the end key: keeping the earliest-ending interval leaves the most room on the right for future picks.\n" +
            "                                            # Why NOT start: a long interval could start first yet block many short ones that could coexist.\n" +
            "                                            # State: intervals is now in nondecreasing end order.\n\n" +
            "        # ==================== PHASE 2: GREEDILY KEEP EARLIEST FINISHERS ====================\n\n" +
            "        removals = 0  # Count of intervals we must drop; total minus kept.\n" +
            "                      # State: removals equals the number of overlaps resolved so far.\n\n" +
            "        prev_end = float('-inf')  # End of the last interval we chose to KEEP; -inf so the first interval is always kept.\n" +
            "                                  # State: prev_end is the right boundary of the current non-overlapping selection.\n\n" +
            "        for start, end in intervals:  # Sweep in earliest-end-first order.\n" +
            "                                      # Loop invariant: prev_end is the end of the earliest-finishing compatible interval kept so far.\n" +
            "                                      # Execution flow: after each interval Python advances to the next (start, end).\n\n" +
            "            if start >= prev_end:  # Does this interval start at or after the last kept one ends?\n" +
            "                                   # Why >=: touching endpoints do NOT overlap here ([1,2] and [2,3] can both stay).\n" +
            "                prev_end = end  # No overlap: KEEP it and advance the boundary to its end.\n" +
            "                                # Why-safe: sorted by end, this is the earliest finisher remaining, so keeping it is the greedy-optimal choice.\n" +
            "            else:  # start < prev_end: this interval overlaps the last kept one.\n" +
            "                removals += 1  # Drop THIS later-finisher and keep the earlier end (prev_end unchanged).\n" +
            "                               # Why drop this one: its end is >= prev_end (sorted), so keeping prev_end can only leave more room for later intervals.\n\n" +
            "        # ==================== PHASE 3: RETURN ====================\n\n" +
            "        return removals  # The minimum number of removals that leaves the survivors non-overlapping.",
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
            "**Key Idea — why sort by start.** After **sorting by start**, any conflict must be between two *consecutive* meetings. Here is why: if meeting A (with the earlier start) conflicts with some later meeting C, then A also conflicts with the meeting B immediately after it in sorted order, because B starts no later than C (sorted) and A already extends past B's start. So a conflict anywhere implies a conflict between neighbors, and checking only adjacent pairs is enough to catch every collision.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort the meetings by start.\n" +
            "2. For `i` from 1 to n−1, compare `intervals[i].start` with `intervals[i-1].end`.\n" +
            "3. If `intervals[i].start < intervals[i-1].end`, a meeting begins before the previous one ends → return `false`.\n" +
            "4. If no such pair is found, return `true`.\n\n" +
            "**Why it works.** Sorting guarantees that any overlapping pair becomes adjacent, so a single adjacent scan is sufficient to find a conflict if one exists. The strict `<` lets meetings that merely touch at an endpoint (`[1,5]` then `[5,10]`) pass as non-conflicting, since one ends exactly as the next begins.\n\n" +
            "**Common Gotchas.**\n" +
            "- Meetings that touch (`[1,5]` then `[5,10]`) do NOT conflict, so use strict `<`, not `<=`.\n" +
            "- An empty list returns `true` — the loop never runs and there is nothing to conflict.\n" +
            "- Do not forget to sort first; scanning neighbors in the original order misses conflicts between meetings that are far apart in the input.\n\n" +
            "**Complexity.** Time `O(n log n)`, dominated by the sort; the scan is `O(n)`. Space `O(1)` extra.\n\n" +
            "**Interview mindset.** 'Can one person do all of these?' = 'are these intervals pairwise disjoint?' → sort by start and scan neighbors. This is the warm-up to Meeting Rooms II.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of [start, end] pairs and return a bool.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls canAttendMeetings on it.\n\n" +
            "    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:  # Return True iff no two meetings overlap.\n\n" +
            "        # ==================== PHASE 1: SORT BY START ====================\n\n" +
            "        intervals.sort(key=lambda x: x[0])  # Sort by START so any conflict falls between adjacent meetings.\n" +
            "                                            # Why this key: if an earlier meeting conflicts with any later one, it also conflicts with its immediate neighbor.\n" +
            "                                            # State: intervals is now in nondecreasing start order.\n\n" +
            "        # ==================== PHASE 2: CHECK ADJACENT PAIRS ====================\n\n" +
            "        for i in range(1, len(intervals)):  # Compare each meeting with the one directly before it.\n" +
            "                                            # Loop invariant: no conflict has been found among meetings 0..i-1.\n" +
            "                                            # Execution flow: after each i Python advances to the next index.\n\n" +
            "            if intervals[i][0] < intervals[i - 1][1]:  # Does this meeting START before the previous one ENDS?\n" +
            "                                                       # Why strict <: touching meetings ([1,5] then [5,10]) do NOT conflict, so equality is allowed.\n" +
            "                return False  # Overlap found: one person cannot attend both, so not all meetings.\n" +
            "                              # Execution flow: return ends canAttendMeetings immediately.\n\n" +
            "        # ==================== PHASE 3: NO CONFLICT ====================\n\n" +
            "        return True  # No adjacent overlap anywhere (an empty or single-meeting list also lands here).",
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
            "**Key Idea — the heap top is the next room to free.** Process meetings in order of **start time**, and keep a **min-heap of the end times** of the meetings still occupying a room. The heap's root is therefore the earliest moment any current room becomes free. When a new meeting begins, we ask in `O(log n)`: 'has the earliest-finishing ongoing meeting already ended (`heap[0] <= start`)?' If yes, that room is free — pop it and reuse it instead of allocating a new one. Either way we push this meeting's end time. The heap's size is exactly the number of rooms in use, so its peak (its final size, since we pop at most one per push) is the answer.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Return `0` immediately for empty input.\n" +
            "2. Sort the meetings by start time so we consider them chronologically.\n" +
            "3. Keep a min-heap `heap` holding the end times of meetings currently using a room.\n" +
            "4. For each meeting `[start, end]`: if the heap is non-empty and its smallest end (`heap[0]`) is `<= start`, the earliest-finishing room is already free — pop it to reuse it. Then push `end` for this meeting.\n" +
            "5. Because we pop at most one room before each push, the heap grows only when no room was free; the final heap size is the minimum rooms needed.\n\n" +
            "**Why it works — and why sorting by start matters.** Sorting by start guarantees that when we consider a meeting, every room that could possibly be free has already had its end time pushed onto the heap (all earlier-starting meetings are already processed). Freeing the earliest-ending room first is optimal: if the earliest finisher has not ended by `start`, then no room has, so we genuinely need a new one; if it has ended, reusing it is always safe because a room is fungible. Thus the heap size tracks true concurrency at every step, and its peak is the fewest rooms that suffice.\n\n" +
            "**Common Gotchas.**\n" +
            "- A room frees exactly at its end time, so a meeting starting at `t` may reuse a room ending at `t` — the reuse test is `heap[0] <= start`, not strict `<`.\n" +
            "- Handle the empty input by returning `0` before touching the heap.\n" +
            "- The heap must be keyed on END time, and you must sort the meetings by START — mixing these up breaks the reuse logic.\n\n" +
            "**Complexity.** Time `O(n log n)`: the sort plus `n` heap operations each `O(log n)`. Space `O(n)` for the heap in the worst case (all meetings overlap).\n\n" +
            "**Interview mindset.** 'Minimum rooms / machines / resources for a set of overlapping intervals' → a min-heap of end times that models 'when does the next resource free up'. The same shape solves any 'reuse the earliest-freed resource' problem.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of [start, end] pairs and return an int room count.\n" +
            "import heapq  # heapq is a binary min-heap; heap[0] is always the smallest value, here the earliest end time.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls minMeetingRooms on it.\n\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:  # Return the peak number of simultaneous meetings = rooms needed.\n\n" +
            "        # ==================== PHASE 1: HANDLE EMPTY INPUT ====================\n\n" +
            "        if not intervals:  # No meetings at all?\n" +
            "            return 0  # Zero rooms needed; also guards heap[0] below from an empty heap on the first meeting.\n\n" +
            "        # ==================== PHASE 2: SORT BY START ====================\n\n" +
            "        intervals.sort(key=lambda x: x[0])  # Process meetings in chronological START order.\n" +
            "                                            # Why start order: when we reach a meeting, every possibly-free room has already had its end time pushed.\n" +
            "                                            # State: intervals is now in nondecreasing start order.\n\n" +
            "        heap = []  # Min-heap of END times of meetings currently holding a room; its SIZE is the rooms in use.\n" +
            "                   # State: heap[0], when present, is the earliest time some current room frees up.\n\n" +
            "        # ==================== PHASE 3: ASSIGN OR REUSE ROOMS ====================\n\n" +
            "        for start, end in intervals:  # Walk meetings earliest-start first.\n" +
            "                                      # Loop invariant: heap holds the end times of every meeting still in progress at this point.\n" +
            "                                      # Execution flow: after each meeting Python advances to the next (start, end).\n\n" +
            "            if heap and heap[0] <= start:  # Has the earliest-ending ongoing meeting already finished by the time this one starts?\n" +
            "                                           # Why <=: a room frees exactly at its end time, so a meeting starting at t can reuse a room ending at t.\n" +
            "                heapq.heappop(heap)  # Yes: that room is free -> pop it so we REUSE it instead of allocating a new one.\n" +
            "                                     # Why-safe: if the earliest finisher has not ended, no room has, so we truly would need a new room.\n\n" +
            "            heapq.heappush(heap, end)  # This meeting now occupies a room until 'end'.\n" +
            "                                       # State change: heap grows only when nothing was popped, i.e. only when no room was free.\n\n" +
            "        # ==================== PHASE 4: RETURN ====================\n\n" +
            "        return len(heap)  # Because we pop at most once per push, the final heap size is the peak concurrency = minimum rooms.",
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
            "**Key Idea — decouple starts from ends.** Split every meeting into two events: a `+1` at its start and a `-1` at its end. Sweeping through time while keeping a running sum of these events gives the number of meetings open at each instant, and its maximum is the answer. The crucial insight is that we do not need to keep starts and ends paired — concurrency at a moment depends only on *how many* meetings have begun but not yet ended, never on *which* meeting owns which room. So we can extract all starts into one sorted array and all ends into another, independently, then walk both with two pointers, always processing the next chronological event.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Return `0` for empty input.\n" +
            "2. Build `starts` = all start times sorted, and `ends` = all end times sorted, independently.\n" +
            "3. Set two pointers `s` and `e` to 0, and `rooms = 0`, `max_rooms = 0`.\n" +
            "4. While `s < n`: if `starts[s] < ends[e]`, the next chronological event is a meeting BEGINNING — do `rooms += 1`, advance `s`, and update `max_rooms`. Otherwise the next event is a meeting ENDING — do `rooms -= 1` and advance `e`, freeing a room.\n" +
            "5. When all starts are consumed, `max_rooms` holds the peak concurrency; return it.\n\n" +
            "**Why it works.** Sorting starts and ends separately is valid because concurrency at a time depends only on counts, not identities. The two-pointer walk visits the events in chronological order, and the running counter is exactly the concurrency; its peak is therefore the minimum rooms. We only need to advance `s` to the end because once all meetings have started, concurrency can only fall.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use strict `<` when comparing `starts[s]` with `ends[e]`: if a start equals an end, the ending meeting frees its room exactly in time, so the end must be processed first (no new room). `<=` would over-count.\n" +
            "- Return `0` for empty input before building the arrays.\n" +
            "- The loop condition only needs `s < n`; once starts are exhausted, no further increases to concurrency are possible.\n\n" +
            "**Complexity.** Time `O(n log n)` for the two sorts; the sweep is `O(n)`. Space `O(n)` for the two arrays.\n\n" +
            "**Interview mindset.** 'Maximum simultaneous X' — concurrent calls, cars on a road, rooms in use — is the signal for this chronological event-counting sweep: turn each entity into a `+1`/`-1` event and track the running peak.",
          rcs:
            "from typing import List  # List lets the type hints say we take a list of [start, end] pairs and return an int room count.\n\n\n" +
            "class Solution:  # LeetCode creates an object of this class and calls minMeetingRooms on it.\n\n" +
            "    def minMeetingRooms(self, intervals: List[List[int]]) -> int:  # Return the peak concurrency via a start/end sweep line.\n\n" +
            "        # ==================== PHASE 1: HANDLE EMPTY INPUT ====================\n\n" +
            "        if not intervals:  # No meetings?\n" +
            "            return 0  # Zero rooms; also avoids indexing empty starts/ends arrays.\n\n" +
            "        # ==================== PHASE 2: BUILD SEPARATELY SORTED EVENT ARRAYS ====================\n\n" +
            "        starts = sorted(i[0] for i in intervals)  # All START times, sorted independently of ends.\n" +
            "                                                  # Why decouple: concurrency depends only on HOW MANY meetings are open, not which owns which room.\n" +
            "        ends = sorted(i[1] for i in intervals)    # All END times, sorted independently of starts.\n" +
            "                                                  # State: starts and ends together are the chronological +1 / -1 events.\n\n" +
            "        n = len(intervals)  # Number of meetings = length of each event array.\n\n" +
            "        s = e = 0  # Two pointers: s into starts (+1 events), e into ends (-1 events).\n" +
            "                   # State: s counts meetings begun, e counts meetings ended.\n\n" +
            "        rooms = 0  # Meetings currently in progress (running +1/-1 sum).\n\n" +
            "        max_rooms = 0  # Peak value of rooms seen so far = the answer.\n" +
            "                       # Execution flow: Python enters the sweep loop.\n\n" +
            "        # ==================== PHASE 3: SWEEP EVENTS IN TIME ORDER ====================\n\n" +
            "        while s < n:  # Stop once every meeting has started; concurrency can only fall afterward.\n" +
            "                      # Loop invariant: rooms = (meetings started) - (meetings ended) at the current sweep time.\n" +
            "            if starts[s] < ends[e]:  # Is the next chronological event a meeting STARTING?\n" +
            "                                     # Why strict <: on a tie a meeting ends exactly as another starts, so the end must win (room is reused, no +1).\n" +
            "                rooms += 1  # A meeting begins -> one more room in use right now.\n" +
            "                s += 1  # Consume this start event.\n" +
            "                max_rooms = max(max_rooms, rooms)  # Track the running peak; the maximum concurrency is the answer.\n" +
            "            else:  # starts[s] >= ends[e]: the next event is a meeting ENDING.\n" +
            "                rooms -= 1  # A meeting ends -> a room frees up (a tie frees it just in time for the pending start).\n" +
            "                e += 1  # Consume this end event.\n\n" +
            "        # ==================== PHASE 4: RETURN ====================\n\n" +
            "        return max_rooms  # The highest simultaneous meeting count = minimum rooms required.",
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
    },

    {
      id: "minimum-interval-to-include-each-query",
      lc: 1851,
      title: "Minimum Interval to Include Each Query",
      difficulty: "Hard",
      category: "Intervals",
      link: "https://leetcode.com/problems/minimum-interval-to-include-each-query/",
      meta: { pattern: "Offline Queries + Min-Heap", dataStructure: "Min-Heap", technique: "Sort intervals & queries, sweep" },
      description:
        "You are given a list of `intervals`, where `intervals[i] = [left, right]` covers every integer from `left` to `right` inclusive, and an array of `queries`.\n\n" +
        "For each query `q`, return the **size of the smallest interval** that contains `q` (an interval `[l, r]` contains `q` when `l <= q <= r`), where size is `r - l + 1`. If no interval contains `q`, return `-1` for it. Return the answers in the original query order.",
      constraints: [
        "`1 <= intervals.length <= 10^5`",
        "`1 <= queries.length <= 10^5`",
        "`intervals[i].length == 2`",
        "`1 <= left_i <= right_i <= 10^7`",
        "`1 <= queries[j] <= 10^7`"
      ],
      notes: [
        "Answers must be returned in the ORDER the queries were given, even though it's efficient to PROCESS them sorted.",
        "Interval size is inclusive: `[2, 4]` has size `4 - 2 + 1 = 3`.",
        "This is an 'offline' problem — you're allowed to see all queries up front and reorder your processing."
      ],
      examples: [
        {
          input: "intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5]",
          output: "[3,3,1,4]",
          reasoning: "q=2 → smallest containing is [2,4] (size 3); q=3 → [2,4] (size 3); q=4 → [4,4] (size 1); q=5 → only [3,6] (size 4).",
          visual:
            "```\nintervals (by start):\n [1,4] size4 : #### \n [2,4] size3 :  ###\n [3,6] size4 :   ####\n [4,4] size1 :    #\nquery 4 -> heap holds sizes {4,3,4,1} active -> min = 1\n```"
        },
        {
          input: "intervals = [[2,3],[2,5],[1,8],[20,25]], queries = [2,19,5,22]",
          output: "[2,-1,4,6]",
          reasoning: "q=2 → [2,3] size 2; q=19 → no interval covers 19 → -1; q=5 → [2,5] size 4 (smaller than [1,8] size 8); q=22 → [20,25] size 25-20+1 = 6.",
        },
        {
          input: "intervals = [[1,4]], queries = [1, 4, 5]",
          output: "[4, 4, -1]",
          reasoning: "[1,4] has size 4 and covers 1 and 4 but not 5, so the third query has no containing interval."
        }
      ],
      approaches: [
        {
          name: "Offline sort + Min-Heap by interval size",
          time: "O(n log n + q log q)",
          space: "O(n + q)",
          whenToUse: "The expected solution: answer all queries in one sweep by feeding intervals into a size-ordered heap.",
          logic:
            "**What it asks.** For each query point `q`, report the length of the shortest interval that covers it, or `-1` when none does — returning answers in the original query order.\n\n" +
            "**Why the naive idea fails.** Checking every interval against every query is `O(n * q)` — up to `10^10` operations for `10^5` of each. We need to avoid re-scanning all intervals per query by reusing work across queries.\n\n" +
            "**Key Idea.** Process queries in **increasing order** (offline). Sweep a pointer through the intervals sorted by `start`, and keep a **min-heap keyed by interval size** holding every interval whose `start <= q` (already 'opened'). Before answering `q`, evict any heap-top interval whose `end < q` (it closed before this query). Whatever size sits at the top of the heap is then the smallest interval still covering `q`. Because queries only move forward, an interval opened for one query stays available for later ones, so each interval is pushed and popped at most once.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Sort `intervals` by start; sort a copy of the queries ascending (remembering each query's original index, or use a dict from query value → answer).\n" +
            "2. Keep a pointer `i` into the sorted intervals and an empty min-heap of `(size, end)` pairs, with `size = r - l + 1`.\n" +
            "3. For each query `q` in ascending order: push every interval with `start <= q` onto the heap (advancing `i`).\n" +
            "4. Pop from the heap while its top's `end < q` — those intervals end before `q` and can't contain it.\n" +
            "5. The heap's top `size` (if any) is the answer for `q`; otherwise `-1`. Record it against `q`.\n" +
            "6. After processing, emit answers in the original query order.\n\n" +
            "**Why it works.** When we answer `q`, the heap contains exactly the intervals with `start <= q` and `end >= q` — i.e. all intervals covering `q` — because we've added everything that opened by `q` and removed everything that closed before it. The min-heap by size therefore exposes the smallest covering interval in `O(log n)`. Sorting queries ascending is what makes the 'only-add, lazy-remove' sweep valid: pointers never move backward.\n\n" +
            "**Common Gotchas.**\n" +
            "- Size is INCLUSIVE: `r - l + 1`, not `r - l`.\n" +
            "- Sort the queries but map answers back to their ORIGINAL positions (store the index, or a value→answer dict since equal query values share an answer).\n" +
            "- Eviction compares `end < q` (strict): an interval ending exactly at `q` still contains `q`.\n" +
            "- Removal is lazy — only ever check/pop the heap TOP; don't try to delete arbitrary expired intervals.\n\n" +
            "**Complexity.** Sorting dominates: `O(n log n)` for intervals plus `O(q log q)` for queries; each interval is pushed/popped once → `O(n log n)` heap work. Space `O(n + q)` for the heap and answers.\n\n" +
            "**Interview mindset.** 'Answer many range/point queries, smallest-covering-something' with big inputs is the signal for an OFFLINE sweep: sort the queries, stream the intervals in by start, and let a heap keyed on the quantity you're minimizing surface the answer.",
          rcs:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:\n" +
            "        intervals.sort()                       # Sort by start so we can stream them in.\n" +
            "        heap = []                              # Min-heap of (size, end) for OPEN intervals.\n" +
            "        answer = {}                            # query value -> smallest covering size.\n" +
            "        i = 0\n" +
            "        n = len(intervals)\n" +
            "        for q in sorted(queries):              # Process queries in increasing order.\n" +
            "            while i < n and intervals[i][0] <= q:   # Add every interval opened by q.\n" +
            "                l, r = intervals[i]\n" +
            "                heapq.heappush(heap, (r - l + 1, r))  # size = r - l + 1 (inclusive).\n" +
            "                i += 1\n" +
            "            while heap and heap[0][1] < q:     # Evict intervals that ended before q.\n" +
            "                heapq.heappop(heap)\n" +
            "            answer[q] = heap[0][0] if heap else -1  # Smallest open interval, else -1.\n" +
            "        return [answer[q] for q in queries]    # Re-emit in the original query order.",
          plain:
            "import heapq\n" +
            "\n" +
            "class Solution:\n" +
            "    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:\n" +
            "        intervals.sort()\n" +
            "        heap = []\n" +
            "        answer = {}\n" +
            "        i = 0\n" +
            "        n = len(intervals)\n" +
            "        for q in sorted(queries):\n" +
            "            while i < n and intervals[i][0] <= q:\n" +
            "                l, r = intervals[i]\n" +
            "                heapq.heappush(heap, (r - l + 1, r))\n" +
            "                i += 1\n" +
            "            while heap and heap[0][1] < q:\n" +
            "                heapq.heappop(heap)\n" +
            "            answer[q] = heap[0][0] if heap else -1\n" +
            "        return [answer[q] for q in queries]"
        }
      ],
      patternRecognition: [
        "Many point/range queries against many intervals, minimizing some interval property → offline sweep + heap.",
        "Sorting the queries lets you process them monotonically and reuse a growing heap of active intervals.",
        "A min-heap keyed by the quantity you minimize (here interval size) surfaces the best active candidate."
      ],
      interviewRecall: [
        "Sort intervals by start and queries ascending; keep a min-heap of (size, end) for open intervals.",
        "Per query: push all intervals with start <= q, lazily pop heap tops with end < q, then read heap[0].",
        "Size is r - l + 1 (inclusive); map answers back to the original query order via a value->answer dict."
      ]
    }
  ]);
})();
