/* ============================================================
   Learn content. Lessons are structured data (a small block model),
   not prose blobs, so the renderer stays consistent and lessons can
   carry runnable example schemas that open in the Studio.
   ============================================================ */

import type { SchemaIR } from '@dms/modeling-core';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'code'; lang?: string; text: string }
  | { t: 'table'; headers: string[]; rows: string[][] }
  | { t: 'callout'; kind: 'tip' | 'trap' | 'note'; text: string }
  | { t: 'keys'; items: string[] }
  | { t: 'example'; caption: string; ir: SchemaIR };

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  blocks: Block[];
}

export interface LessonGroup {
  id: string;
  label: string;
  lessons: Lesson[];
}

/* ---- a couple of example schemas lessons can open in the Studio ---- */
const flatExample: SchemaIR = {
  version: 1,
  name: 'orders_flat (0NF/1NF)',
  entities: [
    {
      id: 'of',
      name: 'orders_flat',
      columns: [
        { name: 'order_id', type: 'int', keys: ['composite'], nullable: false },
        { name: 'product_id', type: 'int', keys: ['composite'], nullable: false },
        { name: 'product_name', type: 'varchar(255)' },
        { name: 'customer_id', type: 'int' },
        { name: 'customer_city', type: 'varchar(255)' },
        { name: 'quantity', type: 'int' },
      ],
      dependencies: [
        { determinant: ['product_id'], dependent: ['product_name'] },
        { determinant: ['customer_id'], dependent: ['customer_city'] },
        { determinant: ['order_id', 'product_id'], dependent: ['quantity'] },
      ],
    },
  ],
  relationships: [],
};

const scd2Example: SchemaIR = {
  version: 1,
  name: 'SCD Type 2 dimension',
  entities: [
    {
      id: 'dc',
      name: 'dim_customer',
      role: 'dimension',
      scd: 2,
      columns: [
        { name: 'customer_key', type: 'bigint', keys: ['surrogate'], nullable: false },
        { name: 'customer_id', type: 'int' },
        { name: 'name', type: 'varchar(255)' },
        { name: 'city', type: 'varchar(255)' },
        { name: 'valid_from', type: 'timestamp' },
        { name: 'valid_to', type: 'timestamp' },
        { name: 'is_current', type: 'boolean' },
      ],
    },
  ],
  relationships: [],
};

