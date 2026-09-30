/* ============================================================
   PyRef — Python Data
   python.js: Built-ins, Strings, Lists, Dicts, Sets + stubs
   ============================================================ */

window.PYREF_PYTHON = {
  lang: 'python', label: 'Python',
  groups: [

/* ══════════════════════════════════════════════════════════════
   GROUP 1 · STANDARD LIBRARY
══════════════════════════════════════════════════════════════ */
{
  label: 'Standard Library',
  cats: [

/* ── Built-in Functions ───────────────────────────────────── */
{
  key: 'builtins', label: 'Built-in Functions',
  fns: [

{
  id:'enumerate', name:'enumerate()', purpose:'Adds an index counter to any iterable',
  badge:['builtin','lazy','safe'], snippet:'for i, val in enumerate(seq):',
  sig:'enumerate(iterable, start=0)  →  enumerate object',
  meta:{ ret:'enumerate object', mut:false, time:'O(1) — lazy', space:'O(1) — no copy' },
  params:[
    { name:'iterable', type:'Iterable[T]', req:true, desc:'Any iterable — list, tuple, string, generator, dict, file…' },
    { name:'start',    type:'int', default:'0', desc:'Starting value for the counter. Use 1 for 1-based output.' }
  ],
  code:
`# Basic — replaces range(len(lst))
fruits = ['apple', 'banana', 'cherry']
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
# 0: apple  1: banana  2: cherry

# 1-based numbering
for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")
# 1. apple  2. banana  3. cherry

# Convert to list of tuples
list(enumerate(fruits))         # [(0,'apple'),(1,'banana'),(2,'cherry')]

# Build inverted index {value: index}
inv = {v: i for i, v in enumerate(fruits)}
# {'apple':0, 'banana':1, 'cherry':2}`,
  ba:{
    before:{ label:'Input list', rows:["'apple'","'banana'","'cherry'"] },
    after:{ label:'enumerate(fruits, start=1)', rows:['(1, \'apple\')','(2, \'banana\')','(3, \'cherry\')'] }
  },
  related:['zip()','range()','map()','iter()'],
  tags:['iteration','indexing','unpacking','lazy'],
  interview:[
    'Always prefer <code>enumerate(seq)</code> over <code>range(len(seq))</code> — cleaner and works on any iterable',
    'Find first index matching a condition: <code>next(i for i,v in enumerate(lst) if v &gt; 5)</code>',
    'Build inverted index dict: <code>{v:i for i,v in enumerate(lst)}</code>',
    'Modify list in-place while iterating: <code>lst[i] = transform(v)</code>',
  ],
  mistakes:[
    'Forgetting to unpack: <code>for x in enumerate(lst)</code> — x is a tuple, not the value',
    'Calling <code>list(enumerate(...))</code> when you only need to iterate — wastes O(n) memory',
    'Assuming <code>start</code> changes actual indices in the source list — it only shifts the counter',
  ],
  notes:[
    'Returns a lazy iterator — one-pass only. Wrap in <code>list()</code> if you need to iterate multiple times.',
    'Works on strings, generators, dict keys, file lines — not just lists.',
    '<code>start</code> can be negative: <code>enumerate(lst, -2)</code> counts -2, -1, 0…',
  ]
},

{
  id:'zip', name:'zip()', purpose:'Pairs elements from multiple iterables into tuples',
  badge:['builtin','lazy','safe'], snippet:'for a, b in zip(list1, list2):',
  sig:'zip(*iterables)  →  zip object (iterator of tuples)',
  meta:{ ret:'zip iterator', mut:false, time:'O(1) — lazy', space:'O(1)' },
  params:[
    { name:'*iterables', type:'Iterable...', req:true, desc:'Two or more iterables to pair up. Stops at the shortest.' }
  ],
  code:
`names  = ['Alice', 'Bob', 'Carol']
scores = [95, 82, 91]

for name, score in zip(names, scores):
    print(f"{name}: {score}")
# Alice: 95  Bob: 82  Carol: 91

# Build dict from two lists
dict(zip(names, scores))   # {'Alice':95,'Bob':82,'Carol':91}

# Unzip (transpose) — * unpacks list of tuples
pairs = [(1,'a'),(2,'b'),(3,'c')]
nums, chars = zip(*pairs)  # (1,2,3)  ('a','b','c')

# zip_longest fills missing values
from itertools import zip_longest
list(zip_longest([1,2,3],[10,20], fillvalue=0))
# [(1,10),(2,20),(3,0)]`,
  ba:{
    before:{ label:'Two lists', rows:["names = ['Alice','Bob','Carol']","scores = [95, 82, 91]"] },
    after:{ label:'zip(names, scores)', rows:["('Alice', 95)","('Bob', 82)","('Carol', 91)"] }
  },
  related:['enumerate()','map()','zip_longest()','dict()'],
  tags:['iteration','pairing','transpose','lazy'],
  interview:[
    'Combine two parallel arrays into a list of pairs or a dict in one line',
    'Unzip with <code>zip(*pairs)</code> — the transpose of a matrix',
    'Iterate over consecutive pairs: <code>zip(lst, lst[1:])</code>',
    'zip stops at the shortest — use <code>itertools.zip_longest</code> for padded behavior',
  ],
  mistakes:[
    'Forgetting zip stops at the shortest iterable — use zip_longest if lengths differ',
    'Trying to index a zip object — it is an iterator, convert with <code>list()</code> first',
    'Using zip to build a dict then immediately iterating — just iterate the zip directly',
  ],
  notes:[
    'In Python 3, zip is lazy (like a generator). In Python 2 it returned a list.',
    '<code>zip()</code> with no arguments returns an empty iterator.',
  ]
},

{
  id:'map', name:'map()', purpose:'Applies a function to every element of an iterable',
  badge:['builtin','lazy','safe'], snippet:'list(map(func, iterable))',
  sig:'map(function, *iterables)  →  map object',
  meta:{ ret:'map iterator', mut:false, time:'O(n) — lazy evaluation', space:'O(1)' },
  params:[
    { name:'function', type:'Callable', req:true, desc:'Function applied to each element. Can be a lambda, built-in, or method.' },
    { name:'*iterables', type:'Iterable...', req:true, desc:'One or more iterables. Multiple iterables → function receives one arg from each.' }
  ],
  code:
`nums = [1, 2, 3, 4, 5]

# Apply to each element
list(map(str, nums))           # ['1','2','3','4','5']
list(map(lambda x: x**2, nums))# [1,4,9,16,25]

# Multiple iterables — func gets one from each
list(map(lambda a,b: a+b, [1,2,3], [10,20,30]))
# [11, 22, 33]

# map vs list comprehension (equivalent):
[x**2 for x in nums]           # usually more readable
list(map(lambda x: x**2, nums))# can be faster with builtins

# Real use: parse strings to ints
list(map(int, "1 2 3".split())) # [1, 2, 3]`,
  related:['filter()','zip()','sorted()','list comprehension'],
  tags:['functional','transform','lazy','iteration'],
  interview:[
    'One-liner to convert list of strings to ints: <code>list(map(int, strs))</code>',
    'Cleaner with named functions; use list comprehension for lambdas (more readable)',
    'Multiple iterables: map applies func(a, b) — equivalent to starmap with zip',
    'map stops at the shortest iterable, just like zip',
  ],
  mistakes:[
    'Forgetting map returns an iterator — you must consume it (list, loop, etc.)',
    'Using map when a comprehension is more readable — map shines with existing named functions',
    'Assuming map modifies the original list — it always produces a new iterator',
  ],
  notes:[
    'Python 3 map is lazy; Python 2 returned a list.',
    'For simple transforms, list comprehensions are generally preferred in modern Python.',
  ]
},

{
  id:'filter', name:'filter()', purpose:'Returns elements for which a function returns True',
  badge:['builtin','lazy','safe'], snippet:'list(filter(func, iterable))',
  sig:'filter(function, iterable)  →  filter object',
  meta:{ ret:'filter iterator', mut:false, time:'O(n) — lazy', space:'O(1)' },
  params:[
    { name:'function', type:'Callable | None', req:true, desc:'Called with each element. Elements where it returns truthy are kept. Pass None to filter falsy values.' },
    { name:'iterable', type:'Iterable', req:true, desc:'The source iterable to filter.' }
  ],
  code:
`nums = [0, 1, '', 'hi', None, [], [1,2], False, True]

# Remove falsy values (None acts as identity)
list(filter(None, nums))     # [1, 'hi', [1,2], True]

# Custom predicate
evens = list(filter(lambda x: x%2==0, range(10)))
# [0, 2, 4, 6, 8]

# filter vs comprehension (equivalent):
[x for x in range(10) if x%2==0]
list(filter(lambda x: x%2==0, range(10)))

# Chain filter + map
result = list(map(str, filter(lambda x: x > 0, [-1,0,2,3])))
# ['2', '3']`,
  related:['map()','sorted()','any()','all()'],
  tags:['functional','filtering','lazy','iteration'],
  interview:[
    '<code>filter(None, lst)</code> removes all falsy values (0, "", None, [], False) in one call',
    'Prefer list comprehensions for readability when using lambdas',
    'Combine with map: <code>map(f, filter(pred, lst))</code>',
    'Useful with named predicates: <code>filter(str.isupper, words)</code>',
  ],
  mistakes:[
    'filter returns an iterator — must call list() to get a list',
    'Passing None as function filters falsy — not the same as passing a lambda that always returns True',
  ],
  notes:[
    'filter(None, seq) is a fast way to strip falsy values — commonly used in interviews.',
    'For most cases, comprehensions are more Pythonic than filter+lambda.',
  ]
},

{
  id:'sorted', name:'sorted()', purpose:'Returns a new sorted list from any iterable',
  badge:['builtin','on','safe'], snippet:'sorted(iterable, key=func, reverse=True)',
  sig:'sorted(iterable, *, key=None, reverse=False)  →  list',
  meta:{ ret:'new list', mut:false, time:'O(n log n) Timsort', space:'O(n)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Any iterable — list, tuple, set, dict, string, generator…' },
    { name:'key', type:'Callable | None', default:'None', desc:'Function applied to each element before comparing. Result used as sort key.' },
    { name:'reverse', type:'bool', default:'False', desc:'If True, sorts in descending order.' }
  ],
  code:
`nums = [3, 1, 4, 1, 5, 9, 2, 6]
sorted(nums)                        # [1,1,2,3,4,5,6,9] — original unchanged

# Sort strings case-insensitively
words = ['Banana','apple','Cherry']
sorted(words, key=str.lower)        # ['apple','Banana','Cherry']

# Sort by length, then alphabetically
sorted(words, key=lambda w: (len(w), w.lower()))

# Sort dict by value
d = {'a':3,'b':1,'c':2}
sorted(d.items(), key=lambda x: x[1])  # [('b',1),('c',2),('a',3)]

# Sort list of dicts
people = [{'name':'Bob','age':30},{'name':'Alice','age':25}]
sorted(people, key=lambda p: p['age'])

# Descending
sorted(nums, reverse=True)          # [9,6,5,4,3,2,1,1]`,
  ba:{
    before:{ label:'Original list', rows:['[3, 1, 4, 1, 5, 9]','(unchanged after sorted)'] },
    after:{ label:'sorted(nums)', rows:['[1, 1, 3, 4, 5, 9]','new list returned'] }
  },
  related:['list.sort()','reversed()','min()','max()'],
  tags:['sorting','functional','key function'],
  interview:[
    'Use <code>key=</code> instead of custom comparators — it is faster and more composable',
    'Sort stability: equal elements maintain their original order (useful for multi-key sorts)',
    'Multi-key sort with tuples: <code>key=lambda x: (x[0], -x[1])</code>',
    'Sort dict by value: <code>sorted(d.items(), key=lambda x: x[1])</code>',
    '<code>list.sort()</code> sorts in-place and returns None; <code>sorted()</code> returns a new list',
  ],
  mistakes:[
    'Using <code>list.sort()</code> when you need the original preserved — use <code>sorted()</code> instead',
    'Writing a cmp function (Python 2 style) — use <code>key=</code> in Python 3',
    'Sorting with <code>reverse=True</code> then expecting stable descending order for equal items',
  ],
  notes:[
    'Timsort is used internally — O(n log n) worst case, O(n) for nearly sorted data.',
    '<code>key=</code> is called once per element and the result is cached — efficient even for complex keys.',
  ]
},

{
  id:'range', name:'range()', purpose:'Generates an immutable sequence of integers',
  badge:['builtin','o1','safe'], snippet:'for i in range(n):',
  sig:'range(stop) | range(start, stop, step)',
  meta:{ ret:'range object', mut:false, time:'O(1) creation, O(1) membership', space:'O(1) always' },
  params:[
    { name:'start', type:'int', default:'0', desc:'Starting value (inclusive).' },
    { name:'stop',  type:'int', req:true, desc:'Ending value (exclusive).' },
    { name:'step',  type:'int', default:'1', desc:'Step size. Negative step counts backwards.' }
  ],
  code:
`list(range(5))           # [0,1,2,3,4]
list(range(2, 8))         # [2,3,4,5,6,7]
list(range(0, 10, 2))     # [0,2,4,6,8]
list(range(10, 0, -1))    # [10,9,8,7,6,5,4,3,2,1]
list(range(10, 0, -2))    # [10,8,6,4,2]

# O(1) membership test
999_999 in range(1_000_000)     # True — no list created

# Common patterns
for i in range(len(lst)):       # when index needed (prefer enumerate)
for i in range(n-1, -1, -1):   # reverse iterate by index
cols = list(range(m))           # generate column indices
matrix = [[0]*m for _ in range(n)]  # n×m matrix init`,
  related:['enumerate()','len()','list()'],
  tags:['iteration','sequences','indexing'],
  interview:[
    'Prefer <code>enumerate(lst)</code> over <code>range(len(lst))</code> when you need index+value',
    '<code>in range(n)</code> is O(1) — range stores only start/stop/step, not every value',
    'Reverse loop: <code>range(n-1, -1, -1)</code> or just <code>reversed(range(n))</code>',
    'Generate column/row indices for matrix problems without creating lists',
  ],
  mistakes:[
    '<code>range(5, 0)</code> returns empty range — you need <code>range(5, 0, -1)</code>',
    'Treating range as a list — it is a lazy object, use <code>list(range(n))</code> if you need a list',
    'range(n) in Python 3 is not the same as Python 2 range (Python 2 returned a list)',
  ],
  notes:[
    'range is a sequence type — supports <code>len</code>, indexing, slicing, and <code>in</code> — all O(1).',
    'Three forms: <code>range(stop)</code>, <code>range(start,stop)</code>, <code>range(start,stop,step)</code>.',
  ]
},

{
  id:'len', name:'len()', purpose:'Returns the number of items in a container',
  badge:['builtin','o1'], snippet:'n = len(container)',
  sig:'len(s)  →  int',
  meta:{ ret:'int', mut:false, time:'O(1) for built-in types', space:'O(1)' },
  params:[
    { name:'s', type:'Sized', req:true, desc:'Any object with a __len__ method: list, tuple, str, dict, set, range, bytes…' }
  ],
  code:
`len([1,2,3])         # 3
len('hello')          # 5
len({})               # 0
len(range(100))       # 100  ← O(1), no list created

# Common pattern: check non-empty
if lst:               # Pythonic: truthy check
if len(lst) > 0:      # less idiomatic but explicit

# Size of 2D list
matrix = [[1,2,3],[4,5,6]]
rows, cols = len(matrix), len(matrix[0])`,
  related:['range()','enumerate()','isinstance()'],
  tags:['containers','sizing'],
  interview:[
    'Use <code>if lst:</code> instead of <code>if len(lst) > 0</code> — more Pythonic',
    '<code>len()</code> on range, dict, set, str is always O(1)',
    'Custom classes: implement <code>__len__</code> to support <code>len()</code>',
  ],
  mistakes:[
    'Calling <code>len()</code> on generators or map/filter objects — they have no length',
    'Using <code>len(lst) == 0</code> instead of <code>not lst</code>',
  ],
  notes:['O(1) for all built-in containers — Python stores the count internally.']
},

{
  id:'isinstance', name:'isinstance()', purpose:'Checks if an object is an instance of a type',
  badge:['builtin','o1'], snippet:'isinstance(obj, (int, float))',
  sig:'isinstance(object, classinfo)  →  bool',
  meta:{ ret:'bool', mut:false, time:'O(1)', space:'O(1)' },
  params:[
    { name:'object',    type:'any', req:true, desc:'The object to check.' },
    { name:'classinfo', type:'type | tuple[type,...]', req:true, desc:'A type or tuple of types. Returns True if object is an instance of any of them.' }
  ],
  code:
`isinstance(42, int)              # True
isinstance(3.14, (int, float))   # True — tuple of types
isinstance('hi', str)            # True
isinstance([], (list, tuple))    # True

# Works with inheritance
class Animal: pass
class Dog(Animal): pass
d = Dog()
isinstance(d, Dog)    # True
isinstance(d, Animal) # True — subclass check

# Preferred over type() for type checking
type(d) == Animal     # False — exact type only, no inheritance
isinstance(d, Animal) # True  — respects subclasses`,
  related:['type()','issubclass()','hasattr()'],
  tags:['type checking','inheritance'],
  interview:[
    'Prefer <code>isinstance(obj, T)</code> over <code>type(obj) == T</code> — respects inheritance',
    'Pass a tuple for multi-type checks: <code>isinstance(x, (int, float))</code>',
    'Use instead of duck-typing checks in APIs that need to validate input types',
  ],
  mistakes:[
    'Using <code>type(x) is int</code> — fails for subclasses of int (like bool)',
    'isinstance(True, int) returns True — bool is a subclass of int in Python',
  ],
  notes:['bool is a subclass of int: <code>isinstance(True, int)</code> is True.']
},

{
  id:'any-all', name:'any() / all()', purpose:'Logical aggregation — True if any / all elements are truthy',
  badge:['builtin','lazy'], snippet:'any(x > 0 for x in seq)',
  sig:'any(iterable) → bool   |   all(iterable) → bool',
  meta:{ ret:'bool', mut:false, time:'O(n) worst case, short-circuits', space:'O(1)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Elements evaluated for truthiness. Short-circuits on first conclusive result.' }
  ],
  code:
`nums = [1, -2, 3, 0, 5]

any(x > 0 for x in nums)       # True  — at least one positive
all(x > 0 for x in nums)       # False — not all positive
all(x != 0 for x in nums)      # False — 0 is in the list

# Short-circuit behavior
any(print(x) or x>0 for x in [1,2,3])   # prints 1, returns True immediately

# Check all strings non-empty
words = ['apple', 'banana', '']
all(words)                      # False — '' is falsy

# Membership check in list of dicts
users = [{'admin':True},{'admin':False}]
any(u['admin'] for u in users)  # True`,
  related:['filter()','all()','sum()','bool()'],
  tags:['logic','aggregation','lazy','short-circuit'],
  interview:[
    '<code>any()</code> and <code>all()</code> short-circuit — use with generators, not list comprehensions',
    'Check if any element matches: <code>any(x == target for x in lst)</code>',
    '<code>all(lst)</code> returns True for empty iterables; <code>any(lst)</code> returns False for empty',
    'Replace manual loops: <code>found = False; for x in lst: if pred(x): found=True; break</code> → <code>any(pred(x) for x in lst)</code>',
  ],
  mistakes:[
    'Using <code>any([x>0 for x in lst])</code> — list is fully evaluated before any(). Use a generator instead.',
    'any([]) is False; all([]) is True — vacuous truth for empty iterables.',
  ],
  notes:['both short-circuit: any stops at first True, all stops at first False.']
},

{
  id:'sum-min-max', name:'sum() / min() / max()', purpose:'Numeric and comparison aggregation over iterables',
  badge:['builtin','on'], snippet:'total = sum(iterable)',
  sig:'sum(iterable, start=0)   min(*args, key=None)   max(*args, key=None)',
  meta:{ ret:'number / element', mut:false, time:'O(n)', space:'O(1)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Elements to aggregate. For min/max can also pass *args directly.' },
    { name:'start (sum)', type:'number', default:'0', desc:'Added to the sum. Use start=[] to concatenate lists.' },
    { name:'key (min/max)', type:'Callable', default:'None', desc:'Function to extract comparison key from each element.' }
  ],
  code:
`nums = [3, 1, 4, 1, 5, 9, 2, 6]
sum(nums)               # 31
min(nums)               # 1
max(nums)               # 9

# key= for complex objects
words = ['apple', 'fig', 'banana']
max(words, key=len)     # 'banana'
min(words, key=len)     # 'fig'

# Sum of squares
sum(x**2 for x in range(5))    # 0+1+4+9+16 = 30

# Flatten list of lists with sum
lists = [[1,2],[3,4],[5]]
sum(lists, [])                  # [1,2,3,4,5]  (start=[])

# min/max with default (avoid ValueError on empty)
min([], default=0)              # 0`,
  related:['sorted()','any()','all()','functools.reduce()'],
  tags:['aggregation','math','sequences'],
  interview:[
    'min/max with <code>key=</code> — find the object with smallest/largest attribute without sorting',
    '<code>sum(gen_expr)</code> — sum over generator, avoids creating intermediate list',
    '<code>min(lst, default=val)</code> — safe on empty iterables (Python 3.4+)',
    'sum() on list of lists flattens: <code>sum([[1],[2],[3]], [])</code>',
  ],
  mistakes:[
    'min([]) and max([]) raise ValueError on empty — use default= parameter',
    'sum(strs) raises TypeError — use "".join(strs) for string concatenation',
  ],
  notes:['sum with start=[] flattens but is O(n²) for large inputs — use itertools.chain.from_iterable instead.']
},

{
  id:'hasattr-getattr', name:'hasattr() / getattr() / setattr()', purpose:'Inspect and modify object attributes dynamically',
  badge:['builtin','o1'], snippet:'val = getattr(obj, name, default)',
  sig:'hasattr(obj, name)   getattr(obj, name, default=...)   setattr(obj, name, value)',
  meta:{ ret:'bool / any / None', mut:false, time:'O(1)', space:'O(1)' },
  params:[
    { name:'obj',  type:'object', req:true, desc:'Any Python object.' },
    { name:'name', type:'str', req:true, desc:'Attribute name as a string.' },
    { name:'default (getattr)', type:'any', default:'raises AttributeError', desc:'Returned if attribute does not exist.' }
  ],
  code:
`class Config:
    debug = True
    timeout = 30

cfg = Config()

hasattr(cfg, 'debug')          # True
hasattr(cfg, 'missing')        # False

getattr(cfg, 'debug')          # True
getattr(cfg, 'missing', None)  # None  ← no AttributeError

setattr(cfg, 'timeout', 60)    # cfg.timeout is now 60
setattr(cfg, 'new_field', 'x') # adds new_field attribute

# Dynamic dispatch pattern
for attr in ['debug', 'timeout', 'missing']:
    print(attr, getattr(cfg, attr, 'N/A'))`,
  related:['isinstance()','type()','vars()','dir()'],
  tags:['reflection','dynamic','introspection'],
  interview:[
    'Use <code>getattr(obj, name, default)</code> to safely read optional attributes',
    'Dynamic dispatch: call a method by string name — <code>getattr(obj, method_name)()</code>',
    '<code>hasattr(x, "__iter__")</code> — duck-type check for iterability without try/except',
    'Plugin patterns: route to handler via <code>getattr(handler, f"handle_{event}")()</code>',
  ],
  mistakes:[
    'hasattr internally calls getattr and checks for AttributeError — avoid using in tight loops',
    'setattr on built-in types (str, int) raises TypeError — only works on user-defined classes',
  ],
  notes:['hasattr(x, name) is equivalent to: try: getattr(x, name); return True except AttributeError: return False']
},

{
  id:'callable', name:'callable()', purpose:'Returns True if the object appears callable',
  badge:['builtin','o1'], snippet:'if callable(obj): obj()',
  sig:'callable(object)  →  bool',
  meta:{ ret:'bool', mut:false, time:'O(1)', space:'O(1)' },
  params:[{ name:'object', type:'any', req:true, desc:'Any Python object to check.' }],
  code:
`callable(print)          # True — built-in function
callable(len)            # True
callable(42)             # False
callable('hello')        # False

class MyClass:
    def __call__(self): pass

obj = MyClass()
callable(obj)            # True — has __call__

# Check before invoking
handlers = [print, 42, len]
for h in handlers:
    if callable(h):
        h("test")`,
  related:['hasattr()','getattr()','isinstance()'],
  tags:['reflection','callable','introspection'],
  interview:[
    'Check if a plugin or config value is a callable before invoking it',
    'Objects with <code>__call__</code> defined are callable — use this for callable objects pattern',
  ],
  mistakes:['callable() returns True for classes — calling a class creates an instance, not necessarily "calling" it in the usual sense.'],
  notes:['callable(x) is equivalent to hasattr(x, "__call__") but faster.']
},

] // end builtins.fns
}, // end builtins cat

/* ── Collections ──────────────────────────────────────────── */
{
  key:'collections', label:'Collections',
  fns:[
{
  id:'counter', name:'Counter', purpose:'Dict subclass for counting hashable objects',
  badge:['method'], snippet:'from collections import Counter\ncounts = Counter(seq)',
  sig:'Counter(iterable_or_mapping=None)',
  meta:{ ret:'Counter object', mut:true, time:'O(n) to build', space:'O(k) — k unique elements' },
  params:[{ name:'iterable', type:'Iterable', default:'None', desc:'Elements to count, or a mapping of element→count.' }],
  code:
`from collections import Counter

words = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple']
c = Counter(words)
# Counter({'apple':3,'banana':2,'cherry':1})

c['apple']             # 3
c['missing']           # 0  ← no KeyError (default 0)
c.most_common(2)       # [('apple',3),('banana',2)]

# Counter arithmetic
a = Counter(a=3, b=2)
b = Counter(a=1, b=4)
a + b   # Counter({'b':6,'a':4})
a - b   # Counter({'a':2})       — negative counts removed`,
  related:['defaultdict','dict.get()','sorted()'],
  tags:['counting','frequency','dict'],
  interview:[
    'Most common element: <code>Counter(lst).most_common(1)[0][0]</code>',
    'Frequency map in one line — replaces manual <code>d.get(k,0)+1</code> pattern',
    'Counter subtraction removes negative/zero counts — useful for inventory problems',
    'Anagram check: <code>Counter(s1) == Counter(s2)</code>',
  ],
  mistakes:['Counter[missing_key] returns 0, not KeyError — a feature, not a bug.'],
  notes:['Counter inherits all dict methods plus most_common(), elements(), subtract().']
},

{
  id:'defaultdict', name:'defaultdict', purpose:'Dict with automatic default values for missing keys',
  badge:['method'], snippet:'from collections import defaultdict\nd = defaultdict(list)',
  sig:'defaultdict(default_factory)',
  meta:{ ret:'defaultdict', mut:true, time:'O(1) per access', space:'O(n)' },
  params:[{ name:'default_factory', type:'Callable | None', req:true, desc:'Called with no args to produce default. Common: list, int, set, str.' }],
  code:
`from collections import defaultdict

# Group items by key
d = defaultdict(list)
for word in ['apple','ant','banana','bear','avocado']:
    d[word[0]].append(word)
# {'a':['apple','ant','avocado'],'b':['banana','bear']}

# Count with int default
counts = defaultdict(int)
for ch in 'mississippi':
    counts[ch] += 1
# {'m':1,'i':4,'s':4,'p':2}

# vs dict.setdefault
d2 = {}
d2.setdefault('a', []).append('apple')`,
  related:['Counter','dict.setdefault()','dict.get()'],
  tags:['grouping','counting','dict'],
  interview:[
    'Group-by pattern: <code>defaultdict(list)</code> — collect items under keys without key-exists checks',
    'Counting: <code>defaultdict(int)</code> — <code>d[key] += 1</code> without initializing',
    'Nested defaultdict: <code>defaultdict(lambda: defaultdict(int))</code>',
  ],
  mistakes:['defaultdict creates the key on access — don\'t use for "check if key exists" logic.'],
  notes:['default_factory is called with no args. If None, missing keys still raise KeyError.']
},

{
  id:'deque', name:'deque', purpose:'Double-ended queue — O(1) append/pop from both ends',
  badge:['method'], snippet:'from collections import deque\ndq = deque(maxlen=k)',
  sig:'deque(iterable=[], maxlen=None)',
  meta:{ ret:'deque', mut:true, time:'O(1) both ends, O(n) middle', space:'O(n)' },
  params:[
    { name:'iterable', type:'Iterable', default:'[]', desc:'Initial elements.' },
    { name:'maxlen', type:'int | None', default:'None', desc:'If set, deque auto-discards oldest elements when full.' }
  ],
  code:
`from collections import deque

dq = deque([1,2,3])
dq.appendleft(0)    # deque([0,1,2,3])
dq.append(4)        # deque([0,1,2,3,4])
dq.popleft()        # 0  ← O(1)  vs list.pop(0) which is O(n)
dq.pop()            # 4

# Sliding window (fixed size)
window = deque(maxlen=3)
for x in [1,2,3,4,5]:
    window.append(x)
    print(list(window))
# [1,2,3] [2,3,4] [3,4,5]

# BFS queue
from collections import deque
queue = deque([start_node])
while queue:
    node = queue.popleft()`,
  related:['list','Counter','heapq'],
  tags:['queue','BFS','sliding window','O(1)'],
  interview:[
    'BFS: use deque as queue — <code>popleft()</code> is O(1), list.pop(0) is O(n)',
    'Sliding window of fixed size: <code>deque(maxlen=k)</code> auto-evicts oldest',
    'Stack: use list (append/pop both O(1)). Queue: use deque (appendleft/popleft O(1)).',
  ],
  mistakes:['list.pop(0) is O(n) — use deque.popleft() for queue operations in performance-sensitive code.'],
  notes:['deque is a doubly-linked list of fixed-size blocks — O(1) at both ends, O(n) random access.']
},

  ] // end collections.fns
}, // end collections cat

/* ── Itertools ────────────────────────────────────────────── */
{
  key:'itertools', label:'Itertools',
  fns:[
{
  id:'itertools-chain', name:'chain()', purpose:'Chains multiple iterables into one continuous sequence',
  badge:['lazy'], snippet:'from itertools import chain\nfor x in chain(a, b, c):',
  sig:'itertools.chain(*iterables)  →  iterator',
  meta:{ ret:'chain iterator', mut:false, time:'O(1) creation', space:'O(1)' },
  params:[{ name:'*iterables', type:'Iterable...', req:true, desc:'Any number of iterables to chain end-to-end.' }],
  code:
`from itertools import chain

list(chain([1,2],[3,4],[5]))  # [1,2,3,4,5]

# Flatten one level deep
nested = [[1,2],[3,4],[5,6]]
list(chain.from_iterable(nested))   # [1,2,3,4,5,6]

# Better than sum([[...],[...]], []) — O(n) not O(n²)
# Iterate multiple dicts
merged = dict(chain(d1.items(), d2.items()))`,
  related:['zip()','itertools.product()','sum()'],
  tags:['flattening','chaining','lazy'],
  interview:[
    'Flatten one level: <code>chain.from_iterable(nested)</code> — O(n), unlike <code>sum(nested,[])</code> which is O(n²)',
    'Merge multiple iterables without creating intermediate lists',
  ],
  mistakes:['sum([[1],[2],[3]], []) flattens but is O(n²) — use chain.from_iterable instead.'],
  notes:['chain.from_iterable accepts a single iterable of iterables — useful when count is not known in advance.']
},

{
  id:'itertools-product', name:'product()', purpose:'Cartesian product of iterables (nested loops)',
  badge:['lazy'], snippet:'from itertools import product\nfor r, c in product(rows, cols):',
  sig:'itertools.product(*iterables, repeat=1)',
  meta:{ ret:'product iterator', mut:false, time:'O(n^k)', space:'O(k) per tuple' },
  params:[
    { name:'*iterables', type:'Iterable...', req:true, desc:'Iterables whose Cartesian product is computed.' },
    { name:'repeat', type:'int', default:'1', desc:'Repeat a single iterable this many times.' }
  ],
  code:
`from itertools import product

list(product([0,1],[0,1]))
# [(0,0),(0,1),(1,0),(1,1)]

# Grid traversal
for r, c in product(range(3), range(3)):
    print(r, c)   # all (row,col) combos

# Same as nested loops:
for a in [0,1]:
    for b in [0,1]:
        ...

# repeat= shorthand
list(product('AB', repeat=2))
# [('A','A'),('A','B'),('B','A'),('B','B')]`,
  related:['permutations()','combinations()','zip()'],
  tags:['combinatorics','nested loops','grid'],
  interview:[
    'Grid/matrix traversal: <code>product(range(rows), range(cols))</code>',
    'Replace deeply nested for loops — cleaner and easier to generalize',
    'Brute-force combinatorial search over multiple dimensions',
  ],
  mistakes:['product returns tuples, not lists — unpack or convert as needed.'],
  notes:['product([A],[B]) ≡ ((a,b) for a in A for b in B)']
},

{
  id:'itertools-combinations', name:'combinations() / permutations()', purpose:'All subsets / arrangements of given length',
  badge:['lazy'], snippet:'from itertools import combinations\nfor pair in combinations(lst, 2):',
  sig:'combinations(iterable, r)   permutations(iterable, r=None)',
  meta:{ ret:'iterator of tuples', mut:false, time:'O(C(n,r)) or O(P(n,r))', space:'O(r)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Elements to choose from.' },
    { name:'r', type:'int', req:true, desc:'Length of each output tuple.' }
  ],
  code:
`from itertools import combinations, permutations, combinations_with_replacement

lst = [1, 2, 3, 4]

# All pairs (no repetition, order doesn't matter)
list(combinations(lst, 2))
# [(1,2),(1,3),(1,4),(2,3),(2,4),(3,4)]

# All ordered pairs
list(permutations(lst, 2))
# [(1,2),(1,3),(1,4),(2,1),(2,3),(2,4),...]

# Pairs with replacement
list(combinations_with_replacement([1,2], 2))
# [(1,1),(1,2),(2,2)]`,
  related:['product()','chain()'],
  tags:['combinatorics','subsets','arrangements'],
  interview:[
    'Two-sum brute force: <code>combinations(nums, 2)</code> to try all pairs',
    'All permutations of a string: <code>permutations("abc")</code>',
    'Subsets of size k: <code>combinations(lst, k)</code>',
  ],
  mistakes:['combinations vs permutations: combinations ignores order (C(n,r)), permutations counts order (P(n,r)).'],
  notes:['Count without materializing: C(n,r) = math.comb(n,r); P(n,r) = math.perm(n,r)']
},


{
  id:'itertools-islice', name:'islice()', purpose:'Slice an iterator without materializing it — O(1) memory',
  badge:['lazy'], snippet:'from itertools import islice\nfirst10 = list(islice(gen, 10))',
  sig:'itertools.islice(iterable, stop)   islice(iterable, start, stop[, step])',
  meta:{ ret:'islice iterator', mut:false, time:'O(stop)', space:'O(1)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Any iterable, including infinite generators.' },
    { name:'stop', type:'int', req:true, desc:'Stop index (exclusive). Like range(stop).' },
    { name:'start', type:'int', default:'0', desc:'Start index.' },
    { name:'step', type:'int', default:'1', desc:'Step size.' }
  ],
  code:
`from itertools import islice, count

# Slice a generator — no materialization
gen = (x**2 for x in count())  # infinite: 0, 1, 4, 9, ...
first5 = list(islice(gen, 5))  # [0, 1, 4, 9, 16]

# Skip first 3, take next 5
list(islice(range(100), 3, 8)) # [3, 4, 5, 6, 7]

# Every other element
list(islice(range(10), 0, 10, 2))  # [0, 2, 4, 6, 8]

# Read first N lines of a file efficiently
with open('large_file.txt') as f:
    first_10 = list(islice(f, 10))`,
  related:['itertools.chain()','itertools.dropwhile()'],
  tags:['slicing','lazy','generators','memory-efficient'],
  interview:[
    'Use islice to consume the first N items of an infinite generator without creating a list',
    'Pagination pattern: <code>islice(items, page*size, (page+1)*size)</code>',
    'Cannot use negative indices — unlike list slicing',
  ],
  mistakes:['islice consumes the iterator — each call starts where the last left off if the same iterator is passed.'],
  notes:['Unlike list slicing, islice does not support negative indices and does not accept slice objects.']
},

{
  id:'itertools-groupby', name:'groupby()', purpose:'Groups consecutive elements by a key — requires sorting first',
  badge:['lazy'], snippet:'from itertools import groupby\nfor key, grp in groupby(sorted_data, key=fn):',
  sig:'itertools.groupby(iterable, key=None)',
  meta:{ ret:'(key, group_iterator) pairs', mut:false, time:'O(n)', space:'O(1)' },
  params:[
    { name:'iterable', type:'Iterable', req:true, desc:'Input data. MUST be sorted by the same key first.' },
    { name:'key', type:'Callable | None', default:'None', desc:'Function to extract group key. None = identity.' }
  ],
  code:
`from itertools import groupby

data = [
    {'dept':'Eng', 'name':'Alice'},
    {'dept':'Eng', 'name':'Bob'},
    {'dept':'HR',  'name':'Carol'},
]

# MUST sort first — groupby only groups consecutive equal keys
data.sort(key=lambda x: x['dept'])

for dept, members in groupby(data, key=lambda x: x['dept']):
    names = [m['name'] for m in members]
    print(f"{dept}: {names}")
# Eng: ['Alice','Bob']   HR: ['Carol']

# Run-length encoding
s = "aaabbbccddddee"
rle = [(k, len(list(g))) for k, g in groupby(s)]
# [('a',3),('b',3),('c',2),('d',4),('e',2)]`,
  related:['sorted()','collections.defaultdict'],
  tags:['grouping','run-length encoding','consecutive'],
  interview:[
    'Unlike SQL GROUP BY, groupby only groups CONSECUTIVE equal keys — sort first or use defaultdict',
    'Run-length encoding: <code>[(k, sum(1 for _ in g)) for k, g in groupby(s)]</code>',
    'The group iterator is consumed — convert to list immediately if needed twice',
  ],
  mistakes:['Calling groupby on unsorted data silently gives wrong groups — each new key change starts a new group.'],
  notes:['For non-consecutive grouping (like SQL), use defaultdict(list) instead.']
},

  ] // end itertools.fns
}, // end itertools cat

