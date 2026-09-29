/* ============================================================
   JSON serializer — canonical persistence for a SchemaIR. Includes a
   light, dependency-free validation/migration on load so a bad or
   older file fails loudly instead of corrupting the canvas.
   ============================================================ */

import { IR_SCHEMA_VERSION, emptySchema, type SchemaIR } from '../ir/index.js';

export function toJSON(ir: SchemaIR, pretty = true): string {
  return JSON.stringify(ir, null, pretty ? 2 : 0);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Parse + shape-check an IR from JSON. Throws on structurally invalid input. */
export function fromJSON(text: string): SchemaIR {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON: could not parse schema file.');
  }
  return fromObject(raw);
}

export function fromObject(raw: unknown): SchemaIR {
  if (!isRecord(raw)) throw new Error('Invalid schema: expected an object.');
  if (!Array.isArray(raw.entities)) throw new Error('Invalid schema: "entities" must be an array.');
  if (raw.relationships !== undefined && !Array.isArray(raw.relationships)) {
    throw new Error('Invalid schema: "relationships" must be an array.');
  }

  const version = typeof raw.version === 'number' ? raw.version : IR_SCHEMA_VERSION;
  if (version > IR_SCHEMA_VERSION) {
    throw new Error(
      `Schema version ${version} is newer than supported (${IR_SCHEMA_VERSION}). Update the app.`,
    );
  }

  const base = emptySchema(typeof raw.name === 'string' ? raw.name : undefined);
  return {
    ...base,
    version: IR_SCHEMA_VERSION,
    entities: raw.entities as SchemaIR['entities'],
    relationships: (raw.relationships ?? []) as SchemaIR['relationships'],
  };
}
