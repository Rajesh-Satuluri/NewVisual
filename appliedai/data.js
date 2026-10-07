/* ============================================================
   Applied AI — Study Lab  ·  Content
   Module: Exploratory Data Analysis & Data Visualization
   Source: "Applied Machine Learning" course notebook — Module 2,
   Chapter 10 (10.1–10.15). Content transcribed & expanded from the
   course notes for study; visuals are original interactive builds.
   ============================================================ */

/* ---- real IRIS sample (subset, 25 pts / class) used by scatter & pairplot ----
   columns: sepalLen, sepalWid, petalLen, petalWid  (cm) */
const IRIS = {
  setosa:[[5.1,3.5,1.4,.2],[4.9,3.0,1.4,.2],[4.7,3.2,1.3,.2],[4.6,3.1,1.5,.2],[5.0,3.6,1.4,.2],
    [5.4,3.9,1.7,.4],[4.6,3.4,1.4,.3],[5.0,3.4,1.5,.2],[4.4,2.9,1.4,.2],[4.9,3.1,1.5,.1],
    [5.4,3.7,1.5,.2],[4.8,3.4,1.6,.2],[4.8,3.0,1.4,.1],[4.3,3.0,1.1,.1],[5.8,4.0,1.2,.2],
    [5.7,4.4,1.5,.4],[5.4,3.9,1.3,.4],[5.1,3.5,1.4,.3],[5.1,3.8,1.5,.3],[5.0,3.3,1.4,.2],
    [4.5,2.3,1.3,.3],[5.1,3.8,1.6,.2],[4.8,3.1,1.6,.2],[5.2,3.5,1.5,.2],[5.5,3.5,1.3,.2]],
  versicolor:[[7.0,3.2,4.7,1.4],[6.4,3.2,4.5,1.5],[6.9,3.1,4.9,1.5],[5.5,2.3,4.0,1.3],[6.5,2.8,4.6,1.5],
    [5.7,2.8,4.5,1.3],[6.3,3.3,4.7,1.6],[4.9,2.4,3.3,1.0],[6.6,2.9,4.6,1.3],[5.2,2.7,3.9,1.4],
    [5.9,3.0,4.2,1.5],[6.0,2.2,4.0,1.0],[6.1,2.9,4.7,1.4],[5.6,2.9,3.6,1.3],[6.7,3.1,4.4,1.4],
    [5.6,3.0,4.5,1.5],[5.8,2.7,4.1,1.0],[6.2,2.2,4.5,1.5],[5.6,2.5,3.9,1.1],[5.9,3.2,4.8,1.8],
    [6.1,2.8,4.0,1.3],[6.3,2.5,4.9,1.5],[6.1,2.8,4.7,1.2],[6.4,2.9,4.3,1.3],[6.6,3.0,4.4,1.4]],
  virginica:[[6.3,3.3,6.0,2.5],[5.8,2.7,5.1,1.9],[7.1,3.0,5.9,2.1],[6.3,2.9,5.6,1.8],[6.5,3.0,5.8,2.2],
    [7.6,3.0,6.6,2.1],[4.9,2.5,4.5,1.7],[7.3,2.9,6.3,1.8],[6.7,2.5,5.8,1.8],[7.2,3.6,6.1,2.5],
    [6.5,3.2,5.1,2.0],[6.4,2.7,5.3,1.9],[6.8,3.0,5.5,2.1],[5.7,2.5,5.0,2.0],[5.8,2.8,5.1,2.4],
    [6.4,3.2,5.3,2.3],[6.5,3.0,5.5,1.8],[7.7,3.8,6.7,2.2],[7.7,2.6,6.9,2.3],[6.0,2.2,5.0,1.5],
    [6.9,3.2,5.7,2.3],[5.6,2.8,4.9,2.0],[7.7,2.8,6.7,2.0],[6.3,2.7,4.9,1.8],[6.7,3.3,5.7,2.1]]
};
const FEATURES=["Sepal Length","Sepal Width","Petal Length","Petal Width"];

