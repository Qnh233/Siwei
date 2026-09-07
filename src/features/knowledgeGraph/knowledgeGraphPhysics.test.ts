import { describe, expect, it } from 'vitest'
import type { Edge, Node } from 'reactflow'
import type { KnowledgeGraphNodeData } from './knowledgeGraphLayout'
import { stepKnowledgeGraphPhysics, type KnowledgeGraphVelocityMap } from './knowledgeGraphPhysics'

const node = (id: string, x: number, isRoot = false): Node<KnowledgeGraphNodeData> => ({
  id,
  position: { x, y: 0 },
  data: {
    title: id,
    path: `${id}.siwei.json`,
    isRoot,
    openable: true,
    degree: 1,
    hop: isRoot ? 0 : 1,
    radius: isRoot ? 16 : 10,
  },
})

describe('stepKnowledgeGraphPhysics', () => {
  it('updates connected node positions with finite values', () => {
    const nodes = [node('a', -220, true), node('b', 220)]
    const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' }]
    const velocities: KnowledgeGraphVelocityMap = new Map()

    const next = stepKnowledgeGraphPhysics(nodes, edges, velocities, { alpha: 1 })

    expect(next[0].position.x).not.toBe(nodes[0].position.x)
    expect(next[1].position.x).not.toBe(nodes[1].position.x)
    next.forEach((item) => {
      expect(Number.isFinite(item.position.x)).toBe(true)
      expect(Number.isFinite(item.position.y)).toBe(true)
    })
  })

  it('keeps the actively dragged node fixed while reheating neighbors', () => {
    const nodes = [node('a', -180, true), node('b', 180)]
    const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' }]
    const velocities: KnowledgeGraphVelocityMap = new Map([['a', { x: 4, y: 3 }]])

    const next = stepKnowledgeGraphPhysics(nodes, edges, velocities, { alpha: 1, draggingId: 'a' })

    expect(next[0]).toBe(nodes[0])
    expect(velocities.get('a')).toEqual({ x: 0, y: 0 })
    expect(next[1].position.x).not.toBe(nodes[1].position.x)
  })
})
