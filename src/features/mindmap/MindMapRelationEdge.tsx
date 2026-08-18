import React from 'react'
import { BaseEdge, EdgeLabelRenderer, Position, useReactFlow, type EdgeProps } from 'reactflow'
import type { NodeRelationCurveOffset } from '../../types/document'
import { useDocumentStore } from '../document/documentStore'
import type { MindMapRelationEdgeData } from './mindMapRelationEdges'

interface RelationPathParams {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  curveOffset?: NodeRelationCurveOffset
}

const EMPTY_OFFSET: NodeRelationCurveOffset = { x: 0, y: 0 }

function getDefaultBendPoint(params: RelationPathParams) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = params
  const midpoint = { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 }
  if (sourcePosition !== targetPosition) return midpoint

  switch (sourcePosition) {
    case Position.Left:
      return { x: Math.min(sourceX, targetX) - 72, y: midpoint.y - 64 }
    case Position.Right:
      return { x: Math.max(sourceX, targetX) + 72, y: midpoint.y - 64 }
    case Position.Top:
      return { x: midpoint.x + 64, y: Math.min(sourceY, targetY) - 72 }
    case Position.Bottom:
      return { x: midpoint.x + 64, y: Math.max(sourceY, targetY) + 72 }
    default:
      return midpoint
  }
}

export function getMindMapRelationPath(params: RelationPathParams): [string, number, number, number, number] {
  const { sourceX, sourceY, targetX, targetY } = params
  const defaultBend = getDefaultBendPoint(params)
  const bendX = defaultBend.x + (params.curveOffset?.x ?? 0)
  const bendY = defaultBend.y + (params.curveOffset?.y ?? 0)

  // 两个三次贝塞尔控制点重合时，只需一个可拖动弯曲点；这里反算控制点，保证曲线在 t=0.5 经过 bend。
  const controlX = (8 * bendX - sourceX - targetX) / 6
  const controlY = (8 * bendY - sourceY - targetY) / 6
  return [
    `M ${sourceX},${sourceY} C ${controlX},${controlY} ${controlX},${controlY} ${targetX},${targetY}`,
    bendX,
    bendY - 22,
    bendX,
    bendY,
  ]
}

const offsetsEqual = (left?: NodeRelationCurveOffset, right?: NodeRelationCurveOffset) => (
  (left?.x ?? 0) === (right?.x ?? 0) && (left?.y ?? 0) === (right?.y ?? 0)
)

export const MindMapRelationEdge: React.FC<EdgeProps<MindMapRelationEdgeData>> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerStart,
    markerEnd,
    style,
    data,
  } = props
  const { screenToFlowPosition } = useReactFlow()
  const [label, setLabel] = React.useState(data?.label ?? '')
  const [curveOffset, setCurveOffset] = React.useState<NodeRelationCurveOffset>(data?.curveOffset ?? EMPTY_OFFSET)
  const curveOffsetRef = React.useRef(curveOffset)
  const draggingRef = React.useRef(false)
  const cleanupDragRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    setLabel(data?.label ?? '')
  }, [data?.label, data?.relationId])

  React.useEffect(() => {
    if (draggingRef.current) return
    const next = data?.curveOffset ?? EMPTY_OFFSET
    curveOffsetRef.current = next
    setCurveOffset(next)
  }, [data?.curveOffset?.x, data?.curveOffset?.y, data?.relationId])

  React.useEffect(() => () => cleanupDragRef.current?.(), [])

  const pathParams = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }
  const [path, labelX, labelY, bendX, bendY] = getMindMapRelationPath({ ...pathParams, curveOffset })
  const [, , , defaultBendX, defaultBendY] = getMindMapRelationPath(pathParams)

  const commitLabel = () => {
    if (!data?.relationId) return
    useDocumentStore.getState().updateRelation(data.relationId, { label })
    data.onFinishEdit?.()
  }

  const startCurveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    draggingRef.current = true

    const handleMove = (moveEvent: PointerEvent) => {
      const point = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY })
      const next = {
        x: Math.round(point.x - defaultBendX),
        y: Math.round(point.y - defaultBendY),
      }
      curveOffsetRef.current = next
      setCurveOffset(next)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      cleanupDragRef.current = null
    }
    const handleUp = () => {
      draggingRef.current = false
      cleanup()
      if (data?.relationId && !offsetsEqual(curveOffsetRef.current, data.curveOffset)) {
        useDocumentStore.getState().updateRelation(data.relationId, { curveOffset: curveOffsetRef.current })
      }
    }

    cleanupDragRef.current?.()
    cleanupDragRef.current = cleanup
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <>
      <path
        d={path}
        fill="none"
        pointerEvents="none"
        style={{ ...style, stroke: '#2DD4BF', strokeWidth: 8, opacity: 0.14 }}
      />
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={22}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          aria-label="调整关系线弧度"
          title="拖动调整关系线弧度"
          className="nodrag nopan absolute z-10 h-3 w-3 cursor-move rounded-full border-2 border-teal-700 bg-[#FFFCF5] shadow-sm transition-transform hover:scale-125"
          style={{ transform: `translate(-50%, -50%) translate(${bendX}px, ${bendY}px)`, pointerEvents: 'all' }}
          onPointerDown={startCurveDrag}
          onDoubleClick={(event) => {
            event.stopPropagation()
            data?.onStartEdit?.()
          }}
        />
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
              onBlur={commitLabel}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  setLabel(data.label ?? '')
                  data.onFinishEdit?.()
                }
              }}
              className="h-7 min-w-20 max-w-48 rounded-md border border-teal-700/25 bg-[#FFFCF5]/95 px-2 text-center text-xs font-semibold text-teal-900 shadow-fabric outline-none focus:ring-2 focus:ring-teal-200"
            />
          ) : data?.label ? (
            <span className="rounded-full border border-teal-700/15 bg-[#FFFCF5]/95 px-2 py-0.5 text-[11px] font-semibold text-teal-800 shadow-sm">
              {data.label}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
