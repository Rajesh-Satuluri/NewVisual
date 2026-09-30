/* PyRef — Pandas Data */
window.PYREF_PANDAS = {
  lang:'pandas', label:'Pandas',
  groups:[
  {
    label:'DataFrame Basics',
    cats:[
    {
      key:'pd-create', label:'Creating DataFrames',
      fns:[
      {
        id:'pd-dataframe', name:'pd.DataFrame()', purpose:'Creates a DataFrame from dicts, lists, or NumPy arrays',
        badge:['pandas'], snippet:'import pandas as pd\ndf = pd.DataFrame(data)',
        sig:'pd.DataFrame(data=None, index=None, columns=None, dtype=None)',
        meta:{ ret:'DataFrame', mut:true, time:'O(n)', space:'O(n)' },
        params:[
          { name:'data', type:'dict | list | ndarray', default:'None', desc:'Source data. Dict keys become column names; list of dicts auto-creates columns.' },
          { name:'index', type:'array-like | Index', default:'RangeIndex', desc:'Row labels.' }
        ],
        code:
`import pandas as pd

# From dict
df = pd.DataFrame({
    'name':  ['Alice','Bob','Carol'],
    'age':   [25, 30, 27],
    'score': [88.5, 92.0, 79.3]
})

df.shape        # (3, 3)
df.dtypes       # name: object, age: int64, score: float64
df.columns      # Index(['name','age','score'])
df.index        # RangeIndex(start=0, stop=3)
df.head(2)      # first 2 rows
df.describe()   # count, mean, std, min, quartiles, max`,
        related:['pd.read_csv()','pd.Series()','df.assign()'],
        tags:['pandas','DataFrame','creation'],
        interview:[
          'Check shape before any analysis: shape, dtypes, head(), describe(), isnull().sum()',
          'From list of dicts: pd.DataFrame([{"a":1},{"a":2}]) — each dict is a row',
        ],
        mistakes:['DataFrame column order may not match dict insertion order in Python < 3.7.'],
        notes:['DataFrames are column-oriented — operations on columns are faster than on rows.']
      },
      ]
    },
    {
      key:'pd-select', label:'Selection & Filtering',
      fns:[
      {
        id:'pd-loc-iloc', name:'loc / iloc', purpose:'Label-based and integer position-based row/column selection',
        badge:['pandas'], snippet:'df.loc[row_label, col_name]   df.iloc[0, 1]',
        sig:'df.loc[row_indexer, col_indexer]   df.iloc[row_int, col_int]',
        meta:{ ret:'Series or DataFrame', mut:false, time:'O(1) to O(n)', space:'O(n)' },
        params:[],
        code:
`df = pd.DataFrame({'a':[1,2,3],'b':[4,5,6]}, index=['x','y','z'])

df.loc['x']            # row with label 'x'
df.loc['x','a']        # value at label x, col a = 1
df.loc['x':'y', 'a']   # slice by label (inclusive!)

df.iloc[0]             # first row by integer position
df.iloc[0, 1]          # row 0, col 1 = 4
df.iloc[0:2, :]        # first two rows

# Boolean selection
df.loc[df['a'] > 1]    # rows where a > 1

# Multiple conditions
df.loc[(df['a']>1) & (df['b']<6)]`,
        related:['df.query()','df.at','df.iat'],
        tags:['pandas','selection','indexing'],
        interview:[
          'loc is label-based and INCLUSIVE of stop; iloc is position-based and EXCLUSIVE of stop',
          'Boolean indexing: df[df["col"] > value] — the most common filtering pattern',
          'df.at[label, col] and df.iat[i,j] are faster for single-cell access',
        ],
        mistakes:['loc slicing is inclusive on both ends; iloc slicing is exclusive at end — matches Python convention.'],
        notes:['Use df.query("a > 1 and b < 6") for string-based filtering — cleaner in some cases.']
      },
      {
        id:'pd-groupby', name:'groupby()', purpose:'Split → Apply → Combine aggregation on groups',
        badge:['pandas'], snippet:'df.groupby("col").agg({"val":"sum"})',
        sig:'df.groupby(by, axis=0, sort=True, dropna=True)',
        meta:{ ret:'DataFrameGroupBy → DataFrame/Series', mut:false, time:'O(n log n)', space:'O(n)' },
        params:[{ name:'by', type:'str | list[str]', req:true, desc:'Column name(s) to group by.' }],
        code:
`df = pd.DataFrame({
    'dept': ['Eng','Eng','HR','HR','Eng'],
    'name': ['Alice','Bob','Carol','Dan','Eve'],
    'salary': [90000,85000,70000,75000,95000]
})

# Single aggregation
df.groupby('dept')['salary'].mean()
# Eng: 90000.0  HR: 72500.0

# Multiple aggregations
df.groupby('dept').agg(
    avg_sal=('salary','mean'),
    count=('name','count'),
    max_sal=('salary','max')
)

# Transform (keeps original index)
df['dept_avg'] = df.groupby('dept')['salary'].transform('mean')`,
        related:['df.pivot_table()','df.resample()','pd.merge()'],
        tags:['pandas','groupby','aggregation','SQL-like'],
        interview:[
          'groupby + agg is the pandas equivalent of SQL GROUP BY + aggregate functions',
          'transform() returns same shape as original — useful for adding group statistics as columns',
          'nunique(), size() vs count(): count excludes NaN; size includes it',
        ],
        mistakes:['groupby result index is the group key — call reset_index() if you want a flat DataFrame.'],
        notes:['Named aggregation syntax (agg(col=(src_col, func))) produces cleaner column names.']
      },
      ]
    },
    {
      key:'pd-transform', label:'Transform & Clean',
      fns:[
      {
        id:'pd-apply', name:'apply() / map() / applymap()', purpose:'Apply functions across rows, columns, or element-wise',
        badge:['pandas'], snippet:'df["new"] = df["col"].apply(func)',
        sig:'Series.apply(func)   DataFrame.apply(func, axis=0)',
        meta:{ ret:'Series or DataFrame', mut:false, time:'O(n) — but slow; prefer vectorized', space:'O(n)' },
        params:[
          { name:'func', type:'Callable', req:true, desc:'Function applied to each element, row, or column.' },
          { name:'axis', type:'0|1', default:'0', desc:'0 = apply to each column; 1 = apply to each row.' }
        ],
        code:
`df = pd.DataFrame({'a':[1,2,3],'b':[4,5,6]})

# Series.apply — element-wise on a column
df['a'].apply(lambda x: x**2)      # 1, 4, 9

# DataFrame.apply — per column
df.apply('sum')                     # a:6, b:15

# DataFrame.apply — per row (axis=1)
df.apply(lambda row: row['a']+row['b'], axis=1)

# Prefer vectorized ops over apply
df['a'] * 2          # faster than df['a'].apply(lambda x: x*2)
df['a'] + df['b']    # faster than apply(sum, axis=1)`,
        related:['df.assign()','df.transform()','np.vectorize()'],
        tags:['pandas','apply','transform','functional'],
        interview:[
          'apply() is slow — use vectorized operations (df["col"] * 2) whenever possible',
          'apply(axis=1) for row-wise custom logic when vectorization is not straightforward',
          'pd.cut() and pd.qcut() for binning; np.where() for conditional column creation',
        ],
        mistakes:['apply() with Python lambda is much slower than NumPy vectorized operations on columns.'],
        notes:['For simple arithmetic and string ops, pandas has built-in methods: .str.upper(), .dt.year, etc.']
      },
      {
        id:'pd-missing', name:'fillna / dropna / isna', purpose:'Handle missing values (NaN) in DataFrames',
        badge:['pandas'], snippet:'df.isna().sum()   df.fillna(0)   df.dropna(subset=["col"])',
        sig:'df.fillna(value | method)   df.dropna(axis=0, how="any", subset=None)   df.isna()',
        meta:{ ret:'DataFrame', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'value', type:'scalar | dict | Series', req:false, desc:'Fill NaN with this value. Dict fills per-column.' },
          { name:'method', type:'"ffill"|"bfill"', req:false, desc:'Forward-fill or backward-fill from adjacent values.' },
          { name:'how', type:'"any"|"all"', default:'"any"', desc:'Drop row if any NaN ("any") or only all NaN ("all").' },
          { name:'subset', type:'list[str]', req:false, desc:'Only consider these columns when deciding to drop rows.' }
        ],
        code:
`df = pd.DataFrame({'a':[1,None,3],'b':[None,2,3],'c':['x',None,'z']})

# Detect
df.isna().sum()            # count NaN per column
df.isna().any().any()      # True if any NaN anywhere

# Fill
df.fillna(0)               # fill all NaN with 0
df.fillna({'a':0,'c':'unknown'})           # per-column
df['a'].fillna(df['a'].mean())             # fill with column mean
df.fillna(method='ffill')  # forward-fill (last known value)
df.fillna(method='bfill')  # backward-fill

# Drop rows
df.dropna()                    # drop rows with any NaN
df.dropna(how='all')           # drop rows where ALL are NaN
df.dropna(subset=['a','b'])    # drop only if NaN in these cols
df.dropna(thresh=2)            # keep rows with ≥ 2 non-NaN`,
        related:['df.interpolate()','df.astype()','pd.isna()'],
        tags:['pandas','missing values','NaN','data cleaning'],
        interview:[
          'fillna(method="ffill") for time-series gaps — carry last known value forward',
          'Never compare to NaN with == — use df.isna() or pd.isna(val)',
          'After merge, NaN in a column typically means no match — signals join type choice',
        ],
        mistakes:['df.fillna(inplace=True) modifies df but returns None — cannot chain with other operations.'],
        notes:['In pandas, None and np.nan are both treated as missing in numeric columns.']
      },
      {
        id:'pd-pivot', name:'pivot_table / melt', purpose:'Reshape DataFrames: wide ↔ long format',
        badge:['pandas'], snippet:'df.pivot_table(values="v", index="r", columns="c", aggfunc="sum")',
        sig:'pivot_table(values, index, columns, aggfunc)   melt(id_vars, value_vars)',
        meta:{ ret:'DataFrame', mut:false, time:'O(n log n)', space:'O(n)' },
        params:[
          { name:'values', type:'str | list', req:true, desc:'Column(s) to aggregate.' },
          { name:'index', type:'str | list', req:true, desc:'Row grouping keys.' },
          { name:'columns', type:'str | list', req:true, desc:'Column grouping keys — unique values become columns.' },
          { name:'aggfunc', type:'str | func', default:'"mean"', desc:'"sum","mean","count","max","min" or custom function.' }
        ],
        code:
`df = pd.DataFrame({
    'date':   ['2024-01','2024-01','2024-02','2024-02'],
    'region': ['East',  'West',  'East',  'West'],
    'sales':  [100,     200,     150,     250],
})

# pivot_table — like Excel pivot: rows × columns → aggregated cells
pt = df.pivot_table(
    values='sales',
    index='date',
    columns='region',
    aggfunc='sum',
    fill_value=0
)
#         East  West
# 2024-01  100   200
# 2024-02  150   250

# melt — wide to long (inverse of pivot)
wide = pd.DataFrame({'id':[1,2],'Jan':[100,90],'Feb':[200,180]})
pd.melt(wide, id_vars='id', var_name='month', value_name='sales')
#    id month  sales
# 0   1   Jan    100
# 1   2   Jan     90  ...`,
        related:['df.groupby()','df.stack()','df.unstack()'],
        tags:['pandas','reshape','pivot','melt','wide-to-long'],
        interview:[
          'pivot_table is like SQL crosstab — rows × columns → aggregated cells',
          'melt is the inverse of pivot: wide format → long format',
          'stack/unstack operate on index hierarchy; pivot/melt operate on column values',
        ],
        mistakes:['pivot (not pivot_table) raises on duplicate index/column pairs — always use pivot_table.'],
        notes:['pd.crosstab is a convenience wrapper around pivot_table for frequency tables.']
      },
      {
        id:'pd-datetime', name:'pd.to_datetime / .dt accessor', purpose:'Parse dates and extract datetime components',
        badge:['pandas'], snippet:'df["dt"] = pd.to_datetime(df["date_str"])\ndf["year"] = df["dt"].dt.year',
        sig:'pd.to_datetime(arg, format=None, errors="raise")   Series.dt.<component>',
        meta:{ ret:'datetime64 Series', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'format', type:'str | None', default:'None', desc:'strptime format string. Providing it is much faster than auto-parsing.' },
          { name:'errors', type:'"raise"|"coerce"|"ignore"', default:'"raise"', desc:'"coerce" sets invalid dates to NaT.' }
        ],
        code:
`df = pd.DataFrame({'date_str':['2024-01-15','2024-02-20','2024-03-10']})

# Parse string column to datetime
df['date'] = pd.to_datetime(df['date_str'])

# Extract components via .dt accessor
df['year']    = df['date'].dt.year
df['month']   = df['date'].dt.month
df['day']     = df['date'].dt.day
df['weekday'] = df['date'].dt.dayofweek  # Mon=0, Sun=6
df['quarter'] = df['date'].dt.quarter

# Date arithmetic
df['date'] + pd.Timedelta(days=30)
(df['end'] - df['start']).dt.days    # duration in days

# Resample — requires datetime index
df.set_index('date').resample('M')['value'].sum()    # monthly totals
df.set_index('date').resample('W')['value'].mean()   # weekly average`,
        related:['df.groupby()','pd.Timedelta','df.resample()'],
        tags:['pandas','datetime','time series','dt accessor','resample'],
        interview:[
          'Always provide format= for large DataFrames — 10x faster than auto-inference',
          'errors="coerce" turns unparseable dates to NaT — use .isna() to find them',
          '.dt.to_period("M") converts to Period — easier for month/quarter grouping',
        ],
        mistakes:['String comparison on date columns works alphabetically but is fragile — convert to datetime first.'],
        notes:['pd.DateOffset for calendar-aware offsets (business days, month ends); pd.Timedelta for fixed durations.']
      },
      {
        id:'pd-merge', name:'merge() / join() / concat()', purpose:'Combine DataFrames by rows or columns',
        badge:['pandas'], snippet:'pd.merge(df1, df2, on="key", how="left")',
        sig:'pd.merge(left, right, how="inner", on=None, left_on=None, right_on=None)',
        meta:{ ret:'DataFrame', mut:false, time:'O(n log n)', space:'O(n)' },
        params:[
          { name:'how', type:'"inner"|"left"|"right"|"outer"', default:'"inner"', desc:'Type of merge. inner: matching rows only. left: all from left, NaN for non-matching right.' }
        ],
        code:
`emp = pd.DataFrame({'id':[1,2,3],'name':['A','B','C']})
dep = pd.DataFrame({'id':[1,2,4],'dept':['Eng','HR','Finance']})

# Inner join — only matching rows
pd.merge(emp, dep, on='id')
# id=1,2  only

# Left join — all from emp
pd.merge(emp, dep, on='id', how='left')
# id=1,2,3  NaN for C's dept

# Stack vertically (same columns)
pd.concat([df1, df2], ignore_index=True)

# Stack horizontally (same rows)
pd.concat([df1, df2], axis=1)`,
        related:['df.join()','df.groupby()','df.pivot_table()'],
        tags:['pandas','merge','join','SQL'],
        interview:[
          'merge is pandas\' SQL JOIN — inner/left/right/outer map directly to SQL join types',
          'Use suffixes= parameter to handle duplicate column names: suffixes=("_left","_right")',
          'concat stacks DataFrames — axis=0 for rows, axis=1 for columns',
        ],
        mistakes:['merge on columns with NaN — NaN != NaN, so NaN keys never match.'],
        notes:['For time-series data, use pd.merge_asof() for nearest-key (non-exact) matching.']
      },
      {
        id:'pd-value-counts', name:'value_counts / unique / nunique', purpose:'Count, list, and count distinct values in a Series',
        badge:['pandas'], snippet:'df["col"].value_counts()\ndf["col"].nunique()',
        sig:'Series.value_counts(normalize=False, sort=True, ascending=False, dropna=True)',
        meta:{ ret:'Series', mut:false, time:'O(n)', space:'O(k)' },
        params:[
          { name:'normalize', type:'bool', default:'False', desc:'Return relative frequencies (proportions) instead of raw counts.' },
          { name:'dropna', type:'bool', default:'True', desc:'Do not include NaN in counts. Set False to count missing values too.' }
        ],
        code:
`df = pd.DataFrame({
    'dept':  ['Eng','HR','Eng','Eng','HR','Finance'],
    'grade': ['A',  'B', 'A', None, 'C', 'A']
})

# Frequency table
df['dept'].value_counts()
# Eng      3
# HR       2
# Finance  1

# Proportions
df['dept'].value_counts(normalize=True)
# Eng      0.500
# HR       0.333
# Finance  0.167

# Include NaN in count
df['grade'].value_counts(dropna=False)
# A      3
# NaN    1  ...

# unique — array of distinct values (insertion order)
df['dept'].unique()     # array(['Eng','HR','Finance'])

# nunique — count distinct values (scalar)
df['dept'].nunique()    # 3
df.nunique()            # per-column unique counts

# 2-way frequency table
pd.crosstab(df['dept'], df['grade'])`,
        related:['df.groupby()','pd.crosstab()','df.describe()'],
        tags:['pandas','value_counts','frequency','unique','EDA','categorical'],
        interview:[
          'value_counts() is the first EDA step for categorical columns — reveals distribution at a glance',
          'normalize=True gives proportions; multiply by 100 for percentage breakdown',
          'df.nunique() across all columns helps distinguish ID-like vs categorical columns',
        ],
        mistakes:['value_counts() drops NaN by default — always check dropna=False if missing data is meaningful.'],
        notes:['pd.crosstab(col1, col2) gives a 2-way frequency table — shorthand for groupby + value_counts.']
      },
      {
        id:'pd-astype', name:'astype / dtype optimization', purpose:'Convert column dtypes and reduce DataFrame memory usage',
        badge:['pandas'], snippet:'df["col"].astype("int32")\ndf["cat"].astype("category")',
        sig:'Series.astype(dtype, errors="raise")   DataFrame.astype(dict)',
        meta:{ ret:'Series or DataFrame', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'dtype', type:'str | dtype | dict', req:true, desc:'Target dtype or dict mapping column names to dtypes.' },
          { name:'errors', type:'"raise"|"ignore"', default:'"raise"', desc:'"ignore" silently skips columns that cannot be converted.' }
        ],
        code:
`df = pd.DataFrame({
    'id':    [1, 2, 3],
    'price': ['9.99', '14.50', '3.25'],
    'dept':  ['Eng', 'HR', 'Eng']
})

# Convert string → numeric
df['price'] = df['price'].astype(float)

# Downcast integer to save memory (int64 → int8 if values fit)
df['id'] = df['id'].astype('int8')    # range: -128 to 127

# category dtype — huge win for low-cardinality string columns
df['dept'] = df['dept'].astype('category')

# Convert multiple columns at once
df = df.astype({'id': 'int32', 'price': 'float32'})

# Inspect memory
df.info()                     # dtypes + non-null counts + memory
df.memory_usage(deep=True)    # bytes per column

# Safe numeric coercion for dirty data
pd.to_numeric(df['price'], errors='coerce')   # bad values → NaN`,
        related:['pd.to_numeric()','pd.to_datetime()','df.convert_dtypes()'],
        tags:['pandas','astype','dtype','memory','optimization','category'],
        interview:[
          '"category" dtype for repeated string columns (department, country) — 5-10x memory savings',
          'float32 vs float64: half the memory, sufficient precision for most ML features',
          'Use df.convert_dtypes() for automatic best-fit dtype inference (pandas 1.0+)',
        ],
        mistakes:['astype() raises on unconvertible values — use pd.to_numeric(errors="coerce") for dirty data first.'],
        notes:['df.memory_usage(deep=True) shows true memory including variable-length object column strings.']
      },
      {
        id:'pd-cut', name:'pd.cut / pd.qcut', purpose:'Bin continuous values into discrete intervals or quantile-based buckets',
        badge:['pandas'], snippet:'pd.cut(df["age"], bins=[0,18,65,100], labels=["child","adult","senior"])',
        sig:'pd.cut(x, bins, labels=None, right=True)   pd.qcut(x, q, labels=None)',
        meta:{ ret:'Categorical Series', mut:false, time:'O(n log n)', space:'O(n)' },
        params:[
          { name:'bins', type:'int | list', req:true, desc:'Number of equal-width bins (int) or explicit bin edges (list).' },
          { name:'q', type:'int | list[float]', req:true, desc:'Number of quantiles or list of quantile probabilities in [0, 1].' },
          { name:'labels', type:'list | False', default:'None', desc:'Labels for each bin. False returns integer bin codes (0-indexed).' }
        ],
        code:
`import pandas as pd

scores = pd.Series([45, 62, 78, 91, 55, 83, 70, 39])

# pd.cut — fixed-width bins or explicit edges
pd.cut(scores, bins=3)
# (38.948, 57.0] / (57.0, 75.0] / (75.0, 91.0]

pd.cut(scores, bins=[0, 60, 75, 100],
       labels=['Fail', 'Pass', 'Distinction'])
# 45→Fail, 62→Pass, 83→Distinction

# pd.qcut — equal-frequency (quantile-based) bins
pd.qcut(scores, q=4,
        labels=['Q1', 'Q2', 'Q3', 'Q4'])
# Each quartile contains ~same number of values

# Add bin column to DataFrame
df = pd.DataFrame({'score': scores})
df['grade'] = pd.cut(df['score'],
                     bins=[0, 60, 75, 100],
                     labels=['F', 'P', 'D'])

df['grade'].value_counts()   # distribution across bins`,
        related:['df.value_counts()','df.groupby()','df.apply()'],
        tags:['pandas','binning','cut','qcut','discretize','feature-engineering'],
        interview:[
          'cut = fixed-width bins (use when you know domain thresholds); qcut = equal-frequency (distribution-agnostic)',
          'pd.cut(labels=False) returns integer bin codes — useful for ordinal encoding in ML',
          'Use pd.cut for age groups, salary bands; pd.qcut for percentile rankings',
        ],
        mistakes:['cut with int bins creates equal-WIDTH intervals; qcut creates equal-FREQUENCY intervals — very different for skewed data.'],
        notes:['Result dtype is Categorical — use .cat.codes for integer representation, .cat.categories for bin labels.']
      },
      {
        id:'pd-assign-pipe', name:'assign() / pipe()', purpose:'Method-chain DataFrame transformations without intermediate variables',
        badge:['pandas'], snippet:'df.assign(tax=lambda d: d["price"]*0.1).pipe(normalize)',
        sig:'df.assign(**kwargs)   df.pipe(func, *args, **kwargs)',
        meta:{ ret:'DataFrame', mut:false, time:'O(n)', space:'O(n)' },
        params:[
          { name:'**kwargs', type:'str → scalar | callable', req:true, desc:'Column name = value or lambda df: expression. Lambdas see columns assigned earlier in the same call.' },
          { name:'func', type:'Callable', req:true, desc:'Function that receives the DataFrame as first argument and returns a DataFrame.' }
        ],
        code:
`df = pd.DataFrame({
    'price':    [100, 200, 150],
    'quantity': [3,   1,   2],
    'discount': [0.1, 0.0, 0.2]
})

# assign — add/replace columns; lambdas see the in-progress df
result = (
    df
    .assign(revenue = lambda d: d['price'] * d['quantity'])
    .assign(net_rev = lambda d: d['revenue'] * (1 - d['discount']))
    .assign(margin  = lambda d: (d['net_rev'] / d['revenue']).round(2))
)

# pipe — apply an arbitrary function inside a chain
def add_totals(df):
    return df.assign(grand_total=df['revenue'].sum())

def top_n(df, n=2):
    return df.nlargest(n, 'net_rev').reset_index(drop=True)

result = (
    df
    .assign(revenue = lambda d: d['price'] * d['quantity'])
    .pipe(add_totals)
    .pipe(top_n, n=2)
)`,
        related:['df.apply()','df.transform()','df.eval()'],
        tags:['pandas','assign','pipe','method chaining','functional','pipeline'],
        interview:[
          'assign + pipe enables readable top-to-bottom pipelines — no temp variables, easy to reorder steps',
          'assign lambda receives the CURRENT df, including columns assigned earlier in the same call',
          'pipe(func) keeps the chain unbroken when a helper function needs the full DataFrame',
        ],
        mistakes:['assign() always returns a NEW DataFrame — it never modifies in place; always reassign: df = df.assign(...).'],
        notes:['df.eval("col = a + b") is another chainable option for simple arithmetic expressions as strings.']
      },
      ]
    },
    ]
  }
  ]
};
