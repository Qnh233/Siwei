import type { OutlineNode } from '../../../types/document'
import { generateId } from '../../../utils/id'
import {
  findPath,
  updateNodeAtPath,
} from '../../../utils/tree'
import {
  insertDocumentReferenceText,
  reconcileDocumentReferences,
} from '../../references/documentReferences'
import {
  insertEntityMentionText,
  reconcileEntityMentions,
} from '../../mentions/entityMentions'
import { createSnapshot } from '../documentStoreHelpers'
import type { DocumentStoreContext } from '../documentStoreContext'
import type { DocumentState } from '../documentStoreTypes'

type TreeTextActions = Pick<
  DocumentState,
  'updateNodeText' | 'insertDocumentReference' | 'insertEntityMention' | 'toggleCollapse'
>

export function createTreeTextSlice(context: DocumentStoreContext): TreeTextActions {
  const { get, set, beginMutation, setHistoryAfterMutation } = context

  return {
    updateNodeText: (nodeId, text) => {
      const { currentDoc } = get()
      if (!currentDoc) return
      const activeSession = get().activeTextEditSession
      const shouldRecordImmediately = activeSession?.nodeId !== nodeId
      const before = shouldRecordImmediately ? beginMutation() : null

      const now = Date.now()

      if (currentDoc.root.id === nodeId) {
        if (currentDoc.root.text === text && currentDoc.title === text) return

        const nodeReferences = reconcileDocumentReferences(text, currentDoc.documentReferences, nodeId)
        const documentReferences = [
          ...(currentDoc.documentReferences ?? []).filter((reference) => reference.sourceNodeId !== nodeId),
          ...nodeReferences,
        ]
        const nodeMentions = reconcileEntityMentions(text, currentDoc.entityMentions, nodeId)
        const entityMentions = [
          ...(currentDoc.entityMentions ?? []).filter((mention) => mention.sourceNodeId !== nodeId),
          ...nodeMentions,
        ]

        const updatedDoc = {
          ...currentDoc,
          title: text,
          updatedAt: now,
          documentReferences,
          entityMentions,
          root: {
            ...currentDoc.root,
            text,
            updatedAt: now,
          },
        }
        set((state) => ({
          currentDoc: updatedDoc,
          isDirty: state.cleanSnapshotKey === null
            ? true
            : createSnapshot(updatedDoc, state.selectedNodeId, state.collapsedNodeIds).key !== state.cleanSnapshotKey,
          activeTextEditSession: state.activeTextEditSession?.nodeId === nodeId
            ? { ...state.activeTextEditSession, didChange: true }
            : state.activeTextEditSession,
          canUndo: state.activeTextEditSession?.nodeId === nodeId ? true : state.canUndo,
          canRedo: state.activeTextEditSession?.nodeId === nodeId ? false : state.canRedo,
        }))
        if (before) setHistoryAfterMutation(before)
        return
      }

      const path = findPath(currentDoc.root, nodeId)
      if (!path) return

      let currentNode: OutlineNode = currentDoc.root
      for (const idx of path) {
        currentNode = currentNode.children[idx]
      }
      if (currentNode.text === text) return

      const nodeReferences = reconcileDocumentReferences(text, currentDoc.documentReferences, nodeId)
      const documentReferences = [
        ...(currentDoc.documentReferences ?? []).filter((reference) => reference.sourceNodeId !== nodeId),
        ...nodeReferences,
      ]
      const nodeMentions = reconcileEntityMentions(text, currentDoc.entityMentions, nodeId)
      const entityMentions = [
        ...(currentDoc.entityMentions ?? []).filter((mention) => mention.sourceNodeId !== nodeId),
        ...nodeMentions,
      ]

      const newRoot = updateNodeAtPath(currentDoc.root, path, (node) => ({
        ...node,
        text,
        updatedAt: now,
      }))

      const updatedDoc = {
        ...currentDoc,
        root: newRoot,
        documentReferences,
        entityMentions,
        updatedAt: now,
      }

      set((state) => ({
        currentDoc: updatedDoc,
        isDirty: state.cleanSnapshotKey === null
          ? true
          : createSnapshot(updatedDoc, state.selectedNodeId, state.collapsedNodeIds).key !== state.cleanSnapshotKey,
        activeTextEditSession: state.activeTextEditSession?.nodeId === nodeId
          ? { ...state.activeTextEditSession, didChange: true }
          : state.activeTextEditSession,
        canUndo: state.activeTextEditSession?.nodeId === nodeId ? true : state.canUndo,
        canRedo: state.activeTextEditSession?.nodeId === nodeId ? false : state.canRedo,
      }))
      if (before) setHistoryAfterMutation(before)
    },

    insertDocumentReference: (nodeId, rangeStart, rangeEnd, target) => {
      const { currentDoc } = get()
      if (!currentDoc) return null
      const path = currentDoc.root.id === nodeId ? [] : findPath(currentDoc.root, nodeId)
      if (path === null) return null

      let currentNode = currentDoc.root
      for (const index of path) currentNode = currentNode.children[index]

      const now = Date.now()
      const referenceId = generateId()
      const nodeReferences = (currentDoc.documentReferences ?? []).filter(
        (reference) => reference.sourceNodeId === nodeId,
      )
      const inserted = insertDocumentReferenceText({
        text: currentNode.text,
        references: nodeReferences,
        sourceNodeId: nodeId,
        rangeStart,
        rangeEnd,
        target,
        now,
        id: referenceId,
      })
      const before = get().activeTextEditSession?.nodeId === nodeId ? null : beginMutation()
      const nextRoot = path.length === 0
        ? { ...currentDoc.root, text: inserted.text, updatedAt: now }
        : updateNodeAtPath(currentDoc.root, path, (node) => ({ ...node, text: inserted.text, updatedAt: now }))
      const updatedDoc = {
        ...currentDoc,
        title: path.length === 0 ? inserted.text : currentDoc.title,
        root: nextRoot,
        documentReferences: [
          ...(currentDoc.documentReferences ?? []).filter((reference) => reference.sourceNodeId !== nodeId),
          ...inserted.references,
        ],
        updatedAt: now,
      }

      set((state) => ({
        currentDoc: updatedDoc,
        isDirty: state.cleanSnapshotKey === null
          ? true
          : createSnapshot(updatedDoc, state.selectedNodeId, state.collapsedNodeIds).key !== state.cleanSnapshotKey,
        activeTextEditSession: state.activeTextEditSession?.nodeId === nodeId
          ? { ...state.activeTextEditSession, didChange: true }
          : state.activeTextEditSession,
        canUndo: state.activeTextEditSession?.nodeId === nodeId ? true : state.canUndo,
        canRedo: state.activeTextEditSession?.nodeId === nodeId ? false : state.canRedo,
      }))
      if (before) setHistoryAfterMutation(before)
      return referenceId
    },

    insertEntityMention: (nodeId, rangeStart, rangeEnd, target) => {
      const { currentDoc } = get()
      if (!currentDoc) return null
      const path = currentDoc.root.id === nodeId ? [] : findPath(currentDoc.root, nodeId)
      if (path === null) return null

      let currentNode = currentDoc.root
      for (const index of path) currentNode = currentNode.children[index]

      const now = Date.now()
      const mentionId = generateId()
      const nodeMentions = (currentDoc.entityMentions ?? []).filter(
        (mention) => mention.sourceNodeId === nodeId,
      )
      const inserted = insertEntityMentionText({
        text: currentNode.text,
        mentions: nodeMentions,
        sourceNodeId: nodeId,
        rangeStart,
        rangeEnd,
        target,
        now,
        id: mentionId,
      })
      const before = get().activeTextEditSession?.nodeId === nodeId ? null : beginMutation()
      const nextRoot = path.length === 0
        ? { ...currentDoc.root, text: inserted.text, updatedAt: now }
        : updateNodeAtPath(currentDoc.root, path, (node) => ({ ...node, text: inserted.text, updatedAt: now }))
      const updatedDoc = {
        ...currentDoc,
        title: path.length === 0 ? inserted.text : currentDoc.title,
        root: nextRoot,
        entityMentions: [
          ...(currentDoc.entityMentions ?? []).filter((mention) => mention.sourceNodeId !== nodeId),
          ...inserted.mentions,
        ],
        updatedAt: now,
      }

      set((state) => ({
        currentDoc: updatedDoc,
        isDirty: state.cleanSnapshotKey === null
          ? true
          : createSnapshot(updatedDoc, state.selectedNodeId, state.collapsedNodeIds).key !== state.cleanSnapshotKey,
        activeTextEditSession: state.activeTextEditSession?.nodeId === nodeId
          ? { ...state.activeTextEditSession, didChange: true }
          : state.activeTextEditSession,
        canUndo: state.activeTextEditSession?.nodeId === nodeId ? true : state.canUndo,
        canRedo: state.activeTextEditSession?.nodeId === nodeId ? false : state.canRedo,
      }))
      if (before) setHistoryAfterMutation(before)
      return mentionId
    },

    toggleCollapse: (nodeId) => {
      const { currentDoc, collapsedNodeIds } = get()
      if (!currentDoc) return

      const path = findPath(currentDoc.root, nodeId)
      if (!path) return

      let targetNode: OutlineNode = currentDoc.root
      for (const idx of path) {
        targetNode = targetNode.children[idx]
      }

      // 旧文件会把折叠态存到节点字段中；点击时必须按实际折叠态反转，并同步运行时集合与节点字段。
      const nextCollapsed = !Boolean(targetNode.collapsed || collapsedNodeIds.has(nodeId))
      const before = beginMutation()
      if (!before) return
      const now = Date.now()
      const updatedRoot = updateNodeAtPath(currentDoc.root, path, (node) => ({
        ...node,
        collapsed: nextCollapsed,
        updatedAt: now,
      }))
      const updatedDoc = {
        ...currentDoc,
        root: updatedRoot,
        updatedAt: now,
      }

      set((state) => {
        const newCollapsed = new Set(state.collapsedNodeIds)
        if (nextCollapsed) {
          newCollapsed.add(nodeId)
        } else {
          newCollapsed.delete(nodeId)
        }
        return {
          currentDoc: updatedDoc,
          collapsedNodeIds: newCollapsed,
          isDirty: true,
        }
      })
      setHistoryAfterMutation(before)
    },
  }
}
