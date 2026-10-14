/* modules/secrets.js — Tier 2 · Secrets & Environment Management (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "secrets",
    title: "Secrets & Environment Management",
    tool: "--tool-secrets",
    icon: "🔐",
    eyebrow: "Tier 2 · Data Engineering CI/CD",
    subtitle: "Keeping credentials out of code — RetailFlow's pipeline reaches the payments API through a Key Vault secret injected at runtime, never a password sitting in a Git file.",
    mentalImage: "CODE · CONFIG · SECRETS",

    flowTitle: "A secret reaching the pipeline",
    flow: ["Secret store", "OIDC / identity", "CI requests secret", "Injected at runtime", "Pipeline reads env var", "Payments API"],

    why: "The classic breach: someone writes <code>PASSWORD=abc123</code> in the repo, it's pushed to GitHub, and that credential is now permanently in Git history for anyone with access — leaks like this cause real incidents.",
    what: "Secrets management <b>separates Code, Config, and Secrets</b>: source lives in Git, environment-specific settings live in config, and credentials live in a dedicated <b>secret store</b> that injects them at runtime.",
    how: "The pipeline never contains the password. A secret store (Key Vault, Secrets Manager, GitHub Secrets) holds it; the workload authenticates with a short-lived identity (OIDC), and the secret is <b>injected as an environment variable</b> when the job runs.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "Think of three separate drawers: <b>Code</b> (your logic, in Git), <b>Config</b> (which database, safe to see), and <b>Secrets</b> (passwords and keys, locked away). Never mix a secret into the code drawer." },
        { h: "Never commit a password", body: "Writing <code>PASSWORD=abc123</code> in a file and pushing it means the secret is now in Git history <b>forever</b> — deleting the line later doesn't remove it. Keep secrets out of the repo entirely." },
        { h: "RetailFlow example", body: "The revenue pipeline calls a payments API that needs a key. The key lives in <b>Azure Key Vault</b>; at runtime it's handed to the job as an environment variable. The code just reads <code>os.environ['PAYMENTS_API_KEY']</code> — it never contains the value." }
      ],
      intermediate: [
        { h: "Where secrets live", body: "<ul><li><b>GitHub Secrets</b> — for CI workflow steps.</li><li><b>Azure Key Vault</b> / <b>AWS Secrets Manager</b> — cloud secret stores with access policies.</li><li><b>Kubernetes Secrets</b> — for pods at runtime.</li><li><b>Databricks secret scopes</b> — for notebooks/jobs.</li></ul>" },
        { h: "Injection & environment separation", body: "Secrets are <b>injected</b> at runtime as env vars or mounted files — never baked into images or code. Each environment gets its own secret: dev's payments key differs from prod's, so a dev leak can't touch production money." },
        { h: "Least privilege & rotation", body: "Grant each identity only the secrets it needs (<b>least privilege</b>). <b>Rotate</b> secrets on a schedule and immediately after any suspected leak, so an exposed credential has a short useful life." }
      ],
      proficient: [
        { h: "OIDC & short-lived credentials", body: "The strongest pattern uses <b>no stored long-lived secret at all</b>: GitHub Actions authenticates to Azure/AWS via <b>OIDC</b>, exchanging a signed workflow token for a short-lived cloud credential. Nothing durable to leak, and access expires in minutes." },
        { h: "Defense in depth", body: "Combine store-level access policies, per-environment isolation, audit logging on secret reads, and pre-commit / push secret scanning. Secret scanning + push protection stops <code>PASSWORD=abc123</code> before it ever lands in history." },
        { h: "Incident response", body: "A leaked secret is not 'fixed' by deleting the commit — the value must be treated as compromised and <b>rotated</b>: issue a new credential, update the store, revoke the old one, then scrub history. Rotation is the real remediation, not the git rewrite." }
      ]
    },

    micro: ["GitHub Secrets", "Azure Key Vault", "AWS Secrets Manager", "Kubernetes Secrets",
      "Databricks secret scopes", "secret injection", "environment variable", "environment separation",
      "least privilege", "secret rotation", "OIDC", "short-lived credentials", "secret scanning", "audit log"],

    before: ["PASSWORD=abc123 in repo", "same key everywhere", "credential in Git history", "no rotation", "one leak = full access"],
    after: ["secrets in a vault", "injected at runtime", "per-environment keys", "OIDC short-lived creds", "rotate on demand"],

    failure: {
      title: "Payments API key committed to Git",
      steps: ["Hard-code key in config.py", "git push", "key now in history", "repo/log exposed", "leak → attacker hits payments API", "rotate the key"],
      explain: "Once pushed, the credential lives in Git history and cannot be un-seen. The only real fix is to <b>rotate</b> — issue a new key in Key Vault, revoke the old one, and inject the new one at runtime. <b>Secret scanning with push protection</b> would have blocked the commit entirely."
    },

    whenNot: "A secret store is for <b>credentials</b>, not for non-sensitive config. Don't push connection <i>hostnames</i>, feature flags, or region names through Key Vault — that's ordinary config that belongs in checked-in files. Over-vaulting harmless values adds friction and hides what's actually sensitive.",

    story: {
      situation: "RetailFlow's revenue pipeline must call the payments API, which requires a secret key.",
      problem: "An early version hard-coded the key in a config file — one push away from leaking it into Git history forever.",
      decision: "The team moves the key into <b>Azure Key Vault</b>, grants the pipeline's identity least-privilege read access, and injects it as an env var at runtime (via OIDC, no stored password).",
      tool: "Azure Key Vault + runtime secret injection.",
      result: "The code reads <code>PAYMENTS_API_KEY</code> from the environment and never contains the value. Rotating the key is a vault update — no code change, no leak.",
      remember: "Secrets live in the vault and arrive at runtime — never in the code."
    },

    code: [{
      title: "Inject a Key Vault secret at runtime — never in code",
      lang: "yaml",
      code: "# .github/workflows/pipeline.yml\n" +
            "jobs:\n" +
            "  run-pipeline:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    permissions:\n" +
            "      id-token: write        # enable OIDC (no stored password)\n" +
            "    steps:\n" +
            "      - uses: azure/login@v2\n" +
            "        with:\n" +
            "          client-id: ${{ secrets.AZURE_CLIENT_ID }}\n" +
            "          tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n" +
            "          subscription-id: ${{ secrets.AZURE_SUB_ID }}\n" +
            "      - name: Fetch payments key and run\n" +
            "        run: |\n" +
            "          export PAYMENTS_API_KEY=$(az keyvault secret show \\\n" +
            "            --vault-name retailflow-kv --name payments-api-key \\\n" +
            "            --query value -o tsv)\n" +
            "          python run_revenue_pipeline.py   # reads os.environ['PAYMENTS_API_KEY']",
      highlights: [6, 15, 19]
    }],

    remember: "Code, config, and secrets are three separate drawers — the secret lives in a vault and is injected at runtime; if it ever leaks, you rotate it, you don't just delete the commit.",

    retention: {
      question: "RetailFlow's pipeline needs a payments API key but must never store it in the repo. How should the key reach the code, and what do you do if it leaks?",
      answer: "Keep the key in a <b>secret store</b> (Azure Key Vault), grant the pipeline least-privilege access via <b>OIDC</b> short-lived credentials, and <b>inject it at runtime</b> as an env var the code reads — the value is never in Git. If it leaks, <b>rotate</b> it (new key, revoke old); deleting the commit is not enough."
    },

    prerequisites: [
      "git",
      "github-actions",
      { id: "security", label: "CI/CD security (the wider picture)" }
    ],

    production: [
      { h: "Rotate with overlap", body: "Schedule rotation and keep the old and new credential valid together for a short window so in-flight jobs don't fail mid-rotation — then revoke the old one once nothing uses it." },
      { h: "Least privilege per identity", body: "Scope each secret to the one workload that needs it; RetailFlow's revenue pipeline identity can read <code>payments-api-key</code> and nothing else, so a compromised job can't reach unrelated secrets." },
      { h: "Prefer OIDC over stored secrets", body: "Where the cloud supports it, exchange a signed workflow token for a short-lived credential (<code>id-token: write</code>) so there is no durable password to leak or rotate at all." },
      { h: "Mask secrets in logs", body: "Register injected values as masked (GitHub auto-masks <code>secrets.*</code>; use <code>::add-mask::</code> for values you fetch) so an <code>echo</code> or stack trace never prints the raw credential." },
      { h: "Audit secret reads", body: "Turn on access logging on the vault so every read is attributable — unexpected reads are the earliest signal that an identity or token has been abused." }
    ],

    misconceptions: [
      { myth: "Passing a secret as a Docker <code>build ARG</code> keeps it safe.", truth: "Build args are baked into image layers and visible in <code>docker history</code>; mount secrets at build with BuildKit <code>--secret</code> or inject at runtime instead." },
      { myth: "Deleting the commit that leaked a key removes the secret.", truth: "The value lives in Git history and anyone who cloned it still has it — the only real fix is to <b>rotate</b> the credential; history scrubbing is cleanup, not remediation." },
      { myth: "A secret in an environment variable can't end up in logs.", truth: "Any <code>env</code>, <code>set -x</code>, crash dump, or verbose client can print it — values must be explicitly masked, not assumed hidden." },
      { myth: "GitHub Secrets encrypt the value so it's fine to reuse one key everywhere.", truth: "Encryption at rest doesn't limit blast radius; one shared key means one leak compromises every environment, which is why per-environment secrets matter." }
    ],

    troubleshooting: [
      { symptom: "Push blocked / scanner flags a committed credential.", cause: "A real secret was written into a tracked file.", fix: "Treat it as compromised and <b>rotate</b> it immediately, remove it from the file and read it from the vault, then confirm the scanner is green and the old value is revoked." },
      { symptom: "CI job can read far more secrets than it should.", cause: "The pipeline identity was granted broad vault access.", fix: "Tighten the access policy to only the required secret, redeploy, and verify the job still succeeds while a read of an out-of-scope secret now fails." },
      { symptom: "Pipeline authenticates locally but fails in CI with 'secret not found'.", cause: "The secret exists in a developer's shell but was never added to the store/OIDC trust the runner uses.", fix: "Add the secret (or federated identity) to the environment CI targets, re-run, and confirm the job resolves it without any local fallback." },
      { symptom: "Jobs start failing right after a scheduled rotation.", cause: "The old credential was revoked before all consumers picked up the new one.", fix: "Re-issue with an overlap window, update every consumer, verify a full run succeeds, then revoke the old value last." },
      { symptom: "A secret value appears in plaintext in the run log.", cause: "The value was fetched dynamically and never registered as masked.", fix: "Mask it with <code>::add-mask::</code> at the point it's fetched, re-run to confirm it prints as <code>***</code>, and rotate it since it already leaked." }
    ],

    interview: [
      { q: "Why is <b>OIDC</b> considered stronger than storing a long-lived cloud key in GitHub Secrets?", a: "OIDC stores <b>no durable credential</b>: the workflow presents a signed token, the cloud's IAM trusts that issuer for a specific repo/branch and returns a credential that expires in minutes. There is nothing persistent to leak, and access is automatically scoped and time-bounded, so even a leaked log can't be replayed later." },
      { q: "A payments key was accidentally committed and pushed. Walk through your response.", a: "Treat the key as <b>compromised</b>: issue a new one in the vault, update the store, revoke the old one, and inject the new value at runtime. Only then scrub history and enable <b>secret scanning with push protection</b> so it can't recur. Deleting the commit alone is not a fix because the value is already in history and any clone." },
      { q: "What's the trade-off between per-environment secrets and a single shared secret?", a: "Per-environment secrets add management overhead but <b>contain blast radius</b> — a dev leak can't touch production money. A single shared key is simpler but turns any one leak into a full compromise. For anything revenue-critical the isolation is worth the overhead." },
      { q: "When should a value <i>not</i> go into the secret store?", a: "Non-sensitive config — hostnames, region names, feature flags — belongs in checked-in config, not the vault. Over-vaulting harmless values adds friction and <b>hides what's actually secret</b>, weakening the signal of what truly needs protection." }
    ],

    related: ["security", "environment-promotion", "github-actions", "docker"]
  }));
})();
