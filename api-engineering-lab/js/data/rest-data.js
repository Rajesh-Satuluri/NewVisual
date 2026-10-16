/* ============================================================
   rest-data.js — REST API Design Studio content
   Resource model, good/bad naming, CRUD mapping, endpoint-designer
   lint rules, versioning strategies, and error-design catalog.
   Checked against RFC 9110 (methods/status) and RFC 9457 (errors).
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  var resources = [
    { path: "/v1/customers", d: "Customer accounts", sub: "/v1/customers/{id}" },
    { path: "/v1/products", d: "Catalog items", sub: "/v1/products/{id}" },
    { path: "/v1/inventory", d: "Stock levels", sub: "/v1/inventory/{productId}" },
    { path: "/v1/orders", d: "Orders (the core domain)", sub: "/v1/orders/{id}" },
    { path: "/v1/orders/{id}/items", d: "Line items of an order", sub: "sub-resource" },
    { path: "/v1/payments", d: "Payment attempts", sub: "/v1/payments/{id}" },
    { path: "/v1/shipments", d: "Shipments + tracking", sub: "/v1/shipments/{id}" },
    { path: "/v1/returns", d: "Return requests", sub: "/v1/returns/{id}" }
  ];

  var goodBad = [
    { bad: "GET /getProducts", good: "GET /v1/products", why: "The URL names a resource (noun); the method (GET) is the verb. Don't put verbs in paths." },
    { bad: "POST /createOrder", good: "POST /v1/orders", why: "POST to the collection means 'create an order'. The verb is already in the method." },
    { bad: "GET /deleteCustomer/123", good: "DELETE /v1/customers/123", why: "Never use GET to mutate — GET is safe and may be cached/prefetched/retried." },
    { bad: "GET /v1/order", good: "GET /v1/orders", why: "Collections are plural and consistent — don't mix /order and /orders." },
    { bad: "GET /v1/orders/123/customer/orders", good: "GET /v1/customers/{id}/orders", why: "Deeply nested, ambiguous paths are hard to reason about; nest only one level where it clarifies ownership." },
    { bad: "POST /v1/orders/123/cancel", good: "POST /v1/orders/123/cancellations  (or PATCH status)", why: "Actions can be modeled as sub-resources or a state change; pick one convention and apply it consistently." }
  ];

  var crud = [
    { op: "Create", method: "POST", url: "/v1/orders", success: "201 Created", idem: "No (use a key)", note: "Returns the new id + Location." },
    { op: "Read one", method: "GET", url: "/v1/orders/{id}", success: "200 OK", idem: "Yes", note: "404 if it doesn't exist." },
    { op: "Read many", method: "GET", url: "/v1/orders", success: "200 OK", idem: "Yes", note: "Always paginate collections." },
    { op: "Replace", method: "PUT", url: "/v1/orders/{id}", success: "200 / 204", idem: "Yes", note: "Full replacement — omitted fields are cleared." },
    { op: "Update part", method: "PATCH", url: "/v1/orders/{id}", success: "200 / 204", idem: "Depends", note: "Partial update of named fields." },
    { op: "Delete", method: "DELETE", url: "/v1/orders/{id}", success: "204 / 200", idem: "Yes", note: "Repeat may 404; state effect is idempotent." }
  ];

  var versioning = [
    { k: "URI path", ex: "GET /v1/orders → /v2/orders", pros: "Obvious, easy to route & cache, trivial to test in a browser.", cons: "Version leaks into every URL; can proliferate.", common: "Most widely used for public APIs." },
    { k: "Header", ex: "Accept-Version: 2", pros: "Clean URLs; version is metadata.", cons: "Invisible in a browser; easy to forget; harder to cache.", common: "Used internally / by sophisticated clients." },
    { k: "Media type", ex: "Accept: application/vnd.shopsphere.v2+json", pros: "RESTful content negotiation; per-representation versioning.", cons: "Verbose; tooling and caching complexity.", common: "Used by APIs that lean hard into HATEOAS." }
  ];

  var errorCatalog = [
    { code: 400, title: "Malformed request", code2: "MALFORMED_JSON", detail: "The request body is not valid JSON." },
    { code: 401, title: "Authentication required", code2: "UNAUTHENTICATED", detail: "Provide a valid access token." },
    { code: 403, title: "Permission denied", code2: "FORBIDDEN", detail: "Your token lacks the required scope." },
    { code: 404, title: "Resource not found", code2: "NOT_FOUND", detail: "No order with that id exists." },
    { code: 409, title: "Conflict", code2: "DUPLICATE_ORDER", detail: "An order with this idempotency key already exists." },
    { code: 422, title: "Validation failed", code2: "INVALID_ORDER_ITEM", detail: "items[0].quantity must be >= 1." },
    { code: 429, title: "Rate limit exceeded", code2: "RATE_LIMITED", detail: "Too many requests; retry after the window resets." },
    { code: 500, title: "Internal error", code2: "INTERNAL_ERROR", detail: "An unexpected error occurred. The incident was logged." }
  ];

  AV.data.rest = { resources: resources, goodBad: goodBad, crud: crud, versioning: versioning, errorCatalog: errorCatalog };
})();
