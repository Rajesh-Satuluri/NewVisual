#!/usr/bin/env node
// Validate every Coding Studio exercise SOLUTION against a real DuckDB engine
// (python duckdb — same SQL dialect as DuckDB-WASM in the browser). Loads the
// shared seed, runs each solution, reports row count, and fails on any error.
//   node tools/validate-sql.mjs      (from dbt/)
import { spawnSync } from 'node:child_process';
import { EXERCISES } from '../data/sql-exercises.js';
import { SEED_SQL } from '../data/studio-seed.js';

let fail = 0;
const PY = (sql) => {
  const code = `
import duckdb, sys, json
con = duckdb.connect()
con.execute(SEED)
cur = con.execute(SOL)
rows = cur.fetchall()
cols = [d[0] for d in cur.description]
print(json.dumps({"n": len(rows), "cols": cols}))
`;
  const r = spawnSync('python3', ['-c',
    `SEED=${JSON.stringify(sql.seed)}\nSOL=${JSON.stringify(sql.sol)}\n${code}`],
    { encoding: 'utf8' });
  return r.status === 0
    ? { ok: true, ...JSON.parse(r.stdout.trim()) }
    : { ok: false, err: (r.stderr || r.stdout).trim().split('\n').slice(-2).join(' ') };
};

console.log('validate-sql — solutions vs real DuckDB');
console.log('─'.repeat(60));
for (const ex of EXERCISES) {
  const res = PY({ seed: SEED_SQL, sol: ex.solution });
  if (!res.ok) { fail++; console.log(`  FAIL ${ex.id}  ${res.err}`); }
  else console.log(`  ok   ${ex.id}  ${String(res.n).padStart(3)} rows  [${res.cols.join(', ')}]`);
}
console.log('─'.repeat(60));
console.log(`${EXERCISES.length} exercises, ${fail} failing`);
process.exit(fail ? 1 : 0);
