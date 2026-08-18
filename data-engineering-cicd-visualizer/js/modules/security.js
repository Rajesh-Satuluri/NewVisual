/* modules/security.js — Tier 3 · CI/CD Security (built on the concept-module factory) */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  NS.registerModule(NS.Concept.build({
    id: "security",
    title: "CI/CD Security",
    tool: "--tool-secrets",
    icon: "🛡️",
    eyebrow: "Tier 3 · Production Engineering",
    subtitle: "The pipeline that ships RetailFlow's revenue code is itself a target — it holds cloud access and touches every environment. Securing it means short-lived OIDC tokens, least-privilege IAM, scanning, branch protection, and signed artifacts.",
    mentalImage: "THE PIPELINE IS A PRIVILEGED PATH",

    flowTitle: "Trust flowing from developer to cloud",
    flow: ["Developer", "GitHub", "CI runner", "Cloud"],

    why: "A CI/CD pipeline is a <b>high-value target</b>: it can read the repo, holds credentials, and can deploy to production. Compromise the pipeline and you compromise everything it can reach — so its own security matters as much as the app's.",
    what: "CI/CD security is the set of controls that <b>harden the supply chain from commit to deploy</b>: how the pipeline authenticates, what it's allowed to do, what it's allowed to ship, and who can change it.",
    how: "Replace long-lived stored secrets with short-lived <b>OIDC</b> tokens, scope every identity with <b>least-privilege IAM/RBAC</b>, scan dependencies and containers, protect <code>main</code> with required reviews, <b>sign</b> the artifacts you build, and keep <b>audit logs</b> of every deploy.",

    levels: {
      beginner: [
        { h: "The one-line idea", body: "The pipeline is a door into your cloud. CI/CD security is about making that door open only for the right people, only as wide as needed, only for a short time — and keeping a record of everyone who walks through it." },
        { h: "The four stops on the path", body: "A change travels <b>Developer → GitHub → CI runner → Cloud</b>. Each hop needs a control: reviewed commits at GitHub, a trusted runner in CI, and short-lived scoped credentials when the runner talks to the Cloud." },
        { h: "RetailFlow example", body: "RetailFlow's CI needs to deploy the revenue pipeline to Azure. Instead of storing a long-lived password, the workflow proves its identity with <b>OIDC</b> and receives a token that <b>expires in minutes</b> — there is no durable credential to steal." }
      ],
      intermediate: [
        { h: "Authentication: OIDC over stored secrets", body: "The strongest pattern stores <b>no long-lived cloud password</b>. GitHub Actions presents a signed <b>OIDC</b> token; the cloud's IAM trusts that issuer for a specific repo/branch and hands back a <b>short-lived</b> credential. Nothing durable to leak, and access expires automatically." },
        { h: "Authorization: least privilege", body: "Scope every identity to exactly what it needs. The workflow token uses <code>permissions:</code> to request only <code>id-token</code> and <code>contents: read</code>; the cloud role can write to the revenue pipeline's resources and <i>nothing else</i>. A compromised job can't reach the payments database." },
        { h: "Scanning the supply chain", body: "<ul><li><b>Dependency scanning</b> (Dependabot, <code>pip-audit</code>) — flag vulnerable libraries.</li><li><b>Container scanning</b> (Trivy, Grype) — flag CVEs in the image.</li><li><b>Secret scanning</b> + push protection — block a committed credential <i>before</i> it lands.</li></ul>" }
      ],
      proficient: [
        { h: "Protect the pipeline's inputs", body: "<b>Branch protection</b> on <code>main</code>: required reviews, required status checks, no force-push, and <b>CODEOWNERS</b> on the workflow files themselves — so nobody quietly edits the pipeline to exfiltrate secrets. The definition of the pipeline is as sensitive as the code it ships." },
        { h: "Sign and verify artifacts", body: "Build provenance and integrity: <b>sign</b> images (Cosign / Sigstore) and generate an <b>SBOM</b> + SLSA provenance, then have the deploy target <b>verify the signature</b> before running. Production only runs artifacts your pipeline actually built — not an image someone swapped in." },
        { h: "Audit and least standing access", body: "Every deploy and secret read is written to an <b>audit log</b>. Human access to production is <b>just-in-time</b>, not standing. Combined with OIDC (no stored secret), least-privilege IAM, and signed artifacts, this is <b>defense in depth</b> — no single failure hands over the cloud." }
      ]
    },

    micro: ["OIDC", "short-lived credentials", "least privilege", "IAM / RBAC", "workflow permissions",
      "dependency scanning", "container scanning", "secret scanning", "push protection", "branch protection",
      "CODEOWNERS", "signed artifacts (Cosign)", "SBOM / provenance", "audit log", "secret rotation"],

    before: ["long-lived cloud password in Secrets", "one token, full access", "unscanned dependencies", "anyone can edit the workflow", "no record of who deployed"],
    after: ["OIDC short-lived tokens", "least-privilege IAM role", "dependency + container scans", "protected main + CODEOWNERS", "signed artifacts + audit logs"],

    failure: {
      title: "Cloud key committed and leaked",
      steps: ["Long-lived AZURE key hard-coded in workflow", "git push", "key now in public Git history", "scraped by an attacker", "unauthorized deploy access", "rotate key + switch to OIDC + add scanning"],
      explain: "A long-lived credential in the repo is a permanent liability — once pushed, it lives in history and cannot be un-seen. The fix is threefold: <b>rotate</b> the leaked key immediately (deleting the commit is not enough), move to <b>OIDC short-lived tokens</b> so there is no durable secret to steal, and add <b>secret scanning with push protection</b> so the next attempt is blocked before it ever lands."
    },

    whenNot: "Security is layered, not maximal everywhere. Don't <b>vault non-sensitive config</b> (region names, feature flags) — that hides what's actually secret. Don't make every low-risk check <b>blocking</b> if it grinds delivery to a halt; gate on high-severity findings and warn on the rest. The goal is proportionate defense in depth, not friction for its own sake.",

    story: {
      situation: "RetailFlow's CI must deploy the revenue pipeline to Azure on every merge to <code>main</code>.",
      problem: "An early workflow stored a long-lived Azure credential as a GitHub secret — one leak, or one malicious edit to the workflow, and an attacker holds standing cloud access.",
      decision: "The team switches to <b>OIDC</b>: Azure trusts GitHub's token issuer for this repo, so CI exchanges a signed workflow token for a <b>short-lived</b> credential — and protects <code>main</code> + the workflow files with required review and CODEOWNERS.",
      tool: "GitHub OIDC → Azure federated identity + branch protection.",
      result: "There is no long-lived secret to steal, access expires in minutes and is scoped least-privilege, and nobody can alter the pipeline without review. Deploys are signed and audit-logged.",
      remember: "Don't store a cloud password in CI — let the pipeline prove who it is and get a token that expires."
    },

    code: [{
      title: "Authenticate CI to Azure with OIDC — no stored long-lived secret",
      lang: "yaml",
      code: "# .github/workflows/deploy.yml\n" +
            "on:\n" +
            "  push:\n" +
            "    branches: [main]\n" +
            "permissions:\n" +
            "  id-token: write        # request a short-lived OIDC token\n" +
            "  contents: read         # least privilege — read the repo, nothing more\n" +
            "jobs:\n" +
            "  deploy:\n" +
            "    runs-on: ubuntu-latest\n" +
            "    steps:\n" +
            "      - uses: actions/checkout@v4\n" +
            "      - name: Scan dependencies for CVEs\n" +
            "        run: pip-audit -r requirements.txt\n" +
            "      - name: Sign in to Azure via OIDC (no password stored)\n" +
            "        uses: azure/login@v2\n" +
            "        with:\n" +
            "          client-id: ${{ secrets.AZURE_CLIENT_ID }}     # public id, not a secret\n" +
            "          tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n" +
            "          subscription-id: ${{ secrets.AZURE_SUB_ID }}\n" +
            "      - name: Deploy revenue pipeline\n" +
            "        run: ./deploy_revenue_pipeline.sh   # runs with a token that expires in minutes",
      highlights: [6, 13, 16]
    }],

    remember: "The CI/CD pipeline is a privileged path into the cloud, so secure the path itself: OIDC short-lived tokens instead of stored passwords, least-privilege IAM/RBAC, dependency + container + secret scanning, branch protection on the pipeline's own files, signed artifacts, and audit logs — defense in depth so no single slip hands over production.",

    retention: {
      question: "RetailFlow's CI needs to deploy to Azure every merge. Why is storing a long-lived Azure key as a GitHub secret risky, and what's the stronger pattern?",
      answer: "A long-lived key is a durable credential that can be leaked (e.g. committed to history) or abused via a malicious workflow edit, granting <b>standing</b> cloud access. The stronger pattern is <b>OIDC</b>: Azure federates trust to GitHub's token issuer for that repo/branch, so CI exchanges a signed workflow token for a <b>short-lived, least-privilege</b> credential — nothing durable to steal, access expires in minutes — backed by branch protection, scanning, signed artifacts, and audit logs."
    }
  }));
})();
