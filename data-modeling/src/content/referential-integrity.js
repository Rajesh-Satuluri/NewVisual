/* content/referential-integrity.js — the "Referential Integrity" lesson, as DATA.
   Same shape as the other ER & Relational Design lessons: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }. `scene`
   is a view-snapshot consumed by db/referential-integrity-scene.js. This is the
   FULL mechanics of referential integrity — enforcement, orphans, referential
   actions, deferred and circular constraints — not the overview elsewhere. */

export const referentialIntegrityLesson = {
  id: 'referential-integrity',
  title: 'Referential Integrity',
  group: 'ER & Relational Design',
  summary: 'The guarantee that every foreign key points at a row that really exists — and the referential actions that keep it true as parents are deleted, updated, and reference each other.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['fks', 'integrity', 'constraints', 'relations'],
  legend: [],
  goals: [
    { text: 'A foreign key must reference a row that actually exists', step: 0 },
    { text: 'Deleting a parent without a policy leaves orphaned children', step: 1 },
    { text: 'ON DELETE / ON UPDATE actions decide what happens to children', step: 2 },
    { text: 'Deferred constraints handle circular and self references', step: 3 },
    { text: 'Enforce integrity in the database, not just the application', step: 4 },
    { text: 'With the rules in place, every foreign key always resolves', step: 5 },
  ],

  steps: [
    { // 0 — NO ORPHANS
      chapter: 'setup', short: 'No orphans',
      title: 'A foreign key must point at a real row',
      body: [
        `<span class="term">Referential integrity</span> is a single promise: every <span class="term">foreign key</span> value must match a primary key that actually exists. With it in force, <code>order.customer_id</code> can only ever hold the id of a customer who is really in the table — the database refuses to store an order that references a customer who was never created.`,
        `This turns a relationship from a hopeful convention into an enforced guarantee. A foreign-key constraint is checked on every insert and update, so the <b>parent</b> side (<code>Customer</code>) and the <b>child</b> side (<code>Order</code>) can never fall out of step. No order dangles off a customer who does not exist.`,
      ],
      callout: { kind: 'insight', text: 'Referential integrity = every foreign key resolves to a real primary key. It is the database refusing, on every write, to store a reference to nothing.' },
      metrics: { fks: 1, integrity: 100, constraints: 1, relations: 1 },
      scene: { view: 'fk', note: 'order.customer_id references customer.customer_id — every reference points at a real row.' },
    },
    { // 1 — DANGLING REFERENCES
      chapter: 'problem', short: 'Dangling refs',
      title: 'Delete a parent, orphan the children',
      body: [
        `The guarantee is only as strong as what happens on <em>delete</em>. Remove a customer who still has orders and, if nothing stops you, those orders are left pointing at a <code>customer_id</code> that no longer exists. They have become <span class="term">orphans</span> — <b>dangling references</b> to a parent that is gone.`,
        `An orphan is corruption that hides. The rows still read fine until a query tries to join back to the missing customer and finds nothing — a report under-counts, a lookup returns null where a name should be. Without an enforced policy, a single unguarded delete can scatter orphans across the whole schema, and they are far harder to find than to prevent.`,
      ],
      callout: { kind: 'warn', text: 'A delete with no referential policy is how orphans are born. The children still look valid — right up until a join reveals the parent they point at is gone.' },
      changes: ['~ delete a referenced Customer', '~ Order rows point at nothing', '+ orphaned / dangling references'],
      metrics: { fks: 1, integrity: 60, constraints: 0, relations: 1 },
      scene: { view: 'orphan', note: 'The referenced customer is deleted — the orders are left pointing at a row that is gone.' },
    },
    { // 2 — REFERENTIAL ACTIONS
      chapter: 'technique', short: 'Referential actions',
      title: 'ON DELETE / ON UPDATE',
      body: [
        `A foreign key declares what happens to the children when the parent changes, through <span class="term">referential actions</span> on <code>ON DELETE</code> and <code>ON UPDATE</code>. <code>CASCADE</code> propagates the change — delete the customer and their orders go too. <code>RESTRICT</code> (and <code>NO ACTION</code>) refuse the delete while any child still references the parent.`,
        `<code>SET NULL</code> keeps the children but detaches them — the foreign key becomes null, so the orders survive as unattached rows. <code>NO ACTION</code> differs from <code>RESTRICT</code> in one subtle way: it defers its check to the end of the statement, which is what lets some multi-row rearrangements succeed. Choosing the action <em>is</em> modelling the relationship — it says what a parent's removal means for its children.`,
      ],
      callout: { kind: 'tip', text: 'CASCADE removes the children, RESTRICT protects them, SET NULL detaches them, NO ACTION defers the check. Pick one per relationship — the default is rarely what you want.' },
      changes: ['+ ON DELETE CASCADE / RESTRICT / SET NULL / NO ACTION', '+ ON UPDATE action chosen too', '~ action = part of the relationship'],
      metrics: { fks: 1, integrity: 100, constraints: 1, relations: 1 },
      scene: { view: 'actions', note: 'Four referential actions — CASCADE, RESTRICT, SET NULL, NO ACTION — each a different policy.' },
    },
    { // 3 — DEFERRED & CIRCULAR
      chapter: 'technique', short: 'Deferred & circular',
      title: 'Deferred constraints, circular and self references',
      body: [
        `Some references point back at the same table. An <code>employees.manager_id</code> that references <code>employees.employee_id</code> is a <span class="term">self-reference</span>: a row points at another row in its own table, and the chief executive's manager is simply null. The same foreign-key rules apply — a manager_id must name a real employee.`,
        `<b>Circular</b> references are harder: table A requires a row in B and B requires a row in A, so neither can be inserted first under a per-row check. The fix is a <span class="term">deferred constraint</span> — declare it <code>DEFERRABLE INITIALLY DEFERRED</code> and the database checks referential integrity once at <code>COMMIT</code> instead of after each statement. Both rows go in inside one transaction, and the constraint is verified only when the transaction is whole.`,
      ],
      callout: { kind: 'insight', text: 'Self-references use ordinary foreign keys; circular references need deferred constraints so the check happens at COMMIT, after both sides of the cycle exist.' },
      changes: ['+ employees.manager_id → employees.employee_id', '+ DEFERRABLE INITIALLY DEFERRED', '~ check moves to COMMIT time'],
      metrics: { fks: 2, integrity: 100, constraints: 2, relations: 2 },
      scene: { view: 'deferred', note: 'A self-reference (manager_id → employee_id); circular cycles defer the check to COMMIT.' },
    },
    { // 4 — WHERE TO ENFORCE
      chapter: 'tradeoff', short: 'Where to enforce',
      title: 'In the database, not just the app',
      body: [
        `It is tempting to enforce references only in application code — check that the customer exists before inserting the order. But that guard holds only for writes that go through that one code path. A migration script, an analyst's ad-hoc <code>INSERT</code>, a second service, a bug — any of them can write an order with no matching customer, and the orphan is created.`,
        `A foreign-key constraint in the <b>schema</b> is enforced for <em>every</em> writer, forever, with no code to remember. The database becomes the last line of defence: references are guaranteed no matter how the data arrives. Application checks are still worth having for fast, friendly errors — but as an addition to the database constraint, never a replacement for it.`,
      ],
      callout: { kind: 'warn', text: 'Integrity enforced only in the app is integrity one forgotten code path away from broken. Put the foreign key in the schema; let the app checks be a convenience on top.' },
      changes: ['~ app-only check: one path, easily bypassed', '+ FK constraint in schema: every writer', '~ app check = convenience, not the guarantee'],
      metrics: { fks: 2, integrity: 100, constraints: 2, relations: 2 },
      scene: { view: 'enforce', note: 'Enforce the foreign key in the database — it holds for every writer, not just one code path.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Summary',
      title: 'Every FK resolves',
      body: [
        `Referential integrity is the guarantee that <b>every foreign key resolves</b> to a real row, and the mechanics that keep it true as data changes: the constraint itself, the referential actions (<code>CASCADE</code>, <code>RESTRICT</code>, <code>SET NULL</code>, <code>NO ACTION</code>) that decide a child's fate when its parent moves, and deferred checks for self and circular references.`,
        `Declare it in the database and it holds for every writer, so no orphan is ever created and no join ever hits a missing parent. That single, boring guarantee — enforced, not hoped for — is what lets every relationship in the model be trusted. Build on references the database verifies, and the whole schema stays connected and correct.`,
      ],
      callout: { kind: 'insight', text: 'FK constraint + referential actions + deferred checks, enforced in the schema — so every foreign key always resolves and the model never scatters orphans.' },
      metrics: { fks: 2, integrity: 100, constraints: 2, relations: 2 },
      scene: { view: 'recap', note: 'Every foreign key resolves — orphans impossible, references trusted across the model.' },
    },
  ],
};