const MODULE = {
  id:"eda",
  code:"Module 02",
  title:"Exploratory Data Analysis",
  subtitle:"Understand your data before you model it — plots, distributions, central tendency & spread, using the IRIS dataset.",
  source:'Applied Machine Learning course notebook · Chapter 10 (10.1–10.15)',
  groups:[
    {name:"Getting Started",     lessons:["intro","scatter2d"]},
    {name:"Seeing More Dimensions",lessons:["scatter3d","pairplot"]},
    {name:"Distributions",       lessons:["histpdf","cdf"]},
    {name:"Central Tendency & Spread",lessons:["meanstd","median","percentile","iqrmad"]},
    {name:"Distribution Plots",  lessons:["boxplot","violin"]},
    {name:"Putting It Together", lessons:["dimtypes","contour"]}
  ],
  lessons:{

  /* ---------------------------------------------------------- */
  intro:{
    icon:"🌸", tag:"10.1 · Foundations",
    title:"What is EDA & the IRIS dataset",
    sub:"Exploratory Data Analysis is simple analysis to understand your data — long before any model is trained.",
    viz:"iris-table",
    vizCaption:"The IRIS dataset — the “Hello World” of data science. 150 flowers, 4 features, 3 species.",
    blocks:[
      {h2:"What is EDA?",p:[
        "<b class='hl'>Exploratory Data Analysis (EDA)</b> is simple analysis done to <b>understand the data</b>. The toolkit is <code>statistics</code>, <code>linear algebra</code> and <code>plotting</code>.",
        "The golden rule of the whole module: <b>analysis is more important than code.</b> The plots are just a means to form conclusions about the data."
      ]},
      {keys:[
        "<b>IRIS dataset</b> — the “Hello World” of Data Science, collected in <b>1936</b>. The task: classify a flower into one of <b>3 species</b>.",
        "<b>Features (columns):</b> Sepal Length, Sepal Width, Petal Length, Petal Width — chosen through <b>domain knowledge</b>.",
        "<b>Species</b> is the <b>Target / Label</b> — a 1-D vector (a scalar per row).",
        "<b>Rows</b> = data points / vectors (an n-dimensional numerical variable). <b>Columns</b> = variables / features."
      ]},
      {callout:"tip",ci:"🧭",html:"Before plotting, answer three questions with pandas: <code>df.shape</code> → how many points? &nbsp; <code>df.columns</code> → what are the features? &nbsp; <code>df['species'].value_counts()</code> → points per class (reveals <b>class balance</b>)."}
    ],
    qa:[
      {q:"What is EDA and why do it first?",a:"EDA is simple analysis — using statistics, linear algebra and plotting — to understand the structure, distribution and separability of the data before modelling. It reveals balance, outliers and which features separate classes, so model choices are informed rather than blind."},
      {q:"Why is IRIS called the ‘Hello World’ of data science?",a:"It is tiny (150 rows, 4 numeric features, 3 balanced classes), clean, and famously separable — perfect for demonstrating every EDA and classification technique without data-cleaning distractions. It was collected by Ronald Fisher in 1936."},
      {q:"What is the difference between a feature and a label here?",a:"Features are the 4 measured dimensions (sepal/petal length & width) used as input. The label (species) is the target we want to predict — a single categorical value per data point."}
    ]
  },

  /* ---------------------------------------------------------- */
  scatter2d:{
    icon:"📈", tag:"10.1 · Bivariate",
    title:"2-D Scatter Plot",
    sub:"Plot two features against each other and colour by class — the first look at separability.",
    viz:"scatter2d",
    vizCaption:"Pick any two features. Notice Setosa separates cleanly with a single straight line; Versicolor & Virginica overlap.",
    blocks:[
      {h2:"Reading a 2-D scatter",p:[
        "A 2-D scatter plot puts one feature on the x-axis and another on the y-axis: <code>iris.plot(kind='scatter', x='sepal_length', y='sepal_width')</code>.",
        "Plain pandas colours every point the same. Use <b class='hl'>Seaborn</b> with <code>hue='species'</code> to colour by class — now the structure jumps out."
      ]},
      {keys:[
        "With <b>petal length vs petal width</b>, <b>Setosa</b> can be separated from the rest by a <b>single straight line</b>.",
        "<b>Versicolor</b> and <b>Virginica</b> <b>overlap</b> — no single line cleanly splits them in 2-D.",
        "EDA hands us these ‘neat characteristics’ of the dataset for free, before any model."
      ]},
      {callout:"warn",ci:"⚠️",html:"A 2-D scatter uses only <b>2 of the 4</b> features at a time. You must look at several feature pairs to understand the full dataset — which motivates pair plots."}
    ],
    qa:[
      {q:"How do you colour classes in a scatter plot?",a:"Use Seaborn: sns.FacetGrid(iris, hue='species').map(plt.scatter, 'x', 'y') or sns.scatterplot(x=, y=, hue='species', data=iris). The hue argument maps each class to a distinct colour."},
      {q:"Which pair of features best separates the IRIS classes?",a:"Petal length vs petal width. Setosa forms a tight cluster separable by a single line; Versicolor and Virginica are mostly separable with some overlap."},
      {q:"What is the limitation of a 2-D scatter plot?",a:"It only shows 2 features at once. With 4 features you'd need to inspect many pairs, and it cannot capture interactions that only appear in higher dimensions."}
    ]
  },

  /* ---------------------------------------------------------- */
  scatter3d:{
    icon:"🧊", tag:"10.2 · Multivariate",
    title:"3-D Scatter Plots",
    sub:"Add a third axis to see more structure — but we hit a hard wall past 3 dimensions.",
    viz:"scatter3d",
    vizCaption:"Drag the slider to rotate. Three features at once reveal clusters a 2-D view hides — but 4-D+ needs math, not eyes.",
    blocks:[
      {h2:"Three dimensions, interactively",p:[
        "A 3-D scatter plots three features on three axes. Tools like <b class='hl'>Plotly</b> make it interactive — you can rotate and zoom to find the viewing angle where classes separate best.",
        "Rotation matters: a cluster that overlaps from one angle may be clearly separated from another."
      ]},
      {callout:"warn",ci:"🚧",html:"<b>The dimensionality wall:</b> we <b>cannot visualise 4-D, 5-D or n-D</b> directly. Beyond 3 features we need <b>mathematical tools</b> (PCA, t-SNE) to <b>reduce complexity</b> down to 2-D or 3-D."}
    ],
    qa:[
      {q:"Why use Plotly for 3-D scatter plots?",a:"Plotly renders interactive 3-D plots in the browser — you can rotate, zoom and hover. Static 3-D plots are hard to read because occlusion hides points; interactivity lets you find an informative viewing angle."},
      {q:"Can we visualise 4-D or higher data directly?",a:"No. Humans can only perceive up to 3 spatial dimensions. For 4+ features we must reduce dimensionality (e.g. PCA, t-SNE) or use techniques like pair plots that show projections."}
    ]
  },

  /* ---------------------------------------------------------- */
  pairplot:{
    icon:"🔲", tag:"10.3–10.4 · Multivariate",
    title:"Pair Plots",
    sub:"Every feature pair at once — a grid of 2-D scatters that scales to ~6 (sometimes 10) dimensions.",
    viz:"pairplot",
    vizCaption:"A 4×4 grid: each off-diagonal cell is a 2-D scatter of two features; the diagonal shows each feature's distribution.",
    blocks:[
      {h2:"All pairs in one grid",p:[
        "A pair plot draws a <b>2-D scatter for every pair of features</b> in a grid. <code>seaborn.pairplot(iris, hue='species')</code> colours by class. The diagonal shows each feature's own distribution (histogram / PDF).",
        "Scanning the grid, you can often <b>write straight-forward if-else rules</b> to separate at least one class — here, petal-based cells isolate Setosa."
      ]},
      {keys:[
        "Allows visual analysis up to <b>~6 dimensions</b>, sometimes up to <b>10</b>.",
        "Number of scatter cells grows as <b>nC2</b> — 4 features → 6 unique pairs (shown twice, mirrored)."
      ]},
      {callout:"warn",ci:"⚠️",html:"<b>Limitation (10.4):</b> pair plots are only useful when <b>dimensionality is small</b>. For a dataset with 100 features you'd get 4,950 cells — unreadable. Then you need dimensionality reduction."}
    ],
    qa:[
      {q:"What does a pair plot show on its diagonal?",a:"The diagonal cells show the univariate distribution of each feature on its own — typically a histogram or a KDE/PDF curve — since plotting a feature against itself is uninformative."},
      {q:"How many feature pairs does a pair plot produce for n features?",a:"nC2 = n(n-1)/2 unique pairs. For IRIS (n=4) that's 6 unique scatter plots, usually drawn as a full 4×4 grid (mirrored across the diagonal)."},
      {q:"When do pair plots stop being useful?",a:"When dimensionality is large. The grid grows quadratically, so with dozens or hundreds of features it becomes impossible to read — dimensionality reduction (PCA/t-SNE) is used instead."}
    ]
  },

  /* ---------------------------------------------------------- */
  histpdf:{
    icon:"📊", tag:"10.5–10.6 · Univariate",
    title:"Histogram & PDF",
    sub:"Univariate analysis: how the values of a single feature are distributed.",
    viz:"histpdf",
    vizCaption:"Bars = histogram (counts per bin). Smooth curve = PDF, a kernel-smoothed version of the histogram. Toggle the KDE.",
    blocks:[
      {h2:"One variable at a time",p:[
        "<b class='hl'>Univariate analysis</b> looks at a single feature. A <b>histogram</b> buckets the values into bins and shows how many points fall in each bin — the shape of the distribution.",
        "A <b class='hl'>PDF (Probability Density Function)</b> is a <b>smoothed histogram</b>, produced by <b>Kernel Density Estimation (KDE)</b>. It estimates the relative likelihood of each value."
      ]},
      {keys:[
        "Because IRIS has only <b>4 features</b>, we can plot a histogram/PDF for each one.",
        "<b>Petal length</b>'s PDF clearly shows Setosa sitting apart from the other two classes — a near-perfect 1-D separator.",
        "The area under a PDF integrates to <b>1</b>; height is density, not probability."
      ]},
      {callout:"tip",ci:"💡",html:"Where two classes' PDFs <b>overlap</b>, those points are hard to classify. Where a class's PDF sits <b>alone</b> on the axis, a simple threshold rule works."}
    ],
    qa:[
      {q:"What is the difference between a histogram and a PDF?",a:"A histogram is a discrete bar chart of counts per bin and depends on bin width. A PDF (via KDE) is a continuous smoothed curve estimating density; its total area equals 1 and it is less sensitive to binning."},
      {q:"What is KDE?",a:"Kernel Density Estimation places a smooth kernel (often Gaussian) on each data point and sums them to produce a continuous density estimate — effectively a smoothed histogram independent of bin edges."},
      {q:"How does a PDF help with classification?",a:"Overlapping class PDFs indicate regions where classes are confusable; a class whose PDF is well-separated on the axis can be split off with a simple threshold rule."}
    ]
  },

  /* ---------------------------------------------------------- */
  cdf:{
    icon:"📉", tag:"10.7 · Univariate",
    title:"CDF — Cumulative Distribution",
    sub:"What % of points fall below a value — and how it relates to the PDF.",
    viz:"cdf",
    vizCaption:"The orange CDF rises from 0 to 1. At any x, its height = fraction of points ≤ x. Its slope is the PDF.",
    blocks:[
      {h2:"Accumulating the distribution",p:[
        "The <b class='hl'>CDF (Cumulative Distribution Function)</b> at a value x = the <b>percentage of data points below x</b>.",
        "Contrast: the <b>PDF</b> gives the percentage of points that lie <b>between two x values</b>; the <b>CDF</b> gives the percentage <b>below</b> a single x value."
      ]},
      {callout:"formula",fx:"CDF = ∫ PDF dx &nbsp;&nbsp;⇄&nbsp;&nbsp; PDF = d(CDF)/dx",
        fex:"Integrate the PDF to get the CDF; differentiate the CDF to get the PDF. In code: bin the data to get the PDF, then np.cumsum() to get the CDF."},
      {keys:[
        "Read it as: “X% of flowers have petal length ≤ this value.”",
        "By drawing a horizontal line at a chosen level and reading where each class's CDF crosses it, you can count how many points of each class fall below a threshold."
      ]}
    ],
    qa:[
      {q:"Define the CDF.",a:"The CDF F(x) gives the probability (fraction of data) that a value is ≤ x. It is non-decreasing, starts near 0 and rises to 1."},
      {q:"How are the PDF and CDF related?",a:"The CDF is the integral of the PDF; equivalently the PDF is the derivative (slope) of the CDF. Numerically, cumsum of a binned PDF yields the CDF."},
      {q:"PDF vs CDF — one sentence each.",a:"PDF: the fraction of points lying between two x values (local density). CDF: the fraction of points lying below a single x value (accumulated)."}
    ]
  },

  /* ---------------------------------------------------------- */
  meanstd:{
    icon:"🎯", tag:"10.8 · Spread",
    title:"Mean, Variance & Std Dev",
    sub:"The centre of the data and how widely it spreads — and why outliers corrupt all three.",
    viz:"meanstd",
    vizCaption:"Drag the red outlier point. Watch the mean (and the ±σ band) lurch toward it — a single outlier corrupts all three stats.",
    blocks:[
      {h2:"Centre and spread",p:[
        "<b class='hl'>Mean</b> = sum of values ÷ count — the central value. <b class='hl'>Variance</b> measures spread; <b class='hl'>Standard deviation</b> = √variance is the width of the spread along an axis."
      ]},
      {callout:"formula",fx:"μ = (1/N) Σ xᵢ &nbsp;&nbsp; σ² = (1/N) Σ (xᵢ − μ)² &nbsp;&nbsp; σ = √σ²",
        fex:"Mean μ; Variance σ² is the average squared distance from the mean; Standard deviation σ is its square root (same units as the data)."},
      {callout:"warn",ci:"⚠️",html:"All three are <b>heavily corrupted by outliers</b> — a single extreme value drags the mean and inflates the variance. When outliers exist, prefer the <b>median</b> for central tendency."}
    ],
    qa:[
      {q:"Why is variance squared rather than absolute distance?",a:"Squaring penalises large deviations more, is differentiable (useful for optimisation), and gives variance nice algebraic properties. Its square root, the standard deviation, returns to the original units."},
      {q:"Why are mean and standard deviation sensitive to outliers?",a:"Both sum over every point, so one extreme value contributes a large (and, for variance, squared) term that shifts the mean and inflates the spread. Median and IQR are robust alternatives."}
    ]
  },

  /* ---------------------------------------------------------- */
  median:{
    icon:"⚖️", tag:"10.9 · Spread",
    title:"Median",
    sub:"A robust measure of central tendency that outliers can't corrupt.",
    viz:"median",
    vizCaption:"Add an extreme outlier: the mean jumps, the median barely moves. That robustness is the whole point.",
    blocks:[
      {h2:"The robust centre",p:[
        "The <b class='hl'>median</b> is the middle value when the data is sorted in increasing order. Unlike the mean, it <b>does not get corrupted by outliers</b> — making it a better statistic for central tendency on messy data."
      ]},
      {keys:[
        "<b>Odd count</b> → the single middle value. <b>Even count</b> → the average of the two middle values.",
        "Moving one point to infinity shifts the mean without bound but moves the median by at most one position."
      ]},
      {callout:"tip",ci:"💡",html:"Rule of thumb: report the <b>median</b> (and IQR) when data is skewed or has outliers; report the <b>mean</b> (and σ) when it's roughly symmetric and clean."}
    ],
    qa:[
      {q:"Why is the median robust to outliers but the mean is not?",a:"The median depends only on the rank/order of values, so an extreme value just sits at the end without changing the middle. The mean sums magnitudes, so one extreme value shifts it arbitrarily."},
      {q:"When should you prefer the median over the mean?",a:"When the data is skewed or contains outliers — e.g. incomes or house prices — the median better represents a 'typical' value."}
    ]
  },

  /* ---------------------------------------------------------- */
  percentile:{
    icon:"📏", tag:"10.10 · Spread",
    title:"Percentiles & Quantiles",
    sub:"Slice the sorted data by position — the 50th percentile is the median.",
    viz:"percentile",
    vizCaption:"Drag the handle to any percentile p: the fraction p of points lies to its left. Q1/Q2/Q3 are highlighted.",
    blocks:[
      {h2:"Position-based statistics",p:[
        "A <b class='hl'>percentile</b> is the value below which a given percentage of data falls. The <b>50th percentile</b> is the value where 50% of points are smaller — i.e. the <b>median</b>.",
        "<b class='hl'>Quantiles</b> are the common cut points: <b>25th (Q1)</b>, <b>50th (Q2)</b> and <b>75th (Q3)</b> percentiles."
      ]},
      {keys:[
        "“<b>pth percentile</b>” = the value at which p% of values are less than it.",
        "Quartiles split the data into four equal-sized groups.",
        "Percentiles are <b>robust</b> — like the median, they depend on order, not magnitude."
      ]}
    ],
    qa:[
      {q:"What is the 90th percentile?",a:"The value below which 90% of the data points fall (and above which the top 10% lie)."},
      {q:"Relate percentile, quartile and median.",a:"The median is the 50th percentile (Q2). Quartiles are the 25th (Q1), 50th (Q2) and 75th (Q3) percentiles, dividing sorted data into four equal parts."}
    ]
  },

  /* ---------------------------------------------------------- */
  iqrmad:{
    icon:"📐", tag:"10.11 · Spread",
    title:"IQR & MAD",
    sub:"Robust measures of spread built from percentiles and the median.",
    viz:"iqr",
    vizCaption:"The shaded band is the IQR = Q3 − Q1: the range of the middle 50% of the data. MAD is the median of |x − median|.",
    blocks:[
      {h2:"Robust spread",p:[
        "<b class='hl'>IQR (Inter-Quartile Range)</b> = <b>Q3 − Q1</b> = the 75th percentile minus the 25th. It is the range covering the <b>middle 50%</b> of the data and ignores the tails entirely.",
        "<b class='hl'>MAD (Median Absolute Deviation)</b> measures spread around the median rather than the mean."
      ]},
      {callout:"formula",fx:"IQR = Q3 − Q1 &nbsp;&nbsp;&nbsp; MAD = median( |xᵢ − median(x)| )",
        fex:"IQR = width of the middle 50%. MAD = the median of the absolute deviations from the median — robust where variance (which uses the mean) is not."},
      {callout:"tip",ci:"💡",html:"IQR drives the whiskers of a box plot and the standard outlier rule: points beyond <b>Q1 − 1.5·IQR</b> or <b>Q3 + 1.5·IQR</b> are flagged as outliers."}
    ],
    qa:[
      {q:"What is the IQR and why is it robust?",a:"IQR = Q3 − Q1, the spread of the central 50% of the data. Because it uses percentiles and discards the extreme tails, outliers don't affect it."},
      {q:"How does MAD differ from standard deviation?",a:"Standard deviation measures average (squared) deviation from the mean and is outlier-sensitive. MAD is the median of absolute deviations from the median — robust to outliers."},
      {q:"How is IQR used to detect outliers?",a:"The 1.5×IQR rule: any point below Q1 − 1.5·IQR or above Q3 + 1.5·IQR is treated as an outlier (the box-plot whiskers stop at this fence)."}
    ]
  },

  /* ---------------------------------------------------------- */
  boxplot:{
    icon:"📦", tag:"10.12 · Distribution plot",
    title:"Box Plot with Whiskers",
    sub:"The five-number summary in one compact picture.",
    viz:"boxplot",
    vizCaption:"Box = Q1→Q3 (IQR), line = median, whiskers reach min/max within the fence, dots beyond are outliers.",
    blocks:[
      {h2:"The five-number summary",p:[
        "A box-and-whisker plot is a standardised way of displaying a distribution based on a <b class='hl'>five-number summary</b>: <b>minimum, Q1, median, Q3, maximum</b>.",
        "The box spans Q1→Q3 (the IQR), the line inside is the median, and the whiskers extend to the furthest points within 1.5×IQR; anything beyond is drawn as an outlier dot."
      ]},
      {keys:[
        "Instantly compares spread and centre across classes side-by-side.",
        "A long box or long whisker on one side signals <b>skew</b>.",
        "Compact: condenses a whole distribution into five numbers."
      ]}
    ],
    qa:[
      {q:"What five numbers define a box plot?",a:"Minimum, first quartile (Q1), median (Q2), third quartile (Q3) and maximum — the five-number summary. The box spans Q1–Q3 and the median line sits inside."},
      {q:"What do the whiskers represent?",a:"They extend to the most extreme data points still within 1.5×IQR of the quartiles. Points beyond the whiskers are plotted individually as outliers."}
    ]
  },

  /* ---------------------------------------------------------- */
  violin:{
    icon:"🎻", tag:"10.13 · Distribution plot",
    title:"Violin Plots",
    sub:"A box plot plus the full probability density on each side.",
    viz:"violin",
    vizCaption:"A box plot with a mirrored KDE: the width at any height is the density of points at that value.",
    blocks:[
      {h2:"Box plot meets PDF",p:[
        "A <b class='hl'>violin plot</b> is similar to a box plot, with the addition of a <b>rotated kernel density plot on each side</b>. It shows the <b>probability density of the data at different values</b>, smoothed by a kernel density estimator.",
        "So where a box plot gives you five numbers, a violin plot also shows the <b>shape</b> — bulges reveal where data concentrates and whether a distribution is multi-modal."
      ]},
      {callout:"tip",ci:"🎻",html:"A fat bulge = many points at that value; a pinch = few. Two bulges = a <b>bimodal</b> distribution that a plain box plot would completely hide."}
    ],
    qa:[
      {q:"How is a violin plot different from a box plot?",a:"A violin plot adds a mirrored KDE (density curve) to the box-plot summary, so you see the full shape of the distribution — including multi-modality — not just five summary numbers."},
      {q:"What does the width of a violin at a given height mean?",a:"It is the estimated density of data points at that value — wider means more points occur near that value."}
    ]
  },

  /* ---------------------------------------------------------- */
  dimtypes:{
    icon:"🧮", tag:"10.14 · Summary",
    title:"Uni-, Bi- & Multivariate",
    sub:"A map of every EDA plot by the number of variables it analyses.",
    viz:"dimtypes",
    vizCaption:"Each EDA technique analyses a fixed number of variables at once. Hover a tier to see which plots belong to it.",
    blocks:[
      {h2:"Organising the toolkit",p:[
        "EDA plots are classified by <b>how many variables</b> they analyse at once. The discipline: <b class='hl'>write a conclusion at the end of each plot</b>, and keep the analysis <b>aligned with the project objective</b>."
      ]},
      {keys:[
        "<b>Univariate</b> — one variable: PDF, CDF, box plot, violin plot.",
        "<b>Bivariate</b> — two variables: 2-D scatter plots, pair-plot cells.",
        "<b>Multivariate</b> — more than two variables: 3-D plots, contour plots."
      ]},
      {callout:"tip",ci:"✍️",html:"Good EDA is a <b>narrative</b>: each plot should end in a written takeaway (“Setosa is linearly separable on petal length”), not just a picture."}
    ],
    qa:[
      {q:"Classify PDF, scatter plot and 3-D plot by variate type.",a:"PDF = univariate (one variable). 2-D scatter = bivariate (two variables). 3-D scatter/contour = multivariate (3+ variables)."},
      {q:"What makes EDA effective beyond just drawing plots?",a:"Writing a clear conclusion after each plot and keeping every analysis tied to the project objective — the insight, not the chart, is the deliverable."}
    ]
  },

  /* ---------------------------------------------------------- */
  contour:{
    icon:"🗺️", tag:"10.15 · Multivariate",
    title:"Multivariate PDF & Contour Plot",
    sub:"Combine two variables' densities into a 2-D 'hill' seen from above.",
    viz:"contour",
    vizCaption:"A contour plot of a 2-D density: darker/tighter rings = denser regions, like looking down on a hill from above.",
    blocks:[
      {h2:"Density in two dimensions",p:[
        "A <b class='hl'>multivariate probability density</b> combines the densities of two variables at once. A <b>contour plot</b> visualises it: <b>dense regions are darker</b>, as if a hill were coming out of the page and you were looking straight down at it.",
        "Each contour ring joins points of equal density — tightly-packed rings mean a steep, concentrated peak of data."
      ]},
      {callout:"tip",ci:"⛰️",html:"Think of it as a topographic map of your data: the ‘summit’ is where points cluster most densely; multiple summits reveal multiple sub-groups."}
    ],
    qa:[
      {q:"What does a contour plot show in EDA?",a:"The joint (2-D) probability density of two features. Contour lines connect equal-density points; darker, tighter rings mark where data concentrates — like a top-down view of a hill."},
      {q:"How do you read dense regions on a contour plot?",a:"Closely-spaced, darker contour lines indicate a steep rise in density — a concentration of data points, i.e. a mode of the joint distribution."}
    ]
  }

  }
};
