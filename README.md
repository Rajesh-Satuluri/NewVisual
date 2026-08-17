# Apache Airflow Interactive Visualizer

An interactive learning lab for Apache Airflow internals — architecture, execution, debugging, and interview prep for data engineers.

**Live:** https://rajesh-satuluri.github.io/NewVisual/

## Modules

- Architecture overview with animated request flows
- DAG parsing, serialization, and metadata DB internals
- Scheduler loop and timetable mechanics
- Executor types: LocalExecutor, CeleryExecutor, KubernetesExecutor
- Task instance lifecycle and state machine
- XCom, sensors, deferrable tasks, dynamic task mapping
- 15 production failure scenarios with root-cause walkthroughs
- 80+ interview Q&As, quiz mode, glossary, concept map

## Stack

Pure HTML + CSS + vanilla JS — no bundler, no framework. Designed to run directly from GitHub Pages.

## Local development

```bash
# Serve from the airflow-visualizer directory
cd airflow-visualizer
python3 -m http.server 8080
# Open http://localhost:8080
```
