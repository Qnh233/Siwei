import { describe, expect, it } from 'vitest'
import { isRecallDue, scheduleRecallReview } from './recallScheduler'

const NOW = 1_700_000_000_000

function first(rating: 'forgot' | 'fuzzy' | 'remembered' | 'mastered', assistanceLevel = 0) {
  return scheduleRecallReview({
    documentId: 'doc-1',
    nodeId: 'node-1',
    rating,
    assistanceLevel,
    reviewedAt: NOW,
  })
}

describe('recallScheduler', () => {
  it('brings forgotten knowledge back into a short review window', () => {
    const state = first('forgot')
    expect(state.intervalHours).toBe(4)
    expect(state.lapses).toBe(1)
    expect(state.difficulty).toBeGreaterThan(5)
    expect(state.nextReviewAt).toBe(NOW + 4 * 60 * 60 * 1000)
  })

  it('grows the interval after successful recall', () => {
    const firstPass = first('remembered')
    const secondPass = scheduleRecallReview({
      documentId: 'doc-1',
      nodeId: 'node-1',
      rating: 'remembered',
      reviewedAt: NOW + firstPass.intervalHours * 60 * 60 * 1000,
      previous: firstPass,
    })
    expect(firstPass.intervalHours).toBe(72)
    expect(secondPass.intervalHours).toBeGreaterThan(firstPass.intervalHours)
    expect(secondPass.reviews).toBe(2)
  })

  it('uses AI assistance as a reason to grow the next interval more conservatively', () => {
    const prior = first('remembered')
    const withoutHelp = scheduleRecallReview({
      documentId: 'doc-1', nodeId: 'node-1', rating: 'remembered', reviewedAt: NOW, previous: prior,
    })
    const withHelp = scheduleRecallReview({
      documentId: 'doc-1', nodeId: 'node-1', rating: 'remembered', reviewedAt: NOW, previous: prior, assistanceLevel: 3,
    })
    expect(withHelp.intervalHours).toBeLessThan(withoutHelp.intervalHours)
  })

  it('suspends mastered knowledge instead of assigning another fixed review date', () => {
    const state = first('mastered')
    expect(state.suspended).toBe(true)
    expect(state.nextReviewAt).toBeNull()
    expect(isRecallDue(state, NOW + 365 * 24 * 60 * 60 * 1000)).toBe(false)
  })

  it('treats unseen knowledge as due and respects scheduled due times', () => {
    expect(isRecallDue(null, NOW)).toBe(true)
    const state = first('fuzzy')
    expect(isRecallDue(state, NOW + 9 * 60 * 60 * 1000)).toBe(false)
    expect(isRecallDue(state, NOW + 10 * 60 * 60 * 1000)).toBe(true)
  })
})
