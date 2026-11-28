/* app.js — the course shell: top bar · course tree · lesson workspace · narrative.
   The LSM-Tree lesson is fully built; every other catalog concept is navigable
   as a graceful "not built yet" placeholder so the whole curriculum validates. */
import { h, mount } from './engine/h.js';
import { createStore } from './engine/store.js';
import { onRoute, go } from './engine/router.js';
import { createFlowSystem } from './engine/flows.js';
import { renderLsmScene } from './db/lsm-scene.js';
import { renderDbmsScene } from './db/dbms-scene.js';
import { renderWhyDatabasesScene } from './db/why-databases-scene.js';
import { renderDbmsArchitectureScene } from './db/dbms-architecture-scene.js';
import { renderDataModelsScene } from './db/data-models-scene.js';
import { renderRelationalModelScene } from './db/relational-model-scene.js';
import { renderRelationalAlgebraScene } from './db/relational-algebra-scene.js';
import { renderSqlRelationalAlgebraScene } from './db/sql-relational-algebra-scene.js';
import { renderSchemaConstraintsScene } from './db/schema-constraints-scene.js';
import { renderStorageHierarchyScene } from './db/storage-hierarchy-scene.js';
import { renderSqlParsingScene } from './db/sql-parsing-scene.js';
import { renderParseTreeScene } from './db/parse-tree-scene.js';
import { renderAstScene } from './db/ast-scene.js';
import { renderQueryAnalysisScene } from './db/query-analysis-scene.js';
import { renderLogicalPlanScene } from './db/logical-plan-scene.js';
import { renderPhysicalPlanScene } from './db/physical-plan-scene.js';
import { renderQueryOptimizationScene } from './db/query-optimization-scene.js';
import { renderCostBasedOptimizationScene } from './db/cost-based-optimization-scene.js';
import { renderTableScanScene } from './db/table-scan-scene.js';
import { renderIndexScanScene } from './db/index-scan-scene.js';
import { renderNestedLoopJoinScene } from './db/nested-loop-join-scene.js';
import { renderHashJoinScene } from './db/hash-join-scene.js';
import { renderSortMergeJoinScene } from './db/sort-merge-join-scene.js';
import { renderAggregationScene } from './db/aggregation-scene.js';
import { renderQueryExecutionScene } from './db/query-execution-scene.js';
import { renderQueryPlanComparatorScene } from './db/query-plan-comparator-scene.js';
import { renderExplainAnalyzeScene } from './db/explain-analyze-scene.js';
import { renderParallelQueryScene } from './db/parallel-query-scene.js';
import { renderQueryStatisticsScene } from './db/query-statistics-scene.js';
import { renderCostModelScene } from './db/cost-model-scene.js';
import { renderDatabaseFilesScene } from './db/database-files-scene.js';
import { renderPagesScene } from './db/pages-scene.js';
import { renderRecordsTuplesScene } from './db/records-tuples-scene.js';
import { renderSlottedPagesScene } from './db/slotted-pages-scene.js';
import { renderBufferPoolScene } from './db/buffer-pool-scene.js';
import { renderBufferPoolReplacementScene } from './db/buffer-pool-replacement-scene.js';
import { renderPageCacheScene } from './db/page-cache-scene.js';
import { renderDiskIoScene } from './db/disk-io-scene.js';
import { renderSequentialVsRandomIoScene } from './db/sequential-vs-random-io-scene.js';
import { renderBTreeScene } from './db/b-tree-scene.js';
import { renderBPlusTreeScene } from './db/b-plus-tree-scene.js';
import { renderBPlusTreeSearchScene } from './db/b-plus-tree-search-scene.js';
import { renderBPlusTreeInsertScene } from './db/b-plus-tree-insert-scene.js';
import { renderBPlusTreeDeleteScene } from './db/b-plus-tree-delete-scene.js';
import { renderBPlusTreeRootSplitScene } from './db/b-plus-tree-root-split-scene.js';
import { renderMemtableWalScene } from './db/memtable-wal-scene.js';
import { renderSstableScene } from './db/sstable-scene.js';
import { renderBloomFilterScene } from './db/bloom-filter-scene.js';
import { renderLsmCompactionScene } from './db/lsm-compaction-scene.js';
import { renderIndexTypesScene } from './db/index-types-scene.js';
import { renderConnectionPoolingScene } from './db/connection-pooling-scene.js';
import { renderTransactionsScene } from './db/transactions-scene.js';
import { renderWalScene } from './db/wal-scene.js';
import { renderMvccScene } from './db/mvcc-scene.js';
import { renderLockingScene } from './db/locking-scene.js';
import { renderVacuumScene } from './db/vacuum-scene.js';
import { renderIsolationLevelsScene } from './db/isolation-levels-scene.js';
import { renderCrashRecoveryScene } from './db/crash-recovery-scene.js';
import { renderCheckpointsScene } from './db/checkpoints-scene.js';
import { renderWalInternalsScene } from './db/wal-internals-scene.js';
import { renderReplicationScene } from './db/replication-scene.js';
import { renderPartitioningScene } from './db/partitioning-scene.js';
import { renderCapTheoremScene } from './db/cap-theorem-scene.js';
import { renderTwoPhaseCommitScene } from './db/two-phase-commit-scene.js';
import { renderConsistentHashingScene } from './db/consistent-hashing-scene.js';
import { renderDatabaseShardingScene } from './db/database-sharding-scene.js';
import { renderRaftConsensusScene } from './db/raft-consensus-scene.js';
import { renderReadWriteQuorumScene } from './db/read-write-quorum-scene.js';
import { renderDistributedOverviewScene } from './db/distributed-overview-scene.js';
import { renderFailureModesScene } from './db/failure-modes-scene.js';
import { renderNetworkCommunicationScene } from './db/network-communication-scene.js';
import { renderPartialFailureScene } from './db/partial-failure-scene.js';
import { renderFailureDetectionScene } from './db/failure-detection-scene.js';
import { renderHeartbeatsScene } from './db/heartbeats-scene.js';
import { renderLeaderElectionScene } from './db/leader-election-scene.js';
import { renderMultiLeaderReplicationScene } from './db/multi-leader-replication-scene.js';
import { renderSynchronousReplicationScene } from './db/synchronous-replication-scene.js';
import { renderAsynchronousReplicationScene } from './db/asynchronous-replication-scene.js';
import { renderQuorumScene } from './db/quorum-scene.js';
import { renderConsistencyScene } from './db/consistency-scene.js';
import { renderEventualConsistencyScene } from './db/eventual-consistency-scene.js';
import { renderStrongConsistencyScene } from './db/strong-consistency-scene.js';
import { renderReadRepairScene } from './db/read-repair-scene.js';
import { renderAntiEntropyScene } from './db/anti-entropy-scene.js';
import { renderVerticalPartitioningScene } from './db/vertical-partitioning-scene.js';
import { renderHashPartitioningScene } from './db/hash-partitioning-scene.js';
import { renderRangePartitioningScene } from './db/range-partitioning-scene.js';
import { renderVirtualNodesScene } from './db/virtual-nodes-scene.js';
import { renderRebalancingScene } from './db/rebalancing-scene.js';
import { renderHotPartitionsScene } from './db/hot-partitions-scene.js';
import { renderDistributedTransactionsScene } from './db/distributed-transactions-scene.js';
import { renderThreePhaseCommitScene } from './db/three-phase-commit-scene.js';
import { renderConsensusScene } from './db/consensus-scene.js';
import { renderRaftConceptsScene } from './db/raft-concepts-scene.js';
import { renderNetworkPartitionScene } from './db/network-partition-scene.js';
import { renderSplitBrainScene } from './db/split-brain-scene.js';
import { renderDistributedRecoveryScene } from './db/distributed-recovery-scene.js';
import { renderReplicationModelsScene } from './db/replication-models-scene.js';
import { renderPartitioningStrategiesScene } from './db/partitioning-strategies-scene.js';
import { renderTransactionsAtScaleScene } from './db/transactions-at-scale-scene.js';
import { renderConsistencyAndConsensusScene } from './db/consistency-and-consensus-scene.js';
import { renderBatchProcessingScene } from './db/batch-processing-scene.js';
import { renderStreamProcessingScene } from './db/stream-processing-scene.js';
import { renderEventLogsScene } from './db/event-logs-scene.js';
import { renderDerivedDataScene } from './db/derived-data-scene.js';
import { renderDataIntegrationScene } from './db/data-integration-scene.js';
import { renderCdcScene } from './db/cdc-scene.js';
import { renderMaterializedViewsScene } from './db/materialized-views-scene.js';
import { renderDataflowArchitectureScene } from './db/dataflow-architecture-scene.js';
import { renderModernDataSystemsScene } from './db/modern-data-systems-scene.js';
import { renderOltpCdcKafkaStreamOlapScene } from './db/oltp-cdc-kafka-stream-olap-scene.js';
import { renderFollowTheQueryScene } from './db/follow-the-query-scene.js';
import { renderFollowTheWriteScene } from './db/follow-the-write-scene.js';
import { renderFollowTheTransactionScene } from './db/follow-the-transaction-scene.js';
import { renderCrashRecoveryLabScene } from './db/crash-recovery-lab-scene.js';
import { renderBplusTreeLabScene } from './db/bplus-tree-lab-scene.js';
import { renderLsmLabScene } from './db/lsm-lab-scene.js';
import { renderBufferPoolLabScene } from './db/buffer-pool-lab-scene.js';
import { renderQueryOptimizerLabScene } from './db/query-optimizer-lab-scene.js';
import { renderConcurrencyLabScene } from './db/concurrency-lab-scene.js';
import { renderReplicationLabScene } from './db/replication-lab-scene.js';
import { renderPartitioningLabScene } from './db/partitioning-lab-scene.js';
import { renderConsensusLabScene } from './db/consensus-lab-scene.js';
import { renderDistributedFailureLabScene } from './db/distributed-failure-lab-scene.js';
import { renderEndToEndDbSimulatorScene } from './db/end-to-end-db-simulator-scene.js';
import { renderConceptMapScene } from './db/concept-map-scene.js';
import { renderDbInternalsRoadmapScene } from './db/db-internals-roadmap-scene.js';
import { renderBookConceptMappingScene } from './db/book-concept-mapping-scene.js';
import { renderCheatSheetScene } from './db/cheat-sheet-scene.js';
import { renderInterviewCenterScene } from './db/interview-center-scene.js';
import { renderMockInterviewScene } from './db/mock-interview-scene.js';
import { renderQuizScene } from './db/quiz-scene.js';
import { renderGlossaryScene } from './db/glossary-scene.js';
import { renderHud, renderLegend } from './db/hud.js';
import { icon } from './engine/icons.js';
import { lsmLesson } from './content/lsm.js';
import { dbmsLesson } from './content/dbms.js';
import { whyDatabasesLesson } from './content/why-databases.js';
import { dbmsArchitectureLesson } from './content/dbms-architecture.js';
import { dataModelsLesson } from './content/data-models.js';
import { relationalModelLesson } from './content/relational-model.js';
import { relationalAlgebraLesson } from './content/relational-algebra.js';
import { sqlRelationalAlgebraLesson } from './content/sql-relational-algebra.js';
import { schemaConstraintsLesson } from './content/schema-constraints.js';
import { storageHierarchyLesson } from './content/storage-hierarchy.js';
import { sqlParsingLesson } from './content/sql-parsing.js';
import { parseTreeLesson } from './content/parse-tree.js';
import { astLesson } from './content/ast.js';
import { queryAnalysisLesson } from './content/query-analysis.js';
import { logicalPlanLesson } from './content/logical-plan.js';
import { physicalPlanLesson } from './content/physical-plan.js';
import { queryOptimizationLesson } from './content/query-optimization.js';
import { costBasedOptimizationLesson } from './content/cost-based-optimization.js';
import { tableScanLesson } from './content/table-scan.js';
import { indexScanLesson } from './content/index-scan.js';
import { nestedLoopJoinLesson } from './content/nested-loop-join.js';
import { hashJoinLesson } from './content/hash-join.js';
import { sortMergeJoinLesson } from './content/sort-merge-join.js';
import { aggregationLesson } from './content/aggregation.js';
import { queryExecutionLesson } from './content/query-execution.js';
import { queryPlanComparatorLesson } from './content/query-plan-comparator.js';
import { explainAnalyzeLesson } from './content/explain-analyze.js';
import { parallelQueryLesson } from './content/parallel-query.js';
import { queryStatisticsLesson } from './content/query-statistics.js';
import { costModelLesson } from './content/cost-model.js';
import { databaseFilesLesson } from './content/database-files.js';
import { pagesLesson } from './content/pages.js';
import { recordsTuplesLesson } from './content/records-tuples.js';
import { slottedPagesLesson } from './content/slotted-pages.js';
import { bufferPoolLesson } from './content/buffer-pool.js';
import { bufferPoolReplacementLesson } from './content/buffer-pool-replacement.js';
import { pageCacheLesson } from './content/page-cache.js';
import { diskIoLesson } from './content/disk-io.js';
import { sequentialVsRandomIoLesson } from './content/sequential-vs-random-io.js';
import { bTreeLesson } from './content/b-tree.js';
import { bPlusTreeLesson } from './content/b-plus-tree.js';
import { bPlusTreeSearchLesson } from './content/b-plus-tree-search.js';
import { bPlusTreeInsertLesson } from './content/b-plus-tree-insert.js';
import { bPlusTreeDeleteLesson } from './content/b-plus-tree-delete.js';
import { bPlusTreeRootSplitLesson } from './content/b-plus-tree-root-split.js';
import { memtableWalLesson } from './content/memtable-wal.js';
import { sstableLesson } from './content/sstable.js';
import { bloomFilterLesson } from './content/bloom-filter.js';
import { lsmCompactionLesson } from './content/lsm-compaction.js';
import { indexTypesLesson } from './content/index-types.js';
import { connectionPoolingLesson } from './content/connection-pooling.js';
import { transactionsLesson } from './content/transactions.js';
import { walLesson } from './content/wal.js';
import { mvccLesson } from './content/mvcc.js';
import { lockingLesson } from './content/locking.js';
import { vacuumLesson } from './content/vacuum.js';
import { isolationLevelsLesson } from './content/isolation-levels.js';
import { crashRecoveryLesson } from './content/crash-recovery.js';
import { checkpointsLesson } from './content/checkpoints.js';
import { walInternalsLesson } from './content/wal-internals.js';
import { replicationLesson } from './content/replication.js';
import { partitioningLesson } from './content/partitioning.js';
import { capTheoremLesson } from './content/cap-theorem.js';
import { twoPhaseCommitLesson } from './content/two-phase-commit.js';
import { consistentHashingLesson } from './content/consistent-hashing.js';
import { databaseShardingLesson } from './content/database-sharding.js';
import { raftConsensusLesson } from './content/raft-consensus.js';
import { readWriteQuorumLesson } from './content/read-write-quorum.js';
import { distributedOverviewLesson } from './content/distributed-overview.js';
import { failureModesLesson } from './content/failure-modes.js';
import { networkCommunicationLesson } from './content/network-communication.js';
import { partialFailureLesson } from './content/partial-failure.js';
import { failureDetectionLesson } from './content/failure-detection.js';
import { heartbeatsLesson } from './content/heartbeats.js';
import { leaderElectionLesson } from './content/leader-election.js';
import { multiLeaderReplicationLesson } from './content/multi-leader-replication.js';
import { synchronousReplicationLesson } from './content/synchronous-replication.js';
import { asynchronousReplicationLesson } from './content/asynchronous-replication.js';
import { quorumLesson } from './content/quorum.js';
import { consistencyLesson } from './content/consistency.js';
import { eventualConsistencyLesson } from './content/eventual-consistency.js';
import { strongConsistencyLesson } from './content/strong-consistency.js';
import { readRepairLesson } from './content/read-repair.js';
import { antiEntropyLesson } from './content/anti-entropy.js';
import { verticalPartitioningLesson } from './content/vertical-partitioning.js';
import { hashPartitioningLesson } from './content/hash-partitioning.js';
import { rangePartitioningLesson } from './content/range-partitioning.js';
import { virtualNodesLesson } from './content/virtual-nodes.js';
import { rebalancingLesson } from './content/rebalancing.js';
import { hotPartitionsLesson } from './content/hot-partitions.js';
import { distributedTransactionsLesson } from './content/distributed-transactions.js';
import { threePhaseCommitLesson } from './content/three-phase-commit.js';
import { consensusLesson } from './content/consensus.js';
import { raftConceptsLesson } from './content/raft-concepts.js';
import { networkPartitionLesson } from './content/network-partition.js';
import { splitBrainLesson } from './content/split-brain.js';
import { distributedRecoveryLesson } from './content/distributed-recovery.js';
import { replicationModelsLesson } from './content/replication-models.js';
import { partitioningStrategiesLesson } from './content/partitioning-strategies.js';
import { transactionsAtScaleLesson } from './content/transactions-at-scale.js';
import { consistencyAndConsensusLesson } from './content/consistency-and-consensus.js';
import { batchProcessingLesson } from './content/batch-processing.js';
import { streamProcessingLesson } from './content/stream-processing.js';
import { eventLogsLesson } from './content/event-logs.js';
import { derivedDataLesson } from './content/derived-data.js';
import { dataIntegrationLesson } from './content/data-integration.js';
import { cdcLesson } from './content/cdc.js';
import { materializedViewsLesson } from './content/materialized-views.js';
import { dataflowArchitectureLesson } from './content/dataflow-architecture.js';
import { modernDataSystemsLesson } from './content/modern-data-systems.js';
import { oltpCdcKafkaStreamOlapLesson } from './content/oltp-cdc-kafka-stream-olap.js';
import { followTheQueryLesson } from './content/follow-the-query.js';
import { followTheWriteLesson } from './content/follow-the-write.js';
import { followTheTransactionLesson } from './content/follow-the-transaction.js';
import { crashRecoveryLabLesson } from './content/crash-recovery-lab.js';
import { bplusTreeLabLesson } from './content/bplus-tree-lab.js';
import { lsmLabLesson } from './content/lsm-lab.js';
import { bufferPoolLabLesson } from './content/buffer-pool-lab.js';
import { queryOptimizerLabLesson } from './content/query-optimizer-lab.js';
import { concurrencyLabLesson } from './content/concurrency-lab.js';
import { replicationLabLesson } from './content/replication-lab.js';
import { partitioningLabLesson } from './content/partitioning-lab.js';
import { consensusLabLesson } from './content/consensus-lab.js';
import { distributedFailureLabLesson } from './content/distributed-failure-lab.js';
import { endToEndDbSimulatorLesson } from './content/end-to-end-db-simulator.js';
import { conceptMapLesson } from './content/concept-map.js';
import { dbInternalsRoadmapLesson } from './content/db-internals-roadmap.js';
import { bookConceptMappingLesson } from './content/book-concept-mapping.js';
import { cheatSheetLesson } from './content/cheat-sheet.js';
import { interviewCenterLesson } from './content/interview-center.js';
import { mockInterviewLesson } from './content/mock-interview.js';
import { quizLesson } from './content/quiz.js';
import { glossaryLesson } from './content/glossary.js';
import { createLsm } from './kernels/lsm.mjs';
import { CATALOG, TOTAL, BUILT_COUNT } from './content/catalog.js';