/* ── heapq ────────────────────────────────────────────────── */
{
  key:'heapq', label:'heapq',
  fns:[
{
  id:'heapq-basics', name:'heapq', purpose:'Min-heap operations — efficient smallest-element access in O(log n)',
  badge:['builtin'], snippet:'import heapq\nheapq.heappush(h, item)\nheapq.heappop(h)',
  sig:'heapq.heappush(heap, item)   heapq.heappop(heap)   heapq.heapify(list)',
  meta:{ ret:'item (heappop)', mut:true, time:'O(log n) push/pop, O(n) heapify', space:'O(n)' },
  params:[],
  code:
`import heapq

h = []
heapq.heappush(h, 5)
heapq.heappush(h, 2)
heapq.heappush(h, 8)
heapq.heappush(h, 1)
heapq.heappop(h)   # 1 — smallest always first

# heapify in-place — O(n)
nums = [5, 2, 8, 1, 9]
heapq.heapify(nums)
heapq.heappop(nums)   # 1

# K largest / K smallest
scores = [88, 72, 95, 61, 79, 100]
heapq.nlargest(3, scores)   # [100, 95, 88]
heapq.nsmallest(3, scores)  # [61, 72, 79]

# Max-heap workaround: negate values
heapq.heappush(h, -priority)
priority = -heapq.heappop(h)

# Priority queue with (priority, item) tuples
tasks = []
heapq.heappush(tasks, (3, 'low-priority'))
heapq.heappush(tasks, (1, 'urgent'))
heapq.heappop(tasks)   # (1, 'urgent')`,
  ba:{
    before:{ label:'Push: 5, 2, 8, 1', rows:['unordered list'] },
    after:{ label:'heappop sequence', rows:['1','2','5','8'] }
  },
  related:['sorted()','collections.deque'],
  tags:['heap','priority queue','O(log n)','k-largest'],
  interview:[
    'K largest elements: <code>heapq.nlargest(k, lst)</code> — O(n log k), better than full sort for small k',
    'K smallest elements: <code>heapq.nsmallest(k, lst)</code>',
    'Python has no max-heap — negate values: push <code>-x</code>, pop and negate result',
    'Running median: use two heaps — max-heap for lower half, min-heap for upper half',
    'Merge K sorted lists: <code>heapq.merge(*lists)</code> — lazy, O(n log k)',
  ],
  mistakes:['heapq is a min-heap only — negate values for max-heap behavior.'],
  notes:['heapq.merge(*iterables) lazily merges K sorted iterables without loading all into memory.']
},
  ] // end heapq.fns
}, // end heapq cat

