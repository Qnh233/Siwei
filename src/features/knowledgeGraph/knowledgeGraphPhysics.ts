import type { Edge, Node } from 'reactflow'
import type { KnowledgeGraphNodeData } from './knowledgeGraphLayout'

export interface KnowledgeGraphVelocity { x: number; y: number }
export type KnowledgeGraphVelocityMap = Map<string, KnowledgeGraphVelocity>

export interface KnowledgeGraphPhysicsOptions {
  alpha?: number
  draggingId?: string | null
  linkDistance?: number
  repulsion?: number
  damping?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function stepKnowledgeGraphPhysics(
  nodes: Array<Node<KnowledgeGraphNodeData>>,
  edges: Edge[],
  velocities: KnowledgeGraphVelocityMap,
  options: KnowledgeGraphPhysicsOptions = {},
): Array<Node<KnowledgeGraphNodeData>> {
  if (nodes.length <= 1) return nodes

  const alpha = options.alpha ?? 1
  const draggingId = options.draggingId ?? null
  const linkDistance = options.linkDistance ?? 145
  const repulsion = options.repulsion ?? 1500
  const damping = options.damping ?? 0.84
  const force = new Map<string, KnowledgeGraphVelocity>()
  const byId = new Map(nodes.map((node) => [node.id, node]))

  const addForce = (id: string, x: number, y: number) => {
    const current = force.get(id) ?? { x: 0, y: 0 }
    current.x += x
    current.y += y
    force.set(id, current)
  }

  for (let aIndex = 0; aIndex < nodes.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < nodes.length; bIndex += 1) {
      const a = nodes[aIndex]
      const b = nodes[bIndex]
      let dx = a.position.x - b.position.x
      let dy = a.position.y - b.position.y
      if (Math.abs(dx) + Math.abs(dy) < 0.01) {
        dx = a.id < b.id ? -0.5 : 0.5
        dy = 0.5
      }
      const distanceSquared = Math.max(36, dx * dx + dy * dy)
      const distance = Math.sqrt(distanceSquared)
      const magnitude = (repulsion * alpha) / distanceSquared
      const fx = (dx / distance) * magnitude
      const fy = (dy / distance) * magnitude
      addForce(a.id, fx, fy)
      addForce(b.id, -fx, -fy)
    }
  }

  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source || !target) continue
    const dx = target.position.x - source.position.x
    const dy = target.position.y - source.position.y
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const magnitude = (distance - linkDistance) * 0.013 * alpha
    const fx = (dx / distance) * magnitude
    const fy = (dy / distance) * magnitude
    addForce(source.id, fx, fy)
    addForce(target.id, -fx, -fy)
  }

  return nodes.map((node) => {
    if (node.id === draggingId) {
      velocities.set(node.id, { x: 0, y: 0 })
      return node
    }

    const velocity = velocities.get(node.id) ?? { x: 0, y: 0 }
    const nodeForce = force.get(node.id) ?? { x: 0, y: 0 }
    const centerStrength = node.data.isRoot ? 0.009 : 0.0015
    const vx = (velocity.x + nodeForce.x - node.position.x * centerStrength * alpha) * damping
    const vy = (velocity.y + nodeForce.y - node.position.y * centerStrength * alpha) * damping
    const nextVelocity = { x: clamp(vx, -11, 11), y: clamp(vy, -11, 11) }
    velocities.set(node.id, nextVelocity)

    return {
      ...node,
      position: {
        x: node.position.x + nextVelocity.x,
        y: node.position.y + nextVelocity.y,
      },
    }
  })
}
