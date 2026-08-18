/* modules/jenkins.js — Tier 3 · Jenkins (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "jenkins",
    title: "Jenkins",
    tool: "--tool-jenkins",
    icon: "🔧",
    eyebrow: "Tier 3 · Legacy CI (know it, don't over-invest)",
    subtitle: "The veteran self-hosted CI server still running many enterprise pipelines — worth recognizing, but for a new data engineer it's LOWER ROI than learning modern managed CI fundamentals first.",
    mentalImage: "SELF-HOSTED CI VETERAN",

    flowTitle: "A change moving through Jenkins",
    flow: ["Git", "Webhook", "Jenkins controller", "Pipeline", "Agent", "Build / Test", "Deploy"],

    why: "For years Jenkins <i>was</i> CI: an open-source server you host yourself, endlessly extensible via plugins. Many enterprises built their whole delivery process on it and still run it — so you'll meet it, even as new projects pick managed CI.",
    what: "Jenkins is a <b>self-hosted automation server</b> for CI/CD. A <b>controller</b> orchestrates jobs; <b>agents</b> run them; a <b>Jenkinsfile</b> in the repo defines the pipeline as <b>stages</b> and <b>steps</b>.",
    how: "A Git push fires a <b>webhook</b> to the Jenkins controller. It schedules the <b>pipeline</b> on an <b>agent</b>, which checks out the code and runs each <b>stage</b> (build → test → deploy), pulling secrets from the <b>credentials</b> store and capabilities from <b>plugins</b>.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Jenkins is a CI server your company runs on its own machines. When code is pushed, Jenkins wakes up and runs your build-and-test steps — the same job GitHub Actions does, but you own and maintain the server." },
        { h: "The core pieces", body: "<ul><li><b>Controller</b> — the brain that schedules jobs and shows results.</li><li><b>Agent</b> — a worker machine that actually runs the steps.</li><li><b>Jenkinsfile</b> — pipeline-as-code in your repo.</li><li><b>Stage</b> — a named phase (Build, Test, Deploy).</li></ul>" },
        { h: "RetailFlow example", body: "A legacy RetailFlow reporting system still runs on Jenkins. A push to its revenue code triggers a Jenkins pipeline that runs pytest and deploys — while the team plans to migrate it to managed CI." }
      ],
      intermediate: [
        { h: "Declarative Jenkinsfile", body: "Modern Jenkins uses a <b>declarative</b> <code>Jenkinsfile</code>: a <code>pipeline</code> block with <code>agent</code>, <code>stages</code>, and <code>steps</code>. It lives in the repo so the pipeline is versioned and reviewed like any other code." },
        { h: "Credentials & plugins", body: "Secrets live in the Jenkins <b>credentials</b> store and are injected via <code>withCredentials</code> — never hard-coded. Almost every integration (Git, Docker, cloud, Slack) comes from a <b>plugin</b>; the plugin ecosystem is Jenkins's superpower and its maintenance burden." },
        { h: "Controller / agent model", body: "The <b>controller</b> stays light and schedules work onto <b>agents</b> (static VMs, Docker, or Kubernetes-provisioned). Heavy builds run on agents so one machine doesn't become the bottleneck — but you're responsible for provisioning and patching all of it." }
      ],
      proficient: [
        { h: "Why enterprises still use it", body: "Sunk investment: hundreds of tuned Jenkinsfiles, shared libraries, on-prem agents with access to internal data, and air-gapped/regulated environments where a self-hosted server is a requirement. Rewriting all that is expensive, so Jenkins persists." },
        { h: "Why teams migrate away", body: "Jenkins means <b>you</b> run the servers: patching, plugin version hell, flaky agents, and security exposure. Managed CI (GitHub Actions, Azure Pipelines, GitLab CI) removes the ops burden with hosted runners, YAML config, and a curated action marketplace — so new projects rarely start on Jenkins." },
        { h: "Jenkins vs GitHub Actions (interview angle)", body: "Jenkins = <b>self-hosted, plugin-based, Groovy Jenkinsfile, you own the infra</b>. GitHub Actions = <b>managed, YAML, marketplace actions, GitHub owns the runners</b> (or you add self-hosted only where needed). Same CI concepts — the difference is who operates the platform. Know both terms; invest your learning in modern CI fundamentals." }
      ]
    },

    micro: ["controller", "agent / node", "pipeline", "Jenkinsfile", "stage", "step", "declarative pipeline",
      "credentials store", "plugin", "webhook trigger", "shared library", "executor", "workspace"],

    before: ["self-run CI server", "plugin version conflicts", "patch the agents yourself", "Groovy learning curve", "you own uptime"],
    after: ["managed hosted runners", "YAML pipelines", "curated marketplace", "no servers to patch", "provider owns uptime"],

    failure: {
      title: "Unpatched plugin breaks the nightly build",
      steps: ["Plugin auto-updates", "incompatible with pipeline", "nightly job fails silently", "revenue build never runs", "stale 7 AM dashboard"],
      explain: "This class of failure — plugin/version drift on a server <b>you</b> maintain — is exactly the ops burden managed CI removes. It's not that Jenkins can't work; it's that keeping it healthy is real, ongoing work a new data engineer shouldn't take on before mastering CI fundamentals."
    },

    whenNot: "Don't learn Jenkins deeply before you understand modern CI fundamentals (pipelines, stages, artifacts, gates) on a managed platform. As a new data engineer, Jenkins is <b>lower ROI</b>: recognize the controller/agent/Jenkinsfile vocabulary so you can work in a legacy shop, but invest your real time in GitHub Actions / Azure Pipelines. Don't start a greenfield project on Jenkins.",

    story: {
      situation: "A legacy RetailFlow revenue-reporting system still runs its CI on an on-prem Jenkins server the team inherited.",
      problem: "The Jenkins box needs constant plugin patching and only one engineer understands its Groovy pipeline — a fragile bottleneck.",
      decision: "The team keeps the existing Jenkinsfile running for now, but ports the pipeline's build → test → deploy stages to managed CI as part of a planned migration.",
      tool: "Jenkins (declarative pipeline) — being retired.",
      result: "The revenue build keeps flowing during migration; once it lands on managed CI, the server-maintenance burden disappears.",
      remember: "Jenkins taught the industry CI — but for a new data engineer it's a term to recognize, not the platform to master first."
    },

    code: [{
      title: "Jenkinsfile — declarative pipeline for the revenue build",
      lang: "groovy",
      code: "pipeline {\n" +
            "  agent { label 'linux' }\n" +
            "  stages {\n" +
            "    stage('Build') {\n" +
            "      steps { sh 'pip install -r requirements.txt' }\n" +
            "    }\n" +
            "    stage('Test') {\n" +
            "      steps { sh 'pytest tests/' }\n" +
            "    }\n" +
            "    stage('Deploy') {\n" +
            "      steps {\n" +
            "        withCredentials([string(credentialsId: 'prod-token', variable: 'TOKEN')]) {\n" +
            "          sh './scripts/deploy.sh'\n" +
            "        }\n" +
            "      }\n" +
            "    }\n" +
            "  }\n" +
            "}",
      highlights: [2, 8, 12]
    }],

    remember: "Jenkins is self-hosted CI: you own the controller, agents, and plugins. Same CI concepts as managed CI — just more ops. Recognize it; invest your learning in modern platforms.",

    retention: {
      question: "A RetailFlow legacy system runs on Jenkins. As a new data engineer, how much should you invest in learning it, and why?",
      answer: "Learn enough to <b>recognize the vocabulary</b> (controller, agent, Jenkinsfile, stages) so you can work in a legacy shop — but invest your real time in <b>modern managed CI fundamentals</b>. Jenkins's extra weight is self-hosting ops, not new CI concepts, so it's lower ROI to master first."
    }
  }));
})();
