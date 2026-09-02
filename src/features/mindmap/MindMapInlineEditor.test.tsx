import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MindMapInlineEditor } from './MindMapInlineEditor'
import { useSettingsStore } from '../settings/settingsStore'
import { DEFAULT_SETTINGS } from '../../types/settings'

function renderEditorWithParentHandlers(value = '第二节点') {
  const parentPointerDown = vi.fn()
  const parentMouseDown = vi.fn()
  const parentClick = vi.fn()
  const parentKeyDown = vi.fn()
  const onDeleteEmpty = vi.fn()
  const onInsertChild = vi.fn()
  const onIndent = vi.fn()

  render(
    <div
      onPointerDown={parentPointerDown}
      onMouseDown={parentMouseDown}
      onClick={parentClick}
      onKeyDown={parentKeyDown}
    >
      <MindMapInlineEditor
        nodeId="node-2"
        value={value}
        onChange={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
        onDeleteEmpty={onDeleteEmpty}
        onInsertSibling={vi.fn()}
        onInsertChild={onInsertChild}
        onIndent={onIndent}
        onOutdent={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onToggleChecked={vi.fn()}
      />
    </div>,
  )

  return {
    input: screen.getByRole('textbox', { name: '编辑节点文本' }) as HTMLInputElement,
    parentPointerDown,
    parentMouseDown,
    parentClick,
    parentKeyDown,
    onDeleteEmpty,
    onInsertChild,
    onIndent,
  }
}

describe('MindMapInlineEditor', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('keeps mouse positioning events inside the editor input', () => {
    const { input, parentPointerDown, parentMouseDown, parentClick } = renderEditorWithParentHandlers()

    expect(input).toHaveClass('nodrag')
    expect(input).toHaveClass('nopan')

    fireEvent.pointerDown(input)
    fireEvent.mouseDown(input)
    fireEvent.click(input)

    expect(parentPointerDown).not.toHaveBeenCalled()
    expect(parentMouseDown).not.toHaveBeenCalled()
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('keeps Backspace and Delete inside the input so selected text can be removed natively', () => {
    const { input, parentKeyDown, onDeleteEmpty } = renderEditorWithParentHandlers('408 数据结构')

    input.setSelectionRange(0, input.value.length)
    const backspaceAllowed = fireEvent.keyDown(input, { key: 'Backspace' })

    expect(backspaceAllowed).toBe(true)
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(onDeleteEmpty).not.toHaveBeenCalled()

    input.setSelectionRange(0, input.value.length)
    const deleteAllowed = fireEvent.keyDown(input, { key: 'Delete' })

    expect(deleteAllowed).toBe(true)
    expect(parentKeyDown).not.toHaveBeenCalled()
    expect(onDeleteEmpty).not.toHaveBeenCalled()
  })

  it('uses the same customized mind map binding while inline editing', () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        keybindings: {
          overrides: {
            'mindmap.insertChild': ['Tab'],
            'mindmap.indent': ['Mod+]'],
          },
        },
      },
    })
    const { input, onInsertChild, onIndent } = renderEditorWithParentHandlers()

    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onInsertChild).toHaveBeenCalledTimes(1)
    expect(onIndent).not.toHaveBeenCalled()
  })
})
