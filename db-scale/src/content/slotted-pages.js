/* content/slotted-pages.js — the "Slotted Pages" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/slotted-pages-scene.js. Rendered through the shared course shell. */

export const slottedPagesLesson = {
  id: 'slotted-pages',
  title: 'Slotted Pages',
  group: 'Storage Engine',
  summary: 'How a page stores variable-length records without the layout falling apart — a slot directory that lets records move while their row ids stay fixed.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['slots', 'fillFactor', 'pages', 'rows'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why variable-length records break a naïve page layout', step: 0 },
    { text: 'The slotted page: header, slot directory, records, free space', step: 1 },
    { text: 'Indirection — a row id names a slot, not a byte offset', step: 2 },
    { text: 'Deleting a record frees its slot without shifting others', step: 3 },
    { text: 'In-page compaction reclaims holes, row ids unchanged', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Holes',
      title: 'Variable-length records leave holes',
      body: [
        `Rows are not all the same size — a name can be 4 characters or 40. If you simply pack records back-to-back in a page and address each one by its <em>byte offset</em>, the layout is fragile.`,
        `Delete a record in the middle and you leave a <span class="term">hole</span>. The next insert may not fit it. Slide the later records down to close the gap and every offset you handed out is now <b>wrong</b> — every pointer to those rows is broken.`,
      ],
      callout: { kind: 'warn', text: 'Addressing records by raw byte offset means you can never move one. Delete and insert churn turns the page into unusable swiss cheese.' },
      metrics: { slots: 5, fillFactor: 72, pages: 1, rows: 4 },
      scene: { view: 'problem', note: 'Delete leaves a hole; the next insert will not fit it.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'Layout',
      title: 'A header, a slot array, and records from the back',
      body: [
        `The <span class="term">slotted page</span> splits the page into four zones. A small <b>header</b> sits at the very top. A <b>slot directory</b> grows <em>downward</em> from the header. The <b>records</b> themselves grow <em>upward</em> from the bottom of the page. Between them sits the <b>free space</b>.`,
        `New record? Write its bytes just above the previous one, and add a slot at the end of the directory. The two ends grow toward each other and the page is full when they meet.`,
      ],
      callout: { kind: 'insight', text: 'Slots grow down from the top, records grow up from the bottom, free space shrinks in the middle. One page, two cursors.' },
      changes: ['+ header', '+ slot directory (grows down)', '+ records (grow up)', '+ free space between'],
      metrics: { slots: 5, fillFactor: 78, pages: 1, rows: 5 },
      scene: { view: 'layout', note: 'Four zones: header, slot directory, free space, records.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Indirection',
      title: 'A row id names a slot, not a byte',
      body: [
        `The trick is one level of <span class="term">indirection</span>. A row is addressed as <code>(page, slot#)</code> — never as a raw offset. Each slot holds the record's current <b>offset and length</b> inside the page.`,
        `To read row <code>slot 2</code>, you look up slot 2 in the directory, follow its offset to the record. Because the row id is the <em>slot number</em>, the record's bytes can live anywhere in the page — and move — without the row id ever changing.`,
      ],
      callout: { kind: 'tip', text: 'row id → slot → record. The slot is a stable handle; the bytes behind it are free to move. That indirection is the whole point.' },
      changes: ['~ row id = (page, slot#)', '+ slot stores offset + length', '+ record is movable'],
      metrics: { slots: 5, fillFactor: 78, pages: 1, rows: 5 },
      scene: { view: 'indirection', note: 'row id → slot (offset+len) → record bytes.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Delete',
      title: 'Delete just frees a slot',
      body: [
        `Deleting a record is cheap. You mark its <b>slot</b> as free — a tombstone — and leave the bytes where they are for now. No records move, so no other row id changes.`,
        `The page now has a reclaimable hole, which is why <span class="term">fill factor</span> drops: live bytes over page size. The space is not lost, only stranded until the page is compacted.`,
      ],
      callout: { kind: 'insight', text: 'A delete touches one slot, not the record area. Other rows keep their ids. The cost is a temporary hole and a lower fill factor.' },
      changes: ['~ slot 2 marked free', '+ hole left in record area', '- fill factor drops'],
      metrics: { slots: 5, fillFactor: 61, pages: 1, rows: 4 },
      scene: { view: 'delete', note: 'Slot 2 freed; its bytes become a hole, other ids untouched.' },
    },
    { // 4 — SOLUTION
      chapter: 'solution', short: 'Compact',
      title: 'Compaction slides records, not ids',
      body: [
        `When holes add up, the page is <span class="term">compacted</span> in place: live records slide together toward the bottom, closing every gap and pushing free space back into one contiguous block.`,
        `Crucially, only the <b>slot directory</b> is rewritten — each surviving slot gets the record's new offset. The <em>slot numbers</em> — the row ids every index and pointer uses — do not change at all. Fill factor recovers.`,
      ],
      callout: { kind: 'tip', text: 'Compaction rewrites offsets inside slots, never slot numbers. External row ids survive untouched while bytes are rearranged.' },
      changes: ['~ records slid together', '~ slot offsets rewritten', '+ free space reclaimed', '+ fill factor recovers'],
      metrics: { slots: 4, fillFactor: 82, pages: 1, rows: 4 },
      scene: { view: 'compact', note: 'Records slide together; slot offsets updated, ids unchanged.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Movable records, stable ids',
      body: [
        `A slotted page is the standard on-disk record layout: a header, a slot directory growing down, records growing up, and free space in between. The indirection through slots buys the one thing fixed offsets could never give you — the freedom to <b>move, delete and compact</b> records while the row ids the rest of the system holds stay rock-stable.`,
        `This is why a heap file, a B+Tree leaf, and most table pages all use the slotted layout underneath.`,
      ],
      callout: { kind: 'insight', text: 'Header · slot directory · free space · records. Address by slot, store offset+length, compact freely. Stable ids over movable bytes.' },
      metrics: { slots: 4, fillFactor: 82, pages: 1, rows: 4 },
      scene: { view: 'recap', note: 'The slotted page — one layout behind heaps, leaves and tables.' },
    },
  ],
};
