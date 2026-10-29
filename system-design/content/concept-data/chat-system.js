export default {
  id: "chat-system",
  title: "Design a chat system",
  icon: "💬",
  chapter: 12,
  group: "Classic designs",
  summary: "Real-time 1:1 and group messaging (WhatsApp/Messenger style). The hard parts: pushing messages to online users over persistent connections, storing and ordering messages, presence, and delivery to users who are offline.",
  sections: [
    {
      title: "Requirements",
      body: "Low-latency delivery of messages between users, with history, delivery/read receipts, presence, and support for group chats.",
      bullets: [
        "1:1 and group messaging with low latency.",
        "Message history, delivery & read receipts.",
        "Online presence (who's available).",
        "Offline users receive messages when they reconnect; push notify them.",
      ],
    },
    {
      title: "Why HTTP request/response isn't enough",
      body: "The server needs to **push** a message to the recipient the instant it arrives — but plain HTTP is client-initiated. The standard solution is a persistent, bidirectional connection via **WebSocket** (long-polling is the older fallback). The sender's message travels over HTTP/WebSocket to the server; the server pushes it down the recipient's open WebSocket.",
      flow: ["Sender", "Chat server (WebSocket)", "Message store + queue", "Recipient's WebSocket", "Recipient"],
    },
    {
      title: "Connection management",
      body: "Each online user holds a WebSocket to some chat server. Because connections are stateful, the system tracks **which server each user is connected to** in a presence/routing store (e.g. Redis). To deliver a message, the server looks up the recipient's connection server and forwards it there (often via a message queue / pub-sub between servers).",
      rules: ["Stateful connections → a user→server routing table is mandatory to find where to push."],
    },
    {
      title: "Message storage & ordering",
      body: "Messages are write-heavy and accessed by conversation, so a wide-column store (Cassandra/HBase) keyed by (conversation_id, message_id) works well. Ordering within a conversation is critical: use a per-conversation sequence number or a time-sortable ID (Snowflake) so clients can order and detect gaps — don't rely on wall-clock timestamps across servers.",
      bullets: [
        "Partition by conversation_id; sort by a monotonic message sequence/ID.",
        "Per-conversation sequence guarantees order even with clock skew.",
        "Idempotent message IDs (client-generated) dedup retried sends.",
      ],
    },
    {
      title: "Online vs offline delivery",
      body: "If the recipient is online, push immediately over their WebSocket. If offline, persist the message and deliver on reconnect (the client syncs messages since its last-seen sequence), plus send a push notification via APNs/FCM. Delivery receipts flow back the same way: delivered when the recipient's device acknowledges, read when they open the chat.",
      flow: ["Message arrives", "Recipient online? push via WebSocket : store + push notification", "On reconnect: sync from last-seen sequence"],
    },
    {
      title: "Group chat",
      body: "For small groups, fan out the message to each member's connection (like a mini feed fan-out). For large groups, that fan-out gets expensive, so you cap group size or use a shared conversation inbox that members pull from. Each member tracks their own last-read position for per-user receipts and unread counts.",
    },
  ],
  qa: [
    {
      q: "How does the server push a message to a recipient in real time?",
      a: "Over a persistent connection. Each online client holds a WebSocket to a chat server. When a message arrives, the server finds where the recipient is connected via a user→server routing table (e.g. in Redis), forwards the message to that server (commonly through an inter-server pub/sub or queue), and that server pushes it down the recipient's WebSocket. Long-polling is the legacy fallback where WebSockets aren't available.",
      tip: "The must-haves: WebSockets for push + a routing/presence table because connections are stateful and spread across many servers.",
    },
    {
      q: "How do you guarantee messages appear in the right order?",
      a: "Assign each message a per-conversation monotonic sequence number (or a time-sortable ID like Snowflake) at the server, and store/partition messages by conversation_id ordered by that sequence. Clients order by sequence and can detect gaps (missing numbers) to request a resync. Avoid relying on wall-clock timestamps for ordering because clocks differ across servers.",
      tip: "Per-conversation sequence (not global clock) is the key — it sidesteps clock skew and makes gap detection trivial.",
    },
    {
      q: "What happens when the recipient is offline?",
      a: "Persist the message durably and mark it undelivered. Send a push notification via APNs/FCM so the user knows. When the client reconnects, it syncs all messages after its last-acknowledged sequence number, then the server marks them delivered. Read receipts are sent when the user actually opens the conversation. This 'sync from last-seen sequence' pattern also recovers from dropped connections.",
      tip: "Framing offline delivery as 'store + notify + sync-from-last-seen' covers reconnection and dropped-connection recovery in one mechanism.",
    },
    {
      q: "How do you handle group chat fan-out?",
      a: "For small/medium groups, fan the message out to each member — look up each member's connection and push, store once per conversation. For very large groups, per-message fan-out to every member's connection is costly, so systems cap group size or switch to a shared conversation inbox that members read from (pull), with each member tracking their own last-read position for unread counts and receipts.",
      tip: "Note the parallel to news-feed fan-out on write vs read — small groups push, huge groups pull.",
    },
  ],
  related: [
    "how-do-i-choose-between-synchronous-and-asynchronous-communi",
    "how-do-i-handle-ordering-of-events-when-it-matters",
    "how-do-i-design-id-generation-that-works-across-regions",
    "how-do-i-handle-exactly-once-vs-at-least-once-semantics-in-p",
    "idempotency-write-apis",
  ],
};
