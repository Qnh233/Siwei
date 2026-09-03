import React from 'react'

import {
  findEntityMentionQuery,
  searchEntityMentionTargets,
  type EntityMentionQuery,
  type EntityMentionTarget,
} from './entityMentions'

export function useEntityMentionAutocomplete() {
  const [query, setQuery] = React.useState<EntityMentionQuery | null>(null)
  const [items, setItems] = React.useState<EntityMentionTarget[]>([])
  const [activeIndex, setActiveIndex] = React.useState(0)

  const update = React.useCallback((text: string, caret: number) => {
    const next = findEntityMentionQuery(text, caret)
    setQuery(next)
    setActiveIndex(0)
    setItems(next ? searchEntityMentionTargets(next.query).slice(0, 8) : [])
    return next
  }, [])

  const close = React.useCallback(() => {
    setQuery(null)
    setItems([])
    setActiveIndex(0)
  }, [])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!query) return null
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => {
        if (items.length === 0) return 0
        return event.key === 'ArrowDown'
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length
      })
      return 'handled' as const
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return 'handled' as const
    }
    if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault()
      return items[activeIndex]
    }
    return null
  }, [activeIndex, close, items, query])

  return { activeIndex, close, handleKeyDown, items, query, update }
}
