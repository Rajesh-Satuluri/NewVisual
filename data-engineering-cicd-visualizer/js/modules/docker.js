/* modules/docker.js — Tier 2 · Docker (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "docker",
    title: "Docker",
    tool: "--tool-docker",
    icon: "🐳",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Packaging done right — RetailFlow's PySpark revenue processor bundled with its exact Python, libraries, and OS into one immutable image that runs the same on a laptop, in CI, and in production.",
    mentalImage: "PACKAGED SOFTWARE (image) → RUNNING PACKAGE (container)",

    flowTitle: "From Dockerfile to running container",
    flow: ["Dockerfile", "build context", "docker build", "image (layers)", "tag @sha256", "registry", "docker run", "container"],

    why: "\"It works on my machine\" is the enemy of data engineering. The revenue processor runs on the engineer's Python 3.11 with pandas 2.1, but CI has 3.9 and prod has 2.0 — same code, different results, silent breakage.",
    what: "Docker <b>packages code plus its entire environment</b> — OS libraries, Python version, dependencies — into an <b>image</b>, an immutable bundle that runs identically anywhere Docker runs.",
    how: "A <b>Dockerfile</b> is the recipe; <code>docker build</code> turns it into a layered <b>image</b>; you <b>tag</b> and push it to a <b>registry</b>; <code>docker run</code> starts a <b>container</b> — a running instance of that frozen image.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A Docker <b>image</b> is a sealed lunchbox: code and everything it needs to run, packed together. A <b>container</b> is that lunchbox opened and running. Same box → same meal, on any machine." },
        { h: "Image vs container", body: "The <b>image</b> is the frozen template (built once, never changes). A <b>container</b> is a live instance of it. You can start ten identical containers from one image — like ten copies of the same lunchbox." },
        { h: "The Dockerfile", body: "A <b>Dockerfile</b> lists the build steps: start from a <b>base image</b> (<code>python:3.11-slim</code>), copy the code, install dependencies, and say how to run. <code>docker build</code> reads it and produces the image." }
      ],
      intermediate: [
        { h: "Layers, cache & build context", body: "Each Dockerfile instruction is a cached <b>layer</b>. Copy <code>requirements.txt</code> and install <i>before</i> copying source, so dependency layers stay cached when only code changes. The <b>build context</b> is what you send to the builder; <code>.dockerignore</code> keeps junk (data, <code>.git</code>) out." },
        { h: "Tags, digests & registries", body: "A <b>tag</b> is a human label (<code>revenue:1.4.0</code>); a <b>digest</b> (<code>@sha256:...</code>) is the immutable content hash. Push to a <b>registry</b> (ACR, Docker Hub) so CI and prod pull the <i>exact same</i> image by digest — not \"latest\", which moves." },
        { h: "Runtime: env, volumes, networks", body: "<b>Env vars</b> pass config in (<code>DATABRICKS_HOST</code>). <b>Volumes</b> mount persistent or external data so it isn't baked into the image. <b>Networks</b> let containers talk. <b>ENTRYPOINT</b> is the fixed command; <b>CMD</b> is its default arguments." }
      ],
      proficient: [
        { h: "Multi-stage builds", body: "Use a fat builder stage to compile wheels, then <code>COPY --from=builder</code> only the artifacts into a slim final image. RetailFlow's PySpark image drops build tools from the runtime — smaller, faster to pull, less attack surface." },
        { h: "Immutability & reproducibility", body: "Pin the base image by digest, pin every dependency version, and tag the built image by content SHA. The image CI tested is byte-for-byte the image prod runs — the whole point is that nothing changes between environments." },
        { h: "Security & size trade-offs", body: "Run as a non-root user, scan images for CVEs, prefer <code>-slim</code>/distroless bases, and keep secrets out of layers (they persist in history even if later deleted). Smaller, pinned, non-root images are the senior default." }
      ]
    },

    micro: ["Dockerfile", "base image", "layer", "build context", ".dockerignore", "image", "tag", "digest",
      "container", "registry", "volume", "network", "ENTRYPOINT", "CMD", "env var", "multi-stage build", "docker run"],

    before: ["works on my laptop", "Python 3.11 vs 3.9", "pandas version drift", "\"but it ran locally!\"", "manual env setup"],
    after: ["one immutable image", "same env everywhere", "pinned versions", "pull by SHA digest", "reproducible runs"],

    failure: {
      title: "Works on the laptop, fails in CI",
      steps: ["code runs locally (pandas 2.1)", "push to CI", "CI has pandas 2.0", "revenue groupby behaves differently", "test fails ❌", "package as image → both use same versions"],
      explain: "Without Docker, the laptop and CI silently have different library versions, so the revenue aggregation gives different numbers. Packaging the processor into an image with <b>pinned</b> dependencies means CI and prod run the <i>identical</i> environment — the mismatch can't happen."
    },

    whenNot: "Docker packages a process and its environment — it isn't a database, a data store, or a substitute for orchestration. Don't store your Parquet inside the image, and don't reach for containers when a simple virtualenv or a managed runtime already gives you a reproducible-enough environment for a small script.",

    story: {
      situation: "RetailFlow's revenue processor is a PySpark job that must run identically in CI and on the production cluster.",
      problem: "Each environment has slightly different Python and library versions, so the same code produces subtly different revenue totals.",
      decision: "The team writes a Dockerfile from <code>python:3.11-slim</code>, pins dependencies, and builds an image tagged by its content SHA.",
      tool: "Docker image built in CI, pushed to the registry, pulled by digest in prod.",
      result: "The exact image that passed tests is the exact image production runs — the environment stops being a variable.",
      remember: "Build the environment once, freeze it into an image, and run that same frozen thing everywhere — reproducibility is the feature."
    },

    code: [{
      title: "Dockerfile — the RetailFlow revenue processor",
      lang: "dockerfile",
      code: "# syntax=docker/dockerfile:1\n" +
            "FROM python:3.11-slim\n" +
            "\n" +
            "WORKDIR /app\n" +
            "\n" +
            "# Install deps first so this layer stays cached\n" +
            "COPY requirements.txt .\n" +
            "RUN pip install --no-cache-dir -r requirements.txt\n" +
            "\n" +
            "# Then copy source (.dockerignore keeps out data & .git)\n" +
            "COPY transforms/ ./transforms/\n" +
            "\n" +
            "# Run as non-root\n" +
            "RUN useradd -m runner\n" +
            "USER runner\n" +
            "\n" +
            "ENTRYPOINT [\"python\", \"-m\", \"transforms.revenue\"]",
      highlights: [2, 7, 8, 15]
    }],

    remember: "An image is your code plus its whole world, frozen; a container is that image running — build once, pin everything, run the same bytes in CI and prod.",

    retention: {
      question: "RetailFlow's revenue code passes on a laptop but fails in CI because of a pandas version difference. How does Docker eliminate this class of bug?",
      answer: "By packaging the code with its <b>exact</b> environment — base image, Python version, and pinned dependencies — into one immutable <b>image</b>. CI and production pull the same image (ideally by <code>@sha256</code> digest), so there's no version drift between environments to cause different results."
    }
  }));
})();
