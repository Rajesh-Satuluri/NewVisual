/*
 * Blind 75 — Stack
 * =========================================================================
 * Registers the Stack category's problems on the global registry:
 *     window.BLIND75.register("Stack", [ ...problems ]);
 *
 * See data/arrays_hashing.js for the full problem schema and authoring notes.
 * A stack is a LIFO (last-in, first-out) container: you push onto the top and
 * pop from the top. That "most recent thing first" ordering is exactly what you
 * want whenever the freshest unresolved item is the one you must resolve next —
 * matching brackets, undo history, function call frames, and "next greater
 * element" style scans.
 * =========================================================================
 */
(function () {
  window.BLIND75.register("Stack", [
    {
      id: "valid-parentheses",
      lc: 20,
      title: "Valid Parentheses",
      difficulty: "Easy",
      category: "Stack",
      link: "https://leetcode.com/problems/valid-parentheses/",
      meta: { pattern: "Matching Pairs", dataStructure: "Stack", technique: "Push opens, pop on close" },
      description:
        "Given a string `s` containing only the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, decide whether the string is **valid**.\n\n" +
        "A string is valid when: every open bracket is closed by a bracket of the **same type**, brackets close in the **correct order** (the most recently opened is closed first), and **every** close bracket has a matching open bracket.",
      constraints: [
        "`1 <= s.length <= 10^4`",
        "`s` consists only of the characters `'()[]{}'`."
      ],
      notes: [
        "An empty string is considered valid, but the constraints guarantee at least one character.",
        "Nesting must be respected: `\"([)]\"` is invalid because the pairs interleave instead of nesting cleanly."
      ],
      examples: [
        {
          input: 's = "()"',
          output: "true",
          reasoning: "A single pair that opens and immediately closes with the same type."
        },
        {
          input: 's = "()[]{}"',
          output: "true",
          reasoning: "Three independent pairs, each opened and closed correctly in sequence."
        },
        {
          input: 's = "(]"',
          output: "false",
          reasoning: "The '(' is closed by a ']' of the wrong type, so the pair does not match."
        },
        {
          input: 's = "([)]"',
          output: "false",
          reasoning: "The brackets interleave. When ')' arrives, the most recent open is '[', not '(', so ordering is violated.",
          visual:
            "```\nread '('  push        stack: (\nread '['  push        stack: ( [\nread ')'  top is '[' \u2260 match for ')'  -> INVALID\n```"
        },
        {
          input: 's = "{[]}"',
          output: "true",
          reasoning: "Properly nested: '{' then '[' then ']' closes the '[', then '}' closes the '{'.",
          visual:
            "```\nread '{'  push        stack: {\nread '['  push        stack: { [\nread ']'  pop '[' \u2713   stack: {\nread '}'  pop '{' \u2713   stack: (empty)  -> VALID\n```"
        }
      ],
      approaches: [
        {
          name: "Stack of open brackets",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The canonical answer for any 'are these brackets/tags balanced and correctly nested?' question.",
          logic:
            "**A. What is being asked?** Decide if the brackets are balanced *and* correctly nested \u2014 same type on each side, and closed in the reverse order they were opened.\n\n" +
            "**B. Why a counter is not enough.** Just counting opens vs closes would accept `\"([)]\"`, because the totals balance. The problem is about *order*, not just counts, so we need to know which specific bracket is still waiting to be closed.\n\n" +
            "**C. The key insight \u2014 most recent open must close first.** When a close bracket appears, it must match the **most recently opened** bracket that is still unclosed. \u201cMost recent, first to be resolved\u201d is exactly **LIFO**, so a **stack** is the natural fit.\n\n" +
            "**D. What the stack holds / the invariant.** The stack holds every open bracket seen so far that has **not yet been closed**, with the most recent one on top. Invariant: at any moment the stack, read top-to-bottom, is the chain of still-open brackets from innermost to outermost.\n\n" +
            "**E. The matching map.** Keep a dictionary from each **close** bracket to its required **open** bracket: `{ ')': '(', ']': '[', '}': '{' }`. This lets us check a match in one lookup instead of a tangle of `if`s.\n\n" +
            "**F. Step by step.** Scan left to right. If the character is an open bracket, **push** it. If it is a close bracket, the top of the stack must be its matching open: **pop** and compare. A mismatch \u2014 or an empty stack when a close arrives (a close with no open) \u2014 means invalid.\n\n" +
            "**G. Why the empty-at-end check matters.** After the scan, the stack must be **empty**. Anything left over is an open bracket that was never closed (e.g. `\"(((\"`). Valid iff the stack empties exactly.\n\n" +
            "**H. Growing and shrinking.** Each open grows the stack by one; each correct close shrinks it by one. A perfectly balanced string returns the stack to empty at the end.\n\n" +
            "```\ns = \"{[]}\"\n\n  {        [        ]        }\n\n  |  |     | [|     |  |     |  |\n  |{ |  -> |{ |  -> |{ |  -> |  |\n  +--+     +--+     +--+     +--+\n  push {   push [   pop [    pop {\n                    (match)  (empty -> valid)\n```\n\n" +
            "**K/L. Complexity.** One pass, each character pushed/popped at most once \u2192 time `O(n)`; the stack can hold up to `n` opens \u2192 space `O(n)`.\n\n" +
            "**M. Interview mindset.** \u201cBalanced / correctly nested\u201d anything \u2014 brackets, HTML tags, nested expressions \u2014 is the signal to reach for a stack of the things still waiting to be closed.",
          rcs:
            "class Solution:\n" +
            "    def isValid(self, s: str) -> bool:\n" +
            "        stack = []                          # Holds open brackets not yet closed (top = most recent).\n" +
            "        close_to_open = {                   # Each close bracket -> the open it must match.\n" +
            "            ')': '(',\n" +
            "            ']': '[',\n" +
            "            '}': '{',\n" +
            "        }\n" +
            "        for ch in s:                        # Scan the string left to right.\n" +
            "            if ch in close_to_open:         # It's a CLOSE bracket.\n" +
            "                # Valid only if the top is exactly the matching open.\n" +
            "                if stack and stack[-1] == close_to_open[ch]:\n" +
            "                    stack.pop()             # Matched: resolve that open bracket.\n" +
            "                else:\n" +
            "                    return False            # Wrong type, or nothing open to close.\n" +
            "            else:                           # It's an OPEN bracket.\n" +
            "                stack.append(ch)            # Remember it until its close arrives.\n" +
            "        return not stack                    # Valid iff every open was closed (stack empty).",
          plain:
            "class Solution:\n" +
            "    def isValid(self, s: str) -> bool:\n" +
            "        stack = []\n" +
            "        close_to_open = {\n" +
            "            ')': '(',\n" +
            "            ']': '[',\n" +
            "            '}': '{',\n" +
            "        }\n" +
            "        for ch in s:\n" +
            "            if ch in close_to_open:\n" +
            "                if stack and stack[-1] == close_to_open[ch]:\n" +
            "                    stack.pop()\n" +
            "                else:\n" +
            "                    return False\n" +
            "            else:\n" +
            "                stack.append(ch)\n" +
            "        return not stack"
        }
      ],
      patternRecognition: [
        "\u201cBalanced\u201d or \u201ccorrectly nested\u201d brackets, tags, or expressions.",
        "The most recently opened thing must be the first one closed \u2192 LIFO \u2192 stack.",
        "Counting alone fails because order matters, not just totals."
      ],
      interviewRecall: [
        "Push opens; on a close, pop and check it matches \u2014 else invalid.",
        "A close with an empty stack (nothing to match) is invalid.",
        "At the end the stack MUST be empty; leftovers are unclosed opens.",
        "Use a close->open map to keep the matching logic to one lookup."
      ]
    },

    {
      id: "min-stack",
      lc: 155,
      title: "Min Stack",
      difficulty: "Medium",
      category: "Stack",
      link: "https://leetcode.com/problems/min-stack/",
      meta: { pattern: "Auxiliary State", dataStructure: "Stack", technique: "Track running minimum" },
      description:
        "Design a stack that, in addition to the usual operations, can return its **minimum element in constant time**.\n\n" +
        "Implement the `MinStack` class:\n\n" +
        "- `MinStack()` initializes an empty stack.\n" +
        "- `push(val)` pushes `val` onto the stack.\n" +
        "- `pop()` removes the element on top of the stack.\n" +
        "- `top()` returns the element on top of the stack.\n" +
        "- `getMin()` returns the minimum element currently in the stack.\n\n" +
        "Every one of these operations must run in **O(1)** time.",
      constraints: [
        "`-2^31 <= val <= 2^31 - 1`",
        "`pop`, `top`, and `getMin` are always called on a **non-empty** stack.",
        "At most `3 * 10^4` calls will be made across all methods."
      ],
      notes: [
        "The challenge is `getMin` in O(1): scanning the stack each time would be O(n).",
        "Duplicated minimums must be handled \u2014 popping one copy of the minimum should leave the min correct if another copy remains."
      ],
      examples: [
        {
          input: 'push(-2), push(0), push(-3), getMin(), pop(), top(), getMin()',
          output: "-3, then top()=0, then getMin()=-2",
          reasoning: "After the three pushes the min is -3. Pop removes -3, so top is 0 and the min falls back to -2.",
          visual:
            "```\npush -2   values: [-2]         min-so-far: -2\npush  0   values: [-2, 0]      min-so-far: -2\npush -3   values: [-2, 0, -3]  min-so-far: -3\ngetMin -> -3\npop       values: [-2, 0]      min-so-far: -2\ntop    -> 0\ngetMin -> -2\n```"
        },
        {
          input: 'push(2), push(2), getMin(), pop(), getMin()',
          output: "getMin()=2, then getMin()=2",
          reasoning: "Duplicate minimums: after popping one 2, the other 2 remains, so getMin is still 2. This is why we track a min PER element, not a single variable."
        },
        {
          input: 'push(5), getMin(), push(3), getMin(), push(7), getMin()',
          output: "5, then 3, then 3",
          reasoning: "The minimum only ever decreases or stays as we push; 7 is larger than the current min 3, so getMin stays 3."
        },
        {
          input: 'push(1), push(-1), top(), getMin(), pop(), top(), getMin()',
          output: "top()=-1, getMin()=-1, then top()=1, getMin()=1",
          reasoning: "Popping -1 removes both the top and the current minimum; the stack falls back to 1 for both."
        }
      ],
      approaches: [
        {
          name: "Pairs of (value, min-so-far)",
          time: "O(1) per operation",
          space: "O(n)",
          whenToUse: "Cleanest one-stack version: store the running minimum alongside each value.",
          logic:
            "**A. What is being asked?** A normal stack, plus `getMin()` that returns the smallest element currently held \u2014 all in `O(1)`.\n\n" +
            "**B. Why the naive idea is too slow.** Keeping just the values and scanning for the minimum on every `getMin` is `O(n)`. Keeping a single `min` variable breaks on `pop`: once you remove the current minimum, you have no idea what the *previous* minimum was.\n\n" +
            "**C. The key observation.** The minimum of the stack depends only on which elements are present, and elements are added/removed strictly at the top. So for each element we can record **what the minimum was at the moment that element was on top**. That value never needs recomputing.\n\n" +
            "**D. What the stack holds / the invariant.** Each stack entry is a pair `(val, cur_min)`, where `cur_min` is the smallest value among everything at or below this entry. Invariant: the `cur_min` in the **top** pair is always the minimum of the whole stack.\n\n" +
            "**E. push.** The new running minimum is `min(val, previous_top_min)` (or just `val` if the stack was empty). Push the pair `(val, that_min)`.\n\n" +
            "**F. pop / top / getMin.** `pop` removes the top pair. `top` returns the top pair's **value**. `getMin` returns the top pair's stored **minimum** \u2014 a direct read, no scanning.\n\n" +
            "**G. Why this is O(1) and correct.** Every method touches only the top of the list: append, pop, and index `[-1]` are all constant time. Because each entry froze the min that was true when it was pushed, popping automatically \u2018restores\u2019 the earlier minimum \u2014 the new top pair already carries it. Duplicated minimums are safe: each copy stored its own `cur_min`, so removing one copy still leaves a correct min on top.\n\n" +
            "```\npush -2        push 0          push -3\n(val, min)     (val, min)      (val, min)\n+---------+    +---------+     +---------+\n| -2, -2  |    |  0, -2  |     | -3, -3  | <- top: getMin reads -3\n+---------+    | -2, -2  |     |  0, -2  |\n               +---------+     | -2, -2  |\n                               +---------+\n                after pop -> top is (0,-2), getMin reads -2\n```\n\n" +
            "**K/L. Complexity.** Every operation is `O(1)`; storing a pair per element is `O(n)` space.\n\n" +
            "**M. Interview mindset.** When a data structure must answer an aggregate (min/max) in `O(1)` while it mutates, the move is to **carry the answer along with the data** so removals restore the previous answer for free.",
          rcs:
            "class MinStack:\n" +
            "    def __init__(self):\n" +
            "        self.stack = []                     # Each entry is a pair (value, min-at-or-below).\n" +
            "\n" +
            "    def push(self, val: int) -> None:\n" +
            "        # New running min is val vs. the min currently on top (or val if empty).\n" +
            "        cur_min = val if not self.stack else min(val, self.stack[-1][1])\n" +
            "        self.stack.append((val, cur_min)) # Store value together with the min it sees.\n" +
            "\n" +
            "    def pop(self) -> None:\n" +
            "        self.stack.pop()                    # Removing the top also removes its frozen min.\n" +
            "\n" +
            "    def top(self) -> int:\n" +
            "        return self.stack[-1][0]            # The value part of the top pair.\n" +
            "\n" +
            "    def getMin(self) -> int:\n" +
            "        return self.stack[-1][1]            # The min part of the top pair: O(1) read.",
          plain:
            "class MinStack:\n" +
            "    def __init__(self):\n" +
            "        self.stack = []\n" +
            "\n" +
            "    def push(self, val: int) -> None:\n" +
            "        cur_min = val if not self.stack else min(val, self.stack[-1][1])\n" +
            "        self.stack.append((val, cur_min))\n" +
            "\n" +
            "    def pop(self) -> None:\n" +
            "        self.stack.pop()\n" +
            "\n" +
            "    def top(self) -> int:\n" +
            "        return self.stack[-1][0]\n" +
            "\n" +
            "    def getMin(self) -> int:\n" +
            "        return self.stack[-1][1]"
        },
        {
          name: "Two stacks (values + minimums)",
          time: "O(1) per operation",
          space: "O(n)",
          whenToUse: "The classic phrasing; keep a separate stack whose top is always the current minimum.",
          logic:
            "**Same goal, two parallel stacks.** Some interviewers ask for this framing explicitly. Keep the values in one stack and the running minimums in a second stack that rises and falls in lockstep.\n\n" +
            "**D. What each stack holds.** `stack` holds the actual values. `min_stack` holds, at its top, the minimum of everything currently in `stack`. Invariant: `min_stack[-1]` is always the current overall minimum, and the two stacks have the same height.\n\n" +
            "**E. push.** Push `val` onto `stack`. For `min_stack`, push `min(val, min_stack[-1])` \u2014 i.e. the smaller of the new value and the previous minimum (or just `val` when empty). Pushing onto `min_stack` on **every** push keeps the two heights equal, which makes `pop` trivial.\n\n" +
            "**F. pop.** Pop from **both** stacks. Because `min_stack` recorded the minimum as it was at each level, removing the top of both restores the previous minimum automatically.\n\n" +
            "**G. top / getMin.** `top` reads `stack[-1]`; `getMin` reads `min_stack[-1]`. Both are `O(1)`.\n\n" +
            "**Why duplicates are safe.** If the minimum value appears twice, it was pushed onto `min_stack` twice (once per push), so popping one copy still leaves the min on top. This is exactly why we push to `min_stack` unconditionally rather than only when a new minimum appears \u2014 it sidesteps the tricky duplicate-count bookkeeping.\n\n" +
            "```\n         stack        min_stack\npush -2  [-2]         [-2]\npush  0  [-2, 0]      [-2, -2]\npush -3  [-2, 0, -3]  [-2, -2, -3]  <- getMin = -3\npop      [-2, 0]      [-2, -2]      <- getMin = -2\n```\n\n" +
            "**K/L. Complexity.** All operations `O(1)`; two stacks of up to `n` entries \u2192 `O(n)` space.",
          rcs:
            "class MinStack:\n" +
            "    def __init__(self):\n" +
            "        self.stack = []                     # Actual values.\n" +
            "        self.min_stack = []                 # Its top is the current minimum.\n" +
            "\n" +
            "    def push(self, val: int) -> None:\n" +
            "        self.stack.append(val)\n" +
            "        # New min is val vs. old min; push on EVERY call to keep heights equal.\n" +
            "        cur_min = val if not self.min_stack else min(val, self.min_stack[-1])\n" +
            "        self.min_stack.append(cur_min)\n" +
            "\n" +
            "    def pop(self) -> None:\n" +
            "        self.stack.pop()                    # Pop both so the previous min is restored.\n" +
            "        self.min_stack.pop()\n" +
            "\n" +
            "    def top(self) -> int:\n" +
            "        return self.stack[-1]              # Top value.\n" +
            "\n" +
            "    def getMin(self) -> int:\n" +
            "        return self.min_stack[-1]          # Current minimum: O(1) read.",
          plain:
            "class MinStack:\n" +
            "    def __init__(self):\n" +
            "        self.stack = []\n" +
            "        self.min_stack = []\n" +
            "\n" +
            "    def push(self, val: int) -> None:\n" +
            "        self.stack.append(val)\n" +
            "        cur_min = val if not self.min_stack else min(val, self.min_stack[-1])\n" +
            "        self.min_stack.append(cur_min)\n" +
            "\n" +
            "    def pop(self) -> None:\n" +
            "        self.stack.pop()\n" +
            "        self.min_stack.pop()\n" +
            "\n" +
            "    def top(self) -> int:\n" +
            "        return self.stack[-1]\n" +
            "\n" +
            "    def getMin(self) -> int:\n" +
            "        return self.min_stack[-1]"
        }
      ],
      patternRecognition: [
        "A data structure must return an aggregate (min/max) in O(1) while it keeps mutating.",
        "You catch yourself wanting to scan the whole stack for the minimum \u2014 precompute and carry it instead.",
        "'Design a stack/queue that also does X in O(1)' \u2192 store auxiliary state alongside the data."
      ],
      interviewRecall: [
        "Store the running min WITH each element (pairs) or in a parallel min-stack.",
        "On pop, the previous minimum is restored for free because it was recorded per level.",
        "Push to the min-stack on EVERY push (even non-new mins) so duplicate minimums stay correct.",
        "A single min variable fails: you can't recover the previous min after popping it."
      ]
    }
  ]);
})();
