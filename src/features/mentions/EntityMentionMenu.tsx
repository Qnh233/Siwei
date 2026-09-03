import React from 'react'
import { Bot } from 'lucide-react'

import type { EntityMentionTarget } from './entityMentions'

interface EntityMentionMenuProps {
  items: EntityMentionTarget[]
  activeIndex: number
  onSelect: (item: EntityMentionTarget) => void
}

export const EntityMentionMenu: React.FC<EntityMentionMenuProps> = ({ items, activeIndex, onSelect }) => (
  <div
    role="listbox"
    aria-label="实体提及"
    className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-sky-900/15 bg-[#F8FCFF] py-1 shadow-xl"
    onMouseDown={(event) => event.preventDefault()}
  >
    <div className="border-b border-sky-900/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-900/45">
      提及 Agent / 实体
    </div>
    {items.length === 0 ? (
      <div className="px-3 py-3 text-xs text-zinc-400">没有匹配的实体</div>
    ) : (
      items.map((item, index) => (
        <button
          key={`${item.kind}:${item.id}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
            index === activeIndex ? 'bg-sky-100/80' : 'hover:bg-sky-50/80'
          }`}
          onClick={() => onSelect(item)}
        >
          <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700/70" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-zinc-800">{item.label}</span>
            <span className="block truncate text-[10px] text-zinc-400">@{item.mentionText} · {item.kind}</span>
          </span>
        </button>
      ))
    )}
  </div>
)
