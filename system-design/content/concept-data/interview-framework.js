export default {
  id: "interview-framework",
  title: "A framework for system design interviews",
  icon: "🗺️",
  chapter: 3,
  group: "Foundations",
  summary: "A system design interview is not about the 'right' answer — it's about how you navigate ambiguity and trade-offs. A reliable 4-step structure: scope the problem, sketch a high-level design, deep-dive the hard parts, then wrap up. Spend the time deliberately.",
  sections: [
    {
      title: "What the interviewer is actually testing",
      body: "They want to see how you think, collaborate, and handle open-ended ambiguity — not whether you memorized a particular architecture. Strong signals: asking good clarifying questions, making assumptions explicit, proposing a reasonable design, and discussing trade-offs honestly rather than claiming one true answer.",
      rules: ["There is no single correct design — only well-justified trade-offs."],
    },
    {
      title: "Step 1 — Understand the problem & scope (≈ 3–10 min)",
      body: "Resist the urge to jump into boxes and arrows. First, pin down what you're building and for whom.",
      bullets: [
        "**Functional requirements:** what must it do? (e.g. post a tweet, follow users, see a feed.)",
        "**Non-functional requirements:** scale, latency, availability, consistency, durability.",
        "**Constraints & scale:** DAU, read:write ratio, data size, QPS — do quick back-of-envelope math.",
        "**Explicitly out of scope:** say what you're *not* designing, to bound the problem.",
      ],
      body2: "Narrow the problem with the interviewer before designing. A focused design beats a sprawling one.",
    },
    {
      title: "Step 2 — Propose a high-level design (≈ 10–15 min)",
      body: "Draw the big boxes and the data flow: clients, load balancer, web/API tier, services, databases, cache, queues. Walk one or two core use cases end-to-end through the diagram so the interviewer can follow the request path.",
      body2: "Sketch the **API** (a few key endpoints) and the **data model** (main entities and the key access patterns). Keep it high level — depth comes next.",
      flow: ["Client", "Load balancer", "API / services", "Cache + DB", "Queue + workers"],
    },
    {
      title: "Step 3 — Deep dive (≈ 10–25 min)",
      body: "Pick the parts that actually matter for this problem and go deep. The interviewer usually steers you here, or you choose the bottleneck.",
      bullets: [
        "The hardest/most scalable component (feed fan-out, matching engine, dedup, geo-index).",
        "The data model and indexing for the dominant access pattern.",
        "Scaling the bottleneck: caching, sharding, replication, async processing.",
        "Failure modes: what happens when a component dies? Hot keys? Thundering herds?",
      ],
      body2: "Name trade-offs out loud: consistency vs availability, latency vs cost, simplicity vs flexibility.",
    },
    {
      title: "Step 4 — Wrap up (≈ 3–5 min)",
      body: "Summarize the design and its key trade-offs. Call out bottlenecks and how you'd evolve it: what you'd monitor, where it would break next at 10×, and what you deliberately left simple. This shows you see the system as something that lives and grows, not a one-off diagram.",
      rules: ["End with: bottlenecks, what you'd monitor, and the next scaling step."],
    },
    {
      title: "Time management & common mistakes",
      body: "The clock is the real adversary. Budget the four steps and keep moving.",
      bullets: [
        "**Don't** start drawing before scoping — you'll design the wrong thing.",
        "**Don't** over-engineer — no need for 12 microservices and 5 queues on day one.",
        "**Don't** go silent — think out loud so the interviewer can collaborate and redirect.",
        "**Do** state assumptions, do the quick math, and lead with the dominant access pattern.",
      ],
    },
  ],
  qa: [
    {
      q: "How do you structure a system design interview from scratch?",
      a: "Four steps, time-boxed:",
      bullets: [
        "**Scope (3–10 min):** clarify functional + non-functional requirements, estimate scale, state what's out of scope.",
        "**High-level design (10–15 min):** big boxes, data flow, a sketch of the API and data model; walk a core use case end-to-end.",
        "**Deep dive (10–25 min):** go deep on the bottleneck(s) — data model, scaling, failure modes — naming trade-offs.",
        "**Wrap up (3–5 min):** summarize, call out bottlenecks and what you'd monitor and evolve.",
      ],
      tip: "Saying the time budget out loud (\"let me spend a few minutes scoping first\") signals that you've done this before and manage the clock deliberately.",
    },
    {
      q: "What clarifying questions should you ask before designing?",
      a: "Enough to bound the problem and reveal its hard part:",
      bullets: [
        "**Functional:** which features are in scope? (Don't design the whole product.)",
        "**Scale:** how many users / QPS / data volume? What's the read:write ratio?",
        "**Non-functional:** latency target? Availability vs consistency priority? Durability?",
        "**Clients & constraints:** mobile/web? Global? Any existing systems to integrate?",
      ],
      tip: "The read:write ratio and the latency/consistency priority are the two answers that most change the architecture — always get those.",
    },
    {
      q: "Functional vs non-functional requirements — what's the difference and why care?",
      a: "**Functional** requirements are what the system does (post a message, search, pay). **Non-functional** requirements are the qualities it must have (handle 100K QPS, p99 < 200 ms, 99.99% available, strong vs eventual consistency). Non-functional requirements usually drive the architecture far more than functional ones — \"must be globally available with low latency\" forces multi-region and CDNs regardless of the feature set.",
      tip: "Candidates who only gather functional requirements design a toy. Pinning non-functional targets early is what makes the rest of the interview coherent.",
    },
  ],
  related: [
    "how-do-i-explain-my-design-to-a-junior-dev-so-they-truly-get",
    "how-do-i-defend-trade-offs-to-a-sceptical-architect",
    "how-do-i-write-a-design-doc-that-survives-3-years-of-evoluti",
    "how-do-i-know-when-a-design-is-over-engineered",
    "how-do-i-design-something-mvp-first-that-can-still-grow",
  ],
};
