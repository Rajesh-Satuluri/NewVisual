// Gate 8 (I76) — curated learning paths. Each path is an ordered list of steps,
// where a step points at a module/tool/lab id already routable in the app.
export const PATHS = [
  {
    id: 'beginner', icon: '🌱', title: 'Streaming from zero',
    for: 'New to streaming — build intuition before any vendor.',
    steps: [
      ['f01', 'Why streaming?'], ['f02', 'Events & streams'], ['f03', 'Partitions & keys'],
      ['f06', 'Event vs processing time'], ['f07', 'Watermarks'], ['f08', 'Windows'],
      ['f10', 'Checkpointing & recovery'], ['eng-trace', 'Trace one event end to end'],
    ],
  },
  {
    id: 'firstpipeline', icon: '🚀', title: 'Design your first pipeline',
    for: 'Ready to make architecture decisions.',
    steps: [
      ['f11', 'Delivery guarantees'], ['eng-compare', 'Compare the engines'],
      ['eng-decide', 'Pick a technology'], ['eng-builder', 'Assemble & validate a design'],
      ['eng-capacity', 'Size it (capacity calculator)'], ['sd-fraud', 'System Design: fraud detection'],
    ],
  },
  {
    id: 'flinkdeep', icon: '🌀', title: 'Flink deep dive',
    for: 'Master stateful stream processing.',
    steps: [
      ['flink', 'Flink modules (ported)'], ['f07', 'Watermarks'], ['f09', 'State'],
      ['f10', 'Checkpointing'], ['eng-break', 'Break the pipeline (state/watermark faults)'],
    ],
  },
  {
    id: 'cloud', icon: '☁️', title: 'Cloud streaming tour',
    for: 'Compare the managed platforms.',
    steps: [
      ['aws', 'AWS (Kinesis/MSK/Flink)'], ['azure', 'Azure (Event Hubs/Stream Analytics)'],
      ['databricks', 'Databricks (Structured Streaming/Delta)'], ['eng-compare', 'Side-by-side matrix'],
    ],
  },
  {
    id: 'interviewprep', icon: '🎯', title: 'Interview prep sprint',
    for: 'Preparing for a streaming/data-engineering interview.',
    steps: [
      ['interview', 'Question bank (all tracks)'], ['eng-compare', 'Comparison matrix'],
      ['incident', 'Incident Lab (diagnosis drills)'], ['sysdesign', 'System Design Lab'],
      ['eng-capacity', 'Capacity estimation'],
    ],
  },
  {
    id: 'oncall', icon: '🚨', title: 'On-call readiness',
    for: 'Build production troubleshooting intuition.',
    steps: [
      ['f12', 'Backpressure & lag'], ['incident', 'All 12 incidents'],
      ['eng-break', 'Break the pipeline'], ['databricks17', 'Exactly-once & fault tolerance'],
    ],
  },
];
