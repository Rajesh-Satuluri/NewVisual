import { useStore as useRawStore } from 'zustand';
import { useStore } from './store';
import type { SampleId } from './data/samples';
import { SAMPLES } from './data/samples';
import { SchemaCanvas } from './canvas/SchemaCanvas';
import { Inspector } from './panels/Inspector';
import { FindingsPanel } from './panels/FindingsPanel';
import { GradePanel } from './panels/GradePanel';
import { OutputPanel } from './panels/OutputPanel';
import { Learn } from './panels/Learn';

function toggleTheme() {
  const r = document.documentElement;
  const cur = r.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = cur === 'dark' ? 'light' : cur === 'light' ? 'dark' : prefersDark ? 'light' : 'dark';
  r.setAttribute('data-theme', next);
}

function Studio() {
  const sample = useStore((s) => s.sample);
  const loadSample = useStore((s) => s.loadSample);
  const addEntity = useStore((s) => s.addEntity);

  const undo = useStore.temporal.getState().undo;
  const redo = useStore.temporal.getState().redo;
  const pastCount = useRawStore(useStore.temporal, (s) => s.pastStates.length);
  const futureCount = useRawStore(useStore.temporal, (s) => s.futureStates.length);

  return (
    <>
      <div className="subbar">
        <select
          className="mini-sel"
          value={sample}
          onChange={(e) => loadSample(e.target.value as SampleId)}
          aria-label="Sample schema"
        >
          {Object.values(SAMPLES).map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button className="ghost" onClick={addEntity}>+ Table</button>
        <button className="ghost" onClick={() => undo()} disabled={pastCount === 0} title="Undo">↶</button>
        <button className="ghost" onClick={() => redo()} disabled={futureCount === 0} title="Redo">↷</button>
      </div>
      <div className="studio">
        <div className="canvas-wrap">
          <SchemaCanvas />
        </div>
        <aside className="side">
          <Inspector />
          <GradePanel />
          <FindingsPanel />
        </aside>
        <div className="bottom">
          <OutputPanel />
        </div>
      </div>
    </>
  );
}

export function App() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">◧</div>
          <div>
            <h1>Data Modeling Studio</h1>
            <div className="sub">learn the concepts · build & get graded</div>
          </div>
        </div>
        <nav className="mode-switch" role="tablist">
          <button role="tab" aria-selected={mode === 'learn'} className={mode === 'learn' ? 'on' : ''} onClick={() => setMode('learn')}>Learn</button>
          <button role="tab" aria-selected={mode === 'build'} className={mode === 'build' ? 'on' : ''} onClick={() => setMode('build')}>Studio</button>
        </nav>
        <div className="spacer" />
        <button className="ghost" onClick={toggleTheme} title="Toggle theme">◐</button>
      </header>

      {mode === 'learn' ? <Learn /> : <Studio />}
    </div>
  );
}
