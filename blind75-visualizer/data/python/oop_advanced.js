/*
 * data/python/oop_advanced.js — "Object-Oriented Python" (part 2 of 2).
 * Continues the online-store domain from oop_basics.js into the concepts that
 * separate toy code from production code: inheritance & polymorphism (payment
 * methods), dunder methods (a Money value object usable in sets/heaps),
 * dataclasses (boilerplate-free entities), and composition + interfaces (an
 * Order that OWNS its parts and depends on an abstract PaymentMethod).
 * Registered into window.PYDSA. Every snippet is runnable and prints.
 */
window.PYDSA.register("Object-Oriented Python", [

  // ---------------------------------------------------------------- Inheritance & Polymorphism
  {
    id: "oop-inheritance-polymorphism",
    title: "Inheritance & Polymorphism",
    difficulty: "Intermediate",
    estMinutes: 11,
    dsaRelevance: 1,
    prerequisites: ["oop-methods-kinds"],
    tagline: "Share a common interface across related types, then let each one behave its own way — the heart of extensible code.",

    whatIsIt: [
      "<b>Inheritance</b> lets a subclass reuse and specialise a base class. A <code>PaymentMethod</code> base defines the shared shape; <code>CreditCard</code> and <code>PayPal</code> inherit it and fill in the specifics.",
      "<code>super().__init__(...)</code> runs the base class's setup so shared state is initialised once, in one place, instead of copy-pasted into every subclass.",
      "<b>Polymorphism</b> is the payoff: code that calls <code>method.charge(amount)</code> works for <i>any</i> payment method without knowing which one it holds — each type supplies its own <code>charge</code>."
    ],

    showMe: {
      code:
        "class PaymentMethod:\n" +
        "    def __init__(self, owner):\n" +
        "        self.owner = owner\n" +
        "    def charge(self, cents):\n" +
        "        raise NotImplementedError        # subclasses must define this\n" +
        "\n" +
        "class CreditCard(PaymentMethod):\n" +
        "    def __init__(self, owner, last4):\n" +
        "        super().__init__(owner)          # reuse base setup\n" +
        "        self.last4 = last4\n" +
        "    def charge(self, cents):             # override\n" +
        "        return f\"Charged ${cents/100:.2f} to card ****{self.last4}\"\n" +
        "\n" +
        "class PayPal(PaymentMethod):\n" +
        "    def __init__(self, owner, email):\n" +
        "        super().__init__(owner)\n" +
        "        self.email = email\n" +
        "    def charge(self, cents):\n" +
        "        return f\"Charged ${cents/100:.2f} via PayPal ({self.email})\"\n" +
        "\n" +
        "# polymorphism: same call, different behaviour, no type checks\n" +
        "methods = [CreditCard(\"Asha\", \"4242\"), PayPal(\"Ravi\", \"r@x.com\")]\n" +
        "for m in methods:\n" +
        "    print(m.charge(1299))",
      caption: "The loop never asks what kind of payment method it holds — each object's own charge() runs. Adding a new method (StoreCredit) needs zero changes here."
    },

    whyDsa:
      "<p>Polymorphism is how you write code once and extend it forever: a checkout that loops over payment methods calling <code>charge</code> doesn't grow an <code>if/elif</code> branch for each new type — you just add a subclass.</p>" +
      "<pre class=\"why-pre\">for m in methods:\n    m.charge(total)   → one line handles every current AND future type</pre>" +
      "<p>The anti-pattern it replaces is a long type switch. If you catch yourself writing <code>if kind == 'card': ... elif kind == 'paypal': ...</code>, that is polymorphism asking to be born.</p>",

    recognize: [
      { q: "“Several types share behaviour but differ in the details”", think: "base class + subclasses that override the differing method" },
      { q: "“A growing if/elif on a 'type' field”", think: "replace with polymorphism — one method per subclass" },
      { q: "“Reuse the parent's __init__ then add more”", think: "super().__init__(...) first, then set subclass state" },
      { q: "“Call the same operation on a mixed list of objects”", think: "polymorphic method call — no isinstance needed" }
    ],

    matchTags: ["inheritance", "polymorphism", "super", "override", "subclass", "base class"],
    relatedProblems: [],

    traps: [
      {
        bad: "class CreditCard(PaymentMethod):\n    def __init__(self, owner, last4):\n        self.last4 = last4          # forgot super().__init__ -> no self.owner",
        good: "    def __init__(self, owner, last4):\n        super().__init__(owner)\n        self.last4 = last4",
        why: "Skipping super().__init__ means the base class's state (self.owner) is never set, so later code hits AttributeError. Call super().__init__(...) before adding subclass-specific attributes."
      },
      {
        bad: "for m in methods:\n    if isinstance(m, CreditCard): m.charge_card(...)\n    elif isinstance(m, PayPal): m.charge_pp(...)",
        good: "for m in methods:\n    m.charge(amount)   # one polymorphic call",
        why: "Branching on isinstance defeats the point of a shared interface and breaks the moment a new type is added. Give every subclass the same method name and call it directly."
      }
    ],

    cpython:
      "<p>Attribute and method lookup follows the <b>MRO</b> (Method Resolution Order) — <code>ClassName.__mro__</code> — walking the class then its bases left-to-right. <code>super()</code> doesn't mean “my parent”; it means “the next class in the MRO”, which is what makes cooperative multiple inheritance work correctly. Overriding is simply defining the same name lower in that chain so it's found first.</p>",

    complexity: [
      { op: "method lookup / dispatch", big_o: "O(MRO depth)", note: "Finds the first matching name up the (short) inheritance chain — effectively O(1)." },
      { op: "super().__init__(...)", big_o: "O(base init)", note: "Just runs the next class's initialiser; cost is that method's own work." },
      { op: "polymorphic call in a loop", big_o: "O(n · body)", note: "n objects, each running its own method — no extra cost from the polymorphism itself." }
    ],

    challenge: {
      prompt: "Define a base Shape with area() raising NotImplementedError, then Circle(r) and Square(s) overriding it. Put one of each in a list and print each area (use 3.14159 for pi).",
      starter: "class Shape:\n    def area(self):\n        raise NotImplementedError\n# Circle and Square\n",
      solution:
        "class Shape:\n    def area(self):\n        raise NotImplementedError\nclass Circle(Shape):\n    def __init__(self, r):\n        self.r = r\n    def area(self):\n        return 3.14159 * self.r ** 2\nclass Square(Shape):\n    def __init__(self, s):\n        self.s = s\n    def area(self):\n        return self.s ** 2\n\nfor sh in [Circle(2), Square(3)]:\n    print(round(sh.area(), 2))   # 12.57  then  9"
    }
  },

  // ---------------------------------------------------------------- Dunder Methods
  {
    id: "oop-dunder-methods",
    title: "Dunder Methods",
    difficulty: "Advanced",
    estMinutes: 12,
    dsaRelevance: 3,
    prerequisites: ["oop-inheritance-polymorphism"],
    tagline: "Implement __repr__, __eq__, __hash__, __lt__ and your object works with print, ==, set, dict and heapq — the direct DSA payoff.",

    whatIsIt: [
      "<b>Dunder</b> (double-underscore) methods let your object plug into Python's built-in syntax. Define them and <code>print(obj)</code>, <code>a == b</code>, <code>obj in a_set</code> and <code>sorted(objs)</code> all just work.",
      "The core four: <code>__repr__</code> (a useful debug string), <code>__eq__</code> (value equality), <code>__hash__</code> (lets the object live in a <b>set</b> or be a <b>dict key</b>), and <code>__lt__</code> (defines <code>&lt;</code>, so <code>sorted</code> and <code>heapq</code> can order it).",
      "There's a rule you must respect: if two objects are equal they must hash equal, so <code>__eq__</code> and <code>__hash__</code> have to agree — and both should be built from the same fields."
    ],

    showMe: {
      code:
        "class Money:\n" +
        "    def __init__(self, cents):\n" +
        "        self.cents = cents\n" +
        "    def __repr__(self):\n" +
        "        return f\"Money({self.cents})\"          # debug-friendly\n" +
        "    def __eq__(self, other):\n" +
        "        return isinstance(other, Money) and self.cents == other.cents\n" +
        "    def __hash__(self):\n" +
        "        return hash(self.cents)                 # agrees with __eq__\n" +
        "    def __lt__(self, other):\n" +
        "        return self.cents < other.cents         # enables sort / heapq\n" +
        "\n" +
        "import heapq\n" +
        "prices = [Money(300), Money(100), Money(300), Money(200)]\n" +
        "print(sorted(prices))                # uses __lt__ -> [100,200,300,300]\n" +
        "print(set(prices))                   # uses __eq__/__hash__ -> 3 distinct\n" +
        "print(Money(100) == Money(100))      # True (value equality)\n" +
        "heapq.heapify(prices)\n" +
        "print(heapq.heappop(prices))         # Money(100)  smallest first",
      caption: "One small class now behaves like a built-in value: printable, comparable, sortable, heap-able, and usable in a set — because it implements the right dunders."
    },

    whyDsa:
      "<p>This is the OOP topic that shows up most directly in interviews. The moment you want a custom object in a <b>heap</b> or a <b>set</b>, you need these dunders.</p>" +
      "<pre class=\"why-pre\">import heapq\nheapq.heappush(pq, node)   → needs node.__lt__\nseen.add(state)            → needs state.__eq__ and __hash__</pre>" +
      "<p>It also explains the classic heapq crash: pushing <code>(priority, obj)</code> tuples where two priorities tie makes Python compare the objects next — a <code>TypeError</code> unless the object defines <code>__lt__</code> (or you add a tie-breaker).</p>",

    recognize: [
      { q: "“Put a custom object in a heap / priority queue”", think: "define __lt__ (or push a (key, tie, obj) tuple)" },
      { q: "“Use objects as set members or dict keys”", think: "define __eq__ AND a matching __hash__" },
      { q: "“print(obj) shows <__main__.X object at 0x...>”", think: "add __repr__ for a readable representation" },
      { q: "“Compare / sort objects by a field”", think: "__eq__ for ==, __lt__ for ordering (or key= in sorted)" }
    ],

    matchTags: ["dunder", "magic method", "repr", "eq", "hash", "lt", "heap", "set", "comparable", "hashable"],
    relatedProblems: ["merge-k-sorted-lists", "find-median-from-data-stream", "task-scheduler"],

    traps: [
      {
        bad: "class Money:\n    def __eq__(self, other):\n        return self.cents == other.cents\n# defined __eq__ but not __hash__ -> object is now UNHASHABLE",
        good: "    def __hash__(self):\n        return hash(self.cents)   # define alongside __eq__",
        why: "Defining __eq__ makes Python set __hash__ to None (the object can't go in a set/dict) unless you also define __hash__. Equal objects must hash equal, so build both from the same fields."
      },
      {
        bad: "heapq.heappush(pq, (dist, node))   # node has no __lt__\n# TypeError when two dists tie and Python compares nodes",
        good: "heapq.heappush(pq, (dist, unique_id, node))   # tie-breaker before node\n# or give node an __lt__",
        why: "On a tie heapq compares the next tuple element. If that's an object with no ordering, it raises TypeError. Insert a unique tie-breaker (an index) before the object, or define __lt__ on it."
      }
    ],

    cpython:
      "<p>Operators are sugar for dunders: <code>a &lt; b</code> calls <code>a.__lt__(b)</code>, <code>a == b</code> calls <code>a.__eq__(b)</code>, <code>x in s</code> uses <code>__hash__</code> then <code>__eq__</code>. <code>functools.total_ordering</code> fills in <code>&gt;, &lt;=, &gt;=</code> from just <code>__eq__</code> and <code>__lt__</code>. And <code>heapq</code> only ever needs <code>__lt__</code> — it's the single comparison the heap is built on.</p>",

    complexity: [
      { op: "__eq__ / __lt__ call", big_o: "O(fields)", note: "Compares the fields you wrote — O(1) for a scalar like cents." },
      { op: "obj in set / dict key", big_o: "O(1) avg", note: "Hashes via __hash__ then confirms with __eq__ — the usual hash-table cost, so keep __hash__ cheap." },
      { op: "sorted(objs) / heap ops", big_o: "O(n log n) / O(log n)", note: "Standard costs; each comparison invokes your __lt__." }
    ],

    challenge: {
      prompt: "Give a Version class (major, minor) __eq__, __hash__ and __lt__ so that sorting [Version(1,2), Version(1,0), Version(2,0)] and de-duping via set() both work. Print the sorted list and how many are distinct.",
      starter: "class Version:\n    def __init__(self, major, minor):\n        self.major = major\n        self.minor = minor\n    def __repr__(self):\n        return f\"{self.major}.{self.minor}\"\n    # __eq__, __hash__, __lt__\n",
      solution:
        "class Version:\n    def __init__(self, major, minor):\n        self.major = major\n        self.minor = minor\n    def __repr__(self):\n        return f\"{self.major}.{self.minor}\"\n    def __eq__(self, o):\n        return (self.major, self.minor) == (o.major, o.minor)\n    def __hash__(self):\n        return hash((self.major, self.minor))\n    def __lt__(self, o):\n        return (self.major, self.minor) < (o.major, o.minor)\n\nvs = [Version(1,2), Version(1,0), Version(2,0)]\nprint(sorted(vs))          # [1.0, 1.2, 2.0]\nprint(len(set(vs)))        # 3"
    }
  },

  // ---------------------------------------------------------------- Dataclasses
  {
    id: "oop-dataclasses",
    title: "Dataclasses",
    difficulty: "Intermediate",
    estMinutes: 10,
    dsaRelevance: 2,
    prerequisites: ["oop-dunder-methods"],
    tagline: "@dataclass writes __init__, __repr__ and __eq__ for you — the production default for entities and value objects.",

    whatIsIt: [
      "A <b>dataclass</b> generates the boilerplate every simple data-holding class needs — <code>__init__</code>, <code>__repr__</code>, <code>__eq__</code> — from a few typed field declarations. You write the fields; the decorator writes the plumbing.",
      "<code>frozen=True</code> makes instances <b>immutable and hashable</b> — the right choice for value objects (a <code>Money</code>, a <code>Point</code>) you want to compare and drop in a set.",
      "For a mutable field default like a list, you must use <code>field(default_factory=list)</code> — the same mutable-default trap as before, solved the dataclass way."
    ],

    showMe: {
      code:
        "from dataclasses import dataclass, field\n" +
        "\n" +
        "@dataclass(frozen=True)          # immutable + hashable value object\n" +
        "class Money:\n" +
        "    cents: int\n" +
        "    currency: str = \"USD\"        # field with a default\n" +
        "\n" +
        "@dataclass\n" +
        "class Order:\n" +
        "    customer: str\n" +
        "    items: list = field(default_factory=list)   # fresh list per order\n" +
        "\n" +
        "a = Money(1299)\n" +
        "b = Money(1299)\n" +
        "print(a)                         # Money(cents=1299, currency='USD')  (free __repr__)\n" +
        "print(a == b)                    # True  (free __eq__ by value)\n" +
        "print(len({a, b}))              # 1     (frozen -> hashable, and equal)\n" +
        "\n" +
        "o = Order(\"Asha\")\n" +
        "o.items.append(\"SKU-1\")\n" +
        "print(Order(\"Ravi\").items)       # []   (independent, thanks to default_factory)",
      caption: "No hand-written __init__/__repr__/__eq__. frozen=True gives Money value-equality and hashability; default_factory gives each Order its own items list."
    },

    whyDsa:
      "<p>Dataclasses are the fastest way to define the little record types problems need — a point, an interval, a weighted edge — with a readable <code>__repr__</code> for debugging and value <code>__eq__</code> for tests, all for free.</p>" +
      "<pre class=\"why-pre\">@dataclass(frozen=True)\nclass Edge:\n    u: int\n    v: int\n    w: int      → hashable, comparable, printable — instant graph edge</pre>" +
      "<p>Add <code>order=True</code> and the dataclass also generates <code>__lt__</code> and friends from the field order, so instances sort and go straight into a heap — the dunder work of the previous topic, generated.</p>",

    recognize: [
      { q: "“A simple record: a few fields, no complex behaviour”", think: "@dataclass — skip the boilerplate __init__/__repr__/__eq__" },
      { q: "“An immutable value object usable in a set/dict”", think: "@dataclass(frozen=True) → hashable by value" },
      { q: "“A field that defaults to an empty list/dict”", think: "field(default_factory=list) — never a bare []" },
      { q: "“I want these to sort automatically”", think: "@dataclass(order=True) → generates __lt__ from field order" }
    ],

    matchTags: ["dataclass", "value object", "frozen", "default_factory", "record", "immutable"],
    relatedProblems: [],

    traps: [
      {
        bad: "@dataclass\nclass Order:\n    items: list = []     # ValueError: mutable default not allowed",
        good: "@dataclass\nclass Order:\n    items: list = field(default_factory=list)",
        why: "Dataclasses forbid a mutable default outright (they raise at class-definition time), steering you to default_factory, which builds a fresh list for each instance."
      },
      {
        bad: "@dataclass\nclass Money:\n    cents: int\ns = {Money(1)}          # TypeError: unhashable (default dataclass is mutable)",
        good: "@dataclass(frozen=True)\nclass Money:\n    cents: int\ns = {Money(1)}          # fine",
        why: "A plain dataclass is mutable, so it defines __eq__ but not __hash__ (unhashable, like any custom __eq__). frozen=True makes it immutable AND generates __hash__, so it can go in a set."
      }
    ],

    cpython:
      "<p><code>@dataclass</code> inspects the class's type annotations and code-generates the methods you asked for at class-creation time — there's no runtime magic per instance, so a dataclass is as fast as the hand-written equivalent. <code>frozen=True</code> blocks attribute assignment via a generated <code>__setattr__</code> and adds <code>__hash__</code>. For huge numbers of instances, add <code>@dataclass(slots=True)</code> (3.10+) to drop the per-instance dict.</p>",

    complexity: [
      { op: "construct / compare", big_o: "O(fields)", note: "Generated __init__/__eq__ touch each field once — same cost as writing them by hand." },
      { op: "hash (frozen)", big_o: "O(fields)", note: "Hashes the field tuple; keep the number of fields small for hot set/dict use." },
      { op: "field(default_factory=f)", big_o: "O(f)", note: "Calls the factory per instance to build a fresh default — O(1) for list/dict." }
    ],

    challenge: {
      prompt: "Define a frozen dataclass Point with x and y ints. Build two equal points and one different, put all three in a set, and print the set size (should be 2). Also print one point to show the free __repr__.",
      starter: "from dataclasses import dataclass\n# @dataclass(frozen=True) Point with x, y\n",
      solution:
        "from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Point:\n    x: int\n    y: int\n\np = Point(1, 2)\nprint(p)                       # Point(x=1, y=2)\nprint(len({Point(1,2), Point(1,2), Point(3,4)}))   # 2"
    }
  },

  // ---------------------------------------------------------------- Composition & Interfaces
  {
    id: "oop-composition-interfaces",
    title: "Composition & Interfaces",
    difficulty: "Advanced",
    estMinutes: 12,
    dsaRelevance: 1,
    prerequisites: ["oop-inheritance-polymorphism"],
    tagline: "Prefer HAS-A over IS-A, and depend on an interface, not a concrete class — the two ideas behind maintainable systems.",

    whatIsIt: [
      "<b>Composition</b> builds objects from other objects: an <code>Order</code> <i>has</i> a list of <code>LineItem</code>s and <i>has</i> a <code>PaymentMethod</code>. This “has-a” assembly is more flexible than deep “is-a” inheritance trees.",
      "An <b>interface</b> is the set of methods a collaborator must provide. Python expresses it two ways: an <b>ABC</b> (abstract base class) that <i>enforces</i> the methods, or <b>duck typing</b> — “if it has <code>charge()</code>, it's a payment method”.",
      "<b>typing.Protocol</b> gives you structural typing: any class with the right methods satisfies the protocol without inheriting anything — duck typing that a type checker can verify."
    ],

    showMe: {
      code:
        "from abc import ABC, abstractmethod\n" +
        "\n" +
        "class PaymentMethod(ABC):                 # the interface, enforced\n" +
        "    @abstractmethod\n" +
        "    def charge(self, cents): ...\n" +
        "\n" +
        "class CreditCard(PaymentMethod):\n" +
        "    def charge(self, cents):\n" +
        "        return f\"card:{cents}\"\n" +
        "\n" +
        "class Order:                              # COMPOSITION: Order has-a payment + items\n" +
        "    def __init__(self, payment):\n" +
        "        self.payment = payment            # depends on the INTERFACE, not a concrete type\n" +
        "        self.items = []\n" +
        "    def add(self, cents):\n" +
        "        self.items.append(cents)\n" +
        "    def checkout(self):\n" +
        "        return self.payment.charge(sum(self.items))\n" +
        "\n" +
        "o = Order(CreditCard())\n" +
        "o.add(1299); o.add(199)\n" +
        "print(o.checkout())                       # card:1498\n" +
        "try:\n" +
        "    PaymentMethod()                       # can't instantiate an abstract class\n" +
        "except TypeError as e:\n" +
        "    print(\"abstract:\", type(e).__name__)  # abstract: TypeError",
      caption: "Order is composed of items and a payment method, and only relies on charge(). Swap CreditCard for any PaymentMethod and checkout is unchanged; the ABC guarantees charge() exists."
    },

    whyDsa:
      "<p>“Depend on an interface, not a concrete class” is what makes code testable and swappable: in a test you pass a fake payment method with a <code>charge()</code> that records the call — no real network needed.</p>" +
      "<pre class=\"why-pre\">class FakePayment:\n    def charge(self, cents):\n        self.charged = cents      → duck-typed test double, no inheritance</pre>" +
      "<p>Composition also models data structures cleanly: a <code>Graph</code> <i>has</i> an adjacency dict; an <code>LRUCache</code> <i>has</i> a dict plus a doubly-linked list. Assembling small parts beats forcing an inheritance hierarchy that doesn't fit.</p>",

    recognize: [
      { q: "“X is made of / owns some Ys”", think: "composition — store them as attributes (has-a), don't inherit" },
      { q: "“Every collaborator must provide method M”", think: "ABC with @abstractmethod, or a typing.Protocol" },
      { q: "“Swap the real thing for a fake in tests”", think: "depend on the interface; pass a duck-typed stub" },
      { q: "“Inheritance tree is getting deep and awkward”", think: "favour composition — assemble behaviour from parts" }
    ],

    matchTags: ["composition", "interface", "abc", "abstractmethod", "protocol", "duck typing", "dependency"],
    relatedProblems: ["lru-cache"],

    traps: [
      {
        bad: "class Order(list):        # inherit from list to 'reuse' it\n    ...                    # now Order IS a list — leaks append/sort/etc.",
        good: "class Order:\n    def __init__(self):\n        self._items = []   # Order HAS a list; expose only what you mean to",
        why: "Inheriting from a container exposes its whole API and ties you to its behaviour. Composition (has-a) lets you expose only the methods your abstraction actually wants — the safer default."
      },
      {
        bad: "class PaymentMethod(ABC):\n    @abstractmethod\n    def charge(self, c): ...\nclass Broken(PaymentMethod):\n    pass\nBroken()               # TypeError: abstract method charge not implemented",
        good: "class Fixed(PaymentMethod):\n    def charge(self, c):\n        return c",
        why: "An ABC won't let you instantiate a subclass that hasn't implemented every @abstractmethod — a compile-time-ish guarantee that the interface is honoured. Implement all abstract methods before constructing."
      }
    ],

    cpython:
      "<p>An <code>ABC</code> uses the <code>ABCMeta</code> metaclass to block instantiation until all <code>@abstractmethod</code>s are overridden. <code>typing.Protocol</code> is checked <b>structurally</b> — a class matches by having the right methods, no inheritance required — and with <code>@runtime_checkable</code> even <code>isinstance</code> works. Python leans on duck typing throughout: <code>for x in obj</code> just needs <code>__iter__</code>, no declared interface.</p>",

    complexity: [
      { op: "delegated call (self.payment.charge)", big_o: "O(1) + body", note: "Composition adds one attribute hop then the real method — negligible overhead." },
      { op: "abstract-method enforcement", big_o: "O(1)", note: "Checked once at instantiation; no per-call cost." },
      { op: "isinstance vs Protocol", big_o: "O(1)", note: "Structural checks look for the required attributes; effectively constant." }
    ],

    challenge: {
      prompt: "Define an ABC Notifier with an abstract send(msg). Make EmailNotifier implement it. Then make an Alert class that is COMPOSED with a notifier and has fire(msg) delegating to it. Fire an alert and print the result.",
      starter: "from abc import ABC, abstractmethod\n# Notifier (ABC), EmailNotifier, Alert (composition)\n",
      solution:
        "from abc import ABC, abstractmethod\n\nclass Notifier(ABC):\n    @abstractmethod\n    def send(self, msg): ...\n\nclass EmailNotifier(Notifier):\n    def send(self, msg):\n        return f\"email: {msg}\"\n\nclass Alert:\n    def __init__(self, notifier):\n        self.notifier = notifier      # composition\n    def fire(self, msg):\n        return self.notifier.send(msg)\n\nprint(Alert(EmailNotifier()).fire(\"disk full\"))   # email: disk full"
    }
  }
]);
