import type { Edge, Node } from 'reactflow'
import type { LibraryDocumentStatus, LibraryGraphResult } from '../../types/library'

export interface KnowledgeGraphNodeData {
  title: string
  path: string
  status?: LibraryDocumentStatus
  isRoot: boolean
  openable: boolean
  degree: number
  hop: number
  radius: number
  dimmed?: boolean
  highlighted?: boolean
}

export interface KnowledgeGraphElements {
  nodes: Array<Node<KnowledgeGraphNodeData>>
  edges: Edge[]
}

function hashUnit(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0xffffffff
}

export function computeKnowledgeGraphHops(result: LibraryGraphResult): Map<string, number> {
  const adjacency = new Map<string, Set<string>>()
  const addNeighbor = (source: string, target: string) => {
    const neighbors = adjacency.get(source) ?? new Set<string>()
    neighbors.add(target)
    adjacency.set(source, neighbors)
  }

  result.edges.forEach((edge) => {
    addNeighbor(edge.sourceDocumentId, edge.targetDocumentId)
    addNeighbor(edge.targetDocumentId, edge.sourceDocumentId)
  })

  const hops = new Map<string, number>([[result.rootDocumentId, 0]])
  let frontier = [result.rootDocumentId]
  while (frontier.length > 0) {
    const next: string[] = []
    for (const documentId of frontier) {
      const hop = hops.get(documentId) ?? 0
      for (const neighbor of adjacency.get(documentId) ?? []) {
        if (!hops.has(neighbor)) {
          hops.set(neighbor, hop + 1)
          next.push(neighbor)
        }
      }
    }
    frontier = next
  }
  return hops
}

export function buildKnowledgeGraphElements(
  result: LibraryGraphResult,
  currentTitle: string,
): KnowledgeGraphElements {
  const sourceNodes = [...result.nodes]
  if (!sourceNodes.some((node) => node.documentId === result.rootDocumentId)) {
    sourceNodes.push({
      documentId: result.rootDocumentId,
      title: currentTitle || '当前文档',
      path: '',
    })
  }

  const hops = computeKnowledgeGraphHops(result)
  const degrees = new Map<string, number>()
  result.edges.forEach((edge) => {
    degrees.set(edge.sourceDocumentId, (degrees.get(edge.sourceDocumentId) ?? 0) + 1)
    degrees.set(edge.targetDocumentId, (degrees.get(edge.targetDocumentId) ?? 0) + 1)
  })

  const maxHop = Math.max(1, ...hops.values())
  const nodes = sourceNodes.map<Node<KnowledgeGraphNodeData>>((node) => {
    const isRoot = node.documentId === result.rootDocumentId
    const hop = hops.get(node.documentId) ?? maxHop + 1
    const degree = degrees.get(node.documentId) ?? 0
    const radius = isRoot
      ? Math.min(24, 13 + Math.sqrt(Math.max(1, degree)) * 3)
      : Math.min(18, 7 + Math.sqrt(Math.max(1, degree)) * 2.4)
    const angle = hashUnit(node.documentId) * Math.PI * 2
    const ring = hop === 0 ? 0 : 135 * hop + (hashUnit(`${node.documentId}:ring`) - 0.5) * 60

    return {
      id: node.documentId,
      type: 'knowledgeDocument',
      position: hop === 0
        ? { x: 0, y: 0 }
        : { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring },
      data: {
        title: node.title || '未命名文档',
        path: node.path,
        status: node.status,
        isRoot,
        openable: isRoot || Boolean(node.path),
        degree,
        hop,
        radius,
      },
      draggable: true,
      selectable: !isRoot,
    }
  })

  const edges = result.edges.map<Edge>((edge) => ({
    id: edge.referenceId,
    source: edge.sourceDocumentId,
    target: edge.targetDocumentId,
    type: 'straight',
    className: 'knowledge-graph-edge-enter',
    style: { strokeWidth: 1.15, opacity: 0.36 },
  }))

  return { nodes, edges }
}
