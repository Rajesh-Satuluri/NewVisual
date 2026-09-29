import { useMemo } from 'react';
import { grade } from '@dms/modeling-core';
import { useStore } from '../store';

export function GradePanel() {
  const ir = useStore((s) => s.ir);
  const scenario = useStore((s) => s.scenario);

  const result = useMemo(() => (scenario ? grade(ir, scenario) : null), [ir, scenario]);

  return (
    <section className="card">
      <div className="card-h"><h3>Interview grader</h3></div>
      {!scenario || !result ? (
        <div className="free">
          No scenario loaded for this sample — this is a free build. Load the sales star schema to be graded like an interview.
        </div>
      ) : (
        <div className="grade-b">
          <div className="score">
            <div className="ring" style={{ ['--p' as string]: result.percent }}>
              <b>{result.percent}<span className="pct">%</span></b>
            </div>
            <div>
              <div className="lbl">Scenario</div>
              <div className="s-title">{scenario.title}</div>
            </div>
          </div>
          <ul className="rubric">
            {result.results.map((r) => (
              <li className={`ru ${r.passed ? 'pass' : 'fail'}`} key={r.ruleId}>
                <span className="mk">{r.passed ? '✓' : '·'}</span>
                <div className="rt">
                  <div>{r.description} <span className="w">·w{r.weight}</span></div>
                  {!r.passed && r.hint && <div className="rh">{r.hint}</div>}
                </div>
              </li>
            ))}
          </ul>
          {scenario.commonTrap && <div className="trap"><b>Common trap:</b> {scenario.commonTrap}</div>}
        </div>
      )}
    </section>
  );
}
