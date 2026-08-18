import { generateId } from '../../../utils/id'
import { collectDocumentNodeIds } from '../nodeRelations'
import type { DocumentStoreContext } from '../documentStoreContext'
import type { DocumentState } from '../documentStoreTypes'

type RelationActions = Pick<DocumentState, 'addRelation' | 'updateRelation' | 'reverseRelation' | 'deleteRelation'>

export function createRelationSlice(context: DocumentStoreContext): RelationActions {
  const { get, set, beginMutation, setHistoryAfterMutation } = context

  return {
    addRelation: (sourceNodeId, targetNodeId, options = {}) => {
      if (sourceNodeId === targetNodeId) return null
      const { currentDoc } = get()
      if (!currentDoc) return null
      const nodeIds = collectDocumentNodeIds(currentDoc.root)
      if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) return null
      const before = beginMutation()
      if (!before) return null

      const relations = currentDoc.relations ?? []
      const now = Date.now()
      const id = generateId()
      set({
        currentDoc: {
          ...currentDoc,
          version: Math.max(currentDoc.version, 3),
          relations: [...relations, {
            id,
            sourceNodeId,
            targetNodeId,
            sourceHandle: options.sourceHandle,
            targetHandle: options.targetHandle,
            curveOffset: options.curveOffset,
            direction: 'one-way',
            createdAt: now,
            updatedAt: now,
          }],
          updatedAt: now,
        },
        isDirty: true,
      })
      setHistoryAfterMutation(before)
      return id
    },

    updateRelation: (relationId, changes) => {
      const before = beginMutation()
      const { currentDoc } = get()
      if (!currentDoc || !before) return
      const relation = currentDoc.relations?.find((item) => item.id === relationId)
      if (!relation) return
      const now = Date.now()
      const label = changes.label === undefined ? relation.label : changes.label.trim() || undefined
      const direction = changes.direction ?? relation.direction
      const curveOffset = changes.curveOffset ?? relation.curveOffset
      const curveOffsetUnchanged = curveOffset?.x === relation.curveOffset?.x && curveOffset?.y === relation.curveOffset?.y
      if (label === relation.label && direction === relation.direction && curveOffsetUnchanged) return
      set({
        currentDoc: {
          ...currentDoc,
          relations: currentDoc.relations?.map((item) => item.id === relationId
            ? { ...item, label, direction, curveOffset, updatedAt: now }
            : item),
          updatedAt: now,
        },
        isDirty: true,
      })
      setHistoryAfterMutation(before)
    },

    reverseRelation: (relationId) => {
      const before = beginMutation()
      const { currentDoc } = get()
      if (!currentDoc || !before) return
      const relation = currentDoc.relations?.find((item) => item.id === relationId)
      if (!relation || relation.direction === 'two-way') return
      const now = Date.now()
      set({
        currentDoc: {
          ...currentDoc,
          relations: currentDoc.relations?.map((item) => item.id === relationId
            ? {
              ...item,
              sourceNodeId: item.targetNodeId,
              targetNodeId: item.sourceNodeId,
              sourceHandle: item.targetHandle,
              targetHandle: item.sourceHandle,
              updatedAt: now,
            }
            : item),
          updatedAt: now,
        },
        isDirty: true,
      })
      setHistoryAfterMutation(before)
    },

    deleteRelation: (relationId) => {
      const before = beginMutation()
      const { currentDoc } = get()
      if (!currentDoc || !before || !currentDoc.relations?.some((item) => item.id === relationId)) return
      const now = Date.now()
      const relations = currentDoc.relations.filter((item) => item.id !== relationId)
      set({
        currentDoc: {
          ...currentDoc,
          relations: relations.length > 0 ? relations : undefined,
          updatedAt: now,
        },
        isDirty: true,
      })
      setHistoryAfterMutation(before)
    },
  }
}
