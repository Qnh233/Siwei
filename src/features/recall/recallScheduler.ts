export type RecallRating = 'forgot' | 'fuzzy' | 'remembered' | 'mastered'

export interface RecallMemoryState {
  documentId: string
  nodeId: string
  intervalHours: number
  difficulty: number
  reviews: number
  lapses: number
  lastReviewedAt: number
  nextReviewAt: number | null
  suspended: boolean
  lastRating: RecallRating
}

export interface RecallReviewInput {
  documentId: string
  nodeId: string
  rating: RecallRating
  reviewedAt: number
  assistanceLevel?: number
  previous?: RecallMemoryState | null
}

const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 10

export function scheduleRecallReview(input: RecallReviewInput): RecallMemoryState {
  const assistance = clamp(input.assistanceLevel ?? 0, 0, 3)
  const previous = input.previous ?? null
  const priorInterval = previous?.intervalHours ?? 0
  const priorDifficulty = previous?.difficulty ?? 5
  let intervalHours: number
  let difficulty: number
  let suspended = false
  let lapses = previous?.lapses ?? 0

  switch (input.rating) {
    case 'forgot':
      intervalHours = priorInterval > 0 ? clamp(priorInterval * 0.35, 4, 24) : 4
      difficulty = priorDifficulty + 0.8
      lapses += 1
      break
    case 'fuzzy':
      intervalHours = priorInterval > 0 ? Math.max(10, priorInterval * 1.18) : 10
      difficulty = priorDifficulty + 0.25
      break
    case 'remembered': {
      const growth = clamp(2.1 + (5 - priorDifficulty) * 0.12 - assistance * 0.18, 1.45, 2.75)
      intervalHours = priorInterval > 0 ? Math.max(36, priorInterval * growth) : Math.max(48, 72 - assistance * 12)
      difficulty = priorDifficulty - 0.18 + assistance * 0.05
      break
    }
    case 'mastered':
      intervalHours = priorInterval > 0 ? priorInterval : 24 * 30
      difficulty = priorDifficulty - 0.45
      suspended = true
      break
  }

  const normalizedInterval = Math.round(intervalHours * 100) / 100
  return {
    documentId: input.documentId,
    nodeId: input.nodeId,
    intervalHours: normalizedInterval,
    difficulty: Math.round(clamp(difficulty, MIN_DIFFICULTY, MAX_DIFFICULTY) * 100) / 100,
    reviews: (previous?.reviews ?? 0) + 1,
    lapses,
    lastReviewedAt: input.reviewedAt,
    nextReviewAt: suspended ? null : input.reviewedAt + normalizedInterval * 60 * 60 * 1000,
    suspended,
    lastRating: input.rating,
  }
}

export function isRecallDue(state: RecallMemoryState | null | undefined, now: number): boolean {
  if (!state) return true
  if (state.suspended || state.nextReviewAt === null) return false
  return state.nextReviewAt <= now
}

export function formatRecallInterval(hours: number): string {
  if (hours < 24) return `${Math.max(1, Math.round(hours))} 小时`
  const days = hours / 24
  if (days < 30) return `${Math.max(1, Math.round(days))} 天`
  return `${Math.max(1, Math.round(days / 30))} 个月`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
