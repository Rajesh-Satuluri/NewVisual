export default {
  id: "idempotency-write-apis",
  question: "How do I handle idempotency for write APIs?",
  icon: "🔁",
  difficulty: "Advanced",
  category: "Core Distributed Systems & Scalability",
  tags: ["Databases", "Distributed Systems", "Reliability"],
  tldr: "Same intent from the client → same outcome on the server, no matter how many retries. No duplicate side effects.",
  intro: "Idempotency means calling the same write endpoint multiple times either does the work once or at least returns the same result, not duplicate side effects. Think of it as: same intent from the client, same outcome on the server, no matter how many retries.",
  steps: [
    {
      title: "Use an idempotency key from the client",
      body: "The server cannot guess which two requests are the same intent. The client must say so. The client generates a unique idempotency key for that specific operation (for example, a UUID per \"place order\" button click) and sends it in a header, e.g. `Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000`. Scope it to the operation, not to the user session in general.",
      rules: ["Same intent, same key", "New intent, new key"],
      body2: "Payment, order creation, and subscription changes are classic use cases."
    },
    {
      title: "Store idempotency keys with the result",
      body: "On the server, keep a durable record that remembers what happened for that key — a row with: idempotency_key, user_id/tenant_id, request_hash/type, response_body, status, created_at, updated_at.",
      bullets: [
        "Request arrives with key K → start a transaction.",
        "Try to INSERT a row with key K. Insert succeeds → first time. Insert fails on the unique key → this is a retry.",
        "First time: run the business logic (charge card, create order, update balances), store the final response + status in the row, commit.",
        "Retry: look up the existing row; if status is COMPLETED, return the stored response — do not run the business logic again."
      ]
    },
    {
      title: "Handle concurrent requests safely",
      body: "Two identical requests can hit at almost the same moment. The race: both see \"no row for key K\", both try to insert, both try to run the business logic.",
      rules: [
        "Add a UNIQUE constraint on idempotency_key",
        "Only one insert wins; the other fails and is treated as a retry",
        "The loser then fetches the row and returns the stored result"
      ],
      body2: "Database uniqueness gives you \"only one winner\" for processing."
    },
    {
      title: "Deal with in-progress work and crashes",
      body: "Sometimes the first worker inserts the key, starts the work, then crashes or is very slow before writing the final response — while a second request arrives. Use a status field: PROCESSING, COMPLETED, FAILED.",
      bullets: [
        "status = PROCESSING → either wait and poll briefly, or return a \"still processing\" response (e.g. 202 Accepted).",
        "status = COMPLETED → return the stored response."
      ],
      body2: "This avoids a second worker starting the same write while the first one is still active."
    },
    {
      title: "Set a sensible lifetime for idempotency records",
      body: "You cannot keep every key forever. Keep records for a window like 24–72 hours, then delete or archive them. Old retries beyond that window are probably a new bug or a new intent, and you keep the table small enough for fast lookups. Use a scheduled cleanup job, or a TTL mechanism if your store supports it."
    }
  ],
  flow: [
    "Request arrives with key K",
    "INSERT row K (UNIQUE)",
    "Insert OK? → first time : retry",
    "First time: run logic, store response, commit",
    "Retry: return stored response"
  ],
  checklist: [
    "Does every write that matters carry a client-supplied idempotency key?",
    "Is there a UNIQUE constraint so only one concurrent request processes?",
    "Is there a status field (PROCESSING/COMPLETED/FAILED) for crash handling?",
    "Is there a cleanup/TTL job for old keys?"
  ],
  widget: "idempotency-race",
  draft: false
};
