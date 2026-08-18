import { MarkerType, type Edge, type Node } from 'reactflow'
import type { NodeRelation, NodeRelationHandle } from '../../types/document'
import type { MindMapNodeData } from './MindMapNode'
import type { MindMapNodeSize } from './layoutEngine'

export interface MindMapRelationEdgeData {
  kind: 'relation'
  relationId: string
  label?: string
  curveOffset?: NodeRelation['curveOffset']
  editing?: boolean
  onStartEdit?: () => void
  onFinishEdit?: () => void
}

const relationHandleId = (handle: NodeRelationHandle) => `relation-${handle}`

function fallbackHandles(
  relation: NodeRelation,
  nodesById: Map<string, Node<MindMapNodeData>>,
  nodeSizes: Record<string, MindMapNodeSize>,
): { source: NodeRelationHandle; target: NodeRelationHandle } {
  const source = nodesById.get(relation.sourceNodeId)
  const target = nodesById.get(relation.targetNodeId)
  if (!source || !target) return { source: 'right', target: 'left' }
  const sourceSize = nodeSizes[source.id] ?? { width: source.width ?? 160, height: source.height ?? 44 }
  const targetSize = nodeSizes[target.id] ?? { width: target.width ?? 160, height: target.height ?? 44 }
  const sourceCenter = { x: source.position.x + sourceSize.width / 2, y: source.position.y + sourceSize.height / 2 }
  const targetCenter = { x: target.position.x + targetSize.width / 2, y: target.position.y + targetSize.height / 2 }
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { source: 'right', target: 'left' } : { source: 'left', target: 'right' }
  }
  return dy >= 0 ? { source: 'bottom', target: 'top' } : { source: 'top', target: 'bottom' }
}

export function buildMindMapRelationEdges(
  relations: NodeRelation[] | undefined,
  nodes: Node<MindMapNodeData>[],
  nodeSizes: Record<string, MindMapNodeSize>,
  editingRelationId?: string | null,
  onFinishEdit?: () => void,
  onStartEdit?: (relationId: string) => void,
): Edge<MindMapRelationEdgeData>[] {
  if (!relations?.length) return []
  const visibleNodeIds = new Set(nodes.map((node) => node.id))
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  return relations
    .filter((relation) => visibleNodeIds.has(relation.sourceNodeId) && visibleNodeIds.has(relation.targetNodeId))
    .map<Edge<MindMapRelationEdgeData>>((relation) => {
      const fallback = fallbackHandles(relation, nodesById, nodeSizes)
      const sourceHandle = relation.sourceHandle ?? fallback.source
      const targetHandle = relation.targetHandle ?? fallback.target
      return {
        id: `relation:${relation.id}`,
        source: relation.sourceNodeId,
        target: relation.targetNodeId,
        sourceHandle: relationHandleId(sourceHandle),
        targetHandle: relationHandleId(targetHandle),
        type: 'relation',
        data: {
          kind: 'relation',
          relationId: relation.id,
          label: relation.label,
          curveOffset: relation.curveOffset,
          editing: editingRelationId === relation.id,
          onStartEdit: onStartEdit ? () => onStartEdit(relation.id) : undefined,
          onFinishEdit,
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        markerStart: relation.direction === 'two-way'
          ? { type: MarkerType.ArrowClosed, width: 14, height: 14 }
          : undefined,
        style: { stroke: '#0D9488', strokeWidth: 2.2 },
      }
    })
}
