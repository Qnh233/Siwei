import React from 'react'
import { findKeybindingCommand } from '../../../app/keybindings/keybindingMatcher'
import { useSettingsStore } from '../../settings/settingsStore'
import type { NodeMenuAction } from '../../document/NodeContextMenu'

interface UseMindMapKeyboardShortcutsParams {
  selectedNodeId: string | null
  runAction: (nodeId: string, action: NodeMenuAction) => void
  startEditingWithText: (nodeId: string, text: string) => void
  closeContextMenu: () => void
  clearEditing: () => void
  selectNode: (nodeId: string | null) => void
}

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]'))
}

const isDirectTextInput = (event: React.KeyboardEvent): boolean => {
  return event.key.length === 1
    && event.key !== ' '
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !event.nativeEvent.isComposing
}

export function useMindMapKeyboardShortcuts({
  selectedNodeId,
  runAction,
  startEditingWithText,
  closeContextMenu,
  clearEditing,
  selectNode,
}: UseMindMapKeyboardShortcutsParams) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeContextMenu])

  return React.useCallback((event: React.KeyboardEvent) => {
    if (isTextInputTarget(event.target) || !selectedNodeId || event.nativeEvent.isComposing) return

    const command = findKeybindingCommand(
      'mindmap',
      event,
      useSettingsStore.getState().settings.keybindings.overrides,
    )
    if (command) {
      event.preventDefault()
      event.stopPropagation()
      switch (command.id) {
        case 'mindmap.insertSibling':
          runAction(selectedNodeId, 'insertSibling')
          return
        case 'mindmap.insertChild':
          runAction(selectedNodeId, 'insertChild')
          return
        case 'mindmap.indent':
          runAction(selectedNodeId, 'indent')
          return
        case 'mindmap.outdent':
          runAction(selectedNodeId, 'outdent')
          return
        case 'mindmap.moveUp':
          runAction(selectedNodeId, 'moveUp')
          return
        case 'mindmap.moveDown':
          runAction(selectedNodeId, 'moveDown')
          return
        case 'mindmap.toggleChecked':
          runAction(selectedNodeId, 'toggleChecked')
          return
      }
      return
    }

    if (isDirectTextInput(event)) {
      event.preventDefault()
      startEditingWithText(selectedNodeId, event.key)
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      event.stopPropagation()
      runAction(selectedNodeId, 'delete')
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeContextMenu()
      clearEditing()
      selectNode(null)
    }
  }, [clearEditing, closeContextMenu, runAction, selectNode, selectedNodeId, startEditingWithText])
}
