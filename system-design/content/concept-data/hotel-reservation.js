export default {
  id: "hotel-reservation",
  title: "Design a hotel reservation system",
  icon: "🏨",
  chapter: 22,
  group: "Data & infra systems",
  summary: "Book rooms without ever selling the same room twice. Unlike high-QPS feed systems, this is a correctness-first, concurrency-control problem: limited inventory, racing bookings, idempotent payments, and the overbooking trade-off.",
  widget: "booking-race",
  widgetIntro: "The defining bug is the **lost-update race**: two guests book the last room at the same time, each reads \"1 available\", and if each then writes independently, both succeed — you've overbooked. The fix is an **atomic conditional update** (decrement only if > 0, or `SELECT … FOR UPDATE`) that serializes the two requests so exactly one wins.\n\nSend two concurrent bookings for the last room, then toggle the atomic guard off. Without it you'll watch inventory go negative; with it, one guest is confirmed and the other sees 'sold out' — correctness under concurrency, which is the whole game here.",
  sections: [
    {
      title: "Requirements",
      body: "Search availability, reserve a room for dates, and pay — with absolute correctness on inventory (no double-booking) and reasonable scale (reads ≫ writes).",
      bullets: [
        "Search available rooms by hotel/date/type.",
        "Reserve and pay; never sell the same room twice.",
        "Handle concurrent bookings of the last room correctly.",
        "Reads (search) dominate; writes (bookings) must be correct.",
      ],
    },
    {
      title: "Data model",
      body: "Core entities: hotel, room_type, and an **inventory** record of how many rooms of a type are available per date (or available/total counts), plus reservations. Availability is tracked per (hotel, room_type, date) — booking a date range decrements each night's count.",
      rules: ["Inventory is per room_type per date — not per physical room — which simplifies counting."],
    },
    {
      title: "The core problem: concurrent booking",
      body: "Two users try to book the last room at the same moment. A naive 'check availability, then write reservation' has a race: both read '1 available', both write, and you've double-booked. This is the heart of the design — you need a concurrency-control mechanism so only one booking wins.",
      flow: ["Both read: 1 room left", "Both attempt to book", "Without control → both succeed → double-booked"],
    },
    {
      title: "Solutions — do it atomically in the database",
      body: "Push the check-and-decrement into a single atomic operation so the database enforces correctness:",
      table: {
        head: ["Technique", "How it works"],
        rows: [
          ["Atomic conditional update", "UPDATE inventory SET count=count-1 WHERE count>0 — succeeds for only one; rows affected = 0 means sold out"],
          ["Pessimistic lock", "SELECT … FOR UPDATE locks the row; second txn waits, then sees 0"],
          ["Optimistic lock", "Version column; write only if version unchanged, else retry"],
          ["Constraint", "A unique constraint / CHECK (count ≥ 0) makes overselling impossible at the DB level"],
        ],
      },
      body2: "The simplest robust answer: a conditional atomic decrement (`WHERE count > 0`) inside a transaction — the database serializes the racers and only one wins.",
    },
    {
      title: "Idempotent reservation & payment",
      body: "A user may retry (double-click, network retry) and payment involves an external provider. Make booking **idempotent** with a client-supplied idempotency key so a retried request returns the same reservation instead of creating or paying twice. This is the idempotency pattern applied to money + inventory.",
      rules: ["Idempotency key on booking → retries are safe, no duplicate reservations or charges."],
    },
    {
      title: "Reservation expiry & overbooking",
      body: "Hold a room during checkout (a temporary reservation with a TTL) so inventory isn't locked forever if the user abandons payment — expire the hold and return the room. **Overbooking** is a deliberate business choice: hotels sell slightly more than capacity (e.g. 102%) to offset no-shows, accepting the small risk of having to walk a guest. The system models this by allowing inventory to go a configured percentage over true capacity.",
      bullets: [
        "Temporary hold with TTL during checkout; auto-release on expiry.",
        "Overbooking = intentional, bounded oversell to counter no-shows.",
      ],
    },
  ],
  qa: [
    {
      q: "Two people try to book the last room at the same time. How do you prevent double-booking?",
      a: "Make the availability check and the decrement a single atomic database operation instead of a read-then-write. The cleanest form is a conditional update like `UPDATE inventory SET count = count - 1 WHERE room_type=? AND date=? AND count > 0` inside a transaction — the database serializes the two requests, so exactly one decrement succeeds and the other sees zero rows affected (sold out). Alternatives are pessimistic locking (`SELECT … FOR UPDATE`) or optimistic locking with a version column and retry. A `count >= 0` constraint is a backstop that makes overselling structurally impossible.",
      tip: "'Conditional atomic decrement with count > 0' is the crisp answer — it offloads the race to the database's serialization.",
    },
    {
      q: "How do you make booking and payment safe against retries?",
      a: "Use an idempotency key supplied by the client for the booking request. The first request creates the reservation and processes payment; a retried request with the same key returns the existing reservation/result rather than booking again or charging twice. Store the key with the outcome (and a status for in-flight requests) so concurrent retries are handled too. This is the standard idempotency pattern, which matters doubly here because both inventory and money are at stake.",
      tip: "Tie it explicitly to the idempotency concept — same mechanism, high stakes (money + scarce inventory).",
    },
    {
      q: "Why is this not just a high-QPS problem like a news feed?",
      a: "Because the hard constraint is correctness under contention, not raw throughput. Search is read-heavy and cacheable, but the booking write path must guarantee an invariant — never sell a room twice — in the face of concurrent requests. That shifts the design toward transactions, locking/atomic updates, and idempotency rather than fan-out and caching. Scale matters, but a single double-booking is a worse failure than slightly slower search.",
      tip: "Framing it as correctness-first / consistency-over-availability on the write path is the key contrast.",
    },
    {
      q: "How do you handle users who start booking but don't finish, and overbooking?",
      a: "Place a temporary hold on the room when checkout begins — a reservation row with a TTL — so inventory is reserved during payment but automatically released if the user abandons, preventing rooms from being locked indefinitely. Overbooking is a deliberate business policy: allow inventory to be sold a bounded percentage over true capacity to compensate for no-shows and cancellations, accepting the rare, managed case of having to re-accommodate a guest. The system encodes the oversell limit in the availability check.",
      tip: "TTL holds (release abandoned carts) + intentional bounded overbooking show you understand the real-world business mechanics.",
    },
  ],
  related: [
    "idempotency-write-apis",
    "how-do-i-implement-distributed-transactions-without-2pc-pain",
    "when-do-i-accept-eventual-consistency-vs-strict-consistency",
    "how-do-i-handle-read-your-own-writes-in-a-distributed-system",
    "where-should-i-cache-client-edge-service-db-layer",
  ],
};