const LESSONS = {
  'lsm-tree': lsmLesson,
  'what-is-dbms': dbmsLesson,
  'why-databases': whyDatabasesLesson,
  'dbms-architecture': dbmsArchitectureLesson,
  'data-models': dataModelsLesson,
  'relational-model': relationalModelLesson,
  'relational-algebra': relationalAlgebraLesson,
  'sql-relational-algebra': sqlRelationalAlgebraLesson,
  'schema-constraints': schemaConstraintsLesson,
  'storage-hierarchy': storageHierarchyLesson,
  'sql-parsing': sqlParsingLesson,
  'parse-tree': parseTreeLesson,
  'ast': astLesson,
  'query-analysis': queryAnalysisLesson,
  'logical-plan': logicalPlanLesson,
  'physical-plan': physicalPlanLesson,
  'query-optimization': queryOptimizationLesson,
  'cost-based-optimization': costBasedOptimizationLesson,
  'table-scan': tableScanLesson,
  'index-scan': indexScanLesson,
  'nested-loop-join': nestedLoopJoinLesson,
  'hash-join': hashJoinLesson,
  'sort-merge-join': sortMergeJoinLesson,
  'aggregation': aggregationLesson,
  'query-execution': queryExecutionLesson,
  'query-plan-comparator': queryPlanComparatorLesson,
  'explain-analyze': explainAnalyzeLesson,
  'parallel-query': parallelQueryLesson,
  'query-statistics': queryStatisticsLesson,
  'cost-model': costModelLesson,
  'database-files': databaseFilesLesson,
  'pages': pagesLesson,
  'records-tuples': recordsTuplesLesson,
  'slotted-pages': slottedPagesLesson,
  'buffer-pool': bufferPoolLesson,
  'buffer-pool-replacement': bufferPoolReplacementLesson,
  'page-cache': pageCacheLesson,
  'disk-io': diskIoLesson,
  'sequential-vs-random-io': sequentialVsRandomIoLesson,
  'b-tree': bTreeLesson,
  'b-plus-tree': bPlusTreeLesson,
  'b-plus-tree-search': bPlusTreeSearchLesson,
  'b-plus-tree-insert': bPlusTreeInsertLesson,
  'b-plus-tree-delete': bPlusTreeDeleteLesson,
  'b-plus-tree-root-split': bPlusTreeRootSplitLesson,
  'memtable-wal': memtableWalLesson,
  'sstable': sstableLesson,
  'bloom-filter': bloomFilterLesson,
  'lsm-compaction': lsmCompactionLesson,
  'index-types': indexTypesLesson,
  'connection-pooling': connectionPoolingLesson,
  'transactions': transactionsLesson,
  'wal': walLesson,
  'mvcc': mvccLesson,
  'locking': lockingLesson,
  'vacuum': vacuumLesson,
  'isolation-levels': isolationLevelsLesson,
  'crash-recovery': crashRecoveryLesson,
  'checkpoints': checkpointsLesson,
  'wal-internals': walInternalsLesson,
  'replication': replicationLesson,
  'partitioning': partitioningLesson,
  'cap-theorem': capTheoremLesson,
  'two-phase-commit': twoPhaseCommitLesson,
  'consistent-hashing': consistentHashingLesson,
  'database-sharding': databaseShardingLesson,
  'raft-consensus': raftConsensusLesson,
  'read-write-quorum': readWriteQuorumLesson,
  'distributed-overview': distributedOverviewLesson,
  'failure-modes': failureModesLesson,
  'network-communication': networkCommunicationLesson,
  'partial-failure': partialFailureLesson,
  'failure-detection': failureDetectionLesson,
  'heartbeats': heartbeatsLesson,
  'leader-election': leaderElectionLesson,
  'multi-leader-replication': multiLeaderReplicationLesson,
  'synchronous-replication': synchronousReplicationLesson,
  'asynchronous-replication': asynchronousReplicationLesson,
  'quorum': quorumLesson,
  'consistency': consistencyLesson,
  'eventual-consistency': eventualConsistencyLesson,
  'strong-consistency': strongConsistencyLesson,
  'read-repair': readRepairLesson,
  'anti-entropy': antiEntropyLesson,
  'vertical-partitioning': verticalPartitioningLesson,
  'hash-partitioning': hashPartitioningLesson,
  'range-partitioning': rangePartitioningLesson,
  'virtual-nodes': virtualNodesLesson,
  'rebalancing': rebalancingLesson,
  'hot-partitions': hotPartitionsLesson,
  'distributed-transactions': distributedTransactionsLesson,
  'three-phase-commit': threePhaseCommitLesson,
  'consensus': consensusLesson,
  'raft-concepts': raftConceptsLesson,
  'network-partition': networkPartitionLesson,
  'split-brain': splitBrainLesson,
  'distributed-recovery': distributedRecoveryLesson,
  'replication-models': replicationModelsLesson,
  'partitioning-strategies': partitioningStrategiesLesson,
  'transactions-at-scale': transactionsAtScaleLesson,
  'consistency-and-consensus': consistencyAndConsensusLesson,
  'batch-processing': batchProcessingLesson,
  'stream-processing': streamProcessingLesson,
  'event-logs': eventLogsLesson,
  'derived-data': derivedDataLesson,
  'data-integration': dataIntegrationLesson,
  'cdc': cdcLesson,
  'materialized-views': materializedViewsLesson,
  'dataflow-architecture': dataflowArchitectureLesson,
  'modern-data-systems': modernDataSystemsLesson,
  'oltp-cdc-kafka-stream-olap': oltpCdcKafkaStreamOlapLesson,
  'follow-the-query': followTheQueryLesson,
  'follow-the-write': followTheWriteLesson,
  'follow-the-transaction': followTheTransactionLesson,
  'crash-recovery-lab': crashRecoveryLabLesson,
  'bplus-tree-lab': bplusTreeLabLesson,
  'lsm-lab': lsmLabLesson,
  'buffer-pool-lab': bufferPoolLabLesson,
  'query-optimizer-lab': queryOptimizerLabLesson,
  'concurrency-lab': concurrencyLabLesson,
  'replication-lab': replicationLabLesson,
  'partitioning-lab': partitioningLabLesson,
  'consensus-lab': consensusLabLesson,
  'distributed-failure-lab': distributedFailureLabLesson,
  'end-to-end-db-simulator': endToEndDbSimulatorLesson,
  'concept-map': conceptMapLesson,
  'db-internals-roadmap': dbInternalsRoadmapLesson,
  'book-concept-mapping': bookConceptMappingLesson,
  'cheat-sheet': cheatSheetLesson,
  'interview-center': interviewCenterLesson,
  'mock-interview': mockInterviewLesson,
  'quiz': quizLesson,
  'glossary': glossaryLesson,
};
// per-lesson scene renderer (all share the iso3d visual vocabulary)
const SCENES = {
  'lsm-tree': renderLsmScene,
  'what-is-dbms': renderDbmsScene,
  'why-databases': renderWhyDatabasesScene,
  'dbms-architecture': renderDbmsArchitectureScene,
  'data-models': renderDataModelsScene,
  'relational-model': renderRelationalModelScene,
  'relational-algebra': renderRelationalAlgebraScene,
  'sql-relational-algebra': renderSqlRelationalAlgebraScene,
  'schema-constraints': renderSchemaConstraintsScene,
  'storage-hierarchy': renderStorageHierarchyScene,
  'sql-parsing': renderSqlParsingScene,
  'parse-tree': renderParseTreeScene,
  'ast': renderAstScene,
  'query-analysis': renderQueryAnalysisScene,
  'logical-plan': renderLogicalPlanScene,
  'physical-plan': renderPhysicalPlanScene,
  'query-optimization': renderQueryOptimizationScene,
  'cost-based-optimization': renderCostBasedOptimizationScene,
  'table-scan': renderTableScanScene,
  'index-scan': renderIndexScanScene,
  'nested-loop-join': renderNestedLoopJoinScene,
  'hash-join': renderHashJoinScene,
  'sort-merge-join': renderSortMergeJoinScene,
  'aggregation': renderAggregationScene,
  'query-execution': renderQueryExecutionScene,
  'query-plan-comparator': renderQueryPlanComparatorScene,
  'explain-analyze': renderExplainAnalyzeScene,
  'parallel-query': renderParallelQueryScene,
  'query-statistics': renderQueryStatisticsScene,
  'cost-model': renderCostModelScene,
  'database-files': renderDatabaseFilesScene,
  'pages': renderPagesScene,
  'records-tuples': renderRecordsTuplesScene,
  'slotted-pages': renderSlottedPagesScene,
  'buffer-pool': renderBufferPoolScene,
  'buffer-pool-replacement': renderBufferPoolReplacementScene,
  'page-cache': renderPageCacheScene,
  'disk-io': renderDiskIoScene,
  'sequential-vs-random-io': renderSequentialVsRandomIoScene,
  'b-tree': renderBTreeScene,
  'b-plus-tree': renderBPlusTreeScene,
  'b-plus-tree-search': renderBPlusTreeSearchScene,
  'b-plus-tree-insert': renderBPlusTreeInsertScene,
  'b-plus-tree-delete': renderBPlusTreeDeleteScene,
  'b-plus-tree-root-split': renderBPlusTreeRootSplitScene,
  'memtable-wal': renderMemtableWalScene,
  'sstable': renderSstableScene,
  'bloom-filter': renderBloomFilterScene,
  'lsm-compaction': renderLsmCompactionScene,
  'index-types': renderIndexTypesScene,
  'connection-pooling': renderConnectionPoolingScene,
  'transactions': renderTransactionsScene,
  'wal': renderWalScene,
  'mvcc': renderMvccScene,
  'locking': renderLockingScene,
  'vacuum': renderVacuumScene,
  'isolation-levels': renderIsolationLevelsScene,
  'crash-recovery': renderCrashRecoveryScene,
  'checkpoints': renderCheckpointsScene,
  'wal-internals': renderWalInternalsScene,
  'replication': renderReplicationScene,
  'partitioning': renderPartitioningScene,
  'cap-theorem': renderCapTheoremScene,
  'two-phase-commit': renderTwoPhaseCommitScene,
  'consistent-hashing': renderConsistentHashingScene,
  'database-sharding': renderDatabaseShardingScene,
  'raft-consensus': renderRaftConsensusScene,
  'read-write-quorum': renderReadWriteQuorumScene,
  'distributed-overview': renderDistributedOverviewScene,
  'failure-modes': renderFailureModesScene,
  'network-communication': renderNetworkCommunicationScene,
  'partial-failure': renderPartialFailureScene,
  'failure-detection': renderFailureDetectionScene,
  'heartbeats': renderHeartbeatsScene,
  'leader-election': renderLeaderElectionScene,
  'multi-leader-replication': renderMultiLeaderReplicationScene,
  'synchronous-replication': renderSynchronousReplicationScene,
  'asynchronous-replication': renderAsynchronousReplicationScene,
  'quorum': renderQuorumScene,
  'consistency': renderConsistencyScene,
  'eventual-consistency': renderEventualConsistencyScene,
  'strong-consistency': renderStrongConsistencyScene,
  'read-repair': renderReadRepairScene,
  'anti-entropy': renderAntiEntropyScene,
  'vertical-partitioning': renderVerticalPartitioningScene,
  'hash-partitioning': renderHashPartitioningScene,
  'range-partitioning': renderRangePartitioningScene,
  'virtual-nodes': renderVirtualNodesScene,
  'rebalancing': renderRebalancingScene,
  'hot-partitions': renderHotPartitionsScene,
  'distributed-transactions': renderDistributedTransactionsScene,
  'three-phase-commit': renderThreePhaseCommitScene,
  'consensus': renderConsensusScene,
  'raft-concepts': renderRaftConceptsScene,
  'network-partition': renderNetworkPartitionScene,
  'split-brain': renderSplitBrainScene,
  'distributed-recovery': renderDistributedRecoveryScene,
  'replication-models': renderReplicationModelsScene,
  'partitioning-strategies': renderPartitioningStrategiesScene,
  'transactions-at-scale': renderTransactionsAtScaleScene,
  'consistency-and-consensus': renderConsistencyAndConsensusScene,
  'batch-processing': renderBatchProcessingScene,
  'stream-processing': renderStreamProcessingScene,
  'event-logs': renderEventLogsScene,
  'derived-data': renderDerivedDataScene,
  'data-integration': renderDataIntegrationScene,
  'cdc': renderCdcScene,
  'materialized-views': renderMaterializedViewsScene,
  'dataflow-architecture': renderDataflowArchitectureScene,
  'modern-data-systems': renderModernDataSystemsScene,
  'oltp-cdc-kafka-stream-olap': renderOltpCdcKafkaStreamOlapScene,
  'follow-the-query': renderFollowTheQueryScene,
  'follow-the-write': renderFollowTheWriteScene,
  'follow-the-transaction': renderFollowTheTransactionScene,
  'crash-recovery-lab': renderCrashRecoveryLabScene,
  'bplus-tree-lab': renderBplusTreeLabScene,
  'lsm-lab': renderLsmLabScene,
  'buffer-pool-lab': renderBufferPoolLabScene,
  'query-optimizer-lab': renderQueryOptimizerLabScene,
  'concurrency-lab': renderConcurrencyLabScene,
  'replication-lab': renderReplicationLabScene,
  'partitioning-lab': renderPartitioningLabScene,
  'consensus-lab': renderConsensusLabScene,
  'distributed-failure-lab': renderDistributedFailureLabScene,
  'end-to-end-db-simulator': renderEndToEndDbSimulatorScene,
  'concept-map': renderConceptMapScene,
  'db-internals-roadmap': renderDbInternalsRoadmapScene,
  'book-concept-mapping': renderBookConceptMappingScene,
  'cheat-sheet': renderCheatSheetScene,
  'interview-center': renderInterviewCenterScene,
  'mock-interview': renderMockInterviewScene,
  'quiz': renderQuizScene,
  'glossary': renderGlossaryScene,
};
const TABS = ['Learn', 'Practice', 'Design Lab', 'Cheatsheets'];
const TAB_ICON = { 'Learn': 'book', 'Practice': 'target', 'Design Lab': 'sliders', 'Cheatsheets': 'grid' };
const SECTION_ICON_COLORS = ['#c98a3e', '#2f8a43', '#6b4fbb', '#2a7a6b', '#c0392b', '#3b82c9', '#b5892b', '#7a8290', '#5a6b8c'];
const CALLOUT_ICON = { warn: 'alert', insight: 'gauge', tip: 'check' };
const CHAPTER_LABEL = { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'How it works', tradeoff: 'Trade-off', recap: 'Recap', insight: 'Insight' };

