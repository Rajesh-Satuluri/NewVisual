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
            "**What it asks.** Given a string of only bracket characters, decide whether it is valid: every open bracket is closed by one of the **same type**, and brackets close in the **correct order** \u2014 the most recently opened is the first to be closed.\n\n" +
            "**Why the naive idea fails.** The tempting shortcut is to just count opens versus closes and check they match. But counting accepts `\"([)]\"`, because the totals balance perfectly even though the pairs interleave instead of nesting. The problem is about *order*, not just quantity, so you must know exactly which bracket is still waiting to be closed at any moment.\n\n" +
            "**Key Idea.** When a close bracket appears, it must match the **most recently opened** bracket that is still unclosed. \u201cMost recent thing must be resolved first\u201d is precisely **LIFO**, which is exactly what a **stack** gives you. Pair this with a lookup map from each close bracket to its required open (`{ ')': '(', ']': '[', '}': '{' }`) so each match is a single comparison rather than a tangle of `if`s.\n\n" +
            "**What the stack holds.** The stack holds every open bracket seen so far that has **not yet been closed**, most recent on top. Invariant: read top-to-bottom, the stack is the chain of still-open brackets from innermost to outermost \u2014 so its top is always the next bracket that must be closed.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Scan the string left to right one character at a time.\n" +
            "2. If the character is an open bracket, **push** it onto the stack.\n" +
            "3. If it is a close bracket, look up its required open. Check the stack: if it is non-empty and its top equals that required open, **pop** (this resolves the pair).\n" +
            "4. Otherwise \u2014 wrong type on top, or an empty stack (a close with nothing open to match) \u2014 return invalid immediately.\n" +
            "5. After the whole scan, return valid only if the stack is **empty**.\n\n" +
            "**Why it works.** Each open grows the stack by one; each correct close shrinks it by one. Because the top is always the most recently opened unclosed bracket, matching against it enforces both correct type and correct nesting order in a single check. The empty-at-end test is essential: anything left over (e.g. `\"(((\"`) is an open bracket that was never closed, so the string is valid iff the stack empties exactly.\n\n" +
            "**Common Gotchas.**\n" +
            "- A close bracket arriving on an **empty** stack must be rejected \u2014 there is nothing to match it to.\n" +
            "- Do not forget the final empty check; a string of only opens passes every per-character step but is still invalid.\n" +
            "- Matching type matters, not just open-vs-close: `\"(]\"` must fail even though counts balance.\n\n" +
            "**Complexity.** Time `O(n)`: one pass, each character pushed and popped at most once. Space `O(n)`: an all-open string like `\"((((\"` holds up to `n` brackets on the stack.\n\n" +
            "**Interview mindset.** \u201cBalanced\u201d or \u201ccorrectly nested\u201d anything \u2014 brackets, HTML tags, nested expressions \u2014 is the signal to reach for a stack of the things still waiting to be closed, matching each new closer against the top.",
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
            "**What it asks.** Design a stack with the usual `push`, `pop`, and `top`, plus a `getMin()` that returns the smallest element currently held \u2014 and *every* operation, `getMin` included, must run in `O(1)`.\n\n" +
            "**Why the naive idea fails.** Storing only the values and scanning for the minimum on each `getMin` is `O(n)`, not `O(1)`. Keeping a single `min` variable seems to fix that, but it breaks on `pop`: the moment you remove the element that was the current minimum, you have no record of what the *previous* minimum was and cannot restore it.\n\n" +
            "**Key Idea.** The minimum depends only on which elements are present, and elements enter and leave strictly at the top. So at the instant each element is pushed, record **what the minimum is with that element on top**, and store that frozen value right next to the element. It never needs recomputing, and when the element leaves, its frozen min leaves with it.\n\n" +
            "**What the stack holds.** Each stack entry is a pair `(val, cur_min)`, where `cur_min` is the smallest value among everything at or below that entry. Invariant: the `cur_min` of the **top** pair is always the minimum of the entire stack.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `push(val)`: compute the new running minimum as `min(val, previous top's cur_min)`, or just `val` if the stack was empty. Append the pair `(val, that_min)`.\n" +
            "2. `pop()`: remove the top pair (which discards its frozen min along with it).\n" +
            "3. `top()`: return the **value** component of the top pair.\n" +
            "4. `getMin()`: return the **cur_min** component of the top pair \u2014 a direct read, no scanning.\n\n" +
            "**Why it works.** Every method touches only the top of the list \u2014 append, pop, and index `[-1]` are all constant time. Because each entry froze the minimum that was true when it was pushed, popping automatically restores the earlier minimum: the pair now exposed at the top already carries the correct answer. Duplicated minimums are safe because each copy stored its own `cur_min`, so removing one copy still leaves a valid min on top.\n\n" +
            "**Common Gotchas.**\n" +
            "- The empty-stack case on `push`: with nothing below, the running min is just `val` itself.\n" +
            "- Duplicate minimum values must both carry their own frozen min \u2014 do not try to track the min with a single counter or variable.\n" +
            "- `getMin` reads the top pair's min, not the whole-list minimum recomputed; trusting the invariant is what keeps it `O(1)`.\n\n" +
            "**Complexity.** Time `O(1)` for every operation (only top-of-stack access). Space `O(n)`: one pair stored per element.\n\n" +
            "**Interview mindset.** When a structure must answer an aggregate (min/max) in `O(1)` while it keeps mutating, the move is to **carry the answer alongside the data** so that a removal restores the previous answer for free.",
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
            "**What it asks.** The same problem \u2014 a stack whose `push`, `pop`, `top`, and `getMin` all run in `O(1)` \u2014 but solved with the framing some interviewers request explicitly: two parallel stacks instead of pairs.\n\n" +
            "**Why the naive idea fails.** As before, scanning for the minimum is `O(n)`, and a single `min` variable cannot be recovered after you pop the element that held it. The fix is again to remember the minimum per level, here stored in a dedicated second stack.\n\n" +
            "**Key Idea.** Keep the values in one stack and the running minimums in a second stack that rises and falls in lockstep with it. Push onto the min stack on **every** push (even when the value is not a new minimum), so the two stacks always have equal height and `pop` can simply remove the top of both.\n\n" +
            "**What the stacks hold.** `stack` holds the actual values. `min_stack` holds, at each level, the minimum of everything in `stack` up to and including that level \u2014 so its top is the current overall minimum. Invariant: `min_stack[-1]` is always the current minimum, and the two stacks have identical height.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `push(val)`: append `val` to `stack`; append `min(val, min_stack[-1])` to `min_stack` (or just `val` when `min_stack` is empty).\n" +
            "2. `pop()`: pop from **both** stacks so they stay the same height.\n" +
            "3. `top()`: return `stack[-1]`.\n" +
            "4. `getMin()`: return `min_stack[-1]`.\n\n" +
            "**Why it works.** Because `min_stack` recorded the minimum as it stood at each level, removing the top of both stacks automatically re-exposes the minimum that was correct one level down \u2014 no recomputation needed. Duplicated minimums are safe: a repeated minimum value gets pushed onto `min_stack` again (one push per value), so popping one copy still leaves a correct min on top. Pushing to `min_stack` unconditionally is exactly what sidesteps the fragile duplicate-count bookkeeping.\n\n" +
            "**Common Gotchas.**\n" +
            "- Push to `min_stack` on *every* `push`, not only when a new minimum appears \u2014 otherwise the heights diverge and `pop` cannot stay in sync.\n" +
            "- Always pop both stacks together; popping only `stack` corrupts the minimum tracking.\n" +
            "- Handle the empty `min_stack` on the first push, where the running min is simply `val`.\n\n" +
            "**Complexity.** Time `O(1)` per operation (only top-of-stack access). Space `O(n)`: two stacks of up to `n` entries each.\n\n" +
            "**Interview mindset.** Two synchronized stacks are the classic way to answer a running aggregate in `O(1)`; keeping them the same height turns `pop` into a mechanical, mistake-proof step.",
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
