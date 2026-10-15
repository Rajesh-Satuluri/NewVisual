// Platform switcher registry (I50) — the six segments of the unified
// Engines & Clouds experience. One segmented control swaps between them in
// place (no page reload); Compare is a special full-width segment.
//
// kind:
//   'frame'   → render the byte-preserved sub-app (Kafka/Flink) in an embedded
//               frame. We never mutate those apps, so preservation stays 93/93.
//   'cloud'   → render the in-shell provider dataset (AWS/Azure/Databricks)
//               natively via the lesson shell.
//   'compare' → render the comparison hub (engines module).
export const PLATFORMS = [
  { id: 'kafka',      short: 'Kafka',       label: 'Apache Kafka',           tagline: '22 modules · murmur2 partitioning, ISR, consumer groups', accent: '#FF6900', kind: 'frame', url: 'kafka/' },
  { id: 'flink',      short: 'Flink',       label: 'Apache Flink',           tagline: '20 modules · watermarks, windows, state, checkpoints',    accent: '#E6526F', kind: 'frame', url: 'flink/' },
  { id: 'aws',        short: 'AWS',         label: 'Cloud · AWS',            tagline: 'Kinesis, MSK, Managed Service for Flink, Firehose',       accent: '#FF9900', kind: 'cloud', provider: 'aws' },
  { id: 'azure',      short: 'Azure',       label: 'Cloud · Azure',          tagline: 'Event Hubs, Stream Analytics',                            accent: '#3B9EFF', kind: 'cloud', provider: 'azure' },
  { id: 'databricks', short: 'Databricks',  label: 'Cloud · Databricks',     tagline: 'Structured Streaming, Auto Loader, Delta, DLT',           accent: '#FF5F46', kind: 'cloud', provider: 'databricks' },
  { id: 'compare',    short: '⇄ Compare',   label: 'Compare engines & clouds', tagline: 'Side-by-side across all five platforms',                accent: '#8B7FF0', kind: 'compare' },
];

// Order is the only place segment order is decided. Compare is appended as the
// special full-width segment, so it is deliberately excluded from ORDER.
export const ORDER = ['kafka', 'flink', 'aws', 'azure', 'databricks'];

export const PLATFORM_IDS = PLATFORMS.map(p => p.id);
export const getPlatform = (id) => PLATFORMS.find(p => p.id === id);
export const isPlatform = (id) => PLATFORM_IDS.includes(id);
export const DEFAULT_PLATFORM = 'kafka';

const LS_PLATFORM = 'sml-platform';
export function rememberPlatform(id) { try { localStorage.setItem(LS_PLATFORM, id); } catch (e) {} }
export function lastPlatform() {
  try { const v = localStorage.getItem(LS_PLATFORM); if (v && isPlatform(v)) return v; } catch (e) {}
  return DEFAULT_PLATFORM;
}