/* ── functools ────────────────────────────────────────────── */
{
  key:'functools', label:'functools',
  fns:[
{
  id:'functools-lru-cache', name:'@lru_cache / @cache', purpose:'Memoize function results — cache expensive calls keyed by arguments',
  badge:['builtin'], snippet:'from functools import lru_cache\n@lru_cache(maxsize=None)\ndef fib(n): ...',
  sig:'@functools.lru_cache(maxsize=128)   @functools.cache  (Python 3.9+)',
  meta:{ ret:'wrapped function', mut:false, time:'O(1) cached, O(f(n)) miss', space:'O(maxsize)' },
  params:[
    { name:'maxsize', type:'int | None', default:'128', desc:'Max cache size. None = unbounded. Set to power of 2 for efficiency.' }
  ],
  code:
`from functools import lru_cache, cache

# Classic Fibonacci — exponential without cache, O(n) with
@lru_cache(maxsize=None)
def fib(n):
    if n < 2: return n
    return fib(n-1) + fib(n-2)

fib(100)   # instant, no stack overflow

# @cache is shorthand for lru_cache(maxsize=None) in 3.9+
@cache
def costly(n):
    return sum(range(n))

# Inspect cache
fib.cache_info()
# CacheInfo(hits=98, misses=101, maxsize=None, currsize=101)
fib.cache_clear()  # reset cache`,
  related:['functools.partial()','functools.reduce()'],
  tags:['memoization','cache','dynamic programming','performance'],
  interview:[
    'Turn exponential recursion into O(n) with one decorator — fib, coin change, climbing stairs',
    'Arguments must be hashable — lists, dicts, sets cannot be cache keys',
    'cache_clear() is essential in tests — cached state bleeds between test cases',
    '@cache (3.9+) is marginally faster than lru_cache(None) — prefer it for new code',
  ],
  mistakes:['Using lru_cache on a method with self as arg caches self and prevents GC — use a cache dict instead.'],
  notes:['lru_cache is thread-safe — safe to use in multithreaded code.']
},

{
  id:'functools-partial', name:'partial() / reduce()', purpose:'Freeze function arguments; fold a sequence to a single value',
  badge:['builtin'], snippet:'from functools import partial\ndouble = partial(operator.mul, 2)',
  sig:'partial(func, *args, **kwargs)   reduce(func, iterable[, initializer])',
  meta:{ ret:'partial object / single value', mut:false, time:'O(1) partial, O(n) reduce', space:'O(1)' },
  params:[
    { name:'func', type:'Callable', req:true, desc:'Function to partially apply or fold.' },
    { name:'*args/**kwargs', type:'any', req:false, desc:'Arguments to pre-fill.' }
  ],
  code:
`from functools import partial, reduce
import operator

# partial — freeze some arguments
def power(base, exp):
    return base ** exp

square = partial(power, exp=2)
cube   = partial(power, exp=3)
square(4)   # 16
cube(3)     # 27

# Useful with map
double = partial(operator.mul, 2)
list(map(double, [1,2,3,4]))   # [2,4,6,8]

# reduce — fold left (like accumulate with final value only)
reduce(operator.add, [1,2,3,4,5])         # 15
reduce(operator.mul, [1,2,3,4], 1)        # 24 (with initializer)
reduce(lambda a,b: a if a>b else b, [3,1,4,1,5])  # 5 (max)`,
  related:['lambda','map()','functools.lru_cache()'],
  tags:['functional','higher-order','partial application'],
  interview:[
    'partial creates specialized functions without subclassing or lambda boilerplate',
    'reduce(operator.add, lst) is the functional fold — equivalent to sum(lst)',
    'operator module has efficient C implementations: add, mul, lt, itemgetter, attrgetter',
  ],
  mistakes:['reduce with an empty iterable raises TypeError — always pass an initializer for safety.'],
  notes:['operator.attrgetter and operator.itemgetter are faster than lambdas for sorting keys.']
},
  ] // end functools.fns
}, // end functools cat

