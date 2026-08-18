import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MindMapNode } from './MindMapNode'

vi.mock('reactflow', () => ({
  Handle: ({ id }: { id?: string }) => <span data-testid={`handle-${id}`} />,
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
}))

const createProps = (overrides: Partial<ComponentProps<typeof MindMapNode>> = {}) => {
  const onInsertChild = vi.fn()
  const props = {
    id: 'node-1',
    type: 'custom',
    selected: false,
    data: {
      label: '节点',
      depth: 1,
      childCount: 0,
      visibleChildCount: 0,
      collapsed: false,
      focused: false,
      matched: false,
      activeMatch: false,
      hasTags: false,
      editing: false,
      onToggleCollapse: vi.fn(),
      onTextChange: vi.fn(),
      onCommitEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onDeleteEmpty: vi.fn(),
      onInsertSibling: vi.fn(),
      onInsertChild,
      onIndent: vi.fn(),
      onOutdent: vi.fn(),
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onToggleChecked: vi.fn(),
    },
    ...overrides,
  } as unknown as ComponentProps<typeof MindMapNode>
  return { props, onInsertChild }
}

describe('MindMapNode', () => {
  it('shows a faint right-side add-child button and creates a child on click', () => {
    const { props, onInsertChild } = createProps()
    render(<MindMapNode {...props} />)

    const addButton = screen.getByRole('button', { name: '添加子节点' })
    expect(addButton.className).toContain('opacity-[0.06]')

    fireEvent.click(addButton)
    expect(onInsertChild).toHaveBeenCalledWith('node-1')
  })

  it('makes the add-child affordance easier to discover for a selected node', () => {
    const { props } = createProps({ selected: true })
    render(<MindMapNode {...props} />)

    expect(screen.getByRole('button', { name: '添加子节点' }).className).toContain('opacity-70')
  })

  it('does not render the add-child control in clean export mode', () => {
    const { props } = createProps()
    props.data.exportClean = true
    render(<MindMapNode {...props} />)

    expect(screen.queryByRole('button', { name: '添加子节点' })).not.toBeInTheDocument()
  })
})
