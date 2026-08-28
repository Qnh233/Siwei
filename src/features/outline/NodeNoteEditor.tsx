import React from 'react'
import { FileText } from 'lucide-react'

import { useDocumentStore } from '../document/documentStore'

interface NodeNoteEditorProps {
  nodeId: string
  note?: string
  showEmptyAction?: boolean
  readOnly?: boolean
  variant?: 'outline' | 'mindmap'
}

export const NodeNoteEditor: React.FC<NodeNoteEditorProps> = ({
  nodeId,
  note,
  showEmptyAction = false,
  readOnly = false,
  variant = 'outline',
}) => {
  const updateNodeNote = useDocumentStore((s) => s.updateNodeNote)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(note ?? '')

  React.useEffect(() => {
    if (!editing) setDraft(note ?? '')
  }, [editing, note])

  const commit = React.useCallback(() => {
    updateNodeNote(nodeId, draft)
    setEditing(false)
  }, [draft, nodeId, updateNodeNote])

  const cancel = React.useCallback(() => {
    setDraft(note ?? '')
    setEditing(false)
  }, [note])

  if (editing && !readOnly) {
    return (
      <div
        className={`nodrag nopan mt-1.5 border-l-2 border-amber-700/35 pl-2 ${variant === 'mindmap' ? 'text-left' : ''}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <textarea
          aria-label="节点注释"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Escape') {
              event.preventDefault()
              cancel()
              return
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          }}
          rows={variant === 'mindmap' ? 2 : 3}
          className={`w-full resize-none bg-transparent pr-1 text-zinc-600 outline-none placeholder:text-zinc-400 ${
            variant === 'mindmap'
              ? 'min-h-10 text-[10px] leading-[1.45]'
              : 'min-h-14 text-xs leading-relaxed'
          }`}
          placeholder="补充说明、出处或上下文…"
          autoFocus
        />
      </div>
    )
  }

  if (note?.trim()) {
    const content = (
      <div
        data-testid={`node-note-${nodeId}`}
        className={`whitespace-pre-wrap border-l-2 border-amber-700/30 pl-2 text-left text-zinc-500 [overflow-wrap:anywhere] ${
          variant === 'mindmap'
            ? 'mt-1.5 text-[10px] leading-[1.45]'
            : 'mt-1 text-[11px] leading-relaxed'
        }`}
      >
        {note}
      </div>
    )

    if (readOnly) return content

    return (
      <button
        type="button"
        aria-label="编辑注释"
        title="编辑注释"
        className="nodrag nopan block w-full cursor-text rounded-sm text-left outline-none transition hover:bg-amber-50/60 focus-visible:ring-1 focus-visible:ring-amber-300"
        onClick={(event) => {
          event.stopPropagation()
          setEditing(true)
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {content}
      </button>
    )
  }

  if (!showEmptyAction || readOnly) return null

  return (
    <button
      type="button"
      aria-label="添加注释"
      title="添加注释"
      className={`nodrag nopan mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-400 outline-none transition hover:bg-amber-50 hover:text-amber-800 focus-visible:ring-1 focus-visible:ring-amber-300 ${
        variant === 'mindmap' ? 'text-[9px]' : 'text-[10px]'
      }`}
      onClick={(event) => {
        event.stopPropagation()
        setEditing(true)
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <FileText size={variant === 'mindmap' ? 10 : 11} />
      注释
    </button>
  )
}
