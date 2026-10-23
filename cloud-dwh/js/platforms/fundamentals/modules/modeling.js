/* Fundamentals · Data & Modeling group — dimensional modeling and
   open table formats / lakehouse. Authored for the shared FundKit. */
(function () {
  'use strict';
  const Kit = window.CDWH && window.CDWH.FundKit;
  if (!Kit) return;

  Kit.registerAll({

    /* ─────────────────── Dimensional modeling ─────────────────── */
    'fund-modeling': {
      eyebrow: '📐 Data & Modeling',
      title: 'Dimensional modeling (star & snowflake schemas)',
      lead: 'Raw tables copied from an app are shaped for the app, not for analysis. <strong>Dimensional modeling</strong> reshapes them into a <strong>star schema</strong> — a central table of measurable events surrounded by descriptive lookup tables — which is both intuitive for business users and fast for warehouses to query.',
      sections: [
        { h: 'Facts and dimensions', p:
          '<p>A <strong>fact table</strong> holds the measurable events — one row per watch session, with numeric measures (minutes watched) and foreign keys. <strong>Dimension tables</strong> hold the descriptive context you filter and group by — who (user), what (title), where (country), when (date). "Minutes by country and month" is just the fact table joined to the country and date dimensions.</p>' },
        { h: 'Grain, keys, and the star', p:
          '<p>First decide the <strong>grain</strong>: what exactly one fact row represents (e.g. one play event). Keep it consistent. Dimensions connect to the fact via small <strong>surrogate keys</strong>. Arranged this way the diagram looks like a <strong>star</strong> — one fact in the middle, dimensions as points. A <strong>snowflake schema</strong> normalizes dimensions further into sub-tables (more joins, less redundancy); star is usually preferred in warehouses because fewer joins run faster.</p>' },
        { h: 'Slowly-changing dimensions (SCD)', p:
          '<p>Dimension attributes change — a user moves country, a title is recategorized. An <strong>SCD Type 2</strong> dimension keeps the history by versioning rows (valid-from / valid-to), so a report can show what was true <em>at the time of the event</em>, not just today. This is where CDC history (from the ingestion group) pays off.</p>' },
      ],
      diagramTitle: '🎬 Building a star schema',
      stage: { caption: 'One fact table of events, surrounded by descriptive dimensions',
        groups: [
          { id: 'raw', label: 'Raw operational data', nodes: [ { id: 'blob', label: 'Wide, app-shaped tables' } ], connectorAfter: 'model it' },
          { id: 'fact', label: 'Fact table (the center)', sub: 'one row per event · measures + keys', nodes: [ { id: 'f', label: 'fact_watch', sub: 'minutes, user_key, title_key, date_key' } ], connectorAfter: 'surrounded by dimensions' },
          { id: 'dims', label: 'Dimension tables (the points)', sub: 'descriptive context', nodes: [
            { id: 'duser', label: 'dim_user' }, { id: 'title', label: 'dim_title' }, { id: 'geo', label: 'dim_country' }, { id: 'date', label: 'dim_date' } ], connectorAfter: 'join for answers' },
          { id: 'bi', label: 'BI', nodes: [ { id: 'q', label: 'Minutes by country & month' } ] },
        ] },
      steps: [
        { label: 'Raw', title: 'App-shaped data isn\'t analysis-ready', on: { spot: ['raw'], flow: ['blob'] },
          body: 'Operational tables are normalized for the application and awkward to query for trends. We reshape them for analytics.',
          facts: ['Shaped for the app, not reports', 'Hard to slice and aggregate', 'Needs modeling'] },
        { label: 'Fact', title: 'Define the fact table & grain', on: { spot: ['fact'], flow: ['f'], conn: ['raw'] },
          body: 'Pick the grain — one row per watch event — and store the numeric measures plus foreign keys to context. This is the heart of the star.',
          facts: ['One row per event (the grain)', 'Numeric measures + surrogate keys', 'Usually long and narrow'] },
        { label: 'Dimensions', title: 'Surround it with dimensions', on: { spot: ['dims'], flow: ['user', 'title', 'geo', 'date'], conn: ['fact'] },
          body: 'Descriptive lookup tables — user, title, country, date — attach to the fact by key. These are what you filter and group by.',
          facts: ['Who / what / where / when', 'Small, descriptive, reusable', 'The points of the star'] },
        { label: 'Query', title: 'Answers = fact ⋈ dimensions', on: { spot: ['bi'], flow: ['q'], conn: ['dims'] },
          body: '"Minutes by country and month" is the fact joined to the country and date dimensions — simple for users, and fast because the engine co-locates these joins.',
          facts: ['Intuitive for business users', 'Few, predictable joins', 'Fast with good distribution'] },
        { label: 'History', title: 'Track change with SCD Type 2', on: { spot: ['dims'], flow: ['user'], dim: ['title', 'geo', 'date'] },
          body: 'Version dimension rows (valid-from/valid-to) so reports reflect what was true when the event happened — powered by CDC history.',
          facts: ['SCD Type 2 versions rows', 'Point-in-time correctness', 'Builds on CDC from ingestion'] },
      ],
      map: {
        intro: 'Dimensional modeling is vendor-neutral SQL — the same star schema works everywhere. The tuning and serving layer differ.',
        sf: { term: 'Star schemas (relational)', points: ['Standard relational tables + constraints', 'Automatic clustering helps big fact tables', 'No manual distribution tuning'] },
        rs: { term: 'Star + dist/sort tuning', points: ['Distribute the fact on its busiest join key', 'Replicate (ALL) small dimensions', 'Sort fact on the date for pruning'] },
        fb: { term: 'Star + semantic model', points: ['Star schema in Warehouse/Lakehouse', 'A semantic model adds measures & relationships', 'Direct Lake serves it straight to Power BI'] },
      },
      takeaway: 'Model analytics as a <b>star schema</b>: a central <b>fact</b> (events + measures) ringed by descriptive <b>dimensions</b> — intuitive and fast. Decide the <b>grain</b> first, use <b>SCD Type 2</b> for history. The model is identical across platforms; only the tuning (Redshift dist/sort) and BI serving (Fabric semantic model + Direct Lake) differ.',
      compare: 'cmp-ecosystem', compareLabel: 'Ecosystem & Cost',
      docs: [
        { label: 'Snowflake: Data modeling', url: 'https://docs.snowflake.com/en/user-guide/table-considerations' },
        { label: 'AWS: Choose dist & sort keys', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c_designing-tables-best-practices.html' },
        { label: 'Fabric: Dimensional modeling', url: 'https://learn.microsoft.com/en-us/fabric/data-warehouse/dimensional-modeling-overview' },
      ],
    },

    /* ─────────────────── Open formats & lakehouse ─────────────────── */
    'fund-lakehouse': {
      eyebrow: '📐 Data & Modeling',
      title: 'Open table formats & the lakehouse',
      lead: 'Classic warehouses kept data in a proprietary format only they could read. <strong>Open table formats</strong> — Apache Iceberg, Delta Lake, Hudi — put warehouse-grade tables (with transactions and schema) directly on open files in your data lake, so many engines can share <em>one copy</em>. That convergence of lake and warehouse is the <strong>lakehouse</strong>.',
      sections: [
        { h: 'From data lake to lakehouse', p:
          '<p>A <strong>data lake</strong> is cheap object storage full of files (often Parquet) — flexible but with no transactions, no reliable schema, and messy concurrent writes. A <strong>warehouse</strong> has all those guarantees but historically locked data in its own format. An <strong>open table format</strong> adds a transaction log and metadata <em>on top of</em> the lake files, giving you ACID transactions, schema evolution, and time travel — warehouse reliability on open storage. That is the lakehouse.</p>' },
        { h: 'One copy, many engines', p:
          '<p>The big payoff: because the format is open, a Spark job, a SQL warehouse, and a BI tool can all read and write the <strong>same tables</strong> without copying or exporting. No more "load it into the warehouse, then also into the lake for ML." One governed copy serves every engine — less duplication, less drift, lower cost.</p>' },
        { h: 'Querying the lake in place', p:
          '<p>Warehouses increasingly read these open tables directly, without full ingestion — great for cold/historical or externally-produced data. You trade a little query speed for avoiding a copy, and keep the option to materialize hot tables natively when you need peak performance.</p>' },
      ],
      diagramTitle: '🎬 One open table, every engine',
      stage: { caption: 'Open table format over lake files → shared by all engines',
        groups: [
          { id: 'lake', label: 'Data lake (open files)', sub: 'Parquet in object storage', nodes: [ { id: 'files', label: 'Columnar data files' } ], connectorAfter: 'add a transaction log + metadata' },
          { id: 'fmt', label: 'Open table format', sub: 'Iceberg · Delta · Hudi', nodes: [ { id: 'txn', label: 'ACID · schema · time travel' } ], connectorAfter: 'one copy, read & written by…' },
          { id: 'engines', label: 'Many engines, same table', nodes: [
            { id: 'spark', label: 'Spark (ETL/ML)' }, { id: 'sql', label: 'SQL warehouse' }, { id: 'bi', label: 'BI / Power BI' } ] },
        ] },
      steps: [
        { label: 'Lake', title: 'Cheap files, no guarantees', on: { spot: ['lake'], flow: ['files'] },
          body: 'A data lake stores lots of open Parquet files cheaply — but with no transactions, unreliable schema, and messy concurrent writes. Flexible, not trustworthy.',
          facts: ['Open files, cheap storage', 'No ACID, no reliable schema', 'Hard to update safely'] },
        { label: 'Add a log', title: 'An open format adds reliability', on: { spot: ['fmt'], flow: ['txn'], conn: ['lake'] },
          body: 'Iceberg/Delta/Hudi layer a transaction log and metadata over the files — bringing ACID transactions, schema evolution, and time travel to the lake.',
          facts: ['Transaction log over the files', 'ACID + schema evolution', 'Time travel to past versions'] },
        { label: 'Share', title: 'Every engine reads one copy', on: { spot: ['engines'], flow: ['spark', 'sql', 'bi'], conn: ['fmt'] },
          body: 'Because the format is open, Spark, the SQL warehouse, and BI all use the <strong>same</strong> tables — no exports, no duplicate copies drifting apart.',
          facts: ['One governed copy for all', 'No copy/export between tools', 'Less duplication & drift'] },
        { label: 'Lakehouse', title: 'Warehouse reliability on open storage', on: { spot: ['fmt', 'engines'], flow: ['txn', 'sql', 'bi'], conn: ['fmt'] },
          body: 'That combination — lake openness + warehouse guarantees — is the lakehouse. Query in place for cold data; materialize natively when you need peak speed.',
          facts: ['Lake + warehouse convergence', 'Query in place or materialize', 'Open, governed, cost-efficient'] },
      ],
      map: {
        intro: 'All three embrace open formats, but from different starting points — bolt-on for the warehouses, native for Fabric.',
        sf: { term: 'Iceberg + external tables', points: ['Native Apache Iceberg tables (read & write)', 'External tables over S3/Azure/GCS files', 'Use open storage or Snowflake-managed'] },
        rs: { term: 'Spectrum / lake queries', points: ['Spectrum queries S3 (incl. open formats) in place', 'External schemas via the Glue Data Catalog', 'Billed per TB scanned in the lake'] },
        fb: { term: 'Lakehouse + Direct Lake', points: ['OneLake is Delta-native — lakehouse by default', 'One open Delta copy for Spark, SQL & BI', 'Direct Lake serves Delta to Power BI, no import'] },
      },
      takeaway: 'Open table formats (<b>Iceberg / Delta / Hudi</b>) give lake files warehouse guarantees — ACID, schema, time travel — so <b>one open copy</b> serves every engine. That\'s the lakehouse. Snowflake adds it via <b>Iceberg</b>, Redshift reads the lake via <b>Spectrum</b>, and Fabric is <b>Delta-native</b> with Direct Lake.',
      compare: 'cmp-query-lake', compareLabel: 'Querying the Lake',
      docs: [
        { label: 'Snowflake: Iceberg tables', url: 'https://docs.snowflake.com/en/user-guide/tables-iceberg' },
        { label: 'AWS: Redshift Spectrum', url: 'https://docs.aws.amazon.com/redshift/latest/dg/c-using-spectrum.html' },
        { label: 'Fabric: Lakehouse overview', url: 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-overview' },
      ],
    },

  });
})();