/* ── math & random ────────────────────────────────────────── */
{
  key:'math-random', label:'math & random',
  fns:[
{
  id:'math-basics', name:'math module', purpose:'Mathematical constants and functions — floor, ceil, sqrt, log, gcd, factorial',
  badge:['builtin'], snippet:'import math\nmath.sqrt(x)  math.gcd(a,b)  math.log(x,base)',
  sig:'math.floor/ceil/sqrt/log/gcd/lcm/factorial/comb/perm',
  meta:{ ret:'int or float', mut:false, time:'O(1) most ops', space:'O(1)' },
  params:[],
  code:
`import math

math.floor(3.7)      # 3  ← rounds toward -∞
math.ceil(3.2)       # 4  ← rounds toward +∞
math.trunc(3.9)      # 3  ← rounds toward 0

math.sqrt(16)        # 4.0
math.isqrt(17)       # 4  ← integer sqrt, no float issues (3.8+)

math.log(100, 10)    # 2.0
math.log2(8)         # 3.0
math.log10(1000)     # 3.0

math.gcd(12, 8)      # 4
math.lcm(4, 6)       # 12  (3.9+)
math.factorial(5)    # 120

# Combinatorics
math.comb(10, 3)     # 120 = C(10,3)
math.perm(10, 3)     # 720 = P(10,3)

math.pi              # 3.14159...
math.e               # 2.71828...
math.inf             # float infinity
math.isnan(float('nan'))   # True`,
  related:['random','functools.reduce()','numpy'],
  tags:['math','arithmetic','combinatorics','constants'],
  interview:[
    'Integer sqrt: <code>math.isqrt(n)</code> — exact, no float precision issues',
    'Check perfect square: <code>math.isqrt(n)**2 == n</code>',
    'LCM of a list: <code>functools.reduce(math.lcm, lst)</code>',
    'C(n,r) without materializing: <code>math.comb(n, r)</code>',
  ],
  mistakes:['math.sqrt returns float — use math.isqrt for integer square root without float precision issues.'],
  notes:['math functions only handle real numbers — use cmath for complex numbers.']
},

{
  id:'random-basics', name:'random module', purpose:'Pseudo-random numbers, choices, shuffles, and samples',
  badge:['builtin'], snippet:'import random\nrandom.choice(lst)  random.sample(lst, k)',
  sig:'random.random()  randint(a,b)  choice(seq)  choices(seq,k=1)  sample(seq,k)  shuffle(lst)',
  meta:{ ret:'varies', mut:false, time:'O(1) single, O(k) sample', space:'O(k)' },
  params:[],
  code:
`import random

random.random()              # float in [0.0, 1.0)
random.uniform(1.5, 3.5)    # float in [a, b]
random.randint(1, 10)        # int in [a, b] — inclusive on both ends
random.randrange(0, 10, 2)   # even int from 0, 2, 4, 6, 8

lst = ['a', 'b', 'c', 'd']
random.choice(lst)            # single random element
random.choices(lst, k=3)      # 3 elements WITH replacement
random.sample(lst, k=3)       # 3 elements WITHOUT replacement
random.shuffle(lst)            # in-place, returns None

# Weighted random choice
random.choices(['red','blue','green'], weights=[70,20,10], k=5)

# Reproducibility — same seed → same sequence
random.seed(42)
random.random()   # always same value`,
  related:['math','secrets'],
  tags:['random','sampling','simulation','reproducibility'],
  interview:[
    '<code>random.sample</code>: no replacement; <code>random.choices</code>: with replacement',
    'Use <code>random.seed(n)</code> in tests for reproducibility',
    'For cryptographic randomness use <code>secrets</code> module — random is NOT cryptographically secure',
    'Random shuffle implements Fisher-Yates — uniform, O(n)',
  ],
  mistakes:['random.randint(a,b) is inclusive on both ends — unlike range(a,b) which excludes b.'],
  notes:['secrets.choice/token_bytes/token_hex for security-sensitive code — never use random for passwords/tokens.']
},
  ] // end math-random.fns
}, // end math-random cat

{
  key:'json-module', label:'json',
  fns:[
  {
    id:'json-basics', name:'json.dumps / json.loads', purpose:'Serialize Python objects to JSON strings and deserialize back',
    badge:['python'], snippet:'import json\njson.dumps(data, indent=2)   json.loads(text)',
    sig:'json.dumps(obj, indent=None, sort_keys=False, ensure_ascii=True, default=None)\njson.loads(s)',
    meta:{ ret:'str | Any', mut:false, time:'O(n)', space:'O(n)' },
    params:[
      { name:'indent', type:'int | None', default:'None', desc:'Pretty-print with this many spaces. None produces compact one-line output.' },
      { name:'sort_keys', type:'bool', default:'False', desc:'Sort dictionary keys alphabetically — useful for reproducible output.' },
      { name:'default', type:'Callable | None', default:'None', desc:'Called for non-serializable objects; return a serializable substitute.' }
    ],
    code:
`import json

data = {"name":"Alice","age":30,"scores":[95,82,91],"active":True}

# Serialize: Python → JSON string
s = json.dumps(data)                      # compact single line
s = json.dumps(data, indent=2)            # pretty-printed
s = json.dumps(data, sort_keys=True)      # sorted keys

# Deserialize: JSON string → Python
obj = json.loads(s)    # dict/list/str/int/float/bool/None
obj["name"]            # "Alice"

# File I/O
with open("data.json","w") as f:
    json.dump(data, f, indent=2)          # write to file

with open("data.json") as f:
    obj = json.load(f)                    # read from file

# Custom serializer for non-JSON types (datetime, Decimal, etc.)
from datetime import datetime
import decimal

def custom_default(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    raise TypeError(f"Object {type(obj)} not serializable")

json.dumps({"ts": datetime.now()}, default=custom_default)

# Error handling
try:
    json.loads("not: valid json")
except json.JSONDecodeError as e:
    print(e.msg, e.lineno, e.colno)   # detailed error location`,
    related:['pathlib.Path.read_text()','collections.OrderedDict'],
    tags:['python','json','serialization','file I/O','stdlib'],
    interview:[
      'json.dumps (with s) → string; json.dump (no s) → file — same for loads/load',
      'Use indent=2 for human-readable output; omit for compact wire/storage format',
      'default= hook handles non-serializable types: datetime, Decimal, custom classes',
    ],
    mistakes:['json.dump() writes to a file object; json.dumps() returns a string — the s stands for "string".'],
    notes:['json.JSONDecodeError subclasses ValueError — catchable with either. e.lineno/e.colno pinpoints parse failures.']
  },
  ] // end json-module.fns
}, // end json-module cat

{
  key:'os-sys', label:'os / sys',
  fns:[
  {
    id:'os-sys-basics', name:'os / sys', purpose:'File system operations, environment variables, and interpreter introspection',
    badge:['python'], snippet:'import os, sys\nos.environ.get("HOME")\nsys.argv[1:]',
    sig:'os.path.*   os.environ   os.makedirs   sys.argv   sys.exit   sys.path',
    meta:{ ret:'varies', mut:false, time:'O(1) to O(n)', space:'O(n)' },
    params:[],
    code:
`import os, sys

# --- Environment variables ---
home = os.environ.get("HOME", "/tmp")  # safe: returns default, no error
db   = os.environ["DATABASE_URL"]      # raises KeyError if missing
os.environ["MY_VAR"] = "value"         # set for current process only

# --- os.path — path manipulation (prefer pathlib.Path in new code) ---
p = "/home/user/data/file.csv"
os.path.exists(p)                       # True / False
os.path.dirname(p)                      # "/home/user/data"
os.path.basename(p)                     # "file.csv"
os.path.splitext(p)                     # ("/home/user/data/file", ".csv")
os.path.join("data","2024","jan.csv")   # "data/2024/jan.csv"
os.path.abspath(".")                    # absolute path of cwd

# --- Directory operations ---
os.getcwd()                             # current working directory
os.listdir(".")                         # list entries (unsorted)
os.makedirs("a/b/c", exist_ok=True)     # create nested dirs safely
os.rename("old.txt","new.txt")
os.remove("file.txt")                   # delete a file

# --- sys — interpreter info ---
sys.argv        # command-line args; sys.argv[0] = script name
sys.argv[1:]    # user-supplied args

sys.exit(0)     # exit: 0 = success, non-zero = error
sys.path        # import search path (list of directories)
sys.version     # Python version string
sys.platform    # 'linux', 'darwin', 'win32'

# --- Walk a directory tree recursively ---
for root, dirs, files in os.walk("./data"):
    for fname in files:
        print(os.path.join(root, fname))`,
    related:['pathlib.Path','subprocess','shutil'],
    tags:['python','os','sys','environment','file system','CLI','stdlib'],
    interview:[
      'os.environ.get("KEY","default") is safer than os.environ["KEY"] — no KeyError on missing var',
      'Prefer pathlib.Path over os.path for new code — cleaner, chainable with the / operator',
      'sys.argv[1:] is how CLI scripts receive arguments; use argparse for structured arg parsing',
    ],
    mistakes:['os.makedirs without exist_ok=True raises FileExistsError if the directory already exists.'],
    notes:['shutil.copytree/shutil.rmtree for recursive copy/delete; shutil.which("cmd") to find executables on PATH.']
  },
  ] // end os-sys.fns
}, // end os-sys cat

  ] // end Standard Library cats
}, // end Standard Library group

