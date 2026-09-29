# @dms/modeling-core

The framework-agnostic brain of Data Modeling Studio. Pure TypeScript, zero runtime
dependencies, no DOM — safe to import from the canvas, a Web Worker, or Node tests.

## Exports

```ts
import {
  // IR
  emptySchema, entity, relationship, findEntity, primaryKeyColumns,
  type SchemaIR, type Entity, type Column, type Relationship,

  // Validators
  validateAll, validateStructural, validateNormalization, validateDimensional,
  classifyNormalForm, normalFormAtLeast, type Finding,

  // Serializers
  toDDL, toDBML, toMermaid, toJSON, fromJSON,

  // Grader
  grade, type Scenario, type RubricRule, type GradeResult,
} from '@dms/modeling-core';
```

## Example

```ts
const ir = emptySchema('demo');
ir.entities = [
  entity('users', [{ name: 'id', type: 'int', keys: ['PK'] }]),
];

validateAll(ir);          // -> Finding[]  (structural + normalization + dimensional)
toDDL(ir, 'postgres');    // -> CREATE TABLE "users" ( ... )
grade(ir, someScenario);  // -> { percent, passed, failed, results }
```

## Design notes

- **Everything is data.** `SchemaIR` and `Scenario` are plain JSON — persist, diff, and
  ship them without touching code.
- **FD-driven normalization.** Normal form is inferred from the *learner's declared
  functional dependencies*, mirroring how normalization is taught and argued — the
  validator names the specific dependency that breaks 2NF/3NF/BCNF.
- **One grader, many surfaces.** Auto-graded challenges and the scripted mock interviewer
  share `grade()`, so feedback is always consistent.

## Scripts

```bash
pnpm test        # vitest (30 tests)
pnpm typecheck   # tsc --noEmit (strict)
pnpm build       # emits dist/ with .d.ts
```
