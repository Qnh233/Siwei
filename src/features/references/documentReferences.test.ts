import { describe, expect, it } from 'vitest'

import type { DocumentReference } from '../../types/document'
import {
  insertDocumentReferenceText,
  pruneDocumentReferences,
  reconcileDocumentReferences,
} from './documentReferences'

const ref = (overrides: Partial<DocumentReference> = {}): DocumentReference => ({
  id: 'ref-1',
  sourceNodeId: 'node-1',
  sourceOccurrence: 0,
  targetDocumentId: 'doc-target',
  targetPath: 'C:/docs/target.siwei.json',
  label: '目标文档',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
})

describe('documentReferences', () => {
  it('inserts readable wiki syntax and shifts later reference occurrences', () => {
    const existing = ref({ id: 'ref-existing', label: '已有文档', sourceOccurrence: 0 })
    const result = insertDocumentReferenceText({
      text: '查看 [[已有文档]]',
      references: [existing],
      sourceNodeId: 'node-1',
      rangeStart: 0,
      rangeEnd: 0,
      target: {
        documentId: 'doc-new',
        title: '新文档',
        path: 'C:/docs/new.siwei.json',
      },
      now: 10,
      id: 'ref-new',
    })

    expect(result.text).toBe('[[新文档]]查看 [[已有文档]]')
    expect(result.references).toMatchObject([
      { id: 'ref-new', sourceOccurrence: 0, targetDocumentId: 'doc-new', label: '新文档' },
      { id: 'ref-existing', sourceOccurrence: 1, targetDocumentId: 'doc-target', label: '已有文档' },
    ])
  })

  it('preserves stable targets when normal text changes around references', () => {
    const existing = ref()
    expect(reconcileDocumentReferences('前缀 [[目标文档]] 后缀', [existing], 'node-1')).toEqual([existing])
  })

  it('drops metadata when its wiki reference is removed from the node text', () => {
    expect(reconcileDocumentReferences('已经删除引用', [ref()], 'node-1')).toEqual([])
  })

  it('prunes stale metadata across the whole tree before persistence', () => {
    const live = ref()
    const stale = ref({ id: 'ref-stale', sourceNodeId: 'node-2', label: '已删除引用' })
    const root = {
      id: 'root',
      text: 'Root',
      createdAt: 1,
      updatedAt: 1,
      children: [
        { id: 'node-1', text: '参考 [[目标文档]]', createdAt: 1, updatedAt: 1, children: [] },
        { id: 'node-2', text: '普通文本', createdAt: 1, updatedAt: 1, children: [] },
      ],
    }

    expect(pruneDocumentReferences([live, stale], root)).toEqual([live])
  })
})
