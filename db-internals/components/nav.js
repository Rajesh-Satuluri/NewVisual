export const GROUP_ORDER = [
  'Foundations', 'Query Engine', 'Storage Engine', 'Transactions',
  'Distributed', 'DDIA', 'Labs', 'Learning'
];

export const MODULES = [
  // ── Foundations ──────────────────────────────────────────────────────────
  { id:'m01', group:'Foundations',    icon:'🗄️',  label:'What is a DBMS?' },
  { id:'m02', group:'Foundations',    icon:'❓',  label:'Why Databases?' },
  { id:'m03', group:'Foundations',    icon:'🏗️',  label:'DBMS Architecture' },
  { id:'m04', group:'Foundations',    icon:'📐',  label:'Data Models' },
  { id:'m05', group:'Foundations',    icon:'📊',  label:'Relational Model' },
  { id:'m06', group:'Foundations',    icon:'➕',  label:'Relational Algebra' },
  { id:'m07', group:'Foundations',    icon:'🔗',  label:'SQL → Relational Algebra' },
  { id:'m08', group:'Foundations',    icon:'🔒',  label:'Schema & Constraints' },
  { id:'m09', group:'Foundations',    icon:'💾',  label:'Storage Hierarchy' },
  // ── Query Engine ─────────────────────────────────────────────────────────
  { id:'m10', group:'Query Engine',   icon:'🔍',  label:'SQL Parsing' },
  { id:'m11', group:'Query Engine',   icon:'🌳',  label:'Parse Tree' },
  { id:'m12', group:'Query Engine',   icon:'🧬',  label:'AST' },
  { id:'m13', group:'Query Engine',   icon:'🔎',  label:'Query Analysis' },
  { id:'m14', group:'Query Engine',   icon:'📋',  label:'Logical Plan' },
  { id:'m15', group:'Query Engine',   icon:'⚙️',  label:'Physical Plan' },
  { id:'m16', group:'Query Engine',   icon:'🎯',  label:'Query Optimization' },
  { id:'m17', group:'Query Engine',   icon:'💰',  label:'Cost-Based Optimization' },
  { id:'m18', group:'Query Engine',   icon:'🔄',  label:'Table Scan' },
  { id:'m19', group:'Query Engine',   icon:'📑',  label:'Index Scan' },
  { id:'m20', group:'Query Engine',   icon:'🔁',  label:'Nested Loop Join' },
  { id:'m21', group:'Query Engine',   icon:'#️⃣',  label:'Hash Join' },
  { id:'m22', group:'Query Engine',   icon:'🔀',  label:'Sort-Merge Join' },
  { id:'m23', group:'Query Engine',   icon:'📈',  label:'Aggregation' },
  { id:'m24', group:'Query Engine',   icon:'▶️',  label:'Query Execution' },
  { id:'m25', group:'Query Engine',   icon:'⚖️',  label:'Query Plan Comparator' },
  // ── Storage Engine ───────────────────────────────────────────────────────
  { id:'m26', group:'Storage Engine', icon:'📁',  label:'Database Files' },
  { id:'m27', group:'Storage Engine', icon:'📄',  label:'Pages' },
  { id:'m28', group:'Storage Engine', icon:'📦',  label:'Records & Tuples' },
  { id:'m29', group:'Storage Engine', icon:'🗂️',  label:'Slotted Pages' },
  { id:'m30', group:'Storage Engine', icon:'🏊',  label:'Buffer Pool' },
  { id:'m31', group:'Storage Engine', icon:'♻️',  label:'Buffer Pool Replacement' },
  { id:'m32', group:'Storage Engine', icon:'💭',  label:'Page Cache' },
  { id:'m33', group:'Storage Engine', icon:'💿',  label:'Disk I/O' },
  { id:'m34', group:'Storage Engine', icon:'⏩',  label:'Sequential vs Random I/O' },
  { id:'m35', group:'Storage Engine', icon:'🌲',  label:'B-Tree' },
  { id:'m36', group:'Storage Engine', icon:'🌳',  label:'B+ Tree' },
  { id:'m37', group:'Storage Engine', icon:'🔍',  label:'B+ Tree Search' },
  { id:'m38', group:'Storage Engine', icon:'➕',  label:'B+ Tree Insert' },
  { id:'m39', group:'Storage Engine', icon:'➖',  label:'B+ Tree Delete' },
  { id:'m40', group:'Storage Engine', icon:'✂️',  label:'B+ Tree Split' },
  { id:'m41', group:'Storage Engine', icon:'🌿',  label:'B-Tree Variants' },
  { id:'m42', group:'Storage Engine', icon:'📚',  label:'LSM-Tree' },
  { id:'m43', group:'Storage Engine', icon:'🧠',  label:'MemTable' },
  { id:'m44', group:'Storage Engine', icon:'📋',  label:'SSTable' },
  { id:'m45', group:'Storage Engine', icon:'🌸',  label:'Bloom Filter' },
  { id:'m46', group:'Storage Engine', icon:'🗜️',  label:'Compaction' },
  { id:'m47', group:'Storage Engine', icon:'⚔️',  label:'B+ Tree vs LSM' },
  // ── Transactions ─────────────────────────────────────────────────────────
  { id:'m48', group:'Transactions',    icon:'📸',  label:'MVCC' },
  { id:'m49', group:'Transactions',    icon:'🔐',  label:'Locking' },
  { id:'m50', group:'Transactions',    icon:'🧹',  label:'VACUUM' },
  { id:'m51', group:'Transactions',    icon:'📊',  label:'Isolation Levels' },
  { id:'m52', group:'Storage Engine',  icon:'🗂️',  label:'Index Types' },
  { id:'m53', group:'Transactions',    icon:'💥',  label:'Crash Recovery' },
  { id:'m54', group:'Transactions',    icon:'📍',  label:'Checkpoints' },
  { id:'m55', group:'Distributed',     icon:'🔄',  label:'Replication' },
  { id:'m56', group:'Storage Engine',  icon:'🔌',  label:'Connection Pooling' },
  { id:'m57', group:'Distributed',     icon:'🧩',  label:'Partitioning' },
  { id:'m58', group:'Query Engine',    icon:'🔍',  label:'EXPLAIN ANALYZE' },
  { id:'m59', group:'Distributed',     icon:'🎯',  label:'CAP Theorem' },
  { id:'m60', group:'Distributed',     icon:'🤝',  label:'Two-Phase Commit' },
  { id:'m61', group:'Distributed',     icon:'⭕',  label:'Consistent Hashing' },
  { id:'m62', group:'Distributed',     icon:'🗄️',  label:'Database Sharding' },
  { id:'m63', group:'Distributed',     icon:'🗳️',  label:'Raft Consensus' },
  { id:'m64', group:'Distributed',     icon:'🔢',  label:'Read/Write Quorum' },
  { id:'m65', group:'Query Engine',    icon:'⚡',  label:'Parallel Query' },
  { id:'m66', group:'Query Engine',    icon:'📈',  label:'Query Statistics' },
  { id:'m67', group:'Transactions',    icon:'📝',  label:'WAL Internals' },
  { id:'m68', group:'Query Engine',    icon:'💰',  label:'Cost Model' },
  // ── Distributed ──────────────────────────────────────────────────────────
  { id:'m69', group:'Distributed',   icon:'🌐',  label:'Distributed DB' },
  { id:'m70', group:'Distributed',   icon:'🖥️',  label:'Nodes' },
  { id:'m71', group:'Distributed',   icon:'📡',  label:'Network Communication' },
  { id:'m72', group:'Distributed',   icon:'⚠️',  label:'Partial Failure' },
  { id:'m73', group:'Distributed',   icon:'🔍',  label:'Failure Detection' },
  { id:'m74', group:'Distributed',   icon:'💗',  label:'Heartbeats' },
  { id:'m75', group:'Distributed',   icon:'👑',  label:'Leader Election' },
  { id:'m76', group:'Distributed',   icon:'🔁',  label:'Replication' },
  { id:'m77', group:'Distributed',   icon:'🔄',  label:'Synchronous Replication' },
  { id:'m78', group:'Distributed',   icon:'⏳',  label:'Asynchronous Replication' },
  { id:'m79', group:'Distributed',   icon:'🗳️',  label:'Quorum' },
  { id:'m80', group:'Distributed',   icon:'⚖️',  label:'Consistency' },
  { id:'m81', group:'Distributed',   icon:'🌊',  label:'Eventual Consistency' },
  { id:'m82', group:'Distributed',   icon:'💪',  label:'Strong Consistency' },
  { id:'m83', group:'Distributed',   icon:'🔧',  label:'Read Repair' },
  { id:'m84', group:'Distributed',   icon:'🦠',  label:'Anti-Entropy' },
  { id:'m85', group:'Distributed',   icon:'🗺️',  label:'Partitioning' },
  { id:'m86', group:'Distributed',   icon:'🔢',  label:'Hash Partitioning' },
  { id:'m87', group:'Distributed',   icon:'📏',  label:'Range Partitioning' },
  { id:'m88', group:'Distributed',   icon:'🔵',  label:'Consistent Hashing' },
  { id:'m89', group:'Distributed',   icon:'⚖️',  label:'Rebalancing' },
  { id:'m90', group:'Distributed',   icon:'🔥',  label:'Hot Partitions' },
  { id:'m91', group:'Distributed',   icon:'🤝',  label:'Distributed Transactions' },
  { id:'m92', group:'Distributed',   icon:'2️⃣',  label:'Two-Phase Commit' },
  { id:'m93', group:'Distributed',   icon:'🗳️',  label:'Consensus' },
  { id:'m94', group:'Distributed',   icon:'🐟',  label:'Raft Concepts' },
  { id:'m95', group:'Distributed',   icon:'🌩️',  label:'Network Partition' },
  { id:'m96', group:'Distributed',   icon:'🧠',  label:'Split-Brain' },
  { id:'m97', group:'Distributed',   icon:'🔄',  label:'Distributed Recovery' },
  // ── DDIA ─────────────────────────────────────────────────────────────────
  { id:'m98',  group:'DDIA',         icon:'📖',  label:'Replication Models' },
  { id:'m99',  group:'DDIA',         icon:'🗺️',  label:'Partitioning Strategies' },
  { id:'m100', group:'DDIA',         icon:'💳',  label:'Transactions at Scale' },
  { id:'m101', group:'DDIA',         icon:'⚖️',  label:'Consistency & Consensus' },
  { id:'m102', group:'DDIA',         icon:'🏭',  label:'Batch Processing' },
  { id:'m103', group:'DDIA',         icon:'🌊',  label:'Stream Processing' },
  { id:'m104', group:'DDIA',         icon:'📜',  label:'Event Logs' },
  { id:'m105', group:'DDIA',         icon:'🔄',  label:'Derived Data' },
  { id:'m106', group:'DDIA',         icon:'🔗',  label:'Data Integration' },
  { id:'m107', group:'DDIA',         icon:'🔄',  label:'CDC' },
  { id:'m108', group:'DDIA',         icon:'👁️',  label:'Materialized Views' },
  { id:'m109', group:'DDIA',         icon:'🌊',  label:'Dataflow Architecture' },
  { id:'m110', group:'DDIA',         icon:'🚀',  label:'Modern Data Systems' },
  { id:'m111', group:'DDIA',         icon:'🔗',  label:'OLTP→CDC→Kafka→OLAP' },
  // ── Labs ─────────────────────────────────────────────────────────────────
  { id:'m112', group:'Labs',         icon:'🔍',  label:'Follow the Query' },
  { id:'m113', group:'Labs',         icon:'✍️',  label:'Follow the Write' },
  { id:'m114', group:'Labs',         icon:'💳',  label:'Follow the Transaction' },
  { id:'m115', group:'Labs',         icon:'💥',  label:'Crash Recovery Lab' },
  { id:'m116', group:'Labs',         icon:'🌳',  label:'B+ Tree Lab' },
  { id:'m117', group:'Labs',         icon:'📚',  label:'LSM Lab' },
  { id:'m118', group:'Labs',         icon:'🏊',  label:'Buffer Pool Lab' },
  { id:'m119', group:'Labs',         icon:'🎯',  label:'Query Optimizer Lab' },
  { id:'m120', group:'Labs',         icon:'⚡',  label:'Concurrency Lab' },
  { id:'m121', group:'Labs',         icon:'🔁',  label:'Replication Lab' },
  { id:'m122', group:'Labs',         icon:'🗺️',  label:'Partitioning Lab' },
  { id:'m123', group:'Labs',         icon:'🗳️',  label:'Consensus Lab' },
  { id:'m124', group:'Labs',         icon:'🌩️',  label:'Distributed Failure Lab' },
  { id:'m125', group:'Labs',         icon:'🖥️',  label:'End-to-End DB Simulator' },
  // ── Learning ─────────────────────────────────────────────────────────────
  { id:'m126', group:'Learning',     icon:'🗺️',  label:'Concept Map' },
  { id:'m127', group:'Learning',     icon:'🛣️',  label:'DB Internals Roadmap' },
  { id:'m128', group:'Learning',     icon:'📚',  label:'Book Concept Mapping' },
  { id:'m129', group:'Learning',     icon:'📝',  label:'Cheat Sheet' },
  { id:'m130', group:'Learning',     icon:'💼',  label:'Interview Center' },
  { id:'m131', group:'Learning',     icon:'🎤',  label:'Mock Interview' },
  { id:'m132', group:'Learning',     icon:'🧪',  label:'Quiz' },
  { id:'m133', group:'Learning',     icon:'📖',  label:'Glossary' },
];

