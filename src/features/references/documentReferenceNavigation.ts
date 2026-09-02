import * as api from '../../services/siweiApi'
import type { DocumentReference } from '../../types/document'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { useDocumentStore } from '../document/documentStore'

export async function openDocumentReference(reference: DocumentReference): Promise<void> {
  const store = useDocumentStore.getState()
  if (store.currentDoc?.id === reference.targetDocumentId) return
  if (!store.canDiscardCurrentDoc()) return

  try {
    await store.loadDoc(reference.targetPath)
  } catch (primaryError) {
    const indexed = (await api.getLibraryDocs()).find(
      (document) => document.documentId === reference.targetDocumentId && document.status !== 'missing',
    )
    if (!indexed || indexed.path === reference.targetPath) throw primaryError
    await useDocumentStore.getState().loadDoc(indexed.path)
  }

  useWorkspaceStore.getState().setActiveView('editor')
}
