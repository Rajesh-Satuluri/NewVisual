/* ============================================================
   openapi-exercises.js — spec-fixing exercises for the Studio
   Each exercise: a broken ShopSphere spec, how many bugs are
   seeded, hints (one per bug), and an optional goal() that must
   also hold after the learner fixes it. "Fixed" = the structural
   validator reports zero errors AND goal() returns null.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  AV.data = AV.data || {};

  AV.data.openapiExercises = [
    {
      id: "ex1", title: "The missing basics", bugs: 2,
      brief: "A teammate scaffolded this spec in a hurry. The validator refuses it. Make it pass.",
      hints: ["Every OpenAPI document states which spec version it uses — at the very top.", "`info` needs both a title and a version."],
      yaml:
"info:\n  title: ShopSphere Orders API\npaths:\n  /v1/orders:\n    get:\n      summary: List orders\n      operationId: listOrders\n      responses:\n        '200':\n          description: OK\n"
    },
    {
      id: "ex2", title: "The undeclared path parameter", bugs: 2,
      brief: "GET /v1/orders/{orderId} looks fine at a glance — the validator disagrees twice.",
      hints: ["A `{placeholder}` in the path must be declared as an `in: path` parameter with the same name.", "Path parameters are always `required: true` — optional path segments don't exist."],
      yaml:
"openapi: 3.1.0\ninfo:\n  title: ShopSphere Orders API\n  version: 1.0.0\npaths:\n  /v1/orders/{orderId}:\n    get:\n      summary: Get an order\n      operationId: getOrder\n      parameters:\n        - in: path\n          name: id\n          required: false\n          schema: { type: string }\n      responses:\n        '200':\n          description: OK\n        '404':\n          description: Not found\n"
    },
    {
      id: "ex3", title: "The broken reference", bugs: 2,
      brief: "Someone renamed a schema and didn't chase the references. Clients can't be generated until every $ref resolves.",
      hints: ["Follow each `$ref` by hand: does something exist at that exact pointer?", "The response references a schema that was renamed — point it at the one that exists (or add the missing one)."],
      yaml:
"openapi: 3.1.0\ninfo:\n  title: ShopSphere Orders API\n  version: 1.0.0\npaths:\n  /v1/orders:\n    post:\n      summary: Create an order\n      operationId: createOrder\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: { $ref: '#/components/schemas/NewOrderRequest' }\n      responses:\n        '201':\n          description: Created\n          content:\n            application/json:\n              schema: { $ref: '#/components/schemas/OrderResponse' }\ncomponents:\n  schemas:\n    NewOrder:\n      type: object\n      required: [customerId, items]\n      properties:\n        customerId: { type: string }\n        items: { type: array, items: { type: object } }\n    Order:\n      type: object\n      properties:\n        orderId: { type: string }\n        status: { type: string }\n"
    },
    {
      id: "ex4", title: "The contract that can't succeed", bugs: 3,
      brief: "This operation has no success story and its schema lies about what's required. Three bugs.",
      hints: ["Scan the declared responses — which one says 'it worked'? None do. Add a 2xx.", "`'4040'` is not an HTTP status code.", "The schema `required` list names a property that doesn't exist in `properties` — fix the list or add the property."],
      yaml:
"openapi: 3.1.0\ninfo:\n  title: ShopSphere Orders API\n  version: 1.0.0\npaths:\n  /v1/orders/{orderId}:\n    get:\n      summary: Get an order\n      operationId: getOrder\n      parameters:\n        - in: path\n          name: orderId\n          required: true\n          schema: { type: string }\n      responses:\n        '4040':\n          description: Not found\ncomponents:\n  schemas:\n    Order:\n      type: object\n      required: [orderId, totalAmount]\n      properties:\n        orderId: { type: string }\n        total: { type: number }\n"
    },
    {
      id: "ex5", title: "The security scheme that isn't", bugs: 3,
      brief: "Ops added auth requirements — against a scheme nobody defined — and a duplicate operationId snuck in. Three bugs.",
      hints: ["`security` entries must name a scheme defined under `components.securitySchemes`.", "Either define `bearerAuth` under components.securitySchemes, or reference one that exists.", "operationIds must be unique across the whole document — generators turn them into method names."],
      yaml:
"openapi: 3.1.0\ninfo:\n  title: ShopSphere Orders API\n  version: 1.0.0\npaths:\n  /v1/orders:\n    get:\n      summary: List orders\n      operationId: listOrders\n      security: [{ bearerAuth: [] }]\n      responses:\n        '200':\n          description: OK\n    post:\n      summary: Create an order\n      operationId: listOrders\n      security: [{ bearerAuth: [] }]\n      responses:\n        '201':\n          description: Created\ncomponents:\n  schemas:\n    Order:\n      type: object\n      properties:\n        orderId: { type: string }\n"
    }
  ];
})();
