import React from 'react'
import type { Node, ReactFlowInstance } from 'reactflow'

import type { NodeRevealRequest } from '../../../app/workspaceStore'
import type { MindMapNodeData } from '../MindMapNode'
import { DEFAULT_MIND_MAP_NODE_WIDTH } from '../mindMapReorder'

interface UseMindMapSplitRevealOptions {
  request: NodeRevealRequest | null
  nodes: Node<MindMapNodeData>[]
  flowInstanceRef: React.MutableRefObject<ReactFlowInstance | null>
  focusRootNodeId: string | null
  resetFocus: () => void
  split: boolean
}

export function useMindMapSplitReveal({
  request,
  nodes,
  flowInstanceRef,
  focusRootNodeId,
  resetFocus,
  split,
}: UseMindMapSplitRevealOptions): void {
  const handledSeqRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!split || !request || request.source !== 'outline') return
    if (handledSeqRef.current === request.seq) return

    const node = nodes.find((item) => item.id === request.nodeId)
    if (!node) {
      // 分支聚焦可能暂时隐藏目标；先退出聚焦，节点恢复后本 effect 会再次尝试定位。
      if (focusRootNodeId) resetFocus()
      return
    }

    flowInstanceRef.current?.setCenter(
      node.position.x + (node.width ?? DEFAULT_MIND_MAP_NODE_WIDTH) / 2,
      node.position.y + (node.height ?? 44) / 2,
      { duration: 260 },
    )
    handledSeqRef.current = request.seq
  }, [flowInstanceRef, focusRootNodeId, nodes, request, resetFocus, split])
}
