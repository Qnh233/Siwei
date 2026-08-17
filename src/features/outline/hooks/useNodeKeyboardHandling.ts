import React from 'react'
import { toast } from '../../../components/common/Toast'
import { findKeybindingCommand } from '../../../app/keybindings/keybindingMatcher'
import { useSettingsStore } from '../../settings/settingsStore'
import type { SlashCommand } from './useSlashCommandMenu'

interface NodeKeyboardHandlingOptions {
  nodeId: string
  hasChildren: boolean
  isCollapsed: boolean
  isComposing: boolean
  isSlashMenuOpen: boolean
  activeSlashCommand: SlashCommand
  onSlashMenuNext: () => void
  onSlashMenuPrevious: () => void
  onSlashMenuClose: () => void
  onSlashCommand: (key: string) => void
  onSelectNone: () => void
  onUpdateText: (nodeId: string, text: string) => void
  onInsertNode: (nodeId: string, text?: string) => string | null
  onDeleteNode: (nodeId: string) => void
  onIndentNode: (nodeId: string) => void
  onOutdentNode: (nodeId: string) => void
  onMoveNode: (nodeId: string, direction: 'up' | 'down') => void
  onToggleCollapse: (nodeId: string) => void
  onToggleChecked: (nodeId: string) => void
  onNavigate: (direction: 'up' | 'down') => void
  onBatchMove?: (direction: 'up' | 'down') => boolean
  onBatchIndent?: () => boolean
  onBatchOutdent?: () => boolean
}

export function useNodeKeyboardHandling({
  nodeId,
  hasChildren,
  isCollapsed,
  isComposing,
  isSlashMenuOpen,
  activeSlashCommand,
  onSlashMenuNext,
  onSlashMenuPrevious,
  onSlashMenuClose,
  onSlashCommand,
  onSelectNone,
  onUpdateText,
  onInsertNode,
  onDeleteNode,
  onIndentNode,
  onOutdentNode,
  onMoveNode,
  onToggleCollapse,
  onToggleChecked,
  onNavigate,
  onBatchMove,
  onBatchIndent,
  onBatchOutdent,
}: NodeKeyboardHandlingOptions) {
  return React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return

    if (isSlashMenuOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onSlashMenuNext()
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        onSlashMenuPrevious()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        onSlashCommand(activeSlashCommand.key)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onSlashMenuClose()
        return
      }
    }

    const command = findKeybindingCommand(
      'outline',
      event,
      useSettingsStore.getState().settings.keybindings.overrides,
    )
    if (command) {
      event.preventDefault()
      event.stopPropagation()
      switch (command.id) {
        case 'outline.indent': {
          const moved = onBatchIndent?.()
          if (!moved) onIndentNode(nodeId)
          return
        }
        case 'outline.outdent': {
          const moved = onBatchOutdent?.()
          if (!moved) onOutdentNode(nodeId)
          return
        }
        case 'outline.moveUp': {
          const moved = onBatchMove?.('up')
          if (!moved) onMoveNode(nodeId, 'up')
          return
        }
        case 'outline.moveDown': {
          const moved = onBatchMove?.('down')
          if (!moved) onMoveNode(nodeId, 'down')
          return
        }
        case 'outline.toggleChecked':
          onToggleChecked(nodeId)
          return
      }
    }

    switch (event.key) {
      case 'Enter': {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        event.preventDefault()
        const target = event.currentTarget
        const selectionStart = target.selectionStart ?? 0
        const beforeText = target.value.substring(0, selectionStart)
        const afterText = target.value.substring(selectionStart)

        onUpdateText(nodeId, beforeText)
        onInsertNode(nodeId, afterText)
        break
      }
      case 'Backspace': {
        const target = event.currentTarget
        const selectionStart = target.selectionStart ?? 0
        const text = target.value

        if (text === '') {
          event.preventDefault()
          onDeleteNode(nodeId)
        } else if (selectionStart === 0) {
          event.preventDefault()
          onOutdentNode(nodeId)
        }
        break
      }
      case 'ArrowUp': {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        event.preventDefault()
        onNavigate('up')
        break
      }
      case 'ArrowDown': {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        event.preventDefault()
        onNavigate('down')
        break
      }
      case 'ArrowLeft': {
        if (event.ctrlKey || event.metaKey || event.altKey) {
          event.preventDefault()
          if (!hasChildren) {
            toast.info('当前节点没有可折叠内容')
            return
          }
          if (!isCollapsed) onToggleCollapse(nodeId)
        }
        break
      }
      case 'ArrowRight': {
        if (event.ctrlKey || event.metaKey || event.altKey) {
          event.preventDefault()
          if (!hasChildren) {
            toast.info('当前节点没有可折叠内容')
            return
          }
          if (isCollapsed) onToggleCollapse(nodeId)
        }
        break
      }
      case 'Escape': {
        event.preventDefault()
        onSelectNone()
        break
      }
      default:
        break
    }
  }, [
    activeSlashCommand.key,
    hasChildren,
    isCollapsed,
    isComposing,
    isSlashMenuOpen,
    nodeId,
    onBatchIndent,
    onBatchMove,
    onBatchOutdent,
    onDeleteNode,
    onIndentNode,
    onInsertNode,
    onMoveNode,
    onNavigate,
    onOutdentNode,
    onSelectNone,
    onSlashCommand,
    onSlashMenuClose,
    onSlashMenuNext,
    onSlashMenuPrevious,
    onToggleChecked,
    onToggleCollapse,
    onUpdateText,
  ])
}
