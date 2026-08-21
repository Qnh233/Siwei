import { Position } from 'reactflow'

import type { MindMapLayoutPosition, MindMapLayoutState, OutlineNode } from '../../../types/document'
import type { MindMapLayoutEngine, MindMapLayoutInput } from '../layoutEngine'
import { normalizeMindMapLayoutState } from '../mindMapLayoutState'
import { attachNearestEdgeHandles, createResult, resolveNodeSize } from './shared'

const MILESTONE_GAP = 320
const ROOT_GAP_Y = 150
const DETAIL_GAP_Y = 34
const DETAIL_INDENT_X = 28

export const timelineEngine: MindMapLayoutEngine = {
  layout(input) {
    const graphNodeIds = new Set(input.graphData.nodes.map((node) => node.id))
    const positions = layoutTimeline(input, graphNodeIds)
    const nodes = input.graphData.nodes.map((node) => ({
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: positions.get(node.id) ?? node.position,
    }))

    return createResult(
      input,
      nodes,
      attachNearestEdgeHandles(input.graphData.edges, nodes, input.nodeSizes),
    )
  },
}

function layoutTimeline(input: MindMapLayoutInput, graphNodeIds: Set<string>) {
  const positions = new Map<string, MindMapLayoutPosition>()
  const persisted = normalizeMindMapLayoutState(input.persistedLayout)
  const milestones = input.root.children.filter((child) => graphNodeIds.has(child.id))
  const rootSize = resolveNodeSize(input.root.id, input.nodeSizes)
  const milestoneCenters = milestones.map((_, index) => index * MILESTONE_GAP)
  const rootCenterX = milestoneCenters.length > 0
    ? (milestoneCenters[0] + milestoneCenters[milestoneCenters.length - 1]) / 2
    : 0

  positions.set(
    input.root.id,
    persisted?.nodes[input.root.id]?.locked
      ? persisted.nodes[input.root.id].position
      : { x: rootCenterX - rootSize.width / 2, y: 0 },
  )

  milestones.forEach((milestone, index) => {
    const size = resolveNodeSize(milestone.id, input.nodeSizes)
    const centerX = milestoneCenters[index]
    const defaultPosition = { x: centerX - size.width / 2, y: ROOT_GAP_Y }
    positions.set(
      milestone.id,
      persisted?.nodes[milestone.id]?.locked ? persisted.nodes[milestone.id].position : defaultPosition,
    )

    let cursorY = ROOT_GAP_Y + size.height + 56
    milestone.children.forEach((child) => {
      cursorY = layoutTimelineDetail({
        node: child,
        depth: 1,
        centerX,
        cursorY,
        input,
        graphNodeIds,
        persisted,
        positions,
      })
    })
  })

  return positions
}

function layoutTimelineDetail(params: {
  node: OutlineNode
  depth: number
  centerX: number
  cursorY: number
  input: MindMapLayoutInput
  graphNodeIds: Set<string>
  persisted?: MindMapLayoutState
  positions: Map<string, MindMapLayoutPosition>
}): number {
  if (!params.graphNodeIds.has(params.node.id)) return params.cursorY
  const size = resolveNodeSize(params.node.id, params.input.nodeSizes)
  const x = params.centerX - size.width / 2 + params.depth * DETAIL_INDENT_X
  const position = params.persisted?.nodes[params.node.id]?.locked
    ? params.persisted.nodes[params.node.id].position
    : { x, y: params.cursorY }
  params.positions.set(params.node.id, position)

  let cursorY = params.cursorY + size.height + DETAIL_GAP_Y
  params.node.children.forEach((child) => {
    cursorY = layoutTimelineDetail({ ...params, node: child, depth: params.depth + 1, cursorY })
  })
  return cursorY
}
