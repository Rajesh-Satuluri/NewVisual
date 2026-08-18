/* ============================================================
   cicd-concepts.js — concept metadata, glossary source, and the
   tool-comparison matrix rows (prompt §23). Populated in later
   content iterations; this scaffold exposes the tool registry and
   ROI ordering used by the home page and master map.
   ============================================================ */
(function () {
  "use strict";
  var NS = (window.DECICDViz = window.DECICDViz || {});

  // ROI-ordered tool registry (prompt §3/§23). roi: relative ROI for
  // a modern Data Engineer. Color tokens live in css/main.css.
  NS.Concepts = {
    tools: [
      { id: "git", name: "Git", purpose: "Version control", roi: "Very High", token: "--tool-git" },
      { id: "github", name: "GitHub", purpose: "Collaboration / source control", roi: "Very High", token: "--tool-github" },
      { id: "github-actions", name: "GitHub Actions", purpose: "CI/CD", roi: "Very High", token: "--tool-ci" },
      { id: "terraform", name: "Terraform", purpose: "Infrastructure as Code", roi: "Very High", token: "--tool-terraform" },
      { id: "docker", name: "Docker", purpose: "Packaging", roi: "Very High", token: "--tool-docker" },
      { id: "databricks-bundles", name: "Databricks Asset Bundles", purpose: "Databricks deployment", roi: "Very High", token: "--tool-databricks" },
      { id: "dbt-cicd", name: "dbt", purpose: "Transformation / CI", roi: "Very High", token: "--tool-dbt" },
      { id: "pytest", name: "pytest", purpose: "Python testing", roi: "High", token: "--tool-testing" },
      { id: "sql-testing", name: "SQL testing", purpose: "Data correctness", roi: "High", token: "--tool-sql" },
      { id: "airflow-cicd", name: "Airflow CI/CD", purpose: "Orchestration deployment", roi: "High", token: "--tool-airflow" },
      { id: "kubernetes", name: "Kubernetes", purpose: "Container orchestration", roi: "Medium", token: "--tool-kubernetes" },
      { id: "helm", name: "Helm", purpose: "Kubernetes packaging", roi: "Medium", token: "--tool-helm" },
      { id: "container-registry", name: "Container Registry", purpose: "Image management", roi: "Medium", token: "--tool-registry" },
      { id: "secrets", name: "Secrets management", purpose: "Security", roi: "High", token: "--tool-secrets" },
      { id: "data-quality", name: "Great Expectations / Soda", purpose: "Data quality", roi: "Medium", token: "--tool-dataquality" },
      { id: "sonarqube", name: "SonarQube", purpose: "Code quality", roi: "Medium", token: "--tool-sonarqube" },
      { id: "azure-devops", name: "Azure DevOps", purpose: "Enterprise CI/CD", roi: "Medium", token: "--tool-azuredevops" },
      { id: "argo-cd", name: "Argo CD", purpose: "GitOps", roi: "Medium", token: "--tool-argocd" },
      { id: "jenkins", name: "Jenkins", purpose: "Legacy / enterprise CI/CD", roi: "Lower", token: "--tool-jenkins" }
    ]
  };
})();
