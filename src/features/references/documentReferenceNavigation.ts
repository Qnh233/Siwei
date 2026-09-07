import type { DocumentReference } from '../../types/document'
import { openIndexedDocument } from '../document/openIndexedDocument'

export async function openDocumentReference(reference: DocumentReference): Promise<void> {
  await openIndexedDocument({
    documentId: reference.targetDocumentId,
    path: reference.targetPath,
  })
}
