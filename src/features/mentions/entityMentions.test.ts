import { describe, expect, it } from 'vitest'

import type { EntityMention } from '../../types/document'
import {
  BUILTIN_ENTITY_MENTION_TARGETS,
  extractEntityMentionTexts,
  findEntityMentionQuery,
  insertEntityMentionText,
  pruneEntityMentions,
  reconcileEntityMentions,
  searchEntityMentionTargets,
} from './entityMentions'

const mention = (overrides: Partial<EntityMention> = {}): EntityMention => ({
  id: 'mention-1',
  sourceNodeId: 'node-1',
  sourceOccurrence: 0,
  kind: 'agent',
  targetId: 'siwei-agent',
  mentionText: 'SiweiAgent',
  label: 'Siwei Agent',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
})

describe('entityMentions', () => {
  it('finds mention queries at token boundaries but ignores email addresses', () => {
    expect(findEntityMentionQuery('@Siw', 4)).toEqual({ start: 0, end: 4, query: 'Siw' })
    expect(findEntityMentionQuery('交给 @Siw', 7)).toEqual({ start: 3, end: 7, query: 'Siw' })
    expect(findEntityMentionQuery('dev@example.com', 15)).toBeNull()
  })

  it('extracts mention syntax without treating email addresses as mentions', () => {
    expect(extractEntityMentionTexts('请 @SiweiAgent 处理，邮箱 dev@example.com')).toEqual(['SiweiAgent'])
    expect(extractEntityMentionTexts('@SiweiAgent稍后处理')).toEqual(['SiweiAgent'])
  })

  it('searches the local target registry by label, syntax, and aliases', () => {
    expect(searchEntityMentionTargets('智能体')).toEqual(BUILTIN_ENTITY_MENTION_TARGETS)
    expect(searchEntityMentionTargets('siweiagent')).toEqual(BUILTIN_ENTITY_MENTION_TARGETS)
    expect(searchEntityMentionTargets('missing')).toEqual([])
  })

  it('inserts readable syntax and shifts later mention occurrences', () => {
    const existing = mention({ id: 'mention-existing', sourceOccurrence: 0 })
    const result = insertEntityMentionText({
      text: '稍后 @SiweiAgent',
      mentions: [existing],
      sourceNodeId: 'node-1',
      rangeStart: 0,
      rangeEnd: 0,
      target: BUILTIN_ENTITY_MENTION_TARGETS[0],
      now: 10,
      id: 'mention-new',
    })

    expect(result.text).toBe('@SiweiAgent稍后 @SiweiAgent')
    expect(result.mentions).toMatchObject([
      { id: 'mention-new', sourceOccurrence: 0, targetId: 'siwei-agent' },
      { id: 'mention-existing', sourceOccurrence: 1, targetId: 'siwei-agent' },
    ])
  })

  it('preserves stable targets while surrounding text changes and drops stale metadata', () => {
    const existing = mention()
    expect(reconcileEntityMentions('前缀 @SiweiAgent 后缀', [existing], 'node-1')).toEqual([existing])
    expect(reconcileEntityMentions('已经删除 mention', [existing], 'node-1')).toEqual([])
  })

  it('prunes stale mention metadata across the tree before persistence', () => {
    const live = mention()
    const stale = mention({ id: 'stale', sourceNodeId: 'node-2' })
    const root = {
      id: 'root',
      text: 'Root',
      createdAt: 1,
      updatedAt: 1,
      children: [
        { id: 'node-1', text: '交给 @SiweiAgent', createdAt: 1, updatedAt: 1, children: [] },
        { id: 'node-2', text: '普通文本', createdAt: 1, updatedAt: 1, children: [] },
      ],
    }

    expect(pruneEntityMentions([live, stale], root)).toEqual([live])
  })
})
