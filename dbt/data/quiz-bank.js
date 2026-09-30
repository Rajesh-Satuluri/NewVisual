// Per-module multiple-choice questions for the auto-injected "Test Yourself"
// section and the Study Hub review deck. answer = index of the correct option.
export const QUIZ_BANK = {
  m01: [
    {
      q: 'Six teams each write their own SQL against the same raw tables. What is the core problem this creates?',
      options: ['The warehouse runs out of storage', 'The same business logic is defined many times, inconsistently', 'Queries run too slowly', 'Raw data gets deleted'],
      answer: 1,
      explanation: 'Duplicated, divergent logic means every team computes metrics slightly differently — the root of "three teams, three revenue numbers".',
    },
    {
      q: 'What is the healthiest first step out of raw-SQL chaos?',
      options: ['Give everyone admin on the warehouse', 'Define shared, tested transformation models as a single source of truth', 'Ban SQL and use a BI tool only', 'Copy the data into spreadsheets'],
      answer: 1,
      explanation: 'A shared modeling layer (what dbt provides) turns scattered scripts into one reviewed, tested definition each team builds on.',
    },
  ],
  m02: [
    {
      q: 'Three teams report three different revenue numbers. The most common cause is:',
      options: ['The warehouse is corrupt', 'Different filters/joins/definitions of "revenue" baked into separate queries', 'Network latency', 'One team is lying'],
      answer: 1,
      explanation: 'Without a shared model, "revenue" means whatever each query author decided — different date grains, refund handling, or currency logic.',
    },
    {
      q: 'A single dbt model for revenue fixes disagreement because:',
      options: ['It runs faster', 'Every consumer references the same tested definition via ref()', 'It hides the data from teams', 'It uses more compute'],
      answer: 1,
      explanation: 'One canonical model referenced everywhere means one definition — change it once and every downstream number stays consistent.',
    },
  ],
  m03: [
    {
      q: 'The same 40-line revenue CTE is pasted into 12 dashboards. What does dbt replace it with?',
      options: ['A stored procedure', 'A model referenced with ref(), or a macro for the shared snippet', 'A spreadsheet macro', 'A materialized view only'],
      answer: 1,
      explanation: 'Reusable models (ref) and macros mean the logic lives once; the 12 consumers reference it instead of copying it.',
    },
  ],
  m04: [
    {
      q: 'Renaming one column silently breaks five downstream dashboards. How does dbt catch this before production?',
      options: ['It emails everyone', 'Lineage/DAG + tests reveal and validate downstream dependencies', 'It locks the column', 'It cannot — dbt has no way'],
      answer: 1,
      explanation: 'The DAG makes downstream dependencies explicit and tests (and model contracts) fail the build when a change breaks them.',
    },
  ],
  m05: [
    {
      q: 'What most helps a new engineer understand a dbt project on day one?',
      options: ['A 200-page Word doc', 'Consistent naming, schema.yml descriptions, tests, and generated docs/lineage', 'Admin access', 'A faster laptop'],
      answer: 1,
      explanation: 'Discoverability (naming + docs + lineage) plus correctness signals (tests) let a newcomer answer "what is this?" and "can I trust it?".',
    },
    {
      q: 'How do dbt docs differ from SQL comments?',
      options: ['They are identical', 'dbt docs are compiled into a searchable, rendered catalog with lineage', 'SQL comments are searchable, docs are not', 'Docs only work in Excel'],
      answer: 1,
      explanation: 'schema.yml + `dbt docs generate` produce a living, queryable catalog; SQL comments are static text that rots inside files.',
    },
  ],
  m06: [
    {
      q: 'The CEO asks one question and gets three answers. In dbt terms, the fix is:',
      options: ['More meetings', 'A single certified mart model everyone queries', 'Three separate warehouses', 'Turning off dashboards'],
      answer: 1,
      explanation: 'A trusted, tested mart as the one source of truth ends metric drift — everyone reads the same number.',
    },
  ],
  m07: [
    {
      q: 'In classic ETL, where does transformation happen?',
      options: ['Inside the warehouse', 'On a separate ETL server before loading', 'In the BI tool', 'It does not happen'],
      answer: 1,
      explanation: 'ETL = Extract, Transform (on a dedicated tier), then Load — because storage/compute were expensive and coupled.',
    },
  ],
  m08: [
    {
      q: 'What made ELT overtake ETL?',
      options: ['SQL was invented', 'Cloud warehouses decoupled storage from compute, making in-warehouse transforms cheap and elastic', 'ETL tools were banned', 'Data got smaller'],
      answer: 1,
      explanation: 'Snowflake/BigQuery/Redshift made it cheaper to load raw and transform in-place than to run a separate ETL tier.',
    },
    {
      q: 'Where does dbt sit in ELT?',
      options: ['The Extract', 'The Load', 'The Transform', 'All three'],
      answer: 2,
      explanation: 'dbt is only the "T" — loaders like Fivetran/Airbyte handle E and L; dbt transforms the loaded raw data.',
    },
  ],
  m09: [
    {
      q: 'Which best describes what dbt is?',
      options: ['A data warehouse', 'A BI dashboard tool', 'A transformation framework: SQL + Jinja + tests + docs + a DAG', 'A Python ORM'],
      answer: 2,
      explanation: 'dbt brings software-engineering discipline (version control, tests, docs, dependency management) to warehouse SQL.',
    },
  ],
  m10: [
    {
      q: 'A dbt model is fundamentally:',
      options: ['A stored procedure', 'A SELECT statement dbt materializes as a table or view', 'A Python class', 'A dashboard'],
      answer: 1,
      explanation: 'One model = one `.sql` file with a SELECT; dbt wraps it in CREATE TABLE/VIEW AS and builds it in dependency order.',
    },
    {
      q: 'What does ref() do?',
      options: ['Runs a shell command', 'References another model and builds the dependency DAG', 'Refreshes the browser', 'Deletes a table'],
      answer: 1,
      explanation: 'ref() both resolves the correct schema-qualified name per environment and records the edge in the DAG.',
    },
  ],
  m11: [
    {
      q: 'Which are built-in generic dbt tests?',
      options: ['loop, map, filter', 'unique, not_null, accepted_values, relationships', 'select, insert, update', 'red, green, refactor'],
      answer: 1,
      explanation: 'Those four generic tests are declared in YAML; you can also write singular tests as SELECTs that must return zero rows.',
    },
    {
      q: 'A singular (custom) test passes when it:',
      options: ['Returns any rows', 'Returns zero rows', 'Throws an error', 'Runs under 1 second'],
      answer: 1,
      explanation: 'A singular test is a query for "bad" rows — zero rows returned means the assertion holds.',
    },
  ],
  m12: [
    {
      q: 'What problem do dbt snapshots solve?',
      options: ['Backing up the warehouse', 'Tracking how a mutable source row changes over time (Type-2 SCD)', 'Speeding up queries', 'Compressing data'],
      answer: 1,
      explanation: 'Snapshots record history with dbt_valid_from/dbt_valid_to so you can see a row\'s past states even after the source overwrites it.',
    },
  ],
  m13: [
    {
      q: 'An incremental model is worth using when:',
      options: ['The table is tiny', 'The table is large and mostly append-only, so full rebuilds are wasteful', 'You never query it', 'You want a view'],
      answer: 1,
      explanation: 'Incremental processing only new/changed rows saves compute on big tables; guard the new-rows logic with is_incremental().',
    },
    {
      q: 'What does is_incremental() control?',
      options: ['Whether the model is a view', 'The block of SQL that filters to only new rows on incremental runs', 'The warehouse region', 'Test severity'],
      answer: 1,
      explanation: 'On a full refresh it is false (build everything); on incremental runs it is true, so the filter limits work to new data.',
    },
  ],
  m14: [
    {
      q: 'A dbt macro is:',
      options: ['A keyboard shortcut', 'A reusable Jinja function that generates SQL', 'A test type', 'A materialization'],
      answer: 1,
      explanation: 'Macros let you write SQL-generating logic once (e.g. cents_to_dollars) and call it across many models — DRY SQL.',
    },
  ],
  m15: [
    {
      q: 'dbt builds its DAG from:',
      options: ['File timestamps', 'Every ref() and source() call', 'Alphabetical order', 'A manual config list'],
      answer: 1,
      explanation: 'Each ref()/source() is an edge; the resulting DAG determines run order and powers lineage visualization.',
    },
    {
      q: 'Why does lineage matter before shipping a change?',
      options: ['It looks nice', 'It shows every downstream model/dashboard the change could break', 'It speeds up compilation', 'It reduces storage'],
      answer: 1,
      explanation: 'Seeing downstream dependencies lets you assess blast radius and test the right models before deploying.',
    },
  ],
  m16: [
    {
      q: 'Which task is dbt the WRONG tool for?',
      options: ['Transforming loaded warehouse data with SQL', 'Real-time sub-second streaming transformations', 'Building tested marts', 'Documenting model lineage'],
      answer: 1,
      explanation: 'dbt is batch, in-warehouse SQL. Low-latency streaming (Flink/Kafka Streams) and the E/L steps are outside its job.',
    },
  ],
};