// section index that contains a given slug (for auto-expand)
function sectionOf(slug) {
  for (let i = 0; i < CATALOG.length; i++) if (CATALOG[i].items.some(it => it.slug === slug)) return i;
  return 0;
}
function catalogItem(slug) {
  for (const s of CATALOG) { const it = s.items.find(i => i.slug === slug); if (it) return { ...it, section: s }; }
  return null;
}

const store = createStore({ slug: 'lsm-tree', step: 0, expanded: new Set([sectionOf('lsm-tree')]) });
let flows = null;

function boot() {
  const app = document.getElementById('app');
  mount(app, h('div.shell', [
    renderTopbar(),
    h('div.layout', [
      h('aside.sidebar', { id: 'sidebar' }),
      h('main.workspace', { id: 'workspace' }),
      h('section.rail', { id: 'rail' }),
    ]),
  ]));
  onRoute(({ lesson, step }) => {
    const slug = lesson || store.get().slug;
    const exp = store.get().expanded; exp.add(sectionOf(slug));
    store.set({ slug, step: step || 0, expanded: exp });
    render();
  });
}

/* ── Top bar ── */
function renderTopbar() {
  return h('header.topbar', [
    h('div.topbar__brand', [h('span.brand__dot'), h('b', 'DB Internals'), h('span.brand__thin', 'to scale')]),
    h('nav.tabs', TABS.map((t, i) => h('button.tab' + (i === 0 ? '.is-active' : ''), { title: i ? 'Coming soon' : '' }, [
      h('span.tab__ic', { html: icon(TAB_ICON[t]) }),
      h('span', { text: t }),
    ]))),
    h('div.topbar__right', [
      h('div.search', [
        h('span.search__ic', { html: icon('search') }),
        h('span.search__ph', 'Search concepts…'),
        h('kbd.search__kbd', '⌘K'),
      ]),
      h('button.chip-btn.chip-btn--lang', [h('span.chip-btn__ic', { html: icon('globe') }), h('span', 'EN'), h('span.chip-btn__caret', { html: icon('chevron') })]),
      h('button.chip-btn.chip-btn--icon', { id: 'themeToggle2', title: 'Toggle theme', 'aria-label': 'Toggle theme' }, [
        h('span.ic-moon', { html: icon('moon') }),
        h('span.ic-sun', { html: icon('sun') }),
      ]),
    ]),
  ]);
}

