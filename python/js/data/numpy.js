/* PyRef — NumPy Data */
window.PYREF_NUMPY = {
  lang:'numpy', label:'NumPy',
  groups:[
  {
    label:'Array Creation',
    cats:[
    {
      key:'np-create', label:'Array Creation',
      fns:[
      {
        id:'np-array', name:'np.array()', purpose:'Creates an ndarray from a list or nested list',
        badge:['numpy'], snippet:'import numpy as np\narr = np.array([[1,2,3],[4,5,6]])',
        sig:'np.array(object, dtype=None, copy=True, ndmin=0)',
        meta:{ ret:'ndarray', mut:true, time:'O(n)', space:'O(n)' },
        params:[
          { name:'object', type:'array_like', req:true, desc:'List, nested list, or any array-like.' },
          { name:'dtype',  type:'dtype | None', default:'None', desc:'Desired data type. Inferred if None.' }
        ],
        code:
`import numpy as np

a = np.array([1,2,3,4])          # 1D
b = np.array([[1,2],[3,4]])       # 2D
b.shape   # (2,2)
b.dtype   # int64
b.ndim    # 2

# Dtype control
np.array([1,2,3], dtype=float)   # [1. 2. 3.]
np.array([1,2,3], dtype=np.int32)

# zeros, ones, arange, linspace
np.zeros((3,4))                  # 3×4 zeros
np.ones((2,3), dtype=int)        # 2×3 ones
np.arange(0, 10, 2)              # [0 2 4 6 8]
np.linspace(0, 1, 5)             # [0. .25 .5 .75 1.]`,
        related:['np.zeros()','np.ones()','np.arange()','np.reshape()'],
        tags:['numpy','array creation','ndarray'],
        interview:[
          'Shape vs size: shape=(3,4) means 3 rows, 4 cols; size=12 total elements',
          'arange vs linspace: arange specifies step size; linspace specifies number of points',
          'dtype matters for memory and performance: float32 vs float64',
        ],
        mistakes:['np.array([1,2,3]) creates a view — modifying it may affect source. Use np.array(lst, copy=True) to ensure a copy.'],
        notes:['NumPy arrays are homogeneous — all elements must be the same dtype.']
      },
      {
        id:'np-reshape', name:'reshape() / flatten()', purpose:'Change the shape of an array without copying data',
        badge:['numpy'], snippet:'arr.reshape(rows, cols)',
        sig:'ndarray.reshape(*shape)   ndarray.flatten()   ndarray.ravel()',
        meta:{ ret:'ndarray view/copy', mut:false, time:'O(1) reshape, O(n) flatten', space:'O(1) view' },
        params:[{ name:'shape', type:'tuple[int,...]', req:true, desc:'New shape. Use -1 to infer one dimension.' }],
        code:
`a = np.arange(12)        # [0..11]
a.reshape(3, 4)           # 3 rows, 4 cols
a.reshape(3, -1)          # -1 infers 4
a.reshape(-1)             # same as flatten to 1D

a.flatten()               # always returns a copy
a.ravel()                 # returns a view if possible (faster)

# Transpose
b = np.array([[1,2],[3,4]])
b.T                       # [[1,3],[2,4]]`,
        related:['np.array()','np.transpose()'],
        tags:['numpy','reshaping','dimensions'],
        interview:[
          'reshape(-1) flattens to 1D; reshape(-1,1) makes a column vector',
          'ravel() is faster than flatten() — returns a view when possible',
        ],
        mistakes:['reshape total elements must stay the same — np.arange(6).reshape(2,4) raises ValueError.'],
        notes:['A reshaped array shares memory with the original — modifying one modifies both.']
      },
      ]
    },
    {
      key:'np-ops', label:'Array Operations',
      fns:[
      {
        id:'np-slice', name:'Indexing & Slicing', purpose:'Access elements, rows, columns, and sub-arrays',
        badge:['numpy'], snippet:'arr[row, col]   arr[:, 1]   arr[arr > 0]',
        sig:'arr[i]  arr[i,j]  arr[start:stop:step]  arr[condition]',
        meta:{ ret:'ndarray view or scalar', mut:false, time:'O(1) basic, O(n) boolean', space:'O(1) view' },
        params:[],
        code:
`a = np.array([[1,2,3],[4,5,6],[7,8,9]])

a[0]         # [1,2,3]   first row
a[1,2]       # 6         row 1, col 2
a[:,1]       # [2,5,8]   all rows, col 1
a[0:2,1:]    # [[2,3],[5,6]]

# Boolean indexing
a[a > 5]                  # [6,7,8,9]
a[a % 2 == 0]             # [2,4,6,8]

# Fancy indexing
a[[0,2], :]               # rows 0 and 2
a[:, [0,2]]               # cols 0 and 2`,
        related:['np.where()','np.nonzero()'],
        tags:['numpy','indexing','slicing','boolean'],
        interview:[
          'Boolean indexing: arr[arr > 0] — returns matching elements as flat array',
          'Slices return views; boolean/fancy indexing returns copies',
        ],
        mistakes:['NumPy slices are views — modifying the slice modifies the original.'],
        notes:['Fancy indexing (integer array indexing) returns a copy, not a view.']
      },
      {
        id:'np-where', name:'np.where / np.select / np.clip', purpose:'Conditional element selection and value bounding',
        badge:['numpy'], snippet:'np.where(condition, x, y)',
        sig:'np.where(condition[, x, y])  np.select(conditions, choices)  np.clip(a, a_min, a_max)',
        meta:{ ret:'ndarray', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'condition', type:'array_like bool', req:true, desc:'Boolean array mask.' },
          { name:'x', type:'array_like', req:true, desc:'Values where condition is True.' },
          { name:'y', type:'array_like', req:true, desc:'Values where condition is False.' }
        ],
        code:
`import numpy as np

a = np.array([1, -2, 3, -4, 5])

# np.where(cond, true_val, false_val)
np.where(a > 0, a, 0)        # [1, 0, 3, 0, 5] — ReLU
np.where(a > 0, 1, -1)       # [1,-1, 1,-1, 1] — sign

# Multiple conditions — np.select
conditions = [a < 0, a == 0, a > 0]
choices    = [-1,    0,       1]
np.select(conditions, choices, default=0)   # sign function

# np.clip — bound values to a range
np.clip(a, 0, None)     # [1, 0, 3, 0, 5] — clip to [0, ∞)
np.clip(a, -1, 3)       # [1,-1, 3,-1, 3]

# One-arg where: return indices of True
np.where(a > 0)         # (array([0,2,4]),) — index with [0]`,
        related:['np.nonzero()','np.argmax()','np.select()'],
        tags:['numpy','conditional','clip','masking'],
        interview:[
          'np.where(cond, x, y) is a vectorized ternary — replaces Python loops',
          'ReLU: np.where(a > 0, a, 0) or equivalently np.clip(a, 0, None)',
          'np.where(cond) with one arg returns indices of True values — same as np.nonzero()',
        ],
        mistakes:['np.where(cond) returns a tuple of arrays (one per dimension) — index with [0] for 1D.'],
        notes:['np.where evaluates both x and y branches fully before applying condition — avoid expensive side effects.']
      },
      {
        id:'np-sort', name:'sort / argsort / unique', purpose:'Sort arrays and find unique values with counts',
        badge:['numpy'], snippet:'np.sort(arr)   np.argsort(arr)   np.unique(arr, return_counts=True)',
        sig:'np.sort(a, axis=-1)  np.argsort(a)  np.unique(a, return_counts=False)',
        meta:{ ret:'ndarray', mut:false, time:'O(n log n)', space:'O(n)' },
        params:[
          { name:'a', type:'ndarray', req:true, desc:'Input array.' },
          { name:'axis', type:'int | None', default:'-1', desc:'Sort along this axis. None flattens first.' }
        ],
        code:
`import numpy as np

a = np.array([3, 1, 4, 1, 5, 9, 2, 6])

np.sort(a)           # [1,1,2,3,4,5,6,9] — new array
a.sort()             # in-place, no return value

# argsort — indices that would sort the array
idx = np.argsort(a)  # [1,3,6,0,2,4,7,5]
a[idx]               # same as np.sort(a)

# Sort descending
np.sort(a)[::-1]                   # reverse sorted copy
a[np.argsort(a)[::-1]]             # via argsort

# unique
vals = np.array([1,2,2,3,3,3])
np.unique(vals)                            # [1,2,3]
np.unique(vals, return_counts=True)        # ([1,2,3], [1,2,3])
np.unique(vals, return_index=True)         # ([1,2,3], [0,1,3])

# 2D: sort each row
m = np.array([[3,1],[4,1]])
np.sort(m, axis=1)   # [[1,3],[1,4]]`,
        related:['np.argmax()','np.partition()'],
        tags:['numpy','sorting','unique','argsort'],
        interview:[
          'argsort gives the permutation that sorts — reorder multiple arrays consistently',
          'Top-k indices: <code>np.argsort(a)[-k:]</code> is O(n log n); <code>np.argpartition(a,-k)[-k:]</code> is O(n)',
          'np.unique(a, return_counts=True) is a fast frequency counter for numeric arrays',
        ],
        mistakes:['np.sort returns a new array; a.sort() modifies in-place — unlike Python list which also returns None.'],
        notes:['For partial sort (top k only), np.argpartition is O(n) vs O(n log n) for full sort.']
      },
      {
        id:'np-linalg', name:'dot / matmul / linalg', purpose:'Matrix multiplication and linear algebra essentials',
        badge:['numpy'], snippet:'C = A @ B   np.linalg.norm(v)',
        sig:'np.dot(a, b)   np.matmul(a, b)   a @ b   np.linalg.norm/solve/eig/inv',
        meta:{ ret:'ndarray', mut:false, time:'O(n³) matmul', space:'O(n²)' },
        params:[],
        code:
`import numpy as np

v = np.array([3, 4])
A = np.array([[1,2],[3,4]])
B = np.array([[5,6],[7,8]])

# Dot product (vectors) — scalar
np.dot(v, v)          # 25  (3²+4²)

# Matrix multiplication — @ operator (Python 3.5+)
A @ B                 # [[19,22],[43,50]]
np.matmul(A, B)       # same

# Element-wise multiply (NOT matrix multiply)
A * B                 # [[5,12],[21,32]]

# Linear algebra
np.linalg.norm(v)          # 5.0  (Euclidean / L2 norm)
np.linalg.norm(v, ord=1)   # 7.0  (L1 norm)

np.linalg.det(A)           # -2.0
np.linalg.inv(A)           # matrix inverse

# Solve Ax = b — more stable than inv(A) @ b
np.linalg.solve(A, v)

vals, vecs = np.linalg.eig(A)   # eigenvalues, eigenvectors`,
        related:['np.vectorize()','np.dot()'],
        tags:['numpy','linear algebra','matrix multiplication','dot product'],
        interview:[
          'Use @ operator for matrix multiplication — cleaner than np.matmul',
          'Never compute np.linalg.inv(A) @ b — use np.linalg.solve(A, b) instead (more stable, faster)',
          'Cosine similarity: <code>np.dot(a,b) / (np.linalg.norm(a)*np.linalg.norm(b))</code>',
        ],
        mistakes:['A * B is element-wise Hadamard product, NOT matrix multiplication — use A @ B for matmul.'],
        notes:['np.einsum is the most general way to express tensor contractions and reductions in one expression.']
      },
      {
        id:'np-vectorize', name:'Vectorized Operations', purpose:'Element-wise math without Python loops',
        badge:['numpy','on'], snippet:'result = a + b   np.sum(arr, axis=0)',
        sig:'np.sum/mean/std/max/min(arr, axis=None)',
        meta:{ ret:'ndarray or scalar', mut:false, time:'O(n)', space:'O(1) to O(n)' },
        params:[
          { name:'arr', type:'ndarray', req:true, desc:'Input array.' },
          { name:'axis', type:'int | None', default:'None', desc:'Axis to operate along. None reduces all elements.' }
        ],
        code:
`a = np.array([[1,2,3],[4,5,6]])

np.sum(a)          # 21  — all elements
np.sum(a, axis=0)  # [5,7,9]  — column-wise
np.sum(a, axis=1)  # [6,15]   — row-wise
np.mean(a)         # 3.5
np.std(a)          # ~1.7

# Element-wise — no loops needed
b = np.array([[10,20,30],[40,50,60]])
a + b              # [[11,22,33],[44,55,66]]
a * 2              # [[2,4,6],[8,10,12]]
np.sqrt(a)         # element-wise sqrt

# Broadcasting
a + np.array([1,2,3])  # adds [1,2,3] to each row`,
        related:['np.array()','np.dot()','np.where()'],
        tags:['numpy','vectorization','broadcasting','math'],
        interview:[
          'Vectorized ops run in C — 100x faster than Python loops for numerical work',
          'Broadcasting: arrays with compatible shapes operate element-wise without copying',
          'axis=0 aggregates across rows (per column); axis=1 aggregates across columns (per row)',
        ],
        mistakes:['axis=0 for sum gives column sums, NOT row sums — easy to confuse.'],
        notes:['Prefer np.sum() over built-in sum() for NumPy arrays — faster and supports axis argument.']
      },
      {
        id:'np-random', name:'np.random', purpose:'Generate random numbers, samples, and shuffled arrays',
        badge:['numpy'], snippet:'rng = np.random.default_rng(seed=42)\nrng.integers(0, 10, size=5)',
        sig:'np.random.default_rng(seed)   rng.integers/random/normal/choice/shuffle/permutation',
        meta:{ ret:'ndarray or scalar', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'seed', type:'int | None', default:'None', desc:'Seed for reproducibility. None uses OS entropy.' },
          { name:'size', type:'int | tuple', default:'None', desc:'Output shape. None returns a scalar.' }
        ],
        code:
`import numpy as np

# New-style Generator (preferred over legacy np.random.*)
rng = np.random.default_rng(seed=42)

rng.integers(0, 10, size=5)             # 5 random ints in [0, 10)
rng.random(size=(3, 3))                 # 3×3 float64 in [0.0, 1.0)
rng.normal(loc=0, scale=1, size=1000)   # standard normal
rng.uniform(low=-1, high=1, size=5)     # uniform in [-1, 1)

# Sampling
arr = np.array([10, 20, 30, 40, 50])
rng.choice(arr, size=3, replace=False)  # 3 unique samples
rng.shuffle(arr)                        # in-place shuffle
rng.permutation(arr)                    # shuffled copy (new array)

# Legacy API (still common in older code)
np.random.seed(42)
np.random.rand(3, 3)         # [0,1) uniform
np.random.randn(3, 3)        # standard normal
np.random.randint(0, 10, size=5)`,
        related:['np.random.default_rng()','np.where()','np.unique()'],
        tags:['numpy','random','sampling','distribution','seed'],
        interview:[
          'Use np.random.default_rng(seed) — the new Generator API is faster and more thread-safe than legacy np.random.*',
          'Set seed for reproducibility in experiments, tests, and reproducible data splits',
          'rng.choice(arr, replace=False) for sampling without replacement — train/test split indices',
        ],
        mistakes:['np.random.seed() sets global state — affects all random calls globally; default_rng() is local and composable.'],
        notes:['For cryptographic randomness use Python\'s secrets module, not NumPy.']
      },
      {
        id:'np-stack', name:'concatenate / stack / split', purpose:'Join and split arrays along existing or new axes',
        badge:['numpy'], snippet:'np.vstack([a, b])   np.concatenate([a, b], axis=0)',
        sig:'np.concatenate(arrays, axis=0)  np.stack(arrays, axis=0)  np.split(a, indices_or_sections)',
        meta:{ ret:'ndarray', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'arrays', type:'sequence of ndarray', req:true, desc:'Arrays to join. Must have compatible shapes.' },
          { name:'axis', type:'int', default:'0', desc:'Axis along which to join. stack() creates a NEW axis at this position.' }
        ],
        code:
`import numpy as np

a = np.array([[1, 2], [3, 4]])   # shape (2,2)
b = np.array([[5, 6], [7, 8]])   # shape (2,2)

# concatenate — join along an EXISTING axis
np.concatenate([a, b], axis=0)   # shape (4,2) — stack rows
np.concatenate([a, b], axis=1)   # shape (2,4) — stack cols

# vstack / hstack — convenience wrappers
np.vstack([a, b])    # same as concat axis=0 → (4,2)
np.hstack([a, b])    # same as concat axis=1 → (2,4)

# stack — join along a NEW axis (all inputs must have same shape)
np.stack([a, b], axis=0)    # shape (2,2,2) — new axis at front
np.stack([a, b], axis=2)    # shape (2,2,2) — new axis at end

# split — divide into sub-arrays
np.split(np.arange(12), 3)        # 3 equal parts
np.split(np.arange(10), [3, 7])   # at indices → [0..2],[3..6],[7..9]
np.vsplit(a, 2)                   # split along rows
np.hsplit(a, 2)                   # split along cols`,
        related:['np.array()','np.reshape()','np.tile()','np.repeat()'],
        tags:['numpy','concatenate','stack','split','joining','batching'],
        interview:[
          'concatenate joins on an EXISTING axis; stack creates a NEW axis — know which shape you need',
          'np.vstack is concat axis=0; np.hstack is concat axis=1 (for 2D arrays)',
          'Batching images: np.stack([img1, img2, img3], axis=0) → shape (3, H, W, C)',
        ],
        mistakes:['np.stack requires all arrays to have the SAME shape; np.concatenate only needs matching non-join axes.'],
        notes:['np.block() handles block-matrix assembly; np.tile() and np.repeat() replicate arrays.']
      },
      ]
    },
    ]
  }
  ]
};