/* ══════════════════════════════════════════════════════════════
   GROUP 2 · DATA TYPES
══════════════════════════════════════════════════════════════ */
{
  label: 'Data Types',
  cats: [

/* ── Strings ──────────────────────────────────────────────── */
{
  key:'strings', label:'Strings',
  fns:[

{
  id:'str-join', name:'str.join()', purpose:'Joins an iterable of strings with a separator',
  badge:['method','safe'], snippet:"sep.join(iterable)",
  sig:'separator.join(iterable)  →  str',
  meta:{ ret:'str', mut:false, time:'O(n)', space:'O(n)' },
  params:[{ name:'iterable', type:'Iterable[str]', req:true, desc:'An iterable of strings. All elements must be strings or TypeError is raised.' }],
  code:
`words = ['Hello', 'World']
' '.join(words)         # 'Hello World'
'-'.join(words)         # 'Hello-World'
''.join(words)          # 'HelloWorld'

# Join with newlines
'\n'.join(['line1', 'line2', 'line3'])

# Convert list of numbers to CSV string
nums = [1, 2, 3]
','.join(map(str, nums))  # '1,2,3'

# Join path parts (use os.path.join for paths)
'/'.join(['usr', 'local', 'bin'])  # 'usr/local/bin'`,
  related:['str.split()','str.replace()','map()'],
  tags:['strings','joining','concatenation'],
  interview:[
    'Always use join() to concatenate many strings — O(n) vs O(n²) for += in a loop',
    'Mixed types: convert first with map(str, nums) before joining',
    'sep.join([]) returns empty string — no error on empty list',
  ],
  mistakes:[
    'Using += in a loop: <code>s += x</code> creates a new string each time — O(n²). Use join().',
    'Non-string elements raise TypeError — always convert first.',
  ],
  notes:['join is called on the separator, not the list: "sep".join(lst) not lst.join("sep").']
},

{
  id:'str-split', name:'str.split()', purpose:'Splits a string into a list by separator',
  badge:['method','safe'], snippet:"s.split(sep, maxsplit=-1)",
  sig:'str.split(sep=None, maxsplit=-1)  →  list[str]',
  meta:{ ret:'list[str]', mut:false, time:'O(n)', space:'O(n)' },
  params:[
    { name:'sep', type:'str | None', default:'None', desc:'Separator string. None splits on any whitespace and strips leading/trailing.' },
    { name:'maxsplit', type:'int', default:'-1', desc:'Max number of splits. -1 means unlimited.' }
  ],
  code:
`'a,b,c'.split(',')          # ['a','b','c']
'  hello   world  '.split() # ['hello','world']  ← strips whitespace
'a::b::c'.split('::')       # ['a','b','c']
'a,b,c'.split(',', 1)       # ['a','b,c']  ← maxsplit=1

# Parse key=value pairs
'key=value'.split('=', 1)   # ['key','value']

# rsplit — split from the right
'a/b/c'.rsplit('/', 1)      # ['a/b','c']  ← useful for path/file splits

# splitlines — split on any line ending
'line1\nline2\r\nline3'.splitlines()  # ['line1','line2','line3']`,
  related:['str.join()','str.strip()','str.partition()'],
  tags:['strings','parsing','splitting'],
  interview:[
    '<code>split()</code> with no args: strips whitespace and handles multiple spaces — more robust than split(" ")',
    '<code>maxsplit=1</code>: split at first separator only — useful for key=value parsing',
    '<code>rsplit(sep, 1)</code>: split from right — get file extension, last path component',
  ],
  mistakes:[
    '"a  b".split(" ") → ["a","","b"] — double space creates empty string. Use split() without args.',
    'split() on empty string returns [""] not [] — check with if not s.strip() first.',
  ],
  notes:['s.split(sep) returns [""] for empty s, but s.split() returns [] — whitespace-splitting special case.']
},

{
  id:'str-strip', name:'str.strip()', purpose:'Removes leading and trailing characters (default: whitespace)',
  badge:['method','safe'], snippet:"s.strip()",
  sig:'str.strip(chars=None)  →  str',
  meta:{ ret:'str', mut:false, time:'O(n)', space:'O(n)' },
  params:[{ name:'chars', type:'str | None', default:'None', desc:'Set of characters to strip (not a substring). None strips all whitespace.' }],
  code:
`'  hello  '.strip()          # 'hello'
'  hello  '.lstrip()         # 'hello  '
'  hello  '.rstrip()         # '  hello'

# Strip specific characters (a set, not substring)
'###title###'.strip('#')     # 'title'
'abcXYZabc'.strip('abc')     # 'XYZ'

# Clean user input
user_input = '  Alice  \n'
clean = user_input.strip()   # 'Alice'

# Note: chars is a set of characters
'/path/to/'.strip('/')       # 'path/to'`,
  related:['str.split()','str.replace()','str.lstrip()','str.rstrip()'],
  tags:['strings','cleaning','whitespace'],
  interview:[
    'Always strip user input before processing — handles trailing newlines, spaces',
    '<code>chars</code> is a SET of characters, not a substring prefix/suffix',
    'Chain: <code>s.strip().lower().split()</code> for robust tokenization',
  ],
  mistakes:["'#hello#'.strip('#h') strips both '#' AND 'h' characters — it's a set, not a prefix."],
  notes:['strip(), lstrip(), rstrip() return new strings — strings are immutable.']
},

{
  id:'str-replace', name:'str.replace()', purpose:'Returns a copy with all occurrences of old replaced by new',
  badge:['method','safe'], snippet:"s.replace(old, new, count=-1)",
  sig:'str.replace(old, new, count=-1)  →  str',
  meta:{ ret:'str', mut:false, time:'O(n)', space:'O(n)' },
  params:[
    { name:'old', type:'str', req:true, desc:'Substring to replace.' },
    { name:'new', type:'str', req:true, desc:'Replacement substring.' },
    { name:'count', type:'int', default:'-1', desc:'Max replacements. -1 replaces all.' }
  ],
  code:
`s = 'hello world world'
s.replace('world', 'Python')    # 'hello Python Python'
s.replace('world', 'Python', 1) # 'hello Python world'  ← only first

# Remove a character
'hello'.replace('l', '')        # 'heo'

# Multiple replacements
s = 'a-b_c d'
for ch in '-_ ':
    s = s.replace(ch, '')       # 'abcd'

# Better: use translate for many chars
'a-b_c d'.translate(str.maketrans('', '', '-_ '))  # 'abcd'`,
  related:['str.translate()','re.sub()','str.strip()'],
  tags:['strings','substitution','cleaning'],
  interview:[
    'Remove all occurrences of a char: <code>s.replace(ch, "")</code>',
    'For multiple character removals, <code>str.translate()</code> is more efficient',
    'Does not use regex — use <code>re.sub()</code> for pattern replacement',
  ],
  mistakes:['replace() returns a new string — strings are immutable. Original s is unchanged.'],
  notes:['For many-char removal, translate is O(n) with one pass; replace() in a loop is O(n*k).']
},

{
  id:'str-starts-ends', name:'startswith() / endswith()', purpose:'Tests if string starts or ends with a prefix/suffix',
  badge:['method','safe'], snippet:"s.startswith(('py', 'py3'))",
  sig:'str.startswith(prefix, start=0, end=len(s))   str.endswith(suffix, ...)',
  meta:{ ret:'bool', mut:false, time:'O(k) — k=len(prefix)', space:'O(1)' },
  params:[
    { name:'prefix/suffix', type:'str | tuple[str,...]', req:true, desc:'String or tuple of strings to check against.' },
    { name:'start/end', type:'int', default:'0 / len(s)', desc:'Slice range to check within.' }
  ],
  code:
`s = 'hello_world.py'
s.startswith('hello')            # True
s.endswith('.py')                # True
s.endswith(('.py', '.txt'))      # True — tuple of suffixes!

# With start/end
'hello world'.startswith('world', 6)  # True — check from index 6

# Common use: file extension check
def is_python_file(path):
    return path.endswith(('.py', '.pyw', '.pyc'))

# Avoid using slicing
s[:5] == 'hello'    # works but less readable
s.startswith('hello')  # preferred`,
  related:['str.find()','str.split()','re.match()'],
  tags:['strings','testing','prefix','suffix'],
  interview:[
    'Tuple argument: <code>s.endswith((".py", ".js", ".ts"))</code> — cleaner than multiple or conditions',
    'Faster than regex for simple prefix/suffix checks',
    'Works with start/end args to check substrings without slicing',
  ],
  mistakes:["Passing a list instead of a tuple: startswith(['py','js']) raises TypeError — must be a tuple."],
  notes:['Both accept a tuple of strings — checks if ANY of them match (an OR check).']
},

{
  id:'str-find', name:'str.find() / str.index()', purpose:'Finds the first occurrence of a substring',
  badge:['method','safe'], snippet:"pos = s.find(sub)",
  sig:'str.find(sub, start=0, end=len(s))  →  int (-1 if not found)',
  meta:{ ret:'int', mut:false, time:'O(n·m) worst case', space:'O(1)' },
  params:[
    { name:'sub', type:'str', req:true, desc:'Substring to search for.' },
    { name:'start/end', type:'int', default:'0 / len(s)', desc:'Limit search to this slice.' }
  ],
  code:
`s = 'hello world hello'
s.find('hello')         # 0
s.find('hello', 1)      # 12   ← search from index 1
s.find('xyz')           # -1   ← not found (no exception)
s.index('hello')        # 0    ← same but raises ValueError if not found
s.rfind('hello')        # 12   ← rightmost occurrence

# Safe check pattern
if s.find('hello') != -1:
    ...

# Prefer 'in' for membership
'hello' in s            # True  ← cleaner than find() != -1`,
  related:['str.index()','str.count()','str.replace()','in operator'],
  tags:['strings','searching','indexing'],
  interview:[
    'Use <code>in</code> for membership test: <code>"sub" in s</code> is cleaner than <code>s.find("sub") != -1</code>',
    'find() returns -1 on miss; index() raises ValueError — choose based on error handling preference',
    'rfind() / rindex() search from the right — useful for getting file extensions',
  ],
  mistakes:["find() returns -1 not None on miss — checking 'if s.find(x):' is wrong (0 is falsy)."],
  notes:["s.find(sub) == s.index(sub) except find returns -1 while index raises ValueError."]
},

{
  id:'str-count', name:'str.count()', purpose:'Counts non-overlapping occurrences of a substring',
  badge:['method','safe'], snippet:"n = s.count(sub)",
  sig:'str.count(sub, start=0, end=len(s))  →  int',
  meta:{ ret:'int', mut:false, time:'O(n·m)', space:'O(1)' },
  params:[{ name:'sub', type:'str', req:true, desc:'Substring to count.' }],
  code:
`'hello world'.count('l')      # 3
'aaa'.count('aa')              # 1  ← non-overlapping
'aabbaabb'.count('aa')         # 2
'hello'.count('xyz')           # 0

# Count vowels
s = 'hello world'
sum(s.count(v) for v in 'aeiou')    # 3

# How many words
'the cat sat on the mat'.count(' ') + 1   # 6`,
  related:['str.find()','collections.Counter','str.split()'],
  tags:['strings','counting','frequency'],
  interview:[
    'Count non-overlapping substrings — "aaa".count("aa") is 1, not 2',
    'Count character frequencies: use Counter(s) for all chars at once',
    'Check for palindrome: count character frequencies with Counter',
  ],
  mistakes:['count() counts non-overlapping — "aaaa".count("aa") is 2, not 3.'],
  notes:['For character frequencies across the whole string, collections.Counter(s) is more efficient.']
},

{
  id:'str-format', name:'f-strings / format()', purpose:'String interpolation and formatting',
  badge:['method','safe'], snippet:'f"{value:.2f}"',
  sig:'f"...{expr:spec}..."   str.format(*args, **kwargs)',
  meta:{ ret:'str', mut:false, time:'O(n)', space:'O(n)' },
  params:[
    { name:'expr', type:'any', req:true, desc:'Any Python expression evaluated at runtime.' },
    { name:'spec', type:'str', default:'""', desc:'Format spec: d, f, .2f, <10, >10, 0>10, ,, %, e, b, x…' }
  ],
  code:
`name, age, score = 'Alice', 30, 3.14159

# f-strings (Python 3.6+) — preferred
f"Name: {name}, Age: {age}"       # 'Name: Alice, Age: 30'
f"Score: {score:.2f}"             # 'Score: 3.14'
f"Padded: {age:04d}"              # 'Padded: 0030'
f"Aligned: {name:>10}"            # '     Alice'
f"Thousands: {1000000:,}"         # '1,000,000'
f"{score:.1%}"                    # '314.2%'  ← as percentage

# Debug (=)  Python 3.8+
f"{name=}, {age=}"                # "name='Alice', age=30"

# Nested expression
f"{'yes' if age > 18 else 'no'}"  # 'yes'`,
  related:['str.format()','str.replace()','%s formatting'],
  tags:['strings','formatting','interpolation'],
  interview:[
    'f-strings are faster than .format() and % — use by default in Python 3.6+',
    'Format spec: <code>{x:.2f}</code> (2 decimal), <code>{n:04d}</code> (zero-pad), <code>{n:,}</code> (thousands sep)',
    '<code>f"{var=}"</code> for debugging: prints both name and value',
    'Supports any expression: <code>f"{obj.method()}"</code>, <code>f"{lst[i]}"</code>',
  ],
  mistakes:[
    'f"...{dict["key"]}..." — use double quotes inside: f"{dict[\'key\']}" or switch outer quotes',
    'f-strings evaluated eagerly — not templates you can reuse with different values',
  ],
  notes:['f-strings compile to efficient str.format()-like bytecode. Avoid in logging: use lazy % formatting.']
},

  ] // end strings.fns
}, // end strings cat

/* ── Lists ────────────────────────────────────────────────── */
{
  key:'lists', label:'Lists',
  fns:[

{
  id:'list-append-extend', name:'append() / extend()', purpose:'Add elements to the end of a list',
  badge:['method','mut'], snippet:'lst.append(x)   lst.extend(iterable)',
  sig:'list.append(x)  →  None   |   list.extend(iterable)  →  None',
  meta:{ ret:'None (in-place)', mut:true, time:'O(1) amortized / O(k)', space:'O(1) / O(k)' },
  params:[
    { name:'x (append)', type:'any', req:true, desc:'Element to add. Added as a single item — a list is added as a nested list.' },
    { name:'iterable (extend)', type:'Iterable', req:true, desc:'Each element added individually. Equivalent to += iterable.' }
  ],
  code:
`lst = [1, 2, 3]

lst.append(4)        # [1,2,3,4]  ← adds one item
lst.append([5,6])    # [1,2,3,4,[5,6]]  ← nested list!

lst2 = [1, 2, 3]
lst2.extend([4,5])   # [1,2,3,4,5]  ← flattens one level
lst2 += [6,7]        # same as extend

# Common mistake
a = [1,2]
a.append([3,4])      # [1,2,[3,4]]  ← nested
a.extend([3,4])      # [1,2,3,4]    ← flat

# Performance: avoid += in a loop for building large lists
result = []
for x in range(1000):
    result.append(x)   # O(1) amortized, preferred`,
  ba:{
    before:{ label:'lst = [1, 2, 3]', rows:['1','2','3'] },
    after:{ label:'after extend([4,5])', rows:['1','2','3','4','5'] }
  },
  related:['list.insert()','list.pop()','list.extend()'],
  tags:['lists','mutation','append'],
  interview:[
    'append() vs extend(): append adds one item; extend adds each element from iterable',
    'append([1,2]) adds a nested list; extend([1,2]) adds 1 then 2 separately',
    'append is O(1) amortized — Python overallocates to avoid O(n²) repeated reallocation',
  ],
  mistakes:["lst.append([3,4]) nests a list — use lst.extend([3,4]) to add elements individually."],
  notes:['Dynamic arrays: Python lists over-allocate ~12.5% extra capacity on growth.']
},

{
  id:'list-pop', name:'pop() / remove()', purpose:'Remove and return an element by index or value',
  badge:['method','mut'], snippet:'val = lst.pop()   lst.remove(x)',
  sig:'list.pop(index=-1)  →  element   |   list.remove(x)  →  None',
  meta:{ ret:'element / None', mut:true, time:'O(1) end, O(n) arbitrary index', space:'O(1)' },
  params:[
    { name:'index (pop)', type:'int', default:'-1', desc:'Index of element to remove and return. Default is last element.' },
    { name:'x (remove)', type:'any', req:true, desc:'First occurrence of this value to remove. Raises ValueError if not found.' }
  ],
  code:
`lst = [1, 2, 3, 4, 5]

lst.pop()      # returns 5, lst=[1,2,3,4]  ← O(1)
lst.pop(0)     # returns 1, lst=[2,3,4]    ← O(n) — shifts all
lst.pop(1)     # returns 3, lst=[2,4]

lst2 = ['a','b','c','b']
lst2.remove('b')  # lst2=['a','c','b']  ← removes FIRST 'b'
lst2.remove('x')  # ValueError: 'x' not in list

# Safe remove
if 'x' in lst2:
    lst2.remove('x')`,
  related:['list.append()','list.insert()','deque.popleft()'],
  tags:['lists','removal','mutation'],
  interview:[
    'pop() from end is O(1) — use for stack. pop(0) is O(n) — use deque for queue.',
    'remove() removes first occurrence only — loop + remove for all occurrences (use list comp instead)',
    'pop(i) returns the element; remove(x) returns None',
  ],
  mistakes:["lst.pop(0) in a loop is O(n²) — use deque or reverse iterate and pop()."],
  notes:['del lst[i] removes without returning; pop(i) removes AND returns the element.']
},

{
  id:'list-sort', name:'list.sort()', purpose:'Sorts a list in-place (modifies original, returns None)',
  badge:['method','mut'], snippet:'lst.sort(key=func, reverse=True)',
  sig:'list.sort(*, key=None, reverse=False)  →  None',
  meta:{ ret:'None (in-place!)', mut:true, time:'O(n log n) Timsort', space:'O(log n)' },
  params:[
    { name:'key', type:'Callable | None', default:'None', desc:'Function applied to each element to extract comparison key.' },
    { name:'reverse', type:'bool', default:'False', desc:'True for descending order.' }
  ],
  code:
`nums = [3, 1, 4, 1, 5, 9]
nums.sort()                 # [1,1,3,4,5,9]  — in-place, returns None

# WRONG pattern:
result = nums.sort()        # result is None!

# Key function
words = ['banana','Apple','cherry']
words.sort(key=str.lower)   # case-insensitive

# Sort descending
nums.sort(reverse=True)     # [9,5,4,3,1,1]

# vs sorted(): use sort() when you don't need original
original = [3,1,4]
copy_sorted = sorted(original)  # original unchanged
original.sort()                 # original changed`,
  related:['sorted()','list.reverse()','key function'],
  tags:['sorting','in-place','mutation'],
  interview:[
    '<code>list.sort()</code> modifies in-place and returns None. Never do <code>result = lst.sort()</code>.',
    'Use <code>sorted(lst)</code> when you need the original unchanged.',
    'Stable sort: equal elements maintain their original relative order.',
  ],
  mistakes:["result = lst.sort() — sort() returns None, not the sorted list. Use sorted() instead."],
  notes:['Timsort has O(n) best case for nearly sorted data, which is common in practice.']
},

{
  id:'list-comprehension', name:'List Comprehension', purpose:'Concise, readable expression for building lists',
  badge:['func','safe'], snippet:'[expr for x in iterable if condition]',
  sig:'[expression for var in iterable if condition]',
  meta:{ ret:'list', mut:false, time:'O(n)', space:'O(n)' },
  params:[
    { name:'expression', type:'any', req:true, desc:'Value computed for each element.' },
    { name:'iterable', type:'Iterable', req:true, desc:'Source sequence.' },
    { name:'condition', type:'bool', default:'(none)', desc:'Optional filter — only elements where this is True are included.' }
  ],
  code:
`# Basic
squares = [x**2 for x in range(5)]         # [0,1,4,9,16]

# With filter
evens   = [x for x in range(10) if x%2==0] # [0,2,4,6,8]

# Nested (matrix to flat)
matrix = [[1,2],[3,4],[5,6]]
flat   = [x for row in matrix for x in row] # [1,2,3,4,5,6]

# Dict / set comprehension
sq_map = {x: x**2 for x in range(5)}        # {0:0,1:1,2:4,3:9,4:16}
unique = {x%3 for x in range(6)}             # {0,1,2}

# Generator expression (lazy, no brackets)
total = sum(x**2 for x in range(1000000))   # no list allocated`,
  related:['map()','filter()','generator expressions'],
  tags:['comprehensions','lists','concise'],
  interview:[
    'Use generator expression <code>(x for x in ...)</code> when passing to sum()/min()/max() — avoids intermediate list',
    'Nested comprehension: outer loop first, inner loop second (matches reading order)',
    'Dict comp with condition: <code>{k:v for k,v in d.items() if v > 0}</code>',
    'Prefer comprehension over map+lambda for readability',
  ],
  mistakes:[
    'Nested: <code>[x for row in matrix for x in row]</code> not <code>[x for x in row for row in matrix]</code>',
    'Using comprehension just to call a function for side effects — use a regular for loop',
  ],
  notes:['Set/dict comprehensions use {} not []. Generator expression uses () and is lazy.']
},

  ] // end lists.fns
}, // end lists cat

/* ── Dictionaries ─────────────────────────────────────────── */
{
  key:'dicts', label:'Dictionaries',
  fns:[

{
  id:'dict-get', name:'dict.get()', purpose:'Safely retrieves a value with an optional default',
  badge:['method','safe'], snippet:'val = d.get(key, default)',
  sig:'dict.get(key, default=None)  →  value | default',
  meta:{ ret:'value or default', mut:false, time:'O(1) average', space:'O(1)' },
  params:[
    { name:'key', type:'hashable', req:true, desc:'Key to look up.' },
    { name:'default', type:'any', default:'None', desc:'Returned if key is not found. Original dict is unchanged.' }
  ],
  code:
`d = {'a':1,'b':2,'c':3}

d.get('a')          # 1
d.get('x')          # None   ← no KeyError
d.get('x', 0)       # 0      ← explicit default

# vs dict[key]
d['x']              # KeyError!

# Build frequency map
text = 'hello'
freq = {}
for ch in text:
    freq[ch] = freq.get(ch, 0) + 1
# {'h':1,'e':1,'l':2,'o':1}

# Prefer defaultdict(int) for counting`,
  related:['defaultdict','dict.setdefault()','dict[]'],
  tags:['dicts','safe access','defaults'],
  interview:[
    'Use get() instead of try/except KeyError for optional values — cleaner',
    'Counting pattern: <code>d[k] = d.get(k, 0) + 1</code> (or use Counter/defaultdict)',
    'get() does NOT insert the key — use setdefault() if you need to insert',
  ],
  mistakes:["d.get(k) returns None on miss — don't check 'if d.get(k)' when 0 or '' are valid values; check 'if d.get(k) is not None'."],
  notes:['get() never creates a key. setdefault() creates it if missing.']
},

{
  id:'dict-items', name:'keys() / values() / items()', purpose:'Views into dictionary keys, values, and key-value pairs',
  badge:['method','safe'], snippet:'for k, v in d.items():',
  sig:'dict.keys()  →  KeysView   dict.values()  →  ValuesView   dict.items()  →  ItemsView',
  meta:{ ret:'dict view object', mut:false, time:'O(1) to create view, O(n) to iterate', space:'O(1) view' },
  params:[],
  code:
`d = {'a':1,'b':2,'c':3}

d.keys()            # dict_keys(['a','b','c'])
d.values()          # dict_values([1,2,3])
d.items()           # dict_items([('a',1),('b',2),('c',3)])

# Iterate key-value pairs
for k, v in d.items():
    print(f"{k} = {v}")

# Views reflect changes
keys = d.keys()
d['d'] = 4
list(keys)          # ['a','b','c','d']  ← live view!

# Membership
'a' in d.keys()     # True (same as 'a' in d)
1 in d.values()     # True

# Convert
list(d.keys())      # ['a','b','c']`,
  related:['dict.get()','dict.update()','zip()'],
  tags:['dicts','iteration','views'],
  interview:[
    '<code>for k, v in d.items()</code> is the Pythonic way to iterate key-value pairs',
    'Views are dynamic — they reflect dict mutations without creating copies',
    '<code>k in d</code> is O(1) and equivalent to <code>k in d.keys()</code>',
    'Convert to list if you need a snapshot: <code>list(d.keys())</code>',
  ],
  mistakes:["Modifying a dict while iterating over it raises RuntimeError — iterate over list(d.items()) instead."],
  notes:['dict.items() views support set operations when values are hashable.']
},

{
  id:'dict-update', name:'dict.update()', purpose:'Merges another dict or iterable of pairs into the dict',
  badge:['method','mut'], snippet:'d.update(other)',
  sig:'dict.update(other={}, **kwargs)  →  None',
  meta:{ ret:'None (in-place)', mut:true, time:'O(k) — k items in other', space:'O(k)' },
  params:[{ name:'other', type:'dict | Iterable[tuple]', default:'{}', desc:'Dict or iterable of (key,value) pairs to merge. Existing keys are overwritten.' }],
  code:
`d = {'a':1,'b':2}
d.update({'b':99,'c':3})  # {'a':1,'b':99,'c':3}  ← b overwritten
d.update(d=4, e=5)        # keyword args work too

# Python 3.9+ merge operator
merged = {'a':1} | {'b':2}          # {'a':1,'b':2}  new dict
d1 = {'a':1}; d1 |= {'b':2}        # in-place merge

# Python 3.5+ unpack
merged = {**dict1, **dict2}         # last wins on conflict`,
  related:['dict|=','dict.setdefault()','defaultdict'],
  tags:['dicts','merging','mutation'],
  interview:[
    'Python 3.9+: <code>d1 | d2</code> creates a new merged dict; <code>d1 |= d2</code> merges in-place',
    'Merge multiple dicts: <code>{**d1, **d2, **d3}</code> — last key wins',
    'update() overwrites existing keys — use setdefault() to avoid overwriting',
  ],
  mistakes:['update() with conflicting keys silently overwrites — rightmost wins.'],
  notes:['For safe merge (no overwrite), use d.setdefault(k, v) in a loop or dict comprehension.']
},

{
  id:'dict-setdefault', name:'dict.setdefault()', purpose:'Returns value for key; inserts default if key is missing',
  badge:['method','mut'], snippet:'lst = d.setdefault(key, [])',
  sig:'dict.setdefault(key, default=None)  →  value',
  meta:{ ret:'existing or new value', mut:true, time:'O(1)', space:'O(1)' },
  params:[
    { name:'key', type:'hashable', req:true, desc:'Key to look up or insert.' },
    { name:'default', type:'any', default:'None', desc:'Value to insert and return if key is missing. MUTABLE defaults are shared.' }
  ],
  code:
`d = {}
d.setdefault('a', []).append(1)    # d={'a':[1]}
d.setdefault('a', []).append(2)    # d={'a':[1,2]}  ← existing key unchanged

# Group-by pattern
groups = {}
for item in ['apple','ant','banana','bear']:
    groups.setdefault(item[0], []).append(item)
# {'a':['apple','ant'],'b':['banana','bear']}

# vs defaultdict (same result, different style)
from collections import defaultdict
groups2 = defaultdict(list)`,
  related:['defaultdict','dict.get()','dict.update()'],
  tags:['dicts','defaults','grouping'],
  interview:[
    'Group-by pattern: <code>d.setdefault(key, []).append(item)</code>',
    'Unlike get(), setdefault() INSERT the default into the dict',
    'defaultdict(list) is equivalent but more ergonomic for repeated group-by operations',
  ],
  mistakes:["d.setdefault(k, []) reuses the same [] for every missing key — for mutable defaults this is usually what you want, but be aware."],
  notes:['setdefault() is equivalent to: if key not in d: d[key] = default; return d[key]']
},

  ] // end dicts.fns
}, // end dicts cat

/* ── Sets ─────────────────────────────────────────────────── */
{
  key:'sets', label:'Sets',
  fns:[

{
  id:'set-ops', name:'set operations', purpose:'Union, intersection, difference — mathematical set algebra',
  badge:['method'], snippet:'s1 & s2   s1 | s2   s1 - s2',
  sig:'s1 | s2  →  union   s1 & s2  →  intersection   s1 - s2  →  difference   s1 ^ s2  →  symmetric diff',
  meta:{ ret:'new set', mut:false, time:'O(min(m,n)) to O(m+n)', space:'O(n)' },
  params:[],
  code:
`a = {1,2,3,4,5}
b = {3,4,5,6,7}

a | b          # {1,2,3,4,5,6,7}  union
a & b          # {3,4,5}          intersection
a - b          # {1,2}            in a not b
a ^ b          # {1,2,6,7}        in one but not both

# Method equivalents
a.union(b)
a.intersection(b)
a.difference(b)
a.symmetric_difference(b)

# Membership test — O(1)
3 in a          # True
99 in a         # False

# Dedup a list (loses order)
deduped = list(set([1,2,2,3,3,3]))  # [1,2,3]`,
  ba:{
    before:{ label:'Two sets', rows:['a = {1,2,3,4,5}','b = {3,4,5,6,7}'] },
    after:{ label:'a & b (intersection)', rows:['{3, 4, 5}'] }
  },
  related:['frozenset','Counter','dict'],
  tags:['sets','operations','deduplication'],
  interview:[
    'Deduplicate a list: <code>list(set(lst))</code> — loses order (use dict.fromkeys for ordered)',
    'Fast membership test: <code>x in s</code> is O(1) vs O(n) for lists',
    'Find common elements: <code>set(a) & set(b)</code>',
    'Unique to first: <code>set(a) - set(b)</code>',
  ],
  mistakes:['Deduplication with set loses insertion order. Use dict.fromkeys(lst) to preserve order.'],
  notes:['Operators (|,&,-,^) require both operands to be sets. Method versions accept any iterable.']
},

{
  id:'set-add-discard', name:'add() / discard() / remove()', purpose:'Add or remove individual elements from a set',
  badge:['method','mut'], snippet:'s.add(x)   s.discard(x)',
  sig:'set.add(x) → None   set.discard(x) → None   set.remove(x) → None',
  meta:{ ret:'None', mut:true, time:'O(1) average', space:'O(1)' },
  params:[{ name:'x', type:'hashable', req:true, desc:'Element to add or remove. Must be hashable (no lists, dicts as elements).' }],
  code:
`s = {1, 2, 3}
s.add(4)         # {1,2,3,4}
s.add(2)         # {1,2,3,4}  ← duplicate ignored

s.discard(2)     # {1,3,4}    ← no error if missing
s.remove(3)      # {1,4}      ← ValueError if missing
s.discard(99)    # {1,4}      ← safe, no error

# pop() removes and returns an ARBITRARY element
s.pop()          # returns unpredictable element`,
  related:['set operations','list.append()','list.remove()'],
  tags:['sets','mutation'],
  interview:[
    'Use discard() instead of remove() when the element might not be present',
    'add() is idempotent — adding an existing element has no effect',
    'Sets cannot contain mutable objects: lists, dicts — use frozenset for sets of sets',
  ],
  mistakes:["set.pop() returns an arbitrary element — sets are unordered, so 'first' element is undefined."],
  notes:['Elements must be hashable. Unhashable types (list, dict, set) cannot be set members.']
},

  ] // end sets.fns
}, // end sets cat

  ] // end Data Types cats
}, // end Data Types group

