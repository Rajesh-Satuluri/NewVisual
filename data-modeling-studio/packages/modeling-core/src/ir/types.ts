/* ============================================================
   Schema IR — the canonical in-memory representation of a data
   model. Every surface of the app (canvas, validators, serializers,
   grader) reads and writes THIS shape and nothing else.

   Design rules:
   - Fully JSON-serializable (no functions, no class instances).
   - Stable string ids so the canvas can reference nodes/edges.
   - Additive dimensional/normalization annotations are optional so
     an early-stage OLTP sketch and a finished star schema both fit.
   ============================================================ */

/** Bump when the on-disk shape changes in a breaking way. */
export const IR_SCHEMA_VERSION = 1 as const;

/** Role of a table within a dimensional (analytics) model. */
export type EntityRole = 'fact' | 'dimension' | 'bridge';

/** Slowly Changing Dimension strategy (Kimball types). */
export type ScdType = 0 | 1 | 2 | 3 | 4 | 6;

/** How a column participates in the key structure of its entity. */
export type KeyKind = 'PK' | 'FK' | 'composite' | 'surrogate';

/** Relationship cardinality between two entities. */
export type Cardinality = '1:1' | '1:N' | 'N:M';

/** Whether participation in a relationship is required. */
export type Modality = 'optional' | 'mandatory';

/** A reference from an FK column to the column it points at. */
export interface ForeignKeyTarget {
  entity: string; // Entity.id
  column: string; // Column.name on the target entity
}

export interface Column {
  name: string;
  /** Free-form SQL-ish type, e.g. 'int', 'varchar(255)', 'timestamp', 'array'. */
  type: string;
  /**
   * Key roles this column plays. A column can be both part of the PK and an
   * FK (common in junction tables), hence an array.
   */
  keys?: KeyKind[];
  nullable?: boolean;
  /** Present when this column is a foreign key. */
  fkTo?: ForeignKeyTarget;
  /** True for a column that stores a repeating group / multivalued data (1NF smell). */
  multivalued?: boolean;
  note?: string;
}

/**
 * A functional dependency declared by the learner: `determinant -> dependent`.
 * Used by the normalization validator to reason about 2NF/3NF/BCNF. Values are
 * column names on the owning entity.
 */
export interface FunctionalDependency {
  determinant: string[];
  dependent: string[];
}

export interface Entity {
  id: string;
  name: string;
  columns: Column[];
  /** Dimensional role, if this is part of an analytics model. */
  role?: EntityRole;
  /** For fact tables: the declared grain, e.g. 'one row per order line'. */
  grain?: string;
  /** For dimensions: the history-tracking strategy. */
  scd?: ScdType;
  /** Declared functional dependencies, powering normalization analysis. */
  dependencies?: FunctionalDependency[];
  note?: string;
}

export interface Relationship {
  id: string;
  /** Entity.id on the "from" side. */
  from: string;
  /** Entity.id on the "to" side. */
  to: string;
  cardinality: Cardinality;
  modality?: Modality;
  note?: string;
}

export interface SchemaIR {
  version: typeof IR_SCHEMA_VERSION;
  entities: Entity[];
  relationships: Relationship[];
  /** Optional human title for the model. */
  name?: string;
}
