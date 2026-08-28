import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createDocument } from '../../test/fixtures'
import { useDocumentStore } from '../document/documentStore'
import { NodeNoteEditor } from './NodeNoteEditor'

describe('NodeNoteEditor', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      currentDoc: createDocument(),
      selectedNodeId: 'node-1',
      isDirty: false,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    })
  })

  it('renders an existing note as an inline quote and edits it in place', () => {
    const doc = createDocument()
    doc.root.children[0].note = '原注释'
    useDocumentStore.setState({ currentDoc: doc })

    const { rerender } = render(<NodeNoteEditor nodeId="node-1" note="原注释" showEmptyAction />)

    const note = screen.getByTestId('node-note-node-1')
    expect(note).toHaveTextContent('原注释')
    expect(note).toHaveClass('border-l-2')

    fireEvent.click(screen.getByRole('button', { name: '编辑注释' }))
    const editor = screen.getByRole('textbox', { name: '节点注释' })
    fireEvent.change(editor, { target: { value: '新的注释\n第二行' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    expect(useDocumentStore.getState().currentDoc?.root.children[0].note).toBe('新的注释\n第二行')
    rerender(<NodeNoteEditor nodeId="node-1" note="新的注释\n第二行" showEmptyAction />)
    expect(screen.getByTestId('node-note-node-1')).toHaveTextContent('新的注释')
  })

  it('shows an add affordance only when requested for an empty note', () => {
    const { rerender } = render(<NodeNoteEditor nodeId="node-1" />)
    expect(screen.queryByRole('button', { name: '添加注释' })).not.toBeInTheDocument()

    rerender(<NodeNoteEditor nodeId="node-1" showEmptyAction />)
    fireEvent.click(screen.getByRole('button', { name: '添加注释' }))

    expect(screen.getByRole('textbox', { name: '节点注释' })).toBeInTheDocument()
  })

  it('cancels edits with Escape without mutating the note', () => {
    const doc = createDocument()
    doc.root.children[0].note = '保留内容'
    useDocumentStore.setState({ currentDoc: doc })

    render(<NodeNoteEditor nodeId="node-1" note="保留内容" />)
    fireEvent.click(screen.getByRole('button', { name: '编辑注释' }))
    const editor = screen.getByRole('textbox', { name: '节点注释' })
    fireEvent.change(editor, { target: { value: '不应保存' } })
    fireEvent.keyDown(editor, { key: 'Escape' })

    expect(useDocumentStore.getState().currentDoc?.root.children[0].note).toBe('保留内容')
    expect(screen.getByTestId('node-note-node-1')).toHaveTextContent('保留内容')
  })

  it('removes the note when only whitespace is committed', () => {
    const doc = createDocument()
    doc.root.children[0].note = '待删除注释'
    useDocumentStore.setState({ currentDoc: doc })

    render(<NodeNoteEditor nodeId="node-1" note="待删除注释" />)
    fireEvent.click(screen.getByRole('button', { name: '编辑注释' }))
    const editor = screen.getByRole('textbox', { name: '节点注释' })
    fireEvent.change(editor, { target: { value: '   \n  ' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    expect(useDocumentStore.getState().currentDoc?.root.children[0].note).toBeUndefined()
  })
})
