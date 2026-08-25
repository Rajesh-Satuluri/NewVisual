/*
 * tools/extract.js — dev-only. Loads every data/*.js file against a stub
 * registry and dumps all problems as JSON on stdout, so the Python validator
 * can check schema completeness and parse the T-SQL. Not used by the app.
 *
 *   node tools/extract.js > /tmp/problems.json
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dataDir = path.join(__dirname, "..", "data");
const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".js")).sort();

const problems = [];
const sandbox = {
  window: {
    SQLLAB: {
      register: function (category, list) {
        list.forEach(p => { p._file = null; problems.push(p); });
      }
    }
  }
};
vm.createContext(sandbox);

for (const f of files) {
  const code = fs.readFileSync(path.join(dataDir, f), "utf8");
  const start = problems.length;
  vm.runInContext(code, sandbox, { filename: f });
  for (let i = start; i < problems.length; i++) problems[i]._file = f;
}

process.stdout.write(JSON.stringify(problems, null, 2));
