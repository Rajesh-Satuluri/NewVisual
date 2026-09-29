import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { LESSON_GROUPS, ALL_LESSONS, LESSON_COUNT, type Block, type Lesson } from '../data/lessons';
import { SchemaMini } from './SchemaMini';

function BlockView({ block }: { block: Block }) {
  const loadCustomIR = useStore((s) => s.loadCustomIR);
  switch (block.t) {
    case 'p':
      return <p className="lz-p">{block.text}</p>;
    case 'h':
      return <h3 className="lz-h">{block.text}</h3>;
    case 'list':
      return <ul className="lz-ul">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case 'ol':
      return <ol className="lz-ol">{block.items.map((it, i) => <li key={i}>{it}</li>)}</ol>;
    case 'code':
      return <pre className="lz-code">{block.text}</pre>;
    case 'table':
      return (
        <div className="lz-table-wrap">
          <table className="lz-table">
            <thead><tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'callout':
      return (
        <div className={`lz-callout ${block.kind}`}>
          <span className="lz-callout-tag">{block.kind === 'trap' ? 'Interview trap' : block.kind === 'tip' ? 'Tip' : 'Note'}</span>
          <span>{block.text}</span>
        </div>
      );
    case 'keys':
      return (
        <div className="lz-keys">
          <div className="lz-keys-h">Key takeaways</div>
          <ul>{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        </div>
      );
    case 'example':
      return (
        <div className="lz-example">
          <SchemaMini ir={block.ir} />
          <div className="lz-example-foot">
            <span>{block.caption}</span>
            <button className="primary" onClick={() => loadCustomIR(block.ir)}>Open in Studio →</button>
          </div>
        </div>
      );
  }
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const markRead = useStore((s) => s.markRead);
  useEffect(() => {
    const t = setTimeout(() => markRead(lesson.id), 400);
    return () => clearTimeout(t);
  }, [lesson.id, markRead]);

  return (
    <article className="lz-article">
      <div className="lz-eyebrow">{lesson.minutes} min read</div>
      <h2 className="lz-title">{lesson.title}</h2>
      <p className="lz-summary">{lesson.summary}</p>
      {lesson.blocks.map((b, i) => <BlockView block={b} key={i} />)}
    </article>
  );
}

export function Learn() {
  const lessonId = useStore((s) => s.lessonId);
  const openLesson = useStore((s) => s.openLesson);
  const readLessons = useStore((s) => s.readLessons);
  const [navOpen, setNavOpen] = useState(false);

  const current = useMemo(
    () => ALL_LESSONS.find((l) => l.id === lessonId) ?? ALL_LESSONS[0],
    [lessonId],
  );

  const readCount = useMemo(
    () => ALL_LESSONS.filter((l) => readLessons[l.id]).length,
    [readLessons],
  );

  if (!current) return null;

  const idx = ALL_LESSONS.findIndex((l) => l.id === current.id);
  const prev = idx > 0 ? ALL_LESSONS[idx - 1] : null;
  const next = idx < ALL_LESSONS.length - 1 ? ALL_LESSONS[idx + 1] : null;

  return (
    <div className="learn">
      <aside className={`lz-nav${navOpen ? ' open' : ''}`}>
        <div className="lz-progress">
          <div className="lz-progress-bar"><span style={{ width: `${(readCount / LESSON_COUNT) * 100}%` }} /></div>
          <div className="lz-progress-txt">{readCount} / {LESSON_COUNT} concepts read</div>
        </div>
        {LESSON_GROUPS.map((g) => (
          <div className="lz-group" key={g.id}>
            <div className="lz-group-h">{g.label}</div>
            {g.lessons.map((l) => (
              <button
                key={l.id}
                className={`lz-item${l.id === current.id ? ' active' : ''}${readLessons[l.id] ? ' read' : ''}`}
                onClick={() => { openLesson(l.id); setNavOpen(false); }}
              >
                <span className="lz-check">{readLessons[l.id] ? '✓' : '○'}</span>
                <span className="lz-item-t">{l.title}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="lz-main">
        <button className="lz-nav-toggle" onClick={() => setNavOpen((o) => !o)}>
          ☰ Lessons
        </button>
        <LessonView lesson={current} />
        <div className="lz-pager">
          {prev ? <button className="lz-page-btn" onClick={() => openLesson(prev.id)}>← {prev.title}</button> : <span />}
          {next ? <button className="lz-page-btn next" onClick={() => openLesson(next.id)}>{next.title} →</button> : <span />}
        </div>
      </main>
    </div>
  );
}
