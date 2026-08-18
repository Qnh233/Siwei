import type { NodeRelation, OutlineNode } from '../../types/document'
import { generateId } from '../../utils/id'

export function collectSubtreeNodeIds(node: OutlineNode, ids = new Set<string>()): Set<string> {
  ids.add(node.id)
  node.children.forEach((child) => collectSubtreeNodeIds(child, ids))
  return ids
}

export function collectDocumentNodeIds(root: OutlineNode): Set<string> {
  return collectSubtreeNodeIds(root)
}

export function pruneNodeRelations(relations: NodeRelation[] | undefined, root: OutlineNode): NodeRelation[] | undefined {
  if (!relations?.length) return relations
  const nodeIds = collectDocumentNodeIds(root)
  const next = relations.filter((relation) => nodeIds.has(relation.sourceNodeId) && nodeIds.has(relation.targetNodeId))
  return next.length > 0 ? next : undefined
}

export function cloneOutlineNodesWithRelationMap(
  nodes: OutlineNode[],
  now: number,
): { nodes: OutlineNode[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const clone = (node: OutlineNode): OutlineNode => {
    const id = generateId()
    idMap.set(node.id, id)
    return {
      ...node,
      id,
      createdAt: now,
      updatedAt: now,
      children: node.children.map(clone),
    }
  }
  return { nodes: nodes.map(clone), idMap }
}

export function remapNodeRelations(
  relations: NodeRelation[] | undefined,
  idMap: Map<string, string>,
  now: number,
): NodeRelation[] {
  if (!relations?.length) return []
  return relations.flatMap((relation) => {
    const sourceNodeId = idMap.get(relation.sourceNodeId)
    const targetNodeId = idMap.get(relation.targetNodeId)
    if (!sourceNodeId || !targetNodeId) return []
    return [{
      ...relation,
      id: generateId(),
      sourceNodeId,
      targetNodeId,
      createdAt: now,
      updatedAt: now,
    }]
  })
}
