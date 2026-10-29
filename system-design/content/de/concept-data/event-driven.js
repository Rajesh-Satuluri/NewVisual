export default {
  id: "event-driven",
  title: "Event-driven architecture",
  icon: "⚡",
  chapter: 16,
  group: "Streaming systems",
  summary: "Instead of services calling each other directly, producers emit events to a log/broker and any number of consumers react independently. The producer doesn't know or wait for consumers, so systems are decoupled, extensible, and resilient — you add a new consumer without touching the producer.",
  widget: "de-event-driven",
  widgetIntro: "The shift is from **'tell this service to do X'** to **'announce that X happened'**. A producer publishes an event (`OrderPlaced`) to a broker and moves on; it doesn't know who's listening. Independent consumers — email, analytics, inventory, fraud — each subscribe and react on their own. Add a fifth consumer tomorrow and the producer never changes.\n\nWatch one event fan out to multiple independent consumers, then add or remove a consumer live — the producer is unaffected, which is the whole point of decoupling through events.",
  sections: [
    {
      title: "Request-driven vs event-driven",
      body: "In a request-driven (orchestration) design, a service directly calls each downstream it needs and waits for them — tight coupling, and the caller breaks if any callee is down or slow. In an event-driven (choreography) design, the service emits one event and consumers react independently; the producer neither knows nor waits.",
      table: {
        head: ["", "Request-driven", "Event-driven"],
        rows: [
          ["Coupling", "Caller knows all callees", "Producer knows nothing of consumers"],
          ["Timing", "Synchronous, waits", "Asynchronous, fire-and-forget"],
          ["Add a consumer", "Modify the caller", "Just subscribe — producer unchanged"],
          ["Failure", "Caller fails if callee down", "Consumer catches up from the log later"],
        ],
      },
    },
    {
      title: "Why it decouples",
      body: "The broker (Kafka, a queue, a log) sits between producer and consumers. The producer's only job is to publish; consumers' only job is to subscribe and process. Neither knows the other exists. That inversion is what lets teams add capabilities — a new analytics pipeline, a new notification — by adding a consumer, with zero changes to the emitting service.",
      flow: ["producer emits event", "→ broker / log", "→ consumer A · B · C … (independent)"],
      rules: ["Producers announce facts; consumers decide what to do — add consumers without touching producers."],
    },
    {
      title: "Resilience and buffering",
      body: "Because events sit durably in the log, a consumer that's down doesn't lose anything — it catches up from its offset when it recovers. The broker also absorbs load spikes: producers keep emitting at their rate while consumers process at theirs. This buffering and replay are what make event-driven systems resilient to partial failure and uneven load.",
      bullets: [
        "A slow/down consumer doesn't block the producer or other consumers.",
        "The log buffers spikes — producer and consumer rates are decoupled.",
        "Recovered consumers replay from their offset — no lost work.",
      ],
    },
    {
      title: "The costs",
      body: "Decoupling isn't free. Flows become harder to trace (no single call stack — you follow events across services), you inherit eventual consistency (consumers react slightly later), and you must design events as stable contracts and handle duplicates/ordering. These are the streaming concerns — schema evolution, idempotency, delivery guarantees — that event-driven systems take on in exchange for decoupling.",
      rules: ["You trade an easy call stack for decoupling — invest in event schemas, idempotency, and tracing."],
    },
  ],
  deepDiveTitle: "🔬 Deep dive",
  deepDiveIntro: "Event-driven design is powerful and genuinely harder to operate — the trade-offs are concrete.",
  deepDive: [
    {
      title: "Events as contracts",
      body: "An event is a published API: once consumers depend on its shape, you can't break it. So events need versioned, backward-compatible schemas (a schema registry), clear ownership, and stable semantics. A good event describes a fact that happened ('OrderPlaced' with its data), not a command — commands recouple you to a specific handler.",
      stats: [
        { value: "fact, not command", label: "announce what happened", tone: "green" },
        { value: "schema registry", label: "events are versioned contracts", tone: "blue" },
        { value: "N consumers", label: "add without touching producer", tone: "accent" },
        { value: "eventual", label: "consumers react slightly later", tone: "amber" },
      ],
    },
    {
      title: "When to choose it",
      body: "Reach for event-driven when multiple independent reactions follow one occurrence, when you want to add consumers over time, or when you need to decouple load and failure between services. Keep it request-driven when you need an immediate synchronous answer (a query, a validation the caller must have now). Most real systems mix both — synchronous where an answer is needed, events for everything that can happen afterwards.",
      callout: { tone: "tip", label: "The senior framing:", body: "\"Emit events as facts to a durable log; let consumers react independently so I can add capabilities without changing producers and absorb spikes/failures via the log. Pay for it with schema contracts, idempotent consumers, and tracing. Use synchronous calls only where the caller truly needs an immediate answer.\"" },
    },
  ],
  qa: [
    {
      q: "What is event-driven architecture and what does it buy you?",
      a: "Instead of services calling each other directly, a producer emits an event (a fact like OrderPlaced) to a broker/log and any number of consumers subscribe and react independently. The producer doesn't know or wait for consumers. That decoupling buys extensibility (add a consumer without touching the producer), resilience (a down consumer catches up from the log; a slow one doesn't block others), and load absorption (the log buffers spikes, decoupling producer and consumer rates). You trade an easy call stack for those properties.",
      tip: "Decoupling → extensibility + resilience + buffering is the value; stress 'producer doesn't know consumers'.",
    },
    {
      q: "What are the downsides, and how do you manage them?",
      a: "You lose the single call stack, so flows are harder to trace — you need distributed tracing and correlation ids across events. You inherit eventual consistency, since consumers react slightly later. And events become published contracts, so you need versioned, backward-compatible schemas (a schema registry), plus idempotent consumers and a plan for duplicates and ordering (since delivery is usually at-least-once). The decoupling is real but it moves complexity into schemas, idempotency, and observability.",
      tip: "Name tracing, eventual consistency, and event-as-contract (schema + idempotency) as the costs and their fixes.",
    },
    {
      q: "When would you NOT use events, and prefer a direct call?",
      a: "When the caller needs an immediate, synchronous answer it can't proceed without — a query that returns data, a validation or authorization check, a payment authorization whose result gates the next step. Events are fire-and-forget and eventually consistent, which is wrong when you must have the result now. The common pattern is hybrid: synchronous request/response where an answer is required, and events for everything that can happen asynchronously afterwards (notifications, analytics, downstream updates).",
      tip: "Synchronous when you need the answer now; events for reactions that can happen afterwards. Most systems blend both.",
    },
  ],
  related: [],
};
