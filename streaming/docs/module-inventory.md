# Module Inventory — Streaming Engineering Master Lab

> **Purpose.** A complete, auditable census of every learning surface in the two
> source apps (`kafka/` and `flink/`) that the new `streaming/` lab must preserve.
> This is the authoritative "what exists today" list. Nothing here may be dropped,
> shortened, or replaced with a static diagram during the port — each row is
> reconciled against `content-preservation-manifest.json` and re-verified by
> `scripts/verify-preservation.mjs` (Gate 3).
>
> - **Iteration:** I01 (Kafka half) — *this commit* · I02 adds the Flink half.
> - **Source commit audited:** `kafka/` at current `claude/pensive-ramanujan-alwe61` HEAD.
> - **Hashes:** first 12 hex of `sha256sum` of each file on disk at audit time.
>   They are the tamper-evidence baseline; the port must reproduce equivalent
>   content, and any intentional change is logged as ADAPTED/EXPANDED in the manifest.

---

## 1. Kafka app — architecture facts (context for the port)

- **Modules:** 22 numbered learning modules (`m01`–`m22`), each built via
  `createModuleShell({ tag, title, subtitle, tabs })` with tabbed interactive
  surfaces. Every module ends with an **Interview Q&A** tab (`iq`) wired through
  `createIQSection` / `initIQ` against `data/iq-bank.js`.
- **Pages (non-module routes):** `playground` (Partition Simulator), `glossary`,
  `cheatsheet`, `decisions`, `incident-bank`, `study`, `troubleshoot`, `answers`,
  `home`, `master-map`. Pages are **not** auto-wired by the router — tabbed pages
  self-call `initTabs(container)` inside `mount()`.
- **Simulation engine:** `sim/engine.js` (real murmur2 partitioner, mulberry32
  PRNG, deterministic) with `sim/engine.test.mjs` (12 Node `--test` cases).
  Audited separately in I15; referenced here for completeness.
- **Business scenario today:** Amazon/e-commerce order flow is the worked example
  threaded through the "📦 Amazon …" tabs. In the new lab this becomes **Scenario B
  (E-commerce)**; **Scenario A (Uber mobility)** is added alongside (I20).

---

## 2. Kafka learning modules (m01–m22)

Legend — **canvas**: count of `getContext`/`requestAnimationFrame` sites (live
animated simulators); **iq**: Interview Q&A section present; **tabs**: interactive
surfaces in order. Preservation target for every row below: **PRESERVED** (content
verbatim) unless the manifest explicitly upgrades it to ADAPTED/EXPANDED.

| ID | Title | File | Bytes | Canvas | IQ | sha256:12 |
|----|-------|------|------:|:------:|:--:|-----------|
| m01 | The Problem (Intro) | `modules/m01-intro.js` | 18,574 | 0 | ✔ | `5763e85d2ae1` |
| m02 | Messaging Fundamentals | `modules/m02-messaging.js` | 57,361 | 0 | ✔ | `56854ec06407` |
| m03 | Kafka Architecture | `modules/m03-architecture.js` | 35,306 | 0 | ✔ | `ee609eab1b9f` |
| m04 | Producer Deep Dive | `modules/m04-producer.js` | 20,074 | 3 | ✔ | `d5999547318d` |
| m05 | Broker Internals | `modules/m05-broker.js` | 22,514 | 3 | ✔ | `1439267703db` |
| m06 | Partitions | `modules/m06-partitions.js` | 21,279 | 3 | ✔ | `a16c35ff0e18` |
| m07 | Replication | `modules/m07-replication.js` | 24,593 | 3 | ✔ | `907422831b2b` |
| m08 | Consumer Groups | `modules/m08-consumer-groups.js` | 20,929 | 3 | ✔ | `2e139361329f` |
| m09 | Offsets | `modules/m09-offsets.js` | 20,781 | 3 | ✔ | `8c9fc053f5f5` |
| m10 | Retention & Compaction | `modules/m10-retention.js` | 26,830 | 6 | ✔ | `ea9a519a83f9` |
| m11 | Delivery Guarantees | `modules/m11-delivery.js` | 30,401 | 3 | ✔ | `0cf35cc6a7c1` |
| m12 | Kafka Connect | `modules/m12-connect.js` | 10,391 | 3 | ✔ | `7ba0f2758c47` |
| m13 | Kafka Streams | `modules/m13-streams.js` | 12,439 | 0 | ✔ | `538b0e1912ae` |
| m14 | Schema Registry | `modules/m14-schema-registry.js` | 14,776 | 0 | ✔ | `554d6c91039a` |
| m15 | Security | `modules/m15-security.js` | 17,255 | 3 | ✔ | `ab4b86bbb144` |
| m16 | Monitoring | `modules/m16-monitoring.js` | 12,857 | 3 | ✔ | `fca5e6c683b9` |
| m17 | Performance Tuning | `modules/m17-performance.js` | 12,085 | 3 | ✔ | `11589ea65f1d` |
| m18 | Failure Simulation | `modules/m18-failure.js` | 13,670 | 3 | ✔ | `658d9087229c` |
| m19 | Amazon Pipeline (capstone) | `modules/m19-amazon-pipeline.js` | 13,526 | 3 | ✔ | `2a19d4be2f96` |
| m20 | Kafka vs Competitors | `modules/m20-competitors.js` | 15,723 | 0 | ✔ | `49c38bcf4793` |
| m21 | MirrorMaker 2 | `modules/m21-mirrormaker.js` | 17,726 | 3 | ✔ | `03c42b628940` |
| m22 | Partition Reassignment | `modules/m22-partition-reassignment.js` | 16,782 | 3 | ✔ | `08356e610fae` |

