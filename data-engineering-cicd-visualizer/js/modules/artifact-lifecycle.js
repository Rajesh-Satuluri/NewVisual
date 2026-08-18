/* modules/artifact-lifecycle.js — Tier 2 · Artifact Lifecycle (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "artifact-lifecycle",
    title: "Artifact Lifecycle",
    tool: "--tool-registry",
    icon: "📦",
    eyebrow: "Tier 2 · Core CI/CD Concepts",
    subtitle: "Build once, promote the same artifact. RetailFlow builds the revenue-processor image a single time and moves that exact bytes-for-bytes package dev → test → prod — so what you tested is what ships.",
    mentalImage: "BUILD ONCE, PROMOTE THE SAME BYTES",

    flowTitle: "One artifact's journey to production",
    flow: ["Source code", "Build", "Artifact", "Registry", "Promote (dev→test→prod)", "Deployment"],

    why: "If you <b>rebuild</b> the pipeline separately for each environment, dev, test, and prod can quietly differ — a dependency version bumps, a base image updates — and the thing you tested is not the thing that runs. Bugs appear only in prod, unreproducibly.",
    what: "An <b>artifact</b> is the immutable, versioned output of a build — a Python wheel, a Docker image, a dbt project artifact, a Databricks bundle, a compiled app. The <b>lifecycle</b> is: build it once, store it in a <b>registry</b>, then <b>promote</b> that same artifact through environments.",
    how: "CI builds the artifact <b>once</b> and pushes it to a registry with an immutable version/digest. Each environment <b>pulls the same artifact</b> and deploys it. Promotion moves a reference (a tag/digest), never a rebuild.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "An artifact is a sealed box holding your built code, ready to run. You pack the box <b>once</b>, then move the <i>same</i> box from dev to test to prod — you don't repack it at each stop." },
        { h: "What counts as an artifact", body: "<ul><li>A <b>Python package</b> (<code>.whl</code>)</li><li>A <b>Docker image</b></li><li>A <b>dbt project artifact</b> (compiled manifest)</li><li>A <b>Databricks bundle</b></li><li>A <b>compiled app</b> / jar</li></ul>All are versioned, immutable build outputs." },
        { h: "RetailFlow example", body: "CI builds the revenue-processor into a Docker image tagged <code>revenue:1.4.2</code> and pushes it to the registry. Test pulls <code>revenue:1.4.2</code>, verifies it, then prod pulls the exact same <code>revenue:1.4.2</code> — same bytes everywhere." }
      ],
      intermediate: [
        { h: "Build once, promote the same artifact", body: "The golden rule. CI produces one immutable artifact; promotion is just moving that artifact's reference forward. Because dev/test/prod run the <b>identical</b> package, a passing test in one environment actually means something in the next." },
        { h: "Why rebuilding per environment breaks things", body: "Rebuild-per-env re-resolves dependencies, re-pulls base images, and re-runs the toolchain each time. A transitive dependency or base-image update between the test build and the prod build means <b>prod runs different code than you tested</b> — the classic 'works in test, fails in prod' with no code change." },
        { h: "The registry & versioning", body: "Artifacts live in a <b>registry</b> (container registry, PyPI-style feed, Databricks/artifact store) addressed by an immutable <b>version</b> and ideally a content <b>digest</b> (e.g. an image <code>sha256:</code>). Pinning by digest guarantees the exact bytes; a mutable tag like <code>latest</code> does not." }
      ],
      proficient: [
        { h: "Immutability & provenance", body: "A production artifact should be immutable and traceable: which commit, which build, which tests passed. Reference by <b>digest</b> so a tag can't be silently repointed. Attach provenance/SBOM and signatures so you can prove what's running was built from reviewed source." },
        { h: "Promotion as a reference move", body: "Promotion pipelines don't rebuild — they retag/copy the tested digest into the next environment's namespace or mark it 'approved for prod'. Deploys resolve by digest. This makes rollback trivial: point back to the previous known-good digest." },
        { h: "Trade-offs & interview angle", body: "Build-once demands environment differences live in <b>config/injected variables</b>, not in the artifact — the same image reads env-specific settings at deploy time. The senior framing: 'The artifact is immutable; the environment is configuration.' That separation is what makes tests trustworthy and rollbacks instant." }
      ]
    },

    micro: ["artifact", "immutable version", "content digest", "registry / feed", "Docker image", "Python wheel",
      "dbt project artifact", "Databricks bundle", "build once", "promote", "retag / copy", "provenance / SBOM", "rollback by digest"],

    before: ["rebuild per environment", "deps drift between builds", "'works in test, fails in prod'", "unreproducible prod bugs", "unclear what's deployed"],
    after: ["build once", "one immutable artifact", "promote same bytes", "same tested code everywhere", "rollback = old digest"],

    failure: {
      title: "Rebuilding for prod pulls a newer dependency",
      steps: ["Test builds revenue:test", "prod rebuilds from source", "a dependency bumped since", "prod image differs subtly", "revenue calc breaks only in prod"],
      explain: "Because prod was <b>rebuilt</b> instead of promoting the tested artifact, a dependency changed between builds and prod ran code that was never tested. <b>Build once, promote the same digest</b> makes this impossible — test and prod are byte-for-byte identical."
    },

    whenNot: "Don't bake environment-specific values <b>into</b> the artifact (a prod database URL, a dev API key) — that forces a rebuild per environment and defeats build-once. Keep the artifact immutable and universal; inject environment differences as <b>configuration/secrets at deploy time</b>. And don't promote by mutable <code>latest</code> tag when you need guarantees — pin by digest.",

    story: {
      situation: "RetailFlow's revenue processor runs as a container; the team used to build it fresh in each environment's pipeline.",
      problem: "A dependency updated between the test build and the prod build, so prod silently ran different code than QA approved — and the revenue calc broke only at 7 AM in prod.",
      decision: "CI now builds the image <b>once</b>, pushes <code>revenue:1.4.2</code> (pinned by digest) to the registry, and each environment pulls that exact artifact.",
      tool: "Immutable artifact + registry + promotion.",
      result: "Dev, test, and prod run byte-for-byte the same image; a green test now guarantees prod behavior, and rollback is just redeploying the previous digest.",
      remember: "Build the artifact once and promote the same bytes — the thing you tested must be the thing that ships."
    },

    code: [{
      title: "Build once, promote the same image (no rebuild per env)",
      lang: "bash",
      code: "# CI: build ONCE and push an immutable, versioned artifact\n" +
            "docker build -t registry.retailflow.io/revenue:1.4.2 .\n" +
            "docker push registry.retailflow.io/revenue:1.4.2\n" +
            "DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' registry.retailflow.io/revenue:1.4.2)\n\n" +
            "# TEST: pull and verify the SAME artifact\n" +
            "docker pull $DIGEST\n" +
            "./scripts/smoke_test.sh $DIGEST\n\n" +
            "# PROD: deploy the exact SAME digest — no rebuild\n" +
            "kubectl set image deploy/revenue revenue=$DIGEST",
      highlights: [2, 4, 10]
    }],

    remember: "An artifact is an immutable, versioned build output. Build it once, store it in a registry, promote the same bytes dev→test→prod — rebuilding per environment is how 'works in test, fails in prod' happens.",

    retention: {
      question: "Why does RetailFlow build the revenue image once and promote it, instead of rebuilding it in each environment's pipeline?",
      answer: "Rebuilding per environment re-resolves dependencies and base images, so prod can end up running <b>different code than was tested</b>. Building <b>once</b> and promoting the same immutable artifact (pinned by digest) guarantees dev/test/prod are byte-for-byte identical — so a passing test actually predicts prod, and rollback is just redeploying the prior digest."
    }
  }));
})();
