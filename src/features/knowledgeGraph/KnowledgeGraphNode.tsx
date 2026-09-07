import { Handle, Position, type NodeProps } from 'reactflow'
import type { KnowledgeGraphNodeData } from './knowledgeGraphLayout'

export function KnowledgeGraphNode({ data }: NodeProps<KnowledgeGraphNodeData>) {
  const diameter = data.radius * 2
  const missing = !data.openable && !data.isRoot
  const dotClasses = missing
    ? 'border-2 border-dashed border-slate-400 bg-transparent dark:border-zinc-600'
    : data.isRoot
      ? 'bg-indigo-500 ring-4 ring-indigo-100 dark:bg-indigo-400 dark:ring-indigo-500/20'
      : data.highlighted
        ? 'bg-indigo-500 ring-4 ring-indigo-100/80 dark:bg-indigo-400 dark:ring-indigo-500/20'
        : 'bg-slate-500 dark:bg-zinc-500'

  return (
    <div
      className={`knowledge-graph-node-enter relative flex items-center justify-center transition-opacity duration-150 ${data.openable && !data.isRoot ? 'cursor-pointer' : 'cursor-grab'} ${data.dimmed ? 'opacity-20' : 'opacity-100'}`}
      style={{ width: diameter, height: diameter }}
      title={data.title}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
        style={{ left: '50%', top: '50%' }}
      />
      <div
        className={`pointer-events-none absolute inset-0 rounded-full transition-[width,height,background-color,box-shadow] duration-200 ${dotClasses}`}
      />
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] leading-none transition-colors duration-150 ${data.isRoot ? 'font-semibold text-slate-950 dark:text-zinc-100' : missing ? 'text-slate-400 dark:text-zinc-500' : data.highlighted ? 'font-medium text-slate-950 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400'}`}
        style={{ top: diameter + 8 }}
      >
        {data.title}
      </span>
      <Handle
        type="source"
        position={Position.Top}
        className="!h-px !w-px !border-0 !bg-transparent !opacity-0"
        style={{ left: '50%', top: '50%' }}
      />
    </div>
  )
}
