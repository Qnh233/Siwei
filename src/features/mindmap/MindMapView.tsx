import React from 'react'
import { type Connection, type Edge, ReactFlowInstance, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { useDocumentStore } from '../document/documentStore'
import { useAgentStore } from '../agent/agentStore'
import { useNodeContextMenuController } from '../document/useNodeContextMenuController'
import { MindMapLayoutDiagnostics } from './layoutEngine'
import { MindMapNodeData } from './MindMapNode'
import { formatDeleteConfirmation } from './mindMapActions'
import { MindMapCanvas } from './MindMapCanvas'
import { MindMapEmptyState } from './MindMapEmptyState'
import { MindMapMode } from './MindMapToolbar'
import { MindMapOverlays } from './MindMapOverlays'
import { useMindMapFocus } from './useMindMapFocus'
import { useMindMapSearch } from './useMindMapSearch'
import { useMindMapLayoutActions } from './hooks/useMindMapLayoutActions'
import { useMindMapLayoutComputation } from './hooks/useMindMapLayoutComputation'
import { useMindMapKeyboardShortcuts } from './hooks/useMindMapKeyboardShortcuts'
import { useMindMapEditing } from './hooks/useMindMapEditing'
import { useMindMapGraphSelectors } from './hooks/useMindMapGraphSelectors'
import { useMindMapMeasuredNodeSizes } from './hooks/useMindMapMeasuredNodeSizes'
import { useMindMapStrategyState } from './hooks/useMindMapStrategyState'
import { useMindMapCanvasHandlers } from './hooks/useMindMapCanvasHandlers'
import { useMindMapOverlayHandlers } from './hooks/useMindMapOverlayHandlers'
import { useMindMapLayoutHandlers } from './hooks/useMindMapLayoutHandlers'
import { useMindMapActiveMatchFocus } from './hooks/useMindMapActiveMatchFocus'
import { useMindMapExportController } from './hooks/useMindMapExportController'
import { useMindMapFocusFeedback } from './hooks/useMindMapFocusFeedback'
import { useSettingsStore } from '../settings/settingsStore'
import { useMindMapDragReorg } from './hooks/useMindMapDragReorg'
import { useMindMapSplitReveal } from './hooks/useMindMapSplitReveal'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { MindMapRelationEditor } from './MindMapRelationEditor'
import type { MindMapRelationEdgeData } from './mindMapRelationEdges'
import { findNodeById as findDocumentNodeById } from '../document/nodeActions'
import type { NodeRelationHandle } from '../../types/document'
import {
  findRelationDropTarget,
  getParallelCurveOffset,
  getRelationNodeCenter,
} from './mindMapRelationInteraction'

const parseRelationHandle = (handleId: string | null | undefined): NodeRelationHandle | undefined => {
  const match = handleId?.match(/^relation-(top|right|bottom|left)$/)
  return match?.[1] as NodeRelationHandle | undefined
}

export const MindMapView: React.FC = () => {
  const currentDoc = useDocumentStore((s) => s.currentDoc)
  const viewMode = useDocumentStore((s) => s.viewMode)
  const collapsedNodeIds = useDocumentStore((s) => s.collapsedNodeIds)
  const pendingAgentPlan = useAgentStore((s) => s.pendingPlan)
  const selectedNodeId = useDocumentStore((s) => s.selectedNodeId)
  const focusRequestSeq = useDocumentStore((s) => s.focusRequestSeq)
  const selectNode = useDocumentStore((s) => s.selectNode)
  const updateNodeText = useDocumentStore((s) => s.updateNodeText)
  const toggleCollapse = useDocumentStore((s) => s.toggleCollapse)
  const indentNode = useDocumentStore((s) => s.indentNode)
  const outdentNode = useDocumentStore((s) => s.outdentNode)
  const moveNode = useDocumentStore((s) => s.moveNode)
  const toggleNodeChecked = useDocumentStore((s) => s.toggleNodeChecked)
  const getNodeOperationState = useDocumentStore((s) => s.getNodeOperationState)
  const beginTextEditSession = useDocumentStore((s) => s.beginTextEditSession)
  const commitTextEditSession = useDocumentStore((s) => s.commitTextEditSession)
  const commitMindMapLayout = useDocumentStore((s) => s.commitMindMapLayout)
  const moveNodeToParent = useDocumentStore((s) => s.moveNodeToParent)
  const addRelation = useDocumentStore((s) => s.addRelation)
  const updateRelation = useDocumentStore((s) => s.updateRelation)
  const reverseRelation = useDocumentStore((s) => s.reverseRelation)
  const deleteRelation = useDocumentStore((s) => s.deleteRelation)
  const experimentalLayoutEnabled = useSettingsStore((s) => s.settings.experimentalMindMapLayoutEngine)
  const nodeRevealRequest = useWorkspaceStore((s) => s.nodeRevealRequest)
  const requestNodeReveal = useWorkspaceStore((s) => s.requestNodeReveal)

  const selectMindMapNode = React.useCallback((nodeId: string | null) => {
    selectNode(nodeId)
    if (nodeId) requestNodeReveal(nodeId, 'mindmap')
  }, [requestNodeReveal, selectNode])

  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = React.useState<MindMapMode>('layout')
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)
  const [layoutDiagnostics, setLayoutDiagnostics] = React.useState<MindMapLayoutDiagnostics | null>(null)
  const [selectedRelationId, setSelectedRelationId] = React.useState<string | null>(null)
  const [editingRelationId, setEditingRelationId] = React.useState<string | null>(null)
  const flowInstanceRef = React.useRef<ReactFlowInstance | null>(null)
  const flowWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const relationConnectStartRef = React.useRef<{ nodeId: string; handle: NodeRelationHandle } | null>(null)
  const relationConnectCommittedRef = React.useRef(false)

  const { measuredNodeSizes, measuredNodeSizeSignature } = useMindMapMeasuredNodeSizes(mode, nodes)
  const {
    editing,
    setEditing,
    startEditing,
    finishEditing,
    cancelEditing,
    clearEditing,
  } = useMindMapEditing({
    selectNode: selectMindMapNode,
    beginTextEditSession,
    commitTextEditSession,
  })

  const {
    validFocusRootNodeId,
    handleFocusBranch,
    handleResetFocus,
    handleAfterDeleteFocus,
  } = useMindMapFocus({
    currentDoc,
    focusRequestSeq,
    selectedNodeId,
    selectNode: selectMindMapNode,
  })

  useMindMapFocusFeedback({
    currentDoc,
    focusedNodeId: validFocusRootNodeId,
    setFeedback,
  })

  const {
    depthByNodeId,
    parentByNodeId,
    childIndexByNodeId,
    getNodeDescendantIds,
    visibleNodeIds,
    graphRootNode,
  } = useMindMapGraphSelectors({
    currentDoc,
    collapsedNodeIds,
    validFocusRootNodeId,
  })

  const {
    searchOpen,
    searchQuery,
    activeMatchIndex,
    matchedNodeIds,
    activeMatchNodeId,
    setSearchOpen,
    handleSearchQueryChange,
    navigateSearch,
    closeSearch,
  } = useMindMapSearch({
    root: currentDoc?.root ?? null,
    visibleNodeIds,
  })

  const handleAfterDelete = React.useCallback((deletedNodeId: string) => {
    setEditing(null)
    handleAfterDeleteFocus(deletedNodeId)
    const nodeId = useDocumentStore.getState().selectedNodeId
    if (nodeId) requestNodeReveal(nodeId, 'mindmap')
  }, [handleAfterDeleteFocus, requestNodeReveal])

  const {
    layoutStrategy,
    collapsedBranchSides,
    handleStrategyChange,
    toggleBranchSide,
  } = useMindMapStrategyState({
    currentDoc,
    experimentalLayoutEnabled,
    setFeedback,
  })

  const {
    contextMenu,
    contextNode,
    deleteTarget,
    closeContextMenu,
    openContextMenu,
    runAction,
    confirmDelete,
    cancelDelete,
    insertSiblingAndEdit,
    insertChildAndEdit,
    handleDelete,
  } = useNodeContextMenuController({
    currentDoc,
    onStartEditing: startEditing,
    onAfterDelete: handleAfterDelete,
  })

  const layoutHandlers = useMindMapLayoutHandlers({
    toggleBranchSide,
    toggleCollapse,
    updateNodeText,
    finishEditing,
    cancelEditing,
    handleDelete,
    insertSiblingAndEdit,
    insertChildAndEdit,
    indentNode,
    outdentNode,
    moveNode,
    toggleNodeChecked,
  })

  const {
    forcePreview,
    handleAutoLayout,
    handleRelayoutBranch,
    handleUnlockNode,
    handleForceDirectedPreview,
    handleCancelForceDirectedPreview,
    handleApplyForceDirectedPreview,
  } = useMindMapLayoutActions({
    currentDoc,
    graphRootNode,
    collapsedNodeIds,
    visibleNodeIds,
    nodes,
    measuredNodeSizes,
    experimentalLayoutEnabled,
    layoutStrategy,
    commitMindMapLayout,
    setFeedback,
  })

  const { exportClean } = useMindMapExportController({
    documentTitle: currentDoc?.title ?? '未命名文档',
    nodes,
    flowWrapperRef,
  })

  const finishRelationEditing = React.useCallback(() => setEditingRelationId(null), [])
  const startRelationEditing = React.useCallback((relationId: string) => {
    closeContextMenu()
    setSelectedRelationId(null)
    setEditingRelationId(relationId)
  }, [closeContextMenu])

  useMindMapLayoutComputation({
    currentDoc,
    pendingAgentPlan,
    collapsedNodeIds,
    validFocusRootNodeId,
    exportClean,
    graphRootNode,
    measuredNodeSizes,
    measuredNodeSizeSignature,
    experimentalLayoutEnabled,
    layoutStrategy,
    depthByNodeId,
    visibleNodeIds,
    collapsedBranchSides,
    activeMatchNodeId,
    matchedNodeIds,
    selectedNodeId,
    editingNodeId: editing?.nodeId ?? null,
    searchQuery,
    editingRelationId,
    finishRelationEditing,
    startRelationEditing,
    forcePreview,
    handlers: layoutHandlers,
    setNodes,
    setEdges,
    setLayoutDiagnostics,
    setFeedback,
  })

  useMindMapActiveMatchFocus({
    activeMatchNodeId,
    nodes,
    flowInstanceRef,
    selectNode: selectMindMapNode,
  })

  useMindMapSplitReveal({
    request: nodeRevealRequest,
    nodes,
    flowInstanceRef,
    focusRootNodeId: validFocusRootNodeId,
    resetFocus: handleResetFocus,
    split: viewMode === 'split',
  })

  const handleNodesChange = React.useCallback(onNodesChange, [onNodesChange])

  const { handleNodeDrag, handleNodeDragStop } = useMindMapDragReorg({
    nodes,
    setNodes,
    mode,
    currentDoc,
    forcePreviewActive: Boolean(forcePreview),
    parentByNodeId,
    childIndexByNodeId,
    getNodeDescendantIds,
    moveNodeToParent,
    commitMindMapLayout,
    experimentalLayoutEnabled,
    layoutStrategy,
    setFeedback,
  })

  const startEditingWithText = React.useCallback((nodeId: string, text: string) => {
    // 先开启编辑会话，再写入首字符，保证整次直接输入可以一次撤销。
    startEditing(nodeId)
    updateNodeText(nodeId, text)
  }, [startEditing, updateNodeText])

  const handleKeyDown = useMindMapKeyboardShortcuts({
    selectedNodeId,
    runAction,
    startEditingWithText,
    closeContextMenu,
    clearEditing,
    selectNode: selectMindMapNode,
  })

  const canvasHandlers = useMindMapCanvasHandlers({
    flowInstanceRef,
    selectNode: selectMindMapNode,
    startEditing,
    openContextMenu,
    closeContextMenu,
  })

  const createRelationFromGesture = React.useCallback((
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: NodeRelationHandle,
    targetHandle: NodeRelationHandle,
  ) => {
    if (sourceNodeId === targetNodeId) {
      setFeedback('关联不能连接节点自身')
      return null
    }
    const sourceNode = nodes.find((node) => node.id === sourceNodeId)
    const targetNode = nodes.find((node) => node.id === targetNodeId)
    const pairCount = currentDoc?.relations?.filter((relation) => (
      (relation.sourceNodeId === sourceNodeId && relation.targetNodeId === targetNodeId)
      || (relation.sourceNodeId === targetNodeId && relation.targetNodeId === sourceNodeId)
    )).length ?? 0
    const curveOffset = sourceNode && targetNode
      ? getParallelCurveOffset(
        pairCount,
        getRelationNodeCenter(sourceNode, measuredNodeSizes),
        getRelationNodeCenter(targetNode, measuredNodeSizes),
      )
      : undefined
    const relationId = addRelation(sourceNodeId, targetNodeId, { sourceHandle, targetHandle, curveOffset })
    if (relationId) {
      closeContextMenu()
      setSelectedRelationId(relationId)
    }
    return relationId
  }, [addRelation, closeContextMenu, currentDoc?.relations, measuredNodeSizes, nodes])

  const handleConnect = React.useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    const sourceHandle = parseRelationHandle(connection.sourceHandle)
    const targetHandle = parseRelationHandle(connection.targetHandle)
    if (!sourceHandle || !targetHandle) return
    relationConnectCommittedRef.current = true
    createRelationFromGesture(connection.source, connection.target, sourceHandle, targetHandle)
  }, [createRelationFromGesture])

  const handleConnectStart = React.useCallback((
    _event: React.MouseEvent | React.TouchEvent,
    params: { nodeId: string | null; handleId: string | null },
  ) => {
    relationConnectCommittedRef.current = false
    const handle = parseRelationHandle(params.handleId)
    relationConnectStartRef.current = params.nodeId && handle ? { nodeId: params.nodeId, handle } : null
  }, [])

  const handleConnectEnd = React.useCallback((event: MouseEvent | TouchEvent) => {
    const start = relationConnectStartRef.current
    const wasCommitted = relationConnectCommittedRef.current
    relationConnectStartRef.current = null
    relationConnectCommittedRef.current = false
    if (!start || wasCommitted || !flowInstanceRef.current) return

    const pointer = 'changedTouches' in event ? event.changedTouches[0] : event
    if (!pointer) return
    const point = flowInstanceRef.current.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY })
    const target = findRelationDropTarget(nodes, point, start.nodeId, measuredNodeSizes)
    if (!target) return
    createRelationFromGesture(start.nodeId, target.nodeId, start.handle, target.handle)
  }, [createRelationFromGesture, measuredNodeSizes, nodes])

  const handleEdgeClick = React.useCallback((_event: React.MouseEvent, edge: Edge) => {
    const data = edge.data as MindMapRelationEdgeData | undefined
    if (data?.kind === 'relation') {
      closeContextMenu()
      setSelectedRelationId(data.relationId)
    }
  }, [closeContextMenu])

  const handleEdgeDoubleClick = React.useCallback((_event: React.MouseEvent, edge: Edge) => {
    const data = edge.data as MindMapRelationEdgeData | undefined
    if (data?.kind !== 'relation') return
    startRelationEditing(data.relationId)
  }, [startRelationEditing])

  const forcePreviewActive = Boolean(forcePreview)
  const overlayHandlers = useMindMapOverlayHandlers({
    contextMenu,
    experimentalLayoutEnabled,
    forcePreviewActive,
    runAction,
    handleFocusBranch,
    handleRelayoutBranch,
    handleUnlockNode,
    closeContextMenu,
    setDiagnosticsOpen,
    setSearchOpen,
    navigateSearch,
  })

  if (!currentDoc) {
    return <MindMapEmptyState />
  }

  const deleteMessage = deleteTarget ? formatDeleteConfirmation(deleteTarget) : null
  const selectedRelation = currentDoc.relations?.find((relation) => relation.id === selectedRelationId) ?? null
  const relationSource = selectedRelation ? findDocumentNodeById(currentDoc.root, selectedRelation.sourceNodeId) : null
  const relationTarget = selectedRelation ? findDocumentNodeById(currentDoc.root, selectedRelation.targetNodeId) : null

  return (
    <div className="relative h-full w-full bg-linen">
      <MindMapCanvas
        ref={flowWrapperRef}
        nodes={nodes}
        edges={edges}
        nodesDraggable={!forcePreview}
        onNodeClick={(event, node) => {
          setSelectedRelationId(null)
          setEditingRelationId(null)
          canvasHandlers.handleNodeClick(event, node)
        }}
        onNodeDoubleClick={canvasHandlers.handleNodeDoubleClick}
        onNodeContextMenu={canvasHandlers.handleNodeContextMenu}
        onPaneClick={() => {
          setSelectedRelationId(null)
          setEditingRelationId(null)
          canvasHandlers.handlePaneClick()
        }}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onKeyDown={handleKeyDown}
        onInit={canvasHandlers.handleInit}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
      />
      <MindMapOverlays
        exportClean={exportClean}
        mode={mode}
        focused={Boolean(validFocusRootNodeId)}
        searchOpen={searchOpen}
        experimentalLayoutEnabled={experimentalLayoutEnabled}
        layoutStrategy={layoutStrategy}
        forcePreviewActive={forcePreviewActive}
        feedback={feedback}
        diagnosticsOpen={diagnosticsOpen}
        layoutDiagnostics={layoutDiagnostics}
        searchQuery={searchQuery}
        matchedNodeCount={matchedNodeIds.length}
        activeMatchIndex={activeMatchIndex}
        contextMenu={contextMenu}
        showContextMenu={Boolean(contextNode)}
        isContextNodeCollapsed={contextMenu ? collapsedNodeIds.has(contextMenu.nodeId) : false}
        contextNodeOperationState={contextMenu ? getNodeOperationState(contextMenu.nodeId) : null}
        deleteMessage={deleteMessage}
        onModeChange={setMode}
        onStrategyChange={handleStrategyChange}
        onAutoLayout={handleAutoLayout}
        onForceDirectedPreview={handleForceDirectedPreview}
        onToggleDiagnostics={overlayHandlers.handleToggleDiagnostics}
        onToggleSearch={overlayHandlers.handleToggleSearch}
        onResetFocus={handleResetFocus}
        onApplyForceDirectedPreview={handleApplyForceDirectedPreview}
        onCancelForceDirectedPreview={handleCancelForceDirectedPreview}
        onSearchQueryChange={handleSearchQueryChange}
        onPreviousSearchResult={overlayHandlers.handlePreviousSearchResult}
        onNextSearchResult={overlayHandlers.handleNextSearchResult}
        onCloseSearch={closeSearch}
        onContextMenuAction={overlayHandlers.handleContextMenuAction}
        onFocusContextBranch={overlayHandlers.handleFocusContextBranch}
        onRelayoutContextBranch={overlayHandlers.handleRelayoutContextBranch}
        onUnlockContextNode={overlayHandlers.handleUnlockContextNode}
        onCancelDelete={cancelDelete}
        onConfirmDelete={confirmDelete}
      />
      {selectedRelation && !exportClean && (
        <MindMapRelationEditor
          relation={selectedRelation}
          sourceLabel={relationSource?.text ?? ''}
          targetLabel={relationTarget?.text ?? ''}
          onUpdate={(changes) => updateRelation(selectedRelation.id, changes)}
          onReverse={() => reverseRelation(selectedRelation.id)}
          onDelete={() => {
            deleteRelation(selectedRelation.id)
            setSelectedRelationId(null)
            setEditingRelationId(null)
          }}
          onClose={() => setSelectedRelationId(null)}
        />
      )}
    </div>
  )
}
