import React from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  ConnectionMode,
  MiniMap,
  Node,
  NodeDragHandler,
  OnConnect,
  OnConnectEnd,
  OnConnectStart,
  EdgeMouseHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from 'reactflow'

import type { MindMapCanvasBackground } from '../../types/settings'
import { MindMapNode, type MindMapNodeData } from './MindMapNode'
import { MindMapRelationEdge } from './MindMapRelationEdge'
import { mindMapCanvasBackgroundStyle } from './mindMapVisualPresets'

const nodeTypes = {
  custom: MindMapNode,
  root: MindMapNode,
}

const edgeTypes = {
  relation: MindMapRelationEdge,
}

interface MindMapCanvasProps {
  nodes: Node<MindMapNodeData>[]
  edges: Edge[]
  background: MindMapCanvasBackground
  nodesDraggable: boolean
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onNodeDrag: NodeDragHandler
  onNodeDragStop: NodeDragHandler
  onKeyDown: React.KeyboardEventHandler
  onInit: (instance: ReactFlowInstance) => void
  onConnect: OnConnect
  onConnectStart: OnConnectStart
  onConnectEnd: OnConnectEnd
  onEdgeClick: EdgeMouseHandler
  onEdgeDoubleClick: EdgeMouseHandler
}

export const MindMapCanvas = React.forwardRef<HTMLDivElement, MindMapCanvasProps>(({
  nodes,
  edges,
  background,
  nodesDraggable,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onPaneClick,
  onNodesChange,
  onEdgesChange,
  onNodeDrag,
  onNodeDragStop,
  onKeyDown,
  onInit,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onEdgeClick,
  onEdgeDoubleClick,
}, ref) => {
  return (
    <div ref={ref} className="h-full w-full" style={mindMapCanvasBackgroundStyle(background)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onKeyDown={onKeyDown}
        onInit={onInit}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={nodesDraggable}
        nodesConnectable
        connectionMode={ConnectionMode.Loose}
        connectOnClick
        elementsSelectable
        className="text-zinc-700 !bg-transparent"
      >
        <Controls className="!bg-[#FAF8F4] !border-amber-900/10 !shadow-fabric [&>button]:!border-amber-900/5 [&>button]:hover:!bg-[#EFECE3]" />
        <MiniMap
          style={{
            width: 132,
            height: 92,
            background: 'rgba(250, 248, 244, 0.72)',
            border: '1px dashed rgba(139, 90, 43, 0.16)',
            borderRadius: '10px',
            boxShadow: '0 8px 22px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
          position="bottom-right"
          nodeColor="#FAF6EC"
          nodeStrokeColor="rgba(139, 90, 43, 0.18)"
          nodeStrokeWidth={1}
          nodeBorderRadius={6}
          maskColor="rgba(240, 235, 220, 0.24)"
          maskStrokeColor="rgba(139, 90, 43, 0.08)"
          className="siwei-mindmap-minimap opacity-60 transition-opacity hover:opacity-95"
        />
        {background === 'dots' && (
          <Background variant={BackgroundVariant.Dots} color="#B7A99A" gap={18} size={1.15} />
        )}
        {background === 'grid' && (
          <Background variant={BackgroundVariant.Lines} color="#D5CCC0" gap={24} size={1} />
        )}
      </ReactFlow>
    </div>
  )
})

MindMapCanvas.displayName = 'MindMapCanvas'
