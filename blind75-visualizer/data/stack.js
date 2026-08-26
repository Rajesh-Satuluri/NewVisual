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
    },

    {
      id: "evaluate-reverse-polish-notation",
      lc: 150,
      title: "Evaluate Reverse Polish Notation",
      difficulty: "Medium",
      category: "Stack",
      link: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
      meta: { pattern: "Postfix Evaluation", dataStructure: "Stack", technique: "Push operands, pop two on operator" },
      description:
        "You are given an array `tokens` representing an arithmetic expression in **Reverse Polish Notation** (RPN, also called postfix). Evaluate it and return the resulting integer.\n\n" +
        "Each token is either an integer or one of the operators `'+'`, `'-'`, `'*'`, `'/'`. In RPN an operator comes **after** its two operands, so `[\"2\", \"1\", \"+\", \"3\", \"*\"]` means `(2 + 1) * 3`.\n\n" +
        "Division between two integers **truncates toward zero** (e.g. `6 / -132 = 0`), and the input is guaranteed to be a valid expression whose intermediate and final results fit in a 32-bit integer.",
      constraints: [
        "`1 <= tokens.length <= 10^4`",
        "`tokens[i]` is either an operator in `{'+', '-', '*', '/'}` or an integer in the 32-bit signed range.",
        "The expression is always valid; division never divides by zero.",
        "Division truncates toward zero (not floor)."
      ],
      notes: [
        "RPN needs no parentheses and no operator precedence \u2014 the order of tokens fully determines evaluation.",
        "Order matters for `-` and `/`: the operand pushed first is the left operand, so pop the right operand first.",
        "Python's `//` floors toward negative infinity; use `int(a / b)` (or `math.trunc`) to truncate toward zero."
      ],
      examples: [
        {
          input: 'tokens = ["2","1","+","3","*"]',
          output: "9",
          reasoning: "(2 + 1) * 3 = 9. The '+' pops 1 and 2, pushes 3; the '*' pops 3 and 3, pushes 9.",
          visual:
            "```\ntok '2'  push        stack: 2\ntok '1'  push        stack: 2 1\ntok '+'  pop 1, pop 2 -> 2+1=3   stack: 3\ntok '3'  push        stack: 3 3\ntok '*'  pop 3, pop 3 -> 3*3=9   stack: 9  -> 9\n```"
        },
        {
          input: 'tokens = ["4","13","5","/","+"]',
          output: "6",
          reasoning: "4 + (13 / 5) = 4 + 2 = 6. Integer division 13/5 truncates to 2."
        },
        {
          input: 'tokens = ["10","6","9","3","+","-11","*","/","*","17","+","5","+"]',
          output: "22",
          reasoning: "A deeper nesting; the stack unwinds it left to right, each operator consuming its two most recent operands."
        },
        {
          input: 'tokens = ["3","-4","/"]',
          output: "0",
          reasoning: "3 / -4 = -0.75, which truncates toward zero to 0 \u2014 NOT -1 as Python's floor division would give.",
          visual:
            "```\ntok '3'   push        stack: 3\ntok '-4'  push        stack: 3 -4\ntok '/'   pop -4 (right), pop 3 (left)\n          int(3 / -4) = int(-0.75) = 0   stack: 0  -> 0\n```"
        },
        {
          input: 'tokens = ["5"]',
          output: "5",
          reasoning: "A single operand with no operators; it is pushed and is the final answer on top."
        }
      ],
      approaches: [
        {
          name: "Stack of operands",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The canonical way to evaluate any postfix expression in one linear pass.",
          logic:
            "**What it asks.** Evaluate a Reverse Polish (postfix) expression given as a token list, returning the final integer. Operators follow their operands, and division truncates toward zero.\n\n" +
            "**Why the naive idea fails.** With infix you would juggle parentheses and operator precedence; you might reach for recursion or repeated string rewriting. But RPN was designed precisely to remove that ambiguity \u2014 there are no parentheses and no precedence rules, so any parsing machinery is wasted effort. The only thing you must track is the operands that have not yet been consumed by an operator.\n\n" +
            "**Key Idea.** Every operator acts on the **two most recently produced** operands. \u201cMost recent first\u201d is LIFO, so a **stack** models the computation exactly: push numbers, and when an operator appears, pop its two operands, apply it, and push the single result back.\n\n" +
            "**What the stack holds.** The stack holds operands (and intermediate results) that have been produced but not yet consumed by an operator, most recent on top. Invariant: after processing any prefix of the tokens, the stack contains exactly the values still awaiting combination; a valid full expression leaves exactly one value at the end.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create an empty stack and scan the tokens left to right.\n" +
            "2. If the token is an operator, pop the top value as the **right** operand `b`, then pop the next as the **left** operand `a`.\n" +
            "3. Compute `a OP b`. For division, truncate toward zero with `int(a / b)` rather than Python's `//`.\n" +
            "4. Push the result back onto the stack.\n" +
            "5. If the token is a number, convert it to `int` and push it.\n" +
            "6. After all tokens, the single remaining value on the stack is the answer.\n\n" +
            "**Why it works.** Postfix order guarantees that by the time an operator is read, its two operands are already the top two stack entries \u2014 no lookahead needed. Replacing those two with their result mirrors collapsing a sub-expression to a single number, exactly how you would evaluate it by hand.\n\n" +
            "**Common Gotchas.**\n" +
            "- Operand order: the **first** pop is the right-hand operand. Getting this backwards silently breaks `-` and `/` (which are not commutative).\n" +
            "- Truncation direction: `int(a / b)` truncates toward zero; `a // b` floors toward negative infinity and gives wrong answers on mixed signs like `3 // -4 == -1`.\n" +
            "- Negative-number tokens (e.g. `\"-4\"`) are operands, not the `-` operator \u2014 checking membership in the operator set (not just \u201cstarts with -\u201d) distinguishes them.\n\n" +
            "**Complexity.** Time `O(n)`: one pass, each token pushed/popped a constant number of times. Space `O(n)`: the stack can hold up to about half the tokens as operands before an operator collapses them.\n\n" +
            "**Interview mindset.** Postfix/prefix evaluation, or any \u201capply this to the last two/N things produced\u201d rule, is a stack in disguise \u2014 push data, and let each operator consume from the top.",
          rcs:
            "class Solution:\n" +
            "    def evalRPN(self, tokens: List[str]) -> int:\n" +
            "        stack = []                              # Operands not yet consumed (top = most recent).\n" +
            "        ops = {'+', '-', '*', '/'}\n" +
            "        for tok in tokens:                      # Scan tokens left to right.\n" +
            "            if tok in ops:                      # Operator: combine the top two operands.\n" +
            "                b = stack.pop()                 # First pop is the RIGHT operand.\n" +
            "                a = stack.pop()                 # Second pop is the LEFT operand.\n" +
            "                if tok == '+':\n" +
            "                    stack.append(a + b)\n" +
            "                elif tok == '-':\n" +
            "                    stack.append(a - b)\n" +
            "                elif tok == '*':\n" +
            "                    stack.append(a * b)\n" +
            "                else:                           # Division truncates toward zero.\n" +
            "                    stack.append(int(a / b))    # int(...) truncates; // would floor.\n" +
            "            else:                               # Operand: push its integer value.\n" +
            "                stack.append(int(tok))\n" +
            "        return stack[-1]                        # One value remains: the result.",
          plain:
            "class Solution:\n" +
            "    def evalRPN(self, tokens: List[str]) -> int:\n" +
            "        stack = []\n" +
            "        ops = {'+', '-', '*', '/'}\n" +
            "        for tok in tokens:\n" +
            "            if tok in ops:\n" +
            "                b = stack.pop()\n" +
            "                a = stack.pop()\n" +
            "                if tok == '+':\n" +
            "                    stack.append(a + b)\n" +
            "                elif tok == '-':\n" +
            "                    stack.append(a - b)\n" +
            "                elif tok == '*':\n" +
            "                    stack.append(a * b)\n" +
            "                else:\n" +
            "                    stack.append(int(a / b))\n" +
            "            else:\n" +
            "                stack.append(int(tok))\n" +
            "        return stack[-1]"
        }
      ],
      patternRecognition: [
        "Postfix (RPN) or prefix expression evaluation \u2192 stack of operands.",
        "A rule of the form 'apply the operator to the last two values produced' \u2192 LIFO.",
        "No parentheses / no precedence to parse \u2192 the token order already encodes evaluation."
      ],
      interviewRecall: [
        "Push numbers; on an operator pop two, apply, push the result.",
        "First pop = right operand, second pop = left operand (matters for - and /).",
        "Use int(a / b) to truncate toward zero; // floors and is wrong on mixed signs.",
        "The lone value left on the stack at the end is the answer."
      ]
    },

    {
      id: "generate-parentheses",
      lc: 22,
      title: "Generate Parentheses",
      difficulty: "Medium",
      category: "Stack",
      link: "https://leetcode.com/problems/generate-parentheses/",
      meta: { pattern: "Backtracking", dataStructure: "Recursion stack / string builder", technique: "Prune by open/close counts" },
      description:
        "Given an integer `n`, generate **all** combinations of well-formed parentheses using exactly `n` pairs.\n\n" +
        "A combination is well-formed when every open bracket `'('` has a matching close `')'` and no prefix of the string ever has more closes than opens.\n\n" +
        "Return the list of all such strings in any order.",
      constraints: [
        "`1 <= n <= 8`",
        "Each result string has length exactly `2 * n`.",
        "The number of valid results is the n-th Catalan number `C(n)`."
      ],
      notes: [
        "The count of valid strings is the Catalan number: 1, 2, 5, 14, 42, ... for n = 1, 2, 3, 4, 5.",
        "The key validity rule mid-build: at every point the number of ')' placed so far must not exceed the number of '(' placed.",
        "Because n <= 8, the total output size is small (C(8) = 1430), so generating all of them is fine."
      ],
      examples: [
        {
          input: "n = 1",
          output: '["()"]',
          reasoning: "The only well-formed string with one pair."
        },
        {
          input: "n = 2",
          output: '["(())","()()"]',
          reasoning: "Two pairs can nest or sit side by side; those are the only valid arrangements."
        },
        {
          input: "n = 3",
          output: '["((()))","(()())","(())()","()(())","()()()"]',
          reasoning: "Five results \u2014 the 3rd Catalan number.",
          visual:
            "```\nbuild with open<=n and close<open:\n(            open=1\n((           open=2\n(((          open=3   -> then close x3 -> ((()))\n((  )        ... branch produces (()()) , (())()\n(  )         ... branch produces ()(()) , ()()()\n```"
        },
        {
          input: "n = 0",
          output: '[""]',
          reasoning: "Edge idea: zero pairs yields the single empty string (the constraints start at n = 1, but the recursion handles it naturally)."
        }
      ],
      approaches: [
        {
          name: "Backtracking with open/close counts",
          time: "O(4^n / \u221an)",
          space: "O(n)",
          whenToUse: "The standard way to enumerate all valid structures while pruning invalid branches early.",
          logic:
            "**What it asks.** Produce every well-formed string of exactly `n` pairs of parentheses. \u201cWell-formed\u201d means balanced and never dipping negative \u2014 no prefix has more `')'` than `'('`.\n\n" +
            "**Why the naive idea fails.** Generating all `2^(2n)` sequences of `(` and `)` and filtering the valid ones is wasteful: the vast majority are invalid, and you do all the work before discovering it. You want to **never build** an invalid prefix in the first place.\n\n" +
            "**Key Idea.** Build the string one character at a time, tracking two counts: `open` (how many `'('` placed) and `close` (how many `')'` placed). Two local rules guarantee validity: you may add `'('` while `open < n`, and you may add `')'` only while `close < open`. The second rule is exactly what keeps the running balance non-negative.\n\n" +
            "**What the (recursion) stack holds.** This is backtracking, so the call stack holds the partial string being built, one frame per character placed; the frame also carries the current `open`/`close` counts. Invariant: at every frame the prefix built so far is a **valid prefix** \u2014 balanced-or-open, never over-closed \u2014 because the two placement rules forbid any move that would violate it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Start with an empty partial string and `open = close = 0`.\n" +
            "2. Base case: when the string's length is `2 * n` (equivalently `open == close == n`), record it as a finished result.\n" +
            "3. If `open < n`, choose to append `'('`, recurse with `open + 1`, then backtrack (undo the choice).\n" +
            "4. If `close < open`, choose to append `')'`, recurse with `close + 1`, then backtrack.\n" +
            "5. Collect every string that reaches the base case.\n\n" +
            "**Why it works.** The two guards make it impossible to ever create an invalid prefix, so every leaf of the recursion is a valid complete string \u2014 no post-filtering needed. `open < n` caps the total opens at `n`; `close < open` guarantees each close matches an earlier unmatched open, so the final `open == close == n` string is fully balanced. Every valid string corresponds to exactly one path of choices, so all of them are generated with no duplicates.\n\n" +
            "**Common Gotchas.**\n" +
            "- The close guard is `close < open`, NOT `close < n` \u2014 using `n` lets you over-close and produce invalid strings like `\"())(\"`.\n" +
            "- Remember to undo the append after each recursive call (or pass a fresh string/immutable value) so branches don't leak into each other.\n" +
            "- Stop at length `2 * n`; both counts reaching `n` is the same condition.\n\n" +
            "**Complexity.** Time `O(4^n / \u221an)` \u2014 proportional to the n-th Catalan number times the length to copy each string. Space `O(n)` for the recursion depth and the current partial string (excluding the output list).\n\n" +
            "**Interview mindset.** \u201cGenerate all valid \u2026\u201d is the backtracking signal: build incrementally, and prune the instant a choice would violate a constraint rather than validating whole candidates at the end.",
          rcs:
            "class Solution:\n" +
            "    def generateParenthesis(self, n: int) -> List[str]:\n" +
            "        res = []\n" +
            "        cur = []                                # Partial string as a char list (fast append/pop).\n" +
            "\n" +
            "        def backtrack(open_count: int, close_count: int) -> None:\n" +
            "            if len(cur) == 2 * n:               # Base case: used all n pairs.\n" +
            "                res.append(''.join(cur))        # Record a completed valid string.\n" +
            "                return\n" +
            "            if open_count < n:                  # Can still open a new pair.\n" +
            "                cur.append('(')\n" +
            "                backtrack(open_count + 1, close_count)\n" +
            "                cur.pop()                       # Undo the choice (backtrack).\n" +
            "            if close_count < open_count:        # Can close only an unmatched open.\n" +
            "                cur.append(')')\n" +
            "                backtrack(open_count, close_count + 1)\n" +
            "                cur.pop()                       # Undo the choice (backtrack).\n" +
            "\n" +
            "        backtrack(0, 0)\n" +
            "        return res",
          plain:
            "class Solution:\n" +
            "    def generateParenthesis(self, n: int) -> List[str]:\n" +
            "        res = []\n" +
            "        cur = []\n" +
            "\n" +
            "        def backtrack(open_count: int, close_count: int) -> None:\n" +
            "            if len(cur) == 2 * n:\n" +
            "                res.append(''.join(cur))\n" +
            "                return\n" +
            "            if open_count < n:\n" +
            "                cur.append('(')\n" +
            "                backtrack(open_count + 1, close_count)\n" +
            "                cur.pop()\n" +
            "            if close_count < open_count:\n" +
            "                cur.append(')')\n" +
            "                backtrack(open_count, close_count + 1)\n" +
            "                cur.pop()\n" +
            "\n" +
            "        backtrack(0, 0)\n" +
            "        return res"
        }
      ],
      patternRecognition: [
        "'Generate/enumerate all valid combinations' \u2192 backtracking.",
        "Validity can be checked incrementally from simple counts \u2192 prune instead of filter.",
        "Balanced-brackets construction: the running count of ')' may never exceed '('."
      ],
      interviewRecall: [
        "Track open and close counts; add '(' when open<n, add ')' when close<open.",
        "The close guard is close<open, not close<n \u2014 that is what keeps it balanced.",
        "Base case: length == 2n (open==close==n) \u2192 record the string.",
        "Undo each append after recursing so branches stay independent."
      ]
    },

    {
      id: "daily-temperatures",
      lc: 739,
      title: "Daily Temperatures",
      difficulty: "Medium",
      category: "Stack",
      link: "https://leetcode.com/problems/daily-temperatures/",
      meta: { pattern: "Monotonic Stack", dataStructure: "Stack of indices", technique: "Next greater element" },
      description:
        "Given an array `temperatures` of daily temperatures, return an array `answer` where `answer[i]` is the **number of days you have to wait** after day `i` to get a warmer temperature.\n\n" +
        "If no future day is warmer, `answer[i]` is `0`.",
      constraints: [
        "`1 <= temperatures.length <= 10^5`",
        "`30 <= temperatures[i] <= 100`"
      ],
      notes: [
        "This is a 'next greater element' problem: for each position, find the distance to the next strictly larger value.",
        "The answer is a count of days (an index difference), not the temperature itself.",
        "Days with no warmer future day keep the default value 0."
      ],
      examples: [
        {
          input: "temperatures = [73,74,75,71,69,72,76,73]",
          output: "[1,1,4,2,1,1,0,0]",
          reasoning: "Day 0 (73) warms the next day (74) \u2192 1. Day 2 (75) waits until day 6 (76) \u2192 4. The last two have no warmer future day \u2192 0.",
          visual:
            "```\nidx:   0  1  2  3  4  5  6  7\ntemp: 73 74 75 71 69 72 76 73\nans:   1  1  4  2  1  1  0  0\n\nday2=75 stays on stack until 76 at idx6 -> 6-2 = 4\n```"
        },
        {
          input: "temperatures = [30,40,50,60]",
          output: "[1,1,1,0]",
          reasoning: "Strictly increasing, so each day is warmed by the very next; the last has no future warmer day."
        },
        {
          input: "temperatures = [30,60,90]",
          output: "[1,1,0]",
          reasoning: "Each earlier day is resolved by the next larger value; the final day stays 0."
        },
        {
          input: "temperatures = [90,80,70,60]",
          output: "[0,0,0,0]",
          reasoning: "Strictly decreasing \u2014 no day ever gets warmer, so every answer is 0. The stack just keeps growing and nothing is ever popped."
        }
      ],
      approaches: [
        {
          name: "Brute force \u2014 scan forward",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "The obvious baseline to state before optimizing; fine only for tiny inputs.",
          logic:
            "**What it asks.** For each day, how many days until a strictly warmer temperature (0 if none).\n\n" +
            "**Why the naive idea works but is slow.** The definition is directly executable: for each day `i`, walk forward until you find a warmer day and record the distance. It is correct, but for a decreasing or flat array almost every inner scan runs to the end, giving `O(n^2)` \u2014 up to `10^10` steps at `n = 10^5`, far too slow.\n\n" +
            "**Key Idea.** Just realize the definition literally with a nested loop, so you have a correct reference to compare the optimal solution against.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `answer` to all zeros.\n" +
            "2. For each `i`, scan `j` from `i + 1` forward.\n" +
            "3. The first `j` with `temperatures[j] > temperatures[i]` gives `answer[i] = j - i`; break.\n" +
            "4. If none is found, leave `answer[i] = 0`.\n\n" +
            "**Why it works.** It is the definition restated \u2014 the first warmer day encountered while scanning forward is by construction the nearest one.\n\n" +
            "**Common Gotchas.**\n" +
            "- The comparison is strict (`>`); an equal temperature is not warmer.\n" +
            "- Break at the first warmer day, not the largest one.\n\n" +
            "**Complexity.** Time `O(n^2)` worst case; space `O(1)` beyond the output.\n\n" +
            "**Interview mindset.** State this to anchor correctness, then note the repeated re-scanning of the same future days is the waste a stack removes.",
          rcs:
            "class Solution:\n" +
            "    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:\n" +
            "        n = len(temperatures)\n" +
            "        answer = [0] * n\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):           # Scan forward for the first warmer day.\n" +
            "                if temperatures[j] > temperatures[i]:\n" +
            "                    answer[i] = j - i           # Distance in days.\n" +
            "                    break\n" +
            "        return answer",
          plain:
            "class Solution:\n" +
            "    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:\n" +
            "        n = len(temperatures)\n" +
            "        answer = [0] * n\n" +
            "        for i in range(n):\n" +
            "            for j in range(i + 1, n):\n" +
            "                if temperatures[j] > temperatures[i]:\n" +
            "                    answer[i] = j - i\n" +
            "                    break\n" +
            "        return answer"
        },
        {
          name: "Optimized \u2014 Monotonic decreasing stack of indices",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The interview-preferred answer for any 'next greater/warmer element and its distance' question.",
          logic:
            "**What it asks.** For each day, the distance to the next strictly warmer day, in one linear pass.\n\n" +
            "**Why the naive idea fails.** The brute force re-scans the same future days over and over. The insight is that a day stays \u201cwaiting\u201d only until the first warmer day appears, and days already warmed never need to be revisited \u2014 so we should remember just the still-unresolved days.\n\n" +
            "**Key Idea.** Keep a stack of the days that are still waiting for a warmer temperature. When today's temperature exceeds the temperature of the day on top of the stack, today is that day's answer \u2014 pop it and record the distance. Repeat, because today might resolve several waiting days at once.\n\n" +
            "**What the stack holds.** The stack holds **indices** of days seen so far whose warmer day has not yet been found. Invariant: the temperatures at those indices are in **non-increasing** order from bottom to top (a monotonic decreasing stack). That ordering holds because any day whose temperature is `<=` a newcomer would already have been popped, so whatever remains under a pushed index is at least as warm.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize `answer` to all zeros and an empty stack.\n" +
            "2. Walk `i` from left to right with temperature `t = temperatures[i]`.\n" +
            "3. While the stack is non-empty and `t` is strictly greater than the temperature at the top index `j`: pop `j` and set `answer[j] = i - j`.\n" +
            "4. Push the current index `i`.\n" +
            "5. Any indices left on the stack at the end have no warmer future day and keep their `0`.\n\n" +
            "**Why it works.** An index is popped exactly when the first strictly warmer day to its right is found \u2014 and because the stack is monotonic, the day being resolved is genuinely the *nearest* warmer one (nothing warmer sat between them, or it would have popped this index earlier). Storing indices (not temperatures) lets `i - j` give the day count directly.\n\n" +
            "**Common Gotchas.**\n" +
            "- Push **indices**, not temperatures \u2014 you need the position to compute the distance.\n" +
            "- Use strict `>`; equal temperatures must stay on the stack (an equal day is not warmer).\n" +
            "- Use a `while`, not an `if`: one warm day can resolve several colder waiting days in a row.\n" +
            "- Leftover stack entries correctly remain `0` \u2014 no extra handling needed.\n\n" +
            "**Complexity.** Time `O(n)`: each index is pushed once and popped at most once, so the total work is linear despite the inner while. Space `O(n)`: a strictly decreasing input keeps every index on the stack.\n\n" +
            "**Interview mindset.** \u201cNext greater element\u201d and its distance-variant scream monotonic stack: keep the unresolved candidates ordered, and let each new element pop everything it dominates.",
          rcs:
            "class Solution:\n" +
            "    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:\n" +
            "        n = len(temperatures)\n" +
            "        answer = [0] * n\n" +
            "        stack = []                              # Indices of days still awaiting a warmer day.\n" +
            "        for i, t in enumerate(temperatures):    # Scan left to right.\n" +
            "            # Today is warmer than the day(s) waiting on top: resolve them.\n" +
            "            while stack and t > temperatures[stack[-1]]:\n" +
            "                j = stack.pop()                 # Day j finally gets a warmer day: today.\n" +
            "                answer[j] = i - j               # Distance in days.\n" +
            "            stack.append(i)                     # Today now waits for its own warmer day.\n" +
            "        return answer                           # Leftover indices stay 0 (never warmed).",
          plain:
            "class Solution:\n" +
            "    def dailyTemperatures(self, temperatures: List[int]) -> List[int]:\n" +
            "        n = len(temperatures)\n" +
            "        answer = [0] * n\n" +
            "        stack = []\n" +
            "        for i, t in enumerate(temperatures):\n" +
            "            while stack and t > temperatures[stack[-1]]:\n" +
            "                j = stack.pop()\n" +
            "                answer[j] = i - j\n" +
            "            stack.append(i)\n" +
            "        return answer"
        }
      ],
      patternRecognition: [
        "'Next greater/warmer element' or the distance to it \u2192 monotonic stack.",
        "You want to avoid re-scanning the same future elements repeatedly.",
        "Answer at i depends on the nearest later element bigger than it \u2192 stack of unresolved indices."
      ],
      interviewRecall: [
        "Monotonic DECREASING stack of INDICES (temps non-increasing bottom to top).",
        "On a warmer day, while-pop every colder waiting index and set answer = i - j.",
        "Strict > so equal temps stay; use while (one day can resolve many).",
        "Indices left on the stack keep 0 \u2014 no warmer day exists."
      ]
    },

    {
      id: "car-fleet",
      lc: 853,
      title: "Car Fleet",
      difficulty: "Medium",
      category: "Stack",
      link: "https://leetcode.com/problems/car-fleet/",
      meta: { pattern: "Monotonic Stack", dataStructure: "Stack of arrival times", technique: "Sort by position, compare times" },
      description:
        "Cars are driving toward a single destination on a one-lane road. The destination is `target` miles away. You are given two arrays: `position[i]` is the starting mile of car `i`, and `speed[i]` is its speed in miles per hour.\n\n" +
        "A faster car **cannot pass** a slower car ahead of it; it catches up and then travels at the slower car's speed. A group of cars bumper-to-bumper (or a single car) that arrives together is a **car fleet**.\n\n" +
        "Return the number of car fleets that will arrive at the destination. A car that catches up to a fleet exactly at the destination still counts as part of that fleet.",
      constraints: [
        "`n == position.length == speed.length`",
        "`1 <= n <= 10^5`",
        "`0 < target <= 10^6`",
        "`0 <= position[i] < target`, and all `position[i]` are **distinct**.",
        "`0 < speed[i] <= 10^6`"
      ],
      notes: [
        "Time for a car to reach the target is `(target - position) / speed`.",
        "Only cars behind can join a car ahead \u2014 so process cars from the one closest to the target (largest position) backward.",
        "A car catches the fleet ahead iff its time-to-target is <= the fleet-ahead's time; then it inherits that (slower) arrival time."
      ],
      examples: [
        {
          input: "target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]",
          output: "3",
          reasoning: "Sorted by position desc: car@10 (t=1), car@8 (t=1) \u2192 they meet and form one fleet arriving at t=1. car@5 (t=7) and car@3 (t=3) \u2014 3's time 3 <= ... actually car@3 catches car@5? car@0 (t=12). Fleets: {10,8}, {5,3... }, {0} \u2192 3 fleets.",
          visual:
            "```\nsort by position desc:  pos: 10  8  5  3  0\ntime=(target-pos)/speed:  1  1  7  3  12\n\nstack (arrival times), keep only cars that DON'T catch the one ahead:\n 1                -> fleet A (car@10)\n 1 <= 1 : joins A (car@8)               stack: [1]\n 7 > 1  : new fleet B (car@5)           stack: [1, 7]\n 3 <= 7 : joins B (car@3)               stack: [1, 7]\n 12 > 7 : new fleet C (car@0)           stack: [1, 7, 12]\n=> 3 fleets\n```"
        },
        {
          input: "target = 10, position = [3], speed = [3]",
          output: "1",
          reasoning: "A single car is always exactly one fleet."
        },
        {
          input: "target = 100, position = [0,2,4], speed = [4,2,1]",
          output: "1",
          reasoning: "Sorted desc: car@4 (t=96), car@2 (t=49), car@0 (t=25). Each later (behind) car has a smaller time, so it catches the one ahead; all merge into a single fleet arriving at t=96."
        },
        {
          input: "target = 10, position = [6,8], speed = [3,2]",
          output: "2",
          reasoning: "car@8 (t=1) is ahead; car@6 (t=4/3\u22481.33) is behind and slower to arrive, so it never catches up \u2014 two separate fleets."
        }
      ],
      approaches: [
        {
          name: "Sort by position, monotonic stack of arrival times",
          time: "O(n log n)",
          space: "O(n)",
          whenToUse: "The standard approach whenever 'who catches whom' depends on order along a line and a simple arrival metric.",
          logic:
            "**What it asks.** Count how many distinct fleets reach the target, given that a faster car behind a slower one merges into it and they then move as one.\n\n" +
            "**Why the naive idea fails.** Simulating positions over time (advancing every car tick by tick, detecting collisions) is complicated and slow. The cleaner observation is that whether two cars merge does not require simulation at all \u2014 it is decided entirely by their **time to reach the target**.\n\n" +
            "**Key Idea.** Compute each car's arrival time `(target - position) / speed`. Process cars ordered from the one **closest to the target** (largest position) toward the back. A car behind catches the car (fleet) ahead if and only if its own arrival time is **less than or equal to** the arrival time of that fleet ahead \u2014 because it would otherwise reach the target sooner, which is impossible without passing, so it must be held up and join. If its time is greater, it can never catch up and starts a new fleet.\n\n" +
            "**What the stack holds.** The stack holds the **arrival time of each fleet's lead car**, in the order fleets were created (front-most fleet at the bottom). Invariant: the stack is strictly **increasing** from bottom to top \u2014 each fleet that stays separate arrives strictly later than the fleet ahead of it. A car whose time does not exceed the current top does not push; it is absorbed into that top fleet.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Pair up `(position, speed)` and sort by position in **descending** order (front car first).\n" +
            "2. Walk the sorted cars. For each, compute `t = (target - position) / speed`.\n" +
            "3. If the stack is empty, or `t` is strictly **greater** than the top arrival time, this car cannot catch the fleet ahead \u2014 push `t` as a new fleet.\n" +
            "4. Otherwise (`t <=` top), it catches up and merges; do not push (it inherits the slower fleet's time).\n" +
            "5. The number of fleets is the stack's size.\n\n" +
            "**Why it works.** Going front to back, the car currently on top of the stack is the slowest-arriving lead of the nearest fleet ahead. If a behind car's free-running time is `<=` that, it must run into the fleet before the target and arrive with it, so it does not form a new group. Only a car that arrives strictly later escapes, forming a fresh fleet \u2014 exactly the pushes. Since each fleet lead is pushed once, the final stack size counts the fleets.\n\n" +
            "**Common Gotchas.**\n" +
            "- Sort by position **descending** (process the front car first); ascending order inverts the catch-up logic.\n" +
            "- The merge test is `t <= top` (`<=`, not `<`): catching the fleet exactly at the target still counts as joining.\n" +
            "- Compare **times**, not positions or speeds \u2014 a faster car can still be a separate fleet if it starts far enough back.\n" +
            "- Use float division for time; integer division would misjudge close cases.\n\n" +
            "**Complexity.** Time `O(n log n)` dominated by the sort (the single scan is `O(n)`). Space `O(n)` for the sorted pairs and the stack.\n\n" +
            "**Interview mindset.** When 'who merges with whom' is decided by a monotone quantity along an ordered line, sort by that order and sweep with a monotonic stack, pushing only the elements that survive as new groups.",
          rcs:
            "class Solution:\n" +
            "    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:\n" +
            "        # Pair cars and sort so the car closest to the target comes first.\n" +
            "        cars = sorted(zip(position, speed), reverse=True)\n" +
            "        stack = []                              # Arrival times of each fleet's lead car.\n" +
            "        for pos, spd in cars:                   # Front to back.\n" +
            "            time = (target - pos) / spd         # Hours for this car to reach the target.\n" +
            "            # New fleet only if it arrives strictly AFTER the fleet ahead (can't catch it).\n" +
            "            if not stack or time > stack[-1]:\n" +
            "                stack.append(time)              # Starts its own fleet.\n" +
            "            # else: time <= top -> it catches up and merges (do not push).\n" +
            "        return len(stack)                       # One entry per surviving fleet.",
          plain:
            "class Solution:\n" +
            "    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:\n" +
            "        cars = sorted(zip(position, speed), reverse=True)\n" +
            "        stack = []\n" +
            "        for pos, spd in cars:\n" +
            "            time = (target - pos) / spd\n" +
            "            if not stack or time > stack[-1]:\n" +
            "                stack.append(time)\n" +
            "        return len(stack)"
        }
      ],
      patternRecognition: [
        "Cars/entities on a line merging based on who catches whom \u2192 sort by position, sweep.",
        "Merge condition reduces to a single monotone quantity (arrival time) \u2192 monotonic stack.",
        "Process from the front (closest to target) so 'the fleet ahead' is already known."
      ],
      interviewRecall: [
        "time = (target - position) / speed; sort cars by position DESCENDING.",
        "Push a new fleet only when time > stack top; otherwise it merges.",
        "Use <= for the merge test (catching exactly at target still joins).",
        "Answer = number of items left on the stack (surviving fleet leads)."
      ]
    },

    {
      id: "largest-rectangle-in-histogram",
      lc: 84,
      title: "Largest Rectangle in Histogram",
      difficulty: "Hard",
      category: "Stack",
      link: "https://leetcode.com/problems/largest-rectangle-in-histogram/",
      meta: { pattern: "Monotonic Stack", dataStructure: "Stack of (index, height)", technique: "Extend back to start index on pop" },
      description:
        "Given an array `heights` where each element is the height of a bar of width 1 in a histogram, find the area of the **largest rectangle** that can be formed within the histogram.\n\n" +
        "The rectangle must have its base on the x-axis and can span any number of consecutive bars, its height limited by the shortest bar it covers.",
      constraints: [
        "`1 <= heights.length <= 10^5`",
        "`0 <= heights[i] <= 10^4`"
      ],
      notes: [
        "For a rectangle of a given height, you want it as wide as possible \u2014 extending left and right until you hit a strictly shorter bar.",
        "The optimal rectangle's height always equals some bar's height (it is capped by the shortest bar it spans).",
        "A monotonic stack finds, for each bar, how far left and right it can extend while staying the shortest \u2014 in one pass."
      ],
      examples: [
        {
          input: "heights = [2,1,5,6,2,3]",
          output: "10",
          reasoning: "The bars of heights 5 and 6 form a 2-wide rectangle of height 5 \u2192 area 10, the largest.",
          visual:
            "```\nidx:  0 1 2 3 4 5\nhgt:  2 1 5 6 2 3\n          #####      height 5 spans idx 2..3 (width 2) -> 5*2 = 10\n          ## ##\n```"
        },
        {
          input: "heights = [2,4]",
          output: "4",
          reasoning: "Best is the single bar of height 4 (area 4) vs. width-2 at height 2 (area 4) \u2014 tie at 4."
        },
        {
          input: "heights = [2,1,2]",
          output: "3",
          reasoning: "The height-1 bar lets a width-3 rectangle of height 1 (area 3) span the whole histogram, beating either height-2 bar alone."
        },
        {
          input: "heights = [6,2,5,4,5,1,6]",
          output: "12",
          reasoning: "Heights 5,4,5 (indices 2..4) form a width-3 rectangle of height 4 \u2192 area 12."
        },
        {
          input: "heights = [4,4,4,4]",
          output: "16",
          reasoning: "All equal: one flat rectangle of height 4 and width 4. The flush at the end is what emits this full-width area."
        }
      ],
      approaches: [
        {
          name: "Brute force \u2014 expand each bar",
          time: "O(n^2)",
          space: "O(1)",
          whenToUse: "A baseline to state before the stack; workable only for small inputs.",
          logic:
            "**What it asks.** The maximum-area axis-aligned rectangle fitting under the histogram outline.\n\n" +
            "**Why the naive idea works but is slow.** The optimal rectangle's height equals some bar `i`'s height, so for each bar expand left and right while neighbors are at least as tall, then area is `heights[i] * width`. Correct, but each expansion can be `O(n)`, giving `O(n^2)` \u2014 too slow at `10^5`.\n\n" +
            "**Key Idea.** Fix each bar as the limiting (shortest) height and measure how wide a rectangle at that height can grow.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. For each index `i`, move a pointer left while `heights[left-1] >= heights[i]`.\n" +
            "2. Move a pointer right while `heights[right+1] >= heights[i]`.\n" +
            "3. Width is `right - left + 1`; area is `heights[i] * width`.\n" +
            "4. Track the maximum area over all `i`.\n\n" +
            "**Why it works.** Every candidate rectangle is capped by its shortest bar, and this tries each bar as that cap with the widest span it allows.\n\n" +
            "**Common Gotchas.**\n" +
            "- Use `>=` when expanding so equal-height neighbors are included (and not double-limited).\n" +
            "- Guard the array bounds while expanding.\n\n" +
            "**Complexity.** Time `O(n^2)`; space `O(1)`.\n\n" +
            "**Interview mindset.** State this to fix the 'height = some bar, maximize width' framing, then note the repeated re-expansion is what the monotonic stack eliminates.",
          rcs:
            "class Solution:\n" +
            "    def largestRectangleArea(self, heights: List[int]) -> int:\n" +
            "        n = len(heights)\n" +
            "        best = 0\n" +
            "        for i in range(n):\n" +
            "            left = i\n" +
            "            while left - 1 >= 0 and heights[left - 1] >= heights[i]:\n" +
            "                left -= 1                       # Extend left over >= bars.\n" +
            "            right = i\n" +
            "            while right + 1 < n and heights[right + 1] >= heights[i]:\n" +
            "                right += 1                      # Extend right over >= bars.\n" +
            "            best = max(best, heights[i] * (right - left + 1))\n" +
            "        return best",
          plain:
            "class Solution:\n" +
            "    def largestRectangleArea(self, heights: List[int]) -> int:\n" +
            "        n = len(heights)\n" +
            "        best = 0\n" +
            "        for i in range(n):\n" +
            "            left = i\n" +
            "            while left - 1 >= 0 and heights[left - 1] >= heights[i]:\n" +
            "                left -= 1\n" +
            "            right = i\n" +
            "            while right + 1 < n and heights[right + 1] >= heights[i]:\n" +
            "                right += 1\n" +
            "            best = max(best, heights[i] * (right - left + 1))\n" +
            "        return best"
        },
        {
          name: "Optimized \u2014 Monotonic increasing stack of (index, height)",
          time: "O(n)",
          space: "O(n)",
          whenToUse: "The definitive linear solution; a must-know monotonic-stack template.",
          logic:
            "**What it asks.** The largest rectangle under the histogram, computed in one linear pass.\n\n" +
            "**Why the naive idea fails.** The brute force re-expands over the same bars repeatedly. The fix is to discover, as we scan, exactly where each bar's rectangle must **end** \u2014 and to remember how far back it could have **started**.\n\n" +
            "**Key Idea.** A bar can keep extending to the right as long as the bars stay at least as tall. The moment a **shorter** bar appears, every taller bar still \u201copen\u201d can no longer extend past this point, so its maximal rectangle is finalized right here. Maintain a stack of bars in increasing height; when the current bar is shorter than the top, pop and finalize.\n\n" +
            "**What the stack holds.** The stack holds pairs `(start_index, height)` of bars whose rectangle is still growing, kept in **strictly increasing height** from bottom to top (a monotonic increasing stack). Invariant: for each entry, `start_index` is the leftmost index at which a rectangle of that entry's height could begin \u2014 i.e., everything from `start_index` up to the current position is at least that tall.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Initialize an empty stack and `max_area = 0`.\n" +
            "2. For each `i` with height `h`, set `start = i`.\n" +
            "3. While the stack is non-empty and its top height is **greater** than `h`: pop `(idx, height)`, compute area `height * (i - idx)`, update `max_area`, and set `start = idx` \u2014 the current bar can extend back to where that taller popped bar began.\n" +
            "4. Push `(start, h)`.\n" +
            "5. **Flush at the end:** for each leftover `(idx, height)` on the stack, its rectangle extends all the way to the end, so its area is `height * (n - idx)`; update `max_area`.\n\n" +
            "**Why it works.** When a bar is popped, we have found the first strictly shorter bar to its right (the current `i`), and its stored `start` is the first index to its left where a bar that tall could begin \u2014 so `(i - idx)` is exactly its maximal width, and `height * (i - idx)` is its best rectangle. Carrying the popped `start` into the pushed bar is the trick that lets a short bar claim the width vacated by the taller bars it displaced. The flush handles bars that never met a shorter bar on their right \u2014 they extend to the array's end (equivalently, imagine a sentinel bar of height 0 appended, which pops everything).\n\n" +
            "**Common Gotchas.**\n" +
            "- Store the **start index**, not just the height \u2014 the width comes from where the rectangle could begin, which may be earlier than the popped bar's own index.\n" +
            "- Pop while the top is **strictly greater** than `h`; equal heights can share the same start and need not be popped.\n" +
            "- Do not forget the final flush (or append a height-0 sentinel); the tallest trailing bars are only finalized there.\n" +
            "- Width is `i - idx` at pop time (the current index minus the stored start), and `n - idx` during the flush.\n\n" +
            "**Complexity.** Time `O(n)`: each bar is pushed once and popped once. Space `O(n)` for the stack in the worst case (a strictly increasing histogram).\n\n" +
            "**Interview mindset.** 'Largest rectangle / span bounded by the nearest shorter element on each side' is the flagship monotonic-stack problem: keep an increasing stack, and let each shorter bar finalize the rectangles it closes off, carrying the freed start index forward.",
          rcs:
            "class Solution:\n" +
            "    def largestRectangleArea(self, heights: List[int]) -> int:\n" +
            "        stack = []                              # (start_index, height), heights increasing bottom->top.\n" +
            "        max_area = 0\n" +
            "        for i, h in enumerate(heights):\n" +
            "            start = i                           # How far left THIS bar can extend.\n" +
            "            # A shorter bar closes off every taller open bar: finalize them.\n" +
            "            while stack and stack[-1][1] > h:\n" +
            "                idx, height = stack.pop()\n" +
            "                max_area = max(max_area, height * (i - idx))  # Width = i - its start.\n" +
            "                start = idx                     # Current bar inherits the freed start index.\n" +
            "            stack.append((start, h))\n" +
            "        n = len(heights)\n" +
            "        # Flush: remaining bars extend to the end (like a height-0 sentinel).\n" +
            "        for idx, height in stack:\n" +
            "            max_area = max(max_area, height * (n - idx))\n" +
            "        return max_area",
          plain:
            "class Solution:\n" +
            "    def largestRectangleArea(self, heights: List[int]) -> int:\n" +
            "        stack = []\n" +
            "        max_area = 0\n" +
            "        for i, h in enumerate(heights):\n" +
            "            start = i\n" +
            "            while stack and stack[-1][1] > h:\n" +
            "                idx, height = stack.pop()\n" +
            "                max_area = max(max_area, height * (i - idx))\n" +
            "                start = idx\n" +
            "            stack.append((start, h))\n" +
            "        n = len(heights)\n" +
            "        for idx, height in stack:\n" +
            "            max_area = max(max_area, height * (n - idx))\n" +
            "        return max_area"
        }
      ],
      patternRecognition: [
        "'Largest rectangle / max span bounded by the nearest shorter bar on each side' \u2192 monotonic increasing stack.",
        "Answer at each element depends on how far it extends until a strictly smaller neighbor.",
        "You need previous-smaller and next-smaller for every element in one pass."
      ],
      interviewRecall: [
        "Monotonic INCREASING stack of (start_index, height).",
        "On a shorter bar, pop taller entries: area = height * (i - start).",
        "Carry the popped start index into the bar you push (it can extend back).",
        "Flush leftovers at the end with width n - start (or use a height-0 sentinel)."
      ]
    }
  ]);
})();
