/*
 * data/sql/concepts_design.js — SQL "Learn" database-design & theory topics.
 * Registered into the multi-stack concept registry (window.LEARN) under the
 * "sql" stack, section "Design & Theory". Content is authored fresh for this
 * tool and grounded in standard SQL semantics (ANSI + PostgreSQL / MySQL /
 * SQL Server notes flagged inline); teaching structure mirrors the existing
 * concept exemplars (whatIsIt / showMe / whyMatters / recognize / traps /
 * complexity / engineNote / challenge).
 */
window.LEARN.register("sql", "Design & Theory", [

  /* =================================================================== */
  {
    id: "constraints-keys",
    title: "Constraints & Keys",
    difficulty: "Beginner",
    estMinutes: 11,
    relevance: 3,
    tagline: "The rules the database enforces for you — so bad data can never get in.",

    whatIsIt: [
      "A <b>constraint</b> is a rule attached to a table that the database checks on every insert and update. If a row would break the rule, the write fails. Constraints move data-integrity logic out of every application that touches the table and into one place the database guarantees.",
      "The core constraint types: <b>PRIMARY KEY</b> (a column or set of columns that uniquely identifies each row — implies both <code>UNIQUE</code> and <code>NOT NULL</code>); <b>FOREIGN KEY</b> (a column whose values must match an existing key in another table — this is referential integrity); <b>UNIQUE</b> (no two rows may share the value, but NULLs are usually allowed); <b>NOT NULL</b> (the column must always have a value); <b>CHECK</b> (an arbitrary boolean the row must satisfy, e.g. <code>price &gt; 0</code>); and <b>DEFAULT</b> (a value supplied when none is given).",
      "A <b>candidate key</b> is any minimal set of columns that uniquely identifies a row. One candidate key is chosen as the <b>primary key</b>; the rest are <b>alternate keys</b> (enforced with <code>UNIQUE</code>). A <b>composite key</b> is a key made of more than one column. A <b>surrogate key</b> is an artificial id (an auto-increment integer or UUID) with no business meaning; a <b>natural key</b> is made of real attributes (e.g. an email, an ISBN).",
      "A <b>foreign key</b> can specify what happens when the row it points to is deleted or updated: <code>ON DELETE CASCADE</code> (delete the children too), <code>SET NULL</code>, <code>RESTRICT</code>/<code>NO ACTION</code> (block the delete — the default), or <code>SET DEFAULT</code>."
    ],

    showMe: {
      code:
        "CREATE TABLE customer (\n" +
        "  id         BIGINT       PRIMARY KEY,              -- unique + not null\n" +
        "  email      VARCHAR(255) NOT NULL UNIQUE,          -- alternate key\n" +
        "  country    CHAR(2)      NOT NULL DEFAULT 'US',\n" +
        "  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP\n" +
        ");\n\n" +
        "CREATE TABLE orders (\n" +
        "  id          BIGINT  PRIMARY KEY,\n" +
        "  customer_id BIGINT  NOT NULL,\n" +
        "  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),\n" +
        "  CONSTRAINT fk_cust FOREIGN KEY (customer_id)\n" +
        "    REFERENCES customer(id) ON DELETE CASCADE\n" +
        ");",
      caption:
        "customer.email is an alternate key (UNIQUE + NOT NULL). orders.customer_id must point " +
        "to a real customer; deleting a customer deletes their orders (CASCADE). The CHECK makes " +
        "a negative amount impossible to store."
    },

    whyMatters:
      "<p>Constraints are the cheapest, most reliable data-quality tool you have. A <code>CHECK (amount &gt;= 0)</code> can never be forgotten the way an application validation can, and it protects the table from <i>every</i> writer — the web app, a batch job, a careless manual <code>UPDATE</code>. Interviewers probe this to see whether you push integrity down to the database or scatter it across code.</p>" +
      "<p>The primary-key choice is a design decision with real consequences. <b>Surrogate keys</b> (auto-increment / identity / UUID) are stable — they never change when business facts change — and keep foreign keys narrow. <b>Natural keys</b> remove a column but risk churn (people change email, a country renames). The common rule of thumb:</p>" +
      "<pre class=\"why-pre\">-- Surrogate primary key, natural alternate key:\nid    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\nemail VARCHAR(255) NOT NULL UNIQUE   -- still enforced, still queryable</pre>",

    recognize: [
      { q: "\"make sure no two rows have the same X\"", think: "UNIQUE constraint (or PRIMARY KEY if X also identifies the row)" },
      { q: "\"this column must always point to a real row in another table\"", think: "FOREIGN KEY — referential integrity" },
      { q: "\"delete the parent and all its children in one go\"", think: "FOREIGN KEY ... ON DELETE CASCADE" },
      { q: "\"this value can never be negative / must be one of a fixed set\"", think: "CHECK constraint (or a lookup table + FK for a fixed set)" },
      { q: "\"identify a row by a column that has no business meaning\"", think: "surrogate key — IDENTITY / AUTO_INCREMENT / UUID" }
    ],

    matchTags: ["primary key", "foreign key", "unique", "check constraint", "referential integrity", "surrogate key", "natural key", "cascade"],

    traps: [
      {
        bad: "-- Relying on the app to reject duplicate emails\nINSERT INTO customer(id, email) VALUES (2, 'a@x.com');\n-- (a@x.com already exists; app forgot to check)",
        good: "email VARCHAR(255) NOT NULL UNIQUE\n-- the second insert now fails at the database, always",
        why: "Application-only validation is bypassed by every other writer and by race conditions. A UNIQUE constraint is enforced atomically for all writers, including concurrent inserts."
      },
      {
        bad: "WHERE status NOT IN (SELECT status FROM valid_status)\n-- plus a composite UNIQUE(col_a, col_b) assuming NULLs collide",
        good: "-- Know your engine: in most SQL engines, (1, NULL) and (1, NULL)\n-- are BOTH allowed under UNIQUE(col_a, col_b), because NULL != NULL.",
        why: "A UNIQUE constraint treats NULLs as distinct in standard SQL and most engines, so NULLs do not prevent 'duplicate' rows. Use NOT NULL on the columns, or an engine feature (e.g. NULLS NOT DISTINCT), if you need NULLs to collide."
      },
      {
        bad: "DELETE FROM customer WHERE id = 5;\n-- blocked: orders still reference it (default RESTRICT)",
        good: "-- Decide the policy on purpose:\nFOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE\n-- or delete children first, or soft-delete with a flag",
        why: "A foreign key with the default RESTRICT blocks deletes of referenced rows — that is the FK doing its job. Choose CASCADE, SET NULL, or an explicit delete order deliberately; do not drop the FK to 'fix' the error."
      }
    ],

    complexity: [
      { op: "PRIMARY KEY / UNIQUE enforcement", big_o: "O(log n)", note: "Enforced by a backing unique index; each insert does an index probe + insert, logarithmic in table size." },
      { op: "FOREIGN KEY check on insert", big_o: "O(log m)", note: "Each child insert probes the parent's key index (m = parent rows) to confirm the referenced row exists." },
      { op: "ON DELETE CASCADE", big_o: "O(k log n)", note: "Deleting a parent with k children deletes each child (and fires its own cascades); index lookups make each child delete logarithmic." },
      { op: "CHECK constraint", big_o: "O(1)", note: "A per-row boolean evaluated on write; constant cost unless the predicate itself runs a subquery (most engines forbid that)." },
      { op: "NOT NULL", big_o: "O(1)", note: "A single per-value test on write — effectively free." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The constraint types are ANSI-standard and portable, but auto-generated keys and a few behaviors differ:</p>" +
      "<ul>" +
      "<li><b>Auto keys:</b> PostgreSQL uses <code>GENERATED ALWAYS AS IDENTITY</code> (or legacy <code>serial</code>); MySQL uses <code>AUTO_INCREMENT</code>; SQL Server uses <code>IDENTITY(1,1)</code>; SQLite uses <code>INTEGER PRIMARY KEY</code> (rowid).</li>" +
      "<li><b>FK enforcement:</b> PostgreSQL / SQL Server / MySQL (InnoDB) enforce foreign keys by default. <b>SQLite</b> requires <code>PRAGMA foreign_keys = ON;</code> per connection, and MySQL's MyISAM engine ignores FKs entirely.</li>" +
      "<li><b>CHECK:</b> enforced everywhere modern, but MySQL only began enforcing (not just parsing) CHECK constraints in 8.0.16.</li>" +
      "<li><b>UNIQUE + NULL:</b> standard SQL allows multiple NULLs; PostgreSQL 15+ offers <code>UNIQUE NULLS NOT DISTINCT</code>, and SQL Server allows only one NULL in a plain unique index.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You are designing a book-reviews schema. Each review belongs to exactly one book and one user; a user may review a given book at most once; a rating must be 1–5. Write the review table's constraints. Why is (user_id, book_id) a better uniqueness rule here than a UNIQUE on a surrogate review id?",
      starter:
        "CREATE TABLE review (\n" +
        "  id       BIGINT /* surrogate PK */,\n" +
        "  user_id  BIGINT /* FK -> app_user */,\n" +
        "  book_id  BIGINT /* FK -> book */,\n" +
        "  rating   INT    /* 1..5 */,\n" +
        "  /* one review per user per book */\n" +
        ");",
      solution:
        "CREATE TABLE review (\n" +
        "  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n" +
        "  user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,\n" +
        "  book_id BIGINT NOT NULL REFERENCES book(id)     ON DELETE CASCADE,\n" +
        "  rating  INT    NOT NULL CHECK (rating BETWEEN 1 AND 5),\n" +
        "  CONSTRAINT uq_user_book UNIQUE (user_id, book_id)\n" +
        ");\n" +
        "-- The surrogate id gives every review a stable, narrow key for other tables\n" +
        "-- to reference. But UNIQUE(id) says nothing about business rules -- it would\n" +
        "-- happily allow the same user to review the same book twice under two ids.\n" +
        "-- The composite UNIQUE(user_id, book_id) is what actually enforces\n" +
        "-- 'one review per user per book'; the CHECK guarantees a valid rating."
    }
  },

  /* =================================================================== */
  {
    id: "index-types",
    title: "Index Types",
    difficulty: "Core",
    estMinutes: 13,
    relevance: 3,
    tagline: "The data structures that turn a full-table scan into a pinpoint lookup — and what each one costs.",

    whatIsIt: [
      "An <b>index</b> is a secondary data structure that lets the engine find rows without scanning the whole table. It stores the indexed column values in a searchable order plus a pointer back to the row. Like a book's index, it trades extra storage and slower writes for much faster reads on the indexed columns.",
      "The default and most important type is the <b>B-tree index</b> (really a B+tree): a balanced, sorted tree giving <code>O(log n)</code> lookups. It accelerates equality (<code>=</code>), range (<code>&lt; &gt; BETWEEN</code>), prefix <code>LIKE 'abc%'</code>, <code>ORDER BY</code>, and <code>MIN/MAX</code> — anything that benefits from sorted order.",
      "A <b>composite (multi-column) index</b> on <code>(a, b, c)</code> is sorted by a, then b, then c. It serves queries that filter on a <b>left-to-right prefix</b> of the columns (a; a,b; a,b,c) — this is the <b>leftmost-prefix rule</b>. A <b>covering index</b> includes every column a query needs, so the engine answers from the index alone and never touches the table (an <i>index-only scan</i>).",
      "Specialized types exist for cases a B-tree handles poorly: <b>hash</b> indexes (equality only, no ranges); <b>bitmap</b> indexes (low-cardinality columns in analytics warehouses); <b>GIN / inverted</b> indexes (full-text, arrays, JSONB containment); <b>GiST / R-tree / spatial</b> indexes (geometry, ranges); and <b>partial / filtered</b> indexes (index only the rows matching a predicate, e.g. <code>WHERE active</code>). <b>Clustered</b> vs <b>non-clustered</b> describes physical storage: a clustered index stores the table rows themselves in key order (one per table); non-clustered indexes are separate structures pointing back to the rows."
    ],

    showMe: {
      code:
        "-- Composite index: serves filters on a left-to-right prefix.\n" +
        "CREATE INDEX ix_orders_cust_date\n" +
        "  ON orders (customer_id, order_date);\n\n" +
        "-- Uses the index (prefix = customer_id, then range on order_date):\n" +
        "SELECT * FROM orders\n" +
        "WHERE customer_id = 42 AND order_date >= '2024-01-01';\n\n" +
        "-- CANNOT use it efficiently (skips the leading column):\n" +
        "SELECT * FROM orders WHERE order_date >= '2024-01-01';\n\n" +
        "-- Partial index: smaller, only indexes the rows you actually query.\n" +
        "CREATE INDEX ix_orders_open ON orders (customer_id)\n" +
        "  WHERE status = 'open';",
      caption:
        "The composite index is sorted by customer_id first, so a query that filters customer_id " +
        "(optionally plus an order_date range) uses it; a query on order_date alone can't, because " +
        "order_date is only sorted WITHIN each customer_id. The partial index indexes a fraction of rows."
    },

    whyMatters:
      "<p>Indexing is the single highest-leverage performance lever in SQL, and the most common interview deep-dive. The goal is always to let the engine do an <b>index seek</b> (jump straight to the rows) instead of a <b>table scan</b> (read everything). Reading the query plan — <code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code> — to confirm an index is used is a core skill.</p>" +
      "<p>But indexes are not free: every index must be updated on every <code>INSERT</code>/<code>UPDATE</code>/<code>DELETE</code> of its columns, and it consumes storage. The art is indexing the columns in your <code>WHERE</code>, <code>JOIN</code>, and <code>ORDER BY</code> clauses — and <i>not</i> over-indexing a write-heavy table:</p>" +
      "<pre class=\"why-pre\">-- A covering index answers this query without touching the table:\nCREATE INDEX ix_cover ON orders (customer_id) INCLUDE (amount, status);\nSELECT amount, status FROM orders WHERE customer_id = 42;  -- index-only scan</pre>",

    recognize: [
      { q: "\"this query is slow and does a full table scan on a big table\"", think: "add a B-tree index on the WHERE / JOIN column(s); confirm with EXPLAIN" },
      { q: "\"filters on A and B together, always\"", think: "composite index on (A, B); order the more selective / equality column first" },
      { q: "\"only a small, fixed subset of rows is ever queried (e.g. active = true)\"", think: "partial / filtered index on that predicate — smaller and cheaper" },
      { q: "\"select only a couple of columns, want to avoid touching the table\"", think: "covering index (INCLUDE the selected columns) for an index-only scan" },
      { q: "\"search inside text / JSON / arrays / geometry\"", think: "specialized index — GIN (full-text, JSONB, arrays) or GiST / spatial" }
    ],

    matchTags: ["index", "b-tree", "composite index", "covering index", "partial index", "clustered index", "leftmost prefix", "index seek", "explain"],

    traps: [
      {
        bad: "CREATE INDEX ix ON orders(order_date);\nSELECT * FROM orders WHERE YEAR(order_date) = 2024;",
        good: "SELECT * FROM orders\nWHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';",
        why: "Wrapping an indexed column in a function (YEAR(col), UPPER(col), col + 0) makes the predicate non-sargable: the engine must compute the function per row and cannot use the index. Rewrite as a range on the raw column, or build an expression/functional index."
      },
      {
        bad: "CREATE INDEX a ON t(a);\nCREATE INDEX b ON t(b);\nCREATE INDEX c ON t(c);  -- hoping to cover (a AND b AND c)",
        good: "CREATE INDEX ix_abc ON t(a, b, c);  -- one composite index",
        why: "Three single-column indexes rarely combine as well as one composite index for a query filtering all three. Engines can do a 'bitmap index AND', but a well-ordered composite index is usually faster and avoids the combine step. (Separate indexes are right when the columns are queried independently.)"
      },
      {
        bad: "-- Adding an index to every column of a write-heavy table 'to be safe'",
        good: "-- Index the columns in your actual WHERE/JOIN/ORDER BY; measure writes.",
        why: "Every index slows down inserts, updates, and deletes (each must maintain every affected index) and uses storage. Over-indexing is a real cost on OLTP write paths. Index to serve real query patterns, then verify with the plan."
      }
    ],

    complexity: [
      { op: "B-tree point lookup (=)", big_o: "O(log n)", note: "Descend the balanced tree to the leaf; height grows logarithmically with row count, so even billions of rows are a handful of hops." },
      { op: "B-tree range scan", big_o: "O(log n + k)", note: "One log-n seek to the range start, then a sequential walk of the k matching leaf entries in sorted order." },
      { op: "Hash index point lookup (=)", big_o: "O(1) avg", note: "Direct bucket lookup — equality only; it cannot answer range, prefix, or ORDER BY queries." },
      { op: "Index maintenance per write", big_o: "O(log n)", note: "Each insert/update/delete must locate and modify the entry in every affected index — the write-side cost of indexing." },
      { op: "Covering / index-only scan", big_o: "O(log n + k)", note: "Same as a range scan but skips the per-row table fetch, because all needed columns live in the index." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> B-tree is the default index type everywhere. The specialized machinery differs:</p>" +
      "<ul>" +
      "<li><b>Clustered index:</b> In <b>SQL Server</b> and <b>MySQL/InnoDB</b>, the primary key is a clustered index — the rows live in PK order, and secondary indexes store the PK as the row pointer. <b>PostgreSQL</b> has no permanent clustered index (heap storage); <code>CLUSTER</code> is a one-time reorder.</li>" +
      "<li><b>Covering:</b> SQL Server and PostgreSQL support <code>INCLUDE</code> (non-key payload) columns; MySQL covers via the composite key columns themselves.</li>" +
      "<li><b>Partial / filtered:</b> PostgreSQL calls it a partial index, SQL Server a filtered index; MySQL has no direct equivalent.</li>" +
      "<li><b>Specialized:</b> PostgreSQL offers GIN, GiST, BRIN, and hash; MySQL offers full-text and spatial (R-tree); columnstore / bitmap indexes are the norm in analytic engines (SQL Server columnstore, warehouse MPP systems).</li>" +
      "</ul>",

    challenge: {
      prompt:
        "A login table login(user_id, login_at, ip, success) has 500M rows. The hot query is: 'the 10 most recent SUCCESSFUL logins for a given user_id'. Design the best single index and explain why your column order and any extras matter.",
      starter:
        "-- Query:\n" +
        "SELECT login_at, ip FROM login\n" +
        "WHERE user_id = ? AND success = true\n" +
        "ORDER BY login_at DESC\n" +
        "LIMIT 10;\n" +
        "-- CREATE INDEX ... ?",
      solution:
        "-- Partial + composite + covering, all at once:\n" +
        "CREATE INDEX ix_login_recent\n" +
        "  ON login (user_id, login_at DESC)\n" +
        "  INCLUDE (ip)            -- (PG/SQL Server; in MySQL add ip to the key)\n" +
        "  WHERE success = true;   -- partial: only the rows the query wants\n\n" +
        "-- Why this order:\n" +
        "--  * user_id first  -> equality predicate, the leftmost prefix, narrows to one user.\n" +
        "--  * login_at DESC  -> the index is already in the ORDER BY order, so the top 10\n" +
        "--                      is just the first 10 leaf entries -- no sort, no scan.\n" +
        "--  * WHERE success  -> a partial index skips failed logins entirely, shrinking it.\n" +
        "--  * INCLUDE (ip)   -> ip is in the index, so it is an index-only scan: the table's\n" +
        "--                      500M-row heap is never touched for this query.\n" +
        "-- Result: O(log n) seek to the user, then read 10 sequential entries. Done."
    }
  },

  /* =================================================================== */
  {
    id: "normalization",
    title: "Normalization",
    difficulty: "Core",
    estMinutes: 13,
    relevance: 3,
    tagline: "Organize columns so every fact lives in exactly one place — then know when to break the rules.",

    whatIsIt: [
      "<b>Normalization</b> is the process of structuring tables to eliminate redundancy and the update problems it causes. The guiding idea: <i>every non-key fact should depend on the key, the whole key, and nothing but the key.</i> You split wide, repetitive tables into focused ones linked by keys.",
      "<b>First Normal Form (1NF):</b> each column holds a single, atomic value — no comma-separated lists, no repeating groups like <code>phone1, phone2, phone3</code>. Each row is unique. <b>Second Normal Form (2NF):</b> 1NF, and every non-key column depends on the <i>whole</i> primary key — no column depends on only part of a composite key (removes <i>partial</i> dependencies). <b>Third Normal Form (3NF):</b> 2NF, and no non-key column depends on another non-key column (removes <i>transitive</i> dependencies, e.g. <code>zip &rarr; city</code> stored in an orders table).",
      "<b>BCNF (Boyce–Codd):</b> a stricter 3NF — every determinant (anything that functionally determines another column) must be a candidate key. In practice, reaching 3NF/BCNF means: pull repeating or derivable attributes into their own tables and reference them by foreign key.",
      "The redundancy normalization removes causes three <b>anomalies</b>: an <b>update anomaly</b> (a fact stored in many rows must be changed in all of them, or they disagree), an <b>insertion anomaly</b> (you can't record a fact because unrelated required data is missing), and a <b>deletion anomaly</b> (deleting one row accidentally destroys an unrelated fact). <b>Denormalization</b> is the deliberate reverse — reintroducing redundancy for read performance, accepting the write cost."
    ],

    showMe: {
      code:
        "-- UNNORMALIZED: redundancy -> anomalies\n" +
        "-- orders(order_id, customer_name, customer_email, product, price)\n" +
        "--   customer_email repeats on every order; change it once -> rows disagree.\n\n" +
        "-- NORMALIZED (3NF): each fact in one place\n" +
        "CREATE TABLE customer (\n" +
        "  id    BIGINT PRIMARY KEY,\n" +
        "  name  VARCHAR(100) NOT NULL,\n" +
        "  email VARCHAR(255) NOT NULL UNIQUE\n" +
        ");\n" +
        "CREATE TABLE orders (\n" +
        "  id          BIGINT PRIMARY KEY,\n" +
        "  customer_id BIGINT NOT NULL REFERENCES customer(id),\n" +
        "  product_id  BIGINT NOT NULL REFERENCES product(id)\n" +
        ");  -- price lives on product, not copied per order",
      caption:
        "The customer's email now exists in exactly one row. Changing it is a single UPDATE, and no " +
        "two orders can ever disagree about it. Orders reference customer and product by key instead " +
        "of copying their attributes."
    },

    whyMatters:
      "<p>Normalization is the default for transactional (OLTP) systems because it makes <b>writes correct and cheap</b>: a fact changes in one row, and integrity is guaranteed by foreign keys. It is a staple interview topic because 'identify the normal-form violation and fix it' tests whether you can reason about functional dependencies.</p>" +
      "<p>The counterweight is that heavily normalized schemas require many joins to reassemble a full picture, which can be slow for read-heavy analytics. That is why <b>denormalization</b> and star schemas exist — and why the real skill is knowing <i>which</i> side to be on:</p>" +
      "<pre class=\"why-pre\">OLTP (orders, payments)    -> normalize: correct, cheap writes, FK integrity\nOLAP / reporting (dashboards) -> denormalize / star schema: fewer joins, fast reads\nMaterialized view / cache  -> controlled, refreshable denormalization</pre>",

    recognize: [
      { q: "\"a column holds a comma-separated list / repeating columns like tag1,tag2,tag3\"", think: "1NF violation — split into rows in a child table" },
      { q: "\"the same descriptive fact is copied across many rows and can get out of sync\"", think: "update anomaly — pull the fact into its own table, reference by FK (3NF)" },
      { q: "\"part of a composite key determines a column on its own\"", think: "2NF violation — partial dependency; split the table" },
      { q: "\"a non-key column is derivable from another non-key column (zip -> city)\"", think: "3NF violation — transitive dependency; move it to a lookup table" },
      { q: "\"reports do 8 joins and are too slow\"", think: "consider deliberate denormalization / star schema / materialized view for the read path" }
    ],

    matchTags: ["normalization", "1nf", "2nf", "3nf", "bcnf", "functional dependency", "update anomaly", "denormalization", "star schema"],

    traps: [
      {
        bad: "-- customer table\n...  tags VARCHAR(500)  -- 'vip,wholesale,emailopt'",
        good: "CREATE TABLE customer_tag (\n  customer_id BIGINT REFERENCES customer(id),\n  tag         VARCHAR(50),\n  PRIMARY KEY (customer_id, tag)\n);",
        why: "A delimited list in one column breaks 1NF: you cannot index it, join on it, or enforce valid tags, and queries degrade to LIKE '%vip%' scans. A child table makes each tag a first-class, indexable, constrainable row."
      },
      {
        bad: "-- Normalizing a reporting warehouse to 3NF and then\n-- joining 10 dimension tables on every dashboard query",
        good: "-- Star schema: one fact table + wide denormalized dimensions,\n-- refreshed by the ETL pipeline, not kept in sync by hand.",
        why: "Normalization optimizes writes; analytics optimizes reads. Forcing full 3NF on an OLAP workload buys integrity you don't need (the warehouse is load-once) at the cost of join-heavy slow reads. Match the normal form to the workload."
      },
      {
        bad: "-- Denormalizing OLTP 'for speed' by copying customer_email\n-- into orders, updated by application code",
        good: "-- Keep OLTP normalized; if a read is hot, use a materialized view\n-- or cache that the database refreshes, not hand-maintained copies.",
        why: "Hand-maintained denormalized copies in a write-heavy system recreate exactly the update anomalies normalization prevents. If you must denormalize for reads, make the redundancy derived and refreshable, not manually duplicated."
      }
    ],

    complexity: [
      { op: "Update a fact (normalized)", big_o: "O(1 row)", note: "The fact lives in exactly one row, so a change is a single-row UPDATE — the core win of normalization." },
      { op: "Update a fact (denormalized)", big_o: "O(k rows)", note: "The fact is copied into k rows; all must change together or they disagree — the update anomaly." },
      { op: "Reassemble a full record (normalized)", big_o: "O(joins)", note: "Reading the whole picture requires joining the split tables; cost grows with join count/size — the read-side price." },
      { op: "Read a full record (denormalized)", big_o: "O(1 scan)", note: "Everything is pre-joined into one wide row, so a read is a single lookup — why analytics denormalizes." },
      { op: "Storage", big_o: "normalized < denormalized", note: "Normalization removes duplicated values, so it generally stores less; denormalization trades space (and write cost) for read speed." }
    ],

    engineNote:
      "<p><b>Engine-agnostic, but the tooling differs.</b> Normal forms are relational theory, identical across PostgreSQL, MySQL, SQL Server, and Oracle. What varies is how you implement the controlled-denormalization escape hatch:</p>" +
      "<ul>" +
      "<li><b>Materialized views</b> (refreshable pre-joined/pre-aggregated results): native in PostgreSQL (<code>REFRESH MATERIALIZED VIEW</code>), Oracle, and SQL Server (indexed views); MySQL has no native materialized view — emulate with a summary table + triggers/jobs.</li>" +
      "<li><b>Generated / computed columns</b> let you store a derived value the engine maintains (PostgreSQL <code>GENERATED ... STORED</code>, SQL Server computed columns, MySQL generated columns) — safe, engine-managed denormalization within a row.</li>" +
      "<li><b>Star / snowflake schemas</b> are the standard denormalized model for warehouses (Redshift, BigQuery, Snowflake, Spark SQL), where load-once-read-many flips the trade-off.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "This table violates 3NF: enrollment(student_id, course_id, course_title, instructor, instructor_email). Identify the dependency problems and redesign into 3NF tables. Which anomaly does storing instructor_email here cause?",
      starter:
        "-- Current (one row per enrollment):\n" +
        "-- enrollment(student_id, course_id, course_title, instructor, instructor_email)\n" +
        "-- Redesign into normalized tables:",
      solution:
        "-- Problems (transitive dependencies on course_id, not on the enrollment key):\n" +
        "--   course_id -> course_title, instructor; instructor -> instructor_email.\n" +
        "--   These facts are copied on EVERY enrollment of the course.\n\n" +
        "CREATE TABLE instructor (\n" +
        "  id    BIGINT PRIMARY KEY,\n" +
        "  name  VARCHAR(100) NOT NULL,\n" +
        "  email VARCHAR(255) NOT NULL UNIQUE\n" +
        ");\n" +
        "CREATE TABLE course (\n" +
        "  id            BIGINT PRIMARY KEY,\n" +
        "  title         VARCHAR(200) NOT NULL,\n" +
        "  instructor_id BIGINT NOT NULL REFERENCES instructor(id)\n" +
        ");\n" +
        "CREATE TABLE enrollment (\n" +
        "  student_id BIGINT NOT NULL REFERENCES student(id),\n" +
        "  course_id  BIGINT NOT NULL REFERENCES course(id),\n" +
        "  PRIMARY KEY (student_id, course_id)\n" +
        ");\n" +
        "-- Anomaly fixed: instructor_email lived in every enrollment row (update anomaly --\n" +
        "-- changing the email meant rewriting many rows, risking disagreement). Now it is\n" +
        "-- one row in instructor; a change is a single UPDATE, and it is impossible for two\n" +
        "-- enrollments to disagree about the instructor's email."
    }
  },

  /* =================================================================== */
  {
    id: "transactions-acid",
    title: "Transactions & ACID",
    difficulty: "Core",
    estMinutes: 14,
    relevance: 3,
    tagline: "Group statements so they all happen or none do — and control what concurrent users can see.",

    whatIsIt: [
      "A <b>transaction</b> is a group of statements treated as one indivisible unit of work. You open it (<code>BEGIN</code>), do work, and either <code>COMMIT</code> (make every change permanent, together) or <code>ROLLBACK</code> (undo every change, as if none happened). The classic example is a bank transfer: debit one account and credit another must both succeed or both fail — never one without the other.",
      "<b>ACID</b> names the four guarantees. <b>Atomicity:</b> all-or-nothing — a partial transaction is never left behind. <b>Consistency:</b> a transaction moves the database from one valid state to another, respecting all constraints. <b>Isolation:</b> concurrent transactions don't corrupt each other; each runs as if it had the database to itself (to a degree set by the isolation level). <b>Durability:</b> once committed, changes survive a crash or power loss (written to durable storage / the write-ahead log).",
      "Concurrency creates <b>read phenomena</b> that isolation levels control: a <b>dirty read</b> (seeing another transaction's uncommitted change), a <b>non-repeatable read</b> (re-reading a row and getting a different value because another transaction committed in between), and a <b>phantom read</b> (re-running a range query and getting new rows). The four standard <b>isolation levels</b> — <code>READ UNCOMMITTED</code>, <code>READ COMMITTED</code>, <code>REPEATABLE READ</code>, <code>SERIALIZABLE</code> — allow progressively fewer of these, trading concurrency for correctness.",
      "<b>Locking</b> and <b>MVCC</b> (multi-version concurrency control) are how engines implement isolation. Locks block conflicting access; MVCC gives each transaction a consistent snapshot so readers don't block writers. A <b>deadlock</b> happens when two transactions each hold a lock the other needs; the engine detects it and aborts one. <code>SELECT ... FOR UPDATE</code> takes an explicit row lock to serialize a read-modify-write."
    ],

    showMe: {
      code:
        "BEGIN;                                    -- start the transaction\n" +
        "\n" +
        "UPDATE account SET balance = balance - 100\n" +
        "  WHERE id = 1;\n" +
        "UPDATE account SET balance = balance + 100\n" +
        "  WHERE id = 2;\n" +
        "\n" +
        "-- If either row is missing or a CHECK (balance >= 0) fails,\n" +
        "-- nothing above is kept:\n" +
        "--   ROLLBACK;\n" +
        "\n" +
        "COMMIT;                                   -- both updates become permanent together",
      caption:
        "Atomicity in action: the debit and credit are one unit. A crash, error, or constraint " +
        "violation between them leaves the accounts exactly as they were before BEGIN — money is " +
        "never created or destroyed."
    },

    whyMatters:
      "<p>Transactions are what make a database <i>trustworthy</i> for money, inventory, and bookings. Any multi-statement change that must not be seen half-done belongs in a transaction. Interviewers use ACID and isolation levels to test whether you understand what happens when <b>many users hit the same rows at once</b> — the difference between a correct system and a subtly corrupt one.</p>" +
      "<p>The practical decisions are: (1) wrap related writes in a transaction; (2) pick an isolation level matching your correctness needs; (3) handle the read-modify-write race. The classic unsafe pattern and its fixes:</p>" +
      "<pre class=\"why-pre\">-- RACE: two sessions both read 5, both write 4 -> one decrement lost.\nSELECT stock FROM item WHERE id = 1;    -- app subtracts 1\nUPDATE item SET stock = 4 WHERE id = 1;\n\n-- FIX A (atomic): let the database compute it.\nUPDATE item SET stock = stock - 1 WHERE id = 1 AND stock > 0;\n-- FIX B (lock): serialize the read-modify-write.\nSELECT stock FROM item WHERE id = 1 FOR UPDATE;  -- inside a transaction</pre>",

    recognize: [
      { q: "\"these two/three writes must all succeed or all fail\"", think: "wrap in BEGIN ... COMMIT; ROLLBACK on error — atomicity" },
      { q: "\"read a value, compute, write it back — under concurrency\"", think: "race condition; use an atomic UPDATE (col = col - 1) or SELECT ... FOR UPDATE" },
      { q: "\"a report must see a consistent snapshot across many queries\"", think: "REPEATABLE READ or SERIALIZABLE isolation, or a single snapshot transaction" },
      { q: "\"two jobs keep aborting with 'deadlock detected'\"", think: "deadlock — acquire locks in a consistent order; keep transactions short" },
      { q: "\"committed data must survive a crash\"", think: "durability — guaranteed by COMMIT (write-ahead log / fsync), not by the app" }
    ],

    matchTags: ["transaction", "acid", "atomicity", "isolation level", "rollback", "deadlock", "mvcc", "for update", "dirty read", "phantom read"],

    traps: [
      {
        bad: "UPDATE account SET balance = balance - 100 WHERE id = 1;\n-- (app crashes here)\nUPDATE account SET balance = balance + 100 WHERE id = 2;",
        good: "BEGIN;\n  UPDATE account SET balance = balance - 100 WHERE id = 1;\n  UPDATE account SET balance = balance + 100 WHERE id = 2;\nCOMMIT;",
        why: "Without a transaction, each statement auto-commits on its own. A crash between them debits one account without crediting the other — money vanishes. The transaction makes the pair atomic."
      },
      {
        bad: "SELECT stock FROM item WHERE id = 1;   -- reads 5\n-- app: new = 5 - 1\nUPDATE item SET stock = 4 WHERE id = 1; -- blind overwrite",
        good: "UPDATE item SET stock = stock - 1\nWHERE id = 1 AND stock > 0;             -- atomic, no lost update",
        why: "The read-then-write pattern loses updates under concurrency: two sessions both read 5 and both write 4, so one decrement disappears. Computing the new value inside the UPDATE (or locking the row with FOR UPDATE) closes the race."
      },
      {
        bad: "-- Long transaction: BEGIN; ... fetch an API; wait on user input; ... COMMIT;",
        good: "-- Keep transactions short: do only the DB work between BEGIN and COMMIT.",
        why: "A transaction holds locks and (under MVCC) pins old row versions until it ends. Doing slow I/O or waiting for a human inside one blocks other transactions, bloats version storage, and invites deadlocks. Gather data first, then transact quickly."
      }
    ],

    complexity: [
      { op: "COMMIT (durability)", big_o: "O(1) + fsync", note: "The expensive part is flushing the write-ahead log to durable storage; batching/group-commit amortizes the fsync across transactions." },
      { op: "ROLLBACK", big_o: "O(changes)", note: "Undo cost scales with how much the transaction changed; a huge aborted transaction is expensive to unwind." },
      { op: "Higher isolation level", big_o: "less concurrency", note: "SERIALIZABLE admits the fewest anomalies but holds more locks / aborts more on conflict, reducing throughput vs READ COMMITTED." },
      { op: "SELECT ... FOR UPDATE", big_o: "O(rows) + wait", note: "Locks the matched rows; other writers to those rows block until commit, serializing the read-modify-write." },
      { op: "Deadlock detection", big_o: "periodic", note: "The engine builds a wait-for graph; on a cycle it aborts a victim. Keeping transactions short and ordering lock acquisition avoids cycles." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> ACID is universal among serious relational engines, but defaults and mechanics differ sharply:</p>" +
      "<ul>" +
      "<li><b>Default isolation:</b> PostgreSQL, SQL Server, and Oracle default to <code>READ COMMITTED</code>; <b>MySQL/InnoDB</b> defaults to <code>REPEATABLE READ</code>.</li>" +
      "<li><b>MVCC:</b> PostgreSQL and Oracle use MVCC so readers never block writers. SQL Server uses locking by default but offers MVCC-style snapshots via <code>READ_COMMITTED_SNAPSHOT</code> / <code>SNAPSHOT</code> isolation.</li>" +
      "<li><b>Serializable:</b> PostgreSQL implements true Serializable Snapshot Isolation (may abort with a serialization failure — retry the transaction); Oracle's <code>SERIALIZABLE</code> is snapshot-based.</li>" +
      "<li><b>Autocommit:</b> every engine runs in autocommit by default — a lone statement is its own transaction. You must explicitly <code>BEGIN</code>/<code>START TRANSACTION</code> to group statements.</li>" +
      "<li><b>DDL:</b> PostgreSQL makes most DDL (CREATE/ALTER) transactional and rollback-able; MySQL and Oracle implicitly commit on DDL.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "Design a safe 'reserve one seat' operation for a concert: seats(id, event_id, status). A seat can be reserved only if its status is 'free', and two users must never reserve the same seat. Write it two ways — one atomic UPDATE, one with FOR UPDATE — and say which you'd prefer.",
      starter:
        "-- seats(id, event_id, status)  status in ('free','reserved')\n" +
        "-- Reserve seat :sid only if currently free, race-safe:",
      solution:
        "-- WAY 1 (preferred): single atomic conditional UPDATE, no explicit lock.\n" +
        "UPDATE seats SET status = 'reserved'\n" +
        "WHERE id = :sid AND status = 'free';\n" +
        "-- Check rows affected: 1 => you got it, 0 => someone else did. The WHERE\n" +
        "-- status='free' is evaluated atomically, so only ONE concurrent writer wins.\n\n" +
        "-- WAY 2: explicit row lock inside a transaction (needed if more logic follows).\n" +
        "BEGIN;\n" +
        "  SELECT status FROM seats WHERE id = :sid FOR UPDATE;  -- lock the row\n" +
        "  -- app checks it is 'free', does related work, then:\n" +
        "  UPDATE seats SET status = 'reserved' WHERE id = :sid;\n" +
        "COMMIT;\n\n" +
        "-- Prefer WAY 1: it is a single round-trip, holds no lock across app logic,\n" +
        "-- and cannot lose the race. Reach for WAY 2 only when the reservation must\n" +
        "-- happen together with other reads/writes that depend on the locked state."
    }
  },

  /* =================================================================== */
  {
    id: "procedures-triggers",
    title: "Procedures, Functions & Triggers",
    difficulty: "Core",
    estMinutes: 12,
    relevance: 2,
    tagline: "Logic that lives inside the database — callable routines and rules that fire automatically.",

    whatIsIt: [
      "A <b>stored procedure</b> is a named block of SQL (and procedural logic — variables, loops, conditionals) stored in the database and executed with <code>CALL</code> / <code>EXEC</code>. It can take parameters (<code>IN</code>, <code>OUT</code>, <code>INOUT</code>), run many statements, manage its own transactions, and does not have to return a value. Use it to package a multi-step operation (a nightly close, a complex insert-with-validation) so every caller runs identical, tested logic.",
      "A <b>user-defined function (UDF)</b> is a routine that <i>returns a value</i> and is meant to be used <i>inside</i> a query. A <b>scalar function</b> returns one value per call (<code>SELECT tax(amount)</code>); a <b>table-valued function</b> returns a result set you can select from like a table. The key rule: functions are for computing and returning, procedures are for doing.",
      "A <b>trigger</b> is a procedure that fires <i>automatically</i> in response to a data event — <code>BEFORE</code> or <code>AFTER</code> an <code>INSERT</code>, <code>UPDATE</code>, or <code>DELETE</code> — with access to the affected rows (the <code>NEW</code> and <code>OLD</code> images). Triggers enforce rules, maintain audit logs, keep derived columns in sync, or reject invalid changes — without the application having to remember to do so.",
      "The trade-off is where your logic lives. In-database routines run <b>close to the data</b> (no round-trips, one shared implementation, enforced for every client) but are <b>harder to version-control, test, and debug</b>, and hide behavior from application developers. Triggers especially can create surprising, cascading side effects. The modern lean is to keep business logic in the application and reserve procedures/triggers for things that genuinely must be guaranteed at the data layer (auditing, integrity rules, bulk set-based operations)."
    ],

    showMe: {
      code:
        "-- Scalar FUNCTION: returns a value, used inside queries.\n" +
        "CREATE FUNCTION order_total(p_order_id BIGINT)\n" +
        "RETURNS NUMERIC AS $$\n" +
        "  SELECT COALESCE(SUM(qty * unit_price), 0)\n" +
        "  FROM order_item WHERE order_id = p_order_id;\n" +
        "$$ LANGUAGE sql;\n\n" +
        "-- TRIGGER: fires automatically to keep an audit trail.\n" +
        "CREATE FUNCTION log_price_change() RETURNS trigger AS $$\n" +
        "BEGIN\n" +
        "  IF NEW.price <> OLD.price THEN\n" +
        "    INSERT INTO price_audit(product_id, old_price, new_price, changed_at)\n" +
        "    VALUES (OLD.id, OLD.price, NEW.price, now());\n" +
        "  END IF;\n" +
        "  RETURN NEW;\n" +
        "END; $$ LANGUAGE plpgsql;\n\n" +
        "CREATE TRIGGER trg_price_audit\n" +
        "  AFTER UPDATE ON product\n" +
        "  FOR EACH ROW EXECUTE FUNCTION log_price_change();",
      caption:
        "The function computes and returns a value for use in SELECT. The trigger fires on its own " +
        "after every product UPDATE and records price changes — no application code needs to remember " +
        "to log, and no client can bypass it (PostgreSQL syntax)."
    },

    whyMatters:
      "<p>These are the tools for <b>centralizing logic the database must guarantee</b>. An audit trigger can't be skipped by a rogue script; a stored procedure means a 12-step month-end close runs the same way whether called from the app, a cron job, or a DBA console. Interviewers ask about them to test whether you know <i>when</i> to push logic into the database versus keep it in the application.</p>" +
      "<p>The judgment call is the whole point. Favor in-database routines for: cross-client integrity, auditing, and heavy set-based work that would be slow to pull over the wire. Favor application code for: business rules that change often, anything needing rich testing/CI, and logic developers must see. The anti-pattern to avoid is <b>hidden behavior</b>:</p>" +
      "<pre class=\"why-pre\">-- Surprising: an INSERT silently triggers 3 other writes via chained triggers,\n-- so a developer reading the INSERT has no idea what actually happened.\n-- Prefer explicit, discoverable logic unless the guarantee must be at the data layer.</pre>",

    recognize: [
      { q: "\"every time a row changes, automatically record / update something\"", think: "trigger (AFTER INSERT/UPDATE/DELETE), using NEW/OLD" },
      { q: "\"compute a value I want to reuse inside many queries\"", think: "scalar user-defined function" },
      { q: "\"return a parameterized result set I can select from\"", think: "table-valued function" },
      { q: "\"package a multi-step operation every caller must run identically\"", think: "stored procedure (CALL/EXEC), possibly managing its own transaction" },
      { q: "\"guarantee a rule no client can bypass\"", think: "constraint if it's a simple rule; trigger if it needs procedural logic/side effects" }
    ],

    matchTags: ["stored procedure", "function", "udf", "trigger", "before trigger", "after trigger", "new old", "plpgsql", "scalar function"],

    traps: [
      {
        bad: "-- Scalar UDF called per row over a huge table:\nSELECT id, slow_scalar_udf(col) FROM big_table;  -- millions of rows",
        good: "-- Inline the logic as a set-based expression / join instead:\nSELECT b.id, /* the UDF's logic written directly */ FROM big_table b ...;",
        why: "A scalar UDF invoked once per row can force row-by-row execution and block set-based optimization (notoriously slow in SQL Server pre-2019). Prefer inline expressions, computed columns, or inline table-valued functions so the optimizer can still work set-at-a-time."
      },
      {
        bad: "-- Trigger on orders that INSERTs into stats, whose trigger UPDATEs\n-- summary, whose trigger writes audit ... (chained/cascading triggers)",
        good: "-- Keep triggers shallow and single-purpose; document them. Consider doing\n-- the follow-on work explicitly in one procedure instead of hidden chains.",
        why: "Cascading triggers create behavior that is invisible at the call site and hard to reason about, debug, or performance-tune. One INSERT silently fanning out into many writes is a classic source of mystery slowdowns and ordering bugs."
      },
      {
        bad: "-- Business rules that change monthly, buried in a 500-line stored proc\n-- with no tests and no version control",
        good: "-- Volatile business logic -> application code (tested, in git, reviewable).\n-- Reserve procs/triggers for stable, must-be-at-the-data-layer guarantees.",
        why: "In-database code is hard to unit test, diff, and deploy through CI. Logic that changes often and doesn't need a database-level guarantee is cheaper and safer to maintain in the application tier."
      }
    ],

    complexity: [
      { op: "Scalar UDF (per-row)", big_o: "O(n * f)", note: "Called once per row; if it can't be inlined, it multiplies the per-row cost f across all n rows and can defeat set-based plans." },
      { op: "Inline table-valued function", big_o: "optimizer-folded", note: "A single-statement inline TVF can be expanded into the calling query so the optimizer plans it as one set operation." },
      { op: "AFTER ROW trigger", big_o: "O(rows affected)", note: "Fires once per affected row; a bulk UPDATE of k rows runs the trigger k times — costly for large batch writes." },
      { op: "Statement-level trigger", big_o: "O(1 per statement)", note: "Fires once per statement regardless of row count — far cheaper for bulk operations when per-row data isn't needed." },
      { op: "Stored procedure", big_o: "sum of its statements", note: "Cost is the sum of the work it does, minus saved network round-trips vs. issuing the statements individually from the client." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> The concepts are shared but the languages and syntax diverge widely:</p>" +
      "<ul>" +
      "<li><b>Procedural language:</b> PostgreSQL uses <code>PL/pgSQL</code> (and others); Oracle uses <code>PL/SQL</code>; SQL Server uses <code>T-SQL</code>; MySQL has its own stored-program syntax.</li>" +
      "<li><b>Procedures vs functions:</b> the <code>CREATE PROCEDURE</code>/<code>CREATE FUNCTION</code> split is universal, but PostgreSQL only added true <code>CALL</code>able procedures (that can manage transactions) in v11.</li>" +
      "<li><b>Trigger timing:</b> all support row-level <code>BEFORE</code>/<code>AFTER</code>; SQL Server's model is <code>INSTEAD OF</code> and <code>AFTER</code> with <code>inserted</code>/<code>deleted</code> pseudo-tables rather than <code>NEW</code>/<code>OLD</code>.</li>" +
      "<li><b>Trigger granularity:</b> PostgreSQL and Oracle offer both <code>FOR EACH ROW</code> and <code>FOR EACH STATEMENT</code>; MySQL triggers are row-level only.</li>" +
      "<li><b>Scalar UDF performance:</b> historically a trap in SQL Server; SQL Server 2019+ can inline many scalar UDFs automatically (Froid), closing much of the gap.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "You must guarantee that whenever an employee's salary changes, the old and new values are recorded in salary_history — and no application or ad-hoc UPDATE can skip it. Which tool fits, and why not just have the app write both rows? Sketch it.",
      starter:
        "-- employee(id, name, salary)\n" +
        "-- salary_history(employee_id, old_salary, new_salary, changed_at)\n" +
        "-- Guarantee history is written on EVERY salary change:",
      solution:
        "CREATE FUNCTION record_salary_change() RETURNS trigger AS $$\n" +
        "BEGIN\n" +
        "  IF NEW.salary IS DISTINCT FROM OLD.salary THEN\n" +
        "    INSERT INTO salary_history(employee_id, old_salary, new_salary, changed_at)\n" +
        "    VALUES (OLD.id, OLD.salary, NEW.salary, now());\n" +
        "  END IF;\n" +
        "  RETURN NEW;\n" +
        "END; $$ LANGUAGE plpgsql;\n\n" +
        "CREATE TRIGGER trg_salary_history\n" +
        "  AFTER UPDATE OF salary ON employee\n" +
        "  FOR EACH ROW EXECUTE FUNCTION record_salary_change();\n\n" +
        "-- Why a trigger, not the app: application code can be bypassed -- a DBA hotfix,\n" +
        "-- a data-migration script, or a second service can UPDATE salary without going\n" +
        "-- through the app's write-history logic, leaving gaps in the audit trail. A\n" +
        "-- trigger fires for EVERY UPDATE from EVERY client, so the guarantee holds at\n" +
        "-- the data layer. IS DISTINCT FROM also handles NULL salaries correctly."
    }
  },

  /* =================================================================== */
  {
    id: "data-types",
    title: "Data Types & Storage",
    difficulty: "Beginner",
    estMinutes: 11,
    relevance: 2,
    tagline: "Pick the right column type — for correctness first, then storage and speed.",

    whatIsIt: [
      "A column's <b>data type</b> declares what it can store, how it sorts and compares, how much space it uses, and which operations are valid. Choosing well is a correctness decision before it is a performance one: the type is a constraint the engine enforces on every value.",
      "<b>Numbers:</b> integer types (<code>SMALLINT</code>, <code>INT</code>, <code>BIGINT</code>) for whole numbers; <b>exact decimal</b> (<code>NUMERIC</code>/<code>DECIMAL(p,s)</code>) for money and anything that must be precise; <b>floating point</b> (<code>REAL</code>/<code>DOUBLE</code>) for scientific values where tiny rounding is acceptable. <b>Never use float for money</b> — <code>0.1 + 0.2 &ne; 0.3</code> in binary floating point.",
      "<b>Text:</b> <code>CHAR(n)</code> is fixed-length (blank-padded); <code>VARCHAR(n)</code> is variable up to a limit; <code>TEXT</code> is unbounded. <b>Temporal:</b> <code>DATE</code>, <code>TIME</code>, <code>TIMESTAMP</code>, and crucially <code>TIMESTAMP WITH TIME ZONE</code> (store instants in UTC, not naive local times). <b>Other staples:</b> <code>BOOLEAN</code>, <code>UUID</code>, <code>JSON</code>/<code>JSONB</code> for semi-structured data, <code>BYTEA</code>/<code>BLOB</code> for binary, <code>ENUM</code> / arrays where supported.",
      "<b>NULL</b> is a first-class concern of typing: it means 'unknown / not applicable', not zero or empty string. It participates in <b>three-valued logic</b> — comparisons with NULL yield <code>UNKNOWN</code>, not true/false — which affects <code>WHERE</code>, <code>JOIN</code>, aggregates (which skip NULL), and <code>UNIQUE</code>. Decide <code>NULL</code> vs <code>NOT NULL</code> deliberately for every column."
    ],

    showMe: {
      code:
        "CREATE TABLE payment (\n" +
        "  id          BIGINT        PRIMARY KEY,\n" +
        "  amount      NUMERIC(12,2) NOT NULL,   -- exact money, never FLOAT\n" +
        "  currency    CHAR(3)       NOT NULL,   -- fixed 3-char code: 'USD'\n" +
        "  paid_at     TIMESTAMPTZ   NOT NULL,   -- instant in UTC, tz-aware\n" +
        "  note        TEXT,                     -- optional, unbounded\n" +
        "  details     JSONB,                    -- semi-structured extras\n" +
        "  refunded    BOOLEAN       NOT NULL DEFAULT FALSE\n" +
        ");\n\n" +
        "-- Why NUMERIC, not FLOAT, for money:\n" +
        "SELECT 0.1::float8 + 0.2::float8;   -- 0.30000000000000004\n" +
        "SELECT 0.1::numeric + 0.2::numeric; -- 0.3  (exact)",
      caption:
        "amount is exact decimal so cents never drift. paid_at is timezone-aware so an instant is " +
        "unambiguous worldwide. refunded is a real BOOLEAN with a default. The float demo shows why " +
        "money must never be a floating-point type."
    },

    whyMatters:
      "<p>Type choices are hard to reverse once a table has data and silently cause bugs when wrong: money drifting by a cent, dates that mean different things in different time zones, an <code>INT</code> id that overflows at 2.1 billion rows. Interviewers probe this because it reveals whether you think about correctness and scale up front.</p>" +
      "<p>The high-value rules: exact decimal for money; timezone-aware timestamps for instants; the smallest integer that safely fits (but <code>BIGINT</code> for anything that could grow); and <code>NOT NULL</code> wherever 'unknown' is not a real state. Watch three-valued logic constantly:</p>" +
      "<pre class=\"why-pre\">-- NULL is never equal to anything, including NULL:\nWHERE status = NULL      -- always UNKNOWN -> returns NOTHING (bug)\nWHERE status IS NULL     -- correct\nWHERE col <> 'x'         -- also drops rows where col IS NULL (surprise)\nWHERE col IS DISTINCT FROM 'x'  -- NULL-safe inequality</pre>",

    recognize: [
      { q: "\"store money / prices / anything that must be exact\"", think: "NUMERIC/DECIMAL(p,s) — never FLOAT/REAL" },
      { q: "\"record when something happened, across time zones\"", think: "TIMESTAMP WITH TIME ZONE (store UTC instants)" },
      { q: "\"an id column on a table that could exceed ~2 billion rows\"", think: "BIGINT, not INT (INT maxes near 2.1B)" },
      { q: "\"flexible / semi-structured attributes without fixed columns\"", think: "JSON/JSONB — but index what you query; don't abandon the relational model" },
      { q: "\"a column where 'missing' is a real possibility\"", think: "allow NULL deliberately and handle three-valued logic; otherwise NOT NULL" }
    ],

    matchTags: ["data types", "numeric", "decimal", "float money", "varchar", "timestamp", "timezone", "null", "three-valued logic", "jsonb", "bigint"],

    traps: [
      {
        bad: "price FLOAT   -- then SUM(price) across an invoice",
        good: "price NUMERIC(12,2)   -- exact; sums and comparisons are precise",
        why: "Binary floating point cannot represent most decimal fractions exactly, so money stored as FLOAT accumulates rounding error (0.1 + 0.2 = 0.30000000000000004). Totals drift and equality checks fail. Money is always exact decimal."
      },
      {
        bad: "WHERE deleted_at <> '2024-01-01'   -- expecting all other rows",
        good: "WHERE (deleted_at IS NULL OR deleted_at <> '2024-01-01')",
        why: "Any comparison with a NULL value yields UNKNOWN, and WHERE keeps only TRUE rows -- so rows where deleted_at IS NULL are silently dropped by a plain <>. Account for NULL explicitly, or use IS DISTINCT FROM for NULL-safe inequality."
      },
      {
        bad: "created_at TIMESTAMP  -- naive local time, server in one zone, users in many",
        good: "created_at TIMESTAMPTZ -- store the instant in UTC, convert for display",
        why: "A timestamp without time zone is ambiguous: '2024-03-10 02:30' could be two different instants across a DST change, and it means different things on servers in different zones. Store instants as timezone-aware UTC and convert at the edges."
      }
    ],

    complexity: [
      { op: "Fixed-width type comparison (INT, BIGINT)", big_o: "O(1)", note: "Integers compare and sort in constant time and pack densely, making them ideal keys and index columns." },
      { op: "NUMERIC arithmetic", big_o: "O(digits)", note: "Exact decimal is computed digit-by-digit, so it is slower than hardware float — the price of correctness for money." },
      { op: "VARCHAR vs CHAR storage", big_o: "len vs n", note: "VARCHAR stores actual length (+ a small header); CHAR(n) always stores n (blank-padded), wasting space when values vary in length." },
      { op: "Wider row, fewer rows per page", big_o: "more I/O", note: "Oversized types (BIGINT where SMALLINT fits, TEXT blobs inline) mean fewer rows per data page and more pages to read for scans." },
      { op: "JSONB query vs typed column", big_o: "parse + extract", note: "Extracting a field from JSON costs more than reading a dedicated typed column; index the hot JSON paths or promote them to real columns." }
    ],

    engineNote:
      "<p><b>Dialect notes.</b> Type names and behaviors vary more than beginners expect:</p>" +
      "<ul>" +
      "<li><b>Decimal:</b> <code>NUMERIC</code> and <code>DECIMAL</code> are synonyms in most engines and are exact everywhere — the portable choice for money.</li>" +
      "<li><b>Timestamps:</b> PostgreSQL has <code>timestamptz</code>; SQL Server uses <code>datetimeoffset</code>; MySQL's <code>TIMESTAMP</code> is stored as UTC but its <code>DATETIME</code> is not — know the difference.</li>" +
      "<li><b>Strings:</b> PostgreSQL treats <code>TEXT</code> and <code>VARCHAR</code> as equally fast (no performance penalty for TEXT); other engines may differ, and some cap VARCHAR lengths.</li>" +
      "<li><b>Boolean:</b> native in PostgreSQL/MySQL; SQL Server has no BOOLEAN — use <code>BIT</code>.</li>" +
      "<li><b>JSON:</b> PostgreSQL's <code>JSONB</code> is binary and indexable (GIN); plain <code>JSON</code> stores text. MySQL and SQL Server have their own JSON types/functions.</li>" +
      "<li><b>UUID / identity:</b> native <code>UUID</code> in PostgreSQL; others store it as <code>CHAR(36)</code> or a binary type. Auto-increment syntax differs (see Constraints &amp; Keys).</li>" +
      "</ul>",

    challenge: {
      prompt:
        "Critique and fix this table for a global e-commerce order log: order_log(id INT, total FLOAT, placed_at TIMESTAMP, status VARCHAR(50), country VARCHAR(255)). Name at least three type problems and give the corrected DDL.",
      starter:
        "CREATE TABLE order_log (\n" +
        "  id        INT,\n" +
        "  total     FLOAT,\n" +
        "  placed_at TIMESTAMP,\n" +
        "  status    VARCHAR(50),\n" +
        "  country   VARCHAR(255)\n" +
        ");\n" +
        "-- What's wrong, and the fix?",
      solution:
        "CREATE TABLE order_log (\n" +
        "  id        BIGINT        PRIMARY KEY,   -- INT overflows near 2.1B orders\n" +
        "  total     NUMERIC(12,2) NOT NULL,      -- FLOAT loses money precision\n" +
        "  placed_at TIMESTAMPTZ   NOT NULL,      -- naive TIMESTAMP is ambiguous globally\n" +
        "  status    VARCHAR(20)   NOT NULL,      -- better: a CHECK or FK to a status table\n" +
        "  country   CHAR(2)       NOT NULL       -- ISO code; 255 chars is wasteful & unvalidated\n" +
        ");\n" +
        "-- Problems fixed:\n" +
        "--  1. id INT  -> BIGINT: an INT caps at ~2.147B; a busy log will overflow.\n" +
        "--  2. total FLOAT -> NUMERIC(12,2): money must be exact, not binary float.\n" +
        "--  3. placed_at TIMESTAMP -> TIMESTAMPTZ: store a real UTC instant for a global app.\n" +
        "--  4. (bonus) country VARCHAR(255) -> CHAR(2) ISO code, and constrain status\n" +
        "--     (CHECK or lookup FK) instead of a free-text VARCHAR(50).\n" +
        "--  5. (bonus) add PRIMARY KEY / NOT NULL -- the original allowed NULL ids and totals."
    }
  },

  /* =================================================================== */
  {
    id: "oltp-olap",
    title: "OLTP vs OLAP",
    difficulty: "Core",
    estMinutes: 11,
    relevance: 3,
    tagline: "Two opposite workloads — fast small transactions vs. big analytical scans — shape every design choice.",

    whatIsIt: [
      "<b>OLTP</b> (Online Transaction Processing) is the workload of running the business: many short, concurrent transactions that each touch a few rows — place an order, update a balance, log in. It is write-heavy and latency-sensitive, measured in transactions per second and milliseconds per operation. The database behind an app is an OLTP system.",
      "<b>OLAP</b> (Online Analytical Processing) is the workload of understanding the business: a smaller number of large, complex, mostly-read queries that scan and aggregate millions of rows — 'revenue by region by quarter for three years'. It is read-heavy and throughput-oriented, measured in rows scanned and seconds-to-minutes per query. Data warehouses and BI tools are OLAP systems.",
      "They push schema design in opposite directions. OLTP favors <b>normalized</b> tables (3NF) so writes are cheap and consistent, and <b>row-oriented</b> storage so a single row is fetched quickly. OLAP favors <b>denormalized star schemas</b> (a central <i>fact</i> table of measures surrounded by wide <i>dimension</i> tables) and <b>columnar</b> storage so scanning a few columns over billions of rows reads only those columns and compresses them well.",
      "The standard architecture keeps them separate: the OLTP database serves the app, and an <b>ETL/ELT</b> pipeline periodically copies and transforms its data into an OLAP warehouse for analytics. This stops heavy reporting queries from competing with transactional traffic, and lets each system use the storage model and indexing its workload needs."
    ],

    showMe: {
      code:
        "-- OLTP query: pinpoint, few rows, index seek, sub-millisecond.\n" +
        "SELECT id, status, total\n" +
        "FROM orders\n" +
        "WHERE id = 90125;                  -- one row, by primary key\n\n" +
        "-- OLAP query: wide scan + aggregate over years of data.\n" +
        "SELECT d.region, d.quarter, SUM(f.amount) AS revenue\n" +
        "FROM fact_sales   f                -- central fact table (measures)\n" +
        "JOIN dim_date     d ON d.date_id   = f.date_id     -- dimension\n" +
        "JOIN dim_product  p ON p.product_id = f.product_id -- dimension\n" +
        "WHERE d.year BETWEEN 2022 AND 2024\n" +
        "GROUP BY d.region, d.quarter;      -- scans millions, returns a grid",
      caption:
        "The OLTP query wants one row fast (row store + B-tree seek). The OLAP query scans and " +
        "aggregates huge volumes across a star schema (columnar store, fact + dimensions). Same SQL " +
        "language, opposite access patterns and opposite optimal designs."
    },

    whyMatters:
      "<p>Knowing which workload you're designing for determines nearly every other choice — normalization vs denormalization, row vs columnar storage, which indexes, even which <i>product</i> (Postgres/MySQL for OLTP; Snowflake/BigQuery/Redshift/Spark for OLAP). It is a near-universal system-design interview framing, and misdiagnosing it leads to systems that are either slow to report on or slow to transact.</p>" +
      "<p>The cardinal rule is <b>don't run heavy analytics on your production OLTP database</b>: a big aggregation scan holds resources and locks that starve the millisecond transactions your users depend on. Move analytics to a replica or a warehouse:</p>" +
      "<pre class=\"why-pre\">App  -->  OLTP DB (normalized, row store, OLTP indexes)\n              |  ETL / ELT (batch or streaming)\n              v\n          OLAP warehouse (star schema, columnar) --> BI / dashboards</pre>",

    recognize: [
      { q: "\"an app backend: orders, users, payments, high write rate\"", think: "OLTP — normalize, row store, index the WHERE/JOIN columns" },
      { q: "\"dashboards / reports scanning years of history, aggregations\"", think: "OLAP — star schema, columnar warehouse, denormalized dimensions" },
      { q: "\"reporting queries are slowing down the production app\"", think: "separate the workloads — read replica or a dedicated warehouse + ETL" },
      { q: "\"queries read a few columns over billions of rows\"", think: "columnar storage (reads only needed columns, compresses well)" },
      { q: "\"fact table + dimension tables / measures + attributes\"", think: "star (or snowflake) schema — the OLAP modeling pattern" }
    ],

    matchTags: ["oltp", "olap", "data warehouse", "star schema", "fact table", "dimension", "columnar", "etl", "row store"],

    traps: [
      {
        bad: "-- Pointing the BI tool straight at the production OLTP database\n-- for a 3-year revenue roll-up during business hours",
        good: "-- Run analytics against a read replica or a warehouse fed by ETL,\n-- so big scans never contend with live transactions.",
        why: "Large analytical scans hold resources, fill the buffer cache with cold data, and (depending on isolation) take locks that block or slow the short transactions users depend on. Isolate the workloads."
      },
      {
        bad: "-- Fully normalizing a data warehouse to 3NF, then joining\n-- a dozen tables on every dashboard query",
        good: "-- Denormalize into a star schema: one fact table + wide dimensions,\n-- so a typical query is one big scan + a few dimension joins.",
        why: "A warehouse is load-once, read-many, so the write-side benefit of normalization doesn't apply, while its join-heavy cost hurts every read. The star schema trades redundancy (cheap here) for far faster analytical reads."
      },
      {
        bad: "-- Expecting an OLAP columnar warehouse to serve single-row,\n-- key-lookup, high-concurrency transactional traffic",
        good: "-- Use an OLTP engine for the transactional path; warehouses are\n-- optimized for scans, not for millisecond point writes/reads.",
        why: "Columnar warehouses optimize large scans and batch loads, not single-row point lookups or high-rate concurrent updates. Using one as an app's primary store gives poor transactional latency and concurrency."
      }
    ],

    complexity: [
      { op: "OLTP point operation", big_o: "O(log n)", note: "Index seek to a handful of rows; the whole system is tuned so this stays in the millisecond range under high concurrency." },
      { op: "OLAP scan + aggregate", big_o: "O(n) over columns", note: "Reads large portions of a table; columnar storage limits it to the needed columns and compresses them, but it is fundamentally a big scan." },
      { op: "Row store, single-row fetch", big_o: "1 page", note: "A row's columns are stored together, so fetching one whole row is one (or few) page reads — ideal for OLTP." },
      { op: "Columnar, few-column scan", big_o: "cols read only", note: "Each column is stored separately, so a query touching 3 of 50 columns reads ~3/50 of the data — ideal for OLAP aggregates." },
      { op: "ETL refresh latency", big_o: "batch window", note: "Analytics see data as fresh as the last pipeline run; micro-batch/streaming ETL narrows the gap at higher cost." }
    ],

    engineNote:
      "<p><b>Product landscape.</b> The OLTP/OLAP split increasingly maps to different systems:</p>" +
      "<ul>" +
      "<li><b>OLTP engines:</b> PostgreSQL, MySQL, SQL Server, Oracle — row-oriented, strong transactional guarantees, rich indexing for point access.</li>" +
      "<li><b>OLAP / warehouses:</b> Snowflake, Google BigQuery, Amazon Redshift, ClickHouse, and lakehouse engines (Spark SQL, Databricks, Trino) — columnar, massively parallel, scan-optimized.</li>" +
      "<li><b>Columnar inside an OLTP engine:</b> SQL Server columnstore indexes and PostgreSQL extensions let one engine serve some analytic queries, blurring the line.</li>" +
      "<li><b>HTAP:</b> 'hybrid transactional/analytical' systems (e.g. TiDB, SingleStore) aim to serve both workloads at once, keeping row and column representations in sync.</li>" +
      "<li><b>SQL is shared:</b> the same SELECT syntax runs on both — the difference is the storage model, schema design, and execution engine underneath.</li>" +
      "</ul>",

    challenge: {
      prompt:
        "A startup runs everything on one PostgreSQL database. The analytics team's daily 'revenue by product by region, last 2 years' query now takes 90 seconds and is slowing checkout during business hours. Lay out a plan: how do you separate the workloads and model the analytical side?",
      starter:
        "-- Current: one OLTP Postgres serving both the app and heavy analytics.\n" +
        "-- Goal: fast checkout AND fast analytics. What's the plan?",
      solution:
        "-- 1. SEPARATE THE WORKLOADS so analytics never contends with transactions:\n" +
        "--    * Quick win: run reports against a READ REPLICA of Postgres, not the primary.\n" +
        "--    * Durable fix: stand up an OLAP WAREHOUSE (BigQuery / Snowflake / Redshift)\n" +
        "--      and feed it from Postgres via nightly (or streaming) ETL/ELT.\n\n" +
        "-- 2. MODEL THE ANALYTICAL SIDE as a STAR SCHEMA, denormalized for scans:\n" +
        "--      fact_sales(date_id, product_id, region_id, amount, qty)   -- measures\n" +
        "--      dim_date(date_id, day, month, quarter, year)              -- dimensions\n" +
        "--      dim_product(product_id, name, category, ...)\n" +
        "--      dim_region(region_id, region, country, ...)\n" +
        "--    Columnar warehouse storage means the revenue query scans only the few\n" +
        "--    columns it needs across 2 years, compressed -- seconds, not 90s.\n\n" +
        "-- 3. KEEP OLTP POSTGRES NORMALIZED for the app: cheap, correct writes; its\n" +
        "--    indexes stay tuned for millisecond point operations at checkout.\n\n" +
        "-- Net: transactions and analytics each run on a system designed for their\n" +
        "-- access pattern, and the 90s report no longer touches the checkout path."
    }
  }

]);
