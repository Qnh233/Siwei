import { describe, expect, it } from 'vitest'
import type { Node } from 'reactflow'
import type { MindMapNodeData } from './MindMapNode'
import { buildMindMapRelationEdges } from './mindMapRelationEdges'

const node = (id: string, x: number): Node<MindMapNodeData> => ({
  id,
  position: { x, y: 0 },
  data: {} as MindMapNodeData,
})

describe('buildMindMapRelationEdges', () => {
  it('renders only relations whose endpoints are visible and preserves direction metadata', () => {
    const edges = buildMindMapRelationEdges([
      {
        id: 'visible',
        sourceNodeId: 'a',
        targetNodeId: 'b',
        sourceHandle: 'right',
        targetHandle: 'right',
        direction: 'two-way',
        label: '相关',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'hidden',
        sourceNodeId: 'a',
        targetNodeId: 'c',
        direction: 'one-way',
        createdAt: 1,
        updatedAt: 1,
      },
    ], [node('a', 0), node('b', 300)], {})

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      id: 'relation:visible',
      source: 'a',
      target: 'b',
      data: { kind: 'relation', relationId: 'visible', label: '相关' },
      sourceHandle: 'relation-right',
      targetHandle: 'relation-right',
    })
    expect(edges[0].markerStart).toBeDefined()
    expect(edges[0].markerEnd).toBeDefined()
    expect(edges[0].style).toMatchObject({ strokeWidth: 2.2 })
  })

  it('renders multiple independent relations between the same node pair', () => {
    const edges = buildMindMapRelationEdges([
      {
        id: 'forward',
        sourceNodeId: 'a',
        targetNodeId: 'b',
        direction: 'one-way',
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'reverse',
        sourceNodeId: 'b',
        targetNodeId: 'a',
        direction: 'one-way',
        curveOffset: { x: 0, y: 44 },
        createdAt: 2,
        updatedAt: 2,
      },
    ], [node('a', 0), node('b', 300)], {})

    expect(edges.map((edge) => edge.id)).toEqual(['relation:forward', 'relation:reverse'])
    expect(edges[1].data?.curveOffset).toEqual({ x: 0, y: 44 })
  })
})
