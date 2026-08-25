#!/usr/bin/env python3
"""
tools/validate.py — dev-only validation gate for the SQL Study Lab.

Runs the FALLBACK validation from the build plan (§6):
  * structural completeness of every problem (required non-empty fields),
  * sampleData column count matches its schema table,
  * expectedOutput present with rectangular rows,
  * unique ids, no placeholders,
  * every T-SQL block (setupSql + each approach's tsql/clean) parses under
    sqlglot's T-SQL dialect (syntax check, not execution).

Usage:
    node tools/extract.js > /tmp/problems.json
    python3 tools/validate.py /tmp/problems.json

Engine execution against a real SQL Server 2022 is the PREFERRED path in the
plan; when a container cannot be pulled/run in the build env this parser gate
is the documented fallback. Exit code is non-zero if any check fails.
"""
import json
import sys
import re

try:
    import sqlglot
except ImportError:
    print("ERROR: sqlglot not installed (pip install sqlglot)", file=sys.stderr)
    sys.exit(2)

REQUIRED = ["id", "number", "platform", "title", "difficulty", "category",
            "descriptionBrief", "schema", "setupSql", "sampleData",
            "expectedOutput", "approaches"]
PLACEHOLDER = re.compile(r"(TODO|FIXME|PLACEHOLDER|lorem ipsum|\bTBD\b|…short|xxx+)", re.I)

def parse_ok(sql, label, errors):
    """Parse possibly multi-statement T-SQL; record any syntax error."""
    if not sql or not str(sql).strip():
        errors.append(f"{label}: empty SQL")
        return
    try:
        stmts = sqlglot.parse(sql, read="tsql")
        if not stmts or all(s is None for s in stmts):
            errors.append(f"{label}: parsed to nothing")
    except Exception as e:
        first = str(e).splitlines()[0]
        errors.append(f"{label}: parse error: {first}")

def validate(problems):
    errors = []
    ids = {}
    for p in problems:
        pid = p.get("id", "<no-id>")
        loc = f"[{p.get('_file','?')}] {pid}"

        for field in REQUIRED:
            v = p.get(field)
            if v is None or v == "" or v == [] or v == {}:
                errors.append(f"{loc}: missing/empty required field '{field}'")

        if pid in ids:
            errors.append(f"{loc}: duplicate id (also in {ids[pid]})")
        ids[pid] = p.get("_file", "?")

        if p.get("difficulty") not in ("Easy", "Medium", "Hard"):
            errors.append(f"{loc}: difficulty must be Easy/Medium/Hard, got {p.get('difficulty')!r}")

        # placeholder scan across text fields
        blob = json.dumps(p, ensure_ascii=False)
        m = PLACEHOLDER.search(blob)
        if m:
            errors.append(f"{loc}: placeholder-looking text {m.group(0)!r}")

        # schema table name -> column count
        schema_cols = {}
        for t in p.get("schema", []) or []:
            if not t.get("name") or not t.get("columns"):
                errors.append(f"{loc}: schema table missing name/columns")
                continue
            schema_cols[t["name"]] = [c.get("name") for c in t["columns"]]

        # sampleData rectangular + matches schema column count when named the same
        for sd in p.get("sampleData", []) or []:
            cols = sd.get("columns", [])
            for r in sd.get("rows", []):
                if len(r) != len(cols):
                    errors.append(f"{loc}: sampleData '{sd.get('table')}' row width "
                                  f"{len(r)} != {len(cols)} columns")
                    break
            tname = sd.get("table")
            if tname in schema_cols and len(cols) != len(schema_cols[tname]):
                errors.append(f"{loc}: sampleData '{tname}' has {len(cols)} cols but "
                              f"schema defines {len(schema_cols[tname])}")

        # expectedOutput rectangular
        eo = p.get("expectedOutput") or {}
        ecols = eo.get("columns", [])
        if not ecols:
            errors.append(f"{loc}: expectedOutput has no columns")
        for r in eo.get("rows", []):
            if len(r) != len(ecols):
                errors.append(f"{loc}: expectedOutput row width {len(r)} != {len(ecols)}")
                break

        # T-SQL parse: setup + each approach
        parse_ok(p.get("setupSql"), f"{loc} setupSql", errors)
        appr = p.get("approaches", []) or []
        if not appr:
            errors.append(f"{loc}: no approaches")
        for i, a in enumerate(appr):
            name = a.get("name", f"#{i}")
            parse_ok(a.get("tsql"), f"{loc} approach '{name}'.tsql", errors)
            parse_ok(a.get("clean"), f"{loc} approach '{name}'.clean", errors)
            if not (a.get("logic") or "").strip():
                errors.append(f"{loc} approach '{name}': empty logic")

    return errors

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/problems.json"
    with open(path) as fh:
        problems = json.load(fh)

    errors = validate(problems)
    n = len(problems)
    topics = {}
    for p in problems:
        topics[p.get("category")] = topics.get(p.get("category"), 0) + 1

    print(f"Validated {n} problems across {len(topics)} topic(s):")
    for t, c in sorted(topics.items()):
        print(f"  - {t}: {c}")
    print()
    if errors:
        print(f"FAIL — {len(errors)} issue(s):")
        for e in errors:
            print("  ✗ " + e)
        sys.exit(1)
    print("PASS — all structural checks clean; every T-SQL block parses under sqlglot (tsql).")
    print("NOTE: parser-validated, NOT engine-executed (SQL Server container unavailable in build env).")

if __name__ == "__main__":
    main()
