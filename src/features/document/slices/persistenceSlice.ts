import type { OutlineDocument, OutlineNode } from '../../../types/document'
import * as api from '../../../services/siweiApi'
import { normalizeMindMapLayoutState } from '../../mindmap/mindMapLayoutState'
import {
  collectCollapsedIds,
  createSnapshot,
  getDocumentWithVersionForSave,
} from '../documentStoreHelpers'
import { cloneOutlineNodesWithRelationMap, remapNodeRelations } from '../nodeRelations'
import type { DocumentStoreContext } from '../documentStoreContext'
import type { DocumentState } from '../documentStoreTypes'
import { findPath, updateNodeAtPath } from '../../../utils/tree'
import { useRecentStore } from '../recentStore'

type PersistenceActions = Pick<
  DocumentState,
  | 'canDiscardCurrentDoc'
  | 'newDoc'
  | 'loadDoc'
  | 'saveDoc'
  | 'saveDocAs'
  | 'exportDoc'
  | 'importDoc'
  | 'applyImportPreview'
>

export function createPersistenceSlice(context: DocumentStoreContext): PersistenceActions {
  const { get, set, clearHistoryState, beginMutation, setHistoryAfterMutation } = context

  return {
    canDiscardCurrentDoc: () => {
      const { isDirty } = get()
      if (!isDirty) return true

      return window.confirm('当前文档有未保存的修改。确定要放弃这些修改吗？')
    },

    newDoc: async (options) => {
      const shouldPersist = options?.persist ?? true
      try {
        const doc = await api.newDocument()
        const collapsedIds = new Set<string>()
        collectCollapsedIds(doc.root, collapsedIds)

        const firstNodeId = doc.root.children.length > 0 ? doc.root.children[0].id : doc.root.id

        set({
          currentDoc: doc,
          currentFilePath: null,
          isDirty: shouldPersist,
          collapsedNodeIds: collapsedIds,
          selectedNodeId: firstNodeId,
          focusedNodeId: null,
          focusRequestSeq: 0,
          saveStatus: 'idle',
          ...clearHistoryState(doc, firstNodeId, collapsedIds, { isDirty: shouldPersist }),
        })

        if (shouldPersist) {
          const saved = await get().saveDoc()
          if (!saved) throw new Error('新建文档保存失败')
        }
      } catch (error) {
        console.error('Error creating new document:', error)
        throw error
      }
    },

    loadDoc: async (path) => {
      try {
        const doc = {
          ...await api.loadDocument(path),
        }
        doc.mindMapLayout = normalizeMindMapLayoutState(doc.mindMapLayout)
        const collapsedIds = new Set<string>()
        collectCollapsedIds(doc.root, collapsedIds)

        const firstNodeId = doc.root.children.length > 0 ? doc.root.children[0].id : doc.root.id

        set({
          currentDoc: doc,
          currentFilePath: path,
          isDirty: false,
          collapsedNodeIds: collapsedIds,
          selectedNodeId: firstNodeId,
          focusedNodeId: null,
          focusRequestSeq: 0,
          saveStatus: 'idle',
          ...clearHistoryState(doc, firstNodeId, collapsedIds, { isDirty: false }),
        })

        await useRecentStore.getState().addRecent({
          path,
          title: doc.title || '未命名文档',
          lastOpenedAt: Date.now(),
        })
      } catch (error) {
        set({ saveStatus: 'error' })
        throw error
      }
    },

    saveDoc: async (customPath = null) => {
      const state = get()
      if (!state.currentDoc) return false

      let path = customPath || state.currentFilePath
      if (!path) {
        path = await api.prepareNewDocumentPath(state.currentDoc.title || '未命名文档')
      }

      set({ saveStatus: 'saving' })
      try {
        const syncCollapsed = (node: OutlineNode): OutlineNode => {
          return {
            ...node,
            collapsed: state.collapsedNodeIds.has(node.id),
            children: node.children.map(syncCollapsed),
          }
        }

        const updatedDoc = getDocumentWithVersionForSave({
          ...state.currentDoc,
          root: syncCollapsed(state.currentDoc.root),
          updatedAt: Date.now(),
        })

        await api.saveDocument(path, updatedDoc)

        try {
          await api.refreshLibraryDoc(path)
        } catch (error) {
          console.error('Error refreshing library index after save:', error)
        }

        set((latestState) => {
          const cleanSnapshot = createSnapshot(updatedDoc, latestState.selectedNodeId, latestState.collapsedNodeIds)

          if (latestState.currentDoc !== state.currentDoc) {
            const latestSnapshot = latestState.currentDoc
              ? createSnapshot(latestState.currentDoc, latestState.selectedNodeId, latestState.collapsedNodeIds)
              : null

            return {
              currentFilePath: path,
              cleanSnapshotKey: cleanSnapshot.key,
              isDirty: latestSnapshot ? latestSnapshot.key !== cleanSnapshot.key : true,
              saveStatus: 'saved',
            }
          }

          return {
            currentDoc: updatedDoc,
            currentFilePath: path,
            cleanSnapshotKey: cleanSnapshot.key,
            isDirty: false,
            saveStatus: 'saved',
          }
        })

        await useRecentStore.getState().addRecent({
          path,
          title: updatedDoc.title || '未命名文档',
          lastOpenedAt: Date.now(),
        })

        setTimeout(() => {
          if (get().saveStatus === 'saved') {
            set({ saveStatus: 'idle' })
          }
        }, 3000)

        return true
      } catch (error) {
        console.error('Error saving document:', error)
        set({ saveStatus: 'error' })
        return false
      }
    },

    saveDocAs: async () => {
      const { currentDoc } = get()
      if (!currentDoc) return false

      const defaultName = `${currentDoc.title || '未命名文档'}.siwei.json`
      const path = await api.saveFileDialog(defaultName)
      if (!path) return false
      return get().saveDoc(path)
    },

    exportDoc: async (path, format) => {
      const { currentDoc, collapsedNodeIds } = get()
      if (!currentDoc) return

      const syncCollapsed = (node: OutlineNode): OutlineNode => {
        return {
          ...node,
          collapsed: collapsedNodeIds.has(node.id),
          children: node.children.map(syncCollapsed),
        }
      }

      const docToExport = {
        ...currentDoc,
        root: syncCollapsed(currentDoc.root),
      }

      switch (format) {
        case 'markdown':
          await api.exportMarkdown(path, docToExport)
          break
        case 'opml':
          await api.exportOpml(path, docToExport)
          break
        case 'html':
          await api.exportHtml(path, docToExport)
          break
        case 'text':
          await api.exportPlainText(path, docToExport)
          break
        case 'json':
        default:
          await api.exportJson(path, docToExport)
      }
    },

    importDoc: async (path, format) => {
      try {
        let doc: OutlineDocument
        if (format === 'markdown') {
          doc = await api.importMarkdown(path)
        } else {
          doc = await api.importJson(path)
        }
        doc = {
          ...doc,
          mindMapLayout: normalizeMindMapLayoutState(doc.mindMapLayout),
        }

        const collapsedIds = new Set<string>()
        collectCollapsedIds(doc.root, collapsedIds)
        const firstNodeId = doc.root.children.length > 0 ? doc.root.children[0].id : doc.root.id

        set({
          currentDoc: doc,
          currentFilePath: format === 'json' ? path : null,
          isDirty: true,
          collapsedNodeIds: collapsedIds,
          selectedNodeId: firstNodeId,
          focusedNodeId: null,
          saveStatus: 'idle',
          ...clearHistoryState(doc, firstNodeId, collapsedIds, { isDirty: true }),
        })
      } catch (error) {
        console.error('Error importing document:', error)
        throw error
      }
    },

    applyImportPreview: (preview, options) => {
      const importedDoc = {
        ...preview.document,
        mindMapLayout: normalizeMindMapLayoutState(preview.document.mindMapLayout),
      }

      if (options.mode === 'newDocument' || !get().currentDoc) {
        const collapsedIds = new Set<string>()
        collectCollapsedIds(importedDoc.root, collapsedIds)
        const firstNodeId = importedDoc.root.children.length > 0 ? importedDoc.root.children[0].id : importedDoc.root.id

        set({
          currentDoc: importedDoc,
          currentFilePath: null,
          isDirty: true,
          collapsedNodeIds: collapsedIds,
          selectedNodeId: firstNodeId,
          focusedNodeId: null,
          focusRequestSeq: 0,
          saveStatus: 'idle',
          ...clearHistoryState(importedDoc, firstNodeId, collapsedIds, { isDirty: true }),
        })
        return
      }

      const before = beginMutation()
      const { currentDoc, collapsedNodeIds, selectedNodeId } = get()
      if (!currentDoc || !before) return

      const now = Date.now()
      const cloned = cloneOutlineNodesWithRelationMap(importedDoc.root.children, now)
      const importedNodes = cloned.nodes
      if (importedNodes.length === 0) return
      const importedRelations = remapNodeRelations(importedDoc.relations, cloned.idMap, now)

      const importedCollapsedIds = new Set<string>()
      importedNodes.forEach((node) => collectCollapsedIds(node, importedCollapsedIds))
      const nextCollapsedIds = new Set([...collapsedNodeIds, ...importedCollapsedIds])
      const targetNodeId = options.mode === 'appendToSelection' && selectedNodeId
        ? selectedNodeId
        : currentDoc.root.id
      const targetPath = findPath(currentDoc.root, targetNodeId) ?? []
      nextCollapsedIds.delete(targetNodeId)

      const newRoot = updateNodeAtPath(currentDoc.root, targetPath, (targetNode) => ({
        ...targetNode,
        children: [...targetNode.children, ...importedNodes],
      }))
      const nextRelations = [...(currentDoc.relations ?? []), ...importedRelations]

      set({
        currentDoc: {
          ...currentDoc,
          root: newRoot,
          relations: nextRelations.length > 0 ? nextRelations : undefined,
          version: importedRelations.length > 0 ? Math.max(currentDoc.version, 3) : currentDoc.version,
          updatedAt: now,
        },
        collapsedNodeIds: nextCollapsedIds,
        selectedNodeId: importedNodes[0].id,
        focusedNodeId: importedNodes[0].id,
        focusRequestSeq: get().focusRequestSeq + 1,
        isDirty: true,
      })
      setHistoryAfterMutation(before)
    },
  }
}
