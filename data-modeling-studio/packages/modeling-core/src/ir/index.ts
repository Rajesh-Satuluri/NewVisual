/* ============================================================
   IR helpers — small pure utilities for building and querying a
   SchemaIR. Kept dependency-free so both the canvas and the Node
   test suite can use them.
   ============================================================ */

import {
  IR_SCHEMA_VERSION,
  type Column,
  type Entity,
  type KeyKind,
  type Relationship,
  type SchemaIR,
} from './types.js';

export * from './types.js';

/** An empty, valid IR. */
export function emptySchema(name?: string): SchemaIR {
  return {
    version: IR_SCHEMA_VERSION,
    entities: [],
    relationships: [],
    ...(name !== undefined ? { name } : {}),
  };
}

/** Case-insensitive, trimmed name comparison used throughout matching. */
export function nameEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Find an entity by id, or by name (case-insensitive) as a fallback. */
export function findEntity(ir: SchemaIR, idOrName: string): Entity | undefined {
  return (
    ir.entities.find((e) => e.id === idOrName) ??
    ir.entities.find((e) => nameEq(e.name, idOrName))
  );
}

export function findColumn(entity: Entity, name: string): Column | undefined {
  return entity.columns.find((c) => nameEq(c.name, name));
}

export function columnHasKey(col: Column, kind: KeyKind): boolean {
  return (col.keys ?? []).includes(kind);
}

/** All columns that make up the primary key of an entity. */
export function primaryKeyColumns(entity: Entity): Column[] {
  return entity.columns.filter(
    (c) => columnHasKey(c, 'PK') || columnHasKey(c, 'composite') || columnHasKey(c, 'surrogate'),
  );
}

/** True when the entity's PK is made of more than one column. */
export function hasCompositeKey(entity: Entity): boolean {
  return primaryKeyColumns(entity).length > 1;
}

/** Names of "prime" attributes (part of any candidate/primary key). */
export function primeAttributes(entity: Entity): Set<string> {
  return new Set(primaryKeyColumns(entity).map((c) => c.name.toLowerCase()));
}

/** All foreign-key columns of an entity. */
export function foreignKeyColumns(entity: Entity): Column[] {
  return entity.columns.filter((c) => columnHasKey(c, 'FK') || c.fkTo !== undefined);
}

let _seq = 0;
/** Deterministic-ish id generator for programmatic IR construction. */
export function makeId(prefix = 'n'): string {
  _seq += 1;
  return `${prefix}_${_seq.toString(36)}`;
}

/** Convenience builder for tests and fixtures. */
export function entity(
  name: string,
  columns: Column[],
  extra: Partial<Omit<Entity, 'id' | 'name' | 'columns'>> = {},
): Entity {
  return { id: makeId('e'), name, columns, ...extra };
}

export function relationship(
  from: string,
  to: string,
  cardinality: Relationship['cardinality'],
  extra: Partial<Omit<Relationship, 'id' | 'from' | 'to' | 'cardinality'>> = {},
): Relationship {
  return { id: makeId('r'), from, to, cardinality, ...extra };
}
