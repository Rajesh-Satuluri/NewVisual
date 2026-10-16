/* ============================================================
   quiz-banks.js — per-module "Test Yourself" question banks.
   Keyed by route id. The TestYourself component appends these
   below a module. diff: beginner | intermediate | advanced | senior.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.quizBanks = {
    fundamentals: [
      { q: "Why route a 'Place Order' click through an API instead of writing to the DB directly?", options: ["APIs are always faster than SQL", "The API centralizes validation, authorization, business rules, and a stable contract", "Databases can't handle web traffic", "It avoids needing a database"], answer: 1, diff: "beginner", why: "The API is an abstraction boundary that enforces rules and gives clients a stable contract — internals can change without breaking them." },
      { q: "In the create-order contract, which field must the server generate rather than trust from the client?", options: ["customerId", "items", "total (price)", "Accept header"], answer: 2, diff: "beginner", why: "Never trust a client-sent price. The server recomputes total from validated items and current pricing." },
      { q: "A partner API differs from a public API mainly in that…", options: ["It uses a different HTTP version", "Access is governed by a business contract and scoped credentials for named partners", "It cannot return JSON", "It never needs authentication"], answer: 1, diff: "intermediate", why: "Partner APIs are for named partners under contracts, with scoped credentials and quotas — between fully public and fully internal." }
    ],
    "http-lab": [
      { q: "On a reused keep-alive connection, which stages are typically skipped?", options: ["Auth and validation", "DNS resolution and the TCP/TLS handshake", "The database call", "Serialization"], answer: 1, diff: "beginner", why: "DNS is cached and the connection is already open, so a reused connection skips DNS + handshake — they're not paid per request." },
      { q: "A downstream payment provider times out. Which status best represents that to the client?", options: ["400 Bad Request", "401 Unauthorized", "504 Gateway Timeout", "201 Created"], answer: 2, diff: "intermediate", why: "An upstream dependency failing to respond in time surfaces as 504; a 5xx says the client's request was fine but the server/upstream failed." },
      { q: "Why is a network error (no response) more dangerous than a 500 for a POST?", options: ["It isn't — they're identical", "The client can't tell whether the server performed the operation, so a blind retry may duplicate it", "500s can't be logged", "Network errors are always the client's fault"], answer: 1, diff: "advanced", why: "With no response the outcome is uncertain — the write may have succeeded. That's exactly why idempotency keys exist." }
    ],
    "http-methods": [
      { q: "Which statement about DELETE is correct?", options: ["DELETE is not idempotent", "DELETE's resource-state effect is idempotent, though a repeat may return 404 instead of 204", "DELETE must always return a body", "DELETE is a safe method"], answer: 1, diff: "intermediate", why: "Idempotency is about the end state (resource gone), not identical responses. DELETE is not safe (it changes state)." },
      { q: "Is PATCH idempotent?", options: ["Always", "Never", "It depends on the operation (set is; increment isn't)", "Only over HTTPS"], answer: 2, diff: "advanced", why: "'set status=PAID' is idempotent; 'increment quantity by 1' is not. PATCH semantics depend on the patch." },
      { q: "You used GET to trigger a state change. What can go wrong?", options: ["Nothing, GET is fine for writes", "Caches, prefetchers, and retries may repeat it, causing unintended writes", "GET can't reach the server", "GET requires a body"], answer: 1, diff: "beginner", why: "GET is a safe method — infrastructure assumes it has no side effects and may repeat it freely." }
    ],
    "status-codes": [
      { q: "A valid token is sent but the user may not access this resource. Correct code?", options: ["401", "403", "404", "409"], answer: 1, diff: "beginner", why: "403 = authenticated but not permitted. 401 = not authenticated (no/invalid credentials)." },
      { q: "The request body is well-formed JSON but 'quantity' is 0. Best code?", options: ["400", "422", "500", "204"], answer: 1, diff: "intermediate", why: "422 Unprocessable Content: syntactically valid but semantically invalid. 400 is for malformed syntax." },
      { q: "A client receives 429. What should it do?", options: ["Retry immediately in a loop", "Give up permanently", "Back off and honor Retry-After", "Switch to GET"], answer: 2, diff: "beginner", why: "429 means slow down; honor Retry-After and use backoff rather than hammering." }
    ],
    "json-lab": [
      { q: "Which is NOT valid JSON?", options: ['{ "a": 1 }', '{ "a": null }', "{ 'a': 1 }", '{ "a": [1,2] }'], answer: 2, diff: "beginner", why: "JSON requires double quotes for keys and strings; single quotes are invalid." },
      { q: "A trailing comma after the last array element is…", options: ["Valid JSON", "Invalid JSON (though valid in JavaScript)", "Required", "Only invalid in arrays"], answer: 1, diff: "beginner", why: "JSON forbids trailing commas; JavaScript allows them — a common source of 400s." },
      { q: "What does a server typically return for a malformed JSON body?", options: ["200", "301", "400 Bad Request", "503"], answer: 2, diff: "beginner", why: "Malformed syntax is rejected with 400 before any business logic runs." }
    ]
  };
})();
