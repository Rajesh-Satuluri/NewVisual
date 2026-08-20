# Supply & Demand Planning — Interview Q&A

A static, self-contained lab in the NewVisual site: a master interview
question bank for supply & demand planning, spanning **874 questions across
45 topic groups** — supply chain fundamentals, demand planning, forecasting,
accuracy metrics, S&OP/IBP, MRP/MPS/DRP, inventory, safety stock,
replenishment, procurement, capacity, netting, o9 Solutions, forecast/supply
data models, SSIS integration, SQL/data engineering, analytics, ML/AI
forecasting, and senior architecture/consulting questions.

Each question has:
- **Interview answer** — a plain-English, 2-3 sentence answer.
- **Business case example** — one concrete real-world scenario.

## Stack
Pure HTML + CSS + vanilla JS — no framework, no backend. All content lives in
`data/questions.js` (`window.QA_GROUPS`); `js/app.js` renders the sidebar and
collapsible cards. Runs directly from GitHub Pages.

## Local development
```bash
cd supply-demand-qa
python3 -m http.server 8080
# open http://localhost:8080
```
