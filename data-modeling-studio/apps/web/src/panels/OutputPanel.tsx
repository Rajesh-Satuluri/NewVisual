import { useMemo } from 'react';
import { toDDL, toDBML, toMermaid } from '@dms/modeling-core';
import { useStore, type CodeFmt, type Dialect } from '../store';

const FMTS: { id: CodeFmt; label: string }[] = [
  { id: 'ddl', label: 'DDL' },
  { id: 'dbml', label: 'DBML' },
  { id: 'mermaid', label: 'Mermaid' },
];
const DIALECTS: Dialect[] = ['postgres', 'mysql', 'snowflake'];

export function OutputPanel() {
  const ir = useStore((s) => s.ir);
  const fmt = useStore((s) => s.fmt);
  const dialect = useStore((s) => s.dialect);
  const setFmt = useStore((s) => s.setFmt);
  const setDialect = useStore((s) => s.setDialect);

  const code = useMemo(() => {
    if (fmt === 'ddl') return toDDL(ir, dialect);
    if (fmt === 'dbml') return toDBML(ir);
    return toMermaid(ir);
  }, [ir, fmt, dialect]);

  return (
    <section className="card">
      <div className="card-h between">
        <div className="tabs">
          {FMTS.map((f) => (
            <button key={f.id} className={`tab${fmt === f.id ? ' active' : ''}`} onClick={() => setFmt(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        {fmt === 'ddl' && (
          <select className="mini-sel" value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)}>
            {DIALECTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>
      <pre className="code">{code}</pre>
    </section>
  );
}
