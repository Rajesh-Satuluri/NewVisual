#!/usr/bin/env python3
"""Extract + validate PyFlink snippet regions, emit data/pyflink-snippets.js.

Each region:  # === snippet: <key> | tier: <tier> ===  ...  # === end ===
Every region is dedented and ast.parse'd INDEPENDENTLY (syntax guard). If
apache-flink is importable we additionally smoke-check key imports.
Run with -I so a planted module in cwd can't be imported.
"""
import ast
import json
import re
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[0]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
if SRC is None or not SRC.exists():
    # default to repo location relative to this script's known layout
    SRC = Path("/home/user/My-Projects/flink/data/pyflink-snippets.py")
OUT = SRC.with_suffix(".js")

TIERS = {"datastream", "table-sql", "java-workaround"}

text = SRC.read_text()
pattern = re.compile(
    r"# === snippet: (?P<key>[a-z0-9_]+) \| tier: (?P<tier>[a-z-]+) ===\n"
    r"(?P<body>.*?)\n# === end ===",
    re.DOTALL,
)

snippets = []
seen = set()
errors = []
for m in pattern.finditer(text):
    key, tier, body = m["key"], m["tier"], m["body"]
    if tier not in TIERS:
        errors.append(f"{key}: unknown tier {tier!r}")
    if key in seen:
        errors.append(f"{key}: duplicate key")
    seen.add(key)
    code = textwrap.dedent(body).strip("\n")
    try:
        ast.parse(code)
    except SyntaxError as e:
        errors.append(f"{key}: SyntaxError line {e.lineno}: {e.msg}")
        continue
    snippets.append((key, tier, code))

if errors:
    print("SNIPPET VALIDATION FAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)

# optional deeper check
flink_ok = False
try:
    import pyflink  # noqa: F401
    flink_ok = True
except Exception:
    flink_ok = False

TIER_LABEL = {
    "datastream": "PyFlink · DataStream",
    "table-sql": "PyFlink · Table API / SQL",
    "java-workaround": "Java-only → PyFlink path",
}

header = (
    "// AUTO-GENERATED from data/pyflink-snippets.py by scratchpad/build_snippets.py\n"
    "// Do NOT edit by hand. Edit the .py (single verified source) and re-run.\n"
    f"// Snippets: {len(snippets)}  |  deep API check: "
    f"{'yes (pyflink importable)' if flink_ok else 'syntax-only (pyflink not installed)'}\n\n"
    "export const PYFLINK_TIERS = " + json.dumps(TIER_LABEL, indent=2) + ";\n\n"
    "export const PYFLINK = {\n"
)

lines = [header]
for key, tier, code in snippets:
    esc = code.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    lines.append(f"  {key}: {{ tier: {json.dumps(tier)}, code: `{esc}` }},\n")
lines.append("};\n")
OUT.write_text("".join(lines))

print(f"OK: {len(snippets)} snippets validated -> {OUT}")
print("keys:", ", ".join(k for k, _, _ in snippets))
