import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '../../../types/settings'
import { useSettingsStore } from '../../settings/settingsStore'
import { useNodeKeyboardHandling } from './useNodeKeyboardHandling'

describe('useNodeKeyboardHandling', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('uses customized outline bindings instead of the old default', () => {
    const onIndentNode = vi.fn()
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        keybindings: {
          overrides: {
            'outline.indent': ['Mod+]'],
          },
        },
      },
    })

    render(<KeyboardHarness onIndentNode={onIndentNode} />)
    const input = screen.getByRole('textbox', { name: '大纲节点' })

    fireEvent.keyDown(input, { key: 'Tab' })
    expect(onIndentNode).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: ']', ctrlKey: true })
    expect(onIndentNode).toHaveBeenCalledTimes(1)
  })
})

function KeyboardHarness({ onIndentNode }: { onIndentNode: () => void }) {
  const handleKeyDown = useNodeKeyboardHandling({
    nodeId: 'node-1',
    hasChildren: false,
    isCollapsed: false,
    isComposing: false,
    isSlashMenuOpen: false,
    activeSlashCommand: { key: 'todo', label: '待办', desc: '', shortcut: '' },
    onSlashMenuNext: vi.fn(),
    onSlashMenuPrevious: vi.fn(),
    onSlashMenuClose: vi.fn(),
    onSlashCommand: vi.fn(),
    onSelectNone: vi.fn(),
    onUpdateText: vi.fn(),
    onInsertNode: vi.fn(() => null),
    onDeleteNode: vi.fn(),
    onIndentNode: () => onIndentNode(),
    onOutdentNode: vi.fn(),
    onMoveNode: vi.fn(),
    onToggleCollapse: vi.fn(),
    onToggleChecked: vi.fn(),
    onNavigate: vi.fn(),
  })

  return <input aria-label="大纲节点" defaultValue="节点" onKeyDown={handleKeyDown} />
}
