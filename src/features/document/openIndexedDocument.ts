import { useWorkspaceStore } from '../../app/workspaceStore'
import * as api from '../../services/siweiApi'
import { useDocumentStore } from './documentStore'

export interface IndexedDocumentTarget {
  documentId: string
  path?: string | null
  nodeId?: string | null
}

export async function openIndexedDocument(target: IndexedDocumentTarget): Promise<boolean> {
  const store = useDocumentStore.getState()
  if (store.currentDoc?.id === target.documentId) {
    revealTargetNode(target.nodeId)
    return true
  }
  if (!store.canDiscardCurrentDoc()) return false

  const directPath = target.path?.trim() || null
  let resolvedPath = directPath

  if (!resolvedPath) {
    resolvedPath = await findIndexedPath(target.documentId)
  }

  if (!resolvedPath) {
    throw new Error('目标文档当前不在文档库索引中')
  }

  try {
    await store.loadDoc(resolvedPath)
  } catch (primaryError) {
    const relocatedPath = await findIndexedPath(target.documentId)
    if (!relocatedPath || relocatedPath === resolvedPath) throw primaryError
    await useDocumentStore.getState().loadDoc(relocatedPath)
  }

  revealTargetNode(target.nodeId)
  return true
}

async function findIndexedPath(documentId: string): Promise<string | null> {
  const indexed = (await api.getLibraryDocs()).find(
    (document) => document.documentId === documentId && document.status !== 'missing',
  )
  return indexed?.path ?? null
}

function revealTargetNode(nodeId?: string | null): void {
  const workspace = useWorkspaceStore.getState()
  workspace.setActiveView('editor')
  if (nodeId) workspace.requestNodeReveal(nodeId, 'external')
}
