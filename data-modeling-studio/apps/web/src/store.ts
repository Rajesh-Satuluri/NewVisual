/* ============================================================
   App store. The canvas and inspector mutate ONE SchemaIR here;
   every panel derives from it. Undo/redo (zundo) tracks the IR only.
   ============================================================ */

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { SchemaIR, Entity, Column, EntityRole, ScdType, Scenario } from '@dms/modeling-core';
import { loadSample, type SampleId } from './data/samples';

export type XY = { x: number; y: number };
export type CodeFmt = 'ddl' | 'dbml' | 'mermaid';
export type Dialect = 'postgres' | 'mysql' | 'snowflake';

interface Tracked {
  ir: SchemaIR;
}

interface AppState extends Tracked {
  positions: Record<string, XY>;
  selectedId: string | null;
  sample: SampleId;
  scenario: Scenario | undefined;
  dialect: Dialect;
  fmt: CodeFmt;

  loadSample: (id: SampleId) => void;
  setPosition: (id: string, xy: XY) => void;
  select: (id: string | null) => void;
  setDialect: (d: Dialect) => void;
  setFmt: (f: CodeFmt) => void;

  // IR edits (tracked by undo/redo)
  renameEntity: (id: string, name: string) => void;
  setRole: (id: string, role: EntityRole | undefined) => void;
  setGrain: (id: string, grain: string) => void;
  setScd: (id: string, scd: ScdType | undefined) => void;
  addColumn: (id: string, col: Column) => void;
  deleteColumn: (id: string, colName: string) => void;
  addEntity: () => void;
  deleteEntity: (id: string) => void;
}

let idc = 0;
const nextId = (p: string) => `${p}${(idc++).toString(36)}_${Date.now().toString(36).slice(-3)}`;

function patchEntity(ir: SchemaIR, id: string, fn: (e: Entity) => void): SchemaIR {
  return {
    ...ir,
    entities: ir.entities.map((e) => {
      if (e.id !== id) return e;
      const clone = structuredClone(e);
      fn(clone);
      return clone;
    }),
  };
}

const initial = loadSample('star');

export const useStore = create<AppState>()(
  temporal(
    (set) => ({
      ir: initial.ir,
      positions: initial.layout,
      selectedId: null,
      sample: 'star',
      scenario: initial.scenario,
      dialect: 'postgres',
      fmt: 'ddl',

      loadSample: (id) => {
        const s = loadSample(id);
        set({ ir: s.ir, positions: s.layout, scenario: s.scenario, sample: id, selectedId: null });
      },
      setPosition: (id, xy) =>
        set((st) => ({ positions: { ...st.positions, [id]: xy } })),
      select: (id) => set({ selectedId: id }),
      setDialect: (dialect) => set({ dialect }),
      setFmt: (fmt) => set({ fmt }),

      renameEntity: (id, name) => set((st) => ({ ir: patchEntity(st.ir, id, (e) => { e.name = name; }) })),
      setRole: (id, role) =>
        set((st) => ({
          ir: patchEntity(st.ir, id, (e) => {
            if (role === undefined) { delete e.role; delete e.grain; delete e.scd; }
            else e.role = role;
          }),
        })),
      setGrain: (id, grain) =>
        set((st) => ({
          ir: patchEntity(st.ir, id, (e) => {
            if (grain.trim() === '') delete e.grain;
            else e.grain = grain;
          }),
        })),
      setScd: (id, scd) =>
        set((st) => ({
          ir: patchEntity(st.ir, id, (e) => {
            if (scd === undefined) delete e.scd;
            else e.scd = scd;
          }),
        })),
      addColumn: (id, col) =>
        set((st) => ({ ir: patchEntity(st.ir, id, (e) => { e.columns.push(col); }) })),
      deleteColumn: (id, colName) =>
        set((st) => ({ ir: patchEntity(st.ir, id, (e) => { e.columns = e.columns.filter((c) => c.name !== colName); }) })),

      addEntity: () =>
        set((st) => {
          const id = nextId('e');
          const entity: Entity = {
            id,
            name: `table_${st.ir.entities.length + 1}`,
            columns: [{ name: 'id', type: 'int', keys: ['PK'], nullable: false }],
          };
          return {
            ir: { ...st.ir, entities: [...st.ir.entities, entity] },
            positions: { ...st.positions, [id]: { x: 120 + st.ir.entities.length * 40, y: 120 } },
            selectedId: id,
          };
        }),
      deleteEntity: (id) =>
        set((st) => {
          const positions = { ...st.positions };
          delete positions[id];
          return {
            ir: {
              ...st.ir,
              entities: st.ir.entities.filter((e) => e.id !== id),
              relationships: st.ir.relationships.filter((r) => r.from !== id && r.to !== id),
            },
            positions,
            selectedId: st.selectedId === id ? null : st.selectedId,
          };
        }),
    }),
    {
      // Only schema changes are undoable; camera/selection/panel state is not.
      partialize: (state): Tracked => ({ ir: state.ir }),
      limit: 100,
    },
  ),
);

export const useTemporalStore = useStore.temporal;
