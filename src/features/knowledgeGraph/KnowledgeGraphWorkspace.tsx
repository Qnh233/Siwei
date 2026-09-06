import React from 'react'
import {
  ArrowLeft,
  ExternalLink,
  Link2,
  Network,
  RefreshCw,
} from 'lucide-react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toast } from '../../components/common/Toast'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { useDocumentStore } from '../document/documentStore'
import { openIndexedDocument } from '../document/openIndexedDocument'
import { getDocumentBacklinks, queryLibraryGraph } from '../../services/siweiApi'
import type {
  LibraryBacklinkItem,
  LibraryGraphDirection,
  LibraryGraphResult,
} from '../../types/library'
import { KnowledgeGraphNode } from './KnowledgeGraphNode'
import {
  buildKnowledgeGraphElements,
  type KnowledgeGraphNodeData,
} from './knowledgeGraphLayout'

const nodeTypes = { knowledgeDocument: KnowledgeGraphNode }

const directionOptions: Array<{ value: LibraryGraphDirection; label: string }> = [
  { value: 'both', label: '双向' },
  { value: 'incoming', label: '入链' },
  { value: 'outgoing', label: '出链' },
]

export const KnowledgeGraphWorkspace: React.FC = () => {
  const currentDoc = useDocumentStore((state) => state.currentDoc)
  const setWorkspaceView = useWorkspaceStore((state) => state.setActiveView)
  const [direction, setDirection] = React.useState<LibraryGraphDirection>('both')
  const [backlinks, setBacklinks] = React.useState<LibraryBacklinkItem[]>([])
  const [graphResult, setGraphResult] = React.useState<LibraryGraphResult | null>(null)
  const [backlinksLoading, setBacklinksLoading] = React.useState(false)
  const [graphLoading, setGraphLoading] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const documentId = currentDoc?.id
    if (!documentId) {
      setBacklinks([])
      return
    }

    let cancelled = false
    setBacklinksLoading(true)
    void getDocumentBacklinks(documentId)
      .then((items) => {
        if (!cancelled) setBacklinks(items)
      })
      .catch((reason) => {
        if (!cancelled) setError(`反向引用加载失败: ${String(reason)}`)
      })
      .finally(() => {
        if (!cancelled) setBacklinksLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentDoc?.id, reloadKey])

  React.useEffect(() => {
    const documentId = currentDoc?.id
    if (!documentId) {
      setGraphResult(null)
      return
    }

    let cancelled = false
    setGraphLoading(true)
    setError(null)
    void queryLibraryGraph({ documentId, direction })
      .then((result) => {
        if (!cancelled) setGraphResult(result)
      })
      .catch((reason) => {
        if (!cancelled) setError(`关系图加载失败: ${String(reason)}`)
      })
      .finally(() => {
        if (!cancelled) setGraphLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentDoc?.id, direction, reloadKey])

  const elements = React.useMemo(
    () => graphResult && currentDoc
      ? buildKnowledgeGraphElements(graphResult, currentDoc.title)
      : { nodes: [], edges: [] },
    [currentDoc, graphResult],
  )

  const handleOpenDocument = React.useCallback(async (
    documentId: string,
    path?: string | null,
    nodeId?: string | null,
  ) => {
    try {
      await openIndexedDocument({ documentId, path, nodeId })
    } catch (reason) {
      toast.error(`打开文档失败: ${String(reason)}`)
    }
  }, [])

  const handleNodeClick = React.useCallback((_: React.MouseEvent, node: Node<KnowledgeGraphNodeData>) => {
    if (node.data.isRoot || !node.data.openable) return
    void handleOpenDocument(node.id, node.data.path)
  }, [handleOpenDocument])

  if (!currentDoc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        请先打开一个文档再查看关系。
      </div>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#f7f4ed] dark:bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200/70 bg-white/70 px-5 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/65">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setWorkspaceView('editor')}
            className="btn-patch-light flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            title="返回文档"
            aria-label="返回文档"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-[#faf8f3] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <Network size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">当前文档关系</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                一跳
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-zinc-400">{currentDoc.title || '未命名文档'} · 保存后索引自动刷新</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {directionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDirection(option.value)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                  direction === option.value
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                }`}
                aria-pressed={direction === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="btn-patch-light flex h-8 w-8 items-center justify-center rounded-md"
            title="刷新关系"
            aria-label="刷新关系"
          >
            <RefreshCw size={14} className={backlinksLoading || graphLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {error && (
        <div className="shrink-0 border-b border-rose-200/70 bg-rose-50 px-5 py-2 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[330px] shrink-0 flex-col border-r border-zinc-200/70 bg-white/55 dark:border-zinc-800 dark:bg-zinc-950/55">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/60 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">反向引用</span>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] tabular-nums text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {backlinks.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {backlinksLoading && backlinks.length === 0 ? (
              <div className="px-2 py-8 text-center text-xs text-zinc-400">正在读取反向引用…</div>
            ) : backlinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white/45 px-4 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
                <Link2 size={18} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">暂无反向引用</p>
                <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">其他文档通过 [[文档名]] 引用当前文档后，会显示在这里。</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backlinks.map((item) => (
                  <button
                    key={item.referenceId}
                    type="button"
                    onClick={() => void handleOpenDocument(
                      item.sourceDocumentId,
                      item.sourceDocumentPath,
                      item.sourceNodeId,
                    )}
                    className="group w-full rounded-xl border border-zinc-200/70 bg-[#fffdf9] p-3 text-left shadow-sm transition hover:-translate-y-px hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-zinc-700 group-hover:text-zinc-950 dark:text-zinc-200 dark:group-hover:text-white">
                        {item.sourceDocumentTitle || '未命名文档'}
                      </span>
                      <ExternalLink size={11} className="mt-0.5 shrink-0 text-zinc-300 transition group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400" />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.sourceNodeText || '空节点'}
                    </p>
                    {item.sourceNodePath.length > 0 && (
                      <p className="mt-2 truncate text-[9px] text-zinc-400">
                        {item.sourceNodePath.join(' / ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 bg-[#faf8f3] dark:bg-[#111111]">
          {graphLoading && !graphResult ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">正在生成关系图…</div>
          ) : elements.nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">当前没有可显示的关系。</div>
          ) : (
            <ReactFlow
              key={`${currentDoc.id}:${direction}:${reloadKey}:${elements.edges.length}`}
              nodes={elements.nodes}
              edges={elements.edges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.25}
              maxZoom={1.8}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
              <Controls showInteractive={false} className="!border-zinc-200 !bg-white/90 !shadow-sm dark:!border-zinc-800 dark:!bg-zinc-900/90" />
              <MiniMap
                pannable
                zoomable
                className="!border !border-zinc-200 !bg-white/85 dark:!border-zinc-800 dark:!bg-zinc-900/85"
                nodeColor={(node) => (node.id === currentDoc.id ? '#27272a' : '#d4d4d8')}
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </section>
  )
}
