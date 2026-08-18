import { MarkerType, type Edge, type Node } from 'reactflow'
import type { NodeRelation } from '../../types/document'
import type { MindMapNodeData } from './MindMapNode'
import type { MindMapNodeSize } from './layoutEngine'
import { attachDirectionalEdgeHandles } from './layoutEngines/shared'

export interface MindMapRelationEdgeData {
  kind: 'relation'
  relationId: string
}

export function buildMindMapRelationEdges(
  relations: NodeRelation[] | undefined,
  nodes: Node<MindMapNodeData>[],
  nodeSizes: Record<string, MindMapNodeSize>,
): Edge<MindMapRelationEdgeData>[] {
  if (!relations?.length) return []
  const visibleNodeIds = new Set(nodes.map((node) => node.id))
  const edges = relations
    .filter((relation) => visibleNodeIds.has(relation.sourceNodeId) && visibleNodeIds.has(relation.targetNodeId))
    .map<Edge<MindMapRelationEdgeData>>((relation) => ({
      id: `relation:${relation.id}`,
      source: relation.sourceNodeId,
      target: relation.targetNodeId,
      type: 'bezier',
      label: relation.label,
      data: { kind: 'relation', relationId: relation.id },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      markerStart: relation.direction === 'two-way'
        ? { type: MarkerType.ArrowClosed, width: 14, height: 14 }
        : undefined,
      style: { stroke: '#0F766E', strokeWidth: 1.7 },
      labelStyle: { fill: '#0F766E', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#FFFCF5', fillOpacity: 0.95 },
      labelBgPadding: [5, 3],
      labelBgBorderRadius: 5,
    }))

  return attachDirectionalEdgeHandles(edges, nodes, nodeSizes) as Edge<MindMapRelationEdgeData>[]
}
