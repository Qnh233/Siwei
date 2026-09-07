import React from 'react'
import ReactFlow, { Controls, type Edge, type Node, type ReactFlowInstance, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import type { LibraryGraphResult } from '../../types/library'
import { KnowledgeGraphNode } from './KnowledgeGraphNode'
import { buildKnowledgeGraphElements, type KnowledgeGraphNodeData } from './knowledgeGraphLayout'
import { stepKnowledgeGraphPhysics, type KnowledgeGraphVelocityMap } from './knowledgeGraphPhysics'

const nodeTypes = { knowledgeDocument: KnowledgeGraphNode }
const BASE_EDGE_STYLE = { strokeWidth: 1.15, opacity: 0.34 }

interface KnowledgeGraphExplorerProps {
  result: LibraryGraphResult
  currentTitle: string
  onOpenDocument: (documentId: string, path?: string | null) => void
}

export const KnowledgeGraphExplorer: React.FC<KnowledgeGraphExplorerProps> = (props) => {
  const fullElements = React.useMemo(() => buildKnowledgeGraphElements(props.result, props.currentTitle), [props.currentTitle, props.result])
  const [nodes, setNodes, onNodesChange] = useNodesState<KnowledgeGraphNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const velocitiesRef = React.useRef<KnowledgeGraphVelocityMap>(new Map())
  const draggingIdRef = React.useRef<string | null>(null)
  const alphaRef = React.useRef(0)
  const frameRef = React.useRef<number | null>(null)
  const edgesRef = React.useRef<Edge[]>([])
  const flowRef = React.useRef<ReactFlowInstance<KnowledgeGraphNodeData> | null>(null)

  React.useEffect(() => { edgesRef.current = edges }, [edges])
  const maxHop = React.useMemo(() => Math.max(0, ...fullElements.nodes.map((node) => node.data.hop)), [fullElements.nodes])
  const growthTimersRef = React.useRef<number[]>([])

  const stopPhysics = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }, [])

  const tickPhysics = React.useCallback(() => {
    setNodes((current) => stepKnowledgeGraphPhysics(current, edgesRef.current, velocitiesRef.current, {
      alpha: alphaRef.current,
      draggingId: draggingIdRef.current,
    }))
    alphaRef.current *= 0.965
    frameRef.current = alphaRef.current > 0.025 ? requestAnimationFrame(tickPhysics) : null
  }, [setNodes])

  const heat = React.useCallback((alpha = 1) => {
    alphaRef.current = Math.max(alphaRef.current, alpha)
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(tickPhysics)
  }, [tickPhysics])

  const clearGrowthTimers = React.useCallback(() => {
    growthTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    growthTimersRef.current = []
  }, [])

  const revealThroughHop = React.useCallback((hop: number) => {
    const visibleNodes = fullElements.nodes.filter((node) => node.data.hop <= hop)
    const visibleIds = new Set(visibleNodes.map((node) => node.id))
    setNodes((current) => {
      const existing = new Map(current.map((node) => [node.id, node]))
      return visibleNodes.map((node) => ({ ...node, position: existing.get(node.id)?.position ?? node.position }))
    })
    setEdges(fullElements.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)))
    heat(hop === 0 ? 0.45 : 1)
  }, [fullElements.edges, fullElements.nodes, heat, setEdges, setNodes])

  const playGrowth = React.useCallback(() => {
    clearGrowthTimers()
    stopPhysics()
    velocitiesRef.current = new Map()
    setNodes([])
    setEdges([])
    for (let hop = 0; hop <= maxHop; hop += 1) {
      growthTimersRef.current.push(window.setTimeout(() => revealThroughHop(hop), hop * 280))
    }
    growthTimersRef.current.push(window.setTimeout(() => {
      void flowRef.current?.fitView({ padding: 0.22, duration: 420, maxZoom: 1.15 })
    }, maxHop * 280 + 520))
  }, [clearGrowthTimers, maxHop, revealThroughHop, setEdges, setNodes, stopPhysics])

  React.useEffect(() => {
    playGrowth()
    return () => {
      clearGrowthTimers()
      stopPhysics()
    }
  }, [clearGrowthTimers, playGrowth, stopPhysics])

  const handleNodeClick = React.useCallback((_: React.MouseEvent, node: Node<KnowledgeGraphNodeData>) => {
    if (node.data.isRoot || !node.data.openable) return
    props.onOpenDocument(node.id, node.data.path)
  }, [props.onOpenDocument])

  const handleNodeMouseEnter = React.useCallback((_: React.MouseEvent, node: Node<KnowledgeGraphNodeData>) => {
    const connected = new Set<string>([node.id])
    edgesRef.current.forEach((edge) => {
      if (edge.source === node.id) connected.add(edge.target)
      if (edge.target === node.id) connected.add(edge.source)
    })
    setNodes((current) => current.map((item) => ({
      ...item,
      data: { ...item.data, highlighted: connected.has(item.id), dimmed: !connected.has(item.id) },
    })))
    setEdges((current) => current.map((edge) => ({
      ...edge,
      style: edge.source === node.id || edge.target === node.id
        ? { strokeWidth: 1.8, opacity: 0.86 }
        : { strokeWidth: 1, opacity: 0.07 },
    })))
  }, [setEdges, setNodes])

  const handleNodeMouseLeave = React.useCallback(() => {
    setNodes((current) => current.map((item) => ({ ...item, data: { ...item.data, highlighted: false, dimmed: false } })))
    setEdges((current) => current.map((edge) => ({ ...edge, style: BASE_EDGE_STYLE })))
  }, [setEdges, setNodes])

  return (
    <div className="h-full w-full">
      <ReactFlow
        className="knowledge-graph-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeDragStart={(_, node) => { draggingIdRef.current = node.id; heat(1) }}
        onNodeDrag={(_, node) => { draggingIdRef.current = node.id; heat(0.75) }}
        onNodeDragStop={() => { draggingIdRef.current = null; heat(1) }}
        onInit={(instance) => { flowRef.current = instance }}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.2}
        maxZoom={2.2}
        nodesConnectable={false}
        edgesFocusable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