> **Note on canvas=0 modules** (m01, m02, m03, m13, m14, m20): these teach through
> rich HTML/CSS structural diagrams, comparison matrices, and flow walkthroughs —
> not animated canvas. They are **not** candidates for "upgrade to a simulator";
> the preservation rule forbids replacing their working explanatory UI. Any added
> simulation in the new lab is **additive** (NEW), never a replacement.

### 2.1 Interactive surfaces per module (tabs, in order)

- **m01 Intro:** `timeline` 📜 Timeline · `compare` ⚡ Kafka vs Queue · `impact` 🏆 By the Numbers · `iq`
- **m02 Messaging:** `concepts` 📖 Core Concepts · `flow` 🔄 Message Journey · `design` ⚙️ Design Guide · `iq`
- **m03 Architecture:** `diagram` 🏗️ Cluster Diagram · `amazon` 📦 Amazon Order Flow · `kraft` 🔑 KRaft vs ZooKeeper · `iq`
- **m04 Producer:** `pipeline` ⚡ Pipeline Animation · `config` ⚙️ Key Configs · `amazon` 📦 Amazon Story · `iq`
- **m05 Broker:** `segments` 📁 Log Segments · `pagecache` 🧠 Page Cache · `amazon` 📦 Amazon Broker · `iq`
- **m06 Partitions:** `balance` ⚖️ Load Distribution · `hot` 🔥 Hot Partition Demo · `amazon` 📦 Amazon Partitioning · `iq`
- **m07 Replication:** `sim` 💀 Kill-Broker Simulation · `flow` 🔄 Replication Flow · `amazon` 📦 Amazon Durability · `iq`
- **m08 Consumer Groups:** `assign` 👥 Assignment Demo · `rebalance` ⚡ Rebalance Types · `amazon` 📦 Amazon Groups · `iq`
- **m09 Offsets:** `lag` 📍 Lag Visualization · `commit` 💾 Commit Strategies · `amazon` 📦 Amazon Offsets · `iq`
- **m10 Retention:** `retention` 🗑️ Retention Policies · `compaction` 🗜️ Log Compaction · `amazon` 📦 Amazon Retention · `iq`
- **m11 Delivery:** `lanes` 🛡️ 3-Lane Comparison · `eos` ⚛️ EOS Deep Dive · `zombie` 🧟 Zombie Fencing · `amazon` 📦 Amazon Delivery · `iq`
- **m12 Connect:** `flow` 🔌 Connect Flow · `types` 📦 Connector Types · `iq`
- **m13 Streams:** `dsl` 🌊 Stream DSL · `topology` 🗺️ Topology View · `iq`
- **m14 Schema Registry:** `wire` 📡 Wire Format · `compat` 🔄 Compatibility Modes · `iq`
- **m15 Security:** `layers` 🔐 Security Layers · `acl` 📋 ACL Matrix · `iq`
- **m16 Monitoring:** `dashboard` 📊 Live Dashboard · `metrics` 📐 Key Metrics · `iq`
- **m17 Performance:** `producer` ⚡ Producer Tuning · `consumer` 📥 Consumer Tuning · `broker` 🖥️ Broker Tuning · `iq`
- **m18 Failure:** `sim` 💥 Failure Simulator (nodes: p1,p2,b1-b3,c1,c2) · `recovery` 🔄 Recovery Playbook · `iq`
- **m19 Amazon Pipeline:** `pipeline` 🛒 Live Pipeline · `services` 🏗️ Service Map (order→kafka→inv/payment/fraud/notif/rec→snowflake→BI) · `iq`
- **m20 Competitors:** `matrix` 📊 Comparison Matrix · `when` 🗺️ When to Use What · `iq`
- **m21 MirrorMaker 2:** `flow` 🌐 Replication Flow · `modes` 🔄 Deployment Modes · `iq`
- **m22 Partition Reassignment:** `sim` 🔀 Reassignment Sim · `playbook` 📋 Ops Playbook · `iq`

