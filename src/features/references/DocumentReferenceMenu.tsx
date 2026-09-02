import React from 'react'
import { BookOpen } from 'lucide-react'

import type { LibraryDocumentItem } from '../../types/library'

interface DocumentReferenceMenuProps {
  items: LibraryDocumentItem[]
  activeIndex: number
  isLoading: boolean
  onSelect: (item: LibraryDocumentItem) => void
}

export const DocumentReferenceMenu: React.FC<DocumentReferenceMenuProps> = ({
  items,
  activeIndex,
  isLoading,
  onSelect,
}) => (
  <div
    role="listbox"
    aria-label="文档引用"
    className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-amber-900/15 bg-[#FFFCF5] py-1 shadow-xl"
    onMouseDown={(event) => event.preventDefault()}
  >
    <div className="border-b border-amber-900/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900/45">
      引用文档
    </div>
    {isLoading && items.length === 0 ? (
      <div className="px-3 py-3 text-xs text-zinc-400">正在查找文档…</div>
    ) : items.length === 0 ? (
      <div className="px-3 py-3 text-xs text-zinc-400">没有匹配的文档</div>
    ) : (
      items.map((item, index) => (
        <button
          key={item.documentId}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
            index === activeIndex ? 'bg-amber-100/75' : 'hover:bg-amber-50/70'
          }`}
          onClick={() => onSelect(item)}
        >
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-800/65" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-zinc-800">{item.title}</span>
            <span className="block truncate text-[10px] text-zinc-400">{item.path}</span>
          </span>
        </button>
      ))
    )}
  </div>
)
