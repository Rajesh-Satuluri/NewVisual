/* ============================================================
   Fabric — Platform & Orchestration (authentic, Microsoft-Learn aligned)
   workspaces-domains · data-factory · dataflows-gen2 · git-deployment · copilot
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  const Kit = viz.RedshiftKit;

  const SPECS = {
    'workspacesDomains': {
      eyebrow: 'Platform', title: 'Workspaces & Domains',
      subtitle: 'Workspaces are collaboration containers for Fabric items; domains group workspaces for federated, business-aligned governance. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/governance/domains',
      stage: { caption: 'Organizing items and governance',
        groups: [
          { id: 'domain', label: 'Domain', sub: 'business area (e.g. "Streaming")', nodes: [{ id: 'd1', label: 'Analytics workspace' }, { id: 'd2', label: 'Finance workspace' }], connectorAfter: 'contains' },
          { id: 'ws', label: 'Workspace', sub: 'collaboration + roles', nodes: [{ id: 'items', label: 'Lakehouse · Warehouse · Reports' }, { id: 'roles', label: 'Admin/Member/Contributor/Viewer' }] },
        ] },
      steps: [
        { label: 'Workspace', title: 'Workspaces hold items', on: { spot: ['ws'], flow: ['items', 'roles'] },
          body: 'A <strong>workspace</strong> is where teams build and share items (lakehouses, warehouses, pipelines, reports), with roles controlling access.',
          facts: ['Roles: Admin, Member, Contributor, Viewer', 'The unit of Git integration and deployment pipelines', 'Backed by a Fabric capacity'] },
        { label: 'Domain', title: 'Domains group workspaces', on: { spot: ['domain'], conn: ['domain'], flow: ['d1', 'd2'] },
          body: '<strong>Domains</strong> group related workspaces by business area for <strong>federated governance</strong> — domain admins manage policies for their area.',
          facts: ['Group workspaces by business area', 'Federated, delegated governance', 'Enable data-mesh-style ownership'] },
      ],
      takeaways: [
        'Workspaces are collaboration containers for items, with role-based access',
        'Domains group workspaces by business area for federated (data-mesh) governance',
        'Workspace is the unit of Git integration and deployment pipelines',
      ],
    },

    'dataFactory': {
      eyebrow: 'Platform', title: 'Data Factory Pipelines',
      subtitle: 'Data Factory in Fabric orchestrates ingestion and activities with pipelines — Copy, notebooks, dataflows, control flow — on a schedule or trigger. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-factory/data-factory-overview',
      stage: { caption: 'Orchestrate the whole flow',
        groups: [
          { id: 'pipe', label: 'Pipeline', sub: 'control flow', nodes: [{ id: 'copy', label: 'Copy activity' }, { id: 'nb', label: 'Notebook' }, { id: 'dfact', label: 'Dataflow activity' }, { id: 'ctrl', label: 'If / ForEach / Until' }], connectorAfter: 'schedule / trigger' },
          { id: 'run', label: 'Execution', nodes: [{ id: 'sched', label: 'Scheduled or event-triggered' }] },
        ] },
      steps: [
        { label: 'Orchestrate', title: 'Pipelines chain activities', on: { spot: ['pipe'], flow: ['copy', 'nb', 'dfact', 'ctrl'] },
          body: 'A <strong>pipeline</strong> chains activities — high-throughput <strong>Copy</strong>, notebooks, dataflows — with control flow (If, ForEach, Until) to build end-to-end jobs.',
          facts: ['Copy activity ingests from 100s of connectors', 'Run notebooks, dataflows, stored procs', 'Control-flow activities for branching/loops'] },
        { label: 'Schedule', title: 'Schedule or trigger', on: { spot: ['run'], conn: ['pipe'], flow: ['sched'] },
          body: 'Run pipelines on a <strong>schedule</strong> or by <strong>event trigger</strong>, with monitoring built in.',
          facts: ['Scheduled and event-based triggers', 'Built-in run monitoring', 'The Fabric evolution of Azure Data Factory'] },
      ],
      takeaways: [
        'Data Factory pipelines orchestrate Copy, notebooks, dataflows with control flow',
        'Copy activity ingests from hundreds of connectors',
        'Run on schedule or event triggers with built-in monitoring',
      ],
    },

    'dataflowsGen2': {
      eyebrow: 'Platform', title: 'Dataflows Gen2',
      subtitle: 'Dataflows Gen2 bring Power Query\'s visual, low-code transformations to Fabric, writing results to a chosen destination. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/data-factory/dataflows-gen2-overview',
      stage: { caption: 'Low-code transformation with Power Query',
        groups: [
          { id: 'src', label: 'Sources', nodes: [{ id: 'many', label: '100s of connectors' }], connectorAfter: 'Power Query (M)' },
          { id: 'pq', label: 'Dataflow Gen2', sub: 'visual transforms', nodes: [{ id: 'steps', label: 'Applied steps' }, { id: 'merge', label: 'Merge / shape' }], connectorAfter: 'write to destination' },
          { id: 'dest', label: 'Destinations', nodes: [{ id: 'lh', label: 'Lakehouse' }, { id: 'wh', label: 'Warehouse' }] },
        ] },
      steps: [
        { label: 'Transform', title: 'Power Query, visually', on: { spot: ['pq'], conn: ['src'], flow: ['steps', 'merge'] },
          body: 'Dataflows Gen2 use the familiar <strong>Power Query</strong> experience — connect, shape, and merge data with applied steps, no code required.',
          facts: ['Low-code Power Query (M) transformations', 'Hundreds of source connectors', 'Great for analysts/self-service prep'] },
        { label: 'Destination', title: 'Write to a destination', on: { spot: ['dest'], conn: ['pq'], flow: ['lh', 'wh'] },
          body: 'Gen2 adds explicit <strong>data destinations</strong> (Lakehouse, Warehouse, …) and now ships with CI/CD + Git support.',
          facts: ['Choose output destination (Lakehouse/Warehouse)', 'Built-in CI/CD + Git integration', 'Use inside pipelines via a Dataflow activity'] },
      ],
      takeaways: [
        'Dataflows Gen2 = visual, low-code Power Query transformations',
        'Gen2 adds explicit destinations (Lakehouse/Warehouse) and CI/CD + Git',
        'Use standalone or inside pipelines via a Dataflow activity',
      ],
    },

    'gitDeployment': {
      eyebrow: 'Platform', title: 'Git Integration & Deployment Pipelines',
      subtitle: 'Fabric offers two complementary ALM tools: Git integration for source control and deployment pipelines for promoting content across stages. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/cicd/git-integration/intro-to-git-integration',
      stage: { caption: 'Source control + staged promotion',
        groups: [
          { id: 'git', label: 'Git integration', sub: 'workspace ↔ repo', nodes: [{ id: 'gh', label: 'GitHub / Azure DevOps' }, { id: 'sync', label: 'Commit / sync changes' }], connectorAfter: 'then promote' },
          { id: 'dp', label: 'Deployment pipeline', sub: 'stages', nodes: [{ id: 'dev', label: 'Development' }, { id: 'test', label: 'Test' }, { id: 'prod', label: 'Production' }] },
        ] },
      steps: [
        { label: 'Git', title: 'Git integration = source control', on: { spot: ['git'], flow: ['gh', 'sync'] },
          body: 'Connect a <strong>workspace</strong> to GitHub or Azure DevOps; commit items and sync changes. The workspace folder structure is preserved in the repo.',
          facts: ['Connect to GitHub or Azure DevOps', 'Integration is at the workspace level', 'Folder structure preserved in Git'] },
        { label: 'Deploy', title: 'Deployment pipelines = promotion', on: { spot: ['dp'], conn: ['git'], flow: ['dev', 'test', 'prod'] },
          body: '<strong>Deployment pipelines</strong> promote content across <strong>Development → Test → Production</strong> stages with full, selective, or backward deployment.',
          facts: ['Default stages: Dev, Test, Prod', 'Full / selective / backward deployment', 'Guidance: Git on Dev, deployment pipelines onward'] },
      ],
      takeaways: [
        'Git integration puts a workspace under source control (GitHub/Azure DevOps)',
        'Deployment pipelines promote content across Dev → Test → Prod',
        'Common pattern: Git on the Dev stage, deployment pipelines for promotion',
      ],
    },

    copilot: {
      eyebrow: 'Platform', title: 'Copilot in Fabric',
      subtitle: 'Copilot brings generative-AI assistance across Fabric — writing SQL and DAX, building dataflows and reports, and explaining data — grounded in your workspace. Press Play.',
      doc: 'https://learn.microsoft.com/en-us/fabric/fundamentals/copilot-fabric-overview',
      stage: { caption: 'AI help across every workload',
        groups: [
          { id: 'surfaces', label: 'Where Copilot helps', nodes: [{ id: 'sql', label: 'Warehouse: T-SQL' }, { id: 'nb', label: 'Notebooks: PySpark' }, { id: 'df', label: 'Dataflows' }, { id: 'bi', label: 'Power BI: DAX + reports' }], connectorAfter: 'grounded in workspace' },
          { id: 'req', label: 'Requirements', nodes: [{ id: 'cap', label: 'Fabric capacity' }, { id: 'gov', label: 'Respects permissions' }] },
        ] },
      steps: [
        { label: 'Assist', title: 'Generative help, in context', on: { spot: ['surfaces'], flow: ['sql', 'nb', 'df', 'bi'] },
          body: 'Copilot can write and explain <strong>T-SQL</strong>, generate <strong>PySpark</strong> in notebooks, build <strong>dataflows</strong>, and create <strong>DAX</strong>/reports — grounded in your data.',
          facts: ['T-SQL, PySpark, DAX, dataflow generation', 'Explain code and data', 'Grounded in your workspace content'] },
        { label: 'Govern', title: 'Capacity-gated & governed', on: { spot: ['req'], conn: ['surfaces'], flow: ['cap', 'gov'] },
          body: 'Copilot requires a Fabric <strong>capacity</strong> and honors your existing <strong>permissions</strong> — it can\'t surface data a user isn\'t allowed to see.',
          facts: ['Requires a Fabric capacity (tenant admin enables it)', 'Respects item/data permissions', 'An assistant — always review generated code'] },
      ],
      takeaways: [
        'Copilot assists across Fabric: T-SQL, PySpark, dataflows, DAX, and reports',
        'Grounded in your workspace data and governed by existing permissions',
        'Requires a Fabric capacity; treat output as a draft to review',
      ],
    },
  };

  Kit.registerAll('fabric', SPECS);
})();
