import { OutlineNode } from '../../types/document'
import { Node as FlowNode, Edge as FlowEdge } from 'reactflow'

export interface GraphData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * Traverses the OutlineNode tree and converts it into nodes and edges for React Flow.
 * Skips children of collapsed nodes.
 */
export function outlineToGraph(
  root: OutlineNode,
  collapsedNodeIds: Set<string>,
  visibleNodeIds?: Set<string>,
): GraphData {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  const traverse = (node: OutlineNode, parentId: string | null) => {
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) return

    // Add current node to nodes list
    nodes.push({
      id: node.id,
      position: { x: 0, y: 0 },
      data: { label: node.text || ' ' },
      type: parentId === null ? 'root' : 'custom',
    })

    // 层级边只表达树结构；颜色、线型和几何样式统一由渲染层应用。
    if (parentId) {
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
      })
    }

    // Stop traversing if this node is collapsed
    const isCollapsed = node.collapsed || collapsedNodeIds.has(node.id)
    if (isCollapsed) return

    if (node.children) {
      node.children.forEach((child) => {
        traverse(child, node.id)
      })
    }
  }

  traverse(root, null)

  return { nodes, edges }
}
