/* ============================================================
   Conceptual visualizer: autoscaling, warm-up & cold start.

   Models the lifecycle of elastic compute — cold start, warm pool,
   scale-out under load, and scale-in — and the latency vs cost
   trade-off that every autoscaling policy must set. Conceptual
   only. Registered on TV.Viz.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV || !TV.Viz) return;

  TV.Viz.register({
    id: 'autoscaling',
    title: 'Autoscaling: warm-up & cold start',
    subtitle: 'The lifecycle of elastic compute — cold start, warm pools, scale-out under load and scale-in when idle — and the latency-versus-cost trade-off every autoscaling policy is really configuring.',
    vendor: 'multi',
    tags: ['autoscaling', 'cold start', 'warm pool', 'warm-up', 'scale out', 'scale in', 'auto-suspend', 'serverless', 'cluster', 'elastic compute', 'latency', 'cost'],
    steps: [
      {
        title: 'Idle compute still costs money',
        caption: 'A cluster or warehouse sized for peak load wastes money when idle; one sized for idle is too slow at peak. Autoscaling exists to track demand — adding capacity when work arrives and removing it when work drains away.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-hot">fixed large<small>wastes $ when idle</small></div>
            <div class="viz-box is-hot">fixed small<small>too slow at peak</small></div></div>
          <span class="viz-tag viz-tag--shuffle">neither static size fits a variable load</span></div>`,
      },
      {
        title: 'Cold start: the first request pays',
        caption: 'When compute is fully stopped, the first request must provision machines, pull images, start the runtime, and warm caches before any work runs. This cold-start latency can be seconds to minutes — paid entirely by whoever arrives first.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">request</div><span class="viz-arrow">→</span>
            <div class="viz-box is-hot">provision + boot + warm caches</div><span class="viz-arrow">→</span>
            <div class="viz-box">runs</div></div>
          <span class="viz-tag viz-tag--shuffle">first request waits for the cold start</span></div>`,
      },
      {
        title: 'Warm pool: pay to hide the cold start',
        caption: 'A warm pool keeps nodes pre-provisioned and idle-ready so a request skips the boot. It trades money for latency: you pay for standby capacity to make the first request fast. Serverless engines hide this behind a shared pool; dedicated clusters configure it explicitly.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">warm node</div><div class="viz-box is-done">warm node</div>
            <span class="viz-arrow">→ request lands →</span>
            <div class="viz-box is-active">runs immediately</div></div>
          <span class="viz-tag viz-tag--narrow">standby cost buys low first-request latency</span></div>`,
      },
      {
        title: 'Scale-out under load',
        caption: 'As the queue grows past a threshold, the autoscaler adds workers. Scaling is not instant — each new node has its own smaller cold start — so a sudden spike still queues briefly while capacity catches up. Metrics (queue depth, CPU, pending tasks) drive the decision.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">2 nodes</div><span class="viz-arrow">queue grows →</span>
            <div class="viz-box is-active">4 nodes</div><span class="viz-arrow">→</span>
            <div class="viz-box is-done">8 nodes</div></div>
          <span class="viz-tag">scale-out follows demand, with lag</span></div>`,
      },
      {
        title: 'Scale-in and auto-suspend',
        caption: 'When demand falls, the autoscaler removes idle workers, and after an idle timeout it may suspend entirely to stop billing. A short timeout saves the most money but makes the next request cold; a long one keeps things warm at a cost. This timeout is the core knob.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-done">8 nodes</div><span class="viz-arrow">idle →</span>
            <div class="viz-box is-active">2 nodes</div><span class="viz-arrow">idle timeout →</span>
            <div class="viz-box is-dim">suspended<small>$0</small></div></div>
          <span class="viz-tag viz-tag--narrow">idle timeout trades warmth for cost</span></div>`,
      },
      {
        title: 'Tuning is choosing a point on the curve',
        caption: 'There is no free lunch: aggressive scale-in and no warm pool minimize cost but expose cold starts; generous warm capacity and slow scale-in minimize latency but cost more. Set min/max size, thresholds, and idle timeout to the latency your workload actually needs — no tighter.',
        diagram: `<div class="viz-col"><div class="viz-row">
            <div class="viz-box is-active">cheap<small>cold starts, low cost</small></div>
            <span class="viz-arrow">↔</span>
            <div class="viz-box is-done">responsive<small>always warm, higher cost</small></div></div>
          <span class="viz-tag viz-tag--narrow">pick the point your SLA requires</span></div>`,
      },
    ],
  });
})();
