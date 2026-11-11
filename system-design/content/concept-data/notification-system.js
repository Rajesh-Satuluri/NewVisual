export default {
  id: "notification-system",
  title: "Design a notification system",
  icon: "🔔",
  chapter: 10,
  group: "Classic designs",
  summary: "Deliver push notifications, SMS, and email to millions of users reliably. The design is about decoupling with queues, fanning out across channels and third-party providers, and handling retries, rate limits, and dedup.",
  widget: "backoff",
  widgetIntro: "Notification delivery leans on **third-party providers** (APNs, FCM, SMS gateways, email) that occasionally fail or throttle. Retrying a failed send immediately — across millions of notifications — amplifies the outage and can get you rate-limited or blocked, making delivery *worse*.\n\nCompare naive retries against **exponential backoff + jitter**. Backoff gives the provider room to recover; jitter desynchronizes your workers so they don't all retry at the same instant. It's the difference between a transient blip and a self-sustaining delivery storm.",
  sections: [
    {
      title: "Requirements",
      body: "Send notifications across multiple channels, triggered by events or scheduled, respecting user preferences, at high volume and reliably.",
      bullets: [
        "Channels: iOS/Android push (APNs/FCM), SMS, email — each via a third-party provider.",
        "Triggered by services (events) or scheduled; honor user opt-in/opt-out per channel.",
        "Reliable delivery with retries; no accidental duplicate spam.",
        "High throughput with soft real-time latency.",
      ],
    },
    {
      title: "High-level flow",
      body: "Services call a notification API, which validates and enqueues the request. Workers consume from per-channel queues and hand off to the right third-party provider, which delivers to the device.",
      flow: ["Service event", "Notification service (validate + user prefs)", "Per-channel queues", "Workers", "Provider (APNs / FCM / SMS / email)", "Device"],
    },
    {
      title: "Why queues are the backbone",
      body: "Message queues (one per channel) decouple the producers from the providers. This gives you buffering against spikes, independent scaling per channel, retry isolation (a flaky SMS provider doesn't block push), and backpressure when a provider is slow or down.",
      rules: ["One queue per channel → independent scaling, retries, and failure isolation."],
    },
    {
      title: "User preferences & contact info",
      body: "Before sending, the system checks a preferences/settings store: is this user opted in to this notification type on this channel? What are their device tokens, phone number, email? Store device tokens keyed by user (a user can have many devices), and prune invalid tokens when providers report them as unregistered.",
    },
    {
      title: "Reliability — retries, dedup, idempotency",
      body: "Delivery to third parties fails intermittently, so build for at-least-once and then de-duplicate.",
      bullets: [
        "**Retries with exponential backoff** on provider errors; a dead-letter queue for repeated failures.",
        "**Idempotency / dedup key** per notification so a retried or re-published event doesn't send twice.",
        "**Rate limiting** per user (notification fatigue) and per provider (respect their quotas).",
        "Track state (queued → sent → delivered → failed) for observability and analytics.",
      ],
    },
    {
      title: "Scaling & deliverability",
      body: "Scale workers per channel independently based on queue depth. For email, deliverability matters (SPF/DKIM, reputation, bounce/complaint handling). For push, batch per provider where APIs allow. Templating and localization usually sit in the notification service so each channel renders appropriately.",
    },
  ],
  qa: [
    {
      q: "How do you make notification delivery reliable without sending duplicates?",
      a: "Accept that third-party delivery is at-least-once and design around it. Retry failed sends with exponential backoff and route exhausted retries to a dead-letter queue for inspection. To avoid duplicates, attach an idempotency/dedup key to each notification (derived from the triggering event) and record which keys have been sent, so a retried worker or a re-published event is a no-op. Also de-dup at the event source where possible.",
      tip: "The pairing is the point: at-least-once delivery + idempotency key = effectively-once from the user's view.",
    },
    {
      q: "Why put message queues between the service and the providers?",
      a: "Queues decouple request acceptance from actual delivery. Benefits: they absorb traffic spikes (buffer), let each channel scale independently, isolate failures (a down SMS provider doesn't stall push), enable clean retry/backoff and dead-letter handling, and provide backpressure when a provider is slow. The API can accept and acknowledge quickly while delivery happens asynchronously.",
      tip: "One queue per channel is the detail — it's what gives independent scaling and failure isolation.",
    },
    {
      q: "How do you prevent notification spam / fatigue?",
      a: "Enforce user preferences (per-type, per-channel opt-in/out) before sending, and apply per-user rate limits and digest/batching rules (e.g. collapse many events into one summary). Respect quiet hours and frequency caps. On the provider side, rate-limit to stay within quotas. Track delivery and engagement so you can suppress channels a user ignores.",
      tip: "Framing it as both a product concern (fatigue, preferences) and a systems concern (rate limits, batching) is the complete answer.",
    },
    {
      q: "How do you handle invalid device tokens and bounced emails?",
      a: "Providers report unregistered/invalid tokens and email bounces asynchronously (callbacks or in the send response). Capture those signals and prune the bad token / mark the email address as bouncing in the contact store, so you stop wasting sends and protect your sender reputation. Persistent hard bounces should disable that channel for the user until they re-verify.",
      tip: "Closing the feedback loop on bounces/invalid tokens is often forgotten — calling it out shows operational maturity.",
    },
  ],
  related: [
    "when-should-i-use-a-queue-vs-direct-rpc",
    "how-do-i-design-dead-letter-queues-and-retry-policies",
    "how-do-i-implement-retries-without-causing-storms-and-loops",
    "idempotency-write-apis",
    "when-do-i-choose-event-driven-over-request-response",
  ],
};
