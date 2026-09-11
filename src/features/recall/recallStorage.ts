import type { RecallMemoryState } from './recallScheduler'

const STORAGE_KEY = 'siwei.recall.v1'

interface RecallStoreRecord {
  version: 1
  items: Record<string, RecallMemoryState>
}

const emptyStore = (): RecallStoreRecord => ({ version: 1, items: {} })

export function loadRecallMemoryState(documentId: string, nodeId: string): RecallMemoryState | null {
  const store = readStore()
  return store.items[keyOf(documentId, nodeId)] ?? null
}

export function saveRecallMemoryState(state: RecallMemoryState): void {
  const store = readStore()
  store.items[keyOf(state.documentId, state.nodeId)] = state
  writeStore(store)
}

export function listRecallMemoryStates(documentId?: string): RecallMemoryState[] {
  const items = Object.values(readStore().items)
  return documentId ? items.filter((item) => item.documentId === documentId) : items
}

function keyOf(documentId: string, nodeId: string): string {
  return `${documentId}:${nodeId}`
}

function readStore(): RecallStoreRecord {
  if (typeof window === 'undefined' || !window.localStorage) return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<RecallStoreRecord>
    if (parsed.version !== 1 || !parsed.items || typeof parsed.items !== 'object') return emptyStore()
    return { version: 1, items: parsed.items as Record<string, RecallMemoryState> }
  } catch {
    return emptyStore()
  }
}

function writeStore(store: RecallStoreRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // 学习状态写入失败不应阻断文档编辑或回忆流程。
  }
}
