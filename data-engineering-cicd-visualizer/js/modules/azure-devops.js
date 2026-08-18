/* modules/azure-devops.js — Tier 3 · Azure DevOps (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "azure-devops",
    title: "Azure DevOps",
    tool: "--tool-azuredevops",
    icon: "🔷",
    eyebrow: "Tier 3 · Enterprise CI/CD Platforms",
    subtitle: "One Microsoft-hosted suite — Repos, Pipelines, Artifacts, Boards, Environments — that lets a RetailFlow enterprise team ship the revenue pipeline through the same build → test → artifact → approve → deploy flow you already know.",
    mentalImage: "ONE SUITE, MANY GATES",

    flowTitle: "A change moving through Azure DevOps",
    flow: ["Git / Repo", "Azure Pipeline", "Build", "Test", "Artifact", "Approval", "Deploy"],

    why: "Large regulated enterprises often already live inside Microsoft — Entra ID, Azure subscriptions, audit requirements. They want repos, pipelines, packages, work tracking, and release approvals under <b>one governed roof</b> instead of stitching separate tools together.",
    what: "Azure DevOps is an integrated CI/CD <b>suite</b>: <b>Repos</b> (Git), <b>Pipelines</b> (build/test/deploy), <b>Artifacts</b> (package feeds), <b>Boards</b> (work items), and <b>Environments</b> (deploy targets with approval gates).",
    how: "You define a <code>azure-pipelines.yml</code> that builds, tests, and publishes an artifact, then deploys to an <b>Environment</b>. Production environments carry <b>approval checks</b> — a named human must click approve before the deploy job runs.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Azure DevOps is a single toolbox where the code, the pipeline that tests it, the built package, and the sign-off to release all live together — instead of five separate services." },
        { h: "The five parts", body: "<ul><li><b>Repos</b> — Git hosting for your code.</li><li><b>Pipelines</b> — runs build + test + deploy.</li><li><b>Artifacts</b> — stores the built package (feed).</li><li><b>Boards</b> — tracks the work (tickets, sprints).</li><li><b>Environments</b> — the dev/test/prod targets you deploy into.</li></ul>" },
        { h: "RetailFlow example", body: "The enterprise data team keeps the revenue pipeline in <b>Repos</b>. A push triggers a <b>Pipeline</b> that tests the net-revenue fix and publishes an <b>Artifact</b>; a manager approves the prod <b>Environment</b>, then it deploys." }
      ],
      intermediate: [
        { h: "The YAML pipeline", body: "A pipeline is <b>stages → jobs → steps</b>, all in <code>azure-pipelines.yml</code> in the repo. Triggers fire on branch pushes or PRs. Steps run <code>tasks</code> (prebuilt units like <code>UsePythonVersion@0</code>) or plain scripts. Variables and variable groups hold config." },
        { h: "Artifacts, published once", body: "A build stage runs <code>PublishPipelineArtifact</code> (or pushes to an Azure Artifacts feed). The <b>same</b> artifact is then consumed by every downstream deploy stage — you build once and promote it, never rebuild per environment." },
        { h: "Environments & approvals", body: "An <b>Environment</b> (e.g. <code>prod</code>) is a deployment target you register in Azure DevOps. You attach <b>approval checks</b> so a deploy job pauses until an authorized reviewer approves — the audit trail records who and when." }
      ],
      proficient: [
        { h: "Why Azure DevOps over GitHub Actions", body: "It's a <b>when</b>, not an <b>and</b>. Choose Azure DevOps when the org is already standardized on Azure + Entra ID, needs mature release-gate governance and audit trails, or has long-lived enterprise agreements. Choose GitHub Actions for OSS-style, GitHub-native, community-marketplace workflows. Teaching both as mandatory-together is wrong — most teams pick one CI home." },
        { h: "Agents & scaling", body: "Jobs run on <b>agents</b>: Microsoft-hosted pools (clean VM per run) or <b>self-hosted</b> agents inside your network for private data/warehouse access. Parallel jobs, YAML templates, and reusable stage templates keep large pipelines DRY across many data products." },
        { h: "Security & governance angle", body: "Service connections use Entra workload identity / managed identities instead of stored secrets. Environment checks can require approvals, business hours, or a passing gate query. Branch policies + required reviewers + Boards linkage give a full change-to-deploy audit trail — the reason regulated enterprises adopt it." }
      ]
    },

    micro: ["Repos", "Pipelines", "Artifacts feed", "Boards", "Environments", "stage", "job", "step", "task",
      "trigger", "variable group", "service connection", "hosted agent", "self-hosted agent", "approval check", "branch policy", "PublishPipelineArtifact"],

    before: ["repo in one tool", "CI in another", "packages elsewhere", "approvals over email", "no unified audit trail"],
    after: ["Repos + Pipelines + Artifacts", "one YAML pipeline", "Environment approval gates", "Boards linked to commits", "full change audit"],

    failure: {
      title: "Prod deploy with no approval gate",
      steps: ["Untested config change", "pipeline auto-deploys", "no human sign-off", "bad revenue job in prod", "7 AM dashboard wrong"],
      explain: "An <b>approval check</b> on the <code>prod</code> Environment would have paused the deploy until an authorized reviewer confirmed the change. Azure DevOps turns 'someone should have looked' into an enforced, audited gate."
    },

    whenNot: "Don't reach for Azure DevOps just because it's powerful. If your team lives in GitHub and wants a lightweight, community-driven workflow, <b>GitHub Actions</b> is the better home — Azure DevOps earns its weight in Azure-centric, governance-heavy enterprises, not in every project. Running both CI platforms in parallel for the same repo is usually a smell.",

    story: {
      situation: "RetailFlow's enterprise data platform is standardized on Azure and Entra ID; auditors require a signed approval for every production change.",
      problem: "The net-revenue fix must be built, tested, packaged, and released — with a recorded human sign-off, not an email chain.",
      decision: "The team runs an <code>azure-pipelines.yml</code>: test → publish artifact → deploy to the <code>prod</code> Environment behind an approval check.",
      tool: "Azure DevOps Pipelines + Environments.",
      result: "The fix is tested, the exact artifact is promoted, a manager approves prod, and the deploy + approver are logged for the audit.",
      remember: "Azure DevOps is the same CI/CD flow you know — with enterprise governance (approvals, audit, identity) built into one suite."
    },

    code: [{
      title: "azure-pipelines.yml — test, publish artifact, deploy with approval",
      lang: "yaml",
      code: "trigger:\n" +
            "  branches: { include: [ main ] }\n\n" +
            "stages:\n" +
            "  - stage: Build\n" +
            "    jobs:\n" +
            "      - job: test_and_package\n" +
            "        pool: { vmImage: ubuntu-latest }\n" +
            "        steps:\n" +
            "          - task: UsePythonVersion@0\n" +
            "            inputs: { versionSpec: '3.11' }\n" +
            "          - script: pip install -r requirements.txt && pytest tests/\n" +
            "            displayName: Run tests\n" +
            "          - task: PublishPipelineArtifact@1\n" +
            "            inputs: { targetPath: dist, artifact: revenue-pipeline }\n\n" +
            "  - stage: DeployProd\n" +
            "    dependsOn: Build\n" +
            "    jobs:\n" +
            "      - deployment: deploy\n" +
            "        environment: prod   # approval check attached in Environments UI\n" +
            "        strategy:\n" +
            "          runOnce:\n" +
            "            deploy:\n" +
            "              steps:\n" +
            "                - script: ./scripts/deploy.sh\n" +
            "                  displayName: Deploy revenue pipeline",
      highlights: [11, 13, 18]
    }],

    remember: "Azure DevOps puts Repos, Pipelines, Artifacts, Boards, and approval-gated Environments under one governed roof — the enterprise home for the same build → test → artifact → approve → deploy flow.",

    retention: {
      question: "A RetailFlow enterprise team must record a human sign-off before any revenue-pipeline change reaches production. Which Azure DevOps feature enforces that?",
      answer: "An <b>approval check on the prod Environment</b>. The deploy job pauses until an authorized reviewer approves, and Azure DevOps logs who approved and when — an enforced, audited release gate."
    }
  }));
})();
