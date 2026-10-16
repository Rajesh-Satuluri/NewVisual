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
    ],
    "rest-resources": [
      { q: "Which is the most RESTful way to create an order?", options: ["POST /v1/createOrder", "GET /v1/orders/new", "POST /v1/orders", "PUT /v1/makeOrder"], answer: 2, diff: "beginner", why: "The URL names the resource (nouns, plural); POST to the collection means create. The verb lives in the method." },
      { q: "What's the risk of PUT with a partial body?", options: ["It's faster", "PUT replaces the whole resource, so omitted fields can be wiped", "PUT can't take a body", "Nothing — PUT merges"], answer: 1, diff: "intermediate", why: "PUT is full replacement. For partial updates use PATCH." },
      { q: "A second DELETE on the same order returns 404. Is DELETE still idempotent?", options: ["No, the response differs", "Yes — the resource-state effect (gone) is the same", "Only with a key", "Only the first call counts"], answer: 1, diff: "advanced", why: "Idempotency is about the resulting state, not identical responses." }
    ],
    "endpoint-designer": [
      { q: "A collection GET with no pagination is flagged because…", options: ["GET can't return arrays", "it can return unbounded data and overwhelm clients and the DB", "it must use POST", "collections need auth"], answer: 1, diff: "intermediate", why: "Always bound collections with limit + cursor/offset." },
      { q: "Why does POST without an idempotency key earn a warning?", options: ["POST is deprecated", "POST isn't idempotent, so a client retry can create duplicates", "POST can't have a body", "It should be GET"], answer: 1, diff: "intermediate", why: "Retries on a non-idempotent write duplicate effects unless a key makes them safe." },
      { q: "Where should a secret token NOT go?", options: ["Authorization header", "In the URL/query string", "Encrypted storage", "An HTTPS body"], answer: 1, diff: "beginner", why: "URLs land in logs, browser history, and referrer headers — never put secrets there." }
    ],
    pagination: [
      { q: "Why do large offsets get slow?", options: ["The network is slower", "The DB still scans and skips all preceding rows", "JSON gets bigger", "Offsets aren't cached"], answer: 1, diff: "intermediate", why: "offset=100000 means the DB walks past 100k rows every time." },
      { q: "A row is inserted between fetching page 1 and page 2 with offset paging. What happens?", options: ["Nothing", "You may see a duplicate row or skip one", "The server errors", "The cursor resets"], answer: 1, diff: "advanced", why: "Offsets shift when the underlying set changes — cursor paging avoids this by anchoring to a sort key." },
      { q: "Cursor pagination requires…", options: ["A random cursor", "A stable, unique sort order (tie-broken by id)", "No sorting", "Offsets internally"], answer: 1, diff: "advanced", why: "The cursor is a position in a deterministic ordering; ties must be broken for correctness." }
    ],
    idempotency: [
      { q: "Does sending an Idempotency-Key header alone make an operation safe?", options: ["Yes", "No — the server must persist and match the key to a stored response", "Only for GET", "Only over HTTP/2"], answer: 1, diff: "intermediate", why: "The header is a promise; the server must implement storage, matching, concurrency control, and retention." },
      { q: "Same idempotency key, different request body. The server should…", options: ["Apply the new body", "Return the old response silently", "Reject with 409/422 — the key is bound to the first request", "Create a second order"], answer: 2, diff: "advanced", why: "A reused key with a different payload is a client bug; the server must refuse rather than guess." },
      { q: "A POST's response is lost on the network. With a key, the retry…", options: ["Creates a duplicate", "Returns the same stored response — one order", "Fails with 500", "Is rejected"], answer: 1, diff: "intermediate", why: "That's exactly the uncertain-outcome case idempotency keys solve." }
    ],
    versioning: [
      { q: "Which change is safe to ship WITHOUT a new version?", options: ["Rename a field", "Remove a field", "Add a new optional field", "Restructure the payload"], answer: 2, diff: "intermediate", why: "Additive changes don't break clients that ignore unknown fields; renames/removals/restructures do." },
      { q: "URI versioning (/v1, /v2) is popular for public APIs mainly because…", options: ["It's the only correct way", "It's obvious, cacheable, and testable in a browser", "It hides the version", "It avoids documentation"], answer: 1, diff: "beginner", why: "Trade-off: the version leaks into URLs, but it's simple and transparent." },
      { q: "A Sunset header on an old version signals…", options: ["The server is down", "When the version will be retired, so clients migrate in time", "A rate limit", "A cache policy"], answer: 1, diff: "intermediate", why: "Deprecation + Sunset headers give clients a machine-readable migration deadline." }
    ],
    "error-design": [
      { q: "RFC 9457 Problem Details uses which media type?", options: ["application/json", "text/error", "application/problem+json", "application/rfc"], answer: 2, diff: "intermediate", why: "Problem Details responses use application/problem+json." },
      { q: "Which must NEVER appear in a public error response?", options: ["A stable error code", "A requestId", "A SQL query / stack trace", "A human-readable detail"], answer: 2, diff: "beginner", why: "Internal diagnostics leak schema and aid attackers — log them server-side keyed by requestId." },
      { q: "A duplicate order (idempotency key already used) is best represented as…", options: ["500 Internal Server Error", "200 OK", "409 Conflict", "403 Forbidden"], answer: 2, diff: "intermediate", why: "It's a conflict with current state — 409, not a 500 for a client-side situation." }
    ],
    architecture: [
      { q: "In the checkout trace, why can a 201 return before fulfillment finishes?", options: ["Fulfillment is skipped", "Fulfillment is triggered asynchronously via an event, off the response path", "The DB is slow", "The gateway caches it"], answer: 1, diff: "advanced", why: "Order creation is synchronous; fulfillment/notification react to an event so the customer isn't kept waiting." },
      { q: "Why is the payment provider handled differently from the database?", options: ["It's faster", "It's external and outside our transaction boundary, so outcomes can be uncertain", "It doesn't fail", "It's cached"], answer: 1, diff: "advanced", why: "A DB transaction can't span an external provider — hence a state machine + webhook reconciliation." },
      { q: "Microservices are…", options: ["Always better than a monolith", "A trade-off: independent deploy/scaling for a distributed-systems tax", "Required for REST", "Simpler to operate"], answer: 1, diff: "intermediate", why: "They buy autonomy at the cost of network failures, eventual consistency, and ops overhead — not a free upgrade." }
    ],
    resilience: [
      { q: "A failing dependency plus aggressive retries can cause…", options: ["Faster recovery", "A retry storm that keeps it down", "Lower latency", "Nothing"], answer: 1, diff: "advanced", why: "Retries multiply load on an already-struggling system; bound them and add a circuit breaker." },
      { q: "What does a circuit breaker do when open?", options: ["Retries faster", "Fast-fails without calling the dependency, giving it room to recover", "Caches responses", "Increases the timeout"], answer: 1, diff: "advanced", why: "After N failures it trips and stops calling for a cooldown, shedding load from the failing dependency." },
      { q: "Why add jitter to exponential backoff?", options: ["To look random", "So clients don't retry in lockstep and create a thundering herd", "To slow all retries equally", "It's required by HTTP"], answer: 1, diff: "advanced", why: "Randomizing the delay spreads retries out instead of synchronizing them into a spike." }
    ],
    protocols: [
      { q: "Does GraphQL automatically eliminate excessive backend calls?", options: ["Yes", "No — naive resolvers cause N+1; you batch (DataLoader) and cap query cost", "Only with gRPC", "Only for mutations"], answer: 1, diff: "advanced", why: "GraphQL shapes the response, but backend fetching still needs batching and complexity limits." },
      { q: "gRPC is most commonly used for…", options: ["Public browser APIs", "Internal service-to-service calls", "Static file serving", "Email"], answer: 1, diff: "intermediate", why: "Binary Protobuf + typed contracts + HTTP/2 streaming shine for internal, latency-sensitive calls; browsers need gRPC-Web + a proxy." },
      { q: "A strength REST has that GraphQL finds harder is…", options: ["Typed schema", "HTTP caching (GET + CDNs)", "One endpoint", "Exact field selection"], answer: 1, diff: "intermediate", why: "REST leverages HTTP caching naturally; GraphQL usually POSTs to one URL, making caching harder." }
    ],
    "realtime-protocols": [
      { q: "Webhook deliveries are typically at-least-once, so consumers must…", options: ["Ignore duplicates by luck", "Be idempotent (dedupe by event id)", "Reply very fast only", "Use GET"], answer: 1, diff: "advanced", why: "At-least-once means duplicates happen; dedupe by event id and tolerate reordering." },
      { q: "Which should you verify before acting on a webhook?", options: ["Only the HTTP method", "The signature (and timestamp)", "The user-agent", "Nothing"], answer: 1, diff: "intermediate", why: "Signature + timestamp verification stops forged or replayed events from mutating your data." },
      { q: "A message that keeps failing to process should go to…", options: ["The main queue forever", "A dead-letter queue for inspection", "The client", "A log file only"], answer: 1, diff: "intermediate", why: "A DLQ isolates poison messages so they don't block the queue." }
    ],
    "protocol-matrix": [
      { q: "A third party must notify your system when a payment settles. Best fit?", options: ["Polling their API forever", "A webhook they call", "gRPC streaming", "GraphQL subscription"], answer: 1, diff: "intermediate", why: "Inbound event notification from a third party is the webhook use case." },
      { q: "Read-heavy public API that benefits from CDN caching. Best default?", options: ["gRPC", "WebSockets", "REST", "A queue"], answer: 2, diff: "beginner", why: "REST's HTTP caching + ubiquity make it the default for cacheable public reads." },
      { q: "True or false: one protocol should be used everywhere.", options: ["True — standardize on one", "False — real platforms mix protocols per use case"], answer: 1, diff: "intermediate", why: "Browser reach, streaming, caching, and coupling pull in different directions; mix per requirement." }
    ],
    "express-workshop": [
      { q: "Your POST handler sees req.body as undefined. The fix?", options: ["Restart the server", "Add app.use(express.json()) before the route", "Switch to GET", "Use a bigger timeout"], answer: 1, diff: "beginner", why: "Express doesn't parse JSON bodies by default; add the json() middleware before body-reading routes." },
      { q: "Why does the error-handling middleware take FOUR arguments?", options: ["For speed", "The (err, req, res, next) signature is how Express recognizes an error handler", "To log more", "It doesn't matter"], answer: 1, diff: "intermediate", why: "Express identifies error middleware by its four-argument signature; register it last." },
      { q: "In the DB stage, why use parameterized queries?", options: ["They're shorter", "They prevent SQL injection", "They're required by Postgres", "They cache results"], answer: 1, diff: "intermediate", why: "Parameterized values are never interpreted as SQL, closing the injection hole string-building opens." }
    ],
    "testing-workbench": [
      { q: "What does {{baseUrl}} let you do?", options: ["Encrypt the URL", "Swap environments (local/dev/staging/prod) without rewriting every request", "Speed up requests", "Avoid auth"], answer: 1, diff: "beginner", why: "Environment variables reduce repeated configuration errors across environments." },
      { q: "Chaining a created {{orderId}} into the next request tests…", options: ["Nothing useful", "A realistic multi-step client flow (create → fetch)", "Only the database", "Rate limits"], answer: 1, diff: "intermediate", why: "Real clients use returned ids in follow-up calls; collections chain them." },
      { q: "Where should real production secrets live?", options: ["In the request collection", "In browser localStorage", "Never in the tool/source — use a secret manager", "In the URL"], answer: 2, diff: "beginner", why: "Secrets never belong in collections, source, or local storage; use a managed secret store." }
    ],
    "testing-challenges": [
      { q: "A request returns 403 with a valid token. Most likely cause?", options: ["Expired token", "Missing scope or accessing another user's resource", "Malformed JSON", "Server down"], answer: 1, diff: "intermediate", why: "403 = authenticated but not permitted; retrying the same identity won't help." },
      { q: "Duplicate orders during flaky mobile connections point to…", options: ["A DB bug", "Non-idempotent retries without an idempotency key", "Rate limiting", "Bad JSON"], answer: 1, diff: "intermediate", why: "Lost responses trigger retries that duplicate a non-idempotent POST." },
      { q: "A 504 during checkout usually means…", options: ["Client error", "An upstream (e.g. payment provider) timed out", "Wrong method", "Cache miss"], answer: 1, diff: "intermediate", why: "504 = upstream didn't respond in time; add timeouts/retries/breaker and reconcile the charge." }
    ],
    "openapi-studio": [
      { q: "One OpenAPI spec can drive all of these EXCEPT…", options: ["Interactive docs", "Client SDK generation", "Guaranteeing your code is bug-free", "Contract tests"], answer: 2, diff: "intermediate", why: "The spec describes the contract and powers docs/SDKs/tests, but can't guarantee implementation correctness." },
      { q: "Removing a response field from the spec is…", options: ["Always safe", "Breaking — deprecate first, remove in a new version", "Only a docs change", "Automatically versioned"], answer: 1, diff: "intermediate", why: "Clients reading that field break and contract tests fail; deprecate then remove on a schedule." },
      { q: "Contract tests catch a breaking change by…", options: ["Reading the changelog", "Replaying the spec against the running API in CI", "Asking the client", "Monitoring production"], answer: 1, diff: "advanced", why: "They assert the live API still matches the spec, failing the build before customers are affected." }
    ]
  };
})();
