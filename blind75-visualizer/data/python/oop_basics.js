/*
 * data/python/oop_basics.js — "Object-Oriented Python" (part 1 of 2).
 * A single running business case threads through every OOP topic: a small
 * ONLINE STORE order & payments system (Product, Customer, Order, Money,
 * PaymentMethod). The code is written the way it would look in real production
 * services — clear names, validation, no toy shortcuts — so the concepts land
 * in context, not in the abstract. Registered into window.PYDSA.
 *
 * Schema matches data/python/toolkit.js (whatIsIt/showMe/whyDsa/recognize/
 * traps/cpython/complexity/challenge). Every snippet is runnable and prints.
 */
window.PYDSA.register("Object-Oriented Python", [

  // ---------------------------------------------------------------- Classes & Objects
  {
    id: "oop-classes-objects",
    title: "Classes & Objects",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 2,
    prerequisites: [],
    tagline: "A class is the blueprint; an object is one thing built from it — how every real codebase models its domain.",

    whatIsIt: [
      "A <b>class</b> defines a <i>type</i> of thing in your system — a <code>Product</code>, an <code>Order</code>, a <code>User</code>. An <b>object</b> (or <i>instance</i>) is one concrete example built from that blueprint.",
      "The class says what data each instance carries (<b>attributes</b>) and what it can do (<b>methods</b>). Real services are mostly a set of such domain classes talking to each other.",
      "Two flavours of attribute: an <b>instance attribute</b> (<code>self.name</code>) is unique per object; a <b>class attribute</b> is shared by every instance — handy for constants like a currency code."
    ],

    showMe: {
      code:
        "class Product:\n" +
        "    \"\"\"One item the store sells.\"\"\"\n" +
        "    currency = \"USD\"                 # class attribute: shared by ALL products\n" +
        "\n" +
        "    def __init__(self, sku, name, price_cents):\n" +
        "        self.sku = sku               # instance attributes: unique per product\n" +
        "        self.name = name\n" +
        "        self.price_cents = price_cents\n" +
        "\n" +
        "mug = Product(\"SKU-1\", \"Coffee Mug\", 1299)\n" +
        "pen = Product(\"SKU-2\", \"Gel Pen\", 199)\n" +
        "\n" +
        "print(mug.name, mug.price_cents)     # Coffee Mug 1299\n" +
        "print(mug.currency, pen.currency)    # USD USD  (shared class attribute)\n" +
        "print(type(mug).__name__)            # Product\n" +
        "print(isinstance(mug, Product))      # True",
      caption: "Product is the blueprint; mug and pen are two independent objects. price_cents differs per object; currency is shared on the class."
    },

    whyDsa:
      "<p>Every non-trivial program models its problem as objects: a <code>ListNode</code> for a linked list, a <code>TreeNode</code> for a tree, a <code>Graph</code> holding an adjacency map. The interview data-structure problems you solve are literally small class designs.</p>" +
      "<pre class=\"why-pre\">class TreeNode:\n    def __init__(self, val, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right   → the node behind every tree problem</pre>" +
      "<p>In production the same idea scales up: an <code>Order</code> object bundles the customer, the line items and the total so the rest of the system passes one clean thing around instead of five loose variables.</p>",

    recognize: [
      { q: "“I keep passing the same 4 variables together everywhere”", think: "they're one thing → give them a class" },
      { q: "“Model a node / entity / record”", think: "define a class with __init__ setting its attributes" },
      { q: "“A value that's the same for every instance”", think: "class attribute (Product.currency), not set in __init__" },
      { q: "“What type is this object / is it one of X?”", think: "type(obj).__name__ and isinstance(obj, X)" }
    ],

    matchTags: ["class", "object", "oop", "node", "linked list", "tree", "model"],
    relatedProblems: ["add-two-numbers", "reverse-linked-list", "invert-binary-tree"],

    traps: [
      {
        bad: "class Product:\n    tags = []           # class attribute (shared!)\n    def add_tag(self, t):\n        self.tags.append(t)   # mutates the SHARED list",
        good: "class Product:\n    def __init__(self):\n        self.tags = []   # per-instance list, set in __init__",
        why: "A mutable class attribute is shared by every instance, so one product's add_tag() changes ALL products. Per-object state belongs in __init__ as self.<name>. Reserve class attributes for constants."
      },
      {
        bad: "mug = Product                     # forgot the parentheses\nmug.name                          # AttributeError: it's the class, not an object",
        good: "mug = Product(\"SKU-1\", \"Mug\", 1299)   # call the class to build an instance",
        why: "Product is the class object; Product(...) CALLS it to construct an instance. Referencing the bare class and treating it like an object is a classic mix-up."
      }
    ],

    cpython:
      "<p>An instance stores its attributes in a per-object dict, <code>obj.__dict__</code>. Attribute lookup checks the instance first, then the class (and its bases) — which is exactly why <code>mug.currency</code> finds the shared class attribute when the instance doesn't have its own. Defining <code>__slots__</code> replaces that dict with a fixed layout to save memory for millions of small objects (e.g. graph nodes).</p>",

    complexity: [
      { op: "Product(...)  (construct)", big_o: "O(1)", note: "Allocates the object and runs __init__; cost is just the work you do inside __init__." },
      { op: "obj.attr  (read/write)", big_o: "O(1) avg", note: "A dict lookup in the instance, falling back to the class — constant time like any hash lookup." },
      { op: "isinstance(obj, C)", big_o: "O(depth)", note: "Walks the class's inheritance chain, which is tiny in practice — effectively O(1)." }
    ],

    challenge: {
      prompt: "Define a Customer class with name and email set in __init__ and a class attribute count that isn't used yet. Create two customers and print each one's name and the class name via type().",
      starter: "class Customer:\n    # class attribute + __init__ here\n    pass\n\n# build two customers and print their names\n",
      solution:
        "class Customer:\n    count = 0\n    def __init__(self, name, email):\n        self.name = name\n        self.email = email\n\na = Customer(\"Asha\", \"asha@x.com\")\nb = Customer(\"Ravi\", \"ravi@x.com\")\nprint(a.name, b.name)              # Asha Ravi\nprint(type(a).__name__)            # Customer"
    }
  },

  // ---------------------------------------------------------------- Instance State & __init__
  {
    id: "oop-init-state",
    title: "Instance State & __init__",
    difficulty: "Beginner",
    estMinutes: 9,
    dsaRelevance: 2,
    prerequisites: ["oop-classes-objects"],
    tagline: "__init__ is the constructor that gives each object its starting state — and the home of the #1 Python OOP bug.",

    whatIsIt: [
      "<code>__init__(self, ...)</code> runs automatically right after a new object is created. Its job is to set up the object's starting <b>state</b> — the instance attributes it will carry for its lifetime.",
      "<code>self</code> is the object being built; <code>self.x = x</code> stores a value on <i>this</i> instance. It is passed automatically — you never write it at the call site.",
      "A default argument in <code>__init__</code> is evaluated <b>once</b>, when the function is defined. If that default is a mutable object (a list/dict), every instance ends up sharing the same one — the famous mutable-default trap."
    ],

    showMe: {
      code:
        "class Order:\n" +
        "    def __init__(self, customer, items=None):\n" +
        "        self.customer = customer\n" +
        "        # correct pattern: build a fresh list per order\n" +
        "        self.items = items if items is not None else []\n" +
        "        self.status = \"open\"          # sensible starting state\n" +
        "\n" +
        "a = Order(\"Asha\")\n" +
        "b = Order(\"Ravi\")\n" +
        "a.items.append(\"SKU-1\")             # only affects a\n" +
        "print(a.items)                       # ['SKU-1']\n" +
        "print(b.items)                       # []   (independent!)\n" +
        "print(a.customer, a.status)          # Asha open",
      caption: "Each Order gets its own items list because we create it inside __init__ (via the None sentinel), not as a default argument."
    },

    whyDsa:
      "<p>Setting up state in <code>__init__</code> is how you build the data structures interviews hand you — a linked-list node, a trie node, a disjoint-set. Getting the initial state right (empty list, empty dict, parent = self) is half the problem.</p>" +
      "<pre class=\"why-pre\">class TrieNode:\n    def __init__(self):\n        self.children = {}   # fresh dict PER node\n        self.is_word = False</pre>" +
      "<p>The mutable-default trap bites here too: if every TrieNode shared one <code>children</code> dict, the whole trie would collapse into one node. The None-sentinel pattern is the fix you'll reuse constantly.</p>",

    recognize: [
      { q: "“Give each object a fresh list/dict to fill”", think: "make it in __init__ (self.x = []), never a default arg" },
      { q: "“An optional collection argument with an empty default”", think: "def __init__(self, xs=None): self.xs = xs or []" },
      { q: "“What state should this object start in?”", think: "set every attribute the object will need, in __init__" },
      { q: "“All my objects mysteriously share data”", think: "mutable default argument — switch to the None sentinel" }
    ],

    matchTags: ["init", "constructor", "self", "state", "mutable default", "trie", "node"],
    relatedProblems: ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure"],

    traps: [
      {
        bad: "class Order:\n    def __init__(self, items=[]):   # DANGER: one shared list\n        self.items = items\n\na = Order(); a.items.append(1)\nb = Order()                     # b.items is [1] too!",
        good: "class Order:\n    def __init__(self, items=None):\n        self.items = items if items is not None else []",
        why: "The default [] is created once at definition time and reused by every call that omits the argument, so all those objects share one list. The None sentinel builds a new list each time."
      },
      {
        bad: "class Order:\n    def __init__(customer):     # forgot self\n        customer = customer",
        good: "class Order:\n    def __init__(self, customer):\n        self.customer = customer",
        why: "The first parameter of every instance method is the object itself, conventionally named self. Omit it and Python still passes the instance in as the first argument — leading to confusing errors."
      }
    ],

    cpython:
      "<p>Construction is two steps: <code>__new__</code> allocates the raw object, then <code>__init__</code> initialises it — you almost always customise only <code>__init__</code>. Default argument values are stored once on the function object (<code>func.__defaults__</code>), which is precisely why a mutable default is shared across calls. The idiomatic guard is <code>x if x is not None else []</code> (or <code>x or []</code> when an empty input should also be replaced).</p>",

    complexity: [
      { op: "__init__ body", big_o: "O(k)", note: "Whatever work you do to set up state; assigning a handful of attributes is O(1)." },
      { op: "self.x = v", big_o: "O(1) avg", note: "A write into the instance's attribute dict — constant time." },
      { op: "self.items = list(src)", big_o: "O(n)", note: "Copying an incoming collection into fresh per-instance state is linear in its size." }
    ],

    challenge: {
      prompt: "Write a Stack class whose __init__ gives each instance its own empty list _data. Add push(x) and pop(). Create two stacks, push to one, and show the other stays empty.",
      starter: "class Stack:\n    def __init__(self):\n        pass\n    # push / pop\n",
      solution:
        "class Stack:\n    def __init__(self):\n        self._data = []\n    def push(self, x):\n        self._data.append(x)\n    def pop(self):\n        return self._data.pop()\n\ns, t = Stack(), Stack()\ns.push(1); s.push(2)\nprint(s.pop())        # 2\nprint(t._data)        # []  (independent state)"
    }
  },

  // ---------------------------------------------------------------- Methods: instance/class/static
  {
    id: "oop-methods-kinds",
    title: "Methods: instance, class, static",
    difficulty: "Intermediate",
    estMinutes: 10,
    dsaRelevance: 1,
    prerequisites: ["oop-init-state"],
    tagline: "Three method kinds — one acts on the object, one on the class, one on neither. Knowing which to reach for is what makes an API read well.",

    whatIsIt: [
      "An <b>instance method</b> takes <code>self</code> and works with one object's data — <code>order.add_item(...)</code>. This is the default and the most common.",
      "A <b>classmethod</b> takes <code>cls</code> instead of <code>self</code> and is the idiomatic way to write <b>alternative constructors</b> — e.g. <code>Order.from_cart(cart)</code> — because it works correctly for subclasses too.",
      "A <b>staticmethod</b> takes neither; it's a plain function that just <i>lives</i> on the class for organisation — a pure helper like <code>Order.format_money(cents)</code> that needs no object or class state."
    ],

    showMe: {
      code:
        "class Order:\n" +
        "    tax_rate = 0.08\n" +
        "\n" +
        "    def __init__(self, customer):\n" +
        "        self.customer = customer\n" +
        "        self.items = []                      # list of (price_cents, qty)\n" +
        "\n" +
        "    def add_item(self, price_cents, qty=1):  # INSTANCE: uses self\n" +
        "        self.items.append((price_cents, qty))\n" +
        "\n" +
        "    @classmethod\n" +
        "    def from_cart(cls, customer, cart):      # CLASS: alternative constructor\n" +
        "        order = cls(customer)\n" +
        "        for price, qty in cart:\n" +
        "            order.add_item(price, qty)\n" +
        "        return order\n" +
        "\n" +
        "    @staticmethod\n" +
        "    def format_money(cents):                 # STATIC: pure helper\n" +
        "        return f\"${cents / 100:.2f}\"\n" +
        "\n" +
        "o = Order.from_cart(\"Asha\", [(1299, 2), (199, 1)])\n" +
        "print(len(o.items))                          # 2\n" +
        "print(Order.format_money(2797))              # $27.97",
      caption: "from_cart builds and returns a ready Order (classmethod); format_money is a self-contained utility (staticmethod); add_item mutates one order (instance)."
    },

    whyDsa:
      "<p>Classmethod factories are how clean designs offer more than one way to build an object without a tangle of optional arguments — <code>dict.fromkeys(...)</code> in the standard library is exactly this pattern.</p>" +
      "<pre class=\"why-pre\">@classmethod\ndef from_cart(cls, customer, cart): ...   → Order.from_cart(...)\n# cls (not the hard-coded name) means subclasses build the RIGHT type</pre>" +
      "<p>Interview-wise the distinction shows design maturity: an alternative constructor is a classmethod, a stateless utility is a staticmethod, and everything that touches one object's data is an instance method.</p>",

    recognize: [
      { q: "“Build the object a second way (from a dict, a file, a cart)”", think: "@classmethod factory returning cls(...)" },
      { q: "“A helper that needs neither the object nor the class”", think: "@staticmethod — a plain function grouped on the class" },
      { q: "“Do something with this object's data”", think: "instance method (self)" },
      { q: "“It must build the correct type for subclasses”", think: "classmethod with cls(...), not the hard-coded class name" }
    ],

    matchTags: ["classmethod", "staticmethod", "factory", "constructor", "method"],
    relatedProblems: [],

    traps: [
      {
        bad: "@staticmethod\ndef from_cart(customer, cart):\n    order = Order(customer)      # hard-codes Order\n    ...",
        good: "@classmethod\ndef from_cart(cls, customer, cart):\n    order = cls(customer)        # correct subclass\n    ...",
        why: "A factory should build cls, not a hard-coded class name. As a staticmethod hard-coding Order, a subclass ExpressOrder.from_cart(...) would wrongly return a plain Order. Use a classmethod and cls(...)."
      },
      {
        bad: "class Order:\n    def format_money(cents):     # missing self AND not marked static\n        return f\"${cents/100:.2f}\"\no = Order('a'); o.format_money(100)   # cents becomes the instance!",
        good: "    @staticmethod\n    def format_money(cents):\n        return f\"${cents/100:.2f}\"",
        why: "Without @staticmethod, calling it on an instance passes the object as the first argument, so 'cents' is actually the Order. Mark stateless helpers @staticmethod so they take exactly the args you wrote."
      }
    ],

    cpython:
      "<p><code>@classmethod</code> and <code>@staticmethod</code> are <b>descriptors</b> that change what gets passed as the implicit first argument: the class for classmethod, nothing for staticmethod. A normal function on a class is a descriptor too — that's the machinery that binds <code>self</code> when you access it through an instance.</p>",

    complexity: [
      { op: "instance / class / static call", big_o: "O(1) + body", note: "The dispatch itself is constant; total cost is whatever the method body does." },
      { op: "cls(...) inside a factory", big_o: "O(1) + __init__", note: "Same as any construction — the factory just wraps it with extra setup." }
    ],

    challenge: {
      prompt: "Add a classmethod Order.single(customer, price, qty) that returns an Order containing exactly one item, and a staticmethod is_free(price_cents) returning True when price is 0. Build one and test both.",
      starter: "class Order:\n    def __init__(self, customer):\n        self.customer = customer\n        self.items = []\n    def add_item(self, price, qty=1):\n        self.items.append((price, qty))\n    # add single() and is_free()\n",
      solution:
        "class Order:\n    def __init__(self, customer):\n        self.customer = customer\n        self.items = []\n    def add_item(self, price, qty=1):\n        self.items.append((price, qty))\n    @classmethod\n    def single(cls, customer, price, qty):\n        o = cls(customer); o.add_item(price, qty); return o\n    @staticmethod\n    def is_free(price_cents):\n        return price_cents == 0\n\no = Order.single(\"Asha\", 1299, 2)\nprint(len(o.items))          # 1\nprint(Order.is_free(0))      # True"
    }
  },

  // ---------------------------------------------------------------- Encapsulation & Properties
  {
    id: "oop-encapsulation-properties",
    title: "Encapsulation & Properties",
    difficulty: "Intermediate",
    estMinutes: 11,
    dsaRelevance: 1,
    prerequisites: ["oop-init-state"],
    tagline: "Guard your object's invariants: expose a clean surface, compute derived values with @property, and validate on the way in.",

    whatIsIt: [
      "<b>Encapsulation</b> means an object protects its own consistency. Callers use a small, safe surface; the messy internals (prefixed with a single underscore by convention, <code>self._items</code>) are “please don't touch”.",
      "<code>@property</code> turns a method into a read-only attribute, so a <b>computed</b> value like <code>order.total</code> looks like data but is recalculated on demand — it can never drift out of sync with the items.",
      "Add a matching <code>@x.setter</code> to run <b>validation</b> whenever the value is assigned, so an object can never be put into an invalid state (a negative quantity, an empty SKU)."
    ],

    showMe: {
      code:
        "class Order:\n" +
        "    def __init__(self, customer):\n" +
        "        self.customer = customer\n" +
        "        self._items = []                 # _ = internal; use add_item()\n" +
        "        self._discount = 0\n" +
        "\n" +
        "    def add_item(self, price_cents, qty=1):\n" +
        "        if qty <= 0:\n" +
        "            raise ValueError(\"qty must be positive\")\n" +
        "        self._items.append((price_cents, qty))\n" +
        "\n" +
        "    @property\n" +
        "    def subtotal(self):                  # computed, read-only\n" +
        "        return sum(price * qty for price, qty in self._items)\n" +
        "\n" +
        "    @property\n" +
        "    def discount(self):\n" +
        "        return self._discount\n" +
        "\n" +
        "    @discount.setter\n" +
        "    def discount(self, cents):           # validated on assignment\n" +
        "        if not (0 <= cents <= self.subtotal):\n" +
        "            raise ValueError(\"discount out of range\")\n" +
        "        self._discount = cents\n" +
        "\n" +
        "o = Order(\"Asha\")\n" +
        "o.add_item(1299, 2)\n" +
        "print(o.subtotal)                        # 2598\n" +
        "o.discount = 500                         # goes through the setter (valid)\n" +
        "print(o.discount)                        # 500",
      caption: "subtotal is always correct because it's recomputed from _items; discount can only be set to a valid amount because the setter guards it."
    },

    whyDsa:
      "<p>A property keeps a derived value honest. Store <code>total</code> as a plain attribute and every code path that changes items must remember to update it — miss one and the object lies. A computed property removes that entire class of bug.</p>" +
      "<pre class=\"why-pre\">@property\ndef subtotal(self):\n    return sum(p * q for p, q in self._items)   → can't go stale</pre>" +
      "<p>The same discipline underlies well-designed data structures: a size counter maintained on every push/pop, invariants checked at the boundary. Validate at the edges and the core logic stays simple.</p>",

    recognize: [
      { q: "“A value derived from other fields (total, area, is_empty)”", think: "@property that recomputes — never a stored copy" },
      { q: "“Reject bad values before they're stored”", think: "@x.setter that validates, then assigns self._x" },
      { q: "“Signal 'internal, don't rely on this'”", think: "single-underscore name: self._items" },
      { q: "“Expose read access but block writes”", think: "@property with no setter → assignment raises AttributeError" }
    ],

    matchTags: ["encapsulation", "property", "getter", "setter", "validation", "invariant"],
    relatedProblems: ["min-stack", "lru-cache"],

    traps: [
      {
        bad: "self.total = 0            # stored\ndef add_item(self, p, q):\n    self._items.append((p, q))   # forgot to update self.total!",
        good: "@property\ndef total(self):\n    return sum(p*q for p,q in self._items)",
        why: "A stored derived value must be updated on every mutation; miss one path and it silently goes stale. A computed @property is derived on read, so it is always consistent by construction."
      },
      {
        bad: "o.subtotal = 999          # looks fine, but subtotal is a read-only property\n# AttributeError: can't set attribute",
        good: "# change the inputs, not the derived value:\no.add_item(999, 1)",
        why: "A property with no setter is read-only — assigning to it raises. That's the point: you change the underlying items, and the derived value follows. Don't add a setter to a purely computed value."
      }
    ],

    cpython:
      "<p>Python has no truly private attributes — a single underscore is a convention the whole community honours. A <b>double</b> underscore (<code>__x</code>) triggers <i>name mangling</i> to <code>_ClassName__x</code>, which avoids accidental clashes in subclasses but is not real access control. <code>property</code> itself is a descriptor: it intercepts attribute access to run your getter/setter instead of touching an instance dict slot.</p>",

    complexity: [
      { op: "obj.prop  (computed)", big_o: "O(cost of body)", note: "A property runs its method on every read — cheap for a sum over a few items, but cache it if the computation is heavy and read in a loop." },
      { op: "obj.x = v  (via setter)", big_o: "O(validation)", note: "Runs your validation then stores — usually O(1), but as costly as the check you write." },
      { op: "self._x  (plain read)", big_o: "O(1) avg", note: "A normal instance-dict lookup; the underscore is only a naming convention." }
    ],

    challenge: {
      prompt: "Make a Rectangle with _width and _height set in __init__, a read-only @property area, and a width setter that rejects non-positive values. Build one, print area, then try setting a valid new width and print area again.",
      starter: "class Rectangle:\n    def __init__(self, w, h):\n        self._width = w\n        self._height = h\n    # area property, width property + setter\n",
      solution:
        "class Rectangle:\n    def __init__(self, w, h):\n        self._width = w\n        self._height = h\n    @property\n    def area(self):\n        return self._width * self._height\n    @property\n    def width(self):\n        return self._width\n    @width.setter\n    def width(self, w):\n        if w <= 0:\n            raise ValueError(\"width must be positive\")\n        self._width = w\n\nr = Rectangle(3, 4)\nprint(r.area)      # 12\nr.width = 5\nprint(r.area)      # 20"
    }
  }
]);
