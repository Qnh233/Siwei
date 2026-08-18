import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Node, ReactFlowInstance } from 'reactflow'

import type { NodeRevealRequest } from '../../../app/workspaceStore'
import type { MindMapNodeData } from '../MindMapNode'
import { useMindMapSplitReveal } from './useMindMapSplitReveal'

const node = {
  id: 'node-2',
  position: { x: 100, y: 80 },
  width: 200,
  height: 44,
  data: {},
} as Node<MindMapNodeData>

function Harness({
  request,
  nodes = [node],
  focusRootNodeId = null,
  resetFocus,
  setCenter,
}: {
  request: NodeRevealRequest | null
  nodes?: Node<MindMapNodeData>[]
  focusRootNodeId?: string | null
  resetFocus: () => void
  setCenter: ReturnType<typeof vi.fn>
}) {
  const flowInstanceRef = React.useRef({ setCenter } as unknown as ReactFlowInstance)
  useMindMapSplitReveal({
    request,
    nodes,
    flowInstanceRef,
    focusRootNodeId,
    resetFocus,
    split: true,
  })
  return null
}

describe('useMindMapSplitReveal', () => {
  it('centers outline reveal requests again when the same node is requested twice', async () => {
    const setCenter = vi.fn()
    const resetFocus = vi.fn()
    const request = { nodeId: 'node-2', source: 'outline', seq: 1 } as const
    const view = render(<Harness request={request} resetFocus={resetFocus} setCenter={setCenter} />)

    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1))
    expect(setCenter).toHaveBeenLastCalledWith(200, 102, { duration: 260 })

    view.rerender(<Harness request={request} nodes={[{ ...node }]} resetFocus={resetFocus} setCenter={setCenter} />)
    expect(setCenter).toHaveBeenCalledTimes(1)

    view.rerender(<Harness request={{ ...request, seq: 2 }} resetFocus={resetFocus} setCenter={setCenter} />)
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(2))
  })

  it('exits branch focus before retrying a temporarily hidden target', async () => {
    const setCenter = vi.fn()
    const resetFocus = vi.fn()
    const request = { nodeId: 'node-2', source: 'outline', seq: 1 } as const
    const view = render(
      <Harness request={request} nodes={[]} focusRootNodeId="node-1" resetFocus={resetFocus} setCenter={setCenter} />,
    )

    await waitFor(() => expect(resetFocus).toHaveBeenCalledTimes(1))
    expect(setCenter).not.toHaveBeenCalled()

    view.rerender(<Harness request={request} nodes={[node]} resetFocus={resetFocus} setCenter={setCenter} />)
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1))
  })
})
