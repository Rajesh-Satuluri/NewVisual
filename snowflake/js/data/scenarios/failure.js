/* Architecture Failure Simulator — seed bank (chain renderer) */
(function () {
  'use strict';
  const S = [
    {
      id: 'fa-compute', area: 'failure', category: 'Compute', difficulty: 'intermediate',
      title: 'When the compute layer fails or suspends',
      intro: 'Walk the architecture: Client → Cloud Services → Virtual Warehouse → Storage. What happens as the compute layer changes state?',
      steps: [
        { q: 'What happens to your data if a virtual warehouse is unavailable?', a: 'Nothing happens to the data — it lives in the centralized storage layer, completely independent of compute. Only query execution is affected; the data is intact and other warehouses can still read it.' },
        { q: 'A query is running and the warehouse is suspended — what happens?', a: 'Warehouses don\'t suspend mid-query; auto-suspend triggers only after an idle period. On resume, a new query runs on a cold local cache (slower first read) but storage and results are unaffected.' },
        { q: 'What is lost when a warehouse suspends?', a: 'The warehouse\'s local SSD cache (recently read micro-partitions) is cleared. Data and the result cache are untouched — only warm local cache is lost, which is why very aggressive auto-suspend can hurt latency.' },
        { q: 'A warehouse is overloaded/queuing — does storage or other workloads suffer?', a: 'No. Because compute and storage are separated, a struggling warehouse doesn\'t affect stored data or other warehouses. You scale that warehouse out (multi-cluster) or up, in isolation.' },
      ],
    },
    {
      id: 'fa-cloud-services', area: 'failure', category: 'Cloud Services', difficulty: 'advanced',
      title: 'When Cloud Services is degraded',
      intro: 'Cloud Services is the brain: optimizer, metadata, security, transactions, result cache. What depends on it?',
      steps: [
        { q: 'What does Cloud Services do that every query depends on?', a: 'It authenticates, parses and optimizes queries, manages metadata used for pruning, coordinates transactions, and serves the result cache. Without it, queries can\'t be compiled or authorized even if warehouses are running.' },
        { q: 'If the result cache is unavailable, what happens?', a: 'Queries that would have been served instantly from cache instead execute on a warehouse (compute cost + latency). Correctness is unaffected; only the free/instant fast-path is lost.' },
        { q: 'Is Cloud Services a single point you manage or scale?', a: 'No — it\'s a multi-tenant, Snowflake-managed, horizontally scaled layer. You don\'t size or operate it; Snowflake ensures its availability, which is why it isn\'t a knob in your architecture.' },
        { q: 'Does metadata being managed centrally help or hurt resilience?', a: 'It helps: centralized metadata enables pruning and instant metadata queries without touching warehouses, and Snowflake operates it for high availability, so your job is designing on top of it, not running it.' },
      ],
    },
    {
      id: 'fa-storage-state', area: 'failure', category: 'Storage & State', difficulty: 'intermediate',
      title: 'Storage, caches, and durability under failure',
      intro: 'Where does state actually live, and what survives what?',
      steps: [
        { q: 'What happens to stored data if all compute is turned off?', a: 'It persists fully. Data lives in cloud object storage as immutable micro-partitions, independent of any warehouse. You can suspend every warehouse and lose nothing but the ability to run queries.' },
        { q: 'Which caches survive a warehouse restart, and which don\'t?', a: 'The result cache (Cloud Services) and metadata cache survive independently of warehouses. The warehouse\'s local SSD cache does NOT survive suspend/resize — it\'s rebuilt on next reads.' },
        { q: 'If a bad DELETE corrupts a table, what protects you?', a: 'Time Travel lets you query/restore the pre-delete state within the retention window (or clone AT a past point). After that, Fail-safe gives a 7-day support-only last resort for permanent objects.' },
        { q: 'Does a regional outage threaten your data, and how do you plan for it?', a: 'A single-region deployment is exposed to regional outages. For that you use cross-region replication plus failover (Client Redirect) — Time Travel and Fail-safe are in-region and don\'t cover a regional disaster.' },
      ],
    },
  ];
  window.SnowflakeViz.ScenarioEngine.register('failure', S);
})();
