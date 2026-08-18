import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument } from '../../test/fixtures'
import { useDocumentStore } from '../document/documentStore'
import { getMindMapRelationPath, MindMapRelationEdge } from './MindMapRelationEdge'

vi.mock('reactflow', async () => {
  const React = await import('react')
  return {
    BaseEdge: () => <svg data-testid="base-edge" />,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReactFlow: () => ({ screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }) }),
    Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  }
})

describe('MindMapRelationEdge', () => {
  beforeEach(() => {
    const doc = createDocument()
    doc.version = 3
    doc.relations = [{
      id: 'rel-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      sourceHandle: 'right',
      targetHandle: 'right',
      direction: 'one-way',
      label: '旧标注',
      createdAt: 1,
      updatedAt: 1,
    }]
    useDocumentStore.setState({
      currentDoc: doc,
      selectedNodeId: null,
      collapsedNodeIds: new Set(),
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      cleanSnapshotKey: null,
      activeTextEditSession: null,
    })
  })

  it('renders the relation label editor at the edge midpoint and commits changes', () => {
    const onFinishEdit = vi.fn()
    const props = {
      id: 'relation:rel-1',
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { kind: 'relation', relationId: 'rel-1', label: '旧标注', editing: true, onFinishEdit },
    } as unknown as ComponentProps<typeof MindMapRelationEdge>
    render(<MindMapRelationEdge {...props} />)

    const input = screen.getByRole('textbox', { name: '编辑关系标注' })
    expect(input.parentElement).toHaveStyle({ transform: 'translate(-50%, -50%) translate(50px, 28px)' })
    fireEvent.change(input, { target: { value: '新标注' } })
    fireEvent.blur(input)

    expect(useDocumentStore.getState().currentDoc?.relations?.[0].label).toBe('新标注')
    expect(onFinishEdit).toHaveBeenCalledTimes(1)
  })

  it('routes same-side relations outside the nodes so the midpoint stays clickable', () => {
    const [, labelX, labelY] = getMindMapRelationPath({
      sourceX: 100,
      sourceY: 80,
      targetX: 400,
      targetY: 80,
      sourcePosition: 'right' as never,
      targetPosition: 'right' as never,
    })

    expect(labelX).toBeGreaterThan(400)
    expect(labelY).toBeLessThan(80)
  })

  it('renders a draggable bend point and applies a persisted curve offset to the path midpoint', () => {
    const [path, labelX, labelY, bendX, bendY] = getMindMapRelationPath({
      sourceX: 0,
      sourceY: 0,
      targetX: 200,
      targetY: 0,
      sourcePosition: 'right' as never,
      targetPosition: 'left' as never,
      curveOffset: { x: 0, y: 60 },
    })

    expect(path).toContain('C')
    expect(bendX).toBe(100)
    expect(bendY).toBe(60)
    expect(labelX).toBe(100)
    expect(labelY).toBe(38)

    const props = {
      id: 'relation:rel-1',
      sourceX: 0,
      sourceY: 0,
      targetX: 200,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        kind: 'relation',
        relationId: 'rel-1',
        curveOffset: { x: 0, y: 60 },
      },
    } as unknown as ComponentProps<typeof MindMapRelationEdge>
    render(<MindMapRelationEdge {...props} />)

    expect(screen.getByRole('button', { name: '调整关系线弧度' })).toBeInTheDocument()
  })

  it('updates the bend point immediately while dragging and commits one curve edit when released', () => {
    const props = {
      id: 'relation:rel-1',
      sourceX: 0,
      sourceY: 0,
      targetX: 200,
      targetY: 0,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { kind: 'relation', relationId: 'rel-1' },
    } as unknown as ComponentProps<typeof MindMapRelationEdge>
    render(<MindMapRelationEdge {...props} />)

    const control = screen.getByRole('button', { name: '调整关系线弧度' })
    fireEvent.pointerDown(control, { clientX: 100, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 70 })

    expect(control).toHaveStyle({
      transform: 'translate(-50%, -50%) translate(100px, 70px)',
    })
    expect(useDocumentStore.getState().currentDoc?.relations?.[0].curveOffset).toBeUndefined()

    fireEvent.pointerUp(window)

    expect(useDocumentStore.getState().currentDoc?.relations?.[0].curveOffset).toEqual({ x: 0, y: 70 })
  })
})