/* ══════════════════════════════════════════════════════════════
   GROUP 3 · FUNCTIONS & OOP
══════════════════════════════════════════════════════════════ */
{
  label: 'Functions & OOP',
  cats: [

{
  key:'functions', label:'Functions',
  fns:[
{
  id:'fn-args', name:'*args / **kwargs', purpose:'Variable positional and keyword arguments',
  badge:['func'], snippet:'def f(*args, **kwargs):',
  sig:'def fn(*args, **kwargs)',
  meta:{ ret:'varies', mut:false, time:'O(1)', space:'O(n)' },
  params:[
    { name:'*args', type:'tuple', req:false, desc:'Collects extra positional args as a tuple.' },
    { name:'**kwargs', type:'dict', req:false, desc:'Collects extra keyword args as a dict.' }
  ],
  code:
`def greet(*names, sep=', '):
    return sep.join(names)

greet('Alice', 'Bob', 'Carol')  # 'Alice, Bob, Carol'
greet('Alice', sep=' & ')       # 'Alice'

def log(msg, **opts):
    level   = opts.get('level', 'INFO')
    prefix  = opts.get('prefix', '')
    print(f"[{level}] {prefix}{msg}")

log("hello", level="DEBUG", prefix=">> ")

# Unpack when calling
def add(a, b, c): return a+b+c
nums = [1, 2, 3]
add(*nums)               # 6

d = {'a':1,'b':2,'c':3}
add(**d)                 # 6`,
  related:['callable()','lambda','functools.partial'],
  tags:['functions','variadic','unpacking'],
  interview:[
    'Unpack list into positional args: <code>f(*lst)</code>',
    'Unpack dict into keyword args: <code>f(**dct)</code>',
    'Keyword-only args: <code>def f(a, *, kw_only)</code> — * with no name forces remaining to be keyword',
  ],
  mistakes:["**kwargs creates a new dict; modifying it inside the function doesn't affect caller."],
  notes:['Ordering: def f(pos, /, normal, *args, kw_only, **kwargs) — Python 3.8+ positional-only with /.']
},

{
  id:'lambda', name:'lambda', purpose:'Anonymous one-expression function',
  badge:['func'], snippet:'f = lambda x, y: x + y',
  sig:'lambda args: expression',
  meta:{ ret:'function object', mut:false, time:'O(1)', space:'O(1)' },
  params:[],
  code:
`double = lambda x: x * 2
double(5)                    # 10

# Common use: key= argument
words = ['banana', 'apple', 'fig']
sorted(words, key=lambda w: len(w))  # ['fig','apple','banana']

# With default args
power = lambda x, n=2: x**n
power(3)                     # 9
power(2, 10)                 # 1024

# IIFE (immediately invoked)
result = (lambda x, y: x + y)(3, 4)  # 7

# Prefer def for complex logic
# lambda x: x if x > 0 else -x   ← use abs() or def`,
  related:['sorted()','map()','filter()','functools.partial'],
  tags:['functional','anonymous','key function'],
  interview:[
    'Use as key= in sorted/min/max: cleaner than defining a named function for one use',
    'Lambdas are functions — they can be passed, returned, stored in data structures',
    'For anything more than one expression, use def — lambdas are deliberately limited',
  ],
  mistakes:["Lambda with default mutable argument captures by reference: 'lambda x=[] : x.append(1)' — shared state!"],
  notes:['Lambda can only contain a single expression — no statements, assignments, or multi-line logic.']
},

{
  id:'generator', name:'Generators / yield', purpose:'Lazy iterator — produces values on demand without storing all in memory',
  badge:['func','lazy'], snippet:'def gen():\n    yield value',
  sig:'def fn(): yield value  |  (expr for x in iterable)',
  meta:{ ret:'generator object', mut:false, time:'O(1) per next()', space:'O(1) state only' },
  params:[],
  code:
`# Generator function
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for x in countdown(5):      # 5 4 3 2 1
    print(x)

list(countdown(3))           # [3,2,1]

# Generator expression (lazy map/filter)
squares = (x**2 for x in range(10))
next(squares)                # 0
next(squares)                # 1

# Memory advantage: sum over a billion
total = sum(x**2 for x in range(1_000_000))  # no list!

# yield from — delegate to sub-generator
def chain_lists(lists):
    for lst in lists:
        yield from lst`,
  related:['iter()','next()','itertools'],
  tags:['generators','lazy','memory efficient','yield'],
  interview:[
    'Use generators when only processing elements one at a time — saves O(n) memory',
    '<code>yield from iterable</code> delegates to another iterable (Python 3.3+)',
    'Generators maintain state between calls — cannot be restarted after exhaustion',
    'Generator expressions <code>(x for x in ...)</code> are lazy; list comprehensions are eager',
  ],
  mistakes:['Generators are one-pass — after exhaustion, they return nothing. Wrap in list() to reuse.'],
  notes:['A function with yield is a generator function. Calling it returns a generator object without running the body.']
},

  ] // end functions.fns
}, // end functions cat

{
  key:'classes', label:'Classes',
  fns:[
{
  id:'class-basics', name:'__init__ / __str__ / __repr__', purpose:'Core dunder methods every class should define',
  badge:['method'], snippet:'def __init__(self, ...):\n    self.attr = val',
  sig:'class MyClass:\n    def __init__(self, ...) / __str__ / __repr__',
  meta:{ ret:'varies', mut:true, time:'O(1)', space:'O(1)' },
  params:[],
  code:
`class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):          # for devs: repr(p), [p]
        return f"Point({self.x}, {self.y})"

    def __str__(self):           # for users: print(p), str(p)
        return f"({self.x}, {self.y})"

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __hash__(self):          # needed if __eq__ defined, for sets/dicts
        return hash((self.x, self.y))

p = Point(1, 2)
repr(p)     # "Point(1, 2)"
str(p)      # "(1, 2)"
print(p)    # (1, 2)  ← calls __str__`,
  related:['isinstance()','property','@dataclass'],
  tags:['OOP','classes','dunders'],
  interview:[
    '__repr__ should be unambiguous and ideally eval()-able; __str__ is for human display',
    'If you define __eq__, also define __hash__ — otherwise objects become unhashable',
    'Prefer @dataclass for simple data classes — auto-generates __init__, __repr__, __eq__',
  ],
  mistakes:['Defining __eq__ without __hash__ makes instances unhashable — they cannot be used in sets or as dict keys.'],
  notes:['If __str__ not defined, Python falls back to __repr__.']
},


{
  id:'class-dataclass', name:'@dataclass', purpose:'Auto-generate __init__, __repr__, __eq__ for data classes',
  badge:['method'], snippet:'from dataclasses import dataclass\n@dataclass\nclass Point:\n    x: float\n    y: float',
  sig:'@dataclass(*, init=True, repr=True, eq=True, order=False, frozen=False)',
  meta:{ ret:'class', mut:true, time:'O(1)', space:'O(1)' },
  params:[
    { name:'frozen', type:'bool', default:'False', desc:'Make instances immutable and hashable.' },
    { name:'order', type:'bool', default:'False', desc:'Generate __lt__, __le__, __gt__, __ge__ for comparison.' }
  ],
  code:
`from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float = 0.0   # default value

p = Point(1.0, 2.0)
p             # Point(x=1.0, y=2.0)  — __repr__ auto-generated
p == Point(1.0, 2.0)  # True  — __eq__ auto-generated

# Mutable default MUST use field(default_factory=...)
@dataclass
class Config:
    name: str
    tags: list = field(default_factory=list)  # NOT tags: list = []
    debug: bool = False

# frozen=True → immutable and hashable
@dataclass(frozen=True)
class Coord:
    lat: float
    lon: float

c = Coord(40.7, -74.0)
hash(c)  # works — frozen classes are hashable`,
  related:['class-basics','class-property','typing.NamedTuple'],
  tags:['OOP','dataclass','boilerplate reduction','immutable'],
  interview:[
    '@dataclass replaces ~10 lines of __init__/__repr__/__eq__ boilerplate',
    'frozen=True for immutable value objects — also makes them hashable (usable as dict keys)',
    'Use field(default_factory=list) for mutable defaults — a direct list default is shared across instances',
    'order=True adds comparison operators based on field declaration order',
  ],
  mistakes:['@dataclass class Foo:\n    items: list = []  — DO NOT DO THIS — same list shared across all instances.'],
  notes:['Python 3.10+ adds @dataclass(slots=True) which uses __slots__ for memory efficiency.']
},

{
  id:'class-property', name:'@property / @classmethod / @staticmethod', purpose:'Control attribute access and define class-level and utility methods',
  badge:['method'], snippet:'@property\ndef area(self):\n    return math.pi * self._r**2',
  sig:'@property / @name.setter / @name.deleter / @classmethod / @staticmethod',
  meta:{ ret:'varies', mut:false, time:'O(1)', space:'O(1)' },
  params:[],
  code:
`class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):               # getter
        return self._radius

    @radius.setter
    def radius(self, value):        # setter with validation
        if value < 0:
            raise ValueError("Radius must be non-negative")
        self._radius = value

    @property
    def area(self):                 # read-only computed property
        return 3.14159 * self._radius ** 2

    @classmethod
    def from_diameter(cls, d):      # factory — cls not self
        return cls(d / 2)

    @staticmethod
    def is_valid_radius(r):         # utility — no cls or self
        return r >= 0

c = Circle(5)
c.radius          # 5 (calls getter)
c.radius = 10     # calls setter
c.area            # 314.159 (read-only computed)
Circle.from_diameter(20)   # Circle(radius=10)`,
  related:['class-basics','class-dataclass'],
  tags:['OOP','property','classmethod','staticmethod','decorator'],
  interview:[
    '@property: add validation/computation without changing call syntax',
    '@classmethod: factory constructors — use cls so subclasses return the right type',
    '@staticmethod: utility attached to class; needs no instance or class state',
    'Difference: classmethod gets cls, staticmethod gets nothing, regular method gets self',
  ],
  mistakes:['Defining a setter requires @name.setter — writing @property twice creates a second property, not a setter.'],
  notes:['@property is the Pythonic way to add attribute validation without breaking existing API.']
},

{
  id:'class-inheritance', name:'Inheritance / ABC', purpose:'Extend classes and define interfaces with abstract base classes',
  badge:['method'], snippet:'class Child(Parent):\n    def method(self):\n        super().method()',
  sig:'class Child(Parent):   from abc import ABC, abstractmethod',
  meta:{ ret:'class', mut:true, time:'O(1)', space:'O(1)' },
  params:[],
  code:
`# Single inheritance
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return f"{self.name} makes a sound"

class Dog(Animal):
    def speak(self):                        # override
        return f"{self.name} barks"

    def fetch(self, item):
        return f"{self.name} fetches {item}"

d = Dog("Rex")
d.speak()        # "Rex barks"
isinstance(d, Animal)    # True
isinstance(d, Dog)       # True

# super() — call parent method
class Cat(Animal):
    def speak(self):
        base = super().speak()
        return f"{base} (meow)"

# Abstract Base Class — enforce interface
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    @abstractmethod
    def perimeter(self) -> float: ...

class Square(Shape):
    def __init__(self, side):
        self.side = side
    def area(self):
        return self.side ** 2
    def perimeter(self):
        return 4 * self.side`,
  related:['class-basics','class-property','class-dataclass'],
  tags:['OOP','inheritance','ABC','super','interface'],
  interview:[
    'Use super() instead of Parent.method(self) — works correctly with multiple inheritance and MRO',
    'ABC prevents instantiation of the base class — enforces that subclasses implement all abstract methods',
    'Python MRO (Method Resolution Order) follows C3 linearization — check with ClassName.__mro__',
    'isinstance(obj, ABC) checks if obj implements the interface',
  ],
  mistakes:['Forgetting to call super().__init__() in the child class — parent\'s initialization is skipped.'],
  notes:['Python supports multiple inheritance: class C(A, B): — MRO determines which parent method runs.']
},

  ] // end classes.fns
}, // end classes cat

  ] // end Functions & OOP cats
}, // end Functions & OOP group

