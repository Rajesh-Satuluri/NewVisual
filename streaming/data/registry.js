// Content registry — the section map + stable IDs (I10)
// Single source of truth for nav, routing, breadcrumbs, progress totals,
// and (later) search + concept graph. Each section has a stable id used in the hash.

export const SECTIONS = [
  { id: 'home', icon: '🏠', title: 'Home', group: null, status: 'live', breadcrumb: '<strong>🏠 Home</strong>' },

  { id: 'foundations', icon: '🧱', title: 'Foundations', group: 'Learn', status: 'live', gate: 'Gate 4',
    breadcrumb: 'Learn &rsaquo; <strong>🧱 Foundations</strong>',
    blurb: 'Streaming from first principles — events, partitions, time, watermarks, windows, state, checkpoints, delivery guarantees, backpressure, observability.' },

  { id: 'kafka', icon: '📨', title: 'Apache Kafka', group: 'Engines', status: 'live', gate: 'Gate 3', tech: 'kafka', url: 'kafka/',
    breadcrumb: 'Engines &rsaquo; <strong>📨 Apache Kafka</strong>',
    blurb: '22 interactive modules ported with 100% preservation — real murmur2 partition simulator, replication, consumer groups, delivery guarantees, and more.' },

  { id: 'flink', icon: '🌀', title: 'Apache Flink', group: 'Engines', status: 'live', gate: 'Gate 3', tech: 'flink', url: 'flink/',
    breadcrumb: 'Engines &rsaquo; <strong>🌀 Apache Flink</strong>',
    blurb: '20 modules on the canonical ride R-4471 — watermarks, windows, state, checkpointing, savepoints, backpressure, with verified PyFlink.' },

  { id: 'aws', icon: '☁️', title: 'Cloud · AWS', group: 'Cloud', status: 'live', gate: 'Gate 5a',
    breadcrumb: 'Cloud &rsaquo; <strong>☁️ AWS</strong>',
    blurb: 'Kinesis, MSK, Managed Service for Apache Flink, Firehose — validated against official AWS docs.' },

  { id: 'azure', icon: '🔷', title: 'Cloud · Azure', group: 'Cloud', status: 'live', gate: 'Gate 5b',
    breadcrumb: 'Cloud &rsaquo; <strong>🔷 Azure</strong>',
    blurb: 'Event Hubs, Stream Analytics — partitions, consumer groups, capture, windowing.' },

  { id: 'databricks', icon: '🧮', title: 'Cloud · Databricks', group: 'Cloud', status: 'live', gate: 'Gate 5c',
    breadcrumb: 'Cloud &rsaquo; <strong>🧮 Databricks</strong>',
    blurb: 'Structured Streaming, Auto Loader, Delta Lake, Lakeflow Declarative Pipelines (DLT), the medallion architecture — validated against official Databricks docs.' },

  { id: 'engines', icon: '⚙️', title: 'Compare & Engines', group: 'Build', status: 'live', gate: 'Gate 6',
    breadcrumb: 'Build &rsaquo; <strong>⚙️ Compare & Engines</strong>',
    blurb: 'Comparison matrix, concept graph, Trace One Event, Break the Pipeline, Architecture Builder, Decision Engine, capacity calculator.' },

  { id: 'incident', icon: '🚨', title: 'Incident Lab', group: 'Practice', status: 'live', gate: 'Gate 7',
    breadcrumb: 'Practice &rsaquo; <strong>🚨 Incident Lab</strong>',
    blurb: '15 production incidents — diagnose, decide, and learn the recovery playbook.' },

  { id: 'sysdesign', icon: '📐', title: 'System Design Lab', group: 'Practice', status: 'live', gate: 'Gate 7',
    breadcrumb: 'Practice &rsaquo; <strong>📐 System Design Lab</strong>',
    blurb: 'Requirements → technology choices → evaluated feedback on your streaming designs.' },

  { id: 'interview', icon: '🎯', title: 'Interview Master', group: 'Practice', status: 'live', gate: 'Gate 7',
    breadcrumb: 'Practice &rsaquo; <strong>🎯 Interview Master</strong>',
    blurb: 'Hundreds of questions across fundamentals, Kafka, Flink, cloud, system design, and rapid-fire.' },

  { id: 'dashboard', icon: '📊', title: 'Dashboard', group: 'You', status: 'live', gate: 'Gate 8',
    breadcrumb: 'You &rsaquo; <strong>📊 Dashboard</strong>',
    blurb: 'Your progress, mastery, weak concepts, and a recommended next step.' },

  { id: 'paths', icon: '🧭', title: 'Learning paths', group: 'You', status: 'live', gate: 'Gate 8',
    breadcrumb: 'You &rsaquo; <strong>🧭 Learning paths</strong>',
    blurb: 'Curated routes through the lab for a specific goal — beginner, cloud tour, interview prep, on-call.' },

  { id: 'glossary', icon: '📖', title: 'Glossary', group: 'You', status: 'live', gate: 'Gate 8',
    breadcrumb: 'You &rsaquo; <strong>📖 Glossary</strong>',
    blurb: 'Every streaming term at two depths — plain-language and practitioner-level.' },

  { id: 'search', icon: '🔍', title: 'Search', group: 'You', status: 'live', gate: 'Gate 8',
    breadcrumb: 'You &rsaquo; <strong>🔍 Search</strong>',
    blurb: 'Find any module, tool, incident, question, or term across the lab.' },
];

// The 12 primary sections that count toward the top-level progress ring.
export const PRIMARY_IDS = SECTIONS.map(s => s.id);

export const byId = (id) => SECTIONS.find(s => s.id === id);

// Nav grouping order
export const NAV_GROUPS = ['Learn', 'Engines', 'Cloud', 'Build', 'Practice', 'You'];
