/* ============================================================
   modules/protocols.js — REST · GraphQL · gRPC
   The same use case — "show an order with its items, customer, and
   shipment" — expressed three ways, with the trade-offs each makes.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var module = {
    id: "protocols",
    title: "REST · GraphQL · gRPC",
    render: function (container) {
      AV.ui && AV.ui.setDifficulty && AV.ui.setDifficulty("advanced");

      container.innerHTML =
        '<div class="module-header animate-fade-in-up"><div class="module-eyebrow">Architecture · Protocols</div>' +
          '<h1 class="module-title">One use case, three protocols</h1>' +
          '<p class="module-subtitle">Goal: render an order details screen — the order, its items, the customer, and the shipment status. See how REST, GraphQL, and gRPC each express it, and what each optimizes for.</p></div>' +

        '<div class="tabstrip">' + T("rest", "REST", true) + T("graphql", "GraphQL") + T("grpc", "gRPC") + "</div>" +

        P("rest", true,
          sec("How REST does it", "Resources + HTTP verbs. The screen often needs several calls (or a purpose-built aggregate endpoint).") +
          '<div id="rest-code"></div>' +
          '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">📦</span><div class="callout-body"><b>Over/under-fetching:</b> <code>GET /orders/{id}</code> may return more than the screen needs (overfetch), while the customer and shipment live at other endpoints (underfetch → extra round trips). Teams fix this with query params (<code>?expand=items,shipment</code>) or a BFF aggregate endpoint.</div></div>' +
          cards([["Strengths", "Ubiquitous, cacheable (HTTP caching + CDNs), simple, great tooling, works everywhere."], ["Watch for", "Multiple round trips for composed views; versioning; over/underfetching."], ["Best for", "Public APIs, resource-oriented CRUD, anything that benefits from HTTP caching."]])
        ) +

        P("graphql", false,
          sec("How GraphQL does it", "One endpoint, one query. The client asks for exactly the fields it needs across related entities; resolvers fetch each piece.") +
          '<div id="gql-code"></div>' +
          '<div class="callout warn" style="margin-top:var(--space-3)"><span class="callout-icon">➗</span><div class="callout-body"><b>The N+1 problem:</b> a naive <code>items { product { name } }</code> resolver can fire one query per item. GraphQL doesn\'t remove backend calls by magic — you batch them (DataLoader) and cap query depth/complexity so a client can\'t ask for something ruinous.</div></div>' +
          cards([["Strengths", "No over/underfetch, one round trip, strong typed schema, great for varied clients."], ["Watch for", "N+1 resolvers, query-cost limits, HTTP caching is harder (usually POST to one URL)."], ["Best for", "Rich mobile/web UIs composing many entities; a single flexible graph."]])
        ) +

        P("grpc", false,
          sec("How gRPC does it", "A typed service contract in Protocol Buffers; clients are code-generated. Runs over HTTP/2 with binary framing; supports streaming.") +
          '<div id="grpc-code"></div>' +
          '<div class="note-grid" style="margin-top:var(--space-3)">' +
            mini("Unary", "One request → one response (like a function call).") +
            mini("Server streaming", "One request → a stream of responses (e.g. live tracking).") +
            mini("Client streaming", "A stream of requests → one response (e.g. bulk upload).") +
            mini("Bidirectional", "Both stream at once (e.g. chat, telemetry).") +
          "</div>" +
          cards([["Strengths", "Compact binary, fast, typed contracts, generated clients, first-class streaming, deadlines/cancellation."], ["Watch for", "Not natively browser-friendly (needs gRPC-Web + proxy); binary isn't human-readable; less HTTP caching."], ["Best for", "Internal service-to-service calls where speed + typed contracts matter."]])
        );

      AV.ui.wireTabs(container);

      container.querySelector("#rest-code").appendChild(AV.CodeViewer.create({ title: "REST — composing the order screen", lang: "http", code:
        "# Often several calls (or one ?expand= aggregate):\n" +
        "GET /v1/orders/ORD-10025            -> order + items\n" +
        "GET /v1/customers/C1024             -> customer\n" +
        "GET /v1/shipments?orderId=ORD-10025 -> shipment\n\n" +
        "# Response of GET /v1/orders/ORD-10025:\n" +
        '{ "orderId": "ORD-10025", "status": "PAID",\n' +
        '  "items": [{ "productId": "P501", "quantity": 2 }],\n' +
        '  "customerId": "C1024" }' }));

      container.querySelector("#gql-code").appendChild(AV.CodeViewer.create({ title: "GraphQL — one query, exact fields", lang: "graphql", code:
        "query OrderScreen($id: ID!) {\n" +
        "  order(id: $id) {\n" +
        "    id status total\n" +
        "    items { product { name } quantity }\n" +
        "    customer { name email }\n" +
        "    shipment { carrier tracking status }\n" +
        "  }\n" +
        "}\n\n" +
        "# One POST /graphql returns exactly this shape — nothing more." }));

      container.querySelector("#grpc-code").appendChild(AV.CodeViewer.create({ title: "order.proto — typed contract", lang: "protobuf", code:
        "service OrderService {\n" +
        "  rpc GetOrder(GetOrderRequest) returns (Order);              // unary\n" +
        "  rpc WatchStatus(GetOrderRequest) returns (stream Status);   // server streaming\n" +
        "}\n\n" +
        "message GetOrderRequest { string order_id = 1; }\n" +
        "message Order {\n" +
        "  string order_id = 1;\n" +
        "  string status = 2;\n" +
        "  repeated Item items = 3;\n" +
        "}" }));
    },
    destroy: function () {}
  };

  function T(id, l, a) { return '<button class="tab' + (a ? " active" : "") + '" data-tab="' + id + '">' + l + "</button>"; }
  function P(id, a, inner) { return '<div class="tab-panel' + (a ? " active" : "") + '" data-tab="' + id + '">' + inner + "</div>"; }
  function sec(t, b) { return '<div class="lesson-sec"><div class="lesson-sec-h">' + t + "</div><p>" + b + "</p></div>"; }
  function cards(rows) { return '<div class="note-grid" style="margin-top:var(--space-4)">' + rows.map(function (r) { return '<div class="panel"><div class="panel-title">' + r[0] + "</div><p>" + r[1] + "</p></div>"; }).join("") + "</div>"; }
  function mini(t, d) { return '<div class="panel"><div class="panel-title">' + t + "</div><p>" + d + "</p></div>"; }

  AV.registerModule(module);
})();
