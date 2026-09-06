import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '../../app/workspaceStore'
import * as api from '../../services/siweiApi'
import { createDocument } from '../../test/fixtures'
import { useDocumentStore } from './documentStore'
import { openIndexedDocument } from './openIndexedDocument'

vi.mock('../../services/siweiApi', () => ({
  getLibraryDocs: vi.fn(),
}))

const apiMock = vi.mocked(api)

describe('openIndexedDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkspaceStore.setState({ activeView: 'graph', nodeRevealRequest: null })
    useDocumentStore.setState({
      currentDoc: createDocument(),
      canDiscardCurrentDoc: vi.fn(() => true),
      loadDoc: vi.fn(async () => undefined),
    })
    apiMock.getLibraryDocs.mockResolvedValue([])
  })

  it('reveals a source node without reloading when the target document is already open', async () => {
    const loadDoc = vi.mocked(useDocumentStore.getState().loadDoc)

    await expect(openIndexedDocument({ documentId: 'doc-1', nodeId: 'node-2' })).resolves.toBe(true)

    expect(loadDoc).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().activeView).toBe('editor')
    expect(useWorkspaceStore.getState().nodeRevealRequest).toMatchObject({
      nodeId: 'node-2',
      source: 'external',
    })
  })

  it('retries a relocated indexed path when the persisted path can no longer be loaded', async () => {
    const loadDoc = vi.fn()
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValueOnce(undefined)
    useDocumentStore.setState({ loadDoc })
    apiMock.getLibraryDocs.mockResolvedValue([
      {
        documentId: 'doc-target',
        title: '目标文档',
        path: 'C:/new/target.siwei.json',
        updatedAt: 1,
        indexedAt: 1,
        nodeCount: 1,
        taskCount: 0,
        uncheckedTaskCount: 0,
        tags: [],
        status: 'ready',
      },
    ])

    await expect(openIndexedDocument({
      documentId: 'doc-target',
      path: 'C:/old/target.siwei.json',
    })).resolves.toBe(true)

    expect(loadDoc).toHaveBeenNthCalledWith(1, 'C:/old/target.siwei.json')
    expect(loadDoc).toHaveBeenNthCalledWith(2, 'C:/new/target.siwei.json')
    expect(useWorkspaceStore.getState().activeView).toBe('editor')
  })

  it('does not leave the current document when dirty-state protection rejects navigation', async () => {
    const loadDoc = vi.mocked(useDocumentStore.getState().loadDoc)
    useDocumentStore.setState({ canDiscardCurrentDoc: vi.fn(() => false) })

    await expect(openIndexedDocument({
      documentId: 'doc-target',
      path: 'C:/docs/target.siwei.json',
    })).resolves.toBe(false)

    expect(loadDoc).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().activeView).toBe('graph')
  })
})
