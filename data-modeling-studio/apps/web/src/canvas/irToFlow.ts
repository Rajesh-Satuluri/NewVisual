import type { Edge } from '@xyflow/react';
import type { SchemaIR } from '@dms/modeling-core';
import type { EntityFlowNode } from './EntityNode';
import type { XY } from '../store';

export function toNodes(ir: SchemaIR, positions: Record<string, XY>): EntityFlowNode[] {
  return ir.entities.map((e, i) => ({
    id: e.id,
    type: 'entity',
    position: positions[e.id] ?? { x: 80 + i * 60, y: 80 + i * 40 },
    data: { entity: e },
  }));
}

export function toEdges(ir: SchemaIR): Edge[] {
  return ir.relationships
    .filter((r) => ir.entities.some((e) => e.id === r.from) && ir.entities.some((e) => e.id === r.to))
    .map((r) => ({
      id: r.id,
      source: r.from,
      target: r.to,
      label: r.cardinality,
      animated: r.cardinality === 'N:M',
      className: r.cardinality === 'N:M' ? 'edge-mn' : 'edge-rel',
    }));
}