export const LESSON_GROUPS: LessonGroup[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    lessons: [
      {
        id: 'what-is',
        title: 'What is data modeling?',
        minutes: 4,
        summary: 'Turning messy real-world requirements into a precise, queryable structure.',
        blocks: [
          { t: 'p', text: 'Data modeling is the practice of translating a real-world situation into a structured format a database can store, protect, and answer questions about. You decide what things you track, what you record about each, how they connect, and what rules keep the data honest.' },
          { t: 'p', text: 'A good model is judged by three things: it captures the business accurately, it makes the important questions easy to answer, and it prevents impossible states (an order with no customer, two people sharing one national ID).' },
          { t: 'h', text: 'Three levels of a model' },
          { t: 'table', headers: ['Level', 'Answers', 'Audience'], rows: [
            ['Conceptual', 'What things exist and how they relate, in business terms', 'Stakeholders'],
            ['Logical', 'Entities, attributes, keys, relationships — no vendor specifics', 'Designers'],
            ['Physical', 'Tables, data types, indexes, partitions for a specific engine', 'Engineers/DBAs'],
          ] },
          { t: 'callout', kind: 'note', text: 'You move top-down: agree the concepts, formalize the logical model, then make physical choices. Interviews usually happen at the logical level, then push you to physical trade-offs.' },
          { t: 'keys', items: [
            'Modeling = structure + rules that make data accurate and queryable.',
            'Conceptual → Logical → Physical: increasing detail and vendor-specificity.',
          ] },
        ],
      },
      {
        id: 'entities-attributes',
        title: 'Entities, attributes & relationships',
        minutes: 5,
        summary: 'The three building blocks every model is made of.',
        blocks: [
          { t: 'p', text: 'Every model is built from three kinds of thing.' },
          { t: 'list', items: [
            'Entity — a thing you store rows about: Customer, Product, Order. Becomes a table.',
            'Attribute — a fact about an entity: a Customer’s name, email, signup date. Becomes a column.',
            'Relationship — how entities connect: a Customer places Orders; an Order contains Products.',
          ] },
          { t: 'h', text: 'Spotting them in a prompt' },
          { t: 'p', text: 'A reliable trick: nouns tend to be entities or attributes, and verbs tend to be relationships. "A customer places an order for one or more products" gives you Customer, Order, Product (entities) linked by places and contains (relationships).' },
          { t: 'callout', kind: 'tip', text: 'Ask "would I ever want a list of these on their own?" If yes, it is probably an entity (a table), not just an attribute. Addresses often graduate from attribute to entity this way.' },
          { t: 'keys', items: [
            'Entity → table, attribute → column, relationship → a link (often an FK).',
            'Nouns hint at entities/attributes; verbs hint at relationships.',
          ] },
        ],
      },
      {
        id: 'cardinality-modality',
        title: 'Cardinality & modality',
        minutes: 5,
        summary: 'How many, and whether it is required — the two numbers on every relationship.',
        blocks: [
          { t: 'p', text: 'A relationship needs two pieces of precision: cardinality (how many) and modality (is it required).' },
          { t: 'h', text: 'Cardinality — how many' },
          { t: 'list', items: [
            'One-to-one (1:1) — one row here maps to at most one there. A user and their single profile.',
            'One-to-many (1:N) — the common case. One customer has many orders; each order has one customer.',
            'Many-to-many (N:M) — both sides can have many. Orders and products; students and courses.',
          ] },
          { t: 'h', text: 'Modality — required or optional' },
          { t: 'p', text: 'Modality says whether a row must participate. An order must have a customer (mandatory). A customer may have zero orders (optional). Modality is what decides whether a foreign key column is NOT NULL.' },
          { t: 'callout', kind: 'trap', text: 'Interviewers love pushing cardinality. "Can a product ever have two suppliers?" quietly turns a 1:N into an N:M and forces a junction table. Always state your cardinality assumptions out loud.' },
          { t: 'keys', items: [
            'Cardinality = how many (1:1, 1:N, N:M); modality = required vs optional.',
            'Mandatory participation → NOT NULL foreign key.',
            'N:M always needs a junction table (next section).',
          ] },
        ],
      },
      {
        id: 'er-diagrams',
        title: 'ER diagrams & their components',
        minutes: 4,
        summary: 'The visual language for a logical model.',
        blocks: [
          { t: 'p', text: 'An Entity-Relationship (ER) diagram is the picture of your logical model. It lets people see the entities, their attributes, and how they connect at a glance.' },
          { t: 'table', headers: ['Element', 'Classic notation', 'Means'], rows: [
            ['Entity', 'Rectangle', 'A table'],
            ['Attribute', 'Oval (or a row in the box)', 'A column'],
            ['Relationship', 'Diamond / connecting line', 'A link between entities'],
            ['Cardinality', 'Crow’s-foot symbols on the line', 'How many on each side'],
          ] },
          { t: 'p', text: 'Modern tools use "crow’s foot" notation: a fork (crow’s foot) means "many", a single bar means "one", and a small circle means "optional (zero)". So a bar-to-crowsfoot line reads "one to many".' },
          { t: 'callout', kind: 'tip', text: 'In the Studio, every schema renders as an ER diagram automatically and exports to Mermaid — you draw the model, the diagram is a by-product.' },
          { t: 'keys', items: [
            'ER diagram = the visual logical model: entities, attributes, relationships, cardinality.',
            'Crow’s foot: fork = many, bar = one, circle = optional.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'keys-rels',
    label: 'Keys & Relationships',
    lessons: [
      {
        id: 'keys',
        title: 'Keys: primary, candidate, composite, surrogate, natural',
        minutes: 7,
        summary: 'How rows are identified — the backbone of every table.',
        blocks: [
          { t: 'p', text: 'A key is how you uniquely identify a row. Getting keys right is the single most important structural decision in a table.' },
          { t: 'list', items: [
            'Candidate key — any column (or set) that could uniquely identify a row.',
            'Primary key (PK) — the candidate key you chose as the official identifier. Unique + never null.',
            'Composite key — a primary key made of more than one column (common in junction tables).',
            'Foreign key (FK) — a column that references another table’s PK, wiring two tables together.',
          ] },
          { t: 'h', text: 'Natural vs surrogate keys' },
          { t: 'p', text: 'A natural key is a real-world identifier that already means something (email, ISBN, national ID). A surrogate key is a system-generated, meaningless id (an auto-increment integer or UUID) whose only job is to identify the row.' },
          { t: 'table', headers: ['', 'Natural key', 'Surrogate key'], rows: [
            ['Meaning', 'Business meaning', 'None — just an id'],
            ['Stability', 'Can change (people change email)', 'Never changes'],
            ['Joins', 'Wider, sometimes multi-column', 'Narrow, fast (one integer)'],
            ['Best for', 'Lookup/reference values', 'Most tables, and all warehouse dimensions'],
          ] },
          { t: 'callout', kind: 'trap', text: 'The classic mistake is using a natural key that turns out to be mutable or non-unique (email, phone, "firstname+lastname"). When the real world changes, every FK pointing at it breaks. Default to a surrogate PK and keep the natural key as a separate UNIQUE column.' },
          { t: 'keys', items: [
            'PK = chosen candidate key: unique and not null.',
            'Composite PK = multiple columns; typical in junction tables.',
            'Prefer a surrogate PK; keep natural keys as UNIQUE attributes.',
          ] },
        ],
      },
      {
        id: 'relationships',
        title: 'Relationships & junction tables',
        minutes: 6,
        summary: 'Implementing 1:1, 1:N, and resolving N:M correctly.',
        blocks: [
          { t: 'p', text: 'Relationships are implemented with foreign keys. How you place them depends on cardinality.' },
          { t: 'ol', items: [
            '1:N — put the foreign key on the "many" side. Each order stores its one customer_id.',
            '1:1 — put the FK on either side (often the optional side) with a UNIQUE constraint.',
            'N:M — you cannot do it with a single FK. Introduce a junction (bridge) table.',
          ] },
          { t: 'h', text: 'Why N:M needs a junction table' },
          { t: 'p', text: 'An order can contain many products and a product can appear in many orders. You resolve this with an order_items table holding an FK to each side; its primary key is the composite of both FKs (plus any relationship attributes like quantity).' },
          { t: 'code', lang: 'sql', text: 'CREATE TABLE order_items (\n  order_id   int REFERENCES orders(order_id),\n  product_id int REFERENCES products(product_id),\n  quantity   int,\n  PRIMARY KEY (order_id, product_id)\n);' },
          { t: 'callout', kind: 'tip', text: 'A junction table is also the natural home for facts about the relationship itself — quantity, price at time of sale, added_at. That is often where the interesting data lives.' },
          { t: 'keys', items: [
            '1:N → FK on the many side. 1:1 → FK + UNIQUE.',
            'N:M → junction table with a composite PK of both FKs.',
            'Relationship attributes belong on the junction table.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'normalization',
    label: 'Normalization',
    lessons: [
      {
        id: 'normalization',
        title: 'Normalization: 1NF → BCNF',
        minutes: 9,
        summary: 'Removing redundancy so the database can’t contradict itself.',
        blocks: [
          { t: 'p', text: 'Normalization is the process of organizing columns into tables so that each fact is stored exactly once. Redundant data is the enemy: if a customer’s city is copied onto every order row, one update can leave the rows disagreeing. Normalization designs that possibility away.' },
          { t: 'p', text: 'It is driven by functional dependencies: "X determines Y" (written X → Y) means for a given X there is exactly one Y. product_id → product_name: a product id always maps to one name.' },
          { t: 'h', text: 'The normal forms' },
          { t: 'ol', items: [
            '1NF — atomic values, no repeating groups. No "phone1, phone2, phone3" and no comma-lists in a cell.',
            '2NF — 1NF, and no partial dependency: no non-key column depends on only part of a composite key.',
            '3NF — 2NF, and no transitive dependency: no non-key column depends on another non-key column.',
            'BCNF — a stricter 3NF: every determinant must be a candidate key.',
          ] },
          { t: 'p', text: 'The worked example below is at 1NF: its PK is (order_id, product_id), but product_name depends only on product_id (a partial dependency → breaks 2NF) and customer_city depends on customer_id, a non-key column (a transitive dependency → breaks 3NF).' },
          { t: 'example', caption: 'Open this in the Studio — the validator names the exact dependencies that break 2NF and 3NF.', ir: flatExample },
          { t: 'p', text: 'Fixing it means splitting: a products table (product_id → product_name), a customers table (customer_id → customer_city), and a slim order_items table keyed by (order_id, product_id) holding just quantity. Now every fact lives in one place.' },
          { t: 'callout', kind: 'trap', text: 'A favorite interview line: "3NF in one sentence." Answer: every non-key column depends on the key, the whole key, and nothing but the key. (That covers 1NF-key, 2NF-whole-key, 3NF-nothing-but-the-key.)' },
          { t: 'keys', items: [
            '1NF atomic; 2NF no partial deps; 3NF no transitive deps; BCNF every determinant is a key.',
            'Normalization removes update/insert/delete anomalies by storing each fact once.',
            '“The key, the whole key, and nothing but the key.”',
          ] },
        ],
      },
      {
        id: 'denormalization',
        title: 'Denormalization: trading purity for speed',
        minutes: 5,
        summary: 'When copying data on purpose is the right call.',
        blocks: [
          { t: 'p', text: 'Denormalization is deliberately introducing redundancy — pre-joining or duplicating data — to make reads faster. It is not "getting normalization wrong"; it is a conscious trade of write-simplicity and storage for read-performance.' },
          { t: 'h', text: 'When it’s justified' },
          { t: 'list', items: [
            'Read-heavy analytics where joins across many normalized tables are too slow.',
            'Reporting/warehouse models (star schemas are denormalized on purpose).',
            'Expensive computed values you’d rather store than recompute (an order total).',
          ] },
          { t: 'h', text: 'The cost' },
          { t: 'p', text: 'Every duplicated value is now something you must keep in sync on write. You trade the risk of anomalies back in, so denormalize only where the read win is real and the write path can maintain consistency (or the data is append-only).' },
          { t: 'callout', kind: 'note', text: 'Rule of thumb: normalize for systems that capture data (OLTP), denormalize for systems that answer questions (OLAP). The next group is entirely about the second world.' },
          { t: 'keys', items: [
            'Denormalization = intentional redundancy for read speed.',
            'Cost = you must keep copies in sync; best when append-only or read-mostly.',
            'OLTP leans normalized; OLAP leans denormalized.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'dimensional',
    label: 'Dimensional / Warehouse',
    lessons: [
      {
        id: 'oltp-olap',
        title: 'OLTP vs OLAP',
        minutes: 5,
        summary: 'Two opposite jobs that call for two opposite models.',
        blocks: [
          { t: 'p', text: 'The biggest fork in data modeling is what the system is for.' },
          { t: 'table', headers: ['', 'OLTP', 'OLAP'], rows: [
            ['Job', 'Run the business (capture transactions)', 'Analyze the business (answer questions)'],
            ['Typical write', 'Many small inserts/updates', 'Bulk loads'],
            ['Typical read', 'A few rows by key', 'Aggregate millions of rows'],
            ['Model', 'Normalized (3NF)', 'Dimensional (star schema)'],
            ['Optimized for', 'Correctness & concurrency', 'Scan & aggregate speed'],
          ] },
          { t: 'p', text: 'An e-commerce app’s live database is OLTP: normalized, lots of tiny transactions. The warehouse that powers dashboards is OLAP: denormalized into facts and dimensions so "total sales by city by month" is a fast scan, not a 12-table join.' },
          { t: 'keys', items: [
            'OLTP = capture, normalized, key-lookups. OLAP = analyze, dimensional, big aggregates.',
            'The same business needs both, usually fed by a pipeline from OLTP to OLAP.',
          ] },
        ],
      },
      {
        id: 'star-snowflake',
        title: 'Star schema vs snowflake schema',
        minutes: 6,
        summary: 'The two shapes of a dimensional model.',
        blocks: [
          { t: 'p', text: 'A dimensional model has a central fact table surrounded by dimension tables. The shape depends on whether the dimensions are flattened or normalized.' },
          { t: 'list', items: [
            'Star schema — dimensions are denormalized into single wide tables. Fewer joins, faster queries, simpler for BI tools. The default.',
            'Snowflake schema — dimensions are normalized into sub-tables (product → category → department). Less redundancy, but more joins and complexity.',
          ] },
          { t: 'table', headers: ['', 'Star', 'Snowflake'], rows: [
            ['Dimension shape', 'Flat, denormalized', 'Normalized into sub-tables'],
            ['Joins per query', 'Fewer', 'More'],
            ['Query speed', 'Faster', 'Slower'],
            ['Storage/redundancy', 'More redundancy', 'Less'],
          ] },
          { t: 'callout', kind: 'tip', text: 'Default to a star. Reach for snowflaking only when a dimension is huge and its redundancy is genuinely costly, or a hierarchy needs to be shared and maintained independently.' },
          { t: 'keys', items: [
            'Star = denormalized dimensions, fewer joins (default). Snowflake = normalized dimensions, more joins.',
            'Both have one central fact table.',
          ] },
        ],
      },
      {
        id: 'facts-grain',
        title: 'Fact tables & grain',
        minutes: 6,
        summary: 'The most important sentence in any warehouse design.',
        blocks: [
          { t: 'p', text: 'A fact table stores the measurements of a business process — the numbers you sum and average (quantity, amount, duration) — plus foreign keys to the dimensions that give them context.' },
          { t: 'h', text: 'Grain: declare it first' },
          { t: 'p', text: 'The grain is the precise meaning of one row: "one row per order line item", "one row per shipment", "one row per sensor reading per minute". Declaring the grain is the first and most important step — every column must be true at that grain, and mixing grains is the root of most warehouse bugs.' },
          { t: 'h', text: 'Additivity of measures' },
          { t: 'list', items: [
            'Additive — can be summed across all dimensions (sales amount). The best kind.',
            'Semi-additive — summable across some dimensions but not time (account balance).',
            'Non-additive — cannot be summed (ratios, percentages); store the components instead.',
          ] },
          { t: 'callout', kind: 'trap', text: 'If you can’t state the grain in one sentence, your fact table is wrong. Interviewers ask "what’s the grain?" precisely to see if you lead with it.' },
          { t: 'keys', items: [
            'Fact = measures + dimension FKs. Declare the grain (one row per __) before anything else.',
            'Prefer additive measures; store components of non-additive ones.',
          ] },
        ],
      },
      {
        id: 'dimensions-conformed',
        title: 'Dimensions & conformed dimensions',
        minutes: 5,
        summary: 'The context tables — and how to share them across facts.',
        blocks: [
          { t: 'p', text: 'A dimension table holds the descriptive context you slice and filter by: who, what, where, when. dim_customer, dim_product, dim_date. Dimensions are wide and denormalized on purpose — lots of descriptive columns so filters and group-bys are simple.' },
          { t: 'h', text: 'Conformed dimensions' },
          { t: 'p', text: 'A conformed dimension is one shared consistently across multiple fact tables — the same dim_date and dim_customer used by both fact_sales and fact_returns. Because the keys and meanings match, you can compare and combine metrics across processes ("sales vs returns by customer by month"). Conformed dimensions are what make a warehouse an integrated whole rather than disconnected marts.' },
          { t: 'callout', kind: 'note', text: 'dim_date is the classic conformed dimension: a pre-built calendar table (with weekday, month, quarter, holiday flags) reused by every fact so date logic lives in one place.' },
          { t: 'keys', items: [
            'Dimensions = descriptive context, wide and denormalized.',
            'Conformed dimension = shared consistently across facts, enabling cross-process comparison.',
          ] },
        ],
      },
      {
        id: 'scd',
        title: 'Slowly Changing Dimensions (SCD)',
        minutes: 8,
        summary: 'How you handle a dimension attribute that changes over time.',
        blocks: [
          { t: 'p', text: 'Dimension attributes change: a customer moves city, a product is recategorized. A Slowly Changing Dimension (SCD) strategy decides what happens to history when they do. This is one of the most common data-modeling interview topics.' },
          { t: 'table', headers: ['Type', 'Behavior', 'History'], rows: [
            ['Type 0', 'Never change (fixed at creation)', 'Original only'],
            ['Type 1', 'Overwrite the old value', 'None — lost'],
            ['Type 2', 'Add a new row (versioned)', 'Full history'],
            ['Type 3', 'Add a “previous value” column', 'One prior value'],
            ['Type 4', 'Move history to a separate table', 'Full, split out'],
            ['Type 6', 'Combine 1 + 2 + 3', 'Full + easy current'],
          ] },
          { t: 'h', text: 'Type 2 in practice' },
          { t: 'p', text: 'Type 2 is the workhorse: to keep history you insert a new row each time an attribute changes, using a surrogate key so each version is distinct, plus valid_from / valid_to dates and an is_current flag. Facts point at the surrogate key, so each fact naturally links to the version that was true when it happened.' },
          { t: 'example', caption: 'Open this SCD2 dimension in the Studio — the validator checks for the surrogate key and effective-dating columns.', ir: scd2Example },
          { t: 'callout', kind: 'trap', text: 'The trap: choosing Type 1 when the question implies history matters ("report sales by the customer’s city at time of purchase"). Type 1 overwrites and makes that report impossible. When in doubt and history could matter, argue for Type 2.' },
          { t: 'keys', items: [
            'SCD = how a dimension handles change. Type 1 overwrites; Type 2 versions with new rows.',
            'Type 2 needs a surrogate key + valid_from/valid_to + is_current.',
            'Pick Type 2 when historical accuracy of the attribute matters.',
          ] },
        ],
      },
      {
        id: 'surrogate-dw',
        title: 'Surrogate keys in the warehouse',
        minutes: 4,
        summary: 'Why dimensions almost always use surrogate keys.',
        blocks: [
          { t: 'p', text: 'In a warehouse, dimension tables use a surrogate key (a generated integer) as their primary key, and the natural/business key (customer_id from the source system) becomes an ordinary attribute.' },
          { t: 'h', text: 'Why' },
          { t: 'list', items: [
            'SCD Type 2 needs it — multiple versions of the same business key must each be a distinct row, so the PK cannot be the business key.',
            'It decouples the warehouse from source systems — if a source changes or you integrate two systems with clashing ids, the warehouse keys are unaffected.',
            'Integer keys make the huge fact-to-dimension joins fast and compact.',
          ] },
          { t: 'callout', kind: 'note', text: 'So a dim table typically has BOTH: customer_key (surrogate PK) and customer_id (natural key, kept for lineage and lookups).' },
          { t: 'keys', items: [
            'Warehouse dimensions: surrogate PK, natural key kept as an attribute.',
            'Required for SCD2; also decouples from sources and speeds joins.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'physical',
    label: 'Physical & Performance',
    lessons: [
      {
        id: 'indexing',
        title: 'Indexing',
        minutes: 6,
        summary: 'The physical structures that make lookups fast.',
        blocks: [
          { t: 'p', text: 'An index is a secondary structure that lets the database find rows without scanning the whole table — like a book’s index. It speeds reads at the cost of extra storage and slower writes (every write must also update the indexes).' },
          { t: 'table', headers: ['Type', 'Good for', 'Weak at'], rows: [
            ['B-tree', 'Range & equality, sorting (the default)', 'Very low-cardinality columns'],
            ['Hash', 'Exact-match equality', 'Ranges / ordering'],
            ['Bitmap', 'Low-cardinality columns in analytics', 'High-write OLTP'],
            ['Composite', 'Queries filtering on several columns together', 'Order of columns matters'],
          ] },
          { t: 'callout', kind: 'tip', text: 'Composite index column order follows the "leftmost prefix" rule: an index on (a, b) helps queries on a, or a+b, but not b alone. Put the most selective / most-filtered column first.' },
          { t: 'callout', kind: 'trap', text: 'More indexes is not better. Each one taxes every insert/update. Index the columns you actually filter and join on, not every column.' },
          { t: 'keys', items: [
            'Index = faster reads, slower writes, more storage.',
            'B-tree default; hash for equality; bitmap for low-cardinality analytics; composite for multi-column filters.',
            'Composite indexes obey the leftmost-prefix rule.',
          ] },
        ],
      },
      {
        id: 'partitioning',
        title: 'Partitioning',
        minutes: 5,
        summary: 'Splitting one big table into manageable physical pieces.',
        blocks: [
          { t: 'p', text: 'Partitioning divides a large table into smaller physical segments by the value of a column, while it still behaves as one logical table. Queries that filter on the partition column can skip entire partitions ("partition pruning").' },
          { t: 'h', text: 'Common strategies' },
          { t: 'list', items: [
            'Range — by a continuous value, usually date (one partition per month). The most common for facts.',
            'List — by a discrete set (partition by region or country).',
            'Hash — by a hash of the key, to spread rows evenly and avoid hotspots.',
          ] },
          { t: 'h', text: 'Why it helps' },
          { t: 'list', items: [
            'Prune irrelevant data — "last 7 days" scans one or two partitions, not years.',
            'Cheaper maintenance — drop an old month by dropping a partition, no giant DELETE.',
            'Parallelism — engines can scan partitions concurrently.',
          ] },
          { t: 'callout', kind: 'note', text: 'Partitioning is coarse (segments of a table); indexing is fine (locating rows). They complement each other: partition by date, index within partitions by the keys you look up.' },
          { t: 'keys', items: [
            'Partitioning splits a table by a column (range/list/hash) for pruning, cheap maintenance, parallelism.',
            'Range-by-date is the default for large fact tables.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'modern',
    label: 'Advanced & Modern',
    lessons: [
      {
        id: 'data-vault',
        title: 'Data Vault (a peek)',
        minutes: 4,
        summary: 'An alternative warehouse pattern built for auditability and change.',
        blocks: [
          { t: 'p', text: 'Data Vault is a warehouse modeling pattern designed for auditability, historization, and absorbing source change without redesign. It splits data into three constructs.' },
          { t: 'list', items: [
            'Hubs — the business keys (a customer_hub holding just the business key + metadata).',
            'Links — the relationships between hubs (a link connecting customer and order hubs).',
            'Satellites — the descriptive, historized attributes hanging off hubs and links.',
          ] },
          { t: 'p', text: 'The payoff is flexibility and a complete audit trail: you can add sources and attributes by adding satellites without touching existing structures. The cost is many more tables and joins, so it is usually a raw/integration layer, with star schemas built on top for consumption.' },
          { t: 'keys', items: [
            'Data Vault = Hubs (keys) + Links (relationships) + Satellites (historized attributes).',
            'Optimized for auditability and change absorption; usually feeds star schemas downstream.',
          ] },
        ],
      },
      {
        id: 'events-nested',
        title: 'Event streams & nested data',
        minutes: 5,
        summary: 'Modeling in a world of append-only logs and semi-structured data.',
        blocks: [
          { t: 'p', text: 'Modern data is often append-only event streams (clicks, orders, IoT readings) and semi-structured records (JSON with nested arrays). The modeling ideas shift, but the fundamentals still apply.' },
          { t: 'h', text: 'Event streams' },
          { t: 'list', items: [
            'Model events as an immutable, append-only fact log — one row per event, never updated.',
            'State is derived by folding events (an order’s current status is the latest status event).',
            'This maps cleanly onto a fact table with a fine time grain.',
          ] },
          { t: 'h', text: 'Nested / semi-structured data' },
          { t: 'list', items: [
            'Columnar engines (BigQuery, Snowflake, Iceberg) store nested arrays/structs natively.',
            'You choose per query: keep it nested for locality, or "unnest/explode" into rows to model it relationally.',
            'A nested array of order lines is just a pre-joined N:M — the junction-table idea, physically nested.',
          ] },
          { t: 'callout', kind: 'note', text: 'Even here the core skills carry: identify entities and grain, decide what’s a fact vs a dimension, and be explicit about how change and history are handled.' },
          { t: 'keys', items: [
            'Events = append-only fact log; current state is a fold over events.',
            'Nested data = pre-joined relationships; unnest to model relationally when needed.',
            'Entities, grain, facts vs dimensions, and history still drive the design.',
          ] },
        ],
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = LESSON_GROUPS.flatMap((g) => g.lessons);
export const LESSON_COUNT = ALL_LESSONS.length;
