/*
 * PySpark Interview Lab — CDC Snapshot Diff, Versioning & Recovery (Medium/Hard)
 * Schema identical to data/pyspark/modern_lakehouse.js field-for-field; registers
 * into the existing "Lakehouse & Streaming" category.
 *
 * These problems cover the data-engineering layer that sits *around* a CDC/Delta
 * pipeline rather than the happy-path upsert (already covered by delta-merge-upsert
 * and the two CDC-apply problems): deriving a change set by diffing two full
 * snapshots, attributing which columns changed between two versions, replaying an
 * append-only log into current state with field-level last-write-wins, correcting
 * an SCD Type 2 timeline when history arrives late, recovering a failed batch from
 * a processing ledger, and designing exactly-once recovery for a failed Structured
 * Streaming micro-batch. Every DataFrame-level solution here was executed on Spark
 * 3.5.3 against the sample data shown before being authored.
 */
(function () {
  var CAT = "Lakehouse & Streaming";
  window.PYSPARK.register(CAT, [

    // ------------------------------------------------------------------ Q310
    {
      id: "snapshot-diff-classify-iud",
      lc: 310,
      title: "Compare source and target snapshots and classify inserts, updates, deletes",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Snapshot diff -> derive I/U/D change set", transformation: "Wide (full outer join)", functions: "join(full_outer), eqNullSafe, when/otherwise, coalesce" },
      description:
        "You get a fresh full <b>source</b> snapshot and the current <b>target</b> snapshot of the same entity (key <code>id</code>), and must derive the change set: label each key <b>INSERT</b> (in source, not target), <b>DELETE</b> (in target, not source), <b>UPDATE</b> (in both, some non-key column differs) or <b>UNCHANGED</b>. Do it with a single <code>full_outer</code> join and a null-safe column comparison &mdash; this is how you synthesize a CDC feed when the upstream only hands you daily dumps, not a change log.",
      examples: [
        {
          input: "target = (1,NYC),(2,LA),(3,SF).  source = (1,NYC),(2,BOS),(4,SEA).",
          output: "1 -> UNCHANGED, 2 -> UPDATE (LA->BOS), 3 -> DELETE (gone from source), 4 -> INSERT (new in source).",
          reasoning: "Full outer join aligns keys from both sides. Key 3 has no source row (DELETE), key 4 has no target row (INSERT), key 2 exists on both but city differs (UPDATE), key 1 matches on every column (UNCHANGED)."
        }
      ],
      approaches: [
        {
          name: "full_outer join, then classify by key-presence and a null-safe column diff",
          whenToUse: "Upstream gives you full snapshots (daily dumps) instead of a change log and you must reconstruct what changed before applying a MERGE.",
          logic:
            "**What it asks.** Turn 'here is the whole table today vs the whole table yesterday' into a per-key verdict: inserted, updated, deleted, or unchanged.\n\n" +
            "**Key Idea.** A `full_outer` join on the key lines up every key that is in either snapshot. Then presence tells you three of the four cases and a value comparison tells you the fourth: target key missing -> INSERT; source key missing -> DELETE; both present and any tracked column differs -> UPDATE; otherwise UNCHANGED. Compare columns with `eqNullSafe` (`<=>`) so a column that is null on both sides counts as equal and null-vs-value counts as changed &mdash; plain `!=` returns null on a null operand and silently drops the row from UPDATE.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Alias the sides: `src.alias('s')`, `tgt.alias('t')`; join `on 'id', how='full_outer'`.\n" +
            "2. Build the changed predicate across non-key columns: OR of `~col('s.c').eqNullSafe(col('t.c'))`.\n" +
            "3. `when(t.id is null)` -> INSERT; `when(s.id is null)` -> DELETE; `when(changed)` -> UPDATE; else UNCHANGED.\n" +
            "4. Project `coalesce(s.id, t.id)` as the key plus the verdict (and the source columns for the downstream upsert).\n" +
            "5. Feed INSERT/UPDATE rows to `whenNotMatchedInsert`/`whenMatchedUpdate` and DELETE rows to `whenMatchedDelete`.\n\n" +
            "**Why it works.** The outer join is the only operation that preserves keys that exist on exactly one side, which is precisely what distinguishes an insert from a delete. The null-safe comparison makes the UPDATE test total (defined for every row) so no changed row is lost to null propagation.\n\n" +
            "**Common Gotchas.**\n" +
            "- Using `!=`/`=!=` instead of `eqNullSafe` drops rows where a column flips to/from null (the comparison yields null, not true).\n" +
            "- Comparing on `concat_ws` of all columns is a quick shortcut but collides when a delimiter appears in data and hides which column changed &mdash; prefer an explicit OR, or a row hash.\n" +
            "- For wide tables, hashing the tracked columns (`xxhash64`/`sha2(concat_ws(...))`) and comparing hashes is cheaper than many per-column comparisons.\n" +
            "- Decide whether UNCHANGED rows should be emitted at all; usually you filter them out so the MERGE rewrites fewer files.\n\n" +
            "**Interview mindset.** 'Full outer join on the key; presence gives insert vs delete, a null-safe column diff gives update vs unchanged. For wide tables compare a row hash instead of every column.'",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "cols = [c for c in src.columns if c != 'id']        # tracked (non-key) columns\n" +
            "j = src.alias('s').join(tgt.alias('t'), 'id', 'full_outer')\n" +
            "\n" +
            "# null-safe 'any tracked column differs'\n" +
            "changed = F.lit(False)\n" +
            "for c in cols:\n" +
            "    changed = changed | (~F.col('s.' + c).eqNullSafe(F.col('t.' + c)))\n" +
            "\n" +
            "classified = (j\n" +
            "    .withColumn('change_type',\n" +
            "        F.when(F.col('t.id').isNull(), F.lit('INSERT'))       # only in source\n" +
            "         .when(F.col('s.id').isNull(), F.lit('DELETE'))       # only in target\n" +
            "         .when(changed, F.lit('UPDATE'))                      # both, differs\n" +
            "         .otherwise(F.lit('UNCHANGED')))\n" +
            "    .select(F.coalesce('s.id', 't.id').alias('id'), 'change_type'))\n" +
            "\n" +
            "# usually drop UNCHANGED so the downstream MERGE rewrites fewer files\n" +
            "change_set = classified.filter(F.col('change_type') != 'UNCHANGED')",
          plain:
            "from pyspark.sql import functions as F\n" +
            "cols = [c for c in src.columns if c != 'id']\n" +
            "j = src.alias('s').join(tgt.alias('t'), 'id', 'full_outer')\n" +
            "changed = F.lit(False)\n" +
            "for c in cols:\n" +
            "    changed = changed | (~F.col('s.'+c).eqNullSafe(F.col('t.'+c)))\n" +
            "out = j.select(F.coalesce('s.id','t.id').alias('id'),\n" +
            "    F.when(F.col('t.id').isNull(),'INSERT')\n" +
            "     .when(F.col('s.id').isNull(),'DELETE')\n" +
            "     .when(changed,'UPDATE').otherwise('UNCHANGED').alias('change_type'))"
        }
      ],
      sparkInternals:
        "The <code>full_outer</code> join is a <b>wide</b> transformation: both snapshots are shuffled by the join key (a SortMergeJoin unless one side is small enough to broadcast), so cost scales with the total rows across both sides, not the number of changes. The per-column <code>eqNullSafe</code> chain and the <code>when/otherwise</code> ladder are narrow, pipelined projections on the joined rows &mdash; negligible next to the shuffle. For very wide tables, replacing the N column comparisons with a single <code>xxhash64(concat_ws(...))</code> computed on each side before the join lets Catalyst compare one 64-bit column and keeps the shuffle payload small. If one snapshot is tiny (a late-arriving delta), broadcasting it turns the whole diff into a narrow map-side job.",
      sparkSql:
        "SELECT COALESCE(s.id, t.id) AS id,\n" +
        "       CASE WHEN t.id IS NULL THEN 'INSERT'\n" +
        "            WHEN s.id IS NULL THEN 'DELETE'\n" +
        "            WHEN NOT (s.city <=> t.city) THEN 'UPDATE'\n" +
        "            ELSE 'UNCHANGED' END AS change_type\n" +
        "FROM source s FULL OUTER JOIN target t ON s.id = t.id;",
      recognizeRecall: [
        "**Spot it:** 'daily full dump', 'no change log, reconstruct what changed', 'classify insert/update/delete'.",
        "**Say it:** full_outer join on key; presence -> insert/delete; null-safe column diff -> update/unchanged.",
        "**Trap:** use `eqNullSafe` not `!=` (null propagation drops updates); hash wide rows instead of comparing every column.",
        "**Follow-up:** How would you emit this as a real CDC feed with an `op` column to feed a Delta MERGE? (Map INSERT/UPDATE->upsert, DELETE->matched-delete.)",
        "**Follow-up:** The table has 500 columns &mdash; how do you keep the diff cheap? (Compare a row hash; shuffle one column, not 500.)"
      ]
    },

    // ------------------------------------------------------------------ Q311
    {
      id: "detect-changed-columns-versions",
      lc: 311,
      title: "Detect exactly which columns changed between two record versions",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Column-level change attribution", transformation: "Wide (join) + array build", functions: "join, eqNullSafe, array, when, array_compact" },
      description:
        "Given an <b>old</b> and a <b>new</b> version of each record (key <code>id</code>, several attribute columns), produce for each key the <b>list of column names that changed</b> &mdash; not just that the row changed, but which fields. This drives audit logs, change notifications, and column-level CDC. Build the list generically so it works for any set of columns, using a null-safe comparison per column.",
      examples: [
        {
          input: "old = (1,A,10,x),(2,B,20,y).  new = (1,A,99,z),(2,B,20,y).  columns: name, amount, note.",
          output: "id 1 -> [amount, note] ; id 2 -> [] (nothing changed).",
          reasoning: "For id 1, name is unchanged (A=A) but amount (10->99) and note (x->z) differ, so both names are collected. For id 2 every column matches, so the changed-list is empty."
        }
      ],
      approaches: [
        {
          name: "build an array of column names where new <=> old is false, then compact out the nulls",
          whenToUse: "Audit trails, 'what changed' notifications, or column-level CDC where downstream consumers only react to specific fields changing.",
          logic:
            "**What it asks.** For each matched key, return the exact set of columns whose value differs between the two versions.\n\n" +
            "**Key Idea.** Join old to new on the key, then for each tracked column emit `when(new.c <=> old.c is false, lit('c'))` &mdash; a column that produces the column's *name* when it changed and `null` when it didn't. Wrap those in `F.array(...)` and drop the nulls with `array_compact` (Spark 3.4+); the survivors are exactly the changed column names. The comparison is `eqNullSafe` so a value appearing or disappearing (value<->null) counts as a change.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `new.alias('n').join(old.alias('o'), 'id', 'inner')` (inner = keys present in both; handle insert/delete separately if needed).\n" +
            "2. For each column `c` build `F.when(~F.col('n.'+c).eqNullSafe(F.col('o.'+c)), F.lit(c))`.\n" +
            "3. Combine with `F.array(*those)`.\n" +
            "4. `F.array_compact(...)` to remove the nulls (unchanged columns).\n" +
            "5. Keep `id` + the `changed_cols` array; optionally `size(changed_cols) > 0` to keep only true changes.\n\n" +
            "**Why it works.** Each `when` is a tiny per-column probe that leaves a breadcrumb (the name) only on change; `array` gathers the breadcrumbs positionally and `array_compact` collapses the gaps, so the result is a clean, order-stable list of exactly the changed fields.\n\n" +
            "**Common Gotchas.**\n" +
            "- On Spark < 3.4 without `array_compact`, use `F.filter(arr, lambda x: x.isNotNull())` instead.\n" +
            "- Plain `!=` leaves changed-to/from-null columns out; use `eqNullSafe`.\n" +
            "- An `inner` join silently ignores keys that were inserted or deleted &mdash; combine with the snapshot-diff classifier (Q310) if you need those too.\n" +
            "- Column order in the array follows the loop order; sort it if consumers expect a canonical order.\n\n" +
            "**Interview mindset.** 'Per column, emit its name when new <=> old is false, array them, compact out the nulls. Null-safe so appearances/disappearances count.'",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "cols = [c for c in old.columns if c != 'id']\n" +
            "j = new.alias('n').join(old.alias('o'), 'id', 'inner')\n" +
            "\n" +
            "# one breadcrumb per column: its name when changed, else null\n" +
            "marks = [F.when(~F.col('n.' + c).eqNullSafe(F.col('o.' + c)), F.lit(c))\n" +
            "         for c in cols]\n" +
            "\n" +
            "diff = j.select('id', F.array_compact(F.array(*marks)).alias('changed_cols'))\n" +
            "# only rows that actually changed\n" +
            "changed_rows = diff.filter(F.size('changed_cols') > 0)",
          plain:
            "from pyspark.sql import functions as F\n" +
            "cols = [c for c in old.columns if c != 'id']\n" +
            "j = new.alias('n').join(old.alias('o'), 'id', 'inner')\n" +
            "marks = [F.when(~F.col('n.'+c).eqNullSafe(F.col('o.'+c)), F.lit(c)) for c in cols]\n" +
            "diff = j.select('id', F.array_compact(F.array(*marks)).alias('changed_cols'))"
        }
      ],
      sparkInternals:
        "The join is the only wide step (shuffle by key, or a broadcast if one version is small). The column-change detection is a single narrow projection: Catalyst folds the N `when` branches, the `array`, and `array_compact` into one pipelined `Project` operator evaluated per row with no extra pass over the data. Because it is one projection, adding more columns grows the expression linearly but adds no shuffles or stages. Emitting a <code>map</code> of changed-column -> (old,new) via `map_filter` is the same cost and often more useful downstream than a bare name list.",
      sparkSql:
        "-- null-safe per column, then collect the names that changed\n" +
        "SELECT id,\n" +
        "  array_compact(array(\n" +
        "    CASE WHEN NOT (n.name   <=> o.name)   THEN 'name'   END,\n" +
        "    CASE WHEN NOT (n.amount <=> o.amount) THEN 'amount' END,\n" +
        "    CASE WHEN NOT (n.note   <=> o.note)   THEN 'note'   END)) AS changed_cols\n" +
        "FROM new n JOIN old o USING (id);",
      recognizeRecall: [
        "**Spot it:** 'which columns changed', 'field-level audit', 'notify only when X changed'.",
        "**Say it:** per column emit its name when `new <=> old` is false; array + array_compact.",
        "**Trap:** eqNullSafe (value<->null counts); array_compact needs Spark 3.4+ (else filter(isNotNull)).",
        "**Follow-up:** Return a map of column -> {old, new} instead of names. (array of structs + map_from_entries, or map_filter.)",
        "**Follow-up:** How does this extend to inserts/deletes? (Outer join + the Q310 classifier; changed-cols only applies to matched keys.)"
      ]
    },

    // ------------------------------------------------------------------ Q312
    {
      id: "reconstruct-state-append-log",
      lc: 312,
      title: "Reconstruct current entity state from an append-only change log",
      difficulty: "Medium",
      category: CAT,
      meta: { pattern: "Event-sourcing replay, field-level last-write-wins", transformation: "Wide (window + pivot)", functions: "Window, row_number, pivot, first" },
      description:
        "An append-only log records partial field updates as <code>(entity_id, attribute, value, seq)</code> &mdash; each event sets <b>one attribute</b> of an entity at a monotonically increasing <code>seq</code>. Reconstruct each entity's <b>current state</b> by applying <b>field-level last-write-wins</b>: for every (entity, attribute) keep the value from the highest <code>seq</code>, then pivot attributes back into columns. This differs from 'latest row per key' &mdash; different fields can have their newest value at different events.",
      examples: [
        {
          input: "log: (1,city,NYC,1),(1,city,LA,3),(1,plan,free,2),(1,plan,pro,5),(2,city,SF,1).",
          output: "entity 1 -> city=LA, plan=pro ; entity 2 -> city=SF, plan=null.",
          reasoning: "Per (entity, attribute) the newest seq wins: city for 1 is LA (seq 3 beats 1), plan for 1 is pro (seq 5 beats 2); entity 2 only ever set city, so plan is null. A naive 'latest row per entity' would wrongly pick a single event and lose the other field's history."
        }
      ],
      approaches: [
        {
          name: "row_number() per (entity, attribute) by seq desc, keep rn==1, then pivot",
          whenToUse: "Event-sourced / EAV logs, Kafka compacted topics, or any 'current view over an immutable log' where updates are per-field, not per-row.",
          logic:
            "**What it asks.** Fold an immutable stream of single-field edits into the latest full row per entity, respecting that each field's newest value may come from a different event.\n\n" +
            "**Key Idea.** The grain of 'latest' is <b>(entity, attribute)</b>, not entity. Rank events within each (entity, attribute) by `seq desc` and keep rank 1 &mdash; that is the current value of that field. Then `pivot` the surviving (entity, attribute, value) rows so each attribute becomes a column, giving the reconstructed entity row. Fields never written stay null.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `w = Window.partitionBy('entity_id','attribute').orderBy(col('seq').desc())`.\n" +
            "2. `latest = log.withColumn('rn', row_number().over(w)).filter(col('rn')==1)`.\n" +
            "3. `state = latest.groupBy('entity_id').pivot('attribute').agg(first('value'))`.\n" +
            "4. (Optional) coalesce types / cast columns if values were stored as strings.\n\n" +
            "**Why it works.** Partitioning by (entity, attribute) isolates each field's history, so `row_number` desc picks that field's most recent event independently of other fields. The pivot is a group-by that rebuilds the wide row from the per-field winners &mdash; a correct materialized view of an append-only log.\n\n" +
            "**Common Gotchas.**\n" +
            "- Partitioning by `entity_id` only (the 'latest row' reflex) collapses all fields to one event and loses the others &mdash; the classic bug this problem tests.\n" +
            "- If `seq` can tie, add a deterministic tiebreaker (e.g. an ingestion id) to `orderBy` or the winner is non-deterministic.\n" +
            "- A delete event (a tombstone attribute/op) must be handled explicitly &mdash; filter those entities/fields out after ranking.\n" +
            "- `pivot` without an explicit value list triggers a planning pass to discover attributes; pass `pivot('attribute', known_list)` in production to avoid it.\n\n" +
            "**Interview mindset.** 'Latest-write-wins at the (entity, field) grain: row_number over (entity, attribute) by seq desc, keep rn 1, pivot back to columns. Partitioning by entity alone is the trap.'",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "# newest event PER FIELD (not per entity)\n" +
            "w = Window.partitionBy('entity_id', 'attribute').orderBy(F.col('seq').desc())\n" +
            "latest = (log\n" +
            "    .withColumn('rn', F.row_number().over(w))\n" +
            "    .filter(F.col('rn') == 1)\n" +
            "    .drop('rn', 'seq'))\n" +
            "\n" +
            "# pivot attributes back into columns -> reconstructed current state\n" +
            "state = (latest\n" +
            "    .groupBy('entity_id')\n" +
            "    .pivot('attribute')            # pass a known list in prod: pivot('attribute', ['city','plan'])\n" +
            "    .agg(F.first('value')))",
          plain:
            "from pyspark.sql import Window, functions as F\n" +
            "w = Window.partitionBy('entity_id','attribute').orderBy(F.col('seq').desc())\n" +
            "latest = log.withColumn('rn', F.row_number().over(w)).filter(F.col('rn')==1)\n" +
            "state = latest.groupBy('entity_id').pivot('attribute').agg(F.first('value'))"
        }
      ],
      sparkInternals:
        "Two wide stages. The windowed `row_number` shuffles the log by (entity_id, attribute) and sorts each partition by `seq` desc; keeping rn==1 is a narrow filter afterward. The `pivot` is a second aggregation: without an explicit value list Spark runs an extra job to collect the distinct attribute values before it can shape the output columns, so supplying `pivot('attribute', [...])` removes that planning pass. Because the log is append-only and immutable, this view is fully recomputable and idempotent &mdash; the same input always yields the same state, which is what makes event-sourcing replayable. For incremental maintenance you would instead keep the running state in a Delta table and MERGE each new batch of events rather than replay the whole log.",
      sparkSql:
        "WITH ranked AS (\n" +
        "  SELECT entity_id, attribute, value,\n" +
        "         ROW_NUMBER() OVER (PARTITION BY entity_id, attribute ORDER BY seq DESC) rn\n" +
        "  FROM change_log)\n" +
        "SELECT * FROM (SELECT entity_id, attribute, value FROM ranked WHERE rn = 1)\n" +
        "PIVOT (first(value) FOR attribute IN ('city', 'plan'));",
      recognizeRecall: [
        "**Spot it:** 'append-only log', 'event sourcing', 'EAV', 'rebuild current state', 'compacted topic'.",
        "**Say it:** row_number over (entity, attribute) by seq desc, keep rn 1, pivot to columns.",
        "**Trap:** partition by (entity, attribute) NOT entity alone; pass pivot's value list in prod; handle tombstones.",
        "**Follow-up:** Maintain this incrementally instead of full replay. (Keep state in Delta, MERGE each new batch by entity_id.)",
        "**Follow-up:** How is this different from 'latest record per customer by timestamp'? (That is row-grain LWW; this is field-grain, so fields can come from different events.)"
      ]
    },

    // ------------------------------------------------------------------ Q313
    {
      id: "scd2-late-arriving-history",
      lc: 313,
      title: "Implement SCD Type 2 when historical changes arrive late",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "SCD2 timeline rebuild for late-arriving data", transformation: "Wide (window) + Delta overwrite", functions: "Window, lead, date_sub, is_current, union" },
      description:
        "You maintain an SCD Type 2 dimension (<code>id</code>, attribute, <code>effective_date</code>, <code>end_date</code>, <code>is_current</code>). A correction arrives <b>late</b> &mdash; a record whose <code>effective_date</code> falls <i>between</i> existing versions &mdash; so you cannot just expire the current row and append. Rebuild the affected entity's timeline so the late version slots into its correct historical position and the surrounding <code>end_date</code>/<code>is_current</code> values are recomputed.",
      examples: [
        {
          input: "existing id 1: (free, eff 2021-01-01, cur), (pro, eff 2022-01-01, cur). late: (trial, eff 2021-06-01).",
          output: "free 2021-01-01->2021-05-31, trial 2021-06-01->2021-12-31, pro 2022-01-01->open (is_current). History re-split around the late row.",
          reasoning: "Ordering all versions by effective_date, each row's end_date is the day before the next version's effective_date; the last row stays open/current. The late 'trial' row lands between free and pro and both neighbours' end_dates adjust automatically."
        }
      ],
      approaches: [
        {
          name: "collect the entity's full version set (existing + late), reorder by effective_date, recompute end_date = lead(effective_date) - 1",
          whenToUse: "Any SCD2 dimension fed by sources that can deliver out-of-order or backdated changes (corrections, replays, multi-region lag) where a simple expire-and-append would corrupt the timeline.",
          logic:
            "**What it asks.** Insert a backdated version into an existing history and fix the validity intervals so they stay contiguous, non-overlapping, and exactly one row is current.\n\n" +
            "**Key Idea.** Don't patch individual rows &mdash; <b>rebuild the timeline</b>. For each affected entity, union the existing versions with the late one, order by `effective_date`, and derive every `end_date` from the <i>next</i> version: `end_date = date_sub(lead(effective_date) over (partition by id order by effective_date), 1)`, with the final row's `end_date = null` and `is_current = true`. This makes arrival order irrelevant &mdash; the intervals are a pure function of the effective dates.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Narrow to only the entities the late batch touches (so you rewrite the minimum).\n" +
            "2. `allv = existing_for_those_ids.unionByName(late)` (carry the tracked attribute + effective_date).\n" +
            "3. `w = Window.partitionBy('id').orderBy('effective_date')`.\n" +
            "4. `next_eff = lead('effective_date').over(w)`.\n" +
            "5. `end_date = date_sub(next_eff, 1)`; `is_current = next_eff.isNull()`.\n" +
            "6. Overwrite exactly those entities' rows in the Delta dimension (`replaceWhere id IN (...)`) with the rebuilt rows.\n\n" +
            "**Why it works.** Representing each version's validity as 'from my effective_date until the day before the next version' makes the timeline derivable from the ordered effective_dates alone. Re-deriving it after adding the late row guarantees contiguous, gapless, non-overlapping intervals and a single open/current row &mdash; properties a row-by-row expire step cannot guarantee when history is inserted in the middle.\n\n" +
            "**Common Gotchas.**\n" +
            "- The naive SCD2 (expire current + append) puts the late row at the end and marks it current &mdash; corrupting history; detect late rows (effective_date <= an existing version) and route them to the rebuild path.\n" +
            "- Two versions sharing an `effective_date` need a deterministic tiebreaker in `orderBy`, or intervals become ambiguous.\n" +
            "- Rebuild only the touched entities (`replaceWhere`), never the whole dimension, or the rewrite cost explodes.\n" +
            "- If attributes can be equal across adjacent versions, optionally collapse them (merge touching intervals) to avoid redundant history rows.\n\n" +
            "**Interview mindset.** 'Late/backdated SCD2 = rebuild the entity's timeline: union all versions, order by effective_date, end_date = lead(effective_date) - 1, last row open. Overwrite just those ids with replaceWhere.'",
          rcs:
            "from pyspark.sql import Window\n" +
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "ids = [r.id for r in late.select('id').distinct().collect()]  # only touched entities\n" +
            "current_hist = dim.filter(F.col('id').isin(ids))              # existing versions for them\n" +
            "\n" +
            "allv = (current_hist.select('id', 'plan', 'effective_date')\n" +
            "        .unionByName(late.select('id', 'plan', 'effective_date'))\n" +
            "        .withColumn('effective_date', F.to_date('effective_date')))\n" +
            "\n" +
            "w = Window.partitionBy('id').orderBy('effective_date')\n" +
            "rebuilt = (allv\n" +
            "    .withColumn('next_eff', F.lead('effective_date').over(w))\n" +
            "    .withColumn('end_date', F.date_sub(F.col('next_eff'), 1))   # day before next version\n" +
            "    .withColumn('is_current', F.col('next_eff').isNull())       # last version is open\n" +
            "    .drop('next_eff'))\n" +
            "\n" +
            "# overwrite ONLY the affected entities in the Delta dimension\n" +
            "(rebuilt.write.format('delta').mode('overwrite')\n" +
            "    .option('replaceWhere', 'id IN (' + ','.join(map(str, ids)) + ')')\n" +
            "    .saveAsTable('customers_dim'))",
          plain:
            "from pyspark.sql import Window, functions as F\n" +
            "allv = current_hist.unionByName(late).withColumn('effective_date', F.to_date('effective_date'))\n" +
            "w = Window.partitionBy('id').orderBy('effective_date')\n" +
            "rebuilt = (allv\n" +
            "    .withColumn('next_eff', F.lead('effective_date').over(w))\n" +
            "    .withColumn('end_date', F.date_sub(F.col('next_eff'), 1))\n" +
            "    .withColumn('is_current', F.col('next_eff').isNull()).drop('next_eff'))"
        }
      ],
      sparkInternals:
        "The rebuild is one <b>wide</b> window: the affected rows shuffle by `id` and sort by `effective_date`, then `lead` reads the neighbour within each partition &mdash; all narrow after the shuffle. Scoping to the touched entities keeps that shuffle tiny regardless of dimension size. The write is the expensive half: Delta is <b>copy-on-write</b>, so <code>replaceWhere 'id IN (...)'</code> rewrites only the files holding those entities (partition/data-skipping pruning decides how many) and commits one new version atomically, leaving every other entity's files untouched. Overwriting the whole table instead would rewrite every file and defeat the point. The interval formula being a pure function of effective_dates is what makes the operation idempotent &mdash; replaying the same late batch yields byte-identical history.",
      sparkSql:
        "-- rebuild the timeline for the affected ids, then Delta replaceWhere\n" +
        "SELECT id, plan, effective_date,\n" +
        "       date_sub(lead(effective_date) OVER w, 1) AS end_date,\n" +
        "       (lead(effective_date) OVER w) IS NULL   AS is_current\n" +
        "FROM all_versions\n" +
        "WINDOW w AS (PARTITION BY id ORDER BY effective_date);",
      recognizeRecall: [
        "**Spot it:** 'late-arriving', 'backdated correction', 'out-of-order history', 'SCD2 but the change is in the past'.",
        "**Say it:** rebuild timeline: union versions, order by effective_date, end_date = lead(effective_date) - 1, last row current.",
        "**Trap:** expire+append corrupts backdated history; scope rebuild + replaceWhere to touched ids only; tiebreak equal dates.",
        "**Follow-up:** How do you detect a row is 'late' vs a normal new version? (Its effective_date <= an existing version's for that id.)",
        "**Follow-up:** Why is overwrite-by-replaceWhere safe to retry? (Intervals are a pure function of effective_dates -> idempotent rewrite.)"
      ]
    },

    // ------------------------------------------------------------------ Q314
    {
      id: "recover-batch-processing-ledger",
      lc: 314,
      title: "Recover a failed incremental batch using a processing ledger",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Control-table / ledger-driven idempotent recovery", transformation: "Wide (anti-join) + Delta writes", functions: "left_anti join, filter, append to ledger" },
      description:
        "An incremental job processes input in batches (e.g. per file or per <code>batch_id</code>) and a few batches failed mid-run. Maintain a <b>processing ledger</b> (control table) recording each batch's status, and on restart <b>resume</b>: process only batches not already marked <code>SUCCESS</code>, reprocess failed ones safely, and record the outcome. This is how production pipelines get exactly-once over an orchestrator that retries.",
      examples: [
        {
          input: "incoming batches: b1,b2,b3,b4. ledger: b1=SUCCESS, b2=FAILED, b3=SUCCESS.",
          output: "to-process on restart = {b2, b4}. b1/b3 skipped (already done), b2 retried, b4 is new.",
          reasoning: "A left_anti join of incoming against the SUCCESS set yields batches still needing work: b2 (its last attempt failed, not success) and b4 (never attempted). After each batch's write commits, append a SUCCESS row so the next restart skips it."
        }
      ],
      approaches: [
        {
          name: "left_anti against the SUCCESS ledger to find work, process each, then append its status atomically",
          whenToUse: "File-/batch-incremental pipelines an orchestrator (Airflow, Databricks Jobs) can retry, where re-running must not double-write and must pick up exactly where it failed.",
          logic:
            "**What it asks.** After a partial failure, resume processing the batches that did not complete &mdash; without reprocessing the ones that did and without duplicating their output.\n\n" +
            "**Key Idea.** A durable <b>ledger</b> table is the source of truth for 'what is done'. The work set on any run is `incoming LEFT ANTI JOIN (ledger WHERE status='SUCCESS')` &mdash; everything not yet successfully processed, which naturally covers both failed and never-seen batches. Make each batch's data write and its ledger `SUCCESS` write land so that a crash between them is safe: either write the batch with `replaceWhere batch_id = ...` (so a retry overwrites the partial output rather than appending to it) or use an idempotency key, then append the ledger row. Because the data write is idempotent per batch, recording SUCCESS after it is enough.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. Read the ledger; `done = ledger.filter(status=='SUCCESS').select('batch_id')`.\n" +
            "2. `to_process = incoming.select('batch_id').distinct().join(done, 'batch_id', 'left_anti')`.\n" +
            "3. For each batch_id to process: compute its output and write with `replaceWhere batch_id = X` (idempotent overwrite of just that batch's partition).\n" +
            "4. On success, append `(batch_id, 'SUCCESS', row_count, current_timestamp())` to the ledger.\n" +
            "5. On failure, append/update `FAILED`; the next run's anti-join re-selects it.\n\n" +
            "**Why it works.** The anti-join makes the resume set a deterministic function of the ledger, so the job is restartable from any crash point. `replaceWhere` per batch makes each data write idempotent (a retry replaces, never duplicates), so recording SUCCESS afterward is the single commit that marks the batch done; a crash before it simply leaves the batch in the next work set and the overwrite cleans up its partial output.\n\n" +
            "**Common Gotchas.**\n" +
            "- Appending batch output without `replaceWhere`/a key means a retried FAILED batch double-writes its rows &mdash; the whole point is lost.\n" +
            "- Writing the ledger SUCCESS <i>before</i> the data commit lets a crash mark a batch done that produced no data; record SUCCESS last.\n" +
            "- Deriving 'done' from output row counts instead of a ledger is fragile; keep an explicit control table.\n" +
            "- Concurrent runs need the ledger write to be transactional (Delta MERGE/append) so two workers don't both claim a batch.\n\n" +
            "**Interview mindset.** 'Ledger is the source of truth. Work set = incoming left_anti SUCCESS. Make each batch write idempotent (replaceWhere/key), then append SUCCESS last so any crash is restartable.'",
          rcs:
            "from pyspark.sql import functions as F\n" +
            "\n" +
            "# 1) what is already done, per the ledger\n" +
            "done = ledger.filter(F.col('status') == 'SUCCESS').select('batch_id')\n" +
            "\n" +
            "# 2) resume set: failed + never-attempted batches\n" +
            "to_process = (incoming.select('batch_id').distinct()\n" +
            "              .join(done, 'batch_id', 'left_anti'))\n" +
            "\n" +
            "# 3) process each batch idempotently, then record SUCCESS last\n" +
            "for bid in [r.batch_id for r in to_process.collect()]:\n" +
            "    out = transform(incoming.filter(F.col('batch_id') == bid))\n" +
            "    (out.write.format('delta').mode('overwrite')\n" +
            "        .option('replaceWhere', \"batch_id = '%s'\" % bid)   # idempotent per batch\n" +
            "        .saveAsTable('fact_table'))\n" +
            "    (spark.createDataFrame([(bid, 'SUCCESS', out.count())],\n" +
            "         ['batch_id', 'status', 'row_count'])\n" +
            "        .withColumn('processed_at', F.current_timestamp())\n" +
            "        .write.format('delta').mode('append').saveAsTable('processing_ledger'))",
          plain:
            "from pyspark.sql import functions as F\n" +
            "done = ledger.filter(F.col('status') == 'SUCCESS').select('batch_id')\n" +
            "to_process = incoming.select('batch_id').distinct().join(done, 'batch_id', 'left_anti')\n" +
            "# process each to_process batch with replaceWhere, then append SUCCESS to the ledger"
        }
      ],
      sparkInternals:
        "The resume set is computed by a <b>left anti join</b> &mdash; a shuffle (or a broadcast when the ledger's SUCCESS set is small, which it usually is) that keeps only unmatched left rows. Everything else is driven in a loop on the driver, with the real cost in the per-batch Delta writes. <code>replaceWhere batch_id = X</code> relies on Delta's partition/data-skipping to rewrite only that batch's files and commit atomically, which is what makes a retry a clean overwrite instead of an append. The ledger append is a tiny transactional commit; its atomicity (one entry in <code>_delta_log</code>) is the exactly-once marker. Idempotency comes from two independent guarantees &mdash; the data write is per-batch idempotent and the ledger commit is atomic &mdash; so no crash window can both skip work and duplicate it.",
      sparkSql:
        "-- batches still needing work after a failure\n" +
        "SELECT i.batch_id\n" +
        "FROM (SELECT DISTINCT batch_id FROM incoming) i\n" +
        "LEFT ANTI JOIN (SELECT batch_id FROM processing_ledger WHERE status = 'SUCCESS') d\n" +
        "  ON i.batch_id = d.batch_id;",
      recognizeRecall: [
        "**Spot it:** 'resume after failure', 'don't reprocess done batches', 'control table', 'exactly-once over retries'.",
        "**Say it:** work set = incoming left_anti SUCCESS-ledger; idempotent per-batch write (replaceWhere/key); append SUCCESS last.",
        "**Trap:** append without replaceWhere double-writes retried batches; write SUCCESS AFTER the data commit, not before.",
        "**Follow-up:** How does this compare to Delta's txnAppId/txnVersion idempotency? (Ledger is explicit & queryable; txn options are built-in per-write dedupe &mdash; use together.)",
        "**Follow-up:** Two workers run concurrently &mdash; how do you stop both claiming b2? (Transactional MERGE claim into the ledger, or partition work by a hash range.)"
      ]
    },

    // ------------------------------------------------------------------ Q315
    {
      id: "streaming-microbatch-recovery",
      lc: 315,
      title: "Design recovery after a failed Structured Streaming micro-batch",
      difficulty: "Hard",
      category: CAT,
      meta: { pattern: "Checkpoint/offset recovery + idempotent sink", transformation: "Streaming write", functions: "readStream, writeStream, checkpointLocation, foreachBatch, merge" },
      description:
        "A Structured Streaming job crashed while writing a micro-batch. Explain and implement how it <b>recovers exactly-once</b> on restart: how the <b>checkpoint</b> (offset log + commit log) decides which batch to replay, and why the <b>sink must be idempotent</b> so a replayed batch does not duplicate rows. Implement the sink with <code>foreachBatch</code> doing an insert-if-absent / MERGE keyed by an event id.",
      examples: [
        {
          input: "Batch 7 reads offsets 100-199, writes 50 of 100 rows, then the executor dies. Job restarts.",
          output: "On restart Spark sees batch 7 in the offset log but NOT the commit log, so it replays batch 7 from offsets 100-199. An idempotent MERGE by event_id re-applies it; the 50 already-written rows match and are skipped, the other 50 insert. No duplicates.",
          reasoning: "The checkpoint records the offsets for each batch before processing and marks the batch committed only after the sink finishes. A batch present in the offset log but absent from the commit log is replayed verbatim; exactly-once then depends entirely on the sink being idempotent for that replay."
        }
      ],
      approaches: [
        {
          name: "checkpointLocation for offset/commit tracking + foreachBatch idempotent MERGE by key",
          whenToUse: "Any production stream whose sink is not natively exactly-once (arbitrary tables, upserts), where a replayed micro-batch must not duplicate output.",
          logic:
            "**What it asks.** Make a streaming job survive a mid-batch crash with no lost and no duplicated rows, and say exactly what the checkpoint and the sink each contribute.\n\n" +
            "**Key Idea.** Recovery is a two-part contract. (1) The <b>checkpoint</b> (`checkpointLocation`) holds the <i>offset log</i> (what range each batch id covers, written <b>before</b> processing) and the <i>commit log</i> (which batch ids finished, written <b>after</b> the sink). On restart Spark finds the highest batch in the offset log with no matching commit and <b>replays it from the same offsets</b> &mdash; deterministic, same data. (2) Because a batch can be replayed, the <b>sink must be idempotent</b>: a replay must be a no-op for rows already written. `foreachBatch` lets you make any sink idempotent by doing a MERGE keyed by a stable event id (`whenNotMatchedInsert`), or dedupe-insert, inside each batch. Spark also passes `foreachBatch` the `batchId`, which you can store to reject stale replays.\n\n" +
            "**Step-by-Step Approach.**\n" +
            "1. `readStream` the source (Kafka/Delta/files) &mdash; sources that expose replayable offsets.\n" +
            "2. Set `option('checkpointLocation', path)` &mdash; this is what makes recovery possible; never share one across queries.\n" +
            "3. Use `foreachBatch(fn)`; inside, treat the micro-batch `df` as a normal batch DataFrame.\n" +
            "4. In `fn`, MERGE into the target on a stable key with `whenNotMatchedInsertAll()` (or `whenMatchedUpdateAll` for upserts) so a replay re-applies without duplicating.\n" +
            "5. Let the write commit; Spark then records the batch in the commit log. A crash before that -> replay; after that -> skip.\n\n" +
            "**Why it works.** Offsets are logged before work and commits after, so the crash window is always 'processed-but-not-committed', which Spark resolves by replaying from the exact same offsets. The replay is only safe because the sink's MERGE-by-key makes re-applying the identical batch idempotent &mdash; together they yield effective exactly-once even though delivery is at-least-once.\n\n" +
            "**Common Gotchas.**\n" +
            "- A non-idempotent sink (plain `append`) duplicates the replayed batch &mdash; checkpointing alone is not exactly-once.\n" +
            "- Deleting or sharing the `checkpointLocation` loses offset state and forces reprocessing or data loss; one checkpoint per query.\n" +
            "- The dedupe key must be a <b>stable</b> business/event id, not a generated/arrival value that changes on replay.\n" +
            "- A non-replayable source (e.g. a socket) cannot give back the same offsets &mdash; recovery needs a durable source like Kafka or Delta.\n" +
            "- Changing the query's logic can invalidate the checkpoint; plan for versioned checkpoints.\n\n" +
            "**Interview mindset.** 'Checkpoint = offset log (pre) + commit log (post); a batch logged but not committed is replayed from the same offsets. Replay-safe only if the sink is idempotent &mdash; foreachBatch + MERGE by a stable event id.'",
          rcs:
            "from delta.tables import DeltaTable\n" +
            "\n" +
            "def upsert_batch(micro_df, batch_id):\n" +
            "    # idempotent sink: a replayed batch matches existing keys and is skipped\n" +
            "    tgt = DeltaTable.forName(spark, 'events_target')\n" +
            "    (tgt.alias('t')\n" +
            "        .merge(micro_df.dropDuplicates(['event_id']).alias('s'),\n" +
            "               't.event_id = s.event_id')\n" +
            "        .whenNotMatchedInsertAll()      # replay -> already present -> no-op\n" +
            "        .execute())\n" +
            "\n" +
            "(spark.readStream.format('kafka')              # replayable, offset-based source\n" +
            "    .option('subscribe', 'events').load()\n" +
            "    .selectExpr(\"CAST(value AS STRING) AS json\")\n" +
            "    # ... parse to columns incl. a STABLE event_id ...\n" +
            "    .writeStream\n" +
            "    .option('checkpointLocation', '/chk/events')  # offset + commit log live here\n" +
            "    .foreachBatch(upsert_batch)\n" +
            "    .start())",
          plain:
            "from delta.tables import DeltaTable\n" +
            "def upsert_batch(micro_df, batch_id):\n" +
            "    tgt = DeltaTable.forName(spark, 'events_target')\n" +
            "    (tgt.alias('t').merge(micro_df.dropDuplicates(['event_id']).alias('s'),\n" +
            "        't.event_id = s.event_id').whenNotMatchedInsertAll().execute())\n" +
            "(stream.writeStream.option('checkpointLocation', '/chk/events')\n" +
            "    .foreachBatch(upsert_batch).start())",
          note:
            "The DataFrame-level idempotency this rests on is testable without the Delta connector: applying a micro-batch via an insert-if-absent (`batch.join(target, 'event_id', 'left_anti')` then union) and then REPLAYING the same batch leaves the target row count unchanged &mdash; verified on Spark 3.5.3."
        }
      ],
      sparkInternals:
        "Structured Streaming's engine writes the <b>offset log</b> entry for batch N (the source offset ranges) to <code>checkpointLocation</code> <i>before</i> executing N, and the <b>commit log</b> entry <i>after</i> the sink returns. On restart it compares the two logs: the batch present in offsets but missing from commits is re-planned with the identical offset range, so the replayed micro-batch is byte-for-byte the same input. The engine thus guarantees <b>at-least-once</b>; <b>exactly-once</b> is pushed to the sink. <code>foreachBatch</code> runs your function with a deterministic `batchId` and the micro-batch as a batch DataFrame, so a Delta MERGE keyed on a stable id makes the re-apply a no-op (copy-on-write rewrites only matched files). Native sinks like the Delta sink and the `file` sink achieve the same via their own transactional commit protocol keyed on batch id.",
      sparkSql:
        "-- Structured Streaming is a DataFrame/readStream API; no pure-SQL form.\n" +
        "-- The idempotent core inside foreachBatch, as SQL:\n" +
        "MERGE INTO events_target t USING batch s ON t.event_id = s.event_id\n" +
        "WHEN NOT MATCHED THEN INSERT *;",
      recognizeRecall: [
        "**Spot it:** 'streaming job crashed mid-batch', 'exactly-once on restart', 'duplicates after a replay'.",
        "**Say it:** checkpoint = offset log (pre) + commit log (post) -> replay uncommitted batch; idempotent sink via foreachBatch + MERGE by stable key.",
        "**Trap:** checkpoint alone isn't exactly-once (needs idempotent sink); one checkpoint per query; dedupe on a stable id.",
        "**Follow-up:** Why can't a socket source recover exactly-once? (It can't replay the same offsets; recovery needs a durable, offset-addressable source.)",
        "**Follow-up:** How does a watermark interact with recovery? (State is checkpointed too; replay restores the state store up to the committed batch.)"
      ]
    }

  ]);
})();
