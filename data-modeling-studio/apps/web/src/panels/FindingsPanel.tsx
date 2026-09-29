import { useMemo } from 'react';
import { validateAll, type Finding, type Severity } from '@dms/modeling-core';
import { useStore } from '../store';

export function FindingsPanel() {
  const ir = useStore((s) => s.ir);
  const findings = useMemo(() => validateAll(ir), [ir]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
    for (const f of findings) c[f.severity] += 1;
    return c;
  }, [findings]);

  return (
    <section className="card">
      <div className="card-h"><h3>Validators</h3></div>
      <div className="sev-row">
        <span className="chip e">{counts.error} error{counts.error !== 1 ? 's' : ''}</span>
        <span className="chip w">{counts.warning} warning{counts.warning !== 1 ? 's' : ''}</span>
        <span className="chip i">{counts.info} info</span>
      </div>
      <div className="findings">
        {findings.length === 0 ? (
          <div className="clean">✓ No issues — this model is clean.</div>
        ) : (
          findings.map((f: Finding, i) => (
            <div className={`find ${f.severity}`} key={`${f.rule}-${i}`}>
              <span className="dot" />
              <div>
                <div className="msg">{f.message}</div>
                <div className="rule">{f.rule}</div>
                {f.hint && <div className="hint">{f.hint}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
