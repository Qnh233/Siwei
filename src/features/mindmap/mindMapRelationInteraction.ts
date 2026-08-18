import type { Node, XYPosition } from 'reactflow'
import type { NodeRelationCurveOffset, NodeRelationHandle } from '../../types/document'
import type { MindMapNodeData } from './MindMapNode'
import type { MindMapNodeSize } from './layoutEngine'

interface RelationDropTarget {
  nodeId: string
  handle: NodeRelationHandle
}

const DEFAULT_NODE_SIZE: MindMapNodeSize = { width: 180, height: 52 }

const getNodeSize = (node: Node<MindMapNodeData>, nodeSizes: Record<string, MindMapNodeSize>) => (
  nodeSizes[node.id] ?? {
    width: node.width ?? DEFAULT_NODE_SIZE.width,
    height: node.height ?? DEFAULT_NODE_SIZE.height,
  }
)

export function getRelationNodeCenter(
  node: Node<MindMapNodeData>,
  nodeSizes: Record<string, MindMapNodeSize> = {},
): XYPosition {
  const size = getNodeSize(node, nodeSizes)
  return {
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  }
}

export function findRelationDropTarget(
  nodes: Node<MindMapNodeData>[],
  point: XYPosition,
  sourceNodeId: string,
  nodeSizes: Record<string, MindMapNodeSize> = {},
): RelationDropTarget | null {
  const candidates = nodes.flatMap((node) => {
    if (node.id === sourceNodeId || node.hidden) return []
    const size = getNodeSize(node, nodeSizes)
    const left = node.position.x
    const top = node.position.y
    const right = left + size.width
    const bottom = top + size.height
    if (point.x < left || point.x > right || point.y < top || point.y > bottom) return []
    const center = { x: left + size.width / 2, y: top + size.height / 2 }
    const sideMidpoints: Array<{ handle: NodeRelationHandle; point: XYPosition }> = [
      { handle: 'top', point: { x: center.x, y: top } },
      { handle: 'right', point: { x: right, y: center.y } },
      { handle: 'bottom', point: { x: center.x, y: bottom } },
      { handle: 'left', point: { x: left, y: center.y } },
    ]
    const nearestHandle = sideMidpoints.reduce((best, current) => {
      const distance = Math.hypot(point.x - current.point.x, point.y - current.point.y)
      return distance < best.distance ? { handle: current.handle, distance } : best
    }, { handle: 'top' as NodeRelationHandle, distance: Number.POSITIVE_INFINITY })
    return [{
      nodeId: node.id,
      handle: nearestHandle.handle,
      distanceToCenter: Math.hypot(point.x - center.x, point.y - center.y),
    }]
  })

  candidates.sort((a, b) => a.distanceToCenter - b.distanceToCenter)
  return candidates[0] ? { nodeId: candidates[0].nodeId, handle: candidates[0].handle } : null
}

export function getParallelCurveOffset(
  existingPairCount: number,
  sourceCenter: XYPosition,
  targetCenter: XYPosition,
): NodeRelationCurveOffset {
  if (existingPairCount <= 0) return { x: 0, y: 0 }
  const lane = Math.ceil(existingPairCount / 2) * (existingPairCount % 2 === 1 ? 1 : -1)
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const length = Math.hypot(dx, dy) || 1
  const distance = lane * 44
  const normalizeZero = (value: number) => Object.is(value, -0) ? 0 : value
  return {
    x: normalizeZero(Math.round((-dy / length) * distance)),
    y: normalizeZero(Math.round((dx / length) * distance)),
  }
}
