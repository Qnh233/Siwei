import { describe, expect, it } from 'vitest'
import type { LibraryDocumentItem } from '../../types/library'
import { buildLibraryFolderTree } from './libraryFolderTree'

function doc(documentId: string, path: string): LibraryDocumentItem {
  return {
    documentId,
    title: documentId,
    path,
    updatedAt: 1,
    indexedAt: 1,
    nodeCount: 1,
    taskCount: 0,
    uncheckedTaskCount: 0,
    tags: [],
    status: 'ready',
  }
}

describe('buildLibraryFolderTree', () => {
  it('groups library documents by nested filesystem folders', () => {
    const tree = buildLibraryFolderTree(
      [
        doc('root', 'D:/Notes/root.siwei.json'),
        doc('work', 'D:/Notes/Work/work.siwei.json'),
        doc('daily', 'D:/Notes/Work/Daily/daily.siwei.json'),
      ],
      'D:/Notes',
    )

    expect(tree.root.name).toBe('Notes')
    expect(tree.root.documents.map((item) => item.documentId)).toEqual(['root'])
    expect(tree.root.children).toHaveLength(1)
    expect(tree.root.children[0].name).toBe('Work')
    expect(tree.root.children[0].documents.map((item) => item.documentId)).toEqual(['work'])
    expect(tree.root.children[0].children[0].name).toBe('Daily')
    expect(tree.root.children[0].children[0].documents.map((item) => item.documentId)).toEqual(['daily'])
  })

  it('includes real empty and nested filesystem folders even without indexed documents', () => {
    const tree = buildLibraryFolderTree([], 'D:/Notes', ['Empty', 'Work', 'Work/Daily'])

    expect(tree.root.children.map((folder) => folder.name)).toEqual(['Empty', 'Work'])
    expect(tree.root.children[1].children[0].name).toBe('Daily')
    expect(tree.root.children[0].documents).toEqual([])
  })

  it('handles Windows separators and keeps manually indexed external documents separate', () => {
    const tree = buildLibraryFolderTree(
      [
        doc('inside', 'D:\\Notes\\Projects\\inside.siwei.json'),
        doc('outside', 'E:\\Archive\\outside.siwei.json'),
      ],
      'd:\\notes\\',
    )

    expect(tree.root.name).toBe('notes')
    expect(tree.root.children[0].name).toBe('Projects')
    expect(tree.externalDocuments.map((item) => item.documentId)).toEqual(['outside'])
  })
})
