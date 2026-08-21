import type { MindMapLayoutEngine } from '../layoutEngine'
import { layoutGraph } from '../layoutGraph'
import { normalizeMindMapLayoutState } from '../mindMapLayoutState'
import { attachVerticalEdgeHandles, createResult } from './shared'

export const orgChartEngine: MindMapLayoutEngine = {
  layout(input) {
    const layouted = layoutGraph(input.graphData, {
      savedLayout: Object.fromEntries(
        Object.entries(normalizeMindMapLayoutState(input.persistedLayout)?.nodes ?? {})
          .filter(([, state]) => state.locked)
          .map(([nodeId, state]) => [nodeId, state.position]),
      ),
      preserveSavedPositions: true,
      nodeSizes: input.nodeSizes,
      rankdir: 'TB',
      nodesep: 22,
      ranksep: 118,
      marginx: 40,
      marginy: 44,
      ranker: 'tight-tree',
    })

    return createResult(
      input,
      layouted.nodes,
      attachVerticalEdgeHandles(layouted.edges, layouted.nodes, input.nodeSizes),
    )
  },
}
