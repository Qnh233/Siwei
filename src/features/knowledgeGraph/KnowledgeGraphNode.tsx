import { FileText } from 'lucide-react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { KnowledgeGraphNodeData } from './knowledgeGraphLayout'

export function KnowledgeGraphNode({ data }: NodeProps<KnowledgeGraphNodeData>) {
  const isUnavailable = !data.isRoot && !data.openable

  return (
    <div
      className={`w-[210px] rounded-xl border px-3.5 py-3 shadow-sm transition ${
        data.isRoot
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : isUnavailable
            ? 'border-dashed border-zinc-300 bg-white/55 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/55 dark:text-zinc-500'
            : 'border-zinc-200/80 bg-[#fffdf9] text-zinc-700 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-zinc-400" />
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${data.isRoot ? 'bg-white/10 dark:bg-black/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          <FileText size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{data.title}</span>
            {data.isRoot && <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-medium dark:bg-black/10">当前</span>}
            {!data.isRoot && data.status === undefined && (
              <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">未入库</span>
            )}
          </div>
          <p className="mt-1 truncate text-[10px] opacity-60">{data.path || (data.isRoot ? '当前打开文档' : '目标路径不可用')}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-zinc-400" />
    </div>
  )
}
