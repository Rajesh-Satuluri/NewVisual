import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeChange,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../store';
import { EntityNode, type EntityFlowNode } from './EntityNode';
import { toNodes, toEdges } from './irToFlow';

const nodeTypes: NodeTypes = { entity: EntityNode };

export function SchemaCanvas() {
  const ir = useStore((s) => s.ir);
  const positions = useStore((s) => s.positions);
  const selectedId = useStore((s) => s.selectedId);
  const setPosition = useStore((s) => s.setPosition);
  const select = useStore((s) => s.select);

  const nodes = useMemo(() => {
    const base = toNodes(ir, positions);
    return base.map((n) => ({ ...n, selected: n.id === selectedId }));
  }, [ir, positions, selectedId]);

  const edges = useMemo(() => toEdges(ir), [ir]);

  const onNodesChange = useCallback(
    (changes: NodeChange<EntityFlowNode>[]) => {
      for (const c of changes) {
        if (c.type === 'position' && c.position) setPosition(c.id, c.position);
      }
    },
    [setPosition],
  );

  const onNodeClick = useCallback<NodeMouseHandler<EntityFlowNode>>(
    (_, node) => select(node.id),
    [select],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onPaneClick={() => select(null)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <MiniMap pannable zoomable nodeStrokeWidth={2} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
