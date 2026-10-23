/* modules/container-registry.js — Tier 2 · Container Registry (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "container-registry",
    title: "Container Registry",
    tool: "--tool-registry",
    icon: "📦",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "The versioned warehouse for container images — RetailFlow builds its pipeline image once, then promotes the exact same image (by digest) from dev to prod instead of rebuilding.",
    mentalImage: "IMAGE WAREHOUSE",

    flowTitle: "An image moving through a registry",
    flow: ["docker build", "Image", "docker push", "Registry", "docker pull", "Runtime"],

    why: "If each environment rebuilds its own image, dev and prod run <i>different bytes</i> — a dependency shifts between builds and 'works in dev' stops meaning anything in prod.",
    what: "A container registry is a <b>versioned store for images</b>: images live in <b>repositories</b>, are addressed by mutable <b>tags</b> and immutable <b>digests</b>, and are pulled by any runtime that needs them.",
    how: "CI builds an image once, pushes it to the registry, and every environment <b>pulls the same image by digest</b> — promotion moves a reference, it does not rebuild.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "A registry is like an app store for your container images. You <b>push</b> an image up once and any server can <b>pull</b> it down — the same image, everywhere." },
        { h: "Repository, tag, digest", body: "<ul><li><b>Repository</b> — one named slot, e.g. <code>retailflow/pipeline</code>.</li><li><b>Tag</b> — a friendly label like <code>:2.9.1</code> (can be moved).</li><li><b>Digest</b> — a content hash like <code>@sha256:ab12…</code> that <b>always points to the exact same bytes</b>.</li></ul>" },
        { h: "RetailFlow example", body: "CI builds <code>retailflow/pipeline:2.9.1</code> once and pushes it. Dev and prod both pull that same image — nobody rebuilds, so there's nothing to drift." }
      ],
      intermediate: [
        { h: "Common registries", body: "<b>GitHub Container Registry</b> (<code>ghcr.io</code>), <b>Azure Container Registry</b> (<code>*.azurecr.io</code>), and <b>Amazon ECR</b> (<code>*.dkr.ecr.*.amazonaws.com</code>) all do the same job — store, version, and serve images with access control and vulnerability scanning." },
        { h: "Tags are mutable, digests are not", body: "A tag like <code>:latest</code> or <code>:2.9.1</code> can be re-pushed to point at new bytes. A <b>digest</b> (<code>@sha256:…</code>) is derived from the content, so it can never change. That difference is the whole game for reproducibility." },
        { h: "Promotion, not rebuild", body: "'Promoting' an image means re-tagging or referencing the <i>tested</i> image for the next environment — <code>dev</code> → <code>prod</code>. The bytes that passed dev's tests are exactly what runs in prod." }
      ],
      proficient: [
        { h: "Prefer immutable digests", body: "In production manifests, pin <code>retailflow/pipeline@sha256:…</code> instead of <code>:latest</code>. A tag can silently move; a digest cannot. This makes deployments reproducible and defeats 'someone re-pushed latest' incidents." },
        { h: "Promotion pipeline", body: "RetailFlow captures the digest at build time, runs tests against it, then promotes that exact digest downstream. Registries can also enforce <b>immutable tags</b> so a published version can never be overwritten." },
        { h: "Layers, caching, hygiene", body: "Images are content-addressed layers, so pushes/pulls only move changed layers. Add retention policies to expire old tags, scan on push for CVEs, and require signed/verified images before they can be pulled into prod." }
      ]
    },

    micro: ["repository", "image", "tag", "digest", "sha256", "immutable version", "promotion", "docker push",
      "docker pull", "latest anti-pattern", "immutable tags", "vulnerability scan", "ghcr.io", "ECR", "ACR",
      "layers", "retention policy"],

    before: ["rebuild per environment", "different bytes in prod", "'works in dev' only", "latest points anywhere", "no provenance"],
    after: ["build once, push once", "same image everywhere", "promote by digest", "reproducible pulls", "scanned & versioned"],

    failure: {
      title: "Prod pulled a moved :latest tag",
      steps: ["Prod pins image:latest", "someone re-pushes latest", "prod restarts", "pulls new untested bytes", "revenue pipeline breaks in prod"],
      explain: "Because prod referenced a <b>mutable tag</b>, a re-push changed what 'latest' meant, and a restart quietly pulled untested code. Pinning the <b>digest</b> (<code>@sha256:…</code>) — the same tested image promoted from dev — would have made prod immune to the re-push."
    },

    whenNot: "You don't need a registry for code that isn't containerized — a Python package on a package index or a dbt project in Git is served differently. And don't stuff <b>data or secrets</b> into an image just to move them; images are for the runtime, not for datasets or credentials.",

    story: {
      situation: "RetailFlow ships its revenue pipeline as a container image and needs identical behavior from dev to prod.",
      problem: "Each environment used to rebuild its own image, so a shifting dependency meant dev and prod ran subtly different code.",
      decision: "CI builds the image once, pushes to the registry, and each stage <b>promotes the same image by digest</b> — no rebuilds downstream.",
      tool: "Container registry + immutable digests.",
      result: "The exact bytes that passed dev's tests run in prod. 'Works in dev' finally guarantees 'works in prod'.",
      remember: "Build once, promote the digest — don't rebuild per environment."
    },

    code: [{
      title: "Build once, then promote the same image by digest",
      lang: "bash",
      code: "# CI builds and pushes ONCE\n" +
            "docker build -t ghcr.io/retailflow/pipeline:2.9.1 .\n" +
            "docker push ghcr.io/retailflow/pipeline:2.9.1\n" +
            "\n" +
            "# capture the immutable digest of what we just pushed\n" +
            "DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' \\\n" +
            "  ghcr.io/retailflow/pipeline:2.9.1)\n" +
            "echo \"$DIGEST\"   # ghcr.io/retailflow/pipeline@sha256:ab12...\n" +
            "\n" +
            "# prod deploys THAT digest — never a rebuild, never :latest\n" +
            "kubectl set image deploy/pipeline pipeline=\"$DIGEST\"",
      highlights: [6, 11]
    }],

    remember: "Tags move, digests don't — build the image once, promote it by <code>@sha256</code> digest, and dev and prod run the exact same bytes.",

    retention: {
      question: "RetailFlow wants prod to run the exact image that passed tests in dev, with zero chance of drift. What registry concept guarantees this, and what should it avoid?",
      answer: "Reference the image by its immutable <b>digest</b> (<code>@sha256:…</code>) and <b>promote</b> that same digest dev→prod instead of rebuilding. Avoid pinning mutable tags like <code>:latest</code>, which can be re-pushed to point at different, untested bytes."
    },

    prerequisites: [
      "docker",
      "artifact-lifecycle",
      { id: "environment-promotion", label: "Environment promotion (dev→prod)" },
      "security"
    ],

    production: [
      { h: "Reference by digest, not tag", body: "Prod manifests should pin <code>retailflow/pipeline@sha256:…</code> so a re-pushed tag can never swap in untested bytes — the revenue pipeline runs exactly what passed dev's tests." },
      { h: "Scan on push", body: "Enable registry vulnerability scanning (ACR/ECR/ghcr) so a newly disclosed CVE in a pushed image is flagged; block promotion of images with critical findings." },
      { h: "Immutable tags + retention", body: "Enable <b>immutable tags</b> so a published version can never be overwritten, and add retention/GC policies to expire old untagged layers before storage costs balloon." },
      { h: "Access control + pull auth", body: "Scope push to CI and pull to runtimes with least-privilege tokens/managed identities; a public or over-permissioned registry leaks your images and invites supply-chain tampering." },
      { h: "Signing and verification", body: "Sign images (cosign/Notation) and require signature verification before prod pulls, so only images built from reviewed source can run." }
    ],

    misconceptions: [
      { myth: "A tag like <code>:2.9.1</code> permanently identifies one image.", truth: "Tags are <b>mutable pointers</b> — anyone with push access can re-point <code>:2.9.1</code> at new bytes. Only the digest is content-addressed and immutable." },
      { myth: "Promotion means rebuilding the image for prod.", truth: "Promotion <b>moves a reference</b> (retag/copy the tested digest), it does not rebuild — rebuilding re-resolves dependencies and can produce different bytes than were tested." },
      { myth: "The registry is a good place to ship datasets or config.", truth: "A registry stores runtime images, not data or secrets. Baking a dataset or credential into an image bloats it and leaks the secret into every pull." },
      { myth: "Pushing a new image replaces the old layers entirely.", truth: "Images are content-addressed layers; a push only uploads <b>changed</b> layers, and old layers persist until retention/GC removes them." }
    ],

    troubleshooting: [
      { symptom: "<code>ImagePullBackOff</code> / <code>ErrImagePull</code> in Kubernetes.", cause: "Wrong tag/digest, missing <code>imagePullSecret</code>, or no pull permission on the registry.", fix: "Verify the reference exists (<code>docker manifest inspect</code>), attach a valid pull secret/identity, then confirm the pod pulls and starts." },
      { symptom: "Prod suddenly runs different behavior after a restart, no deploy happened.", cause: "Prod pinned a mutable tag and someone re-pushed it.", fix: "Pin the <b>digest</b> instead and enable immutable tags; verify by diffing the running image's digest against the promoted one." },
      { symptom: "<code>denied: requested access to the resource is denied</code> on push.", cause: "Not logged in, or token lacks push scope to that repository.", fix: "<code>docker login</code> / refresh the CI identity with push scope, then re-push and confirm the tag appears in the registry." },
      { symptom: "Registry storage keeps growing and costs climb.", cause: "No retention policy; old tags and untagged layers accumulate.", fix: "Add a retention/GC policy to expire old tags and prune dangling layers; verify storage drops after the next GC run." },
      { symptom: "Pulls are slow across the cluster.", cause: "Registry is in a different region, or no layer caching/mirror.", fix: "Use a geo-replicated registry or a pull-through cache near the nodes; verify pull latency improves." }
    ],

    interview: [
      { q: "Why pin images by digest rather than tag in production?", a: "A digest (<code>@sha256:…</code>) is a content hash — immutable and reproducible. A tag is a movable pointer anyone with push access can re-point, so a tag-pinned prod can silently pull untested bytes on the next restart. Digests guarantee prod runs exactly what was tested." },
      { q: "What does 'build once, promote' mean and why does it matter?", a: "CI builds the image a single time, captures its digest, tests that digest, then promotes <b>the same digest</b> through dev→test→prod — never rebuilding. Rebuilding per environment re-resolves dependencies and base images, so prod could run code that was never tested. Promotion keeps every environment byte-for-byte identical." },
      { q: "How do you stop a compromised or vulnerable image from reaching prod?", a: "Scan on push and fail on critical CVEs, enable immutable tags so published versions can't be overwritten, sign images and require verification before pull, and scope registry access with least-privilege identities — so only reviewed, signed, clean images are promotable." },
      { q: "A pod is stuck in <code>ImagePullBackOff</code> — how do you debug it?", a: "Check <code>kubectl describe pod</code> for the pull error: a missing/typo'd tag or digest, a missing <code>imagePullSecret</code>, or lack of pull permission. Verify the reference exists with <code>docker manifest inspect</code>, fix the auth or reference, and confirm the pod pulls and starts." }
    ],

    related: ["docker", "artifact-lifecycle", "kubernetes", "security"]
  }));
})();
