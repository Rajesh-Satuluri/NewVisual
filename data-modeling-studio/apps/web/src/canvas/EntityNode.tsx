import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { Entity, Column } from '@dms/modeling-core';

export type EntityNodeData = { entity: Entity };
export type EntityFlowNode = Node<EntityNodeData, 'entity'>;

const NUMERIC = /^(int|integer|bigint|smallint|numeric|decimal|number|float|double|real|money)/i;

function isMeasure(e: Entity, c: Column): boolean {
  const isKey = (c.keys ?? []).some((k) => k === 'PK' || k === 'FK' || k === 'composite' || k === 'surrogate');
  return e.role === 'fact' && NUMERIC.test(c.type) && !isKey && !c.fkTo;
}

function keyTag(e: Entity, c: Column) {
  if (isMeasure(e, c)) return <span className="kt ms">M</span>;
  const k = c.keys ?? [];
  if (k.includes('surrogate')) return <span className="kt sk">SK</span>;
  if (k.includes('PK') || k.includes('composite')) return <span className="kt pk">PK</span>;
  if (k.includes('FK') || c.fkTo) return <span className="kt fk">FK</span>;
  return <span className="kt blank">·</span>;
}

function roleBadge(e: Entity) {
  if (e.role === 'fact') return <span className="badge b-fact">fact</span>;
  if (e.role === 'dimension') return <span className="badge b-dim">dim · SCD{e.scd ?? '?'}</span>;
  if (e.role === 'bridge') return <span className="badge b-bridge">bridge</span>;
  return null;
}

export function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const e = data.entity;
  return (
    <div className={`ent-node${selected ? ' sel' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="ent-h">
        <span className="nm">{e.name}</span>
        {roleBadge(e)}
      </div>
      {e.role === 'fact' && e.grain && <div className="ent-grain">grain: {e.grain}</div>}
      <ul className="cols">
        {e.columns.map((c) => (
          <li className="col" key={c.name}>
            {keyTag(e, c)}
            <span className="cn">{c.name}</span>
            <span className="ct">{c.type}</span>
          </li>
        ))}
      </ul>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
