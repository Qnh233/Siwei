import React from 'react'
import { ArrowLeftRight, Trash2, X } from 'lucide-react'
import type { NodeRelation, NodeRelationDirection } from '../../types/document'

interface MindMapRelationEditorProps {
  relation: NodeRelation
  sourceLabel: string
  targetLabel: string
  onUpdate: (changes: { label?: string; direction?: NodeRelationDirection }) => void
  onReverse: () => void
  onDelete: () => void
  onClose: () => void
}

export const MindMapRelationEditor: React.FC<MindMapRelationEditorProps> = ({
  relation,
  sourceLabel,
  targetLabel,
  onUpdate,
  onReverse,
  onDelete,
  onClose,
}) => {
  const [label, setLabel] = React.useState(relation.label ?? '')

  React.useEffect(() => {
    setLabel(relation.label ?? '')
  }, [relation.id, relation.label])

  const commitLabel = () => {
    if (label.trim() !== (relation.label ?? '')) onUpdate({ label })
  }

  return (
    <div
      role="dialog"
      aria-label="编辑节点关联"
      className="absolute right-4 top-4 z-20 w-72 rounded-lg border border-teal-800/15 bg-[#FFFCF5]/95 p-3 shadow-fabric backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs font-semibold text-zinc-800">
          <span className="truncate">{sourceLabel || '空白节点'}</span>
          <span className="mx-1 text-teal-700">{relation.direction === 'two-way' ? '↔' : '→'}</span>
          <span className="truncate">{targetLabel || '空白节点'}</span>
        </div>
        <button type="button" aria-label="关闭关联编辑" onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        value={label}
        placeholder="关系标注（可选）"
        onChange={(event) => setLabel(event.target.value)}
        onBlur={commitLabel}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            commitLabel()
            event.currentTarget.blur()
          }
        }}
        className="mb-3 h-8 w-full rounded-md border border-teal-900/10 bg-white px-2 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-teal-200"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onUpdate({ direction: 'one-way' })}
          className={`rounded-md px-2 py-1 text-xs ${relation.direction === 'one-way' ? 'bg-teal-100 text-teal-800' : 'bg-zinc-100 text-zinc-600'}`}
        >
          单向
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ direction: 'two-way' })}
          className={`rounded-md px-2 py-1 text-xs ${relation.direction === 'two-way' ? 'bg-teal-100 text-teal-800' : 'bg-zinc-100 text-zinc-600'}`}
        >
          双向
        </button>
        <button
          type="button"
          disabled={relation.direction === 'two-way'}
          onClick={onReverse}
          className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 disabled:opacity-35"
        >
          <ArrowLeftRight className="h-3 w-3" />
          反转
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-3 w-3" />
          删除
        </button>
      </div>
    </div>
  )
}