---

## 3. Kafka pages (non-module routes)

| Route | File | Bytes | Tabs | Canvas | sha256:12 | Preservation note |
|-------|------|------:|:----:|:------:|-----------|-------------------|
| playground | `modules/playground.js` | 14,340 | 2 | 3 | `021731f1b41e` | Partition Simulator — real murmur2; self-wires `initTabs`. **Signature feature, preserve exactly.** |
| glossary | `modules/glossary.js` | 13,155 | 0 | 0 | `a91239d5b45e` | Folds into global glossary (I75) — source terms preserved. |
| cheatsheet | `modules/cheatsheet.js` | 5,807 | 0 | 0 | `40b77619b2f2` | Preserve; surfaced under Kafka section. |
| decisions | `modules/decisions.js` | 3,865 | 0 | 0 | `0ab7c1a260c0` | Decision drills — feeds Decision Engine (I64). |
| incident-bank | `modules/incident-bank.js` | 3,365 | 0 | 0 | `e0ee02ac5ef5` | Feeds Incident Lab (I66–I68). |
| study | `modules/study.js` | 4,984 | 0 | 0 | `16ce59f14231` | Study hub — preserve. |
| troubleshoot | `modules/troubleshoot.js` | 3,948 | 0 | 0 | `088433d2266d` | Troubleshooting lab — preserve. |
| answers | `modules/answers.js` | 2,215 | 0 | 0 | `d5ab64e9e22b` | Answer key surface — preserve. |
| home | `modules/home.js` | 7,743 | 0 | 0 | `10400e5a1edf` | Kafka landing — re-shelled under new home (I14). |
| master-map | `modules/master-map.js` | 4,820 | 0 | 0 | `0b80c5639aae` | Concept map — feeds concept graph (I59). |

---

## 4. Kafka data modules (content banks — preserve verbatim)

| File | Bytes | sha256:12 | Role |
|------|------:|-----------|------|
| `data/arch-nodes.js` | 9,436 | *(hashed in I03)* | Architecture diagram node definitions |
| `data/decisions.js` | 13,980 | *(I03)* | Decision-drill content |
| `data/incidents.js` | 20,005 | *(I03)* | Incident scenarios |
| `data/iq-aggregate.js` | 2,384 | *(I03)* | Aggregated interview questions |
| `data/iq-bank.js` | 11,015 | *(I03)* | Per-module interview Q&A |
| `data/progress-store.js` | 1,917 | *(I03)* | localStorage progress (`kafka-*` keys) |
| `data/quiz-bank.js` | 5,373 | *(I03)* | Quiz questions |
| `data/self-explain.js` | 4,138 | *(I03)* | Self-explain prompts |
| `data/tiered.js` | 8,945 | *(I03)* | Tiered-answer content |

> Full sha256 hashes for every data file are recorded in I03's
> `content-preservation-manifest.json`; here they are inventoried so no bank is
> missed during the port.

---

## 5. Kafka audit summary

- **22** learning modules, **10** pages, **9** data banks, **1** simulation engine
  (+ its test file) — **42** source files bearing educational content.
- **16 of 22** modules carry live canvas simulators; **all 22** carry Interview Q&A.
- **Zero** modules are flagged for removal or reduction. Every surface maps to a
  PRESERVED (or, where the manifest upgrades it, ADAPTED/EXPANDED) entry.
- **Next:** I02 appends the Flink half (m01–m19 + m13b, pages, data) to this file.
