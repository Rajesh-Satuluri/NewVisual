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
    },

    prerequisites: [
      "git",
      { id: "ci-vs-cd", label: "CI vs CD (where images get built)" },
      "artifact-lifecycle",
      "container-registry"
    ],

    production: [
      { h: "Pin everything by digest", body: "Pin the base image and the built image by <code>@sha256</code> digest, not <code>:latest</code> — RetailFlow's revenue processor runs in prod the exact bytes CI tested, with no drift from a moved tag." },
      { h: "Scan images for CVEs", body: "Scan on build/push (Trivy, Grype, registry scanning) and fail the pipeline on critical vulnerabilities; a pinned base image still needs rescanning as new CVEs are disclosed." },
      { h: "Run as non-root, minimal base", body: "Use a non-root <code>USER</code> and a <code>-slim</code>/distroless base to shrink attack surface and image size — faster pulls and fewer packages to exploit." },
      { h: "Keep secrets out of layers", body: "A secret <code>COPY</code>'d or <code>ENV</code>'d in persists in image history even if deleted later. Use build secrets (<code>--mount=type=secret</code>) or inject at runtime, never bake the warehouse password into the image." },
      { h: "Leverage layer cache", body: "Copy <code>requirements.txt</code> and install before copying source so dependency layers stay cached when only RetailFlow's transform code changes — cuts build time and registry churn." }
    ],

    misconceptions: [
      { myth: "A tag like <code>:1.4.0</code> is immutable.", truth: "A tag is a <b>movable pointer</b> — it can be re-pushed to point at different bytes. Only the <b>digest</b> (<code>@sha256:...</code>) is immutable, derived from content." },
      { myth: "Containers virtualize the OS like a VM.", truth: "Containers share the <b>host kernel</b> and isolate via namespaces/cgroups — much lighter than a VM, but a Linux image needs a Linux kernel; there's no separate guest OS." },
      { myth: "Deleting a secret in a later layer removes it from the image.", truth: "Each instruction is an immutable layer; a secret added in one layer stays in history even if a later layer removes the file. It must never enter a layer at all." },
      { myth: "<code>docker build</code> is deterministic by default.", truth: "Unpinned bases and <code>apt-get</code>/<code>pip</code> without version pins resolve to whatever is newest at build time, so two builds of the same Dockerfile can differ. Pinning is what makes it reproducible." }
    ],

    troubleshooting: [
      { symptom: "Build is slow and reinstalls dependencies on every code change.", cause: "Source is copied before <code>requirements.txt</code>, busting the dependency layer cache.", fix: "<code>COPY requirements.txt</code> and <code>pip install</code> before <code>COPY</code>ing source; verify the install layer shows <code>CACHED</code> on the next build." },
      { symptom: "Container exits immediately with no error.", cause: "The <code>ENTRYPOINT</code>/<code>CMD</code> process finished or the main process crashed on startup.", fix: "Run <code>docker logs &lt;id&gt;</code> and <code>docker run -it ... sh</code> to inspect; ensure the process runs in the foreground (PID 1), then confirm it stays up." },
      { symptom: "<code>permission denied</code> writing a file after adding <code>USER runner</code>.", cause: "The non-root user can't write to a directory owned by root.", fix: "<code>chown</code> the target dir to the runner before switching user, or mount a writable volume; verify by running the job end-to-end as that user." },
      { symptom: "Image works on your Mac but fails on the cluster.", cause: "Architecture mismatch — image built for <code>arm64</code>, nodes are <code>amd64</code>.", fix: "Build with <code>docker buildx --platform linux/amd64</code> (or multi-arch); verify with <code>docker inspect</code> that the manifest matches the node arch." },
      { symptom: "Final image is huge (GBs).", cause: "Build tools and caches baked into the runtime layer.", fix: "Use a multi-stage build and <code>COPY --from=builder</code> only artifacts; add a <code>.dockerignore</code>; re-check with <code>docker images</code>." }
    ],

    interview: [
      { q: "What's the difference between an image and a container?", a: "An <b>image</b> is an immutable, layered template built from a Dockerfile; a <b>container</b> is a running (or stopped) instance of that image with a writable layer on top. One image can spawn many identical containers." },
      { q: "Tag vs digest — which should production reference and why?", a: "The <b>digest</b> (<code>@sha256:...</code>), because it's a content hash and can never change. A tag is a movable pointer that someone can re-push, so pinning <code>:latest</code> in prod risks silently pulling untested bytes after a restart." },
      { q: "Why are multi-stage builds useful for a PySpark/data image?", a: "A fat builder stage compiles wheels and native deps, then the final stage <code>COPY --from=builder</code> copies only the needed artifacts onto a slim base. The runtime image is smaller, pulls faster, and drops build tools — less attack surface, which matters when the image runs across many cluster nodes." },
      { q: "How do you keep secrets out of a Docker image?", a: "Never <code>COPY</code> or <code>ENV</code> them in — they persist in layer history. Use BuildKit build secrets (<code>--mount=type=secret</code>) for build-time credentials and inject runtime secrets via environment/secret stores at <code>docker run</code> or in Kubernetes, so nothing sensitive is baked into the distributable image." }
    ],

    related: ["container-registry", "artifact-lifecycle", "kubernetes", "ci-vs-cd"]
  }));
})();
