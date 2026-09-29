import { useState } from 'react';
import type { Column, EntityRole, KeyKind, ScdType } from '@dms/modeling-core';
import { useStore } from '../store';

const ROLES: (EntityRole | 'none')[] = ['none', 'fact', 'dimension', 'bridge'];
const SCDS: ScdType[] = [0, 1, 2, 3, 4, 6];
const KEYS: (KeyKind | 'none')[] = ['none', 'PK', 'FK', 'surrogate', 'composite'];

export function Inspector() {
  const ir = useStore((s) => s.ir);
  const selectedId = useStore((s) => s.selectedId);
  const entity = ir.entities.find((e) => e.id === selectedId) ?? null;

  const renameEntity = useStore((s) => s.renameEntity);
  const setRole = useStore((s) => s.setRole);
  const setGrain = useStore((s) => s.setGrain);
  const setScd = useStore((s) => s.setScd);
  const addColumn = useStore((s) => s.addColumn);
  const deleteColumn = useStore((s) => s.deleteColumn);
  const deleteEntity = useStore((s) => s.deleteEntity);

  const [colName, setColName] = useState('');
  const [colType, setColType] = useState('varchar(255)');
  const [colKey, setColKey] = useState<KeyKind | 'none'>('none');

  if (!entity) {
    return (
      <section className="card">
        <div className="card-h"><h3>Inspector</h3></div>
        <div className="free">Select a table on the canvas to edit it.</div>
      </section>
    );
  }

  const onAddColumn = () => {
    const name = colName.trim();
    if (!name) return;
    const col: Column = { name, type: colType.trim() || 'text' };
    if (colKey !== 'none') col.keys = [colKey];
    addColumn(entity.id, col);
    setColName('');
    setColKey('none');
  };

  return (
    <section className="card">
      <div className="card-h between">
        <h3>Inspector</h3>
        <button className="danger" onClick={() => deleteEntity(entity.id)}>Delete table</button>
      </div>
      <div className="insp">
        <label className="field">Table name</label>
        <input className="txt" value={entity.name} onChange={(e) => renameEntity(entity.id, e.target.value)} />

        <label className="field">Role</label>
        <select
          className="txt"
          value={entity.role ?? 'none'}
          onChange={(e) => setRole(entity.id, e.target.value === 'none' ? undefined : (e.target.value as EntityRole))}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {entity.role === 'fact' && (
          <>
            <label className="field">Grain</label>
            <input
              className="txt"
              placeholder="one row per…"
              value={entity.grain ?? ''}
              onChange={(e) => setGrain(entity.id, e.target.value)}
            />
          </>
        )}

        {entity.role === 'dimension' && (
          <>
            <label className="field">SCD type</label>
            <select
              className="txt"
              value={entity.scd ?? 'none'}
              onChange={(e) => setScd(entity.id, e.target.value === 'none' ? undefined : (Number(e.target.value) as ScdType))}
            >
              <option value="none">— none —</option>
              {SCDS.map((s) => <option key={s} value={s}>Type {s}</option>)}
            </select>
          </>
        )}

        <label className="field">Columns</label>
        <ul className="insp-cols">
          {entity.columns.map((c) => (
            <li key={c.name}>
              <span className="ic-name">{c.name}</span>
              <span className="ic-type">{c.type}</span>
              {(c.keys ?? []).map((k) => <span key={k} className="ic-key">{k}</span>)}
              <button className="x" title="Remove column" onClick={() => deleteColumn(entity.id, c.name)}>×</button>
            </li>
          ))}
        </ul>

        <div className="add-col">
          <input className="txt" placeholder="column" value={colName} onChange={(e) => setColName(e.target.value)} />
          <input className="txt" placeholder="type" value={colType} onChange={(e) => setColType(e.target.value)} />
          <select className="txt" value={colKey} onChange={(e) => setColKey(e.target.value as KeyKind | 'none')}>
            {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="primary" onClick={onAddColumn}>Add</button>
        </div>
      </div>
    </section>
  );
}
