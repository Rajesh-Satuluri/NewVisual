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

---

# Flink app — inventory (I02)

> **Source commit audited:** `flink/` at current `claude/pensive-ramanujan-alwe61` HEAD.
> Same hashing convention (first 12 hex of `sha256sum`).

## 6. Flink app — architecture facts (context for the port)

- **Modules:** 20 learning modules — `m01`–`m19` plus **`m13b` Savepoints**
  (inserted between Fault Tolerance and Backpressure without renumbering). Each is
  built via `createModuleShell` and carries an **Interview Q&A** section.
- **Narrative spine:** every module is threaded through the canonical ride
  **`R-4471`** (Uber real-time platform) via `components/story-ui.js`
  (`rideSpine`, `rideCallout`, `pyCode`, `scenarioCard`) and `data/ride-story.js`.
  In the new lab this is **Scenario A (Uber mobility)**; **Scenario B (E-commerce)**
  is added alongside (I26).
- **Code snippets:** verified **PyFlink** in `data/pyflink-snippets.js` (+ a `.py`
  mirror). Technical-accuracy anchor for the Flink curriculum.
- **Pages:** `home`, `learning-path`, `comparison`, `master-map`, `glossary`,
  `cheatsheet`, `study`.

> ⚠️ **On-disk filename drift (critical for the port).** After the Phase-5 label
> realignment, several *files* kept historical names while their *content* moved.
> The **nav label is the source of truth**; the port must carry content by label,
> not by filename. The table's "File (on disk)" column records the drift so nothing
> is mis-mapped. This drift is logged again in `content-preservation-manifest.json`.

## 7. Flink learning modules (nav order)

Legend — **Big-idea**: the module's one-line hook string (not its label);
**canvas**: animated-simulator sites; **IQ**: interview Q&A count.

| # | Label (nav — source of truth) | File (on disk) | Big-idea hook | Bytes | Canvas | IQ | sha256:12 |
|---|-------------------------------|----------------|---------------|------:|:------:|:--:|-----------|
| 1 | Why Apache Flink | `m01-intro.js` | "True Low Latency" | 22,029 | 0 | 6 | `1e657beb2df2` |
| 2 | Streaming Fundamentals | `m02-streaming-fundamentals.js` | "Streaming Fundamentals" | 30,194 | 3 | 5 | `6450b133a4d0` |
| 3 | Flink Architecture | `m03-architecture.js` | "Distribute the compute" | 49,658 | 0 | 19 | `85675f9e59ca` |
| 4 | Job Lifecycle | `m04-job-lifecycle.js` | "Compile code to a plan" | 24,249 | 0 | 3 | `eb5b4da592e7` |
| 5 | Parallelism | `m05-parallelism.js` | "Scale throughput" | 23,606 | 0 | 4 | `d9ee54c40665` |
| 6 | Operators | `m06-data-flow.js` ⚠️drift | "Reshape every record" | 25,407 | 0 | 4 | `04e691d37ce3` |
| 7 | Sources & Sinks | `m07-operators.js` ⚠️drift | "Bridge two worlds" | 30,203 | 1 | 3 | `1ac5b3112a06` |
| 8 | Time Concepts | `m08-time-concepts.js` | "Time Concepts in Flink" | 26,238 | 0 | 7 | `9ac0b80cafaf` |
| 9 | Watermarks | `m09-watermarks.js` | "Events arrive out of order" | 27,367 | 0 | 4 | `8f4e580a2d14` |
| 10 | Windows | `m10-windows.js` | "Bound the unbounded" | 25,656 | 0 | 5 | `63febf72e7f7` |
| 11 | State Management | `m11-state-management.js` | "Counting & aggregating" | 26,543 | 0 | 5 | `ed53196a4b20` |
| 12 | Checkpointing | `m12-checkpointing.js` | "State lives in memory" | 28,673 | 4 | 5 | `691df988619c` |
| 13 | Fault Tolerance | `m13-savepoints.js` ⚠️drift | "Hardware will fail" | 26,861 | 0 | 4 | `4eab3a1ee81a` |
| 13b | **Savepoints** | `m13b-savepoints.js` | "Savepoints" | 16,875 | 0 | 5 | `44413e3b98c9` |
| 14 | Backpressure | `m14-fault-tolerance.js` ⚠️drift | "Match speeds automatically" | 27,295 | 2 | 4 | `7bef4dee3a13` |
| 15 | Flink SQL & Table API | `m15-backpressure.js` ⚠️drift | "Say what, not how" | 27,796 | 0 | 3 | `540658846265` |
| 16 | Connectors | `m16-connectors.js` | "Flink stores nothing" | 23,757 | 0 | 3 | `24b844da829f` |
| 17 | Flink SQL (Advanced) | `m17-flink-sql.js` | "Detect sequences" | 21,857 | 0 | 3 | `95a8129ff6a6` |
| 18 | Performance | `m18-performance.js` | "Set parallelism per operator" | 26,934 | 0 | 2 | `23ded0f5b237` |
| 19 | Uber Pipeline (capstone) | `m19-uber-pipeline.js` | — | 21,185 | 0 | 3 | `76922a7fb36a` |

