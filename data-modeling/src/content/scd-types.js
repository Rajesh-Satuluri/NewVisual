/* content/scd-types.js — the "SCD Types 0–6" lesson, as DATA. Same shape as
   content/third-normal-form.js. `scene` is a view-snapshot consumed by
   db/scd-types-scene.js.

   The sequel to scd-overview: it turns the overwrite-or-preserve spectrum into
   concrete table designs, type by type, with Type 2 (versioned rows) as the
   workhorse hero. */

export const scdTypesLesson = {
  id: 'scd-types',
  title: 'SCD Types 0–6',
  group: 'Dimensional Modeling',
  summary: 'The named SCD types are the standard answers to "overwrite or preserve". Type 1 overwrites, Type 2 versions a new row per change, and Types 0, 3, 4 and 6 are the considered compromises in between.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['scdVersions', 'dimensions', 'rows', 'redundancy'],
  legend: [],
  goals: [
    { text: 'Type 1 overwrites in place — current truth, zero history', step: 0 },
    { text: 'Type 2 adds a new versioned row per change — full history', step: 1 },
    { text: 'Type 2 needs a surrogate key, effective dates, and an is_current flag', step: 2 },
    { text: 'Type 3 keeps one prior value in an extra column', step: 3 },
    { text: 'Type 4 moves history to its own table; Type 6 is a 1+2+3 hybrid', step: 4 },
    { text: 'Pick a type per attribute by the history each question needs', step: 5 },
  ],

  steps: [
    { // 0 — Type 1 (and Type 0)
      chapter: 'setup', short: 'Type 1 overwrite',
      title: 'Type 1 — overwrite, keep only now',
      body: [
        `<span class="term">Type 1</span> is the simplest and the lossiest: when the source changes, <b>overwrite the column in place</b>. The row always shows the current value and there is exactly one row per natural key. <code>UPDATE dim_customer SET region = 'West' WHERE customer_id = 42</code> — done. Perfect when nobody will ever ask "what was it before?", like fixing a misspelt name.`,
        `Its quieter cousin is <span class="term">Type 0</span>: <b>retain the original</b> and never change it, no matter what the source says. Use it for attributes that are defined as "as-at-creation" — an account's original credit score, a customer's acquisition channel, a product's launch date. Type 0 refuses the update; Type 1 accepts it and forgets the past.`,
      ],
      callout: { kind: 'warn', text: 'Type 1 has no memory. It is the right choice only when the attribute has no analytical history worth keeping — otherwise it silently rewrites every past total.' },
      changes: ['~ region: East → West (overwrite in place)', '! prior value is gone — one row per key'],
      metrics: { scdVersions: 1, dimensions: 1, rows: 1, redundancy: 0 },
      scene: { view: 'type1', note: 'Type 1: one row per customer_id, region overwritten in place. Current truth, no history.' },
    },
    { // 1 — Type 2 (the workhorse)
      chapter: 'technique', short: 'Type 2 new row',
      title: 'Type 2 — a new row per change',
      body: [
        `<span class="term">Type 2</span> is the workhorse of dimensional modeling. Instead of overwriting, you <b>insert a brand-new row</b> for the changed version and leave the old one untouched. Customer 42 now has <em>two</em> rows: one for their East era and one for their West era, both sharing the natural key <code>customer_id = 42</code>.`,
        `Because the natural key no longer identifies a single row, each version gets its own <b>surrogate key</b> (<code>customer_sk</code>) — a meaningless integer that uniquely names <em>this version</em>. Facts point at the surrogate key, not the natural key, so a sale booked in the East era joins to the East row forever. History is complete: every value the attribute ever held still exists as a row you can query.`,
      ],
      callout: { kind: 'insight', text: 'Type 2 is "append, never overwrite". The natural key groups a customer\'s versions; the surrogate key identifies exactly one of them — and that is what facts reference.' },
      changes: ['+ new row: customer_sk = 2, region = West', '+ surrogate key per version; facts point at it'],
      metrics: { scdVersions: 2, dimensions: 1, rows: 2, redundancy: 1 },
      scene: { view: 'type2', note: 'Type 2: two rows for customer_id 42 — one East, one West — each with its own surrogate key.' },
    },
    { // 2 — Type 2 mechanics (versioning columns)
      chapter: 'technique', short: 'Version columns',
      title: 'Type 2 needs effective dates and a current flag',
      body: [
        `Multiple rows per key only work if you can tell <em>which version applied when</em>. Type 2 rows therefore carry versioning columns: <code>effective_from</code> and <code>effective_to</code> bound the window each version was valid, and <code>is_current</code> flags the live row. The East row runs from account-open to the move date; the West row runs from the move date to <code>9999-12-31</code> with <code>is_current = true</code>.`,
        `This turns the dimension into a tiny temporal database. "What region was customer 42 in on 2024-03-01?" is a date-between lookup. ETL closes the old row (<code>effective_to = today</code>, <code>is_current = false</code>) and opens the new one in the same load. The cost is <b>row growth</b> — a volatile attribute on a large dimension can multiply rows fast — so you reserve Type 2 for the attributes analysts genuinely slice history by.`,
      ],
      callout: { kind: 'tip', text: 'effective_from / effective_to / is_current are the Type-2 toolkit. The flag answers "give me today"; the date range answers "give me as-of any past date".' },
      changes: ['+ effective_from, effective_to, is_current', '~ close old row, open new row in one load'],
      metrics: { scdVersions: 2, dimensions: 1, rows: 2, redundancy: 1 },
      scene: { view: 'type2', note: 'Each Type-2 version carries effective_from / effective_to / is_current — a temporal lookup per row.' },
    },
    { // 3 — Type 3
      chapter: 'technique', short: 'Type 3 column',
      title: 'Type 3 — a column for the previous value',
      body: [
        `<span class="term">Type 3</span> keeps history <b>horizontally</b> instead of vertically. Rather than a new row, you add a <b>column</b>: <code>current_region</code> alongside <code>prior_region</code> (sometimes with an <code>effective_date</code>). When the value changes, the old <code>current_region</code> shifts into <code>prior_region</code> and the new value takes its place — still one row per key.`,
        `This buys exactly <b>one step of history</b>. It is perfect for a planned, discrete change everyone wants to compare across — "sales under the old vs new territory alignment", "this year's vs last year's category". But it cannot hold a <em>sequence</em> of changes: a third value overwrites the first, which falls off the end. Type 3 is a deliberate, narrow tool, not a general history mechanism.`,
      ],
      callout: { kind: 'insight', text: 'Type 3 trades depth for width: no extra rows and no surrogate keys, but only the single most recent prior value survives.' },
      changes: ['+ prior_region column beside current_region', '! only ONE previous value is retained'],
      metrics: { scdVersions: 1, dimensions: 1, rows: 1, redundancy: 1 },
      scene: { view: 'type3', note: 'Type 3: one row, two columns — current_region and prior_region. One step of history, no row growth.' },
    },
    { // 4 — Type 4 and Type 6
      chapter: 'technique', short: 'Type 4 & 6',
      title: 'Type 4 splits history out; Type 6 hybridises',
      body: [
        `<span class="term">Type 4</span> keeps the main dimension small and current (Type-1 style) while pushing old versions into a separate <code>dim_customer_history</code> (or a <span class="term">mini-dimension</span> for fast-changing attributes like age band or credit tier). The hot dimension stays lean for the common "current" queries; the history table is there when you need the past.`,
        `<span class="term">Type 6</span> is the "all of the above" hybrid — <b>1 + 2 + 3</b>. Each row is a Type-2 version (surrogate key, effective dates), <em>and</em> it carries a <code>current_region</code> column that is overwritten Type-1 style on every version, <em>and</em> often a Type-3 prior-value column. So one query can ask "the region as-of the sale" (the versioned column) and another can ask "that customer's region today" (the overwritten current column) — from the same table.`,
      ],
      callout: { kind: 'tip', text: 'Type 6 = Type 1 ⊕ Type 2 ⊕ Type 3 (6 = 1+2+3, and also 1×2×3). Historical truth per row, plus an always-current column stamped on every version.' },
      changes: ['+ Type 4: dim_customer_history / mini-dimension', '+ Type 6: Type-2 row + overwritten current_* column'],
      metrics: { scdVersions: 2, dimensions: 2, rows: 2, redundancy: 1 },
      scene: { view: 'type6', note: 'Type 6: a Type-2 versioned row that also carries a Type-1 current_region, overwritten every version.' },
    },
    { // 5 — RECAP / compare
      chapter: 'recap', short: 'Choose per column',
      title: 'Choosing a type, column by column',
      body: [
        `The types line up by how much history they keep: <b>0</b> keeps the original and refuses change; <b>1</b> keeps only the current value; <b>2</b> keeps every value as a dated row; <b>3</b> keeps the current plus one prior; <b>4</b> keeps history in a side table; <b>6</b> keeps both the as-of value and the current value together. A single dimension commonly mixes them — Type 1 for a corrected name, Type 2 for region, Type 3 for a one-off realignment.`,
        `The decision is driven entirely by the questions the business asks of each attribute. If "as of the transaction date" matters, you need Type 2 (or 6). If only "right now" matters, Type 1 is cheaper. Get this right per column and your facts stay honestly attributed through every change the real world throws at the dimension.`,
      ],
      callout: { kind: 'insight', text: 'There is no single "SCD type" for a table — there is one per attribute. Match the type to the history each column\'s questions require.' },
      metrics: { scdVersions: 2, dimensions: 1, rows: 2, redundancy: 1 },
      scene: { view: 'compare', note: 'Types 0–6 side by side: a spectrum from no history to full, dated, current-and-historical together.' },
    },
  ],
};
