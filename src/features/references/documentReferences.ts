import type { DocumentReference, OutlineNode } from '../../types/document'
import type { LibraryDocumentItem } from '../../types/library'

const DOCUMENT_REFERENCE_PATTERN = /\[\[([^\[\]\n]+)\]\]/g

export interface DocumentReferenceQuery {
  start: number
  end: number
  query: string
}

export function extractDocumentReferenceLabels(text: string): string[] {
  return [...text.matchAll(DOCUMENT_REFERENCE_PATTERN)]
    .map((match) => match[1].trim())
    .filter(Boolean)
}

export function findDocumentReferenceQuery(text: string, caret: number): DocumentReferenceQuery | null {
  const prefix = text.slice(0, caret)
  const start = prefix.lastIndexOf('[[')
  if (start < 0) return null
  const fragment = prefix.slice(start + 2)
  if (fragment.includes(']]') || fragment.includes('\n') || fragment.includes('[') || fragment.includes(']')) {
    return null
  }
  return { start, end: caret, query: fragment }
}

export function referencesForNode(
  references: DocumentReference[] | undefined,
  nodeId: string,
): DocumentReference[] {
  return (references ?? [])
    .filter((reference) => reference.sourceNodeId === nodeId)
    .sort((left, right) => left.sourceOccurrence - right.sourceOccurrence)
}

export function pruneDocumentReferences(
  references: DocumentReference[] | undefined,
  root: OutlineNode,
): DocumentReference[] | undefined {
  if (!references?.length) return undefined
  const nodes = new Map<string, OutlineNode>()
  const visit = (node: OutlineNode) => {
    nodes.set(node.id, node)
    node.children.forEach(visit)
  }
  visit(root)
  const next = [...nodes.values()].flatMap((node) =>
    reconcileDocumentReferences(node.text, references, node.id),
  )
  return next.length > 0 ? next : undefined
}

export function reconcileDocumentReferences(
  text: string,
  references: DocumentReference[] | undefined,
  sourceNodeId: string,
): DocumentReference[] {
  const labels = extractDocumentReferenceLabels(text)
  const available = referencesForNode(references, sourceNodeId)
  const used = new Set<string>()
  const next: DocumentReference[] = []

  labels.forEach((label, sourceOccurrence) => {
    const match = available.find((reference) => reference.label === label && !used.has(reference.id))
    if (!match) return
    used.add(match.id)
    next.push({ ...match, sourceOccurrence })
  })

  return next
}

export function insertDocumentReferenceText(options: {
  text: string
  references: DocumentReference[] | undefined
  sourceNodeId: string
  rangeStart: number
  rangeEnd: number
  target: Pick<LibraryDocumentItem, 'documentId' | 'title' | 'path'>
  now: number
  id: string
}): { text: string; references: DocumentReference[] } {
  const {
    text,
    references,
    sourceNodeId,
    rangeStart,
    rangeEnd,
    target,
    now,
    id,
  } = options
  const syntax = `[[${target.title}]]`
  const nextText = `${text.slice(0, rangeStart)}${syntax}${text.slice(rangeEnd)}`
  const occurrence = extractDocumentReferenceLabels(nextText.slice(0, rangeStart + syntax.length)).length - 1
  const nodeReferences = referencesForNode(references, sourceNodeId)
  const inserted: DocumentReference = {
    id,
    sourceNodeId,
    sourceOccurrence: occurrence,
    targetDocumentId: target.documentId,
    targetPath: target.path,
    label: target.title,
    createdAt: now,
    updatedAt: now,
  }
  const shifted = nodeReferences.map((reference) => reference.sourceOccurrence >= occurrence
    ? { ...reference, sourceOccurrence: reference.sourceOccurrence + 1 }
    : reference)

  return {
    text: nextText,
    references: [...shifted, inserted].sort((left, right) => left.sourceOccurrence - right.sourceOccurrence),
  }
}
