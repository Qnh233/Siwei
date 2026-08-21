import dagre from 'dagre'
import { Node as FlowNode, Edge as FlowEdge, Position } from 'reactflow'
import { GraphData } from './outlineToGraph'
import { MindMapLayoutPosition } from '../../types/document'

interface LayoutGraphOptions {
  savedLayout?: Record<string, MindMapLayoutPosition>
  preserveSavedPositions?: boolean
  nodeSizes?: Record<string, { width: number; height: number }>
  rankdir?: 'LR' | 'RL' | 'TB' | 'BT'
  nodesep?: number
  ranksep?: number
  marginx?: number
  marginy?: number
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path'
}

/**
 * Positions the React Flow elements in a Left-to-Right (LR) hierarchy using the Dagre layout engine.
 */
export function layoutGraph(graphData: GraphData, options: LayoutGraphOptions = {}): GraphData {
  const { nodes, edges } = graphData
  if (nodes.length === 0) return graphData

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 200
  const nodeHeight = 44

  const rankdir = options.rankdir ?? 'LR'

  // 结构布局共用 Dagre，但由各布局预设决定方向和疏密。
  dagreGraph.setGraph({
    rankdir,
    nodesep: options.nodesep ?? 30,
    ranksep: options.ranksep ?? 80,
    marginx: options.marginx ?? 40,
    marginy: options.marginy ?? 40,
    ranker: options.ranker ?? 'network-simplex',
  })

  // Add nodes to dagre
  nodes.forEach((node) => {
    const size = options.nodeSizes?.[node.id] ?? { width: nodeWidth, height: nodeHeight }
    dagreGraph.setNode(node.id, size)
  })

  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Compute layout
  dagre.layout(dagreGraph)

  // Map computed coordinates back to nodes
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id)
    const savedPosition = options.savedLayout?.[node.id]
    const size = options.nodeSizes?.[node.id] ?? { width: nodeWidth, height: nodeHeight }
    
    const vertical = rankdir === 'TB' || rankdir === 'BT'
    const reversed = rankdir === 'RL' || rankdir === 'BT'

    return {
      ...node,
      targetPosition: vertical
        ? (reversed ? Position.Bottom : Position.Top)
        : (reversed ? Position.Right : Position.Left),
      sourcePosition: vertical
        ? (reversed ? Position.Top : Position.Bottom)
        : (reversed ? Position.Left : Position.Right),
      position: options.preserveSavedPositions && savedPosition
        ? savedPosition
        : {
          x: dagreNode.x - size.width / 2,
          y: dagreNode.y - size.height / 2,
        },
    }
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}
