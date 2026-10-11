// Generic section page for roadmap sections (I14 support).
// Renders a polished "what's coming" page per registry entry, with the active
// scenario reflected — proving the scenario switcher drives real content today.
import { byId } from '../data/registry.js';
import { getScenario } from '../data/scenarios.js';
import { pageHead, scenarioBanner } from '../components/module-shell.js';

// Per-section preview bullets of what the finished section will contain.
const PREVIEW = {
  foundations: ['Why streaming · events & streams · producers/brokers/consumers',
    'Partitions/shards · offsets & replay · event vs processing time',
    'Watermarks · windows · state · checkpointing & recovery',
    'Delivery guarantees · backpressure · observability · reference architecture'],
  kafka: ['22 modules ported with 100% content preservation',
    'Real murmur2 Partition Simulator (12/12 engine tests)',
    'Replication, consumer groups, delivery guarantees, EOS, zombie fencing',
    'Per-module interview Q&A + incident drills'],
  flink: ['20 modules on the canonical ride R-4471',
    'Watermarks, windows, state, checkpointing, savepoints, backpressure',
    'Verified PyFlink snippets throughout',
    'Flink SQL & Table API, connectors, performance, capstone pipeline'],
  aws: ['Kinesis Data Streams — shards, sequence numbers, retention, scaling',
    'MSK & MSK Serverless vs Kinesis', 'Managed Service for Apache Flink',
    'Firehose, Lambda, S3 patterns — validated against official AWS docs'],
  azure: ['Event Hubs — partitions, consumer groups, capture, throughput units',
    'Kafka-protocol surface', 'Stream Analytics windowing & semantics'],
  databricks: ['Structured Streaming — triggers, checkpointing, exactly-once sinks',
    'Delta Live Tables & Autoloader', 'Medallion (Bronze/Silver/Gold) architecture'],
  engines: ['Side-by-side comparison matrix', 'Concept graph across all technologies',
    'Trace One Event · Break the Pipeline · Architecture Builder',
    'Technology Decision Engine · capacity calculator (stated assumptions)'],
  incident: ['15 production incidents to diagnose', 'Predict-then-reveal fault injection',
    'Recovery playbooks grounded in both scenarios'],
  sysdesign: ['Requirements → technology choices → evaluated feedback',
    'Designs scored against real trade-offs'],
  interview: ['Hundreds of questions: fundamentals, Kafka, Flink, cloud, system design',
    'Rapid-fire mode', 'Multi-level model answers (beginner → senior)'],
  dashboard: ['Progress & mastery across all sections', 'Weak-concept detection',
    'Recommended next step tailored to you'],
};

export function mount(container, sectionId) {
  const s = byId(sectionId);
  if (!s) { container.innerHTML = `<div class="card">Unknown section.</div>`; return; }
  const sc = getScenario();
  const preview = PREVIEW[sectionId] || [];

  container.innerHTML = `
    ${pageHead({ eyebrow: s.group || '', title: `${s.icon} ${s.title}`, sub: s.blurb })}
    ${scenarioBanner()}
    <div class="grid cols-2">
      <div class="card">
        <h3 style="margin-top:0">What this section will contain</h3>
        <ul class="clean">${preview.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h3 style="margin-top:0">How it applies to your scenario</h3>
        <p style="color:var(--text2);font-size:14px">In the <b>${sc.name}</b> scenario, the worked
          example is <b>${sc.canonicalId}</b>, keyed on <b>${sc.keyField}</b>.</p>
        <p style="color:var(--text2);font-size:14px">${sc.whyOrdering}</p>
        <div style="margin-top:14px;font-size:12px;color:var(--text3)">Pipeline:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          ${sc.pipeline.map(p => `<span class="pill soon" style="text-transform:none">${p}</span>`).join('<span style="color:var(--text3)">→</span>')}
        </div>
      </div>
    </div>
    <div class="roadmap-note" style="margin-top:20px">
      🚧 <b>Arriving in ${s.gate || 'a later gate'}.</b> The shell, routing, theming, and scenario
      switcher are live now; this section's interactive content is built in that gate per the
      implementation roadmap. Switch the scenario above to see this page re-frame instantly.
    </div>
  `;
}
