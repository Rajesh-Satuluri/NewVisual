// Interview Master question bank (Phase 4 — expanded into 8 tracks).
// Aggregates the per-track banks. Each question: { cat, q, a, senior? }.
// Technically careful: exactly-once never overstated; cloud numbers validated;
// no padding — every question is distinct.
import { FUND } from './interview-banks/fundamentals.js';
import { KAFKA } from './interview-banks/kafka.js';
import { FLINK } from './interview-banks/flink.js';
import { AWS } from './interview-banks/aws.js';
import { AZURE } from './interview-banks/azure.js';
import { DATABRICKS } from './interview-banks/databricks.js';
import { DESIGN } from './interview-banks/design.js';
import { TROUBLE } from './interview-banks/troubleshooting.js';

export const CATEGORIES = [
  { id: 'fund', label: 'Fundamentals', icon: '🧱' },
  { id: 'kafka', label: 'Kafka', icon: '📨' },
  { id: 'flink', label: 'Flink', icon: '🌀' },
  { id: 'aws', label: 'AWS', icon: '☁️' },
  { id: 'azure', label: 'Azure', icon: '🔷' },
  { id: 'databricks', label: 'Databricks', icon: '🧮' },
  { id: 'design', label: 'System design', icon: '📐' },
  { id: 'trouble', label: 'Troubleshooting', icon: '🔧' },
];

export const QUESTIONS = [
  ...FUND, ...KAFKA, ...FLINK, ...AWS, ...AZURE, ...DATABRICKS, ...DESIGN, ...TROUBLE,
];

// Per-track counts and the master-prompt targets, for honest reporting in-app.
export const BANK_TARGETS = {
  fund: 50, kafka: 50, flink: 50, aws: 40, azure: 40, databricks: 40, design: 30, trouble: 30,
};
export function bankCounts() {
  const c = {};
  for (const q of QUESTIONS) c[q.cat] = (c[q.cat] || 0) + 1;
  return c;
}
