# Validation harness (dev-only)

Not part of the deployed app — these files validate the `data/*.js` content.

```bash
node tools/extract.js > /tmp/problems.json     # dump all problems as JSON
python3 tools/validate.py /tmp/problems.json    # structural + T-SQL parse gate
```

`validate.py` checks, per problem:

- every required field present and non-empty (no placeholders),
- unique ids, valid difficulty (Easy/Medium/Hard),
- `sampleData` rows are rectangular and match the `schema` column count,
- `expectedOutput` present and rectangular,
- **every T-SQL block** (`setupSql` + each approach's `tsql`/`clean`) parses
  under `sqlglot` in the `tsql` dialect.

**Engine execution** against `mcr.microsoft.com/mssql/server:2022-latest` is the
plan's preferred path but requires a runnable Docker daemon, which is not
available in this build environment — so this is the documented **parser
fallback**: queries are syntax-validated, not executed. Sample/expected
consistency is authored and reviewed by hand.

Requires: Node 18+, Python 3, `pip install sqlglot`.