function render() {
  const { slug, step } = store.get();
  const lesson = LESSONS[slug];
  renderSidebar(slug);
  if (lesson) { renderBuilt(lesson, step); }
  else { renderPlaceholder(slug); }
}

/* ── Course tree (full catalog) ── */
function renderSidebar(activeSlug) {
  const host = document.getElementById('sidebar');
  const { expanded } = store.get();
  mount(host, h('div.course', [
    h('div.course__head', [h('span', { html: icon('layers') }), h('b', 'Course'), h('span.course__count', `${TOTAL} concepts`)]),
    h('div.sections', CATALOG.map((sec, i) => {
      const open = expanded.has(i);
      const builtN = sec.items.filter(x => x.built).length;
      return h('div.section' + (open ? '.is-open' : ''), [
        h('button.section__head', { onClick: () => toggleSection(i) }, [
          h('span.section__caret', open ? '▾' : '▸'),
          h('span.section__folder', { html: icon('folder'), style: { color: SECTION_ICON_COLORS[i % SECTION_ICON_COLORS.length] } }),
          h('span.section__n', { text: sec.n }),
          h('span.section__name', { text: sec.name }),
          h('span.section__count', { text: `${builtN}/${sec.items.length}` }),
        ]),
        open ? h('div.items', sec.items.map(it =>
          h('button.item' + (it.slug === activeSlug ? '.is-active' : '') + (it.built ? '.is-built' : ''),
            { onClick: () => go({ lesson: it.slug, step: 0 }) }, [
            h('span.item__icon', { text: it.built ? '●' : '○' }),
            h('span.item__title', { text: it.title }),
            it.built ? h('span.item__badge', 'live') : null,
          ])) ) : null,
      ]);
    })),
    h('div.progress', [
      h('div.progress__bar', [h('div.progress__fill', { style: { width: (BUILT_COUNT / TOTAL * 100).toFixed(1) + '%' } })]),
      h('div.progress__txt', `${BUILT_COUNT} / ${TOTAL} built`),
    ]),
  ]));
}
function toggleSection(i) {
  const exp = store.get().expanded;
  exp.has(i) ? exp.delete(i) : exp.add(i);
  store.set({ expanded: exp }); renderSidebar(store.get().slug);
}

