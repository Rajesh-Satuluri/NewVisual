export default {
  id: "distributed-email",
  title: "Design a distributed email service",
  icon: "📧",
  chapter: 23,
  group: "Data & infra systems",
  summary: "Build Gmail-scale email: send and receive mail reliably over SMTP, store billions of messages, and make mailboxes searchable. The design spans protocol gateways, metadata-vs-blob storage, a dedicated search index, and reliable async delivery.",
  widget: "email-pipeline",
  widgetIntro: "Outbound email is fundamentally a **queue** problem. A submitted message enters an outbound queue so submission never blocks on a slow recipient; a worker then attempts delivery to the recipient's mail server, and each attempt ends one of three ways: **delivered**, a **transient failure** (requeue and retry with backoff), or a **hard bounce** (give up and notify the sender).\n\nSend a burst of mail and watch the queue drain through those outcomes. Decoupling submission from delivery, and retrying transient failures, is exactly how real mail systems stay reliable against flaky downstream servers.",
  sections: [
    {
      title: "Requirements",
      body: "Send and receive email, store it durably per user, and let users search and read their mailbox quickly.",
      bullets: [
        "Send (SMTP out) and receive (SMTP in) email reliably.",
        "Store huge volumes of mail per user, durably.",
        "Fast mailbox reads (list, open) and full-text search.",
        "Spam/virus filtering; retries for transient delivery failures.",
      ],
    },
    {
      title: "Protocols & gateways",
      body: "Email interoperates via standard protocols: **SMTP** for server-to-server send/receive, **IMAP/POP** for clients to fetch mail. Incoming mail hits SMTP servers (MX records point here); outgoing mail is relayed via SMTP to recipient domains. A web/API layer serves modern clients. These gateways are the system's edge.",
      flow: ["Sender", "Outbound SMTP relay", "Recipient MX / inbound SMTP", "Store in mailbox", "Client reads via IMAP/API"],
    },
    {
      title: "Storage: metadata, bodies, attachments",
      body: "Split storage by shape, as with other large systems. **Metadata** (from, to, subject, folder, read/unread, labels, timestamps) is structured and queried constantly → a database, sharded by user. **Message bodies and attachments** are large blobs → object/blob storage. Attachments are often deduplicated by content hash (the same file mailed to many recipients is stored once).",
      rules: ["Metadata in a (user-sharded) DB; bodies & attachments in blob storage; dedup attachments by hash."],
    },
    {
      title: "Search",
      body: "Mailbox search is full-text over potentially millions of messages per user, which a normal database can't do well. Use a dedicated **search index** (Elasticsearch-style inverted index), updated asynchronously when mail arrives. The index stores tokens → message IDs per user; queries hit the index, then hydrate results from metadata/blob storage.",
      flow: ["New mail", "Async index (tokenize body + headers)", "Search query → inverted index → message IDs", "Hydrate + return"],
    },
    {
      title: "Reliable delivery",
      body: "Delivery to external servers fails transiently (greylisting, downtime), so outgoing mail goes through a **queue** with retries and exponential backoff, and a dead-letter/bounce path for permanent failures. This decouples the send API from the slow, flaky SMTP delivery and gives durability and backpressure — the same queue-based pattern as a notification system.",
      bullets: [
        "Outbound queue + retry with backoff; bounce handling for hard failures.",
        "Inbound filtering (spam/virus) before storing.",
        "At-least-once delivery; dedup on message ID.",
      ],
    },
    {
      title: "Scale",
      body: "Shard everything by user (mailboxes, metadata, index) since a user's mail is self-contained — this localizes reads/writes and search. Cache recent/opened messages. Reads (opening the inbox) dominate, so replicate metadata and keep hot messages cached; the long tail lives in blob storage.",
    },
  ],
  qa: [
    {
      q: "How do you store email given the volume, and why split it up?",
      a: "Separate by data shape. Message metadata (sender, recipients, subject, labels, read state, timestamps) is small, structured, and queried constantly to render the inbox — put it in a database sharded by user. Message bodies and attachments are large, mostly-immutable blobs — put them in object/blob storage, and dedup attachments by content hash so one file mailed to many people is stored once. This lets the inbox listing be fast and cheap while bulk content sits in cheap durable storage.",
      tip: "Metadata-DB + blob-bodies + attachment dedup is the storage answer, mirroring Drive/YouTube/S3.",
    },
    {
      q: "How do you make mailbox search fast?",
      a: "Don't search the database — maintain a dedicated inverted index (Elasticsearch-style) updated asynchronously as mail arrives, keyed per user (tokens → message IDs). Queries hit the index to get matching message IDs, then hydrate the display data from metadata and blob storage. Sharding the index by user keeps each user's search self-contained and scalable. The async update means a newly arrived message is searchable within seconds, which is acceptable.",
      tip: "A separate inverted index updated async, sharded by user, is the search answer — a SQL LIKE scan won't scale.",
    },
    {
      q: "How do you deliver outbound email reliably when remote servers are flaky?",
      a: "Put outbound mail on a durable queue and have workers relay it via SMTP with retries and exponential backoff, since remote servers frequently greylist or are temporarily down. Permanent failures route to a bounce/dead-letter path that notifies the sender. This decouples the fast send API from slow, unreliable delivery, provides backpressure, and makes delivery at-least-once — dedup on message ID prevents duplicates. It's the same queue+retry pattern as a notification system.",
      tip: "Queue + retry/backoff + bounce handling; note the parallel to the notification system's delivery path.",
    },
    {
      q: "What are the main protocols and where do they sit?",
      a: "SMTP handles server-to-server transfer — inbound mail arrives at your SMTP servers (pointed to by the domain's MX records) and outbound mail is relayed via SMTP to recipient domains. IMAP and POP let mail clients fetch and sync messages (IMAP keeps server-side state/folders; POP downloads). A web/API layer serves browser and mobile clients. These are the edge gateways in front of your storage, search, and delivery subsystems.",
      tip: "SMTP (transfer, MX), IMAP/POP (client fetch), API (modern clients) — placing each correctly shows protocol literacy.",
    },
  ],
  related: [
    "how-do-i-decide-between-sql-nosql-and-search-engines",
    "when-should-i-use-a-queue-vs-direct-rpc",
    "how-do-i-design-dead-letter-queues-and-retry-policies",
    "how-do-i-implement-retries-without-causing-storms-and-loops",
    "how-do-i-handle-multi-tenant-data-isolation",
  ],
};
