import React from 'react'
import { findKeybindingCommand } from '../../app/keybindings/keybindingMatcher'
import { useSettingsStore } from '../settings/settingsStore'
import { useDocumentStore } from '../document/documentStore'
import { DocumentReferenceMenu } from '../references/DocumentReferenceMenu'
import { useDocumentReferenceAutocomplete } from '../references/useDocumentReferenceAutocomplete'
import type { LibraryDocumentItem } from '../../types/library'
import { EntityMentionMenu } from '../mentions/EntityMentionMenu'
import { useEntityMentionAutocomplete } from '../mentions/useEntityMentionAutocomplete'
import type { EntityMentionTarget } from '../mentions/entityMentions'

interface MindMapInlineEditorProps {
  nodeId: string
  value: string
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onDeleteEmpty: () => void
  onInsertSibling: () => void
  onInsertChild: () => void
  onIndent: () => void
  onOutdent: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleChecked: () => void
}

export const MindMapInlineEditor: React.FC<MindMapInlineEditorProps> = ({
  nodeId,
  value,
  onChange,
  onCommit,
  onCancel,
  onDeleteEmpty,
  onInsertSibling,
  onInsertChild,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  onToggleChecked,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const currentDocumentId = useDocumentStore((state) => state.currentDoc?.id ?? null)
  const insertDocumentReference = useDocumentStore((state) => state.insertDocumentReference)
  const insertEntityMention = useDocumentStore((state) => state.insertEntityMention)
  const referenceMenu = useDocumentReferenceAutocomplete(currentDocumentId)
  const mentionMenu = useEntityMentionAutocomplete()
  const isComposingRef = React.useRef(false)
  const [isComposing, setIsComposing] = React.useState(false)
  const [draftValue, setDraftValue] = React.useState(value)
  const [lastCommittedValue, setLastCommittedValue] = React.useState(value)

  React.useEffect(() => {
    if (!isComposing && value !== lastCommittedValue) {
      setDraftValue(value)
      setLastCommittedValue(value)
    }
  }, [isComposing, lastCommittedValue, value])

  React.useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commitDraft = React.useCallback((nextValue = draftValue) => {
    onChange(nextValue)
    setLastCommittedValue(nextValue)
    onCommit()
  }, [draftValue, onChange, onCommit])

  const selectDocumentReference = React.useCallback((item: LibraryDocumentItem) => {
    const query = referenceMenu.query
    if (!query) return
    if (!insertDocumentReference(nodeId, query.start, query.end, item)) return

    const syntax = `[[${item.title}]]`
    const nextValue = `${draftValue.slice(0, query.start)}${syntax}${draftValue.slice(query.end)}`
    const caret = query.start + syntax.length
    setDraftValue(nextValue)
    setLastCommittedValue(nextValue)
    referenceMenu.close()
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(caret, caret)
    })
  }, [draftValue, insertDocumentReference, nodeId, referenceMenu])

  const selectEntityMention = React.useCallback((item: EntityMentionTarget) => {
    const query = mentionMenu.query
    if (!query) return
    if (!insertEntityMention(nodeId, query.start, query.end, item)) return

    const syntax = `@${item.mentionText}`
    const nextValue = `${draftValue.slice(0, query.start)}${syntax}${draftValue.slice(query.end)}`
    const caret = query.start + syntax.length
    setDraftValue(nextValue)
    setLastCommittedValue(nextValue)
    mentionMenu.close()
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(caret, caret)
    })
  }, [draftValue, insertEntityMention, mentionMenu, nodeId])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (isComposingRef.current) return

    const mentionResult = mentionMenu.handleKeyDown(event)
    if (mentionResult === 'handled') return
    if (mentionResult) {
      selectEntityMention(mentionResult)
      return
    }

    const referenceResult = referenceMenu.handleKeyDown(event)
    if (referenceResult === 'handled') return
    if (referenceResult) {
      selectDocumentReference(referenceResult)
      return
    }

    const command = findKeybindingCommand(
      'mindmap',
      event,
      useSettingsStore.getState().settings.keybindings.overrides,
    )
    if (command) {
      event.preventDefault()
      switch (command.id) {
        case 'mindmap.insertSibling':
          onChange(draftValue)
          onInsertSibling()
          return
        case 'mindmap.insertChild':
          onChange(draftValue)
          onInsertChild()
          return
        case 'mindmap.indent':
          onIndent()
          return
        case 'mindmap.outdent':
          onOutdent()
          return
        case 'mindmap.moveUp':
          onMoveUp()
          return
        case 'mindmap.moveDown':
          onMoveDown()
          return
        case 'mindmap.toggleChecked':
          onToggleChecked()
          return
      }
    }

    switch (event.key) {
      case 'Backspace':
        if (draftValue.length === 0) {
          event.preventDefault()
          onDeleteEmpty()
        }
        break
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
    }
  }

  const keepMouseEventInsideEditor = (event: React.MouseEvent<HTMLInputElement>) => {
    event.stopPropagation()
  }

  return (
    <div className="relative w-full min-w-0">
      <input
        ref={inputRef}
        aria-label="编辑节点文本"
        className="nodrag nopan w-full min-w-0 rounded-md border border-amber-700/30 bg-white/80 px-2 py-1 text-center text-xs font-semibold leading-relaxed text-zinc-800 shadow-inner outline-none focus:border-amber-700"
        value={draftValue}
        placeholder="空白节点"
        onChange={(event) => {
          const nextValue = event.target.value
          setDraftValue(nextValue)
          const caret = event.target.selectionStart ?? nextValue.length
          const referenceQuery = referenceMenu.update(nextValue, caret)
          if (referenceQuery) {
            mentionMenu.close()
          } else {
            mentionMenu.update(nextValue, caret)
          }
          if (!isComposingRef.current) {
            onChange(nextValue)
            setLastCommittedValue(nextValue)
          }
        }}
        onBlur={() => commitDraft()}
        onCompositionStart={() => {
          isComposingRef.current = true
          setIsComposing(true)
        }}
        onCompositionEnd={(event) => {
          const committedValue = event.currentTarget.value
          isComposingRef.current = false
          setIsComposing(false)
          setDraftValue(committedValue)
          const caret = event.currentTarget.selectionStart ?? committedValue.length
          const referenceQuery = referenceMenu.update(committedValue, caret)
          if (referenceQuery) {
            mentionMenu.close()
          } else {
            mentionMenu.update(committedValue, caret)
          }
          onChange(committedValue)
          setLastCommittedValue(committedValue)
        }}
        onPointerDown={keepMouseEventInsideEditor}
        onMouseDown={keepMouseEventInsideEditor}
        onClick={keepMouseEventInsideEditor}
        onKeyDown={handleKeyDown}
      />
      {referenceMenu.query && (
        <DocumentReferenceMenu
          items={referenceMenu.items}
          activeIndex={referenceMenu.activeIndex}
          isLoading={referenceMenu.isLoading}
          onSelect={selectDocumentReference}
        />
      )}
      {mentionMenu.query && (
        <EntityMentionMenu
          items={mentionMenu.items}
          activeIndex={mentionMenu.activeIndex}
          onSelect={selectEntityMention}
        />
      )}
    </div>
  )
}