/* ══════════════════════════════════════════════════════════════
   GROUP 4 · PATTERNS & TOOLS
══════════════════════════════════════════════════════════════ */
{
  label: 'Patterns & Tools',
  cats: [

/* ── Algorithms ───────────────────────────────────────────── */
{
  key:'algorithms', label:'Algorithms',
  fns:[

{
  id:'bisect', name:'bisect', purpose:'Binary search and sorted insertion in O(log n)',
  badge:['builtin'], snippet:'import bisect\nbisect.bisect_left(sorted_list, target)',
  sig:'bisect.bisect_left(a, x)   bisect_right(a, x)   insort(a, x)',
  meta:{ ret:'int (index)', mut:false, time:'O(log n)', space:'O(1)' },
  params:[
    { name:'a', type:'list', req:true, desc:'A sorted list. Must be sorted — no check is performed.' },
    { name:'x', type:'any', req:true, desc:'Value to search for or insert.' }
  ],
  code:
`import bisect

nums = [1, 3, 5, 7, 9, 11]

# bisect_left: insertion point BEFORE any existing equal elements
bisect.bisect_left(nums, 7)   # 3 — index where 7 is
bisect.bisect_left(nums, 6)   # 3 — where 6 would go

# bisect_right: insertion point AFTER equal elements
bisect.bisect_right(nums, 7)  # 4

# insort: insert while maintaining sort order — O(n) due to shift
bisect.insort(nums, 6)         # [1,3,5,6,7,9,11]

# Binary search pattern: is x in the sorted list?
def contains(a, x):
    i = bisect.bisect_left(a, x)
    return i < len(a) and a[i] == x

# Count elements in range [lo, hi]
def count_range(a, lo, hi):
    return bisect.bisect_right(a, hi) - bisect.bisect_left(a, lo)

count_range(nums, 3, 7)  # 3 → (3,5,6,7) ... wait, counts 3,5,7 = 3

# Grade assignment using bisect_right as lookup table
breakpoints = [60, 70, 80, 90]
grades      = 'FDCBA'
def grade(score):
    return grades[bisect.bisect_right(breakpoints, score)]

grade(85)  # 'B'
grade(59)  # 'F'`,
  ba:{
    before:{ label:'sorted list', rows:['[1, 3, 5, 7, 9, 11]'] },
    after:{ label:'bisect_left(list, 6) → 3', rows:['index 3 = insertion point before 7'] }
  },
  related:['sorted()','heapq','list.sort()'],
  tags:['binary search','sorted list','O(log n)','intervals'],
  interview:[
    'bisect_left returns the LEFTMOST index where x can be inserted to keep a sorted; use for lower bound',
    'bisect_right (= bisect): returns RIGHTMOST index, i.e. after any equal elements; use for upper bound',
    'Count elements in range [lo, hi]: <code>bisect_right(a,hi) - bisect_left(a,lo)</code>',
    'Lookup table trick: <code>grades[bisect_right(breakpoints, score)]</code>',
    'List must be sorted — bisect does NOT verify this; wrong results if unsorted',
  ],
  mistakes:['bisect does not confirm the value exists — always check a[i] == x after bisect_left.'],
  notes:['insort maintains sort order but is O(n) due to list shift — use heapq or SortedList for frequent inserts.']
},

  ] // end algorithms.fns
}, // end algorithms cat

/* ── Regex ────────────────────────────────────────────────── */
{
  key:'regex', label:'Regular Expressions',
  fns:[

{
  id:'re-basics', name:'re module', purpose:'Pattern matching, extraction, and substitution in strings',
  badge:['builtin'], snippet:'import re\nre.search(pattern, string)',
  sig:'re.match / search / fullmatch / findall / finditer / sub / split',
  meta:{ ret:'Match | list | str', mut:false, time:'O(n) typical', space:'O(n)' },
  params:[
    { name:'pattern', type:'str', req:true, desc:'Regex pattern string. Use raw strings r"..." to avoid escaping backslashes.' },
    { name:'string', type:'str', req:true, desc:'Input string to search.' },
    { name:'flags', type:'re.FLAGS', default:'0', desc:'re.IGNORECASE, re.MULTILINE, re.DOTALL, re.VERBOSE.' }
  ],
  code:
`import re

text = "Order #1042 placed on 2024-03-15 for $199.99"

# search — finds first match anywhere in string
m = re.search(r'\\d{4}-\\d{2}-\\d{2}', text)
m.group()     # '2024-03-15'
m.start()     # 24
m.end()       # 34

# match — only matches at START of string
re.match(r'Order', text)          # Match object
re.match(r'\\d+', text)            # None — doesn't start with digit

# fullmatch — entire string must match
re.fullmatch(r'\\d{4}-\\d{2}-\\d{2}', '2024-03-15')  # Match

# findall — all matches as a list
re.findall(r'\\d+', text)          # ['1042','2024','03','15','199','99']

# sub — replace matches
re.sub(r'\\d+', 'X', text)         # 'Order #X placed on X-X-X for $X.X'
re.sub(r'(\\d+)', r'[\\1]', text)   # backreference: '[1042]' etc.

# split
re.split(r'\\s+', 'a  b   c')      # ['a','b','c']`,
  related:['str.replace()','str.find()','str.startswith()'],
  tags:['regex','pattern matching','text processing'],
  interview:[
    'match() anchors to start; search() scans whole string — usually want search()',
    'Compile for reuse: <code>pat = re.compile(r"\\d+")</code> — ~20% faster on repeated use',
    'Use raw strings r"..." for patterns — avoids double-escaping backslashes',
    'finditer() returns an iterator of Match objects — use when you need position info',
  ],
  mistakes:['re.match only matches at position 0 — use re.search or re.fullmatch depending on intent.'],
  notes:['re.DOTALL makes . match newlines too; re.MULTILINE makes ^ and $ match line boundaries.']
},

{
  id:'re-groups', name:'Groups & Named Groups', purpose:'Capture and extract specific parts of a match',
  badge:['builtin'], snippet:'m = re.search(r"(?P<year>\\d{4})-(?P<month>\\d{2})", s)\nm.group("year")',
  sig:'(...)  — capture group     (?P<name>...)  — named group     (?:...)  — non-capturing',
  meta:{ ret:'Match object', mut:false, time:'O(n)', space:'O(k groups)' },
  params:[],
  code:
`import re

log = "2024-03-15 ERROR user@example.com login failed"

# Numbered groups
m = re.search(r'(\\d{4})-(\\d{2})-(\\d{2})', log)
m.group(0)   # '2024-03-15'  — full match
m.group(1)   # '2024'        — group 1
m.group(2)   # '03'          — group 2
m.groups()   # ('2024','03','15')

# Named groups — self-documenting and order-independent
pat = re.compile(
    r'(?P<year>\\d{4})-(?P<month>\\d{2})-(?P<day>\\d{2})'
    r'\\s+(?P<level>\\w+)'
    r'\\s+(?P<email>[\\w.]+@[\\w.]+)'
)
m = pat.search(log)
m.group('year')   # '2024'
m.group('email')  # 'user@example.com'
m.groupdict()     # {'year':'2024','month':'03',...}

# findall with groups returns list of tuples
re.findall(r'(\\d{4})-(\\d{2})', '2024-01 and 2024-02')
# [('2024','01'),('2024','02')]`,
  related:['re.match()','re.finditer()','re.sub()'],
  tags:['regex','groups','extraction','named groups'],
  interview:[
    'Named groups make complex patterns maintainable: <code>(?P<name>pattern)</code>',
    'Non-capturing group <code>(?:...)</code>: group for structure but don\'t capture — keeps group numbers clean',
    'Lookahead <code>(?=...)</code> / lookbehind <code>(?<=...)</code>: match without consuming characters',
  ],
  mistakes:['findall with groups returns list of tuples, not strings — one tuple per match.'],
  notes:['m.groupdict() returns a dict of named groups — most convenient for structured extraction.']
},

  ] // end regex.fns
}, // end regex cat

/* ── Exceptions ───────────────────────────────────────────── */
{
  key:'exceptions', label:'Exception Handling',
  fns:[

{
  id:'exceptions-basics', name:'try / except / raise', purpose:'Handle, propagate, and define exceptions',
  badge:['builtin'], snippet:'try:\n    ...\nexcept ValueError as e:\n    ...',
  sig:'try / except [Type [as e]] / else / finally   raise   raise X from Y',
  meta:{ ret:'None', mut:false, time:'O(1) overhead', space:'O(1)' },
  params:[],
  code:
`# Full try/except/else/finally
try:
    result = int("abc")        # raises ValueError
except ValueError as e:
    print(f"Bad value: {e}")   # handle it
except (TypeError, KeyError):  # multiple types in one clause
    pass
else:
    print("Success:", result)  # runs only if no exception
finally:
    print("Always runs")       # cleanup — always executes

# Raise
def divide(a, b):
    if b == 0:
        raise ZeroDivisionError("b must be non-zero")
    return a / b

# Exception chaining — preserve original context
try:
    data = load()
except FileNotFoundError as e:
    raise RuntimeError("Config missing") from e

# Suppress specific exceptions
from contextlib import suppress
with suppress(FileNotFoundError):
    os.remove("maybe_exists.txt")  # silently ignored if missing

# Custom exception class
class ValidationError(ValueError):
    def __init__(self, field, msg):
        super().__init__(f"{field}: {msg}")
        self.field = field`,
  related:['contextlib.suppress','warnings','logging'],
  tags:['exceptions','error handling','try/except','raise'],
  interview:[
    'else clause runs when no exception was raised — cleaner than a flag variable',
    'finally always runs — use for cleanup (close file, release lock) even if exception raised',
    '<code>raise X from Y</code> chains exceptions — preserves original traceback for debugging',
    'Catch the most specific exception first — more general exceptions go last',
  ],
  mistakes:['Bare except: catches everything including KeyboardInterrupt and SystemExit — always specify the type.'],
  notes:['Use logging.exception() inside except to log the full traceback automatically.']
},

  ] // end exceptions.fns
}, // end exceptions cat

/* ── Context Managers ─────────────────────────────────────── */
{
  key:'context-managers', label:'Context Managers',
  fns:[

{
  id:'context-manager', name:'with / __enter__ / __exit__', purpose:'Guaranteed setup and teardown — even if an exception occurs',
  badge:['builtin'], snippet:'with open("file.txt") as f:\n    data = f.read()',
  sig:'with expr [as var]:   |   class CM: __enter__(self)  __exit__(self, exc_type, exc_val, tb)',
  meta:{ ret:'varies', mut:false, time:'O(1) overhead', space:'O(1)' },
  params:[],
  code:
`# File I/O — auto-closes even on exception
with open("data.txt", "r") as f:
    contents = f.read()

# Multiple context managers — one with statement
with open("in.txt") as src, open("out.txt","w") as dst:
    dst.write(src.read())

# Custom class-based context manager
class Timer:
    def __enter__(self):
        import time
        self.start = time.perf_counter()
        return self                    # bound to 'as' target

    def __exit__(self, exc_type, exc_val, tb):
        self.elapsed = time.perf_counter() - self.start
        return False  # False = don't suppress exceptions

with Timer() as t:
    result = compute()
print(f"Took {t.elapsed:.3f}s")

# contextlib.contextmanager — generator shortcut
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire()    # __enter__ body
    try:
        yield resource       # hands control to with-block
    finally:
        release(resource)    # __exit__ body (always runs)`,
  related:['contextlib.suppress','contextlib.ExitStack','open()'],
  tags:['context manager','with','RAII','cleanup','file I/O'],
  interview:[
    '__exit__ returning True suppresses the exception — return False (or None) to let it propagate',
    '@contextmanager is the simplest way to write a context manager — yield separates enter/exit',
    'contextlib.ExitStack: dynamic number of context managers — useful in loops',
    'threading.Lock(), sqlite3.connect(), tempfile.TemporaryDirectory() all support with',
  ],
  mistakes:['Forgetting finally in @contextmanager — cleanup code must be in finally to run on exceptions.'],
  notes:['with does NOT catch exceptions — use try/except inside the with block for that.']
},

  ] // end context-managers.fns
}, // end context-managers cat

/* ── Decorators ───────────────────────────────────────────── */
{
  key:'decorators', label:'Decorators',
  fns:[

{
  id:'decorators-basics', name:'Decorators / @wraps', purpose:'Wrap functions to add behaviour — logging, timing, retry, validation',
  badge:['builtin'], snippet:'from functools import wraps\ndef decorator(func):\n    @wraps(func)\n    def wrapper(*args, **kwargs): ...',
  sig:'def decorator(func):  return wrapper    @decorator\ndef my_fn(): ...',
  meta:{ ret:'wrapped function', mut:false, time:'O(1) overhead', space:'O(1)' },
  params:[],
  code:
`from functools import wraps
import time

# Basic decorator — add timing to any function
def timer(func):
    @wraps(func)          # preserves __name__, __doc__, __annotations__
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.perf_counter()-t0:.4f}s")
        return result
    return wrapper

@timer
def slow_fn(n):
    return sum(range(n))

slow_fn(1_000_000)   # prints: slow_fn took 0.0312s

# Decorator with arguments — add a factory layer
def retry(times=3, delay=1.0):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == times - 1: raise
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(times=5, delay=0.5)
def fetch_data(url):
    ...

# Stacking decorators — applied bottom-up
@timer
@retry(times=3)
def risky_fetch(url):
    ...`,
  related:['functools.wraps','functools.lru_cache','class-property'],
  tags:['decorators','higher-order','wraps','cross-cutting concerns'],
  interview:[
    'Always use @wraps(func) inside a decorator — preserves __name__, __doc__, signatures for debuggers',
    'Decorators with args need three levels: factory(args) → decorator(func) → wrapper(*args)',
    'Execution order when stacking: @A @B → A(B(func)) — B wraps first, A wraps second',
    '@staticmethod, @classmethod, @property are all built-in decorators',
  ],
  mistakes:['Forgetting @wraps — loses original function name and docstring, breaks introspection tools.'],
  notes:['Class-based decorators: implement __call__ instead of a nested wrapper function.']
},

  ] // end decorators.fns
}, // end decorators cat

/* ── pathlib ──────────────────────────────────────────────── */
{
  key:'pathlib', label:'pathlib',
  fns:[

{
  id:'pathlib-basics', name:'pathlib.Path', purpose:'Object-oriented file system paths — cleaner than os.path',
  badge:['builtin'], snippet:'from pathlib import Path\np = Path("data") / "file.csv"',
  sig:'Path(str)   /   .read_text()  .write_text()  .glob()  .exists()  .stat()',
  meta:{ ret:'Path | str | bytes', mut:false, time:'O(1) path ops, O(n) I/O', space:'O(1)' },
  params:[],
  code:
`from pathlib import Path

# Construction — / operator joins path parts
p = Path("data") / "2024" / "orders.csv"
# PosixPath('data/2024/orders.csv')

# Parts
p.name          # 'orders.csv'
p.stem          # 'orders'
p.suffix        # '.csv'
p.parent        # Path('data/2024')
p.parts         # ('data', '2024', 'orders.csv')

# Check & inspect
p.exists()      # True/False
p.is_file()     # True/False
p.is_dir()      # True/False
p.stat().st_size  # file size in bytes

# Read / write
text = p.read_text(encoding="utf-8")       # whole file as str
p.write_text("hello", encoding="utf-8")    # overwrites
data = p.read_bytes()                      # whole file as bytes

# Create / delete
p.parent.mkdir(parents=True, exist_ok=True)  # create dirs
p.unlink(missing_ok=True)                    # delete file
p.rename(p.with_suffix(".bak"))              # rename

# Glob — find files by pattern
list(Path(".").glob("*.py"))              # non-recursive
list(Path(".").rglob("*.csv"))            # recursive
for csv in Path("data").rglob("*.csv"):
    print(csv, csv.stat().st_size)`,
  related:['open()','os.path','shutil'],
  tags:['pathlib','file I/O','filesystem','paths'],
  interview:[
    '/ operator builds paths cross-platform — never use string concatenation for paths',
    'read_text/write_text: simple whole-file I/O; use open() for streaming large files',
    'rglob("*.csv") = recursive glob — finds all CSV files in any subdirectory',
    'always mkdir(parents=True, exist_ok=True) — idempotent, creates all intermediate dirs',
  ],
  mistakes:['Path objects are not strings — pass str(p) to libraries that don\'t accept Path objects (rare in modern code).'],
  notes:['Path is cross-platform — use it instead of os.path.join, os.path.exists, os.makedirs.']
},

  ] // end pathlib.fns
}, // end pathlib cat

  ] // end Patterns & Tools cats
}, // end Patterns & Tools group