/* ── Built lesson workspace ── */
function renderBuilt(L, step) {
  step = Math.min(Math.max(0, step), L.steps.length - 1);
  const st = L.steps[step];
  const ws = document.getElementById('workspace');
  if (flows) { flows.clear(); flows = null; }

  const header = h('div.ws-head', [
    h('div.breadcrumb', { text: `${L.group}  /  ${L.title}` }),
    h('div.ws-head__row', [
      h('div.ws-head__main', [
        h('h1.ws-title', { text: L.title }),
        h('p.ws-sub', { text: L.summary }),
      ]),
      h('div.badges', [
        h('span.badge', [h('span.badge__ic', { html: icon('clock') }), h('span', `${L.minutes} min`)]),
        h('span.badge', [h('span.badge__ic', { html: icon('gauge') }), h('span', L.level)]),
        h('span.badge.badge--steps', [h('span.badge__ic', { html: icon('listOrdered') }), h('span', `${L.steps.length} steps`)]),
      ]),
    ]),
  ]);

  // scene
  let sceneBox, legendEl;
  if (st.scene && st.scene.lab) { sceneBox = h('div', { id: 'labmount' }); }
  else {
    const renderScene = SCENES[L.id] || renderLsmScene;
    const r = renderScene(st.scene, { hiKey: st.scene.hiKey, pulse: st.scene.pulse, probe: st.probe || [] });
    sceneBox = h('div.scene-box', [r.svg, h('div.scene-note', { text: r.note })]);
    flows = createFlowSystem(r.layer);
    (r.flows || []).forEach(f => { const p = r.rail(f.id); if (p) flows.add({ path: p, kind: f.kind, speed: f.speed, size: f.size }); });
    legendEl = renderLegend(L.legend);
  }

  mount(ws, h('div', [
    header,
    st.metrics ? h('div.hud-row', [renderHud(st.metrics, L.metrics, step > 0 ? L.steps[step - 1].metrics : null)]) : h('div'),
    sceneBox,
    legendEl || h('div'),
    renderStepRail(L, step),
  ]));

  if (st.scene && st.scene.lab) mountLab(document.getElementById('labmount'), L, step);
  renderNarrative(L, step);
}