> **Drift map (label → on-disk file):** Operators→`m06-data-flow.js`;
> Sources & Sinks→`m07-operators.js`; Fault Tolerance→`m13-savepoints.js`;
> Backpressure→`m14-fault-tolerance.js`; Flink SQL & Table API→`m15-backpressure.js`.
> All other labels match their filename stem.
>
> **Canvas note:** Flink modules lean on structural diagrams and PyFlink code
> walkthroughs rather than canvas animation (6 of 20 use canvas). As with Kafka,
> these explanatory UIs are PRESERVED, not "upgraded"; new simulators are additive.

## 8. Flink pages

| Route | File | Bytes | sha256:12 | Preservation note |
|-------|------|------:|-----------|-------------------|
| home | `modules/home.js` | 7,594 | `07666953eb8f` | Re-shelled under new home (I14) |
| learning-path | `modules/learning-path.js` | 24,568 | `b84659cd2b69` | Feeds learning paths (I76) |
| comparison | `modules/comparison.js` | 7,969 | `dfa34b3301cb` | Feeds comparison engine (I60) |
| master-map | `modules/master-map.js` | 4,059 | `ab2ef18a6025` | Feeds concept graph (I59) |
| glossary | `modules/glossary.js` | 7,518 | `040e0530e2e7` | Folds into global glossary (I75) |
| cheatsheet | `modules/cheatsheet.js` | 4,487 | `deea080dca4c` | Preserve under Flink section |
| study | `modules/study.js` | 6,732 | `c7d2143c0546` | Study hub — preserve |

## 9. Flink data modules (preserve verbatim)

| File | Bytes | sha256:12 | Role |
|------|------:|-----------|------|
| `data/ride-story.js` | 14,475 | `b7ad124b1afd` | Canonical ride R-4471 spine + CONCEPT_INDEX |
| `data/pyflink-snippets.js` | 18,026 | `fe8d07e791e2` | Verified PyFlink code (accuracy anchor) |
| `data/pyflink-snippets.py` | 19,058 | *(mirror)* | `.py` mirror of the snippets |
| `data/interview-cases.js` | 27,232 | `1a98cb831417` | Interview scenario catalogue |
| `data/iq-bank.js` | 5,728 | `34ba5053c42d` | Per-module interview Q&A |
| `data/quiz-bank.js` | 2,887 | `64586d6ffa4d` | Quiz questions |

## 10. Flink components (evaluated for the shared layer in I04/I08)

| File | Bytes | Role |
|------|------:|------|
| `components/module-shell.js` | 2,364 | `createModuleShell`/`initTabs` (⚠️ diverged from Kafka's — see component-inventory) |
| `components/nav.js` | 8,532 | Sidebar nav (20-module tree + reference) |
| `components/story-ui.js` | 6,595 | Ride-spine story primitives (Flink-unique) |
| `components/quiz.js` | 4,381 | Quiz renderer |
| `components/command-palette.js` | 3,726 | ⌘K palette |
| `components/tour.js` | 4,111 | First-visit tour |
| `components/toast.js` | 930 | Toast notifications |
| `components/pager.js` | 1,220 | Prev/next pager |

---

## 11. Combined audit totals (Kafka + Flink)

- **Learning modules:** 22 (Kafka) + 20 (Flink) = **42**.
- **Pages:** 10 (Kafka) + 7 (Flink) = **17**.
- **Data banks:** 9 (Kafka) + 6 (Flink) = **15**.
- **Simulation/code assets:** Kafka `sim/engine.js` (+test); Flink PyFlink snippets (+`.py`).
- **Zero** surfaces flagged for removal or reduction across both apps.
- **5** Flink modules carry on-disk filename drift (label ≠ filename) — mapped above.
- **Next:** I03 writes `content-preservation-manifest.json` with full (not truncated)
  sha256 hashes and PRESERVED/ADAPTED/EXPANDED/NEW tags for every file above.