/* ══════════════════════════════════════════════════════════════
   GROUP 5 · INTERVIEW PATTERNS
══════════════════════════════════════════════════════════════ */
{
  label: 'Interview Patterns',
  cats:[
  {
    key:'two-pointers', label:'Two Pointers & Sliding Window',
    fns:[
    {
      id:'two-pointers', name:'Two Pointers', purpose:'Scan arrays with opposite-end or same-direction pointers — O(n) vs O(n²) brute force',
      badge:['python'], snippet:'l, r = 0, len(arr)-1\nwhile l < r:\n    ...',
      sig:'Opposite ends: l,r → center   Same direction: slow/fast   Sliding window: l expands right, shrinks from left',
      meta:{ ret:'varies', mut:false, time:'O(n)', space:'O(1)' },
      params:[],
      code:
`# Pattern 1: Opposite ends — sorted array problems
# Two Sum II, container with most water

def two_sum_sorted(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:  return [l, r]
        elif s < target: l += 1
        else:            r -= 1
    return []

# Pattern 2: Same direction — remove duplicates in-place

def remove_duplicates(nums):
    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1   # new length

# Pattern 3: Fixed-size sliding window
# Max sum subarray of length k

def max_sum_window(nums, k):
    win = sum(nums[:k])
    best = win
    for i in range(k, len(nums)):
        win += nums[i] - nums[i - k]
        best = max(best, win)
    return best

# Pattern 4: Variable-size sliding window
# Longest substring without repeating characters

def longest_no_repeat(s):
    seen = {}
    l = best = 0
    for r, ch in enumerate(s):
        if ch in seen and seen[ch] >= l:
            l = seen[ch] + 1   # shrink window past last occurrence
        seen[ch] = r
        best = max(best, r - l + 1)
    return best`,
      related:['bisect','bfs-dfs-basics','dp-basics'],
      tags:['python','two pointers','sliding window','interview','arrays','O(n)'],
      interview:[
        'Two pointers work on SORTED arrays (opposite ends) or any array (same direction / sliding window)',
        'Variable window: "longest/max" → expand right greedily; "shortest/min" → shrink left aggressively',
        'Fixed window: slide by adding new element and subtracting element that falls out — O(1) per step',
      ],
      mistakes:['Forgetting to check l < r in opposite-end pattern — loop runs past crossing point.'],
      notes:['Sliding window replaces O(n²) nested loops — the left pointer never resets, so total moves = O(n).']
    },
    ] // end two-pointers.fns
  }, // end two-pointers cat
  {
    key:'bfs-dfs', label:'BFS & DFS',
    fns:[
    {
      id:'bfs-dfs-basics', name:'BFS / DFS', purpose:'Traverse graphs and trees — BFS for shortest paths, DFS for connectivity and backtracking',
      badge:['python'], snippet:'from collections import deque\nq = deque([start])\nvisited = {start}',
      sig:'BFS: deque + visited set (O(V+E))   DFS: recursion or explicit stack (O(V+E))',
      meta:{ ret:'varies', mut:false, time:'O(V + E)', space:'O(V)' },
      params:[],
      code:
`from collections import deque

# --- BFS — shortest path in unweighted graph ---
def bfs(graph, start, target):
    q = deque([(start, [start])])   # (node, path so far)
    visited = {start}
    while q:
        node, path = q.popleft()
        if node == target:
            return path
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)     # mark WHEN ENQUEUING — not dequeuing
                q.append((nb, path + [nb]))
    return None

# --- DFS — recursive ---
def dfs(graph, node, visited=None):
    if visited is None: visited = set()
    visited.add(node)
    for nb in graph[node]:
        if nb not in visited:
            dfs(graph, nb, visited)
    return visited

# --- DFS — iterative (explicit stack) ---
def dfs_iter(graph, start):
    stack, visited = [start], {start}
    while stack:
        node = stack.pop()          # LIFO = depth first
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                stack.append(nb)

# --- Binary tree BFS — level order ---
def level_order(root):
    if not root: return []
    q, result = deque([root]), []
    while q:
        level_vals = []
        for _ in range(len(q)):     # snapshot length = one level
            node = q.popleft()
            level_vals.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level_vals)
    return result`,
      related:['collections.deque','two-pointers','dp-basics'],
      tags:['python','BFS','DFS','graph','tree','interview','traversal'],
      interview:[
        'BFS uses a queue (deque) — guarantees shortest path in unweighted graphs',
        'DFS uses a stack (recursion or explicit) — better for connectivity, topo sort, backtracking',
        'Mark visited WHEN ENQUEUING (BFS) — marking when dequeuing allows duplicates into the queue',
        'Trees never need a visited set (no cycles); graphs always do',
      ],
      mistakes:['For BFS, adding to visited when dequeuing (not enqueuing) causes the same node to be queued multiple times.'],
      notes:['For weighted shortest paths use heapq (Dijkstra); topological sort is DFS with a post-order stack.']
    },
    ] // end bfs-dfs.fns
  }, // end bfs-dfs cat
  {
    key:'dp-memoize', label:'Dynamic Programming',
    fns:[
    {
      id:'dp-basics', name:'Memoization & Tabulation', purpose:'Cache overlapping subproblems — top-down with @cache, bottom-up with a DP table',
      badge:['python'], snippet:'@lru_cache(maxsize=None)\ndef fib(n): return fib(n-1)+fib(n-2) if n>1 else n',
      sig:'Top-down: @functools.cache   Bottom-up: fill 1D/2D array in dependency order',
      meta:{ ret:'varies', mut:false, time:'O(states × transition)', space:'O(states)' },
      params:[],
      code:
`from functools import lru_cache

# --- Top-down memoization with @lru_cache ---
@lru_cache(maxsize=None)   # or @functools.cache (Python 3.9+)
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

fib(50)   # O(n) — each subproblem solved once, cached after

# --- Bottom-up tabulation ---
def fib_tab(n):
    if n <= 1: return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

# Space-optimised: O(1) — only last two values needed
def fib_opt(n):
    a, b = 0, 1
    for _ in range(n): a, b = b, a + b
    return a

# --- 0/1 Knapsack — 2D DP ---
def knapsack(weights, values, cap):
    n = len(weights)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(cap + 1):
            dp[i][w] = dp[i-1][w]              # skip item i
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w],
                    dp[i-1][w - weights[i-1]] + values[i-1])
    return dp[n][cap]

# --- Coin change — unbounded, 1D DP ---
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
      related:['functools.lru_cache','two-pointers','bfs-dfs-basics'],
      tags:['python','dynamic programming','memoization','lru_cache','tabulation','interview'],
      interview:[
        '@lru_cache converts any recursive solution to memoized DP instantly — no manual cache dict needed',
        'Top-down: recurse from goal to base cases. Bottom-up: iterate from base cases up to goal.',
        'DP applies when: optimal substructure (optimal solution uses optimal sub-solutions) + overlapping subproblems',
        '2D DP for 2 changing variables: dp[i][w] = knapsack, dp[i][j] = edit distance / LCS',
      ],
      mistakes:['Mutable arguments (lists, dicts) break @lru_cache — convert to tuple before calling the cached function.'],
      notes:['Many 2D DP tables compress to 1D by iterating in the right direction — cuts space from O(n²) to O(n).']
    },
    ] // end dp-memoize.fns
  }, // end dp-memoize cat
  {
    key:'bit-tricks', label:'Bit Manipulation',
    fns:[
    {
      id:'bit-ops', name:'Bit Manipulation', purpose:'Integer-level operations — O(1) tricks that eliminate branches and extra memory',
      badge:['python'], snippet:'n & (n-1)   # clear lowest set bit\nn & (-n)    # isolate lowest set bit\na ^ a == 0  # XOR self-cancels',
      sig:'& | ^ ~ << >>  plus standard bit idioms',
      meta:{ ret:'int', mut:false, time:'O(1)', space:'O(1)' },
      params:[],
      code:
`a, b = 0b1010, 0b1100    # 10, 12

a & b    # 0b1000 =  8   AND — bits set in BOTH
a | b    # 0b1110 = 14   OR  — bits set in EITHER
a ^ b    # 0b0110 =  6   XOR — bits set in EXACTLY ONE
~a       # -11           NOT — flip all bits (two's complement)
a << 1   # 20            left shift  = × 2
a >> 1   #  5            right shift = // 2

n = 12   # 0b1100

# Is n a power of 2?  (exactly one bit set)
is_pow2 = n > 0 and (n & (n - 1)) == 0   # True for 1,2,4,8,...

# Count set bits (popcount)
bin(n).count('1')   # 2
n.bit_count()       # 2  — Python 3.10+

# Isolate lowest set bit
n & (-n)            # 4  (0b0100)

# Clear lowest set bit
n & (n - 1)         # 8  (0b1000)

# Get / set / clear bit at position k
k = 2
(n >> k) & 1        # get bit k   → 1
n |  (1 << k)       # set bit k
n & ~(1 << k)       # clear bit k

# XOR trick: find single non-duplicate (a^a=0, a^0=a)
from functools import reduce
import operator
nums = [4, 1, 2, 1, 2]
reduce(operator.xor, nums)   # 4 — pairs cancel, unique remains`,
      related:['functools.reduce','math-basics'],
      tags:['python','bitwise','bit manipulation','interview','XOR','tricks'],
      interview:[
        'n & (n-1) clears the lowest set bit — count how many times until 0 gives popcount',
        'n & (-n) isolates the lowest set bit — used in Fenwick/BIT trees',
        'XOR identity: a^a=0, a^0=a — find the unique element in O(n) time, O(1) space',
        'Left shift by k = multiply by 2^k; right shift by k = floor-divide by 2^k',
      ],
      mistakes:['Python\'s ~ returns -(n+1) due to arbitrary-precision two\'s complement — mask with & 0xFF etc if you need unsigned.'],
      notes:['Python integers are arbitrary precision — bit_length() gives number of bits needed; bit_count() (3.10+) is popcount.']
    },
    ] // end bit-tricks.fns
  }, // end bit-tricks cat
  ] // end Interview Patterns cats
}, // end Interview Patterns group

  ] // end groups
}; // end PYREF_PYTHON