/* horizontal step scrubber ("IN THIS LESSON") */
function renderStepRail(L, step) {
  return h('div.steprail', [
    h('div.steprail__head', [h('span', 'In this lesson'), h('span.steprail__count', `Step ${step + 1} of ${L.steps.length}`)]),
    h('div.steprail__track', L.steps.map((s, i) =>
      h('button.srnode' + (i === step ? '.is-active' : '') + (i < step ? '.is-done' : ''),
        { onClick: () => go({ lesson: L.id, step: i }) }, [
        h('span.srnode__dot', { text: String(i + 1) }),
        h('span.srnode__label', { text: s.short }),
      ])),
    ),
  ]);
}

/* ── Narrative rail ── */
function renderNarrative(L, step) {
  const st = L.steps[step];
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__scroll', [
      h('div.rail__top', [
        h('span.rail__stepno', { text: `STEP ${step + 1} / ${L.steps.length}` }),
        h('span.rail__chaptag.chap--' + st.chapter, { text: (CHAPTER_LABEL[st.chapter] || st.chapter).toUpperCase() }),
      ]),
      h('h2.rail__title', { text: st.title }),
      h('div.rail__body', st.body.map(p => h('p', { html: p }))),
      st.changes ? h('ul.changes', st.changes.map(c => {
        const t = c[0] === '+' ? 'add' : c[0] === '-' ? 'del' : 'mod'; return h('li.change--' + t, { html: c });
      })) : null,
      st.callout ? h('div.callout.callout--' + st.callout.kind, [
        h('span.callout__icon', { html: icon(CALLOUT_ICON[st.callout.kind] || 'check') }), h('span', { html: st.callout.text }),
      ]) : null,
    ]),
    h('div.rail__foot', [
      h('div.nav', [
        h('button.nav__btn', { disabled: step === 0, onClick: () => go({ lesson: L.id, step: step - 1 }) }, '← Back'),
        (step === L.steps.length - 1
          ? h('button.nav__btn.nav__btn--primary', { disabled: true }, 'Finish ✓')
          : h('button.nav__btn.nav__btn--primary', { onClick: () => go({ lesson: L.id, step: step + 1 }) },
            `Next: ${L.steps[step + 1].short} →`)),
      ]),
      h('div.nav-hint', [
        h('kbd', '←'), h('kbd', '→'), h('span', 'step'),
        h('span.nav-hint__dot', '·'), h('kbd', 'Home'), h('span', 'restart'),
      ]),
      h('div.youll', [
        h('div.youll__label', 'You will learn'),
        ...L.goals.map(g => {
          const done = step >= g.step;
          return h('button.youll__item' + (done ? '.is-done' : ''), { onClick: () => go({ lesson: L.id, step: g.step }) }, [
            h('span.youll__box' + (done ? '.is-checked' : ''), done ? { html: icon('check') } : {}),
            h('span', { html: g.text }),
          ]);
        }),
      ]),
    ]),
  ]));
}

