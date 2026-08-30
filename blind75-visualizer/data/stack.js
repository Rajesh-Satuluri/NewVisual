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
            "**What it asks.** You are given a string built only from the six bracket characters `()[]{}`. Decide whether it is *valid*. Validity has three parts that all must hold at once: every open bracket is eventually closed, each close is of the **same type** as the open it resolves, and the brackets close in the **correct order** \u2014 the most recently opened bracket is always the first one to be closed.\n\n" +
            "The third part is the subtle one. It is what separates cleanly nested strings like `\"{[]}\"` from interleaved ones like `\"([)]\"`, where the pairs cross over each other instead of nesting.\n\n" +
            "**Why the naive idea fails.** The tempting shortcut is to just count: tally the opens and the closes of each type and check the totals agree. But counting is blind to order. It happily accepts `\"([)]\"` because there is one `(`, one `)`, one `[` and one `]` \u2014 the totals balance perfectly \u2014 even though the pairs interleave instead of nesting.\n\n" +
            "The lesson is that the problem is about *structure*, not quantity. At every moment you must know **exactly which bracket is still waiting to be closed**, and specifically which one is the most recent, because that is the only one a new closing bracket is allowed to match.\n\n" +
            "**Key Idea.** When a close bracket appears, it must match the **most recently opened** bracket that is still unclosed. \u201cThe most recent thing must be resolved first\u201d is precisely the definition of **LIFO** (last-in, first-out), and a **stack** is the data structure that gives you LIFO for free: you push onto the top and pop from the top, both in `O(1)`.\n\n" +
            "Pair the stack with a small lookup map from each close bracket to the open it requires \u2014 `{ ')': '(', ']': '[', '}': '{' }`. That turns every match into a single dictionary lookup and one comparison, instead of a tangle of nested `if`/`elif` branches for each bracket type.\n\n" +
            "**What the stack holds.** The stack holds every open bracket seen so far that has **not yet been closed**, with the most recent one on top. Read it bottom-to-top and it is the chain of currently open brackets from the outermost down to the innermost \u2014 so its top is always the next bracket that is allowed to close.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Create an empty stack and the close-to-open map. Scan the string left to right, one character at a time.\n" +
            "2. If the character is an **open** bracket, **push** it onto the stack \u2014 it now becomes the top and waits for its own closer.\n" +
            "3. If the character is a **close** bracket, look up the open it requires. Then check the stack: if it is non-empty **and** its top equals that required open, **pop** the top \u2014 this consumes the matching open and resolves the pair.\n" +
            "4. Otherwise \u2014 the top is the wrong type, or the stack is empty (a close with nothing open to match) \u2014 the string cannot be valid, so return `false` immediately.\n" +
            "5. After the scan finishes, return `true` only if the stack is **empty**.\n\n" +
            "**Why it works.** Every open bracket grows the stack by one; every correct close shrinks it by one. Because the top is always the most recently opened unclosed bracket, comparing a new closer against the top checks **type and nesting order simultaneously** in one step \u2014 the wrong type fails the equality test, and wrong order shows up as the wrong bracket sitting on top.\n\n" +
            "The final empty check is not optional. A string like `\"(((\"` passes every per-character step \u2014 there are no closes to go wrong \u2014 yet it is invalid because three opens were never closed. The string is valid if and only if the stack fills and drains back to exactly empty.\n\n" +
            "**Common Gotchas.**\n" +
            "- A close bracket arriving on an **empty** stack must be rejected \u2014 there is nothing to match it to. Check the stack is non-empty *before* you index its top.\n" +
            "- Do not forget the final empty check; a string of only opens passes every per-character step but is still invalid.\n" +
            "- Matching **type** matters, not just open-vs-close: `\"(]\"` must fail even though the counts balance.\n" +
            "- Order the guard as `stack and stack[-1] == ...` so short-circuit evaluation stops before `stack[-1]` ever touches an empty list.\n\n" +
            "**Complexity.** Time `O(n)`: a single pass, and each character is pushed and popped at most once. Space `O(n)`: an all-open string like `\"((((\"` holds up to `n` brackets on the stack at once.\n\n" +
            "**Interview mindset.** \u201cBalanced\u201d or \u201ccorrectly nested\u201d anything \u2014 brackets, HTML tags, nested expressions \u2014 is the signal to reach for a stack of the things still waiting to be closed, matching each new closer against the top. If you catch yourself worrying about *order of resolution*, that is LIFO calling your name.",
          rcs:
            "class Solution:  # LeetCode instantiates this class and calls isValid on the object.\n\n" +
            "    def isValid(self, s: str) -> bool:  # Return True iff every bracket in s closes with the right type in the right order.\n\n" +
            "        # ==================== PHASE 1: PREPARE ====================\n\n" +
            "        stack = []  # Holds every open bracket seen so far that has NOT yet been closed.\n" +
            "                    # Why a stack: the newest still-open bracket must close first (LIFO), and a list gives O(1) append/pop.\n" +
            "                    # State: the top, stack[-1], is always the most recently opened, still-unclosed bracket.\n" +
            "                    # Execution flow: Python continues to build the lookup map below.\n\n" +
            "        close_to_open = {   # Map each CLOSE bracket to the exact OPEN bracket it is allowed to match.\n" +
            "            ')': '(',       # A ')' may only close a '('.\n" +
            "            ']': '[',       # A ']' may only close a '['.\n" +
            "            '}': '{',       # A '}' may only close a '{'.\n" +
            "        }                   # Why a dict: one O(1) lookup replaces a chain of if/elif type checks.\n" +
            "                            # Execution flow: Python enters the scan loop.\n\n" +
            "        # ==================== PHASE 2: SCAN AND MATCH ====================\n\n" +
            "        for ch in s:  # Read the string one character at a time, left to right.\n" +
            "                      # Loop invariant: stack holds, bottom-to-top, every still-open bracket from outermost to innermost.\n" +
            "                      # Execution flow: after each character Python returns here for the next one.\n\n" +
            "            if ch in close_to_open:  # Is ch a CLOSE bracket (i.e. a key of the map)?\n" +
            "                                     # Why: only a close can resolve a pair; open brackets are handled in the else branch.\n\n" +
            "                # A close is valid ONLY if the stack is non-empty AND its top is exactly ch's required open.\n" +
            "                # 'stack and ...' short-circuits, so stack[-1] never indexes an empty list.\n" +
            "                # LIFO: the most recently opened bracket is precisely the one that must close first.\n" +
            "                if stack and stack[-1] == close_to_open[ch]:  # Does the newest open match ch's partner?\n" +
            "                    stack.pop()  # Matched: pop removes and returns the top open; the pair is now resolved.\n" +
            "                                 # State change: stack shrinks by one; the bracket below becomes the new top.\n" +
            "                                 # Execution flow: skip the else, fall to the loop end, then back to the for header.\n" +
            "                else:\n" +
            "                    return False  # Wrong type on top, or an empty stack (a close with nothing to match).\n" +
            "                                  # Execution flow: return ends isValid at once; no code below runs.\n" +
            "                                  # Why safe: a type mismatch or an orphan close can never become valid later.\n\n" +
            "            else:  # ch is not a close bracket, so it must be an OPEN bracket.\n" +
            "                stack.append(ch)  # Push it: append makes ch the new top, waiting for its own close later.\n" +
            "                                  # State change: stack grows by one; ch is now stack[-1].\n" +
            "                                  # Execution flow: end of iteration; Python returns to the for header for the next char.\n\n" +
            "        # ==================== PHASE 3: FINAL CHECK ====================\n\n" +
            "        return not stack  # Valid iff the stack is empty: every open bracket found its close.\n" +
            "                          # Why: leftovers (e.g. '(((') are opens that were never closed, so the string is invalid.\n" +
            "                          # Note: 'not stack' is True for an empty list and False otherwise (Python truthiness).\n" +
            "                          # Execution flow: this value is handed to the caller and isValid ends.",
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
            "**What it asks.** Design a stack that supports the usual `push`, `pop`, and `top`, plus one extra operation `getMin()` that returns the smallest element currently held. The catch that makes this a real problem is the performance bar: *every* operation, `getMin` included, must run in `O(1)` \u2014 constant time regardless of how many elements are on the stack.\n\n" +
            "**Why the naive idea fails.** The obvious implementation stores only the values and, whenever `getMin` is called, walks the whole stack to find the smallest. That works but is `O(n)` per `getMin`, which violates the bar. The next instinct is to keep a single `min` variable updated on every `push`. That answers `getMin` in `O(1)`, but it collapses on `pop`: the instant you remove the element that *was* the current minimum, that lone variable has no memory of what the minimum was *before* that element arrived, so it cannot be restored. You would be forced to rescan \u2014 back to `O(n)`. The missing ingredient is history: you need to know the minimum not just now, but as it stood at every earlier level.\n\n" +
            "**Key Idea.** Notice two facts. First, the minimum depends only on *which* elements are currently present, nothing else. Second, elements enter and leave a stack strictly at the top, in last-in-first-out order. Put those together: at the exact instant an element is pushed, you already know the minimum of everything at or below it \u2014 so *freeze* that value and store it right beside the element. The frozen min never needs recomputing, and because it travels in the same entry as its element, when that element is later popped its frozen min is discarded with it, and the entry now on top already carries the correct minimum for the smaller stack.\n\n" +
            "**What the stack holds.** Each entry is a pair `(val, cur_min)`, where `cur_min` is the smallest value among `val` and everything beneath it. The governing **invariant** is: the `cur_min` of the **top** pair always equals the minimum of the entire stack. Every method is built to preserve this invariant, and `getMin` simply trusts it.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `push(val)`: compute the new running minimum as `min(val, cur_min of the current top)`, or just `val` when the stack is empty and there is nothing below to compare against. Append the pair `(val, new_min)` so it becomes the new top.\n" +
            "2. `pop()`: remove the top pair. Discarding it also discards its frozen min, and the pair beneath \u2014 now the top \u2014 already holds the correct minimum for what remains.\n" +
            "3. `top()`: return the **value** component (index `0`) of the top pair.\n" +
            "4. `getMin()`: return the **cur_min** component (index `1`) of the top pair \u2014 a direct read of a precomputed number, with no scanning.\n\n" +
            "**Why it works.** Every method touches only the top of the list, and `append`, `pop`, and indexing `[-1]` are each `O(1)`, so the time bar is met everywhere. Correctness rests on the invariant: because each entry froze the minimum that was true when it was pushed, a `pop` automatically re-exposes the minimum that was correct one level down \u2014 no recomputation is ever needed. Duplicated minimums are handled for free: each copy of a repeated minimum stored its own `cur_min`, so removing one copy still leaves a pair on top whose `cur_min` is correct. That is exactly the case the single-variable approach could not survive.\n\n" +
            "**Common Gotchas.**\n" +
            "- The empty-stack case on `push`: with nothing below to compare against, the running min is simply `val` itself \u2014 guard for it before reading the top.\n" +
            "- Do not try to track the minimum with a single variable or a duplicate counter; store a frozen min *per element* so every level can be restored independently.\n" +
            "- `getMin` must read the top pair's stored min, not recompute the whole-list minimum. Trusting the invariant is precisely what keeps it `O(1)`.\n" +
            "- Remember `append` pushes to the top and `pop()` removes and returns the top; both operate on `stack[-1]`, which is why the whole design stays constant time.\n\n" +
            "**Complexity.** Time `O(1)` for every operation, since each only reads or mutates the top of the list. Space `O(n)`: one `(value, min)` pair is stored per element, so the auxiliary min data doubles the per-element storage but stays linear.\n\n" +
            "**Interview mindset.** When a structure must answer an aggregate (min, max, sum, ...) in `O(1)` while it keeps mutating, the reusable move is to **carry the answer alongside the data** \u2014 snapshot it as each element enters, so that a removal automatically restores the previous answer instead of forcing a rescan.",
          rcs:
            "class MinStack:  # LeetCode instantiates this class once and then calls push/pop/top/getMin on the object.\n\n" +
            "    # ==================== DESIGN: ONE STACK OF (value, running-min) PAIRS ====================\n" +
            "    # The whole trick: at the instant a value is pushed, freeze the minimum that is true with it on top,\n" +
            "    # and store that frozen min right beside the value in the SAME entry. It never needs recomputing,\n" +
            "    # and when the value leaves the stack its frozen min leaves with it, restoring the previous min for free.\n" +
            "    # INVARIANT: for the top pair (v, m), m equals the minimum of EVERY value currently in the stack.\n\n" +
            "    # ==================== __init__: set up the single backing list ====================\n\n" +
            "    def __init__(self):  # Runs once when LeetCode builds the MinStack object.\n" +
            "        self.stack = []  # Each entry is a pair (value, min-at-or-below-this-entry).\n" +
            "                         # Why a list: append, pop, and index [-1] are all O(1), which every method relies on.\n" +
            "                         # State: empty at construction; stack[-1] will always be the current top pair.\n" +
            "                         # Execution flow: the object is ready; LeetCode now calls the operations below.\n\n" +
            "    # ==================== push: add a value and freeze the new minimum ====================\n\n" +
            "    def push(self, val: int) -> None:  # Push val, recording the minimum that holds with val on top.\n" +
            "        # New running min = val vs. the min already on top (self.stack[-1][1]); if empty, val is the min alone.\n" +
            "        # Why: the minimum can only change by INCLUDING the just-pushed val, so compare val with the old min.\n" +
            "        cur_min = val if not self.stack else min(val, self.stack[-1][1])\n" +
            "        self.stack.append((val, cur_min))  # append pushes the pair to the TOP; it becomes the new stack[-1].\n" +
            "                                           # State change: stack grows by one; (val, cur_min) is now the top.\n" +
            "                                           # Why safe: cur_min is the min of val and all below, so the invariant holds.\n\n" +
            "    # ==================== pop: remove the top, restoring the previous minimum ====================\n\n" +
            "    def pop(self) -> None:  # Remove the top element (constraints guarantee the stack is non-empty).\n" +
            "        self.stack.pop()  # pop() removes and returns the top pair, discarding its frozen min with it.\n" +
            "                          # State change: stack shrinks by one; the pair below becomes the new top.\n" +
            "                          # Why safe: that lower pair already froze the correct min for its level, so getMin stays right.\n\n" +
            "    # ==================== top: read the current top value ====================\n\n" +
            "    def top(self) -> int:  # Return the value on top (constraints guarantee non-empty).\n" +
            "        return self.stack[-1][0]  # [-1] is the top pair; [0] is its VALUE component. O(1) read, no scan.\n\n" +
            "    # ==================== getMin: read the current minimum in O(1) ====================\n\n" +
            "    def getMin(self) -> int:  # Return the smallest value currently in the stack.\n" +
            "        return self.stack[-1][1]  # [-1] is the top pair; [1] is its frozen MIN, which the invariant says is the overall min.\n" +
            "                                  # Why O(1): the answer was precomputed at push time, so we just read it, never recompute.",
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
            "**What it asks.** Exactly the same problem as the pairs version \u2014 a stack whose `push`, `pop`, `top`, and `getMin` all run in `O(1)` \u2014 but solved with the framing many interviewers request by name: two parallel stacks rather than a single stack of pairs. The two approaches are algorithmically equivalent; this one just separates the values and the minimums into their own lists.\n\n" +
            "**Why the naive idea fails.** The same two traps apply. Scanning the stack for the minimum on each `getMin` is `O(n)`. A single `min` variable answers `getMin` in `O(1)` but cannot be recovered once you pop the very element that held it, because it stores no history of earlier minimums. As before, the cure is to remember the minimum *per level* \u2014 here that history lives in a dedicated second stack instead of inside each entry.\n\n" +
            "**Key Idea.** Keep the actual values in one stack and the running minimums in a second stack that rises and falls in lockstep with the first. The crucial discipline is to push onto the min stack on **every** `push` \u2014 even when the incoming value is not a new minimum, in which case you re-push the current minimum. Doing so guarantees the two stacks always have equal height, which in turn lets `pop` be trivial: remove the top of both, and the min stack's new top is automatically the minimum for the smaller stack.\n\n" +
            "**What the stacks hold.** `stack` holds the actual values in LIFO order, so `stack[-1]` is the current top. `min_stack` holds, at each level, the minimum of everything in `stack` up to and including that level, so `min_stack[-1]` is the current overall minimum. The governing **invariant** has two halves: `min_stack[-1]` always equals the minimum of the whole stack, and `len(min_stack) == len(stack)` at all times.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `push(val)`: `append` `val` to `stack`; then compute `min(val, min_stack[-1])` (or just `val` when `min_stack` is empty) and `append` that to `min_stack`. Both stacks grow by one, staying equal in height.\n" +
            "2. `pop()`: `pop()` from **both** stacks so they stay the same height; the value leaves `stack` and its level's minimum leaves `min_stack`, re-exposing the previous minimum underneath.\n" +
            "3. `top()`: return `stack[-1]`, the top of the value stack.\n" +
            "4. `getMin()`: return `min_stack[-1]`, a direct read of the current minimum with no scan.\n\n" +
            "**Why it works.** Because `min_stack` recorded the minimum as it stood at each level, popping the top of both stacks automatically re-exposes the minimum that was correct one level down \u2014 no recomputation is ever required, and the heights never drift because every push and every pop touches both lists. Duplicated minimums are safe for free: a repeated minimum value causes the current minimum to be pushed onto `min_stack` again (one push per value, no matter what), so popping one copy still leaves a correct minimum on top. Pushing to `min_stack` unconditionally is precisely what sidesteps the fragile duplicate-counting bookkeeping that trips people up. Note that `append` pushes to the top and `pop()` removes and returns the top, so every method is pure top-of-stack work.\n\n" +
            "**Common Gotchas.**\n" +
            "- Push to `min_stack` on *every* `push`, not only when a new minimum appears \u2014 otherwise the heights diverge and `pop` can no longer stay in sync.\n" +
            "- Always pop **both** stacks together; popping only `stack` leaves a stale minimum on top and corrupts `getMin` from then on.\n" +
            "- Handle the empty `min_stack` on the first push, where there is nothing below and the running min is simply `val`.\n" +
            "- Read `min_stack[-1]` for the minimum rather than recomputing it; the whole point is to trust the invariant and keep the read `O(1)`.\n\n" +
            "**Complexity.** Time `O(1)` per operation, since each only reads or mutates the top of a list. Space `O(n)`: two stacks of up to `n` entries each, so linear overall \u2014 the same order as the pairs version, just laid out as two lists.\n\n" +
            "**Interview mindset.** Two synchronized stacks are the classic textbook way to answer a running aggregate in `O(1)` while the structure keeps mutating. Keeping the two stacks at identical height is the design decision that turns `pop` into a mechanical, mistake-proof step and makes the whole thing easy to reason about out loud.",
          rcs:
            "class MinStack:  # LeetCode instantiates this class once and then calls push/pop/top/getMin on the object.\n\n" +
            "    # ==================== DESIGN: TWO PARALLEL STACKS (values + running minimums) ====================\n" +
            "    # stack holds the actual values. min_stack holds, at each level, the minimum of everything in stack\n" +
            "    # up to and including that level. Push onto BOTH on every push (even when val is NOT a new minimum),\n" +
            "    # so the two stacks always have IDENTICAL height and pop can blindly remove the top of each in lockstep.\n" +
            "    # INVARIANT: min_stack[-1] is always the current overall minimum, and len(min_stack) == len(stack).\n\n" +
            "    # ==================== __init__: set up the two backing lists ====================\n\n" +
            "    def __init__(self):  # Runs once when LeetCode builds the MinStack object.\n" +
            "        self.stack = []      # The actual values in LIFO order; stack[-1] is the current top value.\n" +
            "                             # State: empty at construction.\n" +
            "        self.min_stack = []  # Parallel stack of running minimums; min_stack[-1] is the current minimum.\n" +
            "                             # Why separate: it lets getMin be a single O(1) read of a precomputed value.\n" +
            "                             # Execution flow: the object is ready; LeetCode now calls the operations below.\n\n" +
            "    # ==================== push: add to values, and mirror the new minimum ====================\n\n" +
            "    def push(self, val: int) -> None:  # Push val onto stack and its running min onto min_stack.\n" +
            "        self.stack.append(val)  # append pushes val to the TOP of the value stack; it becomes stack[-1].\n" +
            "                                # State change: stack grows by one.\n" +
            "        # New min = val vs. the current min (min_stack[-1]); if min_stack is empty, val is the min alone.\n" +
            "        # Push on EVERY call (not only on a new minimum) so the two stacks stay exactly the same height.\n" +
            "        cur_min = val if not self.min_stack else min(val, self.min_stack[-1])\n" +
            "        self.min_stack.append(cur_min)  # Mirror the min onto min_stack; now both tops describe this level.\n" +
            "                                        # State change: min_stack grows by one; the two heights stay equal.\n" +
            "                                        # Why safe: cur_min is the min of val and all below, so the invariant holds.\n\n" +
            "    # ==================== pop: remove the top of BOTH, restoring the previous minimum ====================\n\n" +
            "    def pop(self) -> None:  # Remove the top element (constraints guarantee the stack is non-empty).\n" +
            "        self.stack.pop()      # pop() removes and returns the top value.\n" +
            "        self.min_stack.pop()  # Pop min_stack too so heights stay equal; this re-exposes the previous minimum.\n" +
            "                              # Why both: popping only stack would desync the heights and corrupt getMin.\n\n" +
            "    # ==================== top: read the current top value ====================\n\n" +
            "    def top(self) -> int:  # Return the value on top (constraints guarantee non-empty).\n" +
            "        return self.stack[-1]  # [-1] is the top of the value stack. O(1) read.\n\n" +
            "    # ==================== getMin: read the current minimum in O(1) ====================\n\n" +
            "    def getMin(self) -> int:  # Return the smallest value currently in the stack.\n" +
            "        return self.min_stack[-1]  # min_stack[-1] is the current minimum by the invariant. O(1) read, no scan.",
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