export function renderNav(activeId, done) {
  const nav = document.getElementById('nav-list');
  if (!nav) return;

  const collapsed = new Set(
    JSON.parse(localStorage.getItem('db-internals-nav-collapsed') || '[]')
  );

  // Auto-expand the active module's group
  if (activeId) {
    const activeMod = MODULES.find(m => m.id === activeId);
    if (activeMod) collapsed.delete(activeMod.group);
  }

  const groups = {};
  MODULES.forEach(m => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  nav.innerHTML = GROUP_ORDER.map(g => {
    const isCollapsed = collapsed.has(g);
    const groupModules = groups[g] || [];
    const doneCount = groupModules.filter(m => done.has(m.id)).length;
    return `
      <div class="nav-group${isCollapsed ? ' collapsed' : ''}" data-group="${g}">
        <div class="nav-group-label" data-toggle="${g}">
          <span class="nav-group-text">${g}</span>
          <span class="nav-group-meta">
            <span class="nav-group-count">${doneCount}/${groupModules.length}</span>
            <svg class="nav-chevron" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </span>
        </div>
        <div class="nav-group-items">
          ${groupModules.map(m => `
            <a href="#${m.id}"
               class="nav-item${m.id === activeId ? ' active' : ''}${done.has(m.id) ? ' done' : ''}"
               data-id="${m.id}">
              <span class="nav-icon">${m.icon}</span>
              <span class="nav-label">${m.label}</span>
              ${done.has(m.id) ? '<span class="nav-check">✓</span>' : ''}
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  nav.querySelectorAll('.nav-group-label[data-toggle]').forEach(label => {
    label.addEventListener('click', () => {
      const g = label.dataset.toggle;
      const group = nav.querySelector(`.nav-group[data-group="${g}"]`);
      group.classList.toggle('collapsed');
      if (group.classList.contains('collapsed')) {
        collapsed.add(g);
      } else {
        collapsed.delete(g);
      }
      localStorage.setItem('db-internals-nav-collapsed', JSON.stringify([...collapsed]));
    });
  });
}
