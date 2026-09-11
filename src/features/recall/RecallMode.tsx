import React from 'react'
import {
  ArrowLeft,
  BrainCircuit,
  ChevronRight,
  Eye,
  EyeOff,
  Lightbulb,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import type { OutlineDocument, OutlineNode } from '../../types/document'
import { useAgentStore } from '../agent/agentStore'
import { buildRecallExpandMessage, buildRecallExplainMessage, buildRecallHintMessage } from './recallCoach'
import { formatRecallInterval, scheduleRecallReview, type RecallMemoryState, type RecallRating } from './recallScheduler'
import { loadRecallMemoryState, saveRecallMemoryState } from './recallStorage'

interface Props {
  document: OutlineDocument
  initialNodeId?: string | null
  onClose: () => void
}

const RATINGS: Array<{ rating: RecallRating; label: string; hint: string; className: string }> = [
  {
    rating: 'forgot',
    label: '忘记',
    hint: '需要尽快再看一次',
    className: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    rating: 'fuzzy',
    label: '模糊',
    hint: '有印象，但不够完整',
    className: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    rating: 'remembered',
    label: '想起来了',
    hint: '基本能独立回忆',
    className: 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300',
  },
  {
    rating: 'mastered',
    label: '熟知',
    hint: '近期无需反复复习',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
]

const secondaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'

export const RecallMode: React.FC<Props> = ({ document, initialNodeId, onClose }) => {
  const setAgentOpen = useAgentStore((s) => s.setOpen)
  const sendMessage = useAgentStore((s) => s.sendMessage)
  const initial = React.useMemo(() => chooseTarget(document.root, initialNodeId), [document.root, initialNodeId])
  const [trail, setTrail] = React.useState<string[]>([initial.id])
  const [revealed, setRevealed] = React.useState(0)
  const [hints, setHints] = React.useState(0)
  const [memory, setMemory] = React.useState<RecallMemoryState | null>(null)
  const targetId = trail[trail.length - 1] ?? initial.id
  const target = React.useMemo(() => findNode(document.root, targetId) ?? document.root, [document.root, targetId])
  const allRevealed = target.children.length > 0 && revealed >= target.children.length
  const treeMinWidth = Math.max(720, target.children.length * 196)

  React.useEffect(() => {
    setRevealed(0)
    setHints(0)
    setMemory(loadRecallMemoryState(document.id, target.id))
  }, [document.id, target.id])

  const coach = (kind: 'hint' | 'explain' | 'expand') => {
    setAgentOpen(true)
    if (kind === 'hint') {
      const level = Math.min(3, hints + 1)
      setHints(level)
      void sendMessage(buildRecallHintMessage(target, level))
      return
    }
    void sendMessage(kind === 'explain' ? buildRecallExplainMessage(target) : buildRecallExpandMessage(target))
  }

  const rate = (rating: RecallRating) => {
    const next = scheduleRecallReview({
      documentId: document.id,
      nodeId: target.id,
      rating,
      reviewedAt: Date.now(),
      assistanceLevel: hints,
      previous: memory,
    })
    saveRecallMemoryState(next)
    setMemory(next)
  }

  const enterChild = (childId: string) => setTrail((ids) => [...ids, childId])
  const goBack = () => setTrail((ids) => (ids.length > 1 ? ids.slice(0, -1) : ids))

  return (
    <div data-testid="recall-mode" className="h-full overflow-y-auto bg-[#f5f6f8] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
              <BrainCircuit size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold">主动回忆</h1>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">演示模式</span>
              </div>
              <div className="mt-1 flex items-center gap-1 overflow-hidden text-xs text-zinc-500 dark:text-zinc-400">
                {trail.map((id, index) => {
                  const node = findNode(document.root, id)
                  if (!node) return null
                  return (
                    <React.Fragment key={id}>
                      {index > 0 && <ChevronRight size={12} className="shrink-0" />}
                      <span className={index === trail.length - 1 ? 'truncate font-medium text-zinc-700 dark:text-zinc-200' : 'truncate'}>{node.text}</span>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {trail.length > 1 && (
              <button type="button" className={secondaryButton} onClick={goBack}>
                <ArrowLeft size={15} />
                返回上一层
              </button>
            )}
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100" onClick={onClose}>
              <X size={16} />
              退出
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col pt-8">
          <section className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-200/80 bg-white px-6 py-6 text-center shadow-[0_12px_40px_rgba(24,24,27,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              当前回忆节点
              <span className="h-1 w-1 rounded-full bg-zinc-400" />
              <span>{target.children.length} 个直接子节点</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{target.text}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">先在脑中还原下面的分支，再选择逐个揭示。节点卡片会保留树的位置和下级数量，但不会提前显示答案。</p>
            {target.children.length > 0 && (
              <div className="mx-auto mt-5 max-w-sm">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>本层进度</span>
                  <span>{Math.min(revealed, target.children.length)} / {target.children.length} 已揭示</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-100" style={{ width: `${target.children.length ? Math.min(100, (revealed / target.children.length) * 100) : 0}%` }} />
                </div>
              </div>
            )}
          </section>

          {target.children.length > 0 ? (
            <>
              <div className="mx-auto h-8 w-px bg-zinc-300 dark:bg-zinc-700" />
              <section aria-label="回忆树" className="w-full overflow-x-auto pb-2">
                <div className="relative mx-auto" style={{ minWidth: `${treeMinWidth}px` }}>
                  {target.children.length > 1 && (
                    <div
                      className="absolute top-0 h-px bg-zinc-300 dark:bg-zinc-700"
                      style={{ left: `${50 / target.children.length}%`, right: `${50 / target.children.length}%` }}
                    />
                  )}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${target.children.length}, minmax(0, 1fr))` }}>
                    {target.children.map((child, index) => {
                      const isRevealed = index < revealed
                      return (
                        <div key={child.id} className="min-w-0">
                          <div className="mx-auto h-7 w-px bg-zinc-300 dark:bg-zinc-700" />
                          <article
                            data-testid={`recall-child-${index}`}
                            data-revealed={isRevealed ? 'true' : 'false'}
                            className={`mx-2 flex min-h-[150px] flex-col rounded-2xl border p-4 shadow-sm transition-all duration-200 ${isRevealed ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900' : 'border-dashed border-zinc-300 bg-white/55 dark:border-zinc-700 dark:bg-zinc-900/45'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${isRevealed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                {isRevealed ? '已揭示' : `节点 ${index + 1}`}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {child.children.length > 0 ? `${child.children.length} 个下级` : '叶子节点'}
                              </span>
                            </div>
                            <div className="flex flex-1 items-center justify-center py-5 text-center">
                              {isRevealed ? (
                                <p className="text-base font-semibold leading-6 text-zinc-900 dark:text-zinc-100">{child.text}</p>
                              ) : (
                                <div>
                                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                                    <EyeOff size={15} />
                                  </div>
                                  <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">尚未揭示</p>
                                </div>
                              )}
                            </div>
                            {isRevealed && child.children.length > 0 ? (
                              <button type="button" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white" onClick={() => enterChild(child.id)}>
                                进入下一层
                                <ChevronRight size={14} />
                              </button>
                            ) : (
                              <div className="h-9" aria-hidden="true" />
                            )}
                          </article>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>

              <section className="mx-auto mt-5 flex w-full max-w-4xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
                <button type="button" disabled={allRevealed} onClick={() => setRevealed((n) => Math.min(target.children.length, n + 1))} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
                  <Eye size={16} />
                  揭示一个
                </button>
                <button type="button" disabled={allRevealed} onClick={() => setRevealed(target.children.length)} className={secondaryButton}>
                  <Sparkles size={15} />
                  全部揭示
                </button>
                <button type="button" disabled={revealed === 0} onClick={() => setRevealed(0)} className={secondaryButton}>
                  <RotateCcw size={15} />
                  重新隐藏
                </button>
                <div className="mx-1 hidden h-6 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />
                <button type="button" onClick={() => coach('hint')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300">
                  <Lightbulb size={16} />
                  AI 提示{hints ? ` ${hints}/3` : ''}
                </button>
              </section>
            </>
          ) : (
            <section className="mx-auto mt-8 w-full max-w-xl rounded-3xl border border-dashed border-zinc-300 bg-white/60 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-sm font-medium">这是一个叶子节点</p>
              <p className="mt-2 text-sm text-zinc-500">没有下级内容可以继续回忆。</p>
            </section>
          )}

          {allRevealed && (
            <section className="mx-auto mt-7 w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_12px_36px_rgba(24,24,27,0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">这次回忆得怎么样？</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">选择最接近真实感受的一项，系统会据此调整下次复习间隔。</p>
                </div>
                {memory && (
                  <p className="mt-2 text-xs font-medium text-zinc-500 sm:mt-0">
                    {memory.suspended ? '已标记为熟知，暂停近期复习' : `建议约 ${formatRecallInterval(memory.intervalHours)} 后再复习`}
                  </p>
                )}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {RATINGS.map(({ rating, label, hint, className }) => (
                  <button
                    key={rating}
                    type="button"
                    aria-pressed={memory?.lastRating === rating}
                    onClick={() => rate(rating)}
                    className={`min-h-[76px] rounded-2xl border px-4 py-3 text-left transition ${className} ${memory?.lastRating === rating ? 'ring-2 ring-current ring-offset-2 ring-offset-white dark:ring-offset-zinc-900' : ''}`}
                  >
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs opacity-75">{hint}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <span className="mr-1 text-xs font-medium text-zinc-500">揭示后辅助</span>
                <button type="button" className={secondaryButton} onClick={() => coach('explain')}>
                  <BrainCircuit size={15} />
                  AI 解读
                </button>
                <button type="button" className={secondaryButton} onClick={() => coach('expand')}>
                  <Sparkles size={15} />
                  AI 扩展
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function chooseTarget(root: OutlineNode, id?: string | null): OutlineNode {
  const selected = id ? findNode(root, id) : null
  return selected?.children.length ? selected : root
}

function findNode(root: OutlineNode, id: string): OutlineNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}