/* ── Live lab ── */
function mountLab(host, L, step) {
  let kernel = createLsm({ memtableLimit: 4, fanout: 4 });
  [[12, 100], [42, 7], [88, 3], [7, 1]].forEach(([k, v]) => kernel.dispatch({ type: 'put', key: k, value: v }));
  let nextKey = 20;
  function paint() {
    if (flows) flows.clear();
    const snap = kernel.snapshot();
    const r = renderLsmScene(snap, {});
    const m = kernel.metrics();
    mount(host, h('div', [
      h('div.hud-row', [renderHud(m, ['memtable', 'sstables', 'readAmp', 'writeAmp'], null)]),
      h('div.scene-box', [r.svg, h('div.scene-note', { text: snap.note })]),
      h('div.lab-controls', [
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'put', key: nextKey++, value: 1 }); paint(); } }, '+ Put key'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'delete', key: 12 }); paint(); } }, 'Delete 12'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'flush' }); paint(); } }, 'Flush'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'compact' }); paint(); } }, 'Compact'),
        h('button.lab-btn.lab-btn--ghost', { onClick: () => { kernel.reset(); nextKey = 20; paint(); } }, 'Reset'),
      ]),
    ]));
    flows = createFlowSystem(r.layer);
    const wr = r.rail('write'); if (wr) flows.add({ path: wr, kind: 'write', speed: 160, size: 5 });
  }
  paint();
}

