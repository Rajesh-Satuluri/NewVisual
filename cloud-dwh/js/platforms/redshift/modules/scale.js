/* ============================================================
   Redshift — Scale & Performance (authentic, AWS-doc aligned)
   wlm · concurrency-scaling · resize · short-query-accel · cost-performance
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    wlm: {
      eyebrow: 'Scale & Performance', title: 'Workload Management (WLM)',
      subtitle: 'WLM routes queries into queues with memory and concurrency limits so heavy and light workloads don\'t starve each other. Automatic WLM lets Redshift manage this for you. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/automatic-wlm.html',
      stage: { caption: 'Routing queries to the right lane',
        groups: [
          { id: 'in', label: 'Incoming queries', nodes: [{ id: 'etl', label: 'ETL load' }, { id: 'bi', label: 'Dashboards' }, { id: 'adhoc', label: 'Ad-hoc' }], connectorAfter: 'route by queue' },
          { id: 'queues', label: 'WLM queues', sub: 'memory + concurrency', nodes: [
            { id: 'q1', label: 'ETL queue' }, { id: 'q2', label: 'BI queue' }, { id: 'q3', label: 'Default queue' } ], connectorAfter: 'execute' },
          { id: 'run', label: 'Execution', nodes: [{ id: 'slots', label: 'Query slots' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'Mixed workloads collide', on: { spot: ['in'] },
          body: 'A giant ETL job and a tiny dashboard query compete for the same memory and slots. Without management, dashboards wait behind ETL.',
          facts: ['Concurrency and memory are finite', 'Goal: isolate workloads by priority'] },
        { label: 'Queues', title: 'Queues isolate workloads', on: { spot: ['queues'], flow: ['q1', 'q2', 'q3'] },
          body: 'WLM defines <strong>queues</strong>, each with its own memory share and concurrency. Queries route to a queue by user group or query group.',
          facts: ['Up to 8 queues (service classes 100–107)', 'Each queue gets a memory % and concurrency', 'Route by user group / query group'] },
        { label: 'Auto WLM', title: 'Automatic WLM', on: { spot: ['run'], conn: ['queues'], flow: ['slots'] },
          body: 'With <strong>Automatic WLM</strong>, Redshift estimates each query\'s needs and sets concurrency and memory dynamically — heavy joins get more memory, light queries get more slots.',
          facts: ['Redshift manages memory & concurrency automatically', 'Recommended over manual WLM for most workloads'] },
        { label: 'QMR', title: 'Query monitoring rules & priority', on: { spot: ['queues'] },
          body: 'Assign a <strong>priority</strong> per queue and add <strong>query monitoring rules</strong> (QMR) to log, abort, or hop runaway queries (e.g. cap <code>query_execution_time</code>).',
          facts: ['Priorities order work under contention', 'QMR replaces the old WLM timeout under Auto WLM', 'Rules can log / hop / abort offending queries'] },
      ],
      takeaways: [
        'WLM queues isolate workloads with their own memory & concurrency (up to 8 queues)',
        'Automatic WLM dynamically sets memory and concurrency per query — the recommended default',
        'Use priorities + query monitoring rules (QMR) to tame runaway queries',
      ],
    },

    concurrencyScaling: {
      eyebrow: 'Scale & Performance', title: 'Concurrency Scaling',
      subtitle: 'When concurrency spikes, Redshift adds transient clusters to run extra queries, then removes them when the burst passes. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/concurrency-scaling.html',
      stage: { caption: 'Absorbing bursts of concurrent queries',
        groups: [
          { id: 'main', label: 'Main cluster', sub: 'steady state', nodes: [{ id: 'mslots', label: 'Main query slots' }], connectorAfter: 'queue overflow →' },
          { id: 'scaling', label: 'Concurrency scaling clusters', sub: 'transient, automatic', nodes: [
            { id: 'sc1', label: 'Scaling cluster 1' }, { id: 'sc2', label: 'Scaling cluster 2' } ], connectorAfter: 'results merged back' },
          { id: 'users', label: 'Many concurrent users', nodes: [{ id: 'burst', label: '9am dashboard rush' }] },
        ] },
      steps: [
        { label: 'Burst', title: 'A concurrency burst arrives', on: { spot: ['users'], flow: ['burst'] },
          body: 'At 9am everyone opens dashboards. More queries arrive than the queue\'s slots can run at once.',
          facts: ['Peaks are bursty and predictable', 'Queueing shows up as slot waits'] },
        { label: 'Overflow', title: 'Eligible queries overflow', on: { spot: ['main'], flow: ['mslots'] },
          body: 'When queries routed to a queue exceed its concurrency, <strong>eligible</strong> queries are sent to transient scaling clusters instead of waiting.',
          facts: ['Enabled per queue by setting its mode to auto', 'Mostly benefits read queries'] },
        { label: 'Scale out', title: 'Transient clusters run the extras', on: { spot: ['scaling'], conn: ['main'], flow: ['sc1', 'sc2'] },
          body: 'Redshift spins up additional clusters automatically to run the overflow in parallel, then returns results — users never see a queue.',
          facts: ['Clusters added/removed automatically', 'AWS suggests enabling it when >15 queries need to run in parallel'] },
        { label: 'Cost', title: 'Credits, then pay-as-you-go', on: { spot: ['scaling'], dim: ['sc2'] },
          body: 'Each day of main-cluster use earns up to one hour of free concurrency-scaling credits; beyond that it\'s billed per second.',
          facts: ['Free credits accrue with normal usage', 'Billed per-second beyond credits', 'Does not support queries on temp tables'] },
      ],
      takeaways: [
        'Concurrency scaling adds transient clusters to absorb query bursts automatically',
        'Enabled per WLM queue (mode = auto); mostly for read queries',
        'Free credits accrue daily; usage beyond that is billed per second',
      ],
    },

    resize: {
      eyebrow: 'Scale & Performance', title: 'Elastic vs Classic Resize',
      subtitle: 'Change cluster capacity by adding/removing nodes (elastic) or changing node type/large reshapes (classic). Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/mgmt/managing-cluster-operations.html',
      stage: { caption: 'Two ways to resize a provisioned cluster',
        groups: [
          { id: 'elastic', label: 'Elastic resize', sub: 'minutes', nodes: [{ id: 'addnode', label: 'Add / remove nodes' }, { id: 'redist', label: 'Fast slice remap' }] },
          { id: 'classic', label: 'Classic resize', sub: 'hours', nodes: [{ id: 'nodetype', label: 'Change node type' }, { id: 'copy', label: 'Copy to new cluster' }] },
        ] },
      steps: [
        { label: 'Elastic', title: 'Elastic resize — fast', on: { spot: ['elastic'], flow: ['addnode', 'redist'] },
          body: 'Adds or removes nodes of the <strong>same type</strong> in minutes by remapping slices. The cluster is briefly paused during the switch.',
          facts: ['Fastest option — minutes', 'Same node type, change node count', 'Brief pause while connections hold'] },
        { label: 'Classic', title: 'Classic resize — flexible', on: { spot: ['classic'], flow: ['nodetype', 'copy'] },
          body: 'Use <strong>classic resize</strong> to change node type or make large reshapes. Redshift copies data to a new cluster, which can take hours.',
          facts: ['Change node type or very large reshapes', 'Data copied to a new cluster — can take hours', 'Read-only during the copy'] },
        { label: 'Serverless', title: 'Or skip resize with Serverless', on: { spot: [] },
          body: 'Redshift Serverless auto-scales capacity, removing manual resize for variable workloads.',
          facts: ['Serverless scales automatically', 'No node-count decisions'] },
      ],
      takeaways: [
        'Elastic resize: add/remove same-type nodes in minutes (brief pause)',
        'Classic resize: change node type / large reshapes, copies data (hours, read-only)',
        'Serverless avoids manual resize entirely for variable workloads',
      ],
    },

    shortQueryAccel: {
      eyebrow: 'Scale & Performance', title: 'Short Query Acceleration (SQA)',
      subtitle: 'SQA uses machine learning to spot short queries and run them in a dedicated space so they don\'t wait behind long ones. Press Play.',
      doc: 'https://docs.aws.amazon.com/redshift/latest/dg/wlm-short-query-acceleration.html',
      stage: { caption: 'Short queries skip the long line',
        groups: [
          { id: 'incoming', label: 'Incoming queries', nodes: [{ id: 'longq', label: 'Long ETL join' }, { id: 'shortq', label: 'Quick SELECT' }], connectorAfter: 'ML predicts runtime' },
          { id: 'sqa', label: 'SQA', sub: 'ML runtime prediction', nodes: [{ id: 'predict', label: 'Predict duration' }, { id: 'fast', label: 'Dedicated short-query space' }] },
        ] },
      steps: [
        { label: 'Problem', title: 'Short queries stuck behind long', on: { spot: ['incoming'], flow: ['longq', 'shortq'] },
          body: 'A quick dashboard query can get stuck waiting behind a long ETL job sharing the queue.',
          facts: ['Head-of-line blocking hurts interactivity'] },
        { label: 'Predict', title: 'ML predicts query runtime', on: { spot: ['sqa'], flow: ['predict'] },
          body: 'SQA uses a <strong>machine learning algorithm</strong> to predict each eligible query\'s execution time.',
          facts: ['ML predicts runtime per query', 'Applies to SELECT and CTAS in user-defined queues'] },
        { label: 'Accelerate', title: 'Run short queries in a fast lane', on: { spot: ['sqa'], flow: ['fast'] },
          body: 'Queries predicted short run in a <strong>dedicated space</strong>, so they finish quickly even while long queries run.',
          facts: ['Max runtime auto-set by WLM (or fix 1–20s)', 'Works together with Automatic WLM', 'Keeps dashboards snappy under load'] },
      ],
      takeaways: [
        'SQA predicts query runtime with ML and runs short queries in a dedicated lane',
        'Applies to SELECT/CTAS in user-defined queues',
        'Complements Automatic WLM; max runtime is auto-managed or fixable at 1–20s',
      ],
    },

    costPerformance: {
      eyebrow: 'Scale & Performance', title: 'Cost & Performance',
      subtitle: 'Redshift pricing has a few levers; price-performance comes from reading less data and sizing compute to the workload. Press Play.',
      doc: 'https://aws.amazon.com/redshift/pricing/',
      stage: { caption: 'Levers that move cost and speed',
        groups: [
          { id: 'compute', label: 'Compute choices', nodes: [
            { id: 'prov', label: 'Provisioned RA3', sub: 'steady' },
            { id: 'srvless', label: 'Serverless', sub: 'variable' },
            { id: 'ri', label: 'Reserved nodes', sub: '1–3 yr discount' } ] },
          { id: 'perf', label: 'Read less data', nodes: [
            { id: 'sort', label: 'Sort keys' }, { id: 'dist', label: 'Dist keys' },
            { id: 'comp', label: 'Compression' }, { id: 'cache', label: 'Result cache' } ] },
        ] },
      steps: [
        { label: 'Compute', title: 'Match compute to the workload', on: { spot: ['compute'], flow: ['prov', 'srvless', 'ri'] },
          body: 'Steady workloads suit <strong>provisioned RA3</strong> (optionally with reserved-node discounts); spiky/variable ones suit <strong>Serverless</strong> (pay per second).',
          facts: ['RA3 separates compute & storage billing', 'Reserved nodes cut cost for predictable load', 'Serverless: no charge when idle'] },
        { label: 'Read less', title: 'The best tuning = less I/O', on: { spot: ['perf'], flow: ['sort', 'dist', 'comp'] },
          body: 'Price-performance mostly comes from <strong>scanning fewer blocks</strong>: good sort keys (zone-map skipping), good dist keys (no redistribution), and compression.',
          facts: ['Sort keys → skip blocks', 'Dist keys → avoid redistribution', 'Compression → fewer blocks to read'] },
        { label: 'Free wins', title: 'Caching & concurrency scaling', on: { spot: ['perf'], flow: ['cache'] },
          body: 'Result caching serves repeats for free; concurrency scaling\'s daily credits absorb bursts at no cost up to the credit limit.',
          facts: ['Result cache = zero compute on repeats', 'Concurrency-scaling credits accrue daily', 'Spectrum is billed by data scanned in S3'] },
      ],
      takeaways: [
        'Pick provisioned RA3 (+ reserved) for steady load, Serverless for spiky',
        'Biggest price-performance win is reading less data (sort/dist keys, compression)',
        'Result caching and concurrency-scaling credits are effectively free throughput',
      ],
    },
  };

  Kit.registerAll('redshift', SPECS);
})();
