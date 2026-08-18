import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type EdgeProps } from 'reactflow'
import { useDocumentStore } from '../document/documentStore'
import type { MindMapRelationEdgeData } from './mindMapRelationEdges'

interface RelationPathParams {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
}

const cubicMidpoint = (
  start: { x: number; y: number },
  control1: { x: number; y: number },
  control2: { x: number; y: number },
  end: { x: number; y: number },
) => ({
  x: (start.x + 3 * control1.x + 3 * control2.x + end.x) / 8,
  y: (start.y + 3 * control1.y + 3 * control2.y + end.y) / 8,
})

export function getMindMapRelationPath(params: RelationPathParams): [string, number, number] {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = params
  if (sourcePosition !== targetPosition) {
    const [path, labelX, labelY] = getBezierPath(params)
    return [path, labelX, labelY]
  }

  const start = { x: sourceX, y: sourceY }
  const end = { x: targetX, y: targetY }
  const averageX = (sourceX + targetX) / 2
  const averageY = (sourceY + targetY) / 2
  const outward = 72
  const bend = 64
  let control1: { x: number; y: number }
  let control2: { x: number; y: number }

  switch (sourcePosition) {
    case Position.Left: {
      const x = Math.min(sourceX, targetX) - outward
      const y = averageY - bend
      control1 = { x, y }
      control2 = { x, y }
      break
    }
    case Position.Right: {
      const x = Math.max(sourceX, targetX) + outward
      const y = averageY - bend
      control1 = { x, y }
      control2 = { x, y }
      break
    }
    case Position.Top: {
      const x = averageX + bend
      const y = Math.min(sourceY, targetY) - outward
      control1 = { x, y }
      control2 = { x, y }
      break
    }
    case Position.Bottom: {
      const x = averageX + bend
      const y = Math.max(sourceY, targetY) + outward
      control1 = { x, y }
      control2 = { x, y }
      break
    }
    default: {
      const [path, labelX, labelY] = getBezierPath(params)
      return [path, labelX, labelY]
    }
  }

  const middle = cubicMidpoint(start, control1, control2, end)
  return [
    `M ${sourceX},${sourceY} C ${control1.x},${control1.y} ${control2.x},${control2.y} ${targetX},${targetY}`,
    middle.x,
    middle.y,
  ]
}

export const MindMapRelationEdge: React.FC<EdgeProps<MindMapRelationEdgeData>> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerStart, markerEnd, style, data } = props
  const [path, labelX, labelY] = getMindMapRelationPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const [label, setLabel] = React.useState(data?.label ?? '')

  React.useEffect(() => {
    setLabel(data?.label ?? '')
  }, [data?.label, data?.relationId])

  const commit = () => {
    if (!data?.relationId) return
    useDocumentStore.getState().updateRelation(data.relationId, { label })
    data.onFinishEdit?.()
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} style={style} interactionWidth={18} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: data?.editing ? 'all' : 'none' }}
        >
          {data?.editing ? (
            <input
              autoFocus
              aria-label="编辑关系标注"
              value={label}
              placeholder="关系标注"
              onChange={(event) => setLabel(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  setLabel(data.label ?? '')
                  data.onFinishEdit?.()
                }
              }}
              className="h-7 min-w-20 max-w-48 rounded-md border border-teal-700/20 bg-[#FFFCF5]/95 px-2 text-center text-xs font-medium text-teal-800 shadow-fabric outline-none focus:ring-2 focus:ring-teal-200"
            />
          ) : data?.label ? (
            <span className="rounded bg-[#FFFCF5]/90 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 shadow-sm">
              {data.label}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
