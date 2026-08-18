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
      label: '相关',
      data: { kind: 'relation', relationId: 'visible' },
    })
    expect(edges[0].markerStart).toBeDefined()
    expect(edges[0].markerEnd).toBeDefined()
  })
})
