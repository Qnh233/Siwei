import type { MindMapLayoutEngine } from '../layoutEngine'
import { layoutGraph } from '../layoutGraph'
import { normalizeMindMapLayoutState } from '../mindMapLayoutState'
import { attachVerticalEdgeHandles, createResult } from './shared'

export const treeDownEngine: MindMapLayoutEngine = {
  layout(input) {
    const layouted = layoutGraph(input.graphData, {
      savedLayout: lockedPositions(input),
      preserveSavedPositions: true,
      nodeSizes: input.nodeSizes,
      rankdir: 'TB',
      nodesep: 42,
      ranksep: 96,
      marginx: 56,
      marginy: 44,
      ranker: 'network-simplex',
    })

    return createResult(
      input,
      layouted.nodes,
      attachVerticalEdgeHandles(layouted.edges, layouted.nodes, input.nodeSizes),
    )
  },
}

function lockedPositions(input: Parameters<MindMapLayoutEngine['layout']>[0]) {
  return Object.fromEntries(
    Object.entries(normalizeMindMapLayoutState(input.persistedLayout)?.nodes ?? {})
      .filter(([, state]) => state.locked)
      .map(([nodeId, state]) => [nodeId, state.position]),
  )
}
