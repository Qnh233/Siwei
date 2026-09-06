import dagre from 'dagre'
import { MarkerType, type Edge, type Node } from 'reactflow'
import type { LibraryDocumentStatus, LibraryGraphResult } from '../../types/library'

const NODE_WIDTH = 210
const NODE_HEIGHT = 72

export interface KnowledgeGraphNodeData {
  title: string
  path: string
  status?: LibraryDocumentStatus
  isRoot: boolean
  openable: boolean
}

export interface KnowledgeGraphElements {
  nodes: Array<Node<KnowledgeGraphNodeData>>
  edges: Edge[]
}

export function buildKnowledgeGraphElements(
  result: LibraryGraphResult,
  currentTitle: string,
): KnowledgeGraphElements {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', ranksep: 110, nodesep: 54, marginx: 36, marginy: 36 })

  const sourceNodes = [...result.nodes]
  if (!sourceNodes.some((node) => node.documentId === result.rootDocumentId)) {
    sourceNodes.push({
      documentId: result.rootDocumentId,
      title: currentTitle || '当前文档',
      path: '',
    })
  }

  sourceNodes.forEach((node) => {
    graph.setNode(node.documentId, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  result.edges.forEach((edge) => graph.setEdge(edge.sourceDocumentId, edge.targetDocumentId))
  dagre.layout(graph)

  const nodes = sourceNodes.map<Node<KnowledgeGraphNodeData>>((node) => {
    const position = graph.node(node.documentId) ?? { x: NODE_WIDTH / 2, y: NODE_HEIGHT / 2 }
    const isRoot = node.documentId === result.rootDocumentId
    return {
      id: node.documentId,
      type: 'knowledgeDocument',
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
      data: {
        title: node.title || '未命名文档',
        path: node.path,
        status: node.status,
        isRoot,
        openable: isRoot || Boolean(node.path),
      },
      draggable: true,
      selectable: !isRoot,
    }
  })

  const edges = result.edges.map<Edge>((edge) => ({
    id: edge.referenceId,
    source: edge.sourceDocumentId,
    target: edge.targetDocumentId,
    type: 'smoothstep',
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 1.4 },
    labelStyle: { fontSize: 11 },
  }))

  return { nodes, edges }
}
