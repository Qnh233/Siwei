import { describe, expect, it } from 'vitest'
import type { Node } from 'reactflow'
import type { MindMapNodeData } from './MindMapNode'
import { findRelationDropTarget, getParallelCurveOffset } from './mindMapRelationInteraction'

const node = (id: string, x: number, y: number, width = 200, height = 80): Node<MindMapNodeData> => ({
  id,
  position: { x, y },
  width,
  height,
  data: {} as MindMapNodeData,
})

describe('mind map relation interaction', () => {
  it('snaps a connection dropped inside a node to its nearest side midpoint', () => {
    const nodes = [node('source', 0, 0), node('target', 300, 100)]

    expect(findRelationDropTarget(nodes, { x: 495, y: 140 }, 'source')).toEqual({
      nodeId: 'target',
      handle: 'right',
    })
    expect(findRelationDropTarget(nodes, { x: 390, y: 103 }, 'source')).toEqual({
      nodeId: 'target',
      handle: 'top',
    })
  })

  it('does not snap to the source node or outside any node', () => {
    const nodes = [node('source', 0, 0), node('target', 300, 100)]

    expect(findRelationDropTarget(nodes, { x: 20, y: 20 }, 'source')).toBeNull()
    expect(findRelationDropTarget(nodes, { x: 260, y: 40 }, 'source')).toBeNull()
  })

  it('alternates parallel relation offsets so repeated connections remain visible', () => {
    expect(getParallelCurveOffset(0, { x: 0, y: 0 }, { x: 200, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(getParallelCurveOffset(1, { x: 0, y: 0 }, { x: 200, y: 0 })).toEqual({ x: 0, y: 44 })
    expect(getParallelCurveOffset(2, { x: 0, y: 0 }, { x: 200, y: 0 })).toEqual({ x: 0, y: -44 })
  })
})
