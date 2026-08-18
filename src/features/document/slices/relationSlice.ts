import { generateId } from '../../../utils/id'
import { collectDocumentNodeIds, relationPairMatches } from '../nodeRelations'
import type { DocumentStoreContext } from '../documentStoreContext'
import type { DocumentState } from '../documentStoreTypes'

type RelationActions = Pick<DocumentState, 'addRelation' | 'updateRelation' | 'reverseRelation' | 'deleteRelation'>

export function createRelationSlice(context: DocumentStoreContext): RelationActions {
  const { get, set, beginMutation, setHistoryAfterMutation } = context

  return {
    addRelation: (sourceNodeId, targetNodeId) => {
      if (sourceNodeId === targetNodeId) return null
      const { currentDoc } = get()
      if (!currentDoc) return null
      const nodeIds = collectDocumentNodeIds(currentDoc.root)
      if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) return null
      const before = beginMutation()
      if (!before) return null

      const relations = currentDoc.relations ?? []
      const existing = relations.find((relation) => relationPairMatches(relation, sourceNodeId, targetNodeId))
      if (existing) {
        if (existing.direction === 'one-way' && existing.sourceNodeId === targetNodeId) {
          const now = Date.now()
          set({
            currentDoc: {
              ...currentDoc,
              relations: relations.map((relation) => relation.id === existing.id
                ? { ...relation, direction: 'two-way', updatedAt: now }
                : relation),
              updatedAt: now,
            },
            isDirty: true,
          })
          setHistoryAfterMutation(before)
        }
        return existing.id
      }

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
      if (label === relation.label && direction === relation.direction) return
      set({
        currentDoc: {
          ...currentDoc,
          relations: currentDoc.relations?.map((item) => item.id === relationId
            ? { ...item, label, direction, updatedAt: now }
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
            ? { ...item, sourceNodeId: item.targetNodeId, targetNodeId: item.sourceNodeId, updatedAt: now }
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