/* ── Placeholder for not-yet-built concepts ── */
function renderPlaceholder(slug) {
  if (flows) { flows.clear(); flows = null; }
  const it = catalogItem(slug) || { title: slug, section: { name: '' } };
  mount(document.getElementById('workspace'), h('div', [
    h('div.ws-head', [
      h('div.breadcrumb', { text: `${it.section.name}  /  ${it.title}` }),
      h('h1.ws-title', { text: it.title }),
      h('p.ws-sub', 'This lesson is on the roadmap — the content exists in db-lab; the Designed-to-Scale rebuild is pending.'),
    ]),
    h('div.placeholder', [
      h('div.placeholder__icon', { text: it.icon || '◇' }),
      h('div.placeholder__title', 'Not built yet'),
      h('div.placeholder__sub', `“${it.title}” will become a guided, animated lesson like LSM-Tree.`),
      h('button.placeholder__cta', { onClick: () => go({ lesson: 'lsm-tree', step: 0 }) }, 'Open the LSM-Tree lesson →'),
    ]),
  ]));
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__top', [h('span.rail__stepno', 'PREVIEW')]),
    h('h2.rail__title', { text: it.title }),
    h('p.rail__muted', 'Pick a section on the left to browse the full curriculum. Lessons marked “live” are built; the rest are placeholders for now.'),
  ]));
}

function wireTheme() {
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('#themeToggle2');
    if (btn) {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('dbs:theme', JSON.stringify(dark ? 'light' : 'dark')); } catch {}
    }
  });
}

/* keyboard navigation through a lesson's steps (Designed-to-Scale parity) */
function wireKeys() {
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
    const { slug, step } = store.get();
    const L = LESSONS[slug]; if (!L) return;
    if (e.key === 'ArrowRight' && step < L.steps.length - 1) { e.preventDefault(); go({ lesson: slug, step: step + 1 }); }
    else if (e.key === 'ArrowLeft' && step > 0) { e.preventDefault(); go({ lesson: slug, step: step - 1 }); }
    else if (e.key === 'Home' && step !== 0) { e.preventDefault(); go({ lesson: slug, step: 0 }); }
  });
}

wireTheme();
wireKeys();
boot();
