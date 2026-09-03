import { generateId } from '../../utils/id'
import type { OutlineDocument, OutlineNode } from '../../types/document'
import { pruneMindMapLayoutState } from '../mindmap/mindMapLayoutState'
import { pruneNodeRelations } from './nodeRelations'
import { pruneDocumentReferences } from '../references/documentReferences'
import { pruneEntityMentions } from '../mentions/entityMentions'
import type { HistorySnapshot } from './documentStoreTypes'

export function cloneDocument(doc: OutlineDocument): OutlineDocument {
  return JSON.parse(JSON.stringify(doc)) as OutlineDocument
}

export function createSnapshot(
  currentDoc: OutlineDocument,
  selectedNodeId: string | null,
  collapsedNodeIds: Set<string>,
): HistorySnapshot {
  const collapsedIds = [...collapsedNodeIds].sort()
  const doc = cloneDocument(currentDoc)
  const key = JSON.stringify({
    currentDoc: doc,
    selectedNodeId,
    collapsedNodeIds: collapsedIds,
  })

  return {
    currentDoc: doc,
    selectedNodeId,
    collapsedNodeIds: collapsedIds,
    key,
  }
}

export function collectCollapsedIds(node: OutlineNode, ids: Set<string>) {
  if (node.collapsed) {
    ids.add(node.id)
  }
  node.children.forEach((child) => collectCollapsedIds(child, ids))
}

export function createOutlineNode(text: string): OutlineNode {
  const now = Date.now()
  return {
    id: generateId(),
    text,
    createdAt: now,
    updatedAt: now,
    children: [],
  }
}

export function getNodeAtPath(root: OutlineNode, path: number[]): OutlineNode {
  let node = root
  for (const index of path) {
    node = node.children[index]
  }
  return node
}

export function getDocumentWithVersionForSave(doc: OutlineDocument): OutlineDocument {
  const mindMapLayout = pruneMindMapLayoutState(doc.mindMapLayout, doc.root)
  const relations = pruneNodeRelations(doc.relations, doc.root)
  const documentReferences = pruneDocumentReferences(doc.documentReferences, doc.root)
  const entityMentions = pruneEntityMentions(doc.entityMentions, doc.root)
  const version = entityMentions?.length
    ? Math.max(doc.version, 5)
    : documentReferences?.length
      ? Math.max(doc.version, 4)
      : relations?.length
        ? Math.max(doc.version, 3)
        : mindMapLayout
          ? Math.max(doc.version, 2)
          : doc.version
  return {
    ...doc,
    mindMapLayout,
    relations,
    documentReferences,
    entityMentions,
    version,
  }
}
