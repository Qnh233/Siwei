import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentStore } from './documentStore'
import { createDocument } from '../../test/fixtures'
import * as api from '../../services/siweiApi'
import { createDocumentSnapshotKey } from '../agent/agentChangePlan'

vi.mock('../../services/siweiApi', () => ({
  newDocument: vi.fn(),
  saveDocument: vi.fn(),
  loadDocument: vi.fn(),
  exportMarkdown: vi.fn(),
  exportJson: vi.fn(),
  importMarkdown: vi.fn(),
  importJson: vi.fn(),
  previewImportDocument: vi.fn(),
  addRecentDoc: vi.fn(),
  saveFileDialog: vi.fn(),
  prepareNewDocumentPath: vi.fn(),
  refreshLibraryDoc: vi.fn(),
}))

const apiMock = vi.mocked(api)

describe('documentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    useDocumentStore.setState({
      currentDoc: null,
      viewMode: 'outline',
      selectedNodeId: null,
      collapsedNodeIds: new Set<string>(),
      isDirty: false,
      saveStatus: 'idle',
      currentFilePath: null,
      filter: { query: '', tag: null, checked: 'all' },
      focusedNodeId: null,
      focusRequestSeq: 0,
      canUndo: false,
      canRedo: false,
      undoStack: [],
      redoStack: [],
      cleanSnapshotKey: null,
      activeTextEditSession: null,
      outlineSelection: { anchorNodeId: null, selectedNodeIds: [] },
    })
    apiMock.refreshLibraryDoc.mockResolvedValue({
      documentId: 'doc-1',
      title: '测试文档',
      path: 'demo.siwei.json',
      updatedAt: 1,
      indexedAt: 1,
      nodeCount: 2,
      taskCount: 0,
      uncheckedTaskCount: 0,
      tags: [],
      status: 'ready',
    })
  })

  async function loadFixtureDoc(doc = createDocument()) {
    apiMock.loadDocument.mockResolvedValueOnce(doc)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    await useDocumentStore.getState().loadDoc('demo.siwei.json')
  }

  it('syncs collapsed node ids into the saved document tree', async () => {
    const doc = createDocument()
    useDocumentStore.setState({
      currentDoc: doc,
      collapsedNodeIds: new Set(['node-1']),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    const savedDoc = apiMock.saveDocument.mock.calls[0][1]
    expect(savedDoc.root.children[0].collapsed).toBe(true)
    expect(savedDoc.root.children[1].collapsed).toBe(false)
    expect(useDocumentStore.getState().isDirty).toBe(false)
    expect(apiMock.refreshLibraryDoc).toHaveBeenCalledWith('demo.siwei.json')
  })

  it('persists a user-created document directly into the default library', async () => {
    const doc = createDocument()
    apiMock.newDocument.mockResolvedValueOnce(doc)
    apiMock.prepareNewDocumentPath.mockResolvedValueOnce('/Documents/Siwei/测试文档.siwei.json')
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    await useDocumentStore.getState().newDoc()

    expect(apiMock.prepareNewDocumentPath).toHaveBeenCalledWith(doc.title)
    expect(apiMock.saveDocument).toHaveBeenCalledWith('/Documents/Siwei/测试文档.siwei.json', expect.any(Object))
    expect(apiMock.refreshLibraryDoc).toHaveBeenCalledWith('/Documents/Siwei/测试文档.siwei.json')
    expect(useDocumentStore.getState().currentFilePath).toBe('/Documents/Siwei/测试文档.siwei.json')
    expect(useDocumentStore.getState().isDirty).toBe(false)
  })

  it('keeps startup scratch documents out of the library until explicitly saved', async () => {
    const doc = createDocument()
    apiMock.newDocument.mockResolvedValueOnce(doc)

    await useDocumentStore.getState().newDoc({ persist: false })

    expect(apiMock.prepareNewDocumentPath).not.toHaveBeenCalled()
    expect(apiMock.saveDocument).not.toHaveBeenCalled()
    expect(useDocumentStore.getState().currentFilePath).toBeNull()
  })

  it('saves a pathless scratch document into the default library without opening save-as', async () => {
    useDocumentStore.setState({
      currentDoc: createDocument(),
      currentFilePath: null,
      isDirty: true,
    })
    apiMock.prepareNewDocumentPath.mockResolvedValueOnce('/Documents/Siwei/测试文档.siwei.json')
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    expect(apiMock.saveFileDialog).not.toHaveBeenCalled()
    expect(apiMock.saveDocument).toHaveBeenCalledWith('/Documents/Siwei/测试文档.siwei.json', expect.any(Object))
  })

  it('uses the save dialog only for explicit save-as', async () => {
    useDocumentStore.setState({
      currentDoc: createDocument(),
      currentFilePath: '/Documents/Siwei/测试文档.siwei.json',
      isDirty: false,
    })
    apiMock.saveFileDialog.mockResolvedValueOnce('D:/Notes/测试文档.siwei.json')
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDocAs()

    expect(saved).toBe(true)
    expect(apiMock.saveFileDialog).toHaveBeenCalledWith('测试文档.siwei.json')
    expect(apiMock.saveDocument).toHaveBeenCalledWith('D:/Notes/测试文档.siwei.json', expect.any(Object))
    expect(useDocumentStore.getState().currentFilePath).toBe('D:/Notes/测试文档.siwei.json')
  })

  it('keeps save successful when library index refresh fails', async () => {
    useDocumentStore.setState({
      currentDoc: createDocument(),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)
    apiMock.refreshLibraryDoc.mockRejectedValueOnce(new Error('索引刷新失败'))

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    expect(useDocumentStore.getState().saveStatus).toBe('saved')
  })

  it('does not change path or dirty state when save-as dialog is cancelled', async () => {
    useDocumentStore.setState({
      currentDoc: createDocument(),
      currentFilePath: null,
      isDirty: true,
    })
    apiMock.saveFileDialog.mockResolvedValueOnce(null)

    const saved = await useDocumentStore.getState().saveDocAs()

    expect(saved).toBe(false)
    expect(apiMock.saveDocument).not.toHaveBeenCalled()
    expect(useDocumentStore.getState().currentFilePath).toBeNull()
    expect(useDocumentStore.getState().isDirty).toBe(true)
  })

  it('keeps newer edits dirty when an older save finishes late', async () => {
    const originalDoc = createDocument()
    useDocumentStore.setState({
      currentDoc: originalDoc,
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockImplementationOnce(async () => {
      useDocumentStore.getState().updateNodeText('node-2', '保存期间的新编辑')
    })
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('保存期间的新编辑')
    expect(useDocumentStore.getState().isDirty).toBe(true)
  })

  it('undoes and redoes insert, delete, indent, move, check, and collapse edits', async () => {
    await loadFixtureDoc()

    const insertedId = useDocumentStore.getState().insertNode('node-2', '新增节点')
    expect(insertedId).toBeTruthy()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
      '新增节点',
    ])

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
    expect(useDocumentStore.getState().canRedo).toBe(true)

    useDocumentStore.getState().redo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
      '新增节点',
    ])

    useDocumentStore.getState().deleteNode(insertedId!)
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
      '新增节点',
    ])

    useDocumentStore.getState().indentNode('node-2')
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
      'node-2',
    ])
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-2',
      insertedId,
    ])

    useDocumentStore.getState().moveNode('node-2', 'up')
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-2',
      'node-1',
      insertedId,
    ])
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-2',
      insertedId,
    ])

    useDocumentStore.getState().toggleNodeCheck('node-2')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBe(false)
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBeUndefined()

    useDocumentStore.getState().toggleCollapse('node-1')
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(true)
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
  })

  it('expands nodes whose persisted collapsed flag was hydrated into collapsed state', async () => {
    const doc = createDocument()
    await loadFixtureDoc({
      ...doc,
      root: {
        ...doc.root,
        children: [
          {
            ...doc.root.children[0],
            collapsed: true,
          },
          doc.root.children[1],
        ],
      },
    })

    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(true)

    useDocumentStore.getState().toggleCollapse('node-1')

    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
    expect(useDocumentStore.getState().currentDoc?.root.children[0].collapsed).toBe(false)
  })

  it('commits mind map layout changes into dirty undoable document state', async () => {
    await loadFixtureDoc()

    useDocumentStore.getState().commitMindMapLayout({
      'node-1': { x: 120, y: 80 },
      'node-2': { x: 260, y: 80 },
    })

    expect(useDocumentStore.getState().currentDoc?.version).toBe(2)
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toEqual({
      engineVersion: 3,
      strategy: 'classic-dagre',
      nodes: {
        'node-1': { position: { x: 120, y: 80 }, source: 'auto', locked: false },
        'node-2': { position: { x: 260, y: 80 }, source: 'auto', locked: false },
      },
    })
    expect(useDocumentStore.getState().isDirty).toBe(true)
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toBeUndefined()

    useDocumentStore.getState().redo()
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1'].position).toEqual({ x: 120, y: 80 })
  })

  it('saves mind map layout and upgrades the document version', async () => {
    const doc = createDocument()
    useDocumentStore.setState({
      currentDoc: {
        ...doc,
        mindMapLayout: {
          engineVersion: 1,
          strategy: 'classic-dagre',
          nodes: {
            'node-1': { position: { x: 12, y: 34 }, source: 'manual', locked: true },
          },
        },
      },
      collapsedNodeIds: new Set<string>(),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    const savedDoc = apiMock.saveDocument.mock.calls[0][1]
    expect(savedDoc.version).toBe(2)
    expect(savedDoc.mindMapLayout?.nodes['node-1'].position).toEqual({ x: 12, y: 34 })
    expect(useDocumentStore.getState().isDirty).toBe(false)
  })

  it('saves relations as version three document data', async () => {
    const doc = createDocument()
    useDocumentStore.setState({
      currentDoc: {
        ...doc,
        relations: [{
          id: 'rel-1',
          sourceNodeId: 'node-1',
          targetNodeId: 'node-2',
          direction: 'one-way',
          label: '依赖',
          createdAt: 1,
          updatedAt: 1,
        }],
      },
      collapsedNodeIds: new Set<string>(),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    expect(await useDocumentStore.getState().saveDoc()).toBe(true)
    const savedDoc = apiMock.saveDocument.mock.calls[0][1]
    expect(savedDoc.version).toBe(3)
    expect(savedDoc.relations?.[0]).toMatchObject({ id: 'rel-1', label: '依赖' })
  })

  it('saves resolved document references as version four and prunes stale metadata', async () => {
    const doc = createDocument()
    doc.root.children[0].text = '参考 [[目标文档]]'
    useDocumentStore.setState({
      currentDoc: {
        ...doc,
        documentReferences: [
          {
            id: 'doc-ref-live',
            sourceNodeId: 'node-1',
            sourceOccurrence: 0,
            targetDocumentId: 'target-doc',
            targetPath: 'C:/docs/target.siwei.json',
            label: '目标文档',
            createdAt: 1,
            updatedAt: 1,
          },
          {
            id: 'doc-ref-stale',
            sourceNodeId: 'node-2',
            sourceOccurrence: 0,
            targetDocumentId: 'stale-doc',
            targetPath: 'C:/docs/stale.siwei.json',
            label: '已删除引用',
            createdAt: 1,
            updatedAt: 1,
          },
        ],
      },
      collapsedNodeIds: new Set<string>(),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    expect(await useDocumentStore.getState().saveDoc()).toBe(true)
    const savedDoc = apiMock.saveDocument.mock.calls[0][1]
    expect(savedDoc.version).toBe(4)
    expect(savedDoc.documentReferences).toHaveLength(1)
    expect(savedDoc.documentReferences?.[0]).toMatchObject({
      id: 'doc-ref-live',
      targetDocumentId: 'target-doc',
    })
  })

  it('cleans orphan layout records before saving', async () => {
    const doc = createDocument()
    useDocumentStore.setState({
      currentDoc: {
        ...doc,
        mindMapLayout: {
          engineVersion: 3,
          strategy: 'free-canvas',
          nodes: {
            root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
            'node-1': { position: { x: 12, y: 34 }, source: 'manual', locked: true },
            orphan: { position: { x: 999, y: 999 }, source: 'manual', locked: true },
          },
        },
      },
      collapsedNodeIds: new Set<string>(),
      currentFilePath: 'demo.siwei.json',
      isDirty: true,
    })
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    const saved = await useDocumentStore.getState().saveDoc()

    expect(saved).toBe(true)
    const savedDoc = apiMock.saveDocument.mock.calls[0][1]
    expect(savedDoc.mindMapLayout?.nodes.orphan).toBeUndefined()
    expect(savedDoc.mindMapLayout?.nodes['node-1']).toBeDefined()
  })

  it('loads legacy documents without a mind map layout field', async () => {
    await loadFixtureDoc({ ...createDocument(), version: 1 })

    expect(useDocumentStore.getState().currentDoc?.version).toBe(1)
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toBeUndefined()
    expect(useDocumentStore.getState().isDirty).toBe(false)
  })

  it('inserts a strict sibling after an expanded node with children', async () => {
    await loadFixtureDoc()

    const insertedId = useDocumentStore.getState().insertSiblingNode('node-1', '严格同级')

    expect(insertedId).toBeTruthy()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      insertedId,
      'node-2',
    ])
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
    ])
    expect(useDocumentStore.getState().selectedNodeId).toBe(insertedId)
    expect(useDocumentStore.getState().canUndo).toBe(true)
  })

  it('inserts a child node as the last child and expands the parent', async () => {
    await loadFixtureDoc()
    useDocumentStore.setState({ collapsedNodeIds: new Set(['node-1']) })

    const insertedId = useDocumentStore.getState().insertChildNode('node-1', '新增子节点')

    expect(insertedId).toBeTruthy()
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
      insertedId,
    ])
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
    expect(useDocumentStore.getState().selectedNodeId).toBe(insertedId)
    expect(useDocumentStore.getState().isDirty).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
    ])
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(true)
  })

  it('derives node operation state from the current tree position', async () => {
    await loadFixtureDoc()

    expect(useDocumentStore.getState().getNodeOperationState('root')).toEqual({
      canInsertSibling: false,
      canInsertChild: true,
      canDelete: false,
      canIndent: false,
      canOutdent: false,
      canMoveUp: false,
      canMoveDown: false,
      canToggleCollapse: true,
    })

    expect(useDocumentStore.getState().getNodeOperationState('node-2')).toEqual({
      canInsertSibling: true,
      canInsertChild: true,
      canDelete: true,
      canIndent: true,
      canOutdent: false,
      canMoveUp: true,
      canMoveDown: false,
      canToggleCollapse: false,
    })
  })

  it('moves a dragged node before a same-level sibling and records undo history', async () => {
    await loadFixtureDoc()

    useDocumentStore.getState().moveNodeToSibling('node-2', 'node-1')

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-2',
      'node-1',
    ])
    expect(useDocumentStore.getState().selectedNodeId).toBe('node-2')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-2',
    ])
  })

  it('moves a dragged node across different levels and records undo history', async () => {
    await loadFixtureDoc()

    useDocumentStore.getState().moveNodeToParent('node-1-1', 'root', 1)

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-1-1',
      'node-2',
    ])
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
    ])
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-2',
    ])
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
    ])
  })

  it('merges repeated text changes in one focus session into one undo record', async () => {
    await loadFixtureDoc()

    useDocumentStore.getState().beginTextEditSession('node-2')
    useDocumentStore.getState().updateNodeText('node-2', '第一版')
    useDocumentStore.getState().updateNodeText('node-2', '第二版')
    useDocumentStore.getState().commitTextEditSession('node-2')

    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('第二版')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()

    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('第二节点')
    expect(useDocumentStore.getState().canUndo).toBe(false)
    expect(useDocumentStore.getState().canRedo).toBe(true)
  })

  it('clears history after new, load, and import lifecycle actions', async () => {
    await loadFixtureDoc()
    useDocumentStore.getState().insertNode('node-2')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    apiMock.newDocument.mockResolvedValueOnce(createDocument())
    await useDocumentStore.getState().newDoc()
    expect(useDocumentStore.getState().canUndo).toBe(false)
    expect(useDocumentStore.getState().canRedo).toBe(false)

    useDocumentStore.getState().insertNode('node-2')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    await loadFixtureDoc()
    expect(useDocumentStore.getState().canUndo).toBe(false)
    expect(useDocumentStore.getState().canRedo).toBe(false)

    useDocumentStore.getState().insertNode('node-2')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    apiMock.importJson.mockResolvedValueOnce(createDocument())
    await useDocumentStore.getState().importDoc('import.siwei.json', 'json')
    expect(useDocumentStore.getState().canUndo).toBe(false)
    expect(useDocumentStore.getState().canRedo).toBe(false)
    expect(useDocumentStore.getState().isDirty).toBe(true)
  })

  it('marks the document clean when undo returns to the save point', async () => {
    await loadFixtureDoc()
    useDocumentStore.getState().updateNodeText('node-2', '保存点文本')
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    await useDocumentStore.getState().saveDoc()
    expect(useDocumentStore.getState().isDirty).toBe(false)

    useDocumentStore.getState().updateNodeText('node-2', '保存后的编辑')
    expect(useDocumentStore.getState().isDirty).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('保存点文本')
    expect(useDocumentStore.getState().isDirty).toBe(false)
  })

  it('updates note task and tags through history-aware node property actions', async () => {
    await loadFixtureDoc()

    useDocumentStore.getState().updateNodeNote('node-2', '  多行备注\n第二行  ')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].note).toBe('多行备注\n第二行')
    expect(useDocumentStore.getState().isDirty).toBe(true)

    useDocumentStore.getState().setNodeChecked('node-2', false)
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBe(false)

    useDocumentStore.getState().toggleNodeChecked('node-2')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBe(true)

    useDocumentStore.getState().setNodeTags('node-2', [' 工作 ', '', '重要', '工作'])
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['工作', '重要'])

    useDocumentStore.getState().addNodeTag('node-2', '新增')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['工作', '重要', '新增'])

    useDocumentStore.getState().removeNodeTag('node-2', '重要')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['工作', '新增'])

    useDocumentStore.getState().clearNodeNote('node-2')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].note).toBeUndefined()

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].note).toBe('多行备注\n第二行')
    useDocumentStore.getState().redo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].note).toBeUndefined()
  })

  it('applies an agent change plan as one undoable transaction', async () => {
    await loadFixtureDoc()
    const doc = useDocumentStore.getState().currentDoc!

    const result = useDocumentStore.getState().applyAgentChangePlan({
      schemaVersion: 1,
      contextScope: 'currentDocument',
      documentId: doc.id,
      snapshotKey: createDocumentSnapshotKey(doc),
      summary: '新增节点',
      rationale: '测试事务应用',
      riskLevel: 'low',
      references: [],
      operations: [
        {
          type: 'updateNode',
          nodeId: 'node-2',
          text: '助理改写',
        },
        {
          type: 'insertNode',
          parentNodeId: 'root',
          index: 2,
          node: {
            id: 'agent-node',
            text: '助理新增',
          },
        },
      ],
    })

    expect(result).toEqual({ ok: true })
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '助理改写',
      '助理新增',
    ])
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
  })

  it('lets the agent insert mind map nodes through a controlled document transaction', async () => {
    await loadFixtureDoc()
    const doc = useDocumentStore.getState().currentDoc!
    useDocumentStore.setState({ collapsedNodeIds: new Set(['node-1']) })

    const result = useDocumentStore.getState().insertAgentMindMapNodes({
      documentId: doc.id,
      snapshotKey: createDocumentSnapshotKey(doc),
      parentNodeId: 'node-1',
      nodes: [
        {
          text: 'AI 生成节点',
          note: '  说明  ',
          tags: [' 计划 ', '计划', ''],
          checked: false,
          children: [
            { text: '子节点' },
          ],
        },
      ],
    })

    expect(result.ok).toBe(true)
    const insertedId = result.ok ? result.insertedNodeIds[0] : ''
    const inserted = useDocumentStore.getState().currentDoc?.root.children[0].children[1]
    expect(inserted).toMatchObject({
      id: insertedId,
      text: 'AI 生成节点',
      note: '说明',
      tags: ['计划'],
      checked: false,
      children: [
        { text: '子节点' },
      ],
    })
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
    expect(useDocumentStore.getState().selectedNodeId).toBe(insertedId)
    expect(useDocumentStore.getState().isDirty).toBe(true)
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
    ])
  })

  it('rejects stale agent mind map tool requests without mutating the document', async () => {
    await loadFixtureDoc()

    const result = useDocumentStore.getState().insertAgentMindMapNodes({
      documentId: 'doc-1',
      snapshotKey: 'stale',
      parentNodeId: 'root',
      nodes: [{ text: '不应插入' }],
    })

    expect(result).toEqual({
      ok: false,
      error: '当前文档已变化，请让助理重新生成节点',
    })
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
    expect(useDocumentStore.getState().canUndo).toBe(false)
  })

  it('applies an import preview as a new unsaved document', async () => {
    const imported = createDocument()

    useDocumentStore.getState().applyImportPreview({
      document: imported,
      summary: {
        title: imported.title,
        nodeCount: 2,
        maxDepth: 2,
        taskCount: 0,
        tagCount: 0,
        noteCount: 0,
        warningCount: 0,
      },
      report: { items: [] },
    }, { mode: 'newDocument' })

    expect(useDocumentStore.getState().currentDoc?.id).toBe(imported.id)
    expect(useDocumentStore.getState().currentFilePath).toBeNull()
    expect(useDocumentStore.getState().isDirty).toBe(true)
    expect(useDocumentStore.getState().canUndo).toBe(false)
  })

  it('appends an import preview to the root as one undoable transaction', async () => {
    await loadFixtureDoc()
    const imported = {
      ...createDocument(),
      root: {
        ...createDocument().root,
        children: [
          createDocument().root.children[0],
          createDocument().root.children[1],
        ],
      },
    }

    useDocumentStore.getState().applyImportPreview({
      document: imported,
      summary: {
        title: imported.title,
        nodeCount: 2,
        maxDepth: 2,
        taskCount: 0,
        tagCount: 0,
        noteCount: 0,
        warningCount: 0,
      },
      report: { items: [] },
    }, { mode: 'appendToRoot' })

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
      '第一节点',
      '第二节点',
    ])
    expect(useDocumentStore.getState().selectedNodeId).not.toBe('node-1')
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
  })

  it('creates independent relations for every completed connection gesture', async () => {
    await loadFixtureDoc()

    const forwardId = useDocumentStore.getState().addRelation('node-1', 'node-2')
    const reverseId = useDocumentStore.getState().addRelation('node-2', 'node-1')

    expect(forwardId).toBeTruthy()
    expect(reverseId).toBeTruthy()
    expect(reverseId).not.toBe(forwardId)
    expect(useDocumentStore.getState().currentDoc?.relations).toEqual([
      expect.objectContaining({ id: forwardId, sourceNodeId: 'node-1', targetNodeId: 'node-2', direction: 'one-way' }),
      expect.objectContaining({ id: reverseId, sourceNodeId: 'node-2', targetNodeId: 'node-1', direction: 'one-way' }),
    ])
    expect(useDocumentStore.getState().currentDoc?.version).toBe(3)

    useDocumentStore.getState().updateRelation(forwardId!, { label: '依赖' })
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].label).toBe('依赖')

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].label).toBeUndefined()
  })

  it('persists the exact manual relation handles and swaps them when reversing', async () => {
    await loadFixtureDoc()

    const relationId = useDocumentStore.getState().addRelation('node-1', 'node-2', {
      sourceHandle: 'right',
      targetHandle: 'right',
    })!

    expect(useDocumentStore.getState().currentDoc?.relations?.[0]).toMatchObject({
      sourceHandle: 'right',
      targetHandle: 'right',
    })

    useDocumentStore.getState().reverseRelation(relationId)
    expect(useDocumentStore.getState().currentDoc?.relations?.[0]).toMatchObject({
      sourceNodeId: 'node-2',
      targetNodeId: 'node-1',
      sourceHandle: 'right',
      targetHandle: 'right',
    })
  })

  it('persists a relation curve offset as one undoable edit', async () => {
    await loadFixtureDoc()
    const relationId = useDocumentStore.getState().addRelation('node-1', 'node-2')!

    useDocumentStore.getState().updateRelation(relationId, { curveOffset: { x: 42, y: -18 } })

    expect(useDocumentStore.getState().currentDoc?.relations?.[0].curveOffset).toEqual({ x: 42, y: -18 })
    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].curveOffset).toBeUndefined()
  })

  it('rejects self links and missing relation endpoints without creating history', async () => {
    await loadFixtureDoc()

    expect(useDocumentStore.getState().addRelation('node-1', 'node-1')).toBeNull()
    expect(useDocumentStore.getState().addRelation('node-1', 'missing')).toBeNull()
    expect(useDocumentStore.getState().currentDoc?.relations).toBeUndefined()
    expect(useDocumentStore.getState().canUndo).toBe(false)
  })

  it('reverses and explicitly deletes a one-way relation with undo support', async () => {
    await loadFixtureDoc()
    const relationId = useDocumentStore.getState().addRelation('node-1', 'node-2')!

    useDocumentStore.getState().reverseRelation(relationId)
    expect(useDocumentStore.getState().currentDoc?.relations?.[0]).toMatchObject({
      sourceNodeId: 'node-2',
      targetNodeId: 'node-1',
      direction: 'one-way',
    })

    useDocumentStore.getState().deleteRelation(relationId)
    expect(useDocumentStore.getState().currentDoc?.relations).toBeUndefined()

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].sourceNodeId).toBe('node-2')
  })

  it('removes relations that touch a deleted subtree and restores them with undo', async () => {
    const doc = createDocument()
    doc.relations = [{
      id: 'rel-1',
      sourceNodeId: 'node-1-1',
      targetNodeId: 'node-2',
      direction: 'one-way',
      createdAt: 1,
      updatedAt: 1,
    }]
    await loadFixtureDoc(doc)

    useDocumentStore.getState().deleteNode('node-1')
    expect(useDocumentStore.getState().currentDoc?.relations).toBeUndefined()

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].id).toBe('rel-1')
  })

  it('remaps relations when appending imported nodes with fresh ids', async () => {
    await loadFixtureDoc()
    const imported = createDocument()
    imported.relations = [{
      id: 'import-rel',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      direction: 'two-way',
      label: '相关',
      createdAt: 1,
      updatedAt: 1,
    }]

    useDocumentStore.getState().applyImportPreview({
      document: imported,
      summary: {
        title: imported.title,
        nodeCount: 2,
        maxDepth: 2,
        taskCount: 0,
        tagCount: 0,
        noteCount: 0,
        warningCount: 0,
      },
      report: { items: [] },
    }, { mode: 'appendToRoot' })

    const relation = useDocumentStore.getState().currentDoc?.relations?.[0]
    expect(relation).toMatchObject({ direction: 'two-way', label: '相关' })
    expect(relation?.id).not.toBe('import-rel')
    expect(relation?.sourceNodeId).not.toBe('node-1')
    expect(relation?.targetNodeId).not.toBe('node-2')
  })

  it('appends an import preview to the selected node and expands it', async () => {
    await loadFixtureDoc()
    useDocumentStore.setState({
      selectedNodeId: 'node-1',
      collapsedNodeIds: new Set(['node-1']),
    })
    const imported = createDocument()

    useDocumentStore.getState().applyImportPreview({
      document: imported,
      summary: {
        title: imported.title,
        nodeCount: 1,
        maxDepth: 1,
        taskCount: 0,
        tagCount: 0,
        noteCount: 0,
        warningCount: 0,
      },
      report: { items: [] },
    }, { mode: 'appendToSelection' })

    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.text)).toEqual([
      '第一子节点',
      '第一节点',
      '第二节点',
    ])
    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
    expect(useDocumentStore.getState().canUndo).toBe(true)
  })

  it('rejects agent mind map tool requests with empty descendant titles', async () => {
    await loadFixtureDoc()
    const doc = useDocumentStore.getState().currentDoc!

    const result = useDocumentStore.getState().insertAgentMindMapNodes({
      documentId: doc.id,
      snapshotKey: createDocumentSnapshotKey(doc),
      parentNodeId: 'root',
      nodes: [
        {
          text: '父节点',
          children: [{ text: '   ' }],
        },
      ],
    })

    expect(result).toEqual({
      ok: false,
      error: 'Agent 工具请求包含空节点标题',
    })
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.text)).toEqual([
      '第一节点',
      '第二节点',
    ])
  })

  it('rejects stale agent change plans without mutating the document', async () => {
    await loadFixtureDoc()

    const result = useDocumentStore.getState().applyAgentChangePlan({
      schemaVersion: 1,
      contextScope: 'currentDocument',
      documentId: 'doc-1',
      snapshotKey: 'stale',
      summary: '过期计划',
      rationale: '测试过期保护',
      riskLevel: 'medium',
      references: [],
      operations: [
        {
          type: 'updateNode',
          nodeId: 'node-2',
          text: '不应应用',
        },
      ],
    })

    expect(result).toEqual({
      ok: false,
      error: '当前文档已变化，请让助理重新生成修改计划',
    })
    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('第二节点')
    expect(useDocumentStore.getState().canUndo).toBe(false)
  })

  it('renames removes and merges tags with history and dirty state', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await loadFixtureDoc({
      ...createDocument(),
      root: {
        ...createDocument().root,
        children: [
          {
            ...createDocument().root.children[0],
            tags: ['工作', '重要'],
            children: [
              {
                ...createDocument().root.children[0].children[0],
                tags: ['工作'],
              },
            ],
          },
          {
            ...createDocument().root.children[1],
            tags: ['生活', '工作'],
          },
        ],
      },
    })

    useDocumentStore.getState().setFilterTag('工作')
    useDocumentStore.getState().renameTag('工作', '项目')
    expect(useDocumentStore.getState().currentDoc?.root.children[0].tags).toEqual(['项目', '重要'])
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['生活', '项目'])
    expect(useDocumentStore.getState().filter.tag).toBe('项目')
    expect(useDocumentStore.getState().isDirty).toBe(true)
    expect(useDocumentStore.getState().canUndo).toBe(true)

    useDocumentStore.getState().removeTagFromDocument('重要')
    expect(confirmSpy).toHaveBeenLastCalledWith('确定从 1 个节点中删除标签「重要」吗？')
    expect(useDocumentStore.getState().currentDoc?.root.children[0].tags).toEqual(['项目'])

    useDocumentStore.getState().mergeTag('生活', '项目')
    expect(confirmSpy).toHaveBeenLastCalledWith('确定将 1 个节点中的「生活」合并为「项目」吗？')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['项目'])

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toEqual(['生活', '项目'])

    confirmSpy.mockRestore()
  })

  it('focuses a node by expanding ancestors, selecting it, and clearing transient highlight', async () => {
    await loadFixtureDoc()
    useDocumentStore.setState({ collapsedNodeIds: new Set(['node-1']) })

    useDocumentStore.getState().focusNode('node-1-1')

    expect(useDocumentStore.getState().collapsedNodeIds.has('node-1')).toBe(false)
    expect(useDocumentStore.getState().selectedNodeId).toBe('node-1-1')
    expect(useDocumentStore.getState().focusedNodeId).toBe('node-1-1')
    expect(useDocumentStore.getState().focusRequestSeq).toBe(1)

    vi.advanceTimersByTime(1600)
    expect(useDocumentStore.getState().focusedNodeId).toBeNull()
  })

  it('restores clean state when undoing property edits back to the save point', async () => {
    await loadFixtureDoc()
    apiMock.saveDocument.mockResolvedValueOnce(undefined)
    apiMock.addRecentDoc.mockResolvedValueOnce(undefined)

    await useDocumentStore.getState().saveDoc()
    expect(useDocumentStore.getState().isDirty).toBe(false)

    useDocumentStore.getState().addNodeTag('node-2', '工作')
    expect(useDocumentStore.getState().isDirty).toBe(true)

    useDocumentStore.getState().undo()
    expect(useDocumentStore.getState().currentDoc?.root.children[1].tags).toBeUndefined()
    expect(useDocumentStore.getState().isDirty).toBe(false)
  })

  it('keeps state unchanged when undo or redo has no history', async () => {
    await loadFixtureDoc()
    const initialDoc = useDocumentStore.getState().currentDoc

    useDocumentStore.getState().undo()
    useDocumentStore.getState().redo()

    expect(useDocumentStore.getState().currentDoc).toBe(initialDoc)
    expect(useDocumentStore.getState().canUndo).toBe(false)
    expect(useDocumentStore.getState().canRedo).toBe(false)
  })
})
